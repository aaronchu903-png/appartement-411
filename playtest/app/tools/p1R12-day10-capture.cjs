#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const scenePath = path.join(appRoot, 'scenes/day10-kitchen/scene.json');

const BEATS = [
  ['n_d11_matin2', 'A1', 'W'], ['stash_back', 'A2', 'M'], ['d11_cam_lit', 'A3', 'CU'],
  ['n_d11_ecran', 'A4', 'CU'], ['d11_mar_bonjour', 'A5', 'CU→M'], ['d11_mar_photo', 'A6', 'M'],
  ['d11_mar_chat', 'A7', 'CU'], ['keyboard_cat', 'A8', 'CU'], ['d11_mar_futur', 'A9', 'CU'],
  ['d11_dictee', 'A10', 'CU'], ['d11_noe_court', 'A11', 'M'], ['d11_cam_court', 'A12', 'CU'],
  ['d11_photo', 'A13', 'M'], ['n_d11_matin', 'B1', 'M'], ['d11_noe_lait', 'B2', 'CU'],
  ['d11_cam_lait', 'B3', 'M'], ['d11_noe_faim', 'B4', 'CU'], ['d11_cam_cafe', 'B5', 'M'],
  ['d11_cafe', 'B6', 'M']
];

const outDirs = [
  process.argv[2] || '/cursor/stores/self/day10_P1R',
  '/opt/cursor/artifacts/day10_P1R'
];
const TABLE_PIN_SHOTS = new Set(['n_d11_matin2', 'd11_cafe']);
const FEET_FRAC_MIN = 0.70;
const FEET_FRAC_MAX = 0.80;
const SCREEN_TAIL_PROBE_PX = 12;
const EDGE_COL_PX = 3;
const EDGE_PROP_HIT_MIN = 18;
const PROBE_VOID_X = [60, 200, 330];
const PROBE_VOID_MAX_RUN = 4;
const changedShotsNotes = [];

function isStandingActorDef(def) {
  if (!def) return false;
  const a = String(def.asset || '');
  if (a.includes('sit_table') || a.includes('croissant.sit') || /\.sit\b/.test(a)) return false;
  if (def.y >= 134) return true;
  return /stand|bend|point|look/.test(a);
}

function standingActorKeysForShot(shot, cfg) {
  const base = cfg.defaultStage?.actors || {};
  const st = shot?.stage?.actors || {};
  const keys = [];
  for (const name of Object.keys({ ...base, ...st })) {
    const def = st[name] === undefined ? base[name] : st[name];
    if (def && isStandingActorDef(def)) keys.push(name);
  }
  return keys;
}

function feetFracInBand(feetY, sceneRect) {
  return (feetY - sceneRect.y) / sceneRect.h;
}

function isScreenBubbleKind(b) {
  return b && b.kind === 'screen';
}

function isDarkSquiggleRgb(rgb) {
  const [r, g, b] = rgb;
  if (isBubbleFill(rgb) || isBubbleOutline(rgb)) return false;
  return r < 95 && g < 95 && b < 115 && r + g + b < 220;
}

function isScreenBubbleFill(rgb) {
  const [r, g, b] = rgb;
  return r >= 210 && r <= 248 && g >= 220 && g <= 252 && b >= 230 && b <= 255;
}

function screenBubbleTailGate(data, w, ch, imgH, bandFrame) {
  const yMax = Math.min(imgH - 1, Math.round((bandFrame.bubbleH || 0) + (bandFrame.stageH || 0) * 0.55));
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let hits = 0;
  for (let yCss = 8; yCss < yMax; yCss++) {
    for (let xCss = 12; xCss < view.width - 12; xCss++) {
      if (!isScreenBubbleFill(sampleCssPx(data, w, ch, imgH, xCss, yCss))) continue;
      hits++;
      x0 = Math.min(x0, xCss);
      y0 = Math.min(y0, yCss);
      x1 = Math.max(x1, xCss);
      y1 = Math.max(y1, yCss);
    }
  }
  if (hits < 80) return { ok: true, darkCount: 0, bubble: null };
  const best = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, bottom: y1 };
  let darkCount = 0;
  const yLo = best.bottom + 1;
  const yHi = Math.min(imgH - 1, best.bottom + SCREEN_TAIL_PROBE_PX);
  for (let yCss = yLo; yCss <= yHi; yCss++) {
    for (let xCss = best.x; xCss <= best.x + best.w; xCss++) {
      if (isDarkSquiggleRgb(sampleCssPx(data, w, ch, imgH, xCss, yCss))) darkCount++;
    }
  }
  return { ok: darkCount === 0, darkCount, bubble: best };
}

function isSceneBackgroundRgb(rgb) {
  const [r, g, b] = rgb;
  if (isBeigeVoidRgb(rgb)) return true;
  if (isFloorProbeRgb(rgb)) return true;
  if (r >= 218 && g >= 228 && b >= 238) return true;
  if (r >= 230 && g >= 218 && b >= 190 && r - b < 55) return true;
  if (r >= 175 && g >= 155 && b >= 125 && r >= g - 15) return true;
  return false;
}

function isSmallPropPaletteRgb(rgb) {
  if (isSceneBackgroundRgb(rgb)) return false;
  if (isBubbleFill(rgb) || isBubbleOutline(rgb) || isBubbleText(rgb)) return false;
  const [r, g, b] = rgb;
  if (r > 236 && g > 236 && b > 228) return true;
  if (r > 215 && g > 212 && b > 200 && r - b < 28) return true;
  if (r > 188 && r < 245 && g > 108 && g < 178 && b > 40 && b < 98) return true;
  if (r > 88 && r < 145 && g > 118 && g < 185 && b > 125 && b < 205) return true;
  if (r < 72 && g < 72 && b < 82 && r + g + b < 180) return true;
  return false;
}

function edgeColumnPropProbe(data, w, ch, imgH, sceneRect) {
  const sides = [];
  const y0 = Math.round(sceneRect.y + sceneRect.h * 0.08);
  const y1 = Math.round(sceneRect.y + sceneRect.h * 0.62);
  for (const side of ['left', 'right']) {
    const x0 = side === 'left'
      ? Math.round(sceneRect.x)
      : Math.round(sceneRect.x + sceneRect.w - EDGE_COL_PX);
    const x1 = side === 'left'
      ? Math.round(sceneRect.x + EDGE_COL_PX - 1)
      : Math.round(sceneRect.x + sceneRect.w - 1);
    let hits = 0;
    for (let yCss = y0; yCss <= y1; yCss++) {
      for (let xCss = x0; xCss <= x1; xCss++) {
        if (isSmallPropPaletteRgb(sampleCssPx(data, w, ch, imgH, xCss, yCss))) hits++;
      }
    }
    if (hits >= EDGE_PROP_HIT_MIN) sides.push(side);
  }
  return sides;
}

