(() => {
  const DEMO_KEY = 'ats_v9_client_ops_demo_v2';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));

  const stageOrder = ['Onboarding','Content Preparation','Design','Development','Internal QA','Client Review','Revisions','Final Approval','Final Payment','Deployment','Completed'];
  const stageProgress = { 'Onboarding':10, 'Content Preparation':20, 'Design':40, 'Development':65, 'Internal QA':75, 'Client Review':85, 'Revisions':88, 'Final Approval':90, 'Final Payment':93, 'Deployment':95, 'Completed':100 };
  let currentProjectId = null;

  function loadData() { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); } catch { return {}; } }
  function saveData(data) { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); }
  function notify(message) { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('show'), 1800); }
  function ensureData() {
    const d = loadData(); d.projects = Array.isArray(d.projects) ? d.projects : []; d.clients = Array.isArray(d.clients) ? d.clients : []; d.payments = Array.isArray(d.payments) ? d.payments : []; d.activity = Array.isArray(d.activity) ? d.activity : [];
    d.projects.forEach(p => { if (!Array.isArray(p.updates)) p.updates = []; if (!Array.isArray(p.activity)) p.activity = [{ title:'Project created', meta:`${p.stage || 'Onboarding'} · Client Operations` }]; if (!p.health) p.health = 'On Track'; if (!p.status) p.status = p.stage === 'Completed' ? 'completed' : 'active'; });
    saveData(d); return d;
  }
  function projectById(data, id) { return data.projects.find(p => p.id === id); }
  function clientById(data, id) { return data.clients.find(c => c.id === id); }

  function injectViews() {
    const placeholder = $('[data-view="placeholder"]');
    if (!placeholder || $('[data-view="projects"]')) return;
    placeholder.insertAdjacentHTML('beforebegin', `
      <section class="app-view" data-view="projects">
        <div class="view-toolbar"><div><p class="overline">PROJECT OPERATIONS</p><h2 style="margin:5px 0 0">Projects</h2></div><span class="branch-chip">STAGE-DRIVEN WORKFLOW</span></div>
        <section class="lead-summary-grid">
          <article><span>ACTIVE</span><strong id="project-count-active">0</strong><small>Currently in delivery</small></article>
          <article><span>WAITING FOR CLIENT</span><strong id="project-count-waiting">0</strong><small>Approval, file or payment needed</small></article>
          <article><span>COMPLETED</span><strong id="project-count-completed">0</strong><small>Delivered projects</small></article>
          <article><span>AT RISK</span><strong id="project-count-risk">0</strong><small>Needs operational attention</small></article>
        </section>
        <section class="panel"><div class="panel-head"><div><p class="overline">PROJECT REGISTER</p><h2>All Projects</h2></div></div><div id="project-register" class="project-register"></div></section>
      </section>

      <section class="app-view" data-view="project-detail">
        <button class="back-button proposal-back" type="button" data-project-go="projects">← BACK TO PROJECTS</button>
        <div class="workspace-hero">
          <section class="project-identity">
            <div class="entity-id" id="workspace-project-id">ATS-PRJ-0001</div>
            <h2 id="workspace-project-title">Project</h2>
            <p id="workspace-project-client">Client</p>
            <div class="project-metrics" id="workspace-project-metrics"></div>
          </section>
          <section class="stage-control">
            <span>CURRENT STAGE</span>
            <h3 id="workspace-stage">Onboarding</h3>
            <p id="workspace-next-copy">Next operational step.</p>
            <button class="button button-primary" id="advance-stage" type="button">ADVANCE TO NEXT STAGE</button>
          </section>
        </div>

        <div class="project-stage-strip" id="project-stage-strip"></div>

        <div class="workspace-tabs" id="workspace-tabs">
          <button class="active" type="button" data-project-tab="overview">OVERVIEW</button>
          <button type="button" data-project-tab="files">FILES</button>
          <button type="button" data-project-tab="revisions">REVISIONS</button>
          <button type="button" data-project-tab="approvals">APPROVALS</button>
          <button type="button" data-project-tab="payments">PAYMENTS</button>
          <button type="button" data-project-tab="updates">UPDATES</button>
          <button type="button" data-project-tab="activity">ACTIVITY</button>
        </div>

        <section class="project-tab active" data-project-tab-panel="overview">
          <div class="project-overview-grid">
            <section class="panel"><div class="panel-head"><div><p class="overline">OPERATIONAL STATUS</p><h2>Project Overview</h2></div><span class="health-badge" id="workspace-health">ON TRACK</span></div><div class="project-action-card"><span>CLIENT ACTION</span><b id="workspace-client-action">No action required</b><p>The portal will surface this as the single primary action required from the client.</p></div><div class="project-action-card" style="margin-top:8px"><span>NEXT INTERNAL ACTION</span><b id="workspace-internal-action">Complete onboarding requirements</b><p>Admin-only operating instruction. This is never exposed to the client.</p></div></section>
            <section class="panel"><div class="panel-head"><div><p class="overline">COMMERCIAL</p><h2>Project Financials</h2></div></div><div class="finance-mini" id="workspace-finance"></div></section>
          </div>
        </section>

        <section class="project-tab" data-project-tab-panel="files"><div class="panel"><div class="panel-head"><div><p class="overline">PROJECT FILES</p><h2>Files</h2></div></div><div class="project-empty-tab">File categories are mapped: Client Uploads, Internal, Review and Final Delivery. Storage + visibility controls are connected after the client portal permission layer.</div></div></section>
        <section class="project-tab" data-project-tab-panel="revisions"><div class="panel"><div class="panel-head"><div><p class="overline">CHANGE CONTROL</p><h2>Revisions</h2></div></div><div class="project-empty-tab">Revision rounds, corrections and scope changes are defined in the blueprint and will connect after review/approval workflow.</div></div></section>
        <section class="project-tab" data-project-tab-panel="approvals"><div class="panel"><div class="panel-head"><div><p class="overline">CLIENT DECISIONS</p><h2>Approvals</h2></div></div><div class="project-empty-tab">Formal client approvals will be immutable records tied to deliverable versions.</div></div></section>
        <section class="project-tab" data-project-tab-panel="payments"><div class="panel"><div class="panel-head"><div><p class="overline">PROJECT FINANCE</p><h2>Payments</h2></div></div><div id="workspace-payment-list"></div></div></section>
        <section class="project-tab" data-project-tab-panel="updates"><div class="panel project-update-form"><div class="panel-head"><div><p class="overline">CLIENT-VISIBLE</p><h2>Project Updates</h2></div></div><textarea id="project-update-text" placeholder="Write a concise project progress update for the client portal..."></textarea><div class="inline-actions"><button class="button button-primary" id="post-project-update" type="button">POST CLIENT UPDATE</button></div><div id="project-updates" class="project-updates"></div></div></section>
        <section class="project-tab" data-project-tab-panel="activity"><div class="panel"><div class="panel-head"><div><p class="overline">AUDIT TRAIL</p><h2>Activity</h2></div></div><div id="project-activity" class="project-activity"></div></div></section>
      </section>`);
  }

  function setTopbar(kicker,title,subtitle){ $('#page-kicker').textContent=kicker; $('#page-title').textContent=title; $('#page-subtitle').textContent=subtitle; }
  function showView(view){ $$('.app-view').forEach(el=>el.classList.toggle('active',el.dataset.view===view)); $$('.nav-item').forEach(link=>link.classList.toggle('active',link.dataset.nav===(view==='project-detail'?'projects':view))); if(view==='projects') setTopbar('PROJECT OPERATIONS','Projects','Move active client work through a controlled stage-driven delivery workflow.'); if(view==='project-detail') setTopbar('PROJECT WORKSPACE','Project Workspace','One operating record for delivery, client actions, finance, updates and approvals.'); window.scrollTo({top:0,behavior:'smooth'}); }

  function renderProjectRegister(filter='all'){
    const d=ensureData(); let projects=d.projects;
    if(filter==='waiting') projects=projects.filter(p=>p.clientAction && p.clientAction!=='No action required' && p.status!=='completed');
    if(filter==='completed') projects=projects.filter(p=>p.status==='completed'||p.stage==='Completed');
    if(filter==='active') projects=projects.filter(p=>p.status!=='completed'&&p.stage!=='Completed');
    $('#project-count-active').textContent=d.projects.filter(p=>p.status!=='completed'&&p.stage!=='Completed').length;
    $('#project-count-waiting').textContent=d.projects.filter(p=>p.clientAction&&p.clientAction!=='No action required'&&p.status!=='completed').length;
    $('#project-count-completed').textContent=d.projects.filter(p=>p.status==='completed'||p.stage==='Completed').length;
    $('#project-count-risk').textContent=d.projects.filter(p=>['At Risk','Delayed'].includes(p.health)).length;
    $('#project-register').innerHTML=projects.length?projects.map(p=>`<div class="project-register-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.id)} · ${escapeHtml(p.client)}</small></div><span class="stage-badge">${escapeHtml(p.stage)}</span><span><div class="progress-meta"><span>Progress</span><b>${Number(p.progress||0)}%</b></div><div class="progress-track"><i style="width:${Number(p.progress||0)}%"></i></div></span><span>${escapeHtml(p.deadline||'—')}</span><span class="health-badge">${escapeHtml((p.health||'On Track').toUpperCase())}</span><button type="button" data-project-open="${escapeHtml(p.id)}">OPEN →</button></div>`).join(''):'<div class="proposal-empty">No projects in this view yet.</div>';
  }

  function nextStageCopy(stage){
    const map={'Onboarding':'Confirm project setup, required files and content before production begins.','Content Preparation':'Validate all client content and prepare the approved information architecture.','Design':'Produce the approved visual direction and client review version.','Development':'Build the approved experience and prepare internal quality checks.','Internal QA':'Test quality, responsiveness, content and functionality before client review.','Client Review':'Client action is required: review the current deliverable and approve or request changes.','Revisions':'Implement the consolidated revision round and return a new version for approval.','Final Approval':'Secure final client approval before final payment and deployment.','Final Payment':'Confirm the outstanding balance before final release.','Deployment':'Publish, validate production and prepare final delivery.','Completed':'Project is complete and ready for retention, testimonial and portfolio follow-up.'}; return map[stage]||'Continue the project workflow.';
  }
  function internalAction(stage){ const map={'Onboarding':'Complete onboarding requirements','Content Preparation':'Prepare final content structure','Design':'Create design review version','Development':'Complete build and responsive implementation','Internal QA':'Run internal quality checklist','Client Review':'Track client review response','Revisions':'Complete consolidated revision request','Final Approval':'Request final approval','Final Payment':'Confirm final payment','Deployment':'Deploy and validate production','Completed':'Archive and start retention follow-up'}; return map[stage]||'Review project status'; }
  function clientActionForStage(stage,project){ if(stage==='Client Review') return 'Review current deliverable'; if(stage==='Final Approval') return 'Approve final version'; if(stage==='Final Payment') return `Pay outstanding EGP ${money(project.outstanding||0)}`; if(stage==='Onboarding') return 'Provide onboarding information'; return 'No action required'; }

  function renderWorkspace(id){
    const d=ensureData(); const p=projectById(d,id); if(!p) return notify('Project not found'); currentProjectId=id; const client=clientById(d,p.clientId);
    $('#workspace-project-id').textContent=p.id; $('#workspace-project-title').textContent=p.title; $('#workspace-project-client').textContent=`${p.client}${client?.id?` · ${client.id}`:''}`; $('#workspace-stage').textContent=p.stage; $('#workspace-next-copy').textContent=nextStageCopy(p.stage); $('#workspace-health').textContent=(p.health||'On Track').toUpperCase(); $('#workspace-client-action').textContent=p.clientAction||'No action required'; $('#workspace-internal-action').textContent=internalAction(p.stage);
    $('#workspace-project-metrics').innerHTML=[['Progress',`${p.progress||0}%`],['Deadline',p.deadline||'—'],['Status',p.status||'active'],['Project Value',`EGP ${money(p.projectValue||0)}`]].map(([l,v])=>`<div><span>${escapeHtml(l.toUpperCase())}</span><b>${escapeHtml(v)}</b></div>`).join('');
    $('#workspace-finance').innerHTML=`<div><span>PROJECT VALUE</span><b>EGP ${money(p.projectValue||0)}</b></div><div><span>PAID</span><b>EGP ${money(p.paid||0)}</b></div><div><span>OUTSTANDING</span><b>EGP ${money(p.outstanding||0)}</b></div>`;
    const idx=stageOrder.indexOf(p.stage); $('#project-stage-strip').innerHTML=stageOrder.map((s,i)=>`<div class="stage-node ${i<idx?'done':i===idx?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(s)}</b></div>`).join('');
    $('#advance-stage').disabled=p.stage==='Completed'; $('#advance-stage').textContent=p.stage==='Completed'?'PROJECT COMPLETED':`ADVANCE TO ${escapeHtml(stageOrder[Math.min(idx+1,stageOrder.length-1)]||'NEXT STAGE').toUpperCase()}`;
    renderProjectPayments(d,p); renderProjectUpdates(p); renderProjectActivity(p); showProjectTab('overview');
  }

  function renderProjectPayments(d,p){ const payments=d.payments.filter(x=>x.leadId===d.clients.find(c=>c.id===p.clientId)?.leadId); const box=$('#workspace-payment-list'); if(!box)return; box.innerHTML=payments.length?payments.map(x=>`<div class="payment-row"><div><b>${escapeHtml(x.type==='deposit'?'Project Deposit':x.type)}</b><small>${escapeHtml(x.id)}</small></div><span>${escapeHtml(x.proposalId||'')}</span><span class="amount">EGP ${money(x.amount)}</span><span>${escapeHtml(x.dueDate||'—')}</span><span class="payment-status-${escapeHtml(x.status)}">${escapeHtml(String(x.status).toUpperCase())}</span><span>${x.status==='paid'?'Confirmed':'Pending'}</span></div>`).join(''):'<div class="project-empty-tab">No project payments recorded.</div>'; }
  function renderProjectUpdates(p){ const box=$('#project-updates'); if(!box)return; box.innerHTML=p.updates.length?p.updates.map(u=>`<div class="project-update"><b>${escapeHtml(u.title||'Project Update')}</b><p>${escapeHtml(u.content)}</p><small>${escapeHtml(u.createdAtLabel||'Now')} · Client visible</small></div>`).join(''):'<div class="project-empty-tab">No client-visible updates yet.</div>'; }
  function renderProjectActivity(p){ const box=$('#project-activity'); if(!box)return; box.innerHTML=p.activity.length?p.activity.map(a=>`<div><b>${escapeHtml(a.title)}</b><span>${escapeHtml(a.meta||'')}</span></div>`).join(''):'<div class="project-empty-tab">No project activity yet.</div>'; }

  function openProject(id){ renderWorkspace(id); showView('project-detail'); history.replaceState(null,'',`#project/${encodeURIComponent(id)}`); }
  function showProjects(filter='all'){ renderProjectRegister(filter); showView('projects'); history.replaceState(null,'',filter==='all'||filter==='active'?'#projects':`#${filter}`); }
  function showProjectTab(tab){ $$('#workspace-tabs [data-project-tab]').forEach(b=>b.classList.toggle('active',b.dataset.projectTab===tab)); $$('[data-project-tab-panel]').forEach(p=>p.classList.toggle('active',p.dataset.projectTabPanel===tab)); }

  function advanceStage(){ const d=ensureData(); const p=projectById(d,currentProjectId); if(!p)return; const idx=stageOrder.indexOf(p.stage); if(idx<0||idx>=stageOrder.length-1)return; const next=stageOrder[idx+1]; p.stage=next; p.progress=stageProgress[next]||p.progress; p.clientAction=clientActionForStage(next,p); p.status=next==='Completed'?'completed':'active'; if(!Array.isArray(p.activity))p.activity=[]; p.activity.unshift({title:`Stage changed to ${next}`,meta:`${p.progress}% progress · Demo workflow`}); d.activity.unshift({icon:'◫',title:`${p.id} → ${next}`,detail:p.client,time:'Now'}); saveData(d); renderWorkspace(p.id); notify(`${p.id} → ${next}`); }
  function postUpdate(){ const text=$('#project-update-text').value.trim(); if(!text)return notify('Write the client update first'); const d=ensureData(); const p=projectById(d,currentProjectId); if(!p)return; p.updates.unshift({title:`${p.stage} Update`,content:text,createdAt:new Date().toISOString(),createdAtLabel:'Now'}); p.activity.unshift({title:'Client update posted',meta:`${p.stage} · Client visible`}); d.activity.unshift({icon:'↑',title:`${p.id} client update posted`,detail:p.stage,time:'Now'}); saveData(d); $('#project-update-text').value=''; renderProjectUpdates(p); renderProjectActivity(p); notify('Client-visible project update posted'); }

  function syncDashboardFromStorage(){ const d=ensureData(); const kp=$('#kpi-projects'); const kw=$('#kpi-waiting'); const kpay=$('#kpi-payments'); if(kp)kp.textContent=d.projects.filter(p=>p.status!=='completed').length; if(kw)kw.textContent=d.projects.filter(p=>p.clientAction&&p.clientAction!=='No action required'&&p.status!=='completed').length; if(kpay)kpay.textContent=d.payments.filter(p=>p.status==='pending').length; const body=$('#project-table-body'); if(body) body.innerHTML=d.projects.filter(p=>p.status!=='completed').map(project=>`<tr><td class="project-title"><b>${escapeHtml(project.title)}</b><small>${project.id} · ${escapeHtml(project.client)}</small></td><td><span class="stage-badge">${escapeHtml(project.stage)}</span></td><td class="progress-cell"><div class="progress-meta"><span>Stage progress</span><b>${project.progress}%</b></div><div class="progress-track"><i style="width:${project.progress}%"></i></div></td><td>${escapeHtml(project.deadline||'—')}</td><td class="client-action none">${escapeHtml(project.clientAction||'No action required')}</td><td><button class="table-open" type="button" data-project-open="${escapeHtml(project.id)}">→</button></td></tr>`).join(''); const f=d.finance||{}; if($('#revenue-confirmed'))$('#revenue-confirmed').textContent=money(f.confirmed||0); if($('#revenue-collected'))$('#revenue-collected').textContent=money(f.collected||0); if($('#revenue-outstanding'))$('#revenue-outstanding').textContent=money(f.outstanding||0); if($('#revenue-progress'))$('#revenue-progress').style.width=`${f.confirmed?Math.min(100,(f.collected/f.confirmed)*100):0}%`; }

  injectViews(); ensureData(); renderProjectRegister('all'); syncDashboardFromStorage();

  document.addEventListener('click',event=>{
    const projectsNav=event.target.closest('[data-nav="projects"]'); const waitingNav=event.target.closest('[data-nav="waiting"]'); const completedNav=event.target.closest('[data-nav="completed"]'); const projectOpen=event.target.closest('[data-project-open]'); const back=event.target.closest('[data-project-go="projects"]'); const tab=event.target.closest('[data-project-tab]'); const dash=event.target.closest('[data-nav="dashboard"],[data-go="dashboard"]'); const reset=event.target.closest('#reset-demo');
    if(projectsNav){event.preventDefault();event.stopImmediatePropagation();showProjects('active');return;} if(waitingNav){event.preventDefault();event.stopImmediatePropagation();showProjects('waiting');return;} if(completedNav){event.preventDefault();event.stopImmediatePropagation();showProjects('completed');return;} if(projectOpen){event.preventDefault();event.stopImmediatePropagation();openProject(projectOpen.dataset.projectOpen);return;} if(back){event.preventDefault();event.stopImmediatePropagation();showProjects('all');return;} if(tab){event.preventDefault();showProjectTab(tab.dataset.projectTab);return;} if(dash)setTimeout(syncDashboardFromStorage,0); if(reset){localStorage.removeItem('ats_v9_client_ops_migrated_v3');setTimeout(()=>location.reload(),80);}
  },true);

  $('#advance-stage')?.addEventListener('click',advanceStage); $('#post-project-update')?.addEventListener('click',postUpdate);
  window.addEventListener('hashchange',()=>{const h=location.hash.replace(/^#/,''); if(h==='projects')setTimeout(()=>showProjects('active'),0); if(h==='waiting')setTimeout(()=>showProjects('waiting'),0); if(h==='completed')setTimeout(()=>showProjects('completed'),0); if(h.startsWith('project/'))setTimeout(()=>openProject(decodeURIComponent(h.slice(8))),0);});
  const app=$('#app'); if(app)new MutationObserver(()=>{if(!app.classList.contains('hidden')){syncDashboardFromStorage();const h=location.hash.replace(/^#/,'');if(h==='projects')setTimeout(()=>showProjects('active'),0);if(h.startsWith('project/'))setTimeout(()=>openProject(decodeURIComponent(h.slice(8))),0);}}).observe(app,{attributes:true,attributeFilter:['class']});
})();