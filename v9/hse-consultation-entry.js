(() => {
  // Work-section refinement lives in separate files so the core public renderer stays stable.
  if(!document.querySelector('link[href*="v9-work-refine.css"]')){
    const workCss=document.createElement('link');
    workCss.rel='stylesheet';
    workCss.href='/v9/v9-work-refine.css?v=1';
    document.head.appendChild(workCss);
  }
  if(!document.querySelector('script[src*="v9-work-refine.js"]')){
    const workJs=document.createElement('script');
    workJs.src='/v9/v9-work-refine.js?v=1';
    workJs.async=false;
    document.body.appendChild(workJs);
  }

  const findHseCard=()=>[...document.querySelectorAll('.discipline-grid article')].find(card=>(card.querySelector('h3')?.textContent||'').toUpperCase().includes('SAFETY'));

  function install(){
    const hseCard=findHseCard();
    if(!hseCard||hseCard.querySelector('.hse-mini-cta'))return;
    const link=document.createElement('a');
    link.className='hse-mini-cta';
    link.href='/hse-world/';
    link.dataset.ieEn='NEED HSE SUPPORT? START WITH HSE WORLD →';
    link.dataset.ieAr='عندك حالة HSE؟ ابدأ من عالم HSE ←';
    link.textContent='NEED HSE SUPPORT? START WITH HSE WORLD →';
    hseCard.appendChild(link);
    syncLanguage();
  }

  function syncLanguage(){
    const ar=(document.body.dataset.lang||document.documentElement.lang||'').toLowerCase().startsWith('ar');
    document.querySelectorAll('[data-ie-en]').forEach(el=>{el.textContent=ar?el.dataset.ieAr:el.dataset.ieEn});
  }

  install();
  const grid=document.querySelector('.discipline-grid');
  if(grid)new MutationObserver(()=>install()).observe(grid,{childList:true,subtree:true});
  new MutationObserver(()=>{install();syncLanguage()}).observe(document.body,{attributes:true,attributeFilter:['data-lang']});
})();