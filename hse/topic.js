(()=>{
  const LANG_KEY='andrew_v9_public_lang',PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  let lang='en',content=null,reviewInstance=null;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=(obj)=>obj?.[lang]||obj?.en||obj?.ar||'';
  function route(){
    const q=new URLSearchParams(location.search);
    const parts=location.pathname.split('/').filter(Boolean);
    const maps={knowledge:'knowledge',problems:'problem',solutions:'solution',training:'training',digital:'digital','case-studies':'case'};
    const idx=parts.indexOf('hse');
    const pathType=idx>=0?maps[parts[idx+1]]:null;
    const pathSlug=idx>=0&&parts[idx+2]?decodeURIComponent(parts[idx+2]):null;
    return {type:q.get('type')||pathType||'knowledge',slug:q.get('slug')||pathSlug||''};
  }
  function saveLang(){try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}}
  function typeLabel(type){const m={knowledge:['KNOWLEDGE','معرفة'],problem:['PROBLEM','مشكلة'],solution:['SOLUTION','حل'],training:['TRAINING','تدريب'],digital:['DIGITAL HSE','HSE رقمي'],case:['CASE STUDY','دراسة حالة']};return(m[type]||[type,type])[lang==='ar'?1:0]}
  function dateLabel(v){if(!v)return'';try{return new Intl.DateTimeFormat(lang==='ar'?'ar-EG':'en-GB',{year:'numeric',month:'short',day:'numeric'}).format(new Date(v))}catch(_e){return''}}
  function setStatic(){
    document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const v=el.dataset[lang];if(v!==undefined)el.textContent=v});
    $('#lang-toggle').textContent=lang==='ar'?'English | AR':'EN | عربي';
  }
  function renderDataBlock(data){
    if(!data||typeof data!=='object'||Array.isArray(data))return'';
    const rows=Object.entries(data).filter(([,v])=>typeof v==='string'||typeof v==='number').slice(0,12);
    return rows.length?`<div class="data-list">${rows.map(([k,v])=>`<div><b>${esc(k.replaceAll('_',' '))}</b><br>${esc(v)}</div>`).join('')}</div>`:'';
  }
  function render(){
    setStatic();if(!content)return;
    $('#topic-type').textContent=typeLabel(content.type);
    $('#topic-category').textContent=txt(content.category?.name)||'HSE';
    $('#topic-published').textContent=dateLabel(content.published_at);
    $('#topic-title').textContent=txt(content.title);
    $('#topic-summary').textContent=txt(content.summary);
    document.title=txt(content.seo?.meta_title?{en:content.seo.meta_title,ar:content.seo.meta_title_ar}:content.title)+' — Andrew Tharwat Studio';
    const meta=document.querySelector('meta[name="description"]');if(meta){const d=lang==='ar'?content.seo?.meta_description_ar:content.seo?.meta_description;meta.content=d||txt(content.summary)}
    $('#topic-sections').innerHTML=(content.sections||[]).map(s=>`<section class="topic-section" id="section-${esc(s.key||s.id)}"><h2>${esc(txt(s.title))}</h2><div class="body">${esc(txt(s.body))}</div>${renderDataBlock(s.data)}</section>`).join('');
    $('#topic-tags').innerHTML=(content.tags||[]).map(t=>`<span>${esc(txt(t.name))}</span>`).join('')||`<span>${lang==='ar'?'لا توجد وسوم':'No tags'}</span>`;
    $('#topic-relations').innerHTML=(content.relations||[]).map(r=>`<a href="${HSE_DATA.pathFor(r.target)}"><b>${esc(txt(r.target?.title))}</b><small>${esc(typeLabel(r.target?.type))} →</small></a>`).join('')||`<small>${lang==='ar'?'لا يوجد محتوى منشور مرتبط حاليًا.':'No related Published Content yet.'}</small>`;
    const reviewEnabled=!!content.guided_review?.enabled;
    $('#topic-review-link')?.classList.toggle('hidden',!reviewEnabled);
    $('#guided-review')?.classList.toggle('hidden',!reviewEnabled);
    if(reviewEnabled){if(!reviewInstance)reviewInstance=HSEGuidedReview.mount('#guided-review',content,()=>lang);else reviewInstance.refresh?.()}
  }
  function applyLang(next,save=true){lang=next==='ar'?'ar':'en';if(save)saveLang();render()}
  function toast(m){const el=$('#toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  window.addEventListener('hse-toast',e=>toast(e.detail||''));
  $('#lang-toggle')?.addEventListener('click',()=>applyLang(lang==='ar'?'en':'ar'));
  async function load(){
    const r=route();let saved='en';try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
    lang=saved==='ar'?'ar':'en';setStatic();
    try{content=await HSE_DATA.get(r.slug,r.type)}catch(err){console.error(err);content=null}
    $('#topic-loading').classList.add('hidden');
    if(!content){$('#topic-not-found').classList.remove('hidden');return}
    $('#topic').classList.remove('hidden');render();
  }
  load();
})();