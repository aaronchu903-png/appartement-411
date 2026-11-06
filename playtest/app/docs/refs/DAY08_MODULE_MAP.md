# Day 8 « Le basilic » · 四模块映射（依据：战略重置 v1 §4–§5）
> Le Réalisateur，2026-10-15 PT。源：`docs/story/DAY08_FINAL_v2.md`（48 步，含 1b；37a/37b 不计步）。主线、钩子、交钥匙一律不动。M1 Scène · M2 Jardin · M3 Répondeur · M4 Réplique。

| step | 内容 | 模块 | 处理 | 理由 |
|---|---|---|---|---|
| 1 `n_d8_matin` | Lundi matin… ta plante est sur la table. | M1 | 保留 | 开场画面 |
| 1b `d8_cam_depuis` | Une semaine ! Tu habites ici depuis une semaine. | M1 | 保留 | 一周节点；M3 好素材 |
| 2 `d8_noe_matin` | Regarde la plante ! | M1 | 保留 | |
| 3 F `plante` | 焦点词 | M1→M2 | 保留 | 点词进种子袋 |
| 4–5 `plantguard_r1/r2` | 「救植物」小游戏两轮 | — | **建议砍** | 一次性小游戏，§6 已冻结；改为 M1「指一指」：点猫一次（Non, Croissant !） |
| 6 `n_d8_boum` | Boum ! La tasse de Camille tombe. | M1 | 保留 | 笑点 |
| 7 `d8_noe_plante` | Et la plante ? Ici, avec Croissant… non. | M1 | 保留 | 晚上的伏笔 |
| 8–9 `n_d8_toc/porte` | 敲门，Lefèvre 端着小盆 | M1 | 保留 | |
| 10–11 `d8_gag_bonjour/basilic` | C’est du basilic, pour la cuisine. | M1 | 保留 | 必考块 |
| 12 F `basilic` | 焦点词 | M1→M2 | 保留 | |
| 13 pick `d8_pot` | 三选一图片（ta plante / basilic / bol） | M1 | **合并** | 改成在画面里点罗勒（point），不弹菜单 |
| 14 say `d8_merci` | Merci, Madame. / C’est gentil… | M4 | 保留 | 场内回话 |
| 15 `d8_gag_venez` | Venez chez moi à six heures. J’ai une question. | M1 | 保留 | 必考块；M3 首选句 |
| 16 pick `d8_heure` | À quelle heure ? 选钟点 | M3 | **合并** | 并入午后留言机：听写 « six heures »（liaison） |
| 17 `n_d8_cinq` | Six heures moins cinq. | M1 | 保留 | 时间跳转 |
| 18–21 | 下楼；Croissant reste en haut… ; On apporte un peu de basilic. | M1 | 保留 | 楼道 = 剧情地点 |
| 22 band `d9_cam_*` | 按 Day 7 结局一句 | M1 | 保留 | 选择有后果 |
| 23–27 | Bonsoir ! / Asseyez-vous / soupe / Croissant 在空椅子上 / il a choisi sa place | M1 | 保留 | 26 可做 point（点椅子） |
| 28 say `d9_soupe` | 回她的汤 | M4 | 保留 | |
| 29–32 | du pain / J’ai une question. / Vous voulez venir manger le jeudi ? / seule depuis l’hiver | M1 | 保留 | 31 必考块，M3 来源 |
| 33 choice `d9_jeudi` | 星期四怎么答 | M4 | 保留 | 剧情选择 |
| 34–36 | 钥匙在桌上；C’est une vieille clé；Les plantes, elles, n’adorent pas Croissant. | M1 | 保留 | 钥匙线 |
| 37 `n_d10_cle` | À la porte, elle ouvre la main. | M1 | 保留 | **交钥匙，不动** |
| 37a/37b 热点 | À la fenêtre, une plante. Elle a soif. / À côté de la table, une chaise vide. | M1 | 保留 | 「指一指」可复用手势 |
| 38–41 | La clé du toit… / say C’est pour moi ? (M4) / Allez-y. Moi… pas encore. / La petite porte, là-haut ! | M1+M4 | 保留 | 交钥匙段 |
| 42 `n_d10_monte` | La clé tourne. La porte s’ouvre. | M1 | 保留 | 唯一行走段 |
| 43–44 F `toit`/`jardin` | 两个焦点 | M1 | **合并** | 一拍两词，节奏更紧（不改台词） |
| 45 `d10_noe_ici` | Ici ? Dans ce pot ? | M1 | 保留 | point：点空盆 |
| 46 `n_d10_plante` | Tu plantes le basilic. Croissant aide… un peu trop. | M1 | 保留 | |
| 47 `n_d10_arrose` | 高点：第一次浇水 + Il faut de l’eau. | **M2** | 保留 | 用 M2 唯一手势「按住水壶」倒第一张卡（罗勒原句）；不另做浇水机制 |
| 48 done | 钩子：Sur le toit, une plante qui ne dort plus… | M1 | 保留 | **钩子不动** |
| 附：Letter 8（代动词填空） | 信 | M3/M4 | **合并** | §6：采样包拆进 M3/M4，不单独存在 |
| 附：2H 扩展层（无尽早晨、厨房杂务、她家 10 物件） | 层 | — | **建议砍/转** | 小游戏重玩砍；10 物件转 M1 point 数据 |

**缺口**
- **M3 零素材**：主干里没有留言/电话。可自动生成的句子够（1b、15、24、31、40），但缺一段「镜头」：建议 Lefèvre 下午的门口便条或 Noé 语音条（只用已听过的句子，不剧透）。
- **M4 太薄**：只有 3 个 say + 1 个 choice，全是选项；没有 Coloc 411 群聊 texto。今天的事（罗勒、六点、星期四）适合 3–5 条短信回话。
- **M2 只有一张卡**：47 只浇罗勒；早上没有花园段。按 §5 应先跑 Week 1 到期词（盆①，Martin 的水壶 = 水量表）。
- **一次性机制**：plantguard、pick 菜单、2H 层的小游戏都属冻结类型；换成 point / dictee / reply 后，Day 8 的步骤类型可降到 7 种以内。
- **时长**：主干≈20 分（M1），加 M2 早晨 + M3 + M4 群聊 + 夜里重听，可达 §6 的 60–75 分，无需新写剧情。

## M3 定稿：Noé 语音留言（Prof Neng 审过、Croissant 定稿，10/15）
位置：Day 8 早上，花园复习之后。约 15 秒。
« Salut, c’est Noé ! » / « Je suis au travail. » / « Ce soir, on mange ensemble ? » / « À six heures, à la maison. » / « Six heures, d’accord ? À ce soir ! »
- 听写只考 « six heures »（读作 [si.zœʁ]），答对后显示拼写 « six heures »。
- « travail » 只做听力输入，不进复习。
- 等新战略批准后再交给 Croissant 实现。
