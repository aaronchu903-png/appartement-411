# L'Appartement 411 — top-down v2.5 (styles A day, D evening)
Rebuild: `python3 make.py` (layout from ../styles/base.py; v1 untouched).

Grid: 16px tiles, 12x24 (192x384 native). Rows 0-2 = top wall (3 tiles), kitchen rows 3-9 with bar partition at row 8, salon 10-19, wall row 20 (door at cols 5-6), landing/stairs 21-23.

Per style folder (A/, D/) — same schemas/naming as v1:
- floor_walls.png: floor + walls + wall decor, without curtains (they are anim sprites).
- furniture/<name>.png + furniture.json: {size, anchor (foot, px in sprite), footprint_tiles [[col,row]], placed_at [x,y] = anchor in map px, note}. Draw decals (rug, mat, cushion, bowls) first, then y-sort everything else plus actors by placed_at[1]. furniture/basil_0..7.png = 8-frame sway (16x14, same anchor (6,13) as the static sprite).
- anim/curtain_<l|r>_<0-7>.png: top-left at (curtain_l x=43, curtain_r x=77, y=0), 8-frame sway loop, 0-4px.
- light/ (overlay layers, normal alpha-over, in this order):
  - shadow.png (both): contact shadows under furniture, wall AO and actor shadows (ink at 35-45% alpha). Goes over the floor, under sprites. If actors move, drop shadow.png's actor ellipses and draw a 12x4 ink ellipse at 43% alpha at each actor's feet.
  - A: window_patch.png (paper ~50%, floor, under sprites), warm_grade.png (gold 7%, top of everything).
  - D: window_night.png, then night_grade.png (dark blue, alpha ~84% falling to 0 at the lamps), then lamp_glow.png. All three go on top of everything. Light is soft and smooth (v2.2): gold glow alpha 80*g^1.5; night grade colour 12,22,34 at alpha 210*(1-g). Floor-lamp flicker per frame (16-frame loop): 1.0 down to 0.6, see night_layers().
- walkable_mask.png (green = walkable, red = blocked), walkable.json {tile, cols, rows, walkable[row][col], exits.stairs_down}.
- preview_native.png, preview_x5.png, ambient.gif (16 frames @150ms, x3).

characters/ (shared by both styles):
- Characters are 18x32 (v1: 16x26), anchor (9,31) = feet.
- Files: <camille|noe|player>_idle_<dir>_<0-3>.png. All humans have down/up/left/right idles.
- Frames: 0 = rest, 1-2 = breath (head/torso dip 1px), 3 = blink. Loop 0,1,2,1 and swap in 3 occasionally.
- croissant_idle_<0-3>.png is 18x15, anchor (9,14).

Palette: all sprites and floor use the 23 colours of palette_a411.hex. Off-palette colour only comes from the lighting overlays (night blue 26,22,58 and window pane tint) and the alpha blends they produce.

## Walk cycles (v2.1)
- <player|camille|noe>_walk_<down|up|left|right>_<0-3>.png: 18x32, anchor (9,31). Frames are contact, pass, contact, pass with a 1px bob; play at about 8-10 fps.
- croissant_walk_<dir>_<0-3>.png: 18x15, anchor (9,14).
- characters/walk_preview.gif: rows are player, Camille, Noé, Croissant; columns are down, up, left, right.

## Ambient FX (drawn per frame in make.py frame(); not separate layers)
- Mug steam: 3 paper pixels rising and fading above the desk mug and the coffee-table mug.
- A: 14 paper dust motes drifting along the window sunbeam.

## D light zones (v2.3): D/light/zones/
Base: night_base.png = colour (8,20,26) at alpha 232 over the whole map. Deep, high-contrast darks; characters may sink into shadow on purpose.
Each zone PNG has the zone colour in RGB and its light mask m (0-255) in alpha. Masks are pre-scaled to a 0.9 peak and use a gaussian^1.6 falloff. Flicker zones also ship 16 frames: <zone>_f00..f15.png.

| zone | file | colour | radius (sigma px) | mood | flicker |
|---|---|---|---|---|---|
| desk_lamp | desk_lamp.png | 255,196,110 warm gold | 26 @ desk lamp | warm, intimate: letters, journaling, private thoughts | subtle |
| sofa_lamp | sofa_lamp.png | 255,170,90 amber | 34 @ floor lamp | cozy comfort: cat on lap, late talks | strong (down to 0.6) |
| kitchen_pendant | kitchen_pendant.png | 255,214,140 soft gold | 30 @ table, under new pendant prop (furniture/pendant.png, overhead, drawn after y-sort at map (134,58)) | shared dinner warmth | none |
| window_moon | window_moon.png | 130,175,215 cold blue | beam polygon, blur 7, plus 22px glow at pane | loneliness, mystery, night thoughts | none |
| door_spill | door_spill.png | 240,190,120 | 26 at door + 22 on landing | arrivals, suspense, someone at the door | stair-timer dips/cut-outs |

Engine combine (per frame; m_i = active zone alpha/255, times its flicker frame if any):
1. lit = 1 - Π(1 - m_i)   (screen-union of all active zones)
2. Draw the world and actors, y-sorted. Characters get no rim light and no brightness floor.
3. Draw the night grade over everything: colour NIGHT, alpha = 232*(1 - lit), normal blend.
4. Draw the glow: for each active zone, in order, normal-blend its colour at alpha 0.42*m_i^1.4. An additive/screen blend at the same strength is an acceptable alternative.
5. Draw light/window_night.png (moonlit pane tint).
Zones are independent and swappable: turn them on or off per scene, or fade a zone's m over 0.5-1 s for mood changes.
light/night_grade.png and light/lamp_glow.png are the all-zones-on result for frame 0.


