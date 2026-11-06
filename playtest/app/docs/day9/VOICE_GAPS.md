# Day 9 voice (canonical v2)

- Source: `day9_voice_v2.tar.gz` (66/66 ASR ok, one mp3 per id in `audio/w1/<id>.mp3`).
- Do not import candidate takes from v1 `mp3s/` (no `__` suffix files).
- **Skipped (unchanged on disk):** `d9_lef_cle`; existing Day 8 `d10_lef_*`, `d10_noe_porte`, `d10_pourmoi*`.
- **Art-only / no line:** `lef_rideau`, `porte_ouverte`, `lef_porte`, `noe_cle`, `pot_wiggle`, `eve_d10`.
- **Reuse:** Day 5 audio for « Il n’a pas de poches ! » (`d5_noe_poche`).

## Script vs recording

| id | On-screen French | Spoken audio |
|---|---|---|
| `n_d10_chat` | Dans le troisième pot… Croissant dort. | Dans le troisième pot… Croissant. Il dort. (intentional) |

## Missing recordings

None in v2 (66/66). If a beat has no `lines[]` entry in `voice-manifest-v2.json`, it has no voiced line by design.

## Compiler Request Audit

The archive inventory above is not the complete standalone compiler inventory. Disk checks on 2026-10-17 found these additional inherited B7 script requests absent from `audio/w1/`:

| Audio ID | Speaker | French |
|---|---|---|
| `d10_regle` | player prompt | Une règle pour la maison. Tu proposes quoi ? |
| `d10_regle_frigo` | player | Le lait, ça va dans le frigo. |
| `d10_regle_nuit` | player | La nuit, pas de bruit. |
| `d10_regle_chat` | player | Croissant dort sur le canapé. |

The exact B7 choices come from `js/act1days.js`; the after-line uses the existing `d10_cam_idee` clip. Every invoked ID maps to `../audio/w1/<id>.mp3`. File presence does not establish speaker or transcript correctness.

**Pocket callback source conflict:** the inherited `d5_noe_poche` transcript (`js/week1.js:175`) is “La clé était dans la poche de ma veste.”, not “Il n’a pas de poches !”. The imported reuse note above and the current compiler alias therefore conflict with the inherited text. The dedicated exact-text request `d10_noe_poches` has no file. The reuse requires transcript verification before it can be considered a matching recording; do not infer correctness merely because `d5_noe_poche.mp3` exists.

`n_d10_chat.mp3` exists and the scene retains `clip` and `audioId` equal to `n_d10_chat`. If it fails, the existing runtime's special silent/text fallback handles this ID; the compiler does not replace it with another take or introduce a speech fallback. The deck chunk has its own `ce_nest_pas_moi.mp3` recording; the story encounter uses `d10_pasmoi.mp3`.

## Letter Source

`DAY10_BANDS_LETTER.md`, referenced by the approved script, is absent from the checkout. The available legacy Letter 9 in `js/letters.js` is addressed to Léa. The standalone compiler exposes a non-graded Letter 9 writing scene addressed to Madame Lefèvre with `sourceAvailable:false`, after E7 and before E8, rather than transplanting incompatible legacy text.

## Verification

Run `node --test tests/day9-content.test.cjs` from `app/`. The tests independently load the compiler in a browser-like VM and compare its script recording requests with the actual shared audio files. Dictionary headword playback is outside the script-gap inventory.
