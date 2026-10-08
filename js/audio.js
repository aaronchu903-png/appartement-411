/* L’Appartement 411 — French audio via the device's own speech engine (Web Speech API).
 * Status values are what the browser reports: 'played' = speech engine reported it finished.
 * A muted phone can still report 'played'; the player can always replay or read instead.
 *
 * v0.1.2: voice ranking (premium/enhanced/natural/network voices first; Apple "Eloquence" and
 * novelty voices such as Eddy, Flo, Grandma, Bad News/Mauvaises nouvelles are never auto-picked
 * because they sound robotic), per-character voices (Camille / Noé) when the device has more
 * than one usable French voice, a per-device speed (0.75 / 0.9 / 1.0) and voice choice stored
 * outside the save (voices differ per device, so they must not travel with an exported save).
 * Every speak() records which voice/rate actually played in A.last so evidence stays honest.
 *
 * v0.1.3: fixed recordings first. playLine(lineId) plays the Qwen3-TTS clip for that line through one shared
 * HTMLAudioElement (speed via playbackRate, pitch preserved where supported); if there is no clip, or play() is
 * rejected / errors / never starts, it falls back to the device voice (speak), and the caller falls back to
 * reading. A.last.source is 'recording:qwen3-tts' or 'device:<voice>'. iOS Safari: the element is unlocked on
 * the first touch/click, and clips are started synchronously inside the tap handler. */
