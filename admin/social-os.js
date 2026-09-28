
(() => {
  if (window.ATS_SOCIAL_OS_LOADED) return;
  window.ATS_SOCIAL_OS_LOADED = true;
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const root = $('#social-os-root');
  if (!root) return;
  const state = {brands:[],plans:[],items:[],members:[],skills:[],teamTasks:[],brandId:null,month:new Date(new Date().getFullYear(),new Date().getMonth(),1),status:'all',platform:'all',ready:false};
  const esc = (v='') => String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const notify = (m,t='success') => window.ATS_ADMIN?.notify?.(m,t);
  const sb = () => window.ATS_ADMIN?.getClient?.();
  const pad = n => String(n).padStart(2,'0');
  const monthKey = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-01';
  const monthLabel = d => new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(d);
  const dtLabel = v => v ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(new Date(v)) : 'NO DATE';
  const timeLabel = v => v ? new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(v)) : '';
  const activeBrand = () => state.brands.find(x=>x.id===state.brandId) || null;
  const currentPlan = () => state.plans.find(x=>x.brand_id===state.brandId && x.month_start===monthKey(state.month)) || null;
  const nextStatus = s => ({idea:'draft',draft:'design',design:'review',review:'approved',needs_changes:'design',approved:'scheduled',scheduled:'published'}[s]||null);
  const statusLabel = s => String(s||'draft').replaceAll('_',' ');
  const openTeamStates = ['assigned','in_progress','review'];
  const member = id => state.members.find(x=>x.id===id)||null;
  const memberLoad = id => state.teamTasks.filter(t=>t.owner_id===id&&openTeamStates.includes(t.status)).length;
  const memberSocialLevel = id => Math.max(0,...state.skills.filter(s=>s.member_id===id&&String(s.skill||'').toLowerCase()==='social media').map(s=>Number(s.level||0)));
  const memberLabel = id => {
    const m=member(id); if(!m)return 'Not assigned';
    return m.full_name+' · '+memberLoad(id)+'/'+m.capacity+(memberSocialLevel(id)?' · Social L'+memberSocialLevel(id):'');
  };
  function socialMembers(){
    return state.members.filter(m=>m.active&&memberSocialLevel(m.id)>0).sort((a,b)=>
      Number(b.available)-Number(a.available) ||
      memberSocialLevel(b.id)-memberSocialLevel(a.id) ||
      memberLoad(a.id)-memberLoad(b.id)
    );
  }
  function memberOptions(selected,reviewer=false){
    const list=reviewer?state.members.filter(m=>m.active):socialMembers();
    return '<option value="">'+(reviewer?'Choose reviewer':'Unassigned')+'</option>'+list.map(m=>'<option value="'+esc(m.id)+'" '+(selected===m.id?'selected':'')+'>'+esc(memberLabel(m.id)+(m.available?'':' · unavailable'))+'</option>').join('');
  }
  async function syncOwnerAssignment(brand,newOwnerId){
    if(!brand?.source_task_id)return;
    let task=state.teamTasks.find(t=>t.id===brand.source_task_id);
    if(!task){
      const q=await sb().from('studio_project_tasks').select('id,owner_id,status,required_skill').eq('id',brand.source_task_id).maybeSingle();
      if(q.error)throw q.error;task=q.data;
    }
    if(!task||task.owner_id===newOwnerId)return;
    if(['accepted','closed'].includes(task.status))throw new Error('The linked Social Operations task is already closed. Create a new follow-up task before changing its owner.');
    if(task.owner_id&&['assigned','in_progress','review'].includes(task.status)){
      const un=await sb().rpc('studio_team_command',{p_action:'unassign',p_payload:{id:task.id,reason:'Owner changed from Social OS'}});
      if(un.error)throw un.error;
      task.owner_id=null;task.status='available';
    }
    if(newOwnerId&&task.status==='available'){
      const asn=await sb().rpc('studio_team_command',{p_action:'assign',p_payload:{id:task.id,member_id:newOwnerId,override_capacity:false,reason:'Assigned from Social OS'}});
      if(asn.error)throw asn.error;
      task.owner_id=newOwnerId;task.status=asn.data?.status||'assigned';
    }
  }

  function platformPills(arr){
    return (arr||[]).map(x=>'<span class="social-pill">'+esc(x)+'</span>').join('');
  }
  function showLoading(){root.innerHTML='<div class="panel-card"><div class="loading-line">Loading Social OS…</div></div>'}

  async function load(force=false){
    if (!sb()) return;
    showLoading();
    const [b,m,s,t] = await Promise.all([
      sb().from('studio_social_brands').select('*').neq('status','archived').order('created_at',{ascending:true}),
      sb().from('studio_team_members').select('*').eq('active',true).order('full_name'),
      sb().from('studio_member_skills').select('*'),
      sb().from('studio_project_tasks').select('id,project_id,owner_id,reviewer_id,status,required_skill,title')
    ]);
    const bad=[b,m,s,t].find(x=>x.error); if(bad) return fail(bad.error);
    state.brands=b.data||[]; state.members=m.data||[]; state.skills=s.data||[]; state.teamTasks=t.data||[];
    const requested=sessionStorage.getItem('ats_social_open_brand');
    if(requested&&state.brands.some(x=>x.id===requested)){state.brandId=requested;sessionStorage.removeItem('ats_social_open_brand');}
    if (!state.brandId || !state.brands.some(x=>x.id===state.brandId)) state.brandId=state.brands[0]?.id||null;
    await loadMonth();
    state.ready=true;
    render();
  }

  async function loadMonth(){
    if (!state.brandId){state.plans=[];state.items=[];return}
    const start = new Date(state.month.getFullYear(),state.month.getMonth(),1);
    const end = new Date(state.month.getFullYear(),state.month.getMonth()+1,1);
    const [p,i] = await Promise.all([
      sb().from('studio_social_plans').select('*').eq('brand_id',state.brandId).eq('month_start',monthKey(start)),
      sb().from('studio_social_content_items').select('*').eq('brand_id',state.brandId).gte('publish_at',start.toISOString()).lt('publish_at',end.toISOString()).order('publish_at',{ascending:true})
    ]);
    if (p.error||i.error) return fail(p.error||i.error);
    state.plans=p.data||[]; state.items=i.data||[];
  }

  function fail(e){root.innerHTML='<div class="panel-card"><b>Social OS could not load.</b><p class="muted">'+esc(e?.message||'Unknown error')+'</p></div>';notify(e?.message||'Social OS error','error')}

  function render(){
    const brand=activeBrand();
    const rows=state.items.filter(x=>(state.status==='all'||x.status===state.status)&&(state.platform==='all'||(x.platforms||[]).includes(state.platform)));
    const review=state.items.filter(x=>['review','needs_changes'].includes(x.status)).length;
    const approved=state.items.filter(x=>x.status==='approved').length;
    const scheduled=state.items.filter(x=>['scheduled','published'].includes(x.status)).length;
    root.innerHTML =
      '<div class="social-os">'+
        '<section class="social-hero"><div><span>ATS SOCIAL OPERATIONS</span><h2>Social OS</h2><p>Plan once. Approve quickly. Keep daily work limited to what actually needs a human.</p></div>'+
        '<div class="social-actions"><button class="secondary" id="social-add-brand">+ ADD BRAND</button>'+(brand?'<button class="secondary" id="social-edit-brand">EDIT BRAND</button><button class="primary" id="social-generate">GENERATE MONTH</button>':'')+'</div></section>'+
        renderBrands()+
        (brand ? (
          '<section class="social-metrics">'+
            metric(state.items.length,'PLANNED','Items this month')+
            metric(review,'NEEDS REVIEW','Human attention')+
            metric(approved,'APPROVED','Ready to schedule')+
            metric(scheduled,'SCHEDULED / LIVE','Hands-off delivery')+
          '</section>'+
          '<section class="social-workspace">'+
            '<div class="social-workspace-head"><div><span class="social-kicker">'+esc(brand.name)+'</span><h3>'+esc(monthLabel(state.month))+' Content</h3></div>'+
              '<div class="social-workspace-controls">'+
                '<div class="social-month-nav"><button class="social-btn ghost" id="social-prev-month">←</button><b>'+esc(monthLabel(state.month))+'</b><button class="social-btn ghost" id="social-next-month">→</button></div>'+
                '<select id="social-status-filter">'+statusOptions(state.status,true)+'</select>'+
                '<select id="social-platform-filter">'+platformOptions(state.platform,true)+'</select>'+
                '<button class="social-btn primary" id="social-add-item">+ CONTENT</button>'+
              '</div></div>'+
            planNote()+
            '<div class="social-list">'+(rows.length?rows.map(renderRow).join(''):emptyItems())+'</div>'+
          '</section>'
        ) : emptyBrands())+
      '</div>';
    bind();
  }

  function metric(v,label,small){return '<article class="social-metric"><span>'+label+'</span><strong>'+v+'</strong><small>'+small+'</small></article>'}
  function renderBrands(){
    if(!state.brands.length)return '';
    return '<div class="social-brand-strip">'+state.brands.map(b=>'<button class="social-brand-card '+(b.id===state.brandId?'active':'')+'" data-social-brand="'+esc(b.id)+'"><b>'+esc(b.name)+'</b><small>'+esc(b.project_id?'Linked client project':'Standalone brand')+' · '+esc(memberLabel(b.responsible_member_id))+'</small><div class="social-brand-platforms">'+platformPills(b.platforms)+'</div></button>').join('')+'</div>';
  }
  function planNote(){
    const p=currentPlan();
    if(!p)return '<div class="social-plan-note">No monthly plan yet. GENERATE MONTH creates a practical 12-item starter calendar you can edit before approval.</div>';
    return '<div class="social-plan-note"><b>MONTH OBJECTIVE:</b> '+esc(p.objective||activeBrand()?.primary_goal||'Not set')+' · Target '+esc(p.target_posts||12)+' items · '+esc(statusLabel(p.status))+'</div>';
  }
  function emptyBrands(){return '<div class="social-empty panel-card"><b>Add the first brand</b><p>Store the audience, voice, platforms and goal once. ATS will reuse them every month instead of rebuilding the brief from zero.</p><button class="primary" id="social-empty-add">+ ADD BRAND</button></div>'}
  function emptyItems(){return '<div class="social-empty"><b>No content in this view</b><p>Generate the month or add a content item manually. Nothing publishes automatically in V1.</p><button class="social-btn primary" id="social-empty-generate">GENERATE MONTH</button></div>'}
  function renderRow(x){
    const next=nextStatus(x.status);
    return '<article class="social-row">'+
      '<div class="social-date"><b>'+esc(dtLabel(x.publish_at))+'</b><small>'+esc(timeLabel(x.publish_at))+'</small></div>'+
      '<div class="social-main"><b>'+esc(x.title)+'</b><small>'+esc(x.hook||x.pillar||'No hook yet')+'</small><div class="social-meta"><span class="social-pill">'+esc(x.format)+'</span>'+(x.pillar?'<span class="social-pill">'+esc(x.pillar)+'</span>':'')+'</div></div>'+
      '<div class="social-platform-cell">'+platformPills(x.platforms)+'</div>'+
      '<div class="social-status-cell"><span class="social-status '+esc(x.status)+'">'+esc(statusLabel(x.status))+'</span></div>'+
      '<div class="social-row-actions">'+
        (x.caption?'<button class="social-btn" data-social-copy="'+esc(x.id)+'">COPY</button>':'')+
        '<button class="social-btn" data-social-edit="'+esc(x.id)+'">EDIT</button>'+
        (next?'<button class="social-btn primary" data-social-next="'+esc(x.id)+'">'+esc(next.toUpperCase().replaceAll('_',' '))+' →</button>':'')+
      '</div>'+
    '</article>';
  }

  function statusOptions(selected,withAll=false){
    const values=['idea','draft','design','review','needs_changes','approved','scheduled','published','paused'];
    return (withAll?'<option value="all">All status</option>':'')+values.map(v=>'<option value="'+v+'" '+(selected===v?'selected':'')+'>'+statusLabel(v)+'</option>').join('');
  }
  function platformOptions(selected,withAll=false){
    const values=['facebook','instagram','tiktok','linkedin','youtube','x'];
    return (withAll?'<option value="all">All platforms</option>':'')+values.map(v=>'<option value="'+v+'" '+(selected===v?'selected':'')+'>'+v+'</option>').join('');
  }

  function bind(){
    $('#social-add-brand')?.addEventListener('click',()=>openBrand());
    $('#social-empty-add')?.addEventListener('click',()=>openBrand());
    $('#social-edit-brand')?.addEventListener('click',()=>openBrand(activeBrand()));
    $('#social-generate')?.addEventListener('click',generateMonth);
    $('#social-empty-generate')?.addEventListener('click',generateMonth);
    $('#social-add-item')?.addEventListener('click',()=>openItem());
    $('#social-prev-month')?.addEventListener('click',()=>changeMonth(-1));
    $('#social-next-month')?.addEventListener('click',()=>changeMonth(1));
    $('#social-status-filter')?.addEventListener('change',e=>{state.status=e.target.value;render()});
    $('#social-platform-filter')?.addEventListener('change',e=>{state.platform=e.target.value;render()});
    $$('[data-social-brand]').forEach(b=>b.addEventListener('click',async()=>{state.brandId=b.dataset.socialBrand;state.status='all';state.platform='all';await loadMonth();render()}));
    $$('[data-social-edit]').forEach(b=>b.addEventListener('click',()=>openItem(state.items.find(x=>x.id===b.dataset.socialEdit))));
    $$('[data-social-next]').forEach(b=>b.addEventListener('click',()=>advanceItem(b.dataset.socialNext)));
    $$('[data-social-copy]').forEach(b=>b.addEventListener('click',()=>copyCaption(b.dataset.socialCopy)));
  }

  async function changeMonth(delta){
    state.month=new Date(state.month.getFullYear(),state.month.getMonth()+delta,1);
    await loadMonth();render();
  }

  function ensureDialog(id){
    let d=document.getElementById(id);
    if(d)return d;
    d=document.createElement('dialog');d.id=id;d.className='social-dialog';document.body.appendChild(d);return d;
  }

  function openBrand(brand=null){
    const d=ensureDialog('social-brand-dialog');
    const values=brand||{platforms:['facebook','instagram'],language:'ar',status:'active'};
    d.innerHTML=
      '<div class="social-dialog-head"><div><span>BRAND BRAIN</span><h3>'+(brand?'Edit Brand':'Add Brand')+'</h3></div><button type="button" data-social-close>×</button></div>'+
      '<form class="social-form" id="social-brand-form">'+
        '<label>BRAND NAME<input name="name" required value="'+esc(values.name||'')+'"></label>'+
        '<label>HANDLE<input name="handle" value="'+esc(values.handle||'')+'" placeholder="@brand"></label>'+
        '<label>INDUSTRY<input name="industry" value="'+esc(values.industry||'')+'"></label>'+
        '<label>LANGUAGE<select name="language"><option value="ar" '+(values.language==='ar'?'selected':'')+'>Arabic</option><option value="en" '+(values.language==='en'?'selected':'')+'>English</option><option value="mixed" '+(values.language==='mixed'?'selected':'')+'>Mixed</option></select></label>'+
        '<label class="wide">AUDIENCE<textarea name="audience" placeholder="Who are we speaking to?">'+esc(values.audience||'')+'</textarea></label>'+
        '<label class="wide">BRAND VOICE<textarea name="brand_voice" placeholder="Tone, language, phrases to use / avoid">'+esc(values.brand_voice||'')+'</textarea></label>'+
        '<label class="wide">PRIMARY GOAL<textarea name="primary_goal" placeholder="Sales, leads, awareness, engagement…">'+esc(values.primary_goal||'')+'</textarea></label>'+
        '<label class="wide">PRODUCTS / SERVICES<textarea name="products_services">'+esc(values.products_services||'')+'</textarea></label>'+
        '<label>RESPONSIBLE OWNER<select name="responsible_member_id">'+memberOptions(values.responsible_member_id,false)+'</select></label>'+
        '<label>REVIEWER<select name="reviewer_member_id" '+(values.source_task_id?'disabled':'')+'>'+memberOptions(values.reviewer_member_id,true)+'</select>'+(values.source_task_id?'<input type="hidden" name="reviewer_member_id" value="'+esc(values.reviewer_member_id||'')+'">':'')+'</label>'+
        '<label class="wide">PLATFORMS<div class="social-checks">'+['facebook','instagram','tiktok','linkedin','youtube','x'].map(p=>'<label><input type="checkbox" name="platforms" value="'+p+'" '+((values.platforms||[]).includes(p)?'checked':'')+'> '+p+'</label>').join('')+'</div></label>'+
        '<label class="wide">NOTES<textarea name="content_notes">'+esc(values.content_notes||'')+'</textarea></label>'+
      '</form>'+
      '<div class="social-dialog-actions"><button class="social-btn" data-social-close>CANCEL</button><button class="social-btn primary" id="social-save-brand">SAVE BRAND</button></div>';
    $$('[data-social-close]',d).forEach(x=>x.addEventListener('click',()=>d.close()));
    $('#social-save-brand',d).addEventListener('click',()=>saveBrand(d,brand));
    d.showModal();
  }

  async function saveBrand(d,brand){
    const f=$('#social-brand-form',d), fd=new FormData(f);
    const platforms=fd.getAll('platforms');
    if(!fd.get('name')?.trim())return notify('Brand name is required.','error');
    if(!platforms.length)return notify('Choose at least one platform.','error');
    const payload={name:fd.get('name').trim(),handle:fd.get('handle')||null,industry:fd.get('industry')||null,audience:fd.get('audience')||null,brand_voice:fd.get('brand_voice')||null,language:fd.get('language')||'ar',primary_goal:fd.get('primary_goal')||null,products_services:fd.get('products_services')||null,content_notes:fd.get('content_notes')||null,responsible_member_id:fd.get('responsible_member_id')||null,reviewer_member_id:fd.get('reviewer_member_id')||null,platforms,updated_at:new Date().toISOString()};
    if(brand&&brand.responsible_member_id!==payload.responsible_member_id){
      try{await syncOwnerAssignment(brand,payload.responsible_member_id)}catch(e){return notify(e.message||'Could not change task owner.','error')}
    }
    const q=brand?sb().from('studio_social_brands').update(payload).eq('id',brand.id).select().single():sb().from('studio_social_brands').insert(payload).select().single();
    const r=await q;if(r.error)return notify(r.error.message,'error');
    state.brandId=r.data.id;d.close();notify('Brand saved.');await load();
  }

  function openItem(item=null){
    const d=ensureDialog('social-item-dialog'), brand=activeBrand();
    if(!brand)return;
    const v=item||{platforms:brand.platforms,format:'post',status:'draft',publish_at:defaultPublishDate()};
    const dt=v.publish_at?toLocalInput(v.publish_at):'';
    d.innerHTML=
      '<div class="social-dialog-head"><div><span>CONTENT ITEM</span><h3>'+(item?'Edit Content':'Add Content')+'</h3></div><button data-social-close>×</button></div>'+
      '<form class="social-form" id="social-item-form">'+
        '<label class="wide">TITLE / IDEA<input name="title" required value="'+esc(v.title||'')+'"></label>'+
        '<label>PUBLISH DATE & TIME<input name="publish_at" type="datetime-local" required value="'+esc(dt)+'"></label>'+
        '<label>FORMAT<select name="format">'+['post','reel','story','carousel','video'].map(x=>'<option value="'+x+'" '+(v.format===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
        '<label>PILLAR<input name="pillar" value="'+esc(v.pillar||'')+'" placeholder="Education / Product / Proof…"></label>'+
        '<label>STATUS<select name="status">'+statusOptions(v.status)+'</select></label>'+
        '<label class="wide">HOOK<textarea name="hook">'+esc(v.hook||'')+'</textarea></label>'+
        '<label class="wide">CAPTION<textarea name="caption">'+esc(v.caption||'')+'</textarea></label>'+
        '<label class="wide">CTA<input name="cta" value="'+esc(v.cta||'')+'"></label>'+
        '<label class="wide">CREATIVE BRIEF<textarea name="creative_brief">'+esc(v.creative_brief||'')+'</textarea></label>'+
        '<label class="wide">PLATFORMS<div class="social-checks">'+['facebook','instagram','tiktok','linkedin','youtube','x'].map(p=>'<label><input type="checkbox" name="platforms" value="'+p+'" '+((v.platforms||[]).includes(p)?'checked':'')+'> '+p+'</label>').join('')+'</div></label>'+
        '<label class="wide">APPROVAL / CHANGE NOTE<textarea name="approval_note">'+esc(v.approval_note||'')+'</textarea></label>'+
      '</form>'+
      '<div class="social-dialog-actions">'+(item?'<button class="social-btn" id="social-delete-item">DELETE</button>':'')+'<button class="social-btn" data-social-close>CANCEL</button><button class="social-btn primary" id="social-save-item">SAVE</button></div>';
    $$('[data-social-close]',d).forEach(x=>x.addEventListener('click',()=>d.close()));
    $('#social-save-item',d).addEventListener('click',()=>saveItem(d,item));
    $('#social-delete-item',d)?.addEventListener('click',()=>deleteItem(d,item));
    d.showModal();
  }

  function defaultPublishDate(){
    const now=new Date(), y=state.month.getFullYear(),m=state.month.getMonth();
    const day=(now.getFullYear()===y&&now.getMonth()===m)?Math.min(now.getDate()+1,new Date(y,m+1,0).getDate()):1;
    return new Date(y,m,day,19,0,0).toISOString();
  }
  function toLocalInput(v){const d=new Date(v);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}

  async function saveItem(d,item){
    const f=$('#social-item-form',d),fd=new FormData(f),platforms=fd.getAll('platforms');
    const plan=currentPlan();
    if(!fd.get('publish_at'))return notify('Publish date is required.','error');
    const payload={brand_id:state.brandId,plan_id:plan?.id||null,title:fd.get('title').trim(),publish_at:new Date(fd.get('publish_at')).toISOString(),format:fd.get('format'),pillar:fd.get('pillar')||null,status:fd.get('status'),hook:fd.get('hook')||null,caption:fd.get('caption')||null,cta:fd.get('cta')||null,creative_brief:fd.get('creative_brief')||null,approval_note:fd.get('approval_note')||null,platforms,updated_at:new Date().toISOString()};
    if(!payload.title)return notify('Title is required.','error');
    const q=item?sb().from('studio_social_content_items').update(payload).eq('id',item.id):sb().from('studio_social_content_items').insert(payload);
    const r=await q;if(r.error)return notify(r.error.message,'error');
    d.close();notify('Content saved.');await loadMonth();render();
  }
  async function deleteItem(d,item){
    if(!item||!confirm('Delete this content item?'))return;
    const r=await sb().from('studio_social_content_items').delete().eq('id',item.id);if(r.error)return notify(r.error.message,'error');
    d.close();notify('Content deleted.');await loadMonth();render();
  }
  async function advanceItem(id){
    const item=state.items.find(x=>x.id===id),next=item&&nextStatus(item.status);if(!next)return;
    const r=await sb().from('studio_social_content_items').update({status:next,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return notify(r.error.message,'error');
    notify('Moved to '+statusLabel(next)+'.');await loadMonth();render();
  }
  async function copyCaption(id){
    const x=state.items.find(i=>i.id===id);if(!x?.caption)return;
    await navigator.clipboard.writeText(x.caption+(x.cta?'\n\n'+x.cta:''));
    notify('Caption copied.');
  }

  function concepts(brand,count){
    const ar=brand.language!=='en';
    const audience=brand.audience|| (ar?'العميل المناسب':'the right customer');
    const offer=brand.products_services||brand.name;
    const goal=brand.primary_goal|| (ar?'تحقيق نتيجة أفضل':'get a better result');
    const sets=ar?[
      ['Awareness','post','مشكلة الجمهور','إيه أكتر حاجة بتعطل '+audience+' عن '+goal+'؟','ابدأ بالمشكلة الحقيقية قبل ما تتكلم عن الحل.'],
      ['Education','carousel','3 نقاط مهمة','3 حاجات لازم تعرفها قبل ما تختار '+offer,'قدّم قيمة قابلة للحفظ والمشاركة.'],
      ['Product','reel','الحل ببساطة','لو هدفك '+goal+'، دي البداية الأبسط.','وضّح القيمة بدون اعتماد كامل على الخصم.'],
      ['Proof','post','دليل وثقة','ليه الناس تختار '+brand.name+'؟','استخدم نتيجة، تجربة، أو دليل حقيقي.'],
      ['Engagement','story','سؤال للجمهور','لو هتغير حاجة واحدة في تجربتك الحالية، هتكون إيه؟','سؤال سريع يولّد ردود ومعلومات للسوق.'],
      ['Behind scenes','reel','وراء الكواليس','إيه اللي بيحصل قبل ما النتيجة توصل للعميل؟','أظهر العملية والجودة بشكل إنساني.']
    ]:[
      ['Awareness','post','Audience problem','What is stopping '+audience+' from '+goal+'?','Lead with the real problem before the solution.'],
      ['Education','carousel','3 useful points','3 things to know before choosing '+offer,'Create saveable, shareable value.'],
      ['Product','reel','Simple solution','If your goal is '+goal+', start here.','Explain value without relying only on discounting.'],
      ['Proof','post','Trust signal','Why do customers choose '+brand.name+'?','Use a real result, review or proof point.'],
      ['Engagement','story','Audience question','If you could change one thing in your current experience, what would it be?','Use responses as market insight.'],
      ['Behind scenes','reel','Behind the scenes','What happens before the final result reaches the customer?','Show process and quality.']
    ];
    return Array.from({length:count},(_,i)=>sets[i%sets.length]);
  }

  async function generateMonth(){
    const brand=activeBrand();if(!brand)return openBrand();
    const existing=state.items.length, target=12;
    if(existing>=target)return notify('This month already has '+existing+' items. Edit them instead of creating duplicates.','error');
    const start=monthKey(state.month);
    let plan=currentPlan();
    if(!plan){
      const r=await sb().from('studio_social_plans').upsert({brand_id:brand.id,month_start:start,objective:brand.primary_goal||null,target_posts:target,status:'active',updated_at:new Date().toISOString()},{onConflict:'brand_id,month_start'}).select().single();
      if(r.error)return notify(r.error.message,'error');plan=r.data;
    }
    const needed=target-existing, ideas=concepts(brand,needed), lastDay=new Date(state.month.getFullYear(),state.month.getMonth()+1,0).getDate();
    const payload=ideas.map((c,idx)=>{
      const n=existing+idx, day=Math.min(2+n*2,lastDay);
      const date=state.month.getFullYear()+'-'+pad(state.month.getMonth()+1)+'-'+pad(day)+'T19:00:00+03:00';
      return {brand_id:brand.id,plan_id:plan.id,publish_at:new Date(date).toISOString(),platforms:brand.platforms,format:c[1],pillar:c[0],title:c[2],hook:c[3],creative_brief:c[4],status:'draft'};
    });
    const r=await sb().from('studio_social_content_items').insert(payload);
    if(r.error)return notify(r.error.message,'error');
    notify('Month created: '+needed+' content items.');await loadMonth();render();
  }

  function tryInit(){
    if(state.ready||!window.ATS_ADMIN?.getClient?.())return;
    load();
  }
  window.ATS_SOCIAL_OS=Object.freeze({
    reload:()=>load(true),
    openBrand:async id=>{state.brandId=id;await loadMonth();render();}
  });
  window.addEventListener('ats-social-open-brand',e=>{const id=e.detail?.brandId;if(!id)return;sessionStorage.setItem('ats_social_open_brand',id);if(state.ready){state.brandId=id;void loadMonth().then(render);}});
  window.addEventListener('ats-admin-ready',tryInit);
  setTimeout(tryInit,0);
})();
