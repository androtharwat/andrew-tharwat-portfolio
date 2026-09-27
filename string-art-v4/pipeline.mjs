import {
  makeCircularMask,
  solveMonoSparse,
  solveColorGlobalOptical,
} from './core.mjs';
import {
  rgbaToLinearRgb,
  prepareMonoTarget,
  chooseThreadPaletteSimulation,
  floydSteinbergDitherLinear,
  buildPortraitPriorityMaps,
  buildPaletteAffinityMap,
} from './preprocess.mjs';
import {
  expandCountsToEdges,
  coverEulerTrails,
  stitchTrailsAlongPerimeter,
  buildColorRoutesFromCounts,
} from './path.mjs';

export function buildMonoRouteFromCounts(table, counts) {
  const edges = expandCountsToEdges(table, counts);
  const trails = coverEulerTrails(edges, table.nails);
  const stitched = stitchTrailsAlongPerimeter(trails, table.nails);
  return {
    selectedFibers: edges.length,
    trails,
    sequence: stitched.sequence,
    connectors: stitched.connectors,
    trailStarts: stitched.trailStarts,
  };
}


function fastColorizeGeometry(table, monoCounts, targetRgb, paletteLinear, importance, colorAffinity, opacity = 0.35) {
  const colors = paletteLinear.length;
  const counts = new Uint8Array(table.a.length * colors);
  const perEdgeAssigned = new Uint8Array(colors);
  let fibers = 0;

  for (let e = 0; e < table.a.length; e++) {
    const copies = monoCounts[e] || 0;
    if (!copies) continue;
    const scores = new Float64Array(colors);
    const start = table.offsets[e], end = table.offsets[e + 1];

    for (let k = start; k < end; k++) {
      const p = table.indices[k], cov = table.coverages[k];
      const b = p * 3;
      const lum = 0.2126 * targetRgb[b] + 0.7152 * targetRgb[b + 1] + 0.0722 * targetRgb[b + 2];
      const dark = Math.max(0, Math.min(1, 1 - lum));
      const w = cov * (importance ? importance[p] : 1) * (0.20 + 0.80 * dark);
      for (let ci = 0; ci < colors; ci++) {
        let affinity = colorAffinity[p * colors + ci] || 0;
        if (ci === 0) affinity *= 0.72 + 0.72 * dark;
        scores[ci] += w * affinity;
      }
    }

    perEdgeAssigned.fill(0);
    for (let n = 0; n < copies; n++) {
      let best = 0, bestScore = -Infinity;
      for (let ci = 0; ci < colors; ci++) {
        const diversified = scores[ci] / (1 + perEdgeAssigned[ci] * 0.55);
        if (diversified > bestScore) { bestScore = diversified; best = ci; }
      }
      counts[e * colors + best]++;
      perEdgeAssigned[best]++;
      fibers++;
    }
  }

  const opticalDepth = new Float32Array(targetRgb.length);
  const ods = paletteLinear.map((rgb) => rgb.map((v) => -Math.log(Math.max(0.035, Math.min(1, v)))));
  const used = new Uint8Array(colors);
  for (let e = 0; e < table.a.length; e++) {
    const start = table.offsets[e], end = table.offsets[e + 1];
    for (let ci = 0; ci < colors; ci++) {
      const n = counts[e * colors + ci] || 0;
      if (!n) continue;
      used[ci] = 1;
      const od = ods[ci];
      for (let k = start; k < end; k++) {
        const p = table.indices[k], cov = table.coverages[k] * opacity * n, b = p * 3;
        opticalDepth[b] += od[0] * cov;
        opticalDepth[b + 1] += od[1] * cov;
        opticalDepth[b + 2] += od[2] * cov;
      }
    }
  }

  const renderedRgb = new Float32Array(targetRgb.length);
  let err = 0, wsum = 0;
  for (let p = 0; p < targetRgb.length / 3; p++) {
    const b = p * 3, w = importance ? importance[p] : 1;
    const r = Math.exp(-opticalDepth[b]), g = Math.exp(-opticalDepth[b + 1]), bb = Math.exp(-opticalDepth[b + 2]);
    renderedRgb[b] = r; renderedRgb[b + 1] = g; renderedRgb[b + 2] = bb;
    if (w > 0) {
      const dr = targetRgb[b] - r, dg = targetRgb[b + 1] - g, db = targetRgb[b + 2] - bb;
      err += w * (dr * dr + dg * dg + db * db);
      wsum += 3 * w;
    }
  }

  return {
    counts,
    renderedRgb,
    metrics: {
      fibers,
      colorsUsed: used.reduce((s, v) => s + v, 0),
      mse: err / Math.max(1e-9, wsum),
      continuity: 'fast-color-geometry',
    },
  };
}

