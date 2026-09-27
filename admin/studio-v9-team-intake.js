(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const DEVICE_KEY='andrew_portfolio_device_v2';
  const badge=document.getElementById('nav-team-app-count');
  if(!badge||!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return;
  let device=null;
  try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch{}
  if(!device?.id||!device?.secret){badge.textContent='0';return}
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{
    global:{headers:{'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  sb.from('studio_team_applications').select('id',{count:'exact',head:true}).eq('status','new')
    .then(({count,error})=>{
      if(error){console.warn('ATS team application count:',error.message);return}
      badge.textContent=String(count||0);
      badge.classList.toggle('hidden',!count);
    });
})();