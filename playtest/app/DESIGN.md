# Day 8: Le basilic

Implementation notes, 2026-10-15. Read against `docs/BRIEF_DAY8.md`, `docs/INHERIT_FEATURES.md`, and the subsequent user approval of the voicemail, four chats, and revised ending. The later approval supersedes the brief's provisional language and older ending.

## Running Locally

Open `app/index.html` directly with `file://`, or serve the repository root with any local static host and visit `/app/`. For example, from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/app/`. Python here is only an optional static file server, not an application backend. Playing needs no Node installation, npm install, bundler, build, CDN, account, or external API. There is no public deployment.

Keep the repository layout intact. The app is a fresh implementation, not a copy of the old game shell, but it deliberately uses unchanged `../audio/...` files, the supplied `docs/day08_assets/audio_night/night_01.mp3`, and the approved read-only `../js/conjugate.js`. Serving only the `app/` directory would hide the sibling assets. Root `index.html`, `js/`, `css/`, audio, and source data are frozen; this work does not rewrite them. The later asset-path instruction takes precedence over the brief's earlier audio-copy suggestion.

`file://` can play the repository's local audio files. It does not support service-worker installation, and local-storage behavior varies by browser. The local static host gives a stable origin and, on localhost, service-worker support. Neither path accesses the old hosted game's storage automatically.

## Design Decisions

- The scene is the primary surface: pixel art, restrained warm lighting, system sans-serif controls, and a thumb-reachable action panel. Glosses are requested rather than printed below every French line.
- Martin's plant and watering can start in the kitchen. The basil becomes the roof plant after the key and planting sequence. Martin's plant does not move upstairs.
- The cat game is a second presentation of the garden engine, not a separate quiz or scheduler. It has a six-answer budget, expressive reactions, and a safe catch rather than breakage or punishment.
- First watering is a three-second hold. The water line plays underneath it, followed by the basil review card; it is not another dialogue step.
- A small collection of scene kinds replaces the old one-off renderers, walking hub, hard-coded watering quiz, and XP toast. No self-rating, streak pressure, leaderboard, or real-time plant growth is introduced.
- Local constrained-answer rules replace network or LLM grading. A light offline writing desk does not pretend to reproduce LanguageTool.
- Data is preserved rather than retranslated. French display typography is normalized separately: curly apostrophes and U+202F narrow no-break spaces before `? ! : ;` and inside guillemets.

## Modules

