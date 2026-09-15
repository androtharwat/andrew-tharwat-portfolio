(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const KEY = 'ats_v9_client_ops_demo_v2';
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const BOOT_KEY = 'ats_v9_live_db_boot_v1';
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let sb = null;
  let cache = { leads: new Map(), proposals: new Map(), payments: new Map(), clients: new Map(), projects: new Map() };

  const fitLabel = value => ({ high: 'High Fit', medium: 'Medium Fit', low: 'Low Fit' }[value] || '');
  const money = value => Number(value || 0);
  const local = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const saveLocal = data => localStorage.setItem(KEY, JSON.stringify(data));
  const toast = message => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1900);
  };

  function makeClient() {
    let device = null;
    try { device = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null'); } catch {}
    if (!device?.id || !device?.secret || !cfg?.supabaseUrl || !cfg?.supabaseKey || !window.supabase) return null;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      global: { headers: { 'x-portfolio-device-id': device.id, 'x-portfolio-device-secret': device.secret } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  async function fetchAll() {
    const [leads, proposals, payments, clients, projects, updates, reviews, revisions, activity] = await Promise.all([
      sb.from('studio_leads').select('*').order('created_at', { ascending: true }),
      sb.from('studio_proposals').select('*').order('created_at', { ascending: true }),
      sb.from('studio_payments').select('*').order('created_at', { ascending: true }),
      sb.from('studio_clients').select('*').order('created_at', { ascending: true }),
      sb.from('studio_projects').select('*').order('created_at', { ascending: true }),
      sb.from('studio_project_updates').select('*').order('created_at', { ascending: false }),
      sb.from('studio_reviews').select('*').order('published_at', { ascending: false }),
      sb.from('studio_revisions').select('*').order('submitted_at', { ascending: false }),
      sb.from('studio_activity').select('*').order('created_at', { ascending: false }).limit(100)
    ]);
    const firstError = [leads, proposals, payments, clients, projects, updates, reviews, revisions, activity].find(x => x.error)?.error;
    if (firstError) throw firstError;
    return {
      leads: leads.data || [], proposals: proposals.data || [], payments: payments.data || [], clients: clients.data || [], projects: projects.data || [],
      updates: updates.data || [], reviews: reviews.data || [], revisions: revisions.data || [], activity: activity.data || []
    };
  }

  function mirror(rows) {
    cache = { leads: new Map(), proposals: new Map(), payments: new Map(), clients: new Map(), projects: new Map() };
    rows.leads.forEach(x => cache.leads.set(x.lead_code, x));
    rows.proposals.forEach(x => cache.proposals.set(x.proposal_code, x));
    rows.payments.forEach(x => cache.payments.set(x.payment_code, x));
    rows.clients.forEach(x => cache.clients.set(x.client_code, x));
    rows.projects.forEach(x => cache.projects.set(x.project_code, x));

    const leadCodeById = new Map(rows.leads.map(x => [x.id, x.lead_code]));
    const proposalCodeById = new Map(rows.proposals.map(x => [x.id, x.proposal_code]));
    const clientCodeById = new Map(rows.clients.map(x => [x.id, x.client_code]));
    const companyByClient = new Map(rows.clients.map(x => [x.id, x]));

    const data = local();
    data.leads = rows.leads.map(x => ({
      id: x.lead_code, _dbId: x.id, name: x.full_name, company: x.company_name || '', email: x.email, phone: x.phone || '', service: x.service,
      budget: x.budget_range || 'Not sure yet', timeline: x.timeline || 'Flexible', source: x.source || 'Website', status: x.status,
      fit: fitLabel(x.fit), createdAt: new Date(x.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      goal: x.project_goal, assets: x.current_assets || [], questions: [], notes: x.internal_notes || '', lostReason: x.lost_reason || '',
      activity: rows.activity.filter(a => a.entity_id === x.id).map(a => ({ title: a.action.replaceAll('_', ' '), meta: new Date(a.created_at).toLocaleString() }))
    }));

    data.proposals = rows.proposals.map(x => ({
      id: x.proposal_code, _dbId: x.id, leadId: leadCodeById.get(x.lead_id), title: x.title, scope: x.scope || '', deliverables: x.deliverables || [],
      timeline: x.timeline_text || '', revisions: x.revision_limit, price: money(x.total_amount), depositPercent: money(x.deposit_percent),
      validUntil: x.valid_until || '', terms: x.terms || '', status: x.status, createdAt: x.created_at, updatedAt: x.updated_at
    }));

    data.payments = rows.payments.map(x => ({
      id: x.payment_code, _dbId: x.id, leadId: leadCodeById.get(x.lead_id), proposalId: proposalCodeById.get(x.proposal_id),
      type: x.payment_type, amount: money(x.amount), currency: x.currency, status: x.status, dueDate: x.due_date || '', paidAt: x.paid_at,
      method: x.payment_method || '', reference: x.reference || ''
    }));

    data.clients = rows.clients.map(x => ({
      id: x.client_code, _dbId: x.id, leadId: leadCodeById.get(x.source_lead_id), name: x.full_name, company: '', email: x.email, phone: x.phone || '', status: x.status, authUserId: x.auth_user_id || null
    }));

    data.projects = rows.projects.map(x => {
      const client = companyByClient.get(x.client_id);
      return {
        id: x.project_code, _dbId: x.id, clientId: clientCodeById.get(x.client_id), sourceProposalId: proposalCodeById.get(x.source_proposal_id),
        title: x.title, client: client?.full_name || 'Client', stage: x.stage, progress: x.progress, deadline: x.due_date || '—',
        clientAction: x.client_action || 'No action required', internalAction: x.internal_action || '', projectValue: money(x.project_value),
        paid: rows.payments.filter(p => p.project_id === x.id && p.status === 'paid').reduce((s,p) => s + money(p.amount), 0),
        outstanding: Math.max(0, money(x.project_value) - rows.payments.filter(p => p.project_id === x.id && p.status === 'paid').reduce((s,p) => s + money(p.amount), 0)),
        status: x.status, health: x.health, includedRevisions: x.included_revisions,
        updates: rows.updates.filter(u => u.project_id === x.id).map(u => ({ title: u.title, content: u.content, createdAtLabel: new Date(u.created_at).toLocaleString() })),
        reviews: rows.reviews.filter(r => r.project_id === x.id).map(r => ({ id: r.id, title: r.title, version: r.version, status: r.status, createdLabel: new Date(r.published_at).toLocaleString() })),
        revisions: rows.revisions.filter(r => r.project_id === x.id).map(r => ({ id: r.id, reviewId: r.review_id, number: r.revision_number, title: `Revision ${r.revision_number}`, notes: r.notes, status: r.status })),
        activity: rows.activity.filter(a => a.entity_id === x.id || a.metadata?.project_id === x.id).map(a => ({ title: a.action.replaceAll('_',' '), meta: new Date(a.created_at).toLocaleString() }))
      };
    });

    const confirmed = data.projects.reduce((s,p) => s + money(p.projectValue), 0);
    const collected = data.payments.filter(p => p.status === 'paid').reduce((s,p) => s + money(p.amount), 0);
    data.finance = { confirmed, collected, outstanding: Math.max(0, confirmed - collected) };
    data.activity = rows.activity.slice(0, 30).map(a => ({ icon: '•', title: a.action.replaceAll('_',' '), detail: a.entity_type, time: new Date(a.created_at).toLocaleString() }));
    saveLocal(data);
    localStorage.setItem('ats_v9_client_ops_migrated_v3', '1');
  }

  async function sync({ reload = false } = {}) {
    const rows = await fetchAll();
    mirror(rows);
    if (reload) location.reload();
    return rows;
  }

  async function leadRowFromCode(code) {
    if (cache.leads.has(code)) return cache.leads.get(code);
    const { data, error } = await sb.from('studio_leads').select('*').eq('lead_code', code).single();
    if (error) throw error;
    cache.leads.set(code, data);
    return data;
  }

  async function updateLead(code, patch, action) {
    const row = await leadRowFromCode(code);
    const { error } = await sb.from('studio_leads').update(patch).eq('id', row.id);
    if (error) throw error;
    if (action) await sb.from('studio_activity').insert({ actor_type: 'admin', entity_type: 'lead', entity_id: row.id, action });
  }

  function currentLeadCode() {
    const h = location.hash.replace(/^#/, '');
    return h.startsWith('lead/') ? decodeURIComponent(h.slice(5)) : null;
  }

  async function persistProposal(statusOverride) {
    await sleep(80);
    const data = local();
    const code = $('#proposal-id')?.value;
    const p = data.proposals?.find(x => x.id === code);
    if (!p) return;
    const lead = await leadRowFromCode(p.leadId);
    const payload = {
      lead_id: lead.id, title: p.title, scope: p.scope || '', deliverables: p.deliverables || [], timeline_text: p.timeline || '',
      revision_limit: Number(p.revisions || 0), total_amount: Number(p.price || 0), currency: 'EGP', deposit_percent: Number(p.depositPercent || 0),
      valid_until: p.validUntil || null, terms: p.terms || '', status: statusOverride || p.status || 'draft',
      sent_at: (statusOverride || p.status) === 'sent' ? new Date().toISOString() : null
    };
    let db = cache.proposals.get(code);
    if (!db) {
      const byCode = await sb.from('studio_proposals').select('*').eq('proposal_code', code).maybeSingle();
      if (!byCode.error && byCode.data) db = byCode.data;
    }
    const result = db
      ? await sb.from('studio_proposals').update(payload).eq('id', db.id).select('*').single()
      : await sb.from('studio_proposals').insert(payload).select('*').single();
    if (result.error) throw result.error;
    cache.proposals.set(result.data.proposal_code, result.data);
    if ((statusOverride || p.status) === 'sent') {
      await updateLead(p.leadId, { status: 'proposal_sent' }, 'proposal_sent');
    }
  }

  async function acceptProposal(code) {
    await sleep(100);
    let p = cache.proposals.get(code);
    if (!p) {
      const q = await sb.from('studio_proposals').select('*').eq('proposal_code', code).single();
      if (q.error) throw q.error; p = q.data;
    }
    const { error } = await sb.from('studio_proposals').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', p.id);
    if (error) throw error;
    const amount = money(p.total_amount) * money(p.deposit_percent) / 100;
    const existing = await sb.from('studio_payments').select('*').eq('proposal_id', p.id).eq('payment_type', 'deposit').maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) {
      const ins = await sb.from('studio_payments').insert({ lead_id: p.lead_id, proposal_id: p.id, payment_type: 'deposit', amount, currency: p.currency || 'EGP', status: 'pending', due_date: new Date().toISOString().slice(0,10) });
      if (ins.error) throw ins.error;
    }
  }

  async function markPaid(code) {
    await sleep(100);
    let payment = cache.payments.get(code);
    if (!payment) {
      const q = await sb.from('studio_payments').select('*').eq('payment_code', code).single();
      if (q.error) throw q.error; payment = q.data;
    }
    const paid = await sb.from('studio_payments').update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: 'Manual confirmation' }).eq('id', payment.id);
    if (paid.error) throw paid.error;
    const prop = await sb.from('studio_proposals').select('*').eq('id', payment.proposal_id).single();
    if (prop.error) throw prop.error;
    const due = new Date(); due.setDate(due.getDate() + 20);
    const converted = await sb.rpc('studio_admin_convert_lead', { p_lead_id: payment.lead_id, p_project_title: prop.data.title, p_due_date: due.toISOString().slice(0,10) });
    if (converted.error) throw converted.error;
    await sync();
    toast(`${code} paid · real Client + Project created`);
    location.reload();
  }

  async function init() {
    sb = makeClient();
    if (!sb) return;
    try {
      await sync();
      const reset = $('#reset-demo');
      if (reset) { reset.disabled = true; reset.textContent = 'LIVE DATABASE'; reset.title = 'Reset is disabled while Studio OS is connected to Supabase'; }
      const banner = document.querySelector('.demo-banner');
      if (banner) banner.innerHTML = '<div><span class="status-dot"></span><b>LIVE SUPABASE DATA</b><p>Studio OS is connected to protected studio_* tables. Trusted Device + RLS are active.</p></div><span class="branch-chip">DB LIVE</span>';
      if (!sessionStorage.getItem(BOOT_KEY)) { sessionStorage.setItem(BOOT_KEY, '1'); location.reload(); }
    } catch (error) {
      console.error('Studio live DB init failed', error);
      toast(`Database sync failed: ${error.message}`);
    }
  }

  document.addEventListener('click', event => {
    if (!sb) return;
    const leadAction = event.target.closest('[data-lead-action]');
    if (leadAction) {
      const code = currentLeadCode();
      if (!code) return;
      setTimeout(async () => {
        try {
          if (leadAction.dataset.leadAction === 'start-review') await updateLead(code, { status: 'reviewing' }, 'lead_review_started');
          if (leadAction.dataset.leadAction === 'qualify') await updateLead(code, { status: 'qualified' }, 'lead_qualified');
        } catch (e) { toast(e.message); }
      }, 40);
    }

    if (event.target.closest('#save-notes')) {
      const code = currentLeadCode(); const notes = $('#internal-notes')?.value || '';
      if (code) setTimeout(() => updateLead(code, { internal_notes: notes }, 'internal_note_updated').catch(e => toast(e.message)), 40);
    }

    if (event.target.closest('#confirm-lost')) {
      const code = currentLeadCode(); const reason = $('#lost-reason')?.value || '';
      if (code && reason) setTimeout(() => updateLead(code, { status: 'lost', lost_reason: reason }, 'lead_marked_lost').catch(e => toast(e.message)), 40);
    }

    if (event.target.closest('#proposal-save')) setTimeout(() => persistProposal('draft').catch(e => toast(e.message)), 120);
    if (event.target.closest('#proposal-send')) setTimeout(() => persistProposal('sent').catch(e => toast(e.message)), 140);

    const accept = event.target.closest('[data-accept-proposal]');
    if (accept) setTimeout(() => acceptProposal(accept.dataset.acceptProposal).then(() => sync()).catch(e => toast(e.message)), 140);

    const paid = event.target.closest('[data-mark-paid]');
    if (paid) {
      const code = paid.dataset.markPaid;
      setTimeout(() => markPaid(code).catch(e => toast(e.message)), 140);
    }
  }, true);

  const app = $('#app');
  if (app) {
    const observer = new MutationObserver(() => { if (!app.classList.contains('hidden') && !sb) init(); });
    observer.observe(app, { attributes: true, attributeFilter: ['class'] });
    if (!app.classList.contains('hidden')) init();
  }

  window.StudioLiveDB = { sync: () => sync(), getClient: () => sb };
})();