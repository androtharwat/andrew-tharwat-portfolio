(() => {
  const cfg=window.PORTFOLIO_CONFIG,$=(s,r=document)=>r.querySelector(s);
  let sb=null;
  const escapeHtml=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const toast=m=>{const e=$('#portal-toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)};
  const safeName=name=>String(name||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-120);
  const fmt=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';

  async function context(){
    if(!sb)return null;
    const {data:{user}}=await sb.auth.getUser();if(!user)return null;
    const client=await sb.from('studio_clients').select('*').maybeSingle();if(client.error||!client.data)return null;
    const projects=await sb.from('studio_projects').select('*').order('created_at',{ascending:false});if(projects.error)return null;
    const hash=location.hash.replace(/^#/,'');const requested=hash.startsWith('project/')?decodeURIComponent(hash.slice(8)):null;
    const project=(projects.data||[]).find(p=>p.id===requested)||(projects.data||[]).find(p=>p.status!=='completed')||(projects.data||[])[0];
    return {user,client:client.data,project};
  }

  async function render(){
    const root=$('#portal-files-live');if(!root||$('#portal-shell')?.classList.contains('hidden'))return;
    const ctx=await context();if(!ctx?.project){root.innerHTML='<div class="portal-card">No active project is available for file sharing yet.</div>';return;}
    const {data:files,error}=await sb.from('studio_files').select('*').eq('project_id',ctx.project.id).order('created_at',{ascending:false});
    if(error){root.innerHTML=`<div class="portal-card">${escapeHtml(error.message)}</div>`;return;}
    root.innerHTML=`<div class="portal-card"><p class="eyebrow">UPLOAD TO STUDIO</p><h3 style="margin:6px 0 8px">Send a project file</h3><p>PDF, images, Office files, ZIP or MP4 up to 25 MB. Your upload is attached only to ${escapeHtml(ctx.project.project_code)}.</p><input id="client-file-input" type="file" style="margin-top:12px;width:100%;font-size:9px" /><button id="client-file-upload" class="portal-button" type="button">UPLOAD FILE →</button></div>${(files||[]).length?(files||[]).map(f=>`<div class="portal-file-row"><div><b>${escapeHtml(f.file_name)}</b><span>${escapeHtml(f.category.replaceAll('_',' '))}${f.version?` · ${escapeHtml(f.version)}`:''}</span></div><span>${fmt(f.created_at)}</span><button class="text-link" type="button" data-file-download="${f.id}" data-file-path="${escapeHtml(f.storage_path)}">OPEN →</button></div>`).join(''):'<div class="portal-card">No client-visible files have been shared yet.</div>'}`;
  }

  async function upload(){
    const ctx=await context(),input=$('#client-file-input'),file=input?.files?.[0];if(!ctx?.project)return toast('No active project');if(!file)return toast('Choose a file first');if(file.size>26214400)return toast('Maximum file size is 25 MB');
    const button=$('#client-file-upload');button.disabled=true;button.textContent='UPLOADING…';
    const path=`${ctx.client.id}/${ctx.project.id}/client_upload/${crypto.randomUUID()}_${safeName(file.name)}`;
    try{
      const up=await sb.storage.from('studio-client-files').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;
      const meta=await sb.from('studio_files').insert({project_id:ctx.project.id,uploaded_by:ctx.user.id,file_name:file.name,storage_path:path,category:'client_upload',visibility:'client_visible'});if(meta.error){await sb.storage.from('studio-client-files').remove([path]);throw meta.error;}
      toast('File uploaded to the Studio');await render();
    }catch(e){toast(e.message)}finally{if(button){button.disabled=false;button.textContent='UPLOAD FILE →'}}
  }

  async function openFile(button){
    const path=button.dataset.filePath;if(!path)return;button.disabled=true;
    try{const signed=await sb.storage.from('studio-client-files').createSignedUrl(path,120);if(signed.error)throw signed.error;window.open(signed.data.signedUrl,'_blank','noopener')}catch(e){toast(e.message)}finally{button.disabled=false}
  }

  function boot(){if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return;sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});setTimeout(render,400)}
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-portal-nav="files"]');if(nav)setTimeout(render,120);const upload=e.target.closest('#client-file-upload');if(upload){e.preventDefault();upload&&window.setTimeout(()=>void 0,0);void uploadFileProxy()}const dl=e.target.closest('[data-file-download]');if(dl){e.preventDefault();void openFile(dl)}});
  async function uploadFileProxy(){await upload()}
  window.addEventListener('hashchange',()=>{if(location.hash==='#files')setTimeout(render,120)});
  boot();
})();
