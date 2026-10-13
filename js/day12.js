/* Day 12 « Jeudi soir » — FINAL line edits (ACT1 outline §10, Prof Neng review applied).
 * The full dinner episode is not in this build (days stop at 9, plus the new Day 10).
 * apply(chapter, lines) rewrites the named steps when that episode is present. */
(function (root) {
  'use strict';
  var Fr = root.A411 && root.A411.Fr;
  if (!Fr && typeof require === 'function') Fr = require('./fr.js');
  var fr = Fr.normalizeFr;

  var LINES = {
    n_d12_poche: { speaker: 'neutral', fr: fr('Tu sors la clé de ta poche.'), zh: '你从口袋里拿出钥匙。', en: 'You take the key out of your pocket.', label: 'atmosphere' },
    n_d12_tiroir: { speaker: 'neutral', fr: fr('Elle regarde la clé dans ta main.'), zh: '她看着你手里的钥匙。', en: 'She looks at the key in your hand.', label: 'atmosphere' },
    d12_lef_cle: { speaker: 'lefevre', fr: fr('C’était à lui. Cette clé.'), zh: '这是他的。这把钥匙。', en: 'It was his. This key.', label: 'understand' },
    d12_lef_jardin: { speaker: 'lefevre', fr: fr('Le jardin, là-haut… c’était son jardin.'), zh: '上面的花园……是他的花园。', en: 'The garden up there… it was his garden.', label: 'understand' },
    n_d12_range: { speaker: 'neutral', fr: fr('Elle ferme ta main sur la clé. Doucement.'), zh: '她轻轻合上你握着钥匙的手。', en: 'She closes your hand around the key. Gently.', label: 'atmosphere' },
    d12_noe_jardin: { speaker: 'noe', fr: fr('Son jardin… au-dessus de nous.'), zh: '他的花园……就在我们头顶上。', en: 'His garden… above us.', label: 'understand' },
    d12_cam_jardin: { speaker: 'camille', fr: fr('Un jardin qui se réveille.'), zh: '一个正在醒来的花园。', en: 'A garden that is waking up.', label: 'understand' }
  };

  var HOOK = { fr: fr('Au-dessus de l’appartement, il y a un jardin. Son jardin.'), zh: '公寓上面有一个花园。他的花园。', en: 'Above the apartment, there is a garden. His garden.' };
  var OPTION_JARDIN = fr('Merci pour le dîner. Et merci pour la clé.');
  var EVE = { fr: fr('La nuit. Le basilic, sous la lune. En bas, une fenêtre est allumée.'), zh: '夜里。月光下的罗勒。楼下一扇窗亮着。', en: 'Night. The basil under the moon. Downstairs, a window is lit.', sfx: ['purr'] };
  var KEPT = fr('Je ne monte plus. Depuis l’hiver, le jardin dort.');

  function apply(chapter, lineBook) {
    if (!chapter || !chapter.steps) return { applied: false };
    var book = lineBook || {};
    var n = 0;
    chapter.steps.forEach(function (st) {
      if (st.t === 'narr' && LINES[st.id]) {
        st.fr = LINES[st.id].fr; st.zh = LINES[st.id].zh; st.en = LINES[st.id].en; n++;
      }
      if (st.t === 'line' && LINES[st.id] && book[st.id]) n++;
      if (st.t === 'done' && st.hook) { st.hook = HOOK; n++; }
      if (st.t === 'choice' && st.key === 'd12_merci' && st.opts) {
        st.opts.forEach(function (o) { if (o.id === 'jardin') { o.fr = OPTION_JARDIN; n++; } });
      }
    });
    if (!chapter.steps.some(function (st) { return st.id === 'n_d12_poche'; })) {
      var at = -1;
      chapter.steps.forEach(function (st, i) { if (st.id === 'n_d12_tiroir') at = i; });
      if (at >= 0) {
        chapter.steps.splice(at, 0, { t: 'narr', id: 'n_d12_poche', fr: LINES.n_d12_poche.fr, zh: LINES.n_d12_poche.zh, en: LINES.n_d12_poche.en, beat: chapter.steps[at].beat });
        n++;
      }
    }
    Object.keys(LINES).forEach(function (id) { book[id] = LINES[id]; });
    return { applied: n > 0, edits: n };
  }

  var api = { LINES: LINES, HOOK: HOOK, OPTION_JARDIN: OPTION_JARDIN, EVE: EVE, KEPT: KEPT, apply: apply };
  root.A411 = root.A411 || {};
  root.A411.Day12 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
