/**
 * Verbatim camera table from style/canonical/sets/floor_strips/handoff_cameras.json
 */
let table = null;

export async function loadHandoffCameras(baseUrl = '') {
  if (table) return table;
  const url = `${baseUrl}handoff_cameras.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`handoff_cameras.json ${res.status}`);
  table = await res.json();
  return table;
}

function requireTable() {
  if (!table) throw new Error('handoff cameras not loaded');
  return table;
}

export function handoffSetFromSceneCfg(cfg) {
  if (cfg?.stairwell) return 'stairwell';
  if (cfg?.rooftop) return 'rooftop';
  return 'kitchen';
}

export function handoffCameraCrop(setName, sizeName) {
  const t = requireTable();
  const cam = t.cameras?.[setName]?.[sizeName];
  const size = t.presetSize?.[sizeName];
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

export function resolveHandoffCropRef(cfg, cropRef) {
  const setName = handoffSetFromSceneCfg(cfg);
  const name = typeof cropRef === 'string' ? cropRef : cropRef?.cameraPreset;
  if (!name) throw new Error('crop ref required');
  return handoffCameraCrop(setName, name);
}

export function getHandoffTable() {
  return requireTable();
}
