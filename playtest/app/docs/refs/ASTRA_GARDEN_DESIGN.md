# Le Jardin

A small, permanent place for your French. A standalone prototype of the rooftop vocabulary garden for L'Appartement 411.

## Open It

Open `index.html` directly. Keep `style.css`, `art.js`, `engine.js`, and `app.js` alongside it. There is no build, server, CDN, font download, image download, analytics, or application network dependency. All artwork is original, drawn at low resolution on a canvas; interface text uses the system sans-serif.

## One Action, Two Spaces

The primary action is **Arroser mes mots**. One tap starts today's mixed queue, without a settings screen, onboarding carousel, or a second confirmation. Answer a real question; the garden receives water. The question is the action, not an interruption before the action.

On desktop, the garden remains alongside the learning card. On a phone, the garden becomes a compact scene above the card, with answers toward the bottom. The two pot labels are actual buttons: they open the associated wordbook in the same card area. Nothing opens a modal stack. Leaving a review saves the remaining queue; the home button becomes **Reprendre l'arrosage**.

The interface is deliberately editorial rather than dashboard-like: a quiet title, a little Parisian evening, a cream paper card, a single green primary button. The can's visible fill is the progress meter. The number beside it is how many words remain, including words that need another attempt. A correct answer empties one portion; an incorrect answer does not steal water or remove growth.

## Visual Language

The original pixel scene draws from the references' warmth and tiny, outline-free Croissant, not their exact layout. Zinc roofs, muted dusk pink, a small Eiffel silhouette, golden windows, a string of lights, terracotta pots, a sage-green can, and a folding chair make this a place rather than a flashcard dashboard. The two pots are word sets, not individual vocabulary items.

Reviewing new items adds persistent blooms. Overdue plants change to a quieter olive palette; their stems and leaves remain. A successful answer sends a stream of small pale-blue drops into the relevant pot. Croissant progresses through a blink, alert ears, a tail change, a heart, and a small hop pose. Incorrect answers produce a soft, short splash and a gentle tile shake, not a red X. All sound is synthesized locally with Web Audio. Reduced-motion preferences disable CSS motion.

Gender appears only where it is useful, in the wordbook: textual `le · m` / `la · f` tags with the supplied red/blue colors. Red is not used as failure feedback. Numeric scores, streak pressure, leaderboards, XP, dying plants, and urgency timers are intentionally absent.

## States And Inputs

| State | What is visible | What to do |
| --- | --- | --- |
| First open / paused | Full or partly full can, remaining words, due/new split | Tap the green button; Space also starts |
| R1: listen-meaning | Full French sentence, target in gold, Chinese and English meaning tiles | Tap a meaning; keys 1-4 |
| R2: cloze-choose | French sentence with a gap; no pre-answer audio | Tap the missing French word; keys 1-4 |
| R3: chunk-order | Chinese/English sentence meaning, audio, 3-6 shuffled chunks | Tap chunks to place; tap a placed or selected chunk to remove; last placement submits |
| P1: cloze-type | French gap, first-letter hint | Type, then Enter or Valider |
| P2: dictation | Local French sentence audio, meaning cue for the missing target | Type the target, then Enter; written cloze fallback when audio cannot work |
| Correct | Warm gold tile, water stream, full highlighted sentence, spoken sentence | Continue or Space |
| Incorrect | Soft shake, correct choice illuminated, full highlighted sentence and meaning | Continue; the word returns after other words |
| Retry | Same or easier recognition question, ON RÉESSAIE label | Retrieve successfully once; no second long-term scheduling change |
| Wordbook | One pot's 15 words, gender and memory state | Open a row for meanings, sentence, audio, stability and next review |
| Complete | Empty can, warm end card, words watered | Browse the pots or leave; no pressure to continue |
| Atelier | New-word cap, +1 day, isolated exercise previews | Inspect later stages without modifying actual learning progress |
| No storage | Persistent save warning | The current session remains playable, but cannot survive a reload |
| No local voice / muted | Written prompt and explicit voice status | All exercises remain answerable, including dictation's cloze fallback |

