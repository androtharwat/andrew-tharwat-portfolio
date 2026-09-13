(() => {
  const CARD_SELECTOR = '.image-card,.wide-image-card,.project-live-card,.experience-card,.work-card';

  const style = document.createElement('style');
  style.id = 'interaction-contact-styles';
  style.textContent = `
    /* Temporarily disable card navigation until detail pages are ready */
    ${CARD_SELECTOR}{position:relative;cursor:pointer}
    ${CARD_SELECTOR}.card-nav-disabled{cursor:pointer}
    .card-action-icon{position:absolute;right:14px;top:14px;z-index:8;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(5,18,28,.76);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);color:#fff;font:900 15px/1 Montserrat,Arial,sans-serif;pointer-events:none;box-shadow:0 10px 28px rgba(0,0,0,.22);transition:transform .18s ease,background .18s ease,border-color .18s ease}
    .card-nav-disabled:hover .card-action-icon{background:rgba(225,6,19,.88);border-color:rgba(255,255,255,.24)}
    .card-action-icon.card-icon-click{animation:cardIconNudge .48s cubic-bezier(.2,.8,.2,1)}
    @keyframes cardIconNudge{0%{transform:translateX(0) scale(1)}35%{transform:translateX(8px) scale(1.08)}70%{transform:translateX(-2px) scale(.98)}100%{transform:translateX(0) scale(1)}}

    /* Contact / collaboration section */
    .cta-section.contact-upgraded{background:radial-gradient(circle at 78% 20%,rgba(225,6,19,.12),transparent 25%),linear-gradient(145deg,#06131e 0%,#0a2638 58%,#06131e 100%);color:#fff;padding:0;isolation:isolate}
    .cta-section.contact-upgraded:after{background:linear-gradient(90deg,rgba(4,16,26,.92),rgba(4,16,26,.72) 58%,rgba(4,16,26,.86))}
    .cta-section.contact-upgraded .cta-bg{opacity:.13;filter:saturate(.6) contrast(1.12)}
    .contact-shell{position:relative;z-index:2;padding:86px 0 78px}
    .contact-heading{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.82fr);gap:70px;align-items:end;padding-bottom:34px;border-bottom:1px solid rgba(255,255,255,.1)}
    .contact-heading .section-kicker{color:#ff3947}
    .contact-heading h2{color:#fff;font-size:clamp(42px,5vw,74px);line-height:.96;letter-spacing:-2.7px;margin:8px 0 0}
    .contact-heading h2 b{color:#ff2838}
    .contact-heading p{margin:0;color:#a9bbc6;font-size:13px;line-height:1.85;max-width:530px}
    .contact-choice{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px}
    .contact-choice a{display:flex;align-items:center;justify-content:space-between;gap:14px;text-decoration:none;padding:20px 22px;border-radius:16px;font-size:11px;font-weight:900;letter-spacing:.5px;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
    .contact-choice a:hover{transform:translateY(-3px)}
    .contact-wa{background:linear-gradient(135deg,#e10613,#ff3043);color:#fff;box-shadow:0 18px 44px rgba(225,6,19,.22)}
    .contact-mail{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#fff}
    .contact-choice .contact-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.11);font-size:16px;flex:none}
    .contact-choice .contact-copy{display:flex;flex-direction:column;gap:4px;flex:1}
    .contact-choice .contact-copy small{color:rgba(255,255,255,.62);font-size:8px;font-weight:700;letter-spacing:.8px;text-transform:uppercase}
    .contact-choice .arrow{font-size:18px;transition:transform .2s}.contact-choice a:hover .arrow{transform:translateX(4px)}

    .contact-network{margin-top:38px;display:grid;grid-template-columns:1.05fr .95fr;gap:38px;align-items:start}
    .contact-network-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#6f8999;font-weight:900;margin-bottom:14px}
    .contact-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .contact-social-card{display:flex;align-items:center;gap:13px;padding:15px 16px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035);text-decoration:none;color:#fff;transition:transform .2s ease,border-color .2s ease,background .2s ease}
    .contact-social-card:hover{transform:translateY(-3px);border-color:rgba(255,48,67,.45);background:rgba(255,255,255,.06)}
    .contact-social-card .social-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#0d2c40;color:#ff3043;font-weight:900;font-size:11px;letter-spacing:-.4px;flex:none}
    .contact-social-card strong{display:block;font-size:11px;margin-bottom:4px}.contact-social-card span{display:block;color:#8198a6;font-size:8px;line-height:1.4}
    .contact-direct-box{border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:22px;background:rgba(3,15,23,.32)}
    .contact-direct-box h3{margin:0 0 8px;font-size:17px}.contact-direct-box p{margin:0 0 18px;color:#8299a7;font-size:10px;line-height:1.7}
    .contact-direct-row{display:flex;flex-direction:column;gap:9px}.contact-direct-row a{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:#dbe5ea;font-size:10px;padding:11px 0;border-top:1px solid rgba(255,255,255,.08)}.contact-direct-row a b{color:#fff;font-size:10px}.contact-direct-row a span{color:#ff3043}
    .contact-signoff{margin-top:28px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:20px}.contact-signoff strong{font-size:11px;letter-spacing:1.3px}.contact-signoff span{font-size:9px;color:#6f8999;letter-spacing:1.1px;text-transform:uppercase;text-align:right}

    @media(max-width:900px){.contact-heading,.contact-network{grid-template-columns:1fr;gap:30px}.contact-choice{max-width:720px}.contact-shell{padding:70px 0}.contact-heading h2{letter-spacing:-2px}}
    @media(max-width:620px){.contact-choice,.contact-social-grid{grid-template-columns:1fr}.contact-shell{padding:58px 0}.contact-heading h2{font-size:42px}.contact-heading{padding-bottom:26px}.contact-network{margin-top:28px}.contact-signoff{align-items:flex-start;flex-direction:column}.contact-signoff span{text-align:left}}
  `;
  document.head.appendChild(style);

  function prepareCard(card){
    if(card.dataset.navLocked === '1') return;
    card.dataset.navLocked='1';
    card.classList.add('card-nav-disabled');
    card.setAttribute('aria-disabled','true');
    card.setAttribute('title','Project page coming soon');
    if(!card.querySelector('.card-action-icon')){
      const icon=document.createElement('span');
      icon.className='card-action-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent='↗';
      card.appendChild(icon);
    }
  }

  function prepareAllCards(root=document){
    root.querySelectorAll?.(CARD_SELECTOR).forEach(prepareCard);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest(CARD_SELECTOR);
    if(!card) return;
    e.preventDefault();
    e.stopPropagation();
    const icon=card.querySelector('.card-action-icon');
    if(icon){icon.classList.remove('card-icon-click');void icon.offsetWidth;icon.classList.add('card-icon-click');setTimeout(()=>icon.classList.remove('card-icon-click'),520)}
  },true);

  prepareAllCards();
  const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches?.(CARD_SELECTOR))prepareCard(n);prepareAllCards(n)})));
  observer.observe(document.body,{childList:true,subtree:true});

  function upgradeContact(){
    const section=document.querySelector('.cta-section#contact');
    if(!section || section.dataset.contactUpgraded==='1') return;
    section.dataset.contactUpgraded='1';
    section.classList.add('contact-upgraded');
    const container=section.querySelector('.cta-layout');
    if(!container) return;

    const phone='201505414444';
    const email='androsarot3@gmail.com';
    const waText=encodeURIComponent("Hello Andrew, I'd like to discuss a new project or idea with you. I want to turn it into something real.");
    const mailSubject=encodeURIComponent('New Project / Idea — Andrew Tharwat');
    const mailBody=encodeURIComponent("Hello Andrew,\n\nI'd like to discuss a new project or idea with you.\n\nProject / idea:\n\nWhat I need:\n\nPreferred way to continue:\n");

    container.className='container contact-shell';
    container.innerHTML=`
      <div class="contact-heading">
        <div>
          <span class="section-kicker">LET'S BUILD SOMETHING REAL</span>
          <h2>HAVE A PROJECT?<br><b>OR JUST AN IDEA?</b></h2>
        </div>
        <p>Whether it's an HSE solution, website, brand, awareness video, AI experience, story or something completely new — choose how you'd like to reach me and tell me what you want to build.</p>
      </div>

      <div class="contact-choice" aria-label="Choose how to contact Andrew">
        <a class="contact-wa" href="https://wa.me/${phone}?text=${waText}" target="_blank" rel="noopener" data-contact="whatsapp">
          <span class="contact-icon">WA</span><span class="contact-copy"><strong>START ON WHATSAPP</strong><small>Fastest way to discuss your idea</small></span><span class="arrow">→</span>
        </a>
        <a class="contact-mail" href="mailto:${email}?subject=${mailSubject}&body=${mailBody}" data-contact="email-cta">
          <span class="contact-icon">@</span><span class="contact-copy"><strong>SEND PROJECT BY EMAIL</strong><small>Best for briefs, details and files</small></span><span class="arrow">→</span>
        </a>
      </div>

      <div class="contact-network">
        <div>
          <div class="contact-network-title">FIND MY WORK & PROJECTS</div>
          <div class="contact-social-grid">
            <a class="contact-social-card" href="https://www.linkedin.com/in/andrew-tharwat-1a54b91b5" target="_blank" rel="noopener" data-social="linkedin"><span class="social-icon">in</span><span><strong>LinkedIn</strong><span>Professional profile & HSE work</span></span></a>
            <a class="contact-social-card" href="https://www.instagram.com/andrew.thrwattt" target="_blank" rel="noopener" data-social="instagram_personal"><span class="social-icon">IG</span><span><strong>Andrew Tharwat</strong><span>Personal creative profile</span></span></a>
            <a class="contact-social-card" href="https://www.instagram.com/do.storyes" target="_blank" rel="noopener" data-social="instagram_do_stories"><span class="social-icon">DO</span><span><strong>DO Stories</strong><span>Personalized children's stories</span></span></a>
            <a class="contact-social-card" href="https://www.instagram.com/do.decoment" target="_blank" rel="noopener" data-social="instagram_do_document"><span class="social-icon">DD</span><span><strong>DO Document</strong><span>Smart document solutions</span></span></a>
          </div>
        </div>
        <div class="contact-direct-box">
          <div class="contact-network-title">DIRECT CONTACT</div>
          <h3>Choose what feels easier.</h3>
          <p>You can start with one message. No formal brief is required — explain the idea in your own words and we'll build from there.</p>
          <div class="contact-direct-row">
            <a href="https://wa.me/${phone}?text=${waText}" target="_blank" rel="noopener" data-social="whatsapp"><b>WhatsApp</b><span>+20 150 541 4444 →</span></a>
            <a href="mailto:${email}?subject=${mailSubject}&body=${mailBody}" data-social="email"><b>Email</b><span>${email} →</span></a>
          </div>
        </div>
      </div>
      <div class="contact-signoff"><strong>ANDREW THARWAT</strong><span>Safety • Digital • Creative • Stories • AI</span></div>
    `;
  }

  upgradeContact();
})();
