#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function mergeKitchen(pack, packDir, kitchenSrcDir) {
  const srcRoot = path.resolve(kitchenSrcDir);
  const kitchenDir = path.join(packDir, 'kitchen');
  copyTree(srcRoot, kitchenDir);

  const srcManifest = JSON.parse(fs.readFileSync(path.join(srcRoot, 'manifest.json'), 'utf8'));
  const aliases = { ...pack.aliases };

  for (const [id, atlas] of Object.entries(srcManifest.atlases || {})) {
    pack.atlases[id] = { ...atlas, file: `kitchen/${atlas.file}` };
  }

  const removePrefix = /^(prop|backdrop|handprop)\./;
  for (const id of Object.keys(pack.assets)) {
    if (removePrefix.test(id) && (pack.assets[id].atlas?.startsWith('kitchen_') || String(pack.assets[id].file || '').startsWith('kitchen/'))) {
      delete pack.assets[id];
    }
  }

  for (const [id, entry] of Object.entries(srcManifest.assets || {})) {
    const merged = structuredClone(entry);
    if (merged.file && !merged.file.startsWith('kitchen/')) merged.file = `kitchen/${merged.file}`;
    pack.assets[id] = merged;
    const base = id.replace(/\.(day|evening|night)$/, '');
    if (/\.(day|evening|night)$/.test(id) && !aliases[base]) {
      aliases[base] = `${base}.day`;
    }
  }

  aliases['backdrop.kitchen'] = 'backdrop.kitchen.day';
  aliases['backdrop.kitchen_floor'] = 'backdrop.kitchen_floor.day';
  aliases['prop.table'] = 'prop.table.day';
  aliases['prop.chairs'] = 'prop.chairs.day';
  aliases['prop.pendant_on'] = 'prop.pendant_on.night';
  aliases['prop.pendant_off'] = 'prop.pendant_off.day';
  aliases['handprop.milk'] = 'handprop.milk.day';
  aliases['handprop.cup'] = 'handprop.cup.day';
  aliases['handprop.plate'] = 'handprop.plate.day';

  pack.aliases = aliases;
  pack.kitchenStage = srcManifest.stage;
  pack.kitchenLight = {
    eveningMultiply: 'kitchen/light/evening_multiplier_half.png',
    nightMultiply: 'kitchen/light/night_multiplier_half.png',
    nightAdd: 'kitchen/light/night_add_half.png'
  };
  return pack;
}

if (require.main === module) {
  const packDir = path.resolve(__dirname);
  const dropIn = path.join(packDir, 'kitchen_table4_r2/kitchen');
  const kitchenSrc = fs.existsSync(dropIn) ? dropIn : path.join(packDir, 'kitchen');
  const manifestPath = path.join(packDir, 'manifest.json');
  const pack = mergeKitchen(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), packDir, kitchenSrc);
  fs.writeFileSync(manifestPath, JSON.stringify(pack, null, 2) + '\n');
  const check = path.join(kitchenSrc, 'check_manifest.py');
  const out = execSync(`python3 "${check}"`, { cwd: kitchenSrc, encoding: 'utf8' });
  console.log(out.trim());
  console.log(`Merged kitchen: ${Object.keys(pack.assets).length} total assets`);
}

module.exports = { mergeKitchen };
