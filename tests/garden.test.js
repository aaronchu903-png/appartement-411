'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const Fr = require('../js/fr.js');
const Pots = require('../js/pots.js');
const Day10 = require('../js/day10.js');
const Day12 = require('../js/day12.js');
const GardenArt = require('../js/garden-art.js');

const NB = '\u202F';
const AP = '\u2019';

function frenchBits(node, out) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach(function (x) { frenchBits(x, out); });
  else if (node && typeof node === 'object') {
    ['fr', 'tts'].forEach(function (k) { if (typeof node[k] === 'string') out.push(node[k]); });
    Object.keys(node).forEach(function (k) {
      if (k === 'zh' || k === 'en') return;
      if (k === 'fr' || k === 'tts') return;
      frenchBits(node[k], out);
    });
  }
  return out;
}

test('new French uses a curly apostrophe and a narrow space before ? ! ; :', function () {
  assert.equal(Fr.normalizeFr("C'est pour moi ?"), 'C' + AP + 'est pour moi' + NB + '?');
  assert.equal(Fr.normalizeFr('Jeudi : dîner'), 'Jeudi' + NB + ': dîner');
  assert.equal(Fr.normalizeFr('« C’est une bonne idée. »'), '«' + NB + 'C' + AP + 'est une bonne idée.' + NB + '»');
  var bits = frenchBits(Day10.STEPS, []).concat(frenchBits(Day10.LINES, []), frenchBits(Day10.LETTER, []), frenchBits(Day10.LESSON, []), frenchBits(Day10.DECK, []), frenchBits(Day12.LINES, []), [Day12.HOOK.fr, Day12.OPTION_JARDIN, Day12.KEPT, Day12.EVE.fr]);
  bits.forEach(function (s) {
    assert.equal(s.indexOf("'"), -1, s);
    assert.equal(/[ \u00A0][?!;:]/.test(s), false, s);
  });
});

test('Day 10 keeps the required beats and the five new chunks', function () {
  var ids = Day10.STEPS.map(function (st) { return st.id || st.key || st.t + ':' + (st.w || ''); });
  Day10.REQUIRED_IDS.forEach(function (id) { assert.ok(ids.indexOf(id) >= 0, id); });
  assert.ok(Day10.STEPS.some(function (st) { return st.id === 'd10_cam_cafe'; }));
  assert.equal(Day10.LINES.d10_cam_idee.fr, 'C' + AP + 'est une bonne idée.');
  assert.equal(Day10.LINES.d10_cam_vaisselle.fr, 'Noé, tu pourrais faire la vaisselle' + NB + '?');
  assert.equal(Day10.LINES.d10_lef_jardin.fr, 'La clé du toit. Il y a un jardin, là-haut.');
  assert.equal(Day10.LINES.d10_lef_allez.fr, 'Allez-y. Moi… pas encore.');
  assert.equal(Day10.CHAPTER.deck.length, 5);
  assert.deepEqual(Day10.CHAPTER.deck, ['cest_une_bonne_idee', 'tu_pourrais_vaisselle', 'le_lait_dans_le_frigo', 'cest_pour_moi', 'il_faut_de_leau']);
  var kept = Day10.DECK.map(function (c) { return c.id; });
  assert.ok(kept.indexOf('on_mange_a_table') >= 0);
  assert.ok(kept.indexOf('pas_de_nourriture_canape') >= 0);
  var blob = frenchBits(Day10.STEPS, []).join('\n') + frenchBits(Day10.LINES, []).join('\n');
  assert.equal(/Hélène|C’était à lui|son jardin/i.test(blob), false);
  function flat(paras) {
    return paras.map(function (p) { return p.map(function (x) { return typeof x === 'string' ? x : ''; }).join(''); }).join('\n');
  }
  var letter = flat(Day10.LETTER.body);
  assert.equal(letter.indexOf('6. Le jardin'), -1);
  assert.equal(Day10.LETTER.kind, 'Mot');
  assert.equal(Day10.LETTER.to, 'Madame Lefèvre');
  assert.equal(Day10.LETTER.grammar, 'conditionnel_politesse');
  assert.equal(Day10.LETTER.placeholder, undefined);
  assert.ok(letter.indexOf('Chère Madame,') >= 0);
  assert.ok(letter.indexOf('Merci pour la clé. Le basilic est sur le toit, dans un pot.') >= 0);
  assert.ok(letter.indexOf('Il a de l' + AP + 'eau. Une feuille se redresse' + NB + '!') >= 0);
  assert.ok(letter.indexOf('À jeudi' + NB + '!') >= 0);
  assert.ok(letter.indexOf('des feuilles, jeudi.') >= 0);
  assert.ok(letter.indexOf('Le 411 (et Croissant)') >= 0);
  assert.equal(letter.indexOf('P.-S.'), -1);
  assert.deepEqual(Day10.LETTER.gaps.voudriez.options, ['voudriez', 'voudrais', 'voudrait']);
  assert.deepEqual(Day10.LETTER.gaps.pourrais.options, ['pourrais', 'pourrait', 'pourriez']);
  assert.deepEqual(Day10.LETTER.gaps.pourriez.options, ['pourriez', 'pourrais', 'pourrait']);
  assert.equal(Day10.LETTER.ps.choice, 'd10_eau');
  assert.equal(Day10.LETTER.ps.value, 'cafe');
  var cafe = flat(Day10.LETTER.paragraphs('cafe'));
  assert.ok(cafe.indexOf('Le 411 (et Croissant)') < cafe.indexOf('P.-S. Noé voudrait du café. Toujours.'));
  assert.equal(flat(Day10.LETTER.paragraphs('eau')).indexOf('P.-S.'), -1);
  assert.equal(flat(Day10.LETTER.paragraphs(null)).indexOf('P.-S.'), -1);
  assert.equal(Day10.LESSON.title, 'Le conditionnel de politesse');
  assert.equal(Day10.LESSON.steps[2].q, 'Camille, tu ___ fermer la fenêtre' + NB + '?');
  assert.equal(Day10.LESSON.steps[2].answer, 'pourrais');
  assert.equal(Day10.LINES.d10_cam_a.fr, 'Personne n' + AP + 'a demandé de liste. Mais c' + AP + 'est bien.');
  assert.equal(Day10.LINES.d10_cam_b.fr, 'Une liste, pour les nuits calmes.');
  assert.equal(Day10.LINES.d10_cam_c.fr, 'Madame Martin veut une liste. Aujourd' + AP + 'hui, on l' + AP + 'écrit.');
  assert.equal(Day10.LINES.d10_cam_null.fr, 'Une liste, c' + AP + 'est plus simple.');
  assert.equal(Day10.LINES.d10_cam_a.placeholder, undefined);
  ['d10_cam_a', 'd10_cam_b', 'd10_cam_c', 'd10_cam_null'].forEach(function (id) {
    assert.equal(Day10.LINES[id].label, 'atmosphere', id);
    assert.equal(Day10.LINES[id].speaker, 'camille', id);
  });
  assert.deepEqual(Day10.STEPS.filter(function (st) { return st.id && st.id.indexOf('d10_cam_') === 0 && st.when; }).map(function (st) { return st.id + ':' + st.when.v[0]; }), ['d10_cam_a:A', 'd10_cam_b:B', 'd10_cam_c:C', 'd10_cam_null:null']);
});

