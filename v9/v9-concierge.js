(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const root=document.getElementById('studio-concierge');
  if(!root||!cfg||!window.supabase)return;

  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const STORAGE='ats_studio_concierge_v1';
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const state={
    mode:'quick',
    problem:'',
    link:'',
    extra:'',
    analysis:null,
    clarification:null,
    clarificationAnswer:'',
    stage:'tell',
    name:'',
    email:'',
    phone:'',
    company:''
  };

  const COPY={
    en:{
      min:'Tell us a little more — one or two sentences is enough.',
      voiceUnsupported:'Voice input is not available in this browser. You can keep typing normally.',
      voiceListening:'Listening… speak naturally.',
      situation:'CURRENT SITUATION',
      problem:'CORE PROBLEM',
      direction:'POSSIBLE DIRECTION',
      context:'IMPORTANT CONTEXT',
      capabilities:'LIKELY CAPABILITIES',
      preliminary:'This is an initial ATS reading — not a final scope.',
      noContext:'No extra context shared yet.',
      confirm:'This is our first interpretation of what you told us.',
      askStage:'One thing would materially change the next step: where are you right now?',
      stageOptions:[
        ['idea','It is still an idea / early concept'],
        ['existing','Something already exists and needs improvement'],
        ['operating','The business is operating, but the experience / message is not working well'],
        ['unsure','I am not sure — help me figure it out']
      ],
      nameRequired:'Add your name so we know who we are speaking with.',
      emailRequired:'Add a valid email so we can send the next step.',
      sending:'SENDING TO ATS…',
      submitFailed:'We could not send this request right now. Please try again.',
      received:'REQUEST RECEIVED',
      stages:{
        idea:'Early idea / concept',
        existing:'Existing product, brand or system',
        operating:'Operating business with a problem to solve',
        launch:'Preparing for launch or growth',
        unknown:'Situation needs a little more context'
      },
      problems:{
        personalized:'Turn a personalized idea into a repeatable product and customer experience.',
        positioning:'The offer or value is not clear enough for customers to understand quickly.',
        brand:'The current identity and positioning are not expressing the business clearly.',
        digital:'The current digital experience or workflow is not supporting the business effectively.',
        marketing:'The business needs a clearer foundation before increasing marketing or acquisition.',
        hse:'The HSE challenge needs a practical system, clearer communication or stronger operational control.',
        automation:'Manual or fragmented work needs a more connected digital workflow.',
        content:'The message or story needs a clearer structure to connect with the audience.',
        general:'The situation needs to be turned into a clearer problem, priorities and practical path forward.'
      },
      directions:{
        personalized:'Clarify the product → shape the experience → build the ordering and production system.',
        positioning:'Clarify the offer → align the message → improve the customer-facing experience.',
        brand:'Clarify positioning → align identity → apply it consistently across touchpoints.',
        digital:'Map the friction → simplify the journey → build or improve the right digital system.',
        marketing:'Fix the foundation → sharpen the message → prepare the experience for acquisition.',
        hse:'Understand the real operational risk → define the control path → build practical communication or systems.',
        automation:'Map the current workflow → remove unnecessary manual steps → connect the right tools.',
        content:'Clarify the core message → shape the narrative → build reusable content around it.',
        general:'Understand the situation → isolate the real problem → assemble only the capabilities the solution needs.'
      },
      capabilityLabels:{
        hse:'HSE & TECHNICAL',
        digital:'DIGITAL SYSTEMS',
        brand:'BRAND & CREATIVE',
        content:'CONTENT & STORYTELLING',
        ai:'AI & AUTOMATION',
        product:'PRODUCT THINKING'
      }
    },
    ar:{
      min:'احكي لنا شوية أكتر — جملة أو جملتين كفاية.',
      voiceUnsupported:'الإدخال بالصوت مش متاح في المتصفح ده. تقدر تكمل كتابة عادي.',
      voiceListening:'سامعينك… اتكلم بطريقتك.',
      situation:'الوضع الحالي',
      problem:'المشكلة الأساسية',
      direction:'الاتجاه المحتمل',
      context:'سياق مهم',
      capabilities:'القدرات المحتملة',
      preliminary:'دي قراءة أولية من ATS وليست Scope نهائية.',
      noContext:'مفيش سياق إضافي مضاف لحد دلوقتي.',
      confirm:'ده فهمنا الأولي لكلامك.',
      askStage:'في حاجة واحدة بس هتغيّر الخطوة الجاية فعلًا: أنت واقف فين دلوقتي؟',
      stageOptions:[
        ['idea','لسه فكرة أو Concept في البداية'],
        ['existing','في حاجة موجودة بالفعل ومحتاجة تطوير'],
        ['operating','البيزنس شغال لكن التجربة أو الرسالة مش شغالة كويس'],
        ['unsure','مش عارف — ساعدني أحدد']
      ],
      nameRequired:'اكتب اسمك علشان نعرف بنتكلم مع مين.',
      emailRequired:'اكتب بريد إلكتروني صحيح علشان نبعت لك الخطوة الجاية.',
      sending:'جارٍ الإرسال إلى ATS…',
      submitFailed:'تعذر إرسال الطلب دلوقتي. جرّب مرة تانية.',
      received:'تم استلام الطلب',
      stages:{
        idea:'فكرة أو Concept في مرحلة مبكرة',
        existing:'منتج أو Brand أو System موجود بالفعل',
        operating:'بيزنس شغال وعنده مشكلة محتاجة حل',
        launch:'استعداد لإطلاق أو نمو',
        unknown:'الوضع محتاج سياق بسيط إضافي'
      },
      problems:{
        personalized:'تحويل فكرة مخصصة إلى منتج وتجربة عميل قابلة للتكرار.',
        positioning:'العرض أو القيمة مش واضحة بما يكفي علشان العميل يفهمها بسرعة.',
        brand:'الهوية والتمركز الحاليين مش بيعبروا بوضوح عن البيزنس.',
        digital:'التجربة الرقمية أو الـWorkflow الحالي مش بيدعم البيزنس بالشكل المطلوب.',
        marketing:'البيزنس محتاج أساس ورسالة أوضح قبل زيادة التسويق أو الإعلانات.',
        hse:'تحدي الـHSE محتاج نظام عملي أو تواصل أوضح أو تحكم تشغيلي أقوى.',
        automation:'الشغل اليدوي أو المشتت محتاج Workflow رقمي أكثر ترابطًا.',
        content:'الرسالة أو القصة محتاجة بناء أوضح علشان توصل للجمهور.',
        general:'الموقف محتاج يتحول لمشكلة أوضح وأولويات وطريق عملي للتنفيذ.'
      },
      directions:{
        personalized:'نوضح المنتج ← نبني التجربة ← نربط الطلب والإنتاج في نظام واحد.',
        positioning:'نوضح العرض ← نوحد الرسالة ← نحسن تجربة العميل قدام البيزنس.',
        brand:'نوضح التمركز ← نضبط الهوية ← نطبقها بشكل متسق.',
        digital:'نفهم الاحتكاك ← نبسط الرحلة ← نبني أو نطور النظام الرقمي المناسب.',
        marketing:'نصلح الأساس ← نقوي الرسالة ← نجهز التجربة للتسويق.',
        hse:'نفهم الخطر التشغيلي الحقيقي ← نحدد مسار التحكم ← نبني تواصل أو نظام عملي.',
        automation:'نرسم الـWorkflow الحالي ← نشيل الخطوات اليدوية غير الضرورية ← نربط الأدوات المناسبة.',
        content:'نوضح الرسالة الأساسية ← نبني السرد ← نحولها لمحتوى قابل للتكرار.',
        general:'نفهم الوضع ← نعزل المشكلة الحقيقية ← نجمع فقط القدرات اللي الحل محتاجها.'
      },
      capabilityLabels:{
        hse:'HSE & TECHNICAL',
        digital:'DIGITAL SYSTEMS',
        brand:'BRAND & CREATIVE',
        content:'CONTENT & STORYTELLING',
        ai:'AI & AUTOMATION',
        product:'PRODUCT THINKING'
      }
    }
  };

  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const t=()=>COPY[lang()];
  const normalize=s=>String(s||'').toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,' ');
  const hasAny=(text,words)=>words.some(w=>text.includes(w));

  const KEYWORDS={
    idea:['idea','concept','starting','start from zero','new project','فكرة','لسه فكرة','ابدأ','ابدا','من الصفر','مشروع جديد'],
    existing:['existing','already have','current','old website','our website','working business','we have','موجود','عندي موقع','عندنا موقع','شغال','قائم','الحالي','القديم','موجود بالفعل'],
    launch:['launch','soon','ads','campaign','go live','scale','growth','اطلاق','إطلاق','قريب','اعلانات','إعلانات','حملة','تسويق','نمو'],
    personalized:['personalized','personalised','child','children','story','hero','custom story','طفل','اطفال','أطفال','قصة','قصه','بطل','مخصص','مخصصة'],
    positioning:['understand what we do','not clear','unclear','confusing','positioning','offer','value proposition','مش فاهم','مش واضح','مش بيفهم','مش بيفهموا','الناس مش فاهمة','العملاء مش فاهمين','تمركز','العرض مش واضح','القيمة'],
    brand:['brand','branding','identity','logo','visual identity','هوية','براند','لوجو','شعار','هوية بصرية'],
    digital:['website','web site','app','application','platform','checkout','portal','dashboard','ux','site','موقع','ويب','ابلكيشن','تطبيق','منصة','دفع','لوحة تحكم','داشبورد'],
    marketing:['marketing','ads','advertising','campaign','conversion','acquisition','leads','sales','تسويق','اعلان','إعلان','اعلانات','إعلانات','حملة','مبيعات','عملاء'],
    hse:['hse','safety','risk','inspection','incident','training','permit','سلامة','السلامة','مخاطر','تفتيش','حادث','تدريب','تصريح'],
    automation:['automation','automate','manual','workflow','integration','ai workflow','أتمتة','اتمتة','يدوي','ورقي','ورق','workflow','ربط الأنظمة','ربط الانظمة'],
    ai:[' ai ','artificial intelligence','image generation','gpt','ذكاء اصطناعي','الذكاء الاصطناعي','توليد صور'],
    content:['content','storytelling','video','social media','copy','message','محتوى','سرد','فيديو','سوشيال','رسالة','كتابة'],
    product:['product','package','pricing','customer journey','experience','منتج','باقة','باقات','سعر','تجربة العميل','رحلة العميل']
  };

  function persist(){
    try{localStorage.setItem(STORAGE,JSON.stringify({
      mode:state.mode,problem:state.problem,link:state.link,extra:state.extra,
      name:state.name,email:state.email,phone:state.phone,company:state.company
    }))}catch(_){}
  }
  function restore(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');
      ['mode','problem','link','extra','name','email','phone','company'].forEach(k=>{if(typeof raw[k]==='string')state[k]=raw[k]});
    }catch(_){}
  }

  function infer(text,extra=''){
    const source=normalize([text,extra].filter(Boolean).join(' '));
    const scores={hse:0,digital:0,brand:0,content:0,ai:0,product:0};
    const bump=(key,words,weight=1)=>{words.forEach(w=>{if(source.includes(w))scores[key]+=weight})};
    bump('hse',KEYWORDS.hse,2);
    bump('digital',KEYWORDS.digital,1.6);
    bump('brand',KEYWORDS.brand,1.6);
    bump('content',KEYWORDS.content,1.25);
    bump('ai',KEYWORDS.ai,1.5);
    if(/(^|\s)ai(\s|$)/.test(source))scores.ai+=1.5;
    bump('ai',KEYWORDS.automation,1.1);
    bump('product',KEYWORDS.product,1.4);
    bump('product',KEYWORDS.personalized,1.4);

    let stage='unknown',stageConfidence=.35;
    if(hasAny(source,KEYWORDS.launch)){stage='launch';stageConfidence=.82}
    if(hasAny(source,KEYWORDS.existing)){stage='existing';stageConfidence=Math.max(stageConfidence,.78)}
    if(hasAny(source,KEYWORDS.idea)&&stage==='unknown'){stage='idea';stageConfidence=.82}
    if(hasAny(source,['business is running','company is running','بيزنس شغال','الشركة شغالة','الشركه شغاله'])){stage='operating';stageConfidence=.9}

    let problemKey='general';
    const problemScores={
      personalized:KEYWORDS.personalized.filter(w=>source.includes(w)).length*2,
      positioning:KEYWORDS.positioning.filter(w=>source.includes(w)).length*2.1,
      brand:KEYWORDS.brand.filter(w=>source.includes(w)).length*1.4,
      digital:KEYWORDS.digital.filter(w=>source.includes(w)).length*1.3,
      marketing:KEYWORDS.marketing.filter(w=>source.includes(w)).length*1.35,
      hse:KEYWORDS.hse.filter(w=>source.includes(w)).length*1.7,
      automation:KEYWORDS.automation.filter(w=>source.includes(w)).length*1.7,
      content:KEYWORDS.content.filter(w=>source.includes(w)).length*1.1
    };
    const best=Object.entries(problemScores).sort((a,b)=>b[1]-a[1])[0];
    if(best&&best[1]>0)problemKey=best[0];

    if(problemKey==='personalized'){scores.product+=2;scores.ai+=1.2;scores.content+=1.4;scores.brand+=.7;scores.digital+=.9}
    if(problemKey==='positioning'){scores.brand+=1.8;scores.content+=1.2}
    if(problemKey==='marketing'){scores.brand+=1;scores.content+=1;scores.digital+=.7}
    if(problemKey==='automation'){scores.digital+=1.7;scores.ai+=1}
    if(problemKey==='hse'){scores.hse+=2;scores.digital+=.35}
    if(problemKey==='digital'){scores.digital+=1.5}
    if(problemKey==='brand'){scores.brand+=1.5}

    const ranked=Object.entries(scores).filter(([,s])=>s>0.55).sort((a,b)=>b[1]-a[1]);
    const capabilities=(ranked.length?ranked.slice(0,4).map(([k])=>k):['product','digital']);
    const problemConfidence=Math.min(.96,.52+(best?.[1]||0)*.08+(text.length>120?.12:text.length>60?.06:0));

    const contextBits=[];
    if(state.link)contextBits.push(state.link);
    if(extra)contextBits.push(extra);
    const context=contextBits.join(' · ');

    return{
      stage,stageConfidence,
      problemKey,problemConfidence,
      capabilities,
      situation:t().stages[stage]||t().stages.unknown,
      coreProblem:t().problems[problemKey]||t().problems.general,
      direction:t().directions[problemKey]||t().directions.general,
      context:context||t().noContext,
      scores
    };
  }

  function setStage(name){
    state.stage=name;
    $$('.concierge-stage',root).forEach(x=>x.classList.toggle('active',x.dataset.conciergeStage===name));
    const order=['tell','understand','snapshot','contact'];
    const idx=Math.max(0,order.indexOf(name));
    $$('[data-concierge-progress]',root).forEach((x,i)=>{
      x.classList.toggle('active',i===idx);
      x.classList.toggle('done',i<idx||name==='success');
    });
    if(name!=='success')root.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderUnderstanding(){
    state.analysis=infer(state.problem,state.extra);
    const a=state.analysis,labels=t().capabilityLabels;
    $('#concierge-understanding').innerHTML=
      `<div class="concierge-read-head"><span>${esc(t().confirm)}</span><small>${esc(t().preliminary)}</small></div>
       <div class="concierge-read-grid">
         <article><small>${esc(t().situation)}</small><strong>${esc(a.situation)}</strong></article>
         <article class="wide"><small>${esc(t().problem)}</small><strong>${esc(a.coreProblem)}</strong></article>
         <article class="wide"><small>${esc(t().direction)}</small><strong>${esc(a.direction)}</strong></article>
       </div>
       <div class="concierge-read-caps"><small>${esc(t().capabilities)}</small><div>${a.capabilities.map(k=>`<span>${esc(labels[k]||k)}</span>`).join('')}</div></div>`;
  }

  function renderClarification(){
    const a=state.analysis;
    const needs=state.mode!=='quick'&&(a.stageConfidence<.76||state.mode==='unsure');
    if(!needs){showSnapshot();return}
    const host=$('#concierge-clarify');
    host.classList.remove('hidden');
    host.innerHTML=`<small>${esc(t().askStage)}</small><div class="concierge-clarify-options">${t().stageOptions.map(([v,label])=>`<button type="button" data-stage-answer="${v}">${esc(label)}</button>`).join('')}</div><button type="button" class="concierge-skip" data-stage-answer="unsure">${lang()==='ar'?'مش مهم دلوقتي — كمل':'Not important right now — continue'}</button>`;
    host.scrollIntoView({behavior:'smooth',block:'center'});
    $$('[data-stage-answer]',host).forEach(btn=>btn.addEventListener('click',()=>{
      state.clarificationAnswer=btn.dataset.stageAnswer;
      if(btn.dataset.stageAnswer!=='unsure'){
        state.analysis.stage=btn.dataset.stageAnswer;
        state.analysis.stageConfidence=1;
        state.analysis.situation=t().stages[btn.dataset.stageAnswer]||t().stages.unknown;
      }
      showSnapshot();
    }));
  }

  function showSnapshot(){
    const a=state.analysis||infer(state.problem,state.extra);
    const labels=t().capabilityLabels;
    const nodes=[
      [t().situation,a.situation],
      [t().problem,a.coreProblem],
      [t().context,a.context],
      [t().direction,a.direction]
    ];
    $('#concierge-problem-map').innerHTML=nodes.map(([label,value],i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><small>${esc(label)}</small><strong>${esc(value)}</strong></article>${i<nodes.length-1?'<i>→</i>':''}`).join('');
    $('#concierge-capabilities').innerHTML=`<small>${esc(t().capabilities)}</small><div>${a.capabilities.map(k=>`<span>${esc(labels[k]||k)}</span>`).join('')}</div><p>${esc(t().preliminary)}</p>`;
    setStage('snapshot');
  }

  function showMessage(id,msg){
    const el=$(id);if(!el)return;
    el.textContent=msg;el.classList.remove('hidden');
  }
  function clearMessage(id){$(id)?.classList.add('hidden')}

  function focusInvalid(el){
    if(!el)return;
    el.classList.add('concierge-invalid');
    el.setAttribute('aria-invalid','true');
    el.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>el.focus({preventScroll:true}),250);
    setTimeout(()=>{el.classList.remove('concierge-invalid');el.removeAttribute('aria-invalid')},2600);
  }

  function refreshLocale(){
    const l=lang();
    const problem=$('#concierge-problem');
    const extra=$('#concierge-extra');
    if(problem)problem.placeholder=problem.dataset[l+'Placeholder']||problem.dataset.enPlaceholder||'';
    if(extra)extra.placeholder=extra.dataset[l+'Placeholder']||extra.dataset.enPlaceholder||'';
    if(state.stage==='understand'&&state.problem)renderUnderstanding();
    if(state.stage==='snapshot'&&state.analysis){
      state.analysis=infer(state.problem,state.extra);
      if(state.clarificationAnswer&&state.clarificationAnswer!=='unsure'){
        state.analysis.stage=state.clarificationAnswer;
        state.analysis.stageConfidence=1;
        state.analysis.situation=t().stages[state.clarificationAnswer]||t().stages.unknown;
      }
      showSnapshot();
    }
  }

  function bindDraftInputs(){
    const mapping={
      '#concierge-problem':'problem','#concierge-link':'link','#concierge-extra':'extra',
      '#concierge-name':'name','#concierge-email':'email','#concierge-phone':'phone','#concierge-company':'company'
    };
    Object.entries(mapping).forEach(([sel,key])=>{
      const el=$(sel);if(!el)return;
      el.value=state[key]||'';
      el.addEventListener('input',()=>{state[key]=el.value.trimStart();persist()});
    });
  }

  $$('.concierge-mode',root).forEach(btn=>btn.addEventListener('click',()=>{
    state.mode=btn.dataset.mode;
    $$('.concierge-mode',root).forEach(x=>x.classList.toggle('active',x===btn));
    persist();
  }));

  $('#concierge-context-toggle')?.addEventListener('click',()=>{
    $('#concierge-context')?.classList.toggle('hidden');
  });

  $('#concierge-understand')?.addEventListener('click',()=>{
    clearMessage('#concierge-tell-error');
    state.problem=$('#concierge-problem').value.trim();
    state.link=$('#concierge-link').value.trim();
    state.extra=$('#concierge-extra').value.trim();
    persist();
    if(state.problem.length<20){
      showMessage('#concierge-tell-error',t().min);
      focusInvalid($('#concierge-problem'));
      return;
    }
    renderUnderstanding();
    setStage('understand');
  });

  $('#concierge-adjust')?.addEventListener('click',()=>setStage('tell'));
  $('#concierge-confirm')?.addEventListener('click',renderClarification);
  $('#concierge-snapshot-back')?.addEventListener('click',()=>setStage('understand'));
  $('#concierge-contact-next')?.addEventListener('click',()=>setStage('contact'));
  $('#concierge-contact-back')?.addEventListener('click',()=>setStage('snapshot'));

  $('#concierge-submit')?.addEventListener('click',async()=>{
    clearMessage('#concierge-submit-error');
    state.name=$('#concierge-name').value.trim();
    state.email=$('#concierge-email').value.trim().toLowerCase();
    state.phone=$('#concierge-phone').value.trim();
    state.company=$('#concierge-company').value.trim();
    persist();

    if(!state.name){
      showMessage('#concierge-submit-error',t().nameRequired);
      focusInvalid($('#concierge-name'));
      return;
    }
    if(!EMAIL_RE.test(state.email)){
      showMessage('#concierge-submit-error',t().emailRequired);
      focusInvalid($('#concierge-email'));
      return;
    }

    const a=state.analysis||infer(state.problem,state.extra);
    const labels=t().capabilityLabels;
    const capabilityNames=a.capabilities.map(k=>labels[k]||k);
    const confidence={
      problem:Number(a.problemConfidence.toFixed(2)),
      stage:Number(a.stageConfidence.toFixed(2))
    };
    let goal=[
      'ATS STUDIO CONCIERGE — DISCOVERY INTAKE',
      '',
      'ORIGINAL CLIENT WORDS:',
      state.problem,
      '',
      state.link?'CONTEXT LINK:\n'+state.link:'',
      state.extra?'EXTRA CONTEXT:\n'+state.extra:'',
      '',
      'DISCOVERY SNAPSHOT:',
      'Current situation: '+a.situation,
      'Core problem: '+a.coreProblem,
      'Possible direction: '+a.direction,
      'Likely capabilities: '+capabilityNames.join(', '),
      'Conversation mode: '+state.mode,
      state.clarificationAnswer?'Critical clarification: '+state.clarificationAnswer:'',
      'Internal confidence: '+JSON.stringify(confidence)
    ].filter(Boolean).join('\n');
    if(goal.length>7900)goal=goal.slice(0,7900);

    const btn=$('#concierge-submit');
    const original=btn.textContent;
    btn.disabled=true;btn.textContent=t().sending;
    try{
      const {data,error}=await sb.rpc('studio_submit_public_lead',{
        p_full_name:state.name,
        p_email:state.email,
        p_phone:state.phone||null,
        p_company_name:state.company||null,
        p_service:'Studio Concierge · '+capabilityNames.join(' + '),
        p_project_goal:goal,
        p_timeline:null,
        p_budget_range:null,
        p_source_path:`${location.pathname}${location.hash||''} · studio-concierge`
      });
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      $('#concierge-request-code').textContent=row?.lead_code||t().received;
      $('#concierge-track').href=`/client-access/?email=${encodeURIComponent(state.email)}`;
      try{localStorage.removeItem(STORAGE)}catch(_){}
      setStage('success');
    }catch(err){
      console.error('ATS Studio Concierge submit failed',err);
      showMessage('#concierge-submit-error',t().submitFailed);
    }finally{
      btn.disabled=false;btn.textContent=original;
    }
  });

  $('#concierge-new')?.addEventListener('click',()=>{
    try{localStorage.removeItem(STORAGE)}catch(_){}
    location.hash='contact';
    location.reload();
  });

  let recognition=null;
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SpeechRecognition){
    recognition=new SpeechRecognition();
    recognition.continuous=false;
    recognition.interimResults=false;
    recognition.onresult=e=>{
      const transcript=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim();
      const box=$('#concierge-problem');
      if(transcript){
        box.value=[box.value.trim(),transcript].filter(Boolean).join(box.value.trim()?' ':'');
        state.problem=box.value;persist();
      }
      $('#concierge-voice')?.classList.remove('listening');
      clearMessage('#concierge-tell-error');
    };
    recognition.onerror=()=>{$('#concierge-voice')?.classList.remove('listening')};
    recognition.onend=()=>{$('#concierge-voice')?.classList.remove('listening')};
  }
  $('#concierge-voice')?.addEventListener('click',()=>{
    clearMessage('#concierge-tell-error');
    if(!recognition){showMessage('#concierge-tell-error',t().voiceUnsupported);return}
    recognition.lang=lang()==='ar'?'ar-EG':'en-US';
    $('#concierge-voice').classList.add('listening');
    showMessage('#concierge-tell-error',t().voiceListening);
    try{recognition.start()}catch(_){}
  });

  restore();
  bindDraftInputs();
  $$('.concierge-mode',root).forEach(x=>x.classList.toggle('active',x.dataset.mode===state.mode));
  if(state.link||state.extra)$('#concierge-context')?.classList.remove('hidden');
  refreshLocale();
  document.getElementById('lang-toggle')?.addEventListener('click',()=>setTimeout(refreshLocale,80));
})();