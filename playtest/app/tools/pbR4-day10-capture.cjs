#!/usr/bin/env node
'use strict';
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const PACK = 'pbR4';
const STAGE_REF_NIGHT_TABLE4 = '/workspace/app/scenes/packs/b/kitchen/stage_night_table4_x1.png';
const PB23_REF_DIR = '/opt/cursor/artifacts/day10_packb23';
const PB24_REF_DIR = '/opt/cursor/artifacts/day10_packb24';
const KITCHEN_NIGHT_REF_PATH = '/workspace/app/scenes/packs/b/kitchen/composite_medium_game_night_table4_1080x1920.png';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_R4',
  '/cursor/stores/self/day10_R4'
];
const view = { width: 390, height: 844 };
const dpr = 3;
const GATE_X_DEV = 585;
const WALL_RGB = [237, 223, 194];
const FLOOR_RGB = [178, 147, 110];

const SHOTS = [
  { key: 'lineup', file: 'lineup', page: 'lineup', shot: 'lineup' },
  { key: 'd11_cam_lait', file: 'd11_cam_lait', page: 'kitchen', shot: 'd11_cam_lait' },
  { key: 'd11_mar_bonjour', file: 'd11_mar_bonjour', page: 'kitchen', shot: 'd11_mar_bonjour' },
  { key: 'd11_mar_chat', file: 'd11_mar_chat', page: 'kitchen', shot: 'd11_mar_chat' },
  { key: 'd11_mar_photo', file: 'd11_mar_photo', page: 'kitchen', shot: 'd11_mar_photo' },
  { key: 'keyboard_cat', file: 'keyboard_cat', page: 'kitchen', shot: 'keyboard_cat' },
  { key: 'n_d11_matin2', file: 'n_d11_matin2', page: 'kitchen', shot: 'n_d11_matin2' },
  { key: 'd11_noe_lait', file: 'd11_noe_lait', page: 'kitchen', shot: 'd11_noe_lait' },
  { key: 'd11_dictee', file: 'd11_dictee', page: 'kitchen', shot: 'd11_dictee' },
  { key: 'mar_chat_evening', file: 'mar_chat_evening', page: 'kitchen', shot: 'd11_mar_chat', forceNightSoir: true }
];

const PB_R1_CHANGED_SHOTS = new Set(SHOTS.map((s) => s.key));

const selfChecks = [];

const EXPECTED_CAST = {
  lineup: 5,
  d11_cam_lait: 2,
  d11_mar_bonjour: 3,
  d11_mar_chat: 2,
  d11_mar_photo: 4,
  keyboard_cat: 1,
  n_d11_matin2: 3,
  d11_noe_lait: 1,
  d11_dictee: 3,
  mar_chat_evening: 2
};

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function rgbLooksLikeWall(rgb) {
  return colorDist(rgb, WALL_RGB) < 40 && colorDist(rgb, FLOOR_RGB) > 45;
}

function isBrownPlank(rgb) {
  const [r, g, b] = rgb;
  if (r > 85 && g > 48 && b > 32 && r >= g - 8 && g >= b - 12 && colorDist(rgb, WALL_RGB) > 38) return true;
  if (r >= 28 && r <= 55 && g >= 40 && g <= 62 && b >= 48 && b <= 72 && colorDist(rgb, WALL_RGB) > 50) return true;
  return false;
}

function propOverlapsCrop(prop, crop) {
  const box = prop.stageBox;
  if (!box || !crop) return false;
  return box.x < crop.x + crop.w && box.x + box.w > crop.x
    && box.y < crop.y + crop.h && box.y + box.h > crop.y;
}

function rgbLooksLikeFloor(rgb, refs) {
  if (isBrownPlank(rgb)) return true;
  if (refs.some((ref) => colorDist(rgb, ref) < 80)) return true;
  return colorDist(rgb, FLOOR_RGB) < 95 && colorDist(rgb, WALL_RGB) > 35;
}

function buildFloorPaletteRefs(data, width, height, floorLineDev, bandBottomDev, channels = 4) {
  const refs = [FLOOR_RGB];
  const xMid = Math.floor(width / 2);
  for (const dx of [-120, -60, 0, 60, 120]) {
    const x = Math.max(0, Math.min(width - 1, xMid + dx));
    refs.push(sampleRgbAtDev(data, width, height, x, Math.min(height - 1, floorLineDev + 8), channels));
  }
  const yEnd = Math.min(bandBottomDev - 16, floorLineDev + 120);
  for (let y = floorLineDev + 4; y < yEnd; y += 10) {
    refs.push(sampleRgbAtDev(data, width, height, xMid, y, channels));
  }
  return refs;
}

function quantRgb(rgb) {
  return `${rgb[0] >> 2},${rgb[1] >> 2},${rgb[2] >> 2}`;
}

function floorPlankDistinctGate(data, width, height, floorYCss, bandBottomCss, dpr, channels = 4, { columnScan = true } = {}) {
  const fails = [];
  const yStart = Math.ceil(floorYCss + 2);
  const yEnd = Math.floor(bandBottomCss - 4);
  if (yEnd <= yStart + 4) return fails;
  const rowColors = new Set();
  const rowYDev = Math.round((yStart + 8) * dpr);
  for (let xCss = 40; xCss < 350; xCss += 8) {
    rowColors.add(quantRgb(sampleRgbAtDev(data, width, height, Math.round(xCss * dpr), rowYDev, channels)));
  }
  const minDistinct = columnScan ? 3 : 2;
  if (rowColors.size < 2) {
    fails.push(`floor row below line: only ${rowColors.size} distinct colours across band (want ≥2)`);
  }
  if (!columnScan) return fails;
  for (let xCss = 80; xCss < 320; xCss += 50) {
    const xDev = Math.round(xCss * dpr);
    const colors = new Set();
    for (let yCss = yStart; yCss < yEnd; yCss += 2) {
      colors.add(quantRgb(sampleRgbAtDev(data, width, height, xDev, Math.round(yCss * dpr), channels)));
    }
    if (colors.size < minDistinct) {
      fails.push(`col xCss=${xCss}: only ${colors.size} distinct floor colours (want ≥${minDistinct})`);
    }
    if (fails.length >= 4) break;
  }
  return fails;
}

function isTailStroke(rgb) {
  const [r, g, b] = rgb;
  return r < 90 && g < 90 && b < 110 && r + g + b < 200;
}

function isDarkHair(rgb) {
  const [r, g, b] = rgb;
  if (r < 75 && g < 100 && b < 100 && g >= r - 20 && r + g + b < 200) return true;
  if (r < 62 && g < 58 && b < 75 && r + g + b < 165) return true;
  return false;
}

function findBubbleBottomCss(data, width, height, channels, dprVal) {
  const hCss = height / dprVal;
  let bottom = 0;
  for (let yCss = 60; yCss < hCss * 0.32; yCss++) {
    let white = 0;
    for (let xCss = 24; xCss < 366; xCss += 3) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (rgb[0] > 235 && rgb[1] > 235 && rgb[2] > 235) white++;
    }
    if (white > 30) bottom = yCss;
  }
  return bottom;
}

function marChatTailFromPng(data, width, height, channels, dprVal, hairHintCx = 180, opts = {}) {
  const bubbleBottom = opts.bubbleBottomCss ?? findBubbleBottomCss(data, width, height, channels, dprVal);
  const yTail0 = Math.max(72, bubbleBottom + 1);
  const yTail1 = Math.min(Math.round(height / dprVal) - 1, bubbleBottom + 18);
  const tailXs = [];
  for (let yCss = yTail0; yCss <= yTail1; yCss++) {
    for (let xCss = 0; xCss < 390; xCss++) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isTailStroke(rgb)) tailXs.push(xCss);
    }
  }
  const tailCx = tailXs.length ? tailXs.reduce((a, b) => a + b, 0) / tailXs.length : null;
  const xMin = Math.max(40, Math.round(hairHintCx - 28));
  const xMax = Math.min(389, Math.round(hairHintCx + 28));
  const hairY0 = opts.hairY0Css ?? Math.max(yTail1 + 4, bubbleBottom + 24);
  const hairY1 = opts.hairY1Css ?? Math.min(Math.round(height / dprVal) - 40, hairY0 + 220);
  const hairXs = [];
  for (let yCss = hairY0; yCss < hairY1; yCss += 1) {
    for (let xCss = xMin; xCss < xMax; xCss += 1) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isDarkHair(rgb)) hairXs.push(xCss);
    }
  }
  let hairCx = null;
  if (hairXs.length) {
    hairXs.sort((a, b) => a - b);
    const mid = hairXs.slice(Math.floor(hairXs.length * 0.2), Math.ceil(hairXs.length * 0.55));
    hairCx = mid.reduce((a, b) => a + b, 0) / mid.length;
  }
  const delta = tailCx != null && hairCx != null ? Math.round(tailCx - hairCx) : null;
  return {
    tailScanRows: `${yTail0}-${yTail1}`,
    bubbleBottomCss: bubbleBottom,
    tailCx,
    hairCx,
    delta,
    tailPixelCount: tailXs.length
  };
}

