const REG_UI = new URL('../../../tech/sitcom_engine/registry/ui_components.json', import.meta.url);
const REG_THEME = new URL('../../../tech/sitcom_engine/registry/ui_theme.json', import.meta.url);
const MANIFEST_URL = new URL('../../../style/canonical/sets/ui_learning/manifest.json', import.meta.url);

export const UI_SET_BASE = '/style/canonical/sets/ui_learning/';
export const GARDEN_PARTS_BASE = '/garden/garden_parts/';
const POT_CANVAS = { w: 24, h: 66 };

let cached = null;

/** Canonical M2 content column (x1 px) — panels are always 168 wide on stage. */
export const M2_PANEL_W_X1 = 168;

/** Content column width (x1 px) per viewport — mockups 360→168, 390→183. */
export function columnWidthX1(viewportWidth = 390) {
  const w = Number(viewportWidth) || 390;
  if (w <= 360) return M2_PANEL_W_X1;
  return Math.round(M2_PANEL_W_X1 + (w - 360) * 0.5);
}

export async function loadUiKit() {
  if (cached) return cached;
  const [reg, theme, manifestRes] = await Promise.all([
    fetch(REG_UI).then((r) => r.json()),
    fetch(REG_THEME).then((r) => r.json()),
    fetch(MANIFEST_URL).then((r) => (r.ok ? r.json() : { assets: {} }))
  ]);
  const hasAtlas = manifestRes.atlases && Object.keys(manifestRes.atlases).length > 0;
  cached = {
    reg,
    theme,
    manifest: manifestRes,
    scale: reg.scale || 2,
    placeholderArt: reg.placeholder_art === true || (!hasAtlas && manifestRes.placeholder_art !== false)
  };
  applyThemeToDocument(cached.theme);
  return cached;
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.style.setProperty('--m2-ink', theme.ink);
  r.style.setProperty('--m2-panel', theme.panel);
  r.style.setProperty('--m2-cream', theme.panel);
  r.style.setProperty('--m2-primary', theme.primary);
  r.style.setProperty('--m2-feedback-wrong', theme.feedback_wrong_near);
  r.style.setProperty('--m2-ul-learned', theme.underline?.learned);
  r.style.setProperty('--m2-ul-other', theme.underline?.other_color || theme.primary);
  r.style.setProperty('--m2-gender-le', theme.gender?.le);
  r.style.setProperty('--m2-gender-la', theme.gender?.la);
  r.style.setProperty('--m2-focus', theme.focus_ring);
}

function manifestKey(componentId, state) {
  return `${componentId}.${state}`;
}

function resolveDef(kit, componentId) {
  const def = kit.reg.defs?.[componentId];
  if (!def) return null;
  if (def.extends) {
    const base = resolveDef(kit, def.extends) || {};
    return { ...base, ...def, states: def.states || base.states };
  }
  return def;
}

function resolveAsset(kit, key, seen = new Set()) {
  const assets = kit.manifest.assets || {};
  const raw = assets[key];
  if (!raw || seen.has(key)) return null;
  seen.add(key);
  if (raw.type === 'ref') {
    const baseKey = raw.alias;
    const base = baseKey ? resolveAsset(kit, baseKey, seen) : null;
    if (!base) return { ...raw, key };
    return {
      ...base,
      ...raw,
      key,
      file: base.file,
      frame: base.frame,
      nineSlice: raw.nineSlice ?? base.nineSlice,
      source: base.source,
      atlas: base.atlas,
      displayScale: raw.displayScale ?? base.displayScale,
      textColor: raw.textColor ?? base.textColor
    };
  }
  if (raw.type === 'sequence') {
    const frameKey = raw.frames?.[0];
    const frame = frameKey ? resolveAsset(kit, frameKey, seen) : null;
    return frame ? { ...frame, key, type: 'sequence' } : { ...raw, key };
  }
  return { ...raw, key };
}

function scalePx(kit, x1) {
  return Math.round(x1 * kit.scale);
}

