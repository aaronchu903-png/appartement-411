# Build brief — Day 8 « Le basilic » as a standalone new app (for Astra)
Version 1 · 2026-10-15 PT · owner: Croissant (CEO bot) for founder JINYI CHU. Reference files are in `refs/` and art in `day08_assets/` next to this brief.

## 0. What we're asking for
Build **the whole Day 8 experience by yourself**, playable start to finish on a phone (and desktop): title/entry screen, every screen of UI, all animations, interactions, audio playback, garden review, the cat mini-game, wordbook, and save import. Day 8 uses every core mechanic of the game, so this is the test of whether you can build the full game logic. You design the UI, interaction and animation. We give you requirements, context and taste, not a layout. If you find a more intuitive way to do something, do it and explain why in DESIGN.md.

Where: new folder `app/` in repo `aaronchu903-png/appartement-411-src`, on a new branch, opened as a draft PR. Static files only (no server, no build step required to play, no CDN or network at runtime). **Do not touch the old game** (root `index.html`, `js/`, `css/`); it is frozen. You may *read* the old code to learn what to inherit (§7). Do not deploy publicly.

Start from **your own prototype** `prototypes/astra-garden/` (engine.js, art.js, app.js, DESIGN.md in `refs/ASTRA_GARDEN_DESIGN.md`). The founder loves its look and calm. Reuse and extend its code and visuals, but remove the **website feel**: no site header or title bar, no paragraphs of explanation, no editorial page layout. It should feel like an app or game: full screen, mobile first, thumb reach, pixel scenes, sans-serif UI.

## 1. The game (context)
- **L'Appartement 411**: a story-first pixel life-sim for learning French. You are the new flatmate in apartment 411 in Paris, with Camille, Noé and the cat Croissant, plus neighbour Madame Lefèvre and landlady Madame Martin. Mood: warm, gentle, a little melancholic, like *Amélie* (dusk pinks, golden windows, zinc roofs).
- **Goal:** from zero to B2 in about a year at ~2 h/day. Story is the reason people come back; the French is learned *inside* the story.
- **Player:** the founder plays daily on her phone. She is about A2. Content is A1 to early A2.
- **Where Day 8 sits:** Week 1 (Days 1–7) is done in the old game: arrival, shop, keys, Martin gives an old watering can on Day 7. Day 8 (Monday) is the first day of Week 2, and the day the rooftop garden opens.

## 2. Design philosophy (non-negotiable spirit, flexible details)
1. **Rhythm Doctor model:** a few polished, intuitive, reusable core modules. All richness comes from story and content data, not from new mechanics.
   - **M1 Scène:** pixel scene + lines + tap words + "point at things in the picture" (tap an object, no pop-up menus).
   - **M2 Jardin:** spaced review in the garden (§5).
   - **M3 Répondeur:** listen to a 5–15 s voice message, fill a gap, checked letter by letter.
   - **M4 Réplique:** answer in French (tap chunks or type), constrained answers, rule-based feedback through a character's reaction (levels: « Hein ? » → hint → recast). No LLM, $0.
   - **Carnet:** one shared data layer for words (collected, met-in-scene, review state). Wordbook = pot view.
   - Content should be **data files** (scenes/lines/exercises as JSON or JS data), so Day 9+ only adds data. Build a small loader/"compiler" for this.
2. **Exactly one one-off mechanic** on Day 8: the cat mini-game (§4). It must still run on M2's review engine.
3. **Comprehensible input:** French on screen; meaning through picture, acting, focus and audio. A Chinese/English gloss is available on demand (tap/long-press), not printed under every line. Current game UI language: Chinese with French content; keep a zh/en toggle.
4. **Active recall, auto-graded. Never self-rating** ("I remembered" buttons let you tap through without learning; the founder rejected that).
5. **FSRS** scheduling. Only the first attempt per item per local day updates FSRS.
6. **No red X, no punishment, nothing dies, no streak pressure, no XP or leaderboards.** Wrong = soft splash, correct answer lit, audio, the item comes back later.
7. **Intuitive (main acceptance test):** understand the core action in 5 s with no instructions; at most 1 tap from the garden to the first card; instant sound + animation feedback on every action; no menus or modals in the core flow; one-handed on phone, keyboard on desktop (1–4, Enter, Space, Esc); always clear what to do now, how much is left, what just happened; warm end screens.
8. **Proven things to keep** (reference, not a cage): pause-to-guess then reveal with audio; gender colours **le·m red / la·f blue** (only as tags, never as error colour); Croissant reacts to correct answers, a bit cuter each time; one tap = visible result; water hopping between pots.
9. Founder taste: see `refs/FOUNDER_TASTE.md`. Short version: polished few modules over many rough ones; learning value over speed; no heavy emoji; no pixel fonts.

