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

- full when `R ≥ 0.9` (the band from 0.85 up to 0.9 stays full)
- wilting when `R < 0.85`
- dormant (leaves fallen) when `R < 0.5`
- empty when nothing in the pot is unlocked yet

The stem follows the median stability `S` of unlocked items. Roots follow how many distinct scenes those words have been met in. Both are visual only. The screen never shows `R`, `S`, or a score.

A failed recall (FSRS grade 1, Again) turns one leaf yellow for a moment and says « On l’arrose bientôt. » There is no red X on the garden.

## Grown

A word is grown when its stability is at least 7 days and it has at least 2 successful recalls. A pot is grown when at least 80% of its words are grown (28 of 35, for example). A wilted or dormant pot still counts as grown. Locked words count in the total, so they count as not grown.

`isPotGrown(n)` (`A411.Pots.isPotGrown` and `A411.isPotGrown`) answers that for pots 1–5. The 4-of-5 episode gate and the slice-of-life pool are not built yet.

## Saves

`learn.garden.v` becomes 3. Migration is idempotent and runs from `Learn.ensureGarden` after the older v1/v2 plant migration. A plant that was `dead` comes back `dormant` (`forceDormant` on pot ① for the week-1 plant, pot ② for the week-2 seedling) until the next watering or a successful recall. Review history is kept.

Before Day 10 is finished, the desk still shows the old windowsill. After `storyDone(10)`, watering opens the fixed five-pot screen. Day 11’s watering is that screen. The screen does not scroll. Tapping a pot lists the words already met and the scenes they came from.

## Day 10 and Day 12

Day 10 « La clé » is the first visit: dry pots, weeds, an old chair, a faded sign with no readable text, then the basil in pot ②. Day 12’s final line edits live in `js/day12.js` and are applied when that episode exists. This build does not include the supérette arc.
