import { createWorld, applyStep } from './commands.js';
import { lineRelations } from './relation-framing.js';
import { isFrozenDay } from './frozen-days.js';
import { markCoords, propMarkCoords, resolvePropSpot } from './registry.js';

const POT_DESK_IDS = new Set(['pot_desk_sprout', 'pot_desk_young', 'pot_desk_full']);
const DESK_PLANT_SKIP_IDS = new Set([...POT_DESK_IDS, 'basil_pot']);
const SPECIAL_PROP_IDS = new Set([
  'desk_bare',
  'box_cat',
  'cat_bowl',
  'parcel_closed_floor',
  'parcel_pair',
  'laptop_img_catfood',
  'laptop_img_cattree'
]);

/** fix19: cat actions in which Croissant is out of sight (hidden in box_cat): no cat draw, the box stays still, nothing aims at him. */
export const CAT_HIDDEN_ACTIONS = new Set(['in_box']);
export function catHidden(world) { return !!world?.cat?.action && CAT_HIDDEN_ACTIONS.has(world.cat.action); }

const CAT_ACTION_ASSETS = {
  sleep_curl: 'croissant.sleep_curl.loop',
  in_box: 'croissant.in_box.loop',
  in_box_tail_pop: 'croissant.in_box.tail_pop',
  drink: 'croissant.drink.loop',
  flap_in: 'croissant.flap_in',
  lie: 'croissant.sit',
  sleep: 'croissant.sit',
  sit: 'croissant.sit',
  stand: 'croissant.stand',
  idle: 'croissant.idle',
  walk: 'croissant.walk.0'
};

const ASSET_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

/**
 * Resolve the sprite for a cat_action. Only whitelisted sources count: the built-in map, a registry spec's `asset`
 * field, or a registry string that is exactly one asset id. Free text (e.g. "face.* toward look_at") is a note and
 * never an asset; a note-only action keeps the previous action's sprite (`cat.prev`) or resolves to null.
 */
export function catActionAsset(action, registry, cat = null, depth = 0) {
  if (CAT_ACTION_ASSETS[action]) return CAT_ACTION_ASSETS[action];
  const spec = registry?.catActions?.[action];
  if (spec && typeof spec === 'object' && typeof spec.asset === 'string' && ASSET_ID_RE.test(spec.asset)) return spec.asset;
  if (typeof spec === 'string' && ASSET_ID_RE.test(spec.trim())) return spec.trim();
  if (cat?.prev && depth < 4) return catActionAsset(cat.prev.action, registry, cat.prev, depth + 1);
  return null;
}

/** Position of the action that actually supplies the sprite (a note-only `look` keeps the previous mark). */
function catDrawState(cat, registry) {
  let c = cat;
  for (let i = 0; i < 4 && c; i += 1) {
    const a = c.action;
    const spec = registry?.catActions?.[a];
    const own = CAT_ACTION_ASSETS[a]
      || (spec && typeof spec === 'object' && typeof spec.asset === 'string' && ASSET_ID_RE.test(spec.asset))
      || (typeof spec === 'string' && ASSET_ID_RE.test(spec.trim()));
    if (own || !c.prev) return { ...c, at: cat.at || c.at };
    c = c.prev;
  }
  return cat;
}

/** croissant.sit sprite footprint (packs/b manifest: 14x12, anchorPoint 6,11). */
export const CAT_SIT_FP = Object.freeze({ w: 14, h: 12, ax: 6, ay: 11 });

