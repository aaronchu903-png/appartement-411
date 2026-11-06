# L'Appartement 411 — Character Bible (first draft, 2026-10-15, Pixel Studio)

Compiled **only from existing assets**; no new art was drawn. Sheet: `character_bible_sheet.png` (idle at 8x + colour swatches, built by `character_bible_sheet.py` from the files below).
Sources read: live game `js/art.js` (newest build checked: `/tmp/v132`, commit 8f12367; `/workspace/appartement-411` is at f092434 with the same SPR), hub/top-down sprites (`/workspace/a411-pages/prototype/hub/assets/characters/`, `a411-team/hub_day8_9/`, `a411-team/topdown/styles/base.py` + `hub_day8_9/chars_src.py` `person2`), Samir (`a411-team/samir/`), Inès (`a411-social/props/boulangerie/`), minigames/Day 7/8/11 folders, shorts set C (`a411-team/vector/C/`, `list_appart/cuisine/layers/`).

## 0. Three art tiers (know which one you are drawing for)
| Tier | Where | Character canvas / anchor | Palette | Outline |
|---|---|---|---|---|
| **A. Live game scenes** | `js/art.js` `SPR` + `person()`/`arms()` on the 96x64 stage | 12x18 grid (+1 row shadow: `PERSON_W 12, PERSON_H 19`); drawn at top-left x,y; feet = rows 15–17 | `art.js PAL` (people) / `PP` (props) — **not** palette_a411 | none (flat 1 px) |
| **B. Hub / top-down & new character work** | 16 px tiles, 3/4 view; Samir, Inès, Lefèvre poses, Day 8/11 | **18x32, feet anchor (9,31)**; wide poses 24x32 / 30x32 keep (9,31) | `palette_a411.hex` (23 colours) + Croissant eye `#22303A` | 1 px ink `#2B1E2F` ring (`base.outline`) |
| **C. Shorts set C** | `vector/C/gen_c.py`, Remotion shorts | art.js grids ×30 (human 12x18 → 360x540 in 420x570 canvas; cat 10x8/12x10 → 360x300) | art.js PAL (+ `q #C2463E` for Noé) | none |
Close-ups (Day 11 style, 96x64 "art.js stage"): palette_a411, ink outline on figures, `stage()` wall/floor, ordered-dither lamp warmth (see §G).

---
## 1. Camille (flatmate)
- **A (art.js `camille`)**: hair `h #3b2a20` (short, rows 0–5), skin `s #f1c7a5` / shade `S #c98e6b`, eyes `e #1d1d1d`, mouth `m #b5524b`, sweater `g #2f7d5b` / `G #24624a` (two shade dots row 11), trousers `p #2c3555`, shoes `b #1e1e24`. Head rows 0–7 (8 px), body 8–12, legs 13–17. Arm sleeve colour in `arms()` = `PAL.g`.
- Poses (art.js `arms()`): idle, point, wave, ask, pointPlant, can (holds house watering can), shh, cross, pointUp, happy, sad. Static (no frame timing).
- **B (hub `camille_*`)**: 18x32, (9,31). `CH['camille']`: hair `ink #2B1E2F` long (`long=True`, hairD `shadow`, hairL `bark`), orange hair-clip `#E07B39` (`clip`), shirt `basil #6F9A4E` / `shadow #4A3550`, legs `zinc #3E5A78`, eyes cocoa `#6E4330` with paper glint, skin `#F6D2B4` / blush `#E0A987`. Head = ellipse rows 0–15, torso 15–25, legs 25–31.
  - Files: `camille_idle_{down,up,left,right}_{0-3}.png` (0 rest, 1–2 breath dip 1 px, 3 blink), `camille_walk_{dir}_{0-3}.png`. Timing (hub `room.json`): walk 90 ms/frame, ambient 150 ms.
  - Boulangerie customer (tier B rig, 20x32, (9,31)): `a411-social/props/boulangerie/characters/camille_{point,pay,receive}_up_{0-3}.png`, ms in that manifest.
- **C**: `vector/C/camille/*` (parts + 6 expressions: neutral, happy, sad, shocked, big-eyes, blink).
- Do: clip on her left side, long dark hair covers the back in up view. Don't: give her the hub's black hair in tier A, or the short tier-A cut in hub art (see §I).

