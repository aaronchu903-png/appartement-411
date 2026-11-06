'use strict';
// Isolated synthetic browser fixtures only. Never opens an existing browser profile.
const assert = require('node:assert/strict');
const path = require('node:path');
const { start, views, gardenFixture, answerReview, autoAdvanced } = require('./round3-screenshots.cjs');
const { geometry } = require('./v4-screenshots.cjs');
const day9 = require('./v8-day9-screenshots.cjs');
const legacyFixture = require('../tests/fixtures/legacy-days1-6.cjs');
const S = require('../save.js');
const C9 = require('../content-day9.js');
const tap = (page, action) => page.locator(`[data-action="${action}"]:visible`).last().tap();
const chore = (page, action) => page.locator(`[data-d10-action="${action}"]:visible`).tap();
const debug = (page, method, ...args) => page.evaluate(({ method, args }) => Day10App.debug[method](...args), { method, args });
const sceneId = page => page.evaluate(() => Day10App.debug?.getState().story.day10SceneId || window.day10SceneModel?.staging?.beat);
const requiredShots = [
  'message-laptop-cu', 'keyboard-cat', 'martin-panel-open', 'dictation', 'breakfast-milk',
  'roof-souriez-highpoint', 'polaroid-freeze', 'lefevre-stairs-look',
  'evening-zoom-tail-in-photo', 'hook-flash', 'end-card', 'album-chore', 'day9-croissant-palette'
];

function completedFixture() {
  const state = day9.completedFixture();
  const due = gardenFixture(12);
  state.words = due.words;
  state.cards = due.cards;
  Object.assign(state.story, { day9Complete: true, day9_done: true, day9Index: C9.scenes.length - 1,
    day9SceneId: C9.scenes.at(-1).id, day9Version: C9.version, eveningIndex: 500 });
  state.notes = [{ text: 'Synthetic Day 9 note: preserve byte for byte.', createdAt: '2026-01-01T00:00:00.000Z' }];
  return state;
}

async function open(env, { dev = true, viewport = views.mobile, clock = false } = {}) {
  const context = await env.browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'allow' });
  const raw = { ...legacyFixture('yuechao').raw, [S.KEY]: JSON.stringify(completedFixture()),
    [S.BACKUP_PREFIX + 'synthetic-day9']: 'synthetic untouched backup', 'other-game.save': 'unrelated save' };
  const session = { 'other-game.session': 'untouched session save' };
  await context.addInitScript(({ raw, session }) => {
    window.day10StorageWrites = [];
    for (const [namespace, initial] of [['localStorage', raw], ['sessionStorage', session]]) {
      const values = { ...initial };
      const record = (operation, key) => window.day10StorageWrites.push([namespace, operation, key]);
      const storage = new Proxy({}, {
        get(_, key) {
          if (key === 'getItem') return name => values[name] ?? null;
          if (key === 'key') return i => Object.keys(values)[i] ?? null;
          if (key === 'length') return Object.keys(values).length;
          if (key === 'setItem') return (name, value) => { record('setItem', name); values[name] = String(value); };
          if (key === 'removeItem') return name => { record('removeItem', name); delete values[name]; };
          if (key === 'clear') return () => { record('clear'); for (const name of Object.keys(values)) delete values[name]; };
          return values[key];
        },
        ownKeys: () => Object.keys(values),
        getOwnPropertyDescriptor: (_, key) => Object.hasOwn(values, key) ? { configurable: true, enumerable: true, value: values[key] } : undefined,
        set(_, name, value) { record('property', name); values[name] = String(value); return true; },
        deleteProperty(_, name) { record('delete', name); delete values[name]; return true; },
        defineProperty(_, name, descriptor) { record('defineProperty', name); values[name] = String(descriptor.value); return true; }
      });
      Object.defineProperty(window, namespace, { value: storage });
    }
  }, { raw, session });
  const page = await context.newPage(), errors = [], failed = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && /\.(?:js|css)(?:\?|$)/.test(response.url())) failed.push(response.url()); });
  try {
    if (clock) await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.goto(env.base + '/day10/' + (dev ? '?dev=1' : ''));
    await page.waitForFunction(() => window.Day10App?.ready);
    const assets = await page.evaluate(() => Day8Art.warmup(10));
    assert(assets.loaded > 0, 'Day 10 supplied PNG assets load before testing');
    assert.deepEqual(assets.missing, [], 'No required Day 10 camera images are missing');
    await page.evaluate(() => {
      window.day10Spoken = [];
      const speak = window.Day8Audio.speak;
      window.Day8Audio.speak = (text, id, ...args) => {
        window.day10Spoken.push({ text, id });
        return speak(text, id, ...args);
      };
      const art = window.Day8Art;
      window.Day8Art = { ...art, draw(canvas, model, ...args) {
        if (canvas.id === 'scene') window.day10SceneModel = model;
        return art.draw(canvas, model, ...args);
      } };
    });
  } catch (error) { await context.close(); throw error; }
  return {
    page,
    async unchanged() {
      assert.deepEqual(await page.evaluate(() => window.day10StorageWrites), [], 'Day 10 never attempts to write, remove or clear ANY player saves');
      for (const [namespace, initial] of [['localStorage', raw], ['sessionStorage', session]]) {
        assert.deepEqual(await page.evaluate(name => Object.fromEntries(Object.keys(window[name]).map(key => [key, window[name].getItem(key)])), namespace), initial,
          namespace + ' preserves all synthetic Day 9, legacy, backup and unrelated bytes');
      }
    },
    async close() { await context.close(); assert.deepEqual(errors, [], 'No uncaught browser errors'); assert.deepEqual(failed, [], 'All Day 10 script/style dependencies load'); }
  };
}

