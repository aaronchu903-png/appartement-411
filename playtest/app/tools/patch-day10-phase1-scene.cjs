#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const scenePath = path.join(__dirname, '../scenes/day10-kitchen/scene.json');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

scene.title = 'Day 10 kitchen — Phase 1 (A1–A13, B1–B6)';
scene.timing.sceneEnd = 890;

const laptopAnchor = { x: 168, y: 108 };
scene.bubbleAnchors.laptop = laptopAnchor;

const calendarProp = {
  id: 'calendar_wall',
  asset: 'prop.calendar.month',
  x: 100,
  y: 82,
  z: 12,
  layer: 'behind',
  placeholderLabel: 'calendar',
  placeholderW: 18,
  placeholderH: 12
};
const coffeeProp = {
  id: 'coffee_pot',
  asset: 'prop.cafetiere',
  x: 58,
  y: 122,
  z: 40,
  layer: 'front',
  placeholderLabel: 'cafetière',
  placeholderW: 12,
  placeholderH: 14
};
if (!scene.props.find((p) => p.id === 'calendar_wall')) scene.props.push(calendarProp);
if (!scene.props.find((p) => p.id === 'coffee_pot')) scene.props.push(coffeeProp);

const tableMorning = {
  props: ['window', 'shelf', 'counter', 'table', 'chair_left', 'chair_right', 'desk', 'laptop', 'stash_pen', 'stash_sock', 'spoon_dirty'],
  propStates: { laptop: 'closed' },
  actors: {
    martin: null,
    lefevre: null,
    camille: { character: 'camille', x: 100, y: 136, asset: 'camille.stand' },
    noe: { character: 'noe', x: 124, y: 136, asset: 'noe.stand' },
    cat: {
      character: 'croissant',
      x: 128,
      y: 119,
      layer: 'front',
      asset: 'croissant.sit'
    }
  }
};