export function catActionPosition(registry, setId, cat0, world = null) {
  const cat = catDrawState(cat0, registry);
  const action = cat.action;
  const spec = registry.catActions?.[action];
  const mark = cat.at || spec?.at || 'floor';
  const pos = markCoords(registry, setId, mark) || markCoords(registry, 'kitchen', mark) || { x: 60, y: 136 };
  // fix19b: a cat whose draw state is still in the box (in_box*, e.g. a look inherited from in_box_tail_pop) draws AT
  // the box, never beside the looked-at prop as a box-less tail (d5 hp#1 drew the tail at Noé's feet, box at x154)
  if (/^in_box/.test(action || '') && world?.props?.box_cat) {
    const b = propMarkCoords(registry, setId, 'box_cat', world.props.box_cat.at || 'floor', world);
    if (b) return { x: b.x, y: b.y, inBox: true };
  }
  // fix18 (generic): a cat that looks at a prop standing on its own mark at a registry SPOT sits on the floor BESIDE
  // that prop (same sole row, clear of its footprint), not on the raw mark — a raw floor mark can sit in front of a
  // chair/table (d3 kitchen floor 96,136 reads as "on the chair"). Side: spot.cat_side ('left'|'right'), default right.
  const look = cat.look_at || cat0?.look_at;
  const spot = look && resolvePropSpot(registry, setId, look, mark, world); // fix19: the drawn (slid-beside) spot
  if (spot && Number.isFinite(spot.x) && Number.isFinite(spot.y)) {
    const fp = registry.props[look].footprint || { w: 0, ax: 0 };
    const gap = 1;
    const x = spot.cat_side === 'left'
      ? spot.x - (fp.ax ?? fp.w / 2) - gap - (CAT_SIT_FP.w - CAT_SIT_FP.ax)
      : spot.x - (fp.ax ?? fp.w / 2) + fp.w + gap + CAT_SIT_FP.ax;
    return { x, y: spot.y, beside: look };
  }
  if (action === 'lie' || action === 'sleep') {
    return { ...pos, y: (pos.y ?? 136) + 10 };
  }
  return clearOfSeats(registry, setId, mark, pos);
}

/**
 * fix18 (generic): a cat on a floor-level mark never draws over a chair at the chair's depth, where it reads as
 * sitting ON the chair (cat-on-chair is the story's call: an explicit seat_* mark, Day 8+). Chairs = the set's
 * `kind: 'seat'` marks at the front row (y >= 124); opaque span [seat.x-3, seat.x+5] (STG22C d1 h ruling: chair_left
 * opaque x94-102 for seat_end_l x97). The cat slides to the nearer side, keeping >= 3 px of air (the ruling's minimum),
 * so the kitchen `floor` mark (96,136) lands on x83 = the ruled floor_calendar_watch spot.
 */
export const SEAT_OPAQUE = Object.freeze({ l: 3, r: 5, gap: 3, minSeatY: 124, depth: 12 });
export function clearOfSeats(registry, setId, mark, pos) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return pos;
  const marks = registry?.marks?.[setId]?.marks || [];
  if (marks.find((m) => m.id === mark)?.kind === 'seat') return pos;
  const seats = marks.filter((m) => m.kind === 'seat' && m.y >= SEAT_OPAQUE.minSeatY && pos.y >= m.y && pos.y <= m.y + SEAT_OPAQUE.depth);
  let x = pos.x;
  for (let i = 0; i < 3; i += 1) {
    const hit = seats.find((m) => x - CAT_SIT_FP.ax <= m.x + SEAT_OPAQUE.r + SEAT_OPAQUE.gap && x - CAT_SIT_FP.ax + CAT_SIT_FP.w - 1 >= m.x - SEAT_OPAQUE.l - SEAT_OPAQUE.gap);
    if (!hit) break;
    const left = hit.x - SEAT_OPAQUE.l - SEAT_OPAQUE.gap - 1 - (CAT_SIT_FP.w - 1 - CAT_SIT_FP.ax);
    const right = hit.x + SEAT_OPAQUE.r + SEAT_OPAQUE.gap + 1 + CAT_SIT_FP.ax;
    x = Math.abs(left - x) <= Math.abs(right - x) ? left : right;
  }
  return x === pos.x ? pos : { ...pos, x, clearedSeat: true };
}

