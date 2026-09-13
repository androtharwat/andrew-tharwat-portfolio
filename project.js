(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const root=document.getElementById('project-root');
  if(!cfg || !window.supabase){ root.innerHTML='<section class="project-error"><h1>Configuration error</h1></section>'; return; }
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(u='')=>{const clean=(u||'').replace(/^\//,'');if(window.PORTFOLIO_ASSETS&&window.PORTFOLIO_ASSETS[clean])return window.PORTFOLIO_ASSETS[clean];return /^https?:\/\//i.test(u)?u:clean};
  const pathSlug=location.pathname.match(/\/projects\/([^/?#]+)/)?.[1];
  const slug=decodeURIComponent(pathSlug || new URLSearchParams(location.search).get('slug') || '');

  async function load(){
    if(!slug){fail('Project not found');return;}
    const {data:p,error}=await sb.from('portfolio_projects').select('*,portfolio_categories(name,color),portfolio_project_media(*)').eq('slug',slug).eq('status','published').single();
    if(error||!p){fail('Project not found');return;}
    document.title=`${p.title} — Andrew Tharwat`;
    const tags=[...(p.tags||[]),...(p.tools||[])];
    const mediaItems=(p.portfolio_project_media||[]).sort((a,b)=>a.sort_order-b.sort_order);
    root.innerHTML=`
      <section class="project-hero">
        <div class="container project-hero-grid">
          <div>
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
          <div class="project-cover"><img src="${esc(media(p.cover_url||'assets/logo-mark.png'))}" alt="${esc(p.title)}" /></div>
        </div>
      </section>
      <section class="project-body">
        <div class="container">
          <div class="project-copy"><h2>THE PROJECT.</h2><p>${esc(p.description||p.excerpt||'')}</p></div>
          <div class="case-grid">
            ${p.challenge?`<article class="case-block"><strong>01 / CHALLENGE</strong><h2>THE CHALLENGE.</h2><p>${esc(p.challenge)}</p></article>`:''}
            ${p.solution?`<article class="case-block"><strong>02 / SOLUTION</strong><h2>THE SOLUTION.</h2><p>${esc(p.solution)}</p></article>`:''}
            ${p.result?`<article class="case-block"><strong>03 / RESULT</strong><h2>THE IMPACT.</h2><p>${esc(p.result)}</p></article>`:''}
          </div>
          ${mediaItems.length?`<section class="gallery"><div class="gallery-head"><h2>PROJECT GALLERY.</h2><span>${mediaItems.length} MEDIA ITEMS</span></div><div class="media-grid">${mediaItems.map(m=>m.media_type==='video'?`<div class="media-item"><video controls src="${esc(media(m.url))}"></video></div>`:`<figure class="media-item"><img src="${esc(media(m.url))}" alt="${esc(m.alt_text||p.title)}" loading="lazy" /></figure>`).join('')}</div></section>`:''}
        </div>
      </section>`;
  }
  function fail(msg){root.innerHTML=`<section class="project-error"><h1>${esc(msg)}</h1><p>This project may be a draft, unpublished, or unavailable.</p><a class="btn btn-primary" href="/">BACK HOME</a></section>`;}
  load();
})();
