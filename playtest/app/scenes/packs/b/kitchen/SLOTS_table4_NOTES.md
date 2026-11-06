# Kitchen table for 4 (LOCKED layout numbers)
Stage 192x144, backBase y131. Anchors are bottom-centre; positions are anchor points in stage px.

| id | file | size | anchorPoint | stage pos | depth | data |
|---|---|---|---|---|---|---|
| prop.table.{v} | table.png | **44x12** (was 28x12) | (22,11) | **(118,131)**, unchanged centre; spans x96-139 | 2, drawn AFTER behind-table sitters | `sitLine: 2` (behind-table seat line, local y), seats `back_l (15,2)`, `back_r (29,2)` (local), `top (22,0)` |
| prop.chairs.{v} | chairs.png | 10x16 (unchanged art) | (5,15) | left **(98,131)**, right **(138,131) mirrored** (were 104 / 132) | 2 | `sitLine: 9`, seat slot `(7,9)` local (mirrored: (2,9)) |

## The 4 places (stage px; place with the canonical seatPoint (8,16): topleft = seat - seatPoint, mirrored seatPoint.x = 7)
| place | pose | seat (x, sit line y) |
|---|---|---|
| end left | `<who>.pose.sit_table_34` | (100, 125) |
| behind left | `<who>.pose.sit_table` | (111, 122) |
| behind right | `<who>.pose.sit_table` | (125, 122) |
| end right | `<who>.pose.sit_table_34`, flip x | (136, 125) |
Head spans: about 95-104 | 106-115 | 120-129 | 131-140, so no head overlaps another.
Table props on the top (y119 baseline): plates at x 103 / 111 / 125 / 133, cups or milk in the gaps (x 107, 118, 129).

## z-order
chairs -> behind-table sitters -> prop.table -> end-chair sitters -> table hand props (plates, cups).

## Cameras
The standard medium camera (46,56) is unchanged, so existing shots stay as they were. It covers x46-135 and cuts the right end chair. For a 4-person meal shot, use **medium_table4: k=12, top-left (54,56)**, which covers x54-143. Close (92,85) already covers x92-151.
Night: the pendant add on the tabletop is widened to the 44-px top, and the floor pool and multiply lift cover x90-146.
