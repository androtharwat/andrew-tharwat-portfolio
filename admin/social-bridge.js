(() => {
  'use strict';
  if (window.ATS_SOCIAL_BRIDGE_LOADED) return;
  window.ATS_SOCIAL_BRIDGE_LOADED = true;

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const esc = (v='') => String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const sb = () => window.ATS_ADMIN?.getClient?.();
  const notify = (m,t='success') => window.ATS_ADMIN?.notify?.(m,t);
  let currentLeadId = null;
  let currentProjectId = null;
  let busy = false;

  const SOCIAL_TERMS = [
    'social media','social-media','socialmedia','social management','page management','community management',
    'سوشيال','السوشيال','ادارة صفحات','إدارة صفحات','اداره صفحات','إداره صفحات','ادارة السوشيال','إدارة السوشيال',
    'اداره السوشيال','إداره السوشيال','ادارة مواقع التواصل','إدارة مواقع التواصل','اداره مواقع التواصل'
  ];

  function norm(v){return String(v||'').toLowerCase().replace(/\s+/g,' ').trim()}
  function socialSignal(v){
    const x=norm(v);
    return !!x && SOCIAL_TERMS.some(k=>x.includes(k));
  }
  function flatten(v){
    if(v==null)return '';
    if(Array.isArray(v))return v.map(flatten).join(' ');
    if(typeof v==='object')return Object.values(v).map(flatten).join(' ');
    return String(v);
  }
  function detectLanguage(text){
    const s=String(text||'');
    const ar=(s.match(/[\u0600-\u06ff]/g)||[]).length;
    const en=(s.match(/[A-Za-z]/g)||[]).length;
    if(ar>20&&en>20)return 'mixed';
    return ar>=en?'ar':'en';
  }
  function extractLine(text,labels){
    const lines=String(text||'').split(/\r?\n/);
    for(const line of lines){
      for(const label of labels){
        const i=line.toLowerCase().indexOf(label.toLowerCase());
        if(i>=0){
          const value=line.slice(i+label.length).replace(/^\s*[:\-–—]\s*/,'').trim();
          if(value)return value;
        }
      }
    }
    return '';
  }
  function inferPlatforms(text){
    const x=norm(text), out=[];
    if(/facebook|فيسبوك|فيس بوك/.test(x))out.push('facebook');
    if(/instagram|انستجرام|إنستجرام|انستغرام/.test(x))out.push('instagram');
    if(/tiktok|tik tok|تيك توك/.test(x))out.push('tiktok');
    if(/linkedin|لينكد/.test(x))out.push('linkedin');
    if(/youtube|يوتيوب/.test(x))out.push('youtube');
    if(/twitter|\bx\b|تويتر/.test(x))out.push('x');
    return out.length?[...new Set(out)]:['facebook','instagram'];
  }
  function dueIso(project){
    if(project?.due_date){
      const d=new Date(project.due_date+'T17:00:00+03:00');
      if(!Number.isNaN(d.getTime()))return d.toISOString();
    }
    const d=new Date();d.setDate(d.getDate()+30);d.setHours(17,0,0,0);return d.toISOString();
  }

  async function getProjectContext(projectId){
    const client=sb(); if(!client)throw new Error('ATS Control Center is not ready.');
    const p=await client.from('studio_projects').select('*').eq('id',projectId).single();
    if(p.error)throw p.error;
    const project=p.data;
    const [cl,lead,proposal,tasks,streams]=await Promise.all([
      client.from('studio_clients').select('*').eq('id',project.client_id).maybeSingle(),
      project.source_lead_id?client.from('studio_leads').select('*').eq('id',project.source_lead_id).maybeSingle():Promise.resolve({data:null}),
      project.source_proposal_id?client.from('studio_proposals').select('*').eq('id',project.source_proposal_id).maybeSingle():Promise.resolve({data:null}),
      client.from('studio_project_tasks').select('*').eq('project_id',project.id).order('created_at',{ascending:true}),
      client.from('studio_project_workstreams').select('*').eq('project_id',project.id)
    ]);
    const bad=[cl,lead,proposal,tasks,streams].find(x=>x?.error); if(bad)throw bad.error;
    let discovery=null,answers=[],solutions=[];
    if(project.source_lead_id){
      const dc=await client.from('studio_discovery_cases').select('*').eq('lead_id',project.source_lead_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(!dc.error&&dc.data){
        discovery=dc.data;
        const [a,s]=await Promise.all([
          client.from('studio_discovery_answers').select('*').eq('case_id',dc.data.id).order('created_at',{ascending:true}),
          client.from('studio_solution_tasks').select('*').eq('case_id',dc.data.id).order('sort_order',{ascending:true})
        ]);
        if(!a.error)answers=a.data||[];
        if(!s.error)solutions=s.data||[];
      }
    }
    const streamMap=Object.fromEntries((streams.data||[]).map(x=>[x.id,x.name]));
    const projectTasks=(tasks.data||[]).map(t=>({...t,workstream_name:streamMap[t.workstream_id]||''}));
    const brand=await client.from('studio_social_brands').select('*').eq('project_id',project.id).maybeSingle();
    if(brand.error)throw brand.error;
    return {project,client:cl.data||null,lead:lead.data||null,proposal:proposal.data||null,discovery,answers,solutions,projectTasks,brand:brand.data||null};
  }

  function eligible(ctx){
    const pieces=[
      ctx.project?.service_type,ctx.project?.title,ctx.project?.description,ctx.project?.internal_action,
      ctx.lead?.service,ctx.lead?.project_goal,ctx.lead?.ats_understanding,
      ctx.proposal?.title,ctx.proposal?.scope,ctx.proposal?.deliverables,
      ...ctx.solutions.map(x=>[x.title,x.rationale,x.expected_effect]),
      ...ctx.projectTasks.map(x=>[x.title,x.required_skill,x.expected_output,x.workstream_name])
    ];
    return pieces.some(socialSignal);
  }
  function socialTask(ctx){
    const open=x=>!['accepted','closed'].includes(String(x.status||''));
    return ctx.projectTasks.find(t=>open(t)&&String(t.required_skill||'').toLowerCase()==='social media') || null;
  }

  async function teamData(){
    const client=sb();
    const [m,s,t]=await Promise.all([
      client.from('studio_team_members').select('*').eq('active',true).order('full_name'),
      client.from('studio_member_skills').select('*'),
      client.from('studio_project_tasks').select('id,owner_id,status')
    ]);
    const bad=[m,s,t].find(x=>x.error);if(bad)throw bad.error;
    const members=m.data||[], skills=s.data||[], tasks=t.data||[], open=['assigned','in_progress','review'];
    const level=id=>Math.max(0,...skills.filter(x=>x.member_id===id&&String(x.skill||'').toLowerCase()==='social media').map(x=>Number(x.level||0)));
    const load=id=>tasks.filter(x=>x.owner_id===id&&open.includes(x.status)).length;
    const social=members.filter(x=>level(x.id)>0).sort((a,b)=>
      Number(b.available)-Number(a.available) || level(b.id)-level(a.id) || load(a.id)-load(b.id)
    );
    return {members,skills,tasks,social,level,load};
  }

  function snapshot(ctx){
    return {
      captured_at:new Date().toISOString(),
      project:ctx.project,
      client:ctx.client,
      lead:ctx.lead,
      proposal:ctx.proposal,
      discovery:ctx.discovery,
      discovery_answers:ctx.answers,
      approved_solution_tasks:ctx.solutions,
      project_tasks:ctx.projectTasks
    };
  }

  function brandPayload(ctx,ownerId,reviewerId,taskId){
    const allText=[
      ctx.lead?.project_goal,ctx.lead?.ats_understanding,ctx.lead?.service,
      ctx.proposal?.scope,flatten(ctx.proposal?.deliverables),ctx.discovery?.diagnosis_summary,
      ...ctx.answers.map(x=>x.answer)
    ].filter(Boolean).join('\n');
    const company=String(ctx.lead?.company_name||'').trim();
    const name=(company&&company.toLowerCase()!=='individual')?company:(ctx.project?.title||ctx.client?.full_name||'Client Brand');
    const audience=extractLine(ctx.lead?.project_goal,['Audience','الجمهور','الفئة المستهدفة'])||ctx.discovery?.affected_people||'';
    const notes=[
      ctx.lead?.ats_understanding?'ATS understanding: '+ctx.lead.ats_understanding:'',
      ctx.discovery?.diagnosis_summary?'Diagnosis: '+ctx.discovery.diagnosis_summary:'',
      ctx.discovery?.constraints?'Constraints: '+ctx.discovery.constraints:'',
      ctx.lead?.current_assets?.length?'Available assets: '+ctx.lead.current_assets.join(', '):''
    ].filter(Boolean).join('\n');
    const reason=socialSignal([ctx.lead?.service,ctx.lead?.project_goal,ctx.proposal?.scope].join(' '))?'client_request':'project_task';
    return {
      project_id:ctx.project.id,
      client_id:ctx.project.client_id,
      source_lead_id:ctx.project.source_lead_id||null,
      source_task_id:taskId||null,
      responsible_member_id:ownerId||null,
      reviewer_member_id:reviewerId||null,
      name,
      industry:ctx.project.service_type||ctx.lead?.service||null,
      audience:audience||null,
      language:detectLanguage(allText),
      platforms:inferPlatforms(allText),
      primary_goal:ctx.discovery?.desired_outcome||ctx.lead?.project_goal||ctx.project.description||null,
      products_services:ctx.proposal?.scope||ctx.lead?.service||ctx.project.service_type||null,
      content_notes:notes||null,
      brief_snapshot:snapshot(ctx),
      launch_reason:reason,
      launched_at:new Date().toISOString(),
      status:'active',
      updated_at:new Date().toISOString()
    };
  }

  function ensureLaunchDialog(){
    let d=$('#social-bridge-dialog');
    if(d)return d;
    d=document.createElement('dialog');d.id='social-bridge-dialog';d.className='social-dialog social-bridge-dialog';document.body.appendChild(d);
    return d;
  }
  function memberOption(m,team,selected){
    return '<option value="'+esc(m.id)+'" '+(m.id===selected?'selected':'')+'>'+esc(m.full_name+' · Social L'+team.level(m.id)+' · '+team.load(m.id)+'/'+m.capacity+(m.available?'':' · unavailable'))+'</option>';
  }
  function reviewerOption(m,team,selected){
    return '<option value="'+esc(m.id)+'" '+(m.id===selected?'selected':'')+'>'+esc(m.full_name+' · '+team.load(m.id)+'/'+m.capacity)+'</option>';
  }

  async function openLaunch(projectId){
    if(busy)return;
    busy=true;
    try{
      const [ctx,team]=await Promise.all([getProjectContext(projectId),teamData()]);
      if(ctx.brand){openSocial(ctx.brand.id);return;}
      const task=socialTask(ctx);
      const suggestedOwner=(task?.owner_id&&team.members.find(x=>x.id===task.owner_id))?task.owner_id:(team.social.find(x=>x.available&&team.load(x.id)<x.capacity)?.id||team.social[0]?.id||'');
      const suggestedReviewer=task?.reviewer_id||team.members.find(x=>x.id!==suggestedOwner)?.id||'';
      const d=ensureLaunchDialog();
      const signalSource=socialSignal([ctx.lead?.service,ctx.lead?.project_goal,ctx.proposal?.scope].join(' '))?'Client brief / service':'Project task';
      d.innerHTML=
        '<div class="social-dialog-head"><div><span>PROJECT → SOCIAL OS</span><h3>Start Social Operations</h3></div><button type="button" data-social-bridge-close>×</button></div>'+
        '<div class="social-bridge-summary">'+
          '<article><span>BRAND / PROJECT</span><b>'+esc(ctx.lead?.company_name||ctx.project.title)+'</b><small>'+esc(ctx.project.project_code||'Project')+'</small></article>'+
          '<article><span>WHY DETECTED</span><b>'+esc(signalSource)+'</b><small>'+esc(ctx.lead?.service||ctx.project.service_type||'Social media signal')+'</small></article>'+
          '<article><span>BRIEF</span><b>Ready to transfer</b><small>Client + lead + proposal + discovery + tasks</small></article>'+
        '</div>'+
        '<form class="social-form" id="social-bridge-form">'+
          '<label>RESPONSIBLE OWNER<select name="owner_id" required><option value="">Choose owner</option>'+team.social.map(m=>memberOption(m,team,suggestedOwner)).join('')+'</select></label>'+
          '<label>REVIEWER<select name="reviewer_id" required><option value="">Choose reviewer</option>'+team.members.map(m=>reviewerOption(m,team,suggestedReviewer)).join('')+'</select></label>'+
          '<div class="wide social-bridge-hint">The owner is filtered and ranked by <b>Social Media skill → availability → current load</b>. Starting creates/links the Social Operations task and transfers the full brief into Social OS.</div>'+
        '</form>'+
        '<div class="social-dialog-actions"><button type="button" class="social-btn" data-social-bridge-close>CANCEL</button><button type="button" class="social-btn primary" id="social-bridge-start">START SOCIAL OPERATIONS →</button></div>';
      $$('[data-social-bridge-close]',d).forEach(b=>b.onclick=()=>d.close());
      $('#social-bridge-start',d).onclick=()=>launch(ctx,team,d);
      d.showModal();
    }catch(e){notify(e.message||'Could not prepare Social Operations','error')}
    finally{busy=false;}
  }

  async function ensureSocialTask(ctx,ownerId,reviewerId){
    const client=sb();
    let task=socialTask(ctx);
    if(task&&['accepted','closed'].includes(task.status))task=null;
    if(!task){
      const created=await client.rpc('studio_team_command',{p_action:'create_task',p_payload:{
        project_id:ctx.project.id,
        workstream:'Social Media Operations',
        title:'Manage social media · '+(ctx.lead?.company_name||ctx.project.title),
        required_skill:'social media',
        required_level:1,
        base_tokens:30,
        reviewer_id:reviewerId,
        due_at:dueIso(ctx.project),
        expected_output:'Own the linked Social OS workspace: keep the brand brief current, prepare the monthly plan, move content through review and scheduling, and escalate exceptions that need a human decision.',
        acceptance_criteria:'Social OS is kept current; monthly content is planned; approvals are actioned; approved items reach Scheduled/Published; important client or performance issues are escalated.',
        assignment_mode:'direct',
        escalate_hours:24,
        dependencies:[],
        admin_acceptance:true
      }});
      if(created.error)throw created.error;
      task={id:created.data.id,status:'available',owner_id:null,reviewer_id:reviewerId,required_skill:'social media'};
    }
    if(ownerId&&task.owner_id!==ownerId){
      if(task.owner_id&&['assigned','in_progress','review'].includes(task.status)){
        const un=await client.rpc('studio_team_command',{p_action:'unassign',p_payload:{id:task.id,reason:'Reassigned from Social Operations launch'}});
        if(un.error)throw un.error;
        task.owner_id=null;task.status='available';
      }
      if(task.status==='available'){
        const asn=await client.rpc('studio_team_command',{p_action:'assign',p_payload:{id:task.id,member_id:ownerId,override_capacity:false,reason:'Assigned from Social Operations launch'}});
        if(asn.error)throw asn.error;
        task.owner_id=ownerId;task.status=asn.data.status||'assigned';
      }
    }
    return task;
  }

  async function launch(ctx,team,d){
    const f=$('#social-bridge-form',d),fd=new FormData(f);
    const ownerId=fd.get('owner_id')||'',reviewerId=fd.get('reviewer_id')||'';
    if(!ownerId)return notify('Choose the responsible Social Media owner.','error');
    if(!reviewerId)return notify('Choose a reviewer.','error');
    if(ownerId===reviewerId)return notify('Owner and reviewer must be different.','error');
    const owner=team.members.find(x=>x.id===ownerId);
    if(!owner?.available)return notify('Chosen owner is currently unavailable.','error');
    const btn=$('#social-bridge-start',d);btn.disabled=true;btn.textContent='STARTING…';
    try{
      const task=await ensureSocialTask(ctx,ownerId,reviewerId);
      const payload=brandPayload(ctx,ownerId,reviewerId,task.id);
      let result;
      const existing=await sb().from('studio_social_brands').select('*').eq('project_id',ctx.project.id).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data){
        result=await sb().from('studio_social_brands').update(payload).eq('id',existing.data.id).select('*').single();
      }else{
        result=await sb().from('studio_social_brands').insert(payload).select('*').single();
      }
      if(result.error)throw result.error;
      await sb().from('studio_activity').insert({actor_type:'admin',entity_type:'project',entity_id:ctx.project.id,action:'social_ops_started',metadata:{brand_id:result.data.id,task_id:task.id,owner_id:ownerId,reviewer_id:reviewerId,launch_reason:payload.launch_reason}});
      d.close();
      notify('Social Operations started · brief transferred · owner assigned.');
      refreshLeadButton();refreshProjectButton();
      openSocial(result.data.id);
    }catch(e){notify(e.message||'Could not start Social Operations','error')}
    finally{btn.disabled=false;btn.textContent='START SOCIAL OPERATIONS →';}
  }

  function openSocial(brandId){
    sessionStorage.setItem('ats_social_open_brand',brandId);
    const nav=$('#admin-nav button[data-tab="social"]');
    if(nav)nav.click();
    setTimeout(()=>{
      window.dispatchEvent(new CustomEvent('ats-social-open-brand',{detail:{brandId}}));
      window.ATS_SOCIAL_OS?.openBrand?.(brandId);
    },250);
  }

  function injectLeadButton(){
    if($('#lead-social-bridge-button'))return;
    const primary=$('#lead-execution-primary');if(!primary)return;
    const b=document.createElement('button');
    b.id='lead-social-bridge-button';b.type='button';b.className='secondary hidden';b.textContent='START SOCIAL OPS';
    primary.parentElement.insertBefore(b,primary);
    b.onclick=()=>b.dataset.projectId&&openLaunch(b.dataset.projectId);
  }
  function injectProjectButton(){
    if($('#open-project-social-ops'))return;
    const tasks=$('#open-project-team-tasks');if(!tasks)return;
    const b=document.createElement('button');
    b.id='open-project-social-ops';b.type='button';b.className='secondary hidden';b.textContent='START SOCIAL OPS';
    tasks.parentElement.insertBefore(b,tasks.nextSibling);
    b.onclick=()=>b.dataset.projectId&&openLaunch(b.dataset.projectId);
  }

  async function refreshLeadButton(){
    injectLeadButton();
    const b=$('#lead-social-bridge-button');if(!b||!currentLeadId||!sb())return;
    const p=await sb().from('studio_projects').select('id').eq('source_lead_id',currentLeadId).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(p.error||!p.data){b.classList.add('hidden');return}
    try{
      const ctx=await getProjectContext(p.data.id);
      if(!ctx.brand&&!eligible(ctx)){b.classList.add('hidden');return}
      b.dataset.projectId=p.data.id;b.classList.remove('hidden');
      b.textContent=ctx.brand?'OPEN SOCIAL OPS →':'START SOCIAL OPS →';
      b.onclick=()=>ctx.brand?openSocial(ctx.brand.id):openLaunch(p.data.id);
    }catch(_){b.classList.add('hidden')}
  }

  async function resolveCurrentProject(){
    const code=$('#studio-project-code')?.textContent?.trim();
    if(code&&code!=='PROJECT'&&sb()){
      const r=await sb().from('studio_projects').select('id').eq('project_code',code).maybeSingle();
      if(!r.error&&r.data){currentProjectId=r.data.id;return currentProjectId;}
    }
    return currentProjectId;
  }
  async function refreshProjectButton(){
    injectProjectButton();
    const b=$('#open-project-social-ops');if(!b||!sb())return;
    const projectId=await resolveCurrentProject();
    if(!projectId){b.classList.add('hidden');return}
    try{
      const ctx=await getProjectContext(projectId);
      if(!ctx.brand&&!eligible(ctx)){b.classList.add('hidden');return}
      b.dataset.projectId=projectId;b.classList.remove('hidden');
      b.textContent=ctx.brand?'OPEN SOCIAL OPS →':'START SOCIAL OPS →';
      b.onclick=()=>ctx.brand?openSocial(ctx.brand.id):openLaunch(projectId);
    }catch(_){b.classList.add('hidden')}
  }

  function bind(){
    injectLeadButton();injectProjectButton();
    document.addEventListener('click',e=>{
      const lead=e.target.closest('[data-open-lead],[data-priority-lead],[data-inbox-lead]');
      if(lead){
        currentLeadId=lead.dataset.openLead||lead.dataset.priorityLead||lead.dataset.inboxLead||null;
        setTimeout(refreshLeadButton,250);
      }
      const project=e.target.closest('[data-open-studio-project],[data-inbox-project]');
      if(project){
        currentProjectId=project.dataset.openStudioProject||project.dataset.inboxProject||null;
        setTimeout(refreshProjectButton,250);
      }
      if(e.target.closest('#lead-execution-primary'))setTimeout(refreshLeadButton,900);
    },true);
    const leadDialog=$('#lead-dialog');
    if(leadDialog)new MutationObserver(()=>{if(leadDialog.hasAttribute('open'))setTimeout(refreshLeadButton,120)}).observe(leadDialog,{attributes:true,attributeFilter:['open']});
    const projectDialog=$('#studio-project-dialog');
    if(projectDialog)new MutationObserver(()=>{if(projectDialog.hasAttribute('open'))setTimeout(refreshProjectButton,120)}).observe(projectDialog,{attributes:true,attributeFilter:['open']});
  }

  function init(){
    if(!sb())return;
    bind();
    window.ATS_SOCIAL_BRIDGE=Object.freeze({openLaunch,openSocial,refreshLeadButton,refreshProjectButton});
  }
  window.addEventListener('ats-admin-ready',init,{once:true});
  if(window.ATS_ADMIN?.getClient?.())setTimeout(init,0);
})();