import { relationPlace, relationHoldsAt } from './relation-place.js';
const REG_ROOT = new URL('../../tech/sitcom_engine/registry/', import.meta.url);

const cache = new Map();

async function loadJson(name) {
  if (cache.has(name)) return cache.get(name);
  const res = await fetch(new URL(name, REG_ROOT));
  if (!res.ok) throw new Error(`registry ${name}: ${res.status}`);
  const data = await res.json();
  cache.set(name, data);
  return data;
}

export async function loadRegistryBundle() {
  const [characters, marks, props, sfx, catActions, lightPresets, modules, flags, learning, uiComponents] = await Promise.all([
    loadJson('characters.json'),
    loadJson('marks.json'),
    loadJson('props.json'),
    loadJson('sfx.json'),
    loadJson('cat_actions.json'),
    loadJson('light_presets.json'),
    loadJson('modules.json'),
    loadJson('flags.json'),
    loadJson('learning.json'),
    loadJson('ui_components.json')
  ]);
  return {
    characters: characters.characters,
    marks: marks.sets,
    props: props.props,
    sfx: sfx.sfx || sfx,
    catActions: catActions.actions || catActions,
    lightPresets: lightPresets.presets || lightPresets,
    modules: modules.modules || modules,
    flags: flags.flags || flags,
    learning,
    uiComponents,
    registryVersion: marks.registry_version
  };
}

export function markCoords(registry, setId, markId) {
  const set = registry.marks?.[setId];
  if (!set) return null;
  const mk = (set.marks || []).find((m) => m.id === markId);
  if (!mk) return null;
  return { x: mk.x, y: mk.y, facing: mk.facing };
}

/** Prop-level placement: props.json `<prop>.spots[set][mark]` overrides the set mark for that prop only. */
/**
 * fix19 (generic): a prop's resolved spot on a set mark. A FLOOR prop (footprint top below a furniture's top) whose
 * footprint overlaps a `floor_props_beside` furniture's x0..x1 would read as UNDER it: slide it beside that furniture
 * on its nearer side, 1px clear. Returns the raw spot otherwise (or null when the prop has no spot there).
 */
export function resolvePropSpot(registry, setId, propId, markId, world = null) {
  const r = resolvePropSpotStatic(registry, setId, propId, markId, world?.sceneKey || null, world);
  return world ? yieldPropToFeet(registry, setId, propId, r, world) : r;
}
function resolvePropSpotStatic(registry, setId, propId, markId, sceneKey = null, world = null) {
  const def = registry?.props?.[propId];
  // fix19b (Réalisateur ruling 1): a prop may carry a per-scene mark (props.json scene_spots["<day>/<scene>"][set][mark]),
  // used as-is (an authored, ruled position; no furniture slide)
  const ss = sceneKey && def?.scene_spots?.[sceneKey]?.[setId]?.[markId];
  if (ss && Number.isFinite(ss.x) && Number.isFinite(ss.y)) return clearSceneSpot(registry, setId, def?.footprint, { ...ss, sceneSpot: sceneKey }, world, propId);
  const spot = def?.spots?.[setId]?.[markId];
  if (!spot || !Number.isFinite(spot.x) || !Number.isFinite(spot.y)) return spot || null;
  const fp = def.footprint;
  const furn = registry?.marks?.[setId]?.furniture || [];
  if (!fp) return spot;
  for (const f of furn) {
    if (!f?.floor_props_beside) continue;
    const l = spot.x - fp.ax; const r = l + fp.w - 1; const top = spot.y - fp.ay;
    if (top <= f.top || r < f.x0 || l > f.x1) continue;
    // marks.json furniture.beside_side: 'front' moves the prop downstage so its top clears the furniture base by 1px
    // (stays on its x, in front of the furniture); 'left'|'right' force a side; else the nearer side
    if (f.beside_side === 'front') {
      if (top > f.bottom) continue;
      return { ...spot, y: f.bottom + 2 + fp.ay, slidFrom: { x: spot.x, y: spot.y }, besideFurniture: f.id };
    }
    const toLeft = f.beside_side === 'left' || f.beside_side === 'right' ? f.beside_side === 'left' : (spot.x - f.x0) <= (f.x1 - spot.x);
    const x = toLeft ? f.x0 - 2 - (fp.w - 1) + fp.ax : f.x1 + 2 + fp.ax;
    return { ...spot, x, slidFrom: spot.x, besideFurniture: f.id };
  }
  return spot;
}

