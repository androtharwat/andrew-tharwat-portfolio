import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
})
const clean=(v:unknown,max=500)=>String(v??'').trim().slice(0,max)
async function sha256(value:string){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')
}
function safeName(name='file'){
  return String(name).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(-120)||'file'
}
function mimeFor(name:string,current:string){
  if(current)return current
  const ext=(name.split('.').pop()||'').toLowerCase()
  return ({pdf:'application/pdf',txt:'text/plain',csv:'text/csv',json:'application/json',xml:'text/xml',md:'text/markdown',html:'text/html',rtf:'text/rtf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/m4a',ogg:'audio/ogg',aac:'audio/aac',flac:'audio/flac'})[ext]||'application/octet-stream'
}

const allowed=new Set([
  'image/jpeg','image/png','image/webp',
  'application/pdf','application/zip','application/json',
  'text/plain','text/csv','text/markdown','text/html','text/xml','text/rtf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4','video/webm','video/quicktime',
  'audio/wav','audio/mp3','audio/mpeg','audio/aac','audio/ogg','audio/flac','audio/m4a','audio/webm'
])

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
    const form=await req.formData()
    const grant=clean(form.get('grant'),200)
    const file=form.get('file')
    if(!grant||!(file instanceof File))return json({error:'Upload grant and file are required'},400)
    if(file.size<=0)return json({error:'File is empty'},400)
    if(file.size>26214400)return json({error:'File exceeds the 25 MB limit'},413)

    const mime=clean(mimeFor(file.name,file.type),160)
    if(!allowed.has(mime))return json({error:'This file type is not supported'},415)

    const tokenHash=await sha256(grant)
    const {data:g,error:gError}=await admin.from('studio_public_upload_grants')
      .select('id,lead_id,status,max_files,files_used,expires_at')
      .eq('token_hash',tokenHash).maybeSingle()
    if(gError||!g)return json({error:'Upload permission is invalid'},403)
    if(g.status!=='active'||new Date(g.expires_at).getTime()<=Date.now())return json({error:'Upload permission has expired'},403)
    if(Number(g.files_used||0)>=Number(g.max_files||10))return json({error:'Maximum number of files reached'},429)

    const {data:lead}=await admin.from('studio_leads').select('id,status').eq('id',g.lead_id).maybeSingle()
    if(!lead||['won','lost'].includes(String(lead.status)))return json({error:'This request no longer accepts files'},403)

    const path='leads/'+g.lead_id+'/client_upload/'+crypto.randomUUID()+'_'+safeName(file.name)
    const up=await admin.storage.from('studio-client-files').upload(path,file,{upsert:false,contentType:mime})
    if(up.error)return json({error:'Could not store file',detail:up.error.message},500)

    const meta=await admin.from('studio_files').insert({
      lead_id:g.lead_id,
      uploaded_by:null,
      file_name:file.name,
      storage_path:path,
      category:'client_upload',
      visibility:'client_visible',
      mime_type:mime,
      file_size:file.size,
      analysis_status:'not_analyzed'
    }).select('id,lead_id,file_name,storage_path,mime_type,file_size,analysis_status,created_at').single()

    if(meta.error){
      await admin.storage.from('studio-client-files').remove([path])
      return json({error:'Could not register file',detail:meta.error.message},500)
    }

    const nextUsed=Number(g.files_used||0)+1
    await admin.from('studio_public_upload_grants').update({
      files_used:nextUsed,
      last_used_at:new Date().toISOString()
    }).eq('id',g.id)

    await admin.from('studio_activity').insert({
      actor_type:'prospect',entity_type:'lead',entity_id:g.lead_id,action:'lead_file_uploaded_at_intake',
      metadata:{file_id:meta.data.id,file_name:file.name,file_size:file.size,mime_type:mime}
    })

    return json({ok:true,file:meta.data,remaining:Math.max(0,Number(g.max_files||10)-nextUsed)})
  }catch(error){
    console.error('ATS public lead file upload failed',{message:(error as any)?.message})
    return json({error:'File upload failed'},500)
  }
})