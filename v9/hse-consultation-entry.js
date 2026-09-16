(() => {
  const capabilities = document.querySelector('#capabilities');
  const hseCard = [...document.querySelectorAll('.discipline-grid article')].find(card => (card.querySelector('h3')?.textContent || '').toUpperCase().includes('SAFETY'));
  if (!capabilities || document.querySelector('.hse-consultation-strip')) return;

  const strip = document.createElement('section');
  strip.className = 'hse-consultation-strip';
  strip.innerHTML = `<div class="hse-consultation-card"><div><small data-ie-en="PROFESSIONAL HSE CONSULTATION" data-ie-ar="استشارة HSE احترافية">PROFESSIONAL HSE CONSULTATION</small><h3 data-ie-en="Not sure what service you need? Start with the problem." data-ie-ar="مش متأكد محتاج أنهي خدمة؟ ابدأ بالمشكلة.">Not sure what service you need? Start with the problem.</h3><p data-ie-en="One focused 60-minute consultation for $75. After we understand the case, you only see the services that actually make sense for it — nothing is added automatically." data-ie-ar="استشارة مركزة لمدة 60 دقيقة بقيمة 75 دولار. بعد ما نفهم الحالة، يظهر لك فقط ما تحتاجه فعلًا — ولا يتم إضافة أي خدمة تلقائيًا.">One focused 60-minute consultation for $75. After we understand the case, you only see the services that actually make sense for it — nothing is added automatically.</p></div><div class="hse-consultation-action"><div class="hse-consultation-price"><b>$75</b><span data-ie-en="CONSULTATION ONLY" data-ie-ar="للاستشارة فقط">CONSULTATION ONLY</span></div><a href="/hse-consultation/" data-ie-en="START CONSULTATION →" data-ie-ar="ابدأ الاستشارة ←">START CONSULTATION →</a></div></div>`;
  capabilities.insertAdjacentElement('afterend', strip);

  if (hseCard && !hseCard.querySelector('.hse-mini-cta')) {
    const link = document.createElement('a');
    link.className = 'hse-mini-cta';
    link.href = '/hse-consultation/';
    link.dataset.ieEn = 'START WITH A $75 CONSULTATION →';
    link.dataset.ieAr = 'ابدأ باستشارة $75 ←';
    link.textContent = 'START WITH A $75 CONSULTATION →';
    hseCard.appendChild(link);
  }

  function syncLanguage() {
    const ar = (document.body.dataset.lang || document.documentElement.lang || '').toLowerCase().startsWith('ar');
    document.querySelectorAll('[data-ie-en]').forEach(el => {
      el.textContent = ar ? el.dataset.ieAr : el.dataset.ieEn;
    });
  }
  syncLanguage();
  new MutationObserver(syncLanguage).observe(document.body, { attributes: true, attributeFilter: ['data-lang'] });
})();
