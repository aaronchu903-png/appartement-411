// Run: npm test   (node:test, no dependencies). Synthetic fixtures only — no real learner records.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/content.js');
const L = require('../js/logic.js');

function memLS(failWrites) {
  const m = new Map();
  return {
    get length() { return m.size; }, key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (failWrites && failWrites(k)) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => m.delete(k), _m: m
  };
}
const V0 = { v: 0, scene: 'plant', name: 'Mimi', watered: true, wateredAt: 1696000000000, secret: 'keep',
  journal: "Je m'appelle Mimi.\n  j'aime  le chat ", attempts: [{ phrase: "Tu t'appelles comment ?", ok: true, t: 1696000000000 }] };

test('new save validates; version fields present', () => {
  const s = L.newSave();
  assert.deepEqual(L.validateSave(s), { ok: true, errors: [] });
  assert.equal(s.schemaVersion, 1); assert.equal(s.appVersion, L.APP_VERSION); assert.equal(s.contentVersion, C.CONTENT_VERSION);
});

test('malformed imports are rejected', () => {
  const bad = ['', 'not json', '[]', '{}', JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify(Object.assign(L.newSave(), { progress: { episode: 1, scene: 'nowhere', step: 0, status: 'in_progress' } })),
    JSON.stringify(Object.assign(L.newSave(), { plant: { careState: 'watered', careLog: [{ actionId: 'd1.water' }, { actionId: 'd1.water' }] } })),
    (() => { const s = L.newSave(); s.learning.attempts.push({ target: 'x' }); return JSON.stringify(s); })(),
    'x'.repeat(1000001)];
  for (const t of bad) assert.equal(L.parseImport(t).ok, false, 'should reject: ' + t.slice(0, 60));
});

test('import failure leaves existing save byte-identical', () => {
  const ls = memLS(); const st = L.createStorage(ls);
  const s = L.newSave(); s.player.nickname = 'Keep'; assert.ok(st.write(s).ok);
  const before = ls.getItem(L.KEY);
  const r = st.importText('{"schemaVersion":1,"broken":true}', s);
  assert.equal(r.ok, false);
  assert.equal(ls.getItem(L.KEY), before);
  assert.equal(st.listBackups().length, 0, 'no backup churn on rejected import');
});

test('export/import round trip preserves everything and backs up current first', () => {
  const ls = memLS(); const st = L.createStorage(ls);
  const a = L.newSave(); a.progress.scene = 'cat'; a.progress.step = 3; L.waterPlant(a, 'd1.water', 'plant');
  a.diary.journal.push({ id: 'j1', at: L.nowISO(), original: '  Je m’appelle Zoé.\n😊 ', usedTemplate: false, suggestedRewrite: null, share: false });
  const exported = JSON.stringify(a, null, 2);
  const cur = L.newSave(); st.write(cur);
  const r = st.importText(exported, cur);
  assert.equal(r.ok, true);
  const loaded = st.load().save;
  const strip = x => { const c = JSON.parse(JSON.stringify(x)); delete c.updatedAt; return c; };
  assert.deepEqual(strip(loaded), strip(a));
  assert.equal(loaded.diary.journal[0].original, '  Je m’appelle Zoé.\n😊 ');
  assert.equal(st.listBackups().filter(b => b.label === 'pre-import').length, 1);
});

test('v0 migration: backup first, data mapped honestly, journal verbatim', () => {
  const ls = memLS(); ls.setItem(L.KEY, JSON.stringify(V0));
  const st = L.createStorage(ls);
  const r = st.load(new Date('2026-10-08T12:00:00Z'));
  assert.ok(r.save); assert.equal(r.save.schemaVersion, 1); assert.equal(r.save.meta.migratedFrom, 0);
  const bk = st.listBackups().find(b => b.label === 'pre-migration-v0');
  assert.ok(bk, 'backup exists'); assert.deepEqual(JSON.parse(ls.getItem(bk.key)), V0, 'backup is the original v0');
  assert.equal(r.save.progress.scene, 'plant');
  assert.equal(r.save.plant.careState, 'watered'); assert.equal(r.save.plant.careLog.length, 1);
  assert.equal(r.save.world.choices.d1_secret, 'keep');
  assert.equal(r.save.world.knowledge.camille.knowsCat, false);
  assert.equal(r.save.diary.journal[0].original, V0.journal);
  const a = r.save.learning.attempts[0];
  assert.equal(a.target, 'tu_tappelles_comment'); assert.equal(a.resultType, 'unknown', 'never relabelled independent'); assert.equal(a.audioStatus, 'unknown');
  assert.equal(JSON.parse(ls.getItem(L.KEY)).schemaVersion, 1, 'migrated save written');
});

