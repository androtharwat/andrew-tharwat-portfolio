(()=>{
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='hse-awareness-series')return;
  document.body.classList.add('hse-awareness-project');

  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  function labelText(card,videoIndex){
    const ar=lang()==='ar';
    if(card.classList.contains('media-video'))return ar?`الحلقة ${String(videoIndex).padStart(2,'0')}`:`EPISODE ${String(videoIndex).padStart(2,'0')}`;
    return ar?'هوية السلسلة':'SERIES IDENTITY';
  }
  function decorate(){
    const gallery=document.querySelector('.gallery');
    if(!gallery)return false;
    const ar=lang()==='ar';
    const kicker=gallery.querySelector('.gallery-kicker');
    const title=gallery.querySelector('.gallery-head h2');
    const note=gallery.querySelector('.gallery-head p');
    if(kicker)kicker.textContent=ar?'مكتبة التوعية المرئية':'HSE AWARENESS LIBRARY';
    if(title)title.textContent=ar?'سلسلة فيديوهات SCCT2':'SCCT2 VIDEO SERIES.';
    if(note)note.textContent=ar?'كل فيديو معروض كاملًا بنسبته الأصلية بدون أي قص، ومع كل محتوى بريف مستقل وتفاعل وآراء المشاهدين.':'Every video is shown in full at its original aspect ratio, with its own brief and independent viewer reactions and feedback.';
    let videoIndex=0;
    gallery.querySelectorAll('.media-item').forEach(card=>{
      if(card.classList.contains('media-video'))videoIndex++;
      const frame=card.querySelector('.media-frame');
      if(!frame)return;
      let badge=frame.querySelector('.hse-series-order');
      if(!badge){badge=document.createElement('span');badge.className='hse-series-order';badge.setAttribute('aria-hidden','true');frame.appendChild(badge)}
      badge.textContent=labelText(card,videoIndex);
    });
    return true;
  }
  let tries=0;
  const draw=()=>{tries++;if(!decorate()&&tries<50)setTimeout(draw,120)};
  draw();
  document.addEventListener('portfolio:languagechange',decorate);
  document.addEventListener('portfolio:contentrendered',decorate);
})();