function resolveRectDim(value, widthX1) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.match(/^w-(\d+)$/);
    if (m) return Math.max(0, widthX1 - Number(m[1]));
  }
  return 0;
}

function pickTextRect(asset, def, role) {
  const rects = asset?.textRects?.length ? asset.textRects : def?.textRects || [];
  return rects.find((t) => !role || t.role === role) || rects[0];
}

function themeHexForPaletteRole(kit, paletteRole) {
  if (!paletteRole) return kit.theme.ink;
  const mapped = kit.manifest?.colorMap?.[paletteRole] ?? paletteRole;
  const themeByRole = {
    ink: kit.theme.ink,
    cream: kit.theme.panel,
    panel: kit.theme.panel,
    green: kit.theme.primary,
    white: '#ffffff'
  };
  return themeByRole[mapped] || kit.theme.ink;
}

function textColorFor(kit, componentId, asset) {
  if (componentId === 'ui.start_choice_big') return kit.theme.panel;
  if (componentId === 'ui.btn_primary' || componentId === 'ui.review_entry') return '#ffffff';
  if (asset?.textColor) return themeHexForPaletteRole(kit, asset.textColor);
  return kit.theme.ink;
}

function stackGardenLayer(parent, file, scale) {
  const img = document.createElement('img');
  img.src = `${GARDEN_PARTS_BASE}${file}`;
  img.alt = '';
  img.draggable = false;
  img.className = 'm2-garden-part';
  img.style.position = 'absolute';
  img.style.left = '0';
  img.style.top = '0';
  img.style.imageRendering = 'pixelated';
  img.width = POT_CANVAS.w * scale;
  img.height = POT_CANVAS.h * scale;
  parent.appendChild(img);
  return img;
}

function mountGardenPotStack(kit, wrap, { visual = 'full', growth = 3, leavesOverrideUrl = null }) {
  const scale = kit.scale;
  const n = Math.max(1, Math.min(4, growth));
  const rootN = Math.min(3, n);
  wrap.style.position = 'relative';
  wrap.style.width = `${POT_CANVAS.w * scale}px`;
  wrap.style.height = `${POT_CANVAS.h * scale}px`;
  wrap.style.imageRendering = 'pixelated';
  stackGardenLayer(wrap, 'pot_back.png', scale);
  stackGardenLayer(wrap, `roots_${rootN}.png`, scale);
  const stemFile =
    visual === 'dormant' ? `stem_dormant_${n}.png` : visual === 'wilting' ? `stem_wilting_${n}.png` : `stem_${n}.png`;
  stackGardenLayer(wrap, stemFile, scale);
  if (leavesOverrideUrl) {
    const img = document.createElement('img');
    img.src = leavesOverrideUrl;
    img.alt = '';
    img.className = 'm2-garden-part m2-pot-leaves-override';
    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';
    img.style.imageRendering = 'pixelated';
    img.width = POT_CANVAS.w * scale;
    img.height = POT_CANVAS.h * scale;
    wrap.appendChild(img);
  } else {
    const leavesFile =
      visual === 'dormant'
        ? `leaves_dormant_${n}.png`
        : visual === 'wilting'
          ? `leaves_wilting_${n}.png`
          : `leaves_full_${n}.png`;
    stackGardenLayer(wrap, leavesFile, scale);
  }
  stackGardenLayer(wrap, 'pot_front.png', scale);
}

function mountDueGlowOverlay(kit, wrap) {
  const frames = ['ui.pot_state.due_f0', 'ui.pot_state.due_f1'].map((k) => assetPieceUrl(resolveAsset(kit, k))).filter(Boolean);
  if (!frames.length) return;
  const img = document.createElement('img');
  img.className = 'm2-pot-due-glow';
  img.style.position = 'absolute';
  img.style.left = '0';
  img.style.top = '0';
  img.style.imageRendering = 'pixelated';
  img.width = POT_CANVAS.w * kit.scale;
  img.height = POT_CANVAS.h * kit.scale;
  let i = 0;
  img.src = frames[0];
  if (frames.length > 1) {
    setInterval(() => {
      i = (i + 1) % frames.length;
      img.src = frames[i];
    }, 500);
  }
  wrap.appendChild(img);
}