## 2. Noé (flatmate)
- **A (art.js `noe`)**: spiky hair `H #7a4a22` (brown, 4 spikes row 0), skin `s`/`S`, shirt sleeves `o #e2873a` + white front `w #f4efe6` (reads as orange shirt + white apron/vest), trousers `O #b8642a`, shoes `b`. Sleeve colour in `arms()` = `PAL.o`.
  - Variants: Day 7 orange-sweater `day07/enrich/noe_pull_{0,1}.png` (sweat drop `#4aa3df`).
- **B (hub `noe_*`)**: `CH['noe']`: hair `ember #A84E24` / `cocoa`, hairL `orange`, spiky, shirt `orange #E07B39` / `ember` (hub PNGs; `base.py` CH dict says `red`/`ember` — drift), paper apron front, eyes `basil #6F9A4E`, legs `shadow`.
  - Files: `noe_idle_{dir}_{0-3}`, `noe_walk_{dir}_{0-3}` (hub). Day 11: `minigames/day11/characters/noe_hand_tart_{0-3}` (30x32, (9,31)), `noe_hold_croissant_{0-3}` (18x32, breathing loop 500 ms), `noe_show_phone_{0,1}` (300 ms, hold). Boulangerie customer `noe_{point,pay,receive}_up_{0-3}` (20x32).
- **C**: `vector/C/noe/*` shirt `q #C2463E` brick red.
- Planned (Day 11 README "polish pass"): every Noé sprite gets a brick-red shirt `#C2463E` (shadow ember `#A84E24`) to separate him from Croissant's orange — **not yet applied** to hub/art.js.
- Do: keep him clearly not-orange next to Croissant once the polish lands. Don't: mix brown (A) and ginger (B) hair in one scene.

## 3. Player
- Tier B only (tier A scenes are first-person; no SPR.player). `CH['player']`: hair `bark #6B4A3A` / `cocoa`, hairL `tan`, shirt `zinc #3E5A78` / `shadow`, legs `cocoa`, eyes cocoa.
- Files: `player_idle_{dir}_{0-3}`, `player_walk_{dir}_{0-3}` (hub). Close-ups use the player's hand: `skin #F6D2B4` / `blush` (Day 11 `key_hand_pocket`, `key_fingers_closed`).
- Do: neutral, no accessory. Don't: give the player a face in close-ups.

## 4. Madame Lefèvre (downstairs neighbour)
- **A (art.js `voisine`)**: grey bun `a #c4c4cc` / `A #8e8e98`, glasses `l #5a5a66`, skin `s`/`S`, plum cardigan `v #7a3f6e` / `V #5e2f55` with white collar dots `w`, skirt `q #3a3a48`, shoes `b`. Sleeve colour `PAL.v`.
- **B (hub `lefevre_*`)**: "palette approximations" (hub README): hair `stone #F2E3C6` / `sand #D9C09A` (bun), glasses `zinc #3E5A78`, cardigan `shadow #4A3550` with `cream #E8D2B0` blouse and `gold #F6A54A` buttons, skirt `zinc`, skin `#F6D2B4` / blush.
  - Files: `lefevre_idle_{dir}_{0-3}`, `lefevre_walk_{dir}_{0-3}`, `lefevre_walk_preview.gif` (hub_day8_9 + hub assets). Day 8 handover `a411-team/day08/characters/lefevre_handover_{0-2}.png` (30x32, (9,31), facing right, ms 350/600/hold; arm = cardigan `#4A3550`, underside ink, cream cuff).
- **Close-ups (Day 11 `key_open_hand`, Day 8 `key_door_open_hand`)**: white hair `stone`, face skin `skinb #C98E66` / `umber`, eyes = 2 px `zinc` dashes (lowered), cardigan `shadow`, collar `cream`. 96x64, anchor (0,0).
- Signature: bun, glasses, cardigan, never explains, warm window. Do: gold key ring `#F6A54A`. Don't: grey hair in hub / white hair in tier A in the same sequence without noting it.

## 5. Madame Martin (landlady)
- **A (art.js `martin`)**: dark bob with grey `d #5a4a40` / `D #9a9aa2`, skin `s`/`S`, red scarf `R #b04a3a`, navy coat `t #2f4060` / `T #22304a` (two buttons row 11), trousers `p`, shoes `b`. Sleeve colour `PAL.t`. Poses via `arms()`: idle, wave, point, happy (Day 7).
  - Day 7 walk (art.js style, leg rows only): `day07/enrich/martin_walk_{0-3}.png` 12x18, 180 ms/frame (frames 0/2 = SPR.martin).
