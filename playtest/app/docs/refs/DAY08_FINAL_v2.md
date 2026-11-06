# Day 8 « Le basilic » — FINAL v2 (key day; lundi; Week 2, Pot ② À table)

> **Status: FINAL v2** (Le Réalisateur, 2026-10-13 PT). Rewrite of `DAY08_FINAL.md` per `ACT1_D8_14_REBEAT.md` §1, §3, §4 (approved by CEO Croissant; no conflict with PR #19). Old file kept untouched.
> Chapter `d8`, n 8, title « Le basilic », lundi. **Clip ids keep their old prefixes** (`d8_*`, `d9_*`, `d10_*` for lines moved in from old Day 9). Letter **8** unchanged.
> French: U+202F before ? ! : ; and inside « », curly ’. REUSED = existing take; MOVED = existing take from `DAY09_FINAL.md`, now on Day 8; **NEW** = needs a take; **[NENG]** = new/reworded line awaiting Prof Neng.
> Rules: walking **only** on the night stairwell (down to her door, up to the roof: one walking segment). Lefèvre: vous, « Madame Lefèvre », never her first name; she explains nothing about the key (reveal Day 11). Mechanics never explained (no "plant = words", no XP, no tutorial text).

## 0. Overview
- **One small story:** a Monday. The plant can’t be safe with Croissant. The neighbour brings basil (a second plant, same problem) and an invitation. Dinner downstairs: Croissant takes the fourth chair, she asks for Thursdays. At her door she gives the player the old key. That night the roof opens; the basil is planted and watered.
- **Setup → payoff in one day:** « Ici, avec Croissant… non. » (morning) → the key (evening) → a safe place upstairs (night). Nobody says it.
- **High point (one):** the first watering under the moon. The fourth chair is now a beat, not the peak.
- **Hook:** tilt down from the roof to her lit window; she looks up; her hand is empty.
- **Required chunks (5):** `cest_du_basilic`, `venez_a_six_heures`, `asseyez_vous`, `vous_voulez_venir_le_jeudi`, `cest_pour_moi` (moved from Day 9).
- **Recognition:** `vous_voulez_de_la_soupe` (callback Day 11), « Il faut de l’eau. » (heard once, chunk on Day 9), « Non, Croissant ! », « Attention ! », *depuis* ×1 (« seule depuis l’hiver »), `je_voudrais_du_pain` (review), `le toit`, `le jardin`, `Allez-y.`
- **Pots:** pot ② = the basil, planted on the roof tonight (first pot). Pot ① = Martin’s plant, stays on the kitchen table tonight; goes up on Day 9.
- **Flags:** `has_key` set at step 38; hub hotspot `rooftop` opens permanently at step 42.
- **Steps: 47 + 1b `d8_cam_depuis` (restored 2026-10-14) = 48** (+ done). Cuts applied: `plantguard_r3`, old steps 9–10 (band `d8_cam_*`, `d8_cam_depuis`), pick `d9_table`, coda 41, end card 42.

## 1. Scene steps
### A. Morning: « Sauve la plante » (kitchen, 7:30)
1. **narr** `n_d8_matin` — REUSED — art {"sfx":"meow","scene":"kitchen","noe":"sad","cat":"sit","props":[["plantp",54,28,"hl"]]}
    - FR: Lundi matin. Dans la cuisine, ta plante est sur la table. Croissant la regarde.
    - zh: 星期一早上。厨房里，你的植物在桌上。Croissant 盯着它。
    - en: Monday morning. In the kitchen, your plant is on the table. Croissant is looking at it.
    - (2026-10-14: synced to build / `D7_ARROSOIR_PATCH.md` §3; was « la plante de samedi ».)
1b. **line** `d8_cam_depuis` — RESTORED (CEO 2026-10-14; existing take) — speaker: camille · label: understand
    - FR: Une semaine ! Tu habites ici depuis une semaine.
    - zh: 一周了！你住在这儿已经一周了。
    - en: A week! You’ve lived here for a week.
2. **line** `d8_noe_matin` — REUSED — art {"scene":"kitchen","noe":"point","cat":"sit","props":[["plantp",54,28]],"focus":"plantp"}
    - speaker: noe · label: understand
    - FR: Lundi, sept heures et demie. Regarde la plante !
    - zh: 星期一，七点半。你看这盆植物！
    - en: Monday, half past seven. Look at the plant!
3. **F** `plante` — REUSED focus beat (word clip `w_plante`)
4. **minigame** `plantguard_r1` — REUSED design (round 1, slow creep)
    - FR: Noé : « Non, Croissant ! »
    - tts: Non, Croissant !
    - zh: 不行，Croissant！ · en: No, Croissant!
    - **player / direction:** Croissant creeps along the table toward the pot (pot wobbles when close). **Tap Croissant** before his paw touches it → he freezes, offended, retreats. Miss → Noé dive-catches the pot, round replays once, then continues anyway.
5. **minigame** `plantguard_r2` — REUSED design (round 2, faster + one feint) — **last round** (r3 cut)
    - FR: Camille : « Attention ! »
    - tts: Attention !
    - zh: 小心！ · en: Careful!
    - **player / direction:** He stops, licks his paw, then dashes. Tap him. Camille lifts him slowly away (absorbs r3’s gesture, no line).
6. **narr** `n_d8_boum` — REUSED — art: everyone exhales, turns away; Croissant pushes Camille’s cup off the other edge; sfx crash; slow blink
    - FR: Boum ! La tasse de Camille tombe. Croissant cligne des yeux.
    - zh: 咣！Camille 的杯子掉了。Croissant 眨了眨眼。
    - en: Boom! Camille’s cup falls. Croissant blinks.
7. **line** `d8_noe_plante` — REUSED — noe, understand; holding the pot, head shake on « non »
    - FR: Et la plante ? Ici, avec Croissant… non.
    - tts: Et la plante ? Ici, avec Croissant… non.
    - zh: 那这盆植物呢？在这儿，有 Croissant……不行。
    - en: And the plant? Here, with Croissant… no.
    - **player / direction:** nobody answers. 1 s silence. (Paid off tonight, never said aloud.)

### B. The knock: basil (doorway)
8. **narr** `n_d8_toc` — REUSED — art {"sfx":"knock","scene":"doorway","door":"closed","camille":"ask"}
    - FR: Toc toc ! Quelqu’un frappe à la porte.
    - zh: 咚咚！有人敲门。 · en: Knock knock! Someone is at the door.
9. **narr** `n_d8_porte` — REUSED — art {"sfx":"door","scene":"doorway","door":"open","voisine":"idle","camille":"idle","props":[["basil",28,40]]}
    - FR: Camille ouvre. C’est Madame Lefèvre. Elle a un petit pot dans les mains.
    - zh: Camille 打开门。是 Lefèvre 太太。她手里端着一个小花盆。
    - en: Camille opens the door. It’s Madame Lefèvre. She has a little pot in her hands.
10. **line** `d8_gag_bonjour` — REUSED — art {"scene":"doorway","door":"open","voisine":"idle","camille":"wave","props":[["basil",28,40]]}
    - speaker: lefevre · label: atmosphere
    - FR: Bonjour ! C’est moi, Madame Lefèvre.
    - zh: 你们好！是我，Lefèvre 太太。 · en: Hello! It’s me, Madame Lefèvre.
11. **line** `d8_gag_basilic` — REUSED — art {"scene":"doorway","door":"open","voisine":"idle","camille":"idle","props":[["basil",28,40]],"focus":"basil"}
    - speaker: lefevre · label: understand · target `cest_du_basilic`
    - FR: C’est du basilic, pour la cuisine.
    - zh: 这是罗勒，给厨房用的。 · en: It’s basil, for the kitchen.
    - **player / direction:** behind her, Croissant’s head turns slowly toward the new pot (second plant, same problem; no line).
12. **F** `basilic` — REUSED focus beat (word clip `w_basilic`)
13. **pick** key `d8_pot` — REUSED (mode task)
    - prompt FR: Écoute. Quel pot ? · zh: 听。是哪一个盆？
    - opt `plant`: « la plante en fleurs » (开花的那盆) · opt `basil`: « le basilic » (罗勒) · opt `bowl`: « le bol » (碗)
    - items: [{"line":"d8_gag_basilic","answer":"basil"}] · pictures only
14. **say** key `d8_merci` — REUSED
    - prompt FR: Madame Lefèvre te regarde. Tu dis quoi ? · zh: Lefèvre 太太看着你。你说什么？（没有标准答案）
    - opts `merci` « Merci, Madame. » / `gentil` « C’est gentil, Madame Lefèvre. » / `entrer` « Vous voulez entrer ? » · default `merci`; optional mic

### C. The invitation
15. **line** `d8_gag_venez` — REUSED — speaker: lefevre · label: understand · target `venez_a_six_heures`
    - FR: Venez chez moi à six heures. J’ai une question.
    - zh: 六点到我家来。我有一个问题。 · en: Come to my place at six. I have a question.
    - **player / direction:** she beckons, points down (her flat), points at the clock; « ? » emote; she doesn’t explain
16. **pick** `d8_heure` — REUSED — mode task, item line `d8_gag_venez`, answer `six`
    - FR: À quelle heure ? · zh: 几点？ · en: At what time?
    - **player / direction:** three clock faces 6 / 7 / 9 with sunset/moon windows. Wrong → the 6 glows.
17. **narr** `n_d8_cinq` — REUSED — art: time-skip card, kitchen in evening light; **both pots on the table, Croissant asleep between them (one wobbles as he breathes)**; card « 17 h 55 »
    - FR: Six heures moins cinq.
    - zh: 差五分六点。 · en: Five to six.

### D. Night stairwell, down (walk part 1)
18. **narr** `n_d9_soir` — REUSED — art {"sfx":"steps","scene":"stairs","noe":"idle","camille":"idle"}
    - FR: Lundi soir. Six heures. Noé et Camille descendent l’escalier.
    - zh: 星期一晚上。六点。Noé 和 Camille 下楼。 · en: Monday evening. Six o’clock. Noé and Camille go down the stairs.
19. **line** `d8_cam_descend` — REUSED — camille, understand; objective line at the 411 door
    - FR: On descend ? Elle nous attend.
    - zh: 下楼吧？她在等我们。 · en: Shall we go down? She’s waiting for us.
    - **player / direction:** **Walk** down one flight (≤ 8 tiles). Her door glows. On the way: soup steam under her door; off-screen paws. Rooftop door above: tap = soft rattle only, no text.
20. **line** `d9_noe_chat` — REUSED — speaker: noe · label: atmosphere
    - FR: Croissant reste en haut… normalement.
    - zh: Croissant 留在楼上……按理说是这样。 · en: Croissant stays upstairs… normally.
21. **line** `d9_cam_basilic` — REUSED — speaker: camille · label: understand
    - FR: On apporte un peu de basilic. Pour sa soupe.
    - zh: 我们带了一点罗勒，给她的汤用。 · en: We are bringing a little basil. For her soup.
    - **player / direction:** Camille carries the basil pot (it comes back up tonight).
22. *(band, one line, `when: d7_band`)* — REUSED — on the landing: `d9_cam_a` « Ce soir, on est tranquilles. » / `d9_cam_b` « Ce soir, pas de bruit chez elle. » / `d9_cam_c` « Ce soir, on est très polis. » / `d9_cam_null` « Ce soir, on est polis. » (zh/en unchanged from `DAY08_FINAL.md`)

### E. Her door, her table
23. **line** `d9_lef_bonsoir` — REUSED — speaker: lefevre · label: atmosphere
    - FR: Bonsoir ! Entrez, entrez.
    - zh: 晚上好！进来，进来。 · en: Good evening! Come in, come in.
24. **line** `d9_lef_asseyez` — REUSED — art: round table, 4 chairs, 4 plates, key in front of chair 4 · speaker: lefevre · label: understand · target `asseyez_vous`
    - FR: Asseyez-vous, s’il vous plaît.
    - zh: 请坐。 · en: Please sit down.

### F. The fourth chair (beat, not the peak)
25. **line** `d9_lef_soupe` — REUSED — speaker: lefevre · label: understand · **recognition** (no longer a required chunk)
    - FR: Vous voulez de la soupe ?
    - zh: 你们要喝汤吗？ · en: Would you like some soup?
26. **narr** `n_d9_croissant` — REUSED — art {"sfx":"sfx_meow_small","scene":"cat_chair"}
    - FR: Mais… Croissant est là ! Sur la chaise vide !
    - zh: 可是……Croissant 在这儿！就在那把空椅子上！ · en: But… Croissant is here! On the empty chair!
    - **player / direction:** breath shortened to 1 s (the long hold is saved for the watering)
27. **line** `d9_lef_place` — REUSED — speaker: lefevre · label: atmosphere; **she laughs (first time)**
    - FR: Bon… il a choisi sa place.
    - zh: 好吧……它挑好自己的座位了。 · en: Well… he has chosen his place.
28. **say** key `d9_soupe` — REUSED
    - prompt FR: Madame Lefèvre te regarde. Tu dis quoi ? · zh: Lefèvre 太太看着你。你说什么？（没有标准答案）
    - opts `oui` « Oui, merci, Madame. » / `pain` « Je voudrais du pain, s’il vous plaît. » / `peu` « Un peu, s’il vous plaît. » · default `oui`
29. **line** `d9_noe_pain` — REUSED — speaker: noe · label: understand · target `je_voudrais_du_pain` (review). Pick `d9_table` CUT.
    - FR: Moi, je voudrais du pain. Et du fromage !
    - zh: 我呢，想要面包。还有奶酪！ · en: Me, I would like some bread. And some cheese!

### G. Thursday
30. **line** `d9_lef_question` — REUSED — speaker: lefevre · label: understand; 1 s silence before
    - FR: J’ai une question.
    - zh: 我有一个问题。 · en: I have a question.
31. **line** `d9_lef_jeudi` — REUSED — speaker: lefevre · label: understand · target `vous_voulez_venir_le_jeudi`; calendar pulses
    - FR: Vous voulez venir manger le jeudi ?
    - zh: 你们愿意每个星期四来吃饭吗？ · en: Would you like to come and eat on Thursdays?
32. **line** `d9_lef_seule` — REUSED — speaker: lefevre · label: understand
    - FR: Je suis seule depuis l’hiver. Le jeudi, c’est long.
    - zh: 从冬天起我就一个人。星期四，日子很长。 · en: I have been alone since the winter. Thursdays are long.
33. **choice** key `d9_jeudi` — REUSED (options and after-lines unchanged: `oui` / `cuisine` / `parfois`) · default `oui`

### H. The key on the table
34. **narr** `n_d9_cle` — REUSED — art {"sfx":"sfx_key_tap","scene":"cat_paw"}
    - FR: Croissant touche la clé, sur la table.
    - zh: Croissant 伸爪碰了碰桌上的钥匙。 · en: Croissant touches the key, on the table.
35. **line** `d9_lef_cle` — REUSED — speaker: lefevre · label: understand · focus key (F `cle` folded, word clip `w_cle`)
    - FR: C’est une clé. Une vieille clé.
    - zh: 这是一把钥匙。一把旧钥匙。 · en: It is a key. An old key.
    - **[v2 edit] direction:** she does NOT put it in the drawer. She covers it with her hand. (No sfx drawer.)
36. **line** `d8_noe_danger` — **NEW, French approved** — speaker: noe · label: atmosphere; Croissant now pawing at the basil Camille set on the table; Noé moves the pot away, grinning
    - FR: Croissant adore les plantes. Les plantes, elles, n’adorent pas Croissant.
    - tts: Croissant adore les plantes. Les plantes, elles, n’adorent pas Croissant.
    - zh: Croissant 超爱植物。植物可不爱它。 (approved)
    - en: Croissant loves plants. The plants, not so much. (approved)
    - **player / direction:** everyone laughs. Then art only, no text, 1.5 s: she looks at the key under her hand, at the basil, at the fourth chair.

### I. At her door (block D)
37. **narr** `n_d10_cle` — MOVED (text from Day 9 step 14, prefixed) — art: her doorway, leaving; Camille holds the basil; Lefèvre stops the player, takes their hand, opens hers
    - FR: À la porte, elle ouvre la main. La vieille clé.
    - zh: 在门口，她摊开手。那把旧钥匙。 · en: At the door, she opens her hand. The old key.
    - (« À la porte, » prefix is the only change; same structure as reviewed line.)
37a. **hotspot** `lfd_fenetre` — **NEW [NENG]** — optional tap, visible from her doorway (not counted as a step; no prompt, no marker beyond the tap glow): her plant on the windowsill, drooping
    - FR: À la fenêtre, une plante. Elle a soif.
    - zh: 窗边有一盆植物。它渴了。 · en: At the window, a plant. It is thirsty.
    - words: fenêtre, plante (①), avoir soif (②); 0 off-list.
37b. **hotspot** `lfd_chaises` — **NEW [NENG]** — optional tap, visible from her doorway: the round table behind her, the fourth chair empty (Croissant already left it)
    - FR: À côté de la table, une chaise vide.
    - zh: 桌子旁边，一把空椅子。 · en: Next to the table, an empty chair.
    - words: à côté de, la table (①); off-list: *chaise* (1). (« vide » is already heard in `n_d9_croissant`.)
    - **direction:** both hotspots are live only between steps 37 and 38; tapping either never delays the handover; step 38 continues on tap of Lefèvre.
38. **line** `d10_lef_jardin` — MOVED — speaker: lefevre · label: understand; she puts the key in the player’s hand; sets `has_key`
    - FR: La clé du toit. Il y a un jardin, là-haut.
    - zh: 楼顶的钥匙。上面有一个花园。 · en: The key to the roof. There is a garden, up there.
39. **say** `d10_pourmoi` — MOVED (chunk `cest_pour_moi`), any attempt counts
    - opts `pourmoi` « C’est pour moi ? » (给我的？) / `merci` « Merci, Madame. » (谢谢您) / `quoi` « C’est quoi ? » (这是什么？) · default `pourmoi`; all → 40
40. **line** `d10_lef_allez` — MOVED — speaker: lefevre · label: understand; she glances at the ceiling, then steps back; her door closes softly (sfx), line of light under it
    - FR: Allez-y. Moi… pas encore.
    - zh: 你们去吧。我……还不行。 · en: Go on. Me… not yet.

### J. Night stairwell, up (walk part 2)
41. **line** `d10_noe_porte` — MOVED — speaker: noe · label: understand; objective line
    - FR: La petite porte, là-haut !
    - zh: 上面那扇小门！ · en: The little door, up there!
    - **player / direction:** **Walk** up two flights (past 411). Croissant runs ahead. The rooftop door glows (tap guide). Same walking segment as step 19, same controls.
42. **narr** `n_d10_monte` — MOVED — player taps `rooftop` (no label); key auto-used; hotspot `rooftop` opens permanently
    - FR: La clé tourne. La porte s’ouvre.
    - zh: 钥匙转动。门开了。 · en: The key turns. The door opens.

### K. The roof at night — HIGH POINT
43. **F** `toit` — MOVED — scene `rooftop` **night**: moon, chimneys, dry pots in silhouette, an old chair, a faded sign (no readable text). Word clip `w_toit`. Croissant first out.
44. **F** `jardin` — MOVED — focus on the dry pots in moonlight, word clip `w_jardin`. (`d10_cam_toit`, `d10_noe_sec` move to Day 9: day shows what night hides.)
45. **line** `d10_noe_ici` — MOVED — speaker: noe · label: understand; one clean empty pot glows faintly (no marker, no text); player taps `pot_empty`
    - FR: Ici ? Dans ce pot ?
    - zh: 放这里？种在这个盆里？ · en: Here? In this pot?
    - (Rebeat note « Un pot vide… là-bas ! / Ici ? » resolved to the reviewed take; no new French.)
46. **narr** `n_d10_plante` — MOVED (Prof Neng-reviewed v2 text, one pot) — anim: player plants the basil (pot ②); Croissant digs beside it, soil everywhere
    - FR: Tu plantes le basilic. Croissant aide… un peu trop.
    - zh: 你种下罗勒。Croissant 帮忙……帮过头了。 · en: You plant the basil. Croissant helps… a bit too much.
47. **narr** `n_d10_arrose` — MOVED — **HIGH POINT.** Noé holds out the watering can (it was by the chair); player taps it. Under the moon: water, soil darkens, one leaf lifts. **Breath: 3 s hold**, music sting, no text overlay, no numbers, no XP. Under the hold, Noé softly (recognition only, no prompt, no deck): « Il faut de l’eau. » — Noé take `d8_noe_eau`, **NEW recording of already-reviewed French**.
    - FR: L’eau coule. La terre devient plus sombre. Une feuille se redresse.
    - zh: 水流下去。泥土变深了。一片叶子抬了起来。 · en: The water runs. The soil gets darker. A leaf lifts up.
48. **done** — end card **NEW** (replaces « C’est la clé de qui ? »). Art: on the roof, the basil, wet soil, Croissant curled by the pot. Slow tilt down the building façade to her window: lamp on; she stands at the window, looking up; her hand is empty. Hold. Black.
    - hook FR **[NENG]**: Sur le toit, une plante qui ne dort plus. En bas, une lampe qui reste allumée.
    - zh: 楼顶上，一株植物醒了。楼下，一盏灯一直亮着。
    - en: On the roof, a plant that no longer sleeps. Downstairs, a lamp that stays on.
    - Prof Neng: check « qui reste allumée » (A2, recognition only).

### Cut in v2 (vs `DAY08_FINAL.md`)
`plantguard_r3` (« Doucement… »), band `d8_cam_a/b/c/lundi`, `d8_cam_depuis`, pick `d9_table`, `d9_noe_cle` (« C’est la clé de qui ? », question now left to the hook), drawer sfx, coda 41, end card 42. Takes kept on file.

## 2. Letter 8 (desk) — pronominaux
Unchanged text and lesson (« Ce soir, nous dînons chez la voisine. Nous nous [asseyons] à sa table. / Noé se [lève] trois fois pour le pain ! / Elle nous invite le [jeudi]. / Sur la table, il y a une vieille [clé]. »). Still true in v2. Available after the done card (player reads it next session or after the roof).

## 3. Ritual / plant / evening
- Bravo ritual unchanged.
- **Garden goes live:** from step 47 the basil (pot ②) is the first rooftop pot. The watering at step 47 *is* tonight’s watering ritual (no separate ritual screen today). Pot ① stays on the kitchen table tonight (art in step 17, wobble gag).
- Evening animation = the done card tilt (old coda 41 removed).

## 4. Deck (module week2, story d8)
`cest_du_basilic`, `venez_a_six_heures`, `asseyez_vous`, `vous_voulez_venir_le_jeudi`, `cest_pour_moi` (id unchanged, moved from d10). Demoted: `vous_voulez_de_la_soupe` (recognition, returns Day 11), `depuis_une_semaine`, `je_voudrais_du_pain` (review), `encore_un_peu` (recognition).

## 5. New audio / art
- NEW takes: `d8_noe_danger` (approved), `lfd_fenetre`, `lfd_chaises` [NENG], `d8_noe_eau` (Noé, « Il faut de l’eau. », soft), `n_d10_cle` re-cut with « À la porte, ».
- MOVED takes (record once, used Day 8): `d10_lef_jardin`, `d10_lef_allez`, `d10_noe_porte`, `n_d10_monte`, `d10_noe_ici`, `n_d10_plante`, `n_d10_arrose`, `w_toit`, `w_jardin`.
- Art: `rooftop` **night** variant (P0), Lefèvre doorway handover pose (window plant + round table with empty chair visible behind her for hotspots 37a/37b), end-card façade tilt with lit window. Reused: stairwell, key, basil, watering_can.

## 6. 导演说明
1. 钥匙的动机在一天内闭环：早上"植物放哪儿都不安全"，下午又来了一盆罗勒，晚饭时 Croissant 扑罗勒、Noé 开玩笑，她看了看钥匙、罗勒、椅子。门口她只给钥匙，什么都不解释。谁的钥匙留到第 11 天。
2. 唯一高点是月光下第一次浇水（3 秒停顿）。第四把椅子只是一拍，停顿缩到 1 秒。
3. « Il faut de l’eau. » 今天只让 Noé 轻声说一次，第 9 天才由玩家说出口。
4. 结尾不再问"谁的钥匙"，问题留在画面里：她为什么把钥匙给出去，自己却不上去？

## 7. [NENG] lines
0. step 36 `d8_noe_danger` now approved (« Les plantes, elles, n’adorent pas Croissant. »).
1. step 48 hook: « Sur le toit, une plante qui ne dort plus. En bas, une lampe qui reste allumée. »
2. steps 37a/37b doorway hotspots: « À la fenêtre, une plante. Elle a soif. » · « À côté de la table, une chaise vide. »
3. (`n_d10_basilic` is on Day 9, see `DAY09_FINAL_v2.md`.)
Also light-check (structure already reviewed): step 37 « À la porte, elle ouvre la main. La vieille clé. »
