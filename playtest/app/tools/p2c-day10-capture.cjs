#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const phase2eDir = '/opt/cursor/artifacts/day10_phase2e';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_phase2c',
  '/cursor/stores/self/day10_phase2c'
];
const view = { width: 390, height: 844 };
const dpr = 3;

const ROOF_SHOTS = [
  ['C1', 'n_d11_phone', 'W'], ['C2', 'pot_wiggle', 'M'], ['C3', 'd11_focus_photo', 'CU'],
  ['C4', 'd11_noe_photo', 'M'], ['C5', 'd11_noe_pres', 'CU'], ['C6', 'd11_noe_souriez', 'CU'],
  ['C7', 'd11_cam_souriez', 'M'], ['C8', 'd11_souriez_vous', 'M'], ['C9', 'd11_cam_souriez2', 'CU'],
  ['C10', 'n_d11_clic', 'M'], ['C11', 'd11_noe_encore', 'M']
];

const P1_UNCHANGED = [
  'n_d11_matin2', 'stash_back', 'd11_cam_lit', 'n_d11_ecran', 'd11_mar_bonjour', 'd11_mar_photo',
  'd11_mar_chat', 'keyboard_cat', 'd11_mar_futur', 'd11_dictee', 'd11_noe_court', 'd11_cam_court',
  'd11_photo', 'n_d11_matin', 'd11_noe_lait', 'd11_cam_lait', 'd11_noe_faim', 'd11_cam_cafe', 'd11_cafe'
];
const P1_LOCKED = P1_UNCHANGED.filter((id) => !['d11_mar_bonjour', 'd11_mar_photo', 'd11_mar_chat', 'd11_mar_futur'].includes(id));

const P2E_FILES = [
  'p2s_n_d11_queue.png', 'p2s_d11_cam_queue.png', 'p2s_d11_noe_pasmoi.png', 'p2s_n_d11_souvenir.png', 'p2s_done.png'
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
  for (const id of P1_LOCKED) {
    const src = path.join(phase2eDir, `p1s_${id}.png`);
    const dest = path.join(outDirs[0], `p1s_${id}.png`);
    await fs.copyFile(src, dest);
    shaLocks.push({ file: `p1s_${id}.png`, ok: (await sha256(src)) === (await sha256(dest)) });
  }
  for (const id of ['d11_mar_bonjour', 'd11_mar_photo', 'd11_mar_chat', 'd11_mar_futur']) {
    await fs.copyFile(path.join(phase2eDir, `p1s_${id}.png`), path.join(outDirs[0], `p1s_${id}.png`));
  }
  for (const f of P2E_FILES) {
    if (f === 'p2s_done.png') continue;
    await fs.copyFile(path.join(phase2eDir, f), path.join(outDirs[0], f));
  }

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: view, deviceScaleFactor: dpr });
  const notes = [];

  try {
    await page.goto(`${server.base}/day10-rooftop.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    const roofCaptures = [];
    for (const [beat, id, shotType] of ROOF_SHOTS) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(160);
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
      roofCaptures.push(out);
      notes.push({
        beat,
        id,
        shot: shotType,
        scale: `${meta.scale}× (${meta.preset})`,
        crop: `(${meta.crop.x},${meta.crop.y}) ${meta.crop.w}×${meta.crop.h} @${meta.crop.fixedScale}×`,
        cast: meta.cast.join(', '),
        tail: 'in-room / narrator per bubble',
        gaps: beat === 'C1' ? 'Cat on parapet uses bench cat slot; verify sit pose vs 10×16 bench' : (beat === 'C8' ? 'M4 wiring unchanged in content-day10.js' : '—')
      });
    }

    await page.goto(`${server.base}/day10-phase2e.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.setCaptureOmitPlaceholders);
    await page.evaluate(() => {
      window.__scenePlayer.setCaptureOmitPlaceholders(false);
      const sh = window.__scenePlayer.getConfig().shots.find((s) => s.id === 'done');
      window.__scenePlayer.setT((sh.t0 + sh.t1) / 2);
    });
    await page.waitForTimeout(200);
    const e5 = path.join(outDirs[0], 'p2s_E5.png');
    await page.screenshot({ path: e5, scale: 'css' });
    notes.push({
      beat: 'E5',
      id: 'done',
      shot: 'split CU',
      scale: 'see frame',
      crop: 'kitchen close + rooftop evening inset',
      cast: 'phone top; Croissant between pot ① & pot_round evening',
      tail: 'narrator hook',
      gaps: 'Evening string lights after grade; cat between pots — confirm feet on deck y136'
    });

    for (const dir of outDirs) {
      for (const c of roofCaptures) await fs.copyFile(c, path.join(dir, path.basename(c)));
      await fs.copyFile(e5, path.join(dir, 'p2s_E5.png'));
      for (const id of P1_UNCHANGED) {
        await fs.copyFile(path.join(outDirs[0], `p1s_${id}.png`), path.join(dir, `p1s_${id}.png`));
      }
      for (const f of P2E_FILES) {
        if (f === 'p2s_done.png') continue;
        await fs.copyFile(path.join(outDirs[0], f), path.join(dir, f));
      }
    }

    const tiles = [...roofCaptures, e5];
    const composites = [];
    for (let i = 0; i < tiles.length; i++) {
      const buf = await sharp(tiles[i]).resize(390, 844).png().toBuffer();
      composites.push({ input: buf, left: (i % 4) * 390, top: Math.floor(i / 4) * 844 });
    }
    const contact = await sharp({
      create: { width: 4 * 390, height: 3 * 844, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'p2c_contact.png'), contact);

    const md = [
      '# Day 10 Phase 2C — canonical rooftop set',
      '',
      'Source: `packs/b/rooftop_set_r1` (69 assets, `check_manifest.py` OK). Pot ① → `prop.pot_chez_nous_*`.',
      '',
      '### Awaiting Pixel Studio (not in captures)',
      '- **D** stairwell (`n_d11_escalier` placeholder in kitchen timeline)',
      '- **E4** flash stairwell insert',
      '',
      '### SHA locks vs Phase 2E delivery',
      ...shaLocks.map((r) => `- \`${r.file}\`: ${r.ok ? 'unchanged ✓' : '**MISMATCH**'}`),
      '',
      '| beat | id | shot | scale | crop | cast | tail | gaps |',
      '|---|---|---|---|---|---|---|---|',
      ...notes.map((n) => `| ${n.beat} | \`${n.id}\` | ${n.shot} | ${n.scale} | ${n.crop} | ${n.cast} | ${n.tail} | ${n.gaps} |`),
      ''
    ].join('\n');
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'P2C_NOTES.md'), md);
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
