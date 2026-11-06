import { buildSitcomStageOverlay, CAT_SIT_FP, catHidden } from './sitcom-stage.js';
import { resolvePropSpot, propMarkCoords } from './registry.js';
import { normalizeWho } from './commands.js';
// subshots: one sub-shot per cut_to inside a beat (generic; no per-day literals).
// A cut_to opens a sub-shot with its own camera + insert; it holds until the next cut_to or the beat end.
// Line-less "setup" steps before a cut (prop shows, cat_action ...) roll forward into that cut's sub-shot.
// A cat_action/actor action after an insert cut ends the insert (insert-clear rule) and rolls into the next cut.

/** Le Réalisateur's insert/hold defaults (2026-10-27). */
export const SUBSHOT_RULES = Object.freeze({
  INSERT_SKIP_LOCK_MS: 1500, // a silent insert ignores taps for 1.5 s
  INSERT_MIN_MS: 3000, // silent insert auto-advance floor
  INSERT_BASE_MS: 2000, // + reading time ...
  READ_MS_PER_CHAR: 60, // ... 60 ms per caption character (Croissant's reading floor)
  ACTION_LEAD_MS: 1000, // an authored action plays ~1 s before any bubble in a close
  INSERT_BACKDROP_DIM: 0.4, // backdrop at ~60 %: black (existing fade colour) at 40 %
  READABLE_MIN_CSS_PX: 180, // readable insert: drawn >= 180 css px wide ...
  READABLE_MIN_CAPTION_FONT_CSS_PX: 9 // ... caption glyphs >= 9 css px (CAPTION_FONT_SIZE 2.2 stage px x scale), caption rect fully inside the viewport
});

const ACTION_DOS = new Set(['cat_action', 'actor_action', 'gesture', 'move', 'pose']);

/** Close-insert prop? (id convention OR registry insert:'close'). */
export function isCloseInsertProp(id, registry) {
  const def = registry?.props?.[id];
  return String(id || '').startsWith('insert_') || def?.insert === 'close';
}

/** Insert-capable target (any registry `insert` view), used by the checker to report differently named inserts. */
export function insertKindOf(id, registry) {
  if (isCloseInsertProp(id, registry)) return 'close';
  return registry?.props?.[id]?.insert ? String(registry.props[id].insert) : null;
}

export function isLineStep(step) { return step?.do === 'say' || step?.do === 'narrate' || step?.do === 'line' || step?.do === 'phone_bubble'; }
/** Spoken line (not a phone_bubble carried by a phone insert). */
export function isSpokenStep(step) { return isLineStep(step) && step.do !== 'phone_bubble'; }
/** Insert kinds that are screens/cards: nobody speaks over them (Réalisateur 2026-10-27); a spoken reaction cuts back. */
export const SCREEN_INSERT_KINDS = new Set(['screen', 'list', 'text']);
export function isActionStep(step) { return ACTION_DOS.has(step?.do); }

/** Split a beat into sub-shots. Returns [{ fromStep, toStep, cut, insertId, caption, lines, hasAction }]. */
/**
 * Live call (fix17 compile rule): the player answers a phone_bubble out loud (a later learning_module mode 'spoken' in the
 * same beat). A call is heard, not read, so its lines are not screen content. Texts/voicemails (answered in writing or by a
 * choice) keep their phone insert.
 */
export function isLiveCallBeat(beat) {
  const st = beat?.steps || [];
  const first = st.findIndex((s) => s.do === 'phone_bubble');
  return first >= 0 && st.slice(first + 1).some((s) => s.do === 'learning_module' && s.mode === 'spoken');
}

/**
 * Split a beat into sub-shots. Returns [{ fromStep, toStep, cut, insertId, caption, lines, hasAction }].
 * ctx.callFocus (optional): the scene's focal set piece (last prop shown before this beat). Live-call rule (fix17):
 * in a live-call beat (isLiveCallBeat), a screen-insert cut whose lines are all phone_bubbles shows nothing to read, so it is NOT an insert; the line plays
 * as a rect/off-screen bubble and the cut frames ctx.callFocus instead of the handset.
 */
