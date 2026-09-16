(()=>{
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='hse-awareness-series')return;
  document.body.classList.add('hse-awareness-project');
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  const isAr=()=>lang()==='ar';
  const cms=(key,en,ar,vars={})=>window.PORTFOLIO_CONTENT?.get?.(key,isAr()?ar:en,vars)||(isAr()?ar:en).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??`{${k}}`);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

  function labelText(card,videoIndex){
    if(card.classList.contains('media-video'))return cms('hse.media.episode_template','EPISODE {n}','الحلقة {n}',{n:String(videoIndex).padStart(2,'0')});
    return cms('hse.media.identity_label','SERIES IDENTITY','هوية السلسلة');
  }

  function buildTopicIndex(gallery){
    const videos=[...gallery.querySelectorAll('.media-item.media-video')];
    if(!videos.length)return;
    const ready=videos.every(card=>card.querySelector('.media-story-title'));
    if(!ready)return;

    let index=gallery.querySelector('.hse-topic-index');
    if(!index){
      index=document.createElement('section');
      index.className='hse-topic-index';
      const head=gallery.querySelector('.gallery-head');
      if(head)head.insertAdjacentElement('afterend',index);
      else gallery.prepend(index);
    }

    const ar=isAr();
    index.setAttribute('dir',ar?'rtl':'ltr');
    index.innerHTML=`
      <div class="hse-topic-index-head">
        <span>${ar?'موضوعات السلسلة':'SERIES TOPICS'}</span>
        <strong>${ar?'6 موضوعات توعوية مترابطة':'6 CONNECTED AWARENESS TOPICS'}</strong>
        <p>${ar?'اختر أي موضوع للانتقال مباشرة إلى الفيديو والبريف الخاص به.':'Choose a topic to jump directly to its video and brief.'}</p>
      </div>
      <div class="hse-topic-index-grid">
        ${videos.map((card,i)=>{
          const title=card.querySelector('.media-story-title')?.textContent?.trim()||`${ar?'الحلقة':'Episode'} ${i+1}`;
          const target=card.id||`hse-episode-${i+1}`;
          if(!card.id)card.id=target;
          return `<button type="button" data-hse-topic-target="${esc(target)}"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(title)}</span><i>${ar?'شاهد ←':'VIEW →'}</i></button>`;
        }).join('')}
      </div>`;

    index.querySelectorAll('[data-hse-topic-target]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=document.getElementById(btn.dataset.hseTopicTarget);
      if(!target)return;
      target.scrollIntoView({behavior:'smooth',block:'start'});
      target.classList.add('hse-topic-focus');
      setTimeout(()=>target.classList.remove('hse-topic-focus'),1800);
    }));
  }

  function decorate(){
    const gallery=document.querySelector('.gallery');
    if(!gallery)return false;
    const kicker=gallery.querySelector('.gallery-kicker');
    const title=gallery.querySelector('.gallery-head h2');
    const note=gallery.querySelector('.gallery-head p');
    const count=gallery.querySelector('.gallery-count');
    if(kicker)kicker.textContent=cms('hse.gallery.kicker','HSE AWARENESS LIBRARY','مكتبة التوعية بالسلامة');
    if(title)title.textContent=cms('hse.gallery.title','HSE AWARENESS VIDEO SERIES.','سلسلة فيديوهات التوعية بالسلامة');
    if(note)note.textContent=cms('hse.gallery.note','Six practical safety topics presented as short visual episodes. Each episode includes its own brief, sharing tools and viewer feedback.','ستة موضوعات سلامة عملية مقدمة كحلقات بصرية قصيرة. لكل حلقة بريف مستقل وأدوات مشاركة وتفاعل وآراء المشاهدين.');
    if(count)count.textContent=isAr()?'6 حلقات + هوية':'6 EPISODES + IDENTITY';

    let videoIndex=0;
    gallery.querySelectorAll('.media-item').forEach(card=>{
      if(card.classList.contains('media-video'))videoIndex++;
      const frame=card.querySelector('.media-frame');if(!frame)return;
      let badge=frame.querySelector('.hse-series-order');if(!badge){badge=document.createElement('span');badge.className='hse-series-order';badge.setAttribute('aria-hidden','true');frame.appendChild(badge)}
      badge.textContent=labelText(card,videoIndex);
    });
    buildTopicIndex(gallery);
    return true;
  }

  let tries=0;const draw=()=>{tries++;if(!decorate()&&tries<60)setTimeout(draw,120)};draw();
  const root=document.getElementById('project-root');
  if(root)new MutationObserver(()=>requestAnimationFrame(decorate)).observe(root,{childList:true,subtree:true});
  document.addEventListener('portfolio:languagechange',()=>setTimeout(decorate,30));
  document.addEventListener('portfolio:contentrendered',decorate);
  document.addEventListener('portfolio:cmscontentready',decorate);
})();