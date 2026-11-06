> **FROZEN — LOCKED 2026-10-26 (Croissant).** Any change needs a Neng pass plus Croissant OK.

# Days 1–3 conversion notes (draft v1, 2026-10-26)

Files: `day01_bienvenue_chez_nous.json`, `day02_the_ou_cafe.json`, `day03_deux_colis.json`; `locked_words_drafts/day01–03.json`.
Validation: 0 word/caption/staging errors on all three. **The only error is E-SCHEMA `day < 7`.** The schema still says "Days 1–6 frozen". With `minimum: 1` in a temp copy of the engine, all three pass with 0 errors and 0 warnings. Tech/ was not edited.

## Day 1 « Bienvenue chez nous » (~10 new: bonjour, je m’appelle, c’est, merci, l’appartement, la plante, le chat, la propriétaire, samedi, il faut)
- **Logline:** The player arrives at 411. A ginger cat slips in first. Noé’s cat is a secret from Camille, and the landlady phones: Saturday, no animals.
- **Opening:** <5 s, a cat on the 411 doormat. Name output at ~1:30. Keep-the-secret choice at ~3:00 (`d01_secret`).
- **High point:** Croissant sleeps curled round the player’s plant, one paw on the pot.
- **Hook:** Calendar insert « Samedi : Madame Martin. » and Noé: « Samedi… six jours. »

## Day 2 « Thé ou café ? » (tu veux, je voudrais, café, thé, eau, lait, pain, il n’y a pas de, c’est combien, croquettes)
- **Logline:** Noé plays café waiter at breakfast. There is no milk and no kibble, and he orders kibble plus a cat tree online.
- **Choice:** drink order (`d02_boisson`); the cup that arrives matches it. Reads `d01_secret` for Noé’s first whisper.
- **B gag:** Croissant eats Camille’s bread. Noé, mouth full: « C’est moi ! »
- **High point:** evening. Croissant sits up at the table end like a customer. Noé: « Bonsoir, Monsieur ! Tu veux du lait ? » The player: « Non ! Pas de lait pour un chat. De l’eau. » Croissant drinks water.
- **Hook:** phone notification « Livraison demain : 1 colis pour Camille. »

## Day 3 « Deux colis » (où est, il y a, sur, sous, dans, derrière, la table, la cuisine, le colis, une boîte)
- **Logline:** Two parcels for Camille. One is jam from her mother; the other is Noé’s cat tree, which the player must hide before she gets home at noon.
- **Labels:** both read through `insert_parcel_label` captions. Listening task: « derrière la chaise ».
- **B gag:** « Où est Croissant ? » … « Dans la boîte ! »
- **High point:** her mother’s card, « Pour Camille et ses colocataires », and Camille says « …c’est toi ! »
- **Hook:** at night the box behind the chair moves and a tail comes out. Camille: « Noé… C’est quoi, ça ? »

**Target words:** ~10 per day, matching Neng’s WORDLIST_W1-2 (Day 2 drops « s’il vous plaît » as a target because of the 10 cap; Day 3 drops `le canapé` and adds `une boîte`). Each target is spoken at least twice, counting narrator lines on Day 3 for où est, sur and sous.

## Changes from the old version, and why
- The sofa, bedroom, bathroom, rooms tour and supérette are cut: there is no style-B art for them. The kibble purchase moves to Noé’s laptop, which also motivates the parcel.
- The Martin letter becomes a phone voice message, so the voice/dictation slot works and needs no letter insert.
- « Le canapé » is gone from Day 3 targets.
- Watering stays at the desk plant (the rooftop opens Day 8).
- The old Day 1 cold open (knock, then text exposition) is replaced by the cat on the doormat.

## Unsure decisions
1. **Resolved (founder):** the desk plant is the player’s own plant, pot ① « Chez nous »; Martin gives a watering can on Day 7, not a plant. Staged as `prop.plant` + GAP note. **Bible to fix:** `prop.plant` naming must be disambiguated from the landing plant (Day 15 notice) and from « Martin’s plant ».
2. Watering keeps `pot: pot_chez_nous` (correct: it is pot ①).
3. Day 1’s spoken name output has no stored name.
4. **Resolved:** no milk for the cat. Noé’s « Tu veux du lait ? » stays as the joke; the **player** cuts in (output) « Non ! Pas de lait pour un chat. De l’eau. » and Noé echoes it; Croissant drinks water. Deviation: the brief said Camille cuts in, but Camille must not know about the cat before the Day 3 hook, so the line goes to the player.
5. Written-text steps stay as narrator `say`, face neutral, after a cut_to close on the prop; each carries a GAP note for Le CTO to confirm text-only rendering. Parcel-label captions kept.
6. Day 2 bread gag restaged: Camille goes to the fridge, Croissant eats the bread and drops under the table before she turns; she sees only the empty plate.
7. Camille audit: she never sees or hears the cat before the D3 hook (D1 cat under the table behind her, Noé blocks; D2 « Des croquettes ? » covered by « des croissants »; D3 cat asleep in the hidden box at noon). Player gender: no agreement anywhere. Nothing says Croissant stays past Day 7 (the cat tree is Noé’s wish only).

