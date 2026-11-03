/* Shared RSVPs use the same-origin API. Connection notes never leave this browser. */
const Community = (() => {
  let data=null, busy=false, activeEvent=null;
  const pending=new URL(location.href).searchParams;
  const invitedEvent=pending.get('event'), ref=pending.get('invite');
  let identity;
  try {identity=localStorage.getItem('canopy-community-id');if(!identity){identity=crypto.randomUUID();localStorage.setItem('canopy-community-id',identity)}} catch {}
  let journal=store.get('canopy-connections',[]);
  if(!Array.isArray(journal)) journal=[];
  const message=text=>{const el=document.getElementById('communityMessage');el.textContent=text;el.hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>el.hidden=true,6000)};
  async function api(body) {
    if(!identity) throw new Error('Enable browser storage to use community features.');
    const response=await fetch('/api/community',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${identity}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(!response.ok) throw new Error('Community activity is unavailable. Please try again later.');
    return response.json();
  }
  const current=id=>data?.mine.find(x=>x.event===id)?.status;
  const summary=id=>{const c=data?.counts.find(x=>x.event===id);return data?`${c?.interested||0} interested · ${c?.going||0} going`:'Community counts unavailable'};
  function panel(id) {
    activeEvent=id;
    return `<section class="community-box" aria-label="Go together"><h4>Go together</h4><p data-community-count>${summary(id)}</p><small>Your response is separate from organizer registration. One response per browser; counts are community estimates.</small><div class="community-actions"><button data-response="interested" aria-pressed="${current(id)==='interested'}" ${!data?'disabled':''}>Interested</button><button data-response="going" aria-pressed="${current(id)==='going'}" ${!data?'disabled':''}>Going</button><button data-invite>Invite a friend</button><button data-log>Log a connection</button></div><div id="inviteLink" hidden></div></section>`;
  }
  function refresh() {
    document.querySelectorAll('[data-community-summary]').forEach(el=>el.textContent=summary(el.dataset.communitySummary));
    const box=document.querySelector('.community-box');
    if(box) {box.querySelector('[data-community-count]').textContent=summary(activeEvent);box.querySelectorAll('[data-response]').forEach(b=>{b.disabled=!data||busy;b.setAttribute('aria-pressed',current(activeEvent)===b.dataset.response)})}
    if(state.view==='connections') renderJournal();
  }
  async function load(){try{data=await api()}catch{data=null}refresh()}
  function saveJournal(next){try{localStorage.setItem('canopy-connections',JSON.stringify(next));journal=next;return true}catch{message('Could not save. Browser storage may be full or disabled.');return false}}
  function linkedInProfile(value) {
    const input=String(value||'').trim();
    if(!input)return '';
    let url;try{url=new URL(input)}catch{throw new Error('Enter a LinkedIn profile URL such as https://www.linkedin.com/in/name.');}
    if(url.protocol!=='https:' || !['linkedin.com','www.linkedin.com'].includes(url.hostname) || url.username || url.password || url.port || !/^\/in\/[^/]+\/?$/.test(url.pathname))throw new Error('Use an https://www.linkedin.com/in/ profile URL.');
    return 'https://www.linkedin.com'+url.pathname.replace(/\/$/,'');
  }
  function safeProfile(value){try{return linkedInProfile(value)}catch{return ''}}
  function renderJournal(selected='') {
    const root=document.getElementById('view-connections');
    const followed=journal.filter(x=>x.followed).length;
    root.innerHTML=`<div class="journal"><div class="eyebrow">Your Canopy</div><h1>Make the next connection count.</h1><p>Keep the conversations you want to continue. Names and notes stay in this browser. Clearing browser data removes them.</p><div class="journal-grid"><div class="journal-stat"><strong>${journal.length}</strong>meaningful connections</div><div class="journal-stat"><strong>${followed}</strong>follow-ups completed</div><div class="journal-stat"><strong>${data?data.joined:'—'}</strong>friends who responded to invites</div></div><div class="milestones"><span class="${journal.length?'earned':''}">${journal.length?'✓':'○'} First connection</span><span class="${journal.length>=3?'earned':''}">${journal.length>=3?'✓':'○'} Three connections</span><span class="${followed?'earned':''}">${followed?'✓':'○'} First follow-up</span><span class="${data?.joined?'earned':''}">${data?.joined?'✓':'○'} Bring a friend</span></div><label>Journey to five connections <progress value="${Math.min(journal.length,5)}" max="5">${journal.length}/5</progress></label><p><small>Log someone once when a conversation feels meaningful. Invite milestones count responses, not link shares. Browser identities are not verified people.</small></p><h2>Add a connection</h2><form id="connectionForm"><label>Name<input name="person" required maxlength="100" autocomplete="off"></label><label>LinkedIn profile (optional)<input name="linkedin" type="url" maxlength="500" placeholder="https://www.linkedin.com/in/name"><small>Paste a profile link. Saved privately here; no LinkedIn sign-in is needed.</small></label><label>Event<select name="event"><option value="">Other / not listed</option>${[...events].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<option value="${esc(e.id)}" ${e.id===selected?'selected':''}>${esc(e.date+' · '+e.title)}</option>`).join('')}</select></label><label>What made it meaningful?<textarea name="note" required maxlength="1000" rows="3" placeholder="What did you discuss? What would you like to do next?"></textarea></label><label>Follow up on (optional)<input name="followup" type="date"></label><button type="submit">Save connection</button></form><h2>Your connections</h2>${!journal.length?'<p>No connections logged yet. Start with a conversation you want to continue.</p>':journal.map(x=>`<article><h3>${esc(x.person)}</h3><small>${esc(x.eventTitle||'Other event')}</small><p>${esc(x.note)}</p>${safeProfile(x.linkedin)?`<p><a href="${esc(safeProfile(x.linkedin))}" target="_blank" rel="noopener noreferrer">View LinkedIn profile ↗</a></p>`:''}<details><summary>${x.linkedin?'Edit':'Add'} LinkedIn profile</summary><form data-profile-form="${esc(x.id)}"><label>LinkedIn profile<input name="linkedin" type="url" maxlength="500" value="${esc(safeProfile(x.linkedin))}" placeholder="https://www.linkedin.com/in/name"></label><small>Leave blank to remove the link.</small><br><button type="submit">Save LinkedIn profile</button></form></details>${x.followup?`<p>Follow up: ${esc(x.followup)}</p>`:''}<button data-follow="${esc(x.id)}" aria-pressed="${x.followed}">${x.followed?'✓ Followed up':'Mark followed up'}</button> <button data-delete-connection="${esc(x.id)}">Delete</button></article>`).join('')}</div>`;
  }
  document.addEventListener('click',async ev=>{
    const t=ev.target;
    if(t.closest('[data-response]')) {
      if(busy||!data)return;busy=true;refresh();
      const desired=t.closest('[data-response]').dataset.response,id=activeEvent;
      try{data=await api({event:id,status:current(id)===desired?'none':desired,ref:invitedEvent===id?ref:null});message('Response saved. Register with the organizer if required.')}catch(e){message(e.message)}finally{busy=false;refresh()}return;
    }
    if(t.closest('[data-invite]')) {
      const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('event',activeEvent);if(data)url.searchParams.set('invite',data.inviteCode);
      const container=document.getElementById('inviteLink');container.hidden=false;container.innerHTML=`<label>Send this event to a friend<input class="invite-field" readonly aria-label="Invitation link" value="${esc(url.href)}"></label><small>${data?'When a friend responds, your invite milestone updates.':'Event sharing works now. Invite milestones require the community service.'}</small>`;
      try{await navigator.clipboard.writeText(url.href);message('Invitation link copied.')}catch{container.querySelector('input').select();message('Copy the invitation link below.')}return;
    }
    if(t.closest('[data-log]')){const id=activeEvent;closeModal();setView('connections');renderJournal(id);document.querySelector('[name=person]').focus()}
    const follow=t.closest('[data-follow]');if(follow){if(saveJournal(journal.map(x=>x.id===follow.dataset.follow?{...x,followed:!x.followed}:x)))renderJournal()}
    const remove=t.closest('[data-delete-connection]');if(remove&&confirm('Delete this connection and its notes?')){if(saveJournal(journal.filter(x=>x.id!==remove.dataset.deleteConnection)))renderJournal()}
  });
  document.addEventListener('submit',ev=>{
    if(ev.target.matches('[data-profile-form]')) {
      ev.preventDefault();let linkedin;
      try{linkedin=linkedInProfile(new FormData(ev.target).get('linkedin'))}catch(error){message(error.message);return}
      if(saveJournal(journal.map(x=>x.id===ev.target.dataset.profileForm?{...x,linkedin}:x))){renderJournal();message('LinkedIn profile updated.')}
      return;
    }
    if(ev.target.id!=='connectionForm')return;ev.preventDefault();
    const f=new FormData(ev.target),person=f.get('person').trim(),note=f.get('note').trim(),event=f.get('event');
    if(!person||!note)return message('Add a name and a note about your conversation.');
    if(journal.some(x=>x.person.toLowerCase()===person.toLowerCase()&&x.event===event))return message('You already logged this person at this event.');
    let linkedin;try{linkedin=linkedInProfile(f.get('linkedin'))}catch(error){message(error.message);return}
    const entry={linkedin,id:crypto.randomUUID(),person,note,event,eventTitle:events.find(x=>x.id===event)?.title||'',followup:f.get('followup'),followed:false};
    if(saveJournal([entry,...journal])){renderJournal();message('Connection saved privately in this browser.')}
  });
  async function init(){await load();if(invitedEvent){const event=events.find(x=>x.id===invitedEvent);if(event)openModal(event.id);else message('This invited event is no longer listed. Explore upcoming events instead.')}}
  async function submitEvent(event) {
    if(!identity)throw new Error('Enable browser storage to submit an event.');
    const response=await fetch('/api/submissions',{method:'POST',headers:{Authorization:`Bearer ${identity}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
    let result;try{result=await response.json()}catch{throw new Error('Submissions are temporarily unavailable. Please try again.');}
    if(!response.ok)throw new Error(result.error||'Could not submit your event. Please try again.');
    return result;
  }
  return {panel,summary,renderJournal,init,submitEvent};
})();
window.canopyCommunity=Community;
Community.init();
