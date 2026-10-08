# Project State

Working record. Replace unknowns with observed facts; preserve any established project state found during startup rather than resetting it to this template.

Last updated: 2026-10-08 ~13:05 PT (America/Vancouver) — project renamed to L’Appartement 411 (v0.1.1). Task IDs are A411-00x; they were formerly A404-00x (A404-001 = A411-001, same task).

| Field | Current record |
|---|---|
| Stage | 01 - Reliable first-week learning alpha. |
| First task | A411-001 (formerly A404-001) - Move-in day: **implemented, locally verified; awaiting first phone play.** |
| Existing repository/workspace | Inspected 2026-10-08: nothing named appartement/a404 in `/workspace` or `/home/box` (only the spec pack in `/workspace/upload1/Appartement_404/`, renamed 2026-10-08 to `/workspace/upload1/LAppartement_411/`). `gh` CLI present but **not authenticated** → GitHub check skipped. Cursor "Origin" code host: no namespaces. Nothing to preserve; new project created. |
| Stable version / entry point | **v0.1.1**, content `d1-2026-10-08b`, save schema v1. Entry: `/workspace/appartement-411/index.html` (multi-file) or `/workspace/appartement-411/dist/appartement-411.html` (single file, everything inlined). Old path `/workspace/appartement-404` is a symlink. |
| Latest artifact | `/workspace/appartement-411/` (source, tests, docs, evidence); `dist/appartement-411.html`; `dist/appartement-411-v0.1.1.zip`; `dist/LAppartement_411_docs.zip` (renamed original spec pack). Local git repo in the project folder (no remote). |
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
| Improvement | **Untested — needs founder feedback.** | No founder observation yet. |

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
