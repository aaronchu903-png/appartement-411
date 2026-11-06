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

const outRoot = process.argv[2] || '/cursor/stores/self/day10_fix2';
const fix1EvidencePath = process.argv[3] || '/cursor/stores/self/day10_fix1/evidence.json';
const baselineP1 = '/cursor/stores/self/day10_P1R';
const baselineP2 = '/cursor/stores/self/day10_P2';

const FIX2_CHANGED_SHOTS = new Set([
  'd11_cafe', 'n_d11_matin2', 'd11_cam_queue', 'd11_noe_pasmoi', 'd11_lef_photo',
  'd11_noe_montre', 'd11_noe_photo', 'done', 'd11_dictee', 'd11_mar_bonjour',
  'n_d11_escalier', 'n_d11_phone', 'pot_wiggle'
]);

const P1_SHOTS = [
  'n_d11_matin2', 'stash_back', 'd11_cam_lit', 'n_d11_ecran', 'd11_mar_bonjour', 'd11_mar_photo',
  'd11_mar_chat', 'keyboard_cat', 'd11_mar_futur', 'd11_dictee', 'd11_noe_court', 'd11_cam_court',
  'd11_photo', 'n_d11_matin', 'd11_noe_lait', 'd11_cam_lait', 'd11_noe_faim', 'd11_cam_cafe', 'd11_cafe'
];

const P2_GROUPS = [
  { page: 'day10-rooftop.html', shots: ['n_d11_phone', 'pot_wiggle', 'd11_focus_photo', 'd11_noe_photo', 'd11_noe_pres', 'd11_noe_souriez', 'd11_cam_souriez', 'd11_souriez_vous', 'd11_cam_souriez2', 'n_d11_clic', 'd11_noe_encore'] },
  { page: 'day10-stairwell.html', shots: ['n_d11_escalier', 'd11_noe_montre', 'd11_lef_photo', 'n_d11_regard', 'n_d11_souvenir', 'regard_close_option'] },
  { page: 'day10-phase2e.html', shots: ['n_d11_queue', 'd11_cam_queue', 'd11_noe_pasmoi', 'done'] }
];

