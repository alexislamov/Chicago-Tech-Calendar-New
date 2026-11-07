(()=>{
 const e=JSON.parse(document.getElementById('eventData').textContent);let identity;
 try{identity=localStorage.getItem('canopy-community-id');if(!identity){identity=crypto.randomUUID();localStorage.setItem('canopy-community-id',identity)}}catch{}
 let mine=null;
 const status=document.getElementById('pageCounts');
 async function api(action){if(!identity)return;const res=await fetch('/api/community',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+identity,...(action?{'Content-Type':'application/json'}:{})},body:action?JSON.stringify({event:e.id,status:action,ref:new URL(location.href).searchParams.get('invite')}):undefined,keepalive:true});if(!res.ok)throw Error();const d=await res.json();mine=d.mine.find(x=>x.event===e.id)?.status;const count=d.counts.find(x=>x.event===e.id);status.textContent=count&&(count.interested||count.going)?`${count.interested||0} interested · ${count.going||0} going`:'';document.querySelectorAll('[data-page-response]').forEach(b=>b.setAttribute('aria-pressed',mine===b.dataset.pageResponse));return d;}
 const saved=()=>{try{return new Set(JSON.parse(localStorage.getItem('canopy-chi-v4-saved')||'[]'))}catch{return new Set()}};
 const refresh=()=>{const yes=saved().has(e.id);document.getElementById('pageSave').textContent=yes?'Saved ✓':'Save event';document.getElementById('pageSave').setAttribute('aria-pressed',yes)};
 refresh();api('clicked').catch(()=>{});
 document.getElementById('pageSave').onclick=()=>{try{const s=saved();s.has(e.id)?s.delete(e.id):s.add(e.id);localStorage.setItem('canopy-chi-v4-saved',JSON.stringify([...s]));refresh();api(s.has(e.id)?'saved':'unsaved').catch(()=>{})}catch{status.textContent='Enable browser storage to save events.'}};
 document.getElementById('pageCalendar').onclick=()=>CanopyCalendar.download(e);
 const copy=async url=>{try{await navigator.clipboard.writeText(url);status.textContent='Link copied.';return true}catch{prompt('Copy this event link:',url);return false}};
 document.getElementById('pageCopy').onclick=()=>copy(e.url);
 document.querySelector('[data-registration]')?.addEventListener('click',()=>api('registration').catch(()=>{}));
 document.querySelectorAll('[data-page-response]').forEach(b=>b.onclick=()=>api(mine===b.dataset.pageResponse?'none':b.dataset.pageResponse).catch(()=>status.textContent='Could not save your response. Please try again.'));
 document.getElementById('pageInvite').onclick=async()=>{let url=e.url;try{const d=await api();url+='?invite='+d.inviteCode}catch{}if(await copy(url))api('invited').catch(()=>{})};
 document.getElementById('pageReport').onclick=()=>sessionStorage.setItem('canopy-correction',JSON.stringify({target:e.title,source:e.url}));
})();
