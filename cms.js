(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  if (!cfg || !window.supabase) return;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const resolveMedia = (url='') => {if (!url) return 'assets/logo-mark.png';const clean=url.replace(/^\//,'');if(window.PORTFOLIO_ASSETS && window.PORTFOLIO_ASSETS[clean]) return window.PORTFOLIO_ASSETS[clean];if (/^https?:\/\//i.test(url)) return url;return clean;};
  const setText = (id, value) => { const el=document.getElementById(id); if(el && value != null) el.textContent=value; };
  const spriteStyle=slug=>{const order=window.PORTFOLIO_COVER_ORDER||[],idx=order.indexOf(slug);if(!window.PORTFOLIO_COVER_SPRITE||idx<0)return'';const col=idx%4,row=Math.floor(idx/4),x=col*(100/3),y=row*100;return`background-image:url(${window.PORTFOLIO_COVER_SPRITE});background-size:400% 200%;background-position:${x}% ${y}%;`;};
  const isAr=()=>window.PORTFOLIO_I18N?.getLang?.()==='ar';
  const local=(obj,key)=>isAr()&&obj?.[`${key}_ar`]?obj[`${key}_ar`]:obj?.[key]||'';
  const catAr=name=>({'Safety':'السلامة والصحة المهنية','Digital':'الحلول الرقمية','Creative':'الإبداع والتصميم','Stories & AI':'القصص والذكاء الاصطناعي'}[name]||name||'مشروع');
  let cachedSettings=null,cachedFeatured=[];

  function renderHeroTitle(title){
    const h=document.getElementById('hero-title');if(!h||!title)return;
    if(isAr()){
      const txt=String(title);
      const marker='أنظمة وقصص';
      if(txt.includes(marker)){const [a,b]=txt.split(marker);h.innerHTML=`${escapeHtml(a)}<span>${marker}</span>${escapeHtml(b)}`;}
      else h.textContent=txt;
    }else{
      const parts=String(title).split(/SYSTEMS, STORIES & VISUAL EXPERIENCES\.?/i);
      if(parts.length>1) h.innerHTML=`${escapeHtml(parts[0])}<span>SYSTEMS, STORIES &amp;</span> VISUAL EXPERIENCES.`;
      else h.textContent=title;
    }
  }
  function renderAboutTitle(title){
    const a=document.getElementById('about-title');if(!a||!title)return;
    if(isAr()){
      const txt=String(title).replace(/\s+/g,' ').trim();
      const parts=txt.split(/\.\s*/).filter(Boolean);
      a.innerHTML=`${escapeHtml(parts[0]||txt)}${parts.length>1?`.<br><b>${escapeHtml(parts.slice(1).join('. '))}</b>`:''}`;
    }else{
      const bits=String(title).split('. ');
      a.innerHTML=`${escapeHtml(bits[0]||title)}.<br><b>${escapeHtml((bits.slice(1).join('. ')||'MANY WAYS TO CREATE.'))}</b>`;
    }
  }
  function renderSettings(){
    if(!cachedSettings)return;
    const hero=cachedSettings.hero||{},about=cachedSettings.about||{},stats=cachedSettings.stats||{},contact=cachedSettings.contact||{};
    const eyebrow=isAr()?(hero.eyebrow_ar||hero.eyebrow):hero.eyebrow;
    const title=isAr()?(hero.title_ar||hero.title):hero.title;
    const subtitle=isAr()?(hero.subtitle_ar||hero.subtitle):hero.subtitle;
    if(eyebrow)setText('hero-eyebrow',eyebrow);
    if(title)renderHeroTitle(title);
    if(subtitle)setText('hero-subtitle',subtitle);
    const primary=document.querySelector('.hero-actions .btn-primary');if(primary){const label=isAr()?(hero.cta_primary_ar||'استكشف أعمالي'):(hero.cta_primary||'EXPLORE MY WORK');primary.innerHTML=`${escapeHtml(label)} <span>→</span>`;}
    const secondary=document.querySelector('.hero-actions .btn-ghost');if(secondary){const label=isAr()?(hero.cta_secondary_ar||'شاهد العرض'):(hero.cta_secondary||'WATCH SHOWREEL');secondary.innerHTML=`<span class="play">▶</span> ${escapeHtml(label)}`;}
    const aboutTitle=isAr()?(about.title_ar||about.title):about.title;if(aboutTitle)renderAboutTitle(aboutTitle);
    const aboutBody=isAr()?(about.body_ar||about.body):about.body;if(aboutBody)setText('about-body',aboutBody);
    setText('stat-years',stats.years);setText('stat-projects',stats.projects);setText('stat-worlds',stats.worlds);setText('stat-purpose',stats.purpose);
    if(contact.whatsapp){document.querySelectorAll('[data-contact="whatsapp"],[data-social="whatsapp"]').forEach(a=>a.href=`https://wa.me/${contact.whatsapp}`);}
    if(contact.email){document.querySelectorAll('[data-contact="email"],[data-contact="email-cta"],[data-social="email"]').forEach(a=>a.href=`mailto:${contact.email}`);const direct=document.querySelector('[data-contact="email"]');if(direct)direct.textContent=contact.email;}
    ['linkedin','instagram_personal','instagram_do_stories','instagram_do_document'].forEach(k=>{if(contact[k])document.querySelectorAll(`[data-social="${k}"]`).forEach(a=>a.href=contact[k]);});
    document.dispatchEvent(new CustomEvent('portfolio:contentrendered'));
  }

  async function loadSettings(){
    const {data,error}=await sb.from('portfolio_site_settings').select('key,value');if(error||!data)return;
    cachedSettings=Object.fromEntries(data.map(r=>[r.key,r.value||{}]));renderSettings();
  }
  function renderFeatured(){
    const host=document.getElementById('featured-projects');if(!host||!cachedFeatured.length)return;
    host.innerHTML=cachedFeatured.map((p,i)=>{
      const title=local(p,'title'),excerpt=local(p,'excerpt'),tags=(isAr()?(p.tags_ar?.length?p.tags_ar:p.tags):(p.tags||[])).slice(0,3).join(' • '),cat=isAr()?catAr(p.portfolio_categories?.name):(p.portfolio_categories?.name||'Project'),ss=spriteStyle(p.slug),open=isAr()?'عرض المشروع ←':'VIEW PROJECT →';
      return `<a class="project-live-card reveal visible delay-${Math.min(i,4)}" href="/projects/${encodeURIComponent(p.slug)}" data-i18n-skip="1">${ss?`<div class="project-live-sprite" style="${ss}"></div>`:`<img src="${escapeHtml(resolveMedia(p.cover_url))}" alt="${escapeHtml(title)}" loading="lazy" />`}<div class="project-live-overlay"><span>${escapeHtml(cat)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(excerpt||tags)}</p><b>${open}</b></div></a>`;
    }).join('');
    document.dispatchEvent(new CustomEvent('portfolio:contentrendered'));
  }
  async function loadFeatured(){
    const host=document.getElementById('featured-projects');if(!host)return;
    const {data,error}=await sb.from('portfolio_projects').select('id,title,title_ar,slug,excerpt,excerpt_ar,cover_url,tags,tags_ar,portfolio_categories(name,color)').eq('status','published').eq('featured',true).order('sort_order',{ascending:true}).limit(5);
    if(error||!data||!data.length)return;cachedFeatured=data;renderFeatured();
  }

  document.addEventListener('portfolio:languagechange',()=>{renderSettings();renderFeatured();});
  loadSettings();
  if(window.PORTFOLIO_COVER_SPRITE)loadFeatured();else{let tries=0;const t=setInterval(()=>{tries++;if(window.PORTFOLIO_COVER_SPRITE||tries>20){clearInterval(t);loadFeatured();}},100);}
})();