(() => {
  const cfg = window.PORTFOLIO_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c]));
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  let currentClient = null;
  let cases = [];
  let payments = [];
  let loading = false;

  const statusLabel = s => ({
    intake_pending:'Awaiting consultation payment',consultation_booked:'Consultation booked',ready_for_consultation:'Ready for consultation',consultation_complete:'Consultation complete',services_recommended:'Recommendations ready',active:'Services in progress',closed:'Closed',cancelled:'Cancelled',
    recommended:'Recommended',requested:'Quote requested',quoted:'Ready to accept',accepted:'Accepted',awaiting_payment:'Awaiting payment',paid:'Paid',in_progress:'In progress',delivered:'Delivered',declined:'Not selected',cancelled_service:'Cancelled'
  }[s] || String(s || '').replaceAll('_',' '));
  const money = (v,c='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));
  const fmtDate = v => v ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)) : '—';
  function toast(message){const el=$('#portal-toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200)}

  function paymentFor(id){return payments.find(p=>p.id===id)||null}
  function servicePaymentIds(c){return [...new Set((c.studio_case_services||[]).map(x=>x.payment_id).filter(Boolean))]}

  async function loadHse(){
    if(loading)return;loading=true;
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session){renderSignedOut();return}
      const clientRes=await sb.from('studio_clients').select('id,full_name,email').maybeSingle();
      if(clientRes.error||!clientRes.data)return;
      currentClient=clientRes.data;
      const [caseRes,paymentRes]=await Promise.all([
        sb.from('studio_consultation_cases').select('*,studio_case_services(id,service_id,payment_id,status,quoted_price,currency,recommendation_reason,requested_at,accepted_at,delivered_at,studio_service_catalog(id,service_code,name_en,name_ar,pricing_mode,display_price_usd))').order('created_at',{ascending:false}),
        sb.from('studio_payments').select('id,payment_code,payment_type,amount,currency,status,due_date,paid_at,checkout_url,checkout_provider,notes,created_at').in('payment_type',['consultation','case_service']).order('created_at',{ascending:false})
      ]);
      if(caseRes.error)throw caseRes.error;
      if(paymentRes.error)throw paymentRes.error;
      cases=caseRes.data||[];payments=paymentRes.data||[];
      render();
      if(cases.length){$('#portal-empty')?.classList.add('hidden');$('#portal-app')?.classList.remove('hidden')}
    }catch(e){console.error(e);const root=$('#hse-case-content');if(root)root.innerHTML=`<div class="portal-card"><b>Unable to load HSE consultation records.</b><p>${esc(e.message)}</p></div>`}
    finally{loading=false}
  }

  function renderSignedOut(){const root=$('#hse-case-content');if(root)root.innerHTML='<div class="hse-zero">Sign in to view your HSE consultation cases.</div>'}

  function startForm(){return `<article class="portal-card hse-start-card"><p class="eyebrow">ONE CLEAR FIRST STEP</p><h3>Start with a professional HSE consultation.</h3><p>You do not need to choose a report, assessment or technical solution first. Tell us what is happening and Andrew will shape the right next step after the consultation.</p><form id="hse-start-form" class="hse-simple-form"><label><span>MAIN HAZARD / ISSUE</span><select id="hse-hazard" required><option value="">Choose the closest match</option><option value="NOI|Noise Exposure">Noise Exposure</option><option value="HEAT|Heat Stress">Heat Stress</option><option value="LIGHT|Lighting">Lighting</option><option value="VIB|Vibration">Vibration</option><option value="RAD|Radiation">Radiation</option><option value="PRESS|Pressure Systems">Pressure Systems</option><option value="CHEM|Chemical Exposure">Chemical Exposure</option><option value="ELEC|Electrical Safety">Electrical Safety</option><option value="MACH|Machinery Safety">Machinery Safety</option><option value="WAH|Work at Height">Work at Height</option><option value="FIRE|Fire Safety">Fire Safety</option><option value="GEN|General HSE / Not Sure">General HSE / Not Sure</option></select></label><label><span>WHAT IS HAPPENING?</span><textarea id="hse-summary" required minlength="10" placeholder="A short plain-language description is enough."></textarea><small>No technical wording needed. You will not have to repeat this information later.</small></label><label><span>COUNTRY / JURISDICTION · OPTIONAL</span><input id="hse-jurisdiction" placeholder="Example: Egypt" /></label><div class="hse-fee-box"><div><b>Professional HSE Consultation · 60 minutes</b><small>Consultation only. Additional services are optional and quoted separately.</small></div><strong>$75</strong></div><button class="portal-button" id="hse-start-button" type="submit">START MY CONSULTATION →</button></form></article>`}

  function nextAction(c){
    const consultationPay=paymentFor(c.consultation_payment_id);
    const services=c.studio_case_services||[];
    const selectable=services.filter(s=>['recommended','quoted'].includes(s.status));
    if(consultationPay && consultationPay.status!=='paid'){
      if(consultationPay.checkout_url)return `<div class="hse-next"><span>01</span><div><b>Complete the $75 consultation booking</b><p>Your case details are saved. This is the only action needed now.</p></div><a href="${esc(consultationPay.checkout_url)}" target="_blank" rel="noopener">PAY ${money(consultationPay.amount,consultationPay.currency)} →</a></div>`;
      return `<div class="hse-next"><span>01</span><div><b>Your secure payment link is being prepared</b><p>You do not need to do anything else or send your details again. The payment step will appear here when ready.</p></div><button class="quiet-action" type="button" data-hse-refresh>REFRESH</button></div>`;
    }
    if(['consultation_booked','ready_for_consultation'].includes(c.status))return `<div class="hse-next"><span>02</span><div><b>Your consultation is booked</b><p>No action is required right now. Andrew will confirm the consultation timing and use the information already attached to this case.</p></div><button class="quiet-action" type="button" disabled>NO ACTION NEEDED</button></div>`;
    if(c.status==='consultation_complete'&&!services.length)return `<div class="hse-next"><span>03</span><div><b>Andrew is preparing your recommendation</b><p>You do not need to choose services yourself. Only relevant options will appear here.</p></div><button class="quiet-action" type="button" disabled>NO ACTION NEEDED</button></div>`;
    if(selectable.length)return recommendations(c,selectable);
    const pendingServicePays=servicePaymentIds(c).map(paymentFor).filter(p=>p&&p.status!=='paid');
    if(pendingServicePays.length){const p=pendingServicePays[0];return `<div class="hse-next"><span>04</span><div><b>Your selected services are ready for payment</b><p>Selected priced services are grouped into one payment whenever possible.</p></div>${p.checkout_url?`<a href="${esc(p.checkout_url)}" target="_blank" rel="noopener">PAY ${money(p.amount,p.currency)} →</a>`:`<button class="quiet-action" type="button" data-hse-refresh>PAYMENT LINK PREPARING</button>`}</div>`}
    if(c.status==='active')return `<div class="hse-next"><span>✓</span><div><b>Your case is moving forward</b><p>Requested and paid services are tracked below. We will only ask for an action when something is genuinely needed from you.</p></div><button class="quiet-action" type="button" disabled>NO ACTION NEEDED</button></div>`;
    if(c.status==='closed')return `<div class="hse-next"><span>✓</span><div><b>This consultation case is closed</b><p>Your case record and service history remain available here.</p></div><button class="quiet-action" type="button" disabled>COMPLETE</button></div>`;
    return `<div class="hse-next"><span>•</span><div><b>No action required</b><p>We will show the next required action here when it is ready.</p></div><button class="quiet-action" type="button" data-hse-refresh>REFRESH</button></div>`;
  }

  function recommendations(c,items){
    return `<div class="portal-card" style="margin-top:14px"><p class="eyebrow">RECOMMENDED FOR YOUR CASE</p><h3>Choose what you want us to handle.</h3><p>Nothing is added automatically. Tick only the services you want, then continue once.</p><div class="hse-service-choice">${items.map(s=>{const quoted=s.quoted_price!=null;const mode=s.studio_service_catalog?.pricing_mode;const start=s.studio_service_catalog?.display_price_usd||0;const price=quoted?money(s.quoted_price,s.currency||'USD'):(mode==='quote'?'REQUEST EXACT QUOTE':`REQUEST QUOTE · FROM ${money(start)}`);return `<label><input type="checkbox" value="${s.id}" data-hse-service-choice /><div><b>${esc(s.studio_service_catalog?.name_en||'Service')}</b><small>${esc(s.recommendation_reason||'Recommended after consultation')}${quoted?' · Exact price ready':' · Selecting this asks for the exact scope and price only'}</small></div><strong>${esc(price)}</strong></label>`}).join('')}</div><p class="hse-service-note">Exact-price items can move directly to one combined payment. Quote-request items are not purchased until you see and accept the exact price.</p><div class="hse-selected-action"><p>You can leave any item unchecked and decide later.</p><button type="button" data-hse-continue="${c.id}">CONTINUE WITH SELECTED SERVICES →</button></div></div>`}

  function serviceHistory(c){const items=c.studio_case_services||[];if(!items.length)return '';return `<div class="hse-payment-group">${items.filter(s=>!['recommended','quoted'].includes(s.status)).map(s=>`<div class="hse-service-state"><b>${esc(s.studio_service_catalog?.name_en||'Service')}</b><span>${esc(statusLabel(s.status))}${s.quoted_price!=null?` · ${money(s.quoted_price,s.currency||'USD')}`:''}</span></div>`).join('')}</div>`}

  function caseCard(c){return `<article class="hse-case"><div class="hse-case-top"><div><span class="hse-case-code">${esc(c.case_code||'CASE')}</span><h3>${esc(c.hazard_name||c.title)}</h3><p class="meta">Opened ${fmtDate(c.booked_at)}${c.jurisdiction?` · ${esc(c.jurisdiction)}`:''}</p></div><span class="hse-case-status">${esc(statusLabel(c.status))}</span></div>${nextAction(c)}${serviceHistory(c)}</article>`}

  function render(){
    const root=$('#hse-case-content');if(!root)return;
    const hasOpenCase=cases.some(c=>!['closed','cancelled'].includes(c.status));
    const casesHtml=cases.length?`<div class="hse-case-stack">${cases.map(caseCard).join('')}</div>`:'';
    const startHtml=(!cases.length||!hasOpenCase)?`<div style="margin-top:${cases.length?'12px':'0'}">${startForm()}</div>`:'';
    root.innerHTML=`<div class="hse-view-head"><div><p class="eyebrow">INVESTIGATOR'S EYE</p><h2>${cases.length?'Your HSE Cases':'HSE Consultation'}</h2><p>One consultation first. After that, only the services your case actually needs.</p></div><div class="hse-rule"><b>$75 = consultation only.</b><br>Reports, assessments, surveys, site visits and technical deliverables are separate and optional.</div></div>${casesHtml}${startHtml}`;
  }

  async function startConsultation(){
    const selected=$('#hse-hazard')?.value||'';if(!selected)return toast('Choose the closest issue first');
    const [code,name]=selected.split('|');const summary=$('#hse-summary')?.value.trim()||'';if(summary.length<10)return toast('Add a short description of what is happening');
    const button=$('#hse-start-button');if(button){button.disabled=true;button.textContent='CREATING CASE…'}
    const {data,error}=await sb.rpc('studio_start_client_consultation',{p_hazard_code:code,p_hazard_name:name,p_summary:summary,p_jurisdiction:$('#hse-jurisdiction')?.value.trim()||null});
    if(error){toast(error.message);if(button){button.disabled=false;button.textContent='START MY CONSULTATION →'}return}
    toast(`${data?.case_code||'Consultation case'} created · your details are saved`);await loadHse();
  }

  async function continueServices(caseId){
    const ids=$$('[data-hse-service-choice]:checked').map(x=>x.value);if(!ids.length)return toast('Select at least one service, or leave everything unchanged for now');
    const button=$(`[data-hse-continue="${caseId}"]`);if(button){button.disabled=true;button.textContent='PROCESSING…'}
    const {data,error}=await sb.rpc('studio_client_choose_case_services',{p_case_id:caseId,p_service_ids:ids});
    if(error){toast(error.message);if(button){button.disabled=false;button.textContent='CONTINUE WITH SELECTED SERVICES →'}return}
    const parts=[];if(data?.accepted)parts.push(`${data.accepted} accepted`);if(data?.requested)parts.push(`${data.requested} quote requested`);toast(parts.join(' · ')||'Selection saved');await loadHse();
  }

  document.addEventListener('submit',e=>{if(e.target?.id==='hse-start-form'){e.preventDefault();startConsultation()}});
  document.addEventListener('click',e=>{const c=e.target.closest('[data-hse-continue]');if(c){e.preventDefault();continueServices(c.dataset.hseContinue);return}if(e.target.closest('[data-hse-refresh]')){e.preventDefault();loadHse();return}const nav=e.target.closest('[data-portal-nav="hse"]');if(nav)setTimeout(()=>{const t=$('#portal-title'),s=$('#portal-subtitle');if(t)t.textContent='HSE Consultation';if(s)s.textContent='One clear next step at a time.';loadHse()},0)});
  window.addEventListener('hashchange',()=>{if(location.hash==='#hse')loadHse()});
  sb.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(loadHse,50)});
  setTimeout(loadHse,500);
})();
