# Appartement 404 — Day 1 alpha (A404-001)

Static browser game: plain HTML/CSS/JS, no framework, no build step needed to run, no server, no network calls.

- Play locally: open `index.html`, or the single-file build `dist/appartement-404.html` (everything inlined).
- Static host later (e.g. GitHub Pages): serve this folder as-is; `index.html` is the entry point.
- Spec pack and live project record: `docs/` (`docs/STATE.md` is the live state).

## Team commands (Node ≥ 18)

```
npm test        # unit tests for save/validation/migration/learning/summary logic (node:test, no deps)
npm run build   # dist/appartement-404.html + dist/appartement-404-v<version>.zip
npm run e2e     # headless Chrome at 390x844 (+375x667): full path, alternate path, help, pause/reload,
                # export/import, bad import, v0 migration, probe cue checks, summary privacy, dist file.
                # Needs playwright-core (devDependency) and Chrome at /usr/bin/google-chrome (or CHROME=...).
                # Writes evidence/e2e-results.json and evidence/*.png
```

## Layout

| Path | What |
|---|---|
| `js/content.js` | Authored Day 1 content (French lines, Chinese help, scene scripts, chronicle templates). Content version `d1-2026-10-08a`. |
| `js/logic.js` | Pure logic: save schema v1, validation, v0→v1 migration, failure-safe storage + backups, world/plant/learning rules, review entries, feedback summary. |
| `js/art.js` | Original pixel art drawn in code (96×64 canvas). See `docs/ASSETS.md`. |
| `js/audio.js` | French audio via the device's Web Speech API voice; honest status + reading fallback. |
| `js/app.js` | UI and scene engine (resumable by scene + step). |
| `tests/` | `logic.test.js` (unit), `e2e.mjs` (browser), synthetic fixtures. No real learner data. |
| `evidence/` | Screenshots and machine-readable e2e results from the last run (synthetic test data). |

## Save format

`localStorage['a404.save']` (schema v1). Writes go to `a404.save.tmp`, are read back, then copied to the main key.
Backups (`a404.backup.<time>.<reason>`, max 5) are made before migration, import and "restart". Malformed imports are rejected
without touching the current save. Local-only: no sync between browsers/devices; export to move or keep a copy.
