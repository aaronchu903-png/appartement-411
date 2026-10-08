# Project State

Working record. Replace unknowns with observed facts; preserve any established project state found during startup rather than resetting it to this template.

Last updated: 2026-10-08 ~12:10 PT (America/Vancouver) — CTO + Experience passes for A404-001, performed by one Bot as separate role passes (no separate agents were available or created).

| Field | Current record |
|---|---|
| Stage | 01 - Reliable first-week learning alpha. |
| First task | A404-001 - Move-in day: **implemented, locally verified; awaiting first phone play.** |
| Existing repository/workspace | Inspected 2026-10-08: nothing named appartement/a404 in `/workspace` or `/home/box` (only the spec pack in `/workspace/upload1/Appartement_404/`). `gh` CLI present but **not authenticated** → GitHub check skipped. Cursor "Origin" code host: no namespaces. Nothing to preserve; new project created. |
| Stable version / entry point | **v0.1.0**, content `d1-2026-10-08a`, save schema v1. Local only. Entry: `/workspace/appartement-404/index.html` (multi-file) or `/workspace/appartement-404/dist/appartement-404.html` (single file, ~114 KB, everything inlined). |
| Latest artifact | `/workspace/appartement-404/` (source, tests, docs, evidence); `dist/appartement-404.html`; `dist/appartement-404-v0.1.0.zip`. Local git repo in the project folder (no remote, nothing pushed). |
| Tool/account capabilities | Box: Node 20, Chrome 154 (headless via `playwright-core`), Python 3, ffmpeg, sudo. No GitHub auth. No paid services used. `speech-dispatcher`/`espeak-ng` were installed on the box during an attempt to give headless Chrome a French voice (did not work; harmless, can be removed). |
| Available quota / billing state | Additional spend: USD 0. No accounts created, no paid assets/services. |
| Working collaborators | One Bot doing CTO + Experience passes. No independent reviewer; no human native-speaker review yet. |
| Deployment scope / authorization | **Not deployed.** No public or private preview exists. First exposure needs founder approval (see decision below). |
| Founder-device audio | **Not tested.** Audio route = device fr-FR voice (Web Speech API) + visible reading fallback. Fallback verified in headless Chrome (which has no voices); voice-available logic verified with a simulated voice only. Real voice untested on any phone. |
| Save / restore / migration | Verified in headless Chrome + unit tests (see evidence below). localStorage only — one browser on one device, no sync; clearing site data deletes it; export/import provided. |
| Learning baseline | Implemented (3 skippable items). Founder's baseline **not measured yet** (no founder play). |
| Feedback receiving path | In-game "反馈摘要" generates text (copy button + visible text); founder pastes it to the CEO manually. No automatic ingestion exists. |
| Recurring workflow | Not configured (by design: CEO.md requires one proven build-test-deliver-feedback cycle first). |

## Next action

1. Founder decision on a $0 phone-accessible preview (below). Until then the founder can try the single file on Android Chrome (copy `dist/appartement-404.html` to the phone and open it); iPhone opening of a local HTML file is unreliable (Files/Quick Look does not run the game properly), so iPhone needs a hosted preview.
2. First founder play of Day 1 on the phone → record: did French audio play (voice name shown in 设置 → 测试法语语音), readability, any stuck point, paste of the feedback summary.
3. Use that feedback for the first feedback-led improvement (Stage 01 "Improvement" gate), then start A404-002 (Day 2) without resetting the founder's save.

## Current blocker or decision

**One bundled decision for the founder:** approve a free, phone-reachable preview location for v0.1.0 (this is "first exposure"). Options at $0, none set up:

| Option | What it needs | Privacy | Notes |
|---|---|---|---|
| A. GitHub Pages from a repo in your GitHub account (recommended) | You approve + connect GitHub once (or create the repo yourself); we push the static folder; Pages serves `index.html`. | GitHub Free: Pages sites are **public** (anyone with the URL; `noindex` is set but not access control). The repo can be private only on paid plans for Pages. The game contains no personal data; saves stay on your phone. | Stable URL, rollback = previous commit, repeat low-risk updates can be pre-approved. |
| B. Cloudflare Pages / Netlify free tier | New account connection (or your existing one) + upload. | Public-by-URL (unlisted). | Same static folder; similar rollback. |
| C. No hosting: send the single HTML file to your phone | Nothing new. | Fully private. | Works on Android Chrome; iPhone unreliable; updates mean re-sending a file. |