async function preview(env) {
  const run = await open(env, { dev: false }), { page } = run;
  try {
    assert.equal(await page.evaluate(() => APP_DAY), 10);
    assert.equal(await page.evaluate(() => Day10Content.day), 10);
    assert.equal(await page.evaluate(() => !!Day10App.debug), false, 'Production preview does not need dev mode to protect saves');
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => new URL(node.src).pathname));
    assert(scripts.includes('/app/content-day10.js'));
    assert(scripts.includes('/app/modules/day10-chores.js'));
    assert(!scripts.includes('/app/content.js'), 'Preview does not load the Day 8 story bundle');
    assert.match(await page.locator('body').innerText(), /preview|aper\u00e7u/i, 'Production preview visibly identifies itself');
    await run.unchanged();
    await tap(page, 'continue');
    await page.locator('#panel').getByText(/Le message est l\u00e0/).waitFor();
    assert.equal(await page.locator('[data-action="start-garden"]').count(), 0, 'The message opens before any review');
    await geometry(page);
    await tap(page, 'next');
    await tap(page, 'settings');
    await tap(page, 'lang:zh');
    await page.locator('#btnClose').tap();
    await tap(page, 'notes');
    await page.locator('#note-text').fill('Synthetic production preview note that must remain memory-only.');
    await tap(page, 'save-note');
    await page.locator('#btnClose').tap();
    await tap(page, 'settings');
    await tap(page, 'evening');
    await tap(page, 'evening-audio');
    assert.equal(await page.evaluate(() => window.day10Spoken.at(-1).id), 'n_d11_matin2', 'Inherited out-of-range evening cursor cannot break Day 10 listening');
    await page.locator('#btnClose').tap();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await run.unchanged();
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0, 'Production preview does not install a service worker');
    await page.reload();
    await page.waitForFunction(() => window.Day10App?.ready);
    await tap(page, 'continue');
    await page.locator('#panel').getByText(/Le message est l\u00e0/).waitFor();
    await run.unchanged();
  } finally { await run.close(); }
}

async function dictation(page, shot = async () => {}) {
  const input = page.locator('#voice-input');
  await input.waitFor();
  assert.doesNotMatch(await page.locator('#panel').innerText(), /\bphoto\b/i, 'Dictation hides the spelling before a correct answer');
  assert.equal(await page.locator('.canonical-answer').count(), 0);
  await shot(page, 'dictation');
  await input.fill('fin du mois');
  await input.press('Enter');
  assert.equal(await sceneId(page), 'd11_dictee');
  assert.doesNotMatch(await page.locator('#panel').innerText(), /\bphoto\b/i, 'A wrong dictation attempt cannot reveal the spelling');
  assert.equal(await page.locator('[data-action="next"]').count(), 0, 'Listening-only fin du mois is not the dictation answer');
  await page.locator('#voice-input').fill('photo');
  await page.locator('#voice-input').press('Enter');
  assert.match(await page.locator('.canonical-answer').innerText(), /photo/);
  await geometry(page);
  await shot(page, 'dictation-correct');
  await tap(page, 'next');
}

