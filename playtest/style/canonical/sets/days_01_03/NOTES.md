# Days 1–3 pack (days_01_03): Pixel Studio, 2026-10-26
Original code art, 28-colour palette, $0. `python3 gen_days.py` writes only into this folder. Check: `python3 check_manifest.py`.
Lights: props graded with the room (mul 1.0 + add); cast/cat graded at mul 0.25 / add 0.6. Kitchen layer order: room, props, pendant_on (night), cast.

## Pot ① « Chez nous » (desk), G-POT-DESK
- Keys: `prop.pot_desk_{sprout,young,full}.{day,evening,night}`. Each is 10×17, baseline anchor (5,15); row 16 = desk contact shadow. Same footprint, so stages swap in place. Variants share the same pixels (graded in code, like the rooftop pot).
- Slot kitchen_desk (177,118), x172–181. Clear of the laptop (~165) and the cat keyboard spot (163).
- Proposed stage per day: Days 1–3 sprout, Days 4–5 young, Days 6–7 full (full = the plant Martin waters on Day 7).
- **Engine: skip the drawn-in kitchen `prop.plant` at (177,118)** whenever a pot_desk key is drawn (or drop it from the kitchen layout). Approved room files are unchanged.
- Day 1 desk is `prop.desk_bare.any` at (166,131).

## Croissant
- `croissant.sleep_curl.0/.1`, 14×12, feet (6,11). Slot kitchen_desk (166,119). Draw order: desk_bare, pot_desk_sprout at (177,118), cat. `croissant.sleep_curl.loop` = 1400/1000 ms.
- `croissant.in_box.{idle,twitch,tail_a,tail_b,tail_c}`, 18×12, feet (9,11). New box: `prop.box_cat_back.any` / `prop.box_cat_front.any`, 18×12, baseline (9,11), drawn at the same top-left (x−9, y−11). Order: back, cat, front. Sequences: `in_box.loop` idle/twitch 1800/160 ms; `in_box.tail_pop` a/b/c 140/140/900 ms (hold on c, then return to the loop). The old box_open (13×7) is too small for a cat.
- `croissant.drink.0/.1`, 14×12, feet (6,11): crouched, head down at the bowl rim; .1 = lap (tongue). `prop.cat_bowl.any` / `prop.cat_bowl_ripple.any`, 7×4, baseline (3,2), slot kitchen_floor (40,136). Cat feet at bowl x+5, same y. Draw the bowl AFTER the cat; use ripple with frame .1. `drink.loop` = 260/200 ms.

## Noé
- `noe.finger_to_lips.0` (brows up) / `.1` (eyes wide), 16×24, feet (8,23). `noe.finger_to_lips.loop` = 900/700 ms.

## Parcels, G-PARCEL-FLOOR
- `prop.parcel_closed_floor.any`: 16×11, baseline (8,9), parcel_closed plus a baked shadow row. Slots: kitchen_floor (60,136), doormat_home (78,132). Recommended.
- `prop.parcel_shadow.any`: 16×1, at (parcel x−8, feet y+1) under the plain parcel_closed.
- `prop.parcel_pair.any`: 22×11, baseline (11,9), with shadow. Slots: doormat_home (78,132), kitchen_floor (60,136).

## P0 props for the D1–3 playtest (redone 2026-10-27 after the snapshot restore). Atlas `days_props2` (48×13), script `gen_days_p0.py` (gen_days.py runs it last; it merges into manifest.json)
Contact: a hard 1 px row, no alpha. Table props have a **baked ink #4a3328** last row, because the table top y120–121 is wood #885939. The wall calendar has no contact row.
- `prop.wall_calendar.{day,evening,night}`: 12×13, frame (0,0), topleft (5,0). Same pixels for every variant, graded with the room. Slot `kitchen_wall_calendar` (126,74), covering x121–132 y74–86. Moved +6 from the Rev 3.1 mark (120,74) because the night pendant cord at x118 crosses it, so Le CTO should update the mark.
- `prop.toast_plate.any`: 12×6, frame (35,0), baseline (6,4), slot `kitchen_table_top` (118,119). Hide cup/milk/plate. Registry alias for handprop.toast_plate.
- `prop.jam_jar.any`: 6×9, frame (28,0), baseline (3,7), slots `kitchen_table_top` (118,119) and `kitchen_table_jam` (112,119), the latter when the card is shown too. Hide cup/milk/plate. Registry alias for handprop.jam_jar.
- `prop.parcel_closed_table.any`: 14×11, frame (13,0), baseline (7,9), slot `table_parcel` (118,119). It is sitcom prop.parcel_closed plus the ink row.
- Verdict: parcel_closed_floor is not reused on the table. Its contact row is alpha-90 wood, and it is 16 wide. The older alpha-90 rows (parcel_closed_floor/pair/shadow, pot_desk_*, cat_bowl) are left unchanged so approved frames stay as they are.
- Composites: `composites/p0_props_*.png` and `contact_sheet_p0_x8.png`.
