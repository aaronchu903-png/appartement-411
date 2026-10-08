# Assets and provenance

| Asset | Source | Licence / status |
|---|---|---|
| All pixel art (apartment building, doorway, 404 plaque digits, plant corner, plant states, living room, Camille, Noé, Croissant, diary desk, neutral speaker icon, night scene) | Authored in code in `js/art.js` for this project on 2026-10-08 (palette + character maps + rectangles). No reference images were traced or copied. | Original project work. |
| Fonts | None bundled. Uses the device's system fonts (PingFang SC / Noto Sans CJK / Microsoft YaHei / system-ui) so French accents and Chinese render natively. | n/a |
| French voice | The device's own speech engine via the Web Speech API (`speechSynthesis`), fr-FR voice when present. Nothing is recorded or bundled. | Device/OS voice; quality and availability vary per phone. |
| Icons | Unicode emoji rendered by the device. | n/a |
| Third-party code at runtime | None. | — |
| Dev-only dependency | `playwright-core` (Apache-2.0) for automated tests; not shipped in the game. | Apache-2.0 |

## Pre-rendered audio investigation (2026-10-08, not adopted)

Tried offline Piper TTS (tool licence GPL-3; generated audio is not covered by it) to make fixed French clips:

- `fr_FR-mls-medium` (dataset CC-BY 4.0, trained from scratch): output was unintelligible — an automatic transcription check (faster-whisper small) recovered none of the 8 test sentences for 13 candidate speakers. Rejected.
- `fr_FR-siwis-medium` (dataset CC-BY 4.0): intelligible (transcribed exactly), **but** it is fine-tuned from the en_US "lessac" voice, whose Blizzard-2013 data is under a research licence. Licence status of derived audio is unclear, so not used without a founder/legal decision.
- `fr_FR-upmc` (CC-BY-SA dataset) is also lessac-derived; `fr_FR-tom` dataset is AGPLv3. Not used.

Result: device voice + visible reading fallback is the current audio route.
