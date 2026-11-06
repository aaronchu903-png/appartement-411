/** SCHEMA_DRAFT v0.5 prop/insert captions (DejaVu Sans Book, stage px). */

export const CAPTION_FONT_SIZE = 2.2;
export const CAPTION_LINE_HEIGHT = 2.64;
export const CAPTION_PADDING = 0.5;
export const CAPTION_INK = '#4a3328';
export const CAPTION_SELF_LIT = '#ffffff';

const FONT_STACK = '"DejaVu Sans", "Noto Sans", sans-serif';

export function maxCaptionLines(rectH, capLines) {
  const byH = Math.max(1, Math.floor(rectH / CAPTION_LINE_HEIGHT));
  if (capLines != null) return Math.min(byH, capLines);
  return byH;
}

export function wrapCaptionLines(ctx, text, innerW, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let idx = 0;
  while (idx < words.length && lines.length < maxLines) {
    let cur = words[idx++];
    while (idx < words.length) {
      const trial = `${cur} ${words[idx]}`;
      if (ctx.measureText(trial).width <= innerW) {
        cur = trial;
        idx += 1;
      } else break;
    }
    lines.push(cur);
  }
  return { lines, consumedAll: idx >= words.length };
}

export function drawCaptionInRect(ctx, text, rect, options = {}) {
  const { x, y, w, h } = rect;
  const selfLit = options.selfLit === true;
  const capLines = options.maxLines;
  const innerW = w - 2 * CAPTION_PADDING;
  const innerH = h - 2 * CAPTION_PADDING;
  if (innerW <= 0 || innerH <= 0) return false;

  ctx.save();
  // fix22 G (generic): a caller may require a minimum CAP height (rect units, e.g. 11 css px / insert scale); the font
  // grows until the measured 'H' ascent reaches it and line height grows with it (wrap/overflow rules unchanged)
  let fontSize = CAPTION_FONT_SIZE;
  let capRatio = 0.73;
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  if (options.minCap > 0) {
    // measured at 100px (tiny sizes round the metric); cap ratio is size-independent for the outline font
    ctx.font = `100px ${FONT_STACK}`;
    capRatio = (ctx.measureText('H').actualBoundingBoxAscent || 73) / 100;
    if (fontSize * capRatio < options.minCap) fontSize = Math.ceil((options.minCap / capRatio) * 1000) / 1000;
    ctx.font = `${fontSize}px ${FONT_STACK}`;
  }
  const lineH = CAPTION_LINE_HEIGHT * fontSize / CAPTION_FONT_SIZE;
  if (options.metrics) { options.metrics.fontSize = fontSize; options.metrics.cap = fontSize * capRatio; }
  ctx.textBaseline = 'top';
  ctx.fillStyle = selfLit ? CAPTION_SELF_LIT : CAPTION_INK;
  const ml = fontSize === CAPTION_FONT_SIZE ? maxCaptionLines(innerH, capLines) : Math.max(1, Math.min(capLines || Infinity, Math.floor(innerH / lineH)));
  const { lines, consumedAll } = wrapCaptionLines(ctx, text, innerW, ml);
  if (!consumedAll) {
    ctx.restore();
    return false;
  }
  const top = options.valign === 'top';
  const left = options.align === 'left';
  const startY = y + CAPTION_PADDING + (top ? 0 : Math.max(0, (innerH - lines.length * lineH) / 2));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lw = ctx.measureText(line).width;
    const lx = x + CAPTION_PADDING + (left ? 0 : Math.max(0, (innerW - lw) / 2));
    const ly = startY + i * lineH;
    ctx.fillText(line, lx, ly);
  }
  ctx.restore();
  return true;
}
