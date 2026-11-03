import {notify} from './notifications.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const categories=['Co-host','Venue','Speakers','Sponsors','Community partner'];
const dateOK=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export async function partnerRequests(request,env){
 if(!env.COMMUNITY)return json({error:'Partner requests are temporarily unavailable.'},503);
 try{
  if(request.method==='GET'){
   const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
   const rows=await env.COMMUNITY.prepare("SELECT id,organization,title,category,description,event_date,expires_on,contact_url FROM partner_requests WHERE status='approved' AND expires_on>=? ORDER BY submitted_at DESC LIMIT 200").bind(today).all();
   return json({requests:rows.results});
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token||!/^[a-f0-9-]{36}$/.test(token))return json({error:'Browser identity required'},401);
  if(Number(request.headers.get('Content-Length'))>10000)return json({error:'Request too large'},413);
  const raw=await request.text();if(raw.length>10000)return json({error:'Request too large'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}
  if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
  const p={};for(const [key,max] of Object.entries({organization:180,title:180,category:30,description:2000,event_date:10,expires_on:10,contact_url:1000,contact_email:254})){
   if(body[key]!=null&&typeof body[key]!=='string')return json({error:'Invalid '+key},400);
   p[key]=(body[key]||'').trim();if(p[key].length>max)return json({error:key+' is too long'},400);
  }
  if(!p.organization||!p.title||!p.description||!categories.includes(p.category))return json({error:'Add your organization, title, partner type and details.'},400);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  if(!dateOK(p.expires_on)||p.expires_on<today||p.expires_on>new Date(Date.now()+180*864e5).toISOString().slice(0,10))return json({error:'Choose a closing date within the next 180 days.'},400);
  if(p.event_date&&(!dateOK(p.event_date)||p.event_date<today||p.expires_on>p.event_date))return json({error:'Event date must be valid and on or after the closing date.'},400);
  let url;try{url=new URL(p.contact_url)}catch{return json({error:'Add a public organization or contact page URL.'},400)}
  if(url.protocol!=='https:'||url.username||url.password)return json({error:'Use an https contact page URL.'},400);
  if(p.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contact_email))return json({error:'Enter a valid private contact email.'},400);
  const visitor=await hash(token),id=await hash(visitor+'|'+JSON.stringify(p));
  const existing=await env.COMMUNITY.prepare('SELECT id FROM partner_requests WHERE id=?').bind(id).first();
  if(existing)return json({id,status:'received'});
  const recent=await env.COMMUNITY.prepare("SELECT COUNT(*) AS total FROM partner_requests WHERE visitor=? AND submitted_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(visitor).first();
  if(recent.total>=3)return json({error:'Please wait an hour before submitting more partner requests.'},429);
  await env.COMMUNITY.prepare('INSERT OR IGNORE INTO partner_requests(id,visitor,organization,title,category,description,event_date,expires_on,contact_url,contact_email) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,visitor,p.organization,p.title,p.category,p.description,p.event_date,p.expires_on,p.contact_url,p.contact_email).run();
  let notified=false;try{notified=await notify(env,'partner:'+id,'Canopy: new partner request',Object.entries(p).map(([k,v])=>k+': '+v).join('\n')+'\nReference: '+id)}catch{}
  return json({id,status:'pending',notification:notified?'sent':'queued'},201);
 }catch{return json({error:'Could not process partner requests. Please try again.'},500)}
}
