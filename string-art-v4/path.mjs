export function expandCountsToEdges(table, counts) {
  const edges = [];
  for (let e = 0; e < counts.length; e++) {
    for (let k = 0; k < counts[e]; k++) edges.push({ a: table.a[e], b: table.b[e], sourceEdge: e });
  }
  return edges;
}

export function coverEulerTrails(edges, nailCount) {
  const adjacency = Array.from({ length: nailCount }, () => []);
  edges.forEach((edge, id) => {
    adjacency[edge.a].push(id);
    adjacency[edge.b].push(id);
  });
  const used = new Uint8Array(edges.length);
  const cursor = new Uint32Array(nailCount);
  const hasUnused = (v) => {
    while (cursor[v] < adjacency[v].length && used[adjacency[v][cursor[v]]]) cursor[v]++;
    return cursor[v] < adjacency[v].length;
  };
  const unusedDegree = (v) => {
    let n = 0;
    for (const id of adjacency[v]) if (!used[id]) n++;
    return n;
  };
  const trails = [];
  let remaining = edges.length;
  while (remaining > 0) {
    let start = -1;
    for (let v = 0; v < nailCount; v++) if (hasUnused(v) && unusedDegree(v) % 2 === 1) { start = v; break; }
    if (start < 0) for (let v = 0; v < nailCount; v++) if (hasUnused(v)) { start = v; break; }
    if (start < 0) break;
    const stack = [start], route = [];
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (!hasUnused(v)) { route.push(stack.pop()); continue; }
      const id = adjacency[v][cursor[v]++];
      if (used[id]) continue;
      used[id] = 1; remaining--;
      const e = edges[id];
      stack.push(e.a === v ? e.b : e.a);
    }
    route.reverse();
    if (route.length > 1) trails.push(route);
  }
  return trails;
}

export function circularNailDistance(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function perimeterSteps(from, to, n) {
  if (from === to) return [];
  const cw = (to - from + n) % n;
  const ccw = (from - to + n) % n;
  const dir = cw <= ccw ? 1 : -1;
  const steps = Math.min(cw, ccw);
  const out = [];
  let cur = from;
  for (let i = 0; i < steps; i++) { cur = (cur + dir + n) % n; out.push(cur); }
  return out;
}

export function orderTrailsByNearestEnds(trails, nailCount) {
  if (!trails.length) return [];
  const remaining = trails.map((trail, i) => ({ trail, i }));
  remaining.sort((a, b) => b.trail.length - a.trail.length);
  const ordered = [remaining.shift().trail];
  while (remaining.length) {
    const end = ordered[ordered.length - 1][ordered[ordered.length - 1].length - 1];
    let best = 0, reverse = false, dist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const t = remaining[i].trail;
      const d0 = circularNailDistance(end, t[0], nailCount);
      const d1 = circularNailDistance(end, t[t.length - 1], nailCount);
      if (d0 < dist) { dist = d0; best = i; reverse = false; }
      if (d1 < dist) { dist = d1; best = i; reverse = true; }
    }
    const next = remaining.splice(best, 1)[0].trail;
    ordered.push(reverse ? [...next].reverse() : next);
  }
  return ordered;
}

export function stitchTrailsAlongPerimeter(trails, nailCount) {
  const ordered = orderTrailsByNearestEnds(trails, nailCount);
  if (!ordered.length) return { sequence: [], connectors: [], trailStarts: [] };
  const sequence = [...ordered[0]], connectors = [], trailStarts = [0];
  for (let i = 1; i < ordered.length; i++) {
    const next = ordered[i];
    const from = sequence[sequence.length - 1], to = next[0];
    const connector = perimeterSteps(from, to, nailCount);
    for (const nail of connector) {
      connectors.push({ from: sequence[sequence.length - 1], to: nail });
      sequence.push(nail);
    }
    trailStarts.push(sequence.length - 1);
    for (let k = 1; k < next.length; k++) sequence.push(next[k]);
  }
  return { sequence, connectors, trailStarts, orderedTrails: ordered };
}
