"""Qwen3-TTS (Apache-2.0): voices designed from a text description (VoiceDesign 1.7B) -> fixed by cloning that
synthetic reference with the Base 1.7B model so every line uses the same voice. No real person's voice is used."""
import json, time, torch, soundfile as sf, os
torch.set_num_threads(8)
from qwen_tts import Qwen3TTSModel
OUT = '/workspace/appartement-411/audio-candidates/qwen3-tts/wav'; os.makedirs(OUT, exist_ok=True)
lines = json.load(open('/workspace/appartement-411/audio-candidates/lines.json'))
DESIGN = {
 'camille': ("Une jeune femme française de 25 ans, accent parisien standard, voix claire, chaleureuse et amicale, débit naturel et articulé, ton détendu de colocataire.",
             "Salut ! Je m'appelle Camille. Tu t'appelles comment ? Ta plante a soif."),
 'noe': ("Un jeune homme français de 23 ans, accent parisien standard, voix douce et un peu timide, légèrement grave, débit naturel et articulé.",
         "Salut ! Je m'appelle Noé. Tu t'appelles comment ? Ta plante a soif."),
 'neutral': ("Une femme française de 40 ans, accent standard de France, voix neutre et posée de présentatrice, très bien articulée, débit modéré.",
             "Bonjour ! Je m'appelle Léa. Tu t'appelles comment ? C'est ta plante."),
}
refs = {}
vd = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cpu", dtype=torch.float32, attn_implementation="sdpa")
for who, (ins, txt) in DESIGN.items():
    p = f'{OUT}/_ref_{who}.wav'
    if who in ('camille', 'noe') and os.path.exists(f'/home/box/tts/screen/qwenvd_{who}.wav'):
        import shutil; shutil.copy(f'/home/box/tts/screen/qwenvd_{who}.wav', p)
    else:
        torch.manual_seed(7); w, sr = vd.generate_voice_design(text=txt, language="French", instruct=ins); sf.write(p, w[0], sr)
    refs[who] = (p, txt)
del vd
base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cpu", dtype=torch.float32, attn_implementation="sdpa")
prompts = {who: base.create_voice_clone_prompt(ref_audio=p, ref_text=t) for who, (p, t) in refs.items()}
for l in lines:
    t = time.time(); torch.manual_seed(1234)
    w, sr = base.generate_voice_clone(text=l['tts'], language="French", voice_clone_prompt=prompts[l['speaker']])
    sf.write(f"{OUT}/{l['id']}.wav", w[0], sr)
    print(l['id'], l['speaker'], round(time.time() - t, 1), round(len(w[0]) / sr, 2), flush=True)
json.dump({k: {'instruct': DESIGN[k][0], 'ref_text': DESIGN[k][1]} for k in DESIGN}, open(f'{OUT}/../design.json', 'w'), ensure_ascii=False, indent=1)