test('Day 12 apply inserts the pocket beat and rewrites the final lines', function () {
  var chapter = {
    steps: [
      { t: 'narr', id: 'n_d12_tiroir', fr: 'Elle ouvre le tiroir. Elle prend la vieille clé.' },
      { t: 'line', id: 'd12_lef_cle' },
      { t: 'line', id: 'd12_lef_jardin' },
      { t: 'narr', id: 'n_d12_range', fr: 'Elle remet la clé dans le tiroir. Doucement.' },
      { t: 'line', id: 'd12_noe_jardin' },
      { t: 'line', id: 'd12_cam_jardin' },
      { t: 'choice', key: 'd12_merci', opts: [{ id: 'jardin', fr: 'Merci pour le dîner. Et merci pour l’histoire.' }] },
      { t: 'done', hook: { fr: 'old' } }
    ]
  };
  var book = {};
  var res = Day12.apply(chapter, book);
  assert.equal(res.applied, true);
  assert.equal(chapter.steps[0].id, 'n_d12_poche');
  assert.equal(chapter.steps[0].fr, 'Tu sors la clé de ta poche.');
  assert.equal(chapter.steps[1].fr, 'Elle regarde la clé dans ta main.');
  assert.equal(Day12.LINES.d12_lef_cle.fr, 'C' + AP + 'était à lui. Cette clé.');
  assert.equal(Day12.LINES.d12_lef_jardin.fr, 'Le jardin, là-haut… c' + AP + 'était son jardin.');
  assert.equal(chapter.steps.filter(function (st) { return st.id === 'n_d12_range'; })[0].fr, 'Elle ferme ta main sur la clé. Doucement.');
  assert.equal(Day12.LINES.d12_noe_jardin.fr, 'Son jardin… au-dessus de nous.');
  assert.equal(Day12.LINES.d12_cam_jardin.fr, 'Un jardin qui se réveille.');
  assert.equal(chapter.steps.filter(function (st) { return st.t === 'done'; })[0].hook.fr, 'Au-dessus de l' + AP + 'appartement, il y a un jardin. Son jardin.');
  assert.equal(chapter.steps.filter(function (st) { return st.key === 'd12_merci'; })[0].opts[0].fr, 'Merci pour le dîner. Et merci pour la clé.');
  assert.equal(Day12.KEPT, 'Je ne monte plus. Depuis l' + AP + 'hiver, le jardin dort.');
  assert.equal(Day12.apply(chapter, book).applied, true);
  assert.equal(chapter.steps.filter(function (st) { return st.id === 'n_d12_poche'; }).length, 1);
});

