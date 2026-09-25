
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(v='')=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const fmt=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
  let sb=null,client=null,projects=[],currentProjectId=null,poll=null;
  const toast=m=>{const e=$('#portal-toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)};
  async function getContext(){
    if(!sb)return false;
    const {data:{user}}=await sb.auth.getUser();if(!user)return false;
    const c=await sb.from('studio_clients').select('*').maybeSingle();if(c.error||!c.data)return false;
    const p=await sb.from('studio_projects').select('id,project_code,title,status,created_at').order('created_at',{ascending:false});if(p.error)throw p.error;
    client=c.data;projects=p.data||[];if(!currentProjectId||!projects.some(x=>x.id===currentProjectId))currentProjectId=(projects.find(x=>x.status!=='completed')||projects[0])?.id||null;return true;
  }
  function renderProjectSelect(){const sel=$('#portal-message-project');if(!sel)return;sel.innerHTML=projects.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===currentProjectId?'selected':'')+'>'+esc((x.project_code||'Project')+' · '+(x.title||''))+'</option>').join('')}
  async function load(){
    if(location.hash!=='#messages')return;
    const root=$('#portal-message-thread');if(root)root.innerHTML='<div class="portal-card">Loading messages…</div>';
    try{
      if(!await getContext()){if(root)root.innerHTML='<div class="portal-card">No active client project is available.</div>';return}
      renderProjectSelect();if(!currentProjectId){root.innerHTML='<div class="portal-card">No project is available for messaging yet.</div>';return}
      const q=await sb.from('studio_messages').select('*').eq('project_id',currentProjectId).order('created_at',{ascending:true}).limit(200);if(q.error)throw q.error;
      root.innerHTML=(q.data||[]).length?(q.data||[]).map(x=>'<div class="portal-message '+esc(x.sender_type)+'"><b>'+(x.sender_type==='client'?'YOU':'ATS')+'</b><p>'+esc(x.body)+'</p><small>'+esc(fmt(x.created_at))+'</small></div>').join(''):'<div class="portal-card">No messages yet. Start the project conversation here.</div>';root.scrollTop=root.scrollHeight;
    }catch(e){if(root)root.innerHTML='<div class="portal-card">'+esc(e.message)+'</div>'}
  }
  async function send(){
    const body=$('#portal-message-input')?.value.trim();if(!body)return toast('Write a message first');
    if(!client||!currentProjectId){if(!await getContext())return toast('No active project');renderProjectSelect()}
    const btn=$('#portal-message-send');btn.disabled=true;btn.textContent='SENDING…';
    try{const r=await sb.from('studio_messages').insert({project_id:currentProjectId,client_id:client.id,sender_type:'client',body,is_read_by_admin:false});if(r.error)throw r.error;$('#portal-message-input').value='';toast('Message sent to ATS');await load()}catch(e){toast(e.message)}finally{btn.disabled=false;btn.textContent='SEND MESSAGE →'}
  }
  function startPoll(){clearInterval(poll);poll=setInterval(()=>{if(location.hash==='#messages')load()},12000)}
  function boot(){
    sb=window.ATS_AUTH_CLIENT?.getClient?.();if(!sb)return;
    document.addEventListener('click',e=>{const nav=e.target.closest('[data-portal-nav="messages"]');if(nav)setTimeout(()=>{load();startPoll()},100)});
    $('#portal-message-refresh')?.addEventListener('click',load);$('#portal-message-send')?.addEventListener('click',send);$('#portal-message-project')?.addEventListener('change',e=>{currentProjectId=e.target.value;load()});$('#portal-message-input')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();send()}});
    window.addEventListener('hashchange',()=>{if(location.hash==='#messages'){load();startPoll()}else{clearInterval(poll);poll=null}});if(location.hash==='#messages'){load();startPoll()}
  }
  boot();
})();