scene.shots = [
  {
    id: 'n_d11_matin2',
    t0: 0,
    t1: 45,
    crop: 'wide',
    warmTint: true,
    stage: tableMorning
  },
  {
    id: 'stash_back',
    t0: 45,
    t1: 90,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 100, y: 127 }, noe: { x: 124, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_left', 'chair_right', 'fridge', 'laptop', 'stash_pen', 'stash_sock', 'spoon_dirty', 'spoon_clean'],
      propStates: { laptop: 'closed' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 100, y: 136, asset: 'camille.bend' },
        noe: { character: 'noe', x: 124, y: 136, asset: 'noe.walk.1' }
      }
    }
  },
  {
    id: 'd11_cam_lit',
    t0: 90,
    t1: 135,
    crop: 'closeCounter',
    bubbleAnchors: { camille: { x: 48, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 48, y: 136, asset: 'camille.bend' }
      }
    }
  },
  {
    id: 'n_d11_ecran',
    t0: 135,
    t1: 195,
    crop: 'closeDesk',
    warmTint: true,
    bubbleAnchors: { camille: { x: 48, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 48, y: 136, asset: 'camille.stand' }
      }
    }
  },
  {
    id: 'd11_mar_bonjour',
    t0: 195,
    t1: 245,
    crop: 'closeDesk',
    bubbleAnchors: { camille: { x: 52, y: 127 }, noe: { x: 88, y: 127 }, laptop: laptopAnchor },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 52, y: 136, asset: 'camille.bend' },
        noe: { character: 'noe', x: 88, y: 136, asset: 'noe.look.0' }
      }
    }
  },
  {
    id: 'd11_mar_photo',
    t0: 245,
    t1: 290,
    crop: 'medium',
    bubbleAnchors: { noe: { x: 108, y: 127 }, laptop: laptopAnchor },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_left', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        camille: { character: 'camille', x: 96, y: 136, asset: 'camille.stand' },
        noe: { character: 'noe', x: 108, y: 136, asset: 'noe.look.0' },
        cat: { character: 'croissant', x: 128, y: 119, layer: 'front', asset: 'croissant.sit' }
      }
    }
  },
  {
    id: 'd11_mar_chat',
    t0: 290,
    t1: 335,
    excludeProps: ['desk', 'plant', 'laptop', 'table_cup', 'table_milk', 'cornice', 'clock', 'frame'],
    crop: { x: 96, y: 82, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' },
    bubbleAnchors: { laptop: laptopAnchor },
    stage: {
      props: ['window', 'counter', 'table', 'chair_left', 'chair_right'],
      actors: {
        martin: null,
        lefevre: null,
        cat: { character: 'croissant', x: 118, y: 119, layer: 'front', asset: 'croissant.sit' },
        camille: { character: 'camille', x: 102, y: 136, asset: 'camille.stand' },
        noe: { character: 'noe', x: 132, y: 136, asset: 'noe.look.1' }
      }
    },
    framingLandmarks: ['window', 'counter', 'table'],
    soir: {
      crop: { x: 88, y: 82, w: 60, h: 59, fixedScale: 18, cameraPreset: 'close' },
      stage: {
        actors: {
          martin: { character: 'madame_martin', x: 108, y: 136 },
          lefevre: { character: 'lefevre', x: 118, y: 136 },
          cat: null,
          camille: null,
          noe: null
        }
      }
    }
  },
  {
    id: 'keyboard_cat',
    t0: 335,
    t1: 380,
    excludeProps: ['plant'],
    crop: { x: 132, y: 84, w: 60, h: 56, fixedScale: 18, cameraPreset: 'close' },
    stage: {
      props: ['backsplash', 'window', 'shelf', 'fridge', 'counter', 'chair_left', 'table', 'chair_right', 'desk', 'laptop'],
      propStates: { laptop: 'open' },
      uiText: 'pppppp',
      uiTextPos: { x: 148, y: 111 },
      actors: {
        martin: null,
        lefevre: null,
        cat: { character: 'croissant', x: 181, y: 118, layer: 'front', asset: 'croissant.sit' },
        camille: null,
        noe: null
      }
    }
  },
  {
    id: 'd11_mar_futur',
    t0: 380,
    t1: 430,
    crop: 'close',
    bubbleAnchors: { camille: { x: 88, y: 127 }, laptop: laptopAnchor },
    stage: {
      props: ['calendar_wall', 'frame', 'house_rules', 'window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 88, y: 136, asset: 'camille.point' }
      }
    }
  },
  {
    id: 'd11_dictee',
    t0: 430,
    t1: 485,
    crop: 'closeDesk',
    bubbleAnchors: { camille: { x: 52, y: 127 }, noe: { x: 88, y: 127 }, laptop: laptopAnchor },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 52, y: 136, asset: 'camille.bend' },
        noe: { character: 'noe', face: 'brow_raise', x: 88, y: 136 }
      }
    }
  },
  {
    id: 'd11_noe_court',
    t0: 485,
    t1: 530,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 52, y: 127 }, noe: { x: 96, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'open' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 52, y: 136, asset: 'camille.stand' },
        noe: { character: 'noe', x: 96, y: 136, asset: 'noe.look.1' }
      }
    }
  },
  {
    id: 'd11_cam_court',
    t0: 530,
    t1: 575,
    crop: 'closeCounter',
    bubbleAnchors: { camille: { x: 44, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'closed' },
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 44, y: 136, asset: 'camille.point' }
      }
    }
  },
  {
    id: 'd11_photo',
    t0: 575,
    t1: 620,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 96, y: 127 }, noe: { x: 120, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_left', 'chair_right', 'fridge', 'laptop', 'desk'],
      propStates: { laptop: 'closed' },
      actors: {
        martin: null,
        lefevre: null,
        camille: { character: 'camille', x: 96, y: 136, asset: 'camille.stand' },
        noe: { character: 'noe', face: 'neutral', x: 120, y: 136, asset: 'noe.look.0' },
        cat: { character: 'croissant', x: 128, y: 119, layer: 'front', asset: 'croissant.idle' }
      }
    }
  },
  {
    id: 'n_d11_matin',
    t0: 620,
    t1: 665,
    crop: 'medium',
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'milk'],
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: null,
        noe: { character: 'noe', x: 24, y: 136, asset: 'noe.look.0' }
      }
    }
  },
  {
    id: 'd11_noe_lait',
    t0: 665,
    t1: 710,
    crop: 'close',
    bubbleAnchors: { noe: { x: 28, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'milk'],
      actors: {
        martin: null,
        lefevre: null,
        camille: null,
        cat: null,
        noe: { character: 'noe', x: 28, y: 136, asset: 'noe.look.0' }
      }
    }
  },
  {
    id: 'd11_cam_lait',
    t0: 710,
    t1: 755,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 54, y: 127 }, noe: { x: 72, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'milk', 'house_rules'],
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        camille: { character: 'camille', x: 54, y: 136, asset: 'camille.point' },
        noe: { character: 'noe', x: 72, y: 136 }
      }
    }
  },
  {
    id: 'd11_noe_faim',
    t0: 755,
    t1: 800,
    crop: 'close',
    bubbleAnchors: { noe: { x: 60, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'pastry_bag'],
      actors: {
        martin: null,
        lefevre: null,
        camille: null,
        noe: { character: 'noe', x: 60, y: 136, face: 'neutral' },
        cat: { character: 'croissant', x: 108, y: 136, asset: 'croissant.tail.0' }
      }
    }
  },
  {
    id: 'd11_cam_cafe',
    t0: 800,
    t1: 845,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 58, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'coffee_pot', 'table_cup'],
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        noe: { character: 'noe', x: 88, y: 136 },
        camille: { character: 'camille', x: 58, y: 136, asset: 'camille.stand' }
      }
    }
  },
  {
    id: 'd11_cafe',
    t0: 845,
    t1: 890,
    crop: 'medium',
    bubbleAnchors: { camille: { x: 58, y: 127 } },
    stage: {
      props: ['window', 'shelf', 'counter', 'table', 'chair_right', 'fridge', 'coffee_pot', 'table_cup', 'table_plate', 'pastry_bag'],
      actors: {
        martin: null,
        lefevre: null,
        cat: null,
        noe: { character: 'noe', x: 88, y: 136 },
        camille: { character: 'camille', x: 58, y: 136, asset: 'camille.stand', heldProp: 'handprop.cup' }
      }
    }
  }
];

