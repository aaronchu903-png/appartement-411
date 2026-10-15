/* Day8 review core. No DOM/storage/audio side effects. elapsed is in seconds.
 * Words: {id,fr,zh,en,pos,gender,field,potId,week,seen,sentence,cloze,
 * answer,chunks,audioId,recorded,recognitionOnly,accepted,legacyIds}.
 * FSRS-5: published 19-weight defaults, retention .9, no fuzz/short-term.
 * Reference: open-spaced-repetition/ts-fsrs 4.7.1 (FSRS-5.0).
 */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const CONFIG = Object.freeze({ newCap: 10, retryAfter: 3, slow: Object.freeze({ R1: 8, R2: 8, R3: 18, P1: 15, P2: 15 }) });
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const MODALITY = { R1: 'listening', R2: 'reading', R3: 'reading', P1: 'production', P2: 'listening' };
  const TYPES = ['R1', 'R2', 'R3', 'P1', 'P2'];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const round = n => +n.toFixed(8);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const safeId = id => typeof id === 'string' && id.trim().length > 0 && !/["'`<>&\u0000-\u001f\u007f-\u009f]/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
  const date = now => { const d = new Date(now == null ? Date.now() : now); if (!Number.isFinite(+d)) throw new Error('Invalid date'); return d; };
  function dayKey(now) { const d = date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function dayNumber(key) { const p = key.split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / DAY); }
  function shiftDay(key, n) { const d = new Date((dayNumber(key) + n) * DAY); return d.toISOString().slice(0, 10); }
  function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae').replace(/[\u2018\u2019`]/g, "'")
      .replace(/[.,!?;:\u2026\u00ab\u00bb"()]/g, ' ').replace(/\s*'\s*/g, "'").replace(/\s+/g, ' ').trim();
  }
  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = old; }
    }
    return row[b.length];
  }
  function grade(input, accepted, type, elapsed) {
    const value = normalize(Array.isArray(input) ? input.join(' ') : input);
    const targets = (Array.isArray(accepted) ? accepted : [accepted]).map(normalize).filter(Boolean);
    const exact = !!value && targets.includes(value);
    // Short function words must not accept an entirely different one-letter word.
    const typo = !exact && /^P[12]$/.test(type) && targets.some(t => value.length >= 3 && t.length >= 4 && distance(value, t) === 1);
    const correct = exact || typo;
    const rating = !correct ? 1 : typo || Number(elapsed) > CONFIG.slow[type] ? 2 : 3;
    return { correct, typo, rating, grade: ['Again', 'Hard', 'Good'][rating - 1] };
  }
  function initialDifficulty(g) { return clamp(round(W[4] - Math.exp((g - 1) * W[5]) + 1), 1, 10); }
  function nextState(memory, elapsedDays, rating) {
    const s = Number(memory.stability) || 0, d = Number(memory.difficulty) || 0;
    if (!s || !d) return { stability: W[rating - 1], difficulty: initialDifficulty(rating) };
    const r = round(Math.pow(1 + (19 / 81) * Math.max(0, elapsedDays) / s, -0.5));
    const difficulty = clamp(round(W[7] * initialDifficulty(4) + (1 - W[7]) * (d + round(-W[6] * (rating - 3) * (10 - d) / 9))), 1, 10);
    const forget = round(clamp(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]), .01, 36500));
    const recall = s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * (rating === 2 ? W[15] : rating === 4 ? W[16] : 1));
    return { difficulty, stability: round(rating === 1 ? Math.min(round(s), forget) : clamp(recall, .01, 36500)) };
  }
  function preview(memory, elapsedDays) {
    const out = [1, 2, 3, 4].map(rating => { const m = nextState(memory, elapsedDays, rating); return { ...m, rating, scheduledDays: clamp(Math.round(m.stability), 1, 36500) }; });
    out[0].scheduledDays = Math.min(out[0].scheduledDays, out[1].scheduledDays);
    for (let i = 1; i < 4; i++) out[i].scheduledDays = Math.max(out[i].scheduledDays, out[i - 1].scheduledDays + 1);
    return out;
  }
  function ensure(state) { for (const k of ['cards', 'words', 'days']) if (!state[k]) state[k] = {}; }
  function daily(state, key, words, now) {
    ensure(state);
    if (!own(state.days, key)) state.days[key] = {};
    const d = state.days[key];
    for (const k of ['introduced', 'attempted', 'due', 'reviewed']) if (!Array.isArray(d[k])) d[k] = [];
    // Retain the day's complete due load even after review or a filtered story session.
    for (const w of words || []) if (safeId(w.id) && seen(state, w) && introduced(state, w)
      && cardsFor(state, w.id).some(c => active(c) && (!c.due || +new Date(c.due) <= +now)) && !d.due.includes(w.id)) d.due.push(w.id);
    return d;
  }
  function dailyNewCap(d) { return Math.max(0, CONFIG.newCap - Math.floor(new Set(d.due).size / 5)); }
  function cardsFor(state, id) { return Object.values(state.cards || {}).filter(c => c && c.itemId === id); }
  function active(c) { return !c.suspended && !c.suspend && c.state !== 'suspended'; }
  function seen(state, w) { return !!(state.words[w.id] && (state.words[w.id].met || state.words[w.id].collected || state.words[w.id].introduced)); }
  function introduced(state, w) { return !!(state.words[w.id] && state.words[w.id].introduced) || cardsFor(state, w.id).some(c => c.reps > 0 || c.stability > 0); }
  function stability(state, w) { const cs = cardsFor(state, w.id).filter(active); return cs.length ? Math.min(...cs.map(c => Number(c.stability) || 0)) : 0; }
  function availableTypes(state, w) {
    const s = stability(state, w);
    if (!introduced(state, w)) return ['R1'];
    if (w.recognitionOnly || w.rare) return ['R1', 'R2'];
    return s < 3 ? ['R1', 'R2'] : s <= 14 ? ['R2', 'R3'] : ['R3', 'P1', 'P2'];
  }
  function createSession(state, words, options) {
    options = options || {}; ensure(state);
    const now = date(options.now), key = dayKey(now), d = daily(state, key, words, now);
    const mode = options.mode === 'cat' ? 'cat' : 'garden';
    const onlyIds = options.onlyIds || options.wordIds;
    const eligible = words.filter(w => safeId(w.id) && (!onlyIds || onlyIds.includes(w.id)) && seen(state, w) && (!cardsFor(state, w.id).length || cardsFor(state, w.id).some(active)) && (mode !== 'cat' || Number(w.week || 1) === 1));
    const due = eligible.filter(w => introduced(state, w) && cardsFor(state, w.id).some(c => active(c) && (!c.due || +new Date(c.due) <= +now)));
    due.sort((a, b) => {
      const earliest = w => Math.min(...cardsFor(state, w.id).filter(active).map(c => +new Date(c.due || 0)));
      return earliest(a) - earliest(b) || hash(key + a.id) - hash(key + b.id);
    });
    for (const w of due) if (!d.due.includes(w.id)) d.due.push(w.id);
    const newLimit = Math.max(0, dailyNewCap(d) - d.introduced.length);
    const newWords = mode === 'cat' ? [] : eligible.filter(w => !introduced(state, w)).slice(0, newLimit);
    let selected = due.map(w => ({ wordId: w.id, due: true })).concat(newWords.map(w => ({ wordId: w.id, isNew: true })));
    if (options.practice && mode === 'garden') selected = selected.concat(eligible.filter(w => !due.includes(w) && !newWords.includes(w)).map(w => ({ wordId: w.id, practice: true, practiceOnly: !introduced(state, w) })));
    const budget = Number.isFinite(options.budget) ? Math.max(0, Math.floor(options.budget)) : mode === 'cat' ? 6 : selected.length;
    if (mode === 'cat' && selected.length < budget) {
      selected = selected.concat(eligible.filter(w => !due.includes(w)).map(w => ({ wordId: w.id, recognition: true })));
      const pool = selected.slice();
      while (pool.length && selected.length < budget) selected.push({ ...pool[selected.length % pool.length], recognition: true });
    }
    selected = selected.slice(0, budget);
    return { mode, day: key, now: now.toISOString(), budget, queue: selected, index: 0, answered: 0, correct: 0, types: [], current: null, pool: eligible.filter(w => introduced(state, w)).map(w => w.id), practice: !!options.practice, forceType: TYPES.includes(options.forceType) ? options.forceType : null, initial: selected.length, done: !selected.length };
  }
  function current(session, state, words) {
    if (session.current) return session.current;
    if (session.done || session.index >= session.queue.length || (session.mode === 'cat' && session.answered >= session.budget)) { session.done = true; return null; }
    if (session.queue[session.index].notBefore > session.answered) {
      const ready = session.queue.findIndex((entry, i) => i > session.index && !(entry.notBefore > session.answered));
      if (ready >= 0) session.queue.splice(session.index, 0, session.queue.splice(ready, 1)[0]);
      else {
        const waiting = session.queue.slice(session.index).filter(entry => entry.notBefore > session.answered).map(entry => entry.wordId);
        const filler = session.pool.find(id => !waiting.includes(id));
        if (filler) session.queue.splice(session.index, 0, { wordId: filler, recognition: true, practice: true });
        // If every available item is waiting, a shorter gap is preferable to a dead end.
      }
    }
    const entry = session.queue[session.index], w = words.find(w => w.id === entry.wordId);
    if (!w || !safeId(w.id)) { session.index++; return current(session, state, words); }
    let types = entry.practiceOnly ? ['R1'] : entry.recognition ? ['R1', 'R2'] : availableTypes(state, w);
    if (entry.retryType && !entry.practiceOnly) types = [TYPES[Math.max(0, TYPES.indexOf(entry.retryType) - 1)]];
    const last = session.types.slice(-2), repeated = last.length === 2 && last[0] === last[1] ? last[0] : null;
    types = types.filter(t => t !== repeated);
    // A third new recognition item uses cloze recognition, never forced production.
    if (!types.length) types = [repeated === 'R1' ? 'R2' : 'R1'];
    const modalityActive = t => !state.cards[`${w.id}|${MODALITY[t]}`] || active(state.cards[`${w.id}|${MODALITY[t]}`]);
    types = types.filter(modalityActive);
    if (!types.length) types = TYPES.filter(t => t !== repeated && modalityActive(t) && (!(w.recognitionOnly || w.rare) || /^R[12]$/.test(t)));
    if (!types.length) { session.index++; return current(session, state, words); }
    const dueModalities = cardsFor(state, w.id).filter(c => active(c) && (!c.due || +new Date(c.due) <= +new Date(session.now))).sort((a, b) => +new Date(a.due || 0) - +new Date(b.due || 0));
    const preferred = dueModalities.length && types.filter(t => MODALITY[t] === dueModalities[0].modality);
    if (preferred && preferred.length) types = preferred;
    const type = session.forceType && !entry.practiceOnly && session.forceType !== repeated && modalityActive(session.forceType) ? session.forceType : types[hash(session.day + w.id + session.answered) % types.length];
    const target = w.answer || w.fr, sentence = w.sentence || w.fr;
    let cloze = w.cloze;
    if (!cloze) { const index = normalize(sentence).indexOf(normalize(target)); cloze = index >= 0 ? sentence.slice(0, index) + '___' + sentence.slice(index + target.length) : '___'; }
    const peers = words.filter(other => safeId(other.id) && other.id !== w.id && seen(state, other) && other.pos === w.pos && (!w.gender || other.gender === w.gender) && normalize(other.answer || other.fr) !== normalize(target) && (type !== 'R1' || ((!w.phonetic || other.phonetic !== w.phonetic) && !(w.homophones || []).includes(other.id))));
    peers.sort((a, b) => Number(b.field === w.field) - Number(a.field === w.field) || hash(session.day + a.id) - hash(session.day + b.id));
    const choices = [w, ...peers.slice(0, 3)].sort((a, b) => hash(a.id + session.answered) - hash(b.id + session.answered));
    let chunks = (w.chunks && w.chunks.length ? w.chunks : sentence.split(/\s+/)).slice();
    if (chunks.length > 6) { const groups = [], size = Math.ceil(chunks.length / 6); for (let i = 0; i < chunks.length; i += size) groups.push(chunks.slice(i, i + size).join(' ')); chunks = groups; }
    const orderedChunks = chunks.join(' ');
    chunks = chunks.map((text, index) => ({ text, order: hash(w.id + session.answered + index) })).sort((a, b) => a.order - b.order).map(c => c.text);
    if (chunks.join(' ') === orderedChunks && chunks.length > 1) chunks.push(chunks.shift());
    session.current = { type, wordId: w.id, word: w, potId: w.potId == null ? w.pot : w.potId, sentence, audioId: w.audioId || w.clip || null,
      prompt: type === 'R1' ? sentence : type === 'R3' ? (w.sentenceZh || w.sentenceEn || w.zh || w.en || '') : type === 'P2' && w.recorded ? '' : cloze,
      options: choices.map(c => ({ id: c.id, text: type === 'R1' ? (c.zh || c.en || c.fr) : (c.answer || c.fr), zh: c.zh, en: c.en, fr: c.answer || c.fr })),
      chunks, answer: type === 'R3' ? sentence : target, firstLetter: Array.from(target)[0] || '', degraded: type === 'P2' && !w.recorded,
      modality: MODALITY[type], cardKey: `${w.id}|${MODALITY[type]}`, retry: !!entry.retryType, practiceOnly: !!entry.practiceOnly,
      distractorWarning: (type === 'R1' || type === 'R2') && !peers.some(p => p.field && p.field === w.field) };
    return session.current;
  }
  function answer(session, state, words, input, options) {
    options = options || {};
    const ex = current(session, state, words); if (!ex) return { done: true, correct: false, scheduled: false, remaining: 0 };
    const now = date(options.now == null ? session.now : options.now), key = dayKey(now), d = daily(state, key, words, now);
    let result;
    if (ex.type === 'R1' || ex.type === 'R2') {
      const id = typeof input === 'object' && input ? input.id : input;
      result = grade(id === ex.wordId ? ex.answer : '', ex.answer, ex.type, options.elapsed);
    } else result = grade(input, ex.type === 'R3' ? [ex.sentence] : [ex.answer, ...(ex.word.accepted || [])], ex.type, options.elapsed);
    const wasIntroduced = introduced(state, ex.word);
    const overCap = !wasIntroduced && d.introduced.length >= dailyNewCap(d);
    const practiceOnly = ex.practiceOnly || (session.practice && overCap);
    if (overCap && session.mode !== 'cat' && !practiceOnly) {
      session.index++; session.current = null; session.done = session.index >= session.queue.length;
      return { ...result, correct: false, scheduled: false, skipped: 'new-cap', done: session.done, remaining: session.queue.length - session.index };
    }
    if (!own(state.words, ex.wordId)) state.words[ex.wordId] = { met: true };
    // Cat recognition of a seen word is practice, never a new introduction.
    const canSchedule = !practiceOnly && (wasIntroduced || session.mode !== 'cat');
    if (canSchedule) state.words[ex.wordId].introduced = true;
    if (!wasIntroduced && canSchedule) { state.words[ex.wordId].introducedAt = now.toISOString(); d.introduced.push(ex.wordId); }
    const previouslyReviewed = cardsFor(state, ex.wordId).some(c => c.lastReview && dayKey(c.lastReview) === key);
    const scheduled = canSchedule && !d.attempted.includes(ex.wordId) && !previouslyReviewed;
    if (scheduled) {
      const old = state.cards[ex.cardKey] || { itemId: ex.wordId, modality: ex.modality, stability: 0, difficulty: 0, reps: 0, lapses: 0 };
      const elapsedDays = old.lastReview ? Math.max(0, Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / DAY) - Math.floor(+new Date(new Date(old.lastReview).toISOString().slice(0, 10)) / DAY)) : 0;
      const next = preview(old, elapsedDays)[result.rating - 1];
      const history = [...(Array.isArray(old.history) ? old.history : []), { at: now.toISOString(), stability: old.stability, due: old.due || null }].slice(-30);
      state.cards[ex.cardKey] = { ...old, ...next, history, seeded: false, itemId: ex.wordId, modality: ex.modality, reps: (old.reps || 0) + 1, lapses: (old.lapses || 0) + (result.rating === 1 ? 1 : 0), state: 'review', lastReview: now.toISOString(), lastAttemptDay: key, due: new Date(+now + next.scheduledDays * DAY).toISOString() };
      d.attempted.push(ex.wordId);
    }
    if (result.correct && !d.reviewed.includes(ex.wordId)) d.reviewed.push(ex.wordId);
    session.answered++; if (result.correct) session.correct++;
    session.types.push(ex.type); session.index++; session.current = null;
    if (!result.correct) {
      for (const entry of session.queue.slice(session.index)) if (entry.wordId === ex.wordId) entry.notBefore = session.answered + CONFIG.retryAfter;
      // Fill a short tail with already-seen practice so retries really have three intervening cards.
      const filler = session.pool.filter(id => id !== ex.wordId);
      let gap = session.queue.length - session.index;
      while (gap < CONFIG.retryAfter && filler.length && (session.mode !== 'cat' || session.queue.length < session.budget)) {
        session.queue.push({ wordId: filler[gap % filler.length], recognition: true, practice: true }); gap++;
      }
      session.queue.splice(Math.min(session.queue.length, session.index + CONFIG.retryAfter), 0, { wordId: ex.wordId, retryType: ex.type, practiceOnly, notBefore: session.answered + CONFIG.retryAfter });
    } else {
      session.queue = session.queue.filter((entry, i) => i < session.index || entry.wordId !== ex.wordId || !entry.retryType);
    }
    session.done = session.index >= session.queue.length || (session.mode === 'cat' && session.answered >= session.budget);
    const remaining = session.done ? 0 : Math.min(session.queue.length - session.index, session.mode === 'cat' ? session.budget - session.answered : Infinity);
    return { ...result, wordId: ex.wordId, potId: ex.potId, answer: ex.answer, sentence: ex.sentence, audioId: ex.audioId, scheduled, practiceOnly, done: session.done, remaining };
  }
  function settleGrowth(original, words, options) {
    const state = JSON.parse(JSON.stringify(original)); ensure(state);
    const today = dayKey(options && options.now), todayN = dayNumber(today);
    const g = state.growth || (state.growth = { pots: {}, lastSettlement: null, lastRevealDay: null });
    if (!g.pots) g.pots = {};
    if (g.lastSettlement && dayNumber(g.lastSettlement) >= todayN) return { state, reveal: null, settledDays: 0 };
    const previous = g.lastSettlement ? dayNumber(g.lastSettlement) : todayN - 1;
    const count = Math.min(7, Math.max(0, todayN - previous));
    const ids = [...new Set(words.map(w => String(w.potId == null ? w.pot || 1 : w.potId)))];
    const thresholds = [1, 3, 6, 10, 15], minimums = [0, .15, .3, .45, .6];
    for (let n = count - 1; n >= 0; n--) {
      const settlementDay = shiftDay(today, -n);
      for (const id of ids) {
        const p = g.pots[id] || (g.pots[id] = { G: 0, stage: 0, shownStage: 0, condition: 'healthy', lastReveal: null });
        const all = words.filter(w => String(w.potId == null ? w.pot || 1 : w.potId) === id && (w.growthEligible !== false || seen(state, w)));
        const known = all.filter(w => introduced(state, w) && (!state.words[w.id] || !state.words[w.id].introducedAt || dayKey(state.words[w.id].introducedAt) <= settlementDay));
        // A later review must not retroactively grow a plant on missed mornings.
        const historicalCards = w => cardsFor(state, w.id).filter(active).map(c => {
          const nextReview = (Array.isArray(c.history) ? c.history : []).find(h => h && Number.isFinite(+new Date(h.at)) && dayKey(h.at) >= settlementDay);
          if (nextReview) return { ...c, stability: nextReview.stability, due: nextReview.due };
          if (c.lastReview && dayKey(c.lastReview) >= settlementDay) return { ...c, stability: 0 };
          return c;
        });
        const historicalStability = w => { const cs = historicalCards(w); return cs.length ? Math.min(...cs.map(c => Number(c.stability) || 0)) : 0; };
        const M = known.length ? known.reduce((sum, w) => sum + Math.min(1, Math.log1p(historicalStability(w)) / Math.log(31)), 0) / known.length : 0;
        let dueDays = 0, completedDays = 0;
        for (let i = 1; i <= 7; i++) {
          const history = state.days[shiftDay(settlementDay, -i)]; if (!history) continue;
          const due = (history.due || []).filter(wid => all.some(w => w.id === wid));
          if (due.length) { dueDays++; if (due.every(wid => (history.reviewed || []).includes(wid))) completedDays++; }
        }
        const C = dueDays ? completedDays / dueDays : 0, V = all.length ? known.length / all.length : 0;
        p.M = M; p.C = C; p.V = V; p.care = .6 * M + .25 * C + .15 * V;
        p.G = Math.max(0, Number(p.G) || 0) + Math.max(0, p.care - .3);
        const offset = .9 + (hash(id) % 2001) / 10000;
        for (let k = 0; k < 5; k++) if (p.G >= thresholds[k] * offset && M >= minimums[k]) p.stage = Math.max(p.stage, k + 1);
        const overdue = age => all.filter(w => historicalCards(w).some(c => c.due && dayNumber(settlementDay) - dayNumber(dayKey(c.due)) >= age)).length > all.length / 2;
        const condition = overdue(14) ? 'dormant' : overdue(3) ? 'wilted' : 'healthy';
        if (p.condition !== 'healthy' && condition === 'healthy') p.wakePending = true;
        if (condition !== 'healthy') p.wakePending = false;
        p.condition = condition;
      }
    }
    g.lastSettlement = today;
    let reveal = null;
    if (g.lastRevealDay !== today) {
      for (const id of ids) {
        const p = g.pots[id];
        if ((p.stage > (p.shownStage || 0) || p.wakePending) && (!p.lastReveal || todayN - dayNumber(p.lastReveal) >= 2)) {
          reveal = { potId: id, from: p.shownStage || 0, to: p.stage, kind: p.wakePending ? 'wake' : 'growth' };
          p.shownStage = p.stage; p.wakePending = false; p.lastReveal = today; g.lastRevealDay = today; break;
        }
      }
    }
    return { state, reveal, settledDays: count };
  }
  const api = { CONFIG, MODALITY, dayKey, normalize, grade, nextState, preview, createSession, current, answer, settleGrowth, stability };
  root.Day8Engine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
