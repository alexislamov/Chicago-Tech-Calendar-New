import catalog from './catalog.mjs';
import {matchPeople} from './people-match.mjs';
import './calendar.js';import './event-utils.js';
import {staff} from './site-services.mjs';
import {setupPeople} from './people-db.mjs';
import {peopleDocument} from './people-pages.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const text=(b,k,max,required=false)=>{if(b[k]!=null&&typeof b[k]!=='string')fail('Invalid '+k);const v=(b[k]||'').trim();if(v.length>max||(required&&!v))fail('Complete '+k.replaceAll('_',' ')+' (up to '+max+' characters).');return v};
function link(value,linkedin=false){if(!value)return '';try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();if(linkedin){if(!['linkedin.com','www.linkedin.com'].includes(u.hostname)||!/^\/in\/[a-zA-Z0-9%_-]+\/?$/.test(u.pathname))throw Error();return 'https://www.linkedin.com'+u.pathname.replace(/\/$/,'')}return u.href}catch{fail(linkedin?'Use your personal linkedin.com/in/ profile URL.':'Use a valid https website URL.')}}
const publicPerson=p=>({id:p.id,name:p.name,role:p.role,bio:p.bio,topics:JSON.parse(p.topics),ask_about:p.ask_about,looking_for:p.looking_for,linkedin:p.linkedin,website:p.website,open_to_meet:!!p.open_to_meet});
const eventData=e=>({id:e.id,slug:e.slug,title:CanopyEvents.title(e),date:e.date,endDate:e.endDate||'',venue:e.venue,mode:e.mode});
const upcoming=(events,now)=>events.filter(e=>!e.unlisted&&CanopyEvents.phase(e,now)!=='ended');
export async function peopleSnapshot(db,{events=catalog.events,now=Date.now()}={}){
 const profiles=(await db.prepare("SELECT * FROM people_profiles WHERE status='approved' ORDER BY name LIMIT 500").all()).results;
 const rows=(await db.prepare("SELECT a.* FROM people_appearances a JOIN people_profiles p ON p.id=a.person WHERE a.status='approved' AND p.status='approved'").all()).results;
 const list=upcoming(events,now),appearances=rows.map(a=>{const e=list.find(e=>e.id===a.event);return e?{id:a.id,person:a.person,kind:a.kind,source:a.source,event:eventData(e),confirmed_at:a.created_at}:null}).filter(Boolean);
 return {people:profiles.map(publicPerson),appearances};
}
async function allowance(db,owner,ip,now){for(const [bucket,max] of [['owner:'+owner+':'+Math.floor(now/36e5),40],['network:'+ip+':'+Math.floor(now/36e5),100]]){const r=await db.prepare('INSERT INTO people_usage(bucket,used,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET used=used+1 WHERE used<? RETURNING used').bind(bucket,now+72e5,max).first();if(!r)fail('Too many requests. Please try again later.',429)}await db.prepare('DELETE FROM people_usage WHERE expires<?').bind(now).run()}
async function read(request){if(Number(request.headers.get('Content-Length'))>12000)fail('Request too large.',413);const raw=await request.text();if(raw.length>12000)fail('Request too large.',413);try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}catch{fail('Invalid request.')}}
export async function peopleRoute(request,env,{events=catalog.events,now=Date.now()}={}){
 const url=new URL(request.url),path=url.pathname;
 if(!['/people','/people/manage','/people/review'].includes(path)&&!/^\/people\/[a-f0-9-]{36}$/.test(path)&&!path.startsWith('/api/people'))return null;
 const api=path.startsWith('/api/people'),db=env.COMMUNITY;
 if(!['GET','HEAD','POST'].includes(request.method))return json({error:'Method not allowed'},405);
 if(!api&&request.method==='POST')return json({error:'Method not allowed'},405);
 if(!db)return api?json({error:'People is temporarily unavailable.'},503):new Response(peopleDocument({path,unavailable:true}),{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"frame-ancestors 'self'; base-uri 'self'; object-src 'none'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'}});
 try{
  await setupPeople(db);
  if(!api){
   if(path==='/people/review'&&!await staff(request,env))return new Response(peopleDocument({path,forbidden:true}),{status:403,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"frame-ancestors 'self'; base-uri 'self'; object-src 'none'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','X-Robots-Tag':'noindex'}});
   const data=await peopleSnapshot(db,{events,now}),id=path.split('/')[2],person=data.people.find(p=>p.id===id);
   if(id&&!['manage','review'].includes(id)&&!person)return new Response(peopleDocument({path,notFound:true}),{status:404,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"frame-ancestors 'self'; base-uri 'self'; object-src 'none'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'}});
   return new Response(peopleDocument({path,data,person,params:url.searchParams,events:upcoming(events,now),now}),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"frame-ancestors 'self'; base-uri 'self'; object-src 'none'",'X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff',...(['manage','review'].includes(id)?{'X-Robots-Tag':'noindex'}:{})}});
  }
  const known=['/api/people','/api/people/me','/api/people/match','/api/people/profile','/api/people/appearance','/api/people/introductions','/api/people/respond','/api/people/block','/api/people/report','/api/people/review'];if(!known.includes(path))return json({error:'Not found'},404);
  if(path==='/api/people'&&request.method==='GET'){const data=await peopleSnapshot(db,{events,now}),id=url.searchParams.get('event');return json(id?{...data,people:data.people.filter(p=>data.appearances.some(a=>a.person===p.id&&a.event.id===id)),appearances:data.appearances.filter(a=>a.event.id===id)}:data)}
  if(request.method==='HEAD')return json({error:'Method not allowed'},405);
  if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
  if(path==='/api/people/review'){
   if(!await staff(request,env))return json({error:'Staff sign-in required.'},403);
   if(request.method==='GET')return json({profiles:(await db.prepare("SELECT id,name,role,bio,topics,ask_about,looking_for,linkedin,website,open_to_meet,status,review_note,created_at FROM people_profiles WHERE status IN ('pending','rejected') ORDER BY updated_at DESC LIMIT 100").all()).results,published:(await db.prepare("SELECT id,name,role,linkedin FROM people_profiles WHERE status='approved' ORDER BY name LIMIT 100").all()).results,appearances:(await db.prepare("SELECT a.*,p.name,p.linkedin FROM people_appearances a JOIN people_profiles p ON p.id=a.person WHERE a.status='pending' ORDER BY a.created_at DESC LIMIT 100").all()).results.map(a=>({...a,event_title:events.find(e=>e.id===a.event)?.title||'Event no longer listed',event_slug:events.find(e=>e.id===a.event)?.slug||''})),reports:(await db.prepare("SELECT id,person,reason,status,created_at FROM people_reports WHERE status='pending' ORDER BY created_at DESC LIMIT 100").all()).results});
   const b=await read(request);if(!['profile','appearance','report'].includes(b.kind)||!['approve','reject','hide','resolve'].includes(b.action))fail('Invalid review action.');
   const id=text(b,'id',36,true);if(b.kind==='profile'){if(!['approve','reject','hide'].includes(b.action))fail('Invalid profile action.');if(b.action==='approve'&&b.identity_checked!==true)fail('Confirm that the profile and consent were checked.');await db.prepare('UPDATE people_profiles SET status=?,review_note=?,updated_at=? WHERE id=?').bind(b.action==='approve'?'approved':b.action==='hide'?'hidden':'rejected',text(b,'note',500),now,id).run()}
   if(b.kind==='appearance'){if(!['approve','reject'].includes(b.action))fail('Invalid appearance action.');const a=await db.prepare('SELECT * FROM people_appearances WHERE id=?').bind(id).first();if(!a)fail('Appearance not found.',404);if(b.action==='approve'&&a.kind!=='attending'&&!a.source)fail('An official source is required.');await db.prepare('UPDATE people_appearances SET status=? WHERE id=?').bind(b.action==='approve'?'approved':'rejected',id).run()}
   if(b.kind==='report')await db.prepare("UPDATE people_reports SET status='resolved' WHERE id=?").bind(id).run();return json({ok:true});
  }
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token||!/^ppl_[a-f0-9]{64}$/.test(token))return json({error:'Open My People Profile in this browser to continue.'},401);
  const owner=await hash(token),me=await db.prepare('SELECT * FROM people_profiles WHERE owner=?').bind(owner).first();
  if(path==='/api/people/me'&&request.method==='GET'){
   if(!me)return json({profile:null,appearances:[],introductions:[],events:upcoming(events,now).map(eventData)});
   const rows=(await db.prepare('SELECT * FROM people_introductions WHERE sender=? OR recipient=? ORDER BY created_at DESC LIMIT 100').bind(me.id,me.id).all()).results;
   const introductions=[];for(const row of rows){const otherId=row.sender===me.id?row.recipient:row.sender,other=await db.prepare("SELECT * FROM people_profiles WHERE id=? AND status='approved'").bind(otherId).first();const blocked=await db.prepare('SELECT 1 AS yes FROM people_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)').bind(me.id,otherId,otherId,me.id).first();if(!other||blocked)continue;introductions.push({...row,other:publicPerson(other),event:events.find(e=>e.id===row.event)?eventData(events.find(e=>e.id===row.event)):null,direction:row.sender===me.id?'sent':'received',met:row.sender===me.id?!!row.sender_met:!!row.recipient_met,followup:row.sender===me.id?!!row.sender_followup:!!row.recipient_followup,mutual:!!row.sender_met&&!!row.recipient_met})}
   return json({profile:{...publicPerson(me),status:me.status,review_note:me.review_note},appearances:(await db.prepare('SELECT id,person,event,kind,source,status,created_at FROM people_appearances WHERE person=?').bind(me.id).all()).results,introductions,events:upcoming(events,now).map(eventData)});
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const b=await read(request);await allowance(db,owner,await hash(request.headers.get('CF-Connecting-IP')||owner),now);
  if(path==='/api/people/match'){const prompt=text(b,'prompt',1000,true);try{return json(await matchPeople(prompt,await peopleSnapshot(db,{events,now}),env,owner,request.headers.get('CF-Connecting-IP'),{now}))}catch(e){return json({error:e.message},503)}}
  if(path==='/api/people/profile'){
   if(b.action==='remove'){if(me){await db.prepare("UPDATE people_profiles SET status='hidden',open_to_meet=0,updated_at=? WHERE id=?").bind(now,me.id).run();await db.prepare("UPDATE people_introductions SET state='withdrawn',updated_at=? WHERE state='pending' AND (sender=? OR recipient=?)").bind(now,me.id,me.id).run()}return json({ok:true})}
   if(b.consent!==true)fail('Confirm that this is your profile and you want to publish it.');
   const p={name:text(b,'name',100,true),role:text(b,'role',180,true),bio:text(b,'bio',1200,true),ask_about:text(b,'ask_about',500,true),looking_for:text(b,'looking_for',500),linkedin:link(text(b,'linkedin',500,true),true),website:link(text(b,'website',500))};
   const topics=Array.isArray(b.topics)?[...new Set(b.topics.filter(x=>['sec','ai','dev','quantum','data','startup','pm','lead','career','grc','privacy'].includes(x)))]:[];if(!topics.length)fail('Choose at least one area of expertise.');
   const duplicate=await db.prepare('SELECT id FROM people_profiles WHERE linkedin=? AND owner<>?').bind(p.linkedin,owner).first();if(duplicate)fail('This LinkedIn profile is already listed. Use Report a profile to request help.',409);
   const id=me?.id||crypto.randomUUID();await db.prepare("INSERT INTO people_profiles(id,owner,name,role,bio,topics,ask_about,looking_for,linkedin,website,open_to_meet,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,role=excluded.role,bio=excluded.bio,topics=excluded.topics,ask_about=excluded.ask_about,looking_for=excluded.looking_for,linkedin=excluded.linkedin,website=excluded.website,open_to_meet=excluded.open_to_meet,status='pending',review_note='',updated_at=excluded.updated_at").bind(id,owner,p.name,p.role,p.bio,JSON.stringify(topics),p.ask_about,p.looking_for,p.linkedin,p.website,b.open_to_meet===true?1:0,now,now).run();return json({id,status:'pending'},201);
  }
  if(path==='/api/people/report'){const person=text(b,'person',36,true),reason=text(b,'reason',1000,true);const target=await db.prepare('SELECT id FROM people_profiles WHERE id=?').bind(person).first();if(!target)fail('Profile not found.',404);await db.prepare('INSERT INTO people_reports(id,reporter,person,reason,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),owner,person,reason,now).run();return json({ok:true})}
  if(!me)fail('Create your profile first.',403);
  if(path==='/api/people/appearance'){
   const event=text(b,'event',100,true);if(b.action==='remove'){await db.prepare('DELETE FROM people_appearances WHERE person=? AND event=?').bind(me.id,event).run();await db.prepare("UPDATE people_introductions SET state='withdrawn',updated_at=? WHERE event=? AND recipient=? AND state='pending'").bind(now,event,me.id).run();return json({ok:true})}
   if(me.status!=='approved')fail('Your profile needs approval before adding appearances.',403);if(!upcoming(events,now).some(e=>e.id===event))fail('Choose an upcoming Canopy event.');if(!['speaking','hosting','attending'].includes(b.kind))fail('Choose speaking, hosting or attending.');if(b.confirm!==true)fail('Confirm your appearance.');const source=b.kind==='attending'?'':link(text(b,'source',1000,true));
   await db.prepare("INSERT INTO people_appearances(id,person,event,kind,source,status,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(person,event) DO UPDATE SET kind=excluded.kind,source=excluded.source,status=excluded.status,created_at=excluded.created_at").bind(crypto.randomUUID(),me.id,event,b.kind,source,b.kind==='attending'?'approved':'pending',now).run();return json({ok:true,status:b.kind==='attending'?'approved':'pending'},201);
  }
  if(path==='/api/people/introductions'){
   if(me.status!=='approved')fail('Your profile needs approval before requesting an introduction.',403);const recipient=text(b,'person',36,true),event=text(b,'event',100,true),message=text(b,'message',1000,true);if(recipient===me.id)fail('Choose someone else to meet.');
   if(!upcoming(events,now).some(e=>e.id===event))fail('This event has ended or is no longer listed.');
   const target=await db.prepare("SELECT id FROM people_profiles WHERE id=? AND status='approved' AND open_to_meet=1").bind(recipient).first(),a=await db.prepare("SELECT id FROM people_appearances WHERE person=? AND event=? AND status='approved'").bind(recipient,event).first();if(!target||!a)fail('This person is not currently open to introductions at that event.',409);
   const blocked=await db.prepare('SELECT 1 AS yes FROM people_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)').bind(me.id,recipient,recipient,me.id).first();if(blocked)fail('An introduction cannot be sent.',403);
   const recent=await db.prepare('SELECT COUNT(*) AS total FROM people_introductions WHERE sender=? AND created_at>?').bind(me.id,now-864e5).first();if(recent.total>=5)fail('You can request five introductions per day.',429);
   const exists=await db.prepare('SELECT id FROM people_introductions WHERE (sender=? AND recipient=? OR sender=? AND recipient=?) AND event=?').bind(me.id,recipient,recipient,me.id,event).first();if(exists)fail('An introduction already exists for this person and event.',409);
   const id=crypto.randomUUID();await db.prepare("INSERT INTO people_introductions(id,sender,recipient,event,message,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind(id,me.id,recipient,event,message,now,now).run();return json({id,state:'pending'},201);
  }
  if(path==='/api/people/respond'){
   const id=text(b,'id',36,true),r=await db.prepare('SELECT * FROM people_introductions WHERE id=? AND (sender=? OR recipient=?)').bind(id,me.id,me.id).first();if(!r)fail('Introduction not found.',404);
   const other=r.sender===me.id?r.recipient:r.sender,blocked=await db.prepare('SELECT 1 AS yes FROM people_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)').bind(me.id,other,other,me.id).first();if(blocked)fail('Introduction unavailable.',403);
   if(['accept','decline'].includes(b.action)){if(r.recipient!==me.id||r.state!=='pending')fail('Only the recipient can respond to a pending introduction.',409);if(b.action==='accept'){const sender=await db.prepare("SELECT id FROM people_profiles WHERE id=? AND status='approved'").bind(r.sender).first(),appearance=await db.prepare("SELECT id FROM people_appearances WHERE person=? AND event=? AND status='approved'").bind(me.id,r.event).first();if(!upcoming(events,now).some(e=>e.id===r.event)||me.status!=='approved'||!sender||!appearance)fail('This event or profile is no longer available.',409);}await db.prepare('UPDATE people_introductions SET state=?,reply=?,updated_at=? WHERE id=?').bind(b.action==='accept'?'accepted':'declined',text(b,'reply',1000),now,id).run()}
   else if(b.action==='withdraw'){if(r.sender!==me.id||!['pending','accepted'].includes(r.state))fail('Cannot withdraw this introduction.',409);await db.prepare("UPDATE people_introductions SET state='withdrawn',updated_at=? WHERE id=?").bind(now,id).run()}
   else if(['met','followup'].includes(b.action)){if(r.state!=='accepted')fail('Accept the introduction first.',409);if(b.action==='met'&&events.some(e=>e.id===r.event&&CanopyEvents.day(now)<e.date))fail('Confirm your connection when the event begins.');const column=(r.sender===me.id?'sender_':'recipient_')+(b.action==='met'?'met':'followup');await db.prepare(`UPDATE people_introductions SET ${column}=?,updated_at=? WHERE id=?`).bind(b.value===true?1:0,now,id).run()}
   else fail('Choose a valid response.');return json({ok:true});
  }
  if(path==='/api/people/block'){const person=text(b,'person',36,true);if(person===me.id)fail('Invalid profile.');await db.prepare('INSERT OR IGNORE INTO people_blocks(blocker,blocked) VALUES(?,?)').bind(me.id,person).run();await db.prepare("UPDATE people_introductions SET state='withdrawn',updated_at=? WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)").bind(now,me.id,person,person,me.id).run();return json({ok:true})}

  return json({error:'Not found'},404);
 }catch(e){return json({error:e.status?e.message:'People is temporarily unavailable. Please try again.'},e.status||503)}
}
