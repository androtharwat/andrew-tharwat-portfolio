(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const escapeHtml = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c]));
  const money = v => new Intl.NumberFormat('en-US').format(Number(v || 0));
  const publicStages = ['Onboarding','Design','Development','Client Review','Delivery'];
  const publicStageFor = stage => ['Onboarding','Content Preparation'].includes(stage) ? 'Onboarding' : stage === 'Design' ? 'Design' : ['Development','Internal QA'].includes(stage) ? 'Development' : ['Client Review','Revisions','Final Approval','Final Payment'].includes(stage) ? 'Client Review' : 'Delivery';
  const OTP_LENGTH = Number(window.ATS_AUTH?.otpLength || 8);
  let sb = null, currentClient = null, currentProject = null, sentEmail = null;
  let data = { projects: [], payments: [], updates: [], reviews: [], revisions: [], files: [], company: null };

  function toast(message) {
    const el = $('#portal-toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function setAuthState(message, error = false) {
    const el = $('#portal-auth-state'); if (!el) return;
    el.textContent = message; el.classList.toggle('error', error);
  }
  function showAuth() {
    $('#portal-auth')?.classList.remove('hidden');
    $('#portal-shell')?.classList.add('hidden');
  }
  function showPortal() {
    $('#portal-auth')?.classList.add('hidden');
    $('#portal-shell')?.classList.remove('hidden');
  }

  async function sendOtp() {
    const email = $('#portal-email').value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('#portal-email').focus(); return setAuthState('Enter a valid email address.', true); }
    const button = $('#send-otp'); if(button.disabled)return; button.disabled = true; button.textContent = 'SENDING…'; $('#portal-email').disabled=true; $('#verify-otp').disabled=true;
    try {
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      sentEmail=email; $('#portal-otp').value='';
      $('#otp-step').classList.remove('hidden');
      $('#portal-otp').focus();
      setAuthState('An ' + OTP_LENGTH + '-digit login code was sent to your email. Enter it below.');
    } catch (error) { window.ATS_AUTH_CLIENT.logError('send', error); setAuthState('We couldn’t send the login code right now. Please try again in a moment.', true); }
    finally { $('#portal-email').disabled=false; $('#verify-otp').disabled=false; button.disabled = false; button.textContent = 'SEND LOGIN CODE'; }
  }

  async function verifyOtp() {
    const email = $('#portal-email').value.trim().toLowerCase();
    const token = $('#portal-otp').value.trim();
    if(!sentEmail || email!==sentEmail){$('#portal-email').focus();return setAuthState('Send a login code to this email first.',true);}
    if (!new RegExp('^\\d{' + OTP_LENGTH + '}$').test(token)) return setAuthState('Enter the ' + OTP_LENGTH + '-digit code from your email.', true);
    const button = $('#verify-otp'); if(button.disabled)return; button.disabled = true; button.textContent = 'VERIFYING…'; $('#portal-email').disabled=true; $('#send-otp').disabled=true;
    try {
      const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
      try { await activateAndLoad(); } catch(error) { window.ATS_AUTH_CLIENT.logError('lookup',error); setAuthState(window.ATS_AUTH_CLIENT.lookupMessage(error),true); }
    } catch (error) { window.ATS_AUTH_CLIENT.logError('verify',error); setAuthState('The code could not be verified. Check it or request a new code.', true); }
    finally { $('#portal-email').disabled=false; $('#send-otp').disabled=false; button.disabled = false; button.textContent = 'OPEN CLIENT PORTAL'; }
  }

  async function activateAndLoad() {
    setAuthState('Verifying your client access…');
    const { data: claim, error: claimError } = await sb.rpc('studio_claim_client_by_verified_email');
    if (claimError) {
      // Prospects continue through request lookup; database failures must not revoke a valid session.
      if(claimError.code==='P0002'){location.replace('/client-access/');return;}
      throw claimError;
    }
    await loadClientData(claim);
  }

  async function loadClientData(clientId) {
    const clientQuery = clientId
      ? sb.from('studio_clients').select('*').eq('id', clientId).maybeSingle()
      : sb.from('studio_clients').select('*').maybeSingle();
    const clientResult = await clientQuery;
    if (clientResult.error) throw clientResult.error;
    if (!clientResult.data) throw new Error('Client record not found for this account.');
    currentClient = clientResult.data;

    const [projects, payments, updates, reviews, revisions, files] = await Promise.all([
      sb.from('studio_projects').select('*').order('created_at', { ascending: false }),
      sb.from('studio_payments').select('*').order('created_at', { ascending: false }),
      sb.from('studio_project_updates').select('*').order('created_at', { ascending: false }),
      sb.from('studio_reviews').select('*').order('published_at', { ascending: false }),
      sb.from('studio_revisions').select('*').order('submitted_at', { ascending: false }),
      sb.from('studio_files').select('*').order('created_at', { ascending: false })
    ]);
    const failed = [projects,payments,updates,reviews,revisions,files].find(x => x.error);
    if (failed) throw failed.error;
    data.projects = projects.data || []; data.payments = payments.data || []; data.updates = updates.data || [];
    data.reviews = reviews.data || []; data.revisions = revisions.data || []; data.files = files.data || [];

    if (currentClient.company_id) {
      const company = await sb.from('studio_companies').select('*').eq('id', currentClient.company_id).maybeSingle();
      if (!company.error) data.company = company.data;
    }
    currentProject = data.projects.find(p => p.status !== 'completed') || data.projects[0] || null;
    renderAll(); showPortal(); handleHash();
  }

  function projectPayments(project) { return data.payments.filter(x => x.project_id === project.id); }
  function projectUpdates(project) { return data.updates.filter(x => x.project_id === project.id); }
  function projectReviews(project) { return data.reviews.filter(x => x.project_id === project.id); }
  function projectRevisions(project) { return data.revisions.filter(x => x.project_id === project.id); }
  function projectFiles(project) { return data.files.filter(x => x.project_id === project.id); }
  function nextPublicStage(stage) { const idx = publicStages.indexOf(publicStageFor(stage)); return idx < publicStages.length - 1 ? publicStages[idx + 1] : 'Complete'; }
  function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }

  function renderProfile() {
    const first = (currentClient.full_name || 'Client').split(' ')[0];
    $('#portal-title').textContent = `Welcome, ${first}.`;
    $('#portal-profile-name').textContent = currentClient.full_name || 'Client';
    $('#portal-profile-company').textContent = data.company?.name || 'Client';
    $('#portal-avatar').textContent = first.charAt(0).toUpperCase();
  }

  function renderHome() {
    if (!currentProject) {
      $('#portal-empty').classList.remove('hidden'); $('#portal-app').classList.add('hidden');
      $('#portal-empty h2').textContent = 'No projects are linked to your account yet.';
      $('#portal-empty p:last-of-type').textContent = 'When a project becomes active, it will appear here automatically.';
      return;
    }
    $('#portal-empty').classList.add('hidden'); $('#portal-app').classList.remove('hidden');
    const p = currentProject, idx = publicStages.indexOf(publicStageFor(p.stage));
    $('#home-project-title').textContent = p.title; $('#home-project-id').textContent = p.project_code;
    $('#home-progress').textContent = `${p.progress || 0}%`; $('#home-progress-bar').style.width = `${p.progress || 0}%`;
    $('#home-stage').textContent = publicStageFor(p.stage); $('#home-next-stage').textContent = `Next: ${nextPublicStage(p.stage)}`;
    const action = p.client_action || 'No action required'; $('#home-action').textContent = action;
    const noAction = action === 'No action required';
    $('#home-action-copy').textContent = noAction ? 'Our team is currently working on your project. We’ll notify you when we need something from you.' : 'This is the single action currently required from you before the project can continue.';
    $('#home-action-button').classList.toggle('hidden', noAction);
    $('#home-timeline').innerHTML = publicStages.map((s,i) => `<div class="client-stage ${i<idx?'done':i===idx?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(s)}</b></div>`).join('');
    const latest = projectUpdates(p)[0];
    $('#home-latest-update').innerHTML = latest ? `<b>${escapeHtml(latest.title || 'Project Update')}</b><p>${escapeHtml(latest.content)}</p><small>${formatDate(latest.created_at)}</small>` : '<b>No update posted yet.</b><p>Your Studio updates will appear here as the project progresses.</p>';
    const pays = projectPayments(p), paid = pays.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0);
    $('#home-paid').textContent = `EGP ${money(paid)}`; $('#home-remaining').textContent = `EGP ${money(Math.max(0, Number(p.project_value||0)-paid))}`;
  }

  function renderProjects() {
    $('#portal-project-list').innerHTML = data.projects.length ? data.projects.map(p => `<div class="portal-project-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.project_code)}</small></div><span>${escapeHtml(publicStageFor(p.stage))}</span><span><div class="mini-progress"><i style="width:${Number(p.progress||0)}%"></i></div><small>${Number(p.progress||0)}% complete</small></span><span>${escapeHtml(p.status||'active')}</span><button type="button" data-project-open="${p.id}">OPEN →</button></div>`).join('') : '<div class="portal-card">No projects yet.</div>';
  }

  function reviewHtml(project) {
    const reviews = projectReviews(project);
    const revisions = projectRevisions(project);
    if (!reviews.length) return '<div class="latest-update"><b>No review requested right now.</b><p>When a deliverable needs your approval it will appear here.</p></div>';
    return `<div class="review-live-panel">${reviews.map(r => {
      const revision = revisions.find(x => x.review_id === r.id);
      const reviewFile = data.files.find(f => f.id === r.file_id && f.storage_path);
      const openReview = reviewFile
        ? `<p><button class="text-link" type="button" data-file-download="${reviewFile.id}" data-file-path="${escapeHtml(reviewFile.storage_path)}">OPEN REVIEW FILE ↗</button></p>`
        : (r.preview_url ? `<p><a href="${escapeHtml(r.preview_url)}" target="_blank" rel="noopener">OPEN PREVIEW ↗</a></p>` : '');
      return `<div class="review-live-item"><h4>${escapeHtml(r.title)} · ${escapeHtml(r.version)}</h4><p>${escapeHtml(r.review_code)} · ${escapeHtml(r.status.replaceAll('_',' ').toUpperCase())}${revision ? ` · Revision #${revision.revision_number} ${revision.status}` : ''}</p>${openReview}${r.status === 'awaiting_review' ? `<div class="review-live-actions"><button class="changes" type="button" data-review-changes="${r.id}">REQUEST CHANGES</button><button class="approve" type="button" data-review-approve="${r.id}">APPROVE VERSION</button></div>` : ''}<div class="hidden" data-revision-form="${r.id}"><textarea class="review-notes" placeholder="Group all requested changes in one message."></textarea><div class="review-live-actions"><button class="approve" type="button" data-submit-changes="${r.id}">SUBMIT REVISION REQUEST</button></div></div></div>`;
    }).join('')}</div>`;
  }

  function renderProjectDetail(id) {
    const p = data.projects.find(x => x.id === id); if (!p) return;
    currentProject = p; const idx = publicStages.indexOf(publicStageFor(p.stage)), latest = projectUpdates(p)[0];
    $('#client-project-detail').innerHTML = `<section class="portal-card client-project-hero"><p class="eyebrow">${escapeHtml(p.project_code)}</p><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(data.company?.name || currentClient.full_name)}</p><div class="client-project-meta"><div><span>STAGE</span><b>${escapeHtml(publicStageFor(p.stage))}</b></div><div><span>PROGRESS</span><b>${Number(p.progress||0)}%</b></div><div><span>DEADLINE</span><b>${escapeHtml(formatDate(p.due_date))}</b></div><div><span>STATUS</span><b>${escapeHtml(p.status||'active')}</b></div></div></section><div class="client-project-layout"><section class="portal-card"><div class="card-head"><div><p class="eyebrow">PROJECT TIMELINE</p><h3>Current Progress</h3></div></div><div class="client-timeline">${publicStages.map((s,i)=>`<div class="client-stage ${i<idx?'done':i===idx?'current':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(s)}</b></div>`).join('')}</div><div class="latest-update" style="margin-top:14px"><b>${escapeHtml(latest?.title||'No update posted yet')}</b><p>${escapeHtml(latest?.content||'Project updates from the Studio will appear here.')}</p></div></section><aside class="portal-card action-card"><p class="eyebrow">YOUR ACTION</p><h3>${escapeHtml(p.client_action||'No action required')}</h3><p>${p.client_action&&p.client_action!=='No action required'?'This action is required before the project can continue.':'Nothing is required from you right now.'}</p></aside></div><section class="portal-card" style="margin-top:12px"><div class="card-head"><div><p class="eyebrow">REVIEWS & APPROVALS</p><h3>Client Review</h3></div></div>${reviewHtml(p)}</section>`;
    showView('project-detail'); history.replaceState(null,'',`#project/${encodeURIComponent(id)}`);
  }

  function renderPayments() {
    if (!currentProject) return;
    const p=currentProject, pays=projectPayments(p), paid=pays.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0), remaining=Math.max(0,Number(p.project_value||0)-paid);
    $('#portal-payment-summary').innerHTML=`<article class="portal-card"><span>PROJECT TOTAL</span><strong>EGP ${money(p.project_value||0)}</strong></article><article class="portal-card"><span>PAID</span><strong>EGP ${money(paid)}</strong></article><article class="portal-card"><span>REMAINING</span><strong>EGP ${money(remaining)}</strong></article>`;
    $('#portal-payment-list').innerHTML=pays.length?pays.map(x=>`<div class="portal-payment-row"><div><b>${escapeHtml(x.payment_type==='deposit'?'Project Deposit':x.payment_type)}</b><small>${escapeHtml(x.payment_code)}</small></div><span>EGP ${money(x.amount)}</span><span>${escapeHtml(x.status.toUpperCase())}</span><span>${escapeHtml(formatDate(x.due_date))}</span><span>${x.status==='paid'?'Confirmed':'Pending'}</span></div>`).join(''):'<div class="portal-card">No payment records yet.</div>';
  }

  function renderFiles() {
    const root = $('#portal-files-live'); if (!root || !currentProject) return;
    const files = projectFiles(currentProject);
    root.innerHTML = files.length ? files.map(f => `<div class="portal-file-row"><div><b>${escapeHtml(f.file_name)}</b><span>${escapeHtml(f.category)} · ${escapeHtml(f.version||'')}</span></div><span>${formatDate(f.created_at)}</span><span>${f.storage_path?'Available':'—'}</span></div>`).join('') : '<div class="portal-card">No client-visible files have been shared yet.</div>';
  }

  function renderAccount() {
    $('#portal-account').innerHTML = [['Name',currentClient.full_name],['Company',data.company?.name||'—'],['Email',currentClient.email],['Phone',currentClient.phone||'—'],['Client ID',currentClient.client_code],['Status',currentClient.status]].map(([l,v])=>`<div><span>${escapeHtml(l.toUpperCase())}</span><b>${escapeHtml(v||'—')}</b></div>`).join('');
  }
  function renderAll(){ renderProfile(); renderHome(); renderProjects(); renderPayments(); renderFiles(); renderAccount(); }

  function showView(v) {
    $$('.portal-view').forEach(x=>x.classList.toggle('active',x.dataset.portalView===v));
    $$('[data-portal-nav]').forEach(x=>x.classList.toggle('active',x.dataset.portalNav===v));
    if(v==='home'){const first=(currentClient?.full_name||'Client').split(' ')[0];$('#portal-title').textContent=`Welcome, ${first}.`;$('#portal-subtitle').textContent='Everything important about your project, in one place.'}
    else { $('#portal-title').textContent=({'projects':'My Projects','project-detail':'Project','files':'Files','payments':'Payments','new-project':'Start New Project','account':'Account'})[v]||'Client Portal'; $('#portal-subtitle').textContent='Andrew Tharwat Studio · Client Portal'; }
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function navigate(v){ if(v==='payments')renderPayments();if(v==='files')renderFiles();showView(v);history.replaceState(null,'',`#${v}`); }
  function handleHash(){const h=location.hash.replace(/^#/,'');if(h.startsWith('project/'))return renderProjectDetail(decodeURIComponent(h.slice(8)));navigate(h||'home');}

  async function doReview(reviewId, action, notes='') {
    const { data: result, error } = await sb.rpc('studio_client_review_action', { p_review_id: reviewId, p_action: action, p_notes: notes || null });
    if (error) throw error;
    toast(action==='approve'?'Version approved · Studio notified':`Revision #${result.revision_number} submitted`);
    await loadClientData(currentClient.id);
    if (currentProject) renderProjectDetail(currentProject.id);
  }

  async function submitRepeatProject(event) {
    event.preventDefault(); const goal=$('#new-goal').value.trim(); if(!goal)return toast('Tell us the project goal first');
    const payload={existing_client_id:currentClient.id,full_name:currentClient.full_name,email:currentClient.email,phone:currentClient.phone,company_name:data.company?.name||null,service:$('#new-service').value,project_goal:goal,timeline:$('#new-timeline').value,budget_range:$('#new-budget').value,source:'Client Portal',source_path:'/client-v9/',status:'new'};
    const { data: lead, error } = await sb.from('studio_leads').insert(payload).select('lead_code').single();
    if(error)return toast(error.message);$('#new-goal').value='';toast(`${lead.lead_code} created · Studio notified`);setTimeout(()=>navigate('projects'),800);
  }

  async function signOut(){await sb.auth.signOut();currentClient=null;data={projects:[],payments:[],updates:[],reviews:[],revisions:[],files:[],company:null};showAuth();setAuthState('Signed out securely.');}

  document.addEventListener('click', async event => {
    const nav=event.target.closest('[data-portal-nav]');if(nav){event.preventDefault();navigate(nav.dataset.portalNav);return;}
    const open=event.target.closest('[data-project-open],[data-open-project]');if(open){event.preventDefault();const id=open.dataset.projectOpen||currentProject?.id;if(id)renderProjectDetail(id);return;}
    const approve=event.target.closest('[data-review-approve]');if(approve){event.preventDefault();if(!confirm('Approve this version? Major changes after approval may require a new revision or scope update.'))return;try{await doReview(approve.dataset.reviewApprove,'approve')}catch(e){toast(e.message)}return;}
    const changes=event.target.closest('[data-review-changes]');if(changes){event.preventDefault();$(`[data-revision-form="${changes.dataset.reviewChanges}"]`)?.classList.remove('hidden');return;}
    const submit=event.target.closest('[data-submit-changes]');if(submit){event.preventDefault();const box=$(`[data-revision-form="${submit.dataset.submitChanges}"]`),notes=box?.querySelector('textarea')?.value.trim()||'';if(!notes)return toast('Add all requested changes first');try{await doReview(submit.dataset.submitChanges,'request_changes',notes)}catch(e){toast(e.message)}return;}
  });

  async function boot(){
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase){showAuth();return setAuthState('Portal configuration could not be loaded.',true);}
    sb=window.ATS_AUTH_CLIENT.getClient();
    const {data:{session}}=await sb.auth.getSession();
    if(!session){showAuth();return;}
    try{await activateAndLoad()}catch(error){window.ATS_AUTH_CLIENT.logError('lookup',error);setAuthState(window.ATS_AUTH_CLIENT.lookupMessage(error),true);showAuth();}
  }

  const otpInput=$('#portal-otp');
  if(otpInput){
    otpInput.maxLength=OTP_LENGTH;
    otpInput.minLength=OTP_LENGTH;
    otpInput.setAttribute('pattern','[0-9]{' + OTP_LENGTH + '}');
    otpInput.setAttribute('aria-label',OTP_LENGTH + '-digit login code');
    otpInput.placeholder='0'.repeat(OTP_LENGTH);
    otpInput.addEventListener('input',()=>{
      otpInput.value=otpInput.value.replace(/\D/g,'').slice(0,OTP_LENGTH);
    });
    const otpLabel=otpInput.closest('label')?.querySelector('span');
    if(otpLabel)otpLabel.textContent=OTP_LENGTH + '-DIGIT LOGIN CODE';
  }

  $('#send-otp')?.addEventListener('click',sendOtp);$('#verify-otp')?.addEventListener('click',verifyOtp);$('#portal-signout')?.addEventListener('click',signOut);$('#new-project-form')?.addEventListener('submit',submitRepeatProject);
  $('#home-action-button')?.addEventListener('click',()=>{const p=currentProject;if(!p)return;const review=projectReviews(p).find(r=>r.status==='awaiting_review');if(review)return renderProjectDetail(p.id);if((p.client_action||'').toLowerCase().includes('pay'))return navigate('payments');renderProjectDetail(p.id)});
  window.addEventListener('hashchange',()=>{if(currentClient)handleHash()});
  $('#portal-email')?.addEventListener('input',()=>{if(sentEmail && $('#portal-email').value.trim().toLowerCase()!==sentEmail){sentEmail=null;$('#portal-otp').value='';$('#otp-step').classList.add('hidden');setAuthState('Send a new login code for the updated email.')}});
  boot().catch(error=>{window.ATS_AUTH_CLIENT.logError('boot',error);showAuth();setAuthState('Client Portal could not be loaded. Please reload and try again.',true)});
})();
