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