async function capture(env, shot = async () => {}, options = {}) {
  const run = await open(env, { ...options, clock: true }), { page } = run;
  const C = require('../content-day10.js');
  const framing = () => page.evaluate(() => Day8Art.cameraGeometry(document.querySelector('#scene'), Day10App.debug.getSceneModel()));
  const crisp = async () => {
    const camera = await framing();
    for (const key of ['scale', 'x', 'y']) assert(Number.isInteger(camera[key]), key + ' uses integer pixels');
    assert(Number.isInteger(camera.pixelScale), 'PNG scaling uses an integer nearest-neighbour factor');
    assert(camera.subject && camera.bounds, 'Camera names and bounds the acting subject, not just the ceiling');
    const [x, y, width, height] = camera.bounds;
    const canvasWidth = await page.locator('#scene').evaluate(canvas => canvas.width);
    assert(x - width / 2 >= 0 && x + width / 2 <= canvasWidth, 'Acting subject fits horizontally without sliced faces');
    assert(y - height / 2 >= camera.top && y + height / 2 <= camera.bottom, 'Acting subject remains inside the scene zone above the panel');
    assert.equal(await page.locator('#scene').evaluate(canvas => getComputedStyle(canvas).imageRendering), 'pixelated');
    assert(await page.locator('#scene').evaluate(canvas => canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight), 'Canvas backing pixels map 1:1 to the phone');
    return camera;
  };
  const silent = async () => {
    assert.equal(await page.locator('#panel').innerText(), '', 'Action precedes all dialogue');
    assert.equal(await page.locator('#panel [data-action="next"]').count(), 0, 'Silent staging has no skip button');
  };
  let frameElapsed = 0;
  const frame = async elapsed => {
    assert(elapsed >= frameElapsed, 'Panel timers and art advance together');
    await page.clock.runFor(elapsed - frameElapsed);
    frameElapsed = elapsed;
    await debug(page, 'frame', elapsed);
    await geometry(page);
    await crisp();
  };
  const show = async (id, name, elapsed = 1600) => {
    assert(C.scenes.some(scene => scene.id === id), id + ' exists');
    await debug(page, 'jump', id);
    frameElapsed = 0;
    await frame(elapsed);
    if (name) await shot(page, name);
  };
  try {
    await tap(page, 'continue');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const first = await debug(page, 'getState');
    assert.equal(first.story.day10SceneId, 'n_d11_matin2');
    assert.equal(first.story.day9SceneId, C9.scenes.at(-1).id, 'Day 10 leaves the Day 9 cursor untouched');
    await show('d11_cam_lit', null, 100);
    await tap(page, 'settings');
    await page.clock.runFor(1000);
    await page.locator('#btnClose').tap();
    assert(await page.locator('#panel .dialogue').isVisible(), 'Closing Pause after the action timer restores dialogue and controls');
    assert(await page.locator('[data-action="next"]').isVisible());
    for (const id of ['d11_cam_lit', 'd11_mar_bonjour', 'd11_noe_lait', 'd11_cam_souriez2', 'n_d11_regard', 'n_d11_queue']) {
      const scene = C.scenes.find(scene => scene.id === id);
      const delay = Math.max(scene.silenceBeforeMs || 0, scene.staging?.delayMs || 0);
      assert(delay >= 800, id + ' has at least 800ms show-before-say');
      await show(id, null, 100);
      await silent();
      await frame(799);
      await silent();
      await frame(delay + 100);
      assert(await page.locator('#panel .dialogue').isVisible(), id + ' reveals dialogue after its action');
    }
    await show('n_d11_ecran', 'message-laptop-cu');
    assert((await page.evaluate(() => window.day10Spoken)).some(call => call.id === 'n_d11_ecran'), 'Focus source voice starts after the action lead-in instead of waiting for the ten-second fallback');
    assert.equal((await framing()).insert, true, 'Laptop is an object insert, not fullscreen UI');
    await show('keyboard_cat', 'keyboard-cat', 1100);
    await silent();
    const keyboard = await page.locator('#scene').evaluate(canvas => canvas.toDataURL());
    await frame(1550);
    assert.notEqual(await page.locator('#scene').evaluate(canvas => canvas.toDataURL()), keyboard, 'Keyboard gag visibly animates');
    await show('d11_mar_bonjour', 'martin-panel-open');
    assert(await page.locator('#panel .dialogue').isVisible());
    await show('d11_dictee', null);
    await dictation(page, shot);
    await show('d11_photo', 'message-picture-pick');
    assert.match(await page.locator('#panel .question').innerText(), /Madame Martin voudrait une photo de quoi/);
    assert.equal(await page.locator('#panel [data-action^="story-answer:"] img').count(), 3, 'A13 displays distinct plant, cat and sofa picture options');
    assert.equal(await page.evaluate(() => window.day10Spoken.at(-1).id), 'd11_photo', 'The authored question is not immediately cancelled by the answer cue');
    await tap(page, 'story-answer:plante');
    assert.equal(await page.evaluate(() => window.day10Spoken.at(-1).id), 'une_photo_de_la_plante', 'Correct pick replays the deck chunk clip');
    await show('d11_noe_lait', 'breakfast-milk');
    for (const [index, action] of ['serveCoffee', 'serveTea', 'passBread'].entries()) {
      await show('d11_cafe', null);
      await tap(page, 'reply-option:' + index);
      await page.clock.runFor(900);
      assert.equal((await debug(page, 'getSceneModel')).staging.replyAction, action, 'Cafe response stages its corresponding serve/pass action');
    }
    await show('d11_cam_souriez2', 'roof-souriez-highpoint');
    assert.match(await page.locator('#panel .dialogue').innerText(), /Souriez/);
    await show('polaroid_freeze', 'polaroid-freeze', 1800);
    await silent();
    await frame(4400);
    await silent();
    assert.equal((await debug(page, 'getState')).story.day10SceneId, 'polaroid_freeze', 'The silent photo retains its full three-second hold');
    await show('n_d11_regard', 'lefevre-stairs-look', 2400);
    await show('n_d11_queue', 'evening-zoom-tail-in-photo', 2400);
    assert.equal((await framing()).insert, true, 'Tail reveal stays inside a phone insert');
    await show('n_d11_souvenir', 'hook-flash', 500);
    await silent();
    await show('done', 'end-card');
    assert.match(await page.locator('#panel .eyebrow').innerText(), /JOUR 10/);
    await tap(page, 'day10-evening');
    await debug(page, 'frame', 1600);
    await geometry(page);
    await shot(page, 'evening-split');
    await tap(page, 'day10-end');
    await run.unchanged();
  } finally { await run.close(); }

  const previous = await day9.open(env, { viewport: options.viewport || views.mobile });
  try {
    await previous.page.evaluate(() => Day8App.debug.jump('n_d10_chat'));
    await previous.page.locator('#panel .dialogue').waitFor();
    await previous.page.evaluate(() => Day8App.debug.frame(1600));
    await geometry(previous.page);
    const palette = await previous.page.locator('#scene').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const colours = new Set();
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) colours.add([pixels[i], pixels[i + 1], pixels[i + 2]].join(','));
      return [...colours];
    });
    assert(palette.includes('224,123,57'), 'Day 9 Croissant uses approved #E07B39 fur');
    await shot(previous.page, 'day9-croissant-palette');
    await previous.unchanged();
  } finally { await previous.close(); }
}

