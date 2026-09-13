(() => {
  const STATIC_LOCK_SELECTOR='.image-card,.wide-image-card';
  const PROJECT_SELECTOR='.project-live-card,.experience-card,.work-card';
  const CARD_SELECTOR=`${STATIC_LOCK_SELECTOR},${PROJECT_SELECTOR}`;
  const cfg=window.PORTFOLIO_CONFIG;
  const phone='201505414444';
  const email='androsarot3@gmail.com';
  const waText=encodeURIComponent("Hello Andrew, I'd like to discuss a new project or idea with you.");
  const waHref=`https://wa.me/${phone}?text=${waText}`;
  const mailHref=`mailto:${email}?subject=${encodeURIComponent('New Project / Idea — Andrew Tharwat')}`;
  let accessMap=new Map();

  if(!document.getElementById('contact-interaction-style')){
    const style=document.createElement('style');
    style.id='contact-interaction-style';
    style.textContent=`
      .card-nav-disabled{cursor:pointer!important;position:relative}
      .card-action-icon{position:absolute;right:14px;top:14px;z-index:20;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(5,18,28,.78);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);color:#fff;font:900 15px/1 Montserrat,Arial,sans-serif;pointer-events:none;box-shadow:0 10px 28px rgba(0,0,0,.22)}
      .card-nav-disabled:hover .card-action-icon,.project-page-live .card-action-icon{background:rgba(225,6,19,.9)}
      .card-action-icon.card-icon-click{animation:cardIconNudge .42s cubic-bezier(.2,.8,.2,1)}
      @keyframes cardIconNudge{0%{transform:translateX(0) scale(1)}40%{transform:translateX(7px) scale(1.06)}100%{transform:translateX(0) scale(1)}}
      .after-work-contact{position:relative;overflow:hidden;background:linear-gradient(135deg,#071722,#0b2c42 58%,#071722);color:#fff;padding:34px 0;border-block:1px solid rgba(255,255,255,.08)}
      .after-work-contact-inner{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center}.after-work-contact .micro{display:block;color:#ff4050;font-size:9px;font-weight:900;letter-spacing:2px;margin-bottom:8px}.after-work-contact h3{margin:0;font-size:clamp(24px,3vw,40px);line-height:1.02}.after-work-contact h3 b{color:#ff3043}.after-work-contact p{margin:9px 0 0;color:#9fb2be;font-size:11px;line-height:1.65;max-width:720px}.after-work-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.after-work-actions a{display:inline-flex;align-items:center;text-decoration:none;padding:14px 17px;border-radius:12px;font-size:10px;font-weight:900}.after-work-wa{background:linear-gradient(135deg,#e10613,#ff3043);color:#fff}.after-work-mail{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#fff}
      .cta-section.contact-upgraded{background:radial-gradient(circle at 78% 20%,rgba(225,6,19,.12),transparent 25%),linear-gradient(145deg,#06131e,#0a2638 58%,#06131e);color:#fff;padding:0}.contact-shell{position:relative;z-index:2;padding:86px 0 78px}.contact-heading{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.82fr);gap:70px;align-items:end;padding-bottom:34px;border-bottom:1px solid rgba(255,255,255,.1)}.contact-heading h2{color:#fff;font-size:clamp(42px,5vw,74px);line-height:.96;letter-spacing:-2.7px;margin:8px 0 0}.contact-heading h2 b{color:#ff2838}.contact-heading p{margin:0;color:#a9bbc6;font-size:13px;line-height:1.85}.contact-choice{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px}.contact-choice a{display:flex;align-items:center;justify-content:space-between;text-decoration:none;padding:20px 22px;border-radius:16px;font-size:11px;font-weight:900}.contact-wa{background:linear-gradient(135deg,#e10613,#ff3043);color:#fff}.contact-mail{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#fff}.contact-network{margin-top:38px;display:grid;grid-template-columns:1.05fr .95fr;gap:38px}.contact-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.contact-social-card{display:flex;align-items:center;gap:13px;padding:15px 16px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035);text-decoration:none;color:#fff}.social-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#0d2c40;color:#ff3043;font-weight:900;font-size:11px;flex:none}.contact-social-card strong{display:block;font-size:11px;margin-bottom:4px}.contact-social-card span span{display:block;color:#8198a6;font-size:8px}.contact-direct-box{border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:22px;background:rgba(3,15,23,.32)}.contact-direct-box p{color:#8299a7;font-size:10px;line-height:1.7}.contact-direct-row a{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#dbe5ea;font-size:10px;padding:11px 0;border-top:1px solid rgba(255,255,255,.08)}.contact-direct-row a span{color:#ff3043}.mobile-contact-dock{display:none}
      @media(max-width:900px){.contact-heading,.contact-network,.after-work-contact-inner{grid-template-columns:1fr;gap:30px}.after-work-actions{justify-content:flex-start}}
      @media(max-width:820px){body{padding-bottom:72px}.site-header .header-cta{display:inline-flex!important;visibility:visible!important;opacity:1!important}.mobile-contact-dock{position:fixed;z-index:999;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1.18fr .82fr;gap:8px;padding:8px;border-radius:17px;background:rgba(4,16,26,.92);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px)}.mobile-contact-dock a{min-height:46px;border-radius:12px;text-decoration:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900}.dock-wa{background:linear-gradient(135deg,#e10613,#ff3043);color:#fff}.dock-mail{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#fff}}
      @media(max-width:620px){.contact-choice,.contact-social-grid{grid-template-columns:1fr}.contact-shell{padding:58px 0}.after-work-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.after-work-actions a{justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function slugFromCard(card){
    const href=card.getAttribute('href')||'';
    const m=href.match(/\/projects\/([^/?#]+)/);
    return m?decodeURIComponent(m[1]):'';
  }
  function addIcon(card){
    if(card.querySelector(':scope > .card-action-icon'))return;
    const i=document.createElement('span');i.className='card-action-icon';i.textContent='↗';card.appendChild(i);
  }
  function setLabel(card,enabled){
    const l=card.querySelector('.experience-open,.work-card-link,.project-live-overlay b');
    if(!l)return;
    const next=enabled?'OPEN CASE STUDY →':'COMING SOON';
    if(l.textContent!==next)l.textContent=next;
  }
  function applyCard(card){
    if(!(card instanceof Element))return;
    if(card.matches(STATIC_LOCK_SELECTOR)){
      if(card.dataset.pageEnabled!=='false')card.dataset.pageEnabled='false';
      card.classList.add('card-nav-disabled');addIcon(card);return;
    }
    const slug=slugFromCard(card),enabled=accessMap.get(slug)===true;
    card.dataset.pageEnabled=enabled?'true':'false';
    card.classList.toggle('card-nav-disabled',!enabled);
    card.classList.toggle('project-page-live',enabled);
    addIcon(card);setLabel(card,enabled);
  }
  function applyAll(root=document){root.querySelectorAll?.(CARD_SELECTOR).forEach(applyCard)}
  function applyAdded(node){
    if(!(node instanceof Element))return;
    if(node.matches(CARD_SELECTOR))applyCard(node);
    node.querySelectorAll?.(CARD_SELECTOR).forEach(applyCard);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest(CARD_SELECTOR);if(!card)return;
    if(card.matches(PROJECT_SELECTOR)&&card.dataset.pageEnabled==='true')return;
    e.preventDefault();e.stopPropagation();
    const icon=card.querySelector('.card-action-icon');
    if(icon){icon.classList.remove('card-icon-click');void icon.offsetWidth;icon.classList.add('card-icon-click')}
  },true);

  async function loadAccess(){
    if(!cfg||!window.supabase){applyAll();return}
    const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    const {data}=await sb.from('portfolio_projects').select('slug,page_enabled').eq('status','published');
    accessMap=new Map((data||[]).map(p=>[p.slug,!!p.page_enabled]));
    applyAll();
  }

  // Important: process only newly-added DOM nodes. The previous full-document
  // observer rewrote card labels on every mutation and could create a feedback
  // loop that froze Chrome with "Page Unresponsive".
  const mo=new MutationObserver(records=>{
    for(const r of records)for(const n of r.addedNodes)applyAdded(n);
  });
  mo.observe(document.body,{childList:true,subtree:true});
  loadAccess();

  function insertAfterProjects(){
    if(document.querySelector('.after-work-contact'))return;
    const anchor=document.querySelector('#explore')||document.querySelector('.work-browser');if(!anchor)return;
    const s=document.createElement('section');s.className='after-work-contact';
    s.innerHTML=`<div class="container after-work-contact-inner"><div><span class="micro">SEEN SOMETHING THAT SPARKED AN IDEA?</span><h3>DON'T JUST BROWSE. <b>BUILD YOURS.</b></h3><p>If one of the projects gave you an idea, contact me directly. A rough idea is enough to start.</p></div><div class="after-work-actions"><a class="after-work-wa" href="${waHref}" target="_blank" rel="noopener">WHATSAPP →</a><a class="after-work-mail" href="${mailHref}">EMAIL BRIEF →</a></div></div>`;
    anchor.insertAdjacentElement('afterend',s);
  }
  function mobileDock(){
    if(document.querySelector('.mobile-contact-dock'))return;
    const d=document.createElement('div');d.className='mobile-contact-dock';
    d.innerHTML=`<a class="dock-wa" href="${waHref}" target="_blank" rel="noopener">WA · START IDEA</a><a class="dock-mail" href="${mailHref}">@ · EMAIL</a>`;
    document.body.appendChild(d);
  }
  function upgradeContact(){
    const s=document.querySelector('.cta-section#contact');if(!s||s.dataset.contactUpgraded)return;
    s.dataset.contactUpgraded='1';s.classList.add('contact-upgraded');const c=s.querySelector('.cta-layout');if(!c)return;c.className='container contact-shell';
    c.innerHTML=`<div class="contact-heading"><div><span class="section-kicker">LET'S BUILD SOMETHING REAL</span><h2>HAVE A PROJECT?<br><b>OR JUST AN IDEA?</b></h2></div><p>Whether it's HSE, a website, brand, awareness video, AI experience, story or something new — tell me what you want to build.</p></div><div class="contact-choice"><a class="contact-wa" href="${waHref}" target="_blank" rel="noopener"><strong>START ON WHATSAPP</strong><span>→</span></a><a class="contact-mail" href="${mailHref}"><strong>SEND PROJECT BY EMAIL</strong><span>→</span></a></div><div class="contact-network"><div class="contact-social-grid"><a class="contact-social-card" href="https://www.linkedin.com/in/andrew-tharwat-1a54b91b5" target="_blank" rel="noopener"><span class="social-icon">in</span><span><strong>LinkedIn</strong><span>Professional profile & HSE work</span></span></a><a class="contact-social-card" href="https://www.instagram.com/andrew.thrwattt" target="_blank" rel="noopener"><span class="social-icon">IG</span><span><strong>Andrew Tharwat</strong><span>Personal creative profile</span></span></a><a class="contact-social-card" href="https://www.instagram.com/do.storyes" target="_blank" rel="noopener"><span class="social-icon">DO</span><span><strong>DO Stories</strong><span>Personalized stories</span></span></a><a class="contact-social-card" href="https://www.instagram.com/do.decoment" target="_blank" rel="noopener"><span class="social-icon">DD</span><span><strong>DO Document</strong><span>Smart document solutions</span></span></a></div><div class="contact-direct-box"><h3>Direct contact</h3><p>No formal brief is required. Explain the idea in your own words and we can build from there.</p><div class="contact-direct-row"><a href="${waHref}" target="_blank" rel="noopener"><b>WhatsApp</b><span>+20 150 541 4444 →</span></a><a href="${mailHref}"><b>Email</b><span>${email} →</span></a></div></div></div>`;
  }
  const headerCta=document.querySelector('.site-header .header-cta');if(headerCta){headerCta.href='#contact';headerCta.textContent="Let's Talk →"}
  insertAfterProjects();mobileDock();upgradeContact();
})();