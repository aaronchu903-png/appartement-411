# Scene player (`app/scenes/`)

Data-driven **96×64** side-view stage for Day 10+ kitchen/roof beats. Engine: `scene-player.js` + `scene-player.css`. Each day is a folder with `scene.json` only — **no image paths in scene data**. Art comes from sprite **pack manifests**.

## Folder layout

```
scenes/
  scene-player.js
  scene-player.css
  sprite-manifest.js / .cjs
  sprites.json              # pack index (?pack=sofa|v2|b)
  scene-characters.js       # HumanC / CatC (16×24 / 14×12, face rows)
  packs/
    sofa/manifest.json      # placeholder / legacy sprites (default)
    v2/manifest.json        # atlas + feet/baseline example (stub)
    b/                      # Style B canonical (import tarball → manifest)
  compile-scene.cjs
  README.md
  <scene-id>/
    scene.json
    assets/                 # PNGs referenced by pack manifests only
    captures/
```

Entry HTML: `app/day10-phase1.html` → `scenes/day10-kitchen/scene.json`. Switch art with `?pack=sofa` (default), `?pack=v2`, or `?pack=b` (canonical Style B — see `packs/b/README.md`).

## Sprite manifest format

**Index** (`sprites.json`):

```json
{
  "version": 1,
  "defaultPack": "sofa",
  "packs": {
    "sofa": "packs/sofa/manifest.json",
    "v2": "packs/v2/manifest.json"
  }
}
```

**Pack** (`packs/<id>/manifest.json`):

| Field | Purpose |
|-------|---------|
| `pack` | Pack id |
| `assetRoot` | Relative URL prefix for PNGs (from manifest URL) |
| `atlases` | Atlas id → `{ file, w?, h? }` (single PNG sheet) |
| `assets` | Logical name → drawable entry |

**Drawable entry** (single PNG):

```json
"camille.idle": {
  "source": "file",
  "file": "camille_bend_0.png",
  "w": 16,
  "h": 24,
  "anchor": "topleft",
  "anchorPoint": { "x": 0, "y": 0 },
  "pixelScale": 1
}
```

**Atlas frame** (canonical v2 style — feet on floor line):

```json
"noe.idle": {
  "source": "atlas",
  "atlas": "kitchen_v2",
  "frame": { "x": 0, "y": 0, "w": 12, "h": 18 },
  "w": 12,
  "h": 18,
  "anchor": "feet",
  "anchorPoint": { "x": 6, "y": 17 },
  "pixelScale": 1
}
```

**Anchors:** `topleft` — `(x,y)` in scene.json is sprite top-left. `feet` / `baseline` — `(x,y)` is the anchor pixel on the floor; `anchorPoint` is offset from sprite top-left to that pixel.

**Hand attach:** optional `handPoint: { x, y }` on a frame (offset from sprite top-left). Scene player exposes `getHandPoint(asset, x, y)` and draws `heldProp` on actors at that point.

**Other asset types:**

- `type: "sequence"` + `frames: ["a.0","a.1"]` (+ optional `fps`)
- `type: "states"` + `states: { "closed": "prop.laptop.closed", ... }`
- `type: "backdrop"` + `base` / `tall` variants (file or atlas), optional `sceneTop` on tall

`scene.json` refers only to logical names (`asset`, `backdrop`, actor `asset` fields).

## `scene.json` schema

| Key | Type | Purpose |
|-----|------|---------|
| `version` | number | Schema version |
| `title` | string | Human label |
| `assetPack` | string | Default pack if URL has no `?pack=` |
| `audioBase` | string | Voice MP3 prefix (Day 10: `../../audio/w1/`) |
| `scene` | `{ width, height }` | Logical stage (96×64) |
| `room` | colors + `floorTop` | Ambient fill outside backdrop |
| `backdrop` | string | Logical backdrop name (e.g. `backdrop.kitchen`) |
| `cropLibrary` | name → rect | Reusable camera crops |
| `props` | array | `{ id, asset, x, y, z?, defaultState? }` |
| `bubbleAnchors` | name → `{ x, y }` | Bubble attach points |
| `defaultStage` / shot `stage` | layers | `props`, `propStates`, `actors`, `extras` |
| `shots` | timeline | `id`, `t0`, `t1`, `crop`, optional `stage` |
| `bubbles`, `audio`, `taps`, `timing`, `endCard` | | Same as before |

**Actors:** `{ asset, x, y, flip?, layer? }`.

**Extras:** `{ type: "asset", asset, x, y, sequence?: { fps?, frames? } }`.

## Runtime API

`initScenePlayer(container, configUrl)` loads scene + pack manifest, returns `window.__scenePlayer` (`start`, `setT`, `setShot`, `getShot`, …).

## Tests

- `app/tests/sprite-manifest.test.cjs` — atlas lookup, anchor math, logical-name guard
- `app/tests/scene-player.test.cjs` — compile `day10-kitchen/scene.json`
- `app/tests/day10-phase1-scenes.cjs` — WebKit captures (optional, slower)

## Day 10 kitchen Phase 1

Path: `day10-kitchen/scene.json` with `assetPack: "sofa"`. Placeholder PNGs live under `day10-kitchen/assets/` and are wired only in `packs/sofa/manifest.json`. Replace art by shipping a new pack manifest (and sheet) without editing scene beats.
