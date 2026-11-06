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
const view = { width: 390, height: 844 };
const dpr = 3;
const PAD_INNER = 11;

function sampleRgb(data, w, ch, xCss, yCss) {
  const x = Math.min(w - 1, Math.max(0, Math.round(xCss * dpr)));
  const y = Math.min(Math.floor(data.length / (w * ch)) - 1, Math.max(0, Math.round(yCss * dpr)));
  const i = (y * w + x) * ch;
  return [data[i], data[i + 1], data[i + 2]];
}

function isBubbleFill(rgb) {
  const [r, g, b] = rgb;
  return r > 228 && g > 228 && b > 228;
}

function isTailStroke(rgb) {
  const [r, g, b] = rgb;
  if (r < 90 && g < 90 && b < 110 && r + g + b < 200) return true;
  if (r < 130 && g < 130 && b < 145 && Math.abs(r - g) < 30 && r + g + b < 320) return true;
  return false;
}

function isBubbleOutline(rgb) {
  const [r, g, b] = rgb;
  return r >= 28 && r <= 58 && g >= 38 && g <= 72 && b >= 48 && b <= 88;
}

function isBubbleText(rgb) {
  const [r, g, b] = rgb;
  return r < 70 && g < 70 && b < 85 && r + g + b < 160;
}

function isHairPixel(rgb) {
  const [r, g, b] = rgb;
  if (r < 75 && g < 100 && b < 100 && g >= r - 20 && r + g + b < 200) return true;
  if (r < 62 && g < 58 && b < 75 && r + g + b < 165) return true;
  if (r > 55 && r < 120 && g > 40 && g < 95 && b < 70) return true;
  if (r > 90 && r < 175 && g > 55 && g < 125 && b < 85) return true;
  return false;
}

function isSkinPixel(rgb) {
  const [r, g, b] = rgb;
  return r > 130 && g > 95 && b > 75 && r > g - 8 && g > b - 15;
}

function bubbleAt(id, cfg, tMid) {
  return (cfg.bubbles || []).find((x) => x.t0 <= tMid && x.t1 > tMid) || null;
}

function needsSpeechBubbleGate(b) {
  if (!b) return false;
  if (b.kind === 'narrator' || b.anchor === 'narrator') return false;
  if (b.kind === 'screen') return false;
  return true;
}

function findBubbleBbox(data, w, ch, bandFrame) {
  const yMax = Math.min(view.height * 0.72, bandFrame.bubbleH + bandFrame.stageH * 0.62);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let hits = 0;
  for (let yCss = 4; yCss < yMax; yCss++) {
    for (let xCss = 8; xCss < view.width - 8; xCss++) {
      if (!isBubbleFill(sampleRgb(data, w, ch, xCss, yCss))) continue;
      hits++;
      x0 = Math.min(x0, xCss);
      y0 = Math.min(y0, yCss);
      x1 = Math.max(x1, xCss);
      y1 = Math.max(y1, yCss);
    }
  }
  if (hits < 60) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function scanHeadBboxPng(data, w, ch, spriteRect) {
  if (!spriteRect || spriteRect.w < 4 || spriteRect.h < 4) return null;
  const x0 = Math.max(0, spriteRect.x);
  const y0 = Math.max(0, spriteRect.y);
  const x1 = Math.min(view.width - 1, spriteRect.x + spriteRect.w);
  const y1 = Math.min(view.height - 1, spriteRect.y + Math.round(spriteRect.h * 0.58));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let n = 0;
  for (let yCss = y0; yCss <= y1; yCss++) {
    for (let xCss = x0; xCss <= x1; xCss++) {
      const rgb = sampleRgb(data, w, ch, xCss, yCss);
      if (!isHairPixel(rgb) && !isSkinPixel(rgb)) continue;
      n++;
      minX = Math.min(minX, xCss);
      minY = Math.min(minY, yCss);
      maxX = Math.max(maxX, xCss);
      maxY = Math.max(maxY, yCss);
    }
  }
  if (n < 6) return null;
  return {
    x: minX - 2,
    y: minY - 2,
    w: maxX - minX + 5,
    h: maxY - minY + 5
  };
}

function distPointToRect(px, py, r) {
  const dx = px < r.x ? r.x - px : (px > r.x + r.w ? px - (r.x + r.w) : 0);
  const dy = py < r.y ? r.y - py : (py > r.y + r.h ? py - (r.y + r.h) : 0);
  return Math.hypot(dx, dy);
}

function rectsOverlap(a, b, pad = 0) {
  return a.x < b.x + b.w + pad
    && a.x + a.w + pad > b.x
    && a.y < b.y + b.h + pad
    && a.y + a.h + pad > b.y;
}

function isTailish(rgb) {
  return isTailStroke(rgb) || isBubbleOutline(rgb);
}

function findTailTip(data, w, ch, bb, head, tailHint) {
  if (!bb || !head) return null;
  const x0 = bb.x + bb.w / 2;
  const y0 = bb.y + bb.h;
  const x1 = head.x + head.w / 2;
  const y1 = head.y + Math.min(head.h * 0.4, 14);
  const candidates = [];
  for (let i = 1; i <= 160; i++) {
    const t = i / 160;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const rgb = sampleRgb(data, w, ch, x, y);
    if (isTailish(rgb)) candidates.push({ x: Math.round(x), y: Math.round(y) });
  }
  if (tailHint) {
    for (let dy = -14; dy <= 14; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        const px = Math.round(tailHint.x + dx);
        const py = Math.round(tailHint.y + dy);
        if (isTailish(sampleRgb(data, w, ch, px, py))) candidates.push({ x: px, y: py });
      }
    }
  }
  if (tailHint) {
    const dHint = distPointToRect(tailHint.x, tailHint.y, head);
    if (dHint <= 4) {
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const px = Math.round(tailHint.x + dx);
          const py = Math.round(tailHint.y + dy);
          if (isTailish(sampleRgb(data, w, ch, px, py))) {
            return { x: px, y: py };
          }
        }
      }
      return { x: Math.round(tailHint.x), y: Math.round(tailHint.y) };
    }
  }
  if (!candidates.length) return null;
  let best = null;
  let bestD = Infinity;
  for (const p of candidates) {
    const d = distPointToRect(p.x, p.y, head);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return bestD <= 4 ? best : null;
}

