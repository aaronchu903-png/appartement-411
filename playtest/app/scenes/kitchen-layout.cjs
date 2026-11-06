'use strict';

const KITCHEN_REFERENCE_FLOOR_BAND_FRAC = 124 / 132;

function computeKitchenScaleDev(stageW, stageH, dpr, crop) {
  const bandHDev = stageH * dpr;
  const bandWDev = stageW * dpr;
  const fit = Math.max(1, Math.floor(Math.min(bandHDev / crop.h, bandWDev / crop.w)));
  if (crop?.fixedScale > 0) return Math.min(crop.fixedScale, fit);
  return fit;
}

function kitchenFloorBandFrac(crop, floorY = 136) {
  if (!crop?.h) return KITCHEN_REFERENCE_FLOOR_BAND_FRAC;
  return (floorY - crop.y) / crop.h;
}

function computeKitchenBandLayout(opts) {
  const {
    stageW,
    stageH,
    dpr,
    crop,
    floorY = 136,
    floorBandFrac = null,
    floorBandFracTarget = null
  } = opts;
  const scaleDev = computeKitchenScaleDev(stageW, stageH, dpr, crop);
  const scale = scaleDev / dpr;
  const drawW = crop.w * scale;
  const drawH = crop.h * scale;
  const frac = floorBandFracTarget ?? floorBandFrac ?? kitchenFloorBandFrac(crop, floorY);
  const floorInCrop = (floorY - crop.y) * scale;
  let oy = stageH * frac - floorInCrop;
  oy = Math.max(0, Math.min(stageH - drawH, oy));
  const ox = (stageW - drawW) / 2;
  const floorScreenY = oy + floorInCrop;
  return { scaleDev, scale, ox, oy, drawW, drawH, floorScreenY, floorBandFrac: floorScreenY / stageH };
}

module.exports = {
  KITCHEN_REFERENCE_FLOOR_BAND_FRAC,
  computeKitchenScaleDev,
  kitchenFloorBandFrac,
  computeKitchenBandLayout
};
