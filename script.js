const header=document.querySelector('.site-header');const menu=document.querySelector('.menu-btn');const nav=document.querySelector('.main-nav');const links=[...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>20));
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
links.forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const sections=[...document.querySelectorAll('main section[id]')];const spy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-35% 0px -55% 0px'});sections.forEach(s=>spy.observe(s));
