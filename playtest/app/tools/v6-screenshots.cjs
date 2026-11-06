'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { start, views } = require('./round3-screenshots.cjs');
const { open, fixture, geometry } = require('./v4-screenshots.cjs');
const readOnlyLegacy = require('../tests/fixtures/read-only-legacy.cjs');
const legacyFixture = require('../tests/fixtures/legacy-days1-6.cjs');
const S = require('../save.js'), E = require('../engine.js'), C = require('../content.js');
const tap = (page, action) => page.locator(`[data-action="${action}"]:visible`).last().tap();

async function ui(env, shot = async () => {}) {
  const state = fixture();
  state.settings = { uiLang: 'zh', music: .15, voice: .85, sfx: .5, muted: false };
  const session = await open(env, views.mobile, true, state), page = session.page;
  try {
    await page.evaluate(() => {
      window.testGains = []; window.testAudio = [];
      const create = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function () { const gain = create.call(this); window.testGains.push(gain); return gain; };
      const NativeAudio = window.Audio;
      window.Audio = function (...args) { const audio = new NativeAudio(...args); window.testAudio.push(audio); return audio; };
    });
    await tap(page, 'settings');
    assert.equal(await page.evaluate(() => testGains.length), 1);
    const slider = page.locator('[data-volume="music"]');
    for (const [key, value] of [['voice', .85], ['sfx', .5]]) {
      assert.equal(Number(await page.locator(`[data-volume="${key}"]`).inputValue()), value);
    }
    await slider.focus();
    for (let i = 0; i < 3; i++) await slider.press('ArrowRight');
    assert(Math.abs(await page.evaluate(() => testGains[0].gain.value) - .3) < .001);
    await shot(page, 'volume-slider');
    await tap(page, 'back');
    await page.evaluate(() => Day8App.debug.jump('d9_cam_null'));
    assert.match(await page.evaluate(() => testAudio[0].src), /\/audio\/music\/night_01\.mp3$/);
    await page.evaluate(() => Day8App.debug.jump('n_d8_matin'));
    assert.match(await page.evaluate(() => testAudio[0].src), /\/audio\/music\/matin-cafe\.mp3$/);

    // Identity Fisher-Yates output exercises the rotate guard on canonical chat chunks.
    await page.evaluate(() => { Math.random = () => .999; Day8App.debug.jump('d8_chat_place'); });
    const chat = C.chats.find(c => c.id === 'd8_chat_place');
    const order = await page.locator('.chunks .chunk').allTextContents();
    assert.notEqual(E.normalize(order.join(' ')), E.normalize(chat.accepted[0]));
    await geometry(page); await shot(page, 'chat-chips-shuffled');
    await page.locator('.chunks .chunk').first().tap();
    assert.deepEqual(await page.locator('.chunks .chunk').allTextContents(), order, 'Selection does not reshuffle the chips');
    await tap(page, 'reply-unchunk:0');
    assert.deepEqual(await page.locator('.chunks .chunk').allTextContents(), order);
    for (const scene of C.scenes.filter(s => s.kind === 'chips')) {
      await page.evaluate(id => Day8App.debug.jump(id), scene.id);
      const before = await page.locator('.chunks .chunk').allTextContents();
      assert.notEqual(E.normalize(before.join(' ')), E.normalize(scene.answer));
      await page.locator('.chunks .chunk').first().tap();
      assert.deepEqual(await page.locator('.chunks .chunk').allTextContents(), before);
    }

    await page.evaluate(() => { Day8App.debug.jump('d9_lef_seule'); Day8App.debug.lookup('seule'); });
    assert.match(await page.locator('#overlay-body').innerText(), /独自|单独/);
    await shot(page, 'gloss-seule-or-petite'); await tap(page, 'close-lookup');

    for (const type of ['P1', 'P2']) {
      const reviewState = fixture();
      const word = { ...C.lookup('je'), pos: 'pronoun', sentence: 'Je suis dans la cuisine.', cloze: '___ suis dans la cuisine.', answer: 'je', seen: true, recorded: true, recognitionOnly: false };
      reviewState.customWords = { [word.id]: word };
      reviewState.words[word.id] = { met: true, introduced: true, collected: true };
      reviewState.cards[word.id + '|production'] = { ...Object.values(reviewState.cards)[0], itemId: word.id, modality: 'production', stability: 30 };
      const session = E.createSession(reviewState, [...C.words, word], { mode: 'test', storyDay: 12, forceType: type, onlyIds: [word.id], dueOnly: true });
      session.mode = 'garden';
      assert.equal(E.current(session, reviewState, [...C.words, word]).type, type);
      reviewState.appSession = { version: 4, session, returnTo: 'garden', potId: null, feedback: null, correct: 0 };
      await page.evaluate(value => {
        Day8App.debug.setState(value); Day8App.debug.show('review');
        window.testPrompts = [];
        Day8Audio.speak = (...args) => { testPrompts.push(args); return Promise.resolve(true); };
      }, reviewState);
      assert.equal(await page.evaluate(() => Day8App.debug.getExercise().type), type);
      const before = await page.evaluate(() => Day8App.debug.getState().cards);
      await tap(page, 'review-audio');
      assert.equal(await page.evaluate(() => testPrompts.at(-1)[0]), word.sentence);
      assert.deepEqual(await page.evaluate(() => Day8App.debug.getState().cards), before, 'Replay never grades the card');
      await geometry(page);
      if (type === 'P1') await shot(page, 'pronoun-replay');
    }

    for (const [oldId, nextId] of [['d8_pick_plante_stairs', 'd9_lef_bonsoir'], ['d8_chips_jeudi', 'n_d10_monte'], ['d9_lef_asseyez', 'd9_lef_asseyez']]) {
      for (const stable of [true, false]) {
        const old = fixture(); old.appSession = null;
        old.story = { day8Version: 3, day8Index: C.v3SceneIds.indexOf(oldId), ...(stable ? { day8SceneId: oldId } : {}) };
        await page.evaluate(value => Day8App.debug.setState(value), old);
        assert.equal(await page.evaluate(() => Day8App.debug.getState().story.day8SceneId), nextId);
      }
    }
  } finally { await session.close(); }
}

