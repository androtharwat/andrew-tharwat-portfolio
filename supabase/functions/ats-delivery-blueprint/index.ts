
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
function parseJson(text:string){return JSON.parse(text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim())}
function sanitizeSchema(value:any):any{
  if(Array.isArray(value))return value.map(sanitizeSchema)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){if(k!=='additionalProperties')out[k]=sanitizeSchema(v)}
  return out
}

const domainNames:Record<string,string>={
  product_ux:'Product & UX',
  accessibility:'Accessibility',
  web_performance:'Web Performance',
  software_security:'Software Security',
  ai_systems:'AI & Automation',
  content:'Content & Storytelling',
  brand:'Brand & Creative',
  marketing:'Marketing',
  social_media:'Social Media',
  hse:'HSE',
  risk_management:'Risk & Project Control',
  digital_systems:'Digital Systems'
}
const domainSkills:Record<string,string>={
  product_ux:'digital systems',
  accessibility:'web development',
  web_performance:'web development',
  software_security:'software development',
  ai_systems:'ai / automation',
  content:'content writing',
  brand:'copywriting',
  marketing:'performance marketing',
  social_media:'social media',
  hse:'safety & hse',
  risk_management:'project management',
  digital_systems:'digital systems'
}
const allowedDomains=Object.keys(domainNames)
const allowedSkills=[
  'ai / automation','content writing','copywriting','data / research','digital systems',
  'performance marketing','photography','project management','social media',
  'software developer','software development','video editing','web development','safety & hse'
]
const highRiskDomains=new Set(['hse','software_security','ai_systems'])

