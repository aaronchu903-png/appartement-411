/* Synchronous learning controllers. Scene hooks provide presentation, never grading. */
(function (root) {
  'use strict';
  const factories = Object.create(null);
  const api = {
    register(id, factory) { factories[id] = factory; },
    run(id, { items = [], skin = {}, sceneHooks = {} } = {}) {
      if (!factories[id]) throw new Error('Unknown learning module: ' + id);
      if (!Array.isArray(items)) throw new TypeError('Module items must be an array');
      return factories[id]({ items: items.slice(), skin, sceneHooks });
    }
  };
  root.Day8Modules = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    for (const id of ['M1', 'M2', 'M3', 'M4']) require('./' + id + '.js');
  }
})(typeof window !== 'undefined' ? window : globalThis);
