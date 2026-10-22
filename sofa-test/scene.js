/**
 * « Où est le chat ? » — 96×64 scene, full-width integer scale + camera shots.
 * Camille poses: scene.json
 */
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const bubbleCanvas = document.getElementById('bubbles');
const bctx = bubbleCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
const wordcard = document.getElementById('wordcard');
const vocabList = document.getElementById('vocab-list');
const replayBtn = document.getElementById('replay');
const fadeVeil = document.getElementById('fadeveil');
const stage = document.getElementById('stage');

let CFG;
let images = {};
let audioCtx = null;
let phase = 'overlay';
let sceneT = 0;
let lastFrame = 0;
let waitSince = 0;
let tailPhase = 0;
let idleGlow = false;
let fadeAlpha = 0;
let bubbleText = null;
let bubbleKind = null;
let padTimer = 0;
let lastIdleBellFrame = -1;

let stageW = 390;
let stageH = 700;
let dpr = 1;
let pixelScale = 4;
let cam = { x: 48, y: 32, zoom: 1 };
let camFrom = { x: 48, y: 32, zoom: 1 };
let camTo = { x: 48, y: 32, zoom: 1 };
let camBlendStart = 0;
let camBlendDur = 0.35;

const SW = 96;
const SH = 64;
const ZOOM_WIDE = 1;
const ZOOM_MED = 1.85;
const ZOOM_CLOSE = 3;

const SPRITE_MANIFEST = {
  walk_side_0: 'walk_side_0.png',
  walk_side_1: 'walk_side_1.png',
  walk_side_2: 'walk_side_2.png',
  peek_0: 'peek_0.png',
  peek_1: 'peek_1.png',
  found_0: 'found_0.png',
  found_1: 'found_1.png',
  glance: 'glance.png',
  tail_0: 'tail_0.png',
  tail_1: 'tail_1.png'
};

async function loadConfig() {
  const res = await fetch('scene.json');
  CFG = await res.json();
}

function assetUrl(name) {
  return CFG.assetsBase + name;
}

async function loadImages() {
  const names = new Set(Object.values(SPRITE_MANIFEST));
  names.add(CFG.sofa.file);
  for (const beat of Object.values(CFG.camille.beats)) {
    names.add(beat.file);
    if (beat.brush) names.add(beat.brush.file);
  }
  await Promise.all(
    [...names].map(
      (file) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            images[file] = img;
            resolve();
          };
          img.onerror = reject;
          img.src = assetUrl(file);
        })
    )
  );
}

function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {});
  } catch (_) {
    audioCtx = null;
  }
}

function blip(freq, dur, type = 'sine', gain = 0.08) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function padStep() {
  blip(180 + Math.random() * 40, 0.06, 'triangle', 0.05);
}
function bell() {
  blip(880, 0.12, 'sine', 0.06);
  blip(1320, 0.08, 'sine', 0.03);
}
function sigh() {
  blip(220, 0.45, 'sine', 0.05);
  blip(165, 0.5, 'triangle', 0.03);
}
function sting() {
  blip(523, 0.15, 'square', 0.04);
  blip(392, 0.25, 'square', 0.03);
}

