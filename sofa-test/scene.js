/**
 * « Où est le chat ? » — 15 s playable scene (96×64 logical px).
 * Camille poses: see scene.json (swap PNGs + anchors + layer without editing draw logic).
 */
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const wordcard = document.getElementById('wordcard');
const replayBtn = document.getElementById('replay');
const stage = document.getElementById('stage');

let CFG;
let images = {};
let audioCtx = null;
let started = false;
let phase = 'overlay'; // overlay | play | waitTail | play2 | fade | done
let sceneT = 0;
let lastFrame = 0;
let waitSince = 0;
let tailPhase = 0;
let idleGlow = false;
let fadeAlpha = 0;
let bubble = null;
let padTimer = 0;
let lastIdleBellFrame = -1;

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
  const sw = CFG.scene.width;
  const sh = CFG.scene.height;
  const rect = stage.getBoundingClientRect();
  const scale = Math.max(1, Math.floor(Math.min(rect.width / sw, rect.height / sh)));
  canvas.width = sw;
  canvas.height = sh;
  canvas.style.width = `${sw * scale}px`;
  canvas.style.height = `${sh * scale}px`;
  ctx.imageSmoothingEnabled = false;
}

function drawRoom() {
  ctx.fillStyle = CFG.room.wall;
  ctx.fillRect(0, 0, CFG.scene.width, CFG.scene.height);
  ctx.fillStyle = CFG.room.floor;
  ctx.fillRect(0, CFG.room.floorTop, CFG.scene.width, CFG.scene.height - CFG.room.floorTop);
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
  const x1 = cx;
  const x2 = cx + im.width;
  return feetY <= 43 && x2 > 50 && x1 < 94;
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
  if (t < 2) {
    return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  }
  if (t < 4) {
    const prog = (t - 2) / 2;
    const xs = [52, 56, 60, 64];
    const idx = Math.min(3, Math.floor(prog * xs.length));
    const frame = `walk_side_${idx % 3}`;
    return { key: frame, x: xs[idx], y: a.catBehindY, flip: false };
  }
  if (t < 8) {
    return null;
  }
  if (t < 8.35) {
    return { key: 'peek_0', x: a.peek.x, y: a.peek.y, flip: false };
  }
  if (t < 8.7) {
    return { key: 'peek_1', x: a.peek.x, y: a.peek.y, flip: false };
  }
  if (t < 10) {
    return null;
  }
  if (t < 12) {
    const prog = (t - 10) / 2;
    const x = Math.round(94 - prog * (94 - a.catFront.x));
    const frame = `walk_side_${Math.floor(t * 5) % 3}`;
    return { key: frame, x, y: a.catFront.y, flip: true };
  }
  if (t < 13.2) {
    return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  }
  if (t < 14) {
    return { key: 'glance', x: a.catFront.x, y: a.catFront.y, flip: false };
  }
  if (t < 14.35) {
    return { key: 'found_0', x: a.catFront.x, y: a.catFront.y, flip: false };
  }
  if (t < 14.7) {
    return { key: 'found_0', x: 53, y: 43, flip: false };
  }
  if (t < 15) {
    return { key: 'found_0', x: 55, y: 36, flip: false };
  }
  return null;
}

function tailVisible(t) {
  if (t < 4) return false;
  if (t >= 8.7) return false;
  if (t >= 8 && phase !== 'waitTail') return false;
  return true;
}

function updateBubble(t) {
  if (t >= 0.2 && t < 2) bubble = CFG.lines.devant;
  else if ((t >= 4.3 && t < 6) || phase === 'waitTail') bubble = CFG.lines.ou;
  else if (t >= 8.2 && t < 10) bubble = CFG.lines.derriere;
  else bubble = null;
}