- **Icon**: `a411-team/icons/act1_p3/martin_portrait.png` 16x16 (palette_a411: hair `bark`, coat `shadow`, scarf `red #C2463E`, skin `cream`).
- **No tier-B 18x32 sprite exists.** Don't invent one without this sheet.

## 6. Samir (supérette)
- Tier B, `samir/make_samir.py` (person2 + hook). 50s, short grey-brown hair `clay #A88B6A` / `bark`, moustache + beard line `bark`, skin `skinb #C98E66` / `umber`, blue work shirt `zinc` / `shadow`, green apron `basil` (top edge `bark`), cream collar, legs `shadow`, eyes cocoa.
- Files `samir/characters/`: `idle_{4 dirs}_{0-3}`, `walk_{4 dirs}_{0-3}`, `talk_{down,left,right}_{0-3}` (mouth open 0/2, loop 0-1-2-1), `handover_{down,left,right}_{0-3}` 24x32 (anchor (9,31); left = (14,31)), item centre per frame in `samir/manifest.json character.handover.hand_px`. Items `samir/items/` drawn at hand_px.

## 7. Inès (boulangère) — new 2026-10-14
- Tier B, `a411-social/props/boulangerie/make_boulangerie.py`. ~40, hair `bark` / `cocoa` with top-right bun and diagonal pencil (`gold` + `umber` tip + `blush` eraser), cream shirt rolled sleeves (`cream`/`sand`), floury forearms + nose tip (`paper` px), dark-blue apron `zinc #3E5A78` (Le Buzz confirmed), legs `shadow`, skin `skin`/`blush`, eyes cocoa.
- Files `boulangerie/characters/ines_{pose}_down_{n}.png`: idle(4) 450/160/160/120, talk(4) 110×3/140, point(4, 24 wide) 70/70/260/120, handover(4, 24 wide) 80/90/320/110, wrap(4) 100, cut(4) 110/70/90/130, take(4) take_from_vitrine 90/120/160/120, nod(2) 140/220, brush(2) brush_flour 110, wink(2) 260/520. hand_px per frame in manifest. Personality: brisk, quick hands, hums over wrap.

