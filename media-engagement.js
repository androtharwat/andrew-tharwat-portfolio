(()=>{
  const cfg=window.PORTFOLIO_CONFIG;if(!cfg||!window.supabase)return;
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');if(!slug)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const ENDPOINT=`${cfg.supabaseUrl}/functions/v1/portfolio-media-engagement`;
  const VIEWER_KEY='portfolio_viewer_id_v1';
  let viewer=localStorage.getItem(VIEWER_KEY)||'';if(!viewer){viewer=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(VIEWER_KEY,viewer)}
  const lang=()=>window.PORTFOLIO_I18N?.getLang?.()||'en';
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const normUrl=u=>{try{return new URL(u,location.origin).href}catch{return String(u||'')}};
  const api=async payload=>{const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey},body:JSON.stringify(payload)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Request failed');return b};
  let items=[],summaries={},projectTitle='';

  const copy=()=>lang()==='ar'?{
    feel:'ما رأيك في هذا المحتوى؟',like:'أعجبني',dislike:'لم يعجبني',feedback:'شاركنا رأيك',hide:'إخفاء الآراء',name:'اسمك (اختياري)',opinion:'اكتب رأيك في العمل...',send:'إرسال',empty:'كن أول من يشارك رأيه.',thanks:'شكرًا، تم إضافة رأيك.',viewer:'مشاهد',video:'فيديو',image:'عمل بصري',
    shareLabel:'شارك هذا المحتوى',nativeShare:'مشاركة / ستوري',facebook:'فيسبوك',whatsapp:'واتساب',linkedin:'لينكدإن',copyLink:'نسخ الرابط',copied:'تم نسخ رابط المحتوى ✓',shareHint:'يتم إرفاق رابط موقع Andrew Tharwat تلقائيًا مع المشاركة.',shareFallback:'تم نسخ الرابط — افتح التطبيق والصقه في الستوري أو المنشور.'
  }:{feel:'WHAT DO YOU THINK?',like:'Like',dislike:'Not for me',feedback:'SHARE YOUR FEEDBACK',hide:'HIDE FEEDBACK',name:'Your name (optional)',opinion:'Write your feedback about this work...',send:'SEND',empty:'Be the first to share your feedback.',thanks:'Thanks — your feedback was added.',viewer:'Viewer',video:'Video',image:'Visual',
    shareLabel:'SHARE THIS CONTENT',nativeShare:'SHARE / STORY',facebook:'Facebook',whatsapp:'WhatsApp',linkedin:'LinkedIn',copyLink:'Copy link',copied:'Content link copied ✓',shareHint:'Andrew Tharwat Portfolio link is included automatically.',shareFallback:'Link copied — paste it into your story or post.'
  };

  function local(m,key){return lang()==='ar'?(m[`${key}_ar`]||m[key]||''):(m[key]||m[`${key}_ar`]||'')}
  function shareUrl(m){const u=new URL(location.href);u.hash=`media-${m.id}`;return u.href}
  function shareTitle(m,index){return local(m,'title')||(lang()==='ar'?`${m.media_type==='video'?'فيديو':'عمل بصري'} ${String(index+1).padStart(2,'0')} — ${projectTitle||'Andrew Tharwat'}`:`${m.media_type==='video'?'Video':'Visual'} ${String(index+1).padStart(2,'0')} — ${projectTitle||'Andrew Tharwat'}`)}
  function shareText(m,index){const title=shareTitle(m,index),brief=local(m,'brief');return lang()==='ar'
    ? `${title}${brief?`\n${brief}`:''}\n\nشاهد المحتوى على موقع Andrew Tharwat\n#AndrewTharwat #HSEAwareness #SCCT2`
    : `${title}${brief?`\n${brief}`:''}\n\nWatch on Andrew Tharwat Portfolio\n#AndrewTharwat #HSEAwareness #SCCT2`}
  function shareMarkup(m){const c=copy();return `<div class="media-share" data-media-share="${m.id}"><div class="media-share-head"><span class="media-share-label">${c.shareLabel}</span><span class="media-share-brand">ANDREW THARWAT · PORTFOLIO</span></div><div class="media-share-actions"><button type="button" class="media-share-btn media-share-native" data-share-action="native"><span>↗</span>${c.nativeShare}</button><button type="button" class="media-share-btn" data-share-action="facebook"><span class="share-platform">f</span>${c.facebook}</button><button type="button" class="media-share-btn" data-share-action="whatsapp"><span class="share-platform">wa</span>${c.whatsapp}</button><button type="button" class="media-share-btn" data-share-action="linkedin"><span class="share-platform">in</span>${c.linkedin}</button><button type="button" class="media-share-btn" data-share-action="copy"><span>⧉</span>${c.copyLink}</button></div><div class="media-share-hint">${c.shareHint}</div><div class="media-share-status" aria-live="polite"></div></div>`}

  function panelFor(m,index){
    const c=copy(),title=local(m,'title'),brief=local(m,'brief'),s=summaries[m.id]||{likes:0,dislikes:0,viewerReaction:0,feedback:[]};
    const fallbackTitle=lang()==='ar'?`${m.media_type==='video'?'فيديو':'عمل بصري'} ${String(index+1).padStart(2,'0')}`:`${m.media_type==='video'?'VIDEO':'VISUAL'} ${String(index+1).padStart(2,'0')}`;
    return `<div class="media-story" data-media-story="${m.id}" dir="${lang()==='ar'?'rtl':'ltr'}" data-i18n-skip="1">
      ${(title||brief)?`<div class="media-story-copy"><h3 class="media-story-title">${esc(title||fallbackTitle)}</h3>${brief?`<p class="media-story-brief">${esc(brief)}</p>`:''}</div>`:''}
      ${shareMarkup(m)}
      ${m.engagement_enabled?`<div class="media-engage"><div class="media-engage-top"><span class="media-engage-label">${c.feel}</span><div class="media-reactions"><button class="media-react ${s.viewerReaction===1?'active-like':''}" data-react="1" type="button">👍 <span>${c.like}</span> <strong>${s.likes||0}</strong></button><button class="media-react ${s.viewerReaction===-1?'active-dislike':''}" data-react="-1" type="button">👎 <span>${c.dislike}</span> <strong>${s.dislikes||0}</strong></button></div></div><button class="media-feedback-toggle" type="button">${c.feedback}</button><div class="media-feedback-area"><form class="media-feedback-form"><input name="name" maxlength="50" placeholder="${c.name}"><textarea name="body" maxlength="600" required placeholder="${c.opinion}"></textarea><button type="submit">${c.send}</button></form><div class="media-feedback-status"></div><div class="media-feedback-list">${feedbackMarkup(s.feedback||[])}</div></div></div>`:''}
    </div>`;
  }
  function feedbackMarkup(list){const c=copy();if(!list.length)return`<div class="media-feedback-empty">${c.empty}</div>`;return list.slice(0,8).map(f=>`<article class="media-feedback-item"><strong>${esc(f.name||c.viewer)}</strong><p>${esc(f.body||'')}</p></article>`).join('')}

  function matchNode(m){const target=normUrl(m.url);return [...document.querySelectorAll('.media-item')].find(card=>{const el=card.querySelector(m.media_type==='video'?'video':'img');return el&&normUrl(el.getAttribute('src')||el.src)===target})}
  function renderOne(m,index){const card=matchNode(m);if(!card)return false;card.id=`media-${m.id}`;card.classList.add('media-with-story');let old=card.querySelector(`:scope > [data-media-story="${m.id}"]`);if(old)old.remove();card.insertAdjacentHTML('beforeend',panelFor(m,index));wire(card.querySelector(`[data-media-story="${m.id}"]`),m,index);return true}
  function renderAll(){items.forEach((m,i)=>renderOne(m,i));jumpToSharedMedia()}

  async function copyShare(url,status,message){try{await navigator.clipboard.writeText(url);status.textContent=message}catch(_e){const ta=document.createElement('textarea');ta.value=url;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();status.textContent=message}}
  function openShare(url){window.open(url,'_blank','noopener,noreferrer,width=720,height=720')}
  function wireShare(panel,m,index){const status=panel.querySelector('.media-share-status');panel.querySelectorAll('[data-share-action]').forEach(btn=>btn.addEventListener('click',async()=>{const action=btn.dataset.shareAction,url=shareUrl(m),text=shareText(m,index),title=shareTitle(m,index);status.textContent='';if(action==='native'){if(navigator.share){try{await navigator.share({title,text,url});return}catch(err){if(err?.name==='AbortError')return}}await copyShare(url,status,copy().shareFallback);return}if(action==='copy'){await copyShare(url,status,copy().copied);return}if(action==='facebook'){openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);return}if(action==='whatsapp'){openShare(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);return}if(action==='linkedin'){openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}}))}

  function updateSummary(panel,m,s){summaries[m.id]=s;const like=panel.querySelector('[data-react="1"]'),dis=panel.querySelector('[data-react="-1"]');if(like){like.classList.toggle('active-like',s.viewerReaction===1);like.querySelector('strong').textContent=s.likes||0}if(dis){dis.classList.toggle('active-dislike',s.viewerReaction===-1);dis.querySelector('strong').textContent=s.dislikes||0}const list=panel.querySelector('.media-feedback-list');if(list)list.innerHTML=feedbackMarkup(s.feedback||[])}
  function wire(panel,m,index){if(!panel||panel.dataset.ready==='1')return;panel.dataset.ready='1';wireShare(panel,m,index);
    panel.querySelectorAll('[data-react]').forEach(btn=>btn.addEventListener('click',async()=>{const buttons=[...panel.querySelectorAll('[data-react]')];buttons.forEach(b=>b.disabled=true);try{const b=await api({action:'react',media_id:m.id,visitor_id:viewer,reaction:Number(btn.dataset.react)});updateSummary(panel,m,b.summary||{})}catch(e){console.warn(e)}finally{buttons.forEach(b=>b.disabled=false)}}));
    const toggle=panel.querySelector('.media-feedback-toggle'),area=panel.querySelector('.media-feedback-area');toggle?.addEventListener('click',()=>{const open=area.classList.toggle('open');toggle.textContent=open?copy().hide:copy().feedback});
    panel.querySelector('.media-feedback-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button'),statusEl=panel.querySelector('.media-feedback-status'),name=form.elements.name.value.trim(),body=form.elements.body.value.trim();if(!body)return;btn.disabled=true;statusEl.textContent='';try{const b=await api({action:'comment',media_id:m.id,name,body});const s=summaries[m.id]||{likes:0,dislikes:0,viewerReaction:0,feedback:[]};s.feedback=[b.feedback,...(s.feedback||[])].slice(0,8);summaries[m.id]=s;panel.querySelector('.media-feedback-list').innerHTML=feedbackMarkup(s.feedback);form.elements.body.value='';statusEl.textContent=copy().thanks}catch(err){statusEl.textContent=String(err.message||err)}finally{btn.disabled=false}});
  }

  let jumped=false;function jumpToSharedMedia(){if(jumped||!location.hash.startsWith('#media-'))return;const target=document.querySelector(location.hash);if(!target)return;jumped=true;setTimeout(()=>{target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('media-shared-target');setTimeout(()=>target.classList.remove('media-shared-target'),2200)},180)}

  async function load(){
    const {data:p}=await sb.from('portfolio_projects').select('id,title,title_ar').eq('slug',slug).eq('status','published').eq('page_enabled',true).maybeSingle();if(!p)return;projectTitle=lang()==='ar'?(p.title_ar||p.title||''):(p.title||p.title_ar||'');
    const {data}=await sb.from('portfolio_project_media').select('id,url,media_type,sort_order,title,title_ar,brief,brief_ar,engagement_enabled').eq('project_id',p.id).order('sort_order');items=data||[];if(!items.length)return;
    try{const b=await api({action:'summary',media_ids:items.filter(x=>x.engagement_enabled).map(x=>x.id),visitor_id:viewer});summaries=b.summaries||{}}catch(_e){}
    let tries=0;const draw=()=>{tries++;renderAll();if(items.some(m=>!matchNode(m))&&tries<40)setTimeout(draw,150)};draw();
  }
  document.addEventListener('portfolio:languagechange',()=>{jumped=false;renderAll()});
  load();
})();