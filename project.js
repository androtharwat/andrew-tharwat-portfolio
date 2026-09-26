(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const root=document.getElementById('project-root');
  if(!cfg || !window.supabase){root.innerHTML='<section class="project-error"><h1>Configuration error</h1></section>';return;}
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(u='')=>{if(!u)return'/assets/ats-logo-mark.webp';if(/^https?:\/\//i.test(u))return u;const clean=String(u).replace(/^\/+/, '');if(window.PORTFOLIO_ASSETS&&window.PORTFOLIO_ASSETS[clean])return window.PORTFOLIO_ASSETS[clean];return '/'+clean;};
  const pathSlug=location.pathname.match(/\/projects\/([^/?#]+)/)?.[1];
  const slug=decodeURIComponent(pathSlug || new URLSearchParams(location.search).get('slug') || '');
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  const isAr=()=>lang()==='ar';
  const local=(obj,key)=>isAr()&&obj?.[`${key}_ar`]?obj[`${key}_ar`]:obj?.[key]||'';
  let currentProject=null;

  function galleryMarkup(items,p){
    if(!items.length)return'';
    const ar=isAr(),stringArt=p.slug==='magic-of-string-art';
    const title=stringArt?(ar?'دلوقتي بص للأعمال من جديد':'NOW LOOK AGAIN.'):(ar?'معرض المشروع':'PROJECT GALLERY.');
    const kicker=stringArt?(ar?'بورتريهات حقيقية · خيط حقيقي':'REAL PORTRAITS · REAL THREAD'):(ar?'الأرشيف البصري':'VISUAL ARCHIVE');
    const note=stringArt?(ar?'بعد ما عرفت المنطق، قرب من الأعمال: شوف مناطق الكثافة، اتجاهات الخيط، وإزاي الشبكة تتحول لملامح لما تبعد خطوة.':'Now that you know the logic, look closer: notice density, thread direction, and how a network of straight lines becomes a face when you step back.'):(ar?'صور وفيديوهات من المشروع.':'Images and video from the project.');

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
      return `<section id="sa-gallery" class="gallery art-gallery carousel-gallery" data-i18n-skip="1"><div class="gallery-head"><div><span class="gallery-kicker">${kicker}</span><h2>${title}</h2><p>${note}</p></div><span class="gallery-count">${ar?`${items.length} أعمال + طلب`:`${items.length} ARTWORK${items.length===1?'':'S'} + ORDER`}</span></div><div class="gallery-slider-shell"><button type="button" class="gallery-arrow gallery-prev" aria-label="${ar?'العمل السابق':'Previous artwork'}">←</button><div class="gallery-slider-track" tabindex="0">${slides+orderSlide}</div><button type="button" class="gallery-arrow gallery-next" aria-label="${ar?'العمل التالي':'Next artwork'}">→</button></div><div class="gallery-slider-footer"><div class="gallery-dots">${dots}</div><div class="gallery-progress"><strong id="gallery-current">01</strong><span>/ ${String(total).padStart(2,'0')}</span></div></div><div class="gallery-swipe-hint">${ar?'اسحب للمشاهدة • أو استخدم الأسهم':'SWIPE / DRAG • OR USE ARROWS'}</div></section>`;
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

function stringArtMarkup(p,mediaItems){
  const ar=isAr();
  const cover=esc(media(p.cover_url));
  const detailItem=mediaItems.find(m=>m.media_type!=='video');
  const detail=esc(media(detailItem?.url||p.cover_url));
  const copy=ar?{
    kicker:'حسابات × حرفة · تجربة بدأت في 2017',
    titleA:'الملامح لا تُرسم هنا.',
    titleB:'هي تظهر من بين الخيوط.',
    lead:'صورة. نقاط. أرقام. خيوط. وفجأة… ملامح.',
    watch:'شوف الملامح بتظهر ↓',works:'شوف الأعمال',
    paradoxK:'الخدعة البصرية',paradoxA:'من قريب: شبكة خيوط.',paradoxB:'من بعيد: شخص تعرفه.',
    paradoxP:'كل تقاطع يضيف ظلًا. كل مسار يغيّر الصورة.',
    processK:'من الصورة إلى تسلسل أرقام',processH:'قبل ما الخيط يلمس المسمار، الصورة بتتحول لمسألة.',
    processP:'اختار أفضل وصلة. حدّث الفرق. كرر.',
    replay:'أعد بناء الوجه',live:'تجربة حية · الخطوط تتراكم أمامك',
    steps:[
      ['01','الضوء والظل','نقرأ الكثافة.'],
      ['02','النقاط','كل مسمار له رقم.'],
      ['03','المسارات','نختبر الوصلات الممكنة.'],
      ['04','الاختيار','نأخذ المسار الأكثر فائدة.'],
      ['05','الظهور','التكرار يصنع الملامح.']
    ],
    equationK:'تبسيط للفكرة الحسابية',equationP:'أقل فرق بصري. أقل تشبع زائد.',
    handK:'من الأرقام إلى اليد',handA:'الحسابات لا تمسك الخيط.',handB:'هي فقط تقول لليد أين تذهب بعد ذلك.',
    handP:'الأرقام تحدد الطريق. اليد تصنع القطعة.',
    distanceK:'المسافة جزء من العمل',distanceH:'السحر الحقيقي يحصل بين 2 سم و2 متر.',
    distanceP:'قريب: خطوط. بعيد: وجه.',
    close:'قريب · تشابك',far:'بعيد · ملامح',
    originK:'2017 · قبل موجة الـAI الحالية',originH:'السؤال كان: هل الحسابات تقدر توسّع قدرة اليد بدل ما تستبدلها؟',
    originP:'بدأت كتجربة لدمج الحساب بالحرفة — لا لاستبدال اليد.',
    originStats:[['2017','بداية التجربة'],['150+','بورتريه مخصص'],['100%','تنفيذ مادي يدوي']],
    labK:'جرّب المحرك الواقعي',labH:'ارفع صورتك… وخلي الخيط يعيد بناء ملامحك.',labP:'اضبط الكادر. MASTER يبدأ تلقائيًا بأعلى دقة.',
    labUpload:'اختر صورة',labDrop:'اضغط أو اسحب الصورة',labPrivacy:'محلي على جهازك',labMode:'المحرك',labMono:'REALISTIC MONO',labColor:'COLOR LAB',labQuality:'الجودة',labFast:'سريع',labDetail:'PRO',labShare:'MASTER',labFrame:'اضبط الكادر',labZoom:'تكبير',labFit:'ملاءمة',labCenter:'توسيط',labRotate:'تدوير',labContrast:'التباين',labGamma:'الظل',labGenerate:'ابدأ الرسم',labReady:'ارفع صورة وابدأ',labOriginal:'اضبط الصورة',labResult:'النتيجة',labProgress:'جارٍ الحساب…',labReplay:'إعادة',labDownload:'PNG عالي الجودة',labVideo:'فيديو البناء',labShareBtn:'مشاركة',labSpeak:'الأرقام صوتيًا',labSequence:'المسار',labProd:'MASTER · 360 مسمار · حتى 5000 خط · يتوقف تلقائيًا عند اكتمال التحسن.',labBrand:'كل ملف محفوظ يحمل علامة ATS.',
    finalK:'دلوقتي أنت عارف السر',finalH:'مستعد تشوف الخيط بدل الصورة؟',finalP:'قرب. ابعد. شوف الخيط قبل ما تشوف الوجه.'
  }:{
    kicker:'COMPUTATION × CRAFT · EXPERIMENTING SINCE 2017',
    titleA:"THE FACE ISN'T DRAWN.",
    titleB:'IT EMERGES FROM THE THREAD.',
    lead:'Image. Points. Numbers. Thread. Then suddenly — a face.',
    watch:'WATCH THE FACE EMERGE ↓',works:'SEE THE WORKS',
    paradoxK:'THE VISUAL ILLUSION',paradoxA:'UP CLOSE: A NETWORK OF THREAD.',paradoxB:'STEP BACK: SOMEONE YOU KNOW.',
    paradoxP:'Every crossing adds tone. Every route changes the image.',
    processK:'FROM PHOTOGRAPH TO NUMBER SEQUENCE',processH:'Before thread touches a nail, the portrait becomes a problem to solve.',
    processP:'Choose the best line. Update the error. Repeat.',
    replay:'REBUILD THE FACE',live:'LIVE DEMO · WATCH DENSITY ACCUMULATE',
    steps:[
      ['01','LIGHT / SHADOW','Read density.'],
      ['02','POINTS','Every nail gets an index.'],
      ['03','ROUTES','Test possible chords.'],
      ['04','CHOOSE','Take the most useful route.'],
      ['05','EMERGE','Repetition builds likeness.']
    ],
    equationK:'A SIMPLIFIED VIEW OF THE SCORING LOGIC',equationP:'Less visual error. Less overfill.',
    handK:'FROM NUMBERS TO HANDS',handA:"THE COMPUTER DOESN'T HOLD THE THREAD.",handB:'IT ONLY TELLS THE HAND WHERE TO GO NEXT.',
    handP:'The numbers choose the route. The hand makes the object.',
    distanceK:'DISTANCE IS PART OF THE MEDIUM',distanceH:'THE MAGIC LIVES BETWEEN 2 CM AND 2 METERS.',
    distanceP:'Close: lines. Far: likeness.',
    close:'CLOSE · CONNECTIONS',far:'FAR · LIKENESS',
    originK:'2017 · BEFORE THE CURRENT GENERATIVE-AI WAVE',originH:'THE QUESTION WAS: CAN COMPUTATION EXTEND THE HAND INSTEAD OF REPLACING IT?',
    originP:'It began as an experiment in extending the hand with computation — not replacing it.',
    originStats:[['2017','EXPERIMENT STARTED'],['150+','CUSTOM PORTRAITS'],['100%','PHYSICAL HANDCRAFT']],
    labK:'TRY THE REALISTIC ENGINE',labH:'UPLOAD A PHOTO. LET THREAD REBUILD YOUR LIKENESS.',labP:'Frame the portrait. MASTER starts at the highest fidelity.',
    labUpload:'CHOOSE A PHOTO',labDrop:'CLICK OR DROP PHOTO',labPrivacy:'LOCAL ON YOUR DEVICE',labMode:'ENGINE',labMono:'REALISTIC MONO',labColor:'COLOR LAB',labQuality:'QUALITY',labFast:'QUICK',labDetail:'PRO',labShare:'MASTER',labFrame:'FRAME',labZoom:'ZOOM',labFit:'FIT',labCenter:'CENTER',labRotate:'ROTATE',labContrast:'CONTRAST',labGamma:'SHADOW',labGenerate:'BUILD MY PORTRAIT',labReady:'UPLOAD + START',labOriginal:'FRAME PHOTO',labResult:'RESULT',labProgress:'COMPUTING…',labReplay:'REPLAY',labDownload:'HQ PNG',labVideo:'BUILD VIDEO',labShareBtn:'SHARE',labSpeak:'SPEAK PINS',labSequence:'ROUTE',labProd:'MASTER · 360 nails · up to 5,000 lines · auto-stops when new lines stop improving the portrait.',labBrand:'Every saved file carries the ATS mark.',
    finalK:'NOW YOU KNOW THE TRICK',finalH:'READY TO SEE THE THREAD INSTEAD OF THE PICTURE?',finalP:'Move close. Step back. See the thread before the face.'
  };
  const steps=copy.steps.map(([n,h,p])=>`<article class="sa-step"><span>${n}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></article>`).join('');
  const stats=copy.originStats.map(([v,l])=>`<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('');
  return `
    <section class="sa-hero" data-i18n-skip="1">
      <div class="container sa-hero-grid">
        <div class="sa-hero-copy">
          <p class="sa-kicker">${esc(copy.kicker)}</p>
          <h1>${esc(copy.titleA)}<br><span>${esc(copy.titleB)}</span></h1>
          <p class="sa-hero-lead">${esc(copy.lead)}</p>
          <div class="sa-hero-tags"><span>${ar?'مسامير مرقمة':'NUMBERED NAILS'}</span><span>${ar?'مسارات محسوبة':'CALCULATED PATHS'}</span><span>${ar?'تنفيذ يدوي':'HAND-BUILT'}</span></div>
          <div class="sa-actions"><a class="sa-primary" href="#sa-process">${esc(copy.watch)}</a><a class="sa-secondary" href="#sa-gallery">${esc(copy.works)}</a></div>
        </div>
        <figure class="sa-hero-visual">
          <div class="sa-hero-frame"><img src="${cover}" alt="${esc(local(p,'title'))}" loading="eager" decoding="async"><canvas id="sa-hero-thread" width="900" height="620" aria-hidden="true"></canvas></div>
          <figcaption><span>${ar?'قرب: هندسة':'UP CLOSE: GEOMETRY'}</span><i></i><span>${ar?'ابعد: ملامح':'STEP BACK: LIKENESS'}</span></figcaption>
        </figure>
      </div>
    </section>
    <main class="sa-story" data-i18n-skip="1">
      <section id="sa-lab" class="sa-lab">
        <div class="container sa-lab-head">
          <div><p class="sa-kicker">${esc(copy.labK)}</p><h2>${esc(copy.labH)}</h2></div>
          <p>${esc(copy.labP)}</p>
        </div>
        <div class="container sa-lab-shell">
          <aside class="sa-lab-controls">
            <label class="sa-upload" id="sa-upload-zone">
              <input id="sa-user-file" type="file" accept="image/jpeg,image/png,image/webp" />
              <span class="sa-upload-icon">+</span><b>${esc(copy.labDrop)}</b><small>${esc(copy.labPrivacy)}</small>
            </label>
            <div class="sa-control-group"><span>${esc(copy.labMode)}</span><div class="sa-segmented sa-mono-only"><button type="button" class="active" data-sa-mode="mono">${esc(copy.labMono)}</button></div></div>
            <div class="sa-control-group"><span>${esc(copy.labQuality)}</span><div class="sa-segmented sa-quality"><button type="button" data-sa-quality="quick">${esc(copy.labFast)}</button><button type="button" data-sa-quality="enhanced">${esc(copy.labDetail)}</button><button type="button" class="active" data-sa-quality="share">${esc(copy.labShare)}</button></div></div>
            <div class="sa-control-group sa-framing-controls"><span>${esc(copy.labFrame)}</span>
              <label class="sa-range sa-zoom-range"><span>${esc(copy.labZoom)} <b id="sa-zoom-value">1.00×</b></span><input id="sa-zoom" type="range" min="1" max="3.2" step="0.02" value="1"></label>
              <div class="sa-frame-buttons"><button id="sa-fit" type="button">${esc(copy.labFit)}</button><button id="sa-center" type="button">${esc(copy.labCenter)}</button><button id="sa-rotate" type="button">${esc(copy.labRotate)} ↻</button></div>
            </div>
            <div class="sa-tune-row">
              <label class="sa-range"><span>${esc(copy.labContrast)} <b id="sa-contrast-value">1.20</b></span><input id="sa-contrast" type="range" min="0.80" max="1.90" step="0.05" value="1.20"></label>
              <label class="sa-range"><span>${esc(copy.labGamma)} <b id="sa-gamma-value">0.90</b></span><input id="sa-gamma" type="range" min="0.55" max="1.45" step="0.05" value="0.90"></label>
            </div>
            <button id="sa-generate" class="sa-generate" type="button" disabled>${esc(copy.labGenerate)}</button>
            <p class="sa-production-note">${esc(copy.labProd)}<br><b>${esc(copy.labBrand)}</b></p>
          </aside>
          <div class="sa-lab-stage">
            <div class="sa-preview-grid">
              <figure class="sa-source-figure"><figcaption>${esc(copy.labOriginal)} <small>DRAG · WHEEL / ZOOM</small></figcaption><div class="sa-source-wrap"><canvas id="sa-user-source" width="720" height="720"></canvas><span class="sa-crop-ring" aria-hidden="true"></span></div></figure>
              <figure><figcaption>${esc(copy.labResult)}</figcaption><canvas id="sa-user-result" width="720" height="720"></canvas></figure>
            </div>
            <div class="sa-lab-status"><span id="sa-lab-status">${esc(copy.labReady)}</span><b id="sa-lab-progress">0%</b></div>
            <div id="sa-result-tools" class="sa-result-tools hidden">
              <div class="sa-sequence-preview"><span>${esc(copy.labSequence)}</span><code id="sa-user-sequence">—</code></div>
              <div class="sa-result-actions">
                <button id="sa-user-replay" type="button">${esc(copy.labReplay)} ↻</button>
                <button id="sa-user-speak" type="button">${esc(copy.labSpeak)} ◉</button>
                <button id="sa-user-download" class="primary-export" type="button">${esc(copy.labDownload)} ↓</button>
                <button id="sa-user-video" type="button">${esc(copy.labVideo)} ●</button>
                <button id="sa-user-share" type="button">${esc(copy.labShareBtn)} ↗</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="sa-paradox"><div class="container"><p class="sa-kicker">${esc(copy.paradoxK)}</p><h2>${esc(copy.paradoxA)}<br><span>${esc(copy.paradoxB)}</span></h2><p>${esc(copy.paradoxP)}</p></div></section>
      <section id="sa-process" class="sa-process">
        <div class="container sa-process-head"><div><p class="sa-kicker">${esc(copy.processK)}</p><h2>${esc(copy.processH)}</h2></div><p>${esc(copy.processP)}</p></div>
        <div class="container sa-process-grid">
          <div class="sa-demo-card"><div class="sa-demo-top"><span>${esc(copy.live)}</span><b id="sa-line-count">000 / 360</b></div><canvas id="sa-thread-demo" width="600" height="600" aria-label="${ar?'محاكاة مبسطة لتكوّن بورتريه بالخيط':'Simplified simulation of a portrait emerging from thread'}"></canvas><div class="sa-demo-hud"><span id="sa-pin-route">PIN 07 → 42</span><button id="sa-replay" type="button">${esc(copy.replay)} ↻</button></div></div>
          <div class="sa-steps">${steps}</div>
        </div>
        <div class="container sa-equation"><div><span>${esc(copy.equationK)}</span><code>next line = arg max ( Δ likeness − overlap penalty )</code></div><p>${esc(copy.equationP)}</p></div>
      </section>
      <section class="sa-handoff"><div class="container sa-handoff-grid"><div class="sa-handoff-copy"><p class="sa-kicker">${esc(copy.handK)}</p><h2>${esc(copy.handA)}<br><span>${esc(copy.handB)}</span></h2><p>${esc(copy.handP)}</p></div><div class="sa-sequence"><span>042</span><i>→</i><span>187</span><i>→</i><span>011</span><i>→</i><span>096</span><i>→</i><span>214</span><i>→</i><span>073</span><small>${ar?'ترتيب التنفيذ يتحول إلى إيقاع يدوي مستمر':'THE ROUTE BECOMES A PHYSICAL RHYTHM'}</small></div></div></section>
      <section class="sa-distance"><div class="container"><div class="sa-distance-copy"><p class="sa-kicker">${esc(copy.distanceK)}</p><h2>${esc(copy.distanceH)}</h2><p>${esc(copy.distanceP)}</p></div><div class="sa-distance-grid"><figure class="sa-distance-close"><div><img src="${detail}" alt="" loading="lazy"></div><figcaption>${esc(copy.close)}</figcaption></figure><div class="sa-distance-arrow">→</div><figure class="sa-distance-far"><div><img src="${detail}" alt="${esc(local(p,'title'))}" loading="lazy"></div><figcaption>${esc(copy.far)}</figcaption></figure></div></div></section>
      <section class="sa-origin"><div class="container sa-origin-grid"><div><p class="sa-kicker">${esc(copy.originK)}</p><h2>${esc(copy.originH)}</h2><p>${esc(copy.originP)}</p></div><div class="sa-origin-stats">${stats}</div></div></section>
      <section class="sa-gallery-intro"><div class="container"><p class="sa-kicker">${esc(copy.finalK)}</p><h2>${esc(copy.finalH)}</h2><p>${esc(copy.finalP)}</p></div></section>
      <section class="sa-gallery-host"><div class="container">${galleryMarkup(mediaItems,p)}</div></section>
    </main>`;
}

  function render(p){
    const ar=isAr(),title=local(p,'title'),excerpt=local(p,'excerpt')||local(p,'description'),description=local(p,'description')||excerpt,challenge=local(p,'challenge'),solution=local(p,'solution'),result=local(p,'result'),category=ar?(p.portfolio_categories?.name_ar||p.portfolio_categories?.name||'مشروع'):(p.portfolio_categories?.name||'Project'),tags=[...((ar&&p.tags_ar?.length)?p.tags_ar:p.tags||[]),...((ar&&p.tools_ar?.length)?p.tools_ar:p.tools||[])];
    document.title=`${title} — ATS`;const isStringArt=p.slug==='magic-of-string-art';document.body.classList.toggle('string-art-project',isStringArt);let mediaItems=(p.portfolio_project_media||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));if(isStringArt)mediaItems=mediaItems.sort((a,b)=>(a.media_type==='video'?0:1)-(b.media_type==='video'?0:1)||(a.sort_order||0)-(b.sort_order||0));
    if(isStringArt){root.innerHTML=stringArtMarkup(p,mediaItems);installGallerySlider();if(mediaItems.some(m=>m.media_type!=='video'))installLightbox();document.dispatchEvent(new CustomEvent('ats:stringart:rendered'));return;}
    root.innerHTML=`<section class="project-hero"><div class="container project-hero-grid"><div class="project-hero-copy" data-i18n-skip="1"><div class="project-category">${esc(category)}</div><h1>${esc(title)}</h1><p class="project-lead">${esc(excerpt)}</p><div class="project-meta">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="project-links">${p.project_url?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(p.project_url)}">${ar?'عرض المشروع':'VIEW LIVE →'}</a>`:''}${p.video_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.video_url)}">${ar?'شاهد الفيديو':'WATCH VIDEO →'}</a>`:''}${p.github_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.github_url)}">GITHUB</a>`:''}</div></div><div class="project-cover"><img src="${esc(media(p.cover_url))}" alt="${esc(title)}" loading="eager" decoding="async" /></div></div></section><section class="project-body"><div class="container"><div class="project-copy" data-i18n-skip="1"><div><span class="copy-kicker">${ar?'دراسة حالة':'CASE STUDY'}</span><h2>${ar?'المشروع':'THE PROJECT.'}</h2></div><p>${esc(description)}</p></div><div class="case-grid" data-i18n-skip="1">${challenge?`<article class="case-block"><strong>${ar?'01 / التحدي':'01 / CHALLENGE'}</strong><h2>${ar?'التحدي':'THE CHALLENGE.'}</h2><p>${esc(challenge)}</p></article>`:''}${solution?`<article class="case-block"><strong>${ar?'02 / الحل':'02 / SOLUTION'}</strong><h2>${ar?'الحل':'THE SOLUTION.'}</h2><p>${esc(solution)}</p></article>`:''}${result?`<article class="case-block"><strong>${ar?'03 / النتيجة':'03 / RESULT'}</strong><h2>${ar?'الأثر':'THE IMPACT.'}</h2><p>${esc(result)}</p></article>`:''}</div>${galleryMarkup(mediaItems,p)}</div></section>`;
    if(isStringArt)installGallerySlider();if(mediaItems.some(m=>m.media_type!=='video'))installLightbox();
  }

  async function load(){
    if(!slug){fail(isAr()?'المشروع غير موجود':'Project not found');return;}const {data:p,error}=await sb.from('portfolio_projects').select('*,portfolio_categories(name,name_ar,color),portfolio_project_media(*)').eq('slug',slug).eq('status','published').eq('page_enabled',true).single();if(error||!p){fail(isAr()?'صفحة المشروع غير متاحة حاليًا':'Project page is not available yet');return;}currentProject=p;render(p);
  }
  function fail(msg){const ar=isAr();root.innerHTML=`<section class="project-error" data-i18n-skip="1"><h1>${esc(msg)}</h1><p>${ar?'هذا المشروع إما غير منشور بعد أو أن صفحته العامة غير مفعلة.':'This project is either not published yet or its public page is currently disabled.'}</p><a class="btn btn-primary" href="/work">${ar?'العودة للأعمال':'BACK TO WORK'}</a></section>`;}
  document.addEventListener('portfolio:languagechange',()=>{if(currentProject)render(currentProject);else load()});
  load();
})();