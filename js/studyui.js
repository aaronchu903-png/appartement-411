/* Study, placement, progress and profile gate. DOM only; rules live in learn.js. */
(function (root) {
  'use strict';
  var Learn, Deck, Au;
  function bind() { Learn = root.A411.Learn; Deck = root.A411.Deck; Au = root.A411.Audio; }

  function textOf(item, lang, field) { return lang === 'en' ? item[field === 'zh' ? 'en' : field === 'noteZh' ? 'noteEn' : field] : item[field]; }
  function meaning(item, lang) { return lang === 'en' ? item.en : item.zh; }
  function note(item, lang) { return lang === 'en' ? item.noteEn : item.noteZh; }
  function optLabel(o, lang) { return lang === 'en' ? o.en : o.zh; }

  function fillToday(ctx, host) {
    bind();
    var T = ctx.T, learn = ctx.learn, now = new Date();
    var q = Learn.buildQueue(learn, Deck, now);
    var reviews = q.queue.filter(function (x) { return !x.isNew; }).length;
    var news = q.queue.filter(function (x) { return x.isNew; }).length;
    var mins = Math.max(1, Math.round(q.queue.length * 0.45)) || 1;
    var days = Object.keys(learn.days || {}).length;
    var card = ctx.h('div', { class: 'card', id: 'todayCard' },
      ctx.h('h3', { id: 'todayTitle', text: T('today') + ' · ' + ctx.profileName }),
      ctx.h('p', { id: 'todayStats' },
        T('reviewsDue') + ' ', ctx.h('b', { id: 'todayDue', text: String(q.overdue) }), ' · ',
        T('newItems') + ' ', ctx.h('b', { id: 'todayNew', text: String(Math.min(news, learn.settings.newCap)) }), ' · ',
        T('minutes') + ' ', ctx.h('b', { text: String(q.queue.length ? mins : 0) })),
      ctx.h('p', { class: 'muted', text: T('capNote') }),
      ctx.h('p', { class: 'muted', text: T('noStreak') + ' · ' + T('studiedDays') + ' ' + days }),
      ctx.h('p', { class: 'muted', id: 'syncNote', text: T('syncLimit') }));
    var col = ctx.h('div', { class: 'col' });
    if (learn.session && learn.session.active) col.appendChild(ctx.btn(T('resumeStudy'), ctx.openStudy, 'primary', { id: 'btnResumeStudy' }));
    col.appendChild(ctx.btn(T('startReview'), function () { ctx.beginStudy(null); }, 'primary', { id: 'btnReview' }));
    col.appendChild(ctx.btn(T('quick'), function () { ctx.beginStudy({ totalCap: 4, newCap: 2, reviewCap: 4 }); }, '', { id: 'btnQuick' }));
    col.appendChild(ctx.btn(T('progress'), ctx.openProgress, '', { id: 'btnProgress' }));
    card.appendChild(col);
    host.appendChild(card);
  }

  function renderGate(ctx) {
    bind();
    var T = ctx.T;
    var wrap = ctx.h('div', { class: 'pad fade-in', id: 'profileGate' });
    wrap.appendChild(ctx.h('h1', { lang: 'fr', text: 'L’Appartement 411' }));
    wrap.appendChild(ctx.h('h2', { text: ctx.legacy ? T('who') : T('pick') }));
    wrap.appendChild(ctx.h('p', { text: ctx.legacy ? T('whoNote') : T('pickNote') }));
    var col = ctx.h('div', { class: 'col' });
    if (ctx.legacy) {
      col.appendChild(ctx.btn(T('assignJinyi'), function () { ctx.onChoose('jinyi', true); }, 'primary', { id: 'assignJinyi' }));
      col.appendChild(ctx.btn(T('assignYuechao'), function () { ctx.onChoose('yuechao', true); }, '', { id: 'assignYuechao' }));
    } else {
      col.appendChild(ctx.btn('Jinyi', function () { ctx.onChoose('jinyi', false); }, 'primary', { id: 'pickJinyi' }));
      col.appendChild(ctx.btn('Yuechao', function () { ctx.onChoose('yuechao', false); }, '', { id: 'pickYuechao' }));
    }
    wrap.appendChild(col);
    wrap.appendChild(ctx.h('p', { class: 'muted', text: T('syncLimit') }));
    ctx.screen.appendChild(wrap);
  }

  function currentEntry(learn) {
    var s = learn.session;
    if (!s || !s.active) return null;
    return s.queue[s.index] || null;
  }

  function renderSession(ctx) {
    bind();
    var T = ctx.T, learn = ctx.learn, lang = ctx.lang();
    var entry = currentEntry(learn);
    ctx.screen.appendChild(ctx.h('div', { class: 'pad' },
      ctx.h('div', { class: 'row' },
        ctx.btn(T('backHome'), ctx.closeStudy, '', { id: 'btnStudyHome' }),
        ctx.h('span', { class: 'muted', id: 'studyPos', text: learn.session ? ((learn.session.index + 1) + ' / ' + learn.session.queue.length) : '' }))));
    if (!entry) {
      var c = Learn.counts(learn);
      ctx.screen.appendChild(ctx.h('div', { class: 'card', id: 'studyDone' },
        ctx.h('h2', { text: T('doneToday') }),
        ctx.h('p', { text: T('cards') + ' · new ' + c.new + ' · learning ' + c.learning + ' · review ' + c.review + ' · mature ' + c.mature }),
        ctx.btn(T('backHome'), ctx.closeStudy, 'primary', { id: 'btnDoneHome' })));
      return;
    }
    var item = Learn.itemById(Deck, learn, entry.itemId);
    if (!item) { learn.session.index++; ctx.save(); ctx.render(); return; }
    var audioOk = entry.modality === 'listening' && Au.canPlay(item.id);
    var modality = entry.modality;
    if (modality === 'listening' && !audioOk) modality = 'reading';
    var box = ctx.h('div', { class: 'card', id: 'studyCard' });
    box.appendChild(ctx.h('div', { class: 'muted', text: item.band + ' · ' + item.grammar + ' · ' + modality }));
    var sess = learn.session;
    if (modality === 'listening') {
      box.appendChild(ctx.h('p', { text: T('listenPrompt') }));
      box.appendChild(ctx.btn('▶ ' + T('play'), function () { ctx.playItem(item); }, 'primary', { id: 'btnPlayPrompt' }));
    } else if (item.cloze && modality === 'reading') {
      box.appendChild(ctx.h('p', { text: T('clozePrompt') }));
      box.appendChild(ctx.h('p', { class: 'fr', lang: 'fr', text: lang === 'en' ? item.cloze.promptEn : item.cloze.promptZh }));
    } else if (modality === 'production') {
      box.appendChild(ctx.h('p', { text: T('typePrompt') }));
      box.appendChild(ctx.h('p', { class: 'zh', text: meaning(item, lang) }));
    } else {
      box.appendChild(ctx.h('p', { text: T('readPrompt') }));
      box.appendChild(ctx.h('div', { class: 'fr', lang: 'fr', text: item.fr }));
      if (!audioOk && entry.modality === 'listening') box.appendChild(ctx.h('div', { class: 'banner warn', id: 'studyAudioBanner', text: T('readingFallback') }));
    }
    if (sess.phase === 'hint' || sess.phase === 'reveal' || sess.phase === 'rate') {
      box.appendChild(ctx.h('div', { class: 'banner info', id: 'hintBox' }, T('hint') + ' ' + sess.hints + ' — ' + (sess.hints >= 2 && modality !== 'production' ? item.fr : note(item, lang))));
    }
    if (sess.phase === 'reveal' || sess.phase === 'rate') {
      var accept = (modality === 'reading' && item.cloze) ? item.cloze.accept : (item.produce && item.produce.accept) || [item.fr];
      box.appendChild(ctx.h('p', { id: 'answerLine' }, T('answerIs') + '：', ctx.h('span', { lang: 'fr', text: ' ' + accept[0] })));
      box.appendChild(ctx.h('p', { class: 'muted', text: T('explain') + ' — ' + note(item, lang) }));
      if (sess.accent) box.appendChild(ctx.h('div', { class: 'banner warn', id: 'accentNote', text: T('accent') }));
      if (sess.hints > 0) box.appendChild(ctx.h('p', { class: 'muted', id: 'helpNote', text: T('helpIndependent') }));
    }
    if (sess.phase === 'ask' || sess.phase === 'hint') {
      if (modality === 'listening' || (modality === 'reading' && !(item.cloze && modality === 'reading'))) {
        var opts = (item.listen && item.listen.options) || [];
        opts.forEach(function (o) {
          box.appendChild(ctx.btn(optLabel(o, lang), function () { ctx.onChoice(entry, item, o.id, modality); }, 'choice', { 'data-choice': o.id }));
        });
      } else {
        var input = ctx.h('input', { type: 'text', id: 'answerInput', lang: 'fr', autocomplete: 'off', 'aria-label': T('typePrompt') });
        box.appendChild(input);
        box.appendChild(ctx.btn(T('tryAgain') === T('tryAgain') ? 'OK' : 'OK', function () { ctx.onType(entry, item, input.value, modality); }, 'primary', { id: 'btnSubmit' }));
      }
    }
    if (sess.phase === 'hint') box.appendChild(ctx.btn(T('tryAgain'), function () { sess.phase = 'ask'; ctx.save(); ctx.render(); }, '', { id: 'btnRetry' }));
    if (sess.phase === 'reveal') box.appendChild(ctx.btn(T('showAnswer'), function () { sess.phase = 'rate'; sess.revealed = true; ctx.save(); ctx.render(); }, 'primary', { id: 'btnReveal' }));
    if (sess.phase === 'rate') {
      var suggested = Learn.suggestRating({ correct: sess.lastCorrect, hints: sess.hints, accent: sess.accent });
      var row = ctx.h('div', { class: 'col', id: 'rateRow' });
      [[1, 'again'], [2, 'hard'], [3, 'good'], [4, 'easy']].forEach(function (pair) {
        var label = T(pair[1]) + (pair[0] === suggested ? ' · ' + T('suggested') : '');
        row.appendChild(ctx.btn(label, function () { ctx.onRate(entry, item, pair[0], modality, suggested); }, pair[0] === suggested ? 'primary' : '', { id: 'rate' + pair[0] }));
      });
      box.appendChild(row);
    }
    ctx.screen.appendChild(box);
  }

  function renderPlacement(ctx) {
    bind();
    var T = ctx.T, learn = ctx.learn, lang = ctx.lang();
    var st = Learn.placementState(learn);
    var wrap = ctx.h('div', { class: 'pad', id: 'placement' });
    wrap.appendChild(ctx.h('h2', { text: T('placementTitle') }));
    wrap.appendChild(ctx.h('p', { text: T('placementBody') }));
    wrap.appendChild(ctx.btn(T('skipPlacement'), ctx.skipPlacement, '', { id: 'btnPlaceSkip' }));
    if (!st.next) { ctx.screen.appendChild(wrap); return; }
    var item = st.next;
    wrap.appendChild(ctx.h('p', { class: 'muted', text: item.band }));
    wrap.appendChild(ctx.h('p', { text: lang === 'en' ? item.promptEn : item.promptZh }));
    wrap.appendChild(ctx.h('div', { class: 'fr', lang: 'fr', id: 'placeFr', text: item.fr }));
    wrap.appendChild(ctx.btn('▶ ' + T('play'), function () { ctx.playText(item.fr, item.speaker, item.id); }, 'small', { id: 'btnPlacePlay' }));
    item.options.forEach(function (o) {
      wrap.appendChild(ctx.btn(lang === 'en' ? o.en : o.zh, function () { ctx.answerPlacement(item, o.id); }, 'choice', { 'data-place': o.id }));
    });
    wrap.appendChild(ctx.btn(T('unsure'), function () { ctx.answerPlacement(item, 'unsure'); }, '', { id: 'btnPlaceUnsure' }));
    ctx.screen.appendChild(wrap);
  }

  function renderProgress(ctx) {
    bind();
    var T = ctx.T, learn = ctx.learn, lang = ctx.lang(), now = new Date();
    var c = Learn.counts(learn);
    var r = Learn.retention(learn, now);
    var wrap = ctx.h('div', { class: 'pad', id: 'progressScreen' });
    wrap.appendChild(ctx.h('h2', { text: T('progress') + ' · ' + ctx.profileName }));
    wrap.appendChild(ctx.btn(T('backHome'), ctx.closeStudy, '', { id: 'btnProgressHome' }));
    wrap.appendChild(ctx.h('p', { id: 'progressCounts', text: 'new ' + c.new + ' · learning ' + c.learning + ' · review ' + c.review + ' · mature ' + c.mature }));
    wrap.appendChild(ctx.h('p', { text: T('track') + ': ' + (learn.settings.track || 'all') }));
    wrap.appendChild(ctx.h('p', { id: 'retentionLine', text: r == null ? T('retentionNone') : (T('retention') + ' ' + Math.round(r * 100) + '%') }));
    wrap.appendChild(ctx.h('p', { class: 'muted', text: T('notCert') }));
    wrap.appendChild(ctx.h('h3', { text: T('mapTitle') }));
    var ul = ctx.h('ul', { class: 'days', id: 'grammarMap' });
    Learn.grammarMap(learn, Deck).forEach(function (g) {
      var key = root.A411.I18n.statusKey[g.status] || 'notyet';
      ul.appendChild(ctx.h('li', null,
        ctx.h('span', { text: g.grammar }),
        ctx.h('span', { class: 'tag', text: T(key) })));
    });
    wrap.appendChild(ul);
    wrap.appendChild(ctx.h('h3', { text: T('forecast') }));
    var fc = ctx.h('ul', { class: 'days', id: 'forecast' });
    Learn.forecast(learn, now).forEach(function (d) {
      fc.appendChild(ctx.h('li', null, ctx.h('span', { text: '+' + d.offset }), ctx.h('span', { text: String(d.count) })));
    });
    wrap.appendChild(fc);
    wrap.appendChild(ctx.h('h3', { text: T('evidence') }));
    var ev = (learn.evidence || []).slice(-8).reverse();
    if (!ev.length) wrap.appendChild(ctx.h('p', { class: 'muted', text: '—' }));
    ev.forEach(function (e) {
      wrap.appendChild(ctx.h('p', { class: 'muted', text: (e.itemId || '') + ' · ' + (e.modality || '') + ' · ' + (e.resultType || '') + (e.hints ? ' · hints ' + e.hints : '') }));
    });
    wrap.appendChild(ctx.h('h3', { text: T('settingsCaps') }));
    var rc = ctx.h('input', { type: 'text', id: 'capReviews', value: String(learn.settings.reviewCap) });
    var nc = ctx.h('input', { type: 'text', id: 'capNew', value: String(learn.settings.newCap) });
    wrap.appendChild(ctx.h('label', { class: 'field' }, T('reviewCap'), rc));
    wrap.appendChild(ctx.h('label', { class: 'field' }, T('newCap'), nc));
    wrap.appendChild(ctx.btn(T('saveCaps'), function () {
      var a = parseInt(rc.value, 10), b = parseInt(nc.value, 10);
      if (a >= 1 && a <= 100) learn.settings.reviewCap = a;
      if (b >= 0 && b <= 30) learn.settings.newCap = b;
      ctx.save();
      ctx.toast('OK');
    }, 'small', { id: 'btnSaveCaps' }));
    wrap.appendChild(ctx.h('h3', { text: T('seedTitle') }));
    wrap.appendChild(ctx.h('p', { class: 'muted', text: T('seedHelp') }));
    var seedMsg = ctx.h('div', { id: 'seedMsg' });
    var file = ctx.h('input', { type: 'file', id: 'seedFile', accept: 'application/json,.json', 'aria-label': T('seedImport') });
    var paste = ctx.h('textarea', { id: 'seedText', 'aria-label': T('seedImport') });
    function doSeed(text) {
      var obj; try { obj = JSON.parse(text); } catch (e) { seedMsg.className = 'banner warn'; seedMsg.textContent = String(e.message); return; }
      var before = JSON.stringify(learn.cards);
      var res = Learn.importSeed(learn, obj, Deck, new Date());
      if (!res.ok) { seedMsg.className = 'banner warn'; seedMsg.textContent = res.errors.join('；'); return; }
      ctx.save();
      seedMsg.className = 'banner ok'; seedMsg.textContent = 'OK';
      ctx.render();
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { doSeed(String(rd.result)); }; rd.readAsText(f);
    });
    wrap.appendChild(file);
    wrap.appendChild(paste);
    wrap.appendChild(ctx.btn(T('seedImport'), function () { doSeed(paste.value); }, 'small', { id: 'btnSeedImport' }));
    wrap.appendChild(seedMsg);
    wrap.appendChild(ctx.btn(T('exportProfile'), ctx.exportBundle, 'primary', { id: 'btnExportProfile' }));
    ctx.screen.appendChild(wrap);
  }

  root.A411 = root.A411 || {};
  root.A411.StudyUI = { fillToday: fillToday, renderGate: renderGate, renderSession: renderSession, renderPlacement: renderPlacement, renderProgress: renderProgress };
})(typeof window !== 'undefined' ? window : globalThis);
