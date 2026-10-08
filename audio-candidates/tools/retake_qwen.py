import json, torch, soundfile as sf, os, sys
torch.set_num_threads(8)
from qwen_tts import Qwen3TTSModel
D='/workspace/appartement-411/audio-candidates/qwen3-tts'; os.makedirs(D+'/alt', exist_ok=True)
lines = {l['id']: l for l in json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))}
design = json.load(open(D+'/design.json'))
base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cpu", dtype=torch.float32, attn_implementation="sdpa")
prompts = {}
for lid in sys.argv[1:]:
    sp = lines[lid]['speaker']
    if sp not in prompts: prompts[sp] = base.create_voice_clone_prompt(ref_audio=f'{D}/wav/_ref_{sp}.wav', ref_text=design[sp]['ref_text'])
    for seed in [1, 2, 3, 4]:
        torch.manual_seed(seed)
        w, sr = base.generate_voice_clone(text=lines[lid]['tts'], language="French", voice_clone_prompt=prompts[sp])
        sf.write(f"{D}/alt/{lid}__s{seed}.wav", w[0], sr); print(lid, seed, len(w[0])/sr, flush=True)
