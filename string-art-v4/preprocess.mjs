const EPS = 1e-9;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

export const DEFAULT_THREAD_CANDIDATES = [
  '#111111', '#2a1712', '#4b2b20', '#70452f', '#9a5e42', '#bd7956',
  '#d99a72', '#e8b694', '#f0cfb4', '#f5e6d6', '#c77b77', '#d95f73',
  '#c63786', '#8e365b', '#e47b2c', '#d92d35', '#f2c84b', '#6f7e3a',
  '#2f7d4b', '#2f6f73', '#29a8c7', '#2358a6', '#283a63', '#72558d',
  '#7a7a7a', '#b5aaa0',
];

export function srgbChannelToLinear(v) {
  v = clamp01(v);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearChannelToSrgb(v) {
  v = clamp01(v);
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function hexToLinearRgb(hex) {
  const s = hex.replace('#', '').trim();
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error('Invalid hex color: ' + hex);
  return [0, 2, 4].map((i) => srgbChannelToLinear(parseInt(full.slice(i, i + 2), 16) / 255));
}

export function linearRgbToHex(rgb) {
  const b = rgb.map((v) => Math.round(linearChannelToSrgb(v) * 255).toString(16).padStart(2, '0'));
  return '#' + b.join('');
}

export function rgbaToLinearRgb(rgba, { backgroundSrgb = [1, 1, 1] } = {}) {
  if (rgba.length % 4 !== 0) throw new Error('RGBA buffer length must be divisible by 4');
  const bg = backgroundSrgb.map(srgbChannelToLinear);
  const out = new Float32Array((rgba.length / 4) * 3);
  for (let p = 0; p < rgba.length / 4; p++) {
    const a = rgba[p * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const fg = srgbChannelToLinear(rgba[p * 4 + c] / 255);
      out[p * 3 + c] = fg * a + bg[c] * (1 - a);
    }
  }
  return out;
}

export function linearRgbToMonoDarkness(rgb, { gamma = 1, toneFloor = 0, toneCeiling = 1 } = {}) {
  if (rgb.length % 3 !== 0) throw new Error('RGB buffer length must be divisible by 3');
  const out = new Float32Array(rgb.length / 3);
  for (let p = 0; p < out.length; p++) {
    const r = rgb[p * 3], g = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const d = Math.pow(clamp01(1 - y), gamma);
    out[p] = toneFloor + d * (toneCeiling - toneFloor);
  }
  return out;
}

function gaussianKernel(sigma) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(radius * 2 + 1);
  const inv = 1 / (2 * sigma * sigma);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) { const w = Math.exp(-(i * i) * inv); k[i + radius] = w; sum += w; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return { k, radius };
}

export function gaussianBlurScalar(src, size, sigma) {
  const { k, radius } = gaussianKernel(Math.max(0.35, sigma));
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0;
    for (let d = -radius; d <= radius; d++) s += src[y * size + Math.max(0, Math.min(size - 1, x + d))] * k[d + radius];
    tmp[y * size + x] = s;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0;
    for (let d = -radius; d <= radius; d++) s += tmp[Math.max(0, Math.min(size - 1, y + d)) * size + x] * k[d + radius];
    out[y * size + x] = s;
  }
  return out;
}

export function percentileStretchScalar(src, low = 0.01, high = 0.99, mask = null) {
  const vals = [];
  for (let i = 0; i < src.length; i++) if (!mask || mask[i] > 0.01) vals.push(src[i]);
  vals.sort((a, b) => a - b);
  if (!vals.length) return new Float32Array(src);
  const lo = vals[Math.floor((vals.length - 1) * low)];
  const hi = vals[Math.floor((vals.length - 1) * high)];
  if (hi - lo < EPS) return new Float32Array(src);
  const out = new Float32Array(src.length);
  const scale = 1 / (hi - lo);
  for (let i = 0; i < src.length; i++) out[i] = clamp01((src[i] - lo) * scale);
  return out;
}

