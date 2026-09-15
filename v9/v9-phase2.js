(() => {
  const menu=document.getElementById('menu-toggle');
  const nav=document.getElementById('main-nav');

  if(menu&&nav){
    const close=()=>{
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','Open navigation');
    };
    const open=()=>{
      nav.classList.add('open');
      document.body.classList.add('nav-open');
      menu.setAttribute('aria-expanded','true');
      menu.setAttribute('aria-label','Close navigation');
    };

    menu.addEventListener('click',()=>nav.classList.contains('open')?close():open());
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    window.addEventListener('resize',()=>{if(window.innerWidth>1180)close()},{passive:true});
  }

  // Phase 5: load the problem-first brief visual layer without changing the locked base system.
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
      scope:{eyebrow:'04 · SCOPE & TIMING',title:'What constraints should shape the work?',guide:'Timing, budget and current stage help define a practical path — not a generic package.'},
      contact:{eyebrow:'05 · CONTACT',title:'Who should we reply to?',guide:'Add your name and at least one contact method so the studio can respond to the brief.'},
      copy:'COPY BRIEF',send:'SEND PROJECT BRIEF →',validation:'Add your name and at least one contact method (email or phone) before sending.'
    },
    ar:{
      progress:{goal:'التحدي',type:'نقطة البداية',team:'الخبرات',scope:'النطاق',contact:'التواصل'},
      goal:{eyebrow:'01 · التحدي والنتيجة',title:'ما المشكلة التي نريد حلها — وما الذي يجب أن يتغير؟',guide:'ابدأ بوصف التحدي الحالي، ثم وضّح من يتأثر به وما شكل النتيجة الأفضل.',labels:['التحدي / المشكلة','من الأكثر تأثرًا؟','كيف تبدو النتيجة الأفضل؟'],placeholder:'ما الذي يحدث الآن؟ لماذا يمثل مشكلة؟ وما الذي تريد تحسينه أو تغييره؟'},
      type:{eyebrow:'02 · نقطة البداية',title:'أي مجال يبدو الأقرب للتحدي؟',guide:'ده لا يحدد الحل مسبقًا؛ هو فقط نقطة بداية تساعد الاستوديو على فهم الاتجاه.'},
      team:{eyebrow:'03 · الخبرات المحتملة',title:'ما الخبرات التي قد تساعد في حل المشكلة؟',guide:'اختر ما يبدو مناسبًا الآن. التشكيل النهائي يتحدد بعد فهم المشكلة بشكل كامل.'},
      scope:{eyebrow:'04 · النطاق والتوقيت',title:'ما القيود التي يجب أن نضعها في الاعتبار؟',guide:'التوقيت والميزانية ومرحلة المشروع تساعدنا على بناء مسار عملي، وليس باقة جاهزة.'},
      contact:{eyebrow:'05 · التواصل',title:'مع من نتواصل؟',guide:'أضف اسمك وطريقة تواصل واحدة على الأقل حتى نقدر نرد على البريف.'},
      copy:'نسخ البريف',send:'إرسال بريف المشروع ←',validation:'أضف الاسم وطريقة تواصل واحدة على الأقل (البريد أو الهاتف) قبل الإرسال.'
    }
  };

  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
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

  function applyBriefCopy(){
    const l=lang(),t=copy[l];
    const steps=[...document.querySelectorAll('#brief-steps .brief-step[data-key]')];
    const progress=[...document.querySelectorAll('#brief-progress button')];

    steps.forEach((step,i)=>{
      const key=step.dataset.key;
      if(progress[i]&&t.progress[key]){
        const n=progress[i].querySelector('b')?.textContent||String(i+1).padStart(2,'0');
        const currentLabel=progress[i].textContent.replace(n,'').trim();
        if(currentLabel!==t.progress[key])progress[i].innerHTML=`<b>${n}</b>${t.progress[key]}`;
      }

      const item=t[key];
      if(!item)return;
      setText(step.querySelector('.eyebrow'),item.eyebrow);
      setText(step.querySelector('h3'),item.title);
      ensureGuide(step,item.guide);

      if(key==='goal'){
        const labels=[...step.querySelectorAll('.field label')];
        item.labels.forEach((label,idx)=>setText(labels[idx],label));
        const textarea=step.querySelector('textarea[data-bind="goal"]');
        if(textarea)textarea.placeholder=item.placeholder;
      }
    });

    setText(document.getElementById('copy-brief'),t.copy);
    setText(document.getElementById('send-brief'),t.send);
  }

  let scheduled=false;
  const scheduleApply=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;applyBriefCopy()});
  };

  const host=document.getElementById('brief-steps');
  if(host)new MutationObserver(scheduleApply).observe(host,{childList:true,subtree:true});
  const progressHost=document.getElementById('brief-progress');
  if(progressHost)new MutationObserver(scheduleApply).observe(progressHost,{childList:true,subtree:true});

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