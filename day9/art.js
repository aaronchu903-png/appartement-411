/* Day 8: original, dependency-free scene art. Load as a classic script.
 * draw(canvas, state) paints a 480 x 320 scene; time is elapsed milliseconds.
 * Give the canvas a CSS width AND height; object-fit: cover preserves its pixels.
 * getHotspots(scene, state) returns scene-relative percent rectangles (x/y = centre).
 * projectHotspots(canvas, state) returns cover-adjusted DOM percent rectangles.
 * draw returns those projected hotspots. Hidden/cropped targets have visible:false.
 * start(canvas, stateOrGetter) returns { stop, update, render }; it honours reduced motion.
 * action + elapsed (ms since entering the beat) select one-shot story gestures.
 * rooftopUnlocked/basilPlanted are explicit story flags; omit them for the entry tableau.
 * direction ('up'/'down') + optional walkProgress (0..1) select the stairwell walk.
 * v2:true uses mobile portrait composition (390x844 baseline, also tested at 375x667).
 * The parent owns letterboxing and the <=390px portrait CSS canvas.
 * garden:{slots:[{id,bay,row,col,growth,due}],bay,zoom,selectedPot} uses 24 slots/bay.
 * catGame:{active,elapsed,approachElapsed,reach,blocked,phase,phaseElapsed,liftFrom}
 * uses motion(previousState).cat for a continuous interrupted lift. Times are ms.
 * focusZoom (0..1), targetPotId and reducedMotion share geometry with projected hits.
 * establishingProgress:0..1 on facade is an empty, silent day/dusk/night shot.
 * The caller owns its 3-5s clock and UI/audio; null/omitted restores the story facade.
 * drawWord(canvas, wordId) draws a distinct 120x80 pixel prop; false means unsupported.
 * drawReview(canvas,{pot:{id,growth,basil,due,thirst?},moisture,reaction,time,
 * reducedMotion,dropProgress?}) paints a 320x112 strip: pot left, kitten right.
 * pot also accepts dueCount, thirsty and hint from the parent's garden model.
 * dueCount (or numeric due) is a remaining-word count; thirst is optional 0..1.
 * moisture is 0..3; dropProgress is a single answer's flight, 0..1, omitted at rest.
 */
