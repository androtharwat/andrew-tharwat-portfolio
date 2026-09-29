import { makeCircularMask } from './core.mjs';
import {
  rgbaToLinearRgb,
  chooseThreadPaletteSimulation,
  buildPortraitPriorityMaps,
  buildPaletteAffinityMap,
} from './preprocess.mjs?v=4';

const EPS=1e-9;
const clamp01=v=>Math.max(0,Math.min(1,v));
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const GEOMETRY_CACHE=new Map();

function circleGap(a,b,nails){
  const d=Math.abs(a-b);return Math.min(d,nails-d);
}

function geometryFor(size,nails){
  const key=size+':'+nails;
  if(GEOMETRY_CACHE.has(key))return GEOMETRY_CACHE.get(key);
  const radius=size/2-2,center=size/2,pins=new Int16Array(nails*2);
  for(let i=0;i<nails;i++){
    const a=i*Math.PI*2/nails-Math.PI/2;
    pins[i*2]=Math.round(center+radius*Math.cos(a));
    pins[i*2+1]=Math.round(center+radius*Math.sin(a));
  }
  const g={size,nails,pins,lines:new Map()};
  GEOMETRY_CACHE.set(key,g);return g;
}

function linePixels(g,a,b){
  const lo=Math.min(a,b),hi=Math.max(a,b),key=lo*g.nails+hi;
  if(g.lines.has(key))return g.lines.get(key);
  let x0=g.pins[a*2],y0=g.pins[a*2+1];
  const x1=g.pins[b*2],y1=g.pins[b*2+1],out=[];
  const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
  let err=dx-dy;
  while(true){
    if(x0>=0&&x0<g.size&&y0>=0&&y0<g.size)out.push(y0*g.size+x0);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx}
    if(e2<dx){err+=dx;y0+=sy}
  }
  const pixels=Uint32Array.from(out);g.lines.set(key,pixels);return pixels;
}

function rgbaToSrgb(rgba){
  const out=new Float32Array(rgba.length/4*3);
  for(let p=0;p<rgba.length/4;p++){
    const k=p*4,b=p*3,a=rgba[k+3]/255;
    out[b]=(rgba[k]/255)*a+(1-a);
    out[b+1]=(rgba[k+1]/255)*a+(1-a);
    out[b+2]=(rgba[k+2]/255)*a+(1-a);
  }
  return out;
}

function suppressBackgroundSrgb(rgb,subjectMap,amount){
  const out=new Float32Array(rgb.length);
  for(let p=0;p<rgb.length/3;p++){
    const subject=clamp01(subjectMap?.[p]||0);
    const fade=amount*Math.pow(1-subject,1.65);
    const b=p*3;
    out[b]=rgb[b]*(1-fade)+fade;
    out[b+1]=rgb[b+1]*(1-fade)+fade;
    out[b+2]=rgb[b+2]*(1-fade)+fade;
  }
  return out;
}

function hexToSrgb(hex){
  const s=String(hex||'#111111').replace('#','').trim();
  const f=s.length===3?s.split('').map(c=>c+c).join(''):s;
  return [parseInt(f.slice(0,2),16)/255,parseInt(f.slice(2,4),16)/255,parseInt(f.slice(4,6),16)/255];
}

function threadTransmission(hex,alpha){
  const c=hexToSrgb(hex);
  return [
    1-alpha*(1-c[0]),
    1-alpha*(1-c[1]),
    1-alpha*(1-c[2]),
  ];
}

function buildCenterPenalty(size,portrait){
  const out=new Float32Array(size*size),c=(size-1)/2,scale=1/Math.max(1,size*.29);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=y*size+x,r=Math.hypot(x-c,y-c)*scale;
    const central=Math.pow(clamp01(1-r),1.45);
    const evidence=clamp01(
      .52*(portrait.featureMap?.[p]||0)+
      .38*(portrait.edgeMap?.[p]||0)+
      .25*(portrait.contrastMap?.[p]||0)
    );
    out[p]=central*(1-.94*evidence);
  }
  return out;
}