export function prepareMonoTarget(rgb, size, {
  gamma = 0.95,
  detail = 0.45,
  detailRadius = size / 24,
  toneFloor = 0,
  toneCeiling = 0.96,
  mask = null,
} = {}) {
  let darkness = linearRgbToMonoDarkness(rgb, { gamma: 1, toneFloor: 0, toneCeiling: 1 });
  darkness = percentileStretchScalar(darkness, 0.01, 0.992, mask);
  if (detail > 0) {
    const blur = gaussianBlurScalar(darkness, size, detailRadius);
    const sharp = new Float32Array(darkness.length);
    for (let i = 0; i < sharp.length; i++) sharp[i] = clamp01(darkness[i] + detail * (darkness[i] - blur[i]));
    darkness = sharp;
  }
  for (let i = 0; i < darkness.length; i++) {
    const d = Math.pow(clamp01(darkness[i]), gamma);
    darkness[i] = (toneFloor + d * (toneCeiling - toneFloor)) * (mask ? mask[i] : 1);
  }
  return darkness;
}



function normalizedFaceBox(faceBox) {
  if (!faceBox) return { x: 0.20, y: 0.08, width: 0.60, height: 0.80 };
  const x = clamp01(Number(faceBox.x ?? 0.20));
  const y = clamp01(Number(faceBox.y ?? 0.08));
  const width = Math.max(0.18, Math.min(1 - x, Number(faceBox.width ?? 0.60)));
  const height = Math.max(0.22, Math.min(1 - y, Number(faceBox.height ?? 0.80)));
  return { x, y, width, height };
}

function gaussianFeature(nx, ny, cx, cy, sx, sy) {
  const dx = (nx - cx) / Math.max(1e-4, sx);
  const dy = (ny - cy) / Math.max(1e-4, sy);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

const LM = Object.freeze({
  oval:[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
  leftEye:[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33],
  rightEye:[263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466,263],
  leftBrow:[70,63,105,66,107,55,65,52,53,46],
  rightBrow:[300,293,334,296,336,285,295,282,283,276],
  lipsOuter:[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146,61],
  lipsInner:[78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95,78],
  noseBridge:[168,6,197,195,5,4,1,19,94,2],
  noseBase:[98,97,2,326,327,294,278,344,440,275,4,45,220,115,48,64,98],
  jaw:[234,93,132,58,172,136,150,149,176,148,152,377,400,378,379,365,397,288,361,323,454],
  leftIris:[468,469,470,471,472,468],
  rightIris:[473,474,475,476,477,473],
});

function pointFromMesh(mesh, index) {
  const p = mesh?.[index];
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return { x:p.x, y:p.y };
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
  const vv=vx*vx+vy*vy;
  const t=vv>1e-12?Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv)):0;
  const dx=px-(ax+vx*t),dy=py-(ay+vy*t);
  return Math.hypot(dx,dy);
}

function splatSegment(map, dirX, dirY, size, a, b, radiusPx, strength=1) {
  if (!a || !b) return;
  const ax=a.x*(size-1), ay=a.y*(size-1), bx=b.x*(size-1), by=b.y*(size-1);
  const minX=Math.max(0,Math.floor(Math.min(ax,bx)-radiusPx-1));
  const maxX=Math.min(size-1,Math.ceil(Math.max(ax,bx)+radiusPx+1));
  const minY=Math.max(0,Math.floor(Math.min(ay,by)-radiusPx-1));
  const maxY=Math.min(size-1,Math.ceil(Math.max(ay,by)+radiusPx+1));
  const dx=bx-ax,dy=by-ay,mag=Math.hypot(dx,dy)||1,tx=dx/mag,ty=dy/mag;
  const inv=Math.max(1e-6,1/radiusPx);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const d=pointSegmentDistance(x,y,ax,ay,bx,by);
    if(d>radiusPx)continue;
    const v=strength*Math.exp(-2.35*(d*inv)*(d*inv)),p=y*size+x;
    if(v>map[p]){
      map[p]=v;
      if(dirX){dirX[p]=tx;dirY[p]=ty}
    }
  }
}

function splatPolyline(map, dirX, dirY, size, mesh, ids, radiusPx, strength=1) {
  if(!mesh?.length)return;
  for(let i=1;i<ids.length;i++){
    const a=pointFromMesh(mesh,ids[i-1]),b=pointFromMesh(mesh,ids[i]);
    splatSegment(map,dirX,dirY,size,a,b,radiusPx,strength);
  }
}

function splatPoint(map,size,point,radiusPx,strength=1){
  if(!point)return;
  const cx=point.x*(size-1),cy=point.y*(size-1);
  const minX=Math.max(0,Math.floor(cx-radiusPx)),maxX=Math.min(size-1,Math.ceil(cx+radiusPx));
  const minY=Math.max(0,Math.floor(cy-radiusPx)),maxY=Math.min(size-1,Math.ceil(cy+radiusPx));
  const inv=Math.max(1e-6,1/radiusPx);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const d=Math.hypot(x-cx,y-cy);if(d>radiusPx)continue;
    const v=strength*Math.exp(-2.4*(d*inv)*(d*inv)),p=y*size+x;
    if(v>map[p])map[p]=v;
  }
}

