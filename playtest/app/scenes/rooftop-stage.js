/**
 * Rooftop set draw order and light hooks (pack B rooftop_set_r1).
 */

export function isRooftopScene(cfg, manifest) {
  return !!(cfg?.rooftop || manifest?.rooftopStage);
}

export function rooftopStageMeta(manifest, cfg) {
  return manifest?.rooftopStage || {
    horizon: cfg?.room?.horizon ?? 128,
    feetLine: cfg?.room?.floorTop ?? 136,
    width: cfg?.scene?.width ?? 192,
    height: cfg?.scene?.height ?? 144
  };
}

/** Draw order from SLOTS_rooftop_NOTES.md (ungraded scenery + deck + parapet). */
export function drawRooftopBackdrop(drawLogicalAsset, drawStringLights) {
  drawLogicalAsset('backdrop.rooftop_sky', 0, 0);
  drawLogicalAsset('backdrop.rooftop_skyline_far', 88, 115);
  drawLogicalAsset('backdrop.rooftop_tower', 118, 92);
  drawLogicalAsset('backdrop.rooftop_skyline', 48, 115);
  drawLogicalAsset('backdrop.rooftop_floor', 0, 128);
  drawLogicalAsset('prop.parapet', 16, 127);
  if (drawStringLights) drawStringLights();
}

export const ROOFTOP_CROP_LIBRARY = {
  wide: { x: 2, y: 12, w: 135, h: 132, fixedScale: 8, cameraPreset: 'wide' },
  medium: { x: 40, y: 56, w: 90, h: 88, fixedScale: 12, cameraPreset: 'medium' },
  close: { x: 60, y: 85, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' }
};
