import { makeCirclePins } from './string-art-v4/core.mjs';

const params = new URLSearchParams(location.search);
if (params.get('engine') === 'v4') {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  let worker = null;
  let requestId = 0;
  let lastResult = null;
  let lastRender = null;
  let raf = 0;
  const pending = new Map();
  const prewarmed = new Set();

  const AR = () => document.documentElement.lang === 'ar';
  const setStatus = (msg, pct=0) => {
    const s=$('#sa-lab-status'), p=$('#sa-lab-progress');
    if(s) s.textContent=msg;
    if(p) p.textContent=Math.max(0,Math.min(100,Math.round(pct)))+'%';
  };

  const tr = (ar, en) => AR() ? ar : en;
  const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));

  const profile = () => {
    const q = $('[data-sa-quality].active')?.dataset.saQuality || 'enhanced';
    if(q === 'quick' || q === 'fast') return { key:'fast', size:128, nails:200, monoFibers:2300, colorFibers:3200, candidates:180, palette:4, detail:.60, crossingMono:.14, crossingColor:.10, opacityMono:.58, opacityColor:.48, repeatMono:2, repeatColor:2, refreshEvery:0, removalEvery:14, removalLimit:120 };
    if(q === 'share') return { key:'master', size:208, nails:330, monoFibers:6500, colorFibers:9000, candidates:320, palette:5, detail:.80, crossingMono:.20, crossingColor:.15, opacityMono:.46, opacityColor:.38, repeatMono:3, repeatColor:3, refreshEvery:0, removalEvery:8, removalLimit:240 };
    return { key:'studio', size:176, nails:280, monoFibers:4300, colorFibers:6200, candidates:260, palette:5, detail:.72, crossingMono:.18, crossingColor:.13, opacityMono:.52, opacityColor:.42, repeatMono:3, repeatColor:3, refreshEvery:0, removalEvery:10, removalLimit:180 };
  };

  const mode = () => $('[data-sa-mode].active')?.dataset.saMode === 'color' ? 'color' : 'mono';
  const paletteChoice = () => $('[data-sa-colors].active')?.dataset.saColors || 'auto';

  function updateColorPanel(){
    const panel=$('#sa-v4-color-panel');
    if(panel) panel.hidden=mode()!=='color';
  }

  function ensureV4Controls(){
    const mono=$('[data-sa-mode="mono"]');
    if(!mono) return false;
    const segmented=mono.parentElement;
    segmented?.classList.remove('sa-mono-only');
    segmented?.classList.add('sa-v4-modes');
    if(!segmented?.querySelector('[data-sa-mode="color"]')){
      const color=document.createElement('button');
      color.type='button'; color.dataset.saMode='color'; color.textContent=tr('ألوان بصرية','OPTICAL COLOR');
      segmented.appendChild(color);
    }
    mono.textContent=tr('أحادي واقعي','REALISTIC MONO');
    const colorButton=segmented?.querySelector('[data-sa-mode="color"]');
    if(segmented && !segmented.dataset.v4Defaulted){
      segmented.dataset.v4Defaulted='1';
      mono.classList.remove('active');
      colorButton?.classList.add('active');
    }
    const modeGroup=segmented.closest('.sa-control-group');
    if(modeGroup && !$('#sa-v4-color-panel')){
      const panel=document.createElement('div');
      panel.id='sa-v4-color-panel'; panel.className='sa-control-group sa-v4-color-panel'; panel.hidden=true;
      panel.innerHTML='<span>'+tr('ألوان الخيط','THREAD PALETTE')+'</span>'+
        '<div class="sa-segmented sa-palette-count">'+
        '<button type="button" data-sa-colors="3">3</button>'+
        '<button type="button" data-sa-colors="4">4</button>'+
        '<button type="button" data-sa-colors="5">5</button>'+
        '<button type="button" class="active" data-sa-colors="auto">'+tr('تلقائي','AUTO')+'</button></div>'+
        '<div class="sa-palette-caption">'+tr('يتم اختيار أقوى توليفة خيوط للصورة بالمحاكاة البصرية','THE ENGINE SIMULATES THE STRONGEST THREAD COMBINATION FOR THIS IMAGE')+'</div>'+
        '<div id="sa-palette-preview" class="sa-palette-preview"><span class="sa-palette-empty">'+tr('ستظهر الألوان المختارة هنا بعد التحليل','SELECTED COLORS APPEAR HERE AFTER ANALYSIS')+'</span></div>';
      modeGroup.insertAdjacentElement('afterend',panel);
    }
    const tools=$('#sa-result-tools');
    if(tools && !$('#sa-v4-result-meta')){
      const meta=document.createElement('div');
      meta.id='sa-v4-result-meta'; meta.className='sa-v4-result-meta';
      meta.innerHTML='<div><span>'+tr('الوضع','MODE')+'</span><b data-v4-meta="mode">—</b></div>'+
        '<div><span>'+tr('الخيوط','FIBERS')+'</span><b data-v4-meta="fibers">—</b></div>'+
        '<div><span>'+tr('المسامير','NAILS')+'</span><b data-v4-meta="nails">—</b></div>'+
        '<div><span>'+tr('الألوان','COLORS')+'</span><b data-v4-meta="colors">—</b></div>';
      tools.insertBefore(meta,tools.firstChild);
    }
    $$('[data-sa-mode]').forEach(b=>{
      if(b.dataset.v4ModeBound)return;b.dataset.v4ModeBound='1';
      b.addEventListener('click',()=>{$$('[data-sa-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateColorPanel()});
    });
    $$('[data-sa-colors]').forEach(b=>{
      if(b.dataset.v4ColorBound)return;b.dataset.v4ColorBound='1';
      b.addEventListener('click',()=>{$$('[data-sa-colors]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
    });
    $$('[data-sa-quality]').forEach(b=>{
      if(b.dataset.v4QualityBound)return;b.dataset.v4QualityBound='1';
      b.addEventListener('click',()=>{$$('[data-sa-quality]').forEach(x=>x.classList.remove('active'));b.classList.add('active');schedulePrewarm()});
    });
    if(segmented && !segmented.dataset.v4StudioDefault){
      segmented.dataset.v4StudioDefault='1';
      $$('[data-sa-quality]').forEach(x=>x.classList.remove('active'));
      $('[data-sa-quality="enhanced"]')?.classList.add('active');
    }
    updateColorPanel();
    return true;
  }

  function simplifyV4Ui(){
    const controls=$('.sa-lab-controls');
    if(!controls||controls.dataset.v4Simple)return;
    controls.dataset.v4Simple='1';
    const head=$('.sa-lab-head h2');if(head)head.textContent=tr('حوّل صورتك إلى String Art.','TURN YOUR PHOTO INTO STRING ART.');
    const intro=$('.sa-lab-head>p');if(intro)intro.textContent=tr('ارفع الصورة، اضبط وجهًا واحدًا داخل الدائرة، والباقي يتم تلقائيًا.','UPLOAD A PHOTO, KEEP ONE FACE IN THE CIRCLE, AND ATS HANDLES THE REST.');
    const generate=$('#sa-generate');if(generate)generate.textContent=tr('أنشئ البورتريه','CREATE MY PORTRAIT');
    const note=$('.sa-production-note');if(note)note.innerHTML=tr('ألوان تلقائية · أولوية للملامح · الصورة لا تغادر جهازك<br><b>© ATS</b>','AUTO COLOR · PORTRAIT-FIRST · IMAGE STAYS ON YOUR DEVICE<br><b>© ATS</b>');

    const upload=$('#sa-upload-zone');
    if(upload&&!$('.sa-v4-auto-summary')){
      const card=document.createElement('div');card.className='sa-v4-auto-summary';
      card.innerHTML='<b>'+tr('إعداد تلقائي ذكي','SMART AUTO SETUP')+'</b><span>● '+tr('ألوان بصرية','OPTICAL COLOR')+'</span><span>● '+tr('أولوية للوجه','FACE PRIORITY')+'</span><span>● '+tr('جودة Studio','STUDIO QUALITY')+'</span>';
      upload.insertAdjacentElement('afterend',card);
    }

    if(!$('.sa-v4-advanced')){
      const modeGroup=$$('[data-sa-mode]')?.closest('.sa-control-group');
      const colorPanel=$('#sa-v4-color-panel');
      const quality=$$('[data-sa-quality]')?.closest('.sa-control-group');
      const tuning=$('.sa-tune-row');
      const details=document.createElement('details');details.className='sa-v4-advanced';
      const summary=document.createElement('summary');summary.textContent=tr('إعدادات متقدمة','ADVANCED SETTINGS');details.appendChild(summary);
      [modeGroup,colorPanel,quality,tuning].forEach(el=>{if(el)details.appendChild(el)});
      const frame=$('.sa-framing-controls');
      (frame||generate)?.insertAdjacentElement(frame?'afterend':'beforebegin',details);
    }

    const preview=$('#sa-palette-preview'),tools=$('#sa-result-tools'),meta=$('#sa-v4-result-meta');
    if(preview&&tools&&preview.parentElement!==tools){
      preview.classList.add('sa-result-palette');
      if(meta)meta.insertAdjacentElement('afterend',preview);else tools.prepend(preview);
    }
    const hint=$('.sa-source-figure figcaption small');
    if(hint)hint.textContent=tr('اسحب واضبط وجهًا واحدًا داخل الدائرة','DRAG / ZOOM · KEEP ONE FACE IN THE CIRCLE');
  }

  function captureFramedRgba(size) {
    const src=$('#sa-user-source');
    if(!src) throw new Error('Source canvas unavailable');
    const c=document.createElement('canvas'); c.width=c.height=size;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    const contrast=Number($('#sa-contrast')?.value||1.12);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
    ctx.filter='contrast('+contrast+')';
    ctx.drawImage(src,0,0,src.width,src.height,0,0,size,size);
    ctx.filter='none';
    return ctx.getImageData(0,0,size,size).data;
  }

  async function detectFaceBox(){
    const src=$('#sa-user-source');
    if(!src || typeof window.FaceDetector!=='function') return null;
    try{
      const detector=new window.FaceDetector({fastMode:true,maxDetectedFaces:5});
      const faces=await detector.detect(src);
      if(!faces?.length)return null;
      const cx=src.width/2,cy=src.height/2;
      const ranked=faces.map(f=>{
        const b=f.boundingBox,fx=b.x+b.width/2,fy=b.y+b.height/2;
        const dist=Math.hypot((fx-cx)/src.width,(fy-cy)/src.height);
        return {b,score:b.width*b.height*(1-.40*Math.min(1,dist))};
      }).sort((a,b)=>b.score-a.score);
      const b=ranked[0].b;
      if(!b || b.width<8 || b.height<8) return null;
      const px=b.width*.18, py=b.height*.22;
      return {x:clamp((b.x-px)/src.width),y:clamp((b.y-py)/src.height),width:clamp((b.width+px*2)/src.width,.18,1),height:clamp((b.height+py*2)/src.height,.22,1)};
    }catch(_){return null}
  }

  function autoPaletteSize(rgba){
    let chroma=0,sat=0,n=0;
    const step=Math.max(4,Math.floor((rgba.length/4)/2600));
    for(let p=0;p<rgba.length/4;p+=step){
      const k=p*4,r=rgba[k]/255,g=rgba[k+1]/255,b=rgba[k+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),cc=mx-mn;
      chroma+=cc;sat+=mx>0?cc/mx:0;n++;
    }
    const score=(chroma/Math.max(1,n))*.62+(sat/Math.max(1,n))*.38;
    return score<.09?4:5;
  }

  function requestedPaletteSize(rgba,p){
    const selected=paletteChoice();
    return selected==='3'||selected==='4'||selected==='5'?Number(selected):(autoPaletteSize(rgba)||p.palette);
  }

  function pinsAsPairs(count,size){
    const flat=makeCirclePins({count,size,inset:1});
    return Array.from({length:count},(_,i)=>[flat[i*2],flat[i*2+1]]);
  }

  function hexWithAlpha(hex,a){
    const s=(hex||'#111111').replace('#','');
    const f=s.length===3?s.split('').map(x=>x+x).join(''):s;
    const r=parseInt(f.slice(0,2),16)||0,g=parseInt(f.slice(2,4),16)||0,b=parseInt(f.slice(4,6),16)||0;
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  function extractLines(result,p,size){
    const pins=pinsAsPairs(p.nails,size), lines=[], perColor=[];
    if(result.mode==='mono-global'){
      for(const trail of result.route?.trails||[]) for(let i=1;i<trail.length;i++) lines.push({a:trail[i-1],b:trail[i],color:'#111111',colorIndex:0});
      perColor[0]=lines.length;
    }else{
      const palette=result.palette?.hex||[];
      for(const route of result.routes||[]){
        const color=palette[route.colorIndex]||'#111111'; let n=0;
        for(const trail of route.trails||[]) for(let i=1;i<trail.length;i++){lines.push({a:trail[i-1],b:trail[i],color,colorIndex:route.colorIndex});n++}
        perColor[route.colorIndex]=n;
      }
    }
    const palette=result.mode==='mono-global'?['#111111']:(result.palette?.hex||[]);
    const colorsUsed=Math.max(1,perColor.filter((n)=>Number(n||0)>0).length);
    return {pins,lines,size,renderedRgb:result.renderedRgb||null,meta:{mode:result.mode,pins:p.nails,lines:lines.length,palette,perColor,colorsUsed,selectedColors:palette.length,mse:result.metrics?.mse||0,engine:'ATS-V4-global-optical'}};
  }

  function linearToSrgb(v){
    v=Math.max(0,Math.min(1,v));
    return v<=0.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-0.055;
  }
  function solverRaster(data){
    if(data._solverRaster)return data._solverRaster;
    if(!data.renderedRgb)return null;
    const off=document.createElement('canvas');off.width=off.height=data.size;
    const octx=off.getContext('2d'),img=octx.createImageData(data.size,data.size);
    for(let p=0;p<data.size*data.size;p++){
      const b=p*3,k=p*4;
      img.data[k]=Math.round(linearToSrgb(data.renderedRgb[b])*255);
      img.data[k+1]=Math.round(linearToSrgb(data.renderedRgb[b+1])*255);
      img.data[k+2]=Math.round(linearToSrgb(data.renderedRgb[b+2])*255);
      img.data[k+3]=255;
    }
    octx.putImageData(img,0,0);data._solverRaster=off;return off;
  }
  function paint(data,count=data.lines.length){
    const canvas=$('#sa-user-result');if(!canvas)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2.25),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#071923';ctx.fillRect(0,0,w,h);

    const art=Math.min(w,h),radius=art*.486,cx=w/2,cy=h/2;
    const scale=art/data.size,ox=(w-art)/2,oy=(h-art)/2;
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#f4f0e8';ctx.fillRect(ox,oy,art,art);

    const exactColor=data.meta.mode==='color-global'&&count>=data.lines.length&&Boolean(data.renderedRgb);
    if(exactColor){
      const raster=solverRaster(data);
      if(raster){ctx.save();ctx.globalAlpha=.94;ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,ox,oy,art,art);ctx.restore()}
    }

    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.globalCompositeOperation='multiply';ctx.lineCap='round';
    const alpha=data.meta.mode==='color-global'?(exactColor?.045:.11):.10;
    const lineWidth=data.meta.mode==='color-global'?.46:.54;
    for(let i=0;i<Math.min(count,data.lines.length);i++){
      const l=data.lines[i],p0=data.pins[l.a],p1=data.pins[l.b];
      ctx.strokeStyle=hexWithAlpha(l.color,alpha);ctx.lineWidth=lineWidth;
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#9a6a16';
    for(const p of data.pins){ctx.beginPath();ctx.arc(p[0],p[1],.62,0,Math.PI*2);ctx.fill()}
    ctx.restore();ctx.restore();

    ctx.strokeStyle='#d7ad59';ctx.lineWidth=Math.max(1,art*.0022);
    ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
  }

  function animate(data){
    cancelAnimationFrame(raf);let n=0;paint(data,0);
    const step=Math.max(8,Math.ceil(data.lines.length/180));
    const tick=()=>{n=Math.min(data.lines.length,n+step);paint(data,n);if(n<data.lines.length)raf=requestAnimationFrame(tick)};
    raf=requestAnimationFrame(tick);
  }

  function getWorker(){
    if(worker)return worker;
    worker=new Worker(new URL('./string-art-v4/worker.mjs',import.meta.url),{type:'module'});
    worker.onmessage=e=>{
      const msg=e.data,job=pending.get(msg.id);if(!job)return;
      if(msg.type==='progress'){job.onProgress?.(msg);return}
      pending.delete(msg.id);
      if(msg.type==='error')job.reject(new Error(msg.message||'V4 worker error'));else job.resolve(msg);
    };
    worker.onerror=e=>{
      const error=new Error(e.message||'V4 worker failed');
      for(const job of pending.values())job.reject(error);
      pending.clear();try{worker.terminate()}catch(_){}worker=null;
    };
    return worker;
  }

  function sendWorker(message,transfer=[],onProgress){
    const id=++requestId,w=getWorker();
    return new Promise((resolve,reject)=>{
      pending.set(id,{resolve,reject,onProgress});
      try{w.postMessage({...message,id},transfer)}catch(error){pending.delete(id);reject(error)}
    });
  }

  function schedulePrewarm(){
    const p=profile(),table={size:p.size,nails:p.nails,minGap:8,canvasMm:600,fiberWidthMm:.12,density:1};
    const key=JSON.stringify(table);if(prewarmed.has(key))return;prewarmed.add(key);
    setTimeout(()=>sendWorker({type:'prepare-table',table},[],msg=>{
      if(msg.phase==='matrix'){
        const pct=Math.min(18,(msg.done/Math.max(1,msg.total))*18);
        setStatus(tr('تجهيز محرك الخيوط في الخلفية…','PREPARING THREAD ENGINE IN BACKGROUND…'),pct);
      }
    }).then(()=>setStatus(tr('جاهز · اضبط الكادر ثم أنشئ البورتريه','READY · FRAME THE FACE, THEN CREATE'),0)).catch(error=>{
      prewarmed.delete(key);console.error('[ATS V4 PREWARM]',error);
    }),120);
  }

  function progressText(msg){
    const phase=msg.phase||'';
    if(phase==='matrix') return tr('بناء نموذج الخيط الفيزيائي…','BUILDING PHYSICAL THREAD MATRIX…');
    if(phase==='palette') return tr('محاكاة واختيار ألوان الخيط…','SIMULATING THREAD PALETTE…');
    if(phase==='preprocess') return tr('تحليل الوجه والملامح…','ANALYZING PORTRAIT FEATURES…');
    if(phase.includes('color')) return tr('تحسين الخط واللون والملامح عالميًا…','GLOBAL LINE + COLOR + PORTRAIT OPTIMIZATION…');
    if(phase.includes('mono')) return tr('تحسين توزيع الخيوط والملامح عالميًا…','GLOBAL THREAD + PORTRAIT OPTIMIZATION…');
    return tr('تشغيل محرك V4…','RUNNING ATS V4…');
  }

  function renderPalette(hex=[],counts=[]){
    const host=$('#sa-palette-preview');if(!host)return;
    if(!hex.length){host.innerHTML='<span class="sa-palette-empty">'+tr('لم يتم اختيار Palette بعد','NO PALETTE SELECTED YET')+'</span>';return}
    const entries=hex.map((h,i)=>({h,i,n:Number(counts[i]||0)}));
    const active=entries.filter((x)=>x.n>0),shown=active.length?active:entries;
    host.innerHTML=shown.map((x)=>'<span class="sa-palette-swatch" title="'+x.h+'"><i style="background:'+x.h+'"></i><b>'+x.h+'</b><small>'+x.n.toLocaleString()+' '+tr('خيط','FIBERS')+'</small></span>').join('');
  }

  function renderMeta(data){
    const set=(k,v)=>{const el=$('[data-v4-meta="'+k+'"]');if(el)el.textContent=v};
    set('mode',data.meta.mode==='color-global'?tr('ألوان بصرية','OPTICAL COLOR'):tr('أحادي واقعي','REALISTIC MONO'));
    set('fibers',Number(data.meta.lines||0).toLocaleString());
    set('nails',String(data.meta.pins||0));
    set('colors',String(data.meta.colorsUsed||1));
    renderPalette(data.meta.palette,data.meta.perColor);
  }
  async function generateV4(ev){
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const btn=$('#sa-generate');if(!btn)return;
    btn.disabled=true;$('#sa-result-tools')?.classList.add('hidden');
    try{
      ensureV4Controls();
      const p=profile(),m=mode(),rgba=captureFramedRgba(p.size),nColors=m==='color'?requestedPaletteSize(rgba,p):1;
      const faceBox=await detectFaceBox();
      setStatus(tr('تحليل الوجه والألوان…','ANALYZING FACE + COLORS…'),22);
      const response=await sendWorker({
        type:'solve-image-v4',
        table:{size:p.size,nails:p.nails,minGap:8,canvasMm:600,fiberWidthMm:.12,density:1},
        rgba,mode:m,
        preprocess:{
          gamma:Number($('#sa-gamma')?.value||.9),detail:p.detail,detailRadius:p.size/30,toneFloor:0,toneCeiling:.985,ditherBlend:.16,colorAffinityTemperature:.07,
          portraitPriority:true,faceBox,backgroundWeight:.045,faceBoost:1.65,edgeBoost:2.15,featureBoost:3.05,darkDetailBoost:.82,avoidanceBoost:1.42,backgroundSuppress:.76
        },
        palette:{nColors,fixedHex:['#111111'],simulationSize:Math.min(42,p.size),maxCombinations:1400},
        solve:{
          maxFibers:m==='color'?p.colorFibers:p.monoFibers,opacity:m==='color'?p.opacityColor:p.opacityMono,maxRepeat:m==='color'?p.repeatColor:p.repeatMono,allowRemove:true,
          candidateLimit:p.candidates,refreshEvery:p.refreshEvery,removalEvery:p.removalEvery,removalLimit:p.removalLimit,rescueMultiplier:3,
          chromaWeight:2.25,crossingPenalty:m==='color'?p.crossingColor:p.crossingMono,affinityStrength:m==='color'?1.4:0,minGain:1e-10
        },
        useDither:m==='color'
      },[rgba.buffer],msg=>{
        const total=msg.total||1,done=msg.done||0,phase=msg.phase||'';
        const pct=phase==='matrix'?Math.min(24,done/total*24):phase==='palette'?30:phase==='preprocess'?24+done/total*12:Math.min(96,36+done/total*60);
        setStatus(progressText(msg),pct);
      });
      const result=response.result;
      lastResult=result;lastRender=extractLines(result,p,p.size);
      window.__saV4LastResult=result;window.__saV4LastRender=lastRender;
      paint(lastRender,lastRender.lines.length);renderMeta(lastRender);
      const palette=lastRender.meta.palette.filter((_,i)=>Number(lastRender.meta.perColor[i]||0)>0).join(' · ');
      $('#sa-user-sequence').textContent=(m==='color'?'PALETTE '+palette+'  ·  ':'')+lastRender.lines.slice(0,10).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · ');
      $('#sa-result-tools')?.classList.remove('hidden');
      const usedColors=lastRender.meta.colorsUsed||1;
      setStatus(tr('اكتمل · البورتريه جاهز','COMPLETE · YOUR PORTRAIT IS READY')+' · '+lastRender.lines.length.toLocaleString()+' '+tr('خيط','FIBERS')+' · '+usedColors+' '+tr('ألوان','COLORS'),100);
    }catch(error){
      console.error('[ATS V4]',error);setStatus(tr('فشل V4: ','V4 FAILED: ')+(error.message||error),100);
    }finally{btn.disabled=false}
  }
  function savePng(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const c=$('#sa-user-result');if(!c)return;
    paint(lastRender,lastRender.lines.length);
    c.toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='ATS-string-art-V4.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},'image/png',1);
  }

  async function sharePng(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const c=$('#sa-user-result');if(!c)return;
    const blob=await new Promise(r=>c.toBlob(r,'image/png',1));if(!blob)return;
    const file=new File([blob],'ATS-string-art-V4.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:'ATS String Art V4'});
    else savePng();
  }

  function bindOnce(el,key,type,handler){
    if(!el||el.dataset[key])return;el.dataset[key]='1';el.addEventListener(type,handler,true);
  }

  function attach(){
    if(!ensureV4Controls())return false;
    simplifyV4Ui();
    const btn=$('#sa-generate');if(!btn)return false;
    bindOnce(btn,'v4Bound','click',generateV4);
    bindOnce($('#sa-user-replay'),'v4Bound','click',e=>{if(!lastRender)return;e.preventDefault();e.stopImmediatePropagation();animate(lastRender)});
    bindOnce($('#sa-user-download'),'v4Bound','click',savePng);
    bindOnce($('#sa-user-share'),'v4Bound','click',sharePng);
    bindOnce($('#sa-user-file'),'v4WarmBound','change',()=>schedulePrewarm());
    $('#sa-user-speak')?.classList.add('sa-v4-hidden-action');
    $('#sa-user-video')?.classList.add('sa-v4-hidden-action');
    window.__ATS_STRING_ART_V4_GENERATE=generateV4;
    document.documentElement.dataset.saEngine='v4';
    setStatus(tr('ارفع صورة واحدة · سنضبط الباقي تلقائيًا','UPLOAD ONE PHOTO · ATS HANDLES THE REST'),0);
    return true;
  }

  function tryAttach(){
    if(attach())return;
    const o=new MutationObserver(()=>{if(attach())o.disconnect()});
    o.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>o.disconnect(),15000);
  }

  document.addEventListener('ats:stringart:rendered',()=>setTimeout(tryAttach,30));
  document.addEventListener('portfolio:languagechange',()=>setTimeout(tryAttach,100));
  tryAttach();
}
