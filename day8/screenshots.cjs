#!/usr/bin/env node
'use strict';

// Run: NODE_PATH=/tmp/kilo/node_modules node app/screenshots.cjs
// Optional: SCREENSHOTS_ONLY=mobile|desktop; SCREENSHOTS_PHASE=atlas|walk|video|offline|regressions.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'screenshots');
const phase = process.env.SCREENSHOTS_PHASE;
const reportFile = phase || process.env.SCREENSHOTS_ONLY ? `report-${phase || 'all'}-${process.env.SCREENSHOTS_ONLY || 'both'}.json` : 'report.json';
const sceneCount = 53;
const endingHook = 'Sur le toit, un jardin qui se r\u00e9veille. En bas, une lampe qui reste allum\u00e9e.';
const sourceHashes = () => Object.fromEntries(['index.html', 'app.js', 'style.css', 'art.js', 'audio.js', 'engine.js', 'save.js', 'language.js', 'content.js'].map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')]));
const report = {
  startedAt: new Date().toISOString(),
  sourceHashes: sourceHashes(),
  method: 'Isolated browser contexts; debug jumps for atlas, DOM interactions for answers; separate read-only-debug UI walkthrough. Synthetic imports only.',
  screenshots: [], assertions: [], failures: [], runtimeErrors: [], consoleErrors: [], resourceFailures: [], walkthroughs: [], videos: [], offline: [],
};
fs.mkdirSync(output, { recursive: true });
// Delete only artifacts registered by the previous full run, never unrelated files.
if (!phase && !process.env.SCREENSHOTS_ONLY && fs.existsSync(path.join(output, 'report.json'))) {
  const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
  for (const item of [...(previous.screenshots || []), ...(previous.videos || [])]) {
    if (path.basename(item.file) === item.file && /\.(png|webm)$/.test(item.file)) fs.rmSync(path.join(output, item.file), { force: true });
  }
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  });
});
let browser, base;
const act = (page, action) => page.locator(`[data-action="${action}"]`).first();
const click = (page, action) => act(page, action).click({ timeout: 5000 });
const debug = (page, method, ...args) => page.evaluate(({ method, args }) => window.Day8App.debug[method](...args), { method, args });
const screen = page => debug(page, 'getScreen');
const safeName = text => text.replace(/[^a-zA-Z0-9_-]/g, '-');
const keyControls = '#panel .primary, #panel .answer, #panel .chunk, #panel .input-row input, #panel .listen-button, #hotspots .hotspot:not(.quiet), #nav button, #scene-actions button';
function persist() { fs.writeFileSync(path.join(output, reportFile), JSON.stringify(report, null, 2) + '\n'); }
function check(name, condition, detail) {
  report.assertions.push({ name, passed: !!condition, ...(detail === undefined ? {} : { detail }) });
  if (!condition) { report.failures.push({ name, detail }); console.error('ASSERTION:', name, JSON.stringify(detail)); }
}
async function scenario(name, run) {
  try { await run(); }
  catch (error) { report.failures.push({ name, error: error.stack }); console.error('SCENARIO:', name, error.message); }
  persist();
}
function observe(page, label) {
  page.on('pageerror', error => { report.runtimeErrors.push({ label, url: page.url(), message: error.message, stack: error.stack }); console.error('RUNTIME:', label, error.message); });
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ label, text: message.text(), location: message.location() }); });
  page.on('requestfailed', request => report.resourceFailures.push({ label, url: request.url(), error: request.failure()?.errorText }));
}
async function open(viewport, label, extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block', ...extra });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  observe(page, label);
  await page.goto(base + '/app/?dev=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Day8App?.ready && window.Day8App.debug);
  return { page, context };
}
async function layout(page, label) {
  const result = await page.evaluate(selector => {
    const panel = document.querySelector('#panel');
    const body = document.body, doc = document.documentElement;
    const horizontal = { document: doc.scrollWidth - innerWidth, body: body.scrollWidth - innerWidth, panel: panel.scrollWidth - panel.clientWidth };
    const primary = [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.disabled);
    const clipped = primary.filter(el => {
      const r = el.getBoundingClientRect(), p = el.closest('#panel')?.getBoundingClientRect();
      return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 || (p && (r.top < p.top - 1 || r.bottom > p.bottom + 1));
    }).map(el => ({ action: el.dataset.action || el.type, rect: el.getBoundingClientRect().toJSON() }));
    const d = window.Day8App.debug;
    const fourthChat = d.getScreen() === 'story' && window.Day8Content.scenes[d.getState().story.day8Index || 0]?.id === 'd8_chat_thursday';
    return { horizontal, initiallyClipped: clipped, panelScrollable: panel.scrollHeight > panel.clientHeight + 1, thursdayChatLocation: fourthChat ? document.querySelector('#location').textContent : null };
  }, keyControls);
  check(label + ': no horizontal overflow', Object.values(result.horizontal).every(n => n <= 1), result.horizontal);
  check(label + ': one preview badge', await page.locator('#location .dev-badge').count() === 1);
  if (result.thursdayChatLocation !== null) check(label + ': after-dinner chat shows 21:08', result.thursdayChatLocation.includes('21:08'), result.thursdayChatLocation);
  const typographyIssues = await page.locator('[lang="fr"]').evaluateAll(elements => elements.filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.matches('input, textarea, .bubble.mine:not(.canonical-answer)') && !el.isContentEditable).map(el => el.textContent).filter(text => /'|(?<!\u202f)[?!:;]/u.test(text)));
  check(label + ': rendered French typography', typographyIssues.length === 0, typographyIssues);
  // Utility panels intentionally scroll. Every key control must still be reachable without document overflow.
  for (const control of await page.locator(keyControls).all()) {
    if (!(await control.isVisible()) || !(await control.isEnabled())) continue;
    await control.scrollIntoViewIfNeeded();
    const visible = await control.evaluate(el => {
      const r = el.getBoundingClientRect(), p = el.closest('#panel')?.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return { action: el.dataset.action || el.type, visible: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && (!p || (r.top >= p.top - 1 && r.bottom <= p.bottom + 1)) && !!top && (el === top || el.contains(top)), rect: r.toJSON() };
    });
    check(label + ': control reachable ' + visible.action, visible.visible, visible);
  }
  await page.locator('#panel').evaluate(el => { el.scrollTop = 0; });
  return result;
}
async function shot(page, label, options = {}) {
  // Reduced-motion canvas updates at 500 ms: wait for the new scene, not the previous frame.
  await page.waitForTimeout(options.midhold ? 0 : 560);
  const geometry = options.midhold ? null : await layout(page, label);
  const file = safeName(label) + '.png';
  await page.screenshot({ path: path.join(output, file), fullPage: false });
  const data = await page.evaluate(() => ({ screen: window.Day8App.debug.getScreen(), sceneIndex: window.Day8App.debug.getState().story.day8Index || 0, sceneId: window.Day8Content.scenes[window.Day8App.debug.getState().story.day8Index || 0]?.id, type: window.Day8App.debug.getScreen() === 'review' ? window.Day8App.debug.getExercise()?.type : null }));
  report.screenshots.push({ file, viewport: page.viewportSize(), ...data, geometry });
  if (geometry?.initiallyClipped.length) {
    await page.locator('#panel').evaluate(el => { el.scrollTop = el.scrollHeight; });
    const bottom = safeName(label) + '-controls.png';
    await page.screenshot({ path: path.join(output, bottom), fullPage: false });
    report.screenshots.push({ file: bottom, viewport: page.viewportSize(), ...data, scroll: 'panel bottom; companion to unscrolled state' });
    await page.locator('#panel').evaluate(el => { el.scrollTop = 0; });
  }
}
async function submit(page, id, value) {
  await page.locator('#' + id).fill(value);
  await page.locator('#' + id).press('Enter');
}
async function answer(page, correct = true) {
  const ex = await debug(page, 'getExercise');
  assert(ex, 'Expected an exercise');
  if (['R1', 'R2'].includes(ex.type)) {
    const option = ex.options.find(o => correct ? o.id === ex.wordId : o.id !== ex.wordId);
    assert(option, 'Expected an available ' + (correct ? 'correct' : 'wrong') + ' option');
    await click(page, 'answer:' + option.id);
  } else if (ex.type === 'R3') {
    // The engine can group adjacent authored chunks; solve the rendered chunks, not word metadata.
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const target = normalize(ex.sentence);
    const order = (chosen = []) => {
      const text = normalize(chosen.map(i => ex.chunks[i]).join(' '));
      if (!target.startsWith(text)) return null;
      if (chosen.length === ex.chunks.length) return text === target ? chosen : null;
      for (let i = 0; i < ex.chunks.length; i++) {
        if (chosen.includes(i)) continue;
        const result = order(chosen.concat(i));
        if (result) return result;
      }
      return null;
    };
    let indices = order();
    assert(indices, 'Rendered chunks can form the target sentence');
    if (!correct) indices = indices.slice(1).concat(indices[0]);
    for (const index of indices) await click(page, 'chunk:' + index);
  } else await submit(page, 'review-input', correct ? ex.answer : 'zzzzincorrect');
  const session = await debug(page, 'getSession');
  assert.equal(session.feedback?.correct, correct, `Expected ${ex.type} ${correct ? 'correct' : 'wrong'} feedback`);
  return ex;
}
async function drain(page, limit = 500) {
  let count = 0;
  while (await screen(page) === 'review') {
    if (++count > limit) throw new Error('Review did not terminate within ' + limit + ' interactions');
    const review = await debug(page, 'getSession');
    if (review.feedback) await click(page, 'review-next');
    else await answer(page);
  }
  return count;
}
async function hold(page, label) {
  const button = act(page, 'hold-water');
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  assert(rect, 'Watering control is visible');
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1450);
  if (label) await shot(page, label + '-midhold', { midhold: true });
  await page.waitForFunction(() => window.Day8App.debug.getScreen() === 'review', null, { timeout: 6000 });
  await page.mouse.up();
}
async function atlas(viewport, name) {
  const { page, context } = await open(viewport, name + '-atlas');
  try {
    await debug(page, 'reset');
    await shot(page, name + '-entry');
    await click(page, 'language');
    await shot(page, name + '-entry-zh');
    await click(page, 'language');
    const scenes = await page.evaluate(() => window.Day8Content.scenes.map((s, i) => ({ id: s.id, kind: s.kind, mode: s.mode, i })));
    assert.equal(scenes.length, sceneCount);
    assert.equal(scenes.filter(s => s.kind === 'chat').length, 4);
    assert(scenes.some(s => s.id === 'd8_chat_thursday' && s.kind === 'chat'));
    for (const s of scenes) await scenario(name + ' scene ' + s.id, async () => {
      await debug(page, 'jump', s.i);
      if (['voicemail', 'chat'].includes(s.kind)) assert.equal(await page.locator('#panel .draft').count(), 0, 'Approved language has no draft label');
      if (s.kind === 'end') assert((await page.locator('#panel').innerText()).includes(endingHook), 'Exact approved ending hook is rendered');
      await shot(page, `${name}-story-${String(s.i + 1).padStart(2, '0')}-${s.kind}-${s.id}`);
      if (await act(page, 'reveal-line').count()) {
        await click(page, 'reveal-line');
        await shot(page, `${name}-story-${String(s.i + 1).padStart(2, '0')}-${s.id}-revealed`);
      }
      if (['reply', 'choice'].includes(s.kind)) {
        await click(page, 'reply-option:0');
        assert(await page.locator('.canonical-answer').isVisible());
        await shot(page, `${name}-reply-feedback-${s.id}`);
      }
    });
    await scenario(name + ' garden', async () => {
      await debug(page, 'reset'); await click(page, 'continue');
      await shot(page, name + '-garden-start');
      await click(page, 'start-garden'); await answer(page);
      const paused = await debug(page, 'getSession');
      await page.keyboard.press('Escape');
      await shot(page, name + '-garden-paused');
      await click(page, 'start-garden');
      assert.deepEqual(await debug(page, 'getSession'), paused, 'Resume preserves exact queue and feedback');
      await shot(page, name + '-garden-resumed-feedback');
      await drain(page); assert.equal(await screen(page), 'reviewdone');
      await shot(page, name + '-garden-completed');
    });
    await scenario(name + ' cat', async () => {
      await debug(page, 'reset'); await debug(page, 'jump', scenes.find(s => s.kind === 'cat').i);
      await click(page, 'start-cat'); await shot(page, name + '-cat-before');
      await answer(page); await shot(page, name + '-cat-correct'); await click(page, 'review-next');
      for (let i = 0; i < 4; i++) {
        await answer(page, false);
        if (i === 0) await shot(page, name + '-cat-wrong');
        if (i === 3) await shot(page, name + '-cat-catch');
        await click(page, 'review-next');
      }
      await drain(page); assert.equal(await screen(page), 'catdone');
      await shot(page, name + '-cat-end');
    });
    for (const type of ['R1', 'R2', 'R3', 'P1', 'P2']) await scenario(name + ' ' + type, async () => {
      await debug(page, 'reset'); await debug(page, 'review', type);
      assert.equal((await debug(page, 'getExercise')).type, type);
      await shot(page, name + '-' + type + '-before');
      await answer(page); await shot(page, name + '-' + type + '-correct');
      await debug(page, 'reset'); await debug(page, 'review', type);
      await answer(page, false); await shot(page, name + '-' + type + '-wrong');
    });
    await scenario(name + ' lookup wordbook conjugation grammar', async () => {
      await debug(page, 'reset'); await debug(page, 'jump', 'd8_focus_basilic');
      await page.locator('[data-word="basilic"]').first().click();
      await shot(page, name + '-lookup-before');
      await click(page, 'collect');
      assert.equal((await debug(page, 'getState')).words.basilic.collected, true);
      await shot(page, name + '-lookup-collected');
      await click(page, 'wordbook'); await click(page, 'pot-two'); await click(page, 'expand:basilic');
      await shot(page, name + '-wordbook-expanded');
      await debug(page, 'jump', 'd8_cam_depuis');
      if (await act(page, 'reveal-line').count()) await click(page, 'reveal-line');
      await page.locator('[data-word="habites"]').click(); await click(page, 'conjugation');
      await shot(page, name + '-conjugation');
      await page.locator('#panel').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.screenshot({ path: path.join(output, name + '-conjugation-bottom.png') });
      report.screenshots.push({ file: name + '-conjugation-bottom.png', viewport });
      await debug(page, 'jump', 'd8_gag_basilic'); await click(page, 'grammar');
      await shot(page, name + '-grammar-before'); await click(page, 'keep-grammar');
      await shot(page, name + '-grammar-kept');
    });
    await scenario(name + ' voicemail', async () => {
      await debug(page, 'jump', scenes.find(s => s.kind === 'voicemail').i);
      await submit(page, 'voice-input', 'sept heures'); await shot(page, name + '-voicemail-wrong');
      await click(page, 'transcript'); await shot(page, name + '-voicemail-transcript');
      await submit(page, 'voice-input', 'six heures'); await shot(page, name + '-voicemail-correct');
    });
    for (const s of scenes.filter(s => s.kind === 'chat')) await scenario(name + ' chat ' + s.id, async () => {
      await debug(page, 'jump', s.i);
      for (let attempt = 1; attempt <= 3; attempt++) {
        await submit(page, 'reply-input', 'zzzz'); await shot(page, `${name}-${s.id}-hint-${attempt}`);
      }
      // Choosing all authored chunks in order exercises the chat assembly UI.
      const count = await page.locator('[data-action^="reply-chunk:"]').count();
      for (let i = 0; i < count; i++) await click(page, 'reply-chunk:' + i);
      assert(await act(page, 'next').isVisible(), 'Correct chat unlocks continue');
      await shot(page, name + '-' + s.id + '-correct');
    });
    await scenario(name + ' first watering', async () => {
      await debug(page, 'reset');
      for (const id of ['n_d10_monte', 'n_d10_plante', 'd8_first_watering']) await debug(page, 'jump', id);
      await hold(page, name + '-first-watering');
      assert.equal((await debug(page, 'getExercise')).wordId, 'basilic');
      await shot(page, name + '-first-basil-card');
      await answer(page); await shot(page, name + '-first-basil-correct');
      await click(page, 'review-next'); await shot(page, name + '-first-watering-completed');
    });
    await scenario(name + ' settings writing notes', async () => {
      await click(page, 'settings'); await shot(page, name + '-settings');
      await click(page, 'more'); await shot(page, name + '-more');
      await click(page, 'writing'); await page.locator('#writing-text').fill('Il y a du basilic dans la cuisine.');
      await click(page, 'check-writing'); await shot(page, name + '-writing');
      await click(page, 'more'); await click(page, 'notes');
      await page.locator('#note-text').fill('Synthetic screenshot test note. No personal data.');
      await click(page, 'attach-scene'); await shot(page, name + '-notes-attached');
      await click(page, 'save-note'); await shot(page, name + '-notes-saved');
      assert.equal((await debug(page, 'getState')).notes.length, 1);
      await click(page, 'more'); await click(page, 'evening'); await click(page, 'evening-text');
      await shot(page, name + '-evening-transcript');
    });
    await scenario(name + ' synthetic imports', async () => {
      await click(page, 'settings'); await click(page, 'import'); await shot(page, name + '-import-before');
      const synthetic = { profileId: 'jinyi', learn: { cards: {}, carnet: { words: [{ id: 'basilic', fr: 'basilic', at: '2026-10-01T12:00:00Z' }] } }, story: { playerName: 'Synthetic fixture', d7_band: 'A' } };
      await page.locator('#import-text').fill(JSON.stringify(synthetic)); await click(page, 'import-paste');
      assert(await page.locator('.success-message').isVisible());
      await shot(page, name + '-import-success');
      const before = await debug(page, 'getState');
      await page.locator('#import-text').fill(JSON.stringify({ profileId: 'yuechao', learn: { cards: {} } }));
      await click(page, 'import-paste'); assert(await page.locator('.error-message').isVisible());
      assert.deepEqual(await debug(page, 'getState'), before, 'Protected import refusal is transactional');
      await shot(page, name + '-import-refusal');
      const stored = await page.evaluate(() => Object.keys(localStorage));
      check(name + ': dev previews do not persist state', stored.length === 0, stored);
    });
  } finally { await context.close(); }
}
async function walkthrough(viewport, name) {
  const { page, context } = await open(viewport, name + '-walk');
  const walk = { name, viewport, navigation: 'Only real DOM clicks, input, and pointer hold. Debug getters are read-only; no jump/reset/setState/answer calls.', scenes: [], reviewAnswers: 0, steps: 0, completed: false };
  report.walkthroughs.push(walk);
  try {
    // Fresh context, real entry controls. No state preparation or debug mutation.
    await click(page, 'language'); await click(page, 'mute'); await click(page, 'continue');
    for (; walk.steps < 1000; walk.steps++) {
      const info = await page.evaluate(() => {
        const d = window.Day8App.debug, st = d.getState();
        return { screen: d.getScreen(), scene: window.Day8Content.scenes[st.story.day8Index || 0], index: st.story.day8Index || 0, feedback: !!d.getSession()?.feedback };
      });
      if (!walk.scenes.some(s => s.id === info.scene.id)) {
        walk.scenes.push({ id: info.scene.id, index: info.index, kind: info.scene.kind });
        await layout(page, name + '-walk-' + info.scene.id);
      }
      if (info.screen === 'end') { walk.completed = true; break; }
      if (info.screen === 'review') {
        if (info.feedback) await click(page, 'review-next');
        else { await answer(page); walk.reviewAnswers++; }
      } else if (['reviewdone', 'catdone'].includes(info.screen)) await click(page, 'finish-review');
      else if (info.screen === 'reveal') await click(page, 'after-reveal');
      else if (info.scene.kind === 'water') {
        if (info.scene.mode === 'first') await hold(page);
        else await click(page, 'start-garden');
      } else if (info.scene.kind === 'cat') await click(page, 'start-cat');
      else if (info.scene.kind === 'voicemail') {
        if (await page.locator('#voice-input').count()) await submit(page, 'voice-input', 'six heures');
        else await click(page, 'next');
      } else if (info.scene.kind === 'chat') {
        if (await page.locator('#reply-input').count()) await submit(page, 'reply-input', info.scene.accepted[0]);
        else await click(page, 'next');
      } else if (['reply', 'choice'].includes(info.scene.kind)) {
        if (await act(page, 'reply-option:0').count()) await click(page, 'reply-option:0');
        else await click(page, 'next');
      }
      else if (['point', 'walk'].includes(info.scene.kind)) {
        await click(page, 'point-next');
        await page.waitForFunction(index => window.Day8App.debug.getState().story.day8Index !== index, info.index);
      } else if (await act(page, 'reveal-line').count()) await click(page, 'reveal-line');
      else await click(page, 'next');
    }
    assert(walk.completed, 'UI walk reaches end');
    assert.equal(walk.scenes.length, sceneCount, 'UI walk visits every scene');
    assert(walk.scenes.some(s => s.id === 'd8_chat_thursday'), 'UI walk visits fourth chat');
    assert((await page.locator('#panel').innerText()).includes(endingHook), 'UI walk reaches approved ending');
    await shot(page, name + '-ui-walk-complete');
    check(name + ': genuine UI walkthrough complete', walk.completed && walk.scenes.length === sceneCount, { scenes: walk.scenes.length, reviewAnswers: walk.reviewAnswers });
  } finally { await context.close(); }
}
async function regressions(viewport, name) {
  const { page, context } = await open(viewport, name + '-regressions');
  try {
    await debug(page, 'reset');
    const aliasCases = [
      ['d8_voicemail', '6 heures', '\u00c0 six heures.'],
      ['d8_voicemail', '\u00e0 18 h', '\u00c0 six heures.'],
      ['d8_voicemail', ' A SIX HEURES!!! ', '\u00c0 six heures.'],
      ['d8_voicemail', 'en bas', null],
      ['d8_voicemail', 'sept heures', null],
      ['d8_chat_place', 'dans la cuisine', 'Dans la cuisine.'],
      ['d8_chat_place', ' DANS LA CUISINE!!! ', 'Dans la cuisine.'],
      ['d8_chat_place', 'sur la table', 'Sur la table.'],
      ['d8_chat_place', 'SUR LA TABLE.', 'Sur la table.'],
      ['d8_chat_time', '6 heures', '\u00c0 six heures.'],
      ['d8_chat_time', 'a 18 h!', '\u00c0 six heures.'],
      ['d8_chat_time', 'A SIX HEURES.', '\u00c0 six heures.'],
      ['d8_chat_basil', 'du basilic', 'Un peu de basilic.'],
      ['d8_chat_basil', 'DU BASILIC!!!', 'Un peu de basilic.'],
      ['d8_chat_thursday', 'oui', 'Oui, je veux bien.'],
      ['d8_chat_thursday', ' OUI!!! ', 'Oui, je veux bien.'],
      ['d8_chat_thursday', "OUI, D'ACCORD!", 'Oui, d\u2019accord.'],
      ['d8_chat_place', 'six heures', null],
      ['d8_chat_basil', 'oui', null],
      ['d8_chat_thursday', 'du basilic', null],
    ];
    for (const [id, input, canonical] of aliasCases) await scenario(`${name} alias ${id}: ${input}`, async () => {
      await debug(page, 'jump', id);
      assert.equal(await page.locator('#panel .draft').count(), 0);
      await submit(page, id === 'd8_voicemail' ? 'voice-input' : 'reply-input', input);
      const accepted = await act(page, 'next').isVisible();
      check(`${name} ${id}: ${JSON.stringify(input)} acceptance`, accepted === !!canonical, { accepted, canonical });
      if (canonical && accepted) {
        const rendered = await page.locator('.canonical-answer').innerText();
        check(`${name} ${id}: canonical feedback for ${JSON.stringify(input)}`, rendered === canonical || id === 'd8_voicemail' && rendered === '\u00c0 six heures, en bas.', { canonical, rendered });
        if (id === 'd8_voicemail') {
          assert.equal((await page.locator('.letter-feedback').textContent()).replace(/\u00a0/g, ' '), 'six heures');
          assert.equal(await page.locator('.letter-feedback .missing').count(), 0, 'Accepted aliases do not mark canonical letters wrong');
        }
      }
      assert.equal(await page.locator('#panel .draft').count(), 0);
    });
    await scenario(name + ' imported malicious identifier', async () => {
      await debug(page, 'reset');
      const id = 'evil" onclick="window.__importExecuted=1';
      const fixture = { schema: 'day8-1', profileId: 'jinyi', cards: {}, words: { [id]: { met: true, collected: true } }, customWords: { [id]: { id, fr: 'basilic', en: 'Synthetic security option', pos: 'noun', gender: 'm', sentence: 'Voici du basilic.', answer: 'basilic', potId: 2, week: 2, seen: true } } };
      await click(page, 'settings'); await click(page, 'import');
      await page.locator('#import-text').fill(JSON.stringify(fixture)); await click(page, 'import-paste');
      assert(await page.locator('.success-message, .error-message').count(), 'Import reports a result');
      check(name + ': imported unsafe ID rejected or excluded', !(await debug(page, 'getState')).customWords?.[id]);
      await click(page, 'garden'); await click(page, 'start-garden'); await answer(page);
      check(name + ': malicious import does not execute', await page.evaluate(() => !window.__importExecuted && !document.querySelector('[onclick]')));

      // Defense in depth: a cached pre-validation review still must escape action attributes.
      await debug(page, 'reset'); await debug(page, 'review', 'R1');
      const state = await debug(page, 'getState'), review = await debug(page, 'getSession');
      Object.assign(review.session.current.options[0], { id, text: 'Synthetic security option', zh: 'Synthetic security option', en: 'Synthetic security option' });
      state.appSession = review;
      await debug(page, 'setState', state);
      const option = page.locator('.answer').filter({ hasText: 'Synthetic security option' });
      assert.equal(await option.getAttribute('data-action'), 'answer:' + id, 'Attribute preserves ID as inert data');
      assert.equal(await option.getAttribute('onclick'), null, 'No injected inline handler');
      await option.click();
      check(name + ': quoted cached action cannot execute', await page.evaluate(() => !window.__importExecuted));
    });
    await scenario(name + ' malformed imported scenes', async () => {
      await debug(page, 'reset'); await click(page, 'settings'); await click(page, 'import');
      await page.locator('#import-text').fill(JSON.stringify({ schema: 'day8-1', profileId: 'jinyi', cards: {}, words: { plante: { met: true, collected: true, scenes: {} } } }));
      await click(page, 'import-paste');
      await debug(page, 'jump', 'd8_focus_plante');
      const state = await debug(page, 'getState');
      check(name + ': malformed word.scenes normalized before focus', Array.isArray(state.words.plante.scenes) && state.words.plante.scenes.includes('d8_focus_plante'));
      await shot(page, name + '-regression-malformed-import-focus');
    });
    for (const kind of ['growth', 'wake']) await scenario(name + ' ' + kind + ' reveal idempotence', async () => {
      await debug(page, 'reset');
      await page.evaluate(kind => {
        const d = window.Day8App.debug, state = JSON.parse(JSON.stringify(d.getState()));
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const pot = (shownStage, condition = 'healthy') => ({ G: 0, stage: 1, shownStage, condition, lastReveal: null });
        state.growth = { pots: { 1: pot(kind === 'growth' ? 0 : 1), 2: pot(kind === 'wake' ? 1 : 0, kind === 'wake' ? 'wilted' : 'healthy') }, lastSettlement: window.Day8Engine.dayKey(yesterday), lastRevealDay: null };
        if (kind === 'growth') state.growth.pots[2].stage = 0;
        for (const card of Object.values(state.cards)) card.due = new Date(Date.now() + 86400000).toISOString();
        d.setState(state);
      }, kind);
      await click(page, 'continue');
      assert.equal(await screen(page), 'reveal', 'Seeded pending growth reaches real reveal flow');
      const initial = (await debug(page, 'getState')).growth;
      const shown = [1, 2].map(id => initial.pots[id].shownStage);
      const canvasHash = async () => createHash('sha256').update(await page.locator('#scene').evaluate(canvas => canvas.toDataURL())).digest('hex');
      await page.waitForTimeout(560);
      const initialFrame = await canvasHash();
      for (let i = 0; i < 3; i++) {
        await debug(page, 'render'); await click(page, 'mute'); await page.waitForTimeout(560);
        assert.deepEqual((await debug(page, 'getState')).growth, initial, 'Rerender and mute do not mutate settled growth');
        assert.equal(await canvasHash(), initialFrame, 'Reduced-motion reveal art does not grow again on rerender');
      }
      if (kind === 'wake') assert((await page.locator('#panel .hint').innerText()).includes('Le basilic'), 'String pot ID 2 gets basil caption');
      await shot(page, name + '-regression-' + kind + '-reveal');
      check(name + ': ' + kind + ' reveal remains idempotent', true, { shown });
    });
  } finally { await context.close(); }
}
async function offline(viewport, name) {
  const context = await browser.newContext({ viewport, offline: true, serviceWorkers: 'block' });
  const page = await context.newPage(); observe(page, name + '-file-offline');
  try {
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href + '?dev=1');
    await page.waitForFunction(() => window.Day8App?.ready);
    await click(page, 'language'); await click(page, 'mute'); await click(page, 'continue');
    await click(page, 'start-garden'); await answer(page);
    await shot(page, name + '-file-offline-review');
    report.offline.push({ name, passed: true, protocol: 'file:', offline: true, assertion: 'Local assets load and real review answer reaches feedback without network' });
  } finally { await context.close(); }
}
async function videos() {
  for (const kind of ['cat', 'first-watering']) await scenario('video ' + kind, async () => {
    const { page, context } = await open({ width: 390, height: 844 }, 'video-' + kind, { reducedMotion: 'no-preference', recordVideo: { dir: output, size: { width: 390, height: 844 } } });
    const video = page.video();
    try {
      await debug(page, 'reset');
      if (kind === 'cat') {
        await debug(page, 'jump', 'd8_cat'); await click(page, 'start-cat');
        for (let i = 0; i < 4; i++) { await answer(page, false); await page.waitForTimeout(650); await click(page, 'review-next'); }
        await answer(page); await page.waitForTimeout(650); await click(page, 'review-next');
        await drain(page); await page.waitForTimeout(800);
      } else {
        for (const id of ['n_d10_monte', 'n_d10_plante', 'd8_first_watering']) await debug(page, 'jump', id);
        await hold(page);
        await page.waitForTimeout(600); await answer(page); await page.waitForTimeout(800);
      }
    } finally { await context.close(); }
    const file = kind + '.webm'; await video.saveAs(path.join(output, file)); await video.delete();
    report.videos.push({ file, viewport: { width: 390, height: 844 } });
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  report.origin = base;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [name, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
    if (process.env.SCREENSHOTS_ONLY && process.env.SCREENSHOTS_ONLY !== name) continue;
    if (!phase || phase === 'atlas') await scenario(name + ' atlas', () => atlas(viewport, name));
    if (!phase || phase === 'walk') await scenario(name + ' UI walkthrough', () => walkthrough(viewport, name));
    if (!phase || phase === 'regressions') await scenario(name + ' browser regressions', () => regressions(viewport, name));
    if (!phase || phase === 'offline') await scenario(name + ' file offline', () => offline(viewport, name));
  }
  if (!phase || phase === 'video') await videos();
})().catch(error => { report.failures.push({ name: 'runner', error: error.stack }); console.error(error); }).finally(async () => {
  check('No uncaught browser runtime errors', report.runtimeErrors.length === 0, report.runtimeErrors);
  const runtimeConsoleErrors = report.consoleErrors.filter(error => !error.text.startsWith('Failed to load resource:'));
  check('No runtime console errors', runtimeConsoleErrors.length === 0, runtimeConsoleErrors);
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  report.finalSourceHashes = sourceHashes();
  report.sourceChangedDuringRun = Object.keys(report.sourceHashes).filter(file => report.sourceHashes[file] !== report.finalSourceHashes[file]);
  check('Source snapshot stable during run', report.sourceChangedDuringRun.length === 0, report.sourceChangedDuringRun);
  if (!phase || phase === 'atlas') for (const name of ['mobile', 'desktop']) {
    if (process.env.SCREENSHOTS_ONLY && process.env.SCREENSHOTS_ONLY !== name) continue;
    const scenes = report.screenshots.filter(s => new RegExp('^' + name + '-story-\\d+-[^.]+\\.png$').test(s.file) && !s.file.endsWith('-controls.png') && !s.file.endsWith('-revealed.png'));
    check(name + ': all 53 story screenshots captured', scenes.length === sceneCount, scenes.length);
    for (const type of ['R1', 'R2', 'R3', 'P1', 'P2']) for (const state of ['before', 'correct', 'wrong']) {
      const file = name + '-' + type + '-' + state + '.png';
      check(file + ': captured', report.screenshots.some(s => s.file === file));
    }
  }
  report.initiallyClippedStates = report.screenshots.filter(s => s.geometry?.initiallyClipped.length).map(s => ({ file: s.file, controls: s.geometry.initiallyClipped.map(c => c.action) }));
  if (!phase && !process.env.SCREENSHOTS_ONLY) {
    const staleScreenshots = fs.readdirSync(output).filter(file => file.endsWith('.png') && !report.screenshots.some(s => s.file === file));
    check('No obsolete screenshots outside current report', staleScreenshots.length === 0, staleScreenshots);
  }
  report.summary = { screenshots: report.screenshots.length, assertions: report.assertions.length, failures: report.failures.length, runtimeErrors: report.runtimeErrors.length, walksCompleted: report.walkthroughs.filter(w => w.completed).length, videos: report.videos.length };
  persist(); console.log(JSON.stringify(report.summary, null, 2));
  process.exitCode = report.failures.length ? 1 : 0;
});