function featureUnion(portrait,p){
  return Math.max(
    portrait.eyesMap?.[p]||0,
    portrait.browsMap?.[p]||0,
    portrait.noseMap?.[p]||0,
    portrait.mouthMap?.[p]||0,
    portrait.jawMap?.[p]||0
  );
}

function buildSolveWeights(portrait,mask,likeness){
  const n=mask.length;
  const structure=new Float32Array(n),identity=new Float32Array(n),global=new Float32Array(n),refine=new Float32Array(n);
  for(let p=0;p<n;p++){
    const m=mask[p];if(m<=.001)continue;
    const subject=clamp01(portrait.subjectMap?.[p]||0);
    const edge=clamp01(portrait.edgeMap?.[p]||0);
    const contrast=clamp01(portrait.contrastMap?.[p]||0);
    const structureSignal=Math.min(1.8,portrait.structureMap?.[p]||0);
    const feature=Math.min(2.8,portrait.featureMap?.[p]||0);
    const landmark=Math.min(1.8,featureUnion(portrait,p));
    const hair=Math.min(1.5,portrait.hairMap?.[p]||0);
    const beard=Math.min(1.5,portrait.beardMap?.[p]||0);
    const actual=.25+.48*edge+.34*contrast;
    const base=m*(.20+.80*subject);
    global[p]=base*(.42+.72*edge+.42*contrast+.26*feature);
    structure[p]=base*(.36+1.02*structureSignal+.86*hair+.46*beard+.44*edge);
    identity[p]=base*(.28+.62*edge+.42*contrast+likeness*(1.72*feature+2.35*landmark*actual+.46*hair*actual+.30*beard*actual));
    refine[p]=base*(.24+1.05*edge+.78*contrast+likeness*(1.48*feature+1.92*landmark*actual));
  }
  return {structure,identity,global,refine};
}

function scanCandidatePins(nails,current,step,limit,minGap,visit){
  const full=!limit||limit>=nails||(step>0&&step%64===0);
  if(full){
    for(let pin=0;pin<nails;pin++){
      if(pin===current||circleGap(pin,current,nails)<minGap)continue;
      visit(pin);
    }
    return;
  }
  let seed=((step+1)*1664525+(current+11)*1013904223)>>>0;
  const seen=new Set();
  for(let n=0;n<limit*7&&seen.size<limit;n++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const pin=seed%nails;
    if(pin===current||seen.has(pin)||circleGap(pin,current,nails)<minGap)continue;
    seen.add(pin);visit(pin);
  }
}

function createState(g,colorIndex){
  const start=Math.floor((g.nails*(.07+colorIndex*.173))%g.nails);
  return {
    colorIndex,current:start,trail:[start],trails:[],segments:[],
    edgeUse:new Uint8Array(g.nails*g.nails),pinUse:new Uint16Array(g.nails),
    accepted:0,restarts:0,step:0
  };
}

function restartTrail(state,g){
  if(state.trail.length>1)state.trails.push(state.trail);
  state.restarts++;
  let best=(state.current+Math.floor(g.nails*(.137+.037*(state.restarts%9))))%g.nails;
  let bestUse=state.pinUse[best];
  for(let k=1;k<=18;k++){
    const pin=(best+Math.floor(k*g.nails/19))%g.nails;
    if(state.pinUse[pin]<bestUse){best=pin;bestUse=state.pinUse[pin]}
  }
  state.current=best;state.trail=[best];
}

