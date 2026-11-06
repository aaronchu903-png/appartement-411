# Proposal: optional `handPoint` per frame (for Le CTO; SPRITE_MANIFEST_FORMAT.md untouched)
- Field: `handPoint: {x, y}`, OPTIONAL on atlas/file frame assets, **frame-local native px** (same space as `anchorPoint`, origin top-left of `frame`).
- Meaning: the pixel of the hand that grips a prop. Engine places a prop so its own grip/anchor lands on `framePos + handPoint` (scaled by `pixelScale` × shot zoom). Engines that ignore it lose nothing.
- Present on: every `<who>.arm_l.*` / `<who>.arm_r.*` frame (down, wave, point, hips, chest, hold, facepalm) for noe, camille, martin, lefevre. Not on full frames, faces, cat, or back views (yet).
- Since arm layers share the body's feet anchor, handPoint is valid for any body frame drawn at the same anchor.

```json
"martin.arm_r.hold": {
  "source": "atlas", "atlas": "martin",
  "frame": {"x": 64, "y": 72, "w": 16, "h": 24},
  "anchor": "feet", "anchorPoint": {"x": 8, "y": 23},
  "pixelScale": 1,
  "handPoint": {"x": 15, "y": 17}
}
```
