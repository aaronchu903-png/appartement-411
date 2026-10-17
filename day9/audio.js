/* Original recordings live in the shared audio directory. No generated sound. */
(function (root) {
  'use strict';
  const VOLUMES = Object.freeze({ music: .15, voice: .85, sfx: .5 });
  let settings = { ...VOLUMES, muted: false };
  let music, musicContext, musicGain, voice, speech, sequence = 0, unlocked = false;
  const missing = new Set();
  const status = text => { document.querySelectorAll('.audio-status').forEach(el => { el.textContent = text; }); };
  const unavailable = () => document.dispatchEvent(new Event('day8-audio-unavailable'));
  function localRecording(path) {
    if(typeof path!=='string'||/[\\?#]/.test(path)||/%(?:2e|2f|5c)/i.test(path))return false;
    const prefix=['../audio/','recordings/'].find(value=>path.startsWith(value));
    return !!prefix && path.slice(prefix.length).split('/').every(part=>part && part!=='.' && part!=='..') && path.endsWith('.mp3');
  }
  function volume(kind) {
    const value = settings[kind];
    return settings.muted ? 0 : typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : VOLUMES[kind];
  }
  function syncMusic() {
    if (!music) return;
    const level = volume('music');
    const gain = level * (voice || speech ? .25 : 1);
    music.muted = !level;
    if (musicGain) musicGain.gain.value = gain;
    music.volume = musicGain ? 1 : gain;
    // iPhone Safari may ignore volume writes. Pause the shared day/night player as well.
    if (!level) music.pause();
    else if (unlocked && music.paused) music.play().then(() => {
      if (!volume('music')) { music.muted = true; music.pause(); }
    }).catch(() => {});
  }
  function configure(next) {
    settings = Object.assign(settings, next);
    syncMusic();
    if (voice) voice.volume = volume('voice');
    if (settings.muted) stopVoice();
  }
  function unlock() {
    if (!unlocked) {
      unlocked = true;
      try { if (root.navigator?.audioSession) root.navigator.audioSession.type = 'playback'; } catch (_) {}
      music = new Audio('../audio/music/matin-cafe.mp3'); music.loop = true;
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (AudioContext) {
        let source;
        try {
          musicContext = new AudioContext();
          const gain = musicContext.createGain();
          gain.connect(musicContext.destination);
          source = musicContext.createMediaElementSource(music);
          source.connect(gain);
          musicGain = gain;
        } catch (_) {
          // Keep native volume/mute controls usable if the graph is unavailable.
          if (source) { source.disconnect(); source.connect(musicContext.destination); }
        }
      }
    }
    if (musicContext && musicContext.state !== 'running') {
      try { musicContext.resume().catch(() => {}); } catch (_) {}
    }
    syncMusic();
  }
  function ambience(night) {
    if (!unlocked) return;
    const src = night ? '../audio/music/night_01.mp3' : '../audio/music/matin-cafe.mp3';
    if (!music.src.endsWith(src.slice(3))) { music.pause(); music.src = src; }
    syncMusic();
  }
  function stopVoice() {
    sequence++;
    if (voice) { voice.pause(); voice = null; }
    if (speech && root.speechSynthesis) root.speechSynthesis.cancel();
    speech = null; syncMusic();
  }
  function localVoice() {
    return root.speechSynthesis?.getVoices().find(v => /^fr(?:-|_)/i.test(v.lang) && v.localService);
  }
  function speak(text, id, directPath) {
    stopVoice();
    const token = sequence;
    if (!volume('voice')) { status('Voix coupée. Texte disponible.'); unavailable(); return Promise.resolve(false); }
    const content = root.APP_DAY === 9 ? root.Day9Content : root.Day8Content;
    const map = content?.audio || {};
    const silentFallback = root.APP_DAY === 9 && id === 'n_d10_chat';
    const candidates = [...new Set([directPath, map[id], id && !silentFallback ? `recordings/${encodeURIComponent(id)}.mp3` : null].filter(x => localRecording(x) && !missing.has(x)))];
    return new Promise(resolve => {
      function finish(ok) { if (token !== sequence) { resolve(false); return; } voice = null; speech = null; syncMusic(); resolve(ok); }
      function fallback() {
        if (token !== sequence) return resolve(false);
        if (silentFallback) { finish(false); return; }
        const v = localVoice();
        if (!v) { status('Voix française indisponible. Texte disponible.'); unavailable(); finish(false); return; }
        speech = new SpeechSynthesisUtterance(text); speech.lang = 'fr-FR'; speech.voice = v; speech.rate = .88; speech.volume = volume('voice');
        speech.onend = () => finish(true); speech.onerror = () => finish(false);
        syncMusic();
        root.speechSynthesis.speak(speech);
        status('Voix française de cet appareil');
      }
      function attempt() {
        if (token !== sequence) return resolve(false);
        const path = candidates.shift();
        if (!path) return fallback();
        voice = new Audio(path); voice.volume = volume('voice');
        syncMusic();
        let failed=false;
        const fail=()=>{if(failed)return;failed=true;missing.add(path);attempt();};
        voice.onended = () => finish(true);
        voice.onerror = fail;
        voice.play().then(() => status('Enregistrement original')).catch(e => {
          if (token !== sequence) return resolve(false);
          if (e.name === 'NotAllowedError') { status('Touchez le haut-parleur.'); finish(false); }
          else fail();
        });
      }
      attempt();
    });
  }
  function sfx(id) {
    if (!volume('sfx')) return;
    const allowed = ['bravo','click','door','knock','meow','notif','paper','parcel','phone','purr','steps','water'];
    if (!allowed.includes(id)) return;
    const a = new Audio(`../audio/sfx/${id}.mp3`); a.volume = volume('sfx'); a.play().catch(() => {});
  }
  root.Day8Audio = {configure,unlock,ambience,speak,sfx,stop:stopVoice,canSpeak:() => !!volume('voice') && !!localVoice(),isMuted:() => !volume('voice')};
})(window);