function resize() {
  const rect = stage.getBoundingClientRect();
  stageW = rect.width;
  stageH = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  pixelScale = Math.max(1, Math.floor(stageW / SW));
  for (const c of [canvas, bubbleCanvas]) {
    c.width = Math.round(stageW * dpr);
    c.height = Math.round(stageH * dpr);
    c.style.width = `${stageW}px`;
    c.style.height = `${stageH}px`;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function easeOut(t) {
  return 1 - (1 - t) ** 3;
}

function setCameraTarget(cx, cy, zoom, dur = 0.35) {
  camFrom = { ...cam };
  camTo = { x: cx, y: cy, zoom };
  camBlendStart = performance.now();
  camBlendDur = dur;
}

function updateCamera(now) {
  const elapsed = (now - camBlendStart) / 1000;
  const t = camBlendDur <= 0 ? 1 : Math.min(1, elapsed / camBlendDur);
  const e = easeOut(t);
  cam.x = camFrom.x + (camTo.x - camFrom.x) * e;
  cam.y = camFrom.y + (camTo.y - camFrom.y) * e;
  cam.zoom = camFrom.zoom + (camTo.zoom - camFrom.zoom) * e;
}

function cameraShotForTime(t) {
  if (t < 4) return { cx: 48, cy: 33, zoom: ZOOM_WIDE };
  if (t < 6) return { cx: 28, cy: 34, zoom: ZOOM_MED };
  if (t < 10) return { cx: 52, cy: 36, zoom: ZOOM_CLOSE };
  if (t < 12) return { cx: 48, cy: 33, zoom: ZOOM_WIDE };
  return { cx: 44, cy: 38, zoom: ZOOM_MED };
}

let lastShotKey = '';
function syncCameraToTimeline(t, now) {
  const shot = cameraShotForTime(t);
  const key = `${shot.zoom}-${shot.cx}-${shot.cy}`;
  if (key !== lastShotKey) {
    lastShotKey = key;
    setCameraTarget(shot.cx, shot.cy, shot.zoom, 0.4);
    camBlendStart = now;
  }
}

function viewRect() {
  const scaleEff = pixelScale * cam.zoom;
  const vw = SW / cam.zoom;
  const vh = SH / cam.zoom;
  const left = cam.x - vw / 2;
  const top = cam.y - vh / 2;
  const drawH = vh * scaleEff;
  const oy = (stageH - drawH) / 2;
  return { scaleEff, vw, vh, left, top, oy };
}

function sceneToScreen(sx, sy) {
  const { scaleEff, left, top, oy } = viewRect();
  return { x: (sx - left) * scaleEff, y: oy + (sy - top) * scaleEff };
}

function screenToScene(px, py) {
  const { scaleEff, left, top, oy } = viewRect();
  return { x: left + px / scaleEff, y: top + (py - oy) / scaleEff };
}

function drawAmbientBands() {
  const wall = CFG.room.wall;
  const floor = CFG.room.floor;
  const { scaleEff, left, top, oy, vh } = viewRect();
  const floorSceneY = CFG.room.floorTop;
  const floorScreenY = oy + (floorSceneY - top) * scaleEff;

  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, stageW, stageH);
  ctx.fillStyle = floor;
  ctx.fillRect(0, Math.max(0, floorScreenY), stageW, stageH - Math.max(0, floorScreenY));

  const bandTop = oy;
  const bandBot = oy + vh * scaleEff;
  if (bandTop > 0) {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, stageW, bandTop);
  }
  if (bandBot < stageH) {
    ctx.fillStyle = floor;
    ctx.fillRect(0, bandBot, stageW, stageH - bandBot);
  }
}

function drawRoom() {
  ctx.fillStyle = CFG.room.wall;
  ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = CFG.room.floor;
  ctx.fillRect(0, CFG.room.floorTop, SW, SH - CFG.room.floorTop);
}

