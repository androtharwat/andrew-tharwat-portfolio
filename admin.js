(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg || !window.supabase) return alert('Supabase configuration is missing.');
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={projects:[],categories:[],settings:{},session:null,editingProject:null,editingCategory:null};
  const authView=$('#auth-view'), adminView=$('#admin-view'), toast=$('#toast');
  const slugify=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const arr=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const resolveMedia=u=>{const raw=u||'';const clean=raw.replace(/^\//,'');if(window.PORTFOLIO_ASSETS&&window.PORTFOLIO_ASSETS[clean])return window.PORTFOLIO_ASSETS[clean];return /^https?:\/\//i.test(raw)?raw:(clean?('../'+clean):'../assets/logo-mark.svg')};
  function notify(msg,type='success'){toast.textContent=msg;toast.className=`toast show ${type}`;setTimeout(()=>toast.className='toast',2600)}

  async function init(){
    const {data:{session}}=await sb.auth.getSession();
    if(session) await enterAdmin(session); else showAuth();
    sb.auth.onAuthStateChange((_event,session)=>{if(!session) showAuth();});
  }
  function showAuth(){state.session=null;authView.classList.remove('hidden');adminView.classList.add('hidden')}
  async function enterAdmin(session){
    state.session=session;
    try{await sb.rpc('portfolio_claim_admin');}catch(_e){}
    const {data:admin}=await sb.from('portfolio_admins').select('user_id,email').eq('user_id',session.user.id).maybeSingle();
    if(!admin){notify('This account is not authorized as portfolio admin.','error');await sb.auth.signOut();return;}
    authView.classList.add('hidden');adminView.classList.remove('hidden');$('#admin-email').textContent=admin.email;
    await refreshAll();
  }
  const ADMIN_EMAIL='androsarot3@gmail.com';
  $('#trust-device').addEventListener('click',async()=>{
    const password=$('#auth-password').value;
    if(password.length<8)return notify('Choose a password with at least 8 characters.','error');
    $('#trust-device').disabled=true;$('#trust-device').textContent='CONNECTING...';
    try{
      let {data,error}=await sb.auth.signInWithPassword({email:ADMIN_EMAIL,password});
      if(!error&&data.session){localStorage.setItem('andrew_portfolio_trusted','1');await enterAdmin(data.session);notify('Trusted device connected.');return;}
      if(error && /email not confirmed/i.test(error.message||'')){return notify('Email confirmation is still enabled in Supabase. Disable Confirm email once, then press TRUST THIS DEVICE again.','error');}
      const signup=await sb.auth.signUp({email:ADMIN_EMAIL,password});
      if(signup.error)return notify(signup.error.message,'error');
      if(signup.data.session){localStorage.setItem('andrew_portfolio_trusted','1');await enterAdmin(signup.data.session);notify('This device is now trusted.');}
      else notify('Email confirmation is still enabled in Supabase. Disable Confirm email once, then press TRUST THIS DEVICE again.','error');
    }finally{$('#trust-device').disabled=false;$('#trust-device').textContent='TRUST THIS DEVICE';}
  });
  $('#sign-out').addEventListener('click',async()=>{localStorage.removeItem('andrew_portfolio_trusted');await sb.auth.signOut();});

  $$('#admin-nav button').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.goto)));
  function switchTab(tab){$$('#admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));$('#page-title').textContent=tab[0].toUpperCase()+tab.slice(1);if(tab==='media')loadMedia();}

  async function refreshAll(){await Promise.all([loadCategories(),loadProjects(),loadSettings()]);renderDashboard();}
  async function loadCategories(){const {data,error}=await sb.from('portfolio_categories').select('*').order('sort_order');if(error)return notify(error.message,'error');state.categories=data||[];renderCategories();renderCategoryOptions();}
  async function loadProjects(){const {data,error}=await sb.from('portfolio_projects').select('*,portfolio_categories(name,color)').order('sort_order');if(error)return notify(error.message,'error');state.projects=data||[];renderProjects();renderDashboard();}
  async function loadSettings(){const {data,error}=await sb.from('portfolio_site_settings').select('*');if(error)return;state.settings=Object.fromEntries((data||[]).map(r=>[r.key,r.value||{}]));fillSettingsForm();}
  function renderDashboard(){const ps=state.projects;$('#m-projects').textContent=ps.length;$('#m-published').textContent=ps.filter(p=>p.status==='published').length;$('#m-drafts').textContent=ps.filter(p=>p.status==='draft').length;$('#m-categories').textContent=state.categories.length;$('#recent-projects').innerHTML=ps.slice(0,5).map(p=>`<div class="recent-item"><img src="${esc(resolveMedia(p.cover_url))}"><div><h3>${esc(p.title)}</h3><p>${esc(p.portfolio_categories?.name||'Uncategorized')}</p></div><span class="status ${p.status}">${p.status}</span></div>`).join('')||'<p>No projects yet.</p>';}
  function renderProjects(){const q=$('#project-search')?.value.toLowerCase()||'',f=$('#project-filter')?.value||'all';const rows=state.projects.filter(p=>(!q||p.title.toLowerCase().includes(q)||p.slug.includes(q))&&(f==='all'||p.status===f));$('#projects-list').innerHTML=rows.map(p=>`<div class="project-row"><img src="${esc(resolveMedia(p.cover_url))}" alt=""><div><h3>${esc(p.title)}</h3><p>/${esc(p.slug)} ${p.featured?'• Featured':''}</p></div><div><p>${esc(p.portfolio_categories?.name||'Uncategorized')}</p></div><div><span class="status ${p.status}">${p.status}</span></div><div class="actions"><button class="icon-btn" data-open-project="${p.id}">EDIT</button><a class="icon-btn" target="_blank" href="/projects/${encodeURIComponent(p.slug)}">VIEW ↗</a></div></div>`).join('')||'<div class="panel-card">No matching projects.</div>';$$('[data-open-project]').forEach(b=>b.addEventListener('click',()=>openProject(b.dataset.openProject)));}
  $('#project-search').addEventListener('input',renderProjects);$('#project-filter').addEventListener('change',renderProjects);
  function renderCategories(){$('#categories-list').innerHTML=state.categories.map(c=>`<div class="category-row"><div class="category-swatch" style="background:${esc(c.color)}"></div><div><h3>${esc(c.name)}</h3><p>/${esc(c.slug)} — ${esc(c.description||'')}</p></div><div><p>Order ${c.sort_order} • ${c.is_active?'Active':'Hidden'}</p></div><div class="actions"><button class="icon-btn" data-open-category="${c.id}">EDIT</button></div></div>`).join('');$$('[data-open-category]').forEach(b=>b.addEventListener('click',()=>openCategory(b.dataset.openCategory)));}
  function renderCategoryOptions(){const sel=$('#project-form select[name="category_id"]');if(sel)sel.innerHTML='<option value="">Uncategorized</option>'+state.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}

  function formVal(form,name){return form.elements[name]?.value??''}
  $('#quick-add').addEventListener('click',()=>openProject());$('#add-project').addEventListener('click',()=>openProject());
  function openProject(id=null){const d=$('#project-dialog'),f=$('#project-form');f.reset();state.editingProject=id?state.projects.find(p=>p.id===id):null;$('#delete-project').classList.toggle('hidden',!id);$('#project-dialog-title').textContent=id?'Edit Project':'New Project';if(state.editingProject){const p=state.editingProject;['id','title','slug','excerpt','description','challenge','solution','result','category_id','status','cover_url','video_url','project_url','github_url','sort_order'].forEach(k=>{if(f.elements[k])f.elements[k].value=p[k]??''});f.elements.tags.value=(p.tags||[]).join(', ');f.elements.tools.value=(p.tools||[]).join(', ');f.elements.featured.checked=!!p.featured;loadProjectMedia(p.id);}else{$('#project-media-preview').innerHTML='';f.elements.status.value='draft';f.elements.sort_order.value=state.projects.length?Math.max(...state.projects.map(x=>x.sort_order||0))+10:10}d.showModal();}
  $('#project-form input[name="title"]').addEventListener('input',e=>{const f=$('#project-form');if(!state.editingProject||!f.elements.slug.value)f.elements.slug.value=slugify(e.target.value)});
  $('#project-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;let payload={title:formVal(f,'title').trim(),slug:slugify(formVal(f,'slug')),excerpt:formVal(f,'excerpt'),description:formVal(f,'description'),challenge:formVal(f,'challenge'),solution:formVal(f,'solution'),result:formVal(f,'result'),category_id:formVal(f,'category_id')||null,status:formVal(f,'status'),featured:f.elements.featured.checked,cover_url:formVal(f,'cover_url'),video_url:formVal(f,'video_url'),project_url:formVal(f,'project_url'),github_url:formVal(f,'github_url'),sort_order:Number(formVal(f,'sort_order')||0),tags:arr(formVal(f,'tags')),tools:arr(formVal(f,'tools')),published_at:formVal(f,'status')==='published'?(state.editingProject?.published_at||new Date().toISOString()):null};if(!payload.title||!payload.slug)return notify('Title and slug are required.','error');let project;if(state.editingProject){const {data,error}=await sb.from('portfolio_projects').update(payload).eq('id',state.editingProject.id).select().single();if(error)return notify(error.message,'error');project=data}else{const {data,error}=await sb.from('portfolio_projects').insert(payload).select().single();if(error)return notify(error.message,'error');project=data}
    const coverFile=$('#cover-upload').files[0];if(coverFile){const url=await uploadFile(coverFile,`projects/${project.slug}/cover`);if(url){await sb.from('portfolio_projects').update({cover_url:url}).eq('id',project.id)}}
    const gallery=[...$('#gallery-upload').files];if(gallery.length){await uploadGallery(project,gallery)}
    dclose('project-dialog');notify('Project saved.');await loadProjects();});
  $('#delete-project').addEventListener('click',async()=>{if(!state.editingProject||!confirm(`Delete ${state.editingProject.title}?`))return;const {error}=await sb.from('portfolio_projects').delete().eq('id',state.editingProject.id);if(error)return notify(error.message,'error');dclose('project-dialog');notify('Project deleted.');await loadProjects();});
  async function loadProjectMedia(projectId){const {data}=await sb.from('portfolio_project_media').select('*').eq('project_id',projectId).order('sort_order');$('#project-media-preview').innerHTML=(data||[]).map(m=>`<div class="mini-media">${m.media_type==='video'?`<video src="${esc(m.url)}"></video>`:`<img src="${esc(m.url)}">`}<button type="button" data-delete-media="${m.id}" data-url="${esc(m.url)}">×</button></div>`).join('');$$('[data-delete-media]').forEach(b=>b.addEventListener('click',()=>deleteProjectMedia(b.dataset.deleteMedia,b.dataset.url,projectId)));}
  async function deleteProjectMedia(id,url,projectId){if(!confirm('Remove this media item?'))return;await sb.from('portfolio_project_media').delete().eq('id',id);const path=storagePath(url);if(path)await sb.storage.from('portfolio-media').remove([path]);await loadProjectMedia(projectId)}
  async function uploadGallery(project,files){let order=0;const {data:existing}=await sb.from('portfolio_project_media').select('sort_order').eq('project_id',project.id).order('sort_order',{ascending:false}).limit(1);order=(existing?.[0]?.sort_order||0)+10;for(const file of files){const url=await uploadFile(file,`projects/${project.slug}/gallery`);if(!url)continue;await sb.from('portfolio_project_media').insert({project_id:project.id,url,media_type:file.type.startsWith('video/')?'video':'image',alt_text:project.title,sort_order:order});order+=10}}

  $('#add-category').addEventListener('click',()=>openCategory());
  function openCategory(id=null){const d=$('#category-dialog'),f=$('#category-form');f.reset();state.editingCategory=id?state.categories.find(c=>c.id===id):null;$('#delete-category').classList.toggle('hidden',!id);$('#category-dialog-title').textContent=id?'Edit Category':'New Category';if(state.editingCategory){const c=state.editingCategory;['id','name','slug','description','color','sort_order'].forEach(k=>f.elements[k].value=c[k]??'');f.elements.is_active.checked=!!c.is_active}else{f.elements.color.value='#e10613';f.elements.sort_order.value=state.categories.length?Math.max(...state.categories.map(x=>x.sort_order||0))+10:10}d.showModal();}
  $('#category-form input[name="name"]').addEventListener('input',e=>{const f=$('#category-form');if(!state.editingCategory||!f.elements.slug.value)f.elements.slug.value=slugify(e.target.value)});
  $('#category-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,payload={name:formVal(f,'name'),slug:slugify(formVal(f,'slug')),description:formVal(f,'description'),color:formVal(f,'color'),sort_order:Number(formVal(f,'sort_order')||0),is_active:f.elements.is_active.checked};const q=state.editingCategory?sb.from('portfolio_categories').update(payload).eq('id',state.editingCategory.id):sb.from('portfolio_categories').insert(payload);const {error}=await q;if(error)return notify(error.message,'error');dclose('category-dialog');notify('Category saved.');await loadCategories();await loadProjects();});
  $('#delete-category').addEventListener('click',async()=>{if(!state.editingCategory||!confirm(`Delete ${state.editingCategory.name}? Projects will become uncategorized.`))return;const {error}=await sb.from('portfolio_categories').delete().eq('id',state.editingCategory.id);if(error)return notify(error.message,'error');dclose('category-dialog');notify('Category deleted.');await loadCategories();await loadProjects();});

  function fillSettingsForm(){const f=$('#settings-form');for(const [group,obj] of Object.entries(state.settings)){for(const [k,v] of Object.entries(obj||{})){const el=f.elements[`${group}.${k}`];if(el)el.value=Array.isArray(v)?v.join(', '):v??''}}}
  $('#settings-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const groups=['hero','about','stats','contact'];for(const group of groups){const base={...(state.settings[group]||{})};$$(`[name^="${group}."]`,f).forEach(el=>base[el.name.split('.')[1]]=el.value);const {error}=await sb.from('portfolio_site_settings').upsert({key:group,value:base});if(error)return notify(error.message,'error')}notify('Website content updated.');await loadSettings();});

  async function uploadFile(file,prefix='library'){const ext=(file.name.split('.').pop()||'bin').toLowerCase();const safe=slugify(file.name.replace(/\.[^.]+$/,''))||'media';const path=`${prefix}/${Date.now()}-${safe}.${ext}`;const {error}=await sb.storage.from('portfolio-media').upload(path,file,{upsert:false,contentType:file.type});if(error){notify(error.message,'error');return null}const {data}=sb.storage.from('portfolio-media').getPublicUrl(path);return data.publicUrl}
  function storagePath(url){const marker='/storage/v1/object/public/portfolio-media/';return url.includes(marker)?decodeURIComponent(url.split(marker)[1]):null}
  $('#media-upload').addEventListener('change',async e=>{const files=[...e.target.files];if(!files.length)return;$('#upload-progress').classList.remove('hidden');for(const f of files)await uploadFile(f,'library');$('#upload-progress').classList.add('hidden');e.target.value='';notify('Media uploaded.');await loadMedia();});
  async function loadMedia(){const {data,error}=await sb.storage.from('portfolio-media').list('library',{limit:100,sortBy:{column:'created_at',order:'desc'}});if(error)return notify(error.message,'error');const bucket=sb.storage.from('portfolio-media');$('#media-grid').innerHTML=(data||[]).filter(x=>x.name).map(f=>{const path=`library/${f.name}`,url=bucket.getPublicUrl(path).data.publicUrl,isVideo=/\.(mp4|webm)$/i.test(f.name);return `<div class="media-tile">${isVideo?`<video muted src="${esc(url)}"></video>`:`<img src="${esc(url)}" loading="lazy">`}<div class="media-actions"><button data-copy="${esc(url)}">COPY URL</button><button data-remove="${esc(path)}">DELETE</button></div></div>`}).join('')||'<p>No media uploaded yet.</p>';$$('[data-copy]').forEach(b=>b.addEventListener('click',()=>navigator.clipboard.writeText(b.dataset.copy).then(()=>notify('URL copied.'))));$$('[data-remove]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this media file?'))return;await bucket.remove([b.dataset.remove]);notify('Media deleted.');loadMedia()}));}

  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>dclose(b.dataset.close)));
  function dclose(id){const d=document.getElementById(id);if(d?.open)d.close()}
  init();
})();