All runtime modules are classic scripts so direct file opening needs no module fetch or build. The engine, save adapter, and language helpers also expose CommonJS APIs for Node tests.

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css` | Static shell, responsive panel/navigation, accessible controls and reduced-motion styling |
| `app.js` | View transitions, story actions, DOM input, persistence coordination and isolated developer preview |
| `art.js` | Fresh canvas scenes, recognizable characters, action timing, water/cat feedback and projected hotspots |
| `audio.js` | Existing recordings, optional drop-in recordings, local French TTS, text fallback and mixer |
| `language.js` | French typography, constrained-answer normalization, contextual accepted answers and canonical feedback |
| `content.js` | Authored story data, vocabulary projection, lookup, audio map and validation/compiler |
| `data/inherited.js` | Generated data-only snapshot of inherited vocabulary, glossary, grammar, lexicon, lines and source metadata |
| `engine.js` | Shared FSRS-5 review queue, grading, daily scheduling guard and pure growth settlement |
| `save.js` | New save namespace, read-only Jinyi migration, explicit legacy import, validation and export |
| `export.html`, `export.js` | Read-only old-format exporter without modifying the frozen game |
| `sw.js`, `manifest.webmanifest` | Local-host/installable shell support and app-scoped offline cache |

The old game monolith is not loaded. The offline conjugator is the explicit approved exception to fresh runtime code, loaded from `../js/conjugate.js`.

## Screens And State

The UI's screen states are `entry`, `story`, `garden`, `review`, `reviewdone`, `catdone`, `wordbook`, `lookup`, `settings`, `import`, `more`, `grammar`, `conjugation`, `notes`, `writing`, `atelier`, `end`, `reveal`, and `evening`.

Story state includes line/focus, pause-to-guess/reveal, point-at-object, reply/choice with canonical feedback, two short stairwell walks, voicemail with transcript and letter feedback, four chats with hint/recast feedback, morning watering, cat review, first-watering hold, and the facade ending. Review exposes R1/R2/R3/P1/P2 before-answer and feedback states. Utility screens include import success/refusal/report, collected-word state, grammar collection, and audio/storage-unavailable support.

Persistent state lives only under `a411app.v1.state`:

| Field | Meaning |
| --- | --- |
| `cards` | FSRS memory by `wordId|modality`, including due dates, stability, difficulty, lapses and history |
| `words`, `customWords` | Met/collected/introduced status, collection time, encounter scenes and custom glossary/grammar metadata |
| `days` | Local-date introduced, attempted, due and reviewed item lists |
| `growth` | Settlement date, hidden care/stages, visible `shownStage`, conditions and reveal pacing |
| `story` | Current scene index, choices/replies, inherited Day 7 band, roof/key/plant flags and completion |
| `appSession` | In-flight shared review queue, current exercise, feedback and return destination |
| `settings` | Chinese/English help language, mute, music, voice and effects levels |
| `grammar`, `writing`, `notes` | Saved patterns, local writing and queued playtest notes/images |
| Import metadata | Reports/history and raw unknown records retained for later mapping |

Transient UI state includes open lookup, typed/chunk input, gloss/transcript visibility, hold timing, and current panel. `?dev=1` exposes the Atelier on an in-memory preview with real-save writes disabled. It can jump scenes, preview exercise types, and advance a simulated local day. This is not a second player profile.

## One Review Engine

Garden, cat, and first watering call the same `createSession`, `current`, and `answer` functions. Cards retain listening, reading, and production modalities, but the scheduling guard is per item per local calendar day across all views and modalities. Only its first attempt updates FSRS; retries and later practice still give feedback without rescheduling that day's item. Imported same-day reviews also count.

FSRS-5 uses the published 19-weight defaults, target retention 0.9, without fuzz or short-term scheduling. New items begin in recognition; stability moves through R1/R2, R2/R3, then R3/P1/P2. Rare words stay recognition-only. Missing recorded dictation audio is marked for degraded/cloze support. Incorrect answers lower the retry level; ordinary retries wait three intervening cards, using seen practice fillers when necessary. A genuinely sparse pool may need a shorter gap rather than a dead end.

Grading is automatic: wrong is Again; correct but slow or an allowed one-letter production typo is Hard; otherwise Good. `engine.js` keeps the assumptions in `CONFIG`: tap 8 seconds, order 18 seconds, type 15 seconds, maximum 10 new items. Due items precede new items; the retained day's due load lowers that cap across sessions, not just within one queue. First watering can be non-scheduling recognition practice when introduction is unavailable. The cat never introduces Week 2 words.

Recognition distractors come from seen words with matching part of speech/gender, prioritizing a semantic peer and excluding known homophones for listening. Full-sentence audio follows each answer. The current exercise and feedback survive save/reload instead of changing on a rerender.

## Morning Growth

Answering changes memory and water animation, not plant stage. `settleGrowth` clones its input and settles once per local date when the player enters via Continue; it is not a real-time timer or a fixed-hour alarm. Catch-up is bounded to seven missed days and uses available historical memory rather than retroactively applying today's learning.

Hidden care combines mastery, meaningful due-day consistency and introduced coverage: `care = 0.6*M + 0.25*C + 0.15*V`; accumulated growth adds `max(0, care - 0.3)`. Stage thresholds are 1/3/6/10/15 with mastery gates and fixed per-pot variation. Stages never decrease. More than half the pot's words overdue three days causes wilting; fourteen days causes dormancy, not death. Recovery is settled later.

At most one pot gets a reveal per morning, with at least two days between reveals for that pot. Rendering uses persisted `shownStage`, not an extra increment or an unrevealed pending stage. Future import-only vocabulary does not dilute active pot coverage until encountered. Thresholds and FSRS internals are not player-facing scores.

## Approved French

The voicemail and all four Coloc 411 exchanges are user-approved content, not placeholders or pending replacement text. `FRENCH_FOR_NENG.md` remains the content worker's language register; this documentation does not edit it.

The voicemail is exactly:

> Salut, c’est Noé ! Je suis au travail. Ce soir, chez Madame Lefèvre ? À six heures, en bas. Six heures, d’accord ? À ce soir !

Only `six heures` is the dictation target. `travail` and `en bas` are listening-only; entering `en bas` or appending it to the answer is not accepted as the time answer. Accepted time variants include `6 heures`, `à 6 heures`, and `à 18 h`, with canonical feedback showing `À six heures.` and the accented full line.

| Exchange | Prompt | Approved responses / accepted shorthand |
| --- | --- | --- |
| Before evening | Le basilic, on le met où ? | Dans la cuisine. / Sur la table. |
| Before evening | On descend à quelle heure ? | À six heures.; contextual numeric variants above |
| Before evening | On apporte quelque chose ? | Un peu de basilic.; also `du basilic` |
| After dinner | Le jeudi, chez elle… tu veux ? | Oui, je veux bien. / Oui, d’accord.; also `oui` |

Case, accents, punctuation and spacing are normalized for grading, not echoed as the canonical spelling. The alternate location retains its meaning: `sur la table` displays `Sur la table.`, not the other answer. Time aliases are exercise-specific, not a global replacement of six with eighteen. The fourth exchange is a real scene after `d10_lef_allez` and before `d10_noe_porte`, bringing the current compiled sequence to 53 scenes.

The exact revised hook is:

> Sur le toit, un jardin qui se réveille. En bas, une lampe qui reste allumée.

## Data And Day 9

A scene has `id`, `scene`, `speaker`, `text`, `zh`, `en`, and `kind`. Kinds are `line`, `focus`, `point`, `reply`, `choice`, `walk`, `voicemail`, `chat`, `cat`, `water`, and `end`. Optional fields carry `wordIds`, `grammarIds`, `audioId`, `options`, `accepted`, canonical-answer maps, hotspots, story flags, lighting, action timing, and watering underlay. Words carry stable IDs, original French/glosses, grammatical/semantic metadata, pot/week, story sentence, cloze/answer/chunks, audio IDs, recognition-only policy, and legacy aliases.

`compile()` checks IDs, supported kinds/scenes, translations, typography, word/grammar references, canonical lines, exact ordering and Day 8 continuity. It rejects missing chats, repeated empty-pot beats, an extra water-line step, and changes to the approved hook.

To add Day 9 without inventing another interaction engine:

1. Author scene and word records using the existing kinds, with stable IDs and zh/en glosses. Add accepted alternatives and canonical feedback explicitly.
2. Supply a chapter sequence/manifest and extend the compiler's chapter-specific validation. The current compiler deliberately locks Day 8's ordered IDs; it is not already a general multi-day loader. Day-selection wiring is a small future extension, not implemented Day 9 content.
3. Reuse the same review/save/growth APIs and existing views. Keep player state IDs stable and avoid rewriting inherited records.
4. Add line-ID recordings to the drop-in map/folder, update the language register through its owner, and add content/order and browser-state checks.

`tools/extract-data.mjs` evaluates the frozen source in an offline Node VM and writes data only to `data/inherited.js`. It extracts the glossary's 2,347 lemmas, original deck/word data, grammar and lexicon fields, canonical script and tagmap, and existing audio paths. Runtime does not evaluate those legacy source modules. Each input's SHA-256 is recorded at `A411.INHERITED.sources`; inherited French and translations are not regenerated. The generated bundle fingerprint at this documentation snapshot is:

```text
bd6406606197b71ba3cbba753a77cf166a98736f97788da15c34a16838946f2d  app/data/inherited.js
```

Check reproducibility from the repository root with `node app/tools/extract-data.mjs --check`. Regeneration is a maintainer tool, not a prerequisite for playing. The generated bundle retains its source attribution, including Lexique 3.83 / CC BY-SA 4.0.

## Save Portability

Automatic detection reads exactly `a411.p.jinyi.learn`, `a411.p.jinyi.story`, and `a411.p.jinyi.uiLang`. It does not enumerate storage, follow the active-profile pointer, or read Yuechao's keys. Import is explicit and source keys are never written or deleted. Only the new app namespace is saved. Protected-profile records, including nested wrappers, are refused; unnamed legacy data requires the player's explicit ownership checkbox. Saving also inspects the existing destination in the new namespace: a protected record incorrectly placed there cannot be overwritten by the fresh fallback after a refused load.

The available paths are:

1. Read-only same-origin Jinyi detection, with word/card counts before import.
2. `app/export.html` in the old origin and storage context, offering copy/download without changing the old game. Selected unnamed legacy keys require separate explicit confirmation.
3. File or paste import, including selected `sync/jinyi/learn.json`, `story.json`, and `carnet.json` envelopes downloaded outside the app. Multiple files can be selected together.
4. Fresh fallback with source-grounded Week 1 words met and seeded memory, leaving Week 2 encounters to the story.

Mapping preserves supported modality memory, stability, difficulty, due dates, lapses, suspension and collection timestamps. Unknown items remain raw and appear in the report instead of being silently discarded. Reimport is intended to be idempotent and not overwrite newer practiced memory; custom glossary and grammar metadata can round-trip.

Origin means scheme, host and port, not merely the URL path. In addition, an iOS home-screen web app may have a storage context separate from Safari. Opening the exporter in a Safari tab does not extract an isolated installed app's save. The exporter must actually run in the original storage context; if that cannot be reached without changing the frozen app, use an existing export or the manually downloaded Jinyi sync files. A localhost or `file://` app cannot bypass this boundary.