function scoreCandidate({
  pixels,target,currentRgb,weight,trans,congestion,centerPenalty,avoidance,
  crossingPenalty,repeat,pinPenalty,size,colorAffinity,affinityStride,colorIndex,affinityStrength
}){
  if(!pixels.length)return -Infinity;
  let gain=0,positive=0,negative=0,center=0,crowd=0,avoid=0,weighted=0,hits=0;
  for(let i=0;i<pixels.length;i++){
    const p=pixels[i];let w=weight[p]||0;
    if(w<=.0001)continue;
    if(colorAffinity&&affinityStride>0){
      const affinity=colorAffinity[p*affinityStride+colorIndex]||0;
      w*=.52+affinityStrength*(.35+1.42*affinity);
    }
    const b=p*3;
    const cr=currentRgb[b],cg=currentRgb[b+1],cb=currentRgb[b+2];
    const tr=target[b],tg=target[b+1],tb=target[b+2];
    const nr=cr*trans[0],ng=cg*trans[1],nb=cb*trans[2];
    const before=(cr-tr)*(cr-tr)+(cg-tg)*(cg-tg)+(cb-tb)*(cb-tb);
    const after=(nr-tr)*(nr-tr)+(ng-tg)*(ng-tg)+(nb-tb)*(nb-tb);
    const d=(before-after)*w;
    gain+=d;weighted+=w;
    if(d>0){positive+=d;hits++}else negative-=d;
    center+=(centerPenalty[p]||0)*w;
    const q=congestion[p]||0;crowd+=q*(1+.35*q)*w;
    const darkDelta=Math.max(0,(cr+cg+cb-nr-ng-nb)/3);
    avoid+=(avoidance?.[p]||0)*darkDelta*w;
  }
  if(weighted<EPS||hits<2)return -Infinity;
  const lenNorm=Math.sqrt(Math.max(18,pixels.length));
  const hitRatio=hits/Math.max(1,pixels.length);
  let score=gain/lenNorm;
  score+=.12*(positive/lenNorm)*Math.min(1,hitRatio*4.8);
  score-=.16*(negative/lenNorm);
  score-=.00062*(center/Math.max(EPS,weighted));
  score-=.00034*(crowd/Math.max(EPS,weighted));
  score-=Math.max(0,crossingPenalty||0)*(avoid/Math.max(EPS,weighted));
  score-=repeat*.00068;
  score-=pinPenalty*.000045;
  const lengthRatio=pixels.length/Math.max(1,size);
  if(hitRatio<.075)score-=((.075-hitRatio)/.075)*.0016;
  if(lengthRatio>1.10&&hitRatio<.20)score-=(lengthRatio-1.10)*.00145;
  return score;
}

function applyLine(pixels,currentRgb,trans,congestion,colorIndex){
  const crowd=colorIndex===0?.038:.026;
  for(let i=0;i<pixels.length;i++){
    const p=pixels[i],b=p*3;
    currentRgb[b]*=trans[0];
    currentRgb[b+1]*=trans[1];
    currentRgb[b+2]*=trans[2];
    congestion[p]=Math.min(4,congestion[p]+crowd);
  }
}

function solvePass({
  g,state,target,currentRgb,weight,trans,congestion,centerPenalty,avoidance,crossingPenalty,
  colorAffinity,affinityStride,affinityStrength,lineAlpha,budget,candidateLimit,minGap,maxRepeat,
  deadline,minScore,allowRestart=true,onProgress
}){
  let accepted=0,stalled=0;
  for(let local=0;local<budget;local++,state.step++){
    if(state.step%18===0&&Date.now()>=deadline)break;
    let bestPin=-1,bestScore=-Infinity,bestPixels=null;
    scanCandidatePins(g.nails,state.current,state.step,candidateLimit,minGap,pin=>{
      const lo=Math.min(state.current,pin),hi=Math.max(state.current,pin),edgeKey=lo*g.nails+hi;
      const repeat=state.edgeUse[edgeKey];if(repeat>=maxRepeat)return;
      const pixels=linePixels(g,state.current,pin);
      const score=scoreCandidate({
        pixels,target,currentRgb,weight,trans,congestion,centerPenalty,avoidance,crossingPenalty,repeat,
        pinPenalty:state.pinUse[pin]+state.pinUse[state.current],size:g.size,
        colorAffinity,affinityStride,colorIndex:state.colorIndex,affinityStrength
      });
      if(score>bestScore){bestScore=score;bestPin=pin;bestPixels=pixels}
    });
    if(bestPin<0||bestScore<=minScore){
      stalled++;
      if(allowRestart&&stalled<=2){restartTrail(state,g);continue}
      break;
    }
    stalled=0;
    const from=state.current,lo=Math.min(from,bestPin),hi=Math.max(from,bestPin),edgeKey=lo*g.nails+hi;
    state.edgeUse[edgeKey]++;
    state.pinUse[from]++;state.pinUse[bestPin]++;
    applyLine(bestPixels,currentRgb,trans,congestion,state.colorIndex);
    state.segments.push({a:from,b:bestPin,alpha:lineAlpha});
    state.current=bestPin;state.trail.push(bestPin);state.accepted++;accepted++;
    if(onProgress&&(accepted%24===0||accepted===budget))onProgress(accepted,budget,bestScore);
  }
  return accepted;
}

