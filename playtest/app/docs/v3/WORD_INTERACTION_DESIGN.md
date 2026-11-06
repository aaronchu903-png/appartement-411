# Day 8 v3: Word interaction design (story acquisition + rooftop review)

Status: design for founder sign-off. Not yet sent to Astra. Written 2026-10-15 PT.
Inputs: `COMPARISON.md` (same folder), `../../astra_garden/BRIEF.md`, `../../astra_garden/REVIEW_RESEARCH.md`, `strategy/PLAN_V2_2026-10-15.md`, old game `/workspace/a411-v14` (`js/app.js` `focusBeat` ~1274, `js/studyui.js` `genderClass`, `pots.js` `waterBar`).

**This doc overrides COMPARISON.md §1 on one point.** COMPARISON proposed porting the old flip card with `Pas encore / Je savais`. The founder rejected self-rating. Review is **auto-graded only** (BRIEF.md rule 4). We keep the old *hand-feel* (watering can count, a pour per answer, moisture per pot) and not the self-grade.

Hard constraints that carry over: pixel style everywhere (no line icons, glass buttons or soft shadows); 4 fixed HUD buttons (carnet bottom-left, note bottom-centre, music bottom-right, pause top-right); story first; French on screen by default, with Chinese only in tap-gloss and the optional `?` hint; show, don't tell.

---

## 0. Principles (one line each)
1. **Guess, then reveal.** A new word is never glossed first. The scene gives enough to guess (comprehensible input), and the reveal confirms it.
2. **Meet it 3+ times in story before it is ever tested.** Review tests what the story already taught.
3. **One tap per item when you are right.** Pause only when you are wrong.
4. **Every answer gets a body response** (cat, pot, water, sound) within 100 ms. Nothing goes quiet.
5. **Mistakes cost nothing.** No hearts lost, no red X, no score drop. The correct answer glows, plays, and comes back later.
6. **Short and escapable.** 5-8 items, a pause/exit always works, and progress saves per item.

Duolingo patterns referenced (named so Astra can look them up): *lesson progress bar* (fills and glows on combos), *"N in a row" combo flash*, *correct/incorrect bottom sheet* (green/coral with answer and audio), *mistakes come back at the end of the lesson* ("let's fix your mistakes"), *exercise types*: picture select, listen-and-select, tap the pairs (match madness), word bank sentence builder, fill in the blank, type what you hear; *new word badge* on first sight; *character reactions* (Duo/Lily animate on answers); *lesson-complete screen* (XP, accuracy, time chips) and *skeleton/shimmer loading*. We copy the **interaction grammar**, not the look: everything is redrawn in our pixel style, and there are no hearts/lives, no gems and no streak-loss pressure.

---

## Part A: Word acquisition in the story

### A1. The new-word beat (`focus`), redesigned
Replaces the old `focusBeat` (a text card with the word) and the v2 silent hotspot. It runs **in the scene**, not in a panel.

Screen flow (390×844 portrait; the same applies at desktop with the stage letterboxed):

```
[F0 LINE]        A character says the line. Voice clip plays. The dialogue box shows the line;
                 the target word is underlined with a dotted pixel line (not coloured yet).
      │ auto, when the clip ends + 250 ms
[F1 GESTURE]     The speaker acts on the object: points, lifts, sniffs, hands it over (2-4 frame anim).
                 The camera eases 1.0→1.15× towards the object (400 ms, ease-out).
      │ auto, 600 ms
[F2 ZOOM]        The object pops into a pixel "spotlight" frame (bounded card, 50% of the stage width):
                 the stage dims to 60%, the object scales 0.6→1.08→1.0 (squash 1.1/0.9 on landing, 280 ms),
                 with a sparkle on 2 frames. SFX `pop_soft`. The word plays alone (`w_<id>`).
                 The word is NOT shown yet: under the image are 3 pixel dots "· · ·".
      │ user taps the image or "?" (1 tap), or auto after 2.5 s
[F3 GUESS]       (only on the 1st encounter of nouns with a picturable referent, see A2)
                 2-3 pixel picture chips appear: "Which one is it?" is never written; the cue is
                 the pulsing outline. The player taps the image they think matches.
                 This is a guess, NOT graded to FSRS; it is logged as Evidence{kind:'guess'}.
      │ 1 tap
[F4 REVEAL]      The word types in letter by letter (30 ms/char) in gender colour with its article
                 (le = m colour, la = f colour; l' takes the noun's gender colour, with an m/f pip).
                 The word audio plays again with the article. A "NOUVEAU" pixel badge stamps in (Duolingo new-word badge).
                 Right guess: the chip bounces + `ding_soft`. Wrong guess: the right chip glows, no sound penalty.
                 The cat (if on screen) does an ear flick.
                 The word flies into the carnet button (bottom-left, arc 450 ms), which wiggles + `pop_into_book`.
      │ 1 tap anywhere (or auto after 1.2 s if auto-advance is on)
[F5 RESUME]      The camera eases back (300 ms); the line continues with the word now in gender colour.
```

