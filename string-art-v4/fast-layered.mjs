import { makeCircularMask } from './core.mjs';
import {
  rgbaToLinearRgb,
  chooseThreadPaletteSimulation,
  buildPortraitPriorityMaps,
  buildPaletteAffinityMap,
} from './preprocess.mjs?v=2';

const EPS = 1e-9;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const GEOMETRY_CACHE = new Map();

function circleGap(a, b, nails) {
  const d = Math.abs(a - b);
  return Math.min(d, nails - d);
}

function geometryFor(size, nails) {
  const key = size + ':' + nails;
  if (GEOMETRY_CACHE.has(key)) return GEOMETRY_CACHE.get(key);
  const radius = size / 2 - 2;
  const center = size / 2;
  const pins = new Int16Array(nails * 2);
  for (let i = 0; i < nails; i++) {
    const angle = (i * Math.PI * 2) / nails;
    pins[i * 2] = Math.round(center + radius * Math.cos(angle));
    pins[i * 2 + 1] = Math.round(center + radius * Math.sin(angle));
  }
  const geometry = { size, nails, pins, lines:new Map() };
  GEOMETRY_CACHE.set(key, geometry);
  return geometry;
}

function linePixels(geometry, a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const key = lo * geometry.nails + hi;
  if (geometry.lines.has(key)) return geometry.lines.get(key);
  let x0 = geometry.pins[a * 2], y0 = geometry.pins[a * 2 + 1];
  const x1 = geometry.pins[b * 2], y1 = geometry.pins[b * 2 + 1];
  const out = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 >= 0 && x0 < geometry.size && y0 >= 0 && y0 < geometry.size) out.push(y0 * geometry.size + x0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  const pixels = Uint32Array.from(out);
  geometry.lines.set(key, pixels);
  return pixels;
}

function suppressBackground(rgb, subjectMap, amount) {
  if (!subjectMap || amount <= 0) return new Float32Array(rgb);
  const out = new Float32Array(rgb.length);
  for (let p = 0; p < rgb.length / 3; p++) {
    const subject = clamp01(subjectMap[p] || 0);
    const fade = amount * Math.pow(1 - subject, 1.35);
    const b = p * 3;
    out[b] = rgb[b] * (1 - fade) + fade;
    out[b + 1] = rgb[b + 1] * (1 - fade) + fade;
    out[b + 2] = rgb[b + 2] * (1 - fade) + fade;
  }
  return out;
}

