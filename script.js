(()=>{if(!document.querySelector('link[href*="i18n.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/i18n.css?v=1';document.head.appendChild(l)}if(!document.querySelector('script[src*="i18n.js"]')){const s=document.createElement('script');s.src='/i18n.js?v=1';s.defer=true;document.head.appendChild(s)}})();
const header=document.querySelector('.site-header');const menu=document.querySelector('.menu-btn');const nav=document.querySelector('.main-nav');const links=[...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll',()=>header?.classList.toggle('scrolled',scrollY>20),{passive:true});
menu?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');menu.setAttribute('aria-expanded',String(!!open));});
links.forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'80px 0px'});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const sections=[...document.querySelectorAll('main section[id]')];const spy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-35% 0px -55% 0px'});sections.forEach(s=>spy.observe(s));
const primary=document.querySelector('.hero-actions .btn-primary');if(primary)primary.href='/work';const projectNav=document.querySelector('.main-nav a[href="#featured"]');if(projectNav)projectNav.href='/work';const viewAll=[...document.querySelectorAll('a')].find(a=>/VIEW ALL PROJECTS/i.test(a.textContent||''));if(viewAll)viewAll.href='/work';
(()=>{
  const load=(src,onload)=>{if(document.querySelector(`script[src="${src}"]`)){onload?.();return}const s=document.createElement('script');s.src=src;s.defer=true;s.onload=()=>onload?.();document.head.appendChild(s)};
  const boot=()=>load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',()=>{
    load('/cover-sprite.js?v=1');
    load('/cms.js?v=3');
    load('/interaction-contact-v2.js?v=4');
    const explore=document.getElementById('explore');let loaded=false;const loadExplore=()=>{if(loaded)return;loaded=true;load('/site-upgrade.js?v=4')};
    if(explore&&'IntersectionObserver'in window){const obs=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){obs.disconnect();loadExplore()}},{rootMargin:'1000px 0px'});obs.observe(explore)}else loadExplore();
  });
  if('requestIdleCallback'in window)requestIdleCallback(boot,{timeout:900});else setTimeout(boot,180);
})();
