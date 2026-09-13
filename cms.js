(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const resolveMedia = (url='') => {
    if (!url) return 'assets/logo-mark.png';
    const clean=url.replace(/^\//,'');
    if(window.PORTFOLIO_ASSETS && window.PORTFOLIO_ASSETS[clean]) return window.PORTFOLIO_ASSETS[clean];
    if (/^https?:\/\//i.test(url)) return url;
    return clean;
  };
  const setText = (id, value) => { const el=document.getElementById(id); if(el && value != null) el.textContent=value; };

  async function loadSettings(){
    const { data, error } = await sb.from('portfolio_site_settings').select('key,value');
    if(error || !data) return;
    const settings = Object.fromEntries(data.map(r => [r.key, r.value || {}]));
    const hero=settings.hero||{}, about=settings.about||{}, stats=settings.stats||{}, contact=settings.contact||{};
    if(hero.eyebrow) setText('hero-eyebrow',hero.eyebrow);
    if(hero.title){
      const h=document.getElementById('hero-title');
      if(h){
        const parts=String(hero.title).split(/SYSTEMS, STORIES & VISUAL EXPERIENCES\.?/i);
        if(parts.length>1) h.innerHTML=`${escapeHtml(parts[0])}<span>SYSTEMS, STORIES &amp;</span> VISUAL EXPERIENCES.`;
        else h.textContent=hero.title;
      }
    }
    if(hero.subtitle) setText('hero-subtitle',hero.subtitle);
    if(about.title){
      const a=document.getElementById('about-title');
      if(a){ const bits=String(about.title).split('. '); a.innerHTML=`${escapeHtml(bits[0]||about.title)}.<br><b>${escapeHtml((bits.slice(1).join('. ')||'MANY WAYS TO CREATE.'))}</b>`; }
    }
    if(about.body) setText('about-body',about.body);
    setText('stat-years',stats.years); setText('stat-projects',stats.projects); setText('stat-worlds',stats.worlds); setText('stat-purpose',stats.purpose);

    if(contact.whatsapp){
      document.querySelectorAll('[data-contact="whatsapp"],[data-social="whatsapp"]').forEach(a=>a.href=`https://wa.me/${contact.whatsapp}`);
    }
    if(contact.email){
      document.querySelectorAll('[data-contact="email"],[data-contact="email-cta"],[data-social="email"]').forEach(a=>a.href=`mailto:${contact.email}`);
      const direct=document.querySelector('[data-contact="email"]'); if(direct) direct.textContent=contact.email;
    }
    ['linkedin','instagram_personal','instagram_do_stories','instagram_do_document'].forEach(k=>{
      if(contact[k]) document.querySelectorAll(`[data-social="${k}"]`).forEach(a=>a.href=contact[k]);
    });
  }

  async function loadFeatured(){
    const host=document.getElementById('featured-projects');
    if(!host) return;
    const { data, error } = await sb.from('portfolio_projects')
      .select('id,title,slug,excerpt,cover_url,tags,portfolio_categories(name,color)')
      .eq('status','published').eq('featured',true).order('sort_order',{ascending:true}).limit(5);
    if(error || !data || !data.length) return;
    host.innerHTML=data.map((p,i)=>{
      const cat=p.portfolio_categories?.name||'Project';
      const tags=(p.tags||[]).slice(0,3).join(' • ');
      return `<a class="project-live-card reveal visible delay-${Math.min(i,4)}" href="/projects/${encodeURIComponent(p.slug)}">
        <img src="${escapeHtml(resolveMedia(p.cover_url))}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <div class="project-live-overlay">
          <span>${escapeHtml(cat)}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.excerpt||tags)}</p>
          <b>VIEW PROJECT →</b>
        </div>
      </a>`;
    }).join('');
  }

  loadSettings();
  loadFeatured();
})();