(function (root) {
  'use strict';
  var A = { status: 'unknown', voice: null, voiceName: null, reason: null, voices: [], assign: {}, prefs: null, last: null };
  var synth = root.speechSynthesis;
  var PREFS_KEY = 'a411.device.audio';
  var RATES = [0.75, 0.9, 1.0];
  var DEFAULT_RATE = 0.9;

  // ---------- pure helpers (unit-tested in Node) ----------
  function norm(s) { return String(s || '').toLowerCase().normalize ? String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s || '').toLowerCase(); }
  function firstWord(name) { return norm(name).replace(/\(.*$/, '').trim(); }
  // Apple Eloquence voices + novelty voices (English and French localised names) + eSpeak.
  var ROBOTIC = ['eddy', 'flo', 'grandma', 'grandpa', 'grand-mere', 'grand-pere', 'mamie', 'papi', 'jacques', 'reed', 'rocko', 'sandy', 'shelley',
    'fred', 'junior', 'kathy', 'ralph', 'albert', 'bad news', 'mauvaises nouvelles', 'bahh', 'bells', 'cloches', 'boing', 'bubbles', 'bulles',
    'cellos', 'violoncelles', 'good news', 'bonnes nouvelles', 'jester', 'bouffon', 'organ', 'orgue', 'superstar', 'superestrella', 'trinoids',
    'trinoides', 'whisper', 'murmure', 'wobble', 'zarvox'];
  var FEMALE = ['amelie', 'audrey', 'aurelie', 'marie', 'aude', 'chantal', 'julie', 'hortense', 'hortence', 'caroline', 'denise', 'eloise', 'vivienne',
    'charline', 'ariane', 'sylvie', 'celine', 'lea', 'brigitte', 'coralie', 'jacqueline', 'josephine', 'yvette', 'virginie', 'estelle', 'camille', 'google francais'];
  var MALE = ['thomas', 'nicolas', 'daniel', 'paul', 'claude', 'guillaume', 'henri', 'remy', 'gerard', 'fabrice', 'antoine', 'jean', 'thierry',
    'alain', 'maurice', 'yves', 'mathieu', 'jerome', 'lucien', 'olivier', 'sebastien'];
  var APPLE_STD = { thomas: 54, audrey: 54, aurelie: 52, amelie: 52, marie: 50, aude: 48, chantal: 48, nicolas: 48 };

  function isFrench(v) { return !!v && /^fr([-_]|$)/i.test(v.lang || ''); }
  function region(v) { var m = String(v.lang || '').replace('_', '-').split('-'); return (m[0] || '').toLowerCase() + (m[1] ? '-' + m[1].toUpperCase() : ''); }
  function classify(v) {
    var name = norm(v.name), uri = norm(v.voiceURI), all = name + ' ' + uri, fw = firstWord(v.name);
    var robotic = /espeak|eloquence|speech\.synthesis\.voice\./.test(all) || ROBOTIC.some(function (r) { return fw === r || fw.indexOf(r + ' ') === 0; });
    var quality, score;
    if (robotic) { quality = 'robotic'; score = -100; }
    else if (/premium/.test(all)) { quality = 'premium'; score = 92; }
    else if (/natural|neural|wavenet|online/.test(all)) { quality = 'natural'; score = 88; }
    else if (/enhanced|amelior/.test(all)) { quality = 'enhanced'; score = 82; }
    else if (/network/.test(all) || /^google\s/.test(name)) { quality = 'network'; score = 76; }
    else if (/-x-[a-z]{3}-local|android|chrome os/.test(all)) { quality = 'local-hq'; score = 66; }
    else if (APPLE_STD[fw] != null) { quality = 'standard'; score = APPLE_STD[fw]; }
    else if (/compact/.test(all)) { quality = 'compact'; score = 42; }
    else { quality = 'standard'; score = 44; }
    var r = region(v);
    if (r === 'fr-FR') score += 8; else if (r === 'fr-BE' || r === 'fr-CH') score += 3; else if (r === 'fr-CA') score += 2;
    var gender = null;
    if (/-x-(frc|fra|vlf|caa|cac)-/.test(uri + ' ' + name)) gender = 'female';
    else if (/-x-(frd|frb|cab|cad)-/.test(uri + ' ' + name)) gender = 'male';
    else {
      var words = name.replace(/microsoft|google|apple|online|natural|multilingual|enhanced|premium|compact|\(.*?\)|-.*$/g, ' ').trim();
      if (FEMALE.some(function (n) { return words === n || words.indexOf(n) === 0 || name.indexOf(n) >= 0 && n.indexOf(' ') > 0; })) gender = 'female';
      else if (MALE.some(function (n) { return words === n || words.indexOf(n) === 0; })) gender = 'male';
    }
    return { quality: quality, score: score, gender: gender, region: r, robotic: robotic };
  }
  function key(v) { return (v.voiceURI || '') + '|' + (v.name || '') + '|' + (v.lang || ''); }
  function rankFrench(voices) {
    var seen = {};
    return (voices || []).filter(isFrench).filter(function (v) { var k = key(v); if (seen[k]) return false; seen[k] = 1; return true; })
      .map(function (v, i) { var c = classify(v); return { v: v, key: key(v), name: v.name, lang: v.lang, quality: c.quality, score: c.score, gender: c.gender, region: c.region, robotic: c.robotic, i: i }; })
      .sort(function (a, b) { return b.score - a.score || a.i - b.i; });
  }
  // prefs: { camille: key|null, noe: key|null } -> { camille, noe, neutral, distinct }
  function assignVoices(ranked, prefs) {
    prefs = prefs || {};
    var good = ranked.filter(function (r) { return !r.robotic; });
    var pool = good.length ? good : ranked;
    if (!pool.length) return { camille: null, noe: null, neutral: null, distinct: false };
    function byKey(k) { return k ? ranked.filter(function (r) { return r.key === k; })[0] || null : null; }
    var cam = byKey(prefs.camille) || pool.filter(function (r) { return r.gender === 'female'; })[0] || pool[0];
    var noe = byKey(prefs.noe);
    if (!noe) {
      var others = pool.filter(function (r) { return r.key !== cam.key; });
      noe = others.filter(function (r) { return r.gender === 'male'; })[0] || others[0] || cam;
    }
    return { camille: cam, noe: noe, neutral: pool[0], distinct: cam.key !== noe.key };
  }
  function qualityZh(q) {
    return { premium: '高级 Premium', enhanced: '增强 Enhanced', natural: '自然 Natural', network: '在线高质量', 'local-hq': '高质量', standard: '标准', compact: '基础（压缩）', robotic: '机械/趣味声音，不推荐' }[q] || q;
  }
  function label(r) { return r ? r.name + ' (' + r.lang + ')' : null; }
  function normRate(x) {
    x = Number(x);
    if (!isFinite(x)) return DEFAULT_RATE;
    var best = RATES[0]; RATES.forEach(function (r) { if (Math.abs(r - x) < Math.abs(best - x)) best = r; });
    return best;
  }
  function platform(nav) {
    nav = nav || root.navigator || {};
    var ua = String(nav.userAgent || '');
    if (/iPhone|iPad|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  }

  // ---------- device prefs (outside the save) ----------
  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  A.loadPrefs = function (fallbackRate) {
    var p = null;
    try { var s = ls(); p = s ? JSON.parse(s.getItem(PREFS_KEY) || 'null') : null; } catch (e) { p = null; }
    if (!p || typeof p !== 'object') p = {};
    A.prefs = { camille: typeof p.camille === 'string' ? p.camille : null, noe: typeof p.noe === 'string' ? p.noe : null,
      rate: p.rate != null ? normRate(p.rate) : (fallbackRate != null ? normRate(fallbackRate) : DEFAULT_RATE) };
    return A.prefs;
  };
  A.savePrefs = function (patch) {
    if (!A.prefs) A.loadPrefs();
    Object.keys(patch || {}).forEach(function (k) { A.prefs[k] = k === 'rate' ? normRate(patch[k]) : patch[k]; });
    try { var s = ls(); if (s) s.setItem(PREFS_KEY, JSON.stringify(A.prefs)); } catch (e) { return false; }
    A.reassign();
    return true;
  };
  A.reassign = function () {
    A.assign = assignVoices(A.voices, A.prefs || {});
    A.voice = A.assign.camille ? A.assign.camille.v : null;
    A.voiceName = label(A.assign.camille);
  };
  A.rate = function () { return (A.prefs || A.loadPrefs()).rate; };

  function getVoices(timeoutMs) {
    return new Promise(function (resolve) {
      if (!synth) return resolve([]);
      var v = synth.getVoices();
      if (v && v.length) return resolve(v);
      var done = false;
      function fin() { if (done) return; done = true; resolve(synth.getVoices() || []); }
      try { synth.addEventListener('voiceschanged', fin, { once: true }); } catch (e) { synth.onvoiceschanged = fin; }
      setTimeout(fin, timeoutMs || 1500);
    });
  }

  A.init = function () {
    if (!A.prefs) A.loadPrefs();
    if (!synth || typeof root.SpeechSynthesisUtterance !== 'function') {
      A.status = 'unavailable'; A.reason = 'no-speech-api'; A.voices = []; A.reassign();
      return Promise.resolve(A.status);
    }
    return getVoices(2000).then(function (voices) {
      A.voices = rankFrench(voices);
      A.reassign();
      A.status = A.voice ? 'available' : 'unavailable';
      A.reason = A.voice ? null : 'no-french-voice';
      return A.status;
    });
  };

  // opts: { speaker: 'camille'|'noe'|'neutral', rate } -> 'played' | 'failed' | 'unavailable' | 'stopped'. Never rejects.
  A.speak = function (text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var sp = opts.speaker === 'noe' ? 'noe' : opts.speaker === 'neutral' ? 'neutral' : 'camille';
      var r = A.assign && A.assign[sp];
      if (A.status !== 'available' || !r) { A.last = null; return resolve('unavailable'); }
      var rate = normRate(opts.rate != null ? opts.rate : A.rate());
      // Pitch-shifting degrades naturalness; only use a mild shift when both characters share one voice.
      var pitch = 1;
      if (!A.assign.distinct) pitch = sp === 'camille' ? 1.06 : sp === 'noe' ? 0.92 : 1;
      A.last = { source: 'device:' + label(r), speaker: sp, voice: label(r), voiceURI: r.v.voiceURI || null, quality: r.quality, rate: rate, pitch: pitch, distinct: !!A.assign.distinct };
      var settled = false, started = false, t1, t2;
      function fin(res) { if (settled) return; settled = true; clearTimeout(t1); clearTimeout(t2); resolve(res); }
      try {
        synth.cancel();
        var u = new root.SpeechSynthesisUtterance(String(text).replace(/\u00A0/g, ' ').replace(/[\u2019\u2018]/g, "'"));
        u.voice = r.v; u.lang = r.v.lang || 'fr-FR';
        u.rate = rate; u.pitch = pitch;
        u.onstart = function () { started = true; };
        u.onend = function () { fin('played'); };
        u.onerror = function (ev) { fin(ev && (ev.error === 'interrupted' || ev.error === 'canceled') ? 'stopped' : 'failed'); };
        t1 = setTimeout(function () { if (!started) { try { synth.cancel(); } catch (e) { } fin('failed'); } }, 5000);
        t2 = setTimeout(function () { try { synth.cancel(); } catch (e) { } fin(started ? 'played' : 'failed'); }, 15000);
        synth.speak(u);
      } catch (e) { fin('failed'); }
    });
  };
  // ---------- fixed recordings (v0.1.3) ----------
  var SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  var CL = (root.A411 && root.A411.CLIPS) || null;
  A.clipSource = CL ? CL.source : null;
  A.clipCredit = CL ? CL.credit : null;
  A.clips = CL ? CL.files : {};
  A.clipLog = []; // { id, result, rate, at } — every clip attempt (tests + debugging)
  var el = null, cur = null, unlocked = false, blobs = {};
  function clipsOn() { return !root.A411_NO_CLIPS && typeof root.Audio === 'function'; }
  A.hasClip = function (id) { return clipsOn() && !!(id && A.clips && A.clips[id]); };
  A.canPlay = function (id) { return A.hasClip(id) || A.status === 'available'; };
  function getEl() { if (!el) { el = new root.Audio(); el.preload = 'auto'; try { el.setAttribute('playsinline', ''); } catch (e) { } } return el; }
  // data: URI -> blob: URL once (smaller strings for the media element; Safari handles both)
  function clipUrl(id) {
    var u = A.clips[id];
    if (blobs[id]) return blobs[id];
    if (/^data:/.test(u) && root.URL && root.URL.createObjectURL && root.atob && root.Blob) {
      try {
        var bin = root.atob(u.slice(u.indexOf(',') + 1)), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return (blobs[id] = root.URL.createObjectURL(new root.Blob([arr], { type: 'audio/mpeg' })));
      } catch (e) { }
    }
    return u;
  }
  // iOS: a media element may only start from a user gesture once; prime the shared element on the first tap.
  A.unlock = function () {
    if (unlocked || !clipsOn()) return;
    unlocked = true;
    try {
      var a = getEl();
      if (cur) return; // a clip is being started by this same tap; that unlocks it
      a.muted = true; a.src = SILENT;
      var p = a.play();
      var done = function () { if (!cur) { try { a.pause(); } catch (e) { } } a.muted = false; };
      if (p && p.then) p.then(done, function () { a.muted = false; unlocked = false; }); else done();
    } catch (e) { unlocked = false; }
  };
  function playClip(id, rate) {
    return new Promise(function (resolve) {
      var a, settled = false, started = false, t1, t2, token = {};
      function fin(res) {
        if (settled) return; settled = true; clearTimeout(t1); clearTimeout(t2);
        if (cur === token) { cur = null; if (a) { a.onended = a.onerror = a.onplaying = null; } }
        resolve(res);
      }
      token.stop = function () { try { a.pause(); } catch (e) { } fin('stopped'); };
      try {
        a = getEl();
        if (cur) cur.stop();
        cur = token;
        a.onplaying = function () { started = true; try { a.playbackRate = rate; } catch (e) { } };
        a.onended = function () { fin(started || a.currentTime > 0 ? 'played' : 'failed'); };
        a.onerror = function () { fin('failed'); };
        a.muted = false;
        a.src = clipUrl(id);
        try { a.preservesPitch = true; a.webkitPreservesPitch = true; a.mozPreservesPitch = true; } catch (e) { }
        a.defaultPlaybackRate = rate; a.playbackRate = rate;
        t1 = setTimeout(function () { if (!started) { try { a.pause(); } catch (e) { } fin('failed'); } }, 4000);
        t2 = setTimeout(function () { try { a.pause(); } catch (e) { } fin(started ? 'played' : 'failed'); }, 20000);
        var p = a.play(); // synchronous inside the caller's tap handler (iOS)
        if (p && p.then) p.then(function () { started = true; }, function () { fin('failed'); });
      } catch (e) { fin('failed'); }
    });
  }
  // Recorded clip -> device voice. Resolves 'played' | 'failed' | 'unavailable' | 'stopped'; never rejects.
  // A.last describes what actually played (or was last tried).
  A.playLine = function (id, text, opts) {
    opts = opts || {};
    if (!A.hasClip(id)) return A.speak(text, opts);
    var sp = opts.speaker === 'noe' ? 'noe' : opts.speaker === 'neutral' ? 'neutral' : 'camille';
    var rate = normRate(opts.rate != null ? opts.rate : A.rate());
    try { if (synth) synth.cancel(); } catch (e) { }
    A.last = { source: A.clipSource, speaker: sp, voice: 'Qwen3-TTS · ' + ({ camille: 'Camille', noe: 'Noé', neutral: '旁白' })[sp], quality: 'recording', rate: rate, pitch: 1, clip: id };
    var mine = A.last;
    return playClip(id, rate).then(function (res) {
      A.clipLog.push({ id: id, result: res, rate: rate, at: Date.now() });
      if (res === 'played' || res === 'stopped') { A.last = mine; return res; }
      return A.speak(text, opts).then(function (r2) {
        if (r2 === 'unavailable') A.last = mine; // nothing played; keep the failed recording as "last tried"
        return r2 === 'unavailable' ? 'failed' : r2;
      });
    });
  };
  A.stop = function () { try { if (synth) synth.cancel(); } catch (e) { } if (cur) cur.stop(); };
  if (root.document && root.document.addEventListener) {
    ['touchend', 'pointerdown', 'click', 'keydown'].forEach(function (ev) { root.document.addEventListener(ev, A.unlock, { capture: true, passive: true }); });
  }

  A.RATES = RATES; A.DEFAULT_RATE = DEFAULT_RATE; A.PREFS_KEY = PREFS_KEY;
  A.classify = classify; A.rankFrench = rankFrench; A.assignVoices = assignVoices; A.qualityZh = qualityZh; A.label = label;
  A.normRate = normRate; A.platform = platform; A.voiceKey = key;
  root.A411 = root.A411 || {};
  root.A411.Audio = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
