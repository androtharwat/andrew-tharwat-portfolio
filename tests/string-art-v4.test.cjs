const test = require('node:test');
const assert = require('node:assert/strict');

let core;
test.before(async () => {
  core = await import('../string-art-v4/core.mjs');
});

test('circle pin geometry is stable', () => {
  const pins = core.makeCirclePins({ count: 32, size: 64 });
  assert.equal(pins.length, 64);
  assert.ok(Math.abs(pins[0] - 32) < 0.001);
  assert.ok(pins[1] < 2);
});

test('packed fiber table contains antialiased sparse chords', () => {
  const table = core.buildPackedLineTable({ size: 48, nails: 36, minGap: 3, canvasMm: 600, fiberWidthMm: 1.2, density: 2 });
  assert.ok(table.a.length > 300);
  assert.ok(table.indices.length > table.a.length * 10);
  assert.equal(table.offsets.length, table.a.length + 1);
  assert.ok(table.coverages.some((x) => x > 0 && x < 1));
});

test('global mono sparse solver reduces weighted error', () => {
  const size = 40;
  const table = core.buildPackedLineTable({ size, nails: 32, minGap: 3, fiberWidthMm: 2.0, density: 2 });
  const target = core.makeSyntheticMonoTarget(size);
  const importance = core.makeCircularMask(size);
  const blank = new Float32Array(size * size);
  const before = core.weightedMse(target, blank, importance);
  const result = core.solveMonoSparse({ table, target, importance, maxFibers: 120, opacity: 1, maxRepeat: 2, allowRemove: true, continuity: 'none' });
  assert.ok(result.metrics.mse < before * 0.85, 'expected strong error reduction: ' + before + ' -> ' + result.metrics.mse);
  assert.ok(result.metrics.acceptedAdds > 10);
});

test('joint color solver reduces RGB error and can use multiple thread colors', () => {
  const size = 28;
  const table = core.buildPackedLineTable({ size, nails: 24, minGap: 2, fiberWidthMm: 3.0, density: 2 });
  const mask = core.makeCircularMask(size);
  const target = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = y * size + x;
    const inside = mask[p];
    const left = x < size / 2;
    target[p * 3] = inside ? (left ? 0.35 : 0.85) : 1;
    target[p * 3 + 1] = inside ? 0.68 : 1;
    target[p * 3 + 2] = inside ? (left ? 0.88 : 0.38) : 1;
  }
  const blank = new Float32Array(size * size * 3); blank.fill(1);
  const before = core.weightedRgbMse(target, blank, mask);
  const palette = [[0.25, 0.72, 0.92], [0.92, 0.45, 0.25], [0.15, 0.15, 0.15]];
  const result = core.solveColorOptical({ table, targetRgb: target, palette, importance: mask, maxFibers: 160, opacity: 0.65, candidateLimit: 160, minColorRun: 1 });
  assert.ok(result.metrics.mse < before, 'expected color error reduction: ' + before + ' -> ' + result.metrics.mse);
  assert.ok(result.metrics.colorsUsed >= 2);
});
