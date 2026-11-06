# Week 1–2 new-vocabulary list (Days 1–14), DRAFT

Owner: Prof Neng · 2026-10-15 · Status: draft; structure decided by Croissant, freq column verified, awaiting final sign-off

**Decisions (Croissant, 2026-10-15)**
1. Canonical source for Days 9–14 is the **built content** (`d10…d14s` lines). `WEEK2_STORY.md` will be updated to match it. **« pour que + subjonctif » is cut from Day 14.**
2. **Max 10 new items per day** (Carnet `new-per-day` = 10).
3. **Chunks are tracked as one Item**; they are not split into sibling cards. Review load stays as it is for now.
Feeds: Carnet `Item` (one row = one Item; chunks are one Item). Every item must appear in a Scène Line before it reaches Jardin, Répondeur or Réplique.

**Method**
- Grounded in built content: Days 1–7 from `docs/WEEK1_STORY.md` (as built), Days 8–14 from the act1days cache (`879675ee…`). Clip prefix mapping: display Day 9 = `d10`, 10 = `d11`, 11 = `d12`, 12 = `d13`, 13 = `d14`, 14 = `d14s`.
- High frequency first. **Freq note is computed** (2026-10-15) from **Lexique 3.83, `freqlemfilms2`** (lemma frequency per million in film subtitles, lexique.org, CC BY-SA). Lemmas are ranked by their highest freqlemfilms2 across parts of speech (rank 1000 = grandir, rank 3000 = pétrole). Labels: **top-1000** (rank ≤1000), **top-3000** (≤3000), **scene** (>3000: low general frequency, kept because the story needs it). Single words use the lemma rank. Chunks use the rank of their **rarest content word**, with the fixed adverb d’abord counted as one lemma. The cell shows `label (#rank lemma)`. **⚑ was X** marks a label that changed from my earlier estimate (30 of 140 changed). Cross-check: Hermitdave FrequencyWords `fr_50k` (2018 OpenSubtitles word forms) was also downloaded but not used for ranking because it is not lemmatised.
- 10 items per day. Grammar shows up inside chunks; it does not get its own row.
- Gender: m / f / — . For l’ words the gender is in the item, e.g. l’eau (f.).
- Days 1–6 are frozen in the old engine. Their lists are here so Carnet can tag them and Jardin can review them. No content changes.