function polygonContains(nx,ny,poly){
  if(!poly?.length)return false;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if(!a||!b)continue;
    const hit=((a.y>ny)!==(b.y>ny))&&(nx<(b.x-a.x)*(ny-a.y)/(b.y-a.y+1e-12)+a.x);
    if(hit)inside=!inside;
  }
  return inside;
}

function namedFeatureGeometry(box, landmarks) {
  const p=(key,fx,fy)=>{
    const q=landmarks?.[key];
    if(q&&Number.isFinite(q.x)&&Number.isFinite(q.y))return q;
    return {x:box.x+box.width*fx,y:box.y+box.height*fy};
  };
  return {
    leftEye:p('leftEye',.35,.39),rightEye:p('rightEye',.65,.39),
    nose:p('nose',.50,.54),mouth:p('mouth',.50,.70)
  };
}

function buildDenseLandmarkMaps(size, mesh, box, named) {
  const eyesMap=new Float32Array(size*size),browsMap=new Float32Array(size*size);
  const noseMap=new Float32Array(size*size),mouthMap=new Float32Array(size*size);
  const jawMap=new Float32Array(size*size),ovalMap=new Float32Array(size*size);
  const irisMap=new Float32Array(size*size),featureDirX=new Float32Array(size*size),featureDirY=new Float32Array(size*size);
  const hasMesh=Array.isArray(mesh)&&mesh.length>=400;
  if(hasMesh){
    const eyeR=Math.max(1.15,size*.010), browR=Math.max(1.15,size*.009);
    const lipR=Math.max(1.15,size*.0105),noseR=Math.max(1.05,size*.0085),jawR=Math.max(1.15,size*.009);
    splatPolyline(eyesMap,featureDirX,featureDirY,size,mesh,LM.leftEye,eyeR,1.50);
    splatPolyline(eyesMap,featureDirX,featureDirY,size,mesh,LM.rightEye,eyeR,1.50);
    splatPolyline(browsMap,featureDirX,featureDirY,size,mesh,LM.leftBrow,browR,1.28);
    splatPolyline(browsMap,featureDirX,featureDirY,size,mesh,LM.rightBrow,browR,1.28);
    splatPolyline(mouthMap,featureDirX,featureDirY,size,mesh,LM.lipsOuter,lipR,1.45);
    splatPolyline(mouthMap,featureDirX,featureDirY,size,mesh,LM.lipsInner,lipR*.82,1.15);
    splatPolyline(noseMap,featureDirX,featureDirY,size,mesh,LM.noseBridge,noseR,1.10);
    splatPolyline(noseMap,featureDirX,featureDirY,size,mesh,LM.noseBase,noseR*1.1,1.34);
    splatPolyline(jawMap,featureDirX,featureDirY,size,mesh,LM.jaw,jawR,1.10);
    splatPolyline(ovalMap,featureDirX,featureDirY,size,mesh,LM.oval,jawR,1.0);
    for(const id of [468,473])splatPoint(irisMap,size,pointFromMesh(mesh,id),Math.max(1.3,size*.012),1.7);
  }else{
    const g=namedFeatureGeometry(box,named);
    const left={x:(g.leftEye.x-box.x)/box.width,y:(g.leftEye.y-box.y)/box.height};
    const right={x:(g.rightEye.x-box.x)/box.width,y:(g.rightEye.y-box.y)/box.height};
    const eyeSpan=Math.max(.18,Math.abs(right.x-left.x));
    const addGaussian=(map,cx,cy,sx,sy,a=1)=>{
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const nx=x/(size-1),ny=y/(size-1);
        const v=a*gaussianFeature(nx,ny,cx,cy,sx,sy),p=y*size+x;
        if(v>map[p])map[p]=v;
      }
    };
    addGaussian(eyesMap,g.leftEye.x,g.leftEye.y,box.width*.09,box.height*.035,1.35);
    addGaussian(eyesMap,g.rightEye.x,g.rightEye.y,box.width*.09,box.height*.035,1.35);
    addGaussian(browsMap,g.leftEye.x,g.leftEye.y-box.height*.07,box.width*.11,box.height*.025,1.05);
    addGaussian(browsMap,g.rightEye.x,g.rightEye.y-box.height*.07,box.width*.11,box.height*.025,1.05);
    addGaussian(noseMap,g.nose.x,g.nose.y,box.width*.07,box.height*.13,1.0);
    addGaussian(mouthMap,g.mouth.x,g.mouth.y,box.width*.17,box.height*.035,1.25);
  }
  return {eyesMap,browsMap,noseMap,mouthMap,jawMap,ovalMap,irisMap,featureDirX,featureDirY,hasMesh};
}