Taps: 1 (reveal, no guess) or 2 (guess + continue). Total time ≈ 4-6 s. The Chinese gloss is available only via the `?` button in the reveal frame, never shown by default.

Rules:
- **Gender colour**: the colour pair from PLAN_V2 §carnet (le·m / la·f). The same colours are used in story, carnet, review, never elsewhere. Plurals show the article (les) + the gender pip of the singular.
- **Verbs/chunks** (e.g. « je la monte », « tu veux ») have no picture chips: F1 is a gesture that *is* the meaning (Noé lifts the pot = monter), and F3 is skipped. The reveal shows the chunk with the verb in its colour (neutral ink, no gender) and a conjugation tab in the carnet.
- **Abstract words** (heure, déjà) use the scene as the picture: e.g. a pixel clock that spins to 7:00 for « sept heures ».
- Every focus also stores a **scene thumbnail** (COMPARISON §2): a 120×80 render of the scene state at that frame, used in the carnet and in review picture cards.

### A2. Encounter levels (how a word becomes guessable)
Every exposure of an Item is logged as an `Encounter` (PLAN_V2 data model). Support fades as encounters grow, so later meetings become a real guess:

| Encounter # | Where | Support given | Player action |
|---|---|---|---|
| 1 | focus beat | gesture + zoom + picture chips + audio ×2 | guess → reveal |
| 2 | later line, same day | word in gender colour, object gets a 1-frame glint when said | none (tap-gloss available) |
| 3 | `pick` beat (in scene) | audio only + 3 picture cards; the prompt is « Écoute. Quel … ? » | 1 tap, graded as an in-story check (not FSRS) |
| 4+ | other days / chips / probe | plain text, no colour hint in chips | build / choose |

A word is **eligible for rooftop review only after ≥3 story encounters, including ≥1 active one** (pick, chips or probe). This is when its `Card` is created (FSRS state New → first review). Words with fewer encounters stay in the carnet as "Rencontré" (a pixel dot, not text) and are not tested.

### A3. Repetition schedule within Day 8
Proposed Day 8 focus set (8 items; Prof Neng to confirm the list and spellings): **la plante, le basilic, le bol, la soupe, le pain, la clé, le toit, sept heures**, plus 2 heard-only chunks (« je la monte », « tu veux… ? »).

Targets per focus item within Day 8:
- ≥1 focus (encounter 1), ≥2 more heard/seen in lines, ≥1 active beat. **Total ≥4 encounters, spread across ≥2 scenes.**
- Spacing: the 2nd encounter comes 3-10 beats after the focus, the active one ≥10 beats after (or in the end probe).
- No more than 2 new focus words in a row without an active beat between them.
- ≤4 consecutive passive beats (COMPARISON §3).

Draft beat map (to be checked against `content.js` ids by Astra):

