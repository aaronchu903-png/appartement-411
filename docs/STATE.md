# Project State

Working record. Older sections below are kept as history (including v0.1.1–v0.1.3). The table is the current snapshot.

Last updated: 2026-10-08 ~16:20 PT (America/Vancouver). **v0.2.0** adds two profiles, FSRS-5 reviews, a bilingual UI, and a public starter deck. Day 1 story and Qwen3-TTS clips from v0.1.3 stay.

| Field | Current record |
|---|---|
| Stage | 01, plus a daily-study layer (v0.2.0) on the same static app. |
| Stable version / entry point | **v0.2.0**, Day 1 content `d1-2026-10-08c`, deck `deck-2026-10-08`, save schema v1 (story) + learn schema 1 (separate). Entry: `index.html` or `dist/appartement-411.html`. Live: https://aaronchu903-png.github.io/appartement-411/ |
| Latest artifact | Source `/workspace/appartement-411`. Private seed is **not** in the repo: `/workspace/jinyi-french/jinyi-seed.json`. |
| Tool/account capabilities | Box: Node 20, Chrome headless, Python 3, ffmpeg, Qwen3-TTS in `/home/box/tts/venv-q` (weights already cached). `gh` authenticated for the Pages repo. USD 0. |
| Deployment | Standing permission: small updates and this version go to the same preview URL. |
| Save / restore | Per profile, this browser only. No cross-device sync. Export/import per profile. Legacy `a411.save` / `a404.save` is adopted once into the profile the player chooses (backup first). |
| Learning | FSRS-5 (19 weights, short-term off) per item and per modality. Yuechao: skippable placement, default A1. Jinyi: track all; personal intervals only after importing the private seed. |

## Next action

1. Founder and Yuechao each open the preview on a phone: pick a profile, try one review, toggle English, and (Jinyi only) import the private seed from Files.
2. Listen to a few deck clips on the phone. Native-speaker review of the French deck is still open.
3. Day 2 story is still not built. Story buttons and the settings sheet are still Chinese when the UI language is English (study screens, home chapter labels, and Day 1 glosses do switch).

## Current blocker or decision

**Resolved 2026-10-08:** founder approved GitHub Pages (option A below). The decision text is kept for the record.

**One bundled decision for the founder:** approve a free, phone-reachable preview location for v0.1.0 (this is "first exposure"). Options at $0, none set up:

| Option | What it needs | Privacy | Notes |
|---|---|---|---|
| A. GitHub Pages from a repo in your GitHub account (recommended) | You approve + connect GitHub once (or create the repo yourself); we push the static folder; Pages serves `index.html`. | GitHub Free: Pages sites are **public** (anyone with the URL; `noindex` is set but not access control). The repo can be private only on paid plans for Pages. The game contains no personal data; saves stay on your phone. | Stable URL, rollback = previous commit, repeat low-risk updates can be pre-approved. |
| B. Cloudflare Pages / Netlify free tier | New account connection (or your existing one) + upload. | Public-by-URL (unlisted). | Same static folder; similar rollback. |
| C. No hosting: send the single HTML file to your phone | Nothing new. | Fully private. | Works on Android Chrome; iPhone unreliable; updates mean re-sending a file. |

Proposed: **A** (or C immediately on Android while A is pending).

## Latest delivery and evidence

**Historical artifact (v0.1.1, not the current build): v0.1.1 / content `d1-2026-10-08b` / schema v1.** First delivered artifact was v0.1.0 / `d1-2026-10-08a`. Day 1 "Bienvenue chez nous": skippable baseline → doorway (Camille, Noé; speaker tag + replay) → "Tu t’appelles comment ?" (nickname / sentence / skip) → plant corner (water once or later; pause) → Camille leaves, Croissant, secrecy choice (keep / decline) → 4-trial neutral recognition check → diary (factual chronicle + optional verbatim journal) → end. Days 2–7 listed as "尚未开放" with no buttons. Title screen also offers a once-per-day plant quick visit.

**Environment of checks:** headless Google Chrome 154.0.8037.57 on the Linux box, 390×844 @2x mobile emulation (touch), plus 375×667 for the alternate path; `file://` URLs. Unit tests: Node 20 `node:test`. v0.1.0 run (2026-10-08 ~12:02 PT): `npm test` 18/18, `npm run e2e` 63/63. **v0.1.1 re-run (2026-10-08 ~13:00 PT): `npm test` 25/25 pass; `npm run e2e` 72/72 pass** (`evidence/e2e-results.json`), including rename migration checks.