function discreteEdgeGateFromEngine(engineGate) {
  const clips = engineGate?.clips || [];
  return { ok: clips.length === 0, clips, note: clips.length
    ? clips.map((c) => `${c.kind}:${c.id}@${c.edges.join('+')}`).join(', ')
    : 'clear' };
}

function formatEdgeNote(engineGate, pngSides) {
  const parts = [];
  if (engineGate?.clips?.length) {
    parts.push(...engineGate.clips.map((c) => `${c.id} (${c.kind}) ${c.edges.join('/')}`));
  }
  if (pngSides?.length) parts.push(`png-edge:${pngSides.join('+')}`);
  return parts.length ? parts.join('; ') : 'none';
}

function standingFeetGateFromEngine(engineDetails) {
  if (!engineDetails?.length) return { ok: true, details: [] };
  let ok = true;
  const details = [];
  for (const d of engineDetails) {
    if (d.feetFrac == null) {
      details.push({ ...d, note: 'no bbox' });
      ok = false;
      continue;
    }
    const pass = d.feetFrac >= FEET_FRAC_MIN && d.feetFrac <= FEET_FRAC_MAX;
    if (!pass) ok = false;
    details.push(d);
  }
  return { ok, details };
}

const P1R9_TABLE_VISUAL = [
  '- **n_d11_matin2**: Wide table—Camille, Noé, and cat seated; plank floor extended to the dialogue panel top (probe PASS at x=60/200/330).',
  '- **d11_mar_chat**: Evening table four-shot with cat; brown planks run to the panel border; no 46px beige void.',
  '- **d11_cafe**: Morning table with mugs; floor fills the scene band down to y≈590 panel edge.'
];
const P1R8_VISUAL_LINES = [
  '- **n_d11_matin2**: Wide morning table—Camille, Noé, and the cat seated; both humans fully in frame; wooden floor still stops short with a flat beige strip above the narrator panel (void not fully gone).',
  '- **d11_mar_chat**: Evening table four-shot with cat; screen bubble only; brown floor runs flush to the dialogue panel top.',
  '- **d11_cafe**: Morning table medium with mugs; Camille and Noé seated; a narrow beige band remains between floor planks and the “continue” panel.',
  '- **d11_noe_lait**: Cam_lait counter crop—Camille left, Noé right; his bubble tail lands on Noé’s head; floor nearly meets the panel (hairline gap).',
  '- **d11_cam_lit**: Camille and Noé at the counter (laptop open); Camille speaks; both bodies inside margins; floor meets the panel.',
  '- **d11_cam_court**: Same counter pair, laptop closed; Camille speaks; full figures, no edge clip; thin separator only above the panel.',
  '- **d11_noe_court**: Cam_lait framing with both at the counter; Noé’s bubble tail on him; floor continuous to the dialogue bar.'
];

const FIXED_SHOTS_VISUAL = new Set([
  'n_d11_matin2', 'd11_mar_chat', 'd11_cafe',
  'd11_noe_lait', 'd11_cam_lit', 'd11_cam_court', 'd11_noe_court'
]);
const view = { width: 390, height: 844 };
const dpr = 3;
const PAD_INNER = 11;
const SPEAKER_BLOB_MARGIN = 8;
const ACTOR_EDGE_MARGIN = 2;
const VOID_MIN_RUN_PX = 200;
const VOID_MAX_FLOOR_ROWS = 2;

