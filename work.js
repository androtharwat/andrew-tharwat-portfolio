(() => {
  function ensureVisuals(next){
    if(!document.querySelector('link[href*="visual-overrides.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/visual-overrides.css?v=3';document.head.appendChild(l)}
    if(window.PORTFOLIO_COVER_SPRITE){next();return}
    const s=document.createElement('script');s.src='/cover-sprite.js?v=1';s.onload=next;document.head.appendChild(s);
  }
  ensureVisuals(()=>{
    const cfg=window.PORTFOLIO_CONFIG;
    const grid=document.getElementById('work-grid');
    const status=document.getElementById('work-status');
    const filters=document.getElementById('work-filters');
    const search=document.getElementById('work-search');
    if(!cfg||!window.supabase||!grid)return;
    const logo=document.querySelector('.work-nav .brand img');if(logo)logo.src='/assets/app-icon-official.png';
    const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
    const media=(u='')=>{if(!u)return'/assets/app-icon-official.png';if(/^https?:\/\//i.test(u))return u;return '/'+u.replace(/^\//,'')};
    const spriteStyle=slug=>{const order=window.PORTFOLIO_COVER_ORDER||[],idx=order.indexOf(slug);if(!window.PORTFOLIO_COVER_SPRITE||idx<0)return'';const col=idx%4,row=Math.floor(idx/4),x=col*(100/3),y=row*100;return`background-image:url(${window.PORTFOLIO_COVER_SPRITE});background-size:400% 200%;background-position:${x}% ${y}%;`;};
    let projects=[],active='all';

    function render(){
      const q=(search?.value||'').trim().toLowerCase();
      const rows=projects.filter(p=>{const cat=p.portfolio_categories?.slug||'';const hay=[p.title,p.excerpt,p.description,(p.tags||[]).join(' '),(p.tools||[]).join(' '),p.portfolio_categories?.name].join(' ').toLowerCase();return(active==='all'||cat===active)&&(!q||hay.includes(q));});
      status.textContent=`${rows.length} project${rows.length===1?'':'s'} shown`;
      grid.innerHTML=rows.length?rows.map(p=>{const ss=spriteStyle(p.slug);return`<a class="work-card" href="/projects/${encodeURIComponent(p.slug)}"><div class="work-card-media">${ss?`<div class="work-card-sprite" style="${ss}"></div>`:`<img src="${esc(media(p.cover_url))}" alt="${esc(p.title)}" loading="lazy" decoding="async">`}<span class="work-card-cat">${esc(p.portfolio_categories?.name||'Project')}</span></div><div class="work-card-body"><h2>${esc(p.title)}</h2><p>${esc(p.excerpt||p.description||'')}</p><div class="work-tags">${(p.tags||[]).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="work-card-link">VIEW CASE STUDY →</div></div></a>`}).join(''):`<div class="work-empty">No projects match this filter yet.</div>`;
    }

    async function load(){
      const {data,error}=await sb.from('portfolio_projects').select('title,slug,excerpt,description,cover_url,tags,tools,sort_order,portfolio_categories(name,slug)').eq('status','published').order('sort_order',{ascending:true});
      if(error){status.textContent='Could not load projects.';grid.innerHTML='<div class="work-empty">Please try again shortly.</div>';return}
      projects=data||[];const cats=[...new Map(projects.filter(p=>p.portfolio_categories).map(p=>[p.portfolio_categories.slug,p.portfolio_categories])).values()];
      filters.innerHTML='<button class="active" data-filter="all">ALL WORK</button>'+cats.map(c=>`<button data-filter="${esc(c.slug)}">${esc(c.name.toUpperCase())}</button>`).join('');
      document.getElementById('work-count').textContent=projects.length;document.getElementById('work-categories').textContent=cats.length;
      filters.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render()}));search?.addEventListener('input',render);render();
    }
    const interaction=document.createElement('script');interaction.src='/interaction-contact-v2.js?v=4';interaction.defer=true;document.head.appendChild(interaction);
    load();
  });
})();