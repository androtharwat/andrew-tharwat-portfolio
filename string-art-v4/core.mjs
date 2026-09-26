const EPS = 1e-9;

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function circleGap(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

export function makeCirclePins({ count, size, inset = 1 }) {
  if (!Number.isInteger(count) || count < 3) throw new Error('count must be >= 3');
  if (!(size > 4)) throw new Error('size must be > 4');
  const pins = new Float32Array(count * 2);
  const c = size / 2;
  const r = size / 2 - inset;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    pins[i * 2] = c + r * Math.cos(a);
    pins[i * 2 + 1] = c + r * Math.sin(a);
  }
  return pins;
}

export function physicalThreadStrength({ fiberWidthMm = 0.12, canvasMm = 600, size = 256, density = 1 }) {
  const pxPerMm = size / canvasMm;
  const widthPx = Math.max(0.01, fiberWidthMm * pxPerMm);
  return clamp01(widthPx * density);
}

function accumulateSplat(map, idx, value) {
  if (value <= 1e-6) return;
  map.set(idx, (map.get(idx) || 0) + value);
}

export function rasterizeFiberAA(pins, a, b, size, coverageScale = 1) {
  const x0 = pins[a * 2], y0 = pins[a * 2 + 1];
  const x1 = pins[b * 2], y1 = pins[b * 2 + 1];
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.35));
  const acc = new Map();
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const w00 = (1 - fx) * (1 - fy) * coverageScale;
    const w10 = fx * (1 - fy) * coverageScale;
    const w01 = (1 - fx) * fy * coverageScale;
    const w11 = fx * fy * coverageScale;
    if (ix >= 0 && ix < size && iy >= 0 && iy < size) accumulateSplat(acc, iy * size + ix, w00);
    if (ix + 1 >= 0 && ix + 1 < size && iy >= 0 && iy < size) accumulateSplat(acc, iy * size + ix + 1, w10);
    if (ix >= 0 && ix < size && iy + 1 >= 0 && iy + 1 < size) accumulateSplat(acc, (iy + 1) * size + ix, w01);
    if (ix + 1 >= 0 && ix + 1 < size && iy + 1 >= 0 && iy + 1 < size) accumulateSplat(acc, (iy + 1) * size + ix + 1, w11);
  }
  const entries = [...acc.entries()].sort((u, v) => u[0] - v[0]);
  const idx = new Uint32Array(entries.length);
  const val = new Float32Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    idx[i] = entries[i][0];
    val[i] = Math.min(1, entries[i][1]);
  }
  return { idx, val };
}

export function enumerateChordPairs(nails, minGap = 4) {
  const a = [];
  const b = [];
  for (let i = 0; i < nails; i++) {
    for (let j = i + 1; j < nails; j++) {
      if (circleGap(i, j, nails) < minGap) continue;
      a.push(i); b.push(j);
    }
  }
  return { a: Uint16Array.from(a), b: Uint16Array.from(b) };
}

export function buildPackedLineTable({
  size,
  nails = 360,
  minGap = 8,
  canvasMm = 600,
  fiberWidthMm = 0.12,
  density = 1,
  onProgress,
}) {
  const pins = makeCirclePins({ count: nails, size });
  const pairs = enumerateChordPairs(nails, minGap);
  const strength = physicalThreadStrength({ fiberWidthMm, canvasMm, size, density });
  const offsets = new Uint32Array(pairs.a.length + 1);
  const idxChunks = new Array(pairs.a.length);
  const valChunks = new Array(pairs.a.length);
  const norms = new Float32Array(pairs.a.length);
  let total = 0;
  for (let e = 0; e < pairs.a.length; e++) {
    const line = rasterizeFiberAA(pins, pairs.a[e], pairs.b[e], size, strength);
    idxChunks[e] = line.idx;
    valChunks[e] = line.val;
    offsets[e] = total;
    let norm = 0;
    for (let k = 0; k < line.val.length; k++) norm += line.val[k] * line.val[k];
    norms[e] = norm;
    total += line.idx.length;
    if (onProgress && (e % 512 === 0 || e === pairs.a.length - 1)) onProgress(e + 1, pairs.a.length);
  }
  offsets[pairs.a.length] = total;
  const indices = new Uint32Array(total);
  const coverages = new Float32Array(total);
  for (let e = 0; e < pairs.a.length; e++) {
    indices.set(idxChunks[e], offsets[e]);
    coverages.set(valChunks[e], offsets[e]);
  }
  return { size, nails, minGap, canvasMm, fiberWidthMm, strength, pins, a: pairs.a, b: pairs.b, offsets, indices, coverages, norms };
}

