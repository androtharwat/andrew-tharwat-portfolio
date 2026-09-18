(()=>{
  const LANG_KEY='andrew_v9_public_lang',PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  let lang='en',activeType='all',items=[];
  const txt=(obj)=>obj?.[lang]||obj?.en||obj?.ar||'';
  function saveLang(){try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}}
  function applyLang(next,save=true){
    lang=next==='ar'?'ar':'en';
    document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const v=el.dataset[lang];if(v!==undefined)el.textContent=v});
    $$('[data-en-html]').forEach(el=>{const v=el.dataset[lang+'Html'];if(v!==undefined)el.innerHTML=v});
    $('#lang-toggle').textContent=lang==='ar'?'English | AR':'EN | عربي';
    if(save)saveLang();
    render();
  }
  function typeLabel(type){
    const m={knowledge:['Knowledge','معرفة'],problem:['Problem','مشكلة'],solution:['Solution','حل'],training:['Training','تدريب'],digital:['Digital HSE','HSE رقمي'],case:['Case Study','دراسة حالة']};
    return (m[type]||[type,type])[lang==='ar'?1:0];
  }
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function render(){
    const root=$('#content-grid'),empty=$('#content-empty'),status=$('#content-status');
    if(!root)return;
    const filtered=activeType==='all'?items:items.filter(x=>x.type===activeType);
    root.innerHTML=filtered.map(item=>`<a class="content-card" href="${HSE_DATA.pathFor(item)}"><div class="content-card-top"><span>${esc(typeLabel(item.type))}</span>${item.featured?'<i>FEATURED</i>':''}</div><h3>${esc(txt(item.title))}</h3><p>${esc(txt(item.summary))}</p><small>${esc(txt(item.category?.name)||'HSE')} · <b>${lang==='ar'?'افتح الموضوع ←':'OPEN TOPIC →'}</b></small></a>`).join('');
    const none=!filtered.length;empty?.classList.toggle('hidden',!none);
    status.textContent=none?'':(lang==='ar'?filtered.length+' موضوع منشور':filtered.length+' published item'+(filtered.length===1?'':'s'));
  }
  async function load(){
    const status=$('#content-status');status.textContent=lang==='ar'?'جاري تحميل الإصدارات المنشورة…':'Loading Published Revisions…';
    try{
      const data=await HSE_DATA.list(null,{limit:100});items=data?.items||[];
      render();
    }catch(err){
      console.error(err);items=[];render();status.textContent=lang==='ar'?'تعذر تحميل المحتوى المنشور حاليًا.':'Published content could not be loaded right now.';
    }
  }
  $('#lane-grid')?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-type]');if(!b)return;
    activeType=b.dataset.type;$$('#lane-grid button').forEach(x=>x.classList.toggle('active',x===b));render();
  });
  $('#lang-toggle')?.addEventListener('click',()=>applyLang(lang==='ar'?'en':'ar'));
  let saved='en';try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  applyLang(saved,false);load();
})();