function finishState(state){
  if(state.trail.length>1)state.trails.push(state.trail);
  state.trail=[state.current];
}

function mapError(rgb,target,map){
  if(!map)return 0;
  let sum=0,wSum=0;
  for(let p=0;p<map.length;p++){
    const w=map[p]||0;if(w<=.001)continue;
    const b=p*3;
    const e=(rgb[b]-target[b])**2+(rgb[b+1]-target[b+1])**2+(rgb[b+2]-target[b+2])**2;
    sum+=e*w;wSum+=w;
  }
  return sum/Math.max(EPS,wSum);
}

function featureErrorSnapshot(rgb,target,portrait){
  return {
    eyes:mapError(rgb,target,portrait.eyesMap),
    brows:mapError(rgb,target,portrait.browsMap),
    nose:mapError(rgb,target,portrait.noseMap),
    mouth:mapError(rgb,target,portrait.mouthMap),
    jaw:mapError(rgb,target,portrait.jawMap),
  };
}

function completionFrom(before,after){
  const out={};
  for(const k of Object.keys(before)){
    out[k]=before[k]>EPS?clamp01(1-after[k]/before[k]):1;
  }
  return out;
}

function mse(rgb,target,mask){
  let e=0,w=0;
  for(let p=0;p<mask.length;p++){
    const m=mask[p];if(m<=.001)continue;
    const b=p*3;
    e+=m*((rgb[b]-target[b])**2+(rgb[b+1]-target[b+1])**2+(rgb[b+2]-target[b+2])**2);
    w+=3*m;
  }
  return e/Math.max(EPS,w);
}

function routeDiagnostics(routes,g,portrait,centerPenalty){
  let fibers=0,center=0,bright=0;
  for(const route of routes)for(const trail of route.trails||[])for(let i=1;i<trail.length;i++){
    const pixels=linePixels(g,trail[i-1],trail[i]);let c=0,b=0;
    for(let k=0;k<pixels.length;k++){
      const p=pixels[k];c+=centerPenalty[p]||0;b+=portrait.avoidance?.[p]||0;
    }
    fibers++;
    if(c/Math.max(1,pixels.length)>.19)center++;
    if(b/Math.max(1,pixels.length)>.24)bright++;
  }
  return {centerCrossingRate:fibers?center/fibers:0,brightFaceCrossingRate:fibers?bright/fibers:0};
}

