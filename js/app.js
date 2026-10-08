/* L’Appartement 411 — Day 1 player (UI + scene engine). */
(function () {
  'use strict';
  var C = A411.Content, L = A411.Logic, Art = A411.Art, Au = A411.Audio;
  var $screen = document.getElementById('screen');
  var $overlay = document.getElementById('overlay');
  var $toast = document.getElementById('toast');
  var $topbar = document.getElementById('topbar');
  var $where = document.getElementById('where');
  var NB = '\u00A0';

  var storage = null, storageOk = true, S = null, notices = [];
  var ui = { gesture: false, line: null, trial: null, view: 'title' };

  // ---------- helpers ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function btn(label, fn, cls, extra) {
    var a = { class: 'btn ' + (cls || ''), type: 'button', onclick: function (ev) { ui.gesture = true; safe(fn)(ev); } };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    return h('button', a, label);
  }
  function toast(msg, ms) {
    $toast.textContent = msg; $toast.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { $toast.hidden = true; }, ms || 2600);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function safe(fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { showError(e); }
    };
  }
  function fr(text) { return h('div', { class: 'fr', lang: 'fr' }, text); }
  function zh(text) { return h('div', { class: 'zh', lang: 'zh-Hans' }, text); }
  function level() { return S ? S.settings.supportLevel : 3; }

  // ---------- persistence ----------
  function syncAudioMeta() { if (S && Au.status !== 'unknown') { setAudioMeta(); S.meta.audio.checkedAt = S.meta.audio.checkedAt || L.nowISO(); } }
  // What the device offers now (not proof of what was heard; per-attempt voice/rate is recorded on each attempt).
  function setAudioMeta() {
    var m = S.meta.audio, a = Au.assign || {};
    m.status = Au.status; m.voice = Au.voiceName;
    m.voices = { camille: Au.label(a.camille), noe: Au.label(a.noe), neutral: Au.label(a.neutral) };
    m.quality = { camille: a.camille ? a.camille.quality : null, noe: a.noe ? a.noe.quality : null };
    m.distinctVoices = !!a.distinct; m.rate = Au.rate(); m.frenchVoiceCount = (Au.voices || []).length;
    S.settings.speechRate = Au.rate();
  }
  function voiceFields(info) { return info ? { name: info.voice, quality: info.quality, rate: info.rate, pitch: info.pitch } : null; }
  function persist(reason) {
    if (!S) return true;
    if (S.meta.audio.status === 'unknown') syncAudioMeta();
    if (!storage) { storageOk = false; return false; }
    var r = storage.write(S);
    if (!r.ok) {
      storageOk = false;
      toast('⚠️ 无法保存到本机：' + r.error + '。请在「存档」中导出备份。', 5000);
      return false;
    }
    storageOk = true;
    return true;
  }
  function initStorage() {
    try { var ls = window.localStorage; var k = 'a411.probe'; ls.setItem(k, '1'); ls.removeItem(k); storage = L.createStorage(ls); }
    catch (e) { storage = null; storageOk = false; }
  }

  // ---------- error handling: never trap the player ----------
  function showError(e) {
    try { console.error(e); } catch (x) { }
    ui.paused = false;
    Au.stop();
    var box = h('div', { class: 'sheet' },
      h('div', { class: 'head' }, h('h2', { text: '出了点问题' })),
      h('div', { class: 'pad' },
        h('p', { text: '游戏遇到一个错误，但你的存档没有被删除（最后一次保存的进度仍在）。' }),
        h('p', { class: 'muted', text: '错误信息：' + String(e && e.message || e).slice(0, 200) }),
        h('div', { class: 'col' },
          btn('↻ 重新载入当前步骤', function () { closeOverlay(); reloadFromStorage(); render(); }, 'primary'),
          btn('🏠 回到主菜单', function () { closeOverlay(); reloadFromStorage(); goTitle(); }),
          btn('💾 打开存档工具（导出备份）', function () { closeOverlay(); openSave(); })
        )));
    openOverlay(box);
  }
  window.addEventListener('error', function (ev) { showError(ev.error || ev.message); });
  window.addEventListener('unhandledrejection', function (ev) { showError(ev.reason); });
  function reloadFromStorage() { if (!storage) return; var r = storage.load(); if (r.save) S = r.save; }

  // ---------- overlay ----------
  function openOverlay(node) { $overlay.innerHTML = ''; $overlay.appendChild(node); $overlay.hidden = false; var f = $overlay.querySelector('button'); if (f) f.focus(); }
  function closeOverlay() { $overlay.hidden = true; $overlay.innerHTML = ''; if (ui.paused && !closeOverlay._inner) { closeOverlay._inner = true; try { openPause(); } finally { closeOverlay._inner = false; } } }
  function sheet(title, body) {
    return h('div', { class: 'sheet' },
      h('div', { class: 'head' }, h('h2', { text: title }), btn('✕ 关闭', closeOverlay, 'small', { 'aria-label': '关闭' })),
      body);
  }

  // ---------- settings ----------
  function applySettings() {
    var rm = S ? S.settings.reducedMotion : (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.body.classList.toggle('reduced-motion', !!rm);
    document.body.classList.toggle('large-text', !!(S && S.settings.largeText));
  }

  // ---------- audio helpers ----------
  function audioBanner() {
    if (Au.status === 'unavailable') {
      return h('div', { class: 'banner warn', id: 'audioBanner', role: 'status' },
        '🔇 这台设备/浏览器没有可用的法语语音（', h('span', { lang: 'en' }, Au.reason || 'unavailable'), '）。现在是',
        h('b', { text: '阅读模式' }), '：法语文字会显示出来，这部分不算听力练习。');
    }
    return null;
  }
  function speakLine(lineId) {
    var line = C.LINES[lineId];
    return Au.speak(line.fr.replace(/\u00A0/g, ' '), { speaker: line.speaker }).then(function (st) {
      setAudioMeta(); S.meta.audio.checkedAt = L.nowISO();
      return st;
    });
  }
  function bestAudio(a, b) { var rank = { played: 3, failed: 2, unavailable: 1, not_used: 0 }; return (rank[b] || 0) > (rank[a] || 0) ? b : a; }

  // ---------- navigation ----------
  function curStep() { return C.SCENES[S.progress.scene][S.progress.step]; }
  function setWhere() {
    $where.textContent = 'Day ' + S.progress.episode + ' · ' + (C.SCENE_ZH[S.progress.scene] || S.progress.scene) + ' · v' + L.APP_VERSION;
  }
  function next() {
    Au.stop();
    var sc = C.SCENES[S.progress.scene];
    if (S.progress.step + 1 < sc.length) S.progress.step++;
    else {
      var i = C.ORDER.indexOf(S.progress.scene);
      S.progress.scene = C.ORDER[Math.min(i + 1, C.ORDER.length - 1)];
      S.progress.step = 0;
    }
    S.progress.draft = '';
    ui.line = null; ui.trial = null;
    persist('advance');
    render();
  }
  function goTitle() { Au.stop(); ui.view = 'title'; ui.line = null; ui.trial = null; render(); }
  function startPlay() { ui.view = 'play'; ui.gesture = true; render(); }

  // ---------- rendering ----------
  function stage(sceneName, st) {
    var c = h('canvas', { class: 'stage', width: Art.W, height: Art.H, role: 'img', 'aria-label': st && st.alt || '像素场景' });
    Art.scene(c.getContext('2d'), sceneName, st || {});
    return c;
  }
  function render() {
    if (ui.paused) return; // nothing re-renders behind the pause sheet
    try {
      applySettings();
      $screen.innerHTML = '';
      if (ui.view === 'title' || !S) { $topbar.hidden = true; renderTitle(); return; }
      $topbar.hidden = false; setWhere();
      var step = curStep();
      var fn = R[step.type];
      if (!fn) throw new Error('未知步骤 ' + step.type);
      fn(step);
      ui.gesture = false;
    } catch (e) { showError(e); }
  }

  function artFor(step) {
    var st = {}; var a = step.art || {};
    Object.keys(a).forEach(function (k) { st[k] = a[k]; });
    st.watered = S.plant.careState === 'watered';
    return st;
  }

  // ---------- Title ----------
  function renderTitle() {
    var hasSave = !!S && (S.progress.scene !== 'baseline' || S.progress.step > 0 || S.learning.baseline.status !== 'not_started');
    var wrap = h('div', { class: 'fade-in' });
    wrap.appendChild(stage('title', { alt: '夜晚的公寓楼，411 号窗户亮着灯，窗台上有一盆植物' }));
    var main = h('div', { class: 'pad' },
      h('h1', { lang: 'fr', text: 'L’Appartement 411' }),
      h('p', { class: 'muted' }, h('span', { lang: 'fr', text: 'Day 1 · Bienvenue chez nous' }), ' — 搬家第一天'));
    var col = h('div', { class: 'col' });
    if (hasSave && S.progress.status !== 'complete') {
      col.appendChild(btn('▶ 继续：Day 1 · ' + C.SCENE_ZH[S.progress.scene] + '（第 ' + (S.progress.step + 1) + ' 步）', startPlay, 'primary', { id: 'btnContinue' }));
    } else if (!hasSave) {
      col.appendChild(btn('▶ 开始 Day 1', function () { if (!S) S = L.newSave({ reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }); persist('new'); startPlay(); }, 'primary', { id: 'btnStart' }));
    } else {
      col.appendChild(h('div', { class: 'banner ok', text: '✓ 第一天已完成。第二天还在制作中。' }));
      col.appendChild(btn('📖 查看日记', openDiary, 'primary', { id: 'btnDiary' }));
    }
    if (hasSave) col.appendChild(btn('↺ 重新开始（会先自动备份当前存档）', confirmNewGame, '', { id: 'btnNew' }));
    main.appendChild(col);
    wrap.appendChild(main);

    if (hasSave && S.world.completedEvents.indexOf('plant_shown') >= 0) {
      var ps = L.plantStatus(S.plant, new Date());
      var today = new Date(); var dayKey = 'daily.' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
      var done = S.plant.careLog.some(function (c) { return c.actionId === dayKey || (c.at && new Date(c.at).toDateString() === today.toDateString()); });
      wrap.appendChild(h('div', { class: 'card', id: 'plantCard' },
        h('b', { text: '🪴 你的植物：' }), ps === 'watered' ? '精神（已浇水）' : '有点渴',
        S.plant.mementos.length ? h('div', { class: 'muted', text: '纪念：' + S.plant.mementos.map(function (m) { return m.label; }).join('、') }) : null,
        h('div', { class: 'row' }, btn(done ? '✓ 今天已经浇过了' : '💧 浇水（快速探望）', function () {
          var r = L.waterPlant(S, dayKey, 'title', new Date());
          if (r.counted) { persist('care'); toast('💧 浇好了。'); } else toast('今天已经浇过了，不会重复计算。');
          render();
        }, 'small', { id: 'btnTitleWater' }))));
    }

    var days = h('ul', { class: 'days', 'aria-label': '章节' });
    C.DAYS.forEach(function (d) {
      var status = d.available ? (S && S.progress.status === 'complete' ? '已完成' : '可以玩') : '尚未开放';
      days.appendChild(h('li', { class: d.available ? '' : 'na', 'aria-disabled': d.available ? null : 'true' },
        h('span', null, 'Day ' + d.n + ' · ', h('span', { lang: 'fr', text: d.title }), ' ', h('span', { class: 'muted', text: d.zh })),
        h('span', { class: 'tag', text: status })));
    });
    wrap.appendChild(h('div', { class: 'card' }, h('h3', { text: '章节' }), days,
      h('p', { class: 'muted', text: 'Day 2–7 还没做好，所以这里不放按钮。完成并检查好一天，才会开放下一天。' })));

    wrap.appendChild(h('div', { class: 'row pad' },
      btn('⚙️ 设置', openSettings, 'grow', { id: 'btnSettings' }),
      btn('💾 存档', openSave, 'grow', { id: 'btnSave' }),
      btn('📝 反馈摘要', openSummary, 'grow', { id: 'btnSummary' }),
      hasSave ? btn('📖 日记', openDiary, 'grow', { id: 'btnDiary2' }) : null));
    if (!storage) wrap.appendChild(h('div', { class: 'banner warn', text: '⚠️ 这个浏览器不允许本机存储，进度不会被保存。请在「存档」中导出。' }));
    notices.forEach(function (n) { wrap.appendChild(h('div', { class: 'banner info', text: n })); });
    wrap.appendChild(h('div', { class: 'footer', id: 'versionFooter' },
      'App v' + L.APP_VERSION + ' · 内容 ' + C.CONTENT_VERSION + ' · 存档 schema v' + L.SCHEMA_VERSION,
      h('br'), '存档只保存在这台设备的这个浏览器里，不会自动同步。清除浏览器数据会删除它——请定期导出。',
      h('br'), '像素画为本项目原创；法语语音来自你设备自带的语音引擎。'));
    $screen.appendChild(wrap);
  }

  function confirmNewGame() {
    openOverlay(sheet('重新开始？', h('div', { class: 'pad' },
      h('p', { text: '当前存档会先自动备份（可在「存档 → 备份」中恢复），然后开始新的第一天。' }),
      h('div', { class: 'col' },
        btn('确定，备份并重新开始', function () {
          if (storage && S) storage.backup('pre-new-game', S);
          S = L.newSave({ reducedMotion: S && S.settings.reducedMotion });
          persist('new'); closeOverlay(); startPlay();
        }, 'primary', { id: 'btnConfirmNew' }),
        btn('取消', closeOverlay)))));
  }

  // ---------- Pause ----------
  function openPause() {
    ui.paused = true;
    Au.stop();
    persist('pause');
    var box = sheet('⏸ 已暂停', h('div', { class: 'pad' },
      h('p', { id: 'pauseMsg', text: '进度已保存：Day 1 · ' + C.SCENE_ZH[S.progress.scene] + '（第 ' + (S.progress.step + 1) + ' 步）。可以随时离开，下次会回到这里。' }),
      storageOk ? null : h('div', { class: 'banner warn', text: '⚠️ 保存失败——请先导出存档。' }),
      h('div', { class: 'col' },
        btn('▶ 继续', function () { ui.paused = false; closeOverlay(); ui.gesture = true; render(); }, 'primary', { id: 'btnResume' }),
        btn('⚙️ 设置', openSettings),
        btn('🏠 回到主菜单', function () { ui.paused = false; closeOverlay(); goTitle(); }, '', { id: 'btnPauseHome' }))));
    openOverlay(box);
  }
  document.getElementById('btnPause').addEventListener('click', safe(openPause));
  document.addEventListener('visibilitychange', function () { if (document.hidden && S) { Au.stop(); persist('hidden'); } });

  // ---------- Line (dialogue) ----------
  function recordLineExposure(step) {
    var st = ui.line, line = C.LINES[step.line];
    var audio = st.audio === 'pending' ? 'not_used' : st.audio;
    var modality = audio === 'played' ? (st.sub ? 'listening+reading' : 'listening') : 'reading';
    S.learning.attempts.push(L.makeAttempt({
      target: line.target, lesson: 'd1', modality: modality, audioStatus: audio,
      visibleSupport: { level: level(), subtitles: st.sub, chinese: st.zh, gesture: true, speakerVisible: true, label: line.label },
      replays: st.replays, firstListen: null, response: null, correct: null,
      resultType: 'exposure', evidenceKind: 'encounter', context: 'd1.' + S.progress.scene + '.' + S.progress.step + '.' + step.line, speaker: line.speaker,
      audioVoice: voiceFields(audio === 'played' || audio === 'failed' ? st.voiceInfo : null)
    }));
    [line.target].concat(line.also || []).forEach(function (t) {
      if (!t) return;
      var sb = S.learning.supportByTarget[t] = S.learning.supportByTarget[t] || {};
      if (sb.listening == null) sb.listening = level();
    });
  }
  function playCurrentLine(step, isReplay) {
    var st = ui.line;
    if (isReplay) { st.replays++; S.learning.helpLog.push({ kind: 'replay', context: 'd1.' + S.progress.scene + '.' + S.progress.step, target: C.LINES[step.line].target, at: L.nowISO() }); }
    var stEl = document.getElementById('audioState'); if (stEl) stEl.textContent = '🔊 播放中…';
    return speakLine(step.line).then(function (res) {
      if (res === 'played' || (!st.voiceInfo && res === 'failed')) st.voiceInfo = Au.last;
      st.audio = bestAudio(st.audio === 'pending' ? 'not_used' : st.audio, res);
      if (res === 'stopped') return;
      if (res === 'failed' || res === 'unavailable') st.sub = true; // fallback: reveal text, never call it listening
      persist('audio');
      if (ui.line === st) renderLineBody(step);
    });
  }
  function renderLineBody(step) {
    var host = document.getElementById('lineBody'); if (!host) return;
    var st = ui.line, line = C.LINES[step.line], sp = C.SPEAKERS[line.speaker];
    host.innerHTML = '';
    host.appendChild(h('div', null, h('span', { class: 'speaker ' + line.speaker, id: 'speakerTag' }, '▼ ' + sp.name), ' ',
      h('span', { class: 'muted', id: 'audioState', text: st.audio === 'played' ? '🔊 已播放' : st.audio === 'failed' ? '⚠️ 播放失败，已显示文字（阅读）' : st.audio === 'unavailable' ? '🔇 无语音（阅读）' : '' })));
    host.appendChild(st.sub ? h('div', { id: 'subtitle' }, fr(line.fr)) : h('p', { class: 'hidden-text', id: 'subtitle', text: '（先听；需要时点「文字」）' }));
    if (st.zh) host.appendChild(h('div', { id: 'gloss' }, zh(line.zh)));
  }
  R_line = function (step) {
    var line = C.LINES[step.line];
    if (!ui.line || ui.line.id !== step.line + '@' + S.progress.scene + S.progress.step) {
      ui.line = { id: step.line + '@' + S.progress.scene + S.progress.step, sub: level() >= 2, zh: level() >= 3, replays: 0, audio: 'pending' };
    }
    var st = ui.line, art = artFor(step); art.speaker = line.speaker;
    if (Au.status === 'unavailable') { st.sub = true; if (st.audio === 'pending') st.audio = 'unavailable'; }
    $screen.appendChild(stage(S.progress.scene, art));
    var ab = audioBanner(); if (ab) $screen.appendChild(ab);
    var body = h('div', { id: 'lineBody' });
    var dlg = h('div', { class: 'dialogue fade-in' }, body,
      h('div', { class: 'row' },
        btn('🔁 重播', function () { playCurrentLine(step, st.audio !== 'pending'); }, 'small', { id: 'btnReplay', disabled: Au.status === 'unavailable' }),
        btn('文字', function () { if (!st.sub) { st.sub = true; S.learning.helpLog.push({ kind: 'subtitle', context: 'd1.' + S.progress.scene + '.' + S.progress.step, target: line.target, at: L.nowISO() }); persist('help'); } renderLineBody(step); }, 'small', { id: 'btnSub', 'aria-label': '显示法语文字' }),
        btn('中文', function () { if (!st.zh) { st.zh = true; st.sub = true; S.learning.helpLog.push({ kind: 'chinese', context: 'd1.' + S.progress.scene + '.' + S.progress.step, target: line.target, at: L.nowISO() }); persist('help'); } renderLineBody(step); }, 'small', { id: 'btnZh', 'aria-label': '显示中文帮助' }),
        btn('继续 ▶', function () {
          recordLineExposure(step);
          if (step.event) L.recordEvent(S, step.event, null);
          if (step.event === 'met_camille') S.world.knowledge.player.metCamille = true;
          if (step.event === 'met_noe') S.world.knowledge.player.metNoe = true;
          next();
        }, 'primary grow', { id: 'btnNext' })));
    $screen.appendChild(dlg);
    renderLineBody(step);
    if (ui.gesture && st.audio === 'pending' && Au.status === 'available') playCurrentLine(step, false);
  };
  var R_line;

  // ---------- Step renderers ----------
  var R = {};
  R.line = function (s) { R_line(s); };

  R.baselineIntro = function () {
    $screen.appendChild(stage('baseline', { alt: '中性画面：一个扬声器图标' }));
    $screen.appendChild(h('div', { class: 'card fade-in' },
      h('h2', { text: '开始前的小测（可跳过）' }),
      h('p', { text: '约 1 分钟：听 3 句很短的法语，选你理解的意思。不扣分、不贴标签，只是记录你从哪里开始——如果你已经会一些法语，游戏可以少给提示。' }),
      audioBanner(),
      h('div', { class: 'col' },
        btn('开始小测', function () {
          S.progress.baseline = { index: 0, optOrders: C.BASELINE.map(function (b) { return shuffle(b.options.map(function (o) { return o.id; })); }) };
          S.learning.baseline.status = 'in_progress';
          next();
        }, 'primary', { id: 'btnBaselineStart' }),
        btn('跳过，直接开始故事', skipBaseline, '', { id: 'btnBaselineSkip' }))));
  };
  function skipBaseline() {
    S.learning.baseline.status = S.learning.baseline.items.length ? 'partial' : 'skipped';
    if (S.learning.baseline.status === 'partial') S.learning.baseline.status = 'done';
    S.progress.baseline = null;
    S.progress.scene = 'doorway'; S.progress.step = 0; ui.trial = null;
    persist('skip'); render();
  }

  // shared listening-trial UI for baseline and probe
  function trialUI(opts) {
    // opts: {lineId, title, options:[{id,zh}], onAnswer(resp, trialState), extraButtons}
    var key = opts.key;
    if (!ui.trial || ui.trial.key !== key) ui.trial = { key: key, replays: 0, audio: 'pending', sub: false, zh: false, plays: 0 };
    var t = ui.trial, line = C.LINES[opts.lineId];
    if (Au.status === 'unavailable' && t.audio === 'pending') t.audio = 'unavailable';
    var reading = t.audio === 'unavailable' || t.audio === 'failed';
    $screen.appendChild(stage('probe', { alt: '中性画面：只有一个扬声器图标，没有人物和手势' }));
    var ab = audioBanner(); if (ab) $screen.appendChild(ab);
    var card = h('div', { class: 'dialogue' });
    card.appendChild(h('div', { class: 'muted', id: 'trialTitle', text: opts.title }));
    var stim = h('div', { id: 'stimulus' });
    if (reading) stim.appendChild(h('div', null, h('div', { class: 'muted', text: '阅读模式（语音不可用）：' }), fr(line.fr)));
    else if (t.sub) stim.appendChild(fr(line.fr));
    else stim.appendChild(h('p', { class: 'hidden-text', text: t.audio === 'played' ? '🔊 已播放。可以再听一次。' : '点「🔊 播放」听这一句。' }));
    if (t.zh) stim.appendChild(zh(line.zh));
    card.appendChild(stim);
    var answerable = reading || t.audio === 'played' || t.sub;
    card.appendChild(h('div', { class: 'row' },
      reading ? null : btn(t.plays ? '🔁 再听一次' : '🔊 播放', function () {
        if (t.plays) t.replays++;
        t.plays++;
        Au.speak(line.fr.replace(/\u00A0/g, ' '), { speaker: line.speaker }).then(function (r) {
          setAudioMeta();
          if (r === 'stopped' || ui.trial !== t) return;
          if (r === 'played' || !t.voiceInfo) t.voiceInfo = Au.last;
          if (r === 'played') t.audio = 'played'; else if (t.audio !== 'played') t.audio = 'failed';
          rerenderStep();
        });
      }, 'small', { id: 'btnPlay' }),
      reading ? null : btn('显示文字（记为“有帮助”）', function () { t.sub = true; S.learning.helpLog.push({ kind: 'subtitle', context: key, target: line.target, at: L.nowISO() }); rerenderStep(); }, 'small', { id: 'btnTrialSub', disabled: t.sub }),
      btn('中文帮助（记为“有帮助”）', function () { t.zh = true; t.sub = true; S.learning.helpLog.push({ kind: 'chinese', context: key, target: line.target, at: L.nowISO() }); rerenderStep(); }, 'small', { id: 'btnTrialZh', disabled: t.zh })));
    var optsBox = h('div', { class: 'col probe-opts', role: 'group', 'aria-label': '选项' });
    opts.options.forEach(function (o) {
      optsBox.appendChild(btn(o.zh, function () { opts.onAnswer(o.id, t); }, 'choice', { 'data-option': o.id, disabled: !answerable }));
    });
    optsBox.appendChild(btn(opts.unsureLabel || '不确定 / 不知道', function () { opts.onAnswer('unsure', t); }, 'choice', { 'data-option': 'unsure', disabled: !answerable }));
    card.appendChild(optsBox);
    if (!answerable) card.appendChild(h('p', { class: 'muted', text: '先播放这一句，再选择。' }));
    if (opts.extra) card.appendChild(opts.extra);
    $screen.appendChild(card);
    if (ui.gesture && t.audio === 'pending' && Au.status === 'available' && !t.autoTried) {
      t.autoTried = true; t.plays++;
      Au.speak(line.fr.replace(/\u00A0/g, ' '), { speaker: line.speaker }).then(function (r) {
        setAudioMeta();
        if (ui.trial !== t) return;
        if (r === 'stopped') { t.plays--; t.autoTried = false; return; }
        t.voiceInfo = Au.last;
        t.audio = r === 'played' ? 'played' : 'failed'; rerenderStep();
      });
    }
  }
  function rerenderStep() { var g = ui.gesture; ui.gesture = false; render(); ui.gesture = g; }

  R.baseline = function () {
    var b = S.progress.baseline;
    if (!b) { skipBaseline(); return; }
    if (b.index >= C.BASELINE.length) { renderBaselineResult(); return; }
    var item = C.BASELINE[b.index];
    var options = b.optOrders[b.index].map(function (id) { return item.options.filter(function (o) { return o.id === id; })[0]; });
    trialUI({
      key: 'd1.baseline.' + b.index, lineId: item.line, title: '开始前小测 · 第 ' + (b.index + 1) + '/' + C.BASELINE.length + ' 句：这句话是什么意思？',
      options: options,
      onAnswer: function (resp, t) {
        var line = C.LINES[item.line];
        var modality = L.probeModality(t.audio, t.sub);
        var correct = resp === 'unsure' ? null : resp === item.answer;
        var rec = { target: line.target, lesson: 'd1', modality: modality, audioStatus: t.audio === 'pending' ? 'not_used' : t.audio,
          visibleSupport: { level: level(), subtitles: t.sub, chinese: t.zh, gesture: false, speakerVisible: false }, replays: t.replays, firstListen: t.replays === 0,
          response: resp, correct: correct, resultType: 'baseline', evidenceKind: 'baseline', context: 'd1.baseline.' + item.line, speaker: 'neutral', stimulus: item.line,
          audioVoice: voiceFields(t.audio === 'played' || t.audio === 'failed' ? t.voiceInfo : null) };
        S.learning.attempts.push(L.makeAttempt(rec));
        S.learning.baseline.items.push({ line: item.line, response: resp, correct: correct, modality: modality, replays: t.replays, help: t.sub || t.zh });
        b.index++; ui.trial = null; ui.gesture = true; persist('baseline'); render();
      },
      unsureLabel: '不知道（完全没关系）',
      extra: h('div', { class: 'row' }, btn('跳过剩下的小测', skipBaseline, 'small', { id: 'btnBaselineSkip2' }))
    });
  };
  function renderBaselineResult() {
    var items = S.learning.baseline.items;
    var indep = items.filter(function (i) { return i.correct && !i.help && i.modality === 'listening'; }).length;
    S.learning.baseline.status = 'done';
    $screen.appendChild(stage('baseline', { alt: '中性画面' }));
    var card = h('div', { class: 'card fade-in' }, h('h2', { text: '小测记录好了' }),
      h('p', { text: '已记录你的起点（' + items.filter(function (i) { return i.correct; }).length + '/' + items.length + ' 理解；其中纯听、无提示 ' + indep + ' 句）。这不是分数，只用来调整提示多少。' }));
    var col = h('div', { class: 'col' });
    if (indep === items.length && items.length === C.BASELINE.length && level() === 3) {
      card.appendChild(h('p', { text: '你似乎已经认识这些句子。要把提示调少一点吗？（等级 2：有法语字幕，中文按需显示。随时可以在设置里改回。）' }));
      col.appendChild(btn('调到等级 2', function () { S.settings.supportLevel = 2; finishBaseline(); }, 'primary', { id: 'btnLevel2' }));
      col.appendChild(btn('保持等级 3（最多帮助）', finishBaseline, '', { id: 'btnKeep3' }));
    } else col.appendChild(btn('开始故事 ▶', finishBaseline, 'primary', { id: 'btnBaselineDone' }));
    card.appendChild(col);
    $screen.appendChild(card);
  }
  function finishBaseline() { S.progress.baseline = null; S.progress.scene = 'doorway'; S.progress.step = 0; persist('baseline-done'); ui.gesture = true; render(); }

  R.knock = function (step) {
    $screen.appendChild(stage('doorway', artFor(step)));
    $screen.appendChild(h('div', { class: 'dialogue fade-in' },
      h('p', { text: '你拖着行李，来到 411 号公寓门口。今天开始，你是这里的第三位室友。' }),
      h('div', { class: 'row' }, btn('🚪 敲门', function () { L.recordEvent(S, 'arrived'); next(); }, 'primary grow', { id: 'btnKnock' }))));
  };

  R.greet = function (step) {
    $screen.appendChild(stage('doorway', artFor(step)));
    var choose = function (id, frText) {
      S.world.choices.d1_greeting = id;
      S.learning.attempts.push(L.makeAttempt({ target: 'greeting_reply', modality: 'selection', audioStatus: 'not_used',
        visibleSupport: { level: level(), optionsShown: true }, replays: 0, response: id, correct: null,
        resultType: 'supported', evidenceKind: 'choice', production: 'selected_option', context: 'd1.doorway.greet' }));
      L.recordEvent(S, 'greeted', { choice: id, fr: frText });
      next();
    };
    $screen.appendChild(h('div', { class: 'dialogue fade-in' },
      h('p', { text: '你想怎么回应？（选一个，没有对错）' }),
      h('div', { class: 'col' },
        btn(h('span', { lang: 'fr', text: '👋 Bonjour' + NB + '!' }), function () { choose('bonjour', 'Bonjour' + NB + '!'); }, 'choice', { id: 'greetBonjour' }),
        btn(h('span', { lang: 'fr', text: '👋 Salut' + NB + '!' }), function () { choose('salut', 'Salut' + NB + '!'); }, 'choice', { id: 'greetSalut' }),
        btn('🙂 只挥挥手', function () { choose('wave', null); }, 'choice', { id: 'greetWave' })),
      level() >= 2 ? h('p', { class: 'muted', text: 'Bonjour = 通用的“你好”；Salut = 更随意的“嗨”。' }) : null));
  };

  R.nameInput = function (step) {
    var art = artFor(step); art.speaker = 'camille';
    $screen.appendChild(stage('name', art));
    var showZh = level() >= 3 || (ui.nameHelp === S.saveId);
    var showTemplate = level() >= 2 || (ui.nameHelp === S.saveId);
    var input = h('input', { type: 'text', id: 'nameInput', maxlength: '60', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', lang: 'fr',
      placeholder: '昵称，或一句法语（可留空）', 'aria-label': '你的回答' });
    input.value = S.progress.draft || '';
    var tmr = null;
    input.addEventListener('input', function () { S.progress.draft = input.value; clearTimeout(tmr); tmr = setTimeout(function () { persist('draft'); }, 300); });
    var usedTemplate = !!S.progress.nameTemplate;
    var card = h('div', { class: 'dialogue fade-in' },
      h('div', null, h('span', { class: 'speaker camille', text: '▼ Camille' })),
      fr('Tu t\u2019appelles comment' + NB + '?'),
      showZh ? zh('她在问你叫什么名字。可以只说一个昵称，也可以试着说一句法语，也可以跳过。不需要真实姓名。') : null,
      showTemplate ? h('p', { class: 'muted', id: 'nameTemplateHint' }, '可以这样说：', h('b', { lang: 'fr', text: 'Je m\u2019appelle' }), ' + 昵称。') : null,
      input,
      h('div', { class: 'row' },
        btn('插入 “Je m’appelle …”', function () {
          S.progress.nameTemplate = true;
          if (!/je m.?appelle/i.test(input.value)) input.value = 'Je m\u2019appelle ' + input.value;
          S.progress.draft = input.value; persist('draft'); input.focus();
        }, 'small', { id: 'btnTemplate' }),
        showZh ? null : btn('中文', function () { ui.nameHelp = S.saveId; S.learning.helpLog.push({ kind: 'chinese', context: 'd1.name.input', target: 'tu_tappelles_comment', at: L.nowISO() }); persist('help'); render(); }, 'small', { id: 'btnNameZh' })),
      h('div', { class: 'row' },
        btn('回答 ✓', function () { submitName(input.value, showZh, showTemplate); }, 'primary grow', { id: 'btnNameSubmit' }),
        btn('先不说', function () { submitName('', showZh, showTemplate); }, 'grow', { id: 'btnNameSkip' })));
    $screen.appendChild(card);
  };
  function submitName(raw, showZh, showTemplate) {
    var cls = L.classifyNameResponse(raw);
    var supported = !!(showZh || showTemplate || S.progress.nameTemplate);
    S.learning.attempts.push(L.makeAttempt({
      target: 'try_je_mappelle', modality: 'writing', audioStatus: 'not_used',
      visibleSupport: { level: level(), chinese: !!showZh, templateHint: !!showTemplate, templateInserted: !!S.progress.nameTemplate },
      replays: 0, response: raw, correct: null, production: cls.kind,
      resultType: supported ? 'supported' : 'independent', evidenceKind: 'production', context: 'd1.name.input', speaker: 'camille'
    }));
    L.applyName(S, cls, raw);
    delete S.progress.nameTemplate;
    next();
  }

  R.nameReaction = function (step) {
    $screen.appendChild(stage('name', artFor(step)));
    var k = S.world.choices.d1_name && S.world.choices.d1_name.kind;
    var nick = S.player.nickname;
    var body = h('div', { class: 'dialogue fade-in' });
    if (nick) body.appendChild(h('div', null, h('span', { class: 'speaker camille', text: 'Camille' }), ' ', h('span', { class: 'muted', text: '（无语音：名字由你决定）' }), fr('« ' + nick + NB + '! » 🙂')));
    else body.appendChild(h('p', { text: k === 'skipped' ? 'Camille 笑了笑，没有追问。🙂' : 'Camille 点点头，笑了。🙂' }));
    body.appendChild(h('p', { class: 'muted', text: 'Noé 挥手。他们带你去看你的房间角落。' }));
    body.appendChild(h('div', { class: 'row' }, btn('继续 ▶', next, 'primary grow', { id: 'btnNext' })));
    $screen.appendChild(body);
  };

  R.water = function (step) {
    var watered = S.world.completedEvents.indexOf('plant_watered') >= 0;
    var art = artFor(step); art.drops = ui.justWatered; ui.justWatered = false;
    $screen.appendChild(stage('plant', art));
    var later = S.world.completedEvents.indexOf('plant_later') >= 0;
    var card = h('div', { class: 'dialogue fade-in' },
      h('p', { text: watered ? '🪴 植物喝饱了水，叶子立起来了。' : 'Camille 把水壶递给你。植物的叶子垂着。' }),
      h('div', { class: 'row' },
        btn(watered ? '✓ 已浇水' : '💧 浇水', function () {
          var r = L.waterPlant(S, 'd1.water', 'plant');
          if (r.counted) { L.recordEvent(S, 'plant_watered'); ui.justWatered = true; persist('water'); toast('💧 浇好了。'); }
          else toast('已经浇过了——同一次照料不会重复计算。');
          rerenderStep();
        }, watered ? 'grow' : 'primary grow', { id: 'btnWater', 'aria-pressed': watered ? 'true' : 'false' }),
        watered || later ? null : btn('稍后再浇', function () { L.recordEvent(S, 'plant_later'); persist('later'); rerenderStep(); }, 'grow', { id: 'btnWaterLater' })),
      h('p', { class: 'muted', text: '可以随时按右上角 ⏸ 暂停离开。' }),
      (watered || later) ? h('div', { class: 'row' }, btn('继续 ▶', next, 'primary grow', { id: 'btnNext' })) : null);
    $screen.appendChild(card);
  };

  R.beat = function (step) {
    $screen.appendChild(stage('cat', artFor(step)));
    $screen.appendChild(h('div', { class: 'dialogue fade-in' },
      h('p', { text: '门关上了。沙发后面……有什么东西在动？🐾' }),
      h('div', { class: 'row' }, btn('看一看 ▶', function () {
        S.world.facts.catInApartment = true; S.world.knowledge.player.knowsCat = true;
        next();
      }, 'primary grow', { id: 'btnNext' }))));
  };

  R.secret = function (step) {
    $screen.appendChild(stage('cat', artFor(step)));
    $screen.appendChild(h('div', { class: 'dialogue fade-in' },
      h('p', { text: 'Noé 把手指放在嘴边，看着你。你怎么做？（这是剧情选择，没有对错，也不算法语成绩）' }),
      h('div', { class: 'col' },
        btn('🤫 点点头：我帮你保密', function () { L.applySecretChoice(S, 'keep'); next(); }, 'choice', { id: 'secretKeep' }),
        btn('✋ 摇摇头：我不想保密', function () { L.applySecretChoice(S, 'decline'); next(); }, 'choice', { id: 'secretDecline' }))));
  };
  R.secretReaction = function (step) {
    var keep = S.world.choices.d1_secret === 'keep';
    var art = artFor(step); art.noe = keep ? 'happy' : 'sad';
    $screen.appendChild(stage('cat', art));
    $screen.appendChild(h('div', { class: 'dialogue fade-in' },
      h('p', { id: 'secretResult', text: keep ? 'Noé 松了一口气，冲你比了个大拇指。😊 Croissant 跳上了沙发。' : 'Noé 有点担心地挠挠头。😟 不过这是你的选择。Croissant 跳上了沙发。' }),
      h('p', { class: 'muted', text: 'Camille 当时不在家，她不知道刚才发生了什么。' }),
      h('div', { class: 'row' }, btn('继续 ▶', next, 'primary grow', { id: 'btnNext' }))));
  };

  R.probeIntro = function () {
    $screen.appendChild(stage('probe', { alt: '中性画面' }));
    $screen.appendChild(h('div', { class: 'card fade-in' },
      h('h2', { text: '小练习：是在说名字，还是在问名字？' }),
      h('p', { text: '你会听到 ' + C.PROBE.items.length + ' 句话。画面上没有人物、没有手势、不显示文字。每句请判断：' }),
      h('ul', null, h('li', { text: '对方在告诉你他/她的名字' }), h('li', { text: '对方在问你的名字' })),
      h('p', { text: '可以重播，可以选“不确定”。需要帮助随时可以点（会记录为“有帮助”，这完全没问题）。结束后再告诉你答案。' }),
      audioBanner(),
      h('div', { class: 'row' }, btn('开始', function () {
        S.progress.probe = { order: shuffle(C.PROBE.items), optOrders: C.PROBE.items.map(function () { return shuffle(C.PROBE.options.map(function (o) { return o.id; })); }), index: 0 };
        next();
      }, 'primary grow', { id: 'btnProbeStart' }))));
  };
  R.probe = function () {
    var p = S.progress.probe;
    if (!p) { S.progress.step = 0; render(); return; }
    if (p.index >= p.order.length) { next(); return; }
    var lineId = p.order[p.index], line = C.LINES[lineId];
    var options = p.optOrders[p.index].map(function (id) { return C.PROBE.options.filter(function (o) { return o.id === id; })[0]; });
    trialUI({
      key: 'd1.probe.' + p.index, lineId: lineId, title: '第 ' + (p.index + 1) + '/' + p.order.length + ' 句', options: options,
      onAnswer: function (resp, t) {
        var audio = t.audio === 'pending' ? 'not_used' : t.audio;
        var modality = L.probeModality(audio, t.sub);
        var rt = modality === 'reading' && !t.zh ? 'independent' : L.probeResultType({ subtitlesShown: t.sub, chineseShown: t.zh, answerCue: false });
        S.learning.attempts.push(L.makeAttempt({
          target: line.target, lesson: 'd1', modality: modality, audioStatus: audio,
          visibleSupport: { level: level(), subtitles: t.sub, chinese: t.zh, gesture: false, speakerVisible: false, nameHighlight: false },
          replays: t.replays, firstListen: t.replays === 0, response: resp, correct: resp === 'unsure' ? null : resp === line.func,
          resultType: rt, evidenceKind: 'discrimination', context: 'd1.probe.t' + (p.index + 1) + '.' + line.speaker, speaker: line.speaker, stimulus: lineId,
          audioVoice: voiceFields(audio === 'played' || audio === 'failed' ? t.voiceInfo : null)
        }));
        p.index++; ui.trial = null; ui.gesture = true;
        if (p.index >= p.order.length) { L.recordEvent(S, 'probe_done'); S.review = L.buildReview(S, new Date()); next(); }
        else { persist('probe'); render(); }
      }
    });
  };
  R.probeDone = function () {
    var trials = S.learning.attempts.filter(function (a) { return a.evidenceKind === 'discrimination' && a.lesson === 'd1'; }).slice(-C.PROBE.items.length);
    var ps = L.probeStats(S);
    $screen.appendChild(stage('probe', { alt: '中性画面' }));
    var list = h('ol', null);
    trials.forEach(function (a) {
      var line = a.stimulus ? C.LINES[a.stimulus] : null;
      list.appendChild(h('li', null, line ? h('span', { lang: 'fr', text: line.fr + ' ' }) : '',
        h('span', { class: 'muted', text: '（' + (line && line.func === 'tells' ? '告诉你名字' : '问你的名字') + '）你的选择：' + (a.response === 'unsure' ? '不确定' : a.correct ? '✓ 对' : '✗ 不同') + (a.replays ? ' · 重听 ' + a.replays : '') + (a.resultType === 'supported' ? ' · 有帮助' : '') })));
    });
    $screen.appendChild(h('div', { class: 'card fade-in', id: 'probeResult' },
      h('h2', { text: '练习记录' }),
      h('p', { text: '不看文字、第一次听就选对：' + ps.independentFirstListenCorrect + ' 句；重听后选对：' + ps.independentReplayCorrect + ' 句；有帮助时选对：' + ps.supportedCorrect + ' 句。' + (ps.readingOnly ? '（其中 ' + ps.readingOnly + ' 句是阅读模式，不算听力。）' : '') }),
      h('p', { class: 'muted', text: '只有几句，可能有猜的成分——这只是一个小记录，不是等级。下面是答案：' }),
      list,
      h('div', { class: 'row' }, btn('去写日记 ▶', next, 'primary grow', { id: 'btnNext' }))));
  };

  function chronicleList() {
    var ul = h('ul', { class: 'chron', id: 'chronicle' });
    S.diary.chronicle.forEach(function (c) { ul.appendChild(h('li', { text: L.chronicleText(c) })); });
    if (!S.diary.chronicle.length) ul.appendChild(h('li', { class: 'muted', text: '还没有发生什么。' }));
    return ul;
  }
  R.diary = function () {
    $screen.appendChild(stage('diary', { watered: S.plant.careState === 'watered', cat: S.world.facts.catInApartment, alt: '书桌上摊开的日记本，旁边是你的植物' }));
    var ta = h('textarea', { id: 'journal', maxlength: '2000', lang: 'fr', placeholder: '可以写 Je m’appelle…、一句你自己的话（任何语言），或者什么都不写。', 'aria-label': '私人日记' });
    ta.value = S.progress.draft || '';
    var tmr = null;
    ta.addEventListener('input', function () { S.progress.draft = ta.value; clearTimeout(tmr); tmr = setTimeout(function () { persist('draft'); }, 300); });
    var share = h('input', { type: 'checkbox', id: 'journalShare' });
    $screen.appendChild(h('div', { class: 'card fade-in' },
      h('h2', { text: '📖 日记 · 第一天' }),
      h('h3', { text: '今天发生的事（游戏自动记录，只写你亲历的事）' }),
      chronicleList(),
      h('h3', { text: '私人日记（可选，原样保存）' }),
      ta,
      h('div', { class: 'row' }, btn('插入 “Je m’appelle …”', function () {
        S.progress.journalTemplate = true; ta.value = (ta.value ? ta.value + '\n' : '') + 'Je m\u2019appelle '; S.progress.draft = ta.value; persist('draft'); ta.focus();
      }, 'small', { id: 'btnJournalTemplate' })),
      h('label', { class: 'check' }, share, '允许把这条日记放进反馈摘要（默认不放）'),
      h('div', { class: 'row' }, btn('保存并结束第一天 ✓', function () {
        var text = ta.value; // stored verbatim, never rewritten
        if (text.length) {
          var j = { id: 'j-' + Date.now().toString(36), at: L.nowISO(), original: text, usedTemplate: !!S.progress.journalTemplate, suggestedRewrite: null, share: !!share.checked };
          S.diary.journal.push(j);
          var cls = L.classifyNameResponse(text.split('\n')[0]);
          S.learning.attempts.push(L.makeAttempt({ target: cls.kind === 'full_structure' ? 'try_je_mappelle' : null, modality: 'writing', audioStatus: 'not_used',
            visibleSupport: { level: level(), templateInserted: !!S.progress.journalTemplate }, replays: 0, response: '[private journal ' + j.id + ']',
            production: cls.kind, resultType: S.progress.journalTemplate ? 'supported' : 'independent', evidenceKind: 'production', context: 'd1.diary.journal' }));
        }
        delete S.progress.journalTemplate;
        L.recordEvent(S, 'day1_complete');
        if (!S.plant.mementos.some(function (m) { return m.id === 'd1'; })) { S.plant.growth += 1; S.plant.mementos.push({ id: 'd1', label: '🌱 第一天的新叶', at: L.nowISO() }); }
        S.progress.status = 'complete';
        S.review = L.buildReview(S, new Date());
        next();
      }, 'primary grow', { id: 'btnDiarySave' }))));
  };

  R.end = function () {
    $screen.appendChild(stage('end', { watered: S.plant.careState === 'watered', cat: S.world.facts.catInApartment, alt: '夜晚，月亮，你的植物和猫' }));
    $screen.appendChild(h('div', { class: 'card fade-in', id: 'endCard' },
      h('h2', { text: '🌙 第一天结束了' }),
      h('p', { text: '植物长出了一片新叶（纪念：第一天）。你的选择、日记和练习记录都已保存在这台设备上。' }),
      h('p', { class: 'muted', text: 'Day 2「Le petit-déjeuner」还在制作中，暂时不能玩。' }),
      h('div', { class: 'col' },
        btn('📝 生成反馈摘要', openSummary, 'primary', { id: 'btnEndSummary' }),
        btn('📖 查看日记', openDiary, '', { id: 'btnEndDiary' }),
        btn('🏠 回到主菜单', goTitle, '', { id: 'btnEndHome' }))));
  };

  // ---------- Panels ----------
  function openSettings() {
    if (!S) { S = L.newSave({ reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }); }
    var levels = [
      [3, '3 · 最多帮助：语音 + 法语字幕 + 中文解释'],
      [2, '2 · 中等：语音 + 法语字幕，中文按需'],
      [1, '1 · 较少：先听，文字和中文按需'],
      [0, '0 · 独立尝试：先听，不主动给任何提示（重播和帮助一直可用）']
    ];
    var box = h('div', { class: 'pad' });
    box.appendChild(h('h3', { text: '帮助程度' }));
    levels.forEach(function (lv) {
      var r = h('input', { type: 'radio', name: 'lvl', value: String(lv[0]), id: 'lvl' + lv[0] });
      r.checked = S.settings.supportLevel === lv[0];
      r.addEventListener('change', function () { S.settings.supportLevel = lv[0]; persist('settings'); });
      box.appendChild(h('label', { class: 'radio', for: 'lvl' + lv[0] }, r, h('span', { text: lv[1] })));
    });
    var rm = h('input', { type: 'checkbox', id: 'optReduced' }); rm.checked = !!S.settings.reducedMotion;
    rm.addEventListener('change', function () { S.settings.reducedMotion = rm.checked; persist('settings'); applySettings(); });
    var lt = h('input', { type: 'checkbox', id: 'optLarge' }); lt.checked = !!S.settings.largeText;
    lt.addEventListener('change', function () { S.settings.largeText = lt.checked; persist('settings'); applySettings(); });
    box.appendChild(h('h3', { text: '显示' }));
    box.appendChild(h('label', { class: 'check' }, rm, '减少动画'));
    box.appendChild(h('label', { class: 'check' }, lt, '大字体'));
    box.appendChild(voiceSettings());
    openOverlay(sheet('⚙️ 设置', box));
  }
  // ---------- voice settings (device-level: stored in a411.device.audio, not in the save) ----------
  var TEST_LINES = { camille: 'Bonjour\u00A0! Je m\u2019appelle Camille.', noe: 'Salut\u00A0! Je m\u2019appelle Noé.' };
  function voiceTip() {
    var pf = Au.platform();
    var ios = h('div', { class: 'card', id: 'voiceTipIos' },
      h('b', { text: '📱 iPhone / iPad' }),
      h('p', { text: '如果法语听起来很机械，可以试着下载更好的法语声音（需要 Wi‑Fi，每个声音约 100 MB 以上）：' }),
      h('p', { lang: 'en', class: 'path', text: 'Settings › Accessibility › Spoken Content › Voices › French' }),
      h('p', { text: '选一个法国法语（France）的声音，例如 Audrey 或 Thomas，下载它的 Enhanced 或 Premium 版本。下载后完全关闭 Safari 再打开游戏，回到这里点「🔄 重新检测声音」。' }),
      h('p', { class: 'muted', text: '注意：根据目前公开的测试，iPhone 上的 Safari（以及 iPhone 上的其他浏览器）经常不会把下载的 Enhanced / Premium 声音提供给网页使用。如果下载后这里的列表没有出现它，这是 Apple 的限制，不是你操作错了。少数系统版本里，下载新版本后原来的法语声音反而在网页里消失——这时在同一页面把刚下载的声音左滑删除即可恢复。我们也在准备固定的高质量法语录音，让所有手机听到同样自然的声音。' }));
    var android = h('div', { class: 'card', id: 'voiceTipAndroid' },
      h('b', { text: '🤖 Android' }),
      h('p', null, '在系统设置里搜索「文字转语音 / ', h('span', { lang: 'en', text: 'Text-to-speech' }), '」，首选引擎选 Google 语音服务，进入它的设置 → 安装语音数据 → 法语（法国），下载你喜欢的声音。不同品牌的菜单名称会略有不同。下载后重新打开浏览器，回到这里点「🔄 重新检测声音」。'));
    var desktop = h('div', { class: 'card', id: 'voiceTipDesktop' },
      h('b', { text: '💻 电脑' }),
      h('p', { text: 'Microsoft Edge 自带高质量的法语 Natural 声音（如 Denise、Henri），Chrome 有「Google français」。Mac 上 Safari 往往用不到下载的高级声音，Chrome / Edge 一般可以。' }));
    var first = pf === 'ios' ? ios : pf === 'android' ? android : desktop;
    var rest = [ios, android, desktop].filter(function (x) { return x !== first; });
    return h('div', { id: 'voiceTip' }, first, h('details', null, h('summary', { text: '其他设备怎么办' }), rest));
  }
  function voiceSettings() {
    var wrap = h('div', { id: 'voiceSettings' });
    wrap.appendChild(h('h3', { text: '🔊 法语声音（只保存在这台设备）' }));
    var status = h('p', { id: 'audioTestResult', class: 'muted', text: '法语语音：' + audioStatusText() });
    wrap.appendChild(status);
    var lists = h('div', { id: 'voiceLists' });
    wrap.appendChild(lists);
    function voiceSelect(sp) {
      var cur = (Au.prefs || {})[sp] || '';
      var a = Au.assign || {};
      var autoR = a[sp];
      var sel = h('select', { id: 'voice_' + sp, 'aria-label': (sp === 'noe' ? 'Noé' : 'Camille') + ' 的声音' });
      sel.appendChild(h('option', { value: '', text: '自动（推荐' + (autoR && !cur ? '：' + autoR.name : '') + '）' }));
      Au.voices.forEach(function (r) {
        var o = h('option', { value: r.key, text: r.name + ' · ' + r.lang + ' · ' + Au.qualityZh(r.quality) });
        if (r.key === cur) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var patch = {}; patch[sp] = sel.value || null; Au.savePrefs(patch);
        setAudioMeta(); persist('voice'); renderLists();
        testVoice(sp);
      });
      return sel;
    }
    function testVoice(sp) {
      if (Au.status !== 'available') { status.textContent = '法语语音：' + audioStatusText(); return; }
      status.textContent = '播放中…';
      Au.speak(TEST_LINES[sp], { speaker: sp }).then(function (r) {
        var info = Au.last || {};
        status.textContent = r === 'played' ? '✓ 浏览器报告已播放（' + info.voice + ' · ' + Au.qualityZh(info.quality) + ' · 语速 ' + info.rate + '）。如果没听到声音，请检查静音开关和音量。'
          : r === 'stopped' ? '已停止。' : '⚠️ 播放失败——游戏会显示文字（阅读模式）。';
        persist('audio');
      });
    }
    function renderLists() {
      lists.innerHTML = '';
      status.textContent = '法语语音：' + audioStatusText();
      if (Au.status !== 'available') return;
      var a = Au.assign;
      lists.appendChild(h('label', { class: 'field' }, h('span', { text: 'Camille 的声音' }), voiceSelect('camille')));
      lists.appendChild(h('div', { class: 'row' }, btn('▶ 试听 Camille', function () { testVoice('camille'); }, 'small grow', { id: 'btnAudioTest' })));
      lists.appendChild(h('label', { class: 'field' }, h('span', { text: 'Noé 的声音' }), voiceSelect('noe')));
      lists.appendChild(h('div', { class: 'row' }, btn('▶ 试听 Noé', function () { testVoice('noe'); }, 'small grow', { id: 'btnAudioTestNoe' })));
      var good = Au.voices.filter(function (r) { return !r.robotic; });
      lists.appendChild(h('p', { class: 'muted', id: 'voiceNote', text: a.distinct ? 'Camille 和 Noé 用两个不同的声音。'
        : good.length <= 1 ? '这台设备只有一个合适的法语声音，所以 Camille 和 Noé 共用它（Noé 的音调稍低一点）。' : 'Camille 和 Noé 现在用同一个声音。' }));
      var best = good[0];
      if (!best || ['standard', 'compact'].indexOf(best.quality) >= 0) lists.appendChild(h('p', { class: 'muted', id: 'voiceQualityNote', text: '这台设备目前只有基础质量的法语声音，听起来可能有点机械。下面有改善办法。' }));
    }
    renderLists();
    // speed
    wrap.appendChild(h('h3', { text: '语速（这台设备记住）' }));
    var rates = h('div', { class: 'row', role: 'radiogroup', 'aria-label': '语速' });
    [[0.75, '慢 0.75'], [0.9, '稍慢 0.9'], [1.0, '正常 1.0']].forEach(function (rr) {
      var r = h('input', { type: 'radio', name: 'rate', value: String(rr[0]), id: 'rate' + String(rr[0]).replace('.', '') });
      r.checked = Au.rate() === rr[0];
      r.addEventListener('change', function () { Au.savePrefs({ rate: rr[0] }); setAudioMeta(); persist('settings'); testVoice('camille'); });
      rates.appendChild(h('label', { class: 'radio', for: r.id }, r, h('span', { text: rr[1] })));
    });
    wrap.appendChild(rates);
    wrap.appendChild(h('div', { class: 'row' }, btn('🔄 重新检测声音', function () {
      status.textContent = '检测中…';
      Au.init().then(function () { setAudioMeta(); S.meta.audio.checkedAt = L.nowISO(); persist('audio'); renderLists(); });
    }, 'small grow', { id: 'btnVoiceRescan' })));
    wrap.appendChild(h('h3', { text: '想要更自然的声音？' }));
    wrap.appendChild(voiceTip());
    return wrap;
  }
  function audioStatusText() {
    return Au.status === 'available' ? '可用（找到 ' + Au.voices.length + ' 个法语声音）' : Au.status === 'unavailable' ? '不可用（' + Au.reason + '）→ 阅读模式' : '检测中…';
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function openSave() {
    var box = h('div', { class: 'pad' });
    box.appendChild(h('p', { id: 'saveInfo', text: S ? ('存档 schema v' + S.schemaVersion + ' · app ' + S.appVersion + ' · 内容 ' + S.contentVersion + ' · 最后保存 ' + new Date(S.updatedAt).toLocaleString()) : '还没有存档。' }));
    box.appendChild(h('p', { class: 'muted', text: '存档只在这台设备的这个浏览器里。换手机、清除浏览器数据或用隐私模式都会丢失——导出的文件可以在任何设备上导入。' }));
    var msg = h('div', { id: 'importMsg', role: 'status' });
    if (S) {
      box.appendChild(h('div', { class: 'col' },
        btn('⬇️ 导出存档（JSON 文件）', function () {
          persist('export');
          var d = new Date(); var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
          download('appartement-411-save-' + stamp + '.json', JSON.stringify(S, null, 2));
          toast('已导出。');
        }, 'primary', { id: 'btnExport' }),
        btn('📋 显示存档文本（可复制保存）', function () {
          var ta = h('textarea', { class: 'summary', readonly: true, id: 'exportText' }); ta.value = JSON.stringify(S);
          box.insertBefore(ta, msg);
        }, '', { id: 'btnExportText' })));
    }
    box.appendChild(h('h3', { text: '导入存档' }));
    box.appendChild(h('p', { class: 'muted', text: '导入前会验证文件；文件有问题时，当前存档完全不会被改动。导入成功前会先备份当前存档。' }));
    var file = h('input', { type: 'file', id: 'importFile', accept: 'application/json,.json,text/plain', 'aria-label': '选择存档文件' });
    var paste = h('textarea', { id: 'importText', placeholder: '或者把存档文本粘贴到这里', 'aria-label': '粘贴存档文本' });
    box.appendChild(file);
    box.appendChild(paste);
    function doImport(text) {
      if (!storage) { msg.className = 'banner warn'; msg.textContent = '本机存储不可用，无法导入。'; return; }
      var r = storage.importText(text, S);
      if (!r.ok) { msg.className = 'banner warn'; msg.textContent = '✗ 没有导入：' + r.errors.slice(0, 4).join('；') + '（当前存档未改动）'; return; }
      S = r.save; ui.line = null; ui.trial = null;
      msg.className = 'banner ok'; msg.textContent = '✓ 已导入' + (r.migratedFrom !== null && r.migratedFrom !== undefined ? '（已从 v' + r.migratedFrom + ' 升级）' : '') + '。之前的存档已备份。';
      ui.view = 'title'; render();
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      if (f.size > 1000000) { msg.className = 'banner warn'; msg.textContent = '✗ 文件太大（当前存档未改动）'; return; }
      var rd = new FileReader(); rd.onload = function () { doImport(String(rd.result)); }; rd.onerror = function () { msg.className = 'banner warn'; msg.textContent = '✗ 读取文件失败'; }; rd.readAsText(f);
    });
    box.appendChild(h('div', { class: 'row' }, btn('导入粘贴的文本', function () { doImport(paste.value); }, 'small', { id: 'btnImportText' })));
    box.appendChild(msg);
    if (storage) {
      var bks = storage.listBackups();
      box.appendChild(h('h3', { text: '自动备份（最多 5 份）' }));
      if (!bks.length) box.appendChild(h('p', { class: 'muted', text: '暂无。' }));
      bks.slice().reverse().forEach(function (b) {
        box.appendChild(h('div', { class: 'row' }, h('span', { class: 'muted', text: new Date(b.time).toLocaleString() + ' · ' + b.label }),
          btn('恢复', function () { var raw = storage.readBackup(b.key); doImport(raw || ''); }, 'small')));
      });
    }
    openOverlay(sheet('💾 存档', box));
  }

  function openSummary() {
    if (!S) { toast('还没有存档。'); return; }
    var note = h('textarea', { id: 'summaryNote', placeholder: '（可选）遇到的问题或感受，例如：第 2 句听不清' });
    var inc = h('input', { type: 'checkbox', id: 'summaryIncludeJournal' });
    var out = h('textarea', { class: 'summary', id: 'summaryText', readonly: true, rows: '14', 'aria-label': '反馈摘要' });
    function gen() { out.value = L.buildSummary(S, { note: note.value, includeJournal: inc.checked }); }
    note.addEventListener('input', gen); inc.addEventListener('change', gen);
    gen();
    var box = h('div', { class: 'pad' },
      h('p', { class: 'muted', text: '把这段文字和你的反馈一起发给 CEO。私人日记默认不包含；昵称也不包含。游戏不会自动上传任何东西。' }),
      note,
      h('label', { class: 'check' }, inc, '包含我标记为“允许分享”的日记'),
      out,
      h('div', { class: 'row' }, btn('📋 复制', function () {
        gen();
        var okFn = function () { toast('已复制。'); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(out.value).then(okFn, fallback); else fallback();
        function fallback() { out.removeAttribute('readonly'); out.select(); try { document.execCommand('copy'); okFn(); } catch (e) { toast('请长按文字手动复制。'); } out.setAttribute('readonly', ''); }
      }, 'primary grow', { id: 'btnCopySummary' })));
    openOverlay(sheet('📝 反馈摘要', box));
  }

  function openDiary() {
    if (!S) return;
    var box = h('div', { class: 'pad' }, h('h3', { text: '今天发生的事' }), chronicleList(), h('h3', { text: '私人日记（原文）' }));
    if (!S.diary.journal.length) box.appendChild(h('p', { class: 'muted', text: '没有写。' }));
    S.diary.journal.forEach(function (j) {
      box.appendChild(h('div', { class: 'card' }, h('div', { class: 'journal-original', lang: 'fr', style: 'white-space:pre-wrap', text: j.original }),
        h('div', { class: 'muted', text: new Date(j.at).toLocaleString() + (j.usedTemplate ? ' · 用了句型提示' : '') + (j.share ? ' · 允许分享' : ' · 不分享') })));
    });
    openOverlay(sheet('📖 日记', box));
  }

  // ---------- boot ----------
  function boot() {
    initStorage();
    if (storage) {
      var r = storage.load(new Date());
      notices = r.notices || [];
      S = r.save;
      if (S && S.plant) { var ps = L.plantStatus(S.plant, new Date()); if (ps !== S.plant.careState) { S.plant.careState = ps; persist('plant-thirst'); } }
    }
    applySettings();
    Au.loadPrefs(S ? S.settings.speechRate : null);
    render();
    Au.init().then(function () {
      // only write when the device's audio situation actually changed (keeps reopen side-effect free)
      if (S && (S.meta.audio.status !== Au.status || S.meta.audio.voice !== Au.voiceName)) { setAudioMeta(); S.meta.audio.checkedAt = L.nowISO(); persist('audio-init'); }
      if (ui.view !== 'title') rerenderStep();
    });
  }
  window.A411.App = { state: function () { return S; }, render: render, persist: persist }; // debug/test hook
  boot();
})();
