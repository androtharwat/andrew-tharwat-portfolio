(() => {
  const $ = s => document.querySelector(s);
  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  function lang(){try{return (localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en')==='ar'?'ar':'en'}catch(_e){return'en'}}
  const t=(en,ar)=>lang()==='ar'?ar:en;
  function openHseShell(){
    $('#portal-empty')?.classList.add('hidden');
    $('#portal-app')?.classList.remove('hidden');
    document.querySelectorAll('.portal-view').forEach(v=>v.classList.toggle('active',v.dataset.portalView==='hse'));
    document.querySelectorAll('[data-portal-nav]').forEach(v=>v.classList.toggle('active',v.dataset.portalNav==='hse'));
    if($('#portal-title'))$('#portal-title').textContent=t('HSE Consultation','استشارة HSE');
    if($('#portal-subtitle'))$('#portal-subtitle').textContent=t('One clear next step at a time.','خطوة واحدة واضحة في كل مرحلة.');
  }
  function addEmptyCta(){
    const box=$('#portal-empty');if(!box||box.querySelector('[data-open-hse-empty]'))return;
    const a=document.createElement('a');a.href='#hse';a.dataset.portalNav='hse';a.dataset.openHseEmpty='1';a.textContent=t('START HSE CONSULTATION →','ابدأ استشارة HSE ←');box.appendChild(a);
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-portal-nav="hse"]'))setTimeout(openHseShell,0)});
  window.addEventListener('hashchange',()=>{if(location.hash==='#hse')openHseShell()});
  window.addEventListener('storage',e=>{if([LANG_KEY,PORTFOLIO_LANG_KEY].includes(e.key)){addEmptyCta();if(location.hash==='#hse')openHseShell()}});
  new MutationObserver(()=>{addEmptyCta();if(location.hash==='#hse')openHseShell()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  addEmptyCta();if(location.hash==='#hse')openHseShell();
})();
