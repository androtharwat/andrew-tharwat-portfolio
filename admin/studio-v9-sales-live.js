(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (s, r = document) => r.querySelector(s);
  let sb = null;

  const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
  const toast = message => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
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

  function ensureClient() {
    if (!sb) sb = window.StudioLiveDB?.getClient?.() || makeClient();
    return sb;
  }

  async function syncAndReload(message) {
    await window.StudioLiveDB?.sync?.();
    toast(message);
    setTimeout(() => location.reload(), 500);
  }

  function ensureManualLeadDialog() {
    let dialog = $('#manual-lead-dialog');
    if (dialog) return dialog;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="manual-lead-dialog" class="command-dialog compact-dialog">
        <form method="dialog" id="manual-lead-form">
          <div class="dialog-head">
            <div><p class="overline">LIVE LEAD CAPTURE</p><h2>Add Lead</h2></div>
            <button class="icon-button" value="cancel" aria-label="Close">×</button>
          </div>
          <div class="form-grid">
            <label class="form-field"><span>FULL NAME *</span><input id="manual-lead-name" autocomplete="name" required /></label>
            <label class="form-field"><span>EMAIL *</span><input id="manual-lead-email" type="email" autocomplete="email" required /></label>
            <label class="form-field"><span>PHONE / WHATSAPP</span><input id="manual-lead-phone" autocomplete="tel" /></label>
            <label class="form-field"><span>COMPANY</span><input id="manual-lead-company" autocomplete="organization" /></label>
            <label class="form-field full"><span>SERVICE *</span><select id="manual-lead-service"><option>General / Multidisciplinary</option><option>Safety & HSE</option><option>Website Development</option><option>Digital Solution</option><option>Creative & Brand</option><option>AI & Storytelling</option><option>Video & Motion</option><option>Other</option></select></label>
            <label class="form-field full"><span>PROJECT GOAL / REQUEST *</span><textarea id="manual-lead-goal" rows="5" placeholder="What does the client need?" required></textarea></label>
            <label class="form-field"><span>TIMELINE</span><input id="manual-lead-timeline" placeholder="Within 2–4 weeks" /></label>
            <label class="form-field"><span>BUDGET RANGE</span><input id="manual-lead-budget" placeholder="15,000–25,000 EGP" /></label>
          </div>
          <div class="dialog-footer">
            <button class="button button-secondary" value="cancel">CANCEL</button>
            <button class="button button-primary" id="manual-lead-save" type="button">CREATE LIVE LEAD</button>
          </div>
        </form>
      </dialog>`);
    return $('#manual-lead-dialog');
  }

  function showManualLead() {
    $('#quick-dialog')?.close?.();
    const dialog = ensureManualLeadDialog();
    dialog.showModal();
    setTimeout(() => $('#manual-lead-name')?.focus(), 30);
  }

  async function createManualLead(button) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    const fullName = $('#manual-lead-name')?.value.trim() || '';
    const email = $('#manual-lead-email')?.value.trim().toLowerCase() || '';
    const phone = $('#manual-lead-phone')?.value.trim() || null;
    const company = $('#manual-lead-company')?.value.trim() || null;
    const service = $('#manual-lead-service')?.value || 'General / Multidisciplinary';
    const goal = $('#manual-lead-goal')?.value.trim() || '';
    const timeline = $('#manual-lead-timeline')?.value.trim() || null;
    const budget = $('#manual-lead-budget')?.value.trim() || null;
    if (!fullName) return toast('Full name is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('A valid email is required.');
    if (!goal) return toast('Project goal / request is required.');

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'CREATING…';
    try {
      const insert = await client.from('studio_leads').insert({
        full_name: fullName,
        email,
        phone,
        company_name: company,
        service,
        project_goal: goal,
        current_assets: [],
        timeline,
        budget_range: budget,
        source: 'studio_os_manual',
        source_path: location.pathname,
        status: 'new',
        fit: null,
        lost_reason: null
      }).select('id,lead_code').single();
      if (insert.error) throw insert.error;

      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'lead', entity_id: insert.data.id, action: 'lead_created_manually',
        metadata: { source: 'studio_os_manual', lead_code: insert.data.lead_code }
      });
      if (activity.error) throw activity.error;
      $('#manual-lead-dialog')?.close();
      await window.StudioLiveDB?.sync?.();
      toast(`${insert.data.lead_code} created`);
      location.hash = '#leads';
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast(error.message || 'Could not create lead.');
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function acceptProposal(code, button) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    const original = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = 'ACCEPTING…'; }
    try {
      const q = await client.from('studio_proposals').select('*').eq('proposal_code', code).maybeSingle();
      if (q.error) throw q.error;
      const proposal = q.data;
      if (!proposal) throw new Error('Proposal was not found in the live database.');
      if (proposal.status === 'accepted') return syncAndReload(`${code} is already accepted`);
      if (proposal.status !== 'sent') throw new Error('Only a sent proposal can be accepted.');

      const acceptedAt = new Date().toISOString();
      const u = await client.from('studio_proposals').update({ status: 'accepted', accepted_at: acceptedAt }).eq('id', proposal.id);
      if (u.error) throw u.error;

      const existing = await client.from('studio_payments').select('*').eq('proposal_id', proposal.id).eq('payment_type', 'deposit').maybeSingle();
      if (existing.error) throw existing.error;
      let payment = existing.data;
      if (!payment) {
        const amount = Number(proposal.total_amount || 0) * Number(proposal.deposit_percent || 0) / 100;
        const ins = await client.from('studio_payments').insert({
          lead_id: proposal.lead_id,
          proposal_id: proposal.id,
          payment_type: 'deposit',
          amount,
          currency: proposal.currency || 'EGP',
          status: 'pending',
          due_date: new Date().toISOString().slice(0,10)
        }).select('*').single();
        if (ins.error) throw ins.error;
        payment = ins.data;
      }

      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'proposal', entity_id: proposal.id, action: 'proposal_accepted',
        metadata: { payment_id: payment.id, payment_code: payment.payment_code, deposit_amount: payment.amount }
      });
      if (activity.error) throw activity.error;
      await syncAndReload(`${code} accepted · ${payment.payment_code} deposit created`);
    } catch (error) {
      toast(error.message || 'Could not accept proposal.');
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function markPaid(code, button) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    const original = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = 'CONFIRMING…'; }
    try {
      const q = await client.from('studio_payments').select('*').eq('payment_code', code).maybeSingle();
      if (q.error) throw q.error;
      const payment = q.data;
      if (!payment) throw new Error('Payment record was not found in the live database.');
      if (payment.status === 'paid') return syncAndReload(`${code} is already paid`);
      if (payment.status !== 'pending') throw new Error('Only a pending payment can be marked paid.');

      const paidAt = new Date().toISOString();
      const u = await client.from('studio_payments').update({
        status: 'paid', paid_at: paidAt, payment_method: 'Manual confirmation'
      }).eq('id', payment.id);
      if (u.error) throw u.error;

      if (payment.payment_type === 'deposit') {
        const proposal = await client.from('studio_proposals').select('*').eq('id', payment.proposal_id).single();
        if (proposal.error) throw proposal.error;
        const due = new Date();
        due.setDate(due.getDate() + 20);
        const converted = await client.rpc('studio_admin_convert_lead', {
          p_lead_id: payment.lead_id,
          p_project_title: proposal.data.title,
          p_due_date: due.toISOString().slice(0,10)
        });
        if (converted.error) throw converted.error;
        const result = converted.data || {};
        await syncAndReload(`${code} paid · ${result.client_code || 'Client'} + ${result.project_code || 'Project'} activated`);
        return;
      }

      if (payment.payment_type === 'final' && payment.project_id) {
        const project = await client.from('studio_projects').select('*').eq('id', payment.project_id).single();
        if (project.error) throw project.error;
        const remainingQuery = await client.from('studio_payments').select('amount,status').eq('project_id', payment.project_id);
        if (remainingQuery.error) throw remainingQuery.error;
        const paid = (remainingQuery.data || []).filter(x => x.status === 'paid').reduce((sum, x) => sum + Number(x.amount || 0), 0);
        const outstanding = Math.max(0, Number(project.data.project_value || 0) - paid);
        if (outstanding <= 0.001) {
          const p = await client.from('studio_projects').update({
            stage: 'Deployment', progress: 95, client_action: 'No action required', internal_action: 'Deploy and validate production'
          }).eq('id', payment.project_id);
          if (p.error) throw p.error;
          const stages = await client.from('studio_project_stages').update({ status: 'completed', completed_at: paidAt }).eq('project_id', payment.project_id).eq('stage_name', 'Final Payment');
          if (stages.error) throw stages.error;
          const deployment = await client.from('studio_project_stages').update({ status: 'active', started_at: paidAt, completed_at: null }).eq('project_id', payment.project_id).eq('stage_name', 'Deployment');
          if (deployment.error) throw deployment.error;
        }
        const activity = await client.from('studio_activity').insert({
          actor_type: 'admin', entity_type: 'payment', entity_id: payment.id, action: 'final_payment_paid',
          metadata: { project_id: payment.project_id, amount: payment.amount, outstanding_after: outstanding }
        });
        if (activity.error) throw activity.error;
        await syncAndReload(`${code} paid · EGP ${money(payment.amount)} confirmed`);
        return;
      }

      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'payment', entity_id: payment.id, action: 'payment_paid',
        metadata: { amount: payment.amount, payment_type: payment.payment_type }
      });
      if (activity.error) throw activity.error;
      await syncAndReload(`${code} paid`);
    } catch (error) {
      toast(error.message || 'Could not confirm payment.');
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  function refreshLabels() {
    document.querySelectorAll('[data-view="payments"] .branch-chip').forEach(el => { if (el.textContent.includes('SANDBOX')) el.textContent = 'LIVE SUPABASE'; });
    document.querySelectorAll('.acceptance-banner small').forEach(el => {
      if (el.textContent.includes('workflow testing')) el.textContent = 'Admin confirmation records the client decision and creates the live deposit request.';
    });
  }

  document.addEventListener('click', event => {
    const manual = event.target.closest('#new-lead-button,[data-command="lead"]');
    if (manual) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showManualLead();
      return;
    }
    const saveLead = event.target.closest('#manual-lead-save');
    if (saveLead) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void createManualLead(saveLead);
      return;
    }
    const accept = event.target.closest('[data-accept-proposal]');
    if (accept) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void acceptProposal(accept.dataset.acceptProposal, accept);
      return;
    }
    const paid = event.target.closest('[data-mark-paid]');
    if (paid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void markPaid(paid.dataset.markPaid, paid);
    }
  }, true);

  new MutationObserver(refreshLabels).observe(document.body, { childList: true, subtree: true });
  refreshLabels();
})();
