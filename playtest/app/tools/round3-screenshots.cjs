#!/usr/bin/env node
'use strict';

// NODE_PATH=/tmp/kilo/node_modules node app/tools/round3-screenshots.cjs
// ROUND3_BROWSER=webkit and ROUND3_VIEW=mobile|mobile-small optionally narrow a run.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const playwright = require('playwright');
require('../data/inherited.js');
const C = require('../content.js');
const S = require('../save.js');
const E = require('../engine.js');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(__dirname, '../screenshots');
const views = { mobile: { width: 390, height: 844 }, 'mobile-small': { width: 375, height: 667 } };
assert(!process.env.ROUND3_VIEW || Object.hasOwn(views, process.env.ROUND3_VIEW), 'ROUND3_VIEW must be mobile or mobile-small');
const action = (page, name) => page.locator(`[data-action=${JSON.stringify(name)}]:visible`).first();
const click = (page, name) => action(page, name).tap();
const debug = (page, method, ...args) => page.evaluate(({ method, args }) => window.Day8App.debug[method](...args), { method, args });
const screen = page => page.locator('#app').getAttribute('data-screen');
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), S.KEY);
const stateOf = page => page.evaluate(key => window.Day8App.debug?.getState() || JSON.parse(localStorage.getItem(key)), S.KEY);
const reviewOf = page => page.evaluate(key => window.Day8App.debug?.getSession() || JSON.parse(localStorage.getItem(key))?.appSession, S.KEY);

async function start(browserName = process.env.ROUND3_BROWSER || 'chromium') {
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try { browser = await playwright[browserName].launch(); }
  catch (error) { server.close(); throw error; }
  return {
    browser, browserName, base: `http://127.0.0.1:${server.address().port}`,
    async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  };
}

async function open(env, view, { fixture, dev = false } = {}) {
  assert(views[view], 'Use a supported phone viewport');
  const context = await env.browser.newContext({ viewport: views[view], deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  if (fixture) await context.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: S.KEY, value: fixture });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(env.base + '/app/' + (dev ? '?dev=1' : ''));
  await page.waitForFunction(() => window.Day8App?.ready);
  assert.equal(await page.evaluate(() => !!window.Day8App.debug), dev);
  await page.evaluate(() => {
    const art = window.Day8Art;
    window.Day8Art = { ...art, draw(canvas, model, ...args) {
      if (canvas.id === 'scene') window.__round3Scene = Object.fromEntries(['scene', 'focus', 'focusZoom', 'recall', 'cat', 'reaction', 'establishingProgress', 'v2', 'action', 'garden', 'water', 'targetPotId', 'rooftopUnlocked'].map(key => [key, model[key]]));
      return art.draw(canvas, model, ...args);
    } };
  });
  return { page, async close() { await context.close(); assert.deepEqual(errors, [], 'No uncaught browser errors'); } };
}

