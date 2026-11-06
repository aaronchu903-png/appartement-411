# Pack `b` — Style B canonical sheets

Approved art ships as **`style_b_canonical_v3.tar.gz`** (185 character assets including sequences, 5 atlases). The converter reads v3 `atlas` + `frame {x,y,w,h}`, feet anchors, sequences in `assets`, and an optional `characters` block; it also accepts the earlier `sheet` + `rect` format.

## Import (required once per checkout)

```bash
# Place tarball at repo root, then:
bash app/scenes/packs/b/import-tarball.sh /workspace/style_b_canonical_v3.tar.gz
```

This extracts under `canonical/`, copies sheet PNGs beside `manifest.json`, runs `convert-canonical.cjs`, optionally runs `check_manifest.py`, then runs `merge-sofa-props.cjs`. The single runtime manifest contains the 185 canonical entries plus sofa kitchen props/backdrop copied into `kitchen/`, with native PNG dimensions and placeholder aliases. Canonical documentation stays under `canonical/`; import does not overwrite this README.

To rebuild from an already extracted v3 directory, run from the repository root:

```bash
node app/scenes/packs/b/convert-canonical.cjs && node app/scenes/packs/b/merge-sofa-props.cjs
```

## Runtime

- URL: `?pack=b` or `assetPack: "b"` in `scene.json`
- Lineup proof page: `app/scenes/pack-b-lineup.html` (390×844 phone frame)

## Engine

- `HumanC` / `CatC` in `scene-characters.js` — 16×24 humans, 14×12 cat, face rows via `characters.*.faces`
- Actors: `madame_martin`, `lefevre`, `camille`, `noe`, `croissant`
- Face and arm atlas cells are transparent layers, not whole characters. Conversion labels them with `layer` metadata so the player composes body, arms, and face at the same feet position. Dialogue alternates human `talk_0`/`talk_1` at 4 fps; neutral idle uses 2 fps and walks use their sequence fps. The cat has no talk frames and keeps its authored expression.
- Optional per-frame `handPoint: { x, y }` in **frame-local native px** (same space as `anchorPoint`). Grip at placed top-left + `handPoint × pixelScale` (scene space; camera zoom scales the layer uniformly). Spec: `canonical/HANDPOINT_PROPOSAL.md`. Typical on `*.arm_l.*` / `*.arm_r.*` frames. `heldProp` on actors uses the arm frame’s `handPoint`.
- Kitchen actors use feet positions: humans at `y: 44`, cat on the floor at `y: 46` (on the keyboard at `y: 36`). Martin's recorded message is staged off-screen; Lefevre remains off-screen rather than adding dialogue or shots.
