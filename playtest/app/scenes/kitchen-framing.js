/**
 * Kitchen set framing: camera presets + cast-centered crops (192×144 stage).
 * Shared by scene-player (browser) and capture/tests (Node via .cjs wrapper).
 */
import { resolveAsset, placementTopLeft } from './sprite-manifest.js';
import { assetFrameIndex, resolveActorLayers } from './scene-characters.js';

export const CAMERA_PRESETS = {
  wide: { w: 135, h: 132, fixedScale: 8 },
  medium: { w: 90, h: 88, fixedScale: 12 },
  close: { w: 60, h: 59, fixedScale: 18 }
};

/** Scene-band feet line (~y475 on 844 viewport with band y127–591). */
export const TARGET_FEET_BAND_FRAC = 0.752;
export const FEET_BAND_FRAC_MIN = 0.70;
export const FEET_BAND_FRAC_MAX = 0.80;
export const UPPER_WALL_HEADROOM_STAGE = 20;

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

export function actorSceneBounds(manifest, name, def, t = 0) {
  if (!def || def.x == null || def.y == null) return null;
  let box = null;
  const layers = resolveActorLayers(manifest, { ...def, actor: def.actor || name }, { time: t, talking: false });
  for (const assetName of layers) {
    try {
      const fi = assetFrameIndex(manifest, assetName, t, def.frameIndex);
      const spec = resolveAsset(manifest, assetName, { frameIndex: fi, lightVariant: 'day' });
      const rect = placementTopLeft(spec, def.x, def.y);
      rect.w = spec.w;
      rect.h = spec.h;
      box = unionRect(box, rect);
    } catch { /* skip */ }
  }
  return box;
}

export function propSceneBounds(manifest, prop, lightVariant = 'day') {
  if (!prop?.asset) return null;
  try {
    const spec = resolveAsset(manifest, prop.asset, { lightVariant });
    const rect = placementTopLeft(spec, prop.x, prop.y);
    rect.w = spec.w;
    rect.h = spec.h;
    return rect;
  } catch {
    return null;
  }
}

export function presetFromCropRef(crop) {
  if (crop.cameraPreset) return crop.cameraPreset;
  if (crop.w === 135 && crop.h === 132) return 'wide';
  if (crop.w === 90 && crop.h === 88) return 'medium';
  if (crop.w === 60 && crop.h === 59) return 'close';
  if (typeof crop === 'string') {
    if (crop.startsWith('close')) return 'close';
    if (crop === 'wide' || crop === 'matinWide') return 'wide';
    return 'medium';
  }
  return 'medium';
}

/**
 * Pick crop.y so layout floor line targets ~75% of scene band (clamped to stage when needed).
 * @returns {{ cropY: number, feetBandFrac: number, feetTargetFeasible: boolean, feetNote?: string }}
 */
export function cropYForFeetBandTarget(cropH, floorY = FLOOR_Y, targetFrac = TARGET_FEET_BAND_FRAC) {
  let cropY = Math.round(floorY - targetFrac * cropH);
  cropY = Math.max(0, cropY);
  let feetBandFrac = (floorY - cropY) / cropH;
  let feetTargetFeasible = feetBandFrac >= FEET_BAND_FRAC_MIN && feetBandFrac <= FEET_BAND_FRAC_MAX;
  let feetNote;
  if (cropY + cropH > STAGE_H) {
    const maxY = STAGE_H - cropH;
    if (maxY >= 0) {
      cropY = maxY;
      feetBandFrac = (floorY - cropY) / cropH;
      feetTargetFeasible = feetBandFrac >= FEET_BAND_FRAC_MIN && feetBandFrac <= FEET_BAND_FRAC_MAX;
      if (!feetTargetFeasible) {
        feetNote = `nearest feasible feetBandFrac=${feetBandFrac.toFixed(3)} (crop bottom pinned to stage y=${STAGE_H})`;
      }
    } else {
      feetNote = `crop h=${cropH} exceeds stage; feetBandFrac=${feetBandFrac.toFixed(3)}`;
    }
  }
  return { cropY, feetBandFrac, feetTargetFeasible, feetNote };
}

