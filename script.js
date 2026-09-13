const header=document.querySelector('.site-header');const menu=document.querySelector('.menu-btn');const nav=document.querySelector('.main-nav');const links=[...document.querySelectorAll('.main-nav a')];
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>20));
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
links.forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const sections=[...document.querySelectorAll('main section[id]')];const spy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}),{rootMargin:'-35% 0px -55% 0px'});sections.forEach(s=>spy.observe(s));
// Primary navigation upgrade: the portfolio now has a dedicated /work page.
document.querySelectorAll('a').forEach(a=>{
  const text=(a.textContent||'').trim().toUpperCase();
  if(text.includes('EXPLORE MY WORK')||text.includes('VIEW ALL PROJECTS')) a.href='/work';
});
const projectNav=[...document.querySelectorAll('.main-nav a')].find(a=>(a.textContent||'').trim()==='Projects');if(projectNav)projectNav.href='/work';
const footerProject=[...document.querySelectorAll('.site-footer a')].find(a=>(a.textContent||'').trim()==='Projects');if(footerProject)footerProject.href='/work';
(()=>{const s=document.createElement('script');s.src='/site-upgrade.js?v=1';s.defer=true;document.head.appendChild(s)})();
