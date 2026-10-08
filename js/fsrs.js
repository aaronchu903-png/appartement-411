/* FSRS-5 (19 parameters) — small local port of the published algorithm.
 * Source: open-spaced-repetition/ts-fsrs v4.7.1 ("FSRS-5.0") and
 * https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm (FSRS-5 section, 19 weights).
 * Defaults are the published FSRS-5 weights. enable_fuzz = false, enable_short_term = false,
 * request_retention = 0.9, maximum_interval = 36500.
 * Checked against ts-fsrs@4.7.1 next_state / scheduled_days (see tests/learn.test.js).
 * DECAY and FACTOR are the FSRS-4.5/5 forgetting curve (not the later trainable FSRS-6 decay).
 */
(function (root) {
  'use strict';
  var W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  var DECAY = -0.5;
  var FACTOR = 19 / 81;
  var S_MIN = 0.01;
  var S_MAX = 36500;
  var REQUEST_RETENTION = 0.9;

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function constrainDifficulty(d) { return clamp(+d.toFixed(8), 1, 10); }

  function initStability(g) { return Math.max(W[g - 1], 0.1); }
  function initDifficulty(g) { return constrainDifficulty(W[4] - Math.exp((g - 1) * W[5]) + 1); }
  function linearDamping(delta, d) { return +(delta * (10 - d) / 9).toFixed(8); }
  function meanReversion(easyInit, d) { return +(W[7] * easyInit + (1 - W[7]) * d).toFixed(8); }
  function nextDifficulty(d, g) {
    var delta = -W[6] * (g - 3);
    return constrainDifficulty(meanReversion(initDifficulty(4), d + linearDamping(delta, d)));
  }
  function forgettingCurve(elapsedDays, stability) {
    return +Math.pow(1 + FACTOR * elapsedDays / stability, DECAY).toFixed(8);
  }
  function nextRecallStability(d, s, r, g) {
    var hard = g === 2 ? W[15] : 1;
    var easy = g === 4 ? W[16] : 1;
    var inc = Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy;
    return +clamp(s * (1 + inc), S_MIN, S_MAX).toFixed(8);
  }
  function nextForgetStability(d, s, r) {
    return +clamp(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]), S_MIN, S_MAX).toFixed(8);
  }
  function intervalModifier(retention) {
    return +((Math.pow(retention, 1 / DECAY) - 1) / FACTOR).toFixed(8);
  }
  function nextIntervalDays(stability, retention) {
    var mod = intervalModifier(retention == null ? REQUEST_RETENTION : retention);
    return Math.min(Math.max(1, Math.round(stability * mod)), 36500);
  }

  // Memory state after one rating. elapsedDays is whole UTC days since last review (0 on the same day).
  // First review: pass stability 0, difficulty 0.
  function nextState(memory, elapsedDays, grade) {
    var d = memory.difficulty || 0, s = memory.stability || 0;
    if (d === 0 && s === 0) return { difficulty: initDifficulty(grade), stability: initStability(grade) };
    var r = forgettingCurve(elapsedDays, s);
    var stability = grade === 1
      ? clamp(+s.toFixed(8), S_MIN, nextForgetStability(d, s, r))
      : nextRecallStability(d, s, r, grade);
    return { difficulty: nextDifficulty(d, grade), stability: +stability.toFixed(8) };
  }

  // All four ratings, with the FSRS-5 (short-term off) interval ladder:
  // Again <= Hard, Hard >= Again+1, Good >= Hard+1, Easy >= Good+1.
  function preview(memory, elapsedDays, retention) {
    var out = [1, 2, 3, 4].map(function (g) {
      var st = nextState(memory, elapsedDays, g);
      return { grade: g, stability: st.stability, difficulty: st.difficulty, scheduledDays: nextIntervalDays(st.stability, retention) };
    });
    out[0].scheduledDays = Math.min(out[0].scheduledDays, out[1].scheduledDays);
    out[1].scheduledDays = Math.max(out[1].scheduledDays, out[0].scheduledDays + 1);
    out[2].scheduledDays = Math.max(out[2].scheduledDays, out[1].scheduledDays + 1);
    out[3].scheduledDays = Math.max(out[3].scheduledDays, out[2].scheduledDays + 1);
    return out;
  }

  function utcDayDiff(from, to) {
    var a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    var b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.floor((b - a) / 86400000);
  }

  var api = {
    W: W, DECAY: DECAY, FACTOR: FACTOR, REQUEST_RETENTION: REQUEST_RETENTION,
    SOURCE: 'open-spaced-repetition/ts-fsrs v4.7.1 (FSRS-5.0, 19 parameters); wiki The-Algorithm FSRS-5 section',
    initStability: initStability, initDifficulty: initDifficulty, forgettingCurve: forgettingCurve,
    nextState: nextState, nextIntervalDays: nextIntervalDays, preview: preview, utcDayDiff: utcDayDiff
  };
  root.A411 = root.A411 || {};
  root.A411.FSRS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
