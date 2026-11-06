#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_packb7',
  '/cursor/stores/self/day10_packb7'
];
const view = { width: 390, height: 844 };
const dpr = 3;

const kitchenShots = [
  'd11_cam_lait',
  'd11_mar_bonjour',
  'd11_mar_chat',
  'd11_mar_photo',
  'keyboard_cat',
  'n_d11_matin2',
  'd11_noe_lait',
  'd11_dictee'
];

const EXPECTED_CAST = {
  lineup: 5,
  d11_cam_lait: 2,
  d11_mar_bonjour: 3,
  d11_mar_chat: 2,
  d11_mar_photo: 4,
  keyboard_cat: 1,
  n_d11_matin2: 3,
  d11_noe_lait: 1,
  d11_dictee: 3
};

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

function validateMetrics(file, m, shotKey) {
  const fails = [];
  const exp = EXPECTED_CAST[shotKey];
  if (exp != null && m.castInFrame !== exp) fails.push(`castInFrame ${m.castInFrame} !== ${exp}`);
  if (m.anySpriteClipped) fails.push('sprite clipped');
  if (m.wallGapAboveContentStagePx > 12) {
    fails.push(`wall gap ${m.wallGapAboveContentStagePx}px > 12`);
  }
  const minPct = m.charHeightMinPct ?? 12;
  const charPct = m.charHeightPctScreen ?? 0;
  const charBand = m.charHeightPctBand ?? 0;
  if (shotKey === 'keyboard_cat') {
    if (charPct < 8 - 0.05) fails.push(`keyboard cat height ${charPct}% of screen < 8%`);
  } else if (charBand < minPct - 0.05 && charPct < minPct - 0.05) {
    fails.push(`char height band ${charBand}% / screen ${charPct}% < ${minPct}%`);
  }
  if (m.stageBandCoveragePct < 99.5) {
    fails.push(`stage band coverage ${m.stageBandCoveragePct}% < 100%`);
  }
  if (m.dpr !== dpr) fails.push(`dpr ${m.dpr} !== ${dpr}`);
  const crop = m.crop || {};
  if (crop.x < 0 || crop.y < 0 || crop.x + crop.w > 192.5 || crop.y + crop.h > 144.5) {
    fails.push(`crop outside 192×144 stage: ${JSON.stringify(crop)}`);
  }
  const needsBubble = shotKey !== 'lineup' && !shotKey.startsWith('n_') && shotKey !== 'keyboard_cat';
  if (needsBubble && m.bubbleInTopBand === false) fails.push('bubble not in top band');
  if (m.tailLengthPx != null && (m.tailLengthPx < 4 || m.tailLengthPx > 18)) {
    fails.push(`tail length ${m.tailLengthPx}px`);
  }
  if (m.tailTipAboveHeadPx != null && m.tailTipAboveHeadPx < 2) fails.push('tail tip not above head');
  return fails;
}

async function capturePair(page, outDir, baseName) {
  const fullPath = path.join(outDir, `${baseName}.png`);
  const smallPath = path.join(outDir, `${baseName.replace(/^pb7_/, 'pb7s_')}.png`);
  await page.screenshot({ path: fullPath, fullPage: false });
  await sharp(fullPath).resize(390, 844).toFile(smallPath);
}

(async () => {
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: view,
    deviceScaleFactor: dpr
  });
  const page = await context.newPage();
  const errors = [];
  const metrics = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', (res) => { if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`); });

  const allFails = [];
  try {
    await page.goto(`${server.base}/scenes/pack-b-lineup.html?pack=b`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay');
    await page.evaluate(() => window.__scenePlayer.setShot('lineup'));
    await page.waitForTimeout(320);
    const mLineup = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
    metrics.push({ file: 'pb7_lineup.png', ...mLineup });
    allFails.push(...validateMetrics('pb7_lineup.png', mLineup, 'lineup').map((f) => `lineup: ${f}`));
    await capturePair(page, outDir, 'pb7_lineup');

    await page.goto(`${server.base}/day10-phase1.html?pack=b`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay', { timeout: 5000 });
    for (const id of kitchenShots) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(320);
      const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
      const base = `pb7_${id}`;
      metrics.push({ file: `${base}.png`, ...m });
      allFails.push(...validateMetrics(`${base}.png`, m, id).map((f) => `${id}: ${f}`));
      await capturePair(page, outDir, base);
    }
    await page.evaluate(() => window.__scenePlayer.setShot('d11_mar_chat'));
    await page.waitForTimeout(320);
    const mEv = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
    metrics.push({ file: 'pb7_mar_chat_evening.png', ...mEv });
    allFails.push(...validateMetrics('pb7_mar_chat_evening.png', mEv, 'd11_mar_chat').map((f) => `mar_chat_evening: ${f}`));
    await capturePair(page, outDir, 'pb7_mar_chat_evening');

    const notes = [
      '# Pack B pb7 — device-pixel kitchen scale (DPR 3)',
      '',
      'Canvas backing store uses CSS×DPR; integer scale is chosen in device pixels:',
      '`scaleDev = floor(min(bandH_dev/cropH, W_dev/cropW))` → ~8× wide, 12× medium, 18× close at 390×844.',
      '',
      'Deliverables: `pb7_*.png` (1170×2532) and `pb7s_*.png` (390×844 downscale).',
      '',
      'Self-check (device px): char height % of full screen, stage band axis fill, wall gap ≤12 stage px, cast/clipping/bubbles from pb6.',
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'pb7_metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
      await fs.writeFile(path.join(dir, 'pb7_NOTES.md'), notes + '\n');
      for (const entry of metrics) {
        const base = entry.file.replace('.png', '');
        const srcFull = path.join(outDir, `${base}.png`);
        const srcSmall = path.join(outDir, base.replace(/^pb7_/, 'pb7s_') + '.png');
        if (dir !== outDir) {
          await fs.copyFile(srcFull, path.join(dir, `${base}.png`));
          await fs.copyFile(srcSmall, path.join(dir, base.replace(/^pb7_/, 'pb7s_') + '.png'));
        }
      }
    }

    if (errors.length) throw new Error(`Console errors: ${errors.length}\n${errors.join('\n')}`);
    if (allFails.length) throw new Error(`Metric validation failed:\n${allFails.join('\n')}`);
    console.log('Wrote captures to', outDirs.join(', '));
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