test('v0 via import also works; future schema rejected', () => {
  assert.equal(L.parseImport(JSON.stringify(V0)).ok, true);
  assert.equal(L.parseImport(JSON.stringify(V0)).migratedFrom, 0);
  const f = L.newSave(); f.schemaVersion = 2;
  assert.equal(L.parseImport(JSON.stringify(f)).ok, false);
});

test('failure-safe write: failed write keeps previous save; corrupt main recovers from tmp or is backed up', () => {
  let fail = false; const ls = memLS(k => fail && k === L.KEY);
  const st = L.createStorage(ls);
  const s1 = L.newSave(); s1.progress.scene = 'plant'; assert.ok(st.write(s1).ok);
  const before = ls.getItem(L.KEY);
  fail = true; const s2 = L.clone(s1); s2.progress.scene = 'cat';
  assert.equal(st.write(s2).ok, false);
  assert.equal(ls.getItem(L.KEY), before, 'main untouched');
  // tmp holds the newer complete copy -> corrupt main recovers from it
  fail = false; ls.setItem(L.KEY, '{corrupt');
  const r = st.load(); assert.equal(r.save.progress.scene, 'cat'); assert.ok(st.listBackups().some(b => b.label === 'corrupt-main'));
  // corrupt main and no tmp -> start fresh but corrupt data preserved as backup
  const ls2 = memLS(); ls2.setItem(L.KEY, 'garbage'); const st2 = L.createStorage(ls2);
  const r2 = st2.load(); assert.equal(r2.save, null); assert.equal(ls2.getItem(st2.listBackups()[0].key), 'garbage');
});

test('invalid in-memory save is never written', () => {
  const ls = memLS(); const st = L.createStorage(ls);
  const s = L.newSave(); s.progress.scene = 'bogus';
  assert.equal(st.write(s).ok, false); assert.equal(ls.getItem(L.KEY), null);
});

test('plant: one care action cannot be counted twice; thirst returns after 48h', () => {
  const s = L.newSave(); const t0 = new Date('2026-10-08T10:00:00Z');
  assert.equal(L.waterPlant(s, 'd1.water', 'plant', t0).counted, true);
  assert.equal(L.waterPlant(s, 'd1.water', 'plant', t0).counted, false);
  assert.equal(s.plant.careLog.length, 1);
  assert.equal(L.plantStatus(s.plant, new Date('2026-10-09T10:00:00Z')), 'watered');
  assert.equal(L.plantStatus(s.plant, new Date('2026-10-10T11:00:00Z')), 'thirsty');
});

test('secret choice saved; Camille gains no knowledge; choice not silently redone', () => {
  for (const ch of ['keep', 'decline']) {
    const s = L.newSave(); const camBefore = JSON.stringify(s.world.knowledge.camille);
    assert.equal(L.applySecretChoice(s, ch), true);
    assert.equal(s.world.choices.d1_secret, ch);
    assert.equal(s.world.relationships.noe.secretPromise, ch === 'keep' ? 'kept' : 'declined');
    assert.equal(JSON.stringify(s.world.knowledge.camille), camBefore);
    assert.equal(L.applySecretChoice(s, ch === 'keep' ? 'decline' : 'keep'), false);
    assert.equal(s.world.choices.d1_secret, ch);
  }
});

test('name response classification (no gender inference, nickname-only is not full structure)', () => {
  const c = L.classifyNameResponse;
  assert.equal(c('').kind, 'skipped'); assert.equal(c('   ').kind, 'skipped');
  assert.deepEqual(c('Je m’appelle Alex.'), { kind: 'full_structure', exactForm: true, nickname: 'Alex' });
  assert.equal(c("je mapelle Kiki").kind, 'full_structure'); assert.equal(c("je mapelle Kiki").exactForm, false);
  assert.equal(c('Salut ! Je m\'appelle Lou').nickname, 'Lou');
  assert.equal(c('Alex').kind, 'nickname_only'); assert.equal(c('Alex').nickname, 'Alex');
  assert.equal(c("Moi, c'est Max").kind, 'moi_cest');
  assert.equal(c('je ne sais pas quoi dire ici').kind, 'other_sentence');
  for (const k of Object.keys(c('Je m’appelle Alex.'))) assert.ok(!/gender|sexe/i.test(k));
});