export function buildPortraitPriorityMaps(rgb, size, {
  mask = null,
  faceBox = null,
  landmarks = null,
  backgroundWeight = 0.18,
  faceBoost = 1.15,
  edgeBoost = 1.65,
  featureBoost = 2.15,
  darkDetailBoost = 0.55,
  avoidanceBoost = 1,
} = {}) {
  if (rgb.length !== size * size * 3) throw new Error('portrait priority rgb/size mismatch');
  const box=normalizedFaceBox(faceBox);
  const mesh=landmarks?.mesh||null;
  const dense=buildDenseLandmarkMaps(size,mesh,box,landmarks);
  const luminance=new Float32Array(size*size),gradient=new Float32Array(size*size),localContrast=new Float32Array(size*size);
  for(let p=0;p<luminance.length;p++)luminance[p]=.2126*rgb[p*3]+.7152*rgb[p*3+1]+.0722*rgb[p*3+2];
  const localMean=gaussianBlurScalar(luminance,size,Math.max(.8,size/92));
  let gradMax=1e-6,contrastMax=1e-6;
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
    const i=y*size+x;
    const a=luminance[(y-1)*size+x-1],b=luminance[(y-1)*size+x],c=luminance[(y-1)*size+x+1];
    const d=luminance[y*size+x-1],f=luminance[y*size+x+1];
    const g=luminance[(y+1)*size+x-1],h=luminance[(y+1)*size+x],j=luminance[(y+1)*size+x+1];
    const gx=-a+c-2*d+2*f-g+j,gy=-a-2*b-c+g+2*h+j,v=Math.hypot(gx,gy);
    gradient[i]=v;if(v>gradMax)gradMax=v;
    const lc=Math.abs(luminance[i]-localMean[i]);localContrast[i]=lc;if(lc>contrastMax)contrastMax=lc;
  }

  const importance=new Float32Array(size*size),avoidance=new Float32Array(size*size);
  const featureMap=new Float32Array(size*size),subjectMap=new Float32Array(size*size),faceMap=new Float32Array(size*size);
  const edgeMap=new Float32Array(size*size),contrastMap=new Float32Array(size*size),structureMap=new Float32Array(size*size);
  const backgroundPenalty=new Float32Array(size*size),hairMap=new Float32Array(size*size),beardMap=new Float32Array(size*size);
  const ovalPoly=dense.hasMesh?LM.oval.map(i=>pointFromMesh(mesh,i)).filter(Boolean):null;
  let weightedSum=0,maskSum=0;

  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=y*size+x,m=mask?mask[p]:1;if(m<=.001)continue;
    const nx=x/(size-1),ny=y/(size-1);
    const ux=(nx-box.x)/box.width,uy=(ny-box.y)/box.height;
    const ex=(ux-.5)/.54,ey=(uy-.5)/.57;
    const ellipse=Math.exp(-1.42*(ex*ex+ey*ey));
    const insideMesh=ovalPoly?polygonContains(nx,ny,ovalPoly):false;
    const face=clamp01(Math.max(ellipse*.92,insideMesh?1:0));faceMap[p]=face*m;
    const edge=clamp01(gradient[p]/gradMax*2.8),contrast=clamp01(localContrast[p]/contrastMax*2.35);
    const dark=Math.pow(clamp01(1-luminance[p]),.84);
    edgeMap[p]=edge*m;contrastMap[p]=contrast*m;

    const hairRegion=gaussianFeature(ux,uy,.5,.10,.39,.18);
    const sideHairRegion=gaussianFeature(ux,uy,.5,.48,.54,.54);
    const beardRegion=gaussianFeature(ux,uy,.5,.79,.29,.16);
    const hairEvidence=(.14+.86*dark)*(.24+.52*edge+.24*contrast);
    hairMap[p]=m*Math.max(hairRegion*.86,sideHairRegion*.64)*hairEvidence;
    beardMap[p]=m*beardRegion*(.12+.88*dark)*(.30+.70*edge);

    const eye=Math.max(dense.eyesMap[p],dense.irisMap[p]);
    const brow=dense.browsMap[p],nose=dense.noseMap[p],mouth=dense.mouthMap[p],jaw=dense.jawMap[p];
    const landmarkSignal=Math.min(2.8,1.60*eye+1.18*brow+1.08*nose+1.45*mouth+.72*jaw);
    const evidence=.30+.72*edge+.62*contrast+.48*dark;
    const features=Math.min(3.0,landmarkSignal*evidence+.52*beardMap[p]+.34*hairMap[p]);
    featureMap[p]=features*m;

    const shoulders=gaussianFeature(ux,uy,.50,1.10,.66,.28);
    const expandedHead=gaussianFeature(ux,uy,.50,.50,.62,.80);
    const silhouetteEvidence=clamp01(.62*dark+.48*edge+.30*contrast);
    const subject=clamp01(Math.max(
      face,
      hairRegion*(.48+.52*silhouetteEvidence),
      sideHairRegion*(.34+.66*silhouetteEvidence),
      beardRegion*(.42+.58*silhouetteEvidence),
      shoulders*(.20+.80*silhouetteEvidence),
      expandedHead*.58*silhouetteEvidence
    ));
    subjectMap[p]=subject*m;
    const structure=Math.min(2.0,1.18*dense.ovalMap[p]+.92*jaw+.96*hairMap[p]+.52*beardMap[p]+.42*shoulders*edge+.30*sideHairRegion*silhouetteEvidence);
    structureMap[p]=structure*m;

    const base=backgroundWeight+faceBoost*face+.28*hairRegion;
    const detail=edgeBoost*edge*(.16+.84*face)+featureBoost*features+darkDetailBoost*dark*(landmarkSignal+.42*beardMap[p])+.60*structure+.32*contrast*face;
    const w=Math.max(.015,(base+detail)*m);importance[p]=w;weightedSum+=w;maskSum+=m;

    const smoothBright=Math.pow(clamp01(luminance[p]),1.75)*(1-.76*edge)*(1-.48*contrast);
    const protectedFace=face*Math.max(0,1-clamp01(features*.52));
    avoidance[p]=Math.max(0,avoidanceBoost*m*protectedFace*smoothBright);
    const dx=(nx-.5)/.5,dy=(ny-.5)/.5,radial=Math.hypot(dx,dy);
    const interior=1-clamp01((radial-.70)/.26);
    backgroundPenalty[p]=m*interior*Math.pow(1-subject,1.55);
  }

  const mean=weightedSum/Math.max(EPS,maskSum);
  if(mean>EPS){
    const inv=1/mean;
    for(let p=0;p<importance.length;p++)importance[p]=Math.min(6,importance[p]*inv);
  }
  return {
    importance,avoidance,featureMap,subjectMap,faceMap,edgeMap,contrastMap,structureMap,backgroundPenalty,
    eyesMap:dense.eyesMap,browsMap:dense.browsMap,noseMap:dense.noseMap,mouthMap:dense.mouthMap,jawMap:dense.jawMap,
    irisMap:dense.irisMap,hairMap,beardMap,featureDirX:dense.featureDirX,featureDirY:dense.featureDirY,
    faceBox:box,landmarksUsed:dense.hasMesh?'dense-mesh':(landmarks?'sparse':'fallback')
  };
}