| Gate | Result | Evidence / limits |
|---|---|---|
| Usable entry | **Passed locally; phone access untested.** | Version visible on title/topbar/save panel/summary. Single-file build plays and resumes from `file://` with zero network requests. Local-only: not phone-accessible until the decision above. |
| Mobile presentation | **Passed in emulation; real phone untested.** | No horizontal overflow at 390 and 375 px; every visible control ≥44 px (name, dialogue, probe, diary screens); reduced-motion and large-text settings; French accents + Chinese render with system CJK fonts. Screenshots `evidence/01…16-*.png`. |
| Audio | **Fallback path verified; real voice untested on phone.** | Headless Chrome reports no voices → app shows "🔇 … 阅读模式 … 不算听力练习", reveals French text, records `audioStatus: unavailable`, modality `reading`. With a simulated fr-FR voice: auto-play on tap, replay counted (`replays: 1`), `audioStatus: played`. Note "played" = the speech engine reported completion; a muted phone can still report it. |
| Complete interaction | **Passed (emulation).** | Main path (keep secret, water, sentence answer, help used at support level 1) and alternate path (wave, skip name, water later, decline, all "unsure", empty journal) complete; chronicle differs correctly; Camille knowledge unchanged in both; pause mid-scene; injected runtime error shows a recovery sheet and play continues at the same step. |
| Persistence | **Passed (emulation).** | Reload after mid-scene pause resumes the exact line ("Ta plante a soif."); reload mid-probe resumes trial 3/4; after completion reload keeps journal verbatim (incl. leading spaces, newline, emoji), plant state, choice, 20 learning attempts; double-tap watering counted once; 48 h later the plant shows thirsty (recoverable). |
| Recovery | **Passed (emulation + unit).** | Export JSON → import into a fresh browser profile is lossless; truncated JSON and structurally invalid saves are rejected with the existing save byte-identical; failed write keeps the previous save; corrupt main save recovers from the temp copy or is backed up before a fresh start; v0 test save migrates on load with the original backed up first, journal verbatim, old attempts typed `unknown` (not relabelled). Max 5 automatic backups, restorable from 存档. |
| Learning validity | **Passed (emulation + unit); content not native-reviewed.** | Probe: neutral frame (no faces/pointing/name highlight), French text absent from the DOM until requested, identical option styles, randomised order. First-listen / replay / text-help / reading-only recorded and summarised separately; any shown text ⇒ `supported`. All attempts carry target, content version, modality, audio status, visible support, replays, response, result type, context, time. Review entries (target, modality, recent evidence, next encounter, support recommendation) generated. See `docs/CONTENT_REVIEW.md` for flags. |
| Privacy | **Passed.** | Summary excludes journal text and nickname by default (only entries the player marked "允许分享" and only when the box is ticked); no network requests; test data is synthetic; no secrets in the artifact. |
| Improvement | **In progress (first cycle).** | Founder feedback 2026-10-08: v0.1.1 satisfying; the iPhone French voice sounds robotic, and voice quality and pronunciation matter most. Response: v0.1.2 (device-voice ranking, picker, speed, tips) verified in emulation only; pre-rendered clip candidates built and ASR-checked. Not yet confirmed on the founder's phone. |

**Known limitations / honest gaps**
- Real French voice not heard on any device; iOS Safari has known speechSynthesis quirks (first utterance after `cancel()` can be dropped → app times out after 5 s, shows text, replay available). Voice quality depends on the phone.
- Pixel art is a first, simple original set (small 96×64 scenes; gestures like "hand on chest" / "finger to lips" are only a few pixels). Adequate for v0.1, Visual pass needed later.
- Probe covers distinguishing only; the curriculum's "or give an appropriate response" inside the probe is not implemented (the free name answer covers response separately).
- Exposure records exist for every heard line; support-level adjustment is computed as a recommendation only (per target + modality); it does not yet auto-change presentation in Day 1.
- No speech capture (by design; spoken production unverified).
- Episode length not measured with a real player (auto path takes seconds; intended 10–15 min reading/listening).

**Recovery / delivery status:** stable version v0.1.1 committed in the local git repo and published to the preview. Rollback = previous commit / previous zip (v0.1.0 build kept as `tests/fixtures/legacy-v0.1.0-appartement-404.html`).

