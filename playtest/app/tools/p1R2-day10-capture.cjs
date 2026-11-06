#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const playwright = require('playwright');
const sharp = require('sharp');

const appRoot = path.resolve(__dirname, '..');
const scenePath = path.join(appRoot, 'scenes/day10-kitchen/scene.json');
const PB23_DIR = '/opt/cursor/artifacts/day10_packb23';

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
const view = { width: 390, height: 844 };
const dpr = 3;

function isBrownPlank(rgb) {
  const [r, g, b] = rgb;
  if (r > 85 && g > 48 && b > 32 && r >= g - 8 && g >= b - 12) return true;
  if (r >= 28 && r <= 55 && g >= 40 && g <= 62 && b >= 48 && b <= 72) return true;
  return false;
}

function sampleRgb(data, w, ch, xCss, yCss) {
  const x = Math.round(xCss * dpr);
  const y = Math.round(yCss * dpr);
  const i = (y * w + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
}

function floorOverTorsoGate(data, w, ch, gates) {
  const bb = gates.speakerBbox;
  if (!bb) return { pass: true, note: 'n/a' };
  const x = bb.x + bb.w / 2;
  const y = bb.y + bb.h * 0.5;
  const rgb = sampleRgb(data, w, ch, x, y);
  const pass = !isBrownPlank(rgb);
  return { pass, note: `torso rgb ${rgb.join(',')}`, x: Math.round(x), y: Math.round(y) };
}

function bubbleAt(id, cfg, tMid) {
  return (cfg.bubbles || []).find((x) => x.t0 <= tMid && x.t1 > tMid) || null;
}

function needsSpeakerInFrame(b) {
  if (!b) return false;
  if (b.kind === 'narrator' || b.anchor === 'narrator') return false;
  if (b.kind === 'screen') return false;
  return true;
}

function rowPass(id, gates, floorGate, cfg, tMid) {
  const b = bubbleAt(id, cfg, tMid);
  const failures = [];
  if (needsSpeakerInFrame(b) && !gates.speakerVisible) failures.push('speaker not visible');
  if (needsSpeakerInFrame(b) && !gates.feetOrChairVisible) failures.push('feet/chair not visible');
  if (!floorGate.pass && needsSpeakerInFrame(b)) failures.push(`floor over torso @${floorGate.x},${floorGate.y}`);
  if (b && b.kind !== 'screen' && b.kind !== 'narrator' && !gates.screenBubble) {
    if (gates.tailDeltaX == null || gates.tailDeltaX > 6) failures.push(`tail Δx ${gates.tailDeltaX}`);
    if (gates.bubbleOverlaps?.lamp) failures.push('bubble covers lamp');
    if (gates.bubbleOverlaps?.clock) failures.push('bubble covers clock');
    if (gates.bubbleOverlaps?.face) failures.push('bubble covers face');
  }
  return { pass: failures.length === 0, failures };
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(appRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(appRoot + path.sep)) return res.writeHead(403).end();
      const st = await require('node:fs').promises.stat(file);
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

async function sideBySide(outPath, leftPng, rightPng) {
  const left = await sharp(leftPng).resize(view.width, view.height).png().toBuffer();
  let right = left;
  try {
    await fs.access(rightPng);
    right = await sharp(rightPng).resize(view.width, view.height).png().toBuffer();
  } catch { /* no pb23 */ }
  await sharp({
    create: { width: view.width * 2, height: view.height, channels: 3, background: '#1a1a22' }
  }).composite([{ input: left, left: 0, top: 0 }, { input: right, left: view.width, top: 0 }]).png().toFile(outPath);
}

(async () => {
  const cfg = JSON.parse(await fs.readFile(scenePath, 'utf8'));
  for (const dir of outDirs) await fs.mkdir(dir, { recursive: true });
  const outDir = outDirs[0];
  const server = await startServer();
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: view, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const tableRows = [];
  const captures = [];
  let exitCode = 0;

  try {
    await page.goto(`${server.base}/day10-phase1.html?pack=b&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scenePlayer?.getConfig?.());
    await page.evaluate(() => {
      window.__scenePlayer.setCaptureOmitPlaceholders(true);
      window.__scenePlayer.start();
    });
    await page.waitForTimeout(300);

    for (const [id, beat] of BEATS) {
      const shot = cfg.shots.find((s) => s.id === id);
      const tMid = shot ? (shot.t0 + shot.t1) / 2 : 0;
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(250);

      const gates = await page.evaluate(() => window.__scenePlayer.inspectP1RShotGates());
      const actors = await page.evaluate(() => window.__scenePlayer.inspectActorSprites());

      const file = `p1R2_${id}.png`;
      const out = path.join(outDir, file);
      await page.screenshot({ path: out, scale: 'css' });
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
      const floorGate = floorOverTorsoGate(data, info.width, info.channels, gates);
      const verdict = rowPass(id, gates, floorGate, cfg, tMid);
      if (!verdict.pass) exitCode = 1;

      const cmpOut = path.join(outDir, `p1R2_vs_pb23_${id}.png`);
      const pb23 = path.join(PB23_DIR, `pb23_${id}.png`);
      await sideBySide(cmpOut, out, pb23);
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(cmpOut, path.join(dir, `p1R2_vs_pb23_${id}.png`));
      }

      const castLog = actors.map((a) => `${a.stageKey}:${a.asset || 'default'}`).join('; ') || '—';
      const tailStr = gates.tailTip && gates.speakerHead
        ? `tip (${gates.tailTip.x},${gates.tailTip.y}) head (${gates.speakerHead.x},${gates.speakerHead.y}) Δx=${gates.tailDeltaX}`
        : gates.screenBubble ? 'screen (no tail)' : '—';
      const ov = gates.bubbleOverlaps || {};
      const ovStr = [ov.lamp && 'lamp', ov.face && 'face', ov.clock && 'clock'].filter(Boolean).join(',') || 'none';

      tableRows.push({
        shotId: id,
        beat,
        speaker: gates.speakerId,
        speakerVisible: needsSpeakerInFrame(bubbleAt(id, cfg, tMid)) ? (gates.speakerVisible ? 'Y' : 'FAIL') : 'n/a',
        feetChair: needsSpeakerInFrame(bubbleAt(id, cfg, tMid)) ? (gates.feetOrChairVisible ? 'Y' : 'FAIL') : 'n/a',
        floorFront: floorGate.pass ? 'N' : 'FAIL',
        tailStr,
        overlaps: ovStr,
        castLog,
        gate: verdict.pass ? 'PASS' : `FAIL: ${verdict.failures.join('; ')}`
      });
    }

    const cols = 5;
    const composites = [];
    for (let i = 0; i < captures.length; i++) {
      const buf = await sharp(captures[i]).resize(view.width, view.height).png().toBuffer();
      composites.push({ input: buf, left: (i % cols) * view.width, top: Math.floor(i / cols) * view.height });
    }
    const contact = await sharp({
      create: { width: cols * view.width, height: Math.ceil(captures.length / cols) * view.height, channels: 4, background: { r: 42, g: 40, b: 48, alpha: 1 } }
    }).composite(composites).png().toBuffer();

    const md = [
      '# Day 10 P1R2 — Phase 1 redo gates',
      '',
      'Branch `astra/day10-scenes`. Day kitchen shots A1–A13 + B1–B6.',
      '',
      '| shotId | beat | speaker | speaker visible | feet/chair | floor in front of actor | tail tip vs head | bubble overlaps (lamp/face/clock) | cast sprites | gate |',
      '|---|---|---|---|---|---|---|---|---|---|',
      ...tableRows.map((r) => `| \`${r.shotId}\` | ${r.beat} | ${r.speaker} | ${r.speakerVisible} | ${r.feetChair} | ${r.floorFront} | ${r.tailStr} | ${r.overlaps} | ${r.castLog} | **${r.gate}** |`),
      '',
      'Captures: `p1R2_<id>.png`, compare `p1R2_vs_pb23_<id>.png` (left P1R2, right pb23). Contact: `p1R2_contact.png`.',
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1R2_contact.png'), contact);
      await fs.writeFile(path.join(dir, 'p1R2_NOTES.md'), md);
    }
    console.log('P1R2 exit', exitCode, 'wrote', outDir);
  } finally {
    await browser.close();
    await server.close();
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
