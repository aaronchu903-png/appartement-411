'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { start, views } = require('./round3-screenshots.cjs');
const { open, fixture, geometry } = require('./v4-screenshots.cjs');
const C = require('../content.js');
const E = require('../engine.js');
const S = require('../save.js');
const tap = (page, action) => page.locator(`[data-action="${action}"]:visible`).last().tap();

async function capture(env, shot) {
  const volumeState = fixture();
  volumeState.settings = { uiLang: 'en', music: null, voice: '', sfx: false, muted: false };
  assert.deepEqual(S.normalizeSettings(volumeState.settings).voice, .85);
  const page = (await open(env, views.mobile, true, volumeState)).page;
  try {
    await page.evaluate(() => {
      window.testGains = [];
      const create = AudioContext.prototype.createGain;
      AudioContext.prototype.createGain = function () { const gain = create.call(this); window.testGains.push(gain); return gain; };
    });

    await tap(page, 'settings');
    for (const [key, value] of [['voice', .85], ['sfx', .5], ['music', .15]]) {
      assert.equal(Number(await page.locator(`[data-volume="${key}"]`).inputValue()), value);
    }
    await geometry(page);
    await shot(page, 'volume-defaults');
    await tap(page, 'back');

    await page.evaluate(() => Day8App.debug.jump('n_d8_porte'));
    await page.waitForTimeout(900);
    await geometry(page);
    await shot(page, 'door-opening');

    await page.evaluate(() => Day8App.debug.jump('n_d8_matin'));
    await geometry(page);
    await shot(page, 'shot-wide');

    await page.evaluate(() => Day8App.debug.jump('d8_gag_bonjour'));
    await geometry(page);
    await shot(page, 'shot-medium-panel');

    await page.evaluate(() => Day8App.debug.jump('d8_gag_venez'));
    await geometry(page);
    await shot(page, 'shot-close-clock');

    await page.evaluate(() => Day8App.debug.jump('d8_gag_basilic'));
    await page.waitForTimeout(1200);
    await geometry(page);
    await shot(page, 'handover');

    await page.evaluate(() => Day8App.debug.jump('n_d9_croissant'));
    await page.waitForTimeout(800);
    await geometry(page);
    await shot(page, 'kitten-gag');

    await page.evaluate(() => Day8App.debug.jump('d9_lef_place'));
    await geometry(page);
    await shot(page, 'neighbour-plants');

    await page.evaluate(() => { Math.random = () => .999; Day8App.debug.jump('d8_chat_place'); });
    const chat = C.chats.find(c => c.id === 'd8_chat_place');
    const labels = await page.locator('.chunks .chunk').allTextContents();
    assert.notEqual(E.normalize(labels.join(' ')), E.normalize(chat.accepted[0]));
    assert.ok(labels.every(t => t === t.toLocaleLowerCase('fr')));
    const stage = await page.evaluate(() => {
      const scene = document.querySelector('#scene').getBoundingClientRect();
      const panel = document.querySelector('#panel').getBoundingClientRect();
      const band = scene.height * .1;
      return panel.top - scene.top > band;
    });
    assert(stage, 'Chat panel leaves character band visible');
    await geometry(page);
    await shot(page, 'chat-chips-framed');

    const chips = C.scenes.find(s => s.kind === 'chips');
    await page.evaluate(id => Day8App.debug.jump(id), chips.id);
    const chipLabels = await page.locator('.chunks .chunk').allTextContents();
    assert.ok(chipLabels.every(t => !/^[A-ZÀÂÄÉÈÊËÏÎÔÙÜŸ]/.test(t) && !/[.!?]$/.test(t)));
    await geometry(page);
    await shot(page, 'chips-normalized');

    const reviewState = fixture();
    const word = { ...C.lookup('je'), pos: 'pronoun', sentence: 'Je suis dans la cuisine.', cloze: '___ suis dans la cuisine.', answer: 'je', seen: true, recorded: true, recognitionOnly: false };
    reviewState.customWords = { [word.id]: word };
    reviewState.words[word.id] = { met: true, introduced: true, collected: true };
    reviewState.cards[word.id + '|production'] = { ...Object.values(reviewState.cards)[0], itemId: word.id, modality: 'production', stability: 30 };
    const session = E.createSession(reviewState, [...C.words, word], { mode: 'test', storyDay: 12, forceType: 'P1', onlyIds: [word.id], dueOnly: true });
    session.mode = 'garden';
    reviewState.appSession = { version: 4, session, returnTo: 'garden', potId: null, feedback: null, correct: 0 };
    await page.evaluate(value => { Day8App.debug.setState(value); Day8App.debug.show('review'); }, reviewState);
    assert(await page.locator('[data-action="review-audio"]').isVisible());
    const box = await page.locator('.production-card .question').boundingBox();
    const panel = await page.locator('.production-card').boundingBox();
    assert(box && panel && box.y < panel.y + panel.height * .55);
    await geometry(page);
    await shot(page, 'pronoun-card');
  } finally { await page.context().close(); }
}

module.exports = { capture };
if (require.main === module) (async () => {
  const env = await start('webkit');
  const shot = async (page, name) => {
    const file = path.resolve(__dirname, '../screenshots/v7-mobile-' + name + '.png');
    await page.screenshot({ path: file });
    console.log(file);
  };
  try { await capture(env, shot); }
  finally { await env.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
