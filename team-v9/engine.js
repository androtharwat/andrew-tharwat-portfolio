/* Shared UI for the existing Studio OS and its member route. All permissions and
   mutations are enforced by the database; this file only renders server results. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const admin = !!$('#app');
  let sb, root, loading = false, active = false, tab = admin ? 'domains' : 'available';
  let rows = {tasks:[],members:[],skills:[],streams:[],ledger:[],events:[],projects:[],dependencies:[],context:[]};
  let me = null, email = '';
  let memberLinkOpened=false;
  const params=new URLSearchParams(location.search);
  const requestedMember=params.get('member');
  const requestedProject=params.get('project');
  const requestedDomain=params.get('domain');
  const requestedNewTask=params.get('newTask')==='1';
  let requestedTaskOpened=false;
  const intake=[];
  const openStates = ['assigned','in_progress','review'];
  const label = s => String(s).replaceAll('_',' ');
  const date = v => new Date(v).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const name = id => rows.members.find(m=>m.id===id)?.full_name || (id ? 'Assigned member' : 'Unassigned');
  const project = id => rows.projects.find(p=>p.id===id)?.title || `Project ${id.slice(0,8)}`;
  const context = id => rows.context.find(c=>c.task_id===id)||{};
  const stream = id => rows.streams.find(w=>w.id===id)?.name || '';
  const load = id => rows.tasks.filter(t=>t.owner_id===id && openStates.includes(t.status)).length;
  const domain = id => rows.streams.find(w=>w.id===id)||null;
  const myDomains = () => rows.streams.filter(w=>w.lead_member_id===me);
  const isDomainLead = workstreamId => !!me && domain(workstreamId)?.lead_member_id===me;
  const domainTasks = id => rows.tasks.filter(t=>t.workstream_id===id);
  const domainProgress = id => {const all=domainTasks(id),done=all.filter(t=>['accepted','closed'].includes(t.status)).length;return {all,done,pct:all.length?Math.round(done/all.length*100):0}};

  const overdue = t => !['accepted','closed'].includes(t.status) && Date.parse(t.due_at)<Date.now();
  const escalated = t => t.status==='available' && Date.parse(t.available_since)+t.escalate_hours*3600000<Date.now();
  const metric = (title,n) => `<div class="team-metric"><b>${esc(n)}</b><span>${esc(title)}</span></div>`;
  const button = (text,action,id,cls='') => `<button type="button" class="${cls}" data-team-action="${action}" data-id="${id||''}">${esc(text)}</button>`;
  const field = (name,title,value='',type='text',extra='') => `<label>${esc(title)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const area = (name,title,value='',required=true) => `<label class="wide">${esc(title)}<textarea name="${name}" ${required?'required':''}>${esc(value)}</textarea></label>`;
  const options = (values,current) => values.map(([v,l])=>`<option value="${esc(v)}" ${String(current)===String(v)?'selected':''}>${esc(l)}</option>`).join('');
  const select = (name,title,values,current,extra='') => `<label>${esc(title)}<select name="${name}" aria-label="${esc(title)}" ${extra}>${options(values,current)}</select></label>`;
  const check = (name,title,value) => `<label class="check"><input name="${name}" type="checkbox" ${value?'checked':''}>${esc(title)}</label>`;
  function message(text,error=false) {
    const el=$('#team-message',root); if(el){el.textContent=text;el.hidden=!text;el.classList.toggle('error',error);}
  }
  function initRoot() {
    root.innerHTML=`<div class="team-toolbar"><div><p class="overline">ATS OPERATING SYSTEM</p><h2>${admin?'Team & Tasks':'My workspace'}</h2></div><div class="team-actions">${admin?'<a href="/admin/team-applications">Applications</a><a href="/join">Join form</a><a href="/team-policy/">Policy</a>'+button('+ Member','member')+button('+ Task','task','','primary'):''}${button('Refresh','refresh')}</div></div><div id="team-message" class="team-message" role="status" aria-live="polite" hidden></div><div id="team-metrics" class="team-metrics"></div><nav id="team-tabs" class="team-tabs" aria-label="Team workspace"></nav><div id="team-content"></div><dialog id="team-dialog" aria-labelledby="team-dialog-title"></dialog>`;
    root.addEventListener('click',handleClick);
  }
  async function refresh() {
    if(loading)return; loading=true;
    try {
      const tables={tasks:'studio_project_tasks',members:'studio_team_members',skills:'studio_member_skills',streams:'studio_project_workstreams',ledger:'studio_token_ledger',events:'studio_task_events',dependencies:'studio_task_dependencies'};
      const next={...rows};
      // Fetch all pilot rows with pagination; never silently truncate a wallet.
      await Promise.all(Object.entries(tables).map(async([key,table])=>{
        const all=[]; let from=0;
        while(true){const order=key==='skills'?'member_id':key==='dependencies'?'task_id':'id';const q=await sb.from(table).select('*').order(order).range(from,from+499);if(q.error)throw q.error;all.push(...q.data);if(q.data.length<500)break;from+=500;}
        next[key]=all;
      }));
      if(admin){const apps=await sb.from('studio_team_applications').select('id,accepted_member_id,policy_version,policy_accepted_at,digital_signature,status');if(apps.error)throw apps.error;intake.splice(0,intake.length,...(apps.data||[]));}
      if(admin){const q=await sb.from('studio_projects').select('id,title,project_code,status').order('created_at',{ascending:false});if(q.error)throw q.error;next.projects=q.data;}
      const ctx=await sb.rpc('studio_team_context');if(ctx.error)throw ctx.error;next.context=ctx.data||[];
      rows=next; render(); message('');
      if(admin&&requestedMember&&!memberLinkOpened&&rows.members.some(m=>m.id===requestedMember)){memberLinkOpened=true;tab='members';render();memberForm(requestedMember);}
      return true;
    } catch(e) {
      Object.keys(rows).forEach(k=>{rows[k]=[];});
      $('#team-metrics',root).innerHTML='';
      $('#team-content',root).innerHTML='<div class="team-empty">Workspace could not refresh. Check your access and try again.</div>';
      message(e.message || 'Could not load team workspace',true);
    } finally {loading=false;}
  }
  function render() {
    const tasks=rows.tasks;
    const memberTabs=(myDomains().length?[['domains','My domains']]:[]).concat([['available','Available tasks'],['mine','My work'],['reviews','My reviews'],['wallet','Wallet'],['history','History']]);
    $('#team-tabs',root).innerHTML=(admin?[['domains','Domain delivery'],['board','Task board'],['attention','Needs attention'],['tasks','All tasks'],['members','Team load'],['wallet','Token ledger']]:memberTabs).map(([v,l])=>`<button type="button" data-team-tab="${v}" aria-current="${tab===v}">${l}</button>`).join('');
    const own=admin?tasks:tasks.filter(t=>t.owner_id===me);
    if(admin){const overview=$('#team-overview');if(overview)overview.innerHTML=`<div><p class="overline">TEAM EXECUTION</p><h2>${rows.streams.filter(w=>w.status==='review').length} domain outcomes · ${tasks.filter(t=>t.status==='review'||overdue(t)||escalated(t)||t.rework_reason).length} task exceptions need attention</h2><p>${rows.streams.filter(w=>w.status==='review').length} awaiting founder acceptance · ${tasks.filter(t=>t.status==='available').length} unassigned team tasks · ${tasks.filter(overdue).length} overdue</p></div><a class="button button-primary" href="#team">OPEN DOMAIN DELIVERY</a>`;}
    $('#team-metrics',root).innerHTML=admin?
      metric('Unassigned',tasks.filter(t=>t.status==='available').length)+metric('Active',tasks.filter(t=>openStates.includes(t.status)).length)+metric('Awaiting review',tasks.filter(t=>t.status==='review').length)+metric('Overdue',tasks.filter(overdue).length)+metric('Open rework',tasks.filter(t=>t.rework_reason).length)+metric('Founder queue',tasks.filter(escalated).length):
      metric('My domains',myDomains().filter(w=>!['accepted'].includes(w.status)).length)+metric('Active / capacity',`${load(me)} / ${rows.members.find(m=>m.id===me)?.capacity??'—'}`)+metric('In review',own.filter(t=>t.status==='review').length)+metric('Accepted',own.filter(t=>['accepted','closed'].includes(t.status)).length)+metric('Overdue',own.filter(overdue).length);
    const content=$('#team-content',root);
    if(tab==='domains'){renderDomains(content);return;}
    if(tab==='board'){renderTaskBoard(content);return;}
    if(tab==='members'){content.innerHTML=rows.members.length?`<div class="team-grid">${rows.members.map(m=>`<article class="team-card"><h3>${esc(m.full_name)}</h3><p class="muted">${esc(m.email)} · ${esc(label(m.member_type))}</p><p>${load(m.id)} / ${m.capacity} active tasks · ${m.active?(m.available?'Available':'Unavailable'):'Inactive'}</p><progress value="${load(m.id)}" max="${Math.max(m.capacity,load(m.id))}"></progress><p>${rows.skills.filter(s=>s.member_id===m.id).map(s=>`${esc(s.skill)} · L${s.level}`).join(' / ')||'No skills recorded'}</p><small>${m.auth_user_id?'Account linked':'Waiting for first verified login'}</small><div class="team-actions">${button('Edit member','member',m.id)}${intake.filter(a=>a.accepted_member_id===m.id).map(a=>`<a href="/admin/team-applications?application=${encodeURIComponent(a.id)}">Application & policy acknowledgement</a>`).join('')}</div></article>`).join('')}</div>`:'<div class="team-empty">Add your first member to set up skills, capacity and task reviewers.</div>';return;}
    if(tab==='wallet'){renderWallet(content);return;}
    let list=tasks;
    if(tab==='attention')list=tasks.filter(t=>t.status==='available'||t.status==='review'||overdue(t)||t.rework_reason);
    if(tab==='available')list=tasks.filter(t=>t.status==='available'&&t.reviewer_id!==me&&t.assignment_mode==='marketplace');
    if(tab==='mine')list=tasks.filter(t=>t.owner_id===me&&openStates.includes(t.status));
    if(tab==='reviews')list=tasks.filter(t=>t.reviewer_id===me&&t.status==='review');
    if(tab==='history')list=tasks.filter(t=>t.owner_id===me&&['accepted','closed'].includes(t.status));
    list=[...list].sort((a,b)=>Number(overdue(b))-Number(overdue(a))||Date.parse(a.due_at)-Date.parse(b.due_at));
    content.innerHTML=list.length?`<div class="team-grid">${list.map(taskCard).join('')}</div>`:`<div class="team-empty">${tab==='available'?'No tasks available for your skills, level and remaining capacity.':tab==='attention'?'No tasks need attention right now.':'No tasks in this view yet.'}</div>`;
  }
  function projectTitleForDomain(w){
    if(admin)return project(w.project_id);
    const first=domainTasks(w.id)[0];
    return first?context(first.id).project_title||'Client project':'Client project';
  }
  function domainTaskRow(t){
    const ctx=context(t.id),lead=isDomainLead(t.workstream_id);
    let actions=button('Details','details',t.id);
    if(lead){
      if(t.status==='available')actions+=button('Assign','domain-assign-task',t.id,'primary');
      if(['assigned','in_progress','review'].includes(t.status))actions+=button('Change deadline','domain-deadline-task',t.id);
      if(['assigned','in_progress'].includes(t.status))actions+=button('Release','domain-unassign-task',t.id);
      if(t.status==='review')actions+=button('Accept','accept',t.id,'primary')+button('Rework','rework',t.id);
    }else if(!admin){
      if(t.owner_id===me&&t.status==='assigned')actions+=button('Start','start',t.id,'primary');
      if(t.owner_id===me&&t.status==='in_progress')actions+=button('Submit','submit',t.id,'primary');
    }
    return `<div class="domain-task-row"><div><span class="team-badge ${esc(t.status)}">${esc(label(t.status))}</span><b>${esc(t.title)}</b><small>${esc(ctx.owner_name||name(t.owner_id))} · ${esc(t.required_skill)} · Due ${esc(date(t.due_at))}</small></div><div class="team-actions">${actions}</div></div>`;
  }
  function domainCard(w){
    const p=domainProgress(w.id),leadName=admin?name(w.lead_member_id):(w.lead_member_id===me?'You':'Domain Lead');
    const allDone=p.all.length&&p.all.every(t=>['accepted','closed'].includes(t.status));
    let actions='';
    if(admin){
      if(w.status==='review')actions+=button('Accept outcome','domain-accept',w.id,'primary')+button('Rework','domain-rework',w.id);
    }else if(w.lead_member_id===me){
      actions+=button('+ Team task','domain-new-task',w.id);
      if(allDone&&['active','rework'].includes(w.status))actions+=button('Submit domain outcome','domain-submit',w.id,'primary');
    }
    const teamRows=admin?'':`<div class="domain-team-list">${p.all.length?p.all.map(domainTaskRow).join(''):'<div class="team-empty">No team tasks yet. Create the minimum tasks needed to reach the domain outcome.</div>'}</div>`;
    return `<article class="domain-mission-card ${esc(w.status)}"><div class="domain-mission-head"><div><p class="overline">${esc((w.domain_key||'delivery').replaceAll('_',' '))}</p><h3>${esc(w.name)}</h3><small>${esc(projectTitleForDomain(w))}</small></div><span class="team-badge ${esc(w.status)}">${esc(label(w.status))}</span></div><div class="domain-accountability"><div><span>ACCOUNTABLE</span><b>${esc(leadName)}</b></div><div><span>TEAM PROGRESS</span><b>${p.done}/${p.all.length} accepted · ${p.pct}%</b></div></div><div class="domain-outcome"><span>OUTCOME YOU OWN</span><p>${esc(w.expected_outcome||'Outcome not defined.')}</p></div>${w.rework_reason?`<p class="team-message error">Admin rework: ${esc(w.rework_reason)}</p>`:''}${w.submission?`<div class="domain-submission"><span>DOMAIN DELIVERY</span><p>${esc(w.submission)}</p></div>`:''}${teamRows}<div class="team-actions domain-actions">${actions}</div></article>`;
  }
  function renderDomains(content){
    let list=admin?rows.streams:myDomains();
    if(requestedProject)list=list.filter(w=>w.project_id===requestedProject);
    if(requestedDomain)list=list.filter(w=>w.id===requestedDomain);
    list=[...list].sort((a,b)=>String(a.status).localeCompare(String(b.status))||String(a.name).localeCompare(String(b.name)));
    const intro=admin
      ?'<div class="domain-view-intro"><div><p class="overline">ACCOUNTABILITY LAYER</p><h2>One lead per domain</h2><p>You accept domain outcomes. Domain Leads manage the task detail with their teams.</p></div></div>'
      :'<div class="domain-view-intro"><div><p class="overline">YOUR ACCOUNTABILITY</p><h2>Own the outcome, manage the team</h2><p>Break the domain outcome into team tasks, review their work, then submit one consolidated result to Admin.</p></div></div>';
    content.innerHTML=intro+(list.length?'<div class="domain-mission-grid">'+list.map(domainCard).join('')+'</div>':'<div class="team-empty">No Domain Missions assigned to you yet.</div>');
  }

  async function domainCommand(action,payload){const q=await sb.rpc('studio_domain_command',{p_action:action,p_payload:payload});if(q.error)throw q.error;return q.data;}
  async function domainCandidates(workstreamId,skill){
    const q=await sb.rpc('studio_domain_candidates',{p_workstream_id:workstreamId,p_required_skill:skill||null});
    if(q.error)throw q.error;return Array.isArray(q.data)?q.data:[];
  }
  async function domainNewTask(workstreamId){
    const w=domain(workstreamId);if(!w)return;
    const due=w.due_at?localDate(w.due_at):localDate(new Date(Date.now()+7*86400000).toISOString());
    modal('New team task · '+w.name,
      field('title','Task name','','text','required maxlength="200"')+
      field('required_skill','Required skill',w.lead_skill||'','text','required maxlength="80"')+
      field('required_level','Minimum level',1,'number','min="1" max="5" required')+
      field('base_tokens','Tokens',10,'number','min="1" max="100000" required')+
      field('due_at','Deadline',due,'datetime-local','required')+
      area('expected_output','Expected output')+
      area('acceptance_criteria','Done when'),
      async fd=>{
        await domainCommand('create_task',{workstream_id:w.id,title:fd.get('title'),required_skill:fd.get('required_skill'),required_level:Number(fd.get('required_level')),base_tokens:Number(fd.get('base_tokens')),due_at:new Date(fd.get('due_at')).toISOString(),expected_output:fd.get('expected_output'),acceptance_criteria:fd.get('acceptance_criteria')});
      },'Create team task');
  }
  async function domainAssignTask(taskId){
    const t=rows.tasks.find(x=>x.id===taskId);if(!t)return;
    const candidates=await domainCandidates(t.workstream_id,t.required_skill);
    const eligible=candidates.filter(x=>x.eligible);
    if(!eligible.length)return message('No available team member currently matches '+t.required_skill+' at the required capacity.',true);
    modal('Assign · '+t.title,
      select('member_id','Team member',eligible.map(m=>[m.id,m.full_name+' · '+m.skill+' L'+m.level+' · '+m.active_load+'/'+m.capacity+(m.is_domain_lead?' · Domain Lead → Admin review':'')]),eligible[0]?.id,'required'),
      async fd=>{await domainCommand('assign_task',{workstream_id:t.workstream_id,id:t.id,member_id:fd.get('member_id')});},
      'Assign task');
  }
  async function domainSubmit(wid){
    const w=domain(wid);if(!w)return;
    const items=domainTasks(w.id).filter(t=>['accepted','closed'].includes(t.status));
    const seed=items.map((t,i)=>(i+1)+'. '+t.title+(t.submission?'\n   '+t.submission:'')).join('\n\n');
    modal('Submit domain outcome · '+w.name,
      '<div class="wide"><p class="muted">Admin receives this consolidated outcome — not your internal task-by-task management.</p></div>'+
      area('submission','Domain result / deliverable',seed||'',true),
      async fd=>{await domainCommand('submit_domain',{workstream_id:w.id,submission:fd.get('submission')});},
      'Submit to Admin');
  }
  async function domainAdminAction(action,wid){
    const w=domain(wid);if(!w)return;
    if(action==='domain-rework'){
      modal('Return domain for rework',area('reason','What must change?','',true),async fd=>{await domainCommand('rework_domain',{workstream_id:w.id,reason:fd.get('reason')});},'Send rework');
    }else{
      await domainCommand('accept_domain',{workstream_id:w.id});
      if(await refresh())message('Domain outcome accepted.');
    }
  }
  async function domainTaskManage(action,taskId){
    const t=rows.tasks.find(x=>x.id===taskId);if(!t)return;
    if(action==='domain-assign-task')return domainAssignTask(taskId);
    if(action==='domain-unassign-task'){
      return modal('Release team task',area('reason','Reason','',true),async fd=>{await domainCommand('unassign_task',{workstream_id:t.workstream_id,id:t.id,reason:fd.get('reason')});},'Release');
    }
    if(action==='domain-deadline-task'){
      return modal('Change deadline',field('due_at','New deadline',localDate(t.due_at),'datetime-local','required')+area('reason','Reason','',true),async fd=>{await domainCommand('deadline_task',{workstream_id:t.workstream_id,id:t.id,due_at:new Date(fd.get('due_at')).toISOString(),reason:fd.get('reason')});},'Change deadline');
    }
  }

  function renderTaskBoard(content){
    const scoped=requestedProject?rows.tasks.filter(t=>t.project_id===requestedProject):rows.tasks;
    const p=requestedProject?rows.projects.find(x=>x.id===requestedProject):null;
    const cols=[
      ['available','1 · TO ASSIGN',t=>t.status==='available'],
      ['assigned','2 · ASSIGNED',t=>t.status==='assigned'],
      ['in_progress','3 · IN PROGRESS',t=>t.status==='in_progress'],
      ['review','4 · REVIEW',t=>t.status==='review'],
      ['done','5 · DONE',t=>['accepted','closed'].includes(t.status)]
    ];
    const guide=`<div class="task-flow-guide"><div><span>PROJECT EXECUTION</span><b>${esc(p?.title||'All active projects')}</b><small>${p?'This board is filtered to the selected project.':'Follow every task from planning to acceptance.'}</small></div><div class="task-flow-steps"><span>PLAN</span><i>→</i><span>ASSIGN</span><i>→</i><span>DO</span><i>→</i><span>REVIEW</span><i>→</i><span>DONE</span></div><div class="team-actions">${button('+ New task','task','','primary')}</div></div>`;
    const board=`<div class="team-kanban">${cols.map(([key,title,test])=>{const items=scoped.filter(test);return `<section class="kanban-col ${key}"><header><b>${title}</b><span>${items.length}</span></header><div class="kanban-stack">${items.length?items.map(taskCard).join(''):'<div class="kanban-empty">No tasks</div>'}</div></section>`}).join('')}</div>`;
    content.innerHTML=guide+board;
  }

  function taskCard(t) {
    let actions=button('Details & history','details',t.id);
    if(admin){
      if(t.status==='available')actions+=button('Edit','task',t.id)+button('Assign','assign',t.id);
      if(openStates.includes(t.status))actions+=button('Unassign','unassign',t.id)+button('Change deadline','deadline',t.id);
      if(t.status==='review')actions+=button('Accept','accept',t.id,'primary')+button('Return for rework','rework',t.id);
      if(['accepted','closed'].includes(t.status))actions+=button('Bonus','bonus',t.id);
      if(t.status==='accepted')actions+=button('Close task','close',t.id);
    }else{
      if(isDomainLead(t.workstream_id)&&t.status==='available')actions+=button('Assign','domain-assign-task',t.id,'primary');
      else if(t.status==='available'&&t.reviewer_id!==me)actions+=button('Take task','claim',t.id,'primary');
      if(t.owner_id===me&&t.status==='assigned')actions+=button('Start task','start',t.id,'primary');
      if(t.owner_id===me&&t.status==='in_progress')actions+=button('Submit for review','submit',t.id,'primary');
      if(t.reviewer_id===me&&t.status==='review'){actions+=button('Return for rework','rework',t.id);if(!t.admin_acceptance)actions+=button('Accept','accept',t.id,'primary');}
    }
    const blocked=rows.dependencies.filter(d=>d.task_id===t.id).length;
    return `<article class="team-card ${overdue(t)?'critical':escalated(t)||t.rework_reason?'attention':''}"><div class="team-meta"><span class="team-badge ${t.status}">${esc(label(t.status))}</span><span>${esc(stream(t.workstream_id))}</span>${overdue(t)?'<span>Overdue</span>':''}${escalated(t)?'<span>Founder decision needed</span>':''}</div><h3>${esc(t.title)}</h3><p class="muted">${esc(context(t.id).project_title||project(t.project_id))} · ${esc(t.required_skill)} · Level ${t.required_level}</p><p>${esc(t.expected_output)}</p><div class="team-meta"><span>${t.base_tokens} tokens</span><span>Due ${esc(date(t.due_at))}</span>${blocked?`<span>${blocked} dependencies</span>`:''}</div><small>Owner: ${esc(context(t.id).owner_name||name(t.owner_id))} · ${t.admin_acceptance?'Final acceptance: Admin':'Acceptance: Reviewer'}</small>${t.rework_reason?`<p class="team-message">${esc(label(t.rework_category))}: ${esc(t.rework_reason)}</p>`:''}<div class="team-actions">${actions}</div></article>`;
  }
  function renderWallet(content) {
    const entries=rows.ledger;
    const reserved=entries.reduce((s,e)=>s+(e.event_type==='RESERVED'?e.tokens:e.event_type==='RELEASED'?-e.tokens:0),0);
    const earned=entries.filter(e=>['EARNED','BONUS'].includes(e.event_type)).reduce((s,e)=>s+e.tokens,0);
    const history=rows.tasks.filter(t=>t.owner_id===me&&t.accepted_at);
    const ontime=history.filter(t=>Date.parse(t.submitted_at)<=Date.parse(t.due_at)).length;
    content.innerHTML=`<div class="team-metrics">${metric('Reserved tokens',reserved)}${metric('Earned / lifetime tokens',earned)}${!admin?metric('On-time accepted work',history.length?`${Math.round(ontime/history.length*100)}%`:'—')+metric('Projects contributed',new Set(history.map(t=>t.project_id)).size):''}</div><p class="wallet-note">Tokens measure contribution. They have no fixed EGP value. Payable and paid balances will become available when project closeout and settlement are enabled.</p>${entries.length?`<div class="team-card">${[...entries].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).map(e=>`<div class="team-event"><b>${esc(e.event_type)} · ${e.tokens} tokens</b><p>${esc(admin?name(e.member_id)+' · ':'')}${esc(rows.tasks.find(t=>t.id===e.task_id)?.title||'Previous assignment')} · ${esc(date(e.created_at))}</p><small>${esc(e.reason)}</small></div>`).join('')}</div>`:'<div class="team-empty">Your first assignment will create a token reservation here.</div>'}`;
  }
  function modal(title,body,onSubmit,submitText='Save') {
    const d=$('#team-dialog',root);
    d.innerHTML=`<div class="team-toolbar"><h2 id="team-dialog-title">${esc(title)}</h2><button type="button" data-team-close aria-label="Close dialog">×</button></div><form><div class="team-form-grid">${body}</div><p class="team-message error" role="alert" hidden></p><div class="team-actions">${onSubmit?`<button class="primary" type="submit">${esc(submitText)}</button>`:''}<button type="button" data-team-close>Close</button></div></form>`;
    d.querySelectorAll('[data-team-close]').forEach(b=>b.onclick=()=>d.close());
    $('form',d).onsubmit=async e=>{e.preventDefault();if(!onSubmit)return;const b=$('[type=submit]',d);b.disabled=true;const error=$('[role=alert]',d);error.hidden=true;try{await onSubmit(new FormData(e.target),e.target);d.close();if(await refresh())message('Saved.');}catch(ex){error.hidden=false;error.textContent=ex.message;}finally{b.disabled=false;}};
    d.showModal();
  }
  async function command(action,payload) {const q=await sb.rpc('studio_team_command',{p_action:action,p_payload:payload});if(q.error)throw q.error;return q.data;}
  function memberForm(id) {
    const m=rows.members.find(x=>x.id===id)||{capacity:2,active:true,available:true,can_claim:true};
    const skills=rows.skills.filter(s=>s.member_id===id).map(s=>`${s.skill}:${s.level}`).join(', ');
    modal(id?'Edit member':'Add member',field('full_name','Full name',m.full_name,'text','required maxlength="160"')+field('email','Approved email',m.email,'email',`required ${m.auth_user_id?'readonly':''}`)+select('member_type','Membership type',['founder','core_partner_candidate','project_partner','contributor','external_supplier'].map(x=>[x,label(x)]),m.member_type||'contributor')+field('capacity','Maximum active tasks',m.capacity,'number','min="1" max="50" required')+area('skills','Skills and levels (e.g. design:3, development:4)',skills,false)+check('active','Active membership',m.active)+check('available','Available for new work',m.available)+check('can_claim','Can take marketplace tasks',m.can_claim),async(fd,form)=>{
      const list=fd.get('skills').split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const parts=x.split(':');return {skill:parts[0].trim().toLowerCase(),level:Number(parts[1]||1)};});
      if(list.some(s=>!s.skill||!Number.isInteger(s.level)||s.level<1||s.level>5)||new Set(list.map(s=>s.skill)).size!==list.length)throw new Error('Use unique skills with a level from 1 to 5, for example design:3.');
      await command('save_member',{id:id||null,full_name:fd.get('full_name'),email:fd.get('email'),member_type:fd.get('member_type'),capacity:Number(fd.get('capacity')),skills:list,active:form.elements.active.checked,available:form.elements.available.checked,can_claim:form.elements.can_claim.checked});
    });
  }
  const localDate = v => {const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  function taskForm(id) {
    const t=rows.tasks.find(x=>x.id===id)||{base_tokens:10,required_level:1,admin_acceptance:true,escalate_hours:24};
    const projects=rows.projects.filter(p=>!['completed','cancelled'].includes(p.status));
    const members=rows.members.filter(m=>m.active);
    if(!projects.length||!members.length){message('Add a member and make sure an active client project exists before creating tasks.',true);return;}
    const defaultProject=id?t.project_id:(projects.some(p=>p.id===requestedProject)?requestedProject:t.project_id);
    const deps=rows.dependencies.filter(d=>d.task_id===id).map(d=>d.depends_on);
    modal(id?'Edit available task':'Create project task',select('project_id','Project',projects.map(p=>[p.id,p.title]),defaultProject,'required')+field('workstream','Workstream',stream(t.workstream_id),'text','required maxlength="160"')+field('title','Task name',t.title,'text','required maxlength="200"')+field('required_skill','Required skill',t.required_skill,'text','required maxlength="80" list="team-skill-options"')+`<datalist id="team-skill-options">${[...new Set(rows.skills.map(s=>s.skill))].map(s=>`<option value="${esc(s)}">`).join('')}</datalist>`+field('required_level','Minimum skill level',t.required_level,'number','min="1" max="5" required')+field('base_tokens','Base tokens',t.base_tokens,'number','min="1" max="100000" required')+select('reviewer_id','Reviewer',members.map(m=>[m.id,m.full_name]),t.reviewer_id,'required')+field('due_at','Deadline',t.due_at?localDate(t.due_at):'','datetime-local','required')+area('expected_output','Expected output',t.expected_output)+area('acceptance_criteria','Acceptance criteria',t.acceptance_criteria)+select('assignment_mode','Assignment mode',[['marketplace','Marketplace'],['direct','Admin assignment only']],t.assignment_mode||'marketplace')+field('escalate_hours','Escalate unclaimed after (hours)',t.escalate_hours,'number','min="1" max="720" required')+`<label class="wide">Dependencies (Ctrl / Command to select multiple)<select name="dependencies" multiple>${rows.tasks.filter(x=>x.id!==id).map(x=>`<option value="${x.id}" data-project="${x.project_id}" ${deps.includes(x.id)?'selected':''}>${esc(x.title)}</option>`).join('')}</select></label>`+check('admin_acceptance','Require admin for final acceptance',t.admin_acceptance)+(id?area('reason','Reason for scope change'):''),async(fd,form)=>{
      await command(id?'edit_task':'create_task',{...Object.fromEntries(fd),id:id||null,base_tokens:Number(fd.get('base_tokens')),required_level:Number(fd.get('required_level')),escalate_hours:Number(fd.get('escalate_hours')),due_at:new Date(fd.get('due_at')).toISOString(),dependencies:fd.getAll('dependencies'),admin_acceptance:form.elements.admin_acceptance.checked});
    },id?'Save changes':'Create task');
    const form=$('#team-dialog form',root); if(id)form.elements.project_id.disabled=true;
    // Disabled fields are omitted by FormData; keep project locked with a hidden input.
    if(id){const h=document.createElement('input');h.type='hidden';h.name='project_id';h.value=t.project_id;form.append(h);}
    const filter=()=>{const pid=t.project_id||form.elements.project_id.value;[...form.elements.dependencies.options].forEach(o=>{o.hidden=o.dataset.project!==pid;o.disabled=o.hidden;if(o.hidden)o.selected=false;});};
    form.querySelector('select[name=project_id]').addEventListener('change',filter);filter();
  }
  function taskAction(action,id) {
    const t=rows.tasks.find(x=>x.id===id);if(!t)return;
    if(action==='details'){
      const events=rows.events.filter(e=>e.task_id===id).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
      modal(t.title,`<div class="wide"><h3>Acceptance criteria</h3><pre>${esc(t.acceptance_criteria)}</pre><h3>Delivery evidence</h3><pre>${esc(t.submission||'No submission yet.')}</pre><p>Reviewer: ${esc(t.admin_acceptance&&!t.reviewer_id?'Admin':(context(t.id).reviewer_name||name(t.reviewer_id)))}</p><h3>History</h3>${events.map(e=>`<details class="team-event"><summary>${esc(label(e.action))} · ${esc(date(e.created_at))}</summary><pre>${esc(JSON.stringify(e.details,null,2))}</pre></details>`).join('')||'<p>No events visible.</p>'}</div>`,null);return;
    }
    let body=`<p class="wide">${esc(t.title)}</p>`;let extra={};
    if(action==='assign')body+=select('member_id','Task owner',rows.members.filter(m=>m.active&&m.id!==t.reviewer_id).map(m=>[m.id,`${m.full_name} · ${load(m.id)}/${m.capacity}`]),'','required')+check('override_capacity','Override capacity (admin)',false)+area('reason','Assignment / override reason','',false);
    if(action==='submit')body+=area('submission','Delivery evidence / link');
    if(action==='rework')body+=select('category','Reason category',[['contributor_error','Contributor error'],['client_change','Client change'],['brief_issue','ATS / brief issue']],'contributor_error')+area('reason','What needs to change?');
    if(action==='unassign')body+=area('reason','Reason for releasing this assignment');
    if(action==='bonus'){extra.request_id=crypto.randomUUID();body+=field('tokens','Additional tokens','','number','min="1" max="100000" required')+area('reason','Exceptional contribution');}
    if(action==='deadline')body+=field('due_at','New deadline',localDate(t.due_at),'datetime-local','required')+area('reason','Reason for deadline change');
    if(action==='accept')body+=`<div class="wide"><h3>Acceptance criteria</h3><pre>${esc(t.acceptance_criteria)}</pre><h3>Submitted evidence</h3><pre>${esc(t.submission)}</pre></div>`+check('confirm','I checked the output against the acceptance criteria',false);
    modal(label(action),body,async(fd,form)=>{
      if(action==='accept'&&!form.elements.confirm.checked)throw new Error('Confirm the acceptance criteria check.');
      const p={id,...Object.fromEntries(fd),...extra};if(action==='assign')p.override_capacity=form.elements.override_capacity.checked;if(action==='deadline')p.due_at=new Date(fd.get('due_at')).toISOString();await command(action,p);
    },({claim:'Take task',start:'Start task',submit:'Submit for review',accept:'Accept & earn tokens',unassign:'Release task',bonus:'Award bonus',close:'Close task'})[action]||'Save');
  }
  async function handleClick(e) {
    const t=e.target.closest('[data-team-tab]');if(t){tab=t.dataset.teamTab;render();return;}
    const b=e.target.closest('[data-team-action]');if(!b)return;
    const a=b.dataset.teamAction,id=b.dataset.id;
    if(a==='refresh')return refresh();
    if(a==='member')return memberForm(id);
    if(a==='task')return taskForm(id);
    if(a==='domain-new-task')return domainNewTask(id);
    if(a==='domain-assign-task'||a==='domain-unassign-task'||a==='domain-deadline-task')return domainTaskManage(a,id);
    if(a==='domain-submit')return domainSubmit(id);
    if(a==='domain-accept'||a==='domain-rework')return domainAdminAction(a,id);
    taskAction(a,id);
  }
  function showAdmin() {
    if(!active||location.hash!=='#team')return;
    document.querySelectorAll('.app-view').forEach(el=>el.classList.toggle('active',el===root));
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.nav==='team'));
    $('#page-title').textContent='Team & Tasks';$('#page-kicker').textContent='STUDIO OPERATIONS';$('#page-subtitle').textContent='People execute. The system organizes.';
  }
  async function initAdmin() {
    if(active||$('#app').classList.contains('hidden'))return;
    const device=JSON.parse(localStorage.getItem('andrew_portfolio_device_v2')||'null');if(!device?.id||!device?.secret)return;
    const cfg=window.PORTFOLIO_CONFIG;
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    active=true;await refresh();showAdmin();
    if(requestedProject){
      const p=rows.projects.find(x=>x.id===requestedProject);
      if(p){tab=requestedDomain?'domains':'domains';render();message('Project accountability loaded: '+p.title+'. Review Domain Leads and outcomes first; task detail stays underneath each domain.');}
    }
    if(requestedNewTask&&requestedProject&&!requestedTaskOpened&&rows.projects.some(x=>x.id===requestedProject)){
      requestedTaskOpened=true;setTimeout(()=>taskForm(null),80);
    }
  }
  async function initMember() {
    const cfg=window.PORTFOLIO_CONFIG;if(!window.supabase||!cfg){$('#team-auth-message').textContent='Connection library unavailable. Please reload.';return;}
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{storageKey:'ats-team-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    root=$('#team-member-root');initRoot();
    const authMessage=(text)=>{$('#team-auth-message').textContent=text;};
    async function activate(){try{const r=await command('activate',{});me=r.member_id;$('#team-auth').hidden=true;root.hidden=false;$('#team-signout').hidden=false;active=true;await refresh();if(myDomains().length){tab='domains';render();}}catch(e){authMessage(e.message);$('#team-signout').hidden=false;}}
    $('#team-email-form').onsubmit=async e=>{e.preventDefault();const b=$('button',e.target);b.disabled=true;email=e.target.elements.email.value.trim();try{const r=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(r.error)throw r.error;$('#team-code-form').hidden=false;$('#team-email-form').hidden=true;authMessage('Enter the login code from your email.');}catch(ex){authMessage(ex.message);}finally{b.disabled=false;}};
    $('#team-code-form').onsubmit=async e=>{e.preventDefault();const b=$('button',e.target);b.disabled=true;try{const r=await sb.auth.verifyOtp({email,token:e.target.elements.code.value.trim(),type:'email'});if(r.error)throw r.error;await activate();}catch(ex){authMessage(ex.message);}finally{b.disabled=false;}};
    $('#team-change-email').onclick=()=>{$('#team-code-form').hidden=true;$('#team-email-form').hidden=false;$('#team-code-form').reset();authMessage('');};
    $('#team-signout').onclick=async()=>{await sb.auth.signOut();location.reload();};
    sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){root.hidden=true;$('#team-auth').hidden=false;active=false;me=null;rows={tasks:[],members:[],skills:[],streams:[],ledger:[],events:[],projects:[],dependencies:[],context:[]};}});
    const q=await sb.auth.getSession();if(q.data.session)await activate();
  }
  if(admin){
    const overview=document.createElement('section');overview.id='team-overview';overview.className='panel team-toolbar';overview.style.padding='22px';$('[data-view=dashboard]').prepend(overview);
    root=document.createElement('section');root.className='app-view team-engine';root.dataset.view='team';$('.workspace-footer').before(root);initRoot();
    const link=document.createElement('a');link.className='nav-item';link.href='#team';link.dataset.nav='team';link.innerHTML='<span class="nav-icon">◈</span><span>Team & Tasks</span>';
    $('.sidebar-nav').append(link);
    link.addEventListener('click',()=>setTimeout(showAdmin,0));window.addEventListener('hashchange',()=>setTimeout(showAdmin,0));
    new MutationObserver(()=>initAdmin().catch(e=>message(e.message,true))).observe($('#app'),{attributes:true,attributeFilter:['class']});
    initAdmin().catch(e=>message(e.message,true));
  }else initMember().catch(e=>{$('#team-auth-message').textContent=e.message;});
})();
