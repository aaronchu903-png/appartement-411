'use strict';
// Isolated synthetic browser fixtures only. Never opens an existing browser profile.
const assert = require('node:assert/strict');
const path = require('node:path');
const { start, views } = require('./round3-screenshots.cjs');
const { fixture, geometry } = require('./v4-screenshots.cjs');
const legacyFixture = require('../tests/fixtures/legacy-days1-6.cjs');
const S = require('../save.js');
const E = require('../engine.js');
const C8 = require('../content.js');
const tap = (page, action) => page.locator(`[data-action="${action}"]:visible`).last().tap();
const chore = (page, action) => page.locator(`[data-d9-action="${action}"]:visible`).tap();
const debug = (page, method, ...args) => page.evaluate(({ method, args }) => Day8App.debug[method](...args), { method, args });
const norm = value => E.normalize(String(value || '').replace(/\u00a0/g, ' '));
async function answerExercise(page, exercise) {
  if (['R1', 'R2', 'E1'].includes(exercise.type)) {
    await tap(page, 'answer:' + exercise.wordId);
    return;
  }
  if (exercise.type === 'R3') {
    const tokens = norm(exercise.answer).split(/\s+/).filter(Boolean);
    const used = new Set();
    for (const token of tokens) {
      const index = exercise.chunks.findIndex((chunk, i) => !used.has(i) && norm(chunk) === token);
      assert(index >= 0, 'missing chunk for ' + token);
      used.add(index);
      await tap(page, 'chunk:' + index);
    }
    return;
  }
  throw new Error('Unsupported review type ' + exercise.type);
}

function completedFixture() {
  const state = fixture();
  Object.assign(state.story, { day8Complete: true, day8Index: C8.scenes.length - 1, day8SceneId: C8.scenes.at(-1).id, day8Version: C8.version });
  state.notes = [{ text: 'Synthetic Day 8 note: preserve byte for byte.', createdAt: '2026-01-01T00:00:00.000Z' }];
  return state;
}

async function open(env, { dev = true, viewport = views.mobile, clock = false } = {}) {
  const context = await env.browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'allow' });
  const raw = { ...legacyFixture('yuechao').raw, [S.KEY]: JSON.stringify(completedFixture()), [S.BACKUP_PREFIX + 'synthetic-day8']: 'synthetic untouched backup' };
  await context.addInitScript(raw => {
    const values = { ...raw };
    window.day9StorageWrites = [];
    const storage = new Proxy({}, {
      get(_, key) {
        if (key === 'getItem') return name => values[name] ?? null;
        if (key === 'key') return i => Object.keys(values)[i] ?? null;
        if (key === 'length') return Object.keys(values).length;
        if (key === 'setItem') return (name, value) => { window.day9StorageWrites.push(['setItem', name]); values[name] = String(value); };
        if (key === 'removeItem') return name => { window.day9StorageWrites.push(['removeItem', name]); delete values[name]; };
        if (key === 'clear') return () => { window.day9StorageWrites.push(['clear']); for (const name of Object.keys(values)) delete values[name]; };
        return values[key];
      },
      ownKeys: () => Object.keys(values),
      getOwnPropertyDescriptor: (_, key) => Object.hasOwn(values, key) ? { configurable: true, enumerable: true, value: values[key] } : undefined,
      set(_, name, value) { window.day9StorageWrites.push(['property', name]); values[name] = String(value); return true; },
      deleteProperty(_, name) { window.day9StorageWrites.push(['delete', name]); delete values[name]; return true; }
    });
    Object.defineProperty(window, 'localStorage', { value: storage });
  }, raw);
  const page = await context.newPage(), errors = [], failed = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && /\.(?:js|css)(?:\?|$)/.test(response.url())) failed.push(response.url()); });
  if (clock) await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto(env.base + '/day9/' + (dev ? '?dev=1' : ''));
  await page.waitForFunction(() => window.Day8App?.ready);
  return {
    page,
    async unchanged() {
      assert.deepEqual(await page.evaluate(() => window.day9StorageWrites), [], 'Day 9 never attempts a player-save write, remove or clear');
      assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))), raw, 'All synthetic Day 8, legacy and backup bytes remain unchanged');
    },
    async close() { await context.close(); assert.deepEqual(errors, [], 'No uncaught browser errors'); assert.deepEqual(failed, [], 'All Day 9 script/style dependencies load'); }
  };
}

