# Garden of modules — « Le jardin »

Status: **v0.5 is in the app** (one pot per module, week-2 seedling, per-plant review). The rest of this note is the original design. Founder idea, 2026-10-08 19:54 PT.
Privacy: no learner records in this document.

## 1. Idea: plants = knowledge modules
- Every finished **arc / module** awards a **new plant**. Week 1 (« Protège Croissant ») ends with the Day 7 dinner with Madame Martin → **Plant #1 = the Week 1 module**.
- Each plant **holds that module's cards**: its vocabulary deck (story cards) and its grammar points (the desk-letter gaps and mini-lessons). A plant has a small **notebook**: the words, the grammar cards (the same lesson cards as at the desk), the letters written during that module.
- **Reviewing = watering a specific plant.** Tapping a plant opens a review of *that* module's due cards (Anki-like flip, same FSRS). A daily "water everything" shortcut stays for people with little time.
- The desk becomes a **small garden** (windowsill → shelf → balcony as it grows): plants stand next to the desk; each shows its own health (yellow / wilted / dormant by that module's neglected due cards; never dead) and growth (by that module's streak / maturity).
- **Bonding and gifts:** characters and Croissant bond with the player; characters **gift items, including plants** (Madame Martin's plant at the end of Week 1; Camille's cutting; Madame Gagnon's basil). Croissant sleeps among the pots and sometimes knocks one over (cosmetic only).

## 2. Rules (proposal)
1. **Module id on every card** (`card.module`): `core` (generic deck), `week1`, `week2`, … Letter gaps and story cards carry their week's module.
2. **One plant per module.** `garden.plants[]` replaces the single `garden.plant`; `garden.plant` (v0.4.0) becomes `plants[0]` with `module: 'week1'`. Generic `core` cards live in a "pot commun" (or are shown on the module plant that introduced them — decide in v0.5.0).
3. **Watering a plant** = finishing that plant's due reviews today (or a check-in when it has none). The **daily streak** still counts once per day for any watering, so the v0.3.0/v0.4.0 streak, decay rules stay, **except death**: 1 day yellow, 3 wilted, 7 **dormant** (leaves down, pot asleep). **Plants never die** (founder rule, Croissant decision 2026-10-14). Watering a dormant plant (finishing its due reviews or a check-in) revives it: it goes back to yellow → healthy as care resumes. Replant is retired.
4. **Health per plant** follows days since that plant was last watered, so an old module neglected for a week can wilt while the current one is green. A neglected module plant goes **dormant**, never dead; watering revives it. Its cards and history are never deleted.
5. **Growth per plant** from that module's maturity (share of its cards in FSRS review/mature state) plus its watering streak.
6. **New plant award:** finishing an arc's final chapter (Week 1: Day 7) gives the module plant a « fleur » state and adds the next module's seedling.
7. **Same support level for both learners**; gardens are per profile.

## 3. Data model already in v0.4.0 (so v0.5.0 needs no painful migration)
- Every FSRS card carries `module` (set on commit, by `Learn.migrateV04` for old cards, `week1` for story-pending and letter cards, otherwise `core`). Helper: `Learn.moduleOf(item)`.
- `learn.garden.plant.module = 'week1'`; new plants after a replant also get `module: 'week1'`.
- Letter cards: `lt<day>_<gap>`, `origin: 'letter'`, module `week1`; lessons seen: `learn.lessonsSeen`.
- Story save: `S.week.letters[n]` (status, gaps, trace) per day — the module notebook can read these.

## 4. v0.5.0 migration sketch
`garden.v: 1 → 2`: `plants = [ { ...garden.plant, id: 'p1', module: 'week1' } ]`, `history` kept, `allWaterDays` kept as the global streak. Backup first (`.bk.<t>.pre-v0.5.0`), idempotent, unit-tested like `migrateGarden` / `migrateV04`.

## 5. Open questions
- Where do `core` (non-story) cards live: one shared pot, or spread over the module that first showed them?
- Should the Week 1 plant be gifted by Madame Martin at the Day 7 dinner (story moment) — and does that reveal anything before Day 7? (It must not; award it only after the Day 7 scene.)
- How many plants fit on a phone screen before we need a garden scroll?

## Future idea (founder, 2026-10-08 23:20 PT): the guitar / rhythm mini-game
- After some future story event, the player receives a guitar or another instrument as a gift from a character.
- Tapping it opens a rhythm mini-game in the spirit of Rhythm Doctor (节奏医生), as a homage: one-button, hit-on-the-beat levels.
- Fit with learning: lyrics and calls in French (sing-along chants, rhythm of syllables, liaison), so it trains listening and pronunciation rhythm.
- Status: design idea only, not scheduled. Fits the "gifts from characters" bonding layer.

## North-star narrative direction (founder, 2026-10-08 23:33 PT)
- The storyline itself should hook people like a short-drama series: every short episode ends on a cliffhanger and makes players binge "one more".
- Characters must have real arcs (人物弧光): visible change over time, player participation in that change, so players genuinely fall in love with the whole cast.
- Goal: learning + empathy/bond with characters + strong next-episode pull, which later supports monetization and fandom/merch/subculture.
- Implication for writing: each day = one episode with a hook; plan a season-level arc per character (Camille, Noé, Madame Martin, the neighbour, Croissant) with secrets and growth; let player choices shape relationships.

## v0.9.0: simple module award (built)
Finishing Day 7 calls `WeekLogic.awardModule(learn.garden, 'week1', { band, gift: 'martin' }, today)`: sets `garden.modules.week1 = { status: 'complete', on, plant, band, gift }`, `garden.plant.bloom = on` (the plant draws flowers even below stage 4) and `garden.next = { module: 'week2', status: 'seedling', since }`. Idempotent; review history untouched; a replanted plant still shows « Semaine 1 ✓ en fleur » because the award lives on `garden.modules`. Built on `next-batch`: `garden.v` 2, `plants[]` (the week-1 pot is still `garden.plant`), a real week-2 seedling pot (`id: w2`) after the Day 7 award, and desk buttons « Semaine 1 » / « Semaine 2 » that review only that module. Core cards stay on the daily “water everything” shortcut. A replant still replaces only the week-1 pot.
