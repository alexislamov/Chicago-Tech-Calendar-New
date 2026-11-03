globalThis.CanopyNews=(()=>{
 const subjects={
  'identity and access':/\b(identity|authentication|iam|access management|zero trust|oauth)\b/i,
  'AI agents':/\b(agentic|agents?|multi.agent)\b/i,
  'language models':/\b(llms?|language models?|generative ai|genai|chatbots?|chatgpt|claude|gemini)\b/i,
  'AI safety and governance':/\b(ai safety|ai governance|ai ethics|responsible ai|ai risk)\b/i,
  'security vulnerabilities':/\b(vulnerabilit\w*|cves?|exploits?|patching|zero.day)\b/i,
  'threat detection':/\b(threat|incident response|soc|malware|ransomware|phishing)\b/i,
  'cloud platforms':/\b(cloud|aws|azure|bedrock|google cloud)\b/i,
  'data and analytics':/\b(analytics|databricks|database|data science|data engineering)\b/i,
  'privacy':/\b(privacy|personal data|surveillance)\b/i,
  'risk and compliance':/\b(compliance|governance|audit|nist|risk management)\b/i,
  'software development':/\b(developer|programming|python|github|software engineering|coding)\b/i
 };
 const labels={sec:'Security',ai:'AI',data:'Data & Cloud',dev:'Software Development',grc:'GRC & Audit',privacy:'Privacy'};
 function related(article,eventList,{broad=false,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'})}={}){
  const end=new Date(Date.parse(today+'T00:00:00Z')+30*864e5).toISOString().slice(0,10);
  const story=article.title+' '+article.summary;
  return eventList.filter(e=>e.date>=today&&e.date<=end).map(e=>{
   const shared=(article.topics||[]).filter(t=>(e.topics||[]).includes(t)&&labels[t]);
   const text=e.title+' '+(e.desc||'');
   const specific=Object.entries(subjects).filter(([,re])=>re.test(story)&&re.test(text)).map(([name])=>name);
   if(!shared.length||(!specific.length&&!broad))return null;
   return {event:e,score:specific.length*10+shared.length,reason:specific.length?'Shared subject: '+specific.slice(0,2).join(', '):'Topic match: '+shared.map(t=>labels[t]).join(', ')};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.event.date.localeCompare(b.event.date)).slice(0,2);
 }
 if(typeof document!=='undefined'){
  let brief=null,loading=false;
  let show=store.get('canopy-news-show-events',true),broad=store.get('canopy-news-broad',false);
  const root=document.getElementById('dailyNews');
  root.innerHTML=`<div class="news-heading"><h2>Cybersecurity, AI and Technology in the News</h2><p id="newsUpdated" role="status">Loading the daily brief…</p></div><div class="news-options"><label><input type="checkbox" id="newsShowRelated"> Show related events</label></div><div id="newsCards" class="news-grid"></div><p id="newsWarning" class="news-note" role="status"></p><details class="news-sources"><summary>Sources &amp; matching options</summary><label class="news-broad-option"><input type="checkbox" id="newsBroad"> Include broader topic matches</label><p>Matches use shared subjects and event topics, not an organizer’s involvement in the story. We check publisher RSS feeds daily after 6am Chicago time and select up to six recent stories for freshness, topic coverage and source variety. Failed feeds retain their last available stories; stale briefs are labeled.</p><ul id="newsSources"></ul></details>`;
  document.getElementById('newsShowRelated').checked=show;document.getElementById('newsBroad').checked=broad;document.getElementById('newsBroad').disabled=!show;
  function render(){
   if(!brief)return;
   const cards=document.getElementById('newsCards');
   cards.innerHTML=brief.articles.length?brief.articles.map(a=>{
    const matches=show?related(a,events,{broad}):[];
    const match=matches[0];
    const shortName=match?match.event.title.replace(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s*[-–—:]\s*/i,'').replace(/\s+/g,' ').trim():'';
    const compactName=shortName.length>44?shortName.slice(0,41).replace(/\s+\S*$/,'')+'…':shortName;
    return `<article class="news-card${show?'':' news-no-events'}"><div class="news-main"><h3><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a></h3><div class="news-source">${esc(a.source)} · ${new Date(a.published).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Chicago'})}</div><p class="news-excerpt" title="${esc(a.summary)}">${esc(a.summary)}</p></div>${show?`<aside class="news-related" aria-label="Related event">${match?`<div class="news-match"><span>Related event</span><button type="button" data-news-event="${esc(match.event.id)}" title="${esc(match.event.title+' · '+match.reason)}" aria-label="Open event: ${esc(match.event.title)}">${esc(compactName)}</button><small>${esc(match.event.date)} · ${esc(match.reason)}</small></div>`:'<small>No close event match</small>'}</aside>`:''}</article>`;
   }).join(''):'<p>No recent stories are available yet. <button type="button" data-news-retry>Try again</button></p>';
  }
  async function load(){if(loading)return;loading=true;try{
   const res=await fetch('/api/news');if(!res.ok)throw Error();brief=await res.json();
   const date=brief.updated?new Date(brief.updated).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):null;
   document.getElementById('newsUpdated').textContent=date?`Updated ${date} CT${brief.stale?' · Update delayed':''}`:'Waiting for the first daily update';
   const warning=[];if(brief.stale)warning.push('Showing the last available brief while the refresh recovers.');if(brief.unavailableSources?.length)warning.push('Some feeds were unavailable at the last refresh.');if(brief.articles.length<6)warning.push(`Showing ${brief.articles.length} recent stories; unavailable slots are not filled with old or invented news.`);
   document.getElementById('newsWarning').textContent=warning.join(' ');
   document.getElementById('newsSources').innerHTML=(brief.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('');render();
  }catch{document.getElementById('newsUpdated').textContent='Daily brief temporarily unavailable';document.getElementById('newsCards').innerHTML='<p>Please try again. <button type="button" data-news-retry>Reload news</button></p>'}finally{loading=false}}
  root.addEventListener('change',e=>{if(e.target.id==='newsShowRelated'){show=e.target.checked;store.set('canopy-news-show-events',show);document.getElementById('newsBroad').disabled=!show}else if(e.target.id==='newsBroad'){broad=e.target.checked;store.set('canopy-news-broad',broad)}render()});
  root.addEventListener('click',e=>{const button=e.target.closest('[data-news-event]');if(button)openModal(button.dataset.newsEvent);if(e.target.closest('[data-news-retry]'))load()});
  load();
 }
 return {related};
})();
