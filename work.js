(() => {
  if(!document.querySelector('link[href*="i18n.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/i18n.css?v=2';document.head.appendChild(l)}
  if(!document.querySelector('script[src*="i18n.js"]')){const s=document.createElement('script');s.src='/i18n.js?v=2';s.defer=true;document.head.appendChild(s)}
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
    const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
    const publicText=(v='')=>String(v).replace(/Andrew Tharwat Studio/gi,'ATS').replace(/\bportfolio\b/gi,'studio').replace(/معرض الأعمال/g,'أعمال ATS');
    const local=(obj,key)=>publicText(lang()==='ar'&&obj?.[`${key}_ar`]?obj[`${key}_ar`]:(obj?.[key]||''));
    const catName=p=>lang()==='ar'?(p.portfolio_categories?.name_ar||p.portfolio_categories?.name||'مشروع'):(p.portfolio_categories?.name||'Project');
    let projects=[],active='all';

    function render(){
      const ar=lang()==='ar';
      const q=(search?.value||'').trim().toLowerCase();
      const rows=projects.filter(p=>{const cat=p.portfolio_categories?.slug||'';const hay=[p.title,p.title_ar,p.excerpt,p.excerpt_ar,p.description,p.description_ar,(p.tags||[]).join(' '),(p.tags_ar||[]).join(' '),(p.tools||[]).join(' '),(p.tools_ar||[]).join(' '),p.portfolio_categories?.name,p.portfolio_categories?.name_ar].join(' ').toLowerCase();return(active==='all'||cat===active)&&(!q||hay.includes(q));});
      status.setAttribute('data-i18n-skip','1');status.textContent=ar?`${rows.length} مشروع ظاهر`:`${rows.length} project${rows.length===1?'':'s'} shown`;
      grid.innerHTML=rows.length?rows.map(p=>{const ss=spriteStyle(p.slug),title=local(p,'title'),desc=local(p,'excerpt')||local(p,'description'),tags=(ar&&p.tags_ar?.length?p.tags_ar:p.tags||[]).slice(0,4),live=!!p.page_enabled;return`<a class="work-card${live?'':' work-card-locked'}" ${live?`href="/projects/${encodeURIComponent(p.slug)}"`:'href="#" aria-disabled="true"'} data-i18n-skip="1"><div class="work-card-media">${ss?`<div class="work-card-sprite" style="${ss}"></div>`:`<img src="${esc(media(p.cover_url))}" alt="${esc(title)}" loading="lazy" decoding="async">`}<span class="work-card-cat">${esc(catName(p))}</span></div><div class="work-card-body"><h2>${esc(title)}</h2><p>${esc(desc)}</p><div class="work-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="work-card-link">${live?(ar?'عرض تفاصيل المشروع ←':'VIEW CASE STUDY →'):(ar?'قريبًا':'COMING SOON')}</div></div></a>`}).join(''):`<div class="work-empty" data-i18n-skip="1">${ar?'لا توجد مشاريع مطابقة لهذا البحث حاليًا.':'No projects match this filter yet.'}</div>`;
      grid.querySelectorAll('.work-card-locked').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));
    }

    function renderFilters(){
      const ar=lang()==='ar';const cats=[...new Map(projects.filter(p=>p.portfolio_categories).map(p=>[p.portfolio_categories.slug,p.portfolio_categories])).values()];
      filters.setAttribute('data-i18n-skip','1');filters.innerHTML=`<button class="${active==='all'?'active':''}" data-filter="all">${ar?'كل الأعمال':'ALL WORK'}</button>`+cats.map(c=>`<button class="${active===c.slug?'active':''}" data-filter="${esc(c.slug)}">${esc(ar?(c.name_ar||c.name):c.name)}</button>`).join('');
      filters.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;renderFilters();render()}));
    }

    async function load(){
      const {data,error}=await sb.from('portfolio_projects').select('title,title_ar,slug,excerpt,excerpt_ar,description,description_ar,cover_url,tags,tags_ar,tools,tools_ar,sort_order,page_enabled,portfolio_categories(name,name_ar,slug)').eq('status','published').order('sort_order',{ascending:true});
      if(error){status.textContent=lang()==='ar'?'تعذر تحميل المشاريع.':'Could not load projects.';grid.innerHTML=`<div class="work-empty">${lang()==='ar'?'حاول مرة أخرى بعد قليل.':'Please try again shortly.'}</div>`;return}
      projects=data||[];const cats=[...new Map(projects.filter(p=>p.portfolio_categories).map(p=>[p.portfolio_categories.slug,p.portfolio_categories])).values()];
      document.getElementById('work-count').textContent=projects.length;document.getElementById('work-categories').textContent=cats.length;search?.addEventListener('input',render);renderFilters();render();
    }
    document.addEventListener('portfolio:languagechange',()=>{renderFilters();render()});
    const interaction=document.createElement('script');interaction.src='/interaction-contact-v2.js?v=4';interaction.defer=true;document.head.appendChild(interaction);
    load();
  });
})();