Arrow keys move between answer tiles, Enter/Space activate native buttons, Escape returns to the garden. Text input retains normal keyboard behavior. Native labels, focus rings, semantic buttons, expandable word entries, a labeled progressbar, and live feedback are included. Controls are not canvas hit regions: the canvas is decorative scene content, with real DOM pot buttons above it.

Feedback never auto-advances. The user controls the pace, and text remains available when speech is absent or slow. R3 submits on the last placement to preserve the one-action model; all earlier placements can be undone. An incorrect completed sequence is shown correctly in the sentence reveal and retried as recognition.

## Scheduling And Grading

`engine.js` contains a small FSRS-4.5 implementation with stability, difficulty, retrievability, lapse handling, default parameters, and a 90% retention target. Cards are scheduled on local calendar days, not an arbitrary repeating interval table. The model is not personalized or trained on this prototype's users.

The first attempt at an item on a local day is the only attempt that updates long-term FSRS. A wrong answer is Again; a correct answer is Good unless slow or accepted with a one-character edit, in which case it is Hard. There is no self-rating and no Easy button. Recognition uses an 8-second threshold, typing 15 seconds, and ordering 18 seconds to allow for several physical taps. These speed thresholds are design heuristics, not validated learning measures. Accent differences, apostrophe style, case, and punctuation are normalized. One insertion, deletion, or substitution is accepted as Hard, with the exact spelling shown in feedback. Empty answers cannot be submitted.

A wrong item goes behind three other queued items and remains until answered correctly. When fewer than three distinct items remain, it returns sooner rather than inserting fake filler or forcing a timer. The remaining queue, completions, exercise history, and pending retries are saved after each answer, so closing a tab does not erase a lapse or escape a retry. New-day transitions discard the old session queue, while the Again schedule still brings lapsed items back.

Due words come before new words and both pots are interleaved. The default cap is 10 new introductions per local day, with fewer as due workload rises. Daily introduction accounting is independent of the UI session. Words already encountered in the supplied story vocabulary are eligible distractors even if they have not yet been introduced to spaced review. Distractors share part of speech and gender, and the selected sample avoids homophone distractors.

Stage selection follows stability: new items start in R1, low stability uses R1/R2, 3-14 days uses R2/R3, and mature items use R3/P1/P2. Lapses lower difficulty. One deliberate resolution of two conflicting brief rules: after two consecutive R1 exercises, a new item may use R2, rather than display a third identical type. R2 is still recognition, not unsupported production. Retry stages are the same or easier. Atelier previews are explicitly labeled and never alter cards, daily limits, or the real session.

## Content And Provenance

There are 30 vocabulary items, 15 from each week of `WORDLIST_W1-2_DRAFT_040f.md`, with original Chinese/English glosses. This compact sample uses nouns so that four same-POS, same-gender meaning or cloze choices are consistently available; R3 still exercises whole sentences, not isolated noun ordering.

The supplied draft lists vocabulary and says it has appeared in the story, but contains no canonical source sentences. No existing game code or story cache was inspected. Example sentences and their translations were therefore written specifically for this standalone prototype, and the wordbook labels them **Phrase adaptée** with their vocabulary day. They are not represented as verbatim story quotes. Canonical sentence/audio integration is a content handoff, not something this prototype silently invents.

## Offline Audio

Browser speech synthesis is a placeholder, not bundled recorded French audio. Only installed French voices marked `localService` are used, so the application does not choose a network-backed voice. Every answer requests the complete sentence with the target highlighted; R1/R3/P2 also request it on presentation. R2 withholds audio until submission. If the browser has no local French voice, text remains available and the status explains the limitation. Dictation becomes a written cloze rather than an impossible audio-only question. Muting also triggers this fallback.

Sound feedback is generated with oscillators and does not require audio files. Actual French pronunciation, OS voice availability, and audio output require manual testing on the destination device. There is no microphone permission request; optional speech recognition was omitted because it would introduce availability and network uncertainty without improving the required loop.

## Why These Choices

