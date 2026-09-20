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
      const map=[['#home','Home','الرئيسية'],['#studio','How We Work','كيف نعمل'],['#capabilities','Capabilities','القدرات'],['#work','Projects','المشاريع'],['#contact','Contact','تواصل']];
      links.forEach((a,i)=>{if(!map[i])return;a.href=map[i][0];set(a,map[i][1],map[i][2])});
      let hse=nav.querySelector('[data-v10-hse]');
      if(!hse){hse=document.createElement('a');hse.dataset.v10Hse='1';hse.href='/hse/';nav.querySelector('a[href="#work"]')?.insertAdjacentElement('afterend',hse)}
      hse.textContent=ar()?'عالم HSE':'HSE World';
    }
    const cta=$('.header-cta');set(cta,'START WITH THE PROBLEM →','ابدأ من المشكلة ←');if(cta)cta.href='#contact';
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
      visual.className='hero-visual v10-identity-visual v10-open-identity';
      visual.innerHTML=`
        <div class="v10-open-system" role="img" aria-label="${ar()?'المشكلة تدخل إلى Andrew Tharwat Studio، وتتجمع حولها خبرات HSE والأنظمة الرقمية والإبداع والذكاء الاصطناعي، ثم تتحول إلى حل متكامل':'A real problem flows into Andrew Tharwat Studio, where HSE, digital, creative and AI expertise combine into a complete solution'}">
          <div class="v10-ambient-orbit orbit-1" aria-hidden="true"></div>
          <div class="v10-ambient-orbit orbit-2" aria-hidden="true"></div>
          <div class="v10-ambient-orbit orbit-3" aria-hidden="true"></div>
          <div class="v10-planet-arc" aria-hidden="true"></div>

          <svg class="v10-energy-map" viewBox="0 0 760 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <linearGradient id="energyMain" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#ff3349" stop-opacity=".32"/>
                <stop offset=".42" stop-color="#ff3349"/>
                <stop offset=".62" stop-color="#ffffff"/>
                <stop offset="1" stop-color="#ff6b7a"/>
              </linearGradient>
              <radialGradient id="energyGlow">
                <stop offset="0" stop-color="#ffffff"/>
                <stop offset=".35" stop-color="#ff3349"/>
                <stop offset="1" stop-color="#ff3349" stop-opacity="0"/>
              </radialGradient>
              <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5"/>
              </filter>
            </defs>

            <path class="energy-base" d="M85 286 C175 250 220 275 294 280 C352 284 393 284 458 280 C527 276 588 246 676 286"/>
            <path class="energy-hot" d="M85 286 C175 250 220 275 294 280 C352 284 393 284 458 280 C527 276 588 246 676 286"/>

            <path class="energy-branch branch-a" d="M377 280 C338 218 312 178 278 132"/>
            <path class="energy-branch branch-b" d="M377 280 C416 218 444 178 482 132"/>
            <path class="energy-branch branch-c" d="M377 280 C338 342 312 382 278 428"/>
            <path class="energy-branch branch-d" d="M377 280 C416 342 444 382 482 428"/>

            <circle class="energy-particle p1" r="4" fill="#fff">
              <animateMotion dur="3.8s" repeatCount="indefinite" path="M85 286 C175 250 220 275 294 280 C352 284 393 284 458 280 C527 276 588 246 676 286"/>
            </circle>
            <circle class="energy-particle p2" r="3.2" fill="#ff3349">
              <animateMotion dur="3.8s" begin="-1.7s" repeatCount="indefinite" path="M85 286 C175 250 220 275 294 280 C352 284 393 284 458 280 C527 276 588 246 676 286"/>
            </circle>
            <circle class="energy-particle p3" r="2.4" fill="#ff8c98">
              <animateMotion dur="3.8s" begin="-2.8s" repeatCount="indefinite" path="M85 286 C175 250 220 275 294 280 C352 284 393 284 458 280 C527 276 588 246 676 286"/>
            </circle>
          </svg>

          <div class="v10-problem-world">
            <div class="problem-halo"></div>
            <div class="problem-sphere">
              <i class="crack c1"></i><i class="crack c2"></i><i class="crack c3"></i>
              <span>${ar()?'المشكلة':'PROBLEM'}</span>
            </div>
            <small>${ar()?'مخاطر · تعقيد · احتياج · فكرة':'RISK · COMPLEXITY · NEED · IDEA'}</small>
          </div>

          <div class="v10-core-world">
            <div class="core-orbit core-orbit-a"></div>
            <div class="core-orbit core-orbit-b"></div>
            <div class="core-orbit core-orbit-c"></div>
            <div class="core-pulse"></div>
            <div class="core-brand"><img src="/assets/logo-mark-official.png" alt="" /></div>
            <small>ANDREW THARWAT</small>
            <b>STUDIO CORE</b>
            <em>${ar()?'نفهم · نكوّن · نبني':'UNDERSTAND · ASSEMBLE · BUILD'}</em>
          </div>

          <div class="v10-expertise expert-hse">
            <div class="expert-icon">
              <svg viewBox="0 0 24 24"><path d="M5 14v-2a7 7 0 0 1 14 0v2M3 14h18M9 5v4M15 5v4" /></svg>
            </div>
            <b>HSE</b><small>${ar()?'سلامة · مخاطر · أشخاص':'SAFETY · RISK · PEOPLE'}</small>
          </div>
          <div class="v10-expertise expert-digital">
            <div class="expert-icon">
              <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="1"/><path d="M9 20h6M12 16v4"/></svg>
            </div>
            <b>DIGITAL</b><small>${ar()?'أنظمة · ويب · أتمتة':'SYSTEMS · WEB · AUTOMATION'}</small>
          </div>
          <div class="v10-expertise expert-creative">
            <div class="expert-icon">
              <svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20zM14 6l3.5 3.5"/></svg>
            </div>
            <b>CREATIVE</b><small>${ar()?'هوية · محتوى · قصة':'BRAND · CONTENT · STORY'}</small>
          </div>
          <div class="v10-expertise expert-ai">
            <div class="expert-icon">
              <svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>
            </div>
            <b>AI</b><small>${ar()?'ذكاء · تحليل · تسريع':'INTELLIGENCE · INSIGHT · SPEED'}</small>
          </div>

          <div class="v10-solution-world">
            <div class="solution-rays"></div>
            <div class="solution-sphere">
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24l8-10 4 5 4-6 6 11M21 13V7h6M27 7l-4 4"/></svg>
              <span>${ar()?'الحل':'SOLUTION'}</span>
            </div>
            <small>${ar()?'أكثر أمانًا · أذكى · أوضح · قابل للتنفيذ':'SAFER · SMARTER · CLEARER · BUILT TO WORK'}</small>
          </div>

          <div class="v10-flow-copy v10-flow-copy-left">
            <b>${ar()?'تحديات حقيقية':'REAL CHALLENGES'}</b>
            <span>${ar()?'نبدأ من الواقع':'START WITH REALITY'}</span>
          </div>
          <div class="v10-flow-copy v10-flow-copy-right">
            <b>${ar()?'أثر حقيقي':'REAL IMPACT'}</b>
            <span>${ar()?'نصل لحل قابل للتنفيذ':'END WITH SOMETHING USEFUL'}</span>
          </div>

          <div class="v10-system-tagline">
            <span>${ar()?'مشكلة واحدة':'ONE PROBLEM'}</span><i></i>
            <span>${ar()?'الفريق المناسب':'THE RIGHT TEAM'}</span><i></i>
            <strong>${ar()?'حل متكامل':'A COMPLETE SOLUTION'}</strong>
          </div>
        </div>`;
    }  }

  function capabilities(){
    const h=$('#capabilities .section-head');
    if(h){
      set($('.eyebrow',h),'CAPABILITIES · USED WHEN THEY ADD VALUE','القدرات · نستخدمها وقت ما تضيف قيمة');
      set($('h2',h),'THE RIGHT CAPABILITY.<br><span>AT THE RIGHT MOMENT.</span>','القدرة المناسبة.<br><span>في الوقت المناسب.</span>',true);
      set($('div>p',h),'Not four separate businesses. Four capability layers we can combine around the problem.','مش أربع خدمات منفصلة. أربع طبقات خبرة نقدر نجمعها حول المشكلة.');
    }
    const cards=$('.discipline-grid article');
    const data=[
      ['HSE & SAFETY','السلامة وHSE','PEOPLE · RISK · SYSTEMS','أشخاص · مخاطر · أنظمة'],
      ['DIGITAL SYSTEMS','الأنظمة الرقمية','WEB · AUTOMATION · DATA','ويب · أتمتة · بيانات'],
      ['CREATIVE & BRAND','الإبداع والهوية','IDENTITY · CONTENT · DIRECTION','هوية · محتوى · توجيه'],
      ['AI & STORYTELLING','الذكاء الاصطناعي والسرد','INTELLIGENCE · STORY · SPEED','ذكاء · قصة · سرعة']
    ];
    cards.forEach((card,i)=>{
      card.tabIndex=0;
      card.classList.add('v10-capability-card');
      if(data[i]){
        set($('h3',card),data[i][0],data[i][1]);
        let line=$('.v10-capability-line',card);
        if(!line){line=document.createElement('small');line.className='v10-capability-line';card.querySelector('h3')?.insertAdjacentElement('afterend',line)}
        set(line,data[i][2],data[i][3]);
      }
      if(i===0){
        let hseLink=$('.v10-hse-world-link',card);
        if(!hseLink){hseLink=document.createElement('a');hseLink.className='btn ghost v10-hse-world-link';hseLink.href='/hse/';card.appendChild(hseLink)}
        hseLink.setAttribute('aria-label',ar()?'ادخل عالم HSE':'Enter HSE World');
        set(hseLink,'ENTER HSE WORLD →','ادخل عالم HSE ←');
      }
      if(card.dataset.v10Bound)return;
      card.dataset.v10Bound='1';
      card.addEventListener('click',e=>{if(!touch()||e.target.closest('a,button'))return;card.classList.toggle('is-open')});
      card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('a,button')){e.preventDefault();card.classList.toggle('is-open')}});
    });
  }

  function enhanceProjectProofs(){
    const featured=$('#featured-project');
    if(featured&&!featured.classList.contains('hidden')&&!featured.classList.contains('skeleton')){
      featured.classList.add('v10-featured-proof');
      const media=$('.featured-media',featured),copy=$('.featured-copy',featured);
      const oldLabel=$('.featured-copy small',featured);
      const rawLabel=(oldLabel?.textContent||'').trim();
      const nativeLabel=rawLabel.startsWith('FEATURED CASE STUDY');
      const parsedCategory=nativeLabel&&rawLabel.includes('·')?rawLabel.split('·').slice(1).join('·').trim():'';
      if(parsedCategory)featured.dataset.proofCategory=parsedCategory;
      const category=parsedCategory||featured.dataset.proofCategory||'STUDIO CASE';
      if(oldLabel)set(oldLabel,'FEATURED CASE · SELECTED PROOF','دراسة حالة مختارة · دليل شغل');
      if(media&&!$('.featured-proof-mark',media)){
        const mark=document.createElement('div');
        mark.className='featured-proof-mark';
        mark.innerHTML='<small></small><b></b>';
        set($('small',mark),'REAL PROJECT','مشروع حقيقي');
        $('b',mark).textContent=category|| (ar()?'STUDIO CASE':'STUDIO CASE');
        media.appendChild(mark);
      }else if(media){
        const mark=$('.featured-proof-mark',media);
        set($('small',mark),'REAL PROJECT','مشروع حقيقي');
        if($('b',mark))$('b',mark).textContent=category||'STUDIO CASE';
      }
      const tags=$('.featured-tags',featured);
      if(tags){
        tags.classList.add('featured-proof-tags');
        let label=$('.featured-tags-label',tags);
        if(!label){label=document.createElement('small');label.className='featured-tags-label';tags.prepend(label)}
        set(label,'FOCUS','التركيز');
      }
      const cta=$('.featured-copy>a',featured);
      if(cta){
        cta.classList.remove('btn','primary');
        cta.classList.add('featured-proof-cta');
        cta.innerHTML='<span></span><b>↗</b>';
        set($('span',cta),'OPEN THE CASE','افتح الحالة');
      }
      if(copy&&!$('.featured-proof-signal',copy)){
        const signal=document.createElement('div');
        signal.className='featured-proof-signal';
        signal.innerHTML='<i></i><span></span>';
        set($('span',signal),'REAL WORK · MULTIDISCIPLINARY BUILD','شغل حقيقي · تنفيذ متعدد التخصصات');
        copy.prepend(signal);
      }else if(copy){
        set($('.featured-proof-signal span',copy),'REAL WORK · MULTIDISCIPLINARY BUILD','شغل حقيقي · تنفيذ متعدد التخصصات');
      }
    }

    $('#project-grid .project-card').forEach((card,i)=>{
      card.classList.add('v10-proof-card');
      const media=$('.project-media',card),body=$('.project-body',card),cat=$('.project-body>small',card),foot=$('.project-foot',card);
      if(media){
        if(!$('.project-media-shade',media)){const shade=document.createElement('div');shade.className='project-media-shade';media.appendChild(shade)}
        let pill=$('.project-category-pill',media);
        if(!pill){pill=document.createElement('span');pill.className='project-category-pill';media.appendChild(pill)}
        pill.textContent=cat?.textContent?.trim()||'PROJECT';
      }
      if(body){
        if(cat)cat.style.display='none';
        let top=$('.project-proof-top',body);
        if(!top){
          top=document.createElement('div');top.className='project-proof-top';top.innerHTML='<small></small><b>↗</b>';body.prepend(top);
        }
        set($('small',top),'CASE / PROJECT','CASE / مشروع');
      }
      if(foot){
        foot.classList.add('project-proof-meta');
        let label=$('.project-proof-label',foot);
        if(!label){label=document.createElement('small');label.className='project-proof-label';foot.prepend(label)}
        set(label,'FOCUS','التركيز');
        const arrow=$('b',foot);if(arrow)arrow.style.display='none';
      }
      const index=$('.project-index',card);if(index)index.textContent=String(i+2).padStart(2,'0');
    });
  }

  function work(){
    const h=$('#work .section-head');
    if(h){
      set($('.eyebrow',h),'SELECTED PROOF','أعمال تثبت الفكرة');
      set($('h2',h),'REAL WORK.<br><span>DIFFERENT PROBLEMS.</span>','شغل حقيقي.<br><span>مشكلات مختلفة.</span>',true);
      set($('div>p',h),'See what was actually built — across HSE, digital systems, creative work and AI.','شوف إيه اللي اتبنى فعلًا عبر HSE والأنظمة الرقمية والإبداع والذكاء الاصطناعي.');
    }
    enhanceProjectProofs();
    const grid=$('#project-grid');
    if(grid&&!grid.dataset.v10Tap){
      grid.dataset.v10Tap='1';
      grid.addEventListener('click',e=>{
        const card=e.target.closest('.project-card');
        if(!card||!touch())return;
        if(!card.classList.contains('is-open')){
          e.preventDefault();
          $('.project-card.is-open',grid).forEach(x=>x.classList.remove('is-open'));
          card.classList.add('is-open');
        }
      });
    }
  }

  function about(){
    const section=$('#studio'),wrap=$('.studio-intro-grid',section);
    if(!section||!wrap)return;
    wrap.className='studio-intro-grid v10-method-wrap';
    wrap.innerHTML=`
      <div class="v10-method-head">
        <span class="eyebrow">${ar()?'طريقة العمل':'HOW THE STUDIO WORKS'}</span>
        <h2>${ar()?'مشكلة واحدة.<br><span>ثلاث حركات.</span>':'ONE PROBLEM.<br><span>THREE MOVES.</span>'}</h2>
        <p>${ar()?'مش بنبدأ ببيع خدمة. بنبدأ بفهم المشكلة، وبعدها نكوّن الطريق المناسب ليها.':'We do not start by selling a service. We start by understanding the problem, then shape the right path around it.'}</p>
      </div>

      <div class="v10-method-flow" aria-label="${ar()?'مراحل عمل الاستوديو':'Studio working method'}">
        <article class="v10-method-stage stage-understand">
          <span class="stage-no">01</span>
          <div class="stage-visual visual-understand" aria-hidden="true">
            <i></i><i></i><i></i><b></b>
          </div>
          <small>${ar()?'نفهم':'UNDERSTAND'}</small>
          <h3>${ar()?'إيه اللي بيحصل فعلًا؟':'WHAT IS REALLY HAPPENING?'}</h3>
          <p>${ar()?'نفصل الأعراض عن المشكلة الحقيقية.':'Separate the symptoms from the real problem.'}</p>
        </article>

        <div class="v10-method-link" aria-hidden="true"><i></i><b>→</b></div>

        <article class="v10-method-stage stage-assemble">
          <span class="stage-no">02</span>
          <div class="stage-visual visual-assemble" aria-hidden="true">
            <i>HSE</i><i>DEV</i><i>DES</i><i>AI</i><b></b>
          </div>
          <small>${ar()?'نكوّن':'ASSEMBLE'}</small>
          <h3>${ar()?'مين وإيه اللي نحتاجه؟':'WHAT EXPERTISE DOES IT NEED?'}</h3>
          <p>${ar()?'نختار فقط الخبرة والأدوات اللي تضيف قيمة.':'Bring in only the expertise and tools that add value.'}</p>
        </article>

        <div class="v10-method-link" aria-hidden="true"><i></i><b>→</b></div>

        <article class="v10-method-stage stage-build">
          <span class="stage-no">03</span>
          <div class="stage-visual visual-build" aria-hidden="true">
            <i></i><b></b><em>✓</em>
          </div>
          <small>${ar()?'نبني':'BUILD'}</small>
          <h3>${ar()?'حل يشتغل في الواقع.':'MAKE THE SOLUTION USEFUL.'}</h3>
          <p>${ar()?'نحوّل الاتجاه إلى نتيجة واضحة وقابلة للاستخدام.':'Turn the direction into a clear, usable outcome.'}</p>
        </article>
      </div>

      <div class="v10-method-rule">
        <span>${ar()?'مش بنفرض فريق ثابت':'NO FIXED TEAM'}</span>
        <i></i>
        <span>${ar()?'مش بنفرض خدمة':'NO SERVICE-FIRST PITCH'}</span>
        <i></i>
        <strong>${ar()?'المشكلة هي اللي تحدد الطريق':'THE PROBLEM SHAPES THE PATH'}</strong>
      </div>
    `;
  }

  function team(){const h=$('#team .section-head');if(h){set($('.eyebrow',h),'STUDIO MODEL','نموذج الاستوديو');set($('h2',h),'THE RIGHT TEAM.<br><span>BUILT AROUND THE PROBLEM.</span>','الفريق المناسب.<br><span>يتكوّن حول المشكلة.</span>',true)}}
  function contact(){const h=$('#contact .section-head');if(h){set($('.eyebrow',h),'START HERE','ابدأ من هنا');set($('h2',h),'TELL US THE PROBLEM.<br><span>WE’LL SHAPE THE NEXT STEP.</span>','احكِ لنا المشكلة.<br><span>وإحنا نحدد الخطوة الجاية.</span>',true);set($('div>p',h),'No need to choose the service first.','مش لازم تختار الخدمة الأول.')}}

  function reorder(){const main=$('#main-content');if(!main)return;['home','studio','capabilities','work','team','contact'].forEach(id=>{const el=document.getElementById(id);if(el)main.appendChild(el)})}
  function performance(){$$('img').forEach(img=>{if(!img.closest('.hero')){img.loading='lazy';img.decoding='async'}})}
  function applyStatic(){header();hero();capabilities();work();about();team();contact();reorder();performance()}

  function observeDynamicWork(){
    const grid=$('#project-grid');if(grid&&!grid.dataset.v10Observed){grid.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(()=>{work();performance()})).observe(grid,{childList:true})}
    const featured=$('#featured-project');if(featured&&!featured.dataset.v10Observed){featured.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(()=>{work();performance()})).observe(featured,{childList:true})}
  }

  applyStatic();observeDynamicWork();
  document.addEventListener('DOMContentLoaded',()=>{applyStatic();observeDynamicWork()},{once:true});
  const refreshForLanguage=()=>requestAnimationFrame(()=>{applyStatic();observeDynamicWork()});
  document.addEventListener('v9:setlang',refreshForLanguage);
  document.addEventListener('v9:languagechange',refreshForLanguage);
})();
