// Run: node app/tools/validate-content.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = vm.createContext({});
for (const name of ['app/language.js', 'app/data/inherited.js', 'app/content.js']) vm.runInContext(fs.readFileSync(path.join(repo, name), 'utf8'), context, { filename: name });
const C = context.Day8Content, A = context.A411;
const plain = value => JSON.parse(JSON.stringify(value));
assert.equal(C.compile().length, C.scenes.length);
const audit = plain(C.auditLesson());
assert.ok(audit.focusItems >= 8);
assert.ok(audit.counts.pick >= 3);
assert.ok(audit.counts.chips >= 2);
assert.ok(audit.counts.probe >= 3 && audit.counts.probe <= 4);
assert.ok(audit.maxPassiveBeats <= 4, audit.longestPassiveRun.join(', '));
for (const target of audit.targets) {
  assert.equal(target.first, 'focus', target.id);
  assert.ok(['pick', 'probe', 'chips'].includes(target.next), target.id);
  assert.equal(target.nextWithoutCue, true, target.id);
  assert.ok(target.encounters.length >= 4 && target.locations.length >= 2 && target.active.length >= 1, target.id);
}
assert.equal(Object.keys(A.GLOSSARY_DATA.E).length, 2347);
assert.equal(A.LEXICON_FIELDS.items.length, 167);
assert.equal(A.INHERITED.tagmap.length, 60);
assert.equal(A.INHERITED.wordlist.length, 140);
assert.equal(C.scenes[0].scene, 'kitchen');
assert.equal(C.scenes[0].id, 'n_d8_matin');
assert.equal(C.scenes[0].kind, 'line');
assert.equal(C.sceneById.d8_morning_review, undefined);
assert.equal(C.scenes.filter(s => s.module === 'M2').length, 1);
assert.equal(C.sceneById.d8_first_watering.scene, 'roof');
assert.equal(C.sceneById.d8_first_watering.lighting, 'night');
assert.equal(C.sceneById.d8_first_watering.duePotId, 1);
assert.equal(C.sceneById.d8_noe_carry.text, 'Et ta plante ? Je la monte aussi !');
assert.equal(C.sceneById.d8_noe_carry.listenOnly, true);
assert.equal(C.sceneById.d8_noe_carry.reviewed, false);
assert.equal(C.sceneById.d8_cat.module, null);
assert.equal(C.sceneById.d8_cat.durationMs, 16000);
assert.equal(C.sceneById.d8_first_watering.underlay.text, 'Il faut de l’eau.');
assert.equal(C.sceneById.d8_first_watering.firstWordId, 'basilic');
assert.equal(C.wordById.basilic.sentence, 'C’est du basilic, pour la cuisine.');
assert.equal(C.wordById.basilic.seen, false);
assert.equal(C.wordById.jardin.seen, false);
assert.equal(C.wordById.toit.metDay, 6); // d6_gag_arrive already says "par les toits".
assert.equal(C.sceneById.n_d10_monte.text, 'La clé tourne. La porte s’ouvre.');
assert.equal(C.sceneById.n_d10_plante.text, 'Tu plantes le basilic. Croissant aide… un peu trop.');
assert.equal(C.sceneById.d10_lef_jardin.flags.has_key, true);
assert.equal(C.sceneById.d9_jeudi.flag, 'd9_jeudi');
assert.deepEqual(plain(C.sceneById.d9_jeudi.options.map(o => o.id)), ['oui', 'cuisine', 'parfois']);
assert.equal(C.sceneById.n_d10_cle.hotspots.length, 2);
assert.equal(C.resolveBand(C.sceneById.d9_cam_null, {}).id, 'd9_cam_null');
assert.equal(C.resolveBand(C.sceneById.d9_cam_null, { d7_band: 'B' }).id, 'd9_cam_b');
assert.equal(C.voicemail.target, 'six heures');
assert.equal(C.voicemail.listeningOnly.includes('en bas'), true);
assert.equal(C.accepts(C.voicemail, 'en bas'), false);
assert.equal(C.accepts(C.voicemail, 'À 18 h'), true);
assert.equal(C.voicemail.canonical, 'À six heures.');
assert.equal(C.voicemail.lines[2].text, 'Ce soir, chez Madame Lefèvre ?');
assert.equal(C.accepts(C.chats[1], 'a SIX heures'), true);
assert.equal(C.accepts(C.chats[1], 'sept heures'), false);
assert.equal(C.accepts(C.chats[0], 'SUR LA TABLE'), true);
assert.equal(C.chats.length, 4);
assert.equal(C.sceneById.d8_chat_thursday.scene, 'stairs');
const thursdayIndex = C.scenes.findIndex(s => s.id === 'd8_chat_thursday');
assert.equal(C.scenes[thursdayIndex - 1].id, 'd10_lef_allez');
assert.equal(C.scenes[thursdayIndex + 1].id, 'd10_noe_porte');
assert.equal(C.accepts(C.chats[2], 'du basilic'), true);
assert.equal(C.accepts(C.chats[3], 'oui'), true);
for (const scene of [C.voicemail, ...C.chats]) {
  assert.equal(scene.approved, true);
  assert.doesNotMatch(JSON.stringify(scene), /"(?:neng|replaceable|pending)"\s*:/);
}
assert.equal(C.sceneById.d8_end.text, 'Sur le toit, un jardin qui se réveille. En bas, une lampe qui reste allumée.');
assert.equal(C.scenes.filter(s => s.kind === 'walk').every(s => s.scene === 'stairs' && s.tiles <= 8), true);
assert.equal(C.scenes.filter(s => s.kind === 'cat').length, 1);
assert.equal(C.scenes.some(s => ['d8_heure', 'plantguard_r3', 'd8_pot_empty', 'd8_noe_eau'].includes(s.id)), false);

