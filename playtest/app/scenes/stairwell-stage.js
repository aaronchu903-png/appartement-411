/**
 * Stairwell / 4th-floor landing set (pack B stairwell_set_r1).
 */

export function isStairwellScene(cfg, manifest) {
  return !!(cfg?.stairwell || manifest?.stairwellStage);
}

export function stairwellStageMeta(manifest, cfg) {
  return manifest?.stairwellStage || {
    horizon: cfg?.room?.horizon ?? 128,
    feetLine: cfg?.room?.floorTop ?? 136,
    width: cfg?.scene?.width ?? 192,
    height: cfg?.scene?.height ?? 144
  };
}

/** Draw order from SLOTS_stairwell_NOTES.md (graded layers; ungraded drawn after grade in player). */
export function drawStairwellScenery(drawLogicalAsset, { lightVariant = 'day', skipFloorTiles = false } = {}) {
  const horizon = 128;
  drawLogicalAsset('backdrop.stairwell', 0, 0);
  if (!skipFloorTiles) {
    drawLogicalAsset('backdrop.stairwell_floor', 0, horizon);
  }
  drawLogicalAsset('prop.pipe_run', 4, 123);
  drawLogicalAsset('prop.pipe_h', 6, 62);
  drawLogicalAsset('prop.notice_board', 46, 84);
  drawLogicalAsset('prop.mailboxes', 46, 112);
  drawLogicalAsset('prop.wall_lamp', 64, 84);
  drawLogicalAsset('prop.minuterie_off', 95, 107);
  drawLogicalAsset('prop.door_neighbour_closed', 22, 128);
  drawLogicalAsset('prop.door_home_closed', 78, 128);
  drawLogicalAsset('prop.stairs', 114, 130);
  drawLogicalAsset('prop.radiator', 104, 127);
  drawLogicalAsset('prop.doormat_plain', 22, 131);
  drawLogicalAsset('prop.doormat_home', 78, 131);
  drawLogicalAsset('prop.plant_landing', 59, 131);
  if (lightVariant === 'night') {
    drawLogicalAsset('prop.ceiling_bulb_off', 104, 0);
  } else {
    drawLogicalAsset('prop.ceiling_bulb_off', 104, 0);
  }
}

export function drawStairwellUngradedEmitters(drawLogicalAsset, { lightVariant = 'day' } = {}) {
  drawLogicalAsset('prop.landing_window', 133, 77);
  if (lightVariant === 'night') {
    drawLogicalAsset('prop.ceiling_bulb_on', 104, 0);
    drawLogicalAsset('prop.minuterie_on', 95, 107);
  }
}

export const STAIRWELL_CROP_LIBRARY = {
  wide: { x: 2, y: 12, w: 135, h: 132, fixedScale: 8, cameraPreset: 'wide' },
  medium: { x: 44, y: 56, w: 90, h: 88, fixedScale: 12, cameraPreset: 'medium' },
  close: { x: 60, y: 85, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' }
};
