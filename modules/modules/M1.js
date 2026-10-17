/* Port of legacy line/focus progression: exposure, guess, reveal, then advance. */
(function (root) {
  'use strict';
  root.Day8Modules.register('M1', function ({ items, skin, sceneHooks: hooks }) {
    let index = 0, revealed = false, finished = false;
    const exposures = [];
    const current = () => items[index] || null;
    const controller = {
      skin, current,
      get revealed() { return revealed; },
      get done() { return index >= items.length; },
      reveal() {
        const item = current();
        if (!item || revealed) return item;
        revealed = true;
        hooks.reveal?.(item);
        if (!item.silent) hooks.audio?.(item);
        return item;
      },
      pulse() {
        const item = current();
        if (item && !revealed) hooks.pulse?.(item);
        return item && !revealed ? item.hotspot || null : null;
      },
      frame(time) {
        const item = current();
        if (item) hooks.frame?.(item, time);
        return { item, time, revealed, focus: item?.hotspot || null };
      },
      advance() {
        const item = current();
        if (!item) return null;
        if (item.kind === 'focus' && !revealed) { controller.reveal(); return item; }
        exposures.push({ id: item.id, revealed, silent: !!item.silent });
        index++; revealed = false;
        hooks.advance?.(item, current());
        if (!current()) controller.finish();
        return current();
      },
      finish() {
        const result = { done: index >= items.length, exposures: exposures.slice() };
        if (!finished && result.done) { finished = true; hooks.finish?.(result); }
        return result;
      }
    };
    return controller;
  });
})(typeof window !== 'undefined' ? window : globalThis);
