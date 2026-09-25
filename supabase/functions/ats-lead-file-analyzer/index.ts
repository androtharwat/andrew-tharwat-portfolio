import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,max=12000)=>String(v??'').trim().slice(0,max)

function bytesToBase64(bytes:Uint8Array){
  let out=''
  const size=0x8000
  for(let i=0;i<bytes.length;i+=size)out+=String.fromCharCode(...bytes.subarray(i,i+size))
  return btoa(out)
}
function decodeEntities(s:string){
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
}
function xmlText(xml:string,tags:string[]){
  const out:string[]=[]
  for(const tag of tags){
    const re=new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)<\\/'+tag+'>','g')
    let m
    while((m=re.exec(xml)))out.push(decodeEntities(m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()))
  }
  return out.filter(Boolean).join('\n')
}
async function extractText(bytes:Uint8Array,mime:string,fileName:string){
  const lower=fileName.toLowerCase()
  if(mime.startsWith('text/')||mime==='application/json'){
    return clean(new TextDecoder().decode(bytes),160000)
  }
  if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||lower.endsWith('.docx')){
    const zip=await JSZip.loadAsync(bytes)
    const names=Object.keys(zip.files).filter(n=>n==='word/document.xml'||/^word\/(header|footer)\d+\.xml$/.test(n))
    const parts:string[]=[]
    for(const n of names){const xml=await zip.file(n)?.async('string');if(xml)parts.push(xmlText(xml,['w:t']))}
    return clean(parts.join('\n'),160000)
  }
  if(mime==='application/vnd.openxmlformats-officedocument.presentationml.presentation'||lower.endsWith('.pptx')){
    const zip=await JSZip.loadAsync(bytes)
    const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
    const parts:string[]=[]
    for(const n of names){const xml=await zip.file(n)?.async('string');if(xml)parts.push('['+n+']\n'+xmlText(xml,['a:t']))}
    return clean(parts.join('\n\n'),160000)
  }
  if(mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'||mime==='application/vnd.ms-excel'||lower.endsWith('.xlsx')||lower.endsWith('.xls')){
    const wb=XLSX.read(bytes,{type:'array'})
    const parts:string[]=[]
    for(const name of wb.SheetNames.slice(0,30)){
      const csv=XLSX.utils.sheet_to_csv(wb.Sheets[name],{blankrows:false})
      parts.push('[SHEET: '+name+']\n'+csv)
    }
    return clean(parts.join('\n\n'),160000)
  }
  if(mime==='application/zip'||lower.endsWith('.zip')){
    const zip=await JSZip.loadAsync(bytes)
    const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir)
    const parts:string[]=['ZIP CONTENTS:\n'+names.slice(0,120).join('\n')]
    let total=parts[0].length
    for(const n of names.slice(0,40)){
      if(total>140000)break
      if(/\.(txt|csv|json|xml|md|html|css|js|ts)$/i.test(n)){
        try{
          const t=await zip.file(n)?.async('string')
          if(t){const part='\n[FILE: '+n+']\n'+clean(t,25000);parts.push(part);total+=part.length}
        }catch{}
      }
    }
    return clean(parts.join('\n'),160000)
  }
  return ''
}
function sanitizeSchema(value:any):any{
  if(Array.isArray(value))return value.map(sanitizeSchema)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){if(k!=='additionalProperties')out[k]=sanitizeSchema(v)}
  return out
}
function parseJson(text:string){
  return JSON.parse(text.trim().replace(/^\`\`\`json\s*/i,'').replace(/\`\`\`$/,'').trim())
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

  let fileId=''
  try{
    const body=await req.json().catch(()=>({}))
    fileId=clean(body?.file_id,80)
    const uploadGrant=clean(body?.upload_grant,200)
    if(!fileId)return json({error:'File is required'},400)

    const {data:file,error:fileError}=await admin.from('studio_files')
      .select('id,lead_id,file_name,storage_path,mime_type,file_size,analysis_status')
      .eq('id',fileId).maybeSingle()
    if(fileError||!file||!file.lead_id)return json({error:'Lead file not found'},404)

    const {data:lead}=await admin.from('studio_leads').select('id,email,lead_code,service,project_goal').eq('id',file.lead_id).maybeSingle()
    if(!lead)return json({error:'Lead not found'},404)

    let authorized=false
    if(uploadGrant){
      const tokenHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uploadGrant))
      const hex=[...new Uint8Array(tokenHash)].map(x=>x.toString(16).padStart(2,'0')).join('')
      const {data:g}=await admin.from('studio_public_upload_grants')
        .select('lead_id,status,expires_at').eq('token_hash',hex).maybeSingle()
      authorized=!!g&&g.status==='active'&&g.lead_id===file.lead_id&&new Date(g.expires_at).getTime()>Date.now()
    }else{
      const authHeader=req.headers.get('authorization')||''
      const token=authHeader.replace(/^Bearer\s+/i,'').trim()
      if(token){
        const {data:userData,error:userError}=await admin.auth.getUser(token)
        const email=clean(userData?.user?.email,320).toLowerCase()
        authorized=!userError&&!!email&&String(lead.email||'').toLowerCase()===email
      }
    }
    if(!authorized)return json({error:'File access denied'},403)

    await admin.from('studio_files').update({analysis_status:'analyzing'}).eq('id',file.id)

    const dl=await admin.storage.from('studio-client-files').download(file.storage_path)
    if(dl.error||!dl.data)throw new Error(dl.error?.message||'Could not read uploaded file')
    const bytes=new Uint8Array(await dl.data.arrayBuffer())
    if(bytes.length>26214400)throw new Error('File exceeds the 25 MB analysis limit')

    const mime=clean(file.mime_type||dl.data.type||'application/octet-stream',160)
    const extractedText=await extractText(bytes,mime,file.file_name)
    const ar=/[\u0600-\u06ff]/.test(extractedText+' '+lead.project_goal)
    const prompt=`You are the ATS File Evidence Analyzer.

Analyze ONLY the contents of the uploaded file. Do not diagnose the project, do not infer a root cause, and do not propose a solution.
Extract explicit evidence that can later be used by a separate diagnostic engine.

Language: ${ar?'Arabic. Write concise professional Arabic while preserving useful English technical terms.':'English.'}
File name: ${file.file_name}
Project service: ${lead.service||''}
Known project context: ${clean(lead.project_goal,4000)}

Rules:
- Never invent facts, values, dates, requirements or conclusions.
- Distinguish explicit document content from your interpretation.
- Metrics must contain values actually present in the file.
- discovery_signals must ONLY contain information explicitly present in the file. Use an empty string when a field is not supported by the file.
- Never overwrite or reinterpret client data outside the file.
- If the file is unclear or unrelated, say so.
- For screenshots/images, describe only visible relevant information.
- For reports/documents, preserve important numbers, requirements, findings and constraints.
- Output concise structured JSON.`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        summary:{type:'string'},
        relevance:{type:'string',enum:['high','medium','low','unclear']},
        evidence_strength:{type:'string',enum:['strong','medium','weak','unclear']},
        observations:{type:'array',maxItems:30,items:{type:'object',additionalProperties:false,properties:{
          statement:{type:'string'},location:{type:'string'},confidence:{type:'integer',minimum:0,maximum:100}
        },required:['statement','location','confidence']}},
        metrics:{type:'array',maxItems:20,items:{type:'object',additionalProperties:false,properties:{
          name:{type:'string'},value:{type:'string'},context:{type:'string'},location:{type:'string'}
        },required:['name','value','context','location']}},
        requirements:{type:'array',maxItems:20,items:{type:'string'}},
        constraints:{type:'array',maxItems:20,items:{type:'string'}},
        risks:{type:'array',maxItems:20,items:{type:'string'}},
        decisions:{type:'array',maxItems:20,items:{type:'string'}},
        unanswered_questions:{type:'array',maxItems:15,items:{type:'string'}},
        discovery_signals:{type:'object',additionalProperties:false,properties:{
          current_state:{type:'string'},impact:{type:'string'},affected_people:{type:'string'},desired_outcome:{type:'string'},
          evidence:{type:'string'},prior_attempts:{type:'string'},process_point:{type:'string'},constraints:{type:'string'}
        },required:['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']}
      },
      required:['summary','relevance','evidence_strength','observations','metrics','requirements','constraints','risks','decisions','unanswered_questions','discovery_signals']
    }
    const safeSchema=sanitizeSchema(schema)
    const models=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash','gemini-3.5-flash-lite']
    let analysis:any=null,usedModel='',lastError=''

    for(const model of models){
      try{
        const parts:any[]=[{text:prompt}]
        if(extractedText){
          parts.push({text:'\nFILE CONTENT EXTRACT:\n'+clean(extractedText,150000)})
        }else{
          parts.push({inlineData:{mimeType:mime,data:bytesToBase64(bytes)}})
        }
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
          body:JSON.stringify({
            contents:[{role:'user',parts}],
            generationConfig:{temperature:0.05,responseMimeType:'application/json',responseSchema:safeSchema}
          })
        })
        const rb=await response.json().catch(()=>null)
        if(!response.ok){
          lastError=clean(rb?.error?.message||rb?.message||'Analysis failed',300)
          if(response.status===429||response.status>=500||/high demand|unavailable|overload/i.test(lastError))continue
          // If this MIME is rejected directly, do not keep retrying identical requests on every model.
          if(!extractedText&&response.status===400)break
          continue
        }
        const out=(rb?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
        if(!out)continue
        analysis=parseJson(out);usedModel=model;break
      }catch(error){lastError=clean((error as any)?.message||error,300)}
    }

    if(!analysis&&extractedText){
      analysis={
        summary:ar?'تم استخراج محتوى الملف نصيًا، لكن التحليل الدلالي غير متاح مؤقتًا. سيستخدم محرك التشخيص النص المستخرج مباشرة.':'The file text was extracted, but semantic analysis is temporarily unavailable. The diagnostic engine can still use the extracted content.',
        relevance:'unclear',evidence_strength:'weak',observations:[],metrics:[],requirements:[],constraints:[],risks:[],decisions:[],unanswered_questions:[],
        discovery_signals:{current_state:'',impact:'',affected_people:'',desired_outcome:'',evidence:'',prior_attempts:'',process_point:'',constraints:''},
        raw_text_excerpt:clean(extractedText,30000),fallback:true
      }
      usedModel='deterministic-text-extract'
    }

    if(!analysis){
      await admin.from('studio_files').update({
        analysis_status:'error',analysis_summary:lastError||'Automatic analysis unavailable',
        analysis_json:{error:lastError||'Automatic analysis unavailable'},analysis_model:null,analyzed_at:new Date().toISOString()
      }).eq('id',file.id)
      return json({ok:false,error:'Automatic file analysis unavailable',detail:lastError},502)
    }

    if(extractedText&&!analysis.raw_text_excerpt)analysis.raw_text_excerpt=clean(extractedText,30000)

    const now=new Date().toISOString()
    await admin.from('studio_files').update({
      analysis_status:'ready',
      analysis_summary:clean(analysis.summary,6000),
      analysis_json:analysis,
      analysis_model:usedModel,
      analyzed_at:now
    }).eq('id',file.id)

    let signalsAdded=0
    const {data:caseRow}=await admin.from('studio_discovery_cases').select('*').eq('lead_id',lead.id).maybeSingle()
    if(caseRow){
      const allowed=['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']
      const signals=analysis?.discovery_signals||{}
      const patch:any={analysis_state:'stale'}
      const inserts:any[]=[]
      for(const key of allowed){
        const existing=clean(caseRow?.[key],5000)
        const value=clean(signals?.[key],5000)
        if(!existing&&value){
          patch[key]=value
          inserts.push({case_id:caseRow.id,question_key:key,answer:value,actor_type:'system',source_channel:'document',is_read_by_admin:true})
          signalsAdded++
        }
      }
      await admin.from('studio_discovery_cases').update(patch).eq('id',caseRow.id)
      if(inserts.length)await admin.from('studio_discovery_answers').insert(inserts)
    }else{
      await admin.from('studio_discovery_cases').update({analysis_state:'stale'}).eq('lead_id',lead.id)
    }
    await admin.from('studio_activity').insert({
      actor_type:'system',entity_type:'lead',entity_id:lead.id,action:'lead_file_analyzed',
      metadata:{file_id:file.id,file_name:file.file_name,model:usedModel,relevance:analysis.relevance,evidence_strength:analysis.evidence_strength,discovery_signals_added:signalsAdded}
    })

    return json({ok:true,file_id:file.id,status:'ready',summary:analysis.summary,model:usedModel,discovery_signals_added:signalsAdded,analysis})
  }catch(error){
    const message=clean((error as any)?.message||error,500)
    if(fileId){
      try{await admin.from('studio_files').update({analysis_status:'error',analysis_summary:message,analysis_json:{error:message},analyzed_at:new Date().toISOString()}).eq('id',fileId)}catch{}
    }
    console.error('ATS lead file analyzer failed',{message})
    return json({error:'File analysis failed',detail:message},500)
  }
})