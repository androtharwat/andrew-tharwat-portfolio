(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const send=$('#send-brief');
  const note=$('.summary-note');
  if(!send)return;

  if(note){
    note.dataset.en='Your project brief will be sent securely to Andrew Tharwat Studio and added to Studio OS.';
    note.dataset.ar='سيتم إرسال بريف المشروع بأمان إلى Andrew Tharwat Studio وإضافته مباشرة إلى Studio OS.';
    note.textContent=document.body.dataset.lang==='ar'?note.dataset.ar:note.dataset.en;
  }

  const value=s=>(document.querySelector(`[data-bind="${s}"]`)?.value||'').trim();
  const selected=(selector,key)=>$(selector)?.dataset?.[key]||'';
  const selectedMany=(selector,key)=>$$(selector).map(x=>x.dataset?.[key]).filter(Boolean);
  const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function setBusy(busy){
    send.setAttribute('aria-busy',busy?'true':'false');
    send.style.pointerEvents=busy?'none':'';
    send.style.opacity=busy?'.65':'';
    if(busy)send.textContent=document.body.dataset.lang==='ar'?'جارٍ الإرسال…':'SENDING…';
    else send.textContent=document.body.dataset.lang==='ar'?'إرسال بريف المشروع ←':'SEND PROJECT BRIEF →';
  }

  function showError(message){
    document.querySelector('.brief-live-error')?.remove();
    const el=document.createElement('div');
    el.className='brief-validation brief-live-error';
    el.setAttribute('role','alert');
    el.textContent=message;
    send.insertAdjacentElement('afterend',el);
  }

  function showSuccess(code){
    document.querySelector('.brief-live-error')?.remove();
    const shell=$('.brief-shell');
    const summary=$('.brief-summary');
    if(shell)shell.classList.add('brief-submitted');
    if(summary){
      const ar=document.body.dataset.lang==='ar';
      summary.innerHTML=`<small>${ar?'تم استلام الطلب':'PROJECT REQUEST RECEIVED'}</small><h3>${ar?'شكرًا — البريف وصل إلى Studio OS.':'Thank you — your brief is now inside Studio OS.'}</h3><div class="summary-row"><small>${ar?'رقم الطلب':'REQUEST ID'}</small><b>${code||'—'}</b></div><p class="summary-note">${ar?'سنراجع التحدي والاحتياج، والخطوة التالية ستكون التواصل معك ثم إعداد المقترح المناسب.':'We’ll review the challenge and requirements. The next step is contact and, if it is a fit, a structured proposal.'}</p><button class="btn ghost" type="button" id="new-project-request">${ar?'إرسال طلب آخر':'START ANOTHER REQUEST'}</button>`;
      $('#new-project-request')?.addEventListener('click',()=>location.reload());
    }
  }

  send.addEventListener('click',async e=>{
    const name=value('name');
    const email=value('email');
    const phone=value('phone');
    const company=value('company');
    const type=selected('.brief-choice.selected','type')||'General / Multidisciplinary';
    const goal=value('goal');
    const audience=value('audience');
    const success=value('success');
    const timeline=selected('.timeline-choice.selected','time');
    const budget=value('budget');
    const stage=value('stage');
    const disciplines=selectedMany('.brief-discipline.selected','disc');
    const ar=document.body.dataset.lang==='ar';

    if(!name||!email||!isEmail(email)||!goal){
      e.preventDefault();
      e.stopImmediatePropagation();
      showError(ar?'أدخل الاسم والبريد الإلكتروني الصحيح ووصف التحدي قبل الإرسال.':'Add your name, a valid email, and the challenge before sending.');
      document.querySelector('.brief-step[data-key="contact"]')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    setBusy(true);
    try{
      const projectGoal=[
        `Challenge / Goal: ${goal}`,
        audience?`Audience: ${audience}`:'',
        success?`Success looks like: ${success}`:'',
        disciplines.length?`Possible expertise: ${disciplines.join(', ')}`:'',
        stage?`Current stage: ${stage}`:''
      ].filter(Boolean).join('\n');

      const {data,error}=await sb.rpc('studio_submit_public_lead',{
        p_full_name:name,
        p_email:email,
        p_phone:phone||null,
        p_company_name:company||null,
        p_service:type,
        p_project_goal:projectGoal,
        p_timeline:timeline||null,
        p_budget_range:budget||null,
        p_source_path:`${location.pathname}${location.hash||''}`
      });
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      showSuccess(row?.lead_code||'REQUEST RECEIVED');
    }catch(error){
      console.error('V9 lead submission failed',error);
      showError(ar?'تعذر إرسال الطلب الآن. جرّب مرة أخرى، أو استخدم وسيلة التواصل المباشر.':'We could not send the request right now. Please try again or use direct contact.');
      setBusy(false);
    }
  },true);
})();
