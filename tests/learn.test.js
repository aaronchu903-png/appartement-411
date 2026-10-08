// Scheduler, profiles, caps, seed validation. Synthetic data only — no real learner notes.
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/fsrs.js');
const Learn = require('../js/learn.js');
const Deck = require('../js/deck.js');
const Logic = require('../js/logic.js');

function memLS() {
  const m = new Map();
  return {
    get length() { return m.size; }, key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  };
}

test('FSRS-5 matches ts-fsrs 4.7.1 (fuzz off, short-term off)', () => {
  // Reference: ts-fsrs@4.7.1 generatorParameters({enable_fuzz:false, enable_short_term:false})
  // first ratings, then Good reviewed 3 days later.
  const first = F.preview({ stability: 0, difficulty: 0 }, 0);
  assert.deepEqual(first.map(x => [x.grade, x.stability, x.difficulty, x.scheduledDays]), [
    [1, 0.40255, 7.1949, 1],
    [2, 1.18385, 6.48830527, 2],
    [3, 3.173, 5.28243442, 3],
    [4, 15.69105, 3.22450159, 16]
  ]);
  const good = first[2];
  const second = F.preview({ stability: good.stability, difficulty: good.difficulty }, 3);
  assert.equal(second[0].stability, 1.05556109);
  assert.equal(second[0].difficulty, 6.79693258);
  assert.equal(second[0].scheduledDays, 1);
  assert.equal(second[2].stability, 10.73892592);
  assert.equal(second[2].scheduledDays, 11);
  assert.equal(second[3].scheduledDays, 26);
  assert.equal(F.W.length, 19);
  assert.match(F.SOURCE, /FSRS-5/);
});

test('modalities are separate cards', () => {
  const learn = Learn.emptyLearn('jinyi', new Date('2026-10-08T12:00:00Z'));
  const now = new Date('2026-10-08T12:00:00Z');
  Learn.ensureCard(learn, 'bonjour', 'listening');
  Learn.ensureCard(learn, 'bonjour', 'production');
  Learn.applyGrade(learn.cards['bonjour|listening'], 3, now);
  assert.equal(learn.cards['bonjour|production'].reps, 0);
  assert.equal(learn.cards['bonjour|listening'].reps, 1);
  assert.notEqual(learn.cards['bonjour|listening'].stability, learn.cards['bonjour|production'].stability);
});

test('no punitive backlog: overdue reviews are capped and the rest stay due', () => {
  const learn = Learn.emptyLearn('jinyi', new Date('2026-10-01T12:00:00Z'));
  learn.settings.reviewCap = 5;
  learn.settings.newCap = 2;
  const now = new Date('2026-10-08T12:00:00Z');
  for (let i = 0; i < 12; i++) {
    const id = Deck.ITEMS[i].id;
    const c = Learn.ensureCard(learn, id, 'listening');
    c.reps = 2; c.stability = 3; c.difficulty = 5; c.scheduledDays = 1;
    c.due = new Date('2026-10-02T12:00:00Z').toISOString();
    c.lastReview = new Date('2026-10-01T12:00:00Z').toISOString();
  }
  const q = Learn.buildQueue(learn, Deck, now);
  assert.equal(q.overdue, 12);
  assert.equal(q.queue.filter(x => !x.isNew).length, 5);
  assert.ok(q.queue.filter(x => x.isNew).length <= 2);
});

test('suggested rating: Good / Hard / Again, hints are not independent', () => {
  assert.equal(Learn.suggestRating({ correct: true, hints: 0, accent: false }), 3);
  assert.equal(Learn.suggestRating({ correct: true, hints: 1, accent: false }), 2);
  assert.equal(Learn.suggestRating({ correct: true, hints: 0, accent: true }), 2);
  assert.equal(Learn.suggestRating({ correct: false, hints: 2 }), 1);
  assert.equal(Learn.resultTypeOf({ correct: true, hints: 0, revealed: false }), 'independent');
  assert.equal(Learn.resultTypeOf({ correct: true, hints: 1, revealed: false }), 'supported');
});

test('accent-tolerant compare flags a missing accent and accepts alternates', () => {
  const a = Learn.checkAnswer('Elle parle mieux francais.', ['Elle parle mieux français.']);
  assert.equal(a.ok, true); assert.equal(a.accent, true);
  const b = Learn.checkAnswer('Elle parle mieux français.', ['Elle parle mieux français.']);
  assert.equal(b.ok, true); assert.equal(b.accent, false);
  const c = Learn.checkAnswer('Salut', ['Bonjour']);
  assert.equal(c.ok, false);
});

test('profiles do not share records', () => {
  const ls = memLS();
  const now = new Date('2026-10-08T15:00:00Z');
  const j = Learn.emptyLearn('jinyi', now);
  const y = Learn.emptyLearn('yuechao', now);
  Learn.ensureCard(j, 'bonjour', 'listening');
  Learn.applyGrade(j.cards['bonjour|listening'], 3, now);
  j.evidence.push({ itemId: 'bonjour', source: 'review' });
  assert.equal(Learn.saveLearn(ls, j).ok, true);
  assert.equal(Learn.saveLearn(ls, y).ok, true);
  const y2 = Learn.loadLearn(ls, 'yuechao').learn;
  const j2 = Learn.loadLearn(ls, 'jinyi').learn;
  assert.equal(Object.keys(y2.cards).length, 0);
  assert.equal(j2.cards['bonjour|listening'].reps, 1);
  assert.equal(y2.evidence.length, 0);
  assert.equal(j2.profileId, 'jinyi');
});

