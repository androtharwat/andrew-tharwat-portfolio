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

  function block(index, labelEn, labelAr, body) {
    return `<article class="v9-case-block"><span>${String(index).padStart(2,'0')}</span><small>${isAr() ? labelAr : labelEn}</small><h3>${isAr() ? 'من التحدي إلى حل عملي' : 'From challenge to practical solution'}</h3><p>${text(body)}</p></article>`;
  }

  function markup() {
    const color = project?.portfolio_categories?.color || '#e10613';
    const challenge = local(caseStudy, 'challenge');
    const approach = local(caseStudy, 'approach');
    const solution = local(caseStudy, 'solution');
    const role = local(caseStudy, 'role_text');
    const outcome = local(caseStudy, 'outcome');
    const title = local(project, 'title') || project?.title || '';

    return `<section class="v9-case-study" data-v9-case-study style="--case-accent:${esc(color)}">
      <div class="v9-case-study-shell">
        <header class="v9-case-study-head">
          <div>
            <p class="v9-case-kicker">${isAr() ? 'V9 · دراسة حالة' : 'V9 · CASE STUDY'}</p>
            <h2>${isAr() ? 'كيف تحولت المشكلة إلى' : 'HOW THE PROBLEM BECAME'}<br><span>${isAr() ? 'حل قابل للتنفيذ.' : 'A WORKING SOLUTION.'}</span></h2>
            <p>${isAr() ? `نظرة على طريقة التفكير والتنفيذ وراء ${esc(title)} — من فهم التحدي وحتى بناء المخرج النهائي.` : `A closer look at the thinking and execution behind ${esc(title)} — from framing the challenge to building the final outcome.`}</p>
          </div>
          ${metricsMarkup()}
        </header>
        <div class="v9-case-flow">
          ${block(1,'THE CHALLENGE','التحدي',challenge)}
          ${block(2,'THE APPROACH','المنهج',approach)}
          ${block(3,'THE SOLUTION','الحل',solution)}
        </div>
        <div class="v9-case-detail-grid">
          <article class="v9-case-panel"><small>${isAr() ? 'الدور والمسؤولية' : 'ROLE & RESPONSIBILITY'}</small><h3>${isAr() ? 'ما الذي تم قيادته وتنفيذه؟' : 'What was led and delivered?'}</h3><p>${text(role)}</p></article>
          <article class="v9-case-panel"><small>${isAr() ? 'النتيجة' : 'OUTCOME'}</small><h3>${isAr() ? 'ما الذي أصبح موجودًا في النهاية؟' : 'What exists at the end?'}</h3><p>${text(outcome)}</p></article>
        </div>
        ${capabilityMarkup()}
        <div class="v9-case-cta">
          <div><small>${isAr() ? 'هل لديك تحدٍ مشابه؟' : 'HAVE A SIMILAR CHALLENGE?'}</small><strong>${isAr() ? 'ابدأ بالمشكلة، ونبني المسار المناسب.' : 'Bring the problem. We’ll shape the right path.'}</strong></div>
          <a href="/v9/#contact">${isAr() ? 'ابدأ مشروعًا ←' : 'START A PROJECT →'}</a>
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