function assetPieceUrl(asset) {
  if (!asset?.file) return null;
  return `${UI_SET_BASE}${asset.file}`;
}

function applyNineSlice(shell, url, slice, widthPx, heightPx, scale) {
  const { l, t, r, b } = slice;
  const bw = scalePx({ scale }, l);
  const bt = scalePx({ scale }, t);
  const br = scalePx({ scale }, r);
  const bb = scalePx({ scale }, b);
  shell.style.width = `${widthPx}px`;
  shell.style.height = `${heightPx}px`;
  shell.style.boxSizing = 'border-box';
  shell.style.borderStyle = 'solid';
  shell.style.borderWidth = `${bt}px ${br}px ${bb}px ${bw}px`;
  shell.style.borderImageSource = `url("${url}")`;
  shell.style.borderImageSlice = `${t} ${r} ${b} ${l} fill`;
  shell.style.borderImageWidth = `${bt}px ${br}px ${bb}px ${bw}px`;
  shell.style.borderImageRepeat = 'stretch';
  shell.style.background = 'transparent';
  shell.style.imageRendering = 'pixelated';
}

function mountSprite(shell, url, frame, displayScale) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.className = 'm2-ui-sprite';
  img.style.imageRendering = 'pixelated';
  img.style.display = 'block';
  const w = (frame?.w || 24) * displayScale;
  const h = (frame?.h || 24) * displayScale;
  img.width = w;
  img.height = h;
  shell.style.width = `${w}px`;
  shell.style.height = `${h}px`;
  shell.appendChild(img);
}

/** Draw a manifest sprite (word / prompt card) at x1 offset inside parent. */
export function mountManifestSprite(kit, parent, assetKey, at = { x: 0, y: 0 }) {
  if (!assetKey) return false;
  const asset = resolveAsset(kit, assetKey);
  const url = assetPieceUrl(asset);
  if (kit.placeholderArt || !url || !asset?.frame) return false;
  const ds = asset.displayScale || kit.scale;
  parent.style.position = parent.style.position || 'relative';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.className = 'm2-manifest-sprite';
  img.draggable = false;
  img.style.position = 'absolute';
  img.style.left = `${scalePx(kit, at.x ?? 0)}px`;
  img.style.top = `${scalePx(kit, at.y ?? 0)}px`;
  img.style.imageRendering = 'pixelated';
  img.style.pointerEvents = 'none';
  img.style.zIndex = '0';
  img.width = asset.frame.w * ds;
  img.height = asset.frame.h * ds;
  parent.appendChild(img);
  return true;
}

export function mountWordCardArt(kit, parent, itemId) {
  const key = itemId ? `word.${itemId}.any` : null;
  const asset = key ? resolveAsset(kit, key) : null;
  const slot = asset?.slot || { x: 2, y: 2 };
  return mountManifestSprite(kit, parent, key, { x: slot.x, y: slot.y });
}

export function mountPromptModuleArt(kit, parent, module) {
  const key = module === 'dictation' ? 'prompt.dictation.any' : 'prompt.listen.any';
  const asset = resolveAsset(kit, key);
  const slot = asset?.slot || { x: 2, y: 2 };
  return mountManifestSprite(kit, parent, key, { x: slot.x, y: slot.y });
}

export function mountPlacementPromptArt(kit, parent, panelWidthX1 = M2_PANEL_W_X1) {
  const key = 'prompt.placement.any';
  const asset = resolveAsset(kit, key);
  const slot = asset?.slot || { x: 8, y: 8 };
  const x = panelWidthX1 <= M2_PANEL_W_X1 ? 6 : slot.x;
  return mountManifestSprite(kit, parent, key, { x, y: slot.y });
}