async function preview(env) {
  const run = await open(env, { dev: false }), { page } = run;
  try {
    assert.equal(await page.evaluate(() => APP_DAY), 9);
    assert.equal(await page.evaluate(() => Day9Content.day), 9);
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => new URL(node.src).pathname));
    assert(scripts.includes('/app/content-day9.js'));
    assert(scripts.includes('/app/modules/day9-chores.js'));
    assert(!scripts.includes('/app/content.js'), 'Day 9 does not load the Day 8 content bundle');
    await run.unchanged();
    await tap(page, 'continue');
    await geometry(page);
    await page.locator('#panel').getByText(/La cl[e\u00e9] tourne/).waitFor();
    assert.equal(await page.locator('[data-action="start-garden"]').count(), 0, 'Day 9 starts with the roof door, not a review gate');
    await tap(page, 'next');
    await tap(page, 'settings');
    await tap(page, 'lang:zh');
    await page.locator('#btnClose').tap();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await run.unchanged();
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0, 'Preview does not install a service worker even outside dev mode');
    await page.reload();
    await page.waitForFunction(() => window.Day8App?.ready);
    await tap(page, 'continue');
    await page.locator('#panel').getByText(/La cl[e\u00e9] tourne/).waitFor();
    await run.unchanged();
  } finally { await run.close(); }
}

