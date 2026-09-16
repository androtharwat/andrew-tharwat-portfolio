(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const root = document.getElementById('project-root');
  if (!cfg || !window.supabase || !root) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const slug = decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1] || new URLSearchParams(location.search).get('slug') || '');
  if (!slug) return;

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
  const text = value => esc(value || '').replace(/\n/g, '<br>');
  const isAr = () => (window.PORTFOLIO_I18N?.getLang?.() || document.documentElement.lang || 'en') === 'ar';
  const local = (obj, key) => isAr() && obj?.[`${key}_ar`] ? obj[`${key}_ar`] : (obj?.[key] || '');
  let project = null;
  let caseStudy = null;

  const CASE_COPY = {
    'hse-awareness-series': {
      ar: {
        kicker:'V9 · دراسة حالة', heroA:'كيف تحولت سلسلة التوعية', heroB:'إلى نظام توعوي عملي؟',
        intro:'نظرة على طريقة التفكير والتنفيذ وراء سلسلة التوعية بالسلامة والصحة المهنية، بداية من فهم التحدي، مرورًا ببناء الرسائل، وحتى تطوير مكتبة توعوية قابلة للتوسع.',
        journeyKicker:'رحلة المشروع', journeyTitle:'من الفكرة إلى التنفيذ', journeyNote:'ثلاث مراحل مختلفة، لكل منها دور واضح في تحويل المعرفة الفنية إلى محتوى مفهوم وقابل للاستخدام.',
        blocks:[
          {label:'التحدي',title:'تحويل مفاهيم السلامة المعقدة إلى رسائل سريعة وواضحة'},
          {label:'المنهج',title:'البدء من المخاطر الحقيقية وليس من الشرح النظري'},
          {label:'الحل',title:'تطوير مكتبة توعوية قابلة لإعادة الاستخدام'}
        ],
        roleLabel:'الدور والمسؤولية',roleTitle:'ما الذي تم تنفيذه داخل المشروع؟',outcomeLabel:'النتيجة',outcomeTitle:'ما الذي أصبح موجودًا في النهاية؟',
        ctaLabel:'هل لديك تحدٍ مشابه؟',ctaText:'ابدأ بالمشكلة، ونبني لك المسار المناسب.',cta:'ابدأ مشروعك ←'
      },
      en: {
        kicker:'V9 · CASE STUDY', heroA:'HOW A SAFETY AWARENESS SERIES', heroB:'BECAME A WORKING SYSTEM.',
        intro:'A look at the thinking and execution behind the HSE Awareness Series — from understanding the challenge and shaping the message to building a reusable awareness library.',
        journeyKicker:'PROJECT JOURNEY', journeyTitle:'FROM IDEA TO EXECUTION', journeyNote:'Three distinct stages, each with a clear role in turning technical safety knowledge into usable communication.',
        blocks:[
          {label:'THE CHALLENGE',title:'Turn complex safety concepts into fast, clear messages'},
          {label:'THE APPROACH',title:'Start from real hazards, not abstract theory'},
          {label:'THE SOLUTION',title:'Build a reusable awareness library'}
        ],
        roleLabel:'ROLE & RESPONSIBILITY',roleTitle:'What was actually led and delivered?',outcomeLabel:'OUTCOME',outcomeTitle:'What exists at the end?',
        ctaLabel:'HAVE A SIMILAR CHALLENGE?',ctaText:'Bring the problem. We’ll shape the right path.',cta:'START A PROJECT →'
      }
    },
    'hse-digital-tools': {
      ar: {
        kicker:'V9 · دراسة حالة رقمية',heroA:'كيف تحولت إجراءات HSE الورقية',heroB:'إلى منظومة تشغيل رقمية؟',
        intro:'من التقارير والفحوصات والتصاريح المنفصلة إلى تدفق رقمي يربط الموقع بالإدارة ويجعل الحالة التشغيلية قابلة للرؤية والتتبع.',
        journeyKicker:'رحلة التحول الرقمي',journeyTitle:'من الورق إلى رؤية لحظية',journeyNote:'الهدف لم يكن رقمنة كل شيء؛ بل ربط الخطوات التي تحسن السرعة والتتبع واتخاذ القرار.',
        blocks:[
          {label:'التحدي',title:'تفكيك تدفق معلومات السلامة المشتت'},
          {label:'المنهج',title:'رقمنة الخطوات التي تصنع فرقًا فعليًا'},
          {label:'الحل',title:'ربط التقارير والفحوصات والتصاريح في نظام واحد'}
        ],
        roleLabel:'التصميم التشغيلي',roleTitle:'ما الذي تم تصميمه وربطه؟',outcomeLabel:'الأثر',outcomeTitle:'كيف تغيّر نموذج التشغيل؟',
        ctaLabel:'هل ما زالت عملياتك موزعة بين ورق وملفات؟',ctaText:'نحوّلها إلى مسار رقمي واضح وقابل للتتبع.',cta:'ابدأ التحول الرقمي ←'
      },
      en: {
        kicker:'V9 · DIGITAL CASE STUDY',heroA:'HOW PAPER-BASED HSE WORKFLOWS',heroB:'BECAME A DIGITAL OPERATING SYSTEM.',
        intro:'From disconnected reports, inspections and permits to a digital flow that connects field activity with management visibility and traceability.',
        journeyKicker:'DIGITAL TRANSFORMATION',journeyTitle:'FROM PAPER TO LIVE VISIBILITY',journeyNote:'The goal was not to digitize everything. It was to connect the steps that improve speed, traceability and decision-making.',
        blocks:[
          {label:'THE CHALLENGE',title:'Untangle fragmented safety information'},
          {label:'THE APPROACH',title:'Digitize the steps that create real operational value'},
          {label:'THE SOLUTION',title:'Connect reporting, inspections and permits in one system'}
        ],
        roleLabel:'OPERATING DESIGN',roleTitle:'What was designed and connected?',outcomeLabel:'IMPACT',outcomeTitle:'How did the operating model change?',
        ctaLabel:'STILL RUNNING CRITICAL FLOWS ON PAPER?',ctaText:'Turn them into a clear, trackable digital workflow.',cta:'START DIGITALIZING →'
      }
    },
    'do-personalized-stories': {
      ar: {
        kicker:'V9 · دراسة حالة منتج',heroA:'كيف تتحول صورة طفل',heroB:'إلى عالم هو بطله؟',
        intro:'من صورة واحدة واختيار عالم قصصي إلى تجربة مخصصة تحافظ على ملامح الطفل وهوية DO عبر القصة والمنتج ورحلة الطلب.',
        journeyKicker:'رحلة التخصيص',journeyTitle:'من صورة واحدة إلى تجربة كاملة',journeyNote:'قيمة المنتج ليست في وضع اسم الطفل فقط؛ بل في جعله بطلًا متسقًا داخل عالم يمكن تكراره وتوسيعه.',
        blocks:[
          {label:'التحدي',title:'الحفاظ على الطفل كبطل واضح في كل مشهد'},
          {label:'المنهج',title:'بناء شخصية ثابتة قبل بناء العالم القصصي'},
          {label:'الحل',title:'تحويل التخصيص إلى نظام يتكرر عبر قصص ومنتجات'}
        ],
        roleLabel:'تصميم المنتج',roleTitle:'ما الذي تم تصميمه حول تجربة الطفل؟',outcomeLabel:'النتيجة',outcomeTitle:'ما الذي أصبح قابلًا للتكرار والتوسع؟',
        ctaLabel:'هل لديك فكرة منتج شخصي؟',ctaText:'نبني التجربة من الهوية وحتى رحلة الطلب.',cta:'ابدأ المنتج ←'
      },
      en: {
        kicker:'V9 · PRODUCT CASE STUDY',heroA:'HOW ONE CHILD PHOTO',heroB:'BECAME A WORLD THEY COULD STAR IN.',
        intro:'From one photo and a chosen story world to a personalized experience that keeps the child recognizable across the story, product and ordering journey.',
        journeyKicker:'PERSONALIZATION JOURNEY',journeyTitle:'FROM ONE PHOTO TO A COMPLETE EXPERIENCE',journeyNote:'The value is not simply inserting a name. It is making the child a consistent hero inside a system that can repeat and expand.',
        blocks:[
          {label:'THE CHALLENGE',title:'Keep the child recognizably the hero in every scene'},
          {label:'THE APPROACH',title:'Build character consistency before building the world'},
          {label:'THE SOLUTION',title:'Turn personalization into a repeatable product system'}
        ],
        roleLabel:'PRODUCT DESIGN',roleTitle:'What was designed around the child experience?',outcomeLabel:'OUTCOME',outcomeTitle:'What became repeatable and scalable?',
        ctaLabel:'HAVE A PERSONALIZED PRODUCT IDEA?',ctaText:'Build the experience from identity through ordering.',cta:'START THE PRODUCT →'
      }
    },
    'magic-of-string-art': {
      ar: {
        kicker:'V9 · دراسة حالة إبداعية',heroA:'كيف تتحول صورة',heroB:'إلى بورتريه بالخيط؟',
        intro:'رحلة يدوية دقيقة تبدأ من قراءة الملامح وتنتهي بقطعة فنية مبنية من مسارات هندسية وطبقات خيط، مع الحفاظ على شخصية الوجه.',
        journeyKicker:'رحلة العمل اليدوي',journeyTitle:'من الملامح إلى هندسة بالخيط',journeyNote:'كل قرار في الكثافة والاتجاه واللون يساهم في استعادة التعبير باستخدام خامة لا تشبه الرسم التقليدي.',
        blocks:[
          {label:'التحدي',title:'الحفاظ على الشبه بلغة مادية مختلفة تمامًا'},
          {label:'المنهج',title:'تبسيط الصورة وتخطيط المسارات والطبقات'},
          {label:'الحل',title:'بناء أسلوب يدوي ثابت عبر وجوه ومقاسات مختلفة'}
        ],
        roleLabel:'الحرفة والتنفيذ',roleTitle:'ما الذي يدخل في بناء كل بورتريه؟',outcomeLabel:'الحصيلة',outcomeTitle:'ما الذي أثبته أكثر من 150 عملًا؟',
        ctaLabel:'هل تريد تحويل صورة إلى قطعة فنية؟',ctaText:'اختر الصورة، ونبدأ رحلة البورتريه من التصميم إلى التنفيذ.',cta:'اطلب بورتريه ←'
      },
      en: {
        kicker:'V9 · CREATIVE CASE STUDY',heroA:'HOW A PHOTOGRAPH',heroB:'BECAME A PORTRAIT MADE FROM THREAD.',
        intro:'A precise handcrafted journey that starts with reading facial features and ends in a portrait built from geometric paths, tension and layered thread.',
        journeyKicker:'HANDCRAFT JOURNEY',journeyTitle:'FROM FEATURES TO THREAD GEOMETRY',journeyNote:'Every decision in density, direction and color helps reconstruct expression through a medium that behaves nothing like traditional drawing.',
        blocks:[
          {label:'THE CHALLENGE',title:'Preserve likeness in a completely different physical language'},
          {label:'THE APPROACH',title:'Simplify the portrait and plan paths, layers and density'},
          {label:'THE SOLUTION',title:'Build a consistent handcrafted style across faces and formats'}
        ],
        roleLabel:'CRAFT & EXECUTION',roleTitle:'What goes into building each portrait?',outcomeLabel:'BODY OF WORK',outcomeTitle:'What did 150+ portraits prove?',
        ctaLabel:'WANT TO TURN A PHOTO INTO ART?',ctaText:'Start with the image and build the portrait from design to execution.',cta:'ORDER A PORTRAIT →'
      }
    },
    'hse-weekly-corrective-action-tracking': {
      ar: {
        kicker:'V9 · دراسة حالة تشغيلية',heroA:'كيف تتحول ملاحظة تفتيش',heroB:'إلى إغلاق يمكن إثباته؟',
        intro:'المتابعة الفعالة لا تنتهي عند استلام صورة أو رد؛ بل عند التأكد أن الدليل يثبت تنفيذ المتطلب الأصلي وأن الحالة الحقيقية انعكست في التقرير.',
        journeyKicker:'رحلة الإغلاق',journeyTitle:'من الملاحظة إلى دليل الإغلاق',journeyNote:'كل بند يظل مفتوحًا حتى ينجح الدليل في الإجابة على السؤال الأساسي: هل تم حل المشكلة فعلًا؟',
        blocks:[
          {label:'التحدي',title:'الرد على الملاحظة لا يعني أنها أُغلقت'},
          {label:'المنهج',title:'مقارنة الدليل بالمتطلب الأصلي قبل الاعتماد'},
          {label:'الحل',title:'تحويل المتابعة الأسبوعية إلى سجل تشغيلي موثوق'}
        ],
        roleLabel:'المراجعة والتحقق',roleTitle:'ما الذي يتم فحصه قبل اعتماد الإغلاق؟',outcomeLabel:'الأثر',outcomeTitle:'كيف أصبحت حالة الإجراءات أوضح؟',
        ctaLabel:'هل تحتاج نظام متابعة أقوى؟',ctaText:'نبني مسارًا يجعل كل ملاحظة ودليل وحالة قابلة للتتبع.',cta:'ابدأ النظام ←'
      },
      en: {
        kicker:'V9 · OPERATIONS CASE STUDY',heroA:'HOW AN INSPECTION FINDING',heroB:'BECAME A DEFENSIBLE CLOSURE.',
        intro:'Effective follow-up does not end when a photo or reply arrives. It ends when the evidence proves the original requirement was actually completed.',
        journeyKicker:'CLOSURE JOURNEY',journeyTitle:'FROM FINDING TO VERIFIED EVIDENCE',journeyNote:'Every action stays open until the evidence answers the essential question: was the problem actually resolved?',
        blocks:[
          {label:'THE CHALLENGE',title:'A response does not automatically mean closure'},
          {label:'THE APPROACH',title:'Compare evidence against the original requirement'},
          {label:'THE SOLUTION',title:'Turn weekly follow-up into a reliable operating record'}
        ],
        roleLabel:'REVIEW & VERIFICATION',roleTitle:'What is checked before closure is accepted?',outcomeLabel:'IMPACT',outcomeTitle:'How did action status become clearer?',
        ctaLabel:'NEED STRONGER ACTION TRACKING?',ctaText:'Build a workflow where every finding, evidence item and status is traceable.',cta:'BUILD THE WORKFLOW →'
      }
    },
    'andrew-tharwat-personal-brand': {
      ar: {
        kicker:'V9 · دراسة حالة هوية',heroA:'كيف تجتمع تخصصات مختلفة',heroB:'تحت هوية Studio واحدة؟',
        intro:'السلامة والحلول الرقمية والتصميم والمحتوى والذكاء الاصطناعي لا تظهر كقائمة مهارات منفصلة، بل كمنظومة واحدة هدفها حل المشكلات بطرق متعددة.',
        journeyKicker:'رحلة الهوية',journeyTitle:'من مهارات متفرقة إلى نظام واحد',journeyNote:'الهوية هنا ليست لوجو فقط؛ هي طريقة لترتيب الأعمال وشرحها وتشغيل المحتوى وتوسيع الاستوديو مستقبلًا.',
        blocks:[
          {label:'التحدي',title:'منع التخصصات من الظهور كملفات شخصية منفصلة'},
          {label:'المنهج',title:'بناء فكرة موحدة حول حل المشكلات'},
          {label:'الحل',title:'تحويل الهوية إلى موقع وCMS ونظام تشغيل'}
        ],
        roleLabel:'الاستراتيجية والتنفيذ',roleTitle:'ما الذي تم بناؤه خلف الهوية؟',outcomeLabel:'النتيجة',outcomeTitle:'كيف أصبحت التخصصات مفهومة داخل بيت واحد؟',
        ctaLabel:'هل هويتك لا تعكس كل ما تقدمه؟',ctaText:'نبني نظامًا يجمع الأعمال والرسالة والتجربة في اتجاه واحد.',cta:'ابدأ هويتك ←'
      },
      en: {
        kicker:'V9 · BRAND CASE STUDY',heroA:'HOW DIFFERENT DISCIPLINES',heroB:'BECAME ONE STUDIO IDENTITY.',
        intro:'Safety, digital products, design, content and AI are presented not as unrelated skills, but as one system for solving problems through different forms of expertise.',
        journeyKicker:'IDENTITY JOURNEY',journeyTitle:'FROM FRAGMENTED SKILLS TO ONE SYSTEM',journeyNote:'This identity is more than a logo. It organizes the work, explains it, runs the content and leaves room for the studio to grow.',
        blocks:[
          {label:'THE CHALLENGE',title:'Stop multiple disciplines feeling like separate profiles'},
          {label:'THE APPROACH',title:'Build one idea around problem solving'},
          {label:'THE SOLUTION',title:'Turn the identity into a portfolio, CMS and operating system'}
        ],
        roleLabel:'STRATEGY & BUILD',roleTitle:'What was built behind the identity?',outcomeLabel:'OUTCOME',outcomeTitle:'How did different disciplines gain one home?',
        ctaLabel:'DOES YOUR IDENTITY MISS PART OF WHAT YOU DO?',ctaText:'Build one system for the work, message and experience.',cta:'BUILD YOUR IDENTITY →'
      }
    },
    'do-document-smart-document-intelligence': {
      ar: {
        kicker:'V9 · دراسة حالة AI',heroA:'كيف تتحول صورة مستند',heroB:'إلى بيانات قابلة للعمل؟',
        intro:'من بطاقات الهوية والرخص والتصاريح إلى سجلات منظمة يمكن مراجعتها والبحث فيها وتصديرها، مع بقاء القرار النهائي في يد المستخدم.',
        journeyKicker:'رحلة المستند',journeyTitle:'من الالتقاط إلى سجل منظم',journeyNote:'الهدف ليس استخراج أكبر عدد من الحقول؛ بل استخراج البيانات المطلوبة، مراجعتها، ثم حفظها في صورة قابلة للاستخدام.',
        blocks:[
          {label:'التحدي',title:'تقليل الإدخال اليدوي دون فقد المراجعة البشرية'},
          {label:'المنهج',title:'استخراج ما يحتاجه المستخدم فعليًا والتحقق منه'},
          {label:'الحل',title:'تحويل صور المستندات إلى سجلات قابلة للبحث والتصدير'}
        ],
        roleLabel:'بنية المنتج والذكاء',roleTitle:'ما الذي تم تصميمه بين الالتقاط والحفظ؟',outcomeLabel:'النتيجة',outcomeTitle:'كيف تغيرت عملية إدخال المستندات؟',
        ctaLabel:'هل لديك مستندات تُدخل يدويًا كل يوم؟',ctaText:'نحوّلها إلى مسار أسرع للاستخراج والمراجعة والتصدير.',cta:'ابدأ الأتمتة ←'
      },
      en: {
        kicker:'V9 · AI CASE STUDY',heroA:'HOW A DOCUMENT IMAGE',heroB:'BECAME WORKABLE STRUCTURED DATA.',
        intro:'From identity cards, licenses and permits to structured records that can be reviewed, searched and exported while keeping the final decision with the user.',
        journeyKicker:'DOCUMENT JOURNEY',journeyTitle:'FROM CAPTURE TO STRUCTURED RECORD',journeyNote:'The goal is not to extract every possible field. It is to capture the data that matters, validate it, then save it in a usable form.',
        blocks:[
          {label:'THE CHALLENGE',title:'Reduce manual entry without removing human validation'},
          {label:'THE APPROACH',title:'Extract what users actually need and verify it'},
          {label:'THE SOLUTION',title:'Turn document images into searchable, exportable records'}
        ],
        roleLabel:'PRODUCT & AI ARCHITECTURE',roleTitle:'What was designed between capture and save?',outcomeLabel:'OUTCOME',outcomeTitle:'How did document entry change?',
        ctaLabel:'ENTERING DOCUMENT DATA BY HAND EVERY DAY?',ctaText:'Turn it into a faster extraction, review and export workflow.',cta:'START AUTOMATING →'
      }
    }
  };

  function metricsMarkup() {
    const items = Array.isArray(caseStudy?.impact_points) ? caseStudy.impact_points : [];
    if (!items.length) return '';
    return `<div class="v9-case-metrics">${items.slice(0,3).map(item => `<div class="v9-case-metric"><strong>${esc(item.value || '—')}</strong><span>${esc(isAr() ? (item.label_ar || item.label || '') : (item.label || ''))}</span></div>`).join('')}</div>`;
  }

  function capabilityMarkup() {
    const items = isAr() && caseStudy?.capabilities_ar?.length ? caseStudy.capabilities_ar : (caseStudy?.capabilities || []);
    if (!items.length) return '';
    return `<div class="v9-case-capabilities"><b>${isAr() ? 'القدرات المستخدمة' : 'CAPABILITIES USED'}</b>${items.map(item => `<span>${esc(item)}</span>`).join('')}</div>`;
  }

  function copy() {
    const custom = CASE_COPY[slug]?.[isAr() ? 'ar' : 'en'];
    if (custom) return custom;
    return isAr() ? {
      kicker:'V9 · دراسة حالة', heroA:'كيف تحولت الفكرة', heroB:'إلى حل قابل للتنفيذ؟',
      intro:'نظرة مركزة على مسار التفكير والتنفيذ، من تحديد المشكلة إلى بناء النتيجة النهائية.',
      journeyKicker:'رحلة المشروع', journeyTitle:'من التحدي إلى التنفيذ', journeyNote:'كل مرحلة لها وظيفة مختلفة داخل مسار بناء الحل.',
      blocks:[
        {label:'التحدي',title:'تحديد المشكلة الحقيقية'},
        {label:'المنهج',title:'بناء طريقة العمل المناسبة'},
        {label:'الحل',title:'تحويل الفكرة إلى تنفيذ'}
      ],
      roleLabel:'الدور والمسؤولية', roleTitle:'ما الذي تم قيادته وتنفيذه؟',
      outcomeLabel:'النتيجة', outcomeTitle:'ما الذي أصبح موجودًا في النهاية؟',
      ctaLabel:'هل لديك تحدٍ مشابه؟', ctaText:'ابدأ بالمشكلة، ونبني المسار المناسب.', cta:'ابدأ مشروعًا ←'
    } : {
      kicker:'V9 · CASE STUDY', heroA:'HOW THE IDEA BECAME', heroB:'A WORKING SOLUTION.',
      intro:'A focused look at the thinking and execution path, from framing the problem to building the final outcome.',
      journeyKicker:'PROJECT JOURNEY', journeyTitle:'FROM CHALLENGE TO EXECUTION', journeyNote:'Each stage plays a different role in shaping the solution.',
      blocks:[
        {label:'THE CHALLENGE',title:'Frame the real problem'},
        {label:'THE APPROACH',title:'Shape the right working approach'},
        {label:'THE SOLUTION',title:'Turn the idea into execution'}
      ],
      roleLabel:'ROLE & RESPONSIBILITY', roleTitle:'What was led and delivered?',
      outcomeLabel:'OUTCOME', outcomeTitle:'What exists at the end?',
      ctaLabel:'HAVE A SIMILAR CHALLENGE?', ctaText:'Bring the problem. We’ll shape the right path.', cta:'START A PROJECT →'
    };
  }

  function block(index, meta, body) {
    return `<article class="v9-case-block"><span>${String(index).padStart(2,'0')}</span><small>${esc(meta.label)}</small><h3>${esc(meta.title)}</h3><p>${text(body)}</p></article>`;
  }

  function markup() {
    const color = project?.portfolio_categories?.color || '#e10613';
    const challenge = local(caseStudy, 'challenge');
    const approach = local(caseStudy, 'approach');
    const solution = local(caseStudy, 'solution');
    const role = local(caseStudy, 'role_text');
    const outcome = local(caseStudy, 'outcome');
    const c = copy();
    const slugClass = slug.replace(/[^a-z0-9-]/gi,'');

    return `<section class="v9-case-study v9-case-study-${esc(slugClass)}" data-v9-case-study style="--case-accent:${esc(color)}">
      <div class="v9-case-study-shell">
        <header class="v9-case-study-head">
          <div class="v9-case-study-intro">
            <p class="v9-case-kicker">${esc(c.kicker)}</p>
            <h2>${esc(c.heroA)}<br><span>${esc(c.heroB)}</span></h2>
            <p>${esc(c.intro)}</p>
          </div>
          ${metricsMarkup()}
        </header>
        <div class="v9-case-flow-intro">
          <small>${esc(c.journeyKicker)}</small>
          <h3>${esc(c.journeyTitle)}</h3>
          <p>${esc(c.journeyNote)}</p>
        </div>
        <div class="v9-case-flow">
          ${block(1,c.blocks[0],challenge)}
          ${block(2,c.blocks[1],approach)}
          ${block(3,c.blocks[2],solution)}
        </div>
        <div class="v9-case-detail-grid">
          <article class="v9-case-panel"><small>${esc(c.roleLabel)}</small><h3>${esc(c.roleTitle)}</h3><p>${text(role)}</p></article>
          <article class="v9-case-panel"><small>${esc(c.outcomeLabel)}</small><h3>${esc(c.outcomeTitle)}</h3><p>${text(outcome)}</p></article>
        </div>
        ${capabilityMarkup()}
        <div class="v9-case-cta">
          <div><small>${esc(c.ctaLabel)}</small><strong>${esc(c.ctaText)}</strong></div>
          <a href="/v9/#contact">${esc(c.cta)}</a>
        </div>
      </div>
    </section>`;
  }

  function place() {
    if (!caseStudy || document.querySelector('[data-v9-case-study]')) return true;
    const loading = root.querySelector('.project-loading');
    if (loading) return false;
    const host = document.createElement('div');
    host.innerHTML = markup();
    const section = host.firstElementChild;
    const gallery = root.querySelector('.gallery');
    if (gallery) gallery.insertAdjacentElement('beforebegin', section);
    else root.appendChild(section);
    return true;
  }

  function rerender() {
    const old = document.querySelector('[data-v9-case-study]');
    if (old) old.remove();
    place();
  }

  async function load() {
    const projectResult = await sb.from('portfolio_projects')
      .select('id,slug,title,title_ar,status,portfolio_categories(name,color)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (projectResult.error || !projectResult.data) return;
    project = projectResult.data;

    const caseResult = await sb.from('portfolio_project_case_studies')
      .select('*')
      .eq('project_id', project.id)
      .eq('case_study_status', 'published')
      .maybeSingle();
    if (caseResult.error || !caseResult.data) return;
    caseStudy = caseResult.data;

    if (place()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (place() || attempts > 50) clearInterval(timer);
    }, 120);
  }

  document.addEventListener('portfolio:languagechange', () => setTimeout(rerender, 20));
  load().catch(error => console.error('V9 case study load failed', error));
})();
