'use strict';

const { resolveAsset, placementTopLeft } = require('./sprite-manifest.cjs');
const { resolveActorLayers } = require('./scene-characters.cjs');

const CAMERA_PRESETS = {
  wide: { w: 135, h: 132, fixedScale: 8 },
  medium: { w: 90, h: 88, fixedScale: 12 },
  close: { w: 60, h: 59, fixedScale: 18 }
};

const STAGE_W = 192;
const STAGE_H = 144;
const FLOOR_Y = 136;
const WALL_GAP = 12;
const MARGIN = 4;

function unionRect(acc, rect) {
  if (!rect || rect.w <= 0 || rect.h <= 0) return acc;
  if (!acc) return { ...rect };
  const x1 = Math.min(acc.x, rect.x);
  const y1 = Math.min(acc.y, rect.y);
  const x2 = Math.max(acc.x + acc.w, rect.x + rect.w);
  const y2 = Math.max(acc.y + acc.h, rect.y + rect.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function actorSceneBounds(manifest, name, def, t = 0) {
  if (!def || def.x == null || def.y == null) return null;
  let box = null;
  const layers = resolveActorLayers(manifest, { ...def, actor: def.actor || name }, { time: t, talking: false });
  for (const assetName of layers) {
    try {
      const spec = resolveAsset(manifest, assetName, { frameIndex: 0, lightVariant: 'day' });
      const rect = placementTopLeft(spec, def.x, def.y);
      rect.w = spec.w;
      rect.h = spec.h;
      box = unionRect(box, rect);
    } catch { /* skip */ }
  }
  return box;
}

function presetFromCropRef(crop) {
  if (crop.cameraPreset) return crop.cameraPreset;
  if (crop.w === 135 && crop.h === 132) return 'wide';
  if (crop.w === 90 && crop.h === 88) return 'medium';
  if (crop.w === 60 && crop.h === 59) return 'close';
  return 'medium';
}

function solveKitchenCrop({ presetName, contentBoxes, verticalBoxes, floorY = FLOOR_Y }) {
  let preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.medium;
  let box = null;
  for (const b of contentBoxes) box = unionRect(box, b);
  if (!box) {
    return { x: 2, y: 12, w: preset.w, h: preset.h, fixedScale: preset.fixedScale, cameraPreset: presetName };
  }
  box = { x: box.x - MARGIN, y: box.y - MARGIN, w: box.w + MARGIN * 2, h: box.h + MARGIN * 2 };
  let vbox = box;
  if (verticalBoxes?.length) {
    vbox = null;
    for (const b of verticalBoxes) vbox = unionRect(vbox, b);
    if (vbox) {
      vbox = { x: vbox.x - MARGIN, y: vbox.y - MARGIN, w: vbox.w + MARGIN * 2, h: vbox.h + MARGIN * 2 };
    }
  }
  let name = presetName;
  const innerTop = (vbox || box).y + MARGIN;
  const innerW = box.w - MARGIN * 2;
  while (name !== 'wide' && innerW > (CAMERA_PRESETS[name]?.w ?? preset.w) - 1) {
    name = name === 'close' ? 'medium' : 'wide';
  }
  preset = CAMERA_PRESETS[name] || preset;
  if (name === 'wide') {
    preset = CAMERA_PRESETS.wide;
  }
  let cropX = box.x + box.w / 2 - preset.w / 2;
  const maxCropY = Math.min(STAGE_H - preset.h, floorY - preset.h + 8);
  let cropY = Math.min(maxCropY, innerTop - WALL_GAP);
  let cropH = preset.h;
  if (name === 'wide') {
    cropY = 12;
    cropH = CAMERA_PRESETS.wide.h;
  } else if (name === 'close' && innerTop - WALL_GAP > cropY) {
    cropY = Math.max(0, innerTop - WALL_GAP);
    cropH = Math.min(preset.h, STAGE_H - cropY);
    cropH = Math.max(44, cropH);
    if (cropY + cropH > STAGE_H) cropY = STAGE_H - cropH;
  }
  cropX = Math.max(0, Math.min(STAGE_W - preset.w, cropX));
  cropY = Math.max(0, cropY);
  const outPreset = name === 'wide' ? CAMERA_PRESETS.wide : preset;
  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    w: outPreset.w,
    h: name === 'wide' ? outPreset.h : cropH,
    fixedScale: outPreset.fixedScale,
    cameraPreset: name
  };
}

function rectInsideCrop(rect, crop) {
  return rect.x >= crop.x && rect.y >= crop.y &&
    rect.x + rect.w <= crop.x + crop.w && rect.y + rect.h <= crop.y + crop.h;
}

module.exports = {
  CAMERA_PRESETS,
  actorSceneBounds,
  solveKitchenCrop,
  presetFromCropRef,
  rectInsideCrop,
  FLOOR_Y,
  WALL_GAP
};