// fix20 (generic): an authored scene spot must not overlap ANY furniture footprint (x0..x1, top..bottom); if it does,
// it moves downstage so its top clears the furniture bottom by 2px (stays on its x).
// fix21 A (Réalisateur 11:10, d3 h L19): fix20 pushed a furniture-overlapping scene spot downstage to bottom+3, which
// put the d3/d5 box at y148, i.e. 4 rows BELOW the 144-row stage: drawn half off the floor, in front of the actors' feet
// line, it read as a huge foreground object in the close. Now: (1) slide along the floor line, but only within
// SCENE_SPOT_SLIDE px of the authored x (it stays "beside" what it was placed beside) and clear of actors' feet;
// (2) otherwise step downstage just past the furniture, clamped so the whole prop stays on the stage (y1 <= STAGE_H-1).
export const SCENE_SPOT_SLIDE = 12;
export const STAGE_H = 144;
export function clearSceneSpot(registry, setId, fp, spot, world = null, propId = null) {
  if (!fp || !spot) return spot;
  const furn = (registry?.marks?.[setId]?.furniture || []).filter((f) => Number.isFinite(f?.bottom));
  // fix21 A2: other on-stage floor props (raw spots) are obstacles too, so two floor props never stack into one blob
  const others = [];
  const order = Object.keys(world?.props || {}); const meAt = propId ? order.indexOf(propId) : -1;
  for (const [pid, p] of Object.entries(world?.props || {})) {
    if (meAt >= 0 && order.indexOf(pid) > meAt) continue; // fix22 D: only earlier-shown props are obstacles (later ones yield)
    const d = registry?.props?.[pid]; const sp = d?.spots?.[setId]?.[p?.at] || (p?.at ? markCoords(registry, setId, p.at) : null);
    if (pid === propId || !d?.footprint || !sp || !Number.isFinite(sp.x) || !Number.isFinite(sp.y)) continue;
    const r = propRectAt(d.footprint, sp.x, sp.y); others.push({ id: pid, x0: r.x0, x1: r.x1, top: r.y0, bottom: r.y1 });
  }
  const hit = (x, y) => { const r = propRectAt(fp, x, y); return furn.find((f) => !(r.x1 < f.x0 || r.x0 > f.x1 || r.y1 < f.top || r.y0 > f.bottom)); };
  const feet = world ? actorFeetBoxes(registry, setId, world) : [];
  const hitP = (x, y) => { const r = propRectAt(fp, x, y); return others.find((f) => boxesClash(r, { x0: f.x0, x1: f.x1, y0: f.top, y1: f.bottom }, 1)); };
  const free = (x, y) => { const r = propRectAt(fp, x, y); return r.x0 >= 0 && r.x1 <= 191 && !hit(x, y) && !hitP(x, y) && !feet.some((f) => boxesClash(r, f, PROP_FEET_MARGIN)); };
  const first = hit(spot.x, spot.y);
  if (!first) {
    const op = hitP(spot.x, spot.y);
    if (!op) return spot;
    // a prop-only clash slides at most SCENE_SPOT_SLIDE (the mark is the composition); past that the props share the spot
    for (let d = 1; d <= SCENE_SPOT_SLIDE; d += 1) for (const x of [spot.x - d, spot.x + d]) if (free(x, spot.y)) return { ...spot, x, slidFrom: spot.x, clearOf: op.id };
    return spot;
  }
  for (let d = 1; d <= SCENE_SPOT_SLIDE; d += 1) for (const x of [spot.x - d, spot.x + d]) if (free(x, spot.y)) return { ...spot, x, slidFrom: spot.x, clearOf: first.id };
  let y = spot.y;
  for (const f of furn) { const r = propRectAt(fp, spot.x, y); if (!(r.x1 < f.x0 || r.x0 > f.x1 || r.y1 < f.top || r.y0 > f.bottom)) y = Math.max(y, f.bottom + 1 + fp.ay); }
  const maxY = STAGE_H - 1 - (fp.h - 1 - fp.ay);
  if (y <= maxY || true) { const yy = Math.min(y, maxY); if (hitP(spot.x, yy)) for (let d = 1; d <= SCENE_SPOT_SLIDE * 2; d += 1) for (const x of [spot.x - d, spot.x + d]) { const r = propRectAt(fp, x, yy); if (r.x0 >= 0 && r.x1 <= 191 && !hitP(x, yy) && !feet.some((f) => boxesClash(r, f, PROP_FEET_MARGIN)) && !furn.some((f) => !(r.x1 < f.x0 || r.x0 > f.x1 || r.y1 < f.top || r.y0 > f.bottom - (y > maxY ? 1 : 0)))) return { ...spot, x, y: yy, clearedFrom: spot.y, slidFrom: spot.x, clearOf: first.id, ...(y > maxY ? { stageClamp: y - maxY } : {}) }; } }
  return { ...spot, y: Math.min(y, maxY), clearedFrom: spot.y, clearOf: first.id, ...(y > maxY ? { stageClamp: y - maxY } : {}) };
}