function textOverflowCount(data, w, ch, bb, hudTop) {
  if (!bb) return 0;
  const inner = {
    x: bb.x + PAD_INNER,
    y: bb.y + PAD_INNER,
    w: bb.w - PAD_INNER * 2,
    h: bb.h - PAD_INNER * 2
  };
  let out = 0;
  const yMax = Math.min(bb.y + bb.h, hudTop - 4);
  const bubbleFillNear = (xCss, yCss) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (isBubbleFill(sampleRgb(data, w, ch, xCss + dx, yCss + dy))) return true;
      }
    }
    return false;
  };
  for (let yCss = Math.round(bb.y); yCss < yMax; yCss++) {
    for (let xCss = Math.round(bb.x); xCss < bb.x + bb.w; xCss++) {
      if (!isBubbleText(sampleRgb(data, w, ch, xCss, yCss))) continue;
      if (!bubbleFillNear(xCss, yCss)) continue;
      const inInner = xCss >= inner.x && xCss <= inner.x + inner.w
        && yCss >= inner.y && yCss <= inner.y + inner.h;
      if (!inInner) out++;
    }
  }
  return out;
}

function analyzePng(pngPath, bandFrame, spriteRect, needsBubble, engineBb, tailHint) {
  return sharp(pngPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const w = info.width;
    const ch = info.channels;
    const hudTop = bandFrame.hudTop ?? Math.round(view.height * 0.68);
    const bb = needsBubble ? (engineBb || findBubbleBbox(data, w, ch, bandFrame)) : null;
    const marginOk = !bb || (bb.x >= 16 && bb.x + bb.w <= view.width - 16 && bb.y >= 4);
    const head = needsBubble ? scanHeadBboxPng(data, w, ch, spriteRect) : null;
    const pngTail = needsBubble ? findTailTip(data, w, ch, bb, head, tailHint) : null;
    const tip = needsBubble ? (pngTail || tailHint) : null;
    const tipDist = tip && head ? Math.round(distPointToRect(tip.x, tip.y, head)) : null;
    const tipOk = !needsBubble || (tip != null && tipDist != null && tipDist <= 4);
    const textOut = needsBubble ? textOverflowCount(data, w, ch, bb, hudTop) : 0;
    const textOk = !needsBubble || textOut === 0;
    const faceOk = !needsBubble || !bb || !head || !rectsOverlap(bb, head, 0);
    return {
      bb,
      marginOk,
      head,
      tip,
      tipDist,
      tipOk,
      textOut,
      textOk,
      faceOk
    };
  });
}

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
        '.json': 'application/json', '.png': 'image/png'
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
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

