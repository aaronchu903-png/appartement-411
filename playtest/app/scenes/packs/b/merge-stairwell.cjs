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

function mergeStairwell(pack, packDir, stairwellSrcDir) {
  const srcRoot = path.resolve(stairwellSrcDir);
  const stairwellDir = path.join(packDir, 'stairwell');
  copyTree(srcRoot, stairwellDir);

  const srcManifest = JSON.parse(fs.readFileSync(path.join(srcRoot, 'manifest.json'), 'utf8'));
  const aliases = { ...pack.aliases };

  for (const [id, atlas] of Object.entries(srcManifest.atlases || {})) {
    pack.atlases[id] = { ...atlas, file: `stairwell/${atlas.file}` };
  }

  for (const [id, entry] of Object.entries(srcManifest.assets || {})) {
    const merged = structuredClone(entry);
    if (merged.file && !merged.file.startsWith('stairwell/')) merged.file = `stairwell/${merged.file}`;
    pack.assets[id] = merged;
    const base = id.replace(/\.(day|evening|night)$/, '');
    if (/\.(day|evening|night)$/.test(id) && !aliases[base]) {
      aliases[base] = `${base}.day`;
    }
  }

  if (pack.assets['prop.door_home_closed.day']) {
    pack.assets['prop.door_home'] = {
      type: 'states',
      states: { closed: 'prop.door_home_closed', open: 'prop.door_home_open', default: 'closed' }
    };
    pack.assets['prop.door_neighbour'] = {
      type: 'states',
      states: { closed: 'prop.door_neighbour_closed', open: 'prop.door_neighbour_open', default: 'closed' }
    };
    pack.assets['prop.ceiling_bulb'] = {
      type: 'states',
      states: { off: 'prop.ceiling_bulb_off', on: 'prop.ceiling_bulb_on', default: 'off' }
    };
    pack.assets['prop.minuterie'] = {
      type: 'states',
      states: { off: 'prop.minuterie_off', on: 'prop.minuterie_on', default: 'off' }
    };
    aliases['prop.door_411'] = 'prop.door_home';
    aliases['prop.doormat_411'] = 'prop.doormat_home';
    aliases['prop.door_home_closed'] = 'prop.door_home_closed.day';
    aliases['prop.door_home_open'] = 'prop.door_home_open.day';
    aliases['prop.door_neighbour_closed'] = 'prop.door_neighbour_closed.day';
    aliases['prop.doormat_home'] = 'prop.doormat_home.day';
    aliases['prop.doormat_plain'] = 'prop.doormat_plain.day';
    aliases['backdrop.stairwell'] = 'backdrop.stairwell.day';
    aliases['backdrop.stairwell_floor'] = 'backdrop.stairwell_floor.day';
  }

  pack.aliases = aliases;
  pack.stairwellStage = srcManifest.stage;
  pack.stairwellLight = {
    eveningMultiply: 'stairwell/light/evening_multiplier_half.png',
    nightMultiply: 'stairwell/light/night_multiplier_half.png',
    nightAdd: 'stairwell/light/night_add_half.png'
  };
  pack.stairwellUngraded = (srcManifest.stage?.ungraded || []).map((s) => s.split(' ')[0]);
  return pack;
}

if (require.main === module) {
  const packDir = path.resolve(__dirname);
  const dropIn = path.join(packDir, 'stairwell_set_r1/stairwell');
  const stairwellSrc = fs.existsSync(dropIn) ? dropIn : path.join(packDir, 'stairwell');
  const manifestPath = path.join(packDir, 'manifest.json');
  const pack = mergeStairwell(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), packDir, stairwellSrc);
  fs.writeFileSync(manifestPath, JSON.stringify(pack, null, 2) + '\n');
  const check = path.join(stairwellSrc, 'check_manifest.py');
  const out = execSync(`python3 "${check}"`, { cwd: stairwellSrc, encoding: 'utf8' });
  console.log(out.trim());
  console.log(`Merged stairwell: ${Object.keys(pack.assets).length} total assets`);
}

module.exports = { mergeStairwell };
