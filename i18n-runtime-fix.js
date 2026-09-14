(()=>{
  const refresh=()=>{
    const api=window.PORTFOLIO_I18N;if(!api)return;
    api.refresh?.();
    const ar=api.getLang?.()==='ar';
    const cta=document.querySelector('.site-header .header-cta');
    if(cta){const wanted=ar?'تواصل معي':'Let\'s Talk';if((cta.textContent||'').replace(/[→←]/g,'').trim()!==wanted)cta.innerHTML=`${wanted} <span>${ar?'←':'→'}</span>`;}
  };
  refresh();
  document.addEventListener('portfolio:languagechange',()=>setTimeout(refresh,0));
  document.addEventListener('portfolio:contentrendered',()=>setTimeout(refresh,0));
  setTimeout(refresh,350);setTimeout(refresh,1200);
})();