# Rev 2.1 (night polish, slots unchanged)
- Close-night wall falloff and the multiply lift now use 3 flat, larger bands (no checker dither) around the minuterie and radiator. Still bulb-sourced and below the glass, no in-air glow. The floor pool keeps its 4 dithered steps. The slot table below is regenerated from the manifest and matches rev 2.

# Rev 2 changes (Croissant review)
- prop.door_home_closed/_open: heart is bigger (5x4, rows 4-7); peephole moved down 1 px; mail-slot plate unchanged. Size, anchor, position unchanged (26x42, (78,128)).
- prop.doormat_home: 20x3 -> 22x4, anchor (11,3), at (78,132). Red border, gold field, pink/orange diamonds. No text.
- NEW prop.shoes 9x3 feet-anchored at (62,133). NEW prop.umbrella 5x17 feet-anchored at (100,128), leaning by the 411 door. Plant stays at (59,131).
- NEW prop.stairs_down 36x34 topleft at (156,110). Local y18 is the landing floor line. 4 treads (7x4) go down to the left into a dark void, with their own rail, balusters and a brass-capped newel. Slots: top_step (26,18), step_3 (5,30). Sits at the bottom right, outside the medium and close crops.
- prop.ceiling_bulb_on/_off: 7x72 -> 7x96 with a longer cord; the glass is now at y90-95, BULB_C (104,93). The bulb is now inside the close crop.
- Night light: removed the door rectangle lift, the 2-step lift and the rail catch-light. Multiply is now a 4-step dithered warm lift of 0.42 (ellipse 40x34 at x104,y128) below the glass. Add is a dithered 4-step floor pool up to 64 (36x7) plus a wall falloff up to 22 (30x22 at y116), below the glass only. No in-air glow.
- prop.pipe_h: 64x3 tiling bar -> 68x10 run under the cornice at (5,2). It tees off the riser and elbows up into the ceiling, with silver clips. No longer tiled. prop.pipe_run collars are now silver wall clips.
- prop.wall_lamp: redrawn as a 7x9 sconce with a backplate and arm. Removed from the default layout; the asset is kept.
- prop.minuterie_off/_on: 3x4 -> 5x7 white plate with a grey edge and a round push button, at (95,108). The night emitter is now placed from the piece size, not a hard-coded spot.
- Checks: check_manifest OK (78 assets, 3 atlases); check_palette 24/28 used, none off-palette.

# Stairwell / 4th-floor landing set: slots for Le CTO (Pixel Studio)
Stage 192x144 (same as kitchen + rooftop). horizon y128 (tomette floor starts), feetLine y136, backBase y131, doorBase y128 (doors stand on the landing edge), chair rail y92 (wainscot y94-125, skirting y124-127).
Ids are `<id>.<variant>` (day/evening/night), each with `file: pieces/<variant>/<file>.png`. States are separate ids (3-part name rule).
**Naming:** the manifest pattern forbids digits in the middle part, so the apartment door is `prop.door_home_*` (= door 411) and its mat `prop.doormat_home`.
Anchors bottom-centre unless noted; position = anchor point in stage px (top-left = pos - anchorPoint). `prop.stairs` anchor = newel foot (2,79).

