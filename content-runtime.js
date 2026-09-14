(()=>{
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const projectSlug=decodeURIComponent(path.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  const pageScope=path==='/work'?'work':projectSlug?'project':'home';
  const scopes=new Set(['global',pageScope]);
  if(projectSlug)scopes.add(`project:${projectSlug}`);
  let rows=[],ready=false,applying=false,raf=0;
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||document.documentElement.lang||'en';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rich=v=>esc(v).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\r?\n/g,'<br>');
  const current=row=>lang()==='ar'?(row.value_ar||row.value_en||''):(row.value_en||row.value_ar||'');
  const replaceVars=(v,vars={})=>String(v||'').replace(/\{(\w+)\}/g,(_,k)=>vars[k]??`{${k}}`);
  const directText=(el,value)=>{
    const text=`${value}${el.children.length?' ':''}`;
    let node=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    if(node){if(node.textContent!==text)node.textContent=text;return}
    if(el.children.length)el.insertBefore(document.createTextNode(text),el.firstChild);else if(el.textContent!==value)el.textContent=value;
  };
  function applyRow(row){
    let nodes=[];try{nodes=[...document.querySelectorAll(row.selector)]}catch(_e){return}
    if(!nodes.length)return;
    for(const el of nodes){
      const v=current(row);
      if(row.mode==='placeholder'){if(el.getAttribute('placeholder')!==v)el.setAttribute('placeholder',v);continue}
      if(row.mode==='leading'){directText(el,v);continue}
      if(row.mode==='rich'){const html=rich(v);if(el.innerHTML!==html)el.innerHTML=html;continue}
      if(row.mode==='bilingual'||row.mode==='bilingual_rich'){
        const en=el.querySelector('.copy-en'),ar=el.querySelector('.copy-ar');
        const enVal=row.value_en||row.value_ar||'',arVal=row.value_ar||row.value_en||'';
        if(en){if(row.mode==='bilingual_rich'){const h=rich(enVal);if(en.innerHTML!==h)en.innerHTML=h}else if(en.textContent!==enVal)en.textContent=enVal}
        if(ar){if(row.mode==='bilingual_rich'){const h=rich(arVal);if(ar.innerHTML!==h)ar.innerHTML=h}else if(ar.textContent!==arVal)ar.textContent=arVal}
        continue;
      }
      if(el.textContent!==v)el.textContent=v;
    }
  }
  function apply(){
    if(applying||!rows.length)return;applying=true;
    try{rows.forEach(applyRow)}finally{applying=false}
  }
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)}
  const api={
    get(key,fallback='',vars={}){const row=rows.find(r=>r.content_key===key);return replaceVars(row?current(row):fallback,vars)},
    getBoth(key,fallbackEn='',fallbackAr=''){const row=rows.find(r=>r.content_key===key);return{en:row?.value_en||fallbackEn,ar:row?.value_ar||fallbackAr}},
    apply:schedule,
    get ready(){return ready},
    scopes:[...scopes]
  };
  window.PORTFOLIO_CONTENT=api;
  async function load(){
    const {data,error}=await sb.from('portfolio_text_content').select('content_key,scope,section,label,selector,mode,value_en,value_ar,sort_order,is_active').eq('is_active',true).order('sort_order',{ascending:true});
    if(error)return;
    rows=(data||[]).filter(r=>scopes.has(r.scope));ready=true;apply();document.dispatchEvent(new CustomEvent('portfolio:cmscontentready'));
  }
  const mo=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))schedule()});
  mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('portfolio:languagechange',()=>setTimeout(schedule,40));
  document.addEventListener('portfolio:contentrendered',()=>setTimeout(schedule,20));
  load();
})();