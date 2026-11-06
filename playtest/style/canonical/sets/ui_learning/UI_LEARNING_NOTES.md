# ui_learning rev1 — Pixel Studio notes (2026-10-26)
Spec: tech/UI_COMPONENTS.md incl. §10a rulings (Prof Neng 00:27). x1 art, integer x2. 28 palette only; no red/pink; gold appears in NO piece (reserved for the engine's learned-word underline).
Colour map: `CM` at the top of gen_ui_learning.py (single swap point). wrong + near = orange/orange_sh; gender le navy / la plum / les none.
Run: python3 gen_ui_learning.py && python3 mock_ui_learning.py && python3 check_manifest.py
Outputs: pieces/x1 (164 png), pieces/x8 (_x8 previews), ui_learning_rev1.png atlas 512x364, ui_learning_rev1_sheet.png (x4), manifest.json (215 keys: pieces + type:'ref' aliases/compositions + sequences), mockups/*_{390,360}.png, mockups/tap_targets.txt.
Manifest extras: displayScale 2, depth 20, nineSlice, textRects (strings 'w-12' = relative to final width), hit, iconSlot, target, inner, colorMap, anchorCodes (tl/tc/tr/c/bc/bl).

## rev2 — warmth pass (2026-10-26 00:3x). Geometry FROZEN (Le CTO is wiring rev1)
Ids, sizes, 9-slice insets, textRects, anchors and hit areas are byte-identical to rev1 (proof: `_geometry_diff.txt`). The only manifest changes are `rev` 1→2 and the atlas key/file `ui_learning_rev1` → `ui_learning_rev2` (`ui_learning_rev2.png`, same 512×364 packing, same frame rects). Backup: `_rev1_backup/`.
- panel / sheet_bottom: paper with ink card edge (spec) + 1-px wall-tone fibre dither in the 4×4 corner cells only, a shade right column + bottom row (lift).
- btn_* / option rows / chips / keys / icon buttons: glazed tile = 1-px white highlight top row + left column, a shade right column, 2-px shade lip; pressed = 1 px down, highlight gone. Darker-tone edges only (§10b-7).
- top_bar: cream wall above a wooden shelf lip (orange edge, orange_sh grain line, wood, dark underside), all in the bottom inset rows.
- wordbook_card: carnet page; a sky ruled-line hint only in the bottom corner cells (outside textRects), dog-ear top-right.
- card_picture_frame: wood frame with lit top/left bevel, grain flecks, dark bottom/right edge.
- reply_note: uniform top fibre row (rev1 row was dithered across the stretch zone, which smeared).
- review_item_frame.recall: ruled hint moved into the bottom inset row (was in the stretch zone).
- Seam test: every 9-slice middle row/column is uniform (script check) + `_seam_test_3x.png` (each stretched 3×). Exception by design: wordbook_list_row has its status mark in the left inset and is fixed 24 tall (never stretched vertically). chunk_slot's dashed edge should be tiled, not stretched.
- Corner tape/pin overlays were NOT added (they would be new ids during the freeze); ui.reply_note.tape and ui.sheet_bottom.nub stay as they were.
- Mockups: panels 168 wide at every width (§10b-3), cream text on green (§10b-2), the Chez nous pot (rooftop pot_chez_nous_full) inside the picture frame and real scene crops in the scene thumbs.
- garden/garden_parts redrawn on-palette (see garden/recolor_garden_parts.py). ui.pot_state.leaf_yellow_* map updated to the new colours; output pixel-identical.
- Pending with Le CTO (§10b), deliberately NOT done because of the freeze: the `textColor` field per component and moving placement_timer's textRect to y = 0.
Before/after: before_after_rev1_rev2.png.

## rev2 + §10b items (2026-10-26 00:34, at Le CTO's request)
- `textColor` (§10b-2): §10b specifies a "role" but not its format, so the value is a **palette role name** (key in palette.json / manifest colorMap), not a hex. It is set on every asset that has `textRects`: `"cream"` on all ui.btn_primary.* states, `"ink"` on everything else. Assets without text don't have the field.
- ui.placement_timer.track textRect `time`: y −4 → 0 (x 64, w 40, h 14 unchanged). The art is unchanged; mockups re-rendered.
- Proof: `_rev2_10b_diff.txt` lists every manifest change vs rev2: only these fields. Checker OK. rev stays 2, the atlas is unchanged.
