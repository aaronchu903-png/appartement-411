"""Transcribe deck mp3s with faster-whisper and flag mismatches. No private text."""
import json, re, sys
from pathlib import Path
from faster_whisper import WhisperModel
root = Path('/workspace/appartement-411')
lines = {x['id']: x['tts'] for x in json.loads(Path('/tmp/a411-deck-lines.json').read_text())}
mp3s = sorted((root/'audio/deck').glob('*.mp3'))
import numpy as np, subprocess
model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
def load(path):
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar','16000','-'])
    return np.frombuffer(raw, dtype=np.float32)
def norm(s):
    s = s.lower().replace('’', "'").replace('œ', 'oe')
    s = re.sub(r"[^a-z0-9' àâäéèêëïîôùûüç-]", ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
bad = []
for i, p in enumerate(mp3s, 1):
    segs, _ = model.transcribe(load(p), language='fr', vad_filter=False)
    hyp = norm(' '.join(s.text for s in segs))
    ref = norm(lines.get(p.stem, ''))
    ok = hyp == ref or (ref and (ref in hyp or hyp in ref))
    if not ok:
        bad.append((p.stem, ref, hyp))
        print('MISS', p.stem, '|', ref, '|', hyp, flush=True)
    elif i % 20 == 0:
        print('ok', i, flush=True)
print('checked', len(mp3s), 'miss', len(bad))
Path('/tmp/a411-deck-asr.json').write_text(json.dumps([{'id':a,'ref':b,'hyp':c} for a,b,c in bad], ensure_ascii=False, indent=1))
sys.exit(1 if bad else 0)
