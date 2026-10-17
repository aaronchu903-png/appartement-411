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
    if (session && Number.isFinite(session.firstWateringCap)) {
      // Shipped first-watering saves may contain only eight of today's due words.
      const queued = new Set(session.queue.map(entry => entry.wordId));
      const rest = E.createSession(state, items, { now: session.now, storyDay: session.storyDay });
      session.queue.push(...rest.queue.filter(entry => !queued.has(entry.wordId)));
      session.initialIds = [...new Set(session.queue.filter(entry => !entry.retryType && !entry.recognition).map(entry => entry.wordId))];
      session.completedIds ||= [...new Set(session.queue.slice(0, session.index).map(entry => entry.wordId).filter(id => session.initialIds.includes(id)))];
      session.initial = session.initialIds.length;
      session.budget = session.initial;
      session.pool = [...new Set([...session.pool, ...rest.pool])];
      session.done = session.index >= session.queue.length;
      delete session.firstWateringCap;
    }
    const controller = {
      skin,
      get session() { return session; },
      create(options = {}) {
        if (options.mode && !['garden', 'test'].includes(options.mode)) throw new Error('M2 supports garden review only');
        session = E.createSession(state, items, { ...options, mode: options.mode === 'test' ? 'test' : 'garden', practice: false });
        // Explicit developer fixtures may filter a queue; presentation remains rooftop review.
        session.mode = 'garden';
        finished = false;
        return session;
      },
      current() { return session ? E.current(session, state, items) : null; },
      answer(input, options = {}) {
        const value = Array.isArray(input) ? input.join(' ') : input && typeof input === 'object' ? input.id : input;
        if (!String(value ?? '').trim()) return { skipped: 'empty', done: !!session?.done, correct: false, scheduled: false,
          remaining: session ? session.queue.length - session.index : 0 };
        if (!controller.current()) return { done: true, correct: false, scheduled: false, remaining: 0 };
        // Each accepted call advances the engine; presentation guards duplicate submits during feedback.
        const result = E.answer(session, state, items, input, options);
        // Correct sentence audio and target-pot feedback are emitted even after a wrong answer.
        for (const item of result.pairResults || [result]) {
          hooks.audio?.(item);
          hooks.answer?.(item);
        }
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