function buildLayerResiduals(targetRgb, paletteLinear, affinity, portrait, mask) {
  const colors = paletteLinear.length;
  const residuals = Array.from({ length: colors }, () => new Float32Array(mask.length));
  const masses = new Float64Array(colors);
  for (let p = 0; p < mask.length; p++) {
    const m = mask[p];
    if (m <= 0.001) continue;
    const b = p * 3;
    const r = targetRgb[b], g = targetRgb[b + 1], bb = targetRgb[b + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * bb;
    const ink = Math.pow(clamp01(1 - y), 0.78);
    const chroma = Math.max(r, g, bb) - Math.min(r, g, bb);
    const subject = clamp01(portrait.subjectMap?.[p] || 0);
    const feature = Math.min(2.2, portrait.featureMap?.[p] || 0);
    const edge = clamp01(portrait.edgeMap?.[p] || 0);
    const contrast = clamp01(portrait.contrastMap?.[p] || 0);
    const importance = Math.min(4.5, portrait.importance?.[p] || 1);
    const spatial = m * (0.035 + 0.965 * subject);
    const detail = 0.35 + 0.18 * importance + 0.62 * feature + 0.26 * edge + 0.18 * contrast;
    for (let ci = 0; ci < colors; ci++) {
      const a = affinity[p * colors + ci] || 0;
      let need;
      if (ci === 0) need = ink * (0.20 + 0.80 * a) * (0.56 + 0.80 * feature + 0.24 * edge) * spatial * detail;
      else need = ink * (0.07 + 0.93 * a) * (0.64 + 0.36 * chroma) * spatial * detail;
      need = Math.min(1.9, need);
      residuals[ci][p] = need;
      masses[ci] += need;
    }
  }
  return { residuals, masses };
}

function allocateStageBudgets(masses, totalLines, stage, colors) {
  const weights = new Float64Array(colors);
  let sum = 0;
  for (let ci = 0; ci < colors; ci++) {
    let boost = 1;
    if (stage.key === 'structure') boost = ci === 0 ? 2.05 : 0.78;
    else if (stage.key === 'features') boost = ci === 0 ? 2.65 : 0.54;
    else if (stage.key === 'color') boost = ci === 0 ? 0.48 : 1.35;
    else if (stage.key === 'refine') boost = ci === 0 ? 1.85 : 0.76;
    weights[ci] = Math.pow(Math.max(EPS, masses[ci]), 0.72) * boost;
    sum += weights[ci];
  }
  const budgets = new Int32Array(colors);
  let assigned = 0;
  for (let ci = 0; ci < colors; ci++) {
    budgets[ci] = Math.floor(totalLines * weights[ci] / Math.max(EPS, sum));
    assigned += budgets[ci];
  }
  while (assigned < totalLines) {
    let best = 0;
    for (let ci = 1; ci < colors; ci++) if (weights[ci] > weights[best]) best = ci;
    budgets[best]++; assigned++;
  }
  return budgets;
}

function scanCandidatePins(nails, current, step, limit, minGap, visit) {
  const full = !limit || limit >= nails || (step > 0 && step % 72 === 0);
  if (full) {
    for (let pin = 0; pin < nails; pin++) {
      if (pin === current || circleGap(pin, current, nails) < minGap) continue;
      visit(pin);
    }
    return;
  }
  const stride = Math.max(1, Math.floor(nails / limit));
  const offset = (step * 19 + current * 5) % stride;
  let seen = 0;
  for (let pin = offset; pin < nails && seen < limit; pin += stride) {
    if (pin === current || circleGap(pin, current, nails) < minGap) continue;
    visit(pin); seen++;
  }
  if (seen < limit) {
    for (let pin = (offset + 1) % nails; pin < nails && seen < limit; pin += stride + 1) {
      if (pin === current || circleGap(pin, current, nails) < minGap) continue;
      visit(pin); seen++;
    }
  }
}

function buildCenterPenalty(size, featureMap) {
  const out = new Float32Array(size * size);
  const c = (size - 1) / 2;
  const inv = 1 / Math.max(1, size * 0.24);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x;
    const r = Math.hypot(x - c, y - c) * inv;
    const central = Math.pow(clamp01(1 - r), 1.35);
    const feature = clamp01((featureMap?.[p] || 0) / 1.6);
    out[p] = central * (1 - 0.82 * feature);
  }
  return out;
}

const STAGES = [
  { key:'structure', share:.25, residual:1.12, feature:.34, edge:.96, structure:1.28, contrast:.26, color:.12, bright:.58, center:.70, congestion:.46, background:.40, long:.24, repeat:.78, minScore:.018, depletion:.050 },
  { key:'features', share:.34, residual:.86, feature:2.25, edge:.92, structure:.18, contrast:.92, color:.10, bright:1.26, center:.72, congestion:.66, background:.48, long:.34, repeat:.92, minScore:.026, depletion:.047 },
  { key:'color', share:.28, residual:1.02, feature:.28, edge:.20, structure:.10, contrast:.18, color:1.18, bright:.72, center:.62, congestion:.55, background:.54, long:.30, repeat:.86, minScore:.016, depletion:.052 },
  { key:'refine', share:.13, residual:.92, feature:1.72, edge:1.10, structure:.22, contrast:.76, color:.30, bright:1.18, center:.88, congestion:.86, background:.62, long:.42, repeat:1.04, minScore:.030, depletion:.041 },
];

