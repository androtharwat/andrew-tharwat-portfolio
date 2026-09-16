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
    if(portfolio){portfolio.setAttribute('href','/admin/');portfolio.setAttribute('title','Open live Portfolio CMS');}
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
})();