async function geometry(page, sheet = false) {
  const result = await page.evaluate(sheet => {
    const app = document.querySelector('#app'), frame = app.getBoundingClientRect(), scale = frame.width / app.offsetWidth;
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[inert]');
    const contained = r => r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1;
    const controls = [...document.querySelectorAll('#app button:not(.word), #app .file-label')].filter(visible);
    const small = controls.filter(el => { const r = el.getBoundingClientRect(); return r.width / scale < 43.9 || r.height / scale < 43.9; }).map(el => ({ action: el.dataset.action || el.className, rect: el.getBoundingClientRect().toJSON() }));
    const outside = [...controls, ...document.querySelectorAll('#scene, #nav, #overlay, #overlay-body, #review-progress, #scene-actions, #hotspots')].filter(visible).filter(el => !contained(el.getBoundingClientRect())).map(el => ({ id: el.id, action: el.dataset.action, rect: el.getBoundingClientRect().toJSON() }));
    const clipped = controls.filter(el => !el.disabled && el.closest('#panel')).filter(el => {
      const r = el.getBoundingClientRect(), panel = el.closest('#panel').getBoundingClientRect();
      return r.top < panel.top - 1 || r.bottom > panel.bottom + 1 || r.left < panel.left - 1 || r.right > panel.right + 1;
    }).map(el => ({ action: el.dataset.action, rect: el.getBoundingClientRect().toJSON() }));
    const primary = [...document.querySelectorAll('#panel [data-action="next"], #panel [data-action="focus-next"], #panel [data-action="hold-water"], #panel [data-action="review-next"], #panel [data-action="continue"]')].filter(visible);
    const highActions = primary.filter(el => el.getBoundingClientRect().bottom < frame.top + frame.height * .65).map(el => el.dataset.action);
    const body = document.querySelector('#overlay-body');
    const rect = body?.getBoundingClientRect();
    const scrolling = sheet ? [body, ...body.querySelectorAll('*')].filter(el => {
      const css = getComputedStyle(el);
      return el.clientHeight > 0 && /auto|scroll/.test(css.overflowY) && el.scrollHeight > el.clientHeight + 2;
    }).map(el => ({ tag: el.tagName, id: el.id, class: el.className, excess: el.scrollHeight - el.clientHeight })) : [];
    const unreachable = sheet ? [...body.querySelectorAll('button:not(.word), textarea, .file-label')].filter(el => visible(el) && !el.disabled).filter(el => {
      const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !contained(r) || r.top < rect.top - 1 || r.bottom > rect.bottom + 1 || !hit || !(el === hit || el.contains(hit));
    }).map(el => el.dataset.action || el.id || el.className) : [];
    return { overflow: document.documentElement.scrollWidth - innerWidth, frame: frame.toJSON(), viewport: { width: innerWidth, height: innerHeight }, sheetHeight: rect?.height / frame.height, scrolling, small, outside, clipped, highActions, unreachable };
  }, sheet);
  assert(result.overflow <= 1, 'No horizontal document overflow: ' + JSON.stringify(result));
  assert(result.frame.width <= 390.1 && result.frame.height <= 844.1 && result.frame.width <= result.frame.height * 390 / 667 + 1, 'App remains a bounded portrait frame: ' + JSON.stringify(result));
  assert(Math.abs(result.frame.x * 2 + result.frame.width - result.viewport.width) <= 2 && Math.abs(result.frame.y * 2 + result.frame.height - result.viewport.height) <= 2, 'App is centered on both axes: ' + JSON.stringify(result));
  assert.deepEqual(result.small, [], 'Non-inline touch targets are at least 44px');
  assert.deepEqual(result.outside, [], 'Canvas, HUD, overlays and controls stay inside the phone frame');
  assert.deepEqual(result.clipped, [], 'Panel controls are not clipped behind an inner scroll area');
  assert.deepEqual(result.highActions, [], 'Primary story actions remain in the bottom thumb region');
  if (sheet) {
    assert(result.sheetHeight >= .7, 'Carnet/note use a near-full-height sheet: ' + JSON.stringify(result));
    assert.deepEqual(result.scrolling, [], 'Typical sheet content needs no inner scroll');
    assert.deepEqual(result.unreachable, [], 'All sheet buttons and note input are reachable without scrolling');
  }
  return result;
}

async function reachable(page, name) {
  const element = action(page, name);
  assert(await element.isVisible(), name + ' is visible');
  assert(await element.evaluate(el => {
    const r = el.getBoundingClientRect(), frame = document.querySelector('#app').getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return r.width >= 44 && r.height >= 44 && r.top >= frame.top && r.bottom <= frame.bottom && r.left >= frame.left && r.right <= frame.right && !!hit && (el === hit || el.contains(hit));
  }), name + ' is reachable without scrolling');
}

function chunksInOrder(chunks, sentence) {
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const target = normalize(sentence);
  function solve(order = []) {
    const prefix = normalize(order.map(i => chunks[i]).join(' '));
    if (!target.startsWith(prefix)) return null;
    if (order.length === chunks.length) return prefix === target ? order : null;
    for (let i = 0; i < chunks.length; i++) {
      if (order.includes(i)) continue;
      const result = solve([...order, i]);
      if (result) return result;
    }
    return null;
  }
  const result = solve();
  assert(result, 'Rendered chunks can form the authored sentence');
  return result;
}