export function propMarkCoords(registry, setId, propId, markId, world = null) {
  const authored = propMarkCoordsAuthored(registry, setId, propId, markId, world);
  // fix23b (generic): a line placed this prop sur/sous/devant a reference -> its stage position satisfies the relation.
  // An authored spot that already satisfies it is kept; else the relation spot (overrides fix19 floor_props_beside only
  // for that prop); the authored spot when the set has no room.
  const rel = world?.props?.[propId]?.rel;
  if (!rel) return authored;
  if (authored && relationHoldsAt(registry, setId, propId, rel, authored)) return authored;
  const q = relationPlace(registry, setId, propId, rel);
  return q ? { x: q.x, y: q.y, spot: true, relation: q.relation } : authored;
}

function propMarkCoordsAuthored(registry, setId, propId, markId, world = null) {
  const spot = resolvePropSpot(registry, setId, propId, markId, world);
  if (spot && Number.isFinite(spot.x) && Number.isFinite(spot.y)) return { x: spot.x, y: spot.y, facing: spot.facing, spot: true };
  const m = markCoords(registry, setId, markId);
  if (!world || !m || !Number.isFinite(m.x)) return m;
  const y = yieldPropToFeet(registry, setId, propId, { x: m.x, y: m.y ?? 136 }, world); // fix19b: raw-mark props yield too
  return y.yieldedFrom != null ? { ...m, x: y.x, y: y.y } : m; // fix22 D: a depth-stepped yield keeps its y
}


