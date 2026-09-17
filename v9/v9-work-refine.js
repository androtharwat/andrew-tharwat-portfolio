(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const isAr=()=>document.body.dataset.lang==='ar';
  const slugFromHref=href=>{
    try{return decodeURIComponent(new URL(href,location.origin).pathname.split('/projects/')[1]||'').replace(/\/$/,'')}
    catch(_e){return''}
  };
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  let bySlug=new Map();
  let ready=false;

  function label(en,ar){return isAr()?ar:en}
  function text(row,key){return isAr()?(row[key+'_ar']||row[key]||''):(row[key]||'')}

  function compact(value,max=170){
    const v=String(value||'').replace(/\s+/g,' ').trim();
    if(v.length<=max)return v;
    const cut=v.slice(0,max+1).lastIndexOf(' ');
    return `${v.slice(0,cut>90?cut:max).trim()}…`;
  }

  function insightHTML(row,featured=false){
    const challenge=compact(text(row,'challenge'),featured?220:135);
    const outcome=compact(text(row,'outcome'),featured?220:135);
    if(!challenge&&!outcome)return'';
    return `<div class="work-insights ${featured?'is-featured':''}">
      ${challenge?`<div class="work-insight"><small>${label('THE CHALLENGE','التحدي')}</small><p>${esc(challenge)}</p></div>`:''}
      ${outcome?`<div class="work-insight outcome"><small>${label('THE RESULT','النتيجة')}</small><p>${esc(outcome)}</p></div>`:''}
    </div>`;
  }

  function decorateCard(card){
    if(!ready||!card)return;
    const slug=slugFromHref(card.getAttribute('href')||'');
    const row=bySlug.get(slug);
    if(!row)return;
    const body=$('.project-body',card);
    if(!body)return;
    body.querySelector('.work-insights')?.remove();
    const foot=$('.project-foot',body);
    const html=insightHTML(row,false);
    if(html)foot?.insertAdjacentHTML('beforebegin',html);
  }

  function decorateFeatured(){
    if(!ready)return;
    const host=$('#featured-project');
    const link=$('a[href*="/projects/"]',host);
    if(!host||!link)return;
    const slug=slugFromHref(link.getAttribute('href')||'');
    const row=bySlug.get(slug);
    if(!row)return;
    const copy=$('.featured-copy>div',host)||$('.featured-copy',host);
    if(!copy)return;
    copy.querySelector('.work-insights')?.remove();
    const tags=$('.featured-tags',copy);
    const html=insightHTML(row,true);
    if(html)(tags||copy.lastElementChild)?.insertAdjacentHTML(tags?'beforebegin':'afterend',html);
  }

  function decorateAll(){
    $$('#project-grid .project-card').forEach(decorateCard);
    decorateFeatured();
  }

  async function load(){
    const {data:projects,error:pErr}=await sb.from('portfolio_projects').select('id,slug').eq('status','published');
    if(pErr||!projects?.length)return;
    const ids=projects.map(p=>p.id);
    const {data:cases,error:cErr}=await sb.from('portfolio_project_case_studies')
      .select('project_id,challenge,challenge_ar,outcome,outcome_ar,case_study_status')
      .in('project_id',ids)
      .eq('case_study_status','published');
    if(cErr)return;
    const slugById=new Map(projects.map(p=>[p.id,p.slug]));
    bySlug=new Map((cases||[]).map(row=>[slugById.get(row.project_id),row]).filter(([slug])=>slug));
    ready=true;
    decorateAll();
  }

  ['project-grid','featured-project'].forEach(id=>{
    const host=document.getElementById(id);
    if(host)new MutationObserver(()=>requestAnimationFrame(decorateAll)).observe(host,{childList:true,subtree:true});
  });
  document.getElementById('lang-toggle')?.addEventListener('click',()=>setTimeout(decorateAll,100));
  load();
})();