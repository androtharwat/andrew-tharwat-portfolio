const {test}=require('node:test');const assert=require('node:assert/strict');const {createHandler,validateLead}=require('../server/move-now.cjs');
const envKeys=['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','MOVE_NOW_OWNER_EMAIL','SITE_URL'];
const lead=()=>({id:'12345678-1234-4123-8123-123456789abc',name:'عميل اختبار',phone:'01012345678',service:'buy',details:{location:'القاهرة',type:'شقة',timeline:'خلال شهر',contactTime:'أي وقت مناسب',budget:'3 مليون',purpose:'سكن'},consent:true,website:''});
const fakeResponse=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
async function run({method='GET',resource='leads',body,token,origin='https://ats-at-studio4.vercel.app',fetchImpl=async()=>{throw Error('unexpected database access')}}={}){const prior=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-server-key';process.env.MOVE_NOW_OWNER_EMAIL='owner@example.com';process.env.SITE_URL=origin;const req={method,query:{resource},body,headers:{host:'ats-at-studio4.vercel.app',origin,'x-vercel-forwarded-for':'192.0.2.1',...(token?{authorization:'Bearer '+token}:{})}};let result;const res={setHeader(){},status(status){return {json(data){result={status,data}}}}};try{await createHandler({fetchImpl})(req,res);return result;}finally{for(const k of envKeys)if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}}
const owner=()=>fakeResponse({id:'owner-id',email:'owner@example.com',email_confirmed_at:'2026-01-01'});
test('Move Now: all service flows preserve required property fields and normalize Egyptian phone',()=>{const p=lead();assert.equal(validateLead(p).phone,'+201012345678');for(const service of ['rent','both']){const d={...p,service,details:{...p.details,area:'120',condition:'طوب أحمر'}};assert.equal(validateLead(d).service,service);delete d.details.condition;assert.throws(()=>validateLead(d));}const b=lead();delete b.details.budget;assert.throws(()=>validateLead(b));});
test('Move Now: reject missing consent, unknown data and honeypot submissions',()=>{for(const update of [{consent:false},{website:'spam'},{extra:'unknown'},{phone:'invalid'},{details:{...lead().details,unknown:'bad'}},{details:{...lead().details,rooms:'-2'}}])assert.throws(()=>validateLead({...lead(),...update}));});
test('Move Now: anonymous visitors cannot list leads or team',async()=>{for(const resource of ['leads','admins','session'])assert.equal((await run({resource})).status,401);});
test('Move Now: invalid or unconfirmed identity cannot access records',async()=>{assert.equal((await run({token:'bad',fetchImpl:async()=>fakeResponse({},401)})).status,401);assert.equal((await run({token:'unconfirmed',fetchImpl:async()=>fakeResponse({id:'u',email:'owner@example.com'})})).status,403);});
test('Move Now: verified nonmember cannot read client records',async()=>{const calls=[];const r=await run({token:'nonmember',fetchImpl:async url=>{calls.push(url);return url.includes('/auth/v1/user')?fakeResponse({id:'u',email:'stranger@example.com',email_confirmed_at:'yes'}):fakeResponse([])}});assert.equal(r.status,403);assert.ok(calls.every(u=>!u.includes('/move_now_leads')));});
test('Move Now: public submission writes normalized data without exposing server credentials',async()=>{const calls=[];const r=await run({method:'POST',body:lead(),fetchImpl:async(url,init)=>{calls.push({url,init});if(url.includes('submission_attempt'))return fakeResponse(1);if(init.method==='POST')return fakeResponse(null,201);return fakeResponse([])}});assert.equal(r.status,201);assert.deepEqual(r.data,{id:lead().id});const write=calls.find(c=>c.url.endsWith('/move_now_leads')&&c.init.method==='POST');assert.equal(JSON.parse(write.init.body).phone,'+201012345678');assert.ok(!JSON.stringify(r).includes('unit-test-server-key'));});
test('Move Now: rate limiting prevents inserting an eleventh submission',async()=>{let inserted=false;const r=await run({method:'POST',body:lead(),fetchImpl:async(url,init)=>{if(url.includes('submission_attempt'))return fakeResponse(11);if(init.method==='POST'){inserted=true;return fakeResponse(null,201)}return fakeResponse([])}});assert.equal(r.status,429);assert.equal(inserted,false);});
test('Move Now: only the owner can edit team membership',async()=>{let write=false;const r=await run({method:'POST',resource:'admins',token:'member',body:{email:'new@example.com',name:'عضو'},fetchImpl:async(url,init)=>{if(url.includes('/auth/v1/user'))return fakeResponse({id:'m',email:'member@example.com',email_confirmed_at:'yes'});if(init.method==='POST')write=true;return fakeResponse([{email:'member@example.com'}])}});assert.equal(r.status,403);assert.equal(write,false);});
test('Move Now: a stale follow-up returns conflict instead of overwriting',async()=>{const r=await run({method:'PATCH',token:'owner',body:{id:lead().id,status:'contacted',assigned:'',notes:'note',nextFollowup:'',updatedAt:1},fetchImpl:async url=>url.includes('/auth/v1/user')?owner():fakeResponse([])});assert.equal(r.status,409);});
test('Move Now: owner lookup is verified by the auth server',async()=>{let authChecked=false;const r=await run({resource:'session',token:'owner',fetchImpl:async url=>{assert.ok(url.includes('/auth/v1/user'));authChecked=true;return owner()}});assert.equal(r.status,200);assert.equal(r.data.owner,true);assert.equal(authChecked,true);});
test('Move Now: a cross-origin write is rejected before reading records',async()=>{const prior=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';let called=false;let result;try{await createHandler({fetchImpl:async()=>{called=true;throw Error('must not run')}})({method:'POST',query:{resource:'leads'},body:lead(),headers:{host:'ats-at-studio4.vercel.app',origin:'https://attacker.example'}},{setHeader(){},status(status){return {json(data){result={status,data}}}}});assert.equal(result.status,403);assert.equal(called,false);}finally{if(prior===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=prior;}});
test('Move Now: native Vercel request URL keeps routing, filters and paging with a modern server key',async()=>{
 const prior=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
 process.env.SUPABASE_SECRET_KEY='unit-test-modern-secret';delete process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.MOVE_NOW_OWNER_EMAIL='owner@example.com';
 let result;let requestedList=false;
 try{await createHandler({fetchImpl:async(url,init)=>{
  if(url.includes('/auth/v1/user'))return owner();
  assert.equal(init.headers.apikey,'unit-test-modern-secret');
  if(url.includes('/rpc/move_now_stats'))return fakeResponse([{status:'contacted',count:1}]);
  const params=new URL(url).searchParams;requestedList=true;
  assert.equal(params.get('status'),'eq.contacted');assert.equal(params.get('service'),'eq.buy');assert.equal(params.get('offset'),'50');assert.ok(params.get('or').includes('Cairo'));
  return fakeResponse([{id:lead().id}],200,{'content-range':'0-0/51'});
 }})({method:'GET',url:'/api/move-now?resource=leads&status=contacted&service=buy&page=1&q=Cairo',headers:{host:'atstudioimpact.com',authorization:'Bearer verified-user'}},{setHeader(){},status(status){return {json(data){result={status,data}}}}});
 assert.equal(result.status,200);assert.equal(result.data.total,51);assert.equal(result.data.owner,true);assert.equal(requestedList,true);assert.ok(!JSON.stringify(result).includes('unit-test-modern-secret'));
 }finally{for(const k of envKeys)if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}
});

const scenarios={
 buy_cash:{location:'القاهرة',type:'شقة',purpose:'سكن شخصي',delivery:'استلام فوري',budget:'3 مليون',timeline:'خلال شهر',contactTime:'أي وقت مناسب'},
 buy_installments:{location:'القاهرة',type:'شقة',purpose:'استثمار',delivery:'تحت الإنشاء',downPayment:'500000',monthlyInstallment:'15000',installmentYears:'7',timeline:'خلال شهر',contactTime:'أي وقت مناسب'},
 finish:{location:'القاهرة',type:'شقة',area:'120',condition:'طوب أحمر',finishLevel:'متوسط',purpose:'سكن شخصي',timeline:'خلال شهر',contactTime:'أي وقت مناسب'},
 finish_sale:{location:'القاهرة',type:'شقة',area:'120',condition:'محارة',finishLevel:'فاخر',salePrice:'4 مليون',saleTimeline:'بمجرد انتهاء التشطيب',timeline:'خلال شهر',contactTime:'أي وقت مناسب'},
 finish_rent:{location:'القاهرة',type:'شقة',area:'120',condition:'تشطيب جزئي',finishLevel:'عملي واقتصادي',furnished:'بدون أثاث',rentType:'إيجار طويل المدة',rentExpected:'15000 شهريًا',timeline:'خلال شهر',contactTime:'أي وقت مناسب'},
 finish_furnish_rent:{location:'القاهرة',type:'شقة',area:'120',condition:'طوب أحمر',finishLevel:'متوسط',furnitureScope:'فرش كامل من البداية',furnitureBudget:'200000',furnitureStyle:'عملي ومناسب للتأجير',rentType:'إيجار قصير المدة',timeline:'خلال شهر',contactTime:'أي وقت مناسب'}
};
for(const [service,details] of Object.entries(scenarios))test('Move Now: '+service+' persists its complete distinct intake data',async()=>{
 const request={...lead(),service,details};let inserted;
 const result=await run({method:'POST',body:request,fetchImpl:async(url,init)=>{
  if(url.includes('submission_attempt'))return fakeResponse(1);
  if(init.method==='POST'){inserted=JSON.parse(init.body);return fakeResponse(null,201);}
  return fakeResponse([]);
 }});
 assert.equal(result.status,201);assert.equal(inserted.service,service);assert.deepEqual(JSON.parse(inserted.details),details);
});
test('Move Now: required payment, sale, rental and furnishing details cannot be omitted',()=>{
 for(const [service,key] of [['buy_cash','budget'],['buy_installments','downPayment'],['buy_installments','monthlyInstallment'],['buy_installments','delivery'],['finish','purpose'],['finish_sale','saleTimeline'],['finish_rent','rentType'],['finish_furnish_rent','furnitureScope']]){
  const details={...scenarios[service]};delete details[key];assert.throws(()=>validateLead({...lead(),service,details}),undefined,service+': '+key);
 }
});
test('Move Now: rejects details from other service paths and invalid payment numbers',()=>{
 for(const [service,extra] of [['buy_cash',{downPayment:'100000'}],['finish_sale',{rentType:'إيجار طويل المدة'}],['finish_rent',{furnitureScope:'فرش كامل من البداية'}],['buy_installments',{downPayment:'-1'}],['buy_installments',{monthlyInstallment:'0'}],['buy_installments',{installmentYears:'99'}],['finish_rent',{rentType:'unknown'}]])assert.throws(()=>validateLead({...lead(),service,details:{...scenarios[service],...extra}}));
});
