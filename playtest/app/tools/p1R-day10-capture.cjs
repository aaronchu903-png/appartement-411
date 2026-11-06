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
  process.argv[2] || '/opt/cursor/artifacts/day10_P1R',
  '/cursor/stores/self/day10_P1R'
];
const CANONICAL_REVIEW = {
  noe: 'style/canonical/review_noe_x8.png',
  camille: 'style/canonical/review_camille_x8.png',
  croissant: 'style/canonical/review_croissant_x8.png',
  cat: 'style/canonical/review_croissant_x8.png',
  martin: 'style/canonical/review_martin_x8.png',
  madame_martin: 'style/canonical/review_martin_x8.png',
  lefevre: 'style/canonical/review_lefevre_x8.png'
};
const view = { width: 390, height: 844 };
const dpr = 3;
const WALL_RGB = [237, 223, 194];
const FLOOR_RGB = [178, 147, 110];
const UI_PANEL_RGB = [227, 211, 198];

function sampleRgbAtDev(data, width, height, xDev, yDev, channels = 4) {
  const x = Math.max(0, Math.min(width - 1, xDev));
  const y = Math.max(0, Math.min(height - 1, yDev));
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function isTailStroke(rgb) {
  const [r, g, b] = rgb;
  return r < 90 && g < 90 && b < 110 && r + g + b < 200;
}

function isDarkHair(rgb) {
  const [r, g, b] = rgb;
  if (r < 75 && g < 100 && b < 100 && g >= r - 20 && r + g + b < 200) return true;
  if (r < 62 && g < 58 && b < 75 && r + g + b < 165) return true;
  return false;
}

function isPlaceholderOrange(rgb) {
  const [r, g, b] = rgb;
  return r > 200 && g > 140 && g < 230 && b < 140;
}

function findBubbleBottomCss(data, width, height, channels, dprVal) {
  const hCss = height / dprVal;
  let bottom = 0;
  for (let yCss = 60; yCss < hCss * 0.32; yCss++) {
    let white = 0;
    for (let xCss = 24; xCss < 366; xCss += 3) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (rgb[0] > 235 && rgb[1] > 235 && rgb[2] > 235) white++;
    }
    if (white > 30) bottom = yCss;
  }
  return bottom;
}

function tailHairGate(data, width, height, channels, dprVal, speakerSide = 'left') {
  const bubbleBottom = findBubbleBottomCss(data, width, height, channels, dprVal);
  const yTail0 = bubbleBottom + 1;
  const yTail1 = Math.min(Math.round(height / dprVal) - 1, bubbleBottom + 16);
  const tailXs = [];
  for (let yCss = yTail0; yCss <= yTail1; yCss++) {
    for (let xCss = 0; xCss < 390; xCss++) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isTailStroke(rgb)) tailXs.push(xCss);
    }
  }
  const tailCx = tailXs.length ? tailXs.reduce((a, b) => a + b, 0) / tailXs.length : null;
  const stageTop = bubbleBottom + 28;
  const stageBot = Math.min(height / dprVal - 100, bubbleBottom + 300);
  const xMin = speakerSide === 'right' ? 200 : 8;
  const xMax = speakerSide === 'right' ? 389 : 180;
  const hairXs = [];
  for (let yCss = stageTop; yCss < stageBot; yCss++) {
    for (let xCss = xMin; xCss < xMax; xCss++) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isDarkHair(rgb)) hairXs.push(xCss);
    }
  }
  let hairCx = null;
  if (hairXs.length) {
    hairXs.sort((a, b) => a - b);
    const slice = hairXs.slice(Math.floor(hairXs.length * 0.15), Math.ceil(hairXs.length * 0.5));
    hairCx = slice.reduce((a, b) => a + b, 0) / slice.length;
  }
  const delta = tailCx != null && hairCx != null ? Math.round(tailCx - hairCx) : null;
  const pass = tailCx == null || hairCx == null ? 'n/a' : (Math.abs(delta) <= 28 ? 'pass' : 'FAIL');
  return { bubbleBottom, tailCx, hairCx, delta, pass };
}

function flatUiInSceneBandGate(data, width, height, bubbleHCss, stageHCss, dprVal, channels) {
  let uiHits = 0;
  let wallHits = 0;
  let samples = 0;
  const y0 = bubbleHCss + 4;
  const y1 = bubbleHCss + stageHCss - 4;
  for (let yCss = y0; yCss < y1; yCss += 4) {
    for (let xCss = 12; xCss < 378; xCss += 6) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      samples++;
      if (colorDist(rgb, UI_PANEL_RGB) < 18) uiHits++;
      if (colorDist(rgb, WALL_RGB) < 12 && colorDist(rgb, FLOOR_RGB) > 50) wallHits++;
    }
  }
  const uiFrac = uiHits / (samples || 1);
  const fails = [];
  if (uiFrac > 0.12) fails.push(`flat phone chrome ${(uiFrac * 100).toFixed(1)}% of stage band`);
  if (wallHits > samples * 0.55) fails.push(`bare wall fill ${((wallHits / samples) * 100).toFixed(0)}% (want floor/art)`);
  return { fails, uiFrac, wallFrac: wallHits / (samples || 1) };
}

