(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s,r=document) => r.querySelector(s);
  const money = v => new Intl.NumberFormat('en-US').format(Number(v||0));
  const fmt = v => v ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)) : '—';
  const esc = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  let sb = null, context = null;

  function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1900)}
  function authState(message,error=false){const el=$('#auth-state');if(!el)return;el.textContent=message;el.classList.toggle('error',error)}
  function busy(button,on,label){if(!button)return;button.disabled=on;if(label)button.textContent=label}
  function showAuth(){ $('#auth-card')?.classList.remove('hidden'); $('#access-app')?.classList.add('hidden'); }
  function showApp(){ $('#auth-card')?.classList.add('hidden'); $('#access-app')?.classList.remove('hidden'); }

  async function sendOtp(){
    const email=$('#access-email').value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return authState('Enter a valid email address.',true);
    const b=$('#send-code');busy(b,true,'SENDING…');
    try{
      const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
      if(error)throw error;
      $('#otp-wrap').classList.remove('hidden');$('#access-otp').focus();
      authState('An 8-digit login code was sent to your email.');
    }catch(error){authState(error.message||'Could not send login code.',true)}
    finally{busy(b,false,'SEND LOGIN CODE →')}
  }

  async function verifyOtp(){
    const email=$('#access-email').value.trim().toLowerCase(),token=$('#access-otp').value.trim();
    if(!/^\d{8}$/.test(token))return authState('Enter the 8-digit code from your email.',true);
    const b=$('#verify-code');busy(b,true,'VERIFYING…');
    try{
      const {error}=await sb.auth.verifyOtp({email,token,type:'email'});if(error)throw error;
      await loadContext();
    }catch(error){authState(error.message||'Could not verify this code.',true)}
    finally{busy(b,false,'OPEN CLIENT ACCESS →')}
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
      $('#step-proposal').classList.add('done');$('#step-deposit').classList.add('done');$('#step-project').classList.add('active');
      setTimeout(()=>location.replace('/client-v9/'),700);
      return;
    }
    renderProspect(data);
    showApp();
  }

  function renderProspect(ctx){
    const lead=ctx.lead||{},p=ctx.proposal,d=ctx.deposit;
    $('#welcome-title').textContent=`Welcome, ${(lead.full_name||'Client').split(' ')[0]}.`;
    $('#lead-code').textContent=lead.lead_code||'—';
    $('#lead-details').innerHTML=[['Service',lead.service],['Status',String(lead.status||'new').replaceAll('_',' ')],['Timeline',lead.timeline||'Not specified'],['Budget',lead.budget_range||'Not specified'],['Company',lead.company_name||'Individual'],['Submitted',fmt(lead.created_at)]].map(([a,b])=>`<div><span>${esc(a.toUpperCase())}</span><b>${esc(b||'—')}</b></div>`).join('');

    const statusCopy={new:['REQUEST RECEIVED','Your brief is inside Studio OS and is waiting for review.'],reviewing:['UNDER REVIEW','The Studio is reviewing the challenge, scope and project fit.'],qualified:['QUALIFIED','The request is qualified. The next step is a structured proposal.'],proposal_sent:['PROPOSAL STAGE','Your proposal is ready or awaiting your decision.'],won:['PROJECT ACTIVATED','Your request has been converted into an active project.'],lost:['REQUEST CLOSED','This request has been closed.']};
    const [status,copy]=statusCopy[lead.status]||['REQUEST STATUS',String(lead.status||'').toUpperCase()];
    $('#journey-status').textContent=status;$('#journey-copy').textContent=copy;
    $('#current-action').textContent='No action required';$('#current-action-copy').textContent='The Studio will update this area whenever you need to take action.';

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
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await sb.auth.getSession();if(!session){showAuth();return}
    try{await loadContext()}catch(error){authState(error.message||'No Studio request is linked to this account.',true);showAuth()}
  }

  $('#send-code')?.addEventListener('click',sendOtp);$('#verify-code')?.addEventListener('click',verifyOtp);$('#sign-out')?.addEventListener('click',signOut);$('#refresh-access')?.addEventListener('click',()=>loadContext().catch(e=>toast(e.message)));
  document.addEventListener('click',e=>{if(e.target.closest('#accept-proposal'))proposalAction('accept');if(e.target.closest('#decline-proposal'))proposalAction('decline')});
  boot();
})();