#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const KITCHEN_PACK = path.join(appRoot, 'scenes/packs/b/kitchen');
const scenePath = path.join(appRoot, 'scenes/day10-kitchen/scene.json');
const REF_TABLE4 = path.join(KITCHEN_PACK, 'composite_medium_game_day_table4_1080x1920.png');
const REF_MEDIUM = path.join(KITCHEN_PACK, 'composite_medium_game_day_1080x1920.png');

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
  process.argv[2] || '/opt/cursor/artifacts/day10_P1R',
  '/cursor/stores/self/day10_P1R'
];
const view = { width: 390, height: 844 };
const dpr = 3;

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
  return r < 90 && g < 90 && b < 110 && r + g + b < 200;
}

function isBrownPlank(rgb) {
  const [r, g, b] = rgb;
  if (r > 200 && g > 180) return false;
  if (r > 85 && g > 48 && b > 32 && r >= g - 8 && g >= b - 12) return true;
  if (r >= 28 && r <= 55 && g >= 40 && g <= 62 && b >= 48 && b <= 72) return true;
  return false;
}

function isCreamWall(rgb) {
  const [r, g, b] = rgb;
  return r > 210 && g > 195 && b > 160 && r >= g - 15;
}

function isHairPixel(rgb) {
  const [r, g, b] = rgb;
  if (r < 75 && g < 100 && b < 100 && g >= r - 20 && r + g + b < 200) return true;
  if (r < 62 && g < 58 && b < 75 && r + g + b < 165) return true;
  if (r > 55 && r < 120 && g > 40 && g < 95 && b < 70) return true;
  return false;
}