const EVIDENCE = [
  { id: 'd11_photo', shot: 'd11_photo', page: 'day10-phase1.html', x: 95, y: 165, w: 220, h: 145 },
  { id: 'keyboard_cat', shot: 'keyboard_cat', page: 'day10-phase1.html', x: 0, y: 130, w: 390, h: 140 },
  { id: 'n_d11_queue_floor', shot: 'n_d11_queue', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { id: 'd11_cam_queue_floor', shot: 'd11_cam_queue', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { id: 'd11_noe_pasmoi_floor', shot: 'd11_noe_pasmoi', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { id: 'done_floor', shot: 'done', page: 'day10-phase2e.html', x: 0, y: 355, w: 390, h: 210 },
  { id: 'd11_noe_encore_tail', shot: 'd11_noe_encore', page: 'day10-rooftop.html', x: 15, y: 25, w: 360, h: 160 },
  { id: 'n_d11_regard', shot: 'n_d11_regard', page: 'day10-stairwell.html', x: 0, y: 110, w: 390, h: 480 },
  { id: 'n_d11_souvenir', shot: 'n_d11_souvenir', page: 'day10-stairwell.html', x: 0, y: 100, w: 390, h: 500 }
];

const SHOT_TIME_OVERRIDE = {
  n_d11_souvenir: (sh) => sh.t0 + (sh.t1 - sh.t0) * 0.85
};

const SCENE_BAND_TOP = 127;
const SCENE_BAND_H = 464;

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** CSS-pixel crop; screenshot must be scale:'css' (no DPR multiply). */
async function cropPngCss(src, x, y, w, h, dest) {
  const meta = await sharp(src).metadata();
  const W = meta.width;
  const H = meta.height;
  const left = Math.max(0, Math.min(W - 1, Math.round(x)));
  const top = Math.max(0, Math.min(H - 1, Math.round(y)));
  const width = Math.max(1, Math.min(W - left, Math.round(w)));
  const height = Math.max(1, Math.min(H - top, Math.round(h)));
  if (width !== Math.round(w) || height !== Math.round(h)) {
    throw new Error(`crop size mismatch for ${dest}: got ${width}x${height}, expected ${w}x${h} (src ${W}x${H} @${left},${top})`);
  }
  await sharp(src).extract({ left, top, width, height }).png().toFile(dest);
  return { left, top, width, height };
}

async function countChangedPxFiles(aPath, bPath) {
  const a = await sharp(aPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const b = await sharp(bPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return null;
  let n = 0;
  const stride = 4;
  for (let i = 0; i < a.data.length; i += stride) {
    if (a.data[i] !== b.data[i]
      || a.data[i + 1] !== b.data[i + 1]
      || a.data[i + 2] !== b.data[i + 2]
      || a.data[i + 3] !== b.data[i + 3]) n++;
  }
  return n;
}

/** Shoe-row detector (feet.py parity) on full frame RGB. */
async function measureShoeRowsPng(framePath) {
  const { data, info } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      L[y * w + x] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
  }
  const runs = [];
  for (let y = 330; y < Math.min(588, h - 1); y++) {
    const row = y * w;
    const below = (y + 1) * w;
    let x = 0;
    while (x < w) {
      const lum = L[row + x];
      const lumBelow = L[below + x];
      const edgeStable = x >= 3
        && Math.abs(data[(row + x) * 4] - data[(row + x - 1) * 4])
        + Math.abs(data[(row + x) * 4 + 1] - data[(row + x - 1) * 4 + 1])
        + Math.abs(data[(row + x) * 4 + 2] - data[(row + x - 1) * 4 + 2]) < 10
        && Math.abs(data[(row + x) * 4] - data[(row + x - 3) * 4])
        + Math.abs(data[(row + x) * 4 + 1] - data[(row + x - 3) * 4 + 1])
        + Math.abs(data[(row + x) * 4 + 2] - data[(row + x - 3) * 4 + 2]) < 10;
      const m = lum < 75 && lumBelow > lum + 35 && edgeStable;
      if (m) {
        const s = x;
        while (x < w) {
          const l2 = L[row + x];
          const lb2 = L[below + x];
          if (l2 >= 75 || lb2 <= l2 + 35) break;
          x++;
        }
        if (x - s >= 5 && x - s <= 30) runs.push({ y, s, e: x });
      } else {
        x++;
      }
    }
  }
  const ys = [...new Set(runs.map((r) => r.y))].sort((a, b) => a - b);
  const primaryY = ys.length ? ys[ys.length - 1] : null;
  const feetPct = primaryY != null
    ? Math.round(((primaryY + 1 - SCENE_BAND_TOP) / SCENE_BAND_H) * 1000) / 10
    : null;
  return { feetPct, shoeRowY: primaryY, shoeRuns: runs.slice(0, 12) };
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
  const fix1Raw = JSON.parse(await fs.readFile(fix1EvidencePath, 'utf8'));
  const fix1Hashes = new Map(fix1Raw.frames.map((f) => [f.shot, f.sha256]));

  const cropDir = path.join(outRoot, 'crops');
  await fs.mkdir(cropDir, { recursive: true });
  await fs.mkdir(path.join(outRoot, 'frames'), { recursive: true });

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const evidence = [];
  const feetReport = [];
  const frameHashes = [];
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
    const cfg = await page.evaluate(() => window.__scenePlayer.getConfig());
    const sh = cfg.shots.find((s) => s.id === id);
    const t = SHOT_TIME_OVERRIDE[id] ? SHOT_TIME_OVERRIDE[id](sh) : (sh.t0 + sh.t1) / 2;
    await page.evaluate(({ sid, time }) => {
      window.__scenePlayer.setT(time);
    }, { sid: id, time: t });
    await page.waitForTimeout(300);
    const out = path.join(outRoot, 'frames', `fix2_${id}.png`);
    await page.screenshot({ path: out, scale: 'css' });
    shotPaths.set(id, out);
    const hash = await sha256File(out);
    frameHashes.push({ shot: id, sha256: hash });

    const expected = fix1Hashes.get(id);
    if (!FIX2_CHANGED_SHOTS.has(id)) {
      if (!expected) throw new Error(`fix1 lock missing hash for pass shot ${id}`);
      if (hash !== expected) {
        throw new Error(`pass shot ${id} must stay hash-identical to fix1 (got ${hash.slice(0, 12)}… expected ${expected.slice(0, 12)}…)`);
      }
    }

    const shoe = await measureShoeRowsPng(out);
    feetReport.push({
      shot: id,
      actor: '_shoe_rows',
      feetPct: shoe.feetPct,
      shoeRowY: shoe.shoeRowY
    });
    const probes = await page.evaluate(() => window.__scenePlayer.getFurnitureLegProbes());
    for (const p of probes) {
      const feetPct = p.y != null
        ? Math.round(((p.y + 1 - SCENE_BAND_TOP) / SCENE_BAND_H) * 1000) / 10
        : null;
      feetReport.push({ shot: id, actor: p.id, feetPct, probeY: p.y, floorY: p.floorY });
    }
  }

  const allShots = [...P1_SHOTS];
  for (const g of P2_GROUPS) for (const id of g.shots) allShots.push(id);

  try {
    for (const id of P1_SHOTS) await captureShot(id, 'day10-phase1.html');
    for (const g of P2_GROUPS) {
      for (const id of g.shots) await captureShot(id, g.page);
    }

    for (const ev of EVIDENCE) {
      const src = shotPaths.get(ev.shot);
      if (!src) continue;
      const cropOut = path.join(cropDir, `${ev.id}.png`);
      const rect = await cropPngCss(src, ev.x, ev.y, ev.w, ev.h, cropOut);
      const cropSha = await sha256File(cropOut);
      let baselineSha = null;
      let changedPx = null;
      for (const baseDir of [baselineP1, baselineP2]) {
        for (const prefix of ['p1R12', 'p1R15', 'p2r3']) {
          const baseFull = path.join(baseDir, `${prefix}_${ev.shot}.png`);
          try {
            const baseTmp = path.join(cropDir, `_base_${ev.id}.png`);
            await cropPngCss(baseFull, ev.x, ev.y, ev.w, ev.h, baseTmp);
            baselineSha = await sha256File(baseTmp);
            changedPx = await countChangedPxFiles(cropOut, baseTmp);
            break;
          } catch { /* */ }
        }
        if (baselineSha) break;
      }
      evidence.push({
        shot: ev.shot,
        id: ev.id,
        rect: { x: ev.x, y: ev.y, w: ev.w, h: ev.h, ...rect },
        crop_sha: cropSha,
        baseline_sha: baselineSha,
        changed_px: changedPx
      });
    }

    const evidenceJson = {
      generatedAt: new Date().toISOString(),
      fix1Lock: fix1EvidencePath,
      frames: frameHashes,
      feet: feetReport,
      crops: evidence
    };
    await fs.writeFile(path.join(outRoot, 'evidence.json'), `${JSON.stringify(evidenceJson, null, 2)}\n`);

    const notes = `# Day 10 fix2 capture

Branch \`astra/day10-scenes\`. Output: \`evidence.json\` (source of truth). Pass shots locked to fix1 sha256.

## Feet % (shoe rows, band y${SCENE_BAND_TOP}–${SCENE_BAND_TOP + SCENE_BAND_H - 1}, formula (y+1−${SCENE_BAND_TOP})/${SCENE_BAND_H})
${feetReport.map((r) => `- ${r.shot} / ${r.actor}: ${r.feetPct != null ? `${r.feetPct}%` : 'n/a'}${r.shoeRowY != null ? ` (y=${r.shoeRowY})` : ''}${r.probeY != null ? ` probeY=${r.probeY}` : ''}`).join('\n')}

## Evidence crops
${evidence.map((e) => `- ${e.id}: rect=${e.rect.width}x${e.rect.height} crop_sha=${e.crop_sha.slice(0, 16)}… changed_px=${e.changed_px}`).join('\n')}
`;
    await fs.writeFile(path.join(outRoot, 'NOTES.md'), notes);

    const tiles = [];
    for (const c of frameHashes.slice(0, 16)) {
      const buf = await sharp(shotPaths.get(c.shot)).resize(195, 422).png().toBuffer();
      tiles.push(buf);
    }
    const cols = 4;
    const rows = Math.ceil(tiles.length / cols);
    const comp = [];
    for (let i = 0; i < tiles.length; i++) {
      comp.push({ input: tiles[i], left: (i % cols) * 195, top: Math.floor(i / cols) * 422 });
    }
    await sharp({ create: { width: cols * 195, height: rows * 422, channels: 3, background: '#2a2830' } })
      .composite(comp).png().toFile(path.join(outRoot, 'delta_montage.png'));

    console.log(`fix2 capture OK: ${allShots.length} frames, ${FIX2_CHANGED_SHOTS.size} intentional deltas → ${outRoot}`);
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
