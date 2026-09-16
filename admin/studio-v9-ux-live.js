(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const toast=m=>{const e=$('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)};
  function go(hash){location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'))}
  function polish(){
    $('#notifications-button')?.classList.add('hidden');
    document.querySelector('[data-command="client"]')?.remove();
    document.querySelector('[data-command="project"]')?.remove();
    const proposal=document.querySelector('[data-command="proposal"]');
    if(proposal){proposal.querySelector('small').textContent='Prepare an offer for a qualified lead';}
    const note=$('#quick-dialog .dialog-note');if(note)note.textContent='Clients and Projects are created only through the controlled Proposal → Deposit → Conversion workflow.';
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
  },true);
  new MutationObserver(polish).observe(document.body,{childList:true,subtree:true});
  polish();
})();