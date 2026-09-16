(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const DEVICE_KEY = 'andrew_portfolio_device_v2';
  const $ = (s, r = document) => r.querySelector(s);
  const stageOrder = ['Onboarding','Content Preparation','Design','Development','Internal QA','Client Review','Revisions','Final Approval','Final Payment','Deployment','Completed'];
  const stageProgress = { 'Onboarding':10, 'Content Preparation':20, 'Design':40, 'Development':65, 'Internal QA':75, 'Client Review':85, 'Revisions':88, 'Final Approval':90, 'Final Payment':93, 'Deployment':95, 'Completed':100 };
  let sb = null;

  const money = v => new Intl.NumberFormat('en-US').format(Number(v || 0));
  const toast = message => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2100);
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

  function internalAction(stage) {
    return ({
      'Onboarding':'Complete onboarding requirements',
      'Content Preparation':'Prepare final content structure',
      'Design':'Create design review version',
      'Development':'Complete build and responsive implementation',
      'Internal QA':'Run internal quality checklist',
      'Client Review':'Track client review response',
      'Revisions':'Complete consolidated revision request',
      'Final Approval':'Request final approval',
      'Final Payment':'Confirm final payment',
      'Deployment':'Deploy and validate production',
      'Completed':'Archive and start retention follow-up'
    })[stage] || 'Review project status';
  }

  async function outstandingFor(project) {
    const q = await ensureClient().from('studio_payments').select('amount,status').eq('project_id', project.id);
    if (q.error) throw q.error;
    const paid = (q.data || []).filter(x => x.status === 'paid').reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return Math.max(0, Number(project.project_value || 0) - paid);
  }

  async function clientAction(stage, project) {
    if (stage === 'Onboarding') return 'Provide onboarding information';
    if (stage === 'Client Review') return 'Review current deliverable';
    if (stage === 'Final Approval') return 'Approve final version';
    if (stage === 'Final Payment') return `Pay outstanding EGP ${money(await outstandingFor(project))}`;
    return 'No action required';
  }

  async function resolveNextStage(project) {
    const idx = stageOrder.indexOf(project.stage);
    if (idx < 0 || idx >= stageOrder.length - 1) return null;

    if (project.stage === 'Client Review') {
      const q = await ensureClient().from('studio_reviews').select('id,status,version,published_at').eq('project_id', project.id).order('published_at', { ascending: false }).limit(1).maybeSingle();
      if (q.error) throw q.error;
      if (!q.data) throw new Error('Publish a client review before advancing this stage.');
      if (q.data.status === 'awaiting_review') throw new Error('Client review is still awaiting a decision.');
      if (q.data.status === 'approved') return { next: 'Final Approval', skipped: ['Revisions'] };
      if (q.data.status === 'changes_requested') return { next: 'Revisions', skipped: [] };
      throw new Error(`Latest review is ${String(q.data.status).replaceAll('_',' ')}. Publish the active review version before continuing.`);
    }

    if (project.stage === 'Final Payment') {
      const outstanding = await outstandingFor(project);
      if (outstanding > 0.001) throw new Error(`Final payment is still outstanding: EGP ${money(outstanding)}.`);
    }

    return { next: stageOrder[idx + 1], skipped: [] };
  }

  async function updateStageLedger(project, next, skipped = []) {
    const client = ensureClient();
    const now = new Date().toISOString();

    const current = await client.from('studio_project_stages').update({ status: 'completed', completed_at: now }).eq('project_id', project.id).eq('stage_name', project.stage);
    if (current.error) throw current.error;

    for (const stage of skipped) {
      const skip = await client.from('studio_project_stages').update({ status: 'skipped', completed_at: now }).eq('project_id', project.id).eq('stage_name', stage);
      if (skip.error) throw skip.error;
    }

    const nextPatch = next === 'Completed'
      ? { status: 'completed', started_at: now, completed_at: now }
      : { status: 'active', started_at: now, completed_at: null };
    const nextRow = await client.from('studio_project_stages').update(nextPatch).eq('project_id', project.id).eq('stage_name', next);
    if (nextRow.error) throw nextRow.error;
  }

  async function advanceStage(button) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'UPDATING…';
    try {
      const project = await getProject();
      if (!project) throw new Error('Open a live project first.');
      const transition = await resolveNextStage(project);
      if (!transition) throw new Error('Project is already completed.');
      const { next, skipped } = transition;
      const action = await clientAction(next, project);
      const patch = {
        stage: next,
        progress: stageProgress[next] ?? project.progress,
        client_action: action,
        internal_action: internalAction(next),
        status: next === 'Completed' ? 'completed' : 'active',
        completed_at: next === 'Completed' ? new Date().toISOString() : null
      };
      const u = await client.from('studio_projects').update(patch).eq('id', project.id);
      if (u.error) throw u.error;
      await updateStageLedger(project, next, skipped);
      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'project', entity_id: project.id, action: 'project_stage_advanced',
        metadata: { from_stage: project.stage, to_stage: next, skipped_stages: skipped }
      });
      if (activity.error) throw activity.error;
      await window.StudioLiveDB?.sync?.();
      toast(`${project.project_code} → ${next}`);
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast(error.message || 'Could not advance project stage.');
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function postUpdate(button) {
    const client = ensureClient();
    if (!client) return toast('Trusted Device connection is required.');
    const text = $('#project-update-text')?.value.trim() || '';
    if (!text) return toast('Write the client update first.');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'POSTING…';
    try {
      const project = await getProject();
      if (!project) throw new Error('Open a live project first.');
      const ins = await client.from('studio_project_updates').insert({
        project_id: project.id,
        title: `${project.stage} Update`,
        content: text,
        client_visible: true
      }).select('id').single();
      if (ins.error) throw ins.error;
      const activity = await client.from('studio_activity').insert({
        actor_type: 'admin', entity_type: 'project_update', entity_id: ins.data.id, action: 'client_update_posted',
        metadata: { project_id: project.id, stage: project.stage }
      });
      if (activity.error) throw activity.error;
      await window.StudioLiveDB?.sync?.();
      toast('Client-visible project update posted');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast(error.message || 'Could not post project update.');
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.addEventListener('click', event => {
    const advance = event.target.closest('#advance-stage');
    if (advance) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void advanceStage(advance);
      return;
    }
    const post = event.target.closest('#post-project-update');
    if (post) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void postUpdate(post);
    }
  }, true);
})();
