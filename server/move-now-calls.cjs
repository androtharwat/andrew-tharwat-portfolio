const {randomUUID,createHash}=require('node:crypto');
const {keys,choices,cleanCRM,phoneNumber,view}=require('./move-now-call-model.cjs');
const ai=require('./move-now-ai.cjs');
function staffLead(crm,id,email,recap){
 const phone=phoneNumber(crm.phone);
 if(!crm.clientName||!phone||!crm.service||!crm.location)throw Error('كمّل اسم العميل ورقمه والخدمة والمنطقة قبل حفظ الطلب.');
 if(crm.service==='buy_cash'&&!crm.budget)throw Error('كمّل ميزانية الشراء.');
 if(crm.service==='buy_installments'&&(!crm.downPayment||!crm.monthlyInstallment))throw Error('كمّل المقدم والقسط الشهري.');
 const details={location:crm.location,type:crm.propertyType,area:crm.area,rooms:crm.rooms,condition:crm.condition,budget:crm.budget,downPayment:crm.downPayment,monthlyInstallment:crm.monthlyInstallment,installmentYears:crm.installmentYears,finishLevel:crm.finishLevel,furnitureScope:crm.furnitureScope,rentType:crm.rentType,delivery:crm.delivery,timeline:crm.timing,nextStep:crm.nextStep,followupTime:crm.followupTime,financialClass:choices.financialClass[crm.financialClass],source:'الكول سنتر'};
 return {id,name:[crm.title,crm.clientName].filter(Boolean).join(' '),phone,service:crm.service,details:JSON.stringify(Object.fromEntries(Object.entries(details).filter(([,v])=>v))),notes:`مكالمة الفريق — ${email}\n${recap}\n${crm.nextStep?'الخطوة التالية: '+crm.nextStep:''}`};
}
async function handleCalls({req,user,rest,reply,bodyOf,queryValue,uuid,ClientError,analyze=ai.analyze}){
 const resource=String(queryValue(req,'resource'));const method=req.method;
 if(resource==='copilot'&&method==='GET'){
  const id=String(queryValue(req,'id'));if(!uuid(id))throw new ClientError('تحليل غير صحيح.');
  const {rows}=await rest('move_now_ai_runs',{id:'eq.'+id,agent_email:'eq.'+user.email,select:'id,call_id,result,state,model,created_at',limit:'1'});if(!rows.length)throw new ClientError('التحليل غير موجود.',404);return reply(200,rows[0]);
 }
 if(resource==='copilot'&&method==='POST'){
  const p=bodyOf(req,30000);if(!uuid(p.callId)||typeof p.notes!=='string'||!p.notes.trim()||p.notes.length>12000||!Array.isArray(p.locked)||p.locked.some(k=>!keys.includes(k)))throw new ClientError('راجع ملاحظات المكالمة.');
  let previous;try{previous=cleanCRM(p.previous)}catch(e){throw new ClientError(e.message)}
  const hash=createHash('sha256').update(JSON.stringify({model:ai.model,revision:ai.revision,notes:p.notes,previous,locked:p.locked})).digest('hex');
  const cached=await rest('move_now_ai_runs',{agent_email:'eq.'+user.email,call_id:'eq.'+p.callId,input_hash:'eq.'+hash,state:'eq.complete',select:'id,result',order:'created_at.desc',limit:'1'});
  if(cached.rows.length)return reply(200,{...cached.rows[0].result,id:cached.rows[0].id});
  const {rows:allowed}=await rest('rpc/move_now_ai_attempt',{}, {method:'POST',body:JSON.stringify({p_agent:user.email})});if(!allowed)throw new ClientError('وصلت لحد التحليل. تقدر تكمّل الحقول وتحفظ المكالمة يدويًا.',429);
  const id=randomUUID();await rest('move_now_ai_runs',{}, {method:'POST',body:JSON.stringify({id,call_id:p.callId,agent_email:user.email,input_hash:hash,model:ai.model,state:'pending',created_at:Date.now()})});
  let result;try{const output=await analyze({notes:p.notes,previous,locked:p.locked},user.email);const derived=view(output.crm,output.uncertain);result={...output,...derived,nudge:output.nudge,recap:output.recap};}
  catch(cause){await rest('move_now_ai_runs',{id:'eq.'+id},{method:'PATCH',body:JSON.stringify({state:'error'})});const status=cause.statusCode||cause.cause?.statusCode;const message=String(cause.message||'');const reason=/free.{0,40}(tier|credit)|paid|purchase/i.test(message)?'free_tier_policy':/custom.{0,30}report|tag|user.{0,5}id/i.test(message)?'reporting_permission':/oidc|auth|token/i.test(message)?'authentication':/model|allowlist|routing/i.test(message)?'model_policy':'unknown';console.error('Move Now AI unavailable',{status:status||'unknown',type:cause.name,reason});throw new ClientError(status===402?'رصيد التحليل الذكي غير متاح. تقدر تكمّل الحقول وتحفظ المكالمة يدويًا.':'تعذر التحليل الذكي حاليًا. ملاحظاتك محفوظة في المسودة، وتقدر تكمل يدويًا.',503);}
  await rest('move_now_ai_runs',{id:'eq.'+id},{method:'PATCH',body:JSON.stringify({state:'complete',result,token_usage:result.usage,estimated_cost_usd:result.usage.inputTokens*ai.tokenPrice.input+result.usage.outputTokens*ai.tokenPrice.output})});
  return reply(200,{...result,id});
 }
 if(resource==='calls'&&method==='GET'){
  const leadId=String(queryValue(req,'leadId'));const id=String(queryValue(req,'id'));
  if(leadId){if(!uuid(leadId))throw new ClientError('طلب غير صحيح.');const {rows}=await rest('move_now_leads',{id:'eq.'+leadId,select:'*',limit:'1'});if(!rows.length)throw new ClientError('الطلب غير موجود.',404);return reply(200,{lead:rows[0]});}
  const params={select:'*',order:'created_at.desc',limit:'50'};if(id){if(!uuid(id))throw new ClientError('مكالمة غير صحيحة.');params.id='eq.'+id;}else params.agent_email='eq.'+user.email;
  const {rows}=await rest('move_now_calls',params);return reply(200,{calls:rows});
 }
 if(resource==='calls'&&method==='POST'){
  const p=bodyOf(req,35000);if(!uuid(p.id)||typeof p.notes!=='string'||p.notes.length>12000||!Number.isSafeInteger(p.updatedAt)||p.updatedAt<0||typeof p.publish!=='boolean'||(p.leadId&&!uuid(p.leadId)))throw new ClientError('راجع بيانات المكالمة.');
  let crm;try{crm=cleanCRM(p.crm)}catch(e){throw new ClientError(e.message)}
  const uncertain=Array.isArray(p.uncertain)?p.uncertain.filter(k=>keys.includes(k)):[];
  const locked=Array.isArray(p.locked)?p.locked.filter(k=>keys.includes(k)):[];
  const summary=view(crm,uncertain);let lead=null;
  if(p.publish){if(uncertain.some(k=>['clientName','phone','service','location','budget','downPayment','monthlyInstallment'].includes(k)))throw new ClientError('راجع البيانات التي تحتاج تأكيد قبل حفظ الطلب.');try{lead=staffLead(crm,p.id,user.email,summary.recap)}catch(e){throw new ClientError(e.message)}}
  if(p.leadId){const {rows}=await rest('move_now_leads',{id:'eq.'+p.leadId,select:'id',limit:'1'});if(!rows.length)throw new ClientError('الطلب المرتبط غير موجود.',404);}
  const now=Date.now();const record={id:p.id,lead_id:p.leadId||null,agent_email:user.email,raw_notes:p.notes,crm,analysis:{crm,...summary,uncertain,locked},created_at:now,updated_at:now};
  try{const {rows}=await rest('rpc/move_now_save_call',{}, {method:'POST',body:JSON.stringify({p_record:record,p_expected:p.updatedAt,p_lead:lead,p_publish:p.publish,p_owner:user.owner})});return reply(200,{call:rows});}catch(e){if(e.statusCode===400||e.statusCode===409)throw new ClientError('المكالمة اتعدّلت أو اتحفظت بالفعل. افتحها من سجل المكالمات قبل الحفظ.',409);throw e;}
 }
 return reply(405,{error:'طريقة غير متاحة.'});
}
module.exports={handleCalls,staffLead};
