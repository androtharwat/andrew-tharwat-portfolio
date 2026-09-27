(() => {
  const POLICY_VERSION='ATS-TEAM-POLICY-V1-2026-09-27';
  const cfg=window.PORTFOLIO_CONFIG;
  const form=document.getElementById('join-form');
  const state=document.getElementById('form-state');
  const submit=document.getElementById('submit-application');
  const startedAt=Date.now();
  let sb=null;
  let supabasePromise=null;

  function makeClient(){
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey||!window.supabase) throw new Error('ATS form configuration unavailable');
    return window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }

  function loadSupabase(){
    if(sb)return Promise.resolve(sb);
    if(supabasePromise)return supabasePromise;
    supabasePromise=new Promise((resolve,reject)=>{
      if(window.supabase){
        try{sb=makeClient();resolve(sb)}catch(error){reject(error)}
        return;
      }
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async=true;
      script.onload=()=>{try{sb=makeClient();resolve(sb)}catch(error){reject(error)}};
      script.onerror=()=>reject(new Error('Could not load secure form connection'));
      document.head.appendChild(script);
    });
    return supabasePromise;
  }

  const value=id=>document.getElementById(id)?.value?.trim()||'';
  const checked=(selector)=>[...document.querySelectorAll(selector+ ' input[type="checkbox"]:checked')].map(x=>x.value);
  const splitSkills=()=>value('additional_skills').split(',').map(x=>x.trim()).filter(Boolean).slice(0,30);

  function setState(message,error=true){
    state.textContent=message||'';
    state.style.color=error?'#ffb7a9':'#9ad7b0';
  }

  function validUrl(id){
    const v=value(id); if(!v)return null;
    try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.toString():null}catch{return false}
  }

  form?.addEventListener('focusin',()=>{loadSupabase().catch(()=>{})},{once:true,passive:true});
  form?.addEventListener('pointerdown',()=>{loadSupabase().catch(()=>{})},{once:true,passive:true});

  form?.addEventListener('submit',async e=>{
    e.preventDefault();
    setState('');
    if(value('website_confirm'))return;
    if(Date.now()-startedAt<2500)return setState('راجع البيانات ثم أرسل الطلب.');

    const full=value('full_name');
    const email=value('email').toLowerCase();
    const specialty=value('primary_specialty');
    const skills=checked('#skill-domains');
    const signature=value('digital_signature');

    if(!full||!email||!specialty)return setState('أكمل البيانات الأساسية المطلوبة.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setState('اكتب بريد إلكتروني صحيح.');
    if(!skills.length)return setState('اختار مجال خبرة واحد على الأقل.');
    if(!document.querySelector('input[name="level"]:checked'))return setState('حدد مستوى مسؤوليتك الحالي.');
    if(!document.getElementById('policy_agree').checked)return setState('لازم تقرأ وتوافق على سياسة ATS قبل الإرسال.');
    if(signature.toLocaleLowerCase()!==full.toLocaleLowerCase())return setState('التوقيع الرقمي لازم يطابق الاسم بالكامل.');

    const urls={portfolio:validUrl('portfolio_url'),linkedin:validUrl('linkedin_url'),github:validUrl('github_url'),website:validUrl('website_url')};
    if(Object.values(urls).includes(false))return setState('راجع روابط الأعمال والحسابات واستخدم رابط يبدأ بـ https://');

    submit.disabled=true;
    submit.textContent='جاري إرسال الطلب…';

    try{
      const client=await loadSupabase();
      const {data,error}=await client.rpc('studio_submit_team_application',{
        p_full_name:full,
        p_email:email,
        p_phone:value('phone')||null,
        p_city_country:value('city_country')||null,
        p_primary_specialty:specialty,
        p_skill_domains:skills,
        p_additional_skills:splitSkills(),
        p_years_experience:value('years_experience')?Number(value('years_experience')):null,
        p_portfolio_url:urls.portfolio||null,
        p_linkedin_url:urls.linkedin||null,
        p_github_url:urls.github||null,
        p_website_url:urls.website||null,
        p_tools:value('tools')||null,
        p_english_level:value('english_level')||null,
        p_weekly_availability:value('weekly_availability')||null,
        p_preferred_work_times:checked('#preferred-times'),
        p_capability_level:document.querySelector('input[name="level"]:checked')?.value||null,
        p_work_preferences:checked('#work-preferences'),
        p_note:value('note')||null,
        p_policy_version:POLICY_VERSION,
        p_digital_signature:signature,
        p_source_path:location.pathname
      });
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      document.getElementById('application-code').textContent=row?.application_code||'ATS-JOIN';
      form.classList.add('hidden');
      document.getElementById('success-panel').classList.remove('hidden');
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){
      console.error(err);
      const msg=String(err?.message||'');
      setState(msg.includes('Too many applications')?'تم إرسال عدد كبير من الطلبات من هذا الجهاز. حاول لاحقًا.':'حصلت مشكلة أثناء إرسال الطلب. راجع البيانات وحاول مرة أخرى.');
      submit.disabled=false;
      submit.textContent='إرسال طلب الانضمام →';
    }
  });
})();