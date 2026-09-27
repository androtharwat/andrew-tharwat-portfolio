(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const DEVICE_KEY='andrew_portfolio_device_v2';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let device=null,sb=null,poll=null,apps=[],selectedId=new URLSearchParams(location.search).get('application'),filter='all',query='',decisionId=null;

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const fmtDate=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const values=v=>Array.isArray(v)?v.filter(Boolean):[];
  const statusLabel=v=>String(v||'new').replaceAll('_',' ').toUpperCase();

  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
  function randomSecret(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
  function randomCode(){const v=new Uint32Array(1);crypto.getRandomValues(v);return String(v[0]%1000000).padStart(6,'0')}
  async function sha256hex(value){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  function makeClient(d){return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}

  function showTrust(message='This browser needs one-time approval before Team Operations can open.'){
    $('#gate-message').textContent=message;$('#trust-start').classList.remove('hidden');$('#pairing-box').classList.add('hidden')
  }
  function showPending(code){$('#trust-start').classList.add('hidden');$('#pairing-box').classList.remove('hidden');$('#pairing-code').textContent=code||'------';$('#gate-message').textContent='Waiting for Trusted Device approval.';startPolling()}
  function startPolling(){if(!poll)poll=setInterval(checkDevice,3000)}
  function stopPolling(){if(poll)clearInterval(poll);poll=null}
  async function checkDevice(){
    if(!device?.id||!device?.secret||!sb)return false;
    const {data,error}=await sb.from('portfolio_trusted_devices').select('status,claim_code').eq('device_id',device.id).maybeSingle();
    if(error||!data)return false;
    if(data.status==='approved'){stopPolling();await enterApp();return true}
    if(data.status==='pending'){showPending(data.claim_code);return false}
    localStorage.removeItem(DEVICE_KEY);device=null;sb=null;stopPolling();showTrust('This device is no longer approved. Create a new approval request.');return false
  }
  async function initSecurity(){
    if(!cfg||!window.supabase){$('#gate-message').textContent='ATS configuration could not load.';return}
    try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch{device=null}
    if(!device?.id||!device?.secret)return showTrust();
    sb=makeClient(device);const ok=await checkDevice();if(!ok&&!poll)showTrust()
  }

  $('#trust-device').addEventListener('click',async()=>{
    const b=$('#trust-device');b.disabled=true;b.textContent='CREATING APPROVAL…';
    try{
      device={id:crypto.randomUUID(),secret:randomSecret(),code:randomCode()};sb=makeClient(device);
      const secretHash=await sha256hex(device.secret);
      const {error}=await sb.from('portfolio_trusted_devices').insert({device_id:device.id,secret_hash:secretHash,claim_code:device.code,label:`ATS Team Operations · ${location.hostname}`,status:'pending'});
      if(error)throw error;
      localStorage.setItem(DEVICE_KEY,JSON.stringify(device));showPending(device.code)
    }catch(e){toast(e.message||'Could not create device approval');device=null;sb=null}
    finally{b.disabled=false;b.textContent='TRUST THIS BROWSER'}
  });

  async function enterApp(){
    $('#gate').classList.add('hidden');$('#team-app').classList.remove('hidden');await loadApplications()
  }

  async function loadApplications(){
    $('#refresh-apps').disabled=true;
    try{
      const {data,error}=await sb.from('studio_team_applications').select('*').order('created_at',{ascending:false});
      if(error)throw error;apps=data||[];
      if(selectedId&&!apps.some(x=>x.id===selectedId))selectedId=null;
      render()
    }catch(e){console.error(e);toast('Could not load team applications')}
    finally{$('#refresh-apps').disabled=false}
  }

  function counts(status){return apps.filter(x=>x.status===status).length}
  function currentRows(){
    const q=query.toLowerCase();
    return apps.filter(a=>(filter==='all'||a.status===filter)&&(!q||[
      a.full_name,a.email,a.primary_specialty,a.city_country,...values(a.skill_domains),...values(a.additional_skills)
    ].filter(Boolean).join(' ').toLowerCase().includes(q)))
  }

  function render(){
    ['new','reviewing','shortlisted','accepted','rejected'].forEach(s=>{$('#kpi-'+s).textContent=counts(s)});
    $('#nav-new-count').textContent=counts('new');
    $$('#status-filters [data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
    const rows=currentRows();$('#list-count').textContent=rows.length;
    $('#list-title').textContent=filter==='all'?'All applications':statusLabel(filter);
    $('#application-list').innerHTML=rows.length?rows.map(a=>`<button class="applicant-row ${selectedId===a.id?'active':''}" type="button" data-app-id="${a.id}">
      <div><b>${esc(a.full_name)}</b><span class="specialty">${esc(a.primary_specialty)}</span></div>
      <span class="status-pill status-${esc(a.status)}">${esc(statusLabel(a.status))}</span>
      <div class="meta"><span>${esc(a.application_code)}</span><span>${esc(fmtDate(a.created_at))}</span></div>
    </button>`).join(''):'<div class="empty-list"><div><h3>No applications here.</h3><p>Try another filter or search.</p></div></div>';
    renderDetail()
  }

  function renderDetail(){
    const a=apps.find(x=>x.id===selectedId);
    if(!a){$('#application-detail').innerHTML='<div class="empty-detail"><div><span>◎</span><h2>Select an application</h2><p>Open an applicant to review skills, proof of work, availability and the signed ATS Team Policy.</p></div></div>';return}
    const safeUrl=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
    const links=[
      ['Portfolio',a.portfolio_url],['LinkedIn',a.linkedin_url],['GitHub',a.github_url],['Website',a.website_url]
    ].map(([n,u])=>[n,safeUrl(u)]).filter(x=>x[1]);
    const actions=[];
    if(a.status==='new')actions.push('<button class="button button-secondary" data-action="reviewing">START REVIEW</button>');
    if(['new','reviewing'].includes(a.status))actions.push('<button class="button button-secondary" data-action="shortlisted">SHORTLIST</button>');
    if(['new','reviewing','shortlisted'].includes(a.status))actions.push('<button class="button button-primary" data-action="accept">ACCEPT TO ATS</button><button class="button button-danger" data-action="reject">REJECT</button>');
    $('#application-detail').innerHTML=`<div class="detail-shell">
      <div class="detail-hero">
        <div><span class="detail-code">${esc(a.application_code)}</span><h2>${esc(a.full_name)}</h2><p>${esc(a.primary_specialty)} · ${esc(a.city_country||'Location not supplied')}</p></div>
        <div class="detail-actions">${actions.join('')}<span class="status-pill status-${esc(a.status)}">${esc(statusLabel(a.status))}</span></div>
      </div>

      ${a.status==='accepted'?'<div class="accepted-note"><b>ATS MEMBER CREATED</b><br>Application converted to the live Team Engine. Member ID: '+esc(a.accepted_member_id||'—')+'. The member signs in with the approved application email. First verified login links the account automatically.</div>':''}

      <div class="detail-actions">${a.accepted_member_id?'<a class="button button-primary" href="/admin/team-tasks?member='+encodeURIComponent(a.accepted_member_id)+'#team">OPEN MEMBER & TASKS</a>':''}<a class="button button-secondary" href="/team-v9/">MEMBER LOGIN</a><a class="button button-secondary" href="/team-policy/">TEAM POLICY</a></div>
      <div class="detail-grid">
        <div class="info-card"><small>EMAIL</small><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></div>
        <div class="info-card"><small>PHONE / WHATSAPP</small><b>${esc(a.phone||'—')}</b></div>
        <div class="info-card"><small>EXPERIENCE</small><b>${a.years_experience==null?'—':esc(a.years_experience+' years')}</b></div>
        <div class="info-card"><small>CAPABILITY LEVEL</small><b>${esc(a.capability_level||'—')}</b></div>
        <div class="info-card"><small>WEEKLY AVAILABILITY</small><b>${esc(a.weekly_availability||'—')}</b></div>
        <div class="info-card"><small>ENGLISH</small><b>${esc(a.english_level||'—')}</b></div>
        <div class="info-card wide"><small>TOOLS</small><b>${esc(a.tools||'—')}</b></div>
      </div>

      <div class="detail-block"><h3>DECLARED SKILLS</h3><div class="chipset">${[...values(a.skill_domains),...values(a.additional_skills)].map(x=>'<span>'+esc(x)+'</span>').join('')||'<span>None recorded</span>'}</div></div>
      <div class="detail-block"><h3>WORK PREFERENCES</h3><div class="chipset">${values(a.work_preferences).map(x=>'<span>'+esc(x)+'</span>').join('')||'<span>Not specified</span>'}</div></div>
      <div class="detail-block"><h3>PREFERRED TIMES</h3><div class="chipset">${values(a.preferred_work_times).map(x=>'<span>'+esc(x)+'</span>').join('')||'<span>Not specified</span>'}</div></div>

      <div class="detail-block"><h3>WORK PROOF</h3><div class="proof-links">${links.length?links.map(([n,u])=>'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(n)+' ↗</a>').join(''):'<span class="status-pill">NO LINKS SUPPLIED</span>'}</div></div>

      ${a.note?'<div class="detail-block"><h3>APPLICANT NOTE</h3><div class="info-card wide"><b>'+esc(a.note)+'</b></div></div>':''}
      ${a.admin_notes?'<div class="detail-block"><h3>ADMIN NOTES</h3><div class="info-card wide"><b>'+esc(a.admin_notes)+'</b></div></div>':''}

      <div class="detail-block"><h3>POLICY ACKNOWLEDGEMENT</h3><div class="policy-proof">
        <strong>✓ Policy accepted · ${esc(a.policy_version)}</strong>
        <span>Accepted: ${esc(fmtDate(a.policy_accepted_at))}</span>
        <span>Digital signature: <b>${esc(a.digital_signature)}</b></span>
      </div></div>
    </div>`;
  }

  async function decide(action,note=null,options={}){
    const id=selectedId;if(!id)return;
    const rpcName=action==='accepted'?'studio_admin_accept_team_application_v2':'studio_admin_decide_team_application';
    const args=action==='accepted'?{
      p_application_id:id,p_admin_notes:note||null,
      p_member_type:options.memberType||'contributor',
      p_capacity:options.capacity||2,
      p_can_claim:options.canClaim!==false
    }:{
      p_application_id:id,p_action:action,p_admin_notes:note||null,
      p_member_type:options.memberType||'contributor',
      p_capacity:options.capacity||2,
      p_can_claim:options.canClaim!==false
    };
    const {data,error}=await sb.rpc(rpcName,args);
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    toast(action==='accepted'?'Member created in ATS Team Engine':`Application → ${statusLabel(action)}`);
    await loadApplications();
    if(row?.application_id)selectedId=row.application_id;
    render()
  }

  document.addEventListener('click',async e=>{
    const row=e.target.closest('[data-app-id]');
    if(row){selectedId=row.dataset.appId;render();return}
    const f=e.target.closest('[data-filter]');
    if(f){filter=f.dataset.filter;render();return}
    const a=e.target.closest('[data-action]');
    if(!a)return;
    const app=apps.find(x=>x.id===selectedId);if(!app)return;
    try{
      if(a.dataset.action==='accept'){decisionId=app.id;$('#accept-name').textContent=app.full_name;$('#accept-capacity').value='2';$('#accept-member-type').value='contributor';$('#accept-can-claim').checked=true;$('#accept-note').value='';const err=$('#accept-error');if(err){err.hidden=true;err.textContent=''}$('#accept-dialog').showModal();return}
      if(a.dataset.action==='reject'){decisionId=app.id;$('#reject-name').textContent=app.full_name;$('#reject-note').value='';$('#reject-dialog').showModal();return}
      a.disabled=true;await decide(a.dataset.action);a.disabled=false
    }catch(err){console.error(err);toast(err.message||'Action failed')}
  });

  $('#confirm-accept').addEventListener('click',async()=>{
    selectedId=decisionId;
    const b=$('#confirm-accept');b.disabled=true;b.textContent='CREATING MEMBER…';
    try{
      await decide('accepted',$('#accept-note').value.trim()||null,{
        memberType:$('#accept-member-type').value,
        capacity:Number($('#accept-capacity').value||2),
        canClaim:$('#accept-can-claim').checked
      });
      $('#accept-dialog').close()
    }catch(e){console.error(e);const err=$('#accept-error');if(err){err.textContent=e.message||'Could not accept application';err.hidden=false}else{toast(e.message||'Could not accept application')}}
    finally{b.disabled=false;b.textContent='ACCEPT & CREATE MEMBER'}
  });

  $('#confirm-reject').addEventListener('click',async()=>{
    const note=$('#reject-note').value.trim();if(!note)return toast('Add a reason before rejecting');
    selectedId=decisionId;
    const b=$('#confirm-reject');b.disabled=true;b.textContent='CLOSING…';
    try{await decide('rejected',note);$('#reject-dialog').close()}
    catch(e){console.error(e);toast(e.message||'Could not reject application')}
    finally{b.disabled=false;b.textContent='REJECT APPLICATION'}
  });

  $('#application-search').addEventListener('input',e=>{query=e.target.value.trim();render()});
  $('#refresh-apps').addEventListener('click',loadApplications);
  initSecurity().catch(e=>{console.error(e);$('#gate-message').textContent='Unable to open Team Operations. '+e.message});
})();