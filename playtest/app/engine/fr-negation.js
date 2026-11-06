// fix23e (ruling 2026-10-29 01:32 MT): a noun the line NEGATES (« pas de X », « plus de X », « il n'y a pas de X »,
// « sans X », a bare « Pas de X… ») is ABSENT BY STORY: the probe's named-props check is n/a for it. Scope: the negation
// covers the line itself, and any other line of the SAME beat where X is not staged (« Et du lait ? » / « Il n'y a pas de
// lait. »). A positive line naming X while X is staged still requires X in frame.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s || '').toLowerCase().replace(/[\u202f\u00a0]/g, ' ').replace(/’/g, "'");
const DET = "(?:le|la|les|l'|du|des|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|ce|cet|cette|ces)";
const hit = (txt, a) => new RegExp(`(^|[^\\p{L}])${esc(norm(a))}($|[^\\p{L}])`, 'u').test(txt);
export const NEGATION_RES = Object.freeze([
  (a) => new RegExp(`(^|[^\\p{L}])(?:pas|plus|jamais|guère)\\s+(?:de\\s+|d')${esc(a)}($|[^\\p{L}])`, 'u'),
  (a) => new RegExp(`(^|[^\\p{L}])sans\\s+(?:${DET}\\s*)?${esc(a)}($|[^\\p{L}])`, 'u'),
]);
/** ids (keys of `aliases`) whose alias the text names */
export function namedIds(text, aliases) { const t = norm(text); return Object.entries(aliases).filter(([, al]) => al.some((a) => hit(t, a))).map(([id]) => id); }
/** ids the text names only under a negation */
export function negatedIds(text, aliases) {
  const t = norm(text);
  return Object.entries(aliases).filter(([, al]) => al.some((a) => NEGATION_RES.some((mk) => mk(norm(a)).test(t)))).map(([id]) => id);
}
/** { named, unresolved, absent } for one line; beatTexts = all line texts of the line's beat */
export function resolveNamedProps(text, stageProps, aliases, beatTexts = []) {
  const ids = namedIds(text, aliases); const neg = new Set(negatedIds(text, aliases));
  const beatNeg = new Set(beatTexts.flatMap((x) => negatedIds(x, aliases)));
  const absent = ids.filter((id) => neg.has(id) || (beatNeg.has(id) && !stageProps.includes(id)));
  const live = ids.filter((id) => !absent.includes(id));
  const named = live.filter((id) => stageProps.includes(id));
  const unresolved = live.length && !named.length ? live : [];
  return { named, unresolved, absent };
}
