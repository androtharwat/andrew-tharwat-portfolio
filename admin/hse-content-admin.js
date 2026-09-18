(()=>{
  const cfg=window.PORTFOLIO_CONFIG,DEVICE_KEY='andrew_portfolio_device_v2';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const root=$('#hse-content-admin');if(!root||!cfg||!window.supabase)return;
  let device=null;try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch(_e){}
  if(!device?.id||!device?.secret)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const state={loaded:false,items:[],current:null,aiDraft:null,validation:null,preview:'split',taxonomy:null};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=v=>JSON.stringify(v??{},null,2);
  const parse=(value,fallback)=>{try{return JSON.parse(value||'')}catch(_e){return fallback}};
  function invalidJsonField(){
    const fields=[
      ['hsec-hero','Hero JSON','object'],['hsec-card','Card JSON','object'],['hsec-seo','SEO JSON','object'],
      ['hsec-sections','Sections JSON','array'],['hsec-guided','Guided Review JSON','object'],['hsec-tags','Tags JSON','array']
    ];
    for(const [id,label,kind] of fields){
      const raw=(field(id).value||'').trim();
      let value;
      try{value=raw?JSON.parse(raw):(kind==='array'?[]:{})}catch(_e){return label+' is not valid JSON'}
      if(kind==='array'&&!Array.isArray(value))return label+' must be a JSON array';
      if(kind==='object'&&(value===null||Array.isArray(value)||typeof value!=='object'))return label+' must be a JSON object';
    }
    return '';
  }
  const toast=m=>{const el=$('#toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)};
  const types=[['knowledge','Knowledge'],['problem','Problem'],['solution','Solution'],['training','Training'],['digital','Digital HSE'],['case','Case Study']];
  const dbType=t=>({knowledge:'knowledge_topic',problem:'solved_problem',solution:'hse_solution',training:'training_awareness',digital:'digital_hse_tool',case:'case_study'}[t]||t);
  async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
  function field(id){return $('#'+id,root)}
  function bilingualReadiness(payload){
    const pairs=[[payload.title,payload.title_ar],[payload.excerpt,payload.excerpt_ar]];
    const hero=payload.hero||{},card=payload.card||{},seo=payload.seo||{};
    [['headline','headline_ar'],['subheadline','subheadline_ar']].forEach(([a,b])=>{if(hero[a]||hero[b])pairs.push([hero[a],hero[b]])});
    if(card.description||card.description_ar)pairs.push([card.description,card.description_ar]);
    [['meta_title','meta_title_ar'],['meta_description','meta_description_ar']].forEach(([a,b])=>{if(seo[a]||seo[b])pairs.push([seo[a],seo[b]])});
    (payload.sections||[]).filter(x=>x.is_visible!==false).forEach(s=>{
      if(s.title||s.title_ar)pairs.push([s.title,s.title_ar]);
      if(s.body||s.body_ar)pairs.push([s.body,s.body_ar]);
    });
    const complete=pairs.filter(([a,b])=>String(a||'').trim()&&String(b||'').trim()).length;
    return pairs.length?Math.round(complete/pairs.length*100):0;
  }
  function blank(){
    return {content_id:null,type:'knowledge',content_type:'knowledge_topic',slug:'',category:{slug:'',name:'',name_ar:''},visibility:'public',featured:false,show_on_hse_home:false,sort_order:0,title:'',title_ar:'',excerpt:'',excerpt_ar:'',source_text:'',source_language:'auto',hero:{},card:{},seo:{},settings:{},guided_review:{enabled:false,review_approved:false},ai_mode:'',ai_model:'',ai_confidence:null,ai_quality:{},locked_fields:[],sections:[],tags:[],relations:[],project_links:[]};
  }
  async function loadDashboard(){
    const [dash,list,tax]=await Promise.all([rpc('hse_admin_dashboard'),rpc('hse_admin_list_content',{p_type:null,p_status:'all',p_search:null,p_limit:100,p_offset:0}),rpc('hse_public_taxonomy')]);
    state.items=list?.items||[];state.taxonomy=tax||{categories:[]};
    $('#hsec-kpi-published').textContent=dash?.published||0;$('#hsec-kpi-drafts').textContent=dash?.drafts||0;$('#hsec-kpi-review').textContent=dash?.review_required||0;$('#hsec-kpi-featured').textContent=dash?.featured||0;
    renderList();state.loaded=true;
  }
  function renderList(){
    const q=(field('hsec-search')?.value||'').trim().toLowerCase(),type=field('hsec-type')?.value||'all',status=field('hsec-status')?.value||'all';
    const rows=state.items.filter(x=>(type==='all'||x.type===type)&&(status==='all'||(status==='published'?x.published_revision_id:status==='draft'?x.draft_revision_id:status==='unpublished'?!x.published_revision_id:true))&&(!q||[x.title?.en,x.title?.ar,x.working_slug,x.category?.name?.en,x.category?.name?.ar].join(' ').toLowerCase().includes(q)));
    const list=field('hsec-list');
    list.innerHTML=rows.length?rows.map(x=>`<article class="hsec-row"><div><b>${esc(x.title?.en||x.title?.ar||'Untitled draft')}</b><small>${esc(x.title?.ar||'')} · ${esc(x.working_slug||'no-slug')}</small></div><span class="hsec-state">${esc(x.type)}</span><span class="hsec-state">${esc(x.state)}</span><span class="hsec-state">${x.draft_revision_id?'DRAFT':'LIVE'}</span><button type="button" data-hsec-open="${x.content_id}">OPEN →</button></article>`).join(''):'<div class="hsec-empty">No HSE content matches this view.</div>';
  }
  function syncPayloadFromForm(){
    const cur=state.current||blank();
    const sections=parse(field('hsec-sections').value,[]);
    const guided=parse(field('hsec-guided').value,{enabled:false,review_approved:false});
    const hero=parse(field('hsec-hero').value,{});
    const card=parse(field('hsec-card').value,{});
    const seo=parse(field('hsec-seo').value,{});
    const tags=parse(field('hsec-tags').value,[]);
    return {...cur,
      content_id:cur.content_id||null,content_type:dbType(field('hsec-content-type').value),type:field('hsec-content-type').value,
      slug:field('hsec-slug').value.trim(),title:field('hsec-title-en').value.trim(),title_ar:field('hsec-title-ar').value.trim(),
      excerpt:field('hsec-excerpt-en').value.trim(),excerpt_ar:field('hsec-excerpt-ar').value.trim(),
      category:{slug:field('hsec-category').value.trim(),name:field('hsec-category-name').value.trim(),name_ar:field('hsec-category-name-ar').value.trim()},
      visibility:field('hsec-visibility').value,featured:field('hsec-featured').checked,show_on_hse_home:field('hsec-home').checked,
      source_text:field('hsec-source').value,source_language:field('hsec-source-language').value,
      locked_fields:field('hsec-locks').value.split(',').map(x=>x.trim()).filter(Boolean),
      hero,card,seo,guided_review:guided,sections,tags,
      ai_mode:cur.ai_mode||'',ai_model:cur.ai_model||'',ai_confidence:cur.ai_confidence??null,ai_quality:cur.ai_quality||{},
      relations:cur.relations||[],project_links:cur.project_links||[],settings:cur.settings||{}
    };
  }
  function setJson(id,val){field(id).value=pretty(val)}
  function fillEditor(data){
    state.current={...blank(),...data,type:data.type||'knowledge',guided_review:data.guided_review||{enabled:false,review_approved:false}};
    field('hsec-content-type').value=state.current.type||'knowledge';field('hsec-slug').value=state.current.slug||'';field('hsec-title-en').value=state.current.title||'';field('hsec-title-ar').value=state.current.title_ar||'';field('hsec-excerpt-en').value=state.current.excerpt||'';field('hsec-excerpt-ar').value=state.current.excerpt_ar||'';
    field('hsec-category').value=state.current.category?.slug||'';field('hsec-category-name').value=state.current.category?.name||'';field('hsec-category-name-ar').value=state.current.category?.name_ar||'';field('hsec-visibility').value=state.current.visibility||'public';field('hsec-featured').checked=!!state.current.featured;field('hsec-home').checked=!!state.current.show_on_hse_home;
    field('hsec-source').value=state.current.source_text||'';field('hsec-source-language').value=state.current.source_language||'auto';field('hsec-locks').value=(state.current.locked_fields||[]).join(', ');
    setJson('hsec-hero',state.current.hero||{});setJson('hsec-card',state.current.card||{});setJson('hsec-seo',state.current.seo||{});setJson('hsec-sections',state.current.sections||[]);setJson('hsec-guided',state.current.guided_review||{});setJson('hsec-tags',state.current.tags||[]);
    $('#hsec-editor-title').textContent=state.current.content_id?(state.current.title||state.current.title_ar||'HSE Draft'):'New HSE Content';
    $('#hsec-live-note').textContent=state.current.live_protected?'This item already has a Published Revision. Saving changes creates/updates the Draft only; the public version stays unchanged until Validate → Publish.':'This content is not public until a Draft passes validation and you explicitly Publish it.';
    state.validation=null;state.aiDraft=null;$('#hsec-validation').className='hsec-validation';$('#hsec-validation').textContent='Save the Draft, then run Validate before Publish.';$('#hsec-publish').disabled=true;$('#hsec-editor').classList.remove('hidden');$('#hsec-browser').classList.add('hidden');updatePreview();
  }
  async function openContent(id){try{fillEditor(await rpc('hse_admin_get_content',{p_content_id:id}))}catch(e){toast(e.message)}}
  function previewArticle(payload,l){
    const title=l==='ar'?payload.title_ar:payload.title,summary=l==='ar'?payload.excerpt_ar:payload.excerpt;
    const sections=(payload.sections||[]).filter(x=>x.is_visible!==false);
    return `<article class="${l==='ar'?'rtl':''}"><h4>${esc(title||'Untitled')}</h4><p>${esc(summary||'No summary')}</p>${sections.map(s=>`<div class="hsec-section-preview"><b>${esc(l==='ar'?s.title_ar:s.title)}</b><p>${esc(l==='ar'?s.body_ar:s.body)}</p></div>`).join('')}</article>`;
  }
  function updatePreview(){
    if($('#hsec-editor').classList.contains('hidden'))return;
    const p=syncPayloadFromForm(),pct=bilingualReadiness(p);$('#hsec-readiness-number').textContent=pct+'%';$('#hsec-readiness-bar').style.width=pct+'%';
    const preview=$('#hsec-preview');preview.className='hsec-preview '+(state.preview==='split'?'':'single');
    preview.innerHTML=state.preview==='en'?previewArticle(p,'en'):state.preview==='ar'?previewArticle(p,'ar'):previewArticle(p,'en')+previewArticle(p,'ar');
    $('#hsec-lock-chips').innerHTML=(p.locked_fields||[]).map(x=>`<span class="hsec-lock">🔒 ${esc(x)}</span>`).join('')||'<span class="hsec-lock">No locked fields</span>';
  }
  async function saveDraft(){
    const bad=invalidJsonField();if(bad)return toast(bad+'. Fix it before saving.');
    const payload=syncPayloadFromForm();if(!payload.slug)return toast('Slug is required before saving.');
    const b=$('#hsec-save');b.disabled=true;b.textContent='SAVING…';
    try{
      const result=await rpc('hse_editor_save_draft',{p_payload:payload});state.current.content_id=result.content_id;
      const fresh=await rpc('hse_admin_get_content',{p_content_id:result.content_id});fillEditor(fresh);toast('Draft saved · public version unchanged');await loadDashboard();
    }catch(e){toast(e.message)}finally{b.disabled=false;b.textContent='SAVE DRAFT'}
  }
  async function validate(){
    if(!state.current?.content_id)return toast('Save the Draft first.');
    const b=$('#hsec-validate');b.disabled=true;b.textContent='VALIDATING…';
    try{
      const v=await rpc('hse_editor_validate',{p_content_id:state.current.content_id});state.validation=v;
      const box=$('#hsec-validation');box.className='hsec-validation '+(v.ready?'ready':'error');
      box.innerHTML=v.ready?'<b>READY TO PUBLISH</b><br>'+esc((v.warnings||[]).join(' · ')||'Bilingual, AI and Guided Review guards passed.'):'<b>NOT READY</b><br>'+esc((v.errors||[]).join(' · '));
      $('#hsec-publish').disabled=!v.ready;toast(v.ready?'Validation passed':'Validation found blocking issues');
    }catch(e){toast(e.message)}finally{b.disabled=false;b.textContent='VALIDATE'}
  }
  async function publish(){
    if(!state.validation?.ready)return toast('Run Validate and resolve every blocking issue first.');
    if(!confirm('Publish this validated HSE revision? The current Draft will become the public Published Revision.'))return;
    const b=$('#hsec-publish');b.disabled=true;b.textContent='PUBLISHING…';
    try{
      const r=await rpc('hse_editor_publish',{p_content_id:state.current.content_id});
      if(!r?.published)throw new Error((r?.validation?.errors||['Publish blocked']).join(' · '));
      toast('Published Revision updated');await loadDashboard();fillEditor(await rpc('hse_admin_get_content',{p_content_id:state.current.content_id}));
    }catch(e){toast(e.message)}finally{b.textContent='PUBLISH'}
  }
  async function discard(){
    if(!state.current?.content_id||!confirm('Discard the current Draft? The Published Revision will stay unchanged.'))return;
    try{await rpc('hse_editor_discard_draft',{p_content_id:state.current.content_id});toast('Draft discarded · live version unchanged');await loadDashboard();showBrowser()}catch(e){toast(e.message)}
  }
  async function generateAI(){
    const bad=invalidJsonField();if(bad)return toast(bad+'.');
    const p=syncPayloadFromForm(),source=p.source_text.trim();if(source.length<20&&!p.title)return toast('Paste source content first.');
    const b=$('#hsec-ai-generate');b.disabled=true;b.textContent='BUILDING DRAFT…';$('#hsec-ai-result').textContent='AI is preparing a draft for human review. It cannot publish.';
    try{
      const res=await fetch(cfg.supabaseUrl+'/functions/v1/hse-ai-content-builder',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey,'Authorization':'Bearer '+cfg.supabaseKey,'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret},body:JSON.stringify({source_text:source,mode:'web_experience',current:p,locked_fields:p.locked_fields})});
      const body=await res.json();if(!res.ok)throw new Error(body.error||'AI Builder failed');
      state.aiDraft=body.data;$('#hsec-ai-result').innerHTML='<b>AI DRAFT READY · NOT APPLIED · NOT PUBLISHED</b><br>Model: '+esc(body.model||'')+' · Review the suggestion, then choose APPLY AI DRAFT if you want it in the editor.';$('#hsec-ai-apply').disabled=false;
    }catch(e){$('#hsec-ai-result').textContent=e.message;toast(e.message)}finally{b.disabled=false;b.textContent='GENERATE AI DRAFT'}
  }
  function applyAI(){
    if(!state.aiDraft)return;
    const locked=new Set(syncPayloadFromForm().locked_fields||[]),d=state.aiDraft,c={...state.current};
    const put=(key,val)=>{if(!locked.has(key)&&val!==undefined)c[key]=val};
    ['slug','title','title_ar','excerpt','excerpt_ar','hero','card','seo','sections','guided_review','tags'].forEach(k=>put(k,d[k]));
    if(d.content_type)put('type',({knowledge_topic:'knowledge',solved_problem:'problem',hse_solution:'solution',training_awareness:'training',digital_hse_tool:'digital',case_study:'case'}[d.content_type]||c.type));
    put('category',d.category);c.ai_mode='web_experience';c.ai_model='suggested';c.ai_quality=d.quality||{};c.source_text=field('hsec-source').value;c.locked_fields=[...locked];
    fillEditor(c);$('#hsec-ai-result').innerHTML='<b>AI DRAFT APPLIED TO EDITOR ONLY.</b><br>Review every field. AI suggestion sections remain blocked from publishing until manually approved inside the Sections JSON.';toast('AI draft applied to editor · review required');
  }
  function showBrowser(){$('#hsec-editor').classList.add('hidden');$('#hsec-browser').classList.remove('hidden');state.current=null;state.validation=null;state.aiDraft=null}
  function bind(){
    field('hsec-search').addEventListener('input',renderList);field('hsec-type').addEventListener('change',renderList);field('hsec-status').addEventListener('change',renderList);
    root.addEventListener('click',e=>{
      const open=e.target.closest('[data-hsec-open]');if(open)return openContent(open.dataset.hsecOpen);
      const pv=e.target.closest('[data-hsec-preview]');if(pv){state.preview=pv.dataset.hsecPreview;$$('[data-hsec-preview]',root).forEach(x=>x.classList.toggle('active',x===pv));updatePreview()}
    });
    $('#hsec-new').addEventListener('click',()=>fillEditor(blank()));$('#hsec-back').addEventListener('click',showBrowser);$('#hsec-save').addEventListener('click',saveDraft);$('#hsec-validate').addEventListener('click',validate);$('#hsec-publish').addEventListener('click',publish);$('#hsec-discard').addEventListener('click',discard);$('#hsec-ai-generate').addEventListener('click',generateAI);$('#hsec-ai-apply').addEventListener('click',applyAI);
    $('#hsec-editor').addEventListener('input',()=>{state.validation=null;$('#hsec-publish').disabled=true;updatePreview()});
    $('#hsec-editor').addEventListener('change',()=>{state.validation=null;$('#hsec-publish').disabled=true;updatePreview()});
  }
  bind();
  const nav=document.querySelector('[data-section="content"]');
  nav?.addEventListener('click',()=>{if(!state.loaded)loadDashboard().catch(e=>toast(e.message))});
  if(location.hash==='#content')loadDashboard().catch(e=>toast(e.message));
})();