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
  let out='',size=0x8000
  for(let i=0;i<bytes.length;i+=size)out+=String.fromCharCode(...bytes.subarray(i,i+size))
  return btoa(out)
}
function mimeFor(name:string,current:string){
  if(current)return current
  const ext=(name.split('.').pop()||'').toLowerCase()
  return ({pdf:'application/pdf',txt:'text/plain',csv:'text/csv',json:'application/json',xml:'text/xml',md:'text/markdown',html:'text/html',rtf:'text/rtf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/m4a',ogg:'audio/ogg',aac:'audio/aac',flac:'audio/flac'})[ext]||'application/octet-stream'
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
  if(mime.startsWith('text/')||mime==='application/json')return clean(new TextDecoder().decode(bytes),140000)
  if(mime.includes('wordprocessingml')||lower.endsWith('.docx')){
    const zip=await JSZip.loadAsync(bytes),parts:string[]=[]
    for(const n of Object.keys(zip.files).filter(n=>n==='word/document.xml'||/^word\/(header|footer)\d+\.xml$/.test(n))){
      const xml=await zip.file(n)?.async('string');if(xml)parts.push(xmlText(xml,['w:t']))
    }
    return clean(parts.join('\n'),140000)
  }
  if(mime.includes('presentationml')||lower.endsWith('.pptx')){
    const zip=await JSZip.loadAsync(bytes),parts:string[]=[]
    for(const n of Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))){
      const xml=await zip.file(n)?.async('string');if(xml)parts.push('['+n+']\n'+xmlText(xml,['a:t']))
    }
    return clean(parts.join('\n\n'),140000)
  }
  if(mime.includes('spreadsheetml')||mime==='application/vnd.ms-excel'||lower.endsWith('.xlsx')||lower.endsWith('.xls')){
    const wb=XLSX.read(bytes,{type:'array'}),parts:string[]=[]
    for(const name of wb.SheetNames.slice(0,30))parts.push('[SHEET: '+name+']\n'+XLSX.utils.sheet_to_csv(wb.Sheets[name],{blankrows:false}))
    return clean(parts.join('\n\n'),140000)
  }
  if(mime==='application/zip'||lower.endsWith('.zip')){
    const zip=await JSZip.loadAsync(bytes),names=Object.keys(zip.files).filter(n=>!zip.files[n].dir)
    const parts:string[]=['ZIP CONTENTS:\n'+names.slice(0,120).join('\n')]
    let total=parts[0].length
    for(const n of names.slice(0,30)){
      if(total>120000)break
      if(/\.(txt|csv|json|xml|md|html)$/i.test(n)){
        try{const t=await zip.file(n)?.async('string');if(t){const p='\n[FILE: '+n+']\n'+clean(t,22000);parts.push(p);total+=p.length}}catch{}
      }
    }
    return clean(parts.join('\n'),140000)
  }
  return ''
}
function sanitize(value:any):any{
  if(Array.isArray(value))return value.map(sanitize)
  if(!value||typeof value!=='object')return value
  const out:any={}
  for(const [k,v] of Object.entries(value)){if(k!=='additionalProperties')out[k]=sanitize(v)}
  return out
}
function parseJson(text:string){return JSON.parse(text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim())}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  try{
    const form=await req.formData(),file=form.get('file')
    if(!(file instanceof File))return json({error:'File is required'},400)
    if(file.size<=0)return json({error:'File is empty'},400)
    if(file.size>26214400)return json({error:'File exceeds the 25 MB limit'},413)

    const bytes=new Uint8Array(await file.arrayBuffer())
    const mime=clean(mimeFor(file.name,file.type),160)
    const text=await extractText(bytes,mime,file.name)
    const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GOOGLE_AI_API_KEY')||''
    if(!apiKey){
      return json({ok:true,file_name:file.name,summary:text?clean(text,1400):'File selected for analysis after submission.',discovery_signals:{},fallback:true})
    }

    const prompt=`You are ATS Pre-Order File Evidence Analyzer.
Read ONLY the uploaded file and extract project information that can reduce questions during client intake.
Do not diagnose a root cause and do not recommend a solution.
Never invent facts. Empty fields are better than guesses.

Return explicit information for these discovery fields when supported:
- current_state
- impact
- affected_people
- desired_outcome
- evidence
- prior_attempts
- process_point
- constraints

Also return a concise summary and up to 8 explicit observations.`

    const schema:any={
      type:'object',additionalProperties:false,
      properties:{
        summary:{type:'string'},
        relevance:{type:'string',enum:['high','medium','low','unclear']},
        discovery_signals:{type:'object',additionalProperties:false,properties:{
          current_state:{type:'string'},impact:{type:'string'},affected_people:{type:'string'},desired_outcome:{type:'string'},
          evidence:{type:'string'},prior_attempts:{type:'string'},process_point:{type:'string'},constraints:{type:'string'}
        },required:['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']},
        observations:{type:'array',maxItems:8,items:{type:'string'}}
      },
      required:['summary','relevance','discovery_signals','observations']
    }

    const parts:any[]=[{text:prompt}]
    if(text)parts.push({text:'FILE CONTENT:\n'+text})
    else parts.push({inlineData:{mimeType:mime,data:bytesToBase64(bytes)}})

    let analysis:any=null,usedModel=''
    for(const model of ['gemini-3.8-flash','gemini-3.7-flash','gemini-3.5-flash','gemini-3.5-flash-lite']){
      try{
        const resp=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
          body:JSON.stringify({contents:[{role:'user',parts}],generationConfig:{temperature:0.05,responseMimeType:'application/json',responseSchema:sanitize(schema)}})
        })
        const rb=await resp.json().catch(()=>null)
        if(!resp.ok){
          const msg=clean(rb?.error?.message||rb?.message,300)
          if(resp.status===429||resp.status>=500||/high demand|unavailable|overload/i.test(msg))continue
          break
        }
        const out=(rb?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('\n').trim()
        if(!out)continue
        analysis=parseJson(out);usedModel=model;break
      }catch{}
    }

    if(!analysis){
      return json({ok:true,file_name:file.name,summary:text?clean(text,1400):'File will be analyzed after submission.',discovery_signals:{},observations:[],fallback:true})
    }

    return json({ok:true,file_name:file.name,file_size:file.size,mime_type:mime,model:usedModel,...analysis})
  }catch(error){
    console.error('ATS pre-order file analysis failed',{message:(error as any)?.message})
    return json({error:'Could not analyze this file before submission'},500)
  }
})