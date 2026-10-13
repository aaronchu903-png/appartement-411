# Garden

The rooftop garden replaces the windowsill from Day 10 on. One pot is one word set. A module (a week of the story) is only a grouping for the plot. It is not a pot.

Act I has five pots, 160 items, and no item in two pots (`js/pots.js`, from `ACT1_POTS`):

| Pot | Name | Where |
|---|---|---|
| ① | Chez nous | indoors, on the desk (Madame Martin’s plant) |
| ② | À table | rooftop; the Day 10 basil |
| ③ | La supérette | rooftop |
| ④ | Le quartier | rooftop |
| ⑤ | Les gens | rooftop |

## Leaves, stem, roots

Plants never die. A missed day does not delete history and does not kill a pot.

Leaves follow the mean FSRS retrievability `R` of the pot’s unlocked items. `R` is recomputed when the garden is opened, not on a timer.

- full when `R ≥ 0.9` (« Elle est bien. »)
- steady, the mid state, when `0.85 ≤ R < 0.9` (« Elle tient. »). This band is not full.
- wilting when `R < 0.85` (« Elle a soif. »)
- dormant (leaves fallen) when `R < 0.5` (« Elle dort. »)
- empty when nothing in the pot is unlocked yet

`R = 0.9` is full. `R = 0.85` is steady. `R = 0.5` is still wilting, because dormant starts below 0.5.

The stem follows the median stability `S` of unlocked items. The sprites have four heights (`stem_1` … `stem_4`): stage 1 when `S < 2`, stage 2 when `S < 7`, stage 3 when `S < 21`, and stage 4 otherwise. The leaf file uses that same stage. Roots follow how many distinct scenes those words have been met in: none below 1, `roots_1` below 2, `roots_2` below 4, and `roots_3` from 4 up. Both are visual only. The screen never shows `R`, `S`, or a score.

Steady leaves use the full leaf sprite. The pack has drawings for full, wilting and dormant, and the steady caption stays « Elle tient. ». Wilting uses the drooping stem. Dormant is a bare stem with one bud. A missed answer swaps in `leaves_flash_N` for a moment.

## Art

Pixel Studio’s garden v1 lives in `art/garden/`. `manifest.json` is the source of part sizes, prop anchors, and the five slot positions. Parts share an 18×52 canvas, drawn at 72×208 with nearest-neighbour scaling. The pivot (9, 52) sits on the pot-bottom centres (39, 720), (117, 720), (195, 720), (273, 720) and (351, 720). Layers are `pot_back`, then `roots_1`–`roots_3`, then the stem, then the leaves of the same stage, then `pot_front`. Labels are Noto Sans in each slot’s label area, from y = 740.

The five-pot screen uses `garden_bg_390x844.png`. This pack has no night plate for that screen. A later manifest can name `garden_bg_night` and a `pot_tint_multiply_rgb`, and the painter will use them.

The rooftop backgrounds are `rooftop_day.png` and `rooftop_night.png` (192×256). Props are drawn on top from bottom-centre anchors. The first visit and the tidy roof are placed in `GardenArt.ROOF_LAYOUT` until the manifest grows a `rooftop.scenes` table and composed files (`rooftop_day_firstvisit`, `rooftop_night_tidy`, and the other two). A composed file replaces the code placement for that scene. Walkable tiles are y ≥ 96 and x 4..187. Props block their tiles, and the hatch at (84, 236) stays open. The entry is (15, 5), the left tile of that door. A file named in `manifest.files.walkable` replaces the generated grid. Croissant has no sprite in this pack. The wood sign is blank.

A failed recall (FSRS grade 1, Again) turns one leaf yellow for a moment and says « On l’arrose bientôt. » There is no red X on the garden.

## Grown

A word is grown when its stability is at least 7 days and it has at least 2 successful recalls. A pot is grown when at least 80% of its words are grown (28 of 35, for example). A wilted or dormant pot still counts as grown. Locked words count in the total, so they count as not grown.

`isPotGrown(n)` (`A411.Pots.isPotGrown` and `A411.isPotGrown`) answers that for pots 1–5. The 4-of-5 episode gate and the slice-of-life pool are not built yet.

## Saves

`learn.garden.v` becomes 3. Migration is idempotent and runs from `Learn.ensureGarden` after the older v1/v2 plant migration. A plant that was `dead` comes back `dormant` (`forceDormant` on pot ① for the week-1 plant, pot ② for the week-2 seedling) until the next watering or a successful recall. Review history is kept.

Before Day 10 is finished, the desk still shows the old windowsill. After `storyDone(10)`, watering opens the fixed five-pot screen. Day 11’s watering is that screen. The screen does not scroll. Tapping a pot lists the words already met and the scenes they came from.

## Day 10 and Day 12

Day 10 « La clé » is the first visit: dry pots, weeds, an old chair, a faded sign with no readable text, then the basil in pot ②. The visit walks in three goals, one at a time. Noé stands by the rooftop door and says « La petite porte, là-haut ! »; the door glows, the climb from the spawn is at most 8 tiles, and Croissant runs ahead once. On the roof he says « Un pot vide… là-bas ! » at the empty pot. After the player chooses a line for the dry soil, Camille points and says « L’arrosoir… près de la chaise. » Each roof walk is at most 8 tiles, with one small event on the way. The first walkable moment on a profile shows a small hand that taps the target twice, then never again (`a411.p.<id>.tapHand`). The next target breathes a slow glow. After five seconds with no tap, Croissant walks to that target, sits, and looks at the player. The hand, the glow, and the cat stay off hidden mechanics. Every object tap answers at once with a soft sound and a tiny wiggle, and a floor tap always walks to a walkable tile. The narration at the door is « La clé tourne. La porte s’ouvre. » Noé’s line at the pot is « Ici ? ». Day 12’s final line edits live in `js/day12.js` and are applied when that episode exists. This build does not include the supérette arc.

## Day 10 band lines and letter 10

The Tuesday-morning lines are the director text in `js/day10.js`. One of them plays, from the Day 7 band: `d10_cam_a` (A), `d10_cam_b` (B), `d10_cam_c` (C), or `d10_cam_null` (no band). They do not name an ending, and nothing after that line changes.

Letter 10 is a « Mot » to Madame Lefèvre, slipped under her door. The French lives in `js/day10-letter.js` so a later wording fix stays in one file. Straight apostrophes and ordinary spaces are normalized on load (’ and U+202F). The note uses the polite conditional: voudriez, pourrais, pourriez. The signature is « Le 411 (et Croissant) ». The line « P.-S. Noé voudrait du café. Toujours. » is added after that signature only when the step-30 choice `d10_eau` was `cafe`. No reply is written here. The fridge list stays as the night rooftop art, not as the letter. The grammar card is `conditionnel_politesse`.
