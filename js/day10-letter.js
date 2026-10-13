/* Letter 10 — a « Mot » slipped under Madame Lefèvre's door.
 * Edit the French here. Straight apostrophes and ordinary spaces are normalized on load
 * (curly ' and U+202F). Small wording fixes stay in this file. */
(function (root) {
  'use strict';
  var Fr = root.A411 && root.A411.Fr;
  if (!Fr && typeof require === 'function') Fr = require('./fr.js');
  var fr = Fr.normalizeFr;

  var LETTER = {
    n: 10, ch: 'd10', kind: 'Mot', to: 'Madame Lefèvre', grammar: 'conditionnel_politesse', band: 'A1',
    intro: {
      zh: '星期二晚上。你在一张小纸条上写几句话，从 Lefèvre 太太的门缝下塞进去。用礼貌的说法写。',
      en: 'Tuesday evening. You write a few lines on a small note and slip it under Madame Lefèvre’s door. Write it politely.'
    },
    body: [
      ['Chère Madame,'],
      ['Merci pour la clé. Le basilic est sur le toit, dans un pot.'],
      [fr("Il a de l'eau. Une feuille se redresse !")],
      ['Vous ', { gap: 'voudriez' }, fr(' une photo du basilic ?')],
      ['Je ', { gap: 'pourrais' }, ' vous apporter une feuille, jeudi.'],
      ['Et un jour, vous ', { gap: 'pourriez' }, ' monter… si vous voulez.'],
      [fr('À jeudi !')],
      ['le 411 (et Croissant)']
    ],
    gaps: {
      voudriez: { type: 'mc', answer: 'voudriez', options: ['voudriez', 'voudrais', 'voudrait'],
        fr: fr('Vous voudriez une photo du basilic ?'), zh: '您愿意要一张罗勒的照片吗？', en: 'Would you like a photo of the basil?',
        h1: { zh: 'vous + 礼貌 → voudriez。', en: 'vous + polite → voudriez.' },
        h2: { zh: 'v o u d r i e z。', en: 'v o u d r i e z.' } },
      pourrais: { type: 'mc', answer: 'pourrais', options: ['pourrais', 'pourrait', 'pourriez'],
        fr: fr('Je pourrais vous apporter une feuille, jeudi.'), zh: '我可以星期四给您带一片叶子。', en: 'I could bring you a leaf on Thursday.',
        h1: { zh: 'je + 礼貌 → pourrais。', en: 'je + polite → pourrais.' },
        h2: { zh: 'p o u r r a i s。', en: 'p o u r r a i s.' } },
      pourriez: { type: 'mc', answer: 'pourriez', options: ['pourriez', 'pourrais', 'pourrons'],
        fr: fr('Et un jour, vous pourriez monter… si vous voulez.'), zh: '有一天，您可以上来……如果您愿意。', en: 'And one day, you could come up… if you want.',
        h1: { zh: 'vous + 礼貌 → pourriez。', en: 'vous + polite → pourriez.' },
        h2: { zh: 'p o u r r i e z。', en: 'p o u r r i e z.' } }
    },
    /* After the signature, only when step 30 (d10_eau) was cafe. No reply is written. */
    ps: { choice: 'd10_eau', value: 'cafe', fr: fr('P.S. Noé voudrait du café. Toujours.') }
  };

  LETTER.paragraphs = function (choice) {
    var body = LETTER.body.map(function (para) { return para.slice(); });
    if (choice === LETTER.ps.value) body.push([LETTER.ps.fr]);
    return body;
  };

  var LESSON = {
    title: fr('Le conditionnel de politesse'),
    zh: '客气的说法：我想要 → je voudrais；你可以 → tu pourrais；您可以 → vous pourriez。',
    en: 'A softer way to ask: je voudrais, tu pourrais, vous pourriez.',
    steps: [
      { kind: 'example', prof: fr("Regarde. C'est plus doux."), ex: [fr('Je veux du pain.'), fr('Je voudrais du pain.')], mark: ['veux', 'voudrais'],
        zh: '第一句是直接的“我要”。第二句更客气。', en: 'The first line is a plain “I want”. The second is softer.' },
      { kind: 'pattern', prof: fr('je voudrais · tu pourrais · vous pourriez'), pattern: ['je voudrais', 'tu pourrais', 'vous pourriez'],
        zh: '三个客气的形式：je voudrais，tu pourrais，vous pourriez。', en: 'Three polite forms: je voudrais, tu pourrais, vous pourriez.' },
      { kind: 'try', prof: fr('À toi !'), q: fr('Camille, tu ___ fermer la fenêtre ?'), options: ['pourrais', 'pourrait', 'pourriez'], answer: 'pourrais',
        zh: '请 Camille 关上窗户。', en: 'Ask Camille to close the window.',
        why: { zh: 'tu + 礼貌 → pourrais。', en: 'tu + polite → pourrais.' } }
    ]
  };

  var api = { LETTER: LETTER, LESSON: LESSON };
  root.A411 = root.A411 || {};
  root.A411.Day10Letter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