## Decisions that change the plan

- 2026-10-08 (CTO, reversible): audio = device voice (Web Speech API) + reading fallback. Pre-rendered Piper clips rejected for now (one voice unintelligible by ASR check; the intelligible one has an unclear research-licence ancestry). Details in `docs/ASSETS.md`.
- No founder decisions recorded yet.

## Preview deployment (2026-10-08, ~12:45 PT)

- Founder approved (chat, 2026-10-08) a free GitHub Pages preview.
- gh CLI on the box logged in as `aaronchu903-png` via device flow (scopes: repo, workflow, gist, read:org).
- Public repo was `aaronchu903-png/appartement-404` (v0.1.0), renamed 2026-10-08 to `aaronchu903-png/appartement-411`. It contains ONLY the built single file (`index.html` = `dist/appartement-411.html`), `.nojekyll`, README. Spec docs, tests, evidence and source stay local in `/workspace/appartement-411` (local git) and are NOT published.
- Preview URL: https://aaronchu903-png.github.io/appartement-411/ — served file byte-identical to local dist (cmp). Headless Chrome at 390x844 loaded it with 0 page errors (evidence/19-live-pages-411-390.png). v0.1.0 evidence: evidence/17-live-pages-390.png.
- Deploy dir: `/workspace/a411-pages` (git, branch main). `/workspace/a404-pages` is a symlink to it. Rollback: `git revert`/reset to previous commit there and push.
- Real-phone audio, real-phone persistence: still untested; awaits founder play.
- 2026-10-08 12:50 PT: Founder granted standing permission for small preview updates (bug fixes, text, new day) to the Pages preview; notify after each publish. Spend, new platforms, wider exposure still need approval.

## Rename (2026-10-08 ~12:52 PT, founder decision in chat)

- Whole project renamed from **Appartement 404** to **L’Appartement 411** (typographic apostrophe U+2019 everywhere in UI and docs; slugs stay ASCII: `appartement-411`).
- Task IDs A404-001/002/003 → **A411-001/002/003** (same tasks; "formerly A404").
- App version **v0.1.0 → v0.1.1**. Content version **d1-2026-10-08a → d1-2026-10-08b**: the only content change is the apartment number in Chinese narration and the pixel door plaque (404 → 411). French lines, targets, probe items and help are unchanged, so learning evidence stays comparable.
- Save schema stays **v1**. Storage keys moved `a404.save` / `a404.save.tmp` / `a404.backup.*` → `a411.*`. On load, when no new save exists, the old key is adopted: verbatim backup `a411.backup.<time>.pre-rename-a404` first, then a verified write to `a411.save`; the old keys are never written or deleted (a failed write leaves the original in place and retries next open). Old exported `appartement-404-save-*.json` files import unchanged. Because both Pages paths share the origin `aaronchu903-png.github.io`, a save made on the old URL is adopted by the new one.
- Folders: `/workspace/appartement-411` and `/workspace/a411-pages`; `/workspace/appartement-404` and `/workspace/a404-pages` are symlinks. Original spec pack renamed `/workspace/upload1/LAppartement_411` (symlink at `Appartement_404`), and zipped to `dist/LAppartement_411_docs.zip`.
- Verification (2026-10-08 ~13:00 PT): `npm test` 25/25 (7 new rename tests), `npm run e2e` 72/72 including the real v0.1.0 build writing `a404.save` and v0.1.1 resuming the exact line, plus old-file import via the 存档 panel. Screenshots evidence/01 (title shows 411), evidence/18 (resumed save, door plaque 411).
- Deploy (2026-10-08 ~13:00 PT): `gh repo rename` appartement-404 → **appartement-411**; description "L’Appartement 411 preview build", homepage set; Pages stayed enabled (main, /) and rebuilt on push. **https://aaronchu903-png.github.io/appartement-411/** returns 200, sha256 `60b2ba33…caab` byte-identical to `dist/appartement-411.html`; headless Chrome 390×844: title/h1 "L’Appartement 411", footer v0.1.1 / d1-2026-10-08b, 0 page errors (evidence/19-live-pages-411-390.png). Live same-origin check: a v0.1.0 save placed under `a404.save` on that origin was adopted into `a411.save` with the old key untouched and the notice shown (test data then cleared).
- **Old URL** https://aaronchu903-png.github.io/appartement-404/ now returns **404** (GitHub does not redirect Pages after a repo rename). The old repo page github.com/aaronchu903-png/appartement-404 301-redirects to the new repo. Anyone with the old link needs the new one; their saves carry over because the origin is the same.
- Push note: git on the box has no credential helper configured; pushes use `git -c 'credential.helper=!gh auth git-credential' push` (no global git config changed).

