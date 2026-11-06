// Reproducible data-only extraction. Run: node app/tools/extract-data.mjs [--check]
// Legacy scripts execute only in this offline build sandbox, never in the new app.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = vm.createContext({});
const sources = {};
function read(file) {
  const text = fs.readFileSync(path.join(repo, file), 'utf8');
  sources[file] = createHash('sha256').update(text).digest('hex');
  return text;
}
for (const name of ['words', 'deck', 'glossary-data', 'conjugate', 'grammar', 'lexicon-data', 'content', 'week1', 'act1days', 'clips', 'week-clips', 'deck-clips']) {
  vm.runInContext(read(`js/${name}.js`), context, { filename: `js/${name}.js`, timeout: 3000 });
}
const A = context.A411;
const french = text => String(text || '').replace(/'/g, '\u2019').replace(/[ \u00a0\u202f]*([?!:;])/g, '\u202f$1').replace(/«[ \u00a0\u202f]*/g, '«\u202f').replace(/[ \u00a0\u202f]*»/g, '\u202f»');
const canonText = read('app/docs/refs/DAY08_FINAL_v2.md');
const canonical = {};
for (const match of canonText.matchAll(/^\d+[a-z]?\. \*\*[^\n]+(?:\n(?!\d+[a-z]?\.|###|##)[^\n]*)*/gm)) {
  const block = match[0];
  const id = block.match(/`([a-z0-9_]+)`/)?.[1];
  const fr = block.match(/^\s+- FR: (.+)$/m)?.[1];
  if (!id || !fr || /^(plante|basilic|toit|jardin)$/.test(id) || /^(Noé|Camille) :/.test(fr)) continue;
  const zh = block.match(/- zh: (.*?)(?: · en:|$)/m)?.[1];
  const en = block.match(/(?:- | · )en: (.+)$/m)?.[1];
  if (!zh || !en) continue;
  canonical[id] = { id, fr: french(fr), zh: zh.replace(/ \(approved\)$/, ''), en: en.replace(/ \(approved\)$/, ''), source: 'app/docs/refs/DAY08_FINAL_v2.md' };
}
const wordlist = read('app/docs/refs/WORDLIST_W1-2_DRAFT.md').split('Type note:')[0].split('\n').filter(x => /^\| \d+ \|/.test(x)).map(row => {
  const c = row.split('|').slice(1, -1).map(x => x.trim());
  return { day: Number(c[0]), fr: c[1], pos: c[2], gender: c[3], frequency: c[4], inStory: c[5], zh: c[6], en: c[7] };
});
const tagmap = read('app/docs/refs/CARNET_TAGMAP_D1-6.md').split('## Issues')[0].split('\n').filter(x => /^\| [1-6] \|/.test(x)).map(row => {
  const c = row.split('|').slice(1, -1).map(x => x.trim());
  return { day: Number(c[0]), fr: c[1], first: c[2], reference: c[3], exactHits: Number(c[4]), changedHits: Number(c[5]) };
});
const lines = { ...A.Content.LINES, ...A.Week.LINES };
const narr = { ...A.Content.NARR };
const firstMeet = {};
function visit(text, id, day, scene, target) {
  if (!text) return;
  const entry = { id, day, scene: scene || 'kitchen', fr: text };
  A.Words.wordsIn(text).forEach(w => { firstMeet[w] ||= entry; });
  // Regular plural exposure (e.g. the Day 1 feuilles) is still the same authored lemma.
  for (const [id, word] of Object.entries(A.Words.WORDS)) {
    if (firstMeet[id]) continue;
    if (word.forms.some(form => !/[sx]$/.test(form) && new RegExp('(?:^|[^\\p{L}])' + form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's(?:$|[^\\p{L}])', 'iu').test(text))) firstMeet[id] = entry;
  }
  if (target) firstMeet[target] ||= entry;
}
Object.entries(A.Content.NARR).forEach(([id, n]) => visit(n.fr, id, 1));
Object.entries(A.Content.LINES).filter(([id]) => !/^(pr_|bl_)/.test(id)).forEach(([id, l]) => visit(l.fr, id, 1, null, l.target));
for (const chapter of Object.values(A.Week.CHAPTERS)) {
  if (chapter.n > 7) continue;
  for (const s of chapter.steps) {
    if (s.t === 'narr' && s.id) narr[s.id] = s;
    const l = lines[s.id];
    visit(s.fr || l?.fr, s.id || s.key, chapter.n || 1, s.art?.scene, l?.target);
    if (s.t === 'focus' && A.Words.WORDS[s.w]) visit(A.Words.WORDS[s.w].fr, `w_${s.w}`, chapter.n || 1, s.art?.scene);
    // Do not count unseen branches or wrong-answer distractors as story exposure.
  }
}
const choices = {};
for (const s of A.Week.CHAPTERS.d8.steps) if (['d8_merci', 'd9_soupe', 'd9_jeudi', 'd10_pourmoi'].includes(s.key)) choices[s.key] = s;
const audio = Object.fromEntries(Object.entries({ ...A.CLIPS.files, ...A.WEEK_CLIPS.files, ...A.DECK_CLIPS.files }).filter(([, file]) => fs.existsSync(path.join(repo, file))).map(([id, file]) => [id, `../${file}`]));
const inherited = { sources, words: A.Words.WORDS, deck: A.Deck.ITEMS, lines, narr, choices, firstMeet, canonical, wordlist, tagmap, audio };
const payload = { INHERITED: inherited, GLOSSARY_DATA: A.GlossaryData, GRAMMAR_DATA: A.Grammar.POINTS, CONJUGATION_DATA: { table: A.Conj.TABLE, common: A.Conj.COMMON, tenses: A.Conj.TENSES }, LEXICON_FIELDS: A.LEXICON_FIELDS };
if (Object.keys(payload.GLOSSARY_DATA.E).length !== 2347) throw new Error('Expected 2347 unmodified glossary lemmas');
if (Object.keys(canonical).length < 35) throw new Error('Canonical extraction incomplete');
const output = `/* Data extracted without rewriting translations. Source SHA-256 hashes: A411.INHERITED.sources.\n * Glossary frequencies/forms: Lexique 3.83, New, Pallier et al., CC BY-SA 4.0, www.lexique.org.\n * Rebuild: node app/tools/extract-data.mjs. No legacy game code is included. */\n(function(root) { 'use strict'; root.A411 = root.A411 || {}; Object.assign(root.A411, ${JSON.stringify(payload, null, 2)}); })(typeof window !== 'undefined' ? window : globalThis);\n`;
const destination = path.join(repo, 'app/data/inherited.js');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== output) throw new Error('Inherited data is stale');
} else {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, output);
}
console.log(`Inherited: ${Object.keys(payload.GLOSSARY_DATA.E).length} lemmas, ${A.Deck.ITEMS.length} deck items, ${Object.keys(canonical).length} canonical lines, ${Object.keys(audio).length} existing recordings.`);
