/* French typography for new story text.
 * Curly apostrophe (U+2019) and narrow no-break space (U+202F) before ? ! : ;
 * and inside « ». Idempotent. */
(function (root) {
  'use strict';
  var NB = '\u202F';

  function normalizeFr(s) {
    var t = String(s == null ? '' : s).replace(/[\u2018\u2019\u02BC']/g, '\u2019');
    t = t.replace(/[ \u00A0\u202F]*([?!;:])/g, NB + '$1');
    t = t.replace(/«[ \u00A0\u202F]*/g, '«' + NB);
    t = t.replace(/[ \u00A0\u202F]*»/g, NB + '»');
    return t;
  }

  var api = { NB: NB, normalizeFr: normalizeFr };
  root.A411 = root.A411 || {};
  root.A411.Fr = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
