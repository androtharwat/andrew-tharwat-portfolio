(() => {
  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  function addCss(href){
    if(document.querySelector(`link[href*="${href.split('/').pop().split('?')[0]}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  }
  function addScript(src){
    if(document.querySelector(`script[src*="${src.split('/').pop().split('?')[0]}"]`))return;
    const script=document.createElement('script');script.src=src;script.async=false;document.body.appendChild(script);
  }

  // V10 replaces the older human/home/HSE-entry presentation layers on the homepage.
  // Keep only the final typography pass + V10 itself to avoid duplicate observers and DOM rewrites.
  addCss('/v9/v9-final.css?v=2');
  addCss('/v9/v9-home-v10.css?v=2');
  addCss('/v9/v9-home-v10-interactive.css?v=1');
  addCss('/v9/v9-home-v10-responsive.css?v=1');
  addCss('/v9/v9-home-first-impression.css?v=5');
  addScript('/v9/v9-home-v10.js?v=10');

  function applyOfficialBrandAssets(){
    const logo=$('.site-header .brand img');
    if(logo){logo.src='/assets/logo-mark-official.png';logo.alt='ATS';logo.decoding='async';}
  }

  function persistLanguage(lang){
    const current=lang==='ar'?'ar':'en';
    try{localStorage.setItem(LANG_KEY,current);localStorage.setItem(PORTFOLIO_LANG_KEY,current)}catch(_e){}
  }

  function loadArabicPolish(){
    if(document.body.dataset.lang!=='ar')return;
    addScript('/v9/v9-arabic-polish.js?v=1');
  }

  function applyPublicLanguage(lang,{persist=true,notify=true}={}){
    const next=lang==='ar'?'ar':'en';
    document.body.dataset.lang=next;
    document.documentElement.lang=next;
    document.documentElement.dir=next==='ar'?'rtl':'ltr';

    $$('[data-en]').forEach(el=>{
      const value=next==='ar' ? (el.dataset.ar||el.dataset.en) : el.dataset.en;
      if(typeof value==='string')el.textContent=value;
    });
    $$('[data-en-html]').forEach(el=>{
      const value=next==='ar' ? (el.dataset.arHtml||el.dataset.enHtml) : el.dataset.enHtml;
      if(typeof value==='string')el.innerHTML=value;
    });

    const toggle=$('#lang-toggle');
    if(toggle){
      toggle.textContent=next==='ar'?'English | AR':'EN | عربي';
      toggle.setAttribute('aria-label',next==='ar'?'Switch to English':'التبديل إلى العربية');
    }
    const search=$('#project-search');
    if(search)search.placeholder=next==='ar'?'ابحث في المشاريع...':'Search projects...';

    if(persist)persistLanguage(next);
    if(next==='ar')setTimeout(loadArabicPolish,0);
    if(notify)document.dispatchEvent(new CustomEvent('v9:setlang',{detail:{lang:next}}));
  }

  function restoreLanguage(){
    let saved='en';
    try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
    applyPublicLanguage(saved,{persist:false,notify:true});
  }

  function installActiveNav(){
    const links=$$('#main-nav a[href^="#"]');
    if(!links.length||!('IntersectionObserver' in window))return;
    const byId=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]));
    const sections=[...byId.keys()].map(id=>document.getElementById(id)).filter(Boolean);
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      links.forEach(a=>a.classList.toggle('is-active',a===byId.get(visible.target.id)));
    },{rootMargin:'-30% 0px -58% 0px',threshold:[0,.2,.5]});
    sections.forEach(section=>observer.observe(section));
  }

  const langToggle=$('#lang-toggle');
  langToggle?.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    const next=document.body.dataset.lang==='ar'?'en':'ar';
    applyPublicLanguage(next,{persist:true,notify:true});
  });

  applyOfficialBrandAssets();
  restoreLanguage();
  installActiveNav();
})();
