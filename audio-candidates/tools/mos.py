"""Rough naturalness proxy: UTMOS22-strong (SpeechMOS, MIT; trained mostly on English BVCC/VMC data -> only a rough signal for French)."""
import sys, json, torch, soundfile as sf, numpy as np, torchaudio
p = torch.hub.load('tarepan/SpeechMOS:v1.2.0', 'utmos22_strong', trust_repo=True)
out = {}
for f in sys.argv[2:]:
    a, sr = sf.read(f, dtype='float32', always_2d=True); a = torch.from_numpy(a.mean(1)).unsqueeze(0)
    if sr != 16000: a = torchaudio.functional.resample(a, sr, 16000)
    with torch.no_grad(): out[f] = round(float(p(a, 16000)), 2)
    print(f, out[f], flush=True)
json.dump(out, open(sys.argv[1], 'w'), indent=1)
