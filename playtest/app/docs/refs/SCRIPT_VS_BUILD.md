# Script vs build — Day 7 + Day 8 (Le Réalisateur, 2026-10-14 ~08:00 PT)

**Branches actually checked** (git fetch in /workspace/appartement-411; no code edited):
- `origin/main` @ e301765 « v0.13.3: Day 7 old watering can and first pour » (deploy repo; Day 7 read from the bundled `index.html`)
- PR19 = `src/cursor/act1-days-8-14-cc00` = `refs/pull/19/head` @ 2f32d97 (Day 8 in `js/act1days.js`, Day 7 in `js/week1.js`; already contains the v0.13.4 enrich layer)
- PR23 = `src/cursor/d7-enrich-cc00` = `refs/pull/23/head` @ d423985 (Day 7 enrich, `js/week1.js` + `js/weeklogic.js`)
Day 7 dumps of PR19 and PR23 are identical (96/96 lines). Method: loaded `week1.js` in node and dumped every step (id, speaker, when, FR/zh/en).
Scripts: Day 7 canon (`js/week1.js` pre-patch) + `docs/story/D7_ARROSOIR_PATCH.md` + `docs/story/DAY07_ENRICH.md`; `docs/story/DAY08_FINAL_v2.md` (+ patch §3 « ta plante »).

Legend: ⍽ = U+202F, ° = U+00A0.

## A. Typography (systemic)
| scope | script | build | issue |
|---|---|---|---|
| all `week1.js` LINES + Day 7 narr/opts (`var NB = '\u00A0'`), e.g. `d7_mar_surprise`, `d7_cam_hop`, `d7_mar_vue`, `d7_t_vous` sort items, Day 8 LINES `d8_noe_matin`, `d8_gag_bonjour`, `d9_lef_bonsoir`, `d9_lef_soupe`, `d9_lef_jeudi`, `d9_noe_pain` | ⍽ before ? ! : | ° (U+00A0) | **wrong space (NBSP, not NNBSP)** — renders wider; also on `main` (5× `var NB = '\u00A0'` in index.html) |
| Day 8 narr/picks/says built with `fr()` in `act1days.js` | ⍽ | ⍽ | OK → Day 8 now **mixes** ⍽ and ° on the same screen |
| `d7_mar_carte` (card) | ⍽ | ⍽ | OK |
| curly ’ | ’ | ’ | **no straight ' found** in any on-screen FR of d7/d8 (tts strings use ' on purpose: fine) |

## B. Day 7 (PR23 = PR19)
| step id | script FR | build FR | issue |
|---|---|---|---|
| `n_d7_gag`, `d7_gag_bonjour`, `d7_mar_lefevre`, `d7_gag_jambon` | gated `d7_plan = lefevre` | PR19/23: gated ✓ · **main v0.13.3: ungated** | **live preview shows Lefèvre gag on every plan** until PR23 merges |
| `d7_aha` | — (not in any script) | Avant, moi, j’avais Biscotte… Aujourd’hui, vous, vous avez un chat. | **extra step**; zh « 以前她有… » / en « Before, she had… » are 3rd person vs FR 1st person (**zh/en mismatch**); also leans toward “Croissant stays” — check with spoiler rule |
| `d7_sh_bonjour` (T2 shadow) | player rehearses « Bonjour, Madame. Enchanté ! » | speaker **camille**, « Enchanté ! » | **wrong speaker**: Camille saying masculine *Enchanté*; should be player/neutral voice (or Camille models « Enchantée ») |
| `d7_sh_entrez` / `d7_sh_bienvenue` | (player rehearsal) | speaker camille | same speaker issue (minor) |
| tidy `d7_ranger` | Noé: « Croissant… c’est mon pull ! » when the cat steals it | not found in LINES | **missing line** (only Camille’s « Vite, on range ! ») |
| tour `vis_cuisine` | « Un café… sans sucre. » (short take) | full `d7_mar_cafe` « Un café, s’il vous plaît. Sans sucre. » | wording (acceptable, reuses take) |
| T2 reward | « Camille respire. » + sticker | not found | missing reward line (minor) |
| `d7_t_regles` dictation | band A/B framed as « La journée de Croissant » | one frame for all bands; extra distractor « bruyant. » | minor; *bruyant* = off-list word [NENG?] |
| `d7_eau` (water task prompt) | — | Un mot. Une fois. | extra on-screen FR (fine, recycles; not in script) |
| ritual card `app.js:1753` (day-end) | `n_d7_soir` only | « …Croissant dort à côté. Bienvenue chez toi, Croissant. » | **extra line, possible spoiler** (promises Croissant stays) |
| `d7_mar_surprise`, F `arrosoir`, `n_d7_plante`, `pr7_plante` (answer `arrosoir`), `n_d7_soir` « Samedi soir… », card « — Mme Martin », intro beat 4 lines, `n_d7_pull` gated A/B, tour 5 spots (placard only on plan=placard), sort/read/write data | patch/enrich | match | ✓ |
| Samedi | Samedi | Samedi (`n_d7_matin`, `d7_cam_ventre`, `n_d7_soir`) | ✓ |
| step order | enrich §0 | same order (tidy→liste→porte→arrival; tour after `n_d7_visite`; carte after `n_d7_plante`; vous/regles after `n_d7_rire`; watering after diary) | ✓ |

