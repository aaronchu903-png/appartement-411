#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const scenePath = path.join(appRoot, 'scenes/day10-kitchen/scene.json');
const BEATS = [
  ['n_d11_matin2', 'A1', 'W'], ['stash_back', 'A2', 'M'], ['d11_cam_lit', 'A3', 'CU'],
  ['n_d11_ecran', 'A4', 'CU'], ['d11_mar_bonjour', 'A5', 'CU→M'], ['d11_mar_photo', 'A6', 'M'],
  ['d11_mar_chat', 'A7', 'CU'], ['keyboard_cat', 'A8', 'CU'], ['d11_mar_futur', 'A9', 'CU'],
  ['d11_dictee', 'A10', 'CU'], ['d11_noe_court', 'A11', 'M'], ['d11_cam_court', 'A12', 'CU'],
  ['d11_photo', 'A13', 'M'], ['n_d11_matin', 'B1', 'M'], ['d11_noe_lait', 'B2', 'CU'],
  ['d11_cam_lait', 'B3', 'M'], ['d11_noe_faim', 'B4', 'CU'], ['d11_cam_cafe', 'B5', 'M'],
  ['d11_cafe', 'B6', 'M']
];

const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_phase1',
  '/cursor/stores/self/day10_phase1'
];
const view = { width: 390, height: 844 };
const dpr = 3;

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

function shotCast(stage) {
  return Object.entries(stage.actors || {})
    .filter(([, d]) => d)
    .map(([k]) => (k === 'cat' ? 'Croissant' : k.charAt(0).toUpperCase() + k.slice(1)));
}

function tailNote(bubbles, shotId, tMid) {
  const b = bubbles.find((x) => x.t0 <= tMid && x.t1 > tMid);
  if (!b) return '—';
  if (b.kind === 'narrator') return 'narrator (no tail)';
  if (b.kind === 'screen' || b.anchor === 'martin') return 'screen/voice → laptop (no person tail)';
  const who = b.actor || b.anchor;
  return `tail → ${who}`;
}

async function main() {
  const cfg = JSON.parse(await fs.readFile(scenePath, 'utf8'));
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const notes = [];
  const captures = [];

  try {
    await page.goto(`${server.base}/day10-phase1.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());

    for (const [id, beat, shotType] of BEATS) {
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(150);
      const meta = await page.evaluate(() => {
        const m = window.__scenePlayer.getFrameMetrics();
        const shot = window.__scenePlayer.getConfig().shots.find((s) => s.id === m.shotId);
        const stage = { ...window.__scenePlayer.getConfig().defaultStage, ...shot.stage };
        const bm = window.__scenePlayer.getBubbleScreenMetrics();
        return {
          scale: m.scale,
          preset: m.cameraPreset,
          cast: Object.entries(stage.actors || {}).filter(([, d]) => d).map(([k]) => k),
          tail: bm,
          tMid: (shot.t0 + shot.t1) / 2
        };
      });
      const file = `p1s_${id}.png`;
      const out = path.join(outDirs[0], file);
      await page.screenshot({ path: out, scale: 'css' });
      for (const dir of outDirs) {
        if (dir !== outDirs[0]) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const placeholders = [];
      const shot = cfg.shots.find((s) => s.id === id);
      const props = shot?.stage?.props || [];
      if (props.includes('calendar_wall')) placeholders.push('calendar (frame + label)');
      if (props.includes('coffee_pot')) placeholders.push('cafetière (cup stand-in + label)');
      if (id === 'stash_back') placeholders.push('stash_back art (pen/sock/spoon staging)');

      notes.push({
        id,
        beat,
        shotType,
        scale: `${meta.scale}× (${meta.preset})`,
        cast: meta.cast.join(', ') || '—',
        tail: tailNote(cfg.bubbles, id, meta.tMid),
        placeholders: placeholders.length ? placeholders.join('; ') : '—'
      });
    }

    const tileW = 390;
    const tileH = 844;
    const cols = 5;
    const composites = [];
    for (let i = 0; i < captures.length; i++) {
      const buf = await sharp(captures[i]).resize(tileW, tileH).png().toBuffer();
      composites.push({ input: buf, left: (i % cols) * tileW, top: Math.floor(i / cols) * tileH });
    }
    const rows = Math.ceil(captures.length / cols);
    const contact = await sharp({
      create: { width: cols * tileW, height: rows * tileH, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1_contact.png'), contact);
    }

    const md = [
      '# Day 10 Phase 1 — kitchen morning (A1–A13, B1–B6)',
      '',
      'Pack B canonical engine; beat sheet staging (Martin screen/voice on laptop; no morning Lefèvre).',
      '',
      '| beat | id | shot | scale | cast | tail / bubble | placeholders |',
      '|---|---|---|---|---|---|---|',
      ...notes.map((n) => `| ${n.beat} | \`${n.id}\` | ${n.shotType} | ${n.scale} | ${n.cast} | ${n.tail} | ${n.placeholders} |`),
      '',
      `Captures: \`p1s_<id>.png\` @ ${view.width}×${view.height} css, dpr ${dpr}. Contact: \`p1_contact.png\`.`,
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'P1_NOTES.md'), md);
    }
    console.log('Wrote', captures.length, 'shots to', outDirs.join(', '));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
