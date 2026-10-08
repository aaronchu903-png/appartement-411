# Day 1 content review — Experience pass (2026-10-08)

Reviewer: Experience role pass performed by the same Bot that wrote the code (no separate agent, no human native-speaker review).
This is AI review, **not** expert certification. Content version reviewed: `d1-2026-10-08a`. Reviewed in the running artifact (screenshots in `evidence/`), not only in source.

> 2026-10-08 rename (v0.1.1, content `d1-2026-10-08b`): the project is now **L’Appartement 411**. The only content change from 08a is the apartment number in two Chinese narration lines and the title-screen alt text (404 号 → 411 号) plus the door-plaque pixel digits. No French line, learning target, probe item or help text changed, so this review still applies to 08b.

## French lines (all from CURRICULUM_WEEK_01 Day 1)

| Line | Use | Label | Verdict |
|---|---|---|---|
| `Bonjour !` | Camille opening the door | Understand | OK. |
| `Salut ! Je m’appelle Camille.` | Camille, hand on chest | Understand | OK (curriculum text verbatim). See flag 1. |
| `Salut ! Je m’appelle Noé.` | Noé appears | Understand | OK, same frame as Camille before the variant. |
| `Moi, c’est Noé.` | Noé's playful repeat | Atmosphere | OK, natural informal variant; not assessed. |
| `Tu t’appelles comment ?` | Camille asks | Understand | OK — standard informal spoken question. |
| `C’est ta plante.` / `Ta plante a soif.` | Plant corner, with gesture + watering can | Atmosphere | OK; not tested (curriculum: environment teaches meaning). |
| `Salut !` | Camille leaving | Understand | OK — `Salut` is also an informal goodbye; Chinese help says so. |
| `C’est Croissant.` / `Un secret ?` | Cat scene, finger to lips | Atmosphere | OK. |
| Probe: `Tu t’appelles comment ?` (Camille, Noé), `Salut ! Je m’appelle Noé.`, `Je m’appelle Camille.` | Neutral frame | Probe | Familiar language only; one asks-item uses a new speaker (Noé); one tells-item is a shortened variant. Balanced 2/2, order randomised. |
| Baseline: `Bonjour !`, `Je m’appelle Léa.`, `Tu t’appelles comment ?` | Neutral voice | Baseline | `Léa` is a name not used in the story, so the baseline does not pre-teach a story line. |

Typography: non-breaking space before `!` and `?`, typographic apostrophe in display; the speech engine receives a plain apostrophe and spaces.

## Flags / uncertainty

1. **Double greeting at the door.** `Bonjour !` → player reply → `Salut ! Je m’appelle Camille.` A native speaker would usually not greet twice; it reads as "polite at the door, then friendly". Kept because the curriculum fixes the `Salut ! Je m’appelle Camille.` frame and lists `Bonjour !` as an Understand target. Alternative if a native reviewer objects: drop `Salut !` from her second line (`Je m’appelle Camille.`). Needs native check.
2. **Camille echoing the nickname is text-only** (`« Alex ! »`), because the device voice would have to say an arbitrary user string. Marked "无语音" in the UI so it is never counted as listening.
3. **Device TTS prosody** for `Tu t’appelles comment ?` (question intonation) and the name `Noé` is device-dependent and untested on the founder's phone.
4. The baseline/probe options are meanings in Chinese (`对方在告诉我他/她的名字` / `对方在问我的名字`). This tests comprehension of function, not translation; the "or give an appropriate response" half of curriculum step 5 is only covered by the earlier free name answer, not inside the probe. Candidate improvement for v0.2.
5. Only 4 probe trials — results are reported as a small record, not a level; first-listen, replay-assisted, text-assisted and reading-only are reported separately.

## Learning-validity checks (verified in e2e, see `evidence/e2e-results.json`)

- Probe frame has no characters, no pointing, no name highlight; French text is not in the DOM until the player asks for it; option buttons have identical computed styles.
- Any text/translation shown during a trial ⇒ `resultType: supported`. Replays are counted and `firstListen` is recorded.
- No French voice ⇒ modality `reading`, audio `unavailable`; never labelled listening.
- Name answer: nickname-only is recorded as `nickname_only` (communicates, not full structure). Shown template/Chinese ⇒ supported. No gender is inferred; skipping is accepted.
- Diary: chronicle is generated only from events that happened (e2e checks both paths); the journal is stored verbatim; a template insertion is flagged as supported writing.