function isSkinPixel(rgb) {
  const [r, g, b] = rgb;
  return r > 140 && g > 100 && b > 80 && r > g && g > b - 10;
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

function canonicalRefForShot(shot) {
  const crop = shot?.crop;
  const key = typeof crop === 'string' ? crop : crop?.cameraPreset;
  if (key === 'medium_table4') return REF_TABLE4;
  if (shot?.id === 'n_d11_matin2' || shot?.id === 'd11_mar_chat') return REF_TABLE4;
  return REF_MEDIUM;
}

function findBubbleBbox(data, w, ch, bubbleBandH) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let hits = 0;
  const yMax = Math.min(view.height * 0.55, bubbleBandH + 420);
  for (let yCss = 4; yCss < yMax; yCss++) {
    for (let xCss = 8; xCss < view.width - 8; xCss++) {
      const rgb = sampleRgb(data, w, ch, xCss, yCss);
      if (!isBubbleFill(rgb)) continue;
      hits++;
      x0 = Math.min(x0, xCss);
      y0 = Math.min(y0, yCss);
      x1 = Math.max(x1, xCss);
      y1 = Math.max(y1, yCss);
    }
  }
  if (hits < 80) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function findTailTip(data, w, ch, bubbleBottomCss, headBbox) {
  const yMin = bubbleBottomCss + 1;
  const yMax = headBbox
    ? Math.min(headBbox.y + headBbox.h + 4, bubbleBottomCss + 28)
    : Math.min(view.height - 1, bubbleBottomCss + 24);
  let tip = null;
  for (let yCss = yMin; yCss <= yMax; yCss++) {
    for (let xCss = 0; xCss < view.width; xCss++) {
      if (!isTailStroke(sampleRgb(data, w, ch, xCss, yCss))) continue;
      if (!tip || yCss > tip.y || (yCss === tip.y && Math.abs(xCss - view.width / 2) < Math.abs(tip.x - view.width / 2))) {
        tip = { x: xCss, y: yCss };
      }
    }
  }
  return tip;
}

function tailLengthPx(data, w, ch, bb, tip) {
  if (!bb || !tip) return null;
  const bubbleBottom = bb.y + bb.h;
  return tip.y - bubbleBottom;
}

function headBboxFromHint(hint) {
  if (hint?.bboxCss) {
    const b = hint.bboxCss;
    const yOff = hint.speakerTopBand != null && hint.speakerTop != null
      ? hint.speakerTopBand - hint.speakerTop
      : 0;
    return {
      x: b.x - 4,
      y: b.y + yOff - 4,
      w: b.w + 8,
      h: b.h + 8
    };
  }
  if (hint?.headCenterX != null && hint?.speakerTopBand != null) {
    const cx = hint.headCenterX;
    const ty = hint.speakerTopBand;
    return { x: cx - 20, y: ty - 8, w: 40, h: 36 };
  }
  return null;
}

function findHeadBboxPng(data, w, ch, bubbleBottomCss, hint) {
  const fromHint = headBboxFromHint(hint);
  if (fromHint) return fromHint;
  const cx = hint?.headCenterX ?? view.width / 2;
  const y0 = Math.max(bubbleBottomCss + 20, (hint?.speakerTopBand ?? bubbleBottomCss + 80) - 8);
  const y1 = Math.min(view.height - 30, y0 + 48);
  const x0 = Math.max(0, cx - 28);
  const x1 = Math.min(view.width - 1, cx + 28);
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
  if (n < 12) return null;
  return {
    x: minX - 4,
    y: minY - 4,
    w: maxX - minX + 9,
    h: maxY - minY + 9
  };
}

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function torsoVisibleGate(data, w, ch, headBbox, bubbleBottomCss) {
  if (!headBbox) return { pass: false, note: 'no head bbox' };
  const x = headBbox.x + headBbox.w / 2;
  const y = Math.min(view.height - 40, headBbox.y + headBbox.h + 18);
  const rgb = sampleRgb(data, w, ch, x, y);
  const pass = !isBrownPlank(rgb);
  return { pass, note: `torso @(${Math.round(x)},${Math.round(y)}) rgb ${rgb.join(',')}` };
}

function countFloorBands(data, w, ch, stageTopCss) {
  const y0 = Math.round(stageTopCss + 40);
  const y1 = view.height - 8;
  const bands = [];
  let inBand = false;
  let bandStart = 0;
  for (let yCss = y0; yCss <= y1; yCss++) {
    let plank = 0;
    let samples = 0;
    for (let xCss = 16; xCss < view.width - 16; xCss += 3) {
      samples++;
      if (isBrownPlank(sampleRgb(data, w, ch, xCss, yCss))) plank++;
    }
    const ratio = plank / samples;
    const isPlankRow = ratio > 0.35;
    if (isPlankRow && !inBand) {
      inBand = true;
      bandStart = yCss;
    } else if (!isPlankRow && inBand) {
      if (yCss - bandStart >= 6) bands.push({ y0: bandStart, y1: yCss - 1 });
      inBand = false;
    }
  }
  if (inBand && y1 - bandStart >= 6) bands.push({ y0: bandStart, y1: y1 });
  return bands;
}

function analyzePng(pngPath, bandFrame, headHint, needsBubble) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const w = info.width;
    const ch = info.channels;
    const stageTop = bandFrame.bubbleH;
    const bb = needsBubble ? findBubbleBbox(data, w, ch, bandFrame.bubbleH) : null;
    const marginOk = !bb || (bb.x >= 16 && bb.x + bb.w <= view.width - 16 && bb.y >= 4);
    const bubbleBottom = bb ? bb.y + bb.h : bandFrame.bubbleH;
    const head = needsBubble ? findHeadBboxPng(data, w, ch, bubbleBottom, headHint) : null;
    const tip = needsBubble ? findTailTip(data, w, ch, bubbleBottom, head) : null;
    const tailLen = needsBubble ? tailLengthPx(data, w, ch, bb, tip) : null;
    const tailLenOk = !needsBubble || (tailLen != null && tailLen >= 1 && tailLen <= 16);
    const tipInHead = !needsBubble || (tip && head && pointInRect(tip, head));
    const torso = needsBubble ? torsoVisibleGate(data, w, ch, head, bubbleBottom) : { pass: true, note: 'n/a' };
    const floorBands = countFloorBands(data, w, ch, stageTop);
    const floorOk = floorBands.length === 1;
    return {
      bb,
      marginOk,
      tip,
      tailLen,
      tailLenOk,
      head,
      tipInHead,
      torso,
      floorBands,
      floorOk
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

async function sideBySide(outPath, leftPng, rightPng) {
  const left = await sharp(leftPng).resize(view.width, view.height).png().toBuffer();
  const right = await sharp(rightPng).resize(view.width, view.height).png().toBuffer();
  await sharp({
    create: { width: view.width * 2, height: view.height, channels: 3, background: '#1a1a22' }
  }).composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: view.width, top: 0 }
  ]).png().toFile(outPath);
}

