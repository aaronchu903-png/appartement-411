Day 9 visual fix round 2 on branch astra/day9-app (base d2cb316).

Implement game code and visuals only via art/story staging/harness. Do NOT change story French text in content-day9.js, content.js, Days 1-6, or Day 8. No deploy. Never write/delete a411.* or player saves.

## 1. Third-pot reveal — HIGH POINT (roof)

Scene `n_d10_tresor` / direction for `n_d10_tresor` and related beats in `app/art.js`, `app/content-day9.js` staging only (timing/holdMs/silence — not dialogue copy).

- Slow **push-in** to a true **close-up** of the third pot on the roof.
- Stolen **pen, sock, spoon** clearly visible; **Croissant** curled asleep on top, filling ~**60%** of the scene zone above the panel.
- **Show-then-say:** push-in must **land before** the dialogue line appears (`silenceBeforeMs` / `holdMs` / frame timing as needed).
- Then **cut to medium** shot of the **three laughing together** on the roof (“first laugh together” beat — likely `d10_noe_tout` or adjacent staging; use existing scene ids, adjust camera only).
- Crisp **integer pixel** scaling (`image-rendering: pixelated`, integer canvas scale).

## 2. Vanish beats — human reaction after absence

Pen, sock, croissant vanish sequences (`d10_noe_stylo`, `d10_noe_manque`, `n_d10_miettes`):

- Keep **before / moment / absence** object frames with **consistent framing** (table-top boards).
- After each **absence** frame, add a **medium reaction** shot (waist-up) of **Noé or Camille** as appropriate — readable expression/gesture. Wire via staging/direction in content-day9 + art camera targets.
- Each vanish gets its own reaction beat before story continues.

## 3. Roof door opening (`n_d10_monte`)

- Door reads tilted/odd perspective — fix to **clean front-on** perspective consistent with stairwell.
- Hand and key placed naturally.

## 4. Service worker

Bump cache id in `app/sw.js` and `app/tests/sw.test.cjs`.

## 5. Screenshot harness (`app/tools/v8-day9-screenshots.cjs`, `app/tests/v4-browser.cjs`, `app/tests/art.test.cjs` as needed)

Capture at **390×844** under `app/screenshots/`:

**New / required:**
- `v8-day9-third-pot-pushin-start.png`
- `v8-day9-third-pot-roof-reveal.png` (landed close-up, **before** line)
- `v8-day9-third-pot-line.png`
- `v8-day9-roof-laugh-medium.png`
- `v8-day9-pen-reaction.png`, `v8-day9-sock-reaction.png`, `v8-day9-croissant-reaction.png` (after each absence)
- `v8-day9-roof-door-opening.png`

**Also regenerate** the full existing v8-day9 set (vanish triplets, medium-panel, close-clock, review cards, laptop-hook, end, etc.).

## 6. Verify

From `app/`:
- `npm test`
- `V4_BROWSER=webkit npm run test:browser`
- `npm run test:webkit`

Commit: `fix(app): Day 9 third-pot push-in, vanish reactions, and door perspective`