| asset id | file | w x h | anchor (point) | stage pos | depth | tile | states / notes |
|---|---|---|---|---|---|---|---|
| backdrop.stairwell | backwall.png | 64x128 | topleft (0,0) | free (not placed) | 0 | x, 64 |  |
| backdrop.stairwell_floor | floor.png | 64x16 | topleft (0,0) | free (not placed) | 0 | x, 64 |  |
| prop.pipe_run | pipe_run.png | 3x124 | baseline (1,123) | (4, 123) | 1 | - |  |
| prop.door_home_closed | door_home_closed.png | 26x42 | feet (13,41) | (78, 128) | 2 | - | apartment 411 (home). plate = 3 abstract dots, no digits slots {doorway: {x: 13, y: 41}, peephole: {x: 12, y: 10}} |
| prop.door_home_open | door_home_open.png | 26x42 | feet (13,41) | free (not placed) | 2 | - |  slots {doorway: {x: 13, y: 41}} |
| prop.door_neighbour_closed | door_neighbour_closed.png | 26x42 | feet (13,41) | (22, 128) | 2 | - |  slots {doorway: {x: 13, y: 41}} |
| prop.door_neighbour_open | door_neighbour_open.png | 26x42 | feet (13,41) | free (not placed) | 2 | - |  slots {doorway: {x: 13, y: 41}} |
| prop.doormat_home | doormat_home.png | 22x4 | feet (11,3) | (78, 132) | 3 | - |  |
| prop.doormat_plain | doormat_plain.png | 20x3 | feet (10,2) | (22, 131) | 3 | - |  |
| prop.mailboxes | mailboxes.png | 22x20 | baseline (11,19) | (46, 112) | 1 | - |  slots {box_411: {x: 11, y: 6}} |
| prop.mailboxes_letter | mailboxes_letter.png | 22x20 | baseline (11,19) | free (not placed) | 1 | - |  |
| prop.notice_board | notice_board.png | 20x14 | baseline (10,13) | (46, 84) | 1 | - |  |
| prop.minuterie_off | minuterie_off.png | 5x7 | baseline (2,6) | (95, 108) | 1 | - | timer switch; pressing it = bulb on for N seconds |
| prop.minuterie_on | minuterie_on.png | 5x7 | baseline (2,6) | free (not placed) | 1 | - |  |
| prop.ceiling_bulb_on | ceiling_bulb_on.png | 7x96 | topleft (3,0) | free (not placed) | 1 | - | cord may be cropped from the top for a lower ceiling |
| prop.ceiling_bulb_off | ceiling_bulb_off.png | 7x96 | topleft (3,0) | free (not placed) | 1 | - |  |
| prop.wall_lamp | wall_lamp.png | 7x9 | baseline (3,8) | free (not placed) | 1 | - |  |
| prop.landing_window | landing_window.png | 22x30 | baseline (11,29) | (133, 77) | 1 | - |  |
| prop.radiator | radiator.png | 16x14 | feet (8,13) | (104, 127) | 2 | - |  |
| prop.plant_landing | plant_landing.png | 10x18 | feet (5,17) | (59, 131) | 3 | - |  |
| prop.parcel | parcel.png | 9x7 | feet (4,6) | free (not placed) | 3 | - | delivery beats; also usable as handprop (handPoint top centre) |
| prop.stairs | stairs.png | 78x80 | feet (2,79) | (114, 130) | 2 | - | 12 steps of 6x5 px rising right from local x4; step i tread top y = h-1-(i+1)*5+1; anchor = newel foot slots {step_0: {x: 7, y: 75}, step_5: {x: 37, y: 50}, step_11: {x: 73, y: 20}} |
| prop.pipe_h | pipe_h.png | 68x10 | topleft (0,0) | (5, 2) | 1 | - | rev2: tee off the riser at x4, runs right, elbows up into the cornice; runs under the cornice, out of the medium/close upper wall clutter |
| prop.shoes | shoes.png | 9x3 | feet (4,2) | (62, 133) | 3 | - | rev2 home cue; recolour red_sh for other pairs |
| prop.umbrella | umbrella.png | 5x17 | feet (2,16) | (100, 128) | 2 | - | rev2 home cue; leans on the wall; recolour green pair |
| prop.stairs_down | stairs_down.png | 36x34 | topleft (0,0) | (156, 110) | 3 | - | rev2 down-flight to the street: local y18 = landing floor line; 4 visible treads 7x4 going down-left into the void; arrivals rise from bottom-left of the piece slots {top_step: {x: 26, y: 18}, step_3: {x: 5, y: 30}} |
States: door_home closed/open, door_neighbour closed/open (recolour for other flats), doormat_home/plain, mailboxes/mailboxes_letter, minuterie off/on, ceiling_bulb off/on.
Stairs: 12 steps of 6x5 px, step i tread top (local) y = 79-(i+1)*5+1, x from 4+6i; stage = local + (pos - anchor) = local + (112, 51). Cast on the stairs: put feet on a tread top (step_0/5/11 slots given); a character walking up rises 5 px per 6 px in x. The flight exits off the right edge (x192) = 'going up to the 5th'. Down-flight: prop.stairs_down at (156,110), 4 treads 7x4 going down-left from the landing (local y18 = floor line), slots top_step/step_3.
Bulb: cord top (104,0), glass y90-95 (centre 104,93); cord can be cropped from the top. Night: bulb_on + minuterie_on drawn UNGRADED after the light pass; window pane always ungraded.
Draw order: wall -> floor -> pipe/pipe_h/notice/mailboxes/minuterie (wall_lamp optional) -> doors/stairs/radiator -> mats/plant/shoes/umbrella/parcel/stairs_down -> [light multiply+add] -> window pane, bulb_on, minuterie_on (ungraded) -> cast (map 0.25/0.6, add 0.6) -> hand props.
Light: `light/golden.json` (evening, multiply only: warm base + skewed sun patch from the landing window onto stairs/landing). `light/soir.json` (night: teal cool base x1.25 + add map; out = clamp(src*multiply + add), half values, decode x2): floor pool 4 dithered steps max 64 under the bulb, wall falloff 3 flat bands max 22 below the glass, multiply lift 3 flat bands 0.42 below the glass; no in-air glow.
Cameras (3-shot): wide 8x from (2,12) (both doors, mailboxes, bulb, window, stairs); medium 12x from (44,56) (mailboxes edge, 411 door, minuterie, bulb, window, stairs foot); close 18x from (60,85) (411 door + mat + radiator, two-hander).
Reuse beats: neighbours meeting (both doors + mats), deliveries (parcel on the mat / as handprop), Madame Martin at the mailboxes (box_411 slot, letter state), leaving for work (door_home_open, stairs), coming home late (night, minuterie_on + bulb_on).
