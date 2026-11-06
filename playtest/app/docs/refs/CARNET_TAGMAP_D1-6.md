# Carnet tag map, Days 1–6 (Week 1)

Owner: Prof Neng · 2026-10-15 · Status: draft, read-only audit

> **For Carnet tagging only.** Days 1–6 content is FROZEN: nothing here changes a word of any line. Croissant approved tagging existing lines without a content bump (2026-10-15), but the code work waits for the founder's approval of the new strategy and ships with the first Carnet batch. No game or story file was edited to produce this map.

**Source of items:** `a411-team/strategy/WORDLIST_W1-2_DRAFT.md`, Days 1–6 (60 items).
**Lines searched (all paths relative to `appartement-411/`):**
- `js/content.js`: Day 1 (lines, narration steps, choices).
- `js/week1.js`: the letter at the end of Day 1, then Days 2–6 (`LINES` dict ids, `n('…')` narration, choice/option/mission/hook text, and `F('…')` focus beats, whose spoken text comes from `js/words.js`).
- `js/letters.js`: the evening letters the player writes, listed only as an extra; they never count as the first appearance.

**How to read this**
- Matching is case-insensitive and accepts ’ or ' as the apostrophe. Quotes are copied as built; `NB` is shown as a non-breaking space (« Bonjour ! »).
- **FIRST** = the first exact-form story occurrence in play order: Day 1 `content.js` steps, then the Day 1 letter, then each day's chapter step order. `pr*` (probe) and `bl_*` (baseline) lines are end-of-day checks. They are listed as `check` rows and never count as FIRST.
- *Changed form* = a line that uses the item's word or chunk in another form, for example another determiner (du café, ma veste), another person (tu t’appelles), or another tense or agreement (je l’ai trouvée). These need a decision: tag them as the item, or leave them as exposure only.
- ⚑ marks a first appearance on a different day from the list day, or a changed form heard before the exact form.
- Line numbers are from the files as of 2026-10-15. The ids (`d5_noe_poche`, step key `~pose`, and so on) are the stable handles to tag; a step shown as `step` has no line id, so Carnet would need the step key or the text.

## Summary

- Items: **60** (D1–D6, 10 per day).
- Mapped to at least one exact-form line: **56**.
- Not found in exact form: **4**. Three of these exist only in a changed form (je voudrais…, s’il vous plaît; je n’ai pas compris; j’ai trouvé…), and one appears nowhere (d’abord… ensuite…).
- Items whose first appearance is on an earlier day than their list day: **18**. Item first heard on a later day: **1** (le chat: D2, with D1 only « mon chat »).
- Within a day, play order follows the first reference in the scene/step list. This is reliable for the chapter steps; for Day 1, narration and lines are interleaved by scene, so check the FIRST row there by eye.

| day | item | first story appearance | id | exact hits | changed-form lines |
|---|---|---|---|---|---|
| 1 | bonjour | D1 `js/content.js:18` | `cam_bonjour` (line) | 12 | 0 |
| 1 | je m’appelle… | D1 `js/content.js:19` | `cam_intro` (line) | 6 | 7 |
| 1 | c’est… | D1 `js/content.js:21` | `noe_moi` (line) | 70 | 0 |
| 1 | merci | D1 `js/content.js:79` | `kept` (narration) | 16 | 0 |
| 1 | l’appartement (m.) | D1 `js/content.js:69` | `knock` (narration) | 9 | 1 |
| 1 | la plante | D1 `js/content.js:74` | `water` (narration) | 2 | 3 |
| 1 | le chat | D2 `js/week1.js:39` | `d2_noe_camille` (line) | 5 | 40 |
| 1 | la propriétaire | D1 `js/week1.js:16` | `l_martin_1` (line) | 2 | 0 |
| 1 | samedi | D1 `js/week1.js:17` | `l_martin_2` (line) | 12 | 0 |
| 1 | il faut… | D1 `js/week1.js:27` | `l_noe_3` (line) | 1 | 0 |
| 2 | tu veux… ? | D2 `js/week1.js:45` | `d2_noe_the_ou_cafe` (line) | 6 | 5 |
| 2 | je voudrais…, s’il vous plaît | **not found** | — | 0 | 14 |
| 2 | le café | D2 `js/week1.js:361` | step `the` (choice/UI) | 1 | 11 |
| 2 | le thé | D2 `js/week1.js:361` | step `the` (choice/UI) | 1 | 9 |
| 2 | l’eau (f.) | D1 `js/content.js:31` | `cam_eau` (line) | 5 | 0 |
| 2 | le lait | D2 `js/week1.js:70` | `d2_clerk_lait` (line) | 1 | 3 |
| 2 | le pain | D2 `js/week1.js:343` | `F('pain')` (focus beat) | 1 | 4 |
| 2 | il n’y a pas de… | D2 `js/week1.js:61` | `d2_noe_croq` (line) | 3 | 1 |
| 2 | c’est combien ? | D2 `js/week1.js:394` | step `combien` (choice/UI) | 5 | 0 |
| 2 | les croquettes | D2 `js/week1.js:66` | `d2_noe_cond_b` (line) | 6 | 11 |
| 3 | où est… ? | D2 `js/week1.js:396` | step `ou` (choice/UI) | 7 | 8 |
| 3 | il y a… | D1 `js/content.js:73` | `room` (narration) | 14 | 5 |
| 3 | sur | D1 `js/content.js:78` | `secret` (narration) | 24 | 0 |
| 3 | sous | D1 `js/week1.js:311` | `n_l_night` (narration) | 12 | 0 |
| 3 | dans | D1 `js/content.js:73` | `room` (narration) | 39 | 0 |
| 3 | derrière | D1 `js/content.js:77` | `beat` (narration) | 7 | 0 |
| 3 | la table | D2 `js/week1.js:32` | `d2_noe_regarde` (line) | 16 | 0 |
| 3 | la cuisine | D2 `js/week1.js:330` | `n_d2_matin` (narration) | 6 | 0 |
| 3 | le canapé | D1 `js/content.js:77` | `beat` (narration) | 18 | 0 |
| 3 | le colis | D2 `js/week1.js:396` | step `ou` (choice/UI) | 18 | 11 |
| 4 | pardon | D4 `js/week1.js:501` | step `pardon` (choice/UI) | 12 | 0 |
| 4 | vous pouvez répéter ? | D4 `js/week1.js:513` | step `vous` (choice/UI) | 4 | 2 |
| 4 | je n’ai pas compris | **not found** | — | 0 | 1 |
| 4 | je suis désolé(e) | D4 `js/week1.js:524` | step `desole` (choice/UI) | 2 | 1 |
| 4 | le bruit | D4 `js/week1.js:510` | `F('bruit')` (focus beat) | 3 | 8 |
| 4 | la voisine | D4 `js/week1.js:488` | `mission` (line) | 5 | 4 |
| 4 | la nuit | D1 `js/week1.js:311` | `n_l_night` (narration) | 12 | 5 |
| 4 | c’est ma faute | D4 `js/week1.js:137` | `d4_noe_faute` (line) | 4 | 1 |
| 4 | une équipe | D4 `js/week1.js:138` | `d4_cam_equipe` (line) | 2 | 0 |
| 4 | gentil / gentille | D4 `js/week1.js:123` | `d4_noe_gentil` (line) | 5 | 0 |
| 5 | la clé | D5 `js/week1.js:557` | `mission` (line) | 14 | 14 |
| 5 | je cherche… | D2 `js/week1.js:53` | `d2_noe_aide_moi` (line) | 3 | 4 |
| 5 | je ne sais pas | D3 `js/week1.js:89` | `d3_noe_jsp` (line) | 3 | 8 |
| 5 | j’ai perdu… | D5 `js/week1.js:163` | `d5_noe_sais` (line) | 2 | 2 |
| 5 | j’ai trouvé… | **not found** | — | 0 | 4 |
| 5 | hier | D2 `js/week1.js:41` | `d2_noe_merci` (line) | 10 | 0 |
| 5 | je suis rentré(e) | D3 `js/week1.js:116` | `d3_cam_rentree` (line) | 3 | 1 |
| 5 | d’abord… ensuite… | **not found** | — | 0 | 0 |
| 5 | la veste | D5 `js/week1.js:591` | `F('veste')` (focus beat) | 1 | 6 |
| 5 | la poche | D5 `js/week1.js:170` | `d5_noe_poche` (line) | 1 | 1 |
| 6 | la rue | D2 `js/week1.js:34` | `d2_noe_superette2` (line) | 6 | 5 |
| 6 | à gauche | D6 `js/week1.js:663` | step `gauche` (choice/UI) | 6 | 0 |
| 6 | à droite | D6 `js/week1.js:202` | `d6_clerk_droite` (line) | 8 | 0 |
| 6 | tout droit | D6 `js/week1.js:202` | `d6_clerk_droite` (line) | 4 | 0 |
| 6 | vous avez vu… ? | D6 `js/week1.js:649` | step `vous` (choice/UI) | 1 | 1 |
| 6 | je l’ai vu | D6 `js/week1.js:199` | `d6_pas_vu` (line) | 2 | 4 |
| 6 | petit / petite | D1 `js/content.js:83` | `paper` (narration) | 14 | 1 |
| 6 | roux / rousse | D6 `js/week1.js:197` | `d6_noe_pardon` (line) | 8 | 0 |
| 6 | le balcon | D6 `js/week1.js:207` | `d6_noe_la` (line) | 4 | 0 |
| 6 | chez moi | D6 `js/week1.js:218` | `d6_gag_garder` (line) | 2 | 3 |
## Issues for Croissant

