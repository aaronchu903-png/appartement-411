// Set sprite packs: ONE table says which canonical set packs each day range loads (data-driven; the player has no pack literals).
// Order matters only for reporting; an id present in two loaded packs must have pixel-identical frames (checked in dev/test).
export const SET_PACKS = Object.freeze([
  { dir: 'days_01_03', days: [1, 17] },
  { dir: 'days_04_10', days: [1, 17] },
  { dir: 'sitcom_d11_17', days: [5, 17] } // d11 pack; d5-d10 also use its Rev 4/5 props (key_door, paw_print, teapot, pot_chez_nous_newleaf)
]);

/** Pack dirs for an episode day (unknown day: every pack whose range starts at day 1). */
export function packsForDay(day, table = SET_PACKS) {
  const d = Number.isFinite(day) ? day : 1;
  return table.filter((p) => d >= p.days[0] && d <= p.days[1]).map((p) => p.dir);
}

/**
 * Merge loaded set manifests [{dir, base, manifest}] into one asset/atlas table.
 * Returns { atlases, assets, atlasRoot: {atlasId: base}, dups: [{id, packs:[dirA, dirB]}] }.
 * Duplicate atlas ids across packs are an error (they would point at different sheets).
 */
export function mergeSetPacks(loaded) {
  const atlases = {}; const assets = {}; const atlasRoot = {}; const owner = {}; const dups = [];
  for (const { dir, base, manifest } of loaded) {
    for (const [id, a] of Object.entries(manifest.atlases || {})) {
      if (atlasRoot[id] && atlasRoot[id] !== base) throw new Error(`atlas id ${id} defined by two packs`);
      atlases[id] = a; atlasRoot[id] = base;
    }
    for (const [id, e] of Object.entries(manifest.assets || {})) {
      if (owner[id]) { dups.push({ id, packs: [owner[id], dir], first: assets[id], second: e }); continue; } // first pack wins
      assets[id] = e; owner[id] = dir;
    }
  }
  return { atlases, assets, atlasRoot, owner, dups };
}

/** Registry id -> manifest logical id, by prefix (no per-id aliases): exact, then prop.<id>, then prop.<id>.any. */
export function resolveRegistryAsset(id, assets) {
  for (const cand of [id, `prop.${id}`, `prop.${id}.any`, `handprop.${id}.any`]) if (assets[cand]) return cand;
  return null;
}

/** Pixel equality of two RGBA frames ({w,h,data}); used by the duplicate rule. */
export function framesIdentical(a, b) {
  if (!a || !b || a.w !== b.w || a.h !== b.h || a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false;
  return true;
}