async function answerReview(page, correct = true) {
  await geometry(page);
  const ex = await page.evaluate(key => {
    if (window.Day8App.debug) return window.Day8App.debug.getExercise();
    const state = JSON.parse(localStorage.getItem(key));
    return window.Day8Engine.current(state.appSession.session, state, window.Day8Content.words);
  }, S.KEY);
  assert(ex, 'Review has an exercise');
  assert(!/^P/.test(ex.type), 'Day 8 never asks for dictation');
  if (ex.type === 'E3') {
    for (const [index, pair] of ex.pairs.entries()) {
      await click(page, 'pair-word:' + pair.id);
      await click(page, 'pair-picture:' + (correct ? pair.id : ex.pairs[(index + 1) % ex.pairs.length].id));
    }
  } else if (ex.type === 'R3') {
    let order = chunksInOrder(ex.chunks, ex.sentence);
    if (!correct) order = [...order.slice(1), order[0]];
    for (const index of order) await click(page, 'chunk:' + index);
  } else {
    const option = ex.options.find(option => correct ? option.id === ex.wordId : option.id !== ex.wordId);
    assert(option, 'Exercise offers the requested answer');
    await click(page, 'answer:' + option.id);
  }
  assert.equal((await reviewOf(page)).feedback?.correct, correct);
  await geometry(page);
  if (correct && await page.evaluate(() => !!window.__round3Scene)) {
    await page.waitForFunction(() => ['happy', 'roll'].includes(window.__round3Scene?.reaction));
    const cat = await page.evaluate(() => {
      const canvas = document.querySelector('#scene'), frame = canvas.getBoundingClientRect(), panel = document.querySelector('#panel').getBoundingClientRect();
      const spot = window.Day8Art.projectHotspots(canvas, window.__round3Scene).cat;
      return spot && { visible: spot.visible, left: frame.left + (spot.x - spot.width / 2) / 100 * frame.width, right: frame.left + (spot.x + spot.width / 2) / 100 * frame.width, bottom: frame.top + (spot.y + spot.height / 2) / 100 * frame.height, panelTop: panel.top, frameLeft: frame.left, frameRight: frame.right };
    });
    assert(cat?.visible && cat.left >= cat.frameLeft && cat.right <= cat.frameRight && cat.bottom <= cat.panelTop, 'Correct-review cat remains visible above feedback, not hidden behind it: ' + JSON.stringify(cat));
  }
  return ex;
}

async function autoAdvanced(page) {
  assert.equal(await action(page, 'review-next').count(), 0, 'Correct answer has no Continuer');
  await page.waitForFunction(key => {
    const review = window.Day8App.debug?.getSession() || JSON.parse(localStorage.getItem(key))?.appSession;
    return !review?.feedback || document.querySelector('.review-checkpoint') || document.querySelector('#app').dataset.screen === 'reviewdone';
  }, S.KEY, { timeout: 5000 });
}

function gardenFixture(count = 12) {
  const state = S.fresh(C.words), end = C.scenes.findIndex(scene => scene.kind === 'end');
  Object.assign(state.story, { day8Version: C.version, day8Index: end, day8SceneId: C.scenes[end].id, day8Complete: true, rooftop: true, has_key: true, basilPlanted: true });
  state.settings = { uiLang: 'en', music: 0, voice: 0, sfx: 0, muted: true };
  state.cards = {};
  const words = C.words.filter(word => word.seen && word.pos === 'noun' && word.sentence).slice(0, count);
  assert.equal(words.length, count);
  for (const word of words) {
    state.words[word.id] = { met: true, introduced: true, collected: true };
    state.cards[word.id + '|listening'] = { itemId: word.id, modality: 'listening', stability: 1, difficulty: 5, reps: 5, lapses: 0, due: '2000-01-01T00:00:00.000Z', lastReview: '2000-01-01T00:00:00.000Z' };
  }
  state.appSession = { session: E.createSession(state, C.words, { mode: 'garden', onlyIds: words.map(w => w.id), forceType: 'R1', storyDay: 8 }), returnTo: 'garden', first: false, feedback: null, correct: 0 };
  return state;
}

async function enterGarden(page) {
  await click(page, 'settings');
  await click(page, 'garden');
  if (await action(page, 'after-reveal').isVisible()) await click(page, 'after-reveal');
  await click(page, 'start-garden');
  assert.equal(await screen(page), 'review');
}

async function storyStep(page, scene, index) {
  await geometry(page);
  const before = (await stateOf(page)).cards;
  if (scene.kind === 'focus') {
    assert.equal(await page.locator('[data-action^="story-answer:"], [data-action^="answer:"]').count(), 0, 'First focus is comprehension, never a quiz');
    await click(page, 'focus-next');
  } else if (['pick', 'probe'].includes(scene.kind)) {
    const target = scene.answerId || scene.answer || scene.target || scene.wordIds?.[0];
    await click(page, 'story-answer:' + target);
    if (await action(page, 'next').isVisible()) await click(page, 'next');
  } else if (scene.kind === 'chips') {
    const chunks = await page.locator('[data-action^="story-chunk:"]').allTextContents();
    for (const i of chunksInOrder(chunks, scene.answer || scene.canonical || scene.text)) await click(page, 'story-chunk:' + i);
    if (await action(page, 'next').isVisible()) await click(page, 'next');
  } else if (['establishing', 'ritual'].includes(scene.kind)) {
    assert.equal((await page.locator('#panel').innerText()).trim(), '', 'Establishing shot is text-free');
  } else if (['point', 'walk'].includes(scene.kind)) await click(page, 'point-next');
  else if (['voicemail', 'chat'].includes(scene.kind)) {
    const input = page.locator(scene.kind === 'voicemail' ? '#voice-input' : '#reply-input');
    await input.fill(scene.accepted?.[0] || scene.answer);
    await input.press('Enter');
    await click(page, 'next');
  } else if (['reply', 'choice'].includes(scene.kind)) {
    await click(page, 'reply-option:0');
    await click(page, 'next');
  } else {
    if (await action(page, 'reveal-line').isVisible()) await click(page, 'reveal-line');
    await click(page, 'next');
  }
  await page.waitForFunction(({ key, index }) => (window.Day8App.debug?.getState() || JSON.parse(localStorage.getItem(key))).story.day8Index !== index, { key: S.KEY, index }, { timeout: 8000 });
  assert.deepEqual((await stateOf(page)).cards, before, 'Story learning records encounters, not FSRS grades');
}

