/* Shared event rules: all published times are America/Chicago. */
globalThis.CanopyEvents=(()=>{
 const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}),times=new Map();
 const day=(ms=Date.now())=>dayFormat.format(ms);
 const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
 function instant(date,time){const key=date+'|'+time;if(!times.has(key))times.set(key,globalThis.CanopyCalendar.utc(date,time));return times.get(key)}
 function phase(e,now=Date.now()){
  const last=e.endDate||e.date;
  let end=instant(last,e.end||'23:59');
  if(!e.endDate&&e.start&&e.end&&e.end<=e.start)end=instant(shift(last,1),e.end);
  if(now>end)return 'ended';
  if(e.start&&now>=instant(e.date,e.start))return 'happening';
  return 'upcoming';
 }
 function range(key,now=Date.now()){
  const start=day(now);
  if(key==='today')return[start,shift(start,1)];
  if(key==='7')return[start,shift(start,7)];
  if(/^\d+$/.test(key))return[start,shift(start,Math.min(Number(key),365))];
  if(key==='weekend'){const dow=new Date(start+'T12:00:00Z').getUTCDay(),sat=dow===0?shift(start,-1):shift(start,(6-dow+7)%7);return[sat,shift(sat,2)]}
  return null;
 }
 const overlaps=(e,range)=>!range||((e.endDate||e.date)>=range[0]&&e.date<range[1]);
 const free=e=>e.priceType==='free'||/^free(?:\s*\(registration required\))?$/i.test((e.price||'').trim())||/^\$0(?:\.00)?$/.test((e.price||'').trim());
 const price=e=>free(e)?'Free':e.price||'Price not confirmed';
 const title=e=>String(e.title||'').replace(/\s*[-–—]\s*(?:sponsors?\s+(?:welcome|wanted)|sponsor ops available)[!\s]*$/i,'');
 return{day,shift,phase,range,overlaps,free,price,title};
})();