export function buildIncidentIndex(table) {
  const lists = Array.from({ length: table.nails }, () => []);
  for (let e = 0; e < table.a.length; e++) {
    lists[table.a[e]].push(e);
    lists[table.b[e]].push(e);
  }
  return lists.map((x) => Uint32Array.from(x));
}

export function renderMonoFromCounts(table, counts, opacity = 1) {
  const out = new Float32Array(table.size * table.size);
  for (let e = 0; e < table.a.length; e++) {
    const count = counts[e] || 0;
    if (!count) continue;
    const start = table.offsets[e], end = table.offsets[e + 1];
    for (let k = start; k < end; k++) {
      const p = table.indices[k];
      out[p] = Math.min(1, out[p] + table.coverages[k] * opacity * count);
    }
  }
  return out;
}

export function weightedMse(target, rendered, importance) {
  let err = 0, wsum = 0;
  for (let i = 0; i < target.length; i++) {
    const w = importance ? importance[i] : 1;
    if (w <= 0) continue;
    const d = target[i] - rendered[i];
    err += w * d * d;
    wsum += w;
  }
  return err / Math.max(EPS, wsum);
}

function monoMoveGain(table, edge, target, rendered, importance, sign = 1, opacity = 1) {
  let gain = 0;
  const start = table.offsets[edge], end = table.offsets[edge + 1];
  for (let k = start; k < end; k++) {
    const p = table.indices[k];
    const w = importance ? importance[p] : 1;
    if (w <= 0) continue;
    const before = rendered[p];
    const delta = table.coverages[k] * opacity * sign;
    const after = clamp01(before + delta);
    const e0 = target[p] - before;
    const e1 = target[p] - after;
    gain += w * (e0 * e0 - e1 * e1);
  }
  return gain;
}

function applyMonoMove(table, edge, rendered, sign = 1, opacity = 1) {
  const start = table.offsets[edge], end = table.offsets[edge + 1];
  for (let k = start; k < end; k++) {
    const p = table.indices[k];
    rendered[p] = clamp01(rendered[p] + table.coverages[k] * opacity * sign);
  }
}

function deterministicSubset(total, count, seed) {
  if (!count || count >= total) return null;
  const out = new Uint32Array(count);
  const seen = new Set();
  let x = seed >>> 0;
  let i = 0;
  while (i < count) {
    x = (Math.imul(x ^ (x >>> 16), 2246822519) + 3266489917) >>> 0;
    const e = x % total;
    if (seen.has(e)) continue;
    seen.add(e); out[i++] = e;
  }
  return out;
}

export function solveMonoSparse({
  table,
  target,
  importance,
  maxFibers = 3000,
  opacity = 1,
  maxRepeat = 2,
  allowRemove = true,
  continuity = 'none',
  candidateLimit = 0,
  refreshEvery = 32,
  seed = 12345,
  onProgress,
}) {
  if (target.length !== table.size * table.size) throw new Error('target size mismatch');
  const counts = new Uint8Array(table.a.length);
  const rendered = new Float32Array(target.length);
  const incident = continuity === 'path' ? buildIncidentIndex(table) : null;
  let currentNail = 0;
  const moves = [];
  let acceptedAdds = 0, acceptedRemoves = 0, lastGain = 0;
  for (let step = 0; step < maxFibers; step++) {
    let candidates;
    if (continuity === 'path') {
      candidates = incident[currentNail];
    } else {
      const doFull = !candidateLimit || candidateLimit >= table.a.length || step % refreshEvery === 0;
      candidates = doFull ? null : deterministicSubset(table.a.length, candidateLimit, seed + step * 2654435761);
    }
    let bestGain = 0, bestEdge = -1, bestSign = 1;
    const scan = (e) => {
      if (counts[e] < maxRepeat) {
        const g = monoMoveGain(table, e, target, rendered, importance, 1, opacity);
        if (g > bestGain) { bestGain = g; bestEdge = e; bestSign = 1; }
      }
      if (allowRemove && continuity === 'none' && counts[e] > 0) {
        const g = monoMoveGain(table, e, target, rendered, importance, -1, opacity);
        if (g > bestGain) { bestGain = g; bestEdge = e; bestSign = -1; }
      }
    };
    if (candidates) for (let i = 0; i < candidates.length; i++) scan(candidates[i]);
    else for (let e = 0; e < table.a.length; e++) scan(e);
    if (bestEdge < 0 || bestGain <= 1e-8) break;
    applyMonoMove(table, bestEdge, rendered, bestSign, opacity);
    counts[bestEdge] += bestSign;
    lastGain = bestGain;
    if (bestSign > 0) acceptedAdds++; else acceptedRemoves++;
    if (continuity === 'path' && bestSign > 0) {
      const a = table.a[bestEdge], b = table.b[bestEdge];
      currentNail = a === currentNail ? b : a;
      moves.push({ edge: bestEdge, a, b, sign: 1, nail: currentNail });
    } else {
      moves.push({ edge: bestEdge, a: table.a[bestEdge], b: table.b[bestEdge], sign: bestSign });
    }
    if (onProgress && (step % 8 === 0 || step === maxFibers - 1)) onProgress(step + 1, maxFibers, bestGain);
  }
  return {
    counts,
    rendered,
    moves,
    metrics: {
      mse: weightedMse(target, rendered, importance),
      fibers: counts.reduce((s, v) => s + v, 0),
      acceptedAdds,
      acceptedRemoves,
      lastGain,
      continuity,
    },
  };
}

