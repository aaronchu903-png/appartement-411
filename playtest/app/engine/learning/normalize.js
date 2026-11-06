/** Dictation / written matching normalisation (MODULES_V1 §4). */
export function normalizeFrenchInput(s) {
  if (s == null) return '';
  let t = String(s).toLowerCase().trim();
  t = t.replace(/[''`]/g, "'");
  t = t.replace(/\s+/g, ' ');
  t = t.replace(/[.!?…]+$/g, '');
  return t;
}

export function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * @returns {'exact'|'accent'|'typo'|'accept'|'other'}
 */
export function matchDictation(input, answer, accept = [], opts = {}) {
  const typoPer = opts.typoPerChars ?? 5;
  const typoMax = opts.typoMax ?? 2;
  const nIn = normalizeFrenchInput(input);
  const nAns = normalizeFrenchInput(answer);
  if (!nIn) return 'other';
  if (nIn === nAns) return 'exact';
  const pool = [nAns, ...accept.map(normalizeFrenchInput)];
  if (pool.includes(nIn)) return 'accept';
  if (stripAccents(nIn) === stripAccents(nAns)) return 'accent';
  const limit = Math.min(typoMax, Math.max(1, Math.ceil(nAns.length / typoPer)));
  if (levenshtein(nIn, nAns) <= limit) return 'typo';
  return 'other';
}