function drawImg(file, x, y, flip = false) {
  const im = images[file];
  if (!im) return;
  if (!flip) {
    ctx.drawImage(im, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x + im.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}

function catBehindLane(cx, cy, spriteKey) {
  if (spriteKey === 'peek_0' || spriteKey === 'peek_1') return false;
  const im = images[SPRITE_MANIFEST[spriteKey]];
  if (!im) return false;
  const feetY = cy + im.height - 1;
  return feetY <= 43 && cx + im.width > 50 && cx < 94;
}

function getCamilleBeat(t) {
  if (t < 4) return null;
  if (t >= 10 && t < 12.4) return 'bend';
  return 'stand';
}

function camilleX(t) {
  if (t < 4) return -20;
  if (t < 6) return -20 + ((t - 4) / 2) * (CFG.camille.beats.stand.anchor.x + 20);
  return CFG.camille.beats.stand.anchor.x;
}

function getCatState(t) {
  const a = CFG.anchors;
  if (t < 2) return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  if (t < 4) {
    const prog = (t - 2) / 2;
    const xs = [52, 56, 60, 64];
    const idx = Math.min(3, Math.floor(prog * xs.length));
    return { key: `walk_side_${idx % 3}`, x: xs[idx], y: a.catBehindY, flip: false };
  }
  if (t < 8) return null;
  if (t < 8.35) return { key: 'peek_0', x: a.peek.x, y: a.peek.y, flip: false };
  if (t < 8.7) return { key: 'peek_1', x: a.peek.x, y: a.peek.y, flip: false };
  if (t < 10) return null;
  if (t < 12) {
    const prog = (t - 10) / 2;
    const x = Math.round(94 - prog * (94 - a.catFront.x));
    return { key: `walk_side_${Math.floor(t * 5) % 3}`, x, y: a.catFront.y, flip: true };
  }
  if (t < 13.2) return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  if (t < 14) return { key: 'glance', x: a.catFront.x, y: a.catFront.y, flip: false };
  if (t < 14.35) return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  if (t < 14.7) return { key: 'found_0', x: 53, y: 43, flip: false };
  if (t < 15) return { key: 'found_0', x: 55, y: 36, flip: false };
  return null;
}

function tailVisible(t) {
  if (t < 4) return false;
  if (t >= 8.7) return false;
  if (t >= 8 && phase !== 'waitTail') return false;
  return true;
}

function updateBubble(t) {
  if (t >= 0.2 && t < 2) {
    bubbleText = CFG.lines.devant;
    bubbleKind = 'off';
  } else if ((t >= 4.3 && t < 6) || phase === 'waitTail') {
    bubbleText = CFG.lines.ou;
    bubbleKind = 'camille';
  } else if (t >= 8.2 && t < 10) {
    bubbleText = CFG.lines.derriere;
    bubbleKind = 'camille';
  } else {
    bubbleText = null;
    bubbleKind = null;
  }
}

function camilleHeadScene(t) {
  const cx = camilleX(t);
  const cy = CFG.camille.beats.stand.anchor.y;
  return { x: cx + 6, y: cy + 2 };
}

function camilleOnScreen(t) {
  if (!getCamilleBeat(t)) return false;
  const head = camilleHeadScene(t);
  const tip = sceneToScreen(head.x, head.y);
  return tip.x >= 24 && tip.x <= stageW - 24 && tip.y >= 16 && tip.y <= stageH - 16;
}

function bubbleUsesOffscreenVoice(kind, t) {
  if (kind === 'off') return true;
  if (kind === 'camille') return !camilleOnScreen(t);
  return true;
}

function wrapLines(text, maxWidth, measure) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (measure(test) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function drawBubbles(now) {
  bctx.clearRect(0, 0, stageW, stageH);
  if (!bubbleText || phase === 'overlay' || phase === 'done') return;

  const fontPx = 17;
  const padX = 12;
  const padY = 10;
  const lineH = fontPx * 1.2;
  const maxW = stageW - 24;

  bctx.font = `600 ${fontPx}px system-ui, -apple-system, Segoe UI, sans-serif`;
  const measure = (s) => bctx.measureText(s).width;
  const lines = wrapLines(bubbleText, maxW - padX * 2, measure);
  const textW = Math.min(maxW - padX * 2, Math.max(...lines.map(measure), 40));
  const bw = textW + padX * 2;
  const bh = lines.length * lineH + padY * 2;

  const offVoice = bubbleUsesOffscreenVoice(bubbleKind, sceneT);
  const { oy } = viewRect();
  let bx;
  let by;
  let tip = null;
  if (offVoice) {
    bx = 12;
    by = Math.max(14, oy + 16);
  } else {
    const anchor = camilleHeadScene(sceneT);
    tip = sceneToScreen(anchor.x, anchor.y);
    bx = tip.x - bw / 2;
    bx = Math.max(8, Math.min(stageW - bw - 8, bx));
    by = Math.max(12, tip.y - bh - 14);
  }

  bctx.fillStyle = '#fff';
  bctx.strokeStyle = '#22303a';
  bctx.lineWidth = 2;
  roundRectB(bx, by, bw, bh, 10);
  bctx.fill();
  bctx.stroke();

  if (!offVoice && tip) {
    const tailX = Math.max(bx + 12, Math.min(bx + bw - 12, tip.x));
    bctx.beginPath();
    bctx.moveTo(tailX - 6, by + bh);
    bctx.lineTo(tip.x, tip.y);
    bctx.lineTo(tailX + 6, by + bh);
    bctx.closePath();
    bctx.fillStyle = '#fff';
    bctx.fill();
    bctx.stroke();
  }

  bctx.fillStyle = '#1a1a22';
  bctx.textBaseline = 'top';
  lines.forEach((ln, i) => {
    bctx.fillText(ln, bx + padX, by + padY + i * lineH);
  });
}

function roundRectB(x, y, w, h, r) {
  bctx.beginPath();
  bctx.moveTo(x + r, y);
  bctx.lineTo(x + w - r, y);
  bctx.quadraticCurveTo(x + w, y, x + w, y + r);
  bctx.lineTo(x + w, y + h - r);
  bctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  bctx.lineTo(x + r, y + h);
  bctx.quadraticCurveTo(x, y + h, x, y + h - r);
  bctx.lineTo(x, y + r);
  bctx.quadraticCurveTo(x, y, x + r, y);
  bctx.closePath();
}

function drawTapGlowRing(now) {
  if (phase !== 'waitTail' || !idleGlow) return;
  const h = CFG.anchors.tailHitbox;
  const cx = h.x + h.w / 2;
  const cy = h.y + h.h / 2;
  const p = sceneToScreen(cx, cy);
  const { scaleEff } = viewRect();
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
  const rOuter = (14 + pulse * 8) * (scaleEff / pixelScale);
  const rInner = (8 + pulse * 4) * (scaleEff / pixelScale);
  bctx.save();
  bctx.strokeStyle = `rgba(255, 200, 80, ${0.45 + pulse * 0.4})`;
  bctx.lineWidth = 4 + pulse * 3;
  bctx.beginPath();
  bctx.arc(p.x, p.y, rOuter, 0, Math.PI * 2);
  bctx.stroke();
  bctx.strokeStyle = `rgba(255, 255, 245, ${0.65 + pulse * 0.25})`;
  bctx.lineWidth = 2.5;
  bctx.beginPath();
  bctx.arc(p.x, p.y, rInner, 0, Math.PI * 2);
  bctx.stroke();
  bctx.restore();
}

function drawCamille(beatName, ox) {
  const beat = CFG.camille.beats[beatName];
  if (!beat) return;
  const x = ox ?? beat.anchor.x;
  const dx = x - beat.anchor.x;
  drawImg(beat.file, x, beat.anchor.y);
  if (beat.brush) drawImg(beat.brush.file, beat.brush.anchor.x + dx, beat.brush.anchor.y);
}

function drawSceneContent(t) {
  const cat = getCatState(t);
  const beat = getCamilleBeat(t);
  const cx = camilleX(t);
  const catBehind = cat && catBehindLane(cat.x, cat.y, cat.key);

  if (cat && catBehind) drawImg(SPRITE_MANIFEST[cat.key], cat.x, cat.y, cat.flip);
  if (beat && CFG.camille.beats[beat].layer === 'behind') drawCamille(beat, cx);
  drawImg(CFG.sofa.file, CFG.sofa.x, CFG.sofa.y);
  if (tailVisible(t)) {
    const tailKey = tailPhase % 2 === 0 ? 'tail_0' : 'tail_1';
    drawImg(SPRITE_MANIFEST[tailKey], CFG.anchors.tail.x, CFG.anchors.tail.y);
  }
  if (beat && CFG.camille.beats[beat].layer === 'front') drawCamille(beat, cx);
  if (cat && !catBehind) drawImg(SPRITE_MANIFEST[cat.key], cat.x, cat.y, cat.flip);
}

function render(now) {
  if (!CFG) return;

  if (phase === 'overlay') {
    cam = { x: 48, y: 33, zoom: ZOOM_WIDE };
    camFrom = { ...cam };
    camTo = { ...cam };
  } else {
    updateCamera(now);
    syncCameraToTimeline(sceneT, now);
  }

  drawAmbientBands();

  const { scaleEff, left, top, oy } = viewRect();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(0, oy);
  ctx.scale(scaleEff, scaleEff);
  ctx.translate(-left, -top);
  drawRoom();
  if (phase === 'overlay') drawImg(CFG.sofa.file, CFG.sofa.x, CFG.sofa.y);
  else drawSceneContent(sceneT);
  ctx.restore();

  if (phase === 'overlay') {
    bctx.clearRect(0, 0, stageW, stageH);
  } else {
    updateBubble(sceneT);
    drawBubbles(now);
    drawTapGlowRing(now);
  }

  if (fadeAlpha > 0) {
    fadeVeil.hidden = false;
    fadeVeil.style.opacity = String(Math.min(1, fadeAlpha));
  } else {
    fadeVeil.hidden = true;
    fadeVeil.style.opacity = '0';
  }
}

function hitTail(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const s = screenToScene(px, py);
  const h = CFG.anchors.tailHitbox;
  const m = CFG.anchors.touchMargin;
  return s.x >= h.x - m && s.x <= h.x + h.w + m && s.y >= h.y - m && s.y <= h.y + h.h + m;
}

function onTailTap() {
  if (phase !== 'waitTail') return;
  bell();
  phase = 'play2';
  sceneT = 8;
  waitSince = 0;
  idleGlow = false;
  lastShotKey = '';
}

function pointerDown(e) {
  if (phase === 'overlay') return;
  const x = e.clientX ?? e.changedTouches?.[0]?.clientX;
  const y = e.clientY ?? e.changedTouches?.[0]?.clientY;
  if (x != null && hitTail(x, y)) onTailTap();
}

function buildThumb(kind) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const t = c.getContext('2d');
  t.imageSmoothingEnabled = false;
  t.fillStyle = CFG.room.wall;
  t.fillRect(0, 0, 96, 64);
  t.fillStyle = CFG.room.floor;
  t.fillRect(0, 44, 96, 20);
  const draw = (file, x, y, flip) => {
    const im = images[SPRITE_MANIFEST[file]] || images[file];
    if (!im) return;
    if (!flip) t.drawImage(im, x, y);
    else {
      t.save();
      t.translate(x + im.width, y);
      t.scale(-1, 1);
      t.drawImage(im, 0, 0);
      t.restore();
    }
  };
  if (kind === 'cat_front') draw('found_0', 52, 44);
  if (kind === 'sofa') t.drawImage(images[CFG.sofa.file], 50, 30);
  if (kind === 'behind_tail') {
    t.drawImage(images[CFG.sofa.file], 50, 30);
    draw('tail_0', 47, 38);
  }
  if (kind === 'devant') {
    t.drawImage(images[CFG.sofa.file], 50, 30);
    draw('found_0', 52, 44);
  }
  return c;
}

function showWordcard() {
  vocabList.innerHTML = '';
  for (const v of CFG.vocabulary) {
    const row = document.createElement('div');
    row.className = 'vocab-row' + (v.contrast ? ' contrast' : '');
    const thumb = buildThumb(v.thumb);
    const body = document.createElement('div');
    body.innerHTML = `<div class="vocab-fr">${v.fr}</div>
      <div class="vocab-mean">${v.en} · ${v.zh}</div>
      ${v.note ? `<div class="vocab-note">${v.note}</div>` : ''}`;
    row.appendChild(thumb);
    row.appendChild(body);
    vocabList.appendChild(row);
  }
  wordcard.hidden = false;
}

function startScene() {
  ensureAudio();
  phase = 'play';
  sceneT = 0;
  lastFrame = performance.now();
  waitSince = 0;
  tailPhase = 0;
  idleGlow = false;
  fadeAlpha = 0;
  lastIdleBellFrame = -1;
  lastShotKey = '';
  cam = { x: 48, y: 33, zoom: ZOOM_WIDE };
  overlay.hidden = true;
  wordcard.hidden = true;
  fadeVeil.hidden = true;
}

function resetScene() {
  phase = 'overlay';
  sceneT = 0;
  fadeAlpha = 0;
  wordcard.hidden = true;
  overlay.hidden = false;
  fadeVeil.hidden = true;
  render(performance.now());
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (phase === 'play') {
    sceneT += dt;
    if (sceneT >= 2 && sceneT < 4) {
      padTimer += dt;
      if (padTimer > 0.22) {
        padStep();
        padTimer = 0;
      }
    }
    if (sceneT >= 4) tailPhase = Math.floor(now / 350) % 2;
    if (sceneT >= 6) {
      phase = 'waitTail';
      waitSince = now;
      sceneT = 6;
    }
  } else if (phase === 'waitTail') {
    tailPhase = Math.floor(now / 350) % 2;
    if (now - waitSince > 5000) {
      idleGlow = true;
      const idleFrame = Math.floor((now - waitSince - 5000) / 350);
      if (idleFrame > lastIdleBellFrame && idleFrame % 2 === 0) {
        lastIdleBellFrame = idleFrame;
        bell();
      }
    }
  } else if (phase === 'play2') {
    sceneT += dt;
    if (sceneT >= 12.5 && sceneT < 12.55) sigh();
    if (sceneT >= 14.4) fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
    if (sceneT >= 15.3 && fadeAlpha >= 1) {
      phase = 'done';
      sting();
      showWordcard();
    }
  }

  render(now);
  requestAnimationFrame(tick);
}

overlay.addEventListener('click', () => {
  if (phase === 'overlay') startScene();
});
overlay.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') startScene();
});
replayBtn.addEventListener('click', resetScene);
canvas.addEventListener('pointerdown', pointerDown);

