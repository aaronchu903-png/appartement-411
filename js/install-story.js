/* Installs Day 10, the Day 12 line table, and the five Act I pots into the running app.
 * Idempotent. Days 11–12 episodes are not in this build; Day 12.apply waits for them. */
(function (root) {
  'use strict';

  function install() {
    var A = root.A411;
    if (!A || !A.Day10 || !A.Week || !A.Pots) return false;
    var D = A.Day10, W = A.Week;
    Object.keys(D.LINES).forEach(function (id) { W.LINES[id] = D.LINES[id]; });
    if (A.Day12) {
      Object.keys(A.Day12.LINES).forEach(function (id) { W.LINES[id] = A.Day12.LINES[id]; });
      if (W.CHAPTERS && W.CHAPTERS.d12) A.Day12.apply(W.CHAPTERS.d12, W.LINES);
    }
    if (!W.CHAPTERS.d10) W.CHAPTERS.d10 = D.CHAPTER;
    if (W.CHAPTER_ORDER.indexOf('d10') < 0) W.CHAPTER_ORDER.push('d10');
    if (A.Words && A.Words.add) {
      Object.keys(D.WORDS).forEach(function (id) { A.Words.add(id, D.WORDS[id]); });
    } else if (A.Words && A.Words.WORDS) {
      Object.keys(D.WORDS).forEach(function (id) { A.Words.WORDS[id] = D.WORDS[id]; });
    }
    if (A.Deck && A.Deck.byId) {
      D.DECK.forEach(function (it) {
        if (!A.Deck.byId[it.id]) { A.Deck.ITEMS.push(it); A.Deck.byId[it.id] = it; }
      });
    }
    if (A.Letters) {
      A.Letters.LETTERS[10] = D.LETTER;
      A.Letters.LESSONS.conditionnel = D.LESSON;
      if (A.Letters.ORDER.indexOf(10) < 0) A.Letters.ORDER.push(10);
    }
    if (A.HubStory) {
      A.HubStory.ORDER.d10 = D.HUB.order.slice();
      Object.keys(D.HUB.meta).forEach(function (id) { A.HubStory.META[id] = D.HUB.meta[id]; });
    }
    function isPotGrown(n, learn, now) { return A.Pots.isPotGrown(n, learn, now); }
    A.isPotGrown = isPotGrown;
    if (typeof window !== 'undefined') window.isPotGrown = isPotGrown;
    A.installStory = install;
    return true;
  }

  root.A411 = root.A411 || {};
  root.A411.installStory = install;
  if (root.A411.Week && root.A411.Day10) install();
  if (typeof module !== 'undefined' && module.exports) module.exports = install;
})(typeof window !== 'undefined' ? window : globalThis);
