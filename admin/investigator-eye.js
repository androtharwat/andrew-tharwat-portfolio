(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { sb: null, device: null, cases: [], services: [], benchmarks: [], activeView: 'overview' };

  const statusLabels = {
    consultation_booked: 'Consultation Booked', intake_pending: 'Intake Pending', ready_for_consultation: 'Ready for Consultation',
    consultation_complete: 'Consultation Complete', services_recommended: 'Services Recommended', active: 'Active', closed: 'Closed', cancelled: 'Cancelled',
    recommended: 'Recommended', requested: 'Requested', quoted: 'Quoted', accepted: 'Accepted', awaiting_payment: 'Awaiting Payment',
    paid: 'Paid', in_progress: 'In Progress', delivered: 'Delivered', declined: 'Declined'
  };

  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }
  function money(value, currency = 'USD') {
    if (value === null || value === undefined || value === '') return 'Custom Quote';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value)); }
    catch (_) { return `${currency} ${Number(value).toFixed(0)}`; }
  }
  function date(value) { if (!value) return '—'; try { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); } catch (_) { return value; } }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2200); }
  function makeClient(device) {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: { 'x-portfolio-device-id': device.id, 'x-portfolio-device-secret': device.secret } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  async function init() {
    if (!cfg || !window.supabase) return failGate('Studio OS configuration could not be loaded.');
    try { state.device = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch (_) { state.device = null; }
    if (!state.device?.id || !state.device?.secret) return failGate('This browser has not been approved for Studio OS yet.');
    state.sb = makeClient(state.device);
    const { data, error } = await state.sb.from('portfolio_trusted_devices').select('status').eq('device_id', state.device.id).maybeSingle();
    if (error || data?.status !== 'approved') return failGate('This browser is not currently approved. Open Studio OS and complete Trusted Device approval.');
    $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden');
    bindUI();
    await loadAll();
  }

  function failGate(message) { $('#gate-message').textContent = message; $('#gate-actions').classList.remove('hidden'); }

  async function loadAll() {
    $('#refresh-data').disabled = true; $('#refresh-data').textContent = 'LOADING…';
    const [servicesResult, casesResult, benchmarksResult] = await Promise.all([
      state.sb.from('studio_service_catalog').select('*').order('sort_order', { ascending: true }),
      state.sb.from('studio_consultation_cases').select('*,studio_clients(full_name,email),studio_case_services(id,status,quoted_price,currency,recommendation_reason,studio_service_catalog(service_code,name_en,pricing_mode,display_price_usd))').order('created_at', { ascending: false }),
      state.sb.from('studio_service_market_benchmarks').select('*,studio_service_catalog(service_code,name_en)').order('last_verified_at', { ascending: false })
    ]);
    $('#refresh-data').disabled = false; $('#refresh-data').textContent = 'REFRESH DATA';
    const errors = [servicesResult.error, casesResult.error, benchmarksResult.error].filter(Boolean);
    if (errors.length) { toast(errors[0].message || 'Unable to load Investigator data'); console.error(errors); }
    state.services = servicesResult.data || [];
    state.cases = casesResult.data || [];
    state.benchmarks = benchmarksResult.data || [];
    renderAll();
  }

  function renderAll() { renderOverview(); renderCases(); renderServices(); renderBenchmarks(); }

  function renderOverview() {
    const openCases = state.cases.filter(c => !['closed', 'cancelled'].includes(c.status));
    $('#kpi-open-cases').textContent = openCases.length;
    $('#kpi-booked').textContent = state.cases.filter(c => c.status === 'consultation_booked').length;
    $('#kpi-services').textContent = state.services.filter(s => s.is_active).length;
    $('#kpi-benchmarks').textContent = state.benchmarks.length;
    $('#nav-case-count').textContent = openCases.length;

    const pipeline = [
      ['consultation_booked', 'Booked'], ['ready_for_consultation', 'Ready'], ['consultation_complete', 'Consulted'],
      ['services_recommended', 'Services Recommended'], ['active', 'Active Delivery'], ['closed', 'Closed']
    ];
    $('#case-pipeline').innerHTML = pipeline.map(([key, label]) => {
      const count = state.cases.filter(c => c.status === key).length;
      return `<div class="ie-pipeline-row"><div><b>${escapeHtml(label)}</b><small>${escapeHtml(statusLabels[key] || key)}</small></div><strong>${count}</strong></div>`;
    }).join('');

    const recent = state.cases.slice(0, 5);
    $('#recent-cases').className = recent.length ? 'ie-recent-list' : 'ie-empty';
    $('#recent-cases').innerHTML = recent.length ? recent.map(c => `<div class="ie-case-card"><div><b>${escapeHtml(c.case_code || 'Pending ID')} · ${escapeHtml(c.title)}</b><small>${escapeHtml(c.studio_clients?.full_name || 'Client')} · ${date(c.booked_at)}</small></div><div><b>${escapeHtml(c.hazard_name)}</b><small>${escapeHtml(c.jurisdiction || c.country_code || 'Jurisdiction not set')}</small></div><div><span class="ie-status ${escapeHtml(c.status)}">${escapeHtml(statusLabels[c.status] || c.status)}</span><small>${money(c.consultation_fee_usd)} consultation</small></div><button type="button" data-case-id="${c.id}" aria-label="Open case">→</button></div>`).join('') : 'No consultation cases yet.';
  }

  function filteredCases() {
    const q = ($('#case-search')?.value || '').trim().toLowerCase();
    const status = $('#case-status-filter')?.value || 'all';
    return state.cases.filter(c => {
      const haystack = [c.case_code, c.title, c.hazard_name, c.studio_clients?.full_name, c.studio_clients?.email].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (status === 'all' || c.status === status);
    });
  }

  function renderCases() {
    const rows = filteredCases();
    $('#case-table-body').innerHTML = rows.length ? rows.map(c => {
      const work = c.studio_case_services || [];
      const purchased = work.filter(x => ['accepted','awaiting_payment','paid','in_progress','delivered'].includes(x.status)).length;
      return `<tr><td><span class="ie-code">${escapeHtml(c.case_code || 'Pending')}</span><span class="ie-meta">${date(c.booked_at)}</span></td><td><b>${escapeHtml(c.studio_clients?.full_name || '—')}</b><span class="ie-meta">${escapeHtml(c.studio_clients?.email || '')}</span></td><td><b>${escapeHtml(c.hazard_name)}</b><span class="ie-meta">${escapeHtml(c.jurisdiction || c.country_code || 'Not set')}</span></td><td><span class="ie-price">${money(c.consultation_fee_usd)}</span><span class="ie-meta">Consultation only</span></td><td><span class="ie-status ${escapeHtml(c.status)}">${escapeHtml(statusLabels[c.status] || c.status)}</span></td><td><b>${work.length} recommended</b><span class="ie-meta">${purchased} accepted / active</span></td><td><button class="ie-table-open" type="button" data-case-id="${c.id}">→</button></td></tr>`;
    }).join('') : `<tr><td colspan="7"><div class="ie-empty">No cases match this view.</div></td></tr>`;
  }

  function priceMarkup(service) {
    if (service.pricing_mode === 'quote') return `<strong>Custom Quote</strong><small>PRICE BASED ON SCOPE</small>`;
    const prefix = service.pricing_mode === 'from' ? 'From ' : '';
    return `<strong>${prefix}${money(service.display_price_usd)}</strong><small>${service.pricing_mode === 'fixed' ? 'FIXED PRICE' : 'STARTING PRICE'}</small>`;
  }

  function filteredServices() {
    const q = ($('#service-search')?.value || '').trim().toLowerCase();
    const category = $('#service-category-filter')?.value || 'all';
    return state.services.filter(s => {
      const haystack = [s.service_code, s.name_en, s.name_ar, s.category].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (category === 'all' || s.category === category);
    });
  }

  function renderServices() {
    const categories = [...new Set(state.services.map(s => s.category).filter(Boolean))].sort();
    const categorySelect = $('#service-category-filter');
    if (categorySelect && categorySelect.options.length <= 1) categories.forEach(c => categorySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
    const services = filteredServices();
    $('#service-grid').innerHTML = services.length ? services.map(s => `<article class="ie-service-card ${s.is_active ? '' : 'off'}"><div class="ie-service-top"><div><span class="ie-service-code">${escapeHtml(s.service_code)}</span><h3>${escapeHtml(s.name_en)}</h3><p class="arabic" dir="rtl">${escapeHtml(s.name_ar)}</p></div><span class="ie-status ${s.is_active ? 'active' : ''}">${s.is_active ? 'Active' : 'Inactive'}</span></div><div class="ie-service-price">${priceMarkup(s)}</div><p>${escapeHtml(s.description_en || '')}</p><div class="ie-service-flags"><span>${escapeHtml(s.category)}</span><span>${escapeHtml(s.delivery_model)}</span><span>${s.client_visible ? 'Client visible' : 'Internal only'}</span></div><div class="ie-service-actions"><small>Review: ${date(s.next_pricing_review)}</small><button type="button" data-service-id="${s.id}">EDIT PRICE →</button></div></article>`).join('') : '<div class="ie-empty">No services match this filter.</div>';
  }

  function renderBenchmarks() {
    $('#benchmark-table-body').innerHTML = state.benchmarks.length ? state.benchmarks.map(b => {
      const range = b.min_price === null ? '—' : (Number(b.min_price) === Number(b.max_price) ? money(b.min_price, b.currency) : `${money(b.min_price, b.currency)} – ${money(b.max_price, b.currency)}`);
      return `<tr><td><span class="ie-code">${escapeHtml(b.studio_service_catalog?.service_code || '—')}</span><span class="ie-meta">${escapeHtml(b.studio_service_catalog?.name_en || '')}</span></td><td>${escapeHtml(b.benchmark_label)}</td><td>${escapeHtml(b.region)}</td><td><b>${escapeHtml(range)}</b></td><td>${escapeHtml(b.pricing_unit)}</td><td><a class="ie-source-link" href="${escapeHtml(b.source_url)}" target="_blank" rel="noopener">${escapeHtml(b.source_name)} ↗</a></td><td>${date(b.last_verified_at)}</td></tr>`;
    }).join('') : `<tr><td colspan="7"><div class="ie-empty">No market benchmark sources recorded.</div></td></tr>`;
  }

  function setView(view) {
    state.activeView = view;
    $$('.ie-view').forEach(el => el.classList.toggle('active', el.dataset.ieView === view));
    $$('.ie-nav').forEach(el => el.classList.toggle('active', el.dataset.section === view));
    const copy = {
      overview: ['INVESTIGATOR\'S EYE · CONTROL ROOM','Consultation Intelligence.','One consultation. Separate services. One private case record.'],
      cases: ['INVESTIGATOR\'S EYE · CASES','Consultation Cases.','Follow every client from consultation through separately purchased services.'],
      services: ['INVESTIGATOR\'S EYE · CATALOG','Service & Pricing Manager.','Control scope, visibility and launch pricing without changing code.'],
      pricing: ['INVESTIGATOR\'S EYE · MARKET INTELLIGENCE','Market Benchmarks.','Internal source-backed references for commercial pricing decisions.'],
      content: ['INVESTIGATOR\'S EYE · HSE CONTENT','HSE Content Engine.','Create, review, validate and publish bilingual HSE content while the public site reads Published Revisions only.']
    }[view] || [];
    $('#page-kicker').textContent = copy[0] || '';
    $('#page-title').textContent = copy[1] || '';
    $('#page-subtitle').textContent = copy[2] || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openService(id) {
    const s = state.services.find(x => x.id === id); if (!s) return;
    $('#service-id').value = s.id;
    $('#service-dialog-title').textContent = s.name_en;
    $('#service-pricing-mode').value = s.pricing_mode;
    $('#service-display-price').value = s.display_price_usd ?? '';
    $('#service-client-visible').value = String(s.client_visible);
    $('#service-active').value = String(s.is_active);
    const include = Array.isArray(s.scope_includes) ? s.scope_includes : [];
    const exclude = Array.isArray(s.scope_excludes) ? s.scope_excludes : [];
    $('#service-scope-summary').innerHTML = `<b>Includes:</b> ${include.map(escapeHtml).join(' · ') || '—'}<br><b>Does not include:</b> ${exclude.map(escapeHtml).join(' · ') || '—'}`;
    $('#service-dialog').showModal();
  }

  async function saveService() {
    const id = $('#service-id').value; if (!id) return;
    const mode = $('#service-pricing-mode').value;
    const rawPrice = $('#service-display-price').value;
    const payload = {
      pricing_mode: mode,
      display_price_usd: mode === 'quote' || rawPrice === '' ? null : Number(rawPrice),
      client_visible: $('#service-client-visible').value === 'true',
      is_active: $('#service-active').value === 'true',
      last_pricing_review: new Date().toISOString().slice(0, 10),
      next_pricing_review: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    };
    const button = $('#save-service'); button.disabled = true; button.textContent = 'SAVING…';
    const { error } = await state.sb.from('studio_service_catalog').update(payload).eq('id', id);
    button.disabled = false; button.textContent = 'SAVE PRICING';
    if (error) return toast(error.message);
    $('#service-dialog').close(); toast('Service pricing updated'); await loadAll();
  }

  function openCase(id) {
    const c = state.cases.find(x => x.id === id); if (!c) return;
    $('#case-dialog-title').textContent = `${c.case_code || 'Case'} · ${c.title}`;
    const work = c.studio_case_services || [];
    $('#case-detail-body').innerHTML = `<div class="ie-case-detail-grid"><section class="ie-case-detail-block"><h3>Consultation Record</h3><dl><dt>Client</dt><dd>${escapeHtml(c.studio_clients?.full_name || '—')}</dd><dt>Hazard</dt><dd>${escapeHtml(c.hazard_name)}</dd><dt>Jurisdiction</dt><dd>${escapeHtml(c.jurisdiction || c.country_code || 'Not set')}</dd><dt>Status</dt><dd><span class="ie-status ${escapeHtml(c.status)}">${escapeHtml(statusLabels[c.status] || c.status)}</span></dd><dt>Consultation fee</dt><dd><b>${money(c.consultation_fee_usd)}</b> — consultation only</dd><dt>Booked</dt><dd>${date(c.booked_at)}</dd><dt>Completed</dt><dd>${date(c.consultation_completed_at)}</dd></dl><div class="ie-callout"><b>Commercial rule:</b> the $75 fee does not include reports, measurements, risk assessments, action plans, site visits or engineering design.</div></section><section class="ie-case-detail-block"><h3>Separate Case Services</h3><div class="ie-workorders">${work.length ? work.map(w => `<div class="ie-workorder"><div><b>${escapeHtml(w.studio_service_catalog?.name_en || 'Service')}</b><small>${escapeHtml(statusLabels[w.status] || w.status)}${w.recommendation_reason ? ` · ${escapeHtml(w.recommendation_reason)}` : ''}</small></div><strong>${w.quoted_price !== null ? money(w.quoted_price, w.currency || 'USD') : (w.studio_service_catalog?.pricing_mode === 'quote' ? 'Quote' : money(w.studio_service_catalog?.display_price_usd))}</strong></div>`).join('') : '<div class="ie-empty">No follow-on services recommended yet.</div>'}</div></section></div>`;
    $('#case-dialog').showModal();
  }

  function bindUI() {
    $$('.ie-nav').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.section)));
    $$('[data-jump]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.jump)));
    $('#refresh-data').addEventListener('click', loadAll);
    $('#case-search').addEventListener('input', renderCases);
    $('#case-status-filter').addEventListener('change', renderCases);
    $('#service-search').addEventListener('input', renderServices);
    $('#service-category-filter').addEventListener('change', renderServices);
    $('#save-service').addEventListener('click', saveService);
    document.addEventListener('click', event => {
      const caseButton = event.target.closest('[data-case-id]'); if (caseButton) openCase(caseButton.dataset.caseId);
      const serviceButton = event.target.closest('[data-service-id]'); if (serviceButton) openService(serviceButton.dataset.serviceId);
      const jumpButton = event.target.closest('[data-jump]'); if (jumpButton) setView(jumpButton.dataset.jump);
    });
  }

  init();
})();
