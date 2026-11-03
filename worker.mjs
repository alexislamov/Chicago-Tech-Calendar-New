import {notify,retryNotifications} from './notifications.mjs';
import {partnerRequests} from './partners.mjs';
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function onRequest({request,env}) {
  if (!env.COMMUNITY) return json({error:'Community counts are not connected yet.'},503);
  if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'},405);
  const token = request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) return json({error:'Browser identity required'},401);
  const user = await digest(token);
  try {
    if(request.method==='POST') {
      if(request.headers.get('Origin')!==new URL(request.url).origin) return json({error:'Invalid origin'},403);
      if(Number(request.headers.get('Content-Length'))>4096) return json({error:'Request too large'},413);
      const raw=await request.text(); if(raw.length>4096) return json({error:'Request too large'},413);
      let body; try {body=JSON.parse(raw)} catch {return json({error:"Invalid JSON"},400)}
      if(!body || typeof body!=="object")return json({error:"Invalid response"},400);
      const {event,status,ref}=body;
      if(typeof event!=='string'||!event.length||event.length>1000||!['interested','going','none'].includes(status)) return json({error:'Invalid response'},400);
      if(status==='none') await env.COMMUNITY.prepare('DELETE FROM responses WHERE event = ? AND visitor = ?').bind(event,user).run();
      else await env.COMMUNITY.prepare('INSERT INTO responses(event,visitor,status) VALUES(?,?,?) ON CONFLICT(event,visitor) DO UPDATE SET status=excluded.status').bind(event,user,status).run();
      // One credit per referred browser/event. Never credit a share click or self-invite.
      if(status!=='none' && typeof ref==='string' && /^[a-f0-9]{64}$/.test(ref) && ref!==user) {
        await env.COMMUNITY.prepare('INSERT OR IGNORE INTO referrals(event,visitor,inviter) VALUES(?,?,?)').bind(event,user,ref).run();
      }
    }
    const counts=await env.COMMUNITY.prepare("SELECT event, SUM(status='interested') AS interested, SUM(status='going') AS going FROM responses GROUP BY event").all();
    const mine=await env.COMMUNITY.prepare('SELECT event,status FROM responses WHERE visitor = ?').bind(user).all();
    const credits=await env.COMMUNITY.prepare('SELECT COUNT(DISTINCT r.visitor) AS total FROM referrals r JOIN responses s ON r.event=s.event AND r.visitor=s.visitor WHERE r.inviter = ?').bind(user).first();
    return json({counts:counts.results,mine:mine.results,inviteCode:user,joined:credits.total});
  } catch {return json({error:'Could not update community activity. Please try again.'},500)}
}

// The queue is readable only through authenticated Cloudflare D1 tools, never this public API.
export async function submitEvent({request,env}) {
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!env.COMMUNITY)return json({error:'Submissions are temporarily unavailable.'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token||!/^[a-f0-9-]{36}$/.test(token))return json({error:'Browser identity required'},401);
  try {
    if(Number(request.headers.get('Content-Length'))>16000)return json({error:'Submission too large'},413);
    const raw=await request.text();if(raw.length>16000)return json({error:'Submission too large'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid submission'},400)}
    if(!body||typeof body!=='object')return json({error:'Invalid submission'},400);
    const limits={title:180,host:180,date:10,start:5,end:5,type:80,venue:500,area:100,mode:30,price:150,desc:3000,link:1500};
    const event={};
    for(const [key,max] of Object.entries(limits)) {
      if(body[key]!=null&&typeof body[key]!=='string')return json({error:'Invalid '+key},400);
      event[key]=(body[key]||'').trim();if(event[key].length>max)return json({error:key+' is too long'},400);
    }
    if(!event.title||!event.host||!event.venue||!event.type||!['In person','Virtual'].includes(event.mode))return json({error:'Complete the event name, organizer, venue, type and format.'},400);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||Number.isNaN(Date.parse(event.date))||new Date(event.date).toISOString().slice(0,10)!==event.date)return json({error:'Enter a valid event date.'},400);
    for(const field of ['start','end'])if(event[field]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(event[field]))return json({error:'Enter a valid event time.'},400);
    if(event.link){let url;try{url=new URL(event.link)}catch{return json({error:'Enter a valid event URL.'},400)}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return json({error:'Use an http or https event URL.'},400)}
    const allowed=['sec','grc','privacy','ai','data','dev','pm','startup','lead','career'];
    event.topics=Array.isArray(body.topics)?[...new Set(body.topics.filter(t=>allowed.includes(t)))]:[];
    event.orgs=Array.isArray(body.orgs)?body.orgs.filter(x=>typeof x==='string'&&/^[a-z0-9-]{1,80}$/.test(x)).slice(0,10):[];
    event.cohosts=[];
    if(body.cohosts!=null){
      if(!Array.isArray(body.cohosts)||body.cohosts.length>5)return json({error:'Add up to five co-host organizations.'},400);
      for(const host of body.cohosts){
        if(!host||typeof host.name!=='string'||!host.name.trim()||host.name.length>180||!['Co-host','Venue partner','Community partner','Sponsor'].includes(host.role))return json({error:'Each co-host needs a name and valid role.'},400);
        const groupId=typeof host.groupId==='string'&&/^[a-z0-9-]{1,80}$/.test(host.groupId)?host.groupId:'';
        event.cohosts.push({name:host.name.trim(),role:host.role,groupId});
        if(groupId&&!event.orgs.includes(groupId))event.orgs.push(groupId);
      }
    }
    const visitor=await digest(token),payload=JSON.stringify(event),id=await digest(visitor+'|'+payload);
    const existing=await env.COMMUNITY.prepare('SELECT id FROM event_submissions WHERE id = ?').bind(id).first();
    if(existing)return json({id:existing.id,status:'received'},200);
    // Lightweight per-browser throttling; staff still review every submission.
    const recent=await env.COMMUNITY.prepare("SELECT COUNT(*) AS total FROM event_submissions WHERE visitor = ? AND submitted_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(visitor).first();
    if(recent.total>=5)return json({error:'You have submitted five events this hour. Please try again later.'},429);
    await env.COMMUNITY.prepare('INSERT OR IGNORE INTO event_submissions(id,visitor,title,organizer,event_date,payload) VALUES(?,?,?,?,?,?)').bind(id,visitor,event.title,event.host,event.date,payload).run();
    let notified=false;try{notified=await notify(env,'event:'+id,'Canopy: new event submission',JSON.stringify(event,null,2)+'\nReference: '+id)}catch{}
    return json({id,status:'pending',notification:notified?'sent':'queued'},201);
  }catch{return json({error:'Could not submit your event. Your form has been kept; please try again.'},500)}
}

export default {
  async scheduled(controller,env,ctx){ctx.waitUntil(retryNotifications(env));},
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/partners') return partnerRequests(request,env);
    if (new URL(request.url).pathname === '/api/submissions') return submitEvent({request,env});
    if (new URL(request.url).pathname === '/api/community') return onRequest({request,env});
    return env.ASSETS.fetch(request);
  }
};
