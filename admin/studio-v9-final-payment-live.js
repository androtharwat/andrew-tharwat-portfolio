(() => {
  const cfg=window.PORTFOLIO_CONFIG,DEVICE_KEY='andrew_portfolio_device_v2';
  const $=(s,r=document)=>r.querySelector(s);let sb=null;
  const money=v=>new Intl.NumberFormat('en-US').format(Number(v||0));
  const toast=m=>{const e=$('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1900)};
  function makeClient(){let d=null;try{d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch{}if(!d?.id||!d?.secret||!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase)return null;return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
  function code(){const h=location.hash.replace(/^#/,'');return h.startsWith('project/')?decodeURIComponent(h.slice(8)):null}
  async function project(){const c=code();if(!c)return null;const q=await sb.from('studio_projects').select('*').eq('project_code',c).maybeSingle();if(q.error)throw q.error;return q.data}

  async function renderControl(){const host=$('[data-project-tab-panel="payments"] .panel');if(!host||!code()||!sb)return;let box=$('#final-payment-control');if(!box){host.insertAdjacentHTML('afterbegin','<div id="final-payment-control" class="proposal-editor-note" style="margin-bottom:14px"></div>');box=$('#final-payment-control')}try{const p=await project();if(!p){box.innerHTML='Open a project first.';return}const q=await sb.from('studio_payments').select('*').eq('project_id',p.id);if(q.error)throw q.error;const paid=(q.data||[]).filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0),outstanding=Math.max(0,Number(p.project_value||0)-paid),final=(q.data||[]).find(x=>x.payment_type==='final'&&x.status!=='cancelled');if(outstanding<=0){box.innerHTML='<b>PROJECT FULLY PAID</b> · No outstanding balance.';return}if(final){box.innerHTML=`<b>FINAL PAYMENT ACTIVE</b> · ${final.payment_code} · EGP ${money(final.amount)} · ${String(final.status).toUpperCase()}`;return}const allowed=p.stage==='Final Payment';box.innerHTML=`<b>OUTSTANDING BALANCE</b> · EGP ${money(outstanding)} ${allowed?`<button class="button button-primary" id="create-final-payment" type="button" style="margin-left:12px">CREATE FINAL PAYMENT</button>`:'<span style="margin-left:8px">Confirm the approved review and advance the project to Final Payment first.</span>'}`;}catch(e){box.textContent=e.message}}

  async function createFinal(){const p=await project();if(!p)return;if(p.stage!=='Final Payment')return toast('Advance the project to Final Payment first');const q=await sb.from('studio_payments').select('*').eq('project_id',p.id);if(q.error)return toast(q.error.message);if((q.data||[]).some(x=>x.payment_type==='final'&&x.status!=='cancelled'))return toast('Final payment already exists');const paid=(q.data||[]).filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount||0),0),outstanding=Math.max(0,Number(p.project_value||0)-paid);if(outstanding<=0)return toast('Project is already fully paid');const ins=await sb.from('studio_payments').insert({lead_id:p.source_lead_id,proposal_id:p.source_proposal_id,project_id:p.id,client_id:p.client_id,payment_type:'final',amount:outstanding,currency:p.currency||'EGP',status:'pending',due_date:new Date().toISOString().slice(0,10)}).select('*').single();if(ins.error)return toast(ins.error.message);await sb.from('studio_activity').insert({actor_type:'admin',entity_type:'payment',entity_id:ins.data.id,action:'final_payment_created',metadata:{project_id:p.id,amount:outstanding}});toast(`${ins.data.payment_code} created · EGP ${money(outstanding)}`);setTimeout(()=>location.reload(),500)}

  function boot(){sb=makeClient();if(!sb)return;setTimeout(renderControl,600)}
  document.addEventListener('click',e=>{const tab=e.target.closest('[data-project-tab="payments"]');if(tab)setTimeout(renderControl,100);const create=e.target.closest('#create-final-payment');if(create){e.preventDefault();void createFinal();return}},true);
  window.addEventListener('hashchange',()=>setTimeout(renderControl,150));boot();
})();

(() => {
  if(document.querySelector('script[data-studio-ux-live]')) return;
  const s=document.createElement('script');
  s.src='/admin/studio-v9-ux-live.js?v=1';
  s.async=false;
  s.dataset.studioUxLive='true';
  document.head.appendChild(s);
})();