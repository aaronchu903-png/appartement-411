"""Rebuild each set's night/evening stage from the pieces + the exported light PNGs only, then diff it against the generator's stage_{v}_x1.png.
Uses: room out = clamp(src*2*mult + 2*add) on opaque px; cast: f = 1+(m-1)*0.25 (m<1) / 0.6 (m>1), add x0.6; emitters ungraded."""
import sys, os, importlib.util, numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
def load(name):
    d = f'{H}/{name}'; sys.path.insert(0, d); cwd = os.getcwd(); os.chdir(d)
    spec = importlib.util.spec_from_file_location(f'gen_{name}', f'{d}/gen_{name}.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    os.chdir(cwd); return m, d
def maps(d, v):
    M = np.asarray(Image.open(f'{d}/light/{v}_multiplier_half.png').convert('RGB')).astype(float) / 127.5
    p = f'{d}/light/{v}_add_half.png'; A = np.asarray(Image.open(p).convert('RGB')).astype(float) * 2 if os.path.exists(p) else np.zeros_like(M)
    return M, A
def g(im, M, A, cast=False):
    a = np.asarray(im).astype(float)
    f = np.where(M < 1, 1 + (M - 1) * 0.25, 1 + (M - 1) * 0.6) if cast else M
    a[..., :3] = a[..., :3] * f + A * (0.6 if cast else 1.0) * (a[..., 3:4] > 0)
    a[..., :3] = np.clip(a[..., :3], 0, 255); return Image.fromarray(a.astype('uint8'), 'RGBA')
def castlayer(m, size, cast):
    c = Image.new('RGBA', size, (0, 0, 0, 0))
    for n, x, y, fl in cast: m.put(c, n, x, y, fl, shadow=not n.startswith('croissant.sit')) if 'shadow' in m.put.__code__.co_varnames else m.put(c, n, x, y, fl)
    return c
def rebuild(name, m, d, v, sheets):
    M, A = maps(d, v)
    if name == 'kitchen':
        room = g(m.stage(v, sheets), M, A); c = g(castlayer(m, room.size, m.CAST_WIDE), M, A, True)
        if v == 'night': room.alpha_composite(sheets[v][0]['pendant_on'], (m.PENDANT_AT[0] - 4, m.PENDANT_AT[1]))
    elif name == 'rooftop':
        ims = sheets[v]; room = m.stage(v, ims, 'back'); room.alpha_composite(g(m.stage(v, ims, 'front'), M, A)); c = g(castlayer(m, room.size, m.CAST_WIDE), M, A, True)
        if v == 'night': room.alpha_composite(ims['lights_on'], m.STRAND_AT)
    else:
        ims = sheets[v]; room = g(m.stage(v, ims), M, A); c = g(castlayer(m, room.size, m.CAST_WIDE), M, A, True); m.emitters(v, ims, room)
    room.alpha_composite(c); return room
for name in ('kitchen', 'rooftop', 'stairwell'):
    m, d = load(name); os.chdir(d); sheets = m.build(); os.chdir(H)
    for v in ('evening', 'night'):
        r = np.asarray(rebuild(name, m, d, v, sheets)).astype(int); ref = np.asarray(Image.open(f'{d}/stage_{v}_x1.png').convert('RGBA')).astype(int)
        diff = np.abs(r - ref).max(); n = int((np.abs(r - ref).max(2) > 0).sum())
        line = f'{name:9s} {v:7s} max diff {diff}  px differing {n}'
        if v == 'night' and os.path.exists(f'{d}/light/night_add_half.png'):
            a = np.asarray(Image.open(f'{d}/light/night_add_half.png').convert('RGB')).astype(int) * 2; nz = np.argwhere(a.max(2) > 0)
            line += f'  | add max {a.max()} (decoded), nonzero px {len(nz)}, bbox x{nz[:,1].min()}-{nz[:,1].max()} y{nz[:,0].min()}-{nz[:,0].max()}'
        print(line)
