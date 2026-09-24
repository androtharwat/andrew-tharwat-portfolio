const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

// Integration harness executes the shipped scripts with a fake Supabase boundary.
// It never sends email, uses real credentials, or claims end-to-end delivery coverage.
async function harness(kind, options = {}) {
  const elements = new Map(), timers = [], calls = [], logs = [];
  let focused;
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      const handlers = {};
      const el = { id, value: '', textContent: '', innerHTML: '', disabled: false, style: {}, dataset: {},
        classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle: (x, flag) => flag ? classes.add(x) : classes.delete(x) },
        setAttribute: (k,v) => { el[k] = v; },
        addEventListener: (event, fn) => { handlers[event] = fn; },
        focus: () => { focused = id; },
        closest: () => ({ querySelector: () => element(id + '-label') }),
        querySelector: () => null,
        fire: async event => handlers[event]?.({target:el, preventDefault(){}})
      };
      elements.set(id, el);
    }
    return elements.get(id);
  }
  const client = {
    auth: {
      getSession: async () => ({data:{session:null}}),
      signInWithOtp: async args => { calls.push(['send', args]); return {error:options.sendError || null}; },
      verifyOtp: async args => { calls.push(['verify', args]); return {error:options.verifyError || null}; },
      signOut: async () => { calls.push(['signOut']); },
      onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}})
    },
    rpc: async name => { calls.push(['rpc',name]); return {error:options.lookupError || null, data: kind==='access' ? {mode:options.mode || 'prospect',lead:{full_name:'Test'}} : 'test-client'}; },
    from: table => {
      const result = {data:table==='studio_clients'?{id:'test-client',full_name:'Test Client',email:'test@example.com'}:[],error:null};
      const q = {select:()=>q,eq:()=>q,order:()=>q,maybeSingle:async()=>result,then:(resolve,reject)=>Promise.resolve(result).then(resolve,reject)};
      return q;
    }
  };
  const window = {PORTFOLIO_CONFIG:{supabaseUrl:'https://example.invalid',supabaseKey:'test-key'},supabase:{createClient:()=>{calls.push(['createClient']);return client;}},addEventListener(){},scrollTo(){}};
  const context = vm.createContext({window, document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},
    console:{error:(...a)=>logs.push(a)},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
    location:{hash:'',replace:url=>calls.push(['redirect',url])},history:{replaceState(){}},localStorage:{getItem:()=>null},Intl,URLSearchParams});
  for (const file of ['auth-otp-config.js','auth-client.js',kind==='access'?'client-access/access.js':'client-v9/portal-live.js']) vm.runInContext(source(file),context,{filename:file});
  await new Promise(resolve=>setImmediate(resolve));
  const ids = kind==='access'?{email:'#access-email',otp:'#access-otp',send:'#send-code',verify:'#verify-code',state:'#auth-state',wrap:'#otp-wrap'}:{email:'#portal-email',otp:'#portal-otp',send:'#send-otp',verify:'#verify-otp',state:'#portal-auth-state',wrap:'#otp-step'};
  const e = Object.fromEntries(Object.entries(ids).map(([k,v])=>[k,element(v)]));
  return {e,calls,logs,window,context,focused:()=>focused,timers,async send(){e.email.value='test@example.com';await e.send.fire('click');},async enter(value){e.otp.value=value;await e.otp.fire('input');},run:file=>vm.runInContext(source(file),context,{filename:file})};
}
for (const kind of ['access','portal']) {
  test(`${kind}: 7 rejected, 8 verified, 9 truncated, non-digits removed`,async()=>{
    const h=await harness(kind);await h.send();
    assert.equal(h.e.otp.maxLength,8);assert.equal(h.e.otp.minLength,8);assert.equal(h.e.otp.pattern,'[0-9]{8}');assert.equal(h.e.otp.placeholder,'00000000');
    await h.enter('1234567');await h.e.verify.fire('click');
    assert.equal(h.calls.filter(x=>x[0]==='verify').length,0);assert.match(h.e.state.textContent,/8-digit/);
    await h.enter('123456789');assert.equal(h.e.otp.value,'12345678');
    await h.enter('a12b34-56 78z');assert.equal(h.e.otp.value,'12345678');
    await h.enter('01234567');await h.e.verify.fire('click');
    const args=h.calls.find(x=>x[0]==='verify')[1];assert.equal(args.token,'01234567');assert.equal(args.email,'test@example.com');assert.equal(args.type,'email');
    assert.ok(h.calls.some(x=>x[0]==='rpc'));
  });
  test(`${kind}: changed email requires a new code`,async()=>{
    const h=await harness(kind);await h.send();await h.enter('12345678');h.e.email.value='other@example.com';await h.e.email.fire('input');await h.e.verify.fire('click');
    assert.equal(h.e.otp.value,'');assert.ok(h.e.wrap.classList.contains('hidden'));assert.equal(h.calls.filter(x=>x[0]==='verify').length,0);
  });
  test(`${kind}: invalid email focuses missing field and sends nothing`,async()=>{
    const h=await harness(kind);h.e.email.value='bad@';await h.e.send.fire('click');assert.equal(h.focused(),h.e.email.id);assert.equal(h.calls.filter(x=>x[0]==='send').length,0);
  });
  test(`${kind}: send failure is friendly and diagnosable`,async()=>{
    const h=await harness(kind,{sendError:{code:'unexpected_failure',status:500,message:'SMTP refused'}});await h.send();assert.match(h.e.state.textContent,/couldn’t send/);assert.ok(h.logs.some(x=>x[0]==='ATS auth: send'));assert.equal(h.e.email.disabled,false);assert.equal(h.e.send.disabled,false);
  });
  test(`${kind}: invalid OTP never performs lookup`,async()=>{
    const h=await harness(kind,{verifyError:{code:'otp_expired',message:'Expired'}});await h.send();await h.enter('12345678');await h.e.verify.fire('click');assert.match(h.e.state.textContent,/could not be verified/);assert.equal(h.calls.filter(x=>x[0]==='rpc').length,0);
  });
  test(`${kind}: database error is not mislabeled as an invalid code or missing client`,async()=>{
    const h=await harness(kind,{lookupError:{code:'42883',message:'function min(uuid) does not exist'}});await h.send();await h.enter('12345678');await h.e.verify.fire('click');assert.match(h.e.state.textContent,/signed in.*couldn’t load/);assert.ok(h.logs.some(x=>x[0]==='ATS auth: lookup'));assert.equal(h.calls.filter(x=>x[0]==='signOut').length,0);
  });
}
test('portal: prospect retains session and is routed to request lookup',async()=>{
  const h=await harness('portal',{lookupError:{code:'P0002'}});await h.send();await h.enter('12345678');await h.e.verify.fire('click');assert.ok(h.calls.some(x=>x[0]==='redirect'&&x[1]==='/client-access/'));assert.equal(h.calls.filter(x=>x[0]==='signOut').length,0);
});
test('access: client routes to full portal',async()=>{
  const h=await harness('access',{mode:'client'});await h.send();await h.enter('12345678');await h.e.verify.fire('click');h.timers.forEach(fn=>fn());assert.ok(h.calls.some(x=>x[0]==='redirect'&&x[1]==='/client-v9/'));
});
test('portal extensions share one Supabase client',async()=>{
  const h=await harness('portal');h.run('client-v9/portal-hse.js');h.run('client-v9/portal-files-live.js');assert.equal(h.calls.filter(x=>x[0]==='createClient').length,1);
});
test('entry points load the shared runtime first and pin the SDK',()=>{
  for(const file of ['client-access/index.html','client-v9/index.html']){
    const html=source(file);assert.match(html,/@supabase\/supabase-js@2\.117\.1"/);assert.ok(html.indexOf('/auth-client.js?v=1')<html.indexOf(file.startsWith('client-access')?'/client-access/access.js?v=5':'/client-v9/portal-live.js?v=6'));
  }
});
