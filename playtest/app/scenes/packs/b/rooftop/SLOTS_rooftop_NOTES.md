# Rev 2.1 (2026-10-25): night-only polish. NO slot sizes or positions changed.
- Pot ① at night: the self-glow is down about 30%. Hero add 40 → 28, hero multiply 1.0 → 0.85, floor pool 84/48 → 59/34. Night paint: body orange/orange_sh (was gold/orange), band sky with a grey shade (was white/sky), pink heart unchanged. It is still the brightest prop at night.
- Night skyline rims are one notch stronger. Far row: rim navy → grey (dithered), plus the chimney and dome tips. Near row: solid grey roofline, a dithered grey line under it, silver chimney-pot tips, and grey chimney caps and left edges (were navy).

# Rooftop set — rev 2 (2026-10-25), after Croissant's review

## Changes in rev 2
- **Pot ① `prop.pot_chez_nous_{sprout,young,full}`**: 14×26 (was smaller). Night colours lifted: the body is gold/orange, the band is white/sky, and the heart is 6×4. The growth stages are clearly different, and the full stage has flowers. Night map: a floor pool (ellipse 12×4.5 at 70,135, add 84/48), plus a lift of multiply 1.0 and add 40 masked to the pot silhouette (top-left 63,109). This makes it the brightest prop at night.
- **`prop.string_lights`**: 83×10. Bulbs every 11 px, sag 5. The catenary wire is on row sag+1: grey when on, dark when off. Grey anchor rings sit at both ends. The strand is at (44,88), between the door bracket and the pole.
- **`prop.light_pole`**: 5×46 with a crossarm. The hook slot moved to (0,2). Pole at (128,131).
- **`prop.roof_door`**: adds an iron bracket as the left anchor. Door at (30,131).
- **Skylines**: the far row has chimney stacks with dithered cool rims. The near row has framed windows (4×5 frames every 6 px), dormers, and chimney pots with a grey rim at night. The lit windows sit inside the frames.
- **Garden**: `prop.pot_round` is 12×20 (a geranium when planted). `prop.trough_*` is 28×16, with herbs or tomatoes in `trough_planted`. New `prop.trough_flowers` (geraniums). New `prop.ivy`, 12×10, anchored top-left. `prop.pot_tall` is 12×32 (olive).
- **Layout**: ivy at (58,116), (88,116), (112,116), (156,116). Troughs: planted (66,117), flowers (100,117), planted (152,117). Tall pot (52,131). Bench (100,131). Round pots: planted (140,131) and (162,131), empty (178,131). Pot ① young (70,134). Watering can (84,135).
- **Cameras and cast**: the medium camera origin is now (40,56) (was 46,56). Cast moves: medium lefevre to 122, close noe to 84, wide lefevre to 138. The seated poses are unchanged.
- **Assets**: the manifest now has 75 assets and 3 atlases.

---
# Rooftop garden set: slots for Le CTO (Pixel Studio)
Stage 192x144 (same as the kitchen). horizon y128 (deck starts), feetLine y136, backBase y131, parapetTop y116.
Ids are `<id>.<variant>` (day/evening/night); each has `file: pieces/<variant>/<file>.png`. State/frame variants are separate ids
(the manifest name pattern allows only 3 parts, so `pot_1.sprout.day` is impossible -> `prop.pot_chez_nous_sprout.day`).
Anchors: bottom-centre (`feet` / `baseline`) unless noted topleft. Position = anchor point in stage px. top-left = pos - anchorPoint.

| asset id | file | w x h | anchorPoint | stage pos | depth | tile | states / notes |
|---|---|---|---|---|---|---|---|
| backdrop.rooftop_sky | sky.png | 192x116 | topleft (0,0) | (0,0) | 0 | x, 192 | UNGRADED; day clouds / evening sunset bands + sun / night stars + crescent |
| backdrop.rooftop_skyline_far | skyline_far.png | 96x80 | (48,79) | tiles from x=-56 (offset 40 vs near), baseline y115 | 0 | x, 96 | UNGRADED; distant blocks + small dome |
| backdrop.rooftop_tower | tower.png | 17x66 | (8,65) | (118,92) | 0 (between far and near skyline) | - | UNGRADED; generic lattice tower, move freely in x |
| backdrop.rooftop_skyline | skyline.png | 96x80 | (48,79) | tiles from x=0, baseline y115 | 0 | x, 96 | UNGRADED; zinc mansards, chimney pots, lit windows at night |
| backdrop.rooftop_floor | floor.png | 64x16 | topleft | (0,128) | 0 | x, 64 | zinc/tar deck |
| prop.parapet | parapet.png | 32x12 | (16,11) | tiles from x=0, baseline y127 (rows 116-127) | 1 | x, 32 | slot coping_top y0 (= stage y116) for troughs/pots/cat |
| prop.roof_door_closed / _open | roof_door_closed/open.png | 32x44 | (16,43) | (22,131) | 2 | - | stair-head; slot doorway (16,43), strand_hook (31,2) |
| prop.light_pole | light_pole.png | 4x46 | (2,45) | (150,131) | 2 | - | slot hook (1,0) |
| prop.bench | bench.png | 30x13 | (15,12) | (100,131) | 2 | - | **sit line = local y5 = stage y124** (seat top). seat_l (8,5), seat_r (21,5), cat (15,5) |
| prop.pot_chez_nous_sprout / _young / _full | pot_chez_nous_*.png | 12x20 | (6,19) | (70,134) | 3 | - | pot 1 « Chez nous »: terracotta + sky-blue band + pink heart; growth stages |
| prop.pot_round_empty / _planted | pot_round_*.png | 10x16 | (5,15) | (179,131) / (166,131) | 3 | - | generic pots 2/3: recolour band row y11 |
| prop.trough_empty / _planted | trough_*.png | 26x10 | (13,9) | (132,117) on the coping | 3 | - | green; recolour to plum/navy pairs |
| prop.pot_tall_empty / _planted | pot_tall_*.png | 10x26 | (5,25) | (46,131) | 3 | - | zinc planter + small olive tree |
| prop.arrosoir | arrosoir.png | 13x9 | (6,8) | (81,135) | 3 | - | dented zinc can on the floor |
| handprop.arrosoir | arrosoir_hand.png | 13x9 | (6,8) | in hand | 5 | - | tilted pouring; handPoint (4,0) |
| prop.string_lights_off / _on | string_lights_*.png | 112x11 | **topleft** (0,0) | (37,90) = door strand_hook; right end lands on the pole hook (148..149,85-90) | 6 | - | bulbs every 12 px from x4, sag 6. on = night emitter, drawn UNGRADED |

Draw order: sky -> skyline_far -> tower -> skyline (all ungraded) -> deck -> parapet -> door/pole/bench -> pots/troughs/arrosoir -> [light multiply+add on these graded layers] -> string_lights_on (night, ungraded) -> cast (map at 0.25/0.6, add 0.6) -> hand props.
Light: `light/golden.json` (evening, multiply only), `light/soir.json` (night multiply + add, out = clamp(src*multiply + add), maps at half values, decode x2). Bulb positions listed in soir.json `lamps[string_lights].bulbs`.
Cameras (3-shot): wide 8x from (2,12); medium 12x from (46,56); close 18x from (60,85) (pot 1 + bench pair).
