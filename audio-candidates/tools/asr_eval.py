"""Intelligibility check: French ASR (faster-whisper large-v3-turbo, MIT) vs. intended text.
usage: asr_eval.py out.json 'expected text' file1.wav ...   or   asr_eval.py out.json --manifest manifest.json
manifest: [{"file":..., "text":...}]"""
import sys, json, re, unicodedata
from faster_whisper import WhisperModel
import soundfile as sf, numpy as np
from scipy.signal import resample_poly
def load16(f):
    a, sr = sf.read(f, dtype='float32', always_2d=True)
    a = a.mean(axis=1)
    from math import gcd
    g = gcd(sr, 16000)
    return resample_poly(a, 16000//g, sr//g).astype('float32') if sr != 16000 else a
def norm(s):
    s = s.lower().replace('’', "'").replace("'", ' ')
    s = re.sub(r"[^\w\s]", ' ', s)
    return s.split()
def lev(a, b):
    d = list(range(len(b)+1))
    for i, x in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            p, d[j] = d[j], min(d[j]+1, d[j-1]+1, p + (x != y))
    return d[len(b)]
out = sys.argv[1]
if sys.argv[2] == '--manifest':
    items = json.load(open(sys.argv[3]))
else:
    items = [{'file': f, 'text': sys.argv[2]} for f in sys.argv[3:]]
m = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8', cpu_threads=4)
res = []
for it in items:
    segs, info = m.transcribe(load16(it['file']), language='fr', beam_size=5, vad_filter=False, condition_on_previous_text=False, temperature=0.0)
    hyp = ' '.join(s.text.strip() for s in segs).strip()
    r, h = norm(it['text']), norm(hyp)
    wer = lev(r, h) / max(1, len(r))
    cer = lev(list(' '.join(r)), list(' '.join(h))) / max(1, len(' '.join(r)))
    row = dict(it, asr=hyp, wer=round(wer, 3), cer=round(cer, 3), exact=(r == h))
    res.append(row); print(json.dumps(row, ensure_ascii=False), flush=True)
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