function captionRectForProp(propDef, caption) {
  if (!propDef) return null;
  const role = caption?.role;
  const rects = propDef.caption_rects;
  if (role && rects?.[role]) return rects[role];
  return propDef.caption_rect ?? null;
}

function propAssetId(registry, propId, light) {
  const def = registry.props?.[propId];
  if (!def) return null;
  if (def.assets?.[light]) return def.assets[light];
  if (def.assets?.day) return def.assets[light] || def.assets.day;
  if (def.asset) return def.asset;
  if (def.assets?.back) return null;
  return null;
}

function lightKey(light) {
  if (light === 'evening' || light === 'night') return light;
  return 'day';
}

/** Screen-insert props (insert_*, and anything flagged screen_insert) never survive a scene cut. Generic: no ids/days. */
export function isScreenInsertId(id, registry = null) {
  const def = registry?.props?.[id];
  return String(id || '').startsWith('insert_') || def?.insert === 'screen' || def?.screen_insert === true;
}

export function clearScreenInserts(world, registry = null) {
  for (const [key, meta] of Object.entries(world.props || {})) {
    if (isScreenInsertId(meta?.id ?? key, registry)) delete world.props[key];
  }
  if (world.caption?.on && isScreenInsertId(world.caption.on, registry)) world.caption = null;
  if (world.camera?.on?.some?.((id) => isScreenInsertId(id, registry))) world.camera = { shot: 'wide', on: null };
}

/** Replay episode steps through beatId (inclusive) and return world snapshot. */
// fix19b: a scene draws only its own cast. An actor still in world.actors from an earlier scene (no `leave`) is dropped
// at the scene cut unless the scene carries them in: an `enter`, an on-stage step of theirs (say / sit / walk_to), or the
// scene's optional `carry: [who]` list. A phone_bubble is an off-screen voice and does not carry its sender in.
export const CAST_STEPS = Object.freeze(['enter', 'say', 'sit', 'walk_to']);
const castKey = (w) => (w === 'croissant' ? 'cat' : w);
export function sceneCast(scene) {
  const cast = new Set((scene?.carry || []).map(castKey));
  for (const beat of scene?.beats || []) {
    for (const st of beat.steps || []) if (st?.who && CAST_STEPS.includes(st.do)) cast.add(castKey(st.who));
  }
  return cast;
}
/** fix22 B: a one-shot cat action (registry cat_actions.<a>.then) does not survive a scene cut: the new scene opens on
 * its settled `then` action (d3 hp: the b_payoff tail pop must not persist; Croissant is asleep inside, out of sight). */
export function settleCatAtSceneCut(world, registry) {
  const a = world?.cat?.action;
  const then = a && registry?.catActions?.[a]?.then;
  if (then && registry.catActions[then]) world.cat = { ...world.cat, action: then };
  return world;
}
export function dropUncastActors(world, scene) {
  const cast = sceneCast(scene);
  for (const who of Object.keys(world.actors || {})) if (who !== 'cat' && !cast.has(who)) delete world.actors[who];
}

