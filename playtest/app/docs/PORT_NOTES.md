# Day 8 V2 Port Notes

Written before implementation, after reading the full V2 brief (including its final overrides), V2_PLAN, the comparison and reference images, root index.html, and the legacy js/css implementation. The animation reference is being inspected as all 600 decoded frames, not just the three index stills. The committed video is 25 seconds at 24 fps.

## Boundaries

Only app/ changes. Root index.html, js/, css/, old scenes and Days 1-6 remain untouched. Preserve the existing Astra painters, palette, backgrounds and character designs. New motion and garden composition are additive. Synthetic saves only; retain transactional refusal of Yuechao imports. No deploy, merge, commit or remote save access.

## Port Map

| Legacy source | Destination | Port and simplification |
| --- | --- | --- |
| js/app.js lineBodyInto, lineButtons, R_line (1206-1259); css/style.css dialogue/speaker/btn | app/app.js and style.css, modules/M1.js | Keep speaker chip, tappable French, replay and continue. Overlay rather than a page section. Remove line counter, duplicate Aa control and always-visible translations. |
| js/app.js focusBeat (1274-1300); css/style.css 183-230; js/shots.js | M1, app/art.js, app/app.js | Keep object pulse, camera focus, guess then reveal, gender colour and word audio. Do not port shots.js's contain/34vh sizing. The viewport stays covered. |
| css/style.css wb-fab (243), mu-fab (329), fb-fab; js/app.js musicFab/wordbookFab | app/style.css, app/app.js | Preserve 46px carnet at bottom-left, 44px music bottom-right and feedback bottom-centre. Adapt the legacy topbar Pause to a fixed 44px top-right control; that fixed placement is new, not a legacy CSS claim. Keep safe-area insets. All four stay mounted over scenes and overlays. No navigation tabs. |
| js/art.js ICONS (466-490) | app/icons.js | Copy 9x9 bitmap glyphs and render filled integer rectangles with currentColor. No stroked outline icon library. |
| js/wordbook.js and js/app.js lookupLocal/openWordbook | app/app.js carnet/lookup overlay | Keep collected list, search, word detail, source sentence, playback, gender and collection. Closing restores the same beat without resetting animation. No separate wordbook page. |
| js/glossary.js, lexicon.js, glossary-data.js, lexicon-data.js | existing app/data/inherited.js, content.js lookup | Reuse inherited dictionary and inflected-form resolution; preserve surface-to-lemma and three gloss lines. Never invent translations. |
| js/conjugate.js, grammar.js | existing conjugation API, app/app.js | Retain offline conjugations and grammar collection. Pixel lightbulb opens it on demand. |
| js/fsrs.js, learn.js, pots.js, reviewui.js | existing app/engine.js plus modules/M2.js | One scheduling engine. Retain lenient grading, card identity, daily caps, import and pot mapping. Only the night rooftop calls review; no kitchen or cat review. |
| js/audio.js, clips.js, deck-clips.js, sfx.js, music.js | existing app/audio.js and inherited clip map | Keep recordings, TTS and readable-text fallback, mixer and mute. Remove intrusive reading banners. |
| js/feedback.js and legacy feedback sheet | app/app.js feedback overlay | Keep local notes, attachments and export. Do not port private-token auto-upload into this static app or imply a note was sent. Successful export is not successful upload. |
| js/sync.js, legacy.js | existing app/save.js | Preserve explicit import/export and migration, with safe validation. No private-repository credentials or automatic real-save synchronization. |
| js/writing.js | modules/M4.js and existing writing overlay | Reuse authored reply alternatives and incremental hints. Free-writing offline checks remain labelled as pattern help, not AI correction. |
| js/i18n.js | app/app.js pause language setting | French controls and story always. Language affects optional hints and dictionary glosses only. |
| js/founderdev.js | app/app.js ?dev=1 tooling | Keep isolated preview state, scene jump and synthetic multi-pot fixtures. No writes to real progress from previews. |

## Flow Changes

- Remove d8_morning_review. The kitchen opens directly on the existing story.
- Croissant becomes a short touch/drag interaction with continuous approach and retreat, gentle sound and pixel feedback, no questions, scheduling or failure screen.
- Keep a living plant in the pot throughout and after the cat game; learning stage zero must not erase a story prop.
- Use the approved listen-only Noe line, "Et ta plante ? Je la monte aussi !", displayed with French typography, for carrying Martin's plant upstairs. No added explanatory narration.
- After planting, first water basil in pot 2, then review due words in pot 1 in the same rooftop session. Every answer plays its correct audio and targets the matching pot.
- Garden shelves use stable data-driven slots and bounded pages/bays for at least 60 pots. Selection and watering target IDs, not hard-coded two-pot coordinates.
- M1 Scene, M2 Jardin, M3 Repondeur and M4 Replique expose a shared run(id, {items, skin, sceneHooks}) entry. Story records invoke modules rather than duplicate exercise algorithms.

## Cuts And Final Overrides

Remove the side panel, bottom tabs, title tile menu, web-style headings, round/glass buttons, blur and gradient chrome, counters, streak copy, rule paragraphs and action-description completion captions. Pause contains settings, import and dev tools. Carnet remains a modal skill-like overlay with the scene visible behind it.

No numerical narration or word-count cap is applied. Preserve narration needed for time/place or sound gags, and use animation instead of filler descriptions. Chinese is allowed only inside lookup/carnet glosses or explicitly opened exercise hints. Keep the approved ending as story content, not a new explanatory completion card.

## Verification

Run existing root and app suites, add module/rooftop/cat/HUD/layout/typography regressions, and preserve protected import tests. Capture 390x844 and 1280x800 scenes, open carnet, word reveal, lookup, first watering, 2/24/60-pot garden, and cat end. Record motion evidence and inspect screenshots for clipping, continuous scene coverage, fixed HUD and the living plant.

## Legacy Feedback Finding

The old bottom-centre Retour uses returns.js, whose cloudSink is a not-configured stub. It does not use feedback.js's private-repository transport; exporting a ZIP is not an upload. This proves the persistent-HUD wiring gap but does not prove the cause of every Home Note failure. V2 deliberately presents one local note/export path and does not claim cloud delivery.

## Integration Findings

- Preserve story identity across the removed opening review and added carry beat. V2 stores a stable scene ID; existing numeric v1 positions migrate once. Fresh UI defaults must not overwrite an imported v1 position or supply a false v2 stamp. Existing played local progress retains its prior merge precedence.
- First watering is a nine-item budget: basil followed by up to eight due Martin words. Retry fillers come only from the selected queue, never future-due words. Later visits use the inherited eight-item budget.
- Normalize inherited carnet headwords only at display time, retaining the original source records and their aliases.
- The desktop dining chair falls behind a bottom dialogue card. Detect actual hitbox overlap and dock that card at the top, rather than moving the preserved artwork, disabling hit testing or forcing browser-test clicks.
