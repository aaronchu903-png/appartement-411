/* The only learning review entry point: a night rooftop over the inherited FSRS engine. */
(function (root) {
  'use strict';
  const E = root.Day8Engine || (typeof module !== 'undefined' && module.exports ? require('../engine.js') : null);
  root.Day8Modules.register('M2', function ({ items, skin, sceneHooks: hooks }) {
    if (skin.scene !== 'roof' || skin.lighting !== 'night' || skin.mode === 'cat') throw new Error('M2 review requires the night roof');
    if (!hooks.state) throw new Error('M2 requires sceneHooks.state');
    const state = hooks.state;
    let session = hooks.session || null, finished = false;
    if (session && session.mode !== 'garden') throw new Error('M2 cannot resume cat review');
    function remainingAnswers() {
      if (!Number.isFinite(session?.firstWateringCap)) return Infinity;
      const remaining = Math.max(0, Math.min(8, session.firstWateringCap) - session.answered);
      if (!remaining) { session.done = true; session.current = null; }
      return remaining;
    }
    remainingAnswers();
    const controller = {
      skin,
      get session() { return session; },
      create(options = {}) {
        if (options.mode && options.mode !== 'garden') throw new Error('M2 supports garden review only');
        const opts = { ...options, mode: 'garden' };
        if (options.firstWordId) {
          // Both queues see the whole catalog so first watering cannot hide the daily due load.
          const first = E.createSession(state, items, { ...opts, onlyIds: [options.firstWordId], practice: true, budget: 1 });
          const dueIds = items.filter(w => String(w.potId ?? w.pot) === String(options.duePotId ?? 1)).map(w => w.id);
          const due = E.createSession(state, items, { ...opts, onlyIds: dueIds, practice: false, budget: undefined });
          first.queue = first.queue.concat(due.queue.filter(entry => entry.due && entry.wordId !== options.firstWordId));
          first.firstWateringCap = Number.isFinite(options.budget) ? Math.min(8, Math.max(0, Math.floor(options.budget))) : 8;
          first.queue = first.queue.slice(0, first.firstWateringCap);
          first.pool = [...new Set(first.queue.map(entry => entry.wordId))];
          first.initial = first.queue.length;
          first.budget = first.initial;
          first.done = !first.initial;
          session = first;
        } else session = E.createSession(state, items, opts);
        finished = false;
        return session;
      },
      current() { return session && remainingAnswers() ? E.current(session, state, items) : null; },
      answer(input, options = {}) {
        const value = Array.isArray(input) ? input.join(' ') : input && typeof input === 'object' ? input.id : input;
        if (!String(value ?? '').trim()) return { skipped: 'empty', done: !!session?.done, correct: false, scheduled: false,
          remaining: session ? session.queue.length - session.index : 0 };
        if (!controller.current()) return { done: true, correct: false, scheduled: false, remaining: 0 };
        // Each accepted call advances the engine; presentation guards duplicate submits during feedback.
        const result = E.answer(session, state, items, input, options);
        // The story allowance counts retries and fillers, not just the initial due queue.
        result.remaining = Math.min(result.remaining, remainingAnswers());
        result.done = session.done;
        // Correct sentence audio and target-pot feedback are emitted even after a wrong answer.
        hooks.audio?.(result);
        hooks.answer?.(result);
        return result;
      },
      finish() {
        const result = { done: !!session?.done, answered: session?.answered || 0, correct: session?.correct || 0, session };
        if (result.done && !finished) { finished = true; hooks.finish?.(result); }
        return result;
      }
    };
    return controller;
  });
})(typeof window !== 'undefined' ? window : globalThis);
