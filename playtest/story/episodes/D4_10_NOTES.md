> **FROZEN — LOCKED 2026-10-26 (Croissant).** Any change needs a Neng pass plus Croissant OK.

# Days 4–10 — conversion notes (2026-10-26, draft)

All seven files validate at **0 errors** (`check_episode.py`). Generators are in /workspace (d04.py–d10.py, helpers in h410.py).

## Loglines · high points · hooks
| Day | Title | Logline | High point | Hook → next day |
|---|---|---|---|---|
| 4 Thu | La voisine | The night noise brings the downstairs neighbour up. The flatmates apologise and become a team. | Croissant puts a paw on their three stacked hands | Three soft knocks: « À trois heures… la nuit ?! » |
| 5 Fri | La clé | A lost key hunt (d’abord / ensuite) turns up the cat's stash. | « Et trois chaussettes ! … Mes chaussettes ? » | The box is empty and the door is ajar: « Où est Croissant ? » |
| 6 Sat a.m. | Où est Croissant ? | A stairwell search, en haut / en bas. He's at Madame Lefèvre's. | « Je l’ai vu ! Il est là ! » / « Un petit chat roux… chez moi. Hm. » | « Des croissants… demain », and the cat's ears go up |
| 7 Sat | La visite | Martin visits. Croissant can **stay** (first said here). First watering. | Noé hugs the cat, who looks at Martin | The cat scratches the locked little door with moonlight under it: « En haut… c’est quoi ? » |
| 8 Mon | La clé du toit | Madame Lefèvre answers the question with the rooftop key. The garden opens at night. Pot ① goes up. Noé's basil takes the desk. | Night on the roof, three on the bench, Croissant already seated | Noé: « Et Croissant… sa chaise : là ! » — the cat claims seat_back_l as HIS |
| 9 Tue | Six heures | House rules, then Lefèvre's first visit at six. The cat claims her chair, and the old key sits on the table. | Her hand stops an inch from the key. The cat nuzzles her: « Et le basilic ? Il est content ? » | « Jeudi, venez chez moi. Six heures. », her eyes on the key / « Demain matin… le toit ! » |
| 10 Wed | Le jardin | The first daytime rooftop walk: a new leaf on pot ①, the arrosoir, the dry pots. In the evening there's no more bread. | Golden morning on the bench: Camille (who mocked it at 7:00) says « C’est beau, ici. » The wet cat leans on her | The calendar « Jeudi : Madame Lefèvre », « il n’y a plus de pain », Croissant waiting on her chair → D11 « Jeudi soir » |

D10 walking scene: walk_to stand_roof_door → stand_pot1 → stand_pots_r (Noé) and roof_step_top → stand_roof_door → stand_bench (Camille), then seat_bench_l/r. Lefèvre does not appear (she never goes up).

## Changes and why
- **Steering 4 swaps:** pot_desk_sprout (D1–4), pot_desk_young (D5–7), pot_desk_full only at the D8 open. From D8, no pot_desk is shown, so the baked desk plant reads as Noé's basil. D1: desk_bare + sleep_curl; Noé re-enters with finger_to_lips (say has no pose param). D2: cat_bowl/drink on the kitchen set. D3: parcel_pair at doormat_home, box_cat/in_box(_tail_pop). D4/D5: box gags moved to the kitchen set (box_cat is kitchen-only). Resolved GAP notes removed.
- The old D9/D10 photo and Martin-message material moved out: la photo / souriez belong to D12.
- D10 adds an onion plant (« Un oignon », not a target) and « plus de pain » to set up D11.
- D9: added Noé « C’est gentil, Madame. » to use the recycle word.

