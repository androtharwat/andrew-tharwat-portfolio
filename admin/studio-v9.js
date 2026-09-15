(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DEVICE_KEY = 'andrew_portfolio_device_v2';

  const demo = {
    leads: [{ id: 'ATS-TEST-001', name: 'Kareem Hassan', company: 'BuildCore Contracting', service: 'Website Development', status: 'New Inquiry', age: '3h ago' }],
    projects: [{ id: 'ATS-PRJ-0001', title: 'BuildCore Corporate Website', client: 'BuildCore Contracting', stage: 'Development', progress: 65, deadline: '30 Sep 2026', clientAction: 'No action required' }],
    attention: [
      { icon: '◎', title: 'Review new website inquiry', detail: 'ATS-TEST-001 · BuildCore Contracting', meta: '3h ago', action: 'Review Lead', target: 'leads' },
      { icon: '£', title: 'Final payment remains outstanding', detail: 'ATS-PRJ-0001 · EGP 10,000', meta: 'Pending', action: 'View Payment', target: 'payments' }
    ],
    pipeline: [
      { label: 'New Inquiry', count: 1, pct: 100, active: true },
      { label: 'Reviewing', count: 0, pct: 0 },
      { label: 'Qualified', count: 0, pct: 0 },
      { label: 'Proposal Sent', count: 0, pct: 0 }
    ],
    activity: [
      { icon: '+', title: 'Studio OS dashboard foundation created', detail: 'V9 development branch', time: 'Now' },
      { icon: '◎', title: 'Test lead ATS-TEST-001 prepared for workflow validation', detail: 'BuildCore Contracting', time: 'Today' },
      { icon: '◫', title: 'Test project ATS-PRJ-0001 set to Development', detail: '65% stage-driven progress', time: 'Today' }
    ],
    finance: { confirmed: 20000, collected: 10000, outstanding: 10000 }
  };

  const state = { device: null, sb: null, poll: null };

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function randomSecret() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomCode() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(values[0] % 1000000).padStart(6, '0');
  }

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

  function startPolling() {
    if (state.poll) return;
    state.poll = setInterval(checkDevice, 3000);
  }

  function stopPolling() {
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
  }

  async function checkDevice() {
    if (!state.device?.id || !state.device?.secret || !state.sb) return false;
    const { data, error } = await state.sb.from('portfolio_trusted_devices').select('status,claim_code').eq('device_id', state.device.id).maybeSingle();
    if (error || !data) return false;
    if (data.status === 'approved') {
      stopPolling();
      enterApp();
      return true;
    }
    if (data.status === 'pending') {
      showPending(data.claim_code);
      return false;
    }
    localStorage.removeItem(DEVICE_KEY);
    state.device = null;
    state.sb = null;
    stopPolling();
    showTrust('This device is no longer approved. Create a new approval request.');
    return false;
  }

  async function initSecurity() {
    if (!cfg || !window.supabase) {
      $('#gate-message').textContent = 'Studio OS could not load the existing Supabase configuration.';
      return;
    }
    try { state.device = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch { state.device = null; }
    if (!state.device?.id || !state.device?.secret) {
      showTrust();
      return;
    }
    state.sb = makeClient(state.device);
    const ok = await checkDevice();
    if (!ok && !state.poll) showTrust();
  }

  $('#trust-device').addEventListener('click', async () => {
    const button = $('#trust-device');
    button.disabled = true;
    button.textContent = 'CREATING APPROVAL…';
    try {
      state.device = { id: crypto.randomUUID(), secret: randomSecret(), code: randomCode() };
      state.sb = makeClient(state.device);
      const secretHash = await sha256hex(state.device.secret);
      const { error } = await state.sb.from('portfolio_trusted_devices').insert({
        device_id: state.device.id,
        secret_hash: secretHash,
        claim_code: state.device.code,
        label: `Studio OS V9 · ${location.hostname}`,
        status: 'pending'
      });
      if (error) {
        state.device = null;
        state.sb = null;
        toast(error.message);
        return;
      }
      localStorage.setItem(DEVICE_KEY, JSON.stringify(state.device));
      showPending(state.device.code);
    } finally {
      button.disabled = false;
      button.textContent = 'TRUST THIS BROWSER';
    }
  });

  function enterApp() {
    $('#gate').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderDashboard();
  }

  function renderDashboard() {
    const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    $('#today-label').textContent = `${today} · Here’s what needs your attention today.`;

    $('#kpi-leads').textContent = demo.leads.length;
    $('#kpi-projects').textContent = demo.projects.length;
    $('#kpi-waiting').textContent = demo.projects.filter(p => p.clientAction !== 'No action required').length;
    $('#kpi-payments').textContent = demo.finance.outstanding > 0 ? 1 : 0;

    $('#attention-list').innerHTML = demo.attention.map(item => `
      <div class="attention-item">
        <span class="attention-icon">${item.icon}</span>
        <div class="attention-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)}</small></div>
        <div class="attention-meta"><span>${escapeHtml(item.meta)}</span><button type="button" data-target="${item.target}">${escapeHtml(item.action)} →</button></div>
      </div>`).join('');

    $('#project-table-body').innerHTML = demo.projects.map(project => `
      <tr>
        <td class="project-title"><b>${escapeHtml(project.title)}</b><small>${project.id} · ${escapeHtml(project.client)}</small></td>
        <td><span class="stage-badge">${escapeHtml(project.stage)}</span></td>
        <td class="progress-cell"><div class="progress-meta"><span>Stage progress</span><b>${project.progress}%</b></div><div class="progress-track"><i style="width:${project.progress}%"></i></div></td>
        <td>${escapeHtml(project.deadline)}</td>
        <td class="client-action none">${escapeHtml(project.clientAction)}</td>
        <td><button class="table-open" type="button" data-project="${project.id}" aria-label="Open ${escapeHtml(project.title)}">→</button></td>
      </tr>`).join('');

    $('#pipeline-bars').innerHTML = demo.pipeline.map(row => `
      <div class="pipeline-row ${row.active ? 'active' : ''}">
        <span>${escapeHtml(row.label)}</span>
        <div class="pipeline-track"><i style="width:${row.pct}%"></i></div>
        <strong>${row.count}</strong>
      </div>`).join('');

    $('#revenue-confirmed').textContent = formatNumber(demo.finance.confirmed);
    $('#revenue-collected').textContent = formatNumber(demo.finance.collected);
    $('#revenue-outstanding').textContent = formatNumber(demo.finance.outstanding);
    $('#revenue-progress').style.width = `${demo.finance.confirmed ? (demo.finance.collected / demo.finance.confirmed) * 100 : 0}%`;

    $('#activity-list').innerHTML = demo.activity.map(item => `
      <div class="activity-item">
        <span class="activity-mark">${item.icon}</span>
        <div class="activity-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)}</small></div>
        <span class="activity-time">${escapeHtml(item.time)}</span>
      </div>`).join('');
  }

  function navigateModule(module) {
    const labels = {
      dashboard: 'Dashboard', leads: 'Leads', proposals: 'Proposals', clients: 'Clients', projects: 'Active Projects', waiting: 'Waiting for Client', completed: 'Completed Projects', payments: 'Payments', portfolio: 'Portfolio', testimonials: 'Testimonials', activity: 'Activity'
    };
    if (module === 'dashboard') return;
    toast(`${labels[module] || module} · next executable slice`);
  }

  $$('.nav-item').forEach(item => item.addEventListener('click', event => {
    const module = item.dataset.module;
    if (module !== 'dashboard') event.preventDefault();
    $$('.nav-item').forEach(link => link.classList.toggle('active', link === item));
    navigateModule(module);
    if (window.innerWidth <= 820) $('#sidebar').classList.remove('open');
  }));

  document.addEventListener('click', event => {
    const targetButton = event.target.closest('[data-target]');
    if (targetButton) navigateModule(targetButton.dataset.target);

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const names = { 'review-lead': 'Lead review', 'create-proposal': 'Proposal builder', 'record-payment': 'Payment recording', 'post-update': 'Project updates' };
      toast(`${names[actionButton.dataset.action]} · queued for the next slice`);
    }

    const projectButton = event.target.closest('[data-project]');
    if (projectButton) toast(`${projectButton.dataset.project} · Project Workspace is next`);

    const command = event.target.closest('[data-command]');
    if (command) toast(`${command.dataset.command} creation form · next slice`);
  });

  $('#quick-create').addEventListener('click', () => $('#quick-dialog').showModal());
  $('#notifications-button').addEventListener('click', () => toast('No live notifications yet · demo mode'));
  $('#open-nav').addEventListener('click', () => $('#sidebar').classList.add('open'));
  $('#close-nav').addEventListener('click', () => $('#sidebar').classList.remove('open'));

  $('#global-search').addEventListener('input', event => {
    const value = event.target.value.trim().toLowerCase();
    if (!value) return;
    const match = demo.projects.find(p => `${p.id} ${p.title} ${p.client}`.toLowerCase().includes(value)) || demo.leads.find(l => `${l.id} ${l.name} ${l.company}`.toLowerCase().includes(value));
    if (match) toast(`Found: ${match.id} · ${match.title || match.name}`);
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      $('#global-search').focus();
    }
    if (event.key === 'Escape') $('#sidebar').classList.remove('open');
  });

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  initSecurity().catch(error => {
    console.error(error);
    $('#gate-message').textContent = `Unable to open Studio OS. ${error.message}`;
  });
})();
