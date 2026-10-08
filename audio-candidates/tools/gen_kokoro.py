"""Kokoro-82M (Apache-2.0) French voice ff_siwis (trained on SIWIS, CC BY 4.0). Female only -> Noé lines use the same voice (flagged)."""
import json, soundfile as sf, numpy as np, os
from kokoro import KPipeline
OUT = '/workspace/appartement-411/audio-candidates/kokoro/wav'; os.makedirs(OUT, exist_ok=True)
lines = json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))
p = KPipeline(lang_code='f', repo_id='hexgrad/Kokoro-82M')
for l in lines:
    a = np.concatenate([c.numpy() for _, _, c in p(l['tts'], voice='ff_siwis', speed=1.0)])
    sf.write(f"{OUT}/{l['id']}.wav", a, 24000); print(l['id'], round(len(a) / 24000, 2), flush=True)
