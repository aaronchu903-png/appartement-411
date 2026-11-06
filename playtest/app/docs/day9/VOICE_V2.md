# Day 9 voice pre-record — DAY09_V3

- **When:** 2026-10-17 02:08:15 America/Vancouver
- **Engine:** Qwen3-TTS 1.7B Base, local CPU only ($0)
- **ASR:** faster-whisper large-v3-turbo
- **Format:** mono 24 kHz 32 kbps mp3
- **Path:** `/workspace/a411-team/tech/astra_day9/voice/`
- **Lines:** **66/66** ASR ok
- **Failures:** none

## Voice mapping

| Role | Voice |
|---|---|
| Camille | camille |
| Noé | noe |
| Narrator / player options | neutral |
| Lefèvre | — (silent on Day 9 V3; gagnon unused) |
| Madame Martin | — (off-stage; martin unused) |

## Skipped / not re-recorded

- d9_lef_cle — not re-recorded (founder-approved)
- all other existing d9_* and Day-8 d10_lef_*/d10_noe_porte/d10_pourmoi* left untouched in audio/w1
- art-only beats (lef_rideau, porte_ouverte, lef_porte, noe_cle, pot_wiggle invite, eve_d10)
- Day 5 reuse d5_noe_poche for « Il n'a pas de poches ! »

## Ambiguous

- `n_d10_chat`: script « Dans le troisième pot… Croissant dort. » → spoken TTS « Dans le troisième pot… Croissant. Il dort. ». Qwen+Whisper consistently hear « Croissant dort » as « croissant d'or ». Spoken form splits the clause; meaning unchanged.

## Lines