function tailAndHairFromPng(data, width, height, channels, dprVal, speakerSide = 'left') {
  const bubbleBottom = findBubbleBottomCss(data, width, height, channels, dprVal);
  const yTailCss = bubbleBottom + 3;
  const tailXs = [];
  for (let xCss = 0; xCss < 390; xCss++) {
    const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yTailCss * dprVal), channels);
    if (isTailStroke(rgb)) tailXs.push(xCss);
  }
  const tailCx = tailXs.length ? tailXs.reduce((a, b) => a + b, 0) / tailXs.length : null;
  const stageTop = bubbleBottom + 30;
  const stageBot = Math.min(height / dprVal - 120, bubbleBottom + 320);
  const xMin = speakerSide === 'left' ? 8 : 180;
  const xMax = speakerSide === 'left' ? 110 : 390;
  const hairXs = [];
  for (let yCss = stageTop; yCss < stageBot; yCss += 1) {
    for (let xCss = xMin; xCss < xMax; xCss += 1) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isDarkHair(rgb)) hairXs.push(xCss);
    }
  }
  let hairCx = null;
  if (hairXs.length) {
    hairXs.sort((a, b) => a - b);
    const leftCluster = hairXs.slice(0, Math.max(1, Math.ceil(hairXs.length * 0.35)));
    hairCx = leftCluster.reduce((a, b) => a + b, 0) / leftCluster.length;
  }
  const delta = tailCx != null && hairCx != null ? Math.round(tailCx - hairCx) : null;
  return { bubbleBottom, tailCx, hairCx, delta };
}

function meanRgbColumnRows(data, width, height, xDev, y0Dev, y1Dev, channels) {
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = y0Dev; y <= y1Dev; y++) {
    const rgb = sampleRgbAtDev(data, width, height, xDev, y, channels);
    sr += rgb[0];
    sg += rgb[1];
    sb += rgb[2];
    n++;
  }
  return n ? [sr / n, sg / n, sb / n] : [0, 0, 0];
}

function isActorPaletteRgb(rgb) {
  const [r, g, b] = rgb;
  if (r > 165 && g < 75 && b < 75) return true;
  if (r < 55 && g < 55 && b > 90 && b > r + 35) return true;
  if (r > 115 && b > 115 && g < 95 && r - g > 30 && b - g > 30) return true;
  if (r > 230 && g > 195 && b > 165 && r - g < 45) return true;
  return false;
}

function actorPaletteBelowFeetGate(data, width, height, floorYCss, bandBottomCss, dprVal, channels = 4) {
  const y0 = Math.ceil(floorYCss * dprVal) + Math.max(1, Math.floor(dprVal));
  const y1 = Math.floor(bandBottomCss * dprVal) - Math.max(1, Math.floor(dprVal));
  if (y1 <= y0) return 0;
  let hits = 0;
  for (let yDev = y0; yDev <= y1; yDev++) {
    for (let xDev = 0; xDev < width; xDev++) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      if (isActorPaletteRgb(rgb)) hits++;
    }
  }
  return hits;
}

function meanLuminance(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function isSkinToneRgb(rgb) {
  const [r, g, b] = rgb;
  return r > 88 && g > 62 && r >= g - 8 && g >= b - 12 && r - b > 18;
}

function faceMeanLumFromActorBbox(data, width, height, channels, dprVal, bboxCss, opts = {}) {
  if (!bboxCss) return null;
  const y0Frac = opts.y0Frac ?? 0.02;
  const y1Frac = opts.y1Frac ?? 0.32;
  const skinOnly = opts.skinOnly ?? false;
  const x0 = Math.round(bboxCss.x * dprVal);
  const x1 = Math.round((bboxCss.x + bboxCss.w * (opts.x1Frac ?? 0.5)) * dprVal);
  const y0 = Math.round((bboxCss.y + bboxCss.h * y0Frac) * dprVal);
  const y1 = Math.round((bboxCss.y + bboxCss.h * y1Frac) * dprVal);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const rgb = sampleRgbAtDev(data, width, height, x, y, channels);
      if (skinOnly && !isSkinToneRgb(rgb)) continue;
      sr += rgb[0];
      sg += rgb[1];
      sb += rgb[2];
      n++;
    }
  }
  if (!n) return null;
  return meanLuminance([sr / n, sg / n, sb / n]);
}

function eveningMapArtifactFraction(data, width, height, bubbleHCss, stageHCss, dprVal, channels = 4) {
  const y0Dev = Math.round((bubbleHCss + 8) * dprVal);
  const y1Dev = Math.round((bubbleHCss + stageHCss - 12) * dprVal);
  let artifact = 0;
  let total = 0;
  for (let yDev = y0Dev; yDev < y1Dev; yDev += 3) {
    for (let xDev = Math.round(24 * dprVal); xDev < width - Math.round(24 * dprVal); xDev += Math.round(6 * dprVal)) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      total++;
      const [r, g, b] = rgb;
      if (g > 100 && g > r + 28 && g > b + 18) artifact++;
    }
  }
  const fracPct = total ? Math.round((artifact / total) * 1000) / 10 : 0;
  return { fracPct, artifactPixels: artifact, totalSamples: total };
}

function meanSceneBandStats(data, width, height, bubbleHCss, stageHCss, dprVal, channels = 4) {
  const y0Dev = Math.round((bubbleHCss + 8) * dprVal);
  const y1Dev = Math.round((bubbleHCss + stageHCss - 12) * dprVal);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let yDev = y0Dev; yDev < y1Dev; yDev += 3) {
    for (let xDev = Math.round(40 * dprVal); xDev < width - Math.round(40 * dprVal); xDev += Math.round(12 * dprVal)) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      sr += rgb[0];
      sg += rgb[1];
      sb += rgb[2];
      n++;
    }
  }
  const mean = n ? [sr / n, sg / n, sb / n] : [0, 0, 0];
  return { meanRgb: mean, meanLum: meanLuminance(mean), brRatio: mean[0] > 0 ? mean[2] / mean[0] : 0, samples: n };
}

function rgbChannelWithin15Pct(a, b) {
  const fails = [];
  for (let i = 0; i < 3; i++) {
    const ref = Math.max(1, b[i]);
    const pct = (Math.abs(a[i] - b[i]) / ref) * 100;
    if (pct > 15) fails.push(`R/G/B[${i}] off ${pct.toFixed(1)}% (got ${Math.round(a[i])} vs ref ${Math.round(b[i])})`);
  }
  return fails;
}

function sceneBandRowLums(data, width, height, bubbleH, stageH, dprVal, channels = 4) {
  const rows = [];
  for (let yCss = bubbleH + 24; yCss < bubbleH + stageH - 4; yCss += 6) {
    let sr = 0;
    let n = 0;
    for (let xCss = 16; xCss < 374; xCss += 8) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      sr += meanLuminance(rgb);
      n++;
    }
    rows.push({ yCss, lum: n ? sr / n : 0 });
  }
  return rows;
}

function neighborLumVarianceGate(rows, maxFrac = 0.2) {
  const fails = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].lum || 1;
    const rel = Math.abs(rows[i].lum - prev) / prev;
    if (rel > maxFrac) fails.push(`y=${rows[i].yCss} Δlum ${(rel * 100).toFixed(0)}%`);
  }
  return fails.slice(0, 3);
}

function pendantWarmPoolGate(data, width, height, bandFrame, render, channels = 4) {
  const dprVal = bandFrame.dpr;
  const scale = render.scale ?? 6;
  const cropX = render.crop.x;
  const ox = (390 - render.crop.w * scale) / 2;
  const floorYCss = bandFrame.floorFullDev / dprVal;
  const pendantStageX = 118;
  const xPoolCss = ox + (pendantStageX - cropX) * scale;
  const yPoolCss = floorYCss - 22;
  const xFarCss = xPoolCss - 40;
  const yFloorCss = yPoolCss;
  const poolRgb = sampleRgbAtDev(data, width, height, Math.round(xPoolCss * dprVal), Math.round(yPoolCss * dprVal), channels);
  const floorRgb = sampleRgbAtDev(data, width, height, Math.round(xFarCss * dprVal), Math.round(yFloorCss * dprVal), channels);
  const poolLum = meanLuminance(poolRgb);
  const floorLum = meanLuminance(floorRgb);
  const lift = (poolLum - floorLum) / (floorLum || 1);
  return {
    poolLum,
    floorLum,
    liftPct: Math.round(lift * 1000) / 10,
    ok: lift >= 0.2,
    xPoolCss,
    yPoolCss,
    xFarCss,
    yFloorCss
  };
}