function residualPaletteMasses({
  target,currentRgb,portrait,affinity,colors,blackIndex,weight,transmissions,perColor,progress,colorStrength
}){
  const masses=new Float64Array(colors);
  for(let p=0;p<portrait.subjectMap.length;p++){
    const subject=clamp01(portrait.subjectMap[p]||0);
    if(subject<=.008)continue;
    const w=(weight[p]||0)*(.12+.88*subject);
    if(w<=.0001)continue;
    const b=p*3;
    const cr=currentRgb[b],cg=currentRgb[b+1],cb=currentRgb[b+2];
    const tr=target[b],tg=target[b+1],tb=target[b+2];
    const nr=Math.max(0,cr-tr),ng=Math.max(0,cg-tg),nb=Math.max(0,cb-tb);
    const need=nr+ng+nb;
    if(need<.002)continue;
    const maxNeed=Math.max(nr,ng,nb),minNeed=Math.min(nr,ng,nb);
    const chromaNeed=(maxNeed-minNeed)/Math.max(.02,maxNeed);
    const darkNeed=.2126*nr+.7152*ng+.0722*nb;
    for(let ci=0;ci<colors;ci++){
      const trans=transmissions[ci],ar=1-trans[0],ag=1-trans[1],ab=1-trans[2];
      const projected=nr*ar+ng*ag+nb*ab;
      if(projected<=0)continue;
      const a=affinity?.[p*colors+ci]||0;
      let fit;
      if(ci===blackIndex){
        fit=(.92+.42*(darkNeed/Math.max(.001,need)))*(.98-.10*chromaNeed*colorStrength);
      }else{
        fit=(.28+1.58*a)*(.72+.42*colorStrength)*(.72+.40*chromaNeed);
      }
      masses[ci]+=w*projected*fit;
    }
  }

  const totalUsed=perColor.reduce((s,v)=>s+v,0);
  for(let ci=0;ci<colors;ci++){
    const share=perColor[ci]/Math.max(1,totalUsed);
    const softCap=ci===blackIndex?.58:Math.max(.08,1/Math.max(3,colors)*1.18);
    const over=Math.max(0,share-softCap);
    masses[ci]/=1+over*3.2;
    if(ci===blackIndex){
      if(progress<.18)masses[ci]*=1.12;
      if(progress>.58)masses[ci]*=.90+.08*(1-colorStrength);
    }else{
      masses[ci]*=.88+.36*colorStrength;
      if(perColor[ci]<40)masses[ci]*=1.08;
    }
  }
  return masses;
}

function pickResidualColor(masses,perColor,totalLines,blackIndex,blocked){
  let best=-1,bestScore=0;
  for(let ci=0;ci<masses.length;ci++){
    if(blocked?.[ci]>0)continue;
    const expected=totalLines*(ci===blackIndex?.54:Math.max(.07,.46/Math.max(1,masses.length-1)));
    const balance=1+perColor[ci]/Math.max(120,expected);
    const score=masses[ci]/balance;
    if(score>bestScore){bestScore=score;best=ci}
  }
  return best;
}

