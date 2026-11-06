# Reusable assets for Day 8 / new app (`app/`)

Source of truth: branch `cursor/act1-days-8-14-cc00` @ `44b747a` (live v0.14.0) of `appartement-411-src`. Paths below are repo paths on that branch unless marked `[team]` (= `/workspace/a411-team/tech/astra_day8/`, committed under `app/docs/` for you).

## Rule (founder, 2026-10-15)
- **ART = reference, improve freely.** Every character, scene, plant, prop, close-up and UI image is a reference only. Redraw it better and more refined. The one hard constraint: Camille, Noé, Croissant (the cat), Madame Lefèvre and Martin must stay **instantly recognizable** (canon = the current in-game look, overview row 1; see `refs/CHARACTER_BIBLE.md` + `refs/character_bible_sheet.png`).
- **NON-ART = reuse as-is.** Word data, music, SFX and recordings are pulled by repo path. Do not regenerate, re-translate or re-record them.
- **CODE = reference only.** Build fresh code in `app/`. Read the old JS for behaviour, don't copy it wholesale.

## 1. Word / vocab data (reuse as-is)
| Path | What | Notes |
|---|---|---|
| `data/act1_lexicon_fields.json` | 167 Act I items (166 + `p2_38 le lait`): fr, gender, icon, tags | Hand-written by Prof Neng. **Never derive or edit.** Joins on `id` with `act1_testout_items.json` |
| `js/lexicon-data.js` | Generated bundle of the above (`A411.LEXICON_FIELDS`) | Built by `tools/build-lexicon.mjs`. Export to JSON for `app/` |
| `docs/ACT1_POTS.md` | Pot (review-set) definitions for Act I | Source for the single merged pots logic |
| `js/glossary-data.js` | 2,347 lemmas: game text + the ~2,270 most frequent French lemmas, with zh/en + short FR explanation | Powers tap-to-lookup. AI-drafted. Reuse as-is |
| `js/deck.js` | Public study deck v0.2.0 (items with examples) | Reuse the data, rewrite the code |
| `js/words.js`, `js/week1.js`, `js/act1days.js`, `js/content.js`, `js/letters.js` | Day 1–14 lines, Week 1 content, letters | Text source. Day 8 text comes from `refs/DAY08_FINAL_v2.md` |
| `js/conjugate.js` | Offline conjugation tables | Reuse the data/logic (starred feature) |
| `[team] refs/WORDLIST_W1-2_DRAFT.md`, `refs/CARNET_TAGMAP_D1-6.md` | Word list draft, carnet tag map | Reference |

## 2. Audio (reuse as-is)
| Path | Count | What |
|---|---|---|
| `audio/w1/*.mp3` | 269 | Week 1 line and word clips (e.g. `d2_cam_cafe.mp3`, `abs_noe.mp3`) |
| `audio/deck/*.mp3` | 154 | Deck word/chunk pronunciations (e.g. `a_droite.mp3`). Plays the correct audio after every review answer |
| `audio/d1/*.mp3` | 24 | Day 1 character lines (Camille `cam_*`, Noé `noe_*`, `bl_*`, `pr_*`) |
| `audio/music/*.mp3` | 5 | `apres-midi-parisien`, `matin-cafe`, `matin-coif`, `matin-coquin`, `promenade-passy`. Founder-supplied originals (`/workspace/a411-music/V0_SoundTracks`). Keep the volume control |
| `audio/sfx/*.mp3` | 12 | `bravo click door knock meow notif paper parcel phone purr steps water`. Day 8 needs: `meow`/`purr` (cat game), `water` (watering), `phone`/`notif` (voicemail, group chat), `door`/`knock`/`steps` |
| `[team] day08_assets/audio_night/night_01.mp3, night_02.mp3` | 2 | Night ambience for Écoute du soir / evening |
| `audio-candidates/{kokoro,pocket-tts,qwen3-tts}/mp3` | 3×19 | TTS engine comparison, Day 1 only. **Not for production.** Use for reference, not reuse |
- Pronunciation fallback stays: recorded clip, then device TTS, then text.
- New Day 8 lines (voicemail, group chat) are recorded by Croissant after Prof Neng's review. Ship placeholders, flagged replaceable (`[team] refs/AUDIO_TODO_DAY8.md`).