const modified = plain(C.scenes);
modified[1].text += ' Spoiler.';
assert.throws(() => C.compile(modified), /Canonical text changed/);
assert.throws(() => C.compile([...C.scenes].reverse()), /sequence/);
const badType = plain(C.scenes);
badType[1].kind = 'unknown';
assert.throws(() => C.compile(badType), /Invalid scene type/);
const badSpace = plain(C.scenes);
const punctuated = badSpace.find(s => s.text.includes('\u202f'));
punctuated.text = punctuated.text.replace('\u202f', '\u00a0');
assert.throws(() => C.compile(badSpace), /typography/);

const aliases = new Map();
for (const word of C.words) {
  assert.ok(word.pot === 1 || word.pot === 2);
  assert.equal(word.potId, word.pot);
  assert.ok(word.sentence && word.zh && word.en && word.pos && word.field);
  for (const id of word.legacyIds) {
    assert.equal(aliases.has(id), false, 'duplicate import alias ' + id);
    aliases.set(id, word.id);
    assert.equal(C.oldIdToWordId[id], word.id);
  }
  const raw = word.source === 'js/words.js' ? A.INHERITED.words[word.id] : word.source === 'js/deck.js' ? A.INHERITED.deck.find(d => d.id === word.id) : null;
  if (raw) for (const key of ['fr', 'zh', 'en']) assert.equal(word[key], raw[key], 'rewritten inherited ' + key + ' for ' + word.id);
}
for (const word of C.words.filter(w => w.seen)) {
  assert.ok(C.words.some(other => other.seen && other.id !== word.id && other.pos === word.pos && (!word.gender || other.gender === word.gender) && other.field === word.field), 'missing seen semantic peer for ' + word.id);
}
for (const [id, file] of Object.entries(A.INHERITED.audio)) {
  assert.ok(file.startsWith('../audio/'));
  assert.ok(fs.existsSync(path.resolve(repo, 'app', file)), 'missing inherited recording ' + id);
}
assert.equal(C.oldIdToWordId.cw_plante, 'plante');
assert.equal(C.oldIdToWordId.cw_cle, 'cle');
assert.equal(C.oldIdToWordId.cest_du_basilic, 'cest_du_basilic');
assert.equal(C.lookup('plantes').lemma, 'plante');
assert.equal(C.lookup('bonjour').zh, C.wordById.bonjour.zh);
const reviewRegister = fs.readFileSync(path.join(repo, 'app/FRENCH_FOR_NENG.md'), 'utf8');
for (const entry of C.newFrench) assert.ok(reviewRegister.includes(entry.text), 'NENG register missing ' + entry.id);
for (const [key, text] of Object.entries(context.Day8Language.uiFrench)) {
  assert.equal(text, C.french(text), 'UI typography: ' + key);
  assert.ok(reviewRegister.includes(text), 'UI register missing ' + key);
}
console.log(`Content validated: ${C.scenes.length} scenes, ${C.words.length} source-preserving vocabulary records, ${aliases.size} unique import aliases, ${C.newFrench.length} registered French strings.`);
console.log(`Lesson audit: ${audit.focusItems} focus items; ${audit.counts.pick} picks; ${audit.counts.chips} in-scene chips; ${audit.counts.probe} end-probe items; ${audit.counts.diary} diary; ${audit.counts.ritual} ritual; maximum ${audit.maxPassiveBeats} passive beats.`);
console.table(audit.targets.map(t => ({ word: t.id, encounters: t.encounters.length, locations: t.locations.length,
  active: t.active.length, first: t.first, next: t.next, uncued: t.nextWithoutCue })));
const missingAudio = audit.audioRequests.filter(r => !fs.existsSync(path.resolve(repo, 'app', C.clipPath(r.id))));
console.log(`Audio QA: ${audit.audioRequests.length - missingAudio.length}/${audit.audioRequests.length} requested clips present on disk; ${missingAudio.length} missing (TTS/text fallback, not recordings).`);
for (const request of missingAudio) console.log(`QA MISSING AUDIO ${request.id}: ${request.scenes.join(', ')}`);
for (const [kind, instruction] of Object.entries(C.lessonInstructions)) {
  assert.equal(instruction, C.french(instruction));
  if (!reviewRegister.includes(instruction)) console.log(`QA FRENCH REGISTER ${kind}: ${instruction}`);
}
