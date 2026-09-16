(() => {
  const $ = s => document.querySelector(s);
  function openHseShell(){
    $('#portal-empty')?.classList.add('hidden');
    $('#portal-app')?.classList.remove('hidden');
    document.querySelectorAll('.portal-view').forEach(v=>v.classList.toggle('active',v.dataset.portalView==='hse'));
    document.querySelectorAll('[data-portal-nav]').forEach(v=>v.classList.toggle('active',v.dataset.portalNav==='hse'));
    if($('#portal-title'))$('#portal-title').textContent='HSE Consultation';
    if($('#portal-subtitle'))$('#portal-subtitle').textContent='One clear next step at a time.';
  }
  function addEmptyCta(){
    const box=$('#portal-empty');if(!box||box.querySelector('[data-open-hse-empty]'))return;
    const a=document.createElement('a');a.href='#hse';a.dataset.portalNav='hse';a.dataset.openHseEmpty='1';a.textContent='START HSE CONSULTATION →';box.appendChild(a);
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-portal-nav="hse"]'))setTimeout(openHseShell,0)});
  window.addEventListener('hashchange',()=>{if(location.hash==='#hse')openHseShell()});
  new MutationObserver(()=>{addEmptyCta();if(location.hash==='#hse')openHseShell()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  addEmptyCta();if(location.hash==='#hse')openHseShell();
})();