export function splitBeat(beat, registry, ctx = {}) {
  const steps = beat.steps || [];
  const segs = [];
  const liveCall = isLiveCallBeat(beat);
  let cur = { fromStep: 0, toStep: -1, cut: null, insertId: null, insertKind: null, cutAt: -1 };
  let tailStart = 0; // first step after the last line/cut in `cur`: line-less setup that rolls into the next cut
  const close = () => { if (cur.toStep >= cur.fromStep) segs.push(cur); };
  steps.forEach((s, i) => {
    if (s.do === 'cut_to') {
      if (cur.cut || steps.slice(cur.fromStep, tailStart).some(isLineStep)) {
        const from = Math.max(tailStart, cur.fromStep);
        cur.toStep = from - 1;
        close();
        cur = { fromStep: from, toStep: from - 1 };
      }
      cur.cut = s;
      cur.cutAt = i;
      cur.insertId = (s.on || []).find((id) => insertKindOf(id, registry)) || null;
      cur.insertKind = cur.insertId ? insertKindOf(cur.insertId, registry) : null;
      tailStart = i + 1;
    } else if (isActionStep(s) && cur.insertId) {
      cur.toStep = i - 1;
      close(); // action ends the insert; it becomes setup for the next sub-shot
      cur = { fromStep: i, toStep: i - 1, cut: null, insertId: null, insertKind: null, cutAt: -1 };
      tailStart = i;
    } else if (isSpokenStep(s) && cur.insertId && SCREEN_INSERT_KINDS.has(cur.insertKind)) {
      // a spoken reaction after a phone/card insert cuts back to the actors (beat camera)
      cur.toStep = i - 1;
      close();
      cur = { fromStep: i, toStep: i - 1, cut: null, insertId: null, insertKind: null, cutAt: -1, cutBack: true };
      tailStart = i + 1;
    } else if (isLineStep(s)) tailStart = i + 1;
    cur.toStep = i;
  });
  close();
  // a trailing cut-less tail (after an insert) with lines but no cut keeps the beat camera
  for (const g of segs) {
    const own = steps.slice(g.fromStep, g.toStep + 1);
    g.lines = own.filter(isLineStep);
    g.hasAction = own.some(isActionStep);
    g.caption = null;
    if (g.insertId) {
      const capStep = steps.slice(0, (g.cutAt ?? g.toStep) + 1).reverse().find((s) => s.caption?.on === g.insertId && s.caption?.text);
      g.caption = capStep?.caption?.text || null;
    }
    if (g.insertId && SCREEN_INSERT_KINDS.has(g.insertKind) && registry?.props?.[g.insertId]?.insert_prop
      && g.lines.length && g.lines.every((l) => l.do === 'phone_bubble') && liveCall && !g.caption) {
      const on = ctx.callFocus && ctx.callFocus !== g.insertId ? [ctx.callFocus] : (g.cut.on || []).filter((id) => id !== g.insertId);
      g.voiceCall = { from: g.insertId };
      g.cutOn = on; // framing override; g.cut stays the authored step (ownership)
      g.insertId = null;
      g.insertKind = null;
    }
  }
  return segs.length ? segs : [{ fromStep: 0, toStep: steps.length - 1, cut: null, insertId: null, insertKind: null, lines: steps.filter(isLineStep), hasAction: steps.some(isActionStep), caption: null }];
}

/** Hold plan for a sub-shot (pure; the shell applies it). */
export function holdPlan(sub, R = SUBSHOT_RULES) {
  if (sub?.insertId && !(sub.lines?.length)) {
    const chars = String(sub.caption || '').length;
    return { kind: 'silent_insert', skipLockMs: R.INSERT_SKIP_LOCK_MS, autoAdvanceMs: Math.max(R.INSERT_MIN_MS, R.INSERT_BASE_MS + R.READ_MS_PER_CHAR * chars), bubbleDelayMs: 0 };
  }
  if (sub?.insertId) return { kind: 'line_insert', skipLockMs: 0, autoAdvanceMs: null, bubbleDelayMs: 0 };
  return { kind: 'shot', skipLockMs: 0, autoAdvanceMs: null, bubbleDelayMs: sub?.cut && sub?.hasAction && sub?.lines?.length ? R.ACTION_LEAD_MS : 0 };
}