## Contradiction check (D9 ↔ D11 ↔ D13)
- The chair: D8 hook/D9 cat on seat_back_l, which becomes "her" chair. In D9 she sits at seat_end_l because the cat holds it. In D11 she sits at back_l and the cat takes end_l. In D13 the cat is on back_l and yields. **Consistent**, provided D11 frames back_l as "her chair, reclaimed". Please confirm.
- The key: D9 shows it (key_door stand-in) and she nearly touches it. Nobody says whose it was. D11's « C’était à lui. Cette clé. » stays the reveal. OK.
- Venue: D9 « Jeudi, venez chez moi » (her flat) → D11 « Ma cuisine est trop petite. Je viens chez vous. » This is a reversal that's played as a joke. OK. The D10 calendar is neutral (« Madame Lefèvre »), while the D11 open says « dîner avec Madame Lefèvre ». OK.
- Still open: D5/D11 d’abord/ensuite overlap; D8 doucement / le jeudi vs D11; ~~D1–3 watering before D7~~ resolved (v3: removed; D7 is the first watering).

## Validator limitation (flag for tech, not edited)
The target-heard matcher drops inner articles: « faire **la** vaisselle » (D9) and « il faut **de l’**eau » (D10) are each spoken 2+ times but report W-TARGET-UNSAID. D6 and D7 have the same article warning.

## Art gaps (deduped) — for Rev 5 / Pixel
1. Old roof key art (key_door stand-in, D5/D8/D9)
2. Red-ribbon flat key (D5)
3. Socks prop (D5; key_floor stand-in)
4. Jacket / veste (D5)
5. Key hook by the door (D8; key_door at fridge_top)
6. Martin's glove (D7; glove_on_chair stand-in)
7. Basil handprop (D8 gift)
8. Handheld any-set arrosoir (only rooftop exists)
9. Paper/pen (D9 list)
10. Ham prop (D6)
11. Cat flap/window entry (D6)
12. key_turn sfx (D8)
13. insert_calendar with caption_rect « Jeudi : Madame Lefèvre » (D10)
14. say/pose param (finger_to_lips only via enter)
15. table4 floor-parcel slot (D3 a2)

Insert ids requested: insert_calendar, insert_rules_list (D9), insert_key_old.

## Files
day04–10 JSON; locked_words_drafts/day04–10.json (DRAFT); D4_10_FOR_NENG.md.

## v2 (2026-10-26)
- No watering D1–D6 (D4–6 had none; D1–3 removed). D7 is the first watering (scene "Première fois", note FIRST watering).
- Chair wording: nobody in D8–10 calls seat_back_l Lefèvre's chair. D8 « sa chaise » = the cat's; D9 « Pas sur la chaise ! » and « C’est la chaise de Croissant. »; D10 note only. D11 is untouched.
- D10 keeps 9 targets (founder OK). Registered `insert_new_leaf` exists (D14 use); D10 shows the leaf via `pot_chez_nous_newleaf` only, so D14 keeps the glint insert.

## v3 (2026-10-26): registered art swapped in
- D5: sock_pile (b_set, hp), key_ribbon_floor (hp), jacket_hook + key_hooks_empty→flat (a3; replaces key_door at fridge_top). key_door kept only as Noé's ring in the cold open.
- D6: ham_slice held by Croissant (hp close); cat_flap on Lefèvre’s door (flap_neighbour, b_set) + flap_in at flap_neighbour_cat (end of B); no flap on 411.
- D7: arrosoir on floor_arrosoir (a3, laptop on).
- D8: key_old + insert_key_old (a2); basil_pot at pot_desk + key_hooks_flat (hook).
- D9: paper_pen / paper_pen_table, insert_rules_list « Règle 1 : le beurre » / « Règle 2 : la vaisselle » (shortened from « Règle deux : la vaisselle », 25), basil_pot (kitchen scenes), key_hooks_flat + key_old_table + insert_key_old (hp), key_old + insert_key_old (hook).
- D10: insert_calendar « Jeudi : Madame Lefèvre »; basil_pot (a3); zh of « J’espère que oui. » = 希望如此。
- Open: basil on the landing (D8 a2_basilic), Martin's glove (D7), key_turn sfx (D8), ham_pack has no stairwell mark (D6 wide).
