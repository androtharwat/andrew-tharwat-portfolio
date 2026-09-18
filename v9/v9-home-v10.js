(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ar=()=>document.body.dataset.lang==='ar';
  const touch=()=>window.matchMedia('(hover:none),(pointer:coarse)').matches;
  const set=(el,en,arText,html=false)=>{if(!el)return;if(html){el.dataset.enHtml=en;el.dataset.arHtml=arText;el.innerHTML=ar()?arText:en}else{el.dataset.en=en;el.dataset.ar=arText;el.textContent=ar()?arText:en}};

  function header(){
    document.body.classList.add('v10-home');
    set($('.brand small'),'PROBLEM-SOLVING STUDIO','استوديو لحل المشكلات');
    const nav=$('#main-nav');
    if(nav){
      const links=$$('a',nav).filter(a=>!a.dataset.v10Hse);
      const map=[['#home','Home','الرئيسية'],['#capabilities','Services','الخدمات'],['#work','Projects','المشاريع'],['#studio','About','عن الاستوديو'],['#contact','Contact','تواصل']];
      links.forEach((a,i)=>{if(!map[i])return;a.href=map[i][0];set(a,map[i][1],map[i][2])});
      let hse=nav.querySelector('[data-v10-hse]');
      if(!hse){hse=document.createElement('a');hse.dataset.v10Hse='1';hse.href='/hse/';nav.querySelector('a[href="#work"]')?.insertAdjacentElement('afterend',hse)}
      hse.textContent=ar()?'عالم HSE':'HSE World';
    }
    const cta=$('.header-cta');set(cta,'START WITH THE PROBLEM →','ابدأ من المشكلة ←');if(cta)cta.href='#contact';
  }

  const entries=[
    {code:'HSE',en:'I NEED HSE SUPPORT',ar:'أحتاج دعم HSE',subEn:'Safety · Risk · Systems',subAr:'سلامة · مخاطر · أنظمة',href:'/hse/'},
    {code:'BLD',en:'I NEED TO BUILD',ar:'أحتاج أن أبني',subEn:'Brand · Web · Content',subAr:'هوية · موقع · محتوى',href:'#work'},
    {code:'GO',en:'I HAVE A PROBLEM',ar:'عندي مشكلة',subEn:'Start here. We shape the path.',subAr:'ابدأ من هنا وإحنا نحدد المسار.',href:'#contact'}
  ];

  function injectEntries(hero){
    $('.v10-service-rail',hero)?.remove();
    $('.v10-stat-rail',hero)?.remove();
    $('.v10-swipe-hint',hero)?.remove();
    let rail=$('.v10-entry-rail',hero);
    if(!rail){rail=document.createElement('div');rail.className='v10-entry-rail';hero.appendChild(rail)}
    rail.setAttribute('aria-label',ar()?'ابدأ من احتياجك':'Start from your need');
    rail.innerHTML=entries.map((x,i)=>`<a class="v10-entry" href="${x.href}" data-entry="${i}"><span>${x.code}</span><div><b>${ar()?x.ar:x.en}</b><small>${ar()?x.subAr:x.subEn}</small></div><i>→</i></a>`).join('');
  }

  function hero(){
    const h=$('.hero');if(!h)return;
    set($('.hero .eyebrow'),'ANDREW THARWAT STUDIO · PROBLEM-SOLVING STUDIO','ANDREW THARWAT STUDIO · استوديو لحل المشكلات');
    set($('.hero h1'),'YOU BRING THE PROBLEM.<br><span>WE BUILD THE SOLUTION.</span>','أنت ابدأ بالمشكلة.<br><span>وإحنا نبني الحل.</span>',true);
    set($('#hero-subtitle'),'HSE · DIGITAL · BRAND · CONTENT · AI — one studio built around the problem.','HSE · حلول رقمية · هوية · محتوى · AI — استوديو واحد بيتبني حول المشكلة.');
    const actions=$$('.hero-actions .btn');
    if(actions[0]){set(actions[0],'START WITH YOUR PROBLEM →','ابدأ من مشكلتك ←');actions[0].href='#contact'}
    if(actions[1]){set(actions[1],'SEE WHAT WE BUILD','شوف بنبني إيه');actions[1].href='#work'}
    const visual=$('.hero-visual');
    if(visual){
      visual.classList.add('v10-identity-visual');
      visual.innerHTML=`
        <div class="v10-system-visual" role="img" aria-label="${ar()?'المشكلة تدخل إلى Andrew Tharwat Studio وتتحول عبر خبرات HSE والحلول الرقمية والإبداع والذكاء الاصطناعي إلى حل متكامل':'A problem enters Andrew Tharwat Studio and moves through HSE, digital, creative and AI expertise into a complete solution'}">
          <div class="v10-system-grid" aria-hidden="true"></div>
          <svg class="v10-system-lines" viewBox="0 0 680 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <linearGradient id="v10flow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="rgba(255,255,255,.16)"/>
                <stop offset=".48" stop-color="#ef233c"/>
                <stop offset="1" stop-color="rgba(255,255,255,.20)"/>
              </linearGradient>
            </defs>
            <path class="flow-main" d="M58 280 C150 280 190 280 250 280 M430 280 C492 280 530 280 622 280"/>
            <path class="flow-branch" d="M340 280 C300 225 265 180 230 132 M340 280 C380 225 415 180 450 132 M340 280 C300 335 265 380 230 428 M340 280 C380 335 415 380 450 428"/>
          </svg>
          <div class="v10-flow-node v10-problem"><small>${ar()?'ابدأ هنا':'START HERE'}</small><b>${ar()?'المشكلة':'PROBLEM'}</b><i></i></div>
          <div class="v10-capability v10-cap-hse"><span>HSE</span><small>${ar()?'سلامة · مخاطر':'SAFETY · RISK'}</small></div>
          <div class="v10-capability v10-cap-digital"><span>DIGITAL</span><small>${ar()?'أنظمة · ويب':'SYSTEMS · WEB'}</small></div>
          <div class="v10-studio-core"><div class="core-ring ring-a"></div><div class="core-ring ring-b"></div><div class="core-mark"><img src="/assets/logo-mark-official.png" alt="" /></div><small>ANDREW THARWAT</small><b>${ar()?'STUDIO CORE':'STUDIO CORE'}</b><em>${ar()?'نفهم · نكوّن · نبني':'UNDERSTAND · ASSEMBLE · BUILD'}</em></div>
          <div class="v10-capability v10-cap-creative"><span>CREATIVE</span><small>${ar()?'هوية · محتوى':'BRAND · CONTENT'}</small></div>
          <div class="v10-capability v10-cap-ai"><span>AI</span><small>${ar()?'ذكاء · أتمتة':'INTELLIGENCE · AUTOMATION'}</small></div>
          <div class="v10-flow-node v10-solution"><small>${ar()?'النتيجة':'THE OUTCOME'}</small><b>${ar()?'الحل':'SOLUTION'}</b><i></i></div>
          <div class="v10-visual-signature"><b>${ar()?'مشكلة واحدة.':'ONE PROBLEM.'}</b><span>${ar()?'الفريق المناسب.':'THE RIGHT TEAM.'}</span><strong>${ar()?'حل متكامل.':'A COMPLETE SOLUTION.'}</strong></div>
        </div>`;
    }
    injectEntries(h);
  }

  function capabilities(){
    const h=$('#capabilities .section-head');if(h){set($('.eyebrow',h),'SERVICES','الخدمات');set($('h2',h),'CHOOSE A DIRECTION.<br><span>WE’LL SHAPE THE SOLUTION.</span>','اختار الاتجاه.<br><span>وإحنا نشكّل الحل.</span>',true);set($('div>p',h),'Four capabilities. One problem-solving direction.','أربع قدرات. اتجاه واحد لحل المشكلة.');}
    const cards=$$('.discipline-grid article');
    const short=[['SAFETY & HSE','السلامة وHSE'],['DIGITAL SYSTEMS','الأنظمة الرقمية'],['CREATIVE & BRAND','الإبداع والهوية'],['AI & STORYTELLING','الذكاء الاصطناعي والسرد']];
    cards.forEach((c,i)=>{c.tabIndex=0;if(short[i])set($('h3',c),short[i][0],short[i][1]);if(c.dataset.v10Bound)return;c.dataset.v10Bound='1';c.addEventListener('click',e=>{if(!touch()||e.target.closest('a,button'))return;c.classList.toggle('is-open')});c.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('a,button')){e.preventDefault();c.classList.toggle('is-open')}})});
  }

  function work(){
    const h=$('#work .section-head');if(h){set($('.eyebrow',h),'FEATURED WORK','أعمال مختارة');set($('h2',h),'PROOF.<br><span>NOT PROMISES.</span>','شغل حقيقي.<br><span>مش وعود.</span>',true);set($('div>p',h),'Selected work across HSE, digital and creative solutions.','أعمال مختارة في HSE والحلول الرقمية والإبداعية.');}
    const grid=$('#project-grid');if(grid&&!grid.dataset.v10Tap){grid.dataset.v10Tap='1';grid.addEventListener('click',e=>{const card=e.target.closest('.project-card');if(!card||!touch())return;if(!card.classList.contains('is-open')){e.preventDefault();$$('.project-card.is-open',grid).forEach(x=>x.classList.remove('is-open'));card.classList.add('is-open')}})}
  }

  function about(){
    const x=$('.studio-intro-copy');if(x){set($('.eyebrow',x),'ABOUT THE STUDIO','عن الاستوديو');set($('h2',x),'HOW WE THINK.<br><span>PROBLEM FIRST.</span>','إزاي بنفكر.<br><span>المشكلة أولًا.</span>',true);set($('p',x),'Understand first. Choose the right expertise. Build only what the problem needs.','نفهم الأول. نختار الخبرة المناسبة. ونبني فقط اللي المشكلة محتاجاه.');}
    $$('.studio-principles article').forEach(c=>{c.tabIndex=0;if(c.dataset.v10Bound)return;c.dataset.v10Bound='1';c.addEventListener('click',()=>{if(touch())c.classList.toggle('is-open')})});
  }

  function team(){const h=$('#team .section-head');if(h){set($('.eyebrow',h),'STUDIO MODEL','نموذج الاستوديو');set($('h2',h),'THE RIGHT TEAM.<br><span>BUILT AROUND THE PROBLEM.</span>','الفريق المناسب.<br><span>يتكوّن حول المشكلة.</span>',true)}}
  function contact(){const h=$('#contact .section-head');if(h){set($('.eyebrow',h),'START HERE','ابدأ من هنا');set($('h2',h),'TELL US THE PROBLEM.<br><span>WE’LL SHAPE THE NEXT STEP.</span>','احكِ لنا المشكلة.<br><span>وإحنا نحدد الخطوة الجاية.</span>',true);set($('div>p',h),'No need to choose the service first.','مش لازم تختار الخدمة الأول.')}}

  function reorder(){const main=$('#main-content');if(!main)return;['home','capabilities','work','studio','team','contact'].forEach(id=>{const el=document.getElementById(id);if(el)main.appendChild(el)})}
  function performance(){$$('img').forEach(img=>{if(!img.closest('.hero')){img.loading='lazy';img.decoding='async'}})}
  function applyStatic(){header();hero();capabilities();work();about();team();contact();reorder();performance()}

  function observeDynamicWork(){
    const grid=$('#project-grid');if(grid&&!grid.dataset.v10Observed){grid.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(()=>{work();performance()})).observe(grid,{childList:true})}
    const featured=$('#featured-project');if(featured&&!featured.dataset.v10Observed){featured.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(performance)).observe(featured,{childList:true})}
  }

  applyStatic();observeDynamicWork();
  document.addEventListener('DOMContentLoaded',()=>{applyStatic();observeDynamicWork()},{once:true});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(()=>{applyStatic();observeDynamicWork()},70));
})();
