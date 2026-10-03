(() => {
  'use strict';

  if (window.__ATS_HOME_V2__) return;
  window.__ATS_HOME_V2__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    projects: [],
    caseById: new Map(),
    caseBySlug: new Map(),
    loaded: false,
    rendering: false,
    workObserver: null,
    renderTimer: null,
    expanded: false,
    workLayout: {},
  };

  const escapeHTML = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const firstValue = (...values) => values.find((value) => clean(value)) || '';
  const slugify = (value) => clean(value).toLowerCase().replace(/\s+/g, '-');

  const isArabic = () => (
    document.body?.dataset.lang === 'ar'
    || document.documentElement?.lang === 'ar'
    || document.body?.classList.contains('lang-ar')
  );

  const copy = (element, english, arabic, html = false) => {
    if (!element) return;
    const enKey = html ? 'data-en-html' : 'data-en';
    const arKey = html ? 'data-ar-html' : 'data-ar';
    element.removeAttribute(html ? 'data-en' : 'data-en-html');
    element.removeAttribute(html ? 'data-ar' : 'data-ar-html');
    element.setAttribute(enKey, english);
    element.setAttribute(arKey, arabic || english);
    if (html) element.innerHTML = isArabic() ? (arabic || english) : english;
    else element.textContent = isArabic() ? (arabic || english) : english;
  };

  const syncLanguage = () => {
    const arabic = isArabic();
    $$('[data-en], [data-ar]').forEach((element) => {
      const value = arabic ? element.getAttribute('data-ar') : element.getAttribute('data-en');
      if (value !== null) element.textContent = value;
    });
    $$('[data-en-html], [data-ar-html]').forEach((element) => {
      const value = arabic ? element.getAttribute('data-ar-html') : element.getAttribute('data-en-html');
      if (value !== null) element.innerHTML = value;
    });
    renderProjects();
  };

  const addCss = () => {
    if ($('link[href*="v9-home-v2.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/v9/v9-home-v2.css?v=2';
    document.head.appendChild(link);
  };

  const addClass = (element, ...names) => {
    if (element) element.classList.add(...names);
  };

  function updateHeader() {
    const header = $('.site-header');
    if (!header) return;
    addClass(header, 'ats-header-v2');

    const nav = $('#main-nav');
    if (nav) {
      const links = $$('a', nav).filter((link) => !link.classList.contains('nav-client-access'));
      const linkConfig = [
        { match: /#home|^\/$/, en: 'HOME', ar: 'الرئيسية', href: '#home' },
        { match: /#studio|#how/i, en: 'METHOD', ar: 'المنهج', href: '#studio' },
        { match: /#capabilities|#expertise/i, en: 'CAPABILITIES', ar: 'القدرات', href: '#capabilities' },
        { match: /#work|#projects/i, en: 'WORK', ar: 'الأعمال', href: '#work' },
        { match: /#contact|#start/i, en: 'START', ar: 'ابدأ', href: '#contact' },
      ];

      links.slice(0, linkConfig.length).forEach((link, index) => {
        const config = linkConfig.find((item) => item.match.test(link.getAttribute('href') || '')) || linkConfig[index];
        if (!config) return;
        link.href = config.href;
        link.classList.toggle('nav-home', config.href === '#home');
        link.removeAttribute('data-icon');
        copy(link, config.en, config.ar);
      });

      let access = $('.nav-client-access', nav);
      if (!access) {
        access = document.createElement('a');
        access.className = 'nav-client-access';
        access.href = '/client-access/';
        nav.appendChild(access);
        access.addEventListener('click', () => {
          if ($('#menu-toggle')?.getAttribute('aria-expanded') === 'true') $('#menu-toggle').click();
        });
      }
      copy(access, 'CLIENT ACCESS', 'دخول العميل');
      ['#studio', '#work', '#capabilities', '#contact'].forEach((href) => {
        const link = $(`a[href="${href}"]`, nav);
        if (link) nav.insertBefore(link, access);
      });
    }

    const headerCTA = $('.header-cta');
    if (headerCTA) {
      headerCTA.href = '#contact';
      copy(headerCTA, 'BRING US THE PROBLEM', 'احكِ لنا المشكلة');
    }
  }

  function updateHero() {
    const hero = $('#home');
    if (!hero) return;
    addClass(hero, 'v2-hero');

    const title = $('#hero-title', hero) || $('h1', hero);
    copy(title, 'BRING THE PROBLEM.<br><span>WE BUILD THE SOLUTION.</span>', 'ابدأ بالمشكلة.<br><span>وإحنا نبني الحل.</span>', true);

    const subtitle = $('#hero-subtitle', hero) || $('.hero-subtitle', hero) || $('p', hero);
    copy(subtitle, 'Different minds. Different tools. One direction.', 'عقول مختلفة. أدوات مختلفة. اتجاه واحد.');

    const actions = $('.hero-actions', hero) || $('.hero-ctas', hero) || $('.hero-content', hero);
    const candidates = actions ? $$('a, button', actions) : $$('a, button', hero);
    const primary = candidates.find((element) => element.classList.contains('btn-primary')) || candidates[0];
    const secondary = candidates.find((element) => element.classList.contains('btn-secondary')) || candidates[1];

    if (primary) {
      primary.href = '#contact';
      primary.removeAttribute('data-scroll-target');
      copy(primary, 'BRING US THE PROBLEM', 'احكِ لنا المشكلة');
    }
    if (secondary) {
      secondary.href = '#work';
      secondary.removeAttribute('data-scroll-target');
      copy(secondary, 'EXPLORE THE WORK', 'استكشف الأعمال');
    }
    $('.process-strip', hero)?.setAttribute('hidden', 'hidden');
    copy($('.problem-sphere span', hero), 'PROBLEM', 'المشكلة');
    copy($('.solution-sphere span', hero), 'SOLUTION', 'الحل');
    const visual = $('.v10-open-system', hero);
    if (visual) visual.setAttribute('aria-label', isArabic()
      ? 'AT Studio يجمع الخبرات المناسبة حول المشكلة لبناء الحل.'
      : 'AT Studio assembles the right expertise around the problem to build a solution.');
  }

  function buildMethod() {
    const section = $('#studio');
    if (!section || section.dataset.atsV2Built === 'true') return;
    section.dataset.atsV2Built = 'true';
    addClass(section, 'v2-method-section');
    section.innerHTML = `
      <div class="container"><div class="section-head v2-section-head">
        <p class="eyebrow" data-en="HOW ATS THINKS" data-ar="كيف يفكر ATS">HOW ATS THINKS</p>
        <h2 data-en="One connected process." data-ar="منهج واحد مترابط.">One connected process.</h2>
      </div>
      <div class="v2-method-flow" aria-label="AT Studio method">
        <article class="v2-method-step"><span>01</span><h3 data-en="THE PROBLEM" data-ar="المشكلة">THE PROBLEM</h3><p data-en="What is really happening?" data-ar="ما الذي يحدث فعلًا؟">What is really happening?</p></article>
        <article class="v2-method-step"><span>02</span><h3 data-en="UNDERSTAND" data-ar="نفهم">UNDERSTAND</h3><p data-en="Frame the real need." data-ar="نحدد الاحتياج الحقيقي.">Frame the real need.</p></article>
        <article class="v2-method-step"><span>03</span><h3 data-en="ASSEMBLE" data-ar="نجمع">ASSEMBLE</h3><p data-en="Bring the right expertise." data-ar="نجمع الخبرة المناسبة.">Bring the right expertise.</p></article>
        <article class="v2-method-step"><span>04</span><h3 data-en="BUILD" data-ar="نبني">BUILD</h3><p data-en="Make it useful." data-ar="نجعله مفيدًا.">Make it useful.</p></article>
        <article class="v2-method-step"><span>05</span><h3 data-en="REAL SOLUTION" data-ar="حل حقيقي">REAL SOLUTION</h3><p data-en="Work that holds up." data-ar="حل يصمد في الواقع.">Work that holds up.</p></article>
      </div></div>`;
  }

  function buildCapabilities() {
    const section = $('#capabilities');
    if (!section || section.dataset.atsV2Built === 'true') return;
    section.dataset.atsV2Built = 'true';
    addClass(section, 'v2-capabilities-section');
    section.innerHTML = `
      <div class="container"><div class="section-head v2-section-head">
        <p class="eyebrow" data-en="CAPABILITIES" data-ar="القدرات">CAPABILITIES</p>
        <h2 data-en="Capabilities are tools." data-ar="القدرات أدوات.">Capabilities are tools.</h2>
        <p class="section-intro" data-en="The problem sets the mix. We assemble only what the work needs." data-ar="المشكلة تحدد المزيج. نجمع فقط ما يحتاجه العمل.">The problem sets the mix. We assemble only what the work needs.</p>
      </div>
      <div class="v2-capability-grid">
        <article class="v2-capability-item"><span class="v2-capability-index">01</span><h3 data-en="CREATIVE" data-ar="إبداعي">CREATIVE</h3><p data-en="Identity · Content · Direction" data-ar="هوية · محتوى · توجيه">Identity · Content · Direction</p></article>
        <article class="v2-capability-item"><span class="v2-capability-index">02</span><h3 data-en="DIGITAL" data-ar="رقمي">DIGITAL</h3><p data-en="Web · Automation · Data" data-ar="ويب · أتمتة · بيانات">Web · Automation · Data</p></article>
        <article class="v2-capability-item"><span class="v2-capability-index">03</span><h3 data-en="AI &amp; SYSTEMS" data-ar="الذكاء الاصطناعي والأنظمة">AI &amp; SYSTEMS</h3><p data-en="Intelligence · Workflows · Production" data-ar="ذكاء · مسارات عمل · إنتاج">Intelligence · Workflows · Production</p></article>
        <article class="v2-capability-item"><span class="v2-capability-index">04</span><h3 data-en="OPERATIONAL / HSE" data-ar="التشغيل / السلامة">OPERATIONAL / HSE</h3><p data-en="People · Risk · Systems" data-ar="أفراد · مخاطر · أنظمة">People · Risk · Systems</p></article>
      </div></div>`;
  }

  function updateWorkIntro() {
    const section = $('#work');
    if (!section) return;
    addClass(section, 'v2-work-section');
    const head = $('.section-head', section) || $('header', section);
    if (!head) return;
    const eyebrow = $('.eyebrow', head) || $('p', head);
    const title = $('h2', head) || $('h3', head);
    const intro = $('.section-intro', head) || $('p:not(.eyebrow)', head);
    copy(eyebrow, 'SELECTED PROOF', 'أعمال تثبت المنهج');
    copy(title, 'REAL WORK. DIFFERENT PROBLEMS.', 'أعمال حقيقية. مشاكل مختلفة.');
    copy(intro, 'The problem. The thinking. What was built.', 'المشكلة. طريقة التفكير. وما تم بناؤه.');
    if (intro) intro.classList.add('v2-work-intro');
  }

  function buildClientAccess() {
    if ($('#client-access')) return;
    const contact = $('#contact');
    if (!contact) return;
    const section = document.createElement('section');
    section.id = 'client-access';
    section.className = 'v2-client-access-section';
    section.innerHTML = `
      <div class="container v2-client-access-inner"><div>
        <p class="eyebrow" data-en="EXISTING CLIENT" data-ar="عميل حالي">EXISTING CLIENT</p>
        <h2 data-en="CLIENT ACCESS" data-ar="دخول العميل">CLIENT ACCESS</h2>
      </div>
      <div class="v2-client-access-copy">
        <p data-en="Already working with AT Studio? Return to your request workspace and continue where you left off." data-ar="تعمل بالفعل مع AT Studio؟ عد إلى مساحة طلبك وتابع من حيث توقفت.">Already working with AT Studio? Return to your request workspace and continue where you left off.</p>
        <a class="btn ghost v2-client-access-link" href="/client-access/" data-en="OPEN CLIENT ACCESS" data-ar="فتح بوابة العميل">OPEN CLIENT ACCESS</a>
      </div></div>`;
    contact.insertAdjacentElement('afterend', section);
  }

  function updateContact() {
    const section = $('#contact');
    if (!section) return;
    addClass(section, 'v2-start-section');
    const head = $('.section-head', section) || $('header', section);
    const title = head && ($('h2', head) || $('h3', head));
    const intro = head && ($('.section-intro', head) || $('p:not(.eyebrow)', head));
    copy(title, 'BRING US<br><span>THE PROBLEM.</span>', 'احكِ لنا<br><span>المشكلة.</span>', true);
    copy(intro, 'Tell us what needs to work. We will shape the next step with you.', 'أخبرنا بما يجب أن يعمل. سنحدد معك الخطوة التالية.');

    // The existing intake begins immediately below this heading; keep its DOM and handlers.
    $('.concierge-legacy-brief', section)?.setAttribute('hidden', 'hidden');
  }

  function updateFooter() {
    const footer = $('footer');
    if (!footer) return;
    addClass(footer, 'ats-footer-v2');
    const nav = $('.footer-nav', footer) || $('nav', footer) || footer;
    const ensureLink = (href, className, english, arabic) => {
      if ([...nav.querySelectorAll('a')].some((link) => (link.getAttribute('href') || '').replace(/\/$/, '') === href.replace(/\/$/, ''))) return;
      const link = document.createElement('a');
      link.href = href;
      link.className = className;
      copy(link, english, arabic);
      nav.appendChild(link);
    };
    ensureLink('/client-access/', 'footer-client-access', 'CLIENT ACCESS', 'دخول العميل');
    ensureLink('/join/', 'footer-specialist-network', 'SPECIALIST NETWORK', 'شبكة المتخصصين');
    copy($('p', footer), 'AT Studio — Build what works.', 'AT Studio — نبني ما يعمل.');
  }

  function hideInternalUI() {
    $$('.concierge-legacy-brief, [data-development-only], [data-dev-only], .debug-content, .development-label, .technical-placeholder').forEach((element) => {
      element.setAttribute('hidden', 'hidden');
      element.setAttribute('aria-hidden', 'true');
    });
    const team = $('#team');
    if (team) {
      team.setAttribute('hidden', 'hidden');
      team.setAttribute('aria-hidden', 'true');
      addClass(team, 'v2-specialist-hidden');
    }
  }

  function reorderJourney() {
    const main = $('main');
    if (!main) return;
    ['home', 'studio', 'work', 'capabilities', 'contact', 'client-access', 'team']
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((section) => main.appendChild(section));
  }

  function textFor(project, key) {
    const arabic = isArabic();
    return clean(firstValue(
      arabic ? project[`${key}_ar`] : '',
      project[key],
      arabic ? project[`${key}Ar`] : '',
    ));
  }

  function caseText(caseStudy, key) {
    if (!caseStudy) return '';
    const arabic = isArabic();
    return clean(firstValue(
      arabic ? caseStudy[`${key}_ar`] : '',
      caseStudy[key],
      arabic ? caseStudy[`${key}Ar`] : '',
    ));
  }

  function caseFor(project) {
    return state.caseById.get(String(project.id))
      || state.caseBySlug.get(String(project.slug || '').toLowerCase())
      || null;
  }

  function projectContext(project) {
    return textFor(project, 'excerpt') || textFor(project, 'description');
  }

  function tagsFor(project) {
    const tags = isArabic() ? firstValue(project.tags_ar, project.tags) : firstValue(project.tags, project.tags_ar);
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map(clean).filter(Boolean);
    return [];
  }

  function hrefFor(project) {
    const slug = clean(project.slug);
    return slug ? `/projects/${encodeURIComponent(slug)}` : '#work';
  }

  function fieldBlock(label, value, extraClass = '') {
    if (!value) return '';
    return `<div class="v2-case-field ${extraClass}"><span>${label}</span><p>${escapeHTML(value)}</p></div>`;
  }

  function imageMarkup(project, featured = false) {
    const title = escapeHTML(textFor(project, 'title'));
    const source = clean(project.cover_url);
    const url = /^https?:\/\//i.test(source) ? source : source && !/^[a-z][a-z0-9+.-]*:/i.test(source)
      ? `/${source.replace(/^\/+/, '')}` : '';
    return url
      ? `<div class="v2-case-image"><img src="${escapeHTML(url)}" alt="${title}" loading="${featured ? 'eager' : 'lazy'}"></div>`
      : '<div class="v2-case-image v2-case-image-empty" aria-hidden="true"></div>';
  }

  function cardMarkup(project, featured = false) {
    const study = caseFor(project);
    const title = textFor(project, 'title') || 'AT Studio project';
    const context = projectContext(project);
    const problem = caseText(study, 'challenge');
    const thinking = caseText(study, 'approach');
    const built = caseText(study, 'solution');
    const result = caseText(study, 'outcome');
    const tags = tagsFor(project).slice(0, 4);
    const hasCaseFields = Boolean(problem || thinking || built || result);
    const fields = hasCaseFields
      ? [
        fieldBlock(isArabic() ? 'المشكلة' : 'THE PROBLEM', problem),
        fieldBlock(isArabic() ? 'طريقة التفكير' : 'THE THINKING', thinking),
        fieldBlock(isArabic() ? 'ما بنيناه' : 'WHAT WE BUILT', built),
        fieldBlock(isArabic() ? 'النتيجة' : 'THE RESULT', result),
      ].join('')
      : fieldBlock(isArabic() ? 'عن المشروع' : 'PROJECT CONTEXT', context, 'v2-case-context');

    return `
      <article class="v2-case-card ${featured ? 'v2-case-card-featured' : ''}" data-project-slug="${escapeHTML(project.slug || '')}">
        <a class="v2-case-card-link" href="${hrefFor(project)}" aria-label="${isArabic() ? 'عرض' : 'Open'} ${escapeHTML(title)}">
          ${imageMarkup(project, featured)}
          <div class="v2-case-card-body">
            <div class="v2-case-card-meta"><span>${isArabic() ? (featured ? 'مشروع مميز' : 'أعمال مختارة') : (featured ? 'FEATURED CASE' : 'SELECTED WORK')}</span></div>
            <h3>${escapeHTML(title)}</h3>
            <div class="v2-case-fields">${fields}</div>
            ${tags.length ? `<div class="v2-case-tags">${tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>` : ''}
            <span class="v2-case-open">${isArabic() ? 'تفاصيل المشروع' : 'OPEN CASE'}</span>
          </div>
        </a>
      </article>`;
  }

  function activeFilter() {
    const filter = $('#project-filters');
    if (!filter) return 'all';
    const active = $('.active', filter) || $('[aria-pressed="true"]', filter);
    return slugify(active?.dataset.filter || active?.dataset.category || active?.textContent || 'all');
  }

  function activeSearch() {
    return clean($('#project-search')?.value).toLowerCase();
  }

  function matchesFilter(project, filter) {
    if (!filter || filter === 'all' || filter === 'all-projects') return true;
    // Match the existing CMS filter rules rather than matching arbitrary substrings in tags.
    const name = clean(project.portfolio_categories?.name || '').toLowerCase();
    const category = name.includes('safety') ? 'safety' : name.includes('digital') ? 'digital'
      : /creative|design/.test(name) ? 'creative' : /story|ai/.test(name) ? 'ai' : 'other';
    return filter === category;
  }

  function matchesSearch(project, query) {
    if (!query) return true;
    const haystack = [
      project.title, project.title_ar,
      project.slug,
      project.excerpt, project.excerpt_ar,
      textFor(project, 'description'),
      tagsFor(project).join(' '),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function visibleProjects() {
    const filter = activeFilter();
    const query = activeSearch();
    return state.projects.filter((project) => matchesFilter(project, filter) && matchesSearch(project, query));
  }

  function renderProjects() {
    if (!state.loaded || state.rendering) return;
    const featuredRoot = $('#featured-project');
    const grid = $('#project-grid');
    if (!featuredRoot || !grid) return;
    const all = visibleProjects();
    const defaultView = activeFilter() === 'all' && !activeSearch();
    const featured = defaultView && (state.projects.find((project) => project.featured) || state.projects[0]);
    const ordered = featured ? [featured, ...all.filter(project => project.id !== featured.id)] : all;
    const visible = defaultView && !state.expanded ? ordered.slice(0, 3) : ordered;
    const visibleFeatured = featured && visible.some((project) => String(project.id) === String(featured.id)) ? featured : null;
    const cards = visible.filter((project) => !visibleFeatured || String(project.id) !== String(visibleFeatured.id));

    state.rendering = true;
    state.workObserver?.disconnect();
    try {
      featuredRoot.classList.remove('skeleton', 'v10-featured-proof');
      featuredRoot.classList.toggle('hidden', !visibleFeatured);
      featuredRoot.innerHTML = visibleFeatured ? cardMarkup(visibleFeatured, true) : '';
      featuredRoot.hidden = !visibleFeatured;
      grid.innerHTML = cards.map((project) => cardMarkup(project)).join('');
      const empty = $('#project-empty');
      if (empty) {
        empty.hidden = Boolean(visibleFeatured || cards.length);
        empty.classList.toggle('hidden', !empty.hidden ? false : true);
      }
      addClass(grid, 'v2-project-grid');
      addClass(featuredRoot, 'v2-featured-project');
      let more = $('#v2-more-work');
      if (!more) {
        more = document.createElement('button');
        more.type = 'button';
        more.id = 'v2-more-work';
        more.className = 'btn ghost v2-more-work';
        grid.insertAdjacentElement('afterend', more);
        more.addEventListener('click', () => { state.expanded = true; renderProjects(); });
      }
      more.hidden = !defaultView || state.expanded || all.length <= visible.length;
      copy(more, 'EXPLORE MORE WORK', 'استكشف باقي الأعمال');
    } finally {
      state.rendering = false;
      [grid, featuredRoot].forEach(target => state.workObserver?.observe(target, { childList: true }));
    }
  }

  async function loadProjectData() {
    const config = window.PORTFOLIO_CONFIG || {};
    const supabaseUrl = config.supabaseUrl || config.url;
    const supabaseKey = config.supabaseKey || config.supabaseAnonKey || config.anonKey;
    if (!supabaseUrl || !supabaseKey || !window.supabase?.createClient) return;

    try {
      const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: { storageKey: 'ats-home-proof-readonly', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const [projectsResponse, casesResponse, settingsResponse] = await Promise.all([
        client.from('portfolio_projects')
          .select('id,slug,title,title_ar,excerpt,excerpt_ar,description,description_ar,cover_url,tags,tags_ar,featured,sort_order,status,portfolio_categories(name,color)')
          .eq('status', 'published')
          .order('sort_order', { ascending: true }),
        client.from('portfolio_project_case_studies')
          .select('*')
          .eq('case_study_status', 'published'),
        client.from('portfolio_site_settings').select('key,value').eq('key', 'v9_layout'),
      ]);

      const projects = projectsResponse.data || [];
      if (projectsResponse.error || settingsResponse.error || !projects.length) return;
      state.workLayout = settingsResponse.data?.[0]?.value?.work || {};
      const hidden = new Set(state.workLayout.hidden || []);
      const bySlug = new Map(projects.filter(project => !hidden.has(project.slug)).map(project => [project.slug, project]));
      const ordered = [];
      (state.workLayout.order || []).forEach(slug => {
        if (bySlug.has(slug)) { ordered.push(bySlug.get(slug)); bySlug.delete(slug); }
      });
      state.projects = [...ordered, ...bySlug.values()];
      (casesResponse.data || []).forEach((item) => {
        if (item.project_id !== undefined && item.project_id !== null) state.caseById.set(String(item.project_id), item);
        const slug = item.project_slug || item.slug || item.project?.slug;
        if (slug) state.caseBySlug.set(String(slug).toLowerCase(), item);
      });
      state.loaded = true;
      renderProjects();
    } catch (error) {
      console.warn('[ATS] Homepage case study enhancement unavailable; keeping existing work cards.', error);
    }
  }

  function watchWork() {
    if (state.workObserver || !$('#project-grid')) return;
    const targets = [$('#project-grid'), $('#featured-project')].filter(Boolean);
    state.workObserver = new MutationObserver(() => {
      if (state.rendering || !state.loaded) return;
      window.clearTimeout(state.renderTimer);
      state.renderTimer = window.setTimeout(renderProjects, 30);
    });
    targets.forEach((target) => state.workObserver.observe(target, { childList: true }));
    $('#project-filters')?.addEventListener('click', () => { state.expanded = false; window.setTimeout(renderProjects, 0); });
    $('#project-search')?.addEventListener('input', () => { state.expanded = false; window.setTimeout(renderProjects, 0); });
  }

  function applyStaticLayer() {
    document.body.classList.add('ats-home-v2');
    addCss();
    updateHeader();
    updateHero();
    buildMethod();
    updateWorkIntro();
    buildCapabilities();
    buildClientAccess();
    updateContact();
    hideInternalUI();
    reorderJourney();
    updateFooter();
    watchWork();
    syncLanguage();
  }

  function boot() {
    applyStaticLayer();
    loadProjectData();
    $('#lang-toggle')?.addEventListener('click', () => window.setTimeout(() => {
      applyStaticLayer();
    }, 100));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
