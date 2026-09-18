(()=>{
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(selector,content,getLang){
    const root=$(selector);if(!root)return null;
    const review=content?.guided_review||{};
    if(!review.enabled||review.review_approved===false){root.classList.add('hidden');return null}
    let step=0,area='',answers={},gapMap=[];
    const lang=()=>getLang?.()==='ar'?'ar':'en';
    const t=(en,ar)=>lang()==='ar'?ar:en;
    const local=(obj)=>obj?.[lang()]||obj?.en||obj?.ar||'';
    const labels=()=>lang()==='ar'?['افهم','شخّص','مسارات التحكم','التقييم الذاتي','خريطة الفجوات','الإجراءات التالية']:['UNDERSTAND','DIAGNOSE','CONTROL PATHWAYS','SELF-CHECK','GAP MAP','NEXT ACTIONS'];
    const areaList=()=>Array.isArray(review.diagnostic_areas)?review.diagnostic_areas:[];
    const pathways=()=>Array.isArray(review.control_pathways)?review.control_pathways:[];
    const questions=()=>Array.isArray(review.self_check_questions)?review.self_check_questions:[];
    const selectedArea=()=>area||areaList()[0]?.key||'';
    function examples(p){
      const arr=lang()==='ar'?(p.practical_examples_ar||p.examples_ar||[]):(p.practical_examples_en||p.examples_en||[]);
      return Array.isArray(arr)?arr.filter(Boolean):[];
    }
    function gapForQuestion(q,answer){
      const rules=Array.isArray(q.gap_rules)?q.gap_rules:[];
      const rule=rules.find(r=>r.when===answer);
      return {area:q.area||'',status:rule?.status||(answer==='yes'?'appears_addressed':answer==='no'?'review_required':'information_missing'),reason_en:rule?.reason_en||'',reason_ar:rule?.reason_ar||''};
    }
    function buildLocalGap(){
      const result=[];
      areaList().forEach(a=>{
        const qs=questions().filter(q=>(q.area||'')===a.key);
        const pri={appears_addressed:1,needs_clarification:2,information_missing:3,potential_gap:4,review_required:5};
        let best={area:a.key,label_en:a.label_en||a.key,label_ar:a.label_ar||a.key,status:'appears_addressed',reason_en:a.why_it_matters?.en||'',reason_ar:a.why_it_matters?.ar||''};
        qs.forEach(q=>{
          const g=gapForQuestion(q,answers[q.id]);
          if((pri[g.status]||1)>(pri[best.status]||1))best={...best,...g};
        });
        result.push(best);
      });
      gapMap=result;return result;
    }
    function progress(){
      return `<div class="gr-progress">${labels().map((x,i)=>`<button type="button" class="${i===step?'active':''}" tabindex="-1"><b>0${i+1}</b> ${esc(x)}</button>`).join('')}</div>`;
    }
    function understand(){
      const intro=review.intro||{};
      return `<div class="gr-panel"><h3>${esc(t('Understand the topic before checking the case','افهم الموضوع قبل مراجعة الحالة'))}</h3><p>${esc(local(intro)||t('Use the published topic above as the learning base for this review.','استخدم الموضوع المنشور بالأعلى كأساس معرفي لهذه المراجعة.'))}</p><div class="gr-diagnostic">${areaList().map(a=>`<button type="button" data-area="${esc(a.key)}"><b>${esc(lang()==='ar'?a.label_ar:a.label_en)}</b><small>${esc(local(a.what_to_look_for)||local(a.why_it_matters))}</small></button>`).join('')}</div><div class="gr-note">${esc(t('This Guided Review is educational. It is not a formal risk assessment, compliance decision, permit, or safe-to-work confirmation.','هذه المراجعة تعليمية وليست تقييم مخاطر رسميًا أو قرار امتثال أو تصريح عمل أو تأكيدًا بأن العمل آمن.'))}</div></div>`;
    }
    function diagnose(){
      return `<div class="gr-panel"><h3>${esc(t('Choose the area closest to what you want to review','اختار الجانب الأقرب لما تريد مراجعته'))}</h3><p>${esc(t('This does not change the published topic. It only focuses the questions and the review context.','هذا لا يغير الموضوع المنشور؛ بل يركز الأسئلة وسياق المراجعة فقط.'))}</p><div class="gr-diagnostic">${areaList().map(a=>`<button type="button" data-area="${esc(a.key)}" class="${selectedArea()===a.key?'selected':''}"><b>${esc(lang()==='ar'?a.label_ar:a.label_en)}</b><small>${esc(local(a.why_it_matters))}</small></button>`).join('')}</div></div>`;
    }
    function controls(){
      return `<div class="gr-panel"><h3>${esc(t('Open each Control Pathway','افتح كل مسار تحكم'))}</h3><p>${esc(t('Each question opens its explanation and any practical examples that were explicitly approved with the published content.','كل سؤال يفتح الشرح وأي أمثلة عملية تم اعتمادها صراحة مع المحتوى المنشور.'))}</p><div class="gr-pathways">${pathways().map(p=>{const ex=examples(p);return `<details class="gr-pathway"><summary><b>${esc(lang()==='ar'?p.question_ar:p.question_en)}</b><span>+</span></summary><div class="gr-detail"><p>${esc(lang()==='ar'?p.explanation_ar:p.explanation_en)}</p><b>${esc(t('Practical examples','أمثلة عملية'))}</b>${ex.length?`<ul>${ex.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p>${esc(t('No source-approved practical examples are attached to this pathway yet.','لا توجد أمثلة عملية معتمدة من المصدر مرفقة بهذا المسار حتى الآن.'))}</p>`}</div></details>`}).join('')||`<div class="gr-note">${esc(t('No Control Pathways are attached to this Published Revision.','لا توجد مسارات تحكم مرفقة بهذا الإصدار المنشور.'))}</div>`}</div></div>`;
    }
    function selfCheck(){
      const qs=questions().filter(q=>!selectedArea()||!q.area||q.area===selectedArea());
      return `<div class="gr-panel"><h3>${esc(t('Self-Check','التقييم الذاتي'))}</h3><p>${esc(t('Answer from the evidence you actually have. “Not sure” is a valid answer.','جاوب بناءً على الأدلة الموجودة فعلًا. «غير متأكد» إجابة صحيحة ومقبولة.'))}</p><div class="gr-questions">${qs.map(q=>`<label class="gr-question"><span><b>${esc(lang()==='ar'?q.question_ar:q.question_en)}</b><small>${esc(t('Required for the Gap Map','مطلوب لخريطة الفجوات'))}</small></span><select data-q="${esc(q.id)}"><option value="">${esc(t('Choose','اختار'))}</option><option value="yes" ${answers[q.id]==='yes'?'selected':''}>${esc(t('Yes','نعم'))}</option><option value="no" ${answers[q.id]==='no'?'selected':''}>${esc(t('No','لا'))}</option><option value="unsure" ${answers[q.id]==='unsure'?'selected':''}>${esc(t('Not sure','غير متأكد'))}</option></select></label>`).join('')||`<div class="gr-note">${esc(t('No self-check questions are attached to this selected area.','لا توجد أسئلة تقييم ذاتي مرتبطة بهذا الجانب.'))}</div>`}</div></div>`;
    }
    function gap(){
      buildLocalGap();
      return `<div class="gr-panel"><h3>${esc(t('Gap Map','خريطة الفجوات'))}</h3><p>${esc(t('This is a structured educational signal from your answers, not a compliance score.','هذه إشارة تعليمية منظمة من إجاباتك وليست درجة امتثال.'))}</p><div class="gr-gap">${gapMap.map(g=>`<div class="gr-gap-item" data-status="${esc(g.status)}"><i></i><div><b>${esc(lang()==='ar'?g.label_ar:g.label_en)}</b><small>${esc(lang()==='ar'?g.reason_ar:g.reason_en)}</small></div><span>${esc(g.status.replaceAll('_',' '))}</span></div>`).join('')}</div></div>`;
    }
    function listBlock(title,arr){
      const a=Array.isArray(arr)?arr:[];
      return `<section><h4>${esc(title)}</h4>${a.length?`<ul>${a.map(x=>`<li>${esc(typeof x==='string'?x:local(x))}</li>`).join('')}</ul>`:`<div class="gr-note">${esc(t('No additional action is attached.','لا يوجد إجراء إضافي مرفق.'))}</div>`}</section>`;
    }
    function actions(){
      const n=review.next_actions||{};
      const gate=review.professional_review_gate||{};
      return `<div class="gr-panel"><h3>${esc(t('Next Actions','الإجراءات التالية'))}</h3><p>${esc(t('Use the free actions first. Professional review stays optional.','استخدم الإجراءات المجانية أولًا. تظل المراجعة المهنية اختيارية.'))}</p><div class="gr-actions">${listBlock(t('Learn','تعلّم'),n.learn)}${listBlock(t('Review internally','راجع داخليًا'),n.review_internally)}${listBlock(t('Professional support','دعم مهني'),n.professional_support)}</div><div class="gr-professional-gate"><div><span class="eyebrow">${esc(t('PROFESSIONAL REVIEW GATE','بوابة المراجعة المهنية'))}</span><h3>${esc(lang()==='ar'?(gate.headline_ar||'هل تحتاج أن نراجع حالتك الفعلية؟'):(gate.headline_en||'Need us to review your actual case?'))}</h3><p>${esc(t('Scope, exclusions and consultation price appear on the next screen. You can use this context, change it, or continue without preset context.','سيظهر النطاق والاستثناءات وسعر الاستشارة في الشاشة التالية. يمكنك استخدام هذا السياق أو تغييره أو المتابعة بدون سياق مُسبق.'))}</p></div><button type="button" data-professional>${esc(lang()==='ar'?(gate.cta_ar||'راجع حالتي الفعلية'):(gate.cta_en||'Review My Actual Case'))}</button></div></div>`;
    }
    function panel(){return [understand,diagnose,controls,selfCheck,gap,actions][step]()}
    function render(){
      root.innerHTML=`<div class="gr-shell"><div class="gr-head"><div><span class="eyebrow">${esc(t('GUIDED REVIEW · FREE EDUCATIONAL PATH','مراجعة موجهة · مسار تعليمي مجاني'))}</span><h2>${esc(t('Understand → Diagnose → Check → Act','افهم ← شخّص ← راجع ← تحرك'))}</h2><p>${esc(t('Your answers stay focused on this Published Revision until you explicitly choose Professional Review.','تظل إجاباتك مرتبطة بهذا الإصدار المنشور حتى تختار المراجعة المهنية بنفسك.'))}</p></div></div>${progress()}${panel()}<div class="gr-nav"><button type="button" data-back ${step===0?'disabled':''}>${esc(t('← BACK','رجوع →'))}</button><button type="button" class="primary" data-next ${step===5?'disabled':''}>${esc(t('NEXT →','التالي ←'))}</button></div></div>`;
      bind();
    }
    function bind(){
      $$('[data-area]',root).forEach(b=>b.addEventListener('click',()=>{area=b.dataset.area;render()}));
      $$('[data-q]',root).forEach(s=>s.addEventListener('change',()=>{answers[s.dataset.q]=s.value}));
      $('[data-back]',root)?.addEventListener('click',()=>{if(step>0){step--;render();root.scrollIntoView({behavior:'smooth',block:'start'})}});
      $('[data-next]',root)?.addEventListener('click',()=>{
        if(step===3){
          const qs=questions().filter(q=>!selectedArea()||!q.area||q.area===selectedArea());
          if(qs.some(q=>q.required!==false&&!answers[q.id]))return window.dispatchEvent(new CustomEvent('hse-toast',{detail:t('Complete the Self-Check questions first.','أكمل أسئلة التقييم الذاتي أولًا.')}));
        }
        if(step<5){step++;render();root.scrollIntoView({behavior:'smooth',block:'start'})}
      });
      $('[data-professional]',root)?.addEventListener('click',continueProfessional);
    }
    async function continueProfessional(){
      const btn=$('[data-professional]',root);if(btn){btn.disabled=true;btn.textContent=t('PREPARING CONTEXT…','جاري تجهيز السياق…')}
      try{
        const payload={problem_description:'',selected_area:selectedArea(),answers:Object.entries(answers).map(([question_id,answer])=>({question_id,answer}))};
        const h=await HSE_DATA.createHandoff(content.slug,content.type,lang(),payload);
        if(!h?.handoff_id||!h?.client_token)throw new Error('Could not create Guided Review handoff.');
        try{sessionStorage.setItem('ats_hse_secure_handoff_v1',JSON.stringify({id:h.handoff_id,token:h.client_token}))}catch(_e){throw new Error('Could not store the secure review handoff.')}
        location.href='/hse-consultation/?source=guided-review&handoff=secure';
      }catch(err){
        console.error(err);window.dispatchEvent(new CustomEvent('hse-toast',{detail:t('Could not prepare the professional review context.','تعذر تجهيز سياق المراجعة المهنية.')}));
        if(btn){btn.disabled=false;btn.textContent=t('Review My Actual Case','راجع حالتي الفعلية')}
      }
    }
    window.addEventListener('hse-language-changed',render);
    render();
    return {refresh:render};
  }
  window.HSEGuidedReview={mount};
})();