## 8. Croissant (the cat)
- **Eyes always `#22303A`** (art.js `k`; the one non-palette colour allowed in tier B).
- **A (art.js `cat`)**: 10x8, body `o #e2873a`, stripes `O #b8642a`, eyes `k #22303a`, nose `n #e79aa0`; tail column 9 rows 3–5. Variants: `catPeek` (10x4 head only), `catroux` prop, `perchCat()` placements. Tail never wags unless the beat calls for it.
- **B (hub)**: `croissant_idle_{0-3}` 18x15 side view (`orange #E07B39`, `ember`, `paper` chest, `red` collar, **eyes ink #2B1E2F**), `croissant_walk_{dir}_{0-3}`, `croissant_sit_{0-3}` 18x18 (9,17) front (eyes `#22303A`), `croissant_chair_{0-3}` 18x30 (9,29). Minigame set `minigames/croissant/cat_*` 28x18 anchor (13,17) (telegraph sequences + ms in `minigames/manifest.json sets.croissant_telegraph.sequences_ms`), `cat_sit_in_pot` 16x22 (900/300/900). Day 11 `croissant_on_feet_{0,1}` 24x10 (slow blink, tail still).
- **C (shorts)**: `list_appart/cuisine/layers/croissant_sit.png` = art.js cat padded to 12x10 ×30 (360x300; shadow row `#000000 @ alpha 46`). Reactions `a411-social/props/croissant_reactions/*` (head_tilt, little_hop, roll, big_happy_wiggle, purr_squint, ear_twitch, tail_flick, paw_press; 12 fps, ms in manifest). Happy eyes = `O` (art.js `happy` expr).
- Do: small, orange, expressive by silhouette. Don't: rotate sprites off-grid; never imply "staying" beyond the story band.

## 9. Others found
- **Passant** (art.js `passant`): fair hair `y #d8b46a`, grey coat `c #6a7488` / `C #4e5668`, trousers `p`. Street extra, neutral voice.
- **Prop cats** (art.js `PROPS`): `catgros` (big grey), `catnoir` (black, eyes `u`) — props on cards, not characters.
- **Biscotte** (Martin's cat): named in story only; **no art exists**.
- **FIG** (art.js figure cards 32x24): neutral grey person `PAL2` for name/greeting checks.

---
## G. Global rules
1. **Palette**: tier B/close-ups = `palette_a411.hex` 23 colours only (ink `#2B1E2F`, shadow `#4A3550`, bark `#6B4A3A`, zinc `#3E5A78`, sky `#7FA3C0`, stone `#F2E3C6`, sand `#D9C09A`, clay `#A88B6A`, window `#FFD27A`, gold `#F6A54A`, crust `#F9B566`, orange `#E07B39`, ember `#A84E24`, skin `#F6D2B4`, blush `#E0A987`, umber `#B97A5E`, skinb `#C98E66`, tan `#9A6244`, cocoa `#6E4330`, red `#C2463E`, basil `#6F9A4E`, cream `#E8D2B0`, paper `#FFF8EC`) + Croissant eye `#22303A`. Tier A uses art.js `PAL`/`PP` exactly; don't mix tiers in one image.
2. **Outlines**: characters & props in tier B = 1 px ink ring outside the shape (`base.outline`); shading inside = darker palette neighbour, shadowed side of a limb = ink. Tier A props/people = no outline (flat shapes, darker shade rows). Close-ups 96x64 = Day 11 `stage()` (cocoa floor, bark wall, tan floorboard lines every 12 px, tan ordered-dither lamp warmth x30–65) + ink outline on figures/props; reuse `key_open_hand` figure pixels where possible.
3. **Anchors**: tier B feet (9,31) on 18x32; wide poses extend the canvas to the right (24/30 wide) without moving the anchor; mirrored left poses state their anchor (Samir left = (14,31)).
4. **Frames**: idle 4 = rest, breath, breath, blink; walk 4 contact/pass (hub walk 90 ms); talk = mouth open on 0/2.
5. **Night**: tier B rooms = `light/soir.json` multiply (cool `[0.26,0.29,0.45]`, warm `[0.95,0.70,0.36]`, cap 1.2) applied in code, never baked; tier A = `rgba(20,24,58,α)` overlay in `art.js` (α 0.38–0.62 per scene).
6. **No text in art**, no pixel/bitmap fonts; all words are UI/code text (labels on sheets = Noto Sans). Blackboards, price tags, receipts, cards stay blank or carry unreadable marks.
7. **Plants never die**: droop/wilt/thirsty states only; the stem stays green; pots are always caught.
8. Hard pixels, nearest-neighbour scaling only, no rotation off the grid, no anti-aliasing.

## I. Inconsistencies found (to decide)
1. **Noé's hair**: brown `#7a4a22` (art.js / set C) vs ginger `ember #A84E24` (hub). Biggest cross-tier identity drift.
2. **Noé's shirt**: orange `#e2873a` (art.js), orange `#E07B39` (hub PNGs), red `#C2463E` (`base.py` CH dict and set C), brick-red polish announced in Day 11 README but not applied. Orange Noé clashes with orange Croissant.
3. **Camille's hair & top**: short dark-brown `#3b2a20` + green sweater (art.js) vs long black `ink` hair + orange clip + basil shirt mostly covered by hair (hub).
4. **Lefèvre**: grey hair + plum cardigan `#7a3f6e` (art.js) vs stone/cream hair + `shadow #4A3550` cardigan (hub, "approximations"); close-ups give her darker skin `skinb #C98E66` while her hub sprite uses `skin #F6D2B4`.
5. **Croissant eyes**: hub `croissant_idle_*`/walk use ink `#2B1E2F`, while sit/chair/minigames/art.js use `#22303A`. Hub idle also has a white chest + red collar that art.js/set C don't have.
6. **Two palettes in production**: art.js `PAL`/`PP` (e.g. skin `#f1c7a5`, orange `#e2873a`) vs palette_a411 (skin `#F6D2B4`, orange `#E07B39`); shorts props (palette_a411) sit on the art.js kitchen background (`a411-social/props/bg_kitchen.png`).
7. **Night filter**: art.js overlay alpha varies by scene (0.38 / 0.45 / 0.55 / 0.62; lights-off uses `rgba(20,24,48,…)`), vs hub multiply — no single standard.
8. **Madame Martin** has no tier-B sprite; her 16x16 portrait (palette_a411, red scarf `#C2463E`, coat `shadow`) differs from art.js (scarf `#b04a3a`, navy coat `#2f4060`).
9. **No tablier colour exists** in the game; Inès's apron `zinc` is the de-facto standard now.
10. **Repo drift**: `/workspace/appartement-411` (f092434) is behind the newest build seen (`/tmp/v132` 8f12367); character grids are identical, but Day 9+ art code only exists in the newer build.
