# Local Migration and Legacy Rollback

## Startup Contract

Call this instead of `Day8Save.load`, before any new-app autosave:

```js
const loaded = Day8Save.migrateLocal(storage, Day8Content.words, {
  catalog: window.A411.INHERITED.deck
});
```

The result is `{ok, state, found, migrated, needsProfileChoice?, profiles?, report?, backupKey?, error?}`. `storage` is the same-origin `localStorage` object (or `null` if access was denied). `options.now` is available for deterministic tests. On **any `!ok`, disable autosave and all other writes of the returned fallback state**: an unresolved choice or failed migration must not be overwritten by a fresh game. `load` remains a new-namespace-only reader; `detect` and `exportLegacy` remain the explicit Jinyi-only manual export helpers.

When both old saves exist without a clear active selector, the result contains `ok:false`, `migrated:false`, `needsProfileChoice:true`, `profiles:['jinyi','yuechao']`, and `error:'Choose a legacy profile before continuing'`. No state or backup is written. Show the player a chooser rather than a generic storage error, then retry with their explicit choice:

```js
const chosen = Day8Save.migrateLocal(storage, Day8Content.words, {
  catalog: window.A411.INHERITED.deck,
  profileId: selectedProfileId // 'jinyi' or 'yuechao', from the chooser
});
```

Enable saving only after the retry returns `ok:true`. Other failures should display the error and remain blocked until resolved/retried. `options.profileId` is not a profile-switch API and grants no manual-import trust.

This is automatic, read-only **with respect to all old storage**. It never runs old application/storage/migration code, enumerates storage, removes keys, or writes any `a411.p.*`, `a411.device.*`, `a411.save`, or `a404.*` key. It writes only `a411app.v1.state` and dated `a411app.v1.backup.*` records.

## Selection and Trust

- `a411.device.profile` is JSON `{ "activeProfile": "jinyi" | "yuechao" }`, not a bare string. A valid selector always wins, including **active Yuechao**, even over a conflicting or invalid `options.profileId`. The other profile is not read or mixed into it. A selected profile with no data returns the existing load result with `migrated:false`, without importing another profile or writing anything.
- An absent, empty, malformed, or unrecognized selector means **no clear active profile**, never a Jinyi default. Discover both profiles independently: a profile is a candidate if either its learn or story key exists, even if the saved value is empty or corrupt. A uiLang key alone is not a save. No candidates means no migration; one candidate uses that identity, including Yuechao-only; two candidates require player choice with no writes.
- Only without a valid selector may `options.profileId` choose a candidate. Invalid choices or choices without saved data fail without writes; they never fall back to the other candidate. Only the selected candidate is parsed/imported. Corrupt selected learn/story data fails with `ok:false`, even if the other profile has a healthy save. Corrupt candidates are not silently removed from the chooser.
- A completed migration is recognized by `state.legacy.localSource`. Subsequent starts return the new state after reading **only `a411app.v1.state`**, without rereading old keys or writing new backups. Old/new apps do not continuously sync. Neither changing the old active selector nor passing `options.profileId` replaces an already migrated new profile. This preserves completed migration idempotency; switching an established new-app profile is outside this API.
- The source profile ID is retained as the new state profile ID. If an existing unmigrated new state belongs to another profile, its exact bytes go into the backup and the selected profile starts separately; their progress is not merged.
- Only the private local migration path can bypass the manual profile restriction. There is no public `trusted` import option. `importData` still recursively rejects Yuechao files, nested bundles, serialized objects, and even exports of a locally migrated Yuechao state. `allowLegacy` does not bypass that rule.
- `save`, `load`, and `exportData` accept a migrated local state with its provenance, so future new-app progress is not blocked by the original Yuechao data. Provenance is local application metadata, not a cryptographic authentication claim. A same-origin script already has full storage access.

## Real Schema Mapping

Source code: `js/learn.js`, `js/wordbook.js`, `js/logic.js`, `js/deck.js`, and `js/weeklogic.js`.

Explicit read-only key allowlist:

