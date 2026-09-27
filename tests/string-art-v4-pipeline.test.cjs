const test = require('node:test');
const assert = require('node:assert/strict');

let core, pre, path;
test.before(async () => {
  [core, pre, path] = await Promise.all([
    import('../string-art-v4/core.mjs'),
    import('../string-art-v4/preprocess.mjs'),
    import('../string-art-v4/path.mjs'),
  ]);
});

test('sRGB preprocessing produces bounded linear RGB and mono target', () => {
  const rgba = Uint8ClampedArray.from([255, 0, 0, 255, 0, 0, 255, 128, 255, 255, 255, 255, 0, 0, 0, 0]);
  const rgb = pre.rgbaToLinearRgb(rgba);
  assert.equal(rgb.length, 12);
  assert.ok(rgb.every((v) => v >= 0 && v <= 1));
  const mono = pre.linearRgbToMonoDarkness(rgb);
  assert.equal(mono.length, 4);
  assert.ok(mono.every((v) => v >= 0 && v <= 1));
});

test('physical palette selection chooses multiple useful thread colors', () => {
  const size = 16, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  const left = pre.hexToLinearRgb('#2358a6'), right = pre.hexToLinearRgb('#d92d35');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x, c = x < size / 2 ? left : right;
    rgb[p * 3] = c[0]; rgb[p * 3 + 1] = c[1]; rgb[p * 3 + 2] = c[2];
  }
  const picked = pre.chooseThreadPalette(rgb, { candidateHex: ['#111111', '#2358a6', '#d92d35', '#f2c84b'], fixedHex: ['#111111'], nColors: 3, mask });
  assert.equal(picked.hex.length, 3);
  assert.ok(picked.hex.includes('#2358a6') || picked.hex.includes('#d92d35'));
});

test('Floyd-Steinberg dithering stays inside the selected palette', () => {
  const size = 10, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  for (let p = 0; p < size * size; p++) { rgb[p * 3] = 0.55; rgb[p * 3 + 1] = 0.4; rgb[p * 3 + 2] = 0.3; }
  const palette = [pre.hexToLinearRgb('#111111'), pre.hexToLinearRgb('#f2c84b'), pre.hexToLinearRgb('#d92d35')];
  const d = pre.floydSteinbergDitherLinear(rgb, size, palette, mask);
  assert.equal(d.indexMap.length, size * size);
  assert.ok(d.indexMap.every((v) => v < palette.length));
});

test('global edge solution can be covered and stitched into executable nail routes', () => {
  const table = { a: Uint16Array.from([0, 1, 2, 5]), b: Uint16Array.from([1, 2, 0, 6]) };
  const counts = Uint8Array.from([1, 1, 1, 1]);
  const edges = path.expandCountsToEdges(table, counts);
  const trails = path.coverEulerTrails(edges, 8);
  const usedSegments = trails.reduce((s, t) => s + t.length - 1, 0);
  assert.equal(usedSegments, edges.length);
  const stitched = path.stitchTrailsAlongPerimeter(trails, 8);
  assert.ok(stitched.sequence.length >= edges.length + 1);
  assert.ok(stitched.connectors.length >= 0);
});


test('exhaustive dither-simulation palette search captures complementary portrait colors', () => {
  const size = 24, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  const blue = pre.hexToLinearRgb('#2358a6'), red = pre.hexToLinearRgb('#d92d35'), skin = pre.hexToLinearRgb('#e47b2c');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x;
    const c = y < size / 3 ? blue : (x < size / 2 ? red : skin);
    rgb[p * 3] = c[0]; rgb[p * 3 + 1] = c[1]; rgb[p * 3 + 2] = c[2];
  }
  const candidateHex = ['#111111','#2358a6','#d92d35','#e47b2c','#f2c84b','#2f7d4b'];
  const picked = pre.chooseThreadPaletteSimulation(rgb, size, {
    candidateHex, fixedHex:['#111111'], nColors:4, mask, simulationSize:24
  });
  assert.equal(picked.method, 'exhaustive-dither-simulation');
  assert.equal(picked.hex.length, 4);
  assert.ok(picked.hex.includes('#2358a6'));
  assert.ok(picked.hex.includes('#d92d35') || picked.hex.includes('#e47b2c'));
  assert.ok(picked.estimatedError >= 0);
});


