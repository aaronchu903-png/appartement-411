# Day 10 rebuild — Step 0 + Phase 1 (Astra / kilo)

**Branch:** `astra/day10-scenes` from `7249d82` on `appartement-411-src`.  
**Hard rules:** Do NOT edit Days 1–6 / legacy frozen paths. Do NOT read/write player saves (`a411.*`, Yuechao/Jinyi). Do NOT deploy. Do NOT change repo root `sw.js` (app `sw.js` only if tests require). Mobile portrait only. Story French lines from DAY10_BEATS §A (+ listed breakfast gags) unchanged. zh hidden. No pixel fonts (Noto Sans for bubbles/UI). $0 model: `gpt-6-astra` variant `high` NOT fast.

## Step 0 — Scene player module (main deliverable)

Port the **sofa-test** engine from the public Pages repo (reference copy at `/workspace/appartement-411-pages/sofa-test/` — `scene.js`, `scene.json`, `style.css`, `index.html`, `CROPS.md`) into **`app/scenes/`** as a reusable, data-driven module:

- Side-view pixel stage (96×64 logical scene), **shots** in `scene.json`: per-shot camera crop rect, optional `scaleByWidth`, timing `t0`/`t1`, warm tint, cuts.
- Sprite layers, draw order, per-shot offsets; **animated sprite sequences** (frame lists + fps).
- Speech bubbles (Noto Sans), **audio clip cues** mapping to `../audio/w1/<id>.mp3` (Day 10 voice already in repo).
- Tap targets + idle ring; end card; story-first (tap overlay → play, no review gate).
- Keep **WebKit dpr / ResizeObserver** stage sizing from sofa-test.
- New day = new folder under `app/scenes/<id>/` with `scene.json` + `assets/` only — **no engine edits** for content days.
- Document schema in **`app/scenes/README.md`**.
- Phone frame centered on wide viewports (reuse sofa-test CSS patterns).

Wire a minimal entry for dev/capture: e.g. `app/day10-phase1.html` or route under existing app that loads the module + `scenes/day10-kitchen/scene.json` without breaking main Day 10 canvas story (additive; do not remove `content-day10.js` spine).

## Phase 1 — Day 10 kitchen (~12 min), sofa-test v4 style

Use **`app/docs/day10/DAY10_BEATS.md`** section **A** (plot + FR lines) and **GAGS_D8_D10** gags **7** and **9** plus beat-sheet gags **G1, G2, G3**:

| Beat | id | Teaching (action/cut, NO text popup) | Voice clip(s) |
|------|-----|--------------------------------------|---------------|
| A1 | n_d11_matin2 | Wed morning table: stash + closed laptop; Croissant on table edge | n_d11_matin2 |
| A2 | stash_back | G1: return stash; Noé stirs coffee with dirty spoon; Camille slides clean spoon (art) | (silent) |
| A3 | d11_cam_lit | Opens laptop | d11_cam_lit |
| A4 | n_d11_ecran | Screen CU + message visible; teach *écran* by showing screen | n_d11_ecran, w_ecran |
| A5–A9 | Martin lines | listening beats as staged inserts | d11_mar_* |
| A8 | keyboard_cat | G2: cat on keyboard, pppppp, delete (art) | (silent) |
| A10–A13 | dictation/pick | use existing clip ids from content-day10 wiring | per manifest |
| B2 | d11_noe_lait | Gag 7: one drop; cut to Croissant licking lips | il_ny_a_plus_de_lait / d11_noe_lait |
| B3 | d11_cam_lait | G3: fridge rule gesture | d11_cam_lait |
| B4 | d11_noe_faim | Gag 9: empty pastry bag cut → crumbs → cat asleep | jai_faim / d11_noe_faim |

**Teaching rule:** every new word/chunk taught by ACTION or CAMERA CUT; show ≥0.8s before line. No gloss popups.

**Assets** (extracted under `/tmp/` — copy into scene folder as needed):

- `/tmp/sofa-assets/` — sofa backdrop, Camille/Croissant side sprites (sofa_v2, sofa_backdrop tars)
- `/tmp/day10-assets/day10/` — laugh frames, `cat_on_pot`, etc.
- `DAY10_ASSET_LIST.md` in uploads → copy to `app/docs/day10/` if missing

Build **kitchen side-view** backdrop + props (table, laptop, milk, pastry bag, fridge) in flat pixel style. **List every placeholder** in commit message / session notes if art missing.

## Tests & capture (Composer runs after you)

1. Add **`app/tests/day10-phase1-scenes.cjs`** (or `app/tools/day10-phase1-capture.cjs`) — Playwright **WebKit 390×844**, one PNG per shot + `start.png` → `/opt/cursor/artifacts/day10/phase1/`.
2. Build **contact sheet** 6 tiles/row → `artifacts/day10/phase1/contact.png` (script or sharp/canvas).
3. Existing `npm test` must still pass (do not break day10-content tests; add scene module unit smoke if needed).

## Deliverables

- `app/scenes/` engine + `app/scenes/day10-kitchen/scene.json` + assets
- `app/scenes/README.md`
- Capture harness + passing tests
- Commit message: `feat(scenes): step0 player + day10 kitchen phase1`

Export this kilo session to **`app/docs/day10/kilo-session-phase0-phase1.json`** when done (`kilo export`).

Reference voice manifest: `app/docs/day10/voice-manifest-v1.json`.