function actorsFitCropWidth(actorBox, cropX, cropW, margin = 4) {
  if (!actorBox) return true;
  return actorBox.x >= cropX + margin
    && actorBox.x + actorBox.w <= cropX + cropW - margin;
}

function landmarkInCrop(landmarkBox, crop) {
  if (!landmarkBox) return false;
  const cx = landmarkBox.x + landmarkBox.w / 2;
  return cx >= crop.x && cx <= crop.x + crop.w;
}

/**
 * @param {object} opts
 * @param {string} opts.presetName wide|medium|close
 * @param {Array<{x,y,w,h}>} opts.contentBoxes actor + optional tall props
 * @param {Array<{x,y,w,h}>} [opts.landmarkBoxes] window/counter for close readability
 */
export function solveKitchenCrop({
  presetName,
  contentBoxes,
  verticalBoxes,
  landmarkBoxes = [],
  floorY = FLOOR_Y
}) {
  let preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.medium;
  let box = null;
  for (const b of contentBoxes) box = unionRect(box, b);
  if (!box) {
    const feet = cropYForFeetBandTarget(preset.h, floorY);
    return {
      ...preset,
      x: 2,
      y: feet.cropY,
      w: preset.w,
      h: preset.h,
      fixedScale: preset.fixedScale,
      cameraPreset: presetName,
      feetBandFrac: feet.feetBandFrac,
      feetTargetFeasible: feet.feetTargetFeasible,
      feetNote: feet.feetNote
    };
  }
  box = {
    x: box.x - MARGIN,
    y: box.y - MARGIN,
    w: box.w + MARGIN * 2,
    h: box.h + MARGIN * 2
  };
  let vbox = box;
  if (verticalBoxes?.length) {
    vbox = null;
    for (const b of verticalBoxes) vbox = unionRect(vbox, b);
    if (vbox) {
      vbox = {
        x: vbox.x - MARGIN,
        y: vbox.y - MARGIN,
        w: vbox.w + MARGIN * 2,
        h: vbox.h + MARGIN * 2
      };
    }
  }

  let name = presetName;
  const innerTop = (vbox || box).y + MARGIN;
  const innerW = box.w - MARGIN * 2;
  while (name !== 'wide' && innerW > (CAMERA_PRESETS[name]?.w ?? preset.w) - 1) {
    name = name === 'close' ? 'medium' : 'wide';
  }
  preset = CAMERA_PRESETS[name] || preset;
  if (name === 'wide') preset = CAMERA_PRESETS.wide;

  let horiz = { ...box };
  for (const lb of landmarkBoxes) horiz = unionRect(horiz, lb);

  let cropX = horiz.x + horiz.w / 2 - preset.w / 2;
  cropX = Math.max(0, Math.min(STAGE_W - preset.w, cropX));
  if (box) {
    if (box.x < cropX + MARGIN) cropX = Math.max(0, box.x - MARGIN);
    if (box.x + box.w > cropX + preset.w - MARGIN) {
      cropX = Math.min(STAGE_W - preset.w, box.x + box.w - preset.w + MARGIN);
    }
  }

  const cropH = preset.h;
  const wallGap = WALL_GAP + (name === 'wide' ? 0 : UPPER_WALL_HEADROOM_STAGE);
  let cropY = Math.min(
    Math.max(0, innerTop - wallGap),
    floorY - cropH + 8
  );
  const feetMeta = cropYForFeetBandTarget(cropH, floorY);
  cropY = feetMeta.cropY;

  let fixedScale = preset.fixedScale;
  if (name === 'close' && !actorsFitCropWidth(box, cropX, preset.w, 4)) {
    fixedScale = 12;
    cropX = Math.max(0, Math.min(STAGE_W - preset.w, box.x + box.w / 2 - preset.w / 2));
    if (landmarkBoxes.length) {
      const leftMost = Math.min(box.x, ...landmarkBoxes.map((b) => b.x));
      cropX = Math.min(cropX, leftMost - MARGIN);
      cropX = Math.max(0, Math.min(STAGE_W - preset.w, cropX));
    }
  }

  const outPreset = name === 'wide' ? CAMERA_PRESETS.wide : preset;
  const crop = {
    x: Math.round(cropX),
    y: Math.round(cropY),
    w: outPreset.w,
    h: cropH,
    fixedScale,
    cameraPreset: name,
    feetBandFrac: feetMeta.feetBandFrac,
    feetTargetFeasible: feetMeta.feetTargetFeasible,
    feetNote: feetMeta.feetNote
  };

  if (name === 'close' && landmarkBoxes.length && box) {
    const win = landmarkBoxes.find((b) => b.id === 'window' || b.id === 'counter');
    const actorsIn = actorsFitCropWidth(box, crop.x, crop.w, MARGIN);
    const landIn = landmarkInCrop(win, crop);
    crop.closeKitchenReadable = landIn;
    if (!actorsIn || !landIn) {
      return solveKitchenCrop({
        presetName: 'medium',
        contentBoxes,
        verticalBoxes,
        landmarkBoxes,
        floorY
      });
    }
  }

  return crop;
}

