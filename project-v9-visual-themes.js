(() => {
  const slug = decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1] || new URLSearchParams(location.search).get('slug') || '');
  if (!slug) return;

  const THEMES = {
    'hse-awareness-series': 'hse-awareness',
    'hse-digital-tools': 'digital-hse',
    'do-personalized-stories': 'do-stories',
    'magic-of-string-art': 'string-art',
    'hse-weekly-corrective-action-tracking': 'weekly-hse',
    'andrew-tharwat-personal-brand': 'personal-brand',
    'do-document-smart-document-intelligence': 'do-document'
  };

  const LABELS = {
    'digital-hse': { en: 'DIGITAL HSE · LIVE OPERATING SYSTEM', ar: 'HSE رقمي · نظام تشغيل مترابط' },
    'do-stories': { en: 'DO · PERSONALIZED STORY SYSTEM', ar: 'DO · نظام قصص مخصصة' },
    'string-art': { en: 'HANDCRAFT · THREAD GEOMETRY', ar: 'حرفة يدوية · هندسة بالخيط' },
    'weekly-hse': { en: 'HSE CONTROL · VERIFIED CLOSURE', ar: 'متابعة HSE · إغلاق قابل للتحقق' },
    'personal-brand': { en: 'ONE STUDIO · MULTIPLE DISCIPLINES', ar: 'استوديو واحد · تخصصات متعددة' },
    'do-document': { en: 'OCR · AI · STRUCTURED DATA', ar: 'OCR · AI · بيانات منظمة' },
    'hse-awareness': { en: 'HSE AWARENESS · PRACTICAL COMMUNICATION', ar: 'توعية HSE · تواصل عملي' }
  };

  const theme = THEMES[slug];
  if (!theme) return;

  const isAr = () => (window.PORTFOLIO_I18N?.getLang?.() || document.documentElement.lang || 'en') === 'ar';

  function apply() {
    document.body.classList.add('project-v9-themed', `project-theme-${theme}`);
    document.body.dataset.projectTheme = theme;

    const section = document.querySelector('[data-v9-case-study]');
    if (!section) return false;
    section.classList.add('v9-case-themed', `v9-theme-${theme}`);
    section.dataset.projectTheme = theme;

    const shell = section.querySelector('.v9-case-study-shell');
    if (shell) shell.dataset.themeLabel = LABELS[theme]?.[isAr() ? 'ar' : 'en'] || '';

    const hero = document.querySelector('.project-hero');
    if (hero) hero.dataset.projectTheme = theme;
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (apply() || attempts > 60) clearInterval(timer);
  }, 100);

  new MutationObserver(() => apply()).observe(document.getElementById('project-root') || document.body, { childList: true, subtree: true });
  document.addEventListener('portfolio:languagechange', () => setTimeout(apply, 30));
  apply();
})();