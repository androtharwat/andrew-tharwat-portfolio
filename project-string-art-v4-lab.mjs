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
  let detectedFaces = [];
  let selectedFaceIndex = 0;
  let faceDetector = null;
  let mediaPipeFaceLandmarker = null;
  let mediaPipeLoading = null;
  const tuning = { likeness:84, detail:78, color:56 };
  let faceDetectToken = 0;
  let faceDetectTimer = 0;

  const AR = () => document.documentElement.lang === 'ar';
  const setStatus = (msg, pct=0) => {
    const s=$('#sa-lab-status'), p=$('#sa-lab-progress');
    if(s) s.textContent=msg;
    if(p) p.textContent=Math.max(0,Math.min(100,Math.round(pct)))+'%';
  };

  const tr = (ar, en) => AR() ? ar : en;
  const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));

  const FIXED_PROFILE = Object.freeze({
    key:'portrait',
    size:176,
    nails:320,
    colorFibers:6200,
    candidates:84,
    palette:5,
    detail:.84,
    crossingColor:.15,
    opacityColor:.35,
    repeatColor:2,
    refreshEvery:0,
    removalEvery:0,
    removalLimit:0
  });
  const profile = () => FIXED_PROFILE;
  const mode = () => 'color';

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

    const head=$('.sa-lab-head h2');
    if(head) head.textContent=tr('ارفع صورتك. اضبط الكادر. ولّد البورتريه.','UPLOAD. FRAME. GENERATE.');
    const intro=$('.sa-lab-head>p');
    if(intro) intro.textContent=tr('ATS يختار الألوان وكثافة الخيوط تلقائيًا لإكمال ملامح الوجه بأفضل شكل.','ATS automatically handles color, thread density and portrait detail.');
    const generate=$('#sa-generate');
    if(generate) generate.textContent=tr('توليد البورتريه','GENERATE PORTRAIT');

    const modeGroup=$('[data-sa-mode]')?.closest('.sa-control-group');
    const qualityGroup=$('[data-sa-quality]')?.closest('.sa-control-group');
    const colorPanel=$('#sa-v4-color-panel');
    const tuneRow=$('.sa-tune-row');
    [modeGroup,qualityGroup,colorPanel,tuneRow].forEach(el=>el?.classList.add('sa-v4-client-hidden'));

    const summary=$('.sa-v4-auto-summary');
    summary?.remove();

    const note=$('.sa-production-note');
    if(note) note.innerHTML=tr('ألوان تلقائية · خيوط عالية الكثافة · أولوية كاملة للملامح<br><b>© ATS</b>','AUTO COLOR · HIGH-DENSITY THREADS · PORTRAIT-FIRST<br><b>© ATS</b>');

    const hint=$('.sa-source-figure figcaption small');
    if(hint) hint.textContent=tr('اسحب الصورة · استخدم الزوم لضبط الوجه داخل الدائرة','DRAG · ZOOM · KEEP THE FACE INSIDE THE CIRCLE');

    const tools=$('#sa-result-tools');
    const meta=$('#sa-v4-result-meta');
    const palette=$('#sa-palette-preview');
    const sequence=$('.sa-sequence-preview');
    meta?.classList.add('sa-v4-client-hidden');
    palette?.classList.add('sa-v4-client-hidden');
    sequence?.classList.add('sa-v4-client-hidden');

    $('#sa-user-replay')?.classList.add('sa-v4-client-hidden');
    $('#sa-user-speak')?.classList.add('sa-v4-client-hidden');

    const save=$('#sa-user-download');
    const video=$('#sa-user-video');
    const share=$('#sa-user-share');
    if(save) save.textContent=tr('حفظ صورة ↓','SAVE IMAGE ↓');
    if(share) share.textContent=tr('مشاركة صورة ↗','SHARE IMAGE ↗');
    if(video) {
      video.classList.remove('sa-v4-hidden-action');
      video.textContent=tr('مشاركة فيديو ●','SHARE VIDEO ●');
    }
    tools?.classList.add('sa-v4-share-tools');

    const framing=$('.sa-framing-controls');
    if(framing&&!$('#sa-realism-controls')){
      const tune=document.createElement('div');
      tune.id='sa-realism-controls';tune.className='sa-realism-controls';
      tune.innerHTML=
        '<span class="sa-realism-title">'+tr('تحكم واقعي في النتيجة','PORTRAIT TUNING')+'</span>'+
        '<label><span>'+tr('الشبه','LIKENESS')+' <b id="sa-likeness-value">'+tuning.likeness+'%</b></span><input id="sa-likeness" type="range" min="35" max="100" step="1" value="'+tuning.likeness+'"></label>'+
        '<label><span>'+tr('التفاصيل','DETAIL')+' <b id="sa-detail-value">'+tuning.detail+'%</b></span><input id="sa-detail" type="range" min="30" max="100" step="1" value="'+tuning.detail+'"></label>'+
        '<label><span>'+tr('قوة اللون','COLOR')+' <b id="sa-color-value">'+tuning.color+'%</b></span><input id="sa-color-strength" type="range" min="20" max="100" step="1" value="'+tuning.color+'"></label>'+
        '<small>'+tr('ارفع الشبه لتوجيه خيوط أكثر للعينين والأنف والفم. التفاصيل تزيد دقة الحل، واللون يتحكم في قوة طبقات الألوان.','Likeness spends more thread on eyes, nose and mouth. Detail increases solve precision. Color controls optical color layering.')+'</small>';
      framing.insertAdjacentElement('afterend',tune);
      const bind=(id,key,out)=>{
        const input=$(id),value=$(out);
        input?.addEventListener('input',()=>{
          tuning[key]=Number(input.value);if(value)value.textContent=tuning[key]+'%';
          if(lastRender&&generate)generate.textContent=tr('إعادة تحسين البورتريه','REFINE PORTRAIT');
        });
      };
      bind('#sa-likeness','likeness','#sa-likeness-value');
      bind('#sa-detail','detail','#sa-detail-value');
      bind('#sa-color-strength','color','#sa-color-value');
    }
  }

  function removeFaceTargets(){
    $('#sa-face-targets')?.remove();
  }

  function renderFaceTargets(){
    removeFaceTargets();
    const src=$('#sa-user-source'),wrap=src?.parentElement;
    if(!src||!wrap||detectedFaces.length<2)return;
    if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';
    const layer=document.createElement('div');
    layer.id='sa-face-targets';
    Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'6'});
    detectedFaces.forEach((face,index)=>{
      const b=face.box,button=document.createElement('button');
      button.type='button';button.dataset.faceIndex=String(index);
      button.setAttribute('aria-label',tr('اختيار الوجه '+(index+1),'Select face '+(index+1)));
      Object.assign(button.style,{
        position:'absolute',left:(b.x*100)+'%',top:(b.y*100)+'%',width:(b.width*100)+'%',height:(b.height*100)+'%',
        border:index===selectedFaceIndex?'3px solid #d7ad59':'2px solid rgba(255,255,255,.78)',borderRadius:'12px',
        background:index===selectedFaceIndex?'rgba(215,173,89,.08)':'rgba(0,0,0,.02)',boxShadow:'0 0 0 1px rgba(0,0,0,.28)',
        cursor:'pointer',pointerEvents:'auto',padding:'0',margin:'0'
      });
      const badge=document.createElement('span');
      badge.textContent=String(index+1);
      Object.assign(badge.style,{position:'absolute',left:'6px',top:'6px',minWidth:'22px',height:'22px',lineHeight:'22px',borderRadius:'999px',background:'#071923',color:'#f4d895',font:'800 11px Montserrat,Arial'});
      button.appendChild(badge);
      button.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();selectedFaceIndex=index;renderFaceTargets();
        setStatus(tr('تم اختيار الوجه · اضغط توليد البورتريه','FACE SELECTED · GENERATE PORTRAIT'),0);
      });
      layer.appendChild(button);
    });
    wrap.appendChild(layer);
  }

  function averageLocation(locations=[]){
    if(!locations?.length)return null;
    let x=0,y=0,n=0;
    for(const p of locations){if(Number.isFinite(p?.x)&&Number.isFinite(p?.y)){x+=p.x;y+=p.y;n++}}
    return n?{x:x/n,y:y/n}:null;
  }

  function serializeDetectedFace(face,src){
    const b=face?.boundingBox;
    if(!b||b.width<8||b.height<8)return null;
    const box={x:clamp(b.x/src.width),y:clamp(b.y/src.height),width:clamp(b.width/src.width,.04,1),height:clamp(b.height/src.height,.04,1)};
    const raw=[];
    for(const lm of face.landmarks||[]){
      const point=averageLocation(lm.locations||[]);if(!point)continue;
      raw.push({type:String(lm.type||'').toLowerCase(),x:clamp(point.x/src.width),y:clamp(point.y/src.height)});
    }
    const eyes=raw.filter(x=>x.type.includes('eye')).sort((a,b)=>a.x-b.x);
    const mouth=raw.find(x=>x.type.includes('mouth'))||null;
    const nose=raw.find(x=>x.type.includes('nose'))||null;
    const landmarks={};
    if(eyes[0])landmarks.leftEye={x:eyes[0].x,y:eyes[0].y};
    if(eyes[1])landmarks.rightEye={x:eyes[eyes.length-1].x,y:eyes[eyes.length-1].y};
    if(mouth)landmarks.mouth={x:mouth.x,y:mouth.y};
    if(nose)landmarks.nose={x:nose.x,y:nose.y};
    const cx=box.x+box.width/2,cy=box.y+box.height/2,dist=Math.hypot(cx-.5,cy-.5);
    return {box,landmarks,score:box.width*box.height*(1-.48*Math.min(1,dist))};
  }

  async function getPortableFaceLandmarker(){
    if(mediaPipeFaceLandmarker)return mediaPipeFaceLandmarker;
    if(mediaPipeLoading)return mediaPipeLoading;
    mediaPipeLoading=(async()=>{
      const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm');
      const fileset=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
      mediaPipeFaceLandmarker=await vision.FaceLandmarker.createFromOptions(fileset,{
        baseOptions:{
          modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        },
        runningMode:'IMAGE',
        numFaces:8,
        minFaceDetectionConfidence:.35,
        minFacePresenceConfidence:.35,
        outputFaceBlendshapes:false,
        outputFacialTransformationMatrixes:false
      });
      return mediaPipeFaceLandmarker;
    })().catch(error=>{mediaPipeLoading=null;throw error});
    return mediaPipeLoading;
  }

  function meshAverage(mesh,ids){
    let x=0,y=0,n=0;
    for(const id of ids){const p=mesh?.[id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){x+=p.x;y+=p.y;n++}}
    return n?{x:x/n,y:y/n}:null;
  }

  function serializeLandmarkerFace(mesh){
    if(!Array.isArray(mesh)||mesh.length<400)return null;
    let minX=1,minY=1,maxX=0,maxY=0;
    const clean=mesh.map(p=>{
      const q={x:clamp(Number(p.x||0)),y:clamp(Number(p.y||0)),z:Number(p.z||0)};
      minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);
      return q;
    });
    const padX=(maxX-minX)*.05,padY=(maxY-minY)*.05;
    const box={x:clamp(minX-padX),y:clamp(minY-padY),width:clamp(maxX-minX+padX*2,.04,1),height:clamp(maxY-minY+padY*2,.04,1)};
    const landmarks={
      mesh:clean,
      leftEye:meshAverage(clean,[33,133,159,145]),
      rightEye:meshAverage(clean,[263,362,386,374]),
      nose:meshAverage(clean,[1,4,5]),
      mouth:meshAverage(clean,[13,14,61,291])
    };
    const cx=box.x+box.width/2,cy=box.y+box.height/2,dist=Math.hypot(cx-.5,cy-.5);
    return {box,landmarks,score:box.width*box.height*(1-.48*Math.min(1,dist)),source:'face-landmarker'};
  }

  async function runFaceDetection(src){
    try{
      const landmarker=await getPortableFaceLandmarker();
      const result=landmarker.detect(src);
      const dense=(result?.faceLandmarks||[]).map(mesh=>serializeLandmarkerFace(mesh)).filter(Boolean);
      if(dense.length)return dense;
    }catch(error){
      console.warn('[ATS V4 FACE LANDMARKER]',error);
    }
    if(typeof window.FaceDetector==='function'){
      try{
        faceDetector ||= new window.FaceDetector({fastMode:true,maxDetectedFaces:8});
        const nativeFaces=await faceDetector.detect(src);
        if(nativeFaces?.length)return nativeFaces.map(f=>serializeDetectedFace(f,src)).filter(Boolean);
      }catch(error){
        console.warn('[ATS V4 NATIVE FACE DETECT]',error);
      }
    }
    return [];
  }

  async function detectPortraitFaces({render=true}={}){
    const src=$('#sa-user-source');
    if(!src){detectedFaces=[];selectedFaceIndex=0;removeFaceTargets();return detectedFaces}
    const token=++faceDetectToken;
    try{
      const faces=await runFaceDetection(src);
      if(token!==faceDetectToken)return detectedFaces;
      detectedFaces=(faces||[]).sort((a,b)=>b.score-a.score);
      selectedFaceIndex=Math.min(selectedFaceIndex,Math.max(0,detectedFaces.length-1));
      if(render)renderFaceTargets();
      if(render&&detectedFaces.length>1)setStatus(tr('تم العثور على أكثر من وجه · اضغط على الوجه المطلوب','MULTIPLE FACES FOUND · TAP THE PORTRAIT YOU WANT'),0);
      return detectedFaces;
    }catch(error){
      console.warn('[ATS V4 FACE DETECT]',error);detectedFaces=[];selectedFaceIndex=0;removeFaceTargets();return detectedFaces;
    }
  }

  function scheduleFaceDetection(delay=220){
    clearTimeout(faceDetectTimer);
    faceDetectTimer=setTimeout(()=>detectPortraitFaces({render:true}),delay);
  }

  function transformPointToCrop(point,cropX,cropY,side,src){
    if(!point)return null;
    return {x:(point.x*src.width-cropX)/side,y:(point.y*src.height-cropY)/side};
  }

  function capturePortraitTarget(size,face){
    const src=$('#sa-user-source');
    if(!src)throw new Error('Source canvas unavailable');
    const c=document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
    let cropX=0,cropY=0,side=Math.max(src.width,src.height),faceBox=null,landmarks=null;
    if(face?.box){
      const b=face.box,bx=b.x*src.width,by=b.y*src.height,bw=b.width*src.width,bh=b.height*src.height;
      side=Math.max(bw*2.18,bh*2.42);
      side=Math.min(Math.max(src.width,src.height)*1.16,Math.max(side,src.width*.38));
      const centerX=bx+bw*.5,centerY=by+bh*.61;
      cropX=centerX-side*.5;cropY=centerY-side*.5;
      faceBox={x:(bx-cropX)/side,y:(by-cropY)/side,width:bw/side,height:bh/side};
      landmarks={};
      if(Array.isArray(face.landmarks?.mesh)){
        landmarks.mesh=face.landmarks.mesh.map(point=>transformPointToCrop(point,cropX,cropY,side,src));
      }
      for(const [key,point] of Object.entries(face.landmarks||{})){
        if(key==='mesh'||Array.isArray(point))continue;
        const mapped=transformPointToCrop(point,cropX,cropY,side,src);
        if(mapped)landmarks[key]=mapped;
      }
    }
    const scale=size/side;
    ctx.save();ctx.filter='contrast(1.10) saturate(1.015)';
    ctx.translate(-cropX*scale,-cropY*scale);ctx.scale(scale,scale);ctx.drawImage(src,0,0);ctx.restore();ctx.filter='none';
    return {rgba:ctx.getImageData(0,0,size,size).data,faceBox,landmarks,crop:{x:cropX,y:cropY,side}};
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
    return autoPaletteSize(rgba)||p.palette;
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
    return {pins,lines,size,renderedRgb:result.renderedRgb||null,meta:{mode:result.mode,pins:p.nails,lines:lines.length,palette,perColor,colorsUsed,selectedColors:palette.length,mse:result.metrics?.mse||0,engine:'ATS-dense-landmark-contour'}};
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
    const alpha=data.meta.mode==='color-global'?(exactColor?.045:.078):.10;
    const lineWidth=data.meta.mode==='color-global'?.50:.54;
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
    worker=new Worker(new URL('./string-art-v4/worker.mjs?v=3',import.meta.url),{type:'module'});
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
    try{
      getWorker();
      setStatus(tr('المحرك جاهز · ارفع الصورة واضبط الكادر','ENGINE READY · UPLOAD AND FRAME YOUR PHOTO'),0);
    }catch(error){
      console.error('[ATS V4 WARMUP]',error);
    }
  }

  function progressText(msg){
    const phase=msg.phase||'';
    if(phase==='matrix') return tr('بناء نموذج الخيط الفيزيائي…','BUILDING PHYSICAL THREAD MATRIX…');
    if(phase==='palette') return tr('محاكاة واختيار ألوان الخيط…','SIMULATING THREAD PALETTE…');
    if(phase==='preprocess') return tr('تحليل الوجه والملامح…','ANALYZING PORTRAIT FEATURES…');
    if(phase==='portrait-stage'){
      if(msg.stage==='structure')return tr('بناء شكل الرأس والشعر والفك…','BUILDING HEAD · HAIR · JAW…');
      if(msg.stage==='eyes')return tr('بناء العينين والحواجب بدقة…','BUILDING EYES + BROWS…');
      if(msg.stage==='lower')return tr('بناء الأنف والفم والفك…','BUILDING NOSE + MOUTH + JAW…');
      if(msg.stage==='color')return tr('إضافة طبقات اللون…','LAYERING PORTRAIT COLOR…');
      return tr('تحسين الملامح المتبقية…','REFINING FACIAL DETAIL…');
    }
    if(phase==='fast-layer') return tr('توليد طبقات الخيط والملامح…','GENERATING THREAD + PORTRAIT LAYERS…');
    if(phase==='solve-color-fast') return tr('بناء ملامح الوجه وتوزيع الخيوط…','BUILDING PORTRAIT THREAD GEOMETRY…');
    if(phase.includes('color')) return tr('تحسين الخط واللون والملامح…','OPTIMIZING COLOR + PORTRAIT DETAIL…');
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
      const p=profile(),m='color';
      await detectPortraitFaces({render:true});
      const face=detectedFaces[selectedFaceIndex]||null;
      if(!face)setStatus(tr('لم يتم التعرف على وجه بوضوح — اضبط الكادر بحيث يكون الوجه واضحًا','NO CLEAR FACE FOUND — FRAME ONE FACE CLEARLY'),10);
      const target=capturePortraitTarget(p.size,face);
      const rgba=target.rgba,nColors=requestedPaletteSize(rgba,p);
      const likeness=clamp(tuning.likeness/100),detail=clamp(tuning.detail/100),colorStrength=clamp(tuning.color/100);
      const maxFibers=Math.round(4300+detail*3000);
      const candidateLimit=Math.round(70+detail*46);
      const timeBudgetMs=Math.round(5200+detail*4200);
      setStatus(tr('قراءة هندسة الوجه والملامح…','READING FACIAL GEOMETRY + CONTOURS…'),16);
      const response=await sendWorker({
        type:'solve-image-v4',
        table:{size:p.size,nails:p.nails,minGap:9},
        rgba,mode:m,
        preprocess:{
          gamma:.90,detail:p.detail,detailRadius:p.size/32,toneFloor:0,toneCeiling:.988,ditherBlend:.10,colorAffinityTemperature:.060,
          portraitPriority:true,faceBox:target.faceBox,landmarks:target.landmarks,
          backgroundWeight:.018,faceBoost:2.05,edgeBoost:2.55,featureBoost:3.8+likeness*2.0,
          darkDetailBoost:1.10,avoidanceBoost:1.95,backgroundSuppress:.92
        },
        palette:{
          nColors,
          fixedHex:['#111111'],
          candidateHex:['#111111','#2a1712','#4b2b20','#70452f','#9a5e42','#bd7956','#d99a72','#e8b694','#f0cfb4','#c77b77','#d95f73','#e47b2c','#d92d35','#2358a6','#283a63','#2f6f73','#7a7a7a'],
          simulationSize:36,maxCombinations:180
        },
        solve:{
          maxFibers,timeBudgetMs,candidateLimit,maxRepeat:p.repeatColor,
          likeness,detail,colorStrength
        },
        useDither:true
      },[rgba.buffer],msg=>{
        const total=msg.total||1,done=msg.done||0,phase=msg.phase||'';
        const pct=phase==='palette'?28:phase==='preprocess'?22:Math.min(97,31+done/total*66);
        setStatus(progressText(msg),pct);
      });
      const result=response.result;
      lastResult=result;lastRender=extractLines(result,p,p.size);
      lastRender.meta.engine='ATS-dense-landmark-contour';
      lastRender.meta.featureCompletions=result.metrics?.featureCompletions||null;
      window.__saV4LastResult=result;window.__saV4LastRender=lastRender;
      paint(lastRender,lastRender.lines.length);renderMeta(lastRender);
      const palette=lastRender.meta.palette.filter((_,i)=>Number(lastRender.meta.perColor[i]||0)>0).join(' · ');
      $('#sa-user-sequence').textContent='PALETTE '+palette;
      $('#sa-result-tools')?.classList.remove('hidden');
      btn.textContent=tr('إعادة تحسين البورتريه','REFINE PORTRAIT');
      setStatus(tr('اكتمل · عدّل الشبه أو التفاصيل ثم أعد التحسين إذا أردت','COMPLETE · TUNE LIKENESS OR DETAIL AND REFINE IF NEEDED'),100);
    }catch(error){
      console.error('[ATS V4 GENERATE]',error);
      setStatus(tr('تعذر التوليد: ','GENERATION FAILED: ')+(error?.message||String(error)),100);
    }finally{btn.disabled=false}
  }
  function drawShareFrame(canvas,data,count=data.lines.length,{size=1440,footer=150}={}){
    canvas.width=size;canvas.height=size+footer;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#071923';ctx.fillRect(0,0,size,size+footer);

    const radius=size*.486;
    ctx.save();
    ctx.beginPath();ctx.arc(size/2,size/2,radius,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#f4f0e8';ctx.fillRect(0,0,size,size);

    const exact=count>=data.lines.length&&Boolean(data.renderedRgb);
    if(exact){
      const raster=solverRaster(data);
      if(raster){ctx.save();ctx.globalAlpha=.94;ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,0,0,size,size);ctx.restore()}
    }

    const scale=size/data.size;
    ctx.save();ctx.scale(scale,scale);ctx.globalCompositeOperation='multiply';ctx.lineCap='round';
    const alpha=exact?.046:.082;
    for(let i=0;i<Math.min(count,data.lines.length);i++){
      const l=data.lines[i],p0=data.pins[l.a],p1=data.pins[l.b];
      ctx.strokeStyle=hexWithAlpha(l.color,alpha);ctx.lineWidth=.46;
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#9a6a16';
    for(const p of data.pins){ctx.beginPath();ctx.arc(p[0],p[1],.64,0,Math.PI*2);ctx.fill()}
    ctx.restore();ctx.restore();

    ctx.strokeStyle='#d7ad59';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(size/2,size/2,radius,0,Math.PI*2);ctx.stroke();

    const grad=ctx.createLinearGradient(0,size,0,size+footer);
    grad.addColorStop(0,'#071923');grad.addColorStop(1,'#031018');
    ctx.fillStyle=grad;ctx.fillRect(0,size,size,footer);
    ctx.fillStyle='#d7ad59';ctx.font='900 54px Montserrat,Arial';ctx.textAlign='left';
    ctx.fillText('ATS',54,size+88);
    ctx.fillStyle='#e7edf0';ctx.font='800 18px Montserrat,Arial';
    ctx.fillText('STRING ART · PORTRAIT ENGINE',190,size+68);
    ctx.fillStyle='#7896a5';ctx.font='700 14px Montserrat,Arial';
    ctx.fillText('PORTRAIT GENERATED BY ANDREW THARWAT STUDIO',190,size+98);
    ctx.textAlign='right';ctx.fillText('© ATS 2026',size-54,size+86);ctx.textAlign='left';
  }

  async function imageBlob(){
    if(!lastRender)return null;
    const canvas=document.createElement('canvas');
    drawShareFrame(canvas,lastRender,lastRender.lines.length,{size:1800,footer:170});
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  }

  function downloadBlob(blob,name){
    if(!blob)return;
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1800);
  }

  function bestVideoMime(){
    if(typeof MediaRecorder==='undefined')return '';
    const types=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    return types.find(t=>MediaRecorder.isTypeSupported?.(t))||'';
  }

  async function videoBlob(){
    if(!lastRender) return null;
    if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream) throw new Error('Video export is not supported in this browser');

    const canvas=document.createElement('canvas');
    const size=1080,footer=120;
    drawShareFrame(canvas,lastRender,0,{size,footer});
    const stream=canvas.captureStream(30);
    const mime=bestVideoMime();
    const options={videoBitsPerSecond:7000000};
    if(mime)options.mimeType=mime;
    const recorder=new MediaRecorder(stream,options),chunks=[];
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    const stopped=new Promise((resolve,reject)=>{
      recorder.onstop=resolve;
      recorder.onerror=e=>reject(e.error||new Error('Video recorder failed'));
    });

    recorder.start(250);
    const duration=4800,hold=700,start=performance.now();
    await new Promise(resolve=>{
      const tick=now=>{
        const elapsed=now-start;
        const t=Math.min(1,elapsed/duration);
        const reveal=Math.min(1,t/0.84);
        const eased=1-Math.pow(1-reveal,3);
        const count=Math.floor(lastRender.lines.length*eased);
        drawShareFrame(canvas,lastRender,count,{size,footer});
        if(elapsed<duration+hold)requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    drawShareFrame(canvas,lastRender,lastRender.lines.length,{size,footer});
    recorder.stop();
    await stopped;
    stream.getTracks().forEach(t=>t.stop());
    const type=recorder.mimeType||mime||'video/webm';
    return new Blob(chunks,{type});
  }

  async function shareFile(blob,baseName,title){
    if(!blob)return;
    const ext=blob.type.includes('mp4')?'mp4':blob.type.includes('video')?'webm':'png';
    const file=new File([blob],baseName+'.'+ext,{type:blob.type});
    if(navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title});
      return;
    }
    downloadBlob(blob,file.name);
  }

  async function savePng(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const blob=await imageBlob();
    downloadBlob(blob,'ATS-string-art-portrait.png');
  }

  async function sharePng(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const blob=await imageBlob();
    await shareFile(blob,'ATS-string-art-portrait','ATS String Art Portrait');
  }

  async function shareVideo(ev){
    if(!lastRender)return;
    ev?.preventDefault();ev?.stopImmediatePropagation();
    const btn=$('#sa-user-video');
    if(btn)btn.disabled=true;
    try{
      setStatus(tr('جاري تجهيز فيديو المشاركة…','CREATING SHARE VIDEO…'),100);
      const blob=await videoBlob();
      await shareFile(blob,'ATS-string-art-portrait','ATS String Art Portrait');
      setStatus(tr('الفيديو جاهز للمشاركة','VIDEO READY TO SHARE'),100);
    }catch(error){
      console.error('[ATS V4 VIDEO]',error);
      setStatus(tr('تعذر إنشاء الفيديو على هذا المتصفح','VIDEO EXPORT IS NOT SUPPORTED ON THIS BROWSER'),100);
    }finally{
      if(btn)btn.disabled=false;
    }
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
    bindOnce($('#sa-user-video'),'v4Bound','click',shareVideo);
    bindOnce($('#sa-user-file'),'v4WarmBound','change',()=>{schedulePrewarm();detectedFaces=[];selectedFaceIndex=0;removeFaceTargets();scheduleFaceDetection(320);setTimeout(()=>scheduleFaceDetection(40),900)});
    bindOnce($('#sa-user-source'),'v4FacePointerBound','pointerup',()=>scheduleFaceDetection(260));
    bindOnce($('#sa-zoom'),'v4FaceZoomBound','input',()=>scheduleFaceDetection(260));
    for(const id of ['#sa-fit','#sa-center','#sa-rotate'])bindOnce($(id),'v4FaceFrameBound','click',()=>scheduleFaceDetection(260));
    $('#sa-user-speak')?.classList.add('sa-v4-hidden-action');
    window.__ATS_STRING_ART_V4_GENERATE=generateV4;
    document.documentElement.dataset.saEngine='v4';
    setStatus(tr('ارفع صورة واحدة · سنضبط الباقي تلقائيًا','UPLOAD ONE PHOTO · ATS HANDLES THE REST'),0);
    schedulePrewarm();
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
