#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const outPath = path.join(__dirname, '../scenes/day10-rooftop/scene.json');
const baseProps = [
  'roof_door', 'light_pole', 'bench', 'trough_planted', 'pot_tall_planted',
  'pot_round_planted', 'pot_round_empty', 'pot_chez_nous', 'arrosoir', 'string_lights'
];

const defaultActors = {
  martin: null,
  lefevre: null,
  noe: { character: 'noe', x: 88, y: 136, asset: 'noe.stand' },
  camille: { character: 'camille', x: 72, y: 136, asset: 'camille.stand' },
  cat: { character: 'croissant', x: 115, y: 124, layer: 'front', asset: 'croissant.sit' }
};

const scene = {
  version: 1,
  title: 'Day 10 rooftop — Phase 2C (C1–C11)',
  audioBase: '../../audio/w1/',
  rooftop: true,
  scene: { width: 192, height: 144 },
  room: { horizon: 128, floorTop: 136, wall: '#c8dce8', floor: '#6a7080' },
  cropLibrary: {
    wide: { x: 2, y: 12, w: 135, h: 132, fixedScale: 8, cameraPreset: 'wide' },
    medium: { x: 46, y: 56, w: 90, h: 88, fixedScale: 12, cameraPreset: 'medium' },
    close: { x: 60, y: 85, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' }
  },
  props: baseProps.map((id) => {
    const map = {
      roof_door: { asset: 'prop.roof_door', x: 22, y: 131, z: 2 },
      light_pole: { asset: 'prop.light_pole', x: 150, y: 131, z: 2 },
      bench: { asset: 'prop.bench', x: 100, y: 131, z: 2 },
      trough_planted: { asset: 'prop.trough_planted', x: 132, y: 117, z: 3 },
      pot_tall_planted: { asset: 'prop.pot_tall_planted', x: 46, y: 131, z: 3 },
      pot_round_planted: { asset: 'prop.pot_round_planted', x: 166, y: 131, z: 3 },
      pot_round_empty: { asset: 'prop.pot_round_empty', x: 179, y: 131, z: 3 },
      pot_chez_nous: { asset: 'prop.pot_chez_nous_young', x: 70, y: 134, z: 3 },
      arrosoir: { asset: 'prop.arrosoir', x: 81, y: 135, z: 3 },
      string_lights: { asset: 'prop.string_lights', x: 37, y: 90, z: 6, layer: 'front' }
    };
    const p = map[id];
    return { id, ...p, layer: p.layer || 'behind', flip: false };
  }),
  bubbleAnchors: {
    noe: { x: 88, y: 127 },
    camille: { x: 72, y: 127 },
    narrator: { x: 96, y: 24 }
  },
  defaultStage: {
    props: baseProps,
    propStates: { roof_door: 'closed', string_lights: 'off', pot_chez_nous: 'default' },
    actors: defaultActors
  },
  timing: { sceneEnd: 495 },
  startCrop: 'wide',
  shots: [],
  bubbles: [],
  audio: [],
  taps: [{ t0: 45, t1: 90, ring: true, rect: { x: 70, y: 134, w: 12, h: 12 } }],
  assetPack: 'b',
  layout: {
    portraitSplit: { bubble: 0.15, scene: 0.55, hud: 0.3 },
    referencePhoneH: 1920,
    feetFraction: 0.88,
    headMinFrac: 0.08,
    headMaxFrac: 0.45,
    maxBareFloorFrac: 0.12,
    maxWallAboveHeadNative: 12
  }
};

const shots = [
  ['n_d11_phone', 0, 45, 'wide', {}],
  ['pot_wiggle', 45, 90, 'medium', { pot_chez_nous: 'young' }],
  ['d11_focus_photo', 90, 130, 'close', { phoneInsert: { caption: 'photo · pot ①' } }],
  ['d11_noe_photo', 130, 175, 'medium', { noe: { asset: 'noe.stand', x: 78, y: 136 } }],
  ['d11_noe_pres', 175, 220, 'close', { noe: { x: 74, y: 136 } }],
  ['d11_noe_souriez', 220, 260, 'close', { noe: { x: 76, y: 136 } }],
  ['d11_cam_souriez', 260, 305, 'medium', { camille: { asset: 'camille.stand', x: 70, y: 136 } }],
  ['d11_souriez_vous', 305, 350, 'medium', { layoutProfile: 'lineup' }],
  ['d11_cam_souriez2', 350, 395, 'close', { camille: { x: 74, y: 136 } }],
  ['n_d11_clic', 395, 440, 'medium', {}],
  ['d11_noe_encore', 440, 495, 'medium', { noe: { asset: 'noe.walk.0', x: 90, y: 136 } }]
];

let t = 0;
for (const [id, t0, t1, crop, extra] of shots) {
  const stage = {
    props: [...baseProps],
    propStates: { roof_door: 'closed', string_lights: 'off' },
    actors: { ...defaultActors, ...(extra.actors || {}) }
  };
  if (extra.noe) stage.actors.noe = { ...stage.actors.noe, ...extra.noe };
  if (extra.camille) stage.actors.camille = { ...stage.actors.camille, ...extra.camille };
  const shot = { id, t0, t1, crop, lightVariant: 'day', stage };
  if (extra.phoneInsert) shot.phoneInsert = extra.phoneInsert;
  if (extra.layoutProfile) shot.layoutProfile = extra.layoutProfile;
  scene.shots.push(shot);
}

scene.bubbles = [
  { t0: 0.8, t1: 44, text: 'Sur le toit, Noé prend son téléphone. Il veut prendre la photo.', anchor: 'narrator', kind: 'narrator' },
  { t0: 130.8, t1: 174, text: 'Une photo de la plante. Facile ! Je suis un artiste.', actor: 'noe', kind: 'noe' },
  { t0: 175.8, t1: 219, text: 'Plus près… plus près !', actor: 'noe', kind: 'noe' },
  { t0: 220.8, t1: 259, text: 'Souriez !', actor: 'noe', kind: 'noe' },
  { t0: 260.8, t1: 304, text: 'Noé. C’est une plante.', actor: 'camille', kind: 'camille' },
  { t0: 395.8, t1: 439, text: 'Clic. Voilà la photo.', anchor: 'narrator', kind: 'narrator' },
  { t0: 440.8, t1: 494, text: 'Encore une photo !', actor: 'noe', kind: 'noe' }
];

scene.audio = [
  { t: 0.8, id: 'n_d11_phone' },
  { t: 130.8, id: 'd11_noe_photo' },
  { t: 175.8, id: 'd11_noe_pres' },
  { t: 220.8, id: 'd11_noe_souriez' },
  { t: 260.8, id: 'd11_cam_souriez' },
  { t: 395.8, id: 'n_d11_clic' },
  { t: 440.8, id: 'd11_noe_encore' }
];

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(scene, null, 2) + '\n');
console.log('wrote', outPath, scene.shots.length, 'shots');
