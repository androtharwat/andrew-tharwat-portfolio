(()=>{
  const root=document.getElementById('project-root');if(!root)return;
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||document.documentElement.lang||'en';
  const clean=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
  const icons={
    challenge:'<svg viewBox="0 0 24 24"><path d="M12 3l9 17H3L12 3z"/><path d="M12 9v4M12 17h.01"/></svg>',
    think:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A7 7 0 1115.6 15c-.9.8-1.3 1.5-1.5 3h-4.2c-.2-1.4-.5-1.8-1.4-2.5z"/><path d="M12 6v3M7.5 8.5l2 1.5M16.5 8.5l-2 1.5"/></svg>',
    build:'<svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4"/></svg>',
    impact:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v5M21 12h-5M12 21v-5M3 12h5"/></svg>'
  };
  function upgrade(){
    const copy=document.querySelector('.project-copy'),grid=document.querySelector('.case-grid');
    if(!copy||!grid||document.querySelector('.identity-project-journey'))return false;
    const blocks=[...grid.querySelectorAll('.case-block')];if(blocks.length<3)return false;
    const ar=lang()==='ar';
    const overview=clean(copy.querySelector('p'))||clean(document.querySelector('.project-lead'));
    const challenge=clean(blocks[0].querySelector('p'));
    const solution=clean(blocks[1].querySelector('p'));
    const result=clean(blocks[2].querySelector('p'));
    const labels=ar?{
      kicker:'من الفكرة إلى التنفيذ',titleA:'من التحدي',titleB:'إلى أثر حقيقي',intro:'بدل عرض المشروع كمعلومات منفصلة، هذا هو مسار العمل الحقيقي: نفهم المشكلة، نفكر في الطريقة، نبني الحل، ثم نقيس القيمة التي صنعها.',
      s1:'افهم',h1:'التحدي الحقيقي',s2:'فكّر',h2:'السياق وطريقة التفكير',s3:'ابنِ',h3:'تحويل الفكرة إلى تنفيذ',s4:'الأثر',h4:'ما الذي تغيّر؟',signature:'PROBLEM SOLVING THROUGH CREATIVITY',brand:'ANDREW THARWAT · SAFETY × CREATIVITY × TECHNOLOGY'
    }:{
      kicker:'FROM IDEA TO EXECUTION',titleA:'FROM CHALLENGE',titleB:'TO REAL IMPACT.',intro:'Instead of treating a project as disconnected facts, this is the real working path: understand the problem, shape the thinking, build the solution, then measure the value it creates.',
      s1:'UNDERSTAND',h1:'THE REAL CHALLENGE',s2:'THINK',h2:'CONTEXT & THINKING',s3:'BUILD',h3:'TURNING THE IDEA REAL',s4:'IMPACT',h4:'WHAT CHANGED?',signature:'PROBLEM SOLVING THROUGH CREATIVITY',brand:'ANDREW THARWAT · SAFETY × CREATIVITY × TECHNOLOGY'
    };
    const section=document.createElement('section');section.className='identity-project-journey';section.dir=ar?'rtl':'ltr';section.setAttribute('data-i18n-skip','1');
    const step=(cls,small,title,text)=>`<article class="journey-step journey-${cls}"><div class="journey-step-top icon-only"><span class="journey-icon">${icons[cls]}</span></div><small>${small}</small><h3>${title}</h3><p>${text||'—'}</p><span class="journey-arrow">→</span></article>`;
    section.innerHTML=`<div class="journey-head"><div><span class="journey-kicker">${labels.kicker}</span><h2>${labels.titleA}<br><span>${labels.titleB}</span></h2></div><p>${labels.intro}</p></div><div class="journey-rail">${step('challenge',labels.s1,labels.h1,challenge)}${step('think',labels.s2,labels.h2,overview)}${step('build',labels.s3,labels.h3,solution)}${step('impact',labels.s4,labels.h4,result)}</div><div class="journey-signature"><strong>${labels.signature.replace('CREATIVITY','<b>CREATIVITY</b>')}</strong><span>${labels.brand}</span></div>`;
    copy.replaceWith(section);grid.remove();return true;
  }
  let raf=0;const schedule=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>upgrade())};
  schedule();new MutationObserver(schedule).observe(root,{childList:true,subtree:true});document.addEventListener('portfolio:languagechange',()=>setTimeout(schedule,30));
})();
