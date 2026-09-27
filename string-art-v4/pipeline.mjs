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
  const mask = importance || makeCircularMask(size, preprocess.maskFeather ?? 1.5);
  onProgress?.({ phase: 'preprocess', done: 1, total: 4 });
  const linearRgb = rgbaToLinearRgb(rgba, { backgroundSrgb: preprocess.backgroundSrgb || [1, 1, 1] });

  if (mode === 'mono') {
    const target = prepareMonoTarget(linearRgb, size, {
      gamma: preprocess.gamma ?? 0.95,
      detail: preprocess.detail ?? 0.45,
      detailRadius: preprocess.detailRadius ?? size / 24,
      toneFloor: preprocess.toneFloor ?? 0,
      toneCeiling: preprocess.toneCeiling ?? 0.96,
      mask,
    });
    onProgress?.({ phase: 'preprocess', done: 4, total: 4 });
    const result = solveMonoSparse({
      table,
      target,
      importance: mask,
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
    result.mode = 'mono-global';
    return result;
  }

  if (mode !== 'color') throw new Error('Unsupported V4 mode: ' + mode);
  onProgress?.({ phase: 'palette', done: 2, total: 4 });
  const selected = palette.linearRgb && palette.linearRgb.length
    ? { linearRgb: palette.linearRgb, hex: palette.hex || [], estimatedError: null, method: 'provided' }
    : chooseThreadPaletteSimulation(linearRgb, size, {
        candidateHex: palette.candidateHex,
        nColors: palette.nColors ?? 5,
        fixedHex: palette.fixedHex ?? ['#111111'],
        mask,
        simulationSize: palette.simulationSize ?? Math.min(72, size),
        blurSigma: palette.blurSigma ?? 1.15,
        maxCombinations: palette.maxCombinations ?? 2500,
      });

  const dithered = useDither ? floydSteinbergDitherLinear(linearRgb, size, selected.linearRgb, mask) : null;
  const targetRgb = dithered ? dithered.rgb : linearRgb;
  onProgress?.({ phase: 'preprocess', done: 4, total: 4 });

  const result = solveColorGlobalOptical({
    table,
    targetRgb,
    palette: selected.linearRgb,
    importance: mask,
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
  result.mode = 'color-global';
  return result;
}