test('leaves follow R, and a pot is grown at 80% even when it wilts', function () {
  assert.equal(Pots.leavesFromR(0.96), 'full');
  assert.equal(Pots.leavesFromR(0.9), 'full');
  assert.equal(Pots.leavesFromR(0.899), 'steady');
  assert.equal(Pots.leavesFromR(0.87), 'steady');
  assert.equal(Pots.leavesFromR(0.85), 'steady');
  assert.equal(Pots.leavesFromR(0.849), 'wilting');
  assert.equal(Pots.leavesFromR(0.5), 'wilting');
  assert.equal(Pots.leavesFromR(0.49), 'dormant');
  assert.equal(Pots.leavesFromR(null), 'empty');

  var full = Pots.deriveAll(Pots.fillPreview({ cards: {} }, 'full'))[0];
  var wilt = Pots.deriveAll(Pots.fillPreview({ cards: {} }, 'wilting'))[0];
  var dorm = Pots.deriveAll(Pots.fillPreview({ cards: {} }, 'dormant'))[0];
  assert.equal(full.leaves, 'full');
  assert.equal(full.stage, 3);
  assert.equal(wilt.leaves, 'wilting');
  assert.equal(wilt.stage, 3);
  assert.equal(wilt.grown, true);
  assert.equal(dorm.leaves, 'dormant');
  assert.equal(dorm.stage, 2);
  assert.equal(Pots.stemStage(1.9), 1);
  assert.equal(Pots.stemStage(2), 2);
  assert.equal(Pots.stemStage(7), 3);
  assert.equal(Pots.stemStage(21), 4);
  assert.equal(Pots.rootStage(0), 0);
  assert.equal(Pots.rootStage(1), 1);
  assert.equal(Pots.rootStage(2), 2);
  assert.equal(Pots.rootStage(4), 3);
  assert.equal(GardenArt.spriteLeaf('steady'), 'full');
  assert.equal(GardenArt.spriteLeaf('wilting'), 'wilting');
  assert.deepEqual(GardenArt.partNames({ leaves: 'dormant', stage: 2, rootStage: 0 }, false), ['pot_back', 'stem_dormant_2', 'leaves_dormant_2', 'pot_front']);
  assert.deepEqual(GardenArt.partNames({ leaves: 'wilting', stage: 4, rootStage: 1 }, true), ['pot_back', 'roots_1', 'stem_4', 'leaves_flash_4', 'pot_front']);
  assert.equal(Pots.isPotGrown(1, Pots.fillPreview({ cards: {} }, 'wilting')), true);
  assert.equal(Pots.isPotGrown(3, Pots.fillPreview({ cards: {} }, 'dormant')), false);

  var pot = Pots.POTS[1];
  var need = Math.ceil(pot.items.length * 0.8);
  var learn = { cards: {}, garden: { v: 3, contexts: {}, forceDormant: {} } };
  pot.items.forEach(function (it, i) {
    if (i >= need) return;
    learn.cards[it.id + '|reading'] = { itemId: it.id, reps: 3, lapses: 0, successes: 2, stability: 8, lastReview: new Date().toISOString() };
  });
  assert.equal(Pots.derivePot(pot, learn).grown, true);
  delete learn.cards[pot.items[need - 1].id + '|reading'];
  assert.equal(Pots.derivePot(pot, learn).grown, false);
  Pots.bind(function () { return learn; });
  learn.cards[pot.items[need - 1].id + '|reading'] = { itemId: pot.items[need - 1].id, reps: 3, successes: 2, stability: 8, lastReview: new Date().toISOString() };
  assert.equal(Pots.isPotGrown(2), true);
});

