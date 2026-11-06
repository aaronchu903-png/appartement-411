#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { mergeKitchen } = require('./merge-kitchen.cjs');
const { mergeRooftop } = require('./merge-rooftop.cjs');
const { mergeStairwell } = require('./merge-stairwell.cjs');
const { convertCanonical } = require('./convert-canonical.cjs');

const packDir = path.resolve(__dirname);
const srcRoot = process.argv[2] ? path.resolve(process.argv[2]) : '/tmp/r1_unpack';
const manifestPath = path.join(packDir, 'manifest.json');
let pack = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const CHAR_ATLASES = new Set(['noe', 'camille', 'martin', 'lefevre', 'croissant']);

pack = mergeKitchen(pack, packDir, path.join(srcRoot, 'kitchen'));
pack = mergeRooftop(pack, packDir, path.join(srcRoot, 'rooftop'));
pack = mergeStairwell(pack, packDir, path.join(srcRoot, 'stairwell'));

for (const id of Object.keys(pack.assets)) {
  const a = pack.assets[id];
  if (a?.atlas && CHAR_ATLASES.has(a.atlas)) delete pack.assets[id];
  if (a?.type === 'sequence' && CHAR_ATLASES.has(id.split('.')[0])) delete pack.assets[id];
}
for (const id of CHAR_ATLASES) delete pack.atlases[id];

const charPack = convertCanonical(path.join(srcRoot, 'canonical'), packDir);
pack.canonicalAssetCount = charPack.canonicalAssetCount;
pack.characters = charPack.characters;
for (const [id, a] of Object.entries(charPack.assets)) pack.assets[id] = a;
for (const [id, a] of Object.entries(charPack.atlases)) pack.atlases[id] = a;
pack.aliases = { ...pack.aliases, ...charPack.aliases };

fs.writeFileSync(manifestPath, JSON.stringify(pack, null, 2) + '\n');

for (const sub of ['kitchen', 'rooftop', 'stairwell', 'canonical']) {
  const check = path.join(srcRoot, sub, 'check_manifest.py');
  console.log(execSync(`python3 "${check}"`, { cwd: path.join(srcRoot, sub), encoding: 'utf8' }).trim());
}
console.log(`Pack B total assets: ${Object.keys(pack.assets).length}, canonical: ${pack.canonicalAssetCount}`);
