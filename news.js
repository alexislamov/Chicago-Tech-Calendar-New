globalThis.CanopyNews=(()=>{
 let refresh=()=>{};
 if(typeof document!=='undefined'){
  let brief=null,loading=false;
  const root=document.getElementById('dailyNews');
  root.innerHTML=`<div class="news-heading"><h2 class="eyebrow news-label">YOUR DAILY NEWS BRIEF</h2><p id="newsUpdated" role="status">Loading the daily brief…</p></div><div id="newsCards" class="news-grid"></div><p id="newsWarning" class="news-note" role="status"></p><details class="news-sources"><summary>Sources &amp; selection</summary><p>We check publisher RSS feeds daily after 6am Chicago time and select up to six recent stories for freshness, topic coverage and source variety. Failed feeds retain their last available stories; stale briefs are labeled.</p><ul id="newsSources"></ul></details>`;
  function render(){
   if(!brief)return;
   const cards=document.getElementById('newsCards');
   cards.innerHTML=brief.articles.length?brief.articles.map(a=>{
    return `<article class="news-card"><div class="news-main"><h3><a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a></h3><div class="news-source">${esc(a.source)} · ${new Date(a.published).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/Chicago'})}</div><p class="news-excerpt" title="${esc(a.summary)}">${esc(a.summary)}</p></div></article>`;
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
  root.addEventListener('click',e=>{if(e.target.closest('[data-news-retry]'))load()});
  refresh=load;
 }
 return {load:()=>refresh()};
})();
