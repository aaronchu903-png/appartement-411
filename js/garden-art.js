/* Garden art. Positions and part sizes come from art/garden/manifest.json.
 * v1 ships a day and a night rooftop background and loose props. The first
 * visit and the tidy roof are placed here (ROOF_LAYOUT) until a later pack
 * puts scenes on the manifest and composed files in manifest.files
 * (rooftop_day_firstvisit, rooftop_night_tidy, …). Those files win when present.
 * A walk grid listed as manifest.files.walkable replaces the generated y≥96 grid.
 */
(function (root) {
  'use strict';
  var PART = 'art/garden/';

  /* Code placement for the uncomposed rooftop. Bottom-centre, native pixels.
   * Pot ② (pot_dry_2@1) is the Day 10 plant target. */
  var ROOF_LAYOUT = {
    firstvisit: {
      'pot_dry_1@0': { bottom_center: [24, 128] },
      'pot_dry_2@1': { bottom_center: [44, 128] },
      'pot_dry_3@2': { bottom_center: [64, 128] },
      'pot_dry_4@3': { bottom_center: [84, 128] },
      'pot_dry_5@4': { bottom_center: [104, 128] },
      'pot_dry_6@5': { bottom_center: [124, 128] },
      'wood_sign@0': { bottom_center: [164, 132] },
      'old_chair@0': { bottom_center: [164, 180] },
      'weeds@0': { bottom_center: [36, 180] },
      'weeds@1': { bottom_center: [96, 200] },
      'weeds@2': { bottom_center: [148, 210] },
      'watering_can@0': { bottom_center: [28, 214] }
    },
    tidy: {
      'basil_planted@0': { bottom_center: [24, 128] },
      'basil_planted@1': { bottom_center: [44, 128] },
      'basil_planted@2': { bottom_center: [64, 128] },
      'basil_planted@3': { bottom_center: [84, 128] },
      'basil_planted@4': { bottom_center: [104, 128] },
      'pot_empty@0': { bottom_center: [124, 128] },
      'wood_sign@0': { bottom_center: [164, 132] },
      'old_chair@0': { bottom_center: [164, 180] },
      'watering_can@0': { bottom_center: [28, 214] }
    }
  };

  function artPath(rel) {
    return PART + String(rel || '').replace(/^\/+/, '');
  }

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
    return PART + 'garden_parts/' + name + '.png';
  }

  function partBox(manifest) {
    var g = manifest.garden_parts;
    var scale = g.scale_to_pt || 4;
    return { w: g.canvas_native[0] * scale, h: g.canvas_native[1] * scale, scale: scale };
  }

  function gardenBg(manifest, night) {
    var files = (manifest && manifest.files) || {};
    if (night && files.garden_bg_night) return artPath(files.garden_bg_night);
    if (files.garden_bg) return artPath(files.garden_bg);
    return PART + 'garden_screen/garden_bg_390x844.png';
  }

  function roofScenes(manifest) {
    if (manifest && manifest.rooftop && manifest.rooftop.scenes) return manifest.rooftop.scenes;
    return ROOF_LAYOUT;
  }

  function sceneProps(manifest, scene, st) {
    var src = roofScenes(manifest)[scene] || {};
    var out = {};
    Object.keys(src).forEach(function (k) { out[k] = src[k]; });
    if (scene === 'firstvisit' && st && st.planted && out['pot_dry_2@1']) {
      out['basil_planted@1'] = out['pot_dry_2@1'];
      delete out['pot_dry_2@1'];
    }
    return out;
  }

  function composedSrc(manifest, scene, night) {
    var which = scene === 'tidy' ? 'tidy' : 'firstvisit';
    var key = 'rooftop_' + (night ? 'night' : 'day') + '_' + which;
    var files = (manifest && manifest.files) || {};
    return files[key] ? artPath(files[key]) : null;
  }

  function roofBg(manifest, night) {
    var files = (manifest && manifest.files) || {};
    var key = night ? 'rooftop_night' : 'rooftop_day';
    if (files[key]) return artPath(files[key]);
    return PART + 'rooftop/rooftop_' + (night ? 'night' : 'day') + '.png';
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

  /* Rows y≥96 (tile rows 6..15) inside x 4..187. Props are blocked afterwards. */
  function baseWalkable(manifest) {
    var tile = (manifest && manifest.tile) || 16;
    var size = manifest.rooftop.size;
    var cols = Math.round(size[0] / tile);
    var rows = Math.round(size[1] / tile);
    var grid = [];
    var r, c;
    for (r = 0; r < rows; r++) {
      var line = [];
      for (c = 0; c < cols; c++) {
        var x0 = c * tile;
        var x1 = x0 + tile - 1;
        var y0 = r * tile;
        line.push(y0 >= 96 && x1 >= 4 && x0 <= 187 ? 1 : 0);
      }
      grid.push(line);
    }
    function copy() { return grid.map(function (row) { return row.slice(); }); }
    var door = manifest.rooftop.door;
    var entry = [Math.floor((door[1] + door[3] - tile / 2) / tile), Math.floor((door[0] + 1) / tile)];
    return {
      tile: tile, cols: cols, rows: rows, entry_tile: entry,
      layouts: { firstvisit: copy(), tidy: copy(), empty: copy() }
    };
  }

  function correctWalkable(walkable, manifest) {
    var tile = walkable.tile || 16;
    var cols = walkable.cols;
    var rows = walkable.rows;
    var door = manifest.rooftop.door;
    var scenes = roofScenes(manifest);
    var layouts = {};
    var blocked = {};
    Object.keys(walkable.layouts).forEach(function (name) {
      var g = walkable.layouts[name].map(function (row) { return row.slice(); });
      var scene = scenes[name] || null;
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
          var rr, cc;
          for (rr = r0; rr <= r1; rr++) {
            for (cc = c0; cc <= c1; cc++) {
              if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
              if (g[rr][cc] === 1) extra.push([rr, cc]);
              g[rr][cc] = 0;
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
    spriteLeaf: spriteLeaf,
    partNames: partNames,
    partSrc: partSrc,
    partBox: partBox,
    gardenBg: gardenBg,
    roofScenes: roofScenes,
    sceneProps: sceneProps,
    composedSrc: composedSrc,
    roofBg: roofBg,
    propRect: propRect,
    baseWalkable: baseWalkable,
    correctWalkable: correctWalkable,
    ROOF_LAYOUT: ROOF_LAYOUT
  };
  root.A411 = root.A411 || {};
  root.A411.GardenArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