test('probe result type: any visible text/translation => supported; reading mode is not listening', () => {
  assert.equal(L.probeResultType({}), 'independent');
  assert.equal(L.probeResultType({ subtitlesShown: true }), 'supported');
  assert.equal(L.probeResultType({ chineseShown: true }), 'supported');
  assert.equal(L.probeModality('played', false), 'listening');
  assert.equal(L.probeModality('played', true), 'listening+reading');
  assert.equal(L.probeModality('unavailable', false), 'reading');
  assert.equal(L.probeModality('failed', false), 'reading');
});

test('probe content: balanced tells/asks, ≥2 speakers per function, curriculum phrases only', () => {
  const items = C.PROBE.items.map(id => C.LINES[id]);
  assert.equal(items.filter(i => i.func === 'tells').length, 2); assert.equal(items.filter(i => i.func === 'asks').length, 2);
  assert.equal(new Set(items.filter(i => i.func === 'asks').map(i => i.speaker)).size, 2);
  const allowed = [/^Salut\u00A0! Je m’appelle (Camille|Noé)\.$/, /^Je m’appelle (Camille|Noé|Léa)\.$/, /^Tu t’appelles comment\u00A0\?$/];
  for (const i of items) assert.ok(allowed.some(r => r.test(i.fr)), i.fr);
});

test('support recommendation: two independent successes in distinct contexts -> one-level trial reduction; help/difficulty restores', () => {
  const mk = (o) => L.makeAttempt(Object.assign({ target: 'je_mappelle', modality: 'listening', resultType: 'independent', correct: true }, o));
  assert.equal(L.recommendSupport([mk({ context: 'a' })], 'je_mappelle', 'listening', 3).level, 3);
  assert.equal(L.recommendSupport([mk({ context: 'a' }), mk({ context: 'a' })], 'je_mappelle', 'listening', 3).level, 3);
  assert.equal(L.recommendSupport([mk({ context: 'a' }), mk({ context: 'b' })], 'je_mappelle', 'listening', 3).level, 2);
  assert.equal(L.recommendSupport([mk({ context: 'a' }), mk({ context: 'b' }), mk({ context: 'c', correct: false })], 'je_mappelle', 'listening', 2).level, 3);
  assert.equal(L.recommendSupport([mk({ context: 'a' }), mk({ context: 'b', resultType: 'supported' })], 'je_mappelle', 'listening', 2).level, 2);
});

test('chronicle contains only encountered events, no duplicates', () => {
  const s = L.newSave();
  L.recordEvent(s, 'arrived'); L.recordEvent(s, 'met_camille'); L.recordEvent(s, 'met_camille');
  assert.deepEqual(s.diary.chronicle.map(c => c.eventId), ['arrived', 'met_camille']);
  assert.ok(!s.diary.chronicle.some(c => c.eventId === 'met_croissant'));
  L.applyName(s, { kind: 'skipped', nickname: null }, '');
  assert.match(L.chronicleText(s.diary.chronicle[2]), /暂时不说/);
});

test('feedback summary excludes journal text and nickname by default; includes only explicitly shared entries on request', () => {
  const s = L.newSave(); s.player.nickname = 'SecretNick';
  s.diary.journal.push({ id: 'j1', at: L.nowISO(), original: 'PRIVATE-LINE-123', usedTemplate: false, suggestedRewrite: null, share: false });
  s.diary.journal.push({ id: 'j2', at: L.nowISO(), original: 'SHARED-LINE-456', usedTemplate: false, suggestedRewrite: null, share: true });
  const def = L.buildSummary(s, { note: 'son trop bas' });
  assert.ok(!def.includes('PRIVATE-LINE-123')); assert.ok(!def.includes('SHARED-LINE-456')); assert.ok(!def.includes('SecretNick'));
  assert.ok(def.includes(L.APP_VERSION)); assert.ok(def.includes('L’Appartement 411')); assert.ok(def.includes('son trop bas'));
  const inc = L.buildSummary(s, { includeJournal: true });
  assert.ok(inc.includes('SHARED-LINE-456')); assert.ok(!inc.includes('PRIVATE-LINE-123'));
});

