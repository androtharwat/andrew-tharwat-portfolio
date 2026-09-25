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
    set($('.hero .eyebrow'),'ATS · PROBLEM-SOLVING STUDIO','ATS · استوديو لحل المشكلات');
    set($('.hero h1'),'BRING THE PROBLEM.<br><span>WE BUILD THE SOLUTION.</span>','ابدأ بالمشكلة.<br><span>وإحنا نبني الحل.</span>',true);
    set($('#hero-subtitle'),'HSE · DIGITAL · BRAND · CONTENT · AI — one studio shaped around the problem.','HSE · حلول رقمية · هوية · محتوى · AI — استوديو واحد يتشكّل حول المشكلة.');
    const actions=$$('.hero-actions .btn');
    if(actions[0]){set(actions[0],'START WITH YOUR PROBLEM →','ابدأ من مشكلتك ←');actions[0].href='#contact'}
    if(actions[1]){set(actions[1],'EXPLORE THE WORK','شوف الحلول اللي بنبنيها');actions[1].href='#work'}
    const visual=$('.hero-visual');
    if(visual){
      visual.className='hero-visual v10-identity-visual v10-open-identity';
      visual.innerHTML=`
        <div class="v10-open-system" role="img" aria-label="${ar()?'المشكلة تدخل إلى ATS، وتتجمع حولها خبرات HSE والأنظمة الرقمية والإبداع والذكاء الاصطناعي، ثم تتحول إلى حل متكامل':'A real problem flows into ATS, where HSE, digital, creative and AI expertise combine into a complete solution'}">
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
            <div class="core-brand"><img src="/assets/ats-logo-mark.webp" alt="" /></div>
            <small>ATS</small>
            <b>STUDIO CORE</b>
            <em>${ar()?'نفهم · نجمع · نبني':'UNDERSTAND · ASSEMBLE · BUILD'}</em>
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
            <b>CREATIVE</b><small>${ar()?'هوية · محتوى · سرد':'BRAND · CONTENT · STORY'}</small>
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
    const cards=$$('.discipline-grid article');
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
      const nativeLabel=rawLabel.startsWith('FEATURED CASE STUDY')||rawLabel.startsWith('دراسة حالة مميزة');
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

    $$('#project-grid .project-card').forEach((card,i)=>{
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
          $$('.project-card.is-open',grid).forEach(x=>x.classList.remove('is-open'));
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
        <h2>${ar()?'مشكلة واحدة.<br><span>ثلاث خطوات.</span>':'ONE PROBLEM.<br><span>THREE MOVES.</span>'}</h2>
        <p>${ar()?'لا نبدأ ببيع خدمة. نبدأ بفهم المشكلة، ثم نجمع الخبرة المناسبة ونبني المسار الأنسب للحل.':'We do not start by selling a service. We start by understanding the problem, then shape the right path around it.'}</p>
      </div>

      <div class="v10-method-flow" aria-label="${ar()?'مراحل عمل الاستوديو':'Studio working method'}">
        <article class="v10-method-stage stage-understand">
          <span class="stage-no">01</span>
          <div class="stage-visual visual-understand" aria-hidden="true">
            <i></i><i></i><i></i><b></b>
          </div>
          <small>${ar()?'نفهم':'UNDERSTAND'}</small>
          <h3>${ar()?'ما الذي يحدث فعلًا؟':'WHAT IS REALLY HAPPENING?'}</h3>
          <p>${ar()?'نفصل بين الأعراض والمشكلة الحقيقية.':'Separate the symptoms from the real problem.'}</p>
        </article>

        <div class="v10-method-link" aria-hidden="true"><i></i><b>→</b></div>

        <article class="v10-method-stage stage-assemble">
          <span class="stage-no">02</span>
          <div class="stage-visual visual-assemble" aria-hidden="true">
            <i>HSE</i><i>DEV</i><i>DES</i><i>AI</i><b></b>
          </div>
          <small>${ar()?'نجمع':'ASSEMBLE'}</small>
          <h3>${ar()?'ما الخبرات والأدوات المطلوبة؟':'WHAT EXPERTISE DOES IT NEED?'}</h3>
          <p>${ar()?'نختار فقط الخبرات والأدوات التي تضيف قيمة حقيقية.':'Bring in only the expertise and tools that add value.'}</p>
        </article>

        <div class="v10-method-link" aria-hidden="true"><i></i><b>→</b></div>

        <article class="v10-method-stage stage-build">
          <span class="stage-no">03</span>
          <div class="stage-visual visual-build" aria-hidden="true">
            <i></i><b></b><em>✓</em>
          </div>
          <small>${ar()?'نبني':'BUILD'}</small>
          <h3>${ar()?'نبني حلًا يعمل في الواقع.':'MAKE THE SOLUTION USEFUL.'}</h3>
          <p>${ar()?'نحوّل الاتجاه إلى نتيجة واضحة وقابلة للتنفيذ.':'Turn the direction into a clear, usable outcome.'}</p>
        </article>
      </div>

      <div class="v10-method-rule">
        <span>${ar()?'لا فريق ثابت':'NO FIXED TEAM'}</span>
        <i></i>
        <span>${ar()?'لا خدمة مفروضة':'NO SERVICE-FIRST PITCH'}</span>
        <i></i>
        <strong>${ar()?'المشكلة تحدد المسار':'THE PROBLEM SHAPES THE PATH'}</strong>
      </div>
    `;
  }

  function enhanceRoleCards(){
    $$('#role-grid .role-card').forEach(card=>{
      card.classList.add('v10-role-node');
      card.removeAttribute('tabindex');
      card.setAttribute('role','group');
      const button=$('button',card);
      const syncA11y=()=>{
        const name=$('h4',card)?.textContent?.trim()||card.dataset.role||'expertise';
        const selected=card.classList.contains('selected');
        card.setAttribute('aria-label',name);
        if(button){
          button.setAttribute('aria-pressed',selected?'true':'false');
          button.setAttribute('aria-label',ar()?(selected?'إزالة خبرة '+name:'اختيار خبرة '+name):(selected?'Remove '+name:'Select '+name));
        }
      };
      syncA11y();
      if(card.dataset.v10A11yBound)return;
      card.dataset.v10A11yBound='1';
      card.addEventListener('click',()=>setTimeout(syncA11y,0));
    });
  }

  function team(){
    const section=$('#team'),h=$('#team .section-head');
    if(!section)return;
    section.classList.add('v10-team-system');
    if(h){
      set($('.eyebrow',h),'THE STUDIO NETWORK','شبكة الاستوديو');
      set($('h2',h),'NOT A FIXED TEAM.<br><span>THE RIGHT TEAM.</span>','ليس فريقًا ثابتًا.<br><span>بل الفريق المناسب.</span>',true);
      set($('div>p',h),'A focused studio core. Specialist expertise joins only when the problem needs it.','نواة واضحة للاستوديو، وتدخل الخبرات المتخصصة فقط عندما تحتاجها المشكلة.');
    }

    const model=$('.team-model',section);
    if(model)model.classList.add('v10-team-model-hidden');

    const founder=$('.founder-card',section);
    if(founder){
      founder.className='founder-card v10-team-core-card';
      founder.innerHTML=`
        <div class="v10-team-core-visual" aria-hidden="true">
          <i class="team-orbit orbit-a"></i>
          <i class="team-orbit orbit-b"></i>
          <i class="team-orbit orbit-c"></i>
          <div class="team-core-pulse"></div>
          <div class="team-core-mark"><img src="/assets/ats-logo-mark.webp" alt="" /></div>
          <span class="team-node n1">HSE</span>
          <span class="team-node n2">DEV</span>
          <span class="team-node n3">DES</span>
          <span class="team-node n4">AI</span>
        </div>
        <div class="v10-team-core-copy">
          <small>${ar()?'STUDIO CORE · توجيه واحد':'STUDIO CORE · ONE DIRECTION'}</small>
          <h3>Andrew Tharwat</h3>
          <b>${ar()?'توجيه الاستوديو وبناء الحل':'Studio Direction & Solution Architecture'}</b>
          <p>${ar()?'نحدد المشكلة، نربط التخصصات، ونحافظ على اتجاه واحد للحل من البداية للنهاية.':'Frames the problem, connects the disciplines, and keeps one direction from first question to final solution.'}</p>
          <div class="founder-focus">
            <span>${ar()?'تحديد المشكلة':'PROBLEM FRAMING'}</span>
            <span>${ar()?'تفكير منظومي':'SYSTEMS THINKING'}</span>
            <span>${ar()?'توجيه الحل':'SOLUTION DIRECTION'}</span>
          </div>
        </div>`;
    }

    const panel=$('.specialist-panel',section);
    if(panel){
      set($('.eyebrow',panel),'SPECIALIST NETWORK','شبكة الخبرات');
      set($('h3',panel),'EXPERTISE JOINS<br>WHEN THE PROBLEM NEEDS IT.','الخبرة تنضم<br>عندما تحتاجها المشكلة.',true);
      set($('p',panel),'Select any area to explore a possible expertise mix. This is a flexible network, not a fixed staff list.','اختر أي مجال لاستكشاف مزيج الخبرات الممكن. هذه شبكة مرنة وليست قائمة موظفين ثابتة.');
      const selHead=$('.team-selection-head',panel);
      if(selHead){
        set($('b',selHead),'POSSIBLE PROJECT MIX','مزيج محتمل للمشروع');
        set($('small',selHead),'Tap expertise areas above.','اختار مجالات الخبرة من فوق.');
      }
      set($('.network-note',panel),'FLEXIBLE NETWORK · ASSEMBLED BY PROJECT NEED','شبكة مرنة · تتكوّن حسب احتياج المشروع');
    }
    enhanceRoleCards();
  }
  function enhanceBriefSummary(){
    const rows=$$('#brief-summary .summary-row');
    rows.forEach(row=>{
      const value=$('b,span',row)?.textContent?.trim()||'';
      row.classList.toggle('v10-empty-summary',!value||value==='—');
    });
    const goalValue=rows[1]?($('b,span',rows[1])?.textContent?.trim()||''):'';
    const shell=$('.brief-shell');
    if(shell&&goalValue&&goalValue!=='—'){
      shell.classList.remove('v10-brief-gated');
      shell.classList.add('v10-brief-open');
    }
  }

  function contact(){
    const section=$('#contact'),h=$('#contact .section-head'),shell=$('.brief-shell');
    if(!section)return;
    section.classList.add('v10-contact-system');
    if(h){
      set($('.eyebrow',h),'START WITH ONE SENTENCE','ابدأ بجملة واحدة');
      set($('h2',h),'WHAT NEEDS TO<br><span>CHANGE?</span>','ما الذي يحتاج<br><span>إلى التغيير؟</span>',true);
      set($('div>p',h),'Do not choose a service. Tell us the problem first — we will shape the brief with you.','لا تختَر خدمة. احكِ لنا المشكلة أولًا، وسنُشكّل البريف معك.');
    }

    let entry=$('.v10-contact-entry',section);
    if(!entry){
      entry=document.createElement('div');
      entry.className='v10-contact-entry';
      entry.innerHTML=`
        <div class="v10-contact-entry-copy">
          <small></small>
          <h3></h3>
          <p></p>
          <div class="v10-contact-trust"><span></span><i></i><span></span><i></i><span></span></div>
        </div>
        <div class="v10-contact-entry-action">
          <label for="v10-problem-start"></label>
          <textarea id="v10-problem-start" rows="3"></textarea>
          <div class="v10-contact-entry-buttons">
            <button class="v10-start-brief" type="button"></button>
            <button class="v10-open-full-brief" type="button"></button>
          </div>
          <small class="v10-contact-entry-note"></small>
        </div>`;
      shell?.insertAdjacentElement('beforebegin',entry);
    }

    set($('.v10-contact-entry-copy>small',entry),'NO SERVICE CHOICE REQUIRED','لا تحتاج لاختيار خدمة');
    set($('.v10-contact-entry-copy h3',entry),'START WITH THE REAL PROBLEM.','ابدأ بالمشكلة الحقيقية.');
    set($('.v10-contact-entry-copy p',entry),'One clear sentence is enough to start.','جملة واضحة واحدة تكفي لنبدأ.');
    const trust=$$('.v10-contact-trust span',entry);
    if(trust[0])set(trust[0],'UNDERSTAND','نفهم');
    if(trust[1])set(trust[1],'SHAPE','نحدد المسار');
    if(trust[2])set(trust[2],'BUILD','نبني');
    const label=$('label',entry);if(label)set(label,'WHAT IS THE PROBLEM?','ما المشكلة؟');
    const textarea=$('#v10-problem-start',entry);
    if(textarea)textarea.placeholder=ar()?'مثال: لدينا عملية يدوية تستهلك وقتًا ونريد تحويلها إلى نظام أبسط...':'Example: We have a manual process wasting time and need a simpler digital workflow...';
    set($('.v10-start-brief',entry),'SHAPE MY BRIEF →','لنُشكّل البريف معًا ←');
    set($('.v10-open-full-brief',entry),'OPEN FULL BRIEF','افتح البريف الكامل');
    set($('.v10-contact-entry-note',entry),'NO PERFECT BRIEF NEEDED · WE BUILD IT STEP BY STEP','لا تحتاج بريفًا مثاليًا · نبنيه معًا خطوة بخطوة');

    if(shell&&!shell.classList.contains('brief-submitted')&&!shell.classList.contains('v10-brief-open'))shell.classList.add('v10-brief-gated');

    const reveal=(prefill=false)=>{
      if(!shell)return;
      const value=(textarea?.value||'').trim();
      if(prefill&&!value){textarea?.focus();return}
      shell.classList.remove('v10-brief-gated');
      shell.classList.add('v10-brief-open');
      if(prefill){
        const steps=$$('#brief-steps .brief-step');
        const goalIndex=steps.findIndex(step=>step.dataset.key==='goal');
        const progressButtons=$$('#brief-progress button');
        if(goalIndex>=0){
          progressButtons[goalIndex]?.click();
          setTimeout(()=>{
            const goal=$('[data-bind="goal"]');
            if(goal){
              goal.value=value;
              goal.dispatchEvent(new Event('input',{bubbles:true}));
            }
            enhanceBriefSummary();
          },30);
        }
      }
      setTimeout(()=>shell.scrollIntoView({behavior:'smooth',block:'start'}),45);
    };

    const start=$('.v10-start-brief',entry);
    if(start&&!start.dataset.v10Bound){
      start.dataset.v10Bound='1';
      start.addEventListener('click',()=>reveal(true));
    }
    const full=$('.v10-open-full-brief',entry);
    if(full&&!full.dataset.v10Bound){
      full.dataset.v10Bound='1';
      full.addEventListener('click',()=>reveal(false));
    }
    enhanceBriefSummary();
  }

  function reorder(){const main=$('#main-content');if(!main)return;['home','studio','capabilities','work','team','contact'].forEach(id=>{const el=document.getElementById(id);if(el)main.appendChild(el)})}
  function performance(){$$('img').forEach(img=>{if(!img.closest('.hero')){img.loading='lazy';img.decoding='async'}})}
  function applyStatic(){header();hero();capabilities();work();about();team();contact();reorder();performance()}

  function observeDynamicWork(){
    const grid=$('#project-grid');if(grid&&!grid.dataset.v10Observed){grid.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(()=>{work();performance()})).observe(grid,{childList:true})}
    const featured=$('#featured-project');if(featured&&!featured.dataset.v10Observed){featured.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(()=>{work();performance()})).observe(featured,{childList:true})}
    const roles=$('#role-grid');if(roles&&!roles.dataset.v10Observed){roles.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(enhanceRoleCards)).observe(roles,{childList:true})}
    const summary=$('#brief-summary');if(summary&&!summary.dataset.v10Observed){summary.dataset.v10Observed='1';new MutationObserver(()=>requestAnimationFrame(enhanceBriefSummary)).observe(summary,{childList:true,subtree:true})}
  }

  applyStatic();observeDynamicWork();
  document.addEventListener('DOMContentLoaded',()=>{applyStatic();observeDynamicWork()},{once:true});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(()=>{applyStatic();observeDynamicWork()},70));
})();
