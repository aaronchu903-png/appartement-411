/* Read-only migration from Jinyi's old game; writes only a411app.v1.state.
 * importData is transactional and does not access storage. Unnamed legacy
 * files require allowLegacy:true. No storage enumeration or active-profile read.
 */
(function (root) {
  'use strict';
  const KEY = 'a411app.v1.state';
  const OLD_KEYS = Object.freeze(['a411.p.jinyi.learn', 'a411.p.jinyi.story', 'a411.p.jinyi.uiLang']);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const object = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const safeId = s => typeof s === 'string' && s.trim().length > 0 && !/["'`<>&\u0000-\u001f\u007f-\u009f]/.test(s) && !['__proto__', 'constructor', 'prototype'].includes(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  function iso(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
    const d = new Date(value), day = value.slice(0, 10), check = new Date(day + 'T00:00:00Z');
    if (!Number.isFinite(+d) || !Number.isFinite(+check) || check.toISOString().slice(0, 10) !== day) return null;
    return d.toISOString();
  }
  function nowISO(options) { const d = new Date(options && options.now != null ? options.now : Date.now()); if (!Number.isFinite(+d)) throw new Error('Invalid date'); return d.toISOString(); }
  function cleanWord(record) {
    if (!object(record)) return null;
    const word = clone(record);
    for (const field of ['fr', 'zh', 'en', 'para', 'definition', 'sentence', 'sentenceZh', 'sentenceEn', 'answer', 'cloze', 'lemma', 'word', 'display', 'surface', 'pos', 'gender', 'number', 'field', 'phonetic', 'source', 'infinitive']) {
      if (own(word, field) && typeof word[field] !== 'string') delete word[field];
    }
    for (const field of ['id', 'scene', 'audioId', 'clip', 'wordClip']) if (own(word, field) && !safeId(word[field])) delete word[field];
    for (const field of ['scenes', 'legacyIds', 'homophones', 'chunks', 'accepted', 'forms', 'tags']) if (own(word, field)) {
      word[field] = Array.isArray(word[field]) ? word[field].filter(value => typeof value === 'string' && value.trim() && (!['scenes', 'legacyIds', 'homophones'].includes(field) || safeId(value))) : [];
    }
    for (const field of ['met', 'collected', 'introduced', 'seen', 'recorded', 'recognitionOnly', 'rare', 'growthEligible']) if (own(word, field) && typeof word[field] !== 'boolean') delete word[field];
    for (const field of ['pot', 'potId', 'week']) if (own(word, field) && (!Number.isInteger(word[field]) || word[field] < 1)) delete word[field];
    for (const field of ['at', 'introducedAt']) if (own(word, field) && !iso(word[field])) delete word[field];
    for (const field of ['gloss', 'conjugated', 'lexicon', 'say']) if (own(word, field) && !object(word[field])) delete word[field];
    if (word.gloss) {
      for (const field of ['zh', 'en', 'fr']) if (own(word.gloss, field) && typeof word.gloss[field] !== 'string') delete word.gloss[field];
      if (own(word.gloss, 'defs')) word.gloss.defs = Array.isArray(word.gloss.defs) ? word.gloss.defs.filter(d => object(d) && typeof d.text === 'string') : [];
    }
    if (word.conjugated && typeof word.conjugated.infinitive !== 'string') delete word.conjugated.infinitive;
    if (own(word, 'encounters')) word.encounters = Array.isArray(word.encounters) ? word.encounters.filter(object).map(entry => {
      const encounter = {};
      for (const field of ['id', 'scene', 'text', 'fr', 'zh', 'en']) if (typeof entry[field] === 'string' && (!['id', 'scene'].includes(field) || safeId(entry[field]))) encounter[field] = entry[field];
      if (Number.isInteger(entry.day) && entry.day > 0) encounter.day = entry.day;
      return encounter;
    }) : [];
    return word;
  }
  function cleanWordMaps(state) {
    for (const field of ['words', 'customWords']) {
      if (!own(state, field)) continue;
      if (!object(state[field])) { state[field] = {}; continue; }
      for (const [id, record] of Object.entries(state[field])) {
        const word = safeId(id) && cleanWord(record);
        if (!word || (field === 'customWords' && (typeof word.fr !== 'string' || !word.fr.trim()))) { delete state[field][id]; continue; }
        if (field === 'customWords') {
          word.id = id;
          word.sentence = word.sentence || word.fr;
          word.answer = word.answer || word.fr;
          if (!word.chunks || !word.chunks.length) word.chunks = word.sentence.split(/\s+/);
        }
        state[field][id] = word;
      }
    }
  }
  function inspect(input) {
    let nodes = 0; const seen = new Set();
    function walk(value, depth) {
      if (++nodes > 100000 || depth > 64) throw new Error('Import is too large or deeply nested');
      if (typeof value === 'string') {
        if (/yuechao/i.test(value)) throw new Error('Yuechao data is protected and cannot be imported');
        // Bundles can contain the original JSON strings as storage-key values.
        if (/^\s*[\[{]/.test(value)) { let decoded; try { decoded = JSON.parse(value); } catch (_) { return; } walk(decoded, depth + 1); }
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (seen.has(value)) throw new Error('Cyclic import'); seen.add(value);
      if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Invalid object prototype');
      for (const key of Object.keys(value)) {
        if (!safeId(key)) throw new Error('Unsafe object key: ' + key);
        if (/yuechao/i.test(key)) throw new Error('Yuechao data is protected and cannot be imported');
        if (['profileId', 'activeProfile', 'profile'].includes(key) && typeof value[key] === 'string' && value[key].toLowerCase() !== 'jinyi') throw new Error('Only the Jinyi profile may be imported');
        walk(value[key], depth + 1);
      }
      seen.delete(value);
    }
    walk(input, 0);
  }
  function fresh(words, options) {
    const now = nowISO(options);
    const state = { schema: 'day8-1', profileId: 'jinyi', createdAt: now, cards: {}, words: {}, days: {},
      growth: { pots: {}, lastSettlement: null, lastRevealDay: null }, story: {}, settings: { uiLang: 'zh' }, rawCards: {}, unknownCards: {}, legacy: {} };
    for (const w of words || []) {
      if (!safeId(w.id)) continue;
      const met = w.seen === true || (w.seen !== false && Number(w.week || 1) === 1);
      state.words[w.id] = { met, collected: false, introduced: met };
      if (met) state.cards[w.id + '|listening'] = { itemId: w.id, modality: 'listening', stability: 1, difficulty: 5, reps: 1, lapses: 0, due: now, lastReview: null, state: 'review', seeded: true };
    }
    return state;
  }
  function mapping(words) {
    const map = new Map();
    for (const w of words || []) if (safeId(w.id)) for (const id of Array.isArray(w.legacyIds) ? w.legacyIds : []) if (safeId(id) && !map.has(id)) map.set(id, w.id);
    for (const w of words || []) if (safeId(w.id)) map.set(w.id, w.id);
    return map;
  }
  function validGrowth(growth) {
    if (!object(growth) || !object(growth.pots)) return false;
    for (const field of ['lastSettlement', 'lastRevealDay']) if (growth[field] != null && !iso(growth[field])) return false;
    return Object.values(growth.pots).every(p => object(p) && (p.G == null || typeof p.G === 'number' && Number.isFinite(p.G) && p.G >= 0)
      && ['stage', 'shownStage'].every(k => p[k] == null || Number.isInteger(p[k]) && p[k] >= 0 && p[k] <= 5)
      && (p.lastReveal == null || !!iso(p.lastReveal)) && (p.condition == null || ['healthy', 'wilted', 'dormant'].includes(p.condition)));
  }
  function importData(raw, currentState, words, options) {
    const report = { cards: 0, words: 0, stories: 0, unknownCards: [], invalidCards: [], warnings: [], sources: [] };
    try {
      options = options || {};
      if (typeof raw === 'string' && raw.length > 10000000) throw new Error('Import is too large');
      const input = typeof raw === 'string' ? JSON.parse(raw) : raw;
      inspect(input);
      if (!object(input) && !Array.isArray(input)) throw new Error('Expected a JSON object or bundle');
      const out = currentState ? clone(currentState) : fresh(words, options);
      cleanWordMaps(out);
      const catalog = [...(options.catalog || []), ...(words || []), ...Object.values(out.customWords || {})].filter(w => object(w) && safeId(w.id));
      const map = mapping(catalog), catalogById = new Map(catalog.map(w => [w.id, w]));
      const builtIn = new Set((words || []).map(w => w.id));
      for (const key of ['cards', 'words', 'days', 'rawCards', 'unknownCards', 'legacy', 'story', 'settings']) if (!object(out[key])) out[key] = {};
      let recognized = false;
      function hydrate(id, record) {
        if (!safeId(id) || builtIn.has(id)) return;
        const source = cleanWord(catalogById.get(id) || record);
        if (!object(source)) return;
        const fr = source.fr || source.display || source.lemma || source.word;
        if (typeof fr !== 'string' || !fr.trim()) return;
        const gloss = object(source.gloss) ? source.gloss : {};
        const sentence = record && typeof record.sentence === 'string' && record.sentence || source.sentence || fr;
        const word = { ...clone(source), id, fr, zh: source.zh || gloss.zh || '', en: source.en || gloss.en || '', sentence,
          answer: source.answer || source.lemma || fr, chunks: Array.isArray(source.chunks) ? source.chunks : sentence.split(/\s+/),
          pos: source.pos || 'other', gender: source.gender || null, field: source.field || 'collected',
          pot: source.pot || 2, potId: source.potId || source.pot || 2, week: source.week || 2, seen: true,
          recognitionOnly: source.recognitionOnly == null ? true : !!source.recognitionOnly, legacyIds: source.legacyIds || [] };
        if (!object(out.customWords)) out.customWords = {};
        if (!out.customWords[id]) out.customWords[id] = word;
        catalogById.set(id, out.customWords[id]); map.set(id, id);
        for (const alias of word.legacyIds) if (safeId(alias) && !map.has(alias)) map.set(alias, id);
      }
      function mergeCard(key, card) {
        if (!safeId(key)) return;
        out.rawCards[key] = clone(card);
        if (!object(card)) { report.invalidCards.push(key); return; }
        const split = key.lastIndexOf('|');
        const oldId = card.itemId || (split >= 0 ? key.slice(0, split) : key);
        const id = map.get(oldId), modality = card.modality || (split >= 0 ? key.slice(split + 1) : 'listening');
        if (!id || !['listening', 'reading', 'production'].includes(modality)) { out.unknownCards[key] = clone(card); report.unknownCards.push(key); return; }
        const numeric = { stability: [0, 36500], difficulty: [0, 10], reps: [0, 100000000], lapses: [0, 100000000], scheduledDays: [0, 36503] };
        const normalized = { ...clone(card), itemId: id, modality };
        let invalid = false;
        for (const [field, [min, max]] of Object.entries(numeric)) {
          const value = card[field] == null ? 0 : card[field];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (['reps', 'lapses', 'scheduledDays'].includes(field) && !Number.isInteger(value))) invalid = true;
          normalized[field] = value;
        }
        for (const field of ['due', 'lastReview']) {
          const value = card[field] == null ? null : iso(card[field]);
          if (card[field] != null && !value) invalid = true;
          normalized[field] = value;
        }
        for (const field of ['suspended', 'leech']) if (card[field] != null && typeof card[field] !== 'boolean') invalid = true;
        if (invalid) { report.invalidCards.push(key); return; }
        hydrate(id);
        for (const [seedKey, seedCard] of Object.entries(out.cards)) if (seedCard.itemId === id && seedCard.seeded) delete out.cards[seedKey];
        const target = id + '|' + modality, existing = out.cards[target];
        if (!existing || existing.seeded || +new Date(normalized.lastReview || 0) > +new Date(existing.lastReview || 0) || (+new Date(normalized.lastReview || 0) === +new Date(existing.lastReview || 0) && normalized.reps > (existing.reps || 0))) {
          out.cards[target] = normalized; report.cards++;
        }
        out.words[id] = { ...(out.words[id] || {}), met: true, introduced: normalized.reps > 0 || normalized.stability > 0 || !!(out.words[id] && out.words[id].introduced) };
        return true;
      }
      function carnet(data) {
        const list = Array.isArray(data) ? data : data && data.words;
        if (!Array.isArray(list)) { report.warnings.push('Invalid carnet words'); return; }
        for (const entry of list) {
          if (!object(entry) || !safeId(entry.id)) { report.warnings.push('Invalid carnet entry'); continue; }
          const id = map.get(entry.id) || entry.id;
          hydrate(id, entry);
          const previous = out.words[id] || {}, at = iso(entry.at);
          if (!previous.collected) report.words++;
          out.words[id] = { ...cleanWord(entry), ...previous, met: true, collected: true, introduced: !!previous.introduced };
          if (at && (!previous.at || +new Date(at) < +new Date(previous.at))) out.words[id].at = at;
          else if (!at && !previous.at) delete out.words[id].at;
          if (entry.at && !at) report.warnings.push('Invalid collection date: ' + entry.id);
        }
      }
      function learn(data) {
        if (!object(data)) throw new Error('Invalid learn record');
        recognized = true; report.sources.push('learn');
        if (data.carnet) carnet(data.carnet);
        for (const item of Array.isArray(data.extraItems) ? data.extraItems : []) if (object(item) && safeId(item.id)) hydrate(map.get(item.id) || item.id, item);
        if (object(data.cards)) for (const key of Object.keys(data.cards)) mergeCard(key, data.cards[key]);
        else if (data.cards != null) report.warnings.push('Invalid cards map');
        // Keep original evidence/days/unknown extensions without treating them as new app history.
        const previous = out.legacy.learn;
        if (!previous || +new Date(data.updatedAt || 0) >= +new Date(previous.updatedAt || 0)) out.legacy.learn = clone(data);
      }
      function story(data) {
        if (!object(data)) throw new Error('Invalid story record');
        recognized = true; report.sources.push('story');
        const previous = out.legacy.story;
        if (!previous || +new Date(data.updatedAt || 0) >= +new Date(previous.updatedAt || 0)) {
          out.legacy.story = clone(data);
          const chapter = data.week && data.week.chapters && data.week.chapters.d7;
          const ending = data.week && data.week.recordedEnding;
          const flags = { ...(data.flags || {}), ...(data.week && data.week.flags || {}), ...(data.world && data.world.choices || {}), ...(chapter && chapter.choices || {}) };
          const band = data.d7_band || (ending && ending.band) || flags.d7_band || (data.week && data.week.d7_band);
          if (typeof band === 'string') out.story.d7_band = band;
          const name = data.playerName || (data.player && (data.player.nickname || data.player.name)) || data.name;
          if (typeof name === 'string') out.story.playerName = name.slice(0, 100);
          out.story.flags = { ...(out.story.flags || {}), ...flags };
          if (data.day7Completed || (chapter && chapter.status === 'complete') || (data.week && Array.isArray(data.week.done) && data.week.done.includes('d7')) || (data.week && Number(data.week.day) >= 8)) out.story.day7Completed = true;
          report.stories++;
        }
      }
      function parse(value) { return typeof value === 'string' ? JSON.parse(value) : value; }
      function visit(value, authorized, hint) {
        value = parse(value);
        if (Array.isArray(value)) { for (const part of value) visit(part, authorized); return; }
        if (!object(value)) throw new Error('Invalid import component');
        const identified = value.profileId === 'jinyi' || value.profile === 'jinyi';
        authorized = authorized || identified;
        if (value.schema === 'day8-1' && authorized) {
          // New-app exports merge rather than overwrite newer local scheduling.
          recognized = true; report.sources.push('day8');
          for (const [id, record] of Object.entries(object(value.customWords) ? value.customWords : {})) if (object(record)) hydrate(id, record);
          for (const [key, card] of Object.entries(value.cards || {})) mergeCard(key, card);
          for (const [id, rawRecord] of Object.entries(object(value.words) ? value.words : {})) if (safeId(id) && object(rawRecord)) {
            const record = cleanWord(rawRecord);
            const old = out.words[id] || {};
            out.words[id] = { ...clone(record), ...old, met: !!(old.met || record.met), collected: !!(old.collected || record.collected), introduced: !!(old.introduced || record.introduced) };
            if (iso(record.at) && (!old.at || +new Date(record.at) < +new Date(old.at))) out.words[id].at = iso(record.at);
            for (const field of ['at', 'introducedAt']) if (out.words[id][field] != null && !iso(out.words[id][field])) { delete out.words[id][field]; report.warnings.push('Invalid word date: ' + id); }
          }
          for (const [key, history] of Object.entries(value.days || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(key) && iso(key) && object(history)) {
            const d = out.days[key] || (out.days[key] = {});
            for (const field of ['introduced', 'attempted', 'due', 'reviewed']) d[field] = [...new Set([...(Array.isArray(d[field]) ? d[field] : []), ...(Array.isArray(history[field]) ? history[field].filter(safeId) : [])])];
          }
          // A Day8 export already carries the original source cards. Do not
          // replace that archive with the normalized active-card representation.
          if (object(value.rawCards)) out.rawCards = { ...out.rawCards, ...clone(value.rawCards) };
          if (object(value.unknownCards)) out.unknownCards = { ...clone(value.unknownCards), ...out.unknownCards };
          if (object(value.story)) {
            const incoming = clone(value.story), local = out.story;
            const progressed = local.day8Complete || Number(local.day8Index) > 0;
            out.story = progressed ? { ...incoming, ...local } : { ...local, ...incoming };
            // UI defaults are not progress. Keep an imported index and its migration stamps together.
            const cursor = progressed ? local : incoming;
            if (own(cursor, 'day8Index')) {
              for (const key of ['day8Version', 'day8SceneId']) if (!own(cursor, key)) delete out.story[key];
            }
          }
          if (value.growth && !validGrowth(value.growth)) report.warnings.push('Invalid plant history');
          else if (value.growth && (!out.growth || !out.growth.lastSettlement || (iso(value.growth.lastSettlement) && value.growth.lastSettlement > out.growth.lastSettlement))) out.growth = clone(value.growth);
          if (value.settings && ['zh', 'en'].includes(value.settings.uiLang)) out.settings = { ...out.settings, ...clone(value.settings) };
          if (object(value.legacy)) out.legacy = { ...clone(value.legacy), ...out.legacy };
          // App-owned progress extensions (drafts, feedback, an in-flight queue)
          // travel with exports without replacing existing local extensions.
          for (const [key, data] of Object.entries(value)) if (key !== 'customWords' && (!own(out, key) || out[key] == null)) out[key] = clone(data);
          return;
        }
        if (value.kind && /^a411-sync-(learn|story|carnet)$/.test(value.kind)) {
          if (!identified) throw new Error('Sync file must identify Jinyi');
          return visit(value.data, true, value.kind.slice(10));
        }
        if (value.kind === 'day8-save' || value.kind === 'a411-jinyi-export') {
          if (!authorized) throw new Error('Bundle must identify Jinyi');
          return visit(value.data || value.bundle, true);
        }
        let hasParts = false;
        for (const name of ['learn', 'story', 'carnet']) if (value[name] != null && !(name === 'carnet' && value.cards)) {
          hasParts = true; visit(value[name], authorized, name);
        }
        for (const key of OLD_KEYS) if (own(value, key)) {
          hasParts = true;
          if (key.endsWith('uiLang')) { const lang = value[key]; if (['zh', 'en'].includes(lang)) out.settings.uiLang = lang; }
          else visit(value[key], true, key.endsWith('learn') ? 'learn' : 'story');
        }
        if (['zh', 'en'].includes(value.uiLang)) out.settings.uiLang = value.uiLang;
        if (hasParts) return;
        if (value.data && !hint) return visit(value.data, authorized);
        if (value.save && !hint) return visit(value.save, authorized);
        if (!authorized && !options.allowLegacy) throw new Error('Unnamed legacy save requires explicit selection');
        if (hint === 'learn' || value.cards || value.schema === 'a411-learn-1') return learn(value);
        if (hint === 'carnet' || (Array.isArray(value.words) && !value.progress)) { recognized = true; report.sources.push('carnet'); return carnet(value); }
        if (hint === 'story' || value.progress || value.world || value.week || value.scene || value.player || value.name || value.d7_band) return story(value);
        throw new Error('Unrecognized save format');
      }
      visit(input, false);
      if (!recognized) throw new Error('No learner or story records found');
      for (const [key, card] of Object.entries(out.unknownCards)) {
        const id = object(card) && (card.itemId || key.slice(0, key.lastIndexOf('|')));
        if (map.has(id) && mergeCard(key, card)) delete out.unknownCards[key];
      }
      out.profileId = 'jinyi'; out.schema = 'day8-1';
      cleanWordMaps(out);
      report.sources = [...new Set(report.sources)];
      report.unknownCards = [...new Set(report.unknownCards)].filter(key => own(out.unknownCards, key));
      return { ok: true, state: out, report };
    } catch (error) { return { ok: false, state: currentState || null, report, error: String(error.message || error) }; }
  }
  function detect(storage) {
    try {
      const data = {}; let present = false;
      for (const key of OLD_KEYS) {
        const raw = storage.getItem(key);
        if (raw != null && raw !== '') { data[key] = key.endsWith('uiLang') ? raw.replace(/^"|"$/g, '') : JSON.parse(raw); if (!key.endsWith('uiLang')) present = true; }
      }
      inspect(data);
      const learn = data[OLD_KEYS[0]] || {};
      return { available: present, bundle: present ? { kind: 'a411-jinyi-export', schema: 1, profileId: 'jinyi', data } : null,
        counts: { cards: object(learn.cards) ? Object.keys(learn.cards).length : 0, words: learn.carnet && Array.isArray(learn.carnet.words) ? learn.carnet.words.length : 0 } };
    } catch (error) { return { available: false, bundle: null, counts: { cards: 0, words: 0 }, error: String(error.message || error) }; }
  }
  function exportLegacy(storage) { const result = detect(storage); return { ...result, ok: result.available, text: result.available ? JSON.stringify(result.bundle, null, 2) : null }; }
  function exportData(state) { inspect(state); return JSON.stringify({ kind: 'day8-save', schema: 1, profileId: 'jinyi', data: state }, null, 2); }
  function save(storage, state) {
    try {
      inspect(state);
      if (state.profileId !== 'jinyi' || state.schema !== 'day8-1') throw new Error('Invalid Day8 state');
      // Even an incorrectly placed protected save must not be overwritten by a fresh fallback.
      if (typeof storage.getItem === 'function') inspect(storage.getItem(KEY));
      storage.setItem(KEY, JSON.stringify(state)); return { ok: true };
    }
    catch (error) { return { ok: false, error: String(error.message || error) }; }
  }
  function load(storage, words, options) {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return { ok: true, state: fresh(words, options), found: false };
      const value = JSON.parse(raw); inspect(value);
      if (value.schema !== 'day8-1' || value.profileId !== 'jinyi' || !object(value.cards) || !object(value.words) || !object(value.days) || !object(value.story) || !object(value.settings)) throw new Error('Invalid Day8 state');
      for (const c of Object.values(value.cards)) {
        if (!object(c) || !safeId(c.itemId) || !['listening', 'reading', 'production'].includes(c.modality)
          || !Number.isFinite(c.stability) || c.stability < 0 || c.stability > 36500 || !Number.isFinite(c.difficulty) || c.difficulty < 0 || c.difficulty > 10
          || (c.due != null && !iso(c.due)) || (c.lastReview != null && !iso(c.lastReview))) throw new Error('Invalid saved review card');
      }
      if (value.growth && !validGrowth(value.growth)) throw new Error('Invalid saved plant history');
      cleanWordMaps(value);
      return { ok: true, state: value, found: true };
    } catch (error) { return { ok: false, state: fresh(words, options), found: false, error: String(error.message || error) }; }
  }
  const api = { KEY, OLD_KEYS, fresh, importData, detect, load, save, exportData, exportLegacy };
  root.Day8Save = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