test('review entries carry target, modality, recent evidence, next encounter and support recommendation', () => {
  const s = L.newSave();
  s.learning.attempts.push(L.makeAttempt({ target: 'je_mappelle', modality: 'listening', resultType: 'independent', correct: true, context: 'x' }));
  const r = L.buildReview(s, new Date('2026-10-08T00:00:00Z'));
  assert.equal(r.length, 1);
  for (const k of ['target', 'modality', 'recentEvidence', 'nextEncounter', 'supportRecommendation']) assert.ok(k in r[0], k);
});

test('every scene step type and line reference is defined', () => {
  for (const [name, steps] of Object.entries(C.SCENES)) for (const st of steps) {
    if (st.line) assert.ok(C.LINES[st.line], name + ':' + st.line);
    if (st.event) assert.ok(C.CHRONICLE[st.event], st.event);
  }
  assert.equal(C.DAYS.filter(d => d.available).length, 1);
});

// ---------- Rename 2026-10-08: Appartement 404 (a404.*) -> L’Appartement 411 (a411.*) ----------
const fs = require('node:fs');
const path = require('node:path');
const OLD_EXPORT = fs.readFileSync(path.join(__dirname, 'fixtures', 'export-v0.1.0-appartement-404.json'), 'utf8');
const stripVolatile = x => { const c = JSON.parse(JSON.stringify(x)); delete c.updatedAt; delete c.meta.recovery; return c; };

test('rename: new keys are a411.*, legacy keys are a404.*', () => {
  assert.equal(L.KEY, 'a411.save'); assert.equal(L.TMP_KEY, 'a411.save.tmp'); assert.equal(L.BACKUP_PREFIX, 'a411.backup.');
  assert.equal(L.LEGACY_KEY, 'a404.save'); assert.equal(L.LEGACY_TMP_KEY, 'a404.save.tmp'); assert.equal(L.LEGACY_BACKUP_PREFIX, 'a404.backup.');
});

test('rename: an old a404.save (v0.1.0) is adopted: backup first, verified write to a411.save, original untouched', () => {
  const ls = memLS(); ls.setItem('a404.save', OLD_EXPORT);
  const order = []; const set = ls.setItem; ls.setItem = (k, v) => { order.push(k); set(k, v); };
  const st = L.createStorage(ls);
  const r = st.load();
  assert.ok(r.save, 'save loaded');
  assert.deepEqual(stripVolatile(r.save), stripVolatile(JSON.parse(OLD_EXPORT)), 'progress, choices, journal, attempts all preserved');
  assert.equal(r.save.diary.journal[0].original, JSON.parse(OLD_EXPORT).diary.journal[0].original, 'journal verbatim');
  assert.equal(ls.getItem('a404.save'), OLD_EXPORT, 'old key byte-identical (never deleted or rewritten)');
  assert.ok(ls.getItem('a411.save'), 'new key written');
  assert.deepEqual(stripVolatile(JSON.parse(ls.getItem('a411.save'))), stripVolatile(JSON.parse(OLD_EXPORT)));
  const bk = st.listBackups().find(b => b.label === 'pre-rename-a404');
  assert.ok(bk && ls.getItem(bk.key) === OLD_EXPORT, 'verbatim backup under the new prefix');
  assert.ok(order.indexOf(bk.key) < order.indexOf('a411.save'), 'backup written before the new save');
  assert.ok(r.save.meta.recovery.some(x => /a404\.save -> a411\.save/.test(x.action)), 'rename recorded in meta.recovery');
  assert.ok(r.notices.some(n => n.includes('改名前')), 'player is told');
  // second load reads the new key only; no further backups or notices
  const r2 = L.createStorage(ls).load();
  assert.equal(r2.notices.length, 0); assert.equal(st.listBackups().filter(b => b.label === 'pre-rename-a404').length, 1);
});

test('rename: if writing the new key fails, the old save is still loaded, kept intact, and adopted on the next load', () => {
  let fail = true;
  const ls = memLS(k => fail && k.startsWith('a411.save')); ls.setItem('a404.save', OLD_EXPORT);
  const r = L.createStorage(ls).load();
  assert.ok(r.save && r.save.player.nickname === 'Alex', 'still playable from memory');
  assert.ok(r.notices.some(n => n.includes('写入新位置失败')));
  assert.equal(ls.getItem('a404.save'), OLD_EXPORT); assert.equal(ls.getItem('a411.save'), null);
  fail = false;
  const r2 = L.createStorage(ls).load();
  assert.ok(r2.save && ls.getItem('a411.save')); assert.equal(ls.getItem('a404.save'), OLD_EXPORT);
});

