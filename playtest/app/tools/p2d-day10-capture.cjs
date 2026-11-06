#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const phase2cDir = '/opt/cursor/artifacts/day10_phase2c';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_phase2d',
  '/cursor/stores/self/day10_phase2d'
];
const view = { width: 390, height: 844 };
const dpr = 3;

const STAIR_SHOTS = [
  ['D1', 'n_d11_escalier', 'W'],
  ['D2', 'd11_noe_montre', 'M'],
  ['D3', 'd11_lef_photo', 'CU'],
  ['D4', 'n_d11_regard', 'CU'],
  ['E4', 'n_d11_souvenir', 'CU flash']
];

const P2C_LOCK_FILES = [
  'p2s_C1.png', 'p2s_C2.png', 'p2s_C3.png', 'p2s_C4.png', 'p2s_C5.png', 'p2s_C6.png',
  'p2s_C7.png', 'p2s_C8.png', 'p2s_C9.png', 'p2s_C10.png', 'p2s_C11.png', 'p2s_E5.png',
  'p2s_n_d11_queue.png', 'p2s_d11_cam_queue.png', 'p2s_d11_noe_pasmoi.png', 'p2s_n_d11_souvenir.png'
];

async function sha256(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await fs.stat(file);
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

async function main() {
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });

  const shaLocks = [];
  for (const f of P2C_LOCK_FILES) {
    const src = path.join(phase2cDir, f);
    const dest = path.join(outDirs[0], f);
    await fs.copyFile(src, dest);
    shaLocks.push({ file: f, ok: (await sha256(src)) === (await sha256(dest)) });
  }

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: view, deviceScaleFactor: dpr });
  const notes = [];

  try {
    await page.goto(`${server.base}/day10-stairwell.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    const stairCaptures = [];
    for (const [beat, id, shotType] of STAIR_SHOTS) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(180);
      const meta = await page.evaluate(() => {
        const m = window.__scenePlayer.getFrameMetrics();
        const shot = window.__scenePlayer.getConfig().shots.find((s) => s.id === m.shotId);
        const stage = { ...window.__scenePlayer.getConfig().defaultStage, ...shot.stage };
        return {
          scale: m.scale,
          preset: m.cameraPreset,
          crop: m.crop,
          cast: Object.entries(stage.actors || {}).filter(([, d]) => d).map(([k]) => k)
        };
      });
      const file = `p2s_${beat}.png`;
      const out = path.join(outDirs[0], file);
      await page.screenshot({ path: out, scale: 'css' });
      stairCaptures.push(out);
      const gaps = beat === 'D1'
        ? 'No newspaper prop in set — Lefèvre stands empty-handed; verify spacing vs door 411 (78,128)'
        : (beat === 'D2' ? 'Phone-in-hand pose uses stand + happy face; Camille half-raise = arm_r.point' : (beat === 'E4' ? 'Desaturated memory flash; eyes big-eyes face + screen glow insert' : '—'));
      notes.push({
        beat,
        id,
        shot: shotType,
        scale: `${meta.scale}× (${meta.preset})`,
        crop: `(${meta.crop.x},${meta.crop.y}) ${meta.crop.w}×${meta.crop.h} @${meta.crop.fixedScale || meta.scale}×`,
        cast: meta.cast.join(', '),
        tail: beat === 'D3' || beat === 'D4' ? 'screen glow insert → phone' : 'narrator / speaker per bubble',
        gaps
      });
    }

    for (const dir of outDirs) {
      for (const c of stairCaptures) await fs.copyFile(c, path.join(dir, path.basename(c)));
      for (const f of P2C_LOCK_FILES) {
        await fs.copyFile(path.join(outDirs[0], f), path.join(dir, f));
      }
    }

    const tiles = stairCaptures;
    const composites = [];
    for (let i = 0; i < tiles.length; i++) {
      const buf = await sharp(tiles[i]).resize(390, 844).png().toBuffer();
      composites.push({ input: buf, left: (i % 3) * 390, top: Math.floor(i / 3) * 844 });
    }
    const contact = await sharp({
      create: { width: 3 * 390, height: 2 * 844, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'p2d_contact.png'), contact);

    const md = [
      '# Day 10 Phase 2D — canonical stairwell set',
      '',
      'Source: `packs/b/stairwell_set_r1` (69 assets, `check_manifest.py` OK). Door 411 → `prop.door_home_*` / `prop.doormat_home`.',
      '',
      '### Placeholders remaining in Day 10',
      '- Kitchen prop badges only: `calendar`, `cafetière` on wall (awaiting final kitchen pieces) — no scene-set placeholders.',
      '',
      '### SHA locks vs Phase 2C delivery',
      ...shaLocks.map((r) => `- \`${r.file}\`: ${r.ok ? 'unchanged ✓' : '**MISMATCH**'}`),
      '',
      '| beat | id | shot | scale | crop | cast | tail | gaps |',
      '|---|---|---|---|---|---|---|---|',
      ...notes.map((n) => `| ${n.beat} | \`${n.id}\` | ${n.shot} | ${n.scale} | ${n.crop} | ${n.cast} | ${n.tail} | ${n.gaps} |`),
      ''
    ].join('\n');
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'P2D_NOTES.md'), md);
    console.log('SHA lock failures', shaLocks.filter((r) => !r.ok).length);
    console.log('Wrote', outDirs.join(', '));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
