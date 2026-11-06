#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const outDirs = [
  process.argv[2] || '/opt/cursor/artifacts/day10_packb9',
  '/cursor/stores/self/day10_packb9'
];
const view = { width: 390, height: 844 };
const dpr = 3;

const SHOTS = [
  { key: 'lineup', file: 'lineup', page: 'lineup', shot: 'lineup' },
  { key: 'd11_cam_lait', file: 'd11_cam_lait', page: 'kitchen', shot: 'd11_cam_lait' },
  { key: 'd11_mar_bonjour', file: 'd11_mar_bonjour', page: 'kitchen', shot: 'd11_mar_bonjour' },
  { key: 'd11_mar_chat', file: 'd11_mar_chat', page: 'kitchen', shot: 'd11_mar_chat' },
  { key: 'd11_mar_photo', file: 'd11_mar_photo', page: 'kitchen', shot: 'd11_mar_photo' },
  { key: 'keyboard_cat', file: 'keyboard_cat', page: 'kitchen', shot: 'keyboard_cat' },
  { key: 'n_d11_matin2', file: 'n_d11_matin2', page: 'kitchen', shot: 'n_d11_matin2' },
  { key: 'd11_noe_lait', file: 'd11_noe_lait', page: 'kitchen', shot: 'd11_noe_lait' },
  { key: 'd11_dictee', file: 'd11_dictee', page: 'kitchen', shot: 'd11_dictee' },
  { key: 'mar_chat_evening', file: 'mar_chat_evening', page: 'kitchen', shot: 'd11_mar_chat', evening: true }
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
  d11_dictee: 3,
  mar_chat_evening: 2
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

function validateShot(shotKey, m, px) {
  const fails = [];
  const exp = EXPECTED_CAST[shotKey];
  if (px?.pixelFailures?.length) fails.push(...px.pixelFailures);
  if (exp != null) {
    const vis = (px?.actorBboxesCss || []).filter((a) => a.visible).length;
    if (vis < exp) fails.push(`visible actors ${vis} < ${exp}`);
    for (const a of px?.actorBboxesCss || []) {
      if (!a.visible || !a.bboxCss) continue;
      const b = a.bboxCss;
      if (b.w >= 380 && b.h >= 450) fails.push(`${a.name}: mask bbox covers full band`);
    }
  }
  const gateWallGap = m.cameraPreset === 'close' || shotKey === 'keyboard_cat';
  if (gateWallGap && m.wallGapAboveContentStagePx > 14) {
    fails.push(`wall gap ${m.wallGapAboveContentStagePx}px > 12`);
  }
  const needsBubble = shotKey !== 'lineup' && !shotKey.startsWith('n_') && shotKey !== 'keyboard_cat'
    && shotKey !== 'd11_dictee';
  if (needsBubble && m.bubbleInTopBand === false) fails.push('bubble not in top band');
  if (m.tailLengthPx != null && (m.tailLengthPx < 4 || m.tailLengthPx > 18)) {
    fails.push(`tail length ${m.tailLengthPx}px`);
  }
  if (m.stageBandCoveragePct < 99.5) fails.push(`stage coverage ${m.stageBandCoveragePct}%`);
  return fails;
}

async function capturePair(page, outDir, baseName) {
  const fullPath = path.join(outDir, `${baseName}.png`);
  const smallPath = path.join(outDir, `${baseName.replace(/^pb9_/, 'pb9s_')}.png`);
  await page.screenshot({ path: fullPath, fullPage: false });
  await sharp(fullPath).resize(390, 844).toFile(smallPath);
  return fullPath;
}

async function prepareKitchenPage(page, base) {
  await page.goto(`${base}/day10-phase1.html?pack=b`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
  await page.click('.scene-player-overlay', { timeout: 5000 });
}

(async () => {
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const errors = [];
  const metrics = [];
  const contactPaths = [];
  const shotNotes = [];

  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

  const allFails = [];
  try {
    for (const spec of SHOTS) {
      if (spec.page === 'lineup') {
        await page.goto(`${server.base}/scenes/pack-b-lineup.html?pack=b`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
        await page.click('.scene-player-overlay');
      } else {
        await prepareKitchenPage(page, server.base);
      }
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), spec.shot);
      if (spec.evening) {
        await page.evaluate(() => {
          const p = window.__scenePlayer;
          const cfg = p.getConfig();
          const sh = cfg.shots.find((s) => s.id === 'd11_mar_chat');
          if (sh) sh.lightVariant = 'evening';
          p.setShot('d11_mar_chat');
        });
      }
      await page.waitForTimeout(450);
      const px = await page.evaluate(() => window.__scenePlayer.capturePixelMetrics());
      const m = await page.evaluate(() => window.__scenePlayer.getFrameMetrics());
      const base = `pb9_${spec.file}`;
      const entry = { file: `${base}.png`, shotKey: spec.key, ...m, pixel: px };
      metrics.push(entry);
      allFails.push(...validateShot(spec.key, m, px).map((f) => `${spec.key}: ${f}`));
      const fullPath = await capturePair(page, outDir, base);
      contactPaths.push(fullPath);
      const vis = (px.actorBboxesCss || []).filter((a) => a.visible).map((a) => a.name);
      shotNotes.push(`- **${spec.file}**: cast [${vis.join(', ')}]; floor ${(px.floorBandFracMeasured ?? 0).toFixed(3)} (target ${(px.floorBandFracTarget ?? 0).toFixed(3)}).`);
    }

    const cellW = 1170;
    const cellH = 2532;
    const grid = await sharp({
      create: {
        width: cellW * 5,
        height: cellH * 2,
        channels: 3,
        background: '#2a2830'
      }
    })
      .composite(
        contactPaths.map((input, i) => ({
          input,
          left: (i % 5) * cellW,
          top: Math.floor(i / 5) * cellH
        }))
      )
      .png()
      .toBuffer();
    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'pb9_contact.png'), grid);
    }

    const notes = [
      '# Pack B pb9 — floor-aligned band layout + pixel self-check',
      '',
      'Fixes pb7 vertical regression: kitchen `activeOy` uses floor-band alignment (CSS px end-to-end), full preset crop heights restored, stage element drives canvas size.',
      '',
      '## Contact sheet (5×2)',
      '',
      ...shotNotes,
      '',
      '## Pixel validation',
      'Actor mask bboxes on scene canvas; floor line from center column; ±3% vs Pixel Studio wide reference floor fraction.',
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'pb9_metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
      await fs.writeFile(path.join(dir, 'pb9_NOTES.md'), notes);
      if (dir !== outDir) {
        for (const spec of SHOTS) {
          const base = `pb9_${spec.file}`;
          await fs.copyFile(path.join(outDir, `${base}.png`), path.join(dir, `${base}.png`));
          await fs.copyFile(path.join(outDir, base.replace(/^pb9_/, 'pb9s_') + '.png'), path.join(dir, base.replace(/^pb9_/, 'pb9s_') + '.png'));
        }
      }
    }

    if (errors.length) throw new Error(`Console errors: ${errors.length}\n${errors.join('\n')}`);
    if (allFails.length) throw new Error(`Validation failed:\n${allFails.join('\n')}`);
    console.log('Wrote', outDirs.join(', '));
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
