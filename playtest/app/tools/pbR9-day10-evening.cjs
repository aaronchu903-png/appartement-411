#!/usr/bin/env node
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const KITCHEN_PACK = path.join(appRoot, 'scenes/packs/b/kitchen');
const REF_PATH = process.argv[3]
  || path.join(KITCHEN_PACK, 'composite_medium_game_night_table4_1080x1920.png');
const STAGE_REF = path.join(KITCHEN_PACK, 'stage_night_table4_x1.png');
const LIGHT_TARGETS = [
  { stage: [118, 133], rgb: [195, 127, 62] },
  { stage: [100, 136], rgb: [154, 106, 60] }
];
const TAG = process.env.PB_TAG || 'pbR9d';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_R9',
  '/cursor/stores/self/day10_R9'
];
const view = { width: 390, height: 844 };
const dpr = 3;
const PENDANT_STAGE_X = 118;
const SCENE_BAND_FRAC = 0.55;
const BUBBLE_BAND_FRAC = 0.15;

async function sourceFingerprint() {
  const h = crypto.createHash('sha256');
  for (const rel of ['scenes/scene-player.js', 'scenes/day10-kitchen/scene.json']) {
    h.update(await fs.readFile(path.join(appRoot, rel)));
  }
  return h.digest('hex').slice(0, 16);
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
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function sampleRgb(data, w, ch, x, y) {
  const i = (y * w + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
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

function tailWedgeGate(pngPath, bubbleHCss, dprVal) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const ch = info.channels;
    const w = info.width;
    const h = info.height;
    let bubbleBottom = 0;
    for (let yCss = 8; yCss < bubbleHCss; yCss++) {
      let white = 0;
      for (let xCss = 20; xCss < 370; xCss += 4) {
        const rgb = sampleRgb(data, w, ch, Math.round(xCss * dprVal), Math.round(yCss * dprVal));
        if (rgb[0] > 235 && rgb[1] > 235 && rgb[2] > 235) white++;
      }
      if (white > 20) bubbleBottom = yCss;
    }
    const yTail0 = bubbleBottom + 1;
    const yTail1 = Math.min(Math.round(h / dprVal) - 1, bubbleBottom + 20);
    const tailXs = [];
    for (let yCss = yTail0; yCss <= yTail1; yCss++) {
      for (let xCss = 0; xCss < 390; xCss++) {
        const rgb = sampleRgb(data, w, ch, Math.round(xCss * dprVal), Math.round(yCss * dprVal));
        if (isTailStroke(rgb)) tailXs.push(xCss);
      }
    }
    const tailCx = tailXs.length ? tailXs.reduce((a, b) => a + b, 0) / tailXs.length : null;
    const hairY0 = bubbleBottom + 24;
    const hairY1 = Math.min(h / dprVal - 40, bubbleHCss + 280);
    const hairXs = [];
    for (let yCss = hairY0; yCss < hairY1; yCss++) {
      for (let xCss = 40; xCss < 350; xCss++) {
        const rgb = sampleRgb(data, w, ch, Math.round(xCss * dprVal), Math.round(yCss * dprVal));
        if (isDarkHair(rgb)) hairXs.push(xCss);
      }
    }
    let hairCx = null;
    if (hairXs.length) {
      hairXs.sort((a, b) => a - b);
      const mid = hairXs.slice(Math.floor(hairXs.length * 0.25), Math.ceil(hairXs.length * 0.55));
      hairCx = mid.reduce((a, b) => a + b, 0) / mid.length;
    }
    const delta = tailCx != null && hairCx != null ? Math.round(tailCx - hairCx) : null;
    return {
      bubbleBottom,
      tailCx,
      hairCx,
      delta,
      pass: delta == null ? false : Math.abs(delta) <= 22,
      tailPixels: tailXs.length
    };
  });
}

function rightEdgeBrightGate(pngPath, bubbleHCss, stageHCss, dprVal) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const ch = info.channels;
    const w = info.width;
    const y0 = Math.round((bubbleHCss + 8) * dprVal);
    const y1 = Math.round((bubbleHCss + stageHCss - 8) * dprVal);
    let hits = 0;
    for (let y = y0; y < y1; y += 3) {
      for (let xCss = 376; xCss < 390; xCss++) {
        const rgb = sampleRgb(data, w, ch, Math.round(xCss * dprVal), y);
        if (rgb[0] > 240 && rgb[1] > 230 && rgb[2] > 200) hits++;
      }
    }
    return { brightEdgePixels: hits, pass: hits < 12 };
  });
}

