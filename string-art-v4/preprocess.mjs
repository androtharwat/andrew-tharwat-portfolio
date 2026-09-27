const EPS = 1e-9;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

export const DEFAULT_THREAD_CANDIDATES = [
  '#111111', '#f5f1e8', '#d92d35', '#f2c84b', '#2358a6', '#29a8c7',
  '#c63786', '#2f7d4b', '#e47b2c', '#72452d', '#283a63', '#7a7a7a',
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
  const dithered = floydSteinbergDitherLinear(targetSmall, simSize, paletteLinear, maskSmall).rgb;
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
    const greedy = chooseThreadPalette(targetRgb, { candidateHex, nColors, fixedHex, mask });
    return { ...greedy, method: 'greedy-fallback', combinations: combos };
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
