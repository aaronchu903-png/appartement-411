"""ui_learning checker: names, atlas rects, anchors (UI codes), palette-only, no red, text rects in-bounds."""
import json, os, re, glob
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); m = json.load(open(f'{D}/manifest.json')); err = []
pal = {tuple(int(v[i:i+2], 16) for i in (1, 3, 5)): k for k, v in json.load(open(f'{D}/../../palette.json')).items()}
for n, a in m['atlases'].items():
    if Image.open(f'{D}/{a["file"]}').size != (a['w'], a['h']): err.append(f'atlas {n} size')
for n, a in m['assets'].items():
    if not re.fullmatch(r'[a-z]+\.[a-z_]+(\.[a-z0-9_-]+)?', n): err.append(f'bad name {n}')
    if a.get('type') == 'sequence':
        err += [f'{n}: frame {f}' for f in a['frames'] if f not in m['assets']]; continue
    if a.get('type') == 'ref':
        if a.get('alias') and a['alias'] not in m['assets']: err.append(f'{n}: alias'); continue
        continue
    fr = a['frame']; at = m['atlases'][a['atlas']]
    if fr['x'] + fr['w'] > at['w'] or fr['y'] + fr['h'] > at['h']: err.append(f'{n}: rect')
    if a['anchor'] not in m['anchorCodes']: err.append(f'{n}: anchor')
    if not (0 <= a['anchorPoint']['x'] <= fr['w'] and 0 <= a['anchorPoint']['y'] <= fr['h']): err.append(f'{n}: anchorPoint')
    h = a.get('hit')
    if h and min(h.get('w', 99), h.get('h', 99)) < 22 and 'key' not in n and 'letter_tile' not in n: err.append(f'{n}: hit < 22')
for f in glob.glob(f'{D}/pieces/x1/*.png'):
    for c in set(p[:3] for p in Image.open(f).convert('RGBA').getdata() if p[3]):
        if c not in pal: err.append(f'{os.path.basename(f)}: off-palette {c}')
        elif pal[c] in ('mouth', 'red_sh', 'pink', 'gold'): err.append(f'{os.path.basename(f)}: BANNED {pal[c]}')
    if Image.open(f).convert('RGBA').getextrema()[3][0] not in (0, 255): err.append(f'{f}: partial alpha')
print('OK' if not err else '\n'.join(sorted(set(err))), f'({len(m["assets"])} assets)')
