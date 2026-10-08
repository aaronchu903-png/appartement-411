// End-to-end verification at a 390x844 mobile viewport with headless Chrome (playwright-core).
// Run: npm run e2e   (CHROME=/path/to/chrome to override). Writes evidence/e2e-results.json + screenshots.
// All data entered here is synthetic test data, not learner records.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EV = path.join(ROOT, 'evidence');
fs.mkdirSync(EV, { recursive: true });
const URL_SRC = 'file://' + path.join(ROOT, 'index.html');
const URL_DIST = 'file://' + path.join(ROOT, 'dist', 'appartement-411.html');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const results = [];
function check(gate, name, pass, detail) { results.push({ gate, check: name, pass: !!pass, detail: detail ?? null }); console.log((pass ? 'PASS' : 'FAIL') + ' [' + gate + '] ' + name + (detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const env = { chrome: (await browser.version()), viewport: '390x844 @2x, isMobile, hasTouch', date: new Date().toISOString() };

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: 'zh-CN', ...(opts.ctx || {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.requests = [];
  page.on('request', r => page.requests.push(r.url()));
  await page.goto(opts.url || URL_SRC);
  await page.waitForFunction(() => window.A411 && A411.Audio && A411.Audio.status !== 'unknown', null, { timeout: 8000 });
  return { ctx, page };
}
const st = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('a411.save') || 'null'));
const raw = (page) => page.evaluate(() => localStorage.getItem('a411.save'));
async function tap(page, sel) { await page.locator(sel).first().click(); await page.waitForTimeout(60); }
async function shot(page, name) { await page.waitForTimeout(450); const p = path.join(EV, name); await page.screenshot({ path: p, fullPage: false }); return p; }
async function lineNext(page) { await tap(page, '#btnNext'); }
async function touchTargetsOk(page) {
  return page.evaluate(() => [...document.querySelectorAll('button, input[type=checkbox], input[type=radio], input[type=text], textarea')]
    .filter(e => e.offsetParent !== null)
    .map(e => { const r = (e.closest('label') || e).getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(x => x.w < 44 || x.h < 44));
}
async function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); }

// Fake French voice for the "voice available" path (headless Chrome has no voices).
const FAKE_VOICE = () => {
  const spoken = []; window.__spoken = spoken;
  const voice = { name: 'Fake Français (test)', lang: 'fr-FR', default: true, localService: true, voiceURI: 'fake-fr' };
  const fake = { speaking: false, _cur: null,
    getVoices() { return [voice]; }, addEventListener() {}, removeEventListener() {},
    cancel() { const u = this._cur; this._cur = null; if (u && u.onerror) setTimeout(() => u.onerror({ error: 'interrupted' }), 0); },
    speak(u) { this._cur = u; spoken.push(u.text); setTimeout(() => { if (this._cur !== u) return; u.onstart && u.onstart(); setTimeout(() => { if (this._cur !== u) return; this._cur = null; u.onend && u.onend(); }, 120); }, 30); },
    pause() {}, resume() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
};

try {
  // ================= A. Main path, real headless Chrome (no French voice -> reading fallback) =================
  {
    const { ctx, page } = await newPage({ ctx: { permissions: ['clipboard-read', 'clipboard-write'] } });
    const audio = await page.evaluate(() => ({ status: A411.Audio.status, reason: A411.Audio.reason }));
    check('Audio', 'headless Chrome voice detection reported honestly', audio.status === 'unavailable', audio);
    check('Usable entry', 'version visible on title', /App v0\.1\.1 · 内容 d1-2026-10-08b · 存档 schema v1/.test(await page.textContent('#versionFooter')));
    await shot(page, '01-title-390.png');
    check('Mobile presentation', 'no horizontal overflow on title (390px)', await noOverflow(page));
    const naDays = await page.evaluate(() => [...document.querySelectorAll('.days li.na')].map(li => ({ t: li.textContent, buttons: li.querySelectorAll('button,a').length })));
    check('Complete interaction', 'Days 2–7 marked unavailable without buttons', naDays.length === 6 && naDays.every(d => d.buttons === 0 && /尚未开放/.test(d.t)), naDays.length);
    // settings: support level 1 (so help is meaningful), reduced motion on
    await tap(page, '#btnSettings'); await tap(page, '#lvl1'); await tap(page, '#optReduced');
    check('Mobile presentation', 'reduced-motion option applies', await page.evaluate(() => document.body.classList.contains('reduced-motion')));
    await tap(page, '.sheet .head button');
    await tap(page, '#btnStart');
    // baseline (reading mode)
    await tap(page, '#btnBaselineStart');
    check('Audio', 'unavailable voice is visible to the player', await page.isVisible('#audioBanner'), await page.textContent('#audioBanner'));
    await shot(page, '02-baseline-reading-fallback.png');
    for (const ans of ['greet', 'tells', 'unsure']) await tap(page, `[data-option="${ans}"]`);
    await tap(page, '#btnBaselineDone');
    let s = await st(page);
    check('Learning validity', 'baseline recorded as reading (listening unverified), no labels', s.learning.baseline.status === 'done' && s.learning.baseline.items.length === 3 && s.learning.baseline.items.every(i => i.modality === 'reading'), s.learning.baseline.items);
    // doorway
    await tap(page, '#btnKnock');
    check('Audio', 'line falls back to visible French text with status "无语音（阅读）"', (await page.textContent('#lineBody')).includes('Bonjour') && (await page.textContent('#audioState')).includes('阅读'));
    await lineNext(page);
    await tap(page, '#greetSalut');
    await page.waitForSelector('#speakerTag');
    check('Complete interaction', 'speaker visible on intro line', (await page.textContent('#speakerTag')).includes('Camille'));
    await tap(page, '#btnZh');
    check('Complete interaction', 'Chinese help reveals gloss', (await page.textContent('#gloss')).includes('我叫 Camille'));
    await shot(page, '03-doorway-camille-help.png');
    check('Mobile presentation', 'all visible controls ≥44px on dialogue screen', (await touchTargetsOk(page)).length === 0, await touchTargetsOk(page));
    await lineNext(page);
    check('Complete interaction', 'Noé intro shown with speaker tag', (await page.textContent('#speakerTag')).includes('Noé'));
    await lineNext(page); await lineNext(page);
    // name
    await lineNext(page); // cam_ask
    await page.fill('#nameInput', 'Je m\u2019appelle Alex');
    await tap(page, '#btnNameZh');
    check('Complete interaction', 'name draft preserved across help re-render', (await page.inputValue('#nameInput')) === 'Je m\u2019appelle Alex');
    await shot(page, '04-name-input.png');
    await tap(page, '#btnNameSubmit');
    check('Complete interaction', 'Camille repeats nickname (no audio claimed)', (await page.textContent('.dialogue')).includes('Alex'));
    s = await st(page);
    const na = s.learning.attempts.find(a => a.target === 'try_je_mappelle');
    check('Learning validity', 'name attempt: writing, full_structure, supported (Chinese help shown), original preserved', na && na.modality === 'writing' && na.production === 'full_structure' && na.resultType === 'supported' && na.response === 'Je m\u2019appelle Alex', na);
    await lineNext(page);
    // plant
    await lineNext(page); // cam_plante
    // mid-scene pause on "Ta plante a soif."
    await tap(page, '#btnPause');
    check('Complete interaction', 'pause overlay mid-scene with saved position', (await page.textContent('#pauseMsg')).includes('植物角（第 2 步）'));
    await shot(page, '05-pause-mid-scene.png');
    const beforeReload = await raw(page);
    await page.reload(); await page.waitForFunction(() => A411.Audio.status !== 'unknown');
    const noTs = (r) => { const o = JSON.parse(r); delete o.updatedAt; return JSON.stringify(o); };
    check('Persistence', 'close/reopen keeps save identical (except updatedAt timestamp)', noTs(await raw(page)) === noTs(beforeReload));
    { const A = JSON.parse(beforeReload), Bq = JSON.parse(await raw(page)); const d = []; (function walk(a, b, p) { if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) { if (JSON.stringify(a) !== JSON.stringify(b)) d.push(p + ': ' + JSON.stringify(a) + ' -> ' + JSON.stringify(b)); return; } for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + '.' + k); })(A, Bq, ''); const d2 = d.filter(x => !x.startsWith('.updatedAt')); if (d2.length) console.log('DIFF', d2); }
    check('Persistence', 'title offers exact resume point', (await page.textContent('#btnContinue')).includes('植物角（第 2 步）'));
    await tap(page, '#btnContinue');
    check('Persistence', 'resume lands on exact line (Ta plante a soif.)', (await page.textContent('#lineBody')).includes('Ta plante a soif'));
    await lineNext(page);
    await tap(page, '#btnWater'); await tap(page, '#btnWater');
    const toastTxt = await page.textContent('#toast');
    s = await st(page);
    check('Persistence', 'watering counted once despite double tap', s.plant.careLog.length === 1 && s.plant.careState === 'watered', { careLog: s.plant.careLog.length, toast: toastTxt });
    await page.waitForTimeout(100); await shot(page, '06-plant-watered.png');
    await lineNext(page);
    // cat
    await lineNext(page); await lineNext(page); await lineNext(page); await lineNext(page);
    await shot(page, '07-cat-secret-choice.png');
    await tap(page, '#secretKeep');
    s = await st(page);
    check('Complete interaction', 'secret choice (keep) saved; Camille knowledge unchanged', s.world.choices.d1_secret === 'keep' && s.world.relationships.noe.secretPromise === 'kept' && s.world.knowledge.camille.knowsCat === false, { choice: s.world.choices.d1_secret, camille: s.world.knowledge.camille });
    await lineNext(page);
    // probe (reading mode)
    await tap(page, '#btnProbeStart');
    const optStyles = await page.evaluate(() => [...document.querySelectorAll('.probe-opts button')].map(b => { const c = getComputedStyle(b); return [c.backgroundColor, c.color, c.borderColor, c.fontWeight, c.boxShadow, b.className].join('|'); }));
    check('Learning validity', 'probe options visually identical (no highlight)', new Set(optStyles).size === 1, optStyles[0]);
    const answerFor = async () => { const x = await st(page); const id = x.progress.probe.order[x.progress.probe.index]; return { id, func: /intro/.test(id) ? 'tells' : 'asks' }; };
    let a1 = await answerFor(); await tap(page, `[data-option="${a1.func}"]`);
    let a2 = await answerFor(); await tap(page, `[data-option="${a2.func === 'tells' ? 'asks' : 'tells'}"]`);
    // reload mid-probe -> resume at trial 3
    await page.reload(); await page.waitForFunction(() => A411.Audio.status !== 'unknown');
    await tap(page, '#btnContinue');
    check('Persistence', 'mid-probe resume at trial 3/4', (await page.textContent('#trialTitle')).includes('第 3/4'));
    await tap(page, '[data-option="unsure"]');
    let a4 = await answerFor(); await tap(page, `[data-option="${a4.func}"]`);
    s = await st(page);
    const trials = s.learning.attempts.filter(a => a.evidenceKind === 'discrimination');
    check('Learning validity', 'probe trials recorded as reading (not listening) when no voice', trials.length === 4 && trials.every(t => t.modality === 'reading' && t.audioStatus === 'unavailable'), trials.map(t => [t.modality, t.audioStatus, t.resultType, t.correct]));
    check('Learning validity', 'probe order randomised & stored', Array.isArray(s.progress.probe.order) && s.progress.probe.order.length === 4);
    const reqFields = ['target', 'contentVersion', 'modality', 'audioStatus', 'visibleSupport', 'replays', 'response', 'resultType', 'context', 'at'];
    check('Learning validity', 'every learning attempt has all STAGE_01 minimum fields', s.learning.attempts.every(a => reqFields.every(f => f in a)), s.learning.attempts.length + ' attempts');
    await shot(page, '08-probe-result.png');
    await lineNext(page);
    // diary
    const chron = await page.textContent('#chronicle');
    check('Complete interaction', 'chronicle = encountered events only', chron.includes('Croissant') && chron.includes('你答应了') && chron.includes('浇了水') && !chron.includes('稍后') && !chron.includes('没有答应'));
    const J = 'Je m\u2019appelle Alex.\n  Aujourd’hui : un chat secret 🐈  ';
    await page.fill('#journal', J);
    await shot(page, '09-diary.png');
    await tap(page, '#btnDiarySave');
    check('Complete interaction', 'episode completes to end screen', await page.isVisible('#endCard'));
    await shot(page, '10-end.png');
    // reopen: everything retained
    await page.reload(); await page.waitForFunction(() => A411.Audio.status !== 'unknown');
    s = await st(page);
    check('Persistence', 'after reload: journal verbatim, plant, choice, attempts, status', s.diary.journal[0].original === J && s.plant.careState === 'watered' && s.world.choices.d1_secret === 'keep' && s.progress.status === 'complete' && s.learning.attempts.length >= 15, { journalVerbatim: s.diary.journal[0].original === J, attempts: s.learning.attempts.length });
    await tap(page, '#btnDiary');
    check('Persistence', 'diary view shows journal verbatim', (await page.textContent('.journal-original')) === J);
    await tap(page, '.sheet .head button');
    // summary
    await tap(page, '#btnSummary');
    await page.fill('#summaryNote', 'Test note: 第 2 句听不清');
    const summary = await page.inputValue('#summaryText');
    check('Privacy', 'summary excludes private journal text and nickname by default', !summary.includes('chat secret') && !summary.includes('Alex') && summary.includes('私人日记：未包含'), null);
    check('Learning validity', 'summary reports the self-introduction as supported (help was used) and journal writing separately', summary.includes('自我介绍（打字）：完整句型') && /自我介绍.*有提示/.test(summary) && summary.includes('日记写作'));
    check('Usable entry', 'summary carries version/episode/evidence/help/note', ['0.1.1', 'L’Appartement 411', 'Day 1', '小练习', '使用的帮助', 'Test note'].every(k => summary.includes(k)));
    await tap(page, '#btnCopySummary');
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e.message));
    const shownNow = await page.inputValue('#summaryText');
    check('Usable entry', 'copy-to-clipboard copies the visible summary text', clip === shownNow && clip.includes('Test note'), clip.slice(0, 40));
    fs.writeFileSync(path.join(EV, 'sample-feedback-summary.txt'), summary + '\n');
    await shot(page, '11-summary.png');
    await tap(page, '.sheet .head button');
    // export
    await tap(page, '#btnSave');
    const [dl] = await Promise.all([page.waitForEvent('download'), tap(page, '#btnExport')]);
    const exportPath = path.join(EV, 'test-export-synthetic.json');
    await dl.saveAs(exportPath);
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    check('Recovery', 'export downloads valid JSON with schema/app version', exported.schemaVersion === 1 && exported.appVersion === '0.1.1' && dl.suggestedFilename().startsWith('appartement-411-save-'), dl.suggestedFilename());
    // bad imports on the existing save
    const before = await raw(page);
    const badFile = path.join(EV, '..', 'tests', 'fixtures', 'bad-truncated.json');
    await page.setInputFiles('#importFile', badFile); await page.waitForSelector('#importMsg.banner');
    const m1 = await page.textContent('#importMsg');
    await page.fill('#importText', JSON.stringify({ ...exported, progress: { ...exported.progress, scene: 'nowhere' } }));
    await tap(page, '#btnImportText');
    const m2 = await page.textContent('#importMsg');
    check('Recovery', 'malformed import rejected, existing save byte-identical', (await raw(page)) === before && m1.includes('没有导入') && m2.includes('没有导入'), { m1: m1.slice(0, 60), m2: m2.slice(0, 80) });
    await shot(page, '12-bad-import-rejected.png');
    check('Mobile presentation', 'no JS errors during main path', page.errors.length === 0, page.errors);
    check('Privacy', 'no network requests (local only)', page.requests.every(u => u.startsWith('file://')), page.requests.filter(u => !u.startsWith('file://')));
    await ctx.close();

    // round trip into a fresh browser profile
    const B = await newPage();
    await tap(B.page, '#btnSave');
    await B.page.setInputFiles('#importFile', exportPath); await B.page.waitForSelector('#importMsg.banner, #versionFooter');
    const imported = await st(B.page);
    const strip = x => { const c = JSON.parse(JSON.stringify(x)); delete c.updatedAt; delete c.meta.audio.checkedAt; return c; };
    check('Recovery', 'export → import round trip into fresh profile is lossless', imported && JSON.stringify(strip(imported)) === JSON.stringify(strip(exported)));
    await B.ctx.close();
  }

  // ================= B. Voice-available path (injected fake fr-FR voice) — checks play/replay recording & probe cues =================
  {
    const { ctx, page } = await newPage({ init: FAKE_VOICE });
    const a = await page.evaluate(() => ({ s: A411.Audio.status, v: A411.Audio.voiceName }));
    check('Audio', '[simulated voice] fr-FR voice detected and used', a.s === 'available', a);
    await tap(page, '#btnStart'); await tap(page, '#btnBaselineSkip'); await tap(page, '#btnKnock');
    await page.waitForFunction(() => document.querySelector('#audioState') && document.querySelector('#audioState').textContent.includes('已播放'));
    await tap(page, '#btnReplay'); await page.waitForTimeout(400);
    await shot(page, '13-doorway-voice-played.png');
    await lineNext(page);
    let s = await st(page);
    const ex = s.learning.attempts.find(x => x.context && x.context.includes('cam_bonjour'));
    check('Audio', '[simulated voice] playback + replay recorded (audioStatus=played, replays=1)', ex && ex.audioStatus === 'played' && ex.replays === 1 && ex.modality === 'listening+reading', ex);
    check('Learning validity', 'baseline skip recorded', s.learning.baseline.status === 'skipped');
    // jump to probe via a crafted state (keeps test short): set scene to probe intro
    await page.evaluate(() => { const x = A411.App.state(); x.progress.scene = 'probe'; x.progress.step = 0; A411.App.persist('test'); });
    await page.reload(); await page.waitForFunction(() => A411.Audio.status === 'available');
    await tap(page, '#btnContinue'); await tap(page, '#btnProbeStart');
    await page.waitForTimeout(400);
    const leak = await page.evaluate(() => { const h = document.getElementById('screen').innerHTML; return { appelle: /appelle/i.test(h), comment: /comment/i.test(h), names: /Camille|Noé/.test(h), portraitsMarker: false }; });
    check('Learning validity', 'probe DOM contains no stimulus text, names or translation before help', !leak.appelle && !leak.comment && !leak.names, leak);
    await shot(page, '14-probe-neutral-voice.png');
    const answerFor = async () => { const x = await st(page); const id = x.progress.probe.order[x.progress.probe.index]; return /intro/.test(id) ? 'tells' : 'asks'; };
    await tap(page, `[data-option="${await answerFor()}"]`); await page.waitForTimeout(400);
    await tap(page, '#btnPlay'); await page.waitForTimeout(400);
    await tap(page, `[data-option="${await answerFor()}"]`); await page.waitForTimeout(400);
    await tap(page, '#btnTrialSub');
    const shownText = await page.textContent('#stimulus');
    await tap(page, `[data-option="${await answerFor()}"]`); await page.waitForTimeout(400);
    await tap(page, `[data-option="${await answerFor()}"]`);
    s = await st(page);
    const t = s.learning.attempts.filter(x => x.evidenceKind === 'discrimination');
    const ok = t.length === 4 && t[0].resultType === 'independent' && t[0].modality === 'listening' && t[0].firstListen === true && t[0].audioStatus === 'played'
      && t[1].replays === 1 && t[1].firstListen === false && t[1].resultType === 'independent'
      && t[2].resultType === 'supported' && t[2].visibleSupport.subtitles === true && t[2].modality === 'listening+reading';
    check('Learning validity', 'first-listen / replay / text-help trials recorded distinctly; assisted not labelled independent', ok, t.map(x => [x.modality, x.resultType, x.replays, x.firstListen, x.correct]));
    check('Learning validity', 'help reveals text only on request', /appelle|comment/i.test(shownText));
    check('Audio', '[simulated voice] speech text uses plain apostrophes/spaces for TTS', (await page.evaluate(() => window.__spoken)).every(t => !/[\u2019\u00A0]/.test(t)));
    const spoken = await page.evaluate(() => window.__spoken);
    check('Audio', '[simulated voice] probe stimuli were sent to speech engine', spoken.length >= 5, spoken);
    await ctx.close();
  }

  // ================= C. Alternate choices path (at 375x667, smaller phone) =================
  {
    const { ctx, page } = await newPage({ ctx: { viewport: { width: 375, height: 667 } } });
    const ov = [];
    await tap(page, '#btnStart'); await tap(page, '#btnBaselineSkip');
    await tap(page, '#btnKnock'); await lineNext(page); await tap(page, '#greetWave');
    await lineNext(page); await lineNext(page); await lineNext(page);
    await lineNext(page); ov.push(await noOverflow(page)); ov.push((await touchTargetsOk(page)).length === 0); await tap(page, '#btnNameSkip');
    check('Complete interaction', '[alt] skipped name accepted; no name invented', (await page.textContent('.dialogue')).includes('没有追问'));
    await lineNext(page);
    await lineNext(page); await lineNext(page); await tap(page, '#btnWaterLater');
    await lineNext(page);
    await lineNext(page); await lineNext(page); await lineNext(page); await lineNext(page);
    await tap(page, '#secretDecline');
    check('Complete interaction', '[alt] decline reaction shown', (await page.textContent('#secretResult')).includes('担心'));
    let s = await st(page);
    check('Complete interaction', '[alt] decline saved, no promise credited, Camille unaware', s.world.choices.d1_secret === 'decline' && s.world.relationships.noe.secretPromise === 'declined' && s.world.knowledge.camille.knowsCat === false && s.world.knowledge.camille.playerName === null);
    check('Persistence', '[alt] plant stays thirsty, no care logged', s.plant.careState === 'thirsty' && s.plant.careLog.length === 0);
    await lineNext(page); await tap(page, '#btnProbeStart');
    ov.push(await noOverflow(page)); ov.push((await touchTargetsOk(page)).length === 0);
    for (let i = 0; i < 4; i++) await tap(page, '[data-option="unsure"]');
    await lineNext(page);
    ov.push(await noOverflow(page)); ov.push((await touchTargetsOk(page)).length === 0);
    check('Mobile presentation', '[375px] no horizontal overflow and all controls ≥44px (name, probe, diary screens)', ov.every(Boolean), ov);
    const chron = await page.textContent('#chronicle');
    check('Complete interaction', '[alt] chronicle reflects the actual alternate events', chron.includes('暂时不说') && chron.includes('稍后') && chron.includes('没有答应') && !chron.includes('你答应了') && !chron.includes('浇了水'));
    await tap(page, '#btnDiarySave');
    s = await st(page);
    check('Complete interaction', '[alt] empty journal allowed; nothing fabricated', s.diary.journal.length === 0 && s.progress.status === 'complete');
    // quick-visit plant care from title (once per day)
    await tap(page, '#btnEndHome'); await tap(page, '#btnTitleWater'); await tap(page, '#btnTitleWater');
    s = await st(page);
    check('Persistence', '[alt] title quick-visit watering counted once', s.plant.careLog.length === 1 && s.plant.careState === 'watered');
    check('Mobile presentation', '[alt] no JS errors', page.errors.length === 0, page.errors);
    await ctx.close();
  }

  // ================= D. v0 migration on load =================
  {
    const v0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'save-v0-synthetic.json'), 'utf8'));
    const { ctx, page } = await newPage();
    await page.evaluate((v) => { localStorage.clear(); localStorage.setItem('a411.save', JSON.stringify(v)); }, v0);
    await page.reload(); await page.waitForFunction(() => A411.Audio.status !== 'unknown');
    const s = await st(page);
    const backups = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('a411.backup.')).map(k => [k, localStorage.getItem(k)]));
    const bk = backups.find(([k]) => k.includes('pre-migration-v0'));
    check('Recovery', 'v0 save migrated to schema 1 with original backed up first', s.schemaVersion === 1 && s.meta.migratedFrom === 0 && bk && JSON.stringify(JSON.parse(bk[1])) === JSON.stringify(v0));
    check('Recovery', 'v0 data preserved (scene, plant, choice, journal verbatim, attempts unknown-type)', s.progress.scene === 'plant' && s.plant.careLog.length === 1 && s.plant.lastCareAt === new Date(v0.wateredAt).toISOString() && s.plant.careState === 'thirsty' /* 2023 care -> thirsty now (recoverable) */ && s.world.choices.d1_secret === 'keep' && s.diary.journal[0].original === v0.journal && s.learning.attempts.every(a => a.resultType === 'unknown'));
    check('Recovery', 'migration notice shown to player', (await page.textContent('#screen')).includes('旧存档 (v0) 已升级'));
    await tap(page, '#btnContinue');
    check('Recovery', 'migrated save is playable (resumes in plant scene)', (await page.textContent('#lineBody')).includes('C’est ta plante'));
    await shot(page, '15-v0-migrated-resume.png');
    await ctx.close();
  }

  // ================= D2. Rename (Appartement 404 -> L’Appartement 411): old saves survive =================
  {
    // (1) The real v0.1.0 build (frozen copy of dist/appartement-404.html) writes a save under a404.save;
    //     the new build in the same origin (file:// here; on GitHub Pages both repo paths share
    //     aaronchu903-png.github.io) must adopt it.
    const LEGACY_URL = 'file://' + path.join(ROOT, 'tests', 'fixtures', 'legacy-v0.1.0-appartement-404.html');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-CN' });
    const old = await ctx.newPage(); old.errors = []; old.on('pageerror', e => old.errors.push(e.message));
    await old.goto(LEGACY_URL);
    await old.waitForFunction(() => window.A404 && A404.Audio && A404.Audio.status !== 'unknown', null, { timeout: 8000 });
    await old.evaluate(() => localStorage.clear()); await old.reload();
    await old.waitForFunction(() => window.A404 && A404.Audio && A404.Audio.status !== 'unknown');
    await tap(old, '#btnStart'); await tap(old, '#btnBaselineSkip'); await tap(old, '#btnKnock');
    await lineNext(old); await tap(old, '#greetSalut'); await old.waitForSelector('#speakerTag'); await lineNext(old);
    const oldRaw = await old.evaluate(() => localStorage.getItem('a404.save'));
    const oldSave = JSON.parse(oldRaw);
    const oldLine = await old.textContent('#lineBody');
    check('Recovery', '[rename] real v0.1.0 build wrote its save under a404.save', !!oldRaw && oldSave.appVersion === '0.1.0' && old.errors.length === 0, { scene: oldSave.progress.scene, step: oldSave.progress.step });
    await old.close();
    const pg = await ctx.newPage(); pg.errors = []; pg.on('pageerror', e => pg.errors.push(e.message));
    await pg.goto(URL_DIST);
    await pg.waitForFunction(() => window.A411 && A411.Audio && A411.Audio.status !== 'unknown', null, { timeout: 8000 });
    const ls = await pg.evaluate(() => ({ a411: localStorage.getItem('a411.save'), a404: localStorage.getItem('a404.save'),
      bk: Object.keys(localStorage).filter(k => k.startsWith('a411.backup.') && k.includes('pre-rename-a404')).map(k => localStorage.getItem(k)) }));
    const ns = JSON.parse(ls.a411 || 'null');
    check('Recovery', '[rename] new build adopted the old save into a411.save (same saveId/scene/step), verbatim backup of a404.save made first',
      ns && ns.saveId === oldSave.saveId && ns.progress.scene === oldSave.progress.scene && ns.progress.step === oldSave.progress.step && ls.bk.length === 1 && ls.bk[0] === ls.a404 && JSON.parse(ls.a404).saveId === oldSave.saveId,
      { scene: ns && ns.progress.scene, step: ns && ns.progress.step });
    check('Recovery', '[rename] player is told the old save was kept', (await pg.textContent('#screen')).includes('改名前'));
    await tap(pg, '#btnContinue');
    check('Recovery', '[rename] resumes at the exact line the old build was on', (await pg.textContent('#lineBody')) === oldLine, oldLine.slice(0, 60));
    await shot(pg, '18-rename-old-save-resumed.png');
    await pg.reload(); await pg.waitForFunction(() => A411.Audio.status !== 'unknown');
    check('Recovery', '[rename] old a404.save never modified by the new build', (await pg.evaluate(() => localStorage.getItem('a404.save'))) === ls.a404);
    check('Recovery', '[rename] after reload: no repeat migration, no notice', !(await pg.textContent('#screen')).includes('改名前') &&
      (await pg.evaluate(() => Object.keys(localStorage).filter(k => k.includes('pre-rename-a404')).length)) === 1);
    check('Mobile presentation', '[rename] no JS errors', pg.errors.length === 0, pg.errors);
    await ctx.close();

    // (2) An old exported file (appartement-404-save-*.json from v0.1.0) imports through the UI.
    const B = await newPage();
    await tap(B.page, '#btnSave');
    const oldExport = path.join(ROOT, 'tests', 'fixtures', 'export-v0.1.0-appartement-404.json');
    await B.page.setInputFiles('#importFile', oldExport); await B.page.waitForSelector('#importMsg.banner, #versionFooter');
    const imp = await st(B.page); const want = JSON.parse(fs.readFileSync(oldExport, 'utf8'));
    const strip2 = x => { const c = JSON.parse(JSON.stringify(x)); delete c.updatedAt; delete c.meta.audio.checkedAt; delete c.meta.audio.status; delete c.meta.audio.voice; return c; };
    check('Recovery', '[rename] old v0.1.0 exported file imports losslessly via the 存档 panel', imp && JSON.stringify(strip2(imp)) === JSON.stringify(strip2(want)) && imp.diary.journal[0].original === want.diary.journal[0].original);
    check('Mobile presentation', '[rename] no JS errors on old-file import', B.page.errors.length === 0, B.page.errors);
    await B.ctx.close();
  }

  // ================= E. Errors never trap the player =================
  {
    const { ctx, page } = await newPage();
    await tap(page, '#btnStart'); await tap(page, '#btnBaselineSkip'); await tap(page, '#btnKnock');
    await page.evaluate(() => setTimeout(() => { throw new Error('synthetic test error'); }, 0));
    await page.waitForSelector('.sheet >> text=出了点问题');
    await shot(page, '16-error-recovery.png');
    await page.locator('button', { hasText: '重新载入当前步骤' }).click();
    check('Complete interaction', 'injected runtime error shows recovery sheet and play continues at same step', (await page.textContent('#lineBody')).includes('Bonjour'));
    await ctx.close();
  }

  // ================= F. Single-file dist build =================
  if (fs.existsSync(URL_DIST.replace('file://', ''))) {
    const { ctx, page } = await newPage({ url: URL_DIST });
    await tap(page, '#btnStart'); await tap(page, '#btnBaselineSkip'); await tap(page, '#btnKnock');
    const ok = (await page.textContent('#lineBody')).includes('Bonjour');
    await page.reload(); await page.waitForFunction(() => A411.Audio.status !== 'unknown');
    const resume = (await page.textContent('#btnContinue')).includes('门口');
    check('Usable entry', 'dist/appartement-411.html (single file) plays and resumes from file://', ok && resume && page.errors.length === 0);
    check('Usable entry', 'single file makes no external requests', page.requests.every(u => u === URL_DIST), page.requests);
    await ctx.close();
  } else check('Usable entry', 'dist single file exists', false, 'run npm run build first');
} catch (e) {
  check('Harness', 'e2e run completed without exception', false, String(e && e.stack || e));
} finally {
  await browser.close();
  const summary = { env, passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results };
  fs.writeFileSync(path.join(EV, 'e2e-results.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed} passed, ${summary.failed} failed`);
  process.exitCode = summary.failed ? 1 : 0;
}
