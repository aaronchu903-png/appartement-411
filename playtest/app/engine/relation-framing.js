// fix23 (Le Réalisateur 2026-10-28 21:05 MT, generic): SPATIAL-RELATION framing.
// A line that teaches a spatial relation -- it names an on-stage prop plus a preposition (sur / sous / dans / devant /
// derrière / à côté de / entre) relative to another named stage object (the reference, registry props[ref].relation_ref.fr)
// -- frames the RELATION first: the reference object (furniture: its whole footprint down to the floor line, i.e. the
// space under it too) and every related prop fully in frame with >= RELATION_MARGIN_CSS screen px margins. Then the
// speaker: kept at the frame edge only if their whole body columns + head fit too; otherwise the line plays as an
// off-screen dashed bubble (speakerHidden). Consecutive relation lines on the SAME reference share ONE camera
// (one medium-wide sub-shot); the next non-relation line cuts back to the authored framing.
import { aimTargets } from './subshots.js';
import { PLACED_PREPS, relationHolds } from './relation-place.js';
export { RELATION_LEG_CLEAR, PLACED_PREPS, relationHolds, relationPlace } from './relation-place.js';

export const RELATION_PREPS = Object.freeze(['à côté des', 'à côté du', 'à côté de', 'derrière', 'devant', 'dans', 'sous', 'sur', 'entre']);
export const RELATION_MARGIN_CSS = 4; // screen (css) px, as the per-line probe measures
export const RELATION_FLOOR_Y = 136; // stage floor line (CFG.room.floorTop default)
export const RELATION_VIEW = Object.freeze({ w: 390, h: 464 }); // portrait scene band (CLOSE_FRAME_BAND)
const DET = "(?:le|la|les|l'|l’|du|des|un|une|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|ce|cet|cette|ces)";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s || '').toLowerCase().replace(/[\u202f\u00a0]/g, ' ');
const named = (txt, al) => new RegExp(`(^|[^\\p{L}])${esc(al.toLowerCase())}($|[^\\p{L}])`, 'u').test(txt);

/** { ref, prep, props } when `text` teaches a spatial relation between on-stage objects, else null. */
export function detectRelation(text, stageIds, registry) {
  const txt = norm(text); const P = registry?.props || {}; const ids = [...new Set(stageIds || [])];
  for (const ref of ids) {
    const names = P[ref]?.relation_ref?.fr || [];
    for (const nm of names) for (const prep of RELATION_PREPS) {
      const re = new RegExp(`(^|[^\\p{L}])${esc(prep)}\\s+(?:${DET}\\s*)?${esc(nm.toLowerCase())}($|[^\\p{L}])`, 'u');
      // the relation holds inside ONE sentence: the prop must be named in the sentence that carries « prep + ref »
      const sent = txt.split(/[.!?]+/).find((x) => re.test(x));
      if (!sent) continue;
      const props = ids.filter((id) => id !== ref && (P[id]?.fr_aliases || []).some((al) => named(sent, al)));
      if (props.length) return { ref, prep, props };
    }
  }
  return null;
}

/** Stage rect of a relation object: furniture footprint down to the floor (space under it included), else its aim rect. */
export function relationRect(id, world, registry, setId) {
  const f = (registry?.marks?.[setId]?.furniture || []).find((x) => x.id === id);
  if (f) { const y1 = Math.max(f.bottom, RELATION_FLOOR_Y); return { x: f.x0, y: f.top, w: f.x1 - f.x0 + 1, h: y1 - f.top + 1 }; }
  return aimTargets([id], world, registry, setId).find((t) => t.rect)?.rect || null;
}

export const unionRects = (rs) => { const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  return { x: x0, y: y0, w: Math.max(...rs.map((r) => r.x + r.w)) - x0, h: Math.max(...rs.map((r) => r.y + r.h)) - y0 }; };

/** Speaker body (opaque columns of the 16-px sprite + head) at its mark: the part that must be in for "head fully in". */
export const speakerRect = (a) => (a && Number.isFinite(a.x) ? { x: a.x - 5, y: a.y - 40, w: 10, h: 41 } : null);

/** Largest zoom k whose VISIBLE view (floor(band/k)) holds `rect` + margins inside the art; viewX/viewY placed. */
export function relationCamera(rect, art, kMax = 12, V = RELATION_VIEW, margin = RELATION_MARGIN_CSS) {
  for (let k = kMax; k >= 1; k -= 1) {
    const vw = Math.floor(V.w / k), vh = Math.floor(V.h / k); const m = Math.ceil(margin / k);
    if (Math.ceil(V.w / k) > art.w || Math.ceil(V.h / k) > art.h) return null; // view wider than the set: no camera
    if (rect.w + 2 * m > vw || rect.h + 2 * m > vh) continue;
    let viewX = Math.round(rect.x + rect.w / 2 - vw / 2); viewX = Math.max(0, Math.min(art.w - Math.ceil(V.w / k), viewX));
    viewX = Math.min(viewX, rect.x - m); viewX = Math.max(viewX, rect.x + rect.w + m - vw);
    let viewY = Math.round(rect.y + rect.h - 0.7 * vh); viewY = Math.max(0, Math.min(art.h - Math.ceil(V.h / k), viewY)); // feet-at-70 % rule
    viewY = Math.min(viewY, rect.y - m); viewY = Math.max(viewY, rect.y + rect.h + m - vh);
    return { k, viewX, viewY, vw, vh, m };
  }
  return null;
}

/**
 * Relation groups of a beat: consecutive relation lines on the same reference share one camera.
 * worldAt(stepIndex) -> world; art {w,h}. Returns [{ beat, steps, ref, preps, props, refRect, propRects, rect, speaker, speakerIn, k, viewX, viewY }].
 */
export function relationGroups(beat, registry, setId, worldAt, art, stageIdsAt) {
  const steps = beat.steps || []; const out = []; let cur = null;
  steps.forEach((st, i) => {
    if (!(st.do === 'say' || st.do === 'narrate' || st.do === 'line')) return;
    const w = worldAt(i); const ids = stageIdsAt ? stageIdsAt(w) : [...(registry?.marks?.[w?.set || setId]?.furniture || []).map((f) => f.id), ...Object.entries(w?.props || {}).filter(([, p]) => p && p.visible !== false).map(([k]) => k)];
    const r = detectRelation(st.fr, ids, registry);
    if (r && cur && cur.ref === r.ref) { cur.steps.push(i); cur.preps.push(r.prep); r.props.forEach((p) => !cur.props.includes(p) && cur.props.push(p)); if (cur.speaker !== st.who) cur.speaker = null; return; }
    if (cur) out.push(cur);
    cur = r ? { beat: beat.id, steps: [i], ref: r.ref, preps: [r.prep], props: [...r.props], speaker: st.who || null } : null;
  });
  if (cur) out.push(cur);
  const res = [];
  for (const g of out) {
    const w = worldAt(g.steps[g.steps.length - 1]); const sid = w?.set || setId;
    const refRect = relationRect(g.ref, w, registry, sid);
    if (!refRect) continue;
    // several stage props can share the spoken name (« colis »): the related ones are those placed in relation to the
    // reference (within one reference-width of it); a same-name prop elsewhere on the set is not part of the relation
    const near = (r) => r && r.x + r.w >= refRect.x - refRect.w && r.x <= refRect.x + 2 * refRect.w;
    const all = g.props.map((p) => [p, relationRect(p, w, registry, sid)]);
    const kept = all.filter(([, r]) => near(r)); g.props = (kept.length ? kept : all).map(([p]) => p);
    const propRects = Object.fromEntries(kept.length ? kept : all);
    if (Object.values(propRects).some((r) => !r)) continue; // unmeasurable: no relation camera
    const rect = unionRects([refRect, ...Object.values(propRects)]);
    // fix23d (generic): an actor known only by its mark (no x/y yet) stands at that mark's coordinates
    const a0 = g.speaker ? w?.actors?.[g.speaker] : null; const mk0 = a0 && !Number.isFinite(a0.x) ? (registry?.marks?.[sid]?.marks || []).find((m) => m.id === a0.at) : null;
    const sr = a0 ? speakerRect(mk0 ? { ...a0, x: mk0.x, y: mk0.y } : a0) : null;
    // relation-first (fix23d ruling): the relation keeps its own k; the speaker joins only if she fits at that k
    const relCam = relationCamera(rect, art);
    const sp = sr && relCam ? relationCamera(unionRects([rect, sr]), art, relCam.k) : null;
    const withSp = sp && sp.k === relCam.k ? sp : null;
    const cam = withSp || relCam;
    if (!cam) continue;
    res.push({ ...g, refRect, propRects, rect, speakerIn: !!withSp, k: cam.k, viewX: cam.viewX, viewY: cam.viewY, viewW: cam.vw, viewH: cam.vh });
  }
  return res;
}

// fix23b (JINYI review 21:39 MT, generic): a line that puts a named prop sur / sous / dans / devant / derrière a
// reference object STAGES it so: the prop's drawn rect satisfies the preposition geometrically. The subject of a
// relation line is, among the props it names, the one shown last before the line in its beat (« Et mon colis… sous la
// table » after « prop parcel_closed_floor show ») -- a same-name prop placed earlier keeps its own line.
// `sous` overrides the fix19 floor_props_beside rule ONLY for a prop a line places under that object.

/** [{ step, showStep, prop, prep, ref }] for each relation line of `beat`; stageIdsAt(i) -> ids on stage at step i. */
export function lineRelations(beat, registry, stageIdsAt) {
  const steps = beat?.steps || []; const out = []; const shown = {};
  steps.forEach((st, i) => {
    if (st?.do === 'prop' && (st.action === 'show' || st.action === 'swap')) shown[st.instance ?? st.id] = i;
    if (!(st?.do === 'say' || st?.do === 'narrate' || st?.do === 'line')) return;
    const ids = stageIdsAt ? stageIdsAt(i) : [...Object.keys(registry?.props || {}).filter((k) => registry.props[k]?.relation_ref), ...Object.keys(shown)];
    const r = detectRelation(st.fr, ids, registry); if (!r || !PLACED_PREPS.includes(r.prep)) return;
    const inBeat = r.props.filter((p) => shown[p] != null);
    const subj = inBeat.length ? inBeat.sort((a, b) => shown[b] - shown[a])[0] : (r.props.length === 1 ? r.props[0] : null);
    if (subj) out.push({ step: i, showStep: shown[subj] ?? -1, prop: subj, prep: r.prep, ref: r.ref });
  });
  return out;
}


