/**
 * Pure kitchen scene-band layout (CSS px). Used by scene-player and unit tests.
 * All inputs/outputs are CSS pixels unless noted as scaleDev (device px per stage px).
 */

export const KITCHEN_REFERENCE_FLOOR_BAND_FRAC = 124 / 132;

/**
 * @param {number} stageW CSS px
 * @param {number} stageH CSS px
 * @param {number} dpr
 * @param {{ w: number, h: number }} crop stage coords
 */
export function computeKitchenScaleDev(stageW, stageH, dpr, crop) {
  const bandHDev = stageH * dpr;
  const bandWDev = stageW * dpr;
  return Math.max(1, Math.floor(Math.min(bandHDev / crop.h, bandWDev / crop.w)));
}

/**
 * Floor line position in the scene band (CSS px from top of band).
 * Matches Pixel Studio wide reference when crop is 135×132 @ y12 and floorY=136.
 */
export function kitchenFloorBandFrac(crop, floorY = 136) {
  if (!crop?.h) return KITCHEN_REFERENCE_FLOOR_BAND_FRAC;
  return (floorY - crop.y) / crop.h;
}

/**
 * @returns {{ scaleDev: number, scale: number, ox: number, oy: number, drawW: number, drawH: number, floorScreenY: number }}
 */
export function computeKitchenBandLayout({
  stageW,
  stageH,
  dpr,
  crop,
  floorY = 136,
  floorBandFrac = null,
  floorBandFracTarget = null
}) {
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
