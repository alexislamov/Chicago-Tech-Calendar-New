/* Build-time public listing history; never includes visitor activity or private notes. */
import {createHash} from 'node:crypto';
import './calendar.js';import './event-utils.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function buildEventCatalog(records,identities={},history=[],now=Date.now()){
 const urls=records.reduce((m,e)=>(m[e.link]=(m[e.link]||0)+1,m),{}),seen=new Set();
 const currentEvents=records.map(e=>{
  const legacy=`${e.date}|${e.start}|${e.title}`,baseKey=e.link?(urls[e.link]===1?e.link:e.link+'|'+e.date+'|'+e.host):legacy;
  const same=history.filter(x=>e.link&&x.link===e.link&&x.date===e.date&&x.host===e.host),previous=same.find(x=>x.start===e.start&&x.title===e.title)||(same.length===1?same[0]:null);
  let key=e.link?e.link+'|'+e.date+'|'+e.host:legacy;
  const baseId=identities[baseKey],oldBase=history.find(x=>x.id===baseId);
  let id=previous?.id||identities[key]||(!oldBase||oldBase.date===e.date?baseId:null)||'evt-'+hash(key).slice(0,24);
  if(seen.has(id)){key+='|'+e.start+'|'+e.title;id=identities[key]||'evt-'+hash(key).slice(0,24)}
  identities[key]=id;if(!identities[baseKey])identities[baseKey]=id;seen.add(id);
  return {...e,id,slug:hash(id).slice(0,16)};
 });
 const stored=new Map(history.filter(e=>e.id&&e.slug).map(e=>[e.id,e]));for(const e of currentEvents)stored.set(e.id,e);
 const events=[...currentEvents,...[...stored.values()].filter(e=>!seen.has(e.id)).map(e=>({...e,unlisted:true}))];
 return {events,identities,history:[...stored.values()].sort((a,b)=>a.id.localeCompare(b.id))};
}
