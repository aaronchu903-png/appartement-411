# Kitchen upper-wall dressing, slots for pb14 (Pixel Studio)
Stage 192x144, anchors bottom-centre (baseline), positions = anchor point in stage px. Variants .day/.evening/.night (art identical; grading via light/golden.json, light/soir.json -> `upper_wall` entry).

| asset id | file | native w x h | anchorPoint | stage pos (x,y) | z / depth |
|---|---|---|---|---|---|
| prop.cornice.<v> | pieces/<v>/cornice.png | 16 x 6 | (8,5) | tile x every **16 px** from x=0, baseline y=5 (first anchor x=8) | 1 (wall-mounted, over backwall) |
| prop.upper_cabinets.<v> | pieces/<v>/upper_cabinets.png | 48 x 20 | (24,19) | (46,77): same x/width as counter_sink, above the window (window top y80) | 1 |
| prop.clock.<v> | pieces/<v>/clock.png | 9 x 9 | (4,8) | (88,80) above shelf | 1 |
| prop.frame.<v> | pieces/<v>/frame.png | 10 x 8 | (5,7) | (104,84) | 1 |
| prop.house_rules.<v> | pieces/<v>/house_rules.png | 8 x 10 | (4,9) | (136,96) right of the pendant cord | 1 |

Draw order: backwall -> cornice -> cabinets/clock/frame/house_rules -> window/backsplash/shelf -> pendant -> furniture -> cast.
Night: these get only the cool base (no pendant add, no table lift; all above y110). Evening: warm base + side bands.
Note: cornice sits at y0-5, above the wide (y12) and medium (y56) cameras, so it only shows on full-stage / landscape views.
