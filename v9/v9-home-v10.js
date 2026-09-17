(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ar=()=>document.body.dataset.lang==='ar';
  const set=(el,en,arText,html=false)=>{if(!el)return;if(html){el.dataset.enHtml=en;el.dataset.arHtml=arText;el.innerHTML=ar()?arText:en}else{el.dataset.en=en;el.dataset.ar=arText;el.textContent=ar()?arText:en}};

  function header(){
    document.body.classList.add('v10-home');
    const brandSmall=$('.brand small');
    set(brandSmall,'STUDIO · SAFETY · CREATIVE · DIGITAL','استوديو · سلامة · إبداع · حلول رقمية');
    const nav=$('#main-nav');
    if(!nav)return;
    const links=$$('a',nav);
    const map=[
      ['#home','Home','الرئيسية'],
      ['#capabilities','Services','الخدمات'],
      ['#work','Projects','المشاريع'],
      ['#studio','About','عن الاستوديو'],
      ['#contact','Contact','تواصل']
    ];
    links.forEach((a,i)=>{if(!map[i])return;a.href=map[i][0];set(a,map[i][1],map[i][2]);});
    if(!nav.querySelector('[data-v10-hse]')){
      const a=document.createElement('a');a.dataset.v10Hse='1';a.href='/hse-consultation/';a.textContent=ar()?'استشارة HSE':'HSE Consultation';
      const projects=nav.querySelector('a[href="#work"]');projects?.insertAdjacentElement('afterend',a);
    }else nav.querySelector('[data-v10-hse]').textContent=ar()?'استشارة HSE':'HSE Consultation';
    const cta=$('.header-cta');set(cta,'LET’S TALK →','ابدأ التواصل ←');if(cta)cta.href='#contact';
  }

  function hero(){
    const h=$('.hero');if(!h)return;
    set($('.hero .eyebrow'),'SAFETY · CREATIVE SOLUTIONS · REAL IMPACT','سلامة · حلول إبداعية · أثر حقيقي');
    set($('.hero h1'),'ENGINEERING<br><span>SAFER IDEAS</span><em>FOR A BRIGHTER TOMORROW</em>','نحوّل الأفكار إلى<br><span>حلول أكثر أمانًا</span><em>لمستقبل أفضل وأكثر تأثيرًا</em>',true);
    set($('#hero-subtitle'),'HSE expertise, digital systems, creative production and practical problem solving — brought together around real needs.','خبرة HSE، أنظمة رقمية، إنتاج إبداعي وحلول عملية للمشكلات — كلها بتجتمع حول الاحتياج الحقيقي.');
    const actions=$$('.hero-actions .btn');
    if(actions[0]){set(actions[0],'EXPLORE MY WORK →','استكشف أعمالي ←');actions[0].href='#work'}
    if(actions[1]){set(actions[1],'START A PROJECT','ابدأ مشروع');actions[1].href='#contact'}
    const visual=$('.hero-visual>img');if(visual){visual.src='/assets/extracted/hero-portrait3.webp';visual.loading='eager';visual.fetchPriority='high';visual.decoding='async'}
    const stamp=$('.hero-stamp');if(stamp){const b=$('b',stamp),s=$('small',stamp);set(b,'ANDREW THARWAT STUDIO','ANDREW THARWAT STUDIO');set(s,'HSE ENGINEER · CONTENT CREATOR · PROBLEM SOLVER','مهندس HSE · صانع محتوى · حل المشكلات')}
    injectServices(h);injectStats(h);
  }

  const services=[
    {code:'HSE',en:'HSE & Safety',ar:'السلامة وHSE',subEn:'Risk · Controls',subAr:'مخاطر · تحكم',descEn:'Risk assessment, practical controls, systems and professional HSE support.',descAr:'تقييم مخاطر، وسائل تحكم عملية، أنظمة ودعم مهني في HSE.',href:'/hse-consultation/'},
    {code:'TRN',en:'Training & Awareness',ar:'التدريب والتوعية',subEn:'People · Culture',subAr:'أفراد · ثقافة',descEn:'Awareness content and training built around real work situations and clear behavior.',descAr:'محتوى توعوي وتدريب مبني على مواقف عمل حقيقية وسلوك واضح.',href:'#work'},
    {code:'DES',en:'Graphic Design',ar:'التصميم الجرافيكي',subEn:'Brand · Visuals',subAr:'هوية · مرئيات',descEn:'Brand identity, visual communication, campaigns and presentation systems.',descAr:'هوية بصرية، تواصل مرئي، حملات وأنظمة عرض احترافية.',href:'#work'},
    {code:'VID',en:'Video Production',ar:'إنتاج الفيديو',subEn:'Story · Motion',subAr:'سرد · موشن',descEn:'Video, motion and AI-assisted visual storytelling for technical and creative ideas.',descAr:'فيديو وموشن وسرد بصري مدعوم بالذكاء الاصطناعي للأفكار الفنية والإبداعية.',href:'#work'},
    {code:'DEV',en:'Websites & Apps',ar:'المواقع والتطبيقات',subEn:'Web · Systems',subAr:'ويب · أنظمة',descEn:'Websites, apps, dashboards and workflows that turn manual work into usable systems.',descAr:'مواقع وتطبيقات ولوحات تحكم ومسارات عمل تحول الشغل اليدوي إلى أنظمة عملية.',href:'#work'},
    {code:'MGT',en:'Management Support',ar:'دعم الإدارة',subEn:'Structure · Action',subAr:'تنظيم · تنفيذ',descEn:'Structured support for documentation, follow-up, communication and practical decision workflows.',descAr:'دعم منظم للتوثيق والمتابعة والتواصل ومسارات اتخاذ القرار العملي.',href:'#contact'}
  ];
  function injectServices(hero){
    let rail=$('.v10-service-rail',hero);
    if(!rail){rail=document.createElement('div');rail.className='v10-service-rail';hero.appendChild(rail)}
    rail.innerHTML=services.map((s,i)=>`<a class="v10-service" href="${s.href}" data-v10-service="${i}"><span class="v10-service-icon">${s.code}</span><b>${ar()?s.ar:s.en}</b><small>${ar()?s.subAr:s.subEn}</small><p>${ar()?s.descAr:s.descEn}</p></a>`).join('');
    $$('.v10-service',rail).forEach(card=>card.addEventListener('click',e=>{if(window.matchMedia('(hover:none)').matches&&!card.classList.contains('is-open')){e.preventDefault();$$('.v10-service.is-open',rail).forEach(x=>x.classList.remove('is-open'));card.classList.add('is-open')}}));
  }
  function injectStats(hero){
    let bar=$('.v10-stat-rail',hero);if(!bar){bar=document.createElement('div');bar.className='v10-stat-rail';hero.appendChild(bar)}
    const d=ar()?[
      ['مشاريع حقيقية','أثر قابل للعرض'],['20M+','إنجاز موقع بدون LTI'],['خبرات متعددة','سلامة · رقمي · إبداع'],['حلول عملية','مبنية للاستخدام'],['لغتان','عربي · إنجليزي']
    ]:[
      ['REAL PROJECTS','VISIBLE IMPACT'],['20M+','SITE MILESTONE · NO LTI'],['MULTI-SECTOR','SAFETY · DIGITAL · CREATIVE'],['PRACTICAL SOLUTIONS','BUILT TO BE USED'],['BILINGUAL','ARABIC · ENGLISH']
    ];
    bar.innerHTML=`<div class="v10-stat-inner">${d.map(x=>`<div class="v10-stat"><b>${x[0]}</b><small>${x[1]}</small></div>`).join('')}</div>`;
  }

  function capabilities(){
    const h=$('#capabilities .section-head');if(h){set($('.eyebrow',h),'SERVICES','الخدمات');set($('h2',h),'WHAT WE DO.<br><span>ONLY WHAT ADDS VALUE.</span>','إيه اللي بننفذه.<br><span>فقط لما يضيف قيمة.</span>',true);set($('div>p',h),'Six practical directions. Hover over a card for the detail — start with the one closest to your need.','ستة اتجاهات عملية. قف على الكارت علشان تشوف التفاصيل — وابدأ بالأقرب لاحتياجك.');}
    const cards=$$('.discipline-grid article');
    const short=[
      ['SAFETY & HSE','السلامة وHSE'],['DIGITAL SYSTEMS','الأنظمة الرقمية'],['CREATIVE & BRAND','الإبداع والهوية'],['AI & STORYTELLING','الذكاء الاصطناعي والسرد']
    ];
    cards.forEach((c,i)=>{c.tabIndex=0;if(short[i])set($('h3',c),short[i][0],short[i][1]);c.addEventListener('click',e=>{if(window.matchMedia('(hover:none)').matches){if(e.target.closest('a,button'))return;c.classList.toggle('is-open')}})});
  }

  function work(){
    const h=$('#work .section-head');if(h){set($('.eyebrow',h),'FEATURED WORK','أعمال مختارة');set($('h2',h),'TURNING IDEAS INTO<br><span>REAL IMPACT.</span>','نحوّل الأفكار إلى<br><span>أثر حقيقي.</span>',true);set($('div>p',h),'Selected projects across HSE, digital products, personalized experiences and creative work.','مشاريع مختارة في HSE والحلول الرقمية والتجارب المخصصة والأعمال الإبداعية.');}
    const grid=$('#project-grid');if(grid&&!grid.dataset.v10Tap){grid.dataset.v10Tap='1';grid.addEventListener('click',e=>{const card=e.target.closest('.project-card');if(!card||!window.matchMedia('(hover:none)').matches)return;if(!card.classList.contains('is-open')){e.preventDefault();$$('.project-card.is-open',grid).forEach(x=>x.classList.remove('is-open'));card.classList.add('is-open')}})}
  }

  function about(){
    const x=$('.studio-intro-copy');if(x){set($('.eyebrow',x),'ABOUT THE STUDIO','عن الاستوديو');set($('h2',x),'DIFFERENT EXPERTISE.<br><span>ONE DIRECTION.</span>','خبرات مختلفة.<br><span>اتجاه واحد.</span>',true);set($('p',x),'Andrew Tharwat Studio connects safety knowledge, digital systems and creative execution around one principle: understand the real need, then build the right solution.','Andrew Tharwat Studio بيربط خبرة السلامة والأنظمة الرقمية والتنفيذ الإبداعي حول مبدأ واحد: نفهم الاحتياج الحقيقي ثم نبني الحل المناسب.');}
    $$('.studio-principles article').forEach(c=>{c.tabIndex=0;c.addEventListener('click',()=>{if(window.matchMedia('(hover:none)').matches)c.classList.toggle('is-open')})});
  }

  function team(){
    const h=$('#team .section-head');if(h){set($('.eyebrow',h),'STUDIO MODEL','نموذج الاستوديو');set($('h2',h),'THE RIGHT EXPERTISE.<br><span>WHEN THE PROJECT NEEDS IT.</span>','الخبرة المناسبة.<br><span>وقت ما المشروع يحتاجها.</span>',true)}
  }

  function contact(){
    const h=$('#contact .section-head');if(h){set($('.eyebrow',h),'LET’S WORK TOGETHER','خلينا نشتغل مع بعض');set($('h2',h),'READY TO MAKE<br><span>AN IMPACT?</span>','جاهز نحول الفكرة إلى<br><span>أثر حقيقي؟</span>',true);set($('div>p',h),'Tell us the situation, goal and timing. We’ll help define the clearest next step.','احكِ لنا الموقف والهدف والتوقيت، وإحنا نحدد معاك أوضح خطوة تالية.');}
  }

  function reorder(){
    const main=$('#main-content');if(!main)return;
    const ids=['home','capabilities','work','studio','team','contact'];
    ids.forEach(id=>{const el=document.getElementById(id);if(el)main.appendChild(el)});
  }

  function performance(){
    $$('img').forEach(img=>{if(!img.closest('.hero')){img.loading='lazy';img.decoding='async'}});
    // Do not animate hundreds of cards on entry; V10 is intentionally instant.
    $$('.v9-reveal').forEach(el=>el.classList.add('is-visible'));
  }

  function apply(){header();hero();capabilities();work();about();team();contact();reorder();performance();}
  let n=0;const timer=setInterval(()=>{apply();if(++n>18)clearInterval(timer)},120);
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(apply,100));
  new MutationObserver(()=>requestAnimationFrame(()=>{work();capabilities();performance()})).observe($('#main-content')||document.body,{childList:true,subtree:true});
  apply();
})();