| Scene | Focus (new) | Re-encounters | Active beat |
|---|---|---|---|
| Kitchen morning | la plante, le basilic | — | — |
| Kitchen + cat mini-game | le bol | plante, basilic (in Noé's lines) | — |
| Phone / voicemail | sept heures | — | pick: « À quelle heure ? » (6/7/9 clock cards) |
| Stairs | — | plante (« Et ta plante ? Je la monte aussi ! ») | pick: « Écoute. Quel pot ? » (plante/basilic/bol) |
| Dinner | la soupe, le pain | bol, heure | pick: « Qu'est-ce qu'elle propose ? » (soupe/pain/fromage); chips: « Je voudrais du pain » |
| Key handover | la clé, le toit | — | chips: « C'est pour moi ? » |
| End probe (3-4 items) | — | soupe, clé, basilic, toit | listen-pick with pictures |
| Rooftop (1st watering) | — | 5 of the above that hit ≥3 encounters | review |

Result: ~15 learning interactions, every focus word met ≥3 times before the rooftop.

### A4. Repetition across days
- **Recycle quota per day**: each new day's script must re-use ≥4 words from the previous 2 days in lines (with audio) and ≥2 in active beats. The beat audit script flags a word with no story encounter for >4 days.
- Recycled words appear **without colour hints** once their FSRS stability S ≥ 3 d (a natural fade).
- The review scheduler (FSRS) and the story are linked: if a word is due and also appears in today's story, the story encounter counts as an exposure (logged) but does **not** grade FSRS. Only rooftop answers grade FSRS.
- Targets over a week: each word gets ≥3 story encounters on its day, ≥2 recycles in the following 6 days, and FSRS reviews per schedule.

### A5. Polish, loading and transition states
- **Day entry**: building façade (full screen) → tap « Continuer » → a pixel iris-wipe into the apartment (500 ms) → first line. No title cards, no quiz before story.
- **Loading**: when audio/art for a scene isn't ready, show the façade with a 3-dot pixel "window lights" loader (windows light up one by one, 150 ms each) instead of a spinner; never block >1.5 s. Preload the next 2 scenes' clips during the current scene. If a clip fails, show a small pixel speaker with a slash and continue on text (no error dialog).
- **Scene changes**: pixel dissolve (dither 8 steps, 320 ms). Camera eases, never cuts mid-line.
- **Button feel**: every pixel button has a 2-frame press (1 px down, shadow removed) + `tick` SFX at 30% volume, response <50 ms.
- **Text**: typewriter at 25 ms/char, tap to complete, second tap advances.
- **Auto-advance**: off by default; if on, line audio end + 1.2 s.

---

## Part B: Rooftop garden review ("Arroser")

### B1. Entry and session shape
- Reachable **only** after the Day 8 key-handover beat; never before or instead of the story. Re-enterable from the rooftop any time later.
- Entry tap: the glowing pot(s) or the can on the shelf → « Arroser » (1 tap).
- **Session = 5-8 items** (first ever session: max 5, Day 8 words only). Excess due items stay; the summary says nothing guilt-inducing.
- **Exit**: the pause button (top-right) is always live → sheet « Continuer / Plus tard ». « Plus tard » saves every answered item (each answer is persisted immediately) and returns to the rooftop. No "are you sure, you'll lose progress".

### B2. HUD during review
```
┌───────────────────────────────── [⏸] ┐  top-right: pause (fixed HUD)
│ 💧💧💧💧💧▯▯▯  ███████░░░░░  3/8   │  top: pixel watering can with drops = items left,
│                                      │       progress bar (Duolingo lesson bar, pixel segments)
│   night rooftop, shelf, target pot   │  stage: ≥60% height; target pot centred, cat beside it
│   glows; Croissant sits next to it   │
│ ┌──────────────────────────────────┐ │
│ │ prompt (French) + answer area     │ │  exercise panel: pixel dialogue box skin
│ └──────────────────────────────────┘ │
│ [carnet]        [note]       [music] │  bottom HUD stays (carnet disabled during an item, dims to 50%)
└──────────────────────────────────────┘
```
- The can starts full with N drops; one drop leaves per item answered **correctly or after the correct answer is shown**. Retry items add no drops (they're "free").
- The progress bar fills one segment per finished item; a combo (≥3 right in a row) makes it shimmer (Duolingo bar glow).

### B3. Exercise types (stage by FSRS stability; never the same type 3× in a row)
| Code | Type (Duolingo name) | Prompt (French only) | Answer | Taps if right | When |
|---|---|---|---|---|---|
| E1 | Picture pick (*select the correct image*) | audio of word + « Quel … ? » | 3-4 pixel picture cards (scene thumbnails) | 1 | New / learning, S < 1 d |
| E2 | Listen-pick (*listen and select*) | story sentence audio, target beeped/blank on screen | 3-4 word cards with gender colour | 1 | S < 3 d |
| E3 | Tap pairs (*tap the pairs*) | none, 4 pairs | match word ↔ picture (or audio ↔ word) | 8 (counts as 4 items for the can, 1 FSRS grade each) | at most 1 per session, only with ≥4 eligible words |
| E4 | Fill the gap (*fill in the blank*) | story sentence with a gap + audio | 3 chips | 1 | 3-14 d |
| E5 | Word bank (*build the sentence*) | audio of a short story line (≤6 tokens) | tap chips in order; auto-check when the last slot fills | n chips, no Check button | 3-14 d |
| E6 | Listen and type (*type what you hear*) | word or chunk audio | pixel keyboard (with é è à ç keys) + « Vérifier » | type + 1 | S > 14 d (not on Day 8; first appears ~Day 12+) |

Distractors: same POS and gender, from words already met, never homophones at E1/E2 (BRIEF.md). After a lapse, the item drops one stage.

**One-tap rule**: E1/E2/E4 grade on the tap itself; E5 grades when the last chip lands; only E6 has a check button. No « Continuer » after a correct answer.

### B4. Item flow (state diagram)
```
            ┌──────────┐
  enter ───►│  INTRO   │ can fills (600 ms), cat hops to the shelf, first pot glows
            └────┬─────┘
                 ▼
            ┌──────────┐  prompt slides up 200 ms; audio autoplays 150 ms later
            │ PROMPT   │◄─────────────────────────────────────┐
            └────┬─────┘                                      │
     tap answer  │ (timer t starts at audio end)              │
                 ▼                                             │
            ┌──────────┐                                       │
            │  CHECK   │ (instant, local)                      │
            └──┬────┬──┘                                       │
        right  │    │ wrong                                    │
               ▼    ▼                                          │
     ┌──────────┐  ┌───────────┐                               │
     │ CORRECT  │  │ GENTLE    │ correct option glows,         │
     │ pour+cat │  │ WRONG     │ hint + audio, 1 tap to go on  │
     └────┬─────┘  └─────┬─────┘                               │
          │ auto 900 ms  │ tap « Continuer »                    │
          │              └─► item re-queued (+3-5 positions,   │
          │                  same or easier type)              │
          ▼                                                    │
     ┌──────────┐  more items? ─── yes ───────────────────────┘
     │  NEXT    │
     └────┬─────┘ no (incl. retries cleared)
          ▼
     ┌──────────┐  « Let's fix your mistakes » lead-in if retries remain (Duolingo end-of-lesson redo)
     │ SUMMARY  │
     └────┬─────┘
          ▼  1 tap
       rooftop (pots grown)
  PAUSE can be entered from any state → « Continuer » (resume same state) / « Plus tard » (save, exit)
```

### B5. Timing and events (ms from the answer tap)
**Correct**
| t (ms) | Visual | Sound |
|---|---|---|
| 0 | tapped card presses 1 px, border turns gender colour / green-pixel; 2-frame bounce | `tick` |
| 60 | card shines (white dither sweep 180 ms) | `ding` (pitch up +1 semitone per combo step, max +5) |
| 120 | the can on the shelf tilts; a pixel water stream arcs into the **target pot** (6 frames) | `water_pour` synced to frame 2 |
| 300 | soil darkens one step (moisture +1, 0-3); at 3 the leaf lifts 2 px | — |
| 350 | **Croissant reacts** (random from set, no repeat twice): 2-3 pixel hearts float up (600 ms) · happy squint + tail swish · roll on back (combo ≥3) · purr loop with whisker vibration | `purr_short` / `mrrp` |
| 450 | the full story sentence plays with the target highlighted (BRIEF: after every answer) | line clip |
| 900 (or line end, max 2200) | panel slides out, next prompt slides in | — |

Combo: 3 in a row → « 3 de suite ! » pixel banner (Duolingo "N in a row"), the cat rolls; 5 in a row → the pot sprouts a tiny bud early, firefly sparkle burst. Combos are celebrated, never lost visibly (breaking one shows nothing).

**Wrong**
| t (ms) | Visual | Sound |
|---|---|---|
| 0 | tapped card does a small 2-px shake (160 ms), turns muted grey (not red) | `boop_soft` (low, short; never a buzzer) |
| 200 | the correct card glows in gender colour with a pulsing pixel outline | — |
| 300 | bottom sheet (Duolingo incorrect sheet, in coral-pixel, not red): « C'est… » + correct answer in gender colour + 🔊 replay + scene thumbnail as hint; the `?` reveals Chinese gloss | word audio, then sentence audio |
| 400 | Croissant tilts its head, then pats the pot (encouraging, not sad) | `mew_soft` |
| user tap | « Continuer » (the only post-answer tap in the design); a small splash goes onto the pot (water still given) | `water_drip` |

E5 wrong: wrong chips bounce back to the bank one by one (120 ms each), the correct order fills in ghost letters, then « Continuer ». E6: diff highlights the wrong letters; a 1-letter typo counts as right-but-Hard and gets the correct sequence.

**Summary screen** (Duolingo lesson-complete, pixel):
- The watered pots on the shelf each play a growth pop in turn (250 ms apart) with `chime` notes rising.
- Three pixel chips: 💧 « 8 arrosés », 🎯 accuracy as hearts filled (no %), ⏱ time « 2 min ».
- Croissant curls up on the warm pot and sleeps (Zzz). One button « Bonne nuit » → rooftop.
- No streak counter, no "you missed X".

### B6. Tap counts per session (8 items, 1 wrong)
- Enter: 1 (pot/can) · 7 right × 1 tap · 1 wrong × 2 taps (answer + Continuer) · retry 1 · summary 1 = **12 taps, ≈ 2 min**.
- Compare v2: 2 taps per item + no feedback = 18 taps for 8 items.

### B7. FSRS grading map (automatic, BRIEF.md + PLAN_V2 §grading)
| Outcome (first attempt of the day) | FSRS rating |
|---|---|
| wrong (any type), or E3 pair mismatched | **Again** (1) |
| right but slow: tap types > 8 s after audio end, E5 > 18 s, E6 > 15 s; or E6 with a 1-letter typo; or audio replayed ≥2 times before answering | **Hard** (2) |
| right | **Good** (3) |
| (no Easy) | — |
- Only the **first attempt of the day** updates long-term FSRS (墨墨 rule). In-session retries only clear the item from the queue.
- Story picks, focus guesses and probe answers are `Evidence`, not FSRS grades (keeps the story a safe place).
- Thresholds are assumptions; log response times and retune after playtests (PLAN_V2 marks them 【假设】).
- Pot growth: per PLAN_V2, mastery `M_p` from FSRS stability; moisture is per-session visual only.

---

## C. Carnet tie-in (summary; full spec COMPARISON §2)
Collapsed row: gender-coloured article + word, POS chip, one-line gloss, 🔊, pixel encounter pips (●●●○ = encounters toward review). Expanded: the source line (tap to hear), the scene thumbnail from its focus beat, conjugation for verbs. Near-full-screen pixel sheet, pixel pot tabs instead of `<select>`.

## D. Acceptance checks for Astra
1. Every Day 8 focus item: ≥4 encounters, ≥2 scenes, ≥1 active, before the rooftop (beat audit script prints the table in A3).
2. Focus beat screenshots at F0/F2/F3/F4 for one noun and one verb chunk.
3. Review: correct item = exactly 1 tap; screenshot mid-pour + cat reaction; wrong item shows the glowing correct option + sheet; the item reappears 3-5 items later.
4. All 5 Day 8 exercise types (E1-E5) reachable in a seeded session; never the same type 3× in a row.
5. FSRS unit tests for the grading map (wrong/slow/typo/replay/retry-not-graded).
6. Pause → « Plus tard » mid-session keeps answered items; no review screen before the story on a save with 100 due cards.
7. No Chinese on screen by default; all icons pixel; 4 HUD buttons present on every review screen.

## E. Open questions for the founder
1. Should the focus guess (F3) appear on every new noun, or only the first 3-4 per day (to protect pacing)? Default proposed: every picturable noun on encounter 1.
2. Should the cat's reactions also appear for in-story picks, or be kept special for the rooftop? Default: rooftop only, the story uses an ear flick.
3. E6 (typing) is held back until ~Day 12. OK?

## FOUNDER OVERRIDES (2026-10-15 7:50pm) — supersede anything above
1. First encounter = comprehension only, NO picture-pick quiz. Line + gesture + object zoom + audio, then the word types in with gender colour and flies to the carnet; one tap to continue. (A pick right after the object was shown is pointless; nobody can fail it.)
2. Recall starts at the NEXT encounter, without the original visual cue: e.g. at dinner « Tu veux du basilic ? » with basil/bread/cheese on the table, so the player taps the right one; or an audio-only cue to pick among scene objects. Later encounters drop visual cues (dictation, sentence building). Difficulty rises with each encounter.
3. Rooftop review: NO fixed 5-8 cap. The session size equals today's due words (the can shows the total). Natural checkpoint every ~8 items with a mini summary and cat reaction; the player may continue or exit; exit anytime; save per answer. Control load by limiting new words per day, not by capping review. Review never gates the story.
4. Cat reactions: only in the rooftop review (correct means hearts, a roll or a purr; wrong means a head tilt). In the story the cat is not always present, so there are no cat reactions tied to answers there.
5. Dictation: add it around Day 12.
