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

    let leadId=clean(body?.lead_id,80)
    let triggerSource=isTrustedAdmin?'admin':'client_answer'

    if(!isTrustedAdmin){
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

    const [answersRes,causesRes,tasksRes,activityRes]=await Promise.all([
      admin.from('studio_discovery_answers').select('question_key,answer,actor_type,source_channel,created_at').eq('case_id',caseRow.id).order('created_at',{ascending:true}).limit(300),
      admin.from('studio_root_causes').select('id,category,statement,evidence_for,evidence_against,confidence,status,source_type,causal_level,validation_method,created_at').eq('case_id',caseRow.id).order('created_at',{ascending:true}),
      admin.from('studio_solution_tasks').select('id,root_cause_id,task_type,title,rationale,owner_type,priority,status,acceptance_criteria,expected_effect,dependency_note,created_at').eq('case_id',caseRow.id).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      admin.from('studio_activity').select('actor_type,action,metadata,created_at').eq('entity_type','lead').eq('entity_id',leadId).order('created_at',{ascending:false}).limit(80)
    ])
    const failed=[answersRes,causesRes,tasksRes,activityRes].find(x=>x.error)
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
      existing_causes:(causesRes.data||[]).filter((x:any)=>x.source_type!=='ai'||x.status!=='suspected'),
      existing_tasks:(tasksRes.data||[]).filter((x:any)=>x.source_type!=='ai'||x.status!=='proposed'),
      recent_activity:(activityRes.data||[]).map((x:any)=>({action:x.action,metadata:x.metadata,created_at:x.created_at}))
    }
    const inputHash=await sha256hex(JSON.stringify(snapshot))

    const {data:cached}=await admin.from('studio_diagnostic_runs')
      .select('id,analysis,model,completed_at').eq('case_id',caseRow.id).eq('input_hash',inputHash).eq('status','completed')
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
4. If evidence is insufficient, say so and prioritize investigation rather than proposing implementation.
5. Every recommended task must either reduce uncertainty, address a specific suspected/validated cause, implement a supported solution, or verify effectiveness.
6. Prefer the smallest next action that increases decision quality.
7. A solution is not complete without measurable acceptance/verification criteria.
8. The client's requested output may be a symptom-treatment. Reframe it when evidence points to a deeper need.
9. Consider safety, operational, human, technical, commercial, content and experience causes only when supported by the case.
10. Be concise and operational. ATS must be able to act on the output.

DECISION STAGES:
- needs_evidence: key facts are missing; investigate first.
- needs_validation: enough facts exist to test causal hypotheses.
- solution_ready: at least one causal path is sufficiently supported to define a solution plan, but ATS still validates causes manually.
- execution: use only when there is already a validated cause and approved work underway.

Return:
- a clear problem framing,
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
        next_best_question:{type:'object',additionalProperties:false,properties:{
          question:{type:'string'},reason:{type:'string'},decision_value:{type:'string'}
        },required:['question','reason','decision_value']},
        root_causes:{type:'array',maxItems:5,items:{type:'object',additionalProperties:false,properties:{
          category:{type:'string',enum:['strategy','process','people','technology','content','experience','environment','hse','commercial','other']},
          causal_level:{type:'string',enum:['symptom','contributing','root']},
          statement:{type:'string'},evidence_for:{type:'string'},evidence_against:{type:'string'},
          confidence:{type:'integer',minimum:0,maximum:100},validation_method:{type:'string'}
        },required:['category','causal_level','statement','evidence_for','evidence_against','confidence','validation_method']}},
        recommended_tasks:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,properties:{
          root_cause_index:{type:'integer',minimum:-1,maximum:4},
          task_type:{type:'string',enum:['investigate','solution','implementation','verification','client_action']},
          title:{type:'string'},rationale:{type:'string'},owner_type:{type:'string',enum:['ats','client','shared']},
          priority:{type:'string',enum:['critical','high','medium','low']},expected_effect:{type:'string'},
          dependency_note:{type:'string'},acceptance_criteria:{type:'string'}
        },required:['root_cause_index','task_type','title','rationale','owner_type','priority','expected_effect','dependency_note','acceptance_criteria']}},
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
      required:['decision_stage','problem_framing','evidence_assessment','next_best_question','root_causes','recommended_tasks','solution_direction','verification_plan','executive_summary','next_best_action']
    }

    const models=[Deno.env.get('GEMINI_MODEL')||'gemini-2.5-flash','gemini-2.5-flash']
    let analysis:any=null,usedModel='',lastError=''
    for(const model of [...new Set(models)]){
      try{
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
          body:JSON.stringify({
            contents:[{role:'user',parts:[{text:prompt}]}],
            generationConfig:{temperature:0.15,responseMimeType:'application/json',responseSchema:schema}
          })
        })
        const body=await response.json().catch(()=>null)
        if(!response.ok){lastError=safeUpstreamMessage(body);continue}
        const text=(body?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
        if(!text){lastError='No model output';continue}
        analysis=parseTextAsJson(text);usedModel=model;break
      }catch(error){lastError=clean((error as any)?.message||error,280)}
    }

    if(!analysis){
      await admin.from('studio_diagnostic_runs').update({status:'failed',error_text:lastError||'AI analysis failed',completed_at:new Date().toISOString()}).eq('id',run.id)
      await admin.from('studio_discovery_cases').update({analysis_state:'error'}).eq('id',caseRow.id)
      return json({error:'Diagnostic analysis failed',detail:lastError},502)
    }

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
        expected_effect:clean(t.expected_effect,5000)||null,dependency_note:clean(t.dependency_note,3000)||null,
        source_type:'ai',diagnostic_run_id:run.id,sort_order:(i+1)*10
      })
    }

    const completedAt=new Date().toISOString()
    await admin.from('studio_diagnostic_runs').update({
      status:'completed',model:usedModel,analysis,completed_at:completedAt
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

    return json({ok:true,cached:false,run_id:run.id,analysis,model:usedModel,root_causes:insertedCauses.length,tasks:tasks.length})
  }catch(error){
    console.error('ATS diagnostic engine failed',{message:(error as any)?.message})
    return json({error:'ATS diagnostic engine failed',detail:clean((error as any)?.message||error,280)},500)
  }
})