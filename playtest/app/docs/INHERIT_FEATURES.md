# Features to inherit — live game v0.14.0 → Day 8 new app

Source checked: `appartement-411-src` branch `cursor/act1-days-8-14-cc00` (sw.js VERSION 0.14.0, the source of the live single-file build), worktree `/workspace/a411-v14`. Paths below are relative to that repo. Bugs: `a411-team/day07/bugcheck/REPORT.md` and the strategy-reset audit.
Status: **works / buggy / half-done**. Rec: **INHERIT** (must be in Day 8 app) · **LATER** · **DROP**. ★ = founder explicitly praised.
Inherit means the *player experience* and the *data*, not the code. Rebuild it cleanly in `app/`.

## 1. Story / dialogue reading
| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Tap a word in dialogue → lookup | Base form (« forme → base »), tense/person or gender/number, zh/en/fr gloss | app.js, glossary.js, glossary-data.js (2,347 lemmas), conjugate.js | works | INHERIT |
| Key-word focus | Camera/pulse points at the thing a key word names (ostension) | words.js, art.js region() | works (Days 1–6) | INHERIT (as idea) |
| Pause-to-guess, then reveal with audio | Guess the line before it is spoken/shown | app.js (probe steps) | works | INHERIT |
| Gender colours on nouns (le red / la blue) | Tags only, never error colour | app.js genderClass, css/style.css .g-m/.g-f | works | INHERIT |
| Pulsing next-step button, glowing current goal | Always know what to do | app.js | works | INHERIT |
| 25 one-off step renderers (sort, tidy, mech, tour…) | One mini-interaction per day | app.js WR.* | buggy, inconsistent | DROP (replaced by core modules) |
| Walkable hub for Days 8–9 | Tap rooms/props to advance story | hubstory.js | half-done | DROP (redesign) |