## 3. Art: all reference, improve freely
| Path | Count | What |
|---|---|---|
| `js/art.js` (pixel maps, e.g. `arrosoir`, `bag_arrosoir`) | – | Procedural sprites for core characters, apartment and props. **Canon look reference** (row 1) |
| `art/day08/characters/lefevre_handover_{0..2}.png` (+ `[team] day08_assets/characters/*_v1*`) | 3 | Lefèvre handing over (Day 8) |
| `[team] day08_assets/closeups/key_door_open_hand*.png` | – | Key close-up. **On hold (founder 👎). Do not use** |
| `[team] day08_assets/objects/lfd_chaises.png, lfd_fenetre.png` | 2 | Lefèvre's chairs and window |
| `[team] day08_assets/live/*.png`, `contact_sheet.png`, `preview_x8.png` | 15+ | Screenshots of the live game (look, layout, dusk lighting) |
| `art/minigames/croissant/cat_*.png` | 21 | Cat: idle, alert, creep, crouch-wiggle, paw tap, feint-lick, offended freeze. **Key ref for the cat-pushes-pot game** |
| `art/minigames/plant/*.png` | 19 | Plant idle, wobble, tip, caught, settle, straighten, sunbeam, fly, coffee cup. **Key ref for the pot tipping and the garden** |
| `art/minigames/garden_pot1/flowers_{full,wilting}_{1..4}.png` | 8 | Growth/wilt stages. Ref for the surprise morning growth reveal |
| `art/minigames/roof/` (`martin_plant*`, `rooftop_day9_pots`, `rooftop_night9_pots`, `rooftop_night_lightmap`) | 5 | Rooftop garden, Martin |
| `art/minigames/lefevre/lef_*.png` | 9 | Lefèvre: hum, laugh, stir, point, pinch salt, hold out hand |
| `art/minigames/noe/noe_dive_*.png` | 6 | Noé |
| `art/minigames/cooking/*` | 37 | Ingredients (+glow), pot stages. For later days |
| `art/day11/{characters,closeups,props,scenes}` | 34 | Noé, Croissant, tart, teapot, apartment and building at night |
| `art/*/manifest.json`, `art/day11/README.md`, `art/minigames/README.md` | – | Frame/anchor metadata. Useful for animation timing |
| `prototypes/astra-garden/` (branch `astra/garden-prototype`) | 79 screenshots | Your own garden prototype. The production UI direction |
| `icons/`, `resources/`, `ios/App/App/Assets.xcassets` | – | App icon and splash. Reference |
- `_x4`/`_x8` files are nearest-neighbour upscales of the same frame.

## 4. Lighting / visual style (reference, improve freely)
- `art/day11/scenes/apartment_night_lightmap.png` and `art/minigames/roof/rooftop_night_lightmap.png` are light maps for night scenes.
- Dusk / warm night grading lives in `js/art.js` and `js/shots.js`. There are no shader files. Reproduce the look, not the code.

## 5. Fonts
- No font files are bundled. The UI uses the system sans-serif stack (`css/style.css`): `system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", … sans-serif`. **Keep sans-serif. No pixel fonts.** The old Georgia serif rule is not to be reused.

## 6. Code (reference only)
- `js/fsrs.js` (FSRS scheduler), `js/review.js`, `js/reviewui.js`, `js/sync.js` (backup), `js/wordbook.js`, `js/glossary.js`, `js/grammar.js`, `js/feedback.js`, `js/legacy.js` (save migration), `js/i18n.js`, `js/music.js`, `js/sfx.js`, `js/audio.js` + `js/clips.js`/`deck-clips.js`/`week-clips.js` (clip maps).
- Re-implement one FSRS + review engine in `app/`, shared by the garden and the cat game, that imports the existing wordbook/FSRS save (Yuechao profile refused).
