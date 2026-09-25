import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors})
const clean=(v:unknown,max=500)=>String(v??'').trim().slice(0,max)

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)

  let serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!serviceKey){
    try{serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{}
  }
  const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
  if(!serviceKey||!supabaseUrl)return json({error:'Server configuration unavailable'},500)

  try{
    const body=await req.json().catch(()=>({}))
    const email=clean(body?.email,320).toLowerCase()
    const code=clean(body?.code,12)
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[0-9]{6}$/.test(code)){
      return json({error:'Invalid email or access code'},400)
    }

    const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:exchange,error:exchangeError}=await admin.rpc('studio_exchange_client_access_code',{
      p_email:email,p_code:code
    })
    if(exchangeError||!exchange?.ok)return json({error:'Invalid or expired access code'},401)

    const accessCodeId=exchange.access_code_id
    const restoreCode=async()=>{
      if(!accessCodeId)return
      await admin.from('studio_client_access_codes')
        .update({status:'active',used_at:null})
        .eq('id',accessCodeId).eq('status','used')
    }

    const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email})
    if(linkError||!link){
      await restoreCode()
      console.error('ATS access link generation failed',{message:linkError?.message,status:linkError?.status})
      return json({error:'Could not activate client session'},500)
    }

    const props:any=(link as any).properties||{}
    const actionLink=props.action_link||props.actionLink||''
    let tokenHash=props.hashed_token||props.hashedToken||''
    if(!tokenHash&&actionLink){
      try{
        const u=new URL(actionLink)
        tokenHash=u.searchParams.get('token_hash')||u.searchParams.get('token')||''
      }catch{}
    }
    if(!tokenHash){
      await restoreCode()
      console.error('ATS access token hash missing',{hasActionLink:!!actionLink,propertyKeys:Object.keys(props||{})})
      return json({error:'Could not activate client session'},500)
    }

    return json({ok:true,email,token_hash:tokenHash,lead_id:exchange.lead_id||null,client_id:exchange.client_id||null})
  }catch(error){
    console.error('ATS client code login failed',{message:(error as any)?.message})
    return json({error:'Client access could not be activated'},500)
  }
})
