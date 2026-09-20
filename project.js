(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const root=document.getElementById('project-root');
  if(!cfg){root.innerHTML='<section class="project-error"><h1>Configuration error</h1></section>';return;}
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function fetchProject(timeoutMs=5000){
    const url=new URL(cfg.supabaseUrl+'/rest/v1/portfolio_projects');
    url.searchParams.set('select','*,portfolio_categories(name,name_ar,color),portfolio_project_media(*)');
    url.searchParams.set('slug','eq.'+slug);
    url.searchParams.set('status','eq.published');
    url.searchParams.set('page_enabled','eq.true');
    url.searchParams.set('limit','1');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url.toString(),{
        headers:{apikey:cfg.supabaseKey,Accept:'application/json'},
        signal:controller.signal,
        cache:'no-store'
      });
      if(!response.ok)throw new Error('Project request failed: '+response.status);
      const rows=await response.json();
      return rows?.[0]||null;
    }finally{clearTimeout(timer)}
  }
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(u='')=>{if(!u)return'/assets/app-icon-official.png';if(/^https?:\/\//i.test(u))return u;const clean=String(u).replace(/^\/+/, '');if(window.PORTFOLIO_ASSETS&&window.PORTFOLIO_ASSETS[clean])return window.PORTFOLIO_ASSETS[clean];return '/'+clean;};
  const pathSlug=location.pathname.match(/\/projects\/([^/?#]+)/)?.[1];
  const slug=decodeURIComponent(pathSlug || new URLSearchParams(location.search).get('slug') || '');
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  const isAr=()=>lang()==='ar';
  const publicText=(v='')=>String(v).replace(/Andrew Tharwat Studio/gi,'ATS').replace(/\bportfolio\b/gi,'studio').replace(/معرض الأعمال/g,'أعمال ATS');
  const local=(obj,key)=>publicText(isAr()&&obj?.[`${key}_ar`]?obj[`${key}_ar`]:(obj?.[key]||''));
  let currentProject=null;

  function galleryMarkup(items,p){
    if(!items.length)return'';
    const ar=isAr(),stringArt=p.slug==='magic-of-string-art';
    const title=stringArt?(ar?'أعمال مختارة':'SELECTED ARTWORKS.'):(ar?'معرض المشروع':'PROJECT GALLERY.');
    const kicker=stringArt?(ar?'مجموعة يدوية':'HANDCRAFTED COLLECTION'):(ar?'الأرشيف البصري':'VISUAL ARCHIVE');
    const note=stringArt?(ar?'اسحب على الموبايل أو استخدم الأسهم للتنقل بين الفيديو والأعمال. كل صورة تظهر بنسبتها الأصلية، وآخر سلايد مخصص لطلب بورتريه خاص بك.':'Swipe on mobile or use the arrows to move through the film and artworks. Every image keeps its original proportions, and the final slide lets you order your own portrait.'):(ar?'صور وفيديوهات من المشروع.':'Images and video from the project.');

    if(stringArt){
      const total=items.length+1;
      const slides=items.map((m,i)=>{const url=esc(media(m.url)),alt=esc(m.alt_text||local(p,'title')),number=String(i+1).padStart(2,'0');if(m.media_type==='video')return `<article class="gallery-slide gallery-slide-video" data-slide-index="${i}" data-i18n-skip="1"><div class="gallery-slide-stage"><video controls playsinline preload="metadata" src="${url}"></video><span class="slide-kind">${ar?'فيديو':'VIDEO'}</span></div><div class="slide-caption"><span>${number} / ${String(total).padStart(2,'0')}</span><strong>${ar?'عملية التنفيذ':'PROCESS / MOTION'}</strong></div></article>`;return `<figure class="gallery-slide gallery-slide-image" data-slide-index="${i}" data-lightbox-src="${url}" data-lightbox-alt="${alt}" tabindex="0" role="button" aria-label="${ar?'فتح العمل الفني':'Open artwork'} ${i+1}" data-i18n-skip="1"><div class="gallery-slide-stage"><img src="${url}" alt="${alt}" loading="lazy" decoding="async" /><span class="slide-kind">${ar?'عمل فني':'ARTWORK'}</span></div><figcaption class="slide-caption"><span>${number} / ${String(total).padStart(2,'0')}</span><strong>${ar?'بورتريه مصنوع يدويًا':'HANDCRAFTED PORTRAIT'}</strong></figcaption></figure>`;}).join('');
      const waText=encodeURIComponent(ar?'مرحبًا أندرو، أرغب في طلب بورتريه String Art ملون مقاس 60 سم بسعر العرض 350 دولار. أود إرسال الصورة والبدء في مراجعة التصميم معك.':"Hello Andrew, I'd like to order a 60 cm colored String Art portrait at the limited offer price of $350. I'd like to send my photo and start the design review with you.");
      const waHref=`https://wa.me/201505414444?text=${waText}`;
      const orderIndex=items.length,orderNumber=String(total).padStart(2,'0');
      const orderSlide=ar
        ? `<article class="gallery-slide gallery-slide-service" data-slide-index="${orderIndex}" data-i18n-skip="1"><div class="portrait-offer" dir="rtl"><div class="portrait-offer-glow"></div><div class="portrait-offer-content"><span class="portrait-offer-kicker">عرض لفترة محدودة</span><h3>اطلب بورتريه<br><b>String Art ملون</b></h3><div class="portrait-offer-price"><strong>$350</strong><del>$550</del><span>مقاس 60 سم</span></div><p class="portrait-offer-intro">قطعة فنية تُجهّز خصيصًا لك من صورتك، من معالجة الصورة وحتى مراجعة التصميم معك قبل بدء التنفيذ.</p><div class="portrait-offer-steps"><span><i>01</i> ترسل الصورة المناسبة للبورتريه</span><span><i>02</i> تتم معالجة الصورة وتجهيز التصميم ومراجعته معك</span><span><i>03</i> بعد اعتماد التصميم يتم دفع مبلغ تأمين لبدء التنفيذ</span><span><i>04</i> يتم تجهيز العمل ثم تنسيق الشحن والاستلام معك</span></div><div class="portrait-offer-contact"><a href="${waHref}" target="_blank" rel="noopener" class="portrait-whatsapp"><span>اطلب البورتريه الآن عبر واتساب</span><b>+20 150 541 4444</b></a><a class="portrait-facebook" href="https://www.facebook.com/AndewStringArt" target="_blank" rel="noopener"><span class="portrait-facebook-icon">f</span><span class="portrait-facebook-copy"><strong>شاهد المزيد من أعمال String Art</strong><b>Facebook · @AndewStringArt</b></span><span class="portrait-facebook-arrow">↗</span></a><small>بمجرد الضغط هتفتح لك رسالة طلب جاهزة على واتساب.</small></div></div></div><div class="slide-caption"><span>${orderNumber} / ${orderNumber}</span><strong>اطلب بورتريه خاص بك</strong></div></article>`
        : `<article class="gallery-slide gallery-slide-service" data-slide-index="${orderIndex}" data-i18n-skip="1"><div class="portrait-offer" dir="ltr"><div class="portrait-offer-glow"></div><div class="portrait-offer-content"><span class="portrait-offer-kicker">LIMITED-TIME OFFER</span><h3>ORDER YOUR OWN<br><b>COLORED STRING ART PORTRAIT</b></h3><div class="portrait-offer-price"><strong>$350</strong><del>$550</del><span>60 CM</span></div><p class="portrait-offer-intro">A one-of-a-kind portrait prepared especially from your photo, including image preparation and a design review with you before production begins.</p><div class="portrait-offer-steps"><span><i>01</i> Send the photo you want to use</span><span><i>02</i> We prepare the image and review the design with you</span><span><i>03</i> After approval, a deposit confirms production</span><span><i>04</i> The artwork is completed, then shipping and delivery are arranged</span></div><div class="portrait-offer-contact"><a href="${waHref}" target="_blank" rel="noopener" class="portrait-whatsapp"><span>ORDER NOW ON WHATSAPP</span><b>+20 150 541 4444</b></a><a class="portrait-facebook" href="https://www.facebook.com/AndewStringArt" target="_blank" rel="noopener"><span class="portrait-facebook-icon">f</span><span class="portrait-facebook-copy"><strong>See more String Art work</strong><b>Facebook · @AndewStringArt</b></span><span class="portrait-facebook-arrow">↗</span></a><small>Tap WhatsApp and a ready-made order message will open automatically.</small></div></div></div><div class="slide-caption"><span>${orderNumber} / ${orderNumber}</span><strong>ORDER YOUR PORTRAIT</strong></div></article>`;
      const dots=Array.from({length:total},(_,i)=>`<button type="button" class="gallery-dot${i===0?' active':''}" data-gallery-dot="${i}" aria-label="${ar?'الانتقال إلى السلايد':'Go to slide'} ${i+1}"></button>`).join('');
      return `<section class="gallery art-gallery carousel-gallery" data-i18n-skip="1"><div class="gallery-head"><div><span class="gallery-kicker">${kicker}</span><h2>${title}</h2><p>${note}</p></div><span class="gallery-count">${ar?`${items.length} أعمال + طلب`:`${items.length} ARTWORK${items.length===1?'':'S'} + ORDER`}</span></div><div class="gallery-slider-shell"><button type="button" class="gallery-arrow gallery-prev" aria-label="${ar?'العمل السابق':'Previous artwork'}">←</button><div class="gallery-slider-track" tabindex="0">${slides+orderSlide}</div><button type="button" class="gallery-arrow gallery-next" aria-label="${ar?'العمل التالي':'Next artwork'}">→</button></div><div class="gallery-slider-footer"><div class="gallery-dots">${dots}</div><div class="gallery-progress"><strong id="gallery-current">01</strong><span>/ ${String(total).padStart(2,'0')}</span></div></div><div class="gallery-swipe-hint">${ar?'اسحب للمشاهدة • أو استخدم الأسهم':'SWIPE / DRAG • OR USE ARROWS'}</div></section>`;
    }

    const cards=items.map((m,i)=>{const url=esc(media(m.url)),alt=esc(m.alt_text||local(p,'title'));if(m.media_type==='video')return `<article class="media-item media-video" data-i18n-skip="1"><div class="media-frame"><video controls playsinline preload="metadata" src="${url}"></video><span class="media-type">${ar?'فيديو':'VIDEO'}</span></div></article>`;return `<figure class="media-item media-image" data-lightbox-src="${url}" data-lightbox-alt="${alt}" tabindex="0" role="button" data-i18n-skip="1"><div class="media-frame"><img src="${url}" alt="${alt}" loading="lazy" decoding="async" /><span class="media-type">${ar?'عرض':'VIEW'}</span><span class="media-index">${String(i+1).padStart(2,'0')}</span></div></figure>`;}).join('');
    return `<section class="gallery" data-i18n-skip="1"><div class="gallery-head"><div><span class="gallery-kicker">${kicker}</span><h2>${title}</h2><p>${note}</p></div><span class="gallery-count">${ar?`${items.length} عناصر`:`${items.length} PIECE${items.length===1?'':'S'}`}</span></div><div class="media-grid">${cards}</div></section>`;
  }

  function installGallerySlider(){
    const gallery=document.querySelector('.carousel-gallery');if(!gallery)return;const track=gallery.querySelector('.gallery-slider-track'),slides=[...gallery.querySelectorAll('.gallery-slide')],dots=[...gallery.querySelectorAll('.gallery-dot')],current=gallery.querySelector('#gallery-current'),prev=gallery.querySelector('.gallery-prev'),next=gallery.querySelector('.gallery-next');let active=0,raf=0;
    const setActive=index=>{active=Math.max(0,Math.min(slides.length-1,index));dots.forEach((d,i)=>d.classList.toggle('active',i===active));if(current)current.textContent=String(active+1).padStart(2,'0');if(prev)prev.disabled=active===0;if(next)next.disabled=active===slides.length-1;};
    const go=index=>{const slide=slides[Math.max(0,Math.min(slides.length-1,index))];if(!slide)return;track.scrollTo({left:slide.offsetLeft,behavior:'smooth'});setActive(Number(slide.dataset.slideIndex||0));};
    prev?.addEventListener('click',()=>go(active-1));next?.addEventListener('click',()=>go(active+1));dots.forEach(d=>d.addEventListener('click',()=>go(Number(d.dataset.galleryDot||0))));track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();go(active+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(active-1)}});track.addEventListener('scroll',()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{let nearest=0,best=Infinity;slides.forEach((s,i)=>{const dist=Math.abs(s.offsetLeft-track.scrollLeft);if(dist<best){best=dist;nearest=i}});setActive(nearest)})},{passive:true});
    let down=false,startX=0,startLeft=0,moved=false;track.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.target.closest('video,button,a'))return;down=true;moved=false;startX=e.clientX;startLeft=track.scrollLeft;track.classList.add('dragging');track.setPointerCapture?.(e.pointerId)});track.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-startX;if(Math.abs(dx)>4)moved=true;track.scrollLeft=startLeft-dx});const end=e=>{if(!down)return;down=false;track.classList.remove('dragging');try{track.releasePointerCapture?.(e.pointerId)}catch(_){}if(moved){let nearest=0,best=Infinity;slides.forEach((s,i)=>{const dist=Math.abs(s.offsetLeft-track.scrollLeft);if(dist<best){best=dist;nearest=i}});go(nearest)}};track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);setActive(0);
  }

  function installLightbox(){
    if(document.getElementById('project-lightbox'))return;const box=document.createElement('div');box.id='project-lightbox';box.className='project-lightbox';box.setAttribute('aria-hidden','true');box.innerHTML='<button class="lightbox-close" type="button" aria-label="Close">×</button><div class="lightbox-stage"><img alt="" /></div><div class="lightbox-hint">CLICK OUTSIDE OR PRESS ESC TO CLOSE</div>';document.body.appendChild(box);const img=box.querySelector('img');const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open');setTimeout(()=>img.src='',220)};const open=(src,alt)=>{img.src=src;img.alt=alt||'';box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')};document.addEventListener('click',e=>{const item=e.target.closest('[data-lightbox-src]');if(item&&!item.closest('.gallery-slider-track.dragging'))open(item.dataset.lightboxSrc,item.dataset.lightboxAlt)});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});box.querySelector('.lightbox-close').addEventListener('click',close);box.addEventListener('click',e=>{if(e.target===box||e.target.classList.contains('lightbox-stage'))close()});
  }

  function render(p){
    const ar=isAr(),title=local(p,'title'),excerpt=local(p,'excerpt')||local(p,'description'),description=local(p,'description')||excerpt,challenge=local(p,'challenge'),solution=local(p,'solution'),result=local(p,'result'),category=ar?(p.portfolio_categories?.name_ar||p.portfolio_categories?.name||'مشروع'):(p.portfolio_categories?.name||'Project'),tags=[...((ar&&p.tags_ar?.length)?p.tags_ar:p.tags||[]),...((ar&&p.tools_ar?.length)?p.tools_ar:p.tools||[])].map(publicText);
    document.title=`${title} — ATS`;const isStringArt=p.slug==='magic-of-string-art';document.body.classList.toggle('string-art-project',isStringArt);let mediaItems=(p.portfolio_project_media||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));if(isStringArt)mediaItems=mediaItems.sort((a,b)=>(a.media_type==='video'?0:1)-(b.media_type==='video'?0:1)||(a.sort_order||0)-(b.sort_order||0));
    root.innerHTML=`<section class="project-hero"><div class="container project-hero-grid"><div class="project-hero-copy" data-i18n-skip="1"><div class="project-category">${esc(category)}</div><h1>${esc(title)}</h1><p class="project-lead">${esc(excerpt)}</p><div class="project-meta">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="project-links">${p.project_url?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(p.project_url)}">${ar?'عرض المشروع':'VIEW LIVE →'}</a>`:''}${p.video_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.video_url)}">${ar?'شاهد الفيديو':'WATCH VIDEO →'}</a>`:''}${p.github_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.github_url)}">GITHUB</a>`:''}</div></div><div class="project-cover"><img src="${esc(media(p.cover_url))}" alt="${esc(title)}" loading="eager" decoding="async" /></div></div></section><section class="project-body"><div class="container"><div class="project-copy" data-i18n-skip="1"><div><span class="copy-kicker">${ar?'دراسة حالة':'CASE STUDY'}</span><h2>${ar?'المشروع':'THE PROJECT.'}</h2></div><p>${esc(description)}</p></div><div class="case-grid" data-i18n-skip="1">${challenge?`<article class="case-block"><strong>${ar?'01 / التحدي':'01 / CHALLENGE'}</strong><h2>${ar?'التحدي':'THE CHALLENGE.'}</h2><p>${esc(challenge)}</p></article>`:''}${solution?`<article class="case-block"><strong>${ar?'02 / الحل':'02 / SOLUTION'}</strong><h2>${ar?'الحل':'THE SOLUTION.'}</h2><p>${esc(solution)}</p></article>`:''}${result?`<article class="case-block"><strong>${ar?'03 / النتيجة':'03 / RESULT'}</strong><h2>${ar?'الأثر':'THE IMPACT.'}</h2><p>${esc(result)}</p></article>`:''}</div>${galleryMarkup(mediaItems,p)}</div></section>`;
    if(isStringArt)installGallerySlider();if(mediaItems.some(m=>m.media_type!=='video'))installLightbox();
  }

  async function load(){
    if(!slug){fail(isAr()?'المشروع غير موجود':'Project not found');return;}
    try{
      let p=null;
      try{p=await fetchProject(5000)}catch(firstError){
        console.warn('Project fast fetch retry:',firstError);
        await wait(180);
        p=await fetchProject(5000);
      }
      if(!p){fail(isAr()?'صفحة المشروع غير متاحة حاليًا':'Project page is not available yet');return;}
      currentProject=p;render(p);
      document.dispatchEvent(new CustomEvent('portfolio:contentrendered'));
    }catch(error){
      console.error('Project load failed:',error);
      fail(isAr()?'تعذر تحميل المشروع. حاول مرة أخرى.':'Could not load the project. Please try again.');
    }
  }
  function fail(msg){const ar=isAr();root.innerHTML=`<section class="project-error" data-i18n-skip="1"><h1>${esc(msg)}</h1><p>${ar?'يمكنك إعادة المحاولة أو الرجوع إلى الأعمال.':'You can retry or return to the work page.'}</p><div class="project-error-actions"><button class="btn btn-primary" id="retry-project" type="button">${ar?'إعادة المحاولة':'RETRY'}</button><a class="btn btn-ghost" href="/work">${ar?'العودة للأعمال':'BACK TO WORK'}</a></div></section>`;document.getElementById('retry-project')?.addEventListener('click',()=>{root.innerHTML='<section class="project-loading"><div class="loader-mark"></div><p>'+(ar?'جاري تحميل المشروع...':'Loading project...')+'</p></section>';load()},{once:true});}
  document.addEventListener('portfolio:languagechange',()=>{if(currentProject)render(currentProject);else load()});
  load();
})();