test('language setting is outside the learn record', () => {
  const ls = memLS();
  const learn = Learn.emptyLearn('jinyi', new Date());
  Learn.saveLearn(ls, learn);
  const before = ls.getItem(Learn.learnKey('jinyi'));
  assert.equal(Learn.getLang(ls, 'jinyi'), 'zh');
  Learn.setLang(ls, 'jinyi', 'en');
  assert.equal(Learn.getLang(ls, 'jinyi'), 'en');
  assert.equal(ls.getItem(Learn.learnKey('jinyi')), before);
  assert.equal(Learn.getLang(ls, 'yuechao'), 'zh');
});

test('legacy v0.1.3 save migrates into the chosen profile once, with a backup', () => {
  const ls = memLS();
  const old = Logic.newSave({ now: new Date('2026-10-08T12:00:00Z') });
  old.appVersion = '0.1.3';
  old.progress.scene = 'plant'; old.progress.step = 1;
  ls.setItem('a411.save', JSON.stringify(old));
  const r = Learn.adoptLegacy(ls, 'jinyi', Logic, new Date('2026-10-08T16:00:00Z'));
  assert.equal(r.adopted, true);
  const stored = JSON.parse(ls.getItem(Learn.storyKey('jinyi')));
  assert.equal(stored.saveId, old.saveId);
  assert.equal(stored.progress.scene, 'plant');
  assert.equal(ls.getItem('a411.legacyClaimed'), 'jinyi');
  const again = Learn.adoptLegacy(ls, 'yuechao', Logic, new Date());
  assert.equal(again.adopted, false);
  assert.equal(ls.getItem(Learn.storyKey('yuechao')), null);
  const backups = [];
  for (let i = 0; i < ls.length; i++) if (String(ls.key(i)).includes('pre-profile-adopt') || String(ls.key(i)).includes('pre-migration')) backups.push(ls.key(i));
  assert.ok(backups.length >= 1);
});

test('seed import is validated and does not touch the other profile', () => {
  const bad = Learn.validateSeed({ kind: 'nope' });
  assert.equal(bad.ok, false);
  const learn = Learn.emptyLearn('jinyi', new Date('2026-10-08T12:00:00Z'));
  const other = Learn.emptyLearn('yuechao', new Date('2026-10-08T12:00:00Z'));
  const seed = {
    kind: 'a411-personal-seed', schemaVersion: 1, forProfile: 'jinyi',
    cardStates: [{ id: 'bonjour', modality: 'listening', reps: 4, stability: 14, difficulty: 4, scheduledDays: 12, dueInDays: 10, priority: 1 }],
    privateCards: [{ id: 'private.example', fr: 'Exemple privé.', zh: '私人例句', en: 'A private example.', grammar: 'present', band: 'A2', speaker: 'camille', noteZh: '只在这份种子里', noteEn: 'only in this seed' }]
  };
  const wrong = Learn.importSeed(other, seed, Deck, new Date());
  assert.equal(wrong.ok, false);
  assert.equal(other.extraItems.length, 0);
  const ok = Learn.importSeed(learn, seed, Deck, new Date('2026-10-08T12:00:00Z'));
  assert.equal(ok.ok, true);
  assert.equal(learn.cards['bonjour|listening'].reps, 4);
  assert.equal(learn.extraItems.length, 1);
  assert.equal(learn.profileId, 'jinyi');
  const junk = Learn.importSeed(learn, { kind: 'a411-personal-seed', schemaVersion: 1, forProfile: 'jinyi', cardStates: 'nope' }, Deck, new Date());
  assert.equal(junk.ok, false);
  assert.equal(learn.cards['bonjour|listening'].reps, 4);
});

test('placement skip stays at A1; passing bands raises the track; a miss is not a penalty label', () => {
  const learn = Learn.emptyLearn('yuechao', new Date());
  assert.equal(learn.settings.placement, 'not_started');
  Learn.skipPlacement(learn);
  assert.equal(learn.settings.placement, 'skipped');
  assert.equal(learn.settings.track, 'A1');
  const l2 = Learn.emptyLearn('yuechao', new Date());
  const now = new Date();
  // two A1 correct, two A2 wrong -> stop, track A2 (passed A1)
  Learn.placementAnswer(l2, 'p.a1.bonjour', 'hi', {}, now);
  Learn.placementAnswer(l2, 'p.a1.name', 'tell', {}, now);
  Learn.placementAnswer(l2, 'p.a2.tense', 'fut', {}, now);
  const last = Learn.placementAnswer(l2, 'p.a2.mieux', 'name', {}, now);
  assert.equal(last.done, true);
  assert.equal(l2.settings.track, 'A2');
  assert.ok(l2.placementLog.every(x => x.resultType === 'baseline' || x.resultType === 'supported'));
  assert.equal(l2.placementLog.filter(x => x.correct === false).length, 2);
});

test('public deck has both languages and covers beginner plus Jinyi grammar areas', () => {
  assert.ok(Deck.ITEMS.length >= 120 && Deck.ITEMS.length <= 160);
  const bands = {};
  const grams = {};
  Deck.ITEMS.forEach(it => {
    bands[it.band] = (bands[it.band] || 0) + 1;
    grams[it.grammar] = 1;
    assert.ok(it.zh && it.en && it.noteZh && it.noteEn && it.fr);
  });
  assert.ok(bands.A1 >= 30 && bands.A2 >= 40 && bands.B1 >= 20);
  ['greetings', 'introductions', 'drinks', 'location', 'search', 'directions', 'pc-imp', 'meilleur-mieux', 'agreement', 'passive', 'dont', 'futur-simple', 'conditionnel'].forEach(g => {
    assert.ok(grams[g], g);
  });
  assert.ok(Deck.byId.bonjour && Deck.byId.je_mappelle && Deck.byId.tu_tappelles_comment && Deck.byId.salut);
});
