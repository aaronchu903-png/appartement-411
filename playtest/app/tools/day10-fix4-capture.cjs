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

const outRoot = process.argv[2] || '/cursor/stores/self/day10_fix4';
const baselineEvidencePath = process.argv[3] || '/cursor/stores/self/day10_fix3/evidence.json';
const baselineP1 = '/cursor/stores/self/day10_P1R';
const baselineP2 = '/cursor/stores/self/day10_P2';

const FIX4_CHANGED_SHOTS = new Set([
  'd11_cafe', 'd11_cam_cafe', 'n_d11_matin2', 'stash_back', 'd11_cam_queue', 'd11_noe_pasmoi', 'd11_lef_photo',
  'n_d11_escalier', 'n_d11_phone', 'n_d11_regard', 'regard_close_option'
]);

const PHONE_BUBBLE_SHOTS = new Set(['d11_cam_queue', 'd11_noe_pasmoi']);

const LOOK_PHONE_HOLD_MS = 1200;
const LOOK_PHONE_F0_LINE = 'app/scenes/scene-player.js:2684 (resolveLookPhoneAsset, local < 1.2s → f0)';
const LOOK_PHONE_GLOW_LINE = 'app/scenes/scene-player.js:2691 (drawLefevrePhoneGlowOverlay, after cast grade, evening/night)';

const P1_SHOTS = [
  'n_d11_matin2', 'stash_back', 'd11_cam_lit', 'n_d11_ecran', 'd11_mar_bonjour', 'd11_mar_photo',
  'd11_mar_chat', 'keyboard_cat', 'd11_mar_futur', 'd11_dictee', 'd11_noe_court', 'd11_cam_court',
  'd11_photo', 'n_d11_matin', 'd11_noe_lait', 'd11_cam_lait', 'd11_noe_faim', 'd11_cam_cafe', 'd11_cafe'
];