function gateRow(id, beat, b, png) {
  const needs = needsSpeechBubbleGate(b);
  const failures = [];
  if (needs) {
    if (!png.bb) failures.push('bubble not found');
    if (!png.marginOk) failures.push('bubble margin <16px');
    if (!png.tailLenOk) failures.push(`tail length ${png.tailLen}px`);
    if (!png.tipInHead) failures.push('tail tip outside head bbox');
    if (!png.torso.pass) failures.push(`torso buried (${png.torso.note})`);
  }
  if (!png.floorOk) failures.push(`floor bands ${png.floorBands.length} (want 1)`);
  const pass = failures.length === 0;
  const tailStr = needs && png.tip
    ? `len=${png.tailLen}px tip (${png.tip.x},${png.tip.y})`
    : needs ? 'no tail' : 'n/a';
  const headStr = needs && png.head
    ? `head (${png.head.x},${png.head.y} ${png.head.w}×${png.head.h})`
    : '—';
  return {
    shotId: id,
    beat,
    bubbleMargin: needs ? (png.marginOk ? 'PASS' : 'FAIL') : 'n/a',
    tail: tailStr,
    head: headStr,
    torso: needs ? (png.torso.pass ? 'PASS' : 'FAIL') : 'n/a',
    floorBands: String(png.floorBands.length),
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
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(280);

      const bandFrame = await page.evaluate(() => ({
        bubbleH: document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0,
        stageH: document.querySelector('.scene-player-stage')?.offsetHeight ?? 0
      }));
      const speaker = b?.actor || b?.anchor || '—';
      let headHint = null;
      if (needsSpeechBubbleGate(b) && speaker && speaker !== '—') {
        headHint = await page.evaluate((who) => window.__scenePlayer.speakerHeadCss(who), speaker);
      }

      const file = `p1R3_${id}.png`;
      const out = path.join(outDir, file);
      await page.screenshot({ path: out, scale: 'css' });
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const png = await analyzePng(out, bandFrame, headHint, needsSpeechBubbleGate(b));
      const row = gateRow(id, beat, b, png);
      if (!row.gate.startsWith('PASS')) exitCode = 1;
      tableRows.push(row);

      const ref = canonicalRefForShot(shot);
      const cmpOut = path.join(outDir, `p1R3_vs_canonical_${id}.png`);
      await sideBySide(cmpOut, out, ref);
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(cmpOut, path.join(dir, `p1R3_vs_canonical_${id}.png`));
      }
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

    const md = [
      '# Day 10 P1R3 — canonical pack-b kitchen (PNG gates)',
      '',
      'Branch `astra/day10-scenes`. All day kitchen beats A1–A13 + B1–B6 via canonical stage compositor.',
      'Gates are **PNG pixel scans only** (no engine inspectP1RShotGates).',
      '',
      '| shotId | beat | bubble ≥16px margin | tail ≤16px + tip in head | torso visible | floor bands (=1) | gate |',
      '|---|---|---|---|---|---|---|',
      ...tableRows.map((r) => `| \`${r.shotId}\` | ${r.beat} | ${r.bubbleMargin} | ${r.tail} · ${r.head} | ${r.torso} | ${r.floorBands} | **${r.gate}** |`),
      '',
      'Captures: `p1R3_<id>.png`, compare `p1R3_vs_canonical_<id>.png` (left capture, right pack composite). Contact: `p1R3_contact.png`.',
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1R3_contact.png'), contact);
      await fs.writeFile(path.join(dir, 'p1R3_NOTES.md'), md);
    }
    console.log('P1R3 exit', exitCode, 'wrote', outDir);
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