```text
a411.device.profile
a411.p.jinyi.learn
a411.p.jinyi.story
a411.p.jinyi.uiLang
a411.p.yuechao.learn
a411.p.yuechao.story
a411.p.yuechao.uiLang
```

Only the selected profile's three keys are read when the active selector is valid. With no clear active selector, both profiles' three keys are read for candidate discovery, but only the chosen/sole profile is parsed and imported. There is no sequential fallback across saves. Temporary writes (`.tmp`), old backup keys (`.bk.*`), and earlier single-player `a411.save`/`a404.save` adoption sources are not executed or rewritten; the shipped Days 1-6 learner/SRS source is the per-profile `learn` record.

| Old data | New representation |
| --- | --- |
| `a411.p.<id>.learn`, `schema: 1`, `profileId` | Full unmodified parsed record in `legacy.learn`; exact original string in `legacy.localSource.raw` |
| `learn.cards["itemId\u007cmodality"]` | Independent `listening`, `reading`, and `production` cards; no FSRS recalculation or resetting intervals |
| Card stability, difficulty, reps, lapses, scheduledDays, due, lastReview, state, suspended, leech, unknown extensions | Preserved; valid ISO dates normalized to equivalent ISO instants; all original cards also in `rawCards` |
| Canonical IDs and `legacyIds` | Exact catalog ID wins, then explicit aliases. Alias collisions retain all source cards in `rawCards`, while active scheduling keeps newer `lastReview`, then higher reps |
| `learn.carnet.words` (`cw_*`, word, lemma, display, sentence, gloss, at, source) | Collected word metadata in `words`; missing catalog entries hydrated into `customWords`; original carnet retained |
| `extraItems`, `storyPending` | Encountered word entries and custom metadata hydrated without fabricating review history |
| Unknown IDs/modalities, invalid cards | Retained in `rawCards`, `unknownCards` where applicable, and the complete legacy record; not coerced into an incorrect exercise |
| `learn.deleted` timestamps, `learn.hidden` | Preserved as tombstones/hidden flags; stale words are not collected/met/introduced and stale mapped cards are suspended; original source flags/cards stay archived |
| `learn.overrides`, evidence, days, session, priorities, placementLog, garden, future fields | Full original data retained in `legacy.learn`; not relabeled as new-app achievements or growth |
| `a411.p.<id>.story`, `schemaVersion: 1` | Full record in `legacy.story`; player name, Day 7 choices/recorded ending/completion mapped where present |
| Day 1 `progress.status`; Days 2-6 `week.chapters`; letters, traces, diary | Kept unchanged in legacy story; never invents Day 7 completion or moves the new story cursor |
| `a411.p.<id>.uiLang` | Plain `en` or `zh` becomes `settings.uiLang`; raw bytes retained |

Fresh synthetic Week 1 cards are not generated for an automatic legacy migration. Source cards and real encounters determine inherited progress. A same-profile existing new state is merged without replacing newer review memory or new-story progress.

## Backup and Failure Behavior

Before replacing new state, migration writes and verifies:

```text
a411app.v1.backup.<UTC-ISO-date-time>.migration[.<collision-number>]
```

The JSON backup contains `schema: "day8-migration-backup-1"`, `createdAt`, `previousState` (exact previous new-state string or null), and `migratedState` (the full new-state JSON string). This snapshot also includes every original old source string and the original selector string. Backups are never pruned or overwritten by this migration.

Only after that backup reads back identically does migration write and verify `a411app.v1.state`. Malformed records, denied storage reads, quota failures, failed readback, or a concurrent new-state change return `ok:false`. Browser storage is atomic per key, not across keys: a failure can leave a dated backup without installing the new state. That is intentional and retryable. A later retry uses a collision-safe backup name. No claim of a multi-key transaction or cross-tab lock is made. Close duplicate new-app tabs during migration.

For new-app recovery, an operator can inspect the dated backup and restore its `migratedState` or `previousState` **only to `a411app.v1.state`**, after preserving the current new-state bytes separately. This is local recovery, not manual file import; Yuechao file import remains prohibited. Never write the archive back into the old keys as part of migration recovery. Do not use browser "clear site data", which would erase both apps' same-origin saves.