window.__sofaScene = {
  getPhase: () => phase,
  getT: () => sceneT,
  getZoom: () => cam.zoom,
  start: startScene,
  tapTail: onTailTap,
  setT(t) {
    sceneT = t;
    if (t >= 15) phase = 'done';
    else if (t >= 8) phase = 'play2';
    else if (t >= 6) phase = 'waitTail';
    else phase = 'play';
    lastShotKey = '';
    const shot = cameraShotForTime(t);
    cam = { x: shot.cx, y: shot.cy, zoom: shot.zoom };
    camFrom = { ...cam };
    camTo = { ...cam };
    render(performance.now());
  },
  setIdleGlow(on) {
    idleGlow = on;
    phase = 'waitTail';
    sceneT = 6;
    lastShotKey = '';
    render(performance.now());
  },
  showBlack() {
    fadeAlpha = 1;
    fadeVeil.hidden = false;
    fadeVeil.style.opacity = '1';
    phase = 'done';
    render(performance.now());
  },
  skipToWordcard() {
    fadeAlpha = 1;
    fadeVeil.hidden = false;
    fadeVeil.style.opacity = '1';
    phase = 'done';
    showWordcard();
    overlay.hidden = true;
    render(performance.now());
  }
};

(async () => {
  await loadConfig();
  await loadImages();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
})();
