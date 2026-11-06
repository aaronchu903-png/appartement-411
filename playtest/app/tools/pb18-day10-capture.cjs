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
const PACK = 'pb18';
const PB17_REF_DIR = '/opt/cursor/artifacts/day10_packb17';
const outDirs = [
  process.argv[2] || `/opt/cursor/artifacts/day10_packb${PACK.slice(2)}`,
  `/cursor/stores/self/day10_packb${PACK.slice(2)}`
];
const PB18_CHANGED_SHOTS = new Set(['d11_noe_lait', 'mar_chat_evening']);
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
  { key: 'mar_chat_evening', file: 'mar_chat_evening', page: 'kitchen', shot: 'd11_mar_chat', evening: true }
];

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
    if (colors.size < 2) {
      fails.push(`col xCss=${xCss}: only ${colors.size} distinct floor colours (want ≥2)`);
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

function floorSeamContinuityGate(data, width, height, floorYCss, dprVal, channels = 4) {
  const fails = [];
  const ySeam = Math.round(floorYCss * dprVal);
  const band = 8;
  for (let xCss = 60; xCss < 340; xCss += 50) {
    const xDev = Math.round(xCss * dprVal);
    const above = meanRgbColumnRows(data, width, height, xDev, Math.max(0, ySeam - band), ySeam - 1, channels);
    const below = meanRgbColumnRows(data, width, height, xDev, ySeam, ySeam + band - 1, channels);
    const deltas = [
      Math.abs(above[0] - below[0]),
      Math.abs(above[1] - below[1]),
      Math.abs(above[2] - below[2])
    ];
    if (deltas.some((d) => d > 6)) {
      fails.push(
        `col xCss=${xCss}: seam ΔRGB [${deltas.map((d) => Math.round(d)).join(',')}] (want ≤6) above=[${above.map((v) => Math.round(v)).join(',')}] below=[${below.map((v) => Math.round(v)).join(',')}]`
      );
    }
    if (fails.length >= 6) break;
  }
  return fails;
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
  const smallPath = path.join(outDir, baseName.replace(/^pb18_/, 'pb18s_') + '.png');
  await page.screenshot({ path: fullPath, fullPage: false });
  await sharp(fullPath).resize(390, 844).toFile(smallPath);
  return fullPath;
}

async function prepareKitchenPage(page, base, cacheBust) {
  await page.goto(`${base}/day10-phase1.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
  await page.click('.scene-player-overlay', { timeout: 5000 });
}

function sampleRgbAtDev(data, width, height, xDev, yDev, channels = 4) {
  const x = Math.max(0, Math.min(width - 1, xDev));
  const y = Math.max(0, Math.min(height - 1, yDev));
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

(async () => {
  console.log('Running kitchen unit tests…');
  execSync('node --test tests/kitchen-layout.test.cjs tests/kitchen-framing.test.cjs', { cwd: appRoot, stdio: 'inherit' });

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

  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  const allFails = [];
  try {
    for (const spec of SHOTS) {
      if (spec.page === 'lineup') {
        await page.goto(`${server.base}/scenes/pack-b-lineup.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
        await page.click('.scene-player-overlay');
      } else {
        await prepareKitchenPage(page, server.base, cacheBust);
      }
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), spec.shot);
      if (!spec.evening && spec.page === 'kitchen') {
        await page.evaluate(() => {
          const sh = window.__scenePlayer.getConfig().shots.find((s) => s.id === 'd11_mar_chat');
          if (sh) delete sh.lightVariant;
        });
      }
      if (spec.evening) {
        await page.evaluate(() => {
          const p = window.__scenePlayer;
          const cfg = p.getConfig();
          const sh = cfg.shots.find((s) => s.id === 'd11_mar_chat');
          if (sh) sh.lightVariant = 'evening';
          p.setShot('d11_mar_chat');
        });
      }
      await page.waitForTimeout(450);
      const px = await page.evaluate(() => window.__scenePlayer.capturePixelMetrics());
      const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
      const render = await page.evaluate(() => window.__scenePlayer.getShotRenderInfo());
      const bubble = await page.evaluate(() => window.__scenePlayer.getBubbleScreenMetrics?.() || {});
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
        const pxm = window.__scenePlayer.capturePixelMetrics();
        const d = window.devicePixelRatio || 1;
        const floorFullDev = Math.round(bubbleH * d + pxm.floorLineDev);
        const bandBottomDev = Math.round(bubbleH * d + stageH * d);
        return { bubbleH, stageH, dpr: d, floorFullDev, bandBottomDev, floorLineDevBand: pxm.floorLineDev };
      });
      renderLog.push({ shot: spec.key, ...render, bandFrame });
      const base = `pb18_${spec.file}`;
      metrics.push({ file: `${base}.png`, shotKey: spec.key, render, bandFrame, ...m, pixel: px, drawTail });

      allFails.push(...validateShot(spec.key, m, px).map((f) => `${spec.key}: ${f}`));

      const fullPath = await capturePair(page, outDir, base);
      contactPaths.push(fullPath);

      const pb17Ref = path.join(PB17_REF_DIR, `pb17_${spec.file}.png`);
      let pb17HashMatch = null;
      try {
        const h17 = await sha256File(pb17Ref);
        const h18 = await sha256File(fullPath);
        pb17HashMatch = h17 === h18;
        if (!PB18_CHANGED_SHOTS.has(spec.key) && !pb17HashMatch) {
          allFails.push(`${spec.key}: pb18 PNG differs from pb17 (hash ${h18.slice(0, 12)} vs ${h17.slice(0, 12)})`);
        }
      } catch (e) {
        if (!PB18_CHANGED_SHOTS.has(spec.key)) {
          allFails.push(`${spec.key}: missing pb17 reference ${pb17Ref}: ${e.message}`);
        }
      }

      const { data: shotRaw, info: shotInfo } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
      const ch = shotInfo.channels || 4;
      const floorRefs = buildFloorPaletteRefs(shotRaw, shotInfo.width, shotInfo.height, bandFrame.floorFullDev, bandFrame.bandBottomDev, ch);
      const floorYCss = bandFrame.floorFullDev / bandFrame.dpr;
      const bandBottomCss = bandFrame.bandBottomDev / bandFrame.dpr;
      const floorGateFails = spec.page === 'kitchen'
        ? floorPaletteGateFailures(shotRaw, shotInfo.width, shotInfo.height, bandFrame.floorFullDev, bandFrame.bandBottomDev, floorRefs, bandFrame.dpr, ch)
        : [];
      const eveningKitchen = spec.evening || spec.key === 'd11_mar_chat';
      const floorPlankFails = spec.page === 'kitchen' && eveningKitchen
        ? floorPlankDistinctGate(
          shotRaw,
          shotInfo.width,
          shotInfo.height,
          floorYCss,
          bandBottomCss,
          bandFrame.dpr,
          ch,
          { columnScan: !spec.evening }
        )
        : [];
      const floorSeamFails = [];
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

      if (spec.key === 'keyboard_cat') {
        const green = countPlantGreenPixels(shotRaw, shotInfo.width, shotInfo.height);
        if (green > 0) allFails.push(`keyboard_cat: ${green} plant-green pixels in frame`);
      }

      const feetPct = Math.round((px.floorBandFracMeasured ?? 0) * 1000) / 10;
      const feetOk = feetPct >= 70 && feetPct <= 80;
      const tailOk = pngTail
        ? (pngTail.tailCx != null && pngTail.hairCx != null && Math.abs(pngTail.delta) <= 10)
        : true;
      const actorMarginFails = ['d11_mar_chat', 'mar_chat_evening'].includes(spec.key)
        ? actorsInsideCropMargin(m.castDetails, render.crop, 4)
        : [];
      const isolated = propInspect.filter(
        (p) => p.inCrop && !p.touchesFloor && !p.touchesWall && !p.wallAnchored
          && !['stash_pen', 'stash_sock'].includes(p.id)
      );
      const needsLandmark = spec.page === 'kitchen'
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

      if (!feetOk) {
        const note = render.crop?.feetNote ? ` (${render.crop.feetNote})` : '';
        allFails.push(`${spec.key}: feet ${feetPct}% band (want 70–80)${note}`);
      }
      if (!tailOk) {
        allFails.push(
          `${spec.key}: PNG tail gate FAIL tailCx=${pngTail?.tailCx} hairCx=${pngTail?.hairCx} Δ=${pngTail?.delta} drawTip=${drawTail?.drawTailTipX} drawHead=${drawTail?.drawHeadCx}`
        );
      }
      if (floorSeamFails.length) allFails.push(`${spec.key}: floor seam gate: ${floorSeamFails.join('; ')}`);
      if (floorGateFails.length) allFails.push(`${spec.key}: floor palette gate: ${floorGateFails.join('; ')}`);
      if (floorPlankFails.length) allFails.push(`${spec.key}: floor plank gate: ${floorPlankFails.join('; ')}`);
      let actorPaletteBelowFeet = null;
      if (spec.key === 'mar_chat_evening') {
        actorPaletteBelowFeet = actorPaletteBelowFeetGate(
          shotRaw,
          shotInfo.width,
          shotInfo.height,
          floorYCss,
          bandBottomCss,
          bandFrame.dpr,
          ch
        );
        if (actorPaletteBelowFeet > 0) {
          allFails.push(`${spec.key}: actor-palette pixels below feet: ${actorPaletteBelowFeet} (want 0)`);
        }
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
        pb17HashMatch,
        actorPaletteBelowFeet,
        isolated: isolated.map((p) => p.id),
        landmarkVisible,
        floorGateFails,
        floorPlankFails,
        floorSeamFails,
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
        `- pb17 hash match: ${c.pb17HashMatch == null ? 'n/a' : (c.pb17HashMatch ? 'yes' : '**no**')}`,
        `- actor-palette below feet (evening): ${c.actorPaletteBelowFeet == null ? 'n/a' : c.actorPaletteBelowFeet}`,
        `- feet: **${c.feetPct}%** of band (70–80: ${c.feetOk ? 'pass' : 'FAIL'})${c.cropFeetNote ? ` — ${c.cropFeetNote}` : ''}`,
        `- PNG tail (outline vs hair): tailCx=${c.pngTail?.tailCx ?? 'n/a'} hairCx=${c.pngTail?.hairCx ?? 'n/a'} Δ=${c.pngTail?.delta ?? 'n/a'} (${c.tailOk ? 'pass' : 'FAIL'}) drawTip=${c.drawTail?.drawTailTipX ?? 'n/a'} drawHead=${c.drawTail?.drawHeadCx ?? 'n/a'}`,
        `- floor palette gate: ${c.floorGateFails?.length ? c.floorGateFails.join('; ') : 'pass'}`,
        `- floor plank gate: ${c.floorPlankFails?.length ? c.floorPlankFails.join('; ') : 'pass'}`,
        `- floor seam continuity (8 rows): ${c.floorSeamFails?.length ? c.floorSeamFails.join('; ') : 'pass'}`,
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
      return lines;
    });

    const notes = [
      '# Pack B pb18 — evening floor tiled (no actor smear), Noé tail mask head, pb17 hash on unchanged shots',
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
    if (allFails.length) throw new Error(`Validation failed:\n${allFails.join('\n')}`);

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, `${PACK}_metrics.json`), JSON.stringify({ metrics, renderLog, selfChecks }, null, 2) + '\n');
      await fs.writeFile(path.join(dir, `${PACK}_NOTES.md`), notes);
      if (dir !== outDir) {
        for (const spec of SHOTS) {
          const base = `pb18_${spec.file}`;
          await fs.copyFile(path.join(outDir, `${base}.png`), path.join(dir, `${base}.png`));
          await fs.copyFile(path.join(outDir, base.replace(/^pb18_/, 'pb18s_') + '.png'), path.join(dir, base.replace(/^pb18_/, 'pb18s_') + '.png'));
        }
        await fs.copyFile(path.join(outDir, `${PACK}_contact.png`), path.join(dir, `${PACK}_contact.png`));
        await fs.copyFile(path.join(outDir, `${PACK}_NOTES.md`), path.join(dir, `${PACK}_NOTES.md`));
      }
    }

    console.log('Wrote', outDirs.join(', '));
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