test('V4 end-to-end color pipeline picks a palette, solves globally, and returns executable routes', async () => {
  const pipeline = await import('../string-art-v4/pipeline.mjs');
  const size = 22;
  const table = core.buildPackedLineTable({ size, nails: 22, minGap: 2, fiberWidthMm: 2.6, density: 2 });
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x, i = p * 4;
    rgba[i] = x < size / 2 ? 42 : 220;
    rgba[i + 1] = y < size / 2 ? 95 : 150;
    rgba[i + 2] = x < size / 2 ? 190 : 55;
    rgba[i + 3] = 255;
  }
  const result = pipeline.solveImageV4({
    table, rgba, mode:'color',
    palette:{ candidateHex:['#111111','#2358a6','#d92d35','#e47b2c','#f2c84b','#29a8c7'], nColors:4, simulationSize:22 },
    solve:{ maxFibers:140, opacity:.55, candidateLimit:0 },
  });
  assert.equal(result.mode, 'color-global');
  assert.equal(result.palette.linearRgb.length, 4);
  assert.ok(result.metrics.fibers > 10);
  assert.ok(result.metrics.colorsUsed >= 2);
  assert.equal(result.routes.reduce((s,r)=>s+r.selectedFibers,0), result.metrics.fibers);
});


test('portrait priority map boosts facial feature zones and protects bright face regions', () => {
  const size = 40, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  rgb.fill(0.88);
  const maps = pre.buildPortraitPriorityMaps(rgb, size, { mask });
  const eye = Math.round(size * 0.08 + size * 0.80 * 0.39) * size + Math.round(size * 0.20 + size * 0.60 * 0.35);
  const edge = Math.round(size * 0.50) * size + 2;
  assert.ok(maps.importance[eye] > maps.importance[edge], 'facial feature zone should receive more solver weight');
  assert.ok(maps.avoidance[eye] > 0, 'bright facial detail should receive crossing protection');
});

test('palette simulation treats white as a no-thread state', () => {
  const size = 14, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  rgb.fill(1);
  const black = [pre.hexToLinearRgb('#111111')];
  const error = pre.paletteDitherSimulationError(rgb, size, black, { mask, simulationSize:size, blurSigma:.8 });
  assert.ok(error < 0.01, 'white image should remain achievable without forcing dark thread: ' + error);
});


test('optical color affinity separates portrait color layers', () => {
  const target = Float32Array.from(pre.hexToLinearRgb('#d99a72'));
  const palette = [
    pre.hexToLinearRgb('#111111'),
    pre.hexToLinearRgb('#d99a72'),
    pre.hexToLinearRgb('#d95f73'),
  ];
  const affinity = pre.buildPaletteAffinityMap(target, palette);
  assert.equal(affinity.length, 3);
  assert.ok(affinity[1] > affinity[0]);
});


test('portrait priority follows supplied landmarks and exposes solver penalty maps', () => {
  const size = 52, rgb = new Float32Array(size * size * 3), mask = core.makeCircularMask(size);
  rgb.fill(.92);
  const darkSpot = (cx,cy,rx,ry) => {
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
      const nx=x/(size-1),ny=y/(size-1);
      if ((((nx-cx)/rx)**2+((ny-cy)/ry)**2)<1) {
        const p=y*size+x; rgb[p*3]=rgb[p*3+1]=rgb[p*3+2]=.08;
      }
    }
  };
  darkSpot(.32,.38,.045,.02); darkSpot(.68,.38,.045,.02); darkSpot(.5,.66,.11,.018);
  const maps = pre.buildPortraitPriorityMaps(rgb, size, {
    mask,
    faceBox:{x:.20,y:.12,width:.60,height:.72},
    landmarks:{leftEye:{x:.32,y:.38},rightEye:{x:.68,y:.38},mouth:{x:.50,y:.66}},
  });
  const eye=Math.round(.38*(size-1))*size+Math.round(.32*(size-1));
  const cheek=Math.round(.50*(size-1))*size+Math.round(.38*(size-1));
  assert.ok(maps.featureMap[eye] > maps.featureMap[cheek], 'real eye landmark should focus feature gain');
  assert.equal(maps.edgeMap.length,size*size);
  assert.equal(maps.structureMap.length,size*size);
  assert.equal(maps.backgroundPenalty.length,size*size);
  assert.ok(maps.landmarksUsed);
});

