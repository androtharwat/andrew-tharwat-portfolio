import { makeCircularMask } from './core.mjs';
import {
  rgbaToLinearRgb,
  chooseThreadPaletteSimulation,
  buildPortraitPriorityMaps,
  buildPaletteAffinityMap,
} from './preprocess.mjs';

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
    const ink = Math.pow(clamp01(1 - y), 0.76);
    const chroma = Math.max(r, g, bb) - Math.min(r, g, bb);
    const subject = clamp01(portrait.subjectMap?.[p] || 0);
    const feature = Math.min(1.65, portrait.featureMap?.[p] || 0);
    const importance = Math.min(3.2, portrait.importance?.[p] || 1);
    const spatial = m * (0.08 + 0.92 * subject);
    const detail = 0.58 + 0.20 * importance + 0.48 * feature;

    for (let ci = 0; ci < colors; ci++) {
      const a = affinity[p * colors + ci] || 0;
      let need;
      if (ci === 0) {
        need = ink * (0.32 + 0.68 * a) * (0.70 + 0.55 * feature) * spatial * detail;
      } else {
        need = ink * (0.10 + 0.90 * a) * (0.74 + 0.26 * chroma) * spatial * detail;
      }
      need = Math.min(1.7, need);
      residuals[ci][p] = need;
      masses[ci] += need;
    }
  }
  return { residuals, masses };
}

function allocateBudgets(masses, totalLines) {
  const colors = masses.length;
  const weights = new Float64Array(colors);
  let sum = 0;
  for (let ci = 0; ci < colors; ci++) {
    const boost = ci === 0 ? 1.5 : 1;
    weights[ci] = Math.pow(Math.max(EPS, masses[ci]), 0.78) * boost;
    sum += weights[ci];
  }
  const budgets = new Int32Array(colors);
  const minimum = Math.max(220, Math.floor(totalLines * 0.07));
  let assigned = 0;
  for (let ci = 0; ci < colors; ci++) {
    budgets[ci] = Math.max(minimum, Math.floor(totalLines * weights[ci] / Math.max(EPS, sum)));
    assigned += budgets[ci];
  }
  while (assigned > totalLines) {
    let best = -1, room = 0;
    for (let ci = 0; ci < colors; ci++) {
      const r = budgets[ci] - minimum;
      if (r > room) { room = r; best = ci; }
    }
    if (best < 0) break;
    budgets[best]--; assigned--;
  }
  while (assigned < totalLines) {
    let best = 0;
    for (let ci = 1; ci < colors; ci++) if (weights[ci] > weights[best]) best = ci;
    budgets[best]++; assigned++;
  }
  return budgets;
}

function scanCandidatePins(nails, current, step, limit, minGap, visit) {
  const full = !limit || limit >= nails || (step > 0 && step % 64 === 0);
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

function scoreLine(pixels, residual, avoidance, repeat, colorIndex) {
  let sum = 0, penalty = 0;
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    sum += residual[p];
    if (avoidance) penalty += avoidance[p] || 0;
  }
  if (!pixels.length) return -Infinity;
  let score = sum / pixels.length;
  score -= (colorIndex === 0 ? 0.11 : 0.04) * (penalty / pixels.length);
  score /= 1 + repeat * 0.72;
  return score;
}

function depleteLine(pixels, residual, depletion) {
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    residual[p] = Math.max(0, residual[p] - depletion);
  }
}

function solveLayer({
  geometry,
  residual,
  avoidance,
  colorIndex,
  budget,
  candidateLimit,
  minGap,
  maxRepeat,
  depletion,
  deadline,
  onLine,
}) {
  const edgeUse = new Uint8Array(geometry.nails * geometry.nails);
  const trails = [];
  let current = Math.floor((colorIndex * geometry.nails / 5 + geometry.nails * 0.11)) % geometry.nails;
  let trail = [current], accepted = 0, restarts = 0;

  for (let step = 0; step < budget; step++) {
    if (step % 32 === 0 && Date.now() >= deadline) break;
    let bestPin = -1, bestScore = -Infinity;

    scanCandidatePins(geometry.nails, current, step, candidateLimit, minGap, (pin) => {
      const lo = Math.min(current, pin), hi = Math.max(current, pin);
      const edgeKey = lo * geometry.nails + hi;
      const repeat = edgeUse[edgeKey];
      if (repeat >= maxRepeat) return;
      const pixels = linePixels(geometry, current, pin);
      const score = scoreLine(pixels, residual, avoidance, repeat, colorIndex);
      if (score > bestScore) { bestScore = score; bestPin = pin; }
    });

    if (bestPin < 0) {
      if (trail.length > 1) trails.push(trail);
      restarts++;
      if (restarts > 12) break;
      current = (current + Math.floor(geometry.nails * (0.17 + restarts * 0.031))) % geometry.nails;
      trail = [current];
      continue;
    }

    const lo = Math.min(current, bestPin), hi = Math.max(current, bestPin);
    const edgeKey = lo * geometry.nails + hi;
    edgeUse[edgeKey]++;
    depleteLine(linePixels(geometry, current, bestPin), residual, depletion);
    current = bestPin;
    trail.push(current);
    accepted++;
    if (onLine && (accepted % 40 === 0 || accepted === budget)) onLine(accepted, budget);
  }

  if (trail.length > 1) trails.push(trail);
  return { trails, selectedFibers:accepted };
}

