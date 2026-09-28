import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'content-type,x-ats-notify-secret',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers})
const clean=(v:unknown,max=500)=>String(v??'').trim().slice(0,max)
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)

  let serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!serviceKey){
    try{serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{}
  }
  const url=Deno.env.get('SUPABASE_URL')||''
  if(!url||!serviceKey)return json({error:'Server configuration unavailable'},500)

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})

  try{
    const supplied=req.headers.get('x-ats-notify-secret')||''
    const {data:expected,error:secretError}=await admin.rpc('get_ats_team_notify_webhook_secret')
    if(secretError||!expected||supplied!==expected)return json({error:'Unauthorized'},401)

    const body=await req.json().catch(()=>({}))
    const notificationId=clean(body?.notification_id,80)
    if(!notificationId)return json({error:'notification_id required'},400)

    const {data:n,error:nErr}=await admin.from('studio_team_notifications').select('*').eq('id',notificationId).maybeSingle()
    if(nErr||!n)return json({error:'Notification not found'},404)
    if(['sent','fallback_sent'].includes(String(n.status||'')))return json({ok:true,status:n.status,duplicate:true})

    await admin.from('studio_team_notifications').update({attempt_count:Number(n.attempt_count||0)+1,updated_at:new Date().toISOString()}).eq('id',notificationId)

    const [{data:member,error:mErr},{data:project,error:pErr}]=await Promise.all([
      admin.from('studio_team_members').select('id,full_name,email,active,auth_user_id').eq('id',n.member_id).maybeSingle(),
      admin.from('studio_projects').select('id,title,project_code').eq('id',n.project_id).maybeSingle()
    ])
    if(mErr||!member||!member.active)throw mErr||new Error('Active team member not found')
    if(pErr||!project)throw pErr||new Error('Project not found')

    let workstream:any=null,task:any=null
    if(n.workstream_id){
      const r=await admin.from('studio_project_workstreams').select('id,name,domain_key,expected_outcome').eq('id',n.workstream_id).maybeSingle()
      if(r.error)throw r.error
      workstream=r.data
    }
    if(n.task_id){
      const r=await admin.from('studio_project_tasks').select('id,title,expected_output,due_at,status').eq('id',n.task_id).maybeSingle()
      if(r.error)throw r.error
      task=r.data
    }

    const base='https://andrew-tharwat-portfolio.vercel.app/team-v9/'
    const qs=new URLSearchParams()
    qs.set('project',project.id)
    if(workstream?.id)qs.set('domain',workstream.id)
    if(task?.id)qs.set('task',task.id)
    const redirectTo=base+'?'+qs.toString()

    const {data:notifySettings}=await admin.from('portfolio_site_settings').select('value').eq('key','ats_team_notifications').maybeSingle()
    const notifyConfig=(notifySettings?.value&&typeof notifySettings.value==='object')?notifySettings.value:{}
    const customResendEnabled=notifyConfig.custom_resend_enabled===true
    const senderFrom=clean(notifyConfig.sender_from,240)||'AT Studio <onboarding@resend.dev>'

    if(!customResendEnabled){
      const fallback=await admin.auth.signInWithOtp({
        email:member.email,
        options:{shouldCreateUser:false,emailRedirectTo:redirectTo}
      })
      if(fallback.error)throw new Error('Auth email failed: '+fallback.error.message)
      await admin.from('studio_team_notifications').update({
        status:'fallback_sent',provider:'supabase_auth',error:null,sent_at:new Date().toISOString(),updated_at:new Date().toISOString(),
        metadata:{...(n.metadata||{}),redirect_to:redirectTo,delivery_mode:'auth_email'}
      }).eq('id',notificationId)
      return json({ok:true,status:'fallback_sent',provider:'supabase_auth'})
    }

    const {data:linkData,error:linkError}=await admin.auth.admin.generateLink({
      type:'magiclink',
      email:member.email,
      options:{redirectTo}
    })
    if(linkError)throw linkError
    const props:any=linkData?.properties||{}
    const actionLink=props.action_link||props.actionLink||''
    if(!actionLink)throw new Error('Magic login link unavailable')

    const isTask=n.event_type==='task_assigned'&&task
    const isSummary=n.event_type==='assignment_summary'
    const subject=isTask
      ? 'AT Studio · New task assigned — '+clean(project.title,120)
      : isSummary
        ? 'AT Studio · Your project responsibilities are ready'
        : 'AT Studio · New domain assigned — '+clean(project.title,120)

    const headline=isTask?'New task assigned':isSummary?'Your ATS work is ready':'New domain assigned'
    const primary=isTask?clean(task.title,220):(workstream?clean(workstream.name,180):clean(project.title,180))
    const detail=isTask
      ? clean(task.expected_output,900)
      : workstream
        ? clean(workstream.expected_outcome,900)
        : 'Open your workspace to review the domains and tasks assigned to you.'
    const due=isTask&&task?.due_at?new Date(task.due_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}):''

    const html='<!doctype html><html><body style="margin:0;background:#071923;font-family:Arial,Helvetica,sans-serif;color:#fff"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#0b2635;border:1px solid #174154;border-radius:20px"><tr><td style="padding:28px"><p style="margin:0 0 8px;color:#ff334d;font-size:12px;font-weight:800;letter-spacing:1.4px">AT STUDIO · TEAM WORKSPACE</p><h1 style="margin:0 0 10px;font-size:28px;line-height:1.2">'+esc(headline)+'</h1><p style="margin:0 0 22px;color:#aac2cf;font-size:15px">Hi '+esc(member.full_name)+', you have a new responsibility in <strong style="color:#fff">'+esc(project.title)+'</strong>.</p><div style="background:#0e3142;border-radius:14px;padding:18px"><p style="margin:0 0 6px;color:#7fa5b7;font-size:11px;font-weight:700">ASSIGNMENT</p><h2 style="margin:0 0 10px;font-size:20px">'+esc(primary)+'</h2><p style="margin:0;color:#d2e2ea;line-height:1.6">'+esc(detail)+'</p>'+(due?'<p style="margin:12px 0 0;color:#9eb9c7"><strong>Due:</strong> '+esc(due)+'</p>':'')+'</div><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px"><tr><td bgcolor="#ff2942" align="center" style="border-radius:12px"><a href="'+esc(actionLink)+'" style="display:block;padding:15px 20px;color:#fff;text-decoration:none;font-weight:800;font-size:15px">OPEN MY ATS WORKSPACE →</a></td></tr></table><p style="margin:14px 0 0;color:#7895a4;font-size:12px;text-align:center">This secure link signs you in and opens the assigned work directly. If it expires, use your approved email on the Team Workspace.</p></td></tr></table></td></tr></table></body></html>'
    const textBody=headline+'\n\nProject: '+project.title+'\nAssignment: '+primary+'\n'+detail+(due?'\nDue: '+due:'')+'\n\nOpen ATS Workspace: '+actionLink

    let resendError=''
    let resendId=''
    try{
      const {data:resendKey,error:keyErr}=await admin.rpc('get_ats_resend_api_key')
      if(keyErr||!resendKey)throw keyErr||new Error('Resend key unavailable')
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{
          'Authorization':'Bearer '+resendKey,
          'Content-Type':'application/json',
          'Idempotency-Key':'ats-team-'+notificationId
        },
        body:JSON.stringify({
          from:senderFrom,
          to:[member.email],
          subject,
          html,
          text:textBody
        })
      })
      const payload=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error('Resend '+response.status+': '+JSON.stringify(payload))
      resendId=clean(payload?.id,200)
      await admin.from('studio_team_notifications').update({
        status:'sent',provider:'resend',provider_id:resendId,error:null,sent_at:new Date().toISOString(),updated_at:new Date().toISOString(),
        metadata:{...(n.metadata||{}),redirect_to:redirectTo}
      }).eq('id',notificationId)
      return json({ok:true,status:'sent',provider:'resend'})
    }catch(e){
      resendError=clean((e as any)?.message||e,1000)
      console.error('ATS Resend notification failed',resendError)
    }

    await admin.from('studio_team_notifications').update({
      status:'failed',provider:'resend',error:resendError,updated_at:new Date().toISOString(),
      metadata:{...(n.metadata||{}),redirect_to:redirectTo}
    }).eq('id',notificationId)
    throw new Error(resendError)
  }catch(e){
    const msg=clean((e as any)?.message||e,1200)
    console.error('ATS team notification failed',msg)
    try{
      const body=await req.clone().json().catch(()=>({}))
      if(body?.notification_id)await admin.from('studio_team_notifications').update({status:'failed',error:msg,updated_at:new Date().toISOString()}).eq('id',body.notification_id)
    }catch{}
    return json({error:msg},500)
  }
})