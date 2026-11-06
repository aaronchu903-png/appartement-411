# Astra test brief: Le Jardin (rooftop garden review), built from zero
Owner: Croissant. 2026-10-15. Founder's goal: test whether Astra can design and build a complete, intuitive system on its own from functional requirements plus a style reference. Do NOT read or reuse the existing game code.

## What it is
L'Appartement 411 is a story-first pixel life-sim for learning French in a Paris flatshare. The rooftop garden IS the vocabulary review system and the wordbook. It stays in the game forever, so it must be pleasant to use every day for a year.

## Functional requirements
1. One pot = one word set (e.g. pot 1 « Chez nous », Week 1 words). Plants never die: they wilt or go dormant, and recover after review.
2. One daily mixed queue of all due words across all pots, scheduled with FSRS (implement or vendor a small FSRS; ratings Again/Hard/Good derived automatically, see below).
3. The watering can is the water meter: it shows how many reviews are due today and empties as you review.
4. Review = real answers, auto-graded (no self-rating; the old "remembered / forgot" card is rejected because it can be tapped through without learning). Full spec in "Review exercises" below. Right: water flows visibly into that word's pot. Wrong: soft splash, correct answer shown, card returns later in the session. After EVERY answer (right or wrong) the full story sentence plays (browser TTS placeholder) with the target highlighted.
5. Wordbook = pot view: open a pot to see its words, each word's source sentence(s), and how well it's known.
6. New words: a daily cap (default 10); fewer new words when many are due.
7. Persist progress in localStorage. Include a debug control to simulate days passing.
8. Sample data: use 2 pots x ~15 items from WORDLIST_W1-2_DRAFT.md (attached), with their French sentence and Chinese/English meaning.

## Review exercises (core of this test)
One interaction model for all types: a short French prompt on top (sentence, audio button auto-plays), big answer tiles at the bottom (thumb zone; keys 1-4 / type on desktop). Tap a tile = answer. No "check" button except for typing types (Enter). Five types, from recognition to production:

| stage | type | what the player does | example (W1 item) |
|---|---|---|---|
| R1 listen-meaning | story sentence plays, target word highlighted; pick its meaning from 3-4 tiles (zh/en gloss or picture) | « Elle arrose la plante. » -> 植物 / 猫 / 公寓 |
| R2 cloze-choose | sentence with a gap (audio withheld until answer); pick the French word from 3-4 tiles | « Il y a du ___ dans la cuisine. » -> café / chat / plante |
| R3 chunk-order | gloss shown + audio; tap 3-6 scrambled chunks into order (tap tile to place, tap again to remove) | 我叫 Camille -> [Je] [m'appelle] [Camille] |
| P1 cloze-type | gap in sentence, first letter hint; type the word (accents forgiven, typo of 1 letter = Hard) | « Bonjour, je m'a____ Noé. » |
| P2 dictation (later) | hear sentence, type the missing chunk | audio only |
Optional/stretch: speak the sentence (browser speech recognition), never required, never graded down.

Stage by FSRS stability S: new/learning -> R1; S < 3 d -> R1 or R2; 3-14 d -> R2 or R3; > 14 d -> R3 or P1 (P2 when available). After a lapse, drop one stage. Mix types within a session; never the same type 3 times in a row. Distractors: same part of speech and gender, from words the player has met, never homophones at R1.

Grading -> FSRS (automatic): wrong = Again; right but slow (> ~8 s for tap types, > ~15 s for typing, tune per type) or after a 1-letter typo = Hard; right = Good. No Easy button. In-session: a wrong card comes back after 3-5 other cards, at the same or easier stage, until answered right once (only the first attempt of the day updates long-term FSRS).
Feedback: instant (< 100 ms) sound + motion on tap; correct tile glows warm, wrong tile gently shakes and the correct one lights; then the sentence audio plays and the game advances on tap/space (or auto after audio). No red X, no score loss.

## What "intuitive" means here (the founder's bar; treat as the main acceptance criterion)
- Like Rhythm Doctor: one core action you understand in 5 seconds with no text tutorial. Teach by doing.
- At most one tap from opening the garden to the first review.
- Every input gets instant, satisfying audio-visual feedback (sound, motion, particles). The garden should visibly change as you work.
- No menus or modal stacks in the core loop; no tiny buttons; works with one thumb on a phone and with mouse/keyboard (space/arrow keys) on desktop.
- The player always knows: what to do now, how much is left, and what they just achieved.
- Short sessions feel complete: a clear, warm end state when today's water is done.
- You may change the interaction above (e.g. tile layout, how a type is presented, which types to use) if you find something more intuitive; explain why.

## Style
- Warm cozy pixel art, Amélie-like palette (warm yellow, green, soft night blues), Paris rooftop at dusk. Reference images and assets attached (garden contact sheet, character sheet). Use or redraw them; any new art must be original.
- UI text uses a clean sans-serif font, never pixel fonts. Little on-screen text; on-screen learning content is French.
- Calm and cute, not gamified-loud. No red X, no punishment.

## Deliverables
- A standalone, playable web build (static HTML/JS, no build server needed; open index.html) in its own folder/branch.
- DESIGN.md: the interaction design, why it's intuitive, and what you rejected.
- Self-check: screenshots of each state (first open, each exercise type before/after answer, right, wrong + retry, pot view, done for today) on 390x844 and 1280x800, and a note of any known issues.

## References, not constraints (founder: use them, but don't feel boxed in)
Existing art style (attached): character_bible_sheet.png (row 1 = live game sprites, the canon look; small, no outline), garden contact_sheet.png (rooftop, pots, props). Match this warmth and palette; you may redraw or extend.
Mechanics already shown to work with the founder or our audience:
- Guess, then reveal: a short pause to think before the answer, then the answer is voiced. Viewers stay to see each answer.
- Gender by color: masculine red #d0122d, feminine blue #1d4ed8, with le·m / la·f tags.
- The kitten Croissant reacts to correct answers, each reaction different and escalating in cuteness across a session (blink, ears, tail flick, heart, hop).
- One-tap actions with an immediate persistent state change (a two-tap add was a rejected bug).
- Water hopping from pot to pot as each word is reviewed; a full rooftop over time is the long-term reward.
- Warm end card when done.
Anything here can be changed if you find something more intuitive; say why in DESIGN.md.
- B4 short contact sheet (cuisine_B4_contact.png) shows the guess-then-reveal and gender colors.
