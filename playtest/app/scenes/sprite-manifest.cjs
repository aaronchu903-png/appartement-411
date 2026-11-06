'use strict';

/**
 * Sprite pack manifest: logical names → file or atlas frame + anchor placement.
 * Used by scene-player (browser) and Node tests.
 */

function isDrawableAsset(entry) {
  return entry && (entry.source === 'file' || entry.source === 'atlas');
}

function resolveAlias(manifest, name) {
  const seen = new Set();
  while (!manifest.assets[name] && manifest.aliases?.[name]) {
    if (seen.has(name)) throw new Error(`Circular asset alias: ${name}`);
    seen.add(name);
    name = manifest.aliases[name];
  }
  return name;
}

function resolveAsset(manifest, logicalName, options = {}) {
  if (!manifest?.assets) throw new Error('manifest missing assets');
  const lv = options.lightVariant;
  if (lv && ['day', 'evening', 'night'].includes(lv)) {
    const variantName = `${logicalName}.${lv}`;
    if (manifest.assets[variantName]) {
      return resolveAsset(manifest, variantName, { ...options, lightVariant: undefined });
    }
  }
  logicalName = resolveAlias(manifest, logicalName);
  const entry = manifest.assets[logicalName];
  if (!entry) throw new Error(`Unknown asset: ${logicalName}`);

  if (entry.type === 'sequence') {
    const frames = entry.frames || [];
    const idx = options.frameIndex ?? 0;
    const frameName = frames[((idx % frames.length) + frames.length) % frames.length];
    if (!frameName) throw new Error(`Empty sequence: ${logicalName}`);
    return resolveAsset(manifest, frameName, options);
  }

  if (entry.type === 'states') {
    const state = options.state || entry.states?.default || 'default';
    const target = entry.states?.[state] || entry.states?.default;
    if (!target) throw new Error(`Unknown state ${state} for ${logicalName}`);
    return resolveAsset(manifest, target, options);
  }

  if (entry.type === 'backdrop') {
    const variant = options.variant === 'tall' ? entry.tall : entry.base;
    if (!variant) throw new Error(`backdrop ${logicalName} missing ${options.variant || 'base'}`);
    return normalizeDrawable(logicalName, variant, manifest);
  }

  if (isDrawableAsset(entry)) return normalizeDrawable(logicalName, entry, manifest);

  throw new Error(`Asset ${logicalName} is not drawable`);
}

function normalizeDrawable(logicalName, entry, manifest) {
  const pixelScale = entry.pixelScale ?? 1;
  const anchor = entry.anchor || 'topleft';
  const anchorPoint = entry.anchorPoint || { x: 0, y: 0 };
  const w = entry.w ?? entry.frame?.w ?? 0;
  const h = entry.h ?? entry.frame?.h ?? 0;
  const handPoint = entry.handPoint ? { ...entry.handPoint } : null;
  return {
    logicalName,
    source: entry.source,
    file: entry.file,
    atlas: entry.atlas,
    frame: entry.frame ? { ...entry.frame } : null,
    sceneTop: entry.sceneTop,
    w,
    h,
    anchor,
    anchorPoint: { ...anchorPoint },
    handPoint,
    layer: entry.layer || null,
    pixelScale,
    characterKind: entry.characterKind || null,
    tile: entry.tile || null
  };
}

/**
 * Scene-space placement: (placeX, placeY) meaning depends on anchor mode.
 * feet/baseline: anchorPoint is offset from sprite top-left to the anchor pixel.
 * topleft: placeX/Y is top-left (anchorPoint should be 0,0).
 */
function placementTopLeft(spec, placeX, placeY, flip = false) {
  const scale = spec.pixelScale ?? 1;
  const ap = spec.anchorPoint || { x: 0, y: 0 };
  if (spec.seatPoint) {
    const spx = flip ? (spec.w - 1 - spec.seatPoint.x) : spec.seatPoint.x;
    return {
      x: placeX - spx * scale,
      y: placeY - spec.seatPoint.y * scale,
      w: spec.w * scale,
      h: spec.h * scale,
      scale
    };
  }
  if (spec.anchor === 'topleft') {
    return {
      x: placeX - ap.x * scale,
      y: placeY - ap.y * scale,
      w: spec.w * scale,
      h: spec.h * scale,
      scale
    };
  }
  if (spec.anchor === 'feet' || spec.anchor === 'baseline') {
    return {
      x: placeX - ap.x * scale,
      y: placeY - ap.y * scale,
      w: spec.w * scale,
      h: spec.h * scale,
      scale
    };
  }
  throw new Error(`Unknown anchor mode: ${spec.anchor}`);
}

/** Scene-space hand attach point (optional per frame). */
/** Frame-local handPoint (native px) added to placed top-left, × pixelScale × zoom. */
function handPointScene(spec, placeX, placeY, zoom = 1) {
  if (!spec?.handPoint) return null;
  const { x, y, scale } = placementTopLeft(spec, placeX, placeY);
  const s = scale * zoom;
  return { x: x + spec.handPoint.x * s, y: y + spec.handPoint.y * s };
}