test('fast portrait solver uses feature-gain stages without center-starburst domination', async () => {
  const fast = await import('../string-art-v4/fast-layered.mjs');
  const size=56,rgba=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=x/(size-1),ny=y/(size-1),i=(y*size+x)*4;
    let c=[246,242,235];
    const face=(((nx-.5)/.25)**2+((ny-.45)/.34)**2)<1;
    if(face)c=[216,166,134];
    if(face&&ny<.22)c=[45,29,23];
    const eye=(Math.abs(ny-.39)<.022&&(Math.abs(nx-.36)<.055||Math.abs(nx-.64)<.055));
    const brow=(Math.abs(ny-.335)<.014&&(Math.abs(nx-.36)<.07||Math.abs(nx-.64)<.07));
    const nose=(Math.abs(nx-.5)<.015&&ny>.42&&ny<.58);
    const mouth=(Math.abs(ny-.64)<.018&&Math.abs(nx-.5)<.12);
    const beard=(ny>.68&&ny<.78&&Math.abs(nx-.5)<.18);
    if(eye||brow||nose||mouth||beard)c=[35,24,20];
    rgba[i]=c[0];rgba[i+1]=c[1];rgba[i+2]=c[2];rgba[i+3]=255;
  }
  const result=fast.solveFastLayeredPortrait({
    size,nails:92,minGap:5,rgba,
    preprocess:{
      faceBox:{x:.25,y:.10,width:.50,height:.72},
      landmarks:{leftEye:{x:.36,y:.39},rightEye:{x:.64,y:.39},nose:{x:.50,y:.52},mouth:{x:.50,y:.64}},
      backgroundSuppress:.9
    },
    palette:{nColors:4,fixedHex:['#111111'],candidateHex:['#111111','#70452f','#d99a72','#e8b694','#2358a6'],simulationSize:22,maxCombinations:40},
    solve:{maxFibers:420,candidateLimit:34,maxRepeat:2,timeBudgetMs:1800},
  });
  assert.equal(result.metrics.method,'image-residual-identity-hybrid-v1');
  assert.ok(result.metrics.fibers>70,'solver should build a useful portrait');
  assert.ok(result.metrics.mseImprovement>0,'source-image error should be reduced');
  assert.ok(result.metrics.centerCrossingRate<.72,'center crossings should not dominate');
  assert.equal(result.routes.reduce((s,r)=>s+r.selectedFibers,0),result.metrics.fibers);
});


test('dense face mesh produces contour maps for real facial geometry', () => {
  const size=64,rgb=new Float32Array(size*size*3),mask=core.makeCircularMask(size);
  rgb.fill(.88);
  const mesh=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
  const loop=(ids,cx,cy,rx,ry)=>ids.forEach((id,k)=>{const a=2*Math.PI*k/Math.max(1,ids.length-1);mesh[id]={x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a),z:0}});
  loop([33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],.36,.40,.055,.022);
  loop([263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466],.64,.40,.055,.022);
  loop([61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146],.50,.65,.12,.025);
  const maps=pre.buildPortraitPriorityMaps(rgb,size,{
    mask,faceBox:{x:.25,y:.12,width:.5,height:.72},
    landmarks:{mesh,leftEye:{x:.36,y:.40},rightEye:{x:.64,y:.40},mouth:{x:.5,y:.65}}
  });
  assert.equal(maps.landmarksUsed,'dense-mesh');
  assert.ok(Math.max(...maps.eyesMap)>0.5);
  assert.ok(Math.max(...maps.mouthMap)>0.5);
  assert.ok(maps.featureDirX.some(v=>Math.abs(v)>0.1));
});

