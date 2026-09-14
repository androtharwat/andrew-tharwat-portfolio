(()=>{
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='hse-awareness-series')return;
  document.body.classList.add('hse-awareness-project');
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  const cms=(key,en,ar,vars={})=>window.PORTFOLIO_CONTENT?.get?.(key,lang()==='ar'?ar:en,vars)||(lang()==='ar'?ar:en).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??`{${k}}`);
  function labelText(card,videoIndex){
    if(card.classList.contains('media-video'))return cms('hse.media.episode_template','EPISODE {n}','الحلقة {n}',{n:String(videoIndex).padStart(2,'0')});
    return cms('hse.media.identity_label','SERIES IDENTITY','هوية السلسلة');
  }
  function decorate(){
    const gallery=document.querySelector('.gallery');
    if(!gallery)return false;
    const kicker=gallery.querySelector('.gallery-kicker');
    const title=gallery.querySelector('.gallery-head h2');
    const note=gallery.querySelector('.gallery-head p');
    if(kicker)kicker.textContent=cms('hse.gallery.kicker','HSE AWARENESS LIBRARY','مكتبة التوعية المرئية');
    if(title)title.textContent=cms('hse.gallery.title','SCCT2 VIDEO SERIES.','سلسلة فيديوهات SCCT2');
    if(note)note.textContent=cms('hse.gallery.note','Every video is shown in full at its original aspect ratio, with its own brief and independent viewer reactions and feedback.','كل فيديو معروض كاملًا بنسبته الأصلية بدون أي قص، ومع كل محتوى بريف مستقل وتفاعل وآراء المشاهدين.');
    let videoIndex=0;
    gallery.querySelectorAll('.media-item').forEach(card=>{
      if(card.classList.contains('media-video'))videoIndex++;
      const frame=card.querySelector('.media-frame');if(!frame)return;
      let badge=frame.querySelector('.hse-series-order');if(!badge){badge=document.createElement('span');badge.className='hse-series-order';badge.setAttribute('aria-hidden','true');frame.appendChild(badge)}
      badge.textContent=labelText(card,videoIndex);
    });
    return true;
  }
  let tries=0;const draw=()=>{tries++;if(!decorate()&&tries<50)setTimeout(draw,120)};draw();
  document.addEventListener('portfolio:languagechange',()=>setTimeout(decorate,20));
  document.addEventListener('portfolio:contentrendered',decorate);
  document.addEventListener('portfolio:cmscontentready',decorate);
})();
