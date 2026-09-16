(() => {
  const cfg=window.PORTFOLIO_CONFIG,DEVICE_KEY='andrew_portfolio_device_v2';
  let sb=null;
  const toast=m=>{const e=document.querySelector('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)};
  function makeClient(){let d=null;try{d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch{}if(!d?.id||!d?.secret||!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return null;return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
  function code(){const h=location.hash.replace(/^#/,'');return h.startsWith('project/')?decodeURIComponent(h.slice(8)):null}
  async function verify(button){
    if(!sb)sb=window.StudioLiveDB?.getClient?.()||makeClient();if(!sb)return;
    const projectCode=code();if(!projectCode)return;
    const q=await sb.from('studio_projects').select('id,stage,project_code').eq('project_code',projectCode).maybeSingle();if(q.error)throw q.error;if(!q.data||q.data.stage!=='Deployment')return false;
    const files=await sb.from('studio_files').select('id').eq('project_id',q.data.id).eq('category','final_delivery').eq('visibility','client_visible').limit(1);if(files.error)throw files.error;
    if(!(files.data||[]).length){toast('Release at least one Final Delivery file to the client before completing the project.');return true;}
    button.dataset.completionVerified='1';button.click();return true;
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('#advance-stage');if(!b)return;
    if(b.dataset.completionVerified==='1'){delete b.dataset.completionVerified;return;}
    e.preventDefault();e.stopImmediatePropagation();
    void verify(b).then(intercepted=>{if(!intercepted){b.dataset.completionVerified='1';b.click()}}).catch(err=>toast(err.message||'Could not verify final delivery.'));
  },true);
})();