'use strict';

const { assertSceneUsesLogicalNames } = require('./sprite-manifest.cjs');

/** @param {object} cfg scene.json */
function compileSceneConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') throw new Error('scene config must be an object');
  if (!Array.isArray(cfg.shots) || cfg.shots.length === 0) throw new Error('scene config needs shots[]');
  const lib = cfg.cropLibrary || {};
  const resolve = (c) => {
    if (c == null) throw new Error('shot missing crop');
    if (typeof c === 'string') {
      const base = lib[c];
      if (!base) throw new Error(`Unknown crop ref: ${c}`);
      return { ...base };
    }
    if (typeof c === 'object' && typeof c.x === 'number') return { ...c };
    throw new Error('invalid crop');
  };
  const compiled = { ...cfg, shots: cfg.shots.map((sh) => ({ ...sh, crop: resolve(sh.crop) })) };
  if (cfg.startCrop) compiled.startCrop = resolve(cfg.startCrop);
  for (const sh of compiled.shots) {
    if (typeof sh.id === 'undefined') throw new Error('shot missing id');
    if (typeof sh.t0 !== 'number' || typeof sh.t1 !== 'number') throw new Error(`shot ${sh.id} needs t0/t1`);
    if (sh.t1 <= sh.t0) throw new Error(`shot ${sh.id} t1 must exceed t0`);
  }
  const ids = new Set();
  for (const sh of compiled.shots) {
    if (ids.has(sh.id)) throw new Error(`duplicate shot id ${sh.id}`);
    ids.add(sh.id);
  }
  assertSceneUsesLogicalNames(cfg);
  return compiled;
}

module.exports = { compileSceneConfig };
