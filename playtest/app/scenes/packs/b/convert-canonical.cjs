'use strict';

/**
 * Convert style B canonical manifest (v3, 185 assets) → scene-player pack manifest.
 * See canonical/README.md, STYLE_GUIDE.md, HANDPOINT_PROPOSAL.md in the tarball.
 */

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_ASSET_COUNT = 185;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function copyIntoPack(canonicalDir, packDir, relFile) {
  if (!relFile) return relFile;
  const normalized = relFile.replace(/^\.\//, '').replace(/^\//, '');
  const src = path.join(canonicalDir, normalized);
  if (!fs.existsSync(src)) {
    const alt = path.join(canonicalDir, 'sheets', path.basename(normalized));
    if (fs.existsSync(alt)) {
      const dest = path.join(packDir, 'sheets', path.basename(normalized));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(alt, dest);
      return `sheets/${path.basename(normalized)}`;
    }
    return normalized;
  }
  const dest = path.join(packDir, normalized);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (path.resolve(src) !== path.resolve(dest)) fs.copyFileSync(src, dest);
  return normalized;
}

function sheetMap(canonical, canonicalDir, packDir) {
  const raw = canonical.sheets || canonical.atlases || {};
  const out = {};
  for (const [id, s] of Object.entries(raw)) {
    const file = copyIntoPack(canonicalDir, packDir, s.file || s.path || `${id}.png`);
    out[id] = {
      file,
      w: s.width ?? s.w,
      h: s.height ?? s.h
    };
  }
  return out;
}

function normalizeAssets(canonical) {
  const raw = canonical.assets || canonical.frames || [];
  if (Array.isArray(raw)) {
    return raw.map((a) => {
      const id = a.id || a.name;
      if (!id) throw new Error('canonical frame missing id');
      return [id, a];
    });
  }
  return Object.entries(raw);
}

function drawableFromCanonical(id, a) {
  const sheetId = a.sheet || a.atlas;
  const rect = a.frame || a.rect || (a.x != null ? [a.x, a.y, a.w, a.h] : null);
  if (!sheetId || !rect) throw new Error(`asset ${id} needs atlas+frame (or sheet+rect)`);
  const { x, y, w, h } = Array.isArray(rect)
    ? { x: rect[0], y: rect[1], w: rect[2], h: rect[3] }
    : rect;
  const feet = a.feet || (Array.isArray(a.anchor) ? a.anchor : null);
  const entry = {
    source: 'atlas',
    atlas: sheetId,
    frame: { x, y, w, h },
    w,
    h,
    pixelScale: a.pixelScale ?? 1
  };
  const layer = id.match(/\.(face|arm_l|arm_r|overlay)\./)?.[1];
  if (layer) entry.layer = layer;
  if (typeof a.anchor === 'string' && a.anchorPoint) {
    entry.anchor = a.anchor;
    entry.anchorPoint = { ...a.anchorPoint };
  } else if (feet && feet.length >= 2) {
    entry.anchor = 'feet';
    entry.anchorPoint = { x: feet[0], y: feet[1] };
  } else {
    entry.anchor = 'topleft';
    entry.anchorPoint = { x: 0, y: 0 };
  }
  let hp = null;
  if (a.handPoint && typeof a.handPoint.x === 'number') hp = { ...a.handPoint };
  else if (Array.isArray(a.handPoint) && a.handPoint.length >= 2) {
    hp = { x: a.handPoint[0], y: a.handPoint[1] };
  }
  if (hp) entry.handPoint = hp;
  if (a.seatPoint && typeof a.seatPoint.x === 'number') entry.seatPoint = { ...a.seatPoint };
  const kind = a.kind || a.characterKind || (id.startsWith('croissant.') ? 'cat' : 'human');
  if (kind) entry.characterKind = kind;
  return entry;
}

function buildCharacters(canonical, packAssets) {
  const chars = canonical.characters || {};
  const out = {};
  for (const [key, meta] of Object.entries(chars)) {
    const id = key === 'martin' ? 'madame_martin' : key;
    out[id] = { ...meta, kind: meta.kind || (id === 'croissant' ? 'cat' : 'human') };
  }
  const faceDefaults = (id) => {
    const faces = {};
    for (const key of Object.keys(packAssets)) {
      if (!key.startsWith(`${id}.`)) continue;
      if (key.startsWith(`${id}.face.`)) faces[key.slice(`${id}.face.`.length)] = key;
    }
    if (faces.talk_0) faces.talk = faces.talk_0;
    return faces;
  };
  const defaults = ['camille', 'noe', 'croissant', 'madame_martin', 'lefevre'];
  for (const id of defaults) {
    const prefix = id === 'madame_martin' && packAssets['martin.stand'] ? 'martin' : id;
    if (!out[id]) out[id] = { kind: id === 'croissant' ? 'cat' : 'human' };
    const faces = { ...faceDefaults(prefix), ...(out[id].faces || {}) };
    if (Object.keys(faces).length) out[id].faces = faces;
    if (!out[id].idle) {
      for (const guess of [`${prefix}.idle`, `${prefix}.stand`, `${prefix}.sit`, `${prefix}.stand.neutral`, `${prefix}.stand.talk_0`]) {
        if (packAssets[guess]) {
          out[id].idle = guess;
          break;
        }
      }
    }
  }
  return out;
}

function convertCanonical(canonicalDir, packDir = canonicalDir) {
  const canonicalPath = path.join(canonicalDir, 'manifest.json');
  if (!fs.existsSync(canonicalPath)) throw new Error(`Missing ${canonicalPath}`);
  const canonical = readJson(canonicalPath);
  const sheets = sheetMap(canonical, canonicalDir, packDir);
  const assets = {};
  for (const [id, a] of normalizeAssets(canonical)) {
    if (a.type === 'sequence') {
      assets[id] = { type: 'sequence', fps: a.fps, frames: a.frames };
      continue;
    }
    if (a.type === 'backdrop') {
      assets[id] = a;
      continue;
    }
    assets[id] = drawableFromCanonical(id, a);
  }
  const characters = buildCharacters(canonical, assets);
  const pack = {
    version: 2,
    pack: 'b',
    style: 'B',
    canonicalVersion: canonical.version ?? 3,
    canonicalAssetCount: Object.keys(assets).length,
    assetRoot: './',
    atlases: sheets,
    characters,
    aliases: { ...(canonical.aliases || {}) },
    assets
  };
  return pack;
}

function main() {
  const packDir = path.resolve(__dirname);
  const canonicalDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(packDir, 'canonical');
  const outPackDir = process.argv[3] ? path.resolve(process.argv[3]) : packDir;
  const pack = convertCanonical(canonicalDir, outPackDir);
  const count = Object.keys(pack.assets).length;
  if (count !== EXPECTED_ASSET_COUNT) {
    throw new Error(`Canonical conversion produced ${count} assets, expected ${EXPECTED_ASSET_COUNT}`);
  }
  const outPath = path.join(outPackDir, 'manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + '\n');
  console.log(`Wrote ${outPath} (${Object.keys(pack.assets).length} assets)`);
}

if (require.main === module) main();

module.exports = { convertCanonical, drawableFromCanonical, EXPECTED_ASSET_COUNT };