- **Retrieval, not confidence:** there is always a concrete answer to grade, in line with the supplied testing-effect research.
- **Variety without five different apps:** prompts change, but the same panel, bottom answer area, feedback, and continuation remain.
- **Calm completion:** a finite daily can is more useful than endless cards or a streak counter.
- **Stable place, gentle consequence:** growth persists; dormancy is reversible, never a punishment.
- **Explicit continuation:** rejected auto-advance so readers and listeners control the pace.
- **No separate inventory:** the pot is the wordbook, keeping the metaphor functional.
- **No exposed FSRS jargon in the core loop:** stability is available in the wordbook, not as an answer-time decision.
- **No artificial research certainty:** the recognition-to-production sequence and response-time grading remain reasonable design hypotheses, not proven outcomes.

## Reproduce The Self-Check

The application itself requires no tooling. The optional tests need Node; the screenshot script additionally needs Playwright and its Chromium browser.

```sh
node --test prototypes/astra-garden/engine.test.cjs
# With Playwright installed where Node can resolve it:
node prototypes/astra-garden/screenshots.cjs
# In the provided environment, testing dependencies live outside the deliverable:
NODE_PATH=/tmp/kilo/node_modules node prototypes/astra-garden/screenshots.cjs
```

The script opens the real `file://` entry point with networking disabled. It captures all state screenshots into `screenshots/`, prefixing files with `390x844` or `1280x800`. Each primary screenshot has exactly the requested viewport dimensions. The Atelier also gets an additional `-full` capture because the debug controls sit below the garden. Each capture checks for horizontal overflow. On mobile, the garden gets a little shorter during review and browsing to leave room for the active card.

The script exercises first open, actual daily wrong/retry/recovered flow, paused/reloaded progress, completion, both pots, expanded source sentence, settings, simulated next day, before/correct/wrong for all five types, partial chunk ordering and removal, typo acceptance, slow grading, dictation with a local-voice API fixture, and muted fallback. The normal P2 captures show the genuine no-voice fallback in CI. Files explicitly named `local-voice-fixture` verify the audio-only presentation with a stub, not a claim that CI has an audible French voice. `screenshots/report.json` records captures, checks, and runtime/network errors.

## Self-Check Results

Verified on 2026-10-15 in headless Chromium using the direct `file://` build with the browser context offline.

- **18/18 engine tests pass:** vocabulary integrity, distractors, FSRS equations, 500-review numerical stability, daily limits, first-attempt protection, dates/DST, typing normalization, stage thresholds, and classic-script loading.
- **78 screenshots generated:** 38 exact-size viewport captures per size, plus one additional full-page Atelier capture per size. Both 390x844 and 1280x800 cover all five exercise types before/correct/wrong, real retries, browsing, completion, dormancy/recovery, and failure/fallback states.
- **Browser assertions pass:** zero runtime errors, zero HTTP requests, no horizontal overflow, and the start/continue action within the viewport for every applicable capture. Actual wrong-answer recovery waits for three other cards and does not modify the original day's FSRS record.
- **Persistence and boundary assertions pass:** reload during a session, reload after completion, blocked localStorage, cap changes during an active queue, zero-new-word days, calendar rollover before an answer, and calendar rollover during feedback.
- **Visual inspection:** checked mobile first-open, wrong-answer, chunk-order before/after, dictation fallback, expanded wordbook, dormant garden, storage warning, and desktop first-open/completion. Pot labels were repositioned so they do not obscure the pots; redundant ordering output is hidden after submission so Continue remains on-screen.
- **Audio scope:** API invocation and local-voice/fallback branches are tested. Actual audible French voice quality and device audio latency are not claimed as verified.

## Known Limits

- Local French TTS depends on browser/OS installation; no recorded audio is bundled. Silent/offline dictation intentionally uses its written fallback.
- Vocabulary is sourced; example sentences are adapted, not canonical story lines.
- FSRS uses default parameters and day-granularity scheduling; there is no personalized fitting or cross-device sync.
- `localStorage` on `file://` is browser-dependent. Chromium persistence is tested; blocked storage produces a visible warning. Moving the folder or clearing browser data may lose progress.
- This is a 30-item, two-pot prototype. New words finish after the sample is introduced; future daily sessions continue reviewing existing items. There is no import or account system.
- The daily cap control applies to future queue creation; a session already started keeps its finite queue. The debug day control intentionally changes the simulated calendar immediately.
- Browser automation checks layout and behavior, not pronunciation quality or long-term educational effectiveness. Soft sound, physical mobile keyboard comfort, and screen-reader experience still merit device testing.