async function migrationFailure(env, shot = async () => {}) {
  const context = await env.browser.newContext({ viewport: views.mobile, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const raw = legacyFixture('yuechao').raw;
  await context.addInitScript(readOnlyLegacy, { raw, failWrites: true });
  await context.addInitScript(() => {
    let saveAPI;
    Object.defineProperty(window, 'Day8Save', { get: () => saveAPI, set(value) {
      saveAPI = value; const migrate = value.migrateLocal;
      value.migrateLocal = (...args) => (window.testMigration = migrate(...args));
    } });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(env.base + '/app/'); await page.waitForFunction(() => window.Day8App?.ready);
    assert.equal(await page.evaluate(() => testMigration.persistenceFailed), true);
    assert.equal(await page.evaluate(() => testMigration.state.profileId), 'yuechao');
    assert.equal(await page.locator('#btnWordbook').getAttribute('data-count'), '6');
    assert.match(await page.locator('#storage-warning').innerText(), /QuotaExceededError/);
    await tap(page, 'dismiss-storage-warning');
    assert.equal(await page.locator('#storage-warning').isVisible(), false);
    const writes = await page.evaluate(() => testStorageWrites.length);
    await tap(page, 'continue'); await tap(page, 'next');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.evaluate(() => testStorageWrites.length), writes, 'All saves remain blocked after failed persistence');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), S.KEY), null);
    assert.equal(await page.evaluate(() => testMigration.state.story.day8SceneId), 'd8_cam_depuis', 'Migrated in-memory state remains playable');
    assert.equal(await page.locator('#storage-warning').isVisible(), false, 'Dismissal survives repeated save attempts');
    await geometry(page); await shot(page, 'banner-dismissed');
    assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(raw)), raw);
    await page.reload(); await page.waitForFunction(() => window.Day8App?.ready);
    assert.match(await page.locator('#storage-warning').innerText(), /QuotaExceededError/);
    await page.waitForFunction(() => document.querySelector('#storage-warning').hidden, null, { timeout: 7000 });
    await tap(page, 'continue');
    assert.equal(await page.locator('#storage-warning').isVisible(), false, 'Auto-dismiss also survives repeated save attempts');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}

module.exports = { ui, migrationFailure };
if (require.main === module) (async () => {
  const env = await start('webkit');
  const shot = async (page, name) => {
    const file = path.resolve(__dirname, '../screenshots/v6-mobile-' + name + '.png');
    await page.screenshot({ path: file }); console.log(file);
  };
  try { await ui(env, shot); await migrationFailure(env, shot); }
  finally { await env.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