/** Which compiled shot shows (beatId, stepIndex)? Falls back to the beat's own shot. */
export function shotForStep(shots, beatId, stepIndex) {
  const subs = shots.filter((s) => s.subshot?.beat === beatId);
  if (!subs.length || stepIndex == null) return null;
  return subs.find((s) => stepIndex >= s.subshot.fromStep && stepIndex <= s.subshot.toStep) || null;
}

/**
 * Hold controller (pure, clock injected). enter(shot, now) when a sub-shot comes on screen.
 * tap(now): 'blocked' (silent insert, < skip lock), 'skip' (silent insert: leave the sub-shot), 'pass' (normal tap).
 * autoAdvanceAt: ms timestamp when a silent insert leaves by itself (null otherwise).
 * bubbleVisible(now): false during the action lead of a close with an authored action.
 */
export function createHoldController() {
  let cur = null;
  let enteredAt = 0;
  return {
    enter(shot, now) {
      if (cur?.id === shot?.id) return this.state();
      cur = shot || null;
      enteredAt = now;
      return this.state();
    },
    state() {
      const h = cur?.subshot?.hold || null;
      return {
        id: cur?.id ?? null,
        kind: h?.kind ?? 'shot',
        autoAdvanceAt: h?.autoAdvanceMs != null ? enteredAt + h.autoAdvanceMs : null,
        lockUntil: enteredAt + (h?.skipLockMs || 0),
        bubbleAt: enteredAt + (h?.bubbleDelayMs || 0)
      };
    },
    tap(now) {
      const st = this.state();
      if (st.kind !== 'silent_insert') return 'pass';
      return now < st.lockUntil ? 'blocked' : 'skip';
    },
    due(now) { const st = this.state(); return st.autoAdvanceAt != null && now >= st.autoAdvanceAt; },
    bubbleVisible(now) { return now >= this.state().bubbleAt; }
  };
}

/**
 * Bubble style by visibility in the current sub-shot framing (generic): solid when the speaker's head is inside the
 * visible scene rect and not under an insert; dashed (off-screen voice) otherwise. An insert sub-shot (own shot,
 * backdrop dimmed) always hides the speaker. rects: {x,y,w,h} in stage px; head null = speaker not placed.
 */
export function speakerHidden({ head, frame, insertRect = null, insertShot = false, inset = 4 }) {
  if (insertShot) return true;
  if (!head) return true;
  const inX = head.x + head.w > frame.x + inset && head.x < frame.x + frame.w - inset;
  const inY = head.y + head.h > frame.y + inset && head.y < frame.y + frame.h - inset;
  if (!inX || !inY) return true;
  if (!insertRect) return false;
  return head.x < insertRect.x + insertRect.w && head.x + head.w > insertRect.x && head.y < insertRect.y + insertRect.h && head.y + head.h > insertRect.y;
}
export const bubbleStyleFor = (o) => (speakerHidden(o) ? 'dashed' : 'solid');

/** Content warning: an insert sub-shot carrying more than 1 spoken line (W-INSERT-LINES), per beat. */
export function insertLineWarnings(episode, registry) {
  const out = [];
  for (const sc of episode.scenes || []) for (const b of sc.beats || []) {
    for (const g of splitBeat(b, registry)) {
      const spoken = g.lines.filter(isSpokenStep).length; // phone_bubbles carried by a phone insert are the exception
      if (g.insertId && spoken > 1) out.push({ code: 'W-INSERT-LINES', day: episode.day, beat: b.id, insertId: g.insertId, lines: spoken, steps: [g.fromStep, g.toStep] });
    }
  }
  return out;
}

