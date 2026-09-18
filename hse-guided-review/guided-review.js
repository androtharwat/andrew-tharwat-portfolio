(() => {
  const LANG_KEY='andrew_v9_public_lang';
  const PORTFOLIO_LANG_KEY='andrew_portfolio_lang';
  const STORE_KEY='ats_hse_guided_review_v1';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let lang='en';
  let step=0;
  let lastSnapshot='';

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

  function t(en,ar){return lang==='ar'?ar:en}
  function toast(message){
    const el=$('#toast'); if(!el)return;
    el.textContent=message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2200);
  }
  function statusLabel(v){
    if(v===2)return t('Evidence present','دليل موجود');
    if(v===1)return t('Needs verification','يحتاج تحقق');
    return t('Gap / unavailable','فجوة / غير متاح');
  }
  function statusClass(v){return v===2?'good':v===1?'review':'gap'}

  function renderAssurance(savedScores){
    const root=$('#assurance-questions'); if(!root)return;
    root.innerHTML=assurance.map(q=>{
      return '<label class="assurance-row"><span><b>'+ (lang==='ar'?q.ar:q.en) +'</b><small>'+t('Choose the statement that best matches your current evidence.','اختار الوصف الأقرب للأدلة الموجودة عندك حاليًا.')+'</small></span><select data-assurance="'+q.id+'" required><option value="">'+t('Choose','اختار')+'</option><option value="2">'+t('Evidence present','دليل موجود')+'</option><option value="1">'+t('Needs verification','يحتاج تحقق')+'</option><option value="0">'+t('Gap / not available','فجوة / غير متاح')+'</option></select></label>';
    }).join('');
    if(savedScores){
      assurance.forEach(q=>{
        const el=$('[data-assurance="'+q.id+'"]');
        if(el && savedScores[q.id]!==undefined)el.value=String(savedScores[q.id]);
      });
    }
  }

  function localizeSelects(){
    const hz=$('#hazard');
    if(hz){
      [...hz.options].forEach(o=>{
        if(!o.value){o.textContent=t('Choose the closest match','اختار أقرب نوع للمشكلة');return}
        const p=o.value.split('|'); o.textContent=lang==='ar'?(hazardAr[p[0]]||p[1]):p[1];
      });
    }
    const optionSets=[
      ['#confidence-task',[['Choose','اختار'],['Yes, with evidence','نعم، مع دليل'],['Partly / unsure','جزئيًا / غير متأكد'],['No / not checked','لا / لم يتم التحقق']]],
      ['#confidence-review',[['Choose','اختار'],['Yes, with evidence','نعم، مع دليل'],['Partly / unsure','جزئيًا / غير متأكد'],['No / not checked','لا / لم يتم التحقق']]],
      ['#immediate-danger',[['Choose','اختار'],['No known immediate danger','لا يوجد خطر فوري معروف'],['Unsure','غير متأكد'],['Yes','نعم']]]
    ];
    optionSets.forEach(item=>{
      const el=$(item[0]); if(!el)return;
      [...el.options].forEach((o,i)=>{if(item[1][i])o.textContent=item[1][i][lang==='ar'?1:0]});
    });
  }

  function applyLang(next,save=true){
    const scores=collectScores();
    lang=next==='ar'?'ar':'en';
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.body.dataset.lang=lang;
    $$('[data-en]').forEach(el=>{const value=el.dataset[lang];if(value!==undefined)el.textContent=value});
    $$('[data-en-html]').forEach(el=>{const value=el.dataset[lang+'Html'];if(value!==undefined)el.innerHTML=value});
    $$('[data-en-placeholder]').forEach(el=>{const value=el.dataset[lang+'Placeholder'];if(value!==undefined)el.placeholder=value});
    $('#lang-toggle').textContent=lang==='ar'?'English | AR':'EN | عربي';
    renderAssurance(scores);
    localizeSelects();
    renderStepper();
    syncStep(false);
    if(!$('#result').classList.contains('hidden'))buildResult(false);
    if(save){try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(PORTFOLIO_LANG_KEY,lang)}catch(_e){}}
  }

  function renderStepper(){
    const labels=lang==='ar'?['الحالة','التحكم','الإدارة','الأدلة','المراجعة']:['CASE','CONTROLS','SYSTEM','EVIDENCE','CHECK'];
    $('#stepper').innerHTML=labels.map((x,i)=>{
      const cls=i===step?'active':i<step?'done':'';
      return '<button type="button" class="'+cls+'" tabindex="-1"><b>'+String(i+1).padStart(2,'0')+'</b> <span>'+x+'</span></button>';
    }).join('');
  }

  function syncStep(scroll=true){
    $$('.review-step').forEach((el,i)=>el.classList.toggle('active',i===step));
    $('#back').disabled=step===0;
    $('#next').textContent=step===4?t('BUILD MY GAP MAP →','اعمل خريطة الفجوات ←'):t('NEXT →','التالي ←');
    $('#step-copy').textContent=t('Step '+(step+1)+' of 5','الخطوة '+(step+1)+' من 5');
    renderStepper();
    if(scroll)window.scrollTo({top:Math.max(0,$('.review-shell').offsetTop-90),behavior:'smooth'});
  }

  function collectScores(){
    const scores={};
    assurance.forEach(q=>{
      const el=$('[data-assurance="'+q.id+'"]');
      if(el && el.value!=='')scores[q.id]=Number(el.value);
    });
    return scores;
  }

  function currentValid(){
    if(step===0){
      if(!$('#hazard').value){toast(t('Choose the main issue first','اختار المشكلة الرئيسية الأول'));return false}
      if($('#context').value.trim().length<10){toast(t('Add a short description of what is happening','اكتب وصف مختصر للي بيحصل'));return false}
    }
    if(step===2){
      const missing=assurance.some(q=>{
        const el=$('[data-assurance="'+q.id+'"]');
        return !el || el.value==='';
      });
      if(missing){toast(t('Answer every management-system line','جاوب على كل بنود نظام الإدارة'));return false}
    }
    if(step===4){
      if(!$('#confidence-task').value||!$('#confidence-review').value||!$('#immediate-danger').value){
        toast(t('Complete the three final self-check questions','كمل أسئلة المراجعة الذاتية الثلاثة'));return false;
      }
    }
    return true;
  }

  function collect(){
    const hv=$('#hazard').value||'';
    const hp=hv.split('|');
    return {
      hazardCode:hp[0]||'',
      hazardName:hp[1]||'',
      context:$('#context').value.trim(),
      jurisdiction:$('#jurisdiction').value.trim(),
      people:$('#people').value.trim(),
      controls:$$('#control-checks input:checked').map(x=>x.value),
      controlNote:$('#control-note').value.trim(),
      scores:collectScores(),
      evidence:$$('#evidence-checks input:checked').map(x=>x.value),
      evidenceNote:$('#evidence-note').value.trim(),
      confidenceTask:$('#confidence-task').value===''?null:Number($('#confidence-task').value),
      confidenceReview:$('#confidence-review').value===''?null:Number($('#confidence-review').value),
      immediateDanger:$('#immediate-danger').value
    };
  }

  function saveDraft(){
    const data=collect(); data.step=step;
    try{localStorage.setItem(STORE_KEY,JSON.stringify(data))}catch(_e){}
  }

  function restore(){
    let d=null; try{d=JSON.parse(localStorage.getItem(STORE_KEY)||'null')}catch(_e){}
    if(!d)return null;
    if(d.hazardCode&&d.hazardName)$('#hazard').value=d.hazardCode+'|'+d.hazardName;
    $('#context').value=d.context||'';
    $('#jurisdiction').value=d.jurisdiction||'';
    $('#people').value=d.people||'';
    $('#control-note').value=d.controlNote||'';
    $('#evidence-note').value=d.evidenceNote||'';
    $$('#control-checks input').forEach(x=>x.checked=(d.controls||[]).includes(x.value));
    $$('#evidence-checks input').forEach(x=>x.checked=(d.evidence||[]).includes(x.value));
    $('#confidence-task').value=(d.confidenceTask!==undefined&&d.confidenceTask!==null)?String(d.confidenceTask):'';
    $('#confidence-review').value=(d.confidenceReview!==undefined&&d.confidenceReview!==null)?String(d.confidenceReview):'';
    $('#immediate-danger').value=d.immediateDanger||'';
    step=Math.max(0,Math.min(4,Number(d.step)||0));
    return d.scores||{};
  }

  function resultSignal(data){
    const vals=assurance.map(q=>Number(data.scores[q.id]||0));
    const total=vals.reduce((a,b)=>a+b,0)+data.confidenceTask+data.confidenceReview;
    const max=(assurance.length*2)+4;
    const ratio=max?total/max:0;
    if(data.immediateDanger==='yes')return {key:'gap',en:'SITE / PROFESSIONAL ACTION NEEDED',ar:'يحتاج إجراء موقعي / مهني'};
    if(data.immediateDanger==='unsure'||ratio<0.5)return {key:'gap',en:'SIGNIFICANT REVIEW GAPS',ar:'فجوات مراجعة واضحة'};
    if(ratio<0.78)return {key:'review',en:'NEEDS VERIFICATION',ar:'يحتاج تحقق'};
    return {key:'good',en:'EVIDENCE PRESENT',ar:'توجد أدلة داعمة'};
  }

  function buildSnapshot(data){
    const lines=[];
    lines.push('GUIDED HSE REVIEW SNAPSHOT');
    lines.push('Issue: '+(data.hazardName||'Not specified')+' ('+(data.hazardCode||'GEN')+')');
    lines.push('Context: '+(data.context||'—'));
    lines.push('Jurisdiction: '+(data.jurisdiction||'—'));
    lines.push('People exposed: '+(data.people||'—'));
    lines.push('Controls reported: '+(data.controls.length?data.controls.join(', '):'None selected'));
    lines.push('Control concern: '+(data.controlNote||'—'));
    lines.push('Management-system self-check:');
    assurance.forEach(q=>lines.push('- '+q.en+': '+statusLabel(Number(data.scores[q.id]||0))));
    lines.push('Evidence reported: '+(data.evidence.length?data.evidence.join(', '):'None selected'));
    if(data.evidenceNote)lines.push('Evidence notes: '+data.evidenceNote);
    lines.push('Final confidence — controls match actual task: '+statusLabel(data.confidenceTask));
    lines.push('Final confidence — control basis can be explained: '+statusLabel(data.confidenceReview));
    lines.push('Immediate danger / uncontrolled condition: '+(data.immediateDanger||'not answered'));
    lines.push('Note: This Guided Review is an educational diagnostic aid and not a formal risk assessment, compliance decision, permit, or safe-to-work confirmation.');
    return lines.join('\n');
  }

  function buildResult(scroll=true){
    const data=collect();
    const signal=resultSignal(data);
    const signalBox=$('#signal');
    signalBox.className='signal '+signal.key;
    $('#signal-label').textContent=lang==='ar'?signal.ar:signal.en;

    const items=assurance.map(q=>({label:lang==='ar'?q.ar:q.en,v:Number(data.scores[q.id]||0)}));
    items.push({label:t('Controls match the actual task','وسائل التحكم مطابقة للمهمة الفعلية'),v:data.confidenceTask});
    items.push({label:t('Control basis can be explained with evidence','يمكن شرح أساس وسائل التحكم بأدلة'),v:data.confidenceReview});
    const gaps=items.filter(x=>x.v===0).length;
    const reviews=items.filter(x=>x.v===1).length;
    $('#gap-count').textContent=t(gaps+' gaps · '+reviews+' verify',gaps+' فجوات · '+reviews+' تحقق');
    $('#gap-map').innerHTML=items.map(x=>'<div class="gap-item '+statusClass(x.v)+'"><i></i><b>'+x.label+'</b><span>'+statusLabel(x.v)+'</span></div>').join('');

    const actions=[];
    if(data.immediateDanger==='yes')actions.push(t('Use the site stop-work, emergency and escalation procedures for the immediate uncontrolled condition before relying on this review.','استخدم إجراءات إيقاف العمل والطوارئ والتصعيد بالموقع للحالة غير المسيطر عليها قبل الاعتماد على هذه المراجعة.'));
    else if(data.immediateDanger==='unsure')actions.push(t('Verify whether an immediate uncontrolled condition exists before continuing with normal work decisions.','تحقق أولًا هل يوجد خطر فوري أو حالة غير مسيطر عليها قبل قرارات استمرار العمل.'));
    const gapNames=assurance.filter(q=>Number(data.scores[q.id]||0)===0).map(q=>lang==='ar'?q.ar:q.en);
    const verifyNames=assurance.filter(q=>Number(data.scores[q.id]||0)===1).map(q=>lang==='ar'?q.ar:q.en);
    if(gapNames.length)actions.push(t('Build or restore evidence for: '+gapNames.join(', ')+'.','أنشئ أو استكمل دليلًا واضحًا لبنود: '+gapNames.join('، ')+'.'));
    if(verifyNames.length)actions.push(t('Verify the current status of: '+verifyNames.join(', ')+'.','تحقق من الحالة الحالية لبنود: '+verifyNames.join('، ')+'.'));
    if(!data.evidence.length)actions.push(t('Gather documents, records, measurements or inspection evidence that support the controls you believe are in place.','اجمع المستندات والسجلات والقياسات أو أدلة الفحص التي تدعم وسائل التحكم الموجودة.'));
    if(signal.key!=='good')actions.push(t('Use professional review where judgement, measurements, legal interpretation, design or formal assessment is needed.','استخدم المراجعة المهنية لما تحتاج حكمًا متخصصًا أو قياسات أو تفسيرًا قانونيًا أو تصميمًا أو تقييمًا رسميًا.'));
    if(!actions.length)actions.push(t('Keep the evidence current and verify controls when the task, people, equipment or conditions change.','حافظ على تحديث الأدلة وراجع وسائل التحكم عند تغير المهمة أو الأشخاص أو المعدات أو الظروف.'));
    $('#actions').innerHTML=actions.map(x=>'<li>'+x+'</li>').join('');

    $('#result-title').textContent=t('Your current picture is now structured.','الصورة الحالية لحالتك بقت منظمة.');
    $('#result-copy').textContent=signal.key==='good'
      ?t('You reported evidence across most control-system areas. Keep verification current and escalate specialist uncertainty.','أنت سجلت أدلة في أغلب عناصر نظام التحكم. حافظ على التحقق المستمر وصعّد أي نقطة تحتاج خبرة متخصصة.')
      :t('The review found areas that are missing or need verification. Use the Gap Map as the reference for your next action.','المراجعة أظهرت نقاط ناقصة أو محتاجة تحقق. استخدم خريطة الفجوات كمرجع للخطوة التالية.');

    const danger=$('#danger-alert');
    danger.classList.toggle('hidden',data.immediateDanger==='no');
    if(data.immediateDanger==='yes')danger.textContent=t('Immediate danger = YES. This tool cannot confirm safe work. Use the site emergency / stop-work / escalation process and competent site judgement.','إجابتك تشير لوجود خطر فوري. الأداة دي لا تؤكد أمان استمرار العمل. استخدم إجراءات الطوارئ / إيقاف العمل / التصعيد والحكم المختص بالموقع.');
    else if(data.immediateDanger==='unsure')danger.textContent=t('Immediate danger is uncertain. Verify the condition before using this review as a basis for normal work decisions.','وجود خطر فوري غير محسوم. تحقق من الحالة قبل استخدام المراجعة كأساس لقرارات العمل العادية.');

    lastSnapshot=buildSnapshot(data);
    $('#snapshot').textContent=lastSnapshot;
    $('#review-form').classList.add('hidden');
    $('#result').classList.remove('hidden');
    saveDraft();
    if(scroll)$('#result').scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('#next').addEventListener('click',()=>{
    if(!currentValid())return;
    saveDraft();
    if(step<4){step++;syncStep()}
    else buildResult();
  });
  $('#back').addEventListener('click',()=>{if(step>0){saveDraft();step--;syncStep()}});
  $('#restart').addEventListener('click',()=>{try{localStorage.removeItem(STORE_KEY)}catch(_e){} location.reload()});
  $('#copy-snapshot').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(lastSnapshot);toast(t('Snapshot copied','تم نسخ الملخص'))}
    catch(_e){toast(t('Copy is not available in this browser','النسخ غير متاح في هذا المتصفح'))}
  });
  $('#continue-consultation').addEventListener('click',()=>{
    const d=collect();
    const handoff={
      hazard:d.hazardCode+'|'+d.hazardName,
      summary:lastSnapshot||buildSnapshot(d),
      jurisdiction:d.jurisdiction||'',
      createdAt:new Date().toISOString()
    };
    try{sessionStorage.setItem('ats_hse_guided_review_handoff_v1',JSON.stringify(handoff))}catch(_e){}
    location.href='/hse-consultation/?source=guided-review';
  });
  $('#lang-toggle').addEventListener('click',()=>applyLang(lang==='ar'?'en':'ar'));
  document.addEventListener('change',e=>{if(e.target.matches('input,select,textarea'))saveDraft()});
  document.addEventListener('input',e=>{if(e.target.matches('input,textarea'))saveDraft()});

  const savedScores=restore();
  renderAssurance(savedScores);
  let saved='en';
  try{saved=localStorage.getItem(LANG_KEY)||localStorage.getItem(PORTFOLIO_LANG_KEY)||'en'}catch(_e){}
  applyLang(saved==='ar'?'ar':'en',false);
})();