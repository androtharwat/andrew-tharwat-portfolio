(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const copy=(el,en,ar,html=false)=>{
    if(!el)return;
    if(html){el.dataset.enHtml=en;el.dataset.arHtml=ar;el.innerHTML=lang()==='ar'?ar:en;}
    else{el.dataset.en=en;el.dataset.ar=ar;el.textContent=lang()==='ar'?ar:en;}
  };

  function refineHero(){
    copy($('.hero .eyebrow'),'SAFETY · DIGITAL SYSTEMS · CREATIVE · AI','سلامة · أنظمة رقمية · إبداع · ذكاء اصطناعي');
    copy($('.hero h1'),'COMPLEX NEEDS.<br><span>CLEAR, WORKING SOLUTIONS.</span>','احتياجات معقدة.<br><span>حلول واضحة وقابلة للتنفيذ.</span>',true);
    copy($('#hero-subtitle'),'Andrew Tharwat Studio combines HSE expertise, digital systems, design and AI to solve practical problems — from safer operations to websites, tools, brands and content.','Andrew Tharwat Studio يجمع خبرات HSE والأنظمة الرقمية والتصميم والذكاء الاصطناعي لحل مشكلات عملية — من تشغيل أكثر أمانًا إلى المواقع والأدوات والهوية والمحتوى.');
    const actions=$$('.hero-actions .btn');
    if(actions[0]){copy(actions[0],'START A PROJECT →','ابدأ مشروعك ←');actions[0].href='#contact';}
    if(actions[1]){copy(actions[1],'SEE THE WORK','شوف الأعمال');actions[1].href='#work';}
    const steps=$$('.process-strip>div');
    const d=[
      ['UNDERSTAND.','FRAME THE REAL NEED','نفهم.','نحدد الاحتياج الحقيقي'],
      ['CHOOSE.','BRING THE RIGHT EXPERTISE','نختار.','نجمع الخبرة المناسبة'],
      ['BUILD.','TURN IT INTO A WORKING SOLUTION','نبني.','نحوّله لحل قابل للتنفيذ'],
      ['IMPROVE.','TEST, REFINE AND STRENGTHEN','نطوّر.','نجرب ونحسن النتيجة']
    ];
    steps.forEach((x,i)=>{if(!d[i])return;copy(x.querySelector('b'),d[i][0],d[i][2]);copy(x.querySelector('small'),d[i][1],d[i][3]);});
  }

  function refineStart(){
    const s=$('.human-start');if(!s)return false;
    const head=$('.human-start-head',s);
    copy($('.eyebrow',head),'CHOOSE YOUR STARTING POINT','اختار نقطة البداية');
    copy($('h2',head),'START WITH THE<br><span>CLOSEST NEED.</span>','ابدأ بأقرب<br><span>احتياج ليك.</span>',true);
    copy($('div>p',head),'Pick the closest situation below. It only helps us understand where to start — it does not lock you into a service or package.','اختار أقرب موقف لاحتياجك. ده بس بيساعدنا نعرف نبدأ منين — ومش بيلزمك بخدمة أو باقة.');
    const note=$('.human-start-note',s);
    if(note){copy($('b',note),'NOT SURE WHERE IT FITS?','مش عارف أنهي اختيار؟');copy($('span',note),'Use the last card and describe the situation. We’ll help frame it.','استخدم آخر كارت واحكِ الموقف، وإحنا نساعدك نحدد المسار.');}
    const cards=$$('.human-need-card',s);
    if(cards[0]){cards[0].href='/hse-consultation/';copy($('h3',cards[0]),'Solve an HSE or safety issue','حل مشكلة HSE أو سلامة');copy($('.human-card-action span',cards[0]),'OPEN HSE CONSULTATION','ابدأ استشارة HSE');}
    if(cards[1]){copy($('h3',cards[1]),'Build a website or system','ابنِ موقع أو نظام');copy($('.human-card-action span',cards[1]),'SEE DIGITAL CAPABILITIES','شوف القدرات الرقمية');}
    if(cards[2]){copy($('h3',cards[2]),'Strengthen a brand or message','طوّر هوية أو رسالة');copy($('.human-card-action span',cards[2]),'SEE CREATIVE CAPABILITIES','شوف القدرات الإبداعية');}
    if(cards[3]){copy($('h3',cards[3]),'Something else needs solving','عندك تحدٍ مختلف');copy($('p',cards[3]),'Describe the situation in your own words. We’ll help define the right direction before deciding the solution.','احكِ الموقف بطريقتك. نحدد الاتجاه المناسب الأول قبل ما نقرر شكل الحل.');copy($('.human-card-action span',cards[3]),'START A CONVERSATION','ابدأ الحوار');}
    return true;
  }

  function refineHow(){
    const x=$('.studio-intro-copy');if(x){
      copy($('.eyebrow',x),'HOW IT WORKS','إزاي بنشتغل');
      copy($('h2',x),'ONE PROBLEM.<br><span>THE RIGHT MIX OF EXPERTISE.</span>','مشكلة واحدة.<br><span>المزيج المناسب من الخبرات.</span>',true);
      copy($('p',x),'We frame the real need, bring in only the expertise the project requires, build the solution, then refine it against the result you actually need.','بنحدد الاحتياج الحقيقي، ونجمع فقط الخبرات اللي المشروع محتاجها، ونبني الحل، وبعدها نطوره على أساس النتيجة المطلوبة فعلًا.');
      const n=$('.human-no-jargon',x);if(n)copy(n,'Clear scope before execution','نطاق واضح قبل التنفيذ');
    }
    const items=$$('.studio-principles article');
    const d=[
      ['FRAME THE REAL PROBLEM','Separate the symptom from the real need before choosing a solution.','نحدد المشكلة الحقيقية','نفصل بين العرض الظاهر والاحتياج الحقيقي قبل اختيار الحل.'],
      ['COMBINE ONLY WHAT IS NEEDED','Safety, software, design and AI are mixed only when they add value.','نجمع المطلوب فقط','نمزج السلامة والبرمجة والتصميم وAI فقط لما يضيفوا قيمة فعلية.'],
      ['BUILD, TEST AND REFINE','The work is judged by whether it solves the need — not by how many disciplines were used.','نبني ونجرب ونطوّر','نقيس الشغل بقدرته على حل الاحتياج، مش بعدد التخصصات المستخدمة.']
    ];
    items.forEach((x,i)=>{if(!d[i])return;copy($('b',x),d[i][0],d[i][2]);copy($('p',x),d[i][1],d[i][3]);});
  }

  function refineCapabilities(){
    const h=$('#capabilities .section-head');if(!h)return;
    copy($('.eyebrow',h),'WHAT WE DO','إيه اللي بننفذه');
    copy($('h2',h),'FOUR CAPABILITIES.<br><span>USED ALONE OR TOGETHER.</span>','أربع قدرات.<br><span>تشتغل منفردة أو مع بعض.</span>',true);
    copy($('div>p',h),'Explore the capabilities below. A project can use one of them or combine several when the problem genuinely crosses disciplines.','استكشف القدرات اللي تحت. المشروع ممكن يحتاج واحدة منها أو يجمع أكتر من قدرة لما المشكلة فعلًا تمتد بين تخصصات مختلفة.');
    const a=$('aside',h);if(a){copy($('b',a),'ONE PROJECT MAY CROSS DISCIPLINES.','مشروع واحد ممكن يجمع أكتر من تخصص.');copy($('p',a),'THE SCOPE DECIDES THE MIX.','النطاق هو اللي يحدد المزيج.');}
  }

  function refineWork(){
    const h=$('#work .section-head');if(!h)return;
    copy($('.eyebrow',h),'SELECTED WORK','أعمال مختارة');
    copy($('h2',h),'PROBLEMS TURNED INTO<br><span>WORKING RESULTS.</span>','مشكلات تحولت إلى<br><span>نتائج قابلة للاستخدام.</span>',true);
    copy($('div>p',h),'Each case shows the need, the thinking behind the solution and what was actually built.','كل حالة بتوضح الاحتياج، وطريقة التفكير وراء الحل، وإيه اللي اتنفذ فعلًا.');
    const a=$('aside',h);if(a){copy($('b',a),'THE WORK IS THE PROOF.','الشغل هو الدليل.');copy($('p',a),'CASE STUDIES · SYSTEMS · CONTENT · HSE','دراسات حالة · أنظمة · محتوى · HSE');}
  }

  function refineContact(){
    const h=$('#contact .section-head');if(h){
      copy($('.eyebrow',h),'START A PROJECT','ابدأ مشروعًا');
      copy($('h2',h),'SHARE THE SITUATION.<br><span>WE’LL DEFINE THE NEXT STEP.</span>','احكِ لنا الموقف.<br><span>ونحدد معاك الخطوة الجاية.</span>',true);
      copy($('div>p',h),'A few lines about the context, desired result and timing are enough to start. We’ll use them to recommend the right path.','كام سطر عن الوضع الحالي والنتيجة المطلوبة والتوقيت كفاية للبداية. هنستخدمهم علشان نقترح المسار المناسب.');
      const a=$('aside',h);if(a){copy($('b',a),'SHORT BRIEF. CLEAR START.','بريف مختصر. بداية واضحة.');copy($('p',a),'CONTEXT · RESULT · TIMING · CONTACT','السياق · النتيجة · التوقيت · التواصل');}
    }
    const s=$('.brief-summary');if(s){copy($('small',s),'YOUR PROJECT REQUEST','طلب مشروعك');copy($('h3',s),'Build a clear request in four short steps.','كوّن طلب واضح في أربع خطوات قصيرة.');const line=$('.human-clear-line',s);if(line){copy($('b',line),'We review the need before recommending the solution.','بنراجع الاحتياج قبل ما نقترح الحل.');copy($('span',line),'The right expertise and scope come after that.','بعدها بنحدد الخبرة والنطاق المناسبين.');}}
  }

  function apply(){
    refineHero();
    const startReady=refineStart();
    refineHow();refineCapabilities();refineWork();refineContact();
    return startReady;
  }

  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;if(apply()||attempts>30)clearInterval(timer);},80);
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(apply,140));
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.getElementById('main-content')||document.body,{childList:true,subtree:true});
  apply();
})();
