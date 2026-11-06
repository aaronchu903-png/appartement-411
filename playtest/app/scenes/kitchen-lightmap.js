/**
 * Port of packs/b/kitchen/gen_kitchen.py lightmap() + grade() (deterministic).
 * Multiply maps are linear factors (not PNG /127.5). Add maps are 0..254 per channel.
 */

export const KITCHEN_STAGE_W = 192;
export const KITCHEN_STAGE_H = 144;
export const KITCHEN_LIGHT_CAP = 1.2;
const COOL_T = [0.24, 0.31, 0.43];
const WARM = [0.95, 0.7, 0.36];
const WIN = { x0: 32, y0: 79, x1: 59, y1: 100 };

function stepsAt(d, r, n = 3, dither = true, x = 0, y = 0) {
  const t = Math.max(0, Math.min(1, (1 - d / r) * n));
  const lv = Math.floor(t);
  const fr = t - lv;
  const dith = dither && ((x + y) % 2 === 0) && fr > 0.75;
  return Math.min(lv + (dith ? 1 : 0), n) / n;
}

function ell(xx, yy, cx, cy, rx, ry) {
  return Math.hypot((xx - cx) / rx, (yy - cy) / ry);
}

/**
 * @param {'evening'|'night'} variant
 * @param {boolean} fill — night table multiply lift (fill=False on bare wall)
 */
export function kitchenLightmap(variant, fill = true) {
  const W = KITCHEN_STAGE_W;
  const H = KITCHEN_STAGE_H;
  const n = W * H;
  const M = new Float32Array(n * 3);
  const A = new Float32Array(n * 3);

  if (variant === 'night') {
    const baseR = COOL_T[0] * 1.25;
    const baseG = COOL_T[1] * 1.25;
    const baseB = COOL_T[2] * 1.25;
    const WA = [255 / 255, 150 / 255, 50 / 255];
    const warmLift = [WARM[0] * 1.1, WARM[1] * 1.1, WARM[2] * 1.1];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        let mr = baseR;
        let mg = baseG;
        let mb = baseB;

        const P = 0.55 * (fill ? 1 : 0) * ((x >= 90 && x <= 146 && y >= 110 && y <= 137) ? 1 : 0);
        mr += P * (warmLift[0] - mr);
        mg += P * (warmLift[1] - mg);
        mb += P * (warmLift[2] - mb);

        const fe = ell(x, y, 118, 135, 36, 5);
        let flo = 0;
        if (fe <= 0.6) flo = 60;
        else if (fe <= 1) flo = 32;
        if (y < 129) flo = 0;
        const top = ell(x, y, 118, 117, 25, 2.6) <= 1 ? 90 : 0;
        const addVal = Math.max(0, top, flo);
        A[i] = addVal * WA[0];
        A[i + 1] = addVal * WA[1];
        A[i + 2] = addVal * WA[2];

        const cs = ((y >= 116 && y <= 118 && x >= 23 && x <= 69) ? 60 : 0)
          + ((y >= 113 && y <= 115 && x >= 25 && x <= 67) ? 18 : 0);
        A[i] += cs * WA[0];
        A[i + 1] += cs * WA[1];
        A[i + 2] += cs * WA[2];

        const sh = x - (y - 100) * 0.35;
        let mo = 0;
        if (sh >= 39 && sh <= 53) mo = 0.32;
        else if (sh >= 34 && sh <= 58) mo = 0.18;
        if (y <= 100) mo = 0;
        const moon = [0.7, 0.8, 0.92];
        mr += mo * (moon[0] - mr);
        mg += mo * (moon[1] - mg);
        mb += mo * (moon[2] - mb);

        const poolD = ell(x, y, 165, 114, 12, 8);
        const poolS = stepsAt(poolD, 1, 3, true, x, y) * 0.8;
        const poolC = [0.55, 0.75, 1.0];
        mr += poolS * (poolC[0] - mr);
        mg += poolS * (poolC[1] - mg);
        mb += poolS * (poolC[2] - mb);

        M[i] = mr;
        M[i + 1] = mg;
        M[i + 2] = mb;
      }
    }

    for (let y = WIN.y0; y <= WIN.y1; y++) {
      for (let x = WIN.x0; x <= WIN.x1; x++) {
        const i = (y * W + x) * 3;
        M[i] = 1;
        M[i + 1] = 1;
        M[i + 2] = 1;
        A[i] = 0;
        A[i + 1] = 0;
        A[i + 2] = 0;
      }
    }
    for (let y = 112; y < 119; y++) {
      for (let x = 157; x < 173; x++) {
        const i = (y * W + x) * 3;
        M[i] = Math.max(M[i], 1);
        M[i + 1] = Math.max(M[i + 1], 1);
        M[i + 2] = Math.max(M[i + 2], 1);
      }
    }
  } else if (variant === 'evening') {
    const base = [0.86, 0.78, 0.7];
    const patchCol = [1.2, 1.02, 0.72];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        const corner = stepsAt(Math.abs(x - 96) / 1, 96, 3, false, x, y);
        const scale = 0.72 + 0.28 * corner;
        let mr = base[0] * scale;
        let mg = base[1] * scale;
        let mb = base[2] * scale;

        const u = x - 52 - (y - 79) * -0.9;
        const wallp = u >= 30 && u <= 70 && y >= 84 && y <= 125;
        const floorp = y >= 129 && x >= 64 && x <= 150;
        const P = stepsAt(Math.abs(x - 110) / 1, 60, 2, false, x, y);
        const patch = wallp ? 1 : (floorp ? 0.6 : 0);
        mr += patch * P * (patchCol[0] - mr);
        mg += patch * P * (patchCol[1] - mg);
        mb += patch * P * (patchCol[2] - mb);

        M[i] = mr;
        M[i + 1] = mg;
        M[i + 2] = mb;
      }
    }
    for (let y = WIN.y0; y <= WIN.y1; y++) {
      for (let x = WIN.x0; x <= WIN.x1; x++) {
        const i = (y * W + x) * 3;
        M[i] = 1;
        M[i + 1] = 1;
        M[i + 2] = 1;
      }
    }
  }

  for (let i = 0; i < n * 3; i++) {
    M[i] = Math.max(0, Math.min(KITCHEN_LIGHT_CAP, M[i]));
    A[i] = Math.max(0, Math.min(254, A[i]));
  }

  return { M, A, W, H };
}

