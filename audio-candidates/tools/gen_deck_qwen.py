"""Render the public deck with the same Qwen3-TTS designed voices as Day 1. Apache-2.0. No private text."""
import json, os, time, subprocess, torch, soundfile as sf
torch.set_num_threads(8)
from qwen_tts import Qwen3TTSModel
ROOT = "/workspace/appartement-411"
lines = json.load(open("/tmp/a411-deck-lines.json"))
WAV = ROOT + "/audio/deck-wav"; MP3 = ROOT + "/audio/deck"
os.makedirs(WAV, exist_ok=True); os.makedirs(MP3, exist_ok=True)
REF = ROOT + "/audio-candidates/qwen3-tts/wav"
design = json.load(open(ROOT + "/audio-candidates/qwen3-tts/design.json"))
need = [l for l in lines if not os.path.exists(f"{MP3}/{l['id']}.mp3")]
print("todo", len(need), "of", len(lines), flush=True)
if not need:
    raise SystemExit(0)
base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cpu", dtype=torch.float32, attn_implementation="sdpa")
prompts = {}
for who, meta in design.items():
    prompts[who] = base.create_voice_clone_prompt(ref_audio=f"{REF}/_ref_{who}.wav", ref_text=meta["ref_text"])
for l in need:
    t = time.time(); torch.manual_seed(1234)
    who = l["speaker"] if l["speaker"] in prompts else "neutral"
    w, sr = base.generate_voice_clone(text=l["tts"], language="French", voice_clone_prompt=prompts[who])
    wav = f"{WAV}/{l['id']}.wav"; sf.write(wav, w[0], sr)
    mp3 = f"{MP3}/{l['id']}.mp3"
    subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-b:a", "32k", mp3])
    print(l["id"], who, round(time.time()-t, 1), round(len(w[0])/sr, 2), flush=True)
print("done", flush=True)