async function capture(env, shot = async () => {}, options = {}) {
  const run = await open(env, { ...options, clock: true }), { page } = run;
  const framing = () => page.evaluate(() => Day8Art.cameraGeometry(document.querySelector('#scene'), Day8App.debug.getSceneModel()));
  const crisp = async () => {
    const camera = await framing();
    for (const key of ['scale', 'x', 'y']) assert(Number.isInteger(camera[key]), key + ' uses integer pixels');
    assert.equal(await page.locator('#scene').evaluate(canvas => getComputedStyle(canvas).imageRendering), 'pixelated');
    assert(await page.locator('#scene').evaluate(canvas => canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight), 'Scene backing pixels map 1:1 to the phone canvas');
    return camera;
  };
  const silent = async () => {
    assert.equal(await page.locator('#panel').innerText(), '', 'Show the action before the dialogue');
    assert.equal(await page.locator('#panel [data-action="next"]').count(), 0, 'Silent staging cannot be skipped with a next button');
  };
  let frameElapsed = 0;
  const frame = async elapsed => {
    assert(elapsed >= frameElapsed, 'Advance the panel and art clocks together');
    await page.clock.runFor(elapsed - frameElapsed);
    frameElapsed = elapsed;
    await debug(page, 'frame', elapsed);
    await geometry(page);
    await crisp();
  };
  const reviewLayout = async () => {
    await page.clock.runFor(100);
    await page.waitForFunction(() => document.querySelector('#review-art')?.width === 320);
    await geometry(page);
    const layout = await page.locator('#panel').evaluate(panel => {
      const card = panel.getBoundingClientRect(), strip = document.querySelector('#review-progress').getBoundingClientRect();
      return { gap: card.top - strip.bottom, height: card.height, content: [...panel.children].reduce((sum, child) => {
        const css = getComputedStyle(child);
        return sum + child.getBoundingClientRect().height + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
      }, 0) };
    });
    assert(layout.gap >= 0 && layout.gap <= 20, 'Day 9 review sits directly below the strip');
    assert(layout.height - layout.content < 45, 'Day 9 review card fits its contents rather than stretching');
  };
  const C = require('../content-day9.js');
  const scene = id => { const value = C.scenes.find(scene => scene.id === id); assert(value, id + ' exists'); return value; };
  const show = async (id, name, elapsed = 1600) => {
    scene(id);
    await debug(page, 'jump', id);
    frameElapsed = 0;
    await frame(elapsed);
    await shot(page, name);
  };
  try {
    await tap(page, 'continue');
    // Freeze real panel timers as well as art: screenshot latency must not reveal a line.
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const first = await debug(page, 'getState');
    assert.equal(first.story.day9SceneId, 'n_d10_monte', 'Completed Day 8 fixture opens the first Day 9 scene');
    assert.equal(first.story.day8SceneId, C8.scenes.at(-1).id, 'Day 8 cursor is not overwritten by the Day 9 cursor');
    assert.equal(first.story.has_key, true);
    await show('n_d10_monte', 'roof-door-opening', 900);
    await show('d10_qui', 'medium-panel');
    await show('n_d10_matin', 'close-clock');
    for (const [prop, id] of [['pen', 'd10_noe_stylo'], ['sock', 'd10_noe_manque'], ['croissant', 'n_d10_miettes']]) {
      await show(id, prop + '-vanish-before', 100);
      await silent();
      const before = await framing();
      assert.equal(before.insert, true, 'Vanish is an object insert, not a face close-up');
      assert(Number.isInteger(before.scale));
      await show(id, prop + '-vanish-moment', 850);
      await silent();
      assert.deepEqual(await framing(), before, prop + ' moment keeps the before camera');
      const moment = await page.locator('#scene').evaluate(canvas => canvas.toDataURL());
      await frame(2400);
      await silent();
      assert.deepEqual(await framing(), before, prop + ' absence keeps the before camera');
      const absence = await page.locator('#scene').evaluate(canvas => canvas.toDataURL());
      assert.notEqual(moment, absence, prop + ' vanish has distinct motion and absent frames');
      await shot(page, prop + '-vanish-absence');
      assert(!scene(id).staging.props.includes(prop), prop + ' remains absent in per-beat staging');
      await frame(2800);
      await silent();
      const reaction = await framing();
      assert.equal(reaction.insert, false, prop + ' cuts from absence to a human reaction');
      assert.notDeepEqual(reaction.pose, before.pose, prop + ' reaction has its own framing');
      await shot(page, prop + '-reaction');
      await frame(3400);
      assert(await page.locator('#panel .dialogue').isVisible(), prop + ' dialogue follows the silent reaction');
    }
    await show('n_d10_tresor', 'third-pot-pushin-start', 100);
    await silent();
    const pushStart = await framing();
    await frame(2600);
    await silent();
    const landed = await framing();
    assert.equal(landed.subject, 'thirdPot');
    assert(landed.scale > pushStart.scale, 'The push-in lands closer to the third pot');
    await shot(page, 'third-pot-roof-reveal');
    await frame(3200);
    assert(await page.locator('#panel .dialogue').isVisible(), 'The reveal line appears after the push-in lands');
    assert.deepEqual((await framing()).pose, landed.pose, 'The landed camera does not move when the line appears');
    await shot(page, 'third-pot-line');
    assert.equal((await debug(page, 'getSceneModel')).staging.thirdPot, 'stash');
    await show('d10_noe_tout', 'roof-laugh-medium');
    const laugh = await debug(page, 'getSceneModel');
    assert.equal(typeof laugh.shot === 'string' ? laugh.shot : laugh.shot.type, 'medium');
    assert.equal((await framing()).subject, 'group', 'The laugh includes all three people');
    await debug(page, 'review', 'R1', 'garden', 'ce_nest_pas_moi');
    const exercise = await debug(page, 'getExercise');
    assert.equal(exercise.wordId, 'ce_nest_pas_moi');
    await reviewLayout();
    await shot(page, 'review-ce-nest-pas-moi');
    await answerExercise(page, exercise);
    assert.equal((await debug(page, 'getSession')).feedback.correct, true);
    assert.match(E.normalize(await page.locator('.feedback-sentence').innerText()), /ce n.est pas moi/);
    await reviewLayout();
    await shot(page, 'review-ce-nest-pas-moi-correct');
    await show('n_d10_ding', 'laptop-hook');
    await show('done', 'end');
    await run.unchanged();
  } finally { await run.close(); }
}