async function traverse(env, { dev = true } = {}) {
  const run = await open(env, { dev }), { page } = run;
  const C = require('../content-day10.js');
  try {
    await tap(page, 'continue');
    const initial = dev ? await debug(page, 'getState') : null, visited = [];
    for (const scene of C.scenes) {
      if (!dev && scene.kind === 'hub') await page.locator('[data-d10-action="evening"]').waitFor();
      else await page.waitForFunction(id => (Day10App.debug?.getState().story.day10SceneId || window.day10SceneModel?.staging?.beat) === id, scene.id);
      visited.push(scene.id);
      if (dev) assert.equal((await debug(page, 'getState')).story.day10Index, C.scenes.indexOf(scene));
      if (scene.kind === 'end') break;
      if ((scene.silent && scene.kind === 'line') || ['establishing', 'ritual'].includes(scene.kind)) {
        assert.equal(await page.locator('#panel').innerText(), '', scene.id + ' stays text-free');
        if (scene.kind === 'line') {
          await page.locator('[data-action="next"]:visible').waitFor();
          assert.equal(await page.locator('#panel .dialogue').count(), 0, 'Art-only beat adds no narration after its hold');
          await tap(page, 'next');
        }
        continue;
      }
      if (scene.kind === 'water') {
        assert.equal(await page.locator('[data-action^="answer:"]').count(), 0, 'Watering never gates story progress');
        await tap(page, 'day10-skip-water');
      } else if (scene.kind === 'hub') {
        assert.equal(await page.locator('[data-d10-action="open"]').count(), 6, 'Exactly six optional chores, not mandatory watering');
        if (!dev) {
          // Exercise persistence paths in production too, where the dev save bypass is absent.
          const D = require('../modules/day10-chores.js');
          for (const name of Object.keys(D.activities)) {
            await page.locator(`[data-d10-action="open"][data-activity="${name}"]`).tap();
            if (name === 'fridge') {
              for (const item of D.missingItems) await page.locator(`[data-d10-action="missing"][data-item="${item.id}"]`).tap();
            } else if (name === 'list') {
              for (const line of D.listLines) {
                for (let index = 0; index < line.split(' ').length; index++) await page.locator(`[data-d10-action="chip"][data-number="${index}"]`).tap();
                await chore(page, 'list-check');
              }
            } else if (name === 'coffee') {
              for (const order of D.coffeeOrders) await page.locator(`[data-d10-action="serve"][data-item="${order.item}"]`).tap();
            } else if (name === 'album') {
              for (const image of D.albumShots) {
                await page.locator(`[data-d10-action="frame"][data-shot="${image.id}"]`).tap();
                await chore(page, 'snap');
              }
            } else if (name === 'message') {
              await page.locator('[data-d10-action="pick"][data-item="plante"]').tap();
            } else {
              await chore(page, 'letter-read');
              await chore(page, 'letter-save');
            }
            await chore(page, 'hub');
            await run.unchanged();
          }
          assert.equal(await page.locator('.day9-menu small').count(), 6, 'Production completes all six real chores without persisting a save');
        }
        await chore(page, 'evening');
      } else if (scene.kind === 'voicemail') {
        await dictation(page);
      } else if (scene.kind === 'pick') {
        const before = await page.evaluate(() => window.day10Spoken.length);
        await tap(page, 'story-answer:chat');
        assert.equal(await sceneId(page), scene.id);
        assert((await page.evaluate(n => window.day10Spoken.slice(n), before)).some(call => call.id === 'd11_mar_photo'), 'Wrong pick replays Martin, not just the answer word');
        await tap(page, 'next');
      } else if (scene.kind === 'reply' || scene.kind === 'choice') {
        const input = page.locator('#reply-input');
        if (scene.kind === 'reply') {
          await input.waitFor();
          await input.fill('Une tentative libre');
          await input.press('Enter');
        } else await tap(page, 'reply-option:0');
        assert(await page.locator('[data-action="next"]').isVisible(), 'One M4 attempt is enough, without grading');
        await tap(page, 'next');
      } else if (scene.kind === 'focus') {
        await tap(page, 'focus-next');
      } else {
        await page.locator('[data-action="next"]:visible').waitFor();
        await geometry(page);
        await tap(page, 'next');
      }
    }
    assert.deepEqual(visited, C.scenes.map(scene => scene.id), 'Real interactions visit every authored scene in order without debug jumps');
    await page.waitForFunction(() => document.querySelector('#app').dataset.screen === 'end');
    if (dev) {
      const final = await debug(page, 'getState');
      assert.deepEqual(final.cards, initial.cards, 'Story, wrong picks, dictation and M4 never grade FSRS cards');
      assert.equal(final.story.day9SceneId, initial.story.day9SceneId);
      assert.equal(final.story.day8SceneId, initial.story.day8SceneId);
      assert.equal(final.story.day10_done, true);
    }
    await run.unchanged();
  } finally { await run.close(); }
}

