# Day 8 V2 Plan: Astra art + our established game feel

Status: plan only (not dispatched). Branch: `astra/day8-app` (PR #28, commit 716c645). Preview played by founder Oct 15, 2026.
Contact sheet: `v2_compare.png` (old v0.14 vs Astra, 4 pairs + animation reference frames).

## 1. Founder verdict
- KEEP from Astra: the story-scene illustration style, finer pixel art, character motion. She loves it.
- REJECT from Astra: UI, controls, interaction. Cream web card on the lower half, big sans headline, "Continue" buttons, bottom tab bar. It reads as a website: no style, not immersive, the game lives in a small top strip.
- RESTORE from old (v0.14, branch `cursor/act1-days-8-14-cc00`, clone `/workspace/a411-v14`): full-screen pixel scene, in-scene dialogue box, new word appears and zooms (guess, then reveal), tap-to-lookup popups, pixel-game chrome. Most content uses that interaction form.
- Garden: use the NIGHT rooftop with many pots, because there will be many plants later. Two pots on a table won't scale.
- Animation bar: the « J'ai faim » short (Noé + Croissant, kitchen). Day 8 character and cat motion must match it.
- Goal: polished, fun and sellable, but built on our established experience. The sans-serif rule stays: no pixel fonts. The chrome must still feel like a pixel game.

## 2. Area by area
| Area | Old v0.14 (ref) | Astra PR #28 (ref) | Decision |
|---|---|---|---|
| Scene | Full-bleed pixel stage. Dialogue overlays it (`evidence/37-v080-d6-balcon.png`, `v2_refs/hub-d8_A.png`) | Beautiful 480x320 canvas squeezed into the top ~40% (`mobile-story-02-line-n_d8_matin.png`) | **Astra art + old layout.** Scene is at least 75% of the 390x844 viewport, cover-scaled. |
| Dialogue | Pixel-bordered box with a name tag chip, line counter, replay / Aa / ? / Continuer ▶ chunky buttons (`37-v080-d6-balcon.png`, `hub-d8_C.png`) | Cream card with a big headline and a flat green "Continue" bar | **Old.** Box sits inside the scene, max ~25% height. Tap anywhere to advance. Restyle with Astra's palette. |
| New word reveal | Word zooms out of the scene. Picture card, guess, then reveal, "+ Ajouter au carnet" / OK (`24-word-card.png`) | "A WORD YOU MET" web page section (`mobile-story-03-...-revealed.png`) | **Old flow**: zoom from the hotspot into a pixel frame. Draw the zoomed object in Astra's art. |
| Lookup | Tap a word, then a pixel popup with form → base, 3 gloss lines, audio, + carnet (`v2_refs/40a-v092-lookup-form.png`) | Inline panel (`mobile-lookup-before.png`) | **Old popup**, Astra palette. |
| Review / watering | Desk card list; watering button (`hub-d8-plant.png`). Review happens **only on the rooftop** (see §4b) | "Your little garden" web list with "Water my words" (`mobile-garden-start.png`) | **New:** full-screen NIGHT rooftop (§4). Questions appear in an in-scene pixel box. Correct audio plays after every answer. Keep Astra's engine (FSRS, lenient grading). |
| Cat game | Old mini-games (dropped) | Cat art good; uses review/FSRS questions in a web card (`mobile-cat-*.png`); empty-pot bug (`desktop-cat-end.png`) | **CHANGED:** a simple, cute touch game only (tap or drag to stop the paw, about 10–20 s, no review questions, no FSRS). Astra cat art, J'ai faim–level motion, fix the empty pot. |
| Navigation / controls (persistent HUD) | Mature fixed HUD (v0.14 `css/style.css` 243/329/425, `js/app.js` 3871/3928/3944): **bottom-left = Carnet `#btnWordbook .wb-fab`** (46px, opens an overlay over the scene), **bottom-centre = Note/Retour feedback `.fb-fab`**, **bottom-right = music mute `#btnMusic .mu-fab`**, **top-right = Pause** (settings, language, import). Refs `37-v080-d6-balcon.png`, `24-word-card.png` | Bottom tab bar Story/Garden/Words/More | **Old, exactly.** Same 4 positions, sizes and safe-area insets. The carnet is a skill-style overlay on the scene, never a page or tab. Restyle only with Astra tokens. |
| Entry screen | Title over a pixel building with a tile menu (`01-title-390.png`) | "Le basilic." web hero with a cream card (`mobile-entry.png`) | **Hybrid:** Astra's dusk rooftop illustration full-screen, title small in-scene, one pixel button « Continuer · Jour 8 », import as a small pixel link. |

## 3. Preserving Astra's visual style
Astra's art is procedural canvas code, not sprite files: `app/art.js` (782 lines; `draw(canvas,state)` paints 480x320, plus painter helpers `sky / skyline / floor / pot / can / person / cat / *Background`, and hotspots via `getHotspots`/`projectHotspots`). The palette is in `app/style.css :root` (`--paper #f6f1e5, --ink #293e37, --green #3d5e4b, --gold #bd945b, --rose #b66e67, --blue #5c7c9b`).
1. **Lock the art as canon.** `art.js` scene renderer and painters are frozen apart from additive changes (new scenes, the rooftop shelf, animation states). No restyling.
2. **Write `app/docs/ART_STYLE.md`** (Astra writes it first, before any UI work): native resolution, palette tokens, outline and shading rules, light (dusk / night grading), character proportions, the per-character pose list, and the cat pose list. Add screenshots of each scene at 1x and 4x.
3. **Tokens:** move the palette into `app/tokens.css` and use it for both canvas and chrome. The pixel chrome (borders, buttons, name chips) is drawn with 2px hard borders, a stepped corner, a 1px inner highlight and no blur or soft shadows. Text is sans-serif.
4. **Renderer becomes the stage:** one full-viewport `<canvas>` (cover, `image-rendering: pixelated`, integer scale where possible). UI is an overlay layer on top, never a sibling block below.
5. **Snapshot tests:** golden PNGs of each scene from `art.js` so later rounds and Days 1–7 rebuilds can't drift.

## 4. Garden: night rooftop that scales to 50+ pots
Sources: `/workspace/a411-team/garden/rooftop/rooftop_night*.png` (192x256 + x4), `/workspace/a411-v14/art/minigames/roof/rooftop_night9_pots.png` and `rooftop_night_lightmap.png` (string lights, pots along the parapet, Paris skyline, roof door). These are composition reference: redraw in Astra's style.
- **Layout:** tiered shelves along the parapet and walls. Each shelf row holds 8 pots at 390px width; 3 visible rows give 24 pots per screen. Scroll or pan horizontally along the roof by "shelf bay" (bay = 24 slots), so 50+ means 3+ bays. Pots are a data-driven slot grid (`slots[] {bay,row,col}`) so nothing is hard-coded.
- **Zoom levels:** overview (all bays, tiny pots and glow) → bay → single pot (the zoom used for watering and growth reveal).
- **Light:** warm string-light pools via a lightmap. Pots that are due glow faintly (a firefly or dew sparkle), never a red badge.
- **Care loop (unchanged rules):** answering is watering only; no real-time growth. The hidden care score leads to a surprise growth reveal some morning. One pot per word group; On Day 8 the rooftop holds Martin's plant (carried up, §4b) plus the basil, the other slots empty and visible as promise.

## 4b. Modules and story order (founder, Oct 15)
**Modular gameplay** (Oct 14 Rhythm Doctor direction, `strategy/STRATEGY_RESET_2026-10-15.md`): the core learning parts are reusable modules with one API, invoked from any scene with scene skin + content:
- M1 Scène (listen and read, tap a word to collect it, guess-then-reveal)
- M2 Jardin (review: auto-graded active answers plus the correct audio; rooftop only)
- M3 Répondeur (listening and dictation: voicemail and group chat)
- M4 Réplique (output: reply to a character)
- Carnet is the data layer plus the HUD overlay.
Each module is `run(moduleId, {items, skin, sceneHooks}) → result`. Scenes never reimplement a module. The cat game is **not** a learning module; it's a one-off scene interaction.

**Review is rooftop-only.** The kitchen morning review of pot ① (`d8_morning_review`, kitchen, `can:'martin'`) moves out of the kitchen. Minimal reorder:
- Old order: `d8_morning_review → n_d8_matin … d8_cat … d8_focus_roof → d10_noe_ici → n_d10_plante → d8_first_watering → n_d10_arrose → d8_end`
- New order: drop `d8_morning_review` from the opening (the day opens on `n_d8_matin`). The kitchen keeps the story plus the cat touch game. After `n_d10_plante` on the roof, run **one M2 rooftop session**: `d8_first_watering` (basil, pot ②), then the due review of pot ① (Martin's plant, now placed on the rooftop shelf).
- Story fix (Prof Neng approved): Noé carries pot ① up the stairs and says, as dialogue (no narration): « Et ta plante ? Je la monte aussi ! » Listen-only, not reviewed; it answers his morning line « Et la plante ? ».
- Rationale: one review place, and a night rooftop that grows with the wordbook. The kitchen scene stays story and cat only.

## 5. Animation reference: « J'ai faim »
Reference = the **whole video**, `v2_refs/jai_faim_C_save_final.mp4` (copied from `/workspace/shortsrv/`, 1080x1920, 24 fps, 25.1 s, 602 frames). Le CTO commits it to `app/docs/refs/jai_faim.mp4`. The 3 stills (`v2_refs/jaifaim_*.png`) are only an index, not the reference. Motion is continuous frame by frame: the cat walks or peeks in, never pops in. The Remotion source is not on the box; ask Le Buzz.
What makes it detailed:
- **Frame-level micro-motion:** idle is never static. A 1–2 px breathing bob, blinks every 2–4 s, and small head tilts on speech beats.
- **Squash and stretch:** the stomach-rumble body shake, the slump when the fridge is empty, the hop when the cat arrives. 1–2 px squash on landings and anticipation before moves.
- **Timing:** held poses (about 0.5–1 s) between actions, quick 3–4 frame transitions, beats synced to the line audio and the speech-bubble pop.
- **Secondary motion:** hair, fridge light flicker, cat ear twitch and tail sway lagging the body by a few frames.
- **Expressive effects:** motion ticks, sweat or droop lines, sparkles, "…" thought bubbles. These are pixel particles, not emoji.
- **Expressions:** eyes and mouth change per beat (hungry, deflated, delighted).
Requirement: every Day 8 character beat and every cat state (idle, approach, push, caught, lifted) reaches this level.

## 6. Why v1 drifted to "website", and prompt fixes
- The brief said "app-like, less website" without visuals. A model reads "app-like" as iOS cards, tab bars and big headlines, which is exactly the web/SaaS look.
- The PR #27 garden prototype (web-style cards) was given as "direction", so its UI was copied along with its ideas.
- No layout numbers (scene %), no ban list, no screenshot pairs, no screenshot-based acceptance check.
- "Inherit features" listed functions, not their visual and interaction form.
Fix in V2: name the look by pointing at screenshots, give numbers, a ban list and an acceptance checklist checked on screenshots.

## 7. Round 2 scope
Same branch, same draft PR #28, no merge or deploy. Keep all tests passing except the cat-uses-review-engine test, which is removed (the garden review/FSRS tests stay); add new ones. Fix the empty pot. Recordings are still missing (TTS fallback OK); Croissant records later.

## 8. Founder constraints added Oct 15 (detail in BRIEF_DAY8_V2 §7–10)
- Port and simplify v0.14's UI and interaction, never rebuild it; there's a reuse table with file paths and a cut list.
- Show, don't tell: at most 6 narrator lines on Day 8 (12 today), and no explanatory captions.
- French on screen by default. Chinese appears only in lookup or carnet glosses and optional « ? » hints. Enforced by a CJK test.