## v0.1.2: first feedback-led improvement (2026-10-08, local only)

- **Founder feedback:** satisfied with v0.1.1. On iPhone (Safari, English UI) the French voice sounds robotic, and pronunciation and naturalness are what matter most.
- **Likely root cause:** v0.1.1 used the *first* fr-FR voice it was given. On iOS 17/18, Safari's voice list includes Eloquence voices (Jacques, Grand-mère, Grand-père, Rocko, Eddy, Flo, Reed, Sandy, Shelley) and novelty voices (Bulles, Cloches, Bonnes nouvelles…) tagged fr-FR. These are robotic by design and can come first in the list.
- **Change (commit `8143c60`, app v0.1.2, content `d1-2026-10-08b` unchanged, save schema v1 unchanged):**
  - French voices are now ranked and robotic/novelty voices are never auto-picked.
  - Camille gets the best female voice and Noé the best different male voice. If only one voice exists, both use it with a slight pitch difference.
  - 设置 has a voice picker for each character, with test lines and quality labels.
  - Speed can be set to 0.75 / 0.9 / 1.0. The voice and speed choices are stored per device in `a411.device.audio`, not in the save.
  - Platform-specific tips: on iOS, the English menu path with Chinese explanation.
  - Each attempt records the voice name, quality and rate that actually played (`audioVoice`), and the feedback summary shows them.
- **Honest limit:**
  - iOS Safari generally does **not** expose downloaded Enhanced/Premium voices to web pages (Apple Developer Forums thread 723503; Readium research). In some iOS 18 builds, downloading a better variant even removed the base voice from Safari.
  - The in-game tip says this plainly, so the device route can only reach "standard" quality on iPhone. Fixed recordings are the real fix.
- **Verification (headless Chrome 154, emulation):** `npm test` **35/35**; `npm run e2e` **84/84**. The new section B2 uses a simulated iPhone voice list:
  - Robotic voices are skipped. Camille=Marie and Noé=Thomas.
  - The override and the 0.75 speed persist across a reload and stay outside the save.
  - The iOS tip shows first.
  - Screenshot: `evidence/20-voice-settings-iphone.png`.
  - Builds: `dist/appartement-411.html` (122.3 KB) and `dist/appartement-411-v0.1.2.zip`.
- **Not done:** no real-iPhone check, and not deployed.

## Pre-rendered audio candidates (2026-10-08)

- `audio-candidates/` holds Day 1 (17 lines + 2 test lines) rendered offline at USD 0 with three permissively licensed engines:
  - Kyutai Pocket TTS (CC-BY-4.0 weights)
  - Qwen3-TTS 1.7B (Apache-2.0; synthetic designed voices)
  - Kokoro-82M (Apache-2.0; female voice only)
- Comparison set: `audio-candidates/compare/<engine>_3lines.mp3`, each with the same 3 lines.
- Checks: ASR with faster-whisper large-v3-turbo and naturalness proxy UTMOS. Results and provenance are in `audio-candidates/README.md`.
- No candidate is in the game yet.
- Human recording script plus permission template: `audio-candidates/HUMAN_RECORDING_SCRIPT.md`.
- Cloud free tiers were researched but not used (each needs a new account, usually with a card, so founder approval is required).

## v0.1.2 published (2026-10-08 ~15:20 PT)
- Device-voice improvement deployed to https://aaronchu903-png.github.io/appartement-411/ under standing permission; live file byte-identical to dist; npm test 35/35. Audio candidates (Qwen3-TTS, Pocket TTS, Kokoro) prototyped in audio-candidates/, not shipped; awaiting founder listening choice.
- 2026-10-08 ~15:16 PT: Background helper stopped: Cursor account reported no Grok Bot usage available. Work already on disk was complete (commit c9665a7). Usage/quota is now a real blocker for large work; no on-demand spend enabled (USD 0 policy). Voice sample page published at /appartement-411/voices/; awaiting founder choice.
- 2026-10-08 15:25 PT: Founder decision: use Qwen3-TTS (sample 1) for Day 1 fixed recordings. Next: integrate audio/d1/<lineId>.mp3 playback with device-voice then reading fallback (v0.1.3).

