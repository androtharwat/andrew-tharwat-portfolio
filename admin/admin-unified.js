
(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const money=v=>window.ATS_I18N?.formatNumber?.(v)??new Intl.NumberFormat('en-US').format(Number(v||0));
  const fmt=v=>v?(window.ATS_I18N?.formatDate?.(v,{day:'2-digit',month:'short',year:'numeric'})??new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v))):'—';
  const state={booted:false,loaded:{},leads:[],clients:[],projects:[],proposals:[],payments:[],portfolio:[],v9:null,currentLead:null,currentProposal:null,currentProject:null,inbox:[],projectMessages:[],projectFiles:[],projectReviews:[],projectRevisions:[],projectDomains:[],projectTasks:[],teamMembers:[],teamSkills:[],leadActivities:[],discoveryCase:null,discoveryAnswers:[],rootCauses:[],solutionTasks:[],diagnosticRun:null,deliveryBlueprint:null,clientAccessCode:null};
  let executionCtx={};
  let inboxTimer=null;
  const roleNames={hse:'HSE & TECHNICAL',software:'SOFTWARE & AUTOMATION',design:'DESIGN & VISUAL',video:'VIDEO & MOTION',content:'CONTENT & STORYTELLING',ai:'AI PRODUCTION'};
  const briefNames={goal:'CHALLENGE & OUTCOME',type:'STARTING POINT',team:'POSSIBLE EXPERTISE',scope:'SCOPE & TIMING',contact:'CONTACT'};
  const leadStatusLabels={new:'New',contacted:'Contacted',discovery:'Discovery',reviewing:'Reviewing',qualified:'Qualified',proposal_sent:'Proposal Sent',negotiation:'Negotiation',won:'Won',lost:'Lost'};
  const discoveryDimensions=[
    ['current_state','Current situation','What is happening now?'],
    ['impact','Impact','What does the problem cause?'],
    ['evidence','Evidence / proof','What proves the problem exists?'],
    ['affected_people','People affected','Who experiences the problem?'],
    ['process_point','Where it happens','Where in the process / journey does it appear?'],
    ['prior_attempts','Previous attempts','What was already tried?'],
    ['desired_outcome','Desired outcome','What should change if solved correctly?'],
    ['constraints','Constraints','What limits must the solution respect?']
  ];
  const stageOrder=['Onboarding','Content Preparation','Design','Development','Internal QA','Client Review','Revisions','Final Approval','Final Payment','Deployment','Completed'];
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
    if(hash&&['leads','inbox','clients','studio-projects','proposals','payments','v9'].includes(hash)){
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
      const now=new Date().toISOString();
      const [newLeads,dueFollowups,unreadInbox,clients,projects,payments,sentProposals,latestLeads,latestMessages,pendingPayments,followups]=await Promise.all([
        count('studio_leads',q=>q.eq('status','new')),
        count('studio_leads',q=>q.lte('next_action_due_at',now).not('status','in','(won,lost)')),
        count('studio_messages',q=>q.eq('sender_type','client').eq('is_read_by_admin',false)),
        count('studio_clients',q=>q.eq('status','active')),
        count('studio_projects',q=>q.neq('status','completed')),
        count('studio_payments',q=>q.eq('status','pending')),
        count('studio_proposals',q=>q.eq('status','sent')),
        sb().from('studio_leads').select('id,lead_code,full_name,company_name,service,status,created_at,next_action,next_action_due_at').order('created_at',{ascending:false}).limit(5),
        sb().from('studio_messages').select('id,project_id,body,created_at,studio_projects(project_code,title)').eq('sender_type','client').eq('is_read_by_admin',false).order('created_at',{ascending:false}).limit(4),
        sb().from('studio_payments').select('id,payment_code,payment_type,amount,currency,status,due_date').eq('status','pending').order('due_date',{ascending:true}).limit(3),
        sb().from('studio_leads').select('id,lead_code,full_name,next_action,next_action_due_at,status').lte('next_action_due_at',now).not('status','in','(won,lost)').order('next_action_due_at',{ascending:true}).limit(5)
      ]);
      [latestLeads,latestMessages,pendingPayments,followups].forEach(r=>{if(r.error)throw r.error});
      $('#ops-m-leads').textContent=newLeads;$('#ops-m-followups').textContent=dueFollowups;$('#ops-m-inbox').textContent=unreadInbox;$('#ops-m-clients').textContent=clients;$('#ops-m-projects').textContent=projects;$('#ops-m-payments').textContent=payments;$('#ops-m-proposals').textContent=sentProposals;
      const badge=$('#ops-inbox-badge');if(badge){badge.textContent=unreadInbox;badge.classList.toggle('hidden',!unreadInbox)}
      const items=[];
      (followups.data||[]).forEach(x=>items.push({type:'lead',id:x.id,title:'Follow-up due',detail:(x.lead_code||'Lead')+' · '+(x.full_name||'Client')+' · '+(x.next_action||'Next action')}));
      (latestMessages.data||[]).forEach(x=>items.push({type:'inbox',title:'Client message',detail:(x.studio_projects?.project_code||'Project')+' · '+String(x.body||'').slice(0,90)}));
      (latestLeads.data||[]).filter(x=>x.status==='new').forEach(x=>items.push({type:'lead',id:x.id,title:'Review new lead',detail:(x.lead_code||'Lead')+' · '+(x.full_name||'Unknown')}));
      (pendingPayments.data||[]).forEach(x=>items.push({type:'payment',title:'Pending payment',detail:(x.payment_code||'Payment')+' · '+(x.currency||'EGP')+' '+money(x.amount)}));
      $('#ops-priority-list').innerHTML=items.length?items.slice(0,8).map(x=>'<div class="ops-priority-item"><i class="ops-dot"></i><div><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></div><button class="row-action" '+(x.type==='lead'&&x.id?'data-priority-lead="'+esc(x.id)+'"':'data-jump="'+esc(x.type==='payment'?'payments':'inbox')+'"')+'>OPEN →</button></div>').join(''):'<div class="ops-empty">Nothing needs immediate attention.</div>';
      $('#ops-latest-list').innerHTML=(latestLeads.data||[]).map(x=>'<div class="entity-row"><b>'+esc(x.full_name||'Unnamed lead')+'</b><small>'+esc((x.lead_code||'—')+' · '+(x.company_name||'Individual')+' · '+(x.service||'Not specified'))+'</small><div>'+chip(x.status)+'</div></div>').join('')||'<div class="ops-empty">No leads yet.</div>';
      state.loaded.dashboard=true;
    }catch(e){$('#ops-priority-list').innerHTML='<div class="ops-empty">Could not load operations dashboard.</div>';notify(e.message||'Dashboard load failed','error')}
  }

  async function loadInbox(force=false){
    if(state.loaded.inbox&&!force){renderInbox();return}
    loading('#ops-inbox-list');
    const [messages,revisions,files,leads,discoveryAnswers]=await Promise.all([
      sb().from('studio_messages').select('id,project_id,client_id,sender_type,body,is_read_by_admin,created_at,studio_projects(project_code,title,client_id)').eq('sender_type','client').order('created_at',{ascending:false}).limit(120),
      sb().from('studio_revisions').select('id,project_id,revision_number,status,notes,submitted_at,studio_projects(project_code,title)').in('status',['submitted','in_progress']).order('submitted_at',{ascending:false}).limit(80),
      sb().from('studio_files').select('id,project_id,file_name,category,created_at,studio_projects(project_code,title)').eq('category','client_upload').order('created_at',{ascending:false}).limit(80),
      sb().from('studio_leads').select('id,lead_code,full_name,service,project_goal,source,created_at,status').eq('source','Client Portal').order('created_at',{ascending:false}).limit(80),
      sb().from('studio_discovery_answers').select('id,case_id,question_key,answer,actor_type,is_read_by_admin,created_at,studio_discovery_cases(lead_id,studio_leads(lead_code,full_name))').eq('actor_type','prospect').order('created_at',{ascending:false}).limit(120)
    ]);
    const failed=[messages,revisions,files,leads,discoveryAnswers].find(x=>x.error);if(failed)return notify(failed.error.message,'error');
    state.inbox=[
      ...(messages.data||[]).map(x=>({kind:'message',id:x.id,project_id:x.project_id,title:'Client message',summary:x.body,project:x.studio_projects?.project_code||x.studio_projects?.title||'Project',date:x.created_at,unread:!x.is_read_by_admin})),
      ...(discoveryAnswers.data||[]).map(x=>({kind:'discovery',id:x.id,lead_id:x.studio_discovery_cases?.lead_id,title:'Discovery answer · '+String(x.question_key||'').replaceAll('_',' '),summary:x.answer,project:x.studio_discovery_cases?.studio_leads?.lead_code||x.studio_discovery_cases?.studio_leads?.full_name||'Lead',date:x.created_at,unread:!x.is_read_by_admin})),
      ...(revisions.data||[]).map(x=>({kind:'revision',id:x.id,project_id:x.project_id,title:'Revision request #'+x.revision_number,summary:x.notes||x.status,project:x.studio_projects?.project_code||x.studio_projects?.title||'Project',date:x.submitted_at,unread:true})),
      ...(files.data||[]).map(x=>({kind:'upload',id:x.id,project_id:x.project_id,title:'Client uploaded a file',summary:x.file_name,project:x.studio_projects?.project_code||x.studio_projects?.title||'Project',date:x.created_at,unread:false})),
      ...(leads.data||[]).map(x=>({kind:'lead',id:x.id,lead_id:x.id,title:'New project request',summary:(x.lead_code||'Lead')+' · '+(x.full_name||'Client')+' · '+(x.service||'Service'),project:'Client Portal',date:x.created_at,unread:x.status==='new'}))
    ].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    state.loaded.inbox=true;renderInbox();
  }
  function renderInbox(){
    const q=($('#ops-inbox-search')?.value||'').trim().toLowerCase(),f=$('#ops-inbox-filter')?.value||'all';
    const rows=state.inbox.filter(x=>(f==='all'||x.kind===f)&&(!q||[x.title,x.summary,x.project].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-inbox-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>ACTIVITY</th><th>PROJECT</th><th>DETAIL</th><th>DATE</th><th></th></tr></thead><tbody>'+rows.map(x=>'<tr class="'+(x.unread?'inbox-unread':'')+'"><td><div class="entity-title"><b>'+esc(x.title)+'</b><small>'+esc(x.kind.toUpperCase())+'</small></div></td><td>'+esc(x.project||'—')+'</td><td>'+esc(String(x.summary||'').slice(0,120))+'</td><td>'+esc(fmt(x.date))+'</td><td><div class="row-actions"><button class="row-action primary-action" '+((x.kind==='lead'||x.kind==='discovery')?'data-inbox-lead="'+esc(x.lead_id)+'"':'data-inbox-project="'+esc(x.project_id)+'"')+'>OPEN</button></div></td></tr>').join('')+'</tbody></table></div>':'<div class="ops-empty">No matching client activity.</div>';
  }

  async function loadLeads(force=false){
    if(state.loaded.leads&&!force){renderLeads();return}
    loading('#ops-leads-list');
    const r=await sb().from('studio_leads').select('*').order('created_at',{ascending:false}).limit(250);
    if(r.error)return notify(r.error.message,'error');
    state.leads=r.data||[];state.loaded.leads=true;renderLeads();
  }
  function renderLeads(){
    const q=($('#ops-lead-search')?.value||'').trim().toLowerCase(), f=$('#ops-lead-filter')?.value||'all',now=Date.now();
    const rows=state.leads.filter(x=>(f==='all'||x.status===f)&&(!q||[x.lead_code,x.full_name,x.company_name,x.email,x.phone,x.service,x.next_action].some(v=>String(v||'').toLowerCase().includes(q))));
    $('#ops-leads-list').innerHTML=rows.length?'<div class="data-table-wrap"><table class="data-table"><thead><tr><th>LEAD</th><th>SERVICE</th><th>NEXT ACTION</th><th>STATUS</th><th>RECEIVED</th><th></th></tr></thead><tbody>'+rows.map(x=>{const due=x.next_action_due_at?new Date(x.next_action_due_at).getTime():0,overdue=due&&due<now&&!['won','lost'].includes(x.status);return '<tr class="'+(overdue?'lead-overdue':'')+'"><td><div class="entity-title"><b>'+esc(x.full_name||'Unnamed')+'</b><small>'+esc((x.lead_code||'—')+' · '+(x.company_name||'Individual'))+'</small></div></td><td>'+esc(x.service||'—')+'</td><td><div class="entity-title"><b>'+esc(x.next_action||'Not set')+'</b><small>'+esc(x.next_action_due_at?(overdue?'OVERDUE · ':'Due ')+fmt(x.next_action_due_at):'No due date')+'</small></div></td><td>'+chip(x.status)+'</td><td>'+esc(fmt(x.created_at))+'</td><td><div class="row-actions"><button class="row-action primary-action" data-open-lead="'+esc(x.id)+'">OPEN WORKSPACE</button></div></td></tr>'}).join('')+'</tbody></table></div>':'<div class="ops-empty">No matching leads.</div>';
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
    if(tab==='inbox')return loadInbox(force);
    if(tab==='clients')return loadClients(force);
    if(tab==='studio-projects')return loadProjects(force);
    if(tab==='proposals')return loadProposals(force);
    if(tab==='payments')return loadPayments(force);
    if(tab==='v9')return loadV9(force);
  }

  function parseLeadBrief(text){
    const raw=String(text||'').trim();
    const defs=[
      ['Challenge / Goal','Challenge / Goal:'],['Audience','Audience:'],['Success looks like','Success looks like:'],['Current stage','Current stage:'],['Possible expertise','Possible expertise:'],
      ['Original client words','ORIGINAL CLIENT WORDS:'],['Context link','CONTEXT LINK:'],['Current situation','Current situation:'],['Core problem','Core problem:'],['Possible direction','Possible direction:'],['Likely capabilities','Likely capabilities:'],
      ['Issue','Issue:'],['Context','Context:'],['Jurisdiction','Jurisdiction:'],['People exposed','People exposed:'],['Immediate danger','Immediate danger / uncontrolled condition:'],['Control concern','Control concern:'],
      ['المشكلة','المشكلة:'],['السياق','السياق:'],['جهة التطبيق','جهة التطبيق:'],['الأشخاص المعرضون','الأشخاص المعرضون:'],['الخطر الفوري','خطر فوري / حالة غير مسيطر عليها:'],['أكبر قلق','أكبر قلق في وسائل التحكم:']
    ];
    const hits=[];
    defs.forEach(([label,marker])=>{let from=0;const lower=raw.toLowerCase(),needle=marker.toLowerCase();while(true){const i=lower.indexOf(needle,from);if(i<0)break;hits.push({label,marker,index:i,end:i+marker.length});from=i+marker.length}});
    hits.sort((a,b)=>a.index-b.index);
    const cards=[];
    for(let i=0;i<hits.length;i++){const h=hits[i],next=hits[i+1]?.index??raw.length;let value=raw.slice(h.end,next).trim().replace(/^[\s\-–—:]+|[\s]+$/g,'');value=value.replace(/^(DISCOVERY SNAPSHOT|MANAGEMENT-SYSTEM SELF-CHECK|وسائل التحكم المذكورة)\s*:?/i,'').trim();if(value&&value.length<1200&&!cards.some(x=>x.label===h.label))cards.push({label:h.label,value})}
    return cards.length?cards:[{label:'Original brief',value:raw||'No project brief recorded.'}];
  }
  function briefValue(cards,...labels){for(const label of labels){const x=cards.find(c=>c.label.toLowerCase()===label.toLowerCase());if(x?.value)return x.value}return''}
  function suggestedUnderstanding(x,cards){
    return x.ats_understanding||briefValue(cards,'Core problem','Challenge / Goal','المشكلة','Issue','Original client words')||String(x.project_goal||'').slice(0,700);
  }
  function suggestedMissing(x,cards){
    if(x.missing_information?.length)return x.missing_information;
    const missing=[];
    if(!briefValue(cards,'Audience','People exposed','الأشخاص المعرضون'))missing.push('Primary audience / people affected');
    if(!briefValue(cards,'Success looks like')&&!String(x.project_goal||'').toLowerCase().includes('outcome'))missing.push('Success criteria / measurable outcome');
    if(!x.timeline)missing.push('Timeline / urgency');
    if(!x.budget_range)missing.push('Budget / investment range');
    const stage=briefValue(cards,'Current stage').toLowerCase();
    if(!(x.current_assets||[]).length&&!stage.includes('asset')&&!String(x.project_goal||'').toLowerCase().includes('evidence'))missing.push('Available assets / references');
    return missing;
  }
  function dateTimeLocal(value){
    if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  function localToIso(value){return value?new Date(value).toISOString():null}
  function humanActivity(action,meta={}){
    const labels={lead_status_changed:'Status changed',lead_contact_logged:'Client contact logged',lead_next_action_changed:'Next action updated',lead_discovery_started:'Discovery started',discovery_answered:'Discovery answer received',discovery_signal_added:'Discovery evidence added',diagnosis_updated:'Diagnosis updated',root_cause_added:'Root-cause hypothesis added',root_cause_status_changed:'Root cause updated',solution_task_added:'Solution task added',solution_task_status_changed:'Solution task updated',diagnostic_engine_completed:'ATS diagnostic engine completed',working_diagnosis_accepted:'Working diagnosis accepted',lead_file_analyzed:'Project evidence analyzed',client_access_code_issued:'Client Access Code issued',client_access_code_redeemed:'Client Access opened',client_portal_request_published:'Client Portal request published',proposal_created:'Proposal created',proposal_sent:'Proposal sent',proposal_accepted:'Proposal accepted'};
    const title=labels[action]||String(action||'Activity').replaceAll('_',' ');
    let detail=meta.summary||meta.note||'';
    if(action==='lead_status_changed')detail=(leadStatusLabels[meta.from]||meta.from||'—')+' → '+(leadStatusLabels[meta.to]||meta.to||'—');
    if(action==='lead_next_action_changed')detail=(meta.next_action||'No action')+(meta.due_at?' · due '+fmt(meta.due_at):'');
    if(action==='lead_contact_logged')detail=(meta.channel||'Contact')+' · '+String(meta.outcome||'').replaceAll('_',' ')+(meta.summary?' · '+meta.summary:'');
    if(action==='discovery_answered')detail=String(meta.question_key||'Discovery').replaceAll('_',' ')+' · '+String(meta.answer_preview||'');
    if(action==='discovery_signal_added')detail=String(meta.question_key||'Discovery').replaceAll('_',' ')+' · '+String(meta.answer_preview||'');
    if(action==='diagnosis_updated')detail=(meta.root_problem||'Diagnosis updated')+' · '+String(meta.confidence||0)+'% confidence';
    if(action==='root_cause_added')detail=(meta.statement||'Root-cause hypothesis')+' · '+String(meta.confidence||0)+'% confidence';
    if(action==='root_cause_status_changed')detail=(meta.statement||'Root cause')+' · '+String(meta.status||'');
    if(action==='solution_task_added')detail=(meta.title||'Solution task')+' · '+String(meta.owner||'ATS');
    if(action==='solution_task_status_changed')detail=(meta.title||'Solution task')+' · '+String(meta.status||'');
    if(action==='diagnostic_engine_completed')detail=String(meta.decision_stage||'analysis').replaceAll('_',' ')+' · '+String(meta.system_confidence||0)+'% confidence · '+String(meta.root_causes||0)+' cause hypothesis(es) · '+String(meta.tasks||0)+' proposed task(s)';
    if(action==='working_diagnosis_accepted')detail=(meta.root_problem||'Working diagnosis')+' · '+String(meta.confidence||0)+'% confidence';
    if(action==='lead_file_analyzed')detail=(meta.file_name||'Project file')+' · '+String(meta.evidence_strength||'evidence')+' · '+String(meta.discovery_signals_added||0)+' discovery field(s) added';
    if(action==='client_access_code_issued')detail='Temporary access issued · '+(meta.ttl_minutes||60)+' minutes';
    if(action==='client_access_code_redeemed')detail='Client authenticated with temporary access';
    return {title,detail};
  }
  function renderLeadTimeline(){
    const x=state.currentLead;if(!x)return;
    const items=[
      {action:'lead_received',created_at:x.created_at,metadata:{summary:'Lead received from '+(x.source||'website')}},
      ...state.leadActivities
    ].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    $('#lead-timeline').innerHTML=items.length?items.map(item=>{const h=item.action==='lead_received'?{title:'Lead received',detail:item.metadata?.summary||''}:humanActivity(item.action,item.metadata||{});return '<div class="lead-timeline-item"><i></i><div><b>'+esc(h.title)+'</b><p>'+esc(h.detail||'')+'</p><small>'+esc(fmt(item.created_at))+'</small></div></div>'}).join(''):'<div class="ops-empty">No activity recorded yet.</div>';
  }
  async function loadLeadTimeline(leadId){
    $('#lead-timeline').innerHTML='<div class="loading-line">Loading activity…</div>';
    const r=await sb().from('studio_activity').select('*').eq('entity_type','lead').eq('entity_id',leadId).order('created_at',{ascending:false}).limit(120);
    if(r.error){$('#lead-timeline').innerHTML='<div class="ops-empty">Activity could not be loaded.</div>';return}
    state.leadActivities=r.data||[];renderLeadTimeline();
  }
  async function logLeadActivity(action,metadata={},leadId=state.currentLead?.id){
    if(!leadId)return;
    const r=await sb().from('studio_activity').insert({actor_type:'admin',entity_type:'lead',entity_id:leadId,action,metadata}).select('*').single();
    if(!r.error&&state.currentLead?.id===leadId){state.leadActivities.unshift(r.data);renderLeadTimeline()}
  }

  function diagnosisGateState(){
    const c=state.discoveryCase||{},validated=state.rootCauses.some(x=>x.status==='validated');
    const approved=x=>!['proposed','rejected'].includes(String(x.status||''));
    const hasTask=state.solutionTasks.some(approved);
    const verification=state.solutionTasks.some(x=>approved(x)&&x.task_type==='verification');
    const coverage=Number(c.readiness_score||0)>=75;
    const synthesis=!!String(c.root_problem||'').trim()&&Number(c.diagnosis_confidence||0)>=60;
    const analysisCurrent=String(c.analysis_state||'')==='ready';
    return {analysisCurrent,coverage,synthesis,validated,hasTask,verification,ready:analysisCurrent&&coverage&&synthesis&&validated&&hasTask&&verification};
  }
  function operatingGateState(){
    const c=state.discoveryCase||{},bp=state.deliveryBlueprint||{},body=bp.blueprint||{};
    const stage=String(c.decision_stage||'needs_evidence');
    const domains=Array.isArray(body.domains)?body.domains:[];
    const analysisCurrent=String(c.analysis_state||'')==='ready';
    const needsEvidence=stage==='needs_evidence'||bp.status==='needs_evidence';
    const blueprintReady=!needsEvidence&&['ready','approved','activated'].includes(String(bp.status||''))&&domains.length>0;
    const scopeApproved=['approved','activated'].includes(String(bp.status||''));
    return {stage,analysisCurrent,needsEvidence,domains,blueprintReady,scopeApproved,understood:analysisCurrent&&!needsEvidence};
  }

  function nextMissingDiscovery(){
    const c=state.discoveryCase||{};
    return discoveryDimensions.find(([key])=>!String(c[key]||'').trim())||null;
  }
  function latestDiscoveryAnswer(key){
    return state.discoveryAnswers.find(x=>x.question_key===key)||null;
  }
  function renderSystemDiagnosis(){
    const c=state.discoveryCase||{},run=state.diagnosticRun||{},analysis=run.analysis||{};
    const stateName=String(c.analysis_state||'never_analyzed');
    const badge=$('#system-analysis-state');
    if(badge){badge.className='analysis-state '+stateName;badge.textContent=stateName.replaceAll('_',' ').toUpperCase()}
    $('#system-decision-stage').textContent=String(c.decision_stage||'needs_evidence').replaceAll('_',' ').toUpperCase();
    $('#system-confidence').textContent=Number(c.system_confidence||0)+'%';
    $('#system-last-analyzed').textContent=c.last_analyzed_at?new Date(c.last_analyzed_at).toLocaleString():'—';
    $('#system-problem-statement').textContent=c.system_problem_statement||'The system has not analyzed this case yet.';
    $('#system-diagnosis-summary').textContent=c.system_diagnosis_summary||'';
    $('#accept-system-diagnosis').classList.toggle('hidden',!String(c.system_problem_statement||'').trim());

    const evidence=analysis.evidence_assessment||{};
    const renderList=(id,items,empty)=>{
      const el=$(id);if(!el)return;
      const arr=Array.isArray(items)?items.filter(Boolean):[];
      el.innerHTML=arr.length?arr.map(x=>'<p>'+esc(x)+'</p>').join(''):'<p>'+esc(empty)+'</p>';
    };
    renderList('#system-facts',evidence.facts,'No confirmed facts extracted yet.');
    renderList('#system-assumptions',evidence.assumptions,'No explicit assumptions extracted yet.');
    renderList('#system-contradictions',evidence.contradictions,'No contradictions identified yet.');
    const ledger=Array.isArray(analysis.evidence_ledger)?analysis.evidence_ledger:[];
    const ledgerEl=$('#system-evidence-ledger');
    if(ledgerEl){
      ledgerEl.innerHTML=ledger.length?ledger.map(item=>{
        const cls=String(item.classification||'unknown').replaceAll('_',' ').toUpperCase();
        const source=String(item.source||'unknown').replaceAll('_',' ').toUpperCase();
        const strength=String(item.strength||'unknown').toUpperCase();
        return '<article class="evidence-ledger-row '+esc(String(item.classification||''))+'"><div class="evidence-ref">'+esc(item.ref_id||'E?')+'</div><div class="evidence-ledger-main"><div class="evidence-ledger-meta"><span>'+esc(cls)+'</span><span>'+esc(source)+'</span><span>'+esc(strength)+'</span></div><b>'+esc(item.statement||'')+'</b><p>'+esc(item.why_it_matters||'')+'</p>'+(item.verification_needed?'<small><strong>VERIFY:</strong> '+esc(item.verification_needed)+'</small>':'')+'</div></article>'
      }).join(''):'<div class="ops-empty">Evidence will appear after analysis.</div>';
    }

    const q=analysis.next_best_question||c.system_next_question||{};
    $('#system-next-question').textContent=q.question||'—';
    $('#system-next-question-reason').textContent=[q.reason,q.decision_value].filter(Boolean).join(' · ');
    $('#system-next-action').textContent=c.system_next_action||analysis.next_best_action||'—';

    const planRoot=$('#system-action-plan-items'),planNote=$('#system-action-plan-note');
    const proposed=state.solutionTasks.filter(x=>x.status==='proposed'&&x.source_type==='ai').slice(0,3);
    const fallbackPlan=Array.isArray(analysis.recommended_tasks)?analysis.recommended_tasks.slice(0,3):[];
    const plan=proposed.length?proposed:fallbackPlan;
    if(planRoot){
      planRoot.innerHTML=plan.length?plan.map((task,i)=>{
        const type=String(task.task_type||'task').replaceAll('_',' ').toUpperCase();
        const owner=String(task.owner_type||'ats').replaceAll('_',' ').toUpperCase();
        const priority=String(task.priority||'medium').toUpperCase();
        return '<article><i>'+(i+1)+'</i><div><div class="system-action-meta"><span>'+esc(type)+'</span><span>'+esc(owner)+'</span><span>'+esc(priority)+'</span></div><b>'+esc(task.title||'Required task')+'</b><p>'+esc(task.rationale||task.expected_effect||'')+'</p></div></article>'
      }).join(''):'<div class="ops-empty">'+esc(stateName==='ready'?'No execution task is justified yet. Follow the next evidence question first.':'Run ATS diagnosis to derive the next tasks.')+'</div>';
    }
    if(planNote){
      const clientTasks=plan.filter(x=>String(x.owner_type||'')==='client').length;
      planNote.textContent=plan.length?(plan.length+' next task(s) · '+clientTasks+' need client input'):(stateName==='ready'?'Evidence first':'Diagnosis pending');
    }

    const direction=analysis.solution_direction||{};
    $('#system-solution-direction').textContent=[direction.strategy,direction.why_this_direction].filter(Boolean).join('\n')||'Not enough evidence yet.';
    const verification=analysis.verification_plan||{};
    const verifyItems=[
      ...(Array.isArray(verification.success_signals)?verification.success_signals.map(x=>'Success: '+x):[]),
      ...(Array.isArray(verification.failure_signals)?verification.failure_signals.map(x=>'Failure signal: '+x):[]),
      verification.review_point?'Review: '+verification.review_point:null
    ].filter(Boolean);
    renderList('#system-verification-plan',verifyItems,'Will be generated after analysis.');

    const btn=$('#run-diagnostic-engine');
    if(btn){
      const analyzing=stateName==='analyzing';
      btn.disabled=analyzing;
      btn.textContent=analyzing?'ANALYZING…':stateName==='ready'?'REFRESH ATS DIAGNOSIS':'RUN ATS DIAGNOSIS';
    }
  }
  async function ensureDeliveryBlueprint(leadId,{force=false,silent=true}={}){
    if(!leadId||!sb())return null;
    const {data,error}=await sb().functions.invoke('ats-delivery-blueprint',{body:{lead_id:leadId,force}});
    if(error){
      if(!silent)notify(error.message||'Could not generate the delivery blueprint.','error');
      throw error;
    }
    const row=data?.blueprint||null;
    if(state.currentLead?.id===leadId&&row){
      state.deliveryBlueprint=row;
      renderLeadExecutionPath(executionCtx);
    }
    return row;
  }

  async function runDiagnosticEngine(silent=false){
    const lead=state.currentLead;if(!lead||!sb())return;
    const btn=$('#run-diagnostic-engine'),old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='ANALYZING…'}
    if(state.discoveryCase){state.discoveryCase.analysis_state='analyzing';renderSystemDiagnosis()}
    try{
      const {data,error}=await sb().functions.invoke('ats-problem-solver',{body:{lead_id:lead.id}});
      if(error)throw error;
      await loadLeadDiagnosis(lead.id,{autoAnalyze:false});
      if(String(state.discoveryCase?.analysis_state||'')==='ready'){
        const regenerateBlocked=state.deliveryBlueprint?.status==='needs_evidence'&&String(state.discoveryCase?.decision_stage||'needs_evidence')!=='needs_evidence';
        try{await ensureDeliveryBlueprint(lead.id,{force:!data?.cached||regenerateBlocked,silent:true})}catch(_){}
      }
      await loadLeadTimeline(lead.id);
      if(!silent)notify(data?.cached?'Diagnosis already current':'ATS diagnosis refreshed · delivery plan updated');
    }catch(error){
      if(state.discoveryCase)state.discoveryCase.analysis_state='error';
      renderSystemDiagnosis();
      if(!silent)notify(error.message||'Diagnostic analysis could not run','error');
    }finally{
      if(btn){btn.disabled=false;if(old&&!state.discoveryCase?.analysis_state)btn.textContent=old}
      renderSystemDiagnosis();
    }
  }
  async function acceptSystemDiagnosis(){
    const c=state.discoveryCase;if(!c?.system_problem_statement)return;
    const patch={
      root_problem:c.system_problem_statement,
      diagnosis_summary:c.system_diagnosis_summary||c.diagnosis_summary||null,
      diagnosis_confidence:Number(c.system_confidence||0),
      phase:'diagnosis'
    };
    const r=await sb().from('studio_discovery_cases').update(patch).eq('id',c.id).select('*').single();
    if(r.error)return notify(r.error.message,'error');
    state.discoveryCase=r.data;
    await logLeadActivity('working_diagnosis_accepted',{confidence:r.data.diagnosis_confidence,root_problem:r.data.root_problem,run_id:r.data.last_diagnostic_run_id});
    await syncDiagnosisPhase();renderLeadDiagnosis();notify('System diagnosis accepted as working diagnosis');
  }

  function updateCaseCockpit(){
    const c=state.discoveryCase||{}, run=state.diagnosticRun||{}, analysis=run.analysis||{}, lead=state.currentLead||{};
    const filled=discoveryDimensions.filter(([key])=>String(c[key]||'').trim());
    const missing=discoveryDimensions.filter(([key])=>!String(c[key]||'').trim());
    const validated=state.rootCauses.filter(x=>x.status==='validated');
    const working=String(c.root_problem||c.system_problem_statement||analysis?.problem_framing?.root_problem||analysis?.problem_framing?.problem_statement||'').trim();
    const systemQ=c.system_next_question||analysis.next_best_question||{};
    const q=String(systemQ.question||'').trim();

    const set=(id,value)=>{const el=$(id);if(el)el.textContent=value};
    set('#case-known-summary',filled.length?filled.slice(0,3).map(([,label])=>label).join(' · '):'Not enough confirmed context yet');
    set('#case-known-detail',filled.length+' / '+discoveryDimensions.length+' core discovery areas contain usable information'+(validated.length?' · '+validated.length+' validated cause'+(validated.length===1?'':'s'):''));
    set('#case-missing-summary',missing.length?missing.slice(0,2).map(([,label])=>label).join(' · '):'No core discovery gap');
    set('#case-missing-detail',missing.length?(missing.length+' area'+(missing.length===1?'':'s')+' still need evidence or a clear client answer'):'The core discovery set is complete. Focus on validation, not more questions.');
    set('#case-reading-summary',working||'No reliable working diagnosis yet');
    set('#case-reading-detail',working?((Number(c.diagnosis_confidence||c.system_confidence||0))+'% working confidence · '+String(c.analysis_state||'not analyzed').replaceAll('_',' ')):'Do not scope a solution yet. Run or refresh ATS diagnosis after the next useful evidence.');

    let next='Run ATS diagnosis',detail='Use the evidence already collected before requesting more from the client.';
    if(q){next='Ask the client one question';detail=q}
    else if(['never_analyzed','stale','error'].includes(String(c.analysis_state||''))){next='Refresh ATS diagnosis';detail='The case changed or has not been analyzed against the latest evidence.'}
    else if(!working){next='Review the system problem framing';detail='Turn the current evidence into one clear working problem statement.'}
    else if(!validated.length){next='Validate the strongest root-cause hypothesis';detail='Do not move to scope until at least one cause survives evidence review.'}
    else {
      const proposed=state.solutionTasks.find(x=>x.status==='proposed');
      if(proposed){next='Review the next justified task';detail=proposed.title||'Approve only work that is supported by the diagnosis.'}
      else if(lead.next_action){next=lead.next_action;detail='This is the current relationship follow-up saved for the case.'}
      else {next='Prepare the client direction';detail='The case has enough structure to turn the diagnosis into a clear next step.'}
    }
    set('#case-next-summary',next);set('#case-next-detail',detail);
  }

  function renderLeadDiagnosis(){
    const c=state.discoveryCase;
    if(!c){
      $('#diagnosis-score').textContent='0%';$('#diagnosis-progress-bar').style.width='0%';
      $('#diagnosis-dimensions').innerHTML='<div class="ops-empty">Discovery case is not available yet.</div>';
      renderSystemDiagnosis();return;
    }
    const score=Number(c.readiness_score||0),gate=diagnosisGateState(),next=nextMissingDiscovery();
    $('#diagnosis-score').textContent=score+'%';$('#diagnosis-progress-bar').style.width=score+'%';
    $('#diagnosis-root-problem').value=c.root_problem||'';$('#diagnosis-summary').value=c.diagnosis_summary||'';$('#diagnosis-confidence').value=Number(c.diagnosis_confidence||0);
    $('#diagnosis-next-question').textContent=c.system_next_question?.question?'System next question: '+c.system_next_question.question:(next?'Next client question: '+next[2]:'Discovery questions complete · validate the root cause.');
    renderSystemDiagnosis();
    const evidenceIndex=new Map((state.diagnosticRun?.analysis?.evidence_ledger||[]).map(x=>[String(x.ref_id||''),x]));
    const evidenceRefsHtml=refs=>{
      const arr=Array.isArray(refs)?refs.filter(Boolean):[];
      if(!arr.length)return '';
      return '<div class="evidence-ref-line"><strong>EVIDENCE:</strong> '+arr.map(ref=>{
        const item=evidenceIndex.get(String(ref));
        return '<span title="'+esc(item?.statement||'')+'">'+esc(ref)+'</span>';
      }).join('')+'</div>';
    };

    const gateItems=[
      ['Current analysis',gate.analysisCurrent,String(c.analysis_state||'never_analyzed').replaceAll('_',' ')],
      ['Evidence coverage',gate.coverage,score+'% / 75% minimum'],
      ['Problem synthesis',gate.synthesis,(c.root_problem?'Root problem written':'Root problem missing')+' · '+Number(c.diagnosis_confidence||0)+'% confidence'],
      ['Validated cause',gate.validated,state.rootCauses.filter(x=>x.status==='validated').length+' validated'],
      ['Approved task',gate.hasTask,state.solutionTasks.filter(x=>!['proposed','rejected'].includes(x.status)).length+' approved task(s)'],
      ['Verification task',gate.verification,state.solutionTasks.filter(x=>x.task_type==='verification'&&!['proposed','rejected'].includes(x.status)).length+' approved']
    ];
    $('#diagnosis-gate').innerHTML=gateItems.map(([title,pass,detail])=>'<div class="'+(pass?'pass':'')+'"><b>'+(pass?'✓ ':'○ ')+esc(title)+'</b><small>'+esc(detail)+'</small></div>').join('');

    $('#diagnosis-dimensions').innerHTML=discoveryDimensions.map(([key,label,hint])=>{
      const value=String(c[key]||'').trim(),latest=latestDiscoveryAnswer(key);
      return '<article class="diagnosis-dimension '+(value?'complete':'missing')+'"><div><span>'+esc(label.toUpperCase())+'</span><b>'+(value?'CONFIRMED DATA':'MISSING')+'</b></div><p>'+esc(value||hint)+'</p>'+(latest?'<small>'+esc(String(latest.actor_type||'').toUpperCase()+' · '+String(latest.source_channel||'').toUpperCase()+' · '+fmt(latest.created_at))+'</small>':'')+'</article>'
    }).join('');

    const required=[];
    if(['never_analyzed','stale','error'].includes(String(c.analysis_state||'')))required.push(['Run ATS diagnosis','The evidence changed or has not been analyzed yet. Refresh the diagnostic engine before choosing the solution.']);
    discoveryDimensions.filter(([key])=>!String(c[key]||'').trim()).forEach(([,label])=>required.push(['Collect '+label,'Ask the next high-value question or record evidence from a call / WhatsApp interaction.']));
    if(!String(c.root_problem||'').trim())required.push(['Accept or refine the working diagnosis','Use the system framing as a starting point, then approve a clear root problem statement.']);
    if(Number(c.diagnosis_confidence||0)<60)required.push(['Increase diagnosis confidence','Validate assumptions with evidence until confidence is at least 60%.']);
    if(!gate.validated)required.push(['Validate a root-cause hypothesis','A suspected cause is not enough. Use the suggested validation method, then validate or reject it.']);
    if(!gate.hasTask)required.push(['Approve the first required task','Review the system task sequence and approve only the work justified by the evidence.']);
    if(!gate.verification)required.push(['Approve effectiveness verification','The plan must include a verification task that proves the solution changed the target outcome.']);
    $('#diagnosis-system-tasks').innerHTML=required.length?required.slice(0,8).map(([title,why])=>'<div class="system-task"><i></i><div><b>'+esc(title)+'</b><small>'+esc(why)+'</small></div></div>').join(''):'<div class="system-task"><i style="background:#58d99d"></i><div><b>Diagnosis Gate ready</b><small>The problem, validated cause, action plan and effectiveness verification are defined.</small></div></div>';

    $('#root-cause-list').innerHTML=state.rootCauses.length?state.rootCauses.map(x=>{
      const ai=x.source_type==='ai',level=x.causal_level||'contributing';
      return '<article class="cause-row '+(ai?'ai-suggested':'')+'"><div class="cause-row-head"><div><b>'+esc(x.statement)+'</b><div class="cause-meta">'+(ai?'<span class="ai-source">AI SUGGESTED</span>':'<span>ATS</span>')+'<span>'+esc(level)+'</span><span>'+esc(x.category)+'</span><span>'+esc(String(x.confidence||0))+'% confidence</span><span class="'+esc(x.status)+'">'+esc(x.status.toUpperCase())+'</span></div></div></div>'+(x.evidence_for?'<p><strong>EVIDENCE FOR:</strong> '+esc(x.evidence_for)+'</p>':'')+(x.evidence_against?'<p><strong>GAPS / AGAINST:</strong> '+esc(x.evidence_against)+'</p>':'')+(x.validation_method?'<div class="cause-validation"><strong>VALIDATE BY:</strong> '+esc(x.validation_method)+'</div>':'')+evidenceRefsHtml(x.evidence_refs)+(Array.isArray(x.missing_evidence_refs)&&x.missing_evidence_refs.length?'<div class="evidence-ref-line missing"><strong>MISSING:</strong> '+x.missing_evidence_refs.map(ref=>'<span>'+esc(ref)+'</span>').join('')+'</div>':'')+'<div class="cause-actions">'+(x.status!=='validated'?'<button data-cause-status="'+esc(x.id)+':validated">VALIDATE</button>':'')+(x.status!=='suspected'?'<button data-cause-status="'+esc(x.id)+':suspected">SUSPECTED</button>':'')+(x.status!=='rejected'?'<button data-cause-status="'+esc(x.id)+':rejected">REJECT</button>':'')+'</div></article>'
    }).join(''):'<div class="ops-empty">No root-cause hypotheses yet. Run ATS diagnosis first.</div>';

    const causeSelect=$('#solution-task-cause'),selected=causeSelect?.value||'';
    if(causeSelect){causeSelect.innerHTML='<option value="">General / not linked yet</option>'+state.rootCauses.filter(x=>x.status!=='rejected').map(x=>'<option value="'+esc(x.id)+'">'+esc(String(x.statement||'').slice(0,80))+'</option>').join('');if(state.rootCauses.some(x=>x.id===selected))causeSelect.value=selected}
    $('#solution-task-list').innerHTML=state.solutionTasks.length?state.solutionTasks.map(x=>{
      const cause=state.rootCauses.find(ca=>ca.id===x.root_cause_id),ai=x.source_type==='ai';
      let actions='';
      if(x.status==='proposed')actions='<button data-task-status="'+esc(x.id)+':todo">APPROVE TASK</button><button data-task-status="'+esc(x.id)+':rejected">REJECT</button>';
      else if(x.status==='todo')actions='<button data-task-status="'+esc(x.id)+':in_progress">START</button><button data-task-status="'+esc(x.id)+':done">DONE</button>';
      else if(x.status==='in_progress'||x.status==='blocked')actions='<button data-task-status="'+esc(x.id)+':done">DONE</button>'+(x.status==='blocked'?'<button data-task-status="'+esc(x.id)+':in_progress">UNBLOCK</button>':'');
      return '<article class="solution-task-row '+(ai?'ai-suggested':'')+'"><div class="task-row-head"><div><b>'+esc(x.title)+'</b><div class="task-meta">'+(ai?'<span class="ai-source">AI PROPOSED</span>':'<span>ATS</span>')+'<span>'+esc(x.task_type)+'</span><span>'+esc(x.owner_type)+'</span><span>'+esc(x.priority)+'</span><span>'+esc(x.status)+'</span></div></div></div>'+(x.rationale?'<p>'+esc(x.rationale)+'</p>':'')+(cause?'<p><strong>CAUSE:</strong> '+esc(cause.statement)+'</p>':'')+(x.expected_effect?'<p class="task-effect"><strong>EXPECTED EFFECT:</strong> '+esc(x.expected_effect)+'</p>':'')+(x.dependency_note?'<p><strong>DEPENDENCY:</strong> '+esc(x.dependency_note)+'</p>':'')+(x.acceptance_criteria?'<p><strong>DONE WHEN:</strong> '+esc(x.acceptance_criteria)+'</p>':'')+evidenceRefsHtml(x.evidence_refs)+'<div class="task-actions">'+actions+'</div></article>'
    }).join(''):'<div class="ops-empty">No task sequence yet. Run ATS diagnosis first.</div>';
    updateCaseCockpit();
    updateLeadWorkspaceState();
    renderLeadExecutionPath(executionCtx);
  }

  async function loadLeadDiagnosis(leadId,{autoAnalyze=true}={}){
    state.discoveryCase=null;state.discoveryAnswers=[];state.rootCauses=[];state.solutionTasks=[];state.diagnosticRun=null;state.deliveryBlueprint=null;
    $('#diagnosis-dimensions').innerHTML='<div class="loading-line">Loading discovery evidence…</div>';
    let cq=await sb().from('studio_discovery_cases').select('*').eq('lead_id',leadId).maybeSingle();
    if(cq.error)return notify(cq.error.message,'error');
    if(!cq.data){
      cq=await sb().from('studio_discovery_cases').insert({lead_id:leadId,phase:'discovery',source_snapshot:{}}).select('*').single();
      if(cq.error)return notify(cq.error.message,'error');
    }
    state.discoveryCase=cq.data;
    const [answers,causes,tasks,runs,latestRun,blueprint]=await Promise.all([
      sb().from('studio_discovery_answers').select('*').eq('case_id',cq.data.id).order('created_at',{ascending:false}).limit(250),
      sb().from('studio_root_causes').select('*').eq('case_id',cq.data.id).order('system_rank',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false}),
      sb().from('studio_solution_tasks').select('*').eq('case_id',cq.data.id).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      sb().from('studio_diagnostic_runs').select('id,status,model,analysis,completed_at,created_at').eq('case_id',cq.data.id).eq('status','completed').order('created_at',{ascending:false}).limit(1).maybeSingle(),
      sb().from('studio_diagnostic_runs').select('id,status,created_at').eq('case_id',cq.data.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      sb().from('studio_delivery_blueprints').select('*').eq('case_id',cq.data.id).maybeSingle()
    ]);
    const failed=[answers,causes,tasks,runs,latestRun,blueprint].find(x=>x.error);if(failed)return notify(failed.error.message,'error');
    state.discoveryAnswers=answers.data||[];state.rootCauses=causes.data||[];state.solutionTasks=tasks.data||[];state.diagnosticRun=runs.data||null;state.deliveryBlueprint=blueprint.data||null;
    if(String(state.discoveryCase?.analysis_state||'')==='analyzing'){
      const last=latestRun.data,ageMs=last?.created_at?Date.now()-new Date(last.created_at).getTime():Infinity;
      if(!last||last.status!=='running'||ageMs>15*60*1000){
        if(last?.status==='running'){
          await sb().from('studio_diagnostic_runs').update({status:'failed',error_text:'Auto-recovered stale diagnostic run',completed_at:new Date().toISOString()}).eq('id',last.id).eq('status','running');
        }
        const recovered=await sb().from('studio_discovery_cases').update({analysis_state:'stale',updated_at:new Date().toISOString()}).eq('id',cq.data.id).select('*').single();
        if(!recovered.error)state.discoveryCase=recovered.data;
      }
    }
    const unread=state.discoveryAnswers.filter(x=>x.actor_type==='prospect'&&!x.is_read_by_admin).map(x=>x.id);
    if(unread.length){await sb().from('studio_discovery_answers').update({is_read_by_admin:true}).in('id',unread);state.discoveryAnswers.forEach(x=>{if(unread.includes(x.id))x.is_read_by_admin=true});state.loaded.inbox=false}
    renderLeadDiagnosis();updateLeadWorkspaceState();
    if(autoAnalyze&&state.currentLead?.id===leadId&&['never_analyzed','stale'].includes(String(state.discoveryCase?.analysis_state||''))){
      void runDiagnosticEngine(true);
    }else if(
      autoAnalyze&&state.currentLead?.id===leadId&&String(state.discoveryCase?.analysis_state||'')==='ready'&&
      (!state.deliveryBlueprint||(state.deliveryBlueprint.status==='needs_evidence'&&String(state.discoveryCase?.decision_stage||'needs_evidence')!=='needs_evidence'))
    ){
      void ensureDeliveryBlueprint(leadId,{force:state.deliveryBlueprint?.status==='needs_evidence',silent:true});
    }
  }
  async function syncDiagnosisPhase(){
    const c=state.discoveryCase;if(!c)return;
    const gate=diagnosisGateState(),validated=state.rootCauses.some(x=>x.status==='validated');
    const phase=gate.ready?'solution_ready':validated?'diagnosis':'discovery';
    if(c.phase!==phase){
      const r=await sb().from('studio_discovery_cases').update({phase}).eq('id',c.id).select('*').single();
      if(!r.error)state.discoveryCase=r.data;
    }
  }
  async function saveDiagnosis(){
    const c=state.discoveryCase;if(!c)return;
    const patch={root_problem:$('#diagnosis-root-problem').value.trim()||null,diagnosis_summary:$('#diagnosis-summary').value.trim()||null,diagnosis_confidence:Math.max(0,Math.min(100,Number($('#diagnosis-confidence').value||0))),phase:'diagnosis'};
    const r=await sb().from('studio_discovery_cases').update(patch).eq('id',c.id).select('*').single();if(r.error)return notify(r.error.message,'error');
    state.discoveryCase=r.data;await syncDiagnosisPhase();await logLeadActivity('diagnosis_updated',{confidence:state.discoveryCase.diagnosis_confidence,root_problem:state.discoveryCase.root_problem});renderLeadDiagnosis();notify('Diagnosis saved');
  }
  async function addRootCause(){
    const c=state.discoveryCase,statement=$('#root-cause-statement').value.trim();if(!c||!statement)return notify('Write a root-cause hypothesis first','error');
    const payload={case_id:c.id,category:$('#root-cause-category').value,statement,evidence_for:$('#root-cause-evidence-for').value.trim()||null,evidence_against:$('#root-cause-evidence-against').value.trim()||null,confidence:Math.max(0,Math.min(100,Number($('#root-cause-confidence').value||50))),status:'suspected',source_type:'admin',causal_level:'contributing'};
    const r=await sb().from('studio_root_causes').insert(payload).select('*').single();if(r.error)return notify(r.error.message,'error');
    state.rootCauses.unshift(r.data);$('#root-cause-statement').value='';$('#root-cause-evidence-for').value='';$('#root-cause-evidence-against').value='';await logLeadActivity('root_cause_added',{root_cause_id:r.data.id,statement:r.data.statement,confidence:r.data.confidence});await syncDiagnosisPhase();renderLeadDiagnosis();notify('Root-cause hypothesis added');
  }
  async function setRootCauseStatus(id,status){
    const r=await sb().from('studio_root_causes').update({status}).eq('id',id).select('*').single();if(r.error)return notify(r.error.message,'error');
    const i=state.rootCauses.findIndex(x=>x.id===id);if(i>=0)state.rootCauses[i]=r.data;
    if(status==='rejected'){
      const proposed=state.solutionTasks.filter(x=>x.root_cause_id===id&&x.status==='proposed').map(x=>x.id);
      if(proposed.length){
        const tr=await sb().from('studio_solution_tasks').update({status:'rejected'}).in('id',proposed).select('*');
        if(!tr.error)(tr.data||[]).forEach(row=>{const ti=state.solutionTasks.findIndex(x=>x.id===row.id);if(ti>=0)state.solutionTasks[ti]=row});
      }
    }
    await logLeadActivity('root_cause_status_changed',{root_cause_id:id,status,statement:r.data.statement});await syncDiagnosisPhase();renderLeadDiagnosis();notify('Root cause updated');
  }
  async function addSolutionTask(){
    const c=state.discoveryCase,title=$('#solution-task-title').value.trim();if(!c||!title)return notify('Write the solution task first','error');
    const payload={case_id:c.id,root_cause_id:$('#solution-task-cause').value||null,task_type:$('#solution-task-type').value,title,rationale:$('#solution-task-rationale').value.trim()||null,owner_type:$('#solution-task-owner').value,priority:$('#solution-task-priority').value,status:'todo',acceptance_criteria:$('#solution-task-acceptance').value.trim()||null,due_date:$('#solution-task-due').value||null,sort_order:(state.solutionTasks.length+1)*10,source_type:'admin'};
    const r=await sb().from('studio_solution_tasks').insert(payload).select('*').single();if(r.error)return notify(r.error.message,'error');
    state.solutionTasks.push(r.data);$('#solution-task-title').value='';$('#solution-task-rationale').value='';$('#solution-task-acceptance').value='';$('#solution-task-due').value='';await logLeadActivity('solution_task_added',{task_id:r.data.id,title:r.data.title,owner:r.data.owner_type});await syncDiagnosisPhase();renderLeadDiagnosis();notify('Solution task added');
  }
  async function setSolutionTaskStatus(id,status){
    const r=await sb().from('studio_solution_tasks').update({status}).eq('id',id).select('*').single();if(r.error)return notify(r.error.message,'error');
    const i=state.solutionTasks.findIndex(x=>x.id===id);if(i>=0)state.solutionTasks[i]=r.data;await logLeadActivity('solution_task_status_changed',{task_id:id,status,title:r.data.title});await syncDiagnosisPhase();renderLeadDiagnosis();notify('Task updated');
  }
  async function recordAdminDiscoverySignal(key,answer,channel){
    const c=state.discoveryCase;if(!c||!key||!answer)return;
    const allowed=discoveryDimensions.some(([k])=>k===key);if(!allowed)return;
    const source=['whatsapp','email','call','portal'].includes(channel)?channel:'admin';
    const ins=await sb().from('studio_discovery_answers').insert({case_id:c.id,question_key:key,answer,actor_type:'admin',source_channel:source,is_read_by_admin:true}).select('*').single();if(ins.error)return notify(ins.error.message,'error');
    const up=await sb().from('studio_discovery_cases').update({[key]:answer}).eq('id',c.id).select('*').single();if(up.error)return notify(up.error.message,'error');
    state.discoveryCase=up.data;state.discoveryAnswers.unshift(ins.data);await logLeadActivity('discovery_signal_added',{question_key:key,source_channel:source,answer_preview:answer.slice(0,220)});renderLeadDiagnosis();void runDiagnosticEngine(true);
  }

  function setLeadFocusMode(on){
    const dialog=$('#lead-dialog');if(!dialog)return;
    dialog.classList.toggle('focus-mode',!!on);
    const btn=$('#lead-view-toggle');if(btn)btn.textContent=on?'SHOW DETAILS':'BACK TO SIMPLE VIEW';
  }

  function leadMissingItems(){
    const lead=state.currentLead||{},c=state.discoveryCase||{},run=state.diagnosticRun||{},analysis=run.analysis||{};
    const explicit=Array.isArray(lead.missing_information)?lead.missing_information.filter(Boolean):[];
    const systemQ=c.system_next_question||analysis.next_best_question||{};
    const dimensionGaps=discoveryDimensions.filter(([key])=>!String(c[key]||'').trim()).map(([,label,hint])=>hint||label);
    return [...new Set([
      ...explicit,
      ...(String(systemQ?.question||'').trim()?[String(systemQ.question).trim()]:[]),
      ...dimensionGaps
    ].map(x=>String(x||'').trim()).filter(Boolean))];
  }

  function clientEvidenceItems(){
    const lead=state.currentLead||{},c=state.discoveryCase||{},run=state.diagnosticRun||{},analysis=run.analysis||{};
    const explicit=Array.isArray(lead.missing_information)?lead.missing_information.filter(Boolean):[];
    const systemQ=c.system_next_question||analysis.next_best_question||{};
    return [...new Set([
      ...explicit,
      ...(String(systemQ?.question||'').trim()&&systemQ?.source!=='admin_request'?[String(systemQ.question).trim()]:[])
    ].map(x=>String(x||'').trim()).filter(Boolean))];
  }

  function internalLeadTasks(){
    return state.solutionTasks
      .filter(x=>['ats','shared'].includes(String(x.owner_type||''))&&['todo','in_progress'].includes(String(x.status||'')))
      .sort((a,b)=>Number(a.sort_order||999)-Number(b.sort_order||999));
  }

  function currentInternalLeadTask(){
    return state.solutionTasks.find(x=>['ats','shared'].includes(String(x.owner_type||''))&&x.status==='in_progress')||null;
  }

  function ensureLeadTaskWorkspace(){
    let d=$('#lead-task-workspace-dialog');
    if(d)return d;
    d=document.createElement('dialog');
    d.id='lead-task-workspace-dialog';
    d.className='lead-task-workspace-dialog';
    document.body.appendChild(d);
    return d;
  }


  async function loadTaskPlaybook(taskId,force=false){
    if(!force){
      const existing=await sb().from('studio_task_playbooks').select('*').eq('task_id',taskId).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data)return existing.data;
    }
    const generated=await sb().functions.invoke('ats-task-playbook',{body:{task_id:taskId,force}});
    if(generated.error)throw generated.error;
    if(!generated.data?.playbook)throw new Error(generated.data?.error||'ATS could not generate a task playbook.');
    return generated.data.playbook;
  }

  function playbookProgressMap(playbook){
    return new Map((Array.isArray(playbook?.progress)?playbook.progress:[]).map(x=>[String(x.id),x]));
  }

  function playbookSourceMap(playbook){
    return new Map((Array.isArray(playbook?.source_refs)?playbook.source_refs:[]).map(x=>[String(x.source_key),x]));
  }

  function renderPlaybookCheck(check,progress,sourceMap,index){
    const p=progress.get(String(check.id))||{},status=String(p.status||'pending');
    const sources=(Array.isArray(check.source_keys)?check.source_keys:[]).map(k=>sourceMap.get(String(k))).filter(Boolean);
    const sourceHtml=sources.length?'<div class="task-check-sources">'+sources.map(s=>'<a href="'+esc(s.url||'#')+'" target="_blank" rel="noopener">'+esc(s.publisher||s.source_key)+' · '+esc(s.version_label||'source')+'</a>').join('')+'</div>':'';
    const naDisabled=check.allows_na?'':' disabled';
    return '<article class="task-check '+esc(status)+'" data-playbook-check="'+esc(check.id)+'">'+
      '<div class="task-check-head"><div><span>CHECK '+(index+1)+' · '+esc(check.section||'Check')+'</span><b>'+esc(check.action||'')+'</b></div><em class="severity '+esc(check.severity_if_failed||'medium')+'">'+esc((check.severity_if_failed||'medium').toUpperCase())+'</em></div>'+
      '<div class="task-check-body">'+
        '<div><span>HOW TO TEST</span><p>'+esc(check.how_to_test||check.action||'')+'</p></div>'+
        '<div><span>PASS WHEN</span><p>'+esc(check.pass_criteria||'Expected behavior is observed and documented.')+'</p></div>'+
      '</div>'+
      sourceHtml+
      '<div class="task-check-controls">'+
        '<button type="button" data-check-status="pass" class="'+(status==='pass'?'active':'')+'">PASS</button>'+
        '<button type="button" data-check-status="issue" class="'+(status==='issue'?'active':'')+'">ISSUE</button>'+
        '<button type="button" data-check-status="na" class="'+(status==='na'?'active':'')+'"'+naDisabled+'>N/A</button>'+
      '</div>'+
      '<div class="task-check-evidence">'+
        '<label><span>NOTE / FINDING</span><textarea data-check-note placeholder="What happened? What did you observe?">'+esc(p.note||'')+'</textarea></label>'+
        '<label><span>EVIDENCE / REFERENCE</span><input data-check-evidence value="'+esc(p.evidence||'')+'" placeholder="Screenshot name, URL, metric, file reference…"></label>'+
      '</div>'+
    '</article>';
  }

  function collectPlaybookProgress(d,playbook){
    const out=[];
    (Array.isArray(playbook?.checklist)?playbook.checklist:[]).forEach(check=>{
      const row=d.querySelector('[data-playbook-check="'+CSS.escape(String(check.id))+'"]');
      if(!row)return;
      const active=row.querySelector('[data-check-status].active');
      out.push({
        id:String(check.id),
        status:active?.dataset.checkStatus||'pending',
        note:row.querySelector('[data-check-note]')?.value.trim()||'',
        evidence:row.querySelector('[data-check-evidence]')?.value.trim()||'',
        updated_at:new Date().toISOString()
      });
    });
    return out;
  }

  function summarizePlaybook(task,playbook,progress,humanReviewer=''){
    const checks=Array.isArray(playbook?.checklist)?playbook.checklist:[];
    const map=new Map(progress.map(x=>[String(x.id),x]));
    const counts={pass:0,issue:0,na:0,pending:0};
    const issues=[];
    checks.forEach(check=>{
      const p=map.get(String(check.id))||{status:'pending'};
      const st=['pass','issue','na'].includes(String(p.status))?p.status:'pending';
      counts[st]++;
      if(st==='issue')issues.push({
        section:check.section||'Check',
        severity:check.severity_if_failed||'medium',
        action:check.action||'',
        note:p.note||'No note recorded',
        evidence:p.evidence||''
      });
    });
    const lines=[
      'Task: '+task.title,
      'Method: '+(playbook.method_name||'Evidence-backed task verification'),
      'Checks: '+counts.pass+' Pass · '+counts.issue+' Issue · '+counts.na+' N/A · '+counts.pending+' Pending'
    ];
    if(issues.length){
      lines.push('Material findings:');
      issues.sort((a,b)=>({critical:4,high:3,medium:2,low:1}[b.severity]||0)-({critical:4,high:3,medium:2,low:1}[a.severity]||0)).forEach((x,i)=>{
        lines.push((i+1)+'. ['+String(x.severity).toUpperCase()+'] '+x.section+' — '+x.note+(x.evidence?' · Evidence: '+x.evidence:''));
      });
    }else lines.push('Material findings: No issues recorded in the completed checklist.');
    if(playbook.human_gate_required)lines.push('Human review: '+(humanReviewer||'Required before final client-facing conclusion.'));
    lines.push('Conclusion: '+(issues.length?'The task identified '+issues.length+' issue'+(issues.length===1?'':'s')+' requiring follow-up.':'The tested checks passed or were justified as N/A; no issue was recorded in this task.'));
    return lines.join('\n');
  }

  function validatePlaybookCompletion(playbook,progress,humanReviewer=''){
    const map=new Map(progress.map(x=>[String(x.id),x]));
    for(const check of (Array.isArray(playbook?.checklist)?playbook.checklist:[])){
      const p=map.get(String(check.id))||{status:'pending',note:'',evidence:''};
      if(check.required&&p.status==='pending')return 'Complete all required checks before closing the task.';
      if(p.status==='na'&&!check.allows_na)return 'N/A is not allowed for '+(check.section||check.id)+'.';
      if(p.status==='issue'&&!String(p.note||p.evidence||'').trim())return 'Add a note or evidence for every Issue.';
    }
    if(playbook.human_gate_required&&!String(humanReviewer||'').trim())return 'This is a high-risk task. Record the competent human reviewer before completion.';
    return '';
  }

  function renderLeadTaskWorkspace(task,playbook){
    const d=ensureLeadTaskWorkspace();
    if(!task||!playbook)return;
    const started=task.started_at?new Date(task.started_at).toLocaleString():'Just started';
    const progress=playbookProgressMap(playbook),sourceMap=playbookSourceMap(playbook);
    const sources=Array.isArray(playbook.source_refs)?playbook.source_refs:[];
    d.dataset.taskId=task.id;d.dataset.playbookId=playbook.id;
    d.innerHTML=
      '<div class="lead-task-dialog-head"><div><span>EVIDENCE-BACKED ATS TASK</span><h3>'+esc(task.title)+'</h3><small>'+esc(playbook.method_name||'Task playbook')+' · '+esc(String(playbook.risk_level||'medium').toUpperCase())+' RISK · Started '+esc(started)+'</small></div><button type="button" data-lead-task-close>×</button></div>'+
      '<div class="task-playbook-banner '+(playbook.human_gate_required?'gate':'')+'"><div><span>OBJECTIVE</span><b>'+esc(playbook.objective||task.rationale||task.title)+'</b></div><div class="task-playbook-badges"><i>'+esc(String(playbook.domain||'general').replaceAll('_',' ').toUpperCase())+'</i>'+(playbook.human_gate_required?'<i class="gate">HUMAN REVIEW REQUIRED</i>':'<i>SOURCE-GROUNDED</i>')+'</div></div>'+
      '<div class="task-checklist">'+(Array.isArray(playbook.checklist)&&playbook.checklist.length?playbook.checklist.map((x,i)=>renderPlaybookCheck(x,progress,sourceMap,i)).join(''):'<div class="ops-empty">No checklist generated.</div>')+'</div>'+
      (playbook.human_gate_required?'<div class="task-human-gate"><span>COMPETENT HUMAN REVIEW</span><p>AI assists evidence collection only. Record the reviewer before a final client-facing conclusion.</p><div><input id="task-human-reviewer" value="'+esc(playbook.human_reviewed_by||'')+'" placeholder="Reviewer name / role"><input id="task-human-review-note" value="'+esc(playbook.human_review_note||'')+'" placeholder="Review note (optional)"></div></div>':'')+
      '<details class="task-source-panel"><summary>SOURCES & METHOD BASIS · '+sources.length+'</summary><div>'+sources.map(s=>'<a href="'+esc(s.url||'#')+'" target="_blank" rel="noopener"><b>'+esc(s.title||s.source_key)+'</b><small>'+esc((s.publisher||'Source')+' · '+(s.version_label||'')+' · Authority tier '+(s.authority_tier||'—'))+'</small></a>').join('')+'</div><p>'+esc(playbook.completion_rule||'')+'</p></details>'+
      '<div class="lead-task-dialog-actions"><button type="button" class="secondary" data-lead-task-close>CLOSE</button><button type="button" class="secondary" id="lead-task-save">SAVE PROGRESS</button><button type="button" class="primary" id="lead-task-complete">COMPLETE & START NEXT →</button></div>';
    d.querySelectorAll('[data-lead-task-close]').forEach(b=>b.onclick=()=>d.close());
    d.querySelectorAll('[data-check-status]').forEach(btn=>btn.onclick=()=>{
      const row=btn.closest('[data-playbook-check]');if(!row||btn.disabled)return;
      row.querySelectorAll('[data-check-status]').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      row.classList.remove('pending','pass','issue','na');
      row.classList.add(btn.dataset.checkStatus||'pending');
    });
    $('#lead-task-save',d).onclick=()=>savePlaybookTaskProgress(task,playbook,false,d);
    $('#lead-task-complete',d).onclick=()=>savePlaybookTaskProgress(task,playbook,true,d);
  }

  async function openCurrentLeadTaskWorkspace(taskId=null){
    let task=(taskId?state.solutionTasks.find(x=>x.id===taskId):currentInternalLeadTask())||internalLeadTasks().find(x=>x.status==='todo');
    if(!task)return notify('No active ATS task found.','error');
    if(task.status==='todo'){
      const now=new Date().toISOString();
      const r=await sb().from('studio_solution_tasks').update({status:'in_progress',started_at:now,updated_at:now}).eq('id',task.id).eq('status','todo').select('*').single();
      if(r.error)return notify(r.error.message,'error');
      task=r.data;
      const i=state.solutionTasks.findIndex(x=>x.id===task.id);if(i>=0)state.solutionTasks[i]=task;
      await logLeadActivity('solution_task_started',{task_id:task.id,title:task.title,task_type:task.task_type});
      renderLeadDiagnosis();renderLeadExecutionPath(executionCtx);
    }
    const d=ensureLeadTaskWorkspace();
    d.innerHTML='<div class="task-playbook-loading"><b>ATS is preparing the evidence-backed playbook…</b><small>Loading task method, checklist and approved sources.</small></div>';
    if(!d.open)d.showModal();
    try{
      const playbook=await loadTaskPlaybook(task.id,false);
      renderLeadTaskWorkspace(task,playbook);
    }catch(error){
      d.close();
      notify(error?.message||'Could not prepare the ATS task playbook.','error');
      throw error;
    }
  }

  async function savePlaybookTaskProgress(task,playbook,complete,d){
    const progress=collectPlaybookProgress(d,playbook);
    const humanReviewer=$('#task-human-reviewer',d)?.value.trim()||'';
    const humanReviewNote=$('#task-human-review-note',d)?.value.trim()||'';
    const now=new Date().toISOString();
    if(complete){
      const validation=validatePlaybookCompletion(playbook,progress,humanReviewer);
      if(validation)return notify(validation,'error');
    }
    const playbookPatch={
      progress,
      human_reviewed_by:playbook.human_gate_required?(humanReviewer||null):null,
      human_reviewed_at:playbook.human_gate_required&&humanReviewer?now:null,
      human_review_note:playbook.human_gate_required?(humanReviewNote||null):null,
      updated_at:now
    };
    if(complete)playbookPatch.status='completed';
    const pb=await sb().from('studio_task_playbooks').update(playbookPatch).eq('id',playbook.id).select('*').single();
    if(pb.error)return notify(pb.error.message,'error');
    if(!complete){
      await logLeadActivity('solution_task_progress_saved',{task_id:task.id,title:task.title,playbook_id:playbook.id,checks_resolved:progress.filter(x=>x.status!=='pending').length,total_checks:progress.length});
      return notify('Checklist progress saved.');
    }

    const summary=summarizePlaybook(task,pb.data,progress,humanReviewer);
    const pbSummary=await sb().from('studio_task_playbooks').update({result_summary:summary,updated_at:now}).eq('id',playbook.id);
    if(pbSummary.error)return notify(pbSummary.error.message,'error');
    const taskPatch={result_summary:summary,status:'done',completed_at:now,updated_at:now};
    const r=await sb().from('studio_solution_tasks').update(taskPatch).eq('id',task.id).select('*').single();
    if(r.error)return notify(r.error.message,'error');
    let i=state.solutionTasks.findIndex(x=>x.id===task.id);if(i>=0)state.solutionTasks[i]=r.data;
    await logLeadActivity('solution_task_completed',{
      task_id:r.data.id,title:r.data.title,playbook_id:playbook.id,
      result_summary:summary.slice(0,1200),
      pass:progress.filter(x=>x.status==='pass').length,
      issues:progress.filter(x=>x.status==='issue').length,
      na:progress.filter(x=>x.status==='na').length,
      risk_level:playbook.risk_level||null,
      human_gate_required:!!playbook.human_gate_required,
      human_reviewer:humanReviewer||null,
      source_keys:(Array.isArray(playbook.source_refs)?playbook.source_refs:[]).map(x=>x.source_key).filter(Boolean)
    });

    const next=state.solutionTasks
      .filter(x=>['ats','shared'].includes(String(x.owner_type||''))&&x.status==='todo')
      .sort((a,b)=>Number(a.sort_order||999)-Number(b.sort_order||999))[0]||null;
    if(next){
      const started=await sb().from('studio_solution_tasks').update({status:'in_progress',started_at:now,updated_at:now}).eq('id',next.id).eq('status','todo').select('*').single();
      if(!started.error&&started.data){
        i=state.solutionTasks.findIndex(x=>x.id===next.id);if(i>=0)state.solutionTasks[i]=started.data;
        await logLeadActivity('solution_task_started',{task_id:started.data.id,title:started.data.title,task_type:started.data.task_type,auto_started_after:r.data.id});
      }
    }
    d.close();
    await syncDiagnosisPhase();
    renderLeadDiagnosis();renderLeadExecutionPath(executionCtx);
    notify(next?'Task completed from evidence · next ATS task started.':'Task completed from evidence.');
  }


  async function startInternalLeadWork(){
    const tasks=internalLeadTasks();
    const active=tasks.find(x=>x.status==='in_progress');
    if(active)return openCurrentLeadTaskWorkspace(active.id);
    const task=tasks.find(x=>x.status==='todo');
    if(!task)return notify('Approve the next steps first.','error');
    return openCurrentLeadTaskWorkspace(task.id);
  }

  function leadUnderstanding(){
    const lead=state.currentLead||{},c=state.discoveryCase||{},run=state.diagnosticRun||{},analysis=run.analysis||{};
    return String(
      c.root_problem||
      c.system_problem_statement||
      analysis?.problem_framing?.root_problem_candidate||
      lead.ats_understanding||
      c.current_state||
      lead.project_goal||
      ''
    ).trim();
  }

  function safeProposedTasks(){
    const stage=String(state.discoveryCase?.decision_stage||'needs_evidence');
    const allowed=stage==='needs_evidence'
      ?new Set(['investigate','client_action'])
      :stage==='needs_validation'
        ?new Set(['investigate','client_action','verification'])
        :null;
    return state.solutionTasks.filter(x=>x.status==='proposed'&&(!allowed||allowed.has(String(x.task_type||''))));
  }

  async function publishLeadEvidenceRequest(){
    const lead=state.currentLead,c=state.discoveryCase||{},items=clientEvidenceItems().filter(x=>!String(x).startsWith('مطلوب من ATS')&&!String(x).startsWith('ATS needs')).slice(0,6);
    if(!lead||!c?.id)return notify('Open a lead with an active discovery case first.','error');
    if(String(c.analysis_state||'')!=='ready')return notify('Run ATS Understanding first so the request is based on the latest case evidence.','error');
    if(!items.length)return notify('No missing client information is currently identified.','error');
    const whatsappPopup=normalizeWhatsAppNumber(lead.phone)?window.open('about:blank','_blank'):null;
    const arabic=/[\u0600-\u06ff]/.test(String(lead.project_goal||lead.ats_understanding||lead.full_name||''));
    const question=(arabic?'مطلوب من ATS علشان نكمل تقييم الطلب بدقة:\n':'ATS needs the following to complete the assessment accurately:\n')+items.map((x,i)=>(i+1)+'. '+x).join('\n');
    const reason=arabic?'جاوب بالمعلومات المتاحة وارفع الصور أو الفيديوهات أو الملفات المرتبطة مباشرة بالطلب. مش مطلوب منك تجهيز بريف جديد.':'Reply with what you know and upload any directly relevant photos, videos or files. You do not need to prepare a new brief.';
    const decisionValue=arabic?'بعد وصول الرد والملفات، ATS هيعيد التحليل ويحوّل المعلومات لخطوات عمل مبررة.':'After your response and files arrive, ATS will re-analyze the case and turn the evidence into justified next steps.';
    const publishedAt=new Date().toISOString();
    const request={question,reason,decision_value:decisionValue,source:'admin_request',published_at:publishedAt,requested_items:items};
    const caseUpdate=await sb().from('studio_discovery_cases').update({system_next_question:request,system_next_action:'Waiting for client evidence in Client Portal',updated_at:publishedAt}).eq('id',c.id).select('*').single();
    if(caseUpdate.error)return notify(caseUpdate.error.message,'error');
    const leadUpdate=await sb().from('studio_leads').update({status:['new','contacted','reviewing'].includes(lead.status)?'discovery':lead.status,next_action:'Waiting for client response in Client Portal',updated_at:publishedAt}).eq('id',lead.id).select('*').single();
    if(leadUpdate.error)return notify(leadUpdate.error.message,'error');
    state.discoveryCase=caseUpdate.data;
    const li=state.leads.findIndex(x=>x.id===lead.id);if(li>=0)state.leads[li]=leadUpdate.data;state.currentLead=leadUpdate.data;
    let accessCode=null;
    try{
      const issued=await sb().rpc('studio_admin_issue_client_access_code',{p_lead_id:lead.id,p_ttl_minutes:1440});
      if(!issued.error&&issued.data?.code){accessCode=issued.data;renderClientAccessCode(issued.data);openClientAccessWhatsApp(issued.data,whatsappPopup)}
    }catch(_){try{whatsappPopup?.close()}catch(__){}}
    await logLeadActivity('client_portal_request_published',{summary:'Evidence request published to Client Portal',requested_items:items,published_at:publishedAt});
    renderLeadDiagnosis();renderLeadExecutionPath(executionCtx);
    notify(accessCode?.code?(normalizeWhatsAppNumber(lead.phone)?'Request published · WhatsApp message is ready to send.':'Request published · add WhatsApp number to send access.'):'Request published to Client Portal.');
  }

  async function approveSuggestedNextSteps(){
    const tasks=safeProposedTasks();
    if(!tasks.length)return notify('No safe proposed next steps are ready to approve at this stage.','error');
    const ids=tasks.map(x=>x.id);
    const r=await sb().from('studio_solution_tasks').update({status:'todo'}).in('id',ids).eq('status','proposed').select('*');
    if(r.error)return notify(r.error.message,'error');
    (r.data||[]).forEach(row=>{const i=state.solutionTasks.findIndex(x=>x.id===row.id);if(i>=0)state.solutionTasks[i]=row});
    await logLeadActivity('solution_tasks_batch_approved',{task_ids:ids,titles:tasks.map(x=>x.title),decision_stage:state.discoveryCase?.decision_stage||null});
    await syncDiagnosisPhase();renderLeadDiagnosis();notify((r.data||[]).length+' next step'+((r.data||[]).length===1?'':'s')+' approved.');
  }

  function renderLeadExecutionPath(ctx=executionCtx){
    const lead=state.currentLead;if(!lead)return;
    executionCtx=ctx||executionCtx||{};
    const proposal=executionCtx.proposal||null,deposit=executionCtx.deposit||null,project=executionCtx.project||null,taskCount=Number(executionCtx.taskCount||0);
    const c=state.discoveryCase||{},op=operatingGateState(),body=state.deliveryBlueprint?.blueprint||{};
    const portalRequestOpen=String(c.analysis_state||'')==='ready'&&c.system_next_question?.source==='admin_request';
    const leadReady=['qualified','proposal_sent','negotiation','won'].includes(lead.status);
    const proposalCreated=!!proposal,proposalAccepted=proposal?.status==='accepted',depositPaid=deposit?.status==='paid',projectLive=!!project;
    const understanding=leadUnderstanding();
    const clientMissing=clientEvidenceItems();
    const blueprintGaps=Array.isArray(body.evidence_gaps)?body.evidence_gaps.filter(Boolean):[];
    const effectiveClientMissing=[...new Set([...blueprintGaps,...clientMissing])].slice(0,6);
    const deliveryDomains=op.domains;

    const understandDone=op.understood&&!!understanding;
    const planDone=op.blueprintReady;
    const agreeDone=proposalAccepted&&depositPaid;
    const deliverDone=projectLive&&taskCount>0;
    const steps=[
      {label:'01 · UNDERSTAND',value:understandDone?'Understood':op.needsEvidence?'Needs client/admin input':String(c.analysis_state||'never_analyzed').replaceAll('_',' '),done:understandDone,current:!understandDone},
      {label:'02 · STRUCTURE',value:planDone?(deliveryDomains.length+' accountable domain'+(deliveryDomains.length===1?'':'s')):'Waiting',done:planDone,current:understandDone&&!planDone,locked:!understandDone},
      {label:'03 · AGREE',value:agreeDone?'Accepted + paid':proposalCreated?String(proposal.status||'proposal').replaceAll('_',' '):op.scopeApproved?'Ready for offer':'Waiting',done:agreeDone,current:op.scopeApproved&&!agreeDone,locked:!op.scopeApproved&&!proposalCreated},
      {label:'04 · DELIVER',value:projectLive?(taskCount?taskCount+' team task'+(taskCount===1?'':'s')+' live':'Project live'):'Not started',done:deliverDone,current:agreeDone&&!deliverDone,locked:!agreeDone}
    ];
    $('#lead-execution-steps').innerHTML=steps.map(s=>'<div class="lead-execution-step '+(s.done?'done ':s.current?'current ':s.locked?'locked ':'')+'"><span>'+esc(s.label)+'</span><b>'+esc(s.value)+'</b></div>').join('');

    let needTitle='ATS is understanding the request',needDetail='No team work is created until the client/Admin understanding gate is complete.';
    if(portalRequestOpen){
      needTitle='Waiting for client response in Client Portal';
      needDetail='Only the requested details or evidence are needed. The team is not involved yet.';
    }else if(projectLive){
      needTitle=taskCount?'Delivery is running by accountable domains':'Activate the delivery domains';
      needDetail=(project.project_code||'Project')+' · Admin follows Domain Leads and outcomes, not every subtask.';
    }else if(op.needsEvidence){
      needTitle=effectiveClientMissing.length?'Close the remaining understanding gap':'Review the request with the client';
      needDetail=effectiveClientMissing.length?effectiveClientMissing.slice(0,3).join(' • '):String(c.system_next_action||'Collect only the information that can change the project decision.');
    }else if(op.blueprintReady&&!op.scopeApproved){
      needTitle='Confirm the delivery structure';
      needDetail=deliveryDomains.length+' professional domain'+(deliveryDomains.length===1?'':'s')+' ready. Confirm once, then prepare the commercial offer.';
    }else if(op.scopeApproved&&!proposalCreated){
      needTitle='Prepare the client offer';
      needDetail='Scope is approved. ATS will prefill the proposal from the domain outcomes; you only finish the commercial terms.';
    }else if(!planDone&&op.understood){
      needTitle='ATS is structuring delivery';
      needDetail='Turning the approved understanding into accountable domains, outcomes and team-ready work.';
    }

    const checklist=$('#lead-start-checklist');
    checklist.innerHTML=
      '<div class="lead-simple-grid">'+
        '<article class="lead-simple-card understood"><span>ATS UNDERSTANDS</span><b>'+esc(understanding||'Still analyzing the request…')+'</b><small>'+esc((lead.service||'Client request')+' · '+Number(c.system_confidence||c.diagnosis_confidence||0)+'% working confidence')+'</small></article>'+
        '<article class="lead-simple-card next"><span>NEED NOW</span><b>'+esc(needTitle)+'</b><small>'+esc(needDetail)+'</small></article>'+
      '</div>';

    const plan=$('#lead-plan-preview');
    if(op.blueprintReady){
      plan.innerHTML=
        '<div class="lead-plan-head"><div><span>DELIVERY BLUEPRINT</span><b>'+deliveryDomains.length+' accountable domain'+(deliveryDomains.length===1?'':'s')+'</b></div><small>Admin approves outcomes. Each Domain Lead owns the internal task plan and team delivery.</small></div>'+
        '<div class="lead-plan-items">'+deliveryDomains.map((d,i)=>'<article class="lead-plan-item approved"><span>DOMAIN '+(i+1)+' · '+esc(String(d.domain_key||'delivery').replaceAll('_',' ').toUpperCase())+'</span><b>'+esc(d.name||d.domain_key||'Delivery')+'</b><small>'+esc(d.expected_outcome||'Defined outcome')+'</small><small>Accountable skill: '+esc(d.lead_skill||'project management')+(d.human_gate_required?' · Human review required':'')+'</small></article>').join('')+'</div>';
    }else if(op.needsEvidence){
      plan.innerHTML='<div class="lead-plan-head"><div><span>DELIVERY STRUCTURE</span><b>Not released to the team yet</b></div><small>Client + Admin understanding remains private until the decision-critical evidence gap is closed.</small></div>';
    }else{
      plan.innerHTML='<div class="lead-plan-head"><div><span>DELIVERY STRUCTURE</span><b>ATS is building the accountable domains</b></div><small>No diagnostic checklist needs to be executed by Admin. Required validation becomes delivery work under the right Domain Lead.</small></div>';
    }

    const title=$('#lead-execution-title'),copy=$('#lead-execution-copy'),btn=$('#lead-execution-primary');
    title.textContent=projectLive?'Project delivery':lead.full_name+' · '+(lead.service||'New request');
    copy.textContent=projectLive
      ?(project.project_code||'Project')+' · Admin manages accountable Domain Leads and final outcomes.'
      :'Client + Admin understand first. After scope approval, ATS turns the case into accountable delivery domains automatically.';
    btn.dataset.action='';btn.dataset.id='';btn.dataset.newTask='0';btn.disabled=false;

    if(projectLive){
      btn.textContent='OPEN PROJECT DELIVERY →';btn.dataset.action='open-project';btn.dataset.id=project.id;
    }else if(proposalAccepted&&deposit&&!depositPaid){
      btn.textContent='CONFIRM RECEIVED DEPOSIT →';btn.dataset.action='confirm-deposit';btn.dataset.id=deposit.id;
    }else if(proposal?.status==='sent'){
      btn.textContent='CONFIRM CLIENT ACCEPTANCE →';btn.dataset.action='accept-proposal';btn.dataset.id=proposal.id;
    }else if(proposalCreated){
      btn.textContent='OPEN PROPOSAL →';btn.dataset.action='open-proposal';btn.dataset.id=proposal.id;
    }else if(op.blueprintReady&&!op.scopeApproved){
      btn.textContent='CONFIRM SCOPE & PREPARE OFFER →';btn.dataset.action='prepare-offer';
    }else if(leadReady&&op.scopeApproved){
      btn.textContent='CREATE PROPOSAL →';btn.dataset.action='create-proposal';
    }else if(['never_analyzed','stale','error'].includes(String(c.analysis_state||''))){
      btn.textContent='RUN ATS UNDERSTANDING →';btn.dataset.action='analysis';
    }else if(String(c.analysis_state||'')==='analyzing'){
      btn.textContent='ATS IS ANALYZING…';btn.disabled=true;
    }else if(portalRequestOpen){
      btn.textContent='SEND / RESEND ACCESS ON WHATSAPP →';btn.dataset.action='whatsapp-access';
    }else if(op.needsEvidence&&effectiveClientMissing.length){
      btn.textContent='SEND TO CLIENT PORTAL →';btn.dataset.action='publish-evidence';
    }else if(op.understood&&!op.blueprintReady){
      btn.textContent='BUILD DELIVERY STRUCTURE →';btn.dataset.action='build-blueprint';
    }else{
      btn.textContent='REVIEW UNDERSTANDING →';btn.dataset.action='diagnosis';
    }
  }

  async function refreshLeadExecutionPath(){
    const lead=state.currentLead;if(!lead)return;
    const [pr,pay,proj]=await Promise.all([
      sb().from('studio_proposals').select('id,proposal_code,title,status,created_at').eq('lead_id',lead.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      sb().from('studio_payments').select('id,payment_code,status,payment_type,created_at').eq('lead_id',lead.id).eq('payment_type','deposit').order('created_at',{ascending:false}).limit(1).maybeSingle(),
      sb().from('studio_projects').select('id,project_code,title,status,stage,source_lead_id').eq('source_lead_id',lead.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    const failed=[pr,pay,proj].find(x=>x.error);if(failed){renderLeadExecutionPath();return}
    let taskCount=0;
    if(proj.data){
      const q=await sb().from('studio_project_tasks').select('id',{count:'exact',head:true}).eq('project_id',proj.data.id);
      if(!q.error)taskCount=q.count||0;
    }
    executionCtx={proposal:pr.data,deposit:pay.data,project:proj.data,taskCount};renderLeadExecutionPath(executionCtx);
  }

  function updateLeadWorkspaceState(){
    const status=$('#lead-status').value||'new',x=state.currentLead,op=operatingGateState();
    $('#lead-workspace-status').className='status-chip '+status;$('#lead-workspace-status').textContent=leadStatusLabels[status]||status;
    $('#lead-lost-wrap').classList.toggle('hidden',status!=='lost');
    const existingCommercial=['proposal_sent','negotiation'].includes(status);
    const proposalReady=existingCommercial||(status==='qualified'&&op.scopeApproved&&!op.needsEvidence);
    $('#lead-create-proposal').classList.toggle('hidden',!proposalReady);
    const gateText=$('#lead-proposal-gate');gateText.classList.toggle('hidden',proposalReady);
    if(!proposalReady)gateText.textContent=op.needsEvidence?'Client/Admin understanding must be completed before commercial handoff.':op.blueprintReady?'Confirm the Delivery Blueprint once before creating the proposal.':'ATS is still structuring the delivery scope.';
    const due=$('#lead-next-due').value?new Date($('#lead-next-due').value).getTime():0,overdue=due&&due<Date.now()&&!['won','lost'].includes(status);
    const warning=$('#lead-next-warning');
    if(overdue){warning.textContent='OVERDUE · This follow-up needs attention.';warning.className='lead-next-warning overdue'}
    else if(!$('#lead-next-action').value&&!['won','lost'].includes(status)){warning.textContent='Set one clear next action before leaving this lead.';warning.className='lead-next-warning'}
    else{warning.textContent='';warning.className='lead-next-warning'}
    if(status==='won'&&x?.existing_client_id){warning.textContent='Converted client · manage delivery from Client Projects.';warning.className='lead-next-warning success'}
  }
  async function openLead(id){
    const x=state.leads.find(v=>v.id===id);if(!x)return;
    state.currentLead=x;state.leadActivities=[];state.discoveryCase=null;state.discoveryAnswers=[];state.rootCauses=[];state.solutionTasks=[];state.diagnosticRun=null;state.deliveryBlueprint=null;
    const cards=parseLeadBrief(x.project_goal);
    $('#lead-dialog-title').textContent=x.full_name||'Lead';$('#lead-dialog-code').textContent=x.lead_code||'—';$('#lead-workspace-source').textContent=(x.source||'website').replaceAll('_',' ');$('#lead-workspace-received').textContent='Received '+fmt(x.created_at);
    $('#lead-dialog-summary').innerHTML=[
      ['Email',x.email],['Phone / WhatsApp',x.phone],['Company',x.company_name||'Individual'],['Service',x.service],['Timeline',x.timeline],['Budget',x.budget_range]
    ].map(v=>'<div><span>'+esc(v[0].toUpperCase())+'</span><b>'+esc(v[1]||'—')+'</b></div>').join('');
    $('#lead-brief-grid').innerHTML=cards.slice(0,10).map(c=>'<article><span>'+esc(c.label.toUpperCase())+'</span><p dir="auto">'+esc(c.value)+'</p></article>').join('');
    $('#lead-goal').textContent=x.project_goal||'No project goal recorded.';
    const assets=(x.current_assets||[]);$('#lead-assets').innerHTML=assets.length?assets.map(a=>'<span>'+esc(a)+'</span>').join(''):'<em>No structured assets listed.</em>';
    $('#lead-understanding').value=suggestedUnderstanding(x,cards);
    $('#lead-missing-info').value=suggestedMissing(x,cards).join('\n');
    $('#lead-status').value=x.status||'new';$('#lead-fit').value=x.fit||'';$('#lead-fit-reason').value=x.fit_reason||'';$('#lead-next-action').value=x.next_action||'';$('#lead-next-due').value=dateTimeLocal(x.next_action_due_at);$('#lead-contact-preference').value=x.preferred_contact_channel||'';$('#lead-notes').value=x.internal_notes||'';$('#lead-lost-reason').value=x.lost_reason||'';
    $('#lead-contact-channel').value=x.preferred_contact_channel||'whatsapp';$('#lead-contact-outcome').value='contacted';$('#lead-contact-summary').value='';$('#lead-contact-signal').value='';
    state.clientAccessCode=null;$('#client-access-code').textContent='------';$('#client-access-code-state').textContent=x.email?'No active code shown. Generate a new code when the client is ready.':'Add an email before generating Client Access.';$('#copy-client-access-code').classList.add('hidden');$('#share-client-access-wa').classList.add('hidden');$('#issue-client-access-code').disabled=!x.email;$('#client-access-link').textContent=location.origin+'/client-access/';
    $('#lead-last-contact').textContent=x.last_contacted_at?'Last contact '+fmt(x.last_contacted_at):'No contact logged';
    const mail=$('#lead-email-link');mail.href=x.email?'mailto:'+encodeURIComponent(x.email):'#';mail.classList.toggle('hidden',!x.email);
    const wa=$('#lead-wa-link');const digits=String(x.phone||'').replace(/\D/g,'');wa.href=digits?'https://wa.me/'+digits:'#';wa.classList.toggle('hidden',!digits);
    updateLeadWorkspaceState();setLeadFocusMode(true);$('#lead-dialog').showModal();await Promise.all([loadLeadTimeline(x.id),loadLeadDiagnosis(x.id)]);await refreshLeadExecutionPath();
  }
  function normalizeWhatsAppNumber(raw){
    let digits=String(raw||'').replace(/\D/g,'');
    if(digits.startsWith('00'))digits=digits.slice(2);
    if(/^01\d{9}$/.test(digits))digits='20'+digits.slice(1);
    return digits;
  }

  function clientAccessWhatsAppUrl(data,lead=state.currentLead){
    const digits=normalizeWhatsAppNumber(lead?.phone);
    if(!digits||!data?.code)return '';
    const email=String(lead?.email||'').trim().toLowerCase();
    const link=location.origin+'/client-access/?email='+encodeURIComponent(email);
    const arabic=/[\u0600-\u06ff]/.test(String(lead?.full_name||lead?.project_goal||''));
    const firstName=String(lead?.full_name||'').trim()||'';
    const msg=arabic
      ?'أهلاً '+firstName+'،\n\nATS محتاج منك استكمال بعض المعلومات الخاصة بطلبك.\n\nافتح مساحة العميل من هنا:\n'+link+'\n\nكود الدخول: '+data.code+'\n\nالكود صالح لمدة 24 ساعة ويستخدم مرة واحدة. بعد الدخول هتلاقي طلب ATS وتقدر ترد وترفع الصور والفيديوهات والملفات المطلوبة من نفس الصفحة.'
      :'Hi '+firstName+',\n\nATS needs a few details to continue your request.\n\nOpen your Client Access here:\n'+link+'\n\nAccess code: '+data.code+'\n\nThe code is valid for 24 hours and can be used once. Inside Client Access you can reply and upload the requested photos, videos and files.';
    return 'https://wa.me/'+digits+'?text='+encodeURIComponent(msg);
  }

  function openClientAccessWhatsApp(data,popup=null){
    const url=clientAccessWhatsAppUrl(data);
    if(!url){try{popup?.close()}catch(_){ } return false}
    try{
      if(popup&&!popup.closed)popup.location.href=url;
      else window.open(url,'_blank','noopener');
      return true;
    }catch(_){
      try{popup?.close()}catch(__){}
      return false;
    }
  }

  function renderClientAccessCode(data){
    const x=state.currentLead,code=$('#client-access-code'),stateEl=$('#client-access-code-state'),copy=$('#copy-client-access-code'),share=$('#share-client-access-wa');
    state.clientAccessCode=data||null;
    if(!data?.code){code.textContent='------';copy.classList.add('hidden');share.classList.add('hidden');return}
    code.textContent=data.code;
    const exp=data.expires_at?new Date(data.expires_at):null;
    stateEl.textContent=exp?'Valid until '+exp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · one-time use · max 5 attempts':'One-time access code';
    copy.classList.remove('hidden');
    const url=clientAccessWhatsAppUrl(data,x);
    if(url){share.href=url;share.textContent='SEND ACCESS ON WHATSAPP →';share.classList.remove('hidden')}
    else share.classList.add('hidden');
  }

  async function issueAndOpenClientAccessWhatsApp(){
    const lead=state.currentLead;if(!lead)return;
    if(!lead.email)return notify('Add the client email first.','error');
    if(!normalizeWhatsAppNumber(lead.phone))return notify('Add the client WhatsApp number first.','error');
    const popup=window.open('about:blank','_blank');
    try{
      const {data,error}=await sb().rpc('studio_admin_issue_client_access_code',{p_lead_id:lead.id,p_ttl_minutes:1440});
      if(error)throw error;
      renderClientAccessCode(data);
      const opened=openClientAccessWhatsApp(data,popup);
      notify(opened?'WhatsApp message is ready to send.':'Access code generated · open WhatsApp from Details.');
      await loadLeadTimeline(lead.id);
    }catch(error){
      try{popup?.close()}catch(_){}
      notify(error.message||'Could not prepare WhatsApp access.','error');
    }
  }

  async function issueClientAccessCode(){
    const x=state.currentLead;if(!x)return;
    if(!x.email)return notify('Add an email before generating Client Access','error');
    const btn=$('#issue-client-access-code');btn.disabled=true;const old=btn.textContent;btn.textContent='GENERATING…';
    try{
      const ttl=Math.max(10,Math.min(1440,Number($('#client-access-ttl').value||60)));
      const {data,error}=await sb().rpc('studio_admin_issue_client_access_code',{p_lead_id:x.id,p_ttl_minutes:ttl});
      if(error)throw error;
      renderClientAccessCode(data);
      notify('Client Access Code generated');
      await loadLeadTimeline(x.id);
    }catch(error){notify(error.message||'Could not generate Client Access Code','error')}
    finally{btn.disabled=false;btn.textContent=old}
  }
  async function copyClientAccessCode(){
    const code=state.clientAccessCode?.code;if(!code)return;
    try{await navigator.clipboard.writeText(code);notify('Access code copied')}
    catch{notify('Copy failed — select the code manually','error')}
  }

  async function saveLead(close=true){
    const x=state.currentLead;if(!x)return false;
    const status=$('#lead-status').value,fit=$('#lead-fit').value||null,nextAction=$('#lead-next-action').value||null,dueAt=localToIso($('#lead-next-due').value);
    const lostReason=$('#lead-lost-reason').value.trim()||null,understanding=$('#lead-understanding').value.trim();
    if(status==='lost'&&!lostReason){notify('Add a lost reason before closing this lead','error');$('#lead-lost-reason').focus();return false}
    if(status==='qualified'&&!fit){notify('Set the ATS fit before qualifying this lead','error');$('#lead-fit').focus();return false}
    if(status==='qualified'&&!understanding){notify('Write the ATS understanding before qualifying this lead','error');$('#lead-understanding').focus();return false}
    if(status==='qualified'&&x.status!=='qualified'&&!diagnosisGateState().ready){notify('Complete the Diagnosis Gate before qualifying this lead','error');return false}
    const patch={
      status,fit,fit_reason:$('#lead-fit-reason').value.trim()||null,
      ats_understanding:understanding||null,
      missing_information:$('#lead-missing-info').value.split('\n').map(v=>v.trim()).filter(Boolean),
      next_action:nextAction,next_action_due_at:dueAt,
      preferred_contact_channel:$('#lead-contact-preference').value||null,
      internal_notes:$('#lead-notes').value.trim()||null,
      lost_reason:status==='lost'?lostReason:null
    };
    const before={status:x.status,next_action:x.next_action,next_action_due_at:x.next_action_due_at};
    const r=await sb().from('studio_leads').update(patch).eq('id',x.id).select('*').single();
    if(r.error){notify(r.error.message,'error');return false}
    const i=state.leads.findIndex(v=>v.id===x.id);if(i>=0)state.leads[i]=r.data;state.currentLead=r.data;
    if(before.status!==r.data.status)await logLeadActivity('lead_status_changed',{from:before.status,to:r.data.status});
    if(before.next_action!==r.data.next_action||String(before.next_action_due_at||'')!==String(r.data.next_action_due_at||''))await logLeadActivity('lead_next_action_changed',{next_action:r.data.next_action,due_at:r.data.next_action_due_at});
    notify('Lead workspace saved');renderLeads();state.loaded.dashboard=false;void loadDashboard(true);updateLeadWorkspaceState();setLeadFocusMode(true);void refreshLeadExecutionPath();
    if(close)$('#lead-dialog').close();
    return true;
  }
  async function startDiscovery(){
    if(!state.currentLead)return;
    if(['new','contacted','reviewing'].includes($('#lead-status').value))$('#lead-status').value='discovery';
    if(!$('#lead-next-action').value)$('#lead-next-action').value='Discovery call';
    if(!$('#lead-next-due').value){const d=new Date(Date.now()+24*60*60*1000);$('#lead-next-due').value=dateTimeLocal(d)}
    updateLeadWorkspaceState();
    const ok=await saveLead(false);if(ok)await logLeadActivity('lead_discovery_started',{summary:'Discovery workflow started'});
  }
  async function logLeadContact(){
    const x=state.currentLead;if(!x)return;
    const channel=$('#lead-contact-channel').value,outcome=$('#lead-contact-outcome').value,summary=$('#lead-contact-summary').value.trim(),signal=$('#lead-contact-signal').value;
    if(!summary)return notify('Add a short interaction summary','error');
    const now=new Date().toISOString();
    const patch={last_contacted_at:now,preferred_contact_channel:channel};
    if(x.status==='new')patch.status='contacted';
    const beforeStatus=x.status;
    const r=await sb().from('studio_leads').update(patch).eq('id',x.id).select('*').single();if(r.error)return notify(r.error.message,'error');
    const i=state.leads.findIndex(v=>v.id===x.id);if(i>=0)state.leads[i]=r.data;state.currentLead=r.data;
    $('#lead-status').value=r.data.status;$('#lead-contact-preference').value=channel;$('#lead-last-contact').textContent='Last contact '+fmt(now);$('#lead-contact-summary').value='';
    if(beforeStatus!==r.data.status)await logLeadActivity('lead_status_changed',{from:beforeStatus,to:r.data.status});
    await logLeadActivity('lead_contact_logged',{channel,outcome,summary});
    if(signal)await recordAdminDiscoverySignal(signal,summary,channel);
    $('#lead-contact-signal').value='';
    notify(signal?'Interaction logged and added to discovery':'Interaction added to timeline');renderLeads();state.loaded.dashboard=false;state.loaded.inbox=false;void loadDashboard(true);updateLeadWorkspaceState();
  }

  function fillLeadOptions(selectId,selected){
    const sel=$(selectId);if(!sel)return;
    sel.innerHTML='<option value="">Select lead</option>'+state.leads.filter(x=>!['lost','won'].includes(x.status)).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc((x.lead_code||'Lead')+' · '+(x.full_name||'Unnamed'))+'</option>').join('');
  }
  function proposalDraftFromBlueprint(leadId){
    const lead=state.leads.find(x=>x.id===leadId)||((state.currentLead?.id===leadId)?state.currentLead:null)||{};
    const bp=(state.currentLead?.id===leadId?state.deliveryBlueprint:null)||{};
    const body=bp.blueprint||{},domains=Array.isArray(body.domains)?body.domains:[];
    if(!domains.length)return null;
    const maxDays=Math.max(0,...domains.flatMap(d=>(Array.isArray(d.tasks)?d.tasks:[]).map(t=>Number(t.due_offset_days||0))).filter(Number.isFinite));
    const titleBase=String(lead.company_name||lead.full_name||'Client').trim();
    return {
      title:titleBase+' · ATS Delivery',
      scope:String(body.summary||domains.map(d=>d.expected_outcome).filter(Boolean).join('\n')).trim(),
      deliverables:domains.map(d=>String((d.name||d.domain_key||'Domain')+' — '+(d.expected_outcome||'Defined outcome')).trim()),
      timeline_text:maxDays?('Phased delivery · target up to '+maxDays+' days from project activation, subject to approved dependencies and client response time.'):'',
      revision_limit:2,
      deposit_percent:50,
      terms:'Delivery scope is based on the approved ATS Delivery Blueprint. Internal team-task distribution is managed by the accountable Domain Leads. Any material scope change is reviewed before execution.'
    };
  }

  async function confirmScopeAndPrepareOffer(){
    const lead=state.currentLead;if(!lead)return;
    const op=operatingGateState();
    if(op.needsEvidence)return notify('Complete the Client/Admin understanding before commercial handoff.','error');
    let bp=state.deliveryBlueprint;
    if(!op.blueprintReady){
      try{bp=await ensureDeliveryBlueprint(lead.id,{force:true,silent:false})}catch(_){return}
    }
    const body=bp?.blueprint||{},domains=Array.isArray(body.domains)?body.domains:[];
    if(!bp||bp.status==='needs_evidence'||!domains.length)return notify('ATS still needs evidence before the delivery scope can be approved.','error');
    const now=new Date().toISOString();
    if(bp.status==='ready'){
      const approved=await sb().from('studio_delivery_blueprints').update({status:'approved',approved_at:now,updated_at:now}).eq('id',bp.id).eq('status','ready').select('*').single();
      if(approved.error)return notify(approved.error.message,'error');
      bp=approved.data;state.deliveryBlueprint=bp;
    }
    const leadPatch=await sb().from('studio_leads').update({status:'qualified',next_action:'Prepare and send proposal',next_action_due_at:null,updated_at:now}).eq('id',lead.id).select('*').single();
    if(leadPatch.error)return notify(leadPatch.error.message,'error');
    const li=state.leads.findIndex(x=>x.id===lead.id);if(li>=0)state.leads[li]=leadPatch.data;
    state.currentLead=leadPatch.data;
    await logLeadActivity('delivery_scope_approved',{
      blueprint_id:bp.id,
      domain_count:domains.length,
      domains:domains.map(d=>({domain_key:d.domain_key,name:d.name,expected_outcome:d.expected_outcome}))
    },lead.id);
    updateLeadWorkspaceState();renderLeadExecutionPath(executionCtx);
    $('#lead-dialog')?.close();
    await loadProposals(true);
    const existing=state.proposals.find(p=>p.lead_id===lead.id&&!['declined','expired'].includes(p.status));
    openProposal(existing?.id||null,lead.id);
    notify(existing?'Approved scope loaded into the existing proposal.':'Scope approved · proposal prefilled from the Delivery Blueprint.');
  }

  function openProposal(id=null,leadId=null){
    state.currentProposal=id?state.proposals.find(x=>x.id===id):null;
    const selectedLead=state.currentProposal?.lead_id||leadId||'';
    fillLeadOptions('#proposal-lead',selectedLead);
    const draft=!state.currentProposal?proposalDraftFromBlueprint(selectedLead):null;
    const p=state.currentProposal||draft||{};
    $('#proposal-dialog-title').textContent=id?'Edit Proposal':draft?'New Proposal · ATS scope loaded':'New Proposal';
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
    const status=$('#proposal-status').value,wasNew=!state.currentProposal;
    const payload={
      lead_id:leadId,title:$('#proposal-title').value.trim(),scope:$('#proposal-scope').value.trim(),
      deliverables:$('#proposal-deliverables').value.split('\n').map(x=>x.trim()).filter(Boolean),
      timeline_text:$('#proposal-timeline').value.trim(),revision_limit:Number($('#proposal-revisions').value||0),
      total_amount:Number($('#proposal-total').value||0),currency:'EGP',deposit_percent:Number($('#proposal-deposit').value||0),
      valid_until:$('#proposal-valid').value||null,terms:$('#proposal-terms').value.trim(),status,
      sent_at:status==='sent'?(state.currentProposal?.sent_at||new Date().toISOString()):state.currentProposal?.sent_at||null
    };
    if(!payload.title||!payload.scope||!payload.deliverables.length)return notify('Title, scope and deliverables are required','error');
    if(status==='sent'&&payload.total_amount<=0)return notify('Add the project price before sending the proposal. You can keep it as Draft until pricing is decided.','error');
    let r;
    if(state.currentProposal)r=await sb().from('studio_proposals').update(payload).eq('id',state.currentProposal.id).select('*').single();
    else r=await sb().from('studio_proposals').insert(payload).select('*').single();
    if(r.error)return notify(r.error.message,'error');
    if(status==='sent')await sb().from('studio_leads').update({status:'proposal_sent',next_action:'Follow up proposal',next_action_due_at:null}).eq('id',leadId);
    if(status==='sent')await logLeadActivity('proposal_sent',{proposal_id:r.data.id,proposal_code:r.data.proposal_code,title:r.data.title},leadId);
    else if(wasNew)await logLeadActivity('proposal_created',{proposal_id:r.data.id,proposal_code:r.data.proposal_code,title:r.data.title},leadId);
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
    await sb().from('studio_leads').update({next_action:'Await deposit payment',next_action_due_at:null}).eq('id',p.lead_id);
    await logLeadActivity('proposal_accepted',{proposal_id:p.id,proposal_code:p.proposal_code,title:p.title},p.lead_id);
    const ex=await sb().from('studio_payments').select('*').eq('proposal_id',p.id).eq('payment_type','deposit').maybeSingle();
    if(ex.error)return notify(ex.error.message,'error');
    if(!ex.data){
      const amount=Number(p.total_amount||0)*Number(p.deposit_percent||0)/100;
      const ins=await sb().from('studio_payments').insert({lead_id:p.lead_id,proposal_id:p.id,payment_type:'deposit',amount,currency:p.currency||'EGP',status:'pending',due_date:new Date().toISOString().slice(0,10)});
      if(ins.error)return notify(ins.error.message,'error');
    }
    notify('Proposal accepted · deposit created');state.loaded.proposals=false;state.loaded.payments=false;state.loaded.dashboard=false;await loadProposals(true);loadDashboard(true);
  }

  async function openStudioProject(id){
    const p=state.projects.find(x=>x.id===id);if(!p)return;state.currentProject=p;
    $('#studio-project-title').textContent=p.title||'Project';$('#studio-project-code').textContent=p.project_code||'—';
    $('#studio-project-client').textContent=clientName(p.client_id);
    $('#studio-project-stage').value=p.stage||'Onboarding';$('#studio-project-health').value=p.health||'On Track';
    $('#studio-project-progress').value=p.progress||0;$('#studio-project-due').value=p.due_date||'';
    $('#studio-project-client-action').value=p.client_action||'';$('#studio-project-internal-action').value=p.internal_action||'';
    $('#studio-project-update').value='';
    $('#studio-project-dialog').showModal();
    await loadProjectWorkspace(p);
  }

  const safeName=name=>String(name||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-120);
  async function loadProjectWorkspace(project=state.currentProject){
    if(!project)return;
    $('#project-message-thread').innerHTML='<div class="loading-line">Loading messages…</div>';$('#project-file-list').innerHTML='<div class="loading-line">Loading files…</div>';$('#project-review-list').innerHTML='<div class="loading-line">Loading reviews…</div>';
    $('#project-domain-list').innerHTML='<div class="loading-line">Loading domain delivery…</div>';
    const [messages,files,reviews,revisions,domains,tasks,members,skills]=await Promise.all([
      sb().from('studio_messages').select('*').eq('project_id',project.id).order('created_at',{ascending:true}).limit(150),
      sb().from('studio_files').select('*').eq('project_id',project.id).order('created_at',{ascending:false}),
      sb().from('studio_reviews').select('*').eq('project_id',project.id).order('published_at',{ascending:false}),
      sb().from('studio_revisions').select('*').eq('project_id',project.id).order('submitted_at',{ascending:false}),
      sb().from('studio_project_workstreams').select('*').eq('project_id',project.id).order('name'),
      sb().from('studio_project_tasks').select('*').eq('project_id',project.id).order('created_at'),
      sb().from('studio_team_members').select('id,full_name,email,active,available,capacity').eq('active',true).order('full_name'),
      sb().from('studio_member_skills').select('*')
    ]);
    const failed=[messages,files,reviews,revisions,domains,tasks,members,skills].find(x=>x.error);if(failed)return notify(failed.error.message,'error');
    state.projectMessages=messages.data||[];state.projectFiles=files.data||[];state.projectReviews=reviews.data||[];state.projectRevisions=revisions.data||[];
    state.projectDomains=domains.data||[];state.projectTasks=tasks.data||[];state.teamMembers=members.data||[];state.teamSkills=skills.data||[];
    const unread=state.projectMessages.filter(x=>x.sender_type==='client'&&!x.is_read_by_admin).map(x=>x.id);if(unread.length)await sb().from('studio_messages').update({is_read_by_admin:true}).in('id',unread);
    renderProjectWorkspace();state.loaded.inbox=false;state.loaded.dashboard=false;
  }
  function domainLeadName(id){return state.teamMembers.find(m=>m.id===id)?.full_name||'Unassigned'}
  function domainLeadOptions(domain){
    const rows=state.teamMembers.map(m=>{
      const level=Math.max(0,...state.teamSkills.filter(s=>s.member_id===m.id&&s.skill===domain.lead_skill).map(s=>Number(s.level||0)));
      const load=state.projectTasks.filter(t=>t.owner_id===m.id&&['assigned','in_progress','review'].includes(t.status)).length;
      return {...m,level,load};
    }).filter(m=>m.id===domain.lead_member_id||(m.available&&m.level>0))
      .sort((a,b)=>b.level-a.level||a.load-b.load||a.full_name.localeCompare(b.full_name));
    return rows.map(m=>'<option value="'+esc(m.id)+'" '+(domain.lead_member_id===m.id?'selected':'')+'>'+esc(m.full_name+' · '+domain.lead_skill+' L'+m.level+' · '+m.load+'/'+m.capacity)+'</option>').join('');
  }
  function renderProjectDomains(){
    const el=$('#project-domain-list');if(!el)return;
    if(!state.projectDomains.length){
      el.innerHTML='<div class="ops-empty domain-empty"><b>No Domain Missions yet.</b><span>Build the delivery system after the approved diagnosis is converted into a live project.</span></div>';
      return;
    }
    el.innerHTML=state.projectDomains.map(d=>{
      const tasks=state.projectTasks.filter(t=>t.workstream_id===d.id);
      const done=tasks.filter(t=>['accepted','closed'].includes(t.status)).length;
      const pct=tasks.length?Math.round(done/tasks.length*100):0;
      const lead=d.lead_member_id?domainLeadName(d.lead_member_id):'Needs Domain Lead';
      const options=domainLeadOptions(d);
      let actions='<button type="button" class="row-action" data-domain-open-team="'+esc(d.id)+'">OPEN TEAM →</button>';
      if(d.status==='review')actions+='<button type="button" class="row-action primary-action" data-domain-accept="'+esc(d.id)+'">ACCEPT OUTCOME</button><button type="button" class="row-action" data-domain-rework="'+esc(d.id)+'">REWORK</button>';
      return '<article class="project-domain-card '+esc(d.status)+'">'+
        '<div class="project-domain-top"><div><span>'+esc((d.domain_key||'delivery').replaceAll('_',' ').toUpperCase())+'</span><h3>'+esc(d.name)+'</h3></div>'+chip(d.status)+'</div>'+
        '<div class="project-domain-accountable"><div><span>ACCOUNTABLE LEAD</span><b>'+esc(lead)+'</b></div><div class="domain-lead-picker"><select data-domain-lead-select="'+esc(d.id)+'"><option value="">Choose lead…</option>'+options+'</select><button type="button" class="row-action" data-domain-assign="'+esc(d.id)+'">'+(d.lead_member_id?'CHANGE':'ASSIGN')+'</button></div></div>'+
        '<div class="project-domain-outcome"><span>EXPECTED OUTCOME</span><p>'+esc(d.expected_outcome||'Outcome not defined yet.')+'</p></div>'+
        '<div class="project-domain-progress"><div><b>'+done+'/'+tasks.length+' team tasks accepted</b><small>'+pct+'% team completion'+(d.due_at?' · Due '+fmt(d.due_at):'')+'</small></div><progress value="'+pct+'" max="100"></progress></div>'+
        (d.submission?'<div class="project-domain-submission"><span>DOMAIN LEAD DELIVERY</span><p>'+esc(d.submission)+'</p></div>':'')+
        (d.rework_reason?'<div class="team-message error">Rework: '+esc(d.rework_reason)+'</div>':'')+
        '<div class="row-actions">'+actions+'</div>'+
      '</article>';
    }).join('');
  }
  async function buildProjectDelivery(){
    const p=state.currentProject;if(!p)return;
    const btn=$('#build-project-delivery');if(btn){btn.disabled=true;btn.textContent='BUILDING…'}
    try{
      if(p.source_lead_id){
        const blueprint=await ensureDeliveryBlueprint(p.source_lead_id,{force:false,silent:true});
        if(blueprint?.status==='needs_evidence'){
          notify('Delivery blueprint is blocked by missing evidence. Return to the client case before assigning the team.','error');
          return;
        }
      }
      const r=await sb().rpc('studio_admin_build_delivery_system',{p_project_id:p.id});
      if(r.error)throw r.error;
      await loadProjectWorkspace(p);
      const missing=Array.isArray(r.data?.unassigned_domains)?r.data.unassigned_domains.length:0;
      notify(missing?'Delivery system built · '+missing+' domain'+(missing===1?' needs':'s need')+' a lead.':'Delivery system built and Domain Leads assigned.');
    }catch(e){notify(e.message||'Could not build the delivery system.','error')}
    finally{if(btn){btn.disabled=false;btn.textContent='BUILD / REFRESH SYSTEM'}}
  }
  async function assignDomainLead(id){
    const select=$('[data-domain-lead-select="'+CSS.escape(id)+'"]'),memberId=select?.value;
    if(!memberId)return notify('Choose a Domain Lead first.','error');
    const current=state.projectDomains.find(x=>x.id===id);
    let reason='';
    if(current?.lead_member_id&&current.lead_member_id!==memberId)reason=prompt('Reason for changing the accountable Domain Lead:')||'';
    const r=await sb().rpc('studio_admin_assign_domain_lead',{p_workstream_id:id,p_member_id:memberId,p_reason:reason||null});
    if(r.error)return notify(r.error.message,'error');
    await loadProjectWorkspace();notify('Domain Lead assigned · blueprint tasks and dependencies synchronized.');
  }
  async function acceptDomain(id){
    const r=await sb().rpc('studio_domain_command',{p_action:'accept_domain',p_payload:{workstream_id:id}});
    if(r.error)return notify(r.error.message,'error');
    await loadProjectWorkspace();notify('Domain outcome accepted.');
  }
  async function reworkDomain(id){
    const reason=prompt('What must the Domain Lead change before acceptance?')||'';
    if(!reason.trim())return;
    const r=await sb().rpc('studio_domain_command',{p_action:'rework_domain',p_payload:{workstream_id:id,reason}});
    if(r.error)return notify(r.error.message,'error');
    await loadProjectWorkspace();notify('Rework sent to the Domain Lead.');
  }

  function renderProjectWorkspace(){
    renderProjectDomains();
    $('#project-message-thread').innerHTML=state.projectMessages.length?state.projectMessages.map(x=>'<div class="message-bubble '+esc(x.sender_type)+'"><b>'+(x.sender_type==='client'?'CLIENT':'ATS')+'</b><p>'+esc(x.body)+'</p><small>'+esc(fmt(x.created_at))+'</small></div>').join(''):'<div class="ops-empty">No messages in this project yet.</div>';const thread=$('#project-message-thread');if(thread)thread.scrollTop=thread.scrollHeight;
    $('#project-file-list').innerHTML=state.projectFiles.length?state.projectFiles.map(x=>'<div class="collab-row"><div><b>'+esc(x.file_name)+'</b><small>'+esc((x.category||'file').replaceAll('_',' ')+' · '+(x.version||'—')+' · '+(x.visibility||'admin_only'))+'</small></div><div class="row-actions"><button class="row-action" data-admin-file-open="'+esc(x.id)+'" data-file-path="'+esc(x.storage_path||'')+'">OPEN</button>'+(x.category==='review'?'<button class="row-action primary-action" data-publish-file-review="'+esc(x.id)+'">REVIEW →</button>':'')+(x.category==='final_delivery'&&x.visibility!=='client_visible'?'<button class="row-action primary-action" data-release-final="'+esc(x.id)+'">RELEASE →</button>':'')+'</div></div>').join(''):'<div class="ops-empty">No project files yet.</div>';
    const revisionByReview=new Map(state.projectRevisions.map(x=>[x.review_id,x]));$('#project-review-list').innerHTML=state.projectReviews.length?state.projectReviews.map(x=>{const r=revisionByReview.get(x.id);return '<div class="collab-row"><div><b>'+esc(x.title||'Review')+' · '+esc(x.version||'')+'</b><small>'+esc((x.review_code||'—')+' · '+(x.status||'').replaceAll('_',' '))+(r?' · Revision #'+esc(r.revision_number)+' '+esc(r.status):'')+'</small>'+(r?.notes?'<p>'+esc(r.notes)+'</p>':'')+'</div><div class="row-actions">'+(r&&['submitted','in_progress'].includes(r.status)?'<button class="row-action primary-action" data-complete-revision="'+esc(r.id)+'">COMPLETE REVISION</button>':'')+'</div></div>'}).join(''):'<div class="ops-empty">No reviews published yet.</div>';
  }
  async function sendProjectMessage(){const p=state.currentProject,body=$('#project-message-input').value.trim();if(!p||!body)return notify('Write a message first','error');const r=await sb().from('studio_messages').insert({project_id:p.id,client_id:p.client_id,sender_type:'admin',body,is_read_by_admin:true}).select('*').single();if(r.error)return notify(r.error.message,'error');$('#project-message-input').value='';state.projectMessages.push(r.data);renderProjectWorkspace();notify('Message sent to Client Portal')}
  async function uploadProjectFile(){const p=state.currentProject,input=$('#studio-project-file'),file=input?.files?.[0];if(!p)return;if(!file)return notify('Choose a file first','error');if(file.size>26214400)return notify('Maximum file size is 25 MB','error');const category=$('#studio-project-file-category').value||'review',version=$('#studio-project-file-version').value.trim()||'V1',visibility=category==='review'?'client_visible':'admin_only',path=`${p.client_id}/${p.id}/${category}/${crypto.randomUUID()}_${safeName(file.name)}`;const btn=$('#upload-project-file');btn.disabled=true;btn.textContent='UPLOADING…';try{const up=await sb().storage.from('studio-client-files').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;const meta=await sb().from('studio_files').insert({project_id:p.id,file_name:file.name,storage_path:path,category,version,visibility}).select('*').single();if(meta.error){await sb().storage.from('studio-client-files').remove([path]);throw meta.error}input.value='';notify(file.name+' uploaded');await loadProjectWorkspace(p)}catch(e){notify(e.message,'error')}finally{btn.disabled=false;btn.textContent='UPLOAD'}}
  async function openProjectFile(btn){const path=btn.dataset.filePath;if(!path)return;btn.disabled=true;try{const q=await sb().storage.from('studio-client-files').createSignedUrl(path,120);if(q.error)throw q.error;window.open(q.data.signedUrl,'_blank','noopener')}catch(e){notify(e.message,'error')}finally{btn.disabled=false}}
  async function publishProjectReview(fileId){const p=state.currentProject,f=state.projectFiles.find(x=>x.id===fileId);if(!p||!f)return;const existing=state.projectReviews.find(x=>x.file_id===fileId);if(existing)return notify((existing.review_code||'Review')+' already exists','error');const now=new Date().toISOString();const r=await sb().from('studio_reviews').insert({project_id:p.id,title:f.file_name,version:f.version||'V1',file_id:f.id,status:'awaiting_review',published_at:now}).select('*').single();if(r.error)return notify(r.error.message,'error');await sb().from('studio_projects').update({stage:'Client Review',progress:85,client_action:`Review ${f.file_name} ${f.version||'V1'}`,internal_action:'Track client review response'}).eq('id',p.id);await syncProjectStage(p.id,'Client Review');await sb().from('studio_activity').insert({actor_type:'admin',entity_type:'review',entity_id:r.data.id,action:'review_published',metadata:{project_id:p.id,file_id:fileId,version:r.data.version}});notify((r.data.review_code||'Review')+' published to Client Portal');await loadProjectWorkspace(p);state.loaded['studio-projects']=false}
  async function releaseFinalFile(fileId){const p=state.currentProject;if(!p)return;const pay=await sb().from('studio_payments').select('amount,status').eq('project_id',p.id);if(pay.error)return notify(pay.error.message,'error');const paid=(pay.data||[]).filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0);if(paid+0.001<Number(p.project_value||0))return notify('Final Delivery is locked until the project is fully paid','error');if(!['Deployment','Completed'].includes(p.stage)&&p.status!=='completed')return notify('Move project to Deployment or Completed first','error');const q=await sb().from('studio_files').update({visibility:'client_visible'}).eq('id',fileId);if(q.error)return notify(q.error.message,'error');notify('Final file released to Client Portal');await loadProjectWorkspace(p)}
  async function completeRevision(id){const p=state.currentProject,r=state.projectRevisions.find(x=>x.id===id);if(!p||!r)return;const now=new Date().toISOString();const q=await sb().from('studio_revisions').update({status:'completed',completed_at:now}).eq('id',id);if(q.error)return notify(q.error.message,'error');await sb().from('studio_projects').update({stage:'Revisions',progress:88,client_action:'No action required',internal_action:'Upload revised review file and publish the next version'}).eq('id',p.id);await syncProjectStage(p.id,'Revisions');await sb().from('studio_activity').insert({actor_type:'admin',entity_type:'revision',entity_id:id,action:'revision_completed',metadata:{project_id:p.id,review_id:r.review_id,revision_number:r.revision_number}});notify('Revision #'+r.revision_number+' completed');await loadProjectWorkspace(p)}

  async function syncProjectStage(projectId,stage){
    const pos=stageOrder.indexOf(stage)+1;if(pos<1)return;
    const now=new Date().toISOString();
    const [before,current,after]=await Promise.all([
      sb().from('studio_project_stages').update({status:'completed',completed_at:now}).eq('project_id',projectId).lt('position',pos),
      sb().from('studio_project_stages').update({status:stage==='Completed'?'completed':'active',started_at:now,completed_at:stage==='Completed'?now:null}).eq('project_id',projectId).eq('position',pos),
      sb().from('studio_project_stages').update({status:'pending',started_at:null,completed_at:null}).eq('project_id',projectId).gt('position',pos)
    ]);
    const failed=[before,current,after].find(x=>x.error);if(failed)throw failed.error;
  }
  async function saveStudioProject(){
    const p=state.currentProject;if(!p)return;
    const stage=$('#studio-project-stage').value,progress=stage==='Completed'?100:Number($('#studio-project-progress').value||0);
    const patch={stage,health:$('#studio-project-health').value,progress,due_date:$('#studio-project-due').value||null,client_action:stage==='Completed'?'No action required':($('#studio-project-client-action').value.trim()||'No action required'),internal_action:$('#studio-project-internal-action').value.trim()||null,status:stage==='Completed'?'completed':p.status,completed_at:stage==='Completed'?(p.completed_at||new Date().toISOString()):null};
    const r=await sb().from('studio_projects').update(patch).eq('id',p.id);if(r.error)return notify(r.error.message,'error');
    try{if(stage!==p.stage)await syncProjectStage(p.id,stage)}catch(e){return notify('Project saved, but stage timeline could not sync: '+e.message,'error')}
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
      if(converted.data?.project_id){
        let blueprint=null;
        try{blueprint=await ensureDeliveryBlueprint(p.lead_id,{force:false,silent:true})}catch(_){}
        if(blueprint?.status==='needs_evidence'){
          notify('Project created, but team activation is paused until the missing evidence is resolved.','error');
        }else if(!['approved','activated'].includes(String(blueprint?.status||''))){
          notify('Project created, but team activation is paused until Admin confirms the Delivery Blueprint.','error');
        }else{
          const built=await sb().rpc('studio_admin_build_delivery_system',{p_project_id:converted.data.project_id});
          if(built.error)notify('Project created, but delivery activation is blocked: '+built.error.message,'error');
        }
      }
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
    const exec=e.target.closest('[data-exec-action]');
    if(exec){
      const action=exec.dataset.execAction;
      if(action==='analysis'){void runDiagnosticEngine(false);return}
      if(action==='publish-evidence'){void publishLeadEvidenceRequest();return}
      if(action==='whatsapp-access'){void issueAndOpenClientAccessWhatsApp();return}
      if(action==='approve-plan'){void approveSuggestedNextSteps();return}
      if(action==='start-internal'){void startInternalLeadWork().catch(error=>{console.error('ATS task workspace',error);notify(error?.message||'Could not open the current ATS task.','error')});return}
      if(action==='accept-diagnosis'){void acceptSystemDiagnosis();return}
      if(action==='evidence'){setLeadFocusMode(false);const fold=$('#fold-discovery');fold?.setAttribute('open','');fold?.scrollIntoView({behavior:'smooth',block:'start'});return}
      if(action==='diagnosis'){setLeadFocusMode(false);const fold=$('#fold-working-diagnosis');fold?.setAttribute('open','');fold?.scrollIntoView({behavior:'smooth',block:'start'});return}
      if(action==='causes'){setLeadFocusMode(false);const fold=$('#fold-root-causes');fold?.setAttribute('open','');fold?.scrollIntoView({behavior:'smooth',block:'start'});return}
      if(action==='plan'||action==='verification'){setLeadFocusMode(false);const fold=$('#fold-solution-tasks');fold?.setAttribute('open','');if(action==='verification'){if($('#solution-task-type'))$('#solution-task-type').value='verification';if($('#solution-task-title')&&!$('#solution-task-title').value)$('#solution-task-title').value='Verify effectiveness of the proposed solution';}fold?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#solution-task-title')?.focus(),250);return}
      if(action==='qualify'){if($('#lead-status'))$('#lead-status').value='qualified';if($('#lead-next-action'))$('#lead-next-action').value='Prepare proposal';updateLeadWorkspaceState();void saveLead(false);return}
    }
    const domainAssign=e.target.closest('[data-domain-assign]');if(domainAssign){void assignDomainLead(domainAssign.dataset.domainAssign);return}
    const domainAccept=e.target.closest('[data-domain-accept]');if(domainAccept){void acceptDomain(domainAccept.dataset.domainAccept);return}
    const domainRework=e.target.closest('[data-domain-rework]');if(domainRework){void reworkDomain(domainRework.dataset.domainRework);return}
    const domainTeam=e.target.closest('[data-domain-open-team]');if(domainTeam&&state.currentProject?.id){location.href='/admin/team-tasks?project='+encodeURIComponent(state.currentProject.id)+'&domain='+encodeURIComponent(domainTeam.dataset.domainOpenTeam);return}
    const jump=e.target.closest('[data-jump]');if(jump){window.ATS_ADMIN?.switchTab?.(jump.dataset.jump);loadPanel(jump.dataset.jump);return}
    const refresh=e.target.closest('[data-ops-refresh]');if(refresh){loadPanel(refresh.dataset.opsRefresh,true);return}
    const priorityLead=e.target.closest('[data-priority-lead]');if(priorityLead){void (async()=>{window.ATS_ADMIN?.switchTab?.('leads');await loadLeads();await openLead(priorityLead.dataset.priorityLead)})();return}
    const lead=e.target.closest('[data-open-lead]');if(lead){void openLead(lead.dataset.openLead);return}
    const proposal=e.target.closest('[data-open-proposal]');if(proposal){openProposal(proposal.dataset.openProposal);return}
    const project=e.target.closest('[data-open-studio-project]');if(project){void openStudioProject(project.dataset.openStudioProject);return}
    const inboxProject=e.target.closest('[data-inbox-project]');if(inboxProject){void (async()=>{await loadProjects();await openStudioProject(inboxProject.dataset.inboxProject)})();return}
    const inboxLead=e.target.closest('[data-inbox-lead]');if(inboxLead){void (async()=>{window.ATS_ADMIN?.switchTab?.('leads');await loadLeads();await openLead(inboxLead.dataset.inboxLead)})();return}
    const accept=e.target.closest('[data-accept-proposal]');if(accept){acceptProposal(accept.dataset.acceptProposal);return}
    const paid=e.target.closest('[data-mark-paid]');if(paid){markPaid(paid.dataset.markPaid);return}
    const fileOpen=e.target.closest('[data-admin-file-open]');if(fileOpen){void openProjectFile(fileOpen);return}
    const publish=e.target.closest('[data-publish-file-review]');if(publish){void publishProjectReview(publish.dataset.publishFileReview);return}
    const release=e.target.closest('[data-release-final]');if(release){void releaseFinalFile(release.dataset.releaseFinal);return}
    const complete=e.target.closest('[data-complete-revision]');if(complete){void completeRevision(complete.dataset.completeRevision);return}
    const causeStatus=e.target.closest('[data-cause-status]');if(causeStatus){const [id,status]=causeStatus.dataset.causeStatus.split(':');void setRootCauseStatus(id,status);return}
    const taskStatus=e.target.closest('[data-task-status]');if(taskStatus){const [id,status]=taskStatus.dataset.taskStatus.split(':');void setSolutionTaskStatus(id,status);return}
    const up=e.target.closest('[data-v9-up]');if(up&&state.v9){const [kind,key]=up.dataset.v9Up.split(':');const a=arrFor(kind),i=a.indexOf(key);if(i>0){[a[i-1],a[i]]=[a[i],a[i-1]];renderV9()}return}
    const toggle=e.target.closest('[data-v9-toggle]');if(toggle&&state.v9){const [kind,key]=toggle.dataset.v9Toggle.split(':'),h=hiddenFor(kind),i=h.indexOf(key);if(kind==='brief'&&i<0&&arrFor(kind).filter(x=>!h.includes(x)).length<=1)return notify('At least one brief step must remain visible','error');i>=0?h.splice(i,1):h.push(key);renderV9();return}
  });

  $('#ops-lead-search')?.addEventListener('input',renderLeads);$('#ops-lead-filter')?.addEventListener('change',renderLeads);
  $('#ops-inbox-search')?.addEventListener('input',renderInbox);$('#ops-inbox-filter')?.addEventListener('change',renderInbox);
  $('#ops-client-search')?.addEventListener('input',renderClients);
  $('#ops-project-search')?.addEventListener('input',renderProjects);$('#ops-project-filter')?.addEventListener('change',renderProjects);
  $('#ops-proposal-search')?.addEventListener('input',renderProposals);$('#ops-proposal-filter')?.addEventListener('change',renderProposals);
  $('#ops-payment-search')?.addEventListener('input',renderPayments);$('#ops-payment-filter')?.addEventListener('change',renderPayments);
  $('#new-proposal')?.addEventListener('click',async()=>{await loadProposals();openProposal()});
  $('#save-lead')?.addEventListener('click',()=>saveLead(true));
  $('#lead-save-open')?.addEventListener('click',()=>saveLead(false));
  $('#lead-start-discovery')?.addEventListener('click',startDiscovery);
  $('#lead-view-toggle')?.addEventListener('click',()=>setLeadFocusMode(!$('#lead-dialog')?.classList.contains('focus-mode')));
  $('#lead-execution-primary')?.addEventListener('click',async()=>{
    const btn=$('#lead-execution-primary'),action=btn?.dataset.action,id=btn?.dataset.id;
    if(!action)return;
    if(action==='analysis'){void runDiagnosticEngine(false);return}
    if(action==='build-blueprint'){void ensureDeliveryBlueprint(state.currentLead?.id,{force:true,silent:false}).then(()=>{updateLeadWorkspaceState();renderLeadExecutionPath(executionCtx)});return}
    if(action==='prepare-offer'){void confirmScopeAndPrepareOffer();return}
    if(action==='publish-evidence'){void publishLeadEvidenceRequest();return}
      if(action==='whatsapp-access'){void issueAndOpenClientAccessWhatsApp();return}
    if(action==='approve-plan'){void approveSuggestedNextSteps();return}
      if(action==='start-internal'){void startInternalLeadWork().catch(error=>{console.error('ATS task workspace',error);notify(error?.message||'Could not open the current ATS task.','error')});return}
    if(action==='accept-diagnosis'){void acceptSystemDiagnosis();return}
    if(action==='causes'){setLeadFocusMode(false);const fold=$('#fold-root-causes');fold?.setAttribute('open','');fold?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(action==='verification'){setLeadFocusMode(false);const fold=$('#fold-solution-tasks');fold?.setAttribute('open','');if($('#solution-task-type'))$('#solution-task-type').value='verification';fold?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(action==='diagnosis'){setLeadFocusMode(false);$('.diagnosis-workspace-card')?.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(action==='qualify'){if($('#lead-status'))$('#lead-status').value='qualified';if($('#lead-next-action'))$('#lead-next-action').value='Prepare proposal';updateLeadWorkspaceState();await saveLead(false);await refreshLeadExecutionPath();return}
    if(action==='create-proposal'){$('#lead-create-proposal')?.click();return}
    if(action==='open-proposal'){const leadId=state.currentLead?.id;$('#lead-dialog')?.close();await loadProposals(true);openProposal(id||null,leadId);return}
    if(action==='accept-proposal'){await loadProposals(true);await acceptProposal(id);await refreshLeadExecutionPath();return}
    if(action==='confirm-deposit'){await loadPayments(true);await markPaid(id);await loadProjects(true);await refreshLeadExecutionPath();return}
    if(action==='open-project'){await loadProjects(true);await openStudioProject(id);return}
    if(action==='open-tasks'){location.href='/admin/team-tasks?project='+encodeURIComponent(id)+(btn.dataset.newTask==='1'?'&newTask=1':'');return}
  });
  $('#lead-log-contact')?.addEventListener('click',logLeadContact);
  $('#issue-client-access-code')?.addEventListener('click',issueClientAccessCode);
  $('#copy-client-access-code')?.addEventListener('click',copyClientAccessCode);
  $('#case-go-next')?.addEventListener('click',()=>{
    const c=state.discoveryCase||{}, q=c.system_next_question||state.diagnosticRun?.analysis?.next_best_question||{};
    if(String(q?.question||'').trim()){
      const select=$('#lead-next-action');if(select)select.value='Request information / assets';
      $('.lead-next-card')?.scrollIntoView({behavior:'smooth',block:'start'});
      $('#lead-next-action')?.focus();
      return;
    }
    if(['never_analyzed','stale','error'].includes(String(c.analysis_state||''))){
      $('#run-diagnostic-engine')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    $('#fold-working-diagnosis')?.setAttribute('open','');
    $('#fold-working-diagnosis')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#case-open-evidence')?.addEventListener('click',()=>{
    const fold=$('#fold-evidence');if(!fold)return;fold.setAttribute('open','');fold.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('#run-diagnostic-engine')?.addEventListener('click',()=>runDiagnosticEngine(false));
  $('#accept-system-diagnosis')?.addEventListener('click',acceptSystemDiagnosis);
  $('#save-diagnosis')?.addEventListener('click',saveDiagnosis);
  $('#add-root-cause')?.addEventListener('click',addRootCause);
  $('#add-solution-task')?.addEventListener('click',addSolutionTask);
  $('#lead-refresh-timeline')?.addEventListener('click',()=>state.currentLead&&loadLeadTimeline(state.currentLead.id));
  $('#lead-status')?.addEventListener('change',updateLeadWorkspaceState);
  $('#lead-next-action')?.addEventListener('change',updateLeadWorkspaceState);
  $('#lead-next-due')?.addEventListener('change',updateLeadWorkspaceState);
  $('#lead-create-proposal')?.addEventListener('click',async()=>{
    const id=state.currentLead?.id,status=$('#lead-status').value,op=operatingGateState();
    if(!id||!['qualified','proposal_sent','negotiation'].includes(status))return notify('Confirm the ATS delivery scope before creating a proposal','error');
    const existingCommercial=['proposal_sent','negotiation'].includes(status);
    if(!existingCommercial&&(op.needsEvidence||!op.scopeApproved))return notify('Complete Client/Admin understanding and approve the Delivery Blueprint first.','error');
    if(!await saveLead(false))return;
    $('#lead-dialog').close();await loadProposals(true);
    const existing=state.proposals.find(p=>p.lead_id===id&&!['declined','expired'].includes(p.status));
    openProposal(existing?.id||null,id);
  });
  $('#save-proposal')?.addEventListener('click',saveProposal);
  $('#save-studio-project')?.addEventListener('click',saveStudioProject);
  $('#post-studio-project-update')?.addEventListener('click',postProjectUpdate);
  $('#send-project-message')?.addEventListener('click',sendProjectMessage);
  $('#upload-project-file')?.addEventListener('click',uploadProjectFile);
  $('#refresh-project-workspace')?.addEventListener('click',()=>loadProjectWorkspace());
  $('#build-project-delivery')?.addEventListener('click',buildProjectDelivery);
  $('#open-project-team-tasks')?.addEventListener('click',()=>{if(state.currentProject?.id)location.href='/admin/team-tasks?project='+encodeURIComponent(state.currentProject.id)});
  $('#project-message-input')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();sendProjectMessage()}});
  $('#save-v9-layout')?.addEventListener('click',saveV9);
  $('#v9-work-columns')?.addEventListener('change',e=>{if(state.v9)state.v9.work.columns=Number(e.target.value)});
  $('#v9-founder-width')?.addEventListener('change',e=>{if(state.v9)state.v9.team.founderWidth=Number(e.target.value)});
  document.addEventListener('change',e=>{if(e.target.matches('[data-v9-size]')&&state.v9)state.v9.work.sizes[e.target.dataset.v9Size]=e.target.value});
  $$('[data-close-unified]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeUnified)?.close()));

  $('#admin-nav')?.addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(!b)return;const tab=b.dataset.tab;location.hash=tab==='dashboard'?'':tab;loadPanel(tab);if(tab==='inbox'){clearInterval(inboxTimer);inboxTimer=setInterval(()=>{if(location.hash==='#inbox')loadInbox(true)},12000)}else{clearInterval(inboxTimer);inboxTimer=null}});
  window.addEventListener('ats-admin-language-change',()=>{
    if(state.loaded.dashboard)void loadDashboard(true);
    if(state.loaded.leads)renderLeads();
    if(state.loaded.inbox)renderInbox();
    if(state.loaded.clients)renderClients();
    if(state.loaded['studio-projects'])renderProjects();
    if(state.loaded.proposals)renderProposals();
    if(state.loaded.payments)renderPayments();
    if(state.loaded.v9)renderV9();
    if(state.currentLead){
      renderLeadTimeline();renderLeadDiagnosis();
      $('#lead-workspace-received').textContent=(window.ATS_I18N?.t?.('Received')||'Received')+' '+fmt(state.currentLead.created_at);
      $('#lead-last-contact').textContent=state.currentLead.last_contacted_at?((window.ATS_I18N?.t?.('Last contact')||'Last contact')+' '+fmt(state.currentLead.last_contacted_at)):(window.ATS_I18N?.t?.('No contact logged')||'No contact logged');
    }
  });
  window.addEventListener('ats-admin-ready',boot);
  if(!$('#admin-view')?.classList.contains('hidden'))setTimeout(boot,0);
})();
