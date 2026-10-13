const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function scriptContaining(marker) {
  const i = html.indexOf(marker);
  assert.ok(i > 0, 'missing ' + marker);
  const start = html.lastIndexOf('<script>', i);
  const end = html.indexOf('</script>', i);
  return html.slice(start + '<script>'.length, end);
}

function load(marker) {
  const context = { window: {}, console: console };
  context.window = context;
  context.globalThis = context;
  context.module = { exports: {} };
  vm.runInNewContext(scriptContaining(marker), context, { filename: marker });
  return context;
}

test('story scripts parse', () => {
  for (const marker of ['function onTap', 'function frHost', 'root.A411.Week = api', 'root.A411.HubStory = api']) {
    const file = path.join('/tmp', 'a411-' + marker.replace(/\W+/g, '-') + '.js');
    fs.writeFileSync(file, scriptContaining(marker));
    execFileSync(process.execPath, ['--check', file]);
  }
});

test('glossary lookup still reaches French inside story answers', () => {
  const src = scriptContaining('function frHost');
  assert.match(src, /button\.matches\('\.choice, \[data-opt\], \[data-option\], \[data-try\], \[data-gapopt\]'\)/);
  assert.doesNotMatch(src, /closest\('button, input, textarea/);
});

test('player mode never turns the hub hold flag on', () => {
  assert.doesNotMatch(html, /A411_HUB_HOLD\s*=/);
  assert.doesNotMatch(html, /A411_HUB_FAST\s*=/);
  assert.match(html, /PointerEvent \? 'pointerup' : 'touchend'/);
});

test('Madame Martin stands on the floor in front of the sofa', () => {
  const art = scriptContaining('function scene(');
  const cat = art.slice(art.indexOf("if (name === 'cat')"), art.indexOf("if (name === 'diary')"));
  const sofa = cat.indexOf("px(ctx, 52, 34, 40, 10, '#5b6fa0')");
  const martin = cat.indexOf("person(ctx, 'martin', st.martin, 66, 25)");
  assert.ok(sofa > 0 && martin > sofa, 'Martin is drawn after the sofa');
  assert.equal(cat.includes('70, 14'), false);
  assert.match(art, /cat: \{ camille: \[8, 24\], noe: \[36, 25\], martin: \[66, 25\] \}/);
});

test('hub cues drive a touch prompt and a proximity hook', () => {
  const src = scriptContaining('function onTap');
  assert.match(src, /id = 'hubInteract'/);
  assert.match(src, /function maybeProxHook/);
  assert.match(src, /function hotspotForCue/);
});

test('Day 8 and Day 9 hooks follow the live beat', () => {
  const HS = load('root.A411.HubStory = api').A411.HubStory;
  const json = (v) => JSON.stringify(v);
  assert.equal(HS.action(8, [], { object: 'table', id: 'plante' }, 'apt'), null);
  assert.equal(json(HS.action(8, ['d8_A'], { object: 'table', id: 'plante' }, 'apt')), json({ beat: 'd8_B' }));
  assert.equal(json(HS.action(8, ['d8_A', 'd8_B', 'd8_B2', 'd8_C'], { object: 'calendar_wall', id: 'calendrier' }, 'apt')), json({ beat: 'd8_D' }));
  assert.equal(json(HS.action(8, ['d8_A', 'd8_B', 'd8_B2', 'd8_C', 'd8_D', 'd8_E'], { object: 'door', id: 'stairs' }, 'apt')), json({ beat: 'd8_F' }));
  assert.equal(json(HS.action(8, ['d8_A', 'd8_B', 'd8_B2', 'd8_C', 'd8_D', 'd8_E', 'd8_F'], { object: 'basil', id: 'basilic' }, 'apt')), json({ beat: 'd8_G' }));
  assert.equal(HS.action(8, [], { object: 'door', id: 'stairs' }, 'apt'), null);
  assert.equal(json(HS.action(9, ['d9_A'], { object: 'door', id: 'stairs' }, 'apt')), json({ beat: 'd9_B' }));
  assert.equal(json(HS.action(9, ['d9_A', 'd9_B', 'd9_C'], { object: 'door_lefevre', id: 'porte' }, 'stairwell')), json({ beat: 'd9_D' }));
  assert.equal(json(HS.action(9, ['d9_A', 'd9_B', 'd9_C', 'd9_D', 'd9_E'], { object: 'chair_1_s', id: 'chaise' }, 'lefevre')), json({ beat: 'd9_F1' }));
  assert.equal(
    json(HS.action(9, ['d9_A', 'd9_B', 'd9_C', 'd9_D', 'd9_E', 'd9_F1', 'd9_F2', 'd9_G', 'd9_H'], { object: 'door', id: 'stairwell', exit: 'stairwell' }, 'lefevre')),
    json({ beat: 'd9_I', transit: true })
  );
  assert.equal(json(HS.view(8, ['d8_A']).cues), json([{ c: 8, r: 5 }]));
  assert.equal(json(HS.view(9, ['d9_A']).cues), json([{ c: 5, r: 18 }]));
  assert.equal(HS.view(8, []).next, 'd8_A');
  assert.equal(HS.view(8, []).auto, true);
});

function choiceVal(choices, k) {
  return Object.prototype.hasOwnProperty.call(choices, k) ? choices[k] : null;
}
function condOk(choices, w) {
  if (Array.isArray(w)) return w.every(function (x) { return condOk(choices, x); });
  if (w.any) return w.any.some(function (x) { return condOk(choices, x); });
  const v = choiceVal(choices, w.k);
  return w.v.indexOf(v == null ? null : v) >= 0;
}
function visible(steps, choices) {
  return steps.filter(function (st) {
    if (!st.when) return true;
    if (typeof st.when === 'object') return condOk(choices, st.when);
    return true;
  });
}

test('the Day 7 knock line stays inside Jour 7', () => {
  const Week = load('root.A411.Week = api').A411.Week;
  const d4 = Week.CHAPTERS.d4;
  const d7 = Week.CHAPTERS.d7;
  const gag = 'Toc, toc. C’est Madame Lefèvre, la voisine du dessous.';
  assert.equal(d4.steps.some(function (st) { return st.fr === gag; }), false);
  assert.equal(d4.n, 4);
  assert.equal(d4.title, 'La voisine en colère');
  const choices = { d6_offre: 'oui', d7_salut: 'vous', d7_band: 'A', d7_plan: 'verite', d7_reponse: 'moi' };
  const vis = visible(d7.steps, choices);
  const at = vis.findIndex(function (st) { return st.id === 'n_d7_gag'; });
  assert.equal(vis[at].fr, gag);
  assert.equal(at + 1, 28);
  assert.equal(vis.length, 44);
  assert.equal(d7.n, 7);
  assert.equal(d7.title, 'La visite de Madame Martin');
  const question = vis.find(function (st) { return st.key === 'd7_reponse'; });
  assert.equal(question.art.scene, 'cat');
  assert.equal(question.art.martin, 'cross');
});
