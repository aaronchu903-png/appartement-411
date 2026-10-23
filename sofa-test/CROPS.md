# Crop rects — sofa-test v4 plan B (`scene.json` `cropLibrary`)

Side-view **backdrop** (`backdrop_living.png` / `backdrop_living_tall.png`, tall row = scene y+36) + wall/floor pad for overflow. Scene = 96×64 px; rects (x, y, w, h), 9:16, integer upscale.

| # | t | shot | crop | notes |
|---|---|---|---|---|
| 1 | 0.0–1.5 s | MEDIUM tail + sofa left | `tailMedium` (28,4,30,54) | replaces 80× close-up |
| 2 | 1.5–3.5 s | WIDE + warm wall/floor | `wide` | sofa blues unchanged |
| 3 | 3.5–5.5 s | MEDIUM Camille enter | `medium` | |
| 4 | 5.5–8 s | MEDIUM tail + tap | `tailMedium` | |
| 5 | 8–10.3 s | CLOSE peek | (52,14,18,32) | capture ~8.25s |
| 6 | 10.3–12.2 s | WIDE gag (tighter) | `wideGag` (28,-30,64,116) | Camille left, cat right @ 62 |
| 7 | 12.2–13.7 s | MEDIUM + cat (62,44) | `mediumCamille` (28,-8,45,80) | |
| 8 | 13.7–15.2 s | CLOSE cat | (56,30,18,32) | Pixel Studio |

Cat `catRightFront` (62,44). Sigh 12.3 s (shot 7).