function classify(text:string){
  const x=text.toLowerCase()
  if(/hse|safety|hazard|risk assessment|fire|excavat|hot work|confined|ppe|سلامة|خطر|مخاطر|حريق|حفريات/.test(x))return 'hse'
  if(/security|vulnerab|auth|login|otp|permission|access control|session|secret|أمان|دخول|صلاحيات/.test(x))return 'software_security'
  if(/story ai|\bai\b|automation|generative|llm|prompt|ذكاء اصطناعي|توليد/.test(x))return 'ai_systems'
  if(/social media|facebook|instagram|tiktok|community|سوشيال|فيسبوك|انستجرام/.test(x))return 'social_media'
  if(/marketing|campaign|ads|advertis|تسويق|حملة|إعلان|اعلان/.test(x))return 'marketing'
  if(/brand|branding|identity|logo|هوية|براند/.test(x))return 'brand'
  if(/content|copy|caption|script|storytelling|محتوى|كابشن|سيناريو/.test(x))return 'content'
  if(/performance|speed|lcp|inp|cls|load time|سرعة|أداء/.test(x))return 'web_performance'
  if(/code|develop|integration|api|database|system|portal|admin|checkout|website|app|ربط|برمجة|تطوير|نظام/.test(x))return 'digital_systems'
  if(/journey|ux|user|customer|form|upload|mobile|flow|friction|واجهة|تجربة|مستخدم|رحلة/.test(x))return 'product_ux'
  return 'risk_management'
}
function taskSkill(domain:string,text:string){
  const x=text.toLowerCase()
  if(/research|audit|journey|friction|analysis|test|تحليل|مراجعة|اختبار/.test(x))return 'data / research'
  if(/code|develop|integration|api|database|auth|otp|story ai|backend|frontend|ربط|برمجة|تطوير/.test(x))return 'software development'
  if(/copy|caption|script|content|كتابة|محتوى|كابشن|سيناريو/.test(x))return 'copywriting'
  if(/social|community|facebook|instagram|tiktok|سوشيال/.test(x))return 'social media'
  if(/campaign|ads|performance marketing|حملة|إعلان|اعلان/.test(x))return 'performance marketing'
  return domainSkills[domain]||'project management'
}
function fallback(snapshot:any){
  const rows=Array.isArray(snapshot.solution_tasks)?snapshot.solution_tasks:[]
  const grouped=new Map<string,any[]>()
  for(const row of rows){
    const text=[row.title,row.rationale,row.expected_effect,row.result_summary].filter(Boolean).join(' ')
    const domain=row.playbook_domain&&allowedDomains.includes(row.playbook_domain)?row.playbook_domain:classify(text)
    grouped.set(domain,[...(grouped.get(domain)||[]),row])
  }
  if(!grouped.size){
    const d=classify(JSON.stringify(snapshot.lead||{}))
    grouped.set(d,[{
      title:'Build the required '+domainNames[d]+' deliverable',
      expected_effect:snapshot.discovery?.desired_outcome||snapshot.lead?.project_goal||'Deliver the agreed project outcome.',
      acceptance_criteria:'The agreed outcome is delivered with evidence and reviewed by the accountable Domain Lead.'
    }])
  }
  const domains=[...grouped.entries()].slice(0,6).map(([domain,items],di)=>({
    domain_key:domain,
    name:domainNames[domain],
    lead_skill:domainSkills[domain],
    expected_outcome:clean(items.map(x=>x.expected_effect||x.result_summary||x.title).filter(Boolean).join('\n• '),5000),
    acceptance_criteria:clean(items.map(x=>x.acceptance_criteria).filter(Boolean).join('\n• '),5000)||'The domain outcome is complete, evidenced, reviewed, and ready for Admin acceptance.',
    priority:di===0?'high':'medium',
    human_gate_required:highRiskDomains.has(domain),
    tasks:items.slice(0,6).map((x:any,ti:number)=>({
      key:'D'+(di+1)+'T'+(ti+1),
      title:clean(x.title,220)||'Delivery task',
      required_skill:taskSkill(domain,[x.title,x.rationale,x.expected_effect].join(' ')),
      expected_output:clean(x.expected_effect||x.rationale||x.title,3000),
      acceptance_criteria:clean(x.acceptance_criteria,3000)||'The output is delivered with evidence and passes Domain Lead review.',
      priority:clean(x.priority,30)||'medium',
      due_offset_days:Math.min(30,Math.max(1,Number(x.due_offset_days||7))),
      depends_on:[]
    }))
  }))
  return {
    summary:'Deterministic delivery blueprint generated from the verified ATS case.',
    readiness:'ready',
    evidence_gaps:[],
    domains
  }
}
function normalize(raw:any,snapshot:any){
  const fb=fallback(snapshot)
  const source=raw&&typeof raw==='object'?raw:fb
  const out:any={
    summary:clean(source.summary||fb.summary,3000),
    readiness:source.readiness==='needs_evidence'?'needs_evidence':'ready',
    evidence_gaps:Array.isArray(source.evidence_gaps)?source.evidence_gaps.map((x:any)=>clean(x,800)).filter(Boolean).slice(0,10):[],
    domains:[]
  }
  const rawDomains=Array.isArray(source.domains)?source.domains:[]
  rawDomains.slice(0,6).forEach((d:any,di:number)=>{
    let key=clean(d.domain_key,80).toLowerCase().replace(/[^a-z0-9_]/g,'_')
    if(!allowedDomains.includes(key))key=classify([d.name,d.expected_outcome,JSON.stringify(d.tasks||[])].join(' '))
    const tasks=(Array.isArray(d.tasks)?d.tasks:[]).slice(0,7).map((t:any,ti:number)=>{
      const text=[t.title,t.expected_output,t.acceptance_criteria].join(' ')
      const skill=allowedSkills.includes(clean(t.required_skill,80).toLowerCase())?clean(t.required_skill,80).toLowerCase():taskSkill(key,text)
      return {
        key:'D'+(di+1)+'T'+(ti+1),
        title:clean(t.title,220)||'Delivery task',
        required_skill:skill,
        expected_output:clean(t.expected_output,3000)||clean(t.title,220),
        acceptance_criteria:clean(t.acceptance_criteria,3000)||'The output is delivered with evidence and passes Domain Lead review.',
        priority:['low','medium','high','critical'].includes(String(t.priority))?t.priority:'medium',
        due_offset_days:Math.min(45,Math.max(1,Number(t.due_offset_days||7))),
        depends_on:Array.isArray(t.depends_on)?t.depends_on.map((x:any)=>clean(x,40)).filter(Boolean).slice(0,5):[]
      }
    })
    if(!tasks.length)return
    out.domains.push({
      domain_key:key,
      name:domainNames[key],
      lead_skill:domainSkills[key],
      expected_outcome:clean(d.expected_outcome,5000)||tasks.map((t:any)=>t.expected_output).join('\n• '),
      acceptance_criteria:clean(d.acceptance_criteria,5000)||tasks.map((t:any)=>t.acceptance_criteria).join('\n• '),
      priority:['low','medium','high','critical'].includes(String(d.priority))?d.priority:(di===0?'high':'medium'),
      human_gate_required:highRiskDomains.has(key)||!!d.human_gate_required,
      tasks
    })
  })
  if(!out.domains.length)return fb
  return out
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  let serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!serviceKey){try{serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{}}
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

    const force=!!body?.force
    let caseId=clean(body?.case_id,80),leadId=clean(body?.lead_id,80)
    if(!caseId&&leadId){
      const q=await admin.from('studio_discovery_cases').select('id').eq('lead_id',leadId).order('created_at',{ascending:false}).limit(1).maybeSingle()
      if(q.error||!q.data)return json({error:'Discovery case not found'},404)
      caseId=q.data.id
    }
    if(!caseId)return json({error:'case_id or lead_id is required'},400)

    if(!force){
      const cached=await admin.from('studio_delivery_blueprints').select('*').eq('case_id',caseId).maybeSingle()
      if(cached.error)return json({error:cached.error.message},500)
      if(cached.data)return json({ok:true,cached:true,blueprint:cached.data})
    }

    const cq=await admin.from('studio_discovery_cases').select('*').eq('id',caseId).maybeSingle()
    if(cq.error||!cq.data)return json({error:'Discovery case not found'},404)
    const caseRow=cq.data
    leadId=caseRow.lead_id
    const [leadQ,answersQ,causesQ,tasksQ,sourcesQ]=await Promise.all([
      admin.from('studio_leads').select('*').eq('id',leadId).maybeSingle(),
      admin.from('studio_discovery_answers').select('*').eq('case_id',caseId).order('created_at',{ascending:true}),
      admin.from('studio_root_causes').select('*').eq('case_id',caseId).order('system_rank',{ascending:true,nullsFirst:false}),
      admin.from('studio_solution_tasks').select('*').eq('case_id',caseId).order('sort_order',{ascending:true}),
      admin.from('studio_knowledge_sources').select('source_key,domain,title,publisher,version_label,authority_tier,principles,status').eq('status','active').order('authority_tier')
    ])
    const failed=[leadQ,answersQ,causesQ,tasksQ,sourcesQ].find(x=>x.error)
    if(failed)return json({error:failed.error?.message||'Could not load ATS case'},500)
    if(!leadQ.data)return json({error:'Lead not found'},404)

    const taskRows=tasksQ.data||[]
    const taskIds=taskRows.map((x:any)=>x.id)
    let playbooks:any[]=[]
    if(taskIds.length){
      const pb=await admin.from('studio_task_playbooks').select('task_id,domain,risk_level,human_gate_required,method_name,result_summary,status,source_refs').in('task_id',taskIds)
      if(!pb.error)playbooks=pb.data||[]
    }
    const pbMap=new Map(playbooks.map((x:any)=>[x.task_id,x]))
    const snapshot={
      lead:{
        id:leadQ.data.id,lead_code:leadQ.data.lead_code,service:leadQ.data.service,
        project_goal:leadQ.data.project_goal,ats_understanding:leadQ.data.ats_understanding,
        current_assets:leadQ.data.current_assets,missing_information:leadQ.data.missing_information,
        timeline:leadQ.data.timeline,budget_range:leadQ.data.budget_range
      },
      discovery:{
        current_state:caseRow.current_state,impact:caseRow.impact,affected_people:caseRow.affected_people,
        desired_outcome:caseRow.desired_outcome,evidence:caseRow.evidence,prior_attempts:caseRow.prior_attempts,
        process_point:caseRow.process_point,constraints:caseRow.constraints,root_problem:caseRow.root_problem,
        diagnosis_summary:caseRow.diagnosis_summary,system_problem_statement:caseRow.system_problem_statement,
        system_diagnosis_summary:caseRow.system_diagnosis_summary,system_confidence:caseRow.system_confidence,
        decision_stage:caseRow.decision_stage,analysis_state:caseRow.analysis_state
      },
      answers:(answersQ.data||[]).map((x:any)=>({question_key:x.question_key,answer:x.answer,source_channel:x.source_channel})),
      root_causes:(causesQ.data||[]).map((x:any)=>({statement:x.statement,status:x.status,confidence:x.confidence,validation_method:x.validation_method})),
      solution_tasks:taskRows.map((x:any)=>({
        id:x.id,task_type:x.task_type,title:x.title,rationale:x.rationale,priority:x.priority,status:x.status,
        acceptance_criteria:x.acceptance_criteria,expected_effect:x.expected_effect,result_summary:x.result_summary,
        playbook_domain:pbMap.get(x.id)?.domain||null,playbook_result:pbMap.get(x.id)?.result_summary||null
      })),
      knowledge_sources:sourcesQ.data||[]
    }

    const arabic=/[\u0600-\u06ff]/.test(JSON.stringify(snapshot.lead))
    const prompt=`You are the ATS Delivery Architect.

Your job starts AFTER discovery and evidence analysis. Build the smallest professional execution system that can deliver the desired client outcome.

LANGUAGE: ${arabic?'Use clear professional Arabic for human-facing titles/outcomes, keeping useful technical terms in English.':'English.'}

NON-NEGOTIABLE OPERATING MODEL:
Admin → one accountable Domain Lead per professional domain → team tasks → Domain Lead consolidates outcome → Admin accepts/reworks the domain outcome.
Admin must NOT manage the team's subtasks.

RULES:
1. Use only the case evidence supplied below. Never invent a client fact.
2. Do NOT repeat discovery work that is already completed. Completed diagnostic/investigation findings are INPUTS to delivery, not new delivery tasks.
3. If a material fact is still truly missing and ATS cannot safely discover it internally, set readiness="needs_evidence" and list only the blocking evidence gaps.
4. Otherwise set readiness="ready" and create 1-6 distinct professional domains. Do not create a domain just to make the plan look bigger.
5. Each domain has ONE measurable expected_outcome that can be submitted to Admin.
6. Create only the minimum team tasks needed to reach that outcome: normally 2-6 tasks per domain, maximum 7.
7. Tasks must be executable deliverables, not vague labels such as "analyze", "work on", "diagnostic task", or "check things".
8. Separate professional disciplines when they need different accountable expertise (for example Product/UX, Digital Systems, AI, Content, Marketing, HSE).
9. Do not split one discipline into multiple domains merely because several tasks exist.
10. Select domain_key ONLY from: ${allowedDomains.join(', ')}.
11. Select required_skill ONLY from: ${allowedSkills.join(', ')}.
12. High-risk HSE, security, or AI domains require human review. Do not claim legal compliance, safety adequacy, security assurance, or certification from AI alone.
13. Define acceptance_criteria as an observable condition, not "admin is satisfied".
14. Dependencies must refer to task keys in the same blueprint.
15. Assume the project team is lean. Prefer clear ownership and fewer handoffs.

CASE SNAPSHOT:
${JSON.stringify(snapshot)}`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        summary:{type:'string'},
        readiness:{type:'string',enum:['ready','needs_evidence']},
        evidence_gaps:{type:'array',maxItems:10,items:{type:'string'}},
        domains:{type:'array',minItems:1,maxItems:6,items:{
          type:'object',additionalProperties:false,
          properties:{
            domain_key:{type:'string',enum:allowedDomains},
            expected_outcome:{type:'string'},
            acceptance_criteria:{type:'string'},
            priority:{type:'string',enum:['low','medium','high','critical']},
            human_gate_required:{type:'boolean'},
            tasks:{type:'array',minItems:1,maxItems:7,items:{
              type:'object',additionalProperties:false,
              properties:{
                title:{type:'string'},required_skill:{type:'string',enum:allowedSkills},
                expected_output:{type:'string'},acceptance_criteria:{type:'string'},
                priority:{type:'string',enum:['low','medium','high','critical']},
                due_offset_days:{type:'integer',minimum:1,maximum:45},
                depends_on:{type:'array',maxItems:5,items:{type:'string'}}
              },
              required:['title','required_skill','expected_output','acceptance_criteria','priority','due_offset_days','depends_on']
            }}
          },
          required:['domain_key','expected_outcome','acceptance_criteria','priority','human_gate_required','tasks']
        }}
      },
      required:['summary','readiness','evidence_gaps','domains']
    }

    let raw:any=null,usedModel='',providerNote=''
    const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_AI_API_KEY')
    if(apiKey){
      const configured=clean(Deno.env.get('GEMINI_MODEL')||'',120)
      const models=[...new Set([...(configured?[configured]:[]),'gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash'])]
      for(const model of models){
        try{
          const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
            method:'POST',
            headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
            body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.08,responseMimeType:'application/json',responseSchema:sanitizeSchema(schema)}})
          })
          const rb=await res.json().catch(()=>null)
          if(!res.ok){providerNote=clean(rb?.error?.message||'AI provider error',300);continue}
          const text=(rb?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
          if(!text){providerNote='No model output';continue}
          raw=parseJson(text);usedModel=model;break
        }catch(e){providerNote=clean((e as any)?.message||e,300)}
      }
    }
    if(!raw){raw=fallback(snapshot);usedModel='deterministic-fallback'}
    const blueprint=normalize(raw,snapshot)
    const status=blueprint.readiness==='needs_evidence'?'needs_evidence':'ready'
    const now=new Date().toISOString()
    const payload={
      case_id:caseId,lead_id:leadId,status,blueprint,source_snapshot:snapshot,
      model:usedModel,generation_notes:providerNote||null,generated_at:now,updated_at:now
    }
    const saved=await admin.from('studio_delivery_blueprints').upsert(payload,{onConflict:'case_id'}).select('*').single()
    if(saved.error)return json({error:saved.error.message},500)
    await admin.from('studio_activity').insert({
      actor_type:'system',entity_type:'lead',entity_id:leadId,action:'delivery_blueprint_generated',
      metadata:{blueprint_id:saved.data.id,status,domain_count:blueprint.domains.length,model:usedModel}
    })
    return json({ok:true,cached:false,blueprint:saved.data})
  }catch(e){
    return json({error:clean((e as any)?.message||e,600)||'Delivery blueprint generation failed'},500)
  }
})
