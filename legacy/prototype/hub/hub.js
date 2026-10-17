/* L'Appartement 411 — walkable apartment hub (prototype, not wired into the game).
 * Day (A), evening (E) and midnight (M). D is an alias of midnight.
 * Soir multiplies the unlit picture by a precomputed light map, then mixes the window.
 * Nuit grades with the v2.5 multiply + high-pass, then normal-blends its zones. */
(function () {
  var FACINGS = ['down', 'up', 'left', 'right'];
  var room, scale = 0, reduced = false;
  var mapW, mapH, tile;
  var sprites = new Map();
  var styles = {};
  var active = null;
  var ellipse = null;
  var shadowFrame, shadowCtx, world, worldCtx;
  var canvas, ctx, motes = [];
  var state;
  var zoneWeights = {};
  var lightStamp = 0;
  var lightKey = '';
  var lightPrep = null;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error(src)); };
      img.src = src;
    });
  }

  function blit(img, mapX, mapY) {
    worldCtx.drawImage(img, Math.round(mapX), Math.round(mapY));
  }

  function fillMap(mx, my, color, alpha) {
    worldCtx.globalAlpha = alpha == null ? 1 : alpha;
    worldCtx.fillStyle = color;
    worldCtx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    worldCtx.globalAlpha = 1;
  }

  function expandPattern(pattern, frames) {
    var names = [];
    var hasFacing = pattern.indexOf('{facing}') >= 0;
    for (var f = 0; f < frames; f++) {
      if (hasFacing) {
        for (var d = 0; d < FACINGS.length; d++) names.push(pattern.replace('{facing}', FACINGS[d]).replace('{frame}', String(f)));
      } else names.push(pattern.replace('{frame}', String(f)));
    }
    return names;
  }

  function idleFrame(f) {
    if (reduced) return 0;
    if (f % 16 === 14) return 3;
    return [0, 1, 2, 1][Math.floor(f / 2) % 4];
  }

  function spriteNamed(pattern, facing, frame) {
    return sprites.get(pattern.replace('{facing}', facing || 'down').replace('{frame}', String(frame)));
  }

  function makeEllipse(w, h, rgba) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    var img = g.createImageData(w, h);
    var cx = (w - 1) / 2, cy = (h - 1) / 2, rx = w / 2, ry = h / 2;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var nx = (x - cx) / rx, ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          var o = (y * w + x) * 4;
          img.data[o] = rgba[0];
          img.data[o + 1] = rgba[1];
          img.data[o + 2] = rgba[2];
          img.data[o + 3] = rgba[3];
        }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function imageDataOf(img) {
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, c.width, c.height);
  }

  function maskOf(img) {
    if (img.width !== mapW || img.height !== mapH) throw new Error('light zone is not the map size');
    var data = imageDataOf(img);
    var n = mapW * mapH;
    var mask = new Uint8Array(n);
    var color = [0, 0, 0];
    var best = -1;
    var d = data.data;
    for (var i = 0; i < n; i++) {
      var a = d[i * 4 + 3];
      mask[i] = a;
      if (a > best) {
        best = a;
        color = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
      }
    }
    return { mask: mask, color: color };
  }

  function cleanShadow(img, points) {
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    var data = g.getImageData(0, 0, c.width, c.height);
    for (var p = 0; p < points.length; p++) {
      var fx = points[p][0], fy = points[p][1];
      for (var y = fy - 3; y <= fy + 3; y++) {
        for (var x = fx - 8; x <= fx + 8; x++) {
          if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
          var o = (y * c.width + x) * 4 + 3;
          if (data.data[o] >= 100) data.data[o] = 0;
        }
      }
    }
    g.putImageData(data, 0, 0);
    return c;
  }

  function expandHit(rect, min) {
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    if (w < min) { x -= (min - w) / 2; w = min; }
    if (h < min) { y -= (min - h) / 2; h = min; }
    return { x: x, y: y, w: w, h: h };
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  async function loadStyle(id) {
    if (styles[id]) return styles[id];
    var spec = room.styles[id];
    var base = spec.dir;
    var floor = await loadImage(base + spec.floor);
    var furn = await (await fetch(base + spec.furniture)).json();
    var walk = await (await fetch(base + spec.walkable)).json();
    if (walk.cols !== room.cols || walk.rows !== room.rows || walk.tile !== room.tile) {
      throw new Error('walkable.json does not match room.json');
    }
    var frames = {};
    var still = {};
    var names = Object.keys(furn);
    var jobs = [];
    for (var i = 0; i < names.length; i++) {
      (function (name) {
        var anim = spec.spriteFrames && spec.spriteFrames[name];
        if (anim) {
          frames[name] = [];
          for (var f2 = 0; f2 < anim.frames; f2++) {
            (function (frame) {
              jobs.push(loadImage(base + anim.pattern.replace('{frame}', String(frame))).then(function (img) {
                frames[name][frame] = img;
              }));
            })(f2);
          }
        } else {
          jobs.push(loadImage(base + 'furniture/' + name + '.png').then(function (img) { still[name] = img; }));
        }
      })(names[i]);
    }
    var curtains = [];
    for (var c = 0; c < spec.curtains.length; c++) {
      (function (curtain) {
        var imgs = [];
        curtains.push({ x: curtain.x, y: curtain.y, frames: imgs });
        for (var f = 0; f < curtain.frames; f++) {
          (function (frame) {
            jobs.push(loadImage(base + curtain.pattern.replace('{frame}', String(frame))).then(function (img) {
              imgs[frame] = img;
            }));
          })(f);
        }
      })(spec.curtains[c]);
    }
    var light = spec.light || {};
    var under = [], beforeGrade = [], over = [], overhead = [];
    function queueLayer(list, entry) {
      var layer = { img: null, cleaned: null, contactShadow: !!entry.contactShadow };
      list.push(layer);
      jobs.push(loadImage(base + entry.src).then(function (img) {
        layer.img = img;
        if (layer.contactShadow) layer.cleaned = cleanShadow(img, room.dropBakedShadows || []);
      }));
    }
    var u, o, h;
    for (u = 0; u < (light.under || []).length; u++) queueLayer(under, light.under[u]);
    for (o = 0; o < (light.beforeGrade || []).length; o++) queueLayer(beforeGrade, light.beforeGrade[o]);
    for (o = 0; o < (light.over || []).length; o++) queueLayer(over, light.over[o]);
    for (h = 0; h < (spec.overhead || []).length; h++) {
      (function (entry) {
        var item = { x: entry.x, y: entry.y, img: null };
        overhead.push(item);
        jobs.push(loadImage(base + entry.src).then(function (img) { item.img = img; }));
      })(spec.overhead[h]);
    }
    var multiply = null;
    if (light.multiply) {
      multiply = { window: light.multiply.window || null, map: null };
      jobs.push(loadImage(base + light.multiply.src).then(function (img) {
        if (img.width !== mapW || img.height !== mapH) throw new Error('light map is not the map size');
        var data = imageDataOf(img).data;
        var map = new Float32Array(mapW * mapH * 3);
        var n = mapW * mapH;
        for (var p = 0; p < n; p++) {
          map[p * 3] = data[p * 4] / 255 * 2;
          map[p * 3 + 1] = data[p * 4 + 1] / 255 * 2;
          map[p * 3 + 2] = data[p * 4 + 2] / 255 * 2;
        }
        multiply.map = map;
      }));
    }
    var zones = null;
    if (light.zones) {
      zones = { items: [] };
      var zitems = light.zones.items;
      for (var zi = 0; zi < zitems.length; zi++) {
        (function (entry) {
          var item = {
            id: entry.id, label: entry.label,
            color: entry.color || [255, 255, 255],
            lockColor: !!entry.color,
            keepNight: !!entry.keepNight,
            strength: entry.strength == null ? 1 : entry.strength,
            masks: []
          };
          zones.items.push(item);
          var count = entry.frames || 1;
          for (var fi = 0; fi < count; fi++) {
            (function (frame) {
              var src = entry.frames
                ? entry.framePattern.replace('{frame}', (frame < 10 ? '0' : '') + frame)
                : entry.src;
              jobs.push(loadImage(base + src).then(function (img) {
                var packed = maskOf(img);
                item.masks[frame] = packed.mask;
                if (frame === 0 && !item.lockColor) item.color = packed.color;
              }));
            })(fi);
          }
        })(zitems[zi]);
      }
    }
    await Promise.all(jobs);
    var objects = [];
    var spots = [];
    for (var n = 0; n < names.length; n++) {
      var name = names[n];
      var meta = furn[name];
      var decal = /decal/i.test(meta.note || '');
      var obj = {
        name: name,
        decal: decal,
        anchor: meta.anchor,
        placed_at: meta.placed_at,
        size: meta.size,
        frames: frames[name] || null,
        img: still[name] || null
      };
      var hitBase = {
        x: meta.placed_at[0] - meta.anchor[0],
        y: meta.placed_at[1] - meta.anchor[1],
        w: meta.size[0],
        h: meta.size[1]
      };
      var specHot = room.hotspots[name];
      if (specHot) {
        var hit = specHot.hit
          ? { x: specHot.hit[0], y: specHot.hit[1], w: specHot.hit[2], h: specHot.hit[3] }
          : expandHit(hitBase, 22);
        obj.hotspot = {
          id: specHot.id,
          label: specHot.label,
          object: name,
          exit: specHot.exit || null,
          approach: specHot.approach.map(function (a) { return { c: a.col, r: a.row, face: a.face }; }),
          hit: hit,
          footY: meta.placed_at[1]
        };
        spots.push(obj.hotspot);
      }
      objects.push(obj);
    }
    styles[id] = {
      id: id,
      floor: floor,
      grid: walk.walkable,
      exits: walk.exits,
      objects: objects,
      spots: spots,
      curtains: curtains,
      under: under,
      beforeGrade: beforeGrade,
      over: over,
      overhead: overhead,
      zones: zones,
      multiply: multiply,
      grade: light.grade || null,
      fadeMs: (light.zones && light.zones.fadeMs != null) ? light.zones.fadeMs : 700
    };
    return styles[id];
  }

  function navFrom() {
    if (state.step) return { c: state.step.c, r: state.step.r };
    return { c: state.c, r: state.r };
  }

  function takeStep() {
    if (!state.path.length) {
      state.step = null;
      state.marker = null;
      var fn = state.arrive;
      state.arrive = null;
      if (fn) fn();
      return;
    }
    var next = state.path.shift();
    var facing = HubPath.facingBetween({ c: state.c, r: state.r }, next) || state.facing;
    state.facing = facing;
    state.step = {
      x0: state.x, y0: state.y,
      x1: next.c * tile + 8, y1: next.r * tile + 12,
      t0: performance.now(),
      dur: reduced ? 0 : room.timing.stepMs,
      c: next.c, r: next.r, facing: facing
    };
  }

  function goTo(goal, arrive) {
    var from = navFrom();
    var path = HubPath.findPath(active.grid, from, { c: goal.c, r: goal.r });
    if (!path) return false;
    state.arrive = arrive || null;
    state.marker = { c: goal.c, r: goal.r };
    state.path = path.slice(1);
    if (!state.step) takeStep();
    return true;
  }

  function emitHook(spot) {
    var detail = { id: spot.id, label: spot.label, object: spot.object, exit: spot.exit };
    state.hook = detail;
    document.getElementById('hook').textContent = '\u00ab ' + spot.label + ' \u00bb';
    window.dispatchEvent(new CustomEvent('hub:hook', { detail: detail }));
  }

  function interact(spot) {
    var approach = HubPath.pickApproach(active.grid, navFrom(), spot.approach);
    if (!approach) return;
    goTo(approach, function () {
      state.facing = approach.face;
      emitHook(spot);
    });
  }

  var lastTap = 0;
  function onTap(cx, cy) {
    var now = performance.now();
    if (now - lastTap < 40) return;
    lastTap = now;
    var rect = canvas.getBoundingClientRect();
    var mx = (cx - rect.left) * (mapW / rect.width);
    var my = (cy - rect.top) * (mapH / rect.height);
    if (mx < 0 || my < 0 || mx >= mapW || my >= mapH) return;
    var spots = active.spots.slice().sort(function (a, b) { return b.footY - a.footY; });
    for (var i = 0; i < spots.length; i++) {
      var h = spots[i].hit;
      if (mx >= h.x && my >= h.y && mx < h.x + h.w && my < h.y + h.h) {
        interact(spots[i]);
        return;
      }
    }
    var c = Math.floor(mx / tile), r = Math.floor(my / tile);
    if (!HubPath.isWalkable(active.grid, c, r)) return;
    goTo({ c: c, r: r }, null);
  }

  function update(now) {
    var guard = 0;
    while (state.step && guard++ < 500) {
      var step = state.step;
      var t = step.dur <= 0 ? 1 : Math.min(1, (now - step.t0) / step.dur);
      state.x = step.x0 + (step.x1 - step.x0) * t;
      state.y = step.y0 + (step.y1 - step.y0) * t;
      state.facing = step.facing;
      if (t < 1) break;
      state.x = step.x1;
      state.y = step.y1;
      state.c = step.c;
      state.r = step.r;
      state.step = null;
      takeStep();
    }
  }

  function resolveStyle(id) {
    if (room.aliases && room.aliases[id]) return room.aliases[id];
    return id;
  }

  function currentLights() {
    if (!active || !active.zones) return [];
    var spec = room.scene && room.scene.lights;
    var list = null;
    if (Array.isArray(spec)) list = spec;
    else if (spec && spec[active.id]) list = spec[active.id];
    if (!list) {
      list = [];
      for (var i = 0; i < active.zones.items.length; i++) list.push(active.zones.items[i].id);
    }
    return list.slice();
  }

  function paintZoneButtons() {
    var buttons = document.querySelectorAll('#zones button');
    var on = currentLights();
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', on.indexOf(buttons[i].dataset.zone) >= 0 ? 'true' : 'false');
    }
  }

  function setLights(ids) {
    if (!active || !active.zones) return;
    var want = {};
    for (var i = 0; i < ids.length; i++) want[ids[i]] = true;
    var next = [];
    var items = active.zones.items;
    for (var j = 0; j < items.length; j++) if (want[items[j].id]) next.push(items[j].id);
    if (!room.scene) room.scene = {};
    if (!room.scene.lights || Array.isArray(room.scene.lights)) room.scene.lights = {};
    room.scene.lights[active.id] = next;
    lightKey = '';
    paintZoneButtons();
  }

  function toggleLight(id) {
    var cur = currentLights();
    var at = cur.indexOf(id);
    if (at >= 0) cur.splice(at, 1);
    else cur.push(id);
    setLights(cur);
  }

  function buildZoneToggles() {
    var bar = document.getElementById('zones');
    if (!bar) return;
    bar.textContent = '';
    if (!active || !active.zones) { bar.hidden = true; return; }
    bar.hidden = false;
    var items = active.zones.items;
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.zone = item.id;
        b.textContent = item.label;
        b.title = item.id;
        b.addEventListener('click', function () { toggleLight(item.id); });
        bar.appendChild(b);
      })(items[i]);
    }
    paintZoneButtons();
  }

  function syncLights(now) {
    if (!active || !active.zones) return;
    var selected = {};
    var list = currentLights();
    for (var i = 0; i < list.length; i++) selected[list[i]] = true;
    var fade = reduced ? 0 : active.fadeMs;
    var dt = lightStamp ? Math.min(100, now - lightStamp) : 0;
    lightStamp = now;
    var items = active.zones.items;
    for (var z = 0; z < items.length; z++) {
      var id = items[z].id;
      var key = active.id + ':' + id;
      var target = selected[id] ? 1 : 0;
      var st = zoneWeights[key];
      if (!st) { zoneWeights[key] = { w: target, target: target }; continue; }
      var next = HubLights.approach(st.w, target, dt, fade);
      if (next !== st.w) lightKey = '';
      st.w = next;
      st.target = target;
    }
  }

  function objectImage(obj, f) {
    if (obj.frames) return obj.frames[f % obj.frames.length];
    return obj.img;
  }

  function paintShadows() {
    shadowCtx.clearRect(0, 0, mapW, mapH);
    shadowCtx.drawImage(active.shadow, 0, 0);
    var w = room.footShadow.w, h = room.footShadow.h;
    var feet = [{ x: state.x, y: state.y }];
    for (var i = 0; i < room.actors.length; i++) feet.push({ x: room.actors[i].foot[0], y: room.actors[i].foot[1] });
    for (var f = 0; f < feet.length; f++) {
      shadowCtx.drawImage(ellipse, Math.round(feet[f].x - w / 2), Math.round(feet[f].y - h / 2));
    }
  }

  function drawMarker() {
    if (!state.marker || (!state.step && !state.path.length)) return;
    var x0 = state.marker.c * tile, y0 = state.marker.r * tile;
    for (var i = 2; i < tile - 2; i += 2) {
      fillMap(x0 + i, y0 + 1, '#f6a54a', 1);
      fillMap(x0 + i, y0 + tile - 2, '#f6a54a', 1);
      fillMap(x0 + 1, y0 + i, '#f6a54a', 1);
      fillMap(x0 + tile - 2, y0 + i, '#f6a54a', 1);
    }
  }

  function drawSteam(f) {
    var paper = room.ambient.paper;
    var color = 'rgb(' + paper[0] + ',' + paper[1] + ',' + paper[2] + ')';
    var sources = room.ambient.steam;
    for (var s = 0; s < sources.length; s++) {
      for (var i = 0; i < 3; i++) {
        var k = (f + i * 5) % 12;
        var alpha = Math.max(0, 200 - k * 15) / 255;
        var yy = sources[s].y - k;
        var xx = sources[s].x + Math.round(Math.sin((f + i * 5) / 2.5));
        fillMap(xx, yy, color, alpha);
      }
    }
  }

  function drawDust(f) {
    var dust = room.ambient.dust;
    if (!dust || dust.styles.indexOf(active.id) < 0) return;
    var paper = room.ambient.paper;
    var color = 'rgb(' + paper[0] + ',' + paper[1] + ',' + paper[2] + ')';
    for (var i = 0; i < motes.length; i++) {
      if ((f + i) % 5 === 0) continue;
      var m = motes[i];
      var yy = m.top + ((m.y0 - m.top + f * 1.5) % m.span);
      var xx = m.x0 + (yy - m.top) * 0.45 + Math.round(Math.sin(f / 3 + i));
      fillMap(xx, yy, color, 220 / 255);
    }
  }

  function yItems(f, now) {
    var moving = !!(state.step || state.path.length);
    var items = [];
    var objects = active.objects;
    for (var i = 0; i < objects.length; i++) {
      var obj = objects[i];
      if (obj.decal) continue;
      var img = objectImage(obj, f);
      items.push({
        y: obj.placed_at[1],
        tie: 0,
        img: img,
        x: obj.placed_at[0] - obj.anchor[0],
        y0: obj.placed_at[1] - obj.anchor[1]
      });
    }
    for (var a = 0; a < room.actors.length; a++) {
      var actor = room.actors[a];
      var def = room.sprites[actor.sprite];
      var aim = spriteNamed(def.idle, 'down', idleFrame(f));
      items.push({
        y: actor.foot[1], tie: 1, img: aim,
        x: actor.foot[0] - def.anchor[0],
        y0: actor.foot[1] - def.anchor[1]
      });
    }
    var player = room.sprites.player;
    var pFrame = moving ? (Math.floor(now / room.timing.walkFrameMs) % player.frames) : idleFrame(f);
    var pImg = spriteNamed(moving ? player.walk : player.idle, state.facing, pFrame);
    items.push({
      y: state.y, tie: 2, img: pImg,
      x: state.x - player.anchor[0],
      y0: state.y - player.anchor[1]
    });
    items.sort(function (a, b) { return a.y - b.y || a.tie - b.tie; });
    return items;
  }

  function ensureLights(f) {
    if (!active.grade) return null;
    var parts = [];
    var keyParts = [active.id, String(f % 16)];
    var items = active.zones ? active.zones.items : [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var st = zoneWeights[active.id + ':' + item.id];
      var wgt = st ? st.w : 0;
      keyParts.push(wgt.toFixed(3));
      if (wgt <= 0) continue;
      var frame = item.masks.length > 1 ? (f % item.masks.length) : 0;
      parts.push({
        color: item.color,
        mask: item.masks[frame],
        weight: wgt,
        keepNight: !!item.keepNight,
        strength: item.strength
      });
    }
    var key = keyParts.join('|');
    if (key !== lightKey) {
      lightPrep = HubLights.prepareLights(mapW, mapH, parts, active.grade);
      lightKey = key;
    }
    return lightPrep;
  }

  function draw(now) {
    if (!active || !worldCtx) return;
    var f = Math.floor(now / room.timing.ambientMs);
    if (f < 0) f = 0;
    syncLights(now);
    worldCtx.imageSmoothingEnabled = false;
    worldCtx.clearRect(0, 0, mapW, mapH);
    blit(active.floor, 0, 0);
    for (var c = 0; c < active.curtains.length; c++) {
      var curtain = active.curtains[c];
      blit(curtain.frames[f % curtain.frames.length], curtain.x, curtain.y);
    }
    for (var u = 0; u < active.under.length; u++) {
      var under = active.under[u];
      if (under.contactShadow) {
        active.shadow = under.cleaned;
        paintShadows();
        blit(shadowFrame, 0, 0);
      } else blit(under.img, 0, 0);
    }
    var objects = active.objects;
    for (var d = 0; d < objects.length; d++) {
      if (!objects[d].decal) continue;
      var dec = objects[d];
      blit(dec.img, dec.placed_at[0] - dec.anchor[0], dec.placed_at[1] - dec.anchor[1]);
    }
    drawMarker();
    var items = yItems(f, now);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      blit(item.img, Math.round(item.x), Math.round(item.y0));
    }
    drawSteam(f);
    for (var h = 0; h < active.overhead.length; h++) {
      var oh = active.overhead[h];
      blit(oh.img, oh.x, oh.y);
    }
    drawDust(f);
    for (var b = 0; b < active.beforeGrade.length; b++) blit(active.beforeGrade[b].img, 0, 0);
    if (active.multiply) {
      var mulPixels = worldCtx.getImageData(0, 0, mapW, mapH);
      var multiplied = HubLights.applyMultiply(mulPixels.data, mapW, mapH, active.multiply.map, active.multiply.window);
      worldCtx.putImageData(new ImageData(multiplied, mapW, mapH), 0, 0);
    } else if (active.grade) {
      var prep = ensureLights(f);
      var pixels = worldCtx.getImageData(0, 0, mapW, mapH);
      var graded = HubLights.applyGrade(pixels.data, mapW, mapH, prep.alpha, prep, active.grade);
      worldCtx.putImageData(new ImageData(graded, mapW, mapH), 0, 0);
    }
    for (var o = 0; o < active.over.length; o++) blit(active.over[o].img, 0, 0);
    if (scale < 1) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(world, 0, 0, mapW * scale, mapH * scale);
  }

  function fit() {
    var stage = document.getElementById('stage');
    var availW = stage.clientWidth || window.innerWidth;
    var availH = stage.clientHeight || (window.innerHeight - 76);
    var s = Math.floor(Math.min(availW / mapW, availH / mapH));
    if (s < 1) s = 1;
    if (s > 5) s = 5;
    if (s === scale && canvas.width === mapW * s) return;
    scale = s;
    canvas.width = mapW * scale;
    canvas.height = mapH * scale;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.dataset.scale = String(scale);
  }

  function loop(now) {
    update(now);
    draw(now);
    requestAnimationFrame(loop);
  }

  function setStyle(id) {
    id = resolveStyle(id);
    if (!styles[id] || (active && active.id === id)) return;
    active = styles[id];
    lightKey = '';
    var buttons = document.querySelectorAll('#times button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-time') === id ? 'true' : 'false');
    }
    buildZoneToggles();
    draw(performance.now());
  }

  function hotspotClientPoint(id) {
    var spot = null;
    for (var i = 0; i < active.spots.length; i++) if (active.spots[i].id === id) spot = active.spots[i];
    if (!spot) return null;
    var rect = canvas.getBoundingClientRect();
    var mx = spot.hit.x + spot.hit.w / 2, my = spot.hit.y + spot.hit.h / 2;
    return {
      x: rect.left + (mx / mapW) * rect.width,
      y: rect.top + (my / mapH) * rect.height
    };
  }

  async function boot() {
    canvas = document.getElementById('view');
    ctx = canvas.getContext('2d');
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    room = await (await fetch('room.json')).json();
    tile = room.tile;
    mapW = room.cols * tile;
    mapH = room.rows * tile;
    shadowFrame = document.createElement('canvas');
    shadowFrame.width = mapW;
    shadowFrame.height = mapH;
    shadowCtx = shadowFrame.getContext('2d');
    world = document.createElement('canvas');
    world.width = mapW;
    world.height = mapH;
    worldCtx = world.getContext('2d');
    var sh = room.footShadow;
    ellipse = makeEllipse(sh.w, sh.h, [sh.color[0], sh.color[1], sh.color[2], sh.alpha]);
    var dust = room.ambient.dust;
    var rand = mulberry32(dust.seed);
    for (var i = 0; i < dust.count; i++) {
      motes.push({
        x0: dust.x0 + rand() * (dust.x1 - dust.x0),
        y0: dust.y0 + rand() * (dust.y1 - dust.y0),
        top: dust.top,
        span: dust.span
      });
    }
    var spriteJobs = [];
    var keys = Object.keys(room.sprites);
    for (var s = 0; s < keys.length; s++) {
      if (keys[s] === 'dir') continue;
      var def = room.sprites[keys[s]];
      var patterns = [def.idle, def.walk];
      for (var p = 0; p < patterns.length; p++) {
        var names = expandPattern(patterns[p], def.frames);
        for (var n = 0; n < names.length; n++) {
          (function (name) {
            spriteJobs.push(loadImage(room.sprites.dir + name).then(function (img) { sprites.set(name, img); }));
          })(names[n]);
        }
      }
    }
    await Promise.all(spriteJobs);
    var params = new URLSearchParams(location.search);
    var asked = params.get('style');
    var initial = asked ? resolveStyle(asked) : (room.defaultStyle || 'A');
    var times = room.times || [{ id: 'A' }, { id: 'E' }, { id: 'M' }];
    var timeBar = document.getElementById('times');
    for (var t = 0; t < times.length; t++) {
      (function (entry) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.time = entry.id;
        b.textContent = entry.label;
        b.addEventListener('click', function () { setStyle(entry.id); });
        timeBar.appendChild(b);
      })(times[t]);
    }
    await Promise.all([loadStyle('A'), loadStyle('E'), loadStyle('M')]);
    state = {
      c: room.spawn.col, r: room.spawn.row, facing: room.spawn.facing,
      x: room.spawn.col * tile + 8, y: room.spawn.row * tile + 12,
      step: null, path: [], arrive: null, marker: null, hook: null
    };
    active = null;
    setStyle(initial);
    canvas.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      onTap(e.clientX, e.clientY);
    });
    canvas.addEventListener('touchend', function (e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      onTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });
    window.addEventListener('resize', function () { fit(); draw(performance.now()); });
    if (window.ResizeObserver) new ResizeObserver(function () { fit(); draw(performance.now()); }).observe(document.getElementById('stage'));
    window.Hub = {
      ready: false,
      player: function () {
        return {
          c: state.c, r: state.r, facing: state.facing,
          moving: !!(state.step || state.path.length)
        };
      },
      lastHook: function () { return state.hook; },
      style: function () { return active && active.id; },
      setStyle: setStyle,
      lights: function () { return currentLights(); },
      setLights: setLights,
      toggleLight: toggleLight,
      lightWeight: function (id) {
        var st = zoneWeights[active.id + ':' + id];
        return st ? st.w : 0;
      },
      hotspotClientPoint: hotspotClientPoint,
      scale: function () { return scale; }
    };
    requestAnimationFrame(function () {
      fit();
      draw(performance.now());
      window.Hub.ready = true;
      requestAnimationFrame(loop);
    });
  }

  boot().catch(function (err) {
    var hook = document.getElementById('hook');
    if (hook) hook.textContent = 'Impossible de charger la pièce.';
    console.error(err);
  });
})();
