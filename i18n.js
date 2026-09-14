(()=>{
  const KEY='andrew_portfolio_lang';
  const dict={
    'Home':'الرئيسية','About':'عني','Worlds':'مجالاتي','Projects':'المشاريع','Explore':'استكشف','Contact':'تواصل','Work':'الأعمال','Admin':'الإدارة',
    "Let's Talk":'تواصل معي',"LET'S TALK →":'تواصل معي ←','EXPLORE MY WORK':'استكشف أعمالي','WATCH SHOWREEL':'شاهد العرض','Years Experience':'سنوات خبرة','Projects Delivered':'مشروع تم تنفيذه','Creative Worlds':'مجالات إبداعية','Purpose: Real Impact':'الهدف: تأثير حقيقي',
    'SAFETY ENGINEER • DIGITAL CREATOR • VISUAL ARTIST • AI EXPLORER':'مهندس سلامة • صانع حلول رقمية • فنان بصري • مستكشف للذكاء الاصطناعي',
    'I TURN IDEAS INTO':'أحوّل الأفكار إلى','SYSTEMS, STORIES &':'أنظمة، قصص و','VISUAL EXPERIENCES.':'تجارب بصرية.',
    'From safer workplaces and digital systems to brands, stories and AI-powered visual experiences — I build ideas that solve real problems and create a brighter tomorrow.':'من بيئات عمل أكثر أمانًا وأنظمة رقمية إلى الهويات البصرية والقصص والتجارب المدعومة بالذكاء الاصطناعي — أحوّل الأفكار إلى حلول حقيقية تصنع أثرًا أفضل.',
    'WHO I AM':'من أنا','ONE MIND.':'عقل واحد.','MANY WAYS TO CREATE.':'طرق كثيرة للإبداع.','What looks like different fields to others is one process to me: understanding a problem, creating an idea, and turning it into something real.':'ما يبدو للآخرين مجالات مختلفة هو بالنسبة لي عملية واحدة: أفهم المشكلة، أصنع الفكرة، ثم أحولها إلى شيء حقيقي.',
    'SAFETY':'السلامة','TECHNOLOGY':'التكنولوجيا','DESIGN':'التصميم','STORIES':'القصص','AI':'الذكاء الاصطناعي','People':'الناس','Environments':'بيئات العمل','Real Impact':'أثر حقيقي','Digital Solutions':'حلول رقمية','Automation':'أتمتة','Data':'بيانات','Visual Ideas':'أفكار بصرية','Brands':'هويات','Creative Concepts':'مفاهيم إبداعية','Ideas':'أفكار','Characters':'شخصيات','Meaningful Content':'محتوى له معنى','Bigger Possibilities':'إمكانات أكبر','Faster Creation':'تنفيذ أسرع','Real Solutions':'حلول حقيقية',
    'MY WORLDS':'مجالاتي','IDEAS IN':'الأفكار تتحول إلى','ACTION.':'واقع.','Real-world experience. Creative thinking. Tangible impact.':'خبرة حقيقية. تفكير إبداعي. أثر ملموس.',
    'HOW I THINK':'طريقتي في التفكير',"I DON'T JUST DESIGN.":'أنا لا أصمم فقط.','I BUILD SOLUTIONS.':'أنا أبني حلولًا.','Different challenges. One approach. Real results.':'تحديات مختلفة. منهج واحد. نتائج حقيقية.','A Safety Problem':'مشكلة سلامة','→ Digital HSE Tool':'← أداة HSE رقمية','A Message':'رسالة','→ Awareness Film':'← فيلم توعوي','An Idea':'فكرة','→ Brand Identity':'← هوية بصرية',"A Child's Photo":'صورة طفل','→ Personalized Story':'← قصة مخصصة','Raw Data':'بيانات خام','→ Actionable Dashboard':'← لوحة بيانات قابلة للتنفيذ','A Concept':'تصور','→ Website':'← موقع إلكتروني',
    'FEATURED WORK':'أعمال مختارة','REAL PROJECTS.':'مشاريع حقيقية.','REAL IMPACT.':'أثر حقيقي.','A selection of projects that reflect different sides of my journey.':'مجموعة مختارة من المشاريع التي تعكس جوانب مختلفة من رحلتي.','VIEW ALL PROJECTS':'عرض كل المشاريع',
    'EXPLORE MORE':'استكشف أكثر','DEEPER INTO THE':'تعمق أكثر في','BRAND WORLD.':'عالم الهوية.','Extracted visual sections from the approved art direction — now integrated into the website experience.':'أقسام بصرية من الهوية المعتمدة تم دمجها داخل تجربة الموقع.',
    'MY APPROACH':'منهجي','THINK. CREATE. BUILD.':'فكر. ابتكر. نفّذ.','IMPROVE.':'طوّر.','THINK.':'فكّر.','CREATE.':'ابتكر.','BUILD.':'نفّذ.','Understand the problem and context before execution.':'افهم المشكلة والسياق قبل التنفيذ.','Turn ideas into concepts, visuals and experiences.':'حوّل الأفكار إلى مفاهيم وصور وتجارب.','Make the idea tangible, useful and testable.':'حوّل الفكرة إلى شيء ملموس ومفيد وقابل للاختبار.','Refine the result until it becomes stronger and smarter.':'طوّر النتيجة حتى تصبح أقوى وأذكى.',
    'SAFER IDEAS':'أفكار أكثر أمانًا','GOT AN IDEA?':'عندك فكرة؟',"LET'S MAKE IT REAL.":'خلينا نحولها لحقيقة.','New project, collaboration or just want to say hello? I’d love to hear from you.':'مشروع جديد، تعاون، أو حتى مجرد فكرة؟ يسعدني تواصلك معي.','New project, collaboration or just want to say hello? I\'d love to hear from you.':'مشروع جديد، تعاون، أو حتى مجرد فكرة؟ يسعدني تواصلك معي.','Start a Project':'ابدأ مشروعًا','All rights reserved.':'جميع الحقوق محفوظة.',
    'EXPERIENCE MY WORK':'استكشف أعمالي','REAL PROBLEMS.':'مشكلات حقيقية.','My work moves across safety, digital systems, visual design, storytelling and AI — but every project starts the same way: understand the problem, build something useful, and improve the experience.':'أعمالي تمتد بين السلامة والأنظمة الرقمية والتصميم البصري والقصص والذكاء الاصطناعي، لكن كل مشروع يبدأ بالطريقة نفسها: فهم المشكلة، بناء حل مفيد، ثم تحسين التجربة.','Published Projects':'مشاريع منشورة','Connected Journey':'رحلة مترابطة','ALL WORK':'كل الأعمال','Search projects, tools or tags...':'ابحث في المشاريع أو الأدوات أو الكلمات المفتاحية...','Loading projects…':'جاري تحميل المشاريع…','NEXT IDEA':'فكرتك التالية','SEEN SOMETHING':'شفت حاجة عجبتك؟','YOU WANT TO BUILD?':'حابب تنفذ حاجة شبهها؟',"Whether it's an HSE system, awareness film, website, visual identity or a new AI-powered idea — let's turn it into something real.":'سواء نظام HSE، فيلم توعوي، موقع، هوية بصرية أو فكرة جديدة بالذكاء الاصطناعي — خلينا نحولها لشيء حقيقي.','START A PROJECT →':'ابدأ مشروعًا ←',
    'BACK TO WORK':'العودة للأعمال','← BACK TO WORK':'العودة للأعمال →','CASE STUDY':'دراسة حالة','THE PROJECT.':'المشروع.','01 / CHALLENGE':'01 / التحدي','THE CHALLENGE.':'التحدي.','02 / SOLUTION':'02 / الحل','THE SOLUTION.':'الحل.','03 / RESULT':'03 / النتيجة','THE IMPACT.':'الأثر.','PROJECT GALLERY.':'معرض المشروع.','VISUAL ARCHIVE':'الأرشيف البصري','Images and video from the project.':'صور وفيديوهات من المشروع.','VIEW LIVE →':'عرض المشروع ←','WATCH VIDEO →':'شاهد الفيديو ←','GITHUB →':'GitHub ←','HANDCRAFTED COLLECTION':'مجموعة يدوية','SELECTED ARTWORKS.':'أعمال مختارة.','SWIPE / DRAG • OR USE ARROWS':'اسحب • أو استخدم الأسهم','PROCESS / MOTION':'عملية التنفيذ / الحركة','HANDCRAFTED PORTRAIT':'بورتريه مصنوع يدويًا','ORDER YOUR PORTRAIT':'اطلب بورتريه خاص بك','ARTWORK':'عمل فني','VIDEO':'فيديو',
    'Project page is not available yet':'صفحة المشروع غير متاحة حاليًا','This project is either not published yet or its public page is currently disabled.':'هذا المشروع إما غير منشور بعد أو أن صفحته العامة غير مفعلة.','BACK TO WORK':'العودة للأعمال','Could not load projects.':'تعذر تحميل المشاريع.','Please try again shortly.':'حاول مرة أخرى بعد قليل.','No projects match this filter yet.':'لا توجد مشاريع مطابقة لهذا الفلتر حاليًا.','VIEW CASE STUDY →':'عرض تفاصيل المشروع ←','Project':'مشروع','Creative':'إبداعي','Digital':'رقمي','Safety':'سلامة','Stories & AI':'قصص وذكاء اصطناعي'
  };

  const originals=new WeakMap();
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  function translateText(text){
    const n=norm(text);
    if(!n)return text;
    if(dict[n]) return text.replace(n,dict[n]);
    const m=n.match(/^(\d+) projects? shown$/i);
    if(m)return `${m[1]} مشروع ظاهر`;
    return text;
  }
  function applyNode(node,lang){
    if(node.nodeType!==Node.TEXT_NODE)return;
    const parent=node.parentElement;
    if(!parent||['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName))return;
    if(!originals.has(node)) originals.set(node,node.nodeValue);
    const base=originals.get(node);
    node.nodeValue=lang==='ar'?translateText(base):base;
  }
  function applyAttrs(root,lang){
    root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
      ['placeholder','title','aria-label'].forEach(a=>{
        if(!el.hasAttribute(a))return;
        const key=`i18nOriginal_${a}`;
        if(!el.dataset[key])el.dataset[key]=el.getAttribute(a)||'';
        const base=el.dataset[key];
        el.setAttribute(a,lang==='ar'?(dict[base]||base):base);
      });
    });
  }
  function walk(root=document.body,lang=current()){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE)applyNode(root,lang);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;while((n=walker.nextNode()))applyNode(n,lang);
    applyAttrs(root,lang);
  }
  function current(){return localStorage.getItem(KEY)==='ar'?'ar':'en'}
  function updateButtons(lang){document.querySelectorAll('.lang-toggle').forEach(b=>{b.textContent=lang==='ar'?'EN':'عربي';b.setAttribute('aria-label',lang==='ar'?'Switch to English':'التبديل إلى العربية');b.title=lang==='ar'?'English':'العربية'})}
  function apply(lang){
    localStorage.setItem(KEY,lang);
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.body?.classList.toggle('lang-ar',lang==='ar');
    walk(document.body,lang);updateButtons(lang);
    document.dispatchEvent(new CustomEvent('portfolio:languagechange',{detail:{lang}}));
  }
  function inject(){
    if(document.querySelector('.lang-toggle'))return;
    const header=document.querySelector('.site-header,.work-nav,.project-nav');if(!header)return;
    const b=document.createElement('button');b.type='button';b.className='lang-toggle';b.addEventListener('click',()=>apply(current()==='ar'?'en':'ar'));
    const cta=header.querySelector('.header-cta,.btn.btn-primary.small,.btn.btn-ghost.small');
    if(cta)header.insertBefore(b,cta);else header.appendChild(b);
    updateButtons(current());
  }
  const start=()=>{
    inject();apply(current());
    const obs=new MutationObserver(ms=>{for(const m of ms){m.addedNodes.forEach(n=>{if(n.nodeType===1||n.nodeType===3)walk(n,current())})}updateButtons(current())});
    obs.observe(document.body,{childList:true,subtree:true});
  };
  window.PORTFOLIO_I18N={getLang:current,setLang:apply,t:(en,ar)=>current()==='ar'?(ar||dict[en]||en):en};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