1. **Not found in exact form (4 items).** All four are written as one fixed chunk, so tagging them means either accepting the changed form or re-pointing the item. Days 1–6 text stays unchanged either way.
   - **D2 je voudrais…, s’il vous plaît:** every line uses **s’il te plaît** (`d2_req_cafe`, `d2_cam_cafe`, `d2_req_eau`), and the plain « Je voudrais du thé/café/de l’eau. » turns up only in the choice options and the `pr2_*` checks. Proposal: re-point the item to **je voudrais…** and treat s’il vous plaît as D4 exposure (`d4` « Vous pouvez répéter, s’il vous plaît ? »).
   - **D4 je n’ai pas compris:** only « Tu n’as pas tout compris. » appears (D4 narration, step `d4_pardon`). Proposal: tag that narration line as a changed form, or move the item to the first later day that says it.
   - **D5 j’ai trouvé…:** only « Je l’ai trouvée ! » (`d5_noe_trouvee`), « Tu as trouvé ? » (`d3_call_trouve`) and « Camille a trouvé Croissant. » (D3 hook) appear. Proposal: tag `d5_noe_trouvee` as a changed form.
   - **D5 d’abord… ensuite…:** neither word appears anywhere in Days 1–6. Proposal: no line can carry it, so move the item to a later day (Le Réalisateur) and give D5 a replacement, for example **je suis descendu(e)** (`d5_noe_descendu`) or **la poubelle**.
2. **Nouns whose exact article form is rare.** The game mostly uses du/ma/ta/un. Tagging only the exact form leaves thin exposure:
   - **le café, le thé:** exact form only in the D2 choice labels; « du café / du thé » in about 10 lines.
   - **le pain:** exact form only in the D2 focus beat; « du pain » in 4 lines.
   - **la veste:** exact form only in the D5 focus beat; « ma veste / ta veste / sa veste » in 6 lines.
   - **la plante:** on D1 mostly « ta plante »; **le chat:** on D1 only « mon chat », with the first « le chat » on D2.

   Recommendation: tag on the lemma (noun) for nouns, not the article form.