async function chores(env, shot = async () => {}) {
  const run = await open(env), { page } = run;
  const D = require('../modules/day10-chores.js');
  const activity = async name => {
    await page.locator(`[data-d10-action="open"][data-activity="${name}"]`).tap();
    await geometry(page);
  };
  const item = (action, value) => page.locator(`[data-d10-action="${action}"][data-item="${value}"]`).tap();
  try {
    await debug(page, 'jump', 'd11_afternoon');
    const initial = await debug(page, 'getState');
    assert.deepEqual(await page.locator('[data-d10-action="open"]').evaluateAll(nodes => nodes.map(node => node.dataset.activity)),
      ['fridge', 'list', 'coffee', 'album', 'message', 'letter10']);
    assert(await page.locator('[data-d10-action="water"]').isVisible(), 'Skipped watering remains an optional hub invitation');
    await geometry(page);
    await shot(page, 'afternoon-hub');
    await activity('fridge');
    await item('missing', 'basilic');
    assert.deepEqual((await debug(page, 'getChores')).runs.fridge.found, [], 'Existing basil is not a missing grocery');
    for (const value of D.missingItems) await item('missing', value.id);
    assert.equal((await debug(page, 'getChores')).completed.fridge, 1);
    await chore(page, 'hub');

    await activity('list');
    await page.locator('[data-d10-action="chip"][data-number="1"]').tap();
    await chore(page, 'list-check');
    assert.equal((await debug(page, 'getChores')).runs.list.round, 0, 'Wrong chip order does not advance the shopping list');
    await page.locator('[data-d10-action="unchip"][data-number="0"]').tap();
    for (const line of D.listLines) {
      for (let index = 0; index < line.split(' ').length; index++) await page.locator(`[data-d10-action="chip"][data-number="${index}"]`).tap();
      await chore(page, 'list-check');
    }
    const list = await debug(page, 'getChores');
    assert.equal(list.completed.list, 1);
    assert.equal(list.breadReturned, true);
    assert.equal(list.pastryEatenOnStairs, true);
    await chore(page, 'hub');

    await activity('coffee');
    assert(!((await page.locator('#panel').innerText()).includes(D.coffeeOrders[0].text)), 'Coffee request text waits for the serving action');
    await page.locator('#panel').getByText(D.coffeeOrders[0].text, { exact: true }).waitFor();
    await item('serve', 'lait');
    assert.equal((await debug(page, 'getChores')).runs.coffee.round, 0, 'Wrong drink remains retryable');
    for (const order of D.coffeeOrders) await item('serve', order.item);
    assert.equal((await debug(page, 'getChores')).completed.coffee, 1);
    await chore(page, 'hub');

    await activity('album');
    assert.equal(await page.locator('[data-d10-action="snap"]').isDisabled(), true, 'Album cannot snap before framing');
    await page.locator('[data-d10-action="frame"][data-shot="chair"]').tap();
    assert.equal(await page.locator('[data-d10-action="snap"]').isDisabled(), true, 'Wrong framing does not count as a photo');
    const frames = [];
    for (const [index, value] of D.albumShots.entries()) {
      await page.locator(`[data-d10-action="frame"][data-shot="${value.id}"]`).tap();
      await debug(page, 'frame', 1000);
      const model = await debug(page, 'getSceneModel');
      assert.equal(model.staging.photobomb, false);
      assert.equal(model.staging.catPot, 3, 'Croissant stays asleep in the third pot during every album shot');
      assert.equal(model.staging.polaroidInAlbum, false);
      assert.equal(model.staging.tailInLiveView, false);
      frames.push(await page.locator('#scene').evaluate(canvas => canvas.toDataURL()));
      await geometry(page);
      await shot(page, 'album-' + value.id);
      await chore(page, 'snap');
      assert.equal((await debug(page, 'getChores')).album.photos.length, index + 1);
    }
    assert.equal(new Set(frames).size, 5, 'Five album subjects produce five distinct camera images');
    const album = await debug(page, 'getChores');
    assert.equal(album.completed.album, 1);
    assert.deepEqual(album.album.photos, ['chimney', 'sky', 'pot1', 'pot2', 'chair']);
    assert.equal(album.album.polaroid, false, 'Story polaroid is reserved for Day 11');
    assert.equal(await page.locator('[data-album-shot].is-filled').count(), 5);
    assert.equal(await page.locator('[data-polaroid-slot="reserved"]').innerText(), '');
    await debug(page, 'frame', 1600);
    await shot(page, 'album-chore');
    await chore(page, 'hub');

    await activity('message');
    await chore(page, 'listen');
    for (let line = 1; line < D.messageLines.length; line++) await chore(page, 'message-next');
    await item('pick', 'chat');
    assert.equal((await debug(page, 'getChores')).completed.message, undefined);
    await page.waitForFunction(() => window.day10Spoken.at(-1)?.id === 'd11_mar_photo');
    await item('pick', 'plante');
    assert.equal((await debug(page, 'getChores')).completed.message, 1);
    await chore(page, 'hub');

    await activity('letter10');
    assert.equal(await page.locator('[data-d10-action="deliver"]').count(), 0, 'Day 10 letter cannot be sent');
    await chore(page, 'letter-read');
    await chore(page, 'letter-save');
    const letter = await debug(page, 'getChores');
    assert.equal(letter.completed.letter10, 1);
    assert.equal(letter.letter.saved, true);
    assert.equal(letter.letter.sent, false);
    assert.equal(letter.letter.delivered, false);
    await shot(page, 'letter-draft');
    await chore(page, 'continue');
    const final = await debug(page, 'getChores');
    for (const name of Object.keys(D.activities)) assert.equal(final.completed[name], 1, name + ' completes through real interactions');
    assert.deepEqual((await debug(page, 'getState')).cards, initial.cards, 'All six chores remain ungraded');
    await geometry(page);
    await shot(page, 'chores-complete');
    await chore(page, 'evening');
    assert.equal(await sceneId(page), 'n_d11_queue');
    await run.unchanged();
  } finally { await run.close(); }
}

