(()=>{
  const cfg=window.PORTFOLIO_CONFIG,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const LANG_KEY='andrew_v9_public_lang',PORTFOLIO_LANG_KEY='andrew_portfolio_lang',HANDOFF_KEY='ats_hse_guided_review_handoff_v1',SECURE_KEY='ats_hse_secure_handoff_v1';
  const params=new URLSearchParams(location.search),source=params.get('source');
  let secureSeed={};try{secureSeed=JSON.parse(sessionStorage.getItem(SECURE_KEY)||'{}')||{}}catch(_e){}
  const handoffId=secureSeed.id||'',handoffToken=secureSeed.token||'';
  let legacy={};try{legacy=JSON.parse(sessionStorage.getItem(HANDOFF_KEY)||'{}')||{}}catch(_e){}
  const legacyValid=typeof legacy.hazard==='string'&&legacy.hazard.includes('|')&&typeof legacy.summary==='string'&&legacy.summary.trim().length>=10;
  const secureCandidate=params.get('handoff')==='secure'&&!!(handoffId&&handoffToken&&handoffToken.length>=32);
  if(source!=='guided-review'||(!legacyValid&&!secureCandidate)){location.replace('/hse-guided-review/?from=professional-review');return}
  if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase){location.replace('/hse-guided-review/?from=professional-review');return}
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let lang='en',offer=null,secure=null,contextMode=null,lastResult=null;
  const hazardLabels={'':{en:'Choose the closest match',ar:'اختار أقرب نوع للمشكلة'},'NOI|Noise Exposure':{en:'Noise Exposure',ar:'التعرض للضوضاء'},'HEAT|Heat Stress':{en:'Heat Stress',ar:'الإجهاد الحراري'},'LIGHT|Lighting':{en:'Lighting',ar:'الإضاءة'},'VIB|Vibration':{en:'Vibration',ar:'الاهتزازات'},'RAD|Radiation':{en:'Radiation',ar:'الإشعاع'},'PRESS|Pressure Systems':{en:'Pressure Systems',ar:'أنظمة الضغط'},'CHEM|Chemical Exposure':{en:'Chemical Exposure',ar:'التعرض للمواد الكيميائية'},'ELEC|Electrical Safety':{en:'Electrical Safety',ar:'السلامة الكهربائية'},'MACH|Machinery Safety':{en:'Machinery Safety',ar:'سلامة الآلات'},'WAH|Work at Height':{en:'Work at Height',ar:'العمل على ارتفاع'},'FIRE|Fire Safety':{en:'Fire Safety',ar:'السلامة من الحريق'},'GEN|General HSE / Not Sure':{en:'General HSE / Not Sure',ar:'HSE عام / غير متأكد'}};
  const t=(en,ar)=>lang==='ar'?ar:en;
  function toast(m){const el=$('#toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2400)}
  function scopeText(v){if(typeof v==='string')return v;if(v&&typeof v==='object')return v[lang]||v.en||v.ar||v.label||'';return''}
  function renderOffer(){
    if(!offer)return;
    const inc=Array.isArray(offer.scope_includes)?offer.scope_includes:[],exc=Array.isArray(offer.scope_excludes)?offer.scope_excludes:[];
    $('#scope-includes').innerHTML=inc.length?inc.map(x=>'<li>'+escapeHtml(scopeText(x))+'</li>').join(''):'<li>'+escapeHtml(t('Current scope is unavailable. Submission stays locked until the live offer loads correctly.','النطاق الحالي غير متاح. يظل الإرسال مقفولًا حتى يتم تحميل العرض الحالي بشكل صحيح.'))+'</li>';
    $('#scope-excludes').innerHTML=exc.length?exc.map(x=>'<li>'+escapeHtml(scopeText(x))+'</li>').join(''):'<li>'+escapeHtml(t('Current exclusions are unavailable.','الاستثناءات الحالية غير متاحة.'))+'</li>';
    const fee=offer.price_usd===null||offer.price_usd===undefined?'—':Number(offer.price_usd).toFixed(0);$('#consultation-fee').textContent=fee==='—'?'—':'$'+fee;
    $('#request-summary').textContent=t('Professional HSE Consultation · 60 minutes · $'+fee+'. No additional service is purchased at this stage.','استشارة HSE احترافية · 60 دقيقة · '+fee+' دولار. لا يتم شراء أي خدمة إضافية في هذه الخطوة.');
  }
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function localizeHazards(){const s=$('#hazard');if(!s)return;[...s.options].forEach(o=>{if(hazardLabels[o.value])o.textContent=hazardLabels[o.value][lang]})}
  function localizeProcess(){
    const fee=offer?.price_usd===null||offer?.price_usd===undefined?'—':Number(offer.price_usd).toFixed(0),cards=$$('.process article');
    const copy=lang==='ar'?[['01','راجع النطاق والاستثناءات','النطاق الحالي ظاهر بوضوح قبل إرسال طلب الاستشارة.'],['02','اختر سياق الحالة','استخدم سياق المراجعة الموجهة أو غيّره أو ابدأ بدونه.'],['03','احجز الاستشارة بـ '+fee+' دولار','السعر للاستشارة نفسها فقط. أي خدمة إضافية تُسعّر بشكل منفصل.']]:[['01','REVIEW SCOPE & EXCLUSIONS','The current consultation scope is visible before you submit.'],['02','CHOOSE THE CASE CONTEXT','Use the Guided Review context, change it, or continue without preset context.'],['03','BOOK THE $'+fee+' CONSULTATION','The fee is for the consultation only. Any additional service is priced separately.']];
    cards.forEach((c,i)=>{if(i>=3){c.hidden=true;return}c.hidden=false;c.querySelector('span').textContent=copy[i][0];c.querySelector('b').textContent=copy[i][1];c.querySelector('p').textContent=copy[i][2]});
  }
  function contextAvailable(){return !!secure||legacyValid}
  function clearImported(){if($('#hazard'))$('#hazard').value='';if($('#summary'))$('#summary').value='';if($('#jurisdiction'))$('#jurisdiction').value=''}
  function secureSummary(){
    if(!secure)return'';
    const bits=[t('Guided Review from published HSE content','مراجعة موجهة من محتوى HSE منشور')+': '+(secure.source_slug||'')];
    if(secure.selected_area)bits.push(t('Selected area','الجانب المختار')+': '+secure.selected_area);
    if(secure.problem_description)bits.push(secure.problem_description);
    bits.push(t('The detailed Gap Map is attached securely to this case context.','خريطة الفجوات التفصيلية مرفقة بشكل آمن بسياق الحالة.'));
    return bits.join('\n');
  }
  function setMode(mode){
    if(!offer||offer.price_usd===null||offer.price_usd===undefined||!Array.isArray(offer.scope_includes)||!Array.isArray(offer.scope_excludes))return toast(t('Load the current consultation scope and price before continuing.','حمّل نطاق وسعر الاستشارة الحاليين قبل المتابعة.'));
    contextMode=mode;$$('[data-context-mode]').forEach(b=>b.classList.toggle('active',b.dataset.contextMode===mode));
    const status=$('#context-status');status.className='context-status';
    if(mode==='use'){
      if(!contextAvailable())return;
      clearImported();
      if(secure){$('#summary').value=secureSummary();$('#jurisdiction').value=''}
      else{$('#hazard').value=legacy.hazard||'';$('#summary').value=legacy.summary||'';$('#jurisdiction').value=legacy.jurisdiction||''}
      status.classList.add('good');status.textContent=t('Guided Review context will be attached. Review the fields below before submitting.','سيتم إرفاق سياق المراجعة الموجهة. راجع الحقول أدناه قبل الإرسال.');
    }else if(mode==='change'){
      clearImported();status.classList.add('warning');status.textContent=t('Context changed. The previous Gap Map will NOT be treated as an assessment of this new context. Enter the new case details below.','تم تغيير السياق. لن تُعتبر خريطة الفجوات السابقة تقييمًا لهذا السياق الجديد. أدخل بيانات الحالة الجديدة أدناه.');
    }else{
      clearImported();status.textContent=t('No preset Guided Review context will be attached. Enter the case from the beginning below.','لن يتم إرفاق سياق مُسبق من المراجعة الموجهة. أدخل الحالة من البداية أدناه.');
    }
    $('#consultation-form').classList.remove('hidden');
    $('#booking').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderContext(){
    const use=$('[data-context-mode="use"]');use.disabled=!contextAvailable();
    if(!contextAvailable())$('#context-status').textContent=t('The previous Guided Review context is not available. You can change context or continue without preset context.','سياق المراجعة الموجهة السابق غير متاح. يمكنك تغيير السياق أو المتابعة بدون سياق مُسبق.');
  }
  function renderSuccess(){
    if(!lastResult)return;const data=lastResult,code=data.case_code||data.lead_code||'',fee=Number(data.consultation_fee_usd||offer?.price_usd||75).toFixed(0);
    $('#success-copy').textContent=t('Your case '+code+' is open. Your submitted case details are saved.','تم فتح حالتك '+code+'. تم حفظ بيانات الحالة التي أرسلتها.');
    const box=$('#success-state .next-box');
    box.innerHTML=data.checkout_url?(lang==='ar'?'<b>الخطوة المطلوبة الآن</b><p>إتمام حجز الاستشارة بقيمة $'+fee+'. لا توجد أي خدمات إضافية مضافة.</p><a class="home-link" href="'+escapeHtml(data.checkout_url)+'" target="_blank" rel="noopener">ادفع $'+fee+' واحجز الاستشارة ←</a>':'<b>YOUR NEXT STEP</b><p>Complete the $'+fee+' consultation booking. No additional service has been added.</p><a class="home-link" href="'+escapeHtml(data.checkout_url)+'" target="_blank" rel="noopener">PAY $'+fee+' & BOOK CONSULTATION →</a>'):(lang==='ar'?'<b>الحالة اتفتحت بنجاح</b><p>رابط دفع الاستشارة بقيمة $'+fee+' قيد التجهيز. لا توجد خدمة إضافية مضافة.</p>':'<b>YOUR CASE IS OPEN</b><p>The $'+fee+' consultation payment link is being prepared. No additional service has been added.</p>');
  }
  function applyLang(next,save=true){
    lang=next==='ar'?'ar':'en';document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const v=el.dataset[lang];if(v!==undefined)el.textContent=v});$$('[data-en-html]').forEach(el=>{const v=el.dataset[lang+'Html'];if(v!==undefined)el.innerHTML=v});$$('[data-en-placeholder]').forEach(el=>{const v=el.dataset[lang+'Placeholder'];if(v!==undefined)el.placeholder=v});
    $('#lang-toggle').textContent=lang==='ar'?'English | AR':'EN | عربي';$('.client-link').textContent=lang==='ar'?'عميل حالي ←':'EXISTING CLIENT →';$('.brand small').textContent=lang==='ar'?'استشارة HSE احترافية':'PROFESSIONAL HSE CONSULTATION';
    localizeHazards();localizeProcess();renderOffer();renderContext();renderSuccess();
    if(save)try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}
  }
  async function loadGate(){
    const [{data:off,error:offErr},handoffRes]=await Promise.all([
      sb.rpc('studio_public_consultation_offer',{}),
      secureCandidate?sb.rpc('hse_guided_review_get_handoff',{p_handoff_id:handoffId,p_client_token:handoffToken}):Promise.resolve({data:null,error:null})
    ]);
    if(offErr||!off){toast(t('Could not load the current consultation offer.','تعذر تحميل عرض الاستشارة الحالي.'));return}
    offer=off;
    if(secureCandidate){
      if(handoffRes.error||!handoffRes.data){location.replace('/hse-guided-review/?from=professional-review');return}
      secure=handoffRes.data;
      try{sessionStorage.removeItem(SECURE_KEY)}catch(_e){}
      history.replaceState(null,'','/hse-consultation/?source=guided-review');
    }
    renderOffer();renderContext();localizeProcess();
  }
  $$('[data-context-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.contextMode)));
  $('#lang-toggle')?.addEventListener('click',()=>applyLang(lang==='ar'?'en':'ar'));
  $('#consultation-form')?.addEventListener('submit',async e=>{
    e.preventDefault();if(!contextMode)return toast(t('Choose how you want to use the Guided Review context first.','اختار أولًا طريقة استخدام سياق المراجعة الموجهة.'));
    const selected=$('#hazard').value;if(!selected)return toast(t('Choose the issue first.','اختار نوع المشكلة أولًا.'));
    const [hazardCode,hazardName]=selected.split('|'),attachSecure=contextMode==='use'&&!!secure;
    const payload={p_full_name:$('#full-name').value.trim(),p_email:$('#email').value.trim().toLowerCase(),p_phone:$('#phone').value.trim()||null,p_company_name:$('#company').value.trim()||null,p_hazard_code:hazardCode,p_hazard_name:hazardName,p_summary:$('#summary').value.trim(),p_jurisdiction:$('#jurisdiction').value.trim()||null,p_guided_review_handoff_id:attachSecure?handoffId:null,p_guided_review_client_token:attachSecure?handoffToken:null};
    if(payload.p_full_name.length<2||!payload.p_email.includes('@')||payload.p_summary.length<10)return toast(t('Check the name, email and case description.','راجع الاسم والبريد ووصف الحالة.'));
    const b=$('#submit-consultation');b.disabled=true;b.textContent=t('OPENING YOUR CASE…','جاري فتح الحالة…');
    const {data,error}=await sb.rpc('studio_submit_public_consultation_request_v2',payload);
    if(error){console.error(error);toast(t('Could not submit the request. Please try again.','تعذر إرسال الطلب. حاول مرة أخرى.'));b.disabled=false;b.textContent=t('START MY CONSULTATION →','ابدأ طلب الاستشارة ←');return}
    lastResult=data||{};try{sessionStorage.removeItem(HANDOFF_KEY)}catch(_e){}
    $('#consultation-form').classList.add('hidden');$('#context-choice').classList.add('hidden');$('#success-state').classList.remove('hidden');renderSuccess();$('#success-state').scrollIntoView({behavior:'smooth',block:'center'});
  });
  let saved='en';try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  applyLang(saved,false);loadGate().catch(err=>{console.error(err);toast(t('Could not load the Professional Review Gate.','تعذر تحميل بوابة المراجعة المهنية.'))});
})();