(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const ROLE_AR={
    hse:'السلامة والتقنية',software:'البرمجيات والأتمتة',design:'التصميم والمرئيات',video:'الفيديو والموشن',content:'المحتوى والسرد',ai:'الإنتاج بالذكاء الاصطناعي'
  };
  const ROLE_NAME_AR={
    'HSE & TECHNICAL':'السلامة والتقنية','SOFTWARE & AUTOMATION':'البرمجيات والأتمتة','DESIGN & VISUAL':'التصميم والمرئيات','VIDEO & MOTION':'الفيديو والموشن','CONTENT & STORYTELLING':'المحتوى والسرد','AI PRODUCTION':'الإنتاج بالذكاء الاصطناعي'
  };
  const TYPE_AR={
    'Safety & HSE':['مشروع سلامة وHSE','توعية، أنظمة، تواصل مخاطر أو تدريب.'],
    'Digital Solution':['حل رقمي','موقع، تطبيق، أداة، مسار عمل أو أتمتة.'],
    'Creative & Brand':['إبداع وهوية','هوية، حملة، نظام بصري أو تواصل.'],
    'AI & Storytelling':['ذكاء اصطناعي وسرد','فيديو بالذكاء الاصطناعي، قصص بصرية أو تجارب مخصصة.']
  };
  const TIMELINE_AR={'Urgent / <2 weeks':'عاجل / أقل من أسبوعين','2–6 weeks':'2–6 أسابيع','6+ weeks / Flexible':'6+ أسابيع / مرن'};
  const BUDGET_AR={'Not specified':'غير محدد','Small / pilot':'صغير / تجريبي','Medium project':'مشروع متوسط','Large / multi-phase':'كبير / متعدد المراحل','Need guidance':'أحتاج توجيه'};
  const STAGE_AR={'Idea only':'مجرد فكرة','Have references / assets':'لدي مراجع / أصول','Already in development':'قيد التطوير بالفعل','Existing system needs improvement':'نظام قائم يحتاج تحسين'};
  const setText=(el,text)=>{if(el&&typeof text==='string'&&el.textContent!==text)el.textContent=text};
  const mapExpertise=text=>String(text||'').split(' · ').map(x=>ROLE_NAME_AR[x]||x).join(' · ');

  function localizeBrief(){
    if(document.body.dataset.lang!=='ar')return;

    $$('.role-card[data-role]').forEach(card=>setText(card.querySelector('h4'),ROLE_AR[card.dataset.role]||card.querySelector('h4')?.textContent||''));
    $$('#team-selection span').forEach(span=>setText(span,ROLE_NAME_AR[span.textContent]||span.textContent));

    const type=$('[data-key="type"]');
    if(type){
      setText(type.querySelector('.eyebrow'),'نوع المشروع');
      $$('[data-type]',type).forEach(btn=>{const copy=TYPE_AR[btn.dataset.type];if(copy){setText(btn.querySelector('b'),copy[0]);setText(btn.querySelector('span'),copy[1])}});
    }

    const goal=$('[data-key="goal"]');
    if(goal){
      setText(goal.querySelector('.eyebrow'),'الهدف');
      const labels=$$('label',goal);['الهدف الرئيسي','الجمهور الأساسي','كيف يبدو النجاح؟'].forEach((v,i)=>setText(labels[i],v));
    }

    const team=$('[data-key="team"]');
    if(team){
      setText(team.querySelector('.eyebrow'),'الخبرات');
      $$('.brief-discipline[data-disc]',team).forEach(btn=>setText(btn.querySelector('b'),ROLE_NAME_AR[btn.dataset.disc]||btn.dataset.disc));
    }

    const scope=$('[data-key="scope"]');
    if(scope){
      setText(scope.querySelector('.eyebrow'),'النطاق والتوقيت');
      $$('.timeline-choice[data-time]',scope).forEach(btn=>setText(btn,TIMELINE_AR[btn.dataset.time]||btn.dataset.time));
      const labels=$$('label',scope);setText(labels[0],'نطاق الميزانية');setText(labels[1],'المرحلة الحالية');
      const selects=$$('select',scope);
      $$('option',selects[0]).forEach(o=>setText(o,BUDGET_AR[o.value]||o.textContent));
      $$('option',selects[1]).forEach(o=>setText(o,STAGE_AR[o.value]||o.textContent));
    }

    const contact=$('[data-key="contact"]');
    if(contact){
      setText(contact.querySelector('.eyebrow'),'التواصل');
      const labels=$$('label',contact);['الاسم','البريد الإلكتروني','الهاتف / واتساب','الشركة / الجهة'].forEach((v,i)=>setText(labels[i],v));
    }

    const rows=$$('#brief-summary .summary-row');
    const summaryLabels=['نوع المشروع','الهدف','الخبرات','التوقيت','التواصل'];
    rows.forEach((row,i)=>setText(row.querySelector('small'),summaryLabels[i]||row.querySelector('small')?.textContent||''));
    if(rows[0]){const value=rows[0].querySelector('b,span');setText(value,TYPE_AR[value?.textContent]?.[0]||value?.textContent||'—')}
    if(rows[2]){const value=rows[2].querySelector('b,span');if(value)setText(value,mapExpertise(value.textContent))}
    if(rows[3]){const value=rows[3].querySelector('b,span');setText(value,TIMELINE_AR[value?.textContent]||value?.textContent||'—')}
  }

  function localizeWork(){
    if(document.body.dataset.lang!=='ar')return;
    const featured=$('#featured-project .featured-copy small');
    if(featured&&featured.textContent.startsWith('FEATURED CASE STUDY · '))setText(featured,featured.textContent.replace('FEATURED CASE STUDY · ','دراسة حالة مميزة · '));
    $$('.project-foot span').forEach(el=>{if(el.textContent==='CASE STUDY')setText(el,'دراسة حالة')});
  }

  function apply(){
    if(document.body.dataset.lang!=='ar')return;
    localizeBrief();
    localizeWork();
  }

  ['brief-steps','brief-summary','role-grid','team-selection','featured-project','project-grid'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)new MutationObserver(()=>requestAnimationFrame(apply)).observe(el,{childList:true,subtree:true});
  });
  $('#lang-toggle')?.addEventListener('click',()=>setTimeout(apply,0));
  setTimeout(apply,0);
  setTimeout(apply,350);
})();

(() => {
  if(document.querySelector('script[data-v9-work-fallback]'))return;
  const s=document.createElement('script');
  s.src='/v9/v9-work-fallback.js?v=1';
  s.async=false;
  s.dataset.v9WorkFallback='true';
  document.body.appendChild(s);
})();
