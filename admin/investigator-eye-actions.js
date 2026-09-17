(() => {
  const cfg=window.PORTFOLIO_CONFIG,DEVICE_KEY='andrew_portfolio_device_v2';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  let sb=null,currentCaseId=null,currentCaseStatus=null;
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const money=(v,c='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v||0));
  const statusText=s=>String(s||'').replaceAll('_',' ');
  function makeClient(){let d=null;try{d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch(_){}if(!d?.id||!d?.secret)return null;return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{global:{headers:{'x-portfolio-device-id':d.id,'x-portfolio-device-secret':d.secret}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
  function toast(m){const e=$('#toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}

  function nextAction(c,consultPay){
    const paid=consultPay?.status==='paid';
    if(c.status==='intake_pending'){
      return paid
        ? '<div class="ie-next-action ready"><b>PAYMENT CONFIRMED</b><p>Refresh or move the case to consultation booked if the automatic sync has not completed yet.</p></div>'
        : '<div class="ie-next-action waiting"><b>NEXT: COLLECT CONSULTATION PAYMENT</b><p>Add the secure payment link when available, then confirm payment. The case status updates automatically.</p></div>';
    }
    if(c.status==='consultation_booked')return '<div class="ie-next-action ready"><b>NEXT: PREPARE THE CONSULTATION</b><p>Review the intake, add your preparation notes, then mark the case ready for consultation.</p><button type="button" class="primary" data-ie-next-status="ready_for_consultation">MARK READY FOR CONSULTATION</button></div>';
    if(c.status==='ready_for_consultation')return '<div class="ie-next-action ready"><b>NEXT: COMPLETE THE CONSULTATION</b><p>Record the key professional notes, then complete the consultation before recommending any follow-on service.</p><button type="button" class="primary" data-ie-next-status="consultation_complete">COMPLETE CONSULTATION</button></div>';
    if(c.status==='consultation_complete')return '<div class="ie-next-action ready"><b>NEXT: RECOMMEND ONLY WHAT IS NEEDED</b><p>The consultation is complete. Add only the services that are justified by this case.</p></div>';
    if(c.status==='services_recommended')return '<div class="ie-next-action ready"><b>CLIENT DECISION</b><p>Recommendations are visible to the client. Wait for the client to choose what they want to proceed with.</p></div>';
    if(c.status==='active')return '<div class="ie-next-action ready"><b>SERVICE WORK ACTIVE</b><p>The client has moved into follow-on service work. Keep recommendations and payments aligned with the selected services.</p></div>';
    if(c.status==='closed')return '<div class="ie-next-action done"><b>CASE CLOSED</b><p>No further action is required unless the case is reopened manually.</p></div>';
    if(c.status==='cancelled')return '<div class="ie-next-action waiting"><b>CASE CANCELLED</b><p>No further action is required.</p></div>';
    return '';
  }

  async function loadWorkflow(caseId){
    currentCaseId=caseId;sb=sb||makeClient();if(!sb)return;
    const root=$('#case-detail-body');if(!root)return;
    let holder=$('#ie-admin-workflow');if(!holder){holder=document.createElement('section');holder.id='ie-admin-workflow';holder.className='ie-admin-workflow';root.appendChild(holder)}
    holder.innerHTML='<div class="ie-admin-loading">Loading case controls…</div>';
    const [caseRes,servicesRes,caseServicesRes]=await Promise.all([
      sb.from('studio_consultation_cases').select('id,status,consultation_payment_id,consultation_notes,intake_summary,consultation_completed_at').eq('id',caseId).single(),
      sb.from('studio_service_catalog').select('id,service_code,name_en,pricing_mode,display_price_usd,is_active').eq('is_active',true).order('sort_order'),
      sb.from('studio_case_services').select('id,service_id,payment_id,status,quoted_price,currency,recommendation_reason,studio_service_catalog(name_en,service_code)').eq('case_id',caseId).order('created_at')
    ]);
    if(caseRes.error||servicesRes.error||caseServicesRes.error){holder.innerHTML=`<div class="ie-admin-error">${esc((caseRes.error||servicesRes.error||caseServicesRes.error).message)}</div>`;return}
    const c=caseRes.data;currentCaseStatus=c.status;
    const caseServices=caseServicesRes.data||[],used=new Set(caseServices.map(x=>x.service_id));
    const payIds=[c.consultation_payment_id,...caseServices.map(x=>x.payment_id)].filter(Boolean);
    let pays=[];if(payIds.length){const pr=await sb.from('studio_payments').select('id,payment_code,payment_type,amount,currency,status,checkout_url,checkout_provider').in('id',[...new Set(payIds)]);if(!pr.error)pays=pr.data||[]}
    const consultPay=pays.find(p=>p.id===c.consultation_payment_id),servicePays=pays.filter(p=>p.payment_type==='case_service');
    const available=(servicesRes.data||[]).filter(s=>s.service_code!=='CONSULT-60'&&!used.has(s.id));
    const canRecommend=['consultation_complete','services_recommended','active'].includes(c.status);

    holder.innerHTML=`<div class="ie-admin-workflow-head"><div><h3>Case Workflow</h3><small>One screen · one current next action</small></div><span class="ie-case-pill">${esc(statusText(c.status))}</span></div>
      ${nextAction(c,consultPay)}
      <div class="ie-admin-grid">
        <section class="ie-admin-block"><span>CONSULTATION PAYMENT</span>${paymentEditor(consultPay,'consultation')}</section>
        <section class="ie-admin-block"><span>CONSULTATION NOTES</span><textarea id="ie-consult-notes" placeholder="Preparation notes, key findings, decisions and professional reasoning…">${esc(c.consultation_notes||'')}</textarea><div class="ie-admin-row"><button type="button" data-ie-save-notes>SAVE NOTES</button></div><p class="ie-admin-note">Keep the core reasoning here so the recommendation can be traced back to the consultation.</p></section>
        <section class="ie-admin-block wide"><span>RECOMMENDATIONS</span>${canRecommend?`<div class="ie-admin-row"><select id="ie-rec-service"><option value="">Choose service</option>${available.map(s=>`<option value="${s.id}" data-mode="${s.pricing_mode}" data-start="${s.display_price_usd??''}">${esc(s.name_en)} · ${s.pricing_mode==='quote'?'Quote':s.pricing_mode==='from'?`From ${money(s.display_price_usd)}`:money(s.display_price_usd)}</option>`).join('')}</select><input id="ie-rec-price" type="number" min="0" step="5" placeholder="Exact quote USD · optional" /></div><div class="ie-admin-row"><textarea id="ie-rec-reason" placeholder="Why this service is recommended for this case…"></textarea><button class="primary" type="button" data-ie-add-recommendation>ADD RECOMMENDATION</button></div><p class="ie-admin-note">Add only what the consultation supports. Fixed-price services use their catalog price automatically; custom services can stay quote-pending until an exact price is agreed.</p>`:`<div class="ie-admin-gate"><b>Complete the consultation first.</b><p>Recommendations stay locked until the consultation reaches “consultation complete”.</p></div>`}<div class="ie-admin-existing">${caseServices.length?caseServices.map(x=>`<div><span><b>${esc(x.studio_service_catalog?.name_en||'Service')}</b><small>${esc(x.recommendation_reason||'No reason added')} · ${esc(statusText(x.status))}</small></span><strong>${x.quoted_price!=null?money(x.quoted_price,x.currency||'USD'):'Quote pending'}</strong></div>`).join(''):'<div><span><b>No recommendations yet.</b><small>Add only what this case actually needs.</small></span></div>'}</div></section>
        ${servicePays.length?`<section class="ie-admin-block wide"><span>FOLLOW-ON SERVICE PAYMENTS</span>${servicePays.map(p=>paymentEditor(p,'service')).join('')}</section>`:''}
        <details class="ie-admin-advanced ie-admin-block wide"><summary>Advanced status correction</summary><div class="ie-admin-row"><select id="ie-case-status">${['intake_pending','consultation_booked','ready_for_consultation','consultation_complete','services_recommended','active','closed','cancelled'].map(s=>`<option value="${s}" ${s===c.status?'selected':''}>${s.replaceAll('_',' ')}</option>`).join('')}</select><button type="button" data-ie-save-status>SAVE STATUS</button></div><p class="ie-admin-note">Use this only to correct an exceptional case. Normal workflow changes should happen through payment, next-action buttons and recommendations.</p></details>
      </div>`;
  }

  function paymentEditor(p,type){if(!p)return '<p class="ie-admin-note">Payment record not created yet.</p>';return `<div class="ie-admin-pay" data-pay-box="${p.id}"><div class="ie-admin-pay-head"><span><b>${esc(p.payment_code||type)}</b><small>${money(p.amount,p.currency||'USD')} · ${type==='consultation'?'Consultation only':'Selected services'}</small></span><span class="ie-admin-pay-status ${p.status==='paid'?'paid':''}">${esc(p.status)}</span></div><div class="ie-admin-row"><input data-pay-url="${p.id}" value="${esc(p.checkout_url||'')}" placeholder="Secure checkout/payment URL" /><input data-pay-provider="${p.id}" value="${esc(p.checkout_provider||'')}" placeholder="Provider · optional" /></div><div class="ie-admin-row"><button type="button" data-ie-save-payment="${p.id}">SAVE LINK</button>${p.status!=='paid'?`<button class="primary" type="button" data-ie-mark-paid="${p.id}">MARK PAID</button>`:'<span class="ie-admin-success">Payment confirmed</span>'}</div></div>`}

  function syncRecommendationPrice(){const select=$('#ie-rec-service'),input=$('#ie-rec-price');if(!select||!input)return;const option=select.selectedOptions?.[0];if(option?.dataset.mode==='fixed'&&option.dataset.start)input.value=option.dataset.start;else if(input.dataset.autoPrice==='1')input.value='';input.dataset.autoPrice=option?.dataset.mode==='fixed'?'1':'0'}
  async function saveStatus(){const status=$('#ie-case-status')?.value;if(!status||!currentCaseId)return;const payload={status};if(status==='consultation_complete')payload.consultation_completed_at=new Date().toISOString();if(status==='closed')payload.closed_at=new Date().toISOString();const {error}=await sb.from('studio_consultation_cases').update(payload).eq('id',currentCaseId);if(error)return toast(error.message);toast('Case status updated');await loadWorkflow(currentCaseId)}
  async function setNextStatus(status){if(!status||!currentCaseId)return;const payload={status};if(status==='consultation_complete')payload.consultation_completed_at=new Date().toISOString();const {error}=await sb.from('studio_consultation_cases').update(payload).eq('id',currentCaseId);if(error)return toast(error.message);toast(status==='consultation_complete'?'Consultation completed':'Case moved to next step');await loadWorkflow(currentCaseId)}
  async function saveNotes(){if(!currentCaseId)return;const notes=$('#ie-consult-notes')?.value.trim()||null;const {error}=await sb.from('studio_consultation_cases').update({consultation_notes:notes}).eq('id',currentCaseId);if(error)return toast(error.message);toast('Consultation notes saved')}
  async function savePayment(id){const url=$(`[data-pay-url="${id}"]`)?.value.trim()||null,provider=$(`[data-pay-provider="${id}"]`)?.value.trim()||null;const {error}=await sb.from('studio_payments').update({checkout_url:url,checkout_provider:provider}).eq('id',id);if(error)return toast(error.message);toast('Secure payment link saved');await loadWorkflow(currentCaseId)}
  async function markPaid(id){const {error}=await sb.from('studio_payments').update({status:'paid',paid_at:new Date().toISOString()}).eq('id',id);if(error)return toast(error.message);toast('Payment marked paid · case updated automatically');await loadWorkflow(currentCaseId)}
  async function addRecommendation(){if(!['consultation_complete','services_recommended','active'].includes(currentCaseStatus))return toast('Complete the consultation first');const select=$('#ie-rec-service'),serviceId=select?.value,reason=$('#ie-rec-reason')?.value.trim()||null;const option=select?.selectedOptions?.[0];const manual=$('#ie-rec-price')?.value||'';const raw=manual||(option?.dataset.mode==='fixed'?option.dataset.start:'');if(!serviceId)return toast('Choose a service');const quoted=raw!==''&&Number(raw)>0;const payload={case_id:currentCaseId,service_id:serviceId,status:quoted?'quoted':'recommended',recommendation_reason:reason,quoted_price:quoted?Number(raw):null,currency:'USD'};const {error}=await sb.from('studio_case_services').insert(payload);if(error)return toast(error.message);const update=await sb.from('studio_consultation_cases').update({status:'services_recommended',consultation_completed_at:new Date().toISOString()}).eq('id',currentCaseId).not('status','in','("closed","cancelled")');if(update.error)return toast(update.error.message);toast(quoted?'Recommendation added with exact price':'Recommendation added · client can request quote');await loadWorkflow(currentCaseId)}

  document.addEventListener('change',e=>{if(e.target?.id==='ie-rec-service')syncRecommendationPrice()});
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-case-id]');if(open)setTimeout(()=>loadWorkflow(open.dataset.caseId),40);
    if(e.target.closest('[data-ie-save-status]')){e.preventDefault();saveStatus()}
    if(e.target.closest('[data-ie-save-notes]')){e.preventDefault();saveNotes()}
    const next=e.target.closest('[data-ie-next-status]');if(next){e.preventDefault();setNextStatus(next.dataset.ieNextStatus)}
    const save=e.target.closest('[data-ie-save-payment]');if(save){e.preventDefault();savePayment(save.dataset.ieSavePayment)}
    const paid=e.target.closest('[data-ie-mark-paid]');if(paid){e.preventDefault();markPaid(paid.dataset.ieMarkPaid)}
    if(e.target.closest('[data-ie-add-recommendation]')){e.preventDefault();addRecommendation()}
  });
})();