const P2_GROUPS = [
  { page: 'day10-rooftop.html', shots: ['n_d11_phone', 'pot_wiggle', 'd11_focus_photo', 'd11_noe_photo', 'd11_noe_pres', 'd11_noe_souriez', 'd11_cam_souriez', 'd11_souriez_vous', 'd11_cam_souriez2', 'n_d11_clic', 'd11_noe_encore'] },
  { page: 'day10-stairwell.html', shots: ['n_d11_escalier', 'd11_noe_montre', 'd11_lef_photo', 'n_d11_souvenir', 'n_d11_regard', 'regard_close_option'] },
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

const EXTRA_FRAMES = [
  { id: 'n_d11_regard_f0_600ms', shot: 'n_d11_regard', page: 'day10-stairwell.html', tLocalSec: 0.6 },
  { id: 'n_d11_regard_f1_1800ms', shot: 'n_d11_regard', page: 'day10-stairwell.html', tLocalSec: 1.8 }
];

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
  const baselineRaw = JSON.parse(await fs.readFile(baselineEvidencePath, 'utf8'));
  const baselineHashes = new Map(baselineRaw.frames.map((f) => [f.shot, f.sha256]));

  const cropDir = path.join(outRoot, 'crops');
  await fs.mkdir(cropDir, { recursive: true });
  await fs.mkdir(path.join(outRoot, 'frames'), { recursive: true });

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const evidence = [];
  const feetReport = [];
  const phoneGates = [];
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

  async function captureShot(id, pageName, timeOverride = null) {
    if (id === 'n_d11_souvenir' || id === 'd11_lef_photo' || id === 'd11_cam_queue') activePage = null;
    await ensurePage(pageName);
    const cfg = await page.evaluate(() => window.__scenePlayer.getConfig());
    const sh = cfg.shots.find((s) => s.id === id);
    const t = timeOverride != null
      ? timeOverride
      : (SHOT_TIME_OVERRIDE[id] ? SHOT_TIME_OVERRIDE[id](sh) : (sh.t0 + sh.t1) / 2);
    await page.evaluate(({ time }) => {
      window.__scenePlayer.setT(time);
    }, { time: t });
    await page.waitForTimeout(PHONE_BUBBLE_SHOTS.has(id) ? 550 : 300);
    const frameKey = timeOverride != null ? `${id}@${t}` : id;
    const out = path.join(outRoot, 'frames', `fix4_${id}${timeOverride != null ? `_t${t}` : ''}.png`);
    await page.screenshot({ path: out, scale: 'css' });
    shotPaths.set(frameKey, out);
    const hash = await sha256File(out);
    if (timeOverride == null) {
      frameHashes.push({ shot: id, sha256: hash });
      const expected = baselineHashes.get(id);
      if (!FIX4_CHANGED_SHOTS.has(id) && expected && hash !== expected) {
        console.warn(`WARN ${id}: hash drift from fix3 baseline (got ${hash.slice(0, 12)}… expected ${expected.slice(0, 12)}…)`);
      }
      const shoe = await measureShoeRowsPng(out);
      feetReport.push({
        shot: id,
        actor: '_shoe_rows',
        feetPct: shoe.feetPct,
        shoeRowY: shoe.shoeRowY,
        bandTop: SCENE_BAND_TOP,
        bandH: SCENE_BAND_H
      });
      if (PHONE_BUBBLE_SHOTS.has(id)) {
        let gate = await page.evaluate(() => window.__scenePlayer.getPhoneBubbleGate());
        for (let attempt = 0; attempt < 3 && !gate.skipped && !gate.ok; attempt++) {
          await page.waitForTimeout(250);
          gate = await page.evaluate(() => window.__scenePlayer.getPhoneBubbleGate());
        }
        phoneGates.push({ shot: id, ...gate });
        if (!gate.skipped && !gate.ok) {
          console.warn(`WARN phone bubble gate ${id}: intersects=${gate.intersects} speakerHeadVisible=${gate.speakerHeadVisible}`);
        }
      }
    } else {
      frameHashes.push({ shot: frameKey, sha256: hash, parentShot: id, t });
    }
  }

  const allShots = [...P1_SHOTS];
  for (const g of P2_GROUPS) for (const id of g.shots) allShots.push(id);

  try {
    for (const id of P1_SHOTS) await captureShot(id, 'day10-phase1.html');
    for (const g of P2_GROUPS) {
      for (const id of g.shots) await captureShot(id, g.page);
    }
    for (const extra of EXTRA_FRAMES) {
      await ensurePage(extra.page);
      const t = await page.evaluate(({ shotId, local }) => {
        const sh = window.__scenePlayer.getConfig().shots.find((s) => s.id === shotId);
        return sh.t0 + local;
      }, { shotId: extra.shot, local: extra.tLocalSec });
      await captureShot(extra.shot, extra.page, t);
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
      branch: 'astra/day10-scenes',
      baselineLock: baselineEvidencePath,
      lookPhoneHoldMs: LOOK_PHONE_HOLD_MS,
      lookPhoneHoldCode: LOOK_PHONE_F0_LINE,
      phoneGlowCode: LOOK_PHONE_GLOW_LINE,
      frames: frameHashes,
      feet: feetReport,
      phoneBubbleGates: phoneGates,
      crops: evidence
    };
    await fs.writeFile(path.join(outRoot, 'evidence.json'), `${JSON.stringify(evidenceJson, null, 2)}\n`);

    const feetLines = feetReport.map((r) => `- ${r.shot}: ${r.feetPct != null ? `${r.feetPct}%` : 'n/a'} (shoeRowY=${r.shoeRowY ?? 'n/a'})`);
    const notes = `# Day 10 fix4 capture

Branch \`astra/day10-scenes\`. Output: \`evidence.json\` (source of truth). Pass shots locked to fix2 sha256.

## look_phone hold (${LOOK_PHONE_HOLD_MS} ms) and phone glow
- f0→f1 hold: ${LOOK_PHONE_F0_LINE}
- glow overlay: ${LOOK_PHONE_GLOW_LINE}
- Extra frames: \`n_d11_regard_f0_600ms\` (t+0.6s), \`n_d11_regard_f1_1800ms\` (t+1.8s)

## Feet % (from evidence.json feet[], shoe rows only)
${feetLines.join('\n')}

## Phone bubble gates
${phoneGates.map((g) => `- ${g.shot}: ok=${g.ok} intersects=${g.intersects} speakerHeadVisible=${g.speakerHeadVisible}`).join('\n')}

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

    console.log(`fix4 capture OK: ${allShots.length} frames + ${EXTRA_FRAMES.length} regard holds, ${FIX4_CHANGED_SHOTS.size} intentional deltas → ${outRoot}`);
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