function scoreLine({ pixels, residual, portrait, affinity, colors, colorIndex, congestion, centerPenalty, repeat, stage, size }) {
  if (!pixels.length) return -Infinity;
  let residualGain = 0, featureGain = 0, edgeGain = 0, structureGain = 0, contrastGain = 0, colorGain = 0;
  let brightPenalty = 0, congestionPenalty = 0, centerCross = 0, backgroundPenalty = 0;
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i], r = residual[p] || 0;
    const feature = portrait.featureMap?.[p] || 0;
    const edge = portrait.edgeMap?.[p] || 0;
    const structure = portrait.structureMap?.[p] || 0;
    const contrast = portrait.contrastMap?.[p] || 0;
    residualGain += r;
    featureGain += r * feature;
    edgeGain += r * edge;
    structureGain += r * structure;
    contrastGain += r * contrast;
    colorGain += r * (affinity[p * colors + colorIndex] || 0);
    brightPenalty += portrait.avoidance?.[p] || 0;
    congestionPenalty += congestion[p] || 0;
    centerCross += centerPenalty[p] || 0;
    backgroundPenalty += portrait.backgroundPenalty?.[p] || 0;
  }
  const inv = 1 / pixels.length;
  residualGain *= inv; featureGain *= inv; edgeGain *= inv; structureGain *= inv; contrastGain *= inv; colorGain *= inv;
  brightPenalty *= inv; congestionPenalty *= inv; centerCross *= inv; backgroundPenalty *= inv;
  const featureEvidence = clamp01(featureGain * 2.4 + edgeGain * .72 + contrastGain * .55);
  const lengthRatio = Math.min(1.45, pixels.length / Math.max(1, size));
  const longPenalty = lengthRatio * (1 - featureEvidence);
  let score = stage.residual * residualGain + stage.feature * featureGain + stage.edge * edgeGain +
    stage.structure * structureGain + stage.contrast * contrastGain + stage.color * colorGain;
  score -= stage.bright * brightPenalty;
  score -= stage.center * centerCross * (1 - featureEvidence * .72);
  score -= stage.congestion * congestionPenalty;
  score -= stage.background * backgroundPenalty;
  score -= stage.long * longPenalty;
  score /= 1 + repeat * stage.repeat;
  return score;
}

function depleteLine(pixels, residual, congestion, depletion, colorIndex) {
  const crowd = colorIndex === 0 ? .145 : .105;
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    residual[p] = Math.max(0, residual[p] - depletion);
    congestion[p] = Math.min(3.5, congestion[p] + crowd);
  }
}

function createLayerState(geometry, colorIndex) {
  const current = Math.floor((colorIndex * geometry.nails / 5 + geometry.nails * 0.11)) % geometry.nails;
  return { edgeUse:new Uint8Array(geometry.nails * geometry.nails), trails:[], current, trail:[current], accepted:0, restarts:0, step:0 };
}

function restartTrail(state, geometry) {
  if (state.trail.length > 1) state.trails.push(state.trail);
  state.restarts++;
  state.current = (state.current + Math.floor(geometry.nails * (0.17 + (state.restarts % 11) * 0.031))) % geometry.nails;
  state.trail = [state.current];
}