test('rename: an existing a411.save wins over a404.save; legacy tmp-only and legacy v0 are adopted too', () => {
  const ls = memLS(); const cur = L.newSave(); cur.player.nickname = 'New'; L.createStorage(ls).write(cur);
  ls.setItem('a404.save', OLD_EXPORT);
  assert.equal(L.createStorage(ls).load().save.player.nickname, 'New');
  assert.equal(ls.getItem('a404.save'), OLD_EXPORT);

  const ls2 = memLS(); ls2.setItem('a404.save.tmp', OLD_EXPORT);
  const r2 = L.createStorage(ls2).load();
  assert.equal(r2.save.player.nickname, 'Alex'); assert.ok(ls2.getItem('a411.save')); assert.equal(ls2.getItem('a404.save.tmp'), OLD_EXPORT);

  const ls3 = memLS(); ls3.setItem('a404.save', JSON.stringify(V0));
  const r3 = L.createStorage(ls3).load();
  assert.equal(r3.save.schemaVersion, 1); assert.equal(r3.save.player.nickname, 'Mimi'); assert.ok(ls3.getItem('a411.save'));
  assert.equal(ls3.getItem('a404.save'), JSON.stringify(V0));
});

test('rename: corrupt a404.save is backed up and not adopted; old key still untouched', () => {
  const ls = memLS(); ls.setItem('a404.save', '{"schemaVersion":1,"trunc');
  const st = L.createStorage(ls); const r = st.load();
  assert.equal(r.save, null); assert.equal(ls.getItem('a404.save'), '{"schemaVersion":1,"trunc');
  assert.ok(st.listBackups().some(b => b.label === 'corrupt-main'));
});

test('rename: old a404.backup.* entries are listed (restorable) but never pruned', () => {
  const ls = memLS(); ls.setItem('a404.backup.1000.pre-import', OLD_EXPORT);
  const st = L.createStorage(ls);
  for (let i = 0; i < 8; i++) st.backup('t' + i, '{}');
  const all = st.listBackups();
  assert.equal(all.filter(b => !b.legacy).length, 5);
  const old = all.find(b => b.legacy);
  assert.ok(old && old.key === 'a404.backup.1000.pre-import' && ls.getItem(old.key) === OLD_EXPORT);
  assert.ok(st.importText(st.readBackup(old.key), null).ok, 'legacy backup restorable');
});

test('rename: an old exported file (appartement-404-save-*.json, v0.1.0) imports losslessly', () => {
  const ls = memLS(); const st = L.createStorage(ls);
  const cur = L.newSave(); st.write(cur);
  const r = st.importText(OLD_EXPORT, cur);
  assert.equal(r.ok, true); assert.equal(r.migratedFrom, null);
  const loaded = st.load().save;
  const strip = x => { const c = JSON.parse(JSON.stringify(x)); delete c.updatedAt; return c; };
  assert.deepEqual(strip(loaded), strip(JSON.parse(OLD_EXPORT)));
  assert.equal(loaded.appVersion, '0.1.0', 'origin version kept honestly');
});

test('v0.1.2: attempts carry the voice/rate that actually played; summary reports it honestly', () => {
  const s = L.newSave();
  s.meta.audio = { engine: 'speechSynthesis', status: 'available', voice: 'Marie (fr-FR)', voices: { camille: 'Marie (fr-FR)', noe: 'Thomas (fr-FR)' },
    quality: { camille: 'standard', noe: 'standard' }, distinctVoices: true, rate: 0.9, frenchVoiceCount: 7, checkedAt: null };
  s.learning.attempts.push(L.makeAttempt({ target: 'bonjour', modality: 'listening', audioStatus: 'played', audioVoice: { name: 'Marie (fr-FR)', quality: 'standard', rate: 0.9, pitch: 1 }, resultType: 'exposure' }));
  s.learning.attempts.push(L.makeAttempt({ target: 'salut', modality: 'reading', audioStatus: 'unavailable', resultType: 'exposure' }));
  s.learning.attempts.push(L.makeAttempt({ target: 'salut', modality: 'listening', audioStatus: 'played', resultType: 'exposure' })); // pre-0.1.2 style
  assert.deepEqual(s.learning.attempts[0].audioVoice, { name: 'Marie (fr-FR)', quality: 'standard', rate: 0.9, pitch: 1 });
  assert.equal(s.learning.attempts[1].audioVoice, null);
  assert.equal(L.validateSave(s).ok, true);
  const sum = L.buildSummary(s, {});
  assert.match(sum, /Camille=Marie \(fr-FR\)（标准）· Noé=Thomas \(fr-FR\)（标准）/);
  assert.match(sum, /语速 0\.9/);
  assert.match(sum, /成功 2（录音 0 · 设备声音 1 · 旧版未记录来源 1） · 失败\/不可用 1/);
  assert.match(sum, /Marie \(fr-FR\)（标准，语速 0\.9） ×1/);
  assert.match(sum, /未记录声音（v0\.1\.1 及以前） ×1/);
  assert.equal(L.APP_VERSION, '0.1.3');
});