export function rectInsideCrop(rect, crop) {
  return rect.x >= crop.x && rect.y >= crop.y &&
    rect.x + rect.w <= crop.x + crop.w && rect.y + rect.h <= crop.y + crop.h;
}

/** Keep camera rect inside canonical stage bitmap (stage_day_x1 / table4 extents). */
export function clampKitchenCropToStage(crop, stageW = STAGE_W, stageH = STAGE_H) {
  const out = { ...crop };
  const w = Math.min(out.w ?? CAMERA_PRESETS.medium.w, stageW);
  const h = Math.min(out.h ?? CAMERA_PRESETS.medium.h, stageH);
  out.w = w;
  out.h = h;
  if (out.x != null) out.x = Math.round(Math.max(0, Math.min(stageW - w, out.x)));
  if (out.y != null) out.y = Math.round(Math.max(0, Math.min(stageH - h, out.y)));
  return out;
}

/**
 * No actor may be cut by the crop edge: shift crop to include the full sprite (+margin)
 * or push it fully outside by at least margin px.
 */
export function kitchenPropFullyInsideCrop(box, crop, margin = 2) {
  if (!box || crop?.x == null) return true;
  return box.x >= crop.x + margin
    && box.y >= crop.y + margin
    && box.x + box.w <= crop.x + crop.w - margin
    && box.y + box.h <= crop.y + crop.h - margin;
}

export function kitchenPropFullyOutsideCrop(box, crop, margin = 2) {
  if (!box || crop?.x == null) return true;
  return box.x + box.w <= crop.x - margin
    || box.x >= crop.x + crop.w + margin
    || box.y + box.h <= crop.y - margin
    || box.y >= crop.y + crop.h + margin;
}

export function kitchenSmallPropMayRender(box, crop, margin = 2) {
  if (!box) return true;
  return kitchenPropFullyInsideCrop(box, crop, margin)
    || kitchenPropFullyOutsideCrop(box, crop, margin);
}