function solveLayerPass({
  geometry, state, residual, portrait, affinity, colors, colorIndex, congestion, centerPenalty,
  budget, candidateLimit, minGap, maxRepeat, deadline, stage, onLine,
}) {
  let acceptedPass = 0, stalled = 0;
  for (let local = 0; local < budget; local++, state.step++) {
    if (state.step % 24 === 0 && Date.now() >= deadline) break;
    let bestPin = -1, bestScore = -Infinity;
    scanCandidatePins(geometry.nails, state.current, state.step, candidateLimit, minGap, (pin) => {
      const lo = Math.min(state.current, pin), hi = Math.max(state.current, pin);
      const edgeKey = lo * geometry.nails + hi;
      const repeat = state.edgeUse[edgeKey];
      if (repeat >= maxRepeat) return;
      const pixels = linePixels(geometry, state.current, pin);
      const score = scoreLine({ pixels, residual, portrait, affinity, colors, colorIndex, congestion, centerPenalty, repeat, stage, size:geometry.size });
      if (score > bestScore) { bestScore = score; bestPin = pin; }
    });
    if (bestPin < 0 || bestScore < stage.minScore) {
      stalled++; restartTrail(state, geometry);
      if (stalled > 10) break;
      continue;
    }
    stalled = 0;
    const lo = Math.min(state.current, bestPin), hi = Math.max(state.current, bestPin);
    const edgeKey = lo * geometry.nails + hi;
    state.edgeUse[edgeKey]++;
    depleteLine(linePixels(geometry, state.current, bestPin), residual, congestion, stage.depletion, colorIndex);
    state.current = bestPin; state.trail.push(state.current);
    state.accepted++; acceptedPass++;
    if (onLine && (acceptedPass % 36 === 0 || acceptedPass === budget)) onLine(acceptedPass, budget);
  }
  return acceptedPass;
}

function finalizeState(state) {
  if (state.trail.length > 1) state.trails.push(state.trail);
  state.trail = [state.current];
}

function remainingFeatureMass(residuals, featureMap) {
  let sum = 0;
  for (const residual of residuals) for (let p = 0; p < residual.length; p++) sum += residual[p] * (featureMap?.[p] || 0);
  return sum;
}

function routeDiagnostics(routes, geometry, portrait, centerPenalty) {
  let fibers = 0, center = 0, bright = 0;
  for (const route of routes) for (const trail of route.trails || []) for (let i = 1; i < trail.length; i++) {
    const pixels = linePixels(geometry, trail[i - 1], trail[i]);
    let c = 0, b = 0;
    for (let k = 0; k < pixels.length; k++) {
      const p = pixels[k]; c += centerPenalty[p] || 0; b += portrait.avoidance?.[p] || 0;
    }
    fibers++;
    if (c / Math.max(1, pixels.length) > .18) center++;
    if (b / Math.max(1, pixels.length) > .22) bright++;
  }
  return { centerCrossingRate:fibers ? center / fibers : 0, brightFaceCrossingRate:fibers ? bright / fibers : 0 };
}

