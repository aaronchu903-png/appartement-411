/* Soir: out = base * ([0.26,0.29,0.45] + glow*[0.95,0.70,0.36]), glow capped at 1.2,
 * then the window pane mixes 30% of that with 70% rgb(60,50,110).
 * Nuit still uses the v2.5 grade and a normal zone blend.
 * lit = 1 - Π(1 - m_i)
 * m is the zone mask, raised to maskPower when a time sets one (1 leaves it alone)
 * a = floor(max(minAlpha, maxAlpha * (1 - lit))) / 255
 * darkened = base * (1 - a*(1 - MUL)) + highpass(base) * LIFT * a + ADD * a
 * highpass = base - box blur (radius 1)
 * Zones then combine as spec.blend:
 *   normal  — alpha-over at alpha glow * m^1.4 (the old fog)
 *   add     — darkened + zone_rgb * m * intensity
 * If spec.shoulder is set, a peak above the knee scales all three channels
 * together toward the limit, so a hot core stays the same hue instead of clipping red.
 *   lighten — max(darkened, zone_rgb * m)
 *   screen  — screen(darkened, zone_rgb * m * intensity)
 * No rim light and no brightness floor. Pure buffers, no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HubLights = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var lutK = null, lutP = null, lutA = null;

  function glowLut(k, pow) {
    if (lutA && lutK === k && lutP === pow) return lutA;
    lutK = k;
    lutP = pow;
    lutA = new Float64Array(256);
    for (var a = 0; a < 256; a++) lutA[a] = k * Math.pow(a / 255, pow);
    return lutA;
  }

  function approach(current, target, dt, fadeMs) {
    if (fadeMs <= 0) return target;
    if (dt <= 0 || current === target) return current;
    var step = dt / fadeMs;
    if (current < target) return Math.min(target, current + step);
    return Math.max(target, current - step);
  }

  function prepareLights(w, h, zones, spec) {
    var count = zones.length;
    var n = w * h;
    var alpha = new Uint8Array(n);
    var glow = new Uint8ClampedArray(n * 4);
    var add = new Float32Array(n * 3);
    var lift = new Float32Array(n * 3);
    var maxA = spec.maxAlpha;
    var minA = spec.minAlpha || 0;
    var gk = spec.glow == null ? 0.42 : spec.glow;
    var pow = spec.glowPower == null ? 1.4 : spec.glowPower;
    var maskPower = spec.maskPower == null ? 1 : spec.maskPower;
    var masks = new Array(count);
    var weights = new Array(count);
    var cols = new Array(count);
    var shade = new Array(count);
    var steady = true;
    var z, wgt;
    for (z = 0; z < count; z++) {
      masks[z] = zones[z].mask;
      wgt = zones[z].weight == null ? 1 : zones[z].weight;
      weights[z] = wgt;
      cols[z] = zones[z].color;
      shade[z] = zones[z].keepNight ? false : true;
      if (wgt !== 0 && wgt !== 1) steady = false;
    }
    var lut = steady ? glowLut(gk, pow) : null;
    var ms = new Float64Array(count);
    var i, o, m, unlit, na, a, gr, gg, gb, ga, outA;
    for (i = 0; i < n; i++) {
      unlit = 1;
      for (z = 0; z < count; z++) {
        wgt = weights[z];
        if (wgt <= 0) { ms[z] = 0; continue; }
        m = (masks[z][i] / 255) * wgt;
        if (m > 1) m = 1;
        if (maskPower !== 1 && m > 0 && m < 1) m = Math.pow(m, maskPower);
        if (zones[z].strength != null) m *= zones[z].strength;
        if (m < 0) m = 0;
        else if (m > 1) m = 1;
        ms[z] = m;
        if (shade[z]) unlit *= (1 - m);
      }
      na = maxA * unlit;
      if (na < minA) na = minA;
      alpha[i] = na <= 0 ? 0 : (na >= 255 ? 255 : Math.floor(na + 1e-6));
      gr = 0; gg = 0; gb = 0; ga = 0;
      var ar = 0, ag = 0, ab = 0, lr = 0, lg = 0, lb = 0, cr, cg, cb;
      o = i * 4;
      for (z = 0; z < count; z++) {
        m = ms[z];
        if (m <= 0) continue;
        if (lut && weights[z] === 1 && maskPower === 1) a = lut[masks[z][i]];
        else a = gk * Math.pow(m, pow);
        if (a > 1) a = 1;
        outA = a + ga * (1 - a);
        if (outA > 0) {
          gr = (cols[z][0] * a + gr * ga * (1 - a)) / outA;
          gg = (cols[z][1] * a + gg * ga * (1 - a)) / outA;
          gb = (cols[z][2] * a + gb * ga * (1 - a)) / outA;
        }
        ga = outA;
        cr = cols[z][0] * m;
        cg = cols[z][1] * m;
        cb = cols[z][2] * m;
        ar += cr * gk;
        ag += cg * gk;
        ab += cb * gk;
        if (cr > lr) lr = cr;
        if (cg > lg) lg = cg;
        if (cb > lb) lb = cb;
      }
      glow[o] = Math.round(gr);
      glow[o + 1] = Math.round(gg);
      glow[o + 2] = Math.round(gb);
      glow[o + 3] = ga <= 0 ? 0 : (ga >= 1 ? 255 : Math.round(ga * 255));
      add[i * 3] = ar;
      add[i * 3 + 1] = ag;
      add[i * 3 + 2] = ab;
      lift[i * 3] = lr;
      lift[i * 3 + 1] = lg;
      lift[i * 3 + 2] = lb;
    }
    return { alpha: alpha, glow: glow, add: add, lift: lift };
  }

  function shoulder(v, knee, limit) {
    if (v <= knee) return v;
    var span = limit - knee;
    var x = (v - knee) / span;
    return knee + span * (1 - Math.exp(-x));
  }

  function applyGrade(world, w, h, alpha, light, spec) {
    var pack = light && light.add && light.glow;
    var glow = pack ? light.glow : light;
    var addBuf = pack ? light.add : null;
    var liftBuf = pack ? light.lift : null;
    var blend = spec.blend || 'normal';
    var mul = spec.mul;
    var lift = spec.lift;
    var add = spec.add;
    var out = new Uint8ClampedArray(world.length);
    function at(x, y, c) {
      if (x < 0) x = 0;
      else if (x >= w) x = w - 1;
      if (y < 0) y = 0;
      else if (y >= h) y = h - 1;
      return world[(y * w + x) * 4 + c];
    }
    var y, x, i, o, c, a, base, blur, dx, dy, m, v, ga, rgb, peak, mapped, scale;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        o = i * 4;
        a = alpha ? alpha[i] / 255 : 0;
        ga = blend === 'normal' && glow ? glow[o + 3] / 255 : 0;
        rgb = [0, 0, 0];
        for (c = 0; c < 3; c++) {
          base = world[o + c];
          blur = 0;
          for (dy = -1; dy <= 1; dy++) {
            for (dx = -1; dx <= 1; dx++) blur += at(x + dx, y + dy, c);
          }
          blur /= 9;
          m = 1 - a * (1 - mul[c]);
          v = base * m + (base - blur) * lift * a + add[c] * a;
          if (spec.floorWarm && y >= spec.floorWarm.y) {
            var reach = h - spec.floorWarm.y;
            var ramp = 0.5 + 0.5 * (reach > 0 ? (y - spec.floorWarm.y) / reach : 1);
            if (ramp > 1) ramp = 1;
            v += spec.floorWarm.add[c] * a * ramp;
          }
          if (blend === 'add' && addBuf) v += addBuf[i * 3 + c];
          else if (blend === 'lighten' && liftBuf) {
            var L = liftBuf[i * 3 + c];
            if (L > v) v = L;
          } else if (blend === 'screen' && addBuf) {
            var S = addBuf[i * 3 + c];
            if (S < 0) S = 0;
            else if (S > 255) S = 255;
            v = 255 - (255 - v) * (255 - S) / 255;
          } else if (ga) v = v * (1 - ga) + glow[o + c] * ga;
          if (v < 0) v = 0;
          rgb[c] = v;
        }
        if (spec.shoulder) {
          peak = rgb[0];
          if (rgb[1] > peak) peak = rgb[1];
          if (rgb[2] > peak) peak = rgb[2];
          if (peak > spec.shoulder.knee) {
            mapped = shoulder(peak, spec.shoulder.knee, spec.shoulder.limit);
            scale = peak > 0 ? mapped / peak : 1;
            rgb[0] *= scale;
            rgb[1] *= scale;
            rgb[2] *= scale;
          }
        }
        for (c = 0; c < 3; c++) {
          v = rgb[c];
          if (v < 0) v = 0;
          else if (v > 255) v = 255;
          out[o + c] = Math.round(v);
        }
        out[o + 3] = world[o + 3];
      }
    }
    return out;
  }

  function buildLightMap(w, h, spec) {
    var cool = spec.cool;
    var warm = spec.warm;
    var cap = spec.cap == null ? 1.2 : spec.cap;
    var lamps = spec.lamps || [];
    var map = new Float32Array(w * h * 3);
    var y, x, i, g, k, lamp, dx, dy;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        g = 0;
        for (k = 0; k < lamps.length; k++) {
          lamp = lamps[k];
          dx = x - lamp.x;
          dy = y - lamp.y;
          g += lamp.s * Math.exp(-(dx * dx + dy * dy) / (2 * lamp.r * lamp.r));
        }
        if (g > cap) g = cap;
        else if (g < 0) g = 0;
        i = (y * w + x) * 3;
        map[i] = cool[0] + g * warm[0];
        map[i + 1] = cool[1] + g * warm[1];
        map[i + 2] = cool[2] + g * warm[2];
      }
    }
    return map;
  }

  function applyMultiply(world, w, h, map, windowSpec) {
    var out = new Uint8ClampedArray(world.length);
    var mix = windowSpec ? windowSpec.mix : 0;
    var keep = 1 - mix;
    var wx0 = windowSpec ? windowSpec.x : 0;
    var wy0 = windowSpec ? windowSpec.y : 0;
    var wx1 = windowSpec ? windowSpec.x + windowSpec.w : 0;
    var wy1 = windowSpec ? windowSpec.y + windowSpec.h : 0;
    var wc = windowSpec ? windowSpec.color : null;
    var y, x, i, o, c, v, inside;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        o = i * 4;
        inside = windowSpec && x >= wx0 && x < wx1 && y >= wy0 && y < wy1;
        for (c = 0; c < 3; c++) {
          v = world[o + c] * map[i * 3 + c];
          if (inside) v = v * keep + wc[c] * mix;
          if (v < 0) v = 0;
          else if (v > 255) v = 255;
          out[o + c] = Math.round(v);
        }
        out[o + 3] = world[o + 3];
      }
    }
    return out;
  }

  return {
    approach: approach,
    prepareLights: prepareLights,
    applyGrade: applyGrade,
    buildLightMap: buildLightMap,
    applyMultiply: applyMultiply
  };
});
