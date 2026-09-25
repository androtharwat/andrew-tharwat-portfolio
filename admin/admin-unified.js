
(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const money=v=>new Intl.NumberFormat('en-US').format(Number(v||0));
  const fmt=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';
  const state={booted:false,loaded:{},leads:[],clients:[],projects:[],proposals:[],payments:[],portfolio:[],v9:null,currentLead:null,currentProposal:null,currentProject:null};
  const roleNames={hse:'HSE & TECHNICAL',software:'SOFTWARE & AUTOMATION',design:'DESIGN & VISUAL',video:'VIDEO & MOTION',content:'CONTENT & STORYTELLING',ai:'AI PRODUCTION'};
  const briefNames={goal:'CHALLENGE & OUTCOME',type:'STARTING POINT',team:'POSSIBLE EXPERTISE',scope:'SCOPE & TIMING',contact:'CONTACT'};
  const defaultLayout={work:{columns:3,order:[],sizes:{},hidden:[]},team:{founderWidth:38,order:['hse','software','design','video','content','ai'],hidden:[]},brief:{order:['goal','type','team','scope','contact'],hidden:[]}};

  function sb(){return window.ATS_ADMIN?.getClient?.()||null}
  function notify(msg,type='success'){window.ATS_ADMIN?.notify?.(msg,type)}
  function chip(v){const x=String(v||'unknown').toLowerCase().replace(/\s+/g,'_');return '<span class="status-chip '+esc(x)+'">'+esc(String(v||'unknown').replaceAll('_',' '))+'</span>'}
  function loading(id){const el=$(id);if(el)el.innerHTML='<div class="loading-line">Loading live data…</div>'}
  function clientName(id){const c=state.clients.find(x=>x.id===id);return c?.full_name||c?.client_code||'—'}
  function leadName(id){const l=state.leads.find(x=>x.id===id);return l?.full_name||l?.lead_code||'—'}

  async function boot(){
    if(state.booted||!sb())return;
    state.booted=true;
    await loadDashboard(true);
    const hash=location.hash.replace(/^#/,'');
    if(hash&&['leads','clients','studio-projects','proposals','payments','v9'].includes(hash)){
      window.ATS_ADMIN?.switchTab?.(hash);
      loadPanel(hash,true);
    }
  }

  async function count(table,mutate){
    let q=sb().from(table).select('id',{count:'exact',head:true});
    if(mutate)q=mutate(q);
    const r=await q;
    if(r.error)throw r.error;
    return r.count||0;
  }

  async function loadDashboard(force=false){
    if(state.loaded.dashboard&&!force)return;
    loading('#ops-priority-list');
    try{
      const [newLeads,clients,projects,payments,sentProposals,latestLeads,pendingPayments]=await Promise.all([
        count('studio_leads',q=>q.eq('status','new')),
        count('studio_clients',q=>q.eq('status','active')),
        count('studio_projects',q=>q.neq('status','completed')),
        count('studio_payments',q=>q.eq('status','pending')),
        count('studio_proposals',q=>q.eq('status','sent')),
        sb().from('studio_leads').select('id,lead_code,full_name,company_name,service,status,created_at').order('created_at',{ascending:false}).limit(5),
        sb().from('studio_payments').select('id,payment_code,payment_type,amount,currency,status,due_date').eq('status','pending').order('due_date',{ascending:true}).limit(4)
      ]);
      [latestLeads,pendingPayments].forEach(r=>{if(r.error)throw r.error});
      $('#ops-m-leads').textContent=newLeads;
      $('#ops-m-clients').textContent=clients;
      $('#ops-m-projects').textContent=projects;
      $('#ops-m-payments').textContent=payments;
      $('#ops-m-proposals').textContent=sentProposals;
      const items=[];
      (latestLeads.data||[]).filter(x=>x.status==='new').forEach(x=>items.push({type:'lead',id:x.id,title:'Review new lead',detail:(x.lead_code||'Lead')+' · '+(x.full_name||'Unknown'),meta:x.service||'New enquiry'}));
      (pendingPayments.data||[]).forEach(x=>items.push({type:'payment',id:x.id,title:'Pending payment',detail:(x.payment_code||'Payment')+' · '+(x.currency||'EGP')+' '+money(x.amount),meta:x.due_date?'Due '+fmt(x.due_date):'Pending'}));
      $('#ops-priority-list').innerHTML=items.length?items.slice(0,6).map(x=>'<div class="ops-priority-item"><i class="ops-dot"></i><div><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></div><button class="row-action" data-jump="'+esc(x.type==='lead'?'leads':'payments')+'">OPEN →</button></div>').join(''):'<div class="ops-empty">Nothing needs immediate attention.</div>';
      $('#ops-latest-list').innerHTML=(latestLeads.data||[]).map(x=>'<div class="entity-row"><b>'+esc(x.full_name||'Unnamed lead')+'</b><small>'+esc((x.lead_code||'—')+' · '+(x.company_name||'Individual')+' · '+(x.service||'Not specified'))+'</small><div>'+chip(x.status)+'</div></div>').join('')||'<div class="ops-empty">No leads yet.</div>';
      state.loaded.dashboard=true;
    }catch(e){$('#ops-priority-list').innerHTML='<div class="ops-empty">Could not load operations dashboard.</div>';notify(e.message||'Dashboard load failed','error')}
  }

  async function loadLeads(force=false){
    if(state.loaded.leads&&!force){renderLeads();return}
    loading('#ops-leads-list');
    const r=await sb().from('studio_leads').select('*').order('created_at',{ascending:false}).limit(250);
    if(r.error)return notify(r.error.message,'error');
    state.leads=r.data||[];state.loaded.leads=true;renderLeads();
  }
  function renderLeads(){
    const q=($('#ops-lead-search')?.value||'').trim().toLowerCase(), f=$('#ops-lead-filter')?.value||'all';
    const rows=state.leads.filter(x=>(f==='all'||x.status===f)&&(!q||[x.lead_code,x.full_name,x.company_name,x.email,x.phone,x.service].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-leads-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>LEAD</th><th>SERVICE</th><th>TIMELINE</th><th>STATUS</th><th>RECEIVED</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="entity-title"><b>'+esc(x.full_name||'Unnamed')+'</b><small>'+esc((x.lead_code||'—')+' · '+(x.company_name||'Individual'))+'</small></div></td><td>'+esc(x.service||'—')+'</td><td>'+esc(x.timeline||'—')+'</td><td>'+chip(x.status)+'</td><td>'+esc(fmt(x.created_at))+'</td><td><div class="row-actions"><button class="row-action primary-action" data-open-lead="'+esc(x.id)+'">OPEN</button></div></td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No matching leads.</div>';
  }

  async function loadClients(force=false){
    if(state.loaded.clients&&!force){renderClients();return}
    loading('#ops-clients-list');
    const r=await sb().from('studio_clients').select('*').order('created_at',{ascending:false}).limit(250);
    if(r.error)return notify(r.error.message,'error');
    state.clients=r.data||[];state.loaded.clients=true;renderClients();
  }
  function renderClients(){
    const q=($('#ops-client-search')?.value||'').trim().toLowerCase();
    const rows=state.clients.filter(x=>!q||[x.client_code,x.full_name,x.email,x.phone].some(v=>String(v||'').toLowerCase().includes(q)));
    $('#ops-clients-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>CLIENT</th><th>EMAIL</th><th>PHONE</th><th>STATUS</th><th>SINCE</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="entity-title"><b>'+esc(x.full_name||'Client')+'</b><small>'+esc(x.client_code||'—')+'</small></div></td><td>'+esc(x.email||'—')+'</td><td>'+esc(x.phone||'—')+'</td><td>'+chip(x.status)+'</td><td>'+esc(fmt(x.created_at))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No clients yet.</div>';
  }

  async function loadProjects(force=false){
    if(state.loaded['studio-projects']&&!force){renderProjects();return}
    loading('#ops-projects-list');
    const [p,c]=await Promise.all([
      sb().from('studio_projects').select('*').order('created_at',{ascending:false}).limit(250),
      sb().from('studio_clients').select('*').order('created_at',{ascending:false}).limit(250)
    ]);
    if(p.error||c.error)return notify((p.error||c.error).message,'error');
    state.projects=p.data||[];state.clients=c.data||[];state.loaded.clients=true;state.loaded['studio-projects']=true;renderProjects();
  }
  function renderProjects(){
    const q=($('#ops-project-search')?.value||'').trim().toLowerCase(),f=$('#ops-project-filter')?.value||'all';
    const rows=state.projects.filter(x=>(f==='all'||x.status===f)&&(!q||[x.project_code,x.title,x.service_type,clientName(x.client_id),x.stage].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-projects-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>PROJECT</th><th>CLIENT</th><th>STAGE</th><th>PROGRESS</th><th>DUE</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="entity-title"><b>'+esc(x.title||'Project')+'</b><small>'+esc(x.project_code||'—')+'</small></div></td><td>'+esc(clientName(x.client_id))+'</td><td>'+chip(x.stage||x.status)+'</td><td>'+esc(String(x.progress||0))+'%</td><td>'+esc(fmt(x.due_date))+'</td><td><div class="row-actions"><button class="row-action primary-action" data-open-studio-project="'+esc(x.id)+'">OPEN</button></div></td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No client projects yet.</div>';
  }

  async function loadProposals(force=false){
    if(state.loaded.proposals&&!force){renderProposals();return}
    loading('#ops-proposals-list');
    const [p,l]=await Promise.all([
      sb().from('studio_proposals').select('*').order('created_at',{ascending:false}).limit(250),
      sb().from('studio_leads').select('*').order('created_at',{ascending:false}).limit(250)
    ]);
    if(p.error||l.error)return notify((p.error||l.error).message,'error');
    state.proposals=p.data||[];state.leads=l.data||[];state.loaded.leads=true;state.loaded.proposals=true;renderProposals();
  }
  function renderProposals(){
    const q=($('#ops-proposal-search')?.value||'').trim().toLowerCase(),f=$('#ops-proposal-filter')?.value||'all';
    const rows=state.proposals.filter(x=>(f==='all'||x.status===f)&&(!q||[x.proposal_code,x.title,leadName(x.lead_id)].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-proposals-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>PROPOSAL</th><th>CLIENT / LEAD</th><th>TOTAL</th><th>DEPOSIT</th><th>STATUS</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="entity-title"><b>'+esc(x.title||'Proposal')+'</b><small>'+esc(x.proposal_code||'Draft')+'</small></div></td><td>'+esc(leadName(x.lead_id))+'</td><td>'+esc(x.currency||'EGP')+' '+money(x.total_amount)+'</td><td>'+esc(String(Number(x.deposit_percent||0)))+'%</td><td>'+chip(x.status)+'</td><td><div class="row-actions"><button class="row-action" data-open-proposal="'+esc(x.id)+'">EDIT</button>'+(x.status==='sent'?'<button class="row-action primary-action" data-accept-proposal="'+esc(x.id)+'">ACCEPT</button>':'')+'</div></td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No proposals yet.</div>';
  }

  async function loadPayments(force=false){
    if(state.loaded.payments&&!force){renderPayments();return}
    loading('#ops-payments-list');
    const r=await sb().from('studio_payments').select('*').order('created_at',{ascending:false}).limit(250);
    if(r.error)return notify(r.error.message,'error');
    state.payments=r.data||[];state.loaded.payments=true;renderPayments();
  }
  function renderPayments(){
    const q=($('#ops-payment-search')?.value||'').trim().toLowerCase(),f=$('#ops-payment-filter')?.value||'all';
    const rows=state.payments.filter(x=>(f==='all'||x.status===f)&&(!q||[x.payment_code,x.payment_type,x.reference].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-payments-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>PAYMENT</th><th>TYPE</th><th>AMOUNT</th><th>DUE</th><th>STATUS</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr><td><div class="entity-title"><b>'+esc(x.payment_code||'Payment')+'</b><small>'+esc(x.reference||'—')+'</small></div></td><td>'+esc(x.payment_type||'—')+'</td><td>'+esc(x.currency||'EGP')+' '+money(x.amount)+'</td><td>'+esc(fmt(x.due_date))+'</td><td>'+chip(x.status)+'</td><td><div class="row-actions">'+(x.status==='pending'?'<button class="row-action primary-action" data-mark-paid="'+esc(x.id)+'">MARK PAID</button>':'')+'</div></td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No payments yet.</div>';
  }

  function clone(v){return JSON.parse(JSON.stringify(v))}
  function mergeLayout(raw){
    const d=clone(defaultLayout),r=raw||{};
    d.work={...d.work,...(r.work||{}),sizes:{...(r.work?.sizes||{})}};
    d.team={...d.team,...(r.team||{})};
    d.brief={...d.brief,...(r.brief||{})};
    return d;
  }
  async function loadV9(force=false){
    if(state.loaded.v9&&!force){renderV9();return}
    loading('#v9-work-list');
    const [p,s]=await Promise.all([
      sb().from('portfolio_projects').select('id,title,title_ar,slug,status,featured,sort_order,portfolio_categories(name)').eq('status','published').order('sort_order',{ascending:true}),
      sb().from('portfolio_site_settings').select('value').eq('key','v9_layout').maybeSingle()
    ]);
    if(p.error||s.error)return notify((p.error||s.error).message,'error');
    state.portfolio=p.data||[];state.v9=mergeLayout(s.data?.value);
    const slugs=state.portfolio.map(x=>x.slug);
    state.v9.work.order=[...(state.v9.work.order||[]).filter(x=>slugs.includes(x)),...slugs.filter(x=>!(state.v9.work.order||[]).includes(x))];
    state.v9.work.hidden=(state.v9.work.hidden||[]).filter(x=>slugs.includes(x));
    state.loaded.v9=true;renderV9();
  }
  function renderV9(){
    if(!state.v9)return;
    $('#v9-work-columns').value=String(state.v9.work.columns||3);
    $('#v9-founder-width').value=String(state.v9.team.founderWidth||38);
    const map=new Map(state.portfolio.map(x=>[x.slug,x]));
    $('#v9-work-list').innerHTML=state.v9.work.order.map((slug,i)=>{const p=map.get(slug);if(!p)return'';const hidden=state.v9.work.hidden.includes(slug),size=state.v9.work.sizes?.[slug]||'normal';return '<div class="v9-row '+(hidden?'hidden-item':'')+'"><button data-v9-up="work:'+esc(slug)+'">↑</button><div><b>'+String(i+1).padStart(2,'0')+' · '+esc(p.title)+'</b><small>/'+esc(slug)+'</small></div><select data-v9-size="'+esc(slug)+'"><option value="compact" '+(size==='compact'?'selected':'')+'>S</option><option value="normal" '+(size==='normal'?'selected':'')+'>M</option><option value="wide" '+(size==='wide'?'selected':'')+'>WIDE</option><option value="large" '+(size==='large'?'selected':'')+'>XL</option></select><button data-v9-toggle="work:'+esc(slug)+'">'+(hidden?'○':'●')+'</button></div>'}).join('');
    $('#v9-team-list').innerHTML=(state.v9.team.order||[]).map((k,i)=>{const hidden=(state.v9.team.hidden||[]).includes(k);return '<div class="v9-row '+(hidden?'hidden-item':'')+'"><button data-v9-up="team:'+esc(k)+'">↑</button><div><b>'+String(i+1).padStart(2,'0')+' · '+esc(roleNames[k]||k)+'</b><small>'+esc(k)+'</small></div><span></span><button data-v9-toggle="team:'+esc(k)+'">'+(hidden?'○':'●')+'</button></div>'}).join('');
    $('#v9-brief-list').innerHTML=(state.v9.brief.order||[]).map((k,i)=>{const hidden=(state.v9.brief.hidden||[]).includes(k);return '<div class="v9-row '+(hidden?'hidden-item':'')+'"><button data-v9-up="brief:'+esc(k)+'">↑</button><div><b>'+String(i+1).padStart(2,'0')+' · '+esc(briefNames[k]||k)+'</b><small>'+esc(k)+'</small></div><span></span><button data-v9-toggle="brief:'+esc(k)+'">'+(hidden?'○':'●')+'</button></div>'}).join('');
  }
  function arrFor(kind){return kind==='work'?state.v9.work.order:kind==='team'?state.v9.team.order:state.v9.brief.order}
  function hiddenFor(kind){return kind==='work'?state.v9.work.hidden:kind==='team'?state.v9.team.hidden:state.v9.brief.hidden}

  async function loadPanel(tab,force=false){
    if(tab==='dashboard')return loadDashboard(force);
    if(tab==='leads')return loadLeads(force);
    if(tab==='clients')return loadClients(force);
    if(tab==='studio-projects')return loadProjects(force);
    if(tab==='proposals')return loadProposals(force);
    if(tab==='payments')return loadPayments(force);
    if(tab==='v9')return loadV9(force);
  }

  function openLead(id){
    const x=state.leads.find(v=>v.id===id);if(!x)return;
    state.currentLead=x;
    $('#lead-dialog-title').textContent=x.full_name||'Lead';
    $('#lead-dialog-code').textContent=x.lead_code||'—';
    $('#lead-dialog-summary').innerHTML=[
      ['Email',x.email],['Phone / WhatsApp',x.phone],['Company',x.company_name||'Individual'],
      ['Service',x.service],['Timeline',x.timeline],['Budget',x.budget_range]
    ].map(v=>'<div><span>'+esc(v[0].toUpperCase())+'</span><b>'+esc(v[1]||'—')+'</b></div>').join('');
    $('#lead-goal').textContent=x.project_goal||'No project goal recorded.';
    $('#lead-assets').textContent=(x.current_assets||[]).join(' · ')||'No assets listed.';
    $('#lead-status').value=x.status||'new';
    $('#lead-fit').value=x.fit||'';
    $('#lead-notes').value=x.internal_notes||'';
    $('#lead-lost-reason').value=x.lost_reason||'';
    const mail=$('#lead-email-link');mail.href=x.email?'mailto:'+encodeURIComponent(x.email):'#';mail.classList.toggle('hidden',!x.email);
    const wa=$('#lead-wa-link');const digits=String(x.phone||'').replace(/\D/g,'');wa.href=digits?'https://wa.me/'+digits:'#';wa.classList.toggle('hidden',!digits);
    $('#lead-dialog').showModal();
  }
  async function saveLead(){
    const x=state.currentLead;if(!x)return;
    const patch={status:$('#lead-status').value,fit:$('#lead-fit').value||null,internal_notes:$('#lead-notes').value.trim()||null,lost_reason:$('#lead-lost-reason').value.trim()||null};
    const r=await sb().from('studio_leads').update(patch).eq('id',x.id).select('*').single();
    if(r.error)return notify(r.error.message,'error');
    const i=state.leads.findIndex(v=>v.id===x.id);if(i>=0)state.leads[i]=r.data;state.currentLead=r.data;
    notify('Lead updated');renderLeads();state.loaded.dashboard=false;loadDashboard(true);$('#lead-dialog').close();
  }

  function fillLeadOptions(selectId,selected){
    const sel=$(selectId);if(!sel)return;
    sel.innerHTML='<option value="">Select lead</option>'+state.leads.filter(x=>!['lost','won'].includes(x.status)).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc((x.lead_code||'Lead')+' · '+(x.full_name||'Unnamed'))+'</option>').join('');
  }
  function openProposal(id=null,leadId=null){
    state.currentProposal=id?state.proposals.find(x=>x.id===id):null;
    fillLeadOptions('#proposal-lead',state.currentProposal?.lead_id||leadId||'');
    const p=state.currentProposal||{};
    $('#proposal-dialog-title').textContent=id?'Edit Proposal':'New Proposal';
    $('#proposal-title').value=p.title||'';
    $('#proposal-scope').value=p.scope||'';
    $('#proposal-deliverables').value=(p.deliverables||[]).join('\n');
    $('#proposal-timeline').value=p.timeline_text||'';
    $('#proposal-revisions').value=p.revision_limit??2;
    $('#proposal-total').value=p.total_amount??'';
    $('#proposal-deposit').value=p.deposit_percent??50;
    $('#proposal-valid').value=p.valid_until||'';
    $('#proposal-terms').value=p.terms||'';
    $('#proposal-status').value=p.status||'draft';
    $('#proposal-dialog').showModal();
  }
  async function saveProposal(){
    const leadId=$('#proposal-lead').value;if(!leadId)return notify('Select a lead','error');
    const status=$('#proposal-status').value;
    const payload={
      lead_id:leadId,title:$('#proposal-title').value.trim(),scope:$('#proposal-scope').value.trim(),
      deliverables:$('#proposal-deliverables').value.split('\n').map(x=>x.trim()).filter(Boolean),
      timeline_text:$('#proposal-timeline').value.trim(),revision_limit:Number($('#proposal-revisions').value||0),
      total_amount:Number($('#proposal-total').value||0),currency:'EGP',deposit_percent:Number($('#proposal-deposit').value||0),
      valid_until:$('#proposal-valid').value||null,terms:$('#proposal-terms').value.trim(),status,
      sent_at:status==='sent'?(state.currentProposal?.sent_at||new Date().toISOString()):state.currentProposal?.sent_at||null
    };
    if(!payload.title||!payload.scope||!payload.deliverables.length)return notify('Title, scope and deliverables are required','error');
    let r;
    if(state.currentProposal)r=await sb().from('studio_proposals').update(payload).eq('id',state.currentProposal.id).select('*').single();
    else r=await sb().from('studio_proposals').insert(payload).select('*').single();
    if(r.error)return notify(r.error.message,'error');
    if(status==='sent')await sb().from('studio_leads').update({status:'proposal_sent'}).eq('id',leadId);
    notify(status==='sent'?'Proposal saved and marked sent':'Proposal saved');
    $('#proposal-dialog').close();state.loaded.proposals=false;state.loaded.leads=false;state.loaded.dashboard=false;
    await loadProposals(true);loadDashboard(true);
  }
  async function acceptProposal(id){
    const p=state.proposals.find(x=>x.id===id);if(!p||p.status!=='sent')return;
    if(!confirm('Mark this proposal accepted and create the deposit request?'))return;
    const acceptedAt=new Date().toISOString();
    const u=await sb().from('studio_proposals').update({status:'accepted',accepted_at:acceptedAt}).eq('id',p.id);
    if(u.error)return notify(u.error.message,'error');
    const ex=await sb().from('studio_payments').select('*').eq('proposal_id',p.id).eq('payment_type','deposit').maybeSingle();
    if(ex.error)return notify(ex.error.message,'error');
    if(!ex.data){
      const amount=Number(p.total_amount||0)*Number(p.deposit_percent||0)/100;
      const ins=await sb().from('studio_payments').insert({lead_id:p.lead_id,proposal_id:p.id,payment_type:'deposit',amount,currency:p.currency||'EGP',status:'pending',due_date:new Date().toISOString().slice(0,10)});
      if(ins.error)return notify(ins.error.message,'error');
    }
    notify('Proposal accepted · deposit created');state.loaded.proposals=false;state.loaded.payments=false;state.loaded.dashboard=false;await loadProposals(true);loadDashboard(true);
  }

  function openStudioProject(id){
    const p=state.projects.find(x=>x.id===id);if(!p)return;state.currentProject=p;
    $('#studio-project-title').textContent=p.title||'Project';$('#studio-project-code').textContent=p.project_code||'—';
    $('#studio-project-client').textContent=clientName(p.client_id);
    $('#studio-project-stage').value=p.stage||'Onboarding';$('#studio-project-health').value=p.health||'On Track';
    $('#studio-project-progress').value=p.progress||0;$('#studio-project-due').value=p.due_date||'';
    $('#studio-project-client-action').value=p.client_action||'';$('#studio-project-internal-action').value=p.internal_action||'';
    $('#studio-project-update').value='';
    $('#studio-project-dialog').showModal();
  }
  async function saveStudioProject(){
    const p=state.currentProject;if(!p)return;
    const patch={stage:$('#studio-project-stage').value,health:$('#studio-project-health').value,progress:Number($('#studio-project-progress').value||0),due_date:$('#studio-project-due').value||null,client_action:$('#studio-project-client-action').value.trim()||'No action required',internal_action:$('#studio-project-internal-action').value.trim()||null};
    const r=await sb().from('studio_projects').update(patch).eq('id',p.id);
    if(r.error)return notify(r.error.message,'error');
    notify('Project updated');$('#studio-project-dialog').close();state.loaded['studio-projects']=false;state.loaded.dashboard=false;await loadProjects(true);loadDashboard(true);
  }
  async function postProjectUpdate(){
    const p=state.currentProject,text=$('#studio-project-update').value.trim();if(!p||!text)return notify('Write the client update first','error');
    const r=await sb().from('studio_project_updates').insert({project_id:p.id,title:(p.stage||'Project')+' Update',content:text,client_visible:true});
    if(r.error)return notify(r.error.message,'error');
    $('#studio-project-update').value='';notify('Client-visible update posted');
  }

  async function markPaid(id){
    const p=state.payments.find(x=>x.id===id);if(!p||p.status!=='pending')return;
    if(!confirm('Confirm this payment as paid?'))return;
    const paidAt=new Date().toISOString();
    const u=await sb().from('studio_payments').update({status:'paid',paid_at:paidAt,payment_method:'Manual confirmation'}).eq('id',p.id);
    if(u.error)return notify(u.error.message,'error');
    if(p.payment_type==='deposit'&&p.lead_id&&p.proposal_id){
      const prop=await sb().from('studio_proposals').select('*').eq('id',p.proposal_id).single();
      if(prop.error)return notify(prop.error.message,'error');
      const due=new Date();due.setDate(due.getDate()+20);
      const converted=await sb().rpc('studio_admin_convert_lead',{p_lead_id:p.lead_id,p_project_title:prop.data.title,p_due_date:due.toISOString().slice(0,10)});
      if(converted.error)return notify(converted.error.message,'error');
    }
    if(p.payment_type==='final'&&p.project_id){
      const project=await sb().from('studio_projects').select('*').eq('id',p.project_id).single();
      const paid=await sb().from('studio_payments').select('amount,status').eq('project_id',p.project_id);
      if(!project.error&&!paid.error){
        const total=(paid.data||[]).filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0);
        if(Math.max(0,Number(project.data.project_value||0)-total)<=.001)await sb().from('studio_projects').update({stage:'Deployment',progress:95,client_action:'No action required',internal_action:'Deploy and validate production'}).eq('id',p.project_id);
      }
    }
    notify('Payment confirmed');state.loaded.payments=false;state.loaded.clients=false;state.loaded['studio-projects']=false;state.loaded.dashboard=false;await loadPayments(true);loadDashboard(true);
  }

  async function saveV9(){
    if(!state.v9)return;
    state.v9.work.columns=Number($('#v9-work-columns').value||3);state.v9.team.founderWidth=Number($('#v9-founder-width').value||38);
    const r=await sb().from('portfolio_site_settings').upsert({key:'v9_layout',value:state.v9});
    if(r.error)return notify(r.error.message,'error');notify('V9 layout saved');
  }

  document.addEventListener('click',e=>{
    const jump=e.target.closest('[data-jump]');if(jump){window.ATS_ADMIN?.switchTab?.(jump.dataset.jump);loadPanel(jump.dataset.jump);return}
    const refresh=e.target.closest('[data-ops-refresh]');if(refresh){loadPanel(refresh.dataset.opsRefresh,true);return}
    const lead=e.target.closest('[data-open-lead]');if(lead){openLead(lead.dataset.openLead);return}
    const proposal=e.target.closest('[data-open-proposal]');if(proposal){openProposal(proposal.dataset.openProposal);return}
    const project=e.target.closest('[data-open-studio-project]');if(project){openStudioProject(project.dataset.openStudioProject);return}
    const accept=e.target.closest('[data-accept-proposal]');if(accept){acceptProposal(accept.dataset.acceptProposal);return}
    const paid=e.target.closest('[data-mark-paid]');if(paid){markPaid(paid.dataset.markPaid);return}
    const up=e.target.closest('[data-v9-up]');if(up&&state.v9){const [kind,key]=up.dataset.v9Up.split(':');const a=arrFor(kind),i=a.indexOf(key);if(i>0){[a[i-1],a[i]]=[a[i],a[i-1]];renderV9()}return}
    const toggle=e.target.closest('[data-v9-toggle]');if(toggle&&state.v9){const [kind,key]=toggle.dataset.v9Toggle.split(':'),h=hiddenFor(kind),i=h.indexOf(key);if(kind==='brief'&&i<0&&arrFor(kind).filter(x=>!h.includes(x)).length<=1)return notify('At least one brief step must remain visible','error');i>=0?h.splice(i,1):h.push(key);renderV9();return}
  });

  $('#ops-lead-search')?.addEventListener('input',renderLeads);$('#ops-lead-filter')?.addEventListener('change',renderLeads);
  $('#ops-client-search')?.addEventListener('input',renderClients);
  $('#ops-project-search')?.addEventListener('input',renderProjects);$('#ops-project-filter')?.addEventListener('change',renderProjects);
  $('#ops-proposal-search')?.addEventListener('input',renderProposals);$('#ops-proposal-filter')?.addEventListener('change',renderProposals);
  $('#ops-payment-search')?.addEventListener('input',renderPayments);$('#ops-payment-filter')?.addEventListener('change',renderPayments);
  $('#new-proposal')?.addEventListener('click',async()=>{await loadProposals();openProposal()});
  $('#save-lead')?.addEventListener('click',saveLead);
  $('#lead-create-proposal')?.addEventListener('click',async()=>{const id=state.currentLead?.id;$('#lead-dialog').close();await loadProposals();openProposal(null,id)});
  $('#save-proposal')?.addEventListener('click',saveProposal);
  $('#save-studio-project')?.addEventListener('click',saveStudioProject);
  $('#post-studio-project-update')?.addEventListener('click',postProjectUpdate);
  $('#save-v9-layout')?.addEventListener('click',saveV9);
  $('#v9-work-columns')?.addEventListener('change',e=>{if(state.v9)state.v9.work.columns=Number(e.target.value)});
  $('#v9-founder-width')?.addEventListener('change',e=>{if(state.v9)state.v9.team.founderWidth=Number(e.target.value)});
  document.addEventListener('change',e=>{if(e.target.matches('[data-v9-size]')&&state.v9)state.v9.work.sizes[e.target.dataset.v9Size]=e.target.value});
  $$('[data-close-unified]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeUnified)?.close()));

  $('#admin-nav')?.addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;const tab=b.dataset.tab;location.hash=tab==='dashboard'?'':tab;loadPanel(tab)});
  window.addEventListener('ats-admin-ready',boot);
  if(!$('#admin-view')?.classList.contains('hidden'))setTimeout(boot,0);
})();