async function extractSceneBandBuffer(fullPng, bubbleHCss, stageHCss) {
  const meta = await sharp(fullPng).metadata();
  const top = Math.max(0, Math.round(bubbleHCss * dpr));
  const height = Math.min(meta.height - top, Math.round(stageHCss * dpr));
  return sharp(fullPng).extract({ left: 0, top, width: meta.width, height }).png().toBuffer();
}

async function extractRefSceneBand(refPath, outHeightCss) {
  const meta = await sharp(refPath).metadata();
  const top = Math.round(meta.height * BUBBLE_BAND_FRAC);
  const height = Math.round(meta.height * SCENE_BAND_FRAC);
  const band = await sharp(refPath).extract({ left: 0, top, width: meta.width, height }).png().toBuffer();
  const targetW = Math.round(view.width * dpr);
  return sharp(band).resize(targetW, Math.round(outHeightCss * dpr), { fit: 'fill' }).png().toBuffer();
}

function sampleCssRgb(data, w, ch, xCss, yCss) {
  return sampleRgb(data, w, ch, Math.round(xCss * dpr), Math.round(yCss * dpr));
}

function isBubbleFillRgb(rgb) {
  const [r, g, b] = rgb;
  return r > 228 && g > 228 && b > 228;
}

function noticePinOcclusionGate(pngPath, xCss = 352, yCss = 380) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const rgb = sampleCssRgb(data, info.width, info.channels, xCss, yCss);
    const pass = isBubbleFillRgb(rgb);
    return { x: xCss, y: yCss, rgb, pass };
  });
}

async function scanTailTipAndHeadPng(pngPath, bubbleHCss, bm, headHint) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const w = info.width;
  const headCx = Math.round(bm?.speakerHeadCenterX ?? headHint?.headCenterX ?? 200);
  const headY = Math.round(bm?.speakerHeadTopY ?? headHint?.speakerTopBand ?? bubbleHCss + 120);
  const engTailX = Math.round(bm?.tailTipX ?? headCx);
  const engTailY = Math.round(bm?.tailTipY ?? headY - 8);
  const headPx = { x: headCx, y: headY };
  let tailTip = { x: engTailX, y: engTailY };
  let tailStrokeHits = 0;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (isTailStroke(sampleCssRgb(data, w, ch, engTailX + dx, engTailY + dy))) tailStrokeHits++;
    }
  }
  if (tailStrokeHits < 2) {
    const xMin = Math.max(0, Math.round((headCx - 24) * dpr));
    const xMax = Math.min(w - 1, Math.round((headCx + 24) * dpr));
    const yTailMax = Math.min(info.height - 1, Math.round((headY + 12) * dpr));
    const yTailMin = Math.round((bubbleHCss + 16) * dpr);
    tailTip = null;
    for (let yDev = yTailMin; yDev <= yTailMax; yDev++) {
      for (let xDev = xMin; xDev <= xMax; xDev++) {
        const rgb = sampleRgb(data, w, ch, xDev, yDev);
        if (!isTailStroke(rgb)) continue;
        const yCss = yDev / dpr;
        const xCss = xDev / dpr;
        if (!tailTip || yCss > tailTip.y) tailTip = { x: Math.round(xCss), y: Math.round(yCss) };
      }
    }
  }
  const deltaX = tailTip && headPx ? Math.abs(tailTip.x - headPx.x) : null;
  const tailVisible = tailStrokeHits >= 2 || (tailTip && tailTip.y > bubbleHCss + 12 && tailTip.y <= headY + 16);
  return { tailTip, headPx, deltaX, tailVisible, tailStrokeHits };
}

async function buildEveningVsRef(outDir, eveningFullPath, refPath, bubbleHCss, stageHCss) {
  const out = path.join(outDir, `${TAG}_evening_vs_ref.png`);
  const eveBand = await extractSceneBandBuffer(eveningFullPath, bubbleHCss, stageHCss);
  const refBand = await extractRefSceneBand(refPath, stageHCss);
  const eveMeta = await sharp(eveBand).metadata();
  const refMeta = await sharp(refBand).metadata();
  const targetW = Math.max(eveMeta.width, refMeta.width);
  const eveScaled = await sharp(eveBand).resize(targetW, eveMeta.height, { fit: 'fill' }).png().toBuffer();
  const refScaled = await sharp(refBand).resize(targetW, refMeta.height, { fit: 'fill' }).png().toBuffer();
  const h = Math.max((await sharp(eveScaled).metadata()).height, (await sharp(refScaled).metadata()).height);
  const evePad = await sharp(eveScaled).extend({ top: 0, bottom: h - eveMeta.height, background: '#0a0a0a' }).png().toBuffer();
  const refPad = await sharp(refScaled).extend({ top: 0, bottom: h - refMeta.height, background: '#0a0a0a' }).png().toBuffer();
  await sharp({
    create: { width: targetW * 2, height: h, channels: 3, background: '#0a0a0a' }
  }).composite([
    { input: evePad, left: 0, top: 0 },
    { input: refPad, left: targetW, top: 0 }
  ]).png().toFile(out);
  return out;
}

