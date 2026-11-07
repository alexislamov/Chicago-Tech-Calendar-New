const NEWS_VERSION=2;
export const SOURCES=[
 {id:'bleeping',name:'BleepingComputer',url:'https://www.bleepingcomputer.com/feed/',topics:['sec'],host:'bleepingcomputer.com'},
 {id:'hackernews',name:'The Hacker News',url:'https://feeds.feedburner.com/TheHackersNews',topics:['sec'],host:'thehackernews.com'},
 {id:'securityweek',name:'SecurityWeek',url:'https://www.securityweek.com/feed/',topics:['sec'],host:'securityweek.com'},
 {id:'google',name:'Google AI',url:'https://blog.google/innovation-and-ai/technology/ai/rss/',topics:['ai'],host:'blog.google'},
 {id:'mit',name:'MIT Technology Review',url:'https://www.technologyreview.com/feed/',topics:[],host:'technologyreview.com'},
 {id:'nist',name:'NIST Cybersecurity Insights',url:'https://www.nist.gov/blogs/cybersecurity-insights/rss.xml',topics:['sec','grc'],host:'nist.gov'},
 {id:'quantum',name:'Quantum Computing Report',url:'https://quantumcomputingreport.com/feed/',topics:['quantum'],host:'quantumcomputingreport.com'},
 {id:'ars',name:'Ars Technica',url:'https://feeds.arstechnica.com/arstechnica/index',topics:['tech'],host:'arstechnica.com'},
 {id:'microsoft',name:'Microsoft Security',url:'https://www.microsoft.com/en-us/security/blog/feed/',topics:['sec'],host:'microsoft.com'}
];
const groups={sec:/\b(cyber|cybersecurity|security|ransomware|malware|vulnerabilit\w*|phishing|breach|threat|zero.day)\b/i,ai:/\b(ai|artificial intelligence|machine learning|llm|agentic|chatbot|neural|deep learning)\b/i,data:/\b(data center|cloud|database|databricks|analytics)\b/i,dev:/\b(developer|software|open.source|programming|github|python)\b/i,grc:/\b(governance|compliance|regulation|risk management|audit|nist|framework)\b/i,privacy:/\b(privacy|personal data|surveillance)\b/i};
export function decode(value){return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return code>0&&code<=0x10ffff?String.fromCodePoint(code):''}).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—'}[n]));}
const plain=value=>decode(decode(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const tag=(xml,name)=>xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';
export function parseFeed(xml,source,now=Date.now()){
 const entries=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>|<entry\b[^>]*>[\s\S]*?<\/entry>/gi)||[];
 return entries.map(entry=>{
  const title=plain(tag(entry,'title')).slice(0,220),rawLink=tag(entry,'link')||entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1];
  let link;try{link=new URL(decode(rawLink).trim())}catch{return null}
  if(link.protocol!=='https:'||!(link.hostname===source.host||link.hostname.endsWith('.'+source.host)))return null;
  for(const key of [...link.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))link.searchParams.delete(key);link.hash='';
  const date=Date.parse(plain(tag(entry,'pubDate')||tag(entry,'published')||tag(entry,'updated')||tag(entry,'dc:date')));
  if(!title||!Number.isFinite(date)||date>now+300000||date<now-14*864e5)return null;
  const description=plain(tag(entry,'description')||tag(entry,'summary')||tag(entry,'content:encoded')||tag(entry,'content')).replace(/^This story originally appeared[\s\S]*?sign up here\.\s*/i,'').replace(/\s+The post [\s\S]*$/i,'').replace(/\s*\[\.\.\.\]\s*/g,' ').trim();
  const excerpt=description.split(/\s+/).slice(0,24).join(' ');
  const summary=(excerpt.length>190?excerpt.slice(0,190).replace(/\s+\S*$/,''):excerpt)+(description.length>190||description.split(/\s+/).length>24?'…':'');
  const text=title+' '+description.slice(0,1000),topics=[...new Set([...source.topics,...Object.entries(groups).filter(([,pattern])=>pattern.test(text)).map(([key])=>key)])];
  if(!topics.length)return null;
  return {id:link.href,title,summary:summary||'Read the publisher’s report for the full details.',link:link.href,source:source.name,sourceId:source.id,published:new Date(date).toISOString(),topics};
 }).filter(Boolean).slice(0,40);
}
const normalized=text=>text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selectStories(items,now=Date.now()){
 const unique=[];for(const item of [...items].sort((a,b)=>b.published.localeCompare(a.published))){if(!unique.some(x=>x.link===item.link||normalized(x.title)===normalized(item.title)))unique.push(item)}
 const chosen=[],counts=new Map();
 const pick=predicate=>{const pool=unique.filter(x=>!chosen.includes(x)&&predicate(x)&&(counts.get(x.sourceId)||0)<2);pool.sort((a,b)=>{const score=x=>72-(now-Date.parse(x.published))/36e5+(counts.has(x.sourceId)?0:36);return score(b)-score(a)});if(pool[0]){chosen.push(pool[0]);counts.set(pool[0].sourceId,(counts.get(pool[0].sourceId)||0)+1)}};
 for(const topic of ['sec','ai','tech','quantum'])pick(x=>x.topics.includes(topic));while(chosen.length<6){const n=chosen.length;pick(()=>true);if(chosen.length===n)break}
 return chosen.sort((a,b)=>b.published.localeCompare(a.published));
}
export async function refreshNews(env,{forceEmpty=false,now=Date.now(),fetcher=fetch}={}){
 const chicago=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now),parts=Object.fromEntries(chicago.map(x=>[x.type,x.value]));
 const day=`${parts.year}-${parts.month}-${parts.day}`;
 const current=await env.COMMUNITY.prepare('SELECT * FROM news_brief WHERE id=1').first();
 if(!current)return;
 const empty=!JSON.parse(current.payload).articles?.length;
 if(current.lease_until>now||(JSON.parse(current.payload).version===NEWS_VERSION&&now-current.last_attempt<360e4))return;
 const claim=await env.COMMUNITY.prepare('UPDATE news_brief SET lease_until=?,last_attempt=? WHERE id=1 AND lease_until<? RETURNING id').bind(now+90000,now,now).first();if(!claim)return;
 const all=[],failures=[];let refreshed=0;
 await Promise.all(SOURCES.map(async source=>{
  try{
   const res=await fetcher(source.url,{headers:{'User-Agent':'CanopyNews/1.0 (+https://chitech.events)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml'},signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw Error('HTTP '+res.status);
   const xml=await res.text();if(xml.length>3e6)throw Error('Feed too large');
   const items=parseFeed(xml,source,now);if(!items.length)throw Error('No recent supported items');
   const snapshot={items};await env.COMMUNITY.prepare('INSERT INTO news_sources(id,payload,refreshed_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,refreshed_at=excluded.refreshed_at').bind(source.id,JSON.stringify(snapshot),new Date(now).toISOString()).run();all.push(...items);refreshed++;
  }catch(error){failures.push(source.name);const previous=await env.COMMUNITY.prepare('SELECT payload FROM news_sources WHERE id=?').bind(source.id).first();if(previous)all.push(...JSON.parse(previous.payload).items.filter(x=>Date.parse(x.published)>=now-14*864e5))}
 }));
 const articles=selectStories(all,now);
 if(!articles.length||!refreshed){await env.COMMUNITY.prepare('UPDATE news_brief SET lease_until=0,last_error=? WHERE id=1').bind('No fresh sources available; keeping the previous brief.').run();return}
 const payload=JSON.stringify({version:NEWS_VERSION,articles,updated:new Date(now).toISOString(),checkedDay:day,sources:SOURCES.map(x=>({name:x.name,url:x.url})),unavailableSources:failures});
 await env.COMMUNITY.prepare('UPDATE news_brief SET payload=?,last_success=?,attempt_day=?,lease_until=0,last_error=? WHERE id=1').bind(payload,new Date(now).toISOString(),day,failures.length?'Some sources unavailable: '+failures.join(', '):'').run();
}
export async function newsResponse(env,ctx){
 const row=await env.COMMUNITY.prepare('SELECT payload,last_error,last_success FROM news_brief WHERE id=1').first();
 let data=row?JSON.parse(row.payload):{};
 if(!data.articles?.length){try{await refreshNews(env,{forceEmpty:true});const fresh=await env.COMMUNITY.prepare('SELECT payload,last_error FROM news_brief WHERE id=1').first();data=JSON.parse(fresh.payload);data.warning=fresh.last_error}catch{data={articles:[],warning:'The daily brief is temporarily unavailable.'}}}
 else if(ctx)ctx.waitUntil(refreshNews(env).catch(()=>{}));
 const stale=!!data.updated&&Date.now()-Date.parse(data.updated)>36*36e5;
 return new Response(JSON.stringify({...data,articles:data.articles||[],stale,warning:data.warning||row?.last_error||''}),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=300'}});
}