export function kitchenLightVariantKey(lightVariant) {
  return lightVariant === 'evening' ? 'evening' : 'night';
}

function multiplyFactor(mr, strength) {
  if (strength === 1) return mr;
  if (mr < 1) return 1 + (mr - 1) * strength;
  return 1 + (mr - 1) * 0.6 * strength;
}

/**
 * @param {number} strength — 1.0 room/furniture, 0.25 cast multiply
 * @param {number} addStrength — 1.0 room, 0.6 cast add
 */
export function gradeKitchenRgb(r, g, b, a, mr, mg, mb, ar, ag, ab, strength = 1, addStrength = 1) {
  if (a === 0) return [r, g, b, a];
  const fr = multiplyFactor(mr, strength);
  const fg = multiplyFactor(mg, strength);
  const fb = multiplyFactor(mb, strength);
  let nr = r * fr;
  let ng = g * fg;
  let nb = b * fb;
  if (ar !== 0 || ag !== 0 || ab !== 0) {
    nr += ar * addStrength;
    ng += ag * addStrength;
    nb += ab * addStrength;
  }
  return [
    Math.min(255, Math.max(0, nr)),
    Math.min(255, Math.max(0, ng)),
    Math.min(255, Math.max(0, nb)),
    a
  ];
}

export function kitchenMultiplyAt(M, x, y, W = KITCHEN_STAGE_W) {
  const mx = Math.max(0, Math.min(W - 1, Math.floor(x)));
  const my = Math.max(0, Math.min(KITCHEN_STAGE_H - 1, Math.floor(y)));
  const i = (my * W + mx) * 3;
  return [M[i], M[i + 1], M[i + 2]];
}

export function kitchenAddAt(A, x, y, W = KITCHEN_STAGE_W) {
  const mx = Math.max(0, Math.min(W - 1, Math.floor(x)));
  const my = Math.max(0, Math.min(KITCHEN_STAGE_H - 1, Math.floor(y)));
  const i = (my * W + mx) * 3;
  return [A[i], A[i + 1], A[i + 2]];
}

/** Sample wall colours from reference region (night stage bare wall). */
export function collectKitchenNightWallColors(rgbData, W, H, channels = 4) {
  const set = new Set();
  for (let y = 100; y < 106; y++) {
    for (let x = 140; x < 150; x++) {
      const i = (y * W + x) * channels;
      const key = `${rgbData[i]},${rgbData[i + 1]},${rgbData[i + 2]}`;
      set.add(key);
    }
  }
  return set;
}

export function isKitchenBareWallPixel(r, g, b, y, wallColors) {
  if (y >= 129) return false;
  return wallColors.has(`${r},${g},${b}`);
}

export function buildKitchenWallMaskFromImage(px, W, H, wallColors, channels = 4) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * channels;
      if (isKitchenBareWallPixel(px[i], px[i + 1], px[i + 2], y, wallColors)) {
        mask[y * W + x] = 1;
      }
    }
  }
  return mask;
}

export function gradeImageDataInPlace(
  imageData,
  M,
  A,
  M_wall,
  wallMask,
  strength = 1,
  addStrength = 1,
  stageW = KITCHEN_STAGE_W,
  offsetY = 0
) {
  const px = imageData.data;
  const W = imageData.width;
  const H = imageData.height;
  for (let y = 0; y < H; y++) {
    const sy = y - offsetY;
    if (sy < 0 || sy >= KITCHEN_STAGE_H) continue;
    for (let x = 0; x < W; x++) {
      const pi = (y * W + x) * 4;
      if (px[pi + 3] === 0) continue;
      const si = sy * stageW + x;
      const useWall = wallMask && wallMask[si];
      const mi = si * 3;
      const mr = useWall ? M_wall[mi] : M[mi];
      const mg = useWall ? M_wall[mi + 1] : M[mi + 1];
      const mb = useWall ? M_wall[mi + 2] : M[mi + 2];
      const ar = A[mi];
      const ag = A[mi + 1];
      const ab = A[mi + 2];
      const graded = gradeKitchenRgb(
        px[pi],
        px[pi + 1],
        px[pi + 2],
        px[pi + 3],
        mr,
        mg,
        mb,
        ar,
        ag,
        ab,
        strength,
        addStrength
      );
      px[pi] = graded[0];
      px[pi + 1] = graded[1];
      px[pi + 2] = graded[2];
    }
  }
}