3. **Items first heard before their list day** (fine for review, but Carnet's “new on day N” is not literally true): l’eau (D1), il y a, sur, sous, dans, derrière, le canapé, la nuit, petit (D1); où est, la table, la cuisine, le colis, la rue, hier, je cherche (D2); je ne sais pas, je suis rentré(e) (D3). See ⚑ in each section.
4. **c’est… (D1) matches about 70 lines.** A generic frame should not be tagged on every line. Proposal: tag only Day 1 lines plus « C’est combien ? » / « c’est ma faute » as their own items.
5. **Function words (sur, sous, dans, derrière, petit) match 7 to 37 lines.** Only the first 8 hits are listed. Proposal: tag only the D3 placement scene (the `d3_loc_*` lines and choices) and the probes.
6. **Literal « (e) » in a source line:** the D4 choice option `desole` reads « Je suis désolé(e). On va faire attention. » (`js/week1.js:524`). Other lines agree with the speaker (Camille: « Je suis rentrée ! »). Matching accepts both désolé/désolée and rentré/rentrée.
7. **Step ids:** choice, narration and hook text in `week1.js` has a step `key`/option `id` but no `LINES` id. Carnet tagging those needs a step-level tag, not a line-level one.

## Item by item

### D1 · bonjour

Exact hits: 11 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:18` | `cam_bonjour` (line) | Bonjour ! |
|  | 1 | `js/content.js:70` | `greet` (narration) | Une fille ouvre la porte. Elle sourit. Elle dit « Bonjour ! ». Et toi ? |
|  | 1 | `js/week1.js:16` | `l_martin_1` (line) | Bonjour ! Je suis Madame Martin, la propriétaire. |
|  | 2 | `js/week1.js:31` | `d2_noe_bonjour` (line) | Bonjour ! Bien dormi ? |
|  | 2 | `js/week1.js:67` | `d2_clerk_bonjour` (line) | Bonjour ! Je peux vous aider ? |
|  | 2 | `js/week1.js:382` | step `d2_greet` (choice/UI) | Le vendeur dit « Bonjour ! ». Et toi ? |
|  | 2 | `js/week1.js:383` | step `bonjour` (choice/UI) | Bonjour ! |
|  | 2 | `js/week1.js:384` | step `salut` (choice/UI) | Le vendeur sourit un peu. Avec un vendeur, on dit plutôt « Bonjour ». |
| | | | | … +3 more story hits (function word / high reuse; not listed) |
| check | 1 | `js/content.js:40` | `bl_bonjour` (check (probe/baseline)) | Bonjour ! |

### D1 · je m’appelle…

Exact hits: 3 story + 3 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:19` | `cam_intro` (line) | Salut ! Je m’appelle Camille. |
|  | 1 | `js/content.js:20` | `noe_intro` (line) | Salut ! Je m’appelle Noé. |
|  | 1 | `js/content.js:30` | `cam_moi` (line) | Moi, je m’appelle Camille. Et toi ? |
| check | 1 | `js/content.js:37` | `pr_noe_intro` (check (probe/baseline)) | Salut ! Je m’appelle Noé. |
| check | 1 | `js/content.js:38` | `pr_cam_intro` (check (probe/baseline)) | Je m’appelle Camille. |
| check | 1 | `js/content.js:41` | `bl_lea` (check (probe/baseline)) | Je m’appelle Léa. |

Changed form (7):

- D1 `js/content.js:22` `cam_ask` (line): Tu t’appelles comment ?
- D1 `js/content.js:32` `noe_chat` (line): C’est mon chat. Il s’appelle Croissant.
- D1 `js/content.js:35` `pr_cam_ask` (check (probe/baseline)): Tu t’appelles comment ?
- D1 `js/content.js:36` `pr_noe_ask` (check (probe/baseline)): Tu t’appelles comment ?
- D1 `js/content.js:42` `bl_ask` (check (probe/baseline)): Tu t’appelles comment ?
- D2 `js/week1.js:395` step `comment` (choice/UI): Tu t’appelles comment ?
- … +1 more

### D1 · c’est…

Exact hits: 69 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:21` | `noe_moi` (line) | Moi, c’est Noé. |
|  | 1 | `js/content.js:23` | `cam_plante` (line) | C’est ta plante. |
|  | 1 | `js/content.js:26` | `noe_croissant` (line) | C’est Croissant. |
|  | 1 | `js/content.js:32` | `noe_chat` (line) | C’est mon chat. Il s’appelle Croissant. |
|  | 1 | `js/content.js:80` | `declined` (narration) | Noé est un peu triste. Mais c’est ton choix. Croissant saute sur le canapé. |
|  | 1 | `js/content.js:82` | `night` (narration) | C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé. |
|  | 1 | `js/content.js:83` | `paper` (narration) | Tout est calme… Mais devant la porte, un petit bruit : « Frrrt… » Qu’est-ce que c’est ? |
|  | 1 | `js/week1.js:311` | `n_l_night` (narration) | C’est la nuit. Croissant dort sur le canapé. Sous la porte… une lettre ! |
| | | | | … +61 more story hits (function word / high reuse; not listed) |
| check | 6 | `js/week1.js:229` | `pr6_roux` (check (probe/baseline)) | C’est un petit chat roux. |

Also in evening letters (player-written, `js/letters.js`): D2 `js/letters.js:207`: Les croquettes, c’est douze euros.

### D1 · merci

Exact hits: 16 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:79` | `kept` (narration) | Noé sourit : « Merci ! » Croissant saute sur le canapé. |
|  | 1 | `js/week1.js:19` | `l_martin_4` (line) | P.-S. Les animaux ne sont pas acceptés. Merci ! |
|  | 2 | `js/week1.js:337` | step `help` (choice/UI) | Noé sourit : « Merci ! » |
|  | 2 | `js/week1.js:41` | `d2_noe_merci` (line) | Merci pour hier. Tu gardes le secret, hein ? |
|  | 2 | `js/week1.js:50` | `d2_cam_merci` (line) | Merci ! |
|  | 2 | `js/week1.js:55` | `d2_req_the` (line) | Du thé pour moi, merci. |
|  | 2 | `js/week1.js:72` | `d2_clerk_bye` (line) | Merci, bonne journée ! |
|  | 2 | `js/week1.js:402` | step `journee` (choice/UI) | Merci, bonne journée ! |
| | | | | … +8 more story hits (function word / high reuse; not listed) |

### D1 · l’appartement (m.)

Exact hits: 9 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:69` | `knock` (narration) | Voici l’appartement 411. Tu as une valise. Tu frappes à la porte : toc, toc ! |
|  | 1 | `js/week1.js:20` | `l_martin_5` (line) | Article 7 du bail : tout animal trouvé dans l’appartement devra partir. |
|  | 2 | `js/week1.js:404` | `n_d2_message` (narration) | Tu rentres à l’appartement. Ton téléphone sonne : un message de Noé. |
|  | 3 | `js/week1.js:437` | `n_d3_visite` (narration) | Noé a sommeil. Il a mis les colis… où ? Il ne sait pas. Avant de partir, il te montre l’appartement. |
|  | 4 | `js/week1.js:122` | `d4_cam_chat2` (line) | Un chat… dans l’appartement ! |
|  | 4 | `js/week1.js:143` | `d4_martin_cle` (line) | J’ai une clé de l’appartement. Si vous n’êtes pas là samedi, j’entre. |
|  | 5 | `js/week1.js:155` | `d5_noe_manque` (line) | Attendez… La clé de l’appartement n’est pas là ! |
|  | 5 | `js/week1.js:570` | `n_d5_regarde` (narration) | Madame Lefèvre regarde dans l’appartement. Derrière Noé, sur le canapé… deux petits yeux. |
| | | | | … +1 more story hits (function word / high reuse; not listed) |

Changed form (1):

- D6 `js/week1.js:219` `d6_cam_peur` (line): J’ai peur, tu sais. Cet appartement… c’est ma maison, à Paris.

Also in evening letters (player-written, `js/letters.js`): D1 `js/letters.js:165`: Noé a caché un chat dans l’appartement.; D3 `js/letters.js:240`: Samedi, la propriétaire va visiter l’appartement.

### D1 · la plante

Exact hits: 2 story + 0 check. ⚑ a changed form is heard earlier (D1 `js/content.js:73`: Dans ta chambre, il y a un lit, une fenêtre… et une plante. Les feuilles sont tristes.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:74` | `water` (narration) | Camille te donne l’arrosoir. Tu arroses la plante ? |
|  | 1 | `js/content.js:75` | `watered` (narration) | La plante boit. Les feuilles sont contentes ! |

Changed form (3):

- D1 `js/content.js:73` `room` (narration): Dans ta chambre, il y a un lit, une fenêtre… et une plante. Les feuilles sont tristes.
- D1 `js/content.js:23` `cam_plante` (line): C’est ta plante.
- D1 `js/content.js:24` `cam_soif` (line): Ta plante a soif.

Also in evening letters (player-written, `js/letters.js`): D1 `js/letters.js:161`: J’ai arrosé la plante.

### D1 · le chat

Exact hits: 4 story + 1 check. ⚑ first heard on **Day 2**, after its list day. ⚑ a changed form is heard earlier (D1 `js/content.js:32`: C’est mon chat. Il s’appelle Croissant.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:39` | `d2_noe_camille` (line) | Camille arrive. Elle ne sait pas, pour le chat. |
|  | 3 | `js/week1.js:99` | `d3_loc_derriere` (line) | Le chat est derrière le canapé. |
|  | 4 | `js/week1.js:493` | `F('chat')` (focus beat) | le chat (voice: Le chat… mon chat.) |
|  | 4 | `js/week1.js:542` | step `bruit` (choice/UI) | Le chat est gentil. |
| check | 4 | `js/week1.js:148` | `pr4_gentil` (check (probe/baseline)) | Le chat est gentil. |

Changed form (40):

- D1 `js/content.js:32` `noe_chat` (line): C’est mon chat. Il s’appelle Croissant.
- D2 `js/week1.js:68` `d2_clerk_chat` (line): Pour un chat ou pour un chien ?
- D2 `js/week1.js:388` step `d2_pet` (choice/UI): Pour un chat… ou pour un chien ?
- D2 `js/week1.js:389` step `chat` (choice/UI): Pour un chat.
- D2 `js/week1.js:79` `d2_hook_1` (line): Oh non… J’ai commandé un arbre à chat…
- D2 `js/week1.js:37` `d2_hook_3` (line): Un arbre à chat… c’est une maison pour Croissant !
- … +34 more

Also in evening letters (player-written, `js/letters.js`): D5 `js/letters.js:308`: Le chat les a cachées aussi.; D5 `js/letters.js:312`: Le chat ? Nous le cherchons partout.; D6 `js/letters.js:338`: Le chat pense que le jambon est meilleur que ses croquettes.

### D1 · la propriétaire

Exact hits: 2 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/week1.js:16` | `l_martin_1` (line) | Bonjour ! Je suis Madame Martin, la propriétaire. |
|  | 1 | `js/week1.js:22` | `l_noe_1` (line) | C’est la propriétaire. |

Also in evening letters (player-written, `js/letters.js`): D1 `js/letters.js:169`: Ce soir, nous avons lu une lettre de la propriétaire.; D1 `js/letters.js:173`: La propriétaire vient samedi.; D3 `js/letters.js:240`: Samedi, la propriétaire va visiter l’appartement.

### D1 · samedi

Exact hits: 12 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/week1.js:17` | `l_martin_2` (line) | Samedi, je viens chez vous. |
|  | 1 | `js/week1.js:21` | `l_martin_b` (line) | Je passerai samedi pour vous souhaiter la bienvenue en personne. |
|  | 1 | `js/week1.js:23` | `l_noe_2` (line) | Samedi ?! Oh non… Croissant ! |
|  | 2 | `js/week1.js:330` | `n_d2_matin` (narration) | Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours. |
|  | 3 | `js/week1.js:426` | `n_d3_matin` (narration) | Le matin. Samedi, c’est dans cinq jours. Devant la porte… il n’y a rien. |
|  | 4 | `js/week1.js:491` | `n_d4_matin` (narration) | Le matin. Samedi, c’est dans quatre jours. Dans le salon, Camille regarde Croissant. Croissant regarde Camille. |
|  | 4 | `js/week1.js:124` | `d4_cam_interdit` (line) | Mais les animaux sont interdits ! Et samedi, Madame Martin vient ! |
|  | 4 | `js/week1.js:143` | `d4_martin_cle` (line) | J’ai une clé de l’appartement. Si vous n’êtes pas là samedi, j’entre. |
| | | | | … +4 more story hits (function word / high reuse; not listed) |

Also in evening letters (player-written, `js/letters.js`): D1 `js/letters.js:173`: La propriétaire vient samedi.; D3 `js/letters.js:240`: Samedi, la propriétaire va visiter l’appartement.

### D1 · il faut…

Exact hits: 1 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/week1.js:27` | `l_noe_3` (line) | Il faut cacher Croissant. |

### D2 · tu veux… ?

Exact hits: 5 story + 1 check. ⚑ a changed form is heard earlier (D1 `js/content.js:31`: Elle a soif… Elle veut de l’eau !).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:45` | `d2_noe_the_ou_cafe` (line) | Tu veux du thé ou du café ? |
|  | 2 | `js/week1.js:51` | `d2_noe_et_toi` (line) | Et toi ? Tu veux du thé ou du café ? |
|  | 2 | `js/week1.js:354` | step `d2_drink` (choice/UI) | Noé te regarde. C’est à toi ! Tu veux quoi ? |
|  | 2 | `js/week1.js:385` | step `d2_ask` (choice/UI) | Tu veux un sac de croquettes. |
|  | 2 | `js/week1.js:393` | step `d2_price` (choice/UI) | Tu veux savoir le prix. Tu dis… |
| check | 2 | `js/week1.js:77` | `pr2_ask` (check (probe/baseline)) | Tu veux du thé ou du café ? |

Changed form (5):

- D1 `js/content.js:31` `cam_eau` (line): Elle a soif… Elle veut de l’eau !
- D1 `js/week1.js:18` `l_martin_3` (line): Je veux vous souhaiter la bienvenue.
- D2 `js/week1.js:412` step `the` (choice/UI): Il veut du thé.
- D2 `js/week1.js:412` step `the` (choice/UI): Il veut du café.
- D6 `js/week1.js:692` step `reflechir` (choice/UI): Elle hoche la tête. « Comme vous voulez. Ma porte est ouverte. »

### D2 · je voudrais…, s’il vous plaît

**NOT FOUND** as an exact form in any Day 1–6 line.

Changed form (14):

- D2 `js/week1.js:46` `d2_cam_cafe` (line): Du café, s’il te plaît. Un grand café !
- D2 `js/week1.js:355` step `the` (choice/UI): Je voudrais du thé.
- D2 `js/week1.js:355` step `the` (choice/UI): Je voudrais du café.
- D2 `js/week1.js:355` step `the` (choice/UI): Je voudrais de l’eau.
- D2 `js/week1.js:54` `d2_req_cafe` (line): Je voudrais du café, s’il te plaît.
- D2 `js/week1.js:56` `d2_req_eau` (line): Et de l’eau, s’il te plaît.
- … +8 more

### D2 · le café

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D2 `js/week1.js:45`: Tu veux du thé ou du café ?).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:361` | step `the` (choice/UI) | le café |

Changed form (11):

- D2 `js/week1.js:45` `d2_noe_the_ou_cafe` (line): Tu veux du thé ou du café ?
- D2 `js/week1.js:46` `d2_cam_cafe` (line): Du café, s’il te plaît. Un grand café !
- D2 `js/week1.js:48` `d2_noe_voila_cafe` (line): Et voilà une tasse de café.
- D2 `js/week1.js:51` `d2_noe_et_toi` (line): Et toi ? Tu veux du thé ou du café ?
- D2 `js/week1.js:355` step `the` (choice/UI): Je voudrais du café.
- D2 `js/week1.js:54` `d2_req_cafe` (line): Je voudrais du café, s’il te plaît.
- … +5 more

### D2 · le thé

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D2 `js/week1.js:45`: Tu veux du thé ou du café ?).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:361` | step `the` (choice/UI) | le thé |

Changed form (9):

- D2 `js/week1.js:45` `d2_noe_the_ou_cafe` (line): Tu veux du thé ou du café ?
- D2 `js/week1.js:47` `d2_noe_voila_the` (line): Voilà une tasse de thé.
- D2 `js/week1.js:51` `d2_noe_et_toi` (line): Et toi ? Tu veux du thé ou du café ?
- D2 `js/week1.js:355` step `the` (choice/UI): Je voudrais du thé.
- D2 `js/week1.js:55` `d2_req_the` (line): Du thé pour moi, merci.
- D2 `js/week1.js:75` `pr2_the` (check (probe/baseline)): Je voudrais du thé.
- … +3 more

### D2 · l’eau (f.)

Exact hits: 5 story + 0 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:31` | `cam_eau` (line) | Elle a soif… Elle veut de l’eau ! |
|  | 2 | `js/week1.js:49` | `d2_noe_voila_eau` (line) | Et ça, c’est de l’eau. |
|  | 2 | `js/week1.js:355` | step `the` (choice/UI) | Je voudrais de l’eau. |
|  | 2 | `js/week1.js:56` | `d2_req_eau` (line) | Et de l’eau, s’il te plaît. |
|  | 2 | `js/week1.js:361` | step `the` (choice/UI) | l’eau |

### D2 · le lait

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D2 `js/week1.js:62`: Et il n’y a pas de lait non plus.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:70` | `d2_clerk_lait` (line) | Le lait, c’est deux euros. |

Changed form (3):

- D2 `js/week1.js:62` `d2_noe_lait` (line): Et il n’y a pas de lait non plus.
- D2 `js/week1.js:35` `d2_noe_liste` (line): Des croquettes pour Croissant, et du lait. D’accord ?
- D2 `js/week1.js:379` `n_d2_shop` (narration): Voici la supérette, au coin de la rue. Il y a du lait, du pain… et des croquettes !

### D2 · le pain

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D2 `js/week1.js:330`: Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:343` | `F('pain')` (focus beat) | le pain (voice: Le pain… du pain.) |

Changed form (4):

- D2 `js/week1.js:330` `n_d2_matin` (narration): Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours.
- D2 `js/week1.js:43` `d2_cam_faim` (line): J’ai faim. Il y a du pain ?
- D2 `js/week1.js:44` `d2_noe_pain` (line): Oui, il y a du pain. Et il y a du beurre.
- D2 `js/week1.js:379` `n_d2_shop` (narration): Voici la supérette, au coin de la rue. Il y a du lait, du pain… et des croquettes !

### D2 · il n’y a pas de…

Exact hits: 2 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:61` | `d2_noe_croq` (line) | Oh non ! Il n’y a pas de croquettes. |
|  | 2 | `js/week1.js:62` | `d2_noe_lait` (line) | Et il n’y a pas de lait non plus. |
| check | 2 | `js/week1.js:78` | `pr2_croq` (check (probe/baseline)) | Il n’y a pas de croquettes. |

Changed form (1):

- D2 `js/week1.js:412` step `the` (choice/UI): Il n’y a plus de croquettes.

### D2 · c’est combien ?

Exact hits: 5 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:394` | step `combien` (choice/UI) | C’est combien ? |
|  | 2 | `js/week1.js:394` | step `combien` (choice/UI) | Oui ! « C’est combien ? » = le prix ? |
|  | 2 | `js/week1.js:395` | step `comment` (choice/UI) | Non, ça, c’est pour le nom. Pour le prix : « C’est combien ? » |
|  | 2 | `js/week1.js:396` | step `ou` (choice/UI) | Non, ça, c’est pour un colis. Pour le prix : « C’est combien ? » |
|  | 2 | `js/week1.js:398` | step `d2_prix` (choice/UI) | Écoute. Les croquettes, c’est combien ? |

### D2 · les croquettes

Exact hits: 6 story + 0 check. ⚑ a changed form is heard earlier (D2 `js/week1.js:61`: Oh non ! Il n’y a pas de croquettes.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:66` | `d2_noe_cond_b` (line) | Si Camille voyait les croquettes, elle comprendrait tout. |
|  | 2 | `js/week1.js:380` | `F('croquettes')` (focus beat) | les croquettes (voice: Les croquettes… des croquettes.) |
|  | 2 | `js/week1.js:71` | `d2_clerk_prix` (line) | Les croquettes, c’est douze euros. |
|  | 2 | `js/week1.js:398` | step `d2_prix` (choice/UI) | Écoute. Les croquettes, c’est combien ? |
|  | 2 | `js/week1.js:405` | step `d2_hide` (choice/UI) | Écoute le message. Où vont les croquettes ? |
|  | 6 | `js/week1.js:201` | `d6_clerk_croq` (line) | Ah, bonjour ! Les croquettes, c’était pour ce chat, alors ? |

Changed form (11):

- D2 `js/week1.js:61` `d2_noe_croq` (line): Oh non ! Il n’y a pas de croquettes.
- D2 `js/week1.js:33` `d2_noe_bol` (line): Regarde : le bol est vide. Pas de croquettes !
- D2 `js/week1.js:65` `d2_noe_acheter` (line): Je vais acheter des croquettes… non, toi !
- D2 `js/week1.js:35` `d2_noe_liste` (line): Des croquettes pour Croissant, et du lait. D’accord ?
- D2 `js/week1.js:379` `n_d2_shop` (narration): Voici la supérette, au coin de la rue. Il y a du lait, du pain… et des croquettes !
- D2 `js/week1.js:385` step `d2_ask` (choice/UI): Tu veux un sac de croquettes.
- … +5 more

Also in evening letters (player-written, `js/letters.js`): D2 `js/letters.js:207`: Les croquettes, c’est douze euros.

### D3 · où est… ?

Exact hits: 7 story + 0 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:396` | step `ou` (choice/UI) | Où est le colis ? |
|  | 3 | `js/week1.js:88` | `d3_noe_ou` (line) | Où est le colis ? |
|  | 3 | `js/week1.js:451` | step `d3_find1` (choice/UI) | Écoute Noé. Où est le colis ? |
|  | 3 | `js/week1.js:462` | `n_d3_ecoute` (narration) | Le message dit où est le deuxième colis. Écoute, puis choisis. |
|  | 3 | `js/week1.js:114` | `d3_noe_question` (line) | Alors ? Où est l’arbre à chat ? |
|  | 5 | `js/week1.js:162` | `d5_cam_ou` (line) | Où est la clé ? Tu ne sais pas ? |
|  | 5 | `js/week1.js:630` | step `art` (choice/UI) | La porte était ouverte. Le canapé est vide. Où est Croissant ? Et samedi, Madame Martin arrive… |

Changed form (8):

- D2 `js/week1.js:405` step `d2_hide` (choice/UI): Écoute le message. Où vont les croquettes ?
- D3 `js/week1.js:437` `n_d3_visite` (narration): Noé a sommeil. Il a mis les colis… où ? Il ne sait pas. Avant de partir, il te montre l’appartement.
- D5 `js/week1.js:607` step `d5_ou` (choice/UI): Écoute Camille. On cherche où ?
- D6 `js/week1.js:192` `d6_noe_appelle` (line): Croissant ! Croissant ! Tu es où ?
- D6 `js/week1.js:649` step `vous` (choice/UI): Un chat ! Où ?
- D6 `js/week1.js:657` step `d6_ou` (choice/UI): Écoute la dame. Elle a vu Croissant où ?
- … +2 more

### D3 · il y a…

Exact hits: 12 story + 2 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:73` | `room` (narration) | Dans ta chambre, il y a un lit, une fenêtre… et une plante. Les feuilles sont tristes. |
|  | 2 | `js/week1.js:330` | `n_d2_matin` (narration) | Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours. |
|  | 2 | `js/week1.js:43` | `d2_cam_faim` (line) | J’ai faim. Il y a du pain ? |
|  | 2 | `js/week1.js:44` | `d2_noe_pain` (line) | Oui, il y a du pain. Et il y a du beurre. |
|  | 2 | `js/week1.js:347` | `n_d2_tasses` (narration) | Sur la table, il y a trois tasses. Noé montre les tasses, une par une. |
|  | 2 | `js/week1.js:379` | `n_d2_shop` (narration) | Voici la supérette, au coin de la rue. Il y a du lait, du pain… et des croquettes ! |
|  | 3 | `js/week1.js:84` | `d3_noe_deux` (line) | Il y a deux colis. |
|  | 3 | `js/week1.js:453` | `n_d3_etiquette` (narration) | Derrière le canapé, il y a une boîte ! Sur la boîte, une étiquette : « Pour : Camille — De : Maman, Marseille ». |
| | | | | … +4 more story hits (function word / high reuse; not listed) |
| check | 4 | `js/week1.js:146` | `pr4_bruit` (check (probe/baseline)) | Il y a du bruit la nuit. |
| check | 5 | `js/week1.js:189` | `pr5_chaussettes` (check (probe/baseline)) | Il y a trois chaussettes. |

Changed form (5):

- D2 `js/week1.js:61` `d2_noe_croq` (line): Oh non ! Il n’y a pas de croquettes.
- D2 `js/week1.js:62` `d2_noe_lait` (line): Et il n’y a pas de lait non plus.
- D2 `js/week1.js:78` `pr2_croq` (check (probe/baseline)): Il n’y a pas de croquettes.
- D2 `js/week1.js:412` step `the` (choice/UI): Il n’y a plus de croquettes.
- D3 `js/week1.js:426` `n_d3_matin` (narration): Le matin. Samedi, c’est dans cinq jours. Devant la porte… il n’y a rien.

### D3 · sur

Exact hits: 23 story + 1 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:78` | `secret` (narration) | Noé met un doigt sur la bouche. Il te regarde. Tu dis quoi ? |
|  | 1 | `js/content.js:79` | `kept` (narration) | Noé sourit : « Merci ! » Croissant saute sur le canapé. |
|  | 1 | `js/content.js:80` | `declined` (narration) | Noé est un peu triste. Mais c’est ton choix. Croissant saute sur le canapé. |
|  | 1 | `js/content.js:82` | `night` (narration) | C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé. |
|  | 1 | `js/week1.js:311` | `n_l_night` (narration) | C’est la nuit. Croissant dort sur le canapé. Sous la porte… une lettre ! |
|  | 2 | `js/week1.js:347` | `n_d2_tasses` (narration) | Sur la table, il y a trois tasses. Noé montre les tasses, une par une. |
|  | 3 | `js/week1.js:96` | `d3_loc_sur` (line) | Le colis est sur la table. |
|  | 3 | `js/week1.js:452` | step `sur` (choice/UI) | sur la table |
| | | | | … +15 more story hits (function word / high reuse; not listed) |
| check | 3 | `js/week1.js:107` | `pr3_sur` (check (probe/baseline)) | Le colis est sur la table. |

### D3 · sous

Exact hits: 11 story + 1 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/week1.js:311` | `n_l_night` (narration) | C’est la nuit. Croissant dort sur le canapé. Sous la porte… une lettre ! |
|  | 2 | `js/week1.js:32` | `d2_noe_regarde` (line) | Regarde ! Sous la table… |
|  | 2 | `js/week1.js:38` | `d2_noe_chut` (line) | Chut… Croissant est sous la table. |
|  | 2 | `js/week1.js:362` | `n_d2_miaou` (narration) | Sous la table, un petit bruit : « Miaou… » |
|  | 2 | `js/week1.js:366` | `n_d2_bol` (narration) | Camille part au travail. Ouf ! Croissant sort de sous la table. Il regarde son bol. |
|  | 3 | `js/week1.js:97` | `d3_loc_sous` (line) | Le colis est sous la table. |
|  | 3 | `js/week1.js:452` | step `sur` (choice/UI) | sous la table |
|  | 3 | `js/week1.js:465` | step `sur` (choice/UI) | sous la table |
| | | | | … +3 more story hits (function word / high reuse; not listed) |
| check | 3 | `js/week1.js:108` | `pr3_sous` (check (probe/baseline)) | Le colis est sous la table. |

### D3 · dans

Exact hits: 37 story + 2 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:73` | `room` (narration) | Dans ta chambre, il y a un lit, une fenêtre… et une plante. Les feuilles sont tristes. |
|  | 1 | `js/content.js:82` | `night` (narration) | C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé. |
|  | 1 | `js/week1.js:20` | `l_martin_5` (line) | Article 7 du bail : tout animal trouvé dans l’appartement devra partir. |
|  | 2 | `js/week1.js:330` | `n_d2_matin` (narration) | Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours. |
|  | 2 | `js/week1.js:340` | `n_d2_camille` (narration) | Camille entre dans la cuisine. Elle a les yeux fatigués. |
|  | 2 | `js/week1.js:73` | `d2_noe_sms` (line) | Mets le sac dans le placard ! |
|  | 2 | `js/week1.js:408` | `n_d2_sac` (narration) | Croissant entre dans le sac vide. On voit seulement sa queue ! |
|  | 3 | `js/week1.js:426` | `n_d3_matin` (narration) | Le matin. Samedi, c’est dans cinq jours. Devant la porte… il n’y a rien. |
| | | | | … +29 more story hits (function word / high reuse; not listed) |
| check | 3 | `js/week1.js:109` | `pr3_cuisine` (check (probe/baseline)) | Le colis est dans la cuisine. |
| check | 3 | `js/week1.js:110` | `pr3_chambre` (check (probe/baseline)) | Le colis est dans la chambre. |

Also in evening letters (player-written, `js/letters.js`): D1 `js/letters.js:165`: Noé a caché un chat dans l’appartement.; D3 `js/letters.js:232`: J’ai caché l’arbre à chat dans le placard.; D4 `js/letters.js:270`: Tout à coup, un livre est tombé dans le salon.

### D3 · derrière

Exact hits: 7 story + 0 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:77` | `beat` (narration) | La porte se ferme. Derrière le canapé… quelque chose bouge. « Miaou ! » |
|  | 1 | `js/week1.js:26` | `l_noe_cache` (line) | Croissant, derrière le canapé ! Chut ! |
|  | 3 | `js/week1.js:99` | `d3_loc_derriere` (line) | Le chat est derrière le canapé. |
|  | 3 | `js/week1.js:102` | `d3_call_derriere` (line) | Regarde derrière le canapé ! |
|  | 3 | `js/week1.js:452` | step `sur` (choice/UI) | derrière le canapé |
|  | 3 | `js/week1.js:453` | `n_d3_etiquette` (narration) | Derrière le canapé, il y a une boîte ! Sur la boîte, une étiquette : « Pour : Camille — De : Maman, Marseille ». |
|  | 5 | `js/week1.js:570` | `n_d5_regarde` (narration) | Madame Lefèvre regarde dans l’appartement. Derrière Noé, sur le canapé… deux petits yeux. |

Also in evening letters (player-written, `js/letters.js`): D3 `js/letters.js:228`: Le colis de Camille était derrière le canapé.

### D3 · la table

Exact hits: 14 story + 2 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:32` | `d2_noe_regarde` (line) | Regarde ! Sous la table… |
|  | 2 | `js/week1.js:38` | `d2_noe_chut` (line) | Chut… Croissant est sous la table. |
|  | 2 | `js/week1.js:347` | `n_d2_tasses` (narration) | Sur la table, il y a trois tasses. Noé montre les tasses, une par une. |
|  | 2 | `js/week1.js:362` | `n_d2_miaou` (narration) | Sous la table, un petit bruit : « Miaou… » |
|  | 2 | `js/week1.js:366` | `n_d2_bol` (narration) | Camille part au travail. Ouf ! Croissant sort de sous la table. Il regarde son bol. |
|  | 2 | `js/week1.js:406` | step `placard` (choice/UI) | la table |
|  | 3 | `js/week1.js:96` | `d3_loc_sur` (line) | Le colis est sur la table. |
|  | 3 | `js/week1.js:97` | `d3_loc_sous` (line) | Le colis est sous la table. |
| | | | | … +6 more story hits (function word / high reuse; not listed) |
| check | 3 | `js/week1.js:107` | `pr3_sur` (check (probe/baseline)) | Le colis est sur la table. |
| check | 3 | `js/week1.js:108` | `pr3_sous` (check (probe/baseline)) | Le colis est sous la table. |

### D3 · la cuisine

Exact hits: 5 story + 1 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:330` | `n_d2_matin` (narration) | Le matin, sept heures et demie. Dans la cuisine, il y a du pain et du beurre. Samedi, c’est dans six jours. |
|  | 2 | `js/week1.js:340` | `n_d2_camille` (narration) | Camille entre dans la cuisine. Elle a les yeux fatigués. |
|  | 3 | `js/week1.js:92` | `d3_room_cuisine` (line) | Ici, c’est la cuisine. |
|  | 3 | `js/week1.js:466` | step `cuisine` (choice/UI) | la cuisine |
|  | 3 | `js/week1.js:471` | step `cuisine` (choice/UI) | la cuisine |
| check | 3 | `js/week1.js:109` | `pr3_cuisine` (check (probe/baseline)) | Le colis est dans la cuisine. |

### D3 · le canapé

Exact hits: 18 story + 0 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:77` | `beat` (narration) | La porte se ferme. Derrière le canapé… quelque chose bouge. « Miaou ! » |
|  | 1 | `js/content.js:79` | `kept` (narration) | Noé sourit : « Merci ! » Croissant saute sur le canapé. |
|  | 1 | `js/content.js:80` | `declined` (narration) | Noé est un peu triste. Mais c’est ton choix. Croissant saute sur le canapé. |
|  | 1 | `js/content.js:82` | `night` (narration) | C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé. |
|  | 1 | `js/week1.js:311` | `n_l_night` (narration) | C’est la nuit. Croissant dort sur le canapé. Sous la porte… une lettre ! |
|  | 1 | `js/week1.js:26` | `l_noe_cache` (line) | Croissant, derrière le canapé ! Chut ! |
|  | 3 | `js/week1.js:99` | `d3_loc_derriere` (line) | Le chat est derrière le canapé. |
|  | 3 | `js/week1.js:102` | `d3_call_derriere` (line) | Regarde derrière le canapé ! |
| | | | | … +10 more story hits (function word / high reuse; not listed) |

Also in evening letters (player-written, `js/letters.js`): D3 `js/letters.js:228`: Le colis de Camille était derrière le canapé.

### D3 · le colis

Exact hits: 14 story + 4 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:396` | step `ou` (choice/UI) | Où est le colis ? |
|  | 3 | `js/week1.js:428` | `F('colis')` (focus beat) | le colis (voice: Un colis… deux colis.) |
|  | 3 | `js/week1.js:88` | `d3_noe_ou` (line) | Où est le colis ? |
|  | 3 | `js/week1.js:96` | `d3_loc_sur` (line) | Le colis est sur la table. |
|  | 3 | `js/week1.js:97` | `d3_loc_sous` (line) | Le colis est sous la table. |
|  | 3 | `js/week1.js:451` | step `d3_find1` (choice/UI) | Écoute Noé. Où est le colis ? |
|  | 3 | `js/week1.js:454` | step `d3_label` (choice/UI) | Lis l’étiquette. C’est le colis de qui ? |
|  | 3 | `js/week1.js:455` | step `camille` (choice/UI) | Le colis de Camille (de sa maman). |
| | | | | … +6 more story hits (function word / high reuse; not listed) |
| check | 3 | `js/week1.js:107` | `pr3_sur` (check (probe/baseline)) | Le colis est sur la table. |
| check | 3 | `js/week1.js:108` | `pr3_sous` (check (probe/baseline)) | Le colis est sous la table. |
| check | 3 | `js/week1.js:109` | `pr3_cuisine` (check (probe/baseline)) | Le colis est dans la cuisine. |
| check | 3 | `js/week1.js:110` | `pr3_chambre` (check (probe/baseline)) | Le colis est dans la chambre. |

Changed form (11):

- D2 `js/week1.js:396` step `ou` (choice/UI): Non, ça, c’est pour un colis. Pour le prix : « C’est combien ? »
- D2 `js/week1.js:414` `n_d2_soir` (narration): Le soir. Le téléphone de Noé s’allume : « Livraison demain : 1 colis pour Camille. »
- D3 `js/week1.js:423` `mission` (line): Mission : les deux colis
- D3 `js/week1.js:83` `d3_noe_livreur` (line): Ce matin, le livreur a laissé deux colis.
- D3 `js/week1.js:84` `d3_noe_deux` (line): Il y a deux colis.
- D3 `js/week1.js:86` `d3_noe_boite` (line): Un colis, c’est une boîte. Une grande boîte !
- … +5 more

Also in evening letters (player-written, `js/letters.js`): D3 `js/letters.js:228`: Le colis de Camille était derrière le canapé.

### D4 · pardon

Exact hits: 11 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:501` | step `pardon` (choice/UI) | Pardon, Camille. On t’explique. |
|  | 4 | `js/week1.js:513` | step `vous` (choice/UI) | Pardon ? Vous pouvez répéter, s’il vous plaît ? |
|  | 4 | `js/week1.js:523` | step `chat` (choice/UI) | C’est… un chat. Pardon. |
|  | 4 | `js/week1.js:134` | `d4_cam_pardon` (line) | Bien sûr, Madame. Pardon pour le bruit. |
|  | 4 | `js/week1.js:137` | `d4_noe_faute` (line) | Pardon, Camille. C’est ma faute. Croissant, c’est mon idée. |
|  | 4 | `js/week1.js:542` | step `bruit` (choice/UI) | Il dit pardon. |
|  | 5 | `js/week1.js:152` | `d5_gag_bonsoir` (line) | Pardon… Bonsoir. Ce sont vos clés ? Elles étaient dans l’escalier. |
|  | 5 | `js/week1.js:158` | `d5_gag_gentil` (line) | Vous avez dit pardon, hier. C’est gentil. |
| | | | | … +3 more story hits (function word / high reuse; not listed) |
| check | 4 | `js/week1.js:149` | `pr4_desole` (check (probe/baseline)) | Pardon, je suis désolé. |

### D4 · vous pouvez répéter ?

Exact hits: 3 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:513` | step `vous` (choice/UI) | Pardon ? Vous pouvez répéter, s’il vous plaît ? |
|  | 4 | `js/week1.js:514` | step `tu` (choice/UI) | Madame Lefèvre lève un sourcil. « Tu », c’est pour Camille et Noé. Avec une voisine : « Vous pouvez répéter ? » |
|  | 4 | `js/week1.js:515` | step `jsp` (choice/UI) | Madame Lefèvre soupire… Pour faire répéter : « Vous pouvez répéter, s’il vous plaît ? » |
| check | 4 | `js/week1.js:147` | `pr4_repeter` (check (probe/baseline)) | Vous pouvez répéter, s’il vous plaît ? |

Changed form (2):

- D4 `js/week1.js:514` step `tu` (choice/UI): Tu peux répéter ?
- D4 `js/week1.js:542` step `bruit` (choice/UI): Il demande de répéter.

### D4 · je n’ai pas compris

**NOT FOUND** as an exact form in any Day 1–6 line.

Changed form (1):

- D4 `js/week1.js:512` step `d4_pardon` (choice/UI): La voisine parle vite. Tu n’as pas tout compris. Tu dis…

### D4 · je suis désolé(e)

Exact hits: 1 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:524` | step `desole` (choice/UI) | Je suis désolé(e). On va faire attention. |
| check | 4 | `js/week1.js:149` | `pr4_desole` (check (probe/baseline)) | Pardon, je suis désolé. |

Changed form (1):

- D6 `js/week1.js:198` `d6_pas_non` (line): Un chat roux ? Non, désolée.

### D4 · le bruit

Exact hits: 3 story + 0 check. ⚑ a changed form is heard earlier (D1 `js/content.js:83`: Tout est calme… Mais devant la porte, un petit bruit : « Frrrt… » Qu’est-ce que c’est ?).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:510` | `F('bruit')` (focus beat) | le bruit (voice: Le bruit… beaucoup de bruit.) |
|  | 4 | `js/week1.js:518` | step `d4_quand` (choice/UI) | Écoute encore. Le bruit, c’est quand ? |
|  | 4 | `js/week1.js:134` | `d4_cam_pardon` (line) | Bien sûr, Madame. Pardon pour le bruit. |

Changed form (8):

- D1 `js/content.js:83` `paper` (narration): Tout est calme… Mais devant la porte, un petit bruit : « Frrrt… » Qu’est-ce que c’est ?
- D2 `js/week1.js:362` `n_d2_miaou` (narration): Sous la table, un petit bruit : « Miaou… »
- D2 `js/week1.js:58` `d2_cam_bruit` (line): C’est quoi, ce bruit ?
- D4 `js/week1.js:127` `d4_cam_secret` (line): Mais attention : c’est un secret. Pas de bruit !
- D4 `js/week1.js:129` `d4_gag_bruit` (line): Bonjour. Il y a du bruit la nuit. Beaucoup de bruit !
- D4 `js/week1.js:130` `d4_gag_boum` (line): Du bruit, vous comprenez ? Boum, boum, boum !
- … +2 more

### D4 · la voisine

Exact hits: 5 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:488` | `mission` (line) | Mission : la voisine en colère |
|  | 4 | `js/week1.js:507` | `n_d4_voisine` (narration) | Camille ouvre la porte. C’est la voisine du dessous, Madame Lefèvre. Elle n’a pas l’air contente. |
|  | 4 | `js/week1.js:508` | `F('voisine')` (focus beat) | la voisine (voice: La voisine… la voisine du dessous.) |
|  | 4 | `js/week1.js:512` | step `d4_pardon` (choice/UI) | La voisine parle vite. Tu n’as pas tout compris. Tu dis… |
|  | 4 | `js/week1.js:139` | `d4_cam_dont` (line) | C’est la voisine dont je t’ai parlé. |

Changed form (4):

- D4 `js/week1.js:513` step `vous` (choice/UI): Madame Lefèvre fait oui avec la tête. Avec une voisine, « vous », c’est poli.
- D4 `js/week1.js:514` step `tu` (choice/UI): Madame Lefèvre lève un sourcil. « Tu », c’est pour Camille et Noé. Avec une voisine : « Vous pouvez répéter ? »
- D4 `js/week1.js:536` step `d4_note` (choice/UI): Écris le début du mot. Pour une voisine, on dit « vous ».
- D6 `js/week1.js:193` `d6_cam_chut` (line): Chut, Noé… Les voisins dorment !

### D4 · la nuit

Exact hits: 11 story + 1 check. ⚑ first heard on **Day 1**, before its list day. ⚑ a changed form is heard earlier (D1 `js/content.js:82`: C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/week1.js:311` | `n_l_night` (narration) | C’est la nuit. Croissant dort sur le canapé. Sous la porte… une lettre ! |
|  | 4 | `js/week1.js:129` | `d4_gag_bruit` (line) | Bonjour. Il y a du bruit la nuit. Beaucoup de bruit ! |
|  | 4 | `js/week1.js:519` | step `nuit` (choice/UI) | la nuit |
|  | 4 | `js/week1.js:522` | step `sport` (choice/UI) | Je… je fais du sport la nuit ? |
|  | 4 | `js/week1.js:547` | `n_d4_nuit` (narration) | La nuit. Trois heures du matin. Tout le monde dort… sauf Croissant. |
|  | 4 | `js/week1.js:548` | `F('nuit')` (focus beat) | la nuit (voice: La nuit… la nuit.) |
|  | 4 | `js/week1.js:549` | `n_d4_miaou` (narration) | « MIAOU ! » Dans la nuit, Croissant court dans le salon. Boum ! |
|  | 5 | `js/week1.js:156` | `d5_gag_sport` (line) | Et la nuit, moins de sport, hein ? |
| | | | | … +3 more story hits (function word / high reuse; not listed) |
| check | 4 | `js/week1.js:146` | `pr4_bruit` (check (probe/baseline)) | Il y a du bruit la nuit. |

Changed form (5):

- D1 `js/content.js:82` `night` (narration): C’est le soir. Noé dit : « Bonne nuit ! » Il va dans sa chambre. Croissant dort sur le canapé.
- D2 `js/week1.js:403` step `nuit` (choice/UI): Bonne nuit !
- D4 `js/week1.js:131` `d4_gag_courait` (line): Cette nuit, quelqu’un courait. Ça faisait boum, boum !
- D5 `js/week1.js:159` `d5_gag_quatre` (line): Bonne nuit… à tous les quatre.
- D6 `js/week1.js:215` `d6_gag_seule` (line): Cette nuit… je n’étais pas seule.

### D4 · c’est ma faute

Exact hits: 4 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:137` | `d4_noe_faute` (line) | Pardon, Camille. C’est ma faute. Croissant, c’est mon idée. |
|  | 6 | `js/week1.js:194` | `d6_noe_raison` (line) | Tu avais raison, hier. C’est ma clé, c’est ma porte… c’est ma faute. |
|  | 6 | `js/week1.js:195` | `d6_noe_faute` (line) | C’est ma faute. Je n’ai pas fermé la porte à clé. |
|  | 6 | `js/week1.js:213` | `d6_noe_amoi` (line) | Pardon, Madame. Il est à moi. C’est ma faute. |

Changed form (1):

- D5 `js/week1.js:165` `d5_noe_croissant` (line): C’est Croissant ! C’est sa faute, j’en suis sûr !

### D4 · une équipe

Exact hits: 2 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:138` | `d4_cam_equipe` (line) | Non. Maintenant, on est une équipe. Tous les trois. |
|  | 6 | `js/week1.js:220` | `d6_noe_equipe` (line) | On est une équipe, Camille. Tous les quatre. |

### D4 · gentil / gentille

Exact hits: 4 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 4 | `js/week1.js:123` | `d4_noe_gentil` (line) | Il s’appelle Croissant. Il est gentil. |
|  | 4 | `js/week1.js:542` | step `bruit` (choice/UI) | Le chat est gentil. |
|  | 5 | `js/week1.js:158` | `d5_gag_gentil` (line) | Vous avez dit pardon, hier. C’est gentil. |
|  | 6 | `js/week1.js:691` | step `oui` (choice/UI) | Oui, merci, Madame ! C’est très gentil. |
| check | 4 | `js/week1.js:148` | `pr4_gentil` (check (probe/baseline)) | Le chat est gentil. |

Also in evening letters (player-written, `js/letters.js`): D6 `js/letters.js:334`: Elle est plus gentille que je pensais.

### D5 · la clé

Exact hits: 13 story + 1 check. ⚑ a changed form is heard earlier (D4 `js/week1.js:143`: J’ai une clé de l’appartement. Si vous n’êtes pas là samedi, j’entre.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 5 | `js/week1.js:557` | `mission` (line) | Mission : la clé perdue |
|  | 5 | `js/week1.js:563` | `F('cle')` (focus beat) | la clé (voice: La clé… mes clés.) |
|  | 5 | `js/week1.js:155` | `d5_noe_manque` (line) | Attendez… La clé de l’appartement n’est pas là ! |
|  | 5 | `js/week1.js:161` | `d5_noe_cherche` (line) | Je cherche la clé de l’appartement ! Elle a un petit ruban rouge. |
|  | 5 | `js/week1.js:162` | `d5_cam_ou` (line) | Où est la clé ? Tu ne sais pas ? |
|  | 5 | `js/week1.js:163` | `d5_noe_sais` (line) | Je ne sais pas ! J’ai perdu la clé… |
|  | 5 | `js/week1.js:170` | `d5_noe_poche` (line) | La clé était dans la poche de ma veste. |
|  | 5 | `js/week1.js:176` | `d5_noe_ruban` (line) | La clé avec le ruban rouge… Croissant adore les rubans ! |
| | | | | … +5 more story hits (function word / high reuse; not listed) |
| check | 5 | `js/week1.js:186` | `pr5_cle` (check (probe/baseline)) | J’ai perdu la clé. |

Changed form (14):

- D4 `js/week1.js:143` `d4_martin_cle` (line): J’ai une clé de l’appartement. Si vous n’êtes pas là samedi, j’entre.
- D4 `js/week1.js:144` `d4_noe_cles` (line): Euh… quelqu’un a vu mes clés ?
- D4 `js/week1.js:551` `n_d4_clic` (narration): Silence. Puis… clic. Dans le noir, quelqu’un met une clé dans la porte du 411.
- D4 `js/week1.js:552` step `hook` (choice/UI): Trois heures du matin. Quelqu’un ouvre la porte… avec une clé. Noé n’a plus ses clés. Madame Martin a une clé. Alors… qui ?
- D5 `js/week1.js:560` `n_d5_noir` (narration): Trois heures du matin. Clic… clic… Quelqu’un essaie une clé dans la porte du 411.
- D5 `js/week1.js:152` `d5_gag_bonsoir` (line): Pardon… Bonsoir. Ce sont vos clés ? Elles étaient dans l’escalier.
- … +8 more

Also in evening letters (player-written, `js/letters.js`): D5 `js/letters.js:304`: La clé ? Je l’ai trouvée dans le panier du chat.

### D5 · je cherche…

Exact hits: 3 story + 0 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:53` | `d2_noe_aide_moi` (line) | Tu peux servir ? Je cherche le beurre. |
|  | 5 | `js/week1.js:161` | `d5_noe_cherche` (line) | Je cherche la clé de l’appartement ! Elle a un petit ruban rouge. |
|  | 6 | `js/week1.js:197` | `d6_noe_pardon` (line) | Pardon, Madame. Je cherche mon chat. Il est petit et roux. |

Changed form (4):

- D2 `js/week1.js:358` `n_d2_servir` (narration): Noé cherche le beurre. Toi, tu sers les boissons. Écoute bien, et donne la bonne tasse.
- D5 `js/week1.js:574` `n_d5_matin` (narration): Le matin. Samedi, c’est dans trois jours. Noé cherche partout.
- D5 `js/week1.js:582` step `cover` (choice/UI): Ce n’est pas grave. On cherche ensemble.
- D5 `js/week1.js:607` step `d5_ou` (choice/UI): Écoute Camille. On cherche où ?

### D5 · je ne sais pas

Exact hits: 3 story + 0 check. ⚑ first heard on **Day 3**, before its list day. ⚑ a changed form is heard earlier (D1 `js/content.js:33`: Camille ne sait pas. Chut !).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 3 | `js/week1.js:89` | `d3_noe_jsp` (line) | Je ne sais pas ! |
|  | 4 | `js/week1.js:515` | step `jsp` (choice/UI) | Je ne sais pas ! |
|  | 5 | `js/week1.js:163` | `d5_noe_sais` (line) | Je ne sais pas ! J’ai perdu la clé… |

Changed form (8):

- D1 `js/content.js:33` `noe_camille` (line): Camille ne sait pas. Chut !
- D2 `js/week1.js:39` `d2_noe_camille` (line): Camille arrive. Elle ne sait pas, pour le chat.
- D3 `js/week1.js:437` `n_d3_visite` (narration): Noé a sommeil. Il a mis les colis… où ? Il ne sait pas. Avant de partir, il te montre l’appartement.
- D4 `js/week1.js:125` `d4_noe_stp` (line): Je sais, je sais… Camille, s’il te plaît.
- D4 `js/week1.js:136` `d4_gag_seule` (line): Je ne dors pas beaucoup, vous savez. Depuis l’hiver, je suis seule, en bas…
- D4 `js/week1.js:135` `d4_gag_martin` (line): Je connais bien Madame Martin, vous savez…
- … +2 more

### D5 · j’ai perdu…

Exact hits: 1 story + 1 check. ⚑ a changed form is heard earlier (D5 `js/week1.js:557`: Mission : la clé perdue).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 5 | `js/week1.js:163` | `d5_noe_sais` (line) | Je ne sais pas ! J’ai perdu la clé… |
| check | 5 | `js/week1.js:186` | `pr5_cle` (check (probe/baseline)) | J’ai perdu la clé. |

Changed form (2):

- D5 `js/week1.js:557` `mission` (line): Mission : la clé perdue
- D5 `js/week1.js:623` step `cle` (choice/UI): La clé est perdue.

### D5 · j’ai trouvé…

**NOT FOUND** as an exact form in any Day 1–6 line.

Changed form (4):

- D1 `js/week1.js:20` `l_martin_5` (line): Article 7 du bail : tout animal trouvé dans l’appartement devra partir.
- D3 `js/week1.js:103` `d3_call_trouve` (line): Tu as trouvé ? Super !
- D3 `js/week1.js:483` step `hook` (choice/UI): Camille a trouvé Croissant. Et maintenant ?
- D5 `js/week1.js:179` `d5_noe_trouvee` (line): La clé ! Dans le panier ! Je l’ai trouvée !

### D5 · hier

Exact hits: 10 story + 0 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:41` | `d2_noe_merci` (line) | Merci pour hier. Tu gardes le secret, hein ? |
|  | 5 | `js/week1.js:158` | `d5_gag_gentil` (line) | Vous avez dit pardon, hier. C’est gentil. |
|  | 5 | `js/week1.js:167` | `d5_cam_enquete` (line) | Bon. On fait une enquête ! Noé, hier soir, qu’est-ce que tu as fait ? |
|  | 5 | `js/week1.js:586` | `n_d5_hier` (narration) | Hier soir, dans la rue. Il pleuvait sur Paris. |
|  | 5 | `js/week1.js:168` | `d5_noe_pleuvait` (line) | Hier soir, il pleuvait. |
|  | 5 | `js/week1.js:596` | step `d5_meteo` (choice/UI) | Écoute encore. Hier soir, il faisait quel temps ? |
|  | 6 | `js/week1.js:194` | `d6_noe_raison` (line) | Tu avais raison, hier. C’est ma clé, c’est ma porte… c’est ma faute. |
|  | 6 | `js/week1.js:199` | `d6_pas_vu` (line) | Un petit chat roux ? Oui, je l’ai vu ! Hier, devant la supérette. |
| | | | | … +2 more story hits (function word / high reuse; not listed) |

Also in evening letters (player-written, `js/letters.js`): D5 `js/letters.js:296`: Hier soir, il pleuvait.

### D5 · je suis rentré(e)

Exact hits: 2 story + 1 check. ⚑ first heard on **Day 3**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 3 | `js/week1.js:116` | `d3_cam_rentree` (line) | Coucou ! Je suis rentrée ! |
|  | 5 | `js/week1.js:169` | `d5_noe_rentre` (line) | Je suis rentré à sept heures. |
| check | 5 | `js/week1.js:188` | `pr5_rentre` (check (probe/baseline)) | Je suis rentré à la maison. |

Changed form (1):

- D5 `js/week1.js:601` step `rentre` (choice/UI): Noé est rentré.

### D5 · d’abord… ensuite…

**NOT FOUND** as an exact form in any Day 1–6 line.

### D5 · la veste

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D5 `js/week1.js:170`: La clé était dans la poche de ma veste.).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 5 | `js/week1.js:591` | `F('veste')` (focus beat) | la veste (voice: La veste… ma veste.) |

Changed form (6):

- D5 `js/week1.js:170` `d5_noe_poche` (line): La clé était dans la poche de ma veste.
- D5 `js/week1.js:171` `d5_noe_pose` (line): J’ai posé ma veste sur le canapé.
- D5 `js/week1.js:172` `d5_noe_jouait` (line): Croissant jouait avec ma veste. Il adore ma veste.
- D5 `js/week1.js:173` `d5_noe_descendu` (line): Après, j’ai pris ma veste et je suis descendu, avec la poubelle.
- D5 `js/week1.js:602` step `pose` (choice/UI): Il a posé sa veste.
- D5 `js/week1.js:175` `d5_cam_attends` (line): Attends ! Quand tu étais en bas, Croissant jouait avec ta veste ?

### D5 · la poche

Exact hits: 1 story + 0 check. ⚑ a changed form is heard earlier (D5 `js/week1.js:583`: Croissant ? Il n’a pas de poches !).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 5 | `js/week1.js:170` | `d5_noe_poche` (line) | La clé était dans la poche de ma veste. |

Changed form (1):

- D5 `js/week1.js:583` step `poches` (choice/UI): Croissant ? Il n’a pas de poches !

### D6 · la rue

Exact hits: 6 story + 0 check. ⚑ first heard on **Day 2**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 2 | `js/week1.js:34` | `d2_noe_superette2` (line) | La supérette, c’est le petit magasin, au coin de la rue. |
|  | 2 | `js/week1.js:379` | `n_d2_shop` (narration) | Voici la supérette, au coin de la rue. Il y a du lait, du pain… et des croquettes ! |
|  | 5 | `js/week1.js:586` | `n_d5_hier` (narration) | Hier soir, dans la rue. Il pleuvait sur Paris. |
|  | 6 | `js/week1.js:196` | `d6_cam_rue` (line) | Bon. On va dans la rue. On demande aux gens. |
|  | 6 | `js/week1.js:646` | `n_d6_rue` (narration) | Dans la rue. Les gens passent vite. Noé montre une photo de Croissant. |
|  | 6 | `js/week1.js:647` | `F('rue')` (focus beat) | la rue (voice: La rue… dans la rue.) |

Changed form (5):

- D6 `js/week1.js:203` `d6_clerk_parc` (line): À droite, c’est votre rue. Mais à gauche, il y a le parc… Les chats adorent le parc.
- D6 `js/week1.js:665` step `d6_route` (choice/UI): À gauche, le parc. À droite, notre rue. Tu vas où ?
- D6 `js/week1.js:667` step `droite` (choice/UI): À droite : notre rue
- D6 `js/week1.js:667` step `droite` (choice/UI): Vous rentrez dans votre rue.
- D6 `js/week1.js:206` `d6_cam_bien` (line): Notre rue… Bonne idée. Écoutez !

### D6 · à gauche

Exact hits: 5 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:663` | step `gauche` (choice/UI) | à gauche |
|  | 6 | `js/week1.js:203` | `d6_clerk_parc` (line) | À droite, c’est votre rue. Mais à gauche, il y a le parc… Les chats adorent le parc. |
|  | 6 | `js/week1.js:665` | step `d6_route` (choice/UI) | À gauche, le parc. À droite, notre rue. Tu vas où ? |
|  | 6 | `js/week1.js:666` | step `gauche` (choice/UI) | À gauche : le parc |
|  | 6 | `js/week1.js:703` | step `gauche` (choice/UI) | à gauche |
| check | 6 | `js/week1.js:226` | `pr6_gauche` (check (probe/baseline)) | Tournez à gauche. |

### D6 · à droite

Exact hits: 7 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:202` | `d6_clerk_droite` (line) | Oui, je l’ai vu, hier soir. Il est allé tout droit… puis à droite. |
|  | 6 | `js/week1.js:663` | step `gauche` (choice/UI) | à droite |
|  | 6 | `js/week1.js:203` | `d6_clerk_parc` (line) | À droite, c’est votre rue. Mais à gauche, il y a le parc… Les chats adorent le parc. |
|  | 6 | `js/week1.js:665` | step `d6_route` (choice/UI) | À gauche, le parc. À droite, notre rue. Tu vas où ? |
|  | 6 | `js/week1.js:667` | step `droite` (choice/UI) | À droite : notre rue |
|  | 6 | `js/week1.js:205` | `d6_cam_retour` (line) | On retourne. À droite, vite ! |
|  | 6 | `js/week1.js:703` | step `gauche` (choice/UI) | à droite |
| check | 6 | `js/week1.js:227` | `pr6_droite` (check (probe/baseline)) | Tournez à droite. |

### D6 · tout droit

Exact hits: 3 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:202` | `d6_clerk_droite` (line) | Oui, je l’ai vu, hier soir. Il est allé tout droit… puis à droite. |
|  | 6 | `js/week1.js:663` | step `gauche` (choice/UI) | tout droit |
|  | 6 | `js/week1.js:703` | step `gauche` (choice/UI) | tout droit |
| check | 6 | `js/week1.js:228` | `pr6_droit` (check (probe/baseline)) | Allez tout droit. |

### D6 · vous avez vu… ?

Exact hits: 1 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:649` | step `vous` (choice/UI) | Pardon, Madame. Vous avez vu un chat ? |

Changed form (1):

- D6 `js/week1.js:649` step `vous` (choice/UI): Salut ! Tu as vu un chat ?

### D6 · je l’ai vu

Exact hits: 2 story + 0 check. ⚑ a changed form is heard earlier (D4 `js/week1.js:144`: Euh… quelqu’un a vu mes clés ?).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:199` | `d6_pas_vu` (line) | Un petit chat roux ? Oui, je l’ai vu ! Hier, devant la supérette. |
|  | 6 | `js/week1.js:202` | `d6_clerk_droite` (line) | Oui, je l’ai vu, hier soir. Il est allé tout droit… puis à droite. |

Changed form (4):

- D4 `js/week1.js:144` `d4_noe_cles` (line): Euh… quelqu’un a vu mes clés ?
- D6 `js/week1.js:649` step `vous` (choice/UI): Pardon, Madame. Vous avez vu un chat ?
- D6 `js/week1.js:649` step `vous` (choice/UI): Salut ! Tu as vu un chat ?
- D6 `js/week1.js:657` step `d6_ou` (choice/UI): Écoute la dame. Elle a vu Croissant où ?

### D6 · petit / petite

Exact hits: 13 story + 1 check. ⚑ first heard on **Day 1**, before its list day.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 1 | `js/content.js:83` | `paper` (narration) | Tout est calme… Mais devant la porte, un petit bruit : « Frrrt… » Qu’est-ce que c’est ? |
|  | 2 | `js/week1.js:362` | `n_d2_miaou` (narration) | Sous la table, un petit bruit : « Miaou… » |
|  | 2 | `js/week1.js:34` | `d2_noe_superette2` (line) | La supérette, c’est le petit magasin, au coin de la rue. |
|  | 2 | `js/week1.js:327` | `mission` (line) | Mission : le petit-déjeuner secret |
|  | 4 | `js/week1.js:141` | `d4_cam_mot` (line) | On écrit un petit mot pour Madame Lefèvre ? Avec « vous », hein ! |
|  | 5 | `js/week1.js:161` | `d5_noe_cherche` (line) | Je cherche la clé de l’appartement ! Elle a un petit ruban rouge. |
|  | 5 | `js/week1.js:626` | `n_d5_air` (narration) | Un petit courant d’air… La porte bouge. |
|  | 6 | `js/week1.js:197` | `d6_noe_pardon` (line) | Pardon, Madame. Je cherche mon chat. Il est petit et roux. |
| | | | | … +5 more story hits (function word / high reuse; not listed) |
| check | 6 | `js/week1.js:229` | `pr6_roux` (check (probe/baseline)) | C’est un petit chat roux. |

Changed form (1):

- D5 `js/week1.js:570` `n_d5_regarde` (narration): Madame Lefèvre regarde dans l’appartement. Derrière Noé, sur le canapé… deux petits yeux.

Also in evening letters (player-written, `js/letters.js`): D2 `js/letters.js:194`: Au petit-déjeuner, elle a bu du café.

### D6 · roux / rousse

Exact hits: 7 story + 1 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:197` | `d6_noe_pardon` (line) | Pardon, Madame. Je cherche mon chat. Il est petit et roux. |
|  | 6 | `js/week1.js:652` | `F('roux')` (focus beat) | roux (voice: Roux… un chat roux.) |
|  | 6 | `js/week1.js:198` | `d6_pas_non` (line) | Un chat roux ? Non, désolée. |
|  | 6 | `js/week1.js:655` | step `roux` (choice/UI) | un petit chat roux |
|  | 6 | `js/week1.js:199` | `d6_pas_vu` (line) | Un petit chat roux ? Oui, je l’ai vu ! Hier, devant la supérette. |
|  | 6 | `js/week1.js:210` | `d6_gag_avous` (line) | Bonjour. Ce petit chat roux… il est à vous, je crois ? |
|  | 6 | `js/week1.js:703` | step `gauche` (choice/UI) | un petit chat roux |
| check | 6 | `js/week1.js:229` | `pr6_roux` (check (probe/baseline)) | C’est un petit chat roux. |

### D6 · le balcon

Exact hits: 4 story + 0 check.

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:207` | `d6_noe_la` (line) | Là ! Sur le balcon ! C’est Croissant ! |
|  | 6 | `js/week1.js:674` | `F('balcon')` (focus beat) | le balcon (voice: Le balcon… sur le balcon.) |
|  | 6 | `js/week1.js:675` | `n_d6_jambon` (narration) | Sur le balcon du premier étage, Croissant mange… du jambon. |
|  | 6 | `js/week1.js:677` | `n_d6_fenetre` (narration) | La fenêtre s’ouvre. Ce balcon… c’est le balcon de Madame Lefèvre. |

### D6 · chez moi

Exact hits: 2 story + 0 check. ⚑ a changed form is heard earlier (D1 `js/content.js:29`: Bienvenue chez nous !).

| first? | day | file:line | id (kind) | quoted line |
|---|---|---|---|---|
| **FIRST** | 6 | `js/week1.js:218` | `d6_gag_garder` (line) | Je peux le garder chez moi, demain matin. Pendant la visite. |
|  | 6 | `js/week1.js:691` | step `oui` (choice/UI) | Madame Lefèvre sourit. « Dix heures moins le quart, chez moi. » |

Changed form (3):

- D1 `js/content.js:29` `noe_bienvenue` (line): Bienvenue chez nous !
- D1 `js/week1.js:17` `l_martin_2` (line): Samedi, je viens chez vous.
- D4 `js/week1.js:132` `d4_gag_lent` (line): Quelqu’un courait… là-haut. Chez vous !
