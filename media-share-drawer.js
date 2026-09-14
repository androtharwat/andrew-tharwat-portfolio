(()=>{
  const isAr=el=>(el.closest('.media-story')?.getAttribute('dir')||document.documentElement.dir)==='rtl';
  const closeAll=except=>document.querySelectorAll('.media-share.open').forEach(s=>{if(s!==except)close(s)});
  function close(share){if(!share)return;share.classList.remove('open');const b=share.querySelector(':scope > .media-share-trigger');if(b){b.setAttribute('aria-expanded','false');b.querySelector('.media-share-trigger-chevron').textContent='⌄'}}
  function open(share){closeAll(share);share.classList.add('open');const b=share.querySelector(':scope > .media-share-trigger');if(b){b.setAttribute('aria-expanded','true');b.querySelector('.media-share-trigger-chevron').textContent='⌃'}}
  function process(share){
    if(!(share instanceof Element)||share.dataset.shareDrawerReady==='1')return;
    share.dataset.shareDrawerReady='1';
    const ar=isAr(share),children=[...share.children];
    const id=`share-drawer-${share.dataset.mediaShare||Math.random().toString(36).slice(2)}`;
    const trigger=document.createElement('button');
    trigger.type='button';trigger.className='media-share-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id);
    trigger.innerHTML=`<span class="media-share-trigger-icon">↗</span><span class="media-share-trigger-label">${ar?'مشاركة':'Share'}</span><span class="media-share-trigger-chevron">⌄</span>`;
    const sheet=document.createElement('div');sheet.className='media-share-sheet';sheet.id=id;
    const inner=document.createElement('div');inner.className='media-share-sheet-inner';
    const panel=document.createElement('div');panel.className='media-share-panel';
    children.forEach(n=>panel.appendChild(n));inner.appendChild(panel);sheet.appendChild(inner);share.append(trigger,sheet);
    trigger.addEventListener('click',()=>share.classList.contains('open')?close(share):open(share));
    panel.addEventListener('click',e=>{if(e.target.closest('[data-share-action]'))setTimeout(()=>close(share),220)});
  }
  function scan(root=document){if(root.matches?.('.media-share'))process(root);root.querySelectorAll?.('.media-share').forEach(process)}
  scan();
  const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)scan(n)});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(!e.target.closest('.media-share'))closeAll()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  document.addEventListener('portfolio:languagechange',()=>setTimeout(()=>scan(),0));
})();
