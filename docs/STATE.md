# Project State

Working record. Replace unknowns with observed facts; preserve any established project state found during startup rather than resetting it to this template.

Last updated: 2026-10-08 PT (America/Vancouver). First feedback-led improvement: **v0.1.2 is committed locally and NOT deployed** (published preview is still v0.1.1). Pre-rendered audio candidates have been prototyped and await a founder listening decision. Earlier: project renamed to L’Appartement 411 (v0.1.1). Task IDs are A411-00x; they were formerly A404-00x.

| Field | Current record |
|---|---|
| Stage | 01 - Reliable first-week learning alpha. |
| First task | A411-001 (formerly A404-001) - Move-in day: **implemented, locally verified; awaiting first phone play.** |
| Existing repository/workspace | Inspected 2026-10-08: nothing named appartement/a404 in `/workspace` or `/home/box` (only the spec pack in `/workspace/upload1/Appartement_404/`, renamed 2026-10-08 to `/workspace/upload1/LAppartement_411/`). `gh` CLI present but **not authenticated** → GitHub check skipped. Cursor "Origin" code host: no namespaces. Nothing to preserve; new project created. |
| Stable version / entry point | **v0.1.2 local** (commit `8143c60`, not deployed; preview still serves v0.1.1), content `d1-2026-10-08b`, save schema v1. Entry: `/workspace/appartement-411/index.html` (multi-file) or `/workspace/appartement-411/dist/appartement-411.html` (single file, everything inlined). Old path `/workspace/appartement-404` is a symlink. |
| Latest artifact | `/workspace/appartement-411/` (source, tests, docs, evidence); `dist/appartement-411.html`; `dist/appartement-411-v0.1.1.zip`; `dist/LAppartement_411_docs.zip` (renamed original spec pack). Local git repo in the project folder (no remote). |
| Tool/account capabilities | Box: Node 20, Chrome 154 (headless via `playwright-core`), Python 3, ffmpeg, sudo. No GitHub auth. No paid services used. `speech-dispatcher`/`espeak-ng` were installed on the box during an attempt to give headless Chrome a French voice (did not work; harmless, can be removed). |
| Available quota / billing state | Additional spend: USD 0. No accounts created, no paid assets/services. |
| Working collaborators | One Bot doing CTO + Experience passes. No independent reviewer; no human native-speaker review yet. |
| Deployment scope / authorization | **Not deployed.** No public or private preview exists. First exposure needs founder approval (see decision below). |
| Founder-device audio | **2026-10-08 founder report (iPhone, Safari, English UI): French voice audible but sounds robotic.** Pronunciation and naturalness matter most to them. v0.1.2 addresses voice choice (see below); pre-rendered clips are being evaluated. Earlier record: **Not tested.** Audio route = device fr-FR voice (Web Speech API) + visible reading fallback. Fallback verified in headless Chrome (which has no voices); voice-available logic verified with a simulated voice only. Real voice untested on any phone. |
| Save / restore / migration | Verified in headless Chrome + unit tests (see evidence below). localStorage only — one browser on one device, no sync; clearing site data deletes it; export/import provided. |
| Learning baseline | Implemented (3 skippable items). Founder's baseline **not measured yet** (no founder play). |
| Feedback receiving path | In-game "反馈摘要" generates text (copy button + visible text); founder pastes it to the CEO manually. No automatic ingestion exists. |
| Recurring workflow | Not configured (by design: CEO.md requires one proven build-test-deliver-feedback cycle first). |

## Next action

**Now (2026-10-08, Improvement cycle):**
1. Founder listens to `audio-candidates/compare/*_3lines.mp3` and chooses: ship one TTS set as fixed Day 1 clips, or wait for a native speaker's recordings (`audio-candidates/HUMAN_RECORDING_SCRIPT.md`). Then integrate the chosen clips (plan in `audio-candidates/README.md`), with the device voice and then reading mode as fallbacks.
2. Deploying v0.1.2 to the preview is covered by the standing small-update permission. It was deliberately not deployed in this task; the CEO decides.

**Earlier list (kept for the record):**

1. First founder play of Day 1 on the phone (preview URL below) → record: did French audio play (voice name shown in 设置 → 测试法语语音), readability, any stuck point, paste of the feedback summary.
2. Use that feedback for the first feedback-led improvement (Stage 01 "Improvement" gate), then start A411-002 (Day 2) without resetting the founder's save. Saves made under v0.1.0 (`a404.save`) are adopted automatically into `a411.save`.

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

**Artifact (current): v0.1.1 / content `d1-2026-10-08b` / schema v1.** First delivered artifact was v0.1.0 / `d1-2026-10-08a`. Day 1 "Bienvenue chez nous": skippable baseline → doorway (Camille, Noé; speaker tag + replay) → "Tu t’appelles comment ?" (nickname / sentence / skip) → plant corner (water once or later; pause) → Camille leaves, Croissant, secrecy choice (keep / decline) → 4-trial neutral recognition check → diary (factual chronicle + optional verbatim journal) → end. Days 2–7 listed as "尚未开放" with no buttons. Title screen also offers a once-per-day plant quick visit.

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