## 3. Characters and art
- **Must be instantly recognizable as the current in-game characters** = row 1 of `refs/character_bible_sheet.png` (details in `refs/CHARACTER_BIBLE.md`). You may redraw them more refined and polished, at a higher pixel density, but a player who has lived with them for 7 days must recognize them at once:
  - **Camille:** short dark hair, green sweater.
  - **Noé:** brown hair, orange/brick top.
  - **Croissant:** small orange cat (outline-free, like your prototype).
  - **Madame Lefèvre:** older neighbour downstairs (see the bible).
  - **Madame Martin:** landlady (Day 8 she only appears through her watering can).
- Do not use row 2 (long black hair Camille, ginger Noé). Row 3 is for shorts only.
- Existing Day 8 art to look at and reuse or redraw: `day08_assets/` (characters, closeups, objects incl. basil pot, key, watering can, `contact_sheet.png`, `preview_x8.png`, `manifest.json`).
- Pixel style for scenes and characters; **UI text in system sans-serif, never pixel fonts.**
- Scenes needed: kitchen (morning; evening light), 411 doorway, night stairwell (down and up), Lefèvre's flat (round table, 4 chairs, window plant), her doorway, rooftop at night (moon, chimneys, dry pots, old chair), rooftop at dusk/morning for the garden home, façade tilt-down for the hook.

