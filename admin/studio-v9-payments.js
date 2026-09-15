(() => {
  const DEMO_KEY = 'ats_v9_client_ops_demo_v2';
  const MIGRATION_KEY = 'ats_v9_client_ops_migrated_v3';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));

  function loadData() { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); } catch { return {}; } }
  function saveData(data) { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); }
  function notify(message) { const el = $('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('show'), 1900); }

  function migrateSandbox() {
    if (localStorage.getItem(MIGRATION_KEY)) return false;
    const data = loadData();
    data.payments = Array.isArray(data.payments) ? data.payments : [];
    data.clients = Array.isArray(data.clients) ? data.clients : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    const hasWonLead = Array.isArray(data.leads) && data.leads.some(l => l.status === 'won');
    if (!hasWonLead && data.projects.length === 1 && data.projects[0]?.id === 'ATS-PRJ-0001' && data.projects[0]?.client === 'BuildCore Contracting') data.projects = [];
    if (!hasWonLead) data.finance = { confirmed: 0, collected: 0, outstanding: 0 };
    saveData(data); localStorage.setItem(MIGRATION_KEY, '1');
    return true;
  }

  function ensureData() {
    const data = loadData();
    data.payments = Array.isArray(data.payments) ? data.payments : [];
    data.clients = Array.isArray(data.clients) ? data.clients : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    data.proposals = Array.isArray(data.proposals) ? data.proposals : [];
    data.leads = Array.isArray(data.leads) ? data.leads : [];
    data.activity = Array.isArray(data.activity) ? data.activity : [];
    data.finance = data.finance || { confirmed: 0, collected: 0, outstanding: 0 };
    saveData(data); return data;
  }
  function leadById(data, id) { return data.leads.find(x => x.id === id); }
  function proposalById(data, id) { return data.proposals.find(x => x.id === id); }
  function nextId(list, prefix) { const max = Math.max(0, ...list.map(x => Number(String(x.id || '').match(/(\d+)$/)?.[1] || 0))); return `${prefix}${String(max + 1).padStart(4,'0')}`; }

  function injectViews() {
    const placeholder = $('[data-view="placeholder"]');
    if (!placeholder || $('[data-view="payments"]')) return;
    placeholder.insertAdjacentHTML('beforebegin', `
      <section class="app-view" data-view="payments">
        <div class="view-toolbar"><div><p class="overline">FINANCE · PROJECT PAYMENTS</p><h2 style="margin:5px 0 0">Payments</h2></div><span class="branch-chip">SANDBOX TRACKING</span></div>
        <section class="payment-summary">
          <article><span>PENDING</span><strong id="payment-pending-count">0</strong><small>Payments awaiting confirmation</small></article>
          <article><span>COLLECTED</span><strong id="payment-collected">0</strong><small>EGP received</small></article>
          <article><span>OUTSTANDING</span><strong id="payment-outstanding">0</strong><small>EGP remaining</small></article>
          <article><span>ACTIVE CLIENTS</span><strong id="payment-client-count">0</strong><small>Converted after deposit</small></article>
        </section>
        <section class="panel"><div class="panel-head"><div><p class="overline">PAYMENT REGISTER</p><h2>Project Payments</h2></div></div><div id="payment-list" class="payment-list"></div><div id="conversion-result"></div></section>
      </section>

      <section class="app-view" data-view="clients">
        <div class="view-toolbar"><div><p class="overline">CLIENT RELATIONSHIPS</p><h2 style="margin:5px 0 0">Clients</h2></div><span class="branch-chip">CREATED AFTER DEPOSIT</span></div>
        <section class="panel"><div class="panel-head"><div><p class="overline">CLIENT REGISTER</p><h2>Active & Existing Clients</h2></div></div><div id="client-register" class="client-register"></div></section>
      </section>`);
  }

  function setTopbar(kicker, title, subtitle) {
    $('#page-kicker').textContent = kicker; $('#page-title').textContent = title; $('#page-subtitle').textContent = subtitle;
  }
  function showView(view) {
    $$('.app-view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $$('.nav-item').forEach(link => link.classList.toggle('active', link.dataset.nav === view));
    if (view === 'payments') setTopbar('FINANCE · PAYMENT CONTROL', 'Payments', 'Track deposits and confirm the financial trigger that creates a real client and project.');
    if (view === 'clients') setTopbar('CLIENT OPERATIONS', 'Clients', 'One client record can own multiple current and completed projects.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPayments() {
    const data = ensureData();
    const pending = data.payments.filter(p => p.status === 'pending');
    $('#payment-pending-count').textContent = pending.length;
    $('#payment-collected').textContent = money(data.finance.collected || 0);
    $('#payment-outstanding').textContent = money(data.finance.outstanding || 0);
    $('#payment-client-count').textContent = data.clients.length;
    $('#payment-list').innerHTML = data.payments.length ? data.payments.map(p => {
      const lead = leadById(data, p.leadId); const proposal = proposalById(data, p.proposalId);
      return `<div class="payment-row"><div><b>${escapeHtml(p.type === 'deposit' ? 'Project Deposit' : p.type)}</b><small>${escapeHtml(p.id)} · ${escapeHtml(lead?.company || lead?.name || '')}</small></div><span>${escapeHtml(proposal?.id || '')}</span><span class="amount">EGP ${money(p.amount)}</span><span>${escapeHtml(p.dueDate || '—')}</span><span class="payment-status-${p.status}">${escapeHtml(p.status.toUpperCase())}</span>${p.status === 'pending' ? `<button type="button" data-mark-paid="${escapeHtml(p.id)}">MARK PAID →</button>` : '<span>Confirmed</span>'}</div>`;
    }).join('') : '<div class="proposal-empty">No payment requests yet. A deposit request is created only after a proposal is accepted.</div>';
    renderClients();
  }

  function renderClients() {
    const data = ensureData(); const container = $('#client-register'); if (!container) return;
    container.innerHTML = data.clients.length ? data.clients.map(c => {
      const projects = data.projects.filter(p => p.clientId === c.id);
      return `<div class="client-row"><div><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.id)} · ${escapeHtml(c.company || 'Individual')}</small></div><span>${escapeHtml(c.email || '')}</span><span>${projects.length} project${projects.length === 1 ? '' : 's'}</span><span>${escapeHtml(c.status || 'active')}</span><button type="button" data-client-open="${escapeHtml(c.id)}">OPEN →</button></div>`;
    }).join('') : '<div class="proposal-empty">No clients yet. A Lead becomes a Client only after an accepted proposal and confirmed deposit.</div>';
  }

  function proposalFromHash() {
    const h = location.hash.replace(/^#/, ''); if (!h.startsWith('proposal/')) return null; if (h.startsWith('proposal/new/')) return null; return decodeURIComponent(h.slice(9));
  }

  function enhanceProposalState() {
    const id = proposalFromHash(); if (!id) return;
    const data = ensureData(); const p = proposalById(data, id); if (!p) return;
    const button = $('#proposal-send'); if (!button) return;
    let banner = $('#proposal-acceptance-banner'); if (banner) banner.remove();
    if (p.status === 'sent') {
      button.disabled = false; button.textContent = 'SIMULATE CLIENT ACCEPTANCE'; button.dataset.acceptProposal = p.id;
      const panel = button.closest('.builder-section');
      panel?.insertAdjacentHTML('beforeend', `<div class="acceptance-banner" id="proposal-acceptance-banner"><div><b>Client decision simulation</b><small>In the final system, this action will happen from Client Portal. For workflow testing, accepting here creates the required deposit request.</small></div><button class="button button-secondary" type="button" data-accept-proposal="${escapeHtml(p.id)}">ACCEPT PROPOSAL</button></div>`);
    } else if (p.status === 'accepted') {
      button.disabled = true; button.textContent = 'ACCEPTED · DEPOSIT CREATED'; delete button.dataset.acceptProposal;
    }
  }

  function acceptProposal(id) {
    const data = ensureData(); const p = proposalById(data, id); if (!p || p.status !== 'sent') return notify('Only a sent proposal can be accepted');
    const lead = leadById(data, p.leadId); if (!lead) return notify('Lead record not found');
    p.status = 'accepted'; p.acceptedAt = new Date().toISOString();
    const depositAmount = Number(p.price || 0) * Number(p.depositPercent || 0) / 100;
    let payment = data.payments.find(x => x.proposalId === p.id && x.type === 'deposit');
    if (!payment) {
      payment = { id: nextId(data.payments, 'ATS-PAY-'), proposalId: p.id, leadId: lead.id, type: 'deposit', amount: depositAmount, currency: 'EGP', status: 'pending', dueDate: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() };
      data.payments.push(payment);
    }
    if (!Array.isArray(lead.activity)) lead.activity = [];
    lead.activity.unshift({ title: 'Proposal accepted', meta: `${p.id} · Deposit ${payment.id} created` });
    data.activity.unshift({ icon: '✓', title: `${p.id} accepted`, detail: `${payment.id} · EGP ${money(payment.amount)} deposit pending`, time: 'Now' });
    data.finance.confirmed = Number(p.price || 0); data.finance.collected = data.payments.filter(x => x.status === 'paid').reduce((s,x)=>s+Number(x.amount||0),0); data.finance.outstanding = Math.max(0, data.finance.confirmed - data.finance.collected);
    saveData(data); renderPayments(); notify(`${p.id} accepted · Deposit request created`); setTimeout(() => { showPayments(); }, 500);
  }

  function markPaid(paymentId) {
    const data = ensureData(); const payment = data.payments.find(x => x.id === paymentId); if (!payment || payment.status !== 'pending') return;
    const proposal = proposalById(data, payment.proposalId); const lead = leadById(data, payment.leadId); if (!proposal || !lead) return notify('Linked proposal or lead missing');
    payment.status = 'paid'; payment.paidAt = new Date().toISOString(); payment.method = 'Manual confirmation';
    let client = data.clients.find(c => c.leadId === lead.id);
    if (!client) {
      client = { id: nextId(data.clients, 'ATS-C-'), leadId: lead.id, name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, status: 'active', createdAt: new Date().toISOString() };
      data.clients.push(client);
    }
    let project = data.projects.find(p => p.sourceProposalId === proposal.id);
    if (!project) {
      const due = new Date(); due.setDate(due.getDate() + 20);
      project = { id: nextId(data.projects, 'ATS-PRJ-'), clientId: client.id, sourceProposalId: proposal.id, title: proposal.title, client: lead.company || lead.name, stage: 'Onboarding', progress: 10, deadline: due.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}), clientAction: 'Onboarding information required', projectValue: Number(proposal.price || 0), paid: Number(payment.amount || 0), outstanding: Math.max(0, Number(proposal.price || 0)-Number(payment.amount||0)), status: 'active', createdAt: new Date().toISOString() };
      data.projects.push(project);
    }
    lead.status = 'won'; lead.clientId = client.id; lead.projectId = project.id;
    if (!Array.isArray(lead.activity)) lead.activity = [];
    lead.activity.unshift({ title: 'Deposit confirmed', meta: `${payment.id} · Converted to ${client.id} + ${project.id}` });
    data.activity.unshift({ icon: '◆', title: `${lead.id} converted to Client`, detail: `${client.id} · ${project.id}`, time: 'Now' });
    data.finance.confirmed = Number(proposal.price || 0); data.finance.collected = data.payments.filter(x => x.status === 'paid').reduce((s,x)=>s+Number(x.amount||0),0); data.finance.outstanding = Math.max(0, data.finance.confirmed - data.finance.collected);
    saveData(data); renderPayments();
    $('#conversion-result').innerHTML = `<div class="conversion-card"><h3>Client conversion completed.</h3><p>The operational trigger worked correctly: accepted proposal + paid deposit created the client and project records. The lead is now Won.</p><div class="conversion-grid"><div><span>CLIENT</span><b>${escapeHtml(client.id)} · ${escapeHtml(client.company || client.name)}</b></div><div><span>PROJECT</span><b>${escapeHtml(project.id)} · ${escapeHtml(project.title)}</b></div><div><span>NEXT STAGE</span><b>Onboarding</b></div></div></div>`;
    notify(`${payment.id} paid · ${client.id} and ${project.id} created`);
  }

  function showPayments() { renderPayments(); showView('payments'); history.replaceState(null,'','#payments'); }
  function showClients() { renderClients(); showView('clients'); history.replaceState(null,'','#clients'); }

  injectViews();
  const migrated = migrateSandbox();
  ensureData(); renderPayments();
  if (migrated) setTimeout(() => location.reload(), 40);

  document.addEventListener('click', event => {
    const paymentsNav = event.target.closest('[data-nav="payments"]');
    const clientsNav = event.target.closest('[data-nav="clients"]');
    const mark = event.target.closest('[data-mark-paid]');
    const accept = event.target.closest('[data-accept-proposal]');
    const sendButton = event.target.closest('#proposal-send[data-accept-proposal]');
    if (paymentsNav) { event.preventDefault(); event.stopImmediatePropagation(); showPayments(); return; }
    if (clientsNav) { event.preventDefault(); event.stopImmediatePropagation(); showClients(); return; }
    if (accept) { event.preventDefault(); event.stopImmediatePropagation(); acceptProposal(accept.dataset.acceptProposal); return; }
    if (sendButton) { event.preventDefault(); event.stopImmediatePropagation(); acceptProposal(sendButton.dataset.acceptProposal); return; }
    if (mark) { event.preventDefault(); event.stopImmediatePropagation(); markPaid(mark.dataset.markPaid); return; }
    const clientOpen = event.target.closest('[data-client-open]'); if (clientOpen) notify(`${clientOpen.dataset.clientOpen} · Client profile workspace is next`);
  }, true);

  window.addEventListener('hashchange', () => {
    const h = location.hash.replace(/^#/,'');
    if (h === 'payments') setTimeout(showPayments,0);
    if (h === 'clients') setTimeout(showClients,0);
    if (h.startsWith('proposal/')) setTimeout(enhanceProposalState,80);
  });

  const app = $('#app');
  if (app) new MutationObserver(() => {
    if (!app.classList.contains('hidden')) {
      const h = location.hash.replace(/^#/,'');
      if (h === 'payments') setTimeout(showPayments,0);
      if (h === 'clients') setTimeout(showClients,0);
      if (h.startsWith('proposal/')) setTimeout(enhanceProposalState,100);
    }
  }).observe(app,{attributes:true,attributeFilter:['class']});

  if (location.hash.startsWith('#proposal/')) setTimeout(enhanceProposalState,150);
})();