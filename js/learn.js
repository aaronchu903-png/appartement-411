/* L’Appartement 411 — profiles, learner records, FSRS scheduling, placement, seed import.
 * No DOM. Story saves stay in the v1 story schema; this record is separate (schema a411-learn-1).
 * Listening, reading and typed production are different cards. Help is never relabelled independent.
 */
(function (root) {
  'use strict';
  var F = root.A411 && root.A411.FSRS;
  if (!F && typeof require !== 'undefined') F = require('./fsrs.js');

  var PROFILES = [
    { id: 'jinyi', name: 'Jinyi' },
    { id: 'yuechao', name: 'Yuechao' }
  ];
  var LEARN_SCHEMA = 1;
  var DAY = 86400000;
  var DEFAULT_REVIEW_CAP = 20;
  var DEFAULT_NEW_CAP = 6;

  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function emptyLearn(profileId, now) {
    var t = (now || new Date()).toISOString();
    var yue = profileId === 'yuechao';
    return {
      schema: LEARN_SCHEMA,
      profileId: profileId,
      createdAt: t,
      updatedAt: t,
      settings: {
        reviewCap: DEFAULT_REVIEW_CAP,
        newCap: DEFAULT_NEW_CAP,
        requestRetention: 0.9,
        track: yue ? 'A1' : 'all',
        placement: yue ? 'not_started' : 'known'
      },
      cards: {},
      priorities: {},
      extraItems: [],
      evidence: [],
      placementLog: [],
      session: null,
      days: {},
      seed: null
    };
  }

  function learnKey(id) { return 'a411.p.' + id + '.learn'; }
  function storyKey(id) { return 'a411.p.' + id + '.story'; }
  function langKey(id) { return 'a411.p.' + id + '.uiLang'; }

  function loadLearn(ls, id) {
    var raw = null;
    try { raw = ls.getItem(learnKey(id)); } catch (e) { return { learn: null, error: String(e) }; }
    if (!raw) return { learn: null };
    try {
      var o = JSON.parse(raw);
      if (!isObj(o) || o.schema !== LEARN_SCHEMA || o.profileId !== id) return { learn: null, error: 'bad learn record' };
      return { learn: o };
    } catch (e) { return { learn: null, error: 'bad json' }; }
  }
  function saveLearn(ls, learn) {
    learn.updatedAt = new Date().toISOString();
    var raw = JSON.stringify(learn);
    var tmp = learnKey(learn.profileId) + '.tmp';
    try {
      ls.setItem(tmp, raw);
      if (ls.getItem(tmp) !== raw) throw new Error('verify failed');
      ls.setItem(learnKey(learn.profileId), raw);
      ls.removeItem(tmp);
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  function getLang(ls, id) {
    try { var v = ls.getItem(langKey(id)); if (v === 'en' || v === 'zh') return v; } catch (e) {}
    return 'zh';
  }
  function setLang(ls, id, lang) {
    try { ls.setItem(langKey(id), lang === 'en' ? 'en' : 'zh'); return true; } catch (e) { return false; }
  }

  function storyStore(ls, id, Logic) {
    var key = storyKey(id), tmp = key + '.tmp', prefix = 'a411.p.' + id + '.bk.';
    function backup(label, raw) {
      try {
        var k = prefix + Date.now() + '.' + label;
        ls.setItem(k, typeof raw === 'string' ? raw : JSON.stringify(raw));
        var keys = listBackups();
        while (keys.length > 5) { ls.removeItem(keys.shift().key); }
        return k;
      } catch (e) { return null; }
    }
    function listBackups() {
      var out = [];
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf(prefix) === 0) {
          var parts = k.slice(prefix.length).split('.');
          out.push({ key: k, time: Number(parts[0]), label: parts.slice(1).join('.'), legacy: false });
        }
      }
      return out.sort(function (a, b) { return a.time - b.time; });
    }
    function write(save) {
      save.updatedAt = new Date().toISOString();
      var v = Logic.validateSave(save);
      if (!v.ok) return { ok: false, error: v.errors.join('; ') };
      var raw = JSON.stringify(save);
      try {
        ls.setItem(tmp, raw);
        if (ls.getItem(tmp) !== raw) throw new Error('verify failed');
        ls.setItem(key, raw);
        ls.removeItem(tmp);
        return { ok: true };
      } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }
    function readRaw(k) { try { return ls.getItem(k); } catch (e) { return null; } }
    function load() {
      var raw = readRaw(key);
      if (!raw) {
        var t = readRaw(tmp);
        if (t) {
          var p = Logic.parseImport(t);
          if (p.ok) { write(p.save); return { save: p.save, notices: ['已从临时副本恢复存档。'] }; }
        }
        return { save: null, notices: [] };
      }
      var p2 = Logic.parseImport(raw);
      if (!p2.ok) {
        backup('corrupt', raw);
        return { save: null, notices: ['这份档案的故事存档读不了，已备份。'] };
      }
      return { save: p2.save, notices: [] };
    }
    function importText(text, current) {
      var r = Logic.parseImport(text);
      if (!r.ok) return r;
      if (current) backup('pre-import', current);
      var w = write(r.save);
      if (!w.ok) return { ok: false, errors: ['写入失败：' + w.error] };
      return r;
    }
    return { load: load, write: write, backup: backup, listBackups: listBackups, importText: importText, readBackup: readRaw, key: key };
  }

  // Copy a legacy single-player save (a411.save / a404.save) into this profile. Backup first.
  // Uses Logic.createStorage so v0 migration and the 404→411 adopt keep their old guarantees.
  function adoptLegacy(ls, id, Logic, now) {
    var flag = 'a411.legacyClaimed';
    try { if (ls.getItem(flag)) return { adopted: false, reason: 'already' }; } catch (e) {}
    var legacy = Logic.createStorage(ls).load(now);
    if (!legacy.save) {
      try { ls.setItem(flag, id); } catch (e) {}
      return { adopted: false, notices: legacy.notices || [] };
    }
    var store = storyStore(ls, id, Logic);
    var bk = store.backup('pre-profile-adopt', JSON.stringify(legacy.save));
    if (!bk) return { adopted: false, error: 'backup failed', notices: legacy.notices || [] };
    var w = store.write(legacy.save);
    if (!w.ok) return { adopted: false, error: w.error, notices: legacy.notices || [] };
    try { ls.setItem(flag, id); } catch (e) {}
    var notices = (legacy.notices || []).slice();
    notices.push('这份进度已放进 ' + id + ' 的档案（原存档仍留在原来的位置）。');
    return { adopted: true, save: legacy.save, notices: notices };
  }

  function itemById(deck, learn, id) {
    if (deck && deck.byId && deck.byId[id]) return deck.byId[id];
    var extra = (learn && learn.extraItems) || [];
    for (var i = 0; i < extra.length; i++) if (extra[i].id === id) return extra[i];
    return null;
  }
  function allItems(deck, learn) {
    return (deck.ITEMS || []).concat((learn && learn.extraItems) || []);
  }
  function modalitiesOf(deck, item) {
    if (deck.modalities) {
      var m = deck.modalities(item);
      if (item.cloze) return m;
      return m;
    }
    return ['listening', 'reading', 'production'];
  }
  function cardKey(itemId, modality) { return itemId + '|' + modality; }
  function blankCard(itemId, modality) {
    return {
      itemId: itemId, modality: modality, reps: 0, lapses: 0,
      stability: 0, difficulty: 0, scheduledDays: 0, due: null, lastReview: null, state: 'new'
    };
  }
  function ensureCard(learn, itemId, modality) {
    var k = cardKey(itemId, modality);
    if (!learn.cards[k]) learn.cards[k] = blankCard(itemId, modality);
    return learn.cards[k];
  }

  function bandOk(track, band) {
    if (!track || track === 'all' || track === 'B1') return true;
    if (track === 'A2') return band === 'A1' || band === 'A2';
    return band === 'A1';
  }
  function bucket(card) {
    if (!card || !card.reps) return 'new';
    if (card.scheduledDays >= 21) return 'mature';
    if (card.scheduledDays < 7) return 'learning';
    return 'review';
  }
  function retrievability(card, now) {
    if (!card || !card.reps || !card.stability) return null;
    var elapsed = card.lastReview ? Math.max(0, F.utcDayDiff(new Date(card.lastReview), now)) : 0;
    return F.forgettingCurve(elapsed, card.stability);
  }

  function applyGrade(card, grade, now) {
    var elapsed = 0;
    if (card.lastReview) elapsed = Math.max(0, F.utcDayDiff(new Date(card.lastReview), now));
    var memory = card.reps ? { stability: card.stability, difficulty: card.difficulty } : { stability: 0, difficulty: 0 };
    var choices = F.preview(memory, card.reps ? elapsed : 0, 0.9);
    var picked = choices.filter(function (c) { return c.grade === grade; })[0];
    var wasReview = card.reps > 0;
    card.stability = picked.stability;
    card.difficulty = picked.difficulty;
    card.scheduledDays = picked.scheduledDays;
    card.reps += 1;
    if (grade === 1 && wasReview) card.lapses += 1;
    card.lastReview = now.toISOString();
    card.due = new Date(now.getTime() + picked.scheduledDays * DAY).toISOString();
    card.state = bucket(card);
    return card;
  }

  function baseForm(s) {
    return String(s == null ? '' : s).replace(/[\u2019\u2018\u02bc`´]/g, "'").replace(/\u00a0/g, ' ')
      .replace(/[!?.,;:«»"()]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function foldForm(s) { return baseForm(s).normalize('NFD').replace(/\p{M}/gu, ''); }
  function checkAnswer(input, accept) {
    var list = accept || [];
    var b = baseForm(input), f = foldForm(input);
    if (!b) return { ok: false, accent: false, empty: true };
    var exact = list.some(function (a) { return baseForm(a) === b; });
    if (exact) return { ok: true, accent: false, empty: false };
    var folded = list.some(function (a) { return foldForm(a) === f; });
    if (folded) return { ok: true, accent: true, empty: false };
    return { ok: false, accent: false, empty: false };
  }

  // correct first try, no help -> Good; hints or a missing accent -> Hard; wrong -> Again. Easy is manual.
  function suggestRating(o) {
    if (!o || o.correct === false) return 1;
    if (o.hints > 0 || o.accent) return 2;
    return 3;
  }
  function resultTypeOf(o) {
    if (o.hints > 0 || o.revealed) return 'supported';
    if (o.correct) return 'independent';
    return 'independent';
  }

  function dayKey(now) {
    var d = now || new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function introducedSet(learn) {
    var s = {};
    Object.keys(learn.cards).forEach(function (k) { s[learn.cards[k].itemId] = 1; });
    return s;
  }

  function buildQueue(learn, deck, now, opts) {
    opts = opts || {};
    var reviewCap = opts.reviewCap != null ? opts.reviewCap : learn.settings.reviewCap;
    var newCap = opts.newCap != null ? opts.newCap : learn.settings.newCap;
    var totalCap = opts.totalCap;
    var track = learn.settings.track || 'all';
    var reviews = [];
    Object.keys(learn.cards).forEach(function (k) {
      var c = learn.cards[k];
      if (!c.reps || !c.due) return;
      if (new Date(c.due).getTime() <= now.getTime()) {
        reviews.push({ key: k, due: c.due, r: retrievability(c, now) });
      }
    });
    reviews.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : (a.r - b.r); });
    var overdue = reviews.length;
    reviews = reviews.slice(0, reviewCap);
    var have = introducedSet(learn);
    var fresh = allItems(deck, learn).filter(function (it) { return bandOk(track, it.band) && !have[it.id]; });
    function pr(it) { return (learn.priorities && learn.priorities[it.id]) || it.priority || 0; }
    fresh.sort(function (a, b) { return pr(b) - pr(a) || (a.band < b.band ? -1 : a.band > b.band ? 1 : 0); });
    var news = [];
    for (var i = 0; i < fresh.length && news.length < newCap; i++) {
      modalitiesOf(deck, fresh[i]).forEach(function (mod) {
        if (news.length < newCap) news.push({ itemId: fresh[i].id, modality: mod, key: cardKey(fresh[i].id, mod), isNew: true });
      });
    }
    var queue = reviews.map(function (r) {
      var c = learn.cards[r.key];
      return { itemId: c.itemId, modality: c.modality, key: r.key, isNew: false };
    }).concat(news);
    if (totalCap != null && queue.length > totalCap) queue = queue.slice(0, totalCap);
    return { queue: queue, overdue: overdue, reviewCap: reviewCap, newCap: newCap, newAvailable: fresh.length };
  }

  function startSession(learn, deck, now, opts) {
    var q = buildQueue(learn, deck, now, opts);
    learn.session = q.queue.length ? { active: true, queue: q.queue, index: 0, hints: 0, wrong: false, revealed: false, accent: false, phase: 'ask', quick: !!(opts && opts.totalCap) } : null;
    return { queue: q, session: learn.session };
  }

  function commit(learn, grade, meta, now) {
    var s = learn.session;
    if (!s || !s.queue[s.index]) return null;
    var entry = s.queue[s.index];
    var card = ensureCard(learn, entry.itemId, entry.modality);
    var wasNew = card.reps === 0;
    applyGrade(card, grade, now);
    var suggested = meta.suggested;
    var ev = {
      at: now.toISOString(),
      itemId: entry.itemId,
      modality: entry.modality,
      grade: grade,
      suggested: suggested,
      overridden: grade !== suggested,
      hints: meta.hints || 0,
      correct: !!meta.correct,
      accent: !!meta.accent,
      revealed: !!meta.revealed,
      resultType: resultTypeOf(meta),
      source: meta.source || 'review',
      audio: meta.audio || 'not_used'
    };
    learn.evidence.push(ev);
    if (learn.evidence.length > 500) learn.evidence = learn.evidence.slice(-500);
    var dk = dayKey(now);
    var day = learn.days[dk] = learn.days[dk] || { reviews: 0, news: 0 };
    if (wasNew) day.news += 1; else day.reviews += 1;
    if (grade === 1) {
      s.queue.push({ itemId: entry.itemId, modality: entry.modality, key: entry.key, isNew: false, retry: true });
    }
    s.index += 1;
    s.hints = 0; s.wrong = false; s.revealed = false; s.accent = false; s.phase = 'ask';
    if (s.index >= s.queue.length) s.active = false;
    return ev;
  }

  function counts(learn) {
    var c = { new: 0, learning: 0, review: 0, mature: 0 };
    Object.keys(learn.cards || {}).forEach(function (k) { c[bucket(learn.cards[k])] += 1; });
    return c;
  }
  function retention(learn, now) {
    var rs = [];
    Object.keys(learn.cards || {}).forEach(function (k) {
      var r = retrievability(learn.cards[k], now);
      if (r != null) rs.push(r);
    });
    if (!rs.length) return null;
    var sum = rs.reduce(function (a, b) { return a + b; }, 0);
    return sum / rs.length;
  }
  function forecast(learn, now) {
    var days = [];
    for (var i = 0; i < 7; i++) {
      var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
      var n = 0;
      Object.keys(learn.cards || {}).forEach(function (k) {
        var c = learn.cards[k];
        if (!c.due || !c.reps) return;
        var t = new Date(c.due).getTime();
        if (t >= start.getTime() && t < end.getTime()) n++;
      });
      days.push({ offset: i, count: n });
    }
    return days;
  }
  function grammarMap(learn, deck) {
    var areas = {};
    allItems(deck, learn).forEach(function (it) {
      var a = areas[it.grammar] = areas[it.grammar] || { grammar: it.grammar, bands: {}, cards: [] };
      a.bands[it.band] = 1;
    });
    Object.keys(learn.cards || {}).forEach(function (k) {
      var c = learn.cards[k];
      var it = itemById(deck, learn, c.itemId);
      if (!it) return;
      var a = areas[it.grammar] = areas[it.grammar] || { grammar: it.grammar, bands: {}, cards: [] };
      a.cards.push(c);
    });
    return Object.keys(areas).sort().map(function (g) {
      var a = areas[g];
      var cards = a.cards;
      var status = 'Not yet';
      if (cards.length) {
        var reps = cards.filter(function (c) { return c.reps > 0; });
        var mature = cards.filter(function (c) { return bucket(c) === 'mature'; }).length;
        var long = cards.filter(function (c) { return c.scheduledDays >= 7; }).length;
        if (mature && mature * 2 >= cards.length) status = 'Stable';
        else if (long) status = 'Productive';
        else if (reps.length) status = 'Practiced';
        else status = 'Encountered';
      }
      return { grammar: g, status: status, cards: cards.length, bands: Object.keys(a.bands) };
    });
  }

  function noteStory(learn, deck, attempt, now) {
    if (!learn || !attempt) return;
    learn.evidence.push({
      at: attempt.at || now.toISOString(),
      itemId: attempt.target,
      modality: attempt.modality,
      source: 'story',
      resultType: attempt.resultType,
      correct: attempt.correct,
      audio: attempt.audioStatus,
      hints: attempt.resultType === 'supported' ? 1 : 0
    });
    if (learn.evidence.length > 500) learn.evidence = learn.evidence.slice(-500);
    if (!attempt.target || attempt.evidenceKind === 'encounter' || attempt.resultType === 'exposure' || attempt.resultType === 'unknown') return;
    var item = itemById(deck, learn, attempt.target);
    if (!item) return;
    var mod = attempt.modality;
    if (mod === 'listening+reading') mod = 'listening';
    if (mod === 'writing' || mod === 'selection') mod = 'production';
    if (mod !== 'listening' && mod !== 'reading' && mod !== 'production') return;
    if (mod === 'listening' && attempt.audioStatus !== 'played') mod = 'reading';
    var card = ensureCard(learn, item.id, mod);
    var supported = attempt.resultType === 'supported';
    var rating = attempt.correct === false ? 1 : supported ? 2 : 3;
    if (attempt.correct == null && attempt.resultType !== 'supported') return;
    applyGrade(card, rating, now);
  }

  // ---------- placement (Yuechao; skippable, no penalty) ----------
  var PLACEMENT = [
    { band: 'A1', id: 'p.a1.bonjour', fr: 'Bonjour !', speaker: 'neutral',
      promptZh: '这句话是什么意思？', promptEn: 'What does this mean?',
      answer: 'hi', options: [
        { id: 'hi', zh: '打招呼', en: 'a greeting' },
        { id: 'thx', zh: '道谢', en: 'thanks' },
        { id: 'where', zh: '问地方', en: 'asking where' } ] },
    { band: 'A1', id: 'p.a1.name', fr: "Je m'appelle Camille.", speaker: 'camille',
      promptZh: '她在做什么？', promptEn: 'What is she doing?',
      answer: 'tell', options: [
        { id: 'tell', zh: '在说自己的名字', en: 'saying her name' },
        { id: 'ask', zh: '在问我的名字', en: 'asking my name' },
        { id: 'bye', zh: '在告别', en: 'saying goodbye' } ] },
    { band: 'A1', id: 'p.a1.drink', fr: 'Tu veux du thé ou du café ?', speaker: 'noe',
      promptZh: '他在问什么？', promptEn: 'What is he asking?',
      answer: 'drink', options: [
        { id: 'drink', zh: '要茶还是咖啡', en: 'tea or coffee' },
        { id: 'where', zh: '东西在哪里', en: 'where something is' },
        { id: 'name', zh: '你叫什么', en: 'your name' } ] },
    { band: 'A2', id: 'p.a2.tense', fr: 'Il pleuvait, alors je suis resté.', speaker: 'neutral',
      promptZh: '前半句 il pleuvait 更像是？', promptEn: 'The first half, il pleuvait, is more like…',
      answer: 'bg', options: [
        { id: 'bg', zh: '当时的背景（正在下雨）', en: 'background (it was raining)' },
        { id: 'done', zh: '一个已经结束的一次性动作', en: 'one finished action' },
        { id: 'fut', zh: '将来的计划', en: 'a future plan' } ] },
    { band: 'A2', id: 'p.a2.mieux', fr: 'Elle parle mieux.', speaker: 'camille',
      promptZh: 'mieux 在这里形容什么？', promptEn: 'What does mieux describe here?',
      answer: 'act', options: [
        { id: 'act', zh: '动作做得更好', en: 'an action done better' },
        { id: 'thing', zh: '一个更好的东西', en: 'a better thing' },
        { id: 'name', zh: '一个人的名字', en: 'a name' } ] },
    { band: 'A2', id: 'p.a2.agr', fr: 'Les fleurs sont belles.', speaker: 'neutral',
      promptZh: 'belles 为什么这样写？', promptEn: 'Why belles?',
      answer: 'fp', options: [
        { id: 'fp', zh: '配合阴性复数 fleurs', en: 'it agrees with feminine plural fleurs' },
        { id: 'm', zh: '因为说话的人是男性', en: 'because the speaker is male' },
        { id: 'inv', zh: '形容词永远不变', en: 'adjectives never change' } ] },
    { band: 'B1', id: 'p.b1.dont', fr: "C'est le café dont je parle.", speaker: 'noe',
      promptZh: 'dont 通常代替什么？', promptEn: 'dont usually stands in for…',
      answer: 'de', options: [
        { id: 'de', zh: 'de + 某物（parler de）', en: 'de + something (parler de)' },
        { id: 'subj', zh: '句子的主语', en: 'the subject' },
        { id: 'place', zh: '一个地点', en: 'a place' } ] },
    { band: 'B1', id: 'p.b1.pass', fr: 'La porte a été ouverte par Noé.', speaker: 'camille',
      promptZh: '谁开的门？', promptEn: 'Who opened the door?',
      answer: 'noe', options: [
        { id: 'noe', zh: 'Noé', en: 'Noé' },
        { id: 'porte', zh: '门自己', en: 'the door itself' },
        { id: 'je', zh: '说话的人', en: 'the speaker' } ] },
    { band: 'B1', id: 'p.b1.cond', fr: "Si j'avais le temps, je viendrais.", speaker: 'neutral',
      promptZh: '这句话是？', promptEn: 'This sentence is…',
      answer: 'hyp', options: [
        { id: 'hyp', zh: '假设：有时间的话我会来', en: 'hypothetical: I would come if I had time' },
        { id: 'past', zh: '已经发生的事', en: 'something that already happened' },
        { id: 'order', zh: '一个命令', en: 'an order' } ] }
  ];

  function placementState(learn) {
    var log = learn.placementLog || [];
    var bands = ['A1', 'A2', 'B1'];
    var asked = {};
    log.forEach(function (x) { (asked[x.band] = asked[x.band] || []).push(x); });
    if (learn.settings.placement === 'skipped' || learn.settings.placement === 'done' || learn.settings.placement === 'known') {
      return { done: true, next: null };
    }
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var rows = asked[b] || [];
      var wrong = rows.filter(function (x) { return x.correct === false; }).length;
      var right = rows.filter(function (x) { return x.correct === true; }).length;
      if (wrong >= 2) return { done: true, next: null, stopped: b };
      if (right >= 2) continue;
      if (rows.length >= 3) continue;
      var used = {};
      rows.forEach(function (x) { used[x.id] = 1; });
      var next = PLACEMENT.filter(function (p) { return p.band === b && !used[p.id]; })[0] || null;
      if (next) return { done: false, next: next };
    }
    return { done: true, next: null };
  }
  function placementAnswer(learn, itemId, response, support, now) {
    var item = PLACEMENT.filter(function (p) { return p.id === itemId; })[0];
    if (!item) return { ok: false };
    var correct = response === 'unsure' ? null : response === item.answer;
    var row = {
      id: item.id, band: item.band, at: now.toISOString(), response: response, correct: correct,
      resultType: (support && (support.subtitles || support.chinese)) ? 'supported' : 'baseline',
      modality: support && support.audio === 'played' ? (support.subtitles ? 'listening+reading' : 'listening') : 'reading',
      audio: support && support.audio || 'not_used'
    };
    learn.placementLog.push(row);
    learn.evidence.push({ at: row.at, itemId: item.id, modality: row.modality, source: 'placement', resultType: 'baseline', correct: correct, hints: row.resultType === 'supported' ? 1 : 0, audio: row.audio });
    var st = placementState(learn);
    if (st.done) finishPlacement(learn, false);
    return { ok: true, correct: correct, done: st.done, next: placementState(learn).next };
  }
  function finishPlacement(learn, skipped) {
    if (skipped) {
      learn.settings.placement = 'skipped';
      learn.settings.track = 'A1';
      return;
    }
    learn.settings.placement = 'done';
    var by = {};
    (learn.placementLog || []).forEach(function (x) {
      by[x.band] = by[x.band] || { right: 0, wrong: 0 };
      if (x.correct === true) by[x.band].right++;
      if (x.correct === false) by[x.band].wrong++;
    });
    var track = 'A1';
    if (by.A1 && by.A1.right >= 2) track = 'A2';
    if (by.A2 && by.A2.right >= 2 && by.B1 && by.B1.right >= 2) track = 'all';
    learn.settings.track = track;
  }
  function skipPlacement(learn) { finishPlacement(learn, true); }

  // ---------- personal seed ----------
  function validateSeed(obj) {
    var e = [];
    if (!isObj(obj)) return { ok: false, errors: ['不是 JSON 对象'] };
    if (obj.kind !== 'a411-personal-seed') e.push('kind 必须是 a411-personal-seed');
    if (obj.schemaVersion !== 1) e.push('schemaVersion 必须是 1');
    if (obj.forProfile !== 'jinyi' && obj.forProfile !== 'yuechao') e.push('forProfile 无效');
    if (obj.cardStates && !Array.isArray(obj.cardStates)) e.push('cardStates 必须是数组');
    if (obj.privateCards && !Array.isArray(obj.privateCards)) e.push('privateCards 必须是数组');
    if (e.length) return { ok: false, errors: e };
    (obj.privateCards || []).forEach(function (c, i) {
      if (!isObj(c) || typeof c.id !== 'string' || typeof c.fr !== 'string' || typeof c.zh !== 'string' || typeof c.en !== 'string') e.push('privateCards[' + i + '] 缺字段');
    });
    (obj.cardStates || []).forEach(function (c, i) {
      if (!isObj(c) || typeof c.id !== 'string' || ['listening', 'reading', 'production'].indexOf(c.modality) < 0) e.push('cardStates[' + i + '] 无效');
    });
    return { ok: e.length === 0, errors: e };
  }
  function importSeed(learn, obj, deck, now) {
    var v = validateSeed(obj);
    if (!v.ok) return v;
    if (obj.forProfile !== learn.profileId) return { ok: false, errors: ['这份种子是给 ' + obj.forProfile + ' 的，现在的档案是 ' + learn.profileId] };
    var backup = clone(learn);
    try {
      (obj.privateCards || []).forEach(function (c) {
        if (!learn.extraItems.some(function (x) { return x.id === c.id; })) learn.extraItems.push(c);
      });
      learn.priorities = learn.priorities || {};
      (obj.cardStates || []).forEach(function (st) {
        var item = itemById(deck, learn, st.id);
        if (!item) return;
        var card = ensureCard(learn, st.id, st.modality);
        card.reps = st.reps || 0;
        card.lapses = st.lapses || 0;
        card.stability = st.stability || 0;
        card.difficulty = st.difficulty || 0;
        card.scheduledDays = st.scheduledDays || 0;
        card.state = card.reps ? bucket(card) : 'new';
        if (st.dueInDays != null && card.reps) card.due = new Date(now.getTime() + st.dueInDays * DAY).toISOString();
        if (st.priority) learn.priorities[st.id] = Math.max(learn.priorities[st.id] || 0, st.priority);
      });
      (obj.priorities || []).forEach(function (p) {
        if (p && p.id) learn.priorities[p.id] = p.priority;
      });
      learn.seed = { importedAt: now.toISOString(), forProfile: obj.forProfile, note: 'personal seed imported on this device only' };
      return { ok: true, backup: backup };
    } catch (err) {
      return { ok: false, errors: [String(err && err.message || err)], backup: backup };
    }
  }

  function validateBundle(obj) {
    var e = [];
    if (!isObj(obj) || obj.kind !== 'a411-profile-bundle') return { ok: false, errors: ['不是学习档案包'] };
    if (obj.profileId !== 'jinyi' && obj.profileId !== 'yuechao') e.push('profileId 无效');
    if (!isObj(obj.learn) || obj.learn.schema !== LEARN_SCHEMA) e.push('learn 无效');
    if (obj.learn && obj.learn.profileId !== obj.profileId) e.push('learn.profileId 与包不一致');
    return { ok: e.length === 0, errors: e };
  }

  var api = {
    PROFILES: PROFILES, LEARN_SCHEMA: LEARN_SCHEMA, DEFAULT_REVIEW_CAP: DEFAULT_REVIEW_CAP, DEFAULT_NEW_CAP: DEFAULT_NEW_CAP,
    emptyLearn: emptyLearn, loadLearn: loadLearn, saveLearn: saveLearn, getLang: getLang, setLang: setLang,
    storyStore: storyStore, adoptLegacy: adoptLegacy, learnKey: learnKey, storyKey: storyKey, langKey: langKey,
    itemById: itemById, allItems: allItems, cardKey: cardKey, ensureCard: ensureCard, bucket: bucket,
    retrievability: retrievability, applyGrade: applyGrade, checkAnswer: checkAnswer, suggestRating: suggestRating,
    buildQueue: buildQueue, startSession: startSession, commit: commit, counts: counts, retention: retention,
    forecast: forecast, grammarMap: grammarMap, noteStory: noteStory, bandOk: bandOk,
    PLACEMENT: PLACEMENT, placementState: placementState, placementAnswer: placementAnswer, skipPlacement: skipPlacement,
    validateSeed: validateSeed, importSeed: importSeed, validateBundle: validateBundle, dayKey: dayKey, resultTypeOf: resultTypeOf
  };
  root.A411 = root.A411 || {};
  root.A411.Learn = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
