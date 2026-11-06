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

function mergeRooftop(pack, packDir, rooftopSrcDir) {
  const srcRoot = path.resolve(rooftopSrcDir);
  const rooftopDir = path.join(packDir, 'rooftop');
  copyTree(srcRoot, rooftopDir);

  const srcManifest = JSON.parse(fs.readFileSync(path.join(srcRoot, 'manifest.json'), 'utf8'));
  const aliases = { ...pack.aliases };

  for (const [id, atlas] of Object.entries(srcManifest.atlases || {})) {
    pack.atlases[id] = { ...atlas, file: `rooftop/${atlas.file}` };
  }

  for (const [id, entry] of Object.entries(srcManifest.assets || {})) {
    const merged = structuredClone(entry);
    if (merged.file && !merged.file.startsWith('rooftop/')) merged.file = `rooftop/${merged.file}`;
    pack.assets[id] = merged;
    const base = id.replace(/\.(day|evening|night)$/, '');
    if (/\.(day|evening|night)$/.test(id) && !aliases[base]) {
      aliases[base] = `${base}.day`;
    }
  }

  if (pack.assets['prop.roof_door_closed.day']) {
    pack.assets['prop.roof_door'] = {
      type: 'states',
      states: { closed: 'prop.roof_door_closed', open: 'prop.roof_door_open', default: 'closed' }
    };
    aliases['prop.roof_door_closed'] = 'prop.roof_door_closed.day';
    aliases['prop.roof_door_open'] = 'prop.roof_door_open.day';
  }
  if (pack.assets['prop.string_lights_off.day']) {
    pack.assets['prop.string_lights'] = {
      type: 'states',
      states: { off: 'prop.string_lights_off', on: 'prop.string_lights_on', default: 'off' }
    };
    aliases['prop.string_lights_off'] = 'prop.string_lights_off.day';
    aliases['prop.string_lights_on'] = 'prop.string_lights_on.night';
  }
  aliases['prop.pot_chez_nous_sprout'] = 'prop.pot_chez_nous_sprout.day';
  aliases['prop.pot_chez_nous_young'] = 'prop.pot_chez_nous_young.day';
  aliases['prop.pot_chez_nous_full'] = 'prop.pot_chez_nous_full.day';
  aliases['prop.pot_round_empty'] = 'prop.pot_round_empty.day';
  aliases['prop.pot_round_planted'] = 'prop.pot_round_planted.day';
  aliases['backdrop.rooftop_sky'] = 'backdrop.rooftop_sky.day';
  aliases['backdrop.rooftop_skyline'] = 'backdrop.rooftop_skyline.day';
  aliases['backdrop.rooftop_skyline_far'] = 'backdrop.rooftop_skyline_far.day';
  aliases['backdrop.rooftop_tower'] = 'backdrop.rooftop_tower.day';
  aliases['backdrop.rooftop_floor'] = 'backdrop.rooftop_floor.day';
  aliases['prop.parapet'] = 'prop.parapet.day';
  aliases['prop.bench'] = 'prop.bench.day';
  aliases['prop.light_pole'] = 'prop.light_pole.day';
  aliases['prop.arrosoir'] = 'prop.arrosoir.day';
  aliases['handprop.arrosoir'] = 'handprop.arrosoir.day';

  pack.aliases = aliases;
  pack.rooftopStage = srcManifest.stage;
  pack.rooftopLight = {
    eveningMultiply: 'rooftop/light/evening_multiplier_half.png',
    nightMultiply: 'rooftop/light/night_multiplier_half.png',
    nightAdd: 'rooftop/light/night_add_half.png'
  };
  pack.rooftopUngraded = (srcManifest.stage?.ungraded || srcManifest.ungraded || []).map((s) => s.split(' ')[0]);
  return pack;
}

if (require.main === module) {
  const packDir = path.resolve(__dirname);
  const rooftopSrc = path.join(packDir, 'rooftop_set_r1/rooftop');
  const manifestPath = path.join(packDir, 'manifest.json');
  const pack = mergeRooftop(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), packDir, rooftopSrc);
  fs.writeFileSync(manifestPath, JSON.stringify(pack, null, 2) + '\n');
  const check = path.join(rooftopSrc, 'check_manifest.py');
  const out = execSync(`python3 "${check}"`, { cwd: rooftopSrc, encoding: 'utf8' });
  console.log(out.trim());
  console.log(`Merged rooftop: ${Object.keys(pack.assets).length} total assets`);
}

module.exports = { mergeRooftop };
