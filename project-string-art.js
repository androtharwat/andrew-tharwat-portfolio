(() => {
  const slug=decodeURIComponent(location.pathname.match(/\/projects\/([^/?#]+)/)?.[1]||new URLSearchParams(location.search).get('slug')||'');
  if(slug!=='magic-of-string-art')return;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const wait=(ms=0)=>new Promise(r=>setTimeout(r,ms));
  const AR=()=>document.documentElement.lang==='ar';

  let frame=0,raf=0,portrait=null;
  let userImage=null,userResult=null,userSequence=[],userRaf=0;
  let mode='mono',quality='share';
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

  function lineSamplerAA(pins,size,maxCache=14000){
    const cache=new Map(),fifo=[];
    const put=(key,value)=>{
      if(cache.size>=maxCache){
        const n=Math.min(1600,fifo.length);
        for(let i=0;i<n;i++)cache.delete(fifo.shift());
      }
      cache.set(key,value);fifo.push(key);return value;
    };
    return (a,b)=>{
      const key=a<b?a+'-'+b:b+'-'+a;if(cache.has(key))return cache.get(key);
      const p0=pins[a],p1=pins[b],dx=p1[0]-p0[0],dy=p1[1]-p0[1],steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
      const idx=[],wt=[];
      if(Math.abs(dx)>=Math.abs(dy)){
        for(let s=0;s<=steps;s++){
          const t=s/steps,x=p0[0]+dx*t,y=p0[1]+dy*t,xi=Math.round(x),y0=Math.floor(y),f=y-y0;
          if(xi<0||xi>=size)continue;
          if(y0>=0&&y0<size&&1-f>.002){idx.push(y0*size+xi);wt.push(1-f)}
          if(y0+1>=0&&y0+1<size&&f>.002){idx.push((y0+1)*size+xi);wt.push(f)}
        }
      }else{
        for(let s=0;s<=steps;s++){
          const t=s/steps,x=p0[0]+dx*t,y=p0[1]+dy*t,yi=Math.round(y),x0=Math.floor(x),f=x-x0;
          if(yi<0||yi>=size)continue;
          if(x0>=0&&x0<size&&1-f>.002){idx.push(yi*size+x0);wt.push(1-f)}
          if(x0+1>=0&&x0+1<size&&f>.002){idx.push(yi*size+x0+1);wt.push(f)}
        }
      }
      return put(key,{idx:Uint32Array.from(idx),wt:Float32Array.from(wt)});
    };
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
    for(let i=0;i<Math.min(count,data.lines.length);i++){
      const line=data.lines[i],p0=data.pins[line.a],p1=data.pins[line.b],a=line.alpha||data.meta?.alpha||.04,opacity=line.opacity||Math.min(.12,a*1.18);
      ctx.strokeStyle='rgba(6,10,13,'+opacity+')';ctx.lineWidth=.48;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
    }
    ctx.fillStyle='#a77320';data.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.76,0,Math.PI*2);ctx.fill()});ctx.restore();
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
    const off=document.createElement('canvas');off.width=off.height=size;
    const ctx=off.getContext('2d',{willReadFrequently:true});drawFramedImage(ctx,img,size);
    const pixels=ctx.getImageData(0,0,size,size),raw=new Float32Array(size*size),lum=new Float32Array(size*size);
    const hist=new Uint32Array(256);let inside=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=y*size+x,k=i*4,v=(.2126*pixels.data[k]+.7152*pixels.data[k+1]+.0722*pixels.data[k+2])/255;
      raw[i]=v;
      const dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2);
      if(dx*dx+dy*dy<=1){hist[Math.max(0,Math.min(255,Math.round(v*255)))]++;inside++}
    }
    const percentile=q=>{let sum=0,goal=inside*q;for(let i=0;i<256;i++){sum+=hist[i];if(sum>=goal)return i/255}return q};
    const lo=percentile(.01),hi=Math.max(lo+.08,percentile(.992));
    for(let i=0;i<raw.length;i++){
      let v=Math.max(0,Math.min(1,(raw[i]-lo)/(hi-lo)));
      v=Math.max(0,Math.min(1,(v-.5)*contrast+.5));
      lum[i]=Math.pow(v,gamma);
    }

    const boxBlur=(input,radius)=>{
      if(radius<=0)return new Float32Array(input);
      const tmp=new Float32Array(input.length),out=new Float32Array(input.length),win=radius*2+1;
      for(let y=0;y<size;y++){
        let sum=0;
        for(let x=-radius;x<=radius;x++)sum+=input[y*size+Math.max(0,Math.min(size-1,x))];
        for(let x=0;x<size;x++){
          tmp[y*size+x]=sum/win;
          const drop=Math.max(0,Math.min(size-1,x-radius)),add=Math.max(0,Math.min(size-1,x+radius+1));
          sum+=input[y*size+add]-input[y*size+drop];
        }
      }
      for(let x=0;x<size;x++){
        let sum=0;
        for(let y=-radius;y<=radius;y++)sum+=tmp[Math.max(0,Math.min(size-1,y))*size+x];
        for(let y=0;y<size;y++){
          out[y*size+x]=sum/win;
          const drop=Math.max(0,Math.min(size-1,y-radius)),add=Math.max(0,Math.min(size-1,y+radius+1));
          sum+=tmp[add*size+x]-tmp[drop*size+x];
        }
      }
      return out;
    };

    const blurFine=boxBlur(lum,1),blurMid=boxBlur(lum,Math.max(2,Math.round(size*.018))),blurCoarse=boxBlur(lum,Math.max(5,Math.round(size*.045)));
    const sharp=new Float32Array(size*size),edge=new Float32Array(size*size),target=new Float32Array(size*size),midTarget=new Float32Array(size*size),coarseTarget=new Float32Array(size*size);
    const importance=new Float32Array(size*size),detailWeight=new Float32Array(size*size),coarseWeight=new Float32Array(size*size),featurePrior=new Float32Array(size*size);
    for(let i=0;i<sharp.length;i++)sharp[i]=Math.max(0,Math.min(1,lum[i]+.62*(lum[i]-blurFine[i])));

    let edgeMax=.0001;
    for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
      const i=y*size+x,a=sharp[(y-1)*size+x-1],b=sharp[(y-1)*size+x],c=sharp[(y-1)*size+x+1],d=sharp[y*size+x-1],f=sharp[y*size+x+1],g=sharp[(y+1)*size+x-1],h=sharp[(y+1)*size+x],j=sharp[(y+1)*size+x+1];
      const gx=-a+c-2*d+2*f-g+j,gy=-a-2*b-c+g+2*h+j,v=Math.sqrt(gx*gx+gy*gy);edge[i]=v;if(v>edgeMax)edgeMax=v;
    }

    const gauss=(dx,dy,cx,cy,sx,sy)=>Math.exp(-.5*(((dx-cx)/sx)**2+((dy-cy)/sy)**2));
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=y*size+x,dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),rad=Math.sqrt(dx*dx+dy*dy),mask=Math.max(0,Math.min(1,(1.01-rad)/.055));
      const e=Math.min(1,edge[i]/edgeMax),face=Math.exp(-(((dx/.57)**2)+((dy/.76)**2))*1.08);
      const leftEye=gauss(dx,dy,-.21,-.16,.13,.065),rightEye=gauss(dx,dy,.21,-.16,.13,.065);
      const leftBrow=gauss(dx,dy,-.21,-.285,.17,.055),rightBrow=gauss(dx,dy,.21,-.285,.17,.055);
      const nose=gauss(dx,dy,0,.035,.105,.23),mouth=gauss(dx,dy,0,.285,.22,.075);
      const chin=gauss(dx,dy,0,.49,.25,.10),cheeks=gauss(dx,dy,-.30,.09,.16,.20)+gauss(dx,dy,.30,.09,.16,.20);
      const oval=Math.exp(-Math.pow(Math.sqrt((dx/.52)**2+(dy/.70)**2)-1,2)/.018);
      const feature=Math.min(1.65,.92*(leftEye+rightEye)+.58*(leftBrow+rightBrow)+.38*nose+.72*mouth+.22*chin+.14*cheeks+.20*oval);
      featurePrior[i]=feature*mask;

      const fineDark=(1-sharp[i])*mask,midDark=(1-(.58*blurMid[i]+.42*sharp[i]))*mask,coarseDark=(1-blurCoarse[i])*mask;
      target[i]=fineDark;
      midTarget[i]=Math.max(0,Math.min(1,.78*midDark+.22*fineDark));
      coarseTarget[i]=Math.max(0,Math.min(1,.82*coarseDark+.18*midDark));

      coarseWeight[i]=(1+.34*face+.22*e+.12*feature)*mask+.0001;
      importance[i]=(1+.94*e+.32*face+1.10*feature)*mask+.0001;
      detailWeight[i]=(1+2.45*e+.45*face+2.75*feature)*mask+.0001;
    }
    return{target,midTarget,coarseTarget,importance,detailWeight,coarseWeight,featurePrior,canvas:off}
  }

  function candidateSet(cur,count,total,step,minJump){
    if(count>=total)return Array.from({length:total},(_,i)=>i).filter(j=>j!==cur&&Math.min((j-cur+total)%total,(cur-j+total)%total)>=minJump);
    const out=[],seen=new Set();let seed=((step+1)*1664525+(cur+11)*1013904223)>>>0,guard=0;
    while(out.length<count&&guard<count*8){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%total;guard++;
      if(j===cur||seen.has(j))continue;
      const dist=Math.min((j-cur+total)%total,(cur-j+total)%total);if(dist<minJump)continue;
      seen.add(j);out.push(j);
    }
    return out;
  }

  function routeKey(a,b){return a<b?a+'-'+b:b+'-'+a}
  function pinDistance(a,b,total){return Math.min((b-a+total)%total,(a-b+total)%total)}
  function applyThreadPath(rendered,path,opacity,remove=false){
    const idx=path.idx,wt=path.wt;
    if(remove){
      for(let k=idx.length-1;k>=0;k--){
        const p=idx[k],a=Math.min(.999,opacity*Math.min(1,wt[k]));
        rendered[p]=Math.max(0,Math.min(1,1-(1-rendered[p])/Math.max(.0001,1-a)));
      }
    }else{
      for(let k=0;k<idx.length;k++){
        const p=idx[k],a=opacity*Math.min(1,wt[k]);
        rendered[p]+= (1-rendered[p])*a;
      }
    }
  }
  function routeGainFromBase(rendered,pathA,opacityA,pathB,opacityB,target,weight){
    const touched=new Map();
    const layer=(path,opacity)=>{
      const idx=path.idx,wt=path.wt;
      for(let k=0;k<idx.length;k++){
        const p=idx[k],before=touched.has(p)?touched.get(p):rendered[p],a=opacity*Math.min(1,wt[k]);
        touched.set(p,before+(1-before)*a);
      }
    };
    layer(pathA,opacityA);layer(pathB,opacityB);
    let gain=0;
    touched.forEach((after,p)=>{
      const before=rendered[p],e0=target[p]-before,e1=target[p]-after;
      gain+=weight[p]*(e0*e0-e1*e1);
    });
    return gain
  }
  async function repairSequenceAsync(lines,pins,sample,rendered,prep,used,profile,onProgress){
    const total=pins.length,maxWindows=profile.repairWindows||0,candidateCount=profile.repairCandidates||0;
    if(lines.length<3||maxWindows<1||candidateCount<1)return{accepted:0,lastGain:0};
    const minJump=Math.max(8,Math.floor(total*.035)),start=Math.max(0,Math.floor(lines.length*.46)),ranked=[];
    for(let i=start;i<lines.length-1;i+=2){
      const l1=lines[i],l2=lines[i+1];if(l1.b!==l2.a)continue;
      const p1=sample(l1.a,l1.b),p2=sample(l2.a,l2.b);let s=0,n=0;
      for(const path of [p1,p2])for(let k=0;k<path.idx.length;k+=4){
        const p=path.idx[k],d=Math.abs(prep.target[p]-rendered[p]);
        s+=(prep.featurePrior[p]*2.2+prep.detailWeight[p]*.10)*(.15+d);n++;
      }
      ranked.push([s/Math.max(1,n),i]);
    }
    ranked.sort((a,b)=>b[0]-a[0]);
    const picks=[],seen=new Set();
    const addPick=i=>{if(i>=0&&i<lines.length-1&&!seen.has(i)){seen.add(i);picks.push(i)}};
    for(let k=0;k<Math.min(Math.round(maxWindows*.72),ranked.length);k++)addPick(ranked[k][1]);
    const even=Math.max(1,maxWindows-picks.length),span=Math.max(1,lines.length-start-2);
    for(let k=0;k<even;k++)addPick(start+Math.floor((k+.5)/even*span));
    picks.sort((a,b)=>a-b);

    let accepted=0,lastGain=0;
    for(let w=0;w<picks.length&&w<maxWindows;w++){
      const i=picks[w],l1=lines[i],l2=lines[i+1];
      if(!l1||!l2||l1.b!==l2.a)continue;
      const A=l1.a,B=l1.b,C=l2.b,oldP1=sample(A,B),oldP2=sample(B,C),o1=l1.opacity||Math.min(.12,(l1.alpha||profile.alpha)*1.18),o2=l2.opacity||Math.min(.12,(l2.alpha||profile.alpha)*1.18);

      applyThreadPath(rendered,oldP2,o2,true);applyThreadPath(rendered,oldP1,o1,true);
      const oldGain=routeGainFromBase(rendered,oldP1,o1,oldP2,o2,prep.target,prep.detailWeight);
      let bestGain=oldGain,bestX=B,bestP1=oldP1,bestP2=oldP2;

      const choices=candidateSet(B,candidateCount,total,i+7919,minJump);
      for(let q=0;q<choices.length;q++){
        const X=choices[q];if(X===A||X===C)continue;
        if(pinDistance(A,X,total)<minJump||pinDistance(X,C,total)<minJump)continue;
        const p1=sample(A,X),p2=sample(X,C);
        let gain=routeGainFromBase(rendered,p1,o1,p2,o2,prep.target,prep.detailWeight);
        gain-=profile.repeatPenalty*((used.get(routeKey(A,X))||0)+(used.get(routeKey(X,C))||0))*.45;
        if(gain>bestGain){bestGain=gain;bestX=X;bestP1=p1;bestP2=p2}
      }

      const threshold=Math.max(.000004,Math.abs(oldGain)*.008);
      if(bestX!==B&&bestGain>oldGain+threshold){
        const k1=routeKey(A,B),k2=routeKey(B,C),n1=routeKey(A,bestX),n2=routeKey(bestX,C);
        used.set(k1,Math.max(0,(used.get(k1)||1)-1));used.set(k2,Math.max(0,(used.get(k2)||1)-1));
        used.set(n1,(used.get(n1)||0)+1);used.set(n2,(used.get(n2)||0)+1);
        lines[i]={...l1,a:A,b:bestX};lines[i+1]={...l2,a:bestX,b:C};
        applyThreadPath(rendered,bestP1,o1,false);applyThreadPath(rendered,bestP2,o2,false);
        accepted++;lastGain=bestGain-oldGain;
      }else{
        applyThreadPath(rendered,oldP1,o1,false);applyThreadPath(rendered,oldP2,o2,false);
      }
      if(w%6===0){onProgress?.(profile.maxLines-1,profile.maxLines,.97,lastGain);await wait()}
    }
    return{accepted,lastGain}
  }

  async function binaryWeightedAsync(prep,profile,onProgress){
    const {size,pins:pinCount,maxLines,alpha,candidates,repeatPenalty,minLines}=profile;
    const pins=makePins(size,pinCount),sample=lineSamplerAA(pins,size),rendered=new Float32Array(prep.target.length),used=new Map(),lines=[];
    const minJump=Math.max(8,Math.floor(pinCount*.035));let cur=7%pinCount,lastGain=0;
    for(let step=0;step<maxLines;step++){
      const phase=step/maxLines;
      const activeTarget=phase<.34?prep.coarseTarget:(phase<.70?prep.midTarget:prep.target);
      const imp=phase<.34?prep.coarseWeight:(phase<.70?prep.importance:prep.detailWeight);
      const lineAlpha=alpha*(phase>.78?.80:(phase<.34?1.06:1));
      const threadOpacity=Math.min(.12,lineAlpha*1.18);
      const candidateBudget=phase>.70?Math.min(pinCount-1,Math.round(candidates*1.35)):candidates;
      const choices=candidateSet(cur,candidateBudget,pinCount,step,minJump);let best=0,bp=-1,bestPath=null;
      for(let q=0;q<choices.length;q++){
        const j=choices[q],path=sample(cur,j),idx=path.idx,wt=path.wt;let score=0;
        for(let k=0;k<idx.length;k++){
          const p=idx[k],coverage=Math.min(1,wt[k]),a=threadOpacity*coverage,before=rendered[p],after=before+(1-before)*a;
          const e0=activeTarget[p]-before,e1=activeTarget[p]-after;
          score+=imp[p]*(e0*e0-e1*e1);
        }
        const key=cur<j?cur+'-'+j:j+'-'+cur;score-=repeatPenalty*(used.get(key)||0);
        if(score>best){best=score;bp=j;bestPath=path}
      }
      if(bp<0||(step>=minLines&&best<=0))break;
      const idx=bestPath.idx,wt=bestPath.wt;
      for(let k=0;k<idx.length;k++){
        const p=idx[k],coverage=Math.min(1,wt[k]),a=threadOpacity*coverage;
        rendered[p]+= (1-rendered[p])*a;
      }
      const key=cur<bp?cur+'-'+bp:bp+'-'+cur;used.set(key,(used.get(key)||0)+1);
      lines.push({a:cur,b:bp,color:'black',alpha:lineAlpha,opacity:threadOpacity});cur=bp;lastGain=best;
      if(step%12===0){onProgress?.(step,maxLines,phase,lastGain);await wait()}
    }
    const repair=await repairSequenceAsync(lines,pins,sample,rendered,prep,used,profile,onProgress);
    if(repair.lastGain>0)lastGain=repair.lastGain;
    let err=0,wSum=0,detailErr=0,detailWSum=0;
    for(let i=0;i<rendered.length;i++){
      const d=prep.target[i]-rendered[i],w=prep.importance[i],dw=prep.detailWeight[i];
      err+=w*d*d;wSum+=w;detailErr+=dw*d*d;detailWSum+=dw;
    }
    const rmse=Math.sqrt(err/Math.max(.0001,wSum)),detailRmse=Math.sqrt(detailErr/Math.max(.0001,detailWSum));
    return{pins,lines,size,meta:{quality,mode:'mono',pins:pinCount,lines:lines.length,alpha,optimizer:'portrait-multiscale-compositing-l2+route-repair',gain:lastGain,rmse,detailRmse,repairAccepted:repair.accepted}}
  }

  const profileFor=()=>{
    if(quality==='share')return{size:240,pins:360,maxLines:5000,alpha:.033,candidates:165,repeatPenalty:.014,minLines:2400,repairWindows:96,repairCandidates:64};
    if(quality==='enhanced')return{size:220,pins:300,maxLines:3600,alpha:.037,candidates:145,repeatPenalty:.013,minLines:1800,repairWindows:68,repairCandidates:52};
    return{size:180,pins:220,maxLines:2300,alpha:.044,candidates:105,repeatPenalty:.012,minLines:1100,repairWindows:30,repairCandidates:36};
  };
  function setStatus(msg,pct){if($('#sa-lab-status'))$('#sa-lab-status').textContent=msg;if($('#sa-lab-progress'))$('#sa-lab-progress').textContent=pct+'%'}
  function seqText(lines,limit=14){return lines.slice(0,limit).map(x=>String(x.a).padStart(3,'0')+'→'+String(x.b).padStart(3,'0')).join(' · ')}

  async function generateUser(){
    if(!userImage)return;
    const btn=$('#sa-generate');btn.disabled=true;$('#sa-result-tools')?.classList.add('hidden');
    const contrast=Number($('#sa-contrast')?.value||1.2),gamma=Number($('#sa-gamma')?.value||.9),profile=profileFor(),prep=imageToTarget(userImage,profile.size,contrast,gamma);
    setStatus(AR()?'تحليل الضوء والملامح…':'ANALYZING LIGHT + FEATURES…',2);
    const result=await binaryWeightedAsync(prep,profile,(step,maxLines,phase)=>{
      const pct=Math.min(98,4+Math.round(step/maxLines*94));
      const label=phase<.35?(AR()?'بناء الشكل العام…':'BUILDING STRUCTURE…'):phase<.68?(AR()?'مطابقة الظلال…':'MATCHING TONE…'):phase<.86?(AR()?'تثبيت العينين والملامح…':'REFINING FEATURES…'):(AR()?'التفاصيل النهائية…':'FINAL DETAIL PASS…');
      setStatus(label,pct);
    });
    userResult=result;userSequence=result.lines;window.__saUserBg='#f2efe8';
    animateUser(result);$('#sa-user-sequence').textContent=seqText(result.lines);$('#sa-result-tools')?.classList.remove('hidden');
    setStatus(AR()?('اكتمل · '+result.lines.length+' خط · '+result.meta.pins+' مسمار'):('COMPLETE · '+result.lines.length+' LINES · '+result.meta.pins+' NAILS'),100);btn.disabled=false;
  }
  function animateUser(data){cancelAnimationFrame(userRaf);let n=0;paintPortrait($('#sa-user-result'),data,0,window.__saUserBg);if(matchMedia('(prefers-reduced-motion: reduce)').matches){paintPortrait($('#sa-user-result'),data,data.lines.length,window.__saUserBg);return}const tick=()=>{n=Math.min(data.lines.length,n+Math.max(6,Math.ceil(data.lines.length/165)));paintPortrait($('#sa-user-result'),data,n,window.__saUserBg);if(n<data.lines.length)userRaf=requestAnimationFrame(tick)};userRaf=requestAnimationFrame(tick)}

  function drawExport(data,count,canvas,{size=1800,footer=150}={}){
    canvas.width=size;canvas.height=size+footer;const ctx=canvas.getContext('2d'),bg=window.__saUserBg||'#f2efe8';ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
    const scale=size/data.size;ctx.save();ctx.scale(scale,scale);
    for(let i=0;i<Math.min(count,data.lines.length);i++){const l=data.lines[i],p0=data.pins[l.a],p1=data.pins[l.b],a=l.alpha||data.meta?.alpha||.04,opacity=l.opacity||Math.min(.12,a*1.18);ctx.strokeStyle='rgba(6,10,13,'+opacity+')';ctx.lineWidth=.42;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke()}
    ctx.fillStyle=bg==='#07131b'?'rgba(230,194,115,.82)':'#9a6a16';data.pins.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],.72,0,Math.PI*2);ctx.fill()});ctx.restore();
    const grad=ctx.createLinearGradient(0,size,0,size+footer);grad.addColorStop(0,'#071723');grad.addColorStop(1,'#031018');ctx.fillStyle=grad;ctx.fillRect(0,size,size,footer);
    ctx.fillStyle='#d7ad59';ctx.font=`900 ${Math.round(size*.037)}px Montserrat,Arial`;ctx.fillText('ATS',Math.round(size*.045),size+Math.round(footer*.55));
    ctx.fillStyle='#e7edf0';ctx.font=`800 ${Math.round(size*.013)}px Montserrat,Arial`;ctx.fillText('ANDREW THARWAT STUDIO · STRING ART EXPERIENCE',Math.round(size*.14),size+Math.round(footer*.43));
    ctx.fillStyle='#7994a3';ctx.font=`700 ${Math.round(size*.010)}px Montserrat,Arial`;ctx.fillText(`© ATS 2026  ·  ${data.meta?.pins||data.pins.length} PINS  ·  ${data.lines.length} LINES  ·  ${String(data.meta?.mode||mode).toUpperCase()}`,Math.round(size*.14),size+Math.round(footer*.69));
    ctx.textAlign='right';ctx.fillStyle='#9aafba';ctx.fillText('GENERATED WITH ATS',size-Math.round(size*.045),size+Math.round(footer*.57));ctx.textAlign='left';
    return canvas;
  }
  async function exportBlob(type='png'){
    if(!userResult)return null;const c=document.createElement('canvas');drawExport(userResult,userResult.lines.length,c,{size:quality==='share'?2800:(quality==='enhanced'?2200:1800),footer:160});
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