export function solveFastLayeredPortrait({
  size,nails=360,minGap=9,rgba,preprocess={},palette={},solve={},onProgress
}){
  if(rgba.length!==size*size*4)throw new Error('RGBA size mismatch');
  const startedAt=Date.now(),g=geometryFor(size,nails),mask=makeCircularMask(size,1.5);
  const linearRgb=rgbaToLinearRgb(rgba);
  const portrait=buildPortraitPriorityMaps(linearRgb,size,{
    mask,faceBox:preprocess.faceBox||null,landmarks:preprocess.landmarks||null,
    backgroundWeight:preprocess.backgroundWeight??.012,faceBoost:preprocess.faceBoost??1.68,
    edgeBoost:preprocess.edgeBoost??2.0,featureBoost:preprocess.featureBoost??2.45,
    darkDetailBoost:preprocess.darkDetailBoost??.78,avoidanceBoost:preprocess.avoidanceBoost??1.95
  });
  onProgress?.({phase:'preprocess',done:1,total:1});

  const likeness=clamp01(solve.likeness??.94),detail=clamp01(solve.detail??.90),colorStrength=clamp01(solve.colorStrength??.68);
  const rawSrgb=rgbaToSrgb(rgba);
  const target=suppressBackgroundSrgb(rawSrgb,portrait.subjectMap,preprocess.backgroundSuppress??.88);
  const paletteMask=new Float32Array(mask.length);
  for(let p=0;p<mask.length;p++)paletteMask[p]=mask[p]*(.025+.975*clamp01(portrait.subjectMap[p]||0));
  const targetLinear=new Float32Array(linearRgb.length);
  for(let p=0;p<linearRgb.length/3;p++){
    const subject=clamp01(portrait.subjectMap[p]||0),fade=(preprocess.backgroundSuppress??.88)*Math.pow(1-subject,1.68),b=p*3;
    targetLinear[b]=linearRgb[b]*(1-fade)+fade;
    targetLinear[b+1]=linearRgb[b+1]*(1-fade)+fade;
    targetLinear[b+2]=linearRgb[b+2]*(1-fade)+fade;
  }
  const selected=chooseThreadPaletteSimulation(targetLinear,size,{
    candidateHex:palette.candidateHex,nColors:palette.nColors??5,fixedHex:palette.fixedHex??['#111111'],
    mask:paletteMask,simulationSize:Math.min(size,palette.simulationSize??40),maxCombinations:palette.maxCombinations??240
  });
  onProgress?.({phase:'palette',done:1,total:1});

  const colors=selected.hex.length;
  let blackIndex=selected.hex.findIndex(h=>String(h).toLowerCase()==='#111111');
  if(blackIndex<0){
    let best=Infinity;blackIndex=0;
    selected.hex.forEach((h,i)=>{const c=hexToSrgb(h),y=.2126*c[0]+.7152*c[1]+.0722*c[2];if(y<best){best=y;blackIndex=i}});
  }
  const affinity=buildPaletteAffinityMap(targetLinear,selected.linearRgb,portrait.importance,{temperature:preprocess.colorAffinityTemperature??.056});
  const weights=buildSolveWeights(portrait,mask,likeness);
  const currentRgb=new Float32Array(target.length);currentRgb.fill(1);
  const congestion=new Float32Array(mask.length),centerPenalty=buildCenterPenalty(size,portrait);
  const states=Array.from({length:colors},(_,ci)=>createState(g,ci));
  const perColor=new Int32Array(colors),blocked=new Uint8Array(colors);
  const initialFeatureError=featureErrorSnapshot(currentRgb,target,portrait);
  const initialMse=mse(currentRgb,target,mask);

  const totalLines=Math.max(3200,solve.maxFibers??Math.round(6900+detail*1600));
  const candidateLimit=Math.max(84,solve.candidateLimit??Math.round(98+detail*34));
  const maxRepeat=Math.max(1,solve.maxRepeat??2);
  const baseAlpha=clamp(solve.renderAlpha??(.050+.010*detail),.038,.068);
  const blockSize=Math.max(28,Math.min(84,solve.blockSize??56));
  const timeBudgetMs=Math.max(0,Number(solve.timeBudgetMs||0));
  const deadline=timeBudgetMs>0?startedAt+timeBudgetMs:Number.POSITIVE_INFINITY;
  let fibers=0,idleRounds=0;

  while(fibers<totalLines&&Date.now()<deadline){
    const progress=fibers/Math.max(1,totalLines);
    let stage,weight,affinityStrength,minScore,alphaScale;
    if(progress<.14){
      stage='structure';weight=weights.structure;affinityStrength=.16;minScore=6.5e-8;alphaScale=1.08;
    }else if(progress<.60){
      stage='identity';weight=weights.identity;affinityStrength=.24;minScore=3.4e-8;alphaScale=1.00;
    }else if(progress<.78){
      stage='color';weight=weights.global;affinityStrength=.90;minScore=2.8e-8;alphaScale=.91;
    }else{
      stage='refine';weight=weights.refine;affinityStrength=.34;minScore=1.5e-8;alphaScale=.76;
    }
    const lineAlpha=clamp(baseAlpha*alphaScale,.030,.074);
    const transmissions=selected.hex.map(h=>threadTransmission(h,lineAlpha));
    const masses=residualPaletteMasses({
      target,currentRgb,portrait,affinity,colors,blackIndex,weight,transmissions,perColor,progress,colorStrength
    });
    if(stage==='structure')masses[blackIndex]*=1.32;
    else if(stage==='identity')masses[blackIndex]*=1.72;
    else if(stage==='color')masses[blackIndex]*=.78;
    else if(stage==='refine')masses[blackIndex]*=1.88;
    const ci=pickResidualColor(masses,perColor,totalLines,blackIndex,blocked);
    if(ci<0){
      let anyBlocked=false;
      for(let k=0;k<blocked.length;k++)if(blocked[k]>0){blocked[k]--;anyBlocked=true}
      if(anyBlocked&&idleRounds++<colors*3)continue;
      break;
    }

    const before=fibers;
    const accepted=solvePass({
      g,state:states[ci],target,currentRgb,weight,trans:transmissions[ci],congestion,centerPenalty,
      avoidance:portrait.avoidance,crossingPenalty:stage==='identity'?.0054:stage==='refine'?.0068:stage==='color'?.0032:.0038,
      colorAffinity:affinity,affinityStride:colors,affinityStrength,lineAlpha,
      budget:Math.min(blockSize,totalLines-fibers),candidateLimit,minGap,maxRepeat,deadline,minScore,
      allowRestart:true,
      onProgress:(done,total,bestScore)=>onProgress?.({
        phase:'portrait-stage',stage,colorIndex:ci,colorHex:selected.hex[ci],
        done:before+done,total:totalLines,stageDone:done,stageTotal:total,bestScore
      })
    });

    if(accepted<=0){
      blocked[ci]=3;idleRounds++;
      if(idleRounds>colors*5)break;
      continue;
    }
    perColor[ci]+=accepted;fibers+=accepted;idleRounds=0;
    for(let k=0;k<blocked.length;k++)if(blocked[k]>0)blocked[k]--;
    onProgress?.({phase:'portrait-stage',stage,colorIndex:ci,colorHex:selected.hex[ci],done:fibers,total:totalLines,stageDone:accepted,stageTotal:blockSize});
  }

  for(const state of states)finishState(state);
  const routes=states.map((state,ci)=>({
    colorIndex:ci,selectedFibers:state.accepted,trails:state.trails,segments:state.segments,
    sequence:state.trails.flatMap(t=>t),connectors:[],trailStarts:[]
  }));
  const finalFeatureError=featureErrorSnapshot(currentRgb,target,portrait);
  const diagnostics=routeDiagnostics(routes,g,portrait,centerPenalty);
  const finalMse=mse(currentRgb,target,mask);
  const blackShare=fibers?perColor[blackIndex]/fibers:0;
  return {
    mode:'color-global',routes,palette:selected,renderedRgb:null,
    metrics:{
      fibers,colorsUsed:perColor.reduce((n,v)=>n+(v>0?1:0),0),perColor:Array.from(perColor),
      elapsedMs:Date.now()-startedAt,targetFibers:totalLines,completion:fibers/Math.max(1,totalLines),
      cachedLines:g.lines.size,method:'feature-locked-continuous-residual-optical-v3',
      mse:finalMse,mseImprovement:initialMse>EPS?clamp01(1-finalMse/initialMse):1,
      featureCompletions:completionFrom(initialFeatureError,finalFeatureError),
      renderAlpha:baseAlpha,blackShare,colorShare:1-blackShare,
      timedOut:Number.isFinite(deadline)&&Date.now()>=deadline,
      trails:routes.reduce((s,r)=>s+(r.trails?.length||0),0),...diagnostics
    },
    portrait:{
      enabled:true,faceBox:portrait.faceBox,landmarksUsed:portrait.landmarksUsed,
      orientationCorrected:Boolean(preprocess.landmarks?.orientationCorrected),
      orientationEvidence:preprocess.landmarks?.orientationEvidence||null
    },
    backgroundSuppression:preprocess.backgroundSuppress??.88,
    colorLayering:{enabled:true,method:'joint-residual-optical-competition'}
  };
}
