(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (s, r = document) => r.querySelector(s);
  let sb = null;

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

  function projectCode() {
    const hash = location.hash.replace(/^#/, '');
    return hash.startsWith('project/') ? decodeURIComponent(hash.slice(8)) : null;
  }

  async function getProject() {
    const client = ensureClient();
    const code = projectCode();
    if (!client || !code) return null;
    const q = await client.from('studio_projects').select('*').eq('project_code', code).maybeSingle();
    if (q.error) throw q.error;
    return q.data;
  }

  function openFilesForReview() {
    toast('Upload the review deliverable in Files, then use REVIEW → to publish it to the Client Portal.');
    setTimeout(() => document.querySelector('[data-project-tab="files"]')?.click(), 80);
  }

  async function completeRevision(button, revisionId) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'UPDATING…';
    try {
      const project = await getProject();
      if (!project) throw new Error('Open a live project first.');
      const q = await client.from('studio_revisions').select('*').eq('id', revisionId).maybeSingle();
      if (q.error) throw q.error;
      if (!q.data) throw new Error('Revision request was not found.');
      if (q.data.project_id !== project.id) throw new Error('Revision does not belong to this project.');
      if (q.data.status !== 'submitted' && q.data.status !== 'in_progress') throw new Error('Revision is not active.');

      const now = new Date().toISOString();
      const revision = await client.from('studio_revisions').update({ status: 'completed', completed_at: now }).eq('id', q.data.id);
      if (revision.error) throw revision.error;

      const projectUpdate = await client.from('studio_projects').update({
        stage: 'Revisions',
        progress: 88,
        client_action: 'No action required',
        internal_action: 'Upload revised review file and publish the next version'
      }).eq('id', project.id);
      if (projectUpdate.error) throw projectUpdate.error;

      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'revision', entity_id: q.data.id, action: 'revision_completed',
        metadata: { project_id: project.id, review_id: q.data.review_id, revision_number: q.data.revision_number }
      });
      if (activity.error) throw activity.error;

      await window.StudioLiveDB?.sync?.();
      toast(`Revision #${q.data.revision_number} completed · upload the revised review file next`);
      setTimeout(() => location.reload(), 550);
    } catch (error) {
      toast(error.message || 'Could not complete revision.');
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.addEventListener('click', event => {
    const publish = event.target.closest('#publish-review');
    if (publish) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openFilesForReview();
      return;
    }

    const complete = event.target.closest('[data-complete-revision]');
    if (complete) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void completeRevision(complete, complete.dataset.completeRevision);
    }
  }, true);

  window.StudioReviewLive = { getClient: ensureClient };
})();
