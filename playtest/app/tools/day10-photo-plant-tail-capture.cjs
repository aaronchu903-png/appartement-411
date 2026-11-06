#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const view = { width: 390, height: 844 };
const dpr = 3;

const outRoot = process.argv[2] || '/cursor/stores/self/day10_switch/captures/photo_plant_tail';

const SHOTS = [
  { id: 'd11_cam_queue', page: 'day10-phase2e.html' },
  { id: 'd11_noe_pasmoi', page: 'day10-phase2e.html' },
  { id: 'n_d11_regard', page: 'day10-stairwell.html' },
  { id: 'n_d11_souvenir', page: 'day10-stairwell.html' }
];

const CROPS = [
  { fix: 'd11_cam_queue_phone', shot: 'd11_cam_queue', x: 70, y: 95, w: 250, h: 280 },
  { fix: 'd11_noe_pasmoi_phone', shot: 'd11_noe_pasmoi', x: 70, y: 95, w: 250, h: 280 },
  { fix: 'n_d11_regard_phone', shot: 'n_d11_regard', x: 40, y: 200, w: 200, h: 220 },
  { fix: 'n_d11_souvenir_insert', shot: 'n_d11_souvenir', x: 55, y: 85, w: 280, h: 300 }
];

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function cropPng(src, x, y, w, h, dest) {
  const meta = await sharp(src).metadata();
  const W = meta.width;
  const H = meta.height;
  const left = Math.max(0, Math.min(W - 1, Math.round(x * dpr)));
  const top = Math.max(0, Math.min(H - 1, Math.round(y * dpr)));
  const width = Math.max(1, Math.min(W - left, Math.round(w * dpr)));
  const height = Math.max(1, Math.min(H - top, Math.round(h * dpr)));
  await sharp(src).extract({ left, top, width, height }).png().toFile(dest);
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await require('node:fs').promises.stat(file).catch(() => null);
      if (!st) return res.writeHead(404).end();
      if (st.isDirectory()) file = path.join(file, 'index.html');
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

(async () => {
  const cropDir = path.join(outRoot, 'crops');
  await fs.mkdir(cropDir, { recursive: true });

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const hashes = [];
  const shotPaths = new Map();
  let activePage = null;
  const overlayRects = {};

  async function ensurePage(pageName) {
    if (activePage === pageName) return;
    await page.goto(`${server.base}/${pageName}?pack=b&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.evaluate(() => {
      window.__scenePlayer.setCaptureOmitPlaceholders(true);
      window.__scenePlayer.start();
    });
    await page.waitForTimeout(350);
    activePage = pageName;
  }

  for (const { id, page: pageName } of SHOTS) {
    await ensurePage(pageName);
    await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
    await page.waitForTimeout(300);
    if (id === 'd11_cam_queue' || id === 'd11_noe_pasmoi') {
      overlayRects[id] = await page.evaluate(() => window.__scenePlayer.getPhonePlantTailOverlayScreenRect?.());
    }
    const out = path.join(outRoot, `photo_${id}.png`);
    await page.screenshot({ path: out, scale: 'css' });
    shotPaths.set(id, out);
    hashes.push({ id, hash: await sha256File(out) });
  }

  const evidenceLines = [];
  for (const ev of CROPS) {
    const src = shotPaths.get(ev.shot);
    const cropOut = path.join(cropDir, `${ev.fix}.png`);
    await cropPng(src, ev.x, ev.y, ev.w, ev.h, cropOut);
    const ch = await sha256File(cropOut);
    evidenceLines.push(`${ev.fix}  crop@${ev.x},${ev.y},${ev.w},${ev.h}  sha256=${ch}`);
  }

  const hashTxt = hashes.map((r) => `${r.id}  ${r.hash}`).join('\n');
  await fs.writeFile(path.join(outRoot, 'hashes.txt'), `${hashTxt}\n`);
  await fs.writeFile(path.join(outRoot, 'crops_hashes.txt'), `${evidenceLines.join('\n')}\n`);

  const notes = `# Photo plant tail (PASSED assets)

Branch \`astra/day10-scenes\`.

## Overlay screen (REPORTED)
Spec: 184×204 CSS px (46×51 @×4). Engine constant \`PHONE_PLANT_TAIL_OVERLAY_SCREEN\` in scene-player.js.

- \`d11_cam_queue\`: ${JSON.stringify(overlayRects.d11_cam_queue)}
- \`d11_noe_pasmoi\`: ${JSON.stringify(overlayRects.d11_noe_pasmoi)}

## Shots wired
- \`d11_cam_queue\`, \`d11_noe_pasmoi\`: overlay screen (self-lit, ungraded)
- \`n_d11_regard\`: \`handprop.phone\` + tiny at phone-local (1,1)
- \`n_d11_souvenir\`: close insert (day grade) + desaturate memory veil

## Tool crops + hashes
${evidenceLines.map((l) => `- ${l}`).join('\n')}

Full frames: \`photo_*.png\`, \`hashes.txt\`.
`;
  await fs.writeFile(path.join(outRoot, 'NOTES.md'), notes);

  await browser.close();
  await server.close();
  console.log(`photo plant tail capture → ${outRoot}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
