# days_04_10: Days 1–3 insert addendum + Days 4–10 art gaps (style B, 28-colour palette, $0)
Generator: gen_days_04_10.py (writes only here). manifest.json: 33 assets, 3 atlases (days410_inserts / days410_props / days410_cat). check_manifest.py OK. Midnight md5s unchanged.

## A. Days 1–3 inserts (priority). All are 60×58, topleft (0,0), depth 7, insert:true, with no baked text or numerals.
| id | textRect (x,y,w,h) | extra |
|---|---|---|
| prop.insert_card.any | 8,31,44,14 (2 lines) | kraft flap folded back, cream card, red heart stamp |
| prop.insert_phone_notif.{day,evening,night} | 19,16,29,12 | one white bubble with a gold parcel-app blob. Hands and phone body follow the photo_plant_tail convention. Surround is wall / wall_sh / navy (night). Screen is self-lit: do not grade |
| prop.insert_laptop_price.{day,evening,night} | price 31,25,22,13; nameRect 31,11,22,11 | imageSlot 8,12,20,27 → overlays prop.laptop_img_catfood.any / prop.laptop_img_cattree.any (20×27, topleft). Gold buy button is blank. Self-lit |
| prop.insert_calendar.any | 7,38,46,13 (2 lines) | page widened to x4–55, cream text panel x7–52; red header, spiral rings, empty 7×4 grid, Thursday wk3 cell circled in red; works for D1 and D10 |
24-character fit, as a mockup with DejaVuSans 38 px at 18× (1 stage px = 18 px): « Samedi : Madame Martin. » is 489 px against a 630 px rect; « Livraison demain : 1 colis » (26 chars) is 484 px against 522 px. Every rect fits 24 characters on one line, and the card and calendar rects also fit 2 lines.

## B. Days 4–10
New: insert_rules_list (textRect 18,13,27,36), insert_key_old (textRect 10,44,40,10, optional); key_old (hand 11×5 hp(1,1); table 11×6 baseline(5,4) slot table_top 118,119); key_ribbon hand 5×11, anchorPoint (2,10) = key bottom (baseline), handPoint (1,0) = ribbon top (grip); both correct + floor 11×5 (red = mouth/red_sh); sock_pile 16×10 baseline(8,8) slot floor 60,136; jacket_hook 10×16 topleft(4,0) slot 186,82; key_hooks_{empty,flat,old,both} 13×17 topleft(6,0) slot 172,90; basil_pot 10×15 baseline(5,13) slot desk 177,118 (pot ① footprint) / counter_top_r 60,117; paper_pen (hand 7×7, table 12×6 slot 106,119); ham_pack 11×7 slot 130,119; ham_slice 6×4; cat_flap(+_open) 7×5 baseline(3,4) slot door_home 78,127 / door_neighbour 22,127 (flap); croissant.flap_in.0-2 11×10 baseline(5,9) at 78,132, seq 280/280/420 ms then show prop.cat_flap.
Reused: Martin glove = handprop.glove_loose.any; arrosoir = rooftop prop/handprop.arrosoir.<v> (kitchen slots desk 157,118 only when the laptop is off, floor 186,136); flat key without ribbon = key_door/key_floor; newspaper; wall_calendar; house_rules.
Weak: held-prop mockups use a fixed hand point (the engine handles hand anchoring); the ham slice is a pink blob at stage scale and reads better in the pack; the sock pile reads as "striped socks" only from the close shot.

## Le CTO registration fixes (2026-10-26)
- Caption font is DejaVu Sans Book at 2.2 stage px (40 px in the 18× mockups). « Samedi : Madame Martin. » is 514 px against the 828 px calendar rect.
- nameRect [31,11,22,11] is on all insert_laptop_price variants.
- Neighbour-door flap_in: Le CTO's separate feet mark (22,132) is OK (the doormat is at y131).
