(() => {
  const cfg=window.PORTFOLIO_CONFIG;
  const DEVICE_KEY='andrew_portfolio_device_v2';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let device=null,sb=null,poll=null,apps=[],selectedId=new URLSearchParams(location.search).get('application'),filter='all',query='',decisionId=null;

  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const fmtDate=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const values=v=>Array.isArray(v)?v.filter(Boolean):[];
  const statusLabel=v=>String(v||'new').replaceAll('_',' ').toUpperCase();

  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
  function randomSecret(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
  function randomCode(){const v=new Uint32Array(1);crypto.getRandomValues(v);return String(v[0]%1000000).padStart(6,'0')}
  async function sha256hex(value){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  function makeClient(d){return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}

  function showTrust(message='This browser needs one-time approval before Team Operations can open.'){
    $('#gate-message').textContent=message;$('#trust-start').classList.remove('hidden');$('#pairing-box').classList.add('hidden')
  }
  function showPending(code){$('#trust-start').classList.add('hidden');$('#pairing-box').classList.remove('hidden');$('#pairing-code').textContent=code||'------';$('#gate-message').textContent='Waiting for Trusted Device approval.';startPolling()}
  function startPolling(){if(!poll)poll=setInterval(checkDevice,3000)}
  function stopPolling(){if(poll)clearInterval(poll);poll=null}
  async function checkDevice(){
    if(!device?.id||!device?.secret||!sb)return false;
    const {data,error}=await sb.from('portfolio_trusted_devices').select('status,claim_code').eq('device_id',device.id).maybeSingle();
    if(error||!data)return false;
    if(data.status==='approved'){stopPolling();await enterApp();return true}
    if(data.status==='pending'){showPending(data.claim_code);return false}
    localStorage.removeItem(DEVICE_KEY);device=null;sb=null;stopPolling();showTrust('This device is no longer approved. Create a new approval request.');return false
  }
  async function initSecurity(){
    if(!cfg||!window.supabase){$('#gate-message').textContent='ATS configuration could not load.';return}
    try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch{device=null}
    if(!device?.id||!device?.secret)return showTrust();
    sb=makeClient(device);const ok=await checkDevice();if(!ok&&!poll)showTrust()
  }

  $('#trust-device').addEventListener('click',async()=>{
    const b=$('#trust-device');b.disabled=true;b.textContent='CREATING APPROVAL…';
    try{
      device={id:crypto.randomUUID(),secret:randomSecret(),code:randomCode()};sb=makeClient(device);
      const secretHash=await sha256hex(device.secret);
      const {error}=await sb.from('portfolio_trusted_devices').insert({device_id:device.id,secret_hash:secretHash,claim_code:device.code,label:`ATS Team Operations · ${location.hostname}`,status:'pending'});
      if(error)throw error;
      localStorage.setItem(DEVICE_KEY,JSON.stringify(device));showPending(device.code)
    }catch(e){toast(e.message||'Could not create device approval');device=null;sb=null}
    finally{b.disabled=false;b.textContent='TRUST THIS BROWSER'}
  });

  async function enterApp(){
    $('#gate').classList.add('hidden');$('#app').classList.remove('hidden');if(!location.hash)location.hash='team'
  }

  initSecurity().catch(e=>{$('#gate-message').textContent=e.message});
})();
