#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const phase1Dir = '/opt/cursor/artifacts/day10_phase1';
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_phase2e',
  '/cursor/stores/self/day10_phase2e'
];
const view = { width: 390, height: 844 };
const dpr = 3;

const P1_CHANGED = new Set(['d11_mar_bonjour', 'd11_mar_photo', 'd11_mar_chat', 'd11_mar_futur']);
const P1_ALL = [
  'n_d11_matin2', 'stash_back', 'd11_cam_lit', 'n_d11_ecran', 'd11_mar_bonjour', 'd11_mar_photo',
  'd11_mar_chat', 'keyboard_cat', 'd11_mar_futur', 'd11_dictee', 'd11_noe_court', 'd11_cam_court',
  'd11_photo', 'n_d11_matin', 'd11_noe_lait', 'd11_cam_lait', 'd11_noe_faim', 'd11_cam_cafe', 'd11_cafe'
];

const P2_CAPTURE = [
  { id: 'n_d11_queue', beat: 'E1', shot: 'M→CU' },
  { id: 'd11_cam_queue', beat: 'E2', shot: 'CU' },
  { id: 'd11_noe_pasmoi', beat: 'E3', shot: 'M' },
  { id: 'n_d11_souvenir', beat: 'E4', shot: 'CU (pre-flash)', tOffset: 0.15 },
  { id: 'done', beat: 'E5', shot: 'split CU (top phone only)', tOffset: 0.5 }
];

