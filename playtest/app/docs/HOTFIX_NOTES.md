# Day 8 v2 iPhone Safari Hotfix

## Reproduction and Root Cause

Tested with Playwright 1.64.1 WebKit, `devices['iPhone 13']` (390 x 664 CSS viewport, touch enabled), isolated browser contexts, real `/app/` player mode, and synthetic localStorage saves. These tests do not enable `?dev=1` or use debug routing helpers.

The founder clarified that the reported problem was **a long review before any story, not a hard freeze**. The hard requirement is story first: one entry tap must reach home regardless of due load; the first review belongs on the roof after the key handover and must be short and skippable.

Before the fix:

| Case | Observed behavior |
| --- | --- |
| Fresh profile, no save/cache | The title screen showed the roof, but tapping Continuer reached `n_d8_matin` in the kitchen and advanced normally. The reported fresh-profile review trap was **not reproduced** with the current uncached source. |
| v1 mid-story save | Continuer used the migrated old cursor rather than starting at home. The initial reproduction used index 30 and reached the Lefevre scene. |
| v1 save containing a rooftop garden review | Continuer entered `review` instead of `story`, reproducing the rooftop detour. |
| Completed save in the garden | The garden omitted its story/Continuer button. Finishing an empty review returned to that same garden. |
| Malformed saved review | The old sanitizer accepted feedback without its corresponding exercise and sessions missing runtime fields. Rendering could dereference a missing exercise; a missing pool could also break retries. |

The primary cause was **entry routing plus stale transient review state**, not a failed Safari click handler or an off-by-one scene migration. `handle('continue')` prioritized `appSession`, then a rooftop growth reveal, then the completed-game garden, before considering the story. v1 and v2 share `a411app.v1.state`; a v1 garden session with rooftop/completion flags survived the old validation. This made an old activity take precedence over starting the story.

The escape paths compounded that routing problem: active reviews had no direct exit, and completed gardens hid their story button. The first-watering UI requested nine initial items, and the engine's budget limited only that initial queue, not retries or filler questions. Repeated wrong answers could therefore extend the session indefinitely. A normally answered review did complete; the problem was mandatory ordering and excessive length, not a frozen click handler. Malformed-session handling remains defensive protection, not the explanation for the founder's long review.

The cache-first worker also allowed an older shell to remain installed. We cannot establish which files the reporting phone actually cached. Mixed/stale deployment files are therefore a **deployment risk, not a proven explanation for the fresh-profile report**. The new browser regression installs a synthetic old cache-first worker and old shell, then verifies an actual upgrade and offline reload.

## Changes

- Entry artwork now shows home. Entry **Continuer always starts `n_d8_matin`**, including when the saved game was mid-story, completed, or in review. This is an intentional narrative-start policy: it does not silently resume an imported cursor or activity. Subsequent story Continuer buttons still advance normally.
- The first rooftop review is available only at the authored `d8_first_watering` scene after the key handover. Optional garden access is hidden and guarded until the current story has passed that scene. Old rooftop/completion/key flags cannot expose garden review at the start of a replay, including in founder preview mode's ordinary navigation.
- The first session contains basil plus up to seven due pot1 words. `M2` persists `firstWateringCap` and stops after **at most eight total answers**, counting retries and fillers. Lower requested budgets remain valid; oversized budgets cannot bypass eight. Resuming a session preserves the bound, and older v2 first-watering sessions receive the cap during UI sanitization. If fewer items are available, the session can be shorter; it never pads to eight just to consume time.
- The garden, active review, review completion, growth reveal, and first-watering screen have an independent visible exit outside the scrolling review panel. At first watering, **Continuer l'histoire** skips directly to `n_d10_arrose`, even with zero answers or a broken review. Optional garden exits return home. Neither exit requires successful review completion.
- Extra due words remain due and unchanged. Reaching the first-session cap continues the story rather than opening another queue. Further review requires an explicit optional garden action later; it is never forced before or after the story.
- Exiting does not call the review completion hook or grade unanswered cards. Scheduling, collected words, notes, settings, choices, and earned garden unlocks are retained. Previously recorded answers remain recorded.
- Migration keeps the existing stable-ID/index mapping and version stamp. It discards incompatible v1 review continuations rather than clearing the save or changing storage namespaces. v2 session validation now checks the queue cursor, pool, answer counter, timestamp, cached exercise, feedback/exercise pairing, and story return location. Routing flags use strict booleans. New story reviews record their originating scene, preventing completion from advancing an unrelated scene.
- A review-render failure clears the transient session and returns to the garden with the exit available. The exit does not depend on review-engine callbacks. The button node is retained across audio-status updates so asynchronous audio fallback cannot detach a touch target.
- Growth settlement/reveal now happens on explicit garden entry, not before the story starts.
- The worker cache is now **`a411-day8-static-v6-music-mute`**, following v5's story-first update, so already-installed clients also receive the native music-mute fix. Installation precaches the shell with `Request.cache = 'reload'`, then calls `skipWaiting()`. Activation deletes obsolete `a411-day8-static-*` caches and calls `clients.claim()`. Unrelated game caches are retained. Registration uses `updateViaCache: 'none'` and requests an update.
- On upgrade only, activation refreshes controlled app windows to their unchanged URLs, so even old pages without a `controllerchange` listener load the new shell. It does not refresh a clean first install. Navigation is deliberately **not awaited inside activation**: WebKit testing caught a deadlock where navigation waited for activation while activation waited for navigation. Cache-first shell delivery and offline operation remain intact.