export function worldAtBeat(episode, beatId, registry = null, stepLimit = null) {
  const world = createWorld(episode);
  const ctx = { flagsMatch: () => true };
  for (const scene of episode.scenes || []) {
    clearScreenInserts(world, registry);
    dropUncastActors(world, scene);
    settleCatAtSceneCut(world, registry);
    // fix23b: a spoken relation (« sous la table ») is story state: it persists across scene cuts (d3 v L8 « Mon colis est
    // sous la table » on the phone); relationPlace falls back to the authored mark when a set cannot place it
    world.sceneKey = `${Number(episode.day)}/${scene.id}`; // fix19b: per-scene prop marks (registry scene_spots)
    for (const beat of scene.beats || []) {
      world.set = scene.set;
      world.light = scene.light || world.light;
      const steps = beat.steps || [];
      // subshots: stepLimit (inclusive step index) stops inside beatId
      const n = beat.id === beatId && Number.isInteger(stepLimit) ? Math.min(steps.length, stepLimit + 1) : steps.length;
      // fix23b: relation lines of this beat (« Et mon colis… sous la table ») annotate their subject prop from its show step
      const fz = isFrozenDay(episode.day); const rels = registry && !fz ? lineRelations(beat, registry, null) : [];
      for (const r of rels) if (r.showStep < 0 && world.props[r.prop]) world.props[r.prop].rel = { prep: r.prep, ref: r.ref };
      for (let i = 0; i < n; i++) {
        applyStep(world, steps[i], ctx);
        for (const r of rels) if (r.showStep === i && world.props[r.prop]) world.props[r.prop].rel = { prep: r.prep, ref: r.ref };
        // fix23b item 3 (generic): a prop that IS another one in a later state (registry `replaces`: box_cat is Noé's
        // cat-tree parcel, opened) takes its place -- the earlier sprite no longer lingers on its mark (d3 h floating parcel)
        const st = steps[i];
        // fix23b item 3 (generic): a one-shot cat reaction that settles (`then`, e.g. in_box_tail_pop -> in_box) has
        // settled by the time an on-stage character speaks: d3 h « Où est mon colis ? » shows the closed box, no ears
        if (!fz && st?.do === 'say' && world.cat?.action) { const then = registry?.catActions?.[world.cat.action]?.then; if (then && registry.catActions[then]) world.cat = { ...world.cat, action: then }; }
        if (!fz && st?.do === 'prop' && (st.action === 'show' || st.action === 'swap')) for (const old of registry?.props?.[st.to || st.id]?.replaces || []) for (const [k, m] of Object.entries(world.props)) if ((m?.id ?? k) === old) delete world.props[k];
      }
      if (beat.id === beatId) return world;
    }
  }
  return world;
}

function collectProps(world) {
  const out = [];
  for (const [, meta] of Object.entries(world.props || {})) {
    if (meta?.visible === false) continue;
    const id = meta.id || meta;
    if (typeof meta === 'object') out.push({ id, at: meta.at, instance: meta.instance });
  }
  return out;
}

/**
 * Build scene-player overlay: extra draws, prop omissions, actor patches.
 */
/** Single source of truth for "laptop off": picks desk_bare AND masks laptop_glow in the light map. */
export function laptopIsOff(propStates) {
  return propStates?.laptop === 'off';
}