async function traverse(env) {
  const run = await open(env), { page } = run;
  const C = require('../content-day9.js');
  try {
    await tap(page, 'continue');
    const initial = await debug(page, 'getState'), visited = [];
    for (const scene of C.scenes) {
      await page.waitForFunction(id => Day8App.debug.getState().story.day9SceneId === id, scene.id);
      visited.push(scene.id);
      if (scene.kind === 'end') break;
      if (scene.kind === 'water') {
        assert.equal(await page.locator('#panel .dialogue').count(), 0, 'Water invite has no mandatory review dialogue');
        await tap(page, 'day9-skip-water');
      } else if (scene.kind === 'hub') {
        await page.locator('[data-d9-action="open"][data-activity="dishes"]').tap();
        for (let plate = 0; plate < 6; plate++) await chore(page, 'wash');
        await chore(page, 'hub');
        await chore(page, 'evening');
      } else if (scene.kind === 'letter') {
        await chore(page, 'letter-read');
        await chore(page, 'deliver');
        assert.equal((await debug(page, 'getChores')).letter.delivered, true);
        await chore(page, 'continue');
      } else if (scene.kind === 'search') {
        const before = (await debug(page, 'getState')).cards;
        for (const option of scene.options.filter(option => option.id !== scene.answer)) {
          await tap(page, 'day9-search:' + option.id);
          assert.equal((await debug(page, 'getState')).story.day9SceneId, scene.id, 'An empty search spot keeps the scene open');
          assert.match(await page.locator('#panel').innerText(), /Rien/);
        }
        assert.deepEqual((await debug(page, 'getState')).cards, before, 'Searching never grades learning cards');
        if (scene.nonBlocking) await tap(page, 'next');
        else await tap(page, 'day9-search:' + scene.answer);
      } else if (scene.kind === 'walk') {
        for (let step = 0; step < scene.tiles; step++) {
          assert.equal((await debug(page, 'getState')).story.day9SceneId, scene.id, 'Crumb trail requires all five actual taps');
          assert.equal(await page.locator('[data-action^="answer:"]').count(), 0, 'Stairwell is not a review gate');
          await tap(page, 'point-next');
        }
      } else if (scene.kind === 'reply' || scene.kind === 'choice') {
        const selected = scene.id === 'd10_qui' ? scene.options.findIndex(option => option.id === 'chat') : 0;
        await tap(page, 'reply-option:' + selected);
        if (scene.id === 'd10_qui') assert.match(E.normalize(await page.locator('#panel').innerText()), /poches/);
        if (scene.id === 'd10_reponse') assert.match(await page.locator('#panel').innerText(), /Tu avais raison/);
        await geometry(page);
        await tap(page, 'next');
      } else if (scene.kind === 'focus') {
        await tap(page, 'focus-next');
      } else {
        await page.locator('[data-action="next"]:visible').waitFor();
        await geometry(page);
        await tap(page, 'next');
      }
    }
    assert.deepEqual(visited, C.scenes.map(scene => scene.id), 'Real UI visits the full authored scene order without debug jumps');
    await page.waitForFunction(() => document.querySelector('#app').dataset.screen === 'end', null, { timeout: 15000 });
    assert.equal(await page.locator('#app').getAttribute('data-screen'), 'end');
    assert.match(await page.locator('#panel .eyebrow').innerText(), /JOUR 9/);
    const final = await debug(page, 'getState');
    assert.deepEqual(final.cards, initial.cards, 'Story, chores and letter never change FSRS grades');
    assert.equal(final.story.day8SceneId, initial.story.day8SceneId);
    assert.equal(final.story.day9_done, true);
    await run.unchanged();
  } finally { await run.close(); }
}