Only `app/` was changed. The `app/docs/v3_feedback/` material was left untouched; no feedback backlog work was undertaken.

## iPhone Music Toggle

The old toggle saved `settings.music = 0` and changed the pixel icon, but only wrote the audio element's `volume`. WebKit reproduced that the native element remained unpaused. iPhone Safari can ignore programmatic volume changes; both initial unlock and ambience changes also called `play()` regardless of the saved music setting. A first-tap mute even unlocked playback before applying the preference.

`audio.js` now centralizes background playback in `syncMusic()`. Daytime music and nighttime ambience share one controlled native `Audio` element; the source audit found no independent music player or AudioContext elsewhere in the app. Muting sets `muted = true` and calls `pause()`, rather than relying on volume alone. Unlock, source changes, configuration updates, and late play-promise completion all respect mute. Voice completion cannot unpause the music. Unmuting resumes the selected source at the remembered level in the user gesture.

The bottom-right control now acts on pointer release and ignores the ensuing compatibility click, while preserving keyboard activation. Its existing pixel on/off icons, off styling, accessible label, and `aria-pressed` reflect the effective setting. Explicitly enabling music clears a saved global mute so the control cannot show enabled while remaining globally silent. Settings are applied before unlock, saved in the existing localStorage namespace, and restored on load. A saved mute makes no music `play()` attempt, even after later scene/ambience changes.

Three iPhone 13 WebKit tests observe real native audio elements and delegate to their real `play()` methods, without mocking playback. They verify actual playback before muting, `paused === true` after the tap, no subsequent play attempts while muted, reload persistence, immediate unmute, first-gesture mute, pixel state, keyboard activation, and restoration of a custom level/global-mute preference. Audio unit tests additionally simulate ignored volume writes and a play promise resolving after mute.

## Regression Coverage

`tests/hotfix-webkit.cjs` covers fresh startup; v1 mid-story, completed-garden, active-review, and broken-review saves; reloads after migration; a completed garden with zero due words; leaving an active review without changing cards; malformed feedback; an injected review-render failure; normal one-word review completion; and replacement of a real installed old worker followed by offline startup. Exit assertions check visibility, viewport bounds, hit testing, and actual touch taps. Uncaught page errors fail the tests.

The story-first regressions import a synthetic founder JSON file containing **120 overdue words**, an old review, and stale unlock flags through the real file-import UI. One Continuer tap reaches the first home line without grading a card. Real UI interactions then traverse every intervening scene, including the cat game and key handover, without a review interruption. The rooftop test submits eight wrong answers, checks the exit throughout, confirms there is no ninth question or automatic follow-up queue, verifies at least 113 imported cards remain byte-equivalent, and explicitly opens optional review after the story. A separate fresh-profile walkthrough exits the first review with zero answers and reaches the next story scene without changing cards.

`tests/modules.test.cjs` also checks 120 due words, bounded retries/fillers, JSON session resume, lower/oversized budgets, preserved due records, and availability of the remaining words to ordinary optional review.

`tests/sw.test.cjs` exercises installation, reload-mode precaching, failed installation, cache cleanup, scope isolation, first-install versus upgrade refresh, non-blocking navigation, cache-first consistency, and offline fallback.

The existing browser regression assertions were updated only where the requested entry policy changed behavior: growth reveal is entered through Pause / Jardin, and imported cursor migration is still checked before Continuer explicitly starts at home. `SCREENSHOTS_OUTPUT` allows verification artifacts to go to a temporary directory rather than overwriting checked-in captures.

## Verification

All of the following passed:

- App unit suite: **149 tests** (including 13 audio tests, 16 worker tests and 17 module tests).
- Repository unit suite: **292 tests**.
- iPhone 13 WebKit hotfix suite: **16 tests**, zero uncaught page errors.
- Existing mobile and desktop browser regressions: **758 assertions**, zero failures/runtime errors.
- Existing complete mobile and desktop UI walkthroughs: **2,636 assertions**, both 53-scene stories completed, zero failures/runtime errors.
- Browser portability checks: protected legacy imports and fully offline reload passed.
- Content validation: 53 scenes, 305 vocabulary records, 797 import aliases, 24 registered French strings.

Commands from the repository root (Playwright was already available under `/tmp/kilo/node_modules`; WebKit and its Linux dependencies were installed there for this run):

```sh
npm --prefix app test
npm test
NODE_PATH=/tmp/kilo/node_modules npm --prefix app run test:webkit
NODE_PATH=/tmp/kilo/node_modules SCREENSHOTS_OUTPUT=/tmp/kilo/music-mute-regressions SCREENSHOTS_PHASE=regressions node app/screenshots.cjs
NODE_PATH=/tmp/kilo/node_modules SCREENSHOTS_OUTPUT=/tmp/kilo/music-mute-walk SCREENSHOTS_PHASE=walk node app/screenshots.cjs
NODE_PATH=/tmp/kilo/node_modules node app/portability.cjs
npm --prefix app run verify:content
```

On another machine, make the `playwright` package available to Node and run `playwright install --with-deps webkit` before `npm --prefix app run test:webkit`. Like the existing screenshot/portability runners, this is optional browser-test tooling, not an app runtime dependency. WebKit emulation is not a physical-device Safari test.