| day | item | type | gender | freq note | already in story? | zh gloss | en gloss |
|---|---|---|---|---|---|---|---|
| 1 | bonjour | chunk | — | top-1000 (#179 bonjour) | y | 你好 | hello |
| 1 | je m’appelle… | chunk | — | top-1000 (#100 appeler) | y | 我叫…… | my name is… |
| 1 | c’est… | chunk | — | top-1000 (#1 être) | y | 这是…… | it’s… / this is… |
| 1 | merci | chunk | — | top-1000 (#121 merci) | y | 谢谢 | thank you |
| 1 | l’appartement (m.) | noun | m | top-1000 (#860 appartement) ⚑ was top-3000 | y | 公寓 | apartment |
| 1 | la plante | noun | f | top-3000 (#2221 plante) | y | 植物 | plant |
| 1 | le chat | noun | m | top-1000 (#736 chat) ⚑ was top-3000 | y | 猫 | cat |
| 1 | la propriétaire | noun | f | top-3000 (#1520 propriétaire) ⚑ was scene | y | 房东（女） | landlady |
| 1 | samedi | noun | m | top-3000 (#1279 samedi) | y | 星期六 | Saturday |
| 1 | il faut… | chunk | — | top-1000 (#80 falloir) | y | 得……／必须…… | you have to… |
| 2 | tu veux… ? | chunk | — | top-1000 (#29 vouloir) | y | 你想要……吗？ | do you want…? |
| 2 | je voudrais…, s’il vous plaît | chunk | — | top-1000 (#170 plaire) | y | 我想要……，劳驾 | I’d like…, please |
| 2 | le café | noun | m | top-1000 (#470 café) | y | 咖啡 | coffee |
| 2 | le thé | noun | m | top-1000 (#939 thé) ⚑ was top-3000 | y | 茶 | tea |
| 2 | l’eau (f.) | noun | f | top-1000 (#282 eau) | y | 水 | water |
| 2 | le lait | noun | m | top-3000 (#1062 lait) | y | 牛奶 | milk |
| 2 | le pain | noun | m | top-1000 (#955 pain) ⚑ was top-3000 | y | 面包 | bread |
| 2 | il n’y a pas de… | chunk | — | top-1000 (#5 avoir) | y | 没有…… | there’s no… |
| 2 | c’est combien ? | chunk | — | top-1000 (#237 combien) | y | 多少钱？ | how much is it? |
| 2 | les croquettes | noun | f (pl.) | scene (#8814 croquette) | y | 猫粮 | cat kibble |
| 3 | où est… ? | chunk | — | top-1000 (#64 où) | y | ……在哪儿？ | where is…? |
| 3 | il y a… | chunk | — | top-1000 (#5 avoir) | y | 有…… | there is / there are |
| 3 | sur | prep | — | top-1000 (#56 sur) | y | 在……上面 | on |
| 3 | sous | prep | — | top-1000 (#270 sous) | y | 在……下面 | under |
| 3 | dans | prep | — | top-1000 (#34 dans) | y | 在……里面 | in |
| 3 | derrière | prep | — | top-1000 (#683 derrière) | y | 在……后面 | behind |
| 3 | la table | noun | f | top-1000 (#615 table) | y | 桌子 | table |
| 3 | la cuisine | noun | f | top-1000 (#764 cuisine) ⚑ was top-3000 | y | 厨房 | kitchen |
| 3 | le canapé | noun | m | top-3000 (#2483 canapé) | y | 沙发 | sofa |
| 3 | le colis | noun | m | scene (#4348 colis) | y | 包裹 | parcel |
| 4 | pardon | chunk | — | top-1000 (#384 pardon) | y | 对不起／不好意思 | sorry / excuse me |
| 4 | vous pouvez répéter ? | chunk | — | top-1000 (#716 répéter) | y | 您能再说一遍吗？ | could you repeat that? |
| 4 | je n’ai pas compris | chunk | — | top-1000 (#133 comprendre) | y | 我没听懂 | I didn’t understand |
| 4 | je suis désolé(e) | chunk | — | top-1000 (#310 désolé) | y | 我很抱歉 | I’m sorry |
| 4 | le bruit | noun | m | top-1000 (#731 bruit) ⚑ was top-3000 | y | 噪音 | noise |
| 4 | la voisine | noun | f | top-3000 (#1116 voisin) | y | 女邻居 | (female) neighbour |
| 4 | la nuit | noun | f | top-1000 (#174 nuit) | y | 夜里 | night |
| 4 | c’est ma faute | chunk | — | top-1000 (#458 faute) | y | 是我的错 | it’s my fault |
| 4 | une équipe | noun | f | top-1000 (#563 équipe) ⚑ was top-3000 | y | 团队 | team |
| 4 | gentil / gentille | adj | — | top-1000 (#412 gentil) | y | 善良的、好心的 | kind, nice |
| 5 | la clé | noun | f | top-1000 (#618 clé) ⚑ was top-3000 | y | 钥匙 | key |
| 5 | je cherche… | chunk | — | top-1000 (#153 chercher) | y | 我在找…… | I’m looking for… |
| 5 | je ne sais pas | chunk | — | top-1000 (#36 savoir) | y | 我不知道 | I don’t know |
| 5 | j’ai perdu… | chunk | — | top-1000 (#184 perdre) | y | 我丢了…… | I lost… |
| 5 | j’ai trouvé… | chunk | — | top-1000 (#91 trouver) | y | 我找到了…… | I found… |
| 5 | hier | adv | — | top-1000 (#362 hier) | y | 昨天 | yesterday |
| 5 | je suis rentré(e) | chunk | — | top-1000 (#188 rentrer) | y | 我回家了 | I came home |
| 5 | d’abord… ensuite… | chunk | — | top-1000 (#445 d'abord) | y | 先……然后…… | first… then… |
| 5 | la veste | noun | f | top-3000 (#1510 veste) | y | 外套 | jacket |
| 5 | la poche | noun | f | top-3000 (#1224 poche) | y | 口袋 | pocket |
| 6 | la rue | noun | f | top-1000 (#485 rue) | y | 街道 | street |
| 6 | à gauche | chunk | — | top-1000 (#909 gauche) | y | 往左 | (to the) left |
| 6 | à droite | chunk | — | top-3000 (#1077 droite) ⚑ was top-1000 | y | 往右 | (to the) right |
| 6 | tout droit | chunk | — | top-1000 (#390 droit) ⚑ was top-3000 | y | 直走 | straight on |
| 6 | vous avez vu… ? | chunk | — | top-1000 (#41 voir) | y | 您看见……了吗？ | have you seen…? |
| 6 | je l’ai vu | chunk | — | top-1000 (#41 voir) | y | 我看见它了 | I saw him / it |
| 6 | petit / petite | adj | — | top-1000 (#104 petit) | y | 小的 | small |
| 6 | roux / rousse | adj | — | scene (#5207 roux) | y | 橘色的（毛发） | ginger, red-haired |
| 6 | le balcon | noun | m | scene (#3548 balcon) ⚑ was top-3000 | y | 阳台 | balcony |
| 6 | chez moi | chunk | — | top-1000 (#139 chez) | y | 在我家 | at my place |
| 7 | enchanté(e) | chunk | — | top-3000 (#1134 enchanté) | y | 幸会 | nice to meet you |
| 7 | vous voulez… ? | chunk | — | top-1000 (#29 vouloir) | y | 您想要……吗？ | would you like…? |
| 7 | ici | adv | — | top-1000 (#59 ici) | y | 这里 | here |
| 7 | rester | verb | — | top-1000 (#115 rester) | y | 留下 | to stay |
| 7 | revenir | verb | — | top-1000 (#168 revenir) | y | 回来 | to come back |
| 7 | dans un mois | chunk | — | top-1000 (#276 mois) | y | 一个月后 | in a month |
| 7 | je vous promets | chunk | — | top-1000 (#425 promettre) ⚑ was top-3000 | y | 我向您保证 | I promise you |
| 7 | on va faire attention | chunk | — | top-1000 (#481 attention) | y | 我们会小心的 | we’ll be careful |
| 7 | quand j’étais petit(e) | chunk | — | top-1000 (#104 petit) | y | 我小时候 | when I was little |
| 7 | il faut que… | chunk | — | top-1000 (#80 falloir) | y | 必须……（接虚拟式） | it’s necessary that… |
| 8 | depuis | prep | — | top-1000 (#203 depuis) | y | 自从……；已经……了 | since / for |
| 8 | tu habites ici depuis une semaine | chunk | — | top-1000 (#570 habiter) | y | 你在这儿住了一个星期了 | you’ve lived here for a week |
| 8 | venez chez moi | chunk | — | top-1000 (#139 chez) | y | 来我家吧（您／你们） | come to my place |
| 8 | à six heures | chunk | — | top-1000 (#623 six) | y | 六点 | at six o’clock |
| 8 | une semaine | noun | f | top-1000 (#293 semaine) | y | 一个星期 | a week |
| 8 | une question | noun | f | top-1000 (#230 question) | y | 一个问题 | a question |
| 8 | attendre | verb | — | top-1000 (#89 attendre) | y | 等 | to wait (for) |
| 8 | c’est gentil | chunk | — | top-1000 (#412 gentil) | y | 您真好 | that’s kind |
| 8 | doucement | adv | — | top-1000 (#689 doucement) ⚑ was top-3000 | y | 轻轻地、慢慢地 | gently |
| 8 | le basilic | noun | m | scene (#9236 basilic) | y | 罗勒 | basil |
| 9 | la liste | noun | f | top-1000 (#912 liste) ⚑ was top-3000 | y | 清单 | list |
| 9 | la règle | noun | f | top-1000 (#826 règle) ⚑ was top-3000 | y | 规则 | rule |
| 9 | tu pourrais… ? | chunk | — | top-1000 (#27 pouvoir) | y | 你能不能……？ | could you…? |
| 9 | faire la vaisselle | chunk | — | scene (#3279 vaisselle) ⚑ was top-3000 | y | 洗碗 | to do the dishes |
| 9 | le frigo | noun | m | top-3000 (#2422 frigo) | y | 冰箱 | fridge |
| 9 | le jardin | noun | m | top-3000 (#1055 jardin) ⚑ was top-1000 | y | 花园 | garden |
| 9 | le toit | noun | m | top-3000 (#1236 toit) | y | 屋顶 | roof |
| 9 | là-haut | adv | — | top-1000 (#949 là-haut) ⚑ was top-3000 | y | 上面那儿 | up there |
| 9 | sec / sèche | adj | — | top-3000 (#1363 sec) | y | 干的 | dry |
| 9 | l’arrosoir (m.) | noun | m | scene (#18156 arrosoir) | y | 水壶（浇花） | watering can |
| 10 | j’ai faim | chunk | — | top-1000 (#571 faim) | y | 我饿了 | I’m hungry |
| 10 | il n’y a plus de… | chunk | — | top-1000 (#43 plus) | y | ……没了 | there’s no more… |
| 10 | le message | noun | m | top-1000 (#624 message) | y | 消息、留言 | message |
| 10 | une photo | noun | f | top-1000 (#385 photo) | y | 照片 | photo |
| 10 | j’espère que… | chunk | — | top-1000 (#285 espérer) | y | 希望…… | I hope that… |
| 10 | à la fin du mois | chunk | — | top-1000 (#378 fin) | y | 月底 | at the end of the month |
| 10 | c’est tout ? | chunk | — | top-1000 (#53 tout) | y | 就这些？ | is that all? |
| 10 | c’est quoi, ça ? | chunk | — | top-1000 (#83 quoi) | y | 这是什么？ | what’s that? |
| 10 | facile | adj | — | top-1000 (#480 facile) | y | 容易的 | easy |
| 10 | souriez ! | chunk | — | top-3000 (#1152 sourire) | y | 笑一个！ | smile! |
| 11 | bonsoir | chunk | — | top-1000 (#474 bonsoir) | y | 晚上好 | good evening |
| 11 | entrez ! | chunk | — | top-1000 (#215 entrer) | y | 请进！ | come in! |
| 11 | toujours | adv | — | top-1000 (#106 toujours) | y | 总是 | always |
| 11 | le jeudi | chunk | m | top-3000 (#1963 jeudi) ⚑ was top-1000 | y | 每周四 | on Thursdays |
| 11 | l’hiver (m.) | noun | m | top-3000 (#1473 hiver) | y | 冬天 | winter |
| 11 | le mari | noun | m | top-1000 (#320 mari) | y | 丈夫 | husband |
| 11 | la soupe | noun | f | top-3000 (#1670 soupe) | y | 汤 | soup |
| 11 | la tarte | noun | f | scene (#3139 tarte) | y | 馅饼、挞 | tart |
| 11 | délicieux / délicieuse | adj | — | top-3000 (#1805 délicieux) | y | 美味的 | delicious |
| 11 | une fleur | noun | f | top-1000 (#708 fleur) ⚑ was top-3000 | y | 一朵花 | flower |
| 12 | aujourd’hui | adv | — | top-1000 (#253 aujourd'hui) | y | 今天 | today |
| 12 | on déjeune ? | chunk | — | top-3000 (#1194 déjeuner) | y | 吃午饭吧？ | shall we have lunch? |
| 12 | à table ! | chunk | — | top-1000 (#615 table) ⚑ was top-3000 | y | 开饭了！ | food’s ready! |
| 12 | prêt / prête | adj | — | top-1000 (#272 prêt) | y | 准备好的 | ready |
| 12 | j’ai soif | chunk | — | top-3000 (#1691 soif) | y | 我渴了 | I’m thirsty |
| 12 | un verre d’eau | chunk | m | top-1000 (#441 verre) ⚑ was top-3000 | y | 一杯水 | a glass of water |
| 12 | les pâtes | noun | f (pl.) | top-3000 (#2673 pâte) | y | 意面 | pasta |
| 12 | partout | adv | — | top-1000 (#527 partout) | y | 到处 | everywhere |
| 12 | triste | adj | — | top-1000 (#695 triste) | y | 难过的 | sad |
| 12 | il y en a | chunk | — | top-1000 (#5 avoir) | y | 有（一些） | there are some |
| 13 | pourquoi ? | chunk | — | top-1000 (#90 pourquoi) | y | 为什么？ | why? |
| 13 | il est tard | chunk | — | top-1000 (#256 tard) | y | 很晚了 | it’s late |
| 13 | plus tôt | chunk | — | top-1000 (#562 tôt) | y | 更早 | earlier |
| 13 | boire | verb | — | top-1000 (#259 boire) | y | 喝 | to drink |
| 13 | avec plaisir | chunk | — | top-1000 (#424 plaisir) ⚑ was top-3000 | y | 乐意 | with pleasure |
| 13 | il reste… | chunk | — | top-1000 (#115 rester) | y | 还剩…… | there’s … left |
| 13 | bon appétit ! | chunk | — | top-3000 (#2292 appétit) | y | 慢用！ | enjoy your meal! |
| 13 | la tante | noun | f | top-1000 (#855 tante) ⚑ was top-3000 | y | 姑妈、阿姨 | aunt |
| 13 | la nièce | noun | f | scene (#3654 nièce) | y | 侄女、外甥女 | niece |
| 13 | la valise | noun | f | top-3000 (#1202 valise) | y | 行李箱 | suitcase |
| 14 | demain | adv | — | top-1000 (#222 demain) | y | 明天 | tomorrow |
| 14 | rien | pron | — | top-1000 (#60 rien) | y | 什么都（没有） | nothing |
| 14 | même pas | chunk | — | top-1000 (#126 même) | y | 连……都不 | not even |
| 14 | il fait beau | chunk | — | top-1000 (#159 beau) | y | 天气很好 | the weather’s nice |
| 14 | faire les courses | chunk | — | top-1000 (#902 course) ⚑ was top-3000 | y | 买东西、采购 | to do the shopping |
| 14 | au coin | chunk | — | top-1000 (#710 coin) ⚑ was top-3000 | y | 在拐角 | on the corner |
| 14 | vrai / vraie | adj | — | top-1000 (#143 vrai) | y | 真正的 | real |
| 14 | le petit-déjeuner | noun | m | scene (#3053 petit-déjeuner) ⚑ was top-3000 | y | 早餐 | breakfast |
| 14 | le dîner | noun | m | top-1000 (#760 dîner) ⚑ was top-3000 | y | 晚餐 | dinner |
| 14 | un pain au chocolat | noun | m | top-3000 (#1721 chocolat) ⚑ was scene | y | 巧克力面包 | pain au chocolat |

Type note: two extra types appear (prep, adv, pron). They keep the four requested types (noun / verb / adj / chunk) honest; Croissant can fold them into “chunk” if Carnet needs exactly four.

## Day-by-day counts

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Items | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | **140** |
| of which chunks | 5 | 4 | 2 | 5 | 6 | 6 | 7 | 4 | 2 | 7 | 3 | 5 | 6 | 4 | 66 |
| scene-only | 0 | 1 | 1 | 0 | 0 | 2 | 0 | 1 | 2 | 0 | 1 | 0 | 1 | 1 | 10 |

## Flagged to cut or move

1. **Passé composé with être: not a Day 8 item** (moved, per this week’s call to Croissant). It lives in Day 5 (« je suis rentré(e) »). Day 8 is only depuis + present and venez.
2. **Old-plan items left out (exposure only, no card):** le secret, la chambre, le salon, l’expéditeur (m.), Marseille, le jambon, la supérette, le placard, les chaussettes, il pleuvait (D5, imparfait), « le colis a été livré » and « il a été vu » (B1 passives). Most get 1–2 hearings in Scène; if Day 3 or Day 6 feels thin, la chambre and la supérette come back first.
3. **Grammar shown but not drilled in Week 2:** il faut que + subjunctive (D7), futur (« je reviendrai », D10), en (« il y en a », D12: only as a fixed chunk), ma tante veut que je voie (D13). The aha card can appear in feedback; no Réplique production before Week 3.
4. **WEEK2_STORY.md is out of date for Days 9–14** (resolved: built content is canonical, « pour que + subjonctif » cut from Day 14). Pin each day’s grammar to the built lines: D9 conditional of politeness (tu pourrais), D10 il n’y a plus de / ne… plus, D11 imparfait in « il était là, toujours », D12 en as a chunk, D13 nothing new, D14 ne… rien.
5. **Duplicates across days (kept once):** la plante (D1, reused D8), le lait (D2, reused D9–10), je voudrais (D2, conditional on D9), depuis l’hiver (D11 reuses D8 depuis; this is good spacing, not a new item).

## Frequency check: items beyond 3000

Only three items that were not already marked scene fell beyond rank 3000. All three sit in built story lines, two of them as deck targets, so **I recommend no swap, only a relabel to scene**:

| day | item | rank | why keep | optional swap (only if Croissant wants zero non-story scene words) |
|---|---|---|---|---|
| 6 | le balcon | 3548 | Days 1–6 are frozen, so no content change | none; keep |
| 9 | faire la vaisselle | 3279 (vaisselle) | target `tu_pourrais_vaisselle` (d10_cam_vaisselle), and it comes back on D14 (« Même pas la vaisselle ? ») | « c’est une bonne idée » (d10_cam_idee, idée #240, top-1000); keep tu pourrais via the frame alone |
| 14 | le petit-déjeuner | 3053 (just over the line) | target `on_prend_le_petit_dejeuner` (d14s_cam_toit) | none; keep, it is borderline and is the day's target |

Other notable changes: la propriétaire scene → top-3000 (#1520); un pain au chocolat scene → top-3000 (chocolat #1721); le jardin and le jeudi top-1000 → top-3000; à droite top-1000 → top-3000 (#1077). Most other changes move top-3000 → top-1000. The count stays at 10 per day.

## Open questions for Croissant

1. **Days 1–6 (frozen):** may Carnet tag their existing lines with these items without a content bump, so the Day 7 watering-can handoff reviews real Week 1 words?
2. **Optional D9 swap:** keep « faire la vaisselle » (recommended) or swap to « c’est une bonne idée »?