async function watering(env, shot = async () => {}) {
  const run = await open(env), { page } = run;
  try {
    await debug(page, 'jump', 'pot_wiggle');
    const initial = await debug(page, 'getState');
    assert.equal(await page.locator('#panel .dialogue').count(), 0, 'Water invite has no mandatory dialogue');
    await tap(page, 'day10-water');
    assert.equal(await page.locator('#panel').innerText(), '', 'Water action starts silently');
    await page.locator('#panel .dialogue').waitFor();
    assert.match(await page.locator('#panel .dialogue').innerText(), /Elle doit \u00eatre belle/);
    await geometry(page);
    await shot(page, 'optional-water-invite');
    await tap(page, 'day10-start-review');
    const session = await debug(page, 'getSession');
    assert(session.session.initial > 8, 'Optional watering includes all due words, not an eight-word cap');
    assert(await page.locator('[data-action="review-exit"]').isVisible(), 'Watering can be left immediately');
    for (let number = 0; number < 8; number++) {
      await answerReview(page);
      await autoAdvanced(page);
    }
    const checkpoint = await debug(page, 'getSession');
    assert.equal(checkpoint.session.answered, 8);
    assert.equal(checkpoint.checkpoint, true, 'Eight answers is a checkpoint, not the end of all due words');
    assert.equal(checkpoint.session.initial, session.session.initial);
    assert.equal(await page.evaluate(() => window.day10Spoken.at(-1).id), 'd11_noe_belle', 'Checkpoint voice is not interrupted by the next exercise prompt');
    assert(await page.locator('[data-action="checkpoint-continue"]').isVisible());
    await geometry(page);
    await shot(page, 'optional-water-checkpoint');
    await tap(page, 'checkpoint-continue');
    const answered = await debug(page, 'getState');
    assert.notDeepEqual(answered.cards, initial.cards, 'Optional review updates only the in-memory learning state');
    await tap(page, 'review-exit');
    assert.deepEqual((await debug(page, 'getState')).cards, answered.cards, 'Early exit never grades the remaining due words');
    assert.equal(await page.locator('#app').getAttribute('data-screen'), 'story');
    await run.unchanged();
  } finally { await run.close(); }
}

module.exports = { completedFixture, open, preview, capture, traverse, chores, watering, requiredShots };
if (require.main === module) (async () => {
  const env = await start(process.env.V9_BROWSER || 'chromium'), captured = new Set();
  try {
    const shot = async (page, name) => {
      assert.deepEqual(page.viewportSize(), { width: 390, height: 844 }, 'All Day 10 deliverables are portrait 390x844');
      const file = path.resolve(__dirname, '../screenshots/v9-day10-' + name + '.png');
      await page.screenshot({ path: file, fullPage: false });
      captured.add(name);
      console.log(file);
    };
    await preview(env);
    await capture(env, shot);
    await chores(env, shot);
    await watering(env, shot);
    await traverse(env);
    await traverse(env, { dev: false });
    assert.deepEqual(requiredShots.filter(name => !captured.has(name)), [], 'Every mandatory Day 10 screenshot was generated');
    console.log('PASS Day 10 preview, camera, chores, watering and dev/production traversal; ' + captured.size + ' screenshots');
  } finally { await env.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