export function buildSitcomStageOverlay(world, registry, opts = {}) {
  const setId = world.set === 'kitchen_table4' ? 'kitchen_table4' : world.set;
  const light = lightKey(world.light);
  const omitPropIds = [];
  const draws = [];
  const props = collectProps(world);
  const propIds = new Set(props.map((p) => p.id));

  if (
    props.some((p) => DESK_PLANT_SKIP_IDS.has(p.id)) &&
    (setId === 'kitchen' || setId === 'kitchen_table4')
  ) {
    omitPropIds.push('plant');
  }

  // Desk: desk_bare only when the stage record says the laptop is off; otherwise the kitchen desk piece
  // (light-resolved, e.g. prop.desk.night) stays. Desk-top items use the generic deskSlots (relative to the desk origin).
  const deskDef = opts.deskDef || { x: 166, y: 131 };
  const deskSlots = opts.deskSlots || null;
  const laptopOff = laptopIsOff(opts.propStates);
  // Light-map sources to mask. Same predicate as the desk_bare pick, so the two cannot disagree.
  const lightMasks = laptopOff ? ['laptop_glow'] : [];
  const deskSlot = (name) => (deskSlots?.[name]
    ? { x: deskDef.x - (deskSlots.origin?.[0] ?? 0) + deskSlots[name][0], y: deskDef.y - (deskSlots.origin?.[1] ?? 0) + deskSlots[name][1] }
    : null);
  if (propIds.has('desk_bare') && laptopOff) {
    omitPropIds.push('desk');
    const at = registry.props?.desk_bare?.at || { x: deskDef.x, y: deskDef.y };
    const asset = opts.deskBareAsset || registry.props?.desk_bare?.asset || 'prop.desk_bare.any';
    draws.push({ kind: 'prop', asset, x: at.x, y: at.y, z: 18, pass: 'behind', tag: 'desk_bare' });
  }

  const ordered = [];
  for (const p of props) {
    if (p.id === 'desk_bare') continue;
    if (POT_DESK_IDS.has(p.id)) {
      const mark = p.at || registry.props[p.id]?.default_mark || 'pot_desk';
      const pos = (mark === 'pot_desk' && deskSlot('plant')) || markCoords(registry, setId, mark) || { x: 177, y: 118 };
      const asset = propAssetId(registry, p.id, light);
      if (asset) ordered.push({ kind: 'prop', asset, x: pos.x, y: pos.y, z: 22, pass: 'behind', tag: 'pot_desk' });
      continue;
    }
    if (p.id === 'box_cat') {
      const mark = p.at || 'floor';
      const pos = propMarkCoords(registry, setId, 'box_cat', mark, world) || { x: 60, y: 136 };
      const back = registry.props.box_cat?.assets?.back || 'prop.box_cat_back.any';
      const front = registry.props.box_cat?.assets?.front || 'prop.box_cat_front.any';
      ordered.push({ kind: 'prop', asset: back, x: pos.x, y: pos.y, z: 30, pass: 'behind', tag: 'box_back' });
      ordered.push({ kind: 'box_cat', x: pos.x, y: pos.y, z: 35, pass: 'between' });
      ordered.push({ kind: 'prop', asset: front, x: pos.x, y: pos.y, z: 40, pass: 'front', tag: 'box_front' });
      continue;
    }
    if (p.id === 'cat_bowl') {
      const mark = p.at || 'floor_bowl';
      const pos = markCoords(registry, setId, mark) || { x: 40, y: 136 };
      ordered.push({ kind: 'cat_bowl', x: pos.x, y: pos.y, z: 45, pass: 'front', mark });
      continue;
    }
    const floorProps = ['parcel_closed_floor', 'parcel_pair'];
    if (floorProps.includes(p.id)) {
      const mark = p.at || registry.props[p.id]?.default_mark || 'floor_parcel';
      // fix20 L (generic): a floor parcel left on a mark of ANOTHER set (d3 parcel_pair on the stairwell doormat) is not
      // drawn here; it used to ghost at the 60,136 fallback behind the kitchen floor parcel
      const raw = markCoords(registry, setId, mark) || (mark === 'floor_parcel' ? { x: 60, y: 136 } : null);
      if (!raw) continue;
      const pos = markCoords(registry, setId, mark) ? (propMarkCoords(registry, setId, p.id, mark, world) || raw) : raw; // fix22: yields
      const asset = propAssetId(registry, p.id, light);
      if (asset) ordered.push({ kind: 'prop', asset, x: pos.x, y: pos.y, z: 28, pass: 'behind', tag: p.id });
      continue;
    }
    if (SPECIAL_PROP_IDS.has(p.id) || POT_DESK_IDS.has(p.id)) continue;
    const def = registry.props?.[p.id];
    if (!def) continue;
    if (def.held_only) continue; // fix22 F (generic): in-hand-only sprites never rest on a mark (held path draws them)
    const mark = p.at || def.default_mark;
    const pos = mark ? (def.footprint && markCoords(registry, setId, mark) ? propMarkCoords(registry, setId, p.id, mark, world) : markCoords(registry, setId, mark)) : def.at; // fix22: floor props yield
    const asset = propAssetId(registry, p.id, light);
    if (asset && pos) {
      ordered.push({ kind: 'prop', asset, x: pos.x, y: pos.y, z: def.depth ?? 26, pass: 'behind', tag: p.id });
    } else if (asset && mark) {
      ordered.push({ kind: 'prop', asset, x: 0, y: 0, z: 0, pass: 'behind', tag: p.id, unresolved: `prop ${p.id}: mark ${mark} not in set ${setId}` });
    }
  }

  // Slot occupancy (generic): a staged prop standing on a mark that declares `clears` hides that default dressing.
  for (const p of props) {
    const mark = p.at || registry.props?.[p.id]?.default_mark;
    const mk = mark ? (registry.marks?.[setId]?.marks || []).find((m) => m.id === mark) : null;
    for (const id of mk?.clears || []) if (!omitPropIds.includes(id)) omitPropIds.push(id);
  }

  const laptopImg = props.find((p) => p.id === 'laptop_img_catfood' || p.id === 'laptop_img_cattree');
  const insertPrice =
    props.find((p) => p.id === 'insert_laptop_price') || world.caption?.on === 'insert_laptop_price';
  if (laptopImg && insertPrice) {
    const slot = registry.props?.insert_laptop_price?.image_slot || [8, 12, 20, 27];
    ordered.push({
      kind: 'laptop_overlay',
      asset: propAssetId(registry, laptopImg.id, light),
      insertAsset: propAssetId(registry, 'insert_laptop_price', light),
      slot,
      z: 50,
      pass: 'front'
    });
  }

  const cat = world.cat;
  if (cat?.action) {
    const action = cat.action;
    const spec = registry.catActions?.[action];
    const asset = CAT_ACTION_ASSETS[action] || spec?.asset;
    let pos;
    if (action === 'sleep_curl') {
      const mk = cat.at || spec?.at || 'desk_sleep';
      pos = (mk === 'desk_sleep' && deskSlot('cat')) || markCoords(registry, setId, mk) || { x: 166, y: 119 };
      if (!ordered.some((d) => d.tag === 'pot_desk')) {
        const pot = props.find((x) => POT_DESK_IDS.has(x.id));
        if (pot) {
          const mk = pot.at || 'pot_desk';
          const ppos = (mk === 'pot_desk' && deskSlot('plant')) || markCoords(registry, setId, mk) || { x: 177, y: 118 };
          const passet = propAssetId(registry, pot.id, light);
          if (passet) ordered.unshift({ kind: 'prop', asset: passet, x: ppos.x, y: ppos.y, z: 22, pass: 'behind', tag: 'pot_desk' });
        }
      }
      ordered.push({ kind: 'cat', asset, x: pos.x, y: pos.y, z: 34, pass: 'front', action });
    } else if (action === 'in_box' || action === 'in_box_tail_pop') {
      const box = props.find((x) => x.id === 'box_cat');
      const mark = box?.at || cat.at || 'floor';
      pos = propMarkCoords(registry, setId, 'box_cat', mark, world) || { x: 60, y: 136 };
      if (!ordered.some((d) => d.tag === 'box_back')) {
        const back = registry.props.box_cat?.assets?.back || 'prop.box_cat_back.any';
        const front = registry.props.box_cat?.assets?.front || 'prop.box_cat_front.any';
        const hidden = CAT_HIDDEN_ACTIONS.has(action);
        ordered.push({ kind: 'prop', asset: back, x: pos.x, y: pos.y, z: 30, pass: 'behind', tag: 'box_back', ...(hidden ? { still: true } : {}) });
        if (!hidden) ordered.push({ kind: 'cat', asset, x: pos.x, y: pos.y, z: 35, pass: 'between', action });
        ordered.push({ kind: 'prop', asset: front, x: pos.x, y: pos.y, z: 40, pass: 'front', tag: 'box_front', ...(hidden ? { still: true } : {}) });
      } else if (!CAT_HIDDEN_ACTIONS.has(action)) {
        ordered.push({ kind: 'cat', asset, x: pos.x, y: pos.y, z: 35, pass: 'between', action });
      }
    } else if (action === 'drink') {
      pos = markCoords(registry, setId, cat.at || spec?.at || 'floor_drink') || { x: 45, y: 136 };
      ordered.push({ kind: 'cat', asset, x: pos.x, y: pos.y, z: 34, pass: 'front', action });
    } else if (action === 'flap_in') {
      const flapProp = props.find((x) => x.id === 'cat_flap' || x.id === 'cat_flap_open');
      const mark = cat.at || spec?.at || (flapProp?.at === 'flap_neighbour' ? 'flap_neighbour_cat' : 'doormat_home');
      pos = markCoords(registry, setId, mark) || { x: 78, y: 132 };
      const hideCat = propIds.has('cat_flap') || propIds.has('cat_flap_open');
      if (!hideCat) {
        ordered.push({ kind: 'cat', asset, x: pos.x, y: pos.y, z: 34, pass: 'front', action, thenFlap: true });
      }
    } else {
      pos = catActionPosition(registry, setId, cat, world);
      const drawAsset = catActionAsset(action, registry, cat);
      ordered.push({
        kind: 'cat', asset: drawAsset, x: pos.x, y: pos.y, z: 34, pass: 'front', action,
        ...(drawAsset ? {} : { unresolved: `cat_action ${action} has no whitelisted asset` })
      });
    }
  }

  draws.push(...ordered);
  let catPlacement = null;

  const actors = {};
  for (const [who, def] of Object.entries(world.actors || {})) {
    if (who === 'noe' && def.gesture === 'finger_to_lips') {
      actors.noe = {
        ...def,
        character: 'noe',
        asset: 'noe.finger_to_lips.loop',
        x: def.x,
        y: def.y
      };
    }
  }

  // One cat, one position: the stage actor built from the world must sit exactly where the overlay draws the cat
  // (desk slots, box marks, ...). Two resolvers disagreeing drew him twice, 1 px apart, under two different grades.
  const catDraw = ordered.find((d) => d.kind === 'cat' && d.asset && !d.unresolved);
  if (catDraw && world.cat?.action) catPlacement = { x: catDraw.x, y: catDraw.y, ...(/^croissant\.in_box/.test(catDraw.asset || "") ? { inBox: true } : {}) };

  let captionDraw = null;
  if (world.caption?.text && world.caption?.on) {
    const pdef = registry.props?.[world.caption.on];
    const rect = captionRectForProp(pdef, world.caption);
    if (rect) {
      captionDraw = {
        propId: world.caption.on,
        text: world.caption.text,
        rect,
        selfLit: !!pdef?.self_lit,
        maxLines: pdef?.caption_lines ?? null,
        role: world.caption.role ?? null
      };
    }
  }

  // fix19b (Réalisateur ruling 2): a wide frames each drawn floor prop whole together with the furniture it was slid
  // beside (registry.resolvePropSpot besideFurniture), so the player sees where the prop is (d3 b_set: table + box_cat).
  const frameSubjects = [];
  for (const d of draws.filter((x) => x.tag === 'box_back')) {
    const fp = registry.props?.box_cat?.footprint; if (!fp) continue;
    const r = { id: 'box_cat', x0: d.x - fp.ax, x1: d.x - fp.ax + fp.w - 1 };
    // fix19b: a footprinted floor prop (box + in-box cat composite) rests on its whole registry footprint: the PX-ROW
    // contact spans it, not just the back layer's bottom opaque columns
    d.contactSpan = [r.x0, r.x1];
    const sp = resolvePropSpot(registry, setId, 'box_cat', (props.find((x) => x.id === 'box_cat')?.at) || world.cat?.at || 'floor', world);
    const f = sp?.besideFurniture && (registry.marks?.[setId]?.furniture || []).find((x) => x.id === sp.besideFurniture);
    if (f) { r.x0 = Math.min(r.x0, f.x0); r.x1 = Math.max(r.x1, f.x1); r.furniture = f.id; }
    frameSubjects.push(r);
  }
  return { omitPropIds, draws, actors, captionDraw, lightMasks, catPlacement, frameSubjects };
}

