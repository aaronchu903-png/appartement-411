/**
 * « Où est le chat ? » v2 — 96×64 scene, CROPS.md hard-cut shots.
 * Camille / sprites: scene.json
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
let previewHold = false;
let bubbleText = null;
let bubbleKind = null;
let padTimer = 0;
let lastIdleBellFrame = -1;
let sighedShot7 = false;
let sighCueUntil = 0;

let stageW = 390;
let stageH = 700;
let dpr = 1;
let activeCrop = { x: 0, y: 0, w: 96, h: 64 };
let activeScale = 4;
let activeOx = 0;
let activeOy = 0;

const SW = 96;
const SH = 64;

async function loadConfig() {
  const res = await fetch('scene.json');
  CFG = await res.json();
}

function assetUrl(name) {
  return CFG.assetsBase + name;
}

function spriteFile(key) {
  return CFG.sprites[key] || key;
}

async function loadImages() {
  const names = new Set(Object.values(CFG.sprites));
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

function shotAtTime(t) {
  for (const sh of CFG.shots) {
    if (t >= sh.t0 && t < sh.t1) return sh;
  }
  return CFG.shots[CFG.shots.length - 1];
}

function layoutCrop(crop, shotDef) {
  const sW = Math.floor(stageW / crop.w);
  const sH = Math.floor(stageH / crop.h);
  let s = Math.max(1, Math.min(sW, sH));
  if (shotDef?.wideMargin) s = Math.max(1, s - 1);
  activeScale = s;
  const drawW = crop.w * activeScale;
  const drawH = crop.h * activeScale;
  activeOx = (stageW - drawW) / 2;
  activeOy = (stageH - drawH) / 2;
  activeCrop = crop;
}

function roomColors(warm) {
  if (!warm) return { wall: CFG.room.wall, floor: CFG.room.floor };
  return { wall: CFG.room.wallWarm || CFG.room.wall, floor: CFG.room.floorWarm || CFG.room.floor };
}

function fillFrameAmbient(warm = false) {
  const { wall, floor } = roomColors(warm);
  const floorScreen = activeOy + (CFG.room.floorTop - activeCrop.y) * activeScale;
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, stageW, stageH);
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorScreen, stageW, stageH - floorScreen);
}

function sceneToScreen(sx, sy) {
  return {
    x: activeOx + (sx - activeCrop.x) * activeScale,
    y: activeOy + (sy - activeCrop.y) * activeScale
  };
}

function screenToScene(px, py) {
  return {
    x: activeCrop.x + (px - activeOx) / activeScale,
    y: activeCrop.y + (py - activeOy) / activeScale
  };
}

function drawExtendedRoom(warm = false) {
  const ft = CFG.room.floorTop;
  const { wall, floor } = roomColors(warm);
  ctx.fillStyle = wall;
  ctx.fillRect(-160, -160, 320, 160 + ft);
  ctx.fillStyle = floor;
  ctx.fillRect(-160, ft, 320, 200);
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

function drawSprite(key, x, y, flip = false) {
  drawImg(spriteFile(key), x, y, flip);
}

function catBehindLane(cx, cy, spriteKey) {
  if (spriteKey === 'peek_0' || spriteKey === 'peek_1') return false;
  const im = images[spriteFile(spriteKey)];
  if (!im) return false;
  const feetY = cy + im.height - 1;
  return feetY <= 43 && cx + im.width > 50 && cx < 94;
}

function camilleWalkX(t) {
  const enterStart = 3.5;
  const enterEnd = 5.35;
  const dest = CFG.camille.beats.stand.anchor.x;
  if (t < enterStart) return -20;
  if (t >= enterEnd) return dest;
  const prog = (t - enterStart) / (enterEnd - enterStart);
  return -20 + prog * (dest + 20);
}

function getCamilleBeat(t) {
  const sh = shotAtTime(t).id;
  if (t >= 3.5 && t < 5.55) return 'stand';
  if (sh === 6) return 'hug';
  if (sh === 7) return 'standSeen';
  return null;
}

function camilleX(t) {
  if (t >= 3.5 && t < 5.55) return camilleWalkX(t);
  if (shotAtTime(t).id === 7) return CFG.camille.beats.standSeen.anchor.x;
  if (shotAtTime(t).id === 6) return CFG.camille.beats.hug.anchor.x;
  return CFG.camille.beats.stand.anchor.x;
}

function getCatState(t) {
  const a = CFG.anchors;
  const sh = shotAtTime(t).id;

  if (sh === 1) return null;
  if (sh === 2) {
    if (t < 2.2) return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
    const prog = (t - 2.2) / 1.1;
    const xs = [52, 48, 44, 40];
    const idx = Math.min(3, Math.floor(prog * xs.length));
    return { key: `walk_side_${idx % 3}`, x: xs[idx], y: a.catBehindY, flip: false };
  }
  if (sh === 3 || sh === 4 || (phase === 'waitTail' && t < 8)) return null;
  if (sh === 5) {
    if (t < 8.35) return { key: 'peek_0', x: a.peek.x, y: a.peek.y, flip: false };
    if (t < 8.7) return { key: 'peek_1', x: a.peek.x, y: a.peek.y, flip: false };
    return null;
  }
  if (sh === 6) {
    const dest = catRightSpot();
    const dur = 12.2 - shot6Start();
    const prog = Math.min(1, (t - shot6Start()) / dur);
    const x = Math.round(94 - prog * (94 - dest.x));
    return { key: `walk_side_${Math.floor(t * 5) % 3}`, x, y: dest.y, flip: true };
  }
  if (sh === 7) {
    const dest = catRightSpot();
    return { key: 'found_0', x: dest.x, y: dest.y, flip: false };
  }
  if (sh === 8) {
    const dest = catRightSpot();
    const end = sceneEnd();
    if (t < end - 1.0) return { key: 'glance', x: dest.x, y: dest.y, flip: false };
    if (t < end - 0.65) return { key: 'look_cam_0', x: dest.x, y: dest.y, flip: false };
    if (t < end - 0.35) return { key: 'look_cam_1', x: dest.x, y: dest.y, flip: false };
    if (t < end) return { key: 'found_0', x: dest.x - 2, y: dest.y - 1, flip: false };
  }
  return null;
}

function ouLineTime() {
  return CFG.timing?.ouLineAt ?? 4.7;
}

function tailRevealTime() {
  return ouLineTime() + (CFG.timing?.tailRevealAfterOu ?? 0.5);
}

function shot6Start() {
  return CFG.timing?.shot6Start ?? 10.3;
}

function sighAt() {
  return CFG.timing?.sighAt ?? 12.3;
}

function sceneEnd() {
  return CFG.timing?.sceneEnd ?? 15.2;
}

function catRightSpot() {
  const a = CFG.anchors.catRightFront || CFG.anchors.catFront;
  return { x: a.x, y: a.y };
}

function tailVisible(t) {
  if (t >= 8.7) return false;
  if (t < 1.5) return true;
  if (t >= 1.5 && t < 2.3) return false;
  if (t >= ouLineTime() && t < tailRevealTime()) return false;
  return t < 8.7;
}

function tailTappable() {
  return tailVisible(sceneT) && sceneT >= tailRevealTime() && phase === 'waitTail';
}

function updateBubble(t) {
  const sh = shotAtTime(t).id;
  if (sh === 2 && t >= 1.6 && t < 2.85) {
    bubbleText = CFG.lines.devant;
    bubbleKind = 'off';
  } else if (t >= ouLineTime() && t < 8) {
    bubbleText = CFG.lines.ou;
    bubbleKind = 'camille';
  } else if (sh === 5) {
    bubbleText = CFG.lines.derriere;
    bubbleKind = 'camille';
  } else {
    bubbleText = null;
    bubbleKind = null;
  }
}

function camilleHeadScene(t) {
  const beatName = getCamilleBeat(t);
  if (!beatName) return null;
  const beat = CFG.camille.beats[beatName];
  const cx = camilleX(t);
  return { x: cx + 6, y: beat.anchor.y + 2 };
}

function camilleOnScreen(t) {
  const head = camilleHeadScene(t);
  if (!head) return false;
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

function drawBubbles() {
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
  let bx;
  let by;
  let tip = null;
  if (offVoice) {
    bx = 12;
    by = Math.max(14, activeOy + 16);
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

function drawSighCue(now) {
  if (now > sighCueUntil || shotAtTime(sceneT).id !== 7) return;
  const head = camilleHeadScene(sceneT);
  if (!head) return;
  const p = sceneToScreen(head.x + 5, head.y);
  const alpha = Math.min(1, (sighCueUntil - now) / 900);
  bctx.save();
  bctx.strokeStyle = `rgba(75, 65, 58, ${0.45 * alpha})`;
  bctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    bctx.beginPath();
    bctx.arc(p.x + i * 6, p.y - 6 - i * 5, 2 + i * 0.5, 0, Math.PI * 2);
    bctx.stroke();
  }
  bctx.restore();
}

function drawTapGlowRing(now) {
  if (phase !== 'waitTail' || !idleGlow) return;
  const h = CFG.anchors.tailHitbox;
  const p = sceneToScreen(h.x + h.w / 2, h.y + h.h / 2);
  const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
  const rOuter = (14 + pulse * 8) * (activeScale / 4);
  const rInner = (8 + pulse * 4) * (activeScale / 4);
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

  if (cat && catBehind) drawSprite(cat.key, cat.x, cat.y, cat.flip);
  if (beat && CFG.camille.beats[beat].layer === 'behind') drawCamille(beat, cx);
  drawImg(CFG.sofa.file, CFG.sofa.x, CFG.sofa.y);
  if (tailVisible(t)) {
    const tailKey = tailPhase % 2 === 0 ? 'tail_0' : 'tail_1';
    drawSprite(tailKey, CFG.anchors.tail.x, CFG.anchors.tail.y);
  }
  if (beat && CFG.camille.beats[beat].layer === 'front') drawCamille(beat, cx);
  if (cat && !catBehind) drawSprite(cat.key, cat.x, cat.y, cat.flip);
}

function renderSceneLayer(crop, t, shotDef) {
  const warm = !!(shotDef && shotDef.warmTint);
  layoutCrop(crop, shotDef);
  fillFrameAmbient(warm);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(activeOx, activeOy);
  ctx.scale(activeScale, activeScale);
  ctx.translate(-crop.x, -crop.y);
  drawExtendedRoom(warm);
  drawSceneContent(t);
  ctx.restore();
}

function render(now) {
  if (!CFG) return;

  if (phase === 'overlay') {
    layoutCrop(CFG.startCrop, { wideMargin: true });
    fillFrameAmbient(false);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(activeOx, activeOy);
    ctx.scale(activeScale, activeScale);
    ctx.translate(-CFG.startCrop.x, -CFG.startCrop.y);
    drawExtendedRoom(false);
    drawImg(CFG.sofa.file, CFG.sofa.x, CFG.sofa.y);
    ctx.restore();
    bctx.clearRect(0, 0, stageW, stageH);
  } else {
    const shot = shotAtTime(sceneT);
    if (shot.id === 7 && !sighedShot7 && sceneT >= sighAt()) {
      sighedShot7 = true;
      sigh();
      sighCueUntil = now + 900;
    }
    renderSceneLayer(shot.crop, sceneT, shot);
    updateBubble(sceneT);
    drawBubbles();
    drawTapGlowRing(now);
    drawSighCue(now);
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
  const s = screenToScene(clientX - rect.left, clientY - rect.top);
  const h = CFG.anchors.tailHitbox;
  const m = CFG.anchors.touchMargin;
  return s.x >= h.x - m && s.x <= h.x + h.w + m && s.y >= h.y - m && s.y <= h.y + h.h + m;
}

function onTailTap() {
  if (!tailTappable()) return;
  previewHold = false;
  bell();
  phase = 'play2';
  sceneT = 8;
  waitSince = 0;
  idleGlow = false;
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
  const draw = (key, x, y, flip) => {
    const im = images[spriteFile(key)];
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
  previewHold = false;
  phase = 'play';
  sceneT = 0;
  lastFrame = performance.now();
  waitSince = 0;
  tailPhase = 0;
  idleGlow = false;
  fadeAlpha = 0;
  lastIdleBellFrame = -1;
  sighedShot7 = false;
  sighCueUntil = 0;
  overlay.hidden = true;
  wordcard.hidden = true;
  fadeVeil.hidden = true;
}

function resetScene() {
  previewHold = false;
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

  if (previewHold) {
    render(now);
    requestAnimationFrame(tick);
    return;
  }

  if (phase === 'play') {
    sceneT += dt;
    if (sceneT >= 2.2 && sceneT < 3.5) {
      padTimer += dt;
      if (padTimer > 0.22) {
        padStep();
        padTimer = 0;
      }
    }
    if (sceneT >= 1.5) tailPhase = Math.floor(now / 350) % 2;
    if (sceneT >= tailRevealTime()) {
      phase = 'waitTail';
      waitSince = now;
      if (sceneT < tailRevealTime()) sceneT = tailRevealTime();
      tailPhase = 1;
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
    if (sceneT >= sighAt() && sceneT < sighAt() + 0.05 && !sighedShot7) {
      sighedShot7 = true;
      sigh();
      sighCueUntil = now + 900;
    }
    const fadeStart = sceneEnd() - 0.8;
    if (sceneT >= fadeStart) fadeAlpha = Math.min(1, fadeAlpha + dt * 2.5);
    if (sceneT >= sceneEnd() && fadeAlpha >= 1) {
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

function setPhaseForT(t) {
  if (t >= sceneEnd()) phase = 'done';
  else if (t >= 8) phase = 'play2';
  else if (t >= tailRevealTime()) phase = 'waitTail';
  else phase = 'play';
}

function previewAt(t) {
  previewHold = true;
  sceneT = t;
  setPhaseForT(t);
  const now = performance.now();
  fadeAlpha = 0;
  fadeVeil.hidden = true;
  fadeVeil.style.opacity = '0';
  wordcard.hidden = true;
  overlay.hidden = true;
  idleGlow = false;
  if (t < sighAt()) {
    sighedShot7 = false;
    sighCueUntil = 0;
  } else if (t >= sighAt() && t < 13.7 && !sighedShot7) {
    sighedShot7 = true;
    sigh();
    sighCueUntil = now + 900;
  }
  render(now);
}

window.__sofaScene = {
  getPhase: () => phase,
  getT: () => sceneT,
  getShot: () => shotAtTime(sceneT).id,
  start: startScene,
  tapTail: onTailTap,
  setT(t) {
    previewAt(t);
  },
  setShot(id) {
    const sh = CFG.shots.find((s) => s.id === id);
    if (!sh) return;
    if (id === 4) {
      previewAt(5.85);
      phase = 'waitTail';
      return;
    }
    previewAt((sh.t0 + sh.t1) / 2);
  },
  setIdleGlow(on) {
    idleGlow = on;
    previewAt(tailRevealTime() + 0.2);
    phase = 'waitTail';
  },
  getTailRevealTime: () => tailRevealTime(),
  enableTapRing(on) {
    idleGlow = !!on;
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
