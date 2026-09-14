(()=>{
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg)return;
  let rows=[],client=null,tries=0;
  const isAr=()=>window.PORTFOLIO_I18N?.getLang?.()==='ar';
  const catAr=name=>({'Safety':'السلامة والصحة المهنية','Digital':'الحلول الرقمية','Creative':'الإبداع والتصميم','Stories & AI':'القصص والذكاء الاصطناعي'}[name]||name||'مشروع');
  const slugFromHref=href=>{const m=String(href||'').match(/\/projects\/([^/?#]+)/);return m?decodeURIComponent(m[1]):'';};
  function apply(){
    if(!rows.length)return;
    const ar=isAr(),map=new Map(rows.map(p=>[p.slug,p]));
    document.querySelectorAll('.experience-card').forEach(card=>{
      const p=map.get(slugFromHref(card.getAttribute('href')));if(!p)return;
      const title=ar?(p.title_ar||p.title):p.title;
      const excerpt=ar?(p.excerpt_ar||p.excerpt||p.description_ar||p.description):(p.excerpt||p.description||'');
      const tags=ar?(p.tags_ar?.length?p.tags_ar:(p.tags||[])):(p.tags||[]);
      const h=card.querySelector('h3'),desc=card.querySelector('.experience-card-body>p'),cat=card.querySelector('.experience-card-category'),tagHost=card.querySelector('.experience-tags'),open=card.querySelector('.experience-open');
      if(h)h.textContent=title||'';if(desc)desc.textContent=excerpt||'';if(cat)cat.textContent=ar?catAr(p.portfolio_categories?.name):(p.portfolio_categories?.name||'Project');
      if(tagHost)tagHost.innerHTML=tags.slice(0,4).map(t=>`<span>${String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}</span>`).join('');
      if(open)open.innerHTML=ar?'عرض دراسة الحالة <span>←</span>':'OPEN CASE STUDY <span>→</span>';
      card.setAttribute('data-i18n-skip','1');
    });
    document.querySelectorAll('.experience-filter').forEach(b=>{const key=b.dataset.cat||'';b.textContent=ar?(key==='all'?'كل الأعمال':catAr(key)):(key==='all'?'All Work':key)});
    document.dispatchEvent(new CustomEvent('portfolio:contentrendered'));
  }
  async function loadData(){
    if(!window.supabase){if(tries++<40)setTimeout(loadData,150);return;}
    client=client||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    const {data}=await client.from('portfolio_projects').select('title,title_ar,slug,excerpt,excerpt_ar,description,description_ar,tags,tags_ar,portfolio_categories(name)').eq('status','published').order('sort_order',{ascending:true});
    rows=data||[];apply();
  }
  const ready=()=>{if(document.querySelector('.experience-section')){loadData();return true}return false};
  if(!ready()){
    const root=document.getElementById('explore');if(root){const mo=new MutationObserver(()=>{if(ready())mo.disconnect()});mo.observe(root,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),12000);}
  }
  document.addEventListener('portfolio:languagechange',apply);
})();