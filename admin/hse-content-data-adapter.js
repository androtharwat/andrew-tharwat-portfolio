(()=>{
  const cfg=window.PORTFOLIO_CONFIG;
  const DEVICE_KEY='andrew_portfolio_device_v2';
  const gate=document.querySelector('#gate'),app=document.querySelector('#app'),message=document.querySelector('#gate-message');
  const fail=(text)=>{if(message)message.textContent=text;gate?.classList.remove('hidden');app?.classList.add('hidden')};
  function makeClient(device){
    return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{
      global:{headers:{'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret}},
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
  }
  async function boot(){
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return fail('Studio OS configuration could not be loaded.');
    let device=null;try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch(_e){}
    if(!device?.id||!device?.secret)return fail('This browser has not been approved for Studio OS yet. Open Studio OS and complete Trusted Device approval.');
    const sb=makeClient(device);
    const {data,error}=await sb.from('portfolio_trusted_devices').select('status').eq('device_id',device.id).maybeSingle();
    if(error||data?.status!=='approved')return fail('This browser is not currently approved. Open Studio OS and complete Trusted Device approval.');
    window.HSE_CONTENT_CONTEXT={device,sb};
    gate?.classList.add('hidden');app?.classList.remove('hidden');
    const script=document.createElement('script');script.src='/admin/hse-content-v2.js?v=1';script.defer=true;document.body.appendChild(script);
  }
  boot().catch(e=>fail(e?.message||'Unable to open HSE Content.'));
})();