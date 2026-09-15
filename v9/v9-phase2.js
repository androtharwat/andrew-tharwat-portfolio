(() => {
  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const menu=document.getElementById('menu-toggle');
  const nav=document.getElementById('main-nav');

  if(menu&&nav){
    const close=()=>{
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label',lang()==='ar'?'فتح القائمة':'Open navigation');
    };
    const open=()=>{
      nav.classList.add('open');
      document.body.classList.add('nav-open');
      menu.setAttribute('aria-expanded','true');
      menu.setAttribute('aria-label',lang()==='ar'?'إغلاق القائمة':'Close navigation');
    };

    menu.addEventListener('click',()=>nav.classList.contains('open')?close():open());
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    window.addEventListener('resize',()=>{if(window.innerWidth>1180)close()},{passive:true});
  }

  if(!document.querySelector('link[href*="v9-phase5.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v9/v9-phase5.css?v=1';
    document.head.appendChild(link);
  }

  const copy={
    en:{
      progress:{goal:'CHALLENGE',type:'STARTING POINT',team:'EXPERTISE',scope:'SCOPE',contact:'CONTACT'},
      goal:{eyebrow:'01 · CHALLENGE & OUTCOME',title:'What problem are we solving — and what should change?',guide:'Describe the current challenge first. Then define who it affects and what a better outcome should look like.',labels:['THE CHALLENGE / PROBLEM','WHO IS MOST AFFECTED?','A BETTER OUTCOME LOOKS LIKE'],placeholder:'What is happening now? Why does it matter? What would you like to improve or change?'},
      type:{eyebrow:'02 · STARTING POINT',title:'Which area feels closest to the challenge?',guide:'This does not lock the solution. It only gives the studio a useful starting point for the conversation.'},
      team:{eyebrow:'03 · POSSIBLE EXPERTISE',title:'Which expertise could help solve it?',guide:'Select what seems relevant. The final mix is shaped after the problem is understood.'},
      scope:{eyebrow:'04 · SCOPE & TIMING',title:'What constraints should shape the work?',guide:'Timing, budget and current stage help define a practical path — not a generic package.',labels:['BUDGET RANGE','CURRENT STAGE']},
      contact:{eyebrow:'05 · CONTACT',title:'Who should we reply to?',guide:'Add your name and at least one contact method so the studio can respond to the brief.',labels:['NAME','EMAIL','PHONE / WHATSAPP','COMPANY / ORGANIZATION']},
      back:'← BACK',copy:'COPY BRIEF',send:'SEND PROJECT BRIEF →',validation:'Add your name and at least one contact method (email or phone) before sending.',summary:['PROJECT TYPE','CHALLENGE','EXPERTISE','TIMELINE','CONTACT']
    },
    ar:{
      progress:{goal:'التحدي',type:'نقطة البداية',team:'الخبرات',scope:'النطاق',contact:'التواصل'},
      goal:{eyebrow:'01 · التحدي والنتيجة',title:'ما المشكلة التي نريد حلها — وما الذي يجب أن يتغير؟',guide:'ابدأ بوصف التحدي الحالي، ثم وضّح من يتأثر به وما شكل النتيجة الأفضل.',labels:['التحدي / المشكلة','من الأكثر تأثرًا؟','كيف تبدو النتيجة الأفضل؟'],placeholder:'ما الذي يحدث الآن؟ لماذا يمثل مشكلة؟ وما الذي تريد تحسينه أو تغييره؟'},
      type:{eyebrow:'02 · نقطة البداية',title:'أي مجال يبدو الأقرب للتحدي؟',guide:'ده لا يحدد الحل مسبقًا؛ هو فقط نقطة بداية تساعد الاستوديو على فهم الاتجاه.'},
      team:{eyebrow:'03 · الخبرات المحتملة',title:'ما الخبرات التي قد تساعد في حل المشكلة؟',guide:'اختر ما يبدو مناسبًا الآن. التشكيل النهائي يتحدد بعد فهم المشكلة بشكل كامل.'},
      scope:{eyebrow:'04 · النطاق والتوقيت',title:'ما القيود التي يجب أن نضعها في الاعتبار؟',guide:'التوقيت والميزانية ومرحلة المشروع تساعدنا على بناء مسار عملي، وليس باقة جاهزة.',labels:['نطاق الميزانية','المرحلة الحالية']},
      contact:{eyebrow:'05 · التواصل',title:'مع من نتواصل؟',guide:'أضف اسمك وطريقة تواصل واحدة على الأقل حتى نقدر نرد على البريف.',labels:['الاسم','البريد الإلكتروني','الهاتف / واتساب','الشركة / الجهة']},
      back:'السابق →',copy:'نسخ البريف',send:'إرسال بريف المشروع ←',validation:'أضف الاسم وطريقة تواصل واحدة على الأقل (البريد أو الهاتف) قبل الإرسال.',summary:['نقطة البداية','التحدي','الخبرات','التوقيت','التواصل']
    }
  };

  const expertise={
    hse:{enName:'HSE & TECHNICAL',arName:'HSE والتخصصات الفنية',en:'Safety, risk, field expertise and technical review.',ar:'السلامة والمخاطر والخبرة الميدانية والمراجعة الفنية.'},
    software:{enName:'SOFTWARE & AUTOMATION',arName:'البرمجيات والأتمتة',en:'Systems, tools, workflows, integrations and automation.',ar:'الأنظمة والأدوات ومسارات العمل والتكامل والأتمتة.'},
    design:{enName:'DESIGN & VISUAL',arName:'التصميم والاتصال البصري',en:'Identity, interfaces, communication and visual direction.',ar:'الهوية والواجهات والتواصل والتوجيه البصري.'},
    video:{enName:'VIDEO & MOTION',arName:'الفيديو والموشن',en:'Production, editing, motion systems and cinematic output.',ar:'الإنتاج والمونتاج والموشن والمخرجات السينمائية.'},
    content:{enName:'CONTENT & STORYTELLING',arName:'المحتوى والسرد',en:'Scripts, learning structure, narrative and communication.',ar:'السيناريو وبناء المحتوى والسرد والتواصل.'},
    ai:{enName:'AI PRODUCTION',arName:'إنتاج بالذكاء الاصطناعي',en:'AI visuals, intelligent workflows and production acceleration.',ar:'المرئيات بالذكاء الاصطناعي ومسارات العمل الذكية وتسريع الإنتاج.'}
  };

  const typeChoices={
    'Safety & HSE':{enTitle:'HSE / Safety Project',arTitle:'مشروع سلامة وHSE',en:'Awareness, systems, risk communication or training.',ar:'توعية أو أنظمة أو تواصل مخاطر أو تدريب.'},
    'Digital Solution':{enTitle:'Digital Solution',arTitle:'حل رقمي',en:'Website, application, tool, workflow or automation.',ar:'موقع أو تطبيق أو أداة أو مسار عمل أو أتمتة.'},
    'Creative & Brand':{enTitle:'Creative / Brand',arTitle:'إبداع / هوية',en:'Identity, campaign, visual system or communication.',ar:'هوية أو حملة أو نظام بصري أو تواصل.'},
    'AI & Storytelling':{enTitle:'AI / Storytelling',arTitle:'ذكاء اصطناعي / سرد',en:'AI video, visual stories or personalized experiences.',ar:'فيديو بالذكاء الاصطناعي أو قصص بصرية أو تجارب مخصصة.'}
  };

  const timeline={
    'Urgent / <2 weeks':'عاجل / أقل من أسبوعين',
    '2–6 weeks':'من أسبوعين إلى 6 أسابيع',
    '6+ weeks / Flexible':'6 أسابيع أو أكثر / مرن'
  };
  const budget={
    'Not specified':'غير محدد',
    'Small / pilot':'صغير / تجربة أولية',
    'Medium project':'مشروع متوسط',
    'Large / multi-phase':'كبير / متعدد المراحل',
    'Need guidance':'أحتاج توجيهًا'
  };
  const stage={
    'Idea only':'فكرة فقط',
    'Have references / assets':'لدي مراجع / ملفات',
    'Already in development':'قيد التطوير بالفعل',
    'Existing system needs improvement':'نظام قائم يحتاج تطويرًا'
  };

  const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text};

  function ensureGuide(step,text){
    if(!step)return;
    let guide=step.querySelector('.phase5-guidance');
    if(!guide){
      guide=document.createElement('p');
      guide.className='phase5-guidance';
      const h=step.querySelector('h3');
      if(h)h.insertAdjacentElement('afterend',guide);
      else step.prepend(guide);
    }
    setText(guide,text);
  }

  function localizeOptions(select,map,l){
    if(!select)return;
    [...select.options].forEach(option=>{
      const base=option.dataset.baseValue||option.value||option.textContent;
      option.dataset.baseValue=base;
      option.value=base;
      setText(option,l==='ar'?(map[base]||base):base);
    });
  }

  function localizeExpertiseName(value,l){
    for(const item of Object.values(expertise)){
      if(value===item.enName||value===item.arName)return l==='ar'?item.arName:item.enName;
    }
    return value;
  }

  function applyBriefCopy(){
    const l=lang(),t=copy[l];
    const steps=[...document.querySelectorAll('#brief-steps .brief-step[data-key]')];
    const progress=[...document.querySelectorAll('#brief-progress button')];

    steps.forEach((stepEl,i)=>{
      const key=stepEl.dataset.key;
      if(progress[i]&&t.progress[key]){
        const n=progress[i].querySelector('b')?.textContent||String(i+1).padStart(2,'0');
        const currentLabel=progress[i].textContent.replace(n,'').trim();
        if(currentLabel!==t.progress[key])progress[i].innerHTML=`<b>${n}</b>${t.progress[key]}`;
      }

      const item=t[key];
      if(!item)return;
      setText(stepEl.querySelector('.eyebrow'),item.eyebrow);
      setText(stepEl.querySelector('h3'),item.title);
      ensureGuide(stepEl,item.guide);

      if(key==='goal'){
        const labels=[...stepEl.querySelectorAll('.field label')];
        item.labels.forEach((label,idx)=>setText(labels[idx],label));
        const textarea=stepEl.querySelector('textarea[data-bind="goal"]');
        if(textarea)textarea.placeholder=item.placeholder;
      }

      if(key==='type'){
        stepEl.querySelectorAll('.brief-choice[data-type]').forEach(choice=>{
          const data=typeChoices[choice.dataset.type];
          if(!data)return;
          setText(choice.querySelector('b'),l==='ar'?data.arTitle:data.enTitle);
          setText(choice.querySelector('span'),data[l]);
        });
      }

      if(key==='team'){
        stepEl.querySelectorAll('.brief-discipline[data-disc]').forEach(choice=>{
          const match=Object.values(expertise).find(x=>x.enName===choice.dataset.disc);
          if(!match)return;
          setText(choice.querySelector('b'),l==='ar'?match.arName:match.enName);
          setText(choice.querySelector('span'),match[l]);
        });
      }

      if(key==='scope'){
        const labels=[...stepEl.querySelectorAll('.field label')];
        item.labels.forEach((label,idx)=>setText(labels[idx],label));
        stepEl.querySelectorAll('.timeline-choice[data-time]').forEach(choice=>setText(choice,l==='ar'?(timeline[choice.dataset.time]||choice.dataset.time):choice.dataset.time));
        localizeOptions(stepEl.querySelector('select[data-bind="budget"]'),budget,l);
        localizeOptions(stepEl.querySelector('select[data-bind="stage"]'),stage,l);
      }

      if(key==='contact'){
        const labels=[...stepEl.querySelectorAll('.field label')];
        item.labels.forEach((label,idx)=>setText(labels[idx],label));
      }
    });

    setText(document.getElementById('brief-back'),t.back);
    setText(document.getElementById('copy-brief'),t.copy);
    setText(document.getElementById('send-brief'),t.send);
  }

  function applyRoles(){
    const l=lang();
    document.querySelectorAll('.role-card[data-role]').forEach(card=>{
      const item=expertise[card.dataset.role];
      if(!item)return;
      setText(card.querySelector('h4'),l==='ar'?item.arName:item.enName);
      setText(card.querySelector('p'),item[l]);
    });

    document.querySelectorAll('#team-selection span').forEach(span=>{
      const raw=span.textContent.trim();
      if(raw==='Select the expertise the project needs.'||raw==='اختر الخبرات المناسبة من الأعلى.'){
        setText(span,l==='ar'?'اختر مجالات الخبرة المناسبة من الأعلى.':'Select the expertise the project needs.');
        return;
      }
      setText(span,localizeExpertiseName(raw,l));
    });
  }

  function applyWorkLocale(){
    if(lang()!=='ar')return;
    const featured=document.querySelector('#featured-project .featured-copy small');
    if(featured&&featured.textContent.startsWith('FEATURED CASE STUDY')){
      const parts=featured.textContent.split('·');
      setText(featured,`دراسة حالة مميزة${parts[1]?` · ${parts.slice(1).join('·').trim()}`:''}`);
    }
  }

  function applySummaryLocale(){
    const l=lang(),labels=copy[l].summary;
    const rows=[...document.querySelectorAll('#brief-summary .summary-row')];
    rows.forEach((row,i)=>setText(row.querySelector('small'),labels[i]||row.querySelector('small')?.textContent||''));
    if(l!=='ar')return;

    const typeValue=rows[0]?.querySelector('b');
    if(typeValue&&typeChoices[typeValue.textContent.trim()])setText(typeValue,typeChoices[typeValue.textContent.trim()].arTitle);

    const expertiseValue=rows[2]?.querySelector('span');
    if(expertiseValue&&expertiseValue.textContent.trim()!=='—'){
      const values=expertiseValue.textContent.split('·').map(x=>localizeExpertiseName(x.trim(),'ar'));
      setText(expertiseValue,values.join(' · '));
    }

    const timelineValue=rows[3]?.querySelector('b');
    if(timelineValue&&timeline[timelineValue.textContent.trim()])setText(timelineValue,timeline[timelineValue.textContent.trim()]);
  }

  function applyAccessibilityLocale(){
    const l=lang();
    const search=document.getElementById('project-search');
    if(search)search.setAttribute('aria-label',l==='ar'?'البحث في المشاريع':'Search projects');
    document.getElementById('main-nav')?.setAttribute('aria-label',l==='ar'?'التنقل الرئيسي':'Main navigation');
    document.getElementById('brief-progress')?.setAttribute('aria-label',l==='ar'?'تقدم بريف المشروع':'Project brief progress');
  }

  function applyDynamicLocale(){
    applyRoles();
    applyWorkLocale();
    applySummaryLocale();
    applyAccessibilityLocale();
  }

  let scheduled=false;
  const scheduleApply=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      applyBriefCopy();
      applyDynamicLocale();
    });
  };

  ['brief-steps','brief-progress','role-grid','team-selection','featured-project','brief-summary'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)new MutationObserver(scheduleApply).observe(el,{childList:true,subtree:true});
  });

  document.getElementById('lang-toggle')?.addEventListener('click',()=>setTimeout(scheduleApply,0));

  document.getElementById('brief-next')?.addEventListener('click',()=>{
    setTimeout(()=>{
      const btn=document.getElementById('brief-next');
      const isReview=(btn?.textContent||'').includes('REVIEW')||(btn?.textContent||'').includes('مراجعة');
      if(!isReview)return;
      const summary=document.querySelector('.brief-summary');
      if(summary){
        summary.classList.add('review-focus');
        summary.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>summary.classList.remove('review-focus'),2200);
      }
    },0);
  });

  const send=document.getElementById('send-brief');
  if(send){
    send.addEventListener('click',e=>{
      document.querySelector('.brief-validation')?.remove();
      const name=(document.querySelector('[data-bind="name"]')?.value||'').trim();
      const email=(document.querySelector('[data-bind="email"]')?.value||'').trim();
      const phone=(document.querySelector('[data-bind="phone"]')?.value||'').trim();
      if(name&&(email||phone))return;

      e.preventDefault();
      const note=document.createElement('div');
      note.className='brief-validation';
      note.setAttribute('role','status');
      note.setAttribute('aria-live','polite');
      note.textContent=copy[lang()].validation;
      send.insertAdjacentElement('afterend',note);
      document.querySelector('.brief-step[data-key="contact"]')?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  scheduleApply();
})();