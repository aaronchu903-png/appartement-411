// Bubble text wrap (generic, French typography): never break inside a punctuation run, never start a line with
// ? ! : ; » or …, and French spacing before ?!:; (and inside « ») becomes U+202F (no-break narrow space).
export const NNBSP = '\u202F';
export const LINE_START_FORBIDDEN = /^[?!:;»…]/;

/** Normalise French spacing: any space before ?!:;» and after « -> U+202F (glues the punctuation to its word). */
export function frenchSpacing(text) {
  return String(text ?? '')
    .replace(/[ \u00A0\u202F]+(?=[?!:;»])/g, NNBSP)
    .replace(/«[ \u00A0\u202F]*/g, `«${NNBSP}`);
}

/** Break opportunities: only ordinary whitespace (U+202F / U+00A0 never break); a token that would start with
 *  forbidden punctuation (e.g. a stray "…") is glued to the previous one. */
export function wrapTokens(text) {
  const toks = frenchSpacing(text).split(/[ \t\n\r]+/).filter(Boolean);
  const out = [];
  for (const t of toks) {
    if (out.length && LINE_START_FORBIDDEN.test(t)) out[out.length - 1] += ` ${t}`.replace(' ', NNBSP);
    else out.push(t);
  }
  // a leading ellipsis (authored continuation "… et toi") stays with its first word
  if (out.length > 1 && /^[…]+$/.test(out[0])) out.splice(0, 2, `${out[0]}${NNBSP}${out[1]}`);
  return out;
}

export function wrapLines(text, maxWidth, measure, maxLines = 3) {
  const lines = [];
  let line = '';
  for (const w of wrapTokens(text)) {
    const test = line ? `${line} ${w}` : w;
    if (measure(test) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return maxLines > 0 ? lines.slice(0, maxLines) : lines;
}

export function wrapLinesBySentences(text, maxWidth, measure, maxLines = 4) {
  const raw = frenchSpacing(String(text).trim());
  // split only after a whole punctuation run followed by ordinary whitespace
  const parts = raw.split(/(?<=[^\s.!?…][.!?…]+)[ \t\n\r]+(?![?!:;»…])/).filter(Boolean);
  if (parts.length > 1) {
    const lines = [];
    for (const part of parts) {
      if (measure(part) <= maxWidth) lines.push(part);
      else lines.push(...wrapLines(part, maxWidth, measure, 0));
    }
    return maxLines > 0 ? lines.slice(0, maxLines) : lines;
  }
  return wrapLines(raw, maxWidth, measure, maxLines);
}