export function solveImageV4({
  table,
  rgba,
  mode = 'color',
  preprocess = {},
  palette = {},
  solve = {},
  useDither = true,
  importance = null,
  onProgress,
}) {
  const size = table.size;
  if (!rgba || rgba.length !== size * size * 4) throw new Error('RGBA buffer must match table size');
  const geometryMask = makeCircularMask(size, preprocess.maskFeather ?? 1.5);
  onProgress?.({ phase: 'preprocess', done: 1, total: 4 });
  const linearRgb = rgbaToLinearRgb(rgba, { backgroundSrgb: preprocess.backgroundSrgb || [1, 1, 1] });
  const portraitMaps = preprocess.portraitPriority === false ? null : buildPortraitPriorityMaps(linearRgb, size, {
    mask: geometryMask,
    faceBox: preprocess.faceBox || null,
    backgroundWeight: preprocess.backgroundWeight ?? 0.18,
    faceBoost: preprocess.faceBoost ?? 1.15,
    edgeBoost: preprocess.edgeBoost ?? 1.65,
    featureBoost: preprocess.featureBoost ?? 2.15,
    darkDetailBoost: preprocess.darkDetailBoost ?? 0.55,
    avoidanceBoost: preprocess.avoidanceBoost ?? 1,
  });
  const importanceMap = importance || portraitMaps?.importance || geometryMask;
  const avoidanceMap = portraitMaps?.avoidance || null;
  let workingRgb = linearRgb;
  const suppress = portraitMaps ? Math.max(0, Math.min(0.95, preprocess.backgroundSuppress ?? 0)) : 0;
  if (suppress > 0 && portraitMaps?.subjectMap) {
    workingRgb = new Float32Array(linearRgb.length);
    for (let p = 0; p < size * size; p++) {
      const subject = Math.max(0, Math.min(1, portraitMaps.subjectMap[p] || 0));
      const amount = suppress * Math.pow(1 - subject, 1.25);
      const base = p * 3;
      workingRgb[base] = linearRgb[base] * (1 - amount) + amount;
      workingRgb[base + 1] = linearRgb[base + 1] * (1 - amount) + amount;
      workingRgb[base + 2] = linearRgb[base + 2] * (1 - amount) + amount;
    }
  }

  if (mode === 'mono') {
    const target = prepareMonoTarget(workingRgb, size, {
      gamma: preprocess.gamma ?? 0.95,
      detail: preprocess.detail ?? 0.45,
      detailRadius: preprocess.detailRadius ?? size / 24,
      toneFloor: preprocess.toneFloor ?? 0,
      toneCeiling: preprocess.toneCeiling ?? 0.96,
      mask: geometryMask,
    });
    onProgress?.({ phase: 'preprocess', done: 4, total: 4 });
    const result = solveMonoSparse({
      table,
      target,
      importance: importanceMap,
      avoidance: avoidanceMap,
      crossingPenalty: solve.crossingPenalty ?? (portraitMaps ? 0.12 : 0),
      maxFibers: solve.maxFibers ?? 4500,
      opacity: solve.opacity ?? 1,
      maxRepeat: solve.maxRepeat ?? 2,
      allowRemove: solve.allowRemove ?? true,
      continuity: 'none',
      candidateLimit: solve.candidateLimit ?? 0,
      refreshEvery: solve.refreshEvery ?? 32,
      rescueMultiplier: solve.rescueMultiplier ?? 3,
      seed: solve.seed ?? 12345,
      onProgress: (done, total, gain) => onProgress?.({ phase: 'solve-mono-global', done, total, gain }),
    });
    result.route = buildMonoRouteFromCounts(table, result.counts);
    result.target = target;
    result.portrait = portraitMaps ? { enabled: true, faceBox: portraitMaps.faceBox } : { enabled: false };
    result.backgroundSuppression = suppress;
    result.mode = 'mono-global';
    return result;
  }

  if (mode !== 'color') throw new Error('Unsupported V4 mode: ' + mode);
  onProgress?.({ phase: 'palette', done: 2, total: 4 });
  const selected = palette.linearRgb && palette.linearRgb.length
    ? { linearRgb: palette.linearRgb, hex: palette.hex || [], estimatedError: null, method: 'provided' }
    : chooseThreadPaletteSimulation(workingRgb, size, {
        candidateHex: palette.candidateHex,
        nColors: palette.nColors ?? 5,
        fixedHex: palette.fixedHex ?? ['#111111'],
        mask: importanceMap,
        simulationSize: palette.simulationSize ?? Math.min(72, size),
        blurSigma: palette.blurSigma ?? 1.15,
        maxCombinations: palette.maxCombinations ?? 2500,
      });

  const ditherPalette = [[1, 1, 1], ...selected.linearRgb];
  const dithered = useDither ? floydSteinbergDitherLinear(workingRgb, size, ditherPalette, geometryMask) : null;
  let targetRgb = workingRgb;
  if (dithered) {
    const ditherBlend = Math.max(0, Math.min(1, preprocess.ditherBlend ?? 0.28));
    targetRgb = new Float32Array(workingRgb.length);
    for (let i = 0; i < targetRgb.length; i++) targetRgb[i] = workingRgb[i] * (1 - ditherBlend) + dithered.rgb[i] * ditherBlend;
  }
  onProgress?.({ phase: 'preprocess', done: 4, total: 4 });

  const affinityStrength = solve.affinityStrength ?? 1.35;
  const colorAffinity = buildPaletteAffinityMap(targetRgb, selected.linearRgb, importanceMap, {
    temperature: preprocess.colorAffinityTemperature ?? 0.07,
  });
  let result;
  if (solve.fastColorGeometry !== false) {
    const geometryTarget = prepareMonoTarget(targetRgb, size, {
      gamma: preprocess.gamma ?? 0.92,
      detail: preprocess.detail ?? 0.72,
      detailRadius: preprocess.detailRadius ?? size / 26,
      toneFloor: preprocess.toneFloor ?? 0,
      toneCeiling: preprocess.toneCeiling ?? 0.985,
      mask: geometryMask,
    });
    const geometry = solveMonoSparse({
      table,
      target: geometryTarget,
      importance: importanceMap,
      avoidance: avoidanceMap,
      crossingPenalty: solve.crossingPenalty ?? (portraitMaps ? 0.12 : 0),
      maxFibers: solve.maxFibers ?? 7000,
      opacity: solve.geometryOpacity ?? 0.82,
      maxRepeat: solve.maxRepeat ?? 5,
      allowRemove: false,
      continuity: 'none',
      candidateLimit: solve.candidateLimit ?? 110,
      refreshEvery: 0,
      rescueMultiplier: solve.rescueMultiplier ?? 2,
      timeBudgetMs: solve.timeBudgetMs ?? 7000,
      seed: solve.seed ?? 24681357,
      onProgress: (done, total, gain) => onProgress?.({ phase: 'solve-color-fast', done, total, gain }),
    });
    result = fastColorizeGeometry(
      table,
      geometry.counts,
      targetRgb,
      selected.linearRgb,
      importanceMap,
      colorAffinity,
      solve.opacity ?? 0.35
    );
    result.geometryMetrics = geometry.metrics;
    result.fastColorGeometry = true;
  } else result = solveColorGlobalOptical({
    table,
    targetRgb,
    palette: selected.linearRgb,
    importance: importanceMap,
    avoidance: avoidanceMap,
    crossingPenalty: solve.crossingPenalty ?? (portraitMaps ? 0.09 : 0),
    colorAffinity,
    affinityStrength,
    maxFibers: solve.maxFibers ?? 10000,
    opacity: solve.opacity ?? 1,
    maxRepeat: solve.maxRepeat ?? 1,
    allowRemove: solve.allowRemove ?? true,
    candidateLimit: solve.candidateLimit ?? 0,
    refreshEvery: solve.refreshEvery ?? 48,
    removalEvery: solve.removalEvery ?? 10,
    removalLimit: solve.removalLimit ?? 180,
    rescueMultiplier: solve.rescueMultiplier ?? 3,
    chromaWeight: solve.chromaWeight ?? 1.8,
    background: solve.background || [1, 1, 1],
    seed: solve.seed ?? 24681357,
    minGain: solve.minGain ?? 1e-8,
    onProgress: (done, total, gain, colorIndex, sign) => onProgress?.({ phase: 'solve-color-global', done, total, gain, colorIndex, sign }),
  });
  result.routes = buildColorRoutesFromCounts(table, result.counts, selected.linearRgb.length);
  result.palette = selected;
  result.targetRgb = targetRgb;
  result.ditherIndexMap = dithered?.indexMap || null;
  result.ditherIncludesWhite = Boolean(dithered);
  result.colorLayering = { enabled: true, affinityStrength, method: result.fastColorGeometry ? 'fast-geometry-colorize' : 'global-optical' };
  result.portrait = portraitMaps ? { enabled: true, faceBox: portraitMaps.faceBox } : { enabled: false };
  result.mode = 'color-global';
  return result;
}
