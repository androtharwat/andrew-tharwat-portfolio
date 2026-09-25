import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,max=8000)=>String(v??'').trim().slice(0,max)

async function sha256(value:string){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')
}
function sanitizeSchema(value:any):any{
  if(Array.isArray(value))return value.map(sanitizeSchema)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){if(k!=='additionalProperties')out[k]=sanitizeSchema(v)}
  return out
}
function parseJson(text:string){
  return JSON.parse(text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim())
}
function countReady(d:any){
  const keys=['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']
  return Math.round(keys.filter(k=>clean(d?.[k],5000)).length*100/keys.length)
}
function nextMissing(d:any,ar:boolean,skipped:string[]=[]){
  const items=[
    ['current_state',ar?'إيه اللي بيحصل دلوقتي ومفروض مايحصلش؟':'What is happening now that should not be happening?',ar?'ده بيفصل الوضع الحالي عن الحل اللي ممكن يكون في بالك.':'This separates the current condition from the solution you may already have in mind.'],
    ['impact',ar?'لما المشكلة دي بتحصل، تأثيرها الحقيقي إيه؟':'When this happens, what is the real impact?',ar?'التأثير بيحدد إيه الأهم: وقت، تكلفة، سلامة، جودة، مبيعات أو إعادة شغل.':'Impact tells us what matters most: time, cost, safety, quality, sales or rework.'],
    ['evidence',ar?'إيه الدليل أو المثال الحقيقي اللي بيأكد وجود المشكلة؟':'What evidence or real example confirms this problem?',ar?'بنفرق بين الحقيقة والافتراض قبل ما نحدد السبب.':'We separate facts from assumptions before diagnosing a cause.'],
    ['affected_people',ar?'مين أكتر ناس متأثرين بالمشكلة دي؟':'Who is most affected by this problem?',ar?'ده بيوضح فين المشكلة بتظهر فعليًا.':'This shows where the problem is actually experienced.'],
    ['process_point',ar?'المشكلة بتظهر فين بالظبط داخل العملية أو رحلة العميل؟':'Where exactly in the process or customer journey does the problem appear?',ar?'تحديد نقطة الفشل يمنعنا من معالجة العرض بدل السبب.':'A precise failure point helps avoid treating symptoms.'],
    ['prior_attempts',ar?'إيه اللي اتجرب قبل كده وإيه اللي حصل؟':'What has already been tried, and what happened?',ar?'المحاولات السابقة تكشف إيه اللي فشل أو نفع أو كشف سبب أعمق.':'Previous attempts show what failed, helped, or exposed a deeper cause.'],
    ['desired_outcome',ar?'لو المشكلة اتحلت صح، إيه اللي لازم يتغير؟':'If this is solved correctly, what should be different?',ar?'دي هتبقى علامة النجاح اللي نقيس عليها الحل.':'This becomes the success target for the final solution.'],
    ['constraints',ar?'إيه القيود اللي لازم الحل يلتزم بيها؟':'What constraints must the solution respect?',ar?'الوقت والميزانية واللوائح والتقنية وظروف التشغيل بتحدد الحل الواقعي.':'Time, budget, regulation, technology and operating limits shape a realistic solution.']
  ]
  for(const [key,q,why] of items)if(!clean(d?.[key],5000)&&!skipped.includes(String(key)))return {key,question:q,why}
  return null
}
function fallback(problem:string,extra:string,followups:any[],ar:boolean,skipped:string[]=[],fileEvidence:any[]=[]){
  const d:any={current_state:clean(problem,5000),impact:'',affected_people:'',desired_outcome:'',evidence:'',prior_attempts:'',process_point:'',constraints:''}
  for(const item of fileEvidence||[]){
    const signals=item?.discovery_signals||{}
    for(const key of Object.keys(d))if(!d[key]&&signals?.[key])d[key]=clean(signals[key],5000)
  }
  for(const f of followups||[]){
    const key=String(f?.key||'')
    if(Object.prototype.hasOwnProperty.call(d,key)&&!d[key])d[key]=clean(f?.answer,5000)
  }
  const lower=(problem+' '+extra).toLowerCase()
  if(!d.desired_outcome){
    const m=(problem+' '+extra).match(/(?:عايز|اريد|أريد|هدفي|الهدف|want|need|goal|success)[^.!?\n]{0,220}/i)
    if(m)d.desired_outcome=clean(m[0],1500)
  }
  const n=nextMissing(d,ar,skipped)
  return {
    discovery:d,
    readiness_score:countReady(d),
    understanding:{
      situation:ar?'تم تسجيل الوضع كما وصفته.':'Your situation has been captured as you described it.',
      problem_summary:clean(problem,900),
      direction:ar?'هنكمل فقط بالمعلومات اللي تغيّر قرار الحل.':'We will only ask for information that changes the solution decision.',
      capabilities:[]
    },
    next_question:n,
    confidence:Math.min(60,Math.max(20,countReady(d)-5)),
    model:'deterministic-intake'
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
  const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_AI_API_KEY')||''
  if(!serviceKey||!supabaseUrl)return json({error:'Server configuration unavailable'},500)
  const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})

  try{
    const body=await req.json().catch(()=>({}))
    const problem=clean(body?.problem,4500)
    const extra=clean(body?.extra,2000)
    const link=clean(body?.link,1200)
    const mode=['quick','guided','unsure'].includes(String(body?.mode))?String(body.mode):'quick'
    const followups=Array.isArray(body?.followups)?body.followups.slice(0,6).map((x:any)=>({
      key:clean(x?.key,40),question:clean(x?.question,800),answer:clean(x?.answer,5000)
    })):[]
    const skippedKeys=Array.isArray(body?.skipped_keys)?body.skipped_keys.map((x:any)=>clean(x,40)).filter(Boolean).slice(0,8):[]
    const fileEvidence=Array.isArray(body?.file_evidence)?body.file_evidence.slice(0,10).map((x:any)=>({
      file_name:clean(x?.file_name,240),
      summary:clean(x?.summary,2400),
      relevance:clean(x?.relevance,40),
      discovery_signals:x?.discovery_signals&&typeof x.discovery_signals==='object'?x.discovery_signals:{},
      observations:Array.isArray(x?.observations)?x.observations.slice(0,8).map((v:any)=>clean(v,1200)):[]
    })):[]
    if(problem.length<20)return json({error:'Tell ATS a little more first.'},400)

    const ip=clean(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown',200).split(',')[0]
    const ua=clean(req.headers.get('user-agent')||'unknown',500)
    const fp=await sha256(ip+'|'+ua)
    const now=Date.now()
    const {data:rate}=await admin.from('studio_public_intake_rate').select('*').eq('fingerprint',fp).maybeSingle()
    if(rate){
      const start=new Date(rate.window_start).getTime()
      if(now-start<15*60*1000){
        if(Number(rate.request_count||0)>=8)return json({error:'Too many analysis requests. Please continue with the current questions.'},429)
        await admin.from('studio_public_intake_rate').update({request_count:Number(rate.request_count||0)+1,updated_at:new Date().toISOString()}).eq('fingerprint',fp)
      }else{
        await admin.from('studio_public_intake_rate').update({window_start:new Date().toISOString(),request_count:1,updated_at:new Date().toISOString()}).eq('fingerprint',fp)
      }
    }else{
      await admin.from('studio_public_intake_rate').insert({fingerprint:fp,request_count:1})
    }

    const ar=/[\u0600-\u06ff]/.test(problem+' '+extra+JSON.stringify(followups))
    if(!apiKey)return json({ok:true,...fallback(problem,extra,followups,ar,skippedKeys,fileEvidence),fallback:true})

    const prompt=`You are ATS Smart Intake, the first diagnostic layer of a multidisciplinary problem-solving studio.

The client is busy. Your job is to extract as much structured information as possible from what they already said, then ask ONLY the single highest-value missing question. Never make the client repeat information that is already present.

LANGUAGE: ${ar?'Arabic. Use clear Egyptian-friendly professional Arabic.':'English.'}
MODE: ${mode}

CLIENT WORDS:
${problem}

EXTRA CONTEXT:
${extra||'(none)'}

REFERENCE LINK:
${link||'(none)'}

FOLLOW-UP ANSWERS ALREADY GIVEN:
${JSON.stringify(followups)}

SERVER-EXTRACTED EVIDENCE FROM FILES THE CLIENT SELECTED:
${JSON.stringify(fileEvidence)}

QUESTIONS THE CLIENT COULD NOT ANSWER IN THIS SESSION:
${JSON.stringify(skippedKeys)}

RULES:
1. Never invent facts. If a discovery field is not explicitly supported, return an empty string.
2. Extract only what the client actually said or what the server-extracted file evidence explicitly supports. Use file evidence before asking the client to repeat information already present in a file.
3. Treat a requested deliverable (website, campaign, app, etc.) as a requested solution, not automatically as the real problem.
4. Prefer evidence, impact, process point and previous attempts over generic demographic questions.
5. Ask only ONE next question. It must be the question that most improves the next decision. Do not ask any key listed in skippedKeys again in this session.
6. If readiness is already high enough for a professional first review, next_question must be null.
7. Keep the understanding concise and useful; no sales language.
8. capabilities may include only: hse, digital, brand, content, ai, product.
9. current_state should describe what is happening now, not the proposed solution.
10. evidence should contain concrete examples, metrics, screenshots/reports mentioned, or observable proof only.`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        discovery:{type:'object',additionalProperties:false,properties:{
          current_state:{type:'string'},impact:{type:'string'},affected_people:{type:'string'},desired_outcome:{type:'string'},
          evidence:{type:'string'},prior_attempts:{type:'string'},process_point:{type:'string'},constraints:{type:'string'}
        },required:['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']},
        understanding:{type:'object',additionalProperties:false,properties:{
          situation:{type:'string'},problem_summary:{type:'string'},direction:{type:'string'},
          capabilities:{type:'array',items:{type:'string',enum:['hse','digital','brand','content','ai','product']}}
        },required:['situation','problem_summary','direction','capabilities']},
        next_question:{anyOf:[
          {type:'null'},
          {type:'object',additionalProperties:false,properties:{
            key:{type:'string',enum:['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']},
            question:{type:'string'},why:{type:'string'}
          },required:['key','question','why']}
        ]},
        confidence:{type:'integer',minimum:0,maximum:100}
      },
      required:['discovery','understanding','next_question','confidence']
    }

    const safe=sanitizeSchema(schema)
    const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash','gemini-3.5-flash-lite']
    let analysis:any=null,usedModel='',lastError=''
    for(const model of models){
      for(const config of [
        {temperature:0.1,responseMimeType:'application/json',responseSchema:safe},
        {temperature:0.1,responseMimeType:'application/json'}
      ]){
        try{
          const resp=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
            method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
            body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:config})
          })
          const rb=await resp.json().catch(()=>null)
          if(!resp.ok){
            lastError=clean(rb?.error?.message||rb?.message||'AI unavailable',300)
            if(resp.status===429||resp.status>=500||/high demand|unavailable|overload/i.test(lastError))break
            continue
          }
          const out=(rb?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
          if(!out)continue
          analysis=parseJson(out);usedModel=model;break
        }catch(error){lastError=clean((error as any)?.message||error,300)}
      }
      if(analysis)break
    }

    if(!analysis)return json({ok:true,...fallback(problem,extra,followups,ar,skippedKeys,fileEvidence),fallback:true,provider_error:lastError})

    const d=analysis.discovery||{}
    for(const key of ['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints'])d[key]=clean(d[key],5000)
    for(const item of fileEvidence){
      const signals=item?.discovery_signals||{}
      for(const key of ['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']){
        if(!d[key]&&signals?.[key])d[key]=clean(signals[key],5000)
      }
    }
    for(const f of followups){
      if(f.key&&f.answer&&!d[f.key])d[f.key]=f.answer
    }
    if(!d.current_state)d.current_state=clean(problem,5000)

    const score=countReady(d)
    let next=analysis.next_question
    if(next&&skippedKeys.includes(String(next.key||'')))next=null
    if(!next)next=nextMissing(d,ar,skippedKeys)
    if(score>=75)next=null

    return json({
      ok:true,
      discovery:d,
      readiness_score:score,
      understanding:{
        situation:clean(analysis?.understanding?.situation,1600),
        problem_summary:clean(analysis?.understanding?.problem_summary,1800),
        direction:clean(analysis?.understanding?.direction,1800),
        capabilities:Array.isArray(analysis?.understanding?.capabilities)?analysis.understanding.capabilities.filter((x:any)=>['hse','digital','brand','content','ai','product'].includes(String(x))).slice(0,4):[]
      },
      next_question:next,
      confidence:Math.max(0,Math.min(100,Number(analysis.confidence||0))),
      model:usedModel,
      fallback:false
    })
  }catch(error){
    console.error('ATS public intake analyzer failed',{message:(error as any)?.message})
    return json({error:'Could not analyze the request right now'},500)
  }
})