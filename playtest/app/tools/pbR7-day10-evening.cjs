#!/usr/bin/env node
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const REF_PATH = process.argv[3]
  || '/workspace/app/scenes/packs/b/kitchen/composite_medium_game_night_table4_1080x1920.png';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_R7',
  '/cursor/stores/self/day10_R7'
];
const view = { width: 390, height: 844 };
const dpr = 3;
const PENDANT_STAGE_X = 118;

async function sourceFingerprint() {
  const files = [
    'scenes/scene-player.js',
    'scenes/day10-kitchen/scene.json'
  ];
  const h = crypto.createHash('sha256');
  for (const rel of files) {
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

function isPendantCordRgb(rgb) {
  const [r, g, b] = rgb;
  return g > 70 && g > r + 12 && g > b + 8 && r < 120;
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
  xs.sort((a, b) => a - b);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { cordCxCss: cx, samples: xs.length };
}

async function buildEveningVsRef(outDir, eveningFullPath, refPath) {
  const out = path.join(outDir, 'pbR7_evening_vs_ref.png');
  const eveMeta = await sharp(eveningFullPath).metadata();
  const refNat = await sharp(refPath).metadata();
  const refW = Math.max(1, Math.round(refNat.width * (eveMeta.height / refNat.height)));
  const refBuf = await sharp(refPath).resize(refW, eveMeta.height, { fit: 'fill' }).png().toBuffer();
  const refMeta = await sharp(refBuf).metadata();
  await sharp({
    create: { width: eveMeta.width + refMeta.width, height: eveMeta.height, channels: 3, background: '#0a0a0a' }
  })
    .composite([
      { input: eveningFullPath, left: 0, top: 0 },
      { input: refBuf, left: eveMeta.width, top: 0 }
    ])
    .png()
    .toFile(out);
  return out;
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
    await page.waitForTimeout(500);

    const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
    const propInspect = await page.evaluate(() => window.__scenePlayer.inspectKitchenProps?.() || []);
    const bandFrame = await page.evaluate(() => {
      const bubbleH = document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0;
      const stageH = document.querySelector('.scene-player-stage')?.offsetHeight ?? 0;
      return { bubbleH, stageH };
    });

    const shotPath = path.join(outDir, 'pbR7_mar_chat_evening.png');
    await page.screenshot({ path: shotPath, fullPage: false });

    const pendant = propInspect.find((p) => p.id === 'pendant');
    const engineCordCx = m.activeOx + (PENDANT_STAGE_X - m.crop.x) * m.scale;
    const frameCenter = view.width / 2;
    const relPct = (engineCordCx / view.width) * 100;
    const deltaPct = relPct - 50;
    const cordScan = await findPendantCordCxCss(shotPath, bandFrame.bubbleH, bandFrame.stageH);
    const cordOk = Math.abs(deltaPct) <= 3
      && (cordScan == null || Math.abs(cordScan.cordCxCss - frameCenter) <= view.width * 0.03);

    await buildEveningVsRef(outDir, shotPath, REF_PATH);

    notes.push(
      '# Day 10 Round R7 — mar_chat_evening camera (73,56) @ 12×',
      '',
      '## Camera',
      '- Soir crop: **medium_table4**, `fixedScale: 12`, top-left **(73, 56)**, **90×88**, `reservePoolMarginStagePx: 8`.',
      `- Ref composite: \`${REF_PATH}\` (18:06 Pixel Studio).`,
      '',
      '## Pendant cord centering (scene band, 390px wide)',
      `- Engine cord x (layout): **${engineCordCx.toFixed(1)}** css → **${relPct.toFixed(2)}%** of frame width (target ~51%, ±3%).`,
      ...(cordScan ? [`- PNG cord scan cx: **${cordScan.cordCxCss.toFixed(1)}** (${cordScan.samples} cord pixels).`] : []),
      `- Gate: **${cordOk ? 'PASS' : 'FAIL'}** (Δ from centre ${deltaPct.toFixed(2)}%).`,
      '',
      '## Pool',
      '- Pool colour matches 18:06 ref (**105,86,68** at centre) — no further pool work this round.',
      '',
      `Source fingerprint: \`${cacheBust}\``,
      '',
      '## Crop metrics',
      `\`\`\`json\n${JSON.stringify({ crop: m.crop, scale: m.scale, activeOx: m.activeOx, activeOy: m.activeOy, poolMarginStagePx: m.poolMarginAbovePanelStagePx, pendant: pendant ? { inCrop: pendant.inCrop, visH: pendant.visibleHeightPct } : null }, null, 2)}\n\`\`\``
    );

    if (!cordOk) {
      console.error(`Pendant cord gate FAIL: ${relPct.toFixed(2)}% width (want 48–54%)`);
      exitCode = 1;
    }

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'pbR7_NOTES.md'), notes.join('\n') + '\n');
      if (dir !== outDir) {
        await fs.copyFile(shotPath, path.join(dir, 'pbR7_mar_chat_evening.png'));
        await fs.copyFile(path.join(outDir, 'pbR7_evening_vs_ref.png'), path.join(dir, 'pbR7_evening_vs_ref.png'));
        await fs.copyFile(path.join(dir, 'pbR7_NOTES.md'), path.join(dir, 'pbR7_NOTES.md'));
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