test('v0.1.2: a v0.1.1 save (no audioVoice fields, speechRate 0.85) still validates unchanged', () => {
  const fs = require('node:fs'), path = require('node:path');
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'export-v0.1.0-appartement-404.json'), 'utf8'));
  const r = L.parseImport(JSON.stringify(old));
  assert.equal(r.ok, true);
  assert.equal(r.save.settings.speechRate, old.settings.speechRate);
});

// ---------- v0.1.3: fixed Qwen3-TTS recordings ----------
test('v0.1.3: clip map covers every Day 1 line id, each file exists and is a non-empty mp3', () => {
  const fs = require('node:fs'), path = require('node:path');
  delete require.cache[require.resolve('../js/clips.js')];
  const CL = require('../js/clips.js');
  assert.equal(CL.source, 'recording:qwen3-tts');
  assert.match(CL.credit, /Qwen3-TTS \(Apache-2\.0\), synthetic designed voices/);
  const missing = Object.keys(C.LINES).filter(id => !CL.files[id]);
  assert.deepEqual(missing, [], 'every spoken Day 1 line has a recording');
  for (const id of Object.keys(CL.files)) {
    const f = path.join(__dirname, '..', CL.files[id]);
    const b = fs.readFileSync(f);
    assert.ok(b.length > 1000, id + ' size');
    assert.ok(b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), id + ' is mp3');
  }
  assert.ok(CL.files.test_camille && CL.files.test_noe, 'settings test lines recorded too');
});

test('v0.1.3: attempts carry audioSource; default none; content version bumped, text unchanged', () => {
  const a = L.makeAttempt({ target: 'bonjour', modality: 'listening', audioStatus: 'played', audioSource: 'recording:qwen3-tts', resultType: 'exposure' });
  assert.equal(a.audioSource, 'recording:qwen3-tts');
  assert.equal(L.makeAttempt({ target: 'bonjour' }).audioSource, 'none');
  assert.equal(C.CONTENT_VERSION, 'd1-2026-10-08c');
  assert.equal(C.LINES.cam_intro.fr, 'Salut\u00A0! Je m\u2019appelle Camille.');
  const s = L.newSave();
  s.meta.audio = { status: 'unavailable', recordings: { source: 'recording:qwen3-tts', lines: 17 } };
  s.learning.attempts.push(a);
  s.learning.attempts.push(L.makeAttempt({ target: 'salut', modality: 'listening', audioStatus: 'played', audioSource: 'device:Thomas (fr-FR)', audioVoice: { name: 'Thomas (fr-FR)', quality: 'standard', rate: 0.9, pitch: 1, source: 'device:Thomas (fr-FR)' } }));
  assert.equal(L.validateSave(s).ok, true);
  const sum = L.buildSummary(s, {});
  assert.match(sum, /固定录音：recording:qwen3-tts（Day 1 共 17 句）/);
  assert.match(sum, /成功 2（录音 1 · 设备声音 1）/);
});

test('v0.1.3: a v0.1.2 save (content 08b, no audioSource) still validates and imports unchanged', () => {
  const s = L.newSave();
  s.appVersion = '0.1.2'; s.contentVersion = 'd1-2026-10-08b';
  const at = L.makeAttempt({ target: 'bonjour', modality: 'listening', audioStatus: 'played', audioVoice: { name: 'Marie (fr-FR)', quality: 'standard', rate: 0.9, pitch: 1 }, contentVersion: 'd1-2026-10-08b' });
  delete at.audioSource; s.learning.attempts.push(at);
  const r = L.parseImport(JSON.stringify(s));
  assert.equal(r.ok, true);
  assert.equal(r.save.contentVersion, 'd1-2026-10-08b');
  assert.equal('audioSource' in r.save.learning.attempts[0], false);
  assert.match(L.buildSummary(r.save, {}), /成功 1（录音 0 · 设备声音 1）/);
});