export function enforceKitchenActorCropMargins(
  crop,
  actorBoxes,
  stageW = STAGE_W,
  stageH = STAGE_H,
  margin = 2
) {
  let c = clampKitchenCropToStage(crop, stageW, stageH);
  const m = margin;
  const shiftX = (dx) => {
    c = { ...c, x: Math.round(Math.max(0, Math.min(stageW - c.w, c.x + dx))) };
  };
  const shiftY = (dy) => {
    c = { ...c, y: Math.round(Math.max(0, Math.min(stageH - c.h, c.y + dy))) };
  };
  for (const b of actorBoxes || []) {
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const overlapX = b.x < c.x + c.w && b.x + b.w > c.x;
    const overlapY = b.y < c.y + c.h && b.y + b.h > c.y;
    if (!overlapX || !overlapY) continue;
    const inX = b.x >= c.x + m && b.x + b.w <= c.x + c.w - m;
    const inY = b.y >= c.y + m && b.y + b.h <= c.y + c.h - m;
    if (inX && inY) continue;
    const outX = b.x + b.w <= c.x - m || b.x >= c.x + c.w + m;
    const outY = b.y + b.h <= c.y - m || b.y >= c.y + c.h + m;
    if (outX || outY) continue;
    if (b.w + 2 * m <= c.w) {
      if (!inX) {
        if (b.x < c.x + m) shiftX(b.x - m - c.x);
        if (b.x + b.w > c.x + c.w - m) shiftX(b.x + b.w + m - (c.x + c.w));
      }
      if (b.h + 2 * m <= c.h) {
        if (!inY) {
          if (b.y < c.y + m) shiftY(b.y - m - c.y);
          if (b.y + b.h > c.y + c.h - m) shiftY(b.y + b.h + m - (c.y + c.h));
        }
      }
    } else if (b.x + b.w / 2 < c.x + c.w / 2) {
      shiftX(c.x + c.w + m - b.x);
    } else {
      shiftX(b.x + b.w + m - c.x);
    }
  }
  return clampKitchenCropToStage(c, stageW, stageH);
}

export function wallGapAboveContentStagePx(crop, contentTopY) {
  return Math.max(0, contentTopY - crop.y);
}

/** fix19b ruling 2: join the actors' span [minActor,maxActor] with frame subjects (prop + its beside-furniture,
 * {x0,x1}); when the whole span fits usableW and is not already in view, centre it. Actors keep priority otherwise. */
export function centreSubjectSpan(viewX, minActor, maxActor, subj, usableW) {
  if (!subj?.length) return viewX;
  const lo = Math.min(minActor, ...subj.map((r) => r.x0));
  const hi = Math.max(maxActor, ...subj.map((r) => r.x1));
  if (hi - lo < usableW && (viewX > lo || viewX + usableW - 1 < hi)) return lo - Math.floor((usableW - (hi - lo + 1)) / 2);
  return viewX;
}

/** fix19b ruling 4: while `fits(crop)` is false, drop the lowest-priority aim (prio 2 = the rest, last first).
 * Speaker (0) and named props (1) are never dropped. Returns the (possibly) reduced crop. */
/** fix20 (speaker first): a later framing shift (cat containment) is kept only if the aimed group stays whole in view. */
export function keepAimedInView(prev, next, aimedBbox) {
  if (!aimedBbox) return next;
  const b = aimedBbox;
  const ok = b.x >= next.x - 0.5 && b.y >= next.y - 0.5 && b.x + b.w <= next.x + next.w + 0.5 && b.y + b.h <= next.y + next.h + 0.5;
  return ok ? next : prev;
}

export function dropLowPriorityAims(crop, fits) {
  let c = crop;
  while (!fits(c) && (c.aim || []).some((a) => a.prio === 2)) {
    const ix = c.aim.map((a) => a.prio).lastIndexOf(2);
    c = { ...c, aim: c.aim.filter((_, i) => i !== ix) };
  }
  return c;
}

/**
 * fix20: horizontal pan of a wide band view [vx, vx+vw) so every box in `keep` ({x,w}) is whole inside it, moving as
 * little as possible. If the span of the boxes is wider than the view, the first box (the speaker) wins.
 */
export function keepSpanInView(vx, vw, keep) {
  if (!keep?.length) return vx;
  const lo = Math.min(...keep.map((b) => b.x));
  const hi = Math.max(...keep.map((b) => b.x + b.w));
  if (hi - lo > vw) {
    const s = keep[0];
    if (s.x < vx) return s.x;
    if (s.x + s.w > vx + vw) return s.x + s.w - vw;
    return vx;
  }
  if (lo < vx) return lo;
  if (hi > vx + vw) return hi - vw;
  return vx;
}

/**
 * fix20 (decision 1, shot / reverse-shot): when the speakers of a sub-shot (all prio 0) and its named subjects cannot
 * share one portrait view, keep only the speaker of the ACTIVE line (else the first speaker) at prio 0; named
 * subjects (prio 1) stay. Returns the crop unchanged when it has a single prio-0 aim.
 */
