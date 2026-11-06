# Day 8: v0.14 (old) vs v2 (src 4141fa9). Why it doesn't feel like the old game yet

Sources: old = `/workspace/a411-v14` (branch cursor/act1-days-8-14-cc00: `js/act1days.js`, `js/week1.js`, `js/studyui.js`, `js/pots.js`, `js/app.js` openWordbook).
v2 = `/workspace/d8dl/app` (`content.js`, `app.js`, `art.js`, `engine.js`, `modules/M1-M4.js`). Screenshots are in `app/screenshots/v2-*` and `day08_assets/live/*`.
Line numbers refer to 4141fa9.

## 0. Summary: the 6 root causes
1. **Review got rewritten as a quiz.** The old flip-card + watering-can loop became an MCQ/typing quiz. A full-width `Continuer` gates every item, and the water effect is a single on/off flag.
2. **The Day 1-6 learning template was never applied to Day 8.** That template is pick-with-pictures, chips sentence building, an end probe, a diary, and 9-12 new items. Old Day 8 was already the thin version, and v2 copied it. v2 also replaced the one listen-and-pick beat with a silent "tap the hotspot".
3. **The carnet row was rebuilt from scratch.** The old row (gender-coloured article, POS tag, zh/en gloss, source sentence, audio) was dropped. v2 rows show only `f. la porte · Rencontré`.
4. **Art bugs in the renderer.** The table is drawn over Camille and Noé. The cat teleports off-screen and then slides in as a rigid sprite.
5. **Day 8 has no recorded voice at all.** Old `audio/w1` has 269 clips for Days 1-7 and 0 for d8/d9/d10. Every line falls back to TTS or text, which kills narrative feel.
6. **Leftover web chrome** (ATELIER tag, `<select>`, search box, tiny overlays) makes it read as a site.

---

