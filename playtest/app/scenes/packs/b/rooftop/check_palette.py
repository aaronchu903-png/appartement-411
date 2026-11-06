"""Rooftop set: every opaque pixel of the x1 sheets must be in ../../palette.json (stage_*_x1 shadows are wood @ alpha 90, excluded)."""
import json, glob, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); pal = {v.lower() for v in json.load(open(f'{D}/../../palette.json')).values()} | {'#a9c8dc'}   # + sky (STYLE_GUIDE §2), in case palette.json lacks it
used, bad = set(), set()
for f in glob.glob(f'{D}/rooftop_*_sheet.png'):
    for n, c in Image.open(f).convert('RGBA').getcolors(1 << 20):
        if c[3] == 255: h = '#%02x%02x%02x' % c[:3]; (used if h in pal else bad).add(h)
print(f'palette {len(pal)}; used {len(used)}; off-palette: {sorted(bad) or "none"}')