## 4. The cat mini-game « Non, Croissant ! » (one-off presentation, shared engine)
Kitchen, morning. Croissant keeps nudging the plant pot (pot ① « Chez nous », Martin's plant) toward the table edge.
- Each nudge opens a review item at the bottom of the screen. Answer it to stop him.
- **Correct:** you stop him: he freezes, is offended, sits, licks a paw (cute, varied, escalating reactions). Correct sentence audio plays.
- **Wrong:** he pushes the pot a little further (a few pixels, wobble, soft sfx). The correct answer is shown and played; the item returns later, as in the garden.
- **Never breaks, never dies.** If the pot reaches the edge, Noé dive-catches it (« Attention ! » / « Non, Croissant ! »). Then the scene continues.
- About 5–8 items, ~2 min. Ends after the item budget whether you were perfect or not. Then Camille lifts him away and the story goes to « Boum ! La tasse de Camille tombe. »
- **Hard requirement:** the review code is **the same module** as the garden (same queue, same FSRS cards, same grading, same exercise types and escalation, same "first attempt per day" rule). Only the presentation layer differs. Implement it as a second view over the M2 engine. Add a test proving answers in the mini-game update the same cards as the garden.
- Pick items from due/learned Week 1 words; if fewer due, use recognition (R1/R2) items of seen words. Do not introduce new words here.
- It's also a test of your small-game skill: timing, anticipation (wobble, paw raise), juicy but gentle feedback.

## 5. M2 Jardin (garden review + growth)
Full rules: `refs/PLAN_V2_2026-10-15.md` §3.3–3.5, `refs/GARDEN_BRIEF.md`, `refs/REVIEW_RESEARCH.md`. Your prototype already implements most of the review part. Keep it, and fix the gaps the review found.
- **5 auto-graded exercise types:** R1 listen to the story sentence → choose meaning; R2 cloze choose; R3 chunk ordering (meaning + audio given, tap shuffled chunks into a sentence); P1 typed cloze with first letter (accents not penalized); P2 dictation (degraded/cloze fallback when no recorded audio).
- **Escalation by FSRS stability:** new → R1; <3 d → R1/R2; 3–14 d → R2/R3; >14 d → R3/P1(/P2). Wrong drops one level; the same type never 3 times in a row.
- **Grading:** wrong = Again; correct but slow (tap ~>8 s, type ~>15 s, order ~>18 s) or 1-letter typo = Hard; correct = Good. Thresholds are assumptions; keep them in one config.
- **After every answer play the correct full sentence** (recorded audio first, TTS fallback; §7). Wrong items return after 3–5 cards until answered once.
- **Distractors:** same part of speech and gender, words the player has seen; **at least one distractor from the same semantic field** (the prototype's "apartment / cat / tea / coffee" was too easy). No homophones in R1.
- Mixed queue across pots, due before new, **new words ≤10/day**, fewer when due load is high. The watering can is the fill meter.
- **Plant growth is NOT real-time.** During review show only the watering animation; the plant does not change. Hidden care score, settled at the **first open each local morning**, with a surprise reveal. Use the PLAN_V2 §3.4 sketch:
  - `M_p = mean(min(1, ln(1+S_i)/ln(31)))` over introduced words; `C_p` = share of last 7 days with due words fully reviewed (days with no due words don't count); `V_p` = introduced/total.
  - `care = 0.6·M + 0.25·C + 0.15·V`; `G += max(0, care − 0.3)`; never subtracts.
  - Stages seed → sprout → leaves → tall → bud → bloom; enter stage k when `G ≥ T_k` and `M ≥ m_k`, T = 1,3,6,10,15, m = 0,.15,.3,.45,.6, ±10% fixed per-pot offset. Only up, never down.
  - Wilting: >50% of a pot's words overdue ≥3 d → darker leaves; ≥14 d → dormant; recovers at the next settlement after review, with a small "it woke up" moment. Never dies.
  - Reveal: one pot per morning max, same pot at least 2 days apart; camera to the pot, 2–3 s change animation, one character line (e.g. Noé « Regarde ! Elle a une nouvelle feuille ! » [NENG]), a tiny label naming the word group. Tap to continue. No reveal → don't interrupt. Catch up at most 7 missed days.
  - Settlement is a pure function (cards + date + history), unit-tested, with a debug "Atelier" panel to fast-forward days.
  - Stage thresholds are never shown to the player.
- **Wordbook = pot view:** tap a pot → its words, gender tag, story sentence(s) and the scenes where each word was met (tap to replay audio), mastery in words ("刚认识 / 有点熟 / 很熟"), no scores, no FSRS jargon.
- Day 8 pots: pot ① « Chez nous » (Week 1 words, Martin's plant; stays on the kitchen table tonight) and pot ② the basil (planted on the roof tonight; Week 2 words begin, e.g. « C'est du basilic »). Word lists: `refs/WORDLIST_W1-2_DRAFT.md`, tags `refs/CARNET_TAGMAP_D1-6.md`.

## 6. The Day 8 storyline (in order)
Canonical lines, ids, zh/en and stage directions: `refs/DAY08_FINAL_v2.md`. Module mapping and cuts: `refs/DAY08_MODULE_MAP.md`. Known build mistakes to avoid: `refs/SCRIPT_VS_BUILD.md` §C. **Keep the script's French lines exactly** (U+202F narrow no-break space before ? ! : ; and inside « », curly ’). Lines marked **[NENG]** or written by you must go into `FRENCH_FOR_NENG.md`. **Do not add spoilers** (Lefèvre explains nothing about the key; no hints about her past beyond « seule depuis l'hiver »; nothing promising Croissant stays forever).

Target length: ~20 min story + garden + mini-game + voicemail + texts ≈ 45–75 min with replays. Learning value over padding.

1. **Title / entry screen.** Continue (Day 8) / import my save (§8) / settings (sound, zh/en gloss). Dusk rooftop or the 411 window; one obvious button.
2. **Morning garden (M2).** Rooftop is not open yet, so this happens at the kitchen windowsill/table with **Martin's watering can** (from Day 7) as the fill meter. Queue = due Week 1 words, pot ① « Chez nous ». First morning: if the imported save has history, run the growth settlement here.
3. **Morning in the kitchen (M1).** `n_d8_matin` « Lundi matin. Dans la cuisine, ta plante est sur la table. Croissant la regarde. » → `d8_cam_depuis` « Une semaine ! Tu habites ici depuis une semaine. » → `d8_noe_matin` « Lundi, sept heures et demie. Regarde la plante ! » → focus word `plante`.
4. **Cat mini-game (§4)** « Non, Croissant ! » / « Attention ! ». Replaces the old plantguard rounds.
5. **Boum.** `n_d8_boum` « Boum ! La tasse de Camille tombe. Croissant cligne des yeux. » → `d8_noe_plante` « Et la plante ? Ici, avec Croissant… non. » (1 s silence; nobody answers. Paid off tonight, never said aloud.)
6. **The knock (M1 + M4).** `n_d8_toc`, `n_d8_porte`, `d8_gag_bonjour`, `d8_gag_basilic` « C'est du basilic, pour la cuisine. » (Croissant's head turns to the new pot) → focus `basilic` → *point*: tap the basil in the picture (replaces the pick menu) → say `d8_merci` (M4 in-scene reply).
7. **Invitation.** `d8_gag_venez` « Venez chez moi à six heures. J'ai une question. » (she points down, at the clock; doesn't explain). The clock-pick step is removed; the time is practised in the voicemail.
8. **Noé's voicemail (M3)**, around midday (Noé is at work). ~15 s. Dictation tests only « six heures » ([si.zœʁ] liaison); show the spelling after. « travail » is listening only. **Conflict fix (needs Neng):** the approved text says « Ce soir, on mange ensemble ? À six heures, à la maison. », which contradicts Lefèvre's six o'clock. Proposed minimal edit, reusing already-heard words, flagged **[NENG]**:
   « Salut, c'est Noé ! » / « Je suis au travail. » / « Ce soir, chez Madame Lefèvre ? » / « À six heures, en bas. » / « Six heures, d'accord ? À ce soir ! »
   (Implement with this text but keep it in data so Neng can swap it; do not invent further variants.) Dictation target stays « six heures ».
