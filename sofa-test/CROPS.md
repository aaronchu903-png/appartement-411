# Crop rects — sofa-test v4 (scene.json `cropLibrary` + per-shot refs)

Scene = 96×64 px. Rects are scene px (x, y, w, h), 9:16, hard cuts, integer upscale. Edge pad = wall/floor fills + hub `floor_walls` slice.

| # | t | shot | crop ref / rect | notes |
|---|---|---|---|---|
| 1 | 0.0–1.5 s | **MEDIUM** tail + sofa left (`tailMedium`) | `tailMedium` (22,-4,42,72), maxScale 3 | replaces 80× close-up |
| 2 | 1.5–3.5 s | WIDE + warm wall/floor only | `wide` | hub backdrop + warm overlay |
| 3 | 3.5–5.5 s | MEDIUM Camille enter | `medium` | |
| 4 | 5.5–8 s | **MEDIUM** tail + tap (`tailMedium`) | same as shot 1, maxScale 3 | |
| 5 | 8–10.3 s | CLOSE peek (60,26) | (52,14,18,32) | capture ~8.25s while peek_0/1 drawn |
| 6 | 10.3–12.2 s | WIDE gag (tighter) | `wideGag` (28,-30,64,116) | whole sofa; larger on phone vs v3 wide |
| 7 | 12.2–13.7 s | MEDIUM + cat (62,44) | `medium` | |
| 8 | 13.7–15.2 s | CLOSE cat | (56,30,18,32) | |

Backdrop: copied from `legacy/prototype/hub/assets/A/` (Days 1–6 apartment Jour) — see `scene.json` → `backdrop`.
