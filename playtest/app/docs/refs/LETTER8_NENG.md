# Day 8 letter rewrite — Prof Neng · 2026-10-14
Replace `letters.js` entry `8:`. grammar: `depuis_present` · band A1 · kind Carte · to Léa.
Use NB (U+202F) before ! ? : as in the rest of the file.
No Day 9 content: no dinner downstairs, no « se lever », no « le jeudi », no key on a table.

intro zh: 星期一晚上。你给 Léa 写一张卡片：来这儿一周了、渴了的植物，还有那把钥匙。
intro en: Monday evening. You write Léa a card: one week here, a thirsty plant, and a key.

body:
  Chère Léa,
  J’habite ici depuis une [semaine].
  Croissant dort sur ma chaise depuis ce [matin].
  À la fenêtre, une plante a [soif].
  Il faut de l’[eau]NB!
  Ce soir, une voisine ouvre la main : une [clé]NB!
  Bisous NB!

gaps:
- semaine: type · answer semaine · accept [semaine]
  fr: J’habite ici depuis une semaine. | zh: 我住在这儿已经一周了。 | en: I have lived here for a week.
  h1 zh: 七天。 en: Seven days. · h2: s e m a i n e。
- matin: mc · answer matin · options [matin, soir, midi]
  fr: Croissant dort sur ma chaise depuis ce matin. | zh: Croissant 从今天早上起一直睡在我的椅子上。 | en: Croissant has been asleep on my chair since this morning.
  h1 zh: 一天的开始。 en: The start of the day. · h2: m a t i n。
- soif: mc · answer soif · options [soif, faim, froid]
  fr: À la fenêtre, une plante a soif. | zh: 窗边有一盆植物，它渴了。 | en: At the window, a plant is thirsty.
  h1 zh: 想喝水。 en: It wants to drink. · h2: s o i f。
- eau: type · answer eau · accept [eau]
  fr: Il faut de l’eau ! | zh: 得浇水！ | en: It needs water!
  h1 zh: 浇植物用的。 en: What you water a plant with. · h2: e a u。
- clé: type · answer clé · accept [clé, cle]
  fr: Ce soir, une voisine ouvre la main : une clé ! | zh: 今晚，一位邻居摊开手：一把钥匙！ | en: Tonight a neighbour opens her hand: a key!
  h1 zh: 开门用的东西。 en: The thing you open a door with. · h2: c l é，也可以写成 c l e。

Line check d8_cam_depuis « Une semaine ! Tu habites ici depuis une semaine. » — French OK (habites, no accent).