## Static GitHub Pages Packaging

No duplicate legacy asset tree is committed. `tools/package-pages.mjs` pins the unchanged old build to Git commit `30896daa5f76ab7c7e838b5e1262487cc87ec7b1`, extracts its tracked runtime assets without executing them, and verifies each extracted byte sequence against its Git blob hash. It emits SHA-256 hashes in `legacy-manifest.json`.

```sh
node tools/package-pages.mjs --out /tmp/kilo/day8-pages
```

The output directory must not already exist and its parent must exist. The generated tree contains the old build unchanged at the site root and at `legacy/`, plus the current new app at `app/`. Its relative asset links continue to resolve. `.nojekyll` makes it a plain static artifact. Tests/docs/tools and Git metadata are excluded from the new app artifact. Build-time asset duplication is intentional; no huge copies enter source control.

The manual-only `.github/workflows/pages.yml` workflow runs the app tests, packages this tree, uploads the **whole output directory** with `actions/upload-pages-artifact`, and publishes it with `actions/deploy-pages`. It uses a full-history checkout so the pinned commit is available. Configure repository Pages to use GitHub Actions, then explicitly dispatch this workflow to publish; implementation/testing did not trigger a live deployment. Publishing a generated branch is also possible, but a source-branch Pages deployment without running packaging will not contain `/legacy/`. Any other checkout used to package must include the pinned commit (`fetch-depth: 0` or fetch it explicitly). Running the packaging command locally does not publish anything.

For a project site at `https://owner.github.io/repo/`, URLs are `/repo/app/` and `/repo/legacy/`; on an origin-root site they are `/app/` and `/legacy/`. They must share the old save's exact scheme/host/port. A preview host, different GitHub account domain, private tab, device, or `file:` URL cannot read the original localStorage. Build files contain no learner data.

## Rollback and Cache Caveats

The old app is reachable directly at the packaged `legacy/` URL and still uses its original storage namespace. Migration never changed that namespace, so returning there resumes the old game. **Playing the old build can itself write old storage**, just as before; the read-only promise applies to the new migration, not normal legacy play. Do not open the legacy build in an automated test against a real user's browser profile. Old and new progress diverge after migration; there is no reverse migration.

Register the new worker as `navigator.serviceWorker.register('./sw.js')` from the app directory, using its default app-only scope. Its fetch handler checks the exact worker directory, not a broad `/app/` regular expression; root pages, `/legacy/`, unrelated projects, root audio, and root `js/conjugate.js` pass through untouched. It never unregisters the old/root worker. The new cache namespace includes its project path and deliberately does not start with `a411-`: the byte-unchanged old worker deletes `a411-*` caches when it activates. It removes only obsolete new-app caches, never legacy caches.

Root/legacy workers remain byte-unchanged, so a previously installed root worker can control the **first** app navigation before the app-scoped worker installs. Online reload may be necessary after deployment. The app worker cannot repair or unregister that root worker without changing rollback behavior. Its cache-first app shell updates only after a successful complete precache; a failed installation leaves the previous app shell available. External/root audio and conjugation assets are deliberately not intercepted or precached by the app worker, so their offline availability is not guaranteed. Deployments/rollbacks must ship coherent app assets and a changed app worker cache version; close/reopen installed PWAs or reload online to pick up a successful upgrade. Never clear origin-wide storage to fix a stale cache.

## Verification

```sh
node --test app/tests/migration.test.cjs app/tests/save.test.cjs app/tests/sw.test.cjs app/tests/legacy-package.test.cjs
```

`fixtures/legacy-days1-6.cjs` constructs synthetic profiles through the real old pure functions (`emptyLearn`, `addWord`, `gradeExternal`, chapter/letter completion, garden watering). It does not run the old application or any storage writer. Both profile tests compare six collected words, 54 mapped modality cards and two unknown cards, every scheduling field, tombstones, full records, and exact source bytes; other tests exercise repeat-start idempotency, manual refusal, dated backups, profile isolation, malformed data, read/write/verification failures, retry, and SW path isolation. The packaging test byte-verifies the entire pinned legacy tree without loading it in a browser.
