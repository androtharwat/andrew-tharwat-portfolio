(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const root=document.getElementById('project-root');
  if(!cfg || !window.supabase){ root.innerHTML='<section class="project-error"><h1>Configuration error</h1></section>'; return; }
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(u='')=>{
    if(!u)return'/assets/app-icon-official.png';
    if(/^https?:\/\//i.test(u))return u;
    const clean=String(u).replace(/^\/+/, '');
    if(window.PORTFOLIO_ASSETS&&window.PORTFOLIO_ASSETS[clean])return window.PORTFOLIO_ASSETS[clean];
    return '/'+clean;
  };
  const pathSlug=location.pathname.match(/\/projects\/([^/?#]+)/)?.[1];
  const slug=decodeURIComponent(pathSlug || new URLSearchParams(location.search).get('slug') || '');

  function galleryMarkup(items,p){
    if(!items.length)return'';
    const stringArt=p.slug==='magic-of-string-art';
    const title=stringArt?'SELECTED ARTWORKS.':'PROJECT GALLERY.';
    const kicker=stringArt?'HANDCRAFTED COLLECTION':'VISUAL ARCHIVE';
    const note=stringArt?'A closer look at the portraits, thread geometry and handcrafted detail behind the work.':'Images and video from the project.';
    const cards=items.map((m,i)=>{
      const url=esc(media(m.url));
      const alt=esc(m.alt_text||p.title);
      if(m.media_type==='video'){
        return `<article class="media-item media-video media-${i+1}"><div class="media-frame"><video controls playsinline preload="metadata" src="${url}"></video><span class="media-type">VIDEO</span></div></article>`;
      }
      return `<figure class="media-item media-image media-${i+1}" data-lightbox-src="${url}" data-lightbox-alt="${alt}" tabindex="0" role="button" aria-label="Open artwork ${i+1}"><div class="media-frame"><img src="${url}" alt="${alt}" loading="lazy" decoding="async" /><span class="media-type">VIEW</span><span class="media-index">${String(i+1).padStart(2,'0')}</span></div></figure>`;
    }).join('');
    return `<section class="gallery ${stringArt?'art-gallery':''}"><div class="gallery-head"><div><span class="gallery-kicker">${kicker}</span><h2>${title}</h2><p>${note}</p></div><span class="gallery-count">${items.length} PIECE${items.length===1?'':'S'}</span></div><div class="media-grid">${cards}</div></section>`;
  }

  function installLightbox(){
    if(document.getElementById('project-lightbox'))return;
    const box=document.createElement('div');
    box.id='project-lightbox';
    box.className='project-lightbox';
    box.setAttribute('aria-hidden','true');
    box.innerHTML='<button class="lightbox-close" type="button" aria-label="Close">×</button><div class="lightbox-stage"><img alt="" /></div><div class="lightbox-hint">CLICK OUTSIDE OR PRESS ESC TO CLOSE</div>';
    document.body.appendChild(box);
    const img=box.querySelector('img');
    const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open');setTimeout(()=>{img.src=''},220)};
    const open=(src,alt)=>{img.src=src;img.alt=alt||'';box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')};
    document.addEventListener('click',e=>{const item=e.target.closest('[data-lightbox-src]');if(item)open(item.dataset.lightboxSrc,item.dataset.lightboxAlt)});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.key==='Enter'||e.key===' ')&&document.activeElement?.matches?.('[data-lightbox-src]')){e.preventDefault();const item=document.activeElement;open(item.dataset.lightboxSrc,item.dataset.lightboxAlt)}});
    box.querySelector('.lightbox-close').addEventListener('click',close);
    box.addEventListener('click',e=>{if(e.target===box||e.target.classList.contains('lightbox-stage'))close()});
  }

  async function load(){
    if(!slug){fail('Project not found');return;}
    const {data:p,error}=await sb
      .from('portfolio_projects')
      .select('*,portfolio_categories(name,color),portfolio_project_media(*)')
      .eq('slug',slug)
      .eq('status','published')
      .eq('page_enabled',true)
      .single();
    if(error||!p){fail('Project page is not available yet');return;}

    document.title=`${p.title} — Andrew Tharwat`;
    document.body.classList.toggle('string-art-project',p.slug==='magic-of-string-art');
    const tags=[...(p.tags||[]),...(p.tools||[])];
    const mediaItems=(p.portfolio_project_media||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    root.innerHTML=`
      <section class="project-hero">
        <div class="container project-hero-grid">
          <div class="project-hero-copy">
            <div class="project-category">${esc(p.portfolio_categories?.name||'Project')}</div>
            <h1>${esc(p.title)}</h1>
            <p class="project-lead">${esc(p.excerpt||p.description||'')}</p>
            <div class="project-meta">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>
            <div class="project-links">
              ${p.project_url?`<a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(p.project_url)}">VIEW LIVE →</a>`:''}
              ${p.video_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.video_url)}">WATCH VIDEO →</a>`:''}
              ${p.github_url?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(p.github_url)}">GITHUB →</a>`:''}
            </div>
          </div>
          <div class="project-cover"><img src="${esc(media(p.cover_url))}" alt="${esc(p.title)}" loading="eager" decoding="async" /></div>
        </div>
      </section>
      <section class="project-body">
        <div class="container">
          <div class="project-copy"><div><span class="copy-kicker">CASE STUDY</span><h2>THE PROJECT.</h2></div><p>${esc(p.description||p.excerpt||'')}</p></div>
          <div class="case-grid">
            ${p.challenge?`<article class="case-block"><strong>01 / CHALLENGE</strong><h2>THE CHALLENGE.</h2><p>${esc(p.challenge)}</p></article>`:''}
            ${p.solution?`<article class="case-block"><strong>02 / SOLUTION</strong><h2>THE SOLUTION.</h2><p>${esc(p.solution)}</p></article>`:''}
            ${p.result?`<article class="case-block"><strong>03 / RESULT</strong><h2>THE IMPACT.</h2><p>${esc(p.result)}</p></article>`:''}
          </div>
          ${galleryMarkup(mediaItems,p)}
        </div>
      </section>`;
    if(mediaItems.some(m=>m.media_type!=='video'))installLightbox();
  }
  function fail(msg){root.innerHTML=`<section class="project-error"><h1>${esc(msg)}</h1><p>This project is either not published yet or its public page is currently disabled.</p><a class="btn btn-primary" href="/work">BACK TO WORK</a></section>`;}
  load();
})();
