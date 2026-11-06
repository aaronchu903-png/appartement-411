/**
 * Generic 96×64 side-view scene player (sofa-test engine, data-driven).
 * New days: scenes/<id>/scene.json + assets only.
 */
import { packsForDay, mergeSetPacks, resolveRegistryAsset, framesIdentical } from './sprite-packs.js';
import { speakerHidden } from '../engine/subshots.js';
import { isFrozenDay } from '../engine/frozen-days.js';
import { wrapLines, wrapLinesBySentences } from './bubble-wrap.js';
import {
  resolveAsset,
  placementTopLeft,
  handPointScene
} from './sprite-manifest.js';
import {
  actorId,
  actorIsTalking,
  assetFrameIndex,
  resolveActorLayers,
  sequenceFrameIndex
} from './scene-characters.js';
import { drawCaptionInRect } from './caption-render.js';
import {
  actorSceneBounds,
  presetFromCropRef,
  propSceneBounds,
  overlayPropRect,
  stepCropKeep,
  bboxFitsView,
  rectInsideCrop,
  solveKitchenCrop,
  clampKitchenCropToStage,
  enforceKitchenActorCropMargins,
  kitchenSmallPropMayRender,
  centreSubjectSpan,
  dropLowPriorityAims,
  keepAimedInView,
  keepSpanInView,
  opaqueKeepBox,
  focusActiveSpeaker,
  speakerWinsCrop,
  clampSpriteX,
  kitchenPropFullyInsideCrop,
  TARGET_FEET_BAND_FRAC,
  FEET_BAND_FRAC_MAX,
  cropYForFeetBandTarget,
  HEAD_CLEAR_FRAC,
  bubbleOverHead,
} from './kitchen-framing.js';
import {
  computeKitchenBandLayout,
  KITCHEN_REFERENCE_FLOOR_BAND_FRAC,
  kitchenFloorBandFrac
} from './kitchen-layout.js';
import { isRooftopScene } from './rooftop-stage.js';
import {
  isStairwellScene,
  drawStairwellScenery,
  drawStairwellUngradedEmitters,
  STAIRWELL_CROP_LIBRARY
} from './stairwell-stage.js';
import {
  KITCHEN_STAGE_H,
  KITCHEN_STAGE_W,
  gradeKitchenRgb
} from './kitchen-lightmap.js';
import { loadHandoffCameras, resolveHandoffCropRef } from './handoff-cameras.js';
import propTypeRegistry from '../../tech/sitcom_engine/registry/props.json' with { type: 'json' };

/**
 * Phone overlay LCD for prop_photo_plant_tail_screen (46×51 @×4, self-lit).
 * REPORTED overlay screen rect in CSS px (stage space, integer positions):
 *   x = round((stageW − 184) / 2)
 *   y = round(stageH × topBias) when topBias is set, else round((stageH − 204) / 2 − 8)
 *   w = 184, h = 204
 * Do not stretch: source must stay 46×51; scale is exactly 4× nearest-neighbour.
 */
export const PHONE_PLANT_TAIL_OVERLAY_SCREEN = Object.freeze({
  srcW: 46,
  srcH: 51,
  cssScale: 4,
  cssW: 184,
  cssH: 204
});

export function cropScale(crop, shot, width, height, opts = {}) {
  const byWidth = shot?.scaleByWidth ?? crop.scaleByWidth;
  const topMargin = opts.topMargin ?? 0;
  const usableWidth = width - 2 * (shot?.sideMargin ?? crop.sideMargin ?? 0);
  const usableHeight = height - topMargin;
  const scaleW = Math.floor(usableWidth / crop.w);
  const scaleH = Math.floor(usableHeight / crop.h);
  const fitBoth = opts.fitBoth ?? shot?.fitCrop ?? crop.fitCrop;
  let scale;
  if (fitBoth) scale = Math.min(scaleW, scaleH);
  else scale = Math.floor(byWidth ? usableWidth / crop.w : usableHeight / crop.h);
  return Math.max(1, scale - (shot?.wideMargin ? 1 : 0));
}

/** Spoken-bubble stub, in scene pixels. 4×4 x1 is 20×20 screen px at scale 5. */
export const BAND_TAIL_STUB_X1 = 4;
/** Gap from the stub tip to the speaker's head top, in scene pixels. */
export const BAND_TAIL_CLEAR_X1 = 2;
/** Screen-px inset that keeps a band-cover bubble inside the scene band. */
export const BAND_BUBBLE_INSET_PX = 12;
/** fix22 G: minimum cap height (css px) of engine-drawn insert text (phone screens d1 v_msg, d2 v, d3 v). */
export const INSERT_MIN_CAP_CSS = 11;
/** Screen-px gap between the cat and any head. */
export const BAND_CAT_HEAD_GAP_PX = 24;
/**
 * First solid row of prop.counter_sink. Rows 0–3 are the faucet gap;
 * the wood top the pot sits on is local y 4.
 */
export const COUNTER_SURFACE_ROW_X1 = 4;

export function bandFitRightExclusive(viewX, usableW, scale, stageW) {
  const span = Math.min(usableW, Math.floor((stageW - 1) / Math.max(1, scale)));
  return viewX + span;
}

/**
 * Opaque pixel box of a set piece, in screen px. `opaque` is the transparent
 * margin inside the sprite (shadows stay inside the box). x1/y1 are inclusive.
 * y is stage-local: 0 is the top of the scene band.
 */
export function piecePixelExtent(piece, frame) {
  const scale = Math.max(1, frame.scale || 1);
  const opaque = piece.opaque || {};
  const l = opaque.l || 0;
  const t = opaque.t || 0;
  const r = opaque.r || 0;
  const b = opaque.b || 0;
  const sceneL = piece.left + l;
  const sceneR = piece.left + piece.w - r;
  const sceneT = piece.top + t;
  const sceneB = piece.top + piece.h - b;
  return {
    x0: (sceneL - frame.viewX) * scale,
    x1: (sceneR - frame.viewX) * scale - 1,
    y0: (sceneT - frame.viewTop) * scale,
    y1: (sceneB - frame.viewTop) * scale - 1
  };
}

/** True when any opaque pixel, shadow included, sits in the 12px stage margin. */
export function pieceOutsideScreenInset(piece, frame, inset = BAND_BUBBLE_INSET_PX) {
  const e = piecePixelExtent(piece, frame);
  const maxX = frame.stageW - 1 - inset;
  const stageH = frame.stageH;
  if (e.x0 < inset - 1e-6 || e.x1 > maxX + 1e-6) return true;
  if (stageH != null) {
    const maxY = stageH - 1 - inset;
    if (e.y0 < inset - 1e-6 || e.y1 > maxY + 1e-6) return true;
  }
  return false;
}

function pieceMissesCrop(piece, frame) {
  const right = bandFitRightExclusive(frame.viewX, frame.usableW, frame.scale, frame.stageW);
  const bottom = frame.viewTop + (frame.usableH || 0);
  if (piece.left + piece.w <= frame.viewX || piece.left >= right) return true;
  if (piece.top + piece.h <= frame.viewTop || piece.top >= bottom) return true;
  return false;
}

function outsideCrop(piece, frame) {
  const right = bandFitRightExclusive(frame.viewX, frame.usableW, frame.scale, frame.stageW);
  if (piece.left < frame.viewX || piece.top < frame.viewTop) return true;
  if (piece.left + piece.w > right) return true;
  if (piece.top + piece.h > frame.viewTop + frame.usableH) return true;
  return false;
}

/** Scene-pixel limits that keep a sprite's opaque pixels inside the 12px inset. */
export function insetSceneLimits(frame, w, h, opaque = {}) {
  const scale = Math.max(1, frame.scale || 1);
  const inset = BAND_BUBBLE_INSET_PX;
  const l = opaque.l || 0;
  const t = opaque.t || 0;
  const r = opaque.r || 0;
  const b = opaque.b || 0;
  const stageH = frame.stageH ?? frame.usableH * scale;
  return {
    minLeft: frame.viewX + Math.ceil(inset / scale) - l,
    maxLeft: frame.viewX + Math.floor((frame.stageW - inset) / scale) - (w - r),
    minTop: frame.viewTop + Math.ceil(inset / scale) - t,
    maxTop: frame.viewTop + Math.floor((stageH - inset) / scale) - (h - b)
  };
}

/**
 * A set piece is cut when it leaves the crop or its opaque pixels (shadows
 * included) enter the 12px margin. Actors and the cat are not set pieces;
 * an actor and its floor shadow are inset by shiftAnchorInsideInset.
 */
export function pieceCutByFrame(piece, frame) {
  if (outsideCrop(piece, frame)) return true;
  if (piece.kind === 'actor' || piece.kind === 'cat') return false;
  return pieceOutsideScreenInset(piece, frame);
}

/** Floor-shadow ellipse, in scene pixels, centred on the feet anchor. */
export const ACTOR_SHADOW_RX = 7;
export const ACTOR_SHADOW_RY = 2;

function actorBodyOpaque(actor) {
  if (actor.opaque) return actor.opaque;
  if ((actor.w || 0) >= 16) return { l: 3, t: 0, r: 3, b: 0 };
  return { l: 0, t: 0, r: 0, b: 0 };
}

/**
 * Contact band under a resting sole. Same ink as the actor floor ellipse
 * (rgba 34,48,58 at 0.22), one scene pixel tall, spanning the footprint.
 */
export const CONTACT_SHADOW_RGB = [34, 48, 58];
export const CONTACT_SHADOW_ALPHA = 0.22;

export function luminanceRgb(rgb) {
  return (rgb[0] + rgb[1] + rgb[2]) / 3;
}

/** Actor-shadow ink composited on an opaque surface. Always darker when the surface is lighter than the ink. */
export function blendContactShadow(surfaceRgb, rgb = CONTACT_SHADOW_RGB, alpha = CONTACT_SHADOW_ALPHA) {
  const out = [];
  for (let i = 0; i < 3; i += 1) {
    out.push(Math.round(surfaceRgb[i] * (1 - alpha) + rgb[i] * alpha));
  }
  return out;
}

/** Rec. 709 luminance. The cafe floor and its contact band are the reference delta. */
export const CAFE_FLOOR_RGB = [177, 146, 110];
export const HALLWAY_TILE_RGB = [184, 100, 42];
export const HALLWAY_MORTAR_RGB = [138, 51, 40];

export function weightedLuminance(rgb) {
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

export function cafeContactDelta(floorRgb = CAFE_FLOOR_RGB) {
  return weightedLuminance(floorRgb) - weightedLuminance(blendContactShadow(floorRgb));
}

/** Uniform multiply. `gray` is 0–255; 255 leaves the surface unchanged. */
export function multiplyContactShadow(surfaceRgb, gray) {
  return [
    Math.round(surfaceRgb[0] * gray / 255),
    Math.round(surfaceRgb[1] * gray / 255),
    Math.round(surfaceRgb[2] * gray / 255)
  ];
}

/**
 * Lightest multiply that drops `surfaceRgb` by at least the cafe floor's
 * contact delta. Source-over at 0.22 does that on the cafe floor and not
 * on the hallway mortar (about 5 lum), which reads as a light stripe.
 */
export function floorShadowGray(surfaceRgb, floorRgb = CAFE_FLOOR_RGB) {
  const delta = cafeContactDelta(floorRgb);
  const base = weightedLuminance(surfaceRgb);
  for (let g = 255; g >= 0; g -= 1) {
    if (base - weightedLuminance(multiplyContactShadow(surfaceRgb, g)) >= delta - 1e-9) return g;
  }
  return 0;
}

export function sharedFloorShadowGray(surfaces, floorRgb = CAFE_FLOOR_RGB) {
  let gray = 255;
  for (const surface of surfaces || []) gray = Math.min(gray, floorShadowGray(surface, floorRgb));
  return gray;
}

/** Floor contacts drop at least this fraction of weighted luminance. Raised contacts use the smaller bar. */
export const FLOOR_CONTACT_DARKEN = 0.25;
export const RAISED_CONTACT_DARKEN = 0.08;
/**
 * Cafe keeps its accepted feet, bubble, and depth. Its floor contact is not
 * frozen: it is re-darkened with every other shot. The id only guards the
 * sprite's baked sole row and the camera, which must not move.
 */
export const LOCKED_CAFE_SHOT = 'd11_cafe';
/** Shots whose pixels already pass and must not move. */
export const PIXEL_LOCK_SHOTS = new Set(['a1_walk', 'a1_pot', 'b_set']);

export function contactDarkenRatio(bareRgb, underRgb) {
  const bare = weightedLuminance(bareRgb);
  if (!(bare > 1e-9)) return 0;
  return (bare - weightedLuminance(underRgb)) / bare;
}

/** Largest multiply gray that darkens every surface by at least `ratio` (multiply scales luminance). */
export function floorDarkenGray(ratio = FLOOR_CONTACT_DARKEN) {
  return Math.min(255, Math.max(0, Math.floor((1 - ratio) * 255)));
}

function propTypeKey(id) {
  if (typeof id !== 'string') return '';
  return id.startsWith('prop.') ? id.slice(5) : id;
}

function propTypeRecordsMatching(id) {
  const props = propTypeRegistry?.props || {};
  const key = propTypeKey(id);
  if (!key) return [];
  if (props[key]) return [props[key]];
  const prefix = `prop.${key}`;
  return Object.values(props).filter((record) => {
    const asset = String(record?.asset || '');
    return asset === prefix || asset.startsWith(`${prefix}_`) || asset.startsWith(`${prefix}.`);
  });
}

/** Scene pixel whose centre lies inside the cafe floor ellipse. */
export function actorEllipseCovers(anchorX, feetY, x, y, rx = ACTOR_SHADOW_RX, ry = ACTOR_SHADOW_RY) {
  const dx = (x + 0.5 - anchorX) / rx;
  const dy = (y + 0.5 - (feetY + 1)) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * One scene-pixel band on `surface`, directly under the sole (`foot.bottom`
 * is the lowest opaque row). The band is the footprint — the x-extent of
 * that row — plus at most 1 scene px each side. It is clipped to the
 * support and to the 12px inset, and is never widened out to the support.
 * `foot.left`/`foot.right` and the surface edges are inclusive scene columns.
 */
export function contactShadowBand(foot, surface, frame) {
  if (!foot || !surface || !frame) return null;
  const scale = Math.max(1, frame.scale || 1);
  const inset = BAND_BUBBLE_INSET_PX;
  const minScene = frame.viewX + Math.ceil(inset / scale);
  const maxScene = frame.viewX + Math.floor((frame.stageW - inset) / scale) - 1;
  const limitL = foot.footprintLeft != null ? foot.footprintLeft - 1 : foot.left;
  const limitR = foot.footprintRight != null ? foot.footprintRight + 1 : foot.right;
  const left = Math.max(foot.left, surface.left, minScene, limitL);
  const right = Math.min(foot.right, surface.right, maxScene, limitR);
  const y = foot.bottom + 1;
  if (right < left || y < surface.top || y > surface.bottom) return null;
  if (frame.viewTop != null && frame.stageH != null) {
    const y0 = (y - frame.viewTop) * scale;
    const y1 = y0 + scale - 1;
    const maxY = frame.stageH - 1 - inset;
    if (y0 < inset - 1e-6 || y1 > maxY + 1e-6) return null;
  }
  return { left, top: y, w: right - left + 1, h: 1 };
}

/** Outermost columns of a quadruped's planted paws (local x on the 14-wide cat). */
const CAT_PAW_COLUMNS = [2, 4, 7, 9];

function contactFoot(entity) {
  const pad = Math.max(0, Math.min(1, entity.footPad ?? 0));
  if (entity.kind === 'cat' || entity.soleXs?.length) {
    const xs = entity.soleXs?.length ? entity.soleXs : CAT_PAW_COLUMNS;
    let min = xs[0];
    let max = xs[0];
    for (const x of xs) {
      if (x < min) min = x;
      if (x > max) max = x;
    }
    return {
      left: entity.left + min - pad,
      right: entity.left + max + pad,
      footprintLeft: entity.left + min,
      footprintRight: entity.left + max
    };
  }
  const opaque = entity.opaque || null;
  const wide = (entity.w || 0) >= 16;
  const l = opaque?.l ?? (wide ? 3 : 0);
  const r = opaque?.r ?? (wide ? 3 : 0);
  const left = entity.left + l;
  const right = entity.left + entity.w - 1 - r;
  return {
    left: left - pad,
    right: right + pad,
    footprintLeft: left,
    footprintRight: right
  };
}

/**
 * Lowest fully opaque row. Actors and the cat bake a translucent contact
 * row on the anchor, so the sole is the pixel above it. A prop rests on
 * its last pixel.
 */
function contactSoleRow(entity) {
  if (entity.kind === 'actor' || entity.kind === 'cat' || entity.bakedContact) {
    const ay = entity.ay ?? (entity.h - 1);
    return entity.top + ay - 1;
  }
  return entity.top + entity.h - 1;
}

/**
 * Wall-set types carry `wallMounted: true` in the prop registry.
 * A shelf still keeps the items baked on it; the board itself does not
 * get a floor band.
 */
function typeIsWallMounted(name) {
  const props = propTypeRegistry?.props || {};
  const key = propTypeKey(name);
  if (!key) return false;
  if (props[key]) return props[key].wallMounted === true;
  const matches = propTypeRecordsMatching(name);
  return matches.length > 0 && matches.every((record) => record?.wallMounted === true);
}

export function isWallMountedPiece(piece) {
  const id = typeof piece === 'string' ? piece : piece?.id;
  const asset = piece && typeof piece === 'object' ? piece.asset : null;
  return typeIsWallMounted(id) || typeIsWallMounted(asset);
}

/** Same flag. Kept so callers can ask "is this set into the wall?" */
export function isWallSetPiece(piece) {
  return isWallMountedPiece(piece);
}

/**
 * Floor-standing furniture. The fridge keeps attempt 9: outermost feet,
 * one scene pixel of pad, painted across that span. The radiator uses the
 * same span but omits its own foot columns. The counter uses the exact
 * footprint of its lowest opaque row (no pad — that row does not extend
 * past the body) and the band sits on the next row.
 */
const FLOOR_STANDING = {
  fridge: { soleXs: [2, 13], bakedContact: true, footPad: 1 },
  'prop.radiator': { soleXs: [2, 13], bakedContact: true, footPad: 1, occludeLocal: [2, 13] },
  counter: { bakedContact: false, footPad: 0, opaque: { l: 0, r: 0 } }
};

/** Floor-tile colors baked into a sprite's contact row. */
const BAKED_FLOOR_RGB = new Set(['184,100,42', '154,154,162', '196,196,204']);

/**
 * Objects drawn inside a set sprite, resting on that sprite's top.
 * `x0`/`x1` are the lowest opaque row (inclusive local x). The band is the
 * next local row, which is the support, not the object's own pixels.
 * Shelf: honey jar, sugar jar, coffee jar, three mugs.
 * Counter: plum jar and kettle. The tap is part of the sink.
 */
const BAKED_RESTING = {
  counter: [
    { id: 'counter:jar', x0: 4, x1: 6, sole: 3 },
    { id: 'counter:kettle', x0: 41, x1: 44, sole: 3 }
  ],
  shelf: [
    { id: 'shelf:honey_jar', x0: 1, x1: 5, sole: 6 },
    { id: 'shelf:sugar_jar', x0: 7, x1: 10, sole: 6 },
    { id: 'shelf:coffee_jar', x0: 12, x1: 15, sole: 6 },
    { id: 'shelf:mug_white', x0: 18, x1: 20, sole: 6 },
    { id: 'shelf:mug_green', x0: 23, x1: 25, sole: 6 },
    { id: 'shelf:mug_orange', x0: 28, x1: 30, sole: 6 }
  ]
};

export function floorStandingContact(piece, floor, horizon = null) {
  const known = piece && FLOOR_STANDING[piece.id];
  if (!known || isWallSetPiece(piece) || isWallMountedPiece(piece)) return null;
  const ay = piece.ay ?? ((piece.h || 1) - 1);
  const feet = piece.top + ay;
  if (feet !== floor && !(horizon != null && feet === horizon)) return null;
  const bakedContact = !!known.bakedContact;
  const bandY = bakedContact ? feet : feet + 1;
  const omitColumns = (known.occludeLocal || []).map((local) => piece.left + local);
  const contact = {
    id: piece.id,
    kind: 'prop',
    floorStanding: true,
    left: piece.left,
    top: piece.top,
    w: piece.w,
    h: piece.h,
    ay,
    soleXs: known.soleXs,
    footPad: known.footPad ?? 0,
    bakedContact,
    opaque: known.opaque || piece.opaque || { l: 0, r: 0 },
    omitColumns: omitColumns.length ? omitColumns : undefined,
    surface: {
      left: 0,
      top: Math.min(floor, bandY),
      right: Math.max(piece.left + piece.w + 1, 191),
      bottom: Math.max(floor + 8, bandY)
    }
  };
  contact.multiplyGray = piece.id === 'prop.radiator'
    ? sharedFloorShadowGray([HALLWAY_TILE_RGB, HALLWAY_MORTAR_RGB])
    : floorDarkenGray();
  return contact;
}

/** Scene rects of objects baked on a shelf or counter, from the sprite top through the sole. */
export function bakedItemSceneRects(piece) {
  const items = BAKED_RESTING[piece?.id] || [];
  return items.map((item) => ({
    id: item.id,
    left: piece.left + item.x0,
    top: piece.top,
    w: item.x1 - item.x0 + 1,
    h: item.sole + 1
  }));
}

function bakedSurfaceContacts(piece) {
  const items = BAKED_RESTING[piece?.id];
  if (!items) return [];
  return items.map((item) => {
    const bandY = piece.top + item.sole + 1;
    return {
      id: item.id,
      kind: 'prop',
      left: piece.left + item.x0,
      top: piece.top + item.sole,
      w: item.x1 - item.x0 + 1,
      h: 1,
      footPad: 0,
      opaque: { l: 0, r: 0 },
      multiplyGray: floorDarkenGray(),
      surface: {
        left: piece.left,
        top: bandY,
        right: piece.left + piece.w - 1,
        bottom: bandY
      }
    };
  });
}

/** Props and furniture that rest on a surface. Wall-mounted types do not. */
export function restingPropContacts(piece, floor, horizon = null) {
  if (!piece) return [];
  const out = [];
  if (!isWallMountedPiece(piece)) {
    const standing = floorStandingContact(piece, floor, horizon);
    if (standing) out.push(standing);
  }
  out.push(...bakedSurfaceContacts(piece));
  return out;
}

/**
 * A prop the catalog did not give a baked footprint. Floor contacts multiply
 * by `floorDarkenGray` so every surface drops by at least 25%. A raised prop
 * only counts when its bottom sits on another piece.
 */
export function loosePropContact(piece, floor, supports = []) {
  if (!piece || isWallMountedPiece(piece) || FLOOR_STANDING[piece.id]) return null;
  const ay = piece.ay ?? ((piece.h || 1) - 1);
  const feet = piece.top + ay;
  if (Math.abs(feet - floor) <= 6) {
    const bandY = feet + 1;
    return {
      id: piece.id,
      kind: 'prop',
      floorStanding: true,
      left: piece.left,
      top: piece.top,
      w: piece.w,
      h: piece.h,
      ay,
      footPad: 0,
      opaque: piece.opaque || { l: 0, r: 0 },
      multiplyGray: floorDarkenGray(),
      surface: {
        left: 0,
        top: Math.min(floor, bandY),
        right: Math.max(piece.left + piece.w + 1, 191),
        bottom: Math.max(floor + 8, bandY)
      }
    };
  }
  const bottom = piece.top + piece.h - 1;
  const support = (supports || []).find((other) => {
    if (!other || other.id === piece.id) return false;
    const overlap = Math.min(piece.left + piece.w, other.left + other.w) - Math.max(piece.left, other.left);
    if (overlap < 2) return false;
    const surfaceY = other.top;
    return bottom >= surfaceY - 1 && bottom <= surfaceY + 4;
  });
  if (!support) return null;
  const bandY = piece.top + piece.h;
  if (bandY >= floor) return null;
  return {
    id: piece.id,
    kind: 'prop',
    raised: true,
    left: piece.left,
    top: piece.top,
    w: piece.w,
    h: piece.h,
    footPad: 0,
    opaque: piece.opaque || { l: 0, r: 0 },
    multiplyGray: floorDarkenGray(),
    surface: {
      left: support.left,
      top: bandY,
      right: support.left + support.w - 1,
      bottom: bandY
    }
  };
}

/** Scene columns the actor floor ellipse covers on `rowY`. */
export function actorEllipseColumns(anchorX, feetY, rowY) {
  const span = actorShadowSceneSpan(anchorX, feetY);
  if (rowY < span.top || rowY > span.bottom) return [];
  const cols = [];
  for (let x = span.left; x <= span.right; x += 1) cols.push(x);
  return cols;
}

/** Opaque sole. The anchor row is the baked contact pixel under it. */
export function actorSoleY(feetY) {
  return feetY - 1;
}

/**
 * Feet anchor so the sole is strictly below a furniture base plus its band.
 * `baseY` is the piece's lowest opaque row. The band is `bandH` scene rows.
 */
export function feetAnchorBelowFurniture(feetY, baseY, bandH = 1) {
  const sole = baseY + bandH + 1;
  return Math.max(feetY, sole + 1);
}

/** The foot anchor lies on the piece, so the actor stands in front of it. */
export function actorStandsInFront(anchorX, piece) {
  if (!piece || !Number.isFinite(anchorX)) return false;
  const right = piece.left + piece.w - 1;
  return anchorX >= piece.left && anchorX <= right;
}

/**
 * Contact band for every resting actor, cat, or prop.
 * Actors keep the baked sole / floor ellipse (`paint` false). A prop paints
 * when its support is raised (pot, cat) or when it stands on the floor.
 */
export function planContactShadows({ entities, floor, frame }) {
  const bands = [];
  for (const e of entities || []) {
    if (!e?.surface) continue;
    const foot = contactFoot(e);
    const sole = contactSoleRow(e);
    const band = contactShadowBand({
      left: foot.left,
      right: foot.right,
      bottom: sole,
      footprintLeft: foot.footprintLeft,
      footprintRight: foot.footprintRight
    }, e.surface, frame);
    if (!band) continue;
    const raised = e.surface.top < floor;
    bands.push({
      id: e.id,
      band,
      sole,
      footprint: { left: foot.footprintLeft, right: foot.footprintRight },
      paint: e.kind !== 'actor' && (raised || !!e.floorStanding),
      floorStanding: !!e.floorStanding,
      omitColumns: e.omitColumns,
      multiplyGray: e.multiplyGray,
      surfaceRgb: e.surfaceRgb || null
    });
  }
  return bands;
}

/** Inclusive scene span of the floor-shadow ellipse. */
export function actorShadowSceneSpan(anchorX, feetY, rx = ACTOR_SHADOW_RX, ry = ACTOR_SHADOW_RY) {
  return {
    left: anchorX - rx,
    right: anchorX + rx - 1,
    top: Math.ceil((feetY + 1) - ry - 0.5),
    bottom: Math.floor((feetY + 1) + ry - 0.5)
  };
}

/**
 * Screen extent of an actor's opaque body union its floor shadow.
 * x1/y1 are inclusive. y is stage-local.
 */
export function actorAndShadowExtent(actor, frame) {
  const scale = Math.max(1, frame.scale || 1);
  const ax = actor.ax ?? (actor.w ? actor.w / 2 : ACTOR_SHADOW_RX + 1);
  const anchorX = actor.anchorX ?? ((actor.left ?? 0) + ax);
  const ay = actor.ay ?? ((actor.h ? actor.h - 1 : 0));
  const feetY = actor.feetY ?? ((actor.top ?? 0) + ay);
  const opaque = actorBodyOpaque(actor);
  const originL = actor.left ?? (anchorX - ax);
  const originT = actor.top ?? (feetY - ay);
  const shadow = actorShadowSceneSpan(anchorX, feetY);
  const sceneL = Math.min(originL + (opaque.l || 0), shadow.left);
  const sceneR = Math.max(originL + (actor.w || 0) - 1 - (opaque.r || 0), shadow.right);
  const sceneT = Math.min(originT + (opaque.t || 0), shadow.top);
  const sceneB = Math.max(originT + (actor.h || 1) - 1 - (opaque.b || 0), shadow.bottom);
  return {
    x0: (sceneL - frame.viewX) * scale,
    x1: (sceneR - frame.viewX) * scale + (scale - 1),
    y0: (sceneT - frame.viewTop) * scale,
    y1: (sceneB - frame.viewTop) * scale + (scale - 1)
  };
}

/**
 * Move a feet anchor sideways so the actor's opaque body and its floor
 * shadow sit inside the 12px inset. The shadow is never clipped.
 */
export function shiftAnchorInsideInset(anchorX, frame, opts = {}) {
  const scale = Math.max(1, frame.scale || 1);
  const inset = BAND_BUBBLE_INSET_PX;
  const rx = opts.rx ?? ACTOR_SHADOW_RX;
  const ax = opts.ax ?? 8;
  const w = opts.w ?? 16;
  const opaque = opts.opaque ?? (w >= 16 ? { l: 3, r: 3 } : { l: 0, r: 0 });
  const minScene = frame.viewX + Math.ceil(inset / scale);
  const maxScene = frame.viewX + Math.floor((frame.stageW - inset - scale) / scale);
  const bodyLeftOff = -ax + (opaque.l || 0);
  const bodyRightOff = -ax + w - 1 - (opaque.r || 0);
  const lo = Math.max(minScene + rx, minScene - bodyLeftOff);
  const hi = Math.min(maxScene - (rx - 1), maxScene - bodyRightOff);
  let next = anchorX;
  if (Number.isFinite(lo) && next < lo) next = lo;
  if (Number.isFinite(hi) && next > hi) next = hi;
  return next;
}

/** Raised panels painted into each 64px-wide stairwell wall tile. */
export const WALL_PANEL_PERIOD = 64;
export const WALL_PANEL_MOTIFS = [
  { x: 3, y: 97, w: 26, h: 26 },
  { x: 35, y: 97, w: 26, h: 26 }
];

export function repeatingWallPanels(artW = 192, motifs = WALL_PANEL_MOTIFS, period = WALL_PANEL_PERIOD) {
  const panels = [];
  const span = Math.max(period, artW);
  for (let ox = 0; ox < span; ox += period) {
    for (const m of motifs) {
      panels.push({
        id: `panel@${ox + m.x}`,
        left: ox + m.x,
        top: m.y,
        w: m.w,
        h: m.h
      });
    }
  }
  return panels;
}

/** A repeating wall panel the frame would slice, including one that enters the 12px margin. */
export function wallPanelCutByFrame(panel, frame) {
  const scale = Math.max(1, frame.scale || 1);
  const viewRight = frame.viewX + (frame.usableW ?? frame.viewW ?? 0);
  if (panel.left < frame.viewX || panel.left + panel.w > viewRight) return true;
  const x0 = (panel.left - frame.viewX) * scale;
  const x1 = (panel.left + panel.w - frame.viewX) * scale - 1;
  const inset = BAND_BUBBLE_INSET_PX;
  if (x0 < inset - 1e-6 || x1 > frame.stageW - 1 - inset + 1e-6) return true;
  if (frame.viewTop != null && frame.stageH != null) {
    const y0 = (panel.top - frame.viewTop) * scale;
    const y1 = (panel.top + panel.h - frame.viewTop) * scale - 1;
    const maxY = frame.stageH - 1 - inset;
    if (y0 < inset - 1e-6 || y1 > maxY + 1e-6) return true;
  }
  return false;
}

/** Kept wall-decor panels that still paint the 12px margin columns. */
export function wallDecorInMargin(panels, frame) {
  const scale = Math.max(1, frame.scale || 1);
  const inset = BAND_BUBBLE_INSET_PX;
  const bands = [[0, inset - 1], [frame.stageW - inset, frame.stageW - 1]];
  const hits = [];
  for (const panel of panels || []) {
    if (wallPanelCutByFrame(panel, frame)) continue;
    const x0 = (panel.left - frame.viewX) * scale;
    const x1 = (panel.left + panel.w - frame.viewX) * scale - 1;
    if (bands.some(([a, b]) => x0 <= b && x1 >= a)) hits.push(panel.id || String(panel.left));
  }
  return hits;
}

export function supportSurfaceRow(supportId, boxTop, deskSlots = null) {
  if (supportId === 'counter') return boxTop + COUNTER_SURFACE_ROW_X1;
  // fix19b: the desk sprite's top is the laptop lid; desk-top items rest on the deskSlots row (stage record,
  // [x,y] relative to the desk sprite top-left, y = the item's anchor row, so its last drawn row is y-1)
  if (supportId === 'desk' && deskSlots) {
    const ys = Object.entries(deskSlots).filter(([k, v]) => k !== 'origin' && Array.isArray(v)).map(([, v]) => v[1]);
    if (ys.length) return boxTop + Math.max(...ys) - 1;
  }
  return boxTop;
}

function inclusiveOpaque(kind, left, top, w, h) {
  if (kind === 'cat') {
    return {
      left: left + 1,
      right: left + Math.max(1, w - 2),
      top,
      bottom: top + h - 1
    };
  }
  if (w >= 16) {
    return {
      left: left + 3,
      right: left + 12,
      top,
      bottom: top + Math.max(1, Math.round(h * 0.42)) - 1
    };
  }
  return { left, right: left + w - 1, top, bottom: top + h - 1 };
}

/** Screen-px separation between a cat sprite and a head. Overlap is 0. */
export function catHeadGapPx(cat, head, scale) {
  const a = inclusiveOpaque('cat', cat.left, cat.top, cat.w, cat.h);
  const b = inclusiveOpaque(head.kind === 'cat' ? 'cat' : 'actor', head.left, head.top, head.w, head.h);
  const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right) - 1);
  const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom) - 1);
  if (dx === 0 && dy === 0) return 0;
  if (dx === 0) return dy * scale;
  if (dy === 0) return dx * scale;
  return Math.hypot(dx, dy) * scale;
}

function screenRectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function xRangesOverlap(a0, a1, b0, b1) {
  return a0 < b1 && a1 > b0;
}

/**
 * Band-cover speech bubble. The stub is a straight BAND_TAIL_STUB_X1 square
 * in scene pixels, pointing down from the bubble's bottom center. Its tip
 * stays at least BAND_TAIL_CLEAR_X1 scene pixels above the speaker's head top.
 * `speaker` and `others` are screen-px boxes {left, right, top, bottom, cx}.
 */
/**
 * Draw geometry for a band stub: a tail whose base sits on the bubble's bottom edge (stub.y) and whose tip
 * (stub.y + stub.h) points at the speaker's head x, clamped inside the bubble span.
 */
/** HUD subtitle panel: the French line first, the Chinese gloss under it (one shared rule for the player and the engine shell). */
export function hudPanelText(line) {
  const fr = String(line?.fr ?? line?.text ?? '').trim();
  const zh = String(line?.gloss || line?.zh || '').trim();
  if (fr && zh && zh !== fr) return `${fr}\n${zh}`;
  return fr || zh;
}

export function stubTailPolygon(stub, headCx, bx, bw) {
  const half = Math.max(2, stub.w / 2);
  const lo = bx + half + 2;
  const hi = bx + bw - half - 2;
  const tipX = Math.round(Math.max(lo, Math.min(hi, Number.isFinite(headCx) ? headCx : stub.x + stub.w / 2)));
  const baseC = Math.max(lo, Math.min(hi, (stub.x + stub.w / 2 + tipX) / 2));
  return { baseL: Math.round(baseC - half), baseR: Math.round(baseC + half), baseY: Math.round(stub.y), tipX, tipY: Math.round(stub.y + stub.h) };
}

export function unionRect(rs) {
  const x0 = Math.min(...rs.map((r) => r.x)); const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w)); const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Shift an aimed view {x,y,w,h} the least amount so the target bbox lies fully inside it, then clamp the view
 * to the set bounds {w,h}. A bbox larger than the view is centred on that axis.
 */
export function containAimedView(view, bbox, bounds) {
  let { x, y } = view;
  const { w, h } = view;
  if (bbox) {
    if (bbox.w <= w) x = Math.min(Math.max(x, bbox.x + bbox.w - w), bbox.x);
    else x = bbox.x + bbox.w / 2 - w / 2;
    if (bbox.h <= h) y = Math.min(Math.max(y, bbox.y + bbox.h - h), bbox.y);
    else y = bbox.y + bbox.h / 2 - h / 2;
  }
  x = Math.max(0, Math.min(Math.max(0, bounds.w - w), x));
  y = Math.max(0, Math.min(Math.max(0, bounds.h - h), y));
  return { x, y, w, h };
}

export function planBandSpeechStub({
  bw, bh, scale,
  speaker, others = [],
  stageW, stageH, bubbleBandH,
  inset = BAND_BUBBLE_INSET_PX,
  allowOverlap = false,
  headLiftPx = 0
}) {
  // Lowering an actor must not drag the bubble. Place it from the head
  // position before that drop; the stub still points at the same x.
  const dy = headLiftPx || 0;
  if (dy) {
    const raise = (box) => (box ? { ...box, top: box.top - dy, bottom: box.bottom - dy } : box);
    speaker = raise(speaker);
    others = others.map(raise);
  }
  const stubPx = BAND_TAIL_STUB_X1 * scale;
  const clearPx = BAND_TAIL_CLEAR_X1 * scale;
  const minX = inset;
  const maxX = stageW - bw - inset;
  const minY = bubbleBandH + inset;
  const maxY = bubbleBandH + stageH - bh - inset;
  const headTop = Math.floor(speaker.top);
  const by = headTop - clearPx - stubPx - bh;

  function stubFor(bx) {
    const cx = bx + bw / 2;
    return {
      x: Math.round(cx - stubPx / 2),
      y: headTop - clearPx - stubPx,
      w: stubPx,
      h: stubPx
    };
  }

  function headRect(box) {
    return { x: box.left, y: box.top, w: box.right - box.left, h: box.bottom - box.top };
  }

  function fits(bx, mode) {
    if (bx < minX || bx > maxX || by < minY || by > maxY) return false;
    const bubble = { x: bx, y: by, w: bw, h: bh };
    const stub = stubFor(bx);
    const heads = [speaker, ...others];
    if (heads.some((h) => screenRectsOverlap(bubble, headRect(h)) || screenRectsOverlap(stub, headRect(h)))) {
      return false;
    }
    const tip = stub.y + stub.h;
    if (tip > speaker.top - clearPx) return false;
    if (mode === 'above') {
      if (Math.abs(bx + bw / 2 - speaker.cx) > 0.01) return false;
      if (!allowOverlap && others.some((o) => xRangesOverlap(bx, bx + bw, o.left, o.right))) return false;
    } else if (xRangesOverlap(bx, bx + bw, speaker.left, speaker.right)) {
      return false;
    } else if (others.some((o) => xRangesOverlap(bx, bx + bw, o.left, o.right))) {
      return false;
    }
    return true;
  }

  const aboveX = speaker.cx - bw / 2;
  if (fits(aboveX, 'above')) {
    return { mode: 'above', bx: aboveX, by, stub: stubFor(aboveX) };
  }

  const gap = scale;
  const sides = [
    { mode: 'side', bx: speaker.left - gap - bw },
    { mode: 'side', bx: speaker.right + gap }
  ];
  sides.sort((a, b) => Math.abs(a.bx + bw / 2 - speaker.cx) - Math.abs(b.bx + bw / 2 - speaker.cx));
  for (const side of sides) {
    if (fits(side.bx, 'side')) return { mode: 'side', bx: side.bx, by, stub: stubFor(side.bx) };
  }
  return null;
}

// fix23b item 3: the baked night multiply map carries a moonlight shaft below the window that grades the tiles/counter/floor
// as a translucent ghost; count (and with fix, reset to the base tint) its blue-ish pixels. Pure: unit-tested + mutant.
export const KITCHEN_MOON_WINDOW = { x: 32, y: 79, w: 28, h: 22 };
export function moonShaftPixels(multFull, SW, SH, fix = false) {
  // fix23d (Pixel Studio 2026-10-29): only the shaft itself = the cool pixels CONNECTED to the window's bottom edge;
  // a cool pixel elsewhere (the pendant floor ellipse rim, y >= 130) is not the shaft and is never touched.
  const base = [multFull[8], multFull[9], multFull[10]];
  const y0 = KITCHEN_MOON_WINDOW.y + KITCHEN_MOON_WINDOW.h;
  const x0 = Math.max(0, KITCHEN_MOON_WINDOW.x - 2);
  const x1 = Math.min(SW, KITCHEN_MOON_WINDOW.x + KITCHEN_MOON_WINDOW.w + 40);
  const cool = (x, y) => { const o = (y * SW + x) * 4; const r = multFull[o], g = multFull[o + 1], b = multFull[o + 2];
    return b > r && Math.max(Math.abs(r - base[0]), Math.abs(g - base[1]), Math.abs(b - base[2])) >= 4; };
  const seen = new Uint8Array(SW * SH); const st = []; let n = 0;
  for (let y = y0; y <= Math.min(SH - 1, y0 + 2); y++) for (let x = x0; x < x1; x++) if (cool(x, y)) { seen[y * SW + x] = 1; st.push([x, y]); }
  const hit = [];
  while (st.length) { const [x, y] = st.pop(); hit.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
      if (nx < x0 || nx >= x1 || ny < y0 || ny >= SH || seen[ny * SW + nx] || !cool(nx, ny)) continue; seen[ny * SW + nx] = 1; st.push([nx, ny]); } }
  for (const [x, y] of hit) { n++; if (fix) { const o = (y * SW + x) * 4; multFull[o] = base[0]; multFull[o + 1] = base[1]; multFull[o + 2] = base[2]; } }
  return n;
}
/** fix23d (Pixel): the baked moonlight stays wherever its window is in frame; it is stripped only when the window is not. */
/**
 * fix23d (Pixel 3): the night multiply map's neutral (127,127,127) rects mark glass that stays ungraded (window pane,
 * laptop screen). Such a pixel keeps its map column only where the glass sprite was really drawn (allows()); any other
 * pixel there (bare wall when the window is not drawn, a cast member in front) takes the nearest non-neutral map pixel
 * to its left on the same row, i.e. the room's own multiply.
 */
/** fix23d P4 (Pixel ruling b): which night maps grade the cast for a set's light entry (manifest entry or loaded
 *  images, same keys). Unmasked cast maps when the set ships them, else the stage maps (fallback: true). */
export function castLightFiles(entry) {
  if (entry?.nightMultiplyCast && entry?.nightAddCast) return { nightMultiply: entry.nightMultiplyCast, nightAdd: entry.nightAddCast, fallback: false };
  return { nightMultiply: entry?.nightMultiply, nightAdd: entry?.nightAdd, fallback: true };
}

/** fix23e (Pixel ruling 01:34 MT): emitter rects (window glass, laptop screen, counter-sill glow) are STAGE light sources;
 *  in a CAST map their bright block paints a lit rectangle over any actor standing in front of them (the face bands).
 *  At load time (art files untouched) every cast-map pixel inside a listed emitter rect, or on its 1px edge ring, that is
 *  brighter than the surrounding halo is clamped per channel to the halo: the most common non-base colour on that ring
 *  (laptop: 46,61,84; a ring of bare base -> base). Rects are map px, inclusive, from the light entry in data. */
export function clampCastEmitters(multFull, sw, sh, emitters, scale = 1) {
  const out = []; if (!emitters?.length) return out;
  const key = (o) => (multFull[o] << 16) | (multFull[o + 1] << 8) | multFull[o + 2];
  const cnt = new Map(); for (let o = 0; o < sw * sh * 4; o += 4) cnt.set(key(o), (cnt.get(key(o)) || 0) + 1);
  let base = 0, bn = -1; for (const [k, n] of cnt) if (n > bn) { base = k; bn = n; }
  for (const e of emitters) {
    const x0 = Math.max(0, Math.floor(e.x0 * scale)), y0 = Math.max(0, Math.floor(e.y0 * scale));
    const x1 = Math.min(sw - 1, Math.ceil((e.x1 + 1) * scale) - 1), y1 = Math.min(sh - 1, Math.ceil((e.y1 + 1) * scale) - 1);
    if (x1 < x0 || y1 < y0) continue;
    const ringPts = []; const add = (x, y) => { if (x >= 0 && y >= 0 && x < sw && y < sh) ringPts.push((y * sw + x) * 4); };
    for (let x = x0 - 1; x <= x1 + 1; x++) { add(x, y0 - 1); add(x, y1 + 1); }
    for (let y = y0; y <= y1; y++) { add(x0 - 1, y); add(x1 + 1, y); }
    const rc = new Map(); for (const o of ringPts) { const k = key(o); if (k !== base) rc.set(k, (rc.get(k) || 0) + 1); }
    let hk = base, hn = 0; for (const [k, n] of rc) if (n > hn) { hk = k; hn = n; }
    const halo = [hk >> 16, (hk >> 8) & 255, hk & 255];
    let n = 0; const clamp = (o) => { for (let c = 0; c < 3; c++) if (multFull[o + c] > halo[c]) { multFull[o + c] = halo[c]; n++; } };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) clamp((y * sw + x) * 4);
    for (const o of ringPts) clamp(o);
    out.push({ id: e.id, halo, clamped: n });
  }
  return out;
}

/** fix23f (Pixel 02:51 MT): light-map regions tagged window-bound in data (kitchenLight.windowBound: {id, map, x0..y1})
 *  exist only while the window is in frame (same gate as the moon shaft). Out of shot, each region is reset to the
 *  map's base (most common colour; add map -> 0), matching the night canon composite_landscape_night.png: plain wall
 *  away from the window/counter carries no lit patch. */
export function stripWindowBound(maps, sw, sh, regions, scale = 1) {
  let n = 0; if (!regions?.length) return n;
  const baseOf = (d) => { const cnt = new Map(); let b = 0, bn = -1; for (let o = 0; o < sw * sh * 4; o += 4) { const k = (d[o] << 16) | (d[o + 1] << 8) | d[o + 2]; const c = (cnt.get(k) || 0) + 1; cnt.set(k, c); if (c > bn) { bn = c; b = k; } } return [b >> 16, (b >> 8) & 255, b & 255]; };
  const bases = {};
  for (const r of regions) { const d = maps[r.map]; if (!d) continue; const b = bases[r.map] ||= baseOf(d);
    const x0 = Math.max(0, Math.floor(r.x0 * scale)), y0 = Math.max(0, Math.floor(r.y0 * scale)), x1 = Math.min(sw - 1, Math.ceil((r.x1 + 1) * scale) - 1), y1 = Math.min(sh - 1, Math.ceil((r.y1 + 1) * scale) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = (y * sw + x) * 4; for (let c = 0; c < 3; c++) if (d[o + c] !== b[c]) { d[o + c] = b[c]; n++; } } }
  return n;
}

/** fix23f (Pixel): the table pool (castLightPools) is an allowed flat light rect only while no STANDING actor's head
 *  (top 10 px of the sprite) spans one of its vertical edges inside the pool rows. Returns the offending heads. */
export const STANDING_EXCLUDE = /sit|lie|lying|sleep|bed/;
/** fix23g (Pixel): a cat head counts only with >= 2 head rows inside the pool rows; actors the render shows hidden
 *  (a.hidden, from the drawn insert/card) are skipped; allowlisted crossings are keyed to the frame's render sha256. */
export const isCatActor = (a) => /^(cat|croissant)\b/.test(a.name || '') || /^croissant\./.test(a.asset || '');
export function poolEdgeStraddles(actors, pools, headPx = 10, crop = null) {
  const bad = [];
  for (const a of actors || []) { if (STANDING_EXCLUDE.test(a.asset || '')) continue; if (a.hidden) continue;
    const hx0 = a.x, hx1 = a.x + a.w - 1, hy0 = a.y, hy1 = a.y + Math.min(headPx, a.h) - 1; const minRows = isCatActor(a) ? 2 : 1;
    for (const p of pools || []) { const rows = Math.min(hy1, p.y1) - Math.max(hy0, p.y0) + 1; if (rows < minRows) continue;
      for (const ex of [p.x0, p.x1]) if (crop && (ex < crop.x || ex >= crop.x + crop.w)) continue; else if (hx0 < ex && hx1 > ex) bad.push({ actor: a.name, pool: p.id, edge: ex, head: [hx0, hy0, hx1, hy1] }); } }
  return bad;
}
export const poolAllowed = (frame, b, allow) => (allow || []).some((r) => r.file === frame.file && r.actor === b.actor && r.edge === b.edge && r.sha256 === frame.sha256);

export function kitchenPaneMapX(multFull, sw, mx, my, allows) {
  const neutral = (x) => { const i = (my * sw + x) * 4; return multFull[i] === 127 && multFull[i + 1] === 127 && multFull[i + 2] === 127; };
  if (!neutral(mx) || allows()) return mx;
  let lx = mx;
  while (lx > 0 && neutral(lx)) lx--;
  return lx;
}

export const moonWindowInCrop = (crop) => !!crop && crop.x < KITCHEN_MOON_WINDOW.x + KITCHEN_MOON_WINDOW.w && crop.x + crop.w > KITCHEN_MOON_WINDOW.x
  && crop.y < KITCHEN_MOON_WINDOW.y + KITCHEN_MOON_WINDOW.h && crop.y + crop.h > KITCHEN_MOON_WINDOW.y;

// fix23b item 2: the bubble band above the room shows real wall art (stage rows above the crop), not a slate void.
// Returns the stage rows (sy0..sy0+n) and the css dest y; sy0 may go into the wall-extension pad (>= -yOff).
export function planBandArt({ bandH, oy = 0, k, cropY, yOff = 0 }) {
  if (!bandH || !k) return null;
  const screenTop = bandH + oy; const rows = Math.ceil(screenTop / k);
  const sy0 = Math.max(-yOff, cropY - rows); const n = cropY - sy0;
  return n > 0 ? { sy0, n, destY: screenTop - n * k, covered: n * k >= screenTop } : null;
}

export function planKitchenBandPieces({
  viewX, viewTop, usableW, usableH, scale, stageW, stageH,
  floor, ids, specs, actors, keepOut
}) {
  const frame = { viewX, viewTop, usableW, usableH, scale, stageW, stageH };
  const pieces = [];
  // fix22 A: floor-standing band pieces never cover a framed subject span (frameSubjects furniture + floor prop)
  const keep = (keepOut || []).filter((k) => k && Number.isFinite(k.x0) && Number.isFinite(k.x1));
  const BAND_FLOOR_PIECES = new Set(['counter', 'fridge', 'coffee_pot']);
  const dropped = [];
  const snaps = [];
  const present = ids instanceof Set ? ids : new Set(ids || []);

  function put(id, left, top, spec) {
    if (!present.has(id) || !spec) return null;
    const piece = {
      id, left, top, w: spec.w, h: spec.h,
      ax: spec.ax ?? 0, ay: spec.ay ?? 0,
      opaque: spec.opaque || null
    };
    if (pieceCutByFrame(piece, frame)) {
      dropped.push(id);
      return null;
    }
    if (BAND_FLOOR_PIECES.has(id) && keep.some((k) => left <= k.x1 && left + spec.w - 1 >= k.x0)) {
      dropped.push(id);
      return null;
    }
    pieces.push(piece);
    return piece;
  }

  const cab = specs.cabinets;
  const splash = specs.backsplash;
  const counter = specs.counter;
  if (!cab || !splash || !counter) return { viewX, pieces, dropped, snaps, frame };
  const cabLim = insetSceneLimits(frame, cab.w, cab.h, cab.opaque);
  if (cabLim.minLeft > cabLim.maxLeft || cabLim.minTop > cabLim.maxTop) {
    dropped.push('upper_cabinets');
    return { viewX, pieces, dropped, snaps, frame };
  }
  const cabLeft = cabLim.maxLeft;
  const cabTop = cabLim.minTop;
  if (!put('upper_cabinets', cabLeft, cabTop, cab)) return { viewX, pieces, dropped, snaps, frame };
  const hair = floor - 22;
  let splashGap = 2;
  let shelfTop = null;
  if (specs.shelf && present.has('shelf')) {
    const shelfLeft = cabLeft + Math.max(0, Math.floor((cab.w - specs.shelf.w) / 2));
    for (const gap of [2, 1, 0]) {
      const sTop = cabTop + cab.h + gap + splash.h + gap;
      const aboveHair = sTop + specs.shelf.h - 1 < hair;
      const shelfPiece = {
        left: shelfLeft, top: sTop, w: specs.shelf.w, h: specs.shelf.h, opaque: specs.shelf.opaque
      };
      if (aboveHair && !pieceOutsideScreenInset(shelfPiece, frame)) {
        splashGap = gap;
        shelfTop = sTop;
        break;
      }
    }
  }
  const splashTop = cabTop + cab.h + splashGap;
  const splashPiece = put('backsplash', cabLeft, splashTop, splash);
  if (specs.shelf && present.has('shelf')) {
    const shelfLeft = cabLeft + Math.max(0, Math.floor((cab.w - specs.shelf.w) / 2));
    if (shelfTop != null && splashPiece) put('shelf', shelfLeft, shelfTop, specs.shelf);
    else dropped.push('shelf');
  }
  const counterTop = floor - counter.ay;
  const counterPiece = put('counter', cabLeft, counterTop, counter);
  if (specs.fridge && present.has('fridge') && counterPiece) {
    const fridgeLim = insetSceneLimits(frame, specs.fridge.w, specs.fridge.h, specs.fridge.opaque);
    const leftCol = fridgeLim.minLeft;
    if (leftCol <= fridgeLim.maxLeft && leftCol + specs.fridge.w + 1 < cabLeft) {
      put('fridge', leftCol, floor - specs.fridge.ay, specs.fridge);
    } else dropped.push('fridge');
  }
  if (present.has('coffee_pot') && specs.cup && counterPiece) {
    const surfaceY = supportSurfaceRow('counter', counterPiece.top);
    const cup = specs.cup;
    const cupTop = surfaceY - cup.h + 1;
    let left = cabLeft + Math.floor((counter.w - cup.w) / 2);
    const sorted = [...(actors || [])].filter((a) => a && a.x != null).sort((a, b) => a.x - b.x);
    if (sorted.length >= 2) {
      const betweenL = sorted[0].x + sorted[0].w;
      const betweenR = sorted[1].x;
      if (betweenR - betweenL >= cup.w) {
        left = betweenL + Math.floor((betweenR - betweenL - cup.w) / 2);
      }
    }
    left = Math.max(cabLeft, Math.min(left, cabLeft + counter.w - cup.w));
    const pot = {
      id: 'coffee_pot', left, top: cupTop, w: cup.w, h: cup.h,
      ax: cup.ax ?? 0, ay: cup.ay ?? 0
    };
    if (pieceCutByFrame(pot, frame) || keep.some((k) => pot.left <= k.x1 && pot.left + pot.w - 1 >= k.x0)) dropped.push('coffee_pot');
    else {
      pieces.push(pot);
      snaps.push({ id: 'coffee_pot', propBottom: cupTop + cup.h - 1, surfaceY });
    }
  }
  return { viewX, pieces, dropped, snaps, frame };
}

export function planStairwellBandPieces({
  viewX, viewTop, usableW, usableH, scale, stageW, stageH, artW,
  floor, horizon, specs, actors
}) {
  if (viewX + usableW > artW) viewX = Math.max(0, artW - usableW);
  const frame = { viewX, viewTop, usableW, usableH, scale, stageW, stageH };
  const right = bandFitRightExclusive(viewX, usableW, scale, stageW);
  const pieces = [];
  const dropped = [];
  if (!specs.door || !actors?.length) return null;
  if (floor > viewTop + usableH || floor - 23 < viewTop) return null;

  function tryPut(id, left, top, spec) {
    if (!spec) {
      dropped.push(id);
      return null;
    }
    const piece = {
      id, left, top, w: spec.w, h: spec.h,
      ax: spec.ax ?? 0, ay: spec.ay ?? 0,
      opaque: spec.opaque || null
    };
    if (pieceCutByFrame(piece, frame)) {
      dropped.push(id);
      return null;
    }
    pieces.push(piece);
    return piece;
  }

  if (specs.stairs) {
    const stairTop = Math.max(viewTop, horizon - 57);
    const stair = {
      id: 'prop.stairs', left: viewX, top: stairTop,
      w: specs.stairs.w, h: specs.stairs.h, ax: specs.stairs.ax ?? 0, ay: specs.stairs.ay ?? 0,
      opaque: specs.stairs.opaque || null
    };
    if (pieceCutByFrame(stair, frame)) dropped.push('prop.stairs');
    else pieces.push(stair);
  }

  const doorTop = horizon - specs.door.ay;
  const doorLim = insetSceneLimits(frame, specs.door.w, specs.door.h, specs.door.opaque);
  const door = tryPut('prop.door_home_closed', doorLim.minLeft, doorTop, specs.door);
  if (!door) return null;

  if (specs.lamp) {
    const lampTop = door.top - specs.lamp.h - 1;
    const lampLeft = door.left + Math.max(0, Math.floor((door.w - specs.lamp.w) / 2));
    tryPut('prop.wall_lamp', lampLeft, lampTop, specs.lamp);
  }
  if (specs.win) {
    const winLim = insetSceneLimits(frame, specs.win.w, specs.win.h, specs.win.opaque);
    const winTop = Math.max(viewTop + 6, winLim.minTop);
    const winLeft = winLim.maxLeft;
    if (winTop + specs.win.h - 1 < floor - 22) tryPut('prop.landing_window', winLeft, winTop, specs.win);
    else dropped.push('prop.landing_window');
  }

  const placedActors = [];
  let cursor = door.left + door.w;
  for (const a of actors) {
    const ax = a.ax ?? a.w / 2;
    let left = cursor;
    const anchor = shiftAnchorInsideInset(left + ax, frame, { ax, w: a.w, opaque: a.opaque });
    const shifted = anchor - ax;
    if (shifted >= frame.viewX && shifted + a.w <= right) left = shifted;
    const top = floor - a.ay;
    const box = { ...a, left, top, kind: 'actor', anchorX: left + ax, feetY: floor };
    if (pieceCutByFrame({ left, top, w: a.w, h: a.h, kind: 'actor' }, frame)) return null;
    placedActors.push(box);
    cursor += a.w;
  }

  let cat = null;
  if (specs.cat && specs.rad) {
    const radTop = floor - specs.rad.ay;
    const radLim = insetSceneLimits(frame, specs.rad.w, specs.rad.h, specs.rad.opaque);
    const catOpaque = specs.cat.opaque || { l: 1, r: 1 };
    const catLim = insetSceneLimits(frame, specs.cat.w, specs.cat.h, catOpaque);
    cat = {
      id: 'cat',
      kind: 'cat',
      left: catLim.maxLeft,
      top: radTop - specs.cat.ay,
      w: specs.cat.w,
      h: specs.cat.h,
      ax: specs.cat.ax ?? 0,
      ay: specs.cat.ay ?? 0,
      opaque: catOpaque
    };
    if (cat.top < viewTop || catLim.minLeft > catLim.maxLeft) return null;
    let radLeft = Math.max(radLim.minLeft, cat.left + cat.w - specs.rad.w);
    radLeft = Math.min(radLeft, cat.left, radLim.maxLeft);
    if (pieceCutByFrame({
      left: radLeft, top: radTop, w: specs.rad.w, h: specs.rad.h, opaque: specs.rad.opaque
    }, frame)) return null;
    if (pieceCutByFrame(cat, frame)) return null;
    const onSurface = cat.top + cat.h - 1 === radTop
      && cat.left < radLeft + specs.rad.w
      && cat.left + cat.w > radLeft;
    if (!onSurface) return null;
    if (placedActors.some((h) => catHeadGapPx(cat, h, scale) < BAND_CAT_HEAD_GAP_PX)) return null;
    if (cat.left + cat.w > right) return null;
    tryPut('prop.radiator', radLeft, radTop, specs.rad);
  }

  return { viewX, pieces, dropped, actors: placedActors, cat, frame };
}

/**
 * Rules computed from layout boxes. Failures are ids. Attempt-3 boxes
 * (flush right edge, long tail, floating pot, door inset, cat against a head)
 * produce a non-empty list.
 */
export function evaluateBandCoverProof(proof) {
  const failures = [];
  const scale = proof.scale;
  const frame = {
    viewX: proof.viewX,
    viewTop: proof.viewTop,
    usableW: proof.usableW,
    usableH: proof.usableH,
    scale,
    stageW: proof.stageW,
    stageH: proof.stageH
  };
  if (proof.nameTags) failures.push('name-tags');
  for (const piece of proof.pieces || []) {
    if (pieceCutByFrame(piece, frame)) failures.push(`piece-cut:${piece.id}`);
  }
  for (const snap of proof.snaps || []) {
    if (snap.propBottom !== snap.surfaceY) failures.push(`snap:${snap.id}`);
  }
  if (proof.cat) {
    for (const head of proof.headsScene || []) {
      if (catHeadGapPx(proof.cat, head, scale) < BAND_CAT_HEAD_GAP_PX) failures.push(`cat-gap:${head.id || 'head'}`);
    }
  }
  const actorMaxX = (proof.stageW ?? 0) - 1 - BAND_BUBBLE_INSET_PX;
  for (const actor of proof.actors || []) {
    const extent = actorAndShadowExtent(actor, frame);
    if (extent.x0 < BAND_BUBBLE_INSET_PX - 1e-6 || extent.x1 > actorMaxX + 1e-6) {
      failures.push(`actor-inset:${actor.id || 'actor'}`);
    }
  }
  for (const hit of wallDecorInMargin(proof.wallPanels || [], frame)) {
    failures.push(`panel-strip:${hit}`);
  }
  if (proof.bubble && proof.stub && proof.speakerHead) {
    const b = proof.bubble;
    const stub = proof.stub;
    const speaker = proof.speakerHead;
    if (Math.abs(stub.w / scale - BAND_TAIL_STUB_X1) > 0.01
      || Math.abs(stub.h / scale - BAND_TAIL_STUB_X1) > 0.01) {
      failures.push('stub-size');
    }
    const bubbleCx = b.x + b.w / 2;
    if (Math.abs(stub.x + stub.w / 2 - bubbleCx) > 0.01) failures.push('stub-center');
    if (Math.abs(stub.y - (b.y + b.h)) > 0.01) failures.push('stub-down');
    const gapX1 = (speaker.top - (stub.y + stub.h)) / scale;
    if (gapX1 < BAND_TAIL_CLEAR_X1 - 0.01) failures.push('stub-clearance');
    const bubbleRect = { x: b.x, y: b.y, w: b.w, h: b.h };
    for (const head of proof.heads || []) {
      const rect = head.x != null
        ? head
        : { x: head.left, y: head.top, w: head.right - head.left, h: head.bottom - head.top };
      if (screenRectsOverlap(bubbleRect, rect) || screenRectsOverlap(stub, rect)) failures.push('head-overlap');
    }
    if (b.x < BAND_BUBBLE_INSET_PX || b.x + b.w > proof.stageW - BAND_BUBBLE_INSET_PX) failures.push('inset-x');
    if (b.y < proof.bubbleBandH + BAND_BUBBLE_INSET_PX) failures.push('inset-y');
    if (proof.stageH != null && b.y + b.h > proof.bubbleBandH + proof.stageH - BAND_BUBBLE_INSET_PX) {
      failures.push('inset-bottom');
    }
    if (proof.bubbleMode === 'above' && Math.abs(bubbleCx - speaker.cx) > 0.01) failures.push('bubble-center');
    for (const other of proof.others || []) {
      const o0 = other.left ?? other.x;
      const o1 = other.right ?? (other.x + other.w);
      if (xRangesOverlap(b.x, b.x + b.w, o0, o1)) failures.push('sits-over');
    }
  }
  return failures;
}

const BUBBLE_NB = '\u202F';
const BUBBLE_WORD = '\u00A0';

/**
 * Bind breaks the line must not make. U+202F (narrow no-break space) glues
 * ? ! : ; to the preceding word. A word of 1–2 letters stays with a following
 * à or là on U+00A0, a no-break space the same width as a normal word space,
 * so "Oh là là" does not collapse and does not break.
 */
export function prepareBubbleText(text) {
  const glued = String(text).replace(/[ \t\u00A0\u202F]*([?!;:]+)/g, `${BUBBLE_NB}$1`);
  const words = glued.split(/[ \t]+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  const letters = (word) => word.replace(/[^\p{L}\p{M}]/gu, '');
  while (i < words.length) {
    let chunk = words[i];
    while (i + 1 < words.length) {
      const core = letters(words[i]);
      const nextCore = letters(words[i + 1]).toLowerCase();
      if (core.length >= 1 && core.length <= 2 && (nextCore === 'là' || nextCore === 'à')) {
        chunk += BUBBLE_WORD + words[i + 1];
        i += 1;
        continue;
      }
      break;
    }
    chunks.push(chunk);
    i += 1;
  }
  // an authored leading ellipsis ("… et toi") stays with its first word
  if (chunks.length > 1 && /^[…]+$/.test(chunks[0])) chunks.splice(0, 2, `${chunks[0]}${BUBBLE_NB}${chunks[1]}`);
  // no line may start with ? ! : ; » …: such a chunk is glued to the one before it
  const glue = [];
  for (const c of chunks) {
    if (glue.length && /^[?!:;»…]/.test(c)) glue[glue.length - 1] += BUBBLE_NB + c;
    else glue.push(c);
  }
  return glue.join(' ');
}

function splitBubbleSentences(text) {
  const raw = String(text).trim();
  const parts = raw.split(/(?<=[^\s.!?…][.!?…]*[.!?…])[ \t\n\r]+(?![?!:;»…])/).filter(Boolean);
  return parts.length ? parts : [raw];
}

function layoutOneSentence(sentence, measure, maxInner) {
  const words = String(sentence).split(/[ \t]+/).filter(Boolean);
  const one = words.join(' ');
  const oneW = measure(one);
  if (words.length <= 1 || oneW <= maxInner + 0.5) return { lines: [one], width: oneW };
  let best = null;
  for (let n = 1; n < words.length; n += 1) {
    const a = words.slice(0, n).join(' ');
    const b = words.slice(n).join(' ');
    const width = Math.max(measure(a), measure(b));
    if (!best || width < best.width) best = { lines: [a, b], width };
  }
  return best;
}

/**
 * Bubble width comes from the text. Each sentence stays on at most two lines,
 * and the inner width is the widest of those lines (capped by the inset).
 */
export function layoutBandBubbleText(text, measure, maxInner) {
  const prepared = prepareBubbleText(text);
  const sentences = splitBubbleSentences(prepared).map((sentence) => {
    const laid = layoutOneSentence(sentence, measure, maxInner);
    return { text: sentence, lines: laid.lines, width: laid.width };
  });
  const lines = sentences.flatMap((s) => s.lines);
  const inner = lines.reduce((max, line) => Math.max(max, measure(line)), 0);
  return { prepared, sentences, lines, inner };
}

function compileScene(cfg) {
  const lib = cfg.cropLibrary || {};
  const useHandoff = cfg.useHandoffCameras === true;
  const resolve = (c) => {
    if (typeof c === 'string') {
      if (useHandoff) return resolveHandoffCropRef(cfg, c);
      const base = lib[c];
      if (!base) throw new Error(`Unknown crop ref: ${c}`);
      return { ...base };
    }
    if (useHandoff && c?.shotSize) return resolveHandoffCropRef(cfg, c.shotSize);
    return { ...c };
  };
  const out = { ...cfg, shots: cfg.shots.map((sh) => ({ ...sh, crop: resolve(sh.crop) })) };
  if (cfg.startCrop) out.startCrop = resolve(cfg.startCrop);
  return out;
}

function buildDom(container) {
  container.classList.add('scene-player-root');
  container.innerHTML = `
    <div class="scene-player-phone" aria-label="Portrait phone frame">
      <div class="scene-player-bubble-band" aria-hidden="true"></div>
      <div class="scene-player-stage">
        <canvas class="scene-layer" aria-label="Scene"></canvas>
        <div class="scene-player-fade" hidden></div>
        <div class="scene-player-overlay" role="button" tabindex="0" aria-label="Tap to start">
          <p></p>
        </div>
        <div class="scene-player-endcard" hidden>
          <h2></h2>
          <p></p>
          <button type="button" class="scene-player-replay">Replay</button>
        </div>
      </div>
      <canvas class="bubble-layer" aria-hidden="true"></canvas>
      <div class="scene-player-dialogue" hidden>
        <p class="scene-player-dialogue-speaker"></p>
        <p class="scene-player-dialogue-text"></p>
      </div>
    </div>`;
  return {
    phone: container.querySelector('.scene-player-phone'),
    bubbleBand: container.querySelector('.scene-player-bubble-band'),
    stage: container.querySelector('.scene-player-stage'),
    canvas: container.querySelector('canvas.scene-layer'),
    bubbleCanvas: container.querySelector('canvas.bubble-layer'),
    dialogue: container.querySelector('.scene-player-dialogue'),
    dialogueSpeaker: container.querySelector('.scene-player-dialogue-speaker'),
    dialogueText: container.querySelector('.scene-player-dialogue-text'),
    fadeVeil: container.querySelector('.scene-player-fade'),
    overlay: container.querySelector('.scene-player-overlay'),
    overlayText: container.querySelector('.scene-player-overlay p'),
    endCard: container.querySelector('.scene-player-endcard'),
    endTitle: container.querySelector('.scene-player-endcard h2'),
    endBody: container.querySelector('.scene-player-endcard p'),
    replayBtn: container.querySelector('.scene-player-replay')
  };
}

export async function initScenePlayer(container, configUrl, options = {}) {
  const configAssetBase = options.assetBaseUrl || configUrl;
  const dom = buildDom(container);
  const canvas = dom.canvas;
  const ctx = canvas.getContext('2d');
  const bctx = dom.bubbleCanvas.getContext('2d');
  let kitchenStageBufferCtx = null;
  let kitchenStageBufferCanvas = null;
  let queuedFloorContacts = [];
  let lastContactPaint = [];
  let drawnPropIds = new Set();
  let drawnPropBoxes = new Map();
  let drawnBottoms = [];
  const bakedSoleCache = new Map();
  let currentShotDef = null;
  let lastSoirBubbleWallRgb = null;
  const kitchenLightMapsCache = {};

  function dctx() {
    return kitchenStageBufferCtx || ctx;
  }
  const {
    phone, bubbleBand, stage, fadeVeil, overlay, overlayText, endCard, endTitle, endBody, replayBtn,
    dialogue, dialogueSpeaker, dialogueText
  } = dom;

  let CFG;
  const fileImages = {};
  const atlasImages = {};
  let spriteManifest = null;
  let manifestBaseUrl = null;
  let lastCloseInsertOrigin = null;
  let assetRoot = '';
  let audioCtx = null;
  const audioEls = new Map();
  let phase = 'overlay';
  let sceneT = 0;
  let lastFrame = 0;
  let previewHold = false;
  let tapAdvanceMode = false;
  let advanceCueTimes = [];
  let fadeAlpha = 0;
  let idleGlow = false;
  let tapRingTarget = null;
  let playedAudio = new Set();
  let animFrame = 0;

  let stageW = 390;
  let stageH = 700;
  let dpr = 1;
  let activeCrop = { x: 0, y: 0, w: 96, h: 64 };
  let activeScale = 4;
  let activeScaleDev = 4;
  let activeOx = 0;
  let activeOy = 0;
  let lastFraming = null;
  /** Main stage render: cover the scene band from set art + floor strip, before actors. */
  let canonicalBandCover = false;
  /** Survives renderSceneLayer so bubble draw can see the band-cover shot. */
  let bandCoverLayout = false;
  /** Staged feet/positions for the current band-cover shot. Null outside that layout. */
  let bandAnchorOverrides = null;
  /** Stairwell props redrawn after the floor so the brick plane does not erase them. */
  let bandCoverDeferAssets = null;
  const floorStripCanvasCache = new Map();
  let bubbleBandH = 0;
  let hudBandH = 0;
  let phoneH = 844;
  let currentLightVariant = 'day';
  const lightImages = {};
  const rooftopLightImages = {};
  const stairwellLightImages = {};

  const SW = 96;
  const SH = 64;
  const FURNITURE_PROPS = new Set([
    'window', 'shelf', 'counter', 'table', 'chair_left', 'chair_right', 'fridge', 'laptop',
    'backsplash', 'desk', 'plant', 'pendant', 'table_cup', 'table_plate', 'table_milk'
  ]);
  const KITCHEN_WALL_ANCHORED_PROPS = new Set([
    'cornice', 'upper_cabinets', 'clock', 'frame', 'house_rules'
  ]);
  const KITCHEN_SMALL_DISCRETE_PROPS = new Set([
    'house_rules', 'frame', 'clock', 'plant', 'laptop', 'pendant',
    'stash_pen', 'stash_sock', 'spoon_dirty', 'spoon_clean',
    'table_cup', 'table_plate', 'table_milk', 'table_plate_103', 'table_plate_133',
    'milk', 'coffee_pot', 'pastry_bag'
  ]);
  const KITCHEN_FLOAT_SURFACE_PROPS = new Set([
    'laptop', 'plant', 'stash_pen', 'stash_sock', 'spoon_dirty', 'spoon_clean',
    'table_cup', 'table_plate', 'table_milk', 'table_plate_103', 'table_plate_133',
    'milk', 'coffee_pot', 'pastry_bag'
  ]);
  const KITCHEN_BARE_WALL_SAMPLE = { x: 150, y: 40 };
  let kitchenBareWallRgb = null;
  /** fix23d: glass sprites (window pane, open-laptop screen) drawn into the kitchen buffer this render. */
  let kitchenPaneSprites = null;
  const KITCHEN_PANE_SPRITE_RE = /(^|\/)(window|laptop|laptop_open)\.png$/;
  let lastBubbleMetrics = null;
  let lastDrawnLine = null; // the bubble line drawBubbles last put on screen (beat + authored step)

  async function loadConfig() {
    const res = await fetch(configUrl);
    const raw = await res.json();
    if (raw.tapAdvance) tapAdvanceMode = true;
    if (raw.useHandoffCameras) {
      const scenesRoot = new URL('../', new URL(configAssetBase, window.location.href)).href;
      await loadHandoffCameras(scenesRoot);
    }
    if (!Array.isArray(raw.props) || raw.props.length === 0) {
      const loaded = await loadSetPropCatalog();
      raw.props = loaded.props;
      if (!raw.defaultStage && loaded.kitchenShellIds.length) {
        raw.defaultStage = { props: loaded.kitchenShellIds, actors: {} };
      }
    }
    CFG = compileScene(raw);
  }

  /**
   * Episode compiles list prop ids on the shot but omit the set catalog.
   * Positions and assets stay in the set scene files next to the asset base.
   */
  async function loadSetPropCatalog() {
    const base = new URL(configAssetBase, window.location.href);
    const urls = [base];
    if (base.pathname.endsWith('.json')) {
      urls.push(new URL('../day10-kitchen/scene.json', base));
      urls.push(new URL('../day10-stairwell/scene.json', base));
      urls.push(new URL('../day10-rooftop/scene.json', base));
    }
    const props = [];
    const seen = new Set();
    const shell = new Set(['cornice', 'upper_cabinets', 'backsplash']);
    const kitchenShellIds = [];
    for (const url of urls) {
      try {
        const res = await fetch(url.href);
        if (!res.ok) continue;
        const json = await res.json();
        const fromKitchen = /day10-kitchen\/scene\.json$/.test(url.pathname);
        for (const p of json.props || []) {
          if (!p?.id || seen.has(p.id)) continue;
          seen.add(p.id);
          props.push(p);
          if (fromKitchen && shell.has(p.id)) kitchenShellIds.push(p.id);
        }
      } catch {
        /* asset base is not a set scene */
      }
    }
    return { props, kitchenShellIds };
  }

  function configBaseUrl() {
    return new URL(configAssetBase, window.location.href);
  }

  function activePackId() {
    const fromUrl = new URL(window.location.href).searchParams.get('pack');
    if (fromUrl) return fromUrl;
    return CFG.assetPack || 'sofa';
  }

  function audioUrl(id) {
    const prefix = CFG.audioBase || '../audio/w1/';
    return new URL(`${prefix}${id}.mp3`, configBaseUrl()).href;
  }

  let setAtlasRoot = {};
  let setPackDups = [];
  async function loadSpriteManifest() {
    const indexUrl = new URL('../sprites.json', configBaseUrl());
    const indexRes = await fetch(indexUrl);
    if (!indexRes.ok) throw new Error(`Failed to load sprite index ${indexUrl}`);
    const index = await indexRes.json();
    const packId = activePackId();
    const rel = index.packs?.[packId] || index.packs?.[index.defaultPack];
    if (!rel) throw new Error(`Unknown sprite pack: ${packId}`);
    manifestBaseUrl = new URL(rel, indexUrl).href;
    const manRes = await fetch(manifestBaseUrl);
    if (!manRes.ok) throw new Error(`Failed to load manifest ${manifestBaseUrl}`);
    spriteManifest = await manRes.json();
    assetRoot = spriteManifest.assetRoot || '';
    const setsRootUrl = new URL('../../style/canonical/sets/', indexUrl);
    const loaded = [];
    for (const dir of packsForDay(CFG.day)) {
      const base = new URL(`${dir}/`, setsRootUrl).href;
      const setUrl = new URL('manifest.json', base);
      const setRes = await fetch(setUrl);
      if (!setRes.ok) throw new Error(`Failed to load set manifest ${setUrl} (HTTP ${setRes.status})`);
      loaded.push({ dir, base, manifest: await setRes.json() });
    }
    const merged = mergeSetPacks(loaded);
    setAtlasRoot = merged.atlasRoot;
    setPackDups = merged.dups;
    spriteManifest.atlases = { ...(spriteManifest.atlases || {}), ...merged.atlases };
    spriteManifest.assets = { ...(spriteManifest.assets || {}), ...merged.assets };
  }

  // rule: an id in two loaded packs must have pixel-identical frames (dev/test throws)
  function framePixels(entry) {
    const spec = entry?.frames ? null : entry;
    if (!spec) return null;
    const im = spec.source === 'atlas' ? atlasImages[spec.atlas] : fileImages[spec.file];
    if (!im) return null;
    const fr = spec.frame || { x: 0, y: 0, w: im.width, h: im.height };
    const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    return { w: fr.w, h: fr.h, data: g.getImageData(0, 0, fr.w, fr.h).data };
  }
  function assertSetPackDupsIdentical() {
    for (const d of setPackDups) {
      if (d.first?.type === 'sequence' || d.second?.type === 'sequence') {
        if (JSON.stringify(d.first.frames) !== JSON.stringify(d.second.frames)) throw new Error(`sprite id ${d.id} differs between packs ${d.packs.join(' / ')}`);
        continue;
      }
      const a = framePixels(d.first); const b = framePixels(d.second);
      if (!a || !b) continue; // not loaded here (lazy file); the node test checks every pair
      if (!framesIdentical(a, b)) throw new Error(`sprite id ${d.id} differs between packs ${d.packs.join(' / ')}`);
    }
  }

  function manifestRootForAtlas(atlasId) {
    return setAtlasRoot[String(atlasId || '')] || manifestBaseUrl;
  }

  function assetFileUrl(file, atlasId = null) {
    const base = atlasId ? manifestRootForAtlas(atlasId) : manifestBaseUrl;
    return new URL(assetRoot + file, base).href;
  }

  async function loadImageUrl(url, onLoad) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        onLoad(img);
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }

  async function loadImages() {
    await loadSpriteManifest();
    const files = new Set();
    const atlasIds = new Set();

    function noteSpec(spec) {
      if (!spec) return;
      if (spec.source === 'file' && spec.file) files.add(spec.file);
      if (spec.source === 'atlas' && spec.atlas) atlasIds.add(spec.atlas);
    }

    function walk(name, options = {}) {
      const entry = spriteManifest.assets[name];
      if (!entry) return;
      if (entry.type === 'sequence') {
        for (let i = 0; i < (entry.frames || []).length; i++) {
          noteSpec(resolveAsset(spriteManifest, name, { ...options, frameIndex: i }));
        }
        return;
      }
      if (entry.type === 'states') {
        for (const v of Object.values(entry.states || {})) if (typeof v === 'string') walk(v, options);
        return;
      }
      if (entry.type === 'backdrop') {
        try {
          noteSpec(resolveAsset(spriteManifest, name, { variant: 'base' }));
        } catch {
          /* optional */
        }
        try {
          noteSpec(resolveAsset(spriteManifest, name, { variant: 'tall' }));
        } catch {
          /* optional */
        }
        return;
      }
      try {
        noteSpec(resolveAsset(spriteManifest, name, options));
      } catch {
        /* skip */
      }
    }

    // Animation and held props can select assets absent from explicit scene names.
    for (const n of Object.keys(spriteManifest.assets || {})) walk(n);

    const loads = [];
    for (const file of files) {
      const url = assetFileUrl(file);
      loads.push(
        loadImageUrl(url, (img) => {
          fileImages[file] = img;
        })
      );
    }
    for (const id of atlasIds) {
      const a = spriteManifest.atlases[id];
      if (!a?.file) throw new Error(`Atlas ${id} missing file`);
      const url = assetFileUrl(a.file, id);
      loads.push(
        loadImageUrl(url, (img) => {
          atlasImages[id] = img;
        })
      );
    }
    const kl = spriteManifest.kitchenLight;
    if (kl) {
      for (const [key, file] of [
        ['eveningMultiply', kl.eveningMultiply],
        ['nightMultiply', kl.nightMultiply],
        ['nightAdd', kl.nightAdd],
        ['nightMultiplyCast', kl.nightMultiplyCast],
        ['nightAddCast', kl.nightAddCast]
      ]) {
        if (!file) continue;
        loads.push(
          loadImageUrl(assetFileUrl(file), (img) => {
            lightImages[key] = img;
          })
        );
      }
    }
    const rl = spriteManifest.rooftopLight;
    if (rl) {
      for (const [key, file] of [
        ['eveningMultiply', rl.eveningMultiply],
        ['nightMultiply', rl.nightMultiply],
        ['nightAdd', rl.nightAdd],
        ['nightMultiplyCast', rl.nightMultiplyCast],
        ['nightAddCast', rl.nightAddCast]
      ]) {
        if (!file) continue;
        loads.push(
          loadImageUrl(assetFileUrl(file), (img) => {
            rooftopLightImages[key] = img;
          })
        );
      }
    }
    const sl = spriteManifest.stairwellLight;
    if (sl) {
      for (const [key, file] of [
        ['eveningMultiply', sl.eveningMultiply],
        ['nightMultiply', sl.nightMultiply],
        ['nightAdd', sl.nightAdd],
        ['nightMultiplyCast', sl.nightMultiplyCast],
        ['nightAddCast', sl.nightAddCast]
      ]) {
        if (!file) continue;
        loads.push(
          loadImageUrl(assetFileUrl(file), (img) => {
            stairwellLightImages[key] = img;
          })
        );
      }
    }
    await Promise.all(loads);
    if (sitcomStrictMode() || globalThis.__A411_DEV) assertSetPackDupsIdentical();
    kitchenBareWallRgb = sampleKitchenBareWallRgb();
    applyBubbleBandWallFill();
  }

  function sampleKitchenBareWallRgb() {
    if (!spriteManifest?.kitchenStage) return null;
    try {
      const spec = resolveAsset(spriteManifest, 'backdrop.kitchen', { lightVariant: 'day' });
      const im = atlasImages[spec.atlas];
      const fr = spec.frame;
      if (!im || !fr) return null;
      const { x: stageX, y: stageY } = KITCHEN_BARE_WALL_SAMPLE;
      const tileW = fr.w || 64;
      const sx = fr.x + (stageX % tileW);
      const sy = fr.y + stageY;
      const scratch = document.createElement('canvas');
      scratch.width = 1;
      scratch.height = 1;
      const sctx = scratch.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(im, sx, sy, 1, 1, 0, 0, 1, 1);
      const d = sctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    } catch {
      return null;
    }
  }

  function kitchenWallCss(warm = false) {
    if (kitchenBareWallRgb) {
      const [r, g, b] = kitchenBareWallRgb;
      if (warm) {
        const wr = hexRgb(CFG.room.wallWarm || CFG.room.wall);
        const br = hexRgb(CFG.room.wall);
        const mix = 0.35;
        const rr = Math.round(r * (1 - mix) + wr[0] * mix);
        const gg = Math.round(g * (1 - mix) + wr[1] * mix);
        const bb = Math.round(b * (1 - mix) + wr[2] * mix);
        return `rgb(${rr},${gg},${bb})`;
      }
      return `rgb(${r},${g},${b})`;
    }
    return roomColors(warm).wall;
  }

  function applyBubbleBandWallFill() {
    if (!bubbleBand || !isKitchenSet()) return;
    bubbleBand.style.backgroundColor = kitchenWallCss(false);
  }

  function spriteBottomIsBakedContact(im, sx, sy, sw, sh) {
    if (!im || sh < 2 || sw < 1) return false;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = 1;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(im, sx, sy + sh - 1, sw, 1, 0, 0, sw, 1);
    const px = g.getImageData(0, 0, sw, 1).data;
    let translucent = false;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] >= 200) return false;
      if (px[i] >= 16) translucent = true;
    }
    return translucent;
  }

  function drawSpec(spec, placeX, placeY, flip = false, drawOpts = {}) {
    if (!spec) return;
    const { x, y, w, h } = placementTopLeft(spec, placeX, placeY, flip);
    let im;
    let sx = 0;
    let sy = 0;
    let sw = w;
    let sh = h;
    if (spec.source === 'file') {
      im = fileImages[spec.file];
      if (!im) return;
      sw = im.width;
      sh = im.height;
    } else if (spec.source === 'atlas') {
      im = atlasImages[spec.atlas];
      const fr = spec.frame;
      if (!im || !fr) return;
      sx = fr.x;
      sy = fr.y;
      sw = fr.w;
      sh = fr.h;
    } else return;

    let srcH = sh;
    let destH = h;
    if (drawOpts.omitBakedContact && spriteBottomIsBakedContact(im, sx, sy, sw, sh)) {
      srcH = sh - 1;
      destH = h - 1;
    }
    const drawOne = (dx, dy) => {
      const dc = dctx();
      if (!flip) {
        dc.drawImage(im, sx, sy, sw, srcH, dx, dy, w, destH);
        return;
      }
      dc.save();
      dc.translate(dx + w, dy);
      dc.scale(-1, 1);
      dc.drawImage(im, sx, sy, sw, srcH, 0, 0, w, destH);
      dc.restore();
    };

    if (spec.tile === 'x') {
      const tileW = sw;
      const stageWpx = sceneStage();
      for (let tx = Math.floor((0 - x) / tileW) * tileW; tx < stageWpx + tileW; tx += tileW) {
        drawOne(x + tx, y);
      }
      return;
    }
    drawOne(x, y);
    if (kitchenStageBufferCtx && kitchenPaneSprites && KITCHEN_PANE_SPRITE_RE.test(spec.file || '')) kitchenPaneSprites.push({ x, y, w, h, window: /(^|\/)window\.png$/.test(spec.file) });
  }

  let catDrawLog = [];
  function drawLogicalAsset(name, placeX, placeY, options = {}, flip = false) {
    try {
      const omitBakedContact = !!options.omitBakedContact;
      const spec = resolveAsset(spriteManifest, name, {
        ...options,
        omitBakedContact: undefined,
        lightVariant: options.lightVariant ?? kitchenAssetLightVariant()
      });
      let x = placeX;
      let y = placeY;
      if (bandCoverDeferAssets?.has(name)) return;
      const moved = bandAnchorOverrides?.assets?.[name];
      if (moved) {
        x = moved.x;
        y = moved.y;
      }
      if (canonicalBandCover && isStairwellSet() && String(name).startsWith('prop.') && !moved) {
        return;
      }
      drawSpec(spec, x, y, flip, { omitBakedContact });
      if (String(name).startsWith('croissant')) catDrawLog.push({ name, ...placementTopLeft(spec, x, y, flip) }); // fix18 test probe
      if (moved?.left != null && moved.w && moved.h) {
        noteDrawnProp(name, { x: moved.left, y: moved.top, w: moved.w, h: moved.h }, name);
      }
      if (canonicalBandCover && name === 'backdrop.stairwell') coverCutWallPanels();
    } catch {
      /* missing asset in pack */
    }
  }

  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {});
    } catch {
      audioCtx = null;
    }
  }

  function playClip(id) {
    if (!id || playedAudio.has(id)) return;
    playedAudio.add(id);
    const el = audioEls.get(id) || (() => {
      const a = new Audio(audioUrl(id));
      a.preload = 'auto';
      audioEls.set(id, a);
      return a;
    })();
    el.currentTime = 0;
    void el.play().catch(() => {});
  }

  function portraitSplit() {
    const split = CFG?.layout?.portraitSplit;
    if (split) return split;
    const hudLegacy = CFG?.layout?.dialogueHudHeight;
    if (hudLegacy) {
      const hud = hudLegacy / 844;
      return { bubble: 0, scene: 1 - hud, hud };
    }
    return { bubble: 0.15, scene: 0.55, hud: 0.3 };
  }

  function lockCanonicalPortraitBands() {
    if (!phone || !bubbleBand || !stage || !dialogue) return;
    const split = portraitSplit();
    if (Math.abs((split.bubble ?? 0) - 0.15) > 0.001) return;
    if (Math.abs((split.scene ?? 0) - 0.55) > 0.001) return;
    const ph = Math.round(phone.getBoundingClientRect().height);
    if (ph < 640) return;
    const bubble = Math.round(127 * ph / 844);
    const scene = Math.round(464 * ph / 844);
    const hud = Math.max(1, ph - bubble - scene);
    bubbleBand.style.flex = `0 0 ${bubble}px`;
    stage.style.flex = `0 0 ${scene}px`;
    dialogue.style.flex = `0 0 ${hud}px`;
  }

  function layoutMetrics() {
    lockCanonicalPortraitBands();
    const phoneRect = phone.getBoundingClientRect();
    const split = portraitSplit();
    phoneH = phoneRect.height;
    const stageRect = stage.getBoundingClientRect();
    stageW = Math.max(1, stageRect.width || phoneRect.width);
    stageH = Math.max(1, stageRect.height);
    bubbleBandH = bubbleBand?.getBoundingClientRect().height ?? Math.round(phoneH * split.bubble);
    hudBandH = dialogue?.getBoundingClientRect().height ?? Math.round(phoneH * split.hud);
    if (stageH <= 1) {
      stageH = Math.max(1, phoneH - bubbleBandH - hudBandH);
    }
    return { hudH: hudBandH, phoneH };
  }

  function resize() {
    const { hudH, phoneH: ph } = layoutMetrics();
    if (stageW < 1 || stageH < 1) return;
    const cap = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.round(stageW * cap);
    const bh = Math.round(stageH * cap);
    const pbw = Math.round(phone.getBoundingClientRect().width * cap);
    const pbh = Math.round(ph * cap);
    dpr = cap;
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = '';
    canvas.style.height = '';
    dom.bubbleCanvas.width = pbw;
    dom.bubbleCanvas.height = pbh;
    dom.bubbleCanvas.style.width = '';
    dom.bubbleCanvas.style.height = '';
    const sx = bw / stageW;
    const sy = bh / stageH;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    const bsx = pbw / stageW;
    const bsy = pbh / ph;
    bctx.setTransform(bsx, 0, 0, bsy, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (bubbleBand) bubbleBand.style.flexBasis = `${bubbleBandH}px`;
    if (dialogue) dialogue.style.flexBasis = `${hudH}px`;
    applyBubbleBandWallFill();
  }

  function sceneStage() {
    return CFG?.scene?.width ?? SW;
  }

  function sceneStageH() {
    return CFG?.scene?.height ?? SH;
  }

  function activeSetFromShot(shotDef) {
    const sh = shotDef || currentShotDef;
    if (!sh) return null;
    if (sh.rooftop) return 'rooftop';
    if (sh.stairwell) return 'stairwell';
    if (sh.kitchen) return 'kitchen';
    return null;
  }

  function isKitchenSet() {
    const fromShot = activeSetFromShot();
    if (fromShot) return fromShot === 'kitchen';
    return !!(CFG?.kitchen || spriteManifest?.kitchenStage);
  }

  function isRooftopSet() {
    const fromShot = activeSetFromShot();
    if (fromShot) return fromShot === 'rooftop';
    return typeof isRooftopScene === 'function' && isRooftopScene(CFG, spriteManifest);
  }

  function isStairwellSet() {
    const fromShot = activeSetFromShot();
    if (fromShot) return fromShot === 'stairwell';
    return typeof isStairwellScene === 'function' && isStairwellScene(CFG, spriteManifest);
  }

  /** fix23d P4 (Pixel ruling b): the baked night maps are masked against the static stage, so props (chair backs)
   *  leave lit silhouettes in them. Cast/actors grade with the set's unmasked night maps; a set without them falls
   *  back to the stage maps (logged once per set). */
  const castLightFallbackLogged = new Set();
  function resolveCastLightImages(imgs, setName = 'kitchen') {
    const r = castLightFiles(imgs);
    if (!r.fallback) return r;
    if (!castLightFallbackLogged.has(setName)) {
      castLightFallbackLogged.add(setName);
      try { console.info(`[light] ${setName}: no unmasked cast night maps; cast grades with the stage (masked) maps`); } catch {}
    }
    return r;
  }

  function activeLightImages() {
    if (isRooftopSet()) return rooftopLightImages;
    if (isStairwellSet()) return stairwellLightImages;
    return lightImages;
  }

  function drawRooftopUngradedScenery() {
    drawLogicalAsset('backdrop.rooftop_sky', 0, 0);
    drawLogicalAsset('backdrop.rooftop_skyline_far', 88, 115);
    drawLogicalAsset('backdrop.rooftop_tower', 118, 92);
    drawLogicalAsset('backdrop.rooftop_skyline', 48, 115);
    drawLogicalAsset('backdrop.rooftop_floor', 0, 128);
    drawLogicalAsset('prop.parapet', 16, 127);
  }

  function drawRooftopStringLightsEmitter() {
    if (currentLightVariant === 'night') {
      drawLogicalAsset('prop.string_lights_on', 37, 90);
    }
  }

  function paintRooftopBandFloor() {
    if (!isRooftopSet()) return;
    paintSetBandFloorExtension();
  }

  function drawStairwellLayerScenery() {
    const lv = currentLightVariant;
    drawStairwellScenery(drawLogicalAsset, { lightVariant: lv, skipFloorTiles: false });
  }

  function drawStairwellLayerUngraded(t, shotDef) {
    drawStairwellUngradedEmitters(drawLogicalAsset, { lightVariant: currentLightVariant });
    const stageDef = getStageForShot(shotDef || currentShotDef);
    drawLefevrePhoneGlowOverlay(stageDef, t ?? sceneT);
  }

  function paintStairwellBandFloor() {
    if (!isStairwellSet()) return;
    paintSetBandFloorExtension();
  }

  function drawStairwellFlashFrame(flash) {
    const crop = STAIRWELL_CROP_LIBRARY.close;
    const prevLv = currentLightVariant;
    currentLightVariant = flash.lightVariant || 'day';
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tone = flash.desaturate ?? 0.85;
    ctx.fillStyle = `rgba(100, 100, 108, ${Math.min(0.92, tone)})`;
    ctx.fillRect(0, 0, stageW, stageH);
    layoutCrop(crop, { lightVariant: currentLightVariant, stage: flash.stage }, sceneT);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-crop.x, -crop.y);
    drawStairwellLayerScenery();
    drawSceneContent(sceneT, {
      id: 'n_d11_souvenir',
      stage: flash.stage || {
        actors: {
          lefevre: {
            character: 'lefevre',
            x: 72,
            y: 136,
            asset: 'lefevre.stand',
            face: 'big-eyes'
          }
        }
      }
    });
    drawStairwellLayerUngraded(sceneT, { id: 'n_d11_souvenir', stage: flash.stage });
    ctx.restore();
    ctx.restore();
    currentLightVariant = prevLv;
  }

  function drawRooftopEveningInset(clipY0, clipY1) {
    const prevLv = currentLightVariant;
    currentLightVariant = 'evening';
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    ctx.rect(0, clipY0, stageW, clipY1 - clipY0);
    ctx.clip();
    const crop = { x: 46, y: 56, w: 90, h: 88, fixedScale: 12, cameraPreset: 'medium' };
    layoutCrop(crop, { lightVariant: 'evening' }, sceneT);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-crop.x, -crop.y);
    drawRooftopUngradedScenery();
    drawLogicalAsset('prop.roof_door_closed', 22, 131);
    drawLogicalAsset('prop.light_pole', 150, 131);
    drawLogicalAsset('prop.bench', 100, 131);
    drawLogicalAsset('prop.trough_planted', 132, 117);
    drawLogicalAsset('prop.pot_tall_planted', 46, 131);
    drawLogicalAsset('prop.pot_round_planted', 166, 131);
    drawLogicalAsset('prop.pot_chez_nous_young', 70, 134);
    drawActor('cat', {
      character: 'croissant',
      x: 118,
      y: 124,
      layer: 'front',
      asset: 'croissant.sit'
    }, sceneT);
    ctx.restore();
    applyKitchenLightGradeScreenStrip(activeOy, activeOy + stageH);
    ctx.restore();
    currentLightVariant = prevLv;
  }

  function shotLightVariant(shotDef) {
    return shotDef?.lightVariant || CFG?.lightVariant || 'day';
  }

  function kitchenSoirShot(shotDef = currentShotDef) {
    return isKitchenSet();
  }

  function kitchenUsesCanonicalStageRender(shotDef = currentShotDef) {
    return isKitchenSet();
  }

  function kitchenAssetLightVariant(shotDef = currentShotDef) {
    const lv = currentLightVariant;
    if (kitchenSoirShot(shotDef) && (lv === 'evening' || lv === 'night')) return 'night';
    return lv;
  }

  function kitchenUsesSoirStageGrade(shotDef = currentShotDef) {
    return kitchenUsesCanonicalStageRender(shotDef);
  }

  function kitchenShotUsesSoirLayout(shotDef) {
    return isKitchenSet();
  }

  function kitchenMarChatEveningShot(shotDef = currentShotDef) {
    return shotDef?.id === 'd11_mar_chat' && shotLightVariant(shotDef) !== 'day';
  }

  /** Stage actors for crop resolution only — must not call getStageForShot (avoids recursion). */
  function shotStageActorsForCrop(shotDef) {
    const base = CFG.defaultStage?.actors || {};
    const st = shotDef?.stage?.actors || {};
    let actors = { ...base, ...st };
    if (shotDef?.id === 'd11_mar_chat' && shotLightVariant(shotDef) !== 'day' && shotDef.soir?.stage?.actors) {
      actors = { ...actors };
      for (const [name, patch] of Object.entries(shotDef.soir.stage.actors)) {
        if (patch === null) delete actors[name];
        else if (patch) actors[name] = actors[name] ? { ...actors[name], ...patch } : { ...patch };
      }
    }
    return actors;
  }

  function shotUsesTable4Layout(shotDef) {
    if (!isKitchenSet() || !shotDef) return false;
    const cropRef = shotDef.crop;
    if (cropRef === 'medium_table4') return true;
    if (typeof cropRef === 'object' && cropRef?.cameraPreset === 'medium_table4') return true;
    return Object.values(shotStageActorsForCrop(shotDef)).some((d) => d && actorUsesTable4Seat(d));
  }

  function kitchenShotRenderCrop(shotDef) {
    const raw = shotDef?.crop;
    let base = typeof raw === 'string'
      ? { ...(CFG.cropLibrary?.[raw] || {}) }
      : (raw ? { ...raw } : null);
    if (!base) return raw;
    if (!isKitchenSet()) return base;
    const lv = shotLightVariant(shotDef);
    if (shotDef.id === 'd11_mar_chat' && shotDef.soir?.crop && lv !== 'day') {
      return { ...base, ...shotDef.soir.crop };
    }
    const table4Preset = typeof raw === 'string'
      ? raw
      : (raw?.cameraPreset ?? raw?.shotSize);
    if (table4Preset === 'medium_table4' && CFG.cropLibrary?.medium_table4
      && shotDef.id !== 'd11_mar_chat') {
      base = { ...CFG.cropLibrary.medium_table4 };
    }
    if (base?.x != null && base?.w != null) {
      const { w: SW, h: SH } = kitchenStageSize();
      const clampH = floorStripEnabled() ? kitchenExtendedStageHeight() : SH;
      return clampKitchenCropToStage(base, SW, clampH);
    }
    return base;
  }

  function shotAtTime(t) {
    const shots = CFG?.shots;
    if (!shots?.length) return null;
    for (const sh of shots) {
      if (t >= sh.t0 && t < sh.t1) return sh;
    }
    return shots[shots.length - 1];
  }

  function layoutProfile(shotDef) {
    const profile = shotDef?.layoutProfile ?? CFG.layout?.profile ?? 'dialogue';
    if (profile === 'lineup') {
      return {
        feetFraction: CFG.layout?.lineupFeetFraction ?? 0.78,
        headMinFrac: CFG.layout?.lineupHeadMinFrac ?? 0.38,
        headMaxFrac: CFG.layout?.lineupHeadMaxFrac ?? 0.68,
        maxBareFloorFrac: CFG.layout?.lineupMaxBareFloorFrac ?? 0.22,
        maxWallAboveHeadNative: CFG.layout?.maxWallAboveHeadNative ?? 30
      };
    }
    return {
      feetFraction: CFG.layout?.feetFraction ?? 0.8,
      headMinFrac: CFG.layout?.headMinFrac ?? 0.3,
      headMaxFrac: CFG.layout?.headMaxFrac ?? 0.55,
      maxBareFloorFrac: CFG.layout?.maxBareFloorFrac ?? 0.2,
      maxWallAboveHeadNative: CFG.layout?.maxWallAboveHeadNative ?? 30
    };
  }

  function kitchenClampResolvedCrop(crop, shotDef, t) {
    const { w: SW, h: SH } = kitchenStageSize();
    const clampH = floorStripEnabled() ? kitchenExtendedStageHeight() : SH;
    if (crop?.fromHandoff) {
      return clampKitchenCropToStage(crop, SW, clampH);
    }
    const stageDef = getStageForShot(shotDef);
    const actorBoxes = [];
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      if (!def) continue;
      const b = actorSceneBounds(spriteManifest, name, def, t);
      if (b) actorBoxes.push(b);
    }
    let c = clampKitchenCropToStage(crop, SW, clampH);
    c = enforceKitchenActorCropMargins(c, actorBoxes, SW, SH, 2);
    return c;
  }

  function activeStageArtSize() {
    if (isRooftopSet()) {
      const rs = spriteManifest?.rooftopStage;
      return {
        w: rs?.width ?? CFG.scene?.width ?? 192,
        h: rs?.height ?? CFG.scene?.height ?? 144,
        feet: rs?.feetLine ?? CFG.room?.floorTop ?? 136
      };
    }
    if (isStairwellSet()) {
      const ss = spriteManifest?.stairwellStage;
      return {
        w: ss?.width ?? CFG.scene?.width ?? 192,
        h: ss?.height ?? CFG.scene?.height ?? 144,
        feet: ss?.feetLine ?? CFG.room?.floorTop ?? 136
      };
    }
    const ks = spriteManifest?.kitchenStage;
    return {
      w: ks?.width ?? CFG.scene?.width ?? 192,
      h: ks?.height ?? CFG.scene?.height ?? 144,
      feet: ks?.feetLine ?? CFG.room?.floorTop ?? 136
    };
  }

  function chooseCoveringScales(stageCssW, stageCssH, extH) {
    const scales = [];
    for (const s of [5, 6]) {
      const viewH = Math.ceil(stageCssH / s);
      const viewW = Math.ceil(stageCssW / s);
      if (viewH <= extH && viewW * s >= stageCssW - 0.01 && viewH * s >= stageCssH - 0.01) {
        scales.push({ scale: s, viewW, viewH });
      }
    }
    return scales;
  }

  /**
   * Standing marks that sit on the wall/floor seam share the brick floor line.
   * Cats and seated poses keep their own surface.
   */
  function groundedFeetY(def) {
    const floor = CFG.room?.floorTop ?? 136;
    const horizon = CFG.room?.horizon ?? (floor - 8);
    if (!def || !Number.isFinite(def.y)) return def?.y;
    const asset = String(def.asset || '');
    const character = def.character || '';
    const cat = character === 'croissant' || character === 'cat' || asset.startsWith('croissant');
    if (cat || /sit|keyboard|sleep|lie|curl/.test(asset)) return def.y;
    if (def.y >= horizon && def.y < floor) return floor;
    return def.y;
  }

  function actorDrawDef(name, def) {
    if (!def) return def;
    const ov = bandAnchorOverrides?.actors?.[name]
      || bandAnchorOverrides?.actors?.[actorId(def.character || name)];
    const y = ov?.y ?? groundedFeetY(def);
    const x = ov?.x ?? def.x;
    if (x === def.x && y === def.y) return def;
    return { ...def, x, y };
  }

  function assetPlacementBox(name, x, y) {
    try {
      const spec = resolveAsset(spriteManifest, name, { lightVariant: currentLightVariant || 'day' });
      const rect = placementTopLeft(spec, x, y);
      return {
        x: rect.x,
        y: rect.y,
        w: spec.w,
        h: spec.h,
        ax: spec.anchorPoint?.x ?? 0,
        ay: spec.anchorPoint?.y ?? 0,
        opaque: opaqueInsetsFor(name)
      };
    } catch {
      return null;
    }
  }

  /** Transparent margin around the opaque pixels, shadows included. */
  function opaqueInsetsFor(name) {
    try {
      const spec = resolveAsset(spriteManifest, name, { lightVariant: currentLightVariant || 'day' });
      const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
      if (!im) return { l: 0, t: 0, r: 0, b: 0 };
      const sw = spec.frame?.w || spec.w;
      const sh = spec.frame?.h || spec.h;
      const sx = spec.frame?.x || 0;
      const sy = spec.frame?.y || 0;
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      const d = g.getImageData(0, 0, sw, sh).data;
      let minX = sw;
      let minY = sh;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < sh; y += 1) {
        for (let x = 0; x < sw; x += 1) {
          if (d[(y * sw + x) * 4 + 3] < 16) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return { l: 0, t: 0, r: 0, b: 0 };
      return { l: minX, t: minY, r: sw - 1 - maxX, b: sh - 1 - maxY };
    } catch {
      return { l: 0, t: 0, r: 0, b: 0 };
    }
  }

  function pickBandViewTop(scale) {
    const floor = CFG.room?.floorTop ?? 136;
    const bandH = 464;
    // The sole is the bottom screen row of the scene pixel just above the floor line:
    // feetPct = (floor - viewTop) * scale / bandH. Aim at 75% of the band.
    const minTop = Math.ceil(floor - (0.80 * bandH) / scale - 1e-9);
    const maxTop = Math.floor(floor - (0.70 * bandH) / scale + 1e-9);
    const spriteTop = floor - 23;
    const aim = Math.round(floor - (0.75 * bandH) / scale);
    const hi = Math.min(maxTop, spriteTop);
    const lo = Math.max(0, minTop);
    if (hi < lo) return lo;
    return Math.max(lo, Math.min(hi, aim));
  }

  function bandCoverSubjectBoxes(shotDef, t) {
    const stageDef = getStageForShot(shotDef);
    const boxes = [];
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      if (!def || def.x == null) continue;
      const b = actorSceneBounds(spriteManifest, name, def, t);
      if (!b) continue;
      const asset = String(def.asset || '');
      const character = def.character || name;
      const cat = character === 'croissant' || name === 'cat' || asset.startsWith('croissant');
      const standing = !cat && !/sit|keyboard|sleep|lie|curl/.test(asset);
      boxes.push({ ...b, kind: cat ? 'cat' : 'actor', id: name, feetY: def.y, standing });
    }
    for (const d of stageDef.sitcomOverlay?.draws || []) {
      if (d.kind !== 'cat' || d.x == null || !d.asset) continue;
      if (boxes.some((b) => b.kind === 'cat')) continue;
      try {
        const spec = resolveAsset(spriteManifest, d.asset, { lightVariant: 'day' });
        const rect = placementTopLeft(spec, d.x, d.y);
        boxes.push({
          x: rect.x, y: rect.y, w: spec.w, h: spec.h,
          kind: 'cat', id: 'cat', feetY: d.y, standing: false
        });
      } catch { /* skip */ }
    }
    return { stageDef, boxes };
  }

  function mergedShotPropIds(shotDef) {
    const base = CFG.defaultStage?.props ?? [];
    const st = shotDef?.stage?.props ?? [];
    const exclude = new Set([
      ...(shotDef?.excludeProps || []),
      ...(shotDef?.stage?.excludeProps || [])
    ]);
    let props = isKitchenSet()
      ? [...new Set([...base, ...st])]
      : (st.length ? st : [...base]);
    if (exclude.size) props = props.filter((id) => !exclude.has(id));
    return props;
  }

  function propBoxAt(p, x, y) {
    const asset = resolvePropAsset(p);
    if (!asset || x == null || y == null) return null;
    try {
      const spec = resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() });
      const rect = placementTopLeft(spec, x, y);
      return { x: rect.x, y: rect.y, w: spec.w, h: spec.h };
    } catch {
      return null;
    }
  }

  /**
   * Integer per-shot zoom at scale 5 or 6. Feet stay near 75% of the band.
   * Catalog pieces fill the wall above the heads; nothing is sliced to do it.
   */
  // integer scale for a preset crop zoomed relative to the band's wide scale; null = no zoom
  function presetZoomK(crop, baseScale) {
    if (!crop || !(crop.presetZoom > 1) || !Number.isFinite(crop.presetRelX) || !Number.isFinite(crop.presetRelY)) return null;
    return Math.max(baseScale + 1, Math.round(baseScale * crop.presetZoom));
  }

  // centre of a medium/close preset aimed at its `on` targets (crop.aim from the compiler): a target the band packed
  // (actor / cat box) is read at its drawn spot, else at its mark. Feet sit low in the frame (~70% down).
  let lastAimFrame = null;
  // fix20 (generic): drawn overlay sprite rect of a footprint-less prop in the current shot
  function drawnPropRect(id) { const sh = shotAtTime(sceneT); return overlayPropRect(spriteManifest, getStageForShot(sh)?.sitcomOverlay?.draws, id, shotLightVariant(sh)); }
  function keepWideAimsInView(vx, vw, aims, bxs) {
    const keep = aims.filter((a) => (a.prio ?? 0) <= 1).map((a) => (a.box ? bxs.find((x) => x.id === a.box || (a.box === 'cat' && x.kind === 'cat')) : null)
      || (a.rect && Number.isFinite(a.rect.w) ? a.rect : null) || (a.prop ? drawnPropRect(a.prop) : null)).filter(Boolean)
      .map((b) => (b.kind === 'actor' || b.kind === 'cat' ? opaqueKeepBox(b, standOpaqueX(b.kind, b.w)) : b)); // fix21 item 5: opaque body, not the frame margin
    return keepSpanInView(vx, vw, keep);
  }

  function presetAimPoint(crop, boxes, zoomView) {
    if (!Array.isArray(crop?.aim) || !crop.aim.length) return null;
    const pts = [];
    const bbs = [];
    for (const a of crop.aim) {
      const b = a.box ? boxes.find((x) => x.id === a.box || (a.box === 'cat' && x.kind === 'cat')) : null;
      if (!b) {
        pts.push({ x: a.x, y: a.y });
        // prop targets carry their registry footprint (subshots.aimTargets)
        if (a.rect && Number.isFinite(a.rect.w)) bbs.push({ ...a.rect });
        // fix20 (generic): a named prop with no registry footprint frames its DRAWN overlay sprite rect
        else if (a.prop) { const sh = shotAtTime(sceneT); const r = overlayPropRect(spriteManifest, getStageForShot(sh)?.sitcomOverlay?.draws, a.prop, shotLightVariant(sh)); if (r) { bbs.push(r); pts[pts.length - 1] = { x: r.x + r.w / 2, y: r.y + r.h }; } }
        continue;
      }
      const ov = b.kind === 'cat' ? bandAnchorOverrides?.cat : bandAnchorOverrides?.actors?.[b.id];
      const px = ov?.x ?? (b.x + b.w / 2);
      const py = ov?.y ?? b.feetY ?? a.y;
      pts.push({ x: px, y: py });
      // the target's full drawn head+body box (shifted with the packed spot)
      const dx = px - (b.x + b.w / 2);
      const dy = ov?.y != null && b.feetY != null ? ov.y - b.feetY : 0;
      bbs.push({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });
    }
    const x = pts.reduce((v, p) => v + p.x, 0) / pts.length;
    const y = pts.reduce((v, p) => v + p.y, 0) / pts.length;
    const bbox = bbs.length ? unionRect(bbs) : null;
    return { x, y: y - zoomView.h * 0.2, bbox };
  }

  function layoutCanonicalBandCover(crop, shotDef, t) {
    lastAimFrame = null;
    // fix23 (generic): a spatial-relation line plays in its group's ONE relation camera (compile relationGroups):
    // reference + related props framed first, speaker only if it fits (else dashed off-screen bubble)
    const relCrop = relationCropAt(shotDef, t);
    if (relCrop) crop = relCrop;
    const art = activeStageArtSize();
    const extH = Math.max(art.h, kitchenExtendedStageHeight());
    const feetLine = CFG.room?.floorTop ?? art.feet ?? 136;
    const { stageDef, boxes } = bandCoverSubjectBoxes(shotDef, t);
    const scales = chooseCoveringScales(stageW, stageH, extH);
    let picked = null;
    for (const sc of scales) {
      const viewTop = pickBandViewTop(sc.scale);
      const maxTop = Math.max(0, extH - sc.viewH);
      const top = Math.max(0, Math.min(maxTop, viewTop));
      const usableW = Math.floor(stageW / sc.scale);
      const usableH = Math.floor(stageH / sc.scale);
      if (isStairwellSet()) {
        const pack = packStairwellBand(stageDef, boxes, sc, top, usableW, usableH, art.w);
        if (pack) {
          picked = { ...sc, viewTop: top, pack, usableW };
          break;
        }
      } else if (castFitsBandWindow(boxes, usableW, top, usableH)) {
        picked = { ...sc, viewTop: top, pack: null, usableW };
        break;
      }
    }
    if (!picked) {
      const fallback = scales[0] || { scale: 5, viewW: Math.ceil(stageW / 5), viewH: Math.ceil(stageH / 5) };
      const top = pickBandViewTop(fallback.scale);
      picked = { ...fallback, viewTop: Math.max(0, Math.min(extH - fallback.viewH, top)), pack: null, usableW: Math.floor(stageW / fallback.scale) };
    }

    const camK = crop && [crop.k, crop.viewX, crop.viewY].every(Number.isFinite) ? crop.k : null;
    const scale = camK ?? picked.scale;
    const viewW = camK != null ? Math.ceil(stageW / camK) : picked.viewW;
    const viewH = camK != null ? Math.ceil(stageH / camK) : picked.viewH;
    let viewTop = picked.viewTop;
    let viewX = 0;
    let zoomView = null;
    if (picked.pack) {
      bandAnchorOverrides = picked.pack.overrides;
      viewX = picked.pack.viewX;
    } else {
      bandAnchorOverrides = { actors: {}, assets: {}, cat: null };
      for (const b of boxes) {
        if (!b.standing) continue;
        const y = groundedFeetY({ asset: '', character: b.kind === 'cat' ? 'cat' : b.id, y: b.feetY });
        if (y !== b.feetY) bandAnchorOverrides.actors[b.id] = { x: b.x + b.w / 2, y };
        // fix20 (generic): a standing actor whose sprite pokes past the set art edge is drawn whole inside it
        const cx = clampSpriteX(b.x, b.w, art.w);
        if (b.kind !== 'cat' && cx !== b.x + b.w / 2) bandAnchorOverrides.actors[b.id] = { x: cx, y: bandAnchorOverrides.actors[b.id]?.y ?? b.feetY };
      }
      const framed = frameUnionInView(boxes, bandAnchorOverrides, picked.usableW || viewW, art.w);
      viewX = framed.viewX;
      // fix20 (generic): an aimed wide band view (single-segment beat) keeps its speaker / named subjects (prio <= 1) whole
      if (Array.isArray(crop?.aim) && crop.aim.length) viewX = keepWideAimsInView(viewX, picked.usableW || viewW, focusActiveSpeaker(crop, activeBubbles(t).slice(-1)[0]?.actor).aim, boxes);
    }
    if (viewX < 0) viewX = 0;
    if (viewX + viewW > art.w && art.w >= viewW) viewX = art.w - viewW;
    viewX = Math.round(viewX);
    viewTop = Math.round(viewTop);
    if (camK != null) {
      viewX = crop.viewX; viewTop = crop.viewY;
      // fix20: an authored step crop keeps its aimed speaker's frame whole (minimal pan within the visible width)
      if (Array.isArray(crop.aim) && crop.aim.length) viewX = keepWideAimsInView(viewX, Math.floor(stageW / camK), stepCropKeep(crop.aim, activeBubbles(t).slice(-1)[0]?.actor, activeBubbles(t).slice(-1)[0]?.text), boxes); // fix20 K: speaker first, then named props when they fit
    } else if (presetZoomK(crop, picked.scale) != null) {
      // honour a medium/close preset crop inside the auto-framed wide band view
      const k = presetZoomK(crop, picked.scale);
      const usableW = picked.usableW || Math.floor(stageW / picked.scale);
      const usableH = Math.floor(stageH / picked.scale);
      zoomView = { k, w: Math.ceil(stageW / k), h: Math.ceil(stageH / k) };
      let aimed = presetAimPoint(crop, boxes, zoomView);
      // an aimed target's whole head+body box must fit: loosen the zoom (never below the wide) until it does
      for (let kk = k - 1; aimed?.bbox && kk >= picked.scale /* fix20: the wide scale itself is allowed */
        && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */); kk -= 1) {
        zoomView = { k: kk, w: Math.ceil(stageW / kk), h: Math.ceil(stageH / kk) };
        aimed = presetAimPoint(crop, boxes, zoomView);
      }
      // fix19b (ruling 4): still too big at the loosest zoom -> drop the lowest-priority aims (prio 2 = "the rest",
      // last first) until speaker + named props fit; they are never dropped
      const fitAt = (c) => {
        zoomView = { k, w: Math.ceil(stageW / k), h: Math.ceil(stageH / k) };
        aimed = presetAimPoint(c, boxes, zoomView);
        for (let kk = k - 1; aimed?.bbox && kk >= picked.scale /* fix20: the wide scale itself is allowed */
          && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */); kk -= 1) {
          zoomView = { k: kk, w: Math.ceil(stageW / kk), h: Math.ceil(stageH / kk) };
          aimed = presetAimPoint(c, boxes, zoomView);
        }
        return !(aimed?.bbox && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */));
      };
      if (aimed?.bbox && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */)) {
        crop = dropLowPriorityAims(crop, fitAt);
        fitAt(crop);
      }
      // fix20: still too wide -> shot / reverse-shot on the active line's speaker (named subjects kept)
      if (aimed?.bbox && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */)) {
        crop = focusActiveSpeaker(crop, activeBubbles(t).slice(-1)[0]?.actor);
        fitAt(crop);
      }
      // fix20: speaker + named subjects still cannot share the portrait view -> the speaker wins (named dropped, KNOWN)
      if (aimed?.bbox && (!bboxFitsView(aimed.bbox, zoomView.k, stageW, stageH) /* fix20 M: visible size */)) {
        // fix20 O (10:49 ruling): speaker wins at the widest zoom (wide band scale); named props best effort
        ({ crop, zoomView } = speakerWinsCrop(crop, picked.scale, stageW, stageH));
        aimed = presetAimPoint(crop, boxes, zoomView);
      }
      let cx = aimed ? aimed.x : viewX + crop.presetRelX * usableW;
      let cy = aimed ? aimed.y : viewTop + crop.presetRelY * usableH;
      // fix18: an aim carrying a registry close_frame puts the lowest aimed sole at sole_frac of the view (up to
      // max_sole_frac to keep top_margin_px screen px above the aimed bbox) instead of the generic feet-at-70% rule
      const cfA = aimed ? crop.aim.find((a) => a.closeFrame) : null;
      if (cfA && aimed.bbox) {
        const cf = cfA.closeFrame; const hh = zoomView.h; const kk = zoomView.k;
        const soleEnd = aimed.bbox.y + aimed.bbox.h; // one past the lowest aimed sole row
        let top = Math.round(soleEnd - cf.sole_frac * hh);
        while ((aimed.bbox.y - top) * kk < cf.top_margin_px && (soleEnd - (top - 1)) / hh <= cf.max_sole_frac) top -= 1;
        cy = top + hh / 2;
        cx = aimed.bbox.x + aimed.bbox.w / 2; // centre the whole aimed group (equal side margins)
      }
      // fix20: contain against the VISIBLE view (stageW / k floored), not the ceil'd draw view (6 px edge cut at k 9-11)
      const visW = Math.floor(stageW / zoomView.k), visH = Math.floor(stageH / zoomView.k);
      const v = containAimedView(
        { x: cx - visW / 2, y: cy - visH / 2, w: visW, h: visH },
        aimed?.bbox || null,
        { w: art.w, h: extH }
      );
      viewX = Math.round(v.x);
      viewTop = Math.round(v.y);
      lastAimFrame = aimed?.bbox ? { view: { x: viewX, y: viewTop, w: zoomView.w, h: zoomView.h }, bbox: aimed.bbox, aim: crop.aim.map((a) => a.box) } : null;
    } else if (!picked.pack && isKitchenSet()) {
      viewX = placeKitchenBandSet(
        viewX,
        viewTop,
        picked.usableW || Math.floor(stageW / scale),
        Math.floor(stageH / scale),
        shotDef,
        boxes,
        art.w
      );
    } else if (!picked.pack && isRooftopSet()) {
      const usable = picked.usableW || Math.floor(stageW / scale);
      const contactFrame = {
        viewX, viewTop, usableW: usable, usableH: Math.floor(stageH / scale),
        scale, stageW, stageH
      };
      const floor = CFG.room?.floorTop ?? 136;
      keepCatOffHeads(boxes, scale);
      if (!preservesAuthoredPropLayout()) nudgeBandPropsInside(shotDef, contactFrame);
      if (shotDef?.id === 'w') placeBucketClearOfCast(shotDef, boxes, contactFrame);
      const loose = loosePiecesForShot(shotDef, floor, contactFrame);
      lowerActorsInFront(boxes, loose, floor, { viewX, scale, stageW });
      const stageActors = getStageForShot(shotDef).actors || {};
      const contacts = [];
      for (const contact of contactsFromLoosePieces(loose, floor)) {
        if (contact.floorStanding) stampActorOmit(contact, boxes, stageActors, floor);
        contacts.push(contact);
      }
      bandAnchorOverrides.contacts = planContactShadows({ entities: contacts, floor, frame: contactFrame });
    }

    // fix18 (generic): a sub-shot whose story segment names / acts the cat keeps the cat's whole DRAWN sprite inside
    // the view (shift only; the zoom stays). Authored step crops (compile: not flagged) are the Réalisateur’s frame.
    if (shotDef?.subshot?.catFramed) {
      const cb = boxes.find((b) => b.kind === 'cat');
      if (cb) {
        const ov = bandAnchorOverrides?.cat;
        const dx = ov?.x != null ? ov.x - (cb.x + cb.w / 2) : 0;
        const dy = ov?.y != null && cb.feetY != null ? ov.y - cb.feetY : 0;
        const r = { x: cb.x + dx, y: cb.y + dy, w: cb.w, h: cb.h };
        const vw = zoomView ? zoomView.w : viewW; const vh = zoomView ? zoomView.h : viewH;
        const v0 = { x: viewX, y: viewTop, w: vw, h: vh };
        // fix20: speaker / named targets first -- the cat shift never pushes the aimed group out of the view
        const v = keepAimedInView(v0, containAimedView(v0, r, { w: art.w, h: extH }), lastAimFrame?.bbox || null);
        viewX = Math.round(v.x); viewTop = Math.round(v.y);
      }
    }
    const outScale = zoomView ? zoomView.k : scale;
    activeScale = outScale;
    activeScaleDev = outScale * dpr;
    activeOx = 0;
    activeOy = 0;
    activeCrop = {
      ...(crop || {}),
      x: viewX,
      y: viewTop,
      w: zoomView ? zoomView.w : viewW,
      h: zoomView ? zoomView.h : viewH,
      fixedScale: Math.round(outScale),
      cameraPreset: crop?.cameraPreset || presetFromCropRef(crop || {})
    };
    const floorScreen = activeOy + (feetLine - viewTop) * activeScale;
    const headScene = CFG.layout?.castHeadY ?? 22;
    lastFraming = {
      scale: activeScale,
      scaleDev: activeScaleDev,
      oy: activeOy,
      ox: activeOx,
      headY: activeOy + (headScene - viewTop) * activeScale,
      feetY: floorScreen,
      floorBandFrac: stageH > 0 ? floorScreen / stageH : 0,
      bareBelowFeet: stageH - floorScreen,
      stageH,
      crop: { ...activeCrop }
    };
  }

  function castFitsBandWindow(boxes, usableW, viewTop, usableH) {
    const actors = boxes.filter((b) => b.kind === 'actor');
    if (!actors.length) return true;
    const pad = 2;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const b of actors) {
      const left = b.x + pad;
      const right = b.x + b.w - pad;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      if (b.y + 1 < viewTop || b.y + b.h - 1 > viewTop + usableH - 1) return false;
    }
    return maxX - minX <= usableW;
  }

  function frameUnionInView(boxes, overrides, usableW, artW) {
    const pad = 2;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const b of boxes) {
      if (b.kind !== 'actor') continue;
      const ov = overrides?.actors?.[b.id];
      const left = (ov ? ov.x - b.w / 2 : b.x) + pad;
      const right = left + b.w - pad * 2;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
    }
    if (minX === Infinity) return { viewX: 0 };
    const span = maxX - minX;
    let viewX = Math.round(minX - Math.max(0, (usableW - span) / 2));
    const lo = Math.ceil(maxX - usableW);
    const hi = Math.floor(minX);
    if (lo <= hi) {
      if (viewX < lo) viewX = lo;
      if (viewX > hi) viewX = hi;
    }
    if (viewX < 0) viewX = 0;
    if (viewX + usableW > artW && artW >= usableW) {
      const artRight = artW - usableW;
      if (artRight >= lo && artRight <= hi) viewX = artRight;
    }
    return { viewX };
  }

  function standOpaqueX(kind, w) {
    if (kind === 'cat') return { left: 1, right: Math.max(1, w - 2) };
    if (w >= 16) return { left: 3, right: 12 };
    return { left: 1, right: Math.max(1, w - 2) };
  }

  /** Scene columns where the actor sprite is opaque on `rowY`. */
  function spriteOpaqueSceneColumns(assetName, flip, anchorX, feetY, rowY) {
    try {
      const spec = resolveAsset(spriteManifest, assetName, { lightVariant: kitchenAssetLightVariant() });
      const ay = spec.anchorPoint?.y ?? ((spec.h || 1) - 1);
      const ax = spec.anchorPoint?.x ?? 0;
      const localY = rowY - (feetY - ay);
      const sw = spec.frame?.w || spec.w;
      const sh = spec.frame?.h || spec.h;
      if (localY < 0 || localY >= sh) return [];
      const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
      if (!im) return [];
      const sx = spec.frame?.x || 0;
      const sy = spec.frame?.y || 0;
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      const d = g.getImageData(0, 0, sw, sh).data;
      const left = anchorX - ax;
      const cols = [];
      for (let x = 0; x < sw; x += 1) {
        if (d[(localY * sw + x) * 4 + 3] < 16) continue;
        cols.push(left + (flip ? sw - 1 - x : x));
      }
      return cols;
    } catch {
      return [];
    }
  }

  /**
   * Kitchen catalog stack inside the window: cabinets, backsplash and shelf
   * fill the wall above the hair; the counter is the surface under the pot.
   * Every piece is fully inside the full-pixel window.
   */
  function loosePiecesForShot(shotDef, floor, frame) {
    if (!shotDef) return [];
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const stageDef = getStageForShot(shotDef);
    const pieces = [];
    for (const id of mergedShotPropIds(shotDef)) {
      if (isWallMountedPiece(id) || FLOOR_STANDING[id]) continue;
      const p = catalog[id];
      if (!p) continue;
      const asset = resolvePropAsset(p);
      if (asset && isWallMountedPiece(asset)) continue;
      const place = propDrawPosition(stageDef, id, p);
      const spec = assetPlacementBox(asset || p.asset, place.x, place.y);
      if (!spec) continue;
      const piece = {
        id,
        asset,
        left: spec.x,
        top: spec.y,
        w: spec.w,
        h: spec.h,
        ax: spec.ax,
        ay: spec.ay,
        opaque: spec.opaque
      };
      // The cafe keeps its accepted placement. A chair or cup that hangs past
      // the crop still rests on the visible floor, so it keeps a band clipped
      // to the inset. A piece that misses the crop entirely does not.
      if (frame && (shotDef.id === LOCKED_CAFE_SHOT ? pieceMissesCrop(piece, frame) : pieceCutByFrame(piece, frame))) continue;
      pieces.push(piece);
    }
    return pieces;
  }

  function contactsFromLoosePieces(pieces, floor) {
    const contacts = [];
    for (const piece of pieces) {
      const contact = loosePropContact(piece, floor, pieces);
      if (contact) contacts.push(contact);
    }
    return contacts;
  }

  function stampActorOmit(contact, boxes, stageActors, floor) {
    if (!contact) return;
    const bandY = contactSoleRow(contact) + 1;
    const omit = [...(contact.omitColumns || [])];
    for (const b of boxes || []) {
      if (b.kind !== 'actor' || b.standing === false) continue;
      const ax = b.w / 2;
      const prev = bandAnchorOverrides?.actors?.[b.id];
      const anchorX = prev?.x ?? (b.x + ax);
      const feetY = prev?.y ?? b.feetY ?? floor;
      const def = stageActors?.[b.id];
      if (def?.asset) omit.push(...spriteOpaqueSceneColumns(def.asset, !!def.flip, anchorX, feetY, bandY));
      omit.push(...actorEllipseColumns(anchorX, feetY, bandY));
    }
    if (omit.length) contact.omitColumns = omit;
  }

  function lowerActorsInFront(boxes, pieces, floor, shadowFrame) {
    for (const b of boxes || []) {
      if (b.kind !== 'actor' || b.standing === false) continue;
      const ax = b.w / 2;
      const prev = bandAnchorOverrides.actors[b.id];
      const anchorX = prev?.x ?? (b.x + ax);
      const next = shiftAnchorInsideInset(anchorX, shadowFrame, { ax, w: b.w });
      const authoredFeet = prev?.y ?? b.feetY ?? floor;
      let feetY = authoredFeet;
      for (const piece of pieces) {
        if (isWallMountedPiece(piece) || !actorStandsInFront(next, piece)) continue;
        const feet = piece.top + (piece.ay ?? piece.h - 1);
        const onFloor = !!FLOOR_STANDING[piece.id] || Math.abs(feet - floor) <= 6;
        if (!onFloor) continue;
        const baseY = FLOOR_STANDING[piece.id] ? piece.top + piece.h - 1 : feet;
        feetY = feetAnchorBelowFurniture(feetY, baseY, 1);
      }
      const bubbleHeadLift = feetY - authoredFeet;
      if (next !== anchorX || feetY !== authoredFeet) {
        bandAnchorOverrides.actors[b.id] = { x: next, y: feetY, bubbleHeadLift };
      }
    }
  }

  function keepCatOffHeads(boxes, scale) {
    const cat = (boxes || []).find((b) => b.kind === 'cat');
    if (!cat || !bandAnchorOverrides) return;
    const heads = (boxes || []).filter((b) => b.kind === 'actor');
    if (!heads.length) return;
    const gapAt = (left) => Math.min(...heads.map((h) => catHeadGapPx(
      { left, top: cat.y, w: cat.w, h: cat.h },
      { left: h.x, top: h.y, w: h.w, h: h.h },
      scale
    )));
    if (gapAt(cat.x) >= BAND_CAT_HEAD_GAP_PX) return;
    for (const dir of [1, -1]) {
      for (let step = 1; step <= 48; step += 1) {
        const left = cat.x + dir * step;
        if (gapAt(left) < BAND_CAT_HEAD_GAP_PX) continue;
        const anchor = { x: left + cat.w / 2, y: cat.feetY };
        bandAnchorOverrides.actors[cat.id] = anchor;
        bandAnchorOverrides.actors.croissant = anchor;
        bandAnchorOverrides.cat = anchor;
        return;
      }
    }
  }

  function rectsOverlapScene(a, b) {
    if (!a || !b || a.left == null || b.left == null) return false;
    const aw = a.w || 0;
    const ah = a.h || 0;
    const bw = b.w || 0;
    const bh = b.h || 0;
    const overlapX = Math.min(a.left + aw, b.left + bw) - Math.max(a.left, b.left);
    const overlapY = Math.min(a.top + ah, b.top + bh) - Math.max(a.top, b.top);
    return overlapX > 1 && overlapY > 1;
  }

  /**
   * Pull a loose prop fully inside the 12px inset. A window that would still
   * cover the cabinets or the backsplash is not drawn. The watering can is
   * dropped onto the floor everywhere except the passing rooftop shots.
   */
  /**
   * The grey bucket (pot_chez_nous) on shot w overlaps the cast at its
   * authored anchor. Park it on the floor in the first inset gap that
   * clears every actor, and leave the rest of the rooftop where it was
   * authored. nudgeBandPropsInside is what pulled the off-screen tree,
   * hedge, lamp and large pot into this frame.
   */
  function placeBucketClearOfCast(shotDef, boxes, frame) {
    if (!bandAnchorOverrides || shotDef?.id !== 'w') return;
    const id = 'pot_chez_nous';
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const prop = catalog[id];
    if (!prop) return;
    const asset = resolvePropAsset(prop);
    const spec = asset ? assetPlacementBox(asset, 0, 0) : null;
    if (!spec) return;
    const floor = CFG.room?.floorTop ?? 136;
    const width = spec.w;
    const height = spec.h;
    const ax = spec.ax ?? 0;
    const ay = spec.ay ?? (height - 1);
    const limits = insetSceneLimits(frame, width, height, spec.opaque);
    if (limits.minLeft > limits.maxLeft) return;
    const spans = (boxes || [])
      .filter((b) => b && (b.kind === 'actor' || b.kind === 'cat'))
      .map((b) => [b.x - 1, b.x + b.w]);
    const hits = (left) => spans.some(([a, b]) => Math.min(left + width, b) - Math.max(left, a) > 0);
    let left = limits.minLeft;
    if (hits(left)) {
      let found = null;
      for (let cursor = limits.minLeft; cursor <= limits.maxLeft; cursor += 1) {
        if (!hits(cursor)) { found = cursor; break; }
      }
      if (found == null) return;
      left = found;
    }
    const top = floor - ay;
    const anchor = { x: left + ax, y: top + ay, left, top, w: width, h: height };
    bandAnchorOverrides.assets[id] = anchor;
    if (asset) bandAnchorOverrides.assets[asset] = anchor;
  }

  function nudgeBandPropsInside(shotDef, frame) {
    if (!bandAnchorOverrides || !shotDef || PIXEL_LOCK_SHOTS.has(shotDef.id)) return;
    const skip = bandAnchorOverrides.skipAssets || (bandAnchorOverrides.skipAssets = new Set());
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const stageDef = getStageForShot(shotDef);
    const floor = CFG.room?.floorTop ?? 136;
    const staged = bandAnchorOverrides.assets || {};
    for (const id of mergedShotPropIds(shotDef)) {
      if (FLOOR_STANDING[id] && staged[id]?.left != null) continue;
      const p = catalog[id];
      if (!p) continue;
      const asset = resolvePropAsset(p);
      if (isWallMountedPiece(id) && id !== 'window' && asset !== 'prop.window') continue;
      if (asset && isWallMountedPiece(asset) && id !== 'window' && asset !== 'prop.window') continue;
      const place = propDrawPosition(stageDef, id, p);
      if (shotDef.id === 'd11_focus_photo' && (id === 'arrosoir' || asset === 'prop.arrosoir')) {
        // The close crop cuts the can. Pulling it inside parks it on the pot
        // and paints a second floor band under the pot base.
        continue;
      }
      const spec = asset ? assetPlacementBox(asset, place.x, place.y) : null;
      const box = spec
        ? { x: spec.x, y: spec.y, w: spec.w, h: spec.h }
        : propBoxAt(p, place.x, place.y);
      if (!box) continue;
      const opaque = spec?.opaque || {};
      const limits = insetSceneLimits(frame, box.w, box.h, opaque);
      let left = box.x;
      let top = box.y;
      let moved = false;
      if (id === 'arrosoir' || asset === 'prop.arrosoir') {
        const ay = spec?.ay ?? (box.h - 1);
        const groundedTop = floor - ay;
        if (top !== groundedTop) {
          top = groundedTop;
          moved = true;
        }
      }
      if (limits.minLeft <= limits.maxLeft) {
        if (left < limits.minLeft) { left = limits.minLeft; moved = true; }
        if (left > limits.maxLeft) { left = limits.maxLeft; moved = true; }
      }
      if (limits.minTop <= limits.maxTop) {
        if (top < limits.minTop) { top = limits.minTop; moved = true; }
        if (top > limits.maxTop) { top = limits.maxTop; moved = true; }
      }
      const nudged = { left, top, w: box.w, h: box.h, opaque };
      const windowPiece = id === 'window' || asset === 'prop.window';
      const cab = staged.upper_cabinets || staged['prop.upper_cabinets'];
      const splash = staged.backsplash || staged['prop.backsplash'];
      if (windowPiece && (rectsOverlapScene(nudged, cab) || rectsOverlapScene(nudged, splash))) {
        skip.add(id);
        if (asset) skip.add(asset);
        continue;
      }
      if (pieceOutsideScreenInset(nudged, frame) || pieceCutByFrame(nudged, frame)) {
        skip.add(id);
        if (asset) skip.add(asset);
        continue;
      }
      if (!moved) continue;
      const ax = spec?.ax ?? 0;
      const ay = spec?.ay ?? 0;
      const anchor = { x: left + ax, y: top + ay, left, top, w: box.w, h: box.h };
      bandAnchorOverrides.assets[id] = anchor;
      if (asset) bandAnchorOverrides.assets[asset] = anchor;
    }
  }

  function placeKitchenBandSet(viewX, viewTop, usableW, usableH, shotDef, boxes, artW) {
    if (!bandAnchorOverrides) return viewX;
    const ids = new Set(mergedShotPropIds(shotDef));
    const floor = CFG.room?.floorTop ?? 136;
    let minActor = Infinity;
    let maxActor = -Infinity;
    for (const b of boxes || []) {
      if (b.kind !== 'actor') continue;
      minActor = Math.min(minActor, b.x);
      maxActor = Math.max(maxActor, b.x + b.w - 1);
    }
    if (minActor !== Infinity && maxActor - minActor < usableW) {
      const fit = maxActor - usableW + 1;
      if (fit <= minActor) viewX = Math.max(0, fit);
    }
    // fix19b (ruling 2): drawn floor props + the furniture they sit beside (compile stage.frameSubjects) join the
    // actors' span when the whole span fits; actors keep priority when it does not
    viewX = centreSubjectSpan(viewX, minActor, maxActor, getStageForShot(shotDef)?.frameSubjects || [], usableW);
    if (viewX < 0) viewX = 0;
    if (viewX + usableW > artW && artW >= usableW) viewX = artW - usableW;
    viewX = Math.round(viewX);
    const scale = Math.max(1, Math.round(stageW / Math.max(1, usableW)));
    if (shotDef?.id !== LOCKED_CAFE_SHOT && ids.has('window') && ids.has('upper_cabinets')) {
      const cabW = assetPlacementBox('prop.upper_cabinets', 0, 0)?.w || 48;
      const windowRight = 60;
      const insetSpan = Math.floor((stageW - BAND_BUBBLE_INSET_PX) / scale);
      const minView = Math.ceil(windowRight + 1 - (insetSpan - cabW));
      if (Number.isFinite(minView) && viewX < minView) {
        viewX = minView;
        if (viewX + usableW > artW && artW >= usableW) viewX = Math.max(0, artW - usableW);
        viewX = Math.round(viewX);
      }
    }
    const actors = (boxes || []).filter((b) => b.kind === 'actor').map((b) => ({ x: b.x, w: b.w }));
    const plan = planKitchenBandPieces({
      viewX,
      viewTop,
      usableW,
      usableH,
      scale,
      stageW,
      stageH,
      floor,
      ids,
      actors,
      keepOut: (getStageForShot(shotDef)?.frameSubjects || [])
        .filter((f) => f && f.x0 <= viewX + usableW - 1 && f.x1 >= viewX),
      specs: {
        cabinets: assetPlacementBox('prop.upper_cabinets', 0, 0),
        backsplash: assetPlacementBox('prop.backsplash', 0, 0),
        shelf: assetPlacementBox('prop.shelf', 0, 0),
        counter: assetPlacementBox('prop.counter_sink', 0, 0),
        fridge: assetPlacementBox('prop.fridge', 0, 0),
        cup: assetPlacementBox('handprop.cup', 0, 0)
      }
    });
    const assetName = {
      upper_cabinets: 'prop.upper_cabinets',
      backsplash: 'prop.backsplash',
      shelf: 'prop.shelf',
      counter: 'prop.counter_sink',
      fridge: 'prop.fridge'
    };
    for (const piece of plan.pieces) {
      const anchor = {
        x: piece.left + piece.ax,
        y: piece.top + piece.ay,
        left: piece.left,
        top: piece.top,
        w: piece.w,
        h: piece.h
      };
      bandAnchorOverrides.assets[piece.id] = anchor;
      const named = assetName[piece.id];
      if (named) bandAnchorOverrides.assets[named] = anchor;
    }
    const shadowFrame = { viewX: plan.viewX, scale, stageW };
    const contactFrame = { viewX: plan.viewX, viewTop, usableW, usableH, scale, stageW, stageH };
    if (shotDef?.id !== LOCKED_CAFE_SHOT) nudgeBandPropsInside(shotDef, contactFrame);
    const loose = loosePiecesForShot(shotDef, floor, contactFrame);
    const feetPieces = shotDef?.id === LOCKED_CAFE_SHOT ? plan.pieces : [...plan.pieces, ...loose];
    lowerActorsInFront(boxes, feetPieces, floor, shadowFrame);
    const contacts = [];
    const pot = plan.pieces.find((p) => p.id === 'coffee_pot');
    const counterPiece = plan.pieces.find((p) => p.id === 'counter');
    if (pot && counterPiece) {
      contacts.push({
        id: 'coffee_pot',
        kind: 'prop',
        left: pot.left,
        top: pot.top,
        w: pot.w,
        h: pot.h,
        surface: {
          left: counterPiece.left,
          top: counterPiece.top,
          right: counterPiece.left + counterPiece.w - 1,
          bottom: counterPiece.top + counterPiece.h - 1
        }
      });
    }
    for (const piece of plan.pieces) {
      contacts.push(...restingPropContacts(piece, floor));
    }
    {
      const stageActors = getStageForShot(shotDef).actors || {};
      for (const contact of contactsFromLoosePieces(loose, floor)) {
        if (contact.floorStanding) stampActorOmit(contact, boxes, stageActors, floor);
        contacts.push(contact);
      }
    }
    const counterContact = contacts.find((c) => c.id === 'counter');
    if (counterContact && counterPiece) {
      const bandY = counterPiece.top + counterPiece.h;
      const stageActors = getStageForShot(shotDef).actors || {};
      const omit = [];
      for (const b of boxes || []) {
        if (b.kind !== 'actor' || b.standing === false) continue;
        const ax = b.w / 2;
        const prev = bandAnchorOverrides.actors[b.id];
        const anchorX = prev?.x ?? (b.x + ax);
        const feetY = prev?.y ?? b.feetY ?? floor;
        const def = stageActors[b.id];
        if (def?.asset) {
          omit.push(...spriteOpaqueSceneColumns(def.asset, !!def.flip, anchorX, feetY, bandY));
        }
        omit.push(...actorEllipseColumns(anchorX, feetY, bandY));
      }
      if (omit.length) counterContact.omitColumns = omit;
    }
    bandAnchorOverrides.contacts = planContactShadows({
      entities: contacts,
      floor,
      frame: { viewX: plan.viewX, viewTop, scale, stageW, stageH }
    });
    return plan.viewX;
  }

  /**
   * Landing at scale 5. Set pieces shift inside the 12px screen inset or drop.
   * The stair sprite cannot clear that inset, so it drops. Wall fill stays
   * edge to edge in the margin the door used to cover.
   */
  function packStairwellBand(stageDef, boxes, sc, viewTop, usableW, usableH, artW) {
    const floor = CFG.room?.floorTop ?? 136;
    const horizon = CFG.room?.horizon ?? 128;
    const actors = [];
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      if (!def || def.x == null) continue;
      const asset = String(def.asset || '');
      const character = def.character || name;
      const cat = character === 'croissant' || name === 'cat' || asset.startsWith('croissant');
      if (cat) continue;
      if (/sit|keyboard|sleep|lie|curl/.test(asset)) continue;
      const box = boxes.find((b) => b.id === name && b.kind === 'actor');
      if (!box) continue;
      const ay = Number.isFinite(box.feetY) ? box.feetY - box.y : box.h - 1;
      actors.push({ id: name, w: box.w, h: box.h, ax: box.w / 2, ay });
    }
    actors.sort((a, b) => a.id.localeCompare(b.id));
    const catBox = boxes.find((b) => b.kind === 'cat');
    const catDraw = (stageDef.sitcomOverlay?.draws || []).find((d) => d.kind === 'cat' && d.asset);
    const catSpec = catBox
      ? assetPlacementBox(String((stageDef.actors?.[catBox.id]?.asset) || catDraw?.asset || 'croissant.walk.0'), 0, 0)
      : (catDraw ? assetPlacementBox(catDraw.asset, 0, 0) : null);
    const plan = planStairwellBandPieces({
      viewX: 3,
      viewTop,
      usableW,
      usableH,
      scale: sc.scale,
      stageW,
      stageH,
      artW,
      floor,
      horizon,
      actors,
      specs: {
        door: assetPlacementBox('prop.door_home_closed', 0, 0),
        lamp: assetPlacementBox('prop.wall_lamp', 0, 0),
        stairs: assetPlacementBox('prop.stairs', 0, 0),
        win: assetPlacementBox('prop.landing_window', 0, 0),
        rad: assetPlacementBox('prop.radiator', 0, 0),
        cat: catSpec
      }
    });
    if (!plan) return null;
    const overrides = { actors: {}, assets: {}, cat: null };
    // Same floor line as the cafe shot. Actors here are beside the radiator,
    // not in front of it, so this y stays put.
    for (const p of plan.actors) overrides.actors[p.id] = { x: p.left + p.ax, y: floor };
    for (const piece of plan.pieces) {
      overrides.assets[piece.id] = {
        x: piece.left + piece.ax,
        y: piece.top + piece.ay,
        left: piece.left,
        top: piece.top,
        w: piece.w,
        h: piece.h
      };
    }
    if (plan.cat) {
      const catAnchor = { x: plan.cat.left + plan.cat.ax, y: plan.cat.top + plan.cat.ay };
      overrides.cat = catAnchor;
      const catId = catBox?.id || 'cat';
      overrides.actors[catId] = catAnchor;
      overrides.actors.croissant = catAnchor;
    }
    const rad = plan.pieces.find((p) => p.id === 'prop.radiator');
    const contacts = [];
    if (plan.cat && rad) {
      contacts.push({
        id: 'cat',
        kind: 'cat',
        left: plan.cat.left,
        top: plan.cat.top,
        w: plan.cat.w,
        h: plan.cat.h,
        ay: plan.cat.ay,
        soleXs: CAT_PAW_COLUMNS,
        surface: {
          left: rad.left,
          top: rad.top,
          right: rad.left + rad.w - 1,
          bottom: rad.top + rad.h - 1
        }
      });
    }
    for (const piece of plan.pieces) {
      contacts.push(...restingPropContacts(piece, floor, horizon));
    }
    overrides.contacts = planContactShadows({ entities: contacts, floor, frame: plan.frame });
    return { viewX: plan.viewX, overrides };
  }

  function layoutCrop(crop, shotDef, t = sceneT) {
    if (canonicalBandCover) {
      layoutCanonicalBandCover(crop, shotDef, t);
      bandCoverLayout = true;
      return;
    }
    bandCoverLayout = false;
    bandAnchorOverrides = null;
    const floorY = CFG.room?.floorTop ?? 44;
    const headScene = CFG.layout?.castHeadY ?? 22;
    if ((isKitchenSet() || isRooftopSet() || isStairwellSet()) && (crop.fixedScale || crop.cameraPreset)) {
      currentLightVariant = shotLightVariant(shotDef);
      crop = resolveKitchenCrop(crop, shotDef, t);
      if (isKitchenSet()) crop = kitchenClampResolvedCrop(crop, shotDef, t);
    } else if (isKitchenSet() && crop?.x != null && crop?.w != null) {
      crop = kitchenClampResolvedCrop(crop, shotDef, t);
    }
    const stageHScene = sceneStageH();
    const handoffCamera = !!crop?.fromHandoff;
    const canonicalKitchenBand = isKitchenSet() && kitchenUsesCanonicalStageRender(shotDef);
    const fixedHandoffLayout = handoffCamera && (isKitchenSet() || isRooftopSet() || isStairwellSet());
    const feetBandSet = canonicalKitchenBand || isRooftopSet() || isStairwellSet();
    if (!canonicalKitchenBand && crop.y != null && crop.h != null && crop.y + crop.h > stageHScene) {
      crop = { ...crop, h: Math.max(1, stageHScene - crop.y) };
    }
    if (canonicalKitchenBand && crop?.w != null && crop?.h != null) {
      const { w: SW, h: SH } = kitchenStageSize();
      const clampH = floorStripEnabled() ? kitchenExtendedStageHeight() : SH;
      crop = clampKitchenCropToStage(crop, SW, clampH);
    }
    if (crop.fixedScale) {
      const fracTarget = crop.floorBandFracTarget
        ?? shotDef?.floorBandFracTarget
        ?? TARGET_FEET_BAND_FRAC;
      let layout = computeKitchenBandLayout({
        stageW,
        stageH,
        dpr,
        crop,
        floorY,
        floorBandFracTarget: fracTarget
      });
      if (fixedHandoffLayout || canonicalKitchenBand || feetBandSet) {
        const fitW = Math.floor((stageW * dpr) / crop.w);
        const fitH = Math.floor((stageH * dpr) / crop.h);
        const fitContain = Math.max(1, Math.min(fitW, fitH));
        const fitCover = Math.max(1, Math.max(fitW, fitH));
        const useCover = feetBandSet && !KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(shotDef?.id);
        let scaleDev = useCover ? fitCover : fitContain;
        if (feetBandSet && !KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(shotDef?.id)) {
          scaleDev = Math.min(scaleDev, fitH);
        }
        if (KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(shotDef?.id)) {
          const bandHDev = stageH * dpr;
          const bandWDev = stageW * dpr;
          const fitCap = Math.max(1, Math.floor(Math.min(bandHDev / crop.h, bandWDev / crop.w)));
          const target = crop?.fixedScale > 0
            ? Math.min(crop.fixedScale, fitCap)
            : fitCap;
          scaleDev = Math.min(fitCap, Math.max(target, Math.ceil(fit * 1.12)));
        }
        const scale = scaleDev / dpr;
        const drawW = crop.w * scale;
        const drawH = crop.h * scale;
        const frac = fracTarget ?? layout.floorBandFrac;
        const floorInCrop = (floorY - crop.y) * scale;
        let oy;
        if (KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(shotDef?.id)) {
          oy = Math.max(0, Math.min(stageH - drawH, stageH - floorInCrop));
        } else {
          const feetTarget = stageH * (fracTarget ?? TARGET_FEET_BAND_FRAC);
          oy = feetTarget - floorInCrop;
          if (!feetBandSet) {
            oy = Math.max(0, Math.min(stageH - drawH, oy));
          } else {
            oy = Math.max(0, oy);
          }
        }
        let ox = (stageW - drawW) / 2;
        let floorScreenY = oy + floorInCrop;
        if (!feetBandSet) {
          const feetTarget = stageH * (fracTarget ?? TARGET_FEET_BAND_FRAC);
          const feetDelta = feetTarget - floorScreenY;
          oy += feetDelta;
          oy = Math.max(0, Math.min(stageH - drawH, oy));
          floorScreenY = oy + floorInCrop;
        }
        ox = (stageW - drawW) / 2;
        layout = {
          scaleDev,
          scale,
          ox,
          oy,
          drawW,
          drawH,
          floorScreenY,
          floorBandFrac: floorScreenY / stageH
        };
      } else if (feetBandSet && !canonicalKitchenBand && !fixedHandoffLayout) {
        const scale = layout.scale;
        const frac = fracTarget ?? layout.floorBandFrac;
        const floorInCrop = (floorY - crop.y) * scale;
        let oy = stageH * frac - floorInCrop;
        oy = Math.max(0, Math.min(stageH - crop.h * scale, oy));
        const floorScreenY = oy + floorInCrop;
        layout = {
          ...layout,
          oy,
          floorScreenY,
          floorBandFrac: floorScreenY / stageH
        };
      }
      activeScaleDev = layout.scaleDev;
      activeScale = layout.scale;
      activeOx = layout.ox;
      let oy = layout.oy;
      if (crop.reservePoolMarginStagePx != null) {
        const poolBottomY = CFG.layout?.poolBottomStageY ?? 147;
        const margin = crop.reservePoolMarginStagePx;
        const maxOy = stageH - (poolBottomY - crop.y + margin) * layout.scale;
        oy = Math.min(oy, Math.max(0, maxOy));
      }
      if (feetBandSet && !KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(shotDef?.id)) {
        const feetTarget = stageH * (fracTarget ?? TARGET_FEET_BAND_FRAC);
        oy = feetTarget - (floorY - crop.y) * layout.scale;
        oy = Math.max(0, oy);
      } else {
        const maxOyCrop = stageH - crop.h * layout.scale;
        oy = Math.min(oy, Math.max(0, maxOyCrop));
      }
      activeOy = oy;
      activeCrop = crop;
      const floorScreenYResolved = activeOy + (floorY - crop.y) * activeScale;
      lastFraming = {
        scale: activeScale,
        scaleDev: activeScaleDev,
        oy: activeOy,
        ox: activeOx,
        headY: activeOy + (headScene - crop.y) * activeScale,
        feetY: floorScreenYResolved,
        floorBandFrac: floorScreenYResolved / stageH,
        bareBelowFeet: stageH - layout.floorScreenY,
        stageH,
        crop: { ...crop }
      };
      return;
    }
    const prof = layoutProfile(shotDef);
    const feetTarget = stageH * prof.feetFraction;
    const headMin = stageH * prof.headMinFrac;
    const headMax = stageH * prof.headMaxFrac;
    const sideMargin = shotDef?.sideMargin ?? crop.sideMargin ?? CFG.layout?.sideMargin ?? 0;
    const fitBoth = shotDef?.fitCrop ?? crop.fitCrop ?? CFG.layout?.fitCrop ?? false;
    const maxScaleW = Math.floor((stageW - 2 * sideMargin) / crop.w);
    const maxScaleH = Math.floor(stageH / crop.h);
    let hi = fitBoth ? Math.min(maxScaleW, maxScaleH) : maxScaleW;
    let chosen = null;
    for (let s = hi; s >= 1; s--) {
      const oy = feetTarget - (floorY - crop.y) * s;
      const headY = oy + (headScene - crop.y) * s;
      const wallAboveHead = headScene - crop.y;
      const bareBelowFeet = stageH - feetTarget;
      if (headY < headMin - 1 || headY > headMax + 1) continue;
      if (wallAboveHead > prof.maxWallAboveHeadNative + 0.5) continue;
      if (bareBelowFeet / stageH > prof.maxBareFloorFrac + 0.01) continue;
      if (oy + crop.h * s > stageH + 2) continue;
      chosen = { scale: s, oy, headY, feetY: feetTarget, bareBelowFeet };
      break;
    }
    if (!chosen) {
      const s = Math.max(1, hi);
      const oy = Math.max(0, feetTarget - (floorY - crop.y) * s);
      chosen = {
        scale: s,
        oy,
        headY: oy + (headScene - crop.y) * s,
        feetY: oy + (floorY - crop.y) * s,
        bareBelowFeet: stageH - (oy + (floorY - crop.y) * s)
      };
    }
    activeScale = chosen.scale;
    activeScaleDev = activeScale * dpr;
    activeOy = chosen.oy;
    activeOx = (stageW - crop.w * activeScale) / 2;
    activeCrop = crop;
    lastFraming = { ...chosen, stageH, crop: { ...crop }, profile: shotDef?.layoutProfile };
  }

  function getFrameMetrics(t = sceneT) {
    const shot = shotAtTime(t);
    const stageDef = getStageForShot(shot);
    const crop = activeCrop;
    const actors = Object.entries(stageDef.actors).filter(([, d]) => d);
    const castExpected = actors.length;
    let castInFrame = 0;
    let anyClipped = false;
    let contentTop = Infinity;
    const castDetails = [];
    for (const [name, def] of actors) {
      const box = actorSceneBounds(spriteManifest, name, def, t);
      if (!box) continue;
      contentTop = Math.min(contentTop, box.y);
      const inside = rectInsideCrop(box, crop);
      if (inside) castInFrame++;
      else anyClipped = true;
      castDetails.push({ name, inside, box });
    }
    if (contentTop === Infinity) contentTop = crop.y + 12;
    const wallGapStagePx = Math.max(0, Math.round(contentTop - crop.y));
    let maxCharHDev = 0;
    for (const d of castDetails) {
      if (d.box) maxCharHDev = Math.max(maxCharHDev, d.box.h * activeScaleDev);
    }
    const screenHDev = phoneH * dpr;
    const bandWDev = stageW * dpr;
    const bandHDev = stageH * dpr;
    const drawWDev = crop.w * activeScaleDev;
    const drawHDev = crop.h * activeScaleDev;
    const preset = crop.cameraPreset || presetFromCropRef(crop);
    const charMinPct = preset === 'wide' ? 8 : preset === 'medium' ? 12 : 18;
    const charHeightPctScreen = screenHDev > 0 ? (maxCharHDev / screenHDev) * 100 : 0;
    const charHeightPctBand = bandHDev > 0 ? (maxCharHDev / bandHDev) * 100 : 0;
    const stageBandCoveragePct = isKitchenSet() && crop.fixedScale ? 100 : (
      bandWDev > 0 && bandHDev > 0
        ? (Math.max(drawWDev / bandWDev, drawHDev / bandHDev) >= 0.998 ? 100
          : Math.round(Math.max(drawWDev / bandWDev, drawHDev / bandHDev) * 1000) / 10)
        : 0
    );
    const bubble = activeBubbles(t).slice(-1)[0];
    const bm = lastBubbleMetrics || {};
    const poolBottomY = CFG.layout?.poolBottomStageY ?? 147;
    const poolBottomScreenCss = activeOy + (poolBottomY - crop.y) * activeScale;
    const poolMarginAbovePanelCss = Math.round((stageH - poolBottomScreenCss) * 10) / 10;
    const poolMarginAbovePanelStagePx = activeScale > 0
      ? Math.round(((stageH - poolBottomScreenCss) / activeScale) * 10) / 10
      : null;
    return {
      shotId: shot.id,
      scale: activeScale,
      scaleDev: activeScaleDev,
      dpr,
      cameraPreset: preset,
      crop: { ...crop },
      castExpected,
      castInFrame,
      anySpriteClipped: anyClipped,
      wallGapAboveContentStagePx: Math.round(wallGapStagePx),
      charHeightPctScreen: Math.round(charHeightPctScreen * 10) / 10,
      charHeightPctBand: Math.round(charHeightPctBand * 10) / 10,
      charHeightMinPct: charMinPct,
      stageBandCoveragePct: Math.round(stageBandCoveragePct * 10) / 10,
      bubbleInTopBand: !!bm.inBand,
      tailLengthPx: bm.tailLengthPx ?? null,
      tailTipAboveHeadPx: bm.tailTipAboveHeadPx ?? null,
      stageH,
      activeOx,
      activeOy,
      poolBottomStageY: poolBottomY,
      poolMarginAbovePanelCss,
      poolMarginAbovePanelStagePx,
      castDetails,
      bubbleBandH,
      stageSceneH: stageH
    };
  }

  function getFramingMetrics(t = sceneT) {
    return getFrameMetrics(t);
  }

  function hexRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return [0, 0, 0];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  function colorDist(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  }

  function maskPaletteIndex(idx) {
    const id = idx + 1;
    return {
      r: 48 + ((id * 67) % 200),
      g: 48 + ((id * 113) % 200),
      b: 48 + ((id * 37) % 200)
    };
  }

  function stampMaskSprite(mctx, spec, placeX, placeY, flip, color) {
    if (!spec) return;
    const { x, y, w, h } = placementTopLeft(spec, placeX, placeY);
    let im;
    let sx = 0;
    let sy = 0;
    let sw = w;
    let sh = h;
    if (spec.source === 'file') {
      im = fileImages[spec.file];
      if (!im) return;
      sw = im.width;
      sh = im.height;
    } else if (spec.source === 'atlas') {
      im = atlasImages[spec.atlas];
      const fr = spec.frame;
      if (!im || !fr) return;
      sx = fr.x;
      sy = fr.y;
      sw = fr.w;
      sh = fr.h;
    } else return;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!flip) tctx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
    else {
      tctx.translate(w, 0);
      tctx.scale(-1, 1);
      tctx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
    }
    const img = tctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 48) continue;
      d[i] = color.r;
      d[i + 1] = color.g;
      d[i + 2] = color.b;
      d[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    mctx.drawImage(tmp, x, y);
  }

  function drawActorMaskPixels(mctx, name, def, t, color) {
    if (!def) return;
    const staged = actorDrawDef(name, def);
    const layers = resolveActorLayers(spriteManifest, { ...staged, actor: staged.actor || name }, { time: t, talking: false });
    for (const assetName of layers) {
      const options = { frameIndex: assetFrameIndex(spriteManifest, assetName, t, staged.frameIndex) };
      try {
        const spec = resolveAsset(spriteManifest, assetName, options);
        stampMaskSprite(mctx, spec, staged.x, staged.y, staged.flip, color);
      } catch { /* skip */ }
    }
  }

  function scanColorBBox(imageData, w, h, r, g, b, tol = 0) {
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    const d = imageData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 128) continue;
        if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) > tol) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function detectCreamBelowFloor(imageData, w, h, floorScreenCss, dpr, wallHex, floorHex, drawBottomCss, contentLeftCss, contentRightCss) {
    const wall = hexRgb(wallHex);
    const floor = hexRgb(floorHex);
    const y0 = Math.min(h - 1, Math.max(0, Math.ceil((Math.max(floorScreenCss, drawBottomCss) + 1) * dpr)));
    const leftDev = Math.floor(contentLeftCss * dpr);
    const rightDev = Math.floor(contentRightCss * dpr);
    const sampleXs = [Math.floor(w * 0.06), Math.floor(w * 0.94)];
    for (let y = y0; y < h; y++) {
      for (const x of sampleXs) {
        if (x >= leftDev && x <= rightDev) continue;
        const i = (y * w + x) * 4;
        const px = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
        if (colorDist(px, wall) + 8 < colorDist(px, floor)) return true;
      }
    }
    return false;
  }

  function detectFloorLineDev(imageData, w, h, wallHex, floorHex, yMin = 0, yMax = h) {
    const wall = hexRgb(wallHex);
    const floor = hexRgb(floorHex);
    const cx = Math.floor(w / 2);
    for (let y = Math.max(2, yMin); y <= Math.min(h - 3, yMax); y++) {
      const i = (y * w + cx) * 4;
      const px = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
      if (colorDist(px, floor) + 10 < colorDist(px, wall)) return y;
    }
    return null;
  }

  /**
   * Pixel-based metrics from scene canvas (device px) + actor mask pass.
   */
  function capturePixelMetrics(t = sceneT) {
    const shot = shotAtTime(t);
    renderSceneLayer(kitchenShotRenderCrop(shot), t, shot);
    const sceneSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const floorScreenCss = lastFraming?.feetY ?? (activeOy + (CFG.room.floorTop - activeCrop.y) * activeScale);
    const floorLineDev = Math.round(floorScreenCss * dpr);
    const floorBandFracMeasured = floorScreenCss / stageH;
    const contentTopDev = Math.max(0, Math.floor(activeOy * dpr));
    const contentBotDev = Math.min(canvas.height, Math.ceil((activeOy + activeCrop.h * activeScale) * dpr));
    const floorRgb = hexRgb(CFG.room.floor);
    const wallRgb = hexRgb(CFG.room.wall);
    let floorLike = false;
    let floorSampleY = 0;
    for (const dyCss of [0, -2, -5, -8]) {
      const yCss = floorScreenCss + dyCss;
      const yDev = Math.min(canvas.height - 1, Math.max(0, Math.round(yCss * dpr)));
      for (const dxCss of [-120, -60, 0, 60, 120]) {
        const xDev = Math.min(canvas.width - 1, Math.max(0, Math.round((stageW / 2 + dxCss) * dpr)));
        const si = (yDev * canvas.width + xDev) * 4;
        const samplePx = [sceneSnap.data[si], sceneSnap.data[si + 1], sceneSnap.data[si + 2]];
        if (colorDist(samplePx, floorRgb) + 12 < colorDist(samplePx, wallRgb)) {
          floorLike = true;
          floorSampleY = yDev;
          break;
        }
      }
      if (floorLike) break;
    }
    const floorBandFracFromPixels = floorBandFracMeasured;
    const drawH = activeCrop.h * activeScale;
    const floorClampedToBandBottom = activeOy >= stageH - drawH - 1;
    const targetFloorFrac = isKitchenSet() && activeCrop?.fixedScale
      ? (lastFraming?.floorBandFrac ?? kitchenFloorBandFrac(activeCrop, CFG.room?.floorTop ?? 136))
      : KITCHEN_REFERENCE_FLOOR_BAND_FRAC;

    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mctx = mask.getContext('2d');
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = 'rgb(0, 0, 0)';
    mctx.fillRect(0, 0, stageW, stageH);
    const stageDef = getStageForShot(shot);
    const maskColors = [];
    let idx = 0;
    mctx.save();
    mctx.translate(activeOx, activeOy);
    mctx.scale(activeScale, activeScale);
    mctx.translate(-activeCrop.x, -activeCrop.y);
    for (const [name, def] of Object.entries(stageDef.actors)) {
      if (!def) continue;
      const color = maskPaletteIndex(idx++);
      drawActorMaskPixels(mctx, name, def, t, color);
      maskColors.push({ name, ...color });
    }
    mctx.restore();
    const maskSnap = mctx.getImageData(0, 0, mask.width, mask.height);
    const actorBboxesCss = [];
    for (const c of maskColors) {
      const dev = scanColorBBox(maskSnap, mask.width, mask.height, c.r, c.g, c.b);
      if (!dev) {
        actorBboxesCss.push({ name: c.name, visible: false });
        continue;
      }
      actorBboxesCss.push({
        name: c.name,
        visible: true,
        bboxCss: {
          x: dev.x / dpr,
          y: dev.y / dpr,
          w: dev.w / dpr,
          h: dev.h / dpr
        }
      });
    }

    const hudTopCss = stageH;
    const failures = [];
    for (const a of actorBboxesCss) {
      if (!a.visible) {
        if (stageDef.actors[a.name]) failures.push(`${a.name}: not visible in mask`);
        continue;
      }
      const b = a.bboxCss;
      if (b.y < -1) failures.push(`${a.name}: above scene band`);
      if (b.y + b.h > hudTopCss + 1) failures.push(`${a.name}: intersects HUD (${Math.round(b.y + b.h)} > ${Math.round(hudTopCss)})`);
      if (b.x < -1 || b.x + b.w > stageW + 1) failures.push(`${a.name}: clips screen edge`);
    }
    const lightLv = shotLightVariant(shot);
    if (!floorLike && shot.id !== 'd11_mar_photo' && (!isKitchenSet() || lightLv === 'day')) {
      failures.push('floor colour missing at layout floor line');
    }
    const pixelStudioFrac = isKitchenSet() && activeCrop?.fixedScale
      ? (lastFraming?.floorBandFrac ?? kitchenFloorBandFrac(activeCrop, CFG.room?.floorTop ?? 136))
      : kitchenFloorBandFrac(activeCrop, CFG.room?.floorTop ?? 136);
    if (!floorClampedToBandBottom && Math.abs(floorBandFracMeasured - pixelStudioFrac) > 0.03) {
      failures.push(`layout floor ${floorBandFracMeasured.toFixed(3)} vs Pixel Studio ${pixelStudioFrac.toFixed(3)}`);
    }
    const drawBottomCss = activeOy + activeCrop.h * activeScale;
    const contentLeftCss = activeOx;
    const contentRightCss = activeOx + activeCrop.w * activeScale;
    const creamBelowFloor = detectCreamBelowFloor(
      sceneSnap, canvas.width, canvas.height, floorScreenCss, dpr, CFG.room.wall, CFG.room.floor,
      drawBottomCss, contentLeftCss, contentRightCss
    );
    if (creamBelowFloor) failures.push('cream wall colour below kitchen floor line');

    return {
      floorLineDev,
      floorSampleY,
      floorSampleMatches: floorLike,
      floorBandFracMeasured,
      floorBandFracFromPixels,
      floorBandFracTarget: pixelStudioFrac,
      floorClampedToBandBottom,
      creamBelowFloor,
      actorBboxesCss,
      pixelFailures: failures,
      stageW,
      stageH,
      dpr
    };
  }

  function overlapsRect(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function roomColors(warm) {
    if (!warm) return { wall: CFG.room.wall, floor: CFG.room.floor };
    return { wall: CFG.room.wallWarm || CFG.room.wall, floor: CFG.room.floorWarm || CFG.room.floor };
  }

  function paintKitchenSoirViewportFloor(crop) {
    if (floorStripEnabled()) return;
    if (!crop) return;
    const SH = kitchenStageSize().h;
    const layoutFloorCss = activeOy + ((CFG.room?.floorTop ?? 136) - crop.y) * activeScale;
    const feetCss = lastFraming?.feetY ?? layoutFloorCss;
    const y0 = KITCHEN_TABLE_FLOOR_PIN_BOTTOM.has(currentShotDef?.id)
      ? Math.min(feetCss, layoutFloorCss)
      : feetCss;
    const y1 = stageH;
    if (y1 <= y0 + 0.5) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.rect(0, y0, stageW, y1 - y0 + 0.5);
    ctx.clip();
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-crop.x, -crop.y);
    const ySceneEnd = SH - 1 + Math.ceil((y1 - y0) / activeScale) + 6;
    drawKitchenFloorPlankRows(ySceneEnd);
    ctx.restore();
    applyKitchenLightGradeScreenStrip(y0, y1);
  }

  function fillFrameAmbient(warm = false) {
    const wall = isKitchenSet() ? kitchenWallCss(warm) : roomColors(warm).wall;
    const floor = roomColors(warm).floor;
    const kitchenFloorY = activeOy + (CFG.room.floorTop - activeCrop.y) * activeScale;
    const floorScreen = isKitchenSet()
      ? (lastFraming?.feetY ?? kitchenFloorY)
      : kitchenFloorY;
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, stageW, stageH);
    if (!isKitchenSet()) {
      ctx.fillStyle = floor;
      ctx.fillRect(0, floorScreen, stageW, stageH - floorScreen);
    }
    const drawW = activeCrop.w * activeScale;
    const x0 = activeOx;
    const x1 = x0 + drawW;
    const kitchenSoirSideBands = isKitchenSet() && kitchenUsesCanonicalStageRender(currentShotDef);
    if (x0 > 0) {
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, x0, kitchenSoirSideBands ? floorScreen : (isKitchenSet() ? stageH : floorScreen));
      if (!isKitchenSet() || kitchenSoirSideBands) {
        ctx.fillStyle = floor;
        ctx.fillRect(0, floorScreen, x0, stageH - floorScreen);
      }
    }
    if (x1 < stageW) {
      ctx.fillStyle = wall;
      ctx.fillRect(x1, 0, stageW - x1, kitchenSoirSideBands ? floorScreen : (isKitchenSet() ? stageH : floorScreen));
      if (!isKitchenSet() || kitchenSoirSideBands) {
        ctx.fillStyle = floor;
        ctx.fillRect(x1, floorScreen, stageW - x1, stageH - floorScreen);
      }
    }
  }

  function drawKitchenFloorPlankRows(ySceneEnd) {
    const horizon = spriteManifest?.kitchenStage?.horizon ?? CFG.room?.horizon ?? 128;
    const tileH = 16;
    const yMax = Math.max(ySceneEnd, CFG.room.floorTop + tileH);
    for (let sy = horizon; sy < yMax; sy += tileH) {
      drawLogicalAsset('backdrop.kitchen_floor', 0, sy);
    }
  }

  /** light/soir.json source "laptop_glow" (x165 y114 r12): baked into the night add map. Masked when the laptop is off. */
  const LAPTOP_GLOW = Object.freeze({ x: 165, y: 114, r: 12 });

  /** Generic: the stage overlay lists light sources to mask (laptop_glow iff laptopIsOff, the same state that draws desk_bare). */
  function stageMasksLaptopGlow(stage) {
    return Array.isArray(stage?.lightMasks) && stage.lightMasks.includes('laptop_glow');
  }

  function laptopGlowMasked() {
    if (!currentShotDef) return false;
    try {
      return stageMasksLaptopGlow(getStageForShot(currentShotDef));
    } catch {
      return false;
    }
  }

  /** Zero the add map inside the laptop_glow circle. arr covers stage rect (ox, oy, w, h). */
  function maskLaptopGlowAdd(arr, w, h, ox = 0, oy = 0) {
    if (!arr) return arr;
    const { x, y, r } = LAPTOP_GLOW;
    for (let sy = Math.max(oy, y - r); sy <= Math.min(oy + h - 1, y + r); sy++) {
      for (let sx = Math.max(ox, x - r); sx <= Math.min(ox + w - 1, x + r); sx++) {
        const dx = sx + 0.5 - x;
        const dy = sy + 0.5 - y;
        if (dx * dx + dy * dy > r * r) continue;
        const i = ((sy - oy) * w + (sx - ox)) * 4;
        arr[i] = 0;
        arr[i + 1] = 0;
        arr[i + 2] = 0;
      }
    }
    return arr;
  }

  /** Base multiply around the glow: the modal colour on the ring just outside its radius (generic, read from the map). */
  function laptopGlowRingBase(full, fw, fh) {
    const { x, y, r } = LAPTOP_GLOW;
    const counts = new Map();
    for (let sy = Math.max(0, y - r - 2); sy <= Math.min(fh - 1, y + r + 2); sy++) {
      for (let sx = Math.max(0, x - r - 2); sx <= Math.min(fw - 1, x + r + 2); sx++) {
        const dx = sx + 0.5 - x;
        const dy = sy + 0.5 - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r || d2 > (r + 1.5) * (r + 1.5)) continue;
        const i = (sy * fw + sx) * 4;
        const k = `${full[i]},${full[i + 1]},${full[i + 2]}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    let best = null;
    let n = -1;
    for (const [k, c] of counts) if (c > n) { best = k; n = c; }
    return best ? best.split(',').map(Number) : null;
  }

  /** The glow also bakes a multiply lift + an ungraded (neutral 127) screen rect: flatten the circle to the ring base. */
  function maskLaptopGlowMult(arr, w, h, ox, oy, base) {
    if (!arr || !base) return arr;
    const { x, y, r } = LAPTOP_GLOW;
    for (let sy = Math.max(oy, y - r); sy <= Math.min(oy + h - 1, y + r); sy++) {
      for (let sx = Math.max(ox, x - r); sx <= Math.min(ox + w - 1, x + r); sx++) {
        const dx = sx + 0.5 - x;
        const dy = sy + 0.5 - y;
        if (dx * dx + dy * dy > r * r) continue;
        const i = ((sy - oy) * w + (sx - ox)) * 4;
        arr[i] = base[0];
        arr[i + 1] = base[1];
        arr[i + 2] = base[2];
      }
    }
    return arr;
  }

  function applyKitchenLightGradeRect(x, y, w, h) {
    const lv = currentLightVariant;
    if (!isKitchenSet() || lv === 'day') return;
    const multImg = lv === 'evening' ? lightImages.eveningMultiply : lightImages.nightMultiply;
    if (!multImg) return;
    const addImg = lv === 'night' || lv === 'evening' ? lightImages.nightAdd : null;
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const w0 = Math.min(sceneStage() - x0, w);
    const h0 = Math.min(sceneStageH() - y0, h);
    if (w0 <= 0 || h0 <= 0) return;
    let sceneData;
    try {
      sceneData = ctx.getImageData(x0, y0, w0, h0);
    } catch {
      return;
    }
    const mCanvas = document.createElement('canvas');
    mCanvas.width = multImg.width;
    mCanvas.height = multImg.height;
    const mctx = mCanvas.getContext('2d');
    mctx.drawImage(multImg, 0, 0);
    const multData = mctx.getImageData(x0, y0, w0, h0).data;
    if (laptopGlowMasked()) {
      maskLaptopGlowMult(multData, w0, h0, x0, y0,
        laptopGlowRingBase(mctx.getImageData(0, 0, multImg.width, multImg.height).data, multImg.width, multImg.height));
    }
    let addData = null;
    if (addImg) {
      const aCanvas = document.createElement('canvas');
      aCanvas.width = addImg.width;
      aCanvas.height = addImg.height;
      const actx = aCanvas.getContext('2d');
      actx.drawImage(addImg, 0, 0);
      addData = actx.getImageData(x0, y0, w0, h0).data;
      if (laptopGlowMasked()) maskLaptopGlowAdd(addData, w0, h0, x0, y0);
    }
    const px = sceneData.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const mr = multData[i] / 127.5;
      const mg = multData[i + 1] / 127.5;
      const mb = multData[i + 2] / 127.5;
      let r = px[i] * mr;
      let g = px[i + 1] * mg;
      let b = px[i + 2] * mb;
      if (addData) {
        r += (addData[i] / 127.5) * 0.6;
        g += (addData[i + 1] / 127.5) * 0.6;
        b += (addData[i + 2] / 127.5) * 0.6;
      }
      px[i] = Math.min(255, Math.max(0, r));
      px[i + 1] = Math.min(255, Math.max(0, g));
      px[i + 2] = Math.min(255, Math.max(0, b));
    }
    ctx.putImageData(sceneData, x0, y0);
  }

  function kitchenStageSize() {
    return {
      w: spriteManifest?.kitchenStage?.width ?? CFG.scene?.width ?? 192,
      h: spriteManifest?.kitchenStage?.height ?? CFG.scene?.height ?? 144
    };
  }

  function kitchenExtendedStageHeight() {
    if (floorStripEnabled()) {
      return spriteManifest?.kitchenStage?.stripAttachY != null
        ? spriteManifest.kitchenStage.stripAttachY + (spriteManifest.kitchenStage.stripHeight || 0)
        : (CFG.scene?.height ?? 144);
    }
    const ks = spriteManifest?.kitchenStage;
    if (ks?.extendedHeight) return ks.extendedHeight;
    if (ks?.stripHeight && ks?.stripAttachY != null) return ks.stripAttachY + ks.stripHeight;
    return kitchenStageSize().h;
  }

  function floorStripEnabled() {
    const set = floorSetKey();
    if (!set) return false;
    const stage = set === 'kitchen'
      ? spriteManifest?.kitchenStage
      : set === 'rooftop'
        ? spriteManifest?.rooftopStage
        : spriteManifest?.stairwellStage;
    return !!(stage?.stripHeight);
  }

  function floorSetKey() {
    if (isKitchenSet()) return 'kitchen';
    if (isRooftopSet()) return 'rooftop';
    if (isStairwellSet()) return 'stairwell';
    return null;
  }

  function floorStripAttachY() {
    const set = floorSetKey();
    const stage = set === 'kitchen'
      ? spriteManifest?.kitchenStage
      : set === 'rooftop'
        ? spriteManifest?.rooftopStage
        : spriteManifest?.stairwellStage;
    return stage?.stripAttachY ?? 144;
  }

  function floorStripGradeAssetId() {
    const set = floorSetKey();
    if (!set) return null;
    const lv = currentLightVariant;
    const g = lv === 'day' ? 'day' : lv === 'evening' ? 'evening' : 'night';
    return `backdrop.${set}_floor_strip.${g}`;
  }

  function floorPlaneAssetId() {
    if (isStairwellSet()) return 'backdrop.stairwell_floor';
    if (isRooftopSet()) return 'backdrop.rooftop_floor';
    return 'backdrop.kitchen_floor';
  }

  /** Repeat the set floor tile so the plane reaches the bottom of the camera window. */
  function drawFloorTileToCoverCrop() {
    if (!activeCrop) return;
    const id = floorPlaneAssetId();
    const horizon = (isKitchenSet()
      ? spriteManifest?.kitchenStage?.horizon
      : isRooftopSet()
        ? spriteManifest?.rooftopStage?.horizon
        : spriteManifest?.stairwellStage?.horizon) ?? CFG.room?.horizon ?? 128;
    let tileH = 16;
    try {
      const spec = resolveAsset(spriteManifest, id, { lightVariant: currentLightVariant });
      tileH = spec.h || 16;
    } catch {
      return;
    }
    const yEnd = activeCrop.y + activeCrop.h + tileH;
    for (let y = horizon; y < yEnd; y += tileH) {
      drawLogicalAsset(id, 0, y);
    }
  }

  /**
   * Strip mortar darker than the set floor tile (lum 76) becomes a shoe-edge
   * once the camera scales it. Lift only those pixels; the plank/brick drawing stays.
   */
  function liftedFloorStripCanvas(id) {
    const key = `${id}:${currentLightVariant}`;
    if (floorStripCanvasCache.has(key)) return floorStripCanvasCache.get(key);
    const spec = resolveAsset(spriteManifest, id, { lightVariant: currentLightVariant });
    const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
    if (!im) return null;
    const sx = spec.frame?.x || 0;
    const sy = spec.frame?.y || 0;
    const w = spec.frame?.w || spec.w || im.width;
    const h = spec.frame?.h || spec.h || im.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const sctx = c.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(im, sx, sy, w, h, 0, 0, w, h);
    const img = sctx.getImageData(0, 0, w, h);
    const px = img.data;
    const floorMin = 76;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const L = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (L > 0 && L < floorMin) {
        const gain = floorMin / L;
        px[i] = Math.min(255, Math.round(px[i] * gain));
        px[i + 1] = Math.min(255, Math.round(px[i + 1] * gain));
        px[i + 2] = Math.min(255, Math.round(px[i + 2] * gain));
      }
    }
    sctx.putImageData(img, 0, 0);
    floorStripCanvasCache.set(key, c);
    return c;
  }

  function drawCanonicalFloorStrip() {
    if (!floorStripEnabled()) return;
    const id = floorStripGradeAssetId();
    if (!id) return;
    const y = floorStripAttachY();
    let tileW = sceneStage();
    let canvasStrip = null;
    try {
      const spec = resolveAsset(spriteManifest, id, { lightVariant: currentLightVariant });
      tileW = spec.w || tileW;
      canvasStrip = liftedFloorStripCanvas(id);
    } catch {
      canvasStrip = null;
    }
    const coverRight = Math.max(
      sceneStage(),
      (activeCrop?.x || 0) + (activeCrop?.w || 0)
    );
    const dc = dctx();
    dc.imageSmoothingEnabled = false;
    for (let x = 0; x < coverRight; x += tileW) {
      if (canvasStrip) dc.drawImage(canvasStrip, x, y);
      else drawLogicalAsset(id, x, y);
    }
  }

  function drawCanonicalFloorStripScreen() {
    if (!floorStripEnabled()) return;
    const id = floorStripGradeAssetId();
    if (!id) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-activeCrop.x, -activeCrop.y);
    drawLogicalAsset(id, 0, floorStripAttachY());
    ctx.restore();
  }

  function kitchenHorizonSceneY() {
    return spriteManifest?.kitchenStage?.horizon ?? CFG.room?.horizon ?? 128;
  }

  function kitchenFloorBoundaryScreenY() {
    const ft = CFG.room?.floorTop ?? spriteManifest?.kitchenStage?.feetLine ?? 136;
    return activeOy + (ft - activeCrop.y) * activeScale;
  }

  function kitchenLightMapKey(lightVariant, shotDef = currentShotDef) {
    if (lightVariant === 'day') return 'day';
    if (kitchenSoirShot(shotDef) && lightVariant !== 'day') return 'night';
    return lightVariant === 'evening' ? 'evening' : 'night';
  }

  function getKitchenLightMapsFull(lightVariant = currentLightVariant, shotDef = currentShotDef, cast = false) {
    const glowOff = (() => {
      try { return shotDef ? stageMasksLaptopGlow(getStageForShot(shotDef)) : false; } catch { return false; }
    })();
    const key0 = kitchenLightMapKey(lightVariant, shotDef);
    const moonIn = kitchenMoonDrawn ?? moonWindowInCrop(activeCrop);
    const castNight = cast && key0 === 'night';
    const key = (glowOff && key0 === 'night' ? 'night|laptop_off' : key0) + (key0 === 'night' && !moonIn ? '|nomoon' : '') + (castNight ? '|cast' : '');
    if (kitchenLightMapsCache[key]) return kitchenLightMapsCache[key];
    if (key === 'day') {
      const { w: SW, h: SH } = kitchenStageSize();
      const multFull = new Uint8ClampedArray(SW * SH * 4);
      for (let i = 0; i < SW * SH; i++) {
        const o = i * 4;
        multFull[o] = 127;
        multFull[o + 1] = 127;
        multFull[o + 2] = 127;
        multFull[o + 3] = 255;
      }
      const maps = { multFull, addFull: null, key: 'day', sw: SW, sh: SH };
      kitchenLightMapsCache[key] = maps;
      return maps;
    }
    const nightImgs = castNight ? resolveCastLightImages(lightImages, 'kitchen') : lightImages;
    const multImg = key0 === 'evening' ? lightImages.eveningMultiply : nightImgs.nightMultiply;
    if (!multImg) return null;
    const addImg = nightImgs.nightAdd;
    const { w: SW, h: SH } = kitchenStageSize();
    const mctx = document.createElement('canvas').getContext('2d');
    mctx.canvas.width = SW;
    mctx.canvas.height = SH;
    mctx.drawImage(multImg, 0, 0, SW, SH);
    const multFull = mctx.getImageData(0, 0, SW, SH).data;
    let addFull = null;
    if (addImg && key0 === 'night') {
      const actx = document.createElement('canvas').getContext('2d');
      actx.canvas.width = SW;
      actx.canvas.height = SH;
      actx.drawImage(addImg, 0, 0, SW, SH);
      addFull = actx.getImageData(0, 0, SW, SH).data;
      if (glowOff) maskLaptopGlowAdd(addFull, SW, SH);
      if (castNight && addImg === lightImages.nightAddCast) clampCastEmitters(addFull, SW, SH, spriteManifest.kitchenLight?.castAddEmitters, SW / (addImg.naturalWidth || addImg.width || SW));
    }
    if (castNight && key0 === 'night' && nightImgs.nightMultiply === lightImages.nightMultiplyCast) clampCastEmitters(multFull, SW, SH, spriteManifest.kitchenLight?.castEmitters, SW / (multImg.naturalWidth || multImg.width || SW));
    if (glowOff) maskLaptopGlowMult(multFull, SW, SH, 0, 0, laptopGlowRingBase(multFull, SW, SH));
    if (key0 === 'night' && !moonIn && !isFrozenDay(CFG?.day)) stripMoonShaft(multFull, SW, SH);
    if (!castNight && key0 === 'night' && !moonIn && !isFrozenDay(CFG?.day)) stripWindowBound({ multiply: multFull, add: addFull }, SW, SH, spriteManifest.kitchenLight?.windowBound, SW / (multImg.naturalWidth || multImg.width || SW));
    const maps = { multFull, addFull, key: key0, laptopGlowMasked: glowOff, sw: SW, sh: SH, cast: castNight };
    kitchenLightMapsCache[key] = maps;
    return maps;
  }

  // fix23b item 3: the baked night multiply map carries a moonlight shaft below the
  // window (light/soir.json "window" x32 y79 28x22). Graded over the backsplash,
  // counter and floor it reads as a translucent ghost copy of the window/tiles in
  // close-ups (d3 h). Engine-side: cool shaft pixels below the window are reset to
  // the cool base; warm table/lamp pixels (r > b) and the lit window glass stay.
  function stripMoonShaft(multFull, SW, SH) { return moonShaftPixels(multFull, SW, SH, true); }

  /** fix23d: pane gate state for the render in progress (null = gate off, e.g. day light maps with no neutral rects). */
  let kitchenPaneGate = null;
  /** fix23d: the moon shaft belongs to the window: once the room is drawn, keep it only if the window sprite was drawn. */
  let kitchenMoonDrawn = null;
  let lastKitchenMoonDrawn = null;
  function kitchenMapsForDrawnWindow(maps, wallPad, shotDef, cast = false) {
    if (!maps || maps.key !== 'night') return maps;
    // drawn into the (full-width) buffer AND inside the crop: the window is in the shot
    const drawn = (kitchenPaneSprites || []).some((r) => r.window) && moonWindowInCrop(activeCrop);
    lastKitchenMoonDrawn = drawn;
    kitchenMoonDrawn = drawn;
    try { return kitchenSoirMapsForShot(currentLightVariant, wallPad, maps.floorPad, shotDef, cast); } finally { kitchenMoonDrawn = null; }
  }
  /** fix23d P4: cast/actor maps (unmasked night maps) for the same shot state as the stage maps. */
  function kitchenCastMaps(maps, wallPad, shotDef) {
    if (!maps || maps.key !== 'night') return maps;
    return kitchenMapsForDrawnWindow(maps, wallPad, shotDef, true) || maps;
  }
  function kitchenPaneAllows(sx, ey) {
    const g = kitchenPaneGate;
    if (!g || !g.layerAllows) return false;
    const y = ey - g.wallPad;
    for (const r of g.rects) if (sx >= r.x && sx < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
    return false;
  }

  function kitchenDecodeMultiply(mapVal) {
    return Math.min(1.2, mapVal / 127.5);
  }

  function kitchenDecodeAdd(mapVal) {
    return mapVal * 2;
  }

  function kitchenMapAtExt(maps, sx, ey) {
    const sw = maps.sw;
    let mx = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
    const my = Math.max(0, Math.min((maps.extH ?? maps.sh) - 1, Math.floor(ey)));
    let mi = (my * sw + mx) * 4;
    const multFull = maps.multFull;
    // fix23d: the map's neutral (127) pane rects stay ungraded only over the glass actually drawn this render (window /
    // open-laptop sprite). Anywhere else (window cut by the frame inset, laptop closed, cast in front) take the room's
    // multiply from the nearest non-pane map pixel on the same row, so bare wall never shows its day cream at night.
    if (kitchenPaneGate) {
      mx = kitchenPaneMapX(multFull, sw, mx, my, () => kitchenPaneAllows(sx, ey));
      mi = (my * sw + mx) * 4;
    }
    const addFull = maps.addFull;
    const mr = kitchenDecodeMultiply(multFull[mi]);
    const mg = kitchenDecodeMultiply(multFull[mi + 1]);
    const mb = kitchenDecodeMultiply(multFull[mi + 2]);
    const ar = addFull ? kitchenDecodeAdd(addFull[mi]) : 0;
    const ag = addFull ? kitchenDecodeAdd(addFull[mi + 1]) : 0;
    const ab = addFull ? kitchenDecodeAdd(addFull[mi + 2]) : 0;
    return { mr, mg, mb, ar, ag, ab };
  }

  function computeKitchenSoirExtension(crop) {
    const { w: SW, h: SH } = kitchenStageSize();
    const wallPad = crop.y;
    const extStageH = kitchenExtendedStageHeight();
    const floorPad = floorStripEnabled() ? 0 : (() => {
      const feetCss = lastFraming?.feetY ?? (activeOy + ((CFG.room?.floorTop ?? 136) - crop.y) * activeScale);
      const contentBottomCss = activeOy + crop.h * activeScale;
      const viewportGapPad = Math.max(0, Math.ceil((stageH - contentBottomCss) / activeScale) + 8);
      return Math.max(12, viewportGapPad, Math.ceil((stageH - feetCss) / activeScale) + 6);
    })();
    const stageBodyH = floorStripEnabled() ? extStageH : SH;
    return { wallPad, floorPad, extW: SW, extH: wallPad + stageBodyH + floorPad, stageH: SH };
  }

  function getKitchenLightMapsExtended(base, wallPad, floorPad) {
    if (!base) return null;
    const { multFull: bMult, addFull: bAdd, sw, sh: baseH } = base;
    const extH = wallPad + baseH + floorPad;
    const multFull = new Uint8ClampedArray(sw * extH * 4);
    let addFull = null;
    if (bAdd) addFull = new Uint8ClampedArray(sw * extH * 4);
    const floorRowY = Math.min(baseH - 1, Math.max(0, CFG.room?.floorTop ?? 136));
    for (let ey = 0; ey < extH; ey++) {
      let sy;
      if (ey < wallPad) sy = 0;
      else if (ey >= wallPad + baseH) sy = floorRowY;
      else sy = ey - wallPad;
      for (let sx = 0; sx < sw; sx++) {
        const bi = (sy * sw + sx) * 4;
        const oi = (ey * sw + sx) * 4;
        multFull[oi] = bMult[bi];
        multFull[oi + 1] = bMult[bi + 1];
        multFull[oi + 2] = bMult[bi + 2];
        multFull[oi + 3] = 255;
        if (addFull) {
          addFull[oi] = bAdd[bi];
          addFull[oi + 1] = bAdd[bi + 1];
          addFull[oi + 2] = bAdd[bi + 2];
          addFull[oi + 3] = 255;
        }
      }
    }
    return { ...base, multFull, addFull, extH, baseH, wallPad, floorPad };
  }

  function kitchenSoirMapsForShot(lightVariant, wallPad, floorPad, shotDef = currentShotDef, cast = false) {
    const base = getKitchenLightMapsFull(lightVariant, shotDef, cast);
    return getKitchenLightMapsExtended(base, wallPad, floorPad);
  }

  function kitchenStageSyForExtY(ey, maps) {
    const { wallPad, baseH, floorPad } = maps;
    if (ey < wallPad) return 0;
    if (ey >= wallPad + baseH) return Math.min(baseH - 1, CFG.room?.floorTop ?? 136);
    return ey - wallPad;
  }

  function gradeKitchenSoirPixelAt(r, g, b, a, sx, ey, maps, isCast) {
    if (a === 0) return [r, g, b, a];
    const { mr, mg, mb, ar, ag, ab } = kitchenMapAtExt(maps, sx, ey);
    const mStr = isCast ? 0.25 : 1;
    const aStr = isCast ? 0.6 : 1;
    return gradeKitchenRgb(r, g, b, a, mr, mg, mb, ar, ag, ab, mStr, aStr);
  }

  function makeKitchenLayerCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  const KITCHEN_PENDANT_AT = { x: 118, y: 66 };

  function drawKitchenPendantUngraded(ctx, stageDef) {
    if (!stageDef.props.includes('pendant')) return;
    try {
      const spec = resolveAsset(spriteManifest, 'prop.pendant_on', { lightVariant: 'night' });
      drawSpec(spec, KITCHEN_PENDANT_AT.x, KITCHEN_PENDANT_AT.y, false);
    } catch { /* skip */ }
  }

  // PX-ROW vs baked sprite contact: sprites with a baked translucent contact row (assetHasBakedContactRow) carry it into the
  // weakly graded cast layer, where it lands on the hard row and lifts it at night (d1/h: row 8% instead of 35%). The hard
  // row replaces that baked contact, so translucent cast pixels on hard-row positions are cleared; opaque sprite pixels stay.
  // PX-ROW occlusion report for the final-frame test: a row pixel under an OPAQUE pixel of a layer composited above it
  // (box front rim, a hand over a cup) is legitimately hidden, not overwritten.
  function notePxRowOcclusion(rowLayers, aboveLayers, keep = false) {
    const occ = keep && globalThis.__pxRowOccluded ? globalThis.__pxRowOccluded : (globalThis.__pxRowOccluded = new Set());
    for (const l of rowLayers) {
      const rows = (l?.__hardRows?.length ? l.__hardRows : l?.__hardRowsGraded) || [];
      for (const a of aboveLayers) {
        if (!a || !rows.length) continue;
        const d = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
        for (const r of rows) {
          if (r.bx < 0 || r.by < 0 || r.bx >= a.width || r.by >= a.height) continue;
          if (d[(r.by * a.width + r.bx) * 4 + 3] === 255) occ.add(`${r.bx},${r.by}`);
        }
      }
    }
  }

  function clearBakedContactOverHardRows(castLayers, rowLayers) {
    const rows = [];
    for (const l of rowLayers) for (const r of (l?.__hardRows?.length ? l.__hardRows : l?.__hardRowsGraded) || []) rows.push(r);
    if (!rows.length) return 0;
    let cleared = 0;
    for (const layer of castLayers) {
      if (!layer) continue;
      const g = layer.getContext('2d');
      const img = g.getImageData(0, 0, layer.width, layer.height);
      const W = layer.width, H = layer.height;
      for (const r of rows) {
        if (r.bx < 0 || r.by < 0 || r.bx >= W || r.by >= H) continue;
        const pi = (r.by * W + r.bx) * 4;
        if (img.data[pi + 3] > 0 && img.data[pi + 3] < 255) { img.data[pi + 3] = 0; cleared += 1; }
      }
      g.putImageData(img, 0, 0);
    }
    return cleared;
  }

  function gradeLayerCanvas(layerCanvas, maps, strength, addStrength, wallPad) {
    kitchenPaneGate = kitchenPaneSprites && maps.key !== 'day' ? { rects: kitchenPaneSprites, wallPad, layerAllows: !layerCanvas.__cast } : null;
    try { gradeLayerCanvasInner(layerCanvas, maps, strength, addStrength, wallPad); } finally { kitchenPaneGate = null; }
  }

  function gradeLayerCanvasInner(layerCanvas, maps, strength, addStrength, wallPad) {
    const ctx = layerCanvas.getContext('2d');
    const img = ctx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
    const px = img.data;
    const W = layerCanvas.width;
    const H = layerCanvas.height;
    // PX-ROW pixels still showing their LUT colour (not covered by a later sprite in this layer): grade the SURFACE they sit on,
    // then apply the LUT's per-channel darkening to it, so the row keeps its contrast after grading.
    const hard = new Map();
    for (const r of layerCanvas.__hardRows || []) {
      if (r.bx < 0 || r.by < 0 || r.bx >= W || r.by >= H) continue;
      const pi = (r.by * W + r.bx) * 4;
      if (px[pi + 3] === 255 && px[pi] === r.col[0] && px[pi + 1] === r.col[1] && px[pi + 2] === r.col[2]) hard.set(pi, r);
    }
    layerCanvas.__hardRowsGraded = layerCanvas.__hardRows || [];
    layerCanvas.__hardRows = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const pi = (y * W + x) * 4;
        if (px[pi + 3] === 0) continue;
        if (hard.has(pi)) continue;   // PX-ROW: set from the graded surface below, after this pass
        const { mr, mg, mb, ar, ag, ab } = kitchenMapAtExt(maps, x, y);   // PX-ROW: set from the graded surface below, after this pass
        const graded = gradeKitchenRgb(px[pi], px[pi + 1], px[pi + 2], px[pi + 3], mr, mg, mb, ar, ag, ab, strength, addStrength);
        px[pi] = graded[0];
        px[pi + 1] = graded[1];
        px[pi + 2] = graded[2];
      }
    }
    // the row keeps the LUT's per-channel darkening relative to the GRADED surface right below it (what the checker and the eye
    // compare against); without this the grade's additive light lifts the row to ~8% at night.
    for (const [pi, hr] of hard) {
      let bi = pi + W * 4;
      if (bi >= px.length || px[bi + 3] === 0 || hard.has(bi)) bi = -1;
      const gs = bi >= 0 ? [px[bi], px[bi + 1], px[bi + 2]] : (() => { const y = Math.floor(pi / 4 / W), x = (pi / 4) % W; const m = kitchenMapAtExt(maps, x, y);
        return gradeKitchenRgb(hr.surf[0], hr.surf[1], hr.surf[2], 255, m.mr, m.mg, m.mb, m.ar, m.ag, m.ab, strength, addStrength); })();
      for (let c = 0; c < 3; c++) px[pi + c] = Math.max(0, Math.min(255, Math.round(gs[c] * hr.col[c] / Math.max(1, hr.surf[c]))));
    }
    ctx.putImageData(img, 0, 0);
  }

  function renderKitchenSoirTable4Stage(t, shotDef, maps, wallPad, extW, extH) {
    const stageDef = getStageForShot(shotDef);
    const room = makeKitchenLayerCanvas(extW, extH);
    const tbl = makeKitchenLayerCanvas(extW, extH);
    const props = makeKitchenLayerCanvas(extW, extH);
    const behind = makeKitchenLayerCanvas(extW, extH);
    const front = makeKitchenLayerCanvas(extW, extH);
    behind.__cast = true;
    front.__cast = true;

    kitchenStageBufferCtx = room.getContext('2d');
    room.getContext('2d').save();
    room.getContext('2d').translate(0, wallPad);
    drawKitchenBackdrop();
    if (floorStripEnabled() && maps.key !== 'day') drawCanonicalFloorStrip();
    drawKitchenTable4Content(stageDef, t, {
      backgroundOnly: true,
      omitPropIds: new Set(['table', 'table_cup', 'table_plate', 'table_milk'])
    });
    // fix17: overlay set pieces on table4 shots too, same layer order as the simple stage (behind with the room)
    drawSitcomOverlay(stageDef, t, 'behind');
    drawContactShadows();
    room.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    kitchenStageBufferCtx = tbl.getContext('2d');
    tbl.getContext('2d').save();
    tbl.getContext('2d').translate(0, wallPad);
    drawKitchenTable4Content(stageDef, t, { actorsOnly: false, backgroundOnly: false, layers: { tableOnly: true } });
    tbl.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    kitchenStageBufferCtx = props.getContext('2d');
    props.getContext('2d').save();
    props.getContext('2d').translate(0, wallPad);
    drawKitchenTable4Content(stageDef, t, { actorsOnly: false, backgroundOnly: false, layers: { tablePropsOnly: true } });
    props.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    kitchenStageBufferCtx = behind.getContext('2d');
    behind.getContext('2d').save();
    behind.getContext('2d').translate(0, wallPad);
    drawKitchenTable4Content(stageDef, t, { actorsOnly: true, backgroundOnly: false, layers: { behindSeatsOnly: true } });
    behind.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    kitchenStageBufferCtx = front.getContext('2d');
    front.getContext('2d').save();
    front.getContext('2d').translate(0, wallPad);
    drawKitchenTable4Content(stageDef, t, { actorsOnly: true, backgroundOnly: false, layers: { frontSeatsOnly: true } });
    front.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    // fix17: 'between' overlays sit between the behind-layer cast and the rest; 'front' overlays stand on the floor and
    // composite after the queued floor contacts and the whole cast (as on the simple stage)
    const ovBetween = makeKitchenLayerCanvas(extW, extH);
    kitchenStageBufferCtx = ovBetween.getContext('2d');
    ovBetween.getContext('2d').save();
    ovBetween.getContext('2d').translate(0, wallPad);
    drawSitcomOverlay(stageDef, t, 'between');
    ovBetween.getContext('2d').restore();
    const ovFront4 = makeKitchenLayerCanvas(extW, extH);
    kitchenStageBufferCtx = ovFront4.getContext('2d');
    ovFront4.getContext('2d').save();
    ovFront4.getContext('2d').translate(0, wallPad);
    drawSitcomOverlay(stageDef, t, 'front');
    ovFront4.getContext('2d').restore();
    kitchenStageBufferCtx = null;

    clearBakedContactOverHardRows([behind, front], [room, tbl, props]);
    const castMaps = kitchenCastMaps(maps, wallPad, shotDef);
    maps = kitchenMapsForDrawnWindow(maps, wallPad, shotDef);
    gradeLayerCanvas(room, maps, 1, 1, wallPad);
    if (maps.key === 'day') paintUngradedFloorStrip(room.getContext('2d'), wallPad);
    else continueGradedFloor(room, maps, wallPad);
    gradeLayerCanvas(tbl, maps, 1, 1, wallPad);
    gradeLayerCanvas(props, maps, 1, 1, wallPad);
    gradeLayerCanvas(behind, castMaps, 0.25, 0.6, wallPad);
    gradeLayerCanvas(front, castMaps, 0.25, 0.6, wallPad);
    gradeLayerCanvas(ovBetween, maps, 1, 1, wallPad);
    gradeLayerCanvas(ovFront4, maps, 1, 1, wallPad);

    const roomCtx = room.getContext('2d');
    roomCtx.save();
    roomCtx.translate(0, wallPad);
    paintQueuedFloorContacts(roomCtx);
    roomCtx.restore();

    const out = makeKitchenLayerCanvas(extW, extH);
    const octx = out.getContext('2d');
    notePxRowOcclusion([room], [behind, tbl, front, props]);
    notePxRowOcclusion([tbl], [front, props], true);
    octx.drawImage(room, 0, 0);
    octx.drawImage(behind, 0, 0);
    octx.drawImage(ovBetween, 0, 0);
    octx.drawImage(tbl, 0, 0);
    octx.drawImage(front, 0, 0);
    octx.drawImage(props, 0, 0);
    octx.drawImage(ovFront4, 0, 0);

    let pendantLayer = null;
    if (maps.key === 'night') {
      pendantLayer = makeKitchenLayerCanvas(extW, extH);
      const pctx = pendantLayer.getContext('2d');
      kitchenStageBufferCtx = pctx;
      pctx.save();
      pctx.translate(0, wallPad);
      drawKitchenPendantUngraded(pctx, stageDef);
      pctx.restore();
      kitchenStageBufferCtx = null;
      octx.drawImage(pendantLayer, 0, 0);
    }

    return { canvas: out, wallPad, layers: { room, behind, tbl, front, props, pendant: pendantLayer } };
  }

  function renderKitchenSoirSimpleStage(t, shotDef, maps, wallPad, extW, extH) {
    const stageDef = getStageForShot(shotDef);
    const room = makeKitchenLayerCanvas(extW, extH);
    const cast = makeKitchenLayerCanvas(extW, extH);
    cast.__cast = true;

    kitchenStageBufferCtx = room.getContext('2d');
    const rctx = room.getContext('2d');
    rctx.save();
    rctx.translate(0, wallPad);
    drawKitchenBackdrop();
    if (!floorStripEnabled()) {
      drawKitchenFloorPlankRows(maps.baseH - 1 + (maps.floorPad || 0));
    } else if (maps.key !== 'day') {
      drawCanonicalFloorStrip();
    }
    drawSceneContent(t, shotDef, { backgroundOnly: true, noFrontOverlay: true, omitPropIds: new Set(['pendant']) });
    rctx.restore();
    kitchenStageBufferCtx = null;

    const castMaps = kitchenCastMaps(maps, wallPad, shotDef);
    maps = kitchenMapsForDrawnWindow(maps, wallPad, shotDef);
    gradeLayerCanvas(room, maps, 1, 1, wallPad);
    if (maps.key === 'day') paintUngradedFloorStrip(room.getContext('2d'), wallPad);
    else continueGradedFloor(room, maps, wallPad);

    kitchenStageBufferCtx = cast.getContext('2d');
    cast.getContext('2d').save();
    cast.getContext('2d').translate(0, wallPad);
    drawSceneContent(t, shotDef, { actorsOnly: true });
    cast.getContext('2d').restore();
    kitchenStageBufferCtx = null;
    clearBakedContactOverHardRows([cast], [room]);
    gradeLayerCanvas(cast, castMaps, 0.25, 0.6, wallPad);

    const roomCtx = room.getContext('2d');
    roomCtx.save();
    roomCtx.translate(0, wallPad);
    paintQueuedFloorContacts(roomCtx);
    roomCtx.restore();

    // front overlay set-pieces (box_cat front) stand on the floor: graded like the room, composited above the
    // queued floor contacts and the cast (the in-box cat sits between box back and front), never veiled by them
    const ovFront = makeKitchenLayerCanvas(extW, extH);
    kitchenStageBufferCtx = ovFront.getContext('2d');
    ovFront.getContext('2d').save();
    ovFront.getContext('2d').translate(0, wallPad);
    drawSitcomOverlay(stageDef, t, 'front');
    ovFront.getContext('2d').restore();
    kitchenStageBufferCtx = null;
    gradeLayerCanvas(ovFront, maps, 1, 1, wallPad);

    notePxRowOcclusion([room], [cast, ovFront]);
    const out = makeKitchenLayerCanvas(extW, extH);
    const octx = out.getContext('2d');
    octx.drawImage(room, 0, 0);
    octx.drawImage(cast, 0, 0);
    octx.drawImage(ovFront, 0, 0);
    if (maps.key === 'night') {
      kitchenStageBufferCtx = octx;
      octx.save();
      octx.translate(0, wallPad);
      drawKitchenPendantUngraded(octx, stageDef);
      octx.restore();
      kitchenStageBufferCtx = null;
    }
    return { canvas: out, wallPad };
  }

  function drawSoirWallExtensionRows(wallPad, extW) {
    const dc = dctx();
    for (let ey = 0; ey < wallPad; ey++) {
      dc.save();
      dc.translate(0, ey - wallPad);
      drawKitchenBackdrop();
      dc.restore();
    }
  }

  function buildSoirSingleActorMask(extW, extH, wallPad, t, shotDef, actorName) {
    const mask = document.createElement('canvas');
    mask.width = extW;
    mask.height = extH;
    const mctx = mask.getContext('2d');
    mctx.clearRect(0, 0, extW, extH);
    kitchenStageBufferCtx = mctx;
    mctx.save();
    mctx.translate(0, wallPad);
    const stageDef = getStageForShot(shotDef);
    const def = stageDef.actors?.[actorName];
    const white = { r: 255, g: 255, b: 255 };
    if (def) drawActorMaskPixels(mctx, actorName, def, t, white);
    mctx.restore();
    kitchenStageBufferCtx = null;
    return mctx.getImageData(0, 0, extW, extH);
  }

  function buildSoirActorAlphaMask(extW, extH, wallPad, t, shotDef) {
    const mask = document.createElement('canvas');
    mask.width = extW;
    mask.height = extH;
    const mctx = mask.getContext('2d');
    mctx.clearRect(0, 0, extW, extH);
    kitchenStageBufferCtx = mctx;
    mctx.save();
    mctx.translate(0, wallPad);
    const stageDef = getStageForShot(shotDef);
    const white = { r: 255, g: 255, b: 255 };
    for (const [name, def] of Object.entries(stageDef.actors)) {
      if (!def) continue;
      drawActorMaskPixels(mctx, name, def, t, white);
    }
    mctx.restore();
    kitchenStageBufferCtx = null;
    return mctx.getImageData(0, 0, extW, extH);
  }

  function renderKitchenSoirExtendedBuffer(t, shotDef, crop) {
    const ext = computeKitchenSoirExtension(crop);
    const { wallPad, floorPad, extW, extH, stageH: SH } = ext;
    const maps = kitchenSoirMapsForShot(currentLightVariant, wallPad, floorPad, shotDef);
    const stageDef = getStageForShot(shotDef);
    const table4 = stageUsesTable4(stageDef);

    if (!kitchenStageBufferCanvas || kitchenStageBufferCanvas.width !== extW || kitchenStageBufferCanvas.height !== extH) {
      kitchenStageBufferCanvas = document.createElement('canvas');
      kitchenStageBufferCanvas.width = extW;
      kitchenStageBufferCanvas.height = extH;
    }
    const extCtx = kitchenStageBufferCanvas.getContext('2d');
    extCtx.setTransform(1, 0, 0, 1, 0, 0);
    extCtx.clearRect(0, 0, extW, extH);

    kitchenPaneSprites = [];
    kitchenStageBufferCtx = extCtx;
    drawSoirWallExtensionRows(wallPad, extW);
    kitchenStageBufferCtx = null;

    const rendered = table4
      ? renderKitchenSoirTable4Stage(t, shotDef, maps, wallPad, extW, extH)
      : renderKitchenSoirSimpleStage(t, shotDef, maps, wallPad, extW, extH);
    kitchenPaneSprites = null;

    extCtx.drawImage(rendered.canvas, 0, 0);

    // Bubble band = the bare-wall reference graded by the MULTIPLY map only (never the add/light layers):
    // sampling the graded stage at the crop's top hit the lamp pool (d3/h night close: off-palette 255,191,106).
    lastSoirBubbleWallRgb = bubbleBandWallRgb(maps, wallPad);
    lastSoirWallPad = wallPad;
    return kitchenStageBufferCanvas;
  }

  function bubbleBandWallRgb(maps, wallPad) {
    const ref = kitchenBareWallRgb;
    if (!ref) return null;
    const { x, y } = KITCHEN_BARE_WALL_SAMPLE;
    const { mr, mg, mb, ar, ag, ab } = kitchenMapAtExt(maps, x, wallPad + y);
    const g = gradeKitchenRgb(ref[0], ref[1], ref[2], 255, mr, mg, mb, ar, ag, ab, 1, 0);
    return [g[0], g[1], g[2]];
  }

  function kitchenTable4NightRefShot() {
    const baseProps = [...(CFG.defaultStage?.props ?? [])];
    for (const id of ['pendant', 'table_cup', 'table_plate', 'table_milk']) {
      if (!baseProps.includes(id)) baseProps.push(id);
    }
    return {
      id: '__table4_night_ref',
      t0: 0,
      t1: 1,
      stage: {
        props: baseProps,
        actors: {
          noe: {
            character: 'noe',
            x: 100,
            y: 125,
            asset: 'noe.pose.sit_table_34'
          },
          martin: {
            character: 'martin',
            x: 111,
            y: 122,
            asset: 'martin.pose.sit_table'
          },
          lefevre: {
            character: 'lefevre',
            x: 125,
            y: 122,
            asset: 'lefevre.pose.sit_table'
          },
          camille: {
            character: 'camille',
            x: 136,
            y: 125,
            flip: true,
            asset: 'camille.pose.sit_table_34'
          }
        }
      }
    };
  }

  function buildKitchenTable4CastMask(shotDef, t = 0) {
    const mask = document.createElement('canvas');
    mask.width = KITCHEN_STAGE_W;
    mask.height = KITCHEN_STAGE_H;
    const mctx = mask.getContext('2d');
    mctx.clearRect(0, 0, KITCHEN_STAGE_W, KITCHEN_STAGE_H);
    kitchenStageBufferCtx = mctx;
    const stageDef = shotDef.stage ? { ...shotDef.stage, props: shotDef.stage.props, actors: shotDef.stage.actors } : getStageForShot(shotDef);
    const white = { r: 255, g: 255, b: 255 };
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      if (!def) continue;
      drawActorMaskPixels(mctx, name, def, t, white);
    }
    kitchenStageBufferCtx = null;
    return mctx.getImageData(0, 0, KITCHEN_STAGE_W, KITCHEN_STAGE_H);
  }

  function renderKitchenNightTable4StageX1(t, shotDef) {
    const maps = kitchenSoirMapsForShot('night', 0, 0, shotDef);
    const { canvas } = renderKitchenSoirTable4Stage(t, shotDef, maps, 0, KITCHEN_STAGE_W, KITCHEN_STAGE_H);
    return canvas;
  }

  let lastSoirWallPad = 0;

  // fix23b item 2: the bubble band (~127 css px above the scene canvas) showed a flat slate/wall
  // fill. The camera now continues into it: the stage rows directly above the crop, at the same
  // scale and x offset, are drawn from the rendered (graded) stage buffer. Rows above the stage
  // top (none in practice: crop.y >= band rows) keep the wall fill.
  let lastBandArt = null;
  let lastBandArtRows = 0;
  function paintBubbleBandWallArt() {
    lastBandArtRows = 0;
    const a = lastBandArt;
    if (!a || !bubbleBandH || !a.k || isFrozenDay(CFG?.day)) return false;
    const pl = planBandArt({ bandH: bubbleBandH, oy: a.oy, k: a.k, cropY: a.crop.y, yOff: a.yOff });
    if (!pl) return false;
    const { sy0, n } = pl; const screenTop = bubbleBandH + a.oy;
    bctx.save();
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(a.canvas, a.crop.x, sy0 + a.yOff, a.crop.w, n, a.ox, screenTop - n * a.k, a.crop.w * a.k, n * a.k);
    bctx.restore();
    lastBandArtRows = n;
    return true;
  }

  function fillBubbleBandEveningWall(shotDef) {
    if (!isKitchenSet() || currentLightVariant === 'day' || !bubbleBandH) return false;
    const rgb = kitchenUsesSoirStageGrade(shotDef) && lastSoirBubbleWallRgb
      ? lastSoirBubbleWallRgb
      : null;
    if (!rgb) return false;
    const [r, g, b] = rgb;
    bctx.save();
    bctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    bctx.fillRect(0, 0, stageW, bubbleBandH);
    bctx.restore();
    if (bubbleBand) {
      bubbleBand.style.backgroundColor = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    }
    return true;
  }

  /** fix23d P3: a night/evening band with neither band art nor a graded wall fill showed the DOM band's day colour (cream
   *  void band on rooftop nights). Fill the band (canvas and DOM) with the median colour of the camera's top row, so the
   *  night sky or graded wall carries on. Returns true when painted. */
  function fillBubbleBandFromStageTop() {
    if (!bubbleBandH || currentLightVariant === 'day' || isFrozenDay(CFG?.day)) return false;
    let row;
    try { row = ctx.getImageData(0, 0, canvas.width, 1).data; } catch { return false; }
    const lum = []; for (let i = 0; i < row.length; i += 4) lum.push([row[i] + row[i + 1] + row[i + 2], i]);
    lum.sort((a, b) => a[0] - b[0]); const m = lum[lum.length >> 1]?.[1] ?? 0;
    const css = `rgb(${row[m]},${row[m + 1]},${row[m + 2]})`;
    bctx.save();
    bctx.fillStyle = css;
    bctx.fillRect(0, 0, stageW, bubbleBandH);
    bctx.restore();
    if (bubbleBand) bubbleBand.style.backgroundColor = css;
    lastBandStageTopFill = true;
    return true;
  }
  let lastBandStageTopFill = false;

  // fix17: an insert sub-shot dims the WHOLE stage behind it. The scene canvas is dimmed in drawPhoneScreenInsert; the bubble band
  // above it (a DOM band painted with the set's wall colour, ~127 px at 390x844) stayed bright. Same dim, same condition, before
  // any bubble is drawn, so bubbles and the HUD stay at full brightness.
  function insertBackdropDim(shot) {
    const inset = shot?.phoneInsert;
    if (!shot?.subshot || !inset || !(inset.backdropDim > 0)) return 0;
    const closeInsert = inset.mode === 'closeInsert' || inset.flashMemory;
    if (!closeInsert || !inset.fullBleed || phoneInsertWaitingAsset(inset) || inset.assetId === 'phone_photo_plant_tail') return 0;
    return insertAssetReady(inset) ? inset.backdropDim : 0;
  }

  function dimBubbleBandUnderInsert(shot) {
    const dim = insertBackdropDim(shot);
    if (!dim || !bubbleBandH) return;
    bctx.save();
    bctx.fillStyle = `rgba(0, 0, 0, ${dim})`;
    bctx.fillRect(0, 0, stageW, bubbleBandH);
    bctx.restore();
  }

  function applyKitchenLightGradeScreenStrip(yCss0, yCss1, lightAnchorSceneY = null, opts = {}) {
    const lv = currentLightVariant;
    if ((!isKitchenSet() && !isRooftopSet() && !isStairwellSet()) || lv === 'day') return;
    const imgs = activeLightImages();
    // fix23d P4: rooftop/stairwell grade cast and stage in one pass; without unmasked maps that is the logged fallback
    if (lv === 'night' && !isKitchenSet()) resolveCastLightImages(imgs, isRooftopSet() ? 'rooftop' : 'stairwell');
    const multImg = lv === 'evening' ? imgs.eveningMultiply : imgs.nightMultiply;
    if (!multImg) return;
    const addStrength = opts.addStrength ?? 0.6;
    const useMultiply = opts.includeMultiply !== false;
    const useAdd = opts.includeAdd !== false;
    const addImg = (lv === 'night' || lv === 'evening') && useAdd ? imgs.nightAdd : null;
    const dev = dpr;
    const yDev0 = Math.max(0, Math.floor(yCss0 * dev));
    const yDev1 = Math.min(canvas.height, Math.ceil(yCss1 * dev));
    const hDev = yDev1 - yDev0;
    const wDev = canvas.width;
    if (hDev <= 0) return;
    let sceneData;
    try {
      sceneData = ctx.getImageData(0, yDev0, wDev, hDev);
    } catch {
      return;
    }
    const mCanvas = document.createElement('canvas');
    mCanvas.width = multImg.width;
    mCanvas.height = multImg.height;
    const mctx = mCanvas.getContext('2d');
    mctx.drawImage(multImg, 0, 0);
    const actx = addImg ? document.createElement('canvas').getContext('2d') : null;
    if (addImg && actx) {
      actx.canvas.width = addImg.width;
      actx.canvas.height = addImg.height;
      actx.drawImage(addImg, 0, 0);
    }
    const multFull = mctx.getImageData(0, 0, multImg.width, multImg.height).data;
    if (laptopGlowMasked()) {
      maskLaptopGlowMult(multFull, multImg.width, multImg.height, 0, 0, laptopGlowRingBase(multFull, multImg.width, multImg.height));
    }
    let addFull = null;
    if (addImg && actx) {
      addFull = actx.getImageData(0, 0, addImg.width, addImg.height).data;
      if (laptopGlowMasked()) maskLaptopGlowAdd(addFull, addImg.width, addImg.height);
    }
    const mw = multImg.width;
    const px = sceneData.data;
    for (let row = 0; row < hDev; row++) {
      for (let col = 0; col < wDev; col++) {
        const i = (row * wDev + col) * 4;
        if (px[i + 3] === 0) continue;
        const cssX = col / dev;
        const cssY = yDev0 / dev + row / dev;
        const sx = activeCrop.x + (cssX - activeOx) / activeScale;
        const sy = lightAnchorSceneY != null
          ? lightAnchorSceneY
          : activeCrop.y + (cssY - activeOy) / activeScale;
        const mx = Math.max(0, Math.min(mw - 1, Math.floor(sx)));
        const my = Math.max(0, Math.min(multImg.height - 1, Math.floor(sy)));
        const mi = (my * mw + mx) * 4;
        const mr = Math.min(1.2, multFull[mi] / 127.5);
        const mg = Math.min(1.2, multFull[mi + 1] / 127.5);
        const mb = Math.min(1.2, multFull[mi + 2] / 127.5);
        let r = useMultiply ? px[i] * mr : px[i];
        let g = useMultiply ? px[i + 1] * mg : px[i + 1];
        let b = useMultiply ? px[i + 2] * mb : px[i + 2];
        if (addFull) {
          r += kitchenDecodeAdd(addFull[mi]) * addStrength;
          g += kitchenDecodeAdd(addFull[mi + 1]) * addStrength;
          b += kitchenDecodeAdd(addFull[mi + 2]) * addStrength;
        }
        px[i] = Math.min(255, Math.max(0, r));
        px[i + 1] = Math.min(255, Math.max(0, g));
        px[i + 2] = Math.min(255, Math.max(0, b));
      }
    }
    ctx.putImageData(sceneData, 0, yDev0);
  }

  function applyKitchenEveningCoolSnapStrip(yCss0, yCss1) {
    if (!isKitchenSet() || currentLightVariant !== 'evening') return;
    const dev = dpr;
    const yDev0 = Math.max(0, Math.floor(yCss0 * dev));
    const yDev1 = Math.min(canvas.height, Math.ceil(yCss1 * dev));
    const hDev = yDev1 - yDev0;
    const wDev = canvas.width;
    if (hDev <= 0) return;
    let sceneData;
    try {
      sceneData = ctx.getImageData(0, yDev0, wDev, hDev);
    } catch {
      return;
    }
    const px = sceneData.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      px[i] = Math.min(255, px[i] * 0.48);
      px[i + 1] = Math.min(255, px[i + 1] * 0.78);
      px[i + 2] = Math.min(255, px[i + 2] * 1.52);
    }
    ctx.putImageData(sceneData, 0, yDev0);
  }

  function compositedFloorLikeRgb(r, g, b) {
    const wall = hexRgb(CFG.room.wall);
    const floor = hexRgb(CFG.room.floor);
    const px = [r, g, b];
    return colorDist(px, floor) + 8 < colorDist(px, wall) && r > 55 && g > 45 && b > 28;
  }

  function lastCompositedFloorRowDev(src, w, xd, yMaxDev) {
    const yTop = Math.max(0, yMaxDev - Math.round(96 * dpr));
    for (let yd = Math.min(yMaxDev - 1, canvas.height - 1); yd >= yTop; yd--) {
      const i = (yd * w + xd) * 4;
      if (compositedFloorLikeRgb(src[i], src[i + 1], src[i + 2])) return yd;
    }
    return Math.max(0, yMaxDev - 1);
  }

  function paintUngradedFloorStrip(roomCtx, wallPad) {
    if (!floorStripEnabled()) return;
    kitchenStageBufferCtx = roomCtx;
    roomCtx.save();
    roomCtx.translate(0, wallPad);
    drawCanonicalFloorStrip();
    roomCtx.restore();
    kitchenStageBufferCtx = null;
  }

  /**
   * The strip asset is a different picture from the graded floor, so night
   * shots used to show a wood seam. Continue the floor row just above the
   * strip. That row is already graded; repeating an earlier row pulled a
   * light-map glint down the band.
   */
  // fix21 A3 (Réalisateur 11:10, d3 h L19 "huge blurry box"): the band below the stage continued the room layer's last
  // row, which also holds the props drawn with the room (box_back, parcels...): a prop touching that row was smeared
  // down the whole band as a giant ghost column. The continued row now comes from the graded BARE floor (backdrop +
  // strip, no scene content), so props never bleed into the band. Bytes are unchanged wherever no prop touches it.
  function bareGradedFloorRow(maps, wallPad, W, H, srcEy) {
    const bare = makeKitchenLayerCanvas(W, H);
    const prev = kitchenStageBufferCtx;
    kitchenStageBufferCtx = bare.getContext('2d');
    kitchenStageBufferCtx.save();
    kitchenStageBufferCtx.translate(0, wallPad);
    drawKitchenBackdrop();
    drawCanonicalFloorStrip();
    kitchenStageBufferCtx.restore();
    kitchenStageBufferCtx = prev;
    gradeLayerCanvas(bare, maps, 1, 1, wallPad);
    return bare.getContext('2d').getImageData(0, srcEy, W, 1).data;
  }

  function continueGradedFloor(layerCanvas, maps, wallPad) {
    if (!maps || maps.key === 'day' || !floorStripEnabled() || !layerCanvas) return;
    const attach = floorStripAttachY();
    const srcEy = wallPad + attach - 1;
    if (srcEy < 0 || srcEy >= layerCanvas.height) return;
    const g = layerCanvas.getContext('2d');
    const img = g.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
    const W = layerCanvas.width;
    const start = wallPad + attach;
    if (start >= layerCanvas.height) return;
    const row = bareGradedFloorRow(maps, wallPad, W, layerCanvas.height, srcEy);
    for (let ey = start; ey < layerCanvas.height; ey += 1) {
      for (let x = 0; x < W; x += 1) {
        const si = x * 4;
        const di = (ey * W + x) * 4;
        img.data[di] = row[si];
        img.data[di + 1] = row[si + 1];
        img.data[di + 2] = row[si + 2];
        img.data[di + 3] = row[si + 3] || 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  function continueScreenFloorBelowAttach() {
    if (!currentLightVariant || currentLightVariant === 'day') return;
    if (!floorStripEnabled() || !activeCrop) return;
    if (PIXEL_LOCK_SHOTS.has(currentShotDef?.id)) return;
    if (isStairwellSet() && currentShotDef?.id === 'co') return;
    const attach = floorStripAttachY();
    const scale = activeScale || 1;
    const dst0 = Math.round(activeOy + (attach - activeCrop.y) * scale);
    const srcY = dst0 - 1;
    const yEnd = Math.min(canvas.height, Math.round(activeOy + stageH));
    if (dst0 >= yEnd || srcY < 0) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const d = snap.data;
    for (let y = Math.max(0, dst0); y < yEnd; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const si = (srcY * w + x) * 4;
        const di = (y * w + x) * 4;
        d[di] = d[si];
        d[di + 1] = d[si + 1];
        d[di + 2] = d[si + 2];
        d[di + 3] = d[si + 3];
      }
    }
    ctx.putImageData(snap, 0, 0);
  }

  function paintSetBandFloorExtension() {
    // Floor is drawn from set tiles and the canonical strip before actors.
    // Copying composited columns smears legs down the band.
    return;
  }

  function extendBandFloorFromCompositedStrip() {
    if (!floorSetKey()) return;
    const dev = dpr;
    const feetCss = lastFraming?.feetY ?? (activeOy + (CFG.room.floorTop - activeCrop.y) * activeScale);
    const yFeetDev = Math.round(feetCss * dev);
    const yEndDev = Math.round(stageH * dev);
    if (yEndDev <= yFeetDev + 1) return;
    const stripHDev = 8;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const src = snap.data;
    const out = ctx.getImageData(0, 0, w, canvas.height);
    const d = out.data;
    for (let yd = 0; yd < canvas.height; yd++) {
      for (let xd = 0; xd < w; xd++) {
        const si = (yd * w + xd) * 4;
        d[si] = src[si];
        d[si + 1] = src[si + 1];
        d[si + 2] = src[si + 2];
        d[si + 3] = src[si + 3];
      }
    }
    const lastFloorRow = new Int32Array(w);
    for (let xd = 0; xd < w; xd++) {
      lastFloorRow[xd] = lastCompositedFloorRowDev(src, w, xd, yFeetDev);
    }
    function copyStripPixel(dBuf, xd, yd, k) {
      const last = lastFloorRow[xd];
      const stripTop = Math.max(0, last - (stripHDev - 1));
      const srcYd = stripTop + k;
      const si = (srcYd * w + xd) * 4;
      const di = (yd * w + xd) * 4;
      dBuf[di] = src[si];
      dBuf[di + 1] = src[si + 1];
      dBuf[di + 2] = src[si + 2];
      dBuf[di + 3] = src[si + 3];
    }
    for (let yd = yFeetDev; yd < yEndDev; yd++) {
      const k = (yd - yFeetDev) % stripHDev;
      for (let xd = 0; xd < w; xd++) copyStripPixel(d, xd, yd, k);
    }
    for (let yd = Math.max(0, yFeetDev - stripHDev); yd < yFeetDev; yd++) {
      const k = (yd - (yFeetDev - stripHDev)) % stripHDev;
      for (let xd = 0; xd < w; xd++) {
        const i = (yd * w + xd) * 4;
        if (!compositedFloorLikeRgb(d[i], d[i + 1], d[i + 2])) copyStripPixel(d, xd, yd, k);
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  function paintKitchenBandFloorPlanksTiled(warm, lightAnchorSceneY = null) {
    if (!isKitchenSet()) return;
    if (floorStripEnabled()) return;
    const ft = CFG.room.floorTop;
    const feetCss = lastFraming?.feetY ?? (activeOy + (ft - activeCrop.y) * activeScale);
    const y0 = Math.max(0, feetCss);
    const y1 = stageH;
    if (y1 <= y0 + 1) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.rect(0, y0, stageW, y1 - y0);
    ctx.clip();
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-activeCrop.x, -activeCrop.y);
    const ySceneEnd = activeCrop.y + activeCrop.h + 48;
    drawKitchenFloorPlankRows(ySceneEnd);
    ctx.restore();
    if (currentLightVariant === 'day') {
      applyKitchenLightGradeScreenStrip(y0, y1, lightAnchorSceneY);
    }
  }

  function paintKitchenBandFloorPlanks(warm) {
    if (!isKitchenSet()) return;
    paintKitchenBandFloorPlanksTiled(warm, null);
  }

  /** Fill only the scene-band margin below the crop — never repaint planks over actors. */
  function paintKitchenStageMarginFloor() {
    if (!isKitchenSet()) return;
    if (floorStripEnabled()) return;
    const sceneBottom = activeOy + activeCrop.h * activeScale;
    const y0 = Math.max(0, sceneBottom);
    const y1 = stageH;
    if (y1 <= y0 + 0.5) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.rect(0, y0, stageW, y1 - y0);
    ctx.clip();
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-activeCrop.x, -activeCrop.y);
    const ySceneEnd = Math.max(activeCrop.y + activeCrop.h + 24, CFG.room.floorTop + 32);
    drawKitchenFloorPlankRows(ySceneEnd);
    ctx.restore();
    if (currentLightVariant !== 'day') {
      applyKitchenLightGradeScreenStrip(y0, y1);
    } else {
      applyKitchenLightGradeScreenStrip(y0, y1, null);
    }
  }

  function sceneToScreen(sx, sy) {
    return {
      x: activeOx + (sx - activeCrop.x) * activeScale,
      y: activeOy + (sy - activeCrop.y) * activeScale
    };
  }

  function sceneToBubbleScreen(sx, sy) {
    const p = sceneToScreen(sx, sy);
    return { x: p.x, y: p.y + bubbleBandH };
  }

  function screenToScene(px, py) {
    return {
      x: activeCrop.x + (px - activeOx) / activeScale,
      y: activeCrop.y + (py - activeOy) / activeScale
    };
  }

  function cropNeedsTallBackdrop(crop) {
    const sh = CFG.scene?.height ?? SH;
    return crop.y < 0 || crop.y + crop.h > sh;
  }

  function tintVisibleWallFloor(warm) {
    if (!warm) return;
    const ft = CFG.room.floorTop;
    const c = activeCrop;
    const alpha = CFG.backdrop?.warmTintAlpha ?? 0.32;
    const { wall, floor } = roomColors(true);
    const y0 = c.y;
    const y1 = c.y + c.h;
    ctx.save();
    ctx.globalAlpha = alpha;
    const wallBottom = Math.min(ft, y1);
    if (wallBottom > y0) {
      ctx.fillStyle = wall;
      ctx.fillRect(c.x, y0, c.w, wallBottom - y0);
    }
    if (y1 > ft) {
      ctx.fillStyle = floor;
      ctx.fillRect(c.x, Math.max(ft, y0), c.w, y1 - Math.max(ft, y0));
    }
    ctx.restore();
  }

  function drawKitchenBackdrop() {
    drawLogicalAsset('backdrop.kitchen', 0, 0);
    const horizon = spriteManifest?.kitchenStage?.horizon ?? CFG.room?.horizon ?? 128;
    drawLogicalAsset('backdrop.kitchen_floor', 0, horizon);
  }

  function applyKitchenLightGrade(crop) {
    const x = Math.max(0, Math.floor(crop.x));
    const y = Math.max(0, Math.floor(crop.y));
    const w = Math.min(sceneStage() - x, crop.w);
    const h = Math.min(sceneStageH() - y, crop.h);
    applyKitchenLightGradeRect(x, y, w, h);
  }

  function sampleStairwellWainscotRgb() {
    try {
      const spec = resolveAsset(spriteManifest, 'backdrop.stairwell', {
        lightVariant: kitchenAssetLightVariant()
      });
      const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
      const fr = spec.frame || { x: 0, y: 0 };
      if (!im) return [216, 195, 154];
      const scratch = document.createElement('canvas');
      scratch.width = 1;
      scratch.height = 1;
      const sctx = scratch.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(im, (fr.x || 0) + 1, (fr.y || 0) + 110, 1, 1, 0, 0, 1, 1);
      const d = sctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    } catch {
      return [216, 195, 154];
    }
  }

  /**
   * A repeating wall panel the crop would slice is not drawn. Its rect is
   * repainted with the wainscot fill so the margin stays wall fill.
   */
  function coverCutWallPanels() {
    const scale = Math.max(1, activeScale || 1);
    const frame = {
      viewX: activeCrop?.x ?? 0,
      viewTop: activeCrop?.y ?? 0,
      usableW: Math.floor(stageW / scale),
      scale,
      stageW,
      stageH
    };
    const dropped = repeatingWallPanels(sceneStage()).filter((panel) => wallPanelCutByFrame(panel, frame));
    if (!dropped.length) return;
    const rgb = sampleStairwellWainscotRgb();
    const dc = dctx();
    dc.save();
    dc.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    for (const panel of dropped) dc.fillRect(panel.left, panel.top, panel.w, panel.h);
    dc.restore();
  }

  function drawBackdrop() {
    if (isStairwellSet()) {
      drawStairwellLayerScenery();
      return;
    }
    if (isRooftopSet()) {
      drawRooftopUngradedScenery();
      return;
    }
    if (isKitchenSet()) {
      drawKitchenBackdrop();
      return;
    }
    const name = CFG.backdrop;
    if (!name || typeof name !== 'string') return;
    const crop = activeCrop;
    const tall = cropNeedsTallBackdrop(crop);
    try {
      const spec = resolveAsset(spriteManifest, name, { variant: tall ? 'tall' : 'base' });
      const bh = spec.h ?? SH;
      const yStart = tall ? (spec.sceneTop ?? -36) : 0;
      const yEnd = crop.y + crop.h + 4;
      for (let y = yStart; y < yEnd; y += bh) {
        drawSpec(spec, 0, y);
      }
    } catch {
      /* no backdrop in pack */
    }
  }

  function paintCropFloor(warm = false) {
    const { floor } = roomColors(warm);
    const ft = CFG.room.floorTop;
    const c = activeCrop;
    const yTop = Math.max(ft, c.y);
    const yBot = c.y + c.h;
    if (yBot <= yTop) return;
    ctx.fillStyle = floor;
    ctx.fillRect(c.x, yTop, c.w, yBot - yTop);
  }

  function propState(prop, stageDef, id) {
    return stageDef.propStates?.[id] ?? prop.defaultState ?? 'default';
  }

  function getStageForShot(shot) {
    const base = CFG.defaultStage || {};
    const st = shot.stage || {};
    const baseProps = base.props ?? [];
    const soirStageProps = (shot.id === 'd11_mar_chat' && shotLightVariant(shot) !== 'day')
      ? (shot.soir?.stage?.props ?? []) : [];
    const shotProps = [...new Set([...(st.props ?? []), ...soirStageProps])];
    const exclude = new Set([
      ...(shot.excludeProps || []),
      ...(st.excludeProps || [])
    ]);
    if (shot.id === 'd11_mar_chat' && shotLightVariant(shot) !== 'day') {
      for (const id of KITCHEN_WALL_ANCHORED_PROPS) exclude.delete(id);
    }
    let props = isKitchenSet()
      ? [...new Set([...baseProps, ...shotProps])]
      : (shotProps.length ? shotProps : baseProps);
    if (exclude.size) props = props.filter((id) => !exclude.has(id));
    if (isKitchenSet() && shot.crop) {
      const crop = (currentShotDef?.id === shot.id && activeCrop?.x != null)
        ? activeCrop
        : kitchenShotRenderCrop(shot);
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      // Stage-record props are pinned set dressing (STAGE_D1-3 propPlacement): drawn crop-clipped, never culled by the
      // small-prop inset rule (same contract as H5d in drawProps). Root cause of E-SETPIECE-MISSING house_rules (d2).
      const pinned = (st.stageRecord ?? base.stageRecord) ? new Set(st.props ?? base.props ?? []) : null;
      props = props.filter((id) => {
        if (!KITCHEN_SMALL_DISCRETE_PROPS.has(id)) return true;
        if (pinned?.has(id)) return true;
        const p = catalog[id];
        if (!p) return true;
        const box = propSceneBounds(spriteManifest, p, lv);
        if (!box) return true;
        if (id === 'pendant' && kitchenShotUsesSoirLayout(shot)) return true;
        if (!kitchenSmallPropMayRender(box, crop, 2)) return false;
        if (currentShotDef?.id === shot.id && activeCrop?.x != null) {
          return kitchenSmallPropVisibleInSceneBand(id, p);
        }
        return true;
      });
    }
    let actors = { ...(base.actors || {}), ...(st.actors || {}) };
    if (shot.id === 'd11_mar_chat' && shotLightVariant(shot) !== 'day' && shot.soir?.stage?.actors) {
      for (const [name, patch] of Object.entries(shot.soir.stage.actors)) {
        if (patch === null) {
          delete actors[name];
          continue;
        }
        if (!patch) continue;
        actors[name] = actors[name] ? { ...actors[name], ...patch } : { ...patch };
      }
    }
    for (const name of Object.keys(actors)) {
      if (!actors[name]) delete actors[name];
    }
    return {
      props,
      propStates: { ...(base.propStates || {}), ...(st.propStates || {}) },
      propPlacement: { ...(base.propPlacement || {}), ...(st.propPlacement || {}) },
      stageRecord: st.stageRecord ?? base.stageRecord,
      actors,
      extras: [...(base.extras || []), ...(st.extras || [])],
      uiText: st.uiText ?? base.uiText,
      uiTextPos: st.uiTextPos ?? base.uiTextPos ?? CFG.uiTextPos ?? { x: 40, y: 38 },
      sitcomOverlay: st.sitcomOverlay,
      omitPropIds: st.omitPropIds,
      captionDraw: st.captionDraw,
      lightMasks: st.lightMasks,
      // fix19b: compile-stage fields the player reads (band framing subjects, desk-top surface slots)
      frameSubjects: st.frameSubjects ?? null,
      deskSlots: st.deskSlots ?? base.deskSlots ?? null
    };
  }

  function drawSitcomInsertCaption(stageDef) {
    const c = stageDef.captionDraw;
    if (!c || !lastCloseInsertOrigin) return;
    const [rx, ry, rw, rh] = c.rect;
    const { x, y, scale } = lastCloseInsertOrigin;
    const probe = globalThis.__A411_INSERT_PROBE;
    if (probe) probe.caption = { text: c.text, x: x + rx * scale, y: y + ry * scale, w: rw * scale, h: rh * scale };
    // caption metrics are in stage px (caption-render.js): draw in the insert's stage space, scaled with the insert.
    // (Passing a css-px rect drew 2.2 css px text: unreadable.)
    // ink vs the insert art actually under the rect: a self-lit (white) caption on a light panel is invisible
    // (d2/h insert_phone_notif: self_lit on a white notification card). Pick the existing ink that contrasts; no new colour.
    let bgLum = null;
    try {
      const k = ctx.getTransform().a || 1;
      const id = ctx.getImageData(Math.round((x + rx * scale) * k), Math.round((y + ry * scale) * k), Math.max(1, Math.round(rw * scale * k)), Math.max(1, Math.round(rh * scale * k))).data;
      let sum = 0; const n = id.length / 4;
      for (let i = 0; i < id.length; i += 4) sum += (0.2126 * id[i] + 0.7152 * id[i + 1] + 0.0722 * id[i + 2]) / 255;
      bgLum = sum / n;
    } catch { /* tainted/offscreen: keep authored ink */ }
    const selfLit = bgLum == null ? c.selfLit : bgLum < 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const ok = drawCaptionInRect(ctx, c.text, { x: rx, y: ry, w: rw, h: rh }, { selfLit, maxLines: c.maxLines });
    ctx.restore();
    if (probe) {
      probe.caption.drawn = ok !== false; probe.caption.bgLum = bgLum; probe.caption.selfLit = selfLit; probe.caption.authoredSelfLit = !!c.selfLit;
      if (bgLum != null) { const L = (v) => v + 0.05; const ink = selfLit ? 1 : 0.0343; probe.caption.contrast = +(Math.max(L(ink), L(bgLum)) / Math.min(L(ink), L(bgLum))).toFixed(2); }
    }
  }

  function drawSitcomOverlay(stageDef, t, passFilter) {
    const draws = stageDef.sitcomOverlay?.draws;
    if (!draws?.length) return;
    const lv = kitchenAssetLightVariant();
    for (const d of draws) {
      const pass = d.pass || 'front';
      if (passFilter && pass !== passFilter && pass !== 'between') continue;
      if (passFilter === 'behind' && pass === 'front') continue;
      if (passFilter === 'front' && pass === 'behind') continue;
      try {
        if (d.kind === 'prop') {
          const spec = resolveAsset(spriteManifest, d.asset, { lightVariant: lv });
          drawSpec(spec, d.x, d.y, d.flip);
        } else if (d.kind === 'cat') {
          if (d.ownedBy === 'actor') continue;
          const fi = sequenceFrameIndex(spriteManifest, d.asset, t);
          const spec = resolveAsset(spriteManifest, d.asset, { frameIndex: fi, lightVariant: lv });
          const pos = bandAnchorOverrides?.cat;
          drawSpec(spec, pos?.x ?? d.x, pos?.y ?? d.y);
        } else if (d.kind === 'cat_bowl') {
          const catDraw = draws.find((x) => x.kind === 'cat' && x.action === 'drink');
          let bowlAsset = 'prop.cat_bowl.any';
          if (catDraw) {
            const fi = sequenceFrameIndex(spriteManifest, catDraw.asset, t);
            if (fi === 1) bowlAsset = 'prop.cat_bowl_ripple.any';
          }
          const spec = resolveAsset(spriteManifest, bowlAsset, { lightVariant: lv });
          drawSpec(spec, d.x, d.y);
        } else if (d.kind === 'laptop_overlay' && lastCloseInsertOrigin && !(currentShotDef?.subshot && currentShotDef?.phoneInsert?.backdropDim > 0)) {
          const { x, y, scale } = lastCloseInsertOrigin;
          const [sx, sy] = d.slot;
          const imgSpec = resolveAsset(spriteManifest, d.asset, { lightVariant: lv });
          drawSpec(imgSpec, x + sx * scale, y + sy * scale);
        }
      } catch (err) {
        // Strict mode (?strict=1 or capture): log and fail the beat instead of silently skipping (or throwing).
        if (sitcomStrictMode()) recordSitcomStrictError(d, err);
      }
      if (d.unresolved && sitcomStrictMode()) recordSitcomStrictError(d, new Error(d.unresolved));
    }
  }

  function sitcomStrictMode() {
    try {
      const q = globalThis.location ? new URLSearchParams(globalThis.location.search) : null;
      if (q?.get('strict') === '0') return false;
      return q?.get('strict') === '1' || q?.has('capture') || globalThis.__sitcomStrict === true;
    } catch {
      return false;
    }
  }

  function recordSitcomStrictError(d, err, shotOverride = null) {
    const list = (globalThis.__sitcomOverlayStrictErrors ||= []);
    const shot = shotOverride ?? currentShotDef?.subshot?.beat ?? currentShotDef?.id ?? null;
    const msg = `${d.kind} ${d.asset ?? ''}: ${err?.message || err}`;
    if (list.some((e) => e.shot === shot && e.msg === msg)) return;
    list.push({ shot, kind: d.kind, asset: d.asset ?? null, msg });
    console.error(`[sitcom-strict] shot ${shot}: ${msg}`);
  }

  function kitchenLandmarkBoxes(shotDef, t) {
    const stageDef = getStageForShot(shotDef);
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const lv = shotLightVariant(shotDef);
    const preset = presetFromCropRef(shotDef.crop || {});
    const ids = shotDef?.framingLandmarks
      || (preset === 'close' || String(shotDef?.crop || '').startsWith('close')
        ? ['window', 'counter', 'backsplash']
        : []);
    const boxes = [];
    for (const id of ids) {
      if (!stageDef.props.includes(id)) continue;
      const p = catalog[id];
      if (!p) continue;
      const box = propSceneBounds(spriteManifest, p, lv);
      if (box) boxes.push({ ...box, id });
    }
    return boxes;
  }

  function kitchenContentBoxes(shotDef, t) {
    const stageDef = getStageForShot(shotDef);
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const lv = shotLightVariant(shotDef);
    const boxes = [];
    const framingProps = shotDef?.id === 'keyboard_cat'
      ? ['desk', 'laptop']
      : [];
    for (const id of framingProps) {
      const p = catalog[id];
      if (!p) continue;
      const box = propSceneBounds(spriteManifest, p, lv);
      if (box) boxes.push(box);
    }
    for (const [name, def] of Object.entries(stageDef.actors)) {
      if (!def) continue;
      const box = actorSceneBounds(spriteManifest, name, def, t);
      if (box) boxes.push(box);
    }
    return boxes;
  }

  const KITCHEN_TABLE_FLOOR_PIN_BOTTOM = new Set(['n_d11_matin2']);

  const KITCHEN_PINNED_CROP_SHOT_IDS = new Set([
    'keyboard_cat',
    'd11_mar_chat',
    'n_d11_ecran',
    'd11_mar_bonjour',
    'd11_dictee',
    'd11_mar_futur',
    'd11_noe_faim',
    'd11_cam_lait',
    'd11_cam_lit',
    'd11_cam_court',
    'd11_noe_lait',
    'd11_noe_court',
    'n_d11_matin2',
  ]);

  function resolveKitchenCrop(crop, shotDef, t) {
    if (crop?.fromHandoff) {
      const { w: SW, h: SH } = kitchenStageSize();
      const clampH = floorStripEnabled() ? kitchenExtendedStageHeight() : SH;
      return clampKitchenCropToStage({ ...crop }, SW, clampH);
    }
    if (KITCHEN_PINNED_CROP_SHOT_IDS.has(shotDef?.id)
      && crop?.x != null && crop?.w != null) {
      const feet = cropYForFeetBandTarget(crop.h, CFG.room?.floorTop ?? 136);
      const floorY = CFG.room?.floorTop ?? 136;
      const fracInCrop = crop.y != null ? (floorY - crop.y) / crop.h : 1;
      const adjustY = presetFromCropRef(crop) === 'close' || fracInCrop > FEET_BAND_FRAC_MAX;
      return {
        ...crop,
        y: adjustY ? feet.cropY : crop.y,
        feetBandFrac: feet.feetBandFrac,
        feetTargetFeasible: feet.feetTargetFeasible,
        feetNote: feet.feetNote
      };
    }
    const preset = presetFromCropRef(crop);
    const stageDef = getStageForShot(shotDef);
    const actorOnly = [];
    for (const [name, def] of Object.entries(stageDef.actors)) {
      if (!def) continue;
      const b = actorSceneBounds(spriteManifest, name, def, t);
      if (b) actorOnly.push(b);
    }
    return solveKitchenCrop({
      presetName: preset,
      contentBoxes: kitchenContentBoxes(shotDef, t),
      verticalBoxes: actorOnly,
      landmarkBoxes: kitchenLandmarkBoxes(shotDef, t)
    });
  }

  function propLayer(p) {
    if (FURNITURE_PROPS.has(p.id)) return 'behind';
    if (p.layer === 'behind' || p.layer === 'front') return p.layer;
    return (p.z ?? 0) >= 25 ? 'front' : 'behind';
  }

  function resolvePropAsset(p) {
    if (!p) return null;
    if (p.id === 'pendant' || p.asset === 'prop.pendant_off') {
      if (currentLightVariant === 'night' || currentLightVariant === 'evening') return 'prop.pendant_on';
      return null;
    }
    return p.asset;
  }

  function kitchenSmallPropVisibleInSceneBand(propId, p) {
    if (!isKitchenSet() || !KITCHEN_SMALL_DISCRETE_PROPS.has(propId) || activeCrop?.x == null) return true;
    const asset = resolvePropAsset(p);
    const ov = bandAnchorOverrides?.assets?.[propId]
      || (asset && bandAnchorOverrides?.assets?.[asset]);
    const box = ov
      ? propBoxAt(p, ov.x, ov.y)
      : propSceneBounds(spriteManifest, p, kitchenAssetLightVariant());
    if (!box || !kitchenSmallPropMayRender(box, activeCrop, 2)) return false;
    const tl = sceneToScreen(box.x, box.y);
    const br = sceneToScreen(box.x + box.w, box.y + box.h);
    const m = 2;
    return tl.x >= m && br.x <= stageW - m && tl.y >= m && br.y <= stageH - m;
  }

  function bandCoverFullWindow() {
    const crop = activeCrop;
    return {
      x: crop.x,
      y: crop.y,
      w: Math.floor(stageW / Math.max(1, activeScale)),
      h: Math.floor(stageH / Math.max(1, activeScale))
    };
  }

  function bandCoverBoxInside(box) {
    if (!box || activeCrop?.x == null) return false;
    const win = bandCoverFullWindow();
    return box.x >= win.x - 0.01
      && box.y >= win.y - 0.01
      && box.x + box.w <= win.x + win.w + 0.01
      && box.y + box.h <= win.y + win.h + 0.01;
  }

  /** A loose prop draws only when its own box rests on a support that is fully inside. */
  function bandCoverPropRestsOnSupport(stageDef, id, propBox) {
    if (!propBox) return false;
    const supports = id === 'coffee_pot' ? ['counter'] : ['table', 'counter', 'shelf', 'desk'];
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const propBottom = propBox.y + propBox.h - 1;
    for (const sid of supports) {
      if (!stageDef.props?.includes(sid)) continue;
      const sp = catalog[sid];
      if (!sp) continue;
      const place = propDrawPosition(stageDef, sid, sp);
      const box = propBoxAt(sp, place.x, place.y);
      // H5d: under a stage record a crop-clipped support is still the surface (props are clipped, never culled).
      if (!box || (!stageDef.stageRecord && !bandCoverBoxInside(box))) continue;
      const overlapX = Math.min(propBox.x + propBox.w, box.x + box.w) - Math.max(propBox.x, box.x);
      if (overlapX < Math.min(propBox.w, 3)) continue;
      const surfaceY = supportSurfaceRow(sid, box.y, stageDef.deskSlots);
      const tol = sid === 'counter' ? 0.5 : 2;
      if (Math.abs(propBottom - surfaceY) <= tol) return true;
    }
    return false;
  }

  function bandCoverOverlapsStaged(box, id) {
    const assets = bandAnchorOverrides?.assets;
    if (!assets || !box) return false;
    for (const [key, ov] of Object.entries(assets)) {
      if (!ov || ov.left == null || key === id) continue;
      const overlapX = Math.min(box.x + box.w, ov.left + ov.w) - Math.max(box.x, ov.left);
      const overlapY = Math.min(box.y + box.h, ov.top + ov.h) - Math.max(box.y, ov.top);
      if (overlapX > 1 && overlapY > 1) return true;
    }
    return false;
  }

  function propDrawPosition(stageDef, id, p) {
    const asset = resolvePropAsset(p);
    const ov = bandAnchorOverrides?.assets?.[id]
      || (asset && bandAnchorOverrides?.assets?.[asset]);
    if (ov) return { x: ov.x, y: ov.y };
    const place = stageDef.propPlacement?.[id];
    return { x: place?.x ?? p.x, y: place?.y ?? p.y };
  }

  function drawProps(stageDef, pass, omitPropIds) {
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const sorted = [...stageDef.props].sort((a, b) => (catalog[a]?.z ?? 0) - (catalog[b]?.z ?? 0));
    for (const id of sorted) {
      if (omitPropIds?.has(id)) continue;
      const p = catalog[id];
      if (!p) continue;
      if (!stageDef.stageRecord && !kitchenSmallPropVisibleInSceneBand(id, p)) continue;
      if (propLayer(p) !== pass) continue;
      const state = propState(p, stageDef, id);
      const asset = resolvePropAsset(p);
      if (!asset) {
        if (p.placeholderLabel) drawPropPlaceholder(p);
        continue;
      }
      const { x: px, y: py } = propDrawPosition(stageDef, id, p);
      const box = propBoxAt(p, px, py);
      if (canonicalBandCover && activeCrop?.x != null) {
        if (!stageDef.stageRecord && !bandCoverBoxInside(box)) continue;
        const staged = !!(bandAnchorOverrides?.assets?.[id]
          || (asset && bandAnchorOverrides?.assets?.[asset]));
        // H5d: props pinned by a stage record are drawn crop-clipped, never culled by the inset rule.
        const lockFrame = preservesAuthoredPropLayout() || !!stageDef.stageRecord;
        if (!lockFrame) {
          if (bandAnchorOverrides?.skipAssets?.has(id) || (asset && bandAnchorOverrides.skipAssets?.has(asset))) continue;
          const insetFrame = {
            viewX: activeCrop.x,
            viewTop: activeCrop.y,
            scale: activeScale || 1,
            stageW,
            stageH,
            usableW: Math.floor(stageW / Math.max(1, activeScale || 1)),
            usableH: Math.floor(stageH / Math.max(1, activeScale || 1))
          };
          const insetPiece = { left: box.x, top: box.y, w: box.w, h: box.h };
          if (pieceOutsideScreenInset(insetPiece, insetFrame)) continue;
          if ((id === 'window' || asset === 'prop.window') && bandCoverOverlapsStaged(box, id)) continue;
        }
        if (KITCHEN_FLOAT_SURFACE_PROPS.has(id) && !bandCoverPropRestsOnSupport(stageDef, id, box)) continue;
        if (!staged && bandCoverOverlapsStaged(box, id)) continue;
      }
      let drew = false;
      try {
        const spec = resolveAsset(spriteManifest, asset, {
          state,
          lightVariant: kitchenAssetLightVariant()
        });
        drawSpec(spec, px, py, p.flip);
        drew = true;
        if (box) noteDrawnProp(id, box, asset);
      } catch {
        drew = false;
      }
      if (!drew && p.placeholderLabel) {
        drawPropPlaceholder(p);
      } else if (drew && p.placeholderLabel) {
        drawPropPlaceholder(p, true);
      }
    }
  }

  function drawPropPlaceholder(p, badgeOnly = false) {
    const label = String(p.placeholderLabel);
    const w = badgeOnly ? Math.max(12, label.length * 1.6) : (p.placeholderW ?? 14);
    const h = badgeOnly ? 4 : (p.placeholderH ?? 10);
    const px = p.x - w / 2;
    const py = badgeOnly ? p.y - h - 2 : p.y - h;
    ctx.save();
    ctx.fillStyle = badgeOnly ? 'rgba(255, 200, 120, 0.9)' : 'rgba(255, 248, 220, 0.92)';
    ctx.strokeStyle = '#c45c26';
    ctx.lineWidth = 1;
    ctx.fillRect(px, py, w, h);
    ctx.strokeRect(px, py, w, h);
    ctx.fillStyle = '#5a3010';
    ctx.font = badgeOnly ? '2px monospace' : '2.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, py + h / 2);
    ctx.restore();
  }

  function actorSkipsFloorShadow(def) {
    const a = String(def?.asset || '');
    return a.includes('keyboard_idle');
  }

  function drawDeskContactShadow(def) {
    if (!def || def.x == null || def.y == null) return;
    if (kitchenStageBufferCtx) {
      // SH1: crisp per-pixel multiply (same path as paintQueuedFloorContacts), no antialiased ellipse.
      paintCrispContactEllipse(`desk:${def.asset || ''}`, def.x, def.y, 160, DESK_SHADOW_RX, DESK_SHADOW_RY);
      return;
    }
    const dc = dctx();
    dc.save();
    dc.fillStyle = 'rgba(34, 48, 58, 0.28)';
    dc.beginPath();
    const feet = sceneToScreen(def.x, def.y + 1);
    const w = 10 * activeScale;
    const h = 3 * activeScale;
    dc.ellipse(feet.x, feet.y + 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);
    dc.fill();
    dc.restore();
  }

  const DESK_SHADOW_RX = 5;
  const DESK_SHADOW_RY = 1.5;
  const bakedContactCache = new Map();

  /**
   * SH1 baked-contact mode (generic, per render; no per-day/shot literal).
   *   'suppress' (default, EXPECTED_DIFF_SH1 as approved): a sprite with a baked translucent contact row gets no engine shadow.
   *   'crisp': the baked row is omitted and a crisp per-pixel multiply contact is painted instead (no softness, no float).
   * Selected by `?sh1baked=crisp|suppress` or CFG.render.sh1BakedContact.
   */
  function sh1BakedContactMode() {
    const q = globalThis.location ? new URLSearchParams(globalThis.location.search).get('sh1baked') : null;
    const v = q || CFG?.render?.sh1BakedContact;
    return v === 'crisp' ? 'crisp' : 'suppress';
  }

  /** SH1: true when the drawn sprite already carries its own translucent contact row (generic, per asset). */
  function assetHasBakedContactRow(name) {
    if (!name) return false;
    if (bakedContactCache.has(name)) return bakedContactCache.get(name);
    let baked = false;
    try {
      const spec = resolveAsset(spriteManifest, name, { lightVariant: currentLightVariant || 'day' });
      const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
      if (!im) return false;
      baked = spriteBottomIsBakedContact(im, spec.frame?.x || 0, spec.frame?.y || 0, spec.frame?.w || spec.w, spec.frame?.h || spec.h);
    } catch {
      return false;
    }
    bakedContactCache.set(name, baked);
    return baked;
  }

  /** SH1: hard multiply ellipse in stage pixels; deferred into queuedFloorContacts when the stage buffer defers. */
  function paintCrispContactEllipse(id, anchorX, feetY, gray, rx = ACTOR_SHADOW_RX, ry = ACTOR_SHADOW_RY) {
    const span = actorShadowSceneSpan(anchorX, feetY, rx, ry);
    const item = { kind: 'ellipse', id, gray, anchorX, feetY, rx, ry, left: span.left, right: span.right, top: span.top, bottom: span.bottom };
    if (shouldDeferContactMultiply()) { queuedFloorContacts.push(item); return; }
    paintMultiplySpan(dctx(), gray, (dc) => {
      for (let y = span.top; y <= span.bottom; y += 1) {
        for (let x = span.left; x <= span.right; x += 1) {
          if (actorEllipseCovers(anchorX, feetY, x, y, rx, ry)) dc.fillRect(x, y, 1, 1);
        }
      }
    });
    noteContactPaint(item);
  }

  function actorIsCat(name, def) {
    const asset = String(def?.asset || '');
    const character = def?.character || name || '';
    return character === 'croissant' || character === 'cat' || name === 'cat' || asset.startsWith('croissant');
  }

  function actorRestsOnHallwayFloor(def) {
    const asset = String(def?.asset || '');
    return !/sit|keyboard|sleep|lie|curl/.test(asset);
  }

  function paintHallwayFloorEllipse(dc, anchorX, feetY, gray = sharedFloorShadowGray([HALLWAY_TILE_RGB, HALLWAY_MORTAR_RGB])) {
    const span = actorShadowSceneSpan(anchorX, feetY);
    dc.save();
    dc.globalCompositeOperation = 'multiply';
    dc.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    for (let y = span.top; y <= span.bottom; y += 1) {
      for (let x = span.left; x <= span.right; x += 1) {
        if (!actorEllipseCovers(anchorX, feetY, x, y)) continue;
        dc.fillRect(x, y, 1, 1);
      }
    }
    dc.restore();
  }

  function shouldDeferContactMultiply() {
    if (isKitchenSet() && kitchenStageBufferCtx) return true;
    if ((isStairwellSet() || isRooftopSet()) && currentLightVariant && currentLightVariant !== 'day') return true;
    return false;
  }

  function noteContactPaint(entry) {
    lastContactPaint.push(entry);
  }

  function paintMultiplySpan(dc, gray, visit) {
    dc.save();
    dc.globalCompositeOperation = 'multiply';
    dc.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    visit(dc);
    dc.restore();
  }

  function paintQueuedFloorContacts(dc) {
    const list = queuedFloorContacts;
    queuedFloorContacts = [];
    for (const item of list) {
      noteContactPaint(item);
      if (item.kind === 'ellipse') {
        paintMultiplySpan(dc, item.gray, () => {
          for (let y = item.top; y <= item.bottom; y += 1) {
            for (let x = item.left; x <= item.right; x += 1) {
              if (!actorEllipseCovers(item.anchorX, item.feetY, x, y, item.rx, item.ry)) continue;
              dc.fillRect(x, y, 1, 1);
            }
          }
        });
        continue;
      }
      paintMultiplySpan(dc, item.gray, () => {
        const omit = new Set(item.omitColumns || []);
        const right = item.left + item.w - 1;
        let x = item.left;
        while (x <= right) {
          if (omit.has(x)) { x += 1; continue; }
          let end = x;
          while (end + 1 <= right && !omit.has(end + 1)) end += 1;
          dc.fillRect(x, item.top, end - x + 1, item.h);
          x = end + 1;
        }
      });
    }
  }

  function drawActorShadow(name, def, t) {
    if (hardContactRowIds.has(`actor:${name}`)) return; // PX-ROW: the hard contact row replaces the soft shadow
    const placed = actorDrawDef(name, def);
    if (!placed || placed.x == null || placed.y == null) return;
    if (actorSkipsFloorShadow(placed)) {
      if (String(placed.asset || '').includes('keyboard_idle')) drawDeskContactShadow(placed);
      return;
    }
    const dc = dctx();
    dc.save();
    dc.fillStyle = 'rgba(34, 48, 58, 0.22)';
    dc.beginPath();
    const multiplyFloor = actorRestsOnHallwayFloor(placed) && !actorIsCat(name, placed)
      && (isStairwellSet() || isRooftopSet() || !!kitchenStageBufferCtx);
    if (kitchenStageBufferCtx && !multiplyFloor) {
      dc.restore();
      // SH1: no engine shadow under a sprite with a baked contact row; otherwise crisp per-pixel multiply, no AA ellipse.
      if (assetHasBakedContactRow(placed.asset) && sh1BakedContactMode() !== 'crisp') return;
      paintCrispContactEllipse(`actor:${name}`, placed.x, placed.y, 160);
      return;
    } else if (multiplyFloor) {
      dc.restore();
      const gray = currentShotDef?.id === 'co' && currentLightVariant === 'day'
        ? sharedFloorShadowGray([HALLWAY_TILE_RGB, HALLWAY_MORTAR_RGB])
        : (PIXEL_LOCK_SHOTS.has(currentShotDef?.id) ? floorDarkenGray() : 160);
      if (shouldDeferContactMultiply()) {
        const span = actorShadowSceneSpan(placed.x, placed.y);
        queuedFloorContacts.push({
          kind: 'ellipse',
          id: `actor:${name}`,
          gray,
          anchorX: placed.x,
          feetY: placed.y,
          left: span.left,
          right: span.right,
          top: span.top,
          bottom: span.bottom,
          floorStanding: true
        });
        return;
      }
      paintHallwayFloorEllipse(dc, placed.x, placed.y, gray);
      noteContactPaint({
        kind: 'ellipse',
        id: `actor:${name}`,
        gray,
        anchorX: placed.x,
        feetY: placed.y,
        left: actorShadowSceneSpan(placed.x, placed.y).left,
        right: actorShadowSceneSpan(placed.x, placed.y).right,
        top: actorShadowSceneSpan(placed.x, placed.y).top,
        bottom: actorShadowSceneSpan(placed.x, placed.y).bottom,
        floorStanding: true
      });
      return;
    } else {
      const feet = sceneToScreen(placed.x, placed.y + 1);
      const w = ACTOR_SHADOW_RX * 2 * activeScale;
      const h = ACTOR_SHADOW_RY * 2 * activeScale;
      dc.ellipse(feet.x, feet.y + 1, w / 2, h / 2, 0, 0, Math.PI * 2);
      dc.fill();
    }
    dc.restore();
  }

  function drawHeldProp(def, layers, t) {
    if (!def.heldProp || def.x == null || def.y == null) return;
    try {
      let body;
      for (const name of [...layers].reverse()) {
        body = resolveAsset(spriteManifest, name, { frameIndex: assetFrameIndex(spriteManifest, name, t, def.frameIndex) });
        if (body.handPoint) break;
      }
      const hp = handPointScene(body, def.x, def.y);
      const placeX = hp ? hp.x : def.x;
      const placeY = hp ? hp.y : def.y;
      drawLogicalAsset(def.heldProp, placeX, placeY, {}, def.flip);
      const screen = def.handPropScreen;
      if (screen && def.heldProp === 'handprop.phone') {
        const propSpec = resolveAsset(spriteManifest, def.heldProp, {});
        const { x, y } = placementTopLeft(propSpec, placeX, placeY);
        const dx = screen.dx ?? 1;
        const dy = screen.dy ?? 1;
        const lv = screen.lightVariant || currentLightVariant || 'day';
        drawLogicalAsset(screen.asset || 'prop.photo_plant_tail.tiny', x + dx, y + dy, { lightVariant: lv }, def.flip);
      }
    } catch {
      /* skip */
    }
  }

  function resolveLookPhoneAsset(def, shotDef, t) {
    const asset = String(def?.asset || '');
    if (!asset.includes('look_phone')) return def?.asset;
    const local = shotDef ? t - shotDef.t0 : t;
    return local < 1.2 ? 'lefevre.pose.look_phone.f0' : 'lefevre.pose.look_phone.f1';
  }

  function drawLefevrePhoneGlowOverlay(stageDef, t) {
    if (currentLightVariant !== 'evening' && currentLightVariant !== 'night') return;
    const def = stageDef?.actors?.lefevre;
    if (!def || def.x == null || def.y == null) return;
    const asset = resolveLookPhoneAsset(def, currentShotDef, t);
    if (!String(asset).includes('look_phone')) return;
    try {
      const spec = resolveAsset(spriteManifest, 'lefevre.overlay.phone_glow', {
        lightVariant: currentLightVariant
      });
      if (spec.source === 'file') drawSpec(spec, def.x, def.y, def.flip);
    } catch {
      /* optional overlay */
    }
  }

  function drawActor(name, def, t) {
    if (!def) return;
    const shot = currentShotDef || shotAtTime(t);
    const assetOverride = resolveLookPhoneAsset(def, shot, t);
    const actorDef = actorDrawDef(name, assetOverride && assetOverride !== def.asset
      ? { ...def, asset: assetOverride }
      : def);
    const talking = phase !== 'overlay' && actorIsTalking(name, actorDef, CFG.bubbles, t);
    const layers = resolveActorLayers(spriteManifest, { ...actorDef, actor: actorDef.actor || name }, { time: t, talking });
    const omitBakedContact = actorRestsOnHallwayFloor(actorDef) && !actorIsCat(name, actorDef)
      && (isStairwellSet() || isRooftopSet() || (isKitchenSet() && currentShotDef?.id !== LOCKED_CAFE_SHOT));
    const crispBaked = !!kitchenStageBufferCtx && sh1BakedContactMode() === 'crisp';
    for (const [li, assetName] of layers.entries()) {
      const options = {
        frameIndex: assetFrameIndex(spriteManifest, assetName, t, actorDef.frameIndex),
        // SH1: a baked contact row is drawn at most once per actor (stacked layers would re-blend it), never in crisp mode.
        omitBakedContact: omitBakedContact || li > 0 || crispBaked
      };
      drawLogicalAsset(assetName, actorDef.x, actorDef.y, options, actorDef.flip);
    }
    if (actorIsCat(name, actorDef) && actorDef.x != null && actorDef.y != null) {
      const spec = assetPlacementBox(String(actorDef.asset || layers[0] || 'croissant.sit'), actorDef.x, actorDef.y);
      if (spec) {
        drawnBottoms.push({
          id: 'cat',
          sceneY: actorDef.y - 1,
          left: spec.x + CAT_PAW_COLUMNS[0],
          right: spec.x + CAT_PAW_COLUMNS[CAT_PAW_COLUMNS.length - 1]
        });
      }
    }
    if (actorDef.heldProp) drawHeldProp(actorDef, layers, t);
  }

  function drawExtras(list, t) {
    for (const ex of list) {
      if (ex.type === 'asset' || ex.type === 'sprite') {
        let assetName = ex.asset || ex.sprite;
        if (ex.sequence) {
          const seq = ex.sequence;
          const entry = spriteManifest?.assets?.[assetName];
          const fps = seq.fps ?? entry?.fps ?? 6;
          if (entry?.type === 'sequence') {
            const fi = Math.floor(t * fps) % (entry.frames?.length || 1);
            drawLogicalAsset(assetName, ex.x, ex.y, { frameIndex: fi }, ex.flip);
            continue;
          }
          const fi = Math.floor(t * fps) % seq.frames.length;
          assetName = seq.frames[fi];
        }
        drawLogicalAsset(assetName, ex.x, ex.y, {}, ex.flip);
      }
    }
  }

  function actorUsesTable4Seat(def) {
    const a = def?.asset || '';
    return a.includes('sit_table');
  }

  const KITCHEN_TABLE4_PROP_IDS = new Set(['chair_left', 'chair_right', 'table', 'table_cup', 'table_plate', 'table_milk', 'table_plate_103', 'table_plate_133']);

  function drawKitchenTable4Content(stageDef, t, opts = {}) {
    const { actorsOnly, backgroundOnly, layers, omitPropIds } = opts;
    const skipProp = (id) => omitPropIds?.has(id);
    const tableOnly = layers?.tableOnly;
    const tablePropsOnly = layers?.tablePropsOnly;
    const behindSeatsOnly = layers?.behindSeatsOnly;
    const frontSeatsOnly = layers?.frontSeatsOnly;
    const layerMode = tableOnly || tablePropsOnly || behindSeatsOnly || frontSeatsOnly;
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const table4Ids = KITCHEN_TABLE4_PROP_IDS;
    const behind = () => stageDef.props.filter((pid) => {
      if (table4Ids.has(pid) || skipProp(pid)) return false;
      const p = catalog[pid];
      return p && propLayer(p) === 'behind';
    });
    const front = () => stageDef.props.filter((pid) => {
      if (table4Ids.has(pid) || skipProp(pid)) return false;
      const p = catalog[pid];
      return p && propLayer(p) === 'front';
    });
    if (tableOnly) {
      if (!stageDef.props.includes('table')) return;
      const p = catalog.table;
      const asset = resolvePropAsset(p);
      if (!asset) return;
      try {
        const { x: px, y: py } = propDrawPosition(stageDef, 'table', p);
        drawSpec(resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
      } catch { /* skip */ }
      return;
    }
    if (tablePropsOnly) {
      for (const id of stageDef.props.filter((pid) => /^table_(cup|plate|milk)/.test(pid))) {
        if (!stageDef.props.includes(id)) continue;
        const p = catalog[id];
        const asset = resolvePropAsset(p);
        if (!asset) continue;
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, id, p);
          drawSpec(resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
        } catch { /* skip */ }
      }
      return;
    }
    if (behindSeatsOnly || frontSeatsOnly) {
      const drawSeatActor = (name, def) => {
        if (!def) return;
        drawActorShadow(name, def, t);
        drawActor(name, def, t);
      };
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def || !actorUsesTable4Seat(def)) continue;
        if (behindSeatsOnly && def.y <= 123) drawSeatActor(name, def);
        if (frontSeatsOnly && def.y > 123) drawSeatActor(name, def);
      }
      if (behindSeatsOnly) {
        for (const [name, def] of Object.entries(stageDef.actors)) {
          if (!def || actorUsesTable4Seat(def) || def?.layer !== 'behind') continue;
          drawSeatActor(name, def);
        }
      }
      if (frontSeatsOnly) {
        for (const [name, def] of Object.entries(stageDef.actors)) {
          if (!def || actorUsesTable4Seat(def) || def?.layer === 'behind') continue;
          drawSeatActor(name, def);
        }
      }
      return;
    }
    if (layerMode) return;
    if (!actorsOnly) {
      for (const id of behind()) {
        const p = catalog[id];
        if (!p) continue;
        const asset = resolvePropAsset(p);
        if (!asset) continue;
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, id, p);
          drawSpec(resolveAsset(spriteManifest, asset, { state: propState(p, stageDef, id), lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
          noteDrawnProp(id, propBoxAt(p, px, py), asset);
        } catch { /* skip */ }
      }
      for (const id of ['chair_left', 'chair_right']) {
        if (skipProp(id) || !stageDef.props.includes(id)) continue;
        const p = catalog[id];
        if (!p) continue;
        const asset = resolvePropAsset(p);
        if (!asset) continue;
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, id, p);
          drawSpec(resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
          noteDrawnProp(id, propBoxAt(p, px, py), asset);
        } catch { /* skip */ }
      }
      paintHardContactRows(stageDef, t);
    }
    const drawSeatActor = (name, def) => {
      if (!def) return;
      drawActorShadow(name, def, t);
      drawActor(name, def, t);
    };
    if (!backgroundOnly) {
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def || !actorUsesTable4Seat(def)) continue;
        if (def.y <= 123) drawSeatActor(name, def);
      }
    }
    if (!actorsOnly && stageDef.props.includes('table') && !skipProp('table')) {
      const p = catalog.table;
      const asset = resolvePropAsset(p);
      if (asset) {
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, 'table', p);
          drawSpec(resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
          noteDrawnProp('table', propBoxAt(p, px, py), asset);
        } catch { /* skip */ }
      }
    }
    if (!backgroundOnly) {
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def || !actorUsesTable4Seat(def)) continue;
        if (def.y > 123) drawSeatActor(name, def);
      }
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def || actorUsesTable4Seat(def)) continue;
        if (def?.layer === 'behind') drawSeatActor(name, def);
      }
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def || actorUsesTable4Seat(def) || def?.layer === 'behind') continue;
        drawSeatActor(name, def);
      }
    }
    if (!actorsOnly) {
      for (const id of [...stageDef.props.filter((pid) => /^table_(cup|plate|milk)/.test(pid)), 'pendant']) {
        if (skipProp(id) || !stageDef.props.includes(id)) continue;
        const p = catalog[id];
        const asset = resolvePropAsset(p);
        if (!asset) continue;
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, id, p);
          drawSpec(resolveAsset(spriteManifest, asset, { lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
          noteDrawnProp(id, propBoxAt(p, px, py), asset);
        } catch { /* skip */ }
      }
      for (const id of front()) {
        const p = catalog[id];
        const asset = resolvePropAsset(p);
        if (!asset) continue;
        try {
          const { x: px, y: py } = propDrawPosition(stageDef, id, p);
          drawSpec(resolveAsset(spriteManifest, asset, { state: propState(p, stageDef, id), lightVariant: kitchenAssetLightVariant() }), px, py, p.flip);
          noteDrawnProp(id, propBoxAt(p, px, py), asset);
        } catch { /* skip */ }
      }
    }
  }

  function stageUsesTable4(stageDef) {
    return isKitchenSet() && Object.values(stageDef.actors || {}).some((d) => d && actorUsesTable4Seat(d));
  }

  function preservesAuthoredPropLayout() {
    const id = currentShotDef?.id;
    return PIXEL_LOCK_SHOTS.has(id)
      || id === LOCKED_CAFE_SHOT
      || id === 'w'
      || id === 'n_d11_regard'
      || id === 'co';
  }

  function pixelsStayIdentical() {
    const id = currentShotDef?.id;
    return PIXEL_LOCK_SHOTS.has(id) || id === 'co' || id === 'n_d11_regard';
  }

  /**
   * pot_chez_nous bakes one floor-colored row under the orange base, plus a
   * single orange pixel in that row. The visible bottom is the orange row.
   * The band belongs on the baked row, in the columns under that orange.
   */
  function spriteBakedFloorSole(assetName) {
    const key = `${assetName}|${currentLightVariant || 'day'}`;
    if (bakedSoleCache.has(key)) return bakedSoleCache.get(key);
    let result = null;
    try {
      const spec = resolveAsset(spriteManifest, assetName, { lightVariant: currentLightVariant || 'day' });
      const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
      if (!im) {
        bakedSoleCache.set(key, null);
        return null;
      }
      const sw = spec.frame?.w || spec.w;
      const sh = spec.frame?.h || spec.h;
      if (sh < 2 || sw < 1) {
        bakedSoleCache.set(key, null);
        return null;
      }
      const sx = spec.frame?.x || 0;
      const sy = spec.frame?.y || 0;
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
      const d = g.getImageData(0, 0, sw, sh).data;
      const row = (y) => {
        const entity = [];
        let n = 0;
        for (let x = 0; x < sw; x += 1) {
          const i = (y * sw + x) * 4;
          if (d[i + 3] < 16) continue;
          n += 1;
          const rgb = `${d[i]},${d[i + 1]},${d[i + 2]}`;
          if (!BAKED_FLOOR_RGB.has(rgb)) entity.push(x);
        }
        return { n, entity };
      };
      const bottom = row(sh - 1);
      const above = row(sh - 2);
      if (bottom.n > 0 && bottom.entity.length <= 1 && above.entity.length >= 2) {
        const skip = new Set(bottom.entity);
        const xs = above.entity.filter((x) => !skip.has(x));
        if (xs.length) result = { localY: sh - 2, xs };
      }
    } catch {
      result = null;
    }
    bakedSoleCache.set(key, result);
    return result;
  }

  function noteDrawnProp(id, box, asset) {
    if (!id || !box) return;
    drawnPropIds.add(id);
    const sole = isRooftopSet() && asset && !pixelsStayIdentical() ? spriteBakedFloorSole(asset) : null;
    const soleXs = sole ? sole.xs.map((x) => box.x + x) : null;
    const soleY = sole ? box.y + sole.localY : null;
    drawnPropBoxes.set(id, {
      left: box.x,
      top: box.y,
      w: box.w,
      h: box.h,
      bottom: box.y + box.h,
      soleY,
      soleXs
    });
    const standing = FLOOR_STANDING[id] || FLOOR_STANDING[asset];
    if (soleXs && soleY != null) {
      drawnBottoms.push({ id, sceneY: soleY, left: soleXs[0], right: soleXs[soleXs.length - 1] });
    } else if (standing?.bakedContact) {
      const xs = standing.soleXs || [0, box.w - 1];
      drawnBottoms.push({
        id,
        sceneY: box.y + box.h - 2,
        left: box.x + xs[0],
        right: box.x + xs[xs.length - 1]
      });
    } else {
      drawnBottoms.push({
        id,
        sceneY: box.y + box.h - 1,
        left: box.x,
        right: box.x + box.w - 1
      });
    }
    for (const item of BAKED_RESTING[id] || []) {
      drawnBottoms.push({
        id: item.id,
        sceneY: box.y + item.sole,
        left: box.x + item.x0,
        right: box.x + item.x1
      });
    }
  }

  function contactParentId(id) {
    const key = String(id || '');
    const cut = key.indexOf(':');
    return cut === -1 ? key : key.slice(0, cut);
  }

  /**
   * A band is painted only for a prop this frame actually drew, and a
   * floor band has to land on the floor under that sprite. A contact
   * copied from the set list for a prop that was not drawn (the cafe
   * fridge on a night shot, a table whose box never reached the canvas)
   * is dropped. Shots whose pixels are locked keep their existing bands.
   */
  function bandBelongsToDrawnProp(c) {
    if (pixelsStayIdentical()) return c.band;
    const parent = contactParentId(c.id);
    if (!drawnPropIds.has(parent) && !drawnPropIds.has(c.id)) return null;
    const floor = CFG.room?.floorTop ?? 136;
    const baked = String(c.id).includes(':');
    if (!baked && c.floorStanding && (c.band.top < floor - 1 || c.band.top > floor + 1)) return null;
    const box = drawnPropBoxes.get(parent) || drawnPropBoxes.get(c.id);
    if (!box || baked) return c.band;
    let band = c.band;
    if (box.soleY != null && box.soleXs?.length && Math.abs(band.top - (box.soleY + 1)) <= 1) {
      const xs = box.soleXs.filter((x) => x >= band.left && x <= band.left + band.w - 1);
      if (!xs.length) return null;
      band = { ...band, left: xs[0], top: box.soleY + 1, w: xs[xs.length - 1] - xs[0] + 1 };
    }
    const left = Math.max(band.left, box.left);
    const right = Math.min(band.left + band.w - 1, box.left + box.w - 1);
    if (right < left) return null;
    if (band.top < box.bottom - 1 || band.top > box.bottom + 1) return null;
    return { ...band, left, w: right - left + 1 };
  }

  // PX-ROW (Pixel rule): one hard opaque stage-px row directly under each grounded sprite's bottom opaque row, only across
  // its feet/base columns, in the LUT colour of the surface beneath. Painted on the room surface (pre-grade, so night grades it
  // like the floor). Exempt: desk_bare lid, walls, unlisted-wall-like surfaces handled by the LUT; occluders draw over it.
  const HARD_ROW_LUT = [
    { rgb: [0x22, 0x30, 0x3a], row: null },            // desk_bare lid: exempt
    { rgb: [196, 196, 204], row: null },               // desk_bare lid top (prop_desk_bare lid plate): exempt
    { rgb: [0x88, 0x59, 0x39], row: '#4a3328' },       // any #885939 surface
    { rgb: [177, 146, 110], row: '#885939' },          // light wood floor #b2936e / d3 floor / d2 table top
    { rgb: [160, 132, 117], row: '#885939' },          // d1 desk
    { rgb: [111, 92, 69], row: '#4a3328' },            // dark wood
    { rgb: [104, 85, 65], row: '#4a3328' },            // floor stripe dark
    { rgb: [165, 136, 104], row: '#885939' }           // floor stripe light
  ];
  const HARD_ROW_FALLBACK = '#3b2a20';
  let hardContactRowIds = new Set();
  const feetColumnCache = new Map();
  function hardRowColourFor(rgb, listedOnly = false) {
    if (!rgb || rgb[3] < 200) return null;
    if (kitchenBareWallRgb && Math.abs(rgb[0] - kitchenBareWallRgb[0]) <= 4 && Math.abs(rgb[1] - kitchenBareWallRgb[1]) <= 4
      && Math.abs(rgb[2] - kitchenBareWallRgb[2]) <= 4) return null; // wall: exempt
    for (const e of HARD_ROW_LUT) {
      if (Math.abs(rgb[0] - e.rgb[0]) <= 3 && Math.abs(rgb[1] - e.rgb[1]) <= 3 && Math.abs(rgb[2] - e.rgb[2]) <= 3) return e.row;
    }
    return listedOnly ? null : HARD_ROW_FALLBACK;
  }
  /** Bottom opaque row (alpha>=200) of a sprite frame and the columns it covers (the feet/base). */
  function spriteFeetColumns(spec) {
    const im = spec.source === 'file' ? fileImages[spec.file] : atlasImages[spec.atlas];
    if (!im) return null;
    const fr = spec.source === 'atlas' ? spec.frame : { x: 0, y: 0, w: im.width, h: im.height };
    if (!fr) return null;
    const key = `${spec.file || spec.atlas}:${fr.x},${fr.y},${fr.w},${fr.h}`;
    if (feetColumnCache.has(key)) return feetColumnCache.get(key);
    const c = document.createElement('canvas');
    c.width = fr.w; c.height = fr.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    const px = g.getImageData(0, 0, fr.w, fr.h).data;
    let out = null;
    for (let y = fr.h - 1; y >= 0 && !out; y--) {
      const cols = [];
      for (let x = 0; x < fr.w; x++) if (px[(y * fr.w + x) * 4 + 3] >= 200) cols.push(x);
      if (cols.length) out = { row: y, cols, srcW: fr.w, srcH: fr.h };
    }
    feetColumnCache.set(key, out);
    return out;
  }
  function groundedSpritePlacements(stageDef, t) {
    const out = [];
    const lv = kitchenAssetLightVariant();
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      const placed = actorDrawDef(name, def);
      if (!placed || placed.x == null || placed.y == null) continue;
      try {
        const layers = resolveActorLayers(spriteManifest, { ...placed, actor: placed.actor || name }, { time: t, talking: false });
        const asset = layers[0];
        const spec = resolveAsset(spriteManifest, asset, { frameIndex: assetFrameIndex(spriteManifest, asset, t, placed.frameIndex), lightVariant: lv });
        out.push({ id: `actor:${name}`, spec, x: placed.x, y: placed.y, flip: !!placed.flip });
      } catch { /* unresolved actor: strict mode reports it at draw time */ }
    }
    for (const d of stageDef.sitcomOverlay?.draws || []) {
      if (d.kind !== 'prop' && d.kind !== 'cat') continue;
      if (d.kind === 'cat' && d.ownedBy === 'actor') continue;
      try {
        const fi = d.kind === 'cat' ? sequenceFrameIndex(spriteManifest, d.asset, t) : undefined;
        const spec = resolveAsset(spriteManifest, d.asset, { frameIndex: fi, lightVariant: lv });
        const pos = d.kind === 'cat' ? bandAnchorOverrides?.cat : null;
        out.push({ id: `overlay:${d.asset}`, spec, x: pos?.x ?? d.x, y: pos?.y ?? d.y, flip: !!d.flip, contactSpan: d.contactSpan || null });
      } catch { /* strict mode reports it at draw time */ }
    }
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    // props: every drawn set piece; a prop row is only painted on a LUT-listed surface (propsListedOnly), so wall-hung pieces and
    // small items on unlisted counters stay row-free while floor/desk/table-standing furniture gets its row.
    for (const id of stageDef.props || []) {
      if ((stageDef.omitPropIds || []).includes(id)) continue;
      const p = catalog[id];
      const asset = p && resolvePropAsset(p);
      if (!asset) continue;
      try {
        const spec = resolveAsset(spriteManifest, asset, { state: propState(p, stageDef, id), lightVariant: lv });
        const { x, y } = propDrawPosition(stageDef, id, p);
        out.push({ id, spec, x, y, flip: !!p.flip, listedOnly: true });
      } catch { /* unresolved prop */ }
    }
    return out;
  }
  function paintHardContactRows(stageDef, t) {
    if (globalThis.__noPxRow) return;
    const dc = dctx();
    const T = dc.getTransform();
    const items = groundedSpritePlacements(stageDef, t);
    const rows = [], report = [];
    for (const it of items) {
      const feet = spriteFeetColumns(it.spec);
      if (!feet) continue;
      const { x: left, y: top, w, h } = placementTopLeft(it.spec, it.x, it.y, it.flip);
      const sx = w / feet.srcW, sy = h / feet.srcH;
      const rowY = Math.round(top + (feet.row + 1) * sy);
      const xs = it.contactSpan
        ? Array.from({ length: it.contactSpan[1] - it.contactSpan[0] + 1 }, (_, i) => it.contactSpan[0] + i)
        : [...new Set(feet.cols.map((c) => Math.floor(left + (it.flip ? feet.srcW - 1 - c : c) * sx)))];
      const paints = [];
      let exemptCols = 0, onCanvas = 0;
      for (const x of xs) {
        const p = T.transformPoint(new DOMPoint(x + 0.5, rowY + 0.5));
        if (p.x < 0 || p.y < 0 || p.x >= dc.canvas.width || p.y >= dc.canvas.height) continue;
        onCanvas++;
        const px = dc.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
        const col = hardRowColourFor(px, it.listedOnly);
        if (col) paints.push([x, col, [px[0], px[1], px[2]]]); else exemptCols++;
      }
      report.push({ id: it.id, rowY, cols: onCanvas, painted: 0, exemptCols, listedOnly: !!it.listedOnly, _p: paints });
      if (paints.length) { rows.push(paints.map(([x, col, surf]) => ({ x, y: rowY, col, surf }))); hardContactRowIds.add(it.id); }
    }
    // sample everything first, then paint (a row never recolours a neighbour's sample)
    dc.save();
    dc.globalCompositeOperation = 'source-over';
    dc.globalAlpha = 1;
    // night/evening grade: remember the row pixels in buffer space so gradeLayerCanvas keeps the LUT darkening RELATIVE to the
    // graded surface (the grade's additive light otherwise lifts the row towards the floor: 8% instead of 35% at night)
    const cv = dc.canvas;
    if (cv.__hardRowsT !== t) { cv.__hardRows = []; cv.__hardRowsT = t; }
    for (const r of rows) for (const { x, y, col, surf } of r) {
      const p = T.transformPoint(new DOMPoint(x + 0.5, y + 0.5));
      cv.__hardRows.push({ bx: Math.floor(p.x), by: Math.floor(p.y), col: col.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)), surf });
    }
    for (const r of rows) for (const { x, y, col } of r) { dc.fillStyle = globalThis.__pxRowSentinel ? '#ff00ff' : col; dc.fillRect(x, y, 1, 1); }  // sentinel: test-only occlusion probe
    dc.restore();
    lastHardContactRows = rows.flat();
    // painted = columns whose canvas pixel reads back as the exact opaque LUT colour (not merely 'decided to paint')
    for (const e of report) {
      e.px = [];
      for (const [x, col, surf] of e._p) {
        const p = T.transformPoint(new DOMPoint(x + 0.5, e.rowY + 0.5));
        const q = T.transformPoint(new DOMPoint(x + 0.5, e.rowY + 1.5));
        e.px.push({ cx: p.x, cy: p.y, cyBelow: q.y, col, surf });
        const d = dc.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
        const want = col.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16));
        if (globalThis.__pxRowSentinel) { if (d[3] === 255 && d[0] === 255 && d[1] === 0 && d[2] === 255) e.painted++; continue; }
        if (d[3] === 255 && d[0] === want[0] && d[1] === want[1] && d[2] === want[2]) e.painted++;
      }
      delete e._p;
    }
    // read-back for the d1-d11 PX-ROW test (tests/stg22c/pxrow_d1_11.mjs): per grounded sprite, columns on canvas / painted / exempt
    (globalThis.__pxRowReport ||= {})[currentShotDef?.id ?? '_'] = report;   // bounded: one entry per shot id
    globalThis.__pxRowLast = { shot: currentShotDef?.id ?? null, cw: dc.canvas.width, ch: dc.canvas.height, canvasId: dc.canvas.id || null, items: report };
  }
  let lastHardContactRows = [];
  function drawContactShadows() {
    const list = bandAnchorOverrides?.contacts;
    if (!list?.length) return;
    const dc = dctx();
    const [r, g, b] = CONTACT_SHADOW_RGB;
    const defer = shouldDeferContactMultiply();
    for (const c of list) {
      if (!c.paint || !c.band) continue;
      if (hardContactRowIds.has(c.id)) continue; // PX-ROW: the hard contact row replaces the soft band
      const band = bandBelongsToDrawnProp(c);
      if (!band) continue;
      c.band = band;
      const keepLockedGray = PIXEL_LOCK_SHOTS.has(currentShotDef?.id)
        || (currentShotDef?.id === 'co' && currentLightVariant === 'day');
      const gray = keepLockedGray
        ? (Number.isFinite(c.multiplyGray) ? c.multiplyGray : floorDarkenGray())
        : 160;
      if (defer) {
        queuedFloorContacts.push({
          kind: 'band',
          id: c.id,
          gray,
          left: band.left,
          top: band.top,
          w: band.w,
          h: band.h,
          omitColumns: c.omitColumns,
          floorStanding: !!c.floorStanding,
          raised: band.top < (CFG.room?.floorTop ?? 136)
        });
        continue;
      }
      noteContactPaint({
        kind: 'band',
        id: c.id,
        gray,
        left: band.left,
        top: band.top,
        w: band.w,
        h: band.h,
        floorStanding: !!c.floorStanding,
        raised: c.band.top < (CFG.room?.floorTop ?? 136)
      });
      dc.save();
      const multiply = keepLockedGray ? Number.isFinite(c.multiplyGray) : true;
      if (multiply) {
        dc.globalCompositeOperation = 'multiply';
        dc.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      } else {
        dc.fillStyle = `rgba(${r}, ${g}, ${b}, ${CONTACT_SHADOW_ALPHA})`;
      }
      const omit = new Set(c.omitColumns || []);
      const right = band.left + band.w - 1;
      let x = band.left;
      while (x <= right) {
        if (omit.has(x)) {
          x += 1;
          continue;
        }
        let end = x;
        while (end + 1 <= right && !omit.has(end + 1)) end += 1;
        dc.fillRect(x, band.top, end - x + 1, band.h);
        x = end + 1;
      }
      dc.restore();
    }
  }

  function drawSceneContent(t, shot, opts = {}) {
    if (!opts.actorsOnly) catDrawLog = [];
    const { actorsOnly, backgroundOnly, omitPropIds } = opts;
    const stageDef = getStageForShot(shot);
    const mergedOmit = new Set([...(omitPropIds || []), ...(stageDef.omitPropIds || [])]);
    if (stageUsesTable4(stageDef)) {
      drawKitchenTable4Content(stageDef, t, opts);
      if (!actorsOnly) drawContactShadows();
      return;
    }
    if (!actorsOnly) {
      drawProps(stageDef, 'behind', mergedOmit);
      drawSitcomOverlay(stageDef, t, 'behind');
      drawExtras(stageDef.extras, t);
      paintHardContactRows(stageDef, t);
    }
    if (!backgroundOnly) {
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (def?.layer === 'behind') {
          drawActorShadow(name, def, t);
          drawActor(name, def, t);
        }
      }
      drawSitcomOverlay(stageDef, t, 'between');
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (def?.layer !== 'behind') {
          drawActorShadow(name, def, t);
          drawActor(name, def, t);
        }
      }
    }
    if (!actorsOnly) {
      drawProps(stageDef, 'front', mergedOmit);
      // contact shadows lie on the floor: under the front overlay set-pieces (box_cat front), never painted over them
      drawContactShadows();
      if (!opts.noFrontOverlay) drawSitcomOverlay(stageDef, t, 'front');
    }
    if (stageDef.uiText && !actorsOnly && !backgroundOnly) {
      const pos = stageDef.uiTextPos;
      const text = String(stageDef.uiText);
      const tw = text.length * 2.4 + 4;
      const th = 5;
      const px = pos.x;
      const py = pos.y;
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.fillRect(px, py - th, tw, th);
      ctx.fillStyle = '#22303a';
      ctx.fillRect(px, py - th, tw, 1);
      ctx.fillStyle = '#1a2030';
      ctx.font = '3px monospace';
      ctx.fillText(text, px + 2, py - 2);
      ctx.restore();
    }
  }

  function renderSceneLayer(crop, t, shotDef) {
    lastBandArt = null;
    const warm = !!(shotDef && shotDef.warmTint);
    queuedFloorContacts = [];
    hardContactRowIds = new Set();
    lastContactPaint = [];
    drawnPropIds = new Set();
    drawnPropBoxes = new Map();
    drawnBottoms = [];
    currentShotDef = shotDef;
    currentLightVariant = shotLightVariant(shotDef);
    canonicalBandCover = !!(floorStripEnabled() && (isKitchenSet() || isRooftopSet() || isStairwellSet()));
    if (shotDef?.subshot && sitcomStrictMode()) preflightSubshotInserts(shotDef.subshot.beat);
    layoutCrop(crop, shotDef, t);
    crop = activeCrop;
    fillFrameAmbient(warm);
    if (kitchenUsesCanonicalStageRender(shotDef)) {
      const stageCanvas = renderKitchenSoirExtendedBuffer(t, shotDef, crop);
      const wallPad = lastSoirWallPad;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-crop.x, -crop.y);
      ctx.drawImage(stageCanvas, 0, -wallPad);
      ctx.restore();
      lastBandArt = { canvas: stageCanvas, yOff: wallPad, crop: { ...crop }, k: activeScale, ox: activeOx, oy: activeOy };
      paintSetBandFloorExtension();
    } else if (isStairwellSet()) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-crop.x, -crop.y);
      bandCoverDeferAssets = new Set(['prop.radiator']);
      drawStairwellLayerScenery();
      drawFloorTileToCoverCrop();
      drawCanonicalFloorStrip();
      const deferredLanding = bandCoverDeferAssets;
      bandCoverDeferAssets = null;
      if (deferredLanding) {
        for (const name of deferredLanding) {
          const moved = bandAnchorOverrides?.assets?.[name];
          if (moved) drawLogicalAsset(name, moved.x, moved.y);
        }
      }
      drawSceneContent(t, shotDef);
      ctx.restore();
      if (currentLightVariant === 'evening' || currentLightVariant === 'night') {
        applyKitchenLightGradeScreenStrip(activeOy, activeOy + stageH);
        continueScreenFloorBelowAttach();
      }
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-activeCrop.x, -activeCrop.y);
      paintQueuedFloorContacts(ctx);
      drawStairwellLayerUngraded(t, shotDef);
      ctx.restore();
      paintStairwellBandFloor();
      if (shotDef?.desaturate) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = `rgba(90, 90, 98, ${shotDef.desaturate})`;
        ctx.fillRect(0, 0, stageW, stageH);
        ctx.restore();
      }
    } else if (isRooftopSet()) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-crop.x, -crop.y);
      drawRooftopUngradedScenery();
      drawCanonicalFloorStrip();
      drawSceneContent(t, shotDef);
      ctx.restore();
      if (currentLightVariant === 'evening' || currentLightVariant === 'night') {
        applyKitchenLightGradeScreenStrip(activeOy, activeOy + stageH);
        continueScreenFloorBelowAttach();
      }
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-activeCrop.x, -activeCrop.y);
      paintQueuedFloorContacts(ctx);
      drawRooftopStringLightsEmitter();
      ctx.restore();
      paintRooftopBandFloor();
    } else {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-crop.x, -crop.y);
      drawBackdrop();
      if (!isKitchenSet()) {
        paintCropFloor(warm);
        tintVisibleWallFloor(warm);
      } else {
        drawCanonicalFloorStrip();
      }
      drawSceneContent(t, shotDef);
      if (isKitchenSet() && currentLightVariant === 'day') {
        applyKitchenLightGrade(crop);
      }
      ctx.restore();
      if (isKitchenSet()) paintSetBandFloorExtension();
    }
    canonicalBandCover = false;
  }

  function relationCropAt(shotDef, t) {
    const rcs = shotDef?.relationCrops; if (!Array.isArray(rcs) || !rcs.length) return null;
    const b = activeBubbles(t).slice(-1)[0]; if (!b || b.step == null) return null;
    const g = rcs.find((x) => x.beat === b.beat && x.steps.includes(b.step)); if (!g) return null;
    return { k: g.k, viewX: g.viewX, viewY: g.viewY, relation: { ref: g.ref, props: g.props, steps: g.steps, rect: g.rect, speakerIn: g.speakerIn } };
  }
  function activeBubbles(t) {
    return (CFG.bubbles || []).filter((b) => t >= b.t0 && t < b.t1);
  }

  // ONE resolved actor position (CTO fix15): the bubble anchor, the speaker head and the gate bbox all read this, computed
  // once per sub-shot AFTER band overrides (actorDrawDef) and under the ACTIVE camera crop. Before, the bubble used a
  // per-character scene offset (seated noe -38) while the gate used the raw stage def -> d2 b_payoff head x8 vs body x248.
  const resolvedActorMemo = new Map();
  function resolvedActorScreen(id, def, t = sceneT) {
    if (!def) return null;
    const staged = actorDrawDef(id, def);
    if (!staged || staged.x == null || staged.y == null) return null;
    const shot = shotAtTime(t);
    const key = [shot?.id, activeCrop?.x, activeCrop?.y, activeScale, activeOx, activeOy, id, staged.x, staged.y, staged.asset, staged.mirror, staged.facing].join('|');
    if (resolvedActorMemo.has(key)) return resolvedActorMemo.get(key);
    const box = actorSceneBounds(spriteManifest, id, staged, t);
    let out = null;
    if (box) {
      const tl = sceneToScreen(box.x, box.y), br = sceneToScreen(box.x + box.w, box.y + box.h);
      const bbox = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
      const head = actorHeadFromMask(id, staged, t, bbox);
      const inside = head && head.headCenterX >= bbox.x && head.headCenterX <= bbox.x + bbox.w;
      out = {
        staged,
        bbox,
        headCenterX: inside ? head.headCenterX : bbox.x + bbox.w / 2,
        speakerTop: inside ? head.speakerTop : bbox.y,
        speakerBottom: bbox.y + bbox.h,
        speakerLeft: bbox.x,
        speakerRight: bbox.x + bbox.w,
        bboxCss: inside ? head.bboxCss : bbox
      };
    }
    if (resolvedActorMemo.size > 512) resolvedActorMemo.clear();
    resolvedActorMemo.set(key, out);
    return out;
  }

  function actorScreenBounds(id, def, t) {
    const ra = resolvedActorScreen(id, def, t);
    if (ra) return { speakerTop: ra.bbox.y, speakerLeft: ra.speakerLeft, speakerRight: ra.speakerRight, speakerBottom: ra.speakerBottom, headCenterX: ra.headCenterX };
    const staged = actorDrawDef(id, def);
    const asset = resolveActorLayers(spriteManifest, { ...staged, actor: staged.actor || id }, { time: t, talking: true })[0];
    if (!asset) return {};
    const spec = resolveAsset(spriteManifest, asset, { frameIndex: assetFrameIndex(spriteManifest, asset, t, staged.frameIndex) });
    const rect = placementTopLeft(spec, staged.x, staged.y);
    const topLeft = sceneToScreen(rect.x, rect.y);
    const wScreen = rect.w * activeScale;
    const hScreen = (spec.h ?? rect.h) * activeScale;
    return {
      speakerTop: topLeft.y,
      speakerLeft: topLeft.x,
      speakerRight: topLeft.x + wScreen,
      speakerBottom: topLeft.y + hScreen,
      headCenterX: topLeft.x + wScreen / 2
    };
  }

  function resolveBubbleSpeaker(b, t) {
    const speakerLineId = b.actor || b.anchor;
    if (!speakerLineId) return null;
    const stageDef = getStageForShot(shotAtTime(t));
    if (stageDef.actors[speakerLineId]) {
      return {
        stageActorKey: speakerLineId,
        speakerLineId,
        characterId: actorId(stageDef.actors[speakerLineId].character || speakerLineId),
        def: stageDef.actors[speakerLineId]
      };
    }
    for (const [id, def] of Object.entries(stageDef.actors)) {
      if (!def) continue;
      if (actorId(id) === actorId(speakerLineId) || actorId(def.character) === actorId(speakerLineId)) {
        return {
          stageActorKey: id,
          speakerLineId,
          characterId: actorId(def.character || id),
          def
        };
      }
    }
    return null;
  }

  function actorHeadFromMask(stageKey, def, t, clipCss = null) {
    if (!def) return null;
    const dev = dpr;
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mctx = mask.getContext('2d');
    const color = { r: 220, g: 40, b: 40 };
    mctx.imageSmoothingEnabled = false;
    mctx.setTransform(dev, 0, 0, dev, 0, 0);
    mctx.fillStyle = 'rgb(0, 0, 0)';
    mctx.fillRect(0, 0, stageW, stageH);
    mctx.save();
    mctx.translate(activeOx, activeOy);
    mctx.scale(activeScale, activeScale);
    mctx.translate(-activeCrop.x, -activeCrop.y);
    drawActorMaskPixels(mctx, stageKey, def, t, color);
    mctx.restore();
    if (clipCss) { // only the actor's own resolved sprite rect counts (stray far layers must not drag the head)
      const cx0 = Math.max(0, Math.floor((clipCss.x - 1) * dev)), cx1 = Math.min(mask.width, Math.ceil((clipCss.x + clipCss.w + 1) * dev));
      mctx.save(); mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = 'rgb(0, 0, 0)';
      mctx.fillRect(0, 0, Math.max(0, cx0), mask.height); mctx.fillRect(cx1, 0, Math.max(0, mask.width - cx1), mask.height); mctx.restore();
    }
    const snap = mctx.getImageData(0, 0, mask.width, mask.height);
    const box = scanColorBBox(snap, mask.width, mask.height, color.r, color.g, color.b, 48);
    if (!box) return null;
    const topRows = Math.max(1, Math.ceil(box.h * 0.16));
    const yEnd = box.y + topRows;
    const xEnd = box.x + Math.ceil(box.w * 0.28);
    const d = snap.data;
    let minX = Infinity;
    let maxX = -Infinity;
    let sumX = 0;
    let n = 0;
    for (let y = box.y; y < yEnd; y++) {
      for (let x = box.x; x < xEnd; x++) {
        const i = (y * mask.width + x) * 4;
        if (d[i + 3] < 128) continue;
        if (Math.abs(d[i] - color.r) + Math.abs(d[i + 1] - color.g) + Math.abs(d[i + 2] - color.b) > 48) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        sumX += x;
        n++;
      }
    }
    const headCenterXCss = n > 0
      ? (minX + maxX) / 2 / dev
      : box.x / dev + (box.w / dev) * 0.12;
    return {
      headCenterX: headCenterXCss,
      speakerTop: box.y / dev,
      speakerBottom: (box.y + box.h) / dev,
      bboxCss: { x: box.x / dev, y: box.y / dev, w: box.w / dev, h: box.h / dev }
    };
  }

  function speakerHeadCss(who, t = sceneT) {
    const resolved = resolveBubbleSpeaker({ actor: who, anchor: who }, t);
    if (!resolved) return null;
    if (bubbleUsesMaskHead(resolved.speakerLineId, t)) {
      const head = actorMaskBubbleHead(resolved.stageActorKey, resolved.def, t, resolved.characterId);
      if (!head) return null;
      return {
        ...head,
        speakerTopBand: head.speakerTop + bubbleBandH,
        stageActorKey: resolved.stageActorKey,
        speakerLineId: resolved.speakerLineId,
        characterId: resolved.characterId
      };
    }
    const bounds = actorScreenBounds(resolved.stageActorKey, resolved.def, t);
    if (bounds.headCenterX == null) return null;
    return {
      headCenterX: bounds.headCenterX,
      speakerTop: bounds.speakerTop,
      speakerTopBand: bounds.speakerTop + bubbleBandH,
      bboxCss: bounds.bboxCss,
      stageActorKey: resolved.stageActorKey,
      speakerLineId: resolved.speakerLineId,
      characterId: resolved.characterId
    };
  }

  function bubbleUsesMaskHead(speakerLineId, t = sceneT) {
    const id = actorId(speakerLineId);
    const shotId = shotAtTime(t)?.id;
    if (shotId === 'd11_mar_chat') return false;
    if (isRooftopSet() && (id === 'noe' || id === 'camille')) return false;
    return id === 'camille' || id === 'noe';
  }

  function marChatMartinHeadCenterCss(def, t) {
    const crop = activeCrop;
    const scale = activeScale;
    const box = actorSceneBounds(spriteManifest, 'martin', def, t);
    const anchorStageX = def.x;
    const bboxCenterStageX = box ? box.x + box.w / 2 : def.x;
    const headStageX = anchorStageX;
    const headCenterX = activeOx + (headStageX - crop.x) * scale;
    const formulaPart = ((anchorStageX - crop.x) * (crop.fixedScale ?? scale * dpr)) / dpr;
    return {
      headCenterX,
      headStageX,
      anchorStageX,
      bboxCenterStageX,
      stageX: def.x,
      cropX: crop.x,
      fixedScale: crop.fixedScale,
      dpr,
      activeScale,
      activeOx,
      formulaPartCss: formulaPart + activeOx
    };
  }

  function maskSpeakerHairCenterX(bounds) {
    const w = bounds.speakerRight - bounds.speakerLeft;
    return bounds.speakerLeft + Math.min(14, Math.max(6, w * 0.05));
  }

  function actorMaskBubbleHead(stageKey, def, t, characterId) {
    const ra = resolvedActorScreen(stageKey, def, t);
    if (!ra) return null;
    return { headCenterX: ra.headCenterX, speakerTop: ra.speakerTop, speakerBottom: ra.speakerBottom,
      speakerLeft: ra.speakerLeft, speakerRight: ra.speakerRight, bboxCss: ra.bboxCss };
  }

  function laptopScreenBubblePoint(t) {
    const anchors = { ...CFG.bubbleAnchors, ...shotAtTime(t).bubbleAnchors };
    const lap = anchors.laptop;
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const prop = catalog.laptop;
    const sx = lap?.x ?? (prop ? prop.x - 4 : 166);
    const sy = lap?.y ?? (prop ? prop.y - 6 : 110);
    const pt = sceneToBubbleScreen(sx, sy);
    const scenePt = sceneToScreen(sx, sy);
    return {
      off: false,
      headCenterX: pt.x,
      speakerTop: pt.y + bubbleBandH,
      screenBubble: true,
      laptopSceneX: scenePt.x,
      laptopSceneY: scenePt.y,
      tailToLaptop: false
    };
  }

  function bubbleAnchor(b, t) {
    if (b.anchor === 'narrator' || b.kind === 'narrator') return { off: true };
    const soirMarChatPresent = kitchenMarChatEveningShot(shotAtTime(t));
    if ((b.kind === 'screen' || b.anchor === 'laptop') && !soirMarChatPresent) {
      return laptopScreenBubblePoint(t);
    }
    const resolved = resolveBubbleSpeaker(b, t);
    if (resolved) {
      const shotId = shotAtTime(t)?.id;
      const charId = actorId(resolved.characterId || resolved.speakerLineId);
      if (shotId === 'd11_mar_chat' && (charId === 'martin' || charId === 'madame_martin')
        && !kitchenMarChatEveningShot(shotAtTime(t))) {
        const head = marChatMartinHeadCenterCss(resolved.def, t);
        return {
          off: false,
          headCenterX: head.headCenterX,
          speakerTop: sceneToScreen(resolved.def.x, resolved.def.y - 22).y + bubbleBandH,
          speakerLineId: resolved.speakerLineId,
          stageActorKey: resolved.stageActorKey,
          characterId: resolved.characterId,
          tailFormula: head
        };
      }
      if (shotId === 'd11_mar_chat' && kitchenMarChatEveningShot(shotAtTime(t))
        && (charId === 'martin' || charId === 'madame_martin')) {
        const head = actorMaskBubbleHead(resolved.stageActorKey, resolved.def, t, resolved.characterId);
        if (head?.headCenterX != null) {
          return {
            off: false,
            headCenterX: head.headCenterX,
            speakerTop: head.speakerTop + bubbleBandH,
            speakerLineId: resolved.speakerLineId,
            stageActorKey: resolved.stageActorKey,
            characterId: resolved.characterId,
            bboxCss: head.bboxCss
          };
        }
      }
      if (bubbleUsesMaskHead(resolved.speakerLineId, t)) {
        const head = actorMaskBubbleHead(resolved.stageActorKey, resolved.def, t, resolved.characterId);
        if (head?.headCenterX != null) {
          return {
            off: false,
            headCenterX: head.headCenterX,
            speakerTop: head.speakerTop + bubbleBandH,
            speakerBottom: head.speakerBottom != null ? head.speakerBottom + bubbleBandH : undefined,
            speakerLeft: head.speakerLeft,
            speakerRight: head.speakerRight,
            bboxCss: head.bboxCss,
            speakerLineId: resolved.speakerLineId,
            stageActorKey: resolved.stageActorKey,
            characterId: resolved.characterId
          };
        }
      }
      const bounds = actorScreenBounds(resolved.stageActorKey, resolved.def, t);
      if (bounds.headCenterX != null) {
        return {
          off: false,
          headCenterX: bounds.headCenterX,
          speakerTop: bounds.speakerTop + bubbleBandH,
          speakerLeft: bounds.speakerLeft,
          speakerRight: bounds.speakerRight,
          speakerLineId: resolved.speakerLineId,
          stageActorKey: resolved.stageActorKey,
          characterId: resolved.characterId
        };
      }
    }
    const who = b.actor || b.anchor;
    const anchors = { ...CFG.bubbleAnchors, ...shotAtTime(t).bubbleAnchors };
    const anchorKey = who && Object.keys(anchors).find((id) => actorId(id) === actorId(who));
    if (anchorKey) {
      const a = anchors[anchorKey];
      return { off: false, ...sceneToBubbleScreen(a.x, a.y) };
    }
    if (typeof b.x === 'number') return { off: false, ...sceneToBubbleScreen(b.x, b.y) };
    return { off: true };
  }

  // wrapLines / wrapLinesBySentences: ./bubble-wrap.js (French punctuation-safe)

  function bandBubbleTextSize(lines, measure, padX, lineH, padY) {
    const textW = Math.min(
      Math.max(...lines.map(measure), 40)
    );
    const bw = textW + padX * 2;
    const bh = lines.length * lineH + padY * 2;
    return { bw, bh, textW };
  }

  function kitchenBubbleFrameMaxW() {
    return Math.min(220, stageW - 32);
  }

  /** Greedy word wrap to inner width, then size bubble to wrapped lines (never wider than frame max). */
  function kitchenBubbleTextLines(text, measure, padX, lineH, padY, innerMaxOverride, maxLines = 4) {
    const frameMax = kitchenBubbleFrameMaxW();
    const innerMax = innerMaxOverride ?? (frameMax - padX * 2);
    const lines = wrapLinesBySentences(text, innerMax, measure, maxLines);
    const textW = Math.min(innerMax, Math.max(...lines.map(measure), 24));
    const bw = Math.min(frameMax, textW + padX * 2);
    const bh = lines.length * lineH + padY * 2;
    return { lines, bw, bh };
  }

  function speakerHeadPhoneBox(stageKey, def, t) {
    const head = actorHeadFromMask(stageKey, def, t);
    if (head?.bboxCss) {
      const cx = head.headCenterX ?? head.bboxCss.x + head.bboxCss.w * 0.2;
      const top = head.speakerTop + bubbleBandH;
      const faceH = Math.max(14, Math.min(head.bboxCss.h * 0.42, 28));
      const faceW = Math.max(18, Math.min(head.bboxCss.w * 0.55, 32));
      return {
        cx,
        top,
        left: cx - faceW / 2,
        right: cx + faceW / 2,
        bottom: top + faceH,
        w: faceW,
        h: faceH
      };
    }
    const b = actorScreenBounds(stageKey, def, t);
    const top = (b.speakerTop ?? 0) + bubbleBandH;
    const w = Math.max(16, (b.speakerRight ?? 0) - (b.speakerLeft ?? 0));
    return {
      cx: b.headCenterX ?? (b.speakerLeft ?? 0) + w / 2,
      top,
      left: b.speakerLeft ?? 0,
      right: b.speakerRight ?? w,
      bottom: top + 20,
      w,
      h: 20
    };
  }

  function kitchenBubbleKeepouts(stageDef, t) {
    const keepouts = [];
    for (const [key, def] of Object.entries(stageDef.actors || {})) {
      if (!def) continue;
      const head = actorHeadFromMask(key, def, t);
      if (!head?.bboxCss) continue;
      keepouts.push({
        x: head.bboxCss.x - 14,
        y: head.bboxCss.y + bubbleBandH - 14,
        w: head.bboxCss.w + 28,
        h: head.bboxCss.h + 20
      });
    }
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const lv = shotLightVariant(shotAtTime(t));
    for (const pid of ['clock']) {
      const p = catalog[pid];
      if (!p) continue;
      const box = propSceneBounds(spriteManifest, p, lv);
      if (!box) continue;
      const tl = sceneToScreen(box.x, box.y);
      const br = sceneToScreen(box.x + box.w, box.y + box.h);
      keepouts.push({
        x: tl.x - 8,
        y: tl.y + bubbleBandH - 8,
        w: br.x - tl.x + 16,
        h: br.y - tl.y + 16
      });
    }
    const pendant = stageDef.props?.includes('pendant')
      ? pendantShadeScreenLayout(t, stageDef)
      : null;
    if (pendant?.keepouts) keepouts.push(...pendant.keepouts);
    return keepouts;
  }

  function pendantShadeScreenLayout(t, stageDef = null) {
    const st = stageDef || getStageForShot(shotAtTime(t));
    if (!st.props?.includes('pendant')) return null;
    const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
    const p = catalog.pendant;
    if (!p) return null;
    const lv = shotLightVariant(shotAtTime(t));
    const box = propSceneBounds(spriteManifest, p, lv);
    if (!box) return null;
    const sc = activeScale || 1;
    const tl = sceneToScreen(box.x, box.y);
    const br = sceneToScreen(box.x + box.w, box.y + box.h);
    const padX = Math.round(5 * sc);
    const padY = Math.round(4 * sc);
    const cx = (tl.x + br.x) / 2;
    const glowHalfW = Math.round(15 * sc);
    const glowFloorY = activeOy + (138 - activeCrop.y) * sc;
    const shadeH = br.y - tl.y;
    const shade = {
      x: tl.x,
      y: tl.y,
      w: br.x - tl.x,
      h: shadeH,
      right: br.x
    };
    const shadePhone = {
      x: Math.round(shade.x),
      y: Math.round(shade.y + bubbleBandH),
      w: Math.round(shade.w),
      h: Math.round(shade.h),
      right: Math.round(shade.right)
    };
    const glowH = Math.max(shadeH, glowFloorY - shade.y) + padY;
    const keepouts = [
      {
        x: shade.x - padX,
        y: shade.y + bubbleBandH - padY,
        w: shade.w + padX * 2,
        h: shade.h + padY * 2
      }
    ];
    if (currentLightVariant !== 'day') {
      keepouts.push({
        x: cx - glowHalfW,
        y: shade.y + bubbleBandH - padY,
        w: glowHalfW * 2,
        h: glowH
      });
    }
    return { shadePhone, keepouts };
  }

  function kitchenSpeakerLinesBeforeOverlap(text, measure, padX, lineH, padY, maxW, stageDef, t, headCx, defaultBy) {
    const keepouts = kitchenBubbleKeepouts(stageDef, t);
    const widths = [];
    for (let w = maxW - padX * 2; w >= 88; w -= 6) widths.push(w);
    for (const w of [126, 118, 110, 100]) widths.push(w);
    const seen = new Set();
    for (const textW of widths) {
      if (seen.has(textW)) continue;
      seen.add(textW);
      const lines = wrapLinesBySentences(text, textW, measure);
      const { bw, bh } = bandBubbleTextSize(lines, measure, padX, lineH, padY);
      let bx = headCx - bw / 2;
      bx = Math.max(16, Math.min(stageW - bw - 16, bx));
      const bubble = { x: bx, y: defaultBy, w: bw, h: bh };
      const hit = keepouts.some((k) => screenRectsOverlap(bubble, k, 2));
      if (!hit) return { lines, bw, bh };
    }
    const lines = wrapLinesBySentences(text, 100, measure);
    const sized = bandBubbleTextSize(lines, measure, padX, lineH, padY);
    return { lines, bw: sized.bw, bh: sized.bh };
  }

  function roundRectB(x, y, w, h, r) {
    bctx.beginPath();
    bctx.moveTo(x + r, y);
    bctx.lineTo(x + w - r, y);
    bctx.quadraticCurveTo(x + w, y, x + w, y + r);
    bctx.lineTo(x + w, y + h - r);
    bctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    bctx.lineTo(x + r, y + h);
    bctx.quadraticCurveTo(x, y + h, x, y + h - r);
    bctx.lineTo(x, y + r);
    bctx.quadraticCurveTo(x, y, x + r, y);
    bctx.closePath();
  }

  function drawLineupLabels(shot) {
    if (bandCoverLayout) return;
    const labels = shot.lineupLabels ?? CFG.lineupLabels;
    if (!labels) return;
    const actors = getStageForShot(shot).actors;
    bctx.save();
    bctx.font = '10px "Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
    bctx.fillStyle = '#1a1a22';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'top';
    for (const [id, label] of Object.entries(labels)) {
      const actor = actors[id];
      if (!actor) continue;
      const feet = sceneToBubbleScreen(actor.x, actor.y + 1);
      const text = String(label).replace(/\s*\n\s*/g, ' ');
      bctx.fillText(text, feet.x, feet.y + 6);
    }
    bctx.restore();
  }

  function dialogueHudTop() {
    return bubbleBandH + stageH;
  }

  function screenRectsOverlap(a, b, pad = 0) {
    return a.x < b.x + b.w + pad
      && a.x + a.w + pad > b.x
      && a.y < b.y + b.h + pad
      && a.y + a.h + pad > b.y;
  }

  function bandCoverOtherHeads(stageDef, t, speakerKey) {
    const others = [];
    for (const [id, def] of Object.entries(stageDef?.actors || {})) {
      if (!def || id === speakerKey) continue;
      const bounds = actorScreenBounds(id, def, t);
      if (bounds.speakerLeft == null || bounds.speakerTop == null) continue;
      others.push({
        left: bounds.speakerLeft,
        right: bounds.speakerRight,
        top: bounds.speakerTop + bubbleBandH,
        bottom: bounds.speakerBottom + bubbleBandH,
        cx: bounds.headCenterX
      });
    }
    return others;
  }

  function kitchenSpeakerBubblePlacement({
    bw, bh, headBox, tailInset, stageDef, t, slot = 'default', speakerKey = null, allowOverlap = false
  }) {
    const sc = activeScale || 1;
    if (bandCoverLayout && headBox && !headBox.off) {
      const plan = planBandSpeechStub({
        bw,
        bh,
        scale: sc,
        speaker: {
          cx: headBox.cx,
          left: headBox.left,
          right: headBox.right,
          top: headBox.top,
          bottom: headBox.bottom
        },
        others: bandCoverOtherHeads(stageDef, t, speakerKey),
        stageW,
        stageH,
        bubbleBandH,
        allowOverlap,
        headLiftPx: (bandAnchorOverrides?.actors?.[speakerKey]?.bubbleHeadLift || 0) * sc
      });
      if (!plan) {
        const minX = BAND_BUBBLE_INSET_PX;
        const minY = bubbleBandH + BAND_BUBBLE_INSET_PX;
        const bx = Math.max(minX, Math.min(stageW - bw - minX, (headBox.cx || minX) - bw / 2));
        const by = Math.max(minY, Math.min(bubbleBandH + stageH - bh - minX, minY));
        // no room for bubble + full stub above the head: still point at the speaker when the gap between the pinned
        // bubble and the head top fits a shortened stub (tail = one triangle from the body bottom toward the head)
        const fbStubPx = BAND_TAIL_STUB_X1 * sc;
        const fbGap = headBox.top - 2 - (by + bh);
        // tight gap (< 8 px): a short tail may still end just inside the head top (at most FB_TIP_INTO_HEAD px), so the
        // bubble never loses its pointer; a tail shorter than 6 px would not read as one, so below that it stays tailless
        const FB_TIP_INTO_HEAD = 4;
        const fbReach = headBox.top + FB_TIP_INTO_HEAD - (by + bh);
        if (fbGap >= 8 || (fbGap >= 0 && fbReach >= 6)) {
          const sh = Math.round(fbGap >= 8 ? Math.min(fbStubPx, fbGap) : Math.min(8, fbReach));
          const sw = Math.round(Math.max(8, Math.min(fbStubPx, sh)));
          const scx = Math.max(bx + sw / 2 + 2, Math.min(bx + bw - sw / 2 - 2, headBox.cx));
          const stub = { x: Math.round(scx - sw / 2), y: Math.round(by + bh), w: sw, h: sh };
          return {
            faceOverlap: false, tailMode: 'stub', bx, by,
            tailBaseX: stub.x + sw / 2, tailBaseY: stub.y, tailTipX: stub.x + sw / 2, tailTipY: stub.y + sh,
            tailHalf: sw / 2, tailLen: sh, tailLenStage: sh / sc, bubbleMode: 'inset', stub,
            bubbleBbox: { x: Math.round(bx), y: Math.round(by), w: Math.round(bw), h: Math.round(bh) },
            pendantShadeBbox: pendantShadeScreenLayout(t)?.shadePhone ?? null
          };
        }
        return {
          faceOverlap: false,
          tailMode: 'none',
          bx,
          by,
          tailBaseX: bx + bw / 2,
          tailBaseY: by + bh,
          tailTipX: bx + bw / 2,
          tailTipY: by + bh,
          tailHalf: 0,
          tailLen: 0,
          tailLenStage: null,
          bubbleMode: 'inset',
          stub: null,
          bubbleBbox: { x: Math.round(bx), y: Math.round(by), w: Math.round(bw), h: Math.round(bh) },
          pendantShadeBbox: pendantShadeScreenLayout(t)?.shadePhone ?? null
        };
      }
      const stub = plan.stub;
      return {
        bx: plan.bx,
        by: plan.by,
        tailBaseX: stub.x + stub.w / 2,
        tailBaseY: stub.y,
        tailTipX: stub.x + stub.w / 2,
        tailTipY: stub.y + stub.h,
        tailMode: 'stub',
        tailHalf: stub.w / 2,
        tailLen: stub.h,
        tailLenStage: BAND_TAIL_STUB_X1,
        faceOverlap: false,
        bubbleMode: plan.mode,
        stub,
        bubbleBbox: { x: Math.round(plan.bx), y: Math.round(plan.by), w: Math.round(bw), h: Math.round(bh) },
        pendantShadeBbox: pendantShadeScreenLayout(t)?.shadePhone ?? null
      };
    }
    const edge = 16;
    const headCx = headBox.cx;
    const headTop = headBox.top;
    const headLeft = headBox.left;
    const headRight = headBox.right;
    const headMidY = (headTop + headBox.bottom) / 2;
    const tailHalfCss = Math.max(4, Math.round(2.5 * sc));
    const keepouts = kitchenBubbleKeepouts(stageDef, t);
    const pendant = pendantShadeScreenLayout(t);
    const rightEdge = stageW - edge;
    const phoneBottom = bubbleBandH + stageH - 8;

    function faceHit(bubble) {
      return keepouts.some((k) => screenRectsOverlap(bubble, k, 1));
    }

    function pack(bx, by, tailMode, tailBaseX, tailBaseY, tailTipX, tailTipY) {
      const bubble = { x: bx, y: by, w: bw, h: bh };
      const tailLen = tailMode === 'down'
        ? Math.max(0, tailTipY - tailBaseY)
        : Math.max(0, Math.abs(tailTipX - tailBaseX));
      const tailLenStage = sc > 0 ? Math.round((tailLen / sc) * 10) / 10 : null;
      return {
        bx,
        by,
        tailBaseX,
        tailBaseY,
        tailTipX,
        tailTipY,
        tailMode,
        tailHalf: tailHalfCss,
        tailLen,
        tailLenStage,
        faceOverlap: faceHit(bubble),
        bubbleBbox: { x: Math.round(bx), y: Math.round(by), w: Math.round(bw), h: Math.round(bh) },
        pendantShadeBbox: pendant?.shadePhone ?? null
      };
    }

    if (slot === 'soirMartinRight') {
      const gapAboveHead = 16;
      const tailTipY = headTop - 2;
      const tailBaseY = headTop - gapAboveHead;
      let by = tailBaseY - bh;
      by = Math.max(8, by);
      const minBx = pendant ? pendant.shadePhone.right + 12 : edge;
      let bx = Math.max(minBx, Math.min(rightEdge - bw, rightEdge - bw));
      for (let i = 0; i < 12; i++) {
        const bubble = { x: bx, y: by, w: bw, h: bh };
        const hit = keepouts.some((k) => screenRectsOverlap(bubble, k, 2));
        if (!hit) break;
        bx = Math.max(minBx, bx - 4);
      }
      const tailBaseX = Math.max(bx + tailInset, Math.min(bx + bw - tailInset, headCx));
      return pack(bx, by, 'down', tailBaseX, tailBaseY, headCx, tailTipY);
    }

    const gapAbove = 28;
    const hairH = Math.max(14, Math.round((headBox.h || 24) * 0.42));
    const hairRect = {
      x: headLeft - 4,
      y: headTop - 2,
      w: Math.max(8, headRight - headLeft) + 8,
      h: hairH + 4
    };
    const upperKeepouts = [];
    const staged = bandAnchorOverrides?.assets || {};
    for (const [key, ov] of Object.entries(staged)) {
      if (!ov || ov.left == null) continue;
      if (key === 'prop.stairs' || key === 'coffee_pot') continue;
      const tl = sceneToScreen(ov.left, ov.top);
      const br = sceneToScreen(ov.left + ov.w, ov.top + ov.h);
      upperKeepouts.push({
        x: tl.x,
        y: tl.y + bubbleBandH,
        w: Math.max(1, br.x - tl.x),
        h: Math.max(1, br.y - tl.y)
      });
    }

    function bodyClears(bubble, avoidSet) {
      if (bubble.y < 8 || bubble.x < edge || bubble.x + bubble.w > rightEdge) return false;
      if (bubble.y + bubble.h > phoneBottom) return false;
      if (screenRectsOverlap(bubble, hairRect, 0)) return false;
      if (faceHit(bubble)) return false;
      if (avoidSet && upperKeepouts.some((k) => screenRectsOverlap(bubble, k, 2))) return false;
      return true;
    }

    function downPack(bubble) {
      const tailBaseY = bubble.y + bubble.h;
      const tailBaseX = Math.max(bubble.x + tailInset, Math.min(bubble.x + bubble.w - tailInset, headCx));
      const tailTipY = headBox.tipY ?? (headTop + Math.max(6, Math.round((headBox.h || 24) * 0.18)));
      return pack(bubble.x, bubble.y, 'down', tailBaseX, tailBaseY, headCx, tailTipY);
    }

    function packClear(bubble) {
      const overHead = bubble.y + bubble.h <= headTop - gapAbove + 1
        && bubble.x < headCx
        && bubble.x + bubble.w > headCx;
      if (overHead) return downPack(bubble);
      const tipY = headTop + Math.max(6, Math.round(hairH * 0.35));
      if (bubble.x + bubble.w <= headLeft + 6) {
        const baseY = Math.max(bubble.y + 10, Math.min(bubble.y + bubble.h - 10, tipY));
        return pack(bubble.x, bubble.y, 'right', bubble.x + bubble.w, baseY, headLeft + 3, tipY);
      }
      if (bubble.x >= headRight - 6) {
        const baseY = Math.max(bubble.y + 10, Math.min(bubble.y + bubble.h - 10, tipY));
        return pack(bubble.x, bubble.y, 'left', bubble.x, baseY, headRight - 3, tipY);
      }
      return downPack(bubble);
    }

    const maxBottom = headTop - gapAbove;
    for (const avoidSet of [true, false]) {
      for (let bottom = maxBottom; bottom >= bh + 8; bottom -= 6) {
        const y = bottom - bh;
        const x0 = Math.max(edge, Math.min(rightEdge - bw, headCx - bw / 2));
        const xs = [x0];
        for (let step = 8; step < stageW; step += 8) xs.push(x0 - step, x0 + step);
        for (const x of xs) {
          const bubble = { x, y, w: bw, h: bh };
          if (!bodyClears(bubble, avoidSet)) continue;
          return packClear(bubble);
        }
      }
    }

    const trySide = (side) => {
      const sideGap = 12;
      let bx;
      let tailBaseX;
      let tailTipX;
      if (side === 'left') {
        bx = headLeft - bw - sideGap;
        tailBaseX = bx + bw;
        tailTipX = headLeft + 2;
      } else {
        bx = headRight + sideGap;
        tailBaseX = bx;
        tailTipX = headRight - 2;
      }
      let by = headTop - 4;
      by = Math.max(8, Math.min(phoneBottom - bh, by));
      if (bx < edge || bx + bw > rightEdge) return null;
      const bubble = { x: bx, y: by, w: bw, h: bh };
      if (!bodyClears(bubble, false)) return null;
      const tailBaseY = Math.max(by + 8, Math.min(by + bh - 8, headTop + hairH * 0.4));
      const tailMode = side === 'left' ? 'right' : 'left';
      return pack(bx, by, tailMode, tailBaseX, tailBaseY, tailTipX, headMidY);
    };

    const leftSide = trySide('left');
    if (leftSide && !leftSide.faceOverlap) return leftSide;
    const rightSide = trySide('right');
    if (rightSide && !rightSide.faceOverlap) return rightSide;

    const fallbackY = Math.max(8, maxBottom - bh);
    const fallbackX = Math.max(edge, Math.min(rightEdge - bw, headCx - bw / 2));
    const fallback = pack(
      fallbackX,
      fallbackY,
      'down',
      Math.max(fallbackX + tailInset, Math.min(fallbackX + bw - tailInset, headCx)),
      fallbackY + bh,
      headCx,
      headTop + 6
    );
    fallback.faceOverlap = true;
    return fallback;
  }

  function fitKitchenSpeakerBubble(text, measure, padX, lineH, padY, headBox, tailInset, stageDef, t, slot, speakerKey) {
    const frameMax = kitchenBubbleFrameMaxW();
    if (bandCoverLayout) {
      const maxW = stageW - BAND_BUBBLE_INSET_PX * 2;
      const maxInner = Math.max(1, maxW - padX * 2);
      const sized = layoutBandBubbleText(text, measure, maxInner);
      const bw = Math.min(maxW, Math.max(sized.inner, 1) + padX * 2);
      const bh = Math.max(1, sized.lines.length) * lineH + padY * 2;
      const laid = kitchenSpeakerBubblePlacement({
        bw, bh, headBox, tailInset, stageDef, t, slot, speakerKey, allowOverlap: true
      });
      return { lines: sized.lines, bw, bh, laid };
    }
    for (let inner = frameMax - padX * 2; inner >= 68; inner -= 4) {
      const { lines, bw, bh } = kitchenBubbleTextLines(text, measure, padX, lineH, padY, inner);
      const laid = kitchenSpeakerBubblePlacement({
        bw, bh, headBox, tailInset, stageDef, t, slot
      });
      if (!laid.faceOverlap) return { lines, bw, bh, laid };
    }
    const base = kitchenBubbleTextLines(text, measure, padX, lineH, padY, 68);
      const laid = kitchenSpeakerBubblePlacement({
        bw: base.bw,
        bh: base.bh,
        headBox,
        tailInset,
        stageDef,
        t,
        slot,
        speakerKey
      });
    return { lines: base.lines, bw: base.bw, bh: base.bh, laid };
  }

  function drawBubbleTailStub(stub, headCx, bx, bw) {
    if (!stub) return;
    const poly = stubTailPolygon(stub, headCx, bx, bw);
    bctx.save();
    bctx.fillStyle = '#fff';
    bctx.beginPath();
    bctx.moveTo(poly.baseL, poly.baseY - 2);
    bctx.lineTo(poly.baseR, poly.baseY - 2);
    bctx.lineTo(poly.tipX, poly.tipY);
    bctx.closePath();
    bctx.fill();
    // open top: only the two sides are inked, so the tail joins the bubble instead of boxing under it
    bctx.strokeStyle = '#22303a';
    bctx.lineWidth = 2;
    bctx.beginPath();
    bctx.moveTo(poly.baseL, poly.baseY);
    bctx.lineTo(poly.tipX, poly.tipY);
    bctx.lineTo(poly.baseR, poly.baseY);
    bctx.stroke();
    bctx.restore();
  }

  function drawBubbleTailWedge(baseX, baseY, tipX, tipY, tailHalf = 7) {
    bctx.beginPath();
    bctx.moveTo(tipX, tipY);
    bctx.lineTo(baseX - tailHalf, baseY);
    bctx.lineTo(baseX + tailHalf, baseY);
    bctx.closePath();
    bctx.fillStyle = '#fff';
    bctx.fill();
    bctx.strokeStyle = '#22303a';
    bctx.lineWidth = 2;
    bctx.stroke();
  }

  function drawBubbleTailSide(baseX, baseY, tipX, tipY, tailHalf = 7) {
    bctx.beginPath();
    bctx.moveTo(tipX, tipY);
    bctx.lineTo(baseX, baseY - tailHalf);
    bctx.lineTo(baseX, baseY + tailHalf);
    bctx.closePath();
    bctx.fillStyle = '#fff';
    bctx.fill();
    bctx.strokeStyle = '#22303a';
    bctx.lineWidth = 2;
    bctx.stroke();
  }

  /** Opaque mask so scene props never show through bubble fill or 2px outline. */
  function drawSpeechBubbleOccluder(bx, by, bw, bh, radius, tailOpts = null) {
    const outlinePad = 2;
    bctx.save();
    bctx.fillStyle = '#ffffff';
    roundRectB(
      bx - outlinePad,
      by - outlinePad,
      bw + outlinePad * 2,
      bh + outlinePad * 2,
      radius + outlinePad
    );
    bctx.fill();
    if (tailOpts && tailOpts.tailLen >= 4) {
      const { tailBaseX, tailBaseY, tailTipX, tailTipY, tailHalf, tailMode, stub } = tailOpts;
      if (tailMode === 'stub' && stub) {
        // occlude only the tail TRIANGLE (+ outline pad): filling the stub's bounding rect left a white box with a V under it
        const poly = stubTailPolygon(stub, tailOpts.stubAimX ?? tailTipX, bx, bw);
        bctx.beginPath();
        bctx.moveTo(poly.baseL - outlinePad, poly.baseY - 2);
        bctx.lineTo(poly.baseR + outlinePad, poly.baseY - 2);
        bctx.lineTo(poly.tipX, poly.tipY + outlinePad);
        bctx.closePath();
        bctx.fill();
      } else {
      bctx.beginPath();
      bctx.moveTo(tailTipX, tailTipY);
      if (tailMode === 'left' || tailMode === 'right') {
        const padX = tailMode === 'left' ? outlinePad : -outlinePad;
        bctx.lineTo(tailBaseX + padX, tailBaseY - tailHalf - outlinePad);
        bctx.lineTo(tailBaseX + padX, tailBaseY + tailHalf + outlinePad);
      } else {
        bctx.lineTo(tailBaseX - tailHalf - outlinePad, tailBaseY + outlinePad);
        bctx.lineTo(tailBaseX + tailHalf + outlinePad, tailBaseY + outlinePad);
      }
      bctx.closePath();
      bctx.fill();
      }
    }
    bctx.restore();
  }

  function speakerLabel(b) {
    const labels = CFG.speakerLabels || {
      narrator: 'Narrateur',
      martin: 'Madame Martin',
      madame_martin: 'Madame Martin',
      camille: 'Camille',
      noe: 'Noé',
      lefevre: 'Lefèvre'
    };
    if (b.kind === 'narrator' || b.anchor === 'narrator') return labels.narrator;
    const id = b.actor || b.anchor;
    // a screen message is signed by its sender (the step's who, compiled as actor), not by the bubble's anchor
    const sender = b.who || b.actor;
    if (b.kind === 'screen' && sender && labels[sender]) return labels[sender];
    if (b.kind === 'screen' || actorId(id) === 'martin' || actorId(id) === 'madame_martin') {
      return labels.martin || labels.madame_martin || 'Madame Martin';
    }
    return labels[id] || labels[actorId(id)] || String(id);
  }

  function setHudLine(speaker, text, opts = {}) {
    if (!dialogue) return;
    dialogue.hidden = false;
    if (dialogueSpeaker) {
      dialogueSpeaker.textContent = opts.tapHint ? '' : (speaker || '');
      dialogueSpeaker.classList.toggle('is-screen-message', !!opts.screenMessage);
      dialogueSpeaker.hidden = !!opts.tapHint;
    }
    if (dialogueText) {
      const body = text != null && String(text).length
        ? text
        : (CFG.hudContinue || 'Touchez pour continuer…');
      dialogueText.textContent = opts.tapHint ? `▸ ${body}` : body;
      dialogueText.classList.toggle('is-tap-hint', !!opts.tapHint);
    }
  }

  function drawScreenMessageIcon(cx, cy, size) {
    const w = size * 0.9;
    const h = size * 1.15;
    bctx.save();
    bctx.fillStyle = '#3d5a80';
    bctx.strokeStyle = '#2a4060';
    bctx.lineWidth = 1.2;
    roundRectB(cx - w / 2, cy - h / 2, w, h, 2.5);
    bctx.fill();
    bctx.stroke();
    bctx.strokeStyle = '#dce8f4';
    bctx.lineWidth = 1.4;
    bctx.beginPath();
    bctx.arc(cx + w / 2 + 3, cy - 1, 3, -Math.PI / 3, Math.PI / 3);
    bctx.stroke();
    bctx.beginPath();
    bctx.arc(cx + w / 2 + 6, cy - 1, 5, -Math.PI / 3, Math.PI / 3);
    bctx.stroke();
    bctx.restore();
  }

  function strokeRoundRectDashed(x, y, w, h, r) {
    bctx.save();
    bctx.setLineDash([5, 4]);
    roundRectB(x, y, w, h, r);
    bctx.stroke();
    bctx.setLineDash([]);
    bctx.restore();
  }

  function drawScreenTailToLaptop(bx, by, bw, bh, anchor) {
    if (!anchor.tailToLaptop || anchor.laptopSceneX == null) return;
    const baseX = bx + bw / 2;
    const baseY = by + bh;
    const tipX = Math.max(bx + 10, Math.min(bx + bw - 10, anchor.laptopSceneX));
    const tipY = Math.min(bubbleBandH - 2, Math.max(baseY + 8, anchor.laptopSceneY ?? bubbleBandH - 4));
    drawBubbleTailWedge(baseX, baseY, tipX, tipY, 6);
  }

  function speakerNotInFrame(anchor, shot) {
    // generic (subshots.speakerHidden): dashed when the speaker is outside the current framing, under an insert,
    // or the current sub-shot is an insert (own shot, backdrop dimmed)
    const insertShot = !!(shot?.subshot && shot?.phoneInsert?.backdropDim > 0);
    if (!insertShot && (!anchor || anchor.off || anchor.speakerLeft == null || anchor.headCenterX == null)) return !!anchor?.off;
    const left = anchor?.speakerLeft ?? 0;
    const right = anchor?.speakerRight ?? left + 16;
    const top = anchor?.speakerTop ?? 0;
    const bottom = anchor?.speakerBottom ?? (top + 24);
    const headH = Math.max(8, (bottom - top) * 0.45);
    const photo = shot?.phoneInsert ? phoneInsertPhotoStageRect(shot.phoneInsert) : null;
    return speakerHidden({
      head: { x: left, y: top - bubbleBandH, w: Math.max(8, right - left), h: headH },
      frame: { x: BAND_BUBBLE_INSET_PX - 4, y: 0, w: stageW - 2 * (BAND_BUBBLE_INSET_PX - 4), h: stageH },
      insertRect: photo, insertShot
    });
  }

  function drawBubbles(t) {
    bctx.clearRect(0, 0, stageW, phoneH);
    lastBandStageTopFill = false;
    const wallFilled = fillBubbleBandEveningWall(shotAtTime(t));
    if (!paintBubbleBandWallArt() && !wallFilled) fillBubbleBandFromStageTop();
    dimBubbleBandUnderInsert(shotAtTime(t));
    drawLineupLabels(shotAtTime(t));
    if (phase === 'overlay') {
      if (dialogue) dialogue.hidden = true;
      return;
    }
    const bubbles = activeBubbles(t);
    if (!bubbles.length) {
      lastDrawnLine = null;
      setHudLine('', CFG.hudContinue || 'Touchez pour continuer…', { tapHint: true });
      return;
    }

    const fontPx = 17;
    const padX = 12;
    const padY = 12;
    const lineH = fontPx * 1.35;
    const hudTop = dialogueHudTop();
    const maxW = stageW - 24;
    bctx.font = `600 ${fontPx}px "Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif`;

    const b = bubbles[bubbles.length - 1];
    lastDrawnLine = { beat: b.beat ?? null, step: b.step ?? null, text: b.text, insertOwned: insertOwnsLine(shotAtTime(t), b) };
    if (insertOwnsLine(shotAtTime(t), b)) {
      setHudLine(speakerLabel(b), hudPanelText(b), { screenMessage: true });
      lastBubbleMetrics = { inBand: false, tailLengthPx: null, tailTipAboveHeadPx: null, insertOwned: true, hudText: hudPanelText(b) }; // fix20: insert-owned line text (HUD panel)
      return;
    }
    const measure = (s) => bctx.measureText(s).width;
    const anchor = bubbleAnchor(b, t);
    const shotNow = shotAtTime(t);
    const soirSeatedMartinEarly = kitchenMarChatEveningShot(shotNow)
      && anchor.stageActorKey === 'martin';
    const singleSpeakerBand = isKitchenSet()
      && b.kind !== 'narrator'
      && b.anchor !== 'narrator'
      && bubbles.length === 1;
    let lines;
    let bw;
    let bh;
    if (soirSeatedMartinEarly) {
      lines = wrapLinesBySentences(b.text, 126, measure);
      ({ bw, bh } = bandBubbleTextSize(lines, measure, padX, lineH, padY));
      bw = Math.min(150, Math.max(130, bw));
    } else if (singleSpeakerBand) {
      ({ lines, bw, bh } = kitchenBubbleTextLines(b.text, measure, padX, lineH, padY));
    } else {
      lines = wrapLines(b.text, maxW - padX * 2, measure);
      ({ bw, bh } = bandBubbleTextSize(lines, measure, padX, lineH, padY));
    }
    const headCx = anchor.off ? stageW / 2 : (anchor.headCenterX ?? anchor.x);
    const headTop = anchor.off ? hudTop : (anchor.speakerTop ?? anchor.y);
    const tailHalf = 7;
    const bubbleMargin = 8;
    const tailInset = 12;
    const useBandBubble = (isKitchenSet() || isStairwellSet() || isRooftopSet())
      && b.kind !== 'narrator'
      && b.anchor !== 'narrator';

    const soirMartinPresent = kitchenMarChatEveningShot(shotAtTime(t));
    const isScreenMessage = b.kind === 'screen' && !soirMartinPresent;
    setHudLine(speakerLabel(b), hudPanelText(b), { screenMessage: isScreenMessage });
    lastBubbleMetrics = { inBand: false, tailLengthPx: null, tailTipAboveHeadPx: null };

    if (useBandBubble) {
      const iconPad = isScreenMessage ? 22 : 0;
      const textPadX = padX + (isScreenMessage ? iconPad : 0);
      const textMaxW = maxW - textPadX * 2;
      const screenLines = isScreenMessage
        ? wrapLines(b.text, textMaxW, measure)
        : lines;
      const screenTextW = isScreenMessage
        ? Math.min(textMaxW, Math.max(...screenLines.map(measure), 40))
        : Math.max(...lines.map(measure), 40);
      let screenBw = isScreenMessage ? screenTextW + textPadX * 2 : bw;
      let screenBh = isScreenMessage ? screenLines.length * lineH + padY * 2 : bh;

      if (isScreenMessage) {
        // Explicit rectangles use inclusive full-frame CSS pixels.
        const rect = Array.isArray(b.rect) && b.rect.length === 4 && b.rect.every(Number.isFinite) ? b.rect : null;
        let bx = rect ? rect[0] : headCx - screenBw / 2;
        if (!rect) bx = Math.max(bubbleMargin, Math.min(stageW - screenBw - bubbleMargin, bx));
        const by = rect ? rect[1] : Math.max(8, bubbleBandH - screenBh - 10);
        if (rect) { screenBw = rect[2] - rect[0] + 1; screenBh = rect[3] - rect[1] + 1; }
        bctx.fillStyle = '#e3edf7';
        bctx.strokeStyle = '#5a7fa8';
        bctx.lineWidth = 2;
        drawSpeechBubbleOccluder(bx, by, screenBw, screenBh, 12);
        roundRectB(bx, by, screenBw, screenBh, 12);
        bctx.fill();
        strokeRoundRectDashed(bx, by, screenBw, screenBh, 12);
        drawScreenMessageIcon(bx + padX + 8, by + padY + lineH * 0.55, 11);
        bctx.fillStyle = '#152535';
        bctx.textBaseline = 'top';
        screenLines.forEach((ln, i) => {
          bctx.fillText(ln, bx + textPadX, by + padY + i * lineH);
        });
        lastBubbleMetrics = {
          inBand: by >= 0 && by + screenBh <= bubbleBandH + 1,
          screenBubble: true,
          tailLengthPx: null,
          bubbleX: Math.round(bx)
        };
        return;
      }

      const soirSeatedMartin = kitchenMarChatEveningShot(shotAtTime(t))
        && anchor.stageActorKey === 'martin';
      const marChatMartin = shotAtTime(t)?.id === 'd11_mar_chat'
        && anchor.stageActorKey === 'martin'
        && !kitchenMarChatEveningShot(shotAtTime(t));
      const maskTailSpeaker = soirSeatedMartin
        || (anchor.stageActorKey && bubbleUsesMaskHead(anchor.speakerLineId, t));
      const edgeMargin = marChatMartin ? 8 : bubbleMargin;
      let bx = headCx - bw / 2;
      bx = Math.max(edgeMargin, Math.min(stageW - bw - edgeMargin, bx));
      if (maskTailSpeaker) {
        if (headCx < bx + tailInset) {
          bx = Math.max(edgeMargin, headCx - tailInset);
        }
        if (headCx > bx + bw - tailInset) {
          bx = Math.min(stageW - bw - edgeMargin, headCx - bw + tailInset);
        }
      } else if (Math.abs(headCx - (bx + bw / 2)) > bw * 0.45) {
        bx = Math.max(edgeMargin, Math.min(stageW - bw - edgeMargin, headCx - bw / 2));
      }
      let by = Math.max(8, bubbleBandH - bh - 10);
      let tailBaseY = by + bh;
      let tailTipX = marChatMartin
        ? headCx
        : Math.max(bx + tailInset, Math.min(bx + bw - tailInset, headCx));
      if (maskTailSpeaker) {
        tailTipX = headCx;
      }
      let tailBaseX = tailTipX;
      const minTail = 12;
      let tailTipY = headTop - 6;
      let soirTailHalf = tailHalf;
      let tailLenStage = null;
      let bubbleBbox = null;
      let pendantShadeBbox = null;
      let tailMode = 'down';
      let stubRect = null;
      let stubAimX = headCx;
      const speakerHidden = speakerNotInFrame(anchor, shotNow);
      if (speakerHidden && !isScreenMessage) {
        const outlinePad = 2;
        const minX = BAND_BUBBLE_INSET_PX + outlinePad;
        const minY = bubbleBandH + BAND_BUBBLE_INSET_PX + outlinePad;
        const bx = minX;
        const by = minY;
        drawSpeechBubbleOccluder(bx, by, bw, bh, 10, null);
        bctx.fillStyle = '#fff';
        bctx.strokeStyle = '#22303a';
        bctx.lineWidth = 2;
        roundRectB(bx, by, bw, bh, 10);
        bctx.fill();
        strokeRoundRectDashed(bx, by, bw, bh, 10);
        bctx.save();
        roundRectB(bx + 1, by + 1, bw - 2, bh - 2, 9);
        bctx.clip();
        bctx.fillStyle = '#1a1a22';
        bctx.textBaseline = 'top';
        lines.forEach((ln, i) => {
          bctx.fillText(ln, bx + padX, by + padY + i * lineH);
        });
        bctx.restore();
        lastBubbleMetrics = {
          inBand: true,
          tailLengthPx: 0,
          tailMode: 'none',
          dashed: true,
          bubbleBbox: { x: bx, y: by, w: Math.round(bw), h: Math.round(bh) },
          speakerLineId: anchor.speakerLineId ?? null,
          stageActorKey: anchor.stageActorKey ?? null,
          bubbleMode: 'dashed',
          lines: lines.slice() // fix20: the off-screen line's text, for the per-line gate
        };
        return;
      }
      const kitchenSpeakerLayout = useBandBubble
        && !isScreenMessage
        && !anchor.off
        && !!anchor.stageActorKey;
      if (kitchenSpeakerLayout) {
        const stageDef = getStageForShot(shotAtTime(t));
        const resolved = resolveBubbleSpeaker(b, t);
        const spriteH = anchor.bboxCss?.h || Math.max(18, (anchor.speakerBottom ?? headTop + 18) - headTop);
        const spriteW = anchor.bboxCss?.w || Math.max(16, (anchor.speakerRight ?? headCx + 8) - (anchor.speakerLeft ?? headCx - 8));
        const headBox = {
          cx: headCx,
          top: headTop,
          left: anchor.speakerLeft ?? headCx - spriteW / 2,
          right: anchor.speakerRight ?? headCx + spriteW / 2,
          bottom: headTop + spriteH,
          w: spriteW,
          h: spriteH,
          tipY: headTop + Math.max(8, Math.round(spriteH * 0.22))
        };
        const slot = soirSeatedMartin ? 'soirMartinRight' : 'default';
        const fit = fitKitchenSpeakerBubble(
          b.text, measure, padX, lineH, padY, headBox, tailInset, stageDef, t, slot, anchor.stageActorKey
        );
        lines = fit.lines;
        bw = fit.bw;
        bh = fit.bh;
        const laid = fit.laid;
        bx = laid.bx;
        by = laid.by;
        tailBaseY = laid.tailBaseY;
        tailTipX = laid.tailTipX;
        tailTipY = laid.tailTipY;
        tailBaseX = laid.tailBaseX;
        soirTailHalf = laid.tailHalf;
        tailLenStage = laid.tailLenStage;
        tailMode = laid.tailMode || 'down';
        bubbleBbox = laid.bubbleBbox;
        pendantShadeBbox = laid.pendantShadeBbox;
        stubRect = laid.stub || null;
        stubAimX = headBox.cx;
      }
      // fix21 B (Réalisateur 11:10, d5 hp L20): generic rule — a bubble never overlaps its speaker's HEAD, the top
      // HEAD_CLEAR_FRAC of the drawn sprite bbox. Move it above the head (tail shortened to the head), else beside it.
      let headClear = null;
      if (!anchor.off && Number.isFinite(headTop)) {
        const sH = anchor.bboxCss?.h || Math.max(18, (anchor.speakerBottom ?? headTop + 18) - headTop);
        const hL = anchor.speakerLeft ?? (headCx - (anchor.bboxCss?.w || 16) / 2);
        const hR = anchor.speakerRight ?? (headCx + (anchor.bboxCss?.w || 16) / 2);
        const head = { x: hL, y: headTop, w: Math.max(1, hR - hL), h: sH * HEAD_CLEAR_FRAC };
        const over = (bxx, byy) => bubbleOverHead({ x: bxx, y: byy, w: bw, h: bh }, head);
        headClear = !over(bx, by);
        if (!headClear) {
          const upY = Math.floor(head.y - 3 - bh);
          const sideR = Math.ceil(head.x + head.w + 3);
          const sideL = Math.floor(head.x - 3 - bw);
          if (upY >= 0) { const d = upY - by; by = upY; tailBaseY += d; if (bubbleBbox) bubbleBbox = { ...bubbleBbox, y: by }; }
          else if (sideR + bw <= stageW - 2) { bx = sideR; if (bubbleBbox) bubbleBbox = { ...bubbleBbox, x: bx }; tailMode = 'none'; }
          else if (sideL >= 2) { bx = sideL; if (bubbleBbox) bubbleBbox = { ...bubbleBbox, x: bx }; tailMode = 'none'; }
          if (bubbleBbox && (bubbleBbox.x !== bx || bubbleBbox.y !== by)) bubbleBbox = { ...bubbleBbox, x: bx, y: by };
          tailBaseX = Math.max(bx + 8, Math.min(bx + bw - 8, tailBaseX));
          headClear = !over(bx, by);
        }
      }
      const maxTail = kitchenSpeakerLayout
        ? Math.max(minTail, Math.ceil(tailTipY - tailBaseY + 2))
        : 16;
      if (!kitchenSpeakerLayout) {
        tailTipY = Math.min(tailTipY, tailBaseY + maxTail);
        tailTipY = Math.max(tailBaseY + minTail, Math.min(tailBaseY + maxTail, tailTipY));
      }
      const tailLen = (tailMode === 'left' || tailMode === 'right')
        ? Math.max(0, Math.abs(tailTipX - tailBaseX))
        : Math.max(0, tailTipY - tailBaseY);
      lastBubbleMetrics = {
        inBand: by >= 0 && by + bh <= bubbleBandH + 1,
        tailLengthPx: Math.round(tailLen),
        tailLengthStagePx: tailLenStage,
        tailTipAboveHeadPx: Math.round(headTop - tailTipY),
        tailTipX: Math.round(tailTipX),
        tailTipY: Math.round(tailTipY),
        tailBaseY: Math.round(tailBaseY),
        tailBaseX: Math.round(tailBaseX),
        tailHalfPx: kitchenSpeakerLayout ? Math.round(soirTailHalf) : tailHalf,
        speakerHeadCenterX: Math.round(headCx),
        anchorView: { crop: activeCrop ? { x: activeCrop.x, y: activeCrop.y, w: activeCrop.w, h: activeCrop.h } : null, scale: activeScale, t },
        speakerHeadTopY: Math.round(headTop),
        tailDeltaX: Math.round(tailTipX - headCx),
        bubbleX: Math.round(bx),
        bubbleBbox,
        pendantShadeBbox,
        speakerLineId: anchor.speakerLineId ?? null,
        stageActorKey: anchor.stageActorKey ?? null,
        characterId: anchor.characterId ?? null,
        drawHeadCx: headCx,
        drawBx: bx,
        drawTailTipX: tailTipX,
        tailFormula: anchor.tailFormula ?? null,
        stub: stubRect,
        bubbleMode: stubRect ? (tailMode === 'stub' ? 'stub' : tailMode) : null,
        lines: lines.slice(),
        headClear
      };
      const allowScreenTail = soirSeatedMartin && anchor.stageActorKey === 'martin';
      const drawTail = !anchor.off && !anchor.noTail && !anchor.screenBubble
        && (b.kind !== 'screen' || allowScreenTail) && tailLen >= 4
        && by >= 0
        && (kitchenSpeakerLayout || by + bh <= bubbleBandH + 1);
      const tailHalfDraw = kitchenSpeakerLayout ? soirTailHalf : tailHalf;
      drawSpeechBubbleOccluder(bx, by, bw, bh, 10, drawTail ? {
        tailBaseX,
        tailBaseY,
        tailTipX,
        tailTipY,
        tailHalf: tailHalfDraw,
        tailLen,
        tailMode,
        stub: stubRect,
        stubAimX
      } : null);
      bctx.fillStyle = '#fff';
      bctx.strokeStyle = '#22303a';
      bctx.lineWidth = 2;
      roundRectB(bx, by, bw, bh, 10);
      bctx.fill();
      bctx.stroke();
      bctx.save();
      roundRectB(bx + 1, by + 1, bw - 2, bh - 2, 9);
      bctx.clip();
      bctx.fillStyle = '#1a1a22';
      bctx.textBaseline = 'top';
      lines.forEach((ln, i) => {
        bctx.fillText(ln, bx + padX, by + padY + i * lineH);
      });
      bctx.restore();
      if (drawTail) {
        if (tailMode === 'stub') {
          drawBubbleTailStub(stubRect, stubAimX, bx, bw);
        } else if (tailMode === 'left' || tailMode === 'right') {
          drawBubbleTailSide(tailBaseX, tailBaseY, tailTipX, tailTipY, tailHalfDraw);
        } else {
          drawBubbleTailWedge(tailBaseX, tailBaseY, tailTipX, tailTipY, tailHalfDraw);
        }
      }
      return;
    }

    const tipX = headCx;
    const tipY = anchor.off
      ? Math.min(...Object.entries(getStageForShot(shotAtTime(t)).actors)
        .filter(([, def]) => def)
        .map(([id, def]) => (actorScreenBounds(id, def, t).speakerTop ?? hudTop) + bubbleBandH)) + 2
      : headTop + 2;
    const shortLine = String(b.text).length <= 44;
    const sceneBubble = shortLine && tipY < bubbleBandH - 8 && b.kind !== 'narrator' && b.anchor !== 'narrator';
    let tailBaseY;
    let tailBaseX;
    if (sceneBubble) {
      const bx = Math.max(8, Math.min(stageW - bw - 8, tipX - bw / 2));
      const by = Math.max(12, tipY - bh - 18);
      tailBaseY = by + bh;
      tailBaseX = Math.max(bx + 16, Math.min(bx + bw - 16, tipX));
      const sceneTailLen = Math.max(0, tipY - tailBaseY);
      drawSpeechBubbleOccluder(bx, by, bw, bh, 10, sceneTailLen >= 4 ? {
        tailBaseX,
        tailBaseY,
        tailTipX: tipX,
        tailTipY: tipY,
        tailHalf,
        tailLen: sceneTailLen
      } : null);
      bctx.fillStyle = '#fff';
      bctx.strokeStyle = '#22303a';
      bctx.lineWidth = 2;
      roundRectB(bx, by, bw, bh, 10);
      bctx.fill();
      bctx.stroke();
      bctx.fillStyle = '#1a1a22';
      bctx.textBaseline = 'top';
      lines.forEach((ln, i) => {
        bctx.fillText(ln, bx + padX, by + padY + i * lineH);
      });
      if (!anchor.off && !anchor.noTail && !anchor.screenBubble && b.kind !== 'screen'
        && tipX >= 6 && tipX <= stageW - 6 && sceneTailLen >= 4) {
        drawBubbleTailWedge(tailBaseX, tailBaseY, tipX, tipY, tailHalf);
      }
    }
  }

  function drawTapRing(now) {
    if (!idleGlow || !tapRingTarget) return;
    const h = tapRingTarget;
    const p = sceneToScreen(h.x + (h.w || 0) / 2, h.y + (h.h || 0) / 2);
    const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
    const ringScale = Math.max(1, activeScale / 5);
    const rOuter = (16 + pulse * 10) * ringScale;
    const rInner = (9 + pulse * 5) * ringScale;
    bctx.save();
    bctx.strokeStyle = `rgba(255, 200, 80, ${0.45 + pulse * 0.4})`;
    bctx.lineWidth = 4 + pulse * 3;
    bctx.beginPath();
    bctx.arc(p.x, p.y, rOuter, 0, Math.PI * 2);
    bctx.stroke();
    bctx.strokeStyle = `rgba(255, 255, 245, ${0.65 + pulse * 0.25})`;
    bctx.lineWidth = 2.5;
    bctx.beginPath();
    bctx.arc(p.x, p.y, rInner, 0, Math.PI * 2);
    bctx.stroke();
    bctx.restore();
  }

  function sceneEnd() {
    return CFG.timing?.sceneEnd ?? CFG.shots[CFG.shots.length - 1].t1;
  }

  function processAudio(t, prevT) {
    if (previewHold || phase === 'overlay') return;
    for (const cue of CFG.audio || []) {
      if (cue.t >= prevT && cue.t < t + 0.05 && cue.t >= t - 0.05) playClip(cue.id);
      else if (prevT <= cue.t && t >= cue.t) playClip(cue.id);
    }
  }

  function updateTapRing(t) {
    tapRingTarget = null;
    idleGlow = false;
    const shot = shotAtTime(t);
    if (shot?.tapRing && t >= shot.t0 && t < shot.t1) {
      idleGlow = true;
      tapRingTarget = shot.tapRing;
      return;
    }
    for (const tap of CFG.taps || []) {
      if (t >= tap.t0 && t < tap.t1 && tap.ring) {
        idleGlow = true;
        tapRingTarget = tap.rect;
        break;
      }
    }
  }

  function drawPlaceholderPanel(label, tone = '#6a7080') {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(32, 36, 48, 0.55)';
    ctx.fillRect(0, 0, stageW, stageH);
    ctx.fillStyle = tone;
    ctx.font = '600 11px "Noto Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label), stageW / 2, stageH / 2);
    ctx.restore();
  }

  let lastPhonePlantTailOverlayScreenRect = null;

  function phoneInsertWaitingAsset(inset) {
    if (!inset) return false;
    if (inset.waitingAsset) return true;
    return false;
  }

  function phonePlantTailOverlayScreenRect(inset) {
    const { cssW: w, cssH: h } = PHONE_PLANT_TAIL_OVERLAY_SCREEN;
    const ox = inset?.screenOffsetX ?? 0;
    const oy = inset?.screenOffsetY ?? 0;
    const x = Math.round((stageW - w) / 2 + ox);
    const y = inset?.topBias != null
      ? Math.round(stageH * inset.topBias + oy)
      : Math.round((stageH - h) / 2 - 8 + oy);
    return { x, y, w, h };
  }

  function phoneCloseInsertPhotoStageRect(inset) {
    if (!inset) return null;
    const scale = inset.fixedCssRect?.scale ?? PHONE_PLANT_TAIL_OVERLAY_SCREEN.cssScale;
    const dw = inset.fixedCssRect?.w ?? 60 * scale;
    const dh = inset.fixedCssRect?.h ?? 58 * scale;
    if (inset.fixedCssRect) {
      return { x: inset.fixedCssRect.x, y: inset.fixedCssRect.y, w: dw, h: dh };
    }
    const ox = inset.screenOffsetX ?? 0;
    const oy = inset.screenOffsetY ?? 0;
    const x = Math.round((stageW - dw) / 2 + ox);
    const y = inset.topBias != null
      ? Math.round(stageH * inset.topBias + oy)
      : Math.round((stageH - dh) / 2 - 8 + oy);
    return { x, y, w: dw, h: dh };
  }

  function phoneInsertPhotoStageRect(inset) {
    if (!inset) return null;
    const closeInsert = inset.mode === 'closeInsert' || inset.compactFrame;
    if (closeInsert) return phoneCloseInsertPhotoStageRect(inset);
    return phonePlantTailOverlayScreenRect(inset);
  }

  function drawPhoneOverlayFileImage(file, rect) {
    const im = fileImages[file];
    if (!im || !rect) return false;
    const { srcW, srcH, cssW, cssH } = PHONE_PLANT_TAIL_OVERLAY_SCREEN;
    if (im.width !== srcW || im.height !== srcH) return false;
    if (rect.w !== cssW || rect.h !== cssH) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, 0, 0, srcW, srcH, rect.x, rect.y, cssW, cssH);
    return true;
  }

  // registry id -> manifest id by prefix; a frame sequence (type:'sequence') plays at its fps
  function insertLogicalAt(logical, t = sceneT) {
    const id = spriteManifest?.assets?.[logical] ? logical : (resolveRegistryAsset(String(logical || '').replace(/^prop\./, ''), spriteManifest?.assets || {}) || logical);
    const e = spriteManifest?.assets?.[id];
    if (e?.type === 'sequence' && Array.isArray(e.frames) && e.frames.length) {
      return e.frames[Math.floor(Math.max(0, t) * (e.fps || 1)) % e.frames.length];
    }
    return id;
  }

  const INSERT_MIN_ART_PX = 24;

  /** Can this sub-shot insert be drawn (asset in a loaded pack and its image loaded)? */
  function insertAssetReady(inset) {
    if (!inset?.logical) return false;
    try {
      const spec = resolveAsset(spriteManifest, insertLogicalAt(inset.logical, 0), { lightVariant: inset.grade || currentLightVariant || 'day' });
      const im = spec.source === 'atlas' ? atlasImages[spec.atlas] : fileImages[spec.file];
      if (!im) return false;
      // insert-size art: a 4x6 hand prop blown up is not an insert (needs registry insert_asset)
      return Math.max(spec.frame?.w ?? im.width, spec.frame?.h ?? im.height) >= INSERT_MIN_ART_PX;
    } catch { return false; }
  }

  // every insert of a beat's sub-shots must be drawable: fail the beat (STRICT) as soon as any of its shots is shown
  function preflightSubshotInserts(beatId) {
    for (const sh of CFG.shots || []) {
      if (sh.subshot?.beat !== beatId || !(sh.phoneInsert?.backdropDim > 0)) continue;
      if (!insertAssetReady(sh.phoneInsert)) recordSitcomStrictError({ kind: 'insert', asset: sh.phoneInsert.logical }, new Error(`insert asset missing in ${sh.id} (no loaded pack has it)`), beatId);
    }
  }

  /** Engine-drawn insert text (registry insert_asset art with a manifest textRect): the compiled written answer,
   * else the line on screen now (one phone_bubble per tap). Wrapped to the rect; overflow is reported, never clipped silently. */
  // the insert art writes the live screen line itself (one bubble per tap): the band bubble stands down
  function insertOwnsLine(shot, b) {
    const ins = shot?.phoneInsert;
    return !!(ins && !ins.staticText && b && b.kind === 'screen' && ins.textRect);
  }

  function drawInsertText(inset, rect, ox, oy, scale, shot, nameRect) {
    if (getStageForShot(shot)?.captionDraw) return null; // an authored caption owns the rect
    const live = activeBubbles(sceneT);
    const lastB = live.length ? live[live.length - 1] : null;
    const text = inset.staticText || (lastB ? String(lastB.text || '') : '');
    if (!text) return null;
    inset.textRect = rect;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    // a chat screen (art with a name bar) reads like a message: left, top-aligned; other inserts stay centred
    const chat = !!nameRect;
    // fix22 G (generic): insert text reads at >= INSERT_MIN_CAP_CSS css px cap height whatever the insert scale
    const cssPerPx = (() => { const cv = ctx.canvas; const bw = cv?.getBoundingClientRect?.().width; return bw && cv.width ? bw / cv.width : 1; })();
    const metrics = {};
    const minCap = INSERT_MIN_CAP_CSS / (scale * cssPerPx);
    const ok = drawCaptionInRect(ctx, text, { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
      chat ? { selfLit: false, align: 'left', valign: 'top', minCap, metrics } : { selfLit: false, minCap, metrics });
    let name = null;
    if (nameRect && lastB && !inset.staticText && lastB.kind === 'screen') name = speakerLabel(lastB);
    // fix17: an outgoing reply (staticText) or a line without a sender still names the conversation partner
    if (nameRect && !name && inset.partner) name = speakerLabel({ kind: 'screen', who: inset.partner, actor: inset.partner });
    if (nameRect && name) {
      drawCaptionInRect(ctx, name, { x: nameRect.x, y: nameRect.y, w: nameRect.w, h: nameRect.h }, { selfLit: false, align: 'left' });
    }
    ctx.restore();
    if (globalThis.__A411_INSERT_PROBE) globalThis.__A411_INSERT_PROBE.text = { text, name, chat, drawn: ok !== false, rect, capCss: metrics.cap * scale * cssPerPx, fontCss: metrics.fontSize * scale * cssPerPx };
    if (ok === false) {
      // reported for Pixel (insert_phone_chat / bigger art), not a STRICT fail
      const log = (globalThis.__A411_INSERT_TEXT_OVERFLOW ||= []);
      const key = `${shot?.id}|${text}`;
      if (!log.some((e) => e.key === key)) log.push({ key, shot: shot?.id ?? null, asset: inset.logical, rect: `${rect.w}x${rect.h}`, text });
    }
    return ok;
  }

  function drawPhoneCloseInsertImage(inset, shot) {
    const lv = inset.grade || shot?.lightVariant || currentLightVariant || 'day';
    if (inset.liveViewFile) {
      const scale = inset.fixedCssRect?.scale ?? activeScale;
      const dw = 60 * scale;
      const dh = 58 * scale;
      const ox = inset.screenOffsetX ?? 0;
      const oy = inset.screenOffsetY ?? 0;
      const x = Math.round((stageW - dw) / 2 + ox);
      const y = inset.topBias != null
        ? Math.round(stageH * inset.topBias + oy)
        : Math.round((stageH - dh) / 2 - 8 + oy);
      const im = fileImages[inset.liveViewFile];
      if (im) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(im, 0, 0, im.width, im.height, x, y, dw, dh);
        return true;
      }
    }
    if (inset.logical) {
      // a sub-shot insert is its own shot: size it from the viewport and the art's own frame, never from the
      // backdrop crop's zoom (d2/a3 under crop k10 drew the laptop 600 px wide with its price off-screen)
      let spec = null;
      let im = null;
      try {
        spec = resolveAsset(spriteManifest, insertLogicalAt(inset.logical, sceneT), { lightVariant: lv });
        im = spec.source === 'atlas' ? atlasImages[spec.atlas] : fileImages[spec.file];
      } catch { spec = null; }
      if (!spec || !im) return false;
      const fw = spec.frame?.w ?? im.width;
      const fh = spec.frame?.h ?? im.height;
      const scale = inset.fixedCssRect?.scale
        ?? (inset.backdropDim > 0 ? Math.max(1, Math.min(Math.floor((stageW * 0.8) / fw), Math.floor((stageH * 0.75) / fh))) : activeScale);
      const dw = fw * scale;
      const dh = fh * scale;
      const ox = inset.screenOffsetX ?? 0;
      const oy = inset.screenOffsetY ?? 0;
      const x = Math.round((stageW - dw) / 2 + ox);
      const y = inset.topBias != null
        ? Math.round(stageH * inset.topBias + oy)
        : Math.round((stageH - dh) / 2 - 8 + oy);
      lastCloseInsertOrigin = { x, y, scale };
      globalThis.__A411_INSERT_PROBE = { shotId: shot?.id ?? null, insertId: inset.insertId ?? null, x, y, w: dw, h: dh, scale, viewW: stageW, viewH: stageH, caption: null, overlays: [], dim: inset.backdropDim || 0 };
      ctx.imageSmoothingEnabled = false;
      if (spec.frame) ctx.drawImage(im, spec.frame.x, spec.frame.y, fw, fh, x, y, dw, dh);
      else ctx.drawImage(im, 0, 0, im.width, im.height, x, y, dw, dh);
      if (spec.textRect) drawInsertText(inset, spec.textRect, x, y, scale, shot, spec.nameRect);
      // insert overlays (e.g. laptop product image at the tile's imageSlot) are part of the insert: same origin + scale
      for (const d of shot?.stage?.sitcomOverlay?.draws || []) {
        if (d.kind !== 'laptop_overlay') continue;
        try {
          const os = resolveAsset(spriteManifest, d.asset, { lightVariant: lv });
          const oim = os.source === 'atlas' ? atlasImages[os.atlas] : fileImages[os.file];
          if (!oim) throw new Error(`overlay ${d.asset} not loaded`);
          const ow = os.frame?.w ?? oim.width; const oh = os.frame?.h ?? oim.height;
          if (os.frame) ctx.drawImage(oim, os.frame.x, os.frame.y, ow, oh, x + d.slot[0] * scale, y + d.slot[1] * scale, ow * scale, oh * scale);
          else ctx.drawImage(oim, 0, 0, ow, oh, x + d.slot[0] * scale, y + d.slot[1] * scale, ow * scale, oh * scale);
          globalThis.__A411_INSERT_PROBE.overlays.push(d.asset);
        } catch (err) {
          if (sitcomStrictMode()) recordSitcomStrictError(d, err, shot?.subshot?.beat ?? shot?.id);
        }
      }
      return true;
    }
    const logical = `prop.insert.photo_plant_tail.${lv}`;
    let spec;
    try {
      spec = resolveAsset(spriteManifest, logical, { lightVariant: lv });
    } catch {
      spec = resolveAsset(spriteManifest, 'prop.insert.photo_plant_tail.day', { lightVariant: 'day' });
    }
    const im = spec.source === 'file' ? fileImages[spec.file] : null;
    if (!im) return false;
    const scale = inset.fixedCssRect?.scale ?? PHONE_PLANT_TAIL_OVERLAY_SCREEN.cssScale;
    const dw = inset.fixedCssRect?.w ?? im.width * scale;
    const dh = inset.fixedCssRect?.h ?? im.height * scale;
    let x;
    let y;
    if (inset.fixedCssRect) {
      x = inset.fixedCssRect.x;
      y = inset.fixedCssRect.y;
    } else {
      const ox = inset.screenOffsetX ?? 0;
      const oy = inset.screenOffsetY ?? 0;
      x = Math.round((stageW - dw) / 2 + ox);
      y = inset.topBias != null
        ? Math.round(stageH * inset.topBias + oy)
        : Math.round((stageH - dh) / 2 - 8 + oy);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, 0, 0, im.width, im.height, x, y, dw, dh);
    return true;
  }

  function drawPhoneScreenInsert(shot) {
    const inset = shot.phoneInsert;
    if (!inset) return;
    const waiting = phoneInsertWaitingAsset(inset);
    const plantTail = inset.assetId === 'phone_photo_plant_tail';
    const closeInsert = inset.mode === 'closeInsert' || inset.flashMemory;
    const fullBleed = !!inset.fullBleed;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (closeInsert && fullBleed && !waiting && !plantTail) {
      if (inset.backdropDim > 0 && !insertAssetReady(inset)) {
        // a missing insert asset is a STRICT failure: log it, fail the beat, never dim an empty frame
        recordSitcomStrictError({ kind: 'insert', asset: inset.logical }, new Error('insert asset missing (no loaded pack has it)'), shot?.subshot?.beat ?? shot?.id);
        globalThis.__A411_INSERT_PROBE = { shotId: shot?.id ?? null, insertId: inset.insertId ?? null, drawn: false, missing: true };
        ctx.restore();
        return;
      }
      if (inset.backdropDim > 0) {
        // fix17: front set pieces belong to the stage behind the insert, so they are dimmed with it
        drawSitcomOverlay(getStageForShot(shot), sceneT, 'front');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // subshots: insert is its own shot; backdrop held at ~60 % with the existing fade black (no new colour)
        ctx.fillStyle = `rgba(0, 0, 0, ${inset.backdropDim})`;
        ctx.fillRect(0, 0, stageW, stageH);
      }
      const drew = drawPhoneCloseInsertImage(inset, shot);
      if (globalThis.__A411_INSERT_PROBE?.shotId === (shot?.id ?? null)) globalThis.__A411_INSERT_PROBE.drawn = drew !== false;
      if (drew !== false && inset.backdropDim > 0) {
        // the sub-shot owns its insert caption (the plant-tail path already did; full-bleed inserts never drew it)
        const stageDef = getStageForShot(shot);
        drawSitcomInsertCaption(stageDef);
      }
      ctx.restore();
      return;
    }
    if (plantTail && closeInsert && fullBleed && !waiting) {
      drawPhoneCloseInsertImage(inset, shot);
      ctx.restore();
      return;
    }
    let bezelW;
    let bezelH;
    let x;
    let y;
    if (plantTail && !waiting) {
      if (!closeInsert) {
        const screen = phonePlantTailOverlayScreenRect(inset);
        lastPhonePlantTailOverlayScreenRect = { ...screen, shotId: shot.id };
        const pad = inset.compactFrame ? 6 : 10;
        bezelW = screen.w + pad * 2;
        bezelH = screen.h + pad * 2 + 8;
        x = screen.x - pad;
        y = screen.y - pad;
      } else {
        const scale = PHONE_PLANT_TAIL_OVERLAY_SCREEN.cssScale;
        const dw = 60 * scale;
        const dh = 58 * scale;
        const pad = 14;
        bezelW = dw + pad * 2;
        bezelH = dh + pad * 2 + 10;
        const ox = inset.screenOffsetX ?? 0;
        const oy = inset.screenOffsetY ?? 0;
        x = Math.round((stageW - bezelW) / 2 + ox);
        y = inset.topBias != null
          ? Math.round(stageH * inset.topBias + oy) - pad
          : Math.round((stageH - bezelH) / 2 - 8 + oy);
        lastPhonePlantTailOverlayScreenRect = null;
      }
    } else {
      bezelW = inset.width ?? Math.min(stageW - 48, 200);
      bezelH = inset.height ?? Math.min(stageH - 40, 220);
      x = (stageW - bezelW) / 2;
      y = inset.topBias != null ? stageH * inset.topBias : (stageH - bezelH) / 2 - 8;
      lastPhonePlantTailOverlayScreenRect = null;
    }
    ctx.fillStyle = '#101820';
    ctx.strokeStyle = '#c8d4e4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + bezelW - 10, y);
    ctx.quadraticCurveTo(x + bezelW, y, x + bezelW, y + 10);
    ctx.lineTo(x + bezelW, y + bezelH - 10);
    ctx.quadraticCurveTo(x + bezelW, y + bezelH, x + bezelW - 10, y + bezelH);
    ctx.lineTo(x + 10, y + bezelH);
    ctx.quadraticCurveTo(x, y + bezelH, x, y + bezelH - 10);
    ctx.lineTo(x, y + 10);
    ctx.quadraticCurveTo(x, y, x + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (waiting) {
      ctx.restore();
      return;
    }
    if (plantTail && closeInsert) {
      drawPhoneCloseInsertImage(inset, shot);
      const stageDef = getStageForShot(shot);
      drawSitcomInsertCaption(stageDef);
      drawSitcomOverlay(stageDef, sceneT, 'front');
      const tone = inset.skipVeil ? null : (shot.desaturate ?? inset.desaturate);
      if (tone != null && !inset.skipVeil) {
        ctx.fillStyle = `rgba(90, 90, 98, ${tone})`;
        ctx.fillRect(0, 0, stageW, stageH);
      }
      ctx.restore();
      return;
    }
    if (plantTail) {
      const screen = lastPhonePlantTailOverlayScreenRect || phonePlantTailOverlayScreenRect(inset);
      const file = 'sitcom_pieces/x1/prop_photo_plant_tail_screen.png';
      if (!drawPhoneOverlayFileImage(file, screen)) {
        ctx.restore();
        return;
      }
      ctx.restore();
      return;
    }
    if (inset.screenGlow) {
      ctx.fillStyle = 'rgba(120, 180, 255, 0.35)';
      ctx.fillRect(x + 8, y + 8, bezelW - 16, bezelH - 16);
    }
    ctx.fillStyle = '#7ec86a';
    ctx.fillRect(x + 16, y + bezelH * 0.35, bezelW - 32, bezelH * 0.28);
    if (inset.tail !== false) {
      ctx.fillStyle = '#e8883a';
      ctx.beginPath();
      ctx.moveTo(x + bezelW - 28, y + bezelH * 0.52);
      ctx.lineTo(x + bezelW - 8, y + bezelH * 0.48);
      ctx.lineTo(x + bezelW - 12, y + bezelH * 0.62);
      ctx.closePath();
      ctx.fill();
    }
    const cap = inset.caption;
    if (cap && !/zoom|plante|queue|photo/i.test(String(cap))) {
      ctx.fillStyle = '#dce8f4';
      ctx.font = '600 9px "Noto Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cap, x + bezelW / 2, y + 14);
    }
    ctx.restore();
  }

  function drawSplitHookFrame(shot) {
    const split = shot.splitHook;
    if (!split) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shot.id === 'done') {
      drawPhoneScreenInsert({
        ...shot,
        phoneInsert: {
          ...split.top,
          mode: 'closeInsert',
          fullBleed: true,
          skipVeil: true,
          fixedCssRect: split.top?.fixedCssRect ?? { x: 76, y: 184, w: 240, h: 232 }
        }
      });
      ctx.restore();
      return;
    }
    const mid = stageH * (split.ratio ?? 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, stageW, mid);
    ctx.clip();
    drawPhoneScreenInsert({
      phoneInsert: {
        ...split.top,
        topBias: split.top?.topBias ?? 0.12,
        width: split.top?.width ?? (stageW - 48),
        height: split.top?.height ?? (mid - 20)
      }
    });
    ctx.restore();
    if (split.rooftopEvening && currentShotDef?.id !== 'done') {
      drawRooftopEveningInset(mid, stageH);
    } else if (split.bottomPlaceholder) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, mid, stageW, stageH - mid);
      ctx.clip();
      drawPlaceholderPanel(split.bottomPlaceholder, '#8a6a4a');
      ctx.restore();
    }
    ctx.strokeStyle = '#22303a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(stageW, mid);
    ctx.stroke();
    ctx.restore();
  }

  function drawShotSceneOverlays(shot, t) {
    if (!shot) return;
    const local = t - shot.t0;
    if (shot.placeholderSet) {
      drawPlaceholderPanel(shot.placeholderSet);
      return;
    }
    if (shot.splitHook) {
      drawSplitHookFrame(shot);
      return;
    }
    if (shot.phoneInsert) drawPhoneScreenInsert(shot);
    const flash = shot.flashCut;
    if (flash && local >= flash.at && local < flash.at + flash.duration) {
      if (flash.stairwellFlash) {
        drawStairwellFlashFrame(flash);
      } else {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = `rgba(120, 120, 130, ${flash.desaturate ?? 0.82})`;
        ctx.fillRect(0, 0, stageW, stageH);
        drawPlaceholderPanel(flash.placeholderLabel || 'stairwell (placeholder)', '#d8dce8');
        ctx.restore();
      }
    }
  }

  function render(now) {
    if (!CFG) return;
    if (phase === 'overlay') {
      const crop = CFG.startCrop || CFG.shots[0].crop;
      layoutCrop(crop, CFG.startCrop ? {} : CFG.shots[0]);
      fillFrameAmbient(false);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(activeOx, activeOy);
      ctx.scale(activeScale, activeScale);
      ctx.translate(-crop.x, -crop.y);
      drawBackdrop();
      paintCropFloor(false);
      const shot = { stage: CFG.defaultStage || {} };
      drawSceneContent(0, shot);
      ctx.restore();
      bctx.clearRect(0, 0, stageW, stageH);
      drawLineupLabels(shot);
    } else {
      const shot = shotAtTime(sceneT);
      if (!shot) return;
      const doneInsert = shot.id === 'done' && shot.splitHook?.top;
      const insertRect = doneInsert
        ? (shot.splitHook.top.fixedCssRect ?? { x: 76, y: 184, w: 240, h: 232 })
        : null;
      if (insertRect) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.rect(0, insertRect.y + insertRect.h, stageW, stageH - insertRect.y - insertRect.h);
        ctx.rect(0, 0, stageW, insertRect.y);
        ctx.clip('evenodd');
        renderSceneLayer(kitchenShotRenderCrop(shot), sceneT, shot);
        ctx.restore();
      } else {
        renderSceneLayer(kitchenShotRenderCrop(shot), sceneT, shot);
      }
      drawShotSceneOverlays(shot, sceneT);
      drawBubbles(sceneT);
      drawTapRing(now);
    }
    if (fadeAlpha > 0) {
      fadeVeil.hidden = false;
      fadeVeil.style.opacity = String(Math.min(1, fadeAlpha));
    } else {
      fadeVeil.hidden = true;
      fadeVeil.style.opacity = '0';
    }
  }

  function showEndCard() {
    if (!CFG.endCard) return;
    endTitle.textContent = CFG.endCard.title || '';
    endBody.textContent = CFG.endCard.body || '';
    endCard.hidden = false;
  }

  function startScene() {
    ensureAudio();
    previewHold = tapAdvanceMode;
    phase = 'play';
    sceneT = 0;
    lastFrame = performance.now();
    fadeAlpha = 0;
    playedAudio = new Set();
    overlay.hidden = true;
    endCard.hidden = true;
    fadeVeil.hidden = true;
  }

  function resetScene() {
    previewHold = false;
    phase = 'overlay';
    sceneT = 0;
    fadeAlpha = 0;
    endCard.hidden = true;
    overlay.hidden = false;
    fadeVeil.hidden = true;
    render(performance.now());
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const prevT = sceneT;

    if (!previewHold && phase === 'play' && !tapAdvanceMode) {
      sceneT += dt;
      processAudio(sceneT, prevT);
      updateTapRing(sceneT);
      const end = sceneEnd();
      if (CFG.endCard && sceneT >= end - 0.8) fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
      if (sceneT >= end) {
        phase = 'done';
        if (CFG.endCard) showEndCard();
      }
    }

    animFrame = now;
    render(now);
    requestAnimationFrame(tick);
  }

  function setPhaseForT(t) {
    if (t >= sceneEnd()) phase = 'done';
    else phase = 'play';
  }

  function previewAt(t) {
    previewHold = true;
    sceneT = t;
    setPhaseForT(t);
    fadeAlpha = t >= sceneEnd() - 0.5 ? 1 : 0;
    endCard.hidden = true;
    overlay.hidden = true;
    updateTapRing(t);
    render(performance.now());
  }

  function getActorFeetBandPercents() {
    const shot = shotAtTime(sceneT);
    const stageDef = getStageForShot(shot);
    const bandTop = bubbleBandH;
    const bandH = stageH;
    const details = [];
    for (const [name, def] of Object.entries(stageDef.actors || {})) {
      if (!def) continue;
      const asset = String(def.asset || '');
      if (asset.includes('sit_table') || /\.sit\b/.test(asset)) continue;
      const box = actorSceneBounds(spriteManifest, name, def, sceneT);
      if (!box) {
        details.push({ shot: shot.id, actor: name, feetPct: null });
        continue;
      }
      const feetSceneY = box.y + box.h - 1;
      const feetCss = activeOy + (feetSceneY - activeCrop.y) * activeScale;
      const feetPct = bandH > 0 ? ((feetCss - bandTop + 1) / bandH) * 100 : null;
      details.push({
        shot: shot.id,
        actor: name,
        feetY: feetCss,
        feetPct,
        bandTop,
        bandH
      });
    }
    return details;
  }

  function nextAdvanceCue(after) {
    const t = after ?? sceneT;
    for (const cue of advanceCueTimes) {
      if (cue > t + 0.05) return cue;
    }
    return null;
  }

  const api = {
    onAdvanceTap: null,
    PHONE_PLANT_TAIL_OVERLAY_SCREEN,
    getPhonePlantTailOverlayScreenRect: () => lastPhonePlantTailOverlayScreenRect,
    getPhase: () => phase,
    getT: () => sceneT,
    getShot: () => shotAtTime(sceneT).id,
    start: startScene,
    enableTapAdvance(on) {
      tapAdvanceMode = !!on;
      if (CFG?.tapAdvance) tapAdvanceMode = true;
      previewHold = tapAdvanceMode;
      if (tapAdvanceMode) {
        const bubbleT = (CFG.bubbles || []).map((b) => b.t0);
        const audioT = (CFG.audio || []).map((a) => a.t);
        advanceCueTimes = [...new Set([...bubbleT, ...audioT])].sort((a, b) => a - b);
      }
      render(performance.now());
    },
    advanceTap() {
      if (typeof api.onAdvanceTap === 'function') {
        api.onAdvanceTap();
        return;
      }
      const next = nextAdvanceCue();
      if (next != null) previewAt(next);
      else {
        phase = 'done';
        if (CFG.endCard) showEndCard();
      }
      render(performance.now());
    },
    playClip(id) {
      playClip(id);
    },
    setT(t) {
      previewAt(t);
    },
    setShot(id) {
      const sh = CFG.shots.find((s) => s.id === id);
      if (!sh) return;
      previewAt((sh.t0 + sh.t1) / 2);
    },
    enableTapRing(on) {
      idleGlow = !!on;
      if (tapRingTarget == null && CFG.taps?.[0]) tapRingTarget = CFG.taps[0].rect;
      render(performance.now());
    },
    getConfig: () => CFG,
    getFramingMetrics,
    getFrameMetrics,
    getShotRenderInfo() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      return {
        shotId: shot.id,
        props: [...stageDef.props],
        crop: { ...activeCrop },
        drawnProps: Object.fromEntries([...drawnPropBoxes].map(([k, v]) => [k, { left: v.left, top: v.top, w: v.w, h: v.h }]))
      };
    },
    getKitchenStageCropGate() {
      const { w: SW, h: SH } = kitchenStageSize();
      const c = activeCrop || {};
      const ok = c.x != null && c.y != null && c.w != null && c.h != null
        && c.x >= 0 && c.y >= 0
        && c.x + c.w <= SW && c.y + c.h <= SH;
      return { stageW: SW, stageH: SH, crop: { x: c.x, y: c.y, w: c.w, h: c.h }, ok };
    },
    getBubbleScreenMetrics: () => ({ ...lastBubbleMetrics }),
    getDrawnLine: () => (lastDrawnLine ? { ...lastDrawnLine } : null),
    getAimFrame: () => (lastAimFrame ? { ...lastAimFrame } : null),
    getCatDraws: () => catDrawLog.map((r) => ({ ...r })),
    getBandArt: () => ({ stageTopFill: lastBandStageTopFill, rows: lastBandArtRows, bandH: bubbleBandH, k: lastBandArt?.k ?? null, kitchen: isKitchenSet() }),
    getLightGhostPx: () => {
      kitchenMoonDrawn = lastKitchenMoonDrawn;
      let m; try { m = isKitchenSet() ? getKitchenLightMapsFull() : null; } finally { kitchenMoonDrawn = null; }
      return m && m.multFull && m.key !== 'day' && !(lastKitchenMoonDrawn ?? moonWindowInCrop(activeCrop)) ? moonShaftPixels(m.multFull, m.sw, m.sh, false) : 0;
    },
    getMoonInFrame: () => lastKitchenMoonDrawn ?? moonWindowInCrop(activeCrop),
    getMoonShaftPx: () => {
      kitchenMoonDrawn = lastKitchenMoonDrawn;
      let m; try { m = isKitchenSet() ? getKitchenLightMapsFull() : null; } finally { kitchenMoonDrawn = null; }
      return m && m.multFull && m.key !== 'day' ? moonShaftPixels(m.multFull, m.sw, m.sh, false) : 0;
    },
    getActiveCrop: () => (activeCrop ? { x: activeCrop.x, y: activeCrop.y, w: activeCrop.w, h: activeCrop.h, k: activeScale, ...(activeCrop.relation ? { relation: activeCrop.relation } : {}) } : null),
    getViewMap: () => ({ crop: activeCrop ? { x: activeCrop.x, y: activeCrop.y, w: activeCrop.w, h: activeCrop.h } : null, scale: activeScale, ox: activeOx, oy: activeOy }),
    getPhoneBubbleGate() {
      const shot = shotAtTime(sceneT);
      const inset = shot?.phoneInsert;
      const photoStage = inset
        ? phoneInsertPhotoStageRect(inset)
        : lastPhonePlantTailOverlayScreenRect;
      const bb = lastBubbleMetrics?.bubbleBbox;
      if (!photoStage || !bb) {
        return { ok: true, skipped: true, reason: 'no_phone_or_bubble' };
      }
      const bubbleBand = { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
      const photoScene = {
        x: photoStage.x,
        y: photoStage.y + bubbleBandH,
        w: photoStage.w,
        h: photoStage.h
      };
      const intersects = screenRectsOverlap(bubbleBand, photoScene, 0);
      const inspect = this.inspectP1RShotGates();
      let speakerHeadVisible = !!inspect.speakerVisible;
      if (speakerHeadVisible && inspect.speakerBbox) {
        if (screenRectsOverlap(inspect.speakerBbox, photoScene, 0)) speakerHeadVisible = false;
      }
      return {
        ok: !intersects && speakerHeadVisible,
        intersects,
        speakerHeadVisible,
        photo: photoScene,
        bubble: bubbleBand
      };
    },
    getKitchenWallDecorVisible() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const crop = activeCrop;
      if (crop?.x == null) return { clock: false, frame: false, house_rules: false, visible: [] };
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      const ids = ['clock', 'frame', 'house_rules'];
      const visible = [];
      for (const id of ids) {
        if (!stageDef.props.includes(id)) continue;
        const p = catalog[id];
        if (!p) continue;
        const box = propSceneBounds(spriteManifest, p, lv);
        if (box && kitchenPropFullyInsideCrop(box, crop, 2)
          && kitchenSmallPropVisibleInSceneBand(id, p)) visible.push(id);
      }
      return {
        clock: visible.includes('clock'),
        frame: visible.includes('frame'),
        house_rules: visible.includes('house_rules'),
        visible
      };
    },
    getKitchenDiscreteContentGate() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      const margin = 2;
      const bandLeft = 0;
      const bandRight = stageW;
      const bandTop = 0;
      const bandBottom = stageH;
      const edgeOf = (rect) => {
        const touches = [];
        if (rect.x <= bandLeft + margin) touches.push('left');
        if (rect.x + rect.w >= bandRight - margin) touches.push('right');
        if (rect.y <= bandTop + margin) touches.push('top');
        if (rect.y + rect.h >= bandBottom - margin) touches.push('bottom');
        return touches;
      };
      const clips = [];
      const noteRect = (kind, id, rect) => {
        const edges = edgeOf(rect);
        if (!edges.length) return;
        const inBand = rect.x + rect.w > bandLeft + margin && rect.x < bandRight - margin
          && rect.y + rect.h > bandTop + margin && rect.y < bandBottom - margin;
        if (!inBand) return;
        clips.push({ kind, id, edges });
      };
      for (const id of stageDef.props || []) {
        if (!KITCHEN_SMALL_DISCRETE_PROPS.has(id)) continue;
        const p = catalog[id];
        if (!p) continue;
        const box = propSceneBounds(spriteManifest, p, lv);
        if (!box) continue;
        const tl = sceneToScreen(box.x, box.y);
        const br = sceneToScreen(box.x + box.w, box.y + box.h);
        noteRect('prop', id, {
          x: tl.x,
          y: tl.y,
          w: br.x - tl.x,
          h: br.y - tl.y
        });
      }
      for (const [name, def] of Object.entries(stageDef.actors || {})) {
        if (!def) continue;
        const box = actorSceneBounds(spriteManifest, name, def, sceneT);
        if (!box) continue;
        const tl = sceneToScreen(box.x, box.y);
        const br = sceneToScreen(box.x + box.w, box.y + box.h);
        noteRect('actor', name, {
          x: tl.x,
          y: tl.y,
          w: br.x - tl.x,
          h: br.y - tl.y
        });
      }
      const bb = lastBubbleMetrics?.bubbleBbox;
      if (bb && bb.w > 8 && bb.h > 8) {
        noteRect('bubble', 'speech', bb);
      }
      return { shotId: shot.id, clips };
    },
    getActorExpectedScreenBoxes() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const out = [];
      for (const [name, def] of Object.entries(stageDef.actors || {})) {
        if (!def) continue;
        const box = actorSceneBounds(spriteManifest, name, def, sceneT);
        if (!box) continue;
        const tl = sceneToScreen(box.x, box.y);
        const br = sceneToScreen(box.x + box.w, box.y + box.h);
        out.push({
          name,
          x: Math.round(tl.x),
          y: Math.round(tl.y),
          w: Math.round(br.x - tl.x),
          h: Math.round(br.y - tl.y)
        });
      }
      return out;
    },
    getFurnitureLegProbes() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      const floorY = Math.round(activeOy + ((CFG.room?.floorTop ?? 136) - activeCrop.y) * activeScale);
      const probes = [];
      const legProps = ['desk', 'table', 'chair_left', 'chair_right'];
      for (const id of legProps) {
        if (!stageDef.props?.includes(id)) continue;
        const p = catalog[id];
        if (!p) continue;
        const { x: px, y: py } = propDrawPosition(stageDef, id, p);
        const box = propSceneBounds(spriteManifest, { ...p, x: px, y: py }, lv);
        if (!box) continue;
        const xs = [box.x + 2, box.x + box.w - 2];
        for (const sx of xs) {
          const foot = sceneToScreen(sx, box.y + box.h - 1);
          probes.push({
            id,
            x: Math.round(foot.x),
            y: Math.round(foot.y),
            floorY
          });
        }
      }
      return probes;
    },
    getStandingActorFeetFracs() {
      return getActorFeetBandPercents().map((r) => ({
        key: r.actor,
        feetFrac: r.feetPct != null ? r.feetPct / 100 : null,
        feetY: r.feetY
      }));
    },
    getActorFeetBandPercents,
    getSceneBandRect() {
      return { top: bubbleBandH, height: stageH, width: stageW };
    },
    getPlacementGates() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      const floorTopScene = CFG.room?.floorTop ?? spriteManifest?.kitchenStage?.feetLine ?? 136;
      const floorLineY = Math.round(activeOy + (floorTopScene - activeCrop.y) * activeScale);
      const supportSurfaceYAt = (sx, feetSceneY) => {
        let surface = floorTopScene;
        const tryProp = (id, topOffset = 0) => {
          if (!stageDef.props?.includes(id)) return;
          const p = catalog[id];
          if (!p) return;
          const box = propSceneBounds(spriteManifest, p, lv);
          if (!box || sx < box.x - 10 || sx > box.x + box.w + 14) return;
          surface = Math.min(surface, box.y + topOffset);
        };
        if (stageDef.props?.includes('laptop')) {
          const lp = catalog.laptop;
          const box = lp ? propSceneBounds(spriteManifest, lp, lv) : null;
          if (box && sx >= box.x - 10 && sx <= box.x + box.w + 14) {
            const keyboardY = box.y + box.h - 2;
            surface = Math.min(surface, keyboardY);
          }
        }
        tryProp('desk', -4);
        tryProp('table', -4);
        tryProp('counter', -4);
        tryProp('shelf', -4);
        tryProp('bench', -6);
        return surface;
      };
      const rectMinGap = (a, b) => {
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX > 0 && overlapY > 0) return -Math.min(overlapX, overlapY);
        const gapX = overlapX > 0 ? 0 : Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
        const gapY = overlapY > 0 ? 0 : Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
        return Math.max(gapX, gapY);
      };
      const floatIssues = [];
      const catTol = 18;
      for (const [name, def] of Object.entries(stageDef.actors || {})) {
        if (!def || name !== 'cat') continue;
        const feetSceneY = def.y;
        if (feetSceneY == null) continue;
        const floorTop = CFG.room?.floorTop ?? spriteManifest?.kitchenStage?.feetLine ?? 136;
        if (isStairwellSet() && feetSceneY < floorTop - 5) continue;
        if (Math.abs(feetSceneY - floorTop) <= 3) continue;
        const sx = def.x;
        const surfaceSceneY = supportSurfaceYAt(sx, feetSceneY);
        if (Math.abs(feetSceneY - surfaceSceneY) > catTol) {
          floatIssues.push({
            kind: 'actor',
            id: name,
            feetY: feetSceneY,
            surfaceY: surfaceSceneY
          });
        }
      }
      let catHeadGapPx = null;
      const catDef = stageDef.actors?.cat;
      if (catDef) {
        const catBox = actorSceneBounds(spriteManifest, 'cat', catDef, sceneT);
        if (catBox) {
          const catTl = sceneToScreen(catBox.x, catBox.y);
          const catBr = sceneToScreen(catBox.x + catBox.w, catBox.y + catBox.h);
          const catRect = {
            x: catTl.x,
            y: catTl.y,
            w: catBr.x - catTl.x,
            h: catBr.y - catTl.y
          };
          let minGap = Infinity;
          for (const [hname, hdef] of Object.entries(stageDef.actors || {})) {
            if (!hdef || hname === 'cat') continue;
            const hAsset = String(hdef.asset || '');
            if (hAsset.includes('sit_table') || /\.sit\b/.test(hAsset)) continue;
            const hBox = actorSceneBounds(spriteManifest, hname, hdef, sceneT);
            if (!hBox) continue;
            const headH = Math.max(6, hBox.h * 0.4);
            const head = {
              x: activeOx + (hBox.x - activeCrop.x) * activeScale,
              y: activeOy + (hBox.y - activeCrop.y) * activeScale,
              w: (hBox.w) * activeScale,
              h: headH * activeScale
            };
            minGap = Math.min(minGap, rectMinGap(catRect, head));
          }
          catHeadGapPx = minGap === Infinity ? null : minGap;
        }
      }
      return {
        floorLineY,
        floatIssues,
        floatOk: floatIssues.length === 0,
        catHeadGapPx,
        catHeadGapOk: catHeadGapPx == null || catHeadGapPx >= 8
      };
    },
    /** fix23f: stage-px actor boxes (map px) for the table-pool head-straddle scan; light variant + kitchen flag. */
    getActorStageBoxes() {
      const shot = shotAtTime(sceneT); const stageDef = getStageForShot(shot); const out = [];
      for (const [name, def] of Object.entries(stageDef.actors || {})) { if (!def) continue; const staged = actorDrawDef(name, def); if (!staged || staged.x == null) continue;
        const b = actorSceneBounds(spriteManifest, name, staged, sceneT); if (!b) continue; out.push({ name, asset: String(staged.asset || ''), x: b.x, y: b.y, w: b.w, h: b.h }); }
      return { light: isKitchenSet() ? kitchenLightMapKey(currentLightVariant, shot) : currentLightVariant, variant: currentLightVariant, kitchen: isKitchenSet(), crop: activeCrop && { ...activeCrop }, actors: out };
    },
    getActorScreenBboxesForGate() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const out = [];
      for (const [name, def] of Object.entries(stageDef.actors || {})) {
        if (!def) continue;
        const ra = resolvedActorScreen(name, def, sceneT); // same resolved position the bubble anchor reads
        if (!ra) continue;
        out.push({
          name,
          x: Math.round(ra.bbox.x),
          y: Math.round(ra.bbox.y + bubbleBandH),
          w: Math.round(ra.bbox.w),
          h: Math.round(ra.bbox.h),
          headCenterX: Math.round(ra.headCenterX),
          headTop: Math.round(ra.speakerTop + bubbleBandH)
        });
      }
      return out;
    },
    debugSpeakerAnchor(who) {
      const r = resolveBubbleSpeaker({ actor: who, anchor: who }, sceneT); if (!r) return null;
      return { def: { x: r.def.x, y: r.def.y, asset: r.def.asset }, drawDef: (({ x, y }) => ({ x, y }))(actorDrawDef(r.stageActorKey, r.def)),
        ov: bandAnchorOverrides?.actors?.[r.stageActorKey] ?? null, bounds: actorScreenBounds(r.stageActorKey, r.def, sceneT),
        mask: actorHeadFromMask(r.stageActorKey, r.def, sceneT), crop: activeCrop && { ...activeCrop }, scale: activeScale, ox: activeOx, oy: activeOy };
    },
    getSpeakerGateProbe(speakerLineId) {
      const resolved = resolveBubbleSpeaker({ actor: speakerLineId, anchor: speakerLineId }, sceneT);
      if (!resolved) return null;
      const anchor = bubbleAnchor({ actor: speakerLineId, anchor: speakerLineId }, sceneT);
      const cx = anchor.headCenterX;
      const top = anchor.speakerTop;
      if (cx == null || top == null) return null;
      const spriteRect = {
        x: Math.round(cx - 26),
        y: Math.round(top - 10),
        w: 52,
        h: 40
      };
      return {
        speakerLineId,
        stageActorKey: resolved.stageActorKey,
        characterId: resolved.characterId,
        spriteRect
      };
    },
    inspectActorSprites() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const lv = kitchenAssetLightVariant(shot);
      const out = [];
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def) continue;
        const character = def.character || name;
        const layers = resolveActorLayers(spriteManifest, { ...def, actor: character }, {
          time: sceneT,
          talking: actorIsTalking(name, def, CFG.bubbles, sceneT)
        });
        const resolved = [];
        for (const layer of layers) {
          try {
            const spec = resolveAsset(spriteManifest, layer, {
              lightVariant: lv,
              frameIndex: assetFrameIndex(spriteManifest, layer, sceneT, def.frameIndex)
            });
            resolved.push({
              layer,
              file: spec?.file ?? null,
              source: spec?.source ?? null
            });
          } catch {
            resolved.push({ layer, file: null, source: null });
          }
        }
        out.push({
          stageKey: name,
          character,
          characterCanonical: actorId(character),
          asset: def.asset ?? null,
          x: def.x,
          y: def.y,
          flip: !!def.flip,
          layers: resolved
        });
      }
      return out;
    },
    inspectP1RShotGates(t = sceneT) {
      const shot = shotAtTime(t);
      const stageDef = getStageForShot(shot);
      const bubbles = activeBubbles(t);
      const b = bubbles[bubbles.length - 1];
      let speakerId = '—';
      let speakerVisible = false;
      let speakerBbox = null;
      let feetOrChairVisible = false;
      if (b) {
        const resolved = resolveBubbleSpeaker(b, t);
        speakerId = resolved?.speakerLineId ?? b.actor ?? b.anchor ?? (b.kind === 'narrator' ? 'narrator' : '—');
        if (resolved?.def) {
          const mask = actorHeadFromMask(resolved.stageActorKey, resolved.def, t);
          const fullBox = mask?.bboxCss;
          if (fullBox) {
            speakerBbox = {
              x: Math.round(fullBox.x),
              y: Math.round(fullBox.y + bubbleBandH),
              w: Math.round(fullBox.w),
              h: Math.round(fullBox.h)
            };
            const visRight = activeOx + activeCrop.w * activeScale;
            const visBottom = activeOy + activeCrop.h * activeScale;
            speakerVisible = fullBox.x + fullBox.w > activeOx + 2
              && fullBox.x < visRight - 2
              && fullBox.y + fullBox.h > activeOy + 2
              && fullBox.y < visBottom - 2;
            const seated = actorUsesTable4Seat(resolved.def);
            const feetStageY = resolved.def.y;
            const feetScreen = activeOy + (feetStageY - activeCrop.y) * activeScale;
            const floorScreen = lastFraming?.feetY
              ?? (activeOy + ((CFG.room?.floorTop ?? 136) - activeCrop.y) * activeScale);
            feetOrChairVisible = seated || feetScreen >= floorScreen - 6 * activeScale;
          }
        }
      }
      const bm = lastBubbleMetrics || {};
      const bb = bm.bubbleBbox;
      const overlaps = { lamp: false, face: false, clock: false };
      if (bb) {
        const bubble = { x: bb.x, y: bb.y, w: bb.w, h: bb.h };
        const keepouts = kitchenBubbleKeepouts(stageDef, t);
        const pendant = pendantShadeScreenLayout(t);
        if (pendant?.keepouts?.[0] && screenRectsOverlap(bubble, pendant.keepouts[0], 0)) {
          overlaps.lamp = true;
        }
        for (const [key, def] of Object.entries(stageDef.actors || {})) {
          if (!def) continue;
          const head = actorHeadFromMask(key, def, t);
          if (!head?.bboxCss) continue;
          const face = {
            x: head.bboxCss.x - 4,
            y: head.bboxCss.y + bubbleBandH - 4,
            w: head.bboxCss.w + 8,
            h: head.bboxCss.h + 8
          };
          if (screenRectsOverlap(bubble, face, 0)) overlaps.face = true;
        }
        const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
        const lv = shotLightVariant(shot);
        const clockP = catalog.clock;
        if (clockP) {
          const box = propSceneBounds(spriteManifest, clockP, lv);
          if (box) {
            const tl = sceneToScreen(box.x, box.y);
            const br = sceneToScreen(box.x + box.w, box.y + box.h);
            const clock = {
              x: tl.x - 8,
              y: tl.y + bubbleBandH - 8,
              w: br.x - tl.x + 16,
              h: br.y - tl.y + 16
            };
            if (screenRectsOverlap(bubble, clock, 0)) overlaps.clock = true;
          }
        }
      }
      const tailTip = bm.tailTipX != null
        ? { x: bm.tailTipX, y: bm.tailTipY }
        : null;
      const speakerHead = bm.speakerHeadCenterX != null
        ? { x: bm.speakerHeadCenterX, y: bm.speakerHeadTopY }
        : null;
      const tailDeltaX = tailTip && speakerHead
        ? Math.abs(tailTip.x - speakerHead.x)
        : null;
      return {
        shotId: shot.id,
        speakerId,
        speakerVisible,
        speakerBbox,
        feetOrChairVisible,
        tailTip,
        speakerHead,
        tailDeltaX,
        bubbleBbox: bb,
        bubbleOverlaps: overlaps,
        screenBubble: !!bm.screenBubble
      };
    },
    inspectContactBands() {
      const scale = activeScale || 1;
      const oy = activeOy || 0;
      const ox = activeOx || 0;
      const crop = activeCrop || { x: 0, y: 0 };
      const toScreen = (sx, sy) => ({
        x: ox + (sx - crop.x) * scale,
        y: oy + (sy - crop.y) * scale
      });
      return (lastContactPaint || []).map((item) => {
        const origin = toScreen(item.left, item.top);
        const h = item.kind === 'ellipse'
          ? Math.max(1, (item.bottom - item.top + 1) * scale)
          : Math.max(1, (item.h || 1) * scale);
        const w = item.kind === 'ellipse'
          ? Math.max(1, (item.right - item.left + 1) * scale)
          : Math.max(1, (item.w || 1) * scale);
        return {
          id: item.id,
          kind: item.kind,
          floorStanding: !!item.floorStanding,
          raised: !!item.raised,
          gray: item.gray,
          screen: { x: origin.x, y: origin.y, w, h }
        };
      });
    },
    inspectDrawnBottoms() {
      const scale = activeScale || 1;
      const oy = activeOy || 0;
      const ox = activeOx || 0;
      const crop = activeCrop || { x: 0, y: 0 };
      return drawnBottoms.map((item) => ({
        id: item.id,
        screen: {
          x: ox + (item.left - crop.x) * scale,
          y: oy + (item.sceneY - crop.y) * scale,
          w: Math.max(1, (item.right - item.left + 1) * scale),
          h: Math.max(1, scale)
        }
      }));
    },
    // fix20 (probe/test API, read-only): screen rects of the sitcom-overlay prop draws (prop.<id>.<variant>)
    inspectOverlayProps() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const lv = shotLightVariant(shot);
      const out = [];
      for (const d of stageDef.sitcomOverlay?.draws || []) {
        if (d.kind !== 'prop' || !d.asset) continue;
        const box = propSceneBounds(spriteManifest, { asset: d.asset, x: d.x, y: d.y }, lv);
        if (!box) continue;
        const tl = sceneToScreen(box.x, box.y); const br = sceneToScreen(box.x + box.w, box.y + box.h);
        out.push({ id: d.tag || String(d.asset).split('.')[1], tag: d.tag || null, asset: d.asset, screen: { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y } });
      }
      return out;
    },
    inspectKitchenProps() {
      const shot = shotAtTime(sceneT);
      const stageDef = getStageForShot(shot);
      const catalog = Object.fromEntries((CFG.props || []).map((p) => [p.id, p]));
      const lv = shotLightVariant(shot);
      const floorY = CFG.room?.floorTop ?? 136;
      const floorScreen = lastFraming?.feetY ?? (activeOy + (floorY - activeCrop.y) * activeScale);
      const out = [];
      for (const id of stageDef.props) {
        const p = catalog[id];
        if (!p) continue;
        const box = propSceneBounds(spriteManifest, p, lv);
        if (!box) continue;
        const tl = sceneToScreen(box.x, box.y);
        const br = sceneToScreen(box.x + box.w, box.y + box.h);
        const screen = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
        const touchesFloor = screen.y + screen.h >= floorScreen - 3;
        const touchesWall = screen.y <= activeOy + (128 - activeCrop.y) * activeScale + 4;
        const inCrop = rectInsideCrop(box, activeCrop);
        const crop = activeCrop;
        const visY0 = Math.max(box.y, crop.y);
        const visY1 = Math.min(box.y + box.h, crop.y + crop.h);
        const visX0 = Math.max(box.x, crop.x);
        const visX1 = Math.min(box.x + box.w, crop.x + crop.w);
        const visH = Math.max(0, visY1 - visY0);
        const visW = Math.max(0, visX1 - visX0);
        const intersects = visH > 0 && visW > 0;
        const touchesCropEdge = intersects && (
          box.y < crop.y || box.y + box.h > crop.y + crop.h
          || box.x < crop.x || box.x + box.w > crop.x + crop.w
        );
        out.push({
          id,
          asset: p.asset,
          inCrop,
          intersectsCrop: intersects,
          visibleHeightPct: box.h > 0 ? Math.round((visH / box.h) * 1000) / 10 : 0,
          visibleWidthPct: box.w > 0 ? Math.round((visW / box.w) * 1000) / 10 : 0,
          touchesCropEdge,
          touchesFloor,
          touchesWall,
          wallAnchored: KITCHEN_WALL_ANCHORED_PROPS.has(id),
          screen,
          stageBox: box
        });
      }
      return out;
    },
    capturePixelMetrics,
    sampleStageSceneRgb(sx, sy, t = sceneT) {
      const shot = shotAtTime(t);
      renderSceneLayer(kitchenShotRenderCrop(shot), t, shot);
      const xCss = activeOx + (sx - activeCrop.x) * activeScale;
      const yCss = activeOy + (sy - activeCrop.y) * activeScale;
      const xDev = Math.min(canvas.width - 1, Math.max(0, Math.round(xCss * dpr)));
      const yDev = Math.min(canvas.height - 1, Math.max(0, Math.round(yCss * dpr)));
      const d = ctx.getImageData(xDev, yDev, 1, 1).data;
      return {
        stageX: sx,
        stageY: sy,
        rgb: [d[0], d[1], d[2]],
        screenCss: { x: xCss, y: yCss }
      };
    },
    speakerHeadCss,
    bubbleTailSpeakerHitTest(t = sceneT) {
      const bubbles = activeBubbles(t);
      const b = bubbles[bubbles.length - 1];
      if (!b || b.kind === 'narrator') return null;
      const resolved = resolveBubbleSpeaker(b, t);
      if (!resolved) return null;
      const head = actorHeadFromMask(resolved.stageActorKey, resolved.def, t);
      const bm = lastBubbleMetrics || {};
      const tailX = bm.tailTipX;
      const tailBase = bm.tailBaseY;
      if (tailX == null || tailBase == null || !head) {
        return {
          speakerLineId: resolved.speakerLineId,
          stageActorKey: resolved.stageActorKey,
          characterId: resolved.characterId,
          headCenterX: head?.headCenterX,
          tailTipX: tailX,
          hitActor: null,
          error: 'missing tail or head metrics'
        };
      }
      renderSceneLayer(shotAtTime(t).crop, t, shotAtTime(t));
      const stageDef = getStageForShot(shotAtTime(t));
      const actorColors = [];
      const mask = document.createElement('canvas');
      mask.width = canvas.width;
      mask.height = canvas.height;
      const mctx = mask.getContext('2d');
      let idx = 0;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.translate(activeOx, activeOy);
      mctx.scale(activeScale, activeScale);
      mctx.translate(-activeCrop.x, -activeCrop.y);
      for (const [name, def] of Object.entries(stageDef.actors)) {
        if (!def) continue;
        const color = maskPaletteIndex(idx++);
        drawActorMaskPixels(mctx, name, def, t, color);
        actorColors.push({ name, ...color });
      }
      const snap = mctx.getImageData(0, 0, mask.width, mask.height);
      const x0 = Math.max(0, Math.round((tailX - 20) * dpr));
      const x1 = Math.min(mask.width, Math.round((tailX + 20) * dpr));
      const y0 = 0;
      const y1 = Math.min(mask.height, Math.round((head.speakerTop + head.bboxCss.h * 0.35) * dpr));
      const counts = Object.fromEntries(actorColors.map((c) => [c.name, 0]));
      const d = snap.data;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * mask.width + x) * 4;
          if (d[i + 3] < 128) continue;
          for (const c of actorColors) {
            if (Math.abs(d[i] - c.r) + Math.abs(d[i + 1] - c.g) + Math.abs(d[i + 2] - c.b) <= 6) {
              counts[c.name]++;
            }
          }
        }
      }
      let hitActor = null;
      let best = 0;
      for (const [name, n] of Object.entries(counts)) {
        if (n > best) {
          best = n;
          hitActor = name;
        }
      }
      return {
        speakerLineId: resolved.speakerLineId,
        stageActorKey: resolved.stageActorKey,
        characterId: resolved.characterId,
        headCenterX: head.headCenterX,
        tailTipX: tailX,
        hitActor,
        hitCounts: counts,
        hitOk: hitActor === resolved.stageActorKey
      };
    },
    getSpriteManifest: () => spriteManifest,
    getHandPoint(assetName, placeX, placeY, options = {}) {
      const spec = resolveAsset(spriteManifest, assetName, options);
      return handPointScene(spec, placeX, placeY);
    },
    async captureKitchenStageNightTable4Artifacts() {
      const sh = kitchenTable4NightRefShot();
      const saved = {
        crop: { ...activeCrop },
        ox: activeOx,
        oy: activeOy,
        scale: activeScale,
        shot: currentShotDef,
        lv: currentLightVariant
      };
      activeCrop = { x: 0, y: 0, w: KITCHEN_STAGE_W, h: KITCHEN_STAGE_H };
      activeOx = 0;
      activeOy = 0;
      activeScale = 1;
      currentShotDef = sh;
      currentLightVariant = 'night';
      const maps = kitchenSoirMapsForShot('night', 0, 0, sh);
      const { canvas, layers } = renderKitchenSoirTable4Stage(0, sh, maps, 0, KITCHEN_STAGE_W, KITCHEN_STAGE_H);
      const maskImg = buildKitchenTable4CastMask(sh, 0);
      const layerNames = ['room', 'behind', 'tbl', 'front', 'props', 'pendant'];
      const layerData = {};
      for (const name of layerNames) {
        const c = layers?.[name];
        if (!c) continue;
        const ctx = c.getContext('2d');
        layerData[name] = Array.from(ctx.getImageData(0, 0, KITCHEN_STAGE_W, KITCHEN_STAGE_H).data);
      }
      activeCrop = saved.crop;
      activeOx = saved.ox;
      activeOy = saved.oy;
      activeScale = saved.scale;
      currentShotDef = saved.shot;
      currentLightVariant = saved.lv;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return null;
      const buf = await blob.arrayBuffer();
      return {
        png: Array.from(new Uint8Array(buf)),
        mask: Array.from(maskImg.data),
        layers: layerData
      };
    },
    async captureKitchenStageNightTable4PngBytes() {
      const art = await api.captureKitchenStageNightTable4Artifacts();
      if (!art?.png) return null;
      return new Uint8Array(art.png);
    }
  };

  overlayText.textContent = CFG?.overlay?.label || 'Touchez pour commencer';
  function handlePlayTap() {
    if (phase === 'overlay') startScene();
    else if (phase === 'play' || phase === 'done') api.advanceTap();
  }
  overlay.addEventListener('click', handlePlayTap);
  phone.addEventListener('click', (e) => {
    if (phase === 'overlay') return;
    if (e.target.closest('.scene-player-replay')) return;
    handlePlayTap();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') startScene();
  });
  replayBtn.addEventListener('click', resetScene);

  await loadConfig();
  overlayText.textContent = CFG.overlay?.label || 'Touchez pour commencer';
  await loadImages();
  resize();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => resize());
    ro.observe(phone);
    ro.observe(stage);
  }
  window.__scenePlayer = api;
  requestAnimationFrame(tick);
  return api;
}
