(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase){console.error('V9: Supabase configuration missing');return}
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const media=(url='')=>{if(!url)return'/assets/logo-mark.png';if(/^https?:\/\//i.test(url))return url;return'/'+url.replace(/^\//,'')};
  const defaults={work:{columns:4,order:[],sizes:{},hidden:[]},team:{founderWidth:38,order:['hse','software','design','video','content','ai'],hidden:[]},brief:{order:['type','goal','team','scope','contact'],hidden:[]}};
  const state={lang:'en',projects:[],settings:{},layout:structuredClone(defaults),filter:'all',query:'',brief:{type:'',goal:'',audience:'',success:'',disciplines:[],timeline:'',budget:'Not specified',stage:'Idea only',name:'',email:'',phone:'',company:''},briefIndex:0};

  const roleData={
    hse:{name:'HSE & TECHNICAL',icon:'HSE',en:'Safety, risk, field expertise and technical review.',ar:'السلامة والمخاطر والخبرة الميدانية والمراجعة الفنية.'},
    software:{name:'SOFTWARE & AUTOMATION',icon:'DEV',en:'Systems, tools, workflows, integrations and automation.',ar:'الأنظمة والأدوات ومسارات العمل والتكامل والأتمتة.'},
    design:{name:'DESIGN & VISUAL',icon:'DES',en:'Identity, interfaces, communication and visual direction.',ar:'الهوية والواجهات والتواصل والتوجيه البصري.'},
    video:{name:'VIDEO & MOTION',icon:'VID',en:'Production, editing, motion systems and cinematic output.',ar:'الإنتاج والمونتاج والموشن والمخرجات السينمائية.'},
    content:{name:'CONTENT & STORYTELLING',icon:'TXT',en:'Scripts, learning structure, narrative and communication.',ar:'السيناريو وبناء المحتوى والسرد والتواصل.'},
    ai:{name:'AI PRODUCTION',icon:'AI',en:'AI visuals, intelligent workflows and production acceleration.',ar:'المرئيات بالذكاء الاصطناعي ومسارات العمل الذكية وتسريع الإنتاج.'}
  };
  const stepNames={type:{en:'PROJECT',ar:'المشروع'},goal:{en:'GOAL',ar:'الهدف'},team:{en:'TEAM',ar:'الفريق'},scope:{en:'SCOPE',ar:'النطاق'},contact:{en:'CONTACT',ar:'التواصل'}};

  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}
  function mergeLayout(raw={}){
    state.layout={
      work:{...defaults.work,...(raw.work||{}),sizes:{...defaults.work.sizes,...(raw.work?.sizes||{})}},
      team:{...defaults.team,...(raw.team||{})},
      brief:{...defaults.brief,...(raw.brief||{})}
    };
  }
  function categoryKey(name=''){
    const n=name.toLowerCase();if(n.includes('safety'))return'safety';if(n.includes('digital'))return'digital';if(n.includes('creative')||n.includes('design'))return'creative';if(n.includes('story')||n.includes('ai'))return'ai';return'other';
  }
  function local(p,key){const ar=p?.[key+'_ar'];return state.lang==='ar'&&ar?ar:(p?.[key]||'')}

  async function load(){
    const [{data:settings},{data:projects,error}]=await Promise.all([
      sb.from('portfolio_site_settings').select('key,value'),
      sb.from('portfolio_projects').select('id,title,title_ar,slug,excerpt,excerpt_ar,description,description_ar,cover_url,tags,tags_ar,tools,tools_ar,featured,sort_order,status,portfolio_categories(name,color)').eq('status','published').order('sort_order',{ascending:true})
    ]);
    if(error)console.error('V9 projects:',error);
    state.settings=Object.fromEntries((settings||[]).map(x=>[x.key,x.value||{}]));
    mergeLayout(state.settings.v9_layout||{});
    state.projects=projects||[];
    applyCmsContent();renderAll();
  }

  function applyCmsContent(){
    const hero=state.settings.hero||{},contact=state.settings.contact||{};
    if(hero.subtitle){const el=$('#hero-subtitle');el.dataset.en=hero.subtitle;if(hero.subtitle_ar)el.dataset.ar=hero.subtitle_ar}
    if(contact.email)$('#send-brief').dataset.email=contact.email;
  }

  function setLang(lang){
    state.lang=lang;document.body.dataset.lang=lang;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    $$('[data-en]').forEach(el=>el.textContent=el.dataset[lang]||el.dataset.en);
    $$('[data-en-html]').forEach(el=>el.innerHTML=el.dataset[lang+'Html']||el.dataset.enHtml);
    $('#lang-toggle').textContent=lang==='en'?'EN | عربي':'English | AR';
    $('#project-search').placeholder=lang==='ar'?'ابحث في المشاريع...':'Search projects...';
    renderWork();renderRoles();renderBrief();
  }
  $('#lang-toggle').addEventListener('click',()=>setLang(state.lang==='en'?'ar':'en'));

  function renderAll(){
    document.documentElement.style.setProperty('--grid-cols',Math.max(2,Math.min(4,Number(state.layout.work.columns)||4)));
    document.documentElement.style.setProperty('--founder',(Number(state.layout.team.founderWidth)||38)+'%');
    renderFilters();renderWork();renderRoles();renderBrief();
  }

  function orderedProjects(){
    const map=new Map(state.projects.map(p=>[p.slug,p]));
    const ordered=[];(state.layout.work.order||[]).forEach(slug=>{if(map.has(slug)){ordered.push(map.get(slug));map.delete(slug)}});ordered.push(...map.values());
    return ordered.filter(p=>!(state.layout.work.hidden||[]).includes(p.slug));
  }
  function renderFilters(){
    const host=$('#project-filters');const used=new Set(state.projects.map(p=>categoryKey(p.portfolio_categories?.name)));
    const labels={all:{en:'ALL',ar:'الكل'},safety:{en:'SAFETY',ar:'السلامة'},digital:{en:'DIGITAL',ar:'رقمي'},creative:{en:'CREATIVE',ar:'إبداعي'},ai:{en:'AI & STORY',ar:'AI والقصص'}};
    host.innerHTML=['all',...['safety','digital','creative','ai'].filter(x=>used.has(x))].map(k=>`<button data-filter="${k}" class="${state.filter===k?'active':''}">${labels[k][state.lang]}</button>`).join('');
    $$('button',host).forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;renderFilters();renderWork()});
  }
  $('#project-search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();renderWork()});
  function projectPasses(p){const cat=categoryKey(p.portfolio_categories?.name),q=state.query;return(state.filter==='all'||cat===state.filter)&&(!q||[p.title,p.title_ar,p.excerpt,p.excerpt_ar,p.slug,...(p.tags||[])].filter(Boolean).join(' ').toLowerCase().includes(q))}
  function projectCard(p,index){
    const size=state.layout.work.sizes?.[p.slug]||'normal',cat=state.lang==='ar'?categoryAr(p.portfolio_categories?.name):p.portfolio_categories?.name||'Project';
    const tags=(state.lang==='ar'&&p.tags_ar?.length?p.tags_ar:p.tags||[]).slice(0,3).join(' · ');
    return `<a class="project-card ${size!=='normal'?'size-'+esc(size):''}" href="/projects/${encodeURIComponent(p.slug)}"><div class="project-media"><img src="${esc(media(p.cover_url))}" alt="${esc(local(p,'title'))}" loading="lazy"><span class="project-index">${String(index+2).padStart(2,'0')}</span></div><div class="project-body"><small>${esc(cat)}</small><h3>${esc(local(p,'title'))}</h3><p>${esc(local(p,'excerpt')||local(p,'description')||tags)}</p><div class="project-foot"><span>${esc(tags||'CASE STUDY')}</span><b>↗</b></div></div></a>`;
  }
  function categoryAr(name=''){return({Safety:'السلامة والصحة المهنية',Digital:'الحلول الرقمية',Creative:'الإبداع والتصميم','Stories & AI':'القصص والذكاء الاصطناعي'}[name]||name||'مشروع')}
  function renderWork(){
    const all=orderedProjects();const featured=all.find(p=>p.featured)||all[0];
    const f=$('#featured-project');
    if(featured){const cat=state.lang==='ar'?categoryAr(featured.portfolio_categories?.name):featured.portfolio_categories?.name||'Featured';const tags=(state.lang==='ar'&&featured.tags_ar?.length?featured.tags_ar:featured.tags||[]).slice(0,5);f.classList.remove('skeleton');f.innerHTML=`<div class="featured-media"><img src="${esc(media(featured.cover_url))}" alt="${esc(local(featured,'title'))}"><span class="featured-word">${esc((featured.slug||'V9').split('-')[0].toUpperCase())}</span></div><div class="featured-copy"><div><small>FEATURED CASE STUDY · ${esc(cat.toUpperCase())}</small><h3>${esc(local(featured,'title'))}</h3><p>${esc(local(featured,'excerpt')||local(featured,'description')||'Selected studio project.')}</p><div class="featured-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><a class="btn primary" href="/projects/${encodeURIComponent(featured.slug)}">${state.lang==='ar'?'عرض دراسة الحالة ←':'VIEW CASE STUDY →'}</a></div>`}
    else{f.classList.remove('skeleton');f.innerHTML='<div class="featured-copy"><h3>No published projects yet.</h3></div>'}
    const rows=all.filter(p=>p!==featured&&projectPasses(p));$('#project-grid').innerHTML=rows.map(projectCard).join('');$('#project-empty').classList.toggle('hidden',rows.length>0||!!featured);
  }

  function renderRoles(){
    const host=$('#role-grid'),order=[...(state.layout.team.order||defaults.team.order),...defaults.team.order.filter(k=>!(state.layout.team.order||[]).includes(k))];
    host.innerHTML=order.filter(k=>roleData[k]&&!(state.layout.team.hidden||[]).includes(k)).map(k=>{const r=roleData[k];return`<article class="role-card" data-role="${k}"><button type="button">+</button><i>${r.icon}</i><h4>${r.name}</h4><p>${r[state.lang]}</p></article>`}).join('');
    $$('.role-card',host).forEach(card=>card.onclick=()=>{card.classList.toggle('selected');card.querySelector('button').textContent=card.classList.contains('selected')?'✓':'+';renderTeamSelection()});renderTeamSelection();
  }
  function renderTeamSelection(){const selected=$$('.role-card.selected').map(x=>roleData[x.dataset.role]?.name).filter(Boolean);$('#team-selection').innerHTML=selected.length?selected.map(x=>`<span>${esc(x)}</span>`).join(''):`<span>${state.lang==='ar'?'اختر التخصصات من الأعلى.':'Select specialties above.'}</span>`}

  function visibleBriefKeys(){const order=[...(state.layout.brief.order||defaults.brief.order),...defaults.brief.order.filter(k=>!(state.layout.brief.order||[]).includes(k))];return order.filter(k=>!(state.layout.brief.hidden||[]).includes(k))}
  function renderBrief(){
    const keys=visibleBriefKeys();state.briefIndex=Math.min(state.briefIndex,Math.max(0,keys.length-1));
    $('#brief-progress').innerHTML=keys.map((k,i)=>`<button type="button" data-i="${i}" class="${i===state.briefIndex?'active':''} ${i<state.briefIndex?'done':''}"><b>${String(i+1).padStart(2,'0')}</b>${stepNames[k][state.lang]}</button>`).join('');
    $$('button',$('#brief-progress')).forEach(b=>b.onclick=()=>{state.briefIndex=Number(b.dataset.i);renderBrief()});
    $('#brief-steps').innerHTML=keys.map((k,i)=>`<section class="brief-step ${i===state.briefIndex?'active':''}" data-key="${k}">${briefStep(k)}</section>`).join('');bindBriefInputs();
    $('#brief-back').style.visibility=state.briefIndex===0?'hidden':'visible';$('#brief-next').textContent=state.briefIndex===keys.length-1?(state.lang==='ar'?'مراجعة البريف ←':'REVIEW BRIEF →'):(state.lang==='ar'?'التالي ←':'NEXT →');renderBriefSummary();
  }
  function briefStep(k){
    if(k==='type')return`<span class="eyebrow">01 · PROJECT TYPE</span><h3>${state.lang==='ar'?'ماذا سنبني؟':'What are we building?'}</h3><div class="option-grid">${[['Safety & HSE','HSE / Safety Project','Awareness, systems, risk communication or training.'],['Digital Solution','Digital Solution','Website, application, tool, workflow or automation.'],['Creative & Brand','Creative / Brand','Identity, campaign, visual system or communication.'],['AI & Storytelling','AI / Storytelling','AI video, visual stories or personalized experiences.']].map(([v,b,s])=>`<button type="button" class="brief-choice ${state.brief.type===v?'selected':''}" data-type="${v}"><b>${b}</b><span>${s}</span></button>`).join('')}</div>`;
    if(k==='goal')return`<span class="eyebrow">02 · GOAL</span><h3>${state.lang==='ar'?'ما الذي يجب أن يتغير بعد المشروع؟':'What should change after this project?'}</h3><div class="field-grid"><div class="field full"><label>MAIN GOAL</label><textarea data-bind="goal">${esc(state.brief.goal)}</textarea></div><div class="field"><label>PRIMARY AUDIENCE</label><input data-bind="audience" value="${esc(state.brief.audience)}"></div><div class="field"><label>SUCCESS LOOKS LIKE</label><input data-bind="success" value="${esc(state.brief.success)}"></div></div>`;
    if(k==='team')return`<span class="eyebrow">03 · DISCIPLINES</span><h3>${state.lang==='ar'?'ما التخصصات المطلوبة؟':'Which expertise should be involved?'}</h3><div class="brief-disciplines">${Object.values(roleData).map(r=>`<button type="button" class="brief-discipline ${state.brief.disciplines.includes(r.name)?'selected':''}" data-disc="${r.name}"><b>${r.name}</b><span>${r[state.lang]}</span></button>`).join('')}</div>`;
    if(k==='scope')return`<span class="eyebrow">04 · SCOPE & TIMING</span><h3>${state.lang==='ar'?'كيف نخطط للعمل؟':'How should we plan the work?'}</h3><div class="timeline-grid">${['Urgent / <2 weeks','2–6 weeks','6+ weeks / Flexible'].map(v=>`<button type="button" class="timeline-choice ${state.brief.timeline===v?'selected':''}" data-time="${esc(v)}">${esc(v)}</button>`).join('')}</div><div class="field-grid" style="margin-top:10px"><div class="field"><label>BUDGET RANGE</label><select data-bind="budget">${['Not specified','Small / pilot','Medium project','Large / multi-phase','Need guidance'].map(v=>`<option ${state.brief.budget===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>CURRENT STAGE</label><select data-bind="stage">${['Idea only','Have references / assets','Already in development','Existing system needs improvement'].map(v=>`<option ${state.brief.stage===v?'selected':''}>${v}</option>`).join('')}</select></div></div>`;
    return`<span class="eyebrow">05 · CONTACT</span><h3>${state.lang==='ar'?'مع من نتواصل؟':'Who should we reply to?'}</h3><div class="field-grid"><div class="field"><label>NAME</label><input data-bind="name" value="${esc(state.brief.name)}"></div><div class="field"><label>EMAIL</label><input data-bind="email" type="email" value="${esc(state.brief.email)}"></div><div class="field"><label>PHONE / WHATSAPP</label><input data-bind="phone" value="${esc(state.brief.phone)}"></div><div class="field"><label>COMPANY / ORGANIZATION</label><input data-bind="company" value="${esc(state.brief.company)}"></div></div>`;
  }
  function bindBriefInputs(){
    $$('[data-type]').forEach(b=>b.onclick=()=>{state.brief.type=b.dataset.type;renderBrief()});
    $$('[data-disc]').forEach(b=>b.onclick=()=>{const v=b.dataset.disc;state.brief.disciplines=state.brief.disciplines.includes(v)?state.brief.disciplines.filter(x=>x!==v):[...state.brief.disciplines,v];renderBrief()});
    $$('[data-time]').forEach(b=>b.onclick=()=>{state.brief.timeline=b.dataset.time;renderBrief()});
    $$('[data-bind]').forEach(el=>el.oninput=e=>{state.brief[e.target.dataset.bind]=e.target.value;renderBriefSummary()});
  }
  $('#brief-back').onclick=()=>{state.briefIndex=Math.max(0,state.briefIndex-1);renderBrief()};
  $('#brief-next').onclick=()=>{state.briefIndex=Math.min(visibleBriefKeys().length-1,state.briefIndex+1);renderBrief()};
  function renderBriefSummary(){
    const b=state.brief;$('#brief-summary').innerHTML=`<div class="summary-row"><small>PROJECT TYPE</small><b>${esc(b.type||'—')}</b></div><div class="summary-row"><small>GOAL</small><span>${esc(b.goal||'—')}</span></div><div class="summary-row"><small>DISCIPLINES</small><span>${esc(b.disciplines.join(' · ')||'—')}</span></div><div class="summary-row"><small>TIMELINE</small><b>${esc(b.timeline||'—')}</b></div><div class="summary-row"><small>CONTACT</small><span>${esc([b.name,b.company,b.email,b.phone].filter(Boolean).join(' · ')||'—')}</span></div>`;
    const email=$('#send-brief').dataset.email||state.settings.contact?.email||'androsarot3@gmail.com';$('#send-brief').href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Andrew Tharwat Studio — Project Brief')}&body=${encodeURIComponent(briefText())}`;
  }
  function briefText(){const b=state.brief;return`ANDREW THARWAT STUDIO — PROJECT BRIEF\n\nProject Type: ${b.type||'—'}\nGoal: ${b.goal||'—'}\nAudience: ${b.audience||'—'}\nSuccess: ${b.success||'—'}\nDisciplines: ${b.disciplines.join(', ')||'—'}\nTimeline: ${b.timeline||'—'}\nBudget: ${b.budget||'—'}\nStage: ${b.stage||'—'}\nContact: ${b.name||'—'} | ${b.company||'—'} | ${b.email||'—'} | ${b.phone||'—'}`}
  $('#copy-brief').onclick=async()=>{try{await navigator.clipboard.writeText(briefText());toast(state.lang==='ar'?'تم نسخ البريف':'BRIEF COPIED')}catch(e){toast('COPY NOT AVAILABLE')}};

  load().catch(err=>console.error('V9 load failed',err));
})();