export function mountOverlayIcon(kit, parent, iconKey, at, scale) {
  if (!iconKey) return;
  const iconAsset = resolveAsset(kit, iconKey);
  const url = assetPieceUrl(iconAsset);
  if (!url) return;
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.className = 'm2-ui-overlay';
  img.style.position = 'absolute';
  img.style.left = `${scalePx(kit, at?.x ?? 0)}px`;
  img.style.top = `${scalePx(kit, at?.y ?? 0)}px`;
  img.style.imageRendering = 'pixelated';
  img.style.pointerEvents = 'none';
  const ds = iconAsset?.displayScale || kit.scale;
  if (iconAsset?.frame) {
    img.width = iconAsset.frame.w * ds;
    img.height = iconAsset.frame.h * ds;
  }
  parent.appendChild(img);
}

function mountArtOverlay(kit, parent, artKey, at, scale) {
  if (!artKey) return;
  const artAsset = resolveAsset(kit, artKey);
  const url = assetPieceUrl(artAsset);
  if (!url) return;
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.className = 'm2-ui-art-overlay';
  img.style.position = 'absolute';
  img.style.left = `${scalePx(kit, at?.x ?? 0)}px`;
  img.style.top = `${scalePx(kit, at?.y ?? 0)}px`;
  img.style.imageRendering = 'pixelated';
  img.style.pointerEvents = 'none';
  const ds = artAsset?.displayScale || kit.scale;
  if (artAsset?.frame) {
    img.width = artAsset.frame.w * ds;
    img.height = artAsset.frame.h * ds;
  }
  parent.appendChild(img);
}

function hitSize(kit, asset, def, opts) {
  const hit = asset?.hit || def?.hit || def?.x1 || { w: 24, h: 28 };
  let w = hit.w ?? 24;
  let h = hit.h ?? 28;
  if (opts.widthX1) w = opts.widthX1;
  const isToast = (asset?.key || '').includes('word_toast') || (asset?.key || '').includes('ui.toast');
  const isAccentKey = (opts.className || '').includes('m2-accent-key');
  if (isToast && h < 22) h = 22;
  if (isAccentKey) {
    w = 18;
    h = 26;
  }
  return { w: scalePx(kit, w), h: scalePx(kit, h) };
}

/**
 * Mount a UI component from ui_learning manifest art.
 */
