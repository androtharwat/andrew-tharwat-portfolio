(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const touch=()=>window.matchMedia('(hover:none),(pointer:coarse)').matches;

  const serviceRoutes={
    2:{filter:'creative'},
    3:{query:'video'},
    4:{filter:'digital'}
  };

  function waitForWork(route,attempt=0){
    const work=$('#work');
    if(!work)return;
    const filterBtn=route.filter?$(`#project-filters button[data-filter="${route.filter}"]`):null;
    const search=$('#project-search');
    const ready=(!route.filter||filterBtn)&&(!route.query||search);
    if(!ready&&attempt<30){setTimeout(()=>waitForWork(route,attempt+1),120);return}
    if(filterBtn)filterBtn.click();
    if(route.query&&search){search.value=route.query;search.dispatchEvent(new Event('input',{bubbles:true}));}
    work.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bindServiceRouting(){
    $$('.v10-service[data-v10-service]').forEach(card=>{
      if(card.dataset.routeBound)return;
      card.dataset.routeBound='1';
      card.addEventListener('click',e=>{
        const index=Number(card.dataset.v10Service);
        const route=serviceRoutes[index];
        if(!route)return;
        if(touch()&&!card.classList.contains('is-open'))return; // first tap reveals details
        e.preventDefault();
        waitForWork(route);
      },true);
    });
  }

  function bindKeyboardRail(){
    const rail=$('.v10-service-rail');
    if(!rail||rail.dataset.keyboardBound)return;
    rail.dataset.keyboardBound='1';
    rail.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
      const cards=$$('.v10-service',rail);
      const current=document.activeElement;
      const i=Math.max(0,cards.indexOf(current));
      const rtl=document.documentElement.dir==='rtl';
      const forward=(e.key==='ArrowRight')!==rtl;
      const next=cards[Math.min(cards.length-1,Math.max(0,i+(forward?1:-1)))];
      if(next&&next!==current){e.preventDefault();next.focus();next.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}
    });
  }

  function addMobileHint(){
    const rail=$('.v10-service-rail');
    if(!rail||$('.v10-swipe-hint'))return;
    const hint=document.createElement('div');
    hint.className='v10-swipe-hint';
    hint.dataset.en='Swipe services · tap for details';
    hint.dataset.ar='اسحب الخدمات · اضغط للتفاصيل';
    hint.textContent=document.body.dataset.lang==='ar'?hint.dataset.ar:hint.dataset.en;
    rail.insertAdjacentElement('beforebegin',hint);
  }

  function localizeHint(){
    const hint=$('.v10-swipe-hint');if(hint)hint.textContent=document.body.dataset.lang==='ar'?hint.dataset.ar:hint.dataset.en;
  }

  function bind(){bindServiceRouting();bindKeyboardRail();addMobileHint();localizeHint();}
  document.addEventListener('DOMContentLoaded',bind,{once:true});
  setTimeout(bind,80);setTimeout(bind,350);
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(()=>{bind();localizeHint()},120));
})();
