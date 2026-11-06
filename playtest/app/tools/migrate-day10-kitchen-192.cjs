#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const manifest = require('../scenes/packs/b/manifest.json');
const scenePath = path.join(__dirname, '../scenes/day10-kitchen/scene.json');
const scene = JSON.parse(fs.readFileSync('/tmp/day10-base.json', 'utf8'));

const SX = 2;
const SY = 2;
const FEET = manifest.kitchenStage.feetLine;
const HEAD = 114; // ~22*2 + offset for 22px cast head on old scale

function scaleXY(o) {
  if (!o || o.x == null) return o;
  return { ...o, x: Math.round(o.x * SX), y: Math.round(o.y * SY === FEET ? FEET : o.y * SY) };
}

function scaleActor(def) {
  if (!def) return def;
  const y = def.y >= 40 ? FEET : Math.round(def.y * SY);
  return { ...def, x: Math.round(def.x * SX), y };
}

const layout = manifest.kitchenStage.layout;
const props = [];
const propIdFor = (piece, idx) => {
  if (piece === 'prop.chairs') return idx === 0 ? 'chair_left' : 'chair_right';
  if (piece === 'handprop.cup') return 'table_cup';
  if (piece === 'handprop.plate') return 'table_plate';
  if (piece === 'handprop.milk') return 'table_milk';
  if (piece.includes('pendant')) return 'pendant';
  return piece.replace(/^prop\./, '').replace(/^handprop\./, 'hand_');
};
let chairIdx = 0;
for (const item of layout) {
  const piece = item.piece.split('|')[0];
  const asset = piece.includes('pendant') ? 'prop.pendant_off' : piece;
  const id = propIdFor(piece, chairIdx);
  if (piece === 'prop.chairs') chairIdx++;
  const depth = manifest.assets[`${asset}.day`]?.depth ?? 2;
  props.push({
    id,
    asset,
    x: item.x,
    y: item.y,
    z: depth * 10,
    layer: depth <= 1 ? 'behind' : 'behind',
    flip: item.mirror || false
  });
}

props.push(
  { id: 'laptop', asset: 'prop.laptop', x: 170, y: 118, z: 30, layer: 'behind', defaultState: 'open' },
  { id: 'stash_pen', asset: 'prop.stash.pen', x: 52, y: 128, z: 32, layer: 'front' },
  { id: 'stash_sock', asset: 'prop.stash.sock', x: 58, y: 130, z: 32, layer: 'front' },
  { id: 'spoon_dirty', asset: 'prop.spoon.dirty', x: 62, y: 131, z: 33, layer: 'front' },
  { id: 'spoon_clean', asset: 'prop.spoon.clean', x: 88, y: 131, z: 33, layer: 'front' },
  { id: 'milk', asset: 'handprop.milk', x: 24, y: 131, z: 30, layer: 'front' },
  { id: 'pastry_bag', asset: 'prop.pastry.bag', x: 50, y: 128, z: 30, layer: 'front' }
);

const kitchenProps = props.map((p) => p.id);
const defaultProps = [
  'backsplash', 'window', 'shelf', 'fridge', 'counter', 'chair_left', 'table', 'chair_right', 'desk', 'plant'
];

scene.scene = { width: 192, height: 144 };
scene.room = { wall: '#eddfc2', floor: '#b2936e', wallWarm: '#f2d9a8', floorWarm: '#b88858', floorTop: FEET };
scene.kitchen = true;
scene.backdrop = null;
scene.props = props;
scene.cropLibrary = {
  wide: { x: 2, y: 12, w: 135, h: 132, fixedScale: 8 },
  medium: { x: 46, y: 56, w: 90, h: 88, fixedScale: 12 },
  close: { x: 92, y: 85, w: 60, h: 59, fixedScale: 18 },
  closeCounter: { x: 68, y: 85, w: 60, h: 59, fixedScale: 18 },
  closeDesk: { x: 124, y: 72, w: 60, h: 59, fixedScale: 18 }
};

const cropMap = {
  n_d11_matin2: 'medium',
  stash_back: 'medium',
  d11_cam_lit: 'closeCounter',
  n_d11_ecran: 'closeDesk',
  d11_mar_bonjour: 'medium',
  d11_mar_photo: 'medium',
  d11_mar_chat: 'close',
  keyboard_cat: 'closeDesk',
  d11_mar_futur: 'close',
  d11_dictee: 'medium',
  d11_noe_court: 'close',
  d11_cam_court: 'closeCounter',
  d11_photo: 'medium',
  d11_noe_lait: 'closeCounter',
  d11_cam_lait: 'closeCounter',
  d11_noe_faim: 'medium'
};

for (const sh of scene.shots) {
  sh.crop = cropMap[sh.id] || sh.crop;
  if (sh.id === 'd11_mar_chat') sh.lightVariant = 'evening';
  if (sh.stage?.actors) {
    const na = {};
    for (const [k, v] of Object.entries(sh.stage.actors)) na[k] = scaleActor(v);
    sh.stage.actors = na;
  }
  if (sh.stage?.props) {
    sh.stage.props = sh.stage.props
      .map((id) => ({
        cornice: null, picture: null, upper_cabinets: null, lamp: null, laptop_small: null,
        counter: 'counter', chairs: 'chair_right', window: 'window', shelf: 'shelf',
        table: 'table', fridge: 'fridge', laptop: 'laptop'
      }[id] || id))
      .filter(Boolean);
  }
}

scene.defaultStage.props = defaultProps;
const da = scene.defaultStage.actors;
for (const k of Object.keys(da)) da[k] = scaleActor(da[k]);
if (da.cat) { da.cat.y = FEET; da.cat.x = 90; }
if (da.camille) { da.camille.x = 58; da.camille.y = FEET; }

scene.bubbleAnchors = Object.fromEntries(
  Object.entries(scene.bubbleAnchors).map(([k, v]) => [k, { x: Math.round(v.x * SX), y: Math.round(v.y * SY >= 40 ? FEET - 9 : v.y * SY) }])
);

scene.layout = {
  portraitSplit: { bubble: 0.15, scene: 0.55, hud: 0.3 },
  referencePhoneH: 1920,
  castHeadY: HEAD,
  feetFraction: 0.88,
  headMinFrac: 0.08,
  headMaxFrac: 0.45,
  maxBareFloorFrac: 0.12,
  maxWallAboveHeadNative: 12
};

// keyboard shot staging
const kb = scene.shots.find((s) => s.id === 'keyboard_cat');
if (kb?.stage) {
  kb.stage.props = [...defaultProps, 'laptop'];
  kb.stage.propStates = { laptop: 'open' };
  if (kb.stage.actors?.cat) {
    kb.stage.actors.cat = { ...kb.stage.actors.cat, x: 172, y: 124, layer: 'front' };
  }
  if (kb.stage.actors?.martin) {
    kb.stage.actors.martin = { character: 'madame_martin', x: 148, y: FEET };
  }
  kb.stage.uiText = 'pppppp';
  kb.stage.uiTextPos = { x: 178, y: 112 };
}

// Martin position for tests
for (const sh of scene.shots) {
  const m = sh.stage?.actors?.martin;
  if (m) { m.x = 120; m.y = FEET; }
}

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2) + '\n');
console.log('Wrote', scenePath);
