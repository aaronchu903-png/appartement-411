#!/usr/bin/env node
'use strict';
/**
 * Import Pixel Studio kitchen set (style B) into pack b.
 * Usage: node app/tools/import-kitchen-set-b.cjs [path-to-kitchen-dir]
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const srcKitchen = path.resolve(process.argv[2] || '/tmp/kitchen_b2/kitchen');
const destKitchen = path.join(repoRoot, 'app/scenes/packs/b/kitchen');
const manifestPath = path.join(repoRoot, 'app/scenes/packs/b/manifest.json');

const INTERIM_FILES = [
  'cornice.png', 'lamp.png', 'picture.png', 'upper_cabinets.png', 'laptop_small.png',
  'gen-set-pieces.py', 'set-piece-sizes.json', 'kitchen_backdrop.png', 'kitchen_backdrop_tall.png',
  'backwall.png', 'fridge_zone.png'
];

const INTERIM_ASSET_PREFIXES = [
  'prop.cornice', 'prop.lamp', 'prop.picture', 'prop.upper_cabinets', 'prop.laptop.small'
];

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  for (const ent of await fsp.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d);
  }
}

function prefixKitchenFiles(entry) {
  const out = { ...entry };
  if (out.file && !out.file.startsWith('kitchen/')) out.file = `kitchen/${out.file}`;
  return out;
}

async function main() {
  const km = JSON.parse(await fsp.readFile(path.join(srcKitchen, 'manifest.json'), 'utf8'));
  await fsp.mkdir(destKitchen, { recursive: true });
  for (const name of INTERIM_FILES) {
    const p = path.join(destKitchen, name);
    if (fs.existsSync(p)) await fsp.unlink(p);
  }
  for (const sub of ['pieces', 'light']) {
    const d = path.join(destKitchen, sub);
    if (fs.existsSync(d)) await fsp.rm(d, { recursive: true, force: true });
  }
  await copyDir(path.join(srcKitchen, 'pieces'), path.join(destKitchen, 'pieces'));
  await copyDir(path.join(srcKitchen, 'light'), path.join(destKitchen, 'light'));
  for (const sheet of ['kitchen_day_sheet.png', 'kitchen_evening_sheet.png', 'kitchen_night_sheet.png']) {
    await fsp.copyFile(path.join(srcKitchen, sheet), path.join(destKitchen, sheet));
  }
  await fsp.copyFile(path.join(srcKitchen, 'README.md'), path.join(destKitchen, 'README.md'));

  const pack = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const remove = new Set(INTERIM_ASSET_PREFIXES);
  for (const key of Object.keys(pack.assets)) {
    if (key.startsWith('backdrop.kitchen') || key.startsWith('prop.') && key.includes('kitchen')) remove.add(key);
    if (INTERIM_ASSET_PREFIXES.some((p) => key === p || key.startsWith(p + '.'))) remove.add(key);
    if (['prop.table', 'prop.fridge', 'prop.window', 'prop.shelf', 'prop.counter_sink', 'prop.chairs',
      'prop.laptop', 'prop.laptop.closed', 'prop.laptop.open', 'prop.milk', 'prop.stash', 'prop.spoon',
      'prop.pastry', 'backdrop.kitchen'].some((p) => key === p || key.startsWith(p + '.'))) remove.add(key);
  }
  for (const k of remove) delete pack.assets[k];
  for (const id of ['kitchen_day', 'kitchen_evening', 'kitchen_night']) {
    delete pack.atlases[id];
  }

  for (const [id, atlas] of Object.entries(km.atlases || {})) {
    pack.atlases[id] = { ...atlas, file: `kitchen/${atlas.file}` };
  }
  for (const [id, asset] of Object.entries(km.assets || {})) {
    pack.assets[id] = prefixKitchenFiles(asset);
  }

  const baseIds = new Set();
  for (const id of Object.keys(km.assets || {})) {
    const m = id.match(/^(.+)\.(day|evening|night)$/);
    if (m) baseIds.add(m[1]);
  }
  pack.aliases = pack.aliases || {};
  for (const base of baseIds) {
    if (!pack.assets[`${base}.day`]) continue;
    pack.aliases[base] = `${base}.day`;
  }
  pack.aliases['handprop.milk'] = 'handprop.milk.day';
  pack.aliases['handprop.cup'] = 'handprop.cup.day';
  pack.aliases['handprop.plate'] = 'handprop.plate.day';

  pack.kitchenStage = km.stage;
  pack.kitchenLight = {
    evening: 'kitchen/light/golden.json',
    night: 'kitchen/light/soir.json',
    eveningMultiply: 'kitchen/light/evening_multiplier_half.png',
    nightMultiply: 'kitchen/light/night_multiplier_half.png',
    nightAdd: 'kitchen/light/night_add_half.png'
  };

  const sofaProps = ['prop.stash.pen', 'prop.stash.sock', 'prop.spoon.dirty', 'prop.spoon.clean', 'prop.pastry.bag'];
  try {
    const { execSync } = require('node:child_process');
    const oldJson = execSync('git show a18a291:app/scenes/packs/b/manifest.json', { cwd: repoRoot, encoding: 'utf8' });
    const prev = JSON.parse(oldJson);
    for (const k of sofaProps) if (prev.assets[k]) pack.assets[k] = prev.assets[k];
  } catch { /* optional */ }

  await fsp.writeFile(manifestPath, JSON.stringify(pack, null, 2) + '\n');
  console.log('Imported kitchen set into', destKitchen);
  console.log('Assets:', Object.keys(km.assets).length, 'stage layout pieces:', km.stage?.layout?.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