## 2. Words & carnet

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ One-tap « Ajouter au carnet », persistent « ✓ Dans le carnet » | Collect any word in one tap; state stays | app.js, wordbook.js | works (v0.10.1 fix) | INHERIT |
| Wordbook (Mon carnet de mots) | Per-profile list with POS, article, gender, meaning, audio | wordbook.js, app.js | works | INHERIT (as pot view) |
| Wiktionary fallback for missing word | Only that word sent, marked « no Chinese » | wordbook.js | works | LATER |
| Pot lexicon (Neng's fields: partitive, negation, icon, tags) | Correct articles per word | lexicon.js, lexicon-data.js | works (data) | INHERIT (data) |
| Rare words recognition-only | No production drills on rare words | glossary.js | works | INHERIT |
| Anki-like browser: edit/suspend/delete/custom card, leeches, stats | Power-user card management | review.js, reviewui.js | works | LATER |

## 3. Audio & pronunciation

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Hear pronunciation (recorded clip → device TTS → text) | Every line/word playable, replay anytime | audio.js, clips.js, week-clips.js, deck-clips.js | works | INHERIT (by line id) |
| Sound effects with their French word (Boum, Miaou) | Sound and word arrive together | sfx.js, audio/sfx | works | INHERIT |
| Background music + per-device mixer (music/voice/sfx), ducking, mute button | Starts after first tap (iOS) | music.js | works | INHERIT |
| Shadowing (repeat after the line) | Speak along | sampler.js | half-done | LATER |

## 4. Review / garden

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| FSRS-5 scheduler, per item and per modality | Spaced review | fsrs.js, learn.js | works | INHERIT (same algorithm, records importable) |
| Mixed-pot watering queue + meter, pour into word's pot | One daily queue | pots.js | works but one of 3 disconnected watering systems | INHERIT logic, unify |
| D7 story watering (3 hard-coded items, answer printed above options) | — | app.js WR.water | buggy (copy-match, no FSRS) | DROP |
| Day≥8 « Le jardin » +1 plantXp toast | — | loop.js grantReward | half-done | DROP (replaced by hidden care value) |
| Plants/pots per module, plant never dies, streak | Week-1 pot, week-2 seedling | weeklogic.js garden | works | INHERIT (data), growth reworked |
| Watering reminder (off by default, device-only) | Daily nudge | remind.js | works (Capacitor stub) | LATER |

## 5. Listening / dictation

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Écoute du soir (evening listen + dictation) | Re-listen to the day, type what you hear | loop.js, app.js WR.dict | works | INHERIT |
| Voice message dictation (Noé « six heures ») | Short dictation in story | app.js / sampler.js | works | INHERIT (Day 8 needs it) |

## 6. Writing / speaking output

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Desk letters (one per day, gaps typed or MC, 3 graded hints) | Write home, one grammar point | letters.js | works | INHERIT-LATER (Day 8 uses chats instead) |
| ★ Writing desk with « Vérifier » (LanguageTool) + offline export | Free writing with feedback | writing.js | works (needs network) | INHERIT (light) |
| Mon journal + « Coup de pouce » | Optional diary after Bravo | app.js | works | LATER |
| Question pour Prof Neng | Ask a question, synced | app.js, sync.js | works | LATER |
| Roommate group-chat replies | Output practice | — | not built | NEW in Day 8 |

## 7. Grammar

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Grammar lightbulbs (aha cards) → « Garder » → Mes points de grammaire → FSRS | Pattern + 2 examples on selected lines | grammar.js, docs/GRAMMAR_AHA_LINES.md | works | INHERIT |
| ★ « Voir la conjugaison » offline conjugator (incl. participles, gérondif, pronominal) | Full table from any verb | conjugate.js, reviewui.js | works | INHERIT |
| Day 8 sampler grammar drill / reading note | Extra activities | sampler.js | half-done | DROP |

## 8. Progress / save / sync / profiles

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| Profiles (Jinyi, Yuechao protected, separate records) | Never touch Yuechao | learn.js, studyui.js | works | INHERIT (import must refuse yuechao) |
| ★ Auto backup to private a411-sync (learn/story/carnet/summary.md), restore on new device | Per-device token | sync.js | works | INHERIT (read-compatible, LATER for write) |
| ★ Placement (skippable, no penalty) | Set start level | learn.js PLACEMENT, studyui.js | works | LATER |
| Act I test-out (pot fields) | Skip known words | lexicon-data.js, docs/PLACEMENT_TESTOUT_ACT1.md | half-done (data only) | LATER |
| Week-1 Bilan / Récap | Not-a-grade check | weekcheck.js, app.js | works | LATER |
| Bravo ritual + pixel tile hub | End-of-day close | app.js | buggy (Bravo can show twice; step counter shifts) | INHERIT idea (warm end screen), DROP code |
| Daily tasks DT01–DT15, minute log | Long task list | tasks.js, taskui.js, loop.js | half-done | DROP |
| Save schema migration | Old saves move forward | logic.js, legacy.js | works | INHERIT (import reads a411-learn-1 + story v1) |

## 9. Settings & accessibility

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| zh/en help-language toggle; UI zh default, French targets stay French | — | i18n.js | works | INHERIT |
| ★ Sans-serif UI text (Noto Sans / system-ui), never pixel font | Readable | taskui.js, css | works | INHERIT |
| Developer vs player view (7 taps on name), founder replay ?dev=1 on a clone | Hidden tools | learn.js uiMode, founderdev.js | works | INHERIT (?dev for testing) |
| Offline service worker | Play offline | sw.js | works (not in single-file) | INHERIT |

## 10. Visuals / lighting / characters

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ Characters (Camille, Noé, Croissant, Lefèvre, Martin): breathe, blink, step in, slide | Must stay recognisable | art.js, shots.js | works | INHERIT (redraw finer, same identity) |
| ★ Soir / night grading (cool shadow, warm light, cap 1.2) | Evening scenes feel warm | shots.js NIGHT | works | INHERIT |
| PNG story frames Days 8–14 | Pre-rendered scenes | shots.js, art/ | works, some overlap bugs | reference only |
| No emoji, no red X | — | everywhere | works | INHERIT |

## 11. Feedback

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| ★ « Note » feedback (text + ≤4 images, queued, uploads to a411-sync feedback/) | Founder playtest notes | feedback.js | buggy: in-game upload not reaching feedback/ (open bug) | INHERIT, fixed |
| In-game playtest notes w/ screenshot + voice (IndexedDB) | — | returns.js | half-done (cloud sink stub) | merge into Note |

## 12. Meta

| Feature | What the player gets | Code | Status | Rec |
|---|---|---|---|---|
| Founder replay / day select (?dev=1, built chapters d1–d14s) | Jump to any day without touching the save | founderdev.js | works | INHERIT (day jump for testing) |
| Try-an-ending (Day 7 A/B/C), Croissant traces | Week-1 story mechanic | weeklogic.js | works | DROP for Day 8 |
| Mini-games: Sauve la plante, Aide Madame Lefèvre | Catch game | minigames.js | works, not tied to review | DROP (replaced by « Non, Croissant ! » on review engine) |

Known cross-cutting bugs not to repeat: step counter changes, Bravo twice, overlapping frames, duplicate « Ici ? Dans ce pot ? » on Day 8, mixed NBSP/NNBSP in French punctuation, wrong speaker on `d7_sh_*`.
