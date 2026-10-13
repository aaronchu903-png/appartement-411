/* Garden art v2. Positions come from art/garden/manifest.json.
 * The shipped walkable grid is approximate: it samples a prop at two
 * heights, so the chair, the sign and the watering can stay partly
 * walkable. correctWalkable blocks every tile a prop actually covers
 * and keeps the hatch open. The entry (row 15, col 5) is the left tile
 * of the door at (84, 236, 24×20); it is kept when it still touches that door.
 */
(function (root) {
  'use strict';
  var TINT = [0.62, 0.55, 0.62];
  var PART = 'art/garden/garden_parts/';
  var SCREEN = 'art/garden/garden_screen/';
  var ROOF = 'art/garden/rooftop/';

  /* The pack has full, wilting and dormant leaves. Steady (0.85 ≤ R < 0.9) uses the full drawing; the caption stays « Elle tient. ». */
  function spriteLeaf(leaves) {
    if (leaves === 'full' || leaves === 'steady') return 'full';
    if (leaves === 'wilting' || leaves === 'dormant') return leaves;
    return null;
  }

  function partNames(pot, lapse) {
    var names = ['pot_back'];
    var leaf = spriteLeaf(pot && pot.leaves);
    if (!leaf) {
      names.push('pot_front');
      return names;
    }
    var stage = pot.stage || 1;
    if (pot.rootStage) names.push('roots_' + pot.rootStage);
    if (lapse && leaf !== 'dormant') {
      names.push('stem_' + stage);
      names.push('leaves_flash_' + stage);
    } else if (leaf === 'wilting') {
      names.push('stem_wilting_' + stage);
      names.push('leaves_wilting_' + stage);
    } else if (leaf === 'dormant') {
      names.push('stem_dormant_' + stage);
      names.push('leaves_dormant_' + stage);
    } else {
      names.push('stem_' + stage);
      names.push('leaves_full_' + stage);
    }
    names.push('pot_front');
    return names;
  }

  function partSrc(name) {
    return PART + name + '.png';
  }

  function gardenBg(night) {
    return SCREEN + (night ? 'garden_bg_night_390x844.png' : 'garden_bg_390x844.png');
  }

  function roofSrc(scene, night) {
    var which = scene === 'tidy' ? 'tidy' : 'firstvisit';
    return ROOF + 'rooftop_' + (night ? 'night' : 'day') + '_' + which + '.png';
  }

  function propRect(prop, bottom) {
    var ax = prop.anchor_bottom_center[0];
    var ay = prop.anchor_bottom_center[1];
    return {
      x: bottom[0] - ax,
      y: bottom[1] - ay,
      w: prop.size[0],
      h: prop.size[1]
    };
  }

  function tileHitsDoor(row, col, door, tile) {
    var x = col * tile;
    var y = row * tile;
    return x < door[0] + door[2] && x + tile > door[0] && y < door[1] + door[3] && y + tile > door[1];
  }

  function correctWalkable(walkable, manifest) {
    var tile = walkable.tile || 16;
    var cols = walkable.cols;
    var rows = walkable.rows;
    var door = manifest.rooftop.door;
    var layouts = {};
    var blocked = {};
    Object.keys(walkable.layouts).forEach(function (name) {
      var g = walkable.layouts[name].map(function (row) { return row.slice(); });
      var scene = manifest.rooftop.scenes[name] || null;
      var extra = [];
      if (scene) {
        Object.keys(scene).forEach(function (key) {
          var prop = manifest.props[key.split('@')[0]];
          if (!prop) return;
          var rct = propRect(prop, scene[key].bottom_center);
          var x0 = rct.x + 1;
          var y0 = rct.y + 1;
          var x1 = rct.x + rct.w - 1;
          var y1 = rct.y + rct.h - 1;
          var c0 = Math.floor(x0 / tile);
          var c1 = Math.floor((x1 - 1) / tile);
          var r0 = Math.floor(y0 / tile);
          var r1 = Math.floor((y1 - 1) / tile);
          var r, c;
          for (r = r0; r <= r1; r++) {
            for (c = c0; c <= c1; c++) {
              if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
              if (g[r][c] === 1) extra.push([r, c]);
              g[r][c] = 0;
            }
          }
        });
      }
      var rSky, cSky;
      for (rSky = 0; rSky < 6 && rSky < rows; rSky++) {
        for (cSky = 0; cSky < cols; cSky++) g[rSky][cSky] = 0;
      }
      var dc0 = Math.floor(door[0] / tile);
      var dc1 = Math.floor((door[0] + door[2] - 1) / tile);
      var dr = Math.floor((door[1] + door[3] - 1) / tile);
      var cDoor;
      for (cDoor = dc0; cDoor <= dc1; cDoor++) {
        if (dr >= 0 && dr < rows && cDoor >= 0 && cDoor < cols) g[dr][cDoor] = 1;
      }
      layouts[name] = g;
      blocked[name] = extra;
    });
    var entry = walkable.entry_tile.slice();
    var onDoor = tileHitsDoor(entry[0], entry[1], door, tile);
    if (!onDoor) {
      var cx = door[0] + door[2] / 2;
      var cy = door[1] + door[3] - tile / 2;
      entry = [Math.floor(cy / tile), Math.floor(cx / tile)];
    }
    return {
      tile: tile, cols: cols, rows: rows,
      entry_tile: entry, entryAdjusted: !onDoor,
      layouts: layouts, blocked: blocked
    };
  }

  var api = {
    TINT: TINT,
    spriteLeaf: spriteLeaf,
    partNames: partNames,
    partSrc: partSrc,
    gardenBg: gardenBg,
    roofSrc: roofSrc,
    propRect: propRect,
    correctWalkable: correctWalkable
  };
  root.A411 = root.A411 || {};
  root.A411.GardenArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
