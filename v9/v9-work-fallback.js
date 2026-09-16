(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(url='')=>{if(!url)return'/assets/logo-mark-official.png';if(/^https?:\/\//i.test(url))return url;return'/'+url.replace(/^\//,'')};
  const lang=()=>document.body.dataset.lang==='ar'?'ar':'en';
  const catKey=name=>{const n=String(name||'').toLowerCase();if(n.includes('safety'))return'safety';if(n.includes('digital'))return'digital';if(n.includes('creative')||n.includes('design'))return'creative';if(n.includes('story')||n.includes('ai'))return'ai';return'other'};
  const catLabel=(name,l)=>l==='ar'?({Safety:'السلامة والصحة المهنية',Digital:'الحلول الرقمية',Creative:'الإبداع والتصميم','Stories & AI':'الذكاء الاصطناعي والسرد'}[name]||name||'مشروع'):({Safety:'Safety & HSE',Digital:'Digital',Creative:'Creative','Stories & AI':'AI & Storytelling'}[name]||name||'Project');
  let projects=[],layout={order:[],hidden:['do-document-smart-capture'],sizes:{},columns:3},filter='all',query='';

  function hasRenderedWork(){
    const grid=$('#project-grid'),featured=$('#featured-project');
    if(grid?.children?.length)return true;
    if(featured&&!featured.classList.contains('skeleton')&&featured.querySelector('.featured-copy'))return true;
    return false;
  }

  async function getJson(path){
    const key=cfg?.supabaseKey,url=cfg?.supabaseUrl;
    if(!key||!url)throw new Error('Public data configuration missing');
    const res=await fetch(url+'/rest/v1/'+path,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'}});
    if(!res.ok)throw new Error('Public data request failed: '+res.status);
    return res.json();
  }

  async function loadData(){
    const select='id,title,title_ar,slug,excerpt,excerpt_ar,description,description_ar,cover_url,tags,tags_ar,featured,sort_order,status,portfolio_categories(name,color)';
    const p=await getJson('portfolio_projects?select='+encodeURIComponent(select)+'&status=eq.published&order=sort_order.asc');
    projects=Array.isArray(p)?p:[];
    try{
      const s=await getJson('portfolio_site_settings?select=key,value&key=eq.v9_layout');
      const work=s?.[0]?.value?.work;
      if(work)layout={...layout,...work,sizes:{...(layout.sizes||{}),...(work.sizes||{})}};
    }catch(_e){}
  }

  function ordered(){
    const map=new Map(projects.map(p=>[p.slug,p])),out=[];
    (layout.order||[]).forEach(slug=>{if(map.has(slug)){out.push(map.get(slug));map.delete(slug)}});
    out.push(...map.values());
    return out.filter(p=>!(layout.hidden||[]).includes(p.slug));
  }

  function pass(p){
    const ck=catKey(p.portfolio_categories?.name),q=query;
    if(filter!=='all'&&ck!==filter)return false;
    if(!q)return true;
    return [p.title,p.title_ar,p.excerpt,p.excerpt_ar,p.description,p.description_ar,p.slug,...(p.tags||[]),...(p.tags_ar||[])].filter(Boolean).join(' ').toLowerCase().includes(q);
  }

  function local(p,key){
    const l=lang();return l==='ar'?(p[key+'_ar']||p[key]||''):(p[key]||'');
  }

  function renderFilters(){
    const host=$('#project-filters');if(!host)return;
    const used=new Set(projects.map(p=>catKey(p.portfolio_categories?.name)));
    const labels={all:{en:'ALL',ar:'الكل'},safety:{en:'SAFETY & HSE',ar:'السلامة وHSE'},digital:{en:'DIGITAL',ar:'الرقمي'},creative:{en:'CREATIVE',ar:'الإبداع'},ai:{en:'AI & STORYTELLING',ar:'الذكاء الاصطناعي والسرد'}};
    host.innerHTML=['all',...['safety','digital','creative','ai'].filter(x=>used.has(x))].map(k=>`<button data-fallback-filter="${k}" class="${filter===k?'active':''}">${labels[k][lang()]}</button>`).join('');
    $$('[data-fallback-filter]',host).forEach(b=>b.onclick=()=>{filter=b.dataset.fallbackFilter;renderFilters();renderWork()});
  }

  function card(p,index){
    const tags=(lang()==='ar'&&p.tags_ar?.length?p.tags_ar:p.tags||[]).slice(0,3).join(' · ');
    const size=layout.sizes?.[p.slug]||'normal';
    return `<a class="project-card ${size!=='normal'?'size-'+esc(size):''}" href="/projects/${encodeURIComponent(p.slug)}" aria-label="${esc(local(p,'title'))}"><div class="project-media"><img src="${esc(media(p.cover_url))}" alt="${esc(local(p,'title'))}" loading="lazy"><span class="project-index">${String(index+1).padStart(2,'0')}</span></div><div class="project-body"><small>${esc(catLabel(p.portfolio_categories?.name,lang()))}</small><h3>${esc(local(p,'title'))}</h3><p>${esc(local(p,'excerpt')||local(p,'description')||tags)}</p><div class="project-foot"><span>${esc(tags||(lang()==='ar'?'دراسة حالة':'CASE STUDY'))}</span><b>↗</b></div></div></a>`;
  }

  function renderWork(){
    const all=ordered(),defaultView=filter==='all'&&!query,featured=defaultView?(all.find(p=>p.featured)||all[0]):null;
    const f=$('#featured-project'),grid=$('#project-grid'),empty=$('#project-empty');
    if(f){
      f.classList.remove('skeleton','v9-reveal');
      f.style.opacity='1';
      if(featured){
        const tags=(lang()==='ar'&&featured.tags_ar?.length?featured.tags_ar:featured.tags||[]).slice(0,5);
        f.classList.remove('hidden');
        f.innerHTML=`<div class="featured-media"><img src="${esc(media(featured.cover_url))}" alt="${esc(local(featured,'title'))}"><span class="featured-word">${esc((featured.slug||'WORK').split('-')[0].toUpperCase())}</span></div><div class="featured-copy"><div><small>${lang()==='ar'?'دراسة حالة مميزة':'FEATURED CASE STUDY'} · ${esc(catLabel(featured.portfolio_categories?.name,lang()).toUpperCase())}</small><h3>${esc(local(featured,'title'))}</h3><p>${esc(local(featured,'excerpt')||local(featured,'description')||'')}</p><div class="featured-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><a class="btn primary" href="/projects/${encodeURIComponent(featured.slug)}">${lang()==='ar'?'عرض دراسة الحالة ←':'VIEW CASE STUDY →'}</a></div>`;
      }else{f.classList.add('hidden');f.innerHTML=''}
    }
    const rows=all.filter(p=>(!featured||p!==featured)&&pass(p));
    if(grid){grid.style.gridTemplateColumns=`repeat(${Math.max(2,Math.min(4,Number(layout.columns)||3))},minmax(0,1fr))`;grid.innerHTML=rows.map((p,i)=>card(p,i+(featured?1:0))).join('')}
    if(empty){empty.textContent=lang()==='ar'?'لا توجد مشاريع مطابقة.':'No matching projects.';empty.classList.toggle('hidden',rows.length>0||!!featured)}
  }

  function bind(){
    const search=$('#project-search');if(search&&!search.dataset.fallbackBound){search.dataset.fallbackBound='1';search.addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderWork()})}
    const toggle=$('#lang-toggle');if(toggle&&!toggle.dataset.workFallbackBound){toggle.dataset.workFallbackBound='1';toggle.addEventListener('click',()=>setTimeout(()=>{renderFilters();renderWork()},30))}
  }

  async function boot(){
    if(hasRenderedWork())return;
    try{await loadData();if(!projects.length)return;renderFilters();renderWork();bind();document.body.dataset.workFallback='live'}catch(err){console.error('V9 public work fallback:',err)}
  }

  setTimeout(boot,1200);
  setTimeout(()=>{if(!hasRenderedWork())boot()},2800);
})();
