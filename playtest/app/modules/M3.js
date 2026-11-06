/* Listening and dictation: authored alternatives, letter feedback and optional transcript. */
(function (root) {
  'use strict';
  const L = root.Day8Language || (typeof module !== 'undefined' && module.exports ? require('../language.js') : null);
  root.Day8Modules.register('M3', function ({ items, skin, sceneHooks: hooks }) {
    let index = 0, attempts = 0, hints = 0, result = null, transcript = false, finished = false;
    const results = [];
    const current = () => items[index] || null;
    const controller = {
      skin, current,
      get attempts() { return attempts; },
      get result() { return result; },
      get transcriptVisible() { return transcript; },
      reveal() { transcript = true; hooks.reveal?.(current()); return current()?.lines || []; },
      hint() {
        const item = current();
        if (!item) return null;
        const sequence = item.feedback || [item.cloze, item.answer, item.canonical];
        const hint = sequence[Math.min(hints++, sequence.length - 1)] || null;
        hooks.hint?.(hint, item);
        return hint;
      },
      grade(input) {
        const item = current();
        if (!item) return null;
        if (result?.correct) return result;
        const graded = L.gradeAnswer(input, item.accepted || [item.answer], item.canonicalAnswers || item.canonical || item.answer);
        const target = Array.from(L.typography(item.answer || graded.canonical));
        const supplied = Array.from(L.typography(Array.isArray(input) ? input.join(' ') : input));
        const feedback = graded.correct ? item.success || null : controller.hint();
        result = { ...graded, input, attempts: ++attempts,
          letters: target.map((letter, i) => ({ letter, correct: graded.correct || (supplied[i] !== undefined && L.normalize(letter) === L.normalize(supplied[i])) })),
          feedback,
          audioId: graded.correct ? item.answerAudioId || null : feedback?.audioId || feedback?.clip || feedback?.id || null,
          sentence: graded.correct ? graded.canonical : typeof feedback === 'string' ? feedback : feedback?.text || '' };
        if (graded.correct) transcript = true;
        if (result.sentence) hooks.audio?.(result);
        hooks.answer?.(result);
        return result;
      },
      advance() {
        if (!current() || !result?.correct) return current();
        results.push({ id: current().id, ...result });
        index++; attempts = 0; hints = 0; result = null; transcript = false;
        if (!current()) controller.finish();
        return current();
      },
      finish() {
        const summary = { done: index >= items.length, results: results.slice() };
        if (summary.done && !finished) { finished = true; hooks.finish?.(summary); }
        return summary;
      }
    };
    return controller;
  });
})(typeof window !== 'undefined' ? window : globalThis);
