(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const stepsRoot=$('#brief-steps');
  const progress=$('#brief-progress');
  const back=$('#brief-back');
  const next=$('#brief-next');
  const copy=$('#copy-brief');
  const summary=$('#brief-summary');
  if(!stepsRoot||!progress||!back||!next||!copy||!summary)return;

  const state={
    index:0,
    goal:'',audience:'',success:'',type:'',disciplines:[],timeline:'',
    budget:'Not specified',stage:'Idea only',name:'',email:'',phone:'',company:''
  };
  const order=['goal','type','team','scope','contact'];
  const roleData={
    'HSE & TECHNICAL':['Safety, risk, field expertise and technical review.','السلامة والمخاطر والخبرة الميدانية والمراجعة الفنية.'],
    'SOFTWARE & AUTOMATION':['Systems, tools, workflows, integrations and automation.','الأنظمة والأدوات ومسارات العمل والتكامل والأتمتة.'],
    'DESIGN & VISUAL':['Identity, interfaces, communication and visual direction.','الهوية والواجهات والتواصل والتوجيه البصري.'],
    'VIDEO & MOTION':['Production, editing, motion systems and cinematic output.','الإنتاج والمونتاج والموشن والمخرجات السينمائية.'],
    'CONTENT & STORYTELLING':['Scripts, learning structure, narrative and communication.','السيناريو وبناء المحتوى والسرد والتواصل.'],
    'AI PRODUCTION':['AI visuals, intelligent workflows and production acceleration.','المرئيات بالذكاء الاصطناعي ومسارات العمل الذكية وتسريع الإنتاج.']
  };
  let active=false;
  const ar=()=>document.body.dataset.lang==='ar';
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

  function showMessage(text){
    document.querySelector('.brief-recovery-message')?.remove();
    const el=document.createElement('div');
    el.className='brief-validation brief-recovery-message';
    el.setAttribute('role','status');
    el.textContent=text;
    next.insertAdjacentElement('afterend',el);
    setTimeout(()=>el.remove(),2600);
  }

  function stepMarkup(key){
    if(key==='goal') return `<span class="eyebrow">01 · ${ar()?'التحدي والنتيجة':'CHALLENGE & OUTCOME'}</span><h3>${ar()?'ما المشكلة التي نريد حلها — وما الذي يجب أن يتغير؟':'What problem are we solving — and what should change?'}</h3><p class="phase5-guidance">${ar()?'ابدأ بوصف التحدي الحالي، ثم وضّح من يتأثر به وما شكل النتيجة الأفضل.':'Describe the current challenge first. Then define who it affects and what a better outcome should look like.'}</p><div class="field-grid"><div class="field full"><label>${ar()?'التحدي / المشكلة':'THE CHALLENGE / PROBLEM'}</label><textarea data-bind="goal" placeholder="${ar()?'ما الذي يحدث الآن؟ وما الذي تريد تحسينه؟':'What is happening now, why does it matter, and what should improve?'}">${esc(state.goal)}</textarea></div><div class="field"><label>${ar()?'من الأكثر تأثرًا؟':'WHO IS MOST AFFECTED?'}</label><input data-bind="audience" value="${esc(state.audience)}"></div><div class="field"><label>${ar()?'كيف تبدو النتيجة الأفضل؟':'A BETTER OUTCOME LOOKS LIKE'}</label><input data-bind="success" value="${esc(state.success)}"></div></div>`;
    if(key==='type') return `<span class="eyebrow">02 · ${ar()?'نقطة البداية':'STARTING POINT'}</span><h3>${ar()?'أي مجال يبدو الأقرب للتحدي؟':'Which area feels closest to the challenge?'}</h3><p class="phase5-guidance">${ar()?'ده لا يحدد الحل مسبقًا؛ هو فقط نقطة بداية تساعد الاستوديو على فهم الاتجاه.':'This does not lock the solution. It gives the Studio a useful starting point.'}</p><div class="option-grid">${[
      ['Safety & HSE','HSE / Safety Project','مشروع سلامة وHSE'],['Digital Solution','Digital Solution','حل رقمي'],['Creative & Brand','Creative / Brand','إبداع / هوية'],['AI & Storytelling','AI / Storytelling','ذكاء اصطناعي / سرد']
    ].map(([v,en,ara])=>`<button type="button" class="brief-choice ${state.type===v?'selected':''}" data-type="${v}"><b>${ar()?ara:en}</b><span>${v}</span></button>`).join('')}</div>`;
    if(key==='team') return `<span class="eyebrow">03 · ${ar()?'الخبرات المحتملة':'POSSIBLE EXPERTISE'}</span><h3>${ar()?'ما الخبرات التي قد تساعد في حل المشكلة؟':'Which expertise could help solve it?'}</h3><p class="phase5-guidance">${ar()?'اختر ما يبدو مناسبًا الآن. التشكيل النهائي يتحدد بعد فهم المشكلة.':'Select what seems relevant. The final mix is shaped after the problem is understood.'}</p><div class="brief-disciplines">${Object.entries(roleData).map(([name,desc])=>`<button type="button" class="brief-discipline ${state.disciplines.includes(name)?'selected':''}" data-disc="${name}"><b>${name}</b><span>${ar()?desc[1]:desc[0]}</span></button>`).join('')}</div>`;
    if(key==='scope') return `<span class="eyebrow">04 · ${ar()?'النطاق والتوقيت':'SCOPE & TIMING'}</span><h3>${ar()?'ما القيود التي يجب أن نضعها في الاعتبار؟':'What constraints should shape the work?'}</h3><p class="phase5-guidance">${ar()?'التوقيت والميزانية ومرحلة المشروع تساعدنا على بناء مسار عملي.':'Timing, budget and current stage help define a practical path.'}</p><div class="timeline-grid">${['Urgent / <2 weeks','2–6 weeks','6+ weeks / Flexible'].map(v=>`<button type="button" class="timeline-choice ${state.timeline===v?'selected':''}" data-time="${esc(v)}">${esc(v)}</button>`).join('')}</div><div class="field-grid" style="margin-top:10px"><div class="field"><label>${ar()?'نطاق الميزانية':'BUDGET RANGE'}</label><select data-bind="budget">${['Not specified','Small / pilot','Medium project','Large / multi-phase','Need guidance'].map(v=>`<option ${state.budget===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>${ar()?'المرحلة الحالية':'CURRENT STAGE'}</label><select data-bind="stage">${['Idea only','Have references / assets','Already in development','Existing system needs improvement'].map(v=>`<option ${state.stage===v?'selected':''}>${v}</option>`).join('')}</select></div></div>`;
    return `<span class="eyebrow">05 · ${ar()?'التواصل':'CONTACT'}</span><h3>${ar()?'مع من نتواصل؟':'Who should we reply to?'}</h3><p class="phase5-guidance">${ar()?'أدخل الاسم والبريد الإلكتروني حتى نرسل لك تحديثات الطلب وتفاصيل الخطوة التالية.':'Add your name and email so we can confirm the request and contact you about the next step.'}</p><div class="field-grid"><div class="field"><label>${ar()?'الاسم':'NAME'}</label><input data-bind="name" value="${esc(state.name)}"></div><div class="field"><label>${ar()?'البريد الإلكتروني':'EMAIL'}</label><input data-bind="email" type="email" value="${esc(state.email)}"></div><div class="field"><label>${ar()?'الهاتف / واتساب':'PHONE / WHATSAPP'}</label><input data-bind="phone" value="${esc(state.phone)}"></div><div class="field"><label>${ar()?'الشركة / الجهة':'COMPANY / ORGANIZATION'}</label><input data-bind="company" value="${esc(state.company)}"></div></div>`;
  }

  function bindInputs(){
    $$('[data-bind]',stepsRoot).forEach(el=>el.addEventListener('input',e=>{state[e.target.dataset.bind]=e.target.value;renderSummary()}));
    $$('.brief-choice',stepsRoot).forEach(btn=>btn.addEventListener('click',()=>{state.type=btn.dataset.type;$$('.brief-choice',stepsRoot).forEach(x=>x.classList.toggle('selected',x===btn));renderSummary()}));
    $$('.brief-discipline',stepsRoot).forEach(btn=>btn.addEventListener('click',()=>{const v=btn.dataset.disc;state.disciplines=state.disciplines.includes(v)?state.disciplines.filter(x=>x!==v):[...state.disciplines,v];btn.classList.toggle('selected',state.disciplines.includes(v));renderSummary()}));
    $$('.timeline-choice',stepsRoot).forEach(btn=>btn.addEventListener('click',()=>{state.timeline=btn.dataset.time;$$('.timeline-choice',stepsRoot).forEach(x=>x.classList.toggle('selected',x===btn));renderSummary()}));
  }

  function renderSummary(){
    const labels=ar()?['نقطة البداية','التحدي','الخبرات','التوقيت','التواصل']:['PROJECT TYPE','CHALLENGE','EXPERTISE','TIMELINE','CONTACT'];
    const values=[state.type||'—',state.goal||'—',state.disciplines.join(' · ')||'—',state.timeline||'—',[state.name,state.company,state.email,state.phone].filter(Boolean).join(' · ')||'—'];
    summary.innerHTML=values.map((v,i)=>`<div class="summary-row"><small>${labels[i]}</small><span>${esc(v)}</span></div>`).join('');
  }

  function render(){
    active=true;
    stepsRoot.dataset.briefRecovery='1';
    progress.innerHTML=order.map((key,i)=>`<button type="button" data-recovery-step="${i}" class="${i===state.index?'active':''} ${i<state.index?'done':''}"><b>${String(i+1).padStart(2,'0')}</b>${ar()?['التحدي','نقطة البداية','الخبرات','النطاق','التواصل'][i]:['CHALLENGE','STARTING POINT','EXPERTISE','SCOPE','CONTACT'][i]}</button>`).join('');
    stepsRoot.innerHTML=order.map((key,i)=>`<section class="brief-step ${i===state.index?'active':''}" data-key="${key}">${stepMarkup(key)}</section>`).join('');
    back.style.visibility=state.index===0?'hidden':'visible';
    back.textContent=ar()?'السابق →':'← BACK';
    next.textContent=state.index===order.length-1?(ar()?'مراجعة البريف ←':'REVIEW BRIEF →'):(ar()?'التالي ←':'NEXT →');
    $$('[data-recovery-step]',progress).forEach(btn=>btn.addEventListener('click',()=>{state.index=Number(btn.dataset.recoveryStep);render()}));
    bindInputs();renderSummary();
  }

  function validateStep(){
    const key=order[state.index];
    if(key==='goal'&&!state.goal.trim()){showMessage(ar()?'اكتب التحدي أو الهدف أولًا.':'Describe the challenge before continuing.');return false}
    if(key==='type'&&!state.type){showMessage(ar()?'اختر نقطة بداية للمشروع.':'Choose the closest starting point.');return false}
    if(key==='contact'&&(!state.name.trim()||!/^\S+@\S+\.\S+$/.test(state.email.trim()))){showMessage(ar()?'أدخل الاسم وبريدًا إلكترونيًا صحيحًا.':'Add your name and a valid email address.');return false}
    return true;
  }

  function briefText(){return `ANDREW THARWAT STUDIO — PROJECT BRIEF\n\nChallenge: ${state.goal||'—'}\nAudience: ${state.audience||'—'}\nSuccess: ${state.success||'—'}\nStarting Point: ${state.type||'—'}\nExpertise: ${state.disciplines.join(', ')||'—'}\nTimeline: ${state.timeline||'—'}\nBudget: ${state.budget||'—'}\nStage: ${state.stage||'—'}\nContact: ${state.name||'—'} | ${state.company||'—'} | ${state.email||'—'} | ${state.phone||'—'}`}

  function activate(){
    if(active)return;
    render();
    back.onclick=()=>{state.index=Math.max(0,state.index-1);render()};
    next.onclick=()=>{
      if(!validateStep())return;
      if(state.index<order.length-1){state.index+=1;render();return}
      summary.scrollIntoView({behavior:'smooth',block:'center'});
      summary.classList.add('review-focus');
      setTimeout(()=>summary.classList.remove('review-focus'),1800);
    };
    copy.onclick=async()=>{
      try{await navigator.clipboard.writeText(briefText());showMessage(ar()?'تم نسخ البريف.':'Brief copied to clipboard.')}catch(_e){showMessage(ar()?'تعذر النسخ تلقائيًا.':'Copy is not available in this browser.')}
    };
  }

  function ensure(){
    if(!stepsRoot.querySelector('.brief-step')||!stepsRoot.textContent.trim())activate();
  }

  // Let the primary renderer initialize first. If it fails, recover the full flow.
  setTimeout(ensure,250);
  setTimeout(ensure,900);
  setTimeout(ensure,2200);
})();