export function mountUi(kit, componentId, state, parent, opts = {}) {
  const def = resolveDef(kit, componentId);
  const key = manifestKey(componentId, state);
  const asset = resolveAsset(kit, key) || {};
  const scale = kit.scale;
  const tag = opts.tag || (opts.text != null && componentId.includes('field') ? 'input' : 'button');
  const el = document.createElement(tag);
  if (tag === 'button') el.type = 'button';
  if (tag === 'input') el.type = 'text';
  el.className = `m2-ui ${opts.className || ''}`.trim();
  el.dataset.uiKey = key;
  el.dataset.uiComponent = componentId;
  el.dataset.uiState = state;

  const widthX1 = opts.widthX1 ?? asset.target?.w ?? columnWidthX1(opts.viewportWidth);
  const displayScale = asset.displayScale || scale;
  const url = assetPieceUrl(asset);

  if (kit.placeholderArt || asset.source === 'placeholder' || !url) {
    el.dataset.placeholderArt = 'true';
    el.classList.add('m2-ui-placeholder');
  } else {
    el.dataset.placeholderArt = 'false';
    el.classList.add('m2-ui-art');
  }

  const shell = document.createElement('div');
  shell.className = 'm2-ui-shell';
  shell.style.position = 'relative';
  shell.style.display = 'inline-block';
  shell.style.verticalAlign = 'top';

  const frameH = asset.target?.h ?? asset.frame?.h ?? def?.x1?.h ?? 28;
  const heightX1 = opts.heightX1 ?? frameH;
  const widthPx = scalePx(kit, widthX1);
  const heightPx = scalePx(kit, heightX1);

  if (!kit.placeholderArt && url && asset.nineSlice) {
    applyNineSlice(shell, url, asset.nineSlice, widthPx, heightPx, scale);
  } else if (!kit.placeholderArt && url) {
    mountSprite(shell, url, asset.frame, displayScale);
  }

  if (!kit.placeholderArt && url) {
    mountArtOverlay(kit, shell, asset.art, asset.artAt, scale);
    mountOverlayIcon(kit, shell, asset.icon, asset.iconAt || { x: 3, y: 2 }, scale);
    if (opts.icon) mountOverlayIcon(kit, shell, opts.icon, opts.iconAt || { x: 3, y: 2 }, scale);
  }

  const rect = pickTextRect(asset, def, opts.role);
  const color = textColorFor(kit, componentId, asset);
  const artW = asset.frame?.w ?? widthX1;
  const artH = asset.frame?.h ?? heightX1;
  let labelWrap = null;
  if (rect && opts.text != null && tag !== 'input' && tag !== 'textarea') {
    const label = document.createElement('span');
    label.className = 'm2-ui-label';
    label.style.position = 'absolute';
    const rx = rect.x ?? 0;
    const ry = rect.y ?? 0;
    const rw = resolveRectDim(rect.w, widthX1);
    const rh = rect.h ?? 14;
    label.style.left = `${scalePx(kit, rx)}px`;
    label.style.top = `${scalePx(kit, ry)}px`;
    label.style.width = `${scalePx(kit, rw)}px`;
    label.style.height = `${scalePx(kit, rh)}px`;
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.lineHeight = '1.1';
    label.style.color = color;
    label.style.pointerEvents = 'none';
    const onGreen =
      componentId === 'ui.btn_primary' ||
      componentId === 'ui.review_entry' ||
      componentId === 'ui.start_choice_big';
    const onCream =
      componentId === 'ui.start_choice_small' ||
      componentId === 'ui.review_option_row' ||
      componentId === 'ui.chunk_chip' ||
      componentId === 'ui.btn_secondary';
    if (onGreen) {
      label.style.fontWeight = '800';
      label.style.color = kit.theme.panel;
    } else if (onCream) {
      label.style.fontWeight = '700';
      label.style.color = '#241810';
    } else if (color === kit.theme.ink || color === '#2a1c14') {
      label.style.fontWeight = '600';
      label.style.color = '#2a1c14';
    }
    label.style.fontSize = `${Math.max(11, scalePx(kit, 7))}px`;
    label.style.whiteSpace = 'nowrap';
    const max = rect.max ?? rect.maxChars ?? 99;
    label.textContent = String(opts.text).slice(0, max);
    label.dataset.textRole = rect.role;
    const boundsW = Math.max(artW, rx + rw);
    const boundsH = Math.max(artH, ry + rh);
    labelWrap = document.createElement('div');
    labelWrap.className = 'm2-ui-art-wrap';
    labelWrap.style.position = 'relative';
    labelWrap.style.display = 'inline-block';
    labelWrap.style.overflow = 'visible';
    labelWrap.style.width = `${scalePx(kit, boundsW)}px`;
    labelWrap.style.height = `${scalePx(kit, boundsH)}px`;
    shell.style.position = 'absolute';
    shell.style.left = '0';
    shell.style.top = '0';
    if (opts.cardInterior) {
      const interior = document.createElement('div');
      interior.className = 'm2-card-interior';
      interior.dataset.m2CardInterior = 'true';
      if (opts.cardId) interior.dataset.m2CardId = opts.cardId;
      interior.style.position = 'absolute';
      interior.style.left = label.style.left;
      interior.style.top = label.style.top;
      interior.style.width = label.style.width;
      interior.style.height = label.style.height;
      interior.style.display = 'flex';
      interior.style.alignItems = 'center';
      interior.style.overflow = 'hidden';
      label.style.left = '0';
      label.style.top = '0';
      label.style.width = '100%';
      label.style.height = '100%';
      label.style.fontWeight = '700';
      label.style.fontSize = `${Math.max(13, scalePx(kit, 8))}px`;
      interior.appendChild(label);
      labelWrap.append(shell, interior);
      el.dataset.m2CardFullInterior = 'true';
    } else {
      labelWrap.append(shell, label);
    }
  } else if (tag === 'input' || tag === 'textarea') {
    if (opts.text != null) el.value = String(opts.text);
    if (opts.placeholder != null) el.placeholder = String(opts.placeholder);
    el.style.color = textColorFor(kit, componentId, asset);
  } else if (opts.text != null && kit.placeholderArt) {
    el.textContent = opts.text;
  }

  if (labelWrap) {
    el.appendChild(labelWrap);
  } else if (shell.childNodes.length || shell.style.width) {
    el.appendChild(shell);
  }

  const hit = hitSize(kit, asset, def, { ...opts, widthX1 });
  el.style.minWidth = `${hit.w}px`;
  el.style.minHeight = `${hit.h}px`;
  if (opts.fullWidth) {
    el.style.width = `${widthPx}px`;
    el.style.display = 'block';
  }

  if (opts.toastSlide) {
    el.classList.add('m2-toast-slide');
    el.dataset.toastPhase = 'in';
    requestAnimationFrame(() => {
      el.dataset.toastPhase = 'idle';
    });
  }

  if (opts.onPress) el.addEventListener('click', opts.onPress);
  if (opts.cardInterior && !labelWrap) {
    el.dataset.m2CardInterior = 'true';
    if (opts.cardId) el.dataset.m2CardId = opts.cardId;
  }
  parent.appendChild(el);
  if (opts.cardInterior && labelWrap) {
    el.style.position = 'relative';
    const interior = el.querySelector('.m2-card-interior');
    if (interior && el.dataset.m2CardFullInterior === 'true') {
      interior.style.left = '0';
      interior.style.top = '0';
      interior.style.width = `${hit.w}px`;
      interior.style.height = `${hit.h}px`;
    }
  }
  return el;
}