| id | speaker | seed | ASR | duration | French (display) |
|---|---|---|---|---|---|
| `n_d10_monte` | neutral | 1234 | OK | 2.93s | La clé tourne. La porte s’ouvre. |
| `n_d10_jour` | neutral | 1234 | OK | 2.78s | Le toit, le matin. Il y a du soleil. |
| `d10_noe_beau` | noe | 1234 | OK | 1.49s | Regarde ! C’est beau. |
| `d10_beau` | neutral | 1234 | OK | 1.34s | Oui, c’est beau. |
| `d10_beau_chut` | neutral | 1234 | OK | 2.69s | Chut… tout le monde dort. |
| `d10_noe_sec` | noe | 1 | OK | 3.1s | Tout est sec. Le jardin dort. |
| `n_d10_pose` | neutral | 1234 | OK | 2.21s | Tu poses la plante à côté du basilic. |
| `d10_eau` | neutral | 1234 | OK | 1.01s | Il faut de l’eau. |
| `d10_eau2` | neutral | 1234 | OK | 1.34s | Il faut de l’eau, non ? |
| `d10_eau_cafe` | neutral | 1234 | OK | 1.1s | Il faut du café. |
| `d10_eau_pourmoi` | noe | 1234 | OK | 1.1s | Pour moi, oui. |
| `d10_noe_arrosoir` | noe | 1234 | OK | 2.47s | L’arrosoir… près de la chaise. |
| `d10_noe_encore` | noe | 1234 | OK | 0.77s | Encore un peu ? |
| `n_d10_arrose2` | neutral | 11 | OK | 3.17s | L’eau coule. Deux plantes, deux pots. |
| `n_d10_chat` | neutral | 1 | OK | 3.26s | Dans le troisième pot… Croissant dort. |
| `d10_cam_ou` | camille | 1234 | OK | 1.42s | Vous étiez où ? |
| `d10_cam_ou_toit` | neutral | 1234 | OK | 1.01s | Sur le toit ! |
| `d10_cam_ou_lahaut` | neutral | 1234 | OK | 1.01s | Là-haut ! |
| `n_d10_matin` | neutral | 7 | OK | 4.78s | Mardi matin. Huit heures. Camille a un stylo et une feuille. |
| `d10_cam_liste` | camille | 1234 | OK | 2.93s | C’est une liste. La liste de la maison. |
| `d10_cam_a` | camille | 7 | OK | 4.37s | Samedi, elle a souri. Mardi, on est tranquilles. |
| `d10_cam_b` | camille | 1234 | OK | 2.78s | Elle revient dans un mois. On fait attention. |
| `d10_cam_c` | camille | 1234 | OK | 3.02s | On écrit les règles. On fait très attention. |
| `d10_cam_null` | camille | 1234 | OK | 2.78s | C’est mardi. On fait la liste de la maison. |
| `d10_cam_frigo` | camille | 1234 | OK | 3.17s | Le lait, ça va dans le frigo. Pas sur la table. |
| `d10_cam_vaisselle` | camille | 1234 | OK | 2.45s | Noé, tu pourrais faire la vaisselle ? |
| `d10_noe_vaisselle` | noe | 1234 | OK | 2.47s | Je pourrais… Mais je ne voudrais pas. |
| `d10_cam_idee` | camille | 1234 | OK | 1.49s | C’est une bonne idée. |
| `d10_cam_table` | camille | 1234 | OK | 2.38s | Et ça : on mange à table. |
| `n_d10_noe_ecrit` | neutral | 1234 | OK | 4.37s | Noé prend le stylo. Il écrit : « Jeudi : dîner en bas. » |
| `d10_cam_chat` | camille | 7 | OK | 2.86s | Croissant. C’est une liste. Pas un lit. |
| `d10_noe_stylo` | noe | 1234 | OK | 1.42s | Mon stylo a disparu ! |
| `d10_ou_stylo` | camille | 1234 | OK | 1.42s | Où est le stylo ? |
| `d10_cam_frigo2` | camille | 1234 | OK | 3.58s | Le lait, ça va dans le frigo. Pas le stylo. |
| `n_d10_chaussette` | neutral | 1234 | OK | 2.78s | À midi, Noé a une chaussette. Une seule. |
| `d10_noe_manque` | noe | 1234 | OK | 1.34s | Il manque une chaussette ! |
| `d10_noe_cam` | noe | 1234 | OK | 3.82s | Camille… Mon stylo. Ma chaussette. |
| `d10_pasmoi` | camille | 1234 | OK | 1.49s | Ce n’est pas moi. |
| `d10_pasmoi_noe` | noe | 1234 | OK | 1.34s | Ce n’est pas moi non plus ! |
| `ce_nest_pas_moi` | camille | 1234 | OK | 1.42s | Ce n’est pas moi ! |
| `d10_qui_noe` | neutral | 1234 | OK | 1.01s | C’est Noé ! |
| `d10_qui_cam` | neutral | 1234 | OK | 1.01s | C’est Camille ! |
| `d10_qui_chat` | neutral | 1234 | OK | 1.18s | C’est Croissant ! |
| `d10_pasmoi_c5` | noe | 1234 | OK | 0.94s | Ce n’est pas moi ! |
| `d10_noe_cuillere` | noe | 1234 | OK | 1.01s | Ma cuillère ?! |
| `n_d10_gouter` | noe | 1234 | OK | 1.9s | Mon croissant. Pour moi. |
| `n_d10_miettes` | neutral | 1234 | OK | 2.62s | Il n’y a plus de croissant. Il y a des miettes. |
| `d10_noe_croissant` | noe | 1234 | OK | 0.86s | Croissant ! |
| `d10_cam_suit` | camille | 1234 | OK | 1.42s | On suit les miettes. |
| `n_d10_porte_ouverte` | neutral | 1234 | OK | 1.66s | La petite porte est ouverte. |
| `n_d10_coucher` | neutral | 1234 | OK | 1.66s | Le toit, le soir. |
| `d10_ou` | noe | 1234 | OK | 0.77s | Il est où ? |
| `n_d10_tresor` | neutral | 1234 | OK | 5.57s | Dans le pot : le stylo, la chaussette, la cuillère… Et sur tout ça, Croissant. |
| `d10_noe_tout` | noe | 1234 | OK | 0.86s | Tout est là ! |
| `d10_reponse_chat` | neutral | 1234 | OK | 1.18s | C’est Croissant ! |
| `d10_reponse_pasmoi` | neutral | 1234 | OK | 0.86s | Ce n’est pas moi ! |
| `d10_reponse_chut` | neutral | 1234 | OK | 1.97s | Chut… il dort. |
| `d10_cam_raison` | camille | 1234 | OK | 1.34s | Tu avais raison. |
| `d10_cam_pot` | camille | 1234 | OK | 3.26s | Croissant. C’est un pot. Pas un lit. |
| `n_d10_ding` | neutral | 1234 | OK | 3.65s | Ding. L’ordinateur de Camille. Un nouveau message. |
| `d10_cam_message` | camille | 1234 | OK | 2.54s | Un message… de Madame Martin. |
| `d10_hook` | neutral | 1234 | OK | 2.62s | Un message. De Madame Martin. |
| `w_liste` | camille | 1234 | OK | 1.99s | La liste… une liste. |
| `w_jardin` | noe | 1234 | OK | 2.06s | Le jardin… un jardin. |
| `w_miettes` | camille | 42 | OK | 2.14s | Les miettes… des miettes. |
| `w_message` | camille | 1234 | OK | 2.3s | Le message… un message. |

## Notes

- Clip IDs use `d10_` / `n_d10_` prefix per DAY09_V3 (display Day 9, letter 9).
- Neng: deck `ce_nest_pas_moi` recorded; zh fixes are text-only.
- CHORES adjust: `d10_noe_cuillere`.
- Candidate seed/variant takes kept under `work/candidates/` (not for import).
- Do not commit or deploy; build agent imports from this path.
