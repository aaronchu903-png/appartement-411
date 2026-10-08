# Assets and provenance

| Asset | Source | Licence / status |
|---|---|---|
| All pixel art (apartment building, doorway, 411 plaque digits (3×5 pixel glyphs; “1” added 2026-10-08 for the rename), plant corner, plant states, living room, Camille, Noé, Croissant, diary desk, neutral speaker icon, night scene) | Authored in code in `js/art.js` for this project on 2026-10-08 (palette + character maps + rectangles). No reference images were traced or copied. | Original project work. |
| Fonts | None bundled. Uses the device's system fonts (PingFang SC / Noto Sans CJK / Microsoft YaHei / system-ui) so French accents and Chinese render natively. | n/a |
| French voice | The device's own speech engine via the Web Speech API (`speechSynthesis`). Since v0.1.2 the game ranks the French voices it is offered (premium/enhanced/natural > standard Apple/Google > compact) and never auto-picks robotic or novelty voices (iOS Eloquence voices such as Jacques/Grand-mère/Rocko, novelty voices such as Bulles/Cloches, eSpeak). Camille gets the best female voice, Noé the best different male voice. The player can override each voice and choose a speed (0.75 / 0.9 / 1.0) in 设置; this is stored per device in `localStorage` key `a411.device.audio`, not in the save. Nothing is recorded or bundled. | Device/OS voice; quality and availability vary per phone. |
| Voice-name lists used for ranking/gender (code only, no audio) | Voice names cross-checked against Readium's `web-speech-recommended-voices` data (`json/fr.json` in https://github.com/readium/speech, formerly HadrienGardeur/web-speech-recommended-voices, BSD-3-Clause). Only the names and genders were used as facts; no files were copied. | Facts only; BSD-3 source credited here. |
| Icons | Unicode emoji rendered by the device. | n/a |
| Third-party code at runtime | None. | — |
| Dev-only dependency | `playwright-core` (Apache-2.0) for automated tests; not shipped in the game. | Apache-2.0 |

## Pre-rendered audio investigation (2026-10-08, not adopted)

Tried offline Piper TTS (tool licence GPL-3; generated audio is not covered by it) to make fixed French clips:

- `fr_FR-mls-medium` (dataset CC-BY 4.0, trained from scratch): output was unintelligible — an automatic transcription check (faster-whisper small) recovered none of the 8 test sentences for 13 candidate speakers. Rejected.
- `fr_FR-siwis-medium` (dataset CC-BY 4.0): intelligible (transcribed exactly), **but** it is fine-tuned from the en_US "lessac" voice, whose Blizzard-2013 data is under a research licence. Licence status of derived audio is unclear, so not used without a founder/legal decision.
- `fr_FR-upmc` (CC-BY-SA dataset) is also lessac-derived; `fr_FR-tom` dataset is AGPLv3. Not used.

Result: device voice + visible reading fallback is the current audio route.

## Pre-rendered audio candidates (2026-10-08, v0.1.2 Improvement cycle; NOT in the game yet)

Prototype clips for all 17 Day 1 lines plus 2 settings test lines live in `audio-candidates/` (see `audio-candidates/README.md` for the full provenance, generation settings, and ASR/MOS results). They were made on the box CPU at USD 0, with no accounts and no cloud APIs. None of them ships in v0.1.2.

| Candidate | Code / weights licence | Voices used | Attribution if adopted |
|---|---|---|---|
| Kyutai Pocket TTS, `french_24l` | Code MIT (https://github.com/kyutai-labs/pocket-tts); weights CC-BY-4.0 (https://huggingface.co/kyutai/pocket-tts-without-voice-cloning) | Built-in voice embeddings: `estelle` (Camille; Kyutai's own recording, CC0, https://huggingface.co/kyutai/tts-voices), `george` (Noé; VCTK p315, CC BY 4.0) and `vera` (neutral; VCTK p229, CC BY 4.0) | "Voices generated with Kyutai Pocket TTS (CC BY 4.0). Speaker embeddings derived from VCTK (CSTR, University of Edinburgh, CC BY 4.0)." Kyutai's prohibited-use policy bans impersonation (not relevant: no real person is imitated). |
| Qwen3-TTS 1.7B (VoiceDesign + Base) | Apache-2.0 (https://github.com/QwenLM/Qwen3-TTS; https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign; https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base) | Three synthetic voices designed from text descriptions (`audio-candidates/qwen3-tts/design.json`), then fixed by cloning that synthetic reference. No real person's voice. | Apache-2.0 notice. Risk: training data (about 5M hours) is not disclosed. |
| Kokoro-82M, voice `ff_siwis` | Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M) | One female voice trained on the SIWIS French corpus (CC BY 4.0) | "SIWIS French speech synthesis database (CC BY 4.0)." Female only, so there is no real Noé voice. |

Rejected for licence reasons: Piper French voices (see below), XTTS-v2 (Coqui Public Model Licence, non-commercial), F5-TTS weights (CC-BY-NC), Meta MMS-TTS (CC-BY-NC), Fish Speech / OpenAudio (CC-BY-NC-SA). Cloud free tiers (Google Cloud TTS, Azure F0, Amazon Polly, ElevenLabs) were researched but not used. All of them need a new account (and usually a card), which needs founder approval. ElevenLabs' free tier is also non-commercial only.

## Shipped Day 1 audio (v0.1.3, 2026-10-08) — Qwen3-TTS fixed recordings

Founder decision 2026-10-08 15:25 PT: use sample 1, Qwen3-TTS, as the fixed Day 1 audio.

| Item | Detail |
|---|---|
| Files | `audio/d1/<lineId>.mp3`, 19 clips (17 Day 1 lines + `test_camille` / `test_noe` for 设置 → 试听录音), ~170 KB total. Copied unchanged from `audio-candidates/qwen3-tts/mp3/`. Inlined as base64 data URIs in `dist/appartement-411.html`. |
| Engine | Qwen3-TTS 1.7B (VoiceDesign → Base clone of the designed reference), rendered offline on the box CPU, USD 0. Code: https://github.com/QwenLM/Qwen3-TTS · weights: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign and https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base |
| Licence | Apache-2.0 (code and weights). Generated audio is our output; Apache-2.0 notice kept here and in the game. |
| Voices | Synthetic voices designed from text descriptions (`audio-candidates/qwen3-tts/design.json`): Camille (young woman, standard Parisian), Noé (young man, soft), neutral narrator (baseline). **No real person's voice was cloned or imitated.** |
| In-game credit | 设置 → 固定录音: "Voices: Qwen3-TTS (Apache-2.0), synthetic designed voices"; title footer also names it. |
| Checks done | ASR (faster-whisper large-v3-turbo) 19/19 exact; UTMOS 3.61 (see `audio-candidates/README.md`). |
| Known risks | Qwen3-TTS training data is not disclosed. Pronunciation/accent not yet reviewed by a native speaker. Synthetic voice may still sound "AI". |
| Fallback | No clip or clip fails → device speech voice (v0.1.2 logic) → visible French text (reading; not counted as listening). |
