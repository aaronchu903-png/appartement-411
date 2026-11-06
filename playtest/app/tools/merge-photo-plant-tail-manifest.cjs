#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '../scenes/packs/b/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assets = manifest.assets;
const aliases = manifest.aliases || {};

const base = 'sitcom_pieces/x1/';
const add = (id, file, w, h, opts = {}) => {
  assets[id] = {
    source: 'file',
    file: base + file,
    anchor: 'topleft',
    anchorPoint: { x: 0, y: 0 },
    pixelScale: 1,
    depth: 7,
    frame: { x: 0, y: 0, w, h },
    ...opts
  };
};

add('prop.photo_plant_tail.screen', 'prop_photo_plant_tail_screen.png', 46, 51, { selfLit: true, graded: false });
add('prop.photo_plant_tail.tiny', 'prop_photo_plant_tail_tiny.png', 2, 4, { selfLit: true, graded: false });
add('prop.insert.photo_plant_tail.day', 'prop_insert_photo_plant_tail_day.png', 60, 58, { graded: true, grade: 'day' });
add('prop.insert.photo_plant_tail.evening', 'prop_insert_photo_plant_tail_evening.png', 60, 58, { graded: true, grade: 'evening' });
add('prop.insert.photo_plant_tail.night', 'prop_insert_photo_plant_tail_night.png', 60, 58, { graded: true, grade: 'night' });
add('handprop.phone', 'handprop_phone.png', 12, 16, { handPoint: { x: 6, y: 14 } });

aliases['handprop.phone'] = 'handprop.phone';
aliases['prop.photo_plant_tail.screen'] = 'prop.photo_plant_tail.screen';
aliases['prop.insert.photo_plant_tail'] = 'prop.insert.photo_plant_tail.day';

manifest.aliases = aliases;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('photo plant tail assets merged');