const STAGE_ACTOR_KEYS = {
  noe: 'noe',
  camille: 'camille',
  cat: 'cat',
  croissant: 'cat',
  martin: 'martin',
  lefevre: 'lefevre'
};

function characterId(who) {
  if (who === 'cat' || who === 'croissant') return 'croissant';
  return who;
}

function findMark(registry, setId, markId) {
  const set = registry.marks?.[setId] || registry.marks?.kitchen_table4 || registry.marks?.kitchen;
  return (set?.marks || []).find((m) => m.id === markId) || null;
}

function actorAssetId(who, actor) {
  const w = who === 'cat' || who === 'croissant' ? 'croissant' : who;
  const pose = actor.pose || 'stand';
  if (w === 'noe' && (actor.gesture === 'finger_to_lips' || pose === 'finger_to_lips')) {
    return 'noe.finger_to_lips.loop';
  }
  if (w === 'lefevre' && (pose === 'gown_hold' || pose === 'gown_stand')) {
    return 'lefevre.stand';
  }
  if (actor.gesture === 'point') return `${w}.stand`;
  if (pose === 'sit') {
    return `${w}.pose.sit_front`;
  }
  if (pose === 'stand' || pose === 'idle') return `${w}.stand`;
  if (pose === 'walk') return `${w}.walk.0`;
  return `${w}.pose.${pose}`;
}

