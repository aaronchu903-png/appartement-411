Day 9 visual fix round on branch astra/day9-app (base d1e91ac).

Implement ONLY game code and visuals for these screenshot issues. Do not change story French text in content-day9.js, content.js, or Days 1-6/8. No deploy. Never write/delete a411.* or player saves.

## 1. Camera / pixel art (app/art.js, app/style.css, tests as needed)

- Close and medium shots currently blow pixel art into giant cropped heads (pen/sock/croissant vanish, third-pot reveal).
- **Bug:** v8-day9-pen-vanish-absence.png draws the character sprite twice overlapping — fix the draw path.
- **Rules:** Integer/crisp scaling only: `image-rendering: pixelated` (and equivalent canvas draw), no blurry upscale.
- **Close-ups** must frame the OBJECT or hand (pen on sheet, sock, croissant plate, clock face, pot contents, paw) — NOT a 3× character face.
- **Medium** ~1.6–2× waist-up; full head inside frame; no character sliced at frame edge.
- **Third-pot reveal (roof):** Pot with pen, sock, spoon and sleeping Croissant clearly readable; roof context visible; nobody cropped through the face.
- **Vanish beats:** before / moment / absence for each object share the same camera framing so disappearance reads at a glance.

Use existing `renderDay9`, `day9Rects`, `direction`, shot types in content-day9.js staging. Adjust zoom targets in art.js framing logic, not story copy.

## 2. Review card (app/style.css / app.js review panel)

- `v8-day9-review-ce-nest-pas-moi-correct.png` has a large empty area — size the review panel/card to its content (M2 production/review layout).

## 3. Service worker

- Bump SW cache version in app/sw.js and app/tests/sw.test.cjs to match.

## 4. Verify

- Run from `app/`: `npm test`, `V4_BROWSER=webkit npm run test:browser`, `npm run test:webkit`.
- Regenerate acceptance PNGs: run capture in `app/tools/v8-day9-screenshots.cjs` (or full v4-browser Day 9 tests) so `app/screenshots/v8-day9-*.png` at 390×844 are updated (same set as before: door, medium-panel, close-clock, pen/sock/croissant vanish triplets, review + correct, third-pot, laptop-hook, end).

Commit message suggestion: `fix(app): Day 9 camera framing, vanish continuity, and review card sizing`
