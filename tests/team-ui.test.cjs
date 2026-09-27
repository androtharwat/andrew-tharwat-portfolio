// Browser + actual PostgreSQL command tests; only Auth/HTTP infrastructure is stubbed.
// Requires ATS_PGLITE_MODULE, ATS_SUPABASE_UMD, CODEX_PRIMARY_RUNTIME_NODE_MODULES.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const http=require('http');const server=http.createServer((req,res)=>{let file=path.join(__dirname,'..',decodeURIComponent(new URL(req.url,'http://local').pathname));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(3010,'127.0.0.1',r));
const {PGlite}=await import(process.env.ATS_PGLITE_MODULE);const db=new PGlite();
await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/team-bootstrap.sql'),'utf8'));
await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260927071736_ats_team_task_engine_v1.sql'),'utf8'));
const adminIdentity="reset role;select set_config('test.admin','true',false),set_config('request.uid','',false);set role anon;";
const makerUid='20000000-0000-0000-0000-000000000001';
const cmd=async(a,p)=>(await db.query('select public.studio_team_command($1,$2::jsonb) result',[a,JSON.stringify(p)])).rows[0].result;
await db.exec(adminIdentity);
const maker=(await cmd('save_member',{full_name:'Pilot Designer',email:'maker@test.invalid',skills:[{skill:'design',level:4}]})).id;
const reviewer=(await cmd('save_member',{full_name:'Pilot Reviewer',email:'reviewer@test.invalid',skills:[{skill:'design',level:5}]})).id;
const packaged=process.env.ATS_CHROMIUM_MODULE?require(process.env.ATS_CHROMIUM_MODULE):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.ATS_CHROMIUM_PATH||(packaged?await packaged.executablePath():undefined),args:packaged?packaged.args:['--no-sandbox']});
const adminPage=await browser.newPage({viewport:{width:1440,height:1000}}),memberPage=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
let queue=Promise.resolve();
async function setup(page,isAdmin){
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(process.env.ATS_SUPABASE_UMD,'utf8')}));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:''}));
 await page.route('https://sivyynuhluhvjcdicwxn.supabase.co/**',async route=>{
  const job=async()=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.startsWith('/auth/v1/')){
    const token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:makerUid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
    return route.fulfill({contentType:'application/json',body:JSON.stringify(url.pathname.includes('verify')?{access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:makerUid,email:'maker@test.invalid',aud:'authenticated'}}:{})});
   }
   try{
    await db.exec(isAdmin?adminIdentity:`reset role;select set_config('test.admin','false',false),set_config('request.uid','${makerUid}',false);set role authenticated;`);
    if(url.pathname.includes('/rpc/')){
     const name=url.pathname.split('/').pop();const p=req.postDataJSON()||{};
     const result=name==='studio_team_command'?await cmd(p.p_action,p.p_payload):name==='studio_team_context'?(await db.query('select public.studio_team_context() result')).rows[0].result:null;
     return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
    }
    const table=url.pathname.split('/').pop();let result;
    if(table==='portfolio_trusted_devices')result={status:'approved',claim_code:'123456'};
    else if(table.startsWith('studio_')&&['studio_project_tasks','studio_team_members','studio_member_skills','studio_project_workstreams','studio_token_ledger','studio_task_events','studio_task_dependencies','studio_projects'].includes(table)){
      result=(await db.query(`select * from public.${table}`)).rows;
    }else result=[];
    return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
   }catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:e.code})});}
  };
  const next=queue.then(job,job);queue=next.catch(()=>{});await next;
 });
 if(isAdmin)await page.addInitScript(()=>{localStorage.setItem('andrew_portfolio_device_v2',JSON.stringify({id:'test',secret:'test'}));sessionStorage.setItem('ats_v9_live_db_boot_v1','1');});
}
await setup(adminPage,true);await setup(memberPage,false);
await adminPage.goto('http://127.0.0.1:3010/admin/studio-v9.html#team');
await adminPage.locator('[data-team-action=task]').waitFor({state:'visible'});
await adminPage.getByRole('button',{name:'+ Task',exact:true}).click();
const form=adminPage.locator('#team-dialog');
await form.getByLabel('Workstream',{exact:true}).fill('Creative');
await form.getByLabel('Task name',{exact:true}).fill('Pilot safety poster');
await form.getByLabel('Required skill',{exact:true}).fill('design');
await form.getByLabel('Reviewer',{exact:true}).selectOption(reviewer);
await form.getByLabel('Deadline',{exact:true}).fill('2026-10-01T15:00');
await form.getByLabel('Expected output',{exact:true}).fill('Print-ready A4 safety poster');
await form.getByLabel('Acceptance criteria',{exact:true}).fill('Readable Arabic and English, correct PPE, no invented logo');
await form.getByRole('button',{name:'Create task',exact:true}).click();
await form.waitFor({state:'hidden'});
await adminPage.getByRole('heading',{name:'Pilot safety poster',exact:true}).waitFor();
await adminPage.screenshot({path:path.join(process.env.ATS_TEST_ARTIFACTS||'/tmp','admin-team.png'),fullPage:true});
console.log('PASS Admin creates task through existing Studio OS');
await adminPage.getByRole('button',{name:'Edit',exact:true}).click();
await form.getByLabel('Reason for scope change').fill('Clarify output');
await form.getByRole('button',{name:'Save changes',exact:true}).click();await form.waitFor({state:'hidden'});
console.log('PASS Edit retains locked project in form payload');
await memberPage.goto('http://127.0.0.1:3010/team-v9/');
await memberPage.getByLabel('Email',{exact:true}).fill('maker@test.invalid');await memberPage.getByRole('button',{name:'Send login code'}).click();
await memberPage.getByLabel('Login code').fill('12345678');await memberPage.getByRole('button',{name:'Verify & sign in'}).click();
await memberPage.getByRole('button',{name:'Take task',exact:true}).waitFor();
await memberPage.getByRole('button',{name:'Take task',exact:true}).click();await memberPage.locator('#team-dialog').getByRole('button',{name:'Take task',exact:true}).click();await memberPage.locator('#team-dialog').waitFor({state:'hidden'});
await memberPage.getByRole('button',{name:'My work',exact:true}).click();
await memberPage.getByRole('button',{name:'Start task',exact:true}).click();await memberPage.locator('#team-dialog').getByRole('button',{name:'Start task',exact:true}).click();await memberPage.locator('#team-dialog').waitFor({state:'hidden'});
await memberPage.getByRole('button',{name:'Submit for review',exact:true}).click();await memberPage.getByLabel('Delivery evidence / link').fill('https://example.com/approved-poster.pdf');await memberPage.locator('#team-dialog').getByRole('button',{name:'Submit for review',exact:true}).click();await memberPage.locator('#team-dialog').waitFor({state:'hidden'});
console.log('PASS Member OTP form, claim, start, submit through actual SQL engine');
await adminPage.getByRole('button',{name:'Refresh',exact:true}).click();await adminPage.getByRole('button',{name:'Accept',exact:true}).waitFor();await adminPage.getByRole('button',{name:'Accept',exact:true}).click();await adminPage.getByLabel('I checked the output against the acceptance criteria').check();await form.getByRole('button',{name:'Accept & earn tokens'}).click();await form.waitFor({state:'hidden'});
await memberPage.getByRole('button',{name:'Refresh',exact:true}).click();await memberPage.getByRole('button',{name:'Wallet',exact:true}).click();
await memberPage.getByText('EARNED · 10 tokens',{exact:true}).waitFor();console.log('PASS Acceptance credits member wallet');
await memberPage.setViewportSize({width:390,height:844});await memberPage.screenshot({path:path.join(process.env.ATS_TEST_ARTIFACTS||'/tmp','member-wallet-mobile.png'),fullPage:true});
assert.equal(await memberPage.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'mobile viewport must not overflow');
assert.deepEqual(errors,[]);console.log('PASS Mobile layout and no page errors');
await browser.close();await db.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
