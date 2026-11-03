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

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/community') return onRequest({request,env});
    return env.ASSETS.fetch(request);
  }
};
