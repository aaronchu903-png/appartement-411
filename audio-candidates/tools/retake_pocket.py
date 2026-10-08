import json, torch, scipy.io.wavfile, os, sys
torch.set_num_threads(8)
from pocket_tts import TTSModel
D='/workspace/appartement-411/audio-candidates/pocket-tts'; os.makedirs(D+'/alt', exist_ok=True)
VOICE = {'camille': 'estelle', 'noe': 'george', 'neutral': 'vera'}
lines = {l['id']: l for l in json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))}
m = TTSModel.load_model(language='french_24l')
for lid in sys.argv[1:]:
    st = m.get_state_for_audio_prompt(VOICE[lines[lid]['speaker']])
    for seed in [1, 2, 3, 4]:
        torch.manual_seed(seed); a = m.generate_audio(st, lines[lid]['tts'])
        scipy.io.wavfile.write(f"{D}/alt/{lid}__s{seed}.wav", m.sample_rate, a.numpy()); print(lid, seed, len(a)/m.sample_rate, flush=True)