Proposed: **A** (or C immediately on Android while A is pending).

## Latest delivery and evidence

**Artifact:** v0.1.0 / content `d1-2026-10-08a` / schema v1. Day 1 "Bienvenue chez nous": skippable baseline → doorway (Camille, Noé; speaker tag + replay) → "Tu t’appelles comment ?" (nickname / sentence / skip) → plant corner (water once or later; pause) → Camille leaves, Croissant, secrecy choice (keep / decline) → 4-trial neutral recognition check → diary (factual chronicle + optional verbatim journal) → end. Days 2–7 listed as "尚未开放" with no buttons. Title screen also offers a once-per-day plant quick visit.

**Environment of checks:** headless Google Chrome 154.0.8037.57 on the Linux box, 390×844 @2x mobile emulation (touch), plus 375×667 for the alternate path; `file://` URLs. Unit tests: Node 20 `node:test`. Runs on 2026-10-08 ~12:02 PT. Results: `npm test` **18/18 pass**; `npm run e2e` **63/63 checks pass** (`evidence/e2e-results.json`).

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
| Improvement | **Untested — needs founder feedback.** | No founder observation yet. |

**Known limitations / honest gaps**
- Real French voice not heard on any device; iOS Safari has known speechSynthesis quirks (first utterance after `cancel()` can be dropped → app times out after 5 s, shows text, replay available). Voice quality depends on the phone.
- Pixel art is a first, simple original set (small 96×64 scenes; gestures like "hand on chest" / "finger to lips" are only a few pixels). Adequate for v0.1, Visual pass needed later.
- Probe covers distinguishing only; the curriculum's "or give an appropriate response" inside the probe is not implemented (the free name answer covers response separately).
- Exposure records exist for every heard line; support-level adjustment is computed as a recommendation only (per target + modality); it does not yet auto-change presentation in Day 1.
- No speech capture (by design; spoken production unverified).
- Episode length not measured with a real player (auto path takes seconds; intended 10–15 min reading/listening).

**Recovery / delivery status:** stable local version v0.1.0 committed in the local git repo. Nothing deployed. Rollback = previous commit / previous zip.

## Decisions that change the plan

- 2026-10-08 (CTO, reversible): audio = device voice (Web Speech API) + reading fallback. Pre-rendered Piper clips rejected for now (one voice unintelligible by ASR check; the intelligible one has an unclear research-licence ancestry). Details in `docs/ASSETS.md`.
- No founder decisions recorded yet.

## Preview deployment (2026-10-08, ~12:45 PT)

- Founder approved (chat, 2026-10-08) a free GitHub Pages preview.
- gh CLI on the box logged in as `aaronchu903-png` via device flow (scopes: repo, workflow, gist, read:org).
- Public repo `aaronchu903-png/appartement-404` contains ONLY the built single file (`index.html` = `dist/appartement-404.html` v0.1.0), `.nojekyll`, README. Spec docs, tests, evidence and source stay local in `/workspace/appartement-404` (local git) and are NOT published.
- Preview URL: https://aaronchu903-png.github.io/appartement-404/ — served file byte-identical to local dist (cmp). Headless Chrome at 390x844 loaded it with 0 page errors (evidence/17-live-pages-390.png).
- Deploy dir: `/workspace/a404-pages` (git, branch main). Rollback: `git revert`/reset to previous commit there and push.
- Real-phone audio, real-phone persistence: still untested; awaits founder play.
- Repeat low-risk preview updates: not yet authorized; ask founder for narrow standing permission per CEO.md.
- 2026-10-08 12:50 PT: Founder granted standing permission for small preview updates (bug fixes, text, new day) to this Pages URL; notify after each publish. Spend, new platforms, wider exposure still need approval.
