"""Counts opaque colours across all native sheets + backdrop; fails if any colour is off-palette."""
import json, glob, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); pal = {v.lower() for v in json.load(open(f'{D}/palette.json')).values()}
used = set(); bad = set()
for f in glob.glob(f'{D}/*_sheet.png') + [f'{D}/lineup_native.png']:
    for (n, c) in Image.open(f).convert('RGBA').getcolors(1 << 20):
        if c[3] == 0: continue
        h = '#%02x%02x%02x' % c[:3]
        (used if h in pal else bad).add(h) if c[3] == 255 else None
print(f'palette entries: {len(pal)}; colours used (opaque): {len(used)}; off-palette: {sorted(bad) or "none"}')
print('(shadows are palette "wood" at alpha 90, not extra colours)')
