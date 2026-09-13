(() => {
  const init = () => {
    const cfg=window.PORTFOLIO_CONFIG;
    const form=document.getElementById('project-form');
    if(!cfg||!form||document.getElementById('ai-project-assist')) return;

    const DEVICE_KEY='andrew_portfolio_device_v2';
    const field=name=>form.elements[name];
    const val=name=>field(name)?.value||'';
    const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

    const style=document.createElement('style');
    style.textContent=`
      .ai-project-assist{grid-column:1/-1;margin:2px 0 18px;padding:18px;border:1px solid rgba(255,48,67,.34);border-radius:16px;background:linear-gradient(135deg,rgba(225,6,19,.12),rgba(13,44,64,.32));box-shadow:0 16px 40px rgba(0,0,0,.12)}
      .ai-project-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:12px}.ai-project-head strong{font-size:13px;letter-spacing:.4px}.ai-project-head span{display:block;color:#86a1b2;font-size:9px;line-height:1.55;margin-top:4px}.ai-badge{flex:none;padding:7px 9px;border-radius:999px;background:#e10613;color:#fff;font-size:8px;font-weight:900;letter-spacing:1px}
      .ai-project-assist textarea{width:100%;min-height:96px;resize:vertical;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#071923;color:#fff;padding:13px 14px;font:500 11px/1.65 Montserrat,Arial,sans-serif;outline:none}.ai-project-assist textarea:focus{border-color:rgba(255,48,67,.7);box-shadow:0 0 0 3px rgba(225,6,19,.08)}
      .ai-project-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:11px}.ai-project-actions button{border:0;border-radius:10px;padding:11px 14px;background:linear-gradient(135deg,#e10613,#ff3043);color:#fff;font:900 9px Montserrat,Arial,sans-serif;letter-spacing:.5px;cursor:pointer}.ai-project-actions button:disabled{opacity:.55;cursor:wait}.ai-project-actions small{color:#7891a0;font-size:8px;line-height:1.5}.ai-project-status{margin-left:auto;color:#9eb1bd;font-size:8px}.ai-project-status.ok{color:#6bd79b}.ai-project-status.err{color:#ff7180}
      @media(max-width:720px){.ai-project-head{flex-direction:column}.ai-project-status{width:100%;margin-left:0}.ai-project-actions{align-items:flex-start;flex-direction:column}.ai-project-actions button{width:100%}}
    `;
    document.head.appendChild(style);

    const panel=document.createElement('section');
    panel.id='ai-project-assist';
    panel.className='ai-project-assist';
    panel.innerHTML=`
      <div class="ai-project-head"><div><strong>✨ AI PROJECT AUTOFILL</strong><span>اكتب وصف بسيط للمشروع بالعربي أو الإنجليزي، والـAI يجهز لك بيانات الـCase Study. راجعها قبل الحفظ.</span></div><b class="ai-badge">AI ASSIST</b></div>
      <textarea id="ai-project-brief" placeholder="مثال: عملت سلسلة فيديوهات HSE لمشروع ميناء في شرق بورسعيد، مبنية على مخاطر حقيقية من الموقع وNEBOSH، والهدف توعية العمال والمشرفين والمديرين... اكتب أي تفاصيل حقيقية تعرفها."></textarea>
      <div class="ai-project-actions"><button id="ai-fill-project" type="button">GENERATE & FILL FIELDS</button><small>هيملأ: Title, Slug, Category, Short/Full Description, Challenge, Solution, Impact, Tags, Tools. الروابط والصور لن يتم اختراعها.</small><span id="ai-project-status" class="ai-project-status">Ready</span></div>`;

    form.insertBefore(panel,form.firstChild);

    const status=document.getElementById('ai-project-status');
    const btn=document.getElementById('ai-fill-project');
    const brief=document.getElementById('ai-project-brief');

    const setStatus=(text,type='')=>{status.textContent=text;status.className='ai-project-status'+(type?' '+type:'')};
    const currentData=()=>({
      title:val('title'),slug:val('slug'),category:field('category_id')?.selectedOptions?.[0]?.textContent||'',excerpt:val('excerpt'),description:val('description'),challenge:val('challenge'),solution:val('solution'),result:val('result'),tags:val('tags'),tools:val('tools'),video_url:val('video_url'),project_url:val('project_url'),github_url:val('github_url')
    });
    const categories=()=>[...field('category_id').options].map(o=>o.textContent.trim()).filter(x=>x&&x.toLowerCase()!=='uncategorized');

    function setField(name,value){const el=field(name);if(!el||value==null)return;el.value=Array.isArray(value)?value.join(', '):String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
    function setCategory(name){if(!name)return;const sel=field('category_id');const opt=[...sel.options].find(o=>o.textContent.trim().toLowerCase()===String(name).trim().toLowerCase());if(opt){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}}

    btn.addEventListener('click',async()=>{
      let device=null;try{device=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null')}catch(_e){}
      if(!device?.id||!device?.secret){setStatus('Trusted device not found','err');return}
      const hasCurrent=Object.values(currentData()).some(v=>String(v||'').trim());
      if(!brief.value.trim()&&!hasCurrent){setStatus('اكتب وصف بسيط للمشروع الأول','err');brief.focus();return}
      btn.disabled=true;btn.textContent='AI IS WRITING…';setStatus('Generating project data…');
      try{
        const res=await fetch(`${cfg.supabaseUrl}/functions/v1/portfolio-ai-project`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey,'x-portfolio-device-id':device.id,'x-portfolio-device-secret':device.secret},
          body:JSON.stringify({brief:brief.value.trim(),categories:categories(),current:currentData()})
        });
        const body=await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(body.error||'AI generation failed');
        const d=body.data||{};
        setField('title',d.title);setField('slug',d.slug);setCategory(d.category);setField('excerpt',d.excerpt);setField('description',d.description);setField('challenge',d.challenge);setField('solution',d.solution);setField('result',d.result);setField('tags',d.tags);setField('tools',d.tools);
        if(d.video_url)setField('video_url',d.video_url);if(d.project_url)setField('project_url',d.project_url);if(d.github_url)setField('github_url',d.github_url);
        if(field('featured'))field('featured').checked=!!d.featured;
        if(field('status'))field('status').value='draft';
        setStatus(`Filled with ${body.model||'AI'} — review then Save Project`,'ok');
        form.querySelector('[name="title"]')?.scrollIntoView({behavior:'smooth',block:'center'});
      }catch(err){
        const msg=String(err?.message||err);
        setStatus(msg,'err');
        if(msg.includes('GEMINI_API_KEY')) alert('AI Autofill is installed. Add GEMINI_API_KEY once in Supabase Edge Function secrets, then this button will work directly.');
      }finally{btn.disabled=false;btn.textContent='GENERATE & FILL FIELDS'}
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
