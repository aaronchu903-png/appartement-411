# Day 10 pack B — round 3 (Croissant review)

**Branch:** `astra/day10-scenes`  
**Commit:** `4213e1f` (`fix(day10): top-align scene band above dialogue HUD`; round 3 stack on `astra/day10-scenes`)

## Changes (characters / anchors / mouths unchanged)

1. **Bubble tails** — Short filled wedge (~14 CSS px wide) from the bottom HUD band toward the speaker’s head; no Bézier line tails.
2. **Depth** — Props split `behind` / `front` by layer or `z`; feet shadows; counter/fridge/table behind actors; laptop and hand props in front.
3. **Framing** — Scene crops top-aligned with `fitCrop`; reserved **156px** bottom dialogue HUD (cream panel + live line text); lineup inside kitchen set with all five on the floor line.
4. **Set pieces** — Provisional palette art under `app/scenes/packs/b/kitchen/` (regenerate via `gen-set-pieces.py`).

## Set-piece slots (native px, anchor top-left)

| Slot file | Size (w×h) |
|-----------|------------|
| `backwall.png` | 96×64 |
| `window.png` | 20×16 |
| `shelf.png` | 24×10 |
| `fridge.png` | 12×29 (~1.3× 22px character) |
| `counter_sink.png` | 52×14 |
| `table.png` | 40×12 |
| `chairs.png` | 14×12 |

Manifest ids: `backdrop.kitchen` → `backwall.png`; `prop.window`, `prop.shelf`, `prop.fridge`, `prop.counter_sink`, `prop.table`, `prop.chairs`.

## Verification

- `npm test`: 292 passed.
- `npm run build`: OK.
- `node app/tools/pb3-day10-capture.cjs`: no console errors.

## Captures (390×844, prefix `pb3_`)

`pb3_lineup.png`, `pb3_d11_cam_lait.png`, `pb3_d11_mar_bonjour.png`, `pb3_d11_mar_chat.png`, `pb3_d11_mar_photo.png`, `pb3_keyboard_cat.png`, `pb3_n_d11_matin2.png`, `pb3_d11_noe_lait.png`, `pb3_d11_dictee.png`.

No deploy. Stopped for review.