async function chores(env, shot = async () => {}) {
  const run = await open(env), { page } = run;
  const activity = async name => {
    await page.locator(`[data-d9-action="open"][data-activity="${name}"]`).tap();
    await geometry(page);
  };
  const place = async (item, target) => {
    await page.locator(`[data-item="${item}"]`).tap();
    await page.locator(`[data-d9-action="place"][data-target="${target}"]`).tap();
  };
  try {
    await debug(page, 'jump', 'd10_afternoon');
    const initial = await debug(page, 'getState');
    await geometry(page);
    assert.equal((await debug(page, 'getSceneModel')).staging.thirdPot, 'hidden', 'The afternoon hub cannot spoil the third-pot stash');
    assert.equal(await page.locator('[data-activity="letter9"]').count(), 0, 'Letter cannot be delivered before the roof reveal');
    await shot(page, 'afternoon-hub');

    await activity('list');
    await place('lait', 'table');
    assert.deepEqual((await debug(page, 'getChores')).runs.list.placed, [], 'Wrong room does not complete a list item');
    await page.locator('[data-d9-action="place"][data-target="frigo"]').tap();
    await place('vaisselle', 'evier');
    const item = await page.locator('[data-item="pain"]').boundingBox();
    const target = await page.locator('[data-d9-action="place"][data-target="table"]').boundingBox();
    assert(item && target);
    await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.equal((await debug(page, 'getChores')).completed.list, 1, 'Pointer drag and tap-to-place both complete real items');
    await chore(page, 'hub');

    await activity('dishes');
    for (let plate = 1; plate <= 5; plate++) {
      await chore(page, 'wash');
      const state = await debug(page, 'getChores');
      assert.equal(state.runs.dishes.plates, plate);
      assert.equal(state.spoonGone, false, 'Spoon remains until the sixth plate');
      assert.equal(await page.locator('.day9-plate.is-clean').count(), plate);
    }
    await shot(page, 'spoon-vanish-before');
    await chore(page, 'wash');
    assert.equal((await debug(page, 'getChores')).spoonGone, true);
    await debug(page, 'frame', 850);
    await geometry(page);
    await shot(page, 'spoon-vanish-moment');
    const moment = await page.locator('#scene').evaluate(canvas => canvas.toDataURL());
    await debug(page, 'frame', 2400);
    assert.notEqual(await page.locator('#scene').evaluate(canvas => canvas.toDataURL()), moment);
    await shot(page, 'spoon-vanish-absence');
    assert.equal((await debug(page, 'getSceneModel')).staging.spoon, 'gone');
    assert.match(await page.locator('.day9-rack').innerText(), /vide/);
    assert.equal(await page.locator('[data-d9-action="wash"]').isDisabled(), true);
    const reward = (await debug(page, 'getChores')).earned;
    await chore(page, 'repeat');
    for (let plate = 0; plate < 6; plate++) await chore(page, 'wash');
    assert.equal((await debug(page, 'getChores')).earned, reward + .5, 'Repeated dishes award only the reduced reward');
    assert.notEqual((await debug(page, 'getSceneModel')).action?.state, 'vanish', 'Repeating dishes never respawns or steals the spoon again');
    await chore(page, 'hub');

    await activity('table');
    for (const item of ['tartine', 'tasse', 'assiette']) await place(item, 'table');
    assert.equal((await debug(page, 'getChores')).completed.table, 1);
    await chore(page, 'hub');
    await activity('coins');
    await page.locator('[data-number="3"]').tap();
    assert.equal((await debug(page, 'getChores')).runs.coins.counted, 0);
    for (let number = 1; number <= 10; number++) await page.locator(`[data-number="${number}"]`).tap();
    const counted = await debug(page, 'getChores');
    assert.equal(counted.completed.coins, 1);
    assert.equal(counted.jar.noeEuros, 5);
    await chore(page, 'hub');
    await activity('hide');
    await page.locator('[data-spot="panier"]').tap();
    assert.equal((await debug(page, 'getChores')).runs.hide.round, 0, 'Wrong hiding spot is retryable');
    for (const [index, spot] of ['placard', 'canape', 'table', 'panier'].entries()) {
      assert.equal((await debug(page, 'getSceneModel')).staging.thirdPot, 'hidden');
      await chore(page, 'listen');
      await page.locator(`[data-spot="${spot}"]`).tap();
      assert.equal((await debug(page, 'getChores')).runs.hide.round, index + 1);
    }
    assert.equal((await debug(page, 'getChores')).completed.hide, 1);
    await chore(page, 'hub');
    await geometry(page);
    await shot(page, 'chores-complete');
    await chore(page, 'evening');
    assert.equal((await debug(page, 'getState')).story.day9SceneId, 'n_d10_gouter');
    assert.deepEqual((await debug(page, 'getState')).cards, initial.cards, 'Chores never grade learning cards');
    await run.unchanged();
  } finally { await run.close(); }
}

module.exports = { completedFixture, open, preview, capture, traverse, chores };
if (require.main === module) (async () => {
  const env = await start(process.env.V8_BROWSER || 'chromium');
  try {
    await preview(env);
    const shot = async (page, name) => {
      const file = path.resolve(__dirname, '../screenshots/v8-day9-' + name + '.png');
      await page.screenshot({ path: file });
      console.log(file);
    };
    await capture(env, shot);
    await chores(env, shot);
    await traverse(env);
  } finally { await env.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