## French lines new or rewritten (need a French check)
- **D1:** « Oh ! Euh… bonjour ! » · « Et toi ? » · « Euh… merci, Camille ! » · « C’est ton bureau. Et c’est ta plante. » · « La plante a soif. Il faut de l’eau. » · « Merci ! Bon… je vais au travail. » · « Tu m’aides ? C’est un secret. » · « D’accord… merci quand même. » · « Croissant ! La plante ! » · « Merci, Croissant… » · « Bonjour ! Ici Madame Martin, la propriétaire. » · « Samedi, je viens chez vous. » · « Et pas d’animaux dans l’appartement. Merci ! » · « La propriétaire ! Samedi ! » · « Pas d’animaux… Croissant, c’est un chat ! » · « Il aime ta plante. » · « Merci, Madame Martin. À samedi ! » · « Samedi : Madame Martin. » · « Samedi… six jours. »
- **D2:** « Merci pour hier. Chut ! » · « Pas un mot à Camille… s’il te plaît. » · « Bonjour, Madame ! Vous voulez du thé ou du café ? » · « Très bien, Madame ! » · « Du thé / Du café / De l’eau ! Voilà. » · « Et du lait, pour le café ? » · « Pas de lait… D’accord. Et de l’eau, s’il te plaît. » · « Euh… des croissants ! Il n’y a pas de croissants ! » · « On a du pain, Noé. » · « Mon pain ? » · « C’est moi ! » · « Il faut des croquettes. Les croquettes… c’est combien ? » · « Croquettes pour chat : 12 € » · « Douze euros… d’accord. » · « Je voudrais des croquettes… et un arbre à chat ! » · « Arbre à chat : 39 € » · « Oh là là. Bon… d’accord ! » · « Bonsoir, Monsieur ! Tu veux du lait ? » · (player) « Non ! Pas de lait pour un chat. De l’eau. » · « Pas de lait pour un chat ? D’accord… de l’eau ! » · « Livraison demain : 1 colis pour Camille. » · « Oh non… pour Camille ?! »
- **D3:** « Il y a deux colis ! » · « Un colis, c’est une boîte. Une grande boîte ! » · « Marseille… c’est la mère de Camille. » · « Et ça… c’est mon colis ! L’arbre à chat ! » · « Vite ! Dans la cuisine ! » · « Le colis de Camille : sur la table. » · « Et mon colis… sous la table. » · « Oh non, il est neuf heures ! Au travail ! » · « Où est mon colis ? Il est dans la cuisine ? » · « Camille arrive à midi ! Mets le colis derrière la chaise. » · « Il faut cacher le colis. Derrière la chaise, d’accord ? Merci ! » · « Où est Croissant ? Sur la table ? Non. » · « Sous la table ? Non. » · « Dans la boîte ! » · « Un colis ! Une boîte de Marseille ! » · « De la confiture… de ma mère. Et il y a un mot ! » · « Pour Camille et ses colocataires. Bisous, Maman » · « Ses colocataires… c’est toi ! » · captions « Camille · Marseille », « Camille · Arbre à chat »

## Art gaps (updated v3, 2026-10-26 — after registered art)
**Resolved (registered, swapped in):** `pot_desk_sprout` at `pot_desk` (D1–3 desk pot ①); `parcel_pair` at `doormat_home` (D3 cold open); `box_cat` + `in_box` / `in_box_tail_pop` (D3 B and hook, kitchen set); `finger_to_lips` (D1 « Chut ! », via re-enter, since say has no pose param); `drink` at `floor_drink` + `cat_bowl` at `floor_bowl` (D2 high point, kitchen set); `sleep_curl` at `desk_sleep` + `desk_bare` (D1 high point); `parcel_closed_floor` (registered; kitchen/stairwell only).
**Still open:**
- `mark.kitchen_table4` floor-parcel / behind-chair slot (D3 a2 keeps `box_open` as a stand-in).
- Inserts with caption_rect: `insert_calendar` (d01), `insert_laptop_price` (d02), `insert_phone_notif` (d02), `insert_card` (d03 « Bisous, Maman »; `card` has insert:text but no caption_rect).
- `say` pose parameter (engine), so a pose doesn't need a re-enter.
- Confirm the `insert_parcel_label` art carries no baked text.

