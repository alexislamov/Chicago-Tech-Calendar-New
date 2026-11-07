/* Outlook supports importing standard iCalendar files, without an account-specific URL. */
globalThis.CanopyCalendar=(()=>{
 const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const dayAfter=date=>new Date(Date.parse(date+'T00:00:00Z')+864e5).toISOString().slice(0,10);
 function utc(date,time){
  const [y,m,d]=date.split('-').map(Number),[h,mi]=time.split(':').map(Number),guess=Date.UTC(y,m-1,d,h,mi);
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  let value=guess;
  for(let n=0;n<3;n++){
   const p=Object.fromEntries(fmt.formatToParts(value).map(x=>[x.type,x.value]));
   const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
   const diff=guess-represented;if(!diff)break;value+=diff;
  }
  return value;
 }
 const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 function fold(line){let lines=[],part='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>75){lines.push(part);part=' ';size=1}part+=char;size+=bytes}lines.push(part);return lines.join('\r\n')}
 function serialize(event,now=Date.now()){
  const allDay=event.allDay||!event.start;
  let timing;
  if(allDay)timing=['DTSTART;VALUE=DATE:'+event.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+dayAfter(event.endDate||event.date).replace(/-/g,'')];
  else{const start=utc(event.date,event.start);const end=event.endDate?utc(event.endDate,event.end||'23:59'):event.end?utc(event.end<=event.start?dayAfter(event.date):event.date,event.end):start+36e5;timing=['DTSTART:'+stamp(start),'DTEND:'+stamp(end)]}
  const description=[event.desc,event.note,event.start&&!event.end&&!event.endDate?'End time not posted. This calendar uses a one-hour placeholder; confirm with the organizer.':'','Hosted by '+event.host,(event.cohosts||[]).map(x=>x.name+' ('+x.role+')').join('; '),event.link,!event.start?'Start time not posted. This is an all-day reminder; confirm the time with the organizer.':'Confirm details and registration with the organizer.'].filter(Boolean).join('\n\n');
  const uid=encodeURIComponent(event.id||event.date+'|'+event.title)+'@chitech.events';
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Canopy//Chicago Tech Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp(now),...timing,'SUMMARY:'+escape(event.title),'DESCRIPTION:'+escape(description),'LOCATION:'+escape(event.mode==='Virtual'?'Online':event.venue||event.area||'Chicago'),...(event.link?['URL:'+String(event.link).replace(/[\r\n]/g,'')]:[]),'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
 }
 function download(event){if(!event)return;const url=URL.createObjectURL(new Blob([serialize(event)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(event.title.replace(/[^a-z0-9]+/gi,'-').slice(0,80)||'canopy-event')+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
 return {serialize,download,utc};
})();
