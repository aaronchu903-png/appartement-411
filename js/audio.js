/* Appartement 404 — French audio via the device's own speech engine (Web Speech API).
 * Status values are what the browser reports: 'played' = speech engine reported it finished.
 * A muted phone can still report 'played'; the player can always replay or read instead. */
(function (root) {
  'use strict';
  var A = { status: 'unknown', voice: null, voiceName: null, reason: null };
  var synth = root.speechSynthesis;

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
    if (!synth || typeof root.SpeechSynthesisUtterance !== 'function') {
      A.status = 'unavailable'; A.reason = 'no-speech-api';
      return Promise.resolve(A.status);
    }
    return getVoices(2000).then(function (voices) {
      var fr = voices.filter(function (v) { return /^fr([-_]|$)/i.test(v.lang || ''); });
      var pick = fr.filter(function (v) { return /fr[-_]FR/i.test(v.lang); })[0] || fr[0] || null;
      A.voice = pick; A.voiceName = pick ? (pick.name + ' (' + pick.lang + ')') : null;
      A.status = pick ? 'available' : 'unavailable';
      A.reason = pick ? null : 'no-french-voice';
      return A.status;
    });
  };

  // Resolves to 'played' | 'failed' | 'unavailable' | 'stopped' (we cancelled it: pause/next). Never rejects.
  A.speak = function (text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (A.status !== 'available' || !A.voice) return resolve('unavailable');
      var settled = false, started = false;
      function fin(r) { if (settled) return; settled = true; clearTimeout(t1); clearTimeout(t2); resolve(r); }
      try {
        synth.cancel();
        var u = new root.SpeechSynthesisUtterance(String(text).replace(/\u00A0/g, ' ').replace(/[\u2019\u2018]/g, "'"));
        u.voice = A.voice; u.lang = A.voice.lang || 'fr-FR';
        u.rate = opts.rate || 0.85; u.pitch = opts.pitch || 1;
        u.onstart = function () { started = true; };
        u.onend = function () { fin('played'); };
        u.onerror = function (ev) { fin(ev && (ev.error === 'interrupted' || ev.error === 'canceled') ? 'stopped' : 'failed'); };
        var t1 = setTimeout(function () { if (!started) { try { synth.cancel(); } catch (e) { } fin('failed'); } }, 5000);
        var t2 = setTimeout(function () { try { synth.cancel(); } catch (e) { } fin(started ? 'played' : 'failed'); }, 15000);
        synth.speak(u);
      } catch (e) { fin('failed'); }
    });
  };
  A.stop = function () { try { if (synth) synth.cancel(); } catch (e) { } };

  root.A404 = root.A404 || {};
  root.A404.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
