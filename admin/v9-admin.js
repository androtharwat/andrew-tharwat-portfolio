(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase)return;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const DEVICE_KEY='andrew_portfolio_device_v2';
  const defaults={work:{columns:4,order:[],sizes:{},hidden:[]},team:{founderWidth:38,order:['hse','software','design','video','content','ai'],hidden:[]},brief:{order:['type','goal','team','scope','contact'],hidden:[]}};
  const roleNames={hse:'HSE & TECHNICAL',software:'SOFTWARE & AUTOMATION',design:'DESIGN & VISUAL',video:'VIDEO & MOTION',content:'CONTENT & STORYTELLING',ai:'AI PRODUCTION'};
  const briefNames={type:'PROJECT TYPE',goal:'GOAL',team:'DISCIPLINES',scope:'SCOPE & TIMING',contact:'CONTACT'};
  const state={device:null,sb:null,projects:[],layout:structuredClone(defaults),dirty:false};
  const clone=o=>JSON.parse(JSON.stringify(o));
  function notify(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}
  function markDirty(){state.dirty=true;$('#save-state').textContent='Unsaved changes'}
  function makeClient(d){return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
  function merge(raw={}){state.layout={work:{...clone(defaults.work),...(raw.work||{}),sizes:{...(raw.work?.sizes||{})}},team:{...clone(defaults.team),...(raw.team||{})},brief:{...clone(defaults.brief),...(raw.brief||{})}}}
  async function init(){
    try{state.device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch(_e){state.device=null}
    if(!state.device?.id||!state.device?.secret){$('#gate-message').textContent='This browser is not trusted yet. Open the main Control Center first and approve this device once.';return}
    state.sb=makeClient(state.device);
    const {data,error}=await state.sb.from('portfolio_trusted_devices').select('status,label').eq('device_id',state.device.id).maybeSingle();
    if(error||!data||data.status!=='approved'){$('#gate-message').textContent='This browser is not approved for portfolio administration. Use the main Control Center to complete device approval.';return}
    await load();$('#gate').classList.add('hidden');$('#app').classList.remove('hidden');
  }
  async function load(){
    const [{data:projects,error:pErr},{data:setting,error:sErr}]=await Promise.all([
      state.sb.from('portfolio_projects').select('id,title,title_ar,slug,status,featured,sort_order,portfolio_categories(name)').eq('status','published').order('sort_order',{ascending:true}),
      state.sb.from('portfolio_site_settings').select('value').eq('key','v9_layout').maybeSingle()
    ]);
    if(pErr)notify(pErr.message);if(sErr)console.warn(sErr);
    state.projects=projects||[];merge(setting?.value||{});
    normalize();renderAll();state.dirty=false;$('#save-state').textContent='Loaded';
  }
  function normalize(){
    const slugs=state.projects.map(p=>p.slug);state.layout.work.order=[...(state.layout.work.order||[]).filter(x=>slugs.includes(x)),...slugs.filter(x=>!(state.layout.work.order||[]).includes(x))];
    state.layout.work.hidden=(state.layout.work.hidden||[]).filter(x=>slugs.includes(x));
    state.layout.team.order=[...(state.layout.team.order||[]).filter(x=>roleNames[x]),...Object.keys(roleNames).filter(x=>!(state.layout.team.order||[]).includes(x))];
    state.layout.team.hidden=(state.layout.team.hidden||[]).filter(x=>roleNames[x]);
    state.layout.brief.order=[...(state.layout.brief.order||[]).filter(x=>briefNames[x]),...Object.keys(briefNames).filter(x=>!(state.layout.brief.order||[]).includes(x))];
    state.layout.brief.hidden=(state.layout.brief.hidden||[]).filter(x=>briefNames[x]);
  }
  function renderAll(){renderMetrics();renderWork();renderTeam();renderBrief()}
  function renderMetrics(){$('#metric-projects').textContent=state.projects.length;$('#metric-columns').textContent=state.layout.work.columns;$('#metric-roles').textContent=state.layout.team.order.filter(k=>!state.layout.team.hidden.includes(k)).length;$('#metric-steps').textContent=state.layout.brief.order.filter(k=>!state.layout.brief.hidden.includes(k)).length}

  $('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-panel]');if(!b)return;$$('#nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===b.dataset.panel));$('#page-title').textContent=b.querySelector('span').textContent});

  function projectMap(){return new Map(state.projects.map(p=>[p.slug,p]))}
  function renderWork(){
    $('#work-columns').value=String(state.layout.work.columns||4);
    const map=projectMap();$('#work-list').innerHTML=state.layout.work.order.map((slug,i)=>{const p=map.get(slug);if(!p)return'';const hidden=state.layout.work.hidden.includes(slug),size=state.layout.work.sizes?.[slug]||'normal';return `<div class="sort-item ${hidden?'hidden-item':''}" draggable="true" data-kind="work" data-key="${slug}"><button class="drag-handle" title="Drag">⋮⋮</button><div class="sort-copy"><b>${String(i+1).padStart(2,'0')} · ${escapeHtml(p.title)}</b><small>${escapeHtml(p.portfolio_categories?.name||'Uncategorized')} · /${escapeHtml(slug)}</small></div><div class="sort-actions"><select data-size="${slug}"><option value="compact" ${size==='compact'?'selected':''}>S</option><option value="normal" ${size==='normal'?'selected':''}>M</option><option value="wide" ${size==='wide'?'selected':''}>WIDE</option><option value="large" ${size==='large'?'selected':''}>XL</option></select><button data-up="work:${slug}" title="Move up">↑</button><button data-toggle="work:${slug}" title="Show / hide">${hidden?'○':'●'}</button></div></div>`}).join('');bindSortables();
  }
  $('#work-columns').addEventListener('change',e=>{state.layout.work.columns=Number(e.target.value);markDirty();renderMetrics()});

  function renderTeam(){
    $('#founder-width').value=String(state.layout.team.founderWidth||38);
    $('#team-list').innerHTML=state.layout.team.order.map((key,i)=>{const hidden=state.layout.team.hidden.includes(key);return `<div class="sort-item ${hidden?'hidden-item':''}" draggable="true" data-kind="team" data-key="${key}"><button class="drag-handle">⋮⋮</button><div class="sort-copy"><b>${String(i+1).padStart(2,'0')} · ${roleNames[key]}</b><small>${key}</small></div><div class="sort-actions"><button data-up="team:${key}">↑</button><button data-toggle="team:${key}">${hidden?'○':'●'}</button></div></div>`}).join('');bindSortables();
  }
  $('#founder-width').addEventListener('change',e=>{state.layout.team.founderWidth=Number(e.target.value);markDirty()});

  function renderBrief(){
    $('#brief-list').innerHTML=state.layout.brief.order.map((key,i)=>{const hidden=state.layout.brief.hidden.includes(key);return `<div class="sort-item ${hidden?'hidden-item':''}" draggable="true" data-kind="brief" data-key="${key}"><button class="drag-handle">⋮⋮</button><div class="sort-copy"><b>${String(i+1).padStart(2,'0')} · ${briefNames[key]}</b><small>${key}</small></div><div class="sort-actions"><button data-up="brief:${key}">↑</button><button data-toggle="brief:${key}">${hidden?'○':'●'}</button></div></div>`}).join('');bindSortables();
  }

  function bindSortables(){
    $$('[data-size]').forEach(s=>s.onchange=e=>{state.layout.work.sizes[e.target.dataset.size]=e.target.value;markDirty()});
    $$('[data-up]').forEach(b=>b.onclick=()=>{const[kind,key]=b.dataset.up.split(':');moveUp(kind,key)});
    $$('[data-toggle]').forEach(b=>b.onclick=()=>{const[kind,key]=b.dataset.toggle.split(':');toggle(kind,key)});
    $$('.sort-item').forEach(row=>{
      row.ondragstart=e=>{row.classList.add('dragging');e.dataTransfer.setData('text/plain',`${row.dataset.kind}:${row.dataset.key}`)};
      row.ondragend=()=>row.classList.remove('dragging');
      row.ondragover=e=>e.preventDefault();
      row.ondrop=e=>{e.preventDefault();const raw=e.dataTransfer.getData('text/plain'),[kind,key]=raw.split(':');if(kind!==row.dataset.kind||key===row.dataset.key)return;const arr=arrayFor(kind),from=arr.indexOf(key),to=arr.indexOf(row.dataset.key);arr.splice(from,1);arr.splice(to,0,key);markDirty();renderAll()};
    });
  }
  function arrayFor(kind){return kind==='work'?state.layout.work.order:kind==='team'?state.layout.team.order:state.layout.brief.order}
  function hiddenFor(kind){return kind==='work'?state.layout.work.hidden:kind==='team'?state.layout.team.hidden:state.layout.brief.hidden}
  function moveUp(kind,key){const arr=arrayFor(kind),i=arr.indexOf(key);if(i>0){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];markDirty();renderAll()}}
  function toggle(kind,key){const h=hiddenFor(kind);if(kind==='brief'&&!h.includes(key)&&state.layout.brief.order.filter(x=>!h.includes(x)).length<=1)return notify('At least one brief step must remain visible.');const i=h.indexOf(key);i>=0?h.splice(i,1):h.push(key);markDirty();renderAll()}

  $('#save-all').addEventListener('click',async()=>{
    const btn=$('#save-all');btn.disabled=true;btn.textContent='SAVING…';
    const {error}=await state.sb.from('portfolio_site_settings').upsert({key:'v9_layout',value:state.layout});
    btn.disabled=false;btn.textContent='SAVE V9 SETTINGS';
    if(error)return notify(error.message);state.dirty=false;$('#save-state').textContent='Saved';notify('V9 SETTINGS SAVED');renderMetrics();
  });
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});
  function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
  init().catch(err=>{$('#gate-message').textContent='Unable to open V9 Control Center. '+err.message;console.error(err)});
})();