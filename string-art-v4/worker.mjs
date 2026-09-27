import {
  buildPackedLineTable,
  solveMonoSparse,
  solveColorOptical,
  solveColorGlobalOptical,
} from './core.mjs';
import { buildColorRoutesFromCounts } from './path.mjs';
import { solveFastLayeredPortrait } from './fast-layered.mjs?v=4';

const cache = new Map();

function tableKey(o) {
  return [o.size, o.nails, o.minGap, o.canvasMm, o.fiberWidthMm, o.density].join(':');
}

function getTable(options, postProgress) {
  const key = tableKey(options);
  if (cache.has(key)) return cache.get(key);
  const table = buildPackedLineTable({
    ...options,
    onProgress: (done, total) => postProgress?.({ phase:'matrix', done, total }),
  });
  cache.set(key, table);
  return table;
}

function compactImageResult(result) {
  if (result.mode === 'color-global') {
    return {
      mode: result.mode,
      routes: result.routes,
      palette: result.palette,
      renderedRgb: result.renderedRgb,
      metrics: result.metrics,
      portrait: result.portrait,
      colorLayering: result.colorLayering,
      backgroundSuppression: result.backgroundSuppression,
      ditherIncludesWhite: result.ditherIncludesWhite,
    };
  }
  return {
    mode: result.mode,
    route: result.route,
    metrics: result.metrics,
    portrait: result.portrait,
    backgroundSuppression: result.backgroundSuppression,
  };
}

self.onmessage = (event) => {
  const msg = event.data;
  try {
    const progress = (data) => self.postMessage({ type:'progress', id:msg.id, ...data });

    if (msg.type === 'prepare-table') {
      const table = getTable(msg.table, progress);
      self.postMessage({ type:'table-ready', id:msg.id, edges:table.a.length });
      return;
    }

    if (msg.type === 'solve-image-v4') {
      const result = solveFastLayeredPortrait({
        size: msg.table.size,
        nails: msg.table.nails,
        minGap: msg.table.minGap,
        rgba: msg.rgba,
        preprocess: msg.preprocess || {},
        palette: msg.palette || {},
        solve: msg.solve || {},
        onProgress: progress,
      });
      self.postMessage({ type:'v4-result', id:msg.id, result:compactImageResult(result) });
      return;
    }

    if (msg.type === 'clear-cache') {
      cache.clear();
      self.postMessage({ type:'cache-cleared', id:msg.id });
      return;
    }

    const table = getTable(msg.table, progress);
    if (msg.type === 'solve-mono') {
      const result = solveMonoSparse({
        table,target:msg.target,importance:msg.importance,...msg.solve,
        onProgress:(done,total,gain)=>progress({phase:'solve',done,total,gain}),
      });
      self.postMessage({ type:'mono-result', id:msg.id, result });
      return;
    }
    if (msg.type === 'solve-color') {
      const result = solveColorOptical({
        table,targetRgb:msg.targetRgb,palette:msg.palette,importance:msg.importance,...msg.solve,
        onProgress:(done,total,gain,colorIndex)=>progress({phase:'solve-color',done,total,gain,colorIndex}),
      });
      self.postMessage({ type:'color-result', id:msg.id, result });
      return;
    }
    if (msg.type === 'solve-color-global') {
      const result = solveColorGlobalOptical({
        table,targetRgb:msg.targetRgb,palette:msg.palette,importance:msg.importance,...msg.solve,
        onProgress:(done,total,gain,colorIndex,sign)=>progress({phase:'solve-color-global',done,total,gain,colorIndex,sign}),
      });
      result.routes=buildColorRoutesFromCounts(table,result.counts,msg.palette.length);
      self.postMessage({ type:'color-global-result', id:msg.id, result });
      return;
    }
    throw new Error('Unknown worker message: '+msg.type);
  } catch (error) {
    self.postMessage({ type:'error', id:msg.id, message:error?.message||String(error), stack:error?.stack||'' });
  }
};