9. **Roommate group chat « Coloc 411 » (M4), 3–5 texts**, between the voicemail and the evening. Constrained output (tap chunks or type a short reply), rule-based check, a friend replies in character (« Hein ? » → hint → recast). Draft prompts, all **[NENG]**:
   - Camille: « Le basilic, on le met où ? » → player: « Dans la cuisine. » / « Sur la table. »
   - Noé: « On descend à quelle heure ? » → « À six heures. »
   - Camille: « On apporte quelque chose ? » → « Un peu de basilic. »
   - (after dinner, optional) Noé: « Le jeudi, chez elle… tu veux ? » → « Oui, je veux bien. » / « Oui, d'accord. »
   Accept accent-free, case-free variants; list accepted answers in data.
10. **17 h 55.** `n_d8_cinq` « Six heures moins cinq. » Time-skip card; both pots on the table, Croissant asleep between them.
11. **Stairwell down (only walking segment, part 1).** `n_d9_soir`, `d8_cam_descend`, walk ≤8 tiles, soup steam under her door, rooftop door rattles if tapped (no text) → `d9_noe_chat` « Croissant reste en haut… normalement. » → `d9_cam_basilic` → one Day 7 band line (`d9_cam_a/b/c`; default to the neutral one if the save has no band).
12. **Her table.** `d9_lef_bonsoir`, `d9_lef_asseyez` « Asseyez-vous, s'il vous plaît. », `d9_lef_soupe` « Vous voulez de la soupe ? » → `n_d9_croissant` « Mais… Croissant est là ! Sur la chaise vide ! » (*point*: tap the chair) → `d9_lef_place` (she laughs, first time) → say `d9_soupe` → `d9_noe_pain`.
13. **Thursday (choice).** `d9_lef_question`, `d9_lef_jeudi` « Vous voulez venir manger le jeudi ? », `d9_lef_seule` « Je suis seule depuis l'hiver. Le jeudi, c'est long. » → choice `d9_jeudi` (oui / cuisine / parfois; store it as a flag).
14. **The key on the table.** `n_d9_cle`, `d9_lef_cle` (she covers it with her hand), `d8_noe_danger` « Croissant adore les plantes. Les plantes, elles, n'adorent pas Croissant. » (everyone laughs; 1.5 s silent look at key, basil, fourth chair).
15. **Key handover (keep exactly).** `n_d10_cle` « À la porte, elle ouvre la main. La vieille clé. » Optional hotspots 37a/37b, never blocking. `d10_lef_jardin` « La clé du toit. Il y a un jardin, là-haut. » (set `has_key`) → say `d10_pourmoi` « C'est pour moi ? » → `d10_lef_allez` « Allez-y. Moi… pas encore. » (door closes, line of light).
16. **Stairwell up (walking part 2).** `d10_noe_porte` « La petite porte, là-haut ! » → tap rooftop door → `n_d10_monte` « La clé tourne. La porte s'ouvre. » (keep this exact text and id; do not add « du toit »).
17. **First time on the rooftop (high point).** Focus `toit` + `jardin` in one beat → `d10_noe_ici` once (tap the glowing empty pot; don't show the line twice) → `n_d10_plante` exact text « Tu plantes le basilic. Croissant aide… un peu trop. » → **first watering = M2's single gesture** (hold the can; Noé holds out **Martin's** can; « Il faut de l'eau. » plays *under* the 3 s hold, not as its own tap) → first card is the basil sentence → `n_d10_arrose`. Rooftop becomes a permanent home location; pot ② exists from now.
18. **Hook / end card.** Tilt down the façade to her lit window; she looks up; her hand is empty. « Sur le toit, une plante qui ne dort plus. En bas, une lampe qui reste allumée. » [NENG] Then "Day 8 terminé", a warm summary (words met, pots), save.

Letter 8 and the old 2-hour extension layer are **out of scope** (cut by the strategy).

## 7. Inherit from the current game (founder uses and likes these)
Read the old source (repo root) to match behaviour; re-implement cleanly in `app/`, don't import the old monolith.
- **Tap a word to collect it:** long-press/select (or tap) any French word in a line → lookup card (meaning, gender, audio) → one tap **« Ajouter au carnet »**, state then shows **« ✓ Dans le carnet »** persistently (see `js/app.js` ~L150–170 and ~L2595–2900, `js/wordbook.js`, `js/glossary.js`, `js/glossary-data.js`). Buttons must not be read as words. Collected words join daily review.
- **Wordbook (carnet):** list of saved words with meaning, gender, story sentence, scene; now merged into the pot view (§5).
- **Pronunciation:** recorded audio first. Existing clips: `audio/w1/*.mp3` (Week 1 lines and words such as `w_plante`, `w_cle`), `audio/deck/*.mp3` (chunks), `audio/d1/`, `audio/sfx/`, `audio/music/`; manifests in `js/clips.js`, `js/deck-clips.js`, `js/week-clips.js`; audio player `js/audio.js`. Night ambience: `day08_assets/audio_night/`. **Most Day 8 lines have no recording yet** (`refs/AUDIO_TODO_DAY8.md`): use the browser's French TTS as fallback, show the text if no voice, and structure the audio map so recorded files can be dropped in later by clip id (the script ids, e.g. `d8_gag_basilic.mp3`). Copy needed audio into `app/` (don't link back into the old folders).
- **Glossary/zh-en gloss, the characters, the pixel look and mood, gentle sfx, music.**
- FSRS details: old `js/fsrs.js` / `js/review.js`; your own `engine.js` is fine if it can import old card states (§8).