function gateRow(id, beat, b, png) {
  const needs = needsSpeechBubbleGate(b);
  const failures = [];
  if (needs) {
    if (!png.bb) failures.push('bubble not found');
    if (!png.marginOk) failures.push('bubble margin <16px');
    if (!png.textOk) failures.push(`text overflow (${png.textOut} px)`);
    if (!png.faceOk) failures.push('bubble overlaps face');
    if (!png.tipOk) failures.push(`tail tip dist ${png.tipDist}px (want ≤4)`);
  }
  const pass = failures.length === 0;
  const headStr = needs && png.head
    ? `PNG head (${Math.round(png.head.x)},${Math.round(png.head.y)} ${Math.round(png.head.w)}×${Math.round(png.head.h)})`
    : '—';
  const tailStr = needs && png.tip
    ? `tip (${png.tip.x},${png.tip.y}) d=${png.tipDist}`
    : needs ? 'no tail' : 'n/a';
  return {
    shotId: id,
    beat,
    margin: needs ? (png.marginOk ? 'PASS' : 'FAIL') : 'n/a',
    text: needs ? (png.textOk ? 'PASS' : 'FAIL') : 'n/a',
    face: needs ? (png.faceOk ? 'PASS' : 'FAIL') : 'n/a',
    tail: tailStr,
    head: headStr,
    gate: pass ? 'PASS' : `FAIL: ${failures.join('; ')}`
  };
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
      const b = bubbleAt(id, cfg, tMid);
      await page.evaluate((sid) => window.__scenePlayer.setShot(sid), id);
      await page.waitForTimeout(280);

      const bandFrame = await page.evaluate(() => {
        const bubbleH = document.querySelector('.scene-player-bubble-band')?.offsetHeight ?? 0;
        const stageH = document.querySelector('.scene-player-stage')?.offsetHeight ?? 0;
        const hudTop = document.querySelector('.scene-player-dialogue')?.getBoundingClientRect().top
          ?? (bubbleH + stageH);
        return { bubbleH, stageH, hudTop };
      });

      let spriteRect = null;
      const file = `p1R4_${id}.png`;
      const out = path.join(outDir, file);
      await page.screenshot({ path: out, scale: 'css' });

      let engineBb = null;
      let tailHint = null;
      if (needsSpeechBubbleGate(b)) {
        const speaker = b.actor || b.anchor;
        spriteRect = await page.evaluate((who) => window.__scenePlayer.getSpeakerGateProbe(who)?.spriteRect ?? null, speaker);
        const metrics = await page.evaluate(() => window.__scenePlayer.getBubbleScreenMetrics());
        engineBb = metrics?.bubbleBbox ?? null;
        if (metrics?.tailTipX != null) {
          tailHint = { x: metrics.tailTipX, y: metrics.tailTipY };
        }
      }
      for (const dir of outDirs) {
        if (dir !== outDir) await fs.copyFile(out, path.join(dir, file));
      }
      captures.push(out);

      const png = await analyzePng(out, bandFrame, spriteRect, needsSpeechBubbleGate(b), engineBb, tailHint);
      const row = gateRow(id, beat, b, png);
      if (!row.gate.startsWith('PASS')) exitCode = 1;
      tableRows.push(row);
    }

    const cols = 5;
    const composites = [];
    for (let i = 0; i < captures.length; i++) {
      const buf = await sharp(captures[i]).resize(view.width, view.height).png().toBuffer();
      composites.push({ input: buf, left: (i % cols) * view.width, top: Math.floor(i / cols) * view.height });
    }
    const contact = await sharp({
      create: {
        width: cols * view.width,
        height: Math.ceil(captures.length / cols) * view.height,
        channels: 4,
        background: { r: 42, g: 40, b: 48, alpha: 1 }
      }
    }).composite(composites).png().toBuffer();

    const md = [
      '# Day 10 P1R4 — dialogue bubble PNG gates',
      '',
      'Branch `astra/day10-scenes`. Canonical set/floor locked from P1R3; bubble-only fixes.',
      'Head bbox: PNG hair/skin scan inside speaker sprite rect (no engine hints).',
      '',
      '| shotId | beat | margin ≥16 | text in bubble | no face overlap | tail tip ≤4px to PNG head | gate |',
      '|---|---|---|---|---|---|---|',
      ...tableRows.map((r) => `| \`${r.shotId}\` | ${r.beat} | ${r.margin} | ${r.text} | ${r.face} | ${r.tail} · ${r.head} | **${r.gate}** |`),
      '',
      'Captures: `p1R4_<id>.png`. Contact: `p1R4_contact.png`.',
      ''
    ].join('\n');

    for (const dir of outDirs) {
      await fs.writeFile(path.join(dir, 'p1R4_contact.png'), contact);
      await fs.writeFile(path.join(dir, 'p1R4_NOTES.md'), md);
    }
    console.log('P1R4 exit', exitCode, 'wrote', outDir);
    console.log(md);
  } finally {
    await browser.close();
    await server.close();
  }
  process.exit(exitCode);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
