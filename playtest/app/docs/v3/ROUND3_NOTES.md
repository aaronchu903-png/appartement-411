# Round 3 Implementation Notes

## Precedence and preserved guarantees

Latest founder rule: mobile only. The only interaction layouts and screenshot acceptance sizes are portrait 390x844 and 375x667. Wider screens letterbox a centered phone frame; there is no desktop or landscape scene composition. One 1280x800 test checks the centered portrait frame, not a separate desktop experience.

Applied FEEDBACK.md and the final FOUNDER OVERRIDES over the earlier design text. In particular, the rooftop has no fixed eight-word cap: it includes today's due words across pots, with optional checkpoints around every eight original words and an exit throughout. First encounters teach comprehension, not guessing.

All changes are inside `app/`. The story-first and Yuechao-refusal regressions remain. Entry never starts a review; the facade's single Continuer enters the home story. The existing garden Continuer route remains one tap. Rooftop access still requires the actual key handover. Music mute still pauses the day/night player, including on iOS implementations that ignore volume writes.

## Implemented

- Full-screen facade entry, one pixel Continuer, no location/time/ATELIER label.
- Comprehension-only focus: contextual sentence and object framing first, automatic gender-coloured word reveal after the source audio, word audio, and collection into the carnet. No answer choice. Manual Continuer remains available immediately. A stalled audio source has a bounded fallback.
- Subsequent encounters use uncued French word picks or sentence-building. No focus spotlight, answer-revealing image, gender colour, or cat grading reaction during story recall. Story evidence does not reschedule FSRS.
- Rooftop exercises include listen-and-pick, gap choice, sentence bank, picture choice, and four-pair matching. Picture exercises require explicit distinct drawable pictures, not interchangeable scene thumbnails. Typing remains unavailable before Day 12, including old cached production prompts.
- Auto-grading only. A correct answer advances without an additional Continuer; feedback respects audio completion within a 1.5-second bound. Wrong answers reveal the correct answer in colour and can be replayed. Slow responses or two replays produce Hard; retries never reschedule the same day's memory again.
- Fixed-denominator progress and watering-can count. An original word consumes one drop on its first graded answer, including a wrong answer; retries do not consume more. Checkpoints do not truncate the queue. Plus tard saves the session for resumption.
- Rooftop-only grading reactions, streak feedback, and per-pot wet soil independent of growth settlement.
- Large Carnet and Note sheets. Carnet rows include French, gender, POS, translation, word audio, and encounter pips. Expanded rows include the source sentence, sentence audio, and a cached 120x80 scene thumbnail. Pixel pot tabs and stable pagination replace the small select/scroll treatment; expanded pagination does not skip words.
- Four-second, character-free and text-free facade establishing shot before evening, with progressive dusk/night lighting and individual lit windows. Normal story scenes explicitly restore character visibility after the empty facade, so the cat is present at home and at dinner.
- Cat approach rebuilt with four foot/tail walk poses, two anticipation poses, and a gradual paw reach. Dinner characters are layered so all three faces remain visible. Portrait framing brings furniture toward the dialogue rather than leaving an empty lower floor.
- Service-worker cache is now `a411-day8-static-v8-mobile-only`; atomic shell replacement, app-scoped refresh, and offline cache behaviour preserved.
- All scene controls, sheets, hotspots, and notices are contained in the phone frame. The four persistent controls, including Pause, share a bottom thumb bar; a fifth Close control appears for sheets so dismissal never requires reaching the top. Rooftop exit/Continuer sits immediately above the bar. Safe-area insets are applied to the thumb bar, sheets, story panels, and review progress. The installed app requests portrait orientation; short/wide windows scale the same portrait frame rather than selecting a landscape layout. Static touch targets are reprojected after resizing without replacing unsaved form fields.
- Short phones use up to six collapsed or three expanded carnet rows per page instead of eight/four, with five collapsed rows while search is open. Paging preserves word order and typical sheets need no inner scroll. Resizing preserves carnet search focus and the expanded word rather than rebuilding the input or changing its selected row. The read-only exporter also uses a centered portrait-width sheet without changing any save permissions.
- Short-phone image/matching cards use compact illustrations while retaining at least 44px touch targets, so the hint control remains visible above the bottom bars. During rooftop review, Croissant perches above the doorway rather than being obscured by the exercise panel; story and normal garden cat positions are unchanged.

## Lesson audit