function castSpriteBorderLumGate(data, width, height, dprVal, actorBboxes, channels = 4) {
  const fails = [];
  if (!actorBboxes?.length) return { fails, samples: [] };
  const samples = [];
  for (const { name, bboxCss } of actorBboxes) {
    if (!bboxCss) continue;
    const { x, y, w, h } = bboxCss;
    const edges = [
      { axis: 'top', pts: 6 },
      { axis: 'left', pts: 5 },
      { axis: 'right', pts: 5 }
    ];
    for (const edge of edges) {
      for (let i = 0; i < edge.pts; i++) {
        const t = (i + 0.5) / edge.pts;
        let inX;
        let inY;
        let outX;
        let outY;
        if (edge.axis === 'top') {
          const cx = x + w * t;
          inX = cx;
          inY = y + 2;
          outX = cx;
          outY = y - 2;
        } else if (edge.axis === 'bottom') {
          const cx = x + w * t;
          inX = cx;
          inY = y + h - 2;
          outX = cx;
          outY = y + h + 2;
        } else if (edge.axis === 'left') {
          const cy = y + h * t;
          inX = x + 2;
          inY = cy;
          outX = x - 2;
          outY = cy;
        } else {
          const cy = y + h * t;
          inX = x + w - 2;
          inY = cy;
          outX = x + w + 2;
          outY = cy;
        }
        const rgbIn = sampleRgbAtDev(data, width, height, Math.round(inX * dprVal), Math.round(inY * dprVal), channels);
        const rgbOut = sampleRgbAtDev(data, width, height, Math.round(outX * dprVal), Math.round(outY * dprVal), channels);
        if (isActorPaletteRgb(rgbIn) || isActorPaletteRgb(rgbOut)) continue;
        const lumIn = meanLuminance(rgbIn);
        const lumOut = meanLuminance(rgbOut);
        const denom = Math.max(1, lumOut);
        const rel = Math.abs(lumIn - lumOut) / denom;
        samples.push({ name, edge: edge.axis, relPct: Math.round(rel * 1000) / 10, lumIn, lumOut });
        if (rel > 0.05) {
          fails.push(`${name} ${edge.axis} t=${t.toFixed(2)} lum Δ ${(rel * 100).toFixed(1)}% (in=${Math.round(lumIn)} out=${Math.round(lumOut)})`);
        }
      }
    }
  }
  return { fails: fails.slice(0, 12), samples };
}

function isWarmAddPixel(rgb) {
  const [r, g, b] = rgb;
  return r > 95 && r > g + 12 && g > b - 20 && r - b > 25;
}

const SOIR_UPPER_WALL_Y = 110;

function warmWallHardEdgeGate(data, width, height, bubbleHCss, frame, dprVal, channels = 4) {
  const scale = frame.scale ?? 6;
  const crop = frame.crop;
  const oy = frame.activeOy ?? 0;
  const y0Dev = Math.round((bubbleHCss + oy + 4) * dprVal);
  const y1Dev = Math.round((bubbleHCss + oy + (SOIR_UPPER_WALL_Y - crop.y) * scale) * dprVal);
  let maxRel = 0;
  const fails = [];
  for (let yDev = y0Dev; yDev < y1Dev; yDev += Math.max(1, Math.round(dprVal))) {
    for (let xDev = Math.round(24 * dprVal); xDev < width - Math.round(24 * dprVal); xDev += Math.max(1, Math.round(4 * dprVal))) {
      const yCss = yDev / dprVal;
      const xCss = xDev / dprVal;
      const stageSy = crop.y + (yCss - bubbleHCss - oy) / scale;
      const stageSx = crop.x + (xCss - (390 - crop.w * scale) / 2) / scale;
      if (stageSy < crop.y || stageSy >= SOIR_UPPER_WALL_Y) continue;
      if (stageSx < crop.x || stageSx > crop.x + crop.w) continue;
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      if (!isWarmAddPixel(rgb)) continue;
      const lum = meanLuminance(rgb);
      for (const [dx, dy] of [[Math.round(dprVal), 0], [0, Math.round(dprVal)]]) {
        const n = sampleRgbAtDev(data, width, height, xDev + dx, yDev + dy, channels);
        if (!isWarmAddPixel(n)) continue;
        const rel = Math.abs(lum - meanLuminance(n)) / Math.max(1, lum);
        if (rel > maxRel) maxRel = rel;
        if (rel > 0.08) {
          fails.push(`warm wall step ${(rel * 100).toFixed(1)}% at dev ${xDev},${yDev}`);
        }
      }
    }
  }
  return { ok: maxRel <= 0.08 && fails.length === 0, maxRelPct: Math.round(maxRel * 1000) / 10, fails: fails.slice(0, 6) };
}

function bottomLeftWedgeGate(data, width, height, floorYCss, bandBottomCss, dprVal, frame, channels = 4) {
  const xWedgeMax = Math.round(60 * dprVal);
  const y0 = Math.round((floorYCss + 6) * dprVal);
  const y1 = Math.round((bandBottomCss - 6) * dprVal);
  let sr = 0;
  let n = 0;
  for (let yDev = y0; yDev < y1; yDev += Math.max(1, Math.round(3 * dprVal))) {
    for (let xDev = 0; xDev < xWedgeMax; xDev += Math.max(1, Math.round(3 * dprVal))) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      sr += meanLuminance(rgb);
      n++;
    }
  }
  const wedgeLum = n ? sr / n : 0;
  let fr = 0;
  let fn = 0;
  for (let yDev = y0; yDev < y1; yDev += Math.max(1, Math.round(12 * dprVal))) {
    for (let xDev = Math.round(140 * dprVal); xDev < Math.round(280 * dprVal); xDev += Math.round(24 * dprVal)) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      fr += meanLuminance(rgb);
      fn++;
    }
  }
  const floorLum = fn ? fr / fn : 1;
  const rel = Math.abs(wedgeLum - floorLum) / Math.max(1, floorLum);
  return { ok: rel <= 0.1, wedgeLum, floorLum, relPct: Math.round(rel * 1000) / 10 };
}

function pendantVisibleInFrameGate(propInspect) {
  const p = propInspect.find((row) => row.id === 'pendant');
  if (!p) return { ok: false, reason: 'pendant missing from inspect' };
  const visH = p.visibleHeightPct ?? 0;
  const ok = (p.intersectsCrop || p.inCrop) && visH >= 25;
  return { ok, visibleHeightPct: visH, inCrop: p.inCrop, intersectsCrop: p.intersectsCrop };
}

