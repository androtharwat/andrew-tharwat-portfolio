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

  const AR = () => document.documentElement.lang === 'ar';
  const setStatus = (msg, pct=0) => {
    const s=$('#sa-lab-status'), p=$('#sa-lab-progress');
    if(s) s.textContent=msg;
    if(p) p.textContent=Math.max(0,Math.min(100,Math.round(pct)))+'%';
  };

  const tr = (ar, en) => AR() ? ar : en;
  const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));

  const profile = () => {
    const q = $('[data-sa-quality].active')?.dataset.saQuality || 'share';
    if(q === 'quick' || q === 'fast') return { size:144, nails:220, monoFibers:2400, colorFibers:3400, candidates:120, palette:4, detail:.58, crossingMono:.14, crossingColor:.10, opacityMono:.62, opacityColor:.54, repeatMono:2, repeatColor:2, refreshEvery:640 };
    if(q === 'enhanced') return { size:184, nails:300, monoFibers:4800, colorFibers:6800, candidates:165, palette:5, detail:.68, crossingMono:.17, crossingColor:.12, opacityMono:.54, opacityColor:.46, repeatMono:3, repeatColor:2, refreshEvery:520 };
    return { size:224, nails:360, monoFibers:7600, colorFibers:10800, candidates:210, palette:6, detail:.78, crossingMono:.20, crossingColor:.145, opacityMono:.48, opacityColor:.40, repeatMono:3, repeatColor:2, refreshEvery:420 };
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
    $('[data-sa-mode]').forEach(b=>{
      if(b.dataset.v4ModeBound)return;b.dataset.v4ModeBound='1';
      b.addEventListener('click',()=>{$('[data-sa-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateColorPanel()});
    });
    $('[data-sa-colors]').forEach(b=>{
      if(b.dataset.v4ColorBound)return;b.dataset.v4ColorBound='1';
      b.addEventListener('click',()=>{$('[data-sa-colors]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
    });
    updateColorPanel();
    return true;
  }

  function captureFramedRgba(size) {
    const src=$('#sa-user-source');
    if(!src) throw new Error('Source canvas unavailable');
    const c=document.createElement('canvas'); c.width=c.height=size;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
    ctx.drawImage(src,0,0,src.width,src.height,0,0,size,size);
    return ctx.getImageData(0,0,size,size).data;
  }

  async function detectFaceBox(){
    const src=$('#sa-user-source');
    if(!src || typeof window.FaceDetector!=='function') return null;
    try{
      const detector=new window.FaceDetector({fastMode:true,maxDetectedFaces:1});
      const faces=await detector.detect(src), b=faces?.[0]?.boundingBox;
      if(!b || b.width<8 || b.height<8) return null;
      const px=b.width*.15, py=b.height*.20;
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
    return score<.065?4:score<.16?5:6;
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
    const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2.5),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#f2efe8';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w,h)/data.size,ox=(w-data.size*scale)/2,oy=(h-data.size*scale)/2;
    const exactColor=data.meta.mode==='color-global'&&count>=data.lines.length&&Boolean(data.renderedRgb);
    if(exactColor){
      const raster=solverRaster(data);
      if(raster){ctx.save();ctx.globalAlpha=.94;ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,ox,oy,data.size*scale,data.size*scale);ctx.restore()}
    }
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.globalCompositeOperation='multiply';ctx.lineCap='round';
    const alpha=data.meta.mode==='color-global'?(exactColor?.042:.11):.10;
    const lineWidth=data.meta.mode==='color-global'?.48:.54;
    for(let i=0;i<Math.min(count,data.lines.length);i++){
      const l=data.lines[i],p0=data.pins[l.a],p1=data.pins[l.b];
      ctx.strokeStyle=hexWithAlpha(l.color,alpha);ctx.lineWidth=lineWidth;
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#9a6a16';
    for(const p of data.pins){ctx.beginPath();ctx.arc(p[0],p[1],.7,0,Math.PI*2);ctx.fill()}
    ctx.restore();
  }

  function animate(data){
    cancelAnimationFrame(raf);let n=0;paint(data,0);
    const step=Math.max(8,Math.ceil(data.lines.length/180));
    const tick=()=>{n=Math.min(data.lines.length,n+step);paint(data,n);if(n<data.lines.length)raf=requestAnimationFrame(tick)};
    raf=requestAnimationFrame(tick);
  }

  function workerForRun(){
    if(worker) worker.terminate();
    worker=new Worker(new URL('./string-art-v4/worker.mjs',import.meta.url),{type:'module'});
    return worker;
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
      const id=++requestId,w=workerForRun();
      setStatus(tr('V4 · تحليل الصورة وبناء خريطة الملامح…','V4 · BUILDING PORTRAIT PRIORITY MAP…'),1);
      const done=new Promise((resolve,reject)=>{
        w.onmessage=e=>{
          const msg=e.data;if(msg.id!==id)return;
          if(msg.type==='progress'){
            const total=msg.total||1,done=msg.done||0;
            const pct=msg.phase==='matrix'?Math.min(18,done/total*18):msg.phase==='palette'?22:Math.min(97,24+done/total*73);
            setStatus(progressText(msg),pct);return;
          }
          if(msg.type==='error') reject(new Error(msg.message||'V4 worker error'));
          if(msg.type==='v4-result') resolve(msg.result);
        };
        w.onerror=e=>reject(new Error(e.message||'V4 worker failed'));
      });
      w.postMessage({
        type:'solve-image-v4',id,
        table:{size:p.size,nails:p.nails,minGap:8,canvasMm:600,fiberWidthMm:.12,density:1},
        rgba,mode:m,
        preprocess:{
          gamma:Number($('#sa-gamma')?.value||.9),detail:p.detail,detailRadius:p.size/30,toneFloor:0,toneCeiling:.985,ditherBlend:.18,colorAffinityTemperature:.07,
          portraitPriority:true,faceBox,backgroundWeight:.055,faceBoost:1.55,edgeBoost:2.05,featureBoost:2.85,darkDetailBoost:.78,avoidanceBoost:1.38,backgroundSuppress:.72
        },
        palette:{nColors,fixedHex:['#111111'],simulationSize:Math.min(58,p.size),maxCombinations:2500},
        solve:{
          maxFibers:m==='color'?p.colorFibers:p.monoFibers,opacity:m==='color'?p.opacityColor:p.opacityMono,maxRepeat:m==='color'?p.repeatColor:p.repeatMono,allowRemove:true,
          candidateLimit:p.candidates,refreshEvery:p.refreshEvery,chromaWeight:2.15,crossingPenalty:m==='color'?p.crossingColor:p.crossingMono,affinityStrength:m==='color'?1.35:0,minGain:1e-10
        },
        useDither:m==='color'
      },[rgba.buffer]);
      const result=await done;
      lastResult=result;lastRender=extractLines(result,p,p.size);
      window.__saV4LastResult=result;window.__saV4LastRender=lastRender;
      animate(lastRender);renderMeta(lastRender);
      const palette=lastRender.meta.palette.filter((_,i)=>Number(lastRender.meta.perColor[i]||0)>0).join(' · ');
      $('#sa-user-sequence').textContent=(m==='color'?'PALETTE '+palette+'  ·  ':'')+lastRender.lines.slice(0,10).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · ');
      $('#sa-result-tools')?.classList.remove('hidden');
      const usedColors=lastRender.meta.colorsUsed||1;
      setStatus(tr('اكتمل V4','V4 COMPLETE')+' · '+lastRender.lines.length+' '+tr('خيط','FIBERS')+' · '+p.nails+' '+tr('مسمار','NAILS')+(m==='color'?' · '+usedColors+' '+tr('ألوان مستخدمة','COLORS USED'):'') ,100);
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
    const btn=$('#sa-generate');if(!btn)return false;
    bindOnce(btn,'v4Bound','click',generateV4);
    bindOnce($('#sa-user-replay'),'v4Bound','click',e=>{if(!lastRender)return;e.preventDefault();e.stopImmediatePropagation();animate(lastRender)});
    bindOnce($('#sa-user-download'),'v4Bound','click',savePng);
    bindOnce($('#sa-user-share'),'v4Bound','click',sharePng);
    $('#sa-user-speak')?.classList.add('sa-v4-hidden-action');
    $('#sa-user-video')?.classList.add('sa-v4-hidden-action');
    window.__ATS_STRING_ART_V4_GENERATE=generateV4;
    document.documentElement.dataset.saEngine='v4';
    setStatus(tr('V4 جاهز · Mono + Optical Color · الصورة لا تغادر جهازك','V4 READY · MONO + OPTICAL COLOR · IMAGE STAYS ON DEVICE'),0);
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
