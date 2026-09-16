(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (s, r = document) => r.querySelector(s);
  let sb = null;

  const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));
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