async function sha256(file) {
  const buf = await fs.readFile(file);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await require('node:fs/promises').stat(file);
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

  const shaReport = [];
  for (const id of P1_ALL) {
    const src = path.join(phase1Dir, `p1s_${id}.png`);
    const dest = path.join(outDirs[0], `p1s_${id}.png`);
    if (!P1_CHANGED.has(id)) {
      await fs.copyFile(src, dest);
      const a = await sha256(src);
      const b = await sha256(dest);
      shaReport.push({ id, unchanged: a === b, sha: b });
    }
  }

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const notes = [];

  try {
    await page.goto(`${server.base}/day10-phase1.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());

    for (const id of P1_CHANGED) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(160);
      const meta = await page.evaluate(() => {
        const m = window.__scenePlayer.getFrameMetrics();
        const bm = window.__scenePlayer.getBubbleScreenMetrics();
        return { scale: m.scale, preset: m.cameraPreset, screenBubble: !!bm.screenBubble };
      });
      const out = path.join(outDirs[0], `p1s_${id}.png`);
      await page.screenshot({ path: out, scale: 'css' });
      const oldSha = await sha256(path.join(phase1Dir, `p1s_${id}.png`));
      const newSha = await sha256(out);
      shaReport.push({ id, unchanged: oldSha === newSha, sha: newSha, screenBubble: meta.screenBubble });
      notes.push({ file: `p1s_${id}.png`, beat: id, part: 'P1 addendum', shot: '—', scale: `${meta.scale}×`, tail: 'screen message bubble → laptop', placeholders: '—' });
    }

    await page.goto(`${server.base}/day10-phase2e.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.setCaptureOmitPlaceholders);

    const p2Captures = [];
    for (const spec of P2_CAPTURE) {
      await page.evaluate(({ sid, off }) => {
        const sh = window.__scenePlayer.getConfig().shots.find((s) => s.id === sid);
        window.__scenePlayer.setT(sh.t0 + (off ?? 0.5) * (sh.t1 - sh.t0));
      }, { sid: spec.id, off: spec.tOffset });
      await page.waitForTimeout(160);
      const meta = await page.evaluate(() => {
        const m = window.__scenePlayer.getFrameMetrics();
        const shot = window.__scenePlayer.getConfig().shots.find((s) => s.id === m.shotId);
        const stage = { ...window.__scenePlayer.getConfig().defaultStage, ...shot.stage };
        return {
          scale: m.scale,
          preset: m.cameraPreset,
          cast: Object.entries(stage.actors || {}).filter(([, d]) => d).map(([k]) => k)
        };
      });
      const file = `p2s_${spec.id}.png`;
      const out = path.join(outDirs[0], file);
      await page.screenshot({ path: out, scale: 'css' });
      p2Captures.push(out);
      notes.push({
        file,
        beat: spec.beat,
        part: 'P2 E',
        shot: spec.shot,
        scale: `${meta.scale}× (${meta.preset})`,
        tail: spec.id === 'done' ? 'narrator hook' : `in-room · ${meta.cast.join(', ')}`,
        placeholders: spec.id === 'n_d11_souvenir' ? 'flash/stairwell not captured' : (spec.id === 'done' ? 'roof bottom omitted in capture' : (spec.id === 'n_d11_queue' ? 'phone insert (art)' : '—'))
      });
    }

    for (const dir of outDirs) {
      for (const id of P1_ALL) {
        const f = `p1s_${id}.png`;
        await fs.copyFile(path.join(outDirs[0], f), path.join(dir, f));
      }
      for (const spec of P2_CAPTURE) {
        const f = `p2s_${spec.id}.png`;
        await fs.copyFile(path.join(outDirs[0], f), path.join(dir, f));
      }
    }

    const contactTiles = [...P1_ALL.map((id) => path.join(outDirs[0], `p1s_${id}.png`)), ...p2Captures];
    const tileW = 390;
    const tileH = 844;
    const cols = 6;
    const composites = [];
    for (let i = 0; i < contactTiles.length; i++) {
      const buf = await sharp(contactTiles[i]).resize(tileW, tileH).png().toBuffer();
      composites.push({ input: buf, left: (i % cols) * tileW, top: Math.floor(i / cols) * tileH });
    }
    const rows = Math.ceil(contactTiles.length / cols);
    const contact = await sharp({
      create: { width: cols * tileW, height: rows * tileH, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'p2_contact.png'), contact);

    const unchangedFails = shaReport.filter((r) => !P1_CHANGED.has(r.id) && !r.unchanged);
    const md = [
      '# Day 10 Phase 2E delivery',
      '',
      '## Part 1 — Martin screen message bubble (A5, A6, A7, A9)',
      'Cool dashed frame, speaker/phone icon, HUD label with icon, tail toward laptop.',
      '',
      '### P1 SHA lock (unchanged beats must match Phase 1 delivery)',
      ...shaReport.map((r) => `- \`${r.id}\`: ${P1_CHANGED.has(r.id) ? '**updated**' : (r.unchanged ? 'unchanged ✓' : '**SHA MISMATCH**')}`),
      '',
      unchangedFails.length ? `**SHA failures:** ${unchangedFails.map((f) => f.id).join(', ')}` : 'All non-updated P1 captures SHA-match Phase 1.',
      '',
      '## Part 2 — Evening kitchen E (pb24 soir grade via `soirKitchen`)',
      '',
      '### Awaiting Pixel Studio sets (not in review captures)',
      '- **C** (roof): `n_d11_phone` placeholder background',
      '- **D** (stairwell): `n_d11_escalier` placeholder background',
      '- **E4** flash insert: stairwell / Lefèvre look (logic wired; capture is pre-flash Noé only)',
      '- **E5** bottom: rooftop dusk placeholder (omitted in `p2s_done.png`)',
      '',
      '| file | beat | shot | scale | cast / tail | placeholders |',
      '|---|---|---|---|---|---|',
      ...notes.map((n) => `| \`${n.file}\` | ${n.beat} | ${n.shot} | ${n.scale} | ${n.tail} | ${n.placeholders} |`),
      ''
    ].join('\n');
    for (const dir of outDirs) await fs.writeFile(path.join(dir, 'P2_NOTES.md'), md);

    console.log('SHA unchanged failures:', unchangedFails.length);
    console.log('Wrote to', outDirs.join(', '));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
