"""Validates manifest.json against a411-team/tech/SPRITE_MANIFEST_FORMAT.md."""
import json, os, re
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); m = json.load(open(f'{D}/manifest.json')); err = []
for k in ('assetRoot', 'atlases', 'assets'):
    if k not in m: err.append(f'missing top-level {k}')
for n, a in m['atlases'].items():
    im = Image.open(os.path.join(D, m['assetRoot'], a['file']))
    if im.size != (a['w'], a['h']): err.append(f'atlas {n} size {im.size} != {a["w"]}x{a["h"]}')
for n, a in m['assets'].items():
    if not re.fullmatch(r'[a-z]+\.[a-z_]+(\.[a-z0-9_-]+)?', n): err.append(f'bad name {n}')
    if a.get('type') == 'sequence':
        for f in a['frames']:
            if f not in m['assets']: err.append(f'{n}: unknown frame {f}')
        if not isinstance(a.get('fps'), (int, float)): err.append(f'{n}: fps')
        continue
    if a.get('source') != 'atlas' or a.get('atlas') not in m['atlases']: err.append(f'{n}: source/atlas'); continue
    fr = a['frame']; at = m['atlases'][a['atlas']]
    if set(fr) != {'x', 'y', 'w', 'h'} or fr['x'] + fr['w'] > at['w'] or fr['y'] + fr['h'] > at['h']: err.append(f'{n}: frame rect')
    if a.get('anchor') not in ('feet', 'baseline', 'topleft'): err.append(f'{n}: anchor')
    ap = a.get('anchorPoint', {})
    if set(ap) != {'x', 'y'} or not (0 <= ap['x'] <= fr['w'] and 0 <= ap['y'] <= fr['h']): err.append(f'{n}: anchorPoint')
    if not isinstance(a.get('pixelScale'), int): err.append(f'{n}: pixelScale')
print('OK' if not err else '\n'.join(err), f'({len(m["assets"])} assets, {len(m["atlases"])} atlases)')