const scenarios = {
  async safeAreas(env, view) {
    const run = await open(env, view), { page } = run;
    try {
      await page.evaluate(() => {
        for (const [edge, value] of Object.entries({ top: 24, right: 12, bottom: 20, left: 12 })) document.documentElement.style.setProperty('--safe-' + edge, value + 'px');
      });
      await geometry(page);
      const hud = await page.locator('#nav button:visible').evaluateAll(buttons => {
        const frame = document.querySelector('#app').getBoundingClientRect();
        return buttons.map(el => {
          const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { id: el.id, safe: r.top >= frame.top + 24 && r.bottom <= frame.bottom - 20 && r.left >= frame.left + 12 && r.right <= frame.right - 12, bottom: r.bottom >= frame.top + frame.height * .8, reachable: !!hit && (el === hit || el.contains(hit)) };
        });
      });
      assert.equal(hud.length, 4, 'All four HUD controls remain present');
      assert(hud.every(control => control.safe && control.bottom && control.reachable), 'HUD respects configurable safe areas in the bottom thumb bar: ' + JSON.stringify(hud));
      await click(page, 'wordbook');
      await geometry(page, true);
      await reachable(page, 'back');
      const close = page.locator('#btnClose');
      assert(await close.isVisible(), 'Overlay offers a bottom thumb-close control');
      assert(await close.evaluate(el => {
        const r = el.getBoundingClientRect(), frame = document.querySelector('#app').getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return r.bottom >= frame.top + frame.height * .8 && !!hit && (el === hit || el.contains(hit));
      }), 'Overlay close is reachable in the bottom thumb bar');
      await close.tap();
      assert.equal(await page.locator('#overlay').isVisible(), false);
      await click(page, 'notes');
      await page.locator('#note-text').fill('Safe-area reachability fixture.');
      await geometry(page, true);
      await reachable(page, 'save-note');
    } finally { await run.close(); }
  },

  async numericMigration(env, view) {
    for (const index of [14, 30, 50, 52]) {
      const fixture = S.fresh(C.words);
      fixture.story = { day8Version: 2, day8Index: index, rooftop: index >= 50, has_key: index >= 50 };
      const run = await open(env, view, { fixture }), { page } = run;
      try {
        await page.locator('#btnMusic').click();
        const migrated = await saved(page), id = C.legacySceneIds[index];
        assert.equal(migrated.story.day8Version, C.version);
        assert.equal(migrated.story.day8SceneId, id, 'Numeric v2 cursor maps through the shipped 53-scene order');
        assert.equal(migrated.story.day8Index, C.scenes.findIndex(scene => scene.id === id));
        assert.deepEqual(migrated.cards, fixture.cards, 'Migration never changes learning grades');
        await click(page, 'continue');
        assert.equal((await saved(page)).story.day8SceneId, 'n_d8_matin', 'Migrated cursor never hijacks one-tap home entry');
        assert.equal(await screen(page), 'story');
      } finally { await run.close(); }
    }
  },

  async story(env, view, shot) {
    const run = await open(env, view), { page } = run;
    try {
      assert.match(await page.locator('#scene').getAttribute('aria-label'), /^facade,/);
      await shot(page, 'facade-entry');
      await click(page, 'continue');
      assert.equal(await screen(page), 'story');
      assert.match(await page.locator('#scene').getAttribute('aria-label'), /^kitchen,/);
      assert.equal((await saved(page)).story.day8SceneId, 'n_d8_matin');
      await page.waitForFunction(() => window.__round3Scene?.scene === 'kitchen');
      assert.equal(await page.evaluate(() => window.__round3Scene.cat), true, 'Facade entry must not suppress the home cat');
      await shot(page, 'home-one-tap');
      const visited = [], captures = new Set();
      for (let step = 0; step < C.scenes.length + 10; step++) {
        const state = await saved(page), index = state.story.day8Index, scene = C.scenes[index];
        visited.push(scene.id);
        try { await geometry(page); }
        catch (error) { error.message += `\nStory geometry at ${scene.id} (${index})`; throw error; }
        if (await screen(page) === 'end') break;
        assert.equal(await screen(page), 'story', 'No review interrupts the story');
        assert.equal(state.appSession, null);
        if (scene.kind === 'water') {
          assert.equal(state.story.has_key, true, 'Key handover precedes any review');
          const box = await action(page, 'hold-water').boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForFunction(() => ['review', 'reviewdone'].includes(document.querySelector('#app').dataset.screen), null, { timeout: 6000 });
          await page.mouse.up();
          await reachable(page, 'leave-garden');
          await click(page, 'leave-garden');
          assert.equal((await saved(page)).appSession, null);
        } else if (scene.kind === 'cat') {
          const before = (await saved(page)).cards;
          await shot(page, 'cat-before');
          await click(page, 'start-cat');
          await shot(page, 'cat-approach');
          await page.waitForTimeout(3000);
          await shot(page, 'cat-reach');
          await action(page, 'cat-bop').tap();
          await shot(page, 'cat-retreat');
          assert.equal(await page.locator('[data-action^="answer:"], #review-input').count(), 0);
          await page.waitForFunction(() => document.querySelector('#app').dataset.screen === 'catdone', null, { timeout: 22000 });
          await shot(page, 'cat-lift');
          assert.deepEqual((await saved(page)).cards, before, 'Cat game never grades cards');
          await click(page, 'finish-cat');
        } else {
          if (scene.kind === 'focus' && !captures.has('focus')) {
            assert.equal(await page.locator('[data-action^="story-answer:"], [data-action^="answer:"]').count(), 0);
            await shot(page, 'focus-comprehension');
            await page.locator('.focus-word').waitFor();
            await page.locator('.focus-word').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
            await shot(page, 'focus-reveal');
            captures.add('focus');
          }
          if (['pick', 'probe'].includes(scene.kind) && !captures.has('recall')) {
            assert.equal(await page.locator('.focus-card:visible, .focus-spotlight:visible').count(), 0, 'Recall removes the first encounter spotlight');
            await page.waitForFunction(() => window.__round3Scene?.recall === true);
            const model = await page.evaluate(() => window.__round3Scene);
            assert(!model.focus && !model.focusZoom, 'Recall art has no target spotlight or zoom');
            await shot(page, 'next-encounter-recall'); captures.add('recall');
          }
          if (scene.scene === 'lefevre' && scene.kind === 'line' && !captures.has('dinner')) {
            await page.waitForFunction(() => window.__round3Scene?.scene === 'lefevre');
            assert.equal(await page.evaluate(() => window.__round3Scene.cat), true, 'Empty establishing shot must not suppress the dinner cat');
            await shot(page, 'dinner'); captures.add('dinner');
          }
          if (scene.kind === 'establishing') {
            await shot(page, 'establishing-day');
            await page.waitForTimeout(1350); await shot(page, 'establishing-dusk');
            await page.waitForTimeout(1350); await shot(page, 'establishing-night');
            captures.add('establishing');
          }
          try { await storyStep(page, scene, index); }
          catch (error) { error.message += `\nStory beat ${scene.id} (${index}); saved ${(await saved(page)).story.day8SceneId}; panel: ${await page.locator('#panel').innerText()}`; throw error; }
        }
      }
      assert.equal(await screen(page), 'end', 'Full DOM traversal reaches the ending');
      assert.deepEqual([...new Set(visited)], C.scenes.map(scene => scene.id), 'Every story beat visited without debug jumps');
      for (const name of ['focus', 'recall', 'dinner', 'establishing']) assert(captures.has(name), name + ' exercised');
      await shot(page, 'ending');
      return { visited, entryTaps: 1, debugMutations: 0 };
    } finally { await run.close(); }
  },

  async sheets(env, view, shot) {
    const run = await open(env, view, { dev: true }), { page } = run;
    try {
      await debug(page, 'jump', 'd8_focus_basilic');
      await page.locator('.focus-word').waitFor();
      await click(page, 'wordbook');
      await click(page, 'word-pot:2');
      assert.equal(await page.locator('#overlay select').count(), 0, 'Carnet uses pixel pot tabs, not select');
      const row = page.locator('.word-row').filter({ has: page.locator('[data-action="expand:basilic"]') });
      assert(await row.isVisible());
      assert.equal(await row.locator('[aria-expanded="false"]').count(), 1);
      assert(await row.locator('.gender').count() > 0, 'Collapsed row has gender-coloured head');
      assert(await row.locator('.word-gloss').count() > 0, 'Collapsed row has translation');
      assert(await row.locator('.pos-tag').count() > 0, 'Collapsed row has POS');
      assert.notEqual(await row.locator('.gender').first().evaluate(el => getComputedStyle(el).color), await row.locator('.word-gloss').first().evaluate(el => getComputedStyle(el).color), 'Gender is visibly coloured, not just metadata');
      await geometry(page, true); await shot(page, 'carnet-collapsed');
      await click(page, 'expand:basilic');
      assert(await row.locator('.sentence').count() > 0);
      assert(await row.locator('img, canvas').count() > 0, 'Expanded word has scene thumbnail');
      await geometry(page, true); await shot(page, 'carnet-expanded');
      await click(page, 'word-pot:1');
      const rows = page.locator('.word-row');
      assert(await rows.count() <= 8, 'Collapsed carnet paginates at eight rows');
      assert(await rows.count() >= 4, 'Dense carnet fixture exercises a typical full page');
      await geometry(page, true); await shot(page, 'carnet-dense');
      const collapsedIds = await rows.locator('[data-action^="expand:"]').evaluateAll(elements => elements.map(el => el.dataset.action));
      await click(page, collapsedIds[0]);
      const expandedCount = await rows.count();
      assert(expandedCount < collapsedIds.length, 'Expanded carnet reserves space for the source scene');
      await geometry(page, true);
      await click(page, 'word-page:1');
      assert.equal(await rows.first().locator('[data-action^="expand:"]').getAttribute('data-action'), collapsedIds[expandedCount], 'Paging after expansion must not skip words');
      await click(page, 'word-pot:1');
      const firstPage = await rows.first().innerText();
      await click(page, 'word-page:1');
      assert.notEqual(await rows.first().innerText(), firstPage, 'Pixel pagination changes words');
      await geometry(page, true); await shot(page, 'carnet-page-two');
      await page.keyboard.press('Escape');
      await click(page, 'notes');
      await page.locator('#note-text').fill('Synthetic v3 QA note.');
      await reachable(page, 'save-note');
      await geometry(page, true); await shot(page, 'note');
      await click(page, 'save-note');
      assert.equal((await stateOf(page)).notes.at(-1).text, 'Synthetic v3 QA note.');
    } finally { await run.close(); }
  },

  async review(env, view, shot) {
    const fixture = gardenFixture();
    assert(fixture.appSession.session.initial > 8, 'Fixture really has more than eight due words');
    const run = await open(env, view, { fixture }), { page } = run;
    try {
      await enterGarden(page);
      const initial = (await reviewOf(page)).session.initial;
      assert.equal(initial, 12);
      await reachable(page, 'review-exit');
      assert(await page.locator('#review-progress').isVisible());
      await shot(page, 'review-before');
      const first = await answerReview(page);
      assert.notDeepEqual((await saved(page)).cards[first.cardKey], fixture.cards[first.cardKey], 'Answer saves before advancing');
      await shot(page, 'review-correct-pour');
      await autoAdvanced(page);
      for (let i = 1; i < 8; i++) { await answerReview(page); await autoAdvanced(page); }
      await page.locator('.review-checkpoint').waitFor();
      assert.equal((await reviewOf(page)).session.completedIds.length, 8);
      assert.equal((await reviewOf(page)).session.initial, initial);
      assert.equal(await screen(page), 'review', 'Eight items is a checkpoint, not session end');
      await reachable(page, 'review-exit');
      await shot(page, 'review-checkpoint');
      await click(page, 'checkpoint-continue');
      const wrong = await answerReview(page, false);
      const correctOption = page.locator('.answer.correct').first();
      assert(await correctOption.isVisible(), 'Wrong answer keeps the correct option visible');
      assert.match(await correctOption.getAttribute('class'), /correct|glow|right/);
      assert(await correctOption.locator('.gender').count() || /gender|\b[fm]\b/.test(await correctOption.getAttribute('class')), 'Correct option has gender colour');
      assert(await action(page, 'review-next').isVisible(), 'Wrong answer alone offers Continuer');
      await shot(page, 'review-wrong-correct-option');
      const answered = await saved(page);
      await reachable(page, 'review-exit');
      await click(page, 'review-exit');
      const exited = await saved(page);
      assert.equal(await screen(page), 'garden', 'Plus tard returns to the rooftop');
      assert.deepEqual(exited.appSession.session, answered.appSession.session, 'Plus tard preserves the resumable queue');
      assert.deepEqual(exited.cards, answered.cards, 'Exit preserves every answered item without grading the rest');
      const untouched = Object.keys(fixture.cards).filter(key => JSON.stringify(fixture.cards[key]) === JSON.stringify(exited.cards[key]));
      assert(untouched.length >= 3, 'Unanswered due cards remain unchanged');
      await page.reload(); await page.waitForFunction(() => window.Day8App?.ready);
      assert.deepEqual((await saved(page)).cards, exited.cards, 'Answered progress survives reload');
      await click(page, 'continue');
      assert.notEqual(await screen(page), 'review', 'Reload never gates entry with a saved review');
    } finally { await run.close(); }
  },

  async exerciseTypes(env, view, shot) {
    for (const type of ['E1', 'E3', 'R3']) {
      const fixture = gardenFixture(), ids = ['porte', 'plante', 'fenetre', 'table'];
      fixture.cards = {};
      for (const id of ids) {
        fixture.words[id] = { met: true, introduced: true, collected: true };
        fixture.cards[id + '|listening'] = { itemId: id, modality: 'listening', stability: 1, difficulty: 5, reps: 5, lapses: 0, due: '2000-01-01T00:00:00.000Z', lastReview: '2000-01-01T00:00:00.000Z' };
      }
      fixture.appSession.session = E.createSession(fixture, C.words, { mode: 'garden', forceType: type, storyDay: 8 });
      const run = await open(env, view, { fixture }), { page } = run;
      try {
        await enterGarden(page);
        const session = await reviewOf(page);
        const ex = session.session.current || E.current(session.session, fixture, C.words);
        assert.equal(ex.type, type, type + ' is genuinely rendered');
        if (type !== 'R3') {
          const images = await page.locator('#panel .answer img').evaluateAll(elements => elements.map(el => el.src));
          assert(images.length >= 3, 'Picture exercises have enough visual choices');
          assert.equal(new Set(images).size, images.length, 'Picture choices are visually distinct, not identical scene thumbnails');
        }
        await shot(page, 'review-' + type + '-before');
        await answerReview(page);
        const answered = await reviewOf(page);
        assert.equal(answered.session.completedIds.length, type === 'E3' ? 4 : 1, 'Each initial word consumes exactly one drop');
        if (type === 'E3') {
          for (const id of ids) assert((await saved(page)).cards[id + '|reading']?.lastReview, 'Each matched pair persists its own grade');
        }
        await shot(page, 'review-' + type + '-correct');
        await autoAdvanced(page);
      } finally { await run.close(); }
    }
  },

  async audioSequencing(env, view) {
    const run = await open(env, view, { dev: true }), { page } = run;
    try {
      await page.evaluate(() => {
        window.__round3AudioCalls = [];
        window.__round3HoldNext = true;
        window.Day8Audio.speak = (text, id) => {
          window.__round3AudioCalls.push({ text, id });
          if (!window.__round3HoldNext) return Promise.resolve(true);
          window.__round3HoldNext = false;
          return new Promise(resolve => { window.__round3ReleaseAudio = () => resolve(true); });
        };
      });
      await debug(page, 'jump', 'd8_focus_jardin');
      await page.waitForTimeout(1750);
      assert.equal(await page.evaluate(() => window.__round3AudioCalls.length), 1, 'Focus word audio never interrupts its source sentence at 1.6 seconds');
      await page.evaluate(() => window.__round3ReleaseAudio());
      await page.waitForFunction(() => window.__round3AudioCalls.length >= 2);
      await page.locator('.focus-word').waitFor();
      await debug(page, 'review', 'R1');
      await page.evaluate(() => { window.__round3HoldNext = true; });
      await answerReview(page);
      await page.waitForTimeout(1100);
      assert.equal((await reviewOf(page)).feedback?.correct, true, 'Correct feedback waits for its sentence, not just the 900ms animation');
      await page.evaluate(() => window.__round3ReleaseAudio());
      await autoAdvanced(page);
    } finally { await run.close(); }
  },

  async cachedProductionMigration(env, view) {
    for (const type of ['P1', 'P2']) {
      const fixture = gardenFixture();
      fixture.story.day8Version = 2;
      fixture.words.plante = { met: true, introduced: true };
      fixture.cards['plante|listening'] = { itemId: 'plante', modality: 'listening', stability: 20, difficulty: 5, reps: 8, lapses: 0, due: '2000-01-01T00:00:00.000Z', lastReview: '2000-01-01T00:00:00.000Z' };
      const session = E.createSession(fixture, C.words, { mode: 'test', onlyIds: ['plante'], forceType: type, storyDay: 12 });
      assert.equal(E.current(session, fixture, C.words).type, type, 'Fixture contains a real cached production exercise');
      session.mode = 'garden'; delete session.storyDay;
      fixture.appSession.session = session;
      const run = await open(env, view, { fixture }), { page } = run;
      try {
        await enterGarden(page);
        assert.equal(await page.locator('#review-input').count(), 0, 'A saved v2 typing prompt cannot bypass the Day 12 gate');
        const review = await reviewOf(page);
        const ex = E.current(review.session, fixture, C.words);
        assert(!/^P/.test(ex.type));
        assert.deepEqual((await saved(page)).cards, fixture.cards, 'Regenerating a cached prompt preserves all prior grades');
      } finally { await run.close(); }
    }
  },

  async protectedImport(env, view, shot) {
    const run = await open(env, view), { page } = run;
    try {
      await click(page, 'settings'); await click(page, 'import');
      const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
      for (const fixture of [{ profileId: 'yuechao', learn: { cards: {} } }, { profileId: 'jinyi', nested: { profileId: 'Yuechao' } }]) {
        await page.locator('#import-text').fill(JSON.stringify(fixture));
        await click(page, 'import-paste');
        assert(await page.locator('.error-message').isVisible());
        assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))), before, 'Yuechao refusal is transactional');
      }
      await shot(page, 'protected-import-refusal');
    } finally { await run.close(); }
  }
};