## Times of day (v2.4)
| Folder | Variant | Use it for |
|---|---|---|
| `A/` | DAY | everyday life, lessons, chores, bright comedy |
| `E_evening/` | EVENING | dinners, warm moments, games, friends arriving, cosy talk |
| `M_midnight/` (`D` is a symlink to it) | MIDNIGHT | loneliness, mystery, night thoughts, suspense |

- `times_of_day.png` compares A, E and M side by side.
- **E_evening** uses the same zone system as M (`light/zones/`, the same engine combine). Night = (44,22,52), a purple-dusk tint, at alpha 190*(1-lit). Glow strength is 0.8*m^1.4, so it is warmer and brighter than M (0.42). Moderate contrast; no rim light; no brightness floor.

| E zone | colour | sigma | mood | flicker |
|---|---|---|---|---|
| kitchen_pendant | 255,190,110 | 38 | dinner together, the warm heart of the evening | none |
| sofa_lamp | 255,165,85 | 40 | cosy unwinding: cat on lap, laughter, games | strong |
| desk_lamp | 255,200,120 | 30 | gentle focus: homework, writing, a calm talk | subtle |
| window_dusk | 255,150,120 | 30 at pane + 44 on floor | sunset afterglow: end of day, nostalgia, soft hope | none |
| door_spill | 250,195,130 | 28 + 24 on landing | friends arriving, welcome home | stair timer |

- **M_midnight** is unchanged from v2.3 (the zones table above).
- Each variant folder has the full layer set: floor_walls, furniture plus furniture.json, anim, light, walkable_mask and walkable.json, preview_native, preview_x5, ambient.gif, and mood_sheet (E and M).

## Shared art + detail-preserving grade (v2.4)
- E_evening and M_midnight use exactly the same base art as A: the same floor_walls, furniture, props, window, characters and animations. The only differences are colour grading and light layers (`detail_compare.png` shows A, E and M crops side by side).
- Grade is no longer an alpha-over fill.
  - With a = night_grade alpha/255: `out = base * (1 - a*(1 - MUL)) + highpass(base) * LIFT * a`, where highpass = base - box-blur(base, 1px).
  - MUL is the multiply tint; LIFT is the detail lift that keeps outlines, textures and highlights legible in dark areas.
  - Plus ADD*a, a small tint added in the dark.
  - v2.5 values:
    - M: night alpha up to 250, MUL (0.035,0.055,0.07), LIFT 0.3, ADD (5,14,18). Near-black blue-green darks, so the zones pop (the v2.3 drama).
    - E: night alpha up to 200, MUL (0.60,0.42,0.24), LIFT 0.5, ADD (18,8,0). Warm amber-brown honey grade.
  - E zones (v2.5) are larger and more golden: pendant sigma 50 (255,184,72), sofa 52 (255,160,60), desk 40 (255,196,96), door 36, dusk (255,140,80). Glow strength 1.0*m^1.4.
  - Then the zone glows are alpha-blended on top, as before. Engines: implement as a multiply pass plus a cheap unsharp/high-pass add masked by `a`.
  - night_grade.png still stores `a` in its alpha.

## Changelog
- v2.5: E regraded from grey-rose to warm amber-brown, with bigger and stronger golden lamp pools (matches the v2.0 cosy feel). M much darker in unlit areas with a lower detail lift, restoring the v2.3 contrast. A keeps the kitchen pendant. v2.4b script kept as make_v2.4b.py.
- v2.4b: detail-preserving multiply + high-pass grade for E and M (replaces the alpha-over darkening). Added detail_compare.png.
- v2.4: three times of day. The v2.3 D moved to M_midnight/ (D is now a symlink). New E_evening/: a warm dusk zone set restoring the v2.0 cosy look via zones. Added times_of_day.png. v2.3 script kept as make_v2.3.py.
- v2.3 (D): removed the character rim light and brightness floor (high contrast again; characters may sink into shadow). Darker night (8,20,26 at alpha 232) with soft smooth glows. Lighting split into 5 named zones in light/zones/ with flicker frames. Added a kitchen pendant prop, mood_sheet.png, and an all-zones-on preview. v2.2 script kept as make_v2.2.py.
- v2.2 (D): lamp light reverted to the v2.0 soft smooth glows (gold, alpha up to 80; no bands or dither). Kept the deep blue-teal night grade (12,22,34, alpha up to 210), the stronger 16-frame flicker and the ambient animations. Added the character readability pass (night cap plus warm and cool rim light). v2.1 script kept as make_v2.1.py.
- v2.1: D night grade is now deep blue-teal and darker, with banded and dithered lamp light and stronger flicker. Curtains have 8 frames with a 4px sway; basil has 8 frames with a 2px sway plus leaf tips. Added dust motes (A), mug steam and 16-frame GIFs. Added 4-direction walk cycles for all 4 characters (Croissant included), 4-direction idles for Camille and Noé, and walk_preview.gif. v2.0 script kept as make_v2.0.py.
- v2.0: first polished A and D.
