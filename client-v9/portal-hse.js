(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c]));
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  let currentClient = null;
  let cases = [];
  let payments = [];
  let loading = false;
  let selectedCaseId = null;

  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  function lang(){
    try{return (localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en')==='ar'?'ar':'en'}catch(_e){return 'en'}
  }
  const ar=()=>lang()==='ar';
  const t=(en,arabic)=>ar()?arabic:en;

  const statuses={
    intake_pending:['Awaiting consultation payment','بانتظار دفع الاستشارة'],
    consultation_booked:['Consultation booked','تم حجز الاستشارة'],
    ready_for_consultation:['Ready for consultation','جاهز للاستشارة'],
    consultation_complete:['Consultation complete','تمت الاستشارة'],
    services_recommended:['Recommendations ready','التوصيات جاهزة'],
    active:['Services in progress','الخدمات قيد التنفيذ'],
    closed:['Closed','مغلقة'],cancelled:['Cancelled','ملغاة'],
    recommended:['Recommended','موصى بها'],requested:['Quote requested','تم طلب تسعير'],quoted:['Ready to accept','السعر جاهز'],accepted:['Accepted','تم الاختيار'],awaiting_payment:['Awaiting payment','بانتظار الدفع'],paid:['Paid','مدفوع'],in_progress:['In progress','قيد التنفيذ'],delivered:['Delivered','تم التسليم'],declined:['Not selected','غير مختارة'],cancelled_service:['Cancelled','ملغاة']
  };
  const hazardAr={NOI:'التعرض للضوضاء',HEAT:'الإجهاد الحراري',LIGHT:'الإضاءة',VIB:'الاهتزازات',RAD:'الإشعاع',PRESS:'أنظمة الضغط',CHEM:'التعرض للمواد الكيميائية',ELEC:'السلامة الكهربائية',MACH:'سلامة الآلات',WAH:'العمل على ارتفاع',FIRE:'السلامة من الحريق',GEN:'HSE عام / غير متأكد'};
  const statusLabel=s=>statuses[s]?.[ar()?1:0]||String(s||'').replaceAll('_',' ');
  const money=(v,c='USD')=>new Intl.NumberFormat(ar()?'ar-EG':'en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));
  const fmtDate=v=>v?new Intl.DateTimeFormat(ar()?'ar-EG':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';
  function toast(message){const el=$('#portal-toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200)}

  function paymentFor(id){return payments.find(p=>p.id===id)||null}
  function servicePaymentIds(c){return [...new Set((c.studio_case_services||[]).map(x=>x.payment_id).filter(Boolean))]}
  function serviceName(s){return ar()?(s.studio_service_catalog?.name_ar||s.studio_service_catalog?.name_en||'خدمة'):(s.studio_service_catalog?.name_en||'Service')}
  function hazardName(c){return ar()?(hazardAr[c.hazard_code]||c.hazard_name||c.title):(c.hazard_name||c.title)}

  function casePriority(c){
    const consultationPay=paymentFor(c.consultation_payment_id);
    const services=c.studio_case_services||[];
    if(consultationPay&&consultationPay.status!=='paid')return 100;
    if(services.some(s=>['recommended','quoted'].includes(s.status)))return 90;
    const unpaid=servicePaymentIds(c).map(paymentFor).some(p=>p&&p.status!=='paid');
    if(unpaid)return 80;
    if(['consultation_booked','ready_for_consultation'].includes(c.status))return 60;
    if(c.status==='consultation_complete'&&!services.length)return 50;
    if(c.status==='active')return 40;
    if(c.status==='services_recommended')return 35;
    if(['closed','cancelled'].includes(c.status))return 0;
    return 20;
  }
  function needsClientAction(c){
    const consultationPay=paymentFor(c.consultation_payment_id);
    if(consultationPay&&consultationPay.status!=='paid'&&!!consultationPay.checkout_url)return true;
    if((c.studio_case_services||[]).some(s=>['recommended','quoted'].includes(s.status)))return true;
    return servicePaymentIds(c).map(paymentFor).some(p=>p&&p.status!=='paid'&&!!p.checkout_url);
  }
  function primaryCase(){
    if(selectedCaseId){const chosen=cases.find(c=>c.id===selectedCaseId);if(chosen)return chosen}
    return [...cases].sort((a,b)=>casePriority(b)-casePriority(a)||(new Date(b.created_at)-new Date(a.created_at)))[0]||null;
  }

  async function loadHse(){
    if(loading)return;loading=true;
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session){renderSignedOut();return}
      const clientRes=await sb.from('studio_clients').select('id,full_name,email').maybeSingle();
      if(clientRes.error||!clientRes.data)return;
      currentClient=clientRes.data;
      const [caseRes,paymentRes]=await Promise.all([
        sb.from('studio_consultation_cases').select('*,studio_case_services(id,service_id,payment_id,status,quoted_price,currency,recommendation_reason,requested_at,accepted_at,delivered_at,studio_service_catalog(id,service_code,name_en,name_ar,pricing_mode,display_price_usd))').order('created_at',{ascending:false}),
        sb.from('studio_payments').select('id,payment_code,payment_type,amount,currency,status,due_date,paid_at,checkout_url,checkout_provider,notes,created_at').in('payment_type',['consultation','case_service']).order('created_at',{ascending:false})
      ]);
      if(caseRes.error)throw caseRes.error;
      if(paymentRes.error)throw paymentRes.error;
      cases=caseRes.data||[];payments=paymentRes.data||[];
      if(selectedCaseId&&!cases.some(c=>c.id===selectedCaseId))selectedCaseId=null;
      render();
      if(cases.length){$('#portal-empty')?.classList.add('hidden');$('#portal-app')?.classList.remove('hidden')}
    }catch(e){console.error(e);const root=$('#hse-case-content');if(root)root.innerHTML=`<div class="portal-card"><b>${t('Unable to load HSE consultation records.','تعذر تحميل حالات استشارة HSE.')}</b><p>${esc(e.message)}</p></div>`}
    finally{loading=false}
  }

  function renderSignedOut(){const root=$('#hse-case-content');if(root)root.innerHTML=`<div class="hse-zero">${t('Sign in to view your HSE consultation cases.','سجّل الدخول لعرض حالات استشارة HSE الخاصة بك.')}</div>`}

  function hazardOptions(){
    const items=[['NOI','Noise Exposure'],['HEAT','Heat Stress'],['LIGHT','Lighting'],['VIB','Vibration'],['RAD','Radiation'],['PRESS','Pressure Systems'],['CHEM','Chemical Exposure'],['ELEC','Electrical Safety'],['MACH','Machinery Safety'],['WAH','Work at Height'],['FIRE','Fire Safety'],['GEN','General HSE / Not Sure']];
    return `<option value="">${t('Choose the closest match','اختر أقرب مشكلة')}</option>`+items.map(([code,en])=>`<option value="${code}|${en}">${esc(ar()?(hazardAr[code]||en):en)}</option>`).join('');
  }

  function startForm(){return `<article class="portal-card hse-start-card"><p class="eyebrow">${t('ONE CLEAR FIRST STEP','خطوة أولى واحدة وواضحة')}</p><h3>${t('Start with the Guided Review.','ابدأ بالمراجعة الموجهة.')}</h3><p>${t('Build your Gap Map first. If professional judgement is useful, the Professional Review Gate will open the consultation step with your case context already attached.','كوّن خريطة الفجوات الأول. لو الحالة محتاجة حكم مهني، بوابة المراجعة المهنية هتفتح لك خطوة الاستشارة وبيانات حالتك هتكون مرفقة تلقائيًا.')}</p><a class="portal-button" href="/hse-guided-review/">${t('START GUIDED REVIEW →','ابدأ المراجعة الموجهة ←')}</a></article>`}

  function nextAction(c){
    const consultationPay=paymentFor(c.consultation_payment_id);
    const services=c.studio_case_services||[];
    const selectable=services.filter(s=>['recommended','quoted'].includes(s.status));
    if(consultationPay&&consultationPay.status!=='paid'){
      if(consultationPay.checkout_url)return `<div class="hse-next is-action"><span>01</span><div><b>${t('Complete the $75 consultation booking','أكمل حجز الاستشارة بقيمة 75 دولار')}</b><p>${t('Your case details are saved. This is the only action needed now.','بيانات حالتك محفوظة. ده الإجراء الوحيد المطلوب منك دلوقتي.')}</p></div><a href="${esc(consultationPay.checkout_url)}" target="_blank" rel="noopener">${t('PAY','ادفع')} ${money(consultationPay.amount,consultationPay.currency)} →</a></div>`;
      return `<div class="hse-next"><span>01</span><div><b>${t('Your secure payment link is being prepared','رابط الدفع الآمن يتم تجهيزه')}</b><p>${t('You do not need to do anything else or send your details again. The payment step will appear here when ready.','مش مطلوب منك أي إجراء أو إعادة إرسال البيانات. خطوة الدفع هتظهر هنا بمجرد تجهيزها.')}</p></div><button class="quiet-action" type="button" data-hse-refresh>${t('REFRESH','تحديث')}</button></div>`;
    }
    if(['consultation_booked','ready_for_consultation'].includes(c.status))return `<div class="hse-next"><span>02</span><div><b>${t('Your consultation is booked','تم حجز الاستشارة')}</b><p>${t('No action is required right now. Andrew will confirm the consultation timing and use the information already attached to this case.','لا يوجد إجراء مطلوب منك حاليًا. سيتم تأكيد موعد الاستشارة باستخدام بيانات الحالة المحفوظة بالفعل.')}</p></div><button class="quiet-action" type="button" disabled>${t('NO ACTION NEEDED','لا يوجد إجراء')}</button></div>`;
    if(c.status==='consultation_complete'&&!services.length)return `<div class="hse-next"><span>03</span><div><b>${t('Your recommendation is being prepared','جاري تجهيز التوصية')}</b><p>${t('You do not need to choose services yourself. Only relevant options will appear here.','مش مطلوب منك تختار خدمات بنفسك. هيظهر هنا فقط ما تم ترشيحه لحالتك.')}</p></div><button class="quiet-action" type="button" disabled>${t('NO ACTION NEEDED','لا يوجد إجراء')}</button></div>`;
    if(selectable.length)return recommendations(c,selectable);
    const pendingServicePays=servicePaymentIds(c).map(paymentFor).filter(p=>p&&p.status!=='paid');
    if(pendingServicePays.length){const p=pendingServicePays[0];return `<div class="hse-next ${p.checkout_url?'is-action':''}"><span>04</span><div><b>${t('Your selected services are ready for payment','الخدمات المختارة جاهزة للدفع')}</b><p>${t('Selected priced services are grouped into one payment whenever possible.','بنجمّع الخدمات المسعرة المختارة في دفعة واحدة كلما أمكن.')}</p></div>${p.checkout_url?`<a href="${esc(p.checkout_url)}" target="_blank" rel="noopener">${t('PAY','ادفع')} ${money(p.amount,p.currency)} →</a>`:`<button class="quiet-action" type="button" data-hse-refresh>${t('PAYMENT LINK PREPARING','جاري تجهيز رابط الدفع')}</button>`}</div>`}
    if(c.status==='active')return `<div class="hse-next"><span>✓</span><div><b>${t('Your case is moving forward','الحالة قيد التنفيذ')}</b><p>${t('Requested and paid services are tracked below. We will only ask for an action when something is genuinely needed from you.','الخدمات المطلوبة والمدفوعة متابَعة بالأسفل، ومش هنطلب منك إجراء إلا لما يكون مطلوب فعلًا.')}</p></div><button class="quiet-action" type="button" disabled>${t('NO ACTION NEEDED','لا يوجد إجراء')}</button></div>`;
    if(c.status==='closed')return `<div class="hse-next"><span>✓</span><div><b>${t('This consultation case is closed','تم إغلاق حالة الاستشارة')}</b><p>${t('Your case record and service history remain available here.','سجل الحالة والخدمات يظل متاحًا هنا للرجوع إليه.')}</p></div><button class="quiet-action" type="button" disabled>${t('COMPLETE','مكتمل')}</button></div>`;
    return `<div class="hse-next"><span>•</span><div><b>${t('No action required','لا يوجد إجراء مطلوب')}</b><p>${t('We will show the next required action here when it is ready.','هنعرض هنا الإجراء المطلوب بمجرد ما يكون جاهز.')}</p></div><button class="quiet-action" type="button" data-hse-refresh>${t('REFRESH','تحديث')}</button></div>`;
  }

  function recommendations(c,items){
    return `<div class="portal-card hse-recommendation-card"><p class="eyebrow">${t('RECOMMENDED FOR YOUR CASE','موصى به لحالتك')}</p><h3>${t('Choose only what you want us to handle.','اختار فقط اللي عايزنا ننفذه.')}</h3><p>${t('Nothing is added automatically. Select only the services you want, then continue once.','مفيش خدمة بتتضاف تلقائيًا. اختار اللي محتاجه فقط وبعدها كمل مرة واحدة.')}</p><div class="hse-service-choice">${items.map(s=>{const quoted=s.quoted_price!=null;const mode=s.studio_service_catalog?.pricing_mode;const start=s.studio_service_catalog?.display_price_usd||0;const price=quoted?money(s.quoted_price,s.currency||'USD'):(mode==='quote'?t('REQUEST EXACT QUOTE','اطلب سعرًا محددًا'):`${t('REQUEST QUOTE · FROM','اطلب تسعير · يبدأ من')} ${money(start)}`);const reason=s.recommendation_reason||t('Recommended after consultation','موصى بها بعد الاستشارة');return `<label><input type="checkbox" value="${s.id}" data-hse-service-choice /><div><b>${esc(serviceName(s))}</b><small>${esc(reason)}${quoted?` · ${t('Exact price ready','السعر المحدد جاهز')}`:` · ${t('Selecting this requests the exact scope and price only','اختيارها يطلب تحديد النطاق والسعر فقط')}`}</small></div><strong>${esc(price)}</strong></label>`}).join('')}</div><p class="hse-service-note">${t('Exact-price items can move directly to payment. Quote-request items are not purchased until you see and accept the exact price.','الخدمات ذات السعر المحدد تقدر تنتقل للدفع مباشرة. أما طلبات التسعير فلا تعتبر شراءً قبل ما تشوف السعر النهائي وتوافق عليه.')}</p><div class="hse-selected-action"><p>${t('You can leave any item unchecked and decide later.','تقدر تسيب أي خدمة بدون اختيار وتقرر بعدين.')}</p><button type="button" data-hse-continue="${c.id}">${t('CONTINUE WITH SELECTED SERVICES →','كمل بالخدمات المختارة ←')}</button></div></div>`}

  function serviceHistory(c){const items=c.studio_case_services||[];if(!items.length)return '';const visible=items.filter(s=>!['recommended','quoted'].includes(s.status));if(!visible.length)return '';return `<div class="hse-payment-group">${visible.map(s=>`<div class="hse-service-state"><b>${esc(serviceName(s))}</b><span>${esc(statusLabel(s.status))}${s.quoted_price!=null?` · ${money(s.quoted_price,s.currency||'USD')}`:''}</span></div>`).join('')}</div>`}

  function caseCard(c){const opened=c.booked_at||c.created_at;return `<article class="hse-case hse-current-case"><div class="hse-current-label">${t('CURRENT HSE CASE','حالة HSE الحالية')}${needsClientAction(c)?` · ${t('ACTION NEEDED','إجراء مطلوب')}`:''}</div><div class="hse-case-top"><div><span class="hse-case-code">${esc(c.case_code||'CASE')}</span><h3>${esc(hazardName(c))}</h3><p class="meta">${t('Opened','بدأت')} ${fmtDate(opened)}${c.jurisdiction?` · ${esc(c.jurisdiction)}`:''}</p></div><span class="hse-case-status">${esc(statusLabel(c.status))}</span></div>${nextAction(c)}${serviceHistory(c)}</article>`}

  function historyRow(c){const opened=c.booked_at||c.created_at;return `<button type="button" class="hse-history-row" data-hse-open-case="${c.id}"><span><b>${esc(hazardName(c))}</b><small>${esc(c.case_code||'CASE')} · ${fmtDate(opened)}</small></span><span class="hse-history-side"><em class="${needsClientAction(c)?'needs-action':''}">${needsClientAction(c)?t('ACTION NEEDED','إجراء مطلوب'):esc(statusLabel(c.status))}</em><strong>→</strong></span></button>`}

  function render(){
    const root=$('#hse-case-content');if(!root)return;
    const hasOpenCase=cases.some(c=>!['closed','cancelled'].includes(c.status));
    const primary=primaryCase();
    const others=primary?cases.filter(c=>c.id!==primary.id):[];
    const currentHtml=primary?caseCard(primary):'';
    const historyHtml=others.length?`<details class="hse-history"><summary>${t('OTHER HSE CASES','حالات HSE أخرى')} <span>${others.length}</span></summary><div>${others.map(historyRow).join('')}</div></details>`:'';
    const startHtml=(!cases.length||!hasOpenCase)?`<div class="hse-start-wrap">${startForm()}</div>`:'';
    const ruleHtml=primary
      ? `<div class="hse-rule"><b>${t('$75 = consultation only.','75 دولار = الاستشارة فقط.')}</b><br>${t('Reports, assessments, surveys, site visits and technical deliverables are separate and optional.','التقارير والتقييمات والقياسات وزيارات الموقع والمخرجات الفنية خدمات منفصلة واختيارية.')}</div>`
      : `<div class="hse-rule"><b>${t('GUIDED REVIEW FIRST','المراجعة الموجهة أولًا')}</b><br>${t('Consultation details appear only after the Professional Review Gate.','تفاصيل الاستشارة تظهر فقط بعد بوابة المراجعة المهنية.')}</div>`;
    root.innerHTML=`<div class="hse-workspace" dir="${ar()?'rtl':'ltr'}"><div class="hse-view-head"><div><p class="eyebrow">INVESTIGATOR'S EYE</p><h2>${cases.length?t('Your HSE Workspace','مساحة HSE الخاصة بك'):t('HSE Review','مراجعة HSE')}</h2><p>${t('One clear next action at a time. Everything else stays in the case record.','إجراء واحد واضح في كل مرحلة، وباقي التفاصيل تفضل محفوظة في سجل الحالة.')}</p></div>${ruleHtml}</div>${currentHtml}${historyHtml}${startHtml}</div>`;
  }

  async function startConsultation(){
    const selected=$('#hse-hazard')?.value||'';if(!selected)return toast(t('Choose the closest issue first','اختار أقرب مشكلة الأول'));
    const [code,name]=selected.split('|');const summary=$('#hse-summary')?.value.trim()||'';if(summary.length<10)return toast(t('Add a short description of what is happening','اكتب وصفًا مختصرًا للي بيحصل'));
    const button=$('#hse-start-button');if(button){button.disabled=true;button.textContent=t('CREATING CASE…','جاري فتح الحالة…')}
    const {data,error}=await sb.rpc('studio_start_client_consultation',{p_hazard_code:code,p_hazard_name:name,p_summary:summary,p_jurisdiction:$('#hse-jurisdiction')?.value.trim()||null});
    if(error){toast(error.message);if(button){button.disabled=false;button.textContent=t('START MY CONSULTATION →','ابدأ طلب الاستشارة ←')}return}
    selectedCaseId=data?.case_id||null;
    toast(`${data?.case_code||t('Consultation case','حالة الاستشارة')} ${t('created · your details are saved','تم فتحها · بياناتك محفوظة')}`);await loadHse();
  }

  async function continueServices(caseId){
    const ids=$$('[data-hse-service-choice]:checked').map(x=>x.value);if(!ids.length)return toast(t('Select at least one service, or leave everything unchanged for now','اختار خدمة واحدة على الأقل، أو سيب الاختيارات كما هي دلوقتي'));
    const button=$(`[data-hse-continue="${caseId}"]`);if(button){button.disabled=true;button.textContent=t('PROCESSING…','جاري الحفظ…')}
    const {data,error}=await sb.rpc('studio_client_choose_case_services',{p_case_id:caseId,p_service_ids:ids});
    if(error){toast(error.message);if(button){button.disabled=false;button.textContent=t('CONTINUE WITH SELECTED SERVICES →','كمل بالخدمات المختارة ←')}return}
    const parts=[];if(data?.accepted)parts.push(`${data.accepted} ${t('accepted','تم قبولها')}`);if(data?.requested)parts.push(`${data.requested} ${t('quote requested','تم طلب تسعيرها')}`);toast(parts.join(' · ')||t('Selection saved','تم حفظ الاختيار'));await loadHse();
  }

  document.addEventListener('submit',e=>{if(e.target?.id==='hse-start-form'){e.preventDefault();startConsultation()}});
  document.addEventListener('click',e=>{
    const openCase=e.target.closest('[data-hse-open-case]');if(openCase){e.preventDefault();selectedCaseId=openCase.dataset.hseOpenCase;render();setTimeout(()=>$('.hse-current-case')?.scrollIntoView({behavior:'smooth',block:'start'}),0);return}
    const c=e.target.closest('[data-hse-continue]');if(c){e.preventDefault();continueServices(c.dataset.hseContinue);return}
    if(e.target.closest('[data-hse-refresh]')){e.preventDefault();loadHse();return}
    const nav=e.target.closest('[data-portal-nav="hse"]');if(nav)setTimeout(()=>loadHse(),0);
  });
  window.addEventListener('hashchange',()=>{if(location.hash==='#hse')loadHse()});
  window.addEventListener('storage',e=>{if([LANG_KEY,PORTFOLIO_LANG_KEY].includes(e.key)){render()}});
  sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(loadHse,50)});
  setTimeout(loadHse,500);
})();