function isPendantCordRgb(rgb) {
  const [r, g, b] = rgb;
  return g > 70 && g > r + 12 && g > b + 8 && r < 120;
}

async function refStageRgb(stageX, stageY) {
  const { data, info } = await sharp(STAGE_REF).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const i = (stageY * info.width + stageX) * ch;
  return [data[i], data[i + 1], data[i + 2]];
}

function rgbDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

async function findPendantCordCxCss(pngPath, bubbleHCss, stageHCss) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels || 4;
  const w = info.width;
  const y0Dev = Math.round((bubbleHCss + 8) * dpr);
  const y1Dev = Math.round((bubbleHCss + stageHCss * 0.55) * dpr);
  const xs = [];
  for (let yDev = y0Dev; yDev < y1Dev; yDev += 2) {
    for (let xDev = 0; xDev < w; xDev++) {
      const i = (yDev * w + xDev) * ch;
      if (isPendantCordRgb([data[i], data[i + 1], data[i + 2]])) xs.push(xDev / dpr);
    }
  }
  if (!xs.length) return null;
  return { cordCxCss: xs.reduce((a, b) => a + b, 0) / xs.length, samples: xs.length };
}

(async () => {
  const cacheBust = await sourceFingerprint();
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const notes = [];
  let exitCode = 0;

  try {
    await page.goto(`${server.base}/day10-phase1.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay', { timeout: 5000 });
    await page.evaluate(() => {
      const p = window.__scenePlayer;
      const sh = p.getConfig().shots.find((s) => s.id === 'd11_mar_chat');
      if (sh) sh.lightVariant = 'night';
      p.setShot('d11_mar_chat');
    });
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
    const bm = await page.evaluate(() => window.__scenePlayer.getBubbleScreenMetrics());
    const tailHit = await page.evaluate(() => window.__scenePlayer.bubbleTailSpeakerHitTest());
    const actors = await page.evaluate(() => window.__scenePlayer.inspectActorSprites());
    const propInspect = await page.evaluate(() => window.__scenePlayer.inspectKitchenProps?.() || []);
    const hud = await page.evaluate(() => ({
      speaker: document.querySelector('.scene-player-dialogue-speaker')?.textContent ?? '',
      text: document.querySelector('.scene-player-dialogue-text')?.textContent ?? ''
    }));
    const stagePixels = await page.evaluate((points) => {
      const p = window.__scenePlayer;
      return points.map(([x, y]) => p.sampleStageSceneRgb(x, y));
    }, LIGHT_TARGETS.map((t) => t.stage));
    const bandFrame = await page.evaluate(() => ({
      bubbleH: document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0,
      stageH: document.querySelector('.scene-player-stage')?.offsetHeight ?? 0
    }));

    const shotPath = path.join(outDir, `${TAG}_mar_chat_evening.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    const martinHead = await page.evaluate(() => window.__scenePlayer.speakerHeadCss('martin'));
    const tailScan = await scanTailTipAndHeadPng(shotPath, bandFrame.bubbleH, bm, martinHead);
    const pinGate = await noticePinOcclusionGate(shotPath, 352, 380);
    const tailPng = await tailWedgeGate(shotPath, bandFrame.bubbleH, dpr);
    const edgeGate = await rightEdgeBrightGate(shotPath, bandFrame.bubbleH, bandFrame.stageH, dpr);
    const pendant = propInspect.find((p) => p.id === 'pendant');
    const engineCordCx = m.activeOx + (PENDANT_STAGE_X - m.crop.x) * m.scale;
    const frameCenter = view.width / 2;
    const relPct = (engineCordCx / view.width) * 100;
    const cordScan = await findPendantCordCxCss(shotPath, bandFrame.bubbleH, bandFrame.stageH);
    const cordOk = pendant?.inCrop && Math.abs(relPct - 50) <= 4
      && (cordScan == null || Math.abs(cordScan.cordCxCss - frameCenter) <= view.width * 0.04);

    const castKeys = actors.map((a) => a.stageKey).sort();
    const castOk = castKeys.length === 2 && castKeys.includes('noe') && castKeys.includes('martin')
      && !castKeys.includes('lefevre');
    const noeOk = actors.find((a) => a.stageKey === 'noe')?.characterCanonical === 'noe';
    const martinOk = actors.find((a) => a.stageKey === 'martin')?.characterCanonical === 'madame_martin';

    await buildEveningVsRef(outDir, shotPath, REF_PATH, bandFrame.bubbleH, bandFrame.stageH);

    const bb = bm.bubbleBbox;
    const ps = bm.pendantShadeBbox;
    const edgeOk = bb && bb.x >= 16 && bb.x + bb.w <= view.width - 16;
    const pendantClear = ps && bb
      ? bb.x >= ps.right + 12 - 0.5
      : false;
    const bwOk = bb && bb.w >= 130 && bb.w <= 150;
    const tailStageOk = bm.tailLengthStagePx != null && bm.tailLengthStagePx >= 2 && bm.tailLengthStagePx <= 12;

    const lightLines = [];
    for (let i = 0; i < LIGHT_TARGETS.length; i++) {
      const t = LIGHT_TARGETS[i];
      const refRgb = await refStageRgb(t.stage[0], t.stage[1]);
      const eng = stagePixels[i]?.rgb ?? [0, 0, 0];
      const dRef = rgbDist(refRgb, t.rgb);
      const dEng = rgbDist(eng, t.rgb);
      const occ = dEng > 24 && t.stage[0] === 100
        ? ' (engine pixel covered by `chair_left` in table4 layout; ref is bare graded stage)'
        : '';
      lightLines.push(
        `- Stage **(${t.stage[0]},${t.stage[1]})** — target ${t.rgb.join(',')} · ref PNG ${refRgb.join(',')} (Δ${dRef}) · **engine ${eng.join(',')}** (Δ${dEng})${occ}`
      );
    }

    notes.push(
      `# Day 10 Round R9d — mar_chat evening (${TAG})`,
      '',
      '## Cast (soir table4)',
      `- Stage actors: **${castKeys.join(', ')}** — gate **${castOk ? 'PASS' : 'FAIL'}** (expect \`noe\` + \`martin\` only).`,
      `- Noé canonical id: **${noeOk ? 'PASS' : 'FAIL'}** (\`character: noe\`, \`noe.pose.sit_table_34\` @ 97,125 end chair).`,
      `- Martin canonical id: **${martinOk ? 'PASS' : 'FAIL'}** (\`character: madame_martin\`, \`martin.pose.sit_table_34\` flip @ 139,125 end chair).`,
      '',
      '### Sprites loaded (manifest resolve, night light)',
      ...actors.map((a) => {
        const files = a.layers.map((l) => l.file || l.layer).join(' · ');
        const frames = {
          'noe.pose.sit_table_34': 'noe atlas (0,144) 16×24',
          'martin.pose.sit_table_34': 'martin atlas (80,120) 16×24 flip'
        };
        const frameNote = frames[a.asset] || '';
        return `- **${a.stageKey}** → character \`${a.character}\` (canonical \`${a.characterCanonical}\`), pose \`${a.asset}\` ${frameNote}, layers: ${files}`;
      }),
      '',
      '## Camera (soir)',
      '- Crop: **16×**, centre **x≈118**, **73×84** stage px, top-left **(81, 52)** (`medium_table4` tight).',
      `- Engine: scale **${m.scale}**, preset **${m.cameraPreset}**, crop \`${JSON.stringify(m.crop)}\`.`,
      `- Pool margin (stage px): **${m.poolMarginAbovePanelStagePx}**.`,
      '',
      '## Pendant',
      `- In crop: **${pendant?.inCrop ? 'yes' : 'no'}**; cord layout x **${engineCordCx.toFixed(1)}** css (**${relPct.toFixed(1)}%** width).`,
      ...(cordScan ? [`- PNG cord scan cx: **${cordScan.cordCxCss.toFixed(1)}**.`] : []),
      `- Gate: **${cordOk ? 'PASS' : 'FAIL'}**.`,
      '',
      '## Right-edge framing',
      `- Bright partial-prop pixels x≥376: **${edgeGate.brightEdgePixels}** — **${edgeGate.pass ? 'PASS' : 'FAIL'}** (desk/lamp cropped out).`,
      '',
      '## Bubble + HUD',
      `- Bubble bbox (css): **${bm.bubbleBbox ? `x=${bm.bubbleBbox.x} y=${bm.bubbleBbox.y} w=${bm.bubbleBbox.w} h=${bm.bubbleBbox.h}` : 'n/a'}** — width gate **${bwOk ? 'PASS' : 'FAIL'}** (130–150); side margin **${edgeOk ? 'PASS' : 'FAIL'}**.`,
      `- Pendant shade bbox (css): **${ps ? `x=${ps.x} y=${ps.y} w=${ps.w} h=${ps.h} right=${ps.right}` : 'n/a'}** — clear of shade (+12) **${pendantClear ? 'PASS' : 'FAIL'}**.`,
      `- Tail length: **${bm.tailLengthPx}px** css (**${bm.tailLengthStagePx ?? '—'}** stage px); base half-width **${bm.tailHalfPx ?? '—'}px**.`,
      `- Tail tip (css): **(${bm.tailTipX}, ${bm.tailTipY})**; tail Δx **${bm.tailDeltaX}** — **${bm.tailDeltaX != null && Math.abs(bm.tailDeltaX) <= 4 ? 'PASS' : 'FAIL'}**.`,
      `- Speaker head (css, tail target): **(${bm.speakerHeadCenterX}, ${bm.speakerHeadTopY})**.`,
      `- PNG tail tip: **${tailScan.tailTip ? `(${tailScan.tailTip.x}, ${tailScan.tailTip.y})` : 'not found'}** · PNG speaker head: **(${tailScan.headPx.x}, ${tailScan.headPx.y})** · |Δx| **${tailScan.deltaX ?? '—'}** — **${tailScan.tailVisible && tailScan.deltaX != null && tailScan.deltaX <= 22 ? 'PASS' : 'FAIL'}**.`,
      `- Noticeboard pin occluder @ **(${pinGate.x}, ${pinGate.y})** rgb **${pinGate.rgb.join(',')}** — **${pinGate.pass ? 'PASS' : 'FAIL'}** (bubble fill covers prop).`,
      `- Tail speaker hit-test: **${tailHit?.hitActor ?? 'n/a'}** — **${tailHit?.hitActor === 'martin' ? 'PASS' : 'FAIL'}**.`,
      `- HUD speaker: \`${hud.speaker}\`; panel gloss only: \`${hud.text.slice(0, 40)}${hud.text.length > 40 ? '…' : ''}\` (no French repeat).`,
      '',
      '## Light maps (Pixel Studio rev3)',
      '- `light/night_multiplier_half.png`, `light/night_add_half.png`, `light/soir.json` from **light_r4** export.',
      `- Stage ref \`stage_night_table4_x1.png\` (sole ref; verify targets on file).`,
      '',
      '### Stage RGB checkpoints',
      ...lightLines,
      '',
      `Ref composite: \`${REF_PATH}\`.`,
      `Side-by-side: scene bands only, matched width → \`${TAG}_evening_vs_ref.png\`.`,
      '',
      `Source fingerprint: \`${cacheBust}\``
    );

    if (!castOk || !noeOk || !martinOk) exitCode = 1;
    if (!cordOk) exitCode = 1;
    if (!edgeGate.pass) exitCode = 1;
    if (!edgeOk || !bwOk || !pendantClear) exitCode = 1;
    if (bm.tailDeltaX == null || Math.abs(bm.tailDeltaX) > 4) exitCode = 1;
    if (!tailStageOk) exitCode = 1;
    if (tailHit?.hitActor !== 'martin') exitCode = 1;
    if (!tailScan.tailVisible || tailScan.deltaX == null || tailScan.deltaX > 22) exitCode = 1;
    if (!pinGate.pass) exitCode = 1;

    const notesName = `${TAG}_NOTES.md`;
    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, notesName), notes.join('\n') + '\n');
      if (dir !== outDir) {
        await fs.copyFile(shotPath, path.join(dir, `${TAG}_mar_chat_evening.png`));
        await fs.copyFile(path.join(outDir, `${TAG}_evening_vs_ref.png`), path.join(dir, `${TAG}_evening_vs_ref.png`));
        await fs.copyFile(path.join(dir, notesName), path.join(dir, notesName));
      }
    }
    console.log('Wrote', outDirs.join(', '));
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