There is no runtime private-repository fetch, GitHub token, cloud restore service, or sync write. Future write sync requires separate explicit approval. Import tests use synthetic schema fixtures, not a claimed test of the founder's actual or sanitized save.

## Settings, Audio And Offline

Chinese is the default help/UI language, with English selectable; French learning targets remain French. Settings persist on this device: mute and independent music/voice/effects sliders. Audio unlock follows a user action, music ducks under speech, and a speaker button replays the line. Keyboard controls include 1-4, Enter/Space, Esc, and Space for the watering hold; motion follows the system reduced-motion preference.

Audio resolution tries an explicit/original map path, then `recordings/<lineId>.mp3`, then an installed local French speech voice, then written support. Existing music, SFX and recordings stay at their repository paths. New-line recordings can be supplied later without replacing the old files or rebuilding. Only the allowed relative recording directories are played; imported metadata cannot supply a remote URL or directory-traversing path. The app does not use a network TTS service or claim that every device has a French voice.

On a supported local static host, `sw.js` precaches the core app shell and approved conjugator. Media is cached on its first successful playback fetch rather than all audio being downloaded on install. Specifically, the current worker stores successful full responses, not Range requests; browser range behavior can prevent a clip from entering that cache. Unplayed or uncached media is not guaranteed offline. Direct `file://` playback uses the repository files rather than this cache. The worker is scoped to `app/` and only removes its own older cache versions, not the frozen game's caches.

