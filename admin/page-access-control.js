(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  if(!cfg||!window.supabase)return;
  let device=null;
  try{device=JSON.parse(localStorage.getItem('andrew_portfolio_device_v2')||'null')}catch(_e){}
  if(!device?.id||!device?.secret)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let rows=new Map(),busy=false,timer=null;

  const style=document.createElement('style');
  style.textContent=`
    .page-access-btn{min-width:92px!important;font-weight:900!important;letter-spacing:.35px!important}
    .page-access-btn.is-live{background:rgba(28,164,99,.12)!important;border-color:rgba(28,164,99,.35)!important;color:#31c77b!important}
    .page-access-btn.is-locked{background:rgba(225,6,19,.07)!important;border-color:rgba(225,6,19,.18)!important;color:#ff6570!important}
    .page-access-btn.needs-publish{opacity:.48!important;cursor:not-allowed!important}
    .page-access-note{display:block;margin-top:5px;font-size:8px;color:#6f8999;letter-spacing:.35px}
  `;document.head.appendChild(style);

  function toast(msg,type='success'){
    const t=document.getElementById('toast');if(!t)return;
    t.textContent=msg;t.className=`toast show ${type}`;setTimeout(()=>t.className='toast',2500);
  }
  async function refresh(){
    if(busy)return;busy=true;
    const {data,error}=await sb.from('portfolio_projects').select('id,title,status,page_enabled');
    busy=false;if(error)return;
    rows=new Map((data||[]).map(p=>[String(p.id),p]));decorate();
  }
  function decorate(){
    document.querySelectorAll('.project-row').forEach(row=>{
      const edit=row.querySelector('[data-open-project]');if(!edit)return;
      const id=String(edit.dataset.openProject||'');const p=rows.get(id);if(!p)return;
      const actions=edit.closest('.actions');if(!actions)return;
      let btn=actions.querySelector('.page-access-btn');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='icon-btn page-access-btn';actions.insertBefore(btn,edit)}
      btn.dataset.projectId=id;
      btn.classList.toggle('is-live',!!p.page_enabled);
      btn.classList.toggle('is-locked',!p.page_enabled);
      btn.classList.toggle('needs-publish',p.status!=='published');
      btn.disabled=p.status!=='published';
      btn.textContent=p.status!=='published'?'PUBLISH FIRST':(p.page_enabled?'PAGE ON':'PAGE OFF');
      btn.title=p.status!=='published'?'Publish the project before enabling its page':(p.page_enabled?'Click to disable cover/page opening':'Click to enable cover/page opening');
      if(!actions.querySelector('.page-access-note')){const n=document.createElement('span');n.className='page-access-note';n.textContent='Controls card click + project page';actions.appendChild(n)}
    });
  }
  document.addEventListener('click',async e=>{
    const btn=e.target.closest('.page-access-btn');if(!btn)return;
    e.preventDefault();e.stopPropagation();
    const id=btn.dataset.projectId,p=rows.get(String(id));if(!p)return;
    if(p.status!=='published')return toast('Publish the project first.','error');
    btn.disabled=true;btn.textContent='SAVING…';
    const next=!p.page_enabled;
    const {error}=await sb.from('portfolio_projects').update({page_enabled:next}).eq('id',id);
    if(error){btn.disabled=false;decorate();return toast(error.message,'error')}
    p.page_enabled=next;rows.set(String(id),p);decorate();toast(next?'Project page enabled.':'Project page locked.');
  },true);
  const host=document.getElementById('projects-list');
  if(host)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,180)}).observe(host,{childList:true,subtree:true});
  setTimeout(refresh,700);
})();