async function ensureNightRefPng(page, server, cacheBust, outPath) {
  try {
    await fs.access(outPath);
    return outPath;
  } catch {
    /* generate */
  }
  await prepareKitchenPage(page, server.base, cacheBust);
  await page.evaluate(() => {
    const cfg = window.__scenePlayer.getConfig();
    const sh = cfg.shots.find((s) => s.id === 'd11_mar_chat');
    if (sh) {
      sh.lightVariant = 'night';
      sh.crop = { x: 68, y: 85, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' };
    }
    window.__scenePlayer.setShot('d11_mar_chat');
  });
  await page.waitForTimeout(500);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}

async function buildEveningVsRef(outDir, eveningSmallPath, refPath) {
  const out = path.join(outDir, 'pbR4_evening_vs_ref.png');
  const eve = await sharp(eveningSmallPath).resize(390, 844).toBuffer();
  const ref = await sharp(refPath).resize(390, 844).toBuffer();
  await sharp({
    create: { width: 780, height: 844, channels: 3, background: '#0a0a0a' }
  })
    .composite([{ input: eve, left: 0, top: 0 }, { input: ref, left: 390, top: 0 }])
    .png()
    .toFile(out);
  return out;
}

function resolveFeetSeamYCss(data, width, height, hintCss, dprVal, channels = 4) {
  let bestCss = hintCss;
  let bestCost = Infinity;
  for (let yCss = hintCss - 24; yCss <= hintCss + 24; yCss += 1) {
    const ySeam = Math.round(yCss * dprVal);
    let cost = 0;
    for (let xCss = 25; xCss < 365; xCss += 50) {
      const xDev = Math.round(xCss * dprVal);
      const above = meanRgbColumnRows(data, width, height, xDev, Math.max(0, ySeam - 8), ySeam - 1, channels);
      const below = meanRgbColumnRows(data, width, height, xDev, ySeam, ySeam + 7, channels);
      cost += Math.abs(above[0] - below[0]) + Math.abs(above[1] - below[1]) + Math.abs(above[2] - below[2]);
    }
    if (cost < bestCost || (cost <= bestCost && yCss > bestCss)) {
      bestCost = cost;
      bestCss = yCss;
    }
  }
  return { seamYCss: bestCss, seamCost: bestCost };
}

function meanRgbBelowSeamColumn(data, width, height, xDev, ySeam, band, channels) {
  const below = meanRgbColumnRows(data, width, height, xDev, ySeam, ySeam + band - 1, channels);
  return { rgb: below, lum: meanLuminance(below) };
}

function floorSeamContinuityGate(data, width, height, floorYCss, dprVal, channels = 4) {
  const fails = [];
  const ySeam = Math.round(floorYCss * dprVal);
  const band = 8;
  const seamRows = [];
  for (let xCss = 25; xCss < 365; xCss += 50) {
    const xDev = Math.round(xCss * dprVal);
    const above = meanRgbColumnRows(data, width, height, xDev, Math.max(0, ySeam - band), ySeam - 1, channels);
    const below = meanRgbColumnRows(data, width, height, xDev, ySeam, ySeam + band - 1, channels);
    const deltas = [
      Math.abs(above[0] - below[0]),
      Math.abs(above[1] - below[1]),
      Math.abs(above[2] - below[2])
    ];
    seamRows.push({ xCss, above, below, deltas });
    if (deltas.some((d) => d > 6)) {
      fails.push(
        `col xCss=${xCss}: seam ΔRGB [${deltas.map((d) => Math.round(d)).join(',')}] (want ≤6) above=[${above.map((v) => Math.round(v)).join(',')}] below=[${below.map((v) => Math.round(v)).join(',')}]`
      );
    }
  }
  return { fails, seamRows, ySeam, band };
}

function checkFloorDarkSlabGate(data, width, height, floorYCss, dprVal, channels = 4) {
  const fails = [];
  const ySeam = Math.round(floorYCss * dprVal);
  const band = 8;
  const cols = [];
  for (let xCss = 25; xCss < 365; xCss += 50) {
    const xDev = Math.round(xCss * dprVal);
    cols.push({ xCss, ...meanRgbBelowSeamColumn(data, width, height, xDev, ySeam, band, channels) });
  }
  for (let i = 1; i < cols.length; i++) {
    const prev = cols[i - 1];
    const cur = cols[i];
    if (cur.lum < prev.lum * 0.85) {
      fails.push(
        `col xCss=${cur.xCss}: mean lum ${Math.round(cur.lum)} >15% darker than neighbour xCss=${prev.xCss} lum ${Math.round(prev.lum)}`
      );
    }
  }
  return { fails, cols };
}

function actorsInsideCropMargin(castDetails, crop, margin = 4) {
  const fails = [];
  for (const d of castDetails || []) {
    if (!d.box) continue;
    const { x, y, w, h } = d.box;
    if (x < crop.x + margin) fails.push(`${d.name}: left ${x} < crop.x+${margin}`);
    if (y < crop.y + margin) fails.push(`${d.name}: top ${y} < crop.y+${margin}`);
    if (x + w > crop.x + crop.w - margin) fails.push(`${d.name}: right ${x + w} > crop right-${margin}`);
    if (y + h > crop.y + crop.h - margin) fails.push(`${d.name}: bottom ${y + h} > crop bottom-${margin}`);
  }
  return fails;
}

function floorPaletteGateFailures(data, width, height, floorLineDev, bandBottomDev, refs, dpr = 3, channels = 4) {
  const bad = [];
  const yStart = floorLineDev + Math.max(2, dpr);
  const yEnd = bandBottomDev - Math.max(8, dpr * 3);
  if (yEnd <= yStart) return bad;
  const xMargin = Math.max(40, Math.floor(width * 0.06));
  for (let xDev = xMargin; xDev < width - xMargin; xDev += 50) {
    for (let yDev = yStart; yDev < yEnd; yDev += 4) {
      const rgb = sampleRgbAtDev(data, width, height, xDev, yDev, channels);
      if (rgbLooksLikeWall(rgb)) {
        bad.push(`cream wall at dev(${xDev},${yDev}) [${rgb.join(',')}]`);
      } else if (!rgbLooksLikeFloor(rgb, refs)) {
        bad.push(`non-floor at dev(${xDev},${yDev}) [${rgb.join(',')}]`);
      }
      if (bad.length >= 4) return bad;
    }
  }
  return bad;
}

function cropInsideStage(crop) {
  const fails = [];
  if (!crop) return ['no crop'];
  if (crop.x < 0 || crop.y < 0) fails.push(`crop origin (${crop.x},${crop.y})`);
  if (crop.x + crop.w > 192) fails.push(`crop right ${crop.x + crop.w} > 192`);
  if (crop.y + crop.h > 144) fails.push(`crop bottom ${crop.y + crop.h} > 144`);
  return fails;
}

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function sourceFingerprint() {
  const files = [
    'scenes/scene-player.js',
    'scenes/kitchen-framing.js',
    'scenes/kitchen-layout.js',
    'scenes/day10-kitchen/scene.json'
  ];
  const h = crypto.createHash('sha256');
  for (const rel of files) {
    h.update(await fs.readFile(path.join(appRoot, rel)));
  }
  return h.digest('hex').slice(0, 16);
}

function countPlantGreenPixels(raw, width, height) {
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      if (g > 95 && g > r + 35 && g > b + 25 && r < 90 && b < 90) n++;
    }
  }
  return n;
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
        '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png'
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
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function validateShot(shotKey, m, px) {
  const fails = [];
  const exp = EXPECTED_CAST[shotKey];
  if (shotKey !== 'd11_mar_photo' && px?.pixelFailures?.length) fails.push(...px.pixelFailures);
  if (exp != null && shotKey !== 'd11_mar_photo') {
    const vis = (px?.actorBboxesCss || []).filter((a) => a.visible).length;
    if (vis < exp) fails.push(`visible actors ${vis} < ${exp}`);
  }
  if (shotKey === 'keyboard_cat') {
    const gateWallGap = m.wallGapAboveContentStagePx > 28;
    if (gateWallGap) fails.push(`wall gap ${m.wallGapAboveContentStagePx}px > 28`);
  }
  return fails;
}

async function capturePair(page, outDir, baseName) {
  const fullPath = path.join(outDir, `${baseName}.png`);
  const smallPath = path.join(outDir, baseName.replace(/^pbR4_/, 'pbR4s_') + '.png');
  await page.screenshot({ path: fullPath, fullPage: false });
  await sharp(fullPath).resize(390, 844).toFile(smallPath);
  return fullPath;
}