The compiled lesson contains 81 beats while preserving the original 53 canonical anchors in order. `legacySceneIds` maps saved numeric v2 cursors to the expanded v3 story; stable scene IDs take precedence. Previously truncated eight-item saved review queues expand without replaying completed items.

| Metric | Round 3 |
| --- | ---: |
| Comprehension focus targets | 8 |
| In-scene picks | 13 |
| In-scene sentence banks | 4 |
| Contiguous end-probe items | 4 |
| Diary and closing ritual | 1 each |
| Maximum passive run | 4 beats |

The targets are plante, basilic, soupe, pain, jeudi, cle, toit, and jardin. Each has four tracked target encounters across at least two locations before watering; first exposure is focus, and the next is recall. New review eligibility requires at least three distinct encounters including an active one. Imported or already introduced memory is preserved. The toit/jardin comprehension uses the handed-over key as its contextual anchor, not a nonexistent rooftop door in the dinner room.

## Verification

Commands run from `app/`:

```sh
npm test
npm run verify:content
NODE_PATH=/tmp/kilo/node_modules npm run test:webkit
NODE_PATH=/tmp/kilo/node_modules npm run test:round3
NODE_PATH=/tmp/kilo/node_modules npm run screenshots:round3
```

The integrated Node suite passes 186 tests, including 13 art tests. All 18 mobile capture scenarios pass, including full story traversal, sheets, review, protected import, safe areas, and checks that controls are not clipped by their panels. The only wide-screen browser case verifies phone-frame centering, containment, and hotspot alignment after resizing; phone-size transitions also preserve carnet search focus and expanded entries. WebKit acceptance passes 19/19 (18 phone scenarios plus that one frame case), and the preserved WebKit hotfix scenarios pass 32/32 across both phone sizes. The mobile portability check also passes read-only export, permitted import, protected-save refusal, and offline operation. Final mobile-only results are recorded in `screenshots/v3-report.json`; the earlier desktop results are superseded, not reused as mobile acceptance. Standalone browser art checks pass at both phone sizes and retain all 10 legacy non-UI pixel goldens.

The browser scenarios cover production entry and complete story traversal, comprehension then recall, absence of recall cues, correct auto-advance, coloured wrong answers, all due words, checkpoints, saved exit/resume, picture distinctions and pair grading, carnet fields and sizing, music mute, service-worker upgrade/offline operation, and Yuechao refusal. Later regression additions cover expanded-carnet page continuity, deferred audio completion, and cached production prompts from old saves.

## Visual evidence

The 62 current app screenshots use `screenshots/v3-*`: 31 at exactly 390x844 and 31 at 375x667, with PNG dimensions verified. `screenshots/v3-report.json` records all 18 passing mobile capture scenarios, full 81-beat story traversal at both sizes, no failures, and matching start/end/current source hashes. The obsolete `v3-desktop-*` images are deleted. Standalone renderer checks use mobile-only `screenshots/round3-art-*`. The frame-level reference contact sheets are `screenshots/round3-reference-cat-24fps.png` and `screenshots/round3-reference-overview.png`, extracted from the supplied J'ai faim reference rather than substituted artwork.

Representative captures at both sizes: `facade-entry`, `home-one-tap`, `focus-comprehension`, `focus-reveal`, `next-encounter-recall`, `dinner`, `establishing-day/dusk/night`, `carnet-expanded`, `note`, and `review-checkpoint`. Filenames are prefixed `v3-mobile-` and `v3-mobile-small-` respectively. No desktop acceptance screenshots are generated.

The cat checks measure continuity at both 24 and 60 fps, verify four distinct rendered walking foot patterns, preserve lift contact coordinates, and check both normal and reduced motion. The measured entrance maximum is 1.978 native pixels per frame, or 7.913 at 4x display scale. This bound assumes a continuous supplied animation clock, not arbitrary timestamp jumps. Dinner face/eye samples and empty facade window progression are checked at both target viewport sizes.

## Remaining content QA

The audio audit explicitly reports 3 of 87 requested authored clips present and 84 missing. Existing recordings are reused where valid; missing clips use local French speech or written fallback. No recordings were fabricated and no remote speech service was added. New sentence-bank recordings use their own IDs, never a different source sentence's audio.

Two new French instructions remain flagged for register review: "Ecoute, puis choisis." and "Mets les mots dans l'ordre." The app contains the correctly accented French typography; this note does not claim editorial sign-off or new recorded voice coverage.
