(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s,r=document) => r.querySelector(s);
  const money = v => new Intl.NumberFormat('en-US').format(Number(v||0));
  const fmt = v => v ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)) : '—';
  const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const OTP_LENGTH = Number(window.ATS_AUTH?.accessCodeLength || window.ATS_AUTH?.otpLength || 6);
  let sb = null, context = null, diagnosticRefreshPromise = null, leadEvidenceFiles = [];

  function safeName(name='file'){return String(name).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(-120)||'file'}
  function mimeForFile(file){
    if(file.type)return file.type;
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    return ({pdf:'application/pdf',txt:'text/plain',csv:'text/csv',json:'application/json',xml:'text/xml',md:'text/markdown',html:'text/html',rtf:'text/rtf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/m4a',ogg:'audio/ogg'})[ext]||'application/octet-stream';
  }
  function fileSize(v){const n=Number(v||0);if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'}
  function renderLeadEvidenceFiles(files=[]){
    leadEvidenceFiles=files;
    const root=$('#discovery-file-list');if(!root)return;
    const l=preferredDiscoveryLang(context?.lead||{});
    if(!files.length){root.innerHTML='<div class="discovery-file-empty">'+(l==='ar'?'لم يتم رفع ملفات للمشروع حتى الآن.':'No project files shared yet.')+'</div>';return}
    root.innerHTML=files.map(f=>{
      const status=String(f.analysis_status||'not_analyzed');
      const statusLabel=l==='ar'?({ready:'تم التحليل',analyzing:'جارٍ التحليل',error:'تعذر التحليل',not_analyzed:'بانتظار التحليل',unsupported:'يحتاج مراجعة'}[status]||status):status.replaceAll('_',' ').toUpperCase();
      const summary=String(f.analysis_summary||'').trim();
      return '<article class="discovery-file-row '+esc(status)+'"><div><b>'+esc(f.file_name||'File')+'</b><span>'+esc(fileSize(f.file_size))+' · '+esc(statusLabel)+'</span>'+(summary?'<p>'+esc(summary.slice(0,260))+'</p>':'')+'</div><i></i></article>';
    }).join('');
  }
  async function loadLeadEvidenceFiles(leadId){
    if(!leadId)return;
    const q=await sb.from('studio_files').select('id,lead_id,file_name,storage_path,mime_type,file_size,analysis_status,analysis_summary,analysis_model,analyzed_at,created_at').eq('lead_id',leadId).eq('category','client_upload').order('created_at',{ascending:false});
    if(q.error){window.ATS_AUTH_CLIENT.logError('lead-files',q.error);return}
    renderLeadEvidenceFiles(q.data||[]);
  }
  function uploadState(message='',error=false){
    const el=$('#discovery-upload-state');if(!el)return;
    el.textContent=message;el.classList.toggle('error',!!error);el.classList.toggle('ok',!!message&&!error);
  }
  async function uploadLeadEvidenceFiles(input){
    const lead=context?.lead;
    if(!lead?.id)return uploadState('This request is not ready for file uploads yet.',true);
    if(!input?.files?.length)return;
    const selected=[...input.files].slice(0,10);
    input.value='';
    const tooLarge=selected.find(f=>f.size>26214400);
    if(tooLarge)return uploadState(tooLarge.name+' exceeds the 25 MB limit.',true);
    const picker=$('#discovery-file-picker');
    picker?.classList.add('busy');if(picker)picker.disabled=true;
    try{
      const {data:sessionData,error:sessionError}=await sb.auth.getSession();
      const accessToken=sessionData?.session?.access_token;
      if(sessionError||!accessToken)throw sessionError||new Error('Your client session expired. Please sign in again.');
      let completed=0;
      for(const file of selected){
        uploadState('Uploading '+file.name+'…');
        const form=new FormData();
        form.append('lead_id',lead.id);
        form.append('file',file,file.name);
        const response=await fetch(cfg.supabaseUrl+'/functions/v1/ats-public-lead-file-upload',{
          method:'POST',
          headers:{apikey:cfg.supabaseKey,Authorization:'Bearer '+accessToken},
          body:form
        });
        const uploaded=await response.json().catch(()=>null);
        if(!response.ok||!uploaded?.file?.id)throw new Error(uploaded?.detail||uploaded?.error||'Could not upload '+file.name);
        await loadLeadEvidenceFiles(lead.id);
        uploadState('Analyzing '+file.name+'…');
        const analyzed=await sb.functions.invoke('ats-lead-file-analyzer',{body:{file_id:uploaded.file.id}});
        if(analyzed.error)throw new Error(analyzed.error.message||'The file was uploaded but ATS could not analyze it.');
        completed++;
        await loadLeadEvidenceFiles(lead.id);
      }
      uploadState(completed+' file'+(completed===1?'':'s')+' uploaded and analyzed successfully.');
      toast('Project evidence added · ATS is updating the diagnosis');
      await refreshDiagnosticFromClient(false);
      await loadContext();
    }catch(error){
      window.ATS_AUTH_CLIENT.logError('file-upload',error);
      const message=error?.message||'Could not upload the project file';
      uploadState(message,true);
      toast(message);
      if(lead?.id)await loadLeadEvidenceFiles(lead.id);
    }finally{
      picker?.classList.remove('busy');if(picker)picker.disabled=false;
    }
  }

  function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1900)}
  function authState(message,error=false){const el=$('#auth-state');if(!el)return;el.textContent=message;el.classList.toggle('error',error)}
  function busy(button,on,label){if(!button)return;button.disabled=on;if(label)button.textContent=label}
  function showAuth(){ $('#auth-card')?.classList.remove('hidden'); $('#access-app')?.classList.add('hidden'); }
  function showApp(){ $('#auth-card')?.classList.add('hidden'); $('#access-app')?.classList.remove('hidden'); }

  async function openWithAccessCode(){
    const email=$('#access-email').value.trim().toLowerCase(),token=$('#access-otp').value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ $('#access-email').focus(); return authState('Enter a valid email address.',true); }
    if(!new RegExp('^\\d{' + OTP_LENGTH + '}$').test(token)){ $('#access-otp').focus(); return authState('Enter the ' + OTP_LENGTH + '-digit ATS Access Code shared with you by the Studio.',true); }
    const b=$('#verify-code');if(b.disabled)return;busy(b,true,'VERIFYING…');$('#access-email').disabled=true;$('#access-otp').disabled=true;
    try{
      const {data,error}=await sb.functions.invoke('ats-client-code-login',{body:{email,code:token}});
      if(error)throw error;
      if(!data?.token_hash)throw new Error(data?.error||'Client session token was not returned.');
      const {error:verifyError}=await sb.auth.verifyOtp({token_hash:data.token_hash,type:'email'});
      if(verifyError)throw verifyError;
      $('#access-otp').value='';
      authState('Access approved. Opening your workspace…');
      try{await loadContext()}catch(error){window.ATS_AUTH_CLIENT.logError('lookup',error);authState(window.ATS_AUTH_CLIENT.lookupMessage(error),true)}
    }catch(error){
      window.ATS_AUTH_CLIENT.logError('access-code',error);
      authState('This access code is invalid, expired, or has already been used. Ask ATS for a new 6-digit code.',true);
    }finally{
      $('#access-email').disabled=false;$('#access-otp').disabled=false;busy(b,false,'OPEN CLIENT ACCESS →');
    }
  }

  async function loadContext(){
    const {data,error}=await sb.rpc('studio_portal_access_context');
    if(error){showAuth();throw error}
    context=data;
    if(data?.mode==='client'){
      showApp();
      $('#welcome-title').textContent=`Welcome back, ${(data.full_name||'Client').split(' ')[0]}.`;
      $('#welcome-subtitle').textContent='Your client account is active. Opening the full Client Portal…';
      $('#journey-status').textContent='CLIENT ACCOUNT ACTIVE';
      $('#journey-copy').textContent=`${data.client_code||'Client'} · Your project workspace is ready.`;
      $('#current-action').textContent='Open Client Portal';
      $('#current-action-copy').textContent='Projects, files, reviews, payments and delivery are now available in your secure workspace.';
      $('#step-diagnosis').classList.add('done');$('#step-proposal').classList.add('done');$('#step-deposit').classList.add('done');$('#step-project').classList.add('active');
      setTimeout(()=>location.replace('/client-v9/'),700);
      return;
    }
    renderProspect(data);
    showApp();
  }

  function preferredDiscoveryLang(lead){
    const sample=[lead?.full_name,lead?.project_goal,lead?.company_name].filter(Boolean).join(' ');
    const ar=(sample.match(/[\u0600-\u06ff]/g)||[]).length,en=(sample.match(/[A-Za-z]/g)||[]).length;
    return ar>en?'ar':'en';
  }

  function renderDiscovery(discovery={},proposal=null,lead={}){
    const panel=$('#discovery-panel');if(!panel)return;
    panel.classList.toggle('hidden',!discovery?.id);
    if(!discovery?.id)return;
    const score=Math.max(0,Math.min(100,Number(discovery.readiness_score||0)));
    $('#discovery-score').textContent=score+'%';
    $('#discovery-progress-bar').style.width=score+'%';

    const known=[
      ['Current situation',discovery.current_state],
      ['Impact',discovery.impact],
      ['People affected',discovery.affected_people],
      ['Desired outcome',discovery.desired_outcome]
    ].filter(([,v])=>String(v||'').trim());
    $('#discovery-known').innerHTML=known.length?known.map(([k,v])=>'<article><span>'+esc(k.toUpperCase())+'</span><p>'+esc(v)+'</p></article>').join(''):'';

    const q=discovery.next_question,locked=!!proposal;
    $('#discovery-file-picker')?.classList.toggle('hidden',locked);
    const card=$('#discovery-question-card'),waiting=$('#discovery-waiting');
    card.classList.toggle('hidden',!q||locked);
    waiting.classList.toggle('hidden',!!q&&!locked);
    $('#step-diagnosis').classList.remove('done','active');

    if(q&&!locked){
      const l=preferredDiscoveryLang(lead);
      const systemQuestion=String(q.question||'').trim();
      const primary=systemQuestion||q[l]||q.en||q.ar||'';
      const secondary=systemQuestion?'':(q[l==='ar'?'en':'ar']||'');
      const why=systemQuestion?(q.reason||q.decision_value||''):(q[l==='ar'?'why_ar':'why_en']||q.why_en||q.why_ar||'');
      card.dataset.questionKey=q.key||'';
      $('#discovery-question').textContent=primary;
      $('#discovery-question-alt').textContent=secondary;
      $('#discovery-why').textContent=why;
      $('#discovery-answer').value='';
      $('#step-diagnosis').classList.add('active');
      $('#current-action').textContent=l==='ar'?'ساعدنا نفهم السبب الحقيقي':'Help us isolate the real problem';
      $('#current-action-copy').textContent=primary;
    }else if(discovery.diagnosis_ready||locked){
      $('#step-diagnosis').classList.add('done');
      waiting.innerHTML='<b>DIAGNOSIS READY</b><p>'+(discovery.root_problem?esc(discovery.root_problem):'ATS has enough structured evidence to move from discovery into a solution plan.')+'</p>';
    }else{
      $('#step-diagnosis').classList.add('active');
      waiting.innerHTML='<b>ATS IS VALIDATING THE ROOT CAUSE</b><p>Your discovery answers are complete enough for analysis. No extra question is required from you right now.</p>';
      $('#current-action').textContent='No action required';
      $('#current-action-copy').textContent='ATS is validating the root cause before defining the solution.';
    }
  }

  async function refreshDiagnosticFromClient(reload=true){
    if(diagnosticRefreshPromise)return diagnosticRefreshPromise;
    diagnosticRefreshPromise=(async()=>{
      try{
        const {error}=await sb.functions.invoke('ats-problem-solver',{body:{}});
        if(error)throw error;
        if(reload)await loadContext();
        return true;
      }catch(error){
        window.ATS_AUTH_CLIENT.logError('diagnostic-engine',error);
        return false;
      }finally{diagnosticRefreshPromise=null}
    })();
    return diagnosticRefreshPromise;
  }

  async function submitDiscoveryAnswer(){
    const card=$('#discovery-question-card'),key=card?.dataset.questionKey,answer=$('#discovery-answer')?.value.trim();
    if(!key||!answer){$('#discovery-answer')?.focus();return toast('Add a short answer first.')}
    const b=$('#submit-discovery');busy(b,true,'SENDING…');
    try{
      const {error}=await sb.rpc('studio_portal_discovery_answer',{p_question_key:key,p_answer:answer});
      if(error)throw error;
      busy(b,true,'ANALYZING…');
      toast('Answer saved · ATS is updating the diagnosis');
      await refreshDiagnosticFromClient(false);
      await loadContext();
    }catch(error){toast(error.message||'Could not save your answer')}
    finally{busy(b,false,'SEND ANSWER →')}
  }

  function renderProspect(ctx){
    const lead=ctx.lead||{},discovery=ctx.discovery||{},p=ctx.proposal,d=ctx.deposit;
    $('#welcome-title').textContent=`Welcome, ${(lead.full_name||'Client').split(' ')[0]}.`;
    $('#lead-code').textContent=lead.lead_code||'—';
    $('#lead-details').innerHTML=[['Service',lead.service],['Status',String(lead.status||'new').replaceAll('_',' ')],['Timeline',lead.timeline||'Not specified'],['Budget',lead.budget_range||'Not specified'],['Company',lead.company_name||'Individual'],['Submitted',fmt(lead.created_at)]].map(([a,b])=>`<div><span>${esc(a.toUpperCase())}</span><b>${esc(b||'—')}</b></div>`).join('');

    const statusCopy={new:['REQUEST RECEIVED','Your brief is inside ATS and is waiting for review.'],contacted:['CONTACT STARTED','ATS has started the discovery conversation with you.'],discovery:['DISCOVERY IN PROGRESS','We are separating symptoms, evidence and root causes before defining the solution.'],reviewing:['UNDER REVIEW','ATS is reviewing the challenge, evidence and project fit.'],qualified:['DIAGNOSIS READY','The problem is sufficiently understood to shape the solution and commercial scope.'],proposal_sent:['PROPOSAL STAGE','Your proposal is ready or awaiting your decision.'],negotiation:['COMMERCIAL REVIEW','The proposal is under commercial review.'],won:['PROJECT ACTIVATED','Your request has been converted into an active project.'],lost:['REQUEST CLOSED','This request has been closed.']};
    const [status,copy]=statusCopy[lead.status]||['REQUEST STATUS',String(lead.status||'').toUpperCase()];
    $('#journey-status').textContent=status;$('#journey-copy').textContent=copy;
    $('#current-action').textContent='No action required';$('#current-action-copy').textContent='ATS will update this area whenever you need to take action.';
    renderDiscovery(discovery,p,lead);
    void loadLeadEvidenceFiles(lead.id);
    if(!p&&['never_analyzed','stale'].includes(String(discovery.analysis_state||''))&&!diagnosticRefreshPromise){
      void refreshDiagnosticFromClient(true);
    }

    $('#proposal-panel').classList.toggle('hidden',!p);
    $('#deposit-panel').classList.toggle('hidden',!d);
    if(!p){$('#step-proposal').classList.remove('done','active');$('#step-deposit').classList.remove('done','active');return}

    $('#step-proposal').classList.add(p.status==='accepted'?'done':'active');
    $('#proposal-title').textContent=p.title||'Project Proposal';$('#proposal-status').textContent=String(p.status||'sent').replaceAll('_',' ').toUpperCase();
    $('#proposal-meta').innerHTML=[['Proposal',p.proposal_code],['Total',`${p.currency||'EGP'} ${money(p.total_amount)}`],['Timeline',p.timeline_text||'—'],['Valid Until',fmt(p.valid_until)],['Deposit',`${Number(p.deposit_percent||0)}%`],['Revisions',String(p.revision_limit??'—')]].map(([a,b])=>`<div><span>${esc(a.toUpperCase())}</span><b>${esc(b)}</b></div>`).join('');
    $('#proposal-scope').textContent=p.scope||'—';
    $('#proposal-deliverables').innerHTML=(p.deliverables||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>—</li>';
    $('#proposal-terms').textContent=p.terms||'—';

    const actions=$('#proposal-actions');actions.innerHTML='';
    if(['sent','viewed'].includes(p.status)){
      $('#current-action').textContent='Review your proposal';$('#current-action-copy').textContent='Review scope, timeline and commercial terms, then accept or decline the proposal.';
      actions.innerHTML=`<button class="decline" type="button" id="decline-proposal">DECLINE PROPOSAL</button><button class="accept" type="button" id="accept-proposal">ACCEPT PROPOSAL →</button>`;
    }else if(p.status==='accepted'){
      $('#current-action').textContent=d?.status==='paid'?'Payment confirmed':'Complete the project deposit';
      $('#current-action-copy').textContent=d?.status==='paid'?'The Studio is activating your project workspace.':'The deposit activates the project. Once payment is confirmed, your Client Portal opens automatically.';
      actions.innerHTML='<div class="state">Proposal accepted. Commercial terms are locked to this accepted version.</div>';
    }else if(p.status==='declined'){
      $('#current-action').textContent='Proposal declined';$('#current-action-copy').textContent='This request is closed. Contact the Studio if you want to reopen the conversation.';
    }else if(p.status==='expired'){
      $('#current-action').textContent='Proposal expired';$('#current-action-copy').textContent='Contact the Studio to request an updated proposal.';
    }

    if(d){
      $('#step-deposit').classList.add(d.status==='paid'?'done':'active');
      $('#deposit-status').textContent=String(d.status||'pending').toUpperCase();
      $('#deposit-meta').innerHTML=[['Payment',d.payment_code],['Amount',`${d.currency||'EGP'} ${money(d.amount)}`],['Due',fmt(d.due_date)],['Status',String(d.status||'pending').toUpperCase()]].map(([a,b])=>`<div><span>${esc(a.toUpperCase())}</span><b>${esc(b)}</b></div>`).join('');
      $('#deposit-copy').textContent=d.status==='paid'?'Payment is confirmed. Your project workspace will be available as soon as project activation is completed.':'Complete the deposit using the payment instructions shared by the Studio. Once the Studio confirms the payment, this page automatically becomes your full Client Portal.';
    }
  }

  async function proposalAction(action){
    const p=context?.proposal;if(!p?.id)return;
    if(action==='decline'&&!confirm('Decline this proposal and close the current request?'))return;
    const button=$(action==='accept'?'#accept-proposal':'#decline-proposal');busy(button,true,action==='accept'?'ACCEPTING…':'DECLINING…');
    try{
      const {error}=await sb.rpc('studio_portal_proposal_action',{p_proposal_id:p.id,p_action:action});if(error)throw error;
      toast(action==='accept'?'Proposal accepted · Deposit created':'Proposal declined');await loadContext();
    }catch(error){toast(error.message||'Could not update proposal')}
    finally{busy(button,false,action==='accept'?'ACCEPT PROPOSAL →':'DECLINE PROPOSAL')}
  }

  async function signOut(){await sb.auth.signOut();context=null;location.reload()}
  async function boot(){
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase){authState('Portal configuration is unavailable.',true);return}
    sb=window.ATS_AUTH_CLIENT.getClient();
    const {data:{session}}=await sb.auth.getSession();if(!session){showAuth();return}
    try{await loadContext()}catch(error){window.ATS_AUTH_CLIENT.logError('lookup',error);authState(window.ATS_AUTH_CLIENT.lookupMessage(error),true);showAuth()}
  }

  const otpInput=$('#access-otp');
  if(otpInput){
    otpInput.maxLength=OTP_LENGTH;
    otpInput.minLength=OTP_LENGTH;
    otpInput.setAttribute('pattern','[0-9]{' + OTP_LENGTH + '}');
    otpInput.setAttribute('aria-label',OTP_LENGTH + '-digit ATS Access Code');
    otpInput.placeholder='0'.repeat(OTP_LENGTH);
    otpInput.addEventListener('input',()=>{
      otpInput.value=otpInput.value.replace(/\D/g,'').slice(0,OTP_LENGTH);
    });
    const otpLabel=otpInput.closest('label')?.querySelector('span');
    if(otpLabel)otpLabel.textContent='ATS ACCESS CODE · ' + OTP_LENGTH + ' DIGITS';
  }

  $('#verify-code')?.addEventListener('click',openWithAccessCode);$('#sign-out')?.addEventListener('click',signOut);$('#refresh-access')?.addEventListener('click',()=>loadContext().catch(e=>toast(e.message)));$('#submit-discovery')?.addEventListener('click',submitDiscoveryAnswer);
  $('#discovery-file-picker')?.addEventListener('click',()=>{
    uploadState('');
    const input=$('#discovery-files');
    if(input){input.value='';input.click()}
  });
  $('#discovery-files')?.addEventListener('change',e=>uploadLeadEvidenceFiles(e.currentTarget));
  document.addEventListener('click',e=>{if(e.target.closest('#accept-proposal'))proposalAction('accept');if(e.target.closest('#decline-proposal'))proposalAction('decline')});
  $('#access-otp')?.addEventListener('keydown',e=>{if(e.key==='Enter')openWithAccessCode()});
  boot().catch(error=>{window.ATS_AUTH_CLIENT.logError('boot',error);showAuth();authState('Client Access could not be loaded. Please reload and try again.',true)});
})();