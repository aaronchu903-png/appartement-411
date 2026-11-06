# Day 8 Art And Chrome

The existing Astra scene painters remain the visual source: warm plaster, clay, sage, muted zinc and lavender night skies, scanned into whole pixels. Preserve their texture and character proportions. Add animation poses and rooftop shelves without replacing these painters.

Chrome ports v0.14: dark stepped borders, solid cream interiors, hard offset shadows, square pixel glyphs, character-coloured speaker chips, and minimum 44px touch targets. Use app/tokens.css for colours, border thickness, spacing and motion. French uses the system sans-serif stack, never a pixel font.

The scene fills the viewport behind every control. Dialogue normally sits above the fixed bottom HUD and occupies at most a quarter of viewport height. When that position would cover an active object, the dialogue docks below the top HUD instead; the painted object and its hitbox stay together. Utility overlays remain bounded and scroll internally. No blur, glass, gradient chrome, soft shadow, circular icon controls or bottom navigation bar.

Motion is staged with anticipation, held expressions and quick transitions, then secondary ear, tail, hand and hair movement. The complete 24fps reference is the timing guide. Reduced motion shows settled poses without blocking interactions. Story plants remain living props independently of review growth stage.

## Frame Study

The supplied jai_faim.mp4 is 1080x1920, 24fps, exactly 600 frames (25 seconds). All frames were extracted and inspected across 12 consecutive 50-frame sheets, plus six enlarged action sequences. Frame timestamps below are `(frame - 1) / 24`.

| Frames | Motion cue |
| --- | --- |
| 19-64 | Rumble compression/stretch, face changes, hands inward, short motion ticks |
| 67-118 | Bubble grows quickly, held talking expression, contraction |
| 131-156 | Hand reaches before fridge opens at 145; brief light flicker |
| 189-196 | Intermediate slump positions, droop lines following body motion |
| 263-300 | Cat enters progressively from the right and settles at bowl |
| 303-310 | Head lowers before contact |
| 311-346 | Bowl and following cat slide continuously left |
| 347-364 | Contact sparkle, compression, hop and landing |
| 369-432 | Affectionate held pose with eyes, tail, breath and sparkle motion |
| 453-538 | Shared hungry reaction; cat answer starts at frame 491 |
| 539-600 | End-card entrance, cat peek, settling |

Many pose updates are held for two frames. Reuse that cadence rather than constantly oscillating all body parts. The reference contains no lift: the Day 8 lift is an adaptation with reach, established contact and continuous upward movement, not a copied reference action. Full analysis sheets are development artifacts under /tmp/kilo/day8-jf; reproducible app motion evidence belongs in app/screenshots.
