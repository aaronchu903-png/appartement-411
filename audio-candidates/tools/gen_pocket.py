"""Kyutai Pocket TTS, French 24-layer model (weights CC-BY-4.0, code MIT). Predefined voice embeddings only (no cloning)."""
import json, time, torch, scipy.io.wavfile, os
torch.set_num_threads(8)
from pocket_tts import TTSModel
OUT = '/workspace/appartement-411/audio-candidates/pocket-tts/wav'; os.makedirs(OUT, exist_ok=True)
VOICE = {'camille': 'estelle', 'noe': 'george', 'neutral': 'vera'}
lines = json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))
m = TTSModel.load_model(language='french_24l')
states = {k: m.get_state_for_audio_prompt(v) for k, v in VOICE.items()}
for l in lines:
    torch.manual_seed(1234); t = time.time()
    a = m.generate_audio(states[l['speaker']], l['tts'])
    scipy.io.wavfile.write(f"{OUT}/{l['id']}.wav", m.sample_rate, a.numpy())
    print(l['id'], VOICE[l['speaker']], round(time.time() - t, 1), round(len(a) / m.sample_rate, 2), flush=True)