scene.bubbles = [
  { t0: 0.8, t1: 44, text: 'Mercredi matin. Le message est là.', anchor: 'narrator', kind: 'narrator' },
  { t0: 90.8, t1: 134, text: 'Bon. Je lis le message.', actor: 'camille', kind: 'camille' },
  { t0: 135.8, t1: 194, text: 'Sur l’écran, il y a le message.', anchor: 'narrator', kind: 'narrator' },
  { t0: 195.8, t1: 244, text: 'Bonjour à vous trois. J’espère que tout va bien.', anchor: 'martin', kind: 'screen' },
  { t0: 245.8, t1: 289, text: 'Une photo de la plante, s’il vous plaît.', anchor: 'martin', kind: 'screen' },
  { t0: 290.8, t1: 334, text: 'De la plante. Pas du chat.', anchor: 'martin', kind: 'screen' },
  { t0: 380.8, t1: 429, text: 'Je reviendrai à la fin du mois. Nous parlerons de la plante.', anchor: 'martin', kind: 'screen' },
  { t0: 485.8, t1: 529, text: 'C’est tout ? C’est un petit message.', actor: 'noe', kind: 'noe' },
  { t0: 530.8, t1: 574, text: 'Un petit message. Un grand problème.', actor: 'camille', kind: 'camille' },
  { t0: 575.8, t1: 619, text: 'Écoute. Madame Martin voudrait une photo de quoi ?', anchor: 'narrator', kind: 'narrator' },
  { t0: 665.8, t1: 709, text: 'Il n’y a plus de lait.', actor: 'noe', kind: 'noe' },
  { t0: 710.8, t1: 754, text: 'Règle numéro trois : le lait, ça va dans le frigo. Pas dans ton ventre.', actor: 'camille', kind: 'camille' },
  { t0: 755.8, t1: 799, text: 'J’ai faim ! Et pas de lait.', actor: 'noe', kind: 'noe' },
  { t0: 800.8, t1: 844, text: 'Tu veux du café ? Sans lait.', actor: 'camille', kind: 'camille' }
];

scene.audio = [
  { t: 0.8, id: 'n_d11_matin2' },
  { t: 90.8, id: 'd11_cam_lit' },
  { t: 135.8, id: 'n_d11_ecran' },
  { t: 138.5, id: 'w_ecran' },
  { t: 195.8, id: 'd11_mar_bonjour' },
  { t: 245.8, id: 'd11_mar_photo' },
  { t: 290.8, id: 'd11_mar_chat' },
  { t: 380.8, id: 'd11_mar_futur' },
  { t: 430.8, id: 'd11_mar_photo' },
  { t: 485.8, id: 'd11_noe_court' },
  { t: 530.8, id: 'd11_cam_court' },
  { t: 575.8, id: 'd11_photo' },
  { t: 665.8, id: 'd11_noe_lait' },
  { t: 710.8, id: 'd11_cam_lait' },
  { t: 755.8, id: 'd11_noe_faim' },
  { t: 800.8, id: 'd11_cam_cafe' }
];

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2) + '\n');
console.log('patched', scenePath, 'shots', scene.shots.length);