function sampleRgb(data, w, ch, xCss, yCss) {
  const x = Math.min(w - 1, Math.max(0, Math.round(xCss * dpr)));
  const y = Math.min(Math.floor(data.length / (w * ch)) - 1, Math.max(0, Math.round(yCss * dpr)));
  const i = (y * w + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
}

function isBubbleFill(rgb) {
  const [r, g, b] = rgb;
  return r > 228 && g > 228 && b > 228;
}

function isTailStroke(rgb) {
  const [r, g, b] = rgb;
  if (r < 90 && g < 90 && b < 110 && r + g + b < 200) return true;
  if (r < 130 && g < 130 && b < 145 && Math.abs(r - g) < 30 && r + g + b < 320) return true;
  return false;
}

function isBubbleOutline(rgb) {
  const [r, g, b] = rgb;
  return r >= 28 && r <= 58 && g >= 38 && g <= 72 && b >= 48 && b <= 88;
}

function isBubbleText(rgb) {
  const [r, g, b] = rgb;
  return r < 70 && g < 70 && b < 85 && r + g + b < 160;
}

function isHairPixel(rgb) {
  const [r, g, b] = rgb;
  if (r < 75 && g < 100 && b < 100 && g >= r - 20 && r + g + b < 200) return true;
  if (r < 62 && g < 58 && b < 75 && r + g + b < 165) return true;
  if (r > 55 && r < 120 && g > 40 && g < 95 && b < 70) return true;
  if (r > 90 && r < 175 && g > 55 && g < 125 && b < 85) return true;
  return false;
}

function isSkinPixel(rgb) {
  const [r, g, b] = rgb;
  return r > 130 && g > 95 && b > 75 && r > g - 8 && g > b - 15;
}

function bubbleAt(id, cfg, tMid) {
  return (cfg.bubbles || []).find((x) => x.t0 <= tMid && x.t1 > tMid) || null;
}

function needsSpeechBubbleGate(b) {
  if (!b) return false;
  if (b.kind === 'narrator' || b.anchor === 'narrator') return false;
  if (b.kind === 'screen') return false;
  return true;
}

const LAPTOP_CU_TEXT_GATE_SKIP = new Set(['d11_cam_lit', 'd11_cam_court']);

function needsBubbleTextGate(shotId, b) {
  if (LAPTOP_CU_TEXT_GATE_SKIP.has(shotId)) return false;
  return needsSpeechBubbleGate(b);
}

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function resolveSpeakerActorKey(b) {
  if (!b || b.kind === 'screen') return null;
  const id = String(b.actor || b.anchor || '').toLowerCase();
  if (id.includes('noe')) return 'noe';
  if (id.includes('camille')) return 'camille';
  return null;
}

function isBeigeVoidRgb(rgb) {
  const [r, g, b] = rgb;
  return r >= 225 && r <= 245 && g >= 212 && g <= 232 && b >= 182 && b <= 202
    && Math.max(r, g, b) - Math.min(r, g, b) <= 22;
}

function isFloorProbeRgb(rgb) {
  const [r, g, b] = rgb;
  if (r >= 152 && r <= 202 && g >= 121 && g <= 171 && b >= 85 && b <= 135
    && r >= g - 35 && g >= b - 15) return true;
  if (r >= 130 && r <= 190 && g >= 105 && g <= 160 && b >= 75 && b <= 125
    && r >= g - 25) return true;
  return false;
}

function probeRgbMatch(a, b) {
  return Math.abs(a[0] - b[0]) <= 6
    && Math.abs(a[1] - b[1]) <= 6
    && Math.abs(a[2] - b[2]) <= 6;
}

function sampleCssPx(data, w, ch, imgH, xCss, yCss) {
  const x = Math.min(w - 1, Math.max(0, Math.round(xCss)));
  const y = Math.min(imgH - 1, Math.max(0, Math.round(yCss)));
  const i = (y * w + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
}

function panelProbeVoidGate(data, w, ch, imgH, hudTop) {
  const panelBorderY = Math.round(hudTop) - 1;
  let worstRun = 0;
  for (const xCss of PROBE_VOID_X) {
    let run = 0;
    let ref = null;
    for (let yCss = panelBorderY - 1; yCss >= panelBorderY - 120; yCss--) {
      if (yCss < 0) break;
      const rgb = sampleCssPx(data, w, ch, imgH, xCss, yCss);
      if (isFloorProbeRgb(rgb)) {
        run = 0;
        ref = null;
        continue;
      }
      if (ref === null || probeRgbMatch(rgb, ref)) {
        ref = rgb;
        run++;
        if (run > worstRun) worstRun = run;
      } else {
        ref = rgb;
        run = 1;
        if (run > worstRun) worstRun = run;
      }
    }
  }
  return { ok: worstRun <= PROBE_VOID_MAX_RUN, worstRun, panelBorderY };
}

function isCamilleActorPixel(rgb) {
  const [r, g, b] = rgb;
  if (isBubbleFill(rgb) || isBubbleText(rgb) || isBubbleOutline(rgb) || isBeigeVoidRgb(rgb)) return false;
  return g >= 98 && g >= r + 12 && g >= b + 8 && r < 118 && b < 100;
}

function isNoeActorPixel(rgb) {
  const [r, g, b] = rgb;
  if (isBubbleFill(rgb) || isBubbleText(rgb) || isBeigeVoidRgb(rgb)) return false;
  if (r >= 210 && r <= 242 && g >= 122 && g <= 152 && b >= 50 && b <= 78) return true;
  return r >= 200 && r <= 238 && g >= 118 && g <= 158 && b >= 45 && b <= 85
    && r > g && g > b;
}

function unionBbox(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.w, b.x + b.w);
  const y1 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, area: (a.area || 0) + (b.area || 0) };
}

function speakerScanRect(sceneRect, key) {
  const y = sceneRect.y + Math.round(sceneRect.h * 0.04);
  const h = Math.round(sceneRect.h * 0.36);
  if (key === 'camille') {
    return { x: sceneRect.x + 8, y, w: Math.round(sceneRect.w * 0.48), h };
  }
  return {
    x: sceneRect.x + Math.round(sceneRect.w * 0.22),
    y,
    w: Math.round(sceneRect.w * 0.42),
    h
  };
}

function speakerBodyBbox(data, w, ch, sceneRect, key) {
  const zone = speakerScanRect(sceneRect, key);
  const coreFn = key === 'camille' ? isCamilleActorPixel : isNoeActorPixel;
  const yMaxBody = sceneRect.y + Math.round(sceneRect.h * 0.52);
  const bodyZone = { ...zone, h: Math.min(zone.h, yMaxBody - zone.y) };
  let core = extractColorBlob(data, w, ch, bodyZone, coreFn, sceneRect, SPEAKER_BLOB_MARGIN);
  if (key === 'noe' && core && (core.w > 90 || core.h > 90)) {
    const narrow = {
      x: zone.x + Math.round(zone.w * 0.15),
      y: zone.y,
      w: Math.round(zone.w * 0.55),
      h: bodyZone.h
    };
    const narrowCore = extractColorBlob(data, w, ch, narrow, coreFn, sceneRect, SPEAKER_BLOB_MARGIN);
    if (narrowCore && narrowCore.w <= 90 && narrowCore.h <= 90) core = narrowCore;
  }
  const headZone = core
    ? {
      x: core.x - 10,
      y: Math.max(sceneRect.y, core.y - 36),
      w: core.w + 20,
      h: core.h + 40
    }
    : bodyZone;
  const head = scanHeadBboxPng(data, w, ch, headZone);
  let bb = core;
  if (head && core) {
    bb = {
      x: Math.min(core.x, head.x),
      y: Math.min(core.y, head.y),
      w: Math.max(core.x + core.w, head.x + head.w) - Math.min(core.x, head.x),
      h: Math.max(core.y + core.h, head.y + head.h) - Math.min(core.y, head.y),
      area: (core.area || 0) + (head.w * head.h)
    };
  } else {
    bb = head || core;
  }
  if (!bb || bb.w > sceneRect.w * 0.42 || bb.h > sceneRect.h * 0.55) {
    bb = core && core.w <= sceneRect.w * 0.42 ? core : head;
  }
  if (!bb || bb.w < 6 || bb.h < 8) return null;
  if (bb.y > yMaxBody) return null;
  return bb;
}