export function solveFastLayeredPortrait({
  size,
  nails = 288,
  minGap = 8,
  rgba,
  preprocess = {},
  palette = {},
  solve = {},
  onProgress,
}) {
  if (rgba.length !== size * size * 4) throw new Error('RGBA size mismatch');
  const startedAt = Date.now();
  const geometry = geometryFor(size, nails);
  const mask = makeCircularMask(size, 1.5);
  const linearRgb = rgbaToLinearRgb(rgba);
  const portrait = buildPortraitPriorityMaps(linearRgb, size, {
    mask,
    faceBox: preprocess.faceBox || null,
    backgroundWeight: preprocess.backgroundWeight ?? 0.035,
    faceBoost: preprocess.faceBoost ?? 1.82,
    edgeBoost: preprocess.edgeBoost ?? 2.3,
    featureBoost: preprocess.featureBoost ?? 3.45,
    darkDetailBoost: preprocess.darkDetailBoost ?? 0.9,
    avoidanceBoost: preprocess.avoidanceBoost ?? 1.5,
  });
  onProgress?.({phase:'preprocess',done:1,total:1});

  const targetRgb = suppressBackground(linearRgb, portrait.subjectMap, preprocess.backgroundSuppress ?? 0.82);
  const paletteMask = new Float32Array(mask.length);
  for (let p = 0; p < mask.length; p++) paletteMask[p] = mask[p] * (0.12 + 0.88 * clamp01(portrait.subjectMap[p] || 0));

  const selected = chooseThreadPaletteSimulation(targetRgb, size, {
    nColors:palette.nColors ?? 5,
    fixedHex:palette.fixedHex ?? ['#111111'],
    mask:paletteMask,
    simulationSize:Math.min(size, palette.simulationSize ?? 34),
    maxCombinations:palette.maxCombinations ?? 120,
  });
  onProgress?.({phase:'palette',done:1,total:1});

  const affinity = buildPaletteAffinityMap(targetRgb, selected.linearRgb, portrait.importance, {
    temperature:preprocess.colorAffinityTemperature ?? 0.07,
  });
  const { residuals, masses } = buildLayerResiduals(targetRgb, selected.linearRgb, affinity, portrait, mask);
  const totalLines = solve.maxFibers ?? 5600;
  const budgets = allocateBudgets(masses, totalLines);
  const timeBudgetMs = Math.max(1500, solve.timeBudgetMs ?? 6500);
  const layerStart = Date.now();
  const colors = selected.linearRgb.length;
  const routes = [];
  const perColor = new Int32Array(colors);
  let fibers = 0;

  for (let ci = 0; ci < colors; ci++) {
    const deadline = layerStart + Math.round(timeBudgetMs * (ci + 1) / colors);
    const layer = solveLayer({
      geometry,
      residual:residuals[ci],
      avoidance:portrait.avoidance,
      colorIndex:ci,
      budget:budgets[ci],
      candidateLimit:solve.candidateLimit ?? 72,
      minGap,
      maxRepeat:solve.maxRepeat ?? 2,
      depletion:solve.depletion ?? 0.055,
      deadline,
      onLine:(done)=>onProgress?.({phase:'fast-layer',colorIndex:ci,colorHex:selected.hex[ci],done:fibers+done,total:totalLines}),
    });
    perColor[ci] = layer.selectedFibers;
    fibers += layer.selectedFibers;
    routes.push({colorIndex:ci,selectedFibers:layer.selectedFibers,trails:layer.trails,sequence:layer.trails.flatMap(t=>t),connectors:[],trailStarts:[]});
  }

  return {
    mode:'color-global',
    routes,
    palette:selected,
    metrics:{
      fibers,
      colorsUsed:perColor.reduce((n,v)=>n+(v>0?1:0),0),
      perColor:Array.from(perColor),
      elapsedMs:Date.now()-startedAt,
      targetFibers:totalLines,
      completion:fibers/Math.max(1,totalLines),
      cachedLines:geometry.lines.size,
      method:'fast-layered-on-demand',
    },
    portrait:{enabled:true,faceBox:portrait.faceBox},
    backgroundSuppression:preprocess.backgroundSuppress ?? 0.82,
    colorLayering:{enabled:true,method:'fast-layered-on-demand'},
    renderedRgb:null,
  };
}
