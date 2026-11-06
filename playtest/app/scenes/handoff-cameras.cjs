'use strict';
const table = require('../../style/canonical/sets/floor_strips/handoff_cameras.json');

function handoffSetFromSceneCfg(cfg) {
  if (cfg?.stairwell) return 'stairwell';
  if (cfg?.rooftop) return 'rooftop';
  return 'kitchen';
}

function handoffCameraCrop(setName, sizeName) {
  const cam = table.cameras?.[setName]?.[sizeName];
  const size = table.presetSize?.[sizeName];
  if (!cam || !size) {
    throw new Error(`Unknown handoff camera: ${setName}/${sizeName}`);
  }
  return {
    x: cam.x,
    y: cam.y,
    w: size.w,
    h: size.h,
    fixedScale: cam.fixedScale,
    cameraPreset: sizeName,
    fromHandoff: true
  };
}

function resolveHandoffCropRef(cfg, cropRef) {
  const setName = handoffSetFromSceneCfg(cfg);
  const name = typeof cropRef === 'string' ? cropRef : cropRef?.cameraPreset;
  if (!name) throw new Error('crop ref required');
  return handoffCameraCrop(setName, name);
}

module.exports = {
  handoffSetFromSceneCfg,
  handoffCameraCrop,
  resolveHandoffCropRef,
  getHandoffTable: () => table
};
