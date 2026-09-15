(() => {
  const DEMO_KEY = 'ats_v9_client_ops_demo_v2';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));
  let currentProposalId = null;

  function loadDemo() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); } catch { return {}; }
  }
  function saveDemo(data) { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); }
  function notify(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function ensureData() {
    const data = loadDemo();
    if (!Array.isArray(data.proposals)) data.proposals = [];
    if (!Array.isArray(data.leads)) data.leads = [];
    if (!Array.isArray(data.activity)) data.activity = [];
    saveDemo(data);
    return data;
  }
  function nextProposalId(data) {
    const nums = data.proposals.map(p => Number(String(p.id || '').match(/(\d+)$/)?.[1] || 0));
    return `ATS-P-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
  }
  function leadFromHash() {
    const hash = location.hash.replace(/^#/, '');
    if (hash.startsWith('lead/')) return decodeURIComponent(hash.slice(5));
    if (hash.startsWith('proposal/new/')) return decodeURIComponent(hash.slice(13));
    return null;
  }
  function proposalById(data, id) { return data.proposals.find(p => p.id === id); }
  function leadById(data, id) { return data.leads.find(l => l.id === id); }

  function injectViews() {
    const placeholder = $('[data-view="placeholder"]');
    if (!placeholder || $('[data-view="proposals"]')) return;
    placeholder.insertAdjacentHTML('beforebegin', `
      <section class="app-view" data-view="proposals">
        <div class="view-toolbar">
          <div><p class="overline">SALES · PROPOSALS</p><h2 style="margin:5px 0 0">Commercial pipeline</h2></div>
          <button class="button button-primary" id="proposal-new" type="button">+ NEW PROPOSAL</button>
        </div>
        <section class="proposal-summary">
          <article><span>DRAFTS</span><strong id="proposal-count-draft">0</strong><small>Still being prepared</small></article>
          <article><span>SENT</span><strong id="proposal-count-sent">0</strong><small>Awaiting client decision</small></article>
          <article><span>ACCEPTED</span><strong id="proposal-count-accepted">0</strong><small>Ready for deposit stage</small></article>
          <article><span>PIPELINE VALUE</span><strong id="proposal-value">0</strong><small>EGP across active proposals</small></article>
        </section>
        <section class="panel proposal-shell"><div class="panel-head"><div><p class="overline">ALL PROPOSALS</p><h2>Proposal Register</h2></div></div><div id="proposal-list" class="proposal-list"></div></section>
      </section>

      <section class="app-view" data-view="proposal-builder">
        <button class="back-button proposal-back" type="button" data-proposal-go="proposals">← BACK TO PROPOSALS</button>
        <div class="builder-layout">
          <div>
            <section class="panel builder-section">
              <div class="panel-head"><div><p class="overline">PROPOSAL BUILDER</p><h2 id="builder-heading">New Proposal</h2></div><span class="status-badge" id="builder-status">DRAFT</span></div>
              <div class="proposal-editor-note">A Lead stays <b>Qualified</b> while this proposal is being prepared. It only moves to <b>Proposal Sent</b> after the SEND PROPOSAL action is confirmed.</div>
              <div class="form-grid">
                <label class="form-field"><span>PROPOSAL ID</span><input id="proposal-id" readonly /></label>
                <label class="form-field"><span>LEAD</span><select id="proposal-lead"></select></label>
                <label class="form-field full"><span>PROJECT TITLE</span><input id="proposal-title" placeholder="BuildCore Corporate Website" /></label>
                <label class="form-field full"><span>SCOPE SUMMARY</span><textarea id="proposal-scope" placeholder="Describe the approved project scope..."></textarea></label>
                <label class="form-field full"><span>DELIVERABLES · ONE PER LINE</span><textarea id="proposal-deliverables" placeholder="Corporate website\nArabic + English\nAdmin dashboard"></textarea></label>
                <label class="form-field"><span>TIMELINE</span><input id="proposal-timeline" value="15–20 working days" /></label>
                <label class="form-field"><span>REVISION ROUNDS</span><input id="proposal-revisions" type="number" min="0" value="2" /></label>
                <label class="form-field"><span>PROJECT PRICE · EGP</span><input id="proposal-price" type="number" min="0" step="500" value="20000" /></label>
                <label class="form-field"><span>DEPOSIT %</span><input id="proposal-deposit" type="number" min="0" max="100" value="50" /></label>
                <label class="form-field"><span>VALID UNTIL</span><input id="proposal-valid" type="date" /></label>
                <label class="form-field full"><span>TERMS</span><textarea id="proposal-terms">Project starts after proposal approval, deposit confirmation, and receipt of required content. Major changes outside the approved scope may require additional cost and time.</textarea></label>
              </div>
              <div class="builder-actions">
                <button class="button button-secondary" id="proposal-save" type="button">SAVE DRAFT</button>
                <button class="button button-secondary" id="proposal-preview-button" type="button">PREVIEW</button>
                <button class="button button-primary" id="proposal-send" type="button">SEND PROPOSAL</button>
              </div>
            </section>
          </div>
          <aside>
            <section class="panel commercial-card">
              <div class="panel-head"><div><p class="overline">COMMERCIAL</p><h2>Payment Structure</h2></div></div>
              <div class="commercial-total"><span>PROJECT TOTAL</span><strong>EGP <i id="commercial-total" style="font-style:normal">20,000</i></strong></div>
              <div class="commercial-breakdown"><div class="commercial-line"><span>Deposit</span><b id="commercial-deposit">EGP 10,000</b></div><div class="commercial-line"><span>Final Payment</span><b id="commercial-final">EGP 10,000</b></div><div class="commercial-line"><span>Revision Rounds</span><b id="commercial-revisions">2</b></div></div>
            </section>
          </aside>
        </div>
      </section>

      <section class="app-view" data-view="proposal-preview">
        <button class="back-button proposal-back" type="button" data-proposal-back-builder>← BACK TO BUILDER</button>
        <div id="proposal-preview-content"></div>
      </section>`);
  }

  function setTopbar(kicker, title, subtitle) {
    $('#page-kicker').textContent = kicker;
    $('#page-title').textContent = title;
    $('#page-subtitle').textContent = subtitle;
  }
  function showView(view) {
    $$('.app-view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $$('.nav-item').forEach(link => link.classList.toggle('active', link.dataset.nav === 'proposals'));
    if (view === 'proposals') setTopbar('SALES · COMMERCIAL', 'Proposals', 'Build, preview and send structured offers to qualified leads.');
    if (view === 'proposal-builder') setTopbar('SALES · PROPOSAL BUILDER', 'Prepare Proposal', 'Scope, timeline, revisions and payment structure in one controlled record.');
    if (view === 'proposal-preview') setTopbar('CLIENT-FACING PREVIEW', 'Proposal Preview', 'Review exactly what the client will receive before sending.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderProposalList() {
    const data = ensureData();
    const proposals = data.proposals;
    $('#proposal-count-draft').textContent = proposals.filter(p => p.status === 'draft').length;
    $('#proposal-count-sent').textContent = proposals.filter(p => p.status === 'sent').length;
    $('#proposal-count-accepted').textContent = proposals.filter(p => p.status === 'accepted').length;
    $('#proposal-value').textContent = money(proposals.filter(p => !['declined','expired'].includes(p.status)).reduce((s,p) => s + Number(p.price || 0), 0));
    $('#proposal-list').innerHTML = proposals.length ? proposals.map(p => {
      const lead = leadById(data, p.leadId);
      return `<div class="proposal-row"><div><b>${escapeHtml(p.title || 'Untitled Proposal')}</b><small>${escapeHtml(p.id)} · ${escapeHtml(lead?.company || lead?.name || 'Unknown Lead')}</small></div><span>${escapeHtml(p.timeline || '—')}</span><span class="price">EGP ${money(p.price)}</span><span>${escapeHtml(p.validUntil || '—')}</span><span class="proposal-status-${p.status}">${escapeHtml(String(p.status).toUpperCase())}</span><button type="button" data-proposal-open="${escapeHtml(p.id)}">OPEN →</button></div>`;
    }).join('') : '<div class="proposal-empty">No proposals yet. Qualify a lead, then create the first proposal.</div>';
  }

  function defaultValidDate() {
    const date = new Date(); date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0,10);
  }
  function populateLeadSelect(preferredLeadId) {
    const data = ensureData();
    const eligible = data.leads.filter(l => ['qualified','proposal_sent'].includes(l.status));
    const select = $('#proposal-lead');
    select.innerHTML = eligible.length ? eligible.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.id)} · ${escapeHtml(l.name)} · ${escapeHtml(l.company)}</option>`).join('') : '<option value="">No qualified leads available</option>';
    if (preferredLeadId && eligible.some(l => l.id === preferredLeadId)) select.value = preferredLeadId;
  }

  function openNewBuilder(leadId) {
    const data = ensureData();
    const lead = leadById(data, leadId) || data.leads.find(l => l.status === 'qualified');
    if (!lead || lead.status !== 'qualified') {
      notify('Qualify a lead before creating a proposal');
      return;
    }
    currentProposalId = nextProposalId(data);
    populateLeadSelect(lead.id);
    $('#proposal-id').value = currentProposalId;
    $('#proposal-title').value = `${lead.company || lead.name} ${lead.service === 'Website Development' ? 'Corporate Website' : lead.service}`;
    $('#proposal-scope').value = lead.goal || '';
    $('#proposal-deliverables').value = lead.service === 'Website Development' ? 'Responsive corporate website\nArabic + English support\nCore company pages\nProjects section\nContact form + WhatsApp\nAdmin dashboard\nDeployment support' : lead.service;
    $('#proposal-timeline').value = '15–20 working days';
    $('#proposal-revisions').value = '2';
    $('#proposal-price').value = '20000';
    $('#proposal-deposit').value = '50';
    $('#proposal-valid').value = defaultValidDate();
    $('#proposal-terms').value = 'Project starts after proposal approval, deposit confirmation, and receipt of required content. Major changes outside the approved scope may require additional cost and time.';
    $('#builder-heading').textContent = `New Proposal · ${lead.company || lead.name}`;
    $('#builder-status').textContent = 'DRAFT';
    updateCommercial();
    showView('proposal-builder');
    history.replaceState(null, '', `#proposal/new/${encodeURIComponent(lead.id)}`);
  }

  function openExistingProposal(id) {
    const data = ensureData(); const p = proposalById(data, id); if (!p) return notify('Proposal not found');
    currentProposalId = p.id;
    populateLeadSelect(p.leadId);
    $('#proposal-id').value = p.id; $('#proposal-lead').value = p.leadId; $('#proposal-title').value = p.title || ''; $('#proposal-scope').value = p.scope || ''; $('#proposal-deliverables').value = (p.deliverables || []).join('\n'); $('#proposal-timeline').value = p.timeline || ''; $('#proposal-revisions').value = p.revisions ?? 2; $('#proposal-price').value = p.price ?? 0; $('#proposal-deposit').value = p.depositPercent ?? 50; $('#proposal-valid').value = p.validUntil || ''; $('#proposal-terms').value = p.terms || '';
    $('#builder-heading').textContent = `${p.id} · ${p.title}`;
    $('#builder-status').textContent = String(p.status || 'draft').toUpperCase();
    $('#proposal-send').disabled = p.status === 'sent'; $('#proposal-send').textContent = p.status === 'sent' ? 'PROPOSAL SENT' : 'SEND PROPOSAL';
    updateCommercial(); showView('proposal-builder'); history.replaceState(null, '', `#proposal/${encodeURIComponent(id)}`);
  }

  function collectForm() {
    return {
      id: $('#proposal-id').value || currentProposalId,
      leadId: $('#proposal-lead').value,
      title: $('#proposal-title').value.trim(),
      scope: $('#proposal-scope').value.trim(),
      deliverables: $('#proposal-deliverables').value.split('\n').map(x => x.trim()).filter(Boolean),
      timeline: $('#proposal-timeline').value.trim(),
      revisions: Number($('#proposal-revisions').value || 0),
      price: Number($('#proposal-price').value || 0),
      depositPercent: Number($('#proposal-deposit').value || 0),
      validUntil: $('#proposal-valid').value,
      terms: $('#proposal-terms').value.trim()
    };
  }
  function validateProposal(p) {
    if (!p.leadId) return 'Select a qualified lead';
    if (!p.title) return 'Add a project title';
    if (!p.scope) return 'Add a scope summary';
    if (!p.deliverables.length) return 'Add at least one deliverable';
    if (!p.timeline) return 'Add the delivery timeline';
    if (!p.price || p.price <= 0) return 'Add a valid project price';
    if (!p.validUntil) return 'Add proposal validity date';
    return '';
  }
  function saveDraft(silent = false) {
    const data = ensureData(); const form = collectForm(); const error = validateProposal(form); if (error) { notify(error); return null; }
    const existing = proposalById(data, form.id);
    const record = { ...existing, ...form, status: existing?.status || 'draft', createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (existing) Object.assign(existing, record); else data.proposals.push(record);
    saveDemo(data); currentProposalId = record.id; renderProposalList();
    if (!silent) notify(`${record.id} draft saved`);
    return record;
  }
  function updateCommercial() {
    const price = Number($('#proposal-price')?.value || 0); const pct = Math.min(100, Math.max(0, Number($('#proposal-deposit')?.value || 0))); const deposit = price * pct / 100;
    if ($('#commercial-total')) $('#commercial-total').textContent = money(price);
    if ($('#commercial-deposit')) $('#commercial-deposit').textContent = `EGP ${money(deposit)}`;
    if ($('#commercial-final')) $('#commercial-final').textContent = `EGP ${money(price - deposit)}`;
    if ($('#commercial-revisions')) $('#commercial-revisions').textContent = $('#proposal-revisions')?.value || '0';
  }

  function renderPreview(record) {
    const data = ensureData(); const lead = leadById(data, record.leadId); const deposit = Number(record.price) * Number(record.depositPercent) / 100;
    $('#proposal-preview-content').innerHTML = `<article class="proposal-preview"><header class="preview-header"><div class="preview-brand"><b>ANDREW THARWAT STUDIO</b><small>PROJECT PROPOSAL</small></div><div class="preview-meta"><span>PROPOSAL</span><strong>${escapeHtml(record.id)}</strong><span style="margin-top:8px">VALID UNTIL</span><strong>${escapeHtml(record.validUntil)}</strong></div></header><div class="preview-body"><h1>${escapeHtml(record.title)}</h1><p class="preview-client">Prepared for ${escapeHtml(lead?.name || '')}${lead?.company ? ` · ${escapeHtml(lead.company)}` : ''}</p><section class="preview-section"><h3>PROJECT SCOPE</h3><p>${escapeHtml(record.scope)}</p></section><section class="preview-section"><h3>DELIVERABLES</h3><ul>${record.deliverables.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="preview-section"><h3>DELIVERY & REVISIONS</h3><p>Estimated timeline: <b>${escapeHtml(record.timeline)}</b><br>Included revision rounds: <b>${record.revisions}</b></p></section><section class="preview-section"><h3>INVESTMENT</h3><div class="preview-commercial"><div><span>PROJECT TOTAL</span><b>EGP ${money(record.price)}</b></div><div><span>PROJECT DEPOSIT</span><b>EGP ${money(deposit)} · ${record.depositPercent}%</b></div><div><span>FINAL PAYMENT</span><b>EGP ${money(Number(record.price)-deposit)}</b></div></div></section><section class="preview-section"><h3>TERMS</h3><p>${escapeHtml(record.terms)}</p></section></div><footer class="preview-footer"><span>Andrew Tharwat Studio</span><span>${escapeHtml(record.id)}</span></footer></article>`;
    showView('proposal-preview');
  }

  function sendProposal() {
    const record = saveDraft(true); if (!record) return;
    const data = ensureData(); const stored = proposalById(data, record.id); const lead = leadById(data, record.leadId); if (!stored || !lead) return notify('Proposal or lead record missing');
    if (lead.status !== 'qualified' && lead.status !== 'proposal_sent') return notify('Only qualified leads can receive a proposal');
    stored.status = 'sent'; stored.sentAt = new Date().toISOString(); lead.status = 'proposal_sent';
    if (!Array.isArray(lead.activity)) lead.activity = [];
    lead.activity.unshift({ title: 'Proposal sent', meta: `${stored.id} · EGP ${money(stored.price)}` });
    data.activity.unshift({ icon: '▤', title: `${stored.id} sent`, detail: `${lead.company || lead.name} · EGP ${money(stored.price)}`, time: 'Now' });
    saveDemo(data); renderProposalList(); $('#builder-status').textContent = 'SENT'; $('#proposal-send').disabled = true; $('#proposal-send').textContent = 'PROPOSAL SENT'; notify(`${stored.id} sent · Lead moved to Proposal Sent`);
    setTimeout(() => { location.hash = '#proposals'; location.reload(); }, 650);
  }

  function showProposals() { renderProposalList(); showView('proposals'); history.replaceState(null, '', '#proposals'); }

  function handleProposalHash() {
    const hash = location.hash.replace(/^#/, '');
    if (hash === 'proposals') return showProposals();
    if (hash.startsWith('proposal/new/')) return openNewBuilder(decodeURIComponent(hash.slice(13)));
    if (hash.startsWith('proposal/')) return openExistingProposal(decodeURIComponent(hash.slice(9)));
  }

  injectViews(); ensureData(); renderProposalList();

  document.addEventListener('click', event => {
    const proposalNav = event.target.closest('[data-nav="proposals"]');
    const proposalGo = event.target.closest('[data-proposal-go="proposals"]');
    const proposalAction = event.target.closest('[data-action="create-proposal"]');
    const leadProposal = event.target.closest('[data-lead-action="proposal"]');
    const newButton = event.target.closest('#proposal-new');
    const openButton = event.target.closest('[data-proposal-open]');
    const backBuilder = event.target.closest('[data-proposal-back-builder]');
    if (proposalNav || proposalGo) { event.preventDefault(); event.stopImmediatePropagation(); showProposals(); return; }
    if (leadProposal) { event.preventDefault(); event.stopImmediatePropagation(); openNewBuilder(leadFromHash()); return; }
    if (proposalAction || newButton) { event.preventDefault(); event.stopImmediatePropagation(); const data = ensureData(); const lead = data.leads.find(l => l.status === 'qualified'); if (lead) openNewBuilder(lead.id); else notify('Qualify a lead before creating a proposal'); return; }
    if (openButton) { event.preventDefault(); event.stopImmediatePropagation(); openExistingProposal(openButton.dataset.proposalOpen); return; }
    if (backBuilder) { event.preventDefault(); event.stopImmediatePropagation(); openExistingProposal(currentProposalId); return; }
  }, true);

  document.addEventListener('input', event => {
    if (['proposal-price','proposal-deposit','proposal-revisions'].includes(event.target.id)) updateCommercial();
  });
  $('#proposal-save')?.addEventListener('click', () => saveDraft(false));
  $('#proposal-preview-button')?.addEventListener('click', () => { const record = saveDraft(true); if (record) renderPreview(record); });
  $('#proposal-send')?.addEventListener('click', sendProposal);

  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace(/^#/, '');
    if (hash === 'proposals' || hash.startsWith('proposal/')) setTimeout(handleProposalHash, 0);
  });

  if (location.hash === '#proposals' || location.hash.startsWith('#proposal/')) setTimeout(handleProposalHash, 50);
})();