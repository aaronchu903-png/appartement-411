/* L’Appartement 411 — original pixel art, authored in code for this project (2026-10-08).
 * No external images, fonts or assets. Provenance: docs/ASSETS.md. 96x64 logical pixels. */
(function (root) {
  'use strict';
  var W = 96, H = 64;
  var PAL = {
    '.': null,
    h: '#3b2a20', // Camille hair
    H: '#7a4a22', // Noé hair
    s: '#f1c7a5', // skin
    S: '#c98e6b', // skin shade
    e: '#1d1d1d', // eyes
    m: '#b5524b', // mouth
    g: '#2f7d5b', // Camille sweater
    G: '#24624a',
    p: '#2c3555', // trousers
    b: '#1e1e24', // shoes
    o: '#e2873a', // Noé shirt / cat
    O: '#b8642a', // cat stripes / shade
    w: '#f4efe6', // apron
    k: '#22303a', // cat eye
    n: '#e79aa0'  // cat nose
  };
  var SPR = {
    camille: [
      '....hhh.....',
      '...hhhhh....',
      '..hhhhhhh...',
      '..hssssshh..',
      '..hsesesh...',
      '..hsssssh...',
      '...ssmss....',
      '....sss.....',
      '..gggggggg..',
      '..gggggggg..',
      '..gggggggg..',
      '..gGggggGg..',
      '..gggggggg..',
      '..pppppppp..',
      '..ppp..ppp..',
      '..ppp..ppp..',
      '..ppp..ppp..',
      '..bbb..bbb..'
    ],
    noe: [
      '..H.H.H.H...',
      '.HHHHHHHHH..',
      '.HHHHHHHHH..',
      '.HHsssssHH..',
      '..HsesesH...',
      '..SsssssS...',
      '...ssmss....',
      '....sss.....',
      '..oowwwwoo..',
      '..oowwwwoo..',
      '..oowwwwoo..',
      '..oowwwwoo..',
      '..oowwwwoo..',
      '..OOOOOOOO..',
      '..OOO..OOO..',
      '..OOO..OOO..',
      '..OOO..OOO..',
      '..bbb..bbb..'
    ],
    cat: [
      'o.....o...',
      'oo...oo...',
      'ooooooo...',
      'okoooko..o',
      'ooonooo..o',
      '.ooooooo.o',
      '.oOoOoOoo.',
      '.o.o..o.o.'
    ],
    catPeek: [
      'o.....o',
      'oo...oo',
      'ooooooo',
      'okoooko'
    ]
  };

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function sprite(ctx, map, x, y) {
    for (var r = 0; r < map.length; r++) for (var c = 0; c < map[r].length; c++) {
      var col = PAL[map[r][c]]; if (col) px(ctx, x + c, y + r, 1, 1, col);
    }
  }
  // 3x5 digits for the door plaque
  var DIG = { '4': ['1.1', '1.1', '111', '..1', '..1'], '0': ['111', '1.1', '1.1', '1.1', '111'], '1': ['.1.', '11.', '.1.', '.1.', '111'] };
  function digits(ctx, str, x, y, c) {
    for (var i = 0; i < str.length; i++) { var d = DIG[str[i]]; for (var r = 0; r < 5; r++) for (var k = 0; k < 3; k++) if (d[r][k] === '1') px(ctx, x + i * 4 + k, y + r, 1, 1, c); }
  }

  // Arms per pose (drawn after body). x,y = sprite origin. Skin-coloured hands, sleeve colour from sprite.
  function arms(ctx, who, pose, x, y) {
    var sl = who === 'camille' ? PAL.g : PAL.o, sk = PAL.s;
    // left arm (viewer's left)
    function leftDown() { px(ctx, x + 1, y + 9, 1, 4, sl); px(ctx, x + 1, y + 13, 1, 1, sk); }
    function rightDown() { px(ctx, x + 10, y + 9, 1, 4, sl); px(ctx, x + 10, y + 13, 1, 1, sk); }
    switch (pose) {
      case 'point': // hand on own chest
        leftDown(); px(ctx, x + 10, y + 9, 1, 3, sl); px(ctx, x + 7, y + 11, 3, 1, sl); px(ctx, x + 5, y + 10, 2, 2, sk); break;
      case 'wave':
        leftDown(); px(ctx, x + 10, y + 5, 1, 4, sl); px(ctx, x + 10, y + 3, 1, 2, sk); px(ctx, x + 11, y + 3, 1, 1, sk); break;
      case 'ask': // open palm towards viewer
        leftDown(); px(ctx, x + 10, y + 9, 2, 1, sl); px(ctx, x + 12, y + 9, 1, 2, sl); px(ctx, x + 12, y + 8, 1, 1, sk); px(ctx, x + 13, y + 8, 1, 1, sk); break;
      case 'pointPlant': // arm out to viewer's left
        rightDown(); px(ctx, x - 3, y + 9, 4, 1, sl); px(ctx, x - 4, y + 9, 1, 1, sk); break;
      case 'can': // holding watering can
        rightDown(); px(ctx, x - 1, y + 9, 2, 1, sl); px(ctx, x - 2, y + 9, 1, 1, sk);
        px(ctx, x - 7, y + 9, 5, 4, '#6f8fa6'); px(ctx, x - 10, y + 9, 3, 1, '#6f8fa6'); px(ctx, x - 6, y + 8, 3, 1, '#4f6b80'); break;
      case 'shh': // finger to lips
        leftDown(); px(ctx, x + 10, y + 8, 1, 3, sl); px(ctx, x + 8, y + 7, 2, 1, sl); px(ctx, x + 7, y + 6, 1, 1, sk); px(ctx, x + 5, y + 4, 1, 3, sk); break;
      case 'happy': leftDown(); rightDown(); px(ctx, x + 5, y + 6, 3, 1, PAL.m); break;
      case 'sad': leftDown(); rightDown(); px(ctx, x + 5, y + 6, 3, 1, PAL.S); px(ctx, x + 4, y + 4, 1, 1, PAL.S); break;
      default: leftDown(); rightDown();
    }
  }
  function person(ctx, who, pose, x, y) {
    if (!pose) return;
    px(ctx, x + 1, y + 18, 11, 1, 'rgba(0,0,0,0.18)'); // shadow
    sprite(ctx, SPR[who], x, y);
    arms(ctx, who, pose, x, y);
  }
  function marker(ctx, x, y) { // speaker marker: a small down-pointing triangle (shape, not colour only)
    px(ctx, x, y, 5, 1, '#fff7c2'); px(ctx, x + 1, y + 1, 3, 1, '#fff7c2'); px(ctx, x + 2, y + 2, 1, 1, '#fff7c2');
    px(ctx, x - 1, y - 1, 7, 1, '#2a2a2a');
  }

  function plant(ctx, x, y, watered) {
    px(ctx, x, y + 10, 10, 1, '#8c4a2f'); px(ctx, x + 1, y + 11, 8, 5, '#b8603b'); px(ctx, x + 2, y + 16, 6, 1, '#8c4a2f');
    var L = '#4f9a4a', D = '#2f6e36';
    if (watered) {
      px(ctx, x + 4, y + 2, 2, 8, D);
      px(ctx, x + 1, y + 3, 3, 2, L); px(ctx, x + 6, y + 1, 3, 2, L); px(ctx, x + 1, y + 6, 3, 2, L); px(ctx, x + 6, y + 5, 3, 2, L); px(ctx, x + 4, y, 2, 2, L);
    } else { // drooping
      px(ctx, x + 4, y + 5, 2, 5, D); px(ctx, x + 6, y + 4, 2, 1, D);
      px(ctx, x + 1, y + 7, 3, 1, '#8aa04a'); px(ctx, x, y + 8, 2, 2, '#8aa04a'); px(ctx, x + 8, y + 5, 2, 1, '#8aa04a'); px(ctx, x + 9, y + 6, 1, 3, '#8aa04a');
    }
  }

  function room(ctx, wall, floor) {
    px(ctx, 0, 0, W, 44, wall); px(ctx, 0, 44, W, 20, floor);
    for (var i = 0; i < W; i += 8) px(ctx, i, 44, 1, 20, 'rgba(0,0,0,0.06)');
    px(ctx, 0, 43, W, 1, '#00000022');
  }
  function door(ctx, x, y, open) {
    px(ctx, x - 2, y - 2, 24, 40, '#5a3b26');
    if (open) { px(ctx, x, y, 20, 38, '#f3e3c3'); px(ctx, x, y, 3, 38, '#7b5236'); }
    else { px(ctx, x, y, 20, 38, '#8a5a3a'); px(ctx, x + 2, y + 3, 16, 14, '#946446'); px(ctx, x + 2, y + 20, 16, 14, '#946446'); px(ctx, x + 16, y + 19, 2, 2, '#e0c060'); }
  }

  function scene(ctx, name, st) {
    st = st || {};
    ctx.clearRect(0, 0, W, H);
    var spk = st.speaker;
    if (name === 'title') {
      px(ctx, 0, 0, W, H, '#28324a');
      for (var i = 0; i < 18; i++) px(ctx, (i * 37) % W, (i * 23) % 26, 1, 1, '#c9d3ff');
      px(ctx, 18, 12, 60, 52, '#8c6b5a'); px(ctx, 18, 12, 60, 2, '#5e463b');
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
        var lit = (r === 1 && c === 2);
        px(ctx, 23 + c * 14, 18 + r * 14, 9, 9, lit ? '#ffd77a' : '#3b4660');
        if (lit) { plant(ctx, 24 + c * 14, 18 + r * 14 - 2, true); }
      }
      digits(ctx, '411', 42, 58, '#ffd77a');
      return;
    }
    if (name === 'doorway') {
      room(ctx, '#c9b79a', '#8d7a63');
      door(ctx, 38, 6, st.door === 'open');
      px(ctx, 60, 12, 13, 7, '#e8dcc0'); digits(ctx, '411', 61, 13, '#3a2a1e'); // plaque spans all three 3px digits + 1px margin
      if (st.door === 'open') {
        if (st.noe) { person(ctx, 'noe', st.noe, 50, 22); if (spk === 'noe') marker(ctx, 53, 17); }
        if (st.camille) { person(ctx, 'camille', st.camille, 40, 25); if (spk === 'camille') marker(ctx, 43, 20); }
      }
      px(ctx, 30, 58, 36, 4, '#7a3b3b'); // doormat
      return;
    }
    if (name === 'name') {
      room(ctx, '#e8d9bd', '#a88a68');
      px(ctx, 6, 8, 20, 16, '#9fd0ea'); px(ctx, 6, 15, 20, 1, '#fff'); px(ctx, 15, 8, 1, 16, '#fff'); px(ctx, 5, 7, 22, 1, '#6b4f3a');
      person(ctx, 'camille', st.camille || 'idle', 36, 26); if (spk === 'camille') marker(ctx, 39, 21);
      person(ctx, 'noe', st.noe || 'idle', 58, 25); if (spk === 'noe') marker(ctx, 61, 20);
      return;
    }
    if (name === 'plant') {
      room(ctx, '#dfe6d2', '#a88a68');
      px(ctx, 8, 6, 26, 22, '#a6d7f0'); px(ctx, 8, 16, 26, 1, '#fff'); px(ctx, 20, 6, 1, 22, '#fff'); px(ctx, 7, 28, 28, 2, '#6b4f3a');
      px(ctx, 10, 40, 22, 3, '#6b4f3a'); px(ctx, 12, 43, 2, 10, '#6b4f3a'); px(ctx, 28, 43, 2, 10, '#6b4f3a');
      plant(ctx, 16, 23, !!st.watered);
      if (st.drops) { px(ctx, 20, 18, 1, 2, '#4aa3df'); px(ctx, 23, 16, 1, 2, '#4aa3df'); px(ctx, 18, 15, 1, 2, '#4aa3df'); }
      if (st.camille) { person(ctx, 'camille', st.camille, 48, 26); if (spk === 'camille') marker(ctx, 51, 21); }
      return;
    }
    if (name === 'cat') {
      room(ctx, '#e3d3c6', '#9d8064');
      door(ctx, 4, 6, st.door === 'open');
      if (st.camille) { person(ctx, 'camille', st.camille, 8, 24); if (spk === 'camille') marker(ctx, 11, 19); }
      px(ctx, 52, 34, 40, 10, '#5b6fa0'); px(ctx, 52, 30, 40, 5, '#4b5d8a'); px(ctx, 50, 32, 3, 12, '#4b5d8a'); px(ctx, 91, 32, 3, 12, '#4b5d8a');
      if (st.noe) {
        var pose = st.noe;
        person(ctx, 'noe', pose, 36, 25); if (spk === 'noe') marker(ctx, 39, 20);
      }
      if (st.cat === 'peek') sprite(ctx, SPR.catPeek, 60, 26);
      if (st.cat === 'sit') sprite(ctx, SPR.cat, 52, 44);
      return;
    }
    if (name === 'diary') {
      px(ctx, 0, 0, W, H, '#3d3346');
      px(ctx, 0, 40, W, 24, '#7a5a3e'); px(ctx, 0, 40, W, 2, '#5e432c');
      px(ctx, 24, 30, 48, 20, '#f6efdc'); px(ctx, 47, 30, 2, 20, '#d8ccb0');
      for (var l = 0; l < 5; l++) { px(ctx, 28, 34 + l * 3, 16, 1, '#b9ad94'); px(ctx, 52, 34 + l * 3, 15, 1, '#b9ad94'); }
      px(ctx, 76, 12, 2, 28, '#c9a227'); px(ctx, 70, 8, 14, 6, '#e8c95a'); px(ctx, 66, 14, 22, 20, 'rgba(255,230,150,0.08)');
      plant(ctx, 8, 24, !!st.watered);
      if (st.cat) sprite(ctx, SPR.catPeek, 82, 37);
      return;
    }
    if (name === 'probe' || name === 'baseline') { // neutral frame: no faces, no pointing
      px(ctx, 0, 0, W, H, '#2e3440');
      px(ctx, 38, 20, 6, 10, '#d8dee9'); px(ctx, 44, 16, 4, 18, '#d8dee9'); px(ctx, 48, 12, 2, 26, '#d8dee9');
      px(ctx, 53, 19, 1, 12, '#88c0d0'); px(ctx, 56, 16, 1, 18, '#88c0d0');
      return;
    }
    if (name === 'end') {
      px(ctx, 0, 0, W, H, '#1f2a44');
      px(ctx, 70, 8, 8, 8, '#f5e6a8'); px(ctx, 72, 8, 6, 6, '#1f2a44');
      plant(ctx, 42, 36, !!st.watered);
      if (st.cat) sprite(ctx, SPR.cat, 58, 48);
      return;
    }
  }

  var api = { W: W, H: H, scene: scene };
  root.A411 = root.A411 || {};
  root.A411.Art = api;
})(typeof window !== 'undefined' ? window : globalThis);
