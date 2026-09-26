(() => {
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='magic-of-string-art')return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const wait=(ms=0)=>new Promise(r=>setTimeout(r,ms));
  const AR=()=>document.documentElement.lang==='ar';

  let frame=0,raf=0,portrait=null;
  let userImage=null,userResult=null,userSequence=[],userRaf=0;
  let mode='mono',quality='quick';
  const framing={zoom:1,panX:0,panY:0,rotation:0};

  function drawHeroThreads(){
    const canvas=$('#sa-hero-thread');if(!canvas)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(236,205,137,.12)';ctx.lineWidth=.7;
    const pts=[],count=42;for(let i=0;i<count;i++){const t=i/(count-1);pts.push([12+t*(w-24),i%2?12:h-12])}
    for(let i=0;i<78;i++){const a=pts[(i*13)%count],b=pts[(i*29+7)%count];ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  }

  function makePins(size,count){const pins=[],r=size*.48,c=size/2;for(let i=0;i<count;i++){const a=Math.PI*2*i/count-Math.PI/2;pins.push([c+r*Math.cos(a),c+r*Math.sin(a)])}return pins}
  function lineSampler(pins,size){
    const cache=new Map();
    return (a,b)=>{const key=a<b?a+'-'+b:b+'-'+a;if(cache.has(key))return cache.get(key);const p0=pins[a],p1=pins[b],arr=new Uint32Array(56);
      for(let k=0;k<arr.length;k++){const t=k/(arr.length-1),x=Math.max(0,Math.min(size-1,Math.round(p0[0]+(p1[0]-p0[0])*t))),y=Math.max(0,Math.min(size-1,Math.round(p0[1]+(p1[1]-p0[1])*t)));arr[k]=y*size+x}
      cache.set(key,arr);return arr}
  }

  function buildSyntheticPortrait(){
    const size=180,pinCount=88,total=360,residual=new Float32Array(size*size);
    const g=(x,y,cx,cy,sx,sy,a)=>a*Math.exp(-((((x-cx)/sx)**2)+(((y-cy)/sy)**2))/2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x-size/2)/(size/2),v=(y-size/2)/(size/2);let d=0;
      d+=g(u,v,0,.05,.50,.68,.18)+g(u,v,-.47,.04,.10,.46,.24)+g(u,v,.47,.04,.10,.46,.24);
      d+=g(u,v,-.28,-.28,.17,.035,.65)+g(u,v,.28,-.28,.17,.035,.65)+g(u,v,-.27,-.16,.12,.055,.90)+g(u,v,.27,-.16,.12,.055,.90);
      d+=g(u,v,0,.04,.035,.23,.44)+g(u,v,-.05,.20,.08,.035,.52)+g(u,v,.05,.20,.08,.035,.52)+g(u,v,0,.40,.27,.045,.90)+g(u,v,-.30,.16,.17,.18,.15)+g(u,v,.30,.16,.17,.18,.15)+g(u,v,0,.62,.28,.045,.24);
      residual[y*size+x]=Math.min(1,d)}
    return buildGreedySync(residual,size,pinCount,total,'black',.09);
  }
  function buildGreedySync(residual,size,pinCount,total,color,subtract){
    const pins=makePins(size,pinCount),samples=lineSampler(pins,size),used=new Map(),lines=[];let cur=7%pinCount;
    for(let step=0;step<total;step++){let best=-1e9,bp=-1;
      for(let j=0;j<pinCount;j++){if(j===cur)continue;const dist=Math.min((j-cur+pinCount)%pinCount,(cur-j+pinCount)%pinCount);if(dist<Math.max(4,Math.floor(pinCount*.045)))continue;
        const key=cur<j?cur+'-'+j:j+'-'+cur,arr=samples(cur,j);let sum=0;for(let k=0;k<arr.length;k++)sum+=residual[arr[k]];
        const score=sum/arr.length-.04*(used.get(key)||0);if(score>best){best=score;bp=j}}
      if(bp<0)break;const key=cur<bp?cur+'-'+bp:bp+'-'+cur,arr=samples(cur,bp);for(let k=0;k<arr.length;k++)residual[arr[k]]=Math.max(-.25,residual[arr[k]]-subtract);
      used.set(key,(used.get(key)||0)+1);lines.push({a:cur,b:bp,color});cur=bp}
    return{pins,lines,size}
  }

  const strokeFor=(color,exportMode=false)=>{
    const alpha=exportMode?1:.82;
    if(color==='white')return `rgba(247,240,222,${.18*alpha})`;
    if(color==='yellow')return `rgba(225,180,58,${.22*alpha})`;
    if(color==='brown')return `rgba(112,65,38,${.22*alpha})`;
    if(color==='blue')return `rgba(45,83,132,${.22*alpha})`;
    return `rgba(6,10,13,${.17*alpha})`;
  };

  function paintPortrait(canvas,data,count,bg='#eee7d7'){
    if(!canvas||!data)return;const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2.5),w=Math.max(1,box.width),h=Math.max(1,box.height);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const scale=Math.min(w,h)/data.size,ox=(w-data.size*scale)/2,oy=(h-data.size*scale)/2;ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    for(let i=0;i<Math.min(count,data.lines.length);i++){const line=data.lines[i],p0=data.pins[line.a],p1=data.pins[line.b];ctx.strokeStyle=strokeFor(line.color);ctx.lineWidth=.42;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    ctx.fillStyle=bg==='#07131b'?'rgba(222,190,118,.72)':'#a77320';data.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.82,0,Math.PI*2);ctx.fill()});ctx.restore();
  }

  function paintDemo(count){paintPortrait($('#sa-thread-demo'),portrait,count,'#eee7d7');const line=$('#sa-line-count'),route=$('#sa-pin-route');if(line)line.textContent=String(Math.min(count,portrait.lines.length)).padStart(3,'0')+' / '+portrait.lines.length;const p=portrait.lines[Math.max(0,Math.min(count-1,portrait.lines.length-1))];if(route&&p)route.textContent='PIN '+String(p.a).padStart(2,'0')+' → '+String(p.b).padStart(2,'0')}
  function playDemo(){cancelAnimationFrame(raf);frame=0;paintDemo(0);if(matchMedia('(prefers-reduced-motion: reduce)').matches){frame=portrait.lines.length;paintDemo(frame);return}const tick=()=>{frame=Math.min(portrait.lines.length,frame+3);paintDemo(frame);if(frame<portrait.lines.length)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
  function initDemo(){const canvas=$('#sa-thread-demo');if(!canvas||canvas.dataset.ready)return;canvas.dataset.ready='1';portrait=buildSyntheticPortrait();paintDemo(0);const observer=new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting)){observer.disconnect();playDemo()}},{threshold:.35});observer.observe(canvas);$('#sa-replay')?.addEventListener('click',playDemo)}

  function drawFramedImage(ctx,img,size,opts=framing){
    ctx.save();ctx.clearRect(0,0,size,size);ctx.fillStyle='#0a1b24';ctx.fillRect(0,0,size,size);
    const base=Math.max(size/img.width,size/img.height),s=base*opts.zoom;
    ctx.translate(size/2+opts.panX*size,size/2+opts.panY*size);ctx.rotate(opts.rotation*Math.PI/180);ctx.scale(s,s);ctx.drawImage(img,-img.width/2,-img.height/2);ctx.restore();
  }
  function drawSourceEditor(){
    const c=$('#sa-user-source');if(!c)return;const ctx=c.getContext('2d'),size=c.width;
    if(!userImage){ctx.fillStyle='#0a1b24';ctx.fillRect(0,0,size,size);ctx.strokeStyle='rgba(215,173,89,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(size/2,size/2,size*.36,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#6f8794';ctx.font='700 18px Montserrat,Arial';ctx.textAlign='center';ctx.fillText('YOUR PORTRAIT',size/2,size/2+6);return}
    drawFramedImage(ctx,userImage,size);
  }
  function drawResultPlaceholder(){const c=$('#sa-user-result');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#0a1b24';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(215,173,89,.08)';for(let i=0;i<28;i++){ctx.beginPath();ctx.moveTo(0,(i/27)*h);ctx.lineTo(w,((i*11)%28)/27*h);ctx.stroke()}}

  function imageToTarget(img,size,contrast,gamma){
    const off=document.createElement('canvas');off.width=off.height=size;const ctx=off.getContext('2d',{willReadFrequently:true});drawFramedImage(ctx,img,size);
    const data=ctx.getImageData(0,0,size,size),mono=new Float32Array(size*size),rgb=new Uint8ClampedArray(data.data);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,k=i*4,r=data.data[k],g=data.data[k+1],b=data.data[k+2];let lum=(.2126*r+.7152*g+.0722*b)/255;lum=Math.pow(Math.max(0,Math.min(1,(lum-.5)*contrast+.5)),gamma);const dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),rad=Math.sqrt(dx*dx+dy*dy),mask=Math.max(0,Math.min(1,(1.02-rad)/.16));mono[i]=(1-lum)*mask}
    return{mono,rgb,canvas:off}
  }
  function colorResiduals(rgb,size){
    const palette=[['white',[242,235,216]],['yellow',[220,176,60]],['brown',[118,72,43]],['blue',[45,81,128]],['black',[20,23,26]]],layers={};palette.forEach(([n])=>layers[n]=new Float32Array(size*size));
    for(let i=0;i<size*size;i++){const x=i%size,y=(i/size)|0,dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),mask=Math.max(0,Math.min(1,(1.02-Math.sqrt(dx*dx+dy*dy))/.16)),k=i*4,r=rgb[k],g=rgb[k+1],b=rgb[k+2];const best=[];
      for(const [name,p] of palette){const d=((r-p[0])**2+(g-p[1])**2+(b-p[2])**2);best.push([d,name])}best.sort((a,b)=>a[0]-b[0]);layers[best[0][1]][i]=Math.exp(-best[0][0]/5000)*mask;layers[best[1][1]][i]=.42*Math.exp(-best[1][0]/5000)*mask}
    return layers
  }
  async function greedyAsync(residual,size,pinCount,total,color,subtract,onProgress,offset=0,whole=total){
    const pins=makePins(size,pinCount),samples=lineSampler(pins,size),used=new Map(),lines=[];let cur=7%pinCount;
    for(let step=0;step<total;step++){let best=-1e9,bp=-1;for(let j=0;j<pinCount;j++){if(j===cur)continue;const dist=Math.min((j-cur+pinCount)%pinCount,(cur-j+pinCount)%pinCount);if(dist<Math.max(5,Math.floor(pinCount*.04)))continue;const key=cur<j?cur+'-'+j:j+'-'+cur,arr=samples(cur,j);let sum=0;for(let k=0;k<arr.length;k++)sum+=residual[arr[k]];const score=sum/arr.length-.045*(used.get(key)||0);if(score>best){best=score;bp=j}}if(bp<0)break;
      const key=cur<bp?cur+'-'+bp:bp+'-'+cur,arr=samples(cur,bp);for(let k=0;k<arr.length;k++)residual[arr[k]]=Math.max(-.25,residual[arr[k]]-subtract);used.set(key,(used.get(key)||0)+1);lines.push({a:cur,b:bp,color});cur=bp;
      if(step%18===0){onProgress?.(Math.round(((offset+step)/whole)*100));await wait()}}
    return{pins,lines,size}
  }

  const profileFor=()=>{
    if(quality==='share')return{size:240,pins:240,lines:mode==='color'?3000:2700,subtract:.055};
    if(quality==='enhanced')return{size:200,pins:180,lines:mode==='color'?1750:1550,subtract:.068};
    return{size:160,pins:120,lines:mode==='color'?850:720,subtract:.088};
  };
  function setStatus(msg,pct){if($('#sa-lab-status'))$('#sa-lab-status').textContent=msg;if($('#sa-lab-progress'))$('#sa-lab-progress').textContent=pct+'%'}
  function seqText(lines,limit=14){return lines.slice(0,limit).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · ')}

  async function generateUser(){
    if(!userImage)return;const btn=$('#sa-generate');btn.disabled=true;$('#sa-result-tools')?.classList.add('hidden');setStatus(AR()?'جارٍ الحساب…':'COMPUTING THREAD ROUTES…',1);
    const contrast=Number($('#sa-contrast')?.value||1.2),gamma=Number($('#sa-gamma')?.value||.9),p=profileFor(),prep=imageToTarget(userImage,p.size,contrast,gamma);let result;
    if(mode==='mono'){result=await greedyAsync(new Float32Array(prep.mono),p.size,p.pins,p.lines,'black',p.subtract,x=>setStatus(AR()?'جارٍ بناء الخيوط…':'BUILDING THREADS…',x))}
    else{const layers=colorResiduals(prep.rgb,p.size),order=[['white',.20],['yellow',.21],['brown',.24],['blue',.16],['black',.19]],all=[];let sharedPins=null,offset=0;
      for(const [name,share] of order){const budget=Math.max(60,Math.round(p.lines*share)),part=await greedyAsync(layers[name],p.size,p.pins,budget,name,.085,x=>setStatus(AR()?'طبقة '+name:'LAYER '+name.toUpperCase(),Math.min(99,Math.round((offset+x*budget/100)/p.lines*100))),offset,p.lines);sharedPins=part.pins;all.push(...part.lines);offset+=budget}
      result={pins:sharedPins,lines:all,size:p.size}
    }
    result.meta={quality,mode,pins:p.pins,lines:result.lines.length};
    userResult=result;userSequence=result.lines;window.__saUserBg=mode==='color'?'#07131b':'#eee7d7';animateUser(result);$('#sa-user-sequence').textContent=seqText(result.lines);$('#sa-result-tools')?.classList.remove('hidden');setStatus(AR()?'جاهزة للحفظ والمشاركة':'READY TO SAVE + SHARE',100);btn.disabled=false
  }
  function animateUser(data){cancelAnimationFrame(userRaf);let n=0;paintPortrait($('#sa-user-result'),data,0,window.__saUserBg);if(matchMedia('(prefers-reduced-motion: reduce)').matches){paintPortrait($('#sa-user-result'),data,data.lines.length,window.__saUserBg);return}const tick=()=>{n=Math.min(data.lines.length,n+Math.max(6,Math.ceil(data.lines.length/165)));paintPortrait($('#sa-user-result'),data,n,window.__saUserBg);if(n<data.lines.length)userRaf=requestAnimationFrame(tick)};userRaf=requestAnimationFrame(tick)}

  function drawExport(data,count,canvas,{size=1800,footer=150}={}){
    canvas.width=size;canvas.height=size+footer;const ctx=canvas.getContext('2d'),bg=window.__saUserBg||'#eee7d7';ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
    const scale=size/data.size;ctx.save();ctx.scale(scale,scale);
    for(let i=0;i<Math.min(count,data.lines.length);i++){const l=data.lines[i],p0=data.pins[l.a],p1=data.pins[l.b];ctx.strokeStyle=strokeFor(l.color,true);ctx.lineWidth=.34;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    ctx.fillStyle=bg==='#07131b'?'rgba(230,194,115,.82)':'#9a6a16';data.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.72,0,Math.PI*2);ctx.fill()});ctx.restore();
    const grad=ctx.createLinearGradient(0,size,0,size+footer);grad.addColorStop(0,'#071723');grad.addColorStop(1,'#031018');ctx.fillStyle=grad;ctx.fillRect(0,size,size,footer);
    ctx.fillStyle='#d7ad59';ctx.font=`900 ${Math.round(size*.037)}px Montserrat,Arial`;ctx.fillText('ATS',Math.round(size*.045),size+Math.round(footer*.55));
    ctx.fillStyle='#e7edf0';ctx.font=`800 ${Math.round(size*.013)}px Montserrat,Arial`;ctx.fillText('ANDREW THARWAT STUDIO · STRING ART EXPERIENCE',Math.round(size*.14),size+Math.round(footer*.43));
    ctx.fillStyle='#7994a3';ctx.font=`700 ${Math.round(size*.010)}px Montserrat,Arial`;ctx.fillText(`© ATS 2026  ·  ${data.meta?.pins||data.pins.length} PINS  ·  ${data.lines.length} LINES  ·  ${String(data.meta?.mode||mode).toUpperCase()}`,Math.round(size*.14),size+Math.round(footer*.69));
    ctx.textAlign='right';ctx.fillStyle='#9aafba';ctx.fillText('GENERATED WITH ATS',size-Math.round(size*.045),size+Math.round(footer*.57));ctx.textAlign='left';
    return canvas;
  }
  async function exportBlob(type='png'){
    if(!userResult)return null;const c=document.createElement('canvas');drawExport(userResult,userResult.lines.length,c,{size:quality==='share'?2200:1800,footer:160});
    if(type==='png')return await new Promise(r=>c.toBlob(r,'image/png',1));return c
  }
  function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
  async function downloadPNG(){const b=$('#sa-user-download');if(!userResult||!b)return;b.classList.add('busy');setStatus(AR()?'تجهيز PNG عالي الجودة…':'RENDERING HQ PNG…',100);const blob=await exportBlob('png');if(blob)downloadBlob(blob,'ATS-string-art-portrait.png');b.classList.remove('busy');setStatus(AR()?'تم حفظ النتيجة بعلامة ATS':'SAVED WITH ATS MARK',100)}
  async function sharePNG(){if(!userResult)return;const blob=await exportBlob('png');if(!blob)return;const file=new File([blob],'ATS-string-art-portrait.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'ATS String Art Experience',text:'Generated with Andrew Tharwat Studio'})}else downloadBlob(blob,'ATS-string-art-portrait.png')}
  async function exportVideo(){
    if(!userResult)return;const btn=$('#sa-user-video');if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){setStatus(AR()?'المتصفح لا يدعم تصدير الفيديو — احفظ PNG':'VIDEO EXPORT NOT SUPPORTED — SAVE PNG',100);return}
    btn?.classList.add('busy');const c=document.createElement('canvas'),stream=c.captureStream(30),types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'],mime=types.find(t=>MediaRecorder.isTypeSupported?.(t))||'';
    let rec;try{rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:7000000}:undefined)}catch(e){btn?.classList.remove('busy');setStatus('VIDEO EXPORT UNAVAILABLE',100);return}
    const chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const done=new Promise(resolve=>rec.onstop=()=>resolve(new Blob(chunks,{type:rec.mimeType||mime||'video/webm'})));rec.start(200);
    const frames=150,total=userResult.lines.length;for(let i=0;i<frames;i++){const count=Math.round(total*(i/(frames-1)));drawExport(userResult,count,c,{size:1080,footer:120});setStatus(AR()?'تصدير الفيديو…':'EXPORTING BUILD VIDEO…',Math.round((i+1)/frames*100));await wait(34)}
    rec.stop();const blob=await done;const ext=(rec.mimeType||mime).includes('mp4')?'mp4':'webm';downloadBlob(blob,'ATS-string-art-build.'+ext);btn?.classList.remove('busy');setStatus(AR()?'تم حفظ الفيديو بعلامة ATS':'VIDEO SAVED WITH ATS MARK',100)
  }
  function speakSequence(){if(!userSequence.length||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const numbers=userSequence.slice(0,24).map(x=>x.b).join('، '),u=new SpeechSynthesisUtterance(numbers);u.lang=AR()?'ar-EG':'en-US';u.rate=.82;window.speechSynthesis.speak(u)}

  function resetFraming(centerOnly=false){framing.panX=0;framing.panY=0;if(!centerOnly){framing.zoom=1;framing.rotation=0;const z=$('#sa-zoom');if(z)z.value='1';const zv=$('#sa-zoom-value');if(zv)zv.textContent='1.00×'}drawSourceEditor()}
  async function loadFile(file){if(!file||!/^image\//.test(file.type))return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);userImage=img;resetFraming();$('#sa-generate').disabled=false;setStatus(AR()?'اسحب الصورة واضبط الكادر':'DRAG + FRAME YOUR PHOTO',0)};img.src=url}

  function initFraming(){
    const canvas=$('#sa-user-source'),wrap=canvas?.parentElement;if(!canvas||!wrap)return;
    let drag=false,sx=0,sy=0,px=0,py=0;
    canvas.addEventListener('pointerdown',e=>{if(!userImage)return;drag=true;sx=e.clientX;sy=e.clientY;px=framing.panX;py=framing.panY;wrap.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;const r=canvas.getBoundingClientRect();framing.panX=Math.max(-1,Math.min(1,px+(e.clientX-sx)/r.width));framing.panY=Math.max(-1,Math.min(1,py+(e.clientY-sy)/r.height));drawSourceEditor()});
    const end=e=>{if(!drag)return;drag=false;wrap.classList.remove('dragging');try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',e=>{if(!userImage)return;e.preventDefault();framing.zoom=Math.max(1,Math.min(3.2,framing.zoom+(e.deltaY<0?.08:-.08)));const z=$('#sa-zoom');if(z)z.value=String(framing.zoom);$('#sa-zoom-value').textContent=framing.zoom.toFixed(2)+'×';drawSourceEditor()},{passive:false});
    $('#sa-zoom')?.addEventListener('input',e=>{framing.zoom=Number(e.target.value);$('#sa-zoom-value').textContent=framing.zoom.toFixed(2)+'×';drawSourceEditor()});
    $('#sa-fit')?.addEventListener('click',()=>resetFraming());$('#sa-center')?.addEventListener('click',()=>resetFraming(true));$('#sa-rotate')?.addEventListener('click',()=>{framing.rotation=(framing.rotation+90)%360;drawSourceEditor()});
  }

  function initLab(){
    const file=$('#sa-user-file');if(!file||file.dataset.ready)return;file.dataset.ready='1';drawSourceEditor();drawResultPlaceholder();initFraming();file.addEventListener('change',()=>loadFile(file.files?.[0]));
    const zone=$('#sa-upload-zone');['dragenter','dragover'].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('dragging')}));['dragleave','drop'].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('dragging')}));zone?.addEventListener('drop',e=>loadFile(e.dataTransfer?.files?.[0]));
    $$('[data-sa-mode]').forEach(b=>b.addEventListener('click',()=>{$$('[data-sa-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode=b.dataset.saMode}));
    $$('[data-sa-quality]').forEach(b=>b.addEventListener('click',()=>{$$('[data-sa-quality]').forEach(x=>x.classList.remove('active'));b.classList.add('active');quality=b.dataset.saQuality}));
    $('#sa-contrast')?.addEventListener('input',e=>$('#sa-contrast-value').textContent=Number(e.target.value).toFixed(2));$('#sa-gamma')?.addEventListener('input',e=>$('#sa-gamma-value').textContent=Number(e.target.value).toFixed(2));
    $('#sa-generate')?.addEventListener('click',generateUser);$('#sa-user-replay')?.addEventListener('click',()=>userResult&&animateUser(userResult));$('#sa-user-speak')?.addEventListener('click',speakSequence);$('#sa-user-download')?.addEventListener('click',downloadPNG);$('#sa-user-video')?.addEventListener('click',exportVideo);$('#sa-user-share')?.addEventListener('click',sharePNG)
  }

  function init(){if(!$('.sa-story'))return false;drawHeroThreads();initDemo();initLab();if(!window.__saResizeBound){window.__saResizeBound=true;window.addEventListener('resize',()=>{drawHeroThreads();paintDemo(frame);if(userResult)paintPortrait($('#sa-user-result'),userResult,userResult.lines.length,window.__saUserBg)},{passive:true})}return true}
  document.addEventListener('ats:stringart:rendered',()=>setTimeout(init,20));document.addEventListener('portfolio:languagechange',()=>setTimeout(init,80));
  if(!init()){const root=document.getElementById('project-root');if(root){const o=new MutationObserver(()=>{if(init())o.disconnect()});o.observe(root,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),12000)}}
})();