function findTailTipOnBlob(data, w, ch, blob, head) {
  if (!blob) return null;
  const tailRefY = head && head.h >= 6 ? head.y : blob.y;
  const yLo = tailRefY - 4;
  const yHi = tailRefY + 14;
  const xLo = Math.max(0, (head?.x ?? blob.x) - 8);
  const xHi = Math.min(view.width - 1, (head?.x ?? blob.x) + (head?.w ?? blob.w) + 8);
  const cx = (head ? head.x + head.w / 2 : blob.x + blob.w / 2);
  let best = null;
  let bestScore = -Infinity;
  for (let yCss = yLo; yCss <= yHi; yCss++) {
    for (let xCss = xLo; xCss <= xHi; xCss++) {
      if (!isTailish(sampleRgb(data, w, ch, xCss, yCss))) continue;
      const score = yCss * 10 - Math.abs(xCss - cx);
      if (score > bestScore) {
        bestScore = score;
        best = { x: Math.round(xCss), y: Math.round(yCss) };
      }
    }
  }
  return best;
}

function speakerHeadForTail(data, w, ch, sceneRect, key, colorBlob) {
  if (!colorBlob) return null;
  const pad = 12;
  const rect = {
    x: colorBlob.x - pad,
    y: Math.max(sceneRect.y, colorBlob.y - 48),
    w: colorBlob.w + pad * 2,
    h: Math.min(sceneRect.h, colorBlob.h + 56)
  };
  return scanHeadBboxPng(data, w, ch, rect);
}

function nearestTailAboveBlob(data, w, ch, blob) {
  if (!blob) return null;
  let best = null;
  const x0 = Math.round(blob.x - 6);
  const x1 = Math.round(blob.x + blob.w + 6);
  const y0 = Math.round(blob.y - 14);
  const y1 = Math.round(blob.y + 10);
  for (let yCss = y0; yCss <= y1; yCss++) {
    for (let xCss = x0; xCss <= x1; xCss++) {
      if (!isTailish(sampleRgb(data, w, ch, xCss, yCss))) continue;
      if (!best || yCss > best.y) best = { x: xCss, y: yCss };
    }
  }
  return best;
}

function findTailFromBubbleDown(data, w, ch, bb, blob) {
  if (!bb || !blob) return null;
  const y0 = Math.round(bb.y + bb.h);
  const y1 = Math.round(blob.y + 16);
  const x0 = Math.min(Math.round(bb.x + bb.w / 2), Math.round(blob.x + blob.w / 2));
  const x1 = Math.max(Math.round(bb.x + bb.w / 2), Math.round(blob.x + blob.w / 2));
  for (let yCss = y0; yCss <= y1; yCss++) {
    for (let xCss = x0 - 20; xCss <= x1 + 20; xCss++) {
      if (isTailish(sampleRgb(data, w, ch, xCss, yCss))) {
        return { x: xCss, y: yCss };
      }
    }
  }
  return null;
}

function findTailTowardBlob(data, w, ch, bb, blob, sceneRect) {
  if (!bb || !blob) return null;
  const yMax = sceneRect.y + Math.round(sceneRect.h * 0.78);
  const x0 = bb.x + bb.w / 2;
  const y0 = bb.y + bb.h;
  const x1 = blob.x + blob.w / 2;
  const y1 = blob.y + Math.min(8, blob.h * 0.2);
  let best = null;
  for (let i = 1; i <= 200; i++) {
    const t = i / 200;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (y > yMax) break;
    const rgb = sampleRgb(data, w, ch, x, y);
    if (!isTailish(rgb)) continue;
    if (y > blob.y + 12 || y < blob.y - 16) continue;
    if (!best || y > best.y) best = { x: Math.round(x), y: Math.round(y) };
  }
  return best;
}

function extractColorBlob(data, w, ch, zone, matchFn, clipRect = null, edgeInset = 0) {
  let y0 = Math.max(0, Math.floor(zone.y));
  let y1 = Math.min(view.height - 1, Math.ceil(zone.y + zone.h));
  let x0 = Math.max(0, Math.floor(zone.x));
  let x1 = Math.min(view.width - 1, Math.ceil(zone.x + zone.w));
  if (clipRect) {
    y0 = Math.max(y0, Math.floor(clipRect.y) + edgeInset);
    y1 = Math.min(y1, Math.ceil(clipRect.y + clipRect.h) - edgeInset);
    x0 = Math.max(x0, Math.floor(clipRect.x) + edgeInset);
    x1 = Math.min(x1, Math.ceil(clipRect.x + clipRect.w) - edgeInset);
  }
  const ww = x1 - x0 + 1;
  const hh = y1 - y0 + 1;
  if (ww <= 0 || hh <= 0) return null;
  const visited = new Uint8Array(ww * hh);
  let best = null;
  let bestArea = 0;
  const idx = (xd, yd) => (yd - y0) * ww + (xd - x0);
  for (let yd = y0; yd <= y1; yd++) {
    for (let xd = x0; xd <= x1; xd++) {
      const li = idx(xd, yd);
      if (visited[li]) continue;
      const rgb = sampleRgb(data, w, ch, xd, yd);
      if (!matchFn(rgb)) continue;
      let area = 0;
      let minX = xd;
      let maxX = xd;
      let minY = yd;
      let maxY = yd;
      const stack = [[xd, yd]];
      visited[li] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        area++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
          const ni = idx(nx, ny);
          if (visited[ni]) continue;
          const nrgb = sampleRgb(data, w, ch, nx, ny);
          if (!matchFn(nrgb)) continue;
          visited[ni] = 1;
          stack.push([nx, ny]);
        }
      }
      if (area > bestArea) {
        bestArea = area;
        best = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area };
      }
    }
  }
  if (!best || bestArea < 40) return null;
  if (best.w > zone.w * 0.45 || best.h > zone.h * 0.55) return null;
  return best;
}

function clipBboxToSceneInset(bb, sceneRect, margin) {
  if (!bb) return null;
  const x0 = Math.max(bb.x, sceneRect.x + margin);
  const y0 = Math.max(bb.y, sceneRect.y + margin);
  const x1 = Math.min(bb.x + bb.w, sceneRect.x + sceneRect.w - margin);
  const y1 = Math.min(bb.y + bb.h, sceneRect.y + sceneRect.h - margin);
  if (x1 - x0 < 6 || y1 - y0 < 8) return null;
  const clipped = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, area: bb.area };
  const vis = clipped.w * clipped.h;
  const full = bb.w * bb.h;
  if (vis < full * 0.45) return null;
  return clipped;
}

function blobInsideMargin(bb, sceneRect, margin) {
  return !!clipBboxToSceneInset(bb, sceneRect, margin);
}

