# Crop rects for the 15 s hide short (v2), one per shot of STORYBOARD_15S.md "v2 shot list"
Scene = 96x64 px. Rects are scene px (x, y, w, h), all 9:16, hard cuts, nearest-neighbour integer upscale only.
Rects may go past the room: pad by repeating the edge (wall #e3d3c6 above, floor #9d8064 below). Full-size output 720x1280.

| # | t | shot | rect (x, y, w, h) | scale | reference |
|---|---|---|---|---|---|
| 1 | 0.0–1.5 s | CLOSE tail, sofa left end | (43, 31, 9, 16) | x80 | crop_tail_closeup.png |
| 2 | 1.5–3.5 s | WIDE whole sofa (flashback; tint is engine-side) | (24, -48, 72, 128) | x10 | crop_wide.png framing |
| 3 | 3.5–5.5 s | MEDIUM door side + sofa left half, Camille enters | (18, -8, 45, 80) | x16 | crop_medium.png |
| 4 | 5.5–8 s | CLOSE tail (tap target, hitbox 44,34,8,12) | (43, 31, 9, 16) | x80 | crop_tail_closeup.png |
| 5 | 8–10 s | CLOSE sofa arm, peek at (60,26) | (52, 14, 18, 32) | x40 | — |
| 6 | 10–12 s | **WIDE gag, whole sofa, never cropped tighter** | (24, -48, 72, 128) | x10 | crop_wide.png |
| 7 | 12–13.5 s | MEDIUM Camille (standing at 38,26) + sofa left | (28, -8, 45, 80) | x16 | — |
| 8 | 13.5–15 s | CLOSE cat: glance → look_cam_0 → look_cam_1 → backs off | (46, 30, 18, 32) | x40 | — |

Shot 6 contains x 24..95: Camille (camille_bend_2 at 40,26) at the left arm, sofa 50..93 whole, cat exiting at the right edge.