// fix19b (Réalisateur ruling 3): actors keep their marks, props yield. A floor prop whose footprint comes within
// PROP_FEET_MARGIN px of an on-stage actor's feet box slides along x (smallest move, then left before right) until it
// is clear of every actor's feet and not under floor_props_beside furniture. Actor feet = packs/b actor frame 16 wide,
// anchorPoint (8,23): x-8..x+7, bottom 4 rows y-3..y.
export const PROP_FEET_MARGIN = 4;
export const ACTOR_FEET = Object.freeze({ ax: 8, w: 16, h: 4 });
export function actorFeetBoxes(registry, setId, world) {
  const out = [];
  for (const [who, def] of Object.entries(world?.actors || {})) {
    if (!def || who === 'cat' || who === 'croissant') continue;
    const p = markCoords(registry, setId, def.at) || markCoords(registry, 'kitchen', def.at);
    if (!p || !Number.isFinite(p.x)) continue;
    const y = p.y ?? 136;
    out.push({ who, x0: p.x - ACTOR_FEET.ax, x1: p.x - ACTOR_FEET.ax + ACTOR_FEET.w - 1, y0: y - ACTOR_FEET.h + 1, y1: y });
  }
  return out;
}
export function propRectAt(fp, x, y) { const l = x - fp.ax; const t = y - fp.ay; return { x0: l, x1: l + fp.w - 1, y0: t, y1: t + fp.h - 1 }; }
export function boxesClash(a, b, m = 0) { return a.x0 - m <= b.x1 && a.x1 + m >= b.x0 && a.y0 - m <= b.y1 && a.y1 + m >= b.y0; }
export const FLOOR_BAND_Y = 133;
export const PROP_YIELD_MAX_SLIDE = 24;
export const FLOOR_DEPTH_MAX_Y = STAGE_H - 1; // deepest floor row a depth-stepped prop may reach: the last STAGE row (art 0..143); 159 drew d3 hp box 9 rows under the stage
export const FLOOR_DEPTH_OVERHANG = 2; // last-resort pass only: a small floor prop may overhang the stage edge by <= 2 rows rather than slide far off its shot (d5 hp « la clé », Réalisateur-accepted 12:50)
export function floorPropObstacles(registry, setId, propId, world) {
  const out = [];
  const ids = Object.keys(world?.props || {});
  const me = ids.indexOf(propId);
  if (me < 0) return out;
  for (const pid of ids.slice(0, me)) {
    const p = world.props[pid];
    const fp = registry?.props?.[pid]?.footprint;
    if (!p || p.visible === false || !p.at || !fp) continue;
    const c = propMarkCoords(registry, setId, pid, p.at, world);
    if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
    const r = propRectAt(fp, c.x, c.y);
    if (r.y1 >= FLOOR_BAND_Y) out.push({ ...r, prop: pid });
  }
  return out;
}
function yieldPropToFeet(registry, setId, propId, spot, world) {
  const fp = registry?.props?.[propId]?.footprint;
  if (!spot || !fp || !Number.isFinite(spot.x) || !Number.isFinite(spot.y)) return spot;
  const feet = actorFeetBoxes(registry, setId, world);
  // fix22 B/D (generic): a floor prop also yields to every on-stage floor prop shown BEFORE it (world.props order),
  // PROP_FEET_MARGIN px clear, so a later prop never hides an earlier one (d3 hp box_cat over Camille's parcel;
  // d5 hp sock pile / key over box_cat)
  const props = floorPropObstacles(registry, setId, propId, world);
  if (!feet.length && !props.length) return spot;
  const floorProp = propRectAt(fp, spot.x, spot.y).y1 >= FLOOR_BAND_Y;
  if (floorProp) feet.push(...props);
  else if (!feet.length) return spot;
  const allFurn = registry?.marks?.[setId]?.furniture || [];
  const furn = allFurn.filter((f) => f?.floor_props_beside);
  const furnHit = (r) => allFurn.some((f) => Number.isFinite(f?.bottom) && !(r.x1 < f.x0 || r.x0 > f.x1 || r.y1 < f.top || r.y0 > f.bottom));
  const baseInFurn = furnHit(propRectAt(fp, spot.x, spot.y));
  let depthSlack = 0;
  const ok = (x, y = spot.y) => {
    const r = propRectAt(fp, x, y);
    if (y !== spot.y && r.y1 > FLOOR_DEPTH_MAX_Y + depthSlack) return false;
    if (r.x0 < 0 || r.x1 > 191) return false;
    if (feet.some((f) => boxesClash(r, f, PROP_FEET_MARGIN))) return false;
    if (!spot.stageClamp && !baseInFurn && furnHit(r)) return false; // fix21 A: yield never slides a furniture-clear prop INTO furniture (a raw mark already over furniture keeps its depth)
    return !furn.some((f) => r.y0 > f.top && !(r.x1 < f.x0 || r.x0 > f.x1));
  };
  if (ok(spot.x)) return spot;
  // fix22 D (generic): a short x slide (<= PROP_YIELD_MAX_SLIDE) is kept as before; past that a FLOOR prop may also step
  // forward in depth (nearest by |dx|+|dy|, then left first) instead of sliding far across the set and out of its shot
  // (d5 hp L20: « la clé » slid 96->149, off-crop)
  for (let d = 1; d <= PROP_YIELD_MAX_SLIDE; d += 1) for (const x of [spot.x - d, spot.x + d]) if (ok(x)) return { ...spot, x, yieldedFrom: spot.x };
  if (floorProp) {
    // pass 1: on-stage depth steps only; pass 2: <= FLOOR_DEPTH_OVERHANG rows past the stage, still only within a near cost
    for (const slack of [0, FLOOR_DEPTH_OVERHANG]) {
      depthSlack = slack;
      for (let cost = PROP_YIELD_MAX_SLIDE + 1; cost <= PROP_YIELD_MAX_SLIDE + 16; cost += 1) for (let dy = 1; dy <= cost; dy += 1) {
        const dx = cost - dy;
        for (const yy of [spot.y + dy, spot.y - dy]) {
          if (yy < spot.y && propRectAt(fp, spot.x, yy).y1 < FLOOR_BAND_Y) continue;
          for (const x of dx ? [spot.x - dx, spot.x + dx] : [spot.x]) if (ok(x, yy)) return { ...spot, x, y: yy, yieldedFrom: spot.x, yieldedFromY: spot.y };
        }
      }
    }
    depthSlack = 0; // pass 3: no near depth spot -> the plain far x slide (pre-fix22 behaviour)
    for (let cost = PROP_YIELD_MAX_SLIDE + 1; cost <= 191; cost += 1) {
      for (const x of [spot.x - cost, spot.x + cost]) if (ok(x)) return { ...spot, x, yieldedFrom: spot.x };
    }
    return spot;
  }
  for (let d = PROP_YIELD_MAX_SLIDE + 1; d <= 191; d += 1) for (const x of [spot.x - d, spot.x + d]) if (ok(x)) return { ...spot, x, yieldedFrom: spot.x };
  return spot;
}

export function cameraFromHandoff(handoff, setName, shotName) {
  const cam = handoff.cameras?.[setName]?.[shotName];
  const size = handoff.presetSize?.[shotName];
  if (!cam || !size) return null;
  return {
    x: cam.x,
    y: cam.y,
    w: size.w,
    h: size.h,
    fixedScale: cam.fixedScale,
    cameraPreset: shotName,
    ...presetFraming(handoff, setName, cam, size)
  };
}

// Where a preset sits inside the set's wide preset: zoom factor and relative centre.
// Lets band-cover sets (which auto-frame the wide view) still honour medium/close cuts.
export function presetFraming(handoff, setName, cam, size) {
  const wc = handoff.cameras?.[setName]?.wide;
  const ws = handoff.presetSize?.wide;
  if (!wc || !ws || !ws.w || !ws.h) return {};
  return {
    presetZoom: ws.w / size.w,
    presetRelX: (cam.x + size.w / 2 - wc.x) / ws.w,
    presetRelY: (cam.y + size.h / 2 - wc.y) / ws.h
  };
}