// Aim of a medium/close cut: each `on` id resolved to a stage point (feet/anchor, stage px) plus the box id the player
// can match after band packing ('cat' or an actor id). Ids: actor -> its mark; 'cat' -> cat mark; prop -> its mark;
// a bare mark -> that mark plus whoever stands on it. Unresolvable ids are skipped (generic, no per-beat ids).
/** Cat display names (registry characters of kind 'cat', by id) as whole-word, case-insensitive regexes. */
export function catNameRes(registry) {
  return Object.entries(registry?.characters || {}).filter(([, c]) => c?.kind === 'cat').flatMap(([id, c]) => [id, ...(c.fr_aliases || [])].map((n) => [n, c.fr_alias_not_after || []])).map(([n, na]) => new RegExp(`${na.length ? `(?<!(?:^|[^\\p{L}])(?:${na.join('|')}))` : ''}(^|[^\\p{L}])${n}($|[^\\p{L}])`, 'iu')); // fix20: + fr_aliases
}
/** fix18: steps of a sub-shot name the cat (a line's fr) or make it act (cat_action), and the cat is on stage. */
export function catFramedInSegment(steps, registry, world) {
  if (!world?.cat?.action || catHidden(world)) return false;
  const res = catNameRes(registry);
  return steps.some((st) => st.do === 'cat_action' || ((st.do === 'say' || st.do === 'phone_bubble' || st.do === 'narrator') && res.some((r) => r.test(st.fr || ''))));
}

function p_at(world, registry, pid) { return world?.props?.[pid]?.at || registry?.props?.[pid]?.default_mark; }

export function aimTargets(on, world, registry, setId) {
  const marks = registry?.marks?.[setId]?.marks || [];
  const mk = (id) => marks.find((m) => m.id === id) || null;
  const out = [];
  const add = (box, markId) => { const m = mk(markId); if (m) out.push({ box, x: m.x, y: m.y }); };
  // fix18: the cat aims where it is DRAWN (stage overlay placement) with its sprite rect, so the crop contains it whole
  const addCat = () => {
    if (catHidden(world)) return; // fix19: never aim at a hidden cat
    const pl = world.cat.action ? buildSitcomStageOverlay(world, registry || {}).catPlacement : null;
    if (!pl) return add('cat', world.cat.at);
    const fp = (pl.inBox || /^in_box/.test(world.cat.action || '')) ? (registry?.props?.box_cat?.footprint || { w: 18, h: 12, ax: 9, ay: 11 }) : CAT_SIT_FP;
    out.push({ box: 'cat', x: pl.x, y: pl.y, ...(pl.inBox ? { inBox: true } : {}), rect: { x: pl.x - fp.ax, y: pl.y - fp.ay, w: fp.w, h: fp.h } });
  };
  for (const id of on || []) {
    if (world?.actors?.[id]) add(id, world.actors[id].at);
    // fix20: a story cut names the cat by its character id (cut_to croissant): same target as 'cat'
    else if ((id === 'cat' || normalizeWho(id) === 'cat') && world?.cat) addCat();
    else if (world?.props?.[id]) {
      const markId = world.props[id].at || registry?.props?.[id]?.default_mark;
      const def = registry?.props?.[id];
      const spot = resolvePropSpot(registry, setId, id, markId, world); // fix19: the drawn (slid-beside) spot
      const m = spot && Number.isFinite(spot.x) ? spot : (propMarkCoords(registry, setId, id, markId, world) || mk(markId));
      if (m) {
        // fix22 E (generic): a non-floor prop with no footprint aims with its sprite box (registry aim_box w/h/ax/ay) so a
        // named prop is framed WHOLE (d1 b_payoff « La plante ! »: the pot was cut at the frame edge)
        const fp = def?.footprint || def?.aim_box;
        const t = { box: null, prop: id, x: m.x, y: m.y };
        if (fp && Number.isFinite(fp.w)) t.rect = { x: m.x - (fp.ax ?? fp.w / 2), y: m.y - (fp.ay ?? fp.h), w: fp.w, h: fp.h };
        // fix18: a prop's registry close_frame (sole_frac / max / top margin) also rules a PRESET close aimed at it
        const cf = def?.close_frame;
        if (cf && t.rect) t.closeFrame = { sole_frac: cf.sole_frac, max_sole_frac: cf.max_sole_frac ?? cf.sole_frac, top_margin_px: cf.top_margin_px ?? 4 };
        out.push(t);
      }
    }
    else if (mk(id)) {
      const who = Object.entries(world?.actors || {}).filter(([, a]) => a.at === id).map(([k]) => k);
      if (world?.cat?.at === id && !catHidden(world)) who.push('cat'); // fix19: a hidden cat is not "on" the mark
      who.forEach((w) => (w === 'cat' ? addCat() : add(w, id)));
      // props standing on that mark aim where they are DRAWN: their resolved set spot (props[].spots), via the prop
      // branch above, not the raw mark (d3 b_action close on floor aimed only 96,136 while box_cat drew at 112,141)
      const here = Object.entries(world?.props || {}).filter(([pid, p]) => p && p.visible !== false
        && (p.at || registry?.props?.[pid]?.default_mark) === id)
        // fix19: a prop slid BESIDE furniture (registry.resolvePropSpot) no longer stands on the mark: the close on the
        // mark frames the mark itself (d3 floor close = the empty floor under the table; box_cat only at the frame edge)
        .filter(([pid]) => !resolvePropSpot(registry, setId, pid, p_at(world, registry, pid), world)?.besideFurniture)
        .map(([pid]) => pid);
      const before = out.length;
      if (here.length) out.push(...aimTargets(here, world, registry, setId));
      if (!who.length && out.length === before) add(null, id);
    }
  }
  return out;
}

