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
