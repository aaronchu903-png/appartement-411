#!/usr/bin/env node
'use strict';

// Run: NODE_PATH=/tmp/kilo/node_modules node app/screenshots.cjs
// Optional: SCREENSHOTS_ONLY=mobile|mobile-small; SCREENSHOTS_PHASE=atlas|walk|video|offline|regressions|contact.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = process.env.SCREENSHOTS_OUTPUT || path.join(__dirname, 'screenshots');
const phase = process.env.SCREENSHOTS_PHASE;
const reportFile = phase || process.env.SCREENSHOTS_ONLY ? `report-${phase || 'all'}-${process.env.SCREENSHOTS_ONLY || 'both'}.json` : 'report.json';
const sceneCount = 53; // Remove morning watering, add the approved Noe carry-up line.
const endingHook = 'Sur le toit, un jardin qui se r\u00e9veille. En bas, une lampe qui reste allum\u00e9e.';
const sourceHashes = () => Object.fromEntries(['index.html', 'app.js', 'style.css', 'tokens.css', 'icons.js', 'art.js', 'audio.js', 'engine.js', 'save.js', 'language.js', 'content.js', 'modules/index.js', ...['M1', 'M2', 'M3', 'M4'].map(id => `modules/${id}.js`)].filter(file => fs.existsSync(path.join(__dirname, file))).map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')]));
const report = {
  startedAt: new Date().toISOString(),
  sourceHashes: sourceHashes(),
  method: 'Isolated browser contexts; debug jumps for atlas, DOM interactions for answers; separate read-only-debug UI walkthrough. Synthetic imports only.',
  screenshots: [], assertions: [], failures: [], runtimeErrors: [], consoleErrors: [], resourceFailures: [], walkthroughs: [], videos: [], offline: [], contacts: [],
};
fs.mkdirSync(output, { recursive: true });
// Keep v1 references and other agents' artifacts; v2 output names are distinct.
function archiveDiagnostics() {
  const directory = path.join(output, 'diagnostics');
  for (const file of fs.readdirSync(output)) {
    if (!/^v2-failure-.*\.png$|^report-.+\.json$/.test(file)) continue;
    if (file.endsWith('.json')) {
      const diagnostic = JSON.parse(fs.readFileSync(path.join(output, file), 'utf8'));
      if (!diagnostic.summary?.failures || !diagnostic.screenshots?.some(s => s.file.startsWith('v2-'))) continue;
    }
    fs.mkdirSync(directory, { recursive: true });
    fs.renameSync(path.join(output, file), path.join(directory, file));
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
const readOnlyPages = new WeakSet();
const activePages = new Set();
const act = (page, action) => page.locator(`[data-action="${action}"]:visible`).first();
const click = (page, action) => act(page, action).click({ timeout: 5000 });
const debug = (page, method, ...args) => {
  assert(!readOnlyPages.has(page) || /^get/.test(method), 'Walkthrough forbids debug mutation: ' + method);
  return page.evaluate(({ method, args }) => window.Day8App.debug[method](...args), { method, args });
};
const screen = page => debug(page, 'getScreen');
const safeName = text => text.replace(/[^a-zA-Z0-9_-]/g, '-');
const keyControls = '#panel button:not(.word), #panel input, #overlay button:not(.word), #overlay input, #overlay textarea, #overlay select, #hotspots .hotspot:not(.quiet), #btnWordbook, #btnFeedbackBar, #btnMusic, #btnPause';
function persist() { fs.writeFileSync(path.join(output, reportFile), JSON.stringify(report, null, 2) + '\n'); }
function check(name, condition, detail) {
  report.assertions.push({ name, passed: !!condition, ...(detail === undefined ? {} : { detail }) });
  if (!condition) { report.failures.push({ name, detail }); console.error('ASSERTION:', name, JSON.stringify(detail)); }
}
async function scenario(name, run) {
  try { await run(); }
  catch (error) {
    const failure = { name, error: error.stack };
    const page = [...activePages].findLast(page => !page.isClosed());
    if (page) {
      failure.evidence = 'v2-failure-' + safeName(name) + '.png';
      await page.screenshot({ path: path.join(output, failure.evidence) }).catch(() => {});
      failure.visibleText = await page.locator('body').innerText().catch(() => '');
    }
    report.failures.push(failure); console.error('SCENARIO:', name, error.message);
  }
  persist();
}
function observe(page, label) {
  activePages.add(page); page.on('close', () => activePages.delete(page));
  page.on('pageerror', error => { report.runtimeErrors.push({ label, url: page.url(), message: error.message, stack: error.stack }); console.error('RUNTIME:', label, error.message); });
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ label, text: message.text(), location: message.location() }); });
  page.on('requestfailed', request => report.resourceFailures.push({ label, url: request.url(), error: request.failure()?.errorText }));
}
async function open(viewport, label, extra = {}) {
  const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block', ...extra });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  observe(page, label);
  await page.goto(base + '/app/?dev=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.Day8App?.ready && window.Day8App.debug);
  await observeAudio(page);
  return { page, context };
}
async function observeAudio(page) {
  await page.evaluate(() => {
    window.__v2AudioCalls = [];
    const speak = window.Day8Audio.speak;
    window.Day8Audio.speak = function (...args) { window.__v2AudioCalls.push({ text: args[0], id: args[1] }); return speak.apply(this, args); };
  });
}
async function layout(page, label) {
  const result = await page.evaluate(selector => {
    const panel = document.querySelector('#panel');
    const body = document.body, doc = document.documentElement;
    const horizontal = { document: doc.scrollWidth - innerWidth, body: body.scrollWidth - innerWidth, panel: panel.scrollWidth - panel.clientWidth };
    const canvas = document.querySelector('#scene'), rect = canvas.getBoundingClientRect();
    const coverage = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left)) * Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top)) / (innerWidth * innerHeight);
    const hud = ['btnWordbook', 'btnFeedbackBar', 'btnMusic', 'btnPause'].map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, missing: true };
      const r = el.getBoundingClientRect(), css = getComputedStyle(el), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { id, rect: r.toJSON(), position: css.position, visible: !!el.getClientRects().length && css.visibility !== 'hidden' && css.display !== 'none', reachable: !!hit && (hit === el || el.contains(hit)), pixel: !!el.querySelector('.pixel-icon, [data-pixel-icon], svg rect, canvas, img') };
    });
    const primary = [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.disabled);
    const clipped = primary.filter(el => {
      const r = el.getBoundingClientRect(), p = el.closest('#panel, #overlay-body')?.getBoundingClientRect();
      return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 || (p && (r.top < p.top - 1 || r.bottom > p.bottom + 1));
    }).map(el => ({ action: el.dataset.action || el.type, rect: el.getBoundingClientRect().toJSON() }));
    const d = window.Day8App.debug;
    const fourthChat = d.getScreen() === 'story' && window.Day8Content.scenes[d.getState().story.day8Index || 0]?.id === 'd8_chat_thursday';
    const scene = window.Day8Content.scenes[d.getState().story.day8Index || 0];
    const overlay = document.querySelector('#overlay-body'), overlayRect = overlay?.getBoundingClientRect();
    return { horizontal, initiallyClipped: clipped, coverage, canvas: rect.toJSON(), pixelated: getComputedStyle(canvas).imageRendering === 'pixelated', hud, dialogueRatio: panel.getBoundingClientRect().height / innerHeight, storyDialogue: d.getScreen() === 'review' || d.getScreen() === 'story' && ['line', 'narr'].includes(scene?.kind), overlayArea: overlayRect ? overlayRect.width * overlayRect.height / (innerWidth * innerHeight) : 0, panelScrollable: panel.scrollHeight > panel.clientHeight + 1, thursdayChatLocation: fourthChat ? document.querySelector('#location').textContent : null };
  }, keyControls);
  check(label + ': no horizontal overflow', Object.values(result.horizontal).every(n => n <= 1), result.horizontal);
  check(label + ': full viewport canvas', result.coverage >= .995, result.canvas);
  check(label + ': pixelated canvas', result.pixelated);
  check(label + ': exactly four legacy HUD controls', await page.locator('#nav button').count() === 4);
  if (result.storyDialogue) check(label + ': dialogue at most 25 percent', result.dialogueRatio <= .251, result.dialogueRatio);
  check(label + ': overlay occupies at most 25 percent', result.overlayArea <= .251, result.overlayArea);
  const { width, height } = page.viewportSize();
  for (const hud of result.hud) {
    const r = hud.rect;
    check(label + ': fixed visible pixel HUD ' + hud.id, !hud.missing && hud.visible && hud.reachable && hud.pixel && hud.position === 'fixed' && r.width >= 44 && r.height >= 44, hud);
    if (!r) continue;
    const placement = hud.id === 'btnWordbook' ? r.left <= 24 && r.bottom >= height - 32 && Math.abs(r.width - 46) <= 2 : hud.id === 'btnMusic' ? r.right >= width - 24 && r.bottom >= height - 32 : hud.id === 'btnPause' ? r.right >= width - 24 && r.top <= 32 : Math.abs(r.x + r.width / 2 - width / 2) <= 2 && r.bottom >= height - 32;
    check(label + ': old HUD placement ' + hud.id, placement, r);
  }
  if (result.thursdayChatLocation !== null) check(label + ': after-dinner chat shows 21:08', result.thursdayChatLocation.includes('21:08'), result.thursdayChatLocation);
  // html[lang=fr] also contains clocks and hidden noscript fallback, not a French sentence.
  const typographyIssues = await page.locator('#panel [lang="fr"], #overlay [lang="fr"], .word-row-head button, .conjugation').evaluateAll(elements => elements.filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.matches('input, textarea, .bubble.mine:not(.canonical-answer)') && !el.isContentEditable).map(el => el.textContent).filter(text => /'|(?<!\u202f)[?!:;]/u.test(text)));
  check(label + ': rendered French typography', typographyIssues.length === 0, typographyIssues);
  const contentIssues = await page.evaluate(() => {
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), cjk = [], emoji = [], captions = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement, text = node.textContent.trim();
      if (!text || !el || !visible(el) || el.closest('script,style,textarea,input')) continue;
      if (/[\u3400-\u9fff]/u.test(text) && !el.closest('.gloss, .definition, .lookup-gloss, .word-gloss, .exercise-hint, [data-gloss], [data-hint]')) cjk.push(text);
      if (/\p{Extended_Pictographic}/u.test(text)) emoji.push(text);
      if (/plant is safe|grew|a pouss[eé]|water your words|arrosez vos mots/i.test(text)) captions.push(text);
    }
    return { cjk, emoji, captions, outlineIcons: [...document.querySelectorAll('svg path, svg line, svg circle, svg polyline, svg ellipse')].filter(visible).length };
  });
  check(label + ': no default Chinese outside glosses or hints', contentIssues.cjk.length === 0, contentIssues.cjk);
  check(label + ': no emoji or outline icons', !contentIssues.emoji.length && !contentIssues.outlineIcons, contentIssues);
  check(label + ': no banned explanatory captions', contentIssues.captions.length === 0, contentIssues.captions);
  // Utility panels intentionally scroll. Every key control must still be reachable without document overflow.
  for (const control of await page.locator(keyControls).all()) {
    if (!(await control.isVisible()) || !(await control.isEnabled())) continue;
    // Underlying dialogue is deliberately inert while an overlay is open.
    if (await control.evaluate(el => !!el.closest('[inert]'))) continue;
    await control.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    const visible = await control.evaluate(el => {
      const r = el.getBoundingClientRect(), p = el.closest('#panel, #overlay-body')?.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return { action: el.dataset.action || el.type, visible: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && (!p || (r.top >= p.top - 1 && r.bottom <= p.bottom + 1)) && !!top && (el === top || el.contains(top)), rect: r.toJSON() };
    });
    check(label + ': control reachable ' + visible.action, visible.visible, visible);
  }
  await page.locator('#panel, #overlay-body').evaluateAll(elements => elements.forEach(el => { el.scrollTop = 0; }));
  return result;
}
async function shot(page, label, options = {}) {
  // Allow the reduced-motion renderer to paint the new scene, not the previous frame.
  await page.waitForTimeout(options.midhold ? 0 : 560);
  const geometry = options.midhold ? null : await layout(page, label);
  const file = 'v2-' + safeName(label) + '.png';
  await page.screenshot({ path: path.join(output, file), fullPage: false });
  const data = await page.evaluate(() => ({ screen: window.Day8App.debug.getScreen(), sceneIndex: window.Day8App.debug.getState().story.day8Index || 0, sceneId: window.Day8Content.scenes[window.Day8App.debug.getState().story.day8Index || 0]?.id, type: window.Day8App.debug.getScreen() === 'review' ? window.Day8App.debug.getExercise()?.type : null }));
  report.screenshots.push({ file, viewport: page.viewportSize(), ...data, geometry });
  if (geometry?.initiallyClipped.length) {
    await page.locator('#panel, #overlay-body').evaluateAll(elements => elements.forEach(el => { el.scrollTop = el.scrollHeight; }));
    const bottom = 'v2-' + safeName(label) + '-controls.png';
    await page.screenshot({ path: path.join(output, bottom), fullPage: false });
    report.screenshots.push({ file: bottom, viewport: page.viewportSize(), ...data, scroll: 'panel bottom; companion to unscrolled state' });
    await page.locator('#panel, #overlay-body').evaluateAll(elements => elements.forEach(el => { el.scrollTop = 0; }));
  }
}
async function submit(page, id, value) {
  await page.locator('#' + id).fill(value);
  await page.locator('#' + id).press('Enter');
}
async function answer(page, correct = true) {
  const ex = await debug(page, 'getExercise');
  assert(ex, 'Expected an exercise');
  const audioStart = await page.evaluate(() => window.__v2AudioCalls.length);
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
  const audio = await page.evaluate(start => window.__v2AudioCalls.slice(start), audioStart);
  assert(audio.some(call => call.text === session.feedback.sentence), 'Every answer requests the complete correct sentence audio');
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
async function overlayInvariant(page, action, name, capture) {
  const before = await page.evaluate(() => {
    window.__v2UnderlyingNode = document.querySelector('#panel').firstChild;
    const d = window.Day8App.debug;
    return { index: d.getState().story.day8Index, scene: d.getSceneModel(), html: document.querySelector('#panel').innerHTML };
  });
  await click(page, action);
  assert(await page.locator('#overlay').isVisible(), action + ' opens an overlay');
  if (capture) await shot(page, name);
  const during = await debug(page, 'getSceneModel');
  assert.equal(during.scene, before.scene.scene, 'Overlay keeps underlying scene');
  assert.equal((await debug(page, 'getState')).story.day8Index, before.index, 'Overlay keeps story beat');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#overlay').isVisible()), 'Escape closes the overlay');
  assert.equal(await page.locator('#panel').innerHTML(), before.html, 'Overlay preserves underlying dialogue DOM');
  assert(await page.evaluate(() => document.querySelector('#panel').firstChild === window.__v2UnderlyingNode), 'Overlay restores actual node, not a reconstructed beat');
  check(name + ': overlay preserves same scene and beat', true);
}
async function livingPlant(page, name) {
  const evidence = await page.evaluate(() => {
    const model = window.Day8App.debug.getSceneModel(), canvas = document.querySelector('#scene');
    return { stage: window.Day8Art.layout(canvas, model).storyPlantStage, pot: window.Day8Art.projectHotspots(canvas, model).pot };
  });
  check(name + ': living plant remains visible in pot', evidence.stage >= 2 && evidence.pot?.visible === true, evidence);
}
async function catGame(page, name, capture = true, interact = true) {
  const before = await debug(page, 'getState');
  const started = Date.now();
  await click(page, 'start-cat');
  assert.equal(await page.locator('#review-input, .answer-grid, [data-action^="answer:"], [data-action^="chunk:"]').count(), 0, 'Cat has no question UI');
  assert.equal(await debug(page, 'getSession'), null, 'Cat never creates an FSRS session');
  await livingPlant(page, name + '-cat-before');
  if (capture) await shot(page, name + '-cat-before');
  if (interact) {
    await page.waitForTimeout(2200);
    const target = page.locator('[data-action="cat-bop"]').first();
    const initial = await target.boundingBox();
    assert(initial, 'Moving cat has an actual pointer target');
    await page.mouse.click(initial.x + initial.width / 2, initial.y + initial.height / 2);
    const tapped = await debug(page, 'getCat');
    assert(tapped.bops >= 1, 'Actual pointer tap bops the cat');
    const r = await target.boundingBox();
    assert(r, 'Cat remains touchable after a bop');
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down(); await page.mouse.move(r.x + r.width / 2 - 35, r.y + r.height / 2, { steps: 8 }); await page.mouse.up();
    assert((await debug(page, 'getCat')).bops > tapped.bops, 'Actual drag blocks the cat');
  }
  await page.waitForTimeout(Math.max(0, 11500 - (Date.now() - started)));
  await livingPlant(page, name + '-cat-push');
  if (capture) await shot(page, name + '-cat-push');
  await page.waitForFunction(() => window.Day8App.debug.getScreen() === 'catdone', null, { timeout: 12000 });
  await page.waitForTimeout(1600); // Capture the completed physical lift, not its first pose.
  const elapsed = Date.now() - started;
  assert(elapsed >= 10000 && elapsed <= 22000, 'Cat game lasts approximately 10-20 seconds');
  const after = await debug(page, 'getState');
  assert.deepEqual(after.cards, before.cards, 'Cat never modifies FSRS cards');
  assert.deepEqual(after.days, before.days, 'Cat never records review attempts');
  await livingPlant(page, name + '-cat-end');
  check(name + ': cat touch game without learning mutations', true, { elapsed });
  if (capture) await shot(page, name + '-cat-end');
}
async function atlas(viewport, name) {
  const { page, context } = await open(viewport, name + '-atlas');
  try {
    await shot(page, name + '-entry');
    await overlayInvariant(page, 'wordbook', name + '-carnet-entry', true);
    await click(page, 'settings'); await click(page, 'lang:zh'); await page.keyboard.press('Escape');
    await shot(page, name + '-entry-zh-gloss-preference');
    await click(page, 'settings'); await click(page, 'lang:en'); await page.keyboard.press('Escape');
    const scenes = await page.evaluate(() => window.Day8Content.scenes.map((s, i) => ({ id: s.id, kind: s.kind, mode: s.mode, i })));
    assert.equal(scenes.length, sceneCount);
    assert.equal(scenes.filter(s => s.kind === 'chat').length, 4);
    assert(scenes.some(s => s.id === 'd8_chat_thursday' && s.kind === 'chat'));
    assert(!scenes.some(s => s.id === 'd8_morning_review'));
    assert(scenes.some(s => s.id === 'd8_noe_carry'));
    for (const s of scenes) await scenario(name + ' scene ' + s.id, async () => {
      await debug(page, 'jump', s.i);
      if (['voicemail', 'chat'].includes(s.kind)) assert.equal(await page.locator('#panel .draft').count(), 0, 'Approved language has no draft label');
      if (s.kind === 'end') assert((await page.locator('#panel').innerText()).includes(endingHook), 'Exact approved ending hook is rendered');
      await shot(page, `${name}-story-${String(s.i + 1).padStart(2, '0')}-${s.kind}-${s.id}`);
      if (await act(page, 'reveal-line').count()) {
        await click(page, 'reveal-line');
        await shot(page, `${name}-story-${String(s.i + 1).padStart(2, '0')}-${s.id}-revealed`);
      }
      if (s.kind === 'focus') {
        await click(page, 'focus-reveal');
        await shot(page, name + '-focus-reveal-' + s.id);
      }
      if (['reply', 'choice'].includes(s.kind)) {
        await click(page, 'reply-option:0');
        assert(await page.locator('.canonical-answer').isVisible());
        await shot(page, `${name}-reply-feedback-${s.id}`);
      }
    });
    await scenario(name + ' garden', async () => {
      await debug(page, 'reset'); await debug(page, 'garden', 2); await click(page, 'select-pot:1');
      await shot(page, name + '-garden-start');
      await click(page, 'start-garden'); await answer(page);
      const paused = await debug(page, 'getSession');
      await click(page, 'settings');
      await shot(page, name + '-garden-paused');
      await page.keyboard.press('Escape');
      assert.deepEqual(await debug(page, 'getSession'), paused, 'Resume preserves exact queue and feedback');
      await shot(page, name + '-garden-resumed-feedback');
      await drain(page); assert.equal(await screen(page), 'reviewdone');
      await shot(page, name + '-garden-completed');
    });
    for (const count of [2, 24, 60]) await scenario(name + ' garden ' + count + ' pots', async () => {
      await debug(page, 'reset'); await debug(page, 'garden', count);
      const model = await debug(page, 'getSceneModel');
      assert.equal(model.scene, 'roof'); assert.equal(model.night, true);
      assert.equal(model.garden.slots.length, count);
      assert.equal(new Set(model.garden.slots.map(s => s.id)).size, count, 'Garden slot IDs unique');
      await shot(page, name + '-garden-' + count);
      if (count === 60) {
        for (let bay = 1; bay < 3; bay++) {
          await click(page, 'garden-next');
          assert.equal((await debug(page, 'getSceneModel')).garden.bay, bay);
          await shot(page, name + '-garden-60-bay-' + (bay + 1));
        }
      }
    });
    await scenario(name + ' cat', async () => {
      await debug(page, 'reset'); await debug(page, 'jump', scenes.find(s => s.kind === 'cat').i);
      await catGame(page, name);
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
      await click(page, 'focus-reveal');
      await page.locator('[data-word="basilic"]').first().click();
      await shot(page, name + '-lookup-before');
      await click(page, 'collect');
      assert.equal((await debug(page, 'getState')).words.basilic.collected, true);
      await shot(page, name + '-lookup-collected');
      await page.keyboard.press('Escape');
      await overlayInvariant(page, 'wordbook', name + '-carnet-open', true);
      await click(page, 'wordbook'); await page.locator('#word-pot').selectOption('2'); await click(page, 'expand:basilic');
      await shot(page, name + '-wordbook-expanded');
      await debug(page, 'jump', 'd8_cam_depuis');
      if (await act(page, 'reveal-line').count()) await click(page, 'reveal-line');
      await page.locator('[data-word="habites"]').click(); await click(page, 'conjugation');
      await shot(page, name + '-conjugation');
      await page.locator('#overlay-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.screenshot({ path: path.join(output, 'v2-' + name + '-conjugation-bottom.png') });
      report.screenshots.push({ file: 'v2-' + name + '-conjugation-bottom.png', viewport });
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
      await click(page, 'review-next');
      assert.equal(await screen(page), 'review', 'Due Martin cards follow basil in same session');
      const martin = await debug(page, 'getExercise');
      assert.equal(martin.word.potId, 1, 'First watering next targets Martin pot');
      await drain(page); await shot(page, name + '-first-watering-completed');
    });
    await scenario(name + ' settings writing notes', async () => {
      await click(page, 'settings'); await shot(page, name + '-settings');
      await click(page, 'writing'); await page.locator('#writing-text').fill('Il y a du basilic dans la cuisine.');
      await click(page, 'check-writing'); await shot(page, name + '-writing');
      await page.keyboard.press('Escape'); await click(page, 'notes');
      await page.locator('#note-text').fill('Synthetic screenshot test note. No personal data.');
      await click(page, 'attach-scene'); await shot(page, name + '-notes-attached');
      await click(page, 'save-note'); await shot(page, name + '-notes-saved');
      assert.equal((await debug(page, 'getState')).notes.length, 1);
      await page.keyboard.press('Escape'); await click(page, 'evening'); await click(page, 'evening-text');
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
  readOnlyPages.add(page);
  const walk = { name, viewport, navigation: 'Only real DOM clicks, input, and pointer hold. Debug getters are read-only; no jump/reset/setState/answer calls.', scenes: [], reviewAnswers: 0, steps: 0, completed: false };
  report.walkthroughs.push(walk);
  try {
    // Fresh context, real entry controls. No state preparation or debug mutation.
    await click(page, 'music'); await click(page, 'continue');
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
        assert.equal((await debug(page, 'getSceneModel')).scene, 'roof', 'Every actual walkthrough review is on roof');
        if (info.feedback) await click(page, 'review-next');
        else { await answer(page); walk.reviewAnswers++; }
      } else if (info.screen === 'reviewdone') await click(page, 'finish-review');
      else if (info.screen === 'catdone') await click(page, 'finish-cat');
      else if (info.screen === 'reveal') await click(page, 'after-reveal');
      else if (info.scene.kind === 'water') {
        if (info.scene.mode === 'first') await hold(page);
        else await click(page, 'start-garden');
      } else if (info.scene.kind === 'cat') await catGame(page, name + '-walk', false);
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
      else if (info.scene.kind === 'focus') {
        if (await act(page, 'focus-reveal').count()) await click(page, 'focus-reveal');
        else await click(page, 'focus-next');
      } else if (['point', 'walk'].includes(info.scene.kind)) {
        await click(page, 'point-next');
        await page.waitForFunction(index => window.Day8App.debug.getState().story.day8Index !== index, info.index);
      } else if (await act(page, 'reveal-line').count()) await click(page, 'reveal-line');
      else await click(page, 'next');
    }
    assert(walk.completed, 'UI walk reaches end');
    assert.equal(walk.scenes.length, sceneCount, 'UI walk visits every scene');
    assert(walk.scenes.some(s => s.id === 'd8_chat_thursday'), 'UI walk visits fourth chat');
    assert(walk.scenes.some(s => s.id === 'd8_noe_carry'), 'UI walk includes approved plant carry line');
    assert.equal(walk.scenes[0].id, 'n_d8_matin', 'UI walk starts with story, not kitchen review');
    assert((await page.locator('#panel').innerText()).includes(endingHook), 'UI walk reaches approved ending');
    await shot(page, name + '-ui-walk-complete');
    check(name + ': genuine UI walkthrough complete', walk.completed && walk.scenes.length === sceneCount, { scenes: walk.scenes.length, reviewAnswers: walk.reviewAnswers });
  } finally { await context.close(); }
}
async function regressions(viewport, name) {
  const { page, context } = await open(viewport, name + '-regressions');
  try {
    await scenario(name + ' text size and selected language controls', async () => {
      await debug(page, 'jump', 'd8_cam_depuis');
      const font = () => page.locator('#panel .dialogue').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      const initial = await font();
      await click(page, 'settings');
      const selected = await page.locator('[data-action^="lang:"].selected').evaluate(el => ({ appearance: getComputedStyle(el).appearance, border: getComputedStyle(el).borderTopWidth, style: getComputedStyle(el).borderTopStyle }));
      assert.equal(selected.appearance, 'none'); assert.equal(selected.border, '2px'); assert.equal(selected.style, 'solid');
      await click(page, 'text-size'); await page.keyboard.press('Escape');
      assert(await font() > initial * 1.1, 'Aa visibly increases dialogue font size');
      await click(page, 'settings'); await click(page, 'text-size'); await page.keyboard.press('Escape');
      assert.equal(await font(), initial, 'Aa restores original dialogue size');
      check(name + ': text size toggle and selected language pixel styling', true);
    });
    await scenario(name + ' legacy story and session migration', async () => {
      for (const [oldIndex, expectedIndex] of [[0, 0], [1, 0], [48, 47], [49, 49]]) {
        await debug(page, 'reset');
        const state = await debug(page, 'getState');
        state.story.day8Index = oldIndex; delete state.story.day8Version; delete state.story.day8SceneId;
        await debug(page, 'setState', state);
        const migrated = await debug(page, 'getState');
        assert.equal(migrated.story.day8Index, expectedIndex);
        assert.equal(migrated.story.day8Version, 2);
        await debug(page, 'setState', migrated);
        assert.equal((await debug(page, 'getState')).story.day8Index, expectedIndex, 'No double migration');
      }
      const state = await debug(page, 'getState');
      state.story.day8Index = 1; state.story.day8SceneId = 'd8_chat_thursday'; delete state.story.day8Version;
      await debug(page, 'setState', state);
      assert.equal((await debug(page, 'getState')).story.day8Index, await page.evaluate(() => window.Day8Content.scenes.findIndex(s => s.id === 'd8_chat_thursday')));
      for (const mode of ['cat', 'garden']) {
        await debug(page, 'reset'); const fixture = await debug(page, 'getState');
        fixture.story.rooftop = false; fixture.story.day8Complete = false;
        fixture.appSession = { session: { mode, queue: [{ wordId: 'plante' }], types: [], index: 0 }, returnTo: 'story' };
        await debug(page, 'setState', fixture);
        assert.equal((await debug(page, 'getState')).appSession, null, 'Discard legacy ' + mode + ' kitchen session');
        assert.equal(await debug(page, 'getSession'), null);
      }
      check(name + ': persisted story IDs, migration boundaries and legacy sessions', true);
    });
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
    const replies = await page.evaluate(() => window.Day8Content.scenes.filter(s => ['reply', 'choice'].includes(s.kind)).map(s => ({ id: s.id, options: s.options })));
    for (const reply of replies) for (const [index, option] of reply.options.entries()) await scenario(`${name} approved option ${reply.id}:${option.id}`, async () => {
      await debug(page, 'jump', reply.id);
      await click(page, 'reply-option:' + index);
      assert.equal(await page.locator('.canonical-answer').innerText(), option.text, 'Each approved reply keeps its own meaning');
      assert(await act(page, 'next').isVisible());
      await layout(page, `${name}-${reply.id}-${option.id}-approved`);
    });
    await scenario(name + ' key handover accepts effort without false correctness', async () => {
      await debug(page, 'jump', 'd10_pourmoi');
      await submit(page, 'reply-input', '');
      assert(!(await act(page, 'next').isVisible()), 'Empty input cannot skip the handover');
      await submit(page, 'reply-input', 'Je ne sais pas encore.');
      assert(await act(page, 'next').isVisible(), 'Any nonempty handover attempt allows story continuation');
      assert.equal(await page.locator('.canonical-answer').count(), 0, 'Unmatched attempt is not falsely marked correct');
      await click(page, 'next');
      assert.equal((await debug(page, 'getState')).story.day8Index, await page.evaluate(() => window.Day8Content.scenes.findIndex(s => s.id === 'd10_lef_allez')));
    });
    await scenario(name + ' wrong voicemail audio keeps authored hint', async () => {
      await debug(page, 'jump', 'd8_voicemail');
      const start = await page.evaluate(() => window.__v2AudioCalls.length);
      await submit(page, 'voice-input', 'sept heures');
      const calls = await page.evaluate(start => window.__v2AudioCalls.slice(start), start);
      assert(calls.length > 0, 'Wrong answer plays authored audio support');
      assert(calls.every(call => call.text !== 'six heures'), 'Wrong audio does not reveal canonical answer');
      assert(!(await act(page, 'next').isVisible()), 'Wrong voicemail answer cannot advance');
    });
    await scenario(name + ' imported malicious identifier', async () => {
      await debug(page, 'reset');
      const id = 'evil" onclick="window.__importExecuted=1';
      const fixture = { schema: 'day8-1', profileId: 'jinyi', cards: {}, words: { [id]: { met: true, collected: true } }, customWords: { [id]: { id, fr: 'basilic', en: 'Synthetic security option', pos: 'noun', gender: 'm', sentence: 'Voici du basilic.', answer: 'basilic', potId: 2, week: 2, seen: true } } };
      await click(page, 'settings'); await click(page, 'import');
      await page.locator('#import-text').fill(JSON.stringify(fixture)); await click(page, 'import-paste');
      assert(await page.locator('.success-message, .error-message').count(), 'Import reports a result');
      check(name + ': imported unsafe ID rejected or excluded', !(await debug(page, 'getState')).customWords?.[id]);
      await page.keyboard.press('Escape'); await debug(page, 'garden', 2); await click(page, 'select-pot:1'); await click(page, 'start-garden'); await answer(page);
      check(name + ': malicious import does not execute', await page.evaluate(() => !window.__importExecuted && !document.querySelector('[onclick]')));

      // Defense in depth: a cached pre-validation review still must escape action attributes.
      await debug(page, 'reset'); await debug(page, 'review', 'R1');
      const state = await debug(page, 'getState'), review = await debug(page, 'getSession');
      Object.assign(review.session.current.options[0], { id, fr: 'Synthetic security option', text: 'Synthetic security option', zh: 'Synthetic security option', en: 'Synthetic security option' });
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
        state.story.rooftop = true;
        state.story.has_key = true;
        state.story.day8SceneId = 'n_d10_arrose';
        if (kind === 'growth') state.growth.pots[2].stage = 0;
        for (const card of Object.values(state.cards)) card.due = new Date(Date.now() + 86400000).toISOString();
        d.setState(state);
      }, kind);
      await click(page, 'settings'); await click(page, 'garden');
      assert.equal(await screen(page), 'reveal', 'Seeded pending growth reaches real reveal flow');
      const initial = (await debug(page, 'getState')).growth;
      const shown = [1, 2].map(id => initial.pots[id].shownStage);
      const canvasHash = async () => createHash('sha256').update(await page.locator('#scene').evaluate(canvas => canvas.toDataURL())).digest('hex');
      await page.waitForTimeout(560);
      const initialFrame = await canvasHash();
      for (let i = 0; i < 3; i++) {
        await debug(page, 'render'); await click(page, 'music'); await page.waitForTimeout(560);
        assert.deepEqual((await debug(page, 'getState')).growth, initial, 'Rerender and mute do not mutate settled growth');
        assert.equal(await canvasHash(), initialFrame, 'Reduced-motion reveal art does not grow again on rerender');
      }
      if (kind === 'wake') assert.equal((await debug(page, 'getSceneModel')).scene, 'roof', 'Basil wake reveal remains on rooftop');
      await shot(page, name + '-regression-' + kind + '-reveal');
      check(name + ': ' + kind + ' reveal remains idempotent', true, { shown });
    });
  } finally { await context.close(); }
}
async function persistence(viewport, name) {
  // A new synthetic browser profile, no dev query and no access to real user storage.
  const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage(); observe(page, name + '-persistence');
  try {
    await page.goto(base + '/app/');
    await page.waitForFunction(() => window.Day8App?.ready);
    assert(await page.evaluate(() => !window.Day8App.debug), 'Player mode does not expose mutation helpers');
    const fixture = { profileId: 'jinyi', story: { playerName: 'Synthetic persistence fixture', d7_band: 'B' }, learn: { cards: { 'w_plante|reading': { itemId: 'w_plante', modality: 'reading', stability: 12.5, difficulty: 6.2, due: '2026-10-18T08:00:00Z', lastReview: '2026-10-10T08:00:00Z', lapses: 3, reps: 8 } }, carnet: { words: [{ id: 'basilic', at: '2026-10-01T08:00:00Z' }] } } };
    await click(page, 'settings'); await click(page, 'import');
    await page.locator('#import-text').fill(JSON.stringify(fixture)); await click(page, 'import-paste');
    assert(await page.locator('.success-message').isVisible());
    const snapshot = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
    const imported = await snapshot();
    assert.equal(Object.keys(imported).length, 1, 'Only new app storage namespace is written');
    const saved = JSON.parse(Object.values(imported)[0]);
    assert.equal(saved.cards['plante|reading'].stability, 12.5);
    assert.equal(saved.words.basilic.collected, true);
    assert.equal(saved.story.d7_band, 'B');
    await page.locator('#import-text').fill(JSON.stringify({ profileId: 'jinyi', nested: { profileId: 'Yuechao' }, learn: fixture.learn }));
    await click(page, 'import-paste');
    assert(await page.locator('.error-message').isVisible());
    assert.deepEqual(await snapshot(), imported, 'Protected refusal does not modify persisted bytes');
    await page.reload(); await page.waitForFunction(() => window.Day8App?.ready);
    assert.deepEqual(await snapshot(), imported, 'Reload preserves imported memory and collection');
    await click(page, 'settings'); await click(page, 'lang:zh');
    const language = await snapshot();
    await page.reload(); await page.waitForFunction(() => window.Day8App?.ready);
    assert.deepEqual(await snapshot(), language, 'Help-language preference persists across reload');
    await click(page, 'settings');
    const downloadPromise = page.waitForEvent('download');
    await click(page, 'export'); const download = await downloadPromise;
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(exported.kind, 'day8-save');
    assert.equal(exported.data.cards['plante|reading'].stability, 12.5, 'Export preserves scheduling');
    assert.equal(exported.data.words.basilic.collected, true, 'Export preserves collection');
    check(name + ': real save import/refusal/reload/export/language persistence', true);
  } finally { await context.close(); }
}
async function offline(viewport, name) {
  const context = await browser.newContext({ viewport, hasTouch: true, offline: true, serviceWorkers: 'block' });
  const page = await context.newPage(); observe(page, name + '-file-offline');
  try {
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href + '?dev=1');
    await page.waitForFunction(() => window.Day8App?.ready);
    await observeAudio(page);
    await click(page, 'music'); await click(page, 'continue');
    assert.equal((await debug(page, 'getState')).story.day8Index || 0, 0);
    await debug(page, 'review', 'R1'); await answer(page);
    await shot(page, name + '-file-offline-review');
    report.offline.push({ name, passed: true, protocol: 'file:', offline: true, assertion: 'Local assets load and real review answer reaches feedback without network' });
  } finally { await context.close(); }
}
async function legacyImport(viewport, name) {
  for (const progressed of [false, true]) {
    const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
    if (progressed) await context.addInitScript(() => {
      // Synthetic pre-v2 own-save: migrate in memory, then import before anything saves its stable ID.
      if (location.protocol === 'http:' && !localStorage.getItem('a411app.v1.state')) localStorage.setItem('a411app.v1.state', JSON.stringify({ schema: 'day8-1', profileId: 'jinyi', cards: {}, words: {}, days: {}, settings: { uiLang: 'en' }, story: { day8Index: 30 } }));
    });
    const page = await context.newPage(); observe(page, name + '-legacy-import');
    try {
      await page.goto(base + '/app/'); await page.waitForFunction(() => window.Day8App?.ready);
      assert(await page.evaluate(() => !window.Day8App.debug));
      if (progressed) assert(await page.evaluate(() => window.Day8Save.load(localStorage, window.Day8Content.words).ok), 'Synthetic existing own-save is valid before testing merge precedence');
      const old = { kind: 'day8-save', schema: 1, profileId: 'jinyi', data: { schema: 'day8-1', profileId: 'jinyi', cards: {}, words: {}, story: { day8Index: 30, playerName: 'Synthetic legacy export' } } };
      if (progressed) Object.assign(old.data.story, { day8Index: 40, day8Version: 2, day8SceneId: 'd10_lef_jardin' });
      await click(page, 'settings'); await click(page, 'import');
      await page.locator('#import-text').fill(JSON.stringify(old)); await click(page, 'import-paste');
      assert(await page.locator('.success-message').isVisible(), await page.locator('#overlay-body').innerText());
      const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem(window.Day8Save.KEY)));
      const imported = await stored();
      assert.equal(imported.story.day8Index, 29, progressed ? 'Progressed local cursor wins as a unit over incoming stable ID' : 'Fresh player accepts incoming old story progress before migration');
      assert.equal(imported.story.day8Version, 2);
      assert.equal(imported.story.day8SceneId, 'd9_lef_place');
      await page.reload(); await page.waitForFunction(() => window.Day8App?.ready);
      const reloaded = await stored();
      assert.equal(reloaded.story.day8Index, 29, 'Reload does not remigrate or lose imported progress');
      await click(page, 'continue');
      assert.equal((await stored()).story.day8SceneId, 'n_d8_matin', 'Entry Continue starts at home, not an imported activity');
      check(name + ': ' + (progressed ? 'progressed local' : 'fresh legacy') + ' own-export UI import and reload preserve story progress', true);
    } finally { await context.close(); }
  }
}
async function videos() {
  for (const [name, viewport] of viewports) for (const kind of ['idle', 'cat']) await scenario(name + ' video ' + kind, async () => {
    if (process.env.SCREENSHOTS_ONLY && process.env.SCREENSHOTS_ONLY !== name) return;
    const { page, context } = await open(viewport, name + '-video-' + kind, { reducedMotion: 'no-preference', recordVideo: { dir: output, size: viewport } });
    const video = page.video();
    const file = 'v2-' + (name === 'mobile' ? '' : name + '-') + 'anim-' + kind + '.webm';
    const samples = [];
    try {
      await debug(page, 'reset');
      if (kind === 'cat') {
        await debug(page, 'jump', 'd8_cat');
        await page.waitForTimeout(600);
        const intro = await debug(page, 'getSceneModel');
        const cat = await page.evaluate(model => window.Day8Art.motion(model).cat, intro);
        samples.push({ at: 0, hash: 'intro-transition', cat, phase: 'before-start', elapsed: intro.catGame?.elapsed });
        await click(page, 'start-cat');
      } else await debug(page, 'jump', 'd8_cam_depuis');
      const started = Date.now(), duration = kind === 'cat' ? 17800 : 10500;
      while (Date.now() - started < duration) {
        const sample = await page.evaluate(() => {
          const model = window.Day8App.debug.getSceneModel();
          return { frame: document.querySelector('#scene').toDataURL(), cat: window.Day8Art.motion(model).cat, phase: model.catGame?.phase, elapsed: model.catGame?.elapsed };
        });
        samples.push({ at: Date.now() - started, hash: createHash('sha256').update(sample.frame).digest('hex'), cat: sample.cat, phase: sample.phase, elapsed: sample.elapsed });
        await page.waitForTimeout(100);
      }
      check(name + ' ' + kind + ': real animation changes during at least 10 seconds', samples.at(-1).at >= 10000 && new Set(samples.map(s => s.hash)).size >= 20, { samples: samples.length, uniqueFrames: new Set(samples.map(s => s.hash)).size });
      if (kind === 'cat') {
        assert.equal(await screen(page), 'catdone');
        const jumps = samples.slice(1).map((sample, index) => ({ at: sample.at, phase: sample.phase, distance: Math.hypot(sample.cat.x - samples[index].cat.x, sample.cat.y - samples[index].cat.y) })).filter(s => s.distance > 45);
        check(name + ': cat continuous motion without large teleports', jumps.length === 0, jumps);
      }
    } finally {
      await context.close();
      await video.saveAs(path.join(output, file)); await video.delete();
      const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path.join(output, file)], { encoding: 'utf8' }).trim());
      check(file + ': recorded duration at least 10 seconds', duration >= 10, duration);
      const frames = file.replace('.webm', '-frames.png');
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(output, file), '-vf', `fps=${8 / duration},scale=${name === 'mobile' ? 195 : 320}:-1:flags=neighbor,tile=4x2`, '-frames:v', '1', '-threads', '1', path.join(output, frames)], { stdio: 'pipe' });
      report.videos.push({ file, viewport, duration, frames, samples });
    }
  });
}
function acceptanceAliases() {
  const aliases = {
    entry: /v2-mobile-entry\.png$/, dialogue: /v2-mobile-story-\d+-line-d8_cam_depuis\.png$/,
    'focus-reveal': /v2-mobile-focus-reveal-d8_focus_basilic\.png$/, lookup: /v2-mobile-lookup-before\.png$/,
    'carnet-open': /v2-mobile-carnet-open\.png$/, 'cat-before': /v2-mobile-cat-before\.png$/,
    'cat-push': /v2-mobile-cat-push\.png$/, 'cat-end': /v2-mobile-cat-end\.png$/,
    ...Object.fromEntries([2, 24, 60].map(n => ['garden-' + n, new RegExp(`v2-mobile-garden-${n}\\.png$`)])),
  };
  for (const [name, pattern] of Object.entries(aliases)) {
    const source = report.screenshots.find(s => pattern.test(s.file));
    check('Acceptance image ' + name, !!source);
    if (!source) continue;
    const file = 'v2-' + name + '.png'; fs.copyFileSync(path.join(output, source.file), path.join(output, file));
    report.screenshots.push({ ...source, file, aliasOf: source.file });
  }
}
function contactSheet() {
  const pairs = [
    ['Entry', 'evidence/01-title-390.png', 'v2-entry.png'],
    ['Dialogue and HUD', 'evidence/37-v080-d6-balcon.png', 'v2-dialogue.png'],
    ['Word reveal', 'evidence/24-word-card.png', 'v2-focus-reveal.png'],
    ['Lookup', 'evidence/40a-v092-lookup-form.png', 'v2-lookup.png'],
    ['Carnet', 'evidence/41-v050-wordbook.png', 'v2-carnet-open.png'],
    ['Garden', 'app/docs/v2_compare.png', 'v2-garden-60.png', 'crop=300:650:1300:84,'],
    ['Cat safe end (v1 vs v2)', 'app/screenshots/mobile-cat-end.png', 'v2-cat-end.png'],
  ];
  const inputs = [], filters = [];
  for (const [label, old, current, crop = ''] of pairs) for (const [column, file] of [path.join(root, old), path.join(output, current)].entries()) {
    assert(fs.existsSync(file), 'Contact sheet source exists: ' + file);
    const i = inputs.length; inputs.push(file);
    filters.push(`[${i}:v]${column ? '' : crop}scale=234:500:force_original_aspect_ratio=decrease:flags=neighbor,pad=240:530:(ow-iw)/2:26:color=0x182d27,drawtext=text='${column ? 'V2' : 'OLD'} - ${label}':fontsize=12:fontcolor=white:x=5:y=7[s${i}]`);
  }
  filters.push(inputs.map((_, i) => `[s${i}]`).join('') + `xstack=inputs=${inputs.length}:layout=` + inputs.map((_, i) => `${i % 2 * 240}_${Math.floor(i / 2) * 530}`).join('|') + '[out]');
  const file = 'v2_contact.png';
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs.flatMap(file => ['-i', file]), '-filter_complex_threads', '1', '-filter_complex', filters.join(';'), '-map', '[out]', '-frames:v', '1', '-threads', '1', path.join(output, file)], { stdio: 'pipe' });
  report.contacts.push({ file, pairs, tool: 'ffmpeg', comparison: 'Legacy interaction references versus actual v2 captures; final row is v1 versus v2 cat' });
}
const viewports = [['mobile', { width: 390, height: 844 }], ['mobile-small', { width: 375, height: 667 }]];
(async () => {
  if (phase === 'contact') { contactSheet(); return; }
  if (!phase && !process.env.SCREENSHOTS_ONLY && fs.existsSync(path.join(output, 'report.json'))) {
    const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
    if (previous.summary?.failures && previous.screenshots?.some(s => s.file.startsWith('v2-'))) {
      const directory = path.join(output, 'diagnostics'); fs.mkdirSync(directory, { recursive: true });
      fs.copyFileSync(path.join(output, 'report.json'), path.join(directory, 'report-' + previous.startedAt.replace(/\D/g, '') + '.json'));
    }
  }
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  report.origin = base;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [name, viewport] of viewports) {
    if (process.env.SCREENSHOTS_ONLY && process.env.SCREENSHOTS_ONLY !== name) continue;
    if (!phase || phase === 'atlas') await scenario(name + ' atlas', () => atlas(viewport, name));
    if (!phase || phase === 'walk') await scenario(name + ' UI walkthrough', () => walkthrough(viewport, name));
    if (!phase || phase === 'regressions') await scenario(name + ' browser regressions', () => regressions(viewport, name));
    if (!phase || phase === 'regressions') await scenario(name + ' persistence', () => persistence(viewport, name));
    if (!phase || phase === 'regressions') await scenario(name + ' legacy own-export import', () => legacyImport(viewport, name));
    if (!phase || phase === 'offline') await scenario(name + ' file offline', () => offline(viewport, name));
  }
  if ((!phase || phase === 'atlas') && process.env.SCREENSHOTS_ONLY !== 'mobile-small') {
    acceptanceAliases(); await scenario('Old/new contact sheet', async () => contactSheet());
  }
  if (!phase || phase === 'video') await videos();
})().catch(error => { report.failures.push({ name: 'runner', error: error.stack }); console.error(error); }).finally(async () => {
  check('No uncaught browser runtime errors', report.runtimeErrors.length === 0, report.runtimeErrors);
  const runtimeConsoleErrors = report.consoleErrors.filter(error => !error.text.startsWith('Failed to load resource:'));
  check('No runtime console errors', runtimeConsoleErrors.length === 0, runtimeConsoleErrors);
  await browser?.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  report.finalSourceHashes = sourceHashes();
  report.sourceChangedDuringRun = [...new Set([...Object.keys(report.sourceHashes), ...Object.keys(report.finalSourceHashes)])].filter(file => report.sourceHashes[file] !== report.finalSourceHashes[file]);
  check('Source snapshot stable during run', report.sourceChangedDuringRun.length === 0, report.sourceChangedDuringRun);
  if (!phase || phase === 'atlas') for (const name of ['mobile', 'mobile-small']) {
    if (process.env.SCREENSHOTS_ONLY && process.env.SCREENSHOTS_ONLY !== name) continue;
    const scenes = report.screenshots.filter(s => new RegExp('^v2-' + name + '-story-\\d+-[^.]+\\.png$').test(s.file) && !s.file.endsWith('-controls.png') && !s.file.endsWith('-revealed.png'));
    check(name + ': all 53 story screenshots captured', scenes.length === sceneCount, scenes.length);
    for (const type of ['R1', 'R2', 'R3', 'P1', 'P2']) for (const state of ['before', 'correct', 'wrong']) {
      const file = 'v2-' + name + '-' + type + '-' + state + '.png';
      check(file + ': captured', report.screenshots.some(s => s.file === file));
    }
  }
  report.initiallyClippedStates = report.screenshots.filter(s => s.geometry?.initiallyClipped.length).map(s => ({ file: s.file, controls: s.geometry.initiallyClipped.map(c => c.action) }));
  check('Every reported screenshot exists', report.screenshots.every(item => fs.existsSync(path.join(output, item.file))));
  report.summary = { screenshots: report.screenshots.length, assertions: report.assertions.length, failures: report.failures.length, runtimeErrors: report.runtimeErrors.length, walksCompleted: report.walkthroughs.filter(w => w.completed).length, videos: report.videos.length };
  persist();
  if (!phase && !process.env.SCREENSHOTS_ONLY && report.summary.failures === 0) archiveDiagnostics();
  console.log(JSON.stringify(report.summary, null, 2));
  process.exitCode = report.failures.length ? 1 : 0;
});
