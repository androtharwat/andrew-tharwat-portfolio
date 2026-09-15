(() => {
  const menu=document.getElementById('menu-toggle');
  const nav=document.getElementById('main-nav');
  if(!menu||!nav)return;

  const close=()=>{
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','Open navigation');
  };
  const open=()=>{
    nav.classList.add('open');
    document.body.classList.add('nav-open');
    menu.setAttribute('aria-expanded','true');
    menu.setAttribute('aria-label','Close navigation');
  };

  menu.addEventListener('click',()=>nav.classList.contains('open')?close():open());
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>1180)close()},{passive:true});
})();