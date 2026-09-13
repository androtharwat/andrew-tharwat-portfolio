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
    const tags=[...(p.tags||[]),...(p.tools||[])];
    const mediaItems=(p.portfolio_project_media||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
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
          <div class="project-cover"><img src="${esc(media(p.cover_url))}" alt="${esc(p.title)}" loading="eager" decoding="async" /></div>
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
          ${mediaItems.length?`<section class="gallery"><div class="gallery-head"><h2>PROJECT GALLERY.</h2><span>${mediaItems.length} MEDIA ITEM${mediaItems.length===1?'':'S'}</span></div><div class="media-grid">${mediaItems.map(m=>m.media_type==='video'?`<div class="media-item"><video controls preload="metadata" src="${esc(media(m.url))}"></video></div>`:`<figure class="media-item"><img src="${esc(media(m.url))}" alt="${esc(m.alt_text||p.title)}" loading="lazy" decoding="async" /></figure>`).join('')}</div></section>`:''}
        </div>
      </section>`;
  }
  function fail(msg){root.innerHTML=`<section class="project-error"><h1>${esc(msg)}</h1><p>This project is either not published yet or its public page is currently disabled.</p><a class="btn btn-primary" href="/work">BACK TO WORK</a></section>`;}
  load();
})();
