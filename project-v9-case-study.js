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
  const isHse = () => slug === 'hse-awareness-series';
  let project = null;
  let caseStudy = null;

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
    const ar = isAr();
    if (isHse()) {
      return ar ? {
        kicker:'V9 · دراسة حالة',
        heroA:'كيف تحولت سلسلة التوعية',
        heroB:'إلى نظام توعوي عملي؟',
        intro:'نظرة على طريقة التفكير والتنفيذ وراء سلسلة التوعية بالسلامة والصحة المهنية، بداية من فهم التحدي، مرورًا ببناء الرسائل، وحتى تطوير مكتبة توعوية قابلة للتوسع.',
        journeyKicker:'رحلة المشروع',
        journeyTitle:'من الفكرة إلى التنفيذ',
        journeyNote:'ثلاث مراحل مختلفة، لكل منها دور واضح في تحويل المعرفة الفنية إلى محتوى مفهوم وقابل للاستخدام.',
        blocks:[
          {label:'التحدي',title:'تحويل مفاهيم السلامة المعقدة إلى رسائل سريعة وواضحة'},
          {label:'المنهج',title:'البدء من المخاطر الحقيقية وليس من الشرح النظري'},
          {label:'الحل',title:'تطوير مكتبة توعوية قابلة لإعادة الاستخدام'}
        ],
        roleLabel:'الدور والمسؤولية', roleTitle:'ما الذي تم تنفيذه داخل المشروع؟',
        outcomeLabel:'النتيجة', outcomeTitle:'ما الذي أصبح موجودًا في النهاية؟',
        ctaLabel:'هل لديك تحدٍ مشابه؟', ctaText:'ابدأ بالمشكلة، ونبني لك المسار المناسب.', cta:'ابدأ مشروعك ←'
      } : {
        kicker:'V9 · CASE STUDY',
        heroA:'HOW A SAFETY AWARENESS SERIES',
        heroB:'BECAME A WORKING SYSTEM.',
        intro:'A look at the thinking and execution behind the HSE Awareness Series — from understanding the challenge and shaping the message to building a reusable awareness library.',
        journeyKicker:'PROJECT JOURNEY',
        journeyTitle:'FROM IDEA TO EXECUTION',
        journeyNote:'Three distinct stages, each with a clear role in turning technical safety knowledge into usable communication.',
        blocks:[
          {label:'THE CHALLENGE',title:'Turn complex safety concepts into fast, clear messages'},
          {label:'THE APPROACH',title:'Start from real hazards, not abstract theory'},
          {label:'THE SOLUTION',title:'Build a reusable awareness library'}
        ],
        roleLabel:'ROLE & RESPONSIBILITY', roleTitle:'What was actually led and delivered?',
        outcomeLabel:'OUTCOME', outcomeTitle:'What exists at the end?',
        ctaLabel:'HAVE A SIMILAR CHALLENGE?', ctaText:'Bring the problem. We’ll shape the right path.', cta:'START A PROJECT →'
      };
    }
    return ar ? {
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

    return `<section class="v9-case-study${isHse() ? ' v9-case-study-hse' : ''}" data-v9-case-study style="--case-accent:${esc(color)}">
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
