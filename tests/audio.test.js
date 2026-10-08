// Run: npm test. Voice ranking / assignment / prefs for the device speech engine (v0.1.2).
// Voice lists are modelled on names reported by browsers (Readium "web-speech-recommended-voices" data, BSD-3).
const test = require('node:test');
const assert = require('node:assert/strict');

function fresh(globals) {
  delete require.cache[require.resolve('../js/audio.js')];
  for (const k of ['speechSynthesis', 'SpeechSynthesisUtterance', 'localStorage', 'navigator']) delete globalThis[k];
  Object.assign(globalThis, globals || {});
  return require('../js/audio.js');
}
function memLS() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; }
function fakeSynth(voices) {
  const spoken = [];
  return { spoken, getVoices: () => voices, addEventListener() {}, cancel() {},
    speak(u) { spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch }); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); } };
}
function Utt(t) { this.text = t; }

// iPhone (iOS 18-style list): novelty + Eloquence voices localised to French appear alongside the real voices.
const IOS = [
  { name: 'Bonnes nouvelles', lang: 'fr-FR', voiceURI: 'com.apple.speech.synthesis.voice.GoodNews' },
  { name: 'Eddy (français (France))', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Eddy' },
  { name: 'Flo (français (France))', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Flo' },
  { name: 'Grand-mère (français (France))', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Grandma' },
  { name: 'Jacques', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Jacques' },
  { name: 'Amélie', lang: 'fr-CA', voiceURI: 'com.apple.voice.compact.fr-CA.Amelie' },
  { name: 'Thomas', lang: 'fr-FR', voiceURI: 'com.apple.voice.compact.fr-FR.Thomas' },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha' }
];

test('robotic Apple Eloquence / novelty voices are never auto-picked, even when listed first', () => {
  const A = fresh();
  const r = A.rankFrench(IOS);
  assert.equal(r.length, 7, 'non-French voices excluded');
  assert.ok(r.filter(x => /Eddy|Flo|Grand|Jacques|nouvelles/.test(x.name)).every(x => x.robotic && x.quality === 'robotic'));
  const a = A.assignVoices(r, {});
  assert.equal(a.camille.name, 'Amélie'); // only female non-robotic voice
  assert.equal(a.noe.name, 'Thomas');
  assert.equal(a.distinct, true);
  assert.notEqual(a.neutral.robotic, true);
});

test('enhanced / premium variants outrank compact ones of the same voice', () => {
  const A = fresh();
  const r = A.rankFrench([
    { name: 'Thomas', lang: 'fr-FR', voiceURI: 'com.apple.voice.compact.fr-FR.Thomas' },
    { name: 'Thomas (Enhanced)', lang: 'fr-FR', voiceURI: 'com.apple.voice.enhanced.fr-FR.Thomas' },
    { name: 'Audrey (Premium)', lang: 'fr-FR', voiceURI: 'com.apple.voice.premium.fr-FR.Audrey' }
  ]);
  assert.deepEqual(r.map(x => x.quality), ['premium', 'enhanced', 'standard']);
  const a = A.assignVoices(r, {});
  assert.equal(a.camille.name, 'Audrey (Premium)');
  assert.equal(a.noe.name, 'Thomas (Enhanced)');
});

test('Edge natural and Android Google network voices rank above standard SAPI / local voices; genders inferred', () => {
  const A = fresh();
  const edge = A.rankFrench([
    { name: 'Microsoft Paul - French (France)', lang: 'fr-FR' },
    { name: 'Microsoft Henri Online (Natural) - French (France)', lang: 'fr-FR' },
    { name: 'Microsoft Denise Online (Natural) - French (France)', lang: 'fr-FR' }]);
  assert.deepEqual(edge.slice(0, 2).map(x => x.quality), ['natural', 'natural']);
  const ea = A.assignVoices(edge, {});
  assert.match(ea.camille.name, /Denise/); assert.match(ea.noe.name, /Henri/);
  const and = A.rankFrench([
    { name: 'Français France', lang: 'fr-FR' },
    { name: 'Android Speech Recognition and Synthesis from Google fr-fr-x-frd-network', lang: 'fr-FR' },
    { name: 'Android Speech Recognition and Synthesis from Google fr-fr-x-frc-network', lang: 'fr-FR' }]);
  const aa = A.assignVoices(and, {});
  assert.match(aa.camille.name, /frc/); assert.match(aa.noe.name, /frd/);
  assert.equal(aa.camille.gender, 'female'); assert.equal(aa.noe.gender, 'male');
});

test('fr-FR is preferred over fr-CA at equal quality; a single good voice is shared with mild pitch', async () => {
  const A = fresh();
  const r = A.rankFrench([{ name: 'Amélie', lang: 'fr-CA' }, { name: 'Marie', lang: 'fr-FR' }]);
  assert.equal(r[0].name, 'Marie');
  const ls = memLS();
  const synth = fakeSynth([{ name: 'Eddy', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Eddy' }, { name: 'Thomas', lang: 'fr-FR', voiceURI: 'com.apple.voice.compact.fr-FR.Thomas' }]);
  const B = fresh({ speechSynthesis: synth, SpeechSynthesisUtterance: Utt, localStorage: ls });
  await B.init();
  assert.equal(B.status, 'available');
  assert.equal(B.assign.distinct, false);
  assert.equal(await B.speak('Salut !', { speaker: 'noe' }), 'played');
  assert.equal(synth.spoken[0].voice, 'Thomas');
  assert.ok(synth.spoken[0].pitch < 1, 'Noé slightly lower when sharing a voice');
  assert.deepEqual({ speaker: B.last.speaker, voice: B.last.voice, quality: B.last.quality, rate: B.last.rate }, { speaker: 'noe', voice: 'Thomas (fr-FR)', quality: 'standard', rate: 0.9 });
});

test('only robotic voices: still available (honest), but flagged robotic', async () => {
  const synth = fakeSynth([{ name: 'Eddy', lang: 'fr-FR', voiceURI: 'com.apple.eloquence.fr-FR.Eddy' }]);
  const A = fresh({ speechSynthesis: synth, SpeechSynthesisUtterance: Utt, localStorage: memLS() });
  await A.init();
  assert.equal(A.status, 'available');
  assert.equal(A.assign.camille.quality, 'robotic');
});

test('per-device prefs: rate snaps to 0.75/0.9/1.0, voice choice per character persists, distinct voices get pitch 1', async () => {
  const ls = memLS();
  const voices = [{ name: 'Thomas', lang: 'fr-FR', voiceURI: 't' }, { name: 'Amélie', lang: 'fr-CA', voiceURI: 'a' }, { name: 'Marie', lang: 'fr-FR', voiceURI: 'm' }];
  const synth = fakeSynth(voices);
  let A = fresh({ speechSynthesis: synth, SpeechSynthesisUtterance: Utt, localStorage: ls });
  A.loadPrefs(0.7); // legacy save speechRate 0.7 ("slower") maps to 0.75
  assert.equal(A.rate(), 0.75);
  await A.init();
  assert.equal(A.assign.camille.name, 'Marie');
  const am = A.voices.find(v => v.name === 'Amélie');
  A.savePrefs({ camille: am.key, rate: 1.05 });
  assert.equal(A.assign.camille.name, 'Amélie');
  assert.equal(A.rate(), 1.0);
  // reload "page": prefs survive in this device's storage
  A = fresh({ speechSynthesis: synth, SpeechSynthesisUtterance: Utt, localStorage: ls });
  A.loadPrefs(0.85);
  await A.init();
  assert.equal(A.rate(), 1.0);
  assert.equal(A.assign.camille.name, 'Amélie');
  assert.equal(A.assign.noe.name, 'Thomas');
  await A.speak('Bonjour !', { speaker: 'camille' });
  assert.equal(synth.spoken.at(-1).pitch, 1);
  assert.equal(synth.spoken.at(-1).rate, 1);
  // a remembered voice that disappeared from the device falls back to auto
  const B = fresh({ speechSynthesis: fakeSynth([voices[0]]), SpeechSynthesisUtterance: Utt, localStorage: ls });
  B.loadPrefs(); await B.init();
  assert.equal(B.assign.camille.name, 'Thomas');
  assert.equal(JSON.parse(ls.getItem(B.PREFS_KEY)).camille, am.key, 'pref kept for when the voice comes back');
});

test('no speech API -> unavailable, speak() resolves unavailable and records no voice', async () => {
  const A = fresh({ localStorage: memLS() });
  await A.init();
  assert.equal(A.status, 'unavailable');
  assert.equal(await A.speak('Bonjour', { speaker: 'camille' }), 'unavailable');
  assert.equal(A.last, null);
});

test('platform detection for the voice tip', () => {
  const A = fresh();
  assert.equal(A.platform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1' }), 'ios');
  assert.equal(A.platform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  assert.equal(A.platform({ userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) Chrome/140 Mobile' }), 'android');
  assert.equal(A.platform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/140' }), 'desktop');
});
