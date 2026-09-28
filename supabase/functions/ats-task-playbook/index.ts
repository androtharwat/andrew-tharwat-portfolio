
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-portfolio-device-id, x-portfolio-device-secret',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,max=12000)=>String(v??'').trim().slice(0,max)

async function sha256hex(value:string){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')
}
function parseJson(text:string){
  return JSON.parse(text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim())
}
function sanitizeSchema(value:any):any{
  if(Array.isArray(value))return value.map(sanitizeSchema)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){
    if(k==='additionalProperties')continue
    out[k]=sanitizeSchema(v)
  }
  return out
}
function classify(text:string){
  const x=text.toLowerCase()
  const domains:string[]=[]
  const add=(v:string)=>{if(!domains.includes(v))domains.push(v)}
  if(/hse|safety|hazard|risk assessment|fire|excavat|hot work|confined|ppe|سلامة|خطر|مخاطر|حريق|حفريات/.test(x)){
    add('hse');add('risk_management')
  }
  if(/security|vulnerab|auth|login|otp|permission|access control|session|secret|payment|checkout|أمان|دخول|صلاحيات|دفع/.test(x)){
    add('software_security')
  }
  if(/journey|ux|user|customer|form|upload|website|app|mobile|flow|experience|checkout|story|portal|واجهة|تجربة|مستخدم|عميل|موقع|تطبيق|رحلة/.test(x)){
    add('product_ux');add('accessibility');add('web_performance')
  }
  if(/performance|speed|lcp|inp|cls|load time|سرعة|أداء/.test(x))add('web_performance')
  if(!domains.length)add('risk_management')
  const high=domains.includes('hse')||domains.includes('software_security')
  return {domains,risk_level:high?'high':domains.includes('risk_management')?'medium':'medium',human_gate_required:high}
}
function refsFor(sources:any[]){
  return sources.map(s=>({
    source_key:s.source_key,title:s.title,publisher:s.publisher,url:s.url,
    version_label:s.version_label,authority_tier:s.authority_tier,source_type:s.source_type
  }))
}
function fallback(task:any,domains:string[],sources:any[],risk:string,gate:boolean){
  const sourceKeys=sources.map(s=>s.source_key)
  let method='Evidence-backed task verification'
  let objective='Execute the task systematically, capture evidence, and turn observations into a defensible result.'
  let checklist:any[]=[]
  let evidence:any[]=[
    {type:'note',description:'Record observed results and blockers for every failed or uncertain check.',required:true}
  ]
  if(domains.includes('hse')){
    method='Site-specific hazard assessment and control verification'
    objective='Establish the actual hazard context, verify existing controls, and identify evidence-backed gaps without substituting AI for competent HSE judgement.'
    checklist=[
      ['Context','Confirm the exact activity, location, people exposed, routine/non-routine conditions and boundaries of the assessment.','The assessed scope is explicit and site-specific.','high'],
      ['Evidence','Collect direct evidence: observations, photos/documents, equipment/process information, worker input and existing assessments.','Key claims are supported by traceable evidence rather than assumption.','high'],
      ['Hazards','Identify credible hazards and who could be harmed; separate observed hazards from hypotheses.','Each material hazard has an exposure path and affected people identified.','critical'],
      ['Existing controls','Record existing controls and verify whether they are present, used, maintained and effective.','Controls are verified in practice, not only listed on paper.','critical'],
      ['Risk','Evaluate risk using the organization/site method and record uncertainty and missing evidence.','Risk rating has a stated basis and does not hide uncertainty.','critical'],
      ['Control hierarchy','When gaps exist, consider elimination/substitution before engineering, administrative/work-practice controls and PPE.','Proposed direction follows the hierarchy and avoids creating new hazards.','critical'],
      ['Emergency / non-routine','Check emergency and non-routine conditions relevant to the activity.','Credible abnormal conditions have been considered.','high'],
      ['Worker / expert input','Obtain worker input and competent specialist review where hazards are complex or high consequence.','Human knowledge and competent review are captured.','high'],
      ['Verification','Define how effectiveness will be checked after any control is implemented.','There is a measurable follow-up method and review point.','high'],
      ['Human gate','Stop before a final high-risk client recommendation until a competent HSE reviewer approves the evidence and proposed treatment.','Qualified human sign-off is recorded.','critical']
    ].map((v,i)=>({id:'C'+(i+1),section:v[0],action:v[1],how_to_test:v[1],pass_criteria:v[2],evidence_type:['note','photo_or_document'],required:true,allows_na:i===6,severity_if_failed:v[3],source_keys:sourceKeys}))
    evidence.push({type:'human_review',description:'Competent HSE review/sign-off for high-consequence findings or controls.',required:true})
  }else if(domains.includes('product_ux')){
    method='End-to-end human-centred journey audit'
    objective='Walk the real user journey, test expected and failure paths, record friction and accessibility issues, and verify that front-stage actions reach the required back-office state.'
    checklist=[
      ['Entry','Open the journey from a clean session on desktop and mobile and identify the intended primary action.','The purpose and next action are understandable without prior knowledge.','medium'],
      ['Choice','Complete the main product/story/world selection path and test changing the choice.','Options are understandable, selectable, editable and persist correctly.','medium'],
      ['Data entry','Complete all user/child/customer data using valid input and then trigger at least one validation error.','Required fields, labels, validation and recovery are clear; unnecessary repeat entry is avoided.','high'],
      ['Upload','Upload the required image/file using a supported file, then test an invalid/oversized file when safe.','Accepted requirements, progress, success and error recovery are clear and the correct file reaches the order.','high'],
      ['Review','Review entered data before final submission and attempt to edit a previous step.','The user can verify and correct important data without restarting the journey.','medium'],
      ['Transaction','Follow the deposit/payment or confirmation step using a safe test path; do not create an unintended real charge.','Price/deposit state, success/failure outcome and next step are unambiguous.','high'],
      ['Confirmation','Observe the customer-facing confirmation after submission/payment.','A unique order/request reference and clear next steps are presented.','high'],
      ['Back office','Verify the order/request appears in the admin/operations view with the expected data and assets.','Front-stage input maps completely and accurately to the operational record.','high'],
      ['State transition','Verify business rules that unlock the next internal capability only when the prerequisite state is true.','The system cannot skip the prerequisite and the valid state transition works consistently.','high'],
      ['Accessibility','Use keyboard-only navigation through the critical flow and inspect focus, labels, errors, target interaction and authentication friction.','Critical actions remain operable and understandable with no obvious WCAG 2.2 blockers.','high'],
      ['Performance','Record available LCP, INP and CLS evidence for critical pages, distinguishing field data from a single lab run.','Observed performance is documented; any threshold miss is recorded as a finding, not hidden.','medium'],
      ['Completion','Summarize pass/issue/N/A counts and identify the highest-severity friction or functional failures with evidence.','The result is traceable to the checklist and produces clear next work.','high']
    ].map((v,i)=>({id:'C'+(i+1),section:v[0],action:v[1],how_to_test:v[1],pass_criteria:v[2],evidence_type:['note','screenshot'],required:true,allows_na:[5,10].includes(i),severity_if_failed:v[3],source_keys:sourceKeys}))
    evidence.push({type:'screenshot',description:'Capture screenshots for failed/ambiguous journey states and key handoff states.',required:true})
  }else if(domains.includes('software_security')){
    method='Security verification task'
    objective='Verify security-relevant behavior with evidence and avoid asserting security from design intent alone.'
    checklist=[
      ['Scope','Define the component, trust boundaries, data handled and security-relevant states.','Scope and sensitive assets are explicit.','high'],
      ['Authentication','Verify authentication/session behavior relevant to the task, including failure and expiry paths.','Authentication states behave as intended and are evidenced.','critical'],
      ['Authorization','Test that a user cannot access actions or data outside the intended authorization boundary.','Access decisions are enforced server-side for tested paths.','critical'],
      ['Input','Test relevant input validation/encoding paths without destructive payloads.','Unexpected input is safely rejected or handled.','high'],
      ['Secrets / config','Check exposed client configuration and secret handling relevant to the task.','No server secret is exposed to the client.','critical'],
      ['Logging / failure','Confirm important failures are observable without leaking sensitive information.','Security-relevant failures are traceable and user errors do not expose secrets.','high'],
      ['Evidence','Record exact test, result and versioned security reference for each material finding.','Findings are reproducible and source-grounded.','high'],
      ['Human gate','Require qualified review before claiming the application or control is secure/compliant.','Human security review is recorded.','critical']
    ].map((v,i)=>({id:'C'+(i+1),section:v[0],action:v[1],how_to_test:v[1],pass_criteria:v[2],evidence_type:['note','screenshot_or_log'],required:true,allows_na:false,severity_if_failed:v[3],source_keys:sourceKeys}))
    evidence.push({type:'human_review',description:'Security reviewer sign-off before client-facing assurance or production risk acceptance.',required:true})
  }else{
    checklist=[
      ['Context','Confirm the objective, scope, stakeholders and constraints.','The task has an explicit decision target.','medium'],
      ['Evidence','Separate verified evidence from assumptions and missing information.','Material claims are traceable to evidence.','high'],
      ['Risk','Identify what could prevent the objective and assess consequence/likelihood using the applicable method.','Important risks and uncertainty are visible.','high'],
      ['Action','Test the smallest action that meaningfully reduces uncertainty or risk.','The action produces decision-quality evidence.','medium'],
      ['Verification','Define and check a measurable success/failure signal.','The result can be judged without relying on opinion alone.','high']
    ].map((v,i)=>({id:'C'+(i+1),section:v[0],action:v[1],how_to_test:v[1],pass_criteria:v[2],evidence_type:['note'],required:true,allows_na:false,severity_if_failed:v[3],source_keys:sourceKeys}))
  }
  return {domain:domains[0]||'risk_management',risk_level:risk,human_gate_required:gate,method_name:method,objective,checklist,required_evidence:evidence,completion_rule:gate?'All required checks must be resolved and the required human gate must be approved before final client-facing recommendation.':'All required checks must have Pass, Issue or justified N/A status, and every Issue must include evidence or a note.',generation_notes:'Deterministic evidence-backed fallback used.'}
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)

  let serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!serviceKey){
    try{serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{}
  }
  const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
  if(!serviceKey||!supabaseUrl)return json({error:'Server configuration unavailable'},500)
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})

  try{
    const body=await req.json().catch(()=>({}))
    const deviceId=clean(req.headers.get('x-portfolio-device-id'),200)
    const deviceSecret=clean(req.headers.get('x-portfolio-device-secret'),500)
    if(!deviceId||!deviceSecret)return json({error:'Trusted ATS device required'},401)
    const secretHash=await sha256hex(deviceSecret)
    const {data:trusted}=await admin.from('portfolio_trusted_devices').select('status,secret_hash').eq('device_id',deviceId).maybeSingle()
    if(!trusted||trusted.status!=='approved'||trusted.secret_hash!==secretHash)return json({error:'Trusted ATS device required'},403)

    const taskId=clean(body?.task_id,80)
    const force=!!body?.force
    if(!taskId)return json({error:'task_id is required'},400)

    if(!force){
      const {data:cached}=await admin.from('studio_task_playbooks').select('*').eq('task_id',taskId).maybeSingle()
      if(cached)return json({ok:true,cached:true,playbook:cached})
    }

    const {data:task,error:taskError}=await admin.from('studio_solution_tasks')
      .select('id,case_id,task_type,title,rationale,owner_type,priority,status,acceptance_criteria,expected_effect,dependency_note,evidence_refs')
      .eq('id',taskId).maybeSingle()
    if(taskError||!task)return json({error:'Task not found'},404)

    const {data:caseRow,error:caseError}=await admin.from('studio_discovery_cases').select('*').eq('id',task.case_id).maybeSingle()
    if(caseError||!caseRow)return json({error:'Discovery case not found'},404)
    const {data:lead,error:leadError}=await admin.from('studio_leads')
      .select('id,lead_code,full_name,company_name,service,project_goal,current_assets,ats_understanding,missing_information,status')
      .eq('id',caseRow.lead_id).maybeSingle()
    if(leadError||!lead)return json({error:'Lead not found'},404)

    const contextText=JSON.stringify({task,lead,discovery:{
      current_state:caseRow.current_state,impact:caseRow.impact,affected_people:caseRow.affected_people,
      desired_outcome:caseRow.desired_outcome,evidence:caseRow.evidence,prior_attempts:caseRow.prior_attempts,
      process_point:caseRow.process_point,constraints:caseRow.constraints,root_problem:caseRow.root_problem,
      diagnosis_summary:caseRow.diagnosis_summary,system_problem_statement:caseRow.system_problem_statement
    }})
    const classed=classify(contextText)
    const {data:sourceRows,error:sourceError}=await admin.from('studio_knowledge_sources')
      .select('source_key,domain,title,publisher,source_type,authority_tier,url,version_label,jurisdiction,principles,status,notes')
      .in('domain',classed.domains).eq('status','active').order('authority_tier',{ascending:true})
    if(sourceError)return json({error:'Could not load ATS knowledge sources'},500)
    const sources=sourceRows||[]
    const sourceRefs=refsFor(sources)

    const snapshot={task,lead,discovery:{
      current_state:caseRow.current_state,impact:caseRow.impact,affected_people:caseRow.affected_people,
      desired_outcome:caseRow.desired_outcome,evidence:caseRow.evidence,prior_attempts:caseRow.prior_attempts,
      process_point:caseRow.process_point,constraints:caseRow.constraints,root_problem:caseRow.root_problem,
      diagnosis_summary:caseRow.diagnosis_summary,system_problem_statement:caseRow.system_problem_statement
    },domains:classed.domains,risk_level:classed.risk_level,human_gate_required:classed.human_gate_required,sources}

    const language=/[\u0600-\u06ff]/.test(contextText)?'ar':'en'
    const prompt=`You are the ATS Evidence-Backed Task Playbook Engine.

Create a professional execution checklist for ONE real task. Your output will guide a human operator while they execute the work.

LANGUAGE: ${language==='ar'?'Write human-facing fields in clear professional Arabic, keeping technical terms in English when useful.':'English.'}

NON-NEGOTIABLE RULES:
1. Use ONLY the facts in TASK SNAPSHOT and the supplied ATS KNOWLEDGE SOURCES. Never invent a client fact, law, standard, clause, metric or source.
2. Source references must use only source_key values provided in ATS KNOWLEDGE SOURCES.
3. The checklist must be executable: each item says exactly what to do, how to test it, what counts as pass, what evidence to record, and severity if it fails.
4. Prefer observed evidence and reproducible tests over opinion.
5. Do not claim certification, legal compliance, accessibility conformance, security assurance, or safety adequacy from this checklist alone.
6. For HSE or software_security, human_gate_required MUST remain true. AI may assist investigation and evidence capture but cannot make the final high-risk client decision.
7. For HSE, prioritize site-specific hazard assessment and the hierarchy of controls; local law, site rules, manufacturer requirements and competent-person judgement may add stricter requirements.
8. For product/UX, trace the end-to-end user journey including failure/recovery paths, data handoffs, accessibility and performance when relevant.
9. Keep the checklist lean: 7-15 checks. Do not add a check merely to mention a source.
10. Every required check must map to at least one source_key OR be clearly task-specific evidence verification derived directly from the snapshot.
11. Completion must result in a defensible summary: Pass / Issue / N/A counts, material findings, evidence, and next action.
12. If the task contains payment or production-impacting actions, use safe test/sandbox paths where possible; never instruct an operator to make an unnecessary real charge or destructive change.

TASK SNAPSHOT:
${JSON.stringify(snapshot)}`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        domain:{type:'string'},
        risk_level:{type:'string',enum:['low','medium','high','critical']},
        human_gate_required:{type:'boolean'},
        method_name:{type:'string'},
        objective:{type:'string'},
        checklist:{type:'array',minItems:5,maxItems:15,items:{type:'object',additionalProperties:false,properties:{
          id:{type:'string'},section:{type:'string'},action:{type:'string'},how_to_test:{type:'string'},
          pass_criteria:{type:'string'},evidence_type:{type:'array',items:{type:'string'}},
          required:{type:'boolean'},allows_na:{type:'boolean'},
          severity_if_failed:{type:'string',enum:['low','medium','high','critical']},
          source_keys:{type:'array',items:{type:'string'}}
        },required:['id','section','action','how_to_test','pass_criteria','evidence_type','required','allows_na','severity_if_failed','source_keys']}},
        required_evidence:{type:'array',maxItems:10,items:{type:'object',additionalProperties:false,properties:{
          type:{type:'string'},description:{type:'string'},required:{type:'boolean'}
        },required:['type','description','required']}},
        completion_rule:{type:'string'},
        generation_notes:{type:'string'}
      },
      required:['domain','risk_level','human_gate_required','method_name','objective','checklist','required_evidence','completion_rule','generation_notes']
    }

    let playbook:any=null,usedModel='',lastError=''
    const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_AI_API_KEY')
    if(apiKey){
      const configured=clean(Deno.env.get('GEMINI_MODEL')||'',120)
      const models=[...new Set([...(configured?[configured]:[]),'gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash'])]
      const safeSchema=sanitizeSchema(schema)
      for(const model of models){
        try{
          const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
            method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
            body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:'application/json',responseSchema:safeSchema}})
          })
          const body=await res.json().catch(()=>null)
          if(!res.ok){lastError=clean(body?.error?.message||body?.message||'AI provider error',280);continue}
          const text=(body?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
          if(!text){lastError='No model output';continue}
          playbook=parseJson(text);usedModel=model;break
        }catch(e){lastError=clean((e as any)?.message||e,280)}
      }
    }

    if(!playbook){
      playbook=fallback(task,classed.domains,sources,classed.risk_level,classed.human_gate_required)
      usedModel='deterministic-fallback'
      playbook.generation_notes=(playbook.generation_notes||'')+(lastError?' Provider note: '+lastError:'')
    }

    const validKeys=new Set(sources.map((s:any)=>s.source_key))
    const checks=(Array.isArray(playbook.checklist)?playbook.checklist:[]).slice(0,15).map((x:any,i:number)=>({
      id:'C'+(i+1),
      section:clean(x.section,120)||'Check',
      action:clean(x.action,1200)||clean(x.how_to_test,1200)||'Perform the check.',
      how_to_test:clean(x.how_to_test,1800)||clean(x.action,1200),
      pass_criteria:clean(x.pass_criteria,1800)||'Expected behavior is observed and documented.',
      evidence_type:Array.isArray(x.evidence_type)?x.evidence_type.map((v:any)=>clean(v,80)).filter(Boolean).slice(0,5):['note'],
      required:x.required!==false,
      allows_na:!!x.allows_na,
      severity_if_failed:['low','medium','high','critical'].includes(String(x.severity_if_failed))?x.severity_if_failed:'medium',
      source_keys:Array.isArray(x.source_keys)?x.source_keys.map(String).filter((k:string)=>validKeys.has(k)):sourceRefs.slice(0,2).map((s:any)=>s.source_key)
    }))
    if(checks.length<5){
      const fb=fallback(task,classed.domains,sources,classed.risk_level,classed.human_gate_required)
      playbook={...playbook,...fb,checklist:fb.checklist,required_evidence:fb.required_evidence,completion_rule:fb.completion_rule}
    }else playbook.checklist=checks

    playbook.risk_level=classed.human_gate_required
      ?(['high','critical'].includes(String(playbook.risk_level))?playbook.risk_level:'high')
      :(['low','medium','high','critical'].includes(String(playbook.risk_level))?playbook.risk_level:classed.risk_level)
    playbook.human_gate_required=classed.human_gate_required||!!playbook.human_gate_required
    playbook.domain=clean(playbook.domain,120)||classed.domains[0]||'risk_management'
    playbook.method_name=clean(playbook.method_name,300)||'Evidence-backed task verification'
    playbook.objective=clean(playbook.objective,2200)||clean(task.rationale||task.title,2200)
    playbook.required_evidence=Array.isArray(playbook.required_evidence)?playbook.required_evidence.slice(0,10):[]
    playbook.completion_rule=clean(playbook.completion_rule,2200)||'Resolve all required checks and document all issues before completion.'
    playbook.generation_notes=clean(playbook.generation_notes,3000)
    const status=playbook.human_gate_required?'review_required':'ready'

    const payload={
      task_id:taskId,domain:playbook.domain,risk_level:playbook.risk_level,
      human_gate_required:playbook.human_gate_required,method_name:playbook.method_name,objective:playbook.objective,
      checklist:playbook.checklist,required_evidence:playbook.required_evidence,source_refs:sourceRefs,
      completion_rule:playbook.completion_rule,generation_notes:playbook.generation_notes,model:usedModel,status,
      progress:[],updated_at:new Date().toISOString(),generated_at:new Date().toISOString()
    }
    const {data:saved,error:saveError}=await admin.from('studio_task_playbooks').upsert(payload,{onConflict:'task_id'}).select('*').single()
    if(saveError||!saved)return json({error:'Could not save task playbook'},500)

    await admin.from('studio_activity').insert({
      actor_type:'system',entity_type:'lead',entity_id:lead.id,action:'task_playbook_generated',
      metadata:{task_id:taskId,playbook_id:saved.id,domain:saved.domain,risk_level:saved.risk_level,human_gate_required:saved.human_gate_required,model:usedModel,source_keys:sourceRefs.map((x:any)=>x.source_key)}
    })
    return json({ok:true,cached:false,playbook:saved})
  }catch(e){
    return json({error:clean((e as any)?.message||e,500)||'Task playbook generation failed'},500)
  }
})
