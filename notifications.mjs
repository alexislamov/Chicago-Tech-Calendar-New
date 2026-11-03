const REVIEW_URL='https://dash.cloudflare.com/dce98768ef84087aeb94b20fe125e78d/workers/d1/databases/2883607c-8d04-41dc-82b6-0d5fa62d78ed/studio';
export async function notify(env,id,subject,body){
  await env.COMMUNITY.prepare('INSERT OR IGNORE INTO notification_outbox(id,subject,body) VALUES(?,?,?)').bind(id,subject,body+'\n\nReview in Cloudflare: '+REVIEW_URL).run();
  return deliver(env,id);
}
export async function deliver(env,id){
  const now=Date.now(),lease=now+120000;
  const claim=await env.COMMUNITY.prepare("UPDATE notification_outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE id=? AND status!='sent' AND attempts<5 AND lease_until<? RETURNING subject,body").bind(lease,id,now).first();
  if(!claim)return false;
  try{
    if(!env.NOTIFICATIONS)throw new Error('Notification email binding is unavailable');
    const sent=await env.NOTIFICATIONS.send({from:'notifications@chitech.events',to:'iskandarislamov@gmail.com',subject:claim.subject,text:claim.body});
    await env.COMMUNITY.prepare("UPDATE notification_outbox SET status='sent',sent_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_error='',lease_until=0 WHERE id=?").bind(id).run();
    return true;
  }catch(error){
    await env.COMMUNITY.prepare("UPDATE notification_outbox SET status='failed',last_error=?,lease_until=0 WHERE id=?").bind(String(error.code||error.message||'Email failed').slice(0,300),id).run();
    return false;
  }
}
export async function retryNotifications(env){
  const rows=await env.COMMUNITY.prepare("SELECT id FROM notification_outbox WHERE status!='sent' AND attempts<5 AND lease_until<? ORDER BY created_at LIMIT 20").bind(Date.now()).all();
  for(const row of rows.results)await deliver(env,row.id);
}
