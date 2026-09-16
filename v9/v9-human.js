(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const copy=(el,en,ar,html=false)=>{if(!el)return;if(html){el.dataset.enHtml=en;el.dataset.arHtml=ar;el.innerHTML=lang()==='ar'?ar:en}else{el.dataset.en=en;el.dataset.ar=ar;el.textContent=lang()==='ar'?ar:en}};

  function injectStart(){
    if($('.human-start'))return;
    const hero=$('.hero');if(!hero)return;
    const s=document.createElement('section');s.className='human-start';s.id='start-here';
    s.innerHTML=`<div class="container"><div class="human-start-head"><div><span class="eyebrow" data-en="START HERE" data-ar="ابدأ من هنا">START HERE</span><h2 data-en-html="WHAT DO YOU NEED<br><span>HELP WITH?</span>" data-ar-html="إيه اللي محتاج<br><span>مساعدة فيه؟</span>">WHAT DO YOU NEED<br><span>HELP WITH?</span></h2><p data-en="You do not need to know the right technical service before you contact us. Pick the closest need — or simply tell us what you want to improve." data-ar="مش لازم تعرف اسم الخدمة أو التخصص المناسب قبل ما تتواصل معنا. اختار أقرب احتياج ليك، أو ببساطة قول لنا إيه اللي عايز تحسّنه.">You do not need to know the right technical service before you contact us. Pick the closest need — or simply tell us what you want to improve.</p></div><aside class="human-start-note"><b data-en="NO JARGON REQUIRED" data-ar="مش محتاج مصطلحات">NO JARGON REQUIRED</b><span data-en="Tell us the situation in normal words. We’ll help identify the right path from there." data-ar="احكِ لنا الموقف بطريقتك العادية، وإحنا نحدد معاك الطريق المناسب من هناك.">Tell us the situation in normal words. We’ll help identify the right path from there.</span></aside></div><div class="human-need-grid">
    <a class="human-need-card" href="#capabilities"><span class="human-num">01 · HSE</span><h3 data-en="Make work safer" data-ar="خلّي الشغل أكثر أمانًا">Make work safer</h3><p data-en="Risk assessment, safety systems, awareness, training, site problems and practical HSE support." data-ar="تقييم مخاطر، أنظمة سلامة، توعية وتدريب، مشاكل موقع، ودعم HSE عملي.">Risk assessment, safety systems, awareness, training, site problems and practical HSE support.</p><span class="human-card-action"><span data-en="SEE HSE SUPPORT" data-ar="شوف دعم HSE">SEE HSE SUPPORT</span><b>→</b></span></a>
    <a class="human-need-card" href="#capabilities"><span class="human-num">02 · DIGITAL</span><h3 data-en="Build a website or tool" data-ar="ابنِ موقع أو أداة">Build a website or tool</h3><p data-en="Websites, internal tools, dashboards, forms, workflows and automation that make work easier." data-ar="مواقع، أدوات داخلية، داشبورد، نماذج، مسارات عمل وأتمتة تسهّل الشغل.">Websites, internal tools, dashboards, forms, workflows and automation that make work easier.</p><span class="human-card-action"><span data-en="SEE DIGITAL OPTIONS" data-ar="شوف الحلول الرقمية">SEE DIGITAL OPTIONS</span><b>→</b></span></a>
    <a class="human-need-card" href="#capabilities"><span class="human-num">03 · CREATIVE</span><h3 data-en="Present your idea better" data-ar="اعرض فكرتك بشكل أقوى">Present your idea better</h3><p data-en="Brand identity, design, campaigns, visual communication and content people can actually understand." data-ar="هوية، تصميم، حملات، تواصل بصري ومحتوى الناس تقدر تفهمه بسهولة.">Brand identity, design, campaigns, visual communication and content people can actually understand.</p><span class="human-card-action"><span data-en="SEE CREATIVE SUPPORT" data-ar="شوف الدعم الإبداعي">SEE CREATIVE SUPPORT</span><b>→</b></span></a>
    <a class="human-need-card" href="#contact"><span class="human-num">04 · NOT SURE</span><h3 data-en="I know the need — not the service" data-ar="عارف احتياجي بس مش عارف الخدمة">I know the need — not the service</h3><p data-en="That’s completely fine. Tell us what is happening and what you want to improve. We’ll help shape the next step." data-ar="وده طبيعي جدًا. قول لنا إيه اللي حاصل وإيه اللي عايز تحسّنه، وإحنا نحدد معاك الخطوة اللي بعدها.">That’s completely fine. Tell us what is happening and what you want to improve. We’ll help shape the next step.</p><span class="human-card-action"><span data-en="TELL US WHAT YOU NEED" data-ar="قول لنا محتاج إيه">TELL US WHAT YOU NEED</span><b>→</b></span></a>
    </div></div>`;
    hero.insertAdjacentElement('afterend',s);
  }

  function header(){
    const links=$$('#main-nav a'),c=[['HOW IT WORKS','إزاي بنشتغل'],['HOW WE CAN HELP','نقدر نساعدك إزاي'],['WORK','الأعمال'],['ABOUT','عن الاستوديو'],['CONTACT','ابدأ']];
    links.forEach((a,i)=>c[i]&&copy(a,c[i][0],c[i][1]));
    copy($('.header-cta'),'TELL US WHAT YOU NEED →','قول لنا محتاج إيه ←');
  }

  function hero(){
    copy($('.hero .eyebrow'),'SAFETY · DIGITAL · DESIGN · AI — BUILT AROUND WHAT YOU NEED','سلامة · حلول رقمية · تصميم · ذكاء اصطناعي — حسب احتياجك');
    copy($('.hero h1'),'TELL US WHAT YOU NEED.<br><span>WE’LL HELP TURN IT INTO SOMETHING THAT WORKS.</span>','قول لنا محتاج إيه.<br><span>ونحوّله معاك لحل عملي.</span>',true);
    copy($('#hero-subtitle'),'Need safer work, a website or digital tool, stronger branding or content, or help shaping an idea? Start with the need — you do not have to know the technical solution.','محتاج تحل مشكلة سلامة، تبني موقع أو أداة رقمية، تطور الهوية والمحتوى، أو تحول فكرة لحاجة قابلة للتنفيذ؟ ابدأ باحتياجك فقط — مش لازم تعرف الحل التقني.');
    const a=$$('.hero-actions .btn');if(a[0])copy(a[0],'TELL US WHAT YOU NEED →','قول لنا محتاج إيه ←');if(a[1]){copy(a[1],'SEE HOW WE CAN HELP','شوف نقدر نساعدك إزاي');a[1].href='#start-here'}
    const steps=$$('.process-strip>div'),d=[['TELL US.','WHAT DO YOU NEED?','قول لنا.','إيه اللي محتاجه؟'],['WE CLARIFY.','WHAT REALLY NEEDS TO CHANGE','نوضح.','إيه اللي محتاج يتغيّر فعلًا'],['WE BUILD.','THE RIGHT SOLUTION','نبني.','الحل المناسب'],['WE IMPROVE.','TEST, REFINE, MAKE IT BETTER','نطوّر.','نجرب ونحسن النتيجة']];
    steps.forEach((x,i)=>{if(d[i]){copy(x.querySelector('b'),d[i][0],d[i][2]);copy(x.querySelector('small'),d[i][1],d[i][3])}});
  }

  function studio(){
    const x=$('.studio-intro-copy');if(x){copy(x.querySelector('.eyebrow'),'HOW IT WORKS','إزاي بنشتغل');copy(x.querySelector('h2'),'YOU DON’T NEED TO SPEAK OUR LANGUAGE.<br><span>JUST TELL US WHAT NEEDS TO CHANGE.</span>','مش لازم تتكلم بلغتنا.<br><span>قول لنا بس إيه اللي محتاج يتغيّر.</span>',true);copy(x.querySelector('p'),'You bring the need in your own words. We help define what really matters, choose the right expertise, and turn it into a clear next step.','إنت بتشرح احتياجك بطريقتك. إحنا نحدد إيه المهم فعلًا، ونختار الخبرة المناسبة، ونحوّله لخطوة واضحة قابلة للتنفيذ.');if(!x.querySelector('.human-no-jargon'))x.insertAdjacentHTML('beforeend','<span class="human-no-jargon" data-en="No technical brief required to start" data-ar="مش محتاج بريف تقني علشان تبدأ">No technical brief required to start</span>')}
    const items=$$('.studio-principles article'),d=[['START WITH WHAT YOU NEED','A simple description of the situation is enough to begin.','ابدأ باحتياجك','وصف بسيط للموقف كفاية جدًا علشان نبدأ.'],['WE CHOOSE THE RIGHT EXPERTISE','You do not need to decide whether the answer is safety, software, design or AI.','إحنا نختار الخبرة المناسبة','مش لازم تحدد هل الحل سلامة ولا برمجة ولا تصميم ولا AI.'],['YOU GET A CLEAR NEXT STEP','We explain what we recommend, why it fits, and what happens next.','تاخد خطوة تالية واضحة','بنوضح لك بنقترح إيه، ليه مناسب، وإيه اللي هيحصل بعد كده.']];
    items.forEach((x,i)=>{if(d[i]){copy(x.querySelector('b'),d[i][0],d[i][2]);copy(x.querySelector('p'),d[i][1],d[i][3])}});
  }

  function capabilities(){
    const h=$('#capabilities .section-head');if(h){copy(h.querySelector('.eyebrow'),'HOW WE CAN HELP','نقدر نساعدك إزاي');copy(h.querySelector('h2'),'CLEAR SERVICES.<br><span>BUILT AROUND REAL NEEDS.</span>','خدمات واضحة.<br><span>مبنية حوالين احتياج حقيقي.</span>',true);copy(h.querySelector('div>p'),'You can come for one service or a combination. Start with the closest need — we’ll help shape the right scope from there.','ممكن تحتاج خدمة واحدة أو أكتر. ابدأ بأقرب احتياج ليك، وإحنا نساعدك نحدد النطاق المناسب.');const a=h.querySelector('aside');if(a){copy(a.querySelector('b'),'NOT SURE WHICH ONE? THAT’S NORMAL.','مش عارف تختار؟ ده طبيعي.');copy(a.querySelector('p'),'START WITH THE NEED, NOT THE DEPARTMENT.','ابدأ بالاحتياج، مش باسم التخصص.')}}
    const cards=$$('.discipline-grid article'),d=[
      ['SAFETY & HSE','Risk assessment, practical safety systems, awareness, training and field problem-solving.','السلامة وHSE','تقييم مخاطر، أنظمة سلامة عملية، توعية وتدريب وحل مشاكل ميدانية.',['RISK ASSESSMENT','TRAINING','HSE SYSTEMS'],['تقييم مخاطر','تدريب','أنظمة HSE']],
      ['WEBSITES & DIGITAL SYSTEMS','Websites, internal tools, dashboards, workflows and automation that reduce manual work.','المواقع والأنظمة الرقمية','مواقع، أدوات داخلية، داشبورد، مسارات عمل وأتمتة تقلل الشغل اليدوي.',['WEBSITES','TOOLS','AUTOMATION'],['مواقع','أدوات','أتمتة']],
      ['BRAND, DESIGN & CONTENT','Brand identity, visual systems, campaigns and communication that make ideas easier to understand.','الهوية والتصميم والمحتوى','هوية، أنظمة بصرية، حملات وتواصل يخلي الفكرة أوضح وأسهل للفهم.',['BRAND','DESIGN','CONTENT'],['هوية','تصميم','محتوى']],
      ['AI, VIDEO & STORYTELLING','AI-assisted visuals, video, personalized experiences and faster creative production when they genuinely help.','الذكاء الاصطناعي والفيديو والسرد','مرئيات وفيديو وتجارب مخصصة مدعومة بالذكاء الاصطناعي لما يكون فعلًا مفيد للمشروع.',['AI','VIDEO','STORIES'],['AI','فيديو','قصص']]
    ];
    cards.forEach((x,i)=>{if(!d[i])return;copy(x.querySelector('h3'),d[i][0],d[i][2]);copy(x.querySelector('p'),d[i][1],d[i][3]);$$('li',x).forEach((li,j)=>d[i][4][j]&&copy(li,d[i][4][j],d[i][5][j]))});
  }

  function projects(){
    const h=$('#work .section-head');if(h){copy(h.querySelector('.eyebrow'),'REAL WORK','شغل حقيقي');copy(h.querySelector('h2'),'SEE WHAT WE’VE<br><span>ACTUALLY BUILT.</span>','شوف إحنا<br><span>نفذنا إيه فعلًا.</span>',true);copy(h.querySelector('div>p'),'Open any project to understand what was built, why it was needed, and how the work came together.','افتح أي مشروع وشوف اتعمل إيه، وليه كان مطلوب، وإزاي اتبنى الحل.');const a=h.querySelector('aside');if(a){copy(a.querySelector('b'),'LESS TALK. MORE PROOF.','كلام أقل. شغل أكتر.');copy(a.querySelector('p'),'PROJECTS · SYSTEMS · VISUALS · HSE','مشاريع · أنظمة · تصميم · HSE')}}
    projectCards();
  }
  function projectCards(){
    $$('.project-card .project-body').forEach(b=>{if(b.dataset.humanDone)return;b.dataset.humanDone='1';const p=b.querySelector('p');if(p)p.insertAdjacentHTML('beforebegin',`<span class="human-project-label" data-en="WHAT WE BUILT" data-ar="إيه اللي اتنفذ">${lang()==='ar'?'إيه اللي اتنفذ':'WHAT WE BUILT'}</span>`);const f=b.querySelector('.project-foot span');if(f)copy(f,'SEE THE PROJECT','شوف المشروع')});
    const f=$('#featured-project .featured-copy');if(f&&!f.dataset.humanDone){f.dataset.humanDone='1';const p=f.querySelector('p');if(p)p.insertAdjacentHTML('beforebegin',`<span class="human-project-label" data-en="WHAT WE BUILT" data-ar="إيه اللي اتنفذ">${lang()==='ar'?'إيه اللي اتنفذ':'WHAT WE BUILT'}</span>`)}
  }

  function brief(){
    const steps=$$('#brief-steps .brief-step[data-key]');
    steps.forEach(s=>{
      const key=s.dataset.key,ey=s.querySelector('.eyebrow'),title=s.querySelector('h3'),guide=s.querySelector('.phase5-guidance');
      if(key==='goal'){
        copy(ey,'01 · WHAT YOU NEED','01 · احتياجك');copy(title,'What would you like to improve, build or change?','إيه اللي عايز تطوره أو تبنيه أو تغيّره؟');copy(guide,'Tell us in normal words what is happening now and what you would like to be different.','احكِ لنا بطريقتك العادية إيه الوضع الحالي وإيه اللي نفسك يكون مختلف.');
        const labels=$$('.field label',s);if(labels[0])copy(labels[0],'WHAT DO YOU NEED HELP WITH?','محتاج مساعدة في إيه؟');if(labels[1])copy(labels[1],'WHO IS THIS FOR?','ده لمين؟');if(labels[2])copy(labels[2],'A GOOD RESULT WOULD LOOK LIKE','النتيجة الجيدة بالنسبالك');const ta=$('textarea[data-bind="goal"]',s);if(ta)ta.placeholder=lang()==='ar'?'مثال: عندنا شغل يدوي بياخد وقت وعايز أحوله لنظام أسهل...':'Example: We have a manual process that takes too long and I want a simpler system...';
      }
      if(key==='type'){
        copy(ey,'02 · CLOSEST AREA','02 · أقرب مجال');copy(title,'Which option feels closest to what you need?','أنهي اختيار أقرب للي محتاجه؟');copy(guide,'This is only a starting point. You are not choosing the final solution.','دي مجرد نقطة بداية، وإنت مش بتختار الحل النهائي.');
      }
      if(key==='scope'){
        copy(ey,'03 · TIMING & BUDGET','03 · التوقيت والميزانية');copy(title,'What should we know before we suggest the next step?','إيه اللي لازم نعرفه قبل ما نقترح الخطوة الجاية؟');copy(guide,'A rough range is enough. Nothing here locks you into a package.','تقدير تقريبي كفاية، ومفيش اختيار هنا بيلزمك بباقة.');
      }
      if(key==='contact'){
        copy(ey,'04 · CONTACT','04 · التواصل');copy(title,'How should we get back to you?','نتواصل معاك إزاي؟');copy(guide,'Add your name and one contact method. That is enough to send the request.','اكتب اسمك وطريقة تواصل واحدة، وده كفاية لإرسال الطلب.');
      }
    });
    const p=$$('#brief-progress button');const labels=lang()==='ar'?['احتياجك','أقرب مجال','التوقيت','التواصل']:['YOUR NEED','CLOSEST AREA','TIMING','CONTACT'];p.forEach((b,i)=>{if(!labels[i])return;const n=b.querySelector('b')?.outerHTML||`<b>${String(i+1).padStart(2,'0')}</b>`;b.innerHTML=n+labels[i]});
  }

  function contact(){
    const h=$('#contact .section-head');if(h){copy(h.querySelector('.eyebrow'),'READY TO START?','جاهز تبدأ؟');copy(h.querySelector('h2'),'TELL US WHAT YOU NEED.<br><span>YOU DON’T NEED A PERFECT BRIEF.</span>','قول لنا محتاج إيه.<br><span>مش محتاج بريف مثالي.</span>',true);copy(h.querySelector('div>p'),'A few clear sentences are enough. Tell us what you want to improve, what is getting in the way, and what a better result would look like.','كام جملة واضحة كفاية. قول لنا عايز تحسّن إيه، إيه اللي معطلك، وإيه النتيجة اللي نفسك توصل لها.');const a=h.querySelector('aside');if(a){copy(a.querySelector('b'),'DON’T CHOOSE THE SOLUTION FIRST.','ما تختارش الحل من الأول.');copy(a.querySelector('p'),'START WITH WHAT YOU NEED.','ابدأ باحتياجك.')}}
    const s=$('.brief-summary');if(s){copy(s.querySelector('small'),'YOUR REQUEST','طلبك');copy(s.querySelector('h3'),'Tell us the need. We’ll help shape the right next step.','قول لنا الاحتياج، وإحنا نساعدك نحدد الخطوة المناسبة.');if(!s.querySelector('.human-clear-line'))s.insertAdjacentHTML('beforeend','<div class="human-clear-line"><b data-en="You do not need to select the right expert." data-ar="مش لازم تختار الخبير المناسب بنفسك.">You do not need to select the right expert.</b> <span data-en="That part is our job after we understand your need." data-ar="دي مسؤوليتنا بعد ما نفهم احتياجك.">That part is our job after we understand your need.</span></div>')}
    brief();
  }

  function translate(){const l=lang();$$('[data-en]').forEach(e=>{if(e.dataset[l]!==undefined)e.textContent=e.dataset[l]});$$('[data-en-html]').forEach(e=>{if(e.dataset[l+'Html']!==undefined)e.innerHTML=e.dataset[l+'Html']})}
  function run(){injectStart();header();hero();studio();capabilities();projects();contact();translate()}

  run();
  ['project-grid','featured-project','brief-steps','brief-progress'].forEach(id=>{const e=document.getElementById(id);if(e)new MutationObserver(()=>requestAnimationFrame(()=>{projectCards();brief();translate()})).observe(e,{childList:true,subtree:true})});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(run,80));
})();