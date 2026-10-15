# Known Issues And Validation Limits

Snapshot: 2026-10-15, after the final post-language-approval verification. This is a list of current limitations and unverified boundaries, not a list of already completed features.

## Validation Boundaries

- Final automated checks pass: 94 unit tests, 285 screenshots, 4,046 browser assertions, two full 53-scene UI walkthroughs, and separate exporter/import/offline-reload checks. The screenshot report records matching source hashes with no changes during capture. These checks do not remove the physical-device and real-save boundaries below.
- No physical iOS device audio-quality or installed-home-screen migration guarantee is made. Browser automation does not establish voice availability, pronunciation quality, silent-mode behavior, autoplay policy, download UX or actual storage-context accessibility on the founder's phone.
- Save tests use synthetic documented-schema fixtures. No founder save or sanitized real export has been tested, and no claim of successful real-data migration is made. Unknown legacy IDs are retained and reported rather than guaranteed to become active review items.

## Audio And Storage

- Most new Day 8 lines still need human recordings. Playback falls back to an installed local French voice and then text. Missing clips can produce expected resource failures; a device without a suitable voice still has written support, not equivalent listening practice.
- Service-worker installation caches the core, not the entire audio library. Media warms on successful playback fetches, but Range responses are currently not cached. Previously unplayed or range-only clips may be unavailable offline. `file://` can use local repository audio but has no service worker.
- Safari and an iOS home-screen app may not share storage. The read-only exporter cannot cross that boundary just by using the same URL. If the original installed context cannot open it, an existing export or manually downloaded Jinyi sync file is needed; the frozen old app is not modified to add navigation.
- Saves, writing and image notes share finite browser local storage. Quota/disabled-storage warnings require exporting progress; local storage is not a durable cloud backup. Four image attachments can still consume substantial space. `file://` storage persistence is browser-dependent.

## Deliberate Limits

- Feedback is a local queue plus JSON/image export, **not cloud upload**. Nothing reaches `a411-sync/feedback` automatically. Sync writes and any token-bearing integration remain deferred until separately approved.
- The offline writing check offers a learned-pattern reference, not LanguageTool, a grammar checker or an assessment of arbitrary French prose.
- A very sparse imported review pool can shorten the retry gap when no other practiced item is available, and may lack a suitable semantic distractor. The engine does not invent vocabulary to conceal that shortage.
- Some long mobile transcript, hint and utility panels require scrolling to reach their controls. The screenshot runner includes companion control-area captures; being reachable by scrolling is not the same as every control fitting above the initial fold.
- The content compiler currently enforces the specific Day 8 sequence. Day 9 can reuse the modules but still needs authored data, chapter selection/manifest wiring and chapter-specific validation. It is not already a playable second chapter.