(function (root) {
  'use strict';

  const W = 480, H = 320;
  const scenes = ['roof', 'kitchen', 'doorway', 'stairs', 'lefevre', 'facade'];
  const P = {
    ink: '#303142', zinc: '#59677b', zincLight: '#85909e', cream: '#f5dfb7',
    gold: '#ffd58b', wood: '#936451', woodDark: '#654b48', clay: '#bb7158',
    clayLight: '#e59b73', soil: '#674b43', leaf: '#789568', leafLight: '#a4b478',
    leafDark: '#426957', sage: '#8fa69a', skin: '#f1c7a5', skinShade: '#c98e6b'
  };
  const cache = new WeakMap();
  const runners = new WeakMap();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(+n) ? +n : a));
  const mix = (a, b, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - f) + parseInt(b.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
  const noise = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const beat = (s, duration = 1200, delay = 0) => { const t = clamp((s.elapsed - delay) / duration, 0, 1); return t * t * (3 - 2 * t); };
  const handover = s => ['openHand', 'giveKey', 'closeDoor'].includes(s.action);

  // Structured action (or acting alongside a legacy string): {type, duration, delay, ...}.
  // door: state open/closed; handover: object/from/to; object: object/state/at;
  // kitten: gag hop/hide/peek; time: gesture clock/watch. All clocks are beat-local.
  function acting(input) {
    const cues = [...(typeof input.action === 'object' ? [].concat(input.action || []) : []), ...(input.acting || [])];
    return cues.map(cue => {
      const progress = input.reducedMotion ? 1 : beat({ elapsed: input.elapsed || 0 }, cue.duration || 1400, cue.delay || 0);
      return { ...cue, progress, openness: cue.state === 'closed' ? 1 - progress : progress,
        visible: cue.state === 'vanish' ? progress < 1 : cue.state !== 'appear' || progress > 0,
        rise: cue.gag === 'hop' ? Math.sin(progress * Math.PI) * 27 : 0,
        conceal: cue.gag === 'hide' ? progress : cue.gag === 'peek' ? 1 - progress * .6 : 0 };
    });
  }

  function state(input) {
    const s = input || {};
    return {
      scene: scenes.includes(s.scene) ? s.scene : 'roof', night: !!s.night,
      time: clamp(s.time, 0, 1e12), cat: s.cat !== false, danger: clamp(s.danger, 0, 1),
      reaction: ['idle', 'offended', 'lick', 'happy', 'catch', 'lift', 'roll', 'tilt'].includes(s.reaction) ? s.reaction : 'idle',
      water: clamp(s.water, 0, 1), growth: [0, 1].map(i => Math.round(clamp((s.growth || [2, 2])[i], 0, 5))),
      focus: s.recall ? null : ({ emptyPot: 'basil', catChair: 'chair', roofDoor: 'up', lefevreDoor: 'down' })[s.focus] || s.focus || null,
      direction: s.direction === 'up' ? 'up' : 'down',
      action: typeof s.action === 'object' ? '' : s.action === 'lift' ? 'catdone' : s.action || (s.reaction === 'lift' ? 'catdone' : ''), elapsed: clamp(s.elapsed, 0, 1e12),
      acting: acting(s), door: s.door, shot: s.shot || null, visibleRegion: s.visibleRegion || null,
      day: s.day || s.staging?.day, staging: s.staging || {},
      cameraFrom: s.cameraFrom || null, cameraProgress: s.cameraProgress == null ? 1 : clamp(s.cameraProgress, 0, 1),
      rooftopUnlocked: s.rooftopUnlocked !== false, basilPlanted: s.basilPlanted !== false,
      walkProgress: s.walkProgress == null ? null : clamp(s.walkProgress, 0, 1),
      v2: s.v2 === true, reducedMotion: !!s.reducedMotion,
      garden: s.garden || null, catGame: s.catGame || null,
      moisture: s.moisture || {},
      establishingProgress: s.establishingProgress == null ? null : clamp(s.establishingProgress, 0, 1),
      targetPotId: s.targetPotId, focusZoom: s.recall ? 0 : clamp(s.focusZoom, 0, 1), speaker: s.speaker || ''
    };
  }

  // All shapes are scan-converted into whole pixels, including sloped roofs and ellipses.
  function painter(context) {
    const r = (x, y, w, h, color) => {
      context.fillStyle = color;
      context.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w)), Math.max(0, Math.round(h)));
    };
    const line = (x0, y0, x1, y1, color, width = 1) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        r(x0, y0, width, width, color);
        if (x0 === x1 && y0 === y1) break;
        const e = 2 * err;
        if (e >= dy) { err += dy; x0 += sx; }
        if (e <= dx) { err += dx; y0 += sy; }
      }
    };
    const poly = (points, color) => {
      const top = Math.ceil(Math.min(...points.map(p => p[1])));
      const bottom = Math.floor(Math.max(...points.map(p => p[1])));
      for (let y = top; y <= bottom; y++) {
        const xs = [];
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) r(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, color);
      }
    };
    const oval = (x, y, rx, ry, color) => {
      for (let row = -Math.floor(ry); row <= Math.floor(ry); row++) {
        const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
        r(x - span, y + row, span * 2 + 1, 1, color);
      }
    };
    return { r, line, poly, oval, ctx: context };
  }

  function speckle(p, x, y, w, h, count, color, seed = 0) {
    for (let i = 0; i < count; i++) p.r(x + noise(i + seed) * w, y + noise(i + seed + 500) * h, 1 + (i % 3 === 0), 1, color);
  }

  function sky(p, night) {
    const bands = night ? ['#33394f', '#43435e', '#56516b', '#6f6079', '#977486', '#b98a91'] : ['#9b849d', '#b594a8', '#cc9fae', '#e4b0b5', '#efc2ba', '#f3d3bd'];
    bands.forEach((c, i) => p.r(0, i * 30, W, 31, c));
    for (let i = 0; i < 11; i++) {
      const x = noise(i + 20) * W, y = 24 + noise(i + 90) * 82;
      p.r(x, y, 24 + noise(i) * 42, 2, night ? '#777084' : '#efc2c1');
      p.r(x + 12, y - 2, 18, 2, night ? '#68647b' : '#e9b9bd');
    }
    if (night) {
      for (let i = 0; i < 38; i++) {
        const x = noise(i + 12) * W, y = noise(i + 65) * 98;
        p.r(x, y, 1, i % 9 === 0 ? 2 : 1, i % 3 ? '#b9a9b6' : '#f6dfbd');
      }
      p.oval(346, 42, 12, 12, '#88808e'); p.oval(346, 42, 9, 9, '#f7e6c3');
      p.r(341, 39, 3, 2, '#e4d0b2'); p.r(349, 46, 2, 3, '#e4d0b2');
    } else { p.oval(347, 69, 15, 15, '#f8d7b2'); }
  }

  function skyline(p, night, offset = 0) {
    for (let layer = 0; layer < 3; layer++) {
      const color = (night ? ['#797084', '#615d75', '#45495e'] : ['#b695a2', '#8a7c90', '#656c80'])[layer];
      for (let i = 0; i < 14; i++) {
        const x = i * 39 - 20 + layer * 13, y = 129 + layer * 18 - noise(i + layer * 51) * 23 + offset;
        const width = 35 + noise(i + 61) * 15;
        p.r(x, y, width, 75, color);
        p.poly([[x - 3, y], [x + 8, y - 17], [x + width - 9, y - 17], [x + width + 4, y]], color);
        p.r(x + 10, y - 26, 4, 12, color); p.r(x + 9, y - 27, 6, 2, color);
        if (layer === 2) {
          p.line(x, y, x + width, y, '#98a0ab');
          for (let k = 0; k < 3; k++) {
            const wx = x + 7 + k * 11;
            p.r(wx, y + 9, 5, 8, noise(i * 3 + k) > .3 ? '#deb78e' : '#717487');
            p.r(wx, y + 12, 5, 1, color);
            p.r(wx, y + 26, 5, 7, '#8f8792');
          }
          p.r(x + 23, y - 11, 7, 10, '#52586d'); p.r(x + 25, y - 9, 3, 5, '#e3bc94');
        }
      }
    }
    // A distant iron silhouette, kept secondary to the apartment roofs.
    p.line(85, 99 + offset, 75, 144 + offset, '#79798d', 2);
    p.line(85, 99 + offset, 96, 144 + offset, '#79798d', 2);
    p.r(78, 127 + offset, 16, 2, '#79798d'); p.r(81, 117 + offset, 9, 2, '#79798d');
    p.r(85, 94 + offset, 1, 8, '#79798d');
  }

  function floor(p, y, night, outdoor) {
    p.r(0, y, W, H - y, outdoor ? (night ? '#66616d' : '#887b7e') : (night ? '#805b50' : '#b48768'));
    for (let row = 0; row < 7; row++) {
      const yy = y + row * (outdoor ? 22 : 18);
      p.r(0, yy, W, 1, outdoor ? '#514e5e' : '#775744');
      p.r(0, yy + 1, W, 1, outdoor ? '#99858a' : '#c49a77');
      for (let x = -100 + (row % 2) * 49; x < W; x += outdoor ? 92 : 117) {
        p.line(x, yy, x - (x - 240) * .04, yy + 20, outdoor ? '#5c5664' : '#8d664e');
        p.r(x + 8, yy + 6, 22, 1, outdoor ? '#7f727a' : '#c29570');
        if (!outdoor) p.r(x + 40, yy + 11, 30, 1, '#a67b5c');
      }
    }
    speckle(p, 0, y, W, H - y, 160, outdoor ? '#96808a' : '#b98d68', 81);
  }

  function chair(p, x, y, scale = 1, muted = false) {
    const c = muted ? '#857d76' : '#b68b65', d = '#655750';
    p.oval(x + 16 * scale, y + 50 * scale, 25 * scale, 4 * scale, '#514b5340');
    p.line(x, y, x + 5 * scale, y + 52 * scale, d, 3 * scale);
    p.line(x + 32 * scale, y, x + 27 * scale, y + 52 * scale, d, 3 * scale);
    for (let i = 0; i < 3; i++) { p.r(x + 2, y + i * 7 * scale, 31 * scale, 5 * scale, c); p.r(x + 3, y + i * 7 * scale, 25 * scale, 1, '#d1ac83'); }
    p.line(x + 4 * scale, y + 26 * scale, x + 31 * scale, y + 51 * scale, d, 3 * scale);
    p.line(x + 30 * scale, y + 26 * scale, x + 2 * scale, y + 51 * scale, d, 3 * scale);
    p.r(x - 2, y + 26 * scale, 39 * scale, 5 * scale, c);
    p.r(x - 2, y + 31 * scale, 39 * scale, 2, d);
  }

  function pot(p, x, y, growth, time, basil = false, wobble = 0, pose = {}) {
    p.oval(x, y + 3, 23, 5, '#37344230');
    const shift = Math.round(wobble);
    p.poly([[x - 17 + shift, y - 25], [x + 17 + shift, y - 25], [x + 12, y], [x - 12, y]], P.clay);
    p.poly([[x + 9 + shift, y - 23], [x + 16 + shift, y - 23], [x + 12, y], [x + 7, y]], '#945849');
    p.r(x - 12 + shift, y - 20, 3, 15, P.clayLight); p.r(x - 10, y - 3, 19, 2, '#a45c4c');
    p.r(x - 19 + shift, y - 29, 38, 7, '#cf8664'); p.r(x - 17 + shift, y - 29, 34, 2, '#efad7d');
    p.r(x - 15 + shift, y - 29, 30, 2, mix(P.soil, '#302a29', clamp(pose.moisture, 0, 3) / 3));
    speckle(p, x - 10, y - 19, 20, 16, 12, '#d18a69', 14);
    if (growth === 0) { p.r(x - 3 + shift, y - 30, 6, 2, '#a49367'); return; }
    y += pose.plantOffset || 0;
    const sway = Math.round(Math.sin(time / 1300 + x) * (growth > 2 ? 1 : 0));
    const thirst = clamp(pose.thirst, 0, 1), droop = Math.round(thirst * 8);
    const leaf = thirst ? mix(P.leaf, '#989b8d', thirst * .85) : P.leaf;
    const dark = thirst ? mix(P.leafDark, '#777f79', thirst * .85) : P.leafDark;
    const light = thirst ? mix(P.leafLight, '#b0b1a0', thirst * .85) : P.leafLight;
    const height = 11 + growth * 7, top = y - 29 - height + droop;
    p.line(x + shift, y - 29, x + shift + sway, top, dark, 2);
    for (let i = 0; i < growth + 1; i++) {
      const yy = y - 34 - i * 6, side = i % 2 ? -1 : 1, extent = (basil ? 10 : 8) + Math.min(i, 2);
      const lift = (pose.leafLift || 0) - droop;
      p.line(x + shift, yy + 2, x + shift + side * extent, yy - 4 - lift, dark);
      p.oval(x + shift + side * (extent - 2) + sway, yy - 5 - lift, basil ? 8 : 6, 4, i % 2 ? leaf : dark);
      p.line(x + shift + side * 3 + sway, yy - 4 - lift, x + shift + side * extent + sway, yy - 6 - lift, light);
    }
    p.oval(x + shift + sway, top, 4, 5, leaf);
    if (growth >= 4) {
      for (let i = 0; i < (growth === 5 ? 4 : 1); i++) {
        const xx = x + shift + (i - 1) * 7, yy = top - 3 + i % 2 * 5;
        p.line(x + shift, top + 8, xx, yy, P.leafDark);
        p.oval(xx, yy, growth === 5 ? 4 : 2, 3, basil ? '#ddd3db' : '#e9b2a0');
        p.r(xx, yy, 2, 2, '#f7d597');
      }
    }
  }

  function can(p, x, y, water, time) {
    const tilt = water > 0 ? Math.round(Math.sin(time / 210)) : 0;
    p.oval(x, y + 3, 24, 4, '#37344230');
    p.oval(x - 15, y - 20, 12, 12, '#526f69'); p.oval(x - 15, y - 20, 8, 8, '#8d8580');
    p.poly([[x + 12, y - 12], [x + 30, y - 30 + tilt], [x + 33, y - 27 + tilt], [x + 17, y - 4]], '#77968b');
    p.line(x + 17, y - 12, x + 31, y - 29 + tilt, '#b6c1a1', 2);
    p.r(x - 13, y - 27, 29, 25, '#819b89'); p.r(x - 10, y - 25, 6, 20, '#a8b99c');
    p.r(x + 12, y - 24, 4, 20, '#617e73'); p.r(x - 11, y - 3, 24, 3, '#58776d');
    p.r(x - 9, y - 30, 21, 4, '#b4bea2'); p.r(x - 5, y - 29, 12, 2, '#526f69');
    p.r(x + 29, y - 32 + tilt, 7, 6, '#b5bea0'); p.r(x + 33, y - 31 + tilt, 3, 4, '#617e73');
    p.r(x - 6, y - 15, 11, 7, '#a0ac90'); p.r(x - 3, y - 13, 5, 3, '#7b8e7b');
    if (water > 0) p.r(x - 8, y - 5 - water * 16, 2, water * 16, '#c1d4ba');
  }

  function person(p, x, feet, who, time, pose = 'idle', scale = 1, expression = {}) {
    if (p.people && p.people[who]) expression = { ...expression, ...p.people[who] };
    const breath = Math.sin(time / 650 + x) > .65 ? 1 : 0;
    const stride = pose === 'walk' ? Math.round(Math.sin(time / 130) * 4) : 0;
    const y = feet - 59 * scale + breath + (pose === 'laugh' ? Math.round(Math.sin(time / 130)) : 0) + (expression.bob || 0);
    let head = 0;
    const r = (a, b, w, h, c) => p.r(x + (a + head) * scale, y + b * scale, w * scale, h * scale, c);
    const shirt = who === 'camille' ? '#377c60' : who === 'noe' ? '#c2714c' : '#815574';
    const shade = who === 'camille' ? '#285c50' : who === 'noe' ? '#9b4f3c' : '#603e5b';
    const hair = who === 'camille' ? '#3b2a20' : who === 'noe' ? '#7a4a22' : '#c4c4cc';
    p.oval(x + 12 * scale, feet + 2, 18 * scale, 3, '#34324330');
    r(2, 28, 22, 19, shade); r(5, 27, 17, 18, shirt);
    r(7, 28, 11, 2, who === 'lefevre' ? '#f4efe6' : '#d1ba96');
    r(8, 30, 9, who === 'noe' ? 15 : 2, who === 'noe' ? '#eadac1' : shirt);
    r(4, 42, 19, 3, shade); r(6 + stride, 46, 7, 12 - Math.abs(stride), who === 'noe' ? '#975e46' : '#343a53');
    r(16 - stride, 46, 7, 12, who === 'noe' ? '#975e46' : '#343a53');
    if (who === 'lefevre') { r(3, 44, 22, 9, '#464354'); r(7, 53, 5, 5, P.skinShade); r(17, 53, 5, 5, P.skinShade); }
    r(4 + stride, 57 - Math.abs(stride), 9, 3, '#302d37'); r(16 - stride, 57, 9, 3, '#302d37');
    if (pose !== 'lift') {
      if (pose !== 'offer') { r(1 - stride, 31, 5, 14, shirt); r(1 - stride, 44, 5, 5, P.skin); }
      if (pose !== 'receive') { r(23 + stride, 31, 5, 14, shade); r(23 + stride, 44, 5, 5, P.skinShade); }
    }
    if (pose === 'offer' || pose === 'receive') {
      const arm = (a, b, c, d, color, width) => p.line(x + a * scale, y + b * scale, x + c * scale, y + d * scale, color, width * scale);
      const reach = expression.reach || 0;
      if (pose === 'offer') {
        arm(3, 31, -4, 39, shade, 6); arm(-4, 39, -10 - reach * 7, 40, shirt, 5);
        r(-18 - reach * 7, 38, 11, 4, P.skin); r(-15 - reach * 7, 36, 4, 2, P.skin);
        r(-14 - reach * 7, 38, 3, 2, '#ddbc7d'); r(-11 - reach * 7, 39, 6, 1, '#ddbc7d');
      } else {
        const wx = 29 + ((expression.key.x - x) / scale - 29) * reach;
        const wy = 44 + ((expression.key.y - y) / scale + 2 - 44) * reach;
        const dx = wx - 22, dy = wy - 31, distance = Math.hypot(dx, dy);
        // Two normal-length segments bend below the wrist; the body closes the gap.
        const bend = Math.sqrt(Math.max(0, 11 * 11 - distance * distance / 4));
        const ex = (22 + wx) / 2 - dy / distance * bend;
        const ey = (31 + wy) / 2 + dx / distance * bend;
        arm(22, 31, ex, ey, shade, 6); arm(ex, ey, wx, wy, shirt, 5);
        r(wx - 1, wy - 2, 8, 5, P.skin);
      }
    }
    if (pose === 'catch') { r(-13, 32, 18, 6, shirt); r(-18, 31, 7, 5, P.skin); r(-9, 39, 14, 5, shirt); r(-16, 38, 8, 5, P.skin); }
    if (pose === 'hold') { r(-4, 36, 10, 6, shirt); r(-7, 35, 6, 4, P.skin); }
    if (pose === 'lift') { r(1, 30, 7, 10, shirt); r(22, 30, 7, 10, shade); r(5, 37, 22, 5, shirt); }
    head = expression.tilt || 0;
    r(10, 22, 8, 6, P.skinShade); r(4, 6, 21, 15, hair); r(6, 9, 18, 14, P.skin);
    r(8, 22, 14, 3, P.skin); r(22, 13, 3, 8, P.skinShade);
    r(3, 6, 23, 5, hair); r(6, 2, 17, 6, hair); r(9, 0, 10, 4, hair);
    r(3, 10, 4, who === 'camille' ? 10 : 7, hair);
    if (who === 'camille') { r(19, 7, 9, 4, hair); r(7, 4, 9, 2, '#50382b'); }
    if (who === 'noe') { r(5, 0, 3, 6, hair); r(14, -2, 3, 6, hair); r(23, 0, 3, 7, hair); r(7, 5, 9, 2, '#956139'); }
    if (who === 'lefevre') { r(10, -5, 9, 7, '#8e8e98'); r(9, -6, 8, 6, hair); r(3, 10, 3, 11, '#8e8e98'); }
    const blink = expression.blink || pose === 'laugh' || (time + x * 37) % 4700 > 4500;
    r(10, 14, 2, blink ? 1 : 3, '#30303a'); r(18, 14, 2, blink ? 1 : 3, '#30303a');
    r(14, 18, 2, 2, '#dcaa87'); r(14, 21, 3, 1, '#b56f65'); r(8, 19, 3, 1, '#e5ad92');
    if (pose === 'laugh') { r(12, 20, 7, 3, '#9a615d'); r(13, 20, 5, 1, '#f4dec5'); }
    if (who === 'lefevre') {
      r(8, 13, 6, 1, '#5a5a66'); r(16, 13, 6, 1, '#5a5a66');
      r(8, 17, 6, 1, '#5a5a66'); r(16, 17, 6, 1, '#5a5a66');
      r(8, 14, 1, 3, '#5a5a66'); r(21, 14, 1, 3, '#5a5a66'); r(13, 15, 4, 1, '#5a5a66');
      r(15, 33, 1, 2, '#d8b78a'); r(15, 39, 1, 2, '#d8b78a');
    }
    if (expression.mouth) r(13, 21, expression.mouth === 2 ? 5 : 3, expression.mouth, '#9a615d');
    head = 0;
    r(7, 35, 2, 2, shade); r(19, 38, 2, 2, shade);
    if (pose === 'offer') return { x: x + (-14 - (expression.reach || 0) * 7) * scale, y: y + 40 * scale };
  }

  function cat(p, x, y, s) {
    const gag = s.acting?.find(cue => cue.type === 'kitten');
    if (gag) {
      y -= gag.rise;
      const bottom = y - gag.conceal * 35, original = p;
      // Clip the sprite behind its ledge, rather than making a translucent kitten.
      let color;
      p = painter({ set fillStyle(c) { color = c; }, fillRect(a, b, w, h) { if (b < bottom) original.r(a, b, w, Math.min(h, bottom - b), color); } });
      if (gag.conceal) original.r(x - 24, bottom, 49, 5, '#936451');
    }
    const cp = s.catPose || {};
    const happy = s.reaction === 'happy', lick = s.reaction === 'lick', offended = s.reaction === 'offended';
    const hop = happy ? Math.max(0, Math.round(Math.sin(s.time / 170) * 3)) : 0;
    y -= hop;
    const orange = '#e2873a', light = '#f3b365', stripe = '#b8642a';
    if (s.v2 && (happy || s.reaction === 'roll')) {
      const rise = s.reducedMotion ? 0 : Math.round((Math.sin(s.time / 240) + 1));
      [[x + 17, y + hop - 34 - rise], [x - 18, y + hop - 30 - rise]].forEach(([hx, hy]) => {
        p.r(hx, hy, 2, 2, '#dfa0a0'); p.r(hx + 3, hy, 2, 2, '#dfa0a0');
        p.r(hx, hy + 2, 5, 2, '#dfa0a0'); p.r(hx + 1, hy + 4, 3, 1, '#dfa0a0'); p.r(hx + 2, hy + 5, 1, 1, '#dfa0a0');
      });
    }
    if (s.reaction === 'roll') {
      const wiggle = s.reducedMotion ? 0 : Math.round(Math.sin(s.time / 180) * 2);
      p.oval(x, y + 1, 23, 3, '#49384630'); p.oval(x - 3, y - 9, 16, 9, orange);
      p.oval(x - 3, y - 11, 9, 6, light); p.r(x - 13, y - 23 + wiggle, 5, 12, orange); p.r(x + 2, y - 24 - wiggle, 5, 13, orange);
      p.oval(x + 16, y - 10, 9, 9, orange); p.poly([[x + 19, y - 16], [x + 26, y - 20], [x + 24, y - 10]], orange);
      p.r(x + 13, y - 13, 3, 1, '#22303a'); p.r(x + 20, y - 10, 3, 1, '#22303a'); p.r(x + 17, y - 8, 2, 2, '#e79aa0');
      p.line(x - 16, y - 3, x - 26, y - 11 + wiggle, orange, 3);
      return;
    }
    if (s.action === 'sleepBetweenPots') {
      const breath = Math.sin(s.time / 900) > .5 ? 1 : 0;
      p.oval(x, y, 19, 3, '#49384630'); p.oval(x, y - 6, 18, 8 + breath, orange);
      p.oval(x + 10, y - 7, 8, 7, light); p.r(x + 11, y - 9, 5, 1, '#22303a');
      p.poly([[x + 6, y - 11], [x + 5, y - 18], [x + 12, y - 12]], orange);
      p.r(x - 12, y - 8, 3, 5, stripe); p.r(x - 6, y - 12, 3, 4, stripe);
      p.line(x - 12, y - 2, x + 6, y - 1, stripe, 3); p.r(x + 6, y - 2, 5, 3, orange);
      return;
    }
    p.oval(x + 3, y + hop + 1, 20, 3, '#49384630');
    p.oval(x + 1, y - 9, 13 + (cp.squash || 0), 10 - (cp.squash || 0), orange);
    if (cp.walkFrame >= 0) {
      // Contact, passing, opposite contact, opposite passing (125 ms per pose).
      const feet = [[-3, 3, 3, -3], [0, -1, 0, 2], [3, -3, -3, 3], [0, 2, 0, -1]][cp.walkFrame];
      [-8, 6, -5, 9].forEach((leg, i) => {
        const raised = (cp.walkFrame === 1 && i === 3) || (cp.walkFrame === 3 && i === 2) ? 2 : 0;
        p.line(x + leg, y - 7, x + leg + feet[i], y - raised, i < 2 ? stripe : orange, 3);
        p.r(x + leg + feet[i] - 1, y - raised, 5, 2, i < 2 ? stripe : light);
      });
    } else {
      p.r(x - 8, y - 6, 6, 7, orange); p.r(x + 7, y - 6, 5, 7, orange);
    }
    const feetY = y;
    y += (cp.headBob || 0) + (cp.anticipation || 0) + (s.reaction === 'tilt' ? 2 : 0);
    const tilt = s.reaction === 'tilt' ? 2 : 0;
    const turn = s.action === 'catTurnsHead' ? 2 - Math.round(beat(s, 750, 180) * 7) : offended ? -3 : s.reaction === 'tilt' ? -1 : 2;
    if (tilt) p.poly([[x - 8 + turn, y - 27], [x + 11 + turn, y - 23], [x + 9 + turn, y - 8], [x - 10 + turn, y - 12]], orange);
    else p.r(x - 8 + turn, y - 25, 19, 15, orange);
    p.poly([[x - 8 + turn, y - 24 - tilt], [x - 9 + turn, y - 33 - tilt], [x - 1 + turn, y - 26 - tilt]], orange);
    p.poly([[x + 4 + turn, y - 26 + tilt], [x + 12 + turn, y - 32 + tilt], [x + 11 + turn, y - 22 + tilt]], orange);
    p.r(x - 6 + turn, y - 28 - tilt, 2, 3, '#e9a27c'); p.r(x + 8 + turn, y - 28 + tilt, 2, 3, '#e9a27c');
    p.r(x - 1 + turn, y - 24, 2, 4, stripe); p.r(x + 4 + turn, y - 24, 2, 3, stripe);
    const shut = happy || lick || (s.action === 'cupFalls' && s.elapsed > 600 && s.elapsed < 1000) || s.time % 4300 > 4110;
    p.r(x - 4 + turn, y - 19 - tilt, 2, shut || offended ? 1 : 3, '#22303a');
    p.r(x + 6 + turn, y - 19 + tilt, 2, shut || offended ? 1 : 3, '#22303a');
    p.r(x + 1 + turn, y - 16, 2, 1, '#e79aa0'); p.r(x + turn, y - 13, 5, 2, light);
    y = feetY;
    p.r(x - 8, y - 10, 4, 2, stripe); p.r(x - 9, y - 6, 4, 2, stripe);
    const flick = cp.walkFrame >= 0 ? [3, 1, -3, -1][cp.walkFrame] : happy || offended || s.v2 ? Math.round(Math.sin((s.time - 100) / 240) * (happy || offended ? 3 : 2)) : 0;
    p.line(x - 9, y - 2, x - 18, y - 8, orange, 4); p.line(x - 18, y - 8, x - 19 + flick, y - 18, orange, 3);
    p.r(x - 19 + flick, y - 18, 3, 4, light);
    if (lick) {
      p.line(x + 7, y - 3, x + 9, y - 12, light, 4);
      if (Math.sin(s.time / 130) > 0) p.r(x + 7, y - 14, 2, 3, '#e79aa0');
    } else if (s.danger > 0 && !offended && !happy && !['catch', 'lift'].includes(s.reaction)) {
      const reach = Math.round((Math.sin(s.time / 340) + 1) * 4 + s.danger * 8);
      p.line(x + 8, y - 8, x + 15 + reach, y - 13, orange, 4); p.r(x + 14 + reach, y - 14, 4, 3, light);
    }
    if (happy) { p.r(x + 20, y - 33, 1, 5, '#f8d793'); p.r(x + 18, y - 31, 5, 1, '#f8d793'); }
    if (s.v2 && Math.floor(s.time / 140) % 23 === 9) p.r(x + 11 + turn, y - 31, 2, 3, orange);
  }

  function windowFrame(p, x, y, width, height, night) {
    p.r(x - 6, y - 6, width + 12, height + 14, '#785f59');
    p.r(x - 3, y - 3, width + 6, height + 8, '#e1c6a2');
    p.r(x, y, width, height, night ? '#59576e' : '#dbb5b8');
    for (let i = 0; i < 5; i++) {
      const bx = x + i * width / 5, by = y + height * .53 + noise(i) * 14;
      p.r(bx, by, width / 5, height - (by - y), '#7f7f8c');
      p.poly([[bx, by], [bx + 8, by - 10], [bx + width / 5 - 3, by - 10], [bx + width / 5, by]], '#626e80');
      p.r(bx + 8, by - 16, 4, 9, '#626e80');
      p.r(bx + 6, by + 8, 5, 8, '#eaca99');
    }
    p.r(x + width / 2 - 2, y, 4, height, '#e9d4b1'); p.r(x, y + height * .43, width, 3, '#e9d4b1');
    p.r(x - 9, y + height, width + 18, 5, '#f0d9b2'); p.r(x - 5, y + height + 5, width + 10, 3, '#9a7a63');
  }

  function roofBackground(p, s) {
    sky(p, s.night); skyline(p, s.night);
    p.r(0, 179, W, 28, '#a58a88'); p.r(0, 178, W, 5, '#c0a49a');
    p.r(0, 184, W, 2, '#7e737c');
    for (let i = 0; i < 18; i++) { p.r(i * 29, 188, 1, 12, '#86747c'); p.r(i * 29 + 11, 202, 1, 8, '#86747c'); }
    floor(p, 207, s.night, true);
    p.r(13, 111, 37, 100, '#79656b'); p.r(8, 107, 47, 6, '#a58b87'); p.r(18, 89, 10, 19, '#9b6e66'); p.r(34, 84, 9, 23, '#b67c68');
    p.r(16, 87, 14, 4, '#c1967e'); p.r(32, 82, 13, 4, '#ce9d7b');
    for (let y = 117; y < 207; y += 10) { p.r(14, y, 35, 1, '#9a7d7b'); p.r(y % 20 ? 26 : 40, y, 1, 10, '#9a7d7b'); }
    p.poly([[399, 148], [419, 110], [480, 135], [480, 236], [399, 224]], '#555c6c');
    p.poly([[391, 149], [417, 103], [480, 127], [480, 136], [419, 114], [399, 152]], '#87909a');
    p.r(416, 155, 35, 63, '#3d4755'); p.r(420, 159, 27, 54, '#637473'); p.r(423, 162, 21, 30, '#4f6164');
    p.r(441, 194, 2, 4, '#d3b583'); p.r(413, 217, 43, 4, '#b0a293');
    chair(p, 332, 197, 1.12, true);
    p.r(326, 225, 32, 8, '#969c8c'); p.r(326, 225, 8, 20, '#a5aa96'); p.r(328, 242, 1, 5, '#d0c2a4');
    p.r(166, 252, 151, 8, '#725b54'); p.r(175, 260, 8, 16, '#594c4c'); p.r(300, 260, 8, 16, '#594c4c');
    p.r(164, 249, 155, 4, '#b18970');
    for (let i = 0; i < 120; i++) { const x = noise(i + 71) * W; if (x < 72 || x > 400) p.r(x, 275 + noise(i) * 44, 2, 2, '#6f756a'); }
    // A sagging cable, not a straight UI-like string of decorative dots.
    let prev = [21, 68];
    for (let x = 22; x < 459; x++) { const y = 68 + 34 * Math.sin((x - 21) / 438 * Math.PI); p.line(prev[0], prev[1], x, y, '#4c4b58'); prev = [x, y]; }
    for (let i = 0; i < 13; i++) {
      const x = 28 + i * 35, y = 70 + 34 * Math.sin((x - 21) / 438 * Math.PI);
      p.r(x, y, 1, 6, '#59515b'); p.oval(x, y + 8, 6, 6, '#ffd28a12'); p.oval(x, y + 8, 3, 3, '#e9b878'); p.r(x, y + 6, 2, 3, '#ffe8ae');
    }
  }

  function kitchenBackground(p, s) {
    const top = s.top || 0;
    p.r(0, top, W, H - top, s.night ? '#b19a87' : '#ddc6a6');
    p.r(0, top, W, 12, '#f2ddba'); p.r(0, top + 12, W, 3, '#b69b82');
    speckle(p, 0, top + 16, W, 180 - top, 300, s.night ? '#bba28d' : '#e8d3b2');
    p.r(0, 146, W, 57, '#bac0a7');
    for (let y = 146; y < 204; y += 14) { p.r(0, y, W, 1, '#e5d6b6'); for (let x = (y % 28) ? 0 : -14; x < W; x += 28) p.r(x, y, 1, 14, '#dfd3b5'); }
    windowFrame(p, 175, 40, 132, 111, s.night);
    p.poly([[160, 31], [180, 31], [175, 132], [156, 142]], '#e8d7b9'); p.poly([[305, 31], [326, 31], [328, 143], [310, 131]], '#e8d7b9');
    for (let i = 0; i < 4; i++) { p.line(161 + i * 5, 34, 158 + i * 5, 133, '#c9b89e'); p.line(309 + i * 5, 34, 312 + i * 5, 135, '#c9b89e'); }
    p.r(151, 28, 185, 3, '#7f6c58');
    if (!s.night) p.poly([[179, 157], [303, 157], [414, 320], [233, 320]], '#f7d99c28');
    floor(p, 220, s.night, false);
    p.r(0, 181, 133, 52, '#71877b'); p.r(0, 176, 137, 7, '#e3d0ad'); p.r(0, 183, 133, 3, '#48675e');
    for (let x = 6; x < 130; x += 42) { p.r(x, 190, 34, 35, '#94a18b'); p.r(x + 3, 194, 28, 27, '#829681'); p.r(x + 25, 200, 4, 2, '#dbba8b'); }
    p.r(34, 172, 58, 4, '#7f8f87'); p.r(40, 173, 45, 2, '#566f6d');
    p.line(73, 171, 73, 157, '#a5b5a6', 3); p.line(73, 157, 85, 157, '#a5b5a6', 3); p.r(83, 158, 3, 6, '#a5b5a6');
    p.r(8, 69, 111, 5, '#9c785d'); p.r(13, 75, 3, 10, '#86654f'); p.r(108, 75, 3, 10, '#86654f');
    [21, 40, 62, 87].forEach((x, i) => { p.r(x, 51 - i % 2 * 4, 13, 18 + i % 2 * 4, ['#b38d70', '#88a096', '#d4ab72', '#9c807c'][i]); p.r(x - 1, 49 - i % 2 * 4, 15, 3, '#785e4c'); p.r(x + 3, 57, 7, 6, '#ded0ae'); });
    p.r(354, 174, 126, 61, '#8d877d'); p.r(350, 169, 130, 7, '#dfc9a7'); p.r(367, 185, 56, 41, '#4f525a');
    p.r(373, 190, 44, 30, '#343e49'); p.r(376, 193, 38, 4, '#9a9b95');
    [372, 388, 405, 421].forEach(x => p.r(x, 177, 4, 4, '#d1c2a8'));
    p.r(389, 158, 29, 11, '#9ba59a'); p.r(386, 157, 35, 3, '#c4c6ab'); p.r(398, 153, 9, 4, '#737f76');
    p.r(374, 82, 79, 5, '#8e735b'); p.r(384, 87, 2, 14, '#796552');
    for (let i = 0; i < 3; i++) { p.r(393 + i * 20, 89, 2, 12, '#6b6358'); p.oval(394 + i * 20, 108, 6, 8, ['#987a5c', '#a4a797', '#7e877a'][i]); }
    if (s.day !== 9) {
      p.oval(365, 47, 15, 15, '#967962'); p.oval(365, 47, 12, 12, '#efe0bd');
      p.line(365, 47, 365, 39, '#6e6259'); p.line(365, 47, s.night ? 358 : 373, 49, '#6e6259');
    }
    p.r(238, top, 2, 16 - top, '#74615a'); p.poly([[224, 16], [254, 16], [263, 34], [214, 34]], '#6b877a'); p.r(216, 34, 45, 3, '#dcc58e');
    if (s.night) p.poly([[221, 38], [257, 38], [360, 244], [121, 244]], '#ffda8a10');
    chair(p, 122, 208, 1.1); chair(p, 324, 208, 1.1);
  }

  function table(p, s) {
    p.oval(241, 288, 121, 13, '#543e4630');
    p.r(138, 229, 9, 58, '#735343'); p.r(332, 229, 9, 58, '#735343');
    p.poly([[119, 206], [347, 206], [365, 228], [105, 228]], '#c5986e');
    p.r(105, 228, 260, 7, '#9a6c50'); p.r(109, 228, 252, 2, '#e2b081');
    for (let i = 0; i < 5; i++) p.line(126 + i * 45, 208, 118 + i * 48, 226, '#b0825d');
    p.r(153, 215, 74, 1, '#d6a879'); p.r(264, 221, 68, 1, '#e0b589');
    p.poly([[144, 206], [168, 206], [162, 228], [140, 228]], '#e4d4b1'); p.r(140, 229, 22, 14, '#e4d4b1');
    p.r(144, 206, 3, 37, '#8c9c8b'); p.r(154, 206, 2, 37, '#8c9c8b');
    const falling = s.action === 'cupFalls', f = falling ? beat(s, 1050, 150) : 0;
    const x = 179 - Math.round(f * 19), y = 215 + Math.round(f * f * 63);
    p.oval(x, falling ? 281 : 215, 11 - f * 3, 3, '#ab795a');
    if (f < .65) {
      p.r(x - 7, y - 12, 13, 11, '#eee0bc'); p.r(x + 5, y - 10, 5, 6, '#eee0bc'); p.r(x + 6, y - 8, 2, 2, '#b98e68'); p.r(x - 5, y - 12, 9, 2, '#80614c');
    } else {
      // The cup lands intact on its side. No shards, warning flash, or punitive shake.
      p.r(x - 7, y - 8, 14, 10, '#eee0bc'); p.r(x - 10, y - 5, 4, 4, '#eee0bc'); p.r(x + 5, y - 6, 2, 6, '#b6a181');
      if (f === 1) { p.oval(x + 12, 281, 10, 2, '#b09b7f'); p.r(x + 23, 280, 2, 1, '#d9c6a2'); }
    }
  }

  function door(p, x, y, width, height, open, night) {
    open = typeof open === 'boolean' ? Number(open) : clamp(open, 0, 1);
    p.r(x - 7, y - 7, width + 14, height + 12, '#655c5b'); p.r(x - 4, y - 4, width + 8, height + 7, '#c7b49a');
    p.r(x, y, width, height, open ? '#d7aa72' : '#687d73');
    if (open) { p.r(x + 3, y + 4, width - 6, height - 6, night ? '#c39a6b' : '#ead2a1'); p.r(x + 8, y + height - 29, width - 14, 29, '#ad7e5b'); }
    const dw = width * (1 - open * .65);
    p.r(x, y, dw, height, '#63796f'); p.r(x + 5, y + 5, dw - 10, height - 10, '#788d7b');
    p.r(x + 9, y + 17, dw - 18, height * .35, '#5d756d'); p.r(x + 9, y + height * .57, dw - 18, height * .33, '#5d756d');
    p.r(x + dw - 10, y + height * .52, 3, 7, '#d3b27c'); p.r(x + dw - 11, y + height * .53, 6, 2, '#f3d091');
    p.r(x - 6, y + height, width + 12, 4, '#d7bea1');
  }

  function doorwayBackground(p, s) {
    p.r(0, s.top || 0, W, H - (s.top || 0), '#b7a68e'); p.r(0, 139, W, 85, '#7e8b7e');
    for (let x = 0; x < W; x += 48) { p.r(x + 7, 152, 34, 61, '#738275'); p.r(x + 9, 154, 30, 2, '#a1a78e'); }
    p.r(0, 136, W, 4, '#d3bd9c'); p.r(0, 220, W, 5, '#576c63'); floor(p, 225, s.night, false);
    const cue = s.acting?.find(c => c.type === 'door');
    door(p, 194, 36, 108, 194, cue ? cue.openness : s.door !== 'closed', s.night);
    if (s.action !== 'closeDoor') p.poly([[232, 234], [301, 234], [362, 320], [166, 320]], '#f1c98528');
    p.r(173, 256, 142, 19, '#9b8062'); p.r(180, 259, 128, 2, '#b99b72'); p.r(180, 270, 128, 2, '#b99b72');
    for (let i = 0; i < 32; i++) p.r(182 + i * 4, 261, 1, 8, '#826c57');
    p.r(329, 85, 25, 34, '#856c54'); p.r(332, 88, 19, 28, '#dfc59b'); p.r(337, 94, 8, 14, '#93a089');
    p.r(143, 68, 2, 26, '#756359'); p.r(134, 75, 20, 3, '#756359'); p.oval(144, 58, 15, 17, '#f0c88324');
    p.r(138, 48, 12, 20, '#d3b78c'); p.r(140, 50, 8, 14, '#ffe0a0');
    p.r(66, 191, 54, 5, '#8d6d53'); p.r(70, 196, 4, 39, '#6f5949'); p.r(111, 196, 4, 39, '#6f5949');
    p.r(79, 172, 27, 18, '#ad8f6a'); p.r(76, 169, 32, 4, '#ceae82');
    p.line(393, 122, 393, 238, '#6d6257', 3); p.line(378, 136, 407, 136, '#6d6257', 2);
    p.poly([[383, 138], [401, 138], [410, 198], [378, 198]], '#9c7b70');
  }

  function stairsBackground(p, s) {
    if (s.top < 0) { p.r(0, s.top, W, -s.top, '#847d80'); p.r(0, s.top, 150, -s.top, '#6c686f'); }
    p.r(0, 0, W, H, '#847d80'); p.r(0, 125, W, 195, '#5d6b69');
    p.r(0, 120, W, 5, '#b4a594'); speckle(p, 0, 0, W, 120, 240, '#9b8b88');
    p.poly([[0, 0], [150, 0], [150, 180], [0, 261]], '#6c686f');
    p.line(150, 0, 150, 180, '#b3a598', 2); floor(p, 237, true, false);
    door(p, 178, 123, 67, 110, false, true);
    p.r(180, 232, 63, 2, '#f8d996'); p.poly([[181, 235], [241, 235], [275, 258], [162, 258]], '#f6ce8328');
    door(p, 317, 21, 55, 89, false, true);
    p.r(336, 39, 17, 18, '#c2b791'); p.r(339, 42, 11, 12, '#7a8290');
    for (let i = 0; i < 8; i++) {
      const x = 254 + i * 10, y = 222 - i * 15;
      p.r(x, y, 105, 15, '#716c6a'); p.r(x, y, 105, 3, '#bea894'); p.r(x + 5, y + 4, 93, 2, '#8f8179');
      p.r(x + 25, y + 3, 41, 12, '#8e6a69'); p.r(x + 28, y + 3, 2, 12, '#baa18b');
    }
    for (let i = 0; i < 8; i++) {
      const x = 14 + i * 18, y = 255 + i * 8;
      p.r(x, y, 117, 13, '#655c5d'); p.r(x, y, 117, 3, '#a9917b');
    }
    for (let i = 0; i < 9; i++) { const x = 254 + i * 10, y = 190 - i * 15; p.line(x, y, x, y + 31, '#3f464c', 2); }
    p.line(253, 190, 337, 65, '#c1a581', 3); p.line(253, 194, 337, 69, '#403f48', 2);
    p.r(250, 186, 4, 55, '#45434b'); p.oval(252, 184, 4, 4, '#c1a581');
    for (let i = 0; i < 8; i++) p.line(13 + i * 18, 227 + i * 8, 13 + i * 18, 255 + i * 8, '#43434a', 2);
    p.line(12, 226, 147, 286, '#b39b7f', 3);
    p.oval(280, 63, 30, 31, '#f3d39012'); p.r(274, 51, 14, 19, '#cdb58e'); p.r(277, 53, 8, 14, '#ffe0a0');
    p.r(280, 70, 2, 9, '#544f51'); p.r(272, 79, 18, 2, '#544f51');
  }

  function lefevreBackground(p, s) {
    const top = s.top || 0;
    p.r(0, top, W, H - top, '#a89586');
    for (let x = 8; x < W; x += 19) { p.r(x, top, 1, 201 - top, '#b4a18b'); for (let y = 20 - Math.ceil(-top / 23) * 23; y < 190; y += 23) { p.r(x + 7, y, 2, 4, '#958c7d'); p.r(x + 5, y + 1, 6, 1, '#958c7d'); } }
    p.r(0, 198, W, 5, '#d1b896'); p.r(0, 203, W, 17, '#6d766a'); floor(p, 220, true, false);
    windowFrame(p, 302, 43, 111, 112, true);
    p.r(289, 31, 137, 3, '#756356'); p.poly([[291, 36], [312, 36], [303, 145], [286, 157]], '#785e6b');
    p.poly([[405, 36], [424, 36], [429, 157], [412, 146]], '#785e6b');
    for (let i = 0; i < 4; i++) { p.line(292 + i * 4, 37, 288 + i * 4, 151, '#997e82'); p.line(406 + i * 4, 37, 414 + i * 4, 150, '#997e82'); }
    pot(p, 359, 155, 3, 0, true);
    p.r(40, 126, 86, 100, '#745b50'); p.r(36, 122, 94, 5, '#ae8b69');
    for (let i = 0; i < 3; i++) { p.r(46, 135 + i * 28, 74, 23, '#93755b'); p.r(78, 145 + i * 28, 10, 2, '#d5b581'); }
    p.r(53, 110, 37, 9, '#5e6463'); p.r(57, 107, 30, 3, '#ad8f78'); p.r(52, 119, 42, 3, '#bd996d');
    p.r(95, 105, 16, 17, '#ceba9b'); p.r(98, 108, 10, 10, '#8e9490');
    p.r(76, 42, 42, 47, '#725647'); p.r(79, 45, 36, 41, '#d1b18b'); p.r(84, 50, 26, 31, '#86978b');
    p.poly([[84, 74], [95, 59], [110, 76]], '#b4b79a'); p.r(84, 76, 26, 5, '#717d75');
    p.line(242, top, 242, 37, '#79685b'); p.poly([[224, 37], [261, 37], [274, 60], [212, 60]], '#dfbd86'); p.r(213, 60, 60, 3, '#f9dca0');
    p.poly([[218, 65], [267, 65], [351, 247], [134, 247]], '#ffdc8d0c');
    p.oval(243, 266, 132, 37, '#8e6a67'); p.oval(243, 266, 121, 31, '#b38b78'); p.oval(243, 266, 111, 26, '#95736a');
    chair(p, 220, 157, .95);
    if (!s.v2) { chair(p, 139, 199, 1.05); chair(p, 308, 199, 1.05); }
    if (s.v2) {
      const x = 144;
      p.r(x, 104, 27, 38, '#ede0b6'); p.r(x, 104, 27, 7, '#947b70');
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) p.r(x + 3 + col * 5, 116 + row * 7, 2, 2, '#9d8b75');
      p.r(x + 17, 122, 4, 4, '#7f566f');
    }
  }

  function dinnerTable(p, s) {
    p.r(230, 230, 9, 48, '#6c4d42'); p.r(252, 230, 8, 48, '#6c4d42');
    p.oval(243, 225, 90, 33, '#7d5748'); p.oval(243, 218, 91, 33, '#c29b74');
    p.oval(243, 216, 85, 29, '#e3ceb0'); p.oval(243, 216, 76, 24, '#e8d7b8');
    for (let i = 0; i < 22; i++) { const x = 171 + i * 7; p.r(x, 223 + Math.round(Math.sin(i / 21 * Math.PI) * 17), 2, 2, '#bca88d'); }
    [[190, 214], [242, 195], [297, 215], [244, 236]].forEach(([x, y]) => {
      p.oval(x, y, 16, 6, '#bba58c'); p.oval(x, y - 1, 14, 5, '#f7e9cd'); p.oval(x, y - 2, 9, 3, '#d3a16b');
      p.line(x + 20, y - 5, x + 20, y + 5, '#c4c3ad'); p.oval(x + 20, y - 6, 2, 3, '#d4d3ba');
      p.r(x - 15, y - 13, 5, 7, '#c9c3ad'); p.r(x - 14, y - 12, 2, 4, '#eee0c3');
    });
    p.oval(244, 216, 19, 9, '#c5af90'); p.oval(244, 212, 20, 7, '#798f80'); p.oval(244, 210, 17, 5, '#dba666');
    p.r(221, 210, 5, 3, '#a1ad95'); p.r(263, 210, 5, 3, '#a1ad95');
    const breadX = s.v2 ? 204 : 275;
    p.oval(breadX, 202, 13, 5, '#a88866'); p.oval(breadX, 201, 11, 4, '#e1b479');
    for (let i = 0; i < 3; i++) p.line(breadX - 6 + i * 5, 199, breadX - 4 + i * 5, 202, '#f4d295');
    steam(p, 242, 197, s.time);
  }

  function facadeBackground(p, s) {
    const progress = s.establishingProgress;
    if (progress != null) {
      const original = p;
      const tint = c => ['#f2cf8e', '#dcb17b'].includes(c) ? c : progress < .5 ? mix(c, '#ffe3b5', (.5 - progress) * .45) : mix(c, '#29334f', (progress - .5) * .55);
      p = { ...p, r: (x, y, w, h, c) => original.r(x, y, w, h, tint(c)),
        line: (x, y, xx, yy, c, w) => original.line(x, y, xx, yy, tint(c), w),
        poly: (points, c) => original.poly(points, tint(c)), oval: (x, y, rx, ry, c) => original.oval(x, y, rx, ry, tint(c)) };
      const day = ['#a4c5cc', '#b6ced0', '#c9d6cf', '#dfdfc9', '#eee3c9', '#f3d3bd'];
      const dusk = ['#9b849d', '#b594a8', '#cc9fae', '#e4b0b5', '#efc2ba', '#f3d3bd'];
      const night = ['#33394f', '#43435e', '#56516b', '#6f6079', '#977486', '#b98a91'];
      day.forEach((c, i) => original.r(0, i * 30, W, 31, progress < .5 ? mix(c, dusk[i], progress * 2) : mix(dusk[i], night[i], progress * 2 - 1)));
      if (progress < .5) {
        original.oval(346, 34, 12, 12, mix('#fff0cc', '#e9b9bd', progress * 2));
        [[43, 30, 61], [283, 20, 45], [375, 73, 68]].forEach(([x, y, w]) => {
          p.r(x, y, w, 3, '#e7ded0'); p.r(x + 12, y - 3, w - 25, 3, '#e7ded0');
        });
      }
      skyline(p, progress > .6, -40);
      if (progress > .65) original.oval(346, 42, 9, 9, mix('#797084', '#f7e6c3', (progress - .65) / .35));
    } else { sky(p, true); skyline(p, true, -40); }
    const height = s.facadeHeight || H, rows = Math.max(3, Math.ceil((height - 140) / 71));
    p.r(86, 116, 314, height - 116, '#a2918d');
    if (progress != null) {
      p.r(86, 126, 209, height - 126, '#b5a293');
      p.poly([[295, 126], [400, 126], [400, height], [354, height], [354, 203]], '#94898a');
      for (let y = 132; y < height; y += 18) {
        p.r(98, y, 288, 1, '#9d9087');
        for (let x = 100 + (y % 36 ? 0 : 26); x < 390; x += 52) p.r(x, y + 1, 1, 17, '#a39589');
      }
    }
    p.poly([[71, 120], [115, 61], [365, 61], [414, 120]], '#535f72');
    for (let i = 0; i < 9; i++) p.line(116 + i * 30, 65, 91 + i * 37, 116, '#7d8795');
    if (progress != null) {
      p.poly([[296, 63], [365, 63], [410, 117], [339, 117]], '#48566a');
      for (let y = 76; y < 118; y += 13) p.line(117 - (y - 61) * .7, y, 366 + (y - 61) * .8, y, '#69788a');
      p.r(86, 129, 314, 5, '#817b7b');
    }
    p.r(74, 119, 337, 6, '#c2ada0'); p.r(82, 125, 321, 4, '#726e77');
    p.r(110, 44, 14, 32, '#b58372'); p.r(107, 42, 20, 5, '#d5a080');
    p.r(347, 40, 13, 34, '#a3786b'); p.r(344, 38, 19, 5, '#d5a080');
    for (let row = 0; row < rows; row++) {
      const y = 140 + row * 71;
      p.r(86, y + 54, 314, 4, '#ccb6a0'); p.r(86, y + 59, 314, 2, '#857a7b');
      for (let col = 0; col < 4; col++) {
        const x = 111 + col * 74;
        const order = row * 4 + [0, 2, 1, 3][col];
        const lit = progress == null ? (row === 1 && col === 2) || (row === 0 && col === 0) : progress >= .38 + order * .6 / (rows * 4 - 1);
        p.r(x - 4, y - 4, 44, 52, '#bca997'); p.r(x, y, 36, 44, lit ? '#f2cf8e' : '#596172');
        p.r(x + 3, y + 2, 30, 40, lit ? '#dcb17b' : '#686b7d');
        if (progress != null) {
          p.r(x - 5, y - 5, 46, 2, '#e0c9aa'); p.r(x - 4, y - 3, 2, 47, '#d6c0a4');
          p.r(x + 36, y, 4, 44, '#817876');
          if (!lit) {
            p.r(x + 4, y + 3, 11, 16, '#92a6ac');
            p.poly([[x + 20, y + 3], [x + 32, y + 3], [x + 32, y + 10], [x + 20, y + 18]], '#8497a2');
            p.r(x + 4, y + 24, 10, 9, '#7b8b96');
          }
          p.r(x - 3, y + 48, 47, 4, '#887e7a');
        }
        if (lit) { p.poly([[x + 3, y + 2], [x + 13, y + 2], [x + 9, y + 31], [x + 3, y + 39]], '#aa7e74'); p.r(x + 26, y + 2, 7, 35, '#aa7e74'); }
        p.r(x + 17, y, 2, 44, '#c6b19b'); p.r(x, y + 20, 36, 2, '#c6b19b');
        p.r(x - 6, y + 44, 48, 4, '#d9c0a4');
        p.r(x - 4, y + 35, 44, 2, '#454c59'); for (let j = 0; j < 7; j++) p.r(x + j * 6, y + 35, 1, 11, '#454c59');
      }
    }
    speckle(p, 87, 129, 310, height - 130, 110, '#bca79a', 222);
    p.r(94, 126, 3, height - 126, '#78767b'); p.r(390, 126, 3, height - 126, '#d2bba4');
    p.r(216, 92, 66, 25, '#9a8b87'); p.r(213, 89, 72, 4, '#c5afa0');
    pot(p, 248, 92, s.basilPlanted ? Math.max(2, s.growth[1]) : 0, 0, true);
  }

  function steam(p, x, y, time) {
    for (let i = 0; i < 3; i++) {
      const phase = (time / 90 + i * 9) % 25;
      p.r(x + i * 5 + Math.sin(phase / 4) * 2, y - phase, 2, 4, '#f5dfbe70');
    }
  }

  function kitchenPot(s) {
    if (s.action === 'sleepBetweenPots') return { x: 310, y: 216, wobble: 0 };
    const catching = s.reaction === 'catch';
    const danger = ['catdone', 'cupFalls'].includes(s.action) ? 0 : s.danger;
    return { x: catching ? 342 : 282 + Math.round(danger * 43), y: catching ? 237 : 216,
      wobble: catching ? 0 : Math.sin(s.time / 95) * danger * 3 };
  }

  function kitchenCat(s) {
    if (['catdone', 'cupFalls'].includes(s.action)) return 242 - Math.round((s.action === 'cupFalls' ? 1 : beat(s, 1350)) * 16);
    if (s.action === 'sleepBetweenPots') return 255;
    return s.night ? 251 : s.reaction === 'catch' ? 280 : kitchenPot(s).x - 40;
  }

  function facadePan(s) {
    if (s.establishingProgress != null) return 0;
    return s.scene === 'facade' ? Math.round(20 * (1 - Math.min(1, (s.action ? s.elapsed : s.time) / 3600))) : 0;
  }

  function foreground(p, s) {
    if (s.scene === 'facade' && s.establishingProgress != null) return;
    if (s.scene === 'roof') {
      if (s.rooftopUnlocked) {
        person(p, 96, 245, 'camille', s.time);
        person(p, 370, 249, 'noe', s.time + 400, s.water ? 'hold' : 'idle');
      }
      // Martin's living plant remains in the kitchen; the roof has unused planters.
      pot(p, 198, 249, 0, s.time);
      const planting = s.action === 'plantBasil', planted = s.basilPlanted || planting;
      const lowering = planting ? 18 * (1 - beat(s, 1500)) : 0;
      if (s.focus === 'basil' && !planted) {
        p.oval(280, 234, 28, 23, '#ffe2a518'); p.oval(280, 226, 22, 9, '#ffe2a522');
      }
      pot(p, 280, 249, planted ? Math.max(2, s.growth[1]) : 0, s.time, true, 0,
        { plantOffset: -lowering, leafLift: s.action === 'leafLifts' ? 4 * beat(s, 1900) : 0 });
      if (planting && s.elapsed < 2200) {
        const withdraw = beat(s, 600, 1500) * 18;
        p.line(263 - withdraw, 236, 268 - withdraw, 220 - lowering, '#738a7a', 5);
        p.line(300 + withdraw, 236, 294 + withdraw, 220 - lowering, '#738a7a', 5);
        p.r(266 - withdraw, 215 - lowering, 6, 8, P.skin); p.r(289 + withdraw, 215 - lowering, 6, 8, P.skin);
      }
      if (!s.water) can(p, 134, 261, 0, s.time);
      if (s.cat && s.rooftopUnlocked) cat(p, 247, 281, planting ? Object.assign({}, s, { danger: .55 }) : s);
      pot(p, 60, 287, 0, s.time);
      p.r(48, 295, 18, 3, '#b8a28c'); p.r(49, 292, 3, 3, '#7b796b');
    } else if (s.scene === 'kitchen') {
      const lifting = ['catdone', 'cupFalls'].includes(s.action);
      const lifted = s.action === 'cupFalls' ? 1 : beat(s, 1350);
      person(p, lifting ? 128 + 64 * lifted : 128, 221, 'camille', s.time, lifting ? 'lift' : 'idle');
      if (s.reaction !== 'catch') person(p, 332, 224, 'noe', s.time + 620);
      table(p, s);
      const target = kitchenPot(s);
      if (s.action === 'sleepBetweenPots' || (s.night && !s.basilPlanted)) pot(p, s.action === 'sleepBetweenPots' ? 202 : 221, 216, Math.max(2, s.growth[1]), s.time, true);
      if (s.cat) cat(p, kitchenCat(s), lifting ? 212 - 15 * lifted : 212, lifting ? Object.assign({}, s, { reaction: 'lift', danger: 0 }) : s);
      if (lifting && s.cat) {
        const x = kitchenCat(s), y = 212 - 15 * lifted;
        p.line(x - 22, y + 2, x - 8, y + 2, '#377c60', 5); p.r(x - 9, y - 1, 7, 4, P.skin);
        p.r(x + 8, y - 2, 7, 4, P.skin);
      }
      if (s.reaction === 'catch') person(p, 359, 270, 'noe', s.time, 'catch');
      pot(p, target.x, target.y, s.growth[0], s.time, false, target.wobble);
      if (!s.water) can(p, 98, 176, 0, s.time);
      if (s.action !== 'cupFalls') steam(p, 175, 199, s.time);
      p.r(388, 217, 24, 17, '#ded2b2'); p.r(392, 217, 3, 17, '#839888'); p.r(403, 217, 2, 17, '#839888');
    } else if (s.scene === 'doorway' || (s.scene === 'lefevre' && handover(s))) {
      const doorCue = s.acting?.find(c => c.type === 'door');
      const closing = s.action === 'closeDoor', f = closing ? beat(s, 1400, 200) : 0;
      const entrance = doorCue ? doorCue.openness : s.door === 'closed' ? 0 : 1;
      const offering = ['openHand', 'giveKey'].includes(s.action);
      const key = entrance > .12 ? person(p, 254 + f * 6 + (1 - entrance) * 22, 239 - f * 14 - (1 - entrance) * 10, 'lefevre', s.time, offering ? 'offer' : handover(s) || s.night ? 'idle' : 'hold', 1.18,
        { reach: beat(s, 1100) * (s.action === 'giveKey' ? 1 : .35) }) : null;
      if (!handover(s) && !s.night && entrance > .12 && !s.acting?.some(c => ['handover','object'].includes(c.type) && c.object === 'basil')) pot(p, 246 + (1 - entrance) * 22, 219 - (1 - entrance) * 10, Math.max(2, s.growth[1]), s.time, true);
      if (doorCue || s.door === 'closed') {
        // The swinging leaf occludes the neighbour until she steps through it.
        const dw = 108 * (1 - entrance * .65);
        p.r(194, 36, dw, 194, '#63796f'); p.r(199, 41, dw - 10, 184, '#788d7b');
        p.r(203, 53, dw - 18, 68, '#5d756d'); p.r(203, 146, dw - 18, 64, '#5d756d');
        p.r(194 + dw - 10, 137, 3, 7, '#d3b27c');
      }
      if (closing && !doorCue) {
        const dw = Math.round(38 + f * 70);
        p.r(194, 36, dw, 194, '#63796f'); p.r(199, 41, dw - 10, 184, '#788d7b');
        p.r(203, 53, dw - 18, 68, '#5d756d'); p.r(203, 146, dw - 18, 64, '#5d756d');
        p.r(194 + dw - 10, 137, 3, 7, '#d3b27c');
        p.r(195, 231, 105, 1, '#f5d59a');
      }
      person(p, handover(s) ? 190 : 159, handover(s) ? 251 : 270, 'camille', s.time + 300, s.action === 'giveKey' ? 'receive' : 'idle', 1.15,
        { reach: beat(s, 850, 600), key });
      if (s.cat) cat(p, 318, 275, s);
    } else if (s.scene === 'stairs') {
      const progress = s.walkProgress == null ? 0 : s.walkProgress;
      const moving = progress > 0 && progress < 1;
      const dx = s.direction === 'up' ? progress * 67 : -progress * 68;
      const dy = s.direction === 'up' ? -progress * 105 : progress * 32;
      const strideTime = progress * 3600;
      person(p, 263 + dx, 219 + dy, 'camille', moving ? strideTime : s.time, moving ? 'walk' : 'idle');
      person(p, 285 + dx, 232 + dy, 'noe', moving ? strideTime + 190 : s.time + 200, moving ? 'walk' : 'idle');
      if (s.cat) cat(p, 214, 254, s);
      steam(p, 218, 232, s.time);
    } else if (s.scene === 'lefevre') {
      const laugh = ['firstLaugh', 'moveBasilAndLaugh'].includes(s.action) && s.elapsed > 300 && s.elapsed < 2600;
      person(p, 227, 218, 'lefevre', s.time, laugh ? 'laugh' : 'idle');
      if (!s.v2) {
        person(p, 143, 249, 'camille', s.time + 300, laugh && s.action === 'moveBasilAndLaugh' ? 'laugh' : 'idle');
        person(p, 311, 249, 'noe', s.time + 700, laugh && s.action === 'moveBasilAndLaugh' ? 'laugh' : 'idle');
      }
      dinnerTable(p, s);
      if (s.v2) {
        chair(p, 117, 190, 1.05); chair(p, 337, 190, 1.05);
        person(p, 120, 225, 'camille', s.time + 300, laugh && s.action === 'moveBasilAndLaugh' ? 'laugh' : 'idle');
        person(p, 340, 225, 'noe', s.time + 700, laugh && s.action === 'moveBasilAndLaugh' ? 'laugh' : 'idle');
      }
      if (s.action === 'coverKey' || s.action === 'moveBasilAndLaugh') {
        const f = beat(s, 950), x = 263;
        p.r(x, 202, 4, 3, '#d8bb7d'); p.r(x + 4, 203, 6, 1, '#d8bb7d');
        p.line(249, 190, 249 + f * 11, 195 + f * 7, '#815574', 6);
        p.r(247 + f * 11, 191 + f * 8, 16, 6, P.skin);
      }
      if (s.focus === 'key') {
        p.oval(266, 222, 3, 3, '#d8bb7d'); p.oval(266, 222, 1, 1, '#8e6a67');
        p.r(269, 221, 10, 2, '#d8bb7d'); p.r(275, 222, 2, 4, '#d8bb7d'); p.r(278, 222, 2, 4, '#d8bb7d');
      }
      const basilX = 280 + (s.action === 'moveBasilAndLaugh' ? Math.round(beat(s, 1400) * 24) : 0);
      pot(p, basilX, 208, 2, s.time, true);
      if (s.action === 'moveBasilAndLaugh') {
        p.line(320, 204, basilX + 12, 203, '#c2714c', 5); p.r(basilX + 8, 199, 6, 5, P.skin);
      }
      chair(p, 221, 251, 1.1);
      if (s.cat) cat(p, 241, 279, s);
    } else if (s.scene === 'facade') {
      // Her empty hands rest below the sill. No key insert or explanatory close-up.
      person(p, 269, 255, 'lefevre', s.time, 'idle', .58);
      p.r(255, 252, 44, 2, '#454c59');
      for (let i = 0; i < 7; i++) p.r(259 + i * 6, 252, 1, 10, '#454c59');
      p.r(253, 263, 48, 4, '#d9c0a4');
      p.r(284, 238, 1, 12, '#7f6456'); p.poly([[278, 236], [292, 236], [295, 243], [276, 243]], '#ffe1a1');
    }
    if (s.water > 0 && (s.scene === 'roof' || s.scene === 'kitchen')) {
      const target = s.scene === 'roof' ? { x: 280, y: 220 } : { x: kitchenPot(s).x, y: 187 };
      for (let i = 0; i < 26; i++) {
        const f = (s.time / 850 + i / 26) % 1;
        const x = target.x - 39 * (1 - f) + Math.sin(i * 4) * f * 6;
        const y = target.y - 47 + f * f * 47;
        p.r(x, y, i % 3 ? 1 : 2, 2 + i % 2, i % 2 ? '#c7e2df' : '#8bbabe');
      }
      for (let i = 0; i < 7; i++) {
        const f = (s.time / 500 + i / 7) % 1;
        p.r(target.x + (i - 3) * f * 5, target.y - Math.sin(f * Math.PI) * 7, 2, 1, '#c6dfd5');
      }
      // Move the same can to the plant; its spout meets the particle arc.
      can(p, target.x - 70, target.y - 14, s.water, s.time);
    }
    if (s.focus) {
      const h = rawHotspots(s)[s.focus];
      if (h) {
        const pulse = Math.round((Math.sin(s.time / 380) + 1) * 2), x = h[0] - h[2] / 2 - pulse, y = h[1] - h[3] / 2 - pulse;
        const w = h[2] + pulse * 2, ht = h[3] + pulse * 2;
        [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + ht, 1, -1], [x + w, y + ht, -1, -1]].forEach(([xx, yy, dx, dy]) => {
          p.line(xx, yy, xx + dx * 6, yy, '#ffe2a5'); p.line(xx, yy, xx, yy + dy * 6, '#ffe2a5');
        });
      }
    }
    // Foreground edge shadow provides depth without dimming the active objects.
    p.r(0, 309, W, 11, '#302b3e0a'); p.r(0, 316, W, 4, '#302b3e12');
  }

  const backgrounds = { roof: roofBackground, kitchen: kitchenBackground, doorway: doorwayBackground, stairs: stairsBackground, lefevre: lefevreBackground, facade: facadeBackground };

  function rawHotspots(s) {
    if (s.scene === 'facade' && s.establishingProgress != null) return {};
    const kp = kitchenPot(s);
    const roofCan = s.water ? [216, 187, 59, 43] : [140, 242, 59, 43];
    const kitchenCan = s.water ? [kp.x - 64, 154, 59, 43] : [104, 157, 57, 42];
    if (handover(s) && (s.scene === 'lefevre' || s.scene === 'doorway')) return {
      door: [250, 136, 110, 196], lefevre: [268, 201, 40, 80], hand: [237, 218, 34, 28], cat: [318, 258, 46, 38]
    };
    const lifting = ['catdone', 'cupFalls'].includes(s.action);
    const catY = lifting ? 195 - 15 * (s.action === 'cupFalls' ? 1 : beat(s, 1350)) : s.action === 'sleepBetweenPots' ? 204 : 195;
    const kitchenBasil = s.action === 'sleepBetweenPots' ? [202, 185, 44, 66] : [221, 185, 44, 66];
    return ({
      roof: { pot: [280, 220, 48, 62], basil: [280, 220, 48, 62], emptyPot: [280, 220, 48, 62], chair: [351, 224, 50, 64], door: [433, 185, 38, 66], can: roofCan, cat: [247, 264, 45, 38] },
      kitchen: { pot: [kp.x, kp.y - 29, 48, 66], basil: kitchenBasil, can: kitchenCan, cat: [kitchenCat(s), catY, 48, 36], chair: [340, 241, 49, 61] },
      doorway: { basil: [246, 187, 48, 69], pot: [246, 187, 48, 69], door: [250, 136, 110, 196], cat: [318, 258, 46, 38] },
      stairs: { door: [344, 66, 60, 94], down: [210, 179, 70, 116], up: [344, 66, 60, 94], cat: [214, 237, 46, 38] },
      lefevre: { chair: [241, 278, 51, 61], cat: [241, 263, 46, 38], basil: [280 + (s.action === 'moveBasilAndLaugh' ? Math.round(beat(s, 1400) * 24) : 0), 185, 32, 48], pot: [359, 126, 48, 66], table: [243, 220, 184, 70], soup: [244, 212, 48, 30], bread: [s.v2 ? 204 : 275, 201, 31, 22], calendar: [433, 123, 32, 42], key: [273, 222, 30, 22] },
      facade: { window: [277, 235, 48, 57], basil: [248, 69, 48, 52], pot: [248, 69, 48, 52] }
    })[s.scene];
  }

  function getHotspots(scene, options) {
    const s = state(typeof scene === 'object' ? scene : Object.assign({}, options, { scene }));
    if (s.v2) return v2Hotspots(s, layout(null, s));
    const result = {};
    Object.entries(rawHotspots(s)).forEach(([id, rect]) => {
      if (id === 'cat' && (!s.cat || (s.scene === 'roof' && !s.rooftopUnlocked))) return;
      if (id === 'basil' && s.scene === 'kitchen' && s.action !== 'sleepBetweenPots' && (!s.night || s.basilPlanted)) return;
      if (['basil', 'pot'].includes(id) && s.scene === 'doorway' && s.night) return;
      if (id === 'lefevre' && s.action === 'closeDoor' && s.elapsed >= 1600) return;
      const [x, y, width, height] = rect;
      result[id] = { id, x: x / W * 100, y: (y + facadePan(s)) / H * 100, width: width / W * 100, height: height / H * 100, visible: true };
    });
    return result;
  }

  function projectHotspots(canvas, options) {
    if (options && options.v2) return v2Hotspots(state(options), layout(canvas, options));
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth || rect.width || W, height = canvas.clientHeight || rect.height || H;
    const scale = Math.max(width / W, height / H), ox = (width - W * scale) / 2, oy = (height - H * scale) / 2;
    const spots = getHotspots(options || {});
    Object.values(spots).forEach(h => {
      h.x = (h.x / 100 * W * scale + ox) / width * 100;
      h.y = (h.y / 100 * H * scale + oy) / height * 100;
      h.width = h.width / 100 * W * scale / width * 100;
      h.height = h.height / 100 * H * scale / height * 100;
      h.visible = h.x + h.width / 2 > 0 && h.x - h.width / 2 < 100 && h.y + h.height / 2 > 0 && h.y - h.height / 2 < 100;
    });
    return spots;
  }

  function draw(canvas, options) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('Day8Art.draw requires a canvas');
    if (options && options.v2) return drawV2(canvas, state(options));
    const s = state(options), ctx = canvas.getContext('2d');
    if (!ctx) return {};
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    canvas.style.imageRendering = 'pixelated'; canvas.style.objectFit = 'cover'; canvas.style.objectPosition = '50% 50%';
    ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    try {
      let stored = cache.get(canvas);
      const backdrop = s.scene === 'lefevre' && handover(s) ? 'doorway' : s.scene;
      const key = backdrop + ':' + s.night + ':' + (s.action === 'closeDoor') + (s.scene === 'facade' ? ':' + s.growth[1] + ':' + s.basilPlanted + ':' + s.establishingProgress : '');
      if (!stored || stored.key !== key) {
        const background = canvas.ownerDocument.createElement('canvas'); background.width = W; background.height = H;
        backgrounds[backdrop](painter(background.getContext('2d')), s);
        stored = { key, background }; cache.set(canvas, stored);
      }
      if (s.scene === 'facade') {
        ctx.fillStyle = '#33394f'; ctx.fillRect(0, 0, W, H);
        ctx.translate(0, facadePan(s));
      }
      ctx.drawImage(stored.background, 0, 0);
      foreground(painter(ctx), s);
    } finally { ctx.restore(); }
    return projectHotspots(canvas, s);
  }

  // V2 keeps its portrait layout separate from the tested 480x320 composition.
  function motion(options) {
    const s = state(options), g = s.catGame || {}, reduced = s.reducedMotion;
    const t = reduced ? 0 : Math.floor(s.time / (1000 / 24)) * (1000 / 24);
    const smooth = n => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };
    const elapsed = reduced ? 2000 : clamp(g.elapsed == null ? s.elapsed : g.elapsed, 0, 1e12);
    const age = reduced ? 2000 : clamp(g.approachElapsed == null ? elapsed : g.approachElapsed, 0, 1e12);
    const approach = g.active ? smooth(age / 1200) : reduced ? 1 : 0;
    // Reference 11-13s: feet alternate, settle, lower head, then extend the paw.
    // Idle and approach share the same on-screen origin, including beat entry.
    const ready = g.active ? smooth((age - 1450) / 1200) : 0;
    const anticipation = g.active && age >= 1200 && age < 1450 ? (age < 1325 ? 1 : 2) : 0;
    const walkFrame = g.active && age > 0 && age < 1200 && !reduced ? Math.floor(age / 125) % 4 : -1;
    const reach = clamp(g.reach == null ? s.danger : g.reach, 0, 1);
    const blocked = clamp(g.blocked, 0, 1);
    const potX = 282 + reach * 34 * ready;
    let x = 202 + 38 * approach + reach * 34 * ready;
    let y = 212;
    const lifting = ['lift', 'done'].includes(g.phase) || ['catdone', 'cupFalls'].includes(s.action);
    const liftElapsed = reduced || g.phase === 'done' || s.action === 'cupFalls' ? 1600 : (g.phaseElapsed == null ? s.elapsed : g.phaseElapsed);
    const lift = lifting ? smooth((liftElapsed - 250) / 1100) : 0;
    const hold = lifting ? smooth(liftElapsed / 250) : 0;
    const from = g.liftFrom || { x, y, potX };
    if (lifting) { x = from.x + (226 - from.x) * lift; y = from.y + (181 - from.y) * lift; }
    const phase = Math.floor(t / 83.333);
    const people = {};
    ['camille', 'noe', 'lefevre', 'gaspard'].forEach((who, i) => {
      const local = t + i * 619;
      people[who] = {
        bob: reduced ? 0 : Math.round(Math.sin(local / 710)),
        tilt: reduced ? 0 : Math.round(Math.sin(local / 1100)),
        blink: !reduced && local % 3200 > 3033,
        mouth: !reduced && s.speaker.toLowerCase().includes(who) ? [0, 1, 2, 1][phase % 4] : 0
      };
    });
    return { time: t, people, cat: { x, y, potX: lifting ? from.potX : potX, lift, hold, approach,
      walkFrame: lifting ? -1 : walkFrame,
      stride: lifting || walkFrame < 0 ? 0 : [-3, 0, 3, 0][walkFrame],
      headBob: lifting || walkFrame < 0 ? 0 : [0, 1, 0, -1][walkFrame],
      anticipation: lifting || reduced ? 0 : anticipation,
      squash: lifting || reduced ? 0 : Math.max(anticipation, Math.round(blocked * 2)),
      paw: lifting ? 0 : ready * (1 - blocked) * (4 + reach * 12 + (reduced ? 0 : Math.sin(t / 340) * 3)) } };
  }

  function layout(canvas, options) {
    const rect = canvas ? canvas.getBoundingClientRect() : {};
    const cw = canvas && canvas.clientWidth || rect.width || 390, ch = canvas && canvas.clientHeight || rect.height || 844;
    const width = 320, height = Math.round(width * Math.max(667 / 390, ch / cw));
    const scene = options && options.scene || 'roof';
    const scale = scene !== 'roof' && scene !== 'facade' ? 1.12 : 1;
    const oy = scene === 'facade' ? Math.round(height * .05) : scene === 'roof' ? Math.round(height * .18) : Math.round(height * .76 - 300 * scale);
    return { width, height, portrait: true, scale, ox: (width - W * scale) / 2, oy,
      storyPlantStage: Math.max(2, clamp(options && options.growth && options.growth[0], 0, 5)) };
  }

  function placed(p, x, y, scale = 1) {
    return {
      r: (a, b, w, h, c) => p.r(x + a * scale, y + b * scale, w * scale, h * scale, c),
      line: (a, b, c, d, color, width = 1) => p.line(x + a * scale, y + b * scale, x + c * scale, y + d * scale, color, Math.max(1, width * scale)),
      poly: (points, color) => p.poly(points.map(([a, b]) => [x + a * scale, y + b * scale]), color),
      oval: (a, b, rx, ry, color) => p.oval(x + a * scale, y + b * scale, rx * scale, ry * scale, color), ctx: p.ctx
    };
  }

  function shelfSlots(s, l) {
    const garden = s.garden || {}, source = garden.slots || garden.pots || [
      { id: 1, growth: Math.max(2, s.growth[0]), bay: 0, row: 0, col: 3 },
      { id: 2, growth: s.basilPlanted ? Math.max(2, s.growth[1]) : 0, bay: 0, row: 0, col: 4, basil: true }
    ];
    const slots = source.map((item, i) => ({ ...item, id: item.id == null ? i + 1 : item.id,
      bay: Math.floor(clamp(item.bay == null ? Math.floor(i / 24) : item.bay, 0, 10000)),
      row: Math.floor(clamp(item.row == null ? Math.floor(i % 24 / 8) : item.row, 0, 2)),
      col: Math.floor(clamp(item.col == null ? i % 8 : item.col, 0, 7)) }));
    const bays = Math.max(1, ...slots.map(item => item.bay + 1));
    const selected = slots.find(item => String(item.id) === String(s.water > 0 && s.targetPotId != null ? s.targetPotId : garden.selectedPot));
    const bay = selected && (garden.zoom === 'pot' || s.water > 0) ? selected.bay : Math.round(clamp(garden.bay, 0, bays - 1));
    const overview = garden.zoom === 'overview';
    const compact = !!s.garden && slots.length > 0 && slots.length <= 2 && !overview;
    const padding = 15, area = l.width - padding * 2;
    const pitch = area / 8, scale = compact ? 1.05 : overview ? .38 : Math.min(.72, pitch / 52);
    const top = compact ? Math.round(l.height * .64) : l.oy + 182, step = 61, feet = compact ? Math.round(l.height * .81) : l.oy + 326;
    const catX = s.action === 'review' ? l.width - 43 : l.width / 2 + 28;
    const catFeet = s.action === 'review' ? top - 89 : feet - 6;
    const canX = compact ? l.width * .24 - 6 : l.width / 2 - 42;
    const canY = compact ? l.height * .72 + 14 : feet - 6;
    return { slots, bays, bay, selected, scale, padding, pitch, overview, compact, top, step, feet, catX, catFeet, canX, canY,
      point(item) {
        if (compact) return { x: l.width * (slots.indexOf(item) + 1) / (slots.length + 1), y: top, scale };
        if (overview) return { x: padding + (item.bay + (item.col + .5) / 8) * area / bays,
          y: top + item.row * step, scale: Math.min(.38, area / bays / 8 / 44) };
        return { x: padding + (item.col + .5) * pitch, y: top + item.row * step, scale };
      } };
  }

  function v2Rects(s, l) {
    if (s.day === 9) return day9Rects(s, l);
    if (s.scene === 'roof') {
      const grid = shelfSlots(s, l), rects = {};
      grid.slots.filter(item => grid.overview || item.bay === grid.bay).forEach(item => {
        const p = grid.point(item);
        rects['pot:' + item.id] = [p.x, p.y - 40 * p.scale, Math.max(26, 44 * p.scale), Math.max(36, 96 * p.scale)];
      });
      const basil = grid.slots.find(item => item.basil || String(item.id) === '2');
      const target = grid.selected || basil || grid.slots[0];
      if (target && rects['pot:' + target.id]) rects.pot = rects['pot:' + target.id];
      if (basil && rects['pot:' + basil.id]) rects.basil = rects.emptyPot = rects['pot:' + basil.id];
      rects.can = [grid.canX + 6, grid.canY - 14, 48, 42];
      if (s.water > 0 && target) {
        const q = grid.point(target);
        rects.can = [q.x - 36, q.y - 29 * q.scale - 32, 48, 42];
      }
      rects.cat = s.action === 'review' ? [grid.catX, grid.catFeet - 16, 56, 44] : [grid.catX, grid.catFeet - 17, 46, 38];
      rects.door = rects.up = [l.width - 29, grid.top - 49, 34, 69];
      rects.chair = [l.width - grid.padding - 23, grid.feet - 23, 36, 46];
      rects.garden = grid.compact ? [l.width / 2, grid.top - 40, l.width - grid.padding * 2, 100] : [l.width / 2, grid.top + grid.step - 20, l.width - grid.padding * 2, grid.step * 2 + 80];
      rects.camille = [grid.padding, grid.feet - 26, 32, 56];
      rects.noe = [l.width - grid.padding, grid.feet - 26, 32, 56];
      rects.group = [l.width / 2, (grid.top + grid.feet) / 2 - 20, l.width - 24, grid.feet - grid.top + 80];
      rects.player = [l.width / 2, grid.feet - 12, 40, 50];
      return rects;
    }
    const scale = l.scale || 1;
    const rects = Object.fromEntries(Object.entries(rawHotspots(s)).map(([id, r]) => [id, [r[0] * scale + l.ox, (r[1] + facadePan(s)) * scale + l.oy, r[2] * scale, r[3] * scale]]));
    if (s.scene === 'lefevre' && !handover(s)) rects.calendar[0] = 157 * scale + l.ox;
    if (s.scene === 'kitchen' && s.action !== 'sleepBetweenPots') {
      const m = motion(s).cat;
      rects.cat = [m.x * scale + l.ox, (m.y - 17) * scale + l.oy, 48 * scale, 38 * scale];
      rects.pot = [m.potX * scale + l.ox, 174 * scale + l.oy, 48 * scale, 96 * scale];
    }
    const doorway = s.scene === 'doorway' || s.scene === 'lefevre' && handover(s);
    const actors = doorway ? { lefevre: [271, 201, 50, 80], camille: [handover(s) ? 207 : 176, 234, 46, 80], player: [207, 242, 42, 55], group: [246, 211, 208, 145], clock: [350, 57, 36, 36] }
      : s.scene === 'kitchen' ? { camille: [143, 191, 40, 68], noe: [347, 194, 40, 68], player: [238, 241, 42, 55], group: [242, 203, 252, 105], clock: [365, 47, 36, 36] }
      : s.scene === 'stairs' ? { camille: [278, 189, 40, 66], noe: [300, 202, 40, 66], group: [269, 208, 145, 108] }
      : s.scene === 'lefevre' ? { lefevre: [242, 185, 40, 70], camille: [135, 192, 40, 70], noe: [355, 192, 40, 70], player: [243, 256, 42, 55], group: [243, 210, 265, 160], clock: [190, 78, 36, 36] }
      : { lefevre: [277, 235, 48, 57], group: [240, 176, 320, 230] };
    for (const [id, r] of Object.entries(actors)) rects[id] = [r[0] * scale + l.ox, r[1] * scale + l.oy, r[2] * scale, r[3] * scale];
    const gag = s.acting?.find(c => c.type === 'kitten');
    if (gag && rects.cat) rects.cat[1] -= gag.rise * scale;
    return rects;
  }

  function camera(s, l, rects) {
    if (s.day === 9 && s.staging.splitEnd) return { scale: 1, x: 0, y: 0, subject: 'split' };
    if (s.shot && s.establishingProgress == null) {
      const shot = typeof s.shot === 'string' ? { type: s.shot } : s.shot;
      const speaker = s.speaker === 'voisine' ? 'lefevre' : s.speaker;
      const vanish = s.day === 9 && s.acting.find(c => c.state === 'vanish');
      const timeCut = s.day === 9 && s.acting.some(c => c.type === 'time' && c.progress < .65);
      const targetId = s.day === 9 && s.scene === 'roof' && shot.type === 'medium' && shot.target === 'pot' ? 'garden' : shot.target;
      let id = timeCut ? 'clock' : s.focus && s.focusZoom ? s.focus : targetId || (shot.type === 'wide' ? 'group' : speaker);
      // Object inserts never cut to a face mid-vanish. Keep the sheet with its pen.
      if (vanish) id = vanish.object === 'pen' ? 'list' : vanish.object;
      const people = ['camille', 'noe', 'player', 'group'];
      if (s.day === 9 && people.includes(id)) id = 'group';
      const insert = s.day === 9 && shot.type !== 'wide' && !people.includes(id);
      const target = rects[id] || rects.group || rects.cat || rects.pot;
      if (target) {
        const top = l.height * clamp(s.visibleRegion?.top ?? .1, 0, .9) + 12;
        const bottom = Math.max(top + 40, l.height * clamp(s.visibleRegion?.bottom ?? .7, 0, 1) - 14);
        const available = bottom - top, width = l.width - 28;
        const desired = s.day === 9 ? (shot.type === 'wide' ? 1 : shot.type === 'medium' || !insert || id === 'thirdPot' ? 2 : 3)
          : s.focus && s.focusZoom ? 1 + s.focusZoom * 1.25 : ({ wide: .92, medium: 1.5, close: 2.6 })[shot.type] || 1;
        const limit = Math.min(width / target[2], available / target[3]);
        let scale = Math.min(desired, limit);
        if (s.day === 9) scale = Math.max(1, Math.floor(scale));
        let x = l.width / 2 - target[0] * scale, y = (top + bottom) / 2 - target[1] * scale;
        if (s.cameraFrom && !s.reducedMotion && s.day !== 9) {
          const f = s.cameraProgress * s.cameraProgress * (3 - 2 * s.cameraProgress);
          scale = Math.min(limit, s.cameraFrom.scale + (scale - s.cameraFrom.scale) * f);
          x = s.cameraFrom.x + (x - s.cameraFrom.x) * f;
          y = s.cameraFrom.y + (y - s.cameraFrom.y) * f;
        }
        // Constrain the subject, not the canvas edges: ceilings are not a framing target.
        x = clamp(x, 14 - (target[0] - target[2] / 2) * scale, l.width - 14 - (target[0] + target[2] / 2) * scale);
        y = clamp(y, top - (target[1] - target[3] / 2) * scale, bottom - (target[1] + target[3] / 2) * scale);
        if (s.day === 9) { x = Math.round(x); y = Math.round(y); }
        return { scale, x, y, subject: id || 'group', bounds: target, top, bottom, insert };
      }
    }
    const id = s.garden && s.garden.zoom === 'pot' ? 'pot:' + s.garden.selectedPot : s.focus;
    const target = rects[id] || (s.water > 0 && s.targetPotId != null ? rects['pot:' + s.targetPotId] : null);
    const amount = s.garden && s.garden.zoom === 'pot' ? 1 : s.focusZoom;
    const maximum = target ? Math.min(2.25, Math.max(1.08, l.width * .9 / target[2]), Math.max(1.08, l.height * .55 / target[3])) : 1;
    const scale = target ? 1 + amount * (maximum - 1) : 1;
    const x = target ? l.width / 2 - target[0] * scale : 0;
    const y = target ? l.height * .43 - target[1] * scale : 0;
    return { scale, x: Math.max(l.width * (1 - scale), Math.min(0, x)), y: Math.max(l.height * (1 - scale), Math.min(0, y)) };
  }

  function framing(canvas, options) {
    const s = state(options), l = layout(canvas, s);
    return camera(s, l, v2Rects(s, l));
  }

  function cameraGeometry(canvas, options) {
    const cam = framing(canvas, options);
    return { pose: { scale: cam.scale, x: cam.x, y: cam.y }, ...cam };
  }

  function v2Hotspots(s, l) {
    if (s.scene === 'facade' && s.establishingProgress != null) return {};
    const rects = v2Rects(s, l), cam = camera(s, l, rects), result = {};
    Object.entries(rects).forEach(([id, r]) => {
      if (id === 'cat' && !s.cat) return;
      if (s.day === 9 && s.acting.some(c => c.object === id && c.state === 'vanish' && c.progress >= .6)) return;
      if (id === 'basil' && s.scene === 'kitchen' && s.action !== 'sleepBetweenPots' && (!s.night || s.basilPlanted)) return;
      const x = r[0] * cam.scale + cam.x, y = r[1] * cam.scale + cam.y;
      const w = r[2] * cam.scale, h = r[3] * cam.scale;
      result[id] = { id, x: x / l.width * 100, y: y / l.height * 100, width: w / l.width * 100, height: h / l.height * 100,
        visible: x + w / 2 > 0 && x - w / 2 < l.width && y + h / 2 > 0 && y - h / 2 < (cam.bottom ?? l.height) };
    });
    return result;
  }

  function v2Kitchen(p, s) {
    const m = motion(s), c = m.cat, lift = c.lift;
    const actor = (x, feet, who, pose) => person(p, x, feet, who, m.time, pose, 1, m.people[who]);
    actor(128 + (c.x - 40 - 128) * c.hold, 221, 'camille', lift ? 'lift' : c.hold ? 'catch' : 'idle');
    actor(332, 224, 'noe', s.reaction === 'catch' ? 'catch' : 'idle');
    table(p, s);
    if (s.action === 'sleepBetweenPots') {
      pot(p, 202, 216, Math.max(2, s.growth[1]), m.time, true);
      if (s.cat) cat(p, 255, 212, s);
      pot(p, 310, 216, Math.max(2, s.growth[0]), m.time);
    } else {
      if (s.cat) {
        const reaction = lift ? 'lift' : (s.catGame && s.catGame.blocked > .1 ? 'offended' : s.reaction);
        cat(p, c.x, c.y, { ...s, time: m.time, reaction, danger: 0, catPose: c });
        if (!lift && c.approach === 1 && c.paw > 0) {
          p.line(c.x + 8, c.y - 8, c.x + 18 + c.paw, c.y - 13, '#e2873a', 4);
          p.r(c.x + 17 + c.paw, c.y - 14, 4, 3, '#f3b365');
        }
        if (c.hold) {
          const handX = 154 + (c.x - 9 - 154) * c.hold;
          p.line(handX - 15, 204 + (c.y - 202) * c.hold, handX, 204 + (c.y - 202) * c.hold, '#377c60', 5);
          p.r(handX, 201 + (c.y - 202) * c.hold, 7, 4, P.skin);
          if (c.hold === 1) p.r(c.x + 8, c.y - 2, 7, 4, P.skin);
        }
      }
      // The story prop is alive even when its review record is still at seed stage.
      pot(p, c.potX, 216, Math.max(2, s.growth[0]), m.time, !!lift, Math.sin(m.time / 95) * s.danger * 2);
    }
    can(p, 98, 176, 0, m.time);
    if (s.action !== 'cupFalls') steam(p, 175, 199, m.time);
  }

  function v2Roof(p, s, l) {
    const grid = shelfSlots(s, l), world = placed(p, l.ox, l.oy), m = motion(s);
    const horizon = grid.top - l.oy - 37;
    sky(world, s.night); skyline(world, s.night, -35);
    world.r(0, horizon, W, 22, '#a58a88'); world.r(0, horizon, W, 4, '#c0a49a');
    floor(world, horizon + 21, s.night, true);
    door(p, l.width - 43, grid.top - 82, 27, 65, false, s.night);
    if (s.action === 'review') {
      // The doorway ledge keeps review reactions above the answer panel.
      p.r(grid.catX - 29, grid.catFeet + 3, 60, 4, '#c0a49a');
      p.r(grid.catX - 29, grid.catFeet + 7, 60, 3, '#79656b');
    }
    for (let x = 0; x < l.width; x += 28) {
      const y = l.oy + 85 + Math.sin(x / l.width * Math.PI) * 21;
      p.line(x, y, x + 28, l.oy + 85 + Math.sin((x + 28) / l.width * Math.PI) * 21, '#4c4b58');
      p.oval(x + 4, y + 8, 10, 11, '#ffd28a12'); p.r(x + 3, y + 5, 3, 4, '#ffe8ae');
    }
    for (let row = 0; row < (grid.compact ? 1 : 3); row++) {
      const y = grid.top + 2 + row * grid.step;
      p.r(grid.padding - 7, y, l.width - grid.padding * 2 + 14, 5, '#725b54');
      p.r(grid.padding - 7, y, l.width - grid.padding * 2 + 14, 1, '#c5986e');
      p.r(grid.padding - 5, y + 5, 3, 19, '#594c4c'); p.r(l.width - grid.padding + 2, y + 5, 3, 19, '#594c4c');
      if (!grid.overview && !grid.compact) for (let col = 0; col < 8; col++) {
        const x = grid.padding + (col + .5) * grid.pitch;
        p.oval(x, y - 2, 8, 2, '#403b4930');
      }
    }
    grid.slots.filter(item => grid.overview || item.bay === grid.bay).forEach(item => {
      const q = grid.point(item), basil = item.basil || String(item.id) === '2';
      if (s.action === 'carryMartinPlant' && String(item.id) === '1') {
        const f = beat(s, 1600, 400);
        q.x = (l.width - grid.padding - 20) * (1 - f) + q.x * f;
        q.y = (grid.feet - 28) * (1 - f) + q.y * f;
      }
      const martinPresent = s.garden || s.basilPlanted || ['carryMartinPlant', 'plantBasil', 'leafLifts'].includes(s.action);
      const planted = String(item.id) === '1' ? !!martinPresent : !basil || s.basilPlanted || s.action === 'plantBasil';
      const growth = planted ? Math.max(String(item.id) === '1' || basil ? 2 : 0, clamp(item.growth, 0, 5)) : 0;
      const lowering = s.action === 'plantBasil' && basil ? -18 * (1 - beat(s, 1500)) : 0;
      const thirst = plantThirst(item, s.moisture[item.id]);
      const wiggle = item.hint && !s.reducedMotion ? Math.sin(m.time / 420) * 1.8 : 0;
      pot(placed(p, q.x, q.y, q.scale), 0, 0, growth, m.time, basil, wiggle,
        { plantOffset: lowering, moisture: s.moisture[item.id], thirst });
    });
    const selected = grid.selected || grid.slots.find(item => String(item.id) === '2') || grid.slots[0];
    if (s.water > 0 && selected) {
      const q = grid.point(selected), target = q.y - 29 * q.scale;
      can(placed(p, q.x - 40, target - 22, .65), 0, 0, s.water, m.time);
      for (let i = 0; i < 20; i++) {
        const f = (m.time / 800 + i / 20) % 1;
        p.r(q.x - 18 * (1 - f), target - 41 * (1 - f * f), 1, 2, '#c7e2df');
      }
    } else can(p, grid.canX, grid.canY, 0, m.time);
    chair(p, l.width - grid.padding - 35, grid.feet - 44, .75, true);
    if (s.rooftopUnlocked) {
      person(p, grid.padding - 13, grid.feet, 'camille', m.time, 'idle', .85, m.people.camille);
      person(p, l.width - grid.padding - 12, grid.feet, 'noe', m.time, s.water || s.action === 'carryMartinPlant' ? 'hold' : 'idle', .85, m.people.noe);
      if (s.cat) cat(p, grid.catX, grid.catFeet, { ...s, time: m.time });
    }
  }

  // Day 9 shares the portrait camera and sprites, but stages its two story pots
  // independently of the expandable M2 shelf. Props are explicit, never save data.
  function day9Rects(s, l) {
    const roof = s.scene === 'roof', stairs = s.scene === 'stairs';
    const medium = ['medium', 'close'].includes(typeof s.shot === 'string' ? s.shot : s.shot?.type);
    const rects = {
      group: medium ? [160, 180, 146, 120] : [160, 190, 292, 224],
      camille: [115, 180, 60, 120], noe: [205, 180, 60, 120], player: [160, 207, 42, 52],
      hand: [roof || stairs ? 272 : 177, roof || stairs ? 163 : 207, 48, 38],
      clock: [235, 63, 46, 46], pot: [91, 233, 48, 78], basil: [169, 233, 48, 78],
      garden: [135, 230, 158, 90], can: [62, 223, 58, 55], paw: [98, 209, 44, 40],
      roofDoor: [279, 146, 58, 116], door: [279, 146, 58, 116],
      list: [158, 221, 74, 42], pen: [174, 217, 26, 28], milk: [210, 204, 26, 44],
      fridge: [278, 139, 68, 154], plates: [47, 204, 62, 58], spoon: [67, 208, 22, 38],
      sock: [221, 230, 40, 48], foot: [222, 263, 32, 25], croissant: [163, 221, 54, 32],
      crumbs: stairs ? [199, 224, 100, 72] : [211, 265, 158, 68],
      laptop: [180, 205, 90, 60], curtain: [151, 166, 86, 110], lefevreDoor: [74, 167, 72, 126],
      chair: [247, 257, 54, 62], chimney: [36, 153, 50, 114],
      table: [160, 229, 222, 42], sofa: [65, 248, 96, 55], underTable: [162, 274, 120, 48],
      behindSofa: [32, 257, 48, 48], aboveFridge: [278, 56, 66, 32]
    };
    rects.up = rects.roofDoor; rects.down = rects.lefevreDoor;
    const third = s.staging.thirdPot;
    if (roof && ['sleep', 'stash', 'tease'].includes(third) && s.staging.phase !== 'afternoon') {
      rects.thirdPot = [213, 200, 142, 200]; rects.stash = rects.thirdPot;
    }
    const catAt = s.staging.cat || (third === 'sleep' || third === 'stash' ? 'pot' : roof ? 'spout' : 'sofa');
    if (s.cat && catAt !== 'none') rects.cat = catAt === 'pot' && rects.thirdPot ? [225, 240, 60, 32]
      : catAt === 'list' ? [154, 208, 60, 34] : catAt === 'spout' ? [98, 209, 46, 44] : [65, 232, 60, 32];
    rects.canape = rects.sofa; rects.rack = rects.spoon;
    rects['pot:1'] = rects.pot; rects['pot:2'] = rects.basil;
    return Object.fromEntries(Object.entries(rects).map(([id, r]) => [id, [r[0], r[1] + l.height * .18, r[2], r[3]]]));
  }

  function day9Prop(p, name, x, y, progress = 1, count = 6) {
    p = placed(p, x, y);
    if (name === 'pen') {
      p.line(-8, 4, 7, -12, '#324c70', 3); p.r(6, -14, 3, 5, '#d5c6a5'); p.r(-10, 6, 2, 2, P.ink);
    } else if (name === 'sock') {
      p.poly([[-7, -23], [6, -23], [6, -5], [15, -2], [15, 5], [-7, 5]], '#9fa9b6');
      p.r(-7, -23, 13, 4, '#e9d8b8'); p.r(-7, -15, 13, 3, '#65758f'); p.r(9, 0, 6, 5, '#65758f');
    } else if (name === 'spoon') {
      p.line(0, 5, 0, -15, '#d7ded5', 3); p.oval(1, -21, 5, 8, '#aabfc1'); p.oval(0, -23, 2, 4, '#e9efe3');
    } else if (name === 'croissant' || name === 'crust') {
      p.oval(0, -4, name === 'crust' ? 10 : 19, 8, '#b9793f');
      p.oval(0, -7, name === 'crust' ? 9 : 17, 7, '#e7ad63');
      if (name === 'croissant') { p.poly([[-21, -5], [-14, -14], [-8, -3]], '#e7ad63'); p.poly([[21, -5], [14, -14], [8, -3]], '#e7ad63'); }
      for (let i = -1; i <= 1; i++) p.line(i * 7 - 2, -12, i * 7 + 1, -5, '#f6d18d', 2);
    } else if (name === 'milk') {
      p.r(-7, -23, 16, 26, '#f3ead0'); p.r(-4, -30, 10, 9, '#e7e7d1'); p.r(-5, -32, 12, 4, '#688e9b');
      p.r(-7, -14, 16, 9, '#8daeb1'); p.r(-4, -12, 10, 3, '#f3ead0');
    } else if (name === 'list') {
      p.poly([[-31, -23], [30, -23], [35, 10], [-35, 10]], '#f8e9c9');
      for (let i = 0; i < 4; i++) { p.r(-25, -17 + i * 6, 3, 3, '#627085'); p.r(-17, -16 + i * 6, Math.max(0, Math.min(37, progress * 160 - i * 37)), 1, '#627085'); }
      p.line(-18, 7, 20, 7, '#627085');
    } else if (name === 'plates') {
      for (let i = 0; i < count; i++) { const shift = Math.sin(progress * Math.PI * 4 + i) * (1 - progress) * 3; p.oval(shift, -i * 5, 24, 5, '#b6bdb0'); p.oval(shift, -i * 5 - 2, 22, 4, '#f4e8c9'); }
    } else if (name === 'crumbs') {
      for (let i = 0; i < 12; i++) p.r(-20 + noise(i + 8) * 40, -10 + noise(i + 44) * 16, i % 3 + 1, 2, '#dca260');
    } else if (name === 'laptop') {
      p.r(-37, -38, 74, 43, '#394653'); p.r(-33, -34, 66, 34, '#9cbabe');
      p.r(-27, -27, 54, 22, '#f3e9cd'); p.r(-23, -23, 10, 9, '#bd8969');
      p.line(-23, -23, -18, -18, P.cream); p.line(-13, -23, -18, -18, P.cream);
      // Sender only, never the contents of Martin's unread message.
      const letters = { M: ['101','111','111','101','101'], A: ['010','101','111','101','101'], R: ['110','101','110','101','101'], T: ['111','010','010','010','010'], I: ['111','010','010','010','111'], N: ['101','111','111','111','101'], '.': ['000','000','000','000','010'] };
      [...'M.MARTIN'].forEach((letter, i) => letters[letter].forEach((row, yy) => [...row].forEach((pixel, xx) => { if (pixel === '1') p.r(-10 + i * 4 + xx, -23 + yy, 1, 1, '#394653'); })));
      p.r(-9, -13, 30, 1, '#738a8f'); p.poly([[-37, 5], [37, 5], [44, 12], [-44, 12]], '#8798a2');
      p.r(-24, 6, 48, 3, '#526575'); p.r(28, -31, 3, 3, '#f8d583');
    } else if (name === 'key') {
      p.oval(-8, -3, 5, 5, '#ddbc7d'); p.oval(-8, -3, 2, 2, P.skinShade);
      p.line(-3, -3, 12, -3 + Math.sin(progress * Math.PI) * 7, '#ddbc7d', 3); p.r(9, -1, 3, 5, '#ddbc7d');
    }
  }

  function renderDay9(p, s, l, cam) {
    const st = s.staging, roof = s.scene === 'roof', stairs = s.scene === 'stairs';
    const t = s.reducedMotion ? 0 : s.time, y0 = l.height * .18;
    const q = placed(p, 0, y0), rects = day9Rects(s, l);
    const cues = s.acting, cueFor = name => cues.find(c => c.object === name);
    const at = id => { const r = rects[id] || rects.group; return [r[0], r[1] - y0]; };
    const doorCue = cues.find(c => c.type === 'door' && c.at !== 'fridge' && c.at !== 'lefevreDoor');
    const doorState = doorCue?.state || st.door || 'closed';
    const doorProgress = doorCue?.progress ?? 1;
    const open = doorState === 'ajar' ? .14 + .66 * (1 - doorProgress) + Math.sin(doorProgress * Math.PI) * .12
      : ['closed', 'locked'].includes(doorState) ? 1 - doorProgress : doorProgress;
    if (st.splitEnd) {
      // Deliberately composed as two inserts, not a room with a UI overlay.
      q.r(0, -150, 320, 350, '#50474c'); q.r(0, 185, 320, l.height, '#33394f');
      q.r(0, 176, 320, 7, '#e5c7a1');
      day9Prop(placed(q, 160, 100, 2), 'laptop', 0, 0);
      skyline(placed(q, -80, 178), true, -60);
      pot(placed(q, 160, 345, 2), 0, 0, 0, 0);
      cat(placed(q, 160, 280, 1.7), 0, 0, { ...s, acting: [], action: 'sleepBetweenPots', time: t });
      q.line(182, 280, 207, 304, '#e2873a', 7); q.line(207, 304, 203, 326, '#e2873a', 6);
      return;
    }
    if (roof) {
      sky(placed(q, -80, -20), s.night || st.phase === 'night');
      if (st.phase === 'sunset') { ['#a46c8d', '#ca7c87', '#e99a85', '#f7c38b'].forEach((c, i) => q.r(0, -20 + i * 36, 320, 37, c)); q.oval(226, 94, 22, 22, '#ffe0a4'); }
      else if (st.phase === 'dawn') { q.r(0, -30, 320, 65, '#758ca7'); q.oval(224, 108, 16, 16, '#ffe0a4'); }
      skyline(placed(q, -80, -20), s.night, -35);
      q.r(0, 169, 320, 29, '#a58a88'); q.r(0, 167, 320, 5, '#d6b39b'); floor(q, 198, s.night, true);
      q.r(17, 119, 34, 80, '#79656b'); q.r(12, 113, 44, 8, '#b18b7b'); q.r(24, 94, 10, 20, '#b67c68');
      door(q, 259, 92, 40, 105, open, s.night);
      if (open) q.poly([[279, 199], [302, 199], [320, 260], [233, 260]], '#ffdf9e38');
    } else if (stairs || s.scene === 'doorway') {
      stairsBackground(placed(q, -16, -4, .75), { ...s, top: 0 }); floor(q, 260, true, false);
      for (let i = 0; i < 7; i++) { q.r(120 + i * 20, 275 - i * 14, 113, 14, '#756e6b'); q.r(120 + i * 20, 275 - i * 14, 113, 3, '#bda38b'); }
      door(q, 259, 92, 40, 105, open, s.night);
      const lef = cues.find(c => c.type === 'door' && c.at === 'lefevreDoor');
      door(q, 43, 109, 62, 117, lef ? 1 - lef.progress : 0, true); q.r(44, 227, 61, 2, '#f8d996');
      q.line(126, 241, 260, 148, '#bba084', 3);
    } else {
      kitchenBackground(placed(q, -20, -4, .75), { ...s, top: -200 }); floor(q, 231, s.night, false);
      q.r(18, 224, 91, 35, '#8d9b8a'); q.r(13, 216, 11, 44, '#607d70'); q.r(101, 216, 11, 44, '#607d70');
      q.r(12, 210, 82, 9, '#d5c8a8'); q.r(18, 219, 70, 22, '#6d887a');
      const fridge = cues.find(c => c.type === 'door' && c.at === 'fridge'), milk = cueFor('milk');
      const f = fridge ? fridge.state === 'closed' ? 1 - fridge.progress : fridge.progress : milk?.state === 'move' ? Math.sin(milk.progress * Math.PI) : 0;
      q.r(249, 68, 59, 143, '#859b96'); q.r(253, 72, 51, 135, '#edf0d7');
      [110, 147, 180].forEach(y => q.r(255, y, 47, 3, '#a7b8ad'));
      if (st.props?.includes('milk') || milk) day9Prop(placed(q, 278, 144, .7), 'milk', 0, 0);
      q.r(249, 68, 59 * (1 - f * .85), 143, '#a7b5a1'); q.r(252, 71, 53 * (1 - f * .85), 137, '#d8dcc4');
      q.r(249, 112, 59 * (1 - f * .85), 3, '#8b9b91'); q.r(254, 126, 3, 21, '#748c84');
      if (st.door === 'ajar') { door(q, 313, 128, 36, 120, .14, s.night); q.r(313, 248, 7, 3, '#f6d393'); }
    }
    const pose = st.pose || (st.oneSock ? 'oneSock' : st.sharedLaugh ? 'laugh' : ''), people = motion(s).people;
    // Inserts have one prop draw path, not enlarged room sprites behind the prop.
    const noPeople = cam.insert || cueFor('curtain') || st.splitEnd;
    if (!noPeople) {
      person(q, 83, 250, 'camille', t, pose === 'laugh' ? 'laugh' : 'idle', 2, people.camille);
      person(q, 173, 250, 'noe', t + 500, pose === 'laugh' ? 'laugh' : pose === 'oneSock' ? 'walk' : 'idle', 2, people.noe);
      if (['morning', 'dawn'].includes(st.phase)) { for (let x = 189; x < 219; x += 5) q.r(x, 226, 2, 17, '#d2b699'); q.r(189, 232, 7, 4, P.soil); q.r(215, 234, 5, 3, P.soil); }
      if (pose === 'arms') { q.line(183, 200, 160, 182, '#c2714c', 9); q.line(223, 200, 246, 182, '#c2714c', 9); q.r(154, 176, 9, 9, P.skin); q.r(244, 176, 9, 9, P.skin); }
      if (pose === 'heart' || pose === 'facepalm' || pose === 'pockets') {
        const y = pose === 'facepalm' ? 175 : pose === 'heart' ? 206 : 232;
        q.line(223, 201, 209, y, '#c2714c', 8); q.r(201, y - 5, 12, 9, P.skin);
      }
      if (pose === 'oneSock' || st.oneSock) {
        q.r(186, 243, 17, 9, '#9fa9b6'); q.r(215, 243, 19, 9, P.skin); q.r(230, 248, 4, 3, P.skinShade);
        if (!cueFor('sock')) { q.r(226, 208, 10, 6, P.skin); day9Prop(q, 'sock', 237, 231); }
      }
    }
    if (roof) {
      q.r(64, 270, 137, 6, '#936451'); q.r(70, 276, 5, 26, '#654b48'); q.r(191, 276, 5, 26, '#654b48');
      [91, 169].forEach((x, i) => {
        const moving = cues.find(c => c.object === 'plant' && c.state === 'move' && i === 0);
        const f = moving?.progress ?? 1, yy = 267 - (1 - f) * 40, xx = x + (1 - f) * 52;
        pot(q, xx, yy, Math.max(2, s.growth[i]), t, i === 1, (st.wiggle || cueFor('pot')?.state === 'wiggle') && !s.reducedMotion ? Math.sin(t / 200) * 2 : 0,
          { moisture: s.moisture[i + 1] ?? (s.water || cueFor('soil')?.state === 'wet' ? 3 : 0), thirst: cueFor('soil')?.state === 'dry' ? 1 : 0 });
        if (moving) { q.r(xx - 23, yy - 20, 8, 8, P.skin); q.r(xx + 15, yy - 20, 8, 8, P.skin); }
      });
      const soil = cueFor('soil');
      if (soil?.state === 'dry') { q.oval(91, 237, 15, 4, '#aa9270'); q.line(82, 234, 90, 240, '#674b43'); q.line(90, 240, 98, 234, '#674b43'); q.r(86, 221, 19, 8, P.skin); for (let i = 0; i < 7; i++) q.r(88 + i * 3, 230 + ((soil.progress * 33 + i * 6) % 30), 2, 2, '#aa9270'); }
      can(q, 62, 245, s.water, t);
      if (s.water || soil?.state === 'wet' || cues.some(c => c.gag === 'sprinkle')) for (let i = 0; i < 18; i++) { const f = (t / 700 + i / 18) % 1; q.r(96 + f * 12, 213 + f * f * 30, 2, 3, '#c7e2df'); }
      chair(q, 230, 233, .95, true);
      if (rects.thirdPot) {
        const third = placed(q, -26, 0);
        pot(placed(third, 251, 290, 1.45), 0, 0, 0, t);
        if (st.thirdPot === 'tease') third.r(256, 238, 7, 12, '#9fa9b6');
        if (st.thirdPot === 'stash') {
          day9Prop(third, 'pen', 228, 256); day9Prop(third, 'sock', 244, 284); day9Prop(third, 'spoon', 268, 250); day9Prop(third, 'crust', 273, 268);
          const lift = cueFor('sock'); if (lift?.state === 'move') { third.r(235, 253 - lift.progress * 37, 14, 5, P.skin); day9Prop(third, 'sock', 242, 275 - lift.progress * 37); }
        }
      }
    } else if (!stairs && s.scene !== 'doorway') {
      q.r(55, 238, 7, 59, '#735343'); q.r(255, 238, 7, 59, '#735343');
      q.poly([[64, 214], [250, 214], [271, 242], [46, 242]], '#c5986e'); q.r(46, 242, 225, 6, '#9a6c50');
    }
    const props = new Set(st.props || []);
    if (st.spoon === 'rack') props.add('spoon');
    cues.filter(c => c.type === 'object').forEach(c => props.add(c.object));
    for (const name of props) {
      if (['soil', 'plant', 'curtain', 'stash'].includes(name)) continue;
      if (roof && st.thirdPot === 'stash' && ['pen', 'sock', 'spoon', 'crust', 'crumbs'].includes(name)) continue;
      const cue = cueFor(name), f = cue?.progress ?? 1;
      let [x, y] = at(cue?.at || name);
      // The empty plate stays in exactly the same place after the pastry is gone.
      if (name === 'croissant') { q.oval(x, y + 3, 27, 8, '#afbaa9'); q.oval(x, y + 1, 25, 7, '#f4e8c9'); }
      if (cue?.state === 'vanish' && f >= .6) continue;
      if (name === 'crumbs') {
        if (!stairs) day9Prop(q, 'crumbs', 163, 222);
        for (let i = 0; i < 12; i++) { const xx = stairs ? 139 + i * 11 : 172 + i * 10, yy = stairs ? 272 - i * 8 : 278 - i * 5; q.r(xx, yy, 3, 2, '#e3b072'); q.r(xx + 5, yy + 3, 2, 2, '#c58f56'); }
        continue;
      }
      if (cue?.state === 'move') {
        const from = at(cue.from || name), to = at(cue.to || (name === 'milk' ? 'fridge' : 'hand'));
        x = from[0] + (to[0] - from[0]) * f; y = from[1] + (to[1] - from[1]) * f;
        q.r(x - 10, y + 1, 18, 6, P.skin);
      }
      if (name === 'key') { const h = at('hand'); x = h[0]; y = h[1]; q.line(x - 25, y + 13, x - 8, y + 1, '#c2714c', 8); q.r(x - 14, y - 1, 18, 9, P.skin); }
      day9Prop(q, name, x, y, cue?.state === 'write' || name === 'plates' ? f : 1, st.platesRemaining ?? 6);
      if (name === 'list' && cue?.state === 'write') { q.r(x - 12 + f * 35, y - 12 + f * 12, 15, 7, P.skin); day9Prop(q, 'pen', x - 5 + f * 35, y - 10 + f * 12); }
    }
    const gag = cues.find(c => c.type === 'kitten'), catAt = st.cat || gag?.at;
    if (s.cat && st.hideSpot && !roof) {
      const spots = { placard: [282, 197], canape: [66, 239], table: [163, 285], panier: [37, 288] };
      const [x, y] = spots[st.hideSpot] || spots.canape;
      cat(q, x, y, { ...s, acting: [{ rise: 0, conceal: .72, type: 'kitten' }], time: t });
      if (st.hideSpot === 'panier') { q.r(16, 275, 42, 22, '#b68c63'); for (let i = 0; i < 6; i++) q.r(18 + i * 7, 276, 2, 20, '#d8b588'); }
    } else if (s.cat && rects.cat && catAt !== 'none') {
      const [x, y] = at('cat'), sprinkle = gag?.gag === 'sprinkle';
      const sleeping = ['pot', 'sofa', 'list'].includes(catAt) || ['sleep', 'stash'].includes(st.thirdPot);
      cat(q, x + (sprinkle && gag.progress > .5 ? Math.sin(t / 55) * 3 : 0), y + 13,
        { ...s, acting: [], time: t, action: sleeping ? 'sleepBetweenPots' : '', reaction: sprinkle ? gag.progress < .5 ? 'lick' : 'offended' : s.reaction });
    }
    const vanished = cues.find(c => c.state === 'vanish' && c.progress >= .6 && c.progress < 1);
    const tail = vanished || (gag && ['tail', 'slip'].includes(gag.gag) && gag.progress < 1 ? gag : null);
    if (tail && !s.reducedMotion) {
      const f = vanished ? (tail.progress - .6) / .4 : tail.progress;
      const [x, y] = at(vanished?.object || 'door');
      q.line(x + 28 + f * 46, y + 6, x + 9 + f * 46, y - 8, '#e2873a', 4);
      q.line(x + 9 + f * 46, y - 8, x + 8 + f * 46, y - 20, '#f3b365', 3);
    }
    if (cueFor('curtain') || s.scene === 'facade') {
      q.r(91, 100, 120, 143, '#a2918d'); windowFrame(q, 119, 119, 64, 91, st.phase === 'night');
      const f = cueFor('curtain')?.progress ?? 1, dx = s.reducedMotion ? 0 : Math.sin(f * Math.PI) * 16;
      q.poly([[120, 120], [139, 120], [132 + dx, 201], [120, 207]], '#d1b19e'); q.r(174, 120, 9, 87, '#d1b19e');
      if (st.phase === 'night') person(placed(q, 153, 201, .55), 0, 0, 'lefevre', t);
    }
    const clock = cues.find(c => c.type === 'time');
    if (clock || !roof && !stairs && s.scene !== 'facade') {
      const [x, y] = at('clock'), hour = clock?.hour ?? st.hour ?? 8, minute = clock?.minute || 0;
      q.oval(x, y, 20, 20, '#967962'); q.oval(x, y, 17, 17, '#efe0bd');
      for (let i = 0; i < 12; i++) q.r(x + Math.sin(i * Math.PI / 6) * 14, y - Math.cos(i * Math.PI / 6) * 14, 2, 2, '#84705e');
      q.line(x, y, x + Math.sin(minute * Math.PI / 30) * 13, y - Math.cos(minute * Math.PI / 30) * 13, P.ink);
      q.line(x, y, x + Math.sin((hour + minute / 60) * Math.PI / 6) * 9, y - Math.cos((hour + minute / 60) * Math.PI / 6) * 9, P.ink, 2);
    }
    if (doorState === 'locked') {
      const x = 282, y = 150, f = doorProgress;
      q.line(253, 179, 274, 161, '#c2714c', 8); q.r(269, 154, 16, 9, P.skin);
      day9Prop(q, 'key', x, y + 9, f);
      // Two handle checks after the key turn, with a settled closed door.
      if (!s.reducedMotion && f > .7) q.r(x + Math.sin((f - .7) / .3 * Math.PI * 4) * 2, y, 9, 5, P.skin);
    } else if (doorCue?.state === 'open' && doorCue.at === 'roofDoor') {
      q.line(246, 185, 268, 166, '#738a7a', 9); q.r(263, 157, 20, 10, P.skin);
      day9Prop(q, 'key', 277, 158, doorProgress);
    }
  }

  function renderActing(p, s, l, rects) {
    const scale = s.scene === 'roof' ? shelfSlots(s, l).scale : l.scale;
    const anchor = (id, fallback = 'player') => {
      if (Array.isArray(id)) return [id[0] * l.scale + l.ox, id[1] * l.scale + l.oy];
      const r = rects[id] || rects[fallback] || rects.group;
      return r ? [r[0], r[1] + r[3] * .22] : [l.width / 2, l.height / 2];
    };
    for (const cue of s.acting) {
      if (cue.type === 'time') {
        if (cue.gesture === 'watch') {
          const r = rects[cue.actor || 'noe'] || rects.lefevre;
          if (!r) continue;
          const x = r[0], y = r[1] + 9 * scale;
          p.line(x - 12 * scale, y - 5 * cue.progress, x + 7 * scale, y, P.skin, 4 * scale);
          p.r(x + 3 * scale, y - 3 * scale, 5 * scale, 6 * scale, P.ink);
          p.r(x + 4 * scale, y - 2 * scale, 3 * scale, 3 * scale, P.cream);
        } else if (s.scene !== 'kitchen' && rects.clock) {
          const [x, y] = rects.clock;
          p.oval(x, y, 16 * scale, 16 * scale, '#967962'); p.oval(x, y, 13 * scale, 13 * scale, '#efe0bd');
          p.line(x, y, x, y - 10 * scale, P.ink, scale); p.line(x, y, x + 7 * scale, y + 4 * scale, P.ink, scale);
        }
        continue;
      }
      if (!['handover', 'object'].includes(cue.type) || !cue.visible) continue;
      let [x, y] = anchor(cue.at || cue.anchor || cue.object, 'group');
      if (cue.type === 'handover') {
        const from = anchor(cue.from || 'lefevre'), to = anchor(cue.to || 'player');
        x = from[0] + (to[0] - from[0]) * cue.progress;
        y = from[1] + (to[1] - from[1]) * cue.progress - Math.sin(cue.progress * Math.PI) * 10 * scale;
        // Both palms support the object through the contact phase.
        const support = cue.object === 'basil' || cue.object === 'plant' ? 15 : 7;
        p.line(x - support * scale - 8, y + 8, x - support * scale, y, '#377c60', 5 * scale);
        p.r(x - (support + 2) * scale, y - 2 * scale, 7 * scale, 5 * scale, P.skin);
        p.r(x + (support - 5) * scale, y - 2 * scale, 7 * scale, 5 * scale, P.skin);
      }
      x += (cue.offset?.[0] || 0) * scale; y += (cue.offset?.[1] || 0) * scale;
      const reveal = cue.type === 'object' ? (cue.state === 'vanish' ? 1 - cue.progress : cue.progress) : 1;
      if (!reveal) continue;
      const prop = placed(p, x, y, scale * reveal);
      if (cue.object === 'plant' || cue.object === 'basil') pot(prop, 0, 0, cue.growth || 2, s.time, cue.object === 'basil');
      else if (cue.object === 'key') {
        prop.oval(-6, -6, 5, 5, '#ddbc7d'); prop.oval(-6, -6, 2, 2, P.wood);
        prop.r(-2, -7, 16, 3, '#ddbc7d'); prop.r(8, -5, 3, 5, '#ddbc7d');
      } else if (cue.object === 'cup') {
        prop.r(-8, -17, 16, 17, P.cream); prop.oval(9, -10, 5, 5, P.cream); prop.oval(9, -10, 2, 2, P.wood);
      } else {
        prop.r(-14, -20, 28, 20, '#c5986e'); prop.r(-2, -20, 4, 20, P.cream); prop.r(-14, -12, 28, 3, P.cream);
      }
    }
  }

  function drawV2(canvas, s) {
    const l = layout(canvas, s), ctx = canvas.getContext('2d');
    if (!ctx) return {};
    if (s.reducedMotion) s = { ...s, time: 0, elapsed: 10000 };
    if (canvas.width !== l.width) canvas.width = l.width;
    if (canvas.height !== l.height) canvas.height = l.height;
    canvas.style.imageRendering = 'pixelated'; canvas.style.objectFit = 'cover';
    canvas.style.objectPosition = '50% 50%'; ctx.imageSmoothingEnabled = false;
    const rects = v2Rects(s, l), cam = camera(s, l, rects);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    try {
      const base = painter(ctx), p = placed(base, cam.x, cam.y, cam.scale);
      base.r(0, 0, l.width, l.height, s.scene === 'roof' || s.scene === 'facade' ? '#33394f' : '#b7a68e');
      p.r(0, 0, l.width, l.height, s.scene === 'facade' ? '#33394f' : s.scene === 'roof' ? s.night ? '#33394f' : '#9b849d' : s.night ? '#847d80' : '#ddc6a6');
      if (s.scene === 'facade' && s.establishingProgress != null) {
        const f = s.establishingProgress;
        p.r(0, 0, l.width, l.height, f < .5 ? mix('#a4c5cc', '#9b849d', f * 2) : mix('#9b849d', '#33394f', f * 2 - 1));
      }
      if (s.scene !== 'facade') {
        speckle(p, 0, 0, l.width, l.oy + 20, 160, s.scene === 'roof' ? s.night ? '#b9a9b6' : '#b594a8' : s.night ? '#9b8b88' : '#e8d3b2', 14);
        for (let y = l.oy + 220 * l.scale; y < l.height; y += 100 * l.scale) floor(placed(p, l.ox, y - 220 * l.scale, l.scale), 220, s.night, s.scene === 'roof');
      }
      if (s.day === 9) renderDay9(p, s, l, cam);
      else if (s.scene === 'roof') v2Roof(p, s, l);
      else {
        const world = placed(p, l.ox, l.oy + facadePan(s) * l.scale, l.scale);
        world.people = motion(s).people;
        const backdrop = s.scene === 'lefevre' && handover(s) ? 'doorway' : s.scene;
        backgrounds[backdrop](world, { ...s, top: -l.oy / l.scale, facadeHeight: l.height - l.oy });
        if (s.scene === 'kitchen') v2Kitchen(world, s);
        else foreground(world, s);
      }
      if (s.day !== 9) renderActing(p, s, l, rects);
      if (s.focus && rects[s.focus] && s.day !== 9) {
        const r = rects[s.focus], pulse = s.reducedMotion ? 0 : Math.round(Math.sin(s.time / 380) * 2);
        const x = r[0] - r[2] / 2 - pulse, y = r[1] - r[3] / 2 - pulse;
        p.line(x, y, x + 6, y, '#ffe2a5'); p.line(x, y, x, y + 6, '#ffe2a5');
        p.line(x + r[2] + pulse * 2, y + r[3] + pulse * 2, x + r[2] + pulse * 2 - 6, y + r[3] + pulse * 2, '#ffe2a5');
      }
    } finally { ctx.restore(); }
    return v2Hotspots(s, l);
  }

  function start(canvas, initial) {
    if (runners.has(canvas)) runners.get(canvas).stop();
    const view = canvas.ownerDocument.defaultView || root;
    const motion = view.matchMedia ? view.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    let source = initial || {}, frame = 0, stopped = false, previous = -Infinity;
    const began = view.performance.now();
    const render = () => {
      const value = typeof source === 'function' ? source() : source;
      return draw(canvas, Object.assign({}, value, {
        time: motion.matches ? 0 : view.performance.now() - began,
        reducedMotion: motion.matches,
        // Reduced motion shows the settled pose, not an endlessly suspended cup or hand.
        elapsed: motion.matches ? 10000 : value && value.elapsed
      }));
    };
    const tick = now => {
      if (stopped) return;
      // 24 fps is intentional: quiet sprite timing, less battery use than a 60 fps redraw.
      if (!canvas.ownerDocument.hidden && now - previous >= (motion.matches ? 250 : 1000 / 24)) { render(); previous = now; }
      frame = view.requestAnimationFrame(tick);
    };
    const controller = {
      stop() { stopped = true; view.cancelAnimationFrame(frame); if (runners.get(canvas) === controller) runners.delete(canvas); },
      update(next) { source = typeof next === 'function' ? next : Object.assign({}, typeof source === 'function' ? source() : source, next); return render(); },
      render
    };
    runners.set(canvas, controller); render(); frame = view.requestAnimationFrame(tick);
    return controller;
  }

  function drawWord(canvas, wordId) {
    const id = String(wordId || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!['plante', 'basilic', 'bol', 'soupe', 'pain', 'cle', 'toit', 'heure', 'sept_heures', 'porte', 'fenetre', 'table', 'tasse', 'chaise', 'fromage'].includes(id)) return false;
    canvas.width = 120; canvas.height = 80; canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'); if (!ctx) return false;
    ctx.imageSmoothingEnabled = false;
    const p = painter(ctx);
    p.r(0, 0, 120, 80, '#f5dfb7'); p.oval(60, 66, 38, 4, '#dbc49e');
    if (id === 'plante' || id === 'basilic') pot(p, 60, 65, id === 'plante' ? 3 : 2, 0, id === 'basilic');
    else if (id === 'bol' || id === 'soupe') {
      p.poly([[29, 39], [91, 39], [81, 62], [40, 62]], '#819b89');
      p.r(42, 62, 38, 4, '#526f69'); p.oval(60, 39, 31, 10, '#fff0cd');
      p.oval(60, 39, 26, 7, id === 'soupe' ? '#dba666' : '#b9c5ac');
      if (id === 'soupe') { p.r(47, 37, 4, 2, P.leafDark); p.r(68, 40, 3, 2, P.leafDark); steam(p, 51, 29, 400); }
    } else if (id === 'pain') {
      p.oval(60, 48, 37, 14, '#a88866'); p.oval(60, 44, 35, 13, '#e1b479');
      for (let i = 0; i < 4; i++) p.line(36 + i * 15, 35, 42 + i * 15, 46, '#f4d295', 3);
    } else if (id === 'cle') {
      p.oval(40, 36, 13, 13, '#a88866'); p.oval(40, 34, 12, 12, '#ddbc7d'); p.oval(40, 34, 6, 6, '#f5dfb7');
      p.r(50, 31, 41, 7, '#ddbc7d'); p.r(78, 34, 6, 13, '#ddbc7d'); p.r(89, 34, 6, 13, '#ddbc7d'); p.r(52, 31, 39, 2, '#ffe2a5');
    } else if (id === 'toit') {
      p.r(27, 47, 68, 19, '#a2918d'); p.poly([[15, 48], [42, 18], [83, 18], [105, 48]], P.zinc);
      p.r(79, 12, 10, 23, '#b58372'); p.r(77, 10, 14, 4, '#d5a080');
      for (let i = 0; i < 4; i++) p.line(44 + i * 11, 21, 29 + i * 19, 45, P.zincLight);
    } else if (['heure', 'sept_heures'].includes(id)) {
      p.oval(60, 38, 28, 28, '#967962'); p.oval(60, 38, 24, 24, '#fff0cd');
      [[60, 17], [81, 38], [60, 59], [39, 38]].forEach(([x, y]) => p.r(x - 1, y - 1, 3, 3, P.ink));
      p.line(60, 38, 60, 20, P.ink, 2); p.line(60, 38, 52, 51, P.ink, 3);
    } else if (id === 'porte') door(p, 40, 10, 40, 56, false, false);
    else if (id === 'fenetre') windowFrame(p, 36, 14, 48, 43, false);
    else if (id === 'chaise') chair(p, 44, 14, 1);
    else if (id === 'table') {
      p.r(28, 39, 6, 27, P.woodDark); p.r(86, 39, 6, 27, P.woodDark);
      p.poly([[31, 26], [88, 26], [101, 42], [18, 42]], '#c5986e'); p.r(18, 42, 83, 5, P.wood);
    } else if (id === 'tasse') {
      p.oval(62, 64, 31, 5, '#c5af90'); p.oval(83, 43, 13, 13, '#fff0cd'); p.oval(83, 43, 7, 7, '#f5dfb7');
      p.r(37, 31, 43, 30, '#fff0cd'); p.oval(58, 32, 21, 6, '#80614c'); p.r(40, 39, 4, 17, '#dfc6a3');
    } else {
      p.poly([[29, 58], [45, 28], [94, 49], [94, 61]], '#e5b95e');
      p.poly([[29, 53], [45, 23], [94, 44]], '#ffe19a');
      [[48, 40], [66, 43], [80, 52]].forEach(([x, y]) => p.oval(x, y, 3, 2, '#c69b4d'));
    }
    return true;
  }

  function plantThirst(item, moisture) {
    if (item.thirst != null) return clamp(item.thirst, 0, 1);
    const thirsty = item.thirsty == null ? (item.dueCount == null ? item.due : item.dueCount) > 0 : item.thirsty;
    return thirsty ? 1 - clamp(moisture, 0, 3) / 3 : 0;
  }

  function drawReview(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('Day8Art.drawReview requires a canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return {};
    const item = options.pot || {}, s = state({ ...options, v2: true });
    const time = s.reducedMotion ? 0 : Math.floor(s.time / (1000 / 24)) * (1000 / 24);
    const moisture = clamp(options.moisture, 0, 3), thirst = plantThirst(item, moisture);
    if (canvas.width !== 320) canvas.width = 320;
    if (canvas.height !== 112) canvas.height = 112;
    canvas.style.imageRendering = 'pixelated'; canvas.style.objectFit = 'contain';
    canvas.style.objectPosition = '50% 50%'; ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    try {
      const p = painter(ctx);
      p.r(0, 0, 320, 112, '#dfd5bd'); p.r(0, 0, 320, 42, '#c9d6cf');
      p.r(0, 42, 320, 21, '#d8d9c6');
      p.r(0, 63, 320, 49, '#a58a88'); p.r(0, 63, 320, 4, '#c0a49a');
      for (let x = 0; x < 320; x += 37) p.r(x, 68, 1, 18, '#86747c');
      p.r(15, 88, 290, 6, '#725b54'); p.r(15, 88, 290, 2, '#c5986e');
      p.r(24, 94, 5, 18, '#594c4c'); p.r(291, 94, 5, 18, '#594c4c');
      const wiggle = item.hint && !s.reducedMotion ? Math.sin(time / 420) * 1.8 : 0;
      pot(p, 80, 86, Math.round(clamp(item.growth == null ? 2 : item.growth, 0, 5)), time, !!item.basil, wiggle, { moisture, thirst });
      if (s.cat) cat(placed(p, 250, 86, 1.5), 0, 0, { ...s, time });
      if (options.dropProgress != null) {
        const f = s.reducedMotion ? 1 : clamp(options.dropProgress, 0, 1);
        if (f < 1) {
          const x = 162 - 82 * f, y = 22 + 35 * f * f;
          p.r(x, y, 2, 2, '#c7e2df'); p.r(x - 1, y + 2, 4, 4, '#8bbabe'); p.r(x, y + 2, 1, 2, '#e3f1e7');
        } else {
          [[-8, -3], [0, -5], [8, -3]].forEach(([x, y]) => p.r(80 + x, 57 + y, 2, 2, '#c7e2df'));
        }
      }
    } finally { ctx.restore(); }
    const rect = (id, x, y, width, height) => ({ id, x: x / 320 * 100, y: y / 112 * 100, width: width / 320 * 100, height: height / 112 * 100, visible: true });
    return { pot: rect('pot', 80, 48, 52, 86), ...(s.cat ? { cat: rect('cat', 250, 60, 90, 70) } : {}) };
  }

  root.Day8Art = Object.freeze({ width: W, height: H, scenes: Object.freeze(scenes), draw, drawWord, drawReview, start, getHotspots, projectHotspots, motion, layout, framing, cameraGeometry, acting });
})(typeof window !== 'undefined' ? window : globalThis);
