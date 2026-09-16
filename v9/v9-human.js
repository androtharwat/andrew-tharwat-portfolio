(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const setCopy=(el,en,ar,html=false)=>{if(!el)return;el.dataset.en=en;el.dataset.ar=ar;if(html){el.dataset.enHtml=en;el.dataset.arHtml=ar;el.innerHTML=lang()==='ar'?ar:en}else el.textContent=lang()==='ar'?ar:en};

  function injectStartHere(){
    if($('.human-start'))return;
    const hero=$('.hero');if(!hero)return;
    const section=document.createElement('section');section.className='human-start';section.id='start-here';
    section.innerHTML=`<div class="container"><div class="human-start-head"><div><span class="eyebrow" data-en="START HERE" data-ar="ابدأ من هنا">START HERE</span><h2 data-en-html="WHAT DO YOU NEED<br><span>HELP WITH?</span>" data-ar-html="إيه اللي محتاج<br><span>تساعد فيه؟</span>">WHAT DO YOU NEED<br><span>HELP WITH?</span></h2><p data-en="You do not need to know the right technical service before you contact us. Pick the closest need — or simply tell us what you want to improve." data-ar="مش لازم تعرف اسم الخدمة أو التخصص المناسب قبل ما تتواصل معنا. اختار أقرب احتياج ليك، أو ببساطة قول لنا إيه اللي عايز تحسّنه.">You do not need to know the right technical service before you contact us. Pick the closest need — or simply tell us what you want to improve.</p></div><aside class="human-start-note"><b data-en="NO JARGON REQUIRED" data-ar="مش محتاج مصطلحات">NO JARGON REQUIRED</b><span data-en="Tell us the situation in normal words. We’ll help identify the right path from there." data-ar="احكِ لنا الموقف بطريقتك العادية، وإحنا نحدد معاك الطريق المناسب من هناك.">Tell us the situation in normal words. We’ll help identify the right path from there.</span></aside></div><div class="human-need-grid"><a class="human-need-card" href="#capabilities"><span class="human-num">01 · HSE</span><h3 data-en="Make work safer" data-ar="خلّي الشغل أكثر أمانًا">Make work safer</h3><p data-en="Risk assessment, safety systems, awareness, training, site problems and practical HSE support." data-ar="تقييم مخاطر، أنظمة سلامة، توعية وتدريب، مشاكل موقع، ودعم HSE عملي.">Risk assessment, safety systems, awareness, training, site problems and practical HSE support.</p><span class="human-card-action"><span data-en="SEE HSE SUPPORT" data-ar="شوف دعم HSE">SEE HSE SUPPORT</span><b>→</b></span></a><a class="human-need-card" href="#capabilities"><span class="human-num">02 · DIGITAL</span><h3 data-en="Build a website or tool" data-ar="ابنِ موقع أو أداة">Build a website or tool</h3><p data-en="Websites, internal tools, dashboards, forms, workflows and automation that make work easier." data-ar="مواقع، أدوات داخلية، داشبورد، نماذج، مسارات عمل وأتمتة تسهّل الشغل.">Websites, internal tools, dashboards, forms, workflows and automation that make work easier.</p><span class="human-card-action"><span data-en="SEE DIGITAL OPTIONS" data-ar="شوف الحلول الرقمية">SEE DIGITAL OPTIONS</span><b>→</b></span></a><a class="human-need-card" href="#capabilities"><span class="human-num">03 · CREATIVE</span><h3 data-en="Present your idea better" data-ar="اعرض فكرتك بشكل أقوى">Present your idea better</h3><p data-en="Brand identity, design, campaigns, visual communication and content people can actually understand." data-ar="هوية، تصميم، حملات، تواصل بصري ومحتوى الناس تقدر تفهمه بسهولة.">Brand identity, design, campaigns, visual communication and content people can actually understand.</p><span class="human-card-action"><span data-en="SEE CREATIVE SUPPORT" data-ar="شوف الدعم الإبداعي">SEE CREATIVE SUPPORT</span><b>→</b></span></a><a class="human-need-card" href="#contact"><span class="human-num">04 · NOT SURE</span><h3 data-en="I know the need — not the service" data-ar="عارف احتياجي بس مش عارف الخدمة">I know the need — not the service</h3><p data-en="That’s completely fine. Tell us what is happening and what you want to improve. We’ll help shape the next step." data-ar="وده طبيعي جدًا. قول لنا إيه اللي حاصل وإيه اللي عايز تحسّنه، وإحنا نحدد معاك الخطوة اللي بعدها.">That’s completely fine. Tell us what is happening and what you want to improve. We’ll help shape the next step.</p><span class="human-card-action"><span data-en="TELL US WHAT YOU NEED" data-ar="قول لنا محتاج إيه">TELL US WHAT YOU NEED</span><b>→</b></span></a></div></div>`;
    hero.insertAdjacentElement('afterend',section);
  }

  function simplifyHeader(){
    const links=$$('#main-nav a');
    const copies=[['START HERE','ابدأ من هنا'],['HOW WE CAN HELP','نقدر نساعدك إزاي'],['WORK','الأعمال'],['ABOUT','عن الاستوديو'],['CONTACT','ابدأ']];
    links.forEach((a,i)=>copies[i]&&setCopy(a,copies[i][0],copies[i][1]));
    const cta=$('.header-cta');setCopy(cta,'TELL US WHAT YOU NEED →','قول لنا محتاج إيه ←');
  }

  function simplifyHero(){
    setCopy($('.hero .eyebrow'),'SAFETY · DIGITAL · DESIGN · AI — BUILT AROUND WHAT YOU NEED','سلامة · حلول رقمية · تصميم · ذكاء اصطناعي — حسب احتياجك');
    setCopy($('.hero h1'),'TELL US WHAT YOU NEED.<br><span>WE’LL HELP TURN IT INTO SOMETHING THAT WORKS.</span>','قول لنا محتاج إيه.<br><span>ونحوّله معاك لحل عملي.</span>',true);
    setCopy($('#hero-subtitle'),'Need safer work, a website or digital tool, stronger branding or content, or help shaping an idea? Start with the need — you do not have to know the technical solution.','محتاج تحل مشكلة سلامة، تبني موقع أو أداة رقمية، تطور الهوية والمحتوى، أو تحول فكرة لحاجة قابلة للتنفيذ؟ ابدأ باحتياجك فقط — مش لازم تعرف الحل التقني.');
    const actions=$$('.hero-actions .btn');
    if(actions[0])setCopy(actions[0],'TELL US WHAT YOU NEED →','قول لنا محتاج إيه ←');
    if(actions[1]){setCopy(actions[1],'SEE HOW WE CAN HELP','شوف نقدر نساعدك إزاي');actions[1].setAttribute('href','#start-here')}
    const steps=$$('.process-strip>div');
    const data=[['TELL US.','WHAT DO YOU NEED?','قول لنا.','إيه اللي محتاجه؟'],['WE CLARIFY.','WHAT REALLY NEEDS TO CHANGE','نوضح.','إيه اللي محتاج يتغيّر فعلًا'],['WE BUILD.','THE RIGHT SOLUTION','نبني.','الحل المناسب'],['WE IMPROVE.','TEST, REFINE, MAKE IT BETTER','نطوّر.','نجرب ونحسن النتيجة']];
    steps.forEach((d,i)=>{if(!data[i])return;setCopy(d.querySelector('b'),data[i][0],data[i][2]);setCopy(d.querySelector('small'),data[i][1],data[i][3])});
  }

  function simplifyStudio(){
    const copy=$('.studio-intro-copy');if(copy){setCopy(copy.querySelector('.eyebrow'),'HOW IT WORKS','إزاي بنشتغل');setCopy(copy.querySelector('h2'),'YOU DON’T NEED TO SPEAK OUR LANGUAGE.<br><span>JUST TELL US WHAT NEEDS TO CHANGE.</span>','مش لازم تتكلم بلغتنا.<br><span>قول لنا بس إيه اللي محتاج يتغيّر.</span>',true);setCopy(copy.querySelector('p'),'You bring the need in your own words. We help define what really matters, choose the right expertise, and turn it into a clear next step.','إنت بتشرح احتياجك بطريقتك. إحنا نحدد إيه المهم فعلًا، ونختار الخبرة المناسبة، ونحوّله لخطوة واضحة قابلة للتنفيذ.');if(!copy.querySelector('.human-no-jargon'))copy.insertAdjacentHTML('beforeend','<span class="human-no-jargon" data-en="No technical brief required to start" data-ar="مش محتاج بريف تقني علشان تبدأ">No technical brief required to start</span>')}
    const items=$$('.studio-principles article');
    const content=[['START WITH WHAT YOU NEED','A simple description of the situation is enough to begin.','ابدأ باحتياجك','وصف بسيط للموقف كفاية جدًا علشان نبدأ.'],['WE CHOOSE THE RIGHT EXPERTISE','You do not need to decide whether the answer is safety, software, design or AI.','إحنا نختار الخبرة المناسبة','مش لازم تحدد هل الحل سلامة ولا برمجة ولا تصميم ولا AI.'],['YOU GET A CLEAR NEXT STEP','We explain what we recommend, why it fits, and what happens next.','تاخد خطوة تالية واضحة','بنوضح لك بنقترح إيه، ليه مناسب، وإيه اللي هيحصل بعد كده.']];
    items.forEach((it,i)=>{if(!content[i])return;setCopy(it.querySelector('b'),content[i][0],content[i][2]);setCopy(it.querySelector('p'),content[i][1],content[i][3])});
  }

  function simplifyCapabilities(){
    const head=$('#capabilities .section-head');if(head){setCopy(head.querySelector('.eyebrow'),'HOW WE CAN HELP','نقدر نساعدك إزاي');setCopy(head.querySelector('h2'),'CLEAR SERVICES.<br><span>BUILT AROUND REAL NEEDS.</span>','خدمات واضحة.<br><span>مبنية حوالين احتياج حقيقي.</span>',true);setCopy(head.querySelector('div>p'),'You can come for one service or a combination. Start with the closest need — we’ll help shape the right scope from there.','ممكن تحتاج خدمة واحدة أو أكتر. ابدأ بأقرب احتياج ليك، وإحنا نساعدك نحدد النطاق المناسب.');const aside=head.querySelector('aside');if(aside){setCopy(aside.querySelector('b'),'NOT SURE WHICH ONE? THAT’S NORMAL.','مش عارف تختار؟ ده طبيعي.');setCopy(aside.querySelector('p'),'START WITH THE NEED, NOT THE DEPARTMENT.','ابدأ بالاحتياج، مش باسم التخصص.')}}
    const cards=$$('.discipline-grid article');
    const c=[['SAFETY & HSE','Risk assessment, practical safety systems, awareness, training and field problem-solving.','السلامة وHSE','تقييم مخاطر، أنظمة سلامة عملية، توعية وتدريب وحل مشاكل ميدانية.',['RISK ASSESSMENT','TRAINING','HSE SYSTEMS'],['تقييم مخاطر','تدريب','أنظمة HSE']],['WEBSITES & DIGITAL SYSTEMS','Websites, internal tools, dashboards, workflows and automation that reduce manual work.','المواقع والأنظمة الرقمية','مواقع، أدوات داخلية، داشبورد، مسارات عمل وأتمتة تقلل الشغل اليدوي.',['WEBSITES','TOOLS','AUTOMATION'],['مواقع','أدوات','أتمتة']],['BRAND, DESIGN & CONTENT','Brand identity, visual systems, campaigns and communication that make ideas easier to understand.','الهوية والتصميم والمحتوى','هوية، أنظمة بصرية، حملات وتواصل يخلي الفكرة أوضح وأسهل للفهم.',['BRAND','DESIGN','CONTENT'],['هوية','تصميم','محتوى']],['AI, VIDEO & STORYTELLING','AI-assisted visuals, video, personalized experiences and faster creative production when they genuinely help.','الذكاء الاصطناعي والفيديو والسرد','مرئيات وفيديو وتجارب مخصصة مدعومة بالذكاء الاصطناعي لما يكون فعلًا مفيد للمشروع.',['AI','VIDEO','STORIES'],['AI','فيديو','قصص']]];
    cards.forEach((card,i)=>{if(!c[i])return;setCopy(card.querySelector('h3'),c[i][0],c[i][2]);setCopy(card.querySelector('p'),c[i][1],c[i][3]);const lis=$$('li',card);lis.forEach((li,j)=>{if(c[i][4][j])setCopy(li,c[i][4][j],c[i][5][j])})});
  }

  function simplifyWork(){
    const head=$('#work .section-head');if(head){setCopy(head.querySelector('.eyebrow'),'REAL WORK','شغل حقيقي');setCopy(head.querySelector('h2'),'SEE WHAT WE’VE<br><span>ACTUALLY BUILT.</span>','شوف إحنا<br><span>نفذنا إيه فعلًا.</span>',true);setCopy(head.querySelector('div>p'),'Open any project to understand what was built, why it was needed, and how the work came together.','افتح أي مشروع وشوف اتعمل إيه، وليه كان مطلوب، وإزاي اتبنى الحل.');const aside=head.querySelector('aside');if(aside){setCopy(aside.querySelector('b'),'LESS TALK. MORE PROOF.','كلام أقل. شغل أكتر.');setCopy(aside.querySelector('p'),'PROJECTS · SYSTEMS · VISUALS · HSE','مشاريع · أنظمة · تصميم · HSE')}}
    enhanceProjectCards();
  }

  function enhanceProjectCards(){
    $$('.project-card .project-body').forEach(body=>{if(body.dataset.humanDone)return;body.dataset.humanDone='1';const p=body.querySelector('p');if(p)p.insertAdjacentHTML('beforebegin',`<span class="human-project-label" data-en="WHAT WE BUILT" data-ar="إيه اللي اتنفذ">${lang()==='ar'?'إيه اللي اتنفذ':'WHAT WE BUILT'}</span>`);const foot=body.querySelector('.project-foot span');if(foot)setCopy(foot,'SEE THE PROJECT','شوف المشروع')});
    const featured=$('#featured-project .featured-copy');if(featured&&!featured.dataset.humanDone){featured.dataset.humanDone='1';const p=featured.querySelector('p');if(p)p.insertAdjacentHTML('beforebegin',`<span class="human-project-label" data-en="WHAT WE BUILT" data-ar="إيه اللي اتنفذ">${lang()==='ar'?'إيه اللي اتنفذ':'WHAT WE BUILT'}</span>`);const small=featured.querySelector('small');if(small){small.textContent=(lang()==='ar'?'مشروع مختار':'FEATURED PROJECT')+(small.textContent.includes('·')?' · '+small.textContent.split('·').slice(1).join('·').trim():'')}}
  }

  function simplifyContact(){
    const head=$('#contact .section-head');if(head){setCopy(head.querySelector('.eyebrow'),'READY TO START?','جاهز تبدأ؟');setCopy(head.querySelector('h2'),'TELL US WHAT YOU NEED.<br><span>YOU DON’T NEED A PERFECT BRIEF.</span>','قول لنا محتاج إيه.<br><span>مش محتاج بريف مثالي.</span>',true);setCopy(head.querySelector('div>p'),'A few clear sentences are enough. Tell us what you want to improve, what is getting in the way, and what a better result would look like.','كام جملة واضحة كفاية. قول لنا عايز تحسّن إيه، إيه اللي معطلك، وإيه النتيجة اللي نفسك توصل لها.');const aside=head.querySelector('aside');if(aside){setCopy(aside.querySelector('b'),'DON’T CHOOSE THE SOLUTION FIRST.','ما تختارش الحل من الأول.');setCopy(aside.querySelector('p'),'START WITH WHAT YOU NEED.','ابدأ باحتياجك.')}}
    const sum=$('.brief-summary');if(sum){setCopy(sum.querySelector('small'),'YOUR REQUEST','طلبك');setCopy(sum.querySelector('h3'),'Tell us the need. We’ll help shape the right next step.','قول لنا الاحتياج، وإحنا نساعدك نحدد الخطوة المناسبة.');if(!sum.querySelector('.human-clear-line'))sum.insertAdjacentHTML('beforeend','<div class="human-clear-line"><b data-en="You do not need to select the right expert." data-ar="مش لازم تختار الخبير المناسب بنفسك.">You do not need to select the right expert.</b> <span data-en="That part is our job after we understand your need." data-ar="دي مسؤوليتنا بعد ما نفهم احتياجك.">That part is our job after we understand your need.</span></div>')}
  }

  function applyCurrentLanguage(){
    const l=lang();
    $$('[data-en]').forEach(el=>{const v=el.dataset[l];if(v!==undefined)el.textContent=v});
    $$('[data-en-html]').forEach(el=>{const v=el.dataset[l+'Html'];if(v!==undefined)el.innerHTML=v});
  }

  function run(){injectStartHere();simplifyHeader();simplifyHero();simplifyStudio();simplifyCapabilities();simplifyWork();simplifyContact();applyCurrentLanguage()}
  run();
  ['project-grid','featured-project','brief-steps'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(()=>requestAnimationFrame(()=>{enhanceProjectCards();applyCurrentLanguage()})).observe(el,{childList:true,subtree:true})});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(()=>{run();applyCurrentLanguage()},50));
})();
