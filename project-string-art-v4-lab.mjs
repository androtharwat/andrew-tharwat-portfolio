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
    if(q === 'quick' || q === 'fast') return { size:132, nails:190, monoFibers:1450, colorFibers:2300, candidates:100, palette:4, detail:.54, crossingMono:.12, crossingColor:.085 };
    if(q === 'enhanced') return { size:170, nails:250, monoFibers:2550, colorFibers:4100, candidates:125, palette:5, detail:.60, crossingMono:.135, crossingColor:.095 };
    return { size:208, nails:320, monoFibers:4100, colorFibers:6200, candidates:155, palette:5, detail:.66, crossingMono:.15, crossingColor:.105 };
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
    return score<.085?3:score<.19?4:5;
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
    const pins=pinsAsPairs(p.nails,size), lines=[];
    if(result.mode==='mono-global'){
      for(const trail of result.route?.trails||[]) for(let i=1;i<trail.length;i++) lines.push({a:trail[i-1],b:trail[i],color:'#111111'});
    }else{
      const palette=result.palette?.hex||[];
      for(const route of result.routes||[]){
        const color=palette[route.colorIndex]||'#111111';
        for(const trail of route.trails||[]) for(let i=1;i<trail.length;i++) lines.push({a:trail[i-1],b:trail[i],color});
      }
    }
    return {pins,lines,size,meta:{mode:result.mode,pins:p.nails,lines:lines.length,palette:result.palette?.hex||[],mse:result.metrics?.mse||0,engine:'ATS-V4-global-optical'}};
  }

  function paint(data,count=data.lines.length){
    const canvas=$('#sa-user-result');if(!canvas)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2.5),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#f2efe8';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w,h)/data.size,ox=(w-data.size*scale)/2,oy=(h-data.size*scale)/2;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.globalCompositeOperation='multiply';ctx.lineCap='round';
    const alpha=data.meta.mode==='color-global'?.115:.095;
    const lineWidth=data.meta.mode==='color-global'?.58:.52;
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
    if(phase==='matrix') return AR()?'بناء نموذج الخيط الفيزيائي…':'BUILDING PHYSICAL THREAD MATRIX…';
    if(phase==='palette') return AR()?'اختيار ألوان الخيط…':'SIMULATING THREAD PALETTE…';
    if(phase==='preprocess') return AR()?'تحضير الصورة…':'PREPARING IMAGE…';
    if(phase.includes('color')) return AR()?'تحسين الخط واللون عالميًا…':'GLOBAL LINE + COLOR OPTIMIZATION…';
    if(phase.includes('mono')) return AR()?'تحسين توزيع الخيوط عالميًا…':'GLOBAL THREAD OPTIMIZATION…';
    return AR()?'تشغيل محرك V4…':'RUNNING ATS V4…';
  }

  async function generateV4(ev){
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const btn=$('#sa-generate');if(!btn)return;
    btn.disabled=true;$('#sa-result-tools')?.classList.add('hidden');
    const p=profile(),m=mode(),rgba=captureFramedRgba(p.size),id=++requestId,w=workerForRun();
    setStatus(AR()?'V4 · تجهيز الحل العالمي…':'V4 · PREPARING GLOBAL SOLVER…',1);
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
      preprocess:{gamma:Number($('#sa-gamma')?.value||.9),detail:.48,toneFloor:0,toneCeiling:.97},
      palette:{nColors:p.palette,fixedHex:['#111111'],simulationSize:Math.min(52,p.size),maxCombinations:2500},
      solve:{
        maxFibers:m==='color'?p.colorFibers:p.monoFibers,
        opacity:1,maxRepeat:m==='color'?1:2,allowRemove:true,
        candidateLimit:p.candidates,refreshEvery:1000000000,
        chromaWeight:1.9
      },
      useDither:m==='color'
    },[rgba.buffer]);
    try{
      const result=await done;
      lastResult=result;lastRender=extractLines(result,p,p.size);
      window.__saV4LastResult=result;window.__saV4LastRender=lastRender;
      animate(lastRender);
      const palette=(result.palette?.hex||[]).join(' · ');
      $('#sa-user-sequence').textContent=(m==='color'?'PALETTE '+palette+'  ·  ':'')+
        (lastRender.lines.slice(0,10).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · '));
      $('#sa-result-tools')?.classList.remove('hidden');
      const mse=(result.metrics?.mse||0).toFixed(4);
      setStatus((AR()?'اكتمل V4':'V4 COMPLETE')+' · '+lastRender.lines.length+' '+(AR()?'خيط':'FIBERS')+' · '+p.nails+' '+(AR()?'مسمار':'NAILS')+' · MSE '+mse,100);
    }catch(error){
      console.error('[ATS V4]',error);setStatus((AR()?'فشل V4: ':'V4 FAILED: ')+(error.message||error),100);
    }finally{btn.disabled=false}
  }

  function savePng(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const c=$('#sa-user-result');if(!c)return;
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

  function attach(){
    const btn=$('#sa-generate');if(!btn||btn.dataset.v4Bound)return false;
    btn.dataset.v4Bound='1';
    btn.addEventListener('click',generateV4,true);
    $('#sa-user-replay')?.addEventListener('click',e=>{if(!lastRender)return;e.preventDefault();e.stopImmediatePropagation();animate(lastRender)},true);
    $('#sa-user-download')?.addEventListener('click',savePng,true);
    $('#sa-user-share')?.addEventListener('click',sharePng,true);
    document.documentElement.dataset.saEngine='v4';
    setStatus(AR()?'V4 LAB جاهز · الصورة لا تغادر جهازك':'V4 LAB READY · IMAGE STAYS ON DEVICE',0);
    return true;
  }

  if(!attach()){
    const o=new MutationObserver(()=>{if(attach())o.disconnect()});
    o.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>o.disconnect(),15000);
  }
}