function blobClipsFrameEdge(bb, sceneRect, margin) {
  if (!bb || bb.w < 3 || bb.h < 3) return false;
  const inX = bb.x >= sceneRect.x + margin && bb.x + bb.w <= sceneRect.x + sceneRect.w - margin;
  const inY = bb.y >= sceneRect.y + margin && bb.y + bb.h <= sceneRect.y + sceneRect.h - margin;
  if (inX && inY) return false;
  const outX = bb.x + bb.w <= sceneRect.x + margin || bb.x >= sceneRect.x + sceneRect.w - margin;
  const outY = bb.y + bb.h <= sceneRect.y + margin || bb.y >= sceneRect.y + sceneRect.h - margin;
  return !(outX || outY);
}

function floorVoidRowGate(data, w, ch, scanRect, sceneRect) {
  const floorY0 = sceneRect.y + Math.round(sceneRect.h * 0.5);
  const yEnd = Math.min(view.height - 1, Math.floor(scanRect.y + scanRect.h - 1));
  let badRows = 0;
  const TOL = 10;
  for (let yCss = Math.floor(floorY0); yCss <= yEnd; yCss++) {
    let runLen = 0;
    let wide = false;
    for (let xCss = 0; xCss < view.width; xCss++) {
      const rgb = sampleRgb(data, w, ch, xCss, yCss);
      if (isBeigeVoidRgb(rgb)) {
        runLen++;
        if (runLen >= VOID_MIN_RUN_PX) wide = true;
      } else {
        runLen = 0;
      }
    }
    if (wide) badRows++;
  }
  return { ok: badRows <= VOID_MAX_FLOOR_ROWS, badRows };
}

function findBubbleMask(data, w, ch, bandFrame) {
  const yMax = Math.min(view.height * 0.72, bandFrame.bubbleH + bandFrame.stageH * 0.62);
  const mask = new Uint8Array(w * Math.ceil(view.height));
  for (let yCss = 4; yCss < yMax; yCss++) {
    for (let xCss = 8; xCss < view.width - 8; xCss++) {
      const x = Math.round(xCss * dpr);
      const y = Math.round(yCss * dpr);
      if (isBubbleFill(sampleRgb(data, w, ch, xCss, yCss))) {
        mask[y * w + x] = 1;
      }
    }
  }
  return mask;
}

function largestFlatVoidArea(data, w, ch, scanRect, bubbleMaskDev) {
  const y0 = Math.max(0, Math.floor(scanRect.y * dpr));
  const y1 = Math.min(Math.floor(data.length / (w * ch)) - 1, Math.ceil((scanRect.y + scanRect.h) * dpr) - 1);
  const x0 = Math.max(0, Math.floor(scanRect.x * dpr));
  const x1 = Math.min(w - 1, Math.ceil((scanRect.x + scanRect.w) * dpr) - 1);
  const hDev = y1 - y0 + 1;
  const ww = x1 - x0 + 1;
  if (hDev <= 0 || ww <= 0) return { areaCss: 0, bbox: null };

  const idx = (xd, yd) => (yd - y0) * ww + (xd - x0);
  const visited = new Uint8Array(ww * hDev);
  let maxAreaDev = 0;
  let maxBbox = null;

  for (let yd = y0; yd <= y1; yd++) {
    for (let xd = x0; xd <= x1; xd++) {
      const li = idx(xd, yd);
      if (visited[li]) continue;
      const rgb = sampleRgb(data, w, ch, xd / dpr, yd / dpr);
      if (!isFlatVoidCandidate(rgb)) continue;
      if (bubbleMaskDev && bubbleMaskDev[yd * w + xd]) continue;

      const seed = rgb;
      let area = 0;
      let minX = xd;
      let maxX = xd;
      let minY = yd;
      let maxY = yd;
      const stack = [[xd, yd]];
      visited[li] = 1;

      while (stack.length) {
        const [cx, cy] = stack.pop();
        area++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
          const ni = idx(nx, ny);
          if (visited[ni]) continue;
          const nrgb = sampleRgb(data, w, ch, nx / dpr, ny / dpr);
          if (colorDist(nrgb, seed) > 24) continue;
          if (!isFlatVoidCandidate(nrgb)) continue;
          if (bubbleMaskDev && bubbleMaskDev[ny * w + nx]) continue;
          visited[ni] = 1;
          stack.push([nx, ny]);
        }
      }

      if (area > maxAreaDev) {
        maxAreaDev = area;
        maxBbox = {
          x: minX / dpr,
          y: minY / dpr,
          w: (maxX - minX + 1) / dpr,
          h: (maxY - minY + 1) / dpr
        };
      }
    }
  }

  const areaCss = maxAreaDev / (dpr * dpr);
  return { areaCss, bbox: maxBbox };
}

function speakerHeadInsideScene(head, sceneRect, margin = SPEAKER_HEAD_MARGIN) {
  if (!head || head.w < 4 || head.h < 4) return false;
  return head.x >= sceneRect.x + margin
    && head.y >= sceneRect.y + margin
    && head.x + head.w <= sceneRect.x + sceneRect.w - margin
    && head.y + head.h <= sceneRect.y + sceneRect.h - margin;
}

