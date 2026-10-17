/* Constrained character replies. Alternatives and incremental hints stay in authored data. */
(function (root) {
  'use strict';
  const L = root.Day8Language || (typeof module !== 'undefined' && module.exports ? require('../language.js') : null);
  root.Day8Modules.register('M4', function ({ items, skin, sceneHooks: hooks }) {
    let index = 0, attempts = 0, hints = 0, result = null, finished = false;
    const results = [];
    const current = () => items[index] || null;
    const controller = {
      skin, current,
      get attempts() { return attempts; },
      get result() { return result; },
      hint() {
        const item = current();
        if (!item) return null;
        const sequence = item.feedback || [];
        const hint = sequence[Math.min(hints++, sequence.length - 1)] || null;
        hooks.hint?.(hint, item);
        return hint;
      },
      grade(input) {
        const item = current();
        if (!item) return null;
        if (result?.correct) return result;
        const options = item.options || [];
        const accepted = item.accepted || options.map(option => typeof option === 'string' ? option : option.text);
        const option = options.find(option => L.normalize(typeof option === 'string' ? option : option.text) === L.normalize(Array.isArray(input) ? input.join(' ') : input));
        const canonical = item.canonicalAnswers || item.canonical || item.answer || (typeof option === 'string' ? option : option?.text) || accepted[0];
        const graded = L.gradeAnswer(input, accepted, canonical);
        result = { ...graded, input, attempts: ++attempts, option: option || null, after: option?.after || null,
          continue: graded.correct || (!!item.anyAttemptCounts && !!String(Array.isArray(input) ? input.join(' ') : input ?? '').trim()),
          feedback: graded.correct ? item.success || option?.after || null : controller.hint(),
          audioId: option?.audioId || null, sentence: graded.canonical };
        if (graded.correct) hooks.audio?.(result);
        hooks.answer?.(result);
        return result;
      },
      advance() {
        if (!current() || !result?.continue) return current();
        results.push({ id: current().id, ...result });
        index++; attempts = 0; hints = 0; result = null;
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