export function focusActiveSpeaker(crop, who) {
  const p0 = (crop?.aim || []).filter((a) => a.prio === 0);
  if (p0.length < 2) return crop;
  const keep = p0.some((a) => a.box === who) ? who : p0[0].box;
  return { ...crop, aim: crop.aim.filter((a) => a.prio !== 0 || a.box === keep) };
}

/** fix20: centre x of a sprite [x, x+w) moved minimally so it lies whole inside [0, artW). */
export function clampSpriteX(x, w, artW) {
  const nx = Math.max(0, Math.min(artW - w, x));
  return nx + w / 2;
}

/** fix20 (generic): the drawn scene rect of a registry prop with no footprint, from its sitcom-overlay draw (asset prop.<id>.<variant>). */
export function overlayPropRect(manifest, draws, id, lightVariant = 'day') {
  const d = (draws || []).find((x) => x?.kind === 'prop' && typeof x.asset === 'string' && (x.tag === id || x.asset.split('.')[1] === id)); // tag = registry prop id (sitcom-stage)
  return d ? propSceneBounds(manifest, { asset: d.asset, x: d.x, y: d.y }, lightVariant) : null;
}

/** fix20 K: aims an authored step crop keeps whole: the active speaker first, then named (prio 1) subjects; prio 2 never. */
// fix22 (generic): an off-screen speaker of an authored crop is never panned to (ruling: n/a), and a prop aim carrying
// `aliases` is kept only while the active line names it (d1 b_payoff: « La plante ! » pans to the pot, « Merci, Croissant… » keeps the authored crop)
export const lineNames = (text, aliases) => !text || aliases.some((al) => new RegExp(`(^|[^\\p{L}])${al.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(String(text).toLowerCase().replace(/\u202f/g, ' ')));
export function stepCropKeep(aim, who, text) {
  return focusActiveSpeaker({ aim: (aim || []).filter((a) => (a.prio ?? 0) <= 1 && !a.offscreen && (!a.aliases?.length || lineNames(text, a.aliases))).sort((a, b) => (a.prio ?? 0) - (b.prio ?? 0)) }, who).aim;
}

/** fix20 M: a bbox fits a zoom-k view only within the VISIBLE size floor(stage / k) (the ceil'd view cut ~1 px). */
export function bboxFitsView(bbox, k, stageW, stageH) {
  return bbox.w <= Math.floor(stageW / k) && bbox.h <= Math.floor(stageH / k);
}

// fix20 O: speaker + named subjects cannot share even the wide view -> keep only the speaker(s) (prio 0) and frame
// at the widest zoom (wideK) so the named props are best effort; the crop is flagged speakerOnly
export function speakerWinsCrop(crop, wideK, stageW, stageH) {
  const k = wideK;
  return { crop: { ...crop, aim: (crop.aim || []).filter((a) => a.prio === 0), speakerOnly: true },
    zoomView: { k, w: Math.ceil(stageW / k), h: Math.ceil(stageH / k) } };
}

// fix21 B (Réalisateur 11:10): a speech bubble never overlaps its speaker's head = the top HEAD_CLEAR_FRAC of the drawn
// sprite bbox (screen px). Shared by the player's bubble guard and the probe's speaker_head_clear column.
export const HEAD_CLEAR_FRAC = 0.45;
export function speakerHeadRect(b) { return { x: b.x, y: b.y, w: b.w, h: b.h * HEAD_CLEAR_FRAC }; }
export function bubbleOverHead(bub, head) {
  return bub.x < head.x + head.w && bub.x + bub.w > head.x && bub.y < head.y + head.h && bub.y + bub.h > head.y;
}

// fix21 item 5 (d2_a3 2px pan): a kept actor/cat box is its OPAQUE body columns, not the sprite frame's transparent margin
export function opaqueKeepBox(b, cols) {
  if (!b || !cols || !Number.isFinite(cols.left) || !Number.isFinite(cols.right)) return b;
  return { ...b, x: b.x + cols.left, w: cols.right - cols.left + 1 };
}
