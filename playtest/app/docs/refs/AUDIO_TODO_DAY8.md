# Day 8 audio — clip list for Qwen3-TTS

Not recorded yet. This environment does not render speech. Until these files exist on the founder’s machine, `Audio.playLine` falls back to the device voice, then to the written line.

Do not add empty mp3s. When a line is recorded, put `audio/w1/<id>.mp3` on disk and register it in `js/week-clips.js` (word clips use the id `w_<word>`).

Narration (`n_d8_*`), choice follow-ups, the say-step prompt, and the end-of-day ritual text are device TTS on purpose (same as Days 1–7). They have no clip ids and are not in this list.

## Story lines (12)

| clip id | speaker | French (spoken) |
|---|---|---|
| `d8_noe_matin` | noe | Lundi, sept heures et demie. Regarde la plante ! |
| `d8_noe_chat` | noe | Croissant regarde la plante. S'il la renverse… oh non. |
| `d8_cam_bonjour` | camille | Bonjour. Le café est prêt. |
| `d8_cam_a` | camille | Samedi, elle a souri. On fait attention, c'est tout. |
| `d8_cam_b` | camille | Elle revient dans un mois. Cette nuit, moins de bruit. |
| `d8_cam_c` | camille | Ce soir, on écrit les règles. On fait très attention. |
| `d8_cam_lundi` | camille | C'est lundi. La plante est là, sur la table. |
| `d8_cam_depuis` | camille | Nous habitons ici depuis samedi. |
| `d8_gag_bonjour` | lefevre | Bonjour ! C'est moi, Madame Lefèvre. |
| `d8_gag_basilic` | lefevre | C'est du basilic, pour la cuisine. |
| `d8_gag_venez` | lefevre | Venez chez moi à six heures. J'ai une question. |
| `d8_noe_question` | noe | Du basilic… et une question ? Oh… |

Only one of `d8_cam_a`, `d8_cam_b`, `d8_cam_c`, `d8_cam_lundi` plays in a given run (the recorded Day 7 band, or the neutral Monday if there is no band). Record all four.

## Focus word (1)

| clip id | speaker | French (spoken) |
|---|---|---|
| `w_basilic` | lefevre | Le basilic… du basilic. |

`w_plante` is already on disk from Week 1. Day 8 zooms it again and reuses that clip.
