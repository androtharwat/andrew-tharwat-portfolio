import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-portfolio-device-id, x-portfolio-device-secret',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,max=12000)=>String(v??'').trim().slice(0,max)
const allowedCategory=new Set(['strategy','process','people','technology','content','experience','environment','hse','commercial','other'])
const allowedLevel=new Set(['symptom','contributing','root'])
const allowedTaskType=new Set(['investigate','solution','implementation','verification','client_action'])
const allowedOwner=new Set(['ats','client','shared'])
const allowedPriority=new Set(['critical','high','medium','low'])
const allowedStage=new Set(['needs_evidence','needs_validation','solution_ready','execution'])

async function sha256hex(value:string){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')
}
function parseTextAsJson(text:string){
  return JSON.parse(text.trim().replace(/^\`\`\`json\s*/i,'').replace(/\`\`\`$/,'').trim())
}
function safeUpstreamMessage(body:any){
  return clean(body?.error?.message||body?.message||body?.error||'Unknown Gemini API error',280)
}
function sanitizeGeminiSchema(value:any):any{
  if(Array.isArray(value))return value.map(sanitizeGeminiSchema)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){
    if(k==='additionalProperties')continue
    out[k]=sanitizeGeminiSchema(v)
  }
  return out
}
function buildDeterministicAnalysis(snapshot:any){
  const d=snapshot?.discovery||{}
  const ar=/[\u0600-\u06ff]/.test(JSON.stringify(snapshot))
  const dimensions=[
    ['current_state',ar?'إيه اللي بيحصل دلوقتي ومفروض مايحصلش؟':'What is happening now that should not be happening?','current situation'],
    ['impact',ar?'إيه التأثير الحقيقي للمشكلة؟':'What is the real impact of this problem?','impact'],
    ['evidence',ar?'إيه الدليل أو المثال الحقيقي اللي بيثبت المشكلة؟':'What evidence or real example proves the problem?','evidence'],
    ['affected_people',ar?'مين أكتر ناس متأثرين بالمشكلة؟':'Who is most affected by the problem?','people affected'],
    ['process_point',ar?'المشكلة بتظهر فين بالظبط داخل العملية؟':'Where exactly does the problem appear in the process?','failure point'],
    ['prior_attempts',ar?'إيه اللي اتجرب قبل كده وإيه اللي حصل؟':'What has already been tried, and what happened?','previous attempts'],
    ['desired_outcome',ar?'لو المشكلة اتحلت صح، إيه اللي لازم يتغير؟':'If solved correctly, what should be different?','desired outcome'],
    ['constraints',ar?'إيه القيود اللي لازم الحل يلتزم بيها؟':'What constraints must the solution respect?','constraints']
  ]
  const facts:string[]=[]
  const missing:any[]=[]
  const ledger:any[]=[]
  const answers=Array.isArray(snapshot?.answers)?snapshot.answers:[]
  let refNo=1
  for(const [key,q,label] of dimensions){
    const value=clean(d?.[key],4000)
    const latest=[...answers].reverse().find((x:any)=>x?.question_key===key)
    const ref='E'+refNo++
    if(value){
      const actor=String(latest?.actor_type||'system')
      const sourceChannel=String(latest?.source_channel||'intake')
      const classification=actor==='admin'?'admin_observation':'client_statement'
      const strength=sourceChannel==='portal'||sourceChannel==='call'||sourceChannel==='whatsapp'||sourceChannel==='email'?'medium':'weak'
      facts.push((ar?label+': ':label+': ')+value)
      ledger.push({
        ref_id:ref,classification,
        source:sourceChannel==='portal'?'client_discovery':sourceChannel==='call'||sourceChannel==='whatsapp'||sourceChannel==='email'?'admin_contact':'intake',
        strength,statement:value,
        why_it_matters:ar?'المعلومة دي تدخل مباشرة في فهم المشكلة واتجاه التشخيص.':'This input directly shapes the problem framing and diagnostic direction.',
        verification_needed:classification==='client_statement'?(ar?'تحتاج تأكيد أو دليل إذا كانت مؤثرة على قرار الحل.':'Confirm with evidence if it materially affects the solution decision.'):''
      })
    }else{
      missing.push({key,question:q,label,ref})
      ledger.push({
        ref_id:ref,classification:'gap',source:'system_inference',strength:'unknown',
        statement:ar?'المعلومة الناقصة: '+label:'Missing information: '+label,
        why_it_matters:ar?'نقصها يقلل دقة التشخيص وقد يؤدي لاختيار حل مبكر.':'Its absence lowers diagnostic confidence and may cause premature solution selection.',
        verification_needed:q
      })
    }
  }
  const files=Array.isArray(snapshot?.files)?snapshot.files:[]
  for(const f of files.slice(0,12)){
    if(f?.analysis_status!=='ready')continue
    const a=f?.analysis_json||{}
    const strength=['strong','medium','weak'].includes(String(a.evidence_strength))?String(a.evidence_strength):'medium'
    const baseRef='E'+refNo++
    const summary=clean(f?.analysis_summary||a?.summary,3500)
    if(summary){
      ledger.push({
        ref_id:baseRef,classification:'document_evidence',source:'document',strength,
        statement:(ar?'ملف ':'File ')+String(f.file_name||'')+': '+summary,
        why_it_matters:ar?'محتوى الملف تم تحليله ويضيف دليلًا مباشرًا لفهم المشروع.':'The uploaded file was analyzed and contributes direct project evidence.',
        verification_needed:ar?'راجع المصدر الأصلي إذا كانت المعلومة حاسمة للقرار.':'Review the source file if this evidence is decision-critical.'
      })
      facts.push((ar?'ملف ':'File ')+String(f.file_name||'')+': '+summary)
    }
    const observations=Array.isArray(a.observations)?a.observations.slice(0,3):[]
    for(const ob of observations){
      const ref='E'+refNo++
      ledger.push({
        ref_id:ref,classification:'document_evidence',source:'document',strength,
        statement:clean(ob?.statement,2200),
        why_it_matters:ar?'معلومة مستخرجة مباشرة من الملف المرفوع.':'Evidence extracted directly from the uploaded file.',
        verification_needed:clean(ob?.location,500)?(ar?'الموقع داخل الملف: ':'File location: ')+clean(ob.location,500):''
      })
    }
    const metrics=Array.isArray(a.metrics)?a.metrics.slice(0,3):[]
    for(const m of metrics){
      const ref='E'+refNo++
      ledger.push({
        ref_id:ref,classification:'verified_fact',source:'metric',strength:'strong',
        statement:[clean(m?.name,500),clean(m?.value,500),clean(m?.context,1200)].filter(Boolean).join(' · '),
        why_it_matters:ar?'قيمة رقمية أو مؤشر صريح داخل الملف.':'An explicit metric or numeric value found in the file.',
        verification_needed:clean(m?.location,500)?(ar?'الموقع داخل الملف: ':'File location: ')+clean(m.location,500):''
      })
    }
  }
  const score=Math.max(0,Math.min(100,Number(d?.readiness_score||0)))
  const first=missing[0]||null
  const current=clean(d?.current_state||snapshot?.lead?.project_goal,3500)
  const desired=clean(d?.desired_outcome,2500)
  const impact=clean(d?.impact,2500)
  const tasks=missing.slice(0,6).map((m:any,i:number)=>({
    root_cause_index:-1,
    evidence_refs:[m.ref],
    task_type:m.key==='constraints'||m.key==='prior_attempts'?'investigate':'client_action',
    title:ar?'استكمال '+m.label:'Collect '+m.label,
    rationale:ar?'المعلومة دي ناقصة، وأي حل قبل جمعها هيبقى مبني على افتراضات.':'This information is missing; choosing a solution before collecting it would rely on assumptions.',
    owner_type:m.key==='evidence'||m.key==='prior_attempts'||m.key==='constraints'?'shared':'client',
    priority:i===0?'high':'medium',
    expected_effect:ar?'تقليل عدم اليقين وتحسين دقة التشخيص.':'Reduce uncertainty and improve diagnostic confidence.',
    dependency_note:i===0?'':(ar?'يفضل بعد استكمال السؤال الأعلى أولوية.':'Prefer after the highest-priority missing item is answered.'),
    acceptance_criteria:ar?'إجابة محددة مدعومة بمثال أو دليل كلما أمكن.':'A specific answer, supported by an example or evidence where possible.'
  }))
  return {
    decision_stage:score>=75?'needs_validation':'needs_evidence',
    problem_framing:{
      symptom_summary:current|| (ar?'المشكلة لم تتحدد بما يكفي بعد.':'The problem is not sufficiently defined yet.'),
      current_state:current||'',
      desired_state:desired||'',
      gap:[current,desired].filter(Boolean).join(ar?' ← ':' -> '),
      impact_summary:impact|| (ar?'التأثير لم يتم توثيقه بعد.':'Impact is not documented yet.'),
      root_problem_candidate:current||'',
      confidence:Math.min(45,Math.round(score*0.45))
    },
    evidence_assessment:{
      facts,
      assumptions:missing.map((m:any)=>ar?'غير مؤكد حتى الآن: '+m.label:'Not confirmed yet: '+m.label),
      contradictions:[],
      evidence_quality:score>=75?'good':score>=50?'partial':'weak'
    },
    evidence_ledger:ledger,
    next_best_question:{
      question:first?.question|| (ar?'ما الدليل الأقوى الذي يثبت السبب المحتمل؟':'What is the strongest evidence that would validate the suspected cause?'),
      reason:ar?'ده أعلى نقص معلوماتي مؤثر على القرار الحالي.':'This is the highest-value information gap affecting the current decision.',
      decision_value:ar?'الإجابة هتحدد هل نكمل جمع أدلة ولا نبدأ اختبار أسباب محتملة.':'The answer determines whether to keep collecting evidence or start validating causal hypotheses.'
    },
    root_causes:[],
    recommended_tasks:tasks,
    solution_direction:{
      strategy:ar?'لا تبدأ تنفيذ حل نهائي بعد. استكمل الأدلة أولًا ثم اختبر الأسباب المحتملة.':'Do not implement a final solution yet. Complete the evidence base, then test causal hypotheses.',
      why_this_direction:ar?'المعطيات الحالية غير كافية لإثبات سبب جذري بشكل مهني.':'The current evidence is insufficient to validate a root cause professionally.',
      risks:[ar?'القفز للحل قد يعالج العرض بدل السبب الحقيقي.':'Jumping to implementation may treat the symptom instead of the real cause.'],
      not_yet_justified:[ar?'أي تنفيذ نهائي قبل استكمال البيانات والتحقق من السبب.':'Final implementation before completing evidence and validating a cause.']
    },
    verification_plan:{
      success_signals:desired?[desired]:[],
      failure_signals:[ar?'استمرار نفس الأثر بعد التنفيذ.':'The same impact continues after implementation.'],
      review_point:ar?'بعد استكمال الأدلة والتحقق من سبب واحد على الأقل.':'After completing evidence collection and validating at least one cause.'
    },
    executive_summary:ar
      ?'البيانات الحالية تسمح بتحديد اتجاه المشكلة، لكنها غير كافية لإثبات السبب الجذري. الأولوية الآن هي استكمال فجوات الأدلة قبل اعتماد حل.'
      :'The current data identifies the problem direction but is not sufficient to validate a root cause. The priority is to close evidence gaps before approving a solution.',
    next_best_action:first
      ?(ar?'اجمع المعلومة التالية: '+first.label:'Collect the next missing input: '+first.label)
      :(ar?'ابدأ التحقق من فرضيات الأسباب المحتملة.':'Begin validating causal hypotheses.')
  }
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
    let isTrustedAdmin=false

    if(deviceId&&deviceSecret){
      const secretHash=await sha256hex(deviceSecret)
      const {data:trusted}=await admin.from('portfolio_trusted_devices').select('status,secret_hash').eq('device_id',deviceId).maybeSingle()
      isTrustedAdmin=!!trusted&&trusted.status==='approved'&&trusted.secret_hash===secretHash
    }

    const uploadGrant=clean(body?.upload_grant,200)
    let grantLeadId=''
    if(uploadGrant){
      const grantHash=await sha256hex(uploadGrant)
      const {data:g}=await admin.from('studio_public_upload_grants')
        .select('lead_id,status,expires_at').eq('token_hash',grantHash).maybeSingle()
      if(g&&g.status==='active'&&new Date(g.expires_at).getTime()>Date.now())grantLeadId=g.lead_id
    }

    let leadId=isTrustedAdmin?clean(body?.lead_id,80):grantLeadId
    let triggerSource=isTrustedAdmin?'admin':grantLeadId?'system':'client_answer'

    if(!isTrustedAdmin&&!grantLeadId){
      const authHeader=req.headers.get('authorization')||''
      const token=authHeader.replace(/^Bearer\s+/i,'').trim()
      if(!token)return json({error:'Authentication required'},401)
      const {data:userData,error:userError}=await admin.auth.getUser(token)
      const email=clean(userData?.user?.email,320).toLowerCase()
      if(userError||!email)return json({error:'Authentication required'},401)
      const {data:lead,error:leadError}=await admin.from('studio_leads').select('id').ilike('email',email).order('created_at',{ascending:false}).limit(1).maybeSingle()
      if(leadError||!lead)return json({error:'No ATS request is linked to this account'},404)
      leadId=lead.id
    }

    if(!leadId)return json({error:'Lead is required'},400)

    const {data:lead,error:leadError}=await admin.from('studio_leads').select('id,lead_code,full_name,email,company_name,service,project_goal,timeline,budget_range,current_assets,status,fit,fit_reason,ats_understanding,missing_information,internal_notes,created_at').eq('id',leadId).maybeSingle()
    if(leadError||!lead)return json({error:'Lead not found'},404)

    const {data:caseRow,error:caseError}=await admin.from('studio_discovery_cases').select('*').eq('lead_id',leadId).maybeSingle()
    if(caseError||!caseRow)return json({error:'Discovery case not found'},404)

    const [answersRes,causesRes,tasksRes,activityRes,filesRes]=await Promise.all([
      admin.from('studio_discovery_answers').select('question_key,answer,actor_type,source_channel,created_at').eq('case_id',caseRow.id).order('created_at',{ascending:true}).limit(300),
      admin.from('studio_root_causes').select('id,category,statement,evidence_for,evidence_against,confidence,status,source_type,causal_level,validation_method,evidence_refs,missing_evidence_refs,created_at').eq('case_id',caseRow.id).order('created_at',{ascending:true}),
      admin.from('studio_solution_tasks').select('id,root_cause_id,task_type,title,rationale,owner_type,priority,status,acceptance_criteria,expected_effect,dependency_note,evidence_refs,created_at').eq('case_id',caseRow.id).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      admin.from('studio_activity').select('actor_type,action,metadata,created_at').eq('entity_type','lead').eq('entity_id',leadId).order('created_at',{ascending:false}).limit(80),
      admin.from('studio_files').select('id,file_name,mime_type,file_size,analysis_status,analysis_summary,analysis_json,analysis_model,analyzed_at,created_at').eq('lead_id',leadId).eq('category','client_upload').order('created_at',{ascending:true}).limit(50)
    ])
    const failed=[answersRes,causesRes,tasksRes,activityRes,filesRes].find(x=>x.error)
    if(failed)return json({error:'Could not load diagnosis evidence'},500)

    const caseFields={
      current_state:caseRow.current_state,impact:caseRow.impact,affected_people:caseRow.affected_people,
      desired_outcome:caseRow.desired_outcome,evidence:caseRow.evidence,prior_attempts:caseRow.prior_attempts,
      process_point:caseRow.process_point,constraints:caseRow.constraints,readiness_score:caseRow.readiness_score
    }
    const snapshot={
      lead:{
        lead_code:lead.lead_code,service:lead.service,project_goal:lead.project_goal,timeline:lead.timeline,
        budget_range:lead.budget_range,current_assets:lead.current_assets,status:lead.status,fit:lead.fit,
        fit_reason:lead.fit_reason,ats_understanding:lead.ats_understanding,missing_information:lead.missing_information
      },
      discovery:caseFields,
      answers:answersRes.data||[],
      files:(filesRes.data||[]).map((f:any)=>({
        id:f.id,file_name:f.file_name,mime_type:f.mime_type,file_size:f.file_size,
        analysis_status:f.analysis_status,analysis_summary:f.analysis_summary,
        analysis_json:f.analysis_json,analysis_model:f.analysis_model,analyzed_at:f.analyzed_at,created_at:f.created_at
      })),
      existing_causes:(causesRes.data||[]).filter((x:any)=>x.source_type!=='ai'||x.status!=='suspected'),
      existing_tasks:(tasksRes.data||[]).filter((x:any)=>x.source_type!=='ai'||x.status!=='proposed'),
      recent_activity:(activityRes.data||[]).map((x:any)=>({action:x.action,metadata:x.metadata,created_at:x.created_at}))
    }
    const inputHash=await sha256hex(JSON.stringify(snapshot))

    const {data:cached}=await admin.from('studio_diagnostic_runs')
      .select('id,analysis,model,completed_at').eq('case_id',caseRow.id).eq('input_hash',inputHash).eq('status','completed').neq('model','deterministic-fallback')
      .order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(cached?.analysis){
      await admin.from('studio_discovery_cases').update({
        analysis_state:'ready',last_diagnostic_run_id:cached.id,last_analyzed_at:cached.completed_at
      }).eq('id',caseRow.id)
      return json({ok:true,cached:true,run_id:cached.id,analysis:cached.analysis,model:cached.model})
    }

    await admin.from('studio_discovery_cases').update({analysis_state:'analyzing'}).eq('id',caseRow.id)
    const {data:run,error:runError}=await admin.from('studio_diagnostic_runs').insert({
      case_id:caseRow.id,trigger_source:triggerSource,status:'running',input_hash:inputHash,input_snapshot:snapshot
    }).select('id').single()
    if(runError||!run)return json({error:'Could not start diagnostic run'},500)

    const language=/[\u0600-\u06ff]/.test(JSON.stringify(snapshot))?'ar':'en'
    const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_AI_API_KEY')
    if(!apiKey){
      await admin.from('studio_diagnostic_runs').update({status:'failed',error_text:'AI key missing',completed_at:new Date().toISOString()}).eq('id',run.id)
      await admin.from('studio_discovery_cases').update({analysis_state:'error'}).eq('id',caseRow.id)
      return json({error:'Diagnostic AI is not configured'},503)
    }

    const prompt=`You are the ATS Diagnostic Decision Engine for a multidisciplinary problem-solving studio.

Your job is NOT to simply fulfill the client's requested deliverable. Your job is to identify the real problem, distinguish facts from assumptions, build testable causal hypotheses, and derive the next work required to reach a realistic solution.

CASE LANGUAGE: ${language==='ar'?'Arabic. Write all human-facing analysis in clear professional Arabic, keeping technical terms in English when useful.':'English.'}

NON-NEGOTIABLE RULES:
1. Separate symptoms, contributing factors, and root-cause hypotheses.
2. Never label an AI hypothesis as validated. Every generated cause is only suspected until ATS validates it with evidence.
3. Never invent data, metrics, client facts, causes, constraints, or outcomes.
4. Uploaded file analysis in SNAPSHOT.files is evidence extracted from client-provided documents. Use it before asking the client to repeat information already present in those files. Treat document evidence as source-grounded but not automatically independently verified.
5. If evidence is insufficient, say so and prioritize investigation rather than proposing implementation.
6. Every recommended task must either reduce uncertainty, address a specific suspected/validated cause, implement a supported solution, or verify effectiveness.
7. Every causal hypothesis and task must cite the relevant evidence ledger refs (E1, E2...). Never invent a ref.
8. Prefer the smallest next action that increases decision quality.
9. A solution is not complete without measurable acceptance/verification criteria.
10. The client's requested output may be a symptom-treatment. Reframe it when evidence points to a deeper need.
11. Consider safety, operational, human, technical, commercial, content and experience causes only when supported by the case.
12. Be concise and operational. ATS must be able to act on the output.

DECISION STAGES:
- needs_evidence: key facts are missing; investigate first.
- needs_validation: enough facts exist to test causal hypotheses.
- solution_ready: at least one causal path is sufficiently supported to define a solution plan, but ATS still validates causes manually.
- execution: use only when there is already a validated cause and approved work underway.

Return:
- a clear problem framing,
- an evidence ledger with stable refs E1, E2, E3...; each item must show classification, source, strength, why it matters and whether verification is needed,
- facts / assumptions / contradictions,
- the single highest-value next question,
- 1-5 causal hypotheses,
- an ordered sequence of proposed tasks,
- a realistic solution direction,
- a verification plan.

CURRENT CASE SNAPSHOT:
${JSON.stringify(snapshot)}`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        decision_stage:{type:'string',enum:['needs_evidence','needs_validation','solution_ready','execution']},
        problem_framing:{type:'object',additionalProperties:false,properties:{
          symptom_summary:{type:'string'},current_state:{type:'string'},desired_state:{type:'string'},gap:{type:'string'},
          impact_summary:{type:'string'},root_problem_candidate:{type:'string'},confidence:{type:'integer',minimum:0,maximum:100}
        },required:['symptom_summary','current_state','desired_state','gap','impact_summary','root_problem_candidate','confidence']},
        evidence_assessment:{type:'object',additionalProperties:false,properties:{
          facts:{type:'array',items:{type:'string'}},assumptions:{type:'array',items:{type:'string'}},contradictions:{type:'array',items:{type:'string'}},
          evidence_quality:{type:'string',enum:['weak','partial','good','strong']}
        },required:['facts','assumptions','contradictions','evidence_quality']},
        evidence_ledger:{type:'array',maxItems:20,items:{type:'object',additionalProperties:false,properties:{
          ref_id:{type:'string'},
          classification:{type:'string',enum:['verified_fact','document_evidence','client_statement','admin_observation','assumption','gap','contradiction']},
          source:{type:'string',enum:['intake','client_discovery','admin_contact','document','metric','system_inference','unknown']},
          strength:{type:'string',enum:['strong','medium','weak','unknown']},
          statement:{type:'string'},why_it_matters:{type:'string'},verification_needed:{type:'string'}
        },required:['ref_id','classification','source','strength','statement','why_it_matters','verification_needed']}},
        next_best_question:{type:'object',additionalProperties:false,properties:{
          question:{type:'string'},reason:{type:'string'},decision_value:{type:'string'}
        },required:['question','reason','decision_value']},
        root_causes:{type:'array',maxItems:5,items:{type:'object',additionalProperties:false,properties:{
          category:{type:'string',enum:['strategy','process','people','technology','content','experience','environment','hse','commercial','other']},
          causal_level:{type:'string',enum:['symptom','contributing','root']},
          statement:{type:'string'},evidence_for:{type:'string'},evidence_against:{type:'string'},
          evidence_refs:{type:'array',items:{type:'string'}},missing_evidence_refs:{type:'array',items:{type:'string'}},
          confidence:{type:'integer',minimum:0,maximum:100},validation_method:{type:'string'}
        },required:['category','causal_level','statement','evidence_for','evidence_against','evidence_refs','missing_evidence_refs','confidence','validation_method']}},
        recommended_tasks:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,properties:{
          root_cause_index:{type:'integer',minimum:-1,maximum:4},
          task_type:{type:'string',enum:['investigate','solution','implementation','verification','client_action']},
          title:{type:'string'},rationale:{type:'string'},owner_type:{type:'string',enum:['ats','client','shared']},
          priority:{type:'string',enum:['critical','high','medium','low']},expected_effect:{type:'string'},
          dependency_note:{type:'string'},acceptance_criteria:{type:'string'},evidence_refs:{type:'array',items:{type:'string'}}
        },required:['root_cause_index','task_type','title','rationale','owner_type','priority','expected_effect','dependency_note','acceptance_criteria','evidence_refs']}},
        solution_direction:{type:'object',additionalProperties:false,properties:{
          strategy:{type:'string'},why_this_direction:{type:'string'},risks:{type:'array',items:{type:'string'}},
          not_yet_justified:{type:'array',items:{type:'string'}}
        },required:['strategy','why_this_direction','risks','not_yet_justified']},
        verification_plan:{type:'object',additionalProperties:false,properties:{
          success_signals:{type:'array',items:{type:'string'}},failure_signals:{type:'array',items:{type:'string'}},
          review_point:{type:'string'}
        },required:['success_signals','failure_signals','review_point']},
        executive_summary:{type:'string'},
        next_best_action:{type:'string'}
      },
      required:['decision_stage','problem_framing','evidence_assessment','evidence_ledger','next_best_question','root_causes','recommended_tasks','solution_direction','verification_plan','executive_summary','next_best_action']
    }

    const configuredModel=clean(Deno.env.get('GEMINI_MODEL')||'',120)
    const stableFallbacks=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash','gemini-3.5-flash-lite']
    const models=[...new Set([
      ...(configuredModel&&!configuredModel.includes('2.5')?[configuredModel]:[]),
      ...stableFallbacks
    ])]
    let analysis:any=null,usedModel='',lastError=''
    const attempts:any[]=[]
    const safeSchema=sanitizeGeminiSchema(schema)
    for(const model of models){
      const configs=[
        {mode:'schema',value:{temperature:0.15,responseMimeType:'application/json',responseSchema:safeSchema}},
        {mode:'json',value:{temperature:0.15,responseMimeType:'application/json'}}
      ]
      let skipModel=false
      for(const config of configs){
        try{
          const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
            method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
            body:JSON.stringify({
              contents:[{role:'user',parts:[{text:prompt}]}],
              generationConfig:config.value
            })
          })
          const body=await response.json().catch(()=>null)
          if(!response.ok){
            const message=safeUpstreamMessage(body)
            lastError=message
            attempts.push({model,mode:config.mode,status:response.status,error:message})
            const transient=response.status===429||response.status>=500||/high demand|temporar|overload|unavailable/i.test(message)
            const modelUnavailable=response.status===404||/model .*not .*available|not found|no longer available/i.test(message)
            if(transient||modelUnavailable){skipModel=true;break}
            continue
          }
          const text=(body?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
          if(!text){lastError='No model output';attempts.push({model,mode:config.mode,status:200,error:lastError});continue}
          try{
            analysis=parseTextAsJson(text);usedModel=model;attempts.push({model,mode:config.mode,status:200,ok:true});break
          }catch(parseError){
            lastError='Model returned invalid diagnostic JSON'
            attempts.push({model,mode:config.mode,status:200,error:lastError})
            continue
          }
        }catch(error){
          lastError=clean((error as any)?.message||error,280)
          attempts.push({model,mode:config.mode,status:0,error:lastError})
          skipModel=true
          break
        }
      }
      if(analysis)break
      if(skipModel)continue
    }

    let fallbackUsed=false
    if(!analysis){
      analysis=buildDeterministicAnalysis(snapshot)
      usedModel='deterministic-fallback'
      fallbackUsed=true
      lastError=(lastError||'AI provider unavailable')+' | attempts: '+attempts.map((x:any)=>x.model+':'+x.status).join(', ')
    }

    const ledger=Array.isArray(analysis.evidence_ledger)?analysis.evidence_ledger.slice(0,20):[]
    const validEvidenceRefs=new Set<string>()
    ledger.forEach((item:any,i:number)=>{
      const ref='E'+(i+1)
      item.ref_id=ref
      validEvidenceRefs.add(ref)
    })
    analysis.evidence_ledger=ledger
    const keepRefs=(refs:any)=>Array.isArray(refs)?refs.map((x:any)=>String(x)).filter((x:string)=>validEvidenceRefs.has(x)):[]
    const stage=allowedStage.has(analysis.decision_stage)?analysis.decision_stage:'needs_evidence'
    const confidence=Math.max(0,Math.min(100,Number(analysis?.problem_framing?.confidence||0)))
    const rootCandidate=clean(analysis?.problem_framing?.root_problem_candidate,5000)
    const executive=clean(analysis?.executive_summary,8000)
    const nextAction=clean(analysis?.next_best_action,3000)
    const nextQuestion=analysis?.next_best_question||null

    // Replace only unvalidated AI suggestions from earlier runs. Human decisions remain untouched.
    const {data:oldAiCauses}=await admin.from('studio_root_causes').select('id').eq('case_id',caseRow.id).eq('source_type','ai').eq('status','suspected')
    const oldIds=(oldAiCauses||[]).map((x:any)=>x.id)
    if(oldIds.length){
      await admin.from('studio_solution_tasks').delete().eq('case_id',caseRow.id).eq('source_type','ai').eq('status','proposed').in('root_cause_id',oldIds)
      await admin.from('studio_root_causes').delete().in('id',oldIds)
    }
    await admin.from('studio_solution_tasks').delete().eq('case_id',caseRow.id).eq('source_type','ai').eq('status','proposed').is('root_cause_id',null)

    const insertedCauses:any[]=[]
    const causeIdsByIndex:(string|null)[]=[]
    const causes=Array.isArray(analysis.root_causes)?analysis.root_causes.slice(0,5):[]
    for(let i=0;i<causes.length;i++){
      const c=causes[i]||{}
      const payload={
        case_id:caseRow.id,category:allowedCategory.has(c.category)?c.category:'other',
        statement:clean(c.statement,3000)||'Unspecified causal hypothesis',
        evidence_for:clean(c.evidence_for,5000)||null,evidence_against:clean(c.evidence_against,5000)||null,
        evidence_refs:keepRefs(c.evidence_refs),missing_evidence_refs:keepRefs(c.missing_evidence_refs),
        confidence:Math.max(0,Math.min(100,Number(c.confidence||0))),status:'suspected',source_type:'ai',
        diagnostic_run_id:run.id,causal_level:allowedLevel.has(c.causal_level)?c.causal_level:'contributing',
        validation_method:clean(c.validation_method,4000)||null,system_rank:i+1
      }
      const {data:inserted,error}=await admin.from('studio_root_causes').insert(payload).select('*').single()
      if(!error&&inserted){insertedCauses.push(inserted);causeIdsByIndex[i]=inserted.id}else causeIdsByIndex[i]=null
    }

    const tasks=Array.isArray(analysis.recommended_tasks)?analysis.recommended_tasks.slice(0,12):[]
    for(let i=0;i<tasks.length;i++){
      const t=tasks[i]||{},idx=Number(t.root_cause_index)
      const causeId=Number.isInteger(idx)&&idx>=0&&idx<causeIdsByIndex.length?causeIdsByIndex[idx]:null
      await admin.from('studio_solution_tasks').insert({
        case_id:caseRow.id,root_cause_id:causeId,
        task_type:allowedTaskType.has(t.task_type)?t.task_type:'investigate',
        title:clean(t.title,500)||'Diagnostic task',rationale:clean(t.rationale,5000)||null,
        owner_type:allowedOwner.has(t.owner_type)?t.owner_type:'ats',
        priority:allowedPriority.has(t.priority)?t.priority:'medium',
        status:'proposed',acceptance_criteria:clean(t.acceptance_criteria,5000)||null,
        evidence_refs:keepRefs(t.evidence_refs),
        expected_effect:clean(t.expected_effect,5000)||null,dependency_note:clean(t.dependency_note,3000)||null,
        source_type:'ai',diagnostic_run_id:run.id,sort_order:(i+1)*10
      })
    }

    const completedAt=new Date().toISOString()
    await admin.from('studio_diagnostic_runs').update({
      status:'completed',model:usedModel,analysis,error_text:fallbackUsed?lastError:null,completed_at:completedAt
    }).eq('id',run.id)
    await admin.from('studio_discovery_cases').update({
      analysis_state:'ready',decision_stage:stage,system_problem_statement:rootCandidate||null,
      system_diagnosis_summary:executive||null,system_confidence:confidence,system_next_action:nextAction||null,
      system_next_question:nextQuestion,last_analyzed_at:completedAt,last_diagnostic_run_id:run.id
    }).eq('id',caseRow.id)

    await admin.from('studio_activity').insert({
      actor_type:'system',entity_type:'lead',entity_id:leadId,action:'diagnostic_engine_completed',
      metadata:{run_id:run.id,decision_stage:stage,system_confidence:confidence,root_causes:insertedCauses.length,tasks:tasks.length}
    })

    return json({ok:true,cached:false,fallback:fallbackUsed,run_id:run.id,analysis,model:usedModel,root_causes:insertedCauses.length,tasks:tasks.length})
  }catch(error){
    console.error('ATS diagnostic engine failed',{message:(error as any)?.message})
    return json({error:'ATS diagnostic engine failed',detail:clean((error as any)?.message||error,280)},500)
  }
})