/** Map episode world actors to scene-player stage slots (feet on y=136 for standing). */
export function buildStageActorsFromWorld(world, registry) {
  const setId = world.set === 'kitchen_table4' ? 'kitchen_table4' : world.set;
  const out = {};
  if (world.cat?.action) {
    const pos = catActionPosition(registry, setId, world.cat, world);
    out.cat = {
      character: 'croissant',
      x: pos.x,
      y: pos.y,
      asset: catActionAsset(world.cat.action, registry, world.cat)
    };
    if (!out.cat.asset) out.cat.unresolved = `cat_action ${world.cat.action} has no whitelisted asset`;
  }
  for (const [who, def] of Object.entries(world.actors || {})) {
    const stageKey = STAGE_ACTOR_KEYS[who] || who;
    const pos = markCoords(registry, setId, def.at) || markCoords(registry, 'kitchen', def.at) || { x: 96, y: 136 };
    const mk = def.at ? findMark(registry, setId, def.at) : null;
    const standing = !def.pose || def.pose === 'stand' || def.pose === 'idle' || def.pose === 'walk';
    const y = standing ? (pos.y ?? 136) : (pos.y ?? 136);
    let asset = actorAssetId(who, def);
    if (def.pose === 'sit' && mk?.pose === 'sit_table_34') asset = `${characterId(who)}.pose.sit_table_34`;
    else if (def.pose === 'sit' && mk?.pose === 'sit_table') asset = `${characterId(who)}.pose.sit_table`;
    const flip = mk?.facing === 'left' || mk?.flip === true || def.facing === 'left';
    out[stageKey] = {
      character: characterId(who),
      x: pos.x,
      y,
      asset,
      face: def.face && def.face !== 'auto' ? def.face : 'neutral'
    };
    if (flip) out[stageKey].flip = true;
    else if (def.facing === 'right') out[stageKey].flip = false;
  }
  return out;
}

export function applySitcomOverlayToStage(stage, overlay) {
  if (!stage || !overlay) return stage;
  stage.sitcomOverlay = overlay;
  if (overlay.omitPropIds?.length) {
    stage.omitPropIds = [...new Set([...(stage.omitPropIds || []), ...overlay.omitPropIds])];
  }
  for (const [name, patch] of Object.entries(overlay.actors || {})) {
    stage.actors = stage.actors || {};
    const prev = stage.actors[name] || {};
    stage.actors[name] = { ...prev, ...patch, character: patch.character || name };
  }
  if (overlay.frameSubjects?.length) stage.frameSubjects = overlay.frameSubjects;
  if (overlay.captionDraw) stage.captionDraw = overlay.captionDraw;
  stage.lightMasks = [...(overlay.lightMasks || [])];
  return stage;
}