// Registry close framing (generic): a `close` cut whose `on` includes a prop with `close_frame` in props.json gets its
// authored crop's viewY re-aimed so the prop's sole (footprint bottom row) lands at `sole_frac` of the scene band, and the
// footprint top (highest pop frame of anything drawn inside it) stays >= `top_margin_px` below the band top; if that cannot
// hold at sole_frac, the sole may go down to `max_sole_frac`. Scene band = screen rows CLOSE_FRAME_BAND.top..top+h-1.
export const CLOSE_FRAME_BAND = { top: 127, h: 464, w: 390 };
export function closeFrameCrop(crop, on, world, registry, setId) {
  if (!crop || ![crop.k, crop.viewX, crop.viewY].every(Number.isFinite)) return { crop, note: null };
  for (const id of on || []) {
    const cf = registry?.props?.[id]?.close_frame;
    if (!cf) continue;
    const t = aimTargets([id], world, registry, setId).find((a) => a.rect);
    if (!t) continue;
    const { top, h } = CLOSE_FRAME_BAND; const k = crop.k;
    const soleRow = t.rect.y + t.rect.h - 1;
    const soleScreen = (vy) => top + (soleRow - vy) * k + (k - 1);
    const frac = (vy) => (soleScreen(vy) - top) / h;
    const topOk = (vy) => top + (t.rect.y - vy) * k >= top + (cf.top_margin_px ?? 4);
    const ideal = soleRow - ((cf.sole_frac * h) - (k - 1)) / k;
    let vy = [Math.floor(ideal), Math.ceil(ideal)].sort((a, b) => Math.abs(frac(a) - cf.sole_frac) - Math.abs(frac(b) - cf.sole_frac))[0];
    let note = null;
    while (!topOk(vy) && frac(vy - 1) <= (cf.max_sole_frac ?? cf.sole_frac)) { vy -= 1; note = 'sole lowered for top margin'; }
    // x: the close CONTAINS its prop (authored viewX framed an older mark): shift viewX minimally so the rect plus the
    // top margin (in scene px) sits inside the band width; an already-containing viewX is kept as authored.
    const viewW = Math.floor((CLOSE_FRAME_BAND.w) / k); const mx = Math.ceil((cf.top_margin_px ?? 4) / k);
    let vx = crop.viewX;
    if (t.rect.x + t.rect.w + mx > vx + viewW) vx = t.rect.x + t.rect.w + mx - viewW;
    if (t.rect.x - mx < vx) vx = t.rect.x - mx;
    if (vx !== crop.viewX) note = [note, `viewX ${crop.viewX}->${vx} to contain ${id}`].filter(Boolean).join('; ');
    return { crop: { ...crop, viewX: vx, viewY: vy }, note, prop: id, soleFrac: frac(vy), topOk: topOk(vy) };
  }
  return { crop, note: null };
}