## Writing And Feedback

The writing desk saves and exports text locally. `Vérifier` currently supplies a learned-pattern reference, not a general grammar correction or a network LanguageTool request. Constrained story/chat answers have their own deterministic rules.

Playtest Note queues text with up to four images locally, including an optional capture of the current canvas scene. Selected image files are limited to 1 MB each. Export downloads a JSON bundle for manual sharing. **NO CLOUD UPLOAD** occurs: no token, private-repository connection, automatic feedback delivery, or sync write. A saved note is not a sent note. Local-storage capacity remains a limit, especially with image data; export is the portable backup.

## Verification

From the repository root:

```sh
npm --prefix app test
npm --prefix app run verify:content
node app/tools/extract-data.mjs --check
npm --prefix app run screenshots
npm --prefix app run portability
```

The package declares no dependencies and no build script. Unit tests and content verification use Node built-ins. The optional screenshot and portability runners separately require Playwright and Chromium to be available in the tooling environment; they are not runtime dependencies. In the existing test environment, `NODE_PATH=/tmp/kilo/node_modules npm --prefix app run screenshots` and `NODE_PATH=/tmp/kilo/node_modules npm --prefix app run portability` locate that tooling. The portability check exercises the real read-only exporter and same-origin import with synthetic records, guards old/protected storage access, and reloads the installed app shell offline.

Tests cover shared scheduling, grading/escalation/retries, local-day caps, cat identity, pure growth, import/refusal and round-trips, plus approved language and typography. The browser runner covers 390x844 and 1280x800 views, interactions, UI walkthroughs, file opening, and short cat/first-water recordings. Its `screenshots/report.json` records source hashes and results; a debug screenshot alone is not proof of an end-to-end playthrough or installed-iOS behavior.

Final verification on 2026-10-15: **94 Node tests passed**, including another pass under `TZ=Europe/Paris`. Content validation and extraction reproducibility passed. The authoritative browser run produced **285 PNGs and 4,046 passing assertions**, with zero failures, runtime errors or horizontal-overflow failures. It completed two full 53-scene UI-only walkthroughs, two `file://` offline checks, and refreshed `cat.webm` and `first-watering.webm`. Source hashes, including the final audio module, remained unchanged during that run; no obsolete PNGs remain outside its report. The separate portability runner passed the actual read-only exporter, synthetic same-origin Jinyi import with protected-key guards, and service-worker offline reload. These results supersede the original 66-test / 260-screenshot baseline. See `KNOWN_ISSUES.md` for remaining validation boundaries.