export function buildPaletteAffinityMap(targetRgb, paletteLinear, importance = null, { temperature = 0.07 } = {}) {
  if (!paletteLinear?.length) throw new Error('palette required for affinity map');
  const colors = paletteLinear.length;
  const dirs = paletteLinear.map((rgb) => {
    const od = rgb.map((v) => -Math.log(Math.max(0.035, Math.min(1, v))));
    const mag = Math.hypot(od[0], od[1], od[2]) || 1;
    return [od[0] / mag, od[1] / mag, od[2] / mag];
  });
  const out = new Float32Array((targetRgb.length / 3) * colors);
  const temp = Math.max(0.02, temperature);
  for (let p = 0; p < targetRgb.length / 3; p++) {
    if (importance && importance[p] <= 0.001) continue;
    const b = p * 3;
    const o0 = -Math.log(Math.max(0.035, targetRgb[b]));
    const o1 = -Math.log(Math.max(0.035, targetRgb[b + 1]));
    const o2 = -Math.log(Math.max(0.035, targetRgb[b + 2]));
    const mag = Math.hypot(o0, o1, o2);
    if (mag < 0.02) continue;
    const t0=o0/mag,t1=o1/mag,t2=o2/mag;
    let best=-Infinity,sum=0;
    const scores=new Float32Array(colors);
    for(let ci=0;ci<colors;ci++){
      const d=dirs[ci],score=Math.max(0,Math.min(1,t0*d[0]+t1*d[1]+t2*d[2]));
      scores[ci]=score;if(score>best)best=score;
    }
    for(let ci=0;ci<colors;ci++){const e=Math.exp((scores[ci]-best)/temp);scores[ci]=e;sum+=e}
    for(let ci=0;ci<colors;ci++)out[p*colors+ci]=scores[ci]/Math.max(1e-9,sum);
  }
  return out;
}