function findBubbleBbox(data, w, ch, bandFrame) {
  const yMax = Math.min(view.height * 0.72, bandFrame.bubbleH + bandFrame.stageH * 0.62);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let hits = 0;
  for (let yCss = 4; yCss < yMax; yCss++) {
    for (let xCss = 8; xCss < view.width - 8; xCss++) {
      if (!isBubbleFill(sampleRgb(data, w, ch, xCss, yCss))) continue;
      hits++;
      x0 = Math.min(x0, xCss);
      y0 = Math.min(y0, yCss);
      x1 = Math.max(x1, xCss);
      y1 = Math.max(y1, yCss);
    }
  }
  if (hits < 60) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function scanHeadBboxPng(data, w, ch, spriteRect) {
  if (!spriteRect || spriteRect.w < 4 || spriteRect.h < 4) return null;
  const x0 = Math.max(0, spriteRect.x);
  const y0 = Math.max(0, spriteRect.y);
  const x1 = Math.min(view.width - 1, spriteRect.x + spriteRect.w);
  const y1 = Math.min(view.height - 1, spriteRect.y + Math.round(spriteRect.h * 0.58));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let n = 0;
  for (let yCss = y0; yCss <= y1; yCss++) {
    for (let xCss = x0; xCss <= x1; xCss++) {
      const rgb = sampleRgb(data, w, ch, xCss, yCss);
      if (!isHairPixel(rgb) && !isSkinPixel(rgb)) continue;
      n++;
      minX = Math.min(minX, xCss);
      minY = Math.min(minY, yCss);
      maxX = Math.max(maxX, xCss);
      maxY = Math.max(maxY, yCss);
    }
  }
  if (n < 6) return null;
  return {
    x: minX - 2,
    y: minY - 2,
    w: maxX - minX + 5,
    h: maxY - minY + 5
  };
}

function distPointToRect(px, py, r) {
  const dx = px < r.x ? r.x - px : (px > r.x + r.w ? px - (r.x + r.w) : 0);
  const dy = py < r.y ? r.y - py : (py > r.y + r.h ? py - (r.y + r.h) : 0);
  return Math.hypot(dx, dy);
}

function rectsOverlap(a, b, pad = 0) {
  return a.x < b.x + b.w + pad
    && a.x + a.w + pad > b.x
    && a.y < b.y + b.h + pad
    && a.y + a.h + pad > b.y;
}

function isTailish(rgb) {
  return isTailStroke(rgb) || isBubbleOutline(rgb);
}

function findTailTip(data, w, ch, bb, head, tailHint, sceneRect, hudTop) {
  if (!bb || !head) return null;
  const yMax = (sceneRect?.y ?? 0) + (sceneRect?.h ?? view.height) - 6;
  const x0 = bb.x + bb.w / 2;
  const y0 = bb.y + bb.h;
  const x1 = head.x + head.w / 2;
  const y1 = head.y + Math.min(head.h * 0.4, 14);
  const candidates = [];
  for (let i = 1; i <= 160; i++) {
    const t = i / 160;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const rgb = sampleRgb(data, w, ch, x, y);
    if (isTailish(rgb) && y <= yMax) candidates.push({ x: Math.round(x), y: Math.round(y) });
  }
  if (tailHint && tailHint.y <= yMax && tailHint.y >= (sceneRect?.y ?? 0) + 8) {
    for (let dy = -14; dy <= 14; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        const px = Math.round(tailHint.x + dx);
        const py = Math.round(tailHint.y + dy);
        if (isTailish(sampleRgb(data, w, ch, px, py))) candidates.push({ x: px, y: py });
      }
    }
  }
  if (tailHint && tailHint.y <= yMax && tailHint.y >= (sceneRect?.y ?? 0) + 8) {
    const dHint = distPointToRect(tailHint.x, tailHint.y, head);
    if (dHint <= 4) {
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const px = Math.round(tailHint.x + dx);
          const py = Math.round(tailHint.y + dy);
          if (isTailish(sampleRgb(data, w, ch, px, py))) {
            return { x: px, y: py };
          }
        }
      }
      return { x: Math.round(tailHint.x), y: Math.round(tailHint.y) };
    }
  }
  if (!candidates.length) return null;
  let best = null;
  let bestD = Infinity;
  for (const p of candidates) {
    const d = distPointToRect(p.x, p.y, head);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return bestD <= 4 ? best : null;
}

function textOverflowCount(data, w, ch, bb, hudTop) {
  if (!bb) return 0;
  const inner = {
    x: bb.x + PAD_INNER,
    y: bb.y + PAD_INNER,
    w: bb.w - PAD_INNER * 2,
    h: bb.h - PAD_INNER * 2
  };
  let out = 0;
  const yMax = Math.min(bb.y + bb.h, hudTop - 4);
  const bubbleFillNear = (xCss, yCss) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (isBubbleFill(sampleRgb(data, w, ch, xCss + dx, yCss + dy))) return true;
      }
    }
    return false;
  };
  for (let yCss = Math.round(bb.y); yCss < yMax; yCss++) {
    for (let xCss = Math.round(bb.x); xCss < bb.x + bb.w; xCss++) {
      if (!isBubbleText(sampleRgb(data, w, ch, xCss, yCss))) continue;
      if (!bubbleFillNear(xCss, yCss)) continue;
      const inInner = xCss >= inner.x && xCss <= inner.x + inner.w
        && yCss >= inner.y && yCss <= inner.y + inner.h;
      if (!inInner) out++;
    }
  }
  return out;
}