export function solveFastLayeredPortrait({
  size, nails = 288, minGap = 8, rgba, preprocess = {}, palette = {}, solve = {}, onProgress,
}) {
  if (rgba.length !== size * size * 4) throw new Error('RGBA size mismatch');
  const startedAt = Date.now();
  const geometry = geometryFor(size, nails);
  const mask = makeCircularMask(size, 1.5);
  const linearRgb = rgbaToLinearRgb(rgba);
  const portrait = buildPortraitPriorityMaps(linearRgb, size, {
    mask,
    faceBox: preprocess.faceBox || null,
    landmarks: preprocess.landmarks || null,
    backgroundWeight: preprocess.backgroundWeight ?? 0.025,
    faceBoost: preprocess.faceBoost ?? 1.95,
    edgeBoost: preprocess.edgeBoost ?? 2.45,
    featureBoost: preprocess.featureBoost ?? 4.1,
    darkDetailBoost: preprocess.darkDetailBoost ?? 1.05,
    avoidanceBoost: preprocess.avoidanceBoost ?? 1.75,
  });
  onProgress?.({phase:'preprocess',done:1,total:1});

  const targetRgb = suppressBackground(linearRgb, portrait.subjectMap, preprocess.backgroundSuppress ?? 0.90);
  const paletteMask = new Float32Array(mask.length);
  for (let p = 0; p < mask.length; p++) paletteMask[p] = mask[p] * (0.04 + 0.96 * clamp01(portrait.subjectMap[p] || 0));
  const selected = chooseThreadPaletteSimulation(targetRgb, size, {
    candidateHex:palette.candidateHex,
    nColors:palette.nColors ?? 5,
    fixedHex:palette.fixedHex ?? ['#111111'],
    mask:paletteMask,
    simulationSize:Math.min(size, palette.simulationSize ?? 34),
    maxCombinations:palette.maxCombinations ?? 120,
  });
  onProgress?.({phase:'palette',done:1,total:1});

  const affinity = buildPaletteAffinityMap(targetRgb, selected.linearRgb, portrait.importance, { temperature:preprocess.colorAffinityTemperature ?? 0.065 });
  const { residuals, masses } = buildLayerResiduals(targetRgb, selected.linearRgb, affinity, portrait, mask);
  const initialFeatureMass = remainingFeatureMass(residuals, portrait.featureMap);
  const totalLines = solve.maxFibers ?? 5600;
  const timeBudgetMs = Math.max(1800, solve.timeBudgetMs ?? 6500);
  const deadline = Date.now() + timeBudgetMs;
  const colors = selected.linearRgb.length;
  const states = Array.from({length:colors}, (_,ci)=>createLayerState(geometry,ci));
  const congestion = new Float32Array(mask.length);
  const centerPenalty = buildCenterPenalty(size, portrait.featureMap);
  const perColor = new Int32Array(colors);
  let fibers = 0, planned = 0;

  for (let si = 0; si < STAGES.length; si++) {
    if (Date.now() >= deadline) break;
    const stage = STAGES[si];
    const stageBudget = si === STAGES.length - 1 ? Math.max(0, totalLines - planned) : Math.round(totalLines * stage.share);
    planned += stageBudget;
    const budgets = allocateStageBudgets(masses, stageBudget, stage, colors);
    for (let ci = 0; ci < colors; ci++) {
      if (Date.now() >= deadline) break;
      const accepted = solveLayerPass({
        geometry, state:states[ci], residual:residuals[ci], portrait, affinity, colors, colorIndex:ci,
        congestion, centerPenalty, budget:budgets[ci], candidateLimit:solve.candidateLimit ?? 72,
        minGap, maxRepeat:solve.maxRepeat ?? 2, deadline, stage,
        onLine:(done,total)=>onProgress?.({phase:'portrait-stage',stage:stage.key,colorIndex:ci,colorHex:selected.hex[ci],done:fibers+done,total:totalLines,stageDone:done,stageTotal:total}),
      });
      perColor[ci] += accepted; fibers += accepted;
    }
  }

  for (const state of states) finalizeState(state);
  const routes = states.map((state,ci)=>({
    colorIndex:ci,selectedFibers:state.accepted,trails:state.trails,
    sequence:state.trails.flatMap(t=>t),connectors:[],trailStarts:[],
  }));
  const featureRemaining = remainingFeatureMass(residuals, portrait.featureMap);
  const diagnostics = routeDiagnostics(routes, geometry, portrait, centerPenalty);
  return {
    mode:'color-global', routes, palette:selected,
    metrics:{
      fibers, colorsUsed:perColor.reduce((n,v)=>n+(v>0?1:0),0), perColor:Array.from(perColor),
      elapsedMs:Date.now()-startedAt, targetFibers:totalLines, completion:fibers/Math.max(1,totalLines),
      cachedLines:geometry.lines.size, method:'portrait-multistage-feature-gain',
      featureCompletion:initialFeatureMass>EPS?clamp01(1-featureRemaining/initialFeatureMass):1, ...diagnostics,
    },
    portrait:{enabled:true,faceBox:portrait.faceBox,landmarksUsed:Boolean(preprocess.landmarks)},
    backgroundSuppression:preprocess.backgroundSuppress ?? 0.90,
    colorLayering:{enabled:true,method:'portrait-multistage-feature-gain'},
    renderedRgb:null,
  };
}