## C. Day 8 (PR19, `js/act1days.js`)
Script: 47 steps + done (37a/37b not counted). Build: **53 steps + done**.
| step id | script FR | build FR | issue |
|---|---|---|---|
| `n_d8_matin` | (patch) Lundi matin. Dans la cuisine, ta plante est sur la table. Croissant la regarde. | same | ✓ (v2 file itself still says « la plante de samedi » — doc stale) |
| `d8_pot` opt `plant` | « ta plante » | « ta plante » 你的植物 your plant | ✓ |
| 37a/37b `lfd_fenetre` / `lfd_chaises` | À la fenêtre, une plante. Elle a soif. / À côté de la table, une chaise vide. | same, as `peeks` on `d10_lef_jardin` | FR ✓; **no zh/en** given (script has zh/en); attached to step 38 not 37 (fine if visible at the door) |
| `n_d10_monte` (42) | La clé tourne. La porte s’ouvre. | walk `d8_roof`: La clé tourne. La porte **du toit** s’ouvre. | **id changed + wording** |
| `d10_noe_ici` (45) + `d8_pot_empty` | one step | line `d10_noe_ici` **and** spots `d8_pot_empty`, both « Ici ? Dans ce pot ? » | **extra step, line shown twice** |
| `n_d10_plante` (46) | Tu plantes le basilic. Croissant aide… un peu trop. | Tu plantes le basilic **dans le jardin**. … | **wording** (not the Neng-reviewed text) |
| `d8_eau` spots | — (Noé holds out the can; direction only) | « L’arrosoir… près de la chaise. » | **extra step**; Day 9 line pulled forward; contradicts patch §3 (Noé brings **Martin’s** can up) |
| `n_d10_arrose` (47) high point | breath 3 s, Noé « Il faut de l’eau. » under the hold, no prompt | narr, then separate line step `d8_noe_eau` | **extra step**; the line should play under the hold, not as its own tap |
| `d9_cam_a/b/c/null` | step 22, band | 4 conditional steps | ✓ (counts as 1) |
| F `toit`, F `jardin` | 2 focus beats | 2 focus | ✓ |
| hook (done) | Sur le toit, une plante qui ne dort plus. En bas, une lampe qui reste allumée. | same | ✓ |
| all other step ids 1–41 | v2 | same FR/speaker/order | ✓ |

## D. Top fixes for Cursor (priority)
1. Merge/ship the `d7_plan = lefevre` gate (main still ungated).
2. `week1.js`: `NB` → U+202F for French punctuation (or route LINES through the same `fr()` as act1days); Day 8 currently mixes both.
3. Day 8 roof: drop `d8_pot_empty` duplicate, drop/convert `d8_eau` to direction (Martin’s can), play `d8_noe_eau` under the 3 s hold; restore `n_d10_plante` and `n_d10_monte` texts/ids.
4. `d7_sh_*` speaker → player/neutral voice; `d7_aha` zh/en to first person (or cut: not in script).
5. Remove « Bienvenue chez toi, Croissant. » from the Day 7 ritual card (spoiler); add missing Noé tidy line « Croissant… c’est mon pull ! »; add zh/en to the two peeks.
