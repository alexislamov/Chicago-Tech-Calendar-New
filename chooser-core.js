/* Matching rules shared by the browser fallback and the Claude service. */
globalThis.CanopyChooserCore=(()=>{
 const topics={sec:'Cybersecurity',ai:'AI',quantum:'Quantum',data:'Data & cloud',dev:'Software development',grc:'GRC & audit',privacy:'Privacy',pm:'Product & design',startup:'Startups',lead:'Leadership',career:'Careers'};
 const options={goal:['explore','learn','career','network','business'],budget:['any','free','50','100'],format:['any','In person','Virtual','Hybrid'],where:['any','downtown','suburbs'],when:['7','30','90','all','weekend'],schedule:['any','evening','day'],level:['any','beginner']};
 const defaults={topics:[],goal:'explore',budget:'any',format:'any',where:'any',when:'30',schedule:'any',level:'any',maxPrice:null};
 function normalize(p={}){const out={...defaults,maxPrice:Number.isFinite(p?.maxPrice)&&p.maxPrice>=0&&p.maxPrice<=100000?p.maxPrice:null,topics:Array.isArray(p?.topics)?[...new Set(p.topics.filter(t=>Object.hasOwn(topics,t)))].slice(0,11):[]};for(const [k,v] of Object.entries(options))if(v.includes(p?.[k]))out[k]=p[k];return out}
 function infer(text,p){const out=normalize(p),q=String(text||'').toLowerCase();if(!out.topics.length){const words={sec:/cyber|security/,ai:/\bai\b|artificial intelligence|machine learning/,quantum:/quantum/,dev:/software|coding|programming/,career:/career|job/};out.topics=Object.entries(words).filter(([,r])=>r.test(q)).map(([k])=>k)}
  if(out.budget==='any'){if(/\bfree\b/.test(q))out.budget='free';else if(/(?:under|below|up to|max(?:imum)?)\s*\$?50\b/.test(q))out.budget='50';else if(/(?:under|below|up to|max(?:imum)?)\s*\$?100\b/.test(q))out.budget='100'}
  if(out.budget==='any'){const amount=q.match(/(?:under|below|up to|max(?:imum)?)\s*\$?([0-9]+(?:\.[0-9]{1,2})?)\b/);if(amount)out.maxPrice=Math.min(100000,Number(amount[1]));}
  if(out.where==='any'&&/downtown|the loop|river north/.test(q))out.where='downtown';if(out.format==='any'&&/virtual|online/.test(q))out.format='Virtual';
  if(out.schedule==='any'&&/after work|evening/.test(q))out.schedule='evening';if(/this week|next seven|next 7/.test(q))out.when='7';if(/weekend/.test(q))out.when='weekend';if(/beginner|new to|switching into|getting started/.test(q))out.level='beginner';
  if(out.goal==='explore'){if(/job|career|switching into/.test(q))out.goal='career';else if(/meet people|network|meet peers/.test(q))out.goal='network';else if(/learn|workshop/.test(q))out.goal='learn';else if(/founder|business|startup/.test(q))out.goal='business'}return out}
 const cost=e=>{if(CanopyEvents.free(e))return 0;const p=String(e.price||'').trim();return /^\$\d+(?:\.\d{1,2})?$/.test(p)?Number(p.slice(1)):null};
 const downtown=e=>/\b(loop|downtown|river north|west loop|south loop|streeterville|magnificent mile)\b/i.test((e.area||'')+' '+(e.venue||''));
 function fits(e,p,now=Date.now()){
  if(e.unlisted||CanopyEvents.phase(e,now)==='ended'||/application deadline/i.test(e.type+' '+e.note))return false;
  if(!CanopyEvents.overlaps(e,CanopyEvents.range(p.when,now)))return false;
  if(p.topics.length&&!p.topics.some(t=>e.topics?.includes(t)))return false;
  if(p.format!=='any'&&e.mode!==p.format)return false;
  if(p.budget!=='any'&&(cost(e)===null||cost(e)>(p.budget==='free'?0:Number(p.budget))))return false;
  if(p.maxPrice!==null&&(cost(e)===null||cost(e)>p.maxPrice))return false;
  if(p.where!=='any'){if(e.mode==='Virtual')return false;if(p.where==='downtown'&&!downtown(e))return false;if(p.where==='suburbs'&&!/rosemont|schaumburg|naperville|oak brook|suburb|arlington|evanston|northbrook|downers grove|hoffman/i.test(e.area+' '+e.venue))return false}
  if(p.schedule!=='any'&&(!e.start||(p.schedule==='evening'?Number(e.start.slice(0,2))<17:Number(e.start.slice(0,2))>=17)))return false;
  return true;
 }
 function rank(events,p,signals={},now=Date.now()){
  p=normalize(p);const liked=events.filter(e=>(signals.liked||[]).includes(e.id)),saved=events.filter(e=>(signals.saved||[]).includes(e.id)),viewed=events.filter(e=>(signals.viewed||[]).includes(e.id));
  return events.filter(e=>fits(e,p,now)&&!(signals.dismissed||[]).includes(e.id)).map(e=>{
   let score=0;const reasons=[];const text=[e.title,e.desc,e.type,e.audience].join(' '),intersection=arr=>e.topics?.some(t=>arr.some(x=>x.topics?.includes(t)));
   if(p.topics.length){score+=6;reasons.push('Matches '+e.topics.filter(t=>p.topics.includes(t)).map(t=>topics[t]).join(' and '))}
   if(intersection(liked)){score+=4;reasons.push('Similar topics to events you liked')}if(intersection(saved)){score+=3;reasons.push('Related to your saved events')}if(intersection(viewed))score+=0.5;
   const patterns={learn:/workshop|training|talk|learn|hands.on|tutorial/i,career:/career|job|mentor|network|certif/i,network:/network|mixer|meetup|social|community/i,business:/startup|founder|business|pitch|entrepreneur/i};
   if(patterns[p.goal]?.test(text)){score+=3;reasons.push({learn:'A format suited to learning',career:'Includes career or community-building opportunities',network:'A format suited to meeting peers',business:'Relevant to founders and business interests'}[p.goal])}
   if(p.level==='beginner'&&/beginner|introduct|getting started|all levels|fundamental/i.test(text)){score+=3;reasons.push('The listing mentions introductory or all-level content')}
   if(p.where==='downtown')reasons.push('Listed in the downtown area');if(p.schedule==='evening')reasons.push('Starts after 5pm Central');if(CanopyEvents.free(e)){score++;reasons.push('Listed as free')}
   if(!reasons.length)reasons.push('An upcoming event within your selected dates');
   return {event:e,score,reason:reasons.slice(0,3).join('. ')+'.'};
  }).sort((a,b)=>b.score-a.score||a.event.date.localeCompare(b.event.date)||a.event.id.localeCompare(b.event.id));
 }
 return{topics,defaults,normalize,infer,fits,rank,cost};
})();