function drawBubble(text) {
  if (!text) return;
  const padX = 4;
  const padY = 3;
  ctx.font = '6px system-ui, -apple-system, sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = 10 + padY * 2;
  const bx = 8;
  const by = 6;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#22303a';
  ctx.lineWidth = 1;
  roundRect(bx, by, bw, bh, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a22';
  ctx.fillText(text, bx + padX, by + bh - padY - 2);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCamille(beatName, ox) {
  const beat = CFG.camille.beats[beatName];
  if (!beat) return;
  const x = ox ?? beat.anchor.x;
  const y = beat.anchor.y;
  const dx = x - beat.anchor.x;
  drawImg(beat.file, x, y);
  if (beat.brush) {
    drawImg(beat.brush.file, beat.brush.anchor.x + dx, beat.brush.anchor.y);
  }
}

function drawTapGlow(now) {
  if (!idleGlow || phase !== 'waitTail') return;
  const h = CFG.anchors.tailHitbox;
  const pulse = 0.35 + 0.25 * Math.sin(now * 0.006);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff8e0';
  ctx.fillRect(h.x - 1, h.y - 1, h.w + 2, h.h + 2);
  ctx.restore();
}

function render(now) {
  if (!CFG) return;
  drawRoom();

  const t = sceneT;
  const cat = getCatState(t);
  const beat = getCamilleBeat(t);
  const cx = camilleX(t);

  let catBehind = false;
  if (cat) catBehind = catBehindLane(cat.x, cat.y, cat.key);

  if (cat && catBehind) {
    drawImg(SPRITE_MANIFEST[cat.key], cat.x, cat.y, cat.flip);
  }

  if (beat) {
    const b = CFG.camille.beats[beat];
    if (b.layer === 'behind') {
      drawCamille(beat, cx);
    }
  }

  drawImg(CFG.sofa.file, CFG.sofa.x, CFG.sofa.y);

  if (tailVisible(t)) {
    const tailKey = tailPhase % 2 === 0 ? 'tail_0' : 'tail_1';
    drawImg(SPRITE_MANIFEST[tailKey], CFG.anchors.tail.x, CFG.anchors.tail.y);
  }

  if (beat) {
    const b = CFG.camille.beats[beat];
    if (b.layer === 'front') {
      drawCamille(beat, cx);
    }
  }

  if (cat && !catBehind) {
    drawImg(SPRITE_MANIFEST[cat.key], cat.x, cat.y, cat.flip);
  }

  updateBubble(t);
  drawBubble(bubble);
  drawTapGlow(now);

  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, CFG.scene.width, CFG.scene.height);
  }
}

function hitTail(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CFG.scene.width / rect.width;
  const scaleY = CFG.scene.height / rect.height;
  const sx = (clientX - rect.left) * scaleX;
  const sy = (clientY - rect.top) * scaleY;
  const h = CFG.anchors.tailHitbox;
  const m = CFG.anchors.touchMargin;
  return (
    sx >= h.x - m &&
    sx <= h.x + h.w + m &&
    sy >= h.y - m &&
    sy <= h.y + h.h + m
  );
}

function onTailTap() {
  if (phase !== 'waitTail') return;
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

function startScene() {
  ensureAudio();
  started = true;
  phase = 'play';
  sceneT = 0;
  lastFrame = performance.now();
  waitSince = 0;
  tailPhase = 0;
  idleGlow = false;
  fadeAlpha = 0;
  lastIdleBellFrame = -1;
  overlay.hidden = true;
  wordcard.hidden = true;
}

function resetScene() {
  started = false;
  phase = 'overlay';
  sceneT = 0;
  fadeAlpha = 0;
  wordcard.hidden = true;
  overlay.hidden = false;
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
    if (sceneT >= 4) {
      tailPhase = Math.floor(now / 350) % 2;
    }
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
    if (sceneT >= 10 && sceneT < 10.05) {
      /* gag beat — silence */
    }
    if (sceneT >= 12.5 && sceneT < 12.55) sigh();
    if (sceneT >= 14.5) {
      fadeAlpha = Math.min(1, fadeAlpha + dt * 1.2);
    }
    if (sceneT >= 15.2) {
      phase = 'done';
      sting();
      fadeAlpha = 1;
      wordcard.hidden = false;
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

/** Test / debug hooks (Playwright) */
window.__sofaScene = {
  getPhase: () => phase,
  getT: () => sceneT,
  start: startScene,
  tapTail: onTailTap,
  setT(t) {
    sceneT = t;
    if (t >= 15) phase = 'done';
    else if (t >= 8) phase = 'play2';
    else if (t >= 6) phase = 'waitTail';
    else phase = 'play';
    render(performance.now());
  },
  setIdleGlow(on) {
    idleGlow = on;
    if (on) phase = 'waitTail';
    sceneT = 6;
    render(performance.now());
  },
  skipToWordcard() {
    phase = 'done';
    fadeAlpha = 1;
    wordcard.hidden = false;
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
