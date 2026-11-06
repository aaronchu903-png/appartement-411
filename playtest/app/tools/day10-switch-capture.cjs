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

const outRoot = process.argv[2] || '/cursor/stores/self/day10_switch/captures/switch';
const baselineP1 = '/cursor/stores/self/day10_P1R';
const baselineP2 = '/cursor/stores/self/day10_P2';

const P1_SHOTS = [
  'n_d11_matin2', 'stash_back', 'd11_cam_lit', 'n_d11_ecran', 'd11_mar_bonjour', 'd11_mar_photo',
  'd11_mar_chat', 'keyboard_cat', 'd11_mar_futur', 'd11_dictee', 'd11_noe_court', 'd11_cam_court',
  'd11_photo', 'n_d11_matin', 'd11_noe_lait', 'd11_cam_lait', 'd11_noe_faim', 'd11_cam_cafe', 'd11_cafe'
];

const P2_GROUPS = [
  { page: 'day10-rooftop.html', shots: ['n_d11_phone', 'pot_wiggle', 'd11_focus_photo', 'd11_noe_photo', 'd11_noe_pres', 'd11_noe_souriez', 'd11_cam_souriez', 'd11_souriez_vous', 'd11_cam_souriez2', 'n_d11_clic', 'd11_noe_encore'] },
  { page: 'day10-stairwell.html', shots: ['n_d11_escalier', 'd11_noe_montre', 'd11_lef_photo', 'n_d11_regard', 'n_d11_souvenir'] },
  { page: 'day10-phase2e.html', shots: ['n_d11_queue', 'd11_cam_queue', 'd11_noe_pasmoi', 'done'] }
];