/** Designed placement result card (ui.placement_result + inset time-goal copy). */
export function mountPlacementResultCard(kit, parent, { headline, timeGoal }) {
  const wrap = document.createElement('div');
  wrap.className = 'm2-placement-card';
  parent.appendChild(wrap);

  const cardEl = mountUi(kit, 'ui.placement_result', 'idle', wrap, {
    tag: 'div',
    widthX1: 172,
    heightX1: 150,
    text: headline,
    role: 'day'
  });
  const shell = cardEl.querySelector('.m2-ui-shell');
  if (!shell) return cardEl;

  shell.style.position = 'relative';
  const artSlot = document.createElement('div');
  artSlot.className = 'm2-placement-art-slot';
  mountPlacementPromptArt(kit, artSlot, M2_PANEL_W_X1);
  shell.appendChild(artSlot);

  const asset = resolveAsset(kit, 'ui.placement_result.idle');
  const rects = asset?.textRects || [];
  const etaRect = rects.find((r) => r.role === 'eta');
  const linkRect = rects.find((r) => r.role === 'link');
  if (etaRect && timeGoal) {
    const block = document.createElement('div');
    block.className = 'm2-placement-goal';
    block.style.position = 'absolute';
    block.style.left = `${scalePx(kit, etaRect.x)}px`;
    block.style.top = `${scalePx(kit, etaRect.y)}px`;
    block.style.width = `${scalePx(kit, etaRect.w)}px`;
    block.style.height = `${scalePx(kit, etaRect.h)}px`;
    block.style.padding = `${scalePx(kit, 2)}px ${scalePx(kit, 8)}px`;
    block.style.boxSizing = 'border-box';
    block.style.overflow = 'hidden';
    block.style.display = 'flex';
    block.style.flexDirection = 'column';
    block.style.justifyContent = 'flex-start';
    block.style.gap = `${scalePx(kit, 2)}px`;
    block.style.fontSize = `${Math.max(10, scalePx(kit, 6))}px`;
    block.style.lineHeight = '1.2';
    block.style.color = '#241810';
    block.style.fontWeight = '600';
    block.style.pointerEvents = 'none';
    block.dataset.m2PlacementGoal = 'true';

    const level = document.createElement('div');
    level.className = 'm2-placement-level';
    level.innerHTML = `<span class="m2-placement-level-k">${timeGoal.level}</span>`;
    block.appendChild(level);

    const primary = document.createElement('div');
    primary.className = 'm2-placement-range';
    primary.dataset.m2PlacementPrimary = 'true';
    primary.textContent = timeGoal.primary;
    block.appendChild(primary);

    if (timeGoal.secondary) {
      const secondary = document.createElement('div');
      secondary.className = 'm2-placement-range m2-placement-range-alt';
      secondary.dataset.m2PlacementSecondary = 'true';
      secondary.textContent = timeGoal.secondary;
      block.appendChild(secondary);
    }
    if (timeGoal.body) {
      const bodyLine = document.createElement('div');
      bodyLine.className = 'm2-placement-body';
      bodyLine.dataset.m2PlacementBody = 'true';
      bodyLine.style.fontWeight = '500';
      bodyLine.style.fontSize = `${Math.max(9, scalePx(kit, 5))}px`;
      bodyLine.textContent = timeGoal.body;
      block.appendChild(bodyLine);
    }
    shell.appendChild(block);
  }
  if (linkRect && timeGoal?.disclaimer) {
    const tag = document.createElement('div');
    tag.className = 'm2-placement-disclaimer';
    tag.style.position = 'absolute';
    tag.style.left = `${scalePx(kit, linkRect.x)}px`;
    tag.style.top = `${scalePx(kit, linkRect.y)}px`;
    tag.style.width = `${scalePx(kit, linkRect.w)}px`;
    tag.style.height = `${scalePx(kit, linkRect.h)}px`;
    tag.style.padding = `0 ${scalePx(kit, 8)}px`;
    tag.style.boxSizing = 'border-box';
    tag.style.fontSize = `${Math.max(9, scalePx(kit, 5))}px`;
    tag.style.color = '#241810';
    tag.style.opacity = '0.85';
    tag.dataset.m2PlacementDisclaimer = 'true';
    tag.textContent = timeGoal.disclaimer;
    shell.appendChild(tag);
  }
  return cardEl;
}