## 8. Save inheritance (must try hard)
The founder has word records on her phone in the old game: profile **`jinyi`** (her dev profile) and possibly a legacy save. **Never read, write, import or overwrite the `yuechao` profile** (another person's data). Only `jinyi` (and an unnamed legacy save if the founder explicitly chooses it).

**Old format (verify in code: `js/learn.js`, `js/logic.js`, `js/app.js` ~L3490, `js/sync.js`):**
- `a411.device.profile` → `{ activeProfile, ... }`
- `a411.p.<id>.learn` → learn record `{ schema, profileId, cards{ key → FSRS card with itemId, stability, difficulty, due, last review, lapses, leech/suspend }, evidence[], carnet{ v:1, words[{ id, at, ... }] }, days{}, session, seed, ... }`
- `a411.p.<id>.story` → story progress/flags (days done, Day 7 band `d7_band`, plan choice, player name), `a411.p.<id>.uiLang`
- legacy: `a411.save`, `a411.save.tmp`, `a404.save*`, `a411.backup.*`
- Private sync repo `aaronchu903-png/a411-sync`: `sync/<profile>/learn.json`, `story.json`, `carnet.json`, `summary.md`, each wrapped as `{ kind:'a411-sync-<kind>', schema:1, profileId, app, updatedAt, data }`.

**Import paths, in order:**
1. **Same-origin localStorage (preferred).** localStorage is per origin (scheme+host), not per path. The old game is served at `https://aaronchu903-png.github.io/appartement-411/`. If the new app is later served from the same host (e.g. `/appartement-411/app/`), it can read `a411.p.jinyi.*` directly. On first launch: detect profiles, show "继承 Jinyi 的进度" with counts (words, cards), import **read-only** (never write or delete old keys), store under new namespaced keys (e.g. `a411app.v1.*`). Note: the founder may have installed the old game as a home-screen PWA/Capacitor app; iOS home-screen web apps have **separate storage** from Safari, so this path may not see that save. Document it.
2. **Export code/JSON from the old game.** Not possible without changing the frozen old game. So: specify (don't implement in the old game) a tiny export page `app/export.html`. Served from the old game's origin, it reads `a411.p.jinyi.*` and offers copy/download of a JSON bundle. The new app accepts paste/file import. Same-origin trick, zero old-code changes.
3. **a411-sync file.** The founder (or Croissant) downloads `sync/jinyi/learn.json` (+ `story.json`) from the private repo and imports the file in the app. Do **not** put a GitHub token in the app and do not fetch the private repo at runtime.
4. **Fallback:** start fresh with Week 1 words marked as "met" (from `CARNET_TAGMAP_D1-6.md`) with a reasonable initial FSRS state, so Day 8 still works.
- Mapping: old cards → new engine cards (keep stability/difficulty/due/lapses; map item ids to word ids via the tagmap; unknown items keep raw and are listed in an import report). Carnet words → collected, keep `at`. Story flags → `d7_band`, player name, Day 7 completed.
- Tests: import fixtures (build them from the documented schema; ask us via Le CTO for a sanitized real export if needed), idempotent import, a `yuechao` record is refused, malformed data doesn't crash.
- If full inheritance is impossible in some environment, write the concrete alternative in DESIGN.md.

## 9. Deliverables
1. Playable static build in `app/` (open `app/index.html`; works on file:// and any static host), mobile-first, desktop OK.
2. `app/DESIGN.md`: decisions, rejected options, state list, data format for scenes, how to add Day 9.
3. Automated tests: review engine (escalation, grading, retry, first-attempt rule, new-word cap), mini-game uses the same engine, growth settlement (stages, catch-up, wilting, reveal pacing), save import (all paths, yuechao refusal).
4. Screenshots of **every state** at **390×844** and **1280×800** (`app/screenshots/`), plus a short screen recording or GIF of the cat mini-game and the first watering if possible.
5. `app/FRENCH_FOR_NENG.md`: every French string you added or changed (voicemail fix, texts, reactions, reveal lines, UI French), with zh/en.
6. `app/KNOWN_ISSUES.md`. Also `app/MODEL_LOG` entry: time spent and rounds.
7. Draft PR only. No merge, no public deploy, no new accounts, no paid services.

## 10. Out of scope
Days 1–7 rebuild, Day 9+, Letter 8, 2-hour extension, speech recognition, LLM features, payments, analytics, push notifications.

## 11. Inherit in Day 8 (requirement)
Every row marked **INHERIT** in `INHERIT_FEATURES.md` (same folder) is a requirement for the Day 8 app; ★ rows were praised by the founder and must feel at least as good. INHERIT-LATER rows: leave a clean hook, don't build. DROP rows: don't port.

## 12. Save portability (iOS home-screen app)
The founder plays from an **iOS home-screen web app**. Its storage is separate from Safari, and a new origin/path may not see the old `localStorage`. Build a **one-tap export** in the old format reader and a **one-tap import** in the new app (file or paste), plus the same-origin read when available. Never import `yuechao`. The full migration plan is designed separately; just make export/import work and tested.

## 13. Recorded audio later
New-line audio will be recorded by us (Croissant) later. Key the audio map by line id (`<lineId>.mp3` in a drop-in folder); when a file exists it plays, otherwise device French TTS, otherwise text. No code change should be needed to add recordings.

## 14. Reusable assets
See `REUSABLE_ASSETS.md` for the full list.
- **Art (characters, scenes, plants, props, UI) is reference only. Improve it freely.** Make it more refined and better, but Camille, Noé, Croissant, Lefèvre and Martin must stay instantly recognizable (row 1 canon).
- **Non-art reuse as-is:** pull word data, music, SFX and recordings by repo path from `cursor/act1-days-8-14-cc00`. Do not regenerate, re-translate or re-record them.
- Code is reference only. Write fresh code in `app/`.
- The key close-up is on hold. Do not use it.
