#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const scenePath = path.join(__dirname, '../scenes/day10-kitchen/scene.json');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

scene.title = 'Day 10 kitchen — Phase 1 morning + Phase 2E evening';
scene.timing.sceneEnd = 1350;

const eveningBase = {
  lightVariant: 'night',
  soirKitchen: true,
  warmTint: false
};

const eveningStage = {
  props: [
    'cornice', 'upper_cabinets', 'clock', 'frame', 'window', 'shelf', 'fridge', 'counter',
    'chair_left', 'table', 'chair_right', 'desk', 'plant', 'pendant'
  ],
  actors: {
    martin: null,
    lefevre: null,
    noe: { character: 'noe', x: 108, y: 136, asset: 'noe.stand' },
    camille: { character: 'camille', x: 92, y: 136, asset: 'camille.stand' },
    cat: { character: 'croissant', x: 148, y: 136, asset: 'croissant.sit' }
  }
};

const eveningShots = [
  {
    id: 'n_d11_queue',
    t0: 900,
    t1: 945,
    crop: 'medium',
    phoneInsert: { caption: 'zoom · plante + queue', tail: true, topBias: 0.22 },
    bubbleAnchors: { camille: { x: 92, y: 127 }, noe: { x: 108, y: 127 } },
    stage: {
      ...eveningStage,
      actors: {
        ...eveningStage.actors,
        camille: { character: 'camille', x: 100, y: 136, asset: 'camille.bend' }
      }
    },
    ...eveningBase
  },
  {
    id: 'd11_cam_queue',
    t0: 945,
    t1: 990,
    crop: 'close',
    bubbleAnchors: { camille: { x: 96, y: 127 } },
    stage: {
      ...eveningStage,
      actors: {
        ...eveningStage.actors,
        camille: { character: 'camille', x: 96, y: 136, asset: 'camille.point' },
        noe: { character: 'noe', x: 118, y: 136, asset: 'noe.look.0' }
      }
    },
    ...eveningBase
  },
  {
    id: 'd11_noe_pasmoi',
    t0: 990,
    t1: 1035,
    crop: 'medium',
    bubbleAnchors: {
      camille: { x: 88, y: 127 },
      noe: { x: 112, y: 127 }
    },
    stage: {
      ...eveningStage,
      actors: {
        ...eveningStage.actors,
        noe: { character: 'noe', x: 112, y: 136, asset: 'noe.look.1', face: 'brow_raise' },
        camille: { character: 'camille', x: 88, y: 136, asset: 'camille.stand' },
        cat: { character: 'croissant', x: 152, y: 136, asset: 'croissant.idle' }
      }
    },
    ...eveningBase
  },
  {
    id: 'n_d11_souvenir',
    t0: 1035,
    t1: 1080,
    crop: 'close',
    flashCut: {
      at: 0.35,
      duration: 1,
      desaturate: 0.85,
      placeholderLabel: 'stairwell · Lefèvre eyes (placeholder)'
    },
    stage: {
      props: eveningStage.props,
      actors: {
        martin: null,
        lefevre: null,
        camille: null,
        cat: null,
        noe: { character: 'noe', x: 104, y: 136, face: 'neutral' }
      }
    },
    ...eveningBase
  },
  {
    id: 'done',
    t0: 1080,
    t1: 1125,
    crop: 'close',
    splitHook: {
      ratio: 0.5,
      top: { caption: 'plante + queue', tail: true },
      bottomPlaceholder: 'rooftop dusk (placeholder)'
    },
    stage: { props: eveningStage.props, actors: { ...eveningStage.actors, cat: null } },
    ...eveningBase
  },
  {
    id: 'n_d11_phone',
    t0: 1200,
    t1: 1240,
    crop: 'wide',
    placeholderSet: 'roof day (C — awaiting Pixel Studio)',
    stage: eveningStage,
    lightVariant: 'day'
  },
  {
    id: 'n_d11_escalier',
    t0: 1240,
    t1: 1280,
    crop: 'wide',
    placeholderSet: 'stairwell (D — awaiting Pixel Studio)',
    stage: { props: [], actors: { martin: null, lefevre: null, camille: null, noe: null, cat: null } },
    lightVariant: 'day'
  }
];

scene.shots = [...scene.shots.filter((s) => s.t0 < 900), ...eveningShots];

scene.bubbles.push(
  { t0: 900.8, t1: 944, text: 'Plus tard, à l’appartement. Camille regarde la photo. Derrière la plante… une queue orange.', anchor: 'narrator', kind: 'narrator' },
  { t0: 945.8, t1: 989, text: 'Noé. C’est quoi, ça ?', actor: 'camille', kind: 'camille' },
  { t0: 990.8, t1: 1034, text: 'Ce n’est pas moi !', actor: 'noe', kind: 'noe' },
  { t0: 1080.8, t1: 1124, text: 'Une photo de la plante. Pas du chat. Mais le cat est sur la photo.', anchor: 'narrator', kind: 'narrator' }
);
// fix typo chat
scene.bubbles[scene.bubbles.length - 1].text = 'Une photo de la plante. Pas du chat. Mais le chat est sur la photo.';

scene.audio.push(
  { t: 900.8, id: 'n_d11_queue' },
  { t: 945.8, id: 'd11_cam_queue' },
  { t: 990.8, id: 'd11_noe_pasmoi' },
  { t: 1080.8, id: 'd11_hook' }
);

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2) + '\n');
console.log('evening shots', eveningShots.length, 'total', scene.shots.length);
