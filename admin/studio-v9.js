(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const DEMO_KEY = 'ats_v9_client_ops_demo_v2';

  const defaultDemo = {
    leads: [{
      id: 'ATS-TEST-001',
      name: 'Kareem Hassan',
      company: 'BuildCore Contracting',
      email: 'kareem@example.com',
      phone: '+20 10 0000 0000',
      service: 'Website Development',
      budget: '15,000–25,000 EGP',
      timeline: 'Within 2–4 weeks',
      source: 'Official Website',
      status: 'new',
      fit: 'High Fit',
      createdAt: '15 Sep 2026',
      goal: 'Build a professional bilingual corporate website that presents BuildCore services and completed projects and helps generate qualified corporate enquiries.',
      assets: ['Company Profile', 'Logo', 'Project Photos'],
      questions: ['Confirm final page count.', 'Confirm Arabic and English content readiness.', 'Confirm domain and hosting status.', 'Confirm whether a content admin dashboard is required.'],
      notes: '',
      lostReason: '',
      activity: [
        { title: 'Project request received', meta: 'Official Website · 15 Sep 2026' },
        { title: 'Lead created', meta: 'ATS-TEST-001 · New Inquiry' }
      ]
    }],
    projects: [{ id: 'ATS-PRJ-0001', title: 'BuildCore Corporate Website', client: 'BuildCore Contracting', stage: 'Development', progress: 65, deadline: '30 Sep 2026', clientAction: 'No action required' }],
    finance: { confirmed: 20000, collected: 10000, outstanding: 10000 },
    activity: [
      { icon: '+', title: 'Studio OS client-operations branch isolated', detail: 'v9-client-ops', time: 'Now' },
      { icon: '◎', title: 'Test lead ATS-TEST-001 prepared for workflow validation', detail: 'BuildCore Contracting', time: 'Today' },
      { icon: '◫', title: 'Test project ATS-PRJ-0001 set to Development', detail: '65% stage-driven progress', time: 'Today' }
    ]
  };

  const state = { device: null, sb: null, poll: null, demo: loadDemo(), currentLeadId: null, lostTargetId: null, leadFilter: 'active' };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadDemo() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return { ...clone(defaultDemo), ...JSON.parse(raw) };
    } catch (_error) {}
    return clone(defaultDemo);
  }
  function saveDemo() { localStorage.setItem(DEMO_KEY, JSON.stringify(state.demo)); }
  function resetDemo() { state.demo = clone(defaultDemo); saveDemo(); renderAll(); toast('Demo workflow reset'); route('leads'); }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function formatNumber(value) { return new Intl.NumberFormat('en-US').format(value); }
  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function titleCaseStatus(status) { return ({ new: 'New Inquiry', reviewing: 'Reviewing', qualified: 'Qualified', proposal_sent: 'Proposal Sent', lost: 'Lost', won: 'Won' })[status] || status; }

  function randomSecret() {
    const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function randomCode() { const values = new Uint32Array(1); crypto.getRandomValues(values); return String(values[0] % 1000000).padStart(6, '0'); }
  async function sha256hex(value) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function makeClient(device) {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: { 'x-portfolio-device-id': device.id, 'x-portfolio-device-secret': device.secret } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
  function showTrust(message = 'This browser needs one-time approval before Studio OS can open.') {
    $('#gate-message').textContent = message;
    $('#trust-start').classList.remove('hidden');
    $('#pairing-box').classList.add('hidden');
  }
  function showPending(code) {
    $('#trust-start').classList.add('hidden');
    $('#pairing-box').classList.remove('hidden');
    $('#pairing-code').textContent = code || '------';
    $('#gate-message').textContent = 'This Studio OS browser is waiting for Trusted Device approval.';
    startPolling();
  }
  function startPolling() { if (!state.poll) state.poll = setInterval(checkDevice, 3000); }
  function stopPolling() { if (state.poll) clearInterval(state.poll); state.poll = null; }
  async function checkDevice() {
    if (!state.device?.id || !state.device?.secret || !state.sb) return false;
    const { data, error } = await state.sb.from('portfolio_trusted_devices').select('status,claim_code').eq('device_id', state.device.id).maybeSingle();
    if (error || !data) return false;
    if (data.status === 'approved') { stopPolling(); enterApp(); return true; }
    if (data.status === 'pending') { showPending(data.claim_code); return false; }
    localStorage.removeItem(DEVICE_KEY); state.device = null; state.sb = null; stopPolling(); showTrust('This device is no longer approved. Create a new approval request.'); return false;
  }
  async function initSecurity() {
    if (!cfg || !window.supabase) { $('#gate-message').textContent = 'Studio OS could not load the existing Supabase configuration.'; return; }
    try { state.device = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch (_error) { state.device = null; }
    if (!state.device?.id || !state.device?.secret) { showTrust(); return; }
    state.sb = makeClient(state.device);
    const ok = await checkDevice();
    if (!ok && !state.poll) showTrust();
  }

  $('#trust-device').addEventListener('click', async () => {
    const button = $('#trust-device');
    button.disabled = true; button.textContent = 'CREATING APPROVAL…';
    try {
      state.device = { id: crypto.randomUUID(), secret: randomSecret(), code: randomCode() };
      state.sb = makeClient(state.device);
      const secretHash = await sha256hex(state.device.secret);
      const { error } = await state.sb.from('portfolio_trusted_devices').insert({ device_id: state.device.id, secret_hash: secretHash, claim_code: state.device.code, label: `Studio OS V9 · ${location.hostname}`, status: 'pending' });
      if (error) { state.device = null; state.sb = null; toast(error.message); return; }
      localStorage.setItem(DEVICE_KEY, JSON.stringify(state.device));
      showPending(state.device.code);
    } finally { button.disabled = false; button.textContent = 'TRUST THIS BROWSER'; }
  });

  function enterApp() {
    $('#gate').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderAll();
    handleHash();
  }

  function activeLeads() { return state.demo.leads.filter(l => !['lost', 'won'].includes(l.status)); }
  function leadById(id) { return state.demo.leads.find(l => l.id === id); }
  function addLeadActivity(lead, title, meta) { lead.activity.unshift({ title, meta }); }

  function renderAll() {
    renderDashboard();
    renderLeads();
    updateNavCounts();
    if (state.currentLeadId) renderLeadDetail(state.currentLeadId);
  }

  function renderDashboard() {
    const newLeads = state.demo.leads.filter(l => l.status === 'new').length;
    $('#kpi-leads').textContent = newLeads;
    $('#kpi-projects').textContent = state.demo.projects.length;
    $('#kpi-waiting').textContent = state.demo.projects.filter(p => p.clientAction !== 'No action required').length;
    $('#kpi-payments').textContent = state.demo.finance.outstanding > 0 ? 1 : 0;

    const attention = [];
    state.demo.leads.filter(l => l.status === 'new').forEach(l => attention.push({ icon: '◎', title: 'Review new project enquiry', detail: `${l.id} · ${l.company}`, meta: 'Needs review', action: 'Review Lead', leadId: l.id }));
    if (state.demo.finance.outstanding > 0) attention.push({ icon: '£', title: 'Final payment remains outstanding', detail: `ATS-PRJ-0001 · EGP ${formatNumber(state.demo.finance.outstanding)}`, meta: 'Pending', action: 'Payments', go: 'payments' });
    $('#attention-list').innerHTML = attention.length ? attention.map(item => `<div class="attention-item"><span class="attention-icon">${item.icon}</span><div class="attention-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)}</small></div><div class="attention-meta"><span>${escapeHtml(item.meta)}</span><button type="button" ${item.leadId ? `data-lead="${item.leadId}"` : `data-go="${item.go}"`}>${escapeHtml(item.action)} →</button></div></div>`).join('') : '<div class="empty-column">Nothing needs immediate attention.</div>';

    $('#project-table-body').innerHTML = state.demo.projects.map(project => `<tr><td class="project-title"><b>${escapeHtml(project.title)}</b><small>${project.id} · ${escapeHtml(project.client)}</small></td><td><span class="stage-badge">${escapeHtml(project.stage)}</span></td><td class="progress-cell"><div class="progress-meta"><span>Stage progress</span><b>${project.progress}%</b></div><div class="progress-track"><i style="width:${project.progress}%"></i></div></td><td>${escapeHtml(project.deadline)}</td><td class="client-action none">${escapeHtml(project.clientAction)}</td><td><button class="table-open" type="button" data-go="projects" aria-label="Open project">→</button></td></tr>`).join('');

    const pipeline = ['new', 'reviewing', 'qualified', 'proposal_sent'].map(status => ({ status, count: state.demo.leads.filter(l => l.status === status).length }));
    const max = Math.max(1, ...pipeline.map(x => x.count));
    $('#pipeline-bars').innerHTML = pipeline.map((row, index) => `<div class="pipeline-row ${index === 0 && row.count ? 'active' : ''}"><span>${titleCaseStatus(row.status)}</span><div class="pipeline-track"><i style="width:${(row.count / max) * 100}%"></i></div><strong>${row.count}</strong></div>`).join('');

    $('#revenue-confirmed').textContent = formatNumber(state.demo.finance.confirmed);
    $('#revenue-collected').textContent = formatNumber(state.demo.finance.collected);
    $('#revenue-outstanding').textContent = formatNumber(state.demo.finance.outstanding);
    $('#revenue-progress').style.width = `${state.demo.finance.confirmed ? (state.demo.finance.collected / state.demo.finance.confirmed) * 100 : 0}%`;
    $('#activity-list').innerHTML = state.demo.activity.map(item => `<div class="activity-item"><span class="activity-mark">${item.icon}</span><div class="activity-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)}</small></div><span class="activity-time">${escapeHtml(item.time)}</span></div>`).join('');
  }

  function renderLeads() {
    const active = activeLeads();
    $('#lead-summary-active').textContent = active.length;
    $('#lead-summary-review').textContent = state.demo.leads.filter(l => l.status === 'new').length;
    $('#lead-summary-proposals').textContent = state.demo.leads.filter(l => l.status === 'proposal_sent').length;
    $('#lead-summary-won').textContent = state.demo.leads.filter(l => l.status === 'won').length;

    const columns = [
      { key: 'new', label: 'NEW' }, { key: 'reviewing', label: 'REVIEWING' }, { key: 'qualified', label: 'QUALIFIED' }, { key: 'proposal_sent', label: 'PROPOSAL SENT' }
    ];
    $('#lead-board').innerHTML = columns.map(column => {
      const items = state.demo.leads.filter(l => l.status === column.key);
      return `<div class="lead-column"><div class="lead-column-head"><b>${column.label}</b><span>${items.length}</span></div><div class="lead-stack">${items.length ? items.map(renderLeadCard).join('') : '<div class="empty-column">No leads in this stage.</div>'}</div></div>`;
    }).join('');

    const lost = state.demo.leads.filter(l => l.status === 'lost');
    $('#lost-lead-list').innerHTML = lost.length ? lost.map(l => `<div class="lost-row"><div><b>${escapeHtml(l.name)}</b><span>${escapeHtml(l.company)}</span></div><span>${escapeHtml(l.id)}</span><span>${escapeHtml(l.service)}</span><span>${escapeHtml(l.lostReason || 'No reason')}</span><button type="button" data-lead="${l.id}">Open →</button></div>`).join('') : '<div class="placeholder-panel panel"><p class="overline">LOST LEADS</p><h2>No lost leads.</h2><p>Leads closed with a required reason will remain here for future analysis.</p></div>';
    applyLeadFilter(state.leadFilter, false);
  }

  function renderLeadCard(lead) {
    return `<button class="lead-card" type="button" data-lead="${lead.id}"><div class="lead-card-top"><div><b>${escapeHtml(lead.name)}</b><span class="company">${escapeHtml(lead.company)}</span></div><span class="lead-id">${lead.id}</span></div><div class="lead-card-meta"><div><span>SERVICE</span><strong>${escapeHtml(lead.service)}</strong></div><div><span>BUDGET</span><strong>${escapeHtml(lead.budget)}</strong></div></div><div class="lead-card-foot"><span class="lead-fit"><i></i>${escapeHtml(lead.fit)}</span><span>${escapeHtml(lead.createdAt)}</span></div></button>`;
  }

  function renderLeadDetail(id) {
    const lead = leadById(id); if (!lead) return;
    state.currentLeadId = id;
    $('#detail-id').textContent = lead.id;
    $('#detail-name').textContent = lead.name;
    $('#detail-company').textContent = lead.company;
    const badge = $('#detail-status'); badge.textContent = titleCaseStatus(lead.status).toUpperCase(); badge.className = `status-badge status-${lead.status}`;
    $('#detail-overview').innerHTML = [
      ['Service', lead.service], ['Budget', lead.budget], ['Timeline', lead.timeline], ['Email', lead.email], ['Phone / WhatsApp', lead.phone], ['Source', lead.source]
    ].map(([label, value]) => `<div><span>${escapeHtml(label.toUpperCase())}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    $('#detail-goal').textContent = lead.goal;
    $('#detail-assets').innerHTML = lead.assets.map(a => `<span>${escapeHtml(a)}</span>`).join('');
    $('#detail-questions').innerHTML = lead.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('');
    $('#internal-notes').value = lead.notes || '';
    $('#lead-activity').innerHTML = lead.activity.map(a => `<div class="lead-activity-item"><b>${escapeHtml(a.title)}</b><span>${escapeHtml(a.meta)}</span></div>`).join('');
    renderLeadActions(lead);
  }

  function renderLeadActions(lead) {
    const actions = [];
    let nextTitle = '', nextCopy = '', nextButton = '';
    if (lead.status === 'new') {
      actions.push('<button class="button button-primary" type="button" data-lead-action="start-review">START REVIEW</button>');
      nextTitle = 'Review the enquiry'; nextCopy = 'Check project fit and identify missing discovery information before qualification.'; nextButton = 'START REVIEW';
    } else if (lead.status === 'reviewing') {
      actions.push('<button class="button button-primary" type="button" data-lead-action="qualify">QUALIFY LEAD</button>');
      nextTitle = 'Make the qualification decision'; nextCopy = 'The request is under review. Qualify only when scope, timing and fit are clear enough to move toward a proposal.'; nextButton = 'QUALIFY LEAD';
    } else if (lead.status === 'qualified') {
      actions.push('<button class="button button-primary" type="button" data-lead-action="proposal">CREATE PROPOSAL</button>');
      nextTitle = 'Prepare the proposal'; nextCopy = 'This lead is qualified. The next official step is a structured scope, timeline and commercial proposal.'; nextButton = 'CREATE PROPOSAL';
    } else if (lead.status === 'proposal_sent') {
      nextTitle = 'Await client decision'; nextCopy = 'A sent proposal should stay in this stage until accepted, expired or declined. Client conversion requires accepted proposal plus confirmed deposit.'; nextButton = '';
    } else if (lead.status === 'lost') {
      nextTitle = 'Lead closed'; nextCopy = `Lost reason: ${lead.lostReason || 'Not recorded'}. The record remains available for future sales analysis.`; nextButton = '';
    }
    if (!['lost', 'won'].includes(lead.status)) actions.push('<button class="button button-secondary" type="button" data-lead-action="contact">CONTACT</button><button class="button button-danger" type="button" data-lead-action="lost">MARK LOST</button>');
    $('#detail-actions').innerHTML = actions.join('');
    $('#next-action-card').innerHTML = `<b>${escapeHtml(nextTitle)}</b><p>${escapeHtml(nextCopy)}</p>${nextButton ? `<button class="button button-primary" type="button" data-lead-action="${lead.status === 'new' ? 'start-review' : lead.status === 'reviewing' ? 'qualify' : 'proposal'}">${nextButton}</button>` : ''}`;
  }

  function transitionLead(id, nextStatus, activityTitle) {
    const lead = leadById(id); if (!lead) return;
    lead.status = nextStatus;
    addLeadActivity(lead, activityTitle, `${titleCaseStatus(nextStatus)} · Demo workflow`);
    state.demo.activity.unshift({ icon: '◎', title: `${lead.id} moved to ${titleCaseStatus(nextStatus)}`, detail: lead.company, time: 'Now' });
    saveDemo(); renderAll(); renderLeadDetail(id); toast(`${lead.id} → ${titleCaseStatus(nextStatus)}`);
  }

  function openLead(id) {
    const lead = leadById(id); if (!lead) return toast('Lead not found');
    state.currentLeadId = id;
    renderLeadDetail(id);
    route('lead-detail', false);
    history.replaceState(null, '', `#lead/${encodeURIComponent(id)}`);
  }

  function applyLeadFilter(filter, rerender = true) {
    state.leadFilter = filter;
    $$('[data-lead-filter]').forEach(button => button.classList.toggle('active', button.dataset.leadFilter === filter));
    $('#lead-board').classList.toggle('hidden', filter === 'lost');
    $('#lost-lead-list').classList.toggle('hidden', filter !== 'lost');
    if (filter === 'all') $('#lead-board').classList.remove('hidden');
    if (rerender && filter === 'all') toast('Active pipeline shown. Lost leads remain in the Lost view.');
  }

  const viewMeta = {
    dashboard: ['STUDIO OPERATIONS · DEVELOPMENT MODE', 'Good afternoon, Andrew.', 'Here’s what needs your attention today.'],
    leads: ['SALES PIPELINE', 'Leads', 'Review, qualify and move project enquiries toward a structured proposal.'],
    'lead-detail': ['SALES · LEAD RECORD', 'Lead Detail', 'One source of truth for qualification, discovery and sales activity.']
  };

  function route(view, updateHash = true) {
    const known = ['dashboard', 'leads', 'lead-detail'];
    const target = known.includes(view) ? view : 'placeholder';
    $$('.app-view').forEach(section => section.classList.toggle('active', section.dataset.view === target));
    $$('.nav-item').forEach(link => link.classList.toggle('active', link.dataset.nav === (view === 'lead-detail' ? 'leads' : view)));
    if (target === 'placeholder') {
      $('#placeholder-title').textContent = ({ proposals: 'Proposals', clients: 'Clients', projects: 'Project Workspace', waiting: 'Waiting for Client', completed: 'Completed Projects', payments: 'Payments', portfolio: 'Portfolio', testimonials: 'Testimonials', activity: 'Activity Log' })[view] || 'Module';
      $('#placeholder-copy').textContent = 'This area is mapped in the MVP specification but intentionally remains locked until the preceding workflow slice is stable.';
      $('#page-kicker').textContent = 'CLIENT OPERATIONS · BUILD SEQUENCE'; $('#page-title').textContent = $('#placeholder-title').textContent; $('#page-subtitle').textContent = 'Next executable slice.';
    } else {
      const meta = viewMeta[view]; $('#page-kicker').textContent = meta[0]; $('#page-title').textContent = meta[1]; $('#page-subtitle').textContent = meta[2];
    }
    if (updateHash && view !== 'lead-detail') history.replaceState(null, '', `#${view}`);
    if (window.innerWidth <= 820) $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHash() {
    const hash = location.hash.replace(/^#/, '');
    if (hash.startsWith('lead/')) return openLead(decodeURIComponent(hash.slice(5)));
    route(hash || 'dashboard', false);
  }

  function updateNavCounts() { $('#nav-lead-count').textContent = activeLeads().length; }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { event.preventDefault(); route(nav.dataset.nav); }
    const go = event.target.closest('[data-go]');
    if (go) { event.preventDefault(); route(go.dataset.go); }
    const leadButton = event.target.closest('[data-lead]');
    if (leadButton) { event.preventDefault(); openLead(leadButton.dataset.lead); }
    const filter = event.target.closest('[data-lead-filter]');
    if (filter) applyLeadFilter(filter.dataset.leadFilter);
    const action = event.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'review-lead') openLead(state.demo.leads.find(l => l.status === 'new')?.id || state.demo.leads[0]?.id);
      else toast('This action is scheduled after the Leads slice.');
    }
    const leadAction = event.target.closest('[data-lead-action]');
    if (leadAction && state.currentLeadId) handleLeadAction(leadAction.dataset.leadAction);
    const command = event.target.closest('[data-command]');
    if (command) {
      if (command.dataset.command === 'lead') { $('#quick-dialog').close(); route('leads'); toast('Manual New Lead form is the next Leads sub-slice.'); }
      else toast(`${command.dataset.command} creation stays locked until its workflow is built.`);
    }
  });

  function handleLeadAction(action) {
    const id = state.currentLeadId;
    if (action === 'start-review') transitionLead(id, 'reviewing', 'Lead review started');
    if (action === 'qualify') transitionLead(id, 'qualified', 'Lead qualified');
    if (action === 'proposal') { toast('Proposal Builder is the next executable module. Lead remains Qualified until a proposal is actually sent.'); route('proposals'); }
    if (action === 'contact') toast('Contact action logged conceptually. Communication connector comes later.');
    if (action === 'lost') { state.lostTargetId = id; $('#lost-reason').value = ''; $('#lost-dialog').showModal(); }
  }

  $('#confirm-lost').addEventListener('click', () => {
    const reason = $('#lost-reason').value;
    if (!reason) return toast('Select a lost reason first');
    const lead = leadById(state.lostTargetId); if (!lead) return;
    lead.status = 'lost'; lead.lostReason = reason; addLeadActivity(lead, 'Lead marked lost', reason);
    state.demo.activity.unshift({ icon: '×', title: `${lead.id} marked Lost`, detail: reason, time: 'Now' });
    saveDemo(); $('#lost-dialog').close(); renderAll(); route('leads'); applyLeadFilter('lost'); toast(`Lead closed · ${reason}`);
  });

  $('#save-notes').addEventListener('click', () => {
    const lead = leadById(state.currentLeadId); if (!lead) return;
    lead.notes = $('#internal-notes').value.trim(); addLeadActivity(lead, 'Internal note updated', 'Admin only · Demo workflow'); saveDemo(); renderLeadDetail(lead.id); toast('Internal notes saved locally');
  });

  $('#reset-demo').addEventListener('click', resetDemo);
  $('#new-lead-button').addEventListener('click', () => toast('Manual New Lead form is next inside the Leads module.'));
  $('#quick-create').addEventListener('click', () => $('#quick-dialog').showModal());
  $('#notifications-button').addEventListener('click', () => toast('No live notifications yet · client-ops sandbox'));
  $('#open-nav').addEventListener('click', () => $('#sidebar').classList.add('open'));
  $('#close-nav').addEventListener('click', () => $('#sidebar').classList.remove('open'));

  $('#global-search').addEventListener('input', event => {
    const value = event.target.value.trim().toLowerCase(); if (!value) return;
    const lead = state.demo.leads.find(l => `${l.id} ${l.name} ${l.company} ${l.service}`.toLowerCase().includes(value));
    const project = state.demo.projects.find(p => `${p.id} ${p.title} ${p.client}`.toLowerCase().includes(value));
    if (lead) toast(`Found lead: ${lead.id} · ${lead.name}`); else if (project) toast(`Found project: ${project.id} · ${project.title}`);
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#global-search').focus(); }
    if (event.key === 'Escape') $('#sidebar').classList.remove('open');
  });
  window.addEventListener('hashchange', handleHash);

  initSecurity().catch(error => { console.error(error); $('#gate-message').textContent = `Unable to open Studio OS. ${error.message}`; });
})();
