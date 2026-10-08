# Human recording script — Day 1 (L’Appartement 411, content d1-2026-10-08b)

Goal: real native French voices for Camille and Noé, recorded on a phone, used as fixed clips in the game
(same voice every time, works on every phone, no device voice needed). Total speaking time ≈ 2–3 minutes.

## Who
- **Camille** – a woman who speaks French natively (standard France accent preferred; the story is set in a French apartment).
- **Noé** – a man who speaks French natively.
- **Neutral voice** (3 baseline lines, name "Léa" is not a story character) – ideally a third person; otherwise Camille's speaker reading in a calm, neutral tone.
- The founder should not record these: learner pronunciation must not become the model.

## How (phone only, no app to install)
1. Quiet room, soft furnishings (a bedroom is better than a kitchen). Phone ~20 cm from the mouth, slightly to the side. Airplane mode.
2. iPhone: Voice Memos app; Android: any recorder. One continuous recording per speaker is fine.
3. For each line: say the **file name number** ("un", "deux"… or just the number in any language), pause 1 s, say the line naturally, pause 2 s, say it **once more, a little slower and very clearly**, pause 2 s. (We keep both: natural speed for normal play, clear take for the "slow" setting.)
4. Speak like a friendly roommate, not a newsreader. Keep the same distance and energy for all lines.
5. Send the original audio files (not a WhatsApp voice note if possible — those are heavily compressed; AirDrop / email / Drive is better).

## Lines (filename → text)
Camille (female)

| # | File | French | Note |
|---|---|---|---|
| 1 | `cam_bonjour.mp3` | Bonjour ! | Opening the door, warm |
| 2 | `cam_intro.mp3` | Salut ! Je m’appelle Camille. | Pointing at herself |
| 3 | `cam_ask.mp3` | Tu t’appelles comment ? | Friendly question, rising |
| 4 | `cam_plante.mp3` | C’est ta plante. | Showing the plant |
| 5 | `cam_soif.mp3` | Ta plante a soif. | Light, a bit amused |
| 6 | `cam_bye.mp3` | Salut ! | Leaving the flat ("bye") |
| 7 | `pr_cam_ask.mp3` | Tu t’appelles comment ? | **Second, separate take** of line 3 (quiz uses a different recording) |
| 8 | `pr_cam_intro.mp3` | Je m’appelle Camille. | Quiz item, neutral |
| 9 | `test_camille.mp3` | Bonjour ! Je m’appelle Camille. | Settings test line |

Noé (male)

| # | File | French | Note |
|---|---|---|---|
| 10 | `noe_intro.mp3` | Salut ! Je m’appelle Noé. | Friendly, a bit shy |
| 11 | `noe_moi.mp3` | Moi, c’est Noé. | Waving |
| 12 | `noe_croissant.mp3` | C’est Croissant. | Introducing the cat |
| 13 | `noe_secret.mp3` | Un secret ? | Whispered-ish, finger on lips |
| 14 | `pr_noe_ask.mp3` | Tu t’appelles comment ? | Quiz item |
| 15 | `pr_noe_intro.mp3` | Salut ! Je m’appelle Noé. | **Second, separate take** of line 10 |
| 16 | `test_noe.mp3` | Salut ! Je m’appelle Noé. | Settings test line (can reuse 15) |

Neutral voice (baseline check before the story)

| # | File | French | Note |
|---|---|---|---|
| 17 | `bl_bonjour.mp3` | Bonjour ! | Calm, neutral |
| 18 | `bl_lea.mp3` | Je m’appelle Léa. | Calm, neutral |
| 19 | `bl_ask.mp3` | Tu t’appelles comment ? | Calm, neutral |

Optional extras (useful for later days / player models, 1 take each)

| # | File | French | Speaker |
|---|---|---|---|
| 20 | `x_cam_merci.mp3` | Merci ! | Camille |
| 21 | `x_cam_bienvenue.mp3` | Bienvenue chez nous ! | Camille |
| 22 | `x_noe_merci.mp3` | Merci ! | Noé |
| 23 | `x_noe_chut.mp3` | Chut ! | Noé |
| 24 | `x_model_bonjour.mp3` | Bonjour ! | either (model answer for the player) |
| 25 | `x_model_salut.mp3` | Salut ! | either (model answer for the player) |

We (the team) cut, trim silence, level loudness (-16 LUFS), and encode; the speaker does nothing technical.

## Permission text (each speaker sends this back in writing — a message/email is enough)
> I, [full name], recorded the lines of the "L’Appartement 411 — Day 1" script on [date]. I am the speaker and I own these
> recordings. I grant [founder's name] a free, worldwide, non-exclusive, perpetual and irrevocable licence to use, edit and
> publish them in the game L’Appartement 411 and its promotion, including commercial versions. Credit me as
> [name / nickname / "no credit"]. I may ask to have my voice removed from future versions by contacting [founder's contact].

(Optional alternative: release the clips under CC BY 4.0 — simplest for future reuse.) Store the message with the files;
the team records speaker, date, device, licence and file hashes in `docs/ASSETS.md`.
