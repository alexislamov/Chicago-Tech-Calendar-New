const Collaboration=(()=>{
 const categories=['Co-host','Venue','Speakers','Sponsors','Community partner'];
 let requests=null,error='',filter='';
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const hosts=document.getElementById('cohostRows');
 function addHost(){
  if(hosts.children.length>=5)return;
  const row=document.createElement('fieldset');row.className='cohost-row';
  row.innerHTML=`<legend>Partner organization</legend><label>Organization name<input data-host-name maxlength="180" required></label><label>Role<select data-host-role>${['Co-host','Venue partner','Community partner','Sponsor'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Listed group (optional)<select data-host-group><option value="">Other / not listed</option>${Object.entries(GROUPS).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,g])=>`<option value="${esc(id)}">${esc(g.name)}</option>`).join('')}</select></label><button type="button" data-remove-host>Remove partner</button>`;
  hosts.append(row);document.getElementById('addCohost').disabled=hosts.children.length>=5;
 }
 document.getElementById('addCohost').addEventListener('click',addHost);
 hosts.addEventListener('click',ev=>{if(ev.target.closest('[data-remove-host]')){ev.target.closest('fieldset').remove();document.getElementById('addCohost').disabled=false}});
 hosts.addEventListener('change',ev=>{if(ev.target.matches('[data-host-group]')&&ev.target.value){ev.target.closest('fieldset').querySelector('[data-host-name]').value=GROUPS[ev.target.value].name}});
 function list(){
  const el=document.getElementById('partnerList');if(!el)return;
  if(error){el.innerHTML=`<p role="status">${esc(error)}</p><button type="button" data-reload-partners>Try again</button>`;return}
  if(!requests){el.innerHTML='<p role="status">Loading partner requests…</p>';return}
  const visible=requests.filter(x=>!filter||x.category===filter);
  el.innerHTML=visible.length?visible.map(p=>`<article class="partner-card"><div class="tags"><span class="tag">${esc(p.category)} wanted</span></div><h3>${esc(p.title)}</h3><p><strong>${esc(p.organization)}</strong></p><p class="partner-description">${esc(p.description)}</p>${p.event_date?`<p>Event: ${esc(p.event_date)}</p>`:''}<p>Closes: ${esc(p.expires_on)}</p>${safeURL(p.contact_url)?`<a class="btn btn-ghost" href="${esc(safeURL(p.contact_url))}" target="_blank" rel="noopener noreferrer">Contact organization ↗</a>`:''}</article>`).join(''):'<p>No approved partner requests match yet. Be the first to propose a collaboration.</p>';
 }
 async function load(){error='';list();try{const res=await fetch('/api/partners');if(!res.ok)throw Error();requests=(await res.json()).requests}catch{error='Partner requests are temporarily unavailable.'}list()}
 function render(){
  const el=document.getElementById('view-partners');if(el.dataset.ready)return;
  el.dataset.ready='true';el.innerHTML=`<div class="journal"><div class="eyebrow">Build something together</div><h1><em>Find Partners</em></h1><p>Connect Chicago organizations around a shared event. Find co-hosts, venues, speakers, sponsors and community partners.</p><p><small>Requests are reviewed before publication. A listing does not confirm a partnership or endorsement. Contact the organization to agree on details.</small></p><label>Partner type<select id="partnerFilter"><option value="">All partner types</option>${categories.map(x=>`<option>${x}</option>`).join('')}</select></label><div id="partnerList" class="partner-grid"></div><h2>Post a partner request</h2><p>Describe what you need and what your organization can offer. New requests go to our private review queue.</p><form id="partnerForm"><label>Organization<input name="organization" required maxlength="180"></label><label>Request title<input name="title" required maxlength="180" placeholder="Looking for a venue for an AI workshop"></label><label>Partner type<select name="category">${categories.map(x=>`<option>${x}</option>`).join('')}</select></label><label>What are you looking for, and what can you offer?<textarea name="description" required maxlength="2000" rows="4"></textarea></label><label>Event date (optional)<input name="event_date" type="date"></label><label>Request closing date<input name="expires_on" type="date" required></label><label>Public contact page<input name="contact_url" type="url" required maxlength="1000" placeholder="https://your-organization.org/contact"><small>This link appears publicly after approval. Use your organization's website or LinkedIn page.</small></label><label>Private contact email (optional)<input name="contact_email" type="email" maxlength="254"><small>Only the review team receives this email. It is not published.</small></label><button type="submit">Submit partner request</button><p id="partnerStatus" role="status" aria-live="polite"></p></form></div>`;
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  el.querySelectorAll('input[type=date]').forEach(x=>x.min=today);
  const close=el.querySelector('[name=expires_on]');close.max=new Date(Date.now()+180*864e5).toISOString().slice(0,10);close.value=new Date(Date.now()+30*864e5).toISOString().slice(0,10);
  document.getElementById('partnerFilter').addEventListener('change',ev=>{filter=ev.target.value;list()});
  load();
 }
 document.addEventListener('click',ev=>{if(ev.target.closest('[data-reload-partners]'))load()});
 document.addEventListener('submit',async ev=>{
  if(ev.target.id!=='partnerForm')return;ev.preventDefault();
  const button=ev.target.querySelector('[type=submit]'),status=document.getElementById('partnerStatus');if(button.disabled)return;
  button.disabled=true;status.textContent='Sending your request for review…';
  try{
   const identity=localStorage.getItem('canopy-community-id');if(!identity)throw Error('Enable browser storage before submitting.');
   const payload=Object.fromEntries(new FormData(ev.target));
   const response=await fetch('/api/partners',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${identity}`},body:JSON.stringify(payload)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Could not submit your request.');
   ev.target.reset();status.textContent=`Received for review. Your request is not public yet. Reference: ${result.id.slice(0,12)}. ${result.notification==='sent'?'The review team has been notified.':'The review team can find your request in the shared queue.'}`;
  }catch(error){status.textContent=error.message||'Could not submit. Please try again.'}finally{button.disabled=false}
 });
 return {render};
})();
window.Collaboration=Collaboration;