/** Patch time-goal copy after minutes-per-day changes (placement card). */
export function updatePlacementTimeGoalDom(root, timeGoal) {
  if (!root || !timeGoal) return;
  const primary = root.querySelector('[data-m2-placement-primary]');
  const secondary = root.querySelector('[data-m2-placement-secondary]');
  const body = root.querySelector('[data-m2-placement-body]');
  const disclaimer = root.querySelector('[data-m2-placement-disclaimer]');
  if (primary) primary.textContent = timeGoal.primary;
  if (secondary) secondary.textContent = timeGoal.secondary;
  if (body) body.textContent = timeGoal.body || '';
  if (disclaimer) disclaimer.textContent = timeGoal.disclaimer;
}

/** Demo scene crop inside ui.scene_thumb frame (capture / lab). */
export function mountSceneThumbFill(kit, host) {
  host.style.position = 'relative';
  mountOverlayIcon(kit, host, 'ui.icon.book', { x: 11, y: 7 }, kit.scale);
  const img = host.querySelector('img.m2-ui-overlay');
  if (img) {
    img.classList.add('m2-scene-thumb-img');
    const ds = kit.scale;
    img.width = 14 * ds * 2;
    img.height = 14 * ds * 2;
  }
}

export function mountLearnWordArt(kit, host) {
  host.style.position = 'relative';
  mountUi(kit, 'ui.gender_pip', 'f', host, { tag: 'div', className: 'm2-learn-gender' });
}

export function mountExit(kit, parent, label, onPress) {
  return mountUi(kit, 'ui.exit', 'idle', parent, {
    text: label || 'Fini pour aujourd\'hui',
    role: 'exit',
    className: 'm2-exit',
    onPress,
    widthX1: 84,
    heightX1: 22
  });
}

/** §10a: le navy, la plum, les = no colour (article stays visible as text). */
export function articleColor(kit, article) {
  const a = String(article || '').toLowerCase();
  if (a === 'le') return kit.theme.gender?.le || null;
  if (a === 'la') return kit.theme.gender?.la || null;
  if (a === 'les') return null;
  return null;
}

