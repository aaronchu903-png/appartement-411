# Day 10 « Le message » — full build (Astra)

Base: `astra/day9-app` @ `9dd3a10`. Branch stays `astra/day9-app`. No deploy.

## Hard rules
- Days 1–6 and Day 8 story text **unchanged**.
- Day 9 story French text **unchanged** (Croissant palette in `art.js` is OK).
- No pixel fonts. Portrait mobile only.
- Preview (`day10/index.html`): **never** write/delete `a411.*` or any save; show preview notice like day9.
- M2 camera: show-then-say (≥0.8s action before line), never ceiling-only, panel open = subject in scene zone, laptop/phone = CU inserts with hand/face edge, Day 9 framing lessons (object CU, crisp integer scale, no sliced faces, reaction shots).
- Voice: every line → `../audio/w1/<id>.mp3` (beat ids `d11_*` / `n_d11_*`), silent fallback if file missing. **Do not generate audio.**

## Approved sources (in repo)
- `app/docs/day10/DAY10_BEATS.md` — **APPROVED**; **§8 overrides body:**
  1. Cut duplicate B1 « Mercredi matin. » **text**, keep B1 art.
  2. C2 optional M2: « Elle doit être belle ! »
  3. Chore **« L'album du toit »** — NO photobomb; polaroid enters album at **Day 11** opening, not Day 10.
  4. Camille « …Souriez. » = **high point**.
  5. Orange tail **ONLY inside photo** (evening zoom), **NEVER** live view.
- `app/docs/day10/CHORES_D9_D14.md` — Day 10 chore row (album du toit, not photo practice photobomb).
- Assets: `day10/` + `shared/props/` (from Pixel Studio v4). **`day10/DAY10_ASSET_LIST.md`** = truth: paths, PNG vs SPEC, P0/P1 build (P2 optional).
  - PNG: transparent, integer nearest-neighbour only.
  - Hub sprites 18×32, feet anchor (9,31); Camille side 20 wide (10,31); Noé hands-up 22 wide (11,31).
  - SPEC (zoom, gradients, flash) in code; zoom = single step.
  - Noé scarf-tug: placeholder existing Noé pose, path wired for future asset.
- **Colours:** `palette_a411` + Croissant table in asset list §0.2 everywhere (Day 9 cat in art.js too): fur `#E07B39`, shade `#A84E24`, highlight `#F9B566`, outline `#2B1E2F`, inner ear/pads `#E0A987`, nose `#C2463E`, eyes `#22303A`, muzzle white `#FFF8EC` on muzzle only.

## Deliverables

### Content & app
- `app/content-day10.js` — full beat spine from DAY10_BEATS (display day 10, clip prefix `d11_`).
- `app/modules/day10-chores.js` — Day 10 chore layer (frigo vide, liste Noé, café, **album du toit**, message replay, letter 10 « Réponse » per beats; watering optional invite not mandatory chore).
- `app/app.js`, `app/audio.js`, `app/art.js` — Day 10 routing, sprites, assets, camera.
- `day10/index.html` — mirror `day9/index.html` pattern (`APP_DAY=10`, `../app/`, continues from Day 9 complete state).
- `app/sw.js` — bump cache version; add **`/day9/`** and **`/day10/`** to **EXCLUDED** pass-through list next to `/legacy/` and `/day8/` (match pattern used in tests / production-root SW intent). Update `app/tests/sw.test.cjs`.

### Tests & screenshots
- `app/tests/day10-content.test.cjs`, chores tests, extend browser harness.
- `app/tools/v9-day10-screenshots.cjs` + wire in `v4-browser.cjs`.
- Regenerate **`app/screenshots/v9-day10-*.png`** at **390×844**:
  - `v9-day10-message-laptop-cu.png`
  - `v9-day10-keyboard-cat.png`
  - `v9-day10-martin-panel-open.png`
  - `v9-day10-dictation.png`
  - `v9-day10-breakfast-milk.png`
  - `v9-day10-roof-souriez-highpoint.png`
  - `v9-day10-polaroid-freeze.png`
  - `v9-day10-lefevre-stairs-look.png`
  - `v9-day10-evening-zoom-tail-in-photo.png`
  - `v9-day10-hook-flash.png`
  - `v9-day10-end-card.png`
  - `v9-day10-album-chore.png`
  - `v9-day10-day9-croissant-palette.png` (Day 9 frame proving new cat palette)
  - Plus regenerate any other v9-day10 shots needed for regression.

### Verify
From `app/`:
- `npm test`
- `V4_BROWSER=webkit npm run test:browser`
- `npm run test:webkit`

Commit: `feat(app): Day 10 Le message story, chores, and preview entry`

If the task is too large for one session, continue in a new `kilo run -c` session until complete, then commit once green.