export function rgbToOpticalDensity(rgb, floor = 0.035) {
  const out = new Float32Array(3);
  for (let c = 0; c < 3; c++) out[c] = -Math.log(Math.max(floor, Math.min(1, rgb[c])));
  return out;
}

export function renderRgbFromOpticalDepth(opticalDepth, background = [1, 1, 1]) {
  const pixels = opticalDepth.length / 3;
  const out = new Float32Array(opticalDepth.length);
  for (let p = 0; p < pixels; p++) {
    for (let c = 0; c < 3; c++) out[p * 3 + c] = background[c] * Math.exp(-opticalDepth[p * 3 + c]);
  }
  return out;
}

export function weightedRgbMse(targetRgb, renderedRgb, importance) {
  let err = 0, wsum = 0;
  const pixels = targetRgb.length / 3;
  for (let p = 0; p < pixels; p++) {
    const w = importance ? importance[p] : 1;
    if (w <= 0) continue;
    for (let c = 0; c < 3; c++) {
      const d = targetRgb[p * 3 + c] - renderedRgb[p * 3 + c];
      err += w * d * d;
    }
    wsum += 3 * w;
  }
  return err / Math.max(EPS, wsum);
}

function opponentError(tr, tg, tb, rr, rg, rb, chromaWeight = 1.6) {
  const dr = tr - rr, dg = tg - rg, db = tb - rb;
  const dy = 0.2126 * dr + 0.7152 * dg + 0.0722 * db;
  const co = dr - db;
  const cg = dg - 0.5 * (dr + db);
  return dy * dy + chromaWeight * (0.5 * co * co + cg * cg);
}

function colorMoveGain(table, edge, colorOd, targetRgb, opticalDepth, importance, background, opacity, chromaWeight) {
  let gain = 0;
  const start = table.offsets[edge], end = table.offsets[edge + 1];
  for (let k = start; k < end; k++) {
    const p = table.indices[k];
    const w = importance ? importance[p] : 1;
    if (w <= 0) continue;
    const cov = table.coverages[k] * opacity;
    const base = p * 3;
    const br = background[0] * Math.exp(-opticalDepth[base]);
    const bg = background[1] * Math.exp(-opticalDepth[base + 1]);
    const bb = background[2] * Math.exp(-opticalDepth[base + 2]);
    const ar = background[0] * Math.exp(-(opticalDepth[base] + colorOd[0] * cov));
    const ag = background[1] * Math.exp(-(opticalDepth[base + 1] + colorOd[1] * cov));
    const ab = background[2] * Math.exp(-(opticalDepth[base + 2] + colorOd[2] * cov));
    const tr = targetRgb[base], tg = targetRgb[base + 1], tb = targetRgb[base + 2];
    gain += w * (opponentError(tr, tg, tb, br, bg, bb, chromaWeight) - opponentError(tr, tg, tb, ar, ag, ab, chromaWeight));
  }
  return gain;
}

function applyColorMove(table, edge, colorOd, opticalDepth, opacity) {
  const start = table.offsets[edge], end = table.offsets[edge + 1];
  for (let k = start; k < end; k++) {
    const p = table.indices[k];
    const cov = table.coverages[k] * opacity;
    for (let c = 0; c < 3; c++) opticalDepth[p * 3 + c] += colorOd[c] * cov;
  }
}

