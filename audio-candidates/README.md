# Pre-rendered French audio candidates (Day 1), 2026-10-08

These are prototypes only and are **not used by the game** (v0.1.2 still uses the device voice).
- Made offline on the box CPU at USD 0, with no accounts and no cloud APIs.
- 19 lines (17 Day 1 lines plus 2 settings test lines) per engine. The texts are in `lines.json`.
- Generators: `tools/gen_*.py` and `tools/retake_*.py`. Post-processing: `process.sh`.
  - Steps: trim, cap internal pauses at 0.35 s, loudnorm to -16 LUFS, then mono 24 kHz 64 kbps MP3.
- Per-line clips: `<engine>/mp3/<lineId>.mp3`. Raw WAVs are gitignored.

**Listen first:** `compare/<engine>_3lines.mp3` has the same 3 lines for each engine:
1. "Salut ! Je m’appelle Camille."
2. "Tu t’appelles comment ?"
3. "Salut ! Je m’appelle Noé."

## Results (final run, 2026-10-08 ~13:55 PT)

| Rank | Engine | ASR exact (19) | Mean WER | UTMOS (1–5) | Speech rate (≈syll/s) | Camille / Noé | Licence | Main risks |
|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3-TTS 1.7B (VoiceDesign → Base clone) | **19/19** | 0.00 | 3.61 | 3.8 (calm, learner-friendly) | two distinct synthetic voices + neutral | Apache-2.0 | Training data undisclosed; synthetic voice may still sound "AI"; slow on CPU (~4–5× real time) |
| 2 | Kyutai Pocket TTS `french_24l` | 17/19 | 0.04 | 3.35 | 4.1 (fastest) | estelle (native French woman) / george (VCTK English speaker's timbre) | Weights CC-BY-4.0, code MIT; voices CC0 / CC BY 4.0 | Noé's "Je m’appelle" was heard as "tu m’appelles" (2×), so there is an accent risk; Camille scored lowest on UTMOS on short lines |
| 3 | Kokoro-82M `ff_siwis` | 16/19 | 0.30* | 3.75 | 3.4 (slowest) | **female only**, so Noé has no voice of his own | Apache-2.0 + SIWIS CC BY 4.0 | No male voice; "Un secret ?" question intonation lost; misreads ("croissants", "soif") |

\* Kokoro's WER is inflated by one ASR hallucination on the 0.6 s "Bonjour !" clip.

How to read these numbers:
- ASR (faster-whisper large-v3-turbo, int8, temperature 0) measures **intelligibility, not accent**.
- UTMOS22 (SpeechMOS) is trained on English, so it is only a rough naturalness signal.
- No native speaker has listened yet. The founder's ear is the real test.
- Full data: `asr_results.json`, `utmos_results.json`, `speech_rate.json`, `manifest_all.json`.

## LICENCES / provenance (verified 2026-10-08 from the model cards and repos)

**Kyutai Pocket TTS**
- Code: MIT (https://github.com/kyutai-labs/pocket-tts).
- Weights: CC-BY-4.0, ungated (https://huggingface.co/kyutai/pocket-tts-without-voice-cloning).
- Voices come from https://huggingface.co/kyutai/tts-voices:
  - Camille = `estelle` (`unmute-prod-website/developpeuse-3.wav`), described there as "our own recordings … use them as CC0".
  - Noé = `george` (VCTK p315) and neutral = `vera` (VCTK p229), both CC BY 4.0 (CSTR, Univ. of Edinburgh).
- Kyutai's usage policy forbids impersonation. That does not apply here because no real person is imitated.
- Required credit: "Kyutai Pocket TTS (CC BY 4.0); VCTK corpus (CC BY 4.0)".

**Qwen3-TTS**
- Code (https://github.com/QwenLM/Qwen3-TTS) and weights are Apache-2.0, ungated:
  - https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign
  - https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base
- Voices were designed from text prompts (`qwen3-tts/design.json`). The synthetic references are in `qwen3-tts/wav/_ref_*.wav`. No real person's voice was used.
- Credit: Apache-2.0 notice.

**Kokoro-82M**
- Weights: Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M).
- Voice `ff_siwis` was trained on SIWIS (https://datashare.ed.ac.uk/handle/10283/2353, CC BY 4.0).
- Credit: "SIWIS French speech synthesis database (CC BY 4.0)".

**Rejected on licence grounds**
- Piper French voices: they derive from lessac (research-only) or ryan (CC BY-NC-SA), and the tom dataset is AGPL.
- XTTS-v2: CPML, non-commercial.
- F5-TTS: CC-BY-NC.
- MMS-TTS: CC-BY-NC.
- Fish/OpenAudio: CC-BY-NC-SA.
- Expresso-derived Kyutai voices: CC-BY-NC, not used.

**Cloud free tiers** (Google Cloud TTS 1M chars/month, Azure F0 0.5M, Amazon Polly, ElevenLabs)
- Not used. Each needs a new account and usually a card.
- ElevenLabs' free tier is non-commercial only.
- Day 1 is about 400 characters, so cost would be about $0 if approved.

**Human recording** (best quality): `HUMAN_RECORDING_SCRIPT.md` has the 25 lines, phone recording tips and a written permission template (free perpetual licence or CC BY 4.0).

## Integration plan (not built)

1. Play `audio/d1/<lineId>.mp3` with an HTMLAudioElement.
2. Fall back to the device voice, then to reading mode.
3. Record `audioSource` on each attempt.
4. Inline about 300 KB into the single-file build.
