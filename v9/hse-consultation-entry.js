(() => {
  const findHseCard=()=>[...document.querySelectorAll('.discipline-grid article')].find(card=>(card.querySelector('h3')?.textContent||'').toUpperCase().includes('SAFETY'));

  function install(){
    const hseCard=findHseCard();
    if(!hseCard||hseCard.querySelector('.hse-mini-cta'))return;
    const link=document.createElement('a');
    link.className='hse-mini-cta';
    link.href='/hse-consultation/';
    link.dataset.ieEn='NEED HSE ADVICE? CONSULTATION · $75 →';
    link.dataset.ieAr='عندك حالة HSE؟ استشارة · $75 ←';
    link.textContent='NEED HSE ADVICE? CONSULTATION · $75 →';
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