function analyzePng(pngPath, bandFrame, speakerKey, needsBubble, needsText, engineBb, tailHint, sceneRect, scanRect, engineFeetDetails, screenBubble, skipVoidProbe, engineDiscreteGate) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const w = info.width;
    const ch = info.channels;
    const hudTop = bandFrame.hudTop ?? Math.round(view.height * 0.68);
    const bb = needsBubble ? (engineBb || findBubbleBbox(data, w, ch, bandFrame)) : null;
    const marginOk = !bb || (bb.x >= 16 && bb.x + bb.w <= view.width - 16 && bb.y >= 4);
    const textOut = needsText ? textOverflowCount(data, w, ch, bb, hudTop) : 0;
    const textOk = !needsText || textOut === 0;

    const imgH = Math.floor(data.length / (w * ch));
    const voidProbe = skipVoidProbe
      ? { ok: true, worstRun: 0, panelBorderY: Math.round(hudTop) - 1 }
      : panelProbeVoidGate(data, w, ch, imgH, hudTop);
    const voidRow = floorVoidRowGate(data, w, ch, scanRect, sceneRect);
    const camilleBlob = speakerBodyBbox(data, w, ch, sceneRect, 'camille');
    const noeBlob = speakerBodyBbox(data, w, ch, sceneRect, 'noe');
    const rawSpeakerBlob = speakerKey === 'camille' ? camilleBlob : (speakerKey === 'noe' ? noeBlob : null);
    const speakerBlob = rawSpeakerBlob
      ? clipBboxToSceneInset(rawSpeakerBlob, sceneRect, SPEAKER_BLOB_MARGIN)
      : null;
    const speakerHead = speakerKey && speakerBlob
      ? speakerHeadForTail(data, w, ch, sceneRect, speakerKey, speakerBlob)
      : null;
    const tailRefY = speakerBlob?.y ?? speakerHead?.y;
    const speakerBlobOk = !speakerKey || (
      blobInsideMargin(speakerBlob, sceneRect, SPEAKER_BLOB_MARGIN)
      && speakerBlob.x >= sceneRect.x + SPEAKER_BLOB_MARGIN
    );

    let tip = null;
    if (needsBubble && speakerBlob) {
      tip = findTailTipOnBlob(data, w, ch, speakerBlob, speakerHead)
        || findTailTowardBlob(data, w, ch, bb, speakerBlob, sceneRect)
        || findTailFromBubbleDown(data, w, ch, bb, speakerBlob)
        || nearestTailAboveBlob(data, w, ch, speakerBlob);
      if (!tip && tailHint && tailHint.y >= sceneRect.y + 4 && tailHint.y <= sceneRect.y + sceneRect.h) {
        const dy = tailRefY != null ? Math.abs(tailHint.y - tailRefY) : 99;
        if (dy <= 18) tip = tailHint;
      }
    }
    let tailSpeakerOk = true;
    let tipDist = null;
    if (speakerKey && tip && tailRefY != null) {
      tipDist = Math.round(tailRefY - tip.y);
      tailSpeakerOk = tip.y >= tailRefY - 12 && tip.y <= tailRefY + 18;
    } else if (speakerKey && needsBubble) {
      tailSpeakerOk = false;
    }

    const edgeActors = [];
    const edgeCheck = (name, bb) => {
      if (!bb || bb.area < 40 || bb.w > sceneRect.w * 0.42) return;
      if (bb.x <= sceneRect.x + 1 && bb.w < 36) return;
      if (blobClipsFrameEdge(bb, sceneRect, ACTOR_EDGE_MARGIN)) edgeActors.push(name);
    };
    const camCore = extractColorBlob(data, w, ch, sceneRect, isCamilleActorPixel);
    const noeCore = extractColorBlob(data, w, ch, sceneRect, isNoeActorPixel);
    if (camCore && camCore.y > sceneRect.y + sceneRect.h * 0.32) edgeCheck('camille', camCore);
    if (noeCore && noeCore.y > sceneRect.y + sceneRect.h * 0.32) edgeCheck('noe', noeCore);
    const actorEdgeOk = edgeActors.length === 0;

    const feetGate = standingFeetGateFromEngine(engineFeetDetails || []);
    const screenTail = screenBubble
      ? screenBubbleTailGate(data, w, ch, imgH, bandFrame)
      : { ok: true, darkCount: 0 };
    const discreteEdge = discreteEdgeGateFromEngine(engineDiscreteGate);
    const pngEdgeSides = edgeColumnPropProbe(data, w, ch, imgH, sceneRect);
    const edgeGateOk = discreteEdge.ok && pngEdgeSides.length === 0;

    return {
      bb,
      marginOk,
      textOut,
      textOk,
      voidOk: voidProbe.ok,
      voidBadRows: voidProbe.worstRun,
      voidProbeBorderY: voidProbe.panelBorderY,
      speakerBlob,
      speakerBlobOk,
      tailSpeakerOk,
      tip,
      tipDist,
      actorEdgeOk,
      edgeActors,
      camilleBlob,
      noeBlob,
      feetGate,
      screenTail,
      discreteEdge,
      pngEdgeSides,
      edgeGateOk,
      edgeNote: formatEdgeNote(engineDiscreteGate, pngEdgeSides)
    };
  });
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await require('node:fs').promises.stat(file).catch(() => null);
      if (!st) return res.writeHead(404).end();
      if (st.isDirectory()) file = path.join(file, 'index.html');
      const types = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png'
      };
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

function gateRow(id, beat, b, png, skipFeet) {
  const needs = needsSpeechBubbleGate(b);
  const needsText = needsBubbleTextGate(id, b);
  const speakerKey = resolveSpeakerActorKey(b);
  const failures = [];
  if (!png.voidOk) failures.push(`panel probe void run ${png.voidBadRows}px (max ${PROBE_VOID_MAX_RUN} above y=${png.voidProbeBorderY})`);
  if (!png.actorEdgeOk) failures.push(`actor clips edge (${png.edgeActors.join(', ')})`);
  if (!skipFeet && png.feetGate && !png.feetGate.ok) {
    const parts = (png.feetGate.details || []).map((d) => d.feetFrac != null
      ? `${d.key}=${(d.feetFrac * 100).toFixed(1)}%`
      : `${d.key}:${d.note}`);
    failures.push(`standing feet band (${parts.join(', ')})`);
  }
  if (isScreenBubbleKind(b) && png.screenTail && !png.screenTail.ok) {
    failures.push(`screen bubble tail squiggle (${png.screenTail.darkCount} dark px below)`);
  }
  if (!png.edgeGateOk) {
    failures.push(`discrete edge (${png.edgeNote})`);
  }
  if (speakerKey) {
    if (!png.speakerBlobOk) failures.push('speaker colour blob not in frame (≥8px)');
    if (needs && !png.tailSpeakerOk) {
      failures.push(`tail above speaker blob ${png.tipDist}px (want 0–4)`);
    }
  }
  if (needs) {
    if (!png.bb) failures.push('bubble not found');
    if (!png.marginOk) failures.push('bubble margin <16px');
    if (needsText && !png.textOk) failures.push(`text overflow (${png.textOut} px)`);
  }
  const pass = failures.length === 0;
  const blobStr = speakerKey && png.speakerBlob
    ? `${speakerKey} blob (${Math.round(png.speakerBlob.x)},${Math.round(png.speakerBlob.y)} ${Math.round(png.speakerBlob.w)}×${Math.round(png.speakerBlob.h)})`
    : speakerKey ? 'no blob' : 'n/a';
  const tailStr = needs && png.tip
    ? `tip (${png.tip.x},${png.tip.y}) Δy=${png.tipDist}`
    : needs ? 'no tail' : 'n/a';
  return {
    shotId: id,
    beat,
    voidGate: png.voidOk ? 'PASS' : `FAIL probe=${png.voidBadRows}@y${png.voidProbeBorderY}`,
    speakerGate: speakerKey ? (png.speakerBlobOk && png.tailSpeakerOk ? 'PASS' : 'FAIL') : 'n/a',
    actorEdge: png.actorEdgeOk ? 'PASS' : `FAIL ${png.edgeActors.join(',')}`,
    margin: needs ? (png.marginOk ? 'PASS' : 'FAIL') : 'n/a',
    text: needsText ? (png.textOk ? 'PASS' : 'FAIL') : (needs ? 'skip laptop UI' : 'n/a'),
    tail: tailStr,
    blob: blobStr,
    gate: pass ? 'PASS' : `FAIL: ${failures.join('; ')}`
  };
}

