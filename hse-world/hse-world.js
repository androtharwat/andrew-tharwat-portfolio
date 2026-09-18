(() => {
  const LANG_KEY='andrew_v9_public_lang',PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let lang='en';
  function save(){try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}}
  function apply(next,store=true){
    lang=next==='ar'?'ar':'en';
    document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const v=el.dataset[lang];if(v!==undefined)el.textContent=v});
    $$('[data-en-html]').forEach(el=>{const v=el.dataset[lang+'Html'];if(v!==undefined)el.innerHTML=v});
    const toggle=document.getElementById('lang-toggle');if(toggle)toggle.textContent=lang==='ar'?'English | AR':'EN | عربي';
    if(store)save();
  }
  document.getElementById('lang-toggle')?.addEventListener('click',()=>apply(lang==='ar'?'en':'ar'));
  let saved='en';try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  apply(saved,false);
})();