## Open questions
- **Le CTO:** lower `day.minimum` to 1 in episode.schema.json, or give a Days 1–6 exemption.
- Should `clip_prefix d01_` clash with the old engine's Day 1 audio ids?

## v2 pass (2026-10-26, after Neng + engine update)
- Validated with the real `tools/check_episode.py` (day range now 1–99): D1, D2, D3 all **0 errors**.
- Neng zh fixes applied (d01 a2_bureau#5, w#0, b_payoff#1; d02 a1_hier_oui#1, hp#5; d03 hp#6). fr fixes: d02 « s’il te plaît » options; NBSP before €; d03 « Mes colocataires… c’est toi ! »; mother's card new text read aloud by Camille.
- Founder decisions: « Bienvenue, colocataire ! » on Day 1 (recognition only, added to locked_words_drafts/day01 recognition); d03 voice v#2 rewritten so Noé, who hid his parcel, asks the player to hide it; dictation now tests « derrière » (« Mets le colis ___ la chaise. »).
- **Drift from Week 1 is intentional** (founder): Martin's voicemail → phone message, online order instead of the shop, no delivery voicemail.
- **Narrator = panel caption.** Written French on objects should be insert + caption. Only `screen_send`, `insert_parcel_label`, `insert_clock_midnight` have a caption_rect, so these stay narrator steps with a GAP note: **insert_calendar** (d01 « Samedi : Madame Martin »), **insert_laptop_price** (d02 « Croquettes : 12 € », « Arbre à chat : 39 € »), **insert_phone_notif** (d02 « Livraison demain » / « 1 colis pour Camille »), **insert_card** (d03 « Bisous, Maman »). For Pixel.
- ~~Desk plant: prop.plant + G-POT-DESK~~ → superseded in v3 by `pot_desk_sprout`.
- Parcels: second stairwell parcel uses `instance:"b"` on `floor` (first on `doormat_home`). parcel_closed stays on table_parcel only.
- **Open:** d03 b_boite keeps three narrator lines in French (« Où est Croissant ? Sur la table ? Non. » …): it's the player's search, nobody is home to speak them. Options: zh-only narrator (loses 3 hearings of où est/sur/sous), or Croissant-cam with no text. Kept for now; decision needed.

## v3 pass (2026-10-26, founder: no watering before Day 7)
- Removed the three watering segments (d01, d02, d03 `watering` scenes and their watering_lines). The desk pot stays on screen (`pot_desk_sprout`) but is not watered or reviewed until Day 7 (Martin's arrosoir, the first watering).
- d01 a2_bureau#5: « La plante a soif. Il faut de l’eau. » → « C’est ta plante. Il faut du soleil ! » (the player slides the pot into the sun; no watering).
- D3 « où est » was heard 0× in spoken lines (the b_boite lines are narrator captions, and the old round-1 claim "≥2× elsewhere" was wrong). Added Camille hp « La confiture, sur la table. Et Croissant ? Où est Croissant ? » and hook « Où est Croissant ? Dans la cuisine ? ». All D1–3 targets are now spoken ≥2×.
- `fx()` now forces NBSP before € everywhere.
- The "Watering stays at the desk plant" line above is superseded: no watering D1–D6.
- D1–3 French list above is historical; the current lines are in D1_3_FOR_NENG.md (round-2 delta at the top).
- v4: d03 b_boite narrator French → Noé phone bubbles + player outputs (see FOR_NENG round 3); the Open item on b_boite is resolved.

## v5 (2026-10-26): narrator French → insert captions
- D1 hook: insert_calendar « Samedi : Madame Martin ».
- D2 a3: insert_laptop_price « 12 € » + laptop_img_catfood; « 39 € » + laptop_img_cattree (was « Croquettes : 12 € » / « Arbre à chat : 39 € »; product names now carried by the image).
- D2 hook: insert_phone_notif « Livraison demain » / « 1 colis pour Camille ».
- D3 hp: insert_card « Bisous, Maman ».
- D3 a2: parcel_closed_floor on floor_parcel (was box_open stand-in).
