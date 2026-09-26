(() => {
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='magic-of-string-art')return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const wait=()=>new Promise(r=>setTimeout(r,0));

  function drawHeroThreads(){
    const canvas=$('#sa-hero-thread');if(!canvas)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(236,205,137,.12)';ctx.lineWidth=.7;
    const pts=[],count=42;for(let i=0;i<count;i++){const t=i/(count-1);pts.push([12+t*(w-24),i%2?12:h-12])}
    for(let i=0;i<78;i++){const a=pts[(i*13)%count],b=pts[(i*29+7)%count];ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  }

  function buildSyntheticPortrait(){
    const size=180,pinCount=88,total=360,residual=new Float32Array(size*size);
    const g=(x,y,cx,cy,sx,sy,a)=>a*Math.exp(-((((x-cx)/sx)**2)+(((y-cy)/sy)**2))/2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x-size/2)/(size/2),v=(y-size/2)/(size/2);let d=0;
      d+=g(u,v,0,.05,.50,.68,.18)+g(u,v,-.47,.04,.10,.46,.24)+g(u,v,.47,.04,.10,.46,.24);
      d+=g(u,v,-.28,-.28,.17,.035,.65)+g(u,v,.28,-.28,.17,.035,.65)+g(u,v,-.27,-.16,.12,.055,.90)+g(u,v,.27,-.16,.12,.055,.90);
      d+=g(u,v,0,.04,.035,.23,.44)+g(u,v,-.05,.20,.08,.035,.52)+g(u,v,.05,.20,.08,.035,.52)+g(u,v,0,.40,.27,.045,.90)+g(u,v,-.30,.16,.17,.18,.15)+g(u,v,.30,.16,.17,.18,.15)+g(u,v,0,.62,.28,.045,.24);
      residual[y*size+x]=Math.min(1,d)}
    return buildGreedySync(residual,size,pinCount,total,'#0b1218',.09);
  }

  function makePins(size,count){const pins=[],r=size*.48,c=size/2;for(let i=0;i<count;i++){const a=Math.PI*2*i/count-Math.PI/2;pins.push([c+r*Math.cos(a),c+r*Math.sin(a)])}return pins}
  function lineSampler(pins,size){
    const cache=new Map();
    return (a,b)=>{const key=a<b?a+'-'+b:b+'-'+a;if(cache.has(key))return cache.get(key);const p0=pins[a],p1=pins[b],arr=new Uint32Array(52);
      for(let k=0;k<arr.length;k++){const t=k/(arr.length-1),x=Math.max(0,Math.min(size-1,Math.round(p0[0]+(p1[0]-p0[0])*t))),y=Math.max(0,Math.min(size-1,Math.round(p0[1]+(p1[1]-p0[1])*t)));arr[k]=y*size+x}cache.set(key,arr);return arr}
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

  let frame=0,raf=0,portrait=null,userData=null,userSequence=[],userRaf=0,mode='mono',quality='fast';
  function paintPortrait(canvas,data,count,bg='#eee7d7'){
    if(!canvas||!data)return;const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,box.width),h=Math.max(1,box.height);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const scale=Math.min(w,h)/data.size,ox=(w-data.size*scale)/2,oy=(h-data.size*scale)/2;ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    for(let i=0;i<Math.min(count,data.lines.length);i++){const line=data.lines[i],p0=data.pins[line.a],p1=data.pins[line.b];ctx.strokeStyle=line.color==='white'?'rgba(246,240,220,.18)':line.color==='yellow'?'rgba(225,182,61,.20)':line.color==='brown'?'rgba(111,67,40,.18)':line.color==='blue'?'rgba(45,83,132,.18)':line.color==='black'?'rgba(6,10,13,.16)':'rgba(8,18,24,.075)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    ctx.fillStyle=bg==='#07131b'?'rgba(222,190,118,.74)':'#a77320';data.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.9,0,Math.PI*2);ctx.fill()});ctx.restore();
  }
  function paintDemo(count){paintPortrait($('#sa-thread-demo'),portrait,count,'#eee7d7');const line=$('#sa-line-count'),route=$('#sa-pin-route');if(line)line.textContent=String(Math.min(count,portrait.lines.length)).padStart(3,'0')+' / '+portrait.lines.length;const p=portrait.lines[Math.max(0,Math.min(count-1,portrait.lines.length-1))];if(route&&p)route.textContent='PIN '+String(p.a).padStart(2,'0')+' → '+String(p.b).padStart(2,'0')}
  function playDemo(){cancelAnimationFrame(raf);frame=0;paintDemo(0);if(matchMedia('(prefers-reduced-motion: reduce)').matches){frame=portrait.lines.length;paintDemo(frame);return}const tick=()=>{frame=Math.min(portrait.lines.length,frame+3);paintDemo(frame);if(frame<portrait.lines.length)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
  function initDemo(){const canvas=$('#sa-thread-demo');if(!canvas||canvas.dataset.ready)return;canvas.dataset.ready='1';portrait=buildSyntheticPortrait();paintDemo(0);const observer=new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting)){observer.disconnect();playDemo()}},{threshold:.35});observer.observe(canvas);$('#sa-replay')?.addEventListener('click',playDemo)}

  function drawSourcePlaceholder(){const c=$('#sa-user-source');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#0a1b24';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(215,173,89,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w/2,h/2,w*.32,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#6f8794';ctx.font='700 18px Montserrat,Arial';ctx.textAlign='center';ctx.fillText('YOUR PORTRAIT',w/2,h/2+6)}
  function drawResultPlaceholder(){const c=$('#sa-user-result');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#0a1b24';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(215,173,89,.08)';for(let i=0;i<28;i++){ctx.beginPath();ctx.moveTo(0,(i/27)*h);ctx.lineTo(w,((i*11)%28)/27*h);ctx.stroke()}}

  function imageToTarget(img,size,contrast,gamma){
    const off=document.createElement('canvas');off.width=off.height=size;const ctx=off.getContext('2d',{willReadFrequently:true});
    const s=Math.min(img.width,img.height),sx=(img.width-s)/2,sy=(img.height-s)/2;ctx.drawImage(img,sx,sy,s,s,0,0,size,size);const data=ctx.getImageData(0,0,size,size),mono=new Float32Array(size*size),rgb=new Uint8ClampedArray(data.data);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,k=i*4,r=data.data[k],g=data.data[k+1],b=data.data[k+2];let lum=(.2126*r+.7152*g+.0722*b)/255;lum=Math.pow(Math.max(0,Math.min(1,(lum-.5)*contrast+.5)),gamma);const dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),rad=Math.sqrt(dx*dx+dy*dy),mask=Math.max(0,Math.min(1,(1.02-rad)/.18));mono[i]=(1-lum)*mask}
    return{mono,rgb,canvas:off}
  }
  function colorResiduals(rgb,size){
    const palette=[['white',[242,235,216]],['yellow',[220,176,60]],['brown',[118,72,43]],['blue',[45,81,128]],['black',[20,23,26]]],layers={};
    palette.forEach(([n])=>layers[n]=new Float32Array(size*size));
    for(let i=0;i<size*size;i++){const x=i%size,y=(i/size)|0,dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),mask=Math.max(0,Math.min(1,(1.02-Math.sqrt(dx*dx+dy*dy))/.18));const k=i*4,r=rgb[k],g=rgb[k+1],b=rgb[k+2];let best=[];
      for(const [name,p] of palette){const d=((r-p[0])**2+(g-p[1])**2+(b-p[2])**2);best.push([d,name])}best.sort((a,b)=>a[0]-b[0]);const d0=best[0][0],d1=best[1][0],w0=Math.exp(-d0/5200),w1=.45*Math.exp(-d1/5200);layers[best[0][1]][i]=w0*mask;layers[best[1][1]][i]=w1*mask}
    return layers
  }
  async function greedyAsync(residual,size,pinCount,total,color,subtract,onProgress,offset=0,whole=total){
    const pins=makePins(size,pinCount),samples=lineSampler(pins,size),used=new Map(),lines=[];let cur=7%pinCount;
    for(let step=0;step<total;step++){let best=-1e9,bp=-1;for(let j=0;j<pinCount;j++){if(j===cur)continue;const dist=Math.min((j-cur+pinCount)%pinCount,(cur-j+pinCount)%pinCount);if(dist<Math.max(4,Math.floor(pinCount*.045)))continue;const key=cur<j?cur+'-'+j:j+'-'+cur,arr=samples(cur,j);let sum=0;for(let k=0;k<arr.length;k++)sum+=residual[arr[k]];const score=sum/arr.length-.04*(used.get(key)||0);if(score>best){best=score;bp=j}}if(bp<0)break;
      const key=cur<bp?cur+'-'+bp:bp+'-'+cur,arr=samples(cur,bp);for(let k=0;k<arr.length;k++)residual[arr[k]]=Math.max(-.25,residual[arr[k]]-subtract);used.set(key,(used.get(key)||0)+1);lines.push({a:cur,b:bp,color});cur=bp;
      if(step%24===0){onProgress?.(Math.round(((offset+step)/whole)*100));await wait()}}
    return{pins,lines,size}
  }
  function drawPreparedSource(prep){const c=$('#sa-user-source'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.drawImage(prep.canvas,0,0,w,h)}
  function setStatus(msg,pct){if($('#sa-lab-status'))$('#sa-lab-status').textContent=msg;if($('#sa-lab-progress'))$('#sa-lab-progress').textContent=pct+'%'}
  function seqText(lines,limit=12){return lines.slice(0,limit).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · ')}

  async function generateUser(){
    if(!userData)return;const btn=$('#sa-generate');btn.disabled=true;$('#sa-result-tools')?.classList.add('hidden');setStatus(document.documentElement.lang==='ar'?'جارٍ تحليل الصورة واختيار المسارات…':'ANALYZING IMAGE + CHOOSING ROUTES…',1);
    const contrast=Number($('#sa-contrast')?.value||1.2),gamma=Number($('#sa-gamma')?.value||.9),detail=quality==='detail',size=detail?180:150,pins=detail?160:120,total=detail?1200:700,prep=imageToTarget(userData,size,contrast,gamma);drawPreparedSource(prep);
    let result;
    if(mode==='mono'){const residual=new Float32Array(prep.mono);result=await greedyAsync(residual,size,pins,total,'black',detail?.07:.085,p=>setStatus(document.documentElement.lang==='ar'?'جارٍ بناء المسارات…':'BUILDING THREAD ROUTES…',p))}
    else{const layers=colorResiduals(prep.rgb,size),order=[['white',.22],['yellow',.20],['brown',.24],['blue',.16],['black',.18]],all=[];let sharedPins=null,offset=0;
      for(const [name,share] of order){const budget=Math.max(40,Math.round(total*share)),part=await greedyAsync(layers[name],size,pins,budget,name,.10,p=>setStatus(document.documentElement.lang==='ar'?'جارٍ بناء طبقة '+name+'…':'BUILDING '+name.toUpperCase()+' LAYER…',Math.min(99,Math.round((offset+p*budget/100)/total*100))),offset,total);sharedPins=part.pins;all.push(...part.lines);offset+=budget}
      result={pins:sharedPins,lines:all,size}
    }
    userSequence=result.lines;window.__saUserResult=result;window.__saUserBg=mode==='color'?'#07131b':'#eee7d7';animateUser(result);$('#sa-user-sequence').textContent=seqText(result.lines);$('#sa-result-tools')?.classList.remove('hidden');setStatus(document.documentElement.lang==='ar'?'تم بناء المعاينة من صورتك':'YOUR THREAD PREVIEW IS READY',100);btn.disabled=false
  }
  function animateUser(data){cancelAnimationFrame(userRaf);let n=0;paintPortrait($('#sa-user-result'),data,0,window.__saUserBg);const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce){paintPortrait($('#sa-user-result'),data,data.lines.length,window.__saUserBg);return}const tick=()=>{n=Math.min(data.lines.length,n+Math.max(5,Math.ceil(data.lines.length/150)));paintPortrait($('#sa-user-result'),data,n,window.__saUserBg);if(n<data.lines.length)userRaf=requestAnimationFrame(tick)};userRaf=requestAnimationFrame(tick)}
  async function loadFile(file){if(!file||!/^image\//.test(file.type))return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);userData=img;const prep=imageToTarget(img,180,Number($('#sa-contrast')?.value||1.2),Number($('#sa-gamma')?.value||.9));drawPreparedSource(prep);$('#sa-generate').disabled=false;setStatus(document.documentElement.lang==='ar'?'الصورة جاهزة — اختار الإعدادات وابدأ':'PHOTO READY — CHOOSE SETTINGS AND GENERATE',0)};img.src=url}
  function speakSequence(){if(!userSequence.length||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const numbers=userSequence.slice(0,22).map(x=>x.b).join('، '),u=new SpeechSynthesisUtterance(numbers);u.lang=document.documentElement.lang==='ar'?'ar-EG':'en-US';u.rate=.82;window.speechSynthesis.speak(u)}
  function downloadResult(){const c=$('#sa-user-result');if(!c)return;const a=document.createElement('a');a.download='andrew-string-art-preview.png';a.href=c.toDataURL('image/png');a.click()}
  function initLab(){const file=$('#sa-user-file');if(!file||file.dataset.ready)return;file.dataset.ready='1';drawSourcePlaceholder();drawResultPlaceholder();file.addEventListener('change',()=>loadFile(file.files?.[0]));
    const zone=$('#sa-upload-zone');['dragenter','dragover'].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('dragging')}));['dragleave','drop'].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('dragging')}));zone?.addEventListener('drop',e=>loadFile(e.dataTransfer?.files?.[0]));
    $$('[data-sa-mode]').forEach(b=>b.addEventListener('click',()=>{$$('[data-sa-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode=b.dataset.saMode}));
    $$('[data-sa-quality]').forEach(b=>b.addEventListener('click',()=>{$$('[data-sa-quality]').forEach(x=>x.classList.remove('active'));b.classList.add('active');quality=b.dataset.saQuality}));
    $('#sa-contrast')?.addEventListener('input',e=>$('#sa-contrast-value').textContent=Number(e.target.value).toFixed(2));$('#sa-gamma')?.addEventListener('input',e=>$('#sa-gamma-value').textContent=Number(e.target.value).toFixed(2));
    $('#sa-generate')?.addEventListener('click',generateUser);$('#sa-user-replay')?.addEventListener('click',()=>window.__saUserResult&&animateUser(window.__saUserResult));$('#sa-user-speak')?.addEventListener('click',speakSequence);$('#sa-user-download')?.addEventListener('click',downloadResult)
  }

  function init(){if(!$('.sa-story'))return false;drawHeroThreads();initDemo();initLab();if(!window.__saResizeBound){window.__saResizeBound=true;window.addEventListener('resize',()=>{drawHeroThreads();paintDemo(frame);if(window.__saUserResult)paintPortrait($('#sa-user-result'),window.__saUserResult,window.__saUserResult.lines.length,window.__saUserBg)},{passive:true})}return true}
  document.addEventListener('ats:stringart:rendered',()=>setTimeout(init,20));document.addEventListener('portfolio:languagechange',()=>setTimeout(init,80));
  if(!init()){const root=document.getElementById('project-root');if(root){const o=new MutationObserver(()=>{if(init())o.disconnect()});o.observe(root,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),12000)}}
})();