/** Phone px crops for EVIDENCE (mandatory tool output). */
const EVIDENCE = [
  { fix: 'd11_photo', shot: 'd11_photo', page: 'day10-phase1.html', x: 95, y: 165, w: 220, h: 145 },
  { fix: 'keyboard_cat', shot: 'keyboard_cat', page: 'day10-phase1.html', x: 0, y: 130, w: 390, h: 140 },
  { fix: 'n_d11_queue_floor', shot: 'n_d11_queue', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { fix: 'd11_cam_queue_floor', shot: 'd11_cam_queue', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { fix: 'd11_noe_pasmoi_floor', shot: 'd11_noe_pasmoi', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { fix: 'done_floor', shot: 'done', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { fix: 'd11_noe_encore_tail', shot: 'd11_noe_encore', page: 'day10-rooftop.html', x: 15, y: 25, w: 360, h: 160 },
  { fix: 'n_d11_regard', shot: 'n_d11_regard', page: 'day10-stairwell.html', x: 0, y: 110, w: 390, h: 480 },
  { fix: 'n_d11_souvenir', shot: 'n_d11_souvenir', page: 'day10-stairwell.html', x: 0, y: 100, w: 390, h: 500 }
];

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** CSS-pixel crop; screenshots must use scale:'css'. */
async function cropPngCss(src, x, y, w, h, dest) {
  const meta = await sharp(src).metadata();
  const W = meta.width;
  const H = meta.height;
  const left = Math.max(0, Math.min(W - 1, Math.round(x)));
  const top = Math.max(0, Math.min(H - 1, Math.round(y)));
  const width = Math.max(1, Math.min(W - left, Math.round(w)));
  const height = Math.max(1, Math.min(H - top, Math.round(h)));
  if (width !== Math.round(w) || height !== Math.round(h)) {
    throw new Error(`crop assert failed ${dest}: got ${width}x${height}, expected ${w}x${h}`);
  }
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
  await fs.mkdir(path.join('/opt/cursor/artifacts/day10_switch/captures/switch'), { recursive: true }).catch(() => {});

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const hashes = [];
  const feetRows = [];
  const shotPaths = new Map();
  let activePage = null;

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

  async function captureShot(id, pageName) {
    await ensurePage(pageName);
    await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
    await page.waitForTimeout(300);
    const out = path.join(outRoot, `switch_${id}.png`);
    await page.screenshot({ path: out, scale: 'css' });
    const metrics = await page.evaluate(() => window.__scenePlayer.getFramingMetrics());
    shotPaths.set(id, out);
    const h = await sha256File(out);
    const baseP1 = path.join(baselineP1, `p1R12_${id}.png`);
    const baseP2 = path.join(baselineP2, `p2r3_${id}.png`);
    let baseHash = null;
    let baseTag = null;
    try { baseHash = await sha256File(baseP1); baseTag = 'p1R12'; } catch { /* */ }
    if (!baseHash) {
      try { baseHash = await sha256File(baseP2); baseTag = 'p2r3'; } catch { /* */ }
    }
    hashes.push({ id, hash: h, baseTag, baseHash, match: baseHash === h });
    const floorPct = metrics?.floorBandFracMeasured != null
      ? Math.round(metrics.floorBandFracMeasured * 1000) / 10
      : null;
    feetRows.push({ shot: id, actor: '_floor_line', feetPct: floorPct });
  }

  try {
    for (const id of P1_SHOTS) await captureShot(id, 'day10-phase1.html');
    for (const g of P2_GROUPS) {
      for (const id of g.shots) await captureShot(id, g.page);
    }

    const evidenceLines = [];
    for (const ev of EVIDENCE) {
      const src = shotPaths.get(ev.shot);
      if (!src) continue;
      const cropOut = path.join(cropDir, `${ev.fix}.png`);
      await cropPngCss(src, ev.x, ev.y, ev.w, ev.h, cropOut);
      const ch = await sha256File(cropOut);
      const baseP1 = path.join(baselineP1, `p1R12_${ev.shot}.png`);
      const baseP2 = path.join(baselineP2, `p2r3_${ev.shot}.png`);
      let baseCropHash = 'n/a';
      let baseTmp = path.join(cropDir, `_base_${ev.fix}.png`);
      for (const baseFull of [baseP1, baseP2]) {
        try {
          await cropPngCss(baseFull, ev.x, ev.y, ev.w, ev.h, baseTmp);
          baseCropHash = await sha256File(baseTmp);
          break;
        } catch { /* */ }
      }
      const diff = baseCropHash === ch ? 'SAME' : 'DIFF';
      evidenceLines.push(`${ev.fix}  crop@${ev.x},${ev.y},${ev.w},${ev.h}  sha256=${ch.slice(0, 16)}…  baseline_crop=${String(baseCropHash).slice(0, 16)}…  ${diff}`);
    }

    const hashTxt = hashes.map((r) => `${r.id}  ${r.hash}  baseline=${r.baseTag || 'none'}  ${r.match ? '=baseline' : 'DIFF'}`).join('\n');
    await fs.writeFile(path.join(outRoot, 'hashes.txt'), `${hashTxt}\n`);
    await fs.writeFile(path.join(outRoot, 'diff.txt'), `${evidenceLines.join('\n')}\n`);

    const feetTable = ['| shot | actor | feet % |', '|---|---|---|', ...feetRows.map((r) => `| ${r.shot} | ${r.actor} | ${r.feetPct} |`)].join('\n');
    const waiting = ['n_d11_queue', 'done'].map((s) => `- ${s}: phone_photo_plant_tail WAITING_ASSET (blank screen)`).join('\n');
    const notes = `# Day 10 switch pass (floor strips)

Branch \`astra/day10-scenes\`. Baseline: P1R12 + p2r3@934d985.

## Engine
- Runtime plank extension removed; canonical 192×32 strips at (0,144).
- Handoff cameras (y 37/70/90) in crop libraries.

## WAITING_ASSET
${waiting}

## Evidence crops (tool)
${evidenceLines.map((l) => `- ${l}`).join('\n')}

## Feet %
${feetTable}

See \`hashes.txt\`, \`crops/\`, full \`switch_*.png\`.
`;
    await fs.writeFile(path.join(outRoot, 'NOTES.md'), notes);

    const changed = hashes.filter((h) => !h.match);
    if (changed.length) {
      const tiles = [];
      for (const c of changed.slice(0, 12)) {
        const buf = await sharp(shotPaths.get(c.id)).resize(195, 422).png().toBuffer();
        tiles.push(buf);
      }
      const cols = Math.min(4, tiles.length);
      const rows = Math.ceil(tiles.length / cols);
      const comp = [];
      for (let i = 0; i < tiles.length; i++) {
        comp.push({ input: tiles[i], left: (i % cols) * 195, top: Math.floor(i / cols) * 422 });
      }
      await sharp({ create: { width: cols * 195, height: rows * 422, channels: 3, background: '#2a2830' } })
        .composite(comp).png().toFile(path.join(outRoot, 'changed_montage.png'));
    }

    console.log(`switch capture: ${hashes.length} frames, ${changed.length} differ from baseline → ${outRoot}`);
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
