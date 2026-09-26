(function stringArtRuntime(){
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='magic-of-string-art')return;
  const $=(s,r=document)=>r.querySelector(s);

  function drawHeroThreads(){
    const canvas=$('#sa-hero-thread');if(!canvas)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,box.width),h=Math.max(1,box.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(236,205,137,.12)';ctx.lineWidth=.7;
    const pts=[],count=42;
    for(let i=0;i<count;i++){const t=i/(count-1);pts.push([12+t*(w-24),i%2?12:h-12])}
    for(let i=0;i<78;i++){const a=pts[(i*13)%count],b=pts[(i*29+7)%count];ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  }

  function buildThreadPortrait(){
    const size=180,pinCount=88,total=360,residual=new Float32Array(size*size);
    const g=(x,y,cx,cy,sx,sy,a)=>a*Math.exp(-((((x-cx)/sx)**2)+(((y-cy)/sy)**2))/2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=(x-size/2)/(size/2),v=(y-size/2)/(size/2);let d=0;
      d+=g(u,v,0,.05,.50,.68,.18);
      d+=g(u,v,-.47,.04,.10,.46,.24)+g(u,v,.47,.04,.10,.46,.24);
      d+=g(u,v,-.28,-.28,.17,.035,.65)+g(u,v,.28,-.28,.17,.035,.65);
      d+=g(u,v,-.27,-.16,.12,.055,.90)+g(u,v,.27,-.16,.12,.055,.90);
      d+=g(u,v,0,.04,.035,.23,.44);
      d+=g(u,v,-.05,.20,.08,.035,.52)+g(u,v,.05,.20,.08,.035,.52);
      d+=g(u,v,0,.40,.27,.045,.90);
      d+=g(u,v,-.30,.16,.17,.18,.15)+g(u,v,.30,.16,.17,.18,.15);
      d+=g(u,v,0,.62,.28,.045,.24);
      residual[y*size+x]=Math.min(1,d);
    }
    const pins=[],r=size*.48,c=size/2;
    for(let i=0;i<pinCount;i++){const a=Math.PI*2*i/pinCount-Math.PI/2;pins.push([c+r*Math.cos(a),c+r*Math.sin(a)])}
    const cache=new Map(),used=new Map();
    const samples=(a,b)=>{
      const key=a<b?a+'-'+b:b+'-'+a;if(cache.has(key))return cache.get(key);
      const p0=pins[a],p1=pins[b],arr=new Uint16Array(70);
      for(let k=0;k<arr.length;k++){const t=k/(arr.length-1),x=Math.max(0,Math.min(size-1,Math.round(p0[0]+(p1[0]-p0[0])*t))),y=Math.max(0,Math.min(size-1,Math.round(p0[1]+(p1[1]-p0[1])*t)));arr[k]=y*size+x}
      cache.set(key,arr);return arr;
    };
    const lines=[];let cur=7;
    for(let step=0;step<total;step++){
      let best=-1e9,bp=-1;
      for(let j=0;j<pinCount;j++){
        if(j===cur)continue;
        const dist=Math.min((j-cur+pinCount)%pinCount,(cur-j+pinCount)%pinCount);if(dist<5)continue;
        const key=cur<j?cur+'-'+j:j+'-'+cur,arr=samples(cur,j);let sum=0;
        for(let k=0;k<arr.length;k++)sum+=residual[arr[k]];
        const score=sum/arr.length-.035*(used.get(key)||0);if(score>best){best=score;bp=j}
      }
      if(bp<0)break;
      const key=cur<bp?cur+'-'+bp:bp+'-'+cur,arr=samples(cur,bp);
      for(let k=0;k<arr.length;k++)residual[arr[k]]=Math.max(-.2,residual[arr[k]]-.09);
      used.set(key,(used.get(key)||0)+1);lines.push([cur,bp]);cur=bp;
    }
    return{pins,lines,size};
  }

  let frame=0,raf=0,portrait=null;
  function paintDemo(count){
    const canvas=$('#sa-thread-demo');if(!canvas||!portrait)return;
    const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,box.width),h=Math.max(1,box.height);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#eee7d7';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w,h)/portrait.size,ox=(w-portrait.size*scale)/2,oy=(h-portrait.size*scale)/2;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.strokeStyle='rgba(8,18,24,.075)';ctx.lineWidth=.5;
    for(let i=0;i<Math.min(count,portrait.lines.length);i++){const pair=portrait.lines[i],p0=portrait.pins[pair[0]],p1=portrait.pins[pair[1]];ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    ctx.fillStyle='#a77320';portrait.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.9,0,Math.PI*2);ctx.fill()});ctx.restore();
    const line=$('#sa-line-count'),route=$('#sa-pin-route');if(line)line.textContent=String(Math.min(count,portrait.lines.length)).padStart(3,'0')+' / '+portrait.lines.length;
    const pair=portrait.lines[Math.max(0,Math.min(count-1,portrait.lines.length-1))];if(route&&pair)route.textContent='PIN '+String(pair[0]).padStart(2,'0')+' → '+String(pair[1]).padStart(2,'0');
  }
  function playDemo(){
    cancelAnimationFrame(raf);frame=0;paintDemo(0);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){frame=portrait.lines.length;paintDemo(frame);return}
    const tick=()=>{frame=Math.min(portrait.lines.length,frame+3);paintDemo(frame);if(frame<portrait.lines.length)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
  }
  function initDemo(){
    const canvas=$('#sa-thread-demo');if(!canvas||canvas.dataset.ready)return;
    canvas.dataset.ready='1';portrait=buildThreadPortrait();paintDemo(0);
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();playDemo()}},{threshold:.35});observer.observe(canvas);
    $('#sa-replay')?.addEventListener('click',playDemo);
  }
  function init(){
    if(!$('.sa-story'))return false;
    drawHeroThreads();initDemo();
    if(!window.__saResizeBound){window.__saResizeBound=true;window.addEventListener('resize',()=>{drawHeroThreads();paintDemo(frame)},{passive:true})}
    return true;
  }
  document.addEventListener('ats:stringart:rendered',()=>setTimeout(init,20));
  document.addEventListener('portfolio:languagechange',()=>setTimeout(init,80));
  if(!init()){const root=document.getElementById('project-root');if(root){const o=new MutationObserver(()=>{if(init())o.disconnect()});o.observe(root,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),12000)}}
})();