// fix23b item 4 (JINYI review 21:39 MT, generic): a preset `close` cut frames its SUBJECT, not a fixed k11 spot.
// Subject: the drawn `on` props (held_only props are not drawn on stage -> the nearest drawn prop within 24 px of
// their spot stands in); a bare surface mark on a furniture piece -> that furniture (top..floor) plus what stands on it;
// a floor mark inside a furniture's x span -> the space under it, leg to leg, down to the floor line.
// Camera: the largest k <= CLOSE_SUBJECT_K_MAX that holds the subject + margins (relationCamera), floor line in frame.
export const CLOSE_SUBJECT_K_MAX = 11;
export const CLOSE_SUBJECT_MIN_FILL = 0.5;
export function closeSubjectRect(on, world, registry, setId) {
  const S = registry?.marks?.[setId] || {}; const marks = S.marks || []; const furn = S.furniture || [];
  const P = registry?.props || {}; const rects = []; const used = [];
  const drawn = (pid) => !P[pid]?.held_only;
  for (const id of on || []) {
    const mk = marks.find((m) => m.id === id);
    if (world?.props?.[id] || (P[id] && !mk)) {
      if (drawn(id)) { const t = aimTargets([id], world, registry, setId).find((a) => a.rect); if (t) { rects.push(t.rect); used.push(id); } continue; }
      const spot = aimTargets([id], world, registry, setId)[0]; if (!spot) continue;
      const near = Object.entries(world?.props || {}).filter(([pid, p]) => pid !== id && p && p.visible !== false && drawn(pid))
        .map(([pid]) => [pid, aimTargets([pid], world, registry, setId).find((a) => a.rect)?.rect]).filter(([, r]) => r)
        .map(([pid, r]) => [pid, r, Math.max(0, r.x - spot.x, spot.x - (r.x + r.w))]).filter(([, , d]) => d <= 24).sort((a, b) => a[2] - b[2]);
      if (near.length) { rects.push(near[0][1]); used.push(near[0][0]); }
      continue;
    }
    if (!mk) continue;
    const f = furn.find((q) => mk.x >= q.x0 && mk.x <= q.x1);
    if (!f) continue;
    if (mk.y <= f.top + 2) {
      rects.push(relationRect(f.id, world, registry, setId)); used.push(f.id);
      for (const [pid, p] of Object.entries(world?.props || {})) {
        if (!p || p.visible === false || !drawn(pid)) continue;
        const r = aimTargets([pid], world, registry, setId).find((a) => a.rect)?.rect; if (!r) continue;
        // what stands on that furniture top (its mark, or any prop resting on the surface: relationHolds 'sur')
        if ((p.at || P[pid]?.default_mark) === id || relationHolds('sur', { x0: r.x, x1: r.x + r.w - 1, y0: r.y, y1: r.y + r.h - 1 }, f)) { rects.push(r); used.push(pid); }
      }
    } else {
      const u = f.under || { x0: f.x0, x1: f.x1, top: f.bottom, floor: f.bottom };
      rects.push({ x: u.x0, y: u.top, w: u.x1 - u.x0 + 1, h: Math.max(u.floor, RELATION_FLOOR_Y) - u.top + 1 }); used.push(`${f.id}:under`);
    }
  }
  return rects.length ? { rect: unionRects(rects), subjects: used } : null;
}
export const CLOSE_SUBJECT_BLANK_MAX = 0.4; // fix23b item 4: <= 40 % of the view height is bare wall above the subject
export const CLOSE_SUBJECT_K_HARD = 14; // the blank-wall rule may zoom past CLOSE_SUBJECT_K_MAX up to here (bbox still fully in)
/** Fraction of the view height that is bare wall: rows above the subject and above every furniture piece in the view. */
export function closeBlankWall(rect, view, registry, setId) {
  const furn = registry?.marks?.[setId]?.furniture || [];
  const tops = [rect.y, ...furn.filter((f) => f.x1 >= view.x && f.x0 < view.x + view.w).map((f) => f.top)];
  return Math.max(0, Math.min(...tops) - view.y) / view.h;
}
export function closeSubjectCamera(on, world, registry, setId, art) {
  const s = closeSubjectRect(on, world, registry, setId); if (!s) return null;
  // floor line in frame: the subject rect reaches at least the floor line row
  const r = { ...s.rect }; if (r.y + r.h - 1 < RELATION_FLOOR_Y) r.h = RELATION_FLOOR_Y - r.y + 1;
  let cam = relationCamera(r, art, CLOSE_SUBJECT_K_MAX); if (!cam) return null;
  const blank = (c) => closeBlankWall(s.rect, { x: c.viewX, y: c.viewY, w: c.vw, h: c.vh }, registry, setId);
  for (let k = cam.k + 1; blank(cam) > CLOSE_SUBJECT_BLANK_MAX && k <= CLOSE_SUBJECT_K_HARD; k += 1) { const c = relationCamera(r, art, k); if (!c || c.k !== k) break; cam = c; }
  const fill = s.rect.w / cam.vw;
  return { k: cam.k, viewX: cam.viewX, viewY: cam.viewY, subjectClose: { rect: s.rect, subjects: s.subjects, fill: +fill.toFixed(3), blankWall: +blank(cam).toFixed(3), viewW: cam.vw, viewH: cam.vh } };
}
