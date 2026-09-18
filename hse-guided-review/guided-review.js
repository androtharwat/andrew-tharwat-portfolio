(() => {
  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const STORE_KEY='ats_hse_guided_review_v2';
  const HANDOFF_KEY='ats_hse_guided_review_handoff_v1';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let lang='en',step=0,lastSnapshot='';

  const assurance=[
    {id:'risk_assessment',en:'Risk assessment is current and task-specific',ar:'تقييم المخاطر حديث ومحدد للمهمة'},
    {id:'procedure',en:'Safe method / procedure reflects the real work',ar:'طريقة العمل / الإجراء الآمن يعكس الشغل الفعلي'},
    {id:'training',en:'People are trained and competent for the task',ar:'الأشخاص مدرَّبين ومؤهلين للمهمة'},
    {id:'supervision',en:'Supervision and authority are clear',ar:'الإشراف والصلاحيات واضحة'},
    {id:'maintenance',en:'Equipment / controls are inspected and maintained',ar:'المعدات / وسائل التحكم يتم فحصها وصيانتها'},
    {id:'monitoring',en:'Control performance is monitored or verified',ar:'أداء وسائل التحكم يتم متابعته أو التحقق منه'},
    {id:'learning',en:'Incidents, near misses and worker feedback are used',ar:'يتم الاستفادة من الحوادث وشبه الحوادث وملاحظات العمال'},
    {id:'emergency',en:'Emergency / abnormal-condition response is defined',ar:'التعامل مع الطوارئ / الظروف غير الطبيعية محدد'}
  ];
  const hazardAr={NOI:'التعرض للضوضاء',HEAT:'الإجهاد الحراري',LIGHT:'الإضاءة',VIB:'الاهتزازات',RAD:'الإشعاع',PRESS:'أنظمة الضغط',CHEM:'التعرض للمواد الكيميائية',ELEC:'السلامة الكهربائية',MACH:'سلامة الآلات',WAH:'العمل على ارتفاع',FIRE:'السلامة من الحريق',GEN:'HSE عام / غير متأكد'};

  const t=(en,ar)=>lang==='ar'?ar:en;
  function toast(message){
    const el=$('#toast');if(!el)return;
    el.textContent=message;el.classList.add('show');
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200);
  }
  function statusLabel(v){
    if(v===2)return t('Evidence present','دليل موجود');
    if(v===1)return t('Needs verification','يحتاج تحقق');
    return t('Gap / unavailable','فجوة / غير متاح');
  }
  function statusClass(v){return v===2?'good':v===1?'review':'gap'}

  function collectScores(){
    const scores={};
    assurance.forEach(q=>{const el=$('[data-assurance="'+q.id+'"]');if(el&&el.value!=='')scores[q.id]=Number(el.value)});
    return scores;
  }
  function renderAssurance(savedScores={}){
    const root=$('#assurance-questions');if(!root)return;
    root.innerHTML=assurance.map(q=>'<label class="assurance-row"><span><b>'+(lang==='ar'?q.ar:q.en)+'</b><small>'+t('Choose the statement that best matches your current evidence.','اختار الوصف الأقرب للأدلة الموجودة عندك حاليًا.')+'</small></span><select data-assurance="'+q.id+'" required><option value="">'+t('Choose','اختار')+'</option><option value="2">'+t('Evidence present','دليل موجود')+'</option><option value="1">'+t('Needs verification','يحتاج تحقق')+'</option><option value="0">'+t('Gap / not available','فجوة / غير متاح')+'</option></select></label>').join('');
    assurance.forEach(q=>{const el=$('[data-assurance="'+q.id+'"]');if(el&&savedScores[q.id]!==undefined)el.value=String(savedScores[q.id])});
  }
  function localizeSelects(){
    const hz=$('#hazard');
    if(hz)[...hz.options].forEach(o=>{if(!o.value){o.textContent=t('Choose the closest match','اختار أقرب نوع للمشكلة');return}const p=o.value.split('|');o.textContent=lang==='ar'?(hazardAr[p[0]]||p[1]):p[1]});
    const sets=[
      ['#confidence-task',[['Choose','اختار'],['Yes, with evidence','نعم، مع دليل'],['Partly / unsure','جزئيًا / غير متأكد'],['No / not checked','لا / لم يتم التحقق']]],
      ['#confidence-review',[['Choose','اختار'],['Yes, with evidence','نعم، مع دليل'],['Partly / unsure','جزئيًا / غير متأكد'],['No / not checked','لا / لم يتم التحقق']]],
      ['#immediate-danger',[['Choose','اختار'],['No known immediate danger','لا يوجد خطر فوري معروف'],['Unsure','غير متأكد'],['Yes','نعم']]]
    ];
    sets.forEach(([sel,labels])=>{const el=$(sel);if(!el)return;[...el.options].forEach((o,i)=>{if(labels[i])o.textContent=labels[i][lang==='ar'?1:0]})});
  }
  function renderEarlyDanger(){
    const box=$('#early-danger-note');if(!box)return;
    const v=$('#immediate-danger')?.value||'';
    box.classList.toggle('hidden',v==='no'||v==='');
    if(v==='yes')box.textContent=t('Immediate danger reported. This review cannot confirm safe work. Use the applicable site emergency / stop-work / escalation process and competent site judgement.','تم الإبلاغ عن خطر فوري. هذه المراجعة لا تؤكد أمان العمل. استخدم إجراءات الطوارئ / إيقاف العمل / التصعيد المطبقة بالموقع والحكم المختص.');
    if(v==='unsure')box.textContent=t('Immediate danger is uncertain. Verify the condition before using this review to support normal work decisions.','وجود خطر فوري غير محسوم. تحقق من الحالة قبل استخدام هذه المراجعة لدعم قرارات العمل العادية.');
  }

  function renderStepper(){
    const labels=lang==='ar'?['افهم','شخّص','مسارات التحكم','التقييم الذاتي','خريطة الفجوات','الإجراءات التالية']:['UNDERSTAND','DIAGNOSE','CONTROL PATHWAYS','SELF-CHECK','GAP MAP','NEXT ACTIONS'];
    $('#stepper').innerHTML=labels.map((x,i)=>'<button type="button" class="'+(i===step?'active':i<step?'done':'')+'" tabindex="-1"><b>'+String(i+1).padStart(2,'0')+'</b> <span>'+x+'</span></button>').join('');
  }
  function syncStep(scroll=true){
    $$('.review-step').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===step));
    $('#back').disabled=step===0;
    const next=$('#next');
    next.classList.toggle('hidden',step===5);
    next.textContent=step===3?t('BUILD GAP MAP →','اعمل خريطة الفجوات ←'):step===4?t('NEXT ACTIONS →','الإجراءات التالية ←'):t('NEXT →','التالي ←');
    $('#step-copy').textContent=t('Step '+(step+1)+' of 6','الخطوة '+(step+1)+' من 6');
    renderStepper();
    if(step>=4)buildResult(false);
    renderEarlyDanger();
    if(scroll)window.scrollTo({top:Math.max(0,$('.review-shell').offsetTop-90),behavior:'smooth'});
  }

  function collect(){
    const hv=$('#hazard')?.value||'',hp=hv.split('|');
    return {
      hazardCode:hp[0]||'',hazardName:hp[1]||'',
      context:$('#context')?.value.trim()||'',
      jurisdiction:$('#jurisdiction')?.value.trim()||'',
      people:$('#people')?.value.trim()||'',
      controls:$$('#control-checks input:checked').map(x=>x.value),
      controlNote:$('#control-note')?.value.trim()||'',
      scores:collectScores(),
      evidence:$$('#evidence-checks input:checked').map(x=>x.value),
      evidenceNote:$('#evidence-note')?.value.trim()||'',
      confidenceTask:$('#confidence-task')?.value===''?null:Number($('#confidence-task')?.value),
      confidenceReview:$('#confidence-review')?.value===''?null:Number($('#confidence-review')?.value),
      immediateDanger:$('#immediate-danger')?.value||''
    };
  }
  function currentValid(){
    if(step===0){
      if(!$('#hazard').value){toast(t('Choose the main issue first.','اختار المشكلة الرئيسية الأول.'));return false}
      if($('#context').value.trim().length<10){toast(t('Add a short description of what is happening.','اكتب وصف مختصر للي بيحصل.'));return false}
    }
    if(step===1&&!$('#immediate-danger').value){toast(t('Confirm whether an immediate uncontrolled condition is known, uncertain or not known.','حدد هل يوجد خطر فوري معروف أو غير محسوم أو لا يوجد خطر فوري معروف.'));return false}
    if(step===3){
      const missing=assurance.some(q=>{const el=$('[data-assurance="'+q.id+'"]');return !el||el.value===''});
      if(missing){toast(t('Answer every management-system evidence line.','جاوب على كل بنود أدلة نظام الإدارة.'));return false}
      if(!$('#confidence-task').value||!$('#confidence-review').value){toast(t('Complete the two final confidence questions.','كمل سؤالي الثقة النهائيين.'));return false}
    }
    return true;
  }
  function saveDraft(){
    const data=collect();data.step=step;
    try{localStorage.setItem(STORE_KEY,JSON.stringify(data))}catch(_e){}
  }
  function restore(){
    let d=null;try{d=JSON.parse(localStorage.getItem(STORE_KEY)||'null')}catch(_e){}
    if(!d){
      try{
        const old=JSON.parse(localStorage.getItem('ats_hse_guided_review_v1')||'null');
        if(old)d=old;
      }catch(_e){}
    }
    if(!d)return {};
    if(d.hazardCode&&d.hazardName)$('#hazard').value=d.hazardCode+'|'+d.hazardName;
    $('#context').value=d.context||'';$('#jurisdiction').value=d.jurisdiction||'';$('#people').value=d.people||'';
    $('#control-note').value=d.controlNote||'';$('#evidence-note').value=d.evidenceNote||'';
    $$('#control-checks input').forEach(x=>x.checked=(d.controls||[]).includes(x.value));
    $$('#evidence-checks input').forEach(x=>x.checked=(d.evidence||[]).includes(x.value));
    $('#confidence-task').value=d.confidenceTask!==undefined&&d.confidenceTask!==null?String(d.confidenceTask):'';
    $('#confidence-review').value=d.confidenceReview!==undefined&&d.confidenceReview!==null?String(d.confidenceReview):'';
    $('#immediate-danger').value=d.immediateDanger||'';
    step=Math.max(0,Math.min(5,Number(d.step)||0));
    return d.scores||{};
  }

  function resultSignal(data){
    const vals=assurance.map(q=>Number(data.scores[q.id]??0));
    const total=vals.reduce((a,b)=>a+b,0)+(data.confidenceTask??0)+(data.confidenceReview??0);
    const max=(assurance.length*2)+4,ratio=max?total/max:0;
    if(data.immediateDanger==='yes')return {key:'gap',en:'SITE / PROFESSIONAL ACTION NEEDED',ar:'يحتاج إجراء موقعي / مهني'};
    if(data.immediateDanger==='unsure'||ratio<0.5)return {key:'gap',en:'SIGNIFICANT REVIEW GAPS',ar:'فجوات مراجعة واضحة'};
    if(ratio<0.78)return {key:'review',en:'NEEDS VERIFICATION',ar:'يحتاج تحقق'};
    return {key:'good',en:'EVIDENCE PRESENT',ar:'توجد أدلة داعمة'};
  }
  function buildSnapshot(data){
    const lines=[];
    lines.push(t('GUIDED HSE REVIEW SNAPSHOT','ملخص المراجعة الموجهة HSE'));
    lines.push(t('Issue: ','المشكلة: ')+(data.hazardName||t('Not specified','غير محددة'))+' ('+(data.hazardCode||'GEN')+')');
    lines.push(t('Context: ','السياق: ')+(data.context||'—'));
    lines.push(t('Jurisdiction: ','جهة التطبيق: ')+(data.jurisdiction||'—'));
    lines.push(t('People exposed: ','الأشخاص المعرضون: ')+(data.people||'—'));
    lines.push(t('Immediate danger / uncontrolled condition: ','خطر فوري / حالة غير مسيطر عليها: ')+(data.immediateDanger||t('not answered','لم تتم الإجابة')));
    lines.push(t('Controls reported: ','وسائل التحكم المذكورة: ')+(data.controls.length?data.controls.join(', '):t('None selected','لم يتم تحديد شيء')));
    lines.push(t('Control concern: ','أكبر قلق في وسائل التحكم: ')+(data.controlNote||'—'));
    lines.push(t('Management-system self-check:','التقييم الذاتي لنظام الإدارة:'));
    assurance.forEach(q=>lines.push('- '+(lang==='ar'?q.ar:q.en)+': '+statusLabel(Number(data.scores[q.id]??0))));
    lines.push(t('Evidence reported: ','الأدلة المذكورة: ')+(data.evidence.length?data.evidence.join(', '):t('None selected','لم يتم تحديد شيء')));
    if(data.evidenceNote)lines.push(t('Evidence notes: ','ملاحظات الأدلة: ')+data.evidenceNote);
    lines.push(t('Controls match actual task: ','وسائل التحكم مطابقة للمهمة: ')+statusLabel(data.confidenceTask));
    lines.push(t('Control basis can be explained: ','يمكن شرح أساس وسائل التحكم: ')+statusLabel(data.confidenceReview));
    lines.push(t('Note: This is an educational diagnostic aid, not a formal risk assessment, compliance decision, permit, or safe-to-work confirmation.','ملاحظة: هذه أداة تشخيص تعليمية وليست تقييم مخاطر رسميًا أو قرار امتثال أو تصريح عمل أو تأكيدًا بأن العمل آمن.'));
    return lines.join('\n');
  }
  function buildResult(){
    const data=collect(),signal=resultSignal(data);
    const signalBox=$('#signal');signalBox.className='signal '+signal.key;
    $('#signal-label').textContent=lang==='ar'?signal.ar:signal.en;
    const items=assurance.map(q=>({label:lang==='ar'?q.ar:q.en,v:Number(data.scores[q.id]??0)}));
    items.push({label:t('Controls match the actual task','وسائل التحكم مطابقة للمهمة الفعلية'),v:data.confidenceTask??0});
    items.push({label:t('Control basis can be explained with evidence','يمكن شرح أساس وسائل التحكم بأدلة'),v:data.confidenceReview??0});
    const gaps=items.filter(x=>x.v===0).length,reviews=items.filter(x=>x.v===1).length;
    $('#gap-count').textContent=t(gaps+' gaps · '+reviews+' verify',gaps+' فجوات · '+reviews+' تحقق');
    $('#gap-map').innerHTML=items.map(x=>'<div class="gap-item '+statusClass(x.v)+'"><i></i><b>'+x.label+'</b><span>'+statusLabel(x.v)+'</span></div>').join('');
    $('#result-title').textContent=t('Your current picture is structured.','الصورة الحالية لحالتك بقت منظمة.');
    $('#result-copy').textContent=signal.key==='good'
      ?t('You reported evidence across most review areas. Keep verification current and escalate specialist uncertainty.','أنت سجلت أدلة في أغلب جوانب المراجعة. حافظ على التحقق المستمر وصعّد أي نقطة تحتاج خبرة متخصصة.')
      :t('Some areas are missing or need verification. Use the Gap Map to decide what to review next.','في جوانب ناقصة أو محتاجة تحقق. استخدم خريطة الفجوات لتحديد اللي يحتاج مراجعة بعد كده.');
    const danger=$('#danger-alert');danger.classList.toggle('hidden',data.immediateDanger==='no');
    if(data.immediateDanger==='yes')danger.textContent=t('Immediate danger was reported. This tool cannot confirm safe work. Use the applicable site emergency / stop-work / escalation process and competent site judgement.','تم الإبلاغ عن خطر فوري. الأداة دي لا تؤكد أمان استمرار العمل. استخدم إجراءات الطوارئ / إيقاف العمل / التصعيد المطبقة بالموقع والحكم المختص.');
    else if(data.immediateDanger==='unsure')danger.textContent=t('Immediate danger remains uncertain. Verify the condition before using this review to support normal work decisions.','وجود خطر فوري ما زال غير محسوم. تحقق من الحالة قبل استخدام المراجعة لدعم قرارات العمل العادية.');

    const actions=[];
    if(data.immediateDanger==='yes')actions.push(t('Use the applicable site emergency, stop-work and escalation process for the uncontrolled condition.','استخدم إجراءات الطوارئ وإيقاف العمل والتصعيد المطبقة بالموقع للحالة غير المسيطر عليها.'));
    else if(data.immediateDanger==='unsure')actions.push(t('Clarify whether an immediate uncontrolled condition exists before normal work decisions continue.','احسم أولًا هل توجد حالة فورية غير مسيطر عليها قبل استمرار قرارات العمل العادية.'));
    const gapNames=assurance.filter(q=>Number(data.scores[q.id]??0)===0).map(q=>lang==='ar'?q.ar:q.en);
    const verifyNames=assurance.filter(q=>Number(data.scores[q.id]??0)===1).map(q=>lang==='ar'?q.ar:q.en);
    if(gapNames.length)actions.push(t('Build or restore evidence for: '+gapNames.join(', ')+'.','أنشئ أو استكمل دليلًا واضحًا لبنود: '+gapNames.join('، ')+'.'));
    if(verifyNames.length)actions.push(t('Verify the current status of: '+verifyNames.join(', ')+'.','تحقق من الحالة الحالية لبنود: '+verifyNames.join('، ')+'.'));
    if(!data.evidence.length)actions.push(t('Gather suitable documents, records, measurements or inspection evidence for the controls you believe are in place.','اجمع مستندات أو سجلات أو قياسات أو أدلة فحص مناسبة لوسائل التحكم التي تعتقد أنها موجودة.'));
    if(signal.key!=='good')actions.push(t('Use professional review when specialist judgement, measurements, legal interpretation, design or formal assessment is needed.','استخدم المراجعة المهنية عند الحاجة لحكم متخصص أو قياسات أو تفسير قانوني أو تصميم أو تقييم رسمي.'));
    if(!actions.length)actions.push(t('Keep evidence current and re-check controls when the task, people, equipment or conditions change.','حافظ على تحديث الأدلة وراجع وسائل التحكم عند تغير المهمة أو الأشخاص أو المعدات أو الظروف.'));
    $('#actions').innerHTML=actions.map(x=>'<li>'+x+'</li>').join('');
    lastSnapshot=buildSnapshot(data);$('#snapshot').textContent=lastSnapshot;
  }

  function applyLang(next,save=true){
    const scores=collectScores();
    lang=next==='ar'?'ar':'en';
    document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const v=el.dataset[lang];if(v!==undefined)el.textContent=v});
    $$('[data-en-html]').forEach(el=>{const v=el.dataset[lang+'Html'];if(v!==undefined)el.innerHTML=v});
    $$('[data-en-placeholder]').forEach(el=>{const v=el.dataset[lang+'Placeholder'];if(v!==undefined)el.placeholder=v});
    $('#lang-toggle').textContent=lang==='ar'?'English | AR':'EN | عربي';
    renderAssurance(scores);localizeSelects();syncStep(false);
    if(save)try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}
  }

  $('#next').addEventListener('click',()=>{
    if(!currentValid())return;
    saveDraft();
    if(step<5){step++;syncStep()}
  });
  $('#back').addEventListener('click',()=>{if(step>0){saveDraft();step--;syncStep()}});
  $('#restart').addEventListener('click',()=>{try{localStorage.removeItem(STORE_KEY);localStorage.removeItem('ats_hse_guided_review_v1')}catch(_e){}location.reload()});
  $('#copy-snapshot').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(lastSnapshot);toast(t('Snapshot copied.','تم نسخ الملخص.'))}catch(_e){toast(t('Copy is not available in this browser.','النسخ غير متاح في هذا المتصفح.'))}});
  $('#continue-consultation').addEventListener('click',()=>{
    buildResult();
    const d=collect(),handoff={hazard:d.hazardCode+'|'+d.hazardName,summary:lastSnapshot||buildSnapshot(d),jurisdiction:d.jurisdiction||'',createdAt:new Date().toISOString()};
    try{sessionStorage.setItem(HANDOFF_KEY,JSON.stringify(handoff))}catch(_e){}
    location.href='/hse-consultation/?source=guided-review';
  });
  $('#lang-toggle').addEventListener('click',()=>applyLang(lang==='ar'?'en':'ar'));
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea')){saveDraft();if(e.target.id==='immediate-danger')renderEarlyDanger();if(step>=4)buildResult()}});
  document.addEventListener('input',e=>{if(e.target.matches('input,textarea')){saveDraft();if(step>=4)buildResult()}});

  renderAssurance({});
  const savedScores=restore();
  renderAssurance(savedScores);
  let saved='en';try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  applyLang(saved==='ar'?'ar':'en',false);
})();