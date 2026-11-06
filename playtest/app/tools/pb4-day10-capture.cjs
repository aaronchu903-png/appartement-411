#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');

const appRoot = path.resolve(__dirname, '..');
const outDir = process.argv[2] || '/opt/cursor/artifacts/day10_packb4';
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

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await require('node:fs').promises.stat(file).catch(() => null);
      if (!st) return res.writeHead(404).end();
      if (st.isDirectory()) file = path.join(file, 'index.html');
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.mp3': 'audio/mpeg',
        '.png': 'image/png'
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

(async () => {
  await fs.mkdir(outDir, { recursive: true });
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: view });
  const errors = [];
  const metrics = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  try {
    await page.goto(`${server.base}/scenes/pack-b-lineup.html?pack=b`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay');
    await page.evaluate(() => window.__scenePlayer.setShot('lineup'));
    await page.waitForTimeout(250);
    metrics.push({ file: 'pb4_lineup.png', ...(await page.evaluate(() => window.__scenePlayer.getFramingMetrics())) });
    await page.screenshot({ path: path.join(outDir, 'pb4_lineup.png') });

    await page.goto(`${server.base}/day10-phase1.html?pack=b`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.click('.scene-player-overlay', { timeout: 5000 });
    for (const id of kitchenShots) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(280);
      const m = await page.evaluate(() => window.__scenePlayer.getFramingMetrics());
      metrics.push({ file: `pb4_${id}.png`, ...m });
      await page.screenshot({ path: path.join(outDir, `pb4_${id}.png`) });
    }
    await fs.writeFile(path.join(outDir, 'pb4_metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
    if (errors.length) throw new Error(`Console errors: ${errors.length}\n${errors.join('\n')}`);
    console.log('Wrote captures to', outDir);
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
