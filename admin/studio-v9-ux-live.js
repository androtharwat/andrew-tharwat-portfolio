(() => {
  const $=(s,r=document)=>r.querySelector(s);
  function go(hash){location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'))}
  function polish(){
    $('#notifications-button')?.classList.add('hidden');
    document.querySelector('[data-command="client"]')?.remove();
    document.querySelector('[data-command="project"]')?.remove();
    document.querySelector('[data-nav="testimonials"]')?.remove();
    document.querySelector('[data-go="activity"]')?.classList.add('hidden');
    const proposal=document.querySelector('[data-command="proposal"]');
    if(proposal){proposal.querySelector('small').textContent='Prepare an offer for a qualified lead';}
    const note=$('#quick-dialog .dialog-note');if(note)note.textContent='Clients and Projects are created only through the controlled Proposal → Deposit → Conversion workflow.';
    const portfolio=document.querySelector('[data-nav="portfolio"]');
    if(portfolio){
      portfolio.setAttribute('href','/admin/');portfolio.setAttribute('title','Open live Portfolio CMS');
      let hse=document.querySelector('[data-hse-world-admin]');
      if(!hse){
        hse=document.createElement('a');
        hse.className='nav-item';
        hse.href='/admin/investigator-eye.html';
        hse.dataset.hseWorldAdmin='1';
        hse.innerHTML='<span class="nav-icon">⌁</span><span>HSE Cases & Content</span><b style="margin-left:auto;font-size:10px">→</b>';
        portfolio.insertAdjacentElement('beforebegin',hse);
      }
    }
  }
  function failClosedIfNeeded(){
    const app=$('#app'),gate=$('#gate'),banner=document.querySelector('.demo-banner');
    if(!app||app.classList.contains('hidden'))return;
    if((banner?.textContent||'').includes('LIVE SUPABASE DATA'))return;
    app.classList.add('hidden');
    gate?.classList.remove('hidden');
    $('#trust-start')?.classList.add('hidden');
    $('#pairing-box')?.classList.add('hidden');
    const msg=$('#gate-message');if(msg)msg.textContent='Studio OS could not confirm a live Supabase connection. No operational data is shown. Refresh the page or verify the Trusted Device connection.';
  }
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]');
    if(action){
      const a=action.dataset.action;
      if(a==='create-proposal'){e.preventDefault();e.stopImmediatePropagation();go('#proposals');setTimeout(()=>$('#proposal-new')?.click(),120);return}
      if(a==='record-payment'){e.preventDefault();e.stopImmediatePropagation();go('#payments');return}
      if(a==='post-update'){e.preventDefault();e.stopImmediatePropagation();go('#projects');return}
    }
    const command=e.target.closest('[data-command="proposal"]');
    if(command){e.preventDefault();e.stopImmediatePropagation();$('#quick-dialog')?.close?.();go('#proposals');setTimeout(()=>$('#proposal-new')?.click(),120);return}
    const portfolio=e.target.closest('[data-nav="portfolio"]');
    if(portfolio){e.preventDefault();e.stopImmediatePropagation();location.href='/admin/';}
  },true);
  new MutationObserver(polish).observe(document.body,{childList:true,subtree:true});
  polish();
  setTimeout(failClosedIfNeeded,5000);
})();