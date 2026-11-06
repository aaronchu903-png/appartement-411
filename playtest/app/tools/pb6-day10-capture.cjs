#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const appRoot = path.resolve(__dirname, '..');
const outDir = process.argv[2] || '/opt/cursor/artifacts/day10_packb6';
const view = { width: 390, height: 844 };
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
  const h = m.crop?.h ?? 0;
  const wallLimit = h >= 100 ? 110 : h >= 80 ? 60 : 32;
  if (m.wallGapAboveContentStagePx > wallLimit) {
    fails.push(`wall gap ${m.wallGapAboveContentStagePx}px > ${wallLimit}`);
  }
  const needsBubble = shotKey !== 'lineup' && !shotKey.startsWith('n_') && shotKey !== 'keyboard_cat';
  if (needsBubble && m.bubbleInTopBand === false) fails.push('bubble not in top band');
  if (m.tailLengthPx != null && (m.tailLengthPx < 4 || m.tailLengthPx > 18)) {
    fails.push(`tail length ${m.tailLengthPx}px`);
  }
  if (m.tailTipAboveHeadPx != null && m.tailTipAboveHeadPx < 2) fails.push('tail tip not above head');
  return fails;
}

(async () => {
  await fs.mkdir(outDir, { recursive: true });
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: view });
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
    metrics.push({ file: 'pb6_lineup.png', ...mLineup });
    allFails.push(...validateMetrics('pb6_lineup.png', mLineup, 'lineup').map((f) => `lineup: ${f}`));
    await page.screenshot({ path: path.join(outDir, 'pb6_lineup.png') });

    await page.goto(`${server.base}/day10-phase1.html?pack=b`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay', { timeout: 5000 });
    for (const id of kitchenShots) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(320);
      const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
      metrics.push({ file: `pb6_${id}.png`, ...m });
      allFails.push(...validateMetrics(`pb6_${id}.png`, m, id).map((f) => `${id}: ${f}`));
      await page.screenshot({ path: path.join(outDir, `pb6_${id}.png`) });
    }
    await page.evaluate(() => window.__scenePlayer.setShot('d11_mar_chat'));
    await page.waitForTimeout(320);
    const mEv = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
    metrics.push({ file: 'pb6_mar_chat_evening.png', ...mEv });
    allFails.push(...validateMetrics('pb6_mar_chat_evening.png', mEv, 'd11_mar_chat').map((f) => `mar_chat_evening: ${f}`));
    await page.screenshot({ path: path.join(outDir, 'pb6_mar_chat_evening.png') });

    await fs.writeFile(path.join(outDir, 'pb6_metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
    if (errors.length) throw new Error(`Console errors: ${errors.length}\n${errors.join('\n')}`);
    if (allFails.length) throw new Error(`Metric validation failed:\n${allFails.join('\n')}`);
    console.log('Wrote captures to', outDir);
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