function assertAtlasFramesInBounds(manifest) {
  const atlases = manifest.atlases || {};
  for (const [name, entry] of Object.entries(manifest.assets || {})) {
    function checkDrawable(draw) {
      if (!draw || draw.source !== 'atlas' || !draw.frame) return;
      const a = atlases[draw.atlas];
      if (!a?.w || !a?.h) return;
      const f = draw.frame;
      if (f.x < 0 || f.y < 0 || f.x + f.w > a.w || f.y + f.h > a.h) {
        throw new Error(`Atlas frame out of bounds: ${name} on ${draw.atlas}`);
      }
    }
    if (entry.type === 'backdrop') {
      checkDrawable(entry.base);
      checkDrawable(entry.tall);
      continue;
    }
    if (isDrawableAsset(entry)) checkDrawable(entry);
  }
}

function listDrawableAssetIds(manifest) {
  const ids = [];
  for (const [id, entry] of Object.entries(manifest.assets || {})) {
    if (entry.type === 'sequence' || entry.type === 'states' || entry.type === 'backdrop') ids.push(id);
    else if (isDrawableAsset(entry)) ids.push(id);
  }
  return ids;
}

function collectLoadUrls(manifest, manifestBaseUrl) {
  const root = manifest.assetRoot || '';
  const files = new Set();
  const atlases = new Set();

  function walk(name) {
    name = resolveAlias(manifest, name);
    const entry = manifest.assets[name];
    if (!entry) return;
    if (entry.type === 'sequence') {
      for (const f of entry.frames || []) walk(f);
      return;
    }
    if (entry.type === 'states') {
      for (const v of Object.values(entry.states || {})) if (typeof v === 'string') walk(v);
      return;
    }
    if (entry.type === 'backdrop') {
      if (entry.base?.source === 'file' && entry.base.file) files.add(entry.base.file);
      if (entry.base?.source === 'atlas' && entry.base.atlas) atlases.add(entry.base.atlas);
      if (entry.tall?.source === 'file' && entry.tall.file) files.add(entry.tall.file);
      if (entry.tall?.source === 'atlas' && entry.tall.atlas) atlases.add(entry.tall.atlas);
      return;
    }
    if (entry.source === 'file' && entry.file) files.add(entry.file);
    if (entry.source === 'atlas' && entry.atlas) atlases.add(entry.atlas);
  }

  for (const name of Object.keys(manifest.assets || {})) walk(name);

  for (const id of Object.keys(manifest.atlases || {})) atlases.add(id);

  const resolveUrl = (file) => new URL(root + file, manifestBaseUrl).href;

  return {
    files: [...files].map((f) => ({ file: f, url: resolveUrl(f) })),
    atlases: [...atlases].map((id) => {
      const a = manifest.atlases[id];
      if (!a?.file) throw new Error(`Atlas ${id} missing file`);
      return { id, ...a, url: resolveUrl(a.file) };
    })
  };
}

function assertSceneUsesLogicalNames(sceneJson) {
  const forbidden = /\.(png|jpg|webp)$/i;
  const json = JSON.stringify(sceneJson);
  if (forbidden.test(json)) throw new Error('scene.json must not contain image file paths');
}

function collectSceneLogicalNames(sceneJson) {
  const names = new Set();
  const add = (n) => {
    if (n && typeof n === 'string') names.add(n);
  };

  if (typeof sceneJson.backdrop === 'string') add(sceneJson.backdrop);

  for (const p of sceneJson.props || []) add(p.asset);

  function walkStage(stage) {
    if (!stage) return;
    for (const def of Object.values(stage.actors || {})) add(def?.asset);
    for (const ex of stage.extras || []) {
      add(ex.asset);
      if (ex.sequence?.frames) for (const f of ex.sequence.frames) add(f);
    }
  }

  walkStage(sceneJson.defaultStage);
  for (const sh of sceneJson.shots || []) walkStage(sh.stage);

  return [...names];
}

function expandManifestLoads(manifest, logicalNames) {
  const fileSet = new Set();
  const atlasSet = new Set();

  function noteSpec(spec) {
    if (!spec) return;
    if (spec.source === 'file' && spec.file) fileSet.add(spec.file);
    if (spec.source === 'atlas' && spec.atlas) atlasSet.add(spec.atlas);
  }

  function walk(name, options = {}) {
    name = resolveAlias(manifest, name);
    const entry = manifest.assets[name];
    if (!entry) return;
    if (entry.type === 'sequence') {
      for (let i = 0; i < (entry.frames || []).length; i++) {
        noteSpec(resolveAsset(manifest, name, { ...options, frameIndex: i }));
      }
      return;
    }
    if (entry.type === 'states') {
      for (const v of Object.values(entry.states || {})) if (typeof v === 'string') walk(v, options);
      return;
    }
    if (entry.type === 'backdrop') {
      try {
        noteSpec(resolveAsset(manifest, name, { variant: 'base' }));
      } catch {
        /* optional */
      }
      try {
        noteSpec(resolveAsset(manifest, name, { variant: 'tall' }));
      } catch {
        /* optional */
      }
      return;
    }
    try {
      noteSpec(resolveAsset(manifest, name, options));
    } catch {
      /* skip */
    }
  }

  for (const n of logicalNames) walk(n);

  return {
    files: [...fileSet],
    atlasIds: [...atlasSet]
  };
}

module.exports = {
  resolveAsset,
  placementTopLeft,
  handPointScene,
  collectLoadUrls,
  assertSceneUsesLogicalNames,
  collectSceneLogicalNames,
  expandManifestLoads,
  assertAtlasFramesInBounds,
  listDrawableAssetIds
};