export function solveColorOptical({
  table,
  targetRgb,
  palette,
  importance,
  maxFibers = 8000,
  opacity = 1,
  candidateLimit = 0,
  minColorRun = 2,
  switchPenalty = 0,
  chromaWeight = 1.6,
  background = [1, 1, 1],
  seed = 54321,
  onProgress,
}) {
  if (targetRgb.length !== table.size * table.size * 3) throw new Error('targetRgb size mismatch');
  if (!palette || palette.length < 2) throw new Error('palette must contain at least two RGB colors');
  const incident = buildIncidentIndex(table);
  const ods = palette.map((rgb) => rgbToOpticalDensity(rgb));
  const opticalDepth = new Float32Array(targetRgb.length);
  const current = new Int32Array(palette.length); current.fill(-1);
  const perColorPaths = palette.map(() => []);
  const sequence = [];
  let lastColor = -1, runLength = 0, lastGain = 0;
  for (let step = 0; step < maxFibers; step++) {
    let bestGain = 0, bestEdge = -1, bestColor = -1, bestNext = -1;
    for (let ci = 0; ci < palette.length; ci++) {
      if (lastColor >= 0 && ci !== lastColor && runLength < minColorRun) continue;
      let candidates;
      if (current[ci] >= 0) {
        candidates = incident[current[ci]];
      } else {
        candidates = candidateLimit && candidateLimit < table.a.length
          ? deterministicSubset(table.a.length, candidateLimit, seed + step * 131 + ci * 997)
          : null;
      }
      const scan = (e) => {
        let g = colorMoveGain(table, e, ods[ci], targetRgb, opticalDepth, importance, background, opacity, chromaWeight);
        if (lastColor >= 0 && ci !== lastColor) g -= switchPenalty;
        if (g <= bestGain) return;
        const a = table.a[e], b = table.b[e];
        const next = current[ci] < 0 ? b : (a === current[ci] ? b : a);
        if (current[ci] >= 0 && a !== current[ci] && b !== current[ci]) return;
        bestGain = g; bestEdge = e; bestColor = ci; bestNext = next;
      };
      if (candidates) for (let i = 0; i < candidates.length; i++) scan(candidates[i]);
      else for (let e = 0; e < table.a.length; e++) scan(e);
    }
    if (bestEdge < 0 || bestGain <= 1e-8) break;
    applyColorMove(table, bestEdge, ods[bestColor], opticalDepth, opacity);
    const a = table.a[bestEdge], b = table.b[bestEdge];
    if (current[bestColor] < 0) {
      current[bestColor] = b;
      perColorPaths[bestColor].push(a, b);
    } else {
      current[bestColor] = bestNext;
      perColorPaths[bestColor].push(bestNext);
    }
    if (bestColor === lastColor) runLength++; else { lastColor = bestColor; runLength = 1; }
    sequence.push({ edge: bestEdge, a, b, colorIndex: bestColor, nextNail: bestNext, gain: bestGain });
    lastGain = bestGain;
    if (onProgress && (step % 8 === 0 || step === maxFibers - 1)) onProgress(step + 1, maxFibers, bestGain, bestColor);
  }
  const renderedRgb = renderRgbFromOpticalDepth(opticalDepth, background);
  return {
    sequence,
    perColorPaths,
    opticalDepth,
    renderedRgb,
    metrics: {
      mse: weightedRgbMse(targetRgb, renderedRgb, importance),
      fibers: sequence.length,
      colorsUsed: perColorPaths.filter((x) => x.length > 1).length,
      lastGain,
    },
  };
}

export function makeCircularMask(size, feather = 1.5) {
  const out = new Float32Array(size * size);
  const c = size / 2;
  const r = size / 2 - 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    out[y * size + x] = clamp01((r - d) / Math.max(EPS, feather) + 0.5);
  }
  return out;
}

export function makeSyntheticMonoTarget(size) {
  const out = new Float32Array(size * size);
  const c = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - c) / size, dy = (y - c) / size;
    const g1 = Math.exp(-((dx / 0.18) ** 2 + (dy / 0.25) ** 2) * 1.5);
    const g2 = 0.8 * Math.exp(-(((dx + 0.11) / 0.055) ** 2 + ((dy + 0.05) / 0.035) ** 2) * 2);
    const g3 = 0.8 * Math.exp(-(((dx - 0.11) / 0.055) ** 2 + ((dy + 0.05) / 0.035) ** 2) * 2);
    out[y * size + x] = clamp01(g1 + g2 + g3);
  }
  return out;
}