async function main() {
  const env = await start(), report = { browser: env.browserName, startedAt: new Date().toISOString(), method: 'Real DOM story traversal and synthetic isolated saves; debug jump for carnet and controlled audio timing only.', hashes: {}, screenshots: [], passed: [], details: {}, failures: [] };
  await fs.mkdir(output, { recursive: true });
  for (const file of await fs.readdir(output)) if (file.startsWith('v3-desktop-')) await fs.unlink(path.join(output, file));
  for (const file of ['index.html', 'app.js', 'style.css', 'tokens.css', 'content.js', 'engine.js', 'art.js', 'audio.js', 'save.js', 'sw.js', 'modules/index.js', 'modules/M1.js', 'modules/M2.js', 'modules/M3.js', 'modules/M4.js']) report.hashes[file] = createHash('sha256').update(await fs.readFile(path.join(root, 'app', file))).digest('hex');
  try {
    for (const view of Object.keys(views).filter(view => !process.env.ROUND3_VIEW || process.env.ROUND3_VIEW === view)) {
      for (const [name, run] of Object.entries(scenarios)) {
        const label = view + ':' + name;
        try {
          const detail = await run(env, view, async (page, name) => {
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await geometry(page);
            const file = `v3-${view}-${name}.png`;
            await page.screenshot({ path: path.join(output, file), fullPage: false });
            report.screenshots.push({ file, viewport: views[view], screen: await screen(page), scene: (await stateOf(page))?.story?.day8SceneId || null });
          });
          if (detail) report.details[label] = detail;
          report.passed.push(label); console.log('PASS', label);
        } catch (error) { report.failures.push({ label, error: error.stack }); console.error('FAIL', label, error.message); }
      }
    }
  } finally {
    await env.close(); report.finishedAt = new Date().toISOString();
    report.finalHashes = {};
    for (const file of Object.keys(report.hashes)) report.finalHashes[file] = createHash('sha256').update(await fs.readFile(path.join(root, 'app', file))).digest('hex');
    if (JSON.stringify(report.hashes) !== JSON.stringify(report.finalHashes)) report.failures.push({ label: 'source-consistency', error: 'Source files changed during capture; regenerate from a stable tree.' });
    if (!process.env.ROUND3_VIEW && report.screenshots.length !== 62) report.failures.push({ label: 'phone-capture-count', error: `Expected 62 current phone screenshots, captured ${report.screenshots.length}.` });
    await fs.writeFile(path.join(output, 'v3-report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (report.failures.length) {
    console.error('Capture rejected:', report.failures.map(failure => failure.label).join(', '));
    process.exitCode = 1;
  } else console.log(`PASS ${report.screenshots.length} phone screenshots; source hashes stable`);
}

module.exports = { start, scenarios, views, geometry, storyStep, answerReview, autoAdvanced, gardenFixture };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
