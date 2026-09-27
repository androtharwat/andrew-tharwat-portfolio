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
      seed: solve.seed ?? 12345,
      onProgress: (done, total, gain) => onProgress?.({ phase: 'solve-mono-global', done, total, gain }),
    });
    result.route = buildMonoRouteFromCounts(table, result.counts);
    result.target = target;
    result.portrait = portraitMaps ? { enabled: true, faceBox: portraitMaps.faceBox } : { enabled: false };
  result.backgroundSuppression = suppress;
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
  const result = solveColorGlobalOptical({
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
  result.colorLayering = { enabled: true, affinityStrength };
  result.portrait = portraitMaps ? { enabled: true, faceBox: portraitMaps.faceBox } : { enabled: false };
  result.mode = 'color-global';
  return result;
}
