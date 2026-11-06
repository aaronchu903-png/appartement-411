// fix23b: pure relation geometry (no imports; used by registry.propMarkCoords and relation-framing)
export const RELATION_LEG_CLEAR = 4; // art px clear of the reference's legs (furniture.under span)
export const PLACED_PREPS = Object.freeze(['sur', 'sous', 'dans', 'devant', 'derrière']);

const fpOf = (registry, id) => registry?.props?.[id]?.footprint || registry?.props?.[id]?.aim_box || null;
const furnOf = (registry, setId, ref) => (registry?.marks?.[setId]?.furniture || []).find((f) => f.id === ref) || null;

/** Does a prop rect {x0,x1,y0,y1} (art px, inclusive) satisfy `prep` relative to furniture `f`? */
export function relationHolds(prep, r, f) {
  if (!r || !f) return null;
  const cx = (r.x0 + r.x1) / 2; const inSpan = cx >= f.x0 && cx <= f.x1;
  const u = f.under || null;
  switch (prep) {
    case 'sur': return inSpan && r.y1 <= f.top + 3; // resting on the top surface
    case 'sous': return !!u && r.x0 >= u.x0 + RELATION_LEG_CLEAR && r.x1 <= u.x1 - RELATION_LEG_CLEAR && r.y0 >= u.top && r.y1 >= u.floor; // between the legs, under the top, on the floor
    case 'devant': return inSpan && r.y1 > f.bottom; // downstage of its base
    case 'derrière': return inSpan && r.y1 < f.bottom && r.y1 > f.top; // upstage of its base, behind it
    case 'dans': return cx >= f.x0 && cx <= f.x1 && r.y0 >= f.top && r.y1 <= f.bottom;
    default: return null;
  }
}

/** Stage position {x,y} (anchor) placing `propId` `prep` furniture `ref`, or null when the set cannot (no geometry / no room). */
export function relationPlace(registry, setId, propId, rel) {
  const fp = fpOf(registry, propId); const f = furnOf(registry, setId, rel?.ref);
  if (!fp || !f) return null;
  const rect = (x, y) => ({ x0: x - fp.ax, x1: x - fp.ax + fp.w - 1, y0: y - fp.ay, y1: y - fp.ay + fp.h - 1 });
  let x, y;
  if (rel.prep === 'sous') {
    const u = f.under; if (!u) return null;
    if (fp.w + 2 * RELATION_LEG_CLEAR > u.x1 - u.x0 + 1) return null;
    x = Math.round((u.x0 + u.x1 + 1) / 2 - fp.w / 2) + fp.ax;
    y = Math.max(u.top + fp.ay, u.floor - (fp.h - 1 - fp.ay)) + 1;
  } else if (rel.prep === 'sur') { x = Math.round((f.x0 + f.x1 + 1) / 2 - fp.w / 2) + fp.ax; y = f.top + 1 - (fp.h - 1 - fp.ay); }
  else if (rel.prep === 'devant') { x = Math.round((f.x0 + f.x1 + 1) / 2 - fp.w / 2) + fp.ax; y = f.bottom + 2 + fp.ay + (fp.h - 1 - fp.ay); }
  else return null; // dans / derrière: checked, not re-staged (authored marks)
  return relationHolds(rel.prep, rect(x, y), f) ? { x, y, relation: rel.prep, ref: rel.ref } : null;
}

/** relationHolds for a prop anchored at {x,y} (footprint rect); null when the prop has no footprint / ref no geometry. */
export function relationHoldsAt(registry, setId, propId, rel, at) {
  const fp = fpOf(registry, propId); const f = furnOf(registry, setId, rel?.ref);
  if (!fp || !f || !at) return null;
  const x0 = at.x - fp.ax, y0 = at.y - fp.ay;
  return relationHolds(rel.prep, { x0, x1: x0 + fp.w - 1, y0, y1: y0 + fp.h - 1 }, f);
}
