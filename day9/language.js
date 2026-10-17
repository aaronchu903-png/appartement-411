/* Shared French display and constrained-answer rules. No DOM, storage or network. */
(function (root) {
  'use strict';
  function typography(value) {
    return String(value == null ? '' : value).normalize('NFC').replace(/['‘]/g, '\u2019')
      .replace(/[ \u00a0\u202f]*([?!:;])/g, '\u202f$1')
      .replace(/«[ \u00a0\u202f]*/g, '«\u202f').replace(/[ \u00a0\u202f]*»/g, '\u202f»');
  }
  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function gradeAnswer(input, accepted, canonical) {
    const alternatives = (Array.isArray(accepted) ? accepted : [accepted]).filter(value => typeof value === 'string' && normalize(value));
    const normalized = normalize(Array.isArray(input) ? input.join(' ') : input);
    // Equivalences belong to each exercise, not global substitutions (e.g. six is not always 18).
    const match = normalized ? alternatives.find(value => normalize(value) === normalized) : undefined;
    const display = canonical && typeof canonical === 'object'
      ? (match !== undefined && Object.prototype.hasOwnProperty.call(canonical, normalized) ? canonical[normalized] : canonical.default)
      : canonical;
    return { correct: match !== undefined, canonical: typography(display == null ? alternatives[0] || '' : display),
      matched: match === undefined ? null : typography(match), normalized };
  }
  const uiFrench = Object.freeze(Object.fromEntries(Object.entries({
    appTitle: 'L’APPARTEMENT 411', title: 'Le basilic.', chapter: 'UN LUNDI À PARIS',
    catTitle: 'Non, Croissant !', group: 'Coloc 411', potOne: 'Chez nous', potTwo: 'À table',
    puzzled: 'Hein ?', agreement: 'D’accord !', keep: 'Garder', kept: '✓ Gardé',
    addWord: 'Ajouter au carnet', savedWord: '✓ Dans le carnet', conjugation: 'Voir la conjugaison',
    verify: 'Vérifier', writingPrompt: 'Aujourd’hui…', evening: 'ÉCOUTE DU SOIR', end: 'JOUR 8 · TERMINÉ',
    reveal: 'Regarde ! Une nouvelle feuille !', basil: 'Le basilic', timeAnswer: 'À six heures.'
  }).map(([key, value]) => [key, typography(value)])));
  function chipLabel(value) {
    // Keep meaningful accents, apostrophes and internal hyphens, not sentence cues.
    return typography(value).toLocaleLowerCase('fr').replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '');
  }
  function assembleChips(choices, order, answer) {
    const input = order.map(i => chipLabel(choices[i])).filter(Boolean).join(' ');
    if (!input) return '';
    const canonical = typography(answer), normalized = normalize(input);
    if (order.length === choices.length && new Set(order).size === choices.length && normalized === normalize(canonical)) return canonical;
    // A correct prefix can recover authored case and punctuation without revealing unseen words.
    const words = [...canonical.matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
    const last = words[normalized.split(' ').length - 1];
    const prefix = last && canonical.slice(0, last.index + last[0].length);
    if (prefix && normalize(prefix) === normalized) return prefix;
    return input[0].toLocaleUpperCase('fr') + input.slice(1);
  }
  const api = { normalize, gradeAnswer, typography, chipLabel, assembleChips, uiFrench };
  root.Day8Language = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
