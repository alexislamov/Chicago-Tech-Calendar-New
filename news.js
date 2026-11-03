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
  root.innerHTML=`<div class="news-heading"><div><div class="eyebrow">Your daily brief</div><h2>Top 6 in cybersecurity, AI &amp; tech</h2></div><p id="newsUpdated" role="status">Loading the daily brief…</p></div><p class="news-intro">Recent stories selected for freshness, topic coverage and source variety. Short excerpts link to the publishers’ full reporting.</p><div class="news-options"><label><input type="checkbox" id="newsShowRelated"> Automatically show related events</label><label><input type="checkbox" id="newsBroad"> Include broader topic matches</label></div><p class="news-note">Matches use shared subjects and event topics. They indicate relevance, not an organizer’s involvement in the story.</p><div id="newsCards" class="news-grid"></div><p id="newsWarning" class="news-note" role="status"></p><details class="news-sources"><summary>Sources &amp; selection</summary><p>We check publisher RSS feeds daily after 6am Chicago time, keep up to six recent stories, favor different sources and include AI and security coverage when available. This is an automated selection, not an editorial ranking. Failed feeds retain their last available stories; stale briefs are labeled.</p><ul id="newsSources"></ul></details>`;
  document.getElementById('newsShowRelated').checked=show;document.getElementById('newsBroad').checked=broad;document.getElementById('newsBroad').disabled=!show;
  function render(){
   if(!brief)return;
   const cards=document.getElementById('newsCards');
   cards.innerHTML=brief.articles.length?brief.articles.map(a=>{
    const matches=show?related(a,events,{broad}):[];
    return `<article class="news-card"><div class="news-source">${esc(a.source)} · ${new Date(a.published).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Chicago'})}</div><h3><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a></h3><p>${esc(a.summary)}</p><div class="tags">${a.topics.filter(t=>labels[t]).slice(0,3).map(t=>`<span class="tag">${esc(labels[t])}</span>`).join('')}</div>${show?`<div class="news-related"><h4>Connect it to an event</h4>${matches.length?matches.map(m=>`<div class="news-match"><button type="button" data-news-event="${esc(m.event.id)}">${esc(m.event.title)}</button><small>${esc(m.event.date)} · ${esc(m.reason)}</small></div>`).join(''):`<small>No ${broad?'matching':'close subject matches for'} events in the next 30 days${broad?'.':'. Try broader topic matches.'}</small>`}</div>`:''}</article>`;
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
