const header=document.querySelector('.site-header');const menu=document.querySelector('.menu-btn');const nav=document.querySelector('.main-nav');const links=[...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>20));
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
links.forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const sections=[...document.querySelectorAll('main section[id]')];const spy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-35% 0px -55% 0px'});sections.forEach(s=>spy.observe(s));
(()=>{const css=document.createElement('link');css.rel='stylesheet';css.href='/visual-overrides.css?v=1';document.head.appendChild(css);const load=(src,next)=>{const s=document.createElement('script');s.src=src;s.onload=()=>next&&next();document.head.appendChild(s)};load('/cover-sprite.js?v=1',()=>load('/hero-visual.js?v=1',()=>load('/site-upgrade.js?v=3')));})();
