/* L’Appartement 411 — pure logic: save schema, validation, migration, storage,
 * world/plant/learning rules and summaries. No DOM access; runs in browser and Node. */
(function (root) {
  'use strict';
  var C = (root.A411 && root.A411.Content) || (typeof require !== 'undefined' ? require('./content.js') : null);

  var SCHEMA_VERSION = 1;
  var APP_VERSION = '0.1.3';
  var KEY = 'a411.save';
  var TMP_KEY = 'a411.save.tmp';
  var BACKUP_PREFIX = 'a411.backup.';
  // Keys used before the 2026-10-08 rename (v0.1.0, "Appartement 404"). Read-only: this app never
  // writes or deletes them. They are adopted once into the new keys when no new save exists yet.
  // (GitHub Pages serves both the old and new repo paths from the same origin, so a save made on
  // /appartement-404/ is visible to /appartement-411/ under these keys.)
  var LEGACY_KEY = 'a404.save';
  var LEGACY_TMP_KEY = 'a404.save.tmp';
  var LEGACY_BACKUP_PREFIX = 'a404.backup.';
  var MAX_BACKUPS = 5;
  var MAX_IMPORT_CHARS = 1000000;

  var ENUM = {
    scene: C.ORDER.slice(),
    modality: ['listening', 'reading', 'listening+reading', 'writing', 'selection', 'gesture', 'unknown'],
    audioStatus: ['played', 'failed', 'unavailable', 'not_used', 'unknown'],
    resultType: ['exposure', 'supported', 'independent', 'baseline', 'unknown'],
    evidenceKind: ['encounter', 'supported_understanding', 'discrimination', 'production', 'baseline', 'choice', 'unknown'],
    careState: ['thirsty', 'watered']
  };

  function nowISO(d) { return (d || new Date()).toISOString(); }
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  function newSave(opts) {
    opts = opts || {};
    var t = nowISO(opts.now);
    return {
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      contentVersion: C.CONTENT_VERSION,
      saveId: rid(),
      createdAt: t,
      updatedAt: t,
      settings: { supportLevel: 3, reducedMotion: !!opts.reducedMotion, largeText: false, speechRate: 0.85 },
      progress: { episode: 1, scene: 'baseline', step: 0, status: 'in_progress', probe: null, baseline: null, draft: '' },
      world: {
        completedEvents: [],
        choices: {},
        facts: { catInApartment: false },
        knowledge: {
          camille: { playerName: null, knowsCat: false, heardPlayerAnswer: false },
          noe: { playerName: null, knowsCat: true, heardPlayerAnswer: false, playerStanceOnSecret: null },
          player: { knowsCat: false, metCamille: false, metNoe: false }
        },
        relationships: { camille: { notes: [] }, noe: { secretPromise: null, notes: [] } }
      },
      player: { nickname: null },
      plant: { careState: 'thirsty', lastCareAt: null, careLog: [], growth: 0, mementos: [] },
      learning: { attempts: [], helpLog: [], supportByTarget: {}, baseline: { status: 'not_started', items: [] } },
      review: [],
      diary: { chronicle: [], journal: [] },
      meta: { audio: { engine: 'speechSynthesis', status: 'unknown', voice: null, checkedAt: null }, migratedFrom: null, recovery: [] }
    };
  }

  // ---------- Validation ----------
  function validateSave(s) {
    var e = [];
    function req(cond, msg) { if (!cond) e.push(msg); }
    if (!isObj(s)) return { ok: false, errors: ['存档不是 JSON 对象 / not an object'] };
    req(s.schemaVersion === SCHEMA_VERSION, 'schemaVersion 必须是 ' + SCHEMA_VERSION);
    req(typeof s.appVersion === 'string', 'appVersion 缺失');
    req(typeof s.contentVersion === 'string', 'contentVersion 缺失');
    req(typeof s.saveId === 'string', 'saveId 缺失');
    req(isObj(s.settings) && [0, 1, 2, 3].indexOf(s.settings.supportLevel) >= 0, 'settings.supportLevel 必须是 0–3');
    var p = s.progress;
    req(isObj(p), 'progress 缺失');
    if (isObj(p)) {
      req(Number.isInteger(p.episode) && p.episode >= 1 && p.episode <= 7, 'progress.episode 无效');
      req(ENUM.scene.indexOf(p.scene) >= 0, 'progress.scene 无效');
      req(Number.isInteger(p.step) && p.step >= 0 && C.SCENES[p.scene] && p.step < C.SCENES[p.scene].length, 'progress.step 无效');
      req(p.status === 'in_progress' || p.status === 'complete', 'progress.status 无效');
    }
    var w = s.world;
    req(isObj(w), 'world 缺失');
    if (isObj(w)) {
      req(Array.isArray(w.completedEvents) && w.completedEvents.every(function (x) { return typeof x === 'string'; }), 'world.completedEvents 无效');
      req(isObj(w.choices), 'world.choices 无效');
      req(isObj(w.knowledge) && isObj(w.knowledge.camille) && isObj(w.knowledge.noe) && isObj(w.knowledge.player), 'world.knowledge 无效');
      req(isObj(w.relationships), 'world.relationships 无效');
    }
    var pl = s.plant;
    req(isObj(pl), 'plant 缺失');
    if (isObj(pl)) {
      req(ENUM.careState.indexOf(pl.careState) >= 0, 'plant.careState 无效');
      req(Array.isArray(pl.careLog), 'plant.careLog 无效');
      if (Array.isArray(pl.careLog)) {
        var ids = pl.careLog.map(function (c) { return c && c.actionId; });
        req(ids.every(function (x) { return typeof x === 'string'; }), 'plant.careLog 项目无效');
        req(new Set(ids).size === ids.length, 'plant.careLog 有重复的照料记录');
      }
    }
    var L = s.learning;
    req(isObj(L) && Array.isArray(L.attempts) && Array.isArray(L.helpLog) && isObj(L.supportByTarget), 'learning 无效');
    if (isObj(L) && Array.isArray(L.attempts)) {
      L.attempts.forEach(function (a, i) {
        if (!isObj(a)) { e.push('learning.attempts[' + i + '] 不是对象'); return; }
        if (!(a.target === null || typeof a.target === 'string')) e.push('attempts[' + i + '].target 无效');
        if (ENUM.modality.indexOf(a.modality) < 0) e.push('attempts[' + i + '].modality 无效');
        if (ENUM.audioStatus.indexOf(a.audioStatus) < 0) e.push('attempts[' + i + '].audioStatus 无效');
        if (ENUM.resultType.indexOf(a.resultType) < 0) e.push('attempts[' + i + '].resultType 无效');
        if (!Number.isInteger(a.replays) || a.replays < 0) e.push('attempts[' + i + '].replays 无效');
        if (typeof a.at !== 'string' || isNaN(Date.parse(a.at))) e.push('attempts[' + i + '].at 无效');
        if (typeof a.contentVersion !== 'string') e.push('attempts[' + i + '].contentVersion 无效');
        if (!isObj(a.visibleSupport)) e.push('attempts[' + i + '].visibleSupport 无效');
      });
    }
    req(Array.isArray(s.review), 'review 无效');
    var d = s.diary;
    req(isObj(d) && Array.isArray(d.chronicle) && Array.isArray(d.journal), 'diary 无效');
    if (isObj(d) && Array.isArray(d.journal)) {
      d.journal.forEach(function (j, i) {
        if (!isObj(j) || typeof j.original !== 'string' || j.original.length > 4000) e.push('diary.journal[' + i + '] 无效');
      });
    }
    if (isObj(d) && Array.isArray(d.chronicle)) {
      d.chronicle.forEach(function (c, i) { if (!isObj(c) || !C.CHRONICLE[c.eventId]) e.push('diary.chronicle[' + i + '] 未知事件'); });
    }
    req(isObj(s.meta), 'meta 缺失');
    return { ok: e.length === 0, errors: e };
  }

  // ---------- Migration ----------
  // v0 = the pre-release test format (flat object, {v:0,...}). No real v0 saves were ever
  // distributed; the path exists so later schema changes follow the same backup->migrate->validate route.
  var V0_SCENE = { door: 'doorway', doorway: 'doorway', name: 'name', plant: 'plant', cat: 'cat', quiz: 'probe', probe: 'probe', diary: 'diary', end: 'end' };
  var V0_TARGET = { 'salut !': 'salut', 'bonjour !': 'bonjour', "tu t'appelles comment ?": 'tu_tappelles_comment', "je m'appelle": 'je_mappelle' };

  function detectVersion(obj) {
    if (!isObj(obj)) return null;
    if (typeof obj.schemaVersion === 'number') return obj.schemaVersion;
    if (obj.v === 0 || obj.version === 0) return 0;
    return null;
  }

  function migrateV0toV1(v0, now) {
    var s = newSave({ now: now });
    var at = nowISO(now);
    var scene = V0_SCENE[String(v0.scene || '').toLowerCase()] || 'doorway';
    s.progress.scene = scene; s.progress.step = 0;
    if (scene === 'end') s.progress.status = 'complete';
    var idx = C.ORDER.indexOf(scene);
    var nick = typeof v0.name === 'string' && v0.name.trim() ? v0.name.trim().slice(0, 40) : null;
    s.player.nickname = nick;
    if (idx > C.ORDER.indexOf('name') && nick) { s.world.knowledge.camille.playerName = nick; s.world.knowledge.noe.playerName = nick; }
    if (idx > C.ORDER.indexOf('doorway')) { s.world.knowledge.player.metCamille = true; s.world.knowledge.player.metNoe = true; }
    if (v0.watered === true) {
      var t = typeof v0.wateredAt === 'number' ? new Date(v0.wateredAt).toISOString() : at;
      s.plant.careState = 'watered'; s.plant.lastCareAt = t;
      s.plant.careLog.push({ actionId: 'd1.water', at: t, scene: 'plant', source: 'migrated-v0' });
    }
    if (v0.secret === 'keep' || v0.secret === 'decline') {
      s.world.choices.d1_secret = v0.secret;
      s.world.relationships.noe.secretPromise = v0.secret === 'keep' ? 'kept' : 'declined';
      s.world.knowledge.noe.playerStanceOnSecret = v0.secret;
      s.world.knowledge.player.knowsCat = true; s.world.facts.catInApartment = true;
    }
    (Array.isArray(v0.attempts) ? v0.attempts : []).forEach(function (a) {
      if (!isObj(a)) return;
      var phrase = String(a.phrase || '').toLowerCase().replace(/[\u2019]/g, "'").replace(/\s+/g, ' ').trim();
      s.learning.attempts.push(makeAttempt({
        target: V0_TARGET[phrase] || null, lesson: 'd1', contentVersion: 'v0-unknown',
        modality: 'unknown', audioStatus: 'unknown', resultType: 'unknown', evidenceKind: 'unknown',
        response: a.response != null ? String(a.response) : null, correct: typeof a.ok === 'boolean' ? a.ok : null,
        context: 'migrated-v0', at: typeof a.t === 'number' ? new Date(a.t).toISOString() : at,
        visibleSupport: { level: null, note: 'unknown (v0 did not record support)' }
      }));
    });
    if (typeof v0.journal === 'string' && v0.journal.length) {
      s.diary.journal.push({ id: 'j-v0', at: at, original: v0.journal, usedTemplate: null, suggestedRewrite: null, share: false, source: 'migrated-v0' });
    }
    s.meta.migratedFrom = 0;
    s.meta.recovery.push({ at: at, action: 'migrated v0 -> v1' });
    return s;
  }

  function migrate(obj, now) {
    var v = detectVersion(obj);
    if (v === SCHEMA_VERSION) return { save: obj, from: v };
    if (v === 0) return { save: migrateV0toV1(obj, now), from: 0 };
    if (v !== null && v > SCHEMA_VERSION) throw new Error('存档来自更新的版本 (schema ' + v + ')，当前版本无法读取');
    throw new Error('无法识别的存档格式');
  }

  function parseImport(text, now) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, errors: ['文件是空的'] };
    if (text.length > MAX_IMPORT_CHARS) return { ok: false, errors: ['文件太大'] };
    var obj;
    try { obj = JSON.parse(text); } catch (err) { return { ok: false, errors: ['不是有效的 JSON：' + err.message] }; }
    var m;
    try { m = migrate(obj, now); } catch (err) { return { ok: false, errors: [err.message] }; }
    var v = validateSave(m.save);
    if (!v.ok) return { ok: false, errors: v.errors };
    return { ok: true, save: m.save, migratedFrom: m.from === SCHEMA_VERSION ? null : m.from };
  }

  // ---------- Storage (failure-safe writes, backups, recovery) ----------
  function createStorage(ls) {
    function backup(label, raw) {
      try {
        var key = BACKUP_PREFIX + Date.now() + '.' + label;
        ls.setItem(key, typeof raw === 'string' ? raw : JSON.stringify(raw));
        var keys = listBackups().filter(function (b) { return !b.legacy; }); // legacy backups are never pruned
        while (keys.length > MAX_BACKUPS) { ls.removeItem(keys.shift().key); }
        return key;
      } catch (e) { return null; }
    }
    function listBackups() {
      var out = [];
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        var pre = k && k.indexOf(BACKUP_PREFIX) === 0 ? BACKUP_PREFIX : (k && k.indexOf(LEGACY_BACKUP_PREFIX) === 0 ? LEGACY_BACKUP_PREFIX : null);
        if (pre) {
          var parts = k.slice(pre.length).split('.');
          var legacy = pre === LEGACY_BACKUP_PREFIX;
          out.push({ key: k, time: Number(parts[0]), label: parts.slice(1).join('.') + (legacy ? '（改名前的旧备份）' : ''), legacy: legacy });
        }
      }
      return out.sort(function (a, b) { return a.time - b.time; });
    }
    function write(save) {
      save.updatedAt = nowISO();
      var raw = JSON.stringify(save);
      var v = validateSave(save);
      if (!v.ok) return { ok: false, error: 'invalid: ' + v.errors.join('; ') };
      try {
        ls.setItem(TMP_KEY, raw);
        if (ls.getItem(TMP_KEY) !== raw) throw new Error('verify failed');
        ls.setItem(KEY, raw);
        ls.removeItem(TMP_KEY);
        return { ok: true };
      } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }
    function load(now) {
      var notices = [];
      var raw = null;
      try { raw = ls.getItem(KEY); } catch (e) { return { save: null, notices: ['无法读取本机存储'], storageOk: false }; }
      var tmp = null; try { tmp = ls.getItem(TMP_KEY); } catch (e) { }
      var fromLegacy = false;
      if (!raw && !tmp) {
        // Adopt a pre-rename save. Order: verbatim backup under the new prefix -> parse/validate (or v0
        // migrate) -> verified write to the new key. The old keys are left untouched, so if any step
        // fails the original is still there and the next load simply tries again.
        var lraw = null, ltmp = null;
        try { lraw = ls.getItem(LEGACY_KEY); ltmp = ls.getItem(LEGACY_TMP_KEY); } catch (e) { }
        if (lraw || ltmp) {
          fromLegacy = true;
          backup('pre-rename-a404', lraw || ltmp);
          raw = lraw; tmp = ltmp;
        }
      }
      function adopted(save, via) {
        if (!fromLegacy) return save;
        save.meta.recovery = Array.isArray(save.meta.recovery) ? save.meta.recovery : [];
        save.meta.recovery.push({ at: nowISO(now), action: 'storage key renamed ' + via + ' -> ' + KEY + ' (Appartement 404 -> L’Appartement 411); original left in place' });
        notices.push('已沿用改名前（Appartement 404）的存档，进度不变。');
        return save;
      }
      function tryRaw(r) {
        if (!r) return null;
        var obj; try { obj = JSON.parse(r); } catch (e) { return { bad: true }; }
        var ver = detectVersion(obj);
        if (ver === SCHEMA_VERSION) { var v = validateSave(obj); return v.ok ? { save: obj } : { bad: true, errors: v.errors }; }
        if (ver === 0) {
          var bk = backup('pre-migration-v0', r);
          if (!bk) return { bad: true, errors: ['备份失败，未迁移'] };
          try {
            var m = migrate(obj, now); var v2 = validateSave(m.save);
            if (!v2.ok) return { bad: true, errors: v2.errors };
            notices.push('旧存档 (v0) 已升级到 v' + SCHEMA_VERSION + '，原始存档已备份。');
            return { save: m.save, migrated: true };
          } catch (e) { return { bad: true, errors: [e.message] }; }
        }
        return { bad: true };
      }
      var r = tryRaw(raw);
      if (r && r.save) {
        if (fromLegacy) { adopted(r.save, LEGACY_KEY); var wl = write(r.save); if (!wl.ok) notices.push('旧存档已读取，但写入新位置失败——请先导出存档。'); }
        else if (r.migrated) write(r.save);
        return { save: r.save, notices: notices, storageOk: true };
      }
      if (r && r.bad) {
        backup('corrupt-main', raw);
        var rt = tryRaw(tmp);
        if (rt && rt.save) { notices.push('主存档损坏，已从临时副本恢复（损坏版本已备份）。'); adopted(rt.save, LEGACY_TMP_KEY); write(rt.save); return { save: rt.save, notices: notices, storageOk: true }; }
        notices.push('存档无法读取，已备份损坏的数据并开始新游戏。');
        return { save: null, notices: notices, storageOk: true };
      }
      if (!raw && tmp) {
        var rt2 = tryRaw(tmp);
        if (rt2 && rt2.save) { notices.push('已从未完成的写入中恢复存档。'); adopted(rt2.save, LEGACY_TMP_KEY); write(rt2.save); return { save: rt2.save, notices: notices, storageOk: true }; }
      }
      return { save: null, notices: notices, storageOk: true };
    }
    function importText(text, current, now) {
      var r = parseImport(text, now);
      if (!r.ok) return r; // existing save untouched
      if (current) backup('pre-import', current);
      var w = write(r.save);
      if (!w.ok) return { ok: false, errors: ['写入失败：' + w.error] };
      return r;
    }
    function readBackup(key) { try { return ls.getItem(key); } catch (e) { return null; } }
    return { load: load, write: write, backup: backup, listBackups: listBackups, importText: importText, readBackup: readBackup };
  }

  // ---------- World ----------
  function recordEvent(save, eventId, params, now) {
    if (save.world.completedEvents.indexOf(eventId) >= 0) return false; // events are facts; not duplicated
    save.world.completedEvents.push(eventId);
    if (C.CHRONICLE[eventId]) save.diary.chronicle.push({ eventId: eventId, at: nowISO(now), params: params || null });
    return true;
  }

  function applySecretChoice(save, choice, now) {
    if (choice !== 'keep' && choice !== 'decline') throw new Error('bad choice');
    if (save.world.choices.d1_secret) return false; // a made choice is a fact; not silently redone
    save.world.choices.d1_secret = choice;
    save.world.relationships.noe.secretPromise = choice === 'keep' ? 'kept' : 'declined';
    save.world.knowledge.noe.playerStanceOnSecret = choice;
    // Camille was not present: her knowledge is intentionally untouched.
    recordEvent(save, choice === 'keep' ? 'secret_kept' : 'secret_declined', null, now);
    return true;
  }

  function applyName(save, cls, original, now) {
    save.world.choices.d1_name = { kind: cls.kind };
    save.player.nickname = cls.nickname || null;
    ['camille', 'noe'].forEach(function (k) {
      save.world.knowledge[k].heardPlayerAnswer = cls.kind !== 'skipped';
      save.world.knowledge[k].playerName = cls.nickname || null;
    });
    recordEvent(save, 'introduced', { kind: cls.kind, original: cls.kind === 'skipped' ? null : original }, now);
  }

  // ---------- Plant ----------
  var THIRST_AFTER_MS = 48 * 3600 * 1000; // tuning heuristic, not botany
  function waterPlant(save, actionId, scene, now) {
    var exists = save.plant.careLog.some(function (c) { return c.actionId === actionId; });
    if (exists) return { counted: false, reason: 'already' };
    var t = nowISO(now);
    save.plant.careLog.push({ actionId: actionId, at: t, scene: scene });
    save.plant.careState = 'watered';
    save.plant.lastCareAt = t;
    return { counted: true };
  }
  function plantStatus(plant, now) {
    if (plant.careState === 'watered' && plant.lastCareAt && ((now || new Date()) - new Date(plant.lastCareAt)) > THIRST_AFTER_MS) return 'thirsty';
    return plant.careState;
  }

  // ---------- Learning ----------
  function makeAttempt(f) {
    return {
      id: f.id || rid(),
      target: f.target === undefined ? null : f.target,
      lesson: f.lesson || 'd1',
      contentVersion: f.contentVersion || C.CONTENT_VERSION,
      modality: f.modality || 'unknown',
      audioStatus: f.audioStatus || 'not_used',
      visibleSupport: f.visibleSupport || {},
      replays: f.replays | 0,
      firstListen: f.firstListen === undefined ? null : f.firstListen,
      response: f.response === undefined ? null : f.response,
      correct: f.correct === undefined ? null : f.correct,
      resultType: f.resultType || 'unknown',
      evidenceKind: f.evidenceKind || 'unknown',
      production: f.production || null,
      context: f.context || null,
      speaker: f.speaker || null,
      stimulus: f.stimulus || null,
      // which device voice/rate actually played for this attempt (null = nothing played / not audio)
      audioVoice: f.audioVoice || null,
      // v0.1.3: what was actually heard — 'recording:qwen3-tts' | 'device:<voice>' | 'none'. Absent on older attempts.
      audioSource: f.audioSource || 'none',
      at: f.at || nowISO()
    };
  }

  // Result type for a comprehension probe trial. Independent only when nothing visible
  // could reveal the answer; any text/translation help makes it supported.
  function probeResultType(o) {
    if (o.subtitlesShown || o.chineseShown || o.answerCue) return 'supported';
    return 'independent';
  }
  function probeModality(audioStatus, subtitlesShown) {
    if (audioStatus === 'played') return subtitlesShown ? 'listening+reading' : 'listening';
    return 'reading';
  }

  // "Tu t'appelles comment ?" response classification. Never infers gender; never requires real data.
  function classifyNameResponse(text) {
    var t = String(text == null ? '' : text).replace(/[\u2019`´]/g, "'").replace(/\s+/g, ' ').trim();
    if (!t) return { kind: 'skipped', nickname: null };
    var m = t.match(/^(?:bonjour|salut)?[\s,!.]*je\s*m\s*'?\s*app?ell?e?s?\s+(.+?)[\s.!]*$/i);
    if (m) {
      var exact = /je m'appelle\s/i.test(t);
      return { kind: 'full_structure', exactForm: exact, nickname: m[1].trim().slice(0, 40) };
    }
    var m2 = t.match(/^moi\s*,?\s*c'?\s*est\s+(.+?)[\s.!]*$/i);
    if (m2) return { kind: 'moi_cest', nickname: m2[1].trim().slice(0, 40) };
    if (t.split(' ').length <= 3) return { kind: 'nickname_only', nickname: t.replace(/[.!]+$/, '').slice(0, 40) };
    return { kind: 'other_sentence', nickname: null };
  }

  // Support recommendation per target+modality (CURRICULUM: two independent successes in
  // distinct contexts -> one-level trial reduction; difficulty or help -> restore).
  function recommendSupport(attempts, target, modality, current) {
    var rel = attempts.filter(function (a) { return a.target === target && a.modality === modality && (a.resultType === 'independent' || a.resultType === 'supported'); });
    var last = rel[rel.length - 1];
    if (last && (last.correct === false || last.resultType === 'supported')) {
      return { level: Math.min(3, current + (last.correct === false ? 1 : 0)), reason: last.correct === false ? 'difficulty' : 'help-used' };
    }
    var indep = rel.filter(function (a) { return a.resultType === 'independent' && a.correct === true; });
    var ctx = new Set(indep.map(function (a) { return a.context; }));
    if (indep.length >= 2 && ctx.size >= 2 && current > 0) return { level: current - 1, reason: 'two-independent-distinct-contexts (trial reduction, not mastery)' };
    return { level: current, reason: 'insufficient-evidence' };
  }

  var REVIEW_DAYS = [1, 3, 7, 14];
  function buildReview(save, now) {
    var targets = {};
    save.learning.attempts.forEach(function (a) {
      if (!a.target || a.resultType === 'unknown') return;
      var key = a.target + '|' + (a.modality === 'listening+reading' ? 'listening' : a.modality);
      (targets[key] = targets[key] || []).push(a);
    });
    var t0 = now || new Date();
    return Object.keys(targets).map(function (key) {
      var parts = key.split('|'), list = targets[key];
      var cur = (save.learning.supportByTarget[parts[0]] || {})[parts[1]];
      if (cur == null) cur = save.settings.supportLevel;
      var rec = recommendSupport(save.learning.attempts, parts[0], parts[1], cur);
      var successes = list.filter(function (a) { return a.resultType === 'independent' && a.correct === true; }).length;
      var days = REVIEW_DAYS[Math.min(successes, REVIEW_DAYS.length - 1)];
      return {
        target: parts[0], modality: parts[1],
        recentEvidence: list.slice(-4).map(function (a) { return { id: a.id, resultType: a.resultType, correct: a.correct, replays: a.replays, at: a.at }; }),
        nextEncounter: new Date(t0.getTime() + days * 86400000).toISOString(),
        nextEncounterNote: 'Week 1 uses chapter recurrence (greetings return with the neighbour and landlady); date is a heuristic.',
        supportRecommendation: rec
      };
    });
  }

  function probeStats(save) {
    var trials = save.learning.attempts.filter(function (a) { return a.evidenceKind === 'discrimination' && a.lesson === 'd1'; });
    var s = { total: trials.length, independentFirstListenCorrect: 0, independentReplayCorrect: 0, supportedCorrect: 0, incorrect: 0, unsure: 0, readingOnly: 0 };
    trials.forEach(function (a) {
      if (a.modality === 'reading') s.readingOnly++;
      if (a.response === 'unsure') { s.unsure++; return; }
      if (a.correct === false) { s.incorrect++; return; }
      if (a.resultType === 'supported') s.supportedCorrect++;
      else if (a.replays === 0) s.independentFirstListenCorrect++;
      else s.independentReplayCorrect++;
    });
    return s;
  }

  // ---------- Shareable feedback summary (private journal excluded by default) ----------
  function buildSummary(save, opts) {
    opts = opts || {};
    var L = [];
    var sc = save.progress.scene;
    L.push('L’Appartement 411 · 反馈摘要');
    L.push('版本：app ' + save.appVersion + ' · 内容 ' + save.contentVersion + ' · 存档 schema v' + save.schemaVersion);
    L.push('进度：Day ' + save.progress.episode + ' · ' + (C.SCENE_ZH[sc] || sc) + '（' + sc + ' 第 ' + (save.progress.step + 1) + ' 步）· ' + (save.progress.status === 'complete' ? '已完成' : '进行中'));
    var au = save.meta.audio || {};
    var QZ = { premium: '高级', enhanced: '增强', natural: '自然', network: '在线高质量', 'local-hq': '高质量', standard: '标准', compact: '基础', robotic: '机械', recording: '固定录音' };
    var avail = '可用（设备语音 ' + (au.voice || '?') + '）';
    if (au.status === 'available' && au.voices) {
      avail = '可用 · Camille=' + (au.voices.camille || '?') + '（' + (QZ[au.quality && au.quality.camille] || '?') + '）· Noé=' + (au.voices.noe || '?') + '（' + (QZ[au.quality && au.quality.noe] || '?') + '）' +
        (au.distinctVoices ? '' : ' · 共用一个声音') + ' · 本机法语声音 ' + (au.frenchVoiceCount != null ? au.frenchVoiceCount : '?') + ' 个 · 语速 ' + (au.rate || '?');
    }
    if (au.recordings) L.push('固定录音：' + au.recordings.source + '（Day 1 共 ' + au.recordings.lines + ' 句）；没有录音或播放失败时用设备声音');
    L.push((au.recordings ? '设备语音（备用）：' : '法语语音：') + (au.status === 'available' ? avail : au.status === 'unavailable' ? (au.recordings ? '不可用' : '不可用 → 阅读模式（听力未验证）') : '未检测'));
    var playedA = save.learning.attempts.filter(function (a) { return a.audioStatus === 'played'; });
    var failed = save.learning.attempts.filter(function (a) { return a.audioStatus === 'failed' || a.audioStatus === 'unavailable'; }).length;
    var byVoice = {};
    playedA.forEach(function (a) { var v = a.audioVoice; var k = v ? v.name + '（' + (QZ[v.quality] || v.quality) + '，语速 ' + v.rate + '）' : '未记录声音（v0.1.1 及以前）'; byVoice[k] = (byVoice[k] || 0) + 1; });
    var bv = Object.keys(byVoice).map(function (k) { return k + ' ×' + byVoice[k]; });
    var bySrc = {}; playedA.forEach(function (a) { var k = a.audioSource && a.audioSource !== 'none' ? a.audioSource.split(':')[0] : a.audioVoice ? 'device' : 'unrecorded'; bySrc[k] = (bySrc[k] || 0) + 1; });
    L.push('语音播放记录：成功 ' + playedA.length + (playedA.length ? '（录音 ' + (bySrc.recording || 0) + ' · 设备声音 ' + (bySrc.device || 0) + (bySrc.unrecorded ? ' · 旧版未记录来源 ' + bySrc.unrecorded : '') + '）' : '') + ' · 失败/不可用 ' + failed + (bv.length ? ' · 实际播放的声音：' + bv.join('；') : ''));
    var b = save.learning.baseline;
    if (b.status === 'skipped') L.push('开始前小测：跳过');
    else if (b.status === 'done') {
      var bc = b.items.filter(function (i) { return i.correct; }).length;
      L.push('开始前小测：' + bc + '/' + b.items.length + '（' + (b.items[0] && b.items[0].modality || '?') + '）');
    } else L.push('开始前小测：未做');
    var ps = probeStats(save);
    if (ps.total) {
      L.push('小练习「告诉我名字 vs 问我名字」：' + ps.total + ' 题 · 独立首听正确 ' + ps.independentFirstListenCorrect + ' · 独立重听后正确 ' + ps.independentReplayCorrect + ' · 有帮助时正确 ' + ps.supportedCorrect + ' · 错误 ' + ps.incorrect + ' · 不确定 ' + ps.unsure + (ps.readingOnly ? ' · 其中阅读模式 ' + ps.readingOnly + '（不算听力）' : ''));
    } else L.push('小练习：尚未进行');
    var nameA = save.learning.attempts.filter(function (a) { return a.context === 'd1.name.input'; }).pop();
    if (nameA) {
      var kindZh = { full_structure: '完整句型 Je m\u2019appelle…', nickname_only: '只说了昵称（能沟通，不算完整句型）', moi_cest: 'Moi, c\u2019est…（另一种说法）', other_sentence: '其他句子', skipped: '跳过' }[nameA.production] || nameA.production;
      L.push('自我介绍（打字）：' + kindZh + ' · ' + (nameA.resultType === 'supported' ? '有提示' : '无提示') + '（昵称本身未包含）');
    }
    var jA = save.learning.attempts.filter(function (a) { return a.context === 'd1.diary.journal'; }).pop();
    if (jA) L.push('日记写作（打字）：' + ({ full_structure: '含 Je m\u2019appelle… 句型', nickname_only: '很短的一句', moi_cest: 'Moi, c\u2019est…', other_sentence: '自己的句子', skipped: '空' }[jA.production] || jA.production) + ' · ' + (jA.resultType === 'supported' ? '用了句型插入' : '无插入') + '（内容未包含）');
    var h = {}; save.learning.helpLog.forEach(function (x) { h[x.kind] = (h[x.kind] || 0) + 1; });
    var hz = { subtitle: '显示法语文字', chinese: '中文解释', replay: '重播', explain: '任务说明' };
    var hs = Object.keys(h).map(function (k) { return (hz[k] || k) + ' ' + h[k]; });
    L.push('使用的帮助：' + (hs.length ? hs.join(' · ') : '无') + ' · 支持等级设置 ' + save.settings.supportLevel);
    var sec = save.world.choices.d1_secret;
    L.push('剧情选择：猫的秘密 = ' + (sec === 'keep' ? '答应保密' : sec === 'decline' ? '没有答应' : '尚未选择'));
    L.push('植物：' + (save.plant.careState === 'watered' ? '已浇水' : '口渴') + ' · 照料次数 ' + save.plant.careLog.length);
    var shareJ = opts.includeJournal ? save.diary.journal.filter(function (j) { return j.share; }) : [];
    L.push('私人日记：' + (save.diary.journal.length ? (shareJ.length ? '包含你选择分享的 ' + shareJ.length + ' 条' : '未包含（默认不分享）') : '没有写'));
    shareJ.forEach(function (j) { L.push('  日记（你选择分享）：' + j.original); });
    if (opts.note && String(opts.note).trim()) L.push('问题/感受：' + String(opts.note).trim().slice(0, 1000));
    L.push('生成时间：' + localStamp(opts.now || new Date()));
    return L.join('\n');
  }

  function localStamp(d) {
    function p2(n) { return String(n).padStart(2, '0'); }
    var off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + '（UTC' + sign + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + p2(Math.abs(off) % 60) : '') + '）';
  }
  function chronicleText(entry) {
    var f = C.CHRONICLE[entry.eventId];
    return f ? f(entry.params) : '';
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, APP_VERSION: APP_VERSION, KEY: KEY, TMP_KEY: TMP_KEY, BACKUP_PREFIX: BACKUP_PREFIX,
    LEGACY_KEY: LEGACY_KEY, LEGACY_TMP_KEY: LEGACY_TMP_KEY, LEGACY_BACKUP_PREFIX: LEGACY_BACKUP_PREFIX, ENUM: ENUM,
    newSave: newSave, validateSave: validateSave, migrate: migrate, migrateV0toV1: migrateV0toV1, detectVersion: detectVersion,
    parseImport: parseImport, createStorage: createStorage, recordEvent: recordEvent, applySecretChoice: applySecretChoice,
    applyName: applyName, waterPlant: waterPlant, plantStatus: plantStatus, makeAttempt: makeAttempt, probeResultType: probeResultType,
    probeModality: probeModality, classifyNameResponse: classifyNameResponse, recommendSupport: recommendSupport,
    buildReview: buildReview, probeStats: probeStats, buildSummary: buildSummary, chronicleText: chronicleText, clone: clone, nowISO: nowISO
  };
  root.A411 = root.A411 || {};
  root.A411.Logic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