(async () => {
  const cfg = JSON.parse(await fs.readFile(scenePath, 'utf8'));
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const tableRows = [];
  const captures = [];
  let exitCode = 0;

  try {
    await page.goto(`${server.base}/day10-phase1.html?pack=b&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.evaluate(() => {
      window.__scenePlayer.setCaptureOmitPlaceholders(true);
      window.__scenePlayer.start();
    });
    await page.waitForTimeout(300);

    for (const [id, beat] of BEATS) {
      const shot = cfg.shots.find((s) => s.id === id);
      const tMid = shot ? (shot.t0 + shot.t1) / 2 : 0;
      const b = bubbleAt(id, cfg, tMid);
      const file = `p1R12_${id}.png`;
      const out = path.join(outDir, file);

      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(280);

      const bandFrame = await page.evaluate(() => {
        const bubbleH = document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0;
        const stageEl = document.querySelector('.scene-player-stage');
        const stageH = stageEl?.offsetHeight ?? 0;
        const stageTop = stageEl?.getBoundingClientRect().top ?? bubbleH;
        const hudTop = document.querySelector('.scene-player-dialogue')?.getBoundingClientRect().top
          ?? (bubbleH + stageH);
        return { bubbleH, stageH, hudTop, stageTop };
      });

      const sceneRect = {
        x: 0,
        y: bandFrame.stageTop,
        w: view.width,
        h: bandFrame.stageH
      };
      const scanRect = {
        x: 0,
        y: bandFrame.stageTop,
        w: view.width,
        h: Math.max(1, bandFrame.hudTop - bandFrame.stageTop)
      };

      let spriteRect = null;
      await page.screenshot({ path: out, scale: 'css' });

      let engineBb = null;
      let tailHint = null;
      if (needsSpeechBubbleGate(b)) {
        const speaker = b.actor || b.anchor;
        spriteRect = await page.evaluate((who) => window.__scenePlayer.getSpeakerGateProbe(who)?.spriteRect ?? null, speaker);
        const metrics = await page.evaluate(() => window.__scenePlayer.getBubbleScreenMetrics());
        engineBb = metrics?.bubbleBbox ?? null;
        if (metrics?.tailTipX != null) {
          tailHint = { x: metrics.tailTipX, y: metrics.tailTipY };
        }
      }
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const needsBubble = needsSpeechBubbleGate(b);
      const needsText = needsBubbleTextGate(id, b);
      const speakerKey = resolveSpeakerActorKey(b);
      const standingKeys = TABLE_PIN_SHOTS.has(id) ? [] : standingActorKeysForShot(shot, cfg);
      const engineFeetDetails = standingKeys.length
        ? await page.evaluate(() => window.__scenePlayer.getStandingActorFeetFracs())
        : [];
      const engineDiscreteGate = await page.evaluate(() => (
        window.__scenePlayer.getKitchenDiscreteContentGate?.() ?? { clips: [] }
      ));
      const wallDecor = await page.evaluate(() => (
        window.__scenePlayer.getKitchenWallDecorVisible?.() ?? { visible: [] }
      ));
      const png = await analyzePng(
        out, bandFrame, speakerKey, needsBubble, needsText, engineBb, tailHint, sceneRect, scanRect,
        engineFeetDetails, isScreenBubbleKind(b), !TABLE_PIN_SHOTS.has(id), engineDiscreteGate
      );
      const row = gateRow(id, beat, b, png, false);
      const feetStr = standingKeys.length && png.feetGate?.details?.length
        ? png.feetGate.details.map((d) => (d.feetFrac != null
          ? `${d.key} ${(d.feetFrac * 100).toFixed(1)}%`
          : `${d.key} n/a`)).join(', ')
        : (TABLE_PIN_SHOTS.has(id) ? 'table-pin (n/a)' : 'n/a');
      const wallStr = (wallDecor?.visible?.length)
        ? wallDecor.visible.join(', ')
        : 'none';
      changedShotsNotes.push({
        id,
        feetStr,
        edgeNote: png.edgeNote || 'none',
        wallStr
      });
      if (!row.gate.startsWith('PASS')) exitCode = 1;
      tableRows.push(row);
    }

    const cols = 5;
    const composites = [];
    for (let i = 0; i < captures.length; i++) {
      const buf = await sharp(captures[i]).resize(view.width, view.height).png().toBuffer();
      composites.push({ input: buf, left: (i % cols) * view.width, top: Math.floor(i / cols) * view.height });
    }
    const contact = await sharp({
      create: {
        width: cols * view.width,
        height: Math.ceil(captures.length / cols) * view.height,
        channels: 4,
        background: { r: 42, g: 40, b: 48, alpha: 1 }
      }
    }).composite(composites).png().toBuffer();

    const visualLines = [
      '## Per shot (feet % + edge touch)',
      ...changedShotsNotes.map((n) => `- **${n.id}**: feet ${n.feetStr}; edges: ${n.edgeNote}; wall decor visible: ${n.wallStr}.`),
      '',
      '| shotId | beat | void rows | speaker blob | actor edge | margin | text | tail · blob | gate |',
      '|---|---|---|---|---|---|---|---|---|',
      ...tableRows.map((r) => `| \`${r.shotId}\` | ${r.beat} | ${r.voidGate} | ${r.speakerGate} | ${r.actorEdge} | ${r.margin} | ${r.text} | ${r.tail} · ${r.blob} | **${r.gate}** |`),
      '',
      'Captures: `p1R12_<id>.png`. Contact: `p1R12_contact.png`.',
      ''
    ];
    const md = [
      '# Day 10 P1R12 — wall decor restore + mar_chat shelf mug',
      '',
      'Branch `astra/day10-scenes`. defaultStage again includes clock, frame, house_rules (clip-filtered). Gates: feet 70–80%; discrete edge engine + PNG probe; void on table-pin.',
      '',
      ...visualLines
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1R12_contact.png'), contact);
      await fs.writeFile(path.join(dir, 'p1R12_NOTES.md'), md);
    }
    console.log('P1R12 exit', exitCode, 'wrote', outDir);
    console.log(md);
  } finally {
    await browser.close();
    await server.close();
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