## v0.1.3: fixed Day 1 recordings (Qwen3-TTS), published 2026-10-08 ~15:33 PT
- Founder decision 15:25 PT: Qwen3-TTS (sample 1). App **v0.1.3**, content **d1-2026-10-08c** (audio presentation changed; French text, targets, probe items, help unchanged), save schema **v1** unchanged.
- `audio/d1/<lineId>.mp3`: 19 clips (17 Day 1 lines + `test_camille`/`test_noe`), ~170 KB, from `audio-candidates/qwen3-tts/mp3/`. Map in `js/clips.js`; `tools/build.mjs` inlines them as base64 data URIs (dist 354.7 KB, works offline from one file; played via blob: URLs).
- Playback (`js/audio.js` `playLine`): recorded clip via one shared HTMLAudioElement → device voice (v0.1.2 logic) → reading with visible "播放失败，已显示文字（阅读）". Replay replays the same clip. Speed 0.75/0.9/1.0 applies via `playbackRate` + `preservesPitch`/`webkitPreservesPitch`. iOS: element unlocked on first touchend/pointerdown/click/keydown; clips are started synchronously in the tap handler; play() rejection / error / no start within 4 s → fallback, never blocks 继续.
- Evidence: each attempt has `audioSource` = `recording:qwen3-tts` | `device:<voice>` | `none` (only played audio counts as listening); `audioVoice.source` too; `meta.audio.recordings` = {source, lines:17}; feedback summary splits plays into 录音 / 设备声音 / 旧版未记录来源. Old saves (no `audioSource`) load unchanged.
- Lines without clips: none of the spoken Day 1 lines. The only Day 1 French shown without audio is Camille echoing the player's nickname («<昵称> ! »), which was already text-only ("无语音：名字由你决定"); journal templates/help chips are text, never spoken.
- Credits: docs/ASSETS.md "Shipped Day 1 audio"; 设置 → 🎧 固定录音 shows "Voices: Qwen3-TTS (Apache-2.0), synthetic designed voices" plus 试听录音 Camille/Noé; title footer names it.
- Tests: `npm test` **41/41** (6 new: clip map covers every line id + files are mp3; audioSource field; v0.1.2 save import; clip plays with rate/pitch; rejected play → device voice; clip error + no voice → failed). `npm run e2e` **105/105** (Chrome 154; new C3: real mp3 playback logged with ended event, replay same clip at 0.75 with preservesPitch, settings test + credit, no reading banner, audioSource recorded, play() rejected → device voice, play() rejected + no voice → reading + not trapped, dist inlines 19 data URIs and plays via blob: from file:// with no external requests, real v0.1.2 build's save resumes at the exact line with old attempts kept verbatim). Older sections run with recordings switched off (`window.A411_NO_CLIPS`, test-only flag) so the device-voice/reading paths stay covered.
- Deploy: `/workspace/a411-pages` commit `fb03e97` (voices/ kept), pushed; https://aaronchu903-png.github.io/appartement-411/ sha256 `aeaa846e…f8d2` byte-identical to dist; headless Chrome 390×844: footer v0.1.3 / 08c, 0 page errors, `cam_bonjour` clip played (evidence/24-live-v013-390.png). Rollback: revert fb03e97 in a411-pages and push.
- Not verified: real iPhone Safari (unlock, silent switch, playbackRate/pitch quality at 0.75), native-speaker review of the recordings.

## Decisions that change the plan (2026-10-08 afternoon)

- ~15:51 PT: Founder: the next version must support daily French study for two people, **Jinyi** and **Yuechao**, with separate learning records and separate plans. Real progress and a forgetting-curve scheduler. No passwords.
- Yuechao’s level is unknown. First open: a short skippable placement from A0/~A1 to about B1, a few comparable items per band, stop a band after two misses, record the result as baseline (modality and support recorded). Skip → beginner A1. No penalty.
- Support language is per profile, remembered, toggled from the home screen (and used on the study screens): Chinese or English. French targets stay French. Every public deck item has a Chinese meaning, an English meaning, and a trigger note in both languages. Switching language must not change the learning record.
- Jinyi’s private notes stay off the public site. Personalisation is a seed file the player imports on their own phone.

## v0.2.0: two profiles, FSRS-5, bilingual study (2026-10-08)

- App **0.2.0**. Story schema stays v1. Learn record is a separate key `a411.p.<id>.learn`. UI language is `a411.p.<id>.uiLang`, outside the learn JSON.
- Profiles: Jinyi (track all, placement already known) and Yuechao (track starts A1, placement `not_started`). One shared phone or two phones. Honest limit shown in the app: local storage, no sync.
- Scheduler: FSRS-5, the 19 published default weights, `enable_fuzz` off, `enable_short_term` off, request retention 0.9, max interval 36500 days. Port of open-spaced-repetition/ts-fsrs **v4.7.1** (“FSRS-5.0”) and the FSRS-5 section of the awesome-fsrs wiki. Not FSRS-6 (21 parameters). Decay −0.5, factor 19/81. Ratings Again/Hard/Good/Easy. Suggested rating: correct with no help → Good, hint or missing accent → Hard, wrong → Again. The learner can override. Hints are never relabelled independent. Same-day Again is requeued in the session; the stored due date is still +1 day, so a missed day does not create a punitive backlog. Default caps: 20 reviews and 6 new cards (quick mode: 4 and 2).
- Deck `deck-2026-10-08`: **126** public items (A1 43, A2 59, B1 24). Life situations (Camille, Noé, the apartment, Montreal). Each item: French, Chinese, English, grammar tag, band, `noteZh`, `noteEn`. Exercise shapes: listen-and-choose, Chinese/English→French typed (accent-tolerant), cloze. AI-drafted French, not native-certified. No private notes in the deck.
- Grammar counts (items): present 11, introductions 7, location 7, passe-compose 7, search 6, directions 6, drinks 5, greetings 4, pc-imp 4, meilleur-mieux 4, passive 4, and smaller sets for imparfait, agreement, futur simple, dont, subjonctif, conditionnel, and the rest of the grammar map.
- Placement: 3 items × A1 / A2 / B1. Two wrong stops the band. Two right advances. Skip or fail A1 → track A1. Pass A1 → track A2. Pass A1, A2 and B1 → track all.
- Story attempts that match a deck id (`bonjour`, `salut`, `je_mappelle`, `tu_tappelles_comment`) update the same learn record. Exposure does not schedule. Listening without played audio is recorded as reading.
- Private seed (not published): `/workspace/jinyi-french/jinyi-seed.json`, kind `a411-personal-seed`. Built from the local grammar map (productive areas get longer intervals; recurring gaps come back sooner) plus example sentences from the local knowledge notes as private cards. iPhone: AirDrop or email the JSON into Files, then Progress → pick the file or paste it. A bad file is rejected before anything is written.
- Tests: `npm test` 52/52 (FSRS reference values, per-modality cards, no-backlog cap, profile isolation, v0.1.3 save still valid, seed validation). `npm run e2e` 116/116 at 390×844, including language toggle with an unchanged learn record, a missed card and hint, reload, and a separate Yuechao plan.
- UI language: study, placement, progress, and the home “today” card are fully switched. Day 1 glosses have English equivalents (`js/content.js` LINE_EN). Home chapter status switches. Story buttons, narration, and the settings/save sheets stay Chinese in this version.
- Deck audio: Qwen3-TTS, same designed Camille/Noé/neutral voices as Day 1, mono 32 kbps mp3 in `audio/deck/`. Device voice, then reading, if a clip is missing. Coverage is recorded in ASSETS.md after the render and the ASR check.

- Home-screen icon (2026-10-08): Croissant’s head, the same pixels as `js/art.js` (`tools/make_icon.py`). `icons/apple-touch-icon.png` 180×180, `icon-192.png`, `icon-512.png`, `favicon-32.png`, all opaque, nearest-neighbour. `manifest.json` name “L’Appartement 411”, short_name “Appart 411”, display standalone. The single-file build inlines the apple-touch icon, favicon and manifest as data URIs. The Pages copy also ships the real files and points the icon links at them, because iOS often ignores a data-URI touch icon.
- iOS Home Screen is a separate website from Safari. A save made in Safari does not appear in the Home Screen app, and the other way around. The in-app note says so. Export / import is how to move a profile. Preview of the icon: `evidence/icon-180.png`.