test('dense landmark solver closes eye nose mouth residuals without starburst domination', async () => {
  const fast=await import('../string-art-v4/fast-layered.mjs');
  const size=64,rgba=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=x/(size-1),ny=y/(size-1),i=(y*size+x)*4;
    let c=[248,245,239];
    const face=(((nx-.5)/.25)**2+((ny-.46)/.34)**2)<1;
    if(face)c=[220,170,138];
    if(face&&ny<.23)c=[42,28,22];
    const eye=(Math.abs(ny-.40)<.018&&(Math.abs(nx-.36)<.052||Math.abs(nx-.64)<.052));
    const brow=(Math.abs(ny-.34)<.012&&(Math.abs(nx-.36)<.066||Math.abs(nx-.64)<.066));
    const nose=(Math.abs(nx-.5)<.012&&ny>.43&&ny<.58);
    const mouth=(Math.abs(ny-.65)<.014&&Math.abs(nx-.5)<.115);
    if(eye||brow||nose||mouth)c=[28,20,18];
    rgba[i]=c[0];rgba[i+1]=c[1];rgba[i+2]=c[2];rgba[i+3]=255;
  }
  const mesh=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
  const loop=(ids,cx,cy,rx,ry)=>ids.forEach((id,k)=>{const a=2*Math.PI*k/Math.max(1,ids.length-1);mesh[id]={x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a),z:0}});
  loop([33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],.36,.40,.055,.022);
  loop([263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466],.64,.40,.055,.022);
  loop([70,63,105,66,107,55,65,52,53,46],.36,.34,.075,.015);
  loop([300,293,334,296,336,285,295,282,283,276],.64,.34,.075,.015);
  loop([61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146],.50,.65,.12,.025);
  [168,6,197,195,5,4,1,19,94,2].forEach((id,k)=>mesh[id]={x:.5,y:.43+k*.017,z:0});
  loop([98,97,2,326,327,294,278,344,440,275,4,45,220,115,48,64],.50,.575,.075,.027);
  const result=fast.solveFastLayeredPortrait({
    size,nails:104,minGap:6,rgba,
    preprocess:{faceBox:{x:.25,y:.12,width:.50,height:.72},landmarks:{mesh,leftEye:{x:.36,y:.40},rightEye:{x:.64,y:.40},nose:{x:.5,y:.53},mouth:{x:.5,y:.65}},backgroundSuppress:.92},
    palette:{nColors:4,fixedHex:['#111111'],candidateHex:['#111111','#70452f','#d99a72','#e8b694','#2358a6'],simulationSize:24,maxCombinations:40},
    solve:{maxFibers:520,candidateLimit:42,maxRepeat:2,timeBudgetMs:2200,likeness:.9,detail:.75,colorStrength:.5},
  });
  const f=result.metrics.featureCompletions;
  assert.equal(result.metrics.method,'image-residual-identity-hybrid-v1');
  assert.ok(result.metrics.mseImprovement>0.05,'solver must reduce actual source-image error');
  assert.equal(result.portrait.landmarksUsed,'dense-mesh');
  assert.ok(f.eyes>.15&&f.nose>.15&&f.mouth>.15);
  assert.ok(result.metrics.centerCrossingRate<.70);
});


test('hybrid residual solver never lets color override the likeness scaffold', async () => {
  const fast=await import('../string-art-v4/fast-layered.mjs');
  const size=48,rgba=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=x/(size-1),ny=y/(size-1),i=(y*size+x)*4;
    let c=[248,246,242];
    const face=(((nx-.5)/.27)**2+((ny-.47)/.35)**2)<1;
    if(face)c=[215,165,132];
    if(nx<.30&&ny>.22&&ny<.78)c=[35,24,22];
    if(Math.abs(ny-.40)<.018&&(Math.abs(nx-.35)<.05||Math.abs(nx-.65)<.05))c=[18,15,14];
    if(Math.abs(ny-.65)<.016&&Math.abs(nx-.52)<.11)c=[120,30,45];
    rgba[i]=c[0];rgba[i+1]=c[1];rgba[i+2]=c[2];rgba[i+3]=255;
  }
  const result=fast.solveFastLayeredPortrait({
    size,nails:82,minGap:5,rgba,
    preprocess:{faceBox:{x:.23,y:.10,width:.54,height:.74},backgroundSuppress:.86},
    palette:{nColors:4,fixedHex:['#111111'],candidateHex:['#111111','#70452f','#d99a72','#d95f73','#2358a6'],simulationSize:20,maxCombinations:30},
    solve:{maxFibers:360,candidateLimit:32,maxRepeat:2,timeBudgetMs:1600,likeness:1,detail:.8,colorStrength:1}
  });
  assert.equal(result.metrics.method,'image-residual-identity-hybrid-v1');
  assert.ok(result.metrics.mseImprovement>0);
  assert.ok(result.metrics.blackShare>=.64,'even maximum color must preserve a majority likeness scaffold');
  assert.ok(result.metrics.colorShare<=.36);
  assert.ok(result.metrics.centerCrossingRate<.72);
});


test('V4 UI generation cannot silently wait on face detection', async () => {
  const fs=require('node:fs');
  const src=fs.readFileSync(require('node:path').join(__dirname,'..','project-string-art-v4-lab.mjs'),'utf8');
  const start=src.indexOf("async function generateV4");
  const detect=src.indexOf("detectPortraitFaces",start);
  const visible=src.indexOf("STARTING · PREPARING SOURCE IMAGE",start);
  assert.ok(start>=0&&visible>start&&detect>visible,'status must update before awaiting face detection');
  assert.ok(src.includes("withTimeout(getPortableFaceLandmarker(),2600"));
  assert.ok(src.includes("FACE ANALYSIS SKIPPED · SOLVING DIRECTLY FROM SOURCE IMAGE"));
});