export function mountRecastBox(kit, parent, { playerText, modelText, kind = 'recast' }) {
  const state = kind === 'near' ? 'near' : kind === 'recast' ? 'recast' : 'idle';
  const widthX1 = M2_PANEL_W_X1;
  const box = document.createElement('div');
  box.className = 'm2-recast-box';
  box.dataset.uiKey = `ui.recast_box.${state}`;
  const shell = document.createElement('div');
  shell.className = 'm2-ui-shell m2-recast-shell';
  shell.style.position = 'relative';
  const asset = resolveAsset(kit, `ui.recast_box.${state}`);
  const url = assetPieceUrl(asset);
  const h = 80;
  if (!kit.placeholderArt && url && asset?.nineSlice) {
    applyNineSlice(shell, url, asset.nineSlice, scalePx(kit, widthX1), scalePx(kit, h), kit.scale);
  } else {
    box.dataset.placeholderArt = 'true';
    box.classList.add('m2-ui-placeholder');
  }
  const player = document.createElement('p');
  player.className = 'm2-recast-player';
  player.style.position = 'absolute';
  player.style.left = `${scalePx(kit, 12)}px`;
  player.style.top = `${scalePx(kit, 8)}px`;
  player.style.margin = '0';
  player.style.color = kit.theme.ink;
  player.textContent = playerText;
  const model = document.createElement('p');
  model.className = 'm2-recast-model';
  model.style.position = 'absolute';
  model.style.left = `${scalePx(kit, 12)}px`;
  model.style.top = `${scalePx(kit, 36)}px`;
  model.style.margin = '0';
  const wrong = document.createElement('span');
  wrong.className = 'm2-feedback-wrong';
  wrong.textContent = kind === 'near' ? 'Presque ! ' : '';
  if (kind === 'near') {
    wrong.style.color = kit.theme.feedback_wrong_near || kit.theme.feedback_wrong || '#e2873a';
    wrong.style.fontWeight = '700';
    wrong.dataset.colorRole = 'orange';
  }
  const correct = document.createElement('span');
  correct.className = 'm2-recast-correct';
  correct.textContent = modelText;
  correct.style.color = kit.theme.ink;
  model.append(wrong, correct);
  shell.append(player, model);
  box.appendChild(shell);
  box.style.width = `${scalePx(kit, widthX1)}px`;
  box.style.minHeight = `${scalePx(kit, h)}px`;
  parent.appendChild(box);
  return box;
}

/** ui.pot_state — composes on-palette garden/garden_parts; due glow + leaf_yellow from ui_learning. */
export function mountPotState(kit, parent, state = 'due', opts = {}) {
  const growth = opts.growth ?? 3;
  const potState = String(state).replace(/^ui\.pot_state\./, '');
  const key = `ui.pot_state.${potState}`;
  const asset = resolveAsset(kit, key);
  const wrap = document.createElement('div');
  wrap.className = 'm2-pot-state';
  wrap.dataset.uiKey = key;

  if (!kit.placeholderArt) {
    const leafMatch = potState.match(/^leaf_yellow_(\d)$/);
    if (leafMatch) {
      const url = assetPieceUrl(asset);
      mountGardenPotStack(kit, wrap, { visual: 'full', growth: Number(leafMatch[1]), leavesOverrideUrl: url });
    } else if (asset?.existing?.includes('garden/garden_parts') || ['watered', 'grown', 'dormant'].includes(potState)) {
      const visual = potState === 'dormant' ? 'dormant' : 'full';
      const level = potState === 'grown' ? 4 : growth;
      mountGardenPotStack(kit, wrap, { visual, growth: level });
    } else if (potState === 'due' || asset?.type === 'sequence') {
      mountGardenPotStack(kit, wrap, { visual: 'wilting', growth });
      mountDueGlowOverlay(kit, wrap);
    } else {
      const url = assetPieceUrl(asset);
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.style.imageRendering = 'pixelated';
        const ds = asset?.displayScale || kit.scale;
        img.width = (asset?.frame?.w || POT_CANVAS.w) * ds;
        img.height = (asset?.frame?.h || POT_CANVAS.h) * ds;
        wrap.appendChild(img);
      }
    }
  }

  parent.appendChild(wrap);
  return wrap;
}