function mixOptical(colors, strengths) {
  const od = [0, 0, 0];
  for (let i = 0; i < colors.length; i++) {
    for (let c = 0; c < 3; c++) od[c] += -Math.log(Math.max(0.035, colors[i][c])) * strengths[i];
  }
  return od.map((v) => Math.exp(-v));
}

export function buildAchievableSwatches(threadColorsLinear, { levels = [0.3, 0.6, 1], includePairs = true } = {}) {
  const swatches = [[1, 1, 1]];
  for (const color of threadColorsLinear) for (const s of levels) swatches.push(mixOptical([color], [s]));
  if (includePairs) {
    for (let i = 0; i < threadColorsLinear.length; i++) for (let j = i + 1; j < threadColorsLinear.length; j++) {
      swatches.push(mixOptical([threadColorsLinear[i], threadColorsLinear[j]], [0.48, 0.48]));
    }
  }
  return swatches;
}

function nearestSwatchError(targetRgb, swatches, mask, sampleStep = 1) {
  let err = 0, n = 0;
  const pixels = targetRgb.length / 3;
  for (let p = 0; p < pixels; p += sampleStep) {
    const w = mask ? mask[p] : 1;
    if (w <= 0.01) continue;
    let best = Infinity;
    for (const s of swatches) {
      const dr = targetRgb[p * 3] - s[0], dg = targetRgb[p * 3 + 1] - s[1], db = targetRgb[p * 3 + 2] - s[2];
      const d = 0.2126 * dr * dr + 0.7152 * dg * dg + 0.0722 * db * db;
      if (d < best) best = d;
    }
    err += w * best; n += w;
  }
  return err / Math.max(EPS, n);
}

export function chooseThreadPalette(targetRgb, {
  candidateHex = DEFAULT_THREAD_CANDIDATES,
  nColors = 4,
  fixedHex = ['#111111'],
  mask = null,
  maxSamples = 12000,
} = {}) {
  const fixedLower = fixedHex.map((x) => x.toLowerCase());
  const fixed = fixedHex.map((h) => ({ hex: h, rgb: hexToLinearRgb(h) }));
  const candidates = candidateHex.filter((h) => !fixedLower.includes(h.toLowerCase()))
    .map((h) => ({ hex: h, rgb: hexToLinearRgb(h) }));
  const selected = [...fixed];
  const pixels = targetRgb.length / 3;
  const sampleStep = Math.max(1, Math.floor(pixels / maxSamples));
  while (selected.length < nColors && candidates.length) {
    let bestIndex = -1, bestError = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const trial = [...selected, candidates[i]].map((x) => x.rgb);
      const swatches = buildAchievableSwatches(trial, { includePairs: true });
      const error = nearestSwatchError(targetRgb, swatches, mask, sampleStep);
      if (error < bestError) { bestError = error; bestIndex = i; }
    }
    selected.push(candidates.splice(bestIndex, 1)[0]);
  }
  const palette = selected.map((x) => x.rgb);
  return {
    hex: selected.map((x) => x.hex),
    linearRgb: palette,
    estimatedError: nearestSwatchError(targetRgb, buildAchievableSwatches(palette), mask, sampleStep),
  };
}