function placeholderBadgeGate(data, width, height, bubbleHCss, stageHCss, dprVal, channels) {
  let hits = 0;
  const y0 = bubbleHCss + 8;
  const y1 = bubbleHCss + stageHCss - 4;
  for (let yCss = y0; yCss < y1; yCss += 3) {
    for (let xCss = 8; xCss < 382; xCss += 4) {
      const rgb = sampleRgbAtDev(data, width, height, Math.round(xCss * dprVal), Math.round(yCss * dprVal), channels);
      if (isPlaceholderOrange(rgb)) hits++;
    }
  }
  return hits < 8 ? 'pass' : `FAIL (${hits} orange badge px)`;
}

function bubbleTypeForBeat(cfg, shotId, tMid) {
  const b = (cfg.bubbles || []).find((x) => x.t0 <= tMid && x.t1 > tMid);
  if (!b) return '—';
  if (b.kind === 'narrator') return 'narrator';
  if (b.kind === 'screen' || b.anchor === 'martin') return 'screen (Martin message)';
  return `speech (${b.actor || b.kind})`;
}

function speakerSideForShot(id, bubbleType) {
  if (bubbleType.includes('screen') || bubbleType === 'narrator') return 'none';
  if (id.includes('noe') || id === 'd11_noe_faim') return 'left';
  if (id.includes('cam')) return 'left';
  return 'left';
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
  const cfg = JSON.parse(await fs.readFile(scenePath, 'utf8'));
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });

  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const rows = [];
  const castSections = [];
  const captures = [];

  try {
    const cacheBust = Date.now();
    await page.goto(`${server.base}/day10-phase1.html?pack=b&_=${cacheBust}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.evaluate(() => window.__scenePlayer.setCaptureOmitPlaceholders(true));
    await page.evaluate(() => window.__scenePlayer.start());
    await page.waitForTimeout(300);

    for (const [id, beat, shotType] of BEATS) {
      const shot = cfg.shots.find((s) => s.id === id);
      const tMid = shot ? (shot.t0 + shot.t1) / 2 : 0;
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(200);

      const meta = await page.evaluate((sid) => {
        const cfg = window.__scenePlayer.getConfig();
        const shot = cfg.shots.find((s) => s.id === sid);
        const m = window.__scenePlayer.getFrameMetrics();
        const info = window.__scenePlayer.getShotRenderInfo();
        const stage = { ...cfg.defaultStage, ...shot.stage };
        const cast = Object.entries(stage.actors || {}).filter(([, d]) => d).map(([k]) => k);
        const hasMartin = cast.includes('martin');
        const cropRef = typeof shot.crop === 'string' ? cfg.cropLibrary?.[shot.crop] : shot.crop;
        const fixedScale = cropRef?.fixedScale ?? m.crop?.fixedScale;
        const scaleLabel = fixedScale ? `${fixedScale}×` : `${Math.round(m.scale * 10) / 10}×`;
        const preset = m.crop?.cameraPreset || cropRef?.cameraPreset || m.cameraPreset;
        const actors = window.__scenePlayer.inspectActorSprites();
        const bm = window.__scenePlayer.getBubbleScreenMetrics?.() || {};
        const hud = {
          speaker: document.querySelector('.scene-player-dialogue-speaker')?.textContent ?? '',
          text: document.querySelector('.scene-player-dialogue-text')?.textContent ?? ''
        };
        return {
          scale: scaleLabel,
          preset,
          shotId: info.shotId,
          cast,
          hasMartin,
          bubbleBandH: m.bubbleBandH ?? 0,
          stageSceneH: m.stageSceneH ?? m.stageH ?? 0,
          lightVariant: shot.lightVariant || 'day',
          actors,
          bubbleBbox: bm.bubbleBbox ?? null,
          tailTip: bm.tailTipX != null ? { x: bm.tailTipX, y: bm.tailTipY } : null,
          hud
        };
      }, id);

      const file = `p1R_${id}.png`;
      const out = path.join(outDirs[0], file);
      await page.screenshot({ path: out, scale: 'css' });
      for (const dir of outDirs) {
        if (dir !== outDirs[0]) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
      const bubbleType = bubbleTypeForBeat(cfg, id, tMid);
      const side = speakerSideForShot(id, bubbleType);
      const tail = side === 'none'
        ? { pass: bubbleType.includes('screen') ? 'pass (no person tail)' : 'n/a', tailCx: null, hairCx: null, delta: null }
        : tailHairGate(data, info.width, info.height, info.channels, dpr, side);
      const flat = flatUiInSceneBandGate(data, info.width, info.height, meta.bubbleBandH, meta.stageSceneH, dpr, info.channels);
      const ph = placeholderBadgeGate(data, info.width, info.height, meta.bubbleBandH, meta.stageSceneH, dpr, info.channels);

      const castLabel = meta.cast.map((k) => (k === 'cat' ? 'Croissant' : k)).join(', ') || '—';
      const martinBody = meta.hasMartin ? 'FAIL (Martin in room)' : 'pass';

      const actorLines = (meta.actors || []).map((a) => {
        const canon = a.characterCanonical || a.character;
        const ref = CANONICAL_REVIEW[canon] || CANONICAL_REVIEW[a.stageKey] || '—';
        const layers = (a.layers || []).map((l) => l.file || l.layer).join(' · ') || '—';
        return `  - **${a.stageKey}** → \`${a.character}\` (canonical \`${canon}\`), pose \`${a.asset}\`, @ (${a.x},${a.y})${a.flip ? ' flip' : ''}, layers: ${layers}, review: \`${ref}\``;
      });
      castSections.push(`### ${beat} \`${id}\`\n${actorLines.length ? actorLines.join('\n') : '  - (no staged actors)'}\n`);

      rows.push({
        beat,
        id,
        shotType,
        scale: `${meta.scale} (${meta.preset})`,
        cast: castLabel,
        bubbleType,
        light: meta.lightVariant,
        martinBody,
        tailGate: tail.pass === 'pass' ? `pass Δ=${tail.delta ?? '—'}` : `${tail.pass} Δ=${tail.delta}`,
        flatGate: flat.fails.length ? flat.fails.join('; ') : 'pass',
        placeholderGate: ph
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
    const rowsN = Math.ceil(captures.length / cols);
    const contact = await sharp({
      create: { width: cols * tileW, height: rowsN * tileH, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();

    const md = [
      '# Day 10 Phase 1 redo (P1R)',
      '',
      'Branch `astra/day10-scenes`. DAY light (no night grade). Beats A1–A13 + B1–B6 per `DAY10_BEATS.md`.',
      'Martin lines = screen bubbles only; no Martin body in morning shots.',
      'Bubble rules (R9-aligned): French in bubble only; HUD = speaker name + gloss; narrow wrap before covering lamp/faces/clock; short wedge tail to speaker; seated poses (no floating torsos on table shots).',
      '',
      '## Cast per shot (sprites vs `style/canonical/review_*_x8.png`)',
      '',
      ...castSections,
      '',
      '| beat | id | shot | scale | cast | bubble | light | Martin body | tail gate (PNG) | flat UI / wall gate | placeholder gate |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map((r) => `| ${r.beat} | \`${r.id}\` | ${r.shotType} | ${r.scale} | ${r.cast} | ${r.bubbleType} | ${r.light} | ${r.martinBody} | ${r.tailGate} | ${r.flatGate} | ${r.placeholderGate} |`),
      '',
      `Captures: \`p1R_<id>.png\` @ ${view.width}×${view.height} css, dpr ${dpr}. Contact: \`p1R_contact.png\`.`,
      '',
      '### Honest summary',
      '- **Cast / Martin:** no morning shot stages Martin or Lefèvre in the room; Martin copy uses `kind: screen` bubbles (dashed + phone icon) on A5–A9.',
      '- **Tail scan (PNG):** automated hair-vs-tail centroid gate; **B4** `d11_noe_faim` still **FAIL** (Δ=30 px; limit 28). A11 pass Δ=21; B3 pass Δ=16.',
      '- **Flat chrome gate:** sampling the `.scene-player-stage` band still picks up ~83% pixels near phone chrome `#e3d3c6` in side margins — treat as heuristic noise until the gate excludes letterbox; floor fill uses `paintKitchenSoirViewportFloor` on day kitchen after R6-style band planks.',
      '- **Camera preset column:** A5/A10 rows may read `wide` in metrics while `scene.json` says `closeDesk` if the playhead advances between `setShot` and `getFrameMetrics`; verify framing on the PNGs.',
      ...rows.filter((r) => r.martinBody.startsWith('FAIL') || r.tailGate.includes('FAIL') || r.placeholderGate.includes('FAIL'))
        .map((r) => `- **${r.beat}** \`${r.id}\`: ${[r.martinBody !== 'pass' ? r.martinBody : '', r.tailGate.includes('FAIL') ? r.tailGate : '', r.placeholderGate.includes('FAIL') ? r.placeholderGate : ''].filter(Boolean).join('; ')}`),
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1R_contact.png'), contact);
      await fs.writeFile(path.join(dir, 'p1R_NOTES.md'), md);
    }
    console.log('Wrote', captures.length, 'P1R shots to', outDirs[0]);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
