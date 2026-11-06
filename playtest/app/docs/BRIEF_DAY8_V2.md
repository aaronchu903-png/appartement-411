# BRIEF Day 8: Round 2 (Astra)

Work on branch `astra/day8-app` (draft PR #28 → `cursor/act1-days-8-14-cc00`). Code in `app/`. Do not merge, do not deploy, never touch real saves (Yuechao's save is refused, as now). Model: high, never Fast.
Read first: `V2_PLAN.md`, `v2_compare.png`, `BRIEF_DAY8.md` (story and content still valid), `INHERIT_FEATURES.md`.

## 0. One-sentence goal
Keep **your art and animation exactly** and put it in **our old game's UI and interaction**: a full-screen pixel scene with in-scene dialogue, word zoom reveals and pixel controls, polished to commercial quality.

## 1. Keep (do not change)
- `app/art.js` look: palette, painters, characters, cat, scenes, lighting. Additive changes only.
- `engine.js` review/FSRS (used by the rooftop garden only), lenient grading, Prof Neng's 5 items, typography (’ and U+202F), save import and Yuechao refusal, `content.js` story.
- All tests pass, except: **delete the test asserting the cat uses the review engine**. Keep every garden review/FSRS test.

## 2. Do
1. Write `app/docs/ART_STYLE.md` + `app/tokens.css` first (see V2_PLAN §3). The chrome uses these tokens.
2. The stage is one full-viewport canvas (cover, pixelated). The UI is an overlay **on** the scene.
3. Dialogue: an in-scene pixel box at the bottom, ≤ 25% of the height. It has a name-tag chip in the character's colour, a line counter, small square pixel buttons (replay ↻, Aa, ?) and a « Continuer ▶ » pixel button, or tap anywhere to advance. Words in a line can be tapped for lookup.
4. New word: the object pulses in the scene, then zooms (camera push) into a pixel frame card. Guess first, then reveal word + audio + gender colour, then « + Ajouter au carnet » / OK.
5. Lookup: a pixel popup over the scene (form → base, 3 gloss lines, audio, + carnet, close).
6. **Persistent HUD: copy v0.14 exactly** (`/workspace/a411-v14/css/style.css` L243 `.wb-fab`, L329 `.mu-fab`, L425 `.fb-fab`; `js/app.js` L3871–3944; refs `37-v080-d6-balcon.png`, `24-word-card.png`). The four controls are always on screen in every scene, including the garden and the cat game:
   - bottom-left: **Carnet** (46px). It opens the wordbook as an overlay **over the scene** (like opening a skill); the scene stays visible and dimmed behind it, and closing returns to the same beat. It is never a page or a tab.
   - bottom-centre: Note / Retour (feedback).
   - bottom-right: music on/off.
   - top-right: Pause, which holds settings, language, import and dev.
   Same positions, sizes and safe-area insets as v0.14; only the skin uses the Astra tokens. The dialogue box sits above the bottom HUD row.
6b. **Modules:** implement M1 Scène, M2 Jardin, M3 Répondeur and M4 Réplique as reusable modules (`app/modules/<id>.js`, `run(id,{items,skin,sceneHooks})`). Scenes only call them; no module logic in scene code (V2_PLAN §4b).
7. Garden: the full-screen NIGHT rooftop with tiered shelves and a data-driven slot grid, scaling to 50+ pots (V2_PLAN §4). Watering questions appear in an in-scene pixel box. The correct audio plays after every answer, and the can-pour animation runs on the target pot.
8. Cat game, **CHANGED**: a simple, cute touch game, **no review questions and no FSRS**. Croissant's paw creeps toward the pot; tap or drag to bop it back or block it. It lasts about 10–20 s, there's no fail screen, and if you're slow the cat gets nearer and looks smug, then gives up. The "safe" end shows the basil **in the pot**.
8b. **Story order:** remove `d8_morning_review` from the kitchen opening. Review exists only on the rooftop: after `n_d10_plante`, one M2 session runs `d8_first_watering` (basil, pot ②) and then the due review of pot ① (Martin's plant, carried up by Noé with one new narration line, which goes to Prof Neng). Details and the fallback are in V2_PLAN §4b.
9. Entry: your dusk rooftop full-screen, small in-scene title, one pixel « Continuer · Jour 8 » button, a small "导入我的进度" link.
10. Animation at « J'ai faim » level. **Reference is the whole video:** `app/docs/refs/jai_faim.mp4` (Le CTO commits it from `astra_day8/v2_refs/jai_faim_C_save_final.mp4`; 24 fps, 25.1 s). Extract every frame (`ffmpeg -i app/docs/refs/jai_faim.mp4 -vsync 0 /tmp/jf/%04d.png`) and study the motion frame by frame. The 3 stills in `v2_refs/` are only an index, **not** the reference. Motion is continuous frame by frame: the cat walks or peeks in, and nothing pops in or teleports. Required qualities: breathing and blinks on idle, anticipation plus squash and stretch, held poses with quick transitions, secondary motion (hair, ear, tail), pixel effect particles, and per-beat expressions. Required for Noé, Camille, Gaspard and Lefèvre on their beats, and for every cat state.

## 3. Reference pairs: "make it look like OLD, render with ASTRA art"
| Element | OLD (layout/interaction) | ASTRA (art to use) |
|---|---|---|
| Scene + dialogue | `/workspace/a411-v14/evidence/37-v080-d6-balcon.png`, `v2_refs/hub-d8_C.png` | `app/screenshots/mobile-story-02-line-n_d8_matin.png` (top canvas only) |
| Word reveal | `/workspace/a411-v14/evidence/24-word-card.png` | `mobile-story-03-d8_cam_depuis-revealed.png` (canvas) |
| Lookup popup | `v2_refs/40a-v092-lookup-form.png`, `40-v050-lookup-online.png` | `mobile-lookup-before.png` |
| Persistent HUD | `37-v080-d6-balcon.png`, `24-word-card.png` (carnet bottom-left, Note centre, music bottom-right, Pause top-right) | n/a (Astra tab bar is banned) |
| Garden | `/workspace/a411-team/garden/rooftop/rooftop_night_tidy_x4.png`, `/workspace/a411-v14/art/minigames/roof/rooftop_night9_pots.png` (+ `rooftop_night_lightmap.png`) | `mobile-garden-start.png` (pot/can painters) |
| Entry | `/workspace/a411-v14/evidence/01-title-390.png` | `mobile-entry.png` (illustration only) |
| Cat game | (old box style as above) | `mobile-cat-*.png`, `desktop-cat-end.png` (bug) |
| Animation | `app/docs/refs/jai_faim.mp4` (whole video, every frame) | `app/screenshots/cat.webm` |
(The old screenshots are 780x1688 = 390x844 @2x.)

## 4. Ban list (any of these = reject)
- Full-width cream or paper cards or sheets covering the scene, or any block **below** the scene.
- Web headline typography: big bold titles, kicker labels in letter-spaced caps ("A WORD YOU MET", "DAY 8 · LE BASILIC").
- Bottom tab bar (Story/Garden/Words/More), hamburger menus, landing-page hero.
- Flat rounded web buttons, soft drop shadows, blur, gradients on chrome.
- Scene below 75% of the viewport on 390x844.
- Pixel fonts (use sans-serif), emoji, red ✗.
- Do not copy UI from PR #27's prototype.

## 5. Acceptance (check on screenshots, 390x844 and desktop)
- [ ] Every screenshot: the canvas covers ≥ 75% of the viewport; the overlay UI ≤ 25%. Add a test that computes this from layout boxes.
- [ ] Each pair in §3 has a new screenshot `app/screenshots/v2-<element>.png`, plus a `v2_contact.png` next to the old ref.
- [ ] No banned element (manual checklist in PR body, item by item).
- [ ] Garden renders with 2, 24 and 60 pots (`v2-garden-2.png`, `-24`, `-60`).
- [ ] `desktop/mobile-cat-end.png` shows the basil in the pot. Add a regression test. The cat game shows no question UI.
- [ ] HUD: every v2 screenshot has the 4 controls at the v0.14 positions; `v2-carnet-open.png` shows the carnet overlay with the scene visible behind it.
- [ ] No review in the kitchen: a test asserts M2 runs only in `roof`, and the story order matches §2.8b.
- [ ] Modules: M1–M4 live in `app/modules/`, each invoked from at least one scene through `run()`.
- [ ] `v2-anim-cat.webm` shows the cat walking or peeking in continuously (no pop-in).
- [ ] A 10 s capture of an idle beat and of the cat push (`v2-anim-idle.webm`, `v2-anim-cat.webm`) shows the micro-motions in §2.10.
- [ ] `npm test`: all passing, 0 failing (94 minus the removed cat-engine test plus the new tests); `ART_STYLE.md` present; art golden snapshots unchanged except additive scenes.
- [ ] PR body: before/after table, assumptions, what's left.

## 6. Notes for the dispatcher (read with §7–10 below) (prompt lessons)
v1 drifted because "app-like / less website" had no picture and PR #27 was cited as direction. This brief pins the look with screenshot pairs, numbers, a ban list and screenshot acceptance. Send `v2_compare.png` as an image with the prompt. **Le CTO, before dispatching:** commit `astra_day8/v2_refs/jai_faim_C_save_final.mp4` to `app/docs/refs/jai_faim.mp4` on `astra/day8-app` (≈0.7 MB), plus `v2_refs/*.png` to `app/docs/refs/`.

## 7. Port, don't rebuild (founder, Oct 15)
Do **not** rebuild the UI or interaction from scratch. Port v0.14's mature UI and interaction logic (`/workspace/a411-v14`, branch `cursor/act1-days-8-14-cc00`) into `app/`, then **simplify** it and reskin it with Astra tokens and art.

### 7a. Reuse, don't reinvent (port these)
| Old file (`/workspace/a411-v14/`) | What to port | Into |
|---|---|---|
| `js/app.js` (dialogue box, `#btnWordbook`/`#btnMusic`/`#btnFeedbackBar`/`#btnPause`, L3871–3944) + `css/style.css` (L183–230 ostension: focus/zoom/pulse, `.wb-fab` L243, `.mu-fab` L329, `.fb-fab` L425) | in-scene dialogue, persistent HUD, focus/zoom/pulse word reveal | M1 Scène + HUD |
| `js/shots.js` | camera shots / zoom framing | stage over `art.js` |
| `js/wordbook.js` | carnet overlay (list, card, audio, gender colours) | Carnet overlay |
| `js/glossary.js`, `js/lexicon.js`, `js/lexicon-data.js`, `js/glossary-data.js` | tap-to-lookup (form → base, 3 gloss lines) | lookup popup |
| `js/conjugate.js`, `js/grammar.js` | offline conjugation, grammar aha « Garder » | lookup / M1 |
| `js/fsrs.js`, `js/learn.js`, `js/pots.js`, `js/reviewui.js` | FSRS, card import, pot↔card logic, answer UI patterns | M2 Jardin (merge with Astra `engine.js`; one engine; keep Astra's lenient grading and tests) |
| `js/audio.js`, `js/clips.js`, `js/deck-clips.js`, `js/sfx.js`, `js/music.js` | recordings → TTS → text fallback, SFX, music + volume | audio layer |
| `js/feedback.js` | Note/Retour feedback (fix upload bug) | HUD centre |
| `js/sync.js`, `js/legacy.js` | backup/sync, save migration | save layer (with Astra `save.js`) |
| `js/writing.js` | « Vérifier » lite | M4 Réplique |
| `js/i18n.js` | language toggle | Pause menu |
| `js/founderdev.js` | `?dev=1`, day jump | dev |
Astra's own files stay for art (`art.js`), story data (`content.js`) and review grading (`engine.js`).

### 7b. Simplify: cut from the old UI
- Version / build strings on the title and in the HUD (« v0.14.0 », content hashes, "schema v1"); dev mode only.
- Title tile menu (Histoire / Au bureau / La plante) and the "Note" button on the title. One « Continuer · Jour 8 » button instead.
- The line counter « 34 / 59 » in the dialogue box.
- The no-voice reading banner (the orange box). Use a one-time icon in Pause instead.
- The duplicate replay plus « Aa » plus « ? » trio: keep replay; move « Aa » (text size) into Pause; keep « ? » only on exercises.
- The always-on Chinese translation strip under each line (see §9).
- Desk / "Au bureau" hub tiles, streak text ("连续 0 天"), "Fast review (4 cards)", the postcards button: not in Day 8.
- Help text paragraphs on cards; toasts that explain rules.
Keep: the HUD 4, dialogue box with name chip + replay + Continuer ▶, focus/zoom reveal, lookup popup, carnet overlay.

## 8. Show, don't tell (no filler narration)
- Never narrate what can be shown. Banned examples: « La plante a poussé cette nuit. », "The plant is safe.", "Camille gently lifts Croissant away." Animate the growth, the lift and the relief instead.
- Narrator lines (`n_*`): **at most 6 on Day 8** (currently 12). Keep only time or place jumps and sound gags (« Toc, toc ! »). Each one is short (≤ 8 words). Every cut must be listed in the PR so Prof Neng can check continuity.
- **No explanatory captions or subtitles** that describe action, state or rules (« Arrosez vos mots », "A little water for your words", completion blurbs). End and completion moments are wordless animation, plus a SFX and at most one character line.

## 9. Minimal Chinese; French by default
- On screen by default: French only (dialogue, narration, buttons such as « Continuer », « Ajouter au carnet », « Pause »).
- Chinese appears **only** in (1) lookup or carnet glosses and (2) optional hints the player opens with « ? ». Never in narration, dialogue, UI prose, end cards or the title.
- The UI language toggle (Pause) may switch glosses or hints between 中文 and English; it never adds translations to the story.

## 10. Extra acceptance for §7–9
- [ ] PR lists each old file ported (table 7a) with its new path; no rewritten-from-scratch dialogue, HUD, lookup or carnet.
- [ ] PR lists each 7b cut, with a screenshot before and after.
- [ ] Test: Day 8 has ≤ 6 narrator lines, each ≤ 8 words.
- [ ] Test: no CJK characters (`/[\u3400-\u9fff]/`) in any narration, dialogue, UI label or end-card string; only gloss and hint fields may contain CJK.
- [ ] Test: no string matching a caption denylist ("plant is safe", "grew", "a poussé", "water your words", "arrosez vos mots").
- [ ] Screenshots: the default screen shows no Chinese text unless the lookup or a hint is open.


## Approved line (Prof Neng)
Noé carries pot ① to the roof, dialogue line: « Et ta plante ? Je la monte aussi ! » (listen-only, not reviewed). No narration line for this.

## Pixel UI icons and controls (founder, hard rule)
Every UI icon and control must be the old v0.14 pixel-art style: the pixel lightbulb (grammar aha), the pixel carnet/wordbook icon, the pixel plant/pot icon, the pixel music, pause and note icons, pixel-bordered dialogue box and buttons. Port these sprites/CSS from v0.14 (art.js / style.css / icon sprites) and recolour to Astra's palette only if needed.
BANNED: modern line icons (Lucide/Feather/Material/SF-style outline icons), rounded flat web buttons, circular glass icon buttons, soft drop shadows, thin vector strokes, gradient pills. Astra's PR #28 top-right round mute/settings buttons and bottom tab-bar icons are examples of what NOT to do.
Acceptance: test/scan that no SVG outline icon set is imported; every screenshot shows only pixel icons; PR includes an icon sheet (old vs new) proving each icon is pixel-style.

## OVERRIDE §8/§10 narration caps (founder, latest)
Remove the hard cap of 6 narrator lines / 8 words and the narration-count test. Some narration is fine, as in v0.14. Principle instead: prefer game language (animation, camera, SFX, character action, scene change) to convey events; use narration only where showing is impossible, and never for filler description. Keep the banned-caption-phrase scan and the no-Chinese-narrative test. Do not cut existing narration lines just to hit a number.

## North star (founder, final)
Keep PR #28's visual texture and restraint exactly (finer pixel art, calm palette, character motion). But the game must feel like the SAME game as v0.14 (same genre, flow, HUD, interactions). Step 0: read the old codebase (branch cursor/act1-days-8-14-cc00: js/, css/, docs/) before writing code, and write app/docs/PORT_NOTES.md: what you port, what you simplify, what you cut. Then make it more fun: tighter pacing, juicier feedback (sound + pixel effects on every correct answer/tap), more delightful moments with the cat and characters, no dead taps. Sellable commercial quality.