function resizeLinearRgbBilinear(src, srcSize, dstSize) {
  if (srcSize === dstSize) return new Float32Array(src);
  const out = new Float32Array(dstSize * dstSize * 3);
  const scale = srcSize / dstSize;
  for (let y = 0; y < dstSize; y++) for (let x = 0; x < dstSize; x++) {
    const sx = Math.max(0, Math.min(srcSize - 1, (x + 0.5) * scale - 0.5));
    const sy = Math.max(0, Math.min(srcSize - 1, (y + 0.5) * scale - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(srcSize - 1, x0 + 1), y1 = Math.min(srcSize - 1, y0 + 1);
    const fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 3; c++) {
      const a = src[(y0 * srcSize + x0) * 3 + c] * (1 - fx) + src[(y0 * srcSize + x1) * 3 + c] * fx;
      const b = src[(y1 * srcSize + x0) * 3 + c] * (1 - fx) + src[(y1 * srcSize + x1) * 3 + c] * fx;
      out[(y * dstSize + x) * 3 + c] = a * (1 - fy) + b * fy;
    }
  }
  return out;
}

function resizeScalarBilinear(src, srcSize, dstSize) {
  if (!src) return null;
  if (srcSize === dstSize) return new Float32Array(src);
  const out = new Float32Array(dstSize * dstSize);
  const scale = srcSize / dstSize;
  for (let y = 0; y < dstSize; y++) for (let x = 0; x < dstSize; x++) {
    const sx = Math.max(0, Math.min(srcSize - 1, (x + 0.5) * scale - 0.5));
    const sy = Math.max(0, Math.min(srcSize - 1, (y + 0.5) * scale - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(srcSize - 1, x0 + 1), y1 = Math.min(srcSize - 1, y0 + 1);
    const fx = sx - x0, fy = sy - y0;
    const a = src[y0 * srcSize + x0] * (1 - fx) + src[y0 * srcSize + x1] * fx;
    const b = src[y1 * srcSize + x0] * (1 - fx) + src[y1 * srcSize + x1] * fx;
    out[y * dstSize + x] = a * (1 - fy) + b * fy;
  }
  return out;
}

function blurRgb(src, size, sigma = 1.15) {
  const out = new Float32Array(src.length);
  for (let c = 0; c < 3; c++) {
    const channel = new Float32Array(size * size);
    for (let p = 0; p < channel.length; p++) channel[p] = src[p * 3 + c];
    const blurred = gaussianBlurScalar(channel, size, sigma);
    for (let p = 0; p < channel.length; p++) out[p * 3 + c] = blurred[p];
  }
  return out;
}

export function paletteDitherSimulationError(targetRgb, size, paletteLinear, {
  mask = null,
  simulationSize = 64,
  blurSigma = 1.15,
} = {}) {
  const simSize = Math.max(12, Math.min(size, Math.round(simulationSize)));
  const targetSmall = resizeLinearRgbBilinear(targetRgb, size, simSize);
  const maskSmall = resizeScalarBilinear(mask, size, simSize);
  const ditherPalette = [[1, 1, 1], ...paletteLinear];
  const dithered = floydSteinbergDitherLinear(targetSmall, simSize, ditherPalette, maskSmall).rgb;
  const targetBlur = blurRgb(targetSmall, simSize, blurSigma);
  const ditherBlur = blurRgb(dithered, simSize, blurSigma);
  let err = 0, wsum = 0;
  for (let p = 0; p < simSize * simSize; p++) {
    const w = maskSmall ? maskSmall[p] : 1;
    if (w <= .01) continue;
    const dr = targetBlur[p * 3] - ditherBlur[p * 3];
    const dg = targetBlur[p * 3 + 1] - ditherBlur[p * 3 + 1];
    const db = targetBlur[p * 3 + 2] - ditherBlur[p * 3 + 2];
    const dy = .2126 * dr + .7152 * dg + .0722 * db;
    const co = dr - db, cg = dg - .5 * (dr + db);
    err += w * (dy * dy + 1.45 * (.5 * co * co + cg * cg));
    wsum += w;
  }
  return err / Math.max(EPS, wsum);
}

function combinationCount(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let v = 1;
  for (let i = 1; i <= k; i++) v = v * (n - k + i) / i;
  return Math.round(v);
}

function enumerateCombinations(n, k, visit) {
  const pick = new Int16Array(k);
  const walk = (depth, start) => {
    if (depth === k) { visit(Array.from(pick)); return; }
    for (let i = start; i <= n - (k - depth); i++) {
      pick[depth] = i;
      walk(depth + 1, i + 1);
    }
  };
  if (k === 0) visit([]);
  else walk(0, 0);
}

export function chooseThreadPaletteSimulation(targetRgb, size, {
  candidateHex = DEFAULT_THREAD_CANDIDATES,
  nColors = 4,
  fixedHex = ['#111111'],
  mask = null,
  simulationSize = 64,
  blurSigma = 1.15,
  maxCombinations = 2500,
} = {}) {
  if (targetRgb.length !== size * size * 3) throw new Error('targetRgb/size mismatch');
  if (nColors < fixedHex.length) throw new Error('nColors must be >= fixedHex length');
  const fixedLower = new Set(fixedHex.map((x) => x.toLowerCase()));
  const fixed = fixedHex.map((hex) => ({ hex, rgb: hexToLinearRgb(hex) }));
  const candidates = candidateHex.filter((hex) => !fixedLower.has(hex.toLowerCase()))
    .map((hex) => ({ hex, rgb: hexToLinearRgb(hex) }));
  const choose = nColors - fixed.length;
  const combos = combinationCount(candidates.length, choose);
  if (choose < 0 || choose > candidates.length) throw new Error('not enough candidate thread colors');

  if (combos > maxCombinations) {
    const simSize = Math.max(18, Math.min(size, Math.round(simulationSize)));
    const targetSmall = resizeLinearRgbBilinear(targetRgb, size, simSize);
    const maskSmall = resizeScalarBilinear(mask, size, simSize);
    const greedy = chooseThreadPalette(targetSmall, {
      candidateHex, nColors, fixedHex, mask: maskSmall, maxSamples: simSize * simSize,
    });
    const estimatedError = paletteDitherSimulationError(targetRgb, size, greedy.linearRgb, {
      mask, simulationSize: simSize, blurSigma,
    });
    return { ...greedy, estimatedError, method: 'greedy-simulation-fallback', combinations: combos };
  }

  let best = null, bestError = Infinity;
  enumerateCombinations(candidates.length, choose, (ids) => {
    const selected = [...fixed, ...ids.map((i) => candidates[i])];
    const palette = selected.map((x) => x.rgb);
    const error = paletteDitherSimulationError(targetRgb, size, palette, { mask, simulationSize, blurSigma });
    if (error < bestError) { bestError = error; best = selected; }
  });

  return {
    hex: best.map((x) => x.hex),
    linearRgb: best.map((x) => x.rgb),
    estimatedError: bestError,
    method: 'exhaustive-dither-simulation',
    combinations: combos,
  };
}

function nearestPaletteColor(rgb, palette) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dr = rgb[0] - palette[i][0], dg = rgb[1] - palette[i][1], db = rgb[2] - palette[i][2];
    const d = 0.2126 * dr * dr + 0.7152 * dg * dg + 0.0722 * db * db;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function floydSteinbergDitherLinear(targetRgb, size, paletteLinear, mask = null) {
  const work = new Float32Array(targetRgb);
  const out = new Float32Array(targetRgb.length);
  const indexMap = new Uint8Array(size * size);
  const addError = (x, y, er, eg, eb, f) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const p = y * size + x;
    if (mask && mask[p] <= 0.01) return;
    work[p * 3] = clamp01(work[p * 3] + er * f);
    work[p * 3 + 1] = clamp01(work[p * 3 + 1] + eg * f);
    work[p * 3 + 2] = clamp01(work[p * 3 + 2] + eb * f);
  };
  for (let y = 0; y < size; y++) {
    const reverse = y % 2 === 1;
    for (let ii = 0; ii < size; ii++) {
      const x = reverse ? size - 1 - ii : ii;
      const p = y * size + x;
      if (mask && mask[p] <= 0.01) { out[p * 3] = out[p * 3 + 1] = out[p * 3 + 2] = 1; continue; }
      const rgb = [work[p * 3], work[p * 3 + 1], work[p * 3 + 2]];
      const pi = nearestPaletteColor(rgb, paletteLinear);
      const q = paletteLinear[pi]; indexMap[p] = pi;
      out[p * 3] = q[0]; out[p * 3 + 1] = q[1]; out[p * 3 + 2] = q[2];
      const er = rgb[0] - q[0], eg = rgb[1] - q[1], eb = rgb[2] - q[2];
      const dir = reverse ? -1 : 1;
      addError(x + dir, y, er, eg, eb, 7 / 16);
      addError(x - dir, y + 1, er, eg, eb, 3 / 16);
      addError(x, y + 1, er, eg, eb, 5 / 16);
      addError(x + dir, y + 1, er, eg, eb, 1 / 16);
    }
  }
  return { rgb: out, indexMap };
}