## 1. Garden watering / review hand-feel
| | old v0.14 (`studyui.js` 140-280, `pots.js`) | v2 (`app.js` 273-345, `engine.js`) |
|---|---|---|
| Card model | Flip card. Front shows a French line, listening, or cloze, with a `中文` toggle. `Continuer` flips it and autoplays audio. The back shows the answer **gender-coloured with a POS tag**, the meaning, `Pourquoi ?` (note + conjugation), and replay | Quiz: R1 listen→MCQ, R2 cloze MCQ, R3 chunk order, P1/P2 typing |
| Grading | Self-grade: `Pas encore` / `Je savais`, with long-press for hard/easy (520 ms). Two big buttons, one tap per card after the flip | Auto-graded answer, then a feedback panel, then an extra full-width **`Continuer`** tap (`review-next`). That makes 2 taps per item and a dead stop after every answer |
| Prompt clarity | Front always shows what is asked | R1 shows a **whole sentence** (e.g. Day 1 « Voici l'appartement 411… toc, toc ! ») and 4 bare words (tasses/fenêtre/table/porte), with no instruction about which word to pick (`v2-mobile-R1-before.png`) |
| Water feedback | `waterBar`: watering-can icon, a **meter that counts down** (`waterLeft`), a pot row where the target pot **pours**, **moisture 0-3** per pot (`water.growth`), the bar shakes while pouring, and the end summary lists watered pots + growth | `sceneModel.water=1` for the whole feedback screen and `A.sfx('water')`. No can meter, no remaining count, no moisture or growth step per answer, no per-pot summary |
| Progress | `n / N` and the can level | none visible |
| Undo | yes (`btnUndo`) | none |
| Session | Pot tap → `reviewCap: 6`. "Short version (4 cards)" exists | Engine queue. First watering merges due cards, so Day 1 sentences show up on Day 8 |

**Fix spec (Astra):**
- Port the old **flip-card + self-grade** as the default garden card. The front shows the prompt in the dialogue box (pixel skin), `Continuer` flips it, and the back gets gender colour, the `?` gloss, and two pixel buttons `Pas encore` / `Je savais`, with long-press kept. A grade **immediately** advances, with a ≤600 ms pour animation and no extra Continuer. Keep the auto-graded R2/R3 types only as an occasional variant (max 1 in 4), and after a correct answer auto-advance after the pour plus the audio (≈900 ms). Show a Continuer only after a *wrong* answer.
- Every R1/R2 must show an explicit French prompt line: « Écoute. Quel mot ? », plus picture cards when the word has a prop, as in old `pick`.
- Port `waterBar` into the pixel HUD: a can at the top-left with drops = items left. Each grade pours onto the **target pot on the shelf** (stream, soil darkens, pot moisture +1, leaf lift at 3), with `water` sfx in sync with the pour frame and a small `ding` on `Je savais`.
- End of session: each watered pot plays a 1-frame growth pop, then `Bravo !`. No text summary card.
- Queue: in the first rooftop session, only Day 8 words (max 5). Never surface older-day sentences in the first watering.

## 2. Carnet (wordbook)
| | old (`app.js` openWordbook ~4390) | v2 (`app.js` 451-459) |
|---|---|---|
| Row content | Head **with article and gender colour** (`frHead`, `data-gender`), **POS tag**, zh/en gloss lines always visible, « source sentence », audio button, delete, conjugation button for verbs | `f.` / `m.` text + word + mastery label. Gloss **only after expanding** |
| Filtering | one list, newest first | `<select>` by plant + web search input |
| Size | full sheet | small floating box (`v2-mobile-carnet-open.png`, founder's `carnet_small.png`) |

**Fix spec:**
- Every row, collapsed, shows: gender-coloured article+noun (masculine/feminine palette from old CSS `genderClass`), POS chip, one-line gloss (zh default, en per setting), audio icon, status pip (pixel dots, not text).
- Expanded: the source sentence from the story with tap-to-hear, conjugation for verbs, **and a scene thumbnail**. Render it from `art.js` with that line's scene state (scene + props + characters at the first exposure `lineWordIds[word]` → scene id). Draw it to a 120×80 offscreen canvas at 1/4 scale and cache it (data URL in IndexedDB or memory). Every focus word and every word first heard on a line with art gets one.
- Near-full-height pixel sheet, no inner scroll for ≤8 rows. Replace `<select>` with pixel pot tabs and the search box with a pixel icon that opens an input. Remove the explanatory paragraph.

## 3. Pacing, narrative feel, voice
- Narration count is about the same (old d8 11 narr, v2 11 neutral lines), so the problem is not the amount of text. It comes from:
  a. **No voice.** 0 recorded clips for any d8/d9/d10 id (`audio/w1` has 269 clips, all Days 1-7), so lines play robotic TTS or nothing. Old Days 1-7 had per-character recordings.
  b. **Long passive runs**: stairs + arrival + soup (v2 scenes 19-29) are 10 taps of Continuer with only one tap-to-learn. The kitchen chat block (16-18) is 3 phone exercises in a row with no scene change.
  c. The voicemail + 3 chats + 3 replies are all **the same text-panel interaction**. The old picks with picture cards and the minigame gave variety.
- **Fix spec:** record all Day 8 lines with the old voice pipeline (same speaker voices as w1; ids are in `content.js` `audio`) before v3 ships. Until then, mark TTS-fallback lines in QA. Cap passive runs at **4** consecutive non-interactive beats: insert a pick or focus or tap-object every ≤4 lines. Split the chat block: 1 chat in the kitchen, 1 on the stairs, and fold the third into a dinner pick. Lines auto-advance after their audio plus 1.2 s only if the user enables it; the default stays tap.

## 4. Cat entrance
- Root cause (`art.js` 773-787 + `app.js` 676): in scenes 0-3 Croissant is drawn sitting near the pot (approach=1 → x≈240). On the `cat` beat, `approachElapsed` resets to ~0, so `x = 510` (**off-screen right**) and the cat **teleports out and glides back** over 1.5 s with smoothstep. The only motion is a 2 px whole-sprite bob, with no walk cycle, squash or anticipation. So it looks like a sliding cutout.
- **Fix spec:** start the approach from the cat's *current* on-screen pose, not x=510. Approach with a 4-frame walk cycle (legs, tail counter-swing, head bob 1 px offset). Add an anticipation crouch (2 frames) before the reach and a paw extension during it. Follow the « J'ai faim » reference frame by frame. If the cat is not yet in frame, it walks in from the doorway edge with its body partly occluded, never popping in.

## 5. Learning density: old Days 1-6 vs old Day 8 vs v2 Day 8
| | old d2 | old d3 | old d4 | old d5 | old d6 | **old d8** | **v2 d8** |
|---|---|---|---|---|---|---|---|
| steps | 70 | 52 | 50 | 58 | 64 | 52 | 53 |
| deck (new items) | 12 | 11 | 9 | 7 | 9 | 5 | 6 sentences + 9 fragments |
| focus (zoom new word) | 4 | 2 | 4 | 4 | 4 | 4 | 3 |
| pick (listen → choose, picture cards) | 3 | 2 | 1 | 2 | 3 | 2 | **0** (d8_pot became a silent hotspot tap, d8_heure became a voicemail cloze) |
| chips (build a sentence) | 2 | 1 | 1 | 1 | 1 | 0 | 0 in story (chat chunks only) |
| choice/say | 6 | 1 | 3 | 1 | 3 | 4 | 4 reply/choice + 4 chat + 1 voicemail |
| probe (end check) / mission / diary | yes | yes | yes | yes | yes | **no** | **no** |
- Graded learning beats: old d2 ≈ 9 (3 pick + 2 chips + 4 probe). Old d8 ≈ 2. v2 d8 ≈ 6 (voicemail + 4 chats + R1 first card), but they are all text-panel typing or chips, and **none is picture- or scene-anchored**.
- Conclusion: Day 8 never had the Day 1-6 lesson spine. v2 kept the thin Day 8 and swapped the visual picks for text exercises.
- **Fix spec:** apply the Day 2-6 template to Day 8:
  - ≥8 new items, each with a focus zoom (guess → reveal).
  - ≥3 `pick` beats with pixel picture cards: « Écoute. Quel pot ? » (plante/basilic/bol), « À quelle heure ? » (6/7/9 with a pixel clock), and « Qu'est-ce qu'elle propose ? » (soupe/pain/fromage at dinner).
  - ≥2 in-scene `chips`: « Je voudrais du pain » at dinner and « C'est pour moi ? » at the key.
  - An end **probe** of 3-4 items and the diary/ritual end.
  - The point beats must always show a one-line French prompt (« Touche le basilic. »).
  - Target: 1 learning interaction per ≤4 beats, ~15 per day.

## 6. Dinner occlusion
- Root cause (`art.js` 625-630): it draws `person(lefevre)`, `person(camille, 143, 249)`, `person(noe, 311, 249)`, **then** `dinnerTable(p, s)`. The table oval (centre 243,266, 132×37) covers the front-row Camille and Noé (`v2-mobile-story-28-line-d9_lef_soupe.png`: only hair tufts at the table edge are visible).
- **Fix spec:** draw Lefèvre (back), then the table, then the side chairs + Camille/Noé seated **at the left/right ends**, with their torsos above the tabletop (y≈225, x≈120 / 365) and the table drawn before them. The cat chair stays in front. Add an art test that samples face pixels of all three people as visible in the `lefevre` scene.

## 7. Other regressions found
- **Point beat with no prompt**: `d8_pot` renders an empty panel with only ▶ and replay (`v2-mobile-story-13-point-d8_pot.png`). The player doesn't know they should tap the basil.
- **Lower-half empty floor** on mobile scenes (dinner, doorway). The scene is anchored to the top. Scale the art to cover, or move the camera down.
- **ATELIER tag** and location/time header strip at the top-left: remove them.
- **Carnet/Note overlays tiny, with inner scroll** (see FEEDBACK.md).
- **Old `say` "no right answer" framing** became graded replies with "Hein ?" hints, which feels like a test in a social moment. Keep replies ungraded (any option continues) unless they are a chips beat.
- **No undo, no progress count** in review (see §1).
- **Review pulls Day 1 sentences** into the first rooftop watering.
- Day 8 has **no end ritual** (building at night → light off → day animation → « Bravo ! À demain ! » from old `app.js` RITUAL_TEXT). Port it using the facade scene.

## Acceptance checks for v3
- Garden: ≤1 tap per correct item, pour animation on the target pot, can meter visible. Screenshot it mid-pour.
- Carnet collapsed rows show article+gender colour+gloss. Expanded shows sentence+thumbnail.
- Dinner: all three faces visible. Cat: no x jump >8 px between consecutive frames (test on `motion()`).
- Day 8 beat audit script: picks ≥3, chips ≥2, probe present, no passive run >4, every line has a recorded clip or is flagged.
