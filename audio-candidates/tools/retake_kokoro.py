import json, soundfile as sf, numpy as np, os, sys
from kokoro import KPipeline
D='/workspace/appartement-411/audio-candidates/kokoro'; os.makedirs(D+'/alt', exist_ok=True)
lines = {l['id']: l for l in json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))}
p = KPipeline(lang_code='f', repo_id='hexgrad/Kokoro-82M')
for lid in sys.argv[1:]:
    for i, sp in enumerate([0.9, 0.85, 0.95, 0.8], 1):  # Kokoro is deterministic: vary speed instead of seed
        a = np.concatenate([c.numpy() for _, _, c in p(lines[lid]['tts'], voice='ff_siwis', speed=sp)])
        sf.write(f"{D}/alt/{lid}__s{i}.wav", a, 24000); print(lid, sp, len(a)/24000, flush=True)