test('a dead save comes back dormant and the migration is idempotent', function () {
  var g = {
    v: 2,
    plant: { id: 'p1', dead: true, diedOn: '2026-01-08', module: 'week1', waterDays: ['2026-01-01'] },
    plants: [{ id: 'w2', dead: true, diedOn: '2026-02-01', module: 'week2' }]
  };
  var learn = { cards: {} };
  assert.equal(Pots.migrateGarden(g, '2026-10-13', learn), true);
  assert.equal(g.v, 3);
  assert.equal(g.plant.dead, false);
  assert.equal(g.plant.dormant, true);
  assert.equal(g.plant.revivedFrom, '2026-01-08');
  assert.equal(g.plants[0].dead, false);
  assert.equal(g.plants[0].dormant, true);
  assert.equal(g.forceDormant[1], true);
  assert.equal(g.forceDormant[2], true);
  assert.equal(Pots.migrateGarden(g, '2026-10-13', learn), false);
  var shown = Pots.derivePot(Pots.BY_N[1], { cards: { x: { itemId: 'bonjour', reps: 2, stability: 20, successes: 2, lastReview: new Date().toISOString() } }, garden: g });
  assert.equal(shown.leaves, 'dormant');
  assert.equal(shown.grown, false);
});

test('Act I is five pots and 160 words, each in one pot', function () {
  assert.equal(Pots.POTS.length, 5);
  var ids = {};
  var n = 0;
  Pots.POTS.forEach(function (p) {
    p.items.forEach(function (it) {
      assert.equal(ids[it.id], undefined);
      ids[it.id] = p.n;
      n++;
    });
  });
  assert.equal(n, 160);
  assert.equal(Pots.potOfItem('cest_une_bonne_idee'), 5);
  assert.equal(Pots.potOfItem('il_faut_de_leau'), 0);
});

test('the v1 rooftop walk grid starts at y≥96 and blocks the placed props', function () {
  var manifest = JSON.parse(fs.readFileSync('art/garden/manifest.json', 'utf8'));
  assert.deepEqual(manifest.garden_parts.canvas_native, [18, 52]);
  assert.deepEqual(manifest.garden_parts.pivot_native, [9, 52]);
  assert.equal(manifest.garden_parts.leaves_index_must_match_stem_index, true);
  assert.deepEqual(manifest.garden_screen.slots.map(function (s) { return s.anchor_pt; }), [[39, 720], [117, 720], [195, 720], [273, 720], [351, 720]]);
  assert.ok(manifest.garden_screen.slots.every(function (s) { return s.label_area_pt[1] >= 740; }));
  assert.equal(manifest.rooftop.scenes, undefined);
  assert.equal(GardenArt.composedSrc(manifest, 'firstvisit', false), null);
  assert.equal(GardenArt.roofBg(manifest, false), 'art/garden/rooftop/rooftop_day.png');
  assert.equal(GardenArt.roofBg(manifest, true), 'art/garden/rooftop/rooftop_night.png');
  assert.equal(GardenArt.partBox(manifest).w, 72);
  assert.equal(GardenArt.partBox(manifest).h, 208);
  var dry = GardenArt.sceneProps(manifest, 'firstvisit', {});
  assert.ok(dry['pot_dry_2@1']);
  var planted = GardenArt.sceneProps(manifest, 'firstvisit', { planted: true });
  assert.equal(planted['pot_dry_2@1'], undefined);
  assert.deepEqual(planted['basil_planted@1'].bottom_center, dry['pot_dry_2@1'].bottom_center);
  var walk = GardenArt.baseWalkable(manifest);
  assert.equal(walk.cols, 12);
  assert.equal(walk.rows, 16);
  assert.deepEqual(walk.entry_tile, [15, 5]);
  assert.equal(walk.layouts.firstvisit[5][3], 0);
  assert.equal(walk.layouts.firstvisit[6][3], 1);
  var fixed = GardenArt.correctWalkable(walk, manifest);
  assert.equal(fixed.entryAdjusted, false);
  assert.deepEqual(fixed.entry_tile, [15, 5]);
  assert.equal(fixed.layouts.firstvisit[15][5], 1);
  assert.equal(fixed.layouts.firstvisit[15][6], 1);
  assert.equal(fixed.layouts.firstvisit[12][1], 0);
  assert.equal(fixed.layouts.tidy[12][1], 0);
  assert.equal(fixed.layouts.empty[12][1], 1);
  assert.equal(fixed.layouts.tidy[10][9], 0);
  assert.equal(fixed.layouts.empty[10][9], 1);
  assert.equal(fixed.layouts.empty[10][3], 1);
  for (var c = 0; c < 12; c++) assert.equal(fixed.layouts.firstvisit[4][c], 0);
  var door = {
    rooftop: { door: [84, 236, 24, 20] },
    props: {}
  };
  var moved = GardenArt.correctWalkable({
    tile: 16, cols: 12, rows: 16, entry_tile: [0, 0],
    layouts: { empty: walk.layouts.empty }
  }, door);
  assert.equal(moved.entryAdjusted, true);
  assert.deepEqual(moved.entry_tile, [15, 6]);
});