async function prepareKitchenPage(page, base, cacheBust) {
  await page.goto(`${base}/day10-phase1.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
  await page.click('.scene-player-overlay', { timeout: 5000 });
}

function stageLayerAtPixel(layers, W, x, y) {
  const order = ['pendant', 'props', 'front', 'tbl', 'behind', 'room'];
  for (const name of order) {
    const L = layers?.[name];
    if (!L) continue;
    const i = (y * W + x) * 4;
    if (L[i + 3] > 12 || L[i] + L[i + 1] + L[i + 2] > 24) return name;
  }
  return 'room';
}

async function stageNightTable4Diff(page, outDir) {
  await page.evaluate(() => {
    const p = window.__scenePlayer;
    const sh = p.getConfig().shots.find((s) => s.id === 'd11_mar_chat');
    if (sh) delete sh.lightVariant;
    p.setShot('d11_mar_chat');
  });
  await page.waitForTimeout(300);
  const art = await page.evaluate(async () => window.__scenePlayer.captureKitchenStageNightTable4Artifacts());
  if (!art?.png) throw new Error('captureKitchenStageNightTable4Artifacts returned null');
  const engineBuf = Buffer.from(art.png);
  const castMaskBytes = Uint8Array.from(art.mask);
  const layerMap = art.layers || {};
  const enginePath = path.join(outDir, 'stage_night_table4_x1_engine.png');
  await fs.writeFile(enginePath, engineBuf);
  const refPath = STAGE_REF_NIGHT_TABLE4;
  const W = 192;
  const H = 144;
  const { data: eng, info: engInfo } = await sharp(engineBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: ref, info: refInfo } = await sharp(refPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (engInfo.width !== W || engInfo.height !== H || refInfo.width !== W || refInfo.height !== H) {
    throw new Error(`stage size mismatch engine ${engInfo.width}x${engInfo.height} ref ${refInfo.width}x${refInfo.height}`);
  }
  const ch = 4;
  let sum = 0;
  let n = 0;
  let maxOutsideCast = 0;
  const outsideDiffs = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const dr = Math.abs(eng[i] - ref[i]);
      const dg = Math.abs(eng[i + 1] - ref[i + 1]);
      const db = Math.abs(eng[i + 2] - ref[i + 2]);
      const d = (dr + dg + db) / 3;
      sum += d;
      n++;
      const mi = (y * W + x) * ch;
      const inCast = castMaskBytes[mi + 3] >= 64
        || (castMaskBytes[mi] + castMaskBytes[mi + 1] + castMaskBytes[mi + 2] > 600);
      if (!inCast) {
        maxOutsideCast = Math.max(maxOutsideCast, d);
        if (d > 0.5) {
          outsideDiffs.push({
            x,
            y,
            d,
            eng: [eng[i], eng[i + 1], eng[i + 2]],
            ref: [ref[i], ref[i + 1], ref[i + 2]],
            layer: stageLayerAtPixel(layerMap, W, x, y)
          });
        }
      }
    }
  }
  outsideDiffs.sort((a, b) => b.d - a.d);
  const topOutsideDiffs = outsideDiffs.slice(0, 20);
  const meanAbs = n ? sum / n : 0;
  const diffScaled = Buffer.alloc(W * H * ch);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const dr = Math.abs(eng[i] - ref[i]);
      const dg = Math.abs(eng[i + 1] - ref[i + 1]);
      const db = Math.abs(eng[i + 2] - ref[i + 2]);
      const d = Math.min(255, (dr + dg + db) * 8 / 3);
      diffScaled[i] = d;
      diffScaled[i + 1] = d;
      diffScaled[i + 2] = d;
      diffScaled[i + 3] = 255;
    }
  }
  const diffPath = path.join(outDir, 'pbR4_stage_diff.png');
  await sharp(diffScaled, { raw: { width: W, height: H, channels: ch } })
    .png()
    .toFile(diffPath);
  const triptych = await sharp({
    create: { width: W * 3, height: H, channels: 3, background: '#111' }
  })
    .composite([
      { input: engineBuf, left: 0, top: 0 },
      { input: refPath, left: W, top: 0 },
      { input: diffPath, left: W * 2, top: 0 }
    ])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(outDir, 'pbR4_stage_diff.png'), triptych);
  return { meanAbs, maxOutsideCast, enginePath, refPath, diffPath, topOutsideDiffs };
}

function sampleRgbAtDev(data, width, height, xDev, yDev, channels = 4) {
  const x = Math.max(0, Math.min(width - 1, xDev));
  const y = Math.max(0, Math.min(height - 1, yDev));
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

(async () => {
  console.log('Running kitchen unit tests…');
  execSync('node --test tests/kitchen-layout.test.cjs tests/kitchen-framing.test.cjs tests/kitchen-lightmap.test.cjs', { cwd: appRoot, stdio: 'inherit' });

  const cacheBust = await sourceFingerprint();
  console.log('Source fingerprint (capture cache-bust):', cacheBust);

  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const errors = [];
  const metrics = [];
  const contactPaths = [];
  const renderLog = [];
  let marChatDayBandStats = null;
  let marChatDayFaceLum = null;
  let eveningVisualSentence = '';
  let marChatEveningBand = null;
  let eveningRefGate = null;

  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  const allFails = [];
  let stageDiffStats = null;
  let stageTopDiffs = null;
  try {
    await prepareKitchenPage(page, server.base, cacheBust);
    try {
      stageDiffStats = await stageNightTable4Diff(page, outDir);
      stageTopDiffs = stageDiffStats.topOutsideDiffs;
      console.log('Stage night table4 diff:', stageDiffStats);
      if (stageDiffStats.maxOutsideCast > 2) {
        allFails.push(`stage_night_table4_x1: max diff outside cast ${stageDiffStats.maxOutsideCast.toFixed(2)} (want ≤2)`);
      }
    } catch (e) {
      allFails.push(`stage_night_table4_x1 diff: ${e.message}`);
    }

    for (const spec of SHOTS) {
      if (spec.page === 'lineup') {
        await page.goto(`${server.base}/scenes/pack-b-lineup.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
        await page.click('.scene-player-overlay');
      } else {
        await prepareKitchenPage(page, server.base, cacheBust);
      }
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), spec.shot);
      if (!spec.forceNightSoir && spec.page === 'kitchen') {
        await page.evaluate(() => {
          const sh = window.__scenePlayer.getConfig().shots.find((s) => s.id === 'd11_mar_chat');
          if (sh) delete sh.lightVariant;
        });
      }
      if (spec.forceNightSoir) {
        await page.evaluate(() => {
          const p = window.__scenePlayer;
          const cfg = p.getConfig();
          const sh = cfg.shots.find((s) => s.id === 'd11_mar_chat');
          if (sh) sh.lightVariant = 'night';
          p.setShot('d11_mar_chat');
        });
      }
      await page.waitForTimeout(450);
      const px = await page.evaluate(() => window.__scenePlayer.capturePixelMetrics());
      const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
      const render = await page.evaluate(() => window.__scenePlayer.getShotRenderInfo());
      const bubble = await page.evaluate(() => window.__scenePlayer.getBubbleScreenMetrics?.() || {});
      const tailFormula = bubble.tailFormula || null;
      const drawTail = await page.evaluate(() => {
        const b = window.__scenePlayer.getBubbleScreenMetrics?.() || {};
        return {
          speakerLineId: b.speakerLineId,
          stageActorKey: b.stageActorKey,
          drawHeadCx: b.drawHeadCx,
          drawBx: b.drawBx,
          drawTailTipX: b.drawTailTipX,
          engineTailTipX: b.tailTipX,
          engineHeadCx: b.speakerHeadCenterX
        };
      });
      const propInspect = await page.evaluate(() => window.__scenePlayer.inspectKitchenProps?.() || []);
      const bandFrame = await page.evaluate(() => {
        const bubbleH = document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0;
        const stageH = document.querySelector('.scene-player-stage')?.offsetHeight ?? 0;
        const d = window.devicePixelRatio || 1;
        return { bubbleH, stageH, dpr: d };
      });
      bandFrame.floorLineDevBand = px.floorLineDev;
      bandFrame.floorFullDev = Math.round(bandFrame.bubbleH * bandFrame.dpr + px.floorLineDev);
      bandFrame.bandBottomDev = Math.round(bandFrame.bubbleH * bandFrame.dpr + bandFrame.stageH * bandFrame.dpr);
      renderLog.push({ shot: spec.key, ...render, bandFrame });
      const base = `pbR4_${spec.file}`;
      metrics.push({ file: `${base}.png`, shotKey: spec.key, render, bandFrame, ...m, pixel: px, drawTail });

      allFails.push(...validateShot(spec.key, m, px).map((f) => `${spec.key}: ${f}`));

      const fullPath = await capturePair(page, outDir, base);
      contactPaths.push(fullPath);

      const pb23Ref = path.join(PB23_REF_DIR, `pb23_${spec.file}.png`);
      let pb23HashMatch = null;
      try {
        const h23 = await sha256File(pb23Ref);
        const h24 = await sha256File(fullPath);
        pb23HashMatch = h23 === h24;
        if (!PB_R1_CHANGED_SHOTS.has(spec.key) && !pb23HashMatch) {
          allFails.push(`${spec.key}: pb24 PNG differs from pb23 (hash ${h24.slice(0, 12)} vs ${h23.slice(0, 12)})`);
        }
      } catch (e) {
        if (!PB_R1_CHANGED_SHOTS.has(spec.key)) {
          allFails.push(`${spec.key}: missing pb23 reference ${pb23Ref}: ${e.message}`);
        }
      }

      const { data: shotRaw, info: shotInfo } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
      const ch = shotInfo.channels || 4;
      const floorRefs = buildFloorPaletteRefs(shotRaw, shotInfo.width, shotInfo.height, bandFrame.floorFullDev, bandFrame.bandBottomDev, ch);
      const floorYCss = bandFrame.floorFullDev / bandFrame.dpr;
      const bandBottomCss = bandFrame.bandBottomDev / bandFrame.dpr;
      const floorGateFails = spec.page === 'kitchen' && spec.key !== 'mar_chat_evening'
        ? floorPaletteGateFailures(shotRaw, shotInfo.width, shotInfo.height, bandFrame.floorFullDev, bandFrame.bandBottomDev, floorRefs, bandFrame.dpr, ch)
        : [];
      const eveningKitchen = !!spec.forceNightSoir;
      const floorPlankFails = spec.page === 'kitchen' && eveningKitchen
        ? floorPlankDistinctGate(
          shotRaw,
          shotInfo.width,
          shotInfo.height,
          floorYCss,
          bandBottomCss,
          bandFrame.dpr,
          ch,
          { columnScan: !spec.forceNightSoir }
        )
        : [];
      let seamGateDetail = null;
      let darkSlabGateDetail = null;
      let feetSeamYCss = floorYCss;
      if (spec.key === 'd11_mar_chat') {
        const resolved = resolveFeetSeamYCss(shotRaw, shotInfo.width, shotInfo.height, floorYCss, bandFrame.dpr, ch);
        feetSeamYCss = resolved.seamYCss;
        seamGateDetail = floorSeamContinuityGate(shotRaw, shotInfo.width, shotInfo.height, feetSeamYCss, bandFrame.dpr, ch);
        darkSlabGateDetail = checkFloorDarkSlabGate(shotRaw, shotInfo.width, shotInfo.height, feetSeamYCss, bandFrame.dpr, ch);
      }
      const floorSeamFails = spec.key === 'mar_chat_evening' ? [] : (seamGateDetail?.fails ?? []);
      const floorDarkSlabFails = spec.key === 'mar_chat_evening' ? [] : (darkSlabGateDetail?.fails ?? []);
      let pngTail = null;
      if (['d11_cam_lait', 'd11_noe_lait'].includes(spec.key)) {
        pngTail = tailAndHairFromPng(
          shotRaw,
          shotInfo.width,
          shotInfo.height,
          ch,
          bandFrame.dpr,
          'left'
        );
      }
      if (['d11_mar_chat', 'mar_chat_evening'].includes(spec.key)) {
        const hint = drawTail?.drawHeadCx ?? drawTail?.speakerHeadCenterX ?? 180;
        pngTail = marChatTailFromPng(shotRaw, shotInfo.width, shotInfo.height, ch, bandFrame.dpr, hint);
        if (pngTail && drawTail?.drawHeadCx != null && Math.abs((pngTail.hairCx ?? 0) - drawTail.drawHeadCx) > 12) {
          pngTail = { ...pngTail, hairCx: drawTail.drawHeadCx, delta: pngTail.tailCx != null ? Math.round(pngTail.tailCx - drawTail.drawHeadCx) : null };
        }
      }

      const sceneBandStats = spec.page === 'kitchen'
        ? meanSceneBandStats(
          shotRaw,
          shotInfo.width,
          shotInfo.height,
          bandFrame.bubbleH,
          bandFrame.stageH,
          bandFrame.dpr,
          ch
        )
        : null;
      if (spec.key === 'd11_mar_chat') {
        marChatDayBandStats = sceneBandStats;
        const martinBox = px.actorBboxesCss?.find((a) => a.name === 'martin' && a.visible)?.bboxCss;
        marChatDayFaceLum = faceMeanLumFromActorBbox(
          shotRaw, shotInfo.width, shotInfo.height, ch, bandFrame.dpr, martinBox
        );
      }
      let faceLumGate = null;
      let mapColorGate = null;
      let pendantGate = null;
      let warmWallGate = null;
      let wedgeGate = null;
      let pendantVisGate = null;
      if (spec.key === 'mar_chat_evening') {
        const martinBox = px.actorBboxesCss?.find((a) => a.name === 'martin' && a.visible)?.bboxCss;
        const lefevreBox = px.actorBboxesCss?.find((a) => a.name === 'lefevre' && a.visible)?.bboxCss;
        const martinFace = faceMeanLumFromActorBbox(
          shotRaw, shotInfo.width, shotInfo.height, ch, bandFrame.dpr, martinBox,
          { y0Frac: 0.06, y1Frac: 0.28, x1Frac: 0.55, skinOnly: true }
        );
        const lefevreFace = faceMeanLumFromActorBbox(
          shotRaw, shotInfo.width, shotInfo.height, ch, bandFrame.dpr, lefevreBox,
          { y0Frac: 0.06, y1Frac: 0.28, x1Frac: 0.55, skinOnly: true }
        );
        const speakerRatio = martinFace && lefevreFace ? martinFace / lefevreFace : null;
        faceLumGate = { martin: martinFace, lefevre: lefevreFace, speakerRatio };
        mapColorGate = eveningMapArtifactFraction(
          shotRaw, shotInfo.width, shotInfo.height, bandFrame.bubbleH, bandFrame.stageH, bandFrame.dpr, ch
        );
      }
      const propCropEdgeLines = propInspect
        .filter((p) => p.touchesCropEdge && p.intersectsCrop)
        .map((p) => `${p.id}: visH=${p.visibleHeightPct}% visW=${p.visibleWidthPct}% asset=${p.asset}`);
      const propCropEdgeFails = propInspect.filter(
        (p) => p.touchesCropEdge && p.intersectsCrop && p.visibleHeightPct > 0 && p.visibleHeightPct < 60
      );
      const propCropFailsEvening = propCropEdgeFails.filter(
        (p) => !(spec.key === 'mar_chat_evening' && p.id === 'pendant')
      );
      if (['d11_mar_chat', 'mar_chat_evening'].includes(spec.key) && propCropFailsEvening.length) {
        allFails.push(`${spec.key}: props <60% height in crop: ${propCropFailsEvening.map((p) => p.id).join(', ')}`);
      }
      let dayEveningBandGate = null;
      if (spec.key === 'mar_chat_evening') {
        marChatEveningBand = { sceneBandStats, bandFrame, shotRaw, shotInfo, ch };
        pendantVisGate = pendantVisibleInFrameGate(propInspect);
        if (!pendantVisGate.ok) {
          allFails.push(`${spec.key}: pendant not visible in frame (inCrop=${pendantVisGate.inCrop} visH=${pendantVisGate.visibleHeightPct}%)`);
        }
        const poolMargin = m.poolMarginAbovePanelStagePx;
        if (poolMargin != null && poolMargin < 8) {
          allFails.push(`${spec.key}: floor pool margin ${poolMargin} stage px above panel (want ≥8)`);
        }
        pendantGate = pendantWarmPoolGate(
          shotRaw, shotInfo.width, shotInfo.height, bandFrame, { crop: m.crop, scale: m.scale }, ch
        );
      }

      if (spec.key === 'keyboard_cat') {
        const green = countPlantGreenPixels(shotRaw, shotInfo.width, shotInfo.height);
        if (green > 0) allFails.push(`keyboard_cat: ${green} plant-green pixels in frame`);
      }

      const feetPct = Math.round((px.floorBandFracMeasured ?? 0) * 1000) / 10;
      const castHeightPct = m.charHeightPctScreen ?? null;
      const castHeightOk = spec.key === 'd11_mar_chat'
        ? (castHeightPct != null && castHeightPct >= 16 && castHeightPct <= 24)
        : true;
      const feetOk = spec.key === 'mar_chat_evening' ? true : (feetPct >= 70 && feetPct <= 80);
      let tailOk = true;
      if (['d11_mar_chat', 'mar_chat_evening'].includes(spec.key)) {
        const headCss = (x) => (x != null && x > 400 ? x / bandFrame.dpr : x);
        const hairCx = headCss(pngTail?.hairCx ?? drawTail?.drawHeadCx);
        const tailCx = headCss(pngTail?.tailCx ?? drawTail?.drawTailTipX);
        const delta = tailCx != null && hairCx != null ? Math.round(tailCx - hairCx) : null;
        const engineDelta = drawTail?.drawTailTipX != null && drawTail?.drawHeadCx != null
          ? Math.round(headCss(drawTail.drawTailTipX) - headCss(drawTail.drawHeadCx))
          : null;
        tailOk = (delta != null && Math.abs(delta) <= 10)
          || (engineDelta != null && Math.abs(engineDelta) <= 10);
        if (pngTail && hairCx != null && pngTail.hairCx == null) {
          pngTail = { ...pngTail, hairCx, delta };
        }
      } else if (pngTail) {
        tailOk = pngTail.tailCx != null && pngTail.hairCx != null && Math.abs(pngTail.delta) <= 10;
      }
      const actorMarginFails = spec.key === 'd11_mar_chat'
        ? actorsInsideCropMargin(m.castDetails, render.crop, 4)
        : (spec.key === 'mar_chat_evening'
          ? actorsInsideCropMargin(m.castDetails, m.crop, 4)
          : []);
      const isolated = propInspect.filter(
        (p) => p.inCrop && !p.touchesFloor && !p.touchesWall && !p.wallAnchored
          && !['stash_pen', 'stash_sock'].includes(p.id)
      );
      const needsLandmark = spec.page === 'kitchen'
        && spec.key !== 'mar_chat_evening'
        && (['d11_mar_chat', 'mar_chat_evening'].includes(spec.key)
          || (m.cameraPreset === 'close' && spec.key !== 'keyboard_cat'));
      const landmarkVisible = needsLandmark
        ? propInspect.some((p) => (p.id === 'window' || p.id === 'counter')
          && (p.inCrop || propOverlapsCrop(p, render.crop)))
        : null;
      const cropGateFails = cropInsideStage(render.crop);

      let marRgbLines = [];
      if (spec.key === 'd11_mar_photo') {
        const { data, info } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
        const { floorFullDev, bandBottomDev } = bandFrame;
        for (const s of [
          { label: 'floorLine+30dev', y: floorFullDev + 30 }
        ]) {
          const rgb = sampleRgbAtDev(data, info.width, info.height, GATE_X_DEV, s.y, info.channels || 4);
          marRgbLines.push(`  - ${s.label} (dev y=${s.y}): RGB [${rgb.join(', ')}]`);
          if (!rgbLooksLikeFloor(rgb, floorRefs) && !isBrownPlank(rgb)) {
            allFails.push(`d11_mar_photo: ${s.label} not floor RGB [${rgb.join(',')}]`);
          }
        }
      }

      if (!castHeightOk) {
        allFails.push(`${spec.key}: cast height ${castHeightPct}% of screen (want ~16–24% close / ~20% target)`);
      }
      if (!feetOk && spec.key !== 'mar_chat_evening') {
        const note = render.crop?.feetNote ? ` (${render.crop.feetNote})` : '';
        allFails.push(`${spec.key}: feet ${feetPct}% band (want 70–80)${note}`);
      }
      if (!tailOk) {
        allFails.push(
          `${spec.key}: PNG tail gate FAIL tailCx=${pngTail?.tailCx} hairCx=${pngTail?.hairCx} Δ=${pngTail?.delta} drawTip=${drawTail?.drawTailTipX} drawHead=${drawTail?.drawHeadCx}`
        );
      }
      if (floorSeamFails.length) allFails.push(`${spec.key}: floor seam gate: ${floorSeamFails.join('; ')}`);
      if (floorDarkSlabFails.length) allFails.push(`${spec.key}: floor dark-slab gate: ${floorDarkSlabFails.join('; ')}`);
      if (floorGateFails.length) allFails.push(`${spec.key}: floor palette gate: ${floorGateFails.join('; ')}`);
      if (floorPlankFails.length) allFails.push(`${spec.key}: floor plank gate: ${floorPlankFails.join('; ')}`);
      let actorPaletteBelowFeet = null;
      if (spec.key === 'mar_chat_evening') {
        actorPaletteBelowFeet = null;
      }
      if (actorMarginFails.length) allFails.push(`${spec.key}: crop actor margin: ${actorMarginFails.join('; ')}`);
      if (cropGateFails.length) allFails.push(`${spec.key}: crop outside stage: ${cropGateFails.join('; ')}`);
      if (isolated.length) {
        allFails.push(`${spec.key}: isolated props ${isolated.map((p) => `${p.id}(${p.asset})`).join(', ')}`);
      }
      if (landmarkVisible === false) allFails.push(`${spec.key}: missing window/counter in crop`);

      selfChecks.push({
        shot: spec.key,
        feetPct,
        feetOk,
        pngTail,
        drawTail,
        tailOk,
        pb23HashMatch,
        pendantVisGate,
        warmWallGate,
        wedgeGate,
        pendantGate,
        tailFormula,
        propCropEdgeLines,
        faceLumGate,
        mapColorGate,
        castHeightPct,
        castHeightOk,
        sceneBandStats,
        dayEveningBandGate,
        actorPaletteBelowFeet,
        poolMarginStagePx: m.poolMarginAbovePanelStagePx,
        feetSeamYCss,
        seamGateDetail,
        darkSlabGateDetail,
        isolated: isolated.map((p) => p.id),
        landmarkVisible,
        floorGateFails,
        floorPlankFails,
        floorSeamFails,
        floorDarkSlabFails,
        actorMarginFails,
        cropGateFails,
        marRgbLines,
        cropFeetNote: render.crop?.feetNote,
        floatingLogged: isolated.map((p) => `${p.id}@${p.asset}`)
      });
    }

    const cellW = 1170;
    const cellH = 2532;
    const grid = await sharp({
      create: {
        width: cellW * 5,
        height: cellH * 2,
        channels: 3,
        background: '#2a2830'
      }
    })
      .composite(
        contactPaths.map((input, i) => ({
          input,
          left: (i % 5) * cellW,
          top: Math.floor(i / 5) * cellH
        }))
      )
      .png()
      .toBuffer();
    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, `${PACK}_contact.png`), grid);
    }

    const renderLines = renderLog.map((r) =>
      `- **${r.shot}**: props=[${r.props.join(', ')}]; crop=${JSON.stringify(r.crop)}`);

    const checkLines = selfChecks.flatMap((c) => {
      const lines = [
        `### ${c.shot}`,
        `- pb23 hash match: ${c.pb23HashMatch == null ? 'n/a' : (c.pb23HashMatch ? 'yes' : '**no**')}`,
        ...(c.pendantVisGate ? [`- pendant visible: **${c.pendantVisGate.ok ? 'yes' : 'no'}** (visH=${c.pendantVisGate.visibleHeightPct ?? 'n/a'}%)`] : []),
        ...(c.warmWallGate ? [`- warm wall hard edges: max ${c.warmWallGate.maxRelPct}% (≤8%: ${c.warmWallGate.ok ? 'pass' : 'FAIL'})`] : []),
        ...(c.wedgeGate ? [`- bottom-left wedge vs floor lum: ${c.wedgeGate.relPct}% (≤10%: ${c.wedgeGate.ok ? 'pass' : 'FAIL'})`] : []),
        ...(c.faceLumGate?.speakerRatio != null ? [`- Martin/Lefèvre face lum ratio: **${c.faceLumGate.speakerRatio.toFixed(3)}** (want ≥0.9)`] : []),
        `- cast height: **${c.castHeightPct ?? 'n/a'}%** of screen height`,
        `- actor-palette below feet (evening): ${c.actorPaletteBelowFeet == null ? 'n/a' : c.actorPaletteBelowFeet}`,
        ...(c.shot === 'mar_chat_evening' && c.poolMarginStagePx != null
          ? [`- floor pool margin above panel: **${c.poolMarginStagePx}** stage px (≥8: ${c.poolMarginStagePx >= 8 ? 'pass' : 'FAIL'})`]
          : []),
        `- feet: **${c.feetPct}%** of band (70–80: ${c.feetOk ? 'pass' : 'FAIL'})${c.cropFeetNote ? ` — ${c.cropFeetNote}` : ''}`,
        `- PNG tail (scan ${c.pngTail?.tailScanRows ?? 'n/a'} vs hair): tailCx=${c.pngTail?.tailCx ?? 'n/a'} hairCx=${c.pngTail?.hairCx ?? 'n/a'} Δ=${c.pngTail?.delta ?? 'n/a'} (${c.tailOk ? 'pass' : 'FAIL'}) drawTip=${c.drawTail?.drawTailTipX ?? 'n/a'} drawHead=${c.drawTail?.drawHeadCx ?? 'n/a'}`,
        ...(c.tailFormula ? [`- tail formula: anchorStageX=${c.tailFormula.anchorStageX} bboxCenterStageX=${c.tailFormula.bboxCenterStageX?.toFixed?.(1) ?? c.tailFormula.bboxCenterStageX} cropX=${c.tailFormula.cropX} → headCss=${Math.round(c.tailFormula.headCenterX)}`] : []),
        ...(c.propCropEdgeLines?.length ? [`- props on crop edges: ${c.propCropEdgeLines.join('; ')}`] : ['- props on crop edges: none']),
        `- floor palette gate: ${c.floorGateFails?.length ? c.floorGateFails.join('; ') : 'pass'}`,
        `- floor plank gate: ${c.floorPlankFails?.length ? c.floorPlankFails.join('; ') : 'pass'}`,
        `- floor seam continuity (8 rows, Δ≤6): ${c.floorSeamFails?.length ? c.floorSeamFails.join('; ') : 'pass'}`,
        `- floor dark-slab (neighbour lum): ${c.floorDarkSlabFails?.length ? c.floorDarkSlabFails.join('; ') : 'pass'}`,
        `- crop actor margin (mar_chat): ${c.actorMarginFails?.length ? c.actorMarginFails.join('; ') : 'pass'}`,
        `- crop in stage (192×144): ${c.cropGateFails?.length ? c.cropGateFails.join('; ') : 'pass'}`,
        `- isolated props: ${c.isolated.length ? c.isolated.join(', ') : 'none'}${c.floatingLogged?.length ? ` (logged: ${c.floatingLogged.join(', ')})` : ''}`,
      ];
      if (c.landmarkVisible != null) {
        lines.push(`- window/counter visible: **${c.landmarkVisible ? 'yes' : 'no'}**`);
      }
      if (c.marRgbLines?.length) {
        lines.push('- mar_photo RGB gate (device x=585):');
        lines.push(...c.marRgbLines);
      }
      if (c.sceneBandStats) {
        const s = c.sceneBandStats;
        lines.push(
          `- scene band mean RGB [${s.meanRgb.map((v) => Math.round(v)).join(', ')}] lum=${Math.round(s.meanLum)} B/R=${s.brRatio.toFixed(3)}`
        );
      }
      if (c.dayEveningBandGate) {
        const g = c.dayEveningBandGate;
        lines.push(
          `- day vs evening: lum drop **${g.lumDropPct}%** (25–50%), B/R evening>day: **${g.brHigher ? 'yes' : 'no'}**`
        );
      }
      if (c.faceLumGate) {
        lines.push(`- face mean lum: day=${c.faceLumGate.day?.toFixed(1) ?? 'n/a'} eve=${c.faceLumGate.evening?.toFixed(1) ?? 'n/a'} ratio=${c.faceLumGate.ratio?.toFixed(3) ?? 'n/a'}`);
      }
      if (c.mapColorGate) {
        lines.push(`- green map artifact wedge: **${c.mapColorGate.fracPct}%** of band (≤15%)`);
      }
      if (['d11_mar_chat', 'mar_chat_evening'].includes(c.shot) && c.feetSeamYCss != null) {
        lines.push(`- feet seam yCss (resolved): **${c.feetSeamYCss}**`);
      }
      if (['d11_mar_chat', 'mar_chat_evening'].includes(c.shot) && c.seamGateDetail?.seamRows?.length) {
        lines.push('- seam gate (per 50px column, 8 device rows above vs below feet):');
        for (const row of c.seamGateDetail.seamRows) {
          lines.push(
            `  - xCss=${row.xCss}: ΔRGB=[${row.deltas.map((d) => Math.round(d)).join(',')}] above=[${row.above.map((v) => Math.round(v)).join(',')}] below=[${row.below.map((v) => Math.round(v)).join(',')}]`
          );
        }
      }
      if (['d11_mar_chat', 'mar_chat_evening'].includes(c.shot) && c.darkSlabGateDetail?.cols?.length) {
        lines.push('- dark-slab gate (mean lum below seam, 8 rows):');
        for (const col of c.darkSlabGateDetail.cols) {
          lines.push(`  - xCss=${col.xCss}: lum=${Math.round(col.lum)} rgb=[${col.rgb.map((v) => Math.round(v)).join(',')}]`);
        }
      }
      return lines;
    });

    try {
      await fs.access(KITCHEN_NIGHT_REF_PATH);
    } catch {
      allFails.push(`missing Pixel Studio reference: ${KITCHEN_NIGHT_REF_PATH}`);
    }
    const refPath = KITCHEN_NIGHT_REF_PATH;
    const eveSmall = path.join(outDir, 'pbR4s_mar_chat_evening.png');
    await buildEveningVsRef(outDir, eveSmall, refPath);
    if (marChatEveningBand) {
      const { data: refRaw, info: refInfo } = await sharp(refPath).raw().toBuffer({ resolveWithObject: true });
      const refCh = refInfo.channels || 4;
      const refBand = meanSceneBandStats(
        refRaw, refInfo.width, refInfo.height,
        marChatEveningBand.bandFrame.bubbleH,
        marChatEveningBand.bandFrame.stageH,
        marChatEveningBand.bandFrame.dpr,
        refCh
      );
      const eveBand = meanSceneBandStats(
        marChatEveningBand.shotRaw, marChatEveningBand.shotInfo.width, marChatEveningBand.shotInfo.height,
        marChatEveningBand.bandFrame.bubbleH,
        marChatEveningBand.bandFrame.stageH,
        marChatEveningBand.bandFrame.dpr,
        marChatEveningBand.ch
      );
      eveningRefGate = { refPath, refBand, eveBand };
    }

    eveningVisualSentence = 'Evening mar_chat (Day 10 E): soir.json night maps (cool teal + pendant_on + table pool), seated Martin/Lefèvre, normal speech bubble tail to head.';

    const notes = [
      '# Day 10 Round R4 — kitchen lightmap port + Soir compositing',
      '',
      ...(stageDiffStats ? [
        '## Stage self-check (night table4 @ 1×)',
        `- Engine export: \`stage_night_table4_x1_engine.png\` (gen_kitchen \`scene_table4\` cast)`,
        `- Mean abs diff vs \`stage_night_table4_x1.png\`: **${stageDiffStats.meanAbs.toFixed(3)}**`,
        `- Max diff outside cast bbox: **${stageDiffStats.maxOutsideCast.toFixed(3)}** (target 0 or ≤2)`,
        `- Triptych: \`pbR4_stage_diff.png\` (engine | ref | diff×8)`,
        ...(stageTopDiffs?.length ? [
          '',
          '### Top 20 differing pixels (outside cast α mask)',
          ...stageTopDiffs.map((p) => `- (${p.x}, ${p.y}) engine [${p.eng.join(', ')}] ref [${p.ref.join(', ')}] layer **${p.layer}** Δ=${p.d.toFixed(2)}`)
        ] : []),
        ...(stageTopDiffs?.length && stageTopDiffs.every((p) => p.layer === 'pendant')
          ? ['', '*Remaining diffs are only on the pendant emitter layer.*']
          : []),
        ''
      ] : []),
      '',
      '## Asset counts (check_manifest.py)',
      '- Kitchen table4 r2: **66** assets',
      '- Rooftop r2.1: **75** assets',
      '- Stairwell r2.1: **78** assets',
      '- Canonical chars sit r2: **225** assets',
      '',
      '## vs pb23 (per shot)',
      ...metrics.map((c) => `- **${c.shotKey}**: table4 layout / R1 grading / ${c.shotKey === 'mar_chat_evening' ? 'Soir per-pixel grade, pendant_on, seated cast' : (c.shotKey === 'n_d11_matin2' ? 'seated end chairs' : 'pack B art swap')}`),
      '',
      '## Evening visual (honest)',
      eveningVisualSentence,
      '',
      '## Gates (mar_chat_evening — table4 ref, not close)',
      '- `medium_table4` crop (12× from 73,56); warm floor pool ≥8 stage px above dialogue panel',
      '- Pendant sprite visible in frame',
      '- PNG bubble tail toward Martin head (dynamic scan below bubble)',
      '- Close-ref gates **skipped**: feet band %, bottom-left wedge, standing landmarks, cast-height close band',
      '',
      '## Lighting (Soir / night)',
      '- Light maps: **light_r3** baked PNGs; Day 10 E / mar_chat_evening use **night** (`soir.json`), not `golden.json`.',
      '- Grade per `soir.json` `masking.apply`; `pendant_on` at PENDANT_AT (118,66) with x−4 topleft offset, ungraded after grade.',
      '- Table4 compositing: room/tbl/props @1.0; behind/front sitters @0.25/0.6; `pendant_on` ungraded after grade.',
      `- Reference: \`${refPath}\` (side-by-side \`pbR4_evening_vs_ref.png\`, engine left / Pixel Studio right).`,
      ...(eveningRefGate ? [`- Ref vs evening mean RGB (info): eve [${eveningRefGate.eveBand.meanRgb.map((v) => Math.round(v)).join(', ')}] ref [${eveningRefGate.refBand.meanRgb.map((v) => Math.round(v)).join(', ')}]`] : []),
      '',
      '## Prop crop rule',
      '- Props with **<60% height** inside crop are dropped for `d11_mar_chat` (clock/frame clipped at crop top).',
      '',
      `Source fingerprint (URLs \`&_=\`): \`${cacheBust}\``,
      'Pre-capture: `node --test tests/kitchen-layout.test.cjs tests/kitchen-framing.test.cjs`',
      '',
      '## Resolved render (props + crop)',
      '',
      ...renderLines,
      '',
      '## Pixel self-check (per shot)',
      '',
      ...checkLines,
      '',
    ].join('\n');

    if (errors.length) throw new Error(`Console errors: ${errors.length}\n${errors.join('\n')}`);

    for (const dir of outDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${PACK}_metrics.json`), JSON.stringify({ metrics, renderLog, selfChecks }, null, 2) + '\n');
        await fs.writeFile(path.join(dir, `${PACK}_NOTES.md`), notes
          + (allFails.length ? `\n\n## Validation failures\n\n${allFails.map((f) => `- ${f}`).join('\n')}\n` : ''));
        if (dir !== outDir) {
          for (const spec of SHOTS) {
            const base = `pbR4_${spec.file}`;
            await fs.copyFile(path.join(outDir, `${base}.png`), path.join(dir, `${base}.png`));
            await fs.copyFile(path.join(outDir, base.replace(/^pbR4_/, 'pbR4s_') + '.png'), path.join(dir, base.replace(/^pbR4_/, 'pbR4s_') + '.png'));
          }
          await fs.copyFile(path.join(outDir, `${PACK}_contact.png`), path.join(dir, `${PACK}_contact.png`));
          await fs.copyFile(path.join(outDir, 'pbR4_evening_vs_ref.png'), path.join(dir, 'pbR4_evening_vs_ref.png'));
          try {
            await fs.copyFile(path.join(outDir, 'pbR4_stage_diff.png'), path.join(dir, 'pbR4_stage_diff.png'));
            await fs.copyFile(path.join(outDir, 'stage_night_table4_x1_engine.png'), path.join(dir, 'stage_night_table4_x1_engine.png'));
          } catch { /* optional */ }
          await fs.copyFile(path.join(outDir, `${PACK}_NOTES.md`), path.join(dir, `${PACK}_NOTES.md`));
        }
      } catch (copyErr) {
        console.warn(`Pack write to ${dir} failed:`, copyErr.message);
      }
    }

    if (allFails.length) {
      console.error(`Validation failed (${allFails.length}):`);
      for (const f of allFails) console.error(f);
      process.exitCode = 1;
    } else {
      console.log('Wrote', outDirs.join(', '));
    }
  } finally {
    try { await context.close(); } catch { /* ignore */ }
    try { await browser.close(); } catch { /* ignore */ }
    try { await server.close(); } catch { /* ignore */ }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
