(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  let lang = 'en';
  let lastResult = null;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  const hazardLabels={
    '':{en:'Choose the closest match',ar:'اختار أقرب نوع للمشكلة'},
    'NOI|Noise Exposure':{en:'Noise Exposure',ar:'التعرض للضوضاء'},
    'HEAT|Heat Stress':{en:'Heat Stress',ar:'الإجهاد الحراري'},
    'LIGHT|Lighting':{en:'Lighting',ar:'الإضاءة'},
    'VIB|Vibration':{en:'Vibration',ar:'الاهتزازات'},
    'RAD|Radiation':{en:'Radiation',ar:'الإشعاع'},
    'PRESS|Pressure Systems':{en:'Pressure Systems',ar:'أنظمة الضغط'},
    'CHEM|Chemical Exposure':{en:'Chemical Exposure',ar:'التعرض للمواد الكيميائية'},
    'ELEC|Electrical Safety':{en:'Electrical Safety',ar:'السلامة الكهربائية'},
    'MACH|Machinery Safety':{en:'Machinery Safety',ar:'سلامة الآلات'},
    'WAH|Work at Height':{en:'Work at Height',ar:'العمل على ارتفاع'},
    'FIRE|Fire Safety':{en:'Fire Safety',ar:'السلامة من الحريق'},
    'GEN|General HSE / Not Sure':{en:'General HSE / Not Sure',ar:'HSE عام / غير متأكد'}
  };

  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function persistLanguage(){
    try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}
  }

  function localizeProcess(){
    const cards=$$('.process article');
    const copy=lang==='ar'?[ 
      ['01','احكِ لنا الحالة','وصف بسيط للمشكلة كفاية. مش محتاج تختار تقرير أو خدمة من الأول.'],
      ['02','احجز الاستشارة بـ 75 دولار','بعد فتح الحالة، تكمل خطوة دفع واحدة فقط لما رابط الحجز يكون جاهز.'],
      ['03','استلم التوصية المهنية','بعد الاستشارة نوضح الفجوات والخطوة المناسبة، وأي خدمة إضافية تتسعر منفصلة فقط لو احتجتها.']
    ]:[
      ['01','DESCRIBE THE CASE','A simple description is enough. You do not need to choose a report or service first.'],
      ['02','BOOK THE $75 CONSULTATION','After the case is opened, complete one payment step when the booking link is ready.'],
      ['03','GET THE PROFESSIONAL RECOMMENDATION','After the consultation, you get the recommended next step. Any extra service is quoted separately only if needed.']
    ];
    cards.forEach((card,i)=>{
      if(i>=3){card.hidden=true;return}
      card.hidden=false;
      const c=copy[i];
      card.querySelector('span').textContent=c[0];
      card.querySelector('b').textContent=c[1];
      card.querySelector('p').textContent=c[2];
    });
  }

  function localizeHazards(){
    const select=$('#hazard');if(!select)return;
    [...select.options].forEach(option=>{
      const item=hazardLabels[option.value];
      if(item)option.textContent=item[lang];
    });
  }

  function renderSuccess(){
    if(!lastResult)return;
    const data=lastResult;
    const caseCode = data?.case_code || data?.lead_code || '';
    const fee = Number(data?.consultation_fee_usd || 75).toFixed(0);
    $('#success-copy').textContent = lang === 'ar'
      ? `تم فتح حالتك ${caseCode}. بيانات المشكلة محفوظة بالفعل، ومش هتحتاج تكتبها مرة تانية.`
      : `Your case ${caseCode} is open. Your problem details are already saved, so you will not need to enter them again.`;

    const nextBox = $('#success-state .next-box');
    if (data?.checkout_url) {
      nextBox.innerHTML = lang === 'ar'
        ? `<b>الخطوة المطلوبة الآن</b><p>إتمام حجز الاستشارة بقيمة $${fee}. لا توجد أي خدمات إضافية مضافة.</p><a class="home-link" href="${data.checkout_url}" target="_blank" rel="noopener">ادفع $${fee} واحجز الاستشارة ←</a>`
        : `<b>YOUR NEXT STEP</b><p>Complete the $${fee} consultation booking. No additional service has been added.</p><a class="home-link" href="${data.checkout_url}" target="_blank" rel="noopener">PAY $${fee} & BOOK CONSULTATION →</a>`;
    } else {
      nextBox.innerHTML = lang === 'ar'
        ? `<b>الحالة اتفتحت بنجاح</b><p>رابط دفع الاستشارة بقيمة $${fee} لسه قيد التجهيز. مش مطلوب منك أي إجراء إضافي حاليًا؛ الاستوديو هيشارك معاك خطوة الدفع على وسيلة التواصل المسجلة.</p>`
        : `<b>YOUR CASE IS OPEN</b><p>The $${fee} consultation payment link is still being prepared. Nothing else is required from you right now; the studio will share the payment step using the contact details you submitted.</p>`;
    }
    let portal=$('#success-state [data-client-portal-link]');
    if (!portal) {
      portal = document.createElement('a');
      portal.href = '/client-v9/#hse';
      portal.className = 'home-link';
      portal.dataset.clientPortalLink = '1';
      $('#success-state').appendChild(portal);
    }
    portal.textContent = lang === 'ar' ? 'متابعة الحالة من بوابة العميل' : 'TRACK CASE IN CLIENT PORTAL';
  }

  function applyLang(next,save=true) {
    lang = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.body.dataset.lang = next;
    $$('[data-en]').forEach(el => { const value = el.dataset[next]; if (value !== undefined) el.textContent = value; });
    $$('[data-en-html]').forEach(el => { const value = el.dataset[`${next}Html`]; if (value !== undefined) el.innerHTML = value; });
    $$('[data-en-placeholder]').forEach(el => { const value = el.dataset[`${next}Placeholder`]; if (value !== undefined) el.placeholder = value; });
    $('#lang-toggle').textContent = next === 'en' ? 'EN | عربي' : 'English | AR';
    $('.client-link').textContent=next==='ar'?'عميل حالي ←':'EXISTING CLIENT →';
    $('.brand small').textContent=next==='ar'?'استشارة HSE احترافية':'PROFESSIONAL HSE CONSULTATION';
    localizeHazards();
    localizeProcess();
    renderSuccess();
    if(save)persistLanguage();
  }

  $('#lang-toggle')?.addEventListener('click', () => applyLang(lang === 'en' ? 'ar' : 'en'));

  $('#consultation-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = $('#hazard').value;
    if (!selected) return toast(lang === 'ar' ? 'اختار نوع المشكلة أولًا' : 'Choose the issue first');
    const [hazardCode, hazardName] = selected.split('|');
    const payload = {
      p_full_name: $('#full-name').value.trim(),
      p_email: $('#email').value.trim().toLowerCase(),
      p_phone: $('#phone').value.trim() || null,
      p_company_name: $('#company').value.trim() || null,
      p_hazard_code: hazardCode,
      p_hazard_name: hazardName,
      p_summary: $('#summary').value.trim(),
      p_jurisdiction: $('#jurisdiction').value.trim() || null
    };
    if (payload.p_full_name.length < 2 || !payload.p_email.includes('@') || payload.p_summary.length < 10) return toast(lang === 'ar' ? 'راجع الاسم والبريد ووصف المشكلة' : 'Check your name, email and problem description');
    const button = $('#submit-consultation');
    button.disabled = true; button.textContent = lang === 'ar' ? 'جاري فتح الحالة…' : 'OPENING YOUR CASE…';
    const { data, error } = await sb.rpc('studio_submit_public_consultation_request', payload);
    if (error) {
      console.error(error); toast(lang === 'ar' ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'Could not submit the request. Please try again.');
      button.disabled = false; button.textContent = lang === 'ar' ? 'ابدأ طلب الاستشارة ←' : 'START MY CONSULTATION →';
      return;
    }
    lastResult=data||{};
    try{sessionStorage.removeItem('ats_hse_guided_review_handoff_v1')}catch(_e){}
    $('#consultation-form').classList.add('hidden');
    $('#success-state').classList.remove('hidden');
    renderSuccess();
    $('#success-state').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function prefillFromGuidedReview(){
    const params=new URLSearchParams(location.search);
    if(params.get('source')!=='guided-review')return;
    let handoff={};
    try{handoff=JSON.parse(sessionStorage.getItem('ats_hse_guided_review_handoff_v1')||'{}')||{}}catch(_e){}
    const hazard=handoff.hazard||params.get('hazard')||'';
    const summary=handoff.summary||params.get('summary')||'';
    const jurisdiction=handoff.jurisdiction||params.get('jurisdiction')||'';
    if(hazard&&$('#hazard'))$('#hazard').value=hazard;
    if(summary&&$('#summary'))$('#summary').value=summary;
    if(jurisdiction&&$('#jurisdiction'))$('#jurisdiction').value=jurisdiction;
    const head=$('.booking-head');
    if(head&&!document.querySelector('.guided-review-prefill')){
      const note=document.createElement('div');
      note.className='guided-review-prefill';
      note.innerHTML='<b data-en="GUIDED REVIEW ATTACHED" data-ar="تم إرفاق المراجعة الموجهة">GUIDED REVIEW ATTACHED</b><p data-en="Your issue, jurisdiction and Gap Map snapshot were carried forward. Add your contact details and review the information before sending." data-ar="تم نقل نوع المشكلة وجهة التطبيق وملخص خريطة الفجوات تلقائيًا. أضف بيانات التواصل وراجع المعلومات قبل الإرسال.">Your issue, jurisdiction and Gap Map snapshot were carried forward. Add your contact details and review the information before sending.</p>';
      note.style.cssText='grid-column:1/-1;margin-top:14px;padding:14px 16px;border:1px solid rgba(85,214,255,.3);background:rgba(85,214,255,.06);border-radius:14px;color:#dceaf0;font-size:12px;line-height:1.6';
      head.appendChild(note);
    }
  }

  let saved='en';
  try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  prefillFromGuidedReview();
  applyLang(saved==='ar'?'ar':'en',false);
})();
