"""Sitcom Days 11-17 add-on pack (style B, canonical 28-colour palette). Own code art, $0.
Does NOT regenerate or edit the approved kitchen / stairwell / canonical outputs: imports their drawing code only.
Writes: this dir (sheets, manifest.json, pieces/x1, review_x8, composites/) + kitchen/light/rain_day_* + stairwell/light/rain_day_* (new files only)."""
import os, sys, json, re, importlib.util
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); SETS = os.path.join(D, '..'); CAN = os.path.join(SETS, '..')
sys.path.insert(0, os.path.join(SETS, 'kitchen')); sys.path.insert(0, os.path.join(SETS, 'stairwell'))
import gen_kitchen as K
import gen_stairwell as S
PAL = json.load(open(f'{CAN}/palette.json')); assert len(PAL) == 28
def C(k): h = PAL[k]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
class L:
    def __init__(s, w, h): s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    def r(s, x0, y0, x1, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.im.putpixel((x, y), C(k))
        return s
    def p(s, pts, k):
        for x, y in pts: s.im.putpixel((x, y), C(k))
        return s

# ---------------- canonical rig (in memory only; source patched to add Inès) ----------------
src = open(f'{CAN}/gen_canonical.py').read().split('# ---------- sheets')[0]
INES = '''
def ines():  # visiting baker: wood-brown chin bob + side tail, pink clip, wall_sh shirt, long sky (zinc-blue) apron to the knee, ink trousers
    H = L().r(4,4,11,9,'skin').r(5,10,10,10,'skin').p([(4,9),(11,9)],'skin_sh')
    H.r(5,1,10,1,'wood').r(4,2,12,3,'wood').r(3,3,3,9,'wood').r(12,4,12,9,'wood').r(4,4,11,4,'wood').p([(4,5),(5,5),(6,5),(4,6)],'wood')
    H.p([(13,3),(13,4),(14,4),(14,5),(14,6)],'wood').p([(11,2),(12,2)],'pink')
    B = L().r(4,11,11,15,'wall_sh').r(5,12,10,15,'sky').p([(5,11),(10,11)],'sky').p([(7,11),(8,11)],'skin').p([(10,14),(10,15)],'grey')
    G = L().r(4,16,11,18,'sky').p([(4,18),(11,18),(10,16),(10,17)],'grey').r(5,19,6,21,'ink').r(9,19,10,21,'ink').r(4,22,6,22,'dark').r(9,22,11,22,'dark')
    return dict(head=H.im, body=B.im, legs=G.im, sl=3, sr=12, top=11, sleeve='wall_sh', e=6, extra={}, hip=16)
'''
src = src.replace("CHARS = {'noe'", INES + "CHARS = {'ines': ines(), 'noe'")
src = src.replace("'lefevre': ('plum_sh', 'plum_sh', 'skin_sh')}", "'lefevre': ('plum_sh', 'plum_sh', 'skin_sh'), 'ines': ('sky', 'grey', 'ink')}")
G = {'__name__': 'canon_mem', '__file__': f'{CAN}/gen_canonical.py'}; exec(compile(src, 'gen_canonical(mem)', 'exec'), G)
FR, SEQ, HANDS, SEATS = G['frames'], G['seqs'], G['hands'], G['seats']
CANMAN = json.load(open(f'{CAN}/manifest.json'))
for n in CANMAN['assets']:   # guard: in-memory rebuild of existing cast must match the approved sheets pixel for pixel
    a = CANMAN['assets'][n]
    if a.get('source') == 'atlas' and n in FR:
        f = a['frame']; sh = Image.open(f"{CAN}/{CANMAN['atlases'][a['atlas']]['file']}").convert('RGBA').crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        assert np.array_equal(np.asarray(sh), np.asarray(FR[n])), n
ines_fr = {n: im for n, im in FR.items() if n.startswith('ines.')}
# Inès extra: holding the bakery bag (hold pose, right hand)
# ---------------- props (x1, drawn bottom-row = resting surface) ----------------
def spoon():    return L(3, 8).r(0, 0, 2, 2, 'wood').p([(1, 1)], 'ink').r(1, 3, 1, 7, 'wood').im
def pot():      return (L(11, 7).r(1, 2, 9, 6, 'mouth').r(1, 6, 9, 6, 'red_sh').r(8, 2, 9, 5, 'red_sh').r(2, 1, 8, 1, 'mouth').r(4, 0, 6, 0, 'dark')
                        .p([(0, 3), (10, 3)], 'dark').p([(3, 3), (3, 4)], 'pink').im)
def pot_steam(): return L(11, 11).p([(3, 0), (4, 1), (3, 2), (6, 1), (7, 2), (6, 3)], 'white').im  # optional 11x4 above-pot puff (no glow), pasted at pot top
def sugar():    return L(5, 4).r(0, 1, 4, 3, 'white').r(4, 1, 4, 3, 'silver').r(1, 3, 3, 3, 'silver').p([(1, 0), (3, 0)], 'white').p([(2, 0)], 'silver').im
def flour():    return (L(6, 8).r(0, 2, 5, 7, 'cream').r(5, 2, 5, 7, 'wall_sh').r(0, 7, 5, 7, 'wall_sh').r(1, 0, 4, 1, 'cream').p([(2, 1), (4, 0)], 'wall_sh')
                        .r(1, 4, 3, 4, 'white').im)
def tray():     return L(16, 3).r(0, 1, 15, 1, 'wood').r(1, 2, 14, 2, 'ink').p([(0, 0), (15, 0)], 'wood').im
def kouign():   return (L(7, 3).r(1, 0, 5, 0, 'gold').r(0, 1, 6, 1, 'orange').r(0, 2, 6, 2, 'orange_sh').p([(2, 0), (4, 1)], 'orange').p([(1, 1), (5, 1)], 'gold')
                        .p([(0, 2), (6, 2)], 'red_sh').im)
def kouign_part(): return L(4, 3).r(0, 0, 2, 0, 'gold').r(0, 1, 3, 1, 'orange').r(0, 2, 3, 2, 'orange_sh').p([(3, 2)], 'red_sh').p([(1, 1)], 'gold').im
def pastry():   return L(5, 3).r(1, 0, 3, 0, 'gold').r(0, 1, 4, 1, 'orange').p([(0, 2), (4, 2)], 'orange_sh').p([(2, 1)], 'orange_sh').im
def painchoc(): return L(5, 3).r(0, 0, 4, 2, 'gold').r(0, 2, 4, 2, 'orange_sh').p([(0, 1), (4, 1)], 'ink').im
def knife():    return L(7, 2).r(0, 0, 4, 0, 'silver').r(1, 1, 4, 1, 'grey').r(5, 0, 6, 1, 'wood').im
def onion():    return L(4, 5).p([(1, 0)], 'orange_sh').r(0, 1, 3, 4, 'gold').r(3, 1, 3, 4, 'orange_sh').p([(1, 2)], 'cream').im
def jam():      return L(3, 4).r(0, 0, 2, 0, 'gold').r(0, 1, 2, 3, 'red_sh').p([(0, 2)], 'pink').im
def toast():    return L(6, 4).r(0, 2, 5, 2, 'white').r(1, 3, 4, 3, 'silver').r(1, 0, 4, 1, 'gold').p([(1, 0), (4, 0)], 'orange_sh').p([(2, 1), (3, 1)], 'mouth').im
def envelope(): return (L(7, 5).r(0, 0, 6, 4, 'cream').r(0, 4, 6, 4, 'wall_sh').p([(0, 0), (1, 1), (2, 2), (3, 2), (4, 2), (5, 1), (6, 0)], 'wall_sh')
                        .p([(1, 3), (2, 3), (4, 3)], 'navy').im)
def card():     return L(5, 6).r(0, 0, 4, 5, 'cream').r(4, 0, 4, 5, 'wall_sh').p([(1, 1), (2, 1), (1, 3), (2, 3), (3, 3)], 'navy').p([(1, 4)], 'grey').im
def phone():    return L(4, 6).r(0, 0, 3, 5, 'dark').r(1, 1, 2, 4, 'sky').im
def teabox(k):  return lambda: L(4, 5).r(0, 0, 3, 4, k).r(3, 0, 3, 4, {'green': 'green_sh', 'plum': 'plum_sh', 'gold': 'orange_sh'}[k]).r(1, 2, 2, 2, 'cream').im
def box_open(): return (L(13, 7).r(0, 0, 2, 1, 'floor_sh').r(10, 0, 12, 1, 'floor_sh').r(0, 2, 12, 6, 'floor').r(11, 2, 12, 6, 'floor_sh').r(1, 2, 10, 2, 'ink')
                        .r(4, 4, 8, 4, 'wall_sh').im)
def box_front(): b = box_open(); f = Image.new('RGBA', b.size, (0, 0, 0, 0)); f.paste(b.crop((0, 3, 13, 7)), (0, 3)); return f   # front wall only: draw after a cat sitting in the box
def towel_fold(): return L(6, 3).r(0, 0, 5, 2, 'white').r(0, 1, 5, 1, 'sky').r(5, 0, 5, 2, 'silver').im
def towel_hang(): return L(5, 9).r(0, 0, 4, 8, 'white').r(0, 2, 4, 2, 'sky').r(0, 6, 4, 6, 'sky').r(4, 0, 4, 8, 'silver').im
def cushion():  return L(7, 3).r(1, 0, 5, 0, 'pink').r(0, 1, 6, 1, 'pink').r(0, 2, 6, 2, 'plum').p([(3, 1)], 'plum_sh').im
def puddle():   return L(12, 2).r(2, 0, 9, 0, 'sky').r(0, 1, 11, 1, 'sky').p([(4, 0), (7, 1)], 'white').im
def paperbag(): return L(5, 7).r(0, 1, 4, 6, 'wall_sh').r(0, 0, 4, 0, 'floor').r(4, 1, 4, 6, 'floor').p([(1, 3), (2, 3)], 'cream').im
def bottle():   return L(3, 9).r(1, 0, 1, 2, 'green_sh').r(0, 3, 2, 8, 'green_sh').r(0, 5, 2, 6, 'cream').p([(0, 4)], 'green').im
PROPS = [  # id, fn, kind (handprop = carried/table; prop = floor/surface piece), handPoint (None = centre-top)
 ('handprop.spoon_wood', spoon, (1, 6)), ('handprop.soup_pot', pot, (0, 3)), ('handprop.sugar_bowl', sugar, None), ('handprop.flour_bag', flour, (2, 4)),
 ('handprop.tray', tray, (0, 1)), ('handprop.kouign_amann', kouign, None), ('handprop.kouign_part', kouign_part, None), ('handprop.pastry_croissant', pastry, None),
 ('handprop.pain_choc', painchoc, None), ('handprop.knife', knife, (5, 0)), ('handprop.onion', onion, None), ('handprop.jam_jar', jam, None),
 ('handprop.toast_plate', toast, None), ('handprop.envelope', envelope, (3, 2)), ('handprop.card', card, (2, 3)), ('handprop.phone', phone, (1, 3)),
 ('handprop.tea_green', teabox('green'), None), ('handprop.tea_plum', teabox('plum'), None), ('handprop.tea_gold', teabox('gold'), None),
 ('handprop.towel_folded', towel_fold, (3, 1)), ('handprop.towel_hang', towel_hang, (2, 0)), ('handprop.paper_bag', paperbag, (2, 0)), ('handprop.wine_bottle', bottle, (1, 3)),
 ('prop.cushion', cushion, None), ('prop.box_open', box_open, None), ('prop.box_front', box_front, None), ('prop.puddle', puddle, None)]
props = {n: f() for n, f, _ in PROPS}
# ---------------- overlays ----------------
apron = L(16, 24).r(5, 13, 10, 18, 'white').r(5, 15, 10, 15, 'sky').r(4, 13, 11, 13, 'white').p([(10, 16), (10, 17), (10, 18)], 'silver').p([(11, 14), (12, 15)], 'white').im  # tea-towel tucked into the waistband, knot end at right hip
apron_sit = apron.crop((0, 0, 16, 16)); apron_sit = (lambda a: (a.paste(Image.new('RGBA', (16, 1), (0, 0, 0, 0)), (0, 15)), a)[1])(Image.new('RGBA', (16, 24), (0, 0, 0, 0)))
apron_sit.alpha_composite(apron.crop((0, 0, 16, 16))); apron_sit.paste(Image.new('RGBA', (16, 9), (0, 0, 0, 0)), (0, 15)); L_ = L(16, 24); apron_sit.alpha_composite(L_.r(4, 15, 11, 15, 'white').p([(5, 15), (10, 15)], 'sky').im)
tears = L(16, 24).p([(5, 7), (5, 8), (10, 7), (10, 8)], 'sky').im
flour_noe = L(16, 24).p([(5, 9), (6, 10), (9, 5), (7, 13), (8, 12), (4, 15)], 'white').im
CW, CH = 14, 12
def cat_lie(face='neutral'):   # loaf / curled lying: head lowered 3 px, body flat on rows 8-10, tail wrapped along the floor row 10; same cat pixels as croissant.stand
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); im.alpha_composite(G['cshadow'])
    im.alpha_composite(L(CW, CH).r(2, 8, 10, 10, 'orange').p([(3, 9), (5, 9), (7, 9), (9, 9)], 'orange_sh').p([(10, 8)], 'orange_sh').im)
    im.alpha_composite(L(CW, CH).r(9, 10, 13, 10, 'orange').p([(12, 9), (13, 10)], 'orange_sh').im)
    hd = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); hd.alpha_composite(G['CHd']); hd.alpha_composite(G['CFACE'][face])
    im.alpha_composite(G['shift'](hd, 0, 3)); return im
cat_flour = L(CW, CH).p([(3, 5), (6, 6), (5, 8), (8, 9), (2, 7)], 'white').im
OVER = {'noe.overlay.apron_towel': apron, 'noe.overlay.apron_towel_sit': apron_sit, 'noe.overlay.tears': tears, 'noe.overlay.flour': flour_noe,
        'croissant.pose.lie': cat_lie(), 'croissant.pose.sleep': cat_lie('blink'), 'croissant.overlay.flour': cat_flour}

# ---------------- atlases + manifest ----------------
def pack(ims, W):
    x = y = rowh = 0; pos = {}
    for n, im in sorted(ims.items(), key=lambda t: (-t[1].height, t[0])):
        if x + im.width > W: x, y, rowh = 0, y + rowh + 1, 0
        pos[n] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
    sh = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for n, (a, b) in pos.items(): sh.alpha_composite(ims[n], (a, b))
    return sh, pos
man = {'assetRoot': '', 'atlases': {}, 'assets': {}, 'note': 'Sitcom Days 11-17 add-on pack. Props are variant-free (graded in code with the room light like kitchen cup/plate/milk); see SITCOM_D11_17_NOTES.md'}
psheet, ppos = pack(props, 96); psheet.save(f'{D}/sitcom_props_sheet.png'); man['atlases']['sitcom_props'] = {'file': 'sitcom_props_sheet.png', 'w': psheet.width, 'h': psheet.height}
os.makedirs(f'{D}/pieces/x1', exist_ok=True); os.makedirs(f'{D}/pieces/x8', exist_ok=True)
for n, f, hp in PROPS:
    im = props[n]; w, h = im.size
    a = {'source': 'atlas', 'atlas': 'sitcom_props', 'frame': {'x': ppos[n][0], 'y': ppos[n][1], 'w': w, 'h': h}, 'anchor': 'baseline', 'anchorPoint': {'x': w // 2, 'y': h - 1}, 'pixelScale': 1, 'depth': 5 if n.startswith(('handprop', 'fx')) else 3}
    if hp: a['handPoint'] = {'x': hp[0], 'y': hp[1]}
    fn = n.split('.')[1]; a['file'] = f'pieces/x1/{fn}.png'; man['assets'][n + '.any'] = a
    im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((w * 8, h * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
# Inès + overlays
names = [n for n in ines_fr if n not in SEATS] + [n for n in ines_fr if n in SEATS]
cols = 8; rows = -(-len(names) // cols); ish = Image.new('RGBA', (cols * 16, rows * 24), (0, 0, 0, 0)); man['atlases']['ines'] = {'file': 'ines_sheet.png', 'w': cols * 16, 'h': rows * 24}
for i, n in enumerate(names):
    x, y = (i % cols) * 16, (i // cols) * 24; ish.alpha_composite(ines_fr[n], (x, y))
    a = {'source': 'atlas', 'atlas': 'ines', 'frame': {'x': x, 'y': y, 'w': 16, 'h': 24}, 'anchor': 'feet', 'anchorPoint': {'x': 8, 'y': 23}, 'pixelScale': 1}
    if n in HANDS: a['handPoint'] = {'x': HANDS[n][0], 'y': HANDS[n][1]}
    if n in SEATS: a['seatPoint'] = {'x': 8, 'y': 16}
    man['assets'][n] = a
ish.save(f'{D}/ines_sheet.png')
for s, (fr, fps) in SEQ.items():
    if s.startswith('ines.'): man['assets'][s] = {'type': 'sequence', 'frames': fr, 'fps': fps}
oims = list(OVER.items()); osh = Image.new('RGBA', (16 * len(oims), 24), (0, 0, 0, 0)); man['atlases']['sitcom_overlays'] = {'file': 'sitcom_overlays_sheet.png', 'w': osh.width, 'h': 24}
for i, (n, im) in enumerate(oims):
    osh.alpha_composite(im, (i * 16, 0)); cat = n.startswith('croissant')
    a = {'source': 'atlas', 'atlas': 'sitcom_overlays', 'frame': {'x': i * 16, 'y': 0, 'w': im.width, 'h': im.height}, 'anchor': 'feet', 'anchorPoint': {'x': 6, 'y': 11} if cat else {'x': 8, 'y': 23}, 'pixelScale': 1}
    if 'overlay' in n: a['layerOver'] = n.split('.')[0] + ('.stand / sit poses (rows 0-15 only)' if n.endswith('_sit') else '.stand / idle / walk / talk frames, same 16x24 (cat 14x12) registration')
    man['assets'][n] = a; im.save(f'{D}/pieces/x1/{n.replace(".", "_")}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{n.replace(".", "_")}_x8.png')
osh.save(f'{D}/sitcom_overlays_sheet.png')
for f in ('ines_sheet', 'sitcom_overlays_sheet', 'sitcom_props_sheet'):
    im = Image.open(f'{D}/{f}.png'); bg = Image.new('RGBA', im.size, C('wall')); bg.alpha_composite(im); bg.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/review_{f}_x8.png')

# ---------------- rain grade (day): multiply + add maps, Soir encoding; windows get an ungraded streak overlay ----------------
H_ST, W_ST = 144, 192; yy, xx = np.indices((H_ST, W_ST)).astype(float)
def rain_maps(win, reflect_x, soft=False):
    M = np.ones((H_ST, W_ST, 3)) * np.array([0.82, 0.86, 0.94]); A = np.zeros((H_ST, W_ST, 3))
    flo = yy >= 128
    M[flo] = np.array([0.74, 0.79, 0.88])                                   # wet floor: darker, cooler
    if soft:   # kitchen rev2: two broken low-strength strips under the window + very sparse drips (rev1 read as a ladder + gravel)
        band = flo & np.isin(yy - 128, [3, 6]) & (np.abs(xx - reflect_x) <= 11 - (yy - 128)) & (((xx // 3) % 3) != 0)
        A[band] = np.array([16, 20, 26])
        gl = flo & (((xx * 7 + yy * 13) % 89) == 0) & (yy >= 131)
        A[gl] = np.array([14, 16, 20])
    else:
        band = flo & (((yy - 128) % 3) == 1) & (np.abs(xx - reflect_x) <= 13 - (yy - 128) * 0.5)   # window reflection: striped, narrowing toward camera
        A[band] = np.array([34, 44, 54])
        gl = flo & (((xx * 3 + yy * 7) % 23) == 0)                              # sparse wet glints across the boards / tomettes
        A[gl] = np.array([26, 30, 36])
    x0, y0, x1, y1 = win; M[y0:y1 + 1, x0:x1 + 1] = 1.0; A[y0:y1 + 1, x0:x1 + 1] = 0
    M = np.floor(np.clip(M, 0, 1.2) * 127.5) / 127.5; A = 2 * np.floor(np.clip(A, 0, 254) / 2); return M, A
def write_rain(room_dir, M, A, meta):
    os.makedirs(room_dir, exist_ok=True)
    Image.fromarray((M * 127.5).round().astype('uint8'), 'RGB').save(f'{room_dir}/rain_day_multiplier_half.png')
    Image.fromarray((A / 2).astype('uint8'), 'RGB').save(f'{room_dir}/rain_day_add_half.png')
    json.dump(meta, open(f'{room_dir}/rain.json', 'w'), indent=1)
def streaks(win_im, pane):   # pane: (x0,y0,x1,y1) local; overcast + diagonal rain streaks + drops, only where the pane is not frame wood
    o = Image.new('RGBA', win_im.size, (0, 0, 0, 0)); px = win_im.load()
    for y in range(pane[1], pane[3] + 1):
        for x in range(pane[0], pane[2] + 1):
            c = px[x, y]
            if c == C('wood'): continue
            k = None
            if c == C('sky'): k = 'silver'
            elif c == C('white'): k = 'grey'
            if k and (x * 2 + y) % 7 == 0 and y % 4 != 3: k = 'sky'      # streaks only over the sky part (no marks on facades/roofs: avoids glyph-like noise)
            if k and (x * 5 + y * 3) % 23 == 0: k = 'white'
            if k: o.putpixel((x, y), C(k))
    return o
kd = {n: K.piece(n, 'day') for n in K.PIECES}; ksheets = {'day': (kd, None)}
sd = {n: S.piece(n, 'day') for n in S.PIECES}
KM, KA = rain_maps(K.WIN, 46, soft=True); SM, SA = rain_maps(S.WIN, 133)
k_streak = streaks(kd['window'], (2, 2, 25, 20)); s_streak = streaks(sd['window'], (2, 2, 19, 25))
k_streak.save(f'{SETS}/kitchen/light/rain_window_overlay.png'); s_streak.save(f'{SETS}/stairwell/light/rain_window_overlay.png')
k_streak.save(f'{D}/pieces/x1/rain_kitchen_window.png'); s_streak.save(f'{D}/pieces/x1/rain_stairwell_window.png')
meta = lambda room, win, wx, wy: {'variant': 'rain_day', 'base': 'day pieces', 'maps': {'multiply': 'rain_day_multiplier_half.png (decode: value*2/255)', 'add': 'rain_day_add_half.png (decode: value*2)'},
    'rule': 'Soir rule: room out = clamp(src*M + A); cast f = 1+(M-1)*0.25 where M<1 (0.6 where M>1), add x0 (rain add = wet-floor sheen, room only); handprops graded like the room; window pane UNGRADED',
    'windowOverlay': {'file': 'rain_window_overlay.png', 'x': wx, 'y': wy, 'note': 'draw over the ungraded window piece, also ungraded: overcast pane + diagonal streaks + drops'},
    'shape': 'overcast cool multiply (0.82,0.86,0.94); wet floor rows>=128 multiply (0.74,0.79,0.88) + striped window reflection add (34,44,54) narrowing toward camera + sparse glints add (26,30,36)',
    'window': {'x': win[0], 'y': win[1], 'w': win[2] - win[0] + 1, 'h': win[3] - win[1] + 1}, 'notANewSet': True, 'verify': 'sets/sitcom_d11_17/verify_rain.py'}
km = meta('kitchen', K.WIN, 32, 80); km['shape'] = 'rev2 (kitchen): overcast cool multiply (0.82,0.86,0.94); wet floor rows>=128 multiply (0.74,0.79,0.88) + add: two broken reflection strips (rows 131,134, 2-of-3 px on, narrowing) at (16,20,26) under the window + very sparse drips (14,16,20)'; write_rain(f'{SETS}/kitchen/light', KM, KA, km); write_rain(f'{SETS}/stairwell/light', SM, SA, meta('stairwell', S.WIN, 122, 48))
man.setdefault('files', {})['light.rain_kitchen.day'] = {'source': 'file', 'file': '../kitchen/light/rain.json', 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'pixelScale': 1, 'note': 'rain grade maps (not a set)'}
man['files']['light.rain_stairwell.day'] = {'source': 'file', 'file': '../stairwell/light/rain.json', 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'pixelScale': 1}
man['files']['fx.rain_window_kitchen.any'] = {'source': 'file', 'file': 'pieces/x1/rain_kitchen_window.png', 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'pixelScale': 1, 'at': {'x': 32, 'y': 80}}
man['files']['fx.rain_window_stairwell.any'] = {'source': 'file', 'file': 'pieces/x1/rain_stairwell_window.png', 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'pixelScale': 1, 'at': {'x': 122, 'y': 48}}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)

# ---------------- scenes + composites ----------------
def frame(n):
    if n in man['assets'] and man['assets'][n].get('atlas') in ('ines', 'sitcom_overlays'):
        return (ines_fr[n] if n.startswith('ines.') else OVER[n]), man['assets'][n]
    return K.frame(n)[0], CANMAN['assets'][n]
SHADOW = Image.new('RGBA', (9, 1), C('wood')[:3] + (90,))
def put(s, n, x, y, flip=False, overlays=(), seat=False, shadow=True):
    im, a = frame(n); im = im.copy()
    for o in overlays: im.alpha_composite(OVER[o])
    ap = a['seatPoint'] if seat else a['anchorPoint']; ax = ap['x']
    if seat: im = Image.fromarray(np.where((np.asarray(im)[..., 3:4] < 255), 0, np.asarray(im)).astype('uint8'), 'RGBA')   # drop the floor shadow when seated on a step
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT); ax = im.width - 1 - ax
    if shadow and not seat: s.alpha_composite(SHADOW, (x - 4, y + 1))
    s.alpha_composite(im, (x - ax, y - ap['y']))
def prop(s, n, x, y):   # baseline anchor: (x, y) = centre of the bottom row
    im = props[n]; s.alpha_composite(im, (x - im.width // 2, y - im.height + 1))
def grade(im, M, room=True, A=None):   # rain: cast takes the multiply (x0.25 rule) but NOT the add -- the add map is floor sheen only (else it paints a bar across shins)
    return K.grade(im, M, 1.0, A) if room else K.grade(im, M, 0.25, A, 0.0)
def layer(): return Image.new('RGBA', (W_ST, H_ST), (0, 0, 0, 0))
def portrait(sc, Kx, cam, name):
    W, H = -(-1080 // Kx), -(-1056 // Kx)
    view = sc.crop((cam[0], cam[1], cam[0] + W, cam[1] + H)).resize((W * Kx, H * Kx), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), sc.getpixel((cam[0] + W // 2, max(cam[1] - 4, 2)))); out.alpha_composite(view, (0, 288))
    fc = sc.getpixel((cam[0] + 1, 143)); out.alpha_composite(Image.new('RGBA', (1080, 576), tuple(int(c * 0.55) for c in fc[:3]) + (255,)), (0, 1344))
    os.makedirs(f'{D}/composites', exist_ok=True); out.convert('RGB').save(f'{D}/composites/{name}.png'); return out
def kitchen(rain=False):
    room = K.stage('day', ksheets); return room
KCOUNTER = 117   # counter top: bottom row of a prop standing on it
def k_props_scene():   # 1: props in the kitchen, day (medium 12x); Noé in the towel-apron with flour, Camille, cat asleep under the table end
    room = kitchen(); pr = layer(); cast = layer()
    prop(pr, 'handprop.flour_bag', 34, KCOUNTER); prop(pr, 'handprop.sugar_bowl', 40, KCOUNTER); prop(pr, 'handprop.soup_pot', 63, KCOUNTER); prop(pr, 'handprop.spoon_wood', 69, KCOUNTER)
    prop(pr, 'handprop.knife', 99, 119); prop(pr, 'handprop.onion', 104, 119)
    prop(pr, 'handprop.tray', 113, 119); prop(pr, 'handprop.kouign_amann', 109, 118); prop(pr, 'handprop.jam_jar', 114, 118); prop(pr, 'handprop.toast_plate', 119, 118)
    prop(pr, 'handprop.tea_green', 93, 98); prop(pr, 'handprop.tea_plum', 97, 98); prop(pr, 'handprop.envelope', 126, 119)
    put(cast, 'camille.stand', 84, K.FEET); put(cast, 'noe.stand', 52, K.FEET, overlays=('noe.overlay.apron_towel', 'noe.overlay.flour'))
    cast.alpha_composite(OVER['croissant.pose.sleep'], (100 - 6, K.FEET - 11))
    room.alpha_composite(pr); room.alpha_composite(cast); return room
def k_ines_scene():
    room = kitchen(); cast = layer(); pr = layer()
    put(cast, 'camille.stand', 96, K.FEET); put(cast, 'noe.stand', 110, K.FEET, flip=True); put(cast, 'ines.stand', 126, K.FEET, flip=True)
    prop(pr, 'handprop.paper_bag', 120, 133)   # Inès's near hand (hand row 15-16 of the 16x24 frame -> stage y 128)
    room.alpha_composite(cast); room.alpha_composite(pr); return room
STX, STY = 112, 51   # stairs top-left (anchor (2,79) at (114,130))
def tread(i): return STX + 4 + 6 * i, STY + 75 - 5 * i   # (left x, tread top y) of step i
def s_stairs_scene(rain=False):   # rev2: Lefèvre stands ON step 0 (feet on the tread), her cushion waits one step higher on step 2, cat fully in frame on the landing
    room = S.stage('day', sd); cast = layer(); pr = layer()
    x, ty = tread(2); prop(pr, 'prop.cushion', x + 3, ty - 1)
    x0, t0 = tread(0); put(cast, 'lefevre.stand', x0 + 3, t0 - 1, flip=True)
    put(cast, 'noe.stand', 93, S.FEET); put(cast, 'croissant.stand', 106, S.FEET, flip=True)
    room.alpha_composite(pr); room.alpha_composite(cast); return room
def rain_kitchen():
    room = grade(kitchen(), KM, True, KA); cast = layer(); pr = layer()
    put(cast, 'noe.stand', 60, K.FEET, overlays=('noe.overlay.apron_towel',)); put(cast, 'camille.stand', 76, K.FEET, flip=True)
    prop(pr, 'handprop.soup_pot', 63, KCOUNTER)
    room.alpha_composite(K.grade(pr, KM, 1.0, KA)); room.alpha_composite(grade(cast, KM, False, KA)); room.alpha_composite(k_streak, (32, 80)); return room
def rain_stair():
    room = S.stage('day', sd); room = grade(room, SM, True, SA); S.emitters('day', sd, room); room.alpha_composite(s_streak, (122, 48))
    cast = layer(); pr = layer(); prop(pr, 'prop.puddle', 92, 137); prop(pr, 'handprop.towel_hang', 104, 121)
    put(cast, 'noe.stand', 92, S.FEET, overlays=('noe.overlay.tears',)); put(cast, 'ines.stand', 124, S.FEET, flip=True)
    room.alpha_composite(K.grade(pr, SM, 1.0, SA)); room.alpha_composite(grade(cast, SM, False, SA)); return room
x1 = {'kitchen_props_day': k_props_scene(), 'kitchen_ines_day': k_ines_scene(), 'stairs_cushion_day': s_stairs_scene(), 'kitchen_rain_day': rain_kitchen(), 'stairwell_rain_day': rain_stair()}
for n, im in x1.items(): im.save(f'{D}/composites/{n}_x1.png') if os.path.isdir(f'{D}/composites') else (os.makedirs(f'{D}/composites'), im.save(f'{D}/composites/{n}_x1.png'))
portrait(x1['kitchen_props_day'], 12, (30, 56), 'phone_kitchen_props_medium')
portrait(x1['kitchen_ines_day'], 18, (88, 85), 'phone_ines_noe_camille_close')
portrait(x1['stairs_cushion_day'], 18, (84, 79), 'phone_stairs_cushion_close')
portrait(x1['kitchen_rain_day'], 12, (24, 56), 'phone_kitchen_rain_medium')
portrait(x1['stairwell_rain_day'], 12, (66, 50), 'phone_stairwell_rain_medium')
# 8x prop contact sheet (wall bg, floor strip), no labels; order = PROPS list then overlays
cims = list(props.values())
cs = Image.new('RGBA', (8 * 16 + 4, ((len(cims) + 7) // 8) * 15 + 4), C('wall'))
for i, im in enumerate(cims): r, c = divmod(i, 8); cs.alpha_composite(im, (2 + 16 * c + 8 - im.width // 2, 2 + 15 * r + 13 - im.height))
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/composites/props_contact_x8.png')
lu = Image.new('RGBA', (5 * 16 + 4, 26), C('wall')); lu.alpha_composite(Image.new('RGBA', (lu.width, 3), C('floor')), (0, 23))
for i, n in enumerate(['noe.stand', 'camille.stand', 'ines.stand', 'martin.stand', 'lefevre.stand']): put(lu, n, 10 + i * 16, 23)
lu.resize((lu.width * 8, lu.height * 8), Image.NEAREST).save(f'{D}/composites/lineup_ines_cast_x8.png')
# palette audit of everything written here
allowed = {C(k) for k in PAL}
for root in (D, f'{SETS}/kitchen/light', f'{SETS}/stairwell/light'):
    for f in os.listdir(root if root != D else f'{D}/pieces/x1'):
        if root == D: path = f'{D}/pieces/x1/{f}'
        elif 'rain_window' in f: path = f'{root}/{f}'
        else: continue
        a = Image.open(path).convert('RGBA'); bad = {c for c in a.get_flattened_data() if c[3] == 255 and c not in allowed} | {c for c in a.get_flattened_data() if 0 < c[3] < 255 and c[:3] != C('wood')[:3]}
        assert not bad, (path, list(bad)[:3])
for sh in ('ines_sheet', 'sitcom_props_sheet', 'sitcom_overlays_sheet'):
    a = Image.open(f'{D}/{sh}.png').convert('RGBA'); bad = {c for c in a.get_flattened_data() if c[3] == 255 and c not in allowed}; assert not bad, sh
print('ok', len(man['assets']), 'assets')

# ======================= Rev 3: calendar, closed laptop + bare desk, newspaper, cat on keyboard =======================
def calendar():  # 9x10 wall calendar: nail+string, red header band, dot grid, one circled day (ring). No numerals.
    b = L(9, 10).p([(4, 0)], 'dark').r(0, 1, 8, 2, 'mouth').r(0, 3, 8, 9, 'cream').r(8, 3, 8, 9, 'wall_sh')
    for y in (4, 6, 8):
        for x in (1, 3, 5, 7): b.p([(x, y)], 'grey')
    return b.p([(4, 5), (5, 5), (6, 5), (4, 7), (5, 7), (6, 7), (4, 6), (6, 6)], 'mouth').p([(5, 6)], 'grey').im
def laptop_closed():  # 14x4: silver lid, dark lid seam with hinge knuckles, grey base edge, 1px ink shadow tips
    return L(14, 4).r(0, 0, 13, 1, 'silver').r(0, 1, 13, 1, 'grey').r(0, 2, 13, 2, 'dark').r(2, 2, 4, 2, 'ink').r(9, 2, 11, 2, 'ink').r(0, 3, 13, 3, 'grey').im
def news_folded():   # 12x5: white top sheet, silver fold at col 6, three grey stripe columns + navy picture block, silver under-sheet, 1px wall_sh shadow
    b = L(12, 5).r(0, 0, 11, 2, 'white').r(6, 0, 6, 3, 'silver').r(0, 3, 11, 3, 'silver').r(0, 4, 11, 4, 'wall_sh')
    return b.r(1, 1, 2, 2, 'grey').r(4, 1, 4, 2, 'grey').r(8, 1, 9, 2, 'navy').r(11, 1, 11, 2, 'grey').im
def news_open():     # 7x9 held page: picture block top-right, broken grey line blocks
    b = L(7, 9).r(0, 0, 6, 8, 'cream').r(6, 0, 6, 8, 'wall_sh').r(3, 1, 5, 2, 'sky').p([(4, 2)], 'green')
    for y, xs in ((1, (1,)), (2, (1,)), (4, (1, 2, 4, 5)), (6, (1, 2, 3, 5)), (7, (1, 3, 4))): b.p([(x, y) for x in xs], 'grey')
    return b.im
def desk_bare():     # kitchen desk with the baked laptop removed (rows 0-7 empty): same pixels as gen_kitchen.desk rows 8-19
    d = K.piece('desk', 'day').copy(); d.paste(Image.new('RGBA', (32, 8), (0, 0, 0, 0)), (0, 0)); return d
R3P = [('prop.wall_calendar', calendar, None), ('handprop.laptop_closed', laptop_closed, (7, 2)), ('handprop.newspaper_folded', news_folded, (6, 2)),
       ('handprop.newspaper_open', news_open, (1, 4)), ('prop.desk_bare', desk_bare, None)]
def cat_keys(flick):  # 14x12 cat canvas: loaf on the keys, no floor shadow (rests on the laptop deck); f0 slow blink, f1 eyes open + tail tip flick
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    im.alpha_composite(L(CW, CH).r(2, 8, 10, 10, 'orange').p([(3, 9), (5, 9), (7, 9), (9, 9)], 'orange_sh').p([(10, 8)], 'orange_sh').im)
    t = L(CW, CH).r(9, 10, 11, 10, 'orange')
    t.p([(12, 9), (13, 8)] if flick else [(12, 10), (13, 10)], 'orange').p([(12, 9)] if flick else [(13, 10)], 'orange_sh'); im.alpha_composite(t.im)
    hd = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); hd.alpha_composite(G['CHd']); hd.alpha_composite(G['CFACE']['neutral' if flick else 'blink'])
    im.alpha_composite(G['shift'](hd, 0, 3)); return im
R3C = {'croissant.keyboard_idle.0': cat_keys(False), 'croissant.keyboard_idle.1': cat_keys(True)}
r3 = {n: f() for n, f, _ in R3P}
man = json.load(open(f'{D}/manifest.json'))
sh3, pos3 = pack({**r3, **R3C}, 96); sh3.save(f'{D}/sitcom_rev3_sheet.png'); man['atlases']['sitcom_rev3'] = {'file': 'sitcom_rev3_sheet.png', 'w': sh3.width, 'h': sh3.height}
for n, f, hp in R3P:
    im = r3[n]; w, h = im.size; fn = n.split('.')[1]
    a = {'source': 'atlas', 'atlas': 'sitcom_rev3', 'frame': {'x': pos3[n][0], 'y': pos3[n][1], 'w': w, 'h': h}, 'pixelScale': 1, 'file': f'pieces/x1/{fn}.png'}
    if n == 'prop.wall_calendar': a.update(anchor='topleft', anchorPoint={'x': 4, 'y': 0}, depth=1, slots={'kitchen': {'x': 120, 'y': 74, 'note': 'nail point; occupies x116-124 y74-83, clear of clock (84-92), frame (99-108) and house_rules (132-139, y87-96)'}})
    elif n == 'prop.desk_bare': a.update(anchor='baseline', anchorPoint={'x': 16, 'y': 19}, depth=2, replaces='prop.desk (kitchen) when the laptop is closed / off the desk', at={'x': 166, 'y': 131})
    else: a.update(anchor='baseline', anchorPoint={'x': w // 2, 'y': h - 1}, depth=5)
    if hp: a['handPoint'] = {'x': hp[0], 'y': hp[1]}
    man['assets'][n + '.any'] = a; im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((w * 8, h * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
man['assets']['handprop.laptop_closed.any']['slots'] = {'kitchen_desk': {'x': 165, 'y': 119, 'note': 'on prop.desk_bare top (row 8 of the desk = stage y120)'}, 'kitchen_table4': {'x': 108, 'y': 119}}
man['assets']['handprop.newspaper_folded.any']['slots'] = {'kitchen_table4': {'x': 128, 'y': 119}}
for n, im in R3C.items():
    man['assets'][n] = {'source': 'atlas', 'atlas': 'sitcom_rev3', 'frame': {'x': pos3[n][0], 'y': pos3[n][1], 'w': CW, 'h': CH}, 'anchor': 'feet', 'anchorPoint': {'x': 6, 'y': 10}, 'pixelScale': 1,
                        'onProp': 'kitchen prop.desk (baked open laptop) keyboard deck: anchor at stage (163,119) = cat body bottom row resting on the deck row; or kitchen laptop piece deck row 8',
                        'canvas': '14x12 (standard cat canvas; no extra room needed)'}
    im.save(f'{D}/pieces/x1/{n.replace(".", "_")}.png'); im.resize((CW * 8, CH * 8), Image.NEAREST).save(f'{D}/pieces/x8/{n.replace(".", "_")}_x8.png')
man['assets']['croissant.keyboard_idle'] = {'type': 'sequence', 'frames': ['croissant.keyboard_idle.0', 'croissant.keyboard_idle.1'], 'fps': 2}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
for im in list(r3.values()) + list(R3C.values()):
    assert not {c for c in im.get_flattened_data() if c[3] == 255 and c not in allowed} and not {c for c in im.get_flattened_data() if 0 < c[3] < 255}
# composites
def kitchen_r3(bare):
    dd = dict(kd); dd['desk'] = r3['prop.desk_bare'] if bare else kd['desk']; return K.stage('day', {'day': (dd, None)})
props.update(r3); room = kitchen_r3(True); pr = layer(); cast = layer()
pr.alpha_composite(r3['prop.wall_calendar'], (120 - 4, 74))
prop(pr, 'handprop.laptop_closed', 165, 119); prop(pr, 'handprop.newspaper_folded', 128, 119)
put(cast, 'martin.stand', 112, K.FEET); put(cast, 'lefevre.stand', 148, K.FEET, flip=True)
room.alpha_composite(pr); room.alpha_composite(cast); room.save(f'{D}/composites/kitchen_rev3_props_x1.png')
portrait(room, 12, (100, 56), 'phone_kitchen_calendar_laptop_news_medium')
frs = []
for i in (0, 1):
    room = kitchen_r3(False); room.alpha_composite(R3C[f'croissant.keyboard_idle.{i}'], (163 - 6, 119 - 10)); room.save(f'{D}/composites/cat_keyboard_f{i}_x1.png')
    frs.append(portrait(room, 18, (132, 85), f'phone_cat_keyboard_close_f{i}').convert('RGB'))
frs[0].save(f'{D}/composites/phone_cat_keyboard_close.gif', save_all=True, append_images=[frs[1]], duration=500, loop=0)
ims3 = list(r3.values()) + list(R3C.values()); cs = Image.new('RGBA', (sum(i.width + 4 for i in ims3) + 4, 26), C('wall')); cx = 4
for im in ims3: cs.alpha_composite(im, (cx, 24 - im.height)); cx += im.width + 4
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/composites/rev3_contact_x8.png')
print('rev3 ok', len(man['assets']))

# ======================= Rev 4: Day 11 props (key, soup bowl, send-screen insert, midnight clock) + D13-16 gaps + trivial D18 items =======================
sys.path.insert(0, os.path.join(SETS, 'rooftop')); import gen_rooftop as R
HW, HH = 16, 24; comp, shift = G['comp'], G['shift']; CH4 = G['CHARS']
# ---- Day 11 ----
def key_hand():   # 7x3 brass key: ring bow with a hole, shaft, two teeth; handPoint = bow centre
    return L(7, 3).r(0, 0, 2, 2, 'gold').p([(1, 1)], 'orange_sh').r(3, 1, 6, 1, 'gold').p([(5, 2), (6, 2)], 'orange_sh').p([(2, 2)], 'orange_sh').im
def key_flat():   # 7x2 key lying on a floor/table: bow + shaft, teeth on the bottom row
    return L(7, 2).r(0, 0, 2, 1, 'gold').p([(1, 0)], 'orange_sh').r(3, 0, 6, 0, 'gold').r(3, 1, 4, 1, 'orange_sh').p([(6, 1)], 'orange_sh').im
def soup_bowl():  # 7x3 white bowl, orange soup surface, silver shade + foot
    return L(7, 3).r(0, 0, 6, 0, 'orange').p([(0, 0), (6, 0)], 'white').r(0, 1, 6, 1, 'white').r(5, 1, 6, 1, 'silver').r(2, 2, 4, 2, 'silver').p([(2, 0)], 'orange_sh').im
SEND_BTN = (24, 19, 35, 23)   # x0,y0,x1,y1 inside the insert (inclusive): blank gold button; engine renders « Envoyer » here
SEND_CLOCK = (29, 2, 36, 3)   # blank top-bar rect (silver) where the engine may render a digital 00:00
def screen_send():  # 40x26 laptop-screen insert: silver bezel, sky screen, white message card with grey line blocks, gold send button with white paper plane
    b = L(40, 26).r(0, 0, 39, 25, 'silver').r(2, 1, 37, 24, 'sky').r(2, 1, 37, 4, 'navy').r(SEND_CLOCK[0], SEND_CLOCK[1], SEND_CLOCK[2], SEND_CLOCK[3], 'silver')
    b.r(4, 6, 35, 16, 'white').r(35, 6, 35, 16, 'cream')
    for y, x1 in ((8, 30), (10, 33), (12, 26), (14, 18)): b.r(6, y, x1, y, 'grey')
    b.r(*SEND_BTN, 'gold').r(SEND_BTN[0], SEND_BTN[3], SEND_BTN[2], SEND_BTN[3], 'orange_sh')
    return b.p([(16, 20), (17, 20), (18, 20), (19, 20), (17, 21), (18, 21), (19, 21), (18, 22), (19, 19), (20, 21)], 'white').r(16, 23, 19, 23, 'navy').im   # paper plane left of the button
def clock_midnight():  # same 9x9 as kitchen prop.clock, both hands straight up (hour 4,3-4,4 under minute 4,2-4,4)
    b = L(9, 9).r(2, 0, 6, 0, 'dark').r(1, 1, 7, 1, 'dark').r(0, 2, 8, 6, 'dark').r(1, 7, 7, 7, 'dark').r(2, 8, 6, 8, 'dark')
    b.r(2, 1, 6, 1, 'white').r(1, 2, 7, 6, 'white').r(2, 7, 6, 7, 'white').p([(4, 1), (7, 4), (4, 7), (1, 4)], 'grey')
    return b.r(4, 1, 4, 4, 'ink').im
# ---- D13-D16 ----
def roof_steps():  # 18x5 concrete stoop under the roof door: top step rows 0-1 (x2-15), low step rows 2-4 (x0-17)
    return L(18, 5).r(2, 0, 15, 0, 'cream').r(2, 1, 15, 1, 'wall_sh').r(0, 2, 17, 2, 'cream').r(0, 3, 17, 4, 'wall_sh').p([(15, 1), (17, 3), (17, 4)], 'floor_sh').im   # cream/wall_sh = door housing render
def notice_sheet():  # 5x6 new sheet pinned on the landing board: red pin, three icon dots, no text
    return L(5, 6).r(0, 1, 4, 5, 'white').r(4, 1, 4, 5, 'silver').p([(2, 0)], 'mouth').p([(1, 2)], 'dark').p([(1, 3)], 'navy').p([(1, 4)], 'green').r(2, 2, 3, 2, 'grey').r(2, 3, 3, 3, 'grey').r(2, 4, 3, 4, 'grey').im
def notice_insert():  # 30x22 close insert of the D15 notice: pinned card, red header band, 3 pictograms (shoes, umbrella, plant) each above a blank rule; no letters
    b = L(30, 22).r(0, 1, 29, 21, 'cream').r(29, 1, 29, 21, 'wall_sh').r(0, 21, 29, 21, 'wall_sh').p([(14, 0), (15, 0)], 'mouth').r(2, 2, 27, 3, 'mouth')
    b.r(3, 11, 6, 12, 'dark').r(4, 9, 5, 10, 'dark').r(7, 11, 9, 12, 'dark').r(8, 9, 9, 10, 'dark')              # pair of shoes
    b.r(12, 7, 18, 7, 'navy').r(11, 8, 19, 8, 'navy').r(11, 9, 19, 9, 'navy').r(15, 10, 15, 12, 'wood').p([(14, 12)], 'wood')   # umbrella
    b.r(22, 10, 26, 12, 'orange_sh').r(22, 10, 26, 10, 'orange').p([(24, 7), (23, 8), (25, 8), (22, 9), (24, 9), (26, 9), (24, 8)], 'green').p([(23, 9), (25, 9)], 'green_sh')  # plant
    for x0 in (3, 12, 21): b.r(x0, 15, x0 + 6, 15, 'grey')
    return b.r(3, 18, 12, 18, 'grey').r(20, 18, 26, 18, 'grey').im   # blank lines where the engine bubble carries the French
# ---- D18 (trivial) ----
def butter():      return L(7, 4).r(0, 0, 3, 2, 'gold').r(4, 0, 6, 2, 'white').r(6, 0, 6, 2, 'silver').r(0, 3, 6, 3, 'orange_sh').p([(1, 0), (2, 0)], 'cream').im
def dough_sheet(): return L(14, 2).r(1, 0, 12, 0, 'cream').r(0, 1, 13, 1, 'wall_sh').p([(3, 0), (9, 0)], 'white').im
def dough_fold():  return L(8, 3).r(1, 0, 6, 0, 'cream').r(0, 1, 7, 1, 'wall_sh').r(0, 2, 7, 2, 'cream').p([(7, 2)], 'wall_sh').p([(2, 0)], 'white').im
def rolling_pin(): return L(14, 2).r(2, 0, 11, 1, 'wood').r(2, 1, 11, 1, 'orange_sh').r(0, 0, 1, 1, 'ink').r(12, 0, 13, 1, 'ink').im
def glove_loose(): return L(5, 3).r(0, 1, 4, 2, 'pink').p([(1, 0), (2, 0), (3, 0)], 'pink').p([(4, 2), (0, 2)], 'skin_sh').im
def paw_print():   return L(9, 3).r(0, 1, 8, 2, 'white').r(2, 0, 6, 0, 'white').p([(3, 1), (5, 1)], 'silver').r(3, 2, 5, 2, 'silver').p([(4, 1)], 'white').im   # flour patch with a paw dent
R4P = [('handprop.key_door', key_hand, (1, 1)), ('prop.key_floor', key_flat, None), ('handprop.soup_bowl', soup_bowl, (3, 0)),
       ('prop.screen_send', screen_send, None), ('prop.clock_midnight', clock_midnight, None),
       ('prop.roof_steps', roof_steps, None), ('prop.notice_sheet', notice_sheet, None), ('prop.notice_insert', notice_insert, None),
       ('handprop.butter_block', butter, (3, 0)), ('handprop.dough_sheet', dough_sheet, (7, 0)), ('handprop.dough_folded', dough_fold, (4, 0)),
       ('handprop.rolling_pin', rolling_pin, (7, 0)), ('handprop.glove_loose', glove_loose, (2, 0)), ('prop.paw_print', paw_print, None)]
r4 = {n: f() for n, f, _ in R4P}
# ---- rig pose variants (built from the in-memory canonical rig parts; cast sheets untouched) ----
P4, H4 = {}, {}
def crouch(name, reach):
    ch = CH4[name]; F = ch['faces']; A = ch['arms']; d = 5 if name != 'martin' else 4
    lapc, kneec, shinc = {'noe': ('orange_sh',) * 3, 'camille': ('navy_sh',) * 3, 'martin': ('navy', 'navy_sh', 'navy_sh'), 'lefevre': ('plum_sh', 'plum_sh', 'skin_sh')}[name]
    lg = L(HW, HH).r(2, 19, 5, 21, kneec).r(10, 19, 13, 21, kneec).r(3, 21, 5, 21, shinc).r(10, 21, 12, 21, shinc).r(2, 22, 5, 22, 'dark').r(10, 22, 13, 22, 'dark')
    body = ch['body'].crop((0, 0, HW, ch['hip'])); bb = Image.new('RGBA', (HW, HH), (0, 0, 0, 0)); bb.paste(body, (0, 0))
    arm_l = A[('arm_l', 'hips')]; arm_r = A[('arm_r', 'point' if reach else 'hips')]
    up = comp(bb, arm_l, arm_r, ch['head'], F['neutral'][0], F['neutral'][1], ch.get('glasses'))
    im = comp(ch['shadow'], lg.im, shift(up, 0, d))
    if reach: hx, hy = HANDS[f'{name}.arm_r.point']; H4[f'{name}.pose.crouch_reach'] = (hx, hy + d)
    return im
for nm in ('noe', 'camille', 'martin', 'lefevre'):
    P4[f'{nm}.pose.crouch'] = crouch(nm, False); P4[f'{nm}.pose.crouch_reach'] = crouch(nm, True)
def gown(arms):   # Lefèvre dressing gown: pink robe to mid-shin, plum lapels + sash, pink sleeves, cream slippers
    ch = CH4['lefevre']; F = ch['faces']; sl, sr, t = ch['sl'], ch['sr'], ch['top']
    rb = L(HW, HH).r(4, 11, 11, 20, 'pink').p([(6, 11), (6, 12), (7, 13), (9, 11), (9, 12), (8, 13)], 'plum').r(7, 11, 8, 12, 'cream').r(4, 15, 11, 15, 'plum')
    rb.p([(9, 16), (9, 17), (10, 17)], 'plum').p([(5, 18), (5, 19), (10, 19)], 'plum_sh').r(4, 22, 6, 22, 'cream').r(9, 22, 11, 22, 'cream')
    legs = L(HW, HH).r(5, 21, 6, 21, 'skin_sh').r(9, 21, 10, 21, 'skin_sh').im
    a = L(HW, HH)
    if arms == 'down': a.r(sl, t, sl, t + 3, 'pink').r(sr, t, sr, t + 3, 'pink').r(sl, t + 4, sl, t + 5, 'skin').r(sr, t + 4, sr, t + 5, 'skin')
    else:   # hold: both forearms forward, hands together at chest-low (parcel handPoint 7,15)
        a.p([(sl, t), (sl, t + 1), (sl + 1, t + 2), (sr, t), (sr, t + 1), (sr - 1, t + 2)], 'pink').p([(sl + 2, t + 3), (sl + 3, t + 3), (sr - 2, t + 3), (sr - 3, t + 3)], 'skin')
    return comp(ch['shadow'], legs, rb.im, a.im, ch['head'], F['neutral'][0], F['neutral'][1], ch['glasses'])
P4['lefevre.pose.gown_stand'] = gown('down'); P4['lefevre.pose.gown_hold'] = gown('hold'); H4['lefevre.pose.gown_hold'] = (7, 14)
def martin_arms(kind, glove_r=True):
    ch = CH4['martin']; F = ch['faces']; sl, sr, t = ch['sl'], ch['sr'], ch['top']; a = L(HW, HH); gr = 'wood' if glove_r else 'skin'
    if kind == 'fold0':   # both hands on the dough at row 14 (= table top when feet at y128 behind the table)
        a.p([(sl, t), (sl + 1, t + 1)], 'navy').p([(sr, t), (sr - 1, t + 1)], 'navy').p([(sl + 2, t + 1), (sl + 3, t + 1)], 'skin').p([(sr - 2, t + 1), (sr - 3, t + 1)], gr); face = 'neutral'
    elif kind == 'fold1':  # bare left hand lifts the flap over (hand up at row 12); gloved right hand holds the sheet
        a.p([(sl, t), (sl + 1, t - 1)], 'navy').p([(sl + 2, t - 1), (sl + 3, t - 2)], 'skin').p([(sr, t), (sr - 1, t + 1)], 'navy').p([(sr - 2, t + 1), (sr - 3, t + 1)], gr); face = 'neutral'
    else:                  # taste: right hand at the mouth, left arm down (gloves off)
        a.r(sl, t, sl, t + 3, 'navy').r(sl, t + 4, sl, t + 5, 'skin').p([(sr, t), (sr - 1, t - 1), (sr - 2, t - 2)], 'navy').p([(sr - 3, t - 3), (sr - 4, t - 3)], 'skin'); face = 'happy'
    return comp(ch['shadow'], ch['legs'], ch['body'], ch['head'], F[face][0], F[face][1], a.im)
P4['martin.fold_dough.0'] = martin_arms('fold0'); P4['martin.fold_dough.1'] = martin_arms('fold1'); P4['martin.pose.taste'] = martin_arms('taste', False)
H4['martin.fold_dough.0'] = (8, 14); H4['martin.fold_dough.1'] = (5, 12); H4['martin.pose.taste'] = (9, 10)
O4 = {'martin.overlay.gloves': L(HW, HH).r(2, 17, 2, 18, 'pink').r(13, 17, 13, 18, 'pink').im,   # Rev 4.1c: pale pink latex (was wood; read as blocks on the board)   # stand / idle.0 / talk frames (arms down) only
      'croissant.overlay.sugar_crystal': L(CW, CH).p([(4, 6)], 'white').im,                     # on the nose (head unbobbed frames: sit/stand/idle.0)
      'croissant.overlay.flour_paw': L(CW, CH).p([(2, 10), (4, 10), (3, 9)], 'white').im}
CAT4 = {n: v for n, v in O4.items() if n.startswith('croissant')}
man = json.load(open(f'{D}/manifest.json'))
all4 = {**r4, **P4, **O4}
sh4, pos4 = pack(all4, 160); sh4.save(f'{D}/sitcom_rev4_sheet.png'); man['atlases']['sitcom_rev4'] = {'file': 'sitcom_rev4_sheet.png', 'w': sh4.width, 'h': sh4.height}
NOTE4 = {'handprop.key_door': 'Day 11 hp_cle / hp_pieds: in hand (handPoint = bow); table slot kitchen_table4 (118,119)',
         'prop.key_floor': 'Day 11: key on floor (y = feet line) or table top (119); baseline',
         'handprop.soup_bowl': 'Day 11 Lefèvre second bowl; table4 slots = plate xs 103/111/125/133 at y119',
         'prop.screen_send': 'Day 11 h_envoyer close insert; engine draws « Envoyer » in buttonRect, optional digital time in clockRect',
         'prop.clock_midnight': 'Day 11 h_envoyer: swap for kitchen prop.clock at (88,80), same 9x9 + baseline anchor (4,8)',
         'prop.roof_steps': 'D13 hook: stoop under roof door, at (30,136) baseline; slots roof_step_top (30,131) roof_step_low (30,133)',
         'prop.notice_sheet': 'D15: pinned on stairwell notice board (board x36-55); slot (46,82) baseline',
         'prop.notice_insert': 'D15 close insert; French line is an engine bubble/caption, art carries pictograms only'}
for n, im in all4.items():
    w, h = im.size; fn = n.replace('.', '_') if n in P4 or n in O4 else n.split('.')[1]
    a = {'source': 'atlas', 'atlas': 'sitcom_rev4', 'frame': {'x': pos4[n][0], 'y': pos4[n][1], 'w': w, 'h': h}, 'pixelScale': 1, 'file': f'pieces/x1/{fn}.png'}
    if n in P4: a.update(anchor='feet', anchorPoint={'x': 8, 'y': 23})
    elif n in O4: a.update(anchor='feet', anchorPoint={'x': 6, 'y': 11} if n in CAT4 else {'x': 8, 'y': 23}, overlay=True)
    elif n == 'prop.screen_send': a.update(anchor='topleft', anchorPoint={'x': 0, 'y': 0}, depth=7, insert=True, buttonRect=dict(zip('x0 y0 x1 y1'.split(), SEND_BTN)), clockRect=dict(zip('x0 y0 x1 y1'.split(), SEND_CLOCK)))
    elif n == 'prop.notice_insert': a.update(anchor='topleft', anchorPoint={'x': 0, 'y': 0}, depth=7, insert=True)
    elif n == 'prop.clock_midnight': a.update(anchor='baseline', anchorPoint={'x': 4, 'y': 8}, depth=1, replaces='prop.clock', at={'x': 88, 'y': 80})
    else: a.update(anchor='baseline', anchorPoint={'x': w // 2, 'y': h - 1}, depth=2 if n == 'prop.roof_steps' else 5)
    hp = {k: v for k, _, v in R4P}.get(n) or H4.get(n)
    if hp: a['handPoint'] = {'x': hp[0], 'y': hp[1]}
    if n in NOTE4: a['note'] = NOTE4[n]
    man['assets'][n if n in P4 or n in O4 else n + '.any'] = a
    im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((w * 8, h * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
man['assets']['prop.roof_steps.any']['slots'] = {'roof_step_top': {'x': 30, 'y': 131}, 'roof_step_low': {'x': 30, 'y': 133}, 'at': {'x': 30, 'y': 136}}
man['assets']['handprop.soup_bowl.any']['slots'] = {f'kitchen_table4_{s}': {'x': x, 'y': 119} for s, x in zip(('a', 'b', 'c', 'd'), (103, 111, 125, 133))}
man['assets']['martin.fold_dough'] = {'type': 'sequence', 'frames': ['martin.fold_dough.0', 'martin.fold_dough.1'], 'fps': 2}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
for im in all4.values():
    assert not {c for c in im.get_flattened_data() if c[3] == 255 and c not in allowed}, 'pal'
    assert not {c for c in im.get_flattened_data() if 0 < c[3] < 255 and c[:3] != C('wood')[:3]}, 'alpha'
# ---- composites ----
def p4(s, n, x, y, flip=False, overlays=()):
    im = all4[n].copy() if n in all4 else frame(n)[0].copy()
    for o in overlays: im.alpha_composite(all4[o] if o in all4 else OVER[o])
    ax, ay = (6, 11) if n.startswith('croissant') else (8, 23)
    if n in all4 and n not in P4: ax, ay = im.width // 2, im.height - 1
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT); ax = im.width - 1 - ax
    s.alpha_composite(im, (x - ax, y - ay))
def hand_at(n, x, y, flip=False):   # stage coords of a pose's handPoint when its feet are at (x,y)
    hx, hy = H4.get(n) or HANDS[n]; return (x - (hx - 8) if flip else x + (hx - 8), y - 23 + hy)
# 1 key in hand (kitchen close): Noé holds the key up (point arm)
room = kitchen(); cast = layer(); put(cast, 'noe.pose.point' if 'noe.pose.point' in CANMAN['assets'] else 'noe.stand', 60, K.FEET); room.alpha_composite(cast)
hx, hy = HANDS['noe.arm_l.point'] if 'noe.pose.point' in CANMAN['assets'] else HANDS['noe.arm_l.down']; kx, ky = 60 - 8 + hx, K.FEET - 23 + hy
room.alpha_composite(r4['handprop.key_door'], (kx - 1, ky - 1)); prop(room, 'handprop.plate', 70, 117) if False else None
p4(room, 'prop.key_floor', 76, K.FEET); room.save(f'{D}/composites/day11_key_x1.png'); portrait(room, 18, (38, 85), 'phone_day11_key_close')
# 2 screen insert (close): desk + laptop, insert over the camera as a full-frame cut
room = kitchen(); room.alpha_composite(r4['prop.screen_send'], (145, 98)); room.save(f'{D}/composites/day11_screen_insert_x1.png'); portrait(room, 18, (135, 90), 'phone_day11_screen_send_close')
# 3 kitchen with the midnight clock (medium) + bowl on table4
room = kitchen(); room.alpha_composite(r4['prop.clock_midnight'], (88 - 4, 80 - 8)); pr = layer()
props.update(r4); prop(pr, 'handprop.soup_bowl', 111, 119); prop(pr, 'handprop.soup_bowl', 125, 119); room.alpha_composite(pr)
if not os.environ.get('A411_SKIP_MIDNIGHT'): room.save(f'{D}/composites/day11_kitchen_midnight_x1.png'); portrait(room, 12, (73, 56), 'phone_day11_kitchen_midnight_medium')   # Rev 5.1: guarded too (this Rev 4 block overwrote the approved render)
# 4 Martin folds dough with the glove: behind table4 (feet 128), dough on table, loose glove beside
for i in (0, 1):
    room = kitchen(); cast = layer(); p4(cast, f'martin.fold_dough.{i}', 118, 128)
    room2 = K.stage('day', {'day': (kd, None)}); base = layer(); base.alpha_composite(room2)
    # draw Martin BEHIND the table: composite cast, then re-paint the table + chairs from a table-only layer
    tl = layer(); tl.alpha_composite(kd['table'], (118 - 26, 131 - 11)); tl.alpha_composite(kd['chair'], (95 - 5, 131 - 15)); tl.alpha_composite(kd['chair'].transpose(Image.FLIP_LEFT_RIGHT), (141 - 4, 131 - 15))
    room.alpha_composite(cast); room.alpha_composite(tl); pr = layer()
    prop(pr, 'handprop.dough_folded' if i else 'handprop.dough_sheet', 118, 119); prop(pr, 'handprop.glove_loose', 131, 119); prop(pr, 'handprop.rolling_pin', 104, 119); prop(pr, 'handprop.butter_block', 97, 119)
    room.alpha_composite(pr); room.save(f'{D}/composites/martin_fold_f{i}_x1.png'); portrait(room, 18, (88, 85), f'phone_martin_fold_glove_close_f{i}')
# 5 crouch watering on the rooftop (medium 12x (40,56)): Camille crouch_reach at (84,136) facing left, can at the hand
rd = {n: R.piece(n, 'day') for n in R.PIECES}; room = R.stage('day', rd); cast = layer()
p4(cast, 'camille.pose.crouch_reach', 84, 136, flip=True); hx, hy = hand_at('camille.pose.crouch_reach', 84, 136, flip=True)
can = R.piece('arrosoir_hand', 'day').transpose(Image.FLIP_LEFT_RIGHT); cast.alpha_composite(can, (hx - can.width // 2, hy))
p4(cast, 'noe.pose.crouch', 100, 136, flip=True); room.alpha_composite(cast); room.save(f'{D}/composites/roof_crouch_water_x1.png'); portrait(room, 12, (40, 56), 'phone_roof_crouch_water_medium')
# 6 roof steps (rooftop, 12x cam (8,56)): steps under the door, cushion on the top step, Noé at the low step
room = R.stage('day', rd); pr = layer(); p4(pr, 'prop.roof_steps', 30, 136); prop(pr, 'prop.cushion', 30, 131); room.alpha_composite(pr)
cast = layer(); put(cast, 'noe.stand', 50, 136, flip=True); room.alpha_composite(cast); room.save(f'{D}/composites/roof_steps_x1.png'); portrait(room, 12, (8, 56), 'phone_roof_steps_medium')
# 7 stairwell medium proposal (44,56): D13 cold open, Lefèvre in the gown with the parcel, notice sheet on the board
room = S.stage('day', sd); pr = layer(); p4(pr, 'prop.notice_sheet', 46, 82); room.alpha_composite(pr); cast = layer()
p4(cast, 'lefevre.pose.gown_hold', 78, 136); hx, hy = hand_at('lefevre.pose.gown_hold', 78, 136); pc = S.piece('parcel', 'day'); cast.alpha_composite(pc, (hx - 4, hy - 3))
put(cast, 'noe.stand', 96, 136, flip=True); cast.alpha_composite(frame('croissant.sit')[0], (108 - 6, 136 - 11)); room.alpha_composite(cast)
room.save(f'{D}/composites/stairwell_medium_proposal_x1.png'); portrait(room, 12, (44, 56), 'phone_stairwell_medium_proposal')
# 8 cat on the empty end chair (kitchen close), registry (95,125) and (141,125)
room = kitchen(); c = layer(); c.alpha_composite(frame('croissant.sit')[0], (95 - 6, 125 - 11)); c.alpha_composite(frame('croissant.sit')[0].transpose(Image.FLIP_LEFT_RIGHT), (141 - 7, 125 - 11))
room.alpha_composite(c); room.save(f'{D}/composites/cat_end_chairs_x1.png'); portrait(room, 18, (88, 85), 'phone_cat_chair_l_close'); portrait(room, 18, (110, 85), 'phone_cat_chair_r_close')
# 9 notice insert close
room = S.stage('day', sd); room.alpha_composite(r4['prop.notice_insert'], (36, 62)); portrait(room, 18, (21, 49), 'phone_notice_insert_close')
# contact sheet x8
ims4 = list(all4.values()); rows, row, wsum = [], [], 0
for im in ims4:
    if wsum + im.width + 4 > 200: rows.append(row); row, wsum = [], 0
    row.append(im); wsum += im.width + 4
rows.append(row); hh = [max(i.height for i in r) + 4 for r in rows]
cs = Image.new('RGBA', (204, sum(hh) + 4), C('wall')); y = 4
for r, h in zip(rows, hh):
    x = 4
    for im in r: cs.alpha_composite(im, (x, y + h - 4 - im.height)); x += im.width + 4
    y += h
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/composites/rev4_contact_x8.png')
print('rev4 ok', len(man['assets']), len(all4))

# ======================= Rev 4.1: key-slide insert, midnight kitchen (soir grade, reframed), Martin fold insert + counter medium =======================
IW, IH = 60, 58   # insert canvas: fills the 1080x1056 phone scene band at 18x; drawn at ~3x stage detail, palette pixels only
def table_close(b):   # wall band, table top (wood, sparse ink grain), front edge, dark floor under
    b.r(0, 0, IW - 1, 13, 'wall').r(0, 10, IW - 1, 13, 'wall_sh').r(0, 14, IW - 1, 47, 'wood').r(0, 48, IW - 1, 50, 'ink').r(0, 51, IW - 1, IH - 1, 'floor_sh')
    for x0, y, ln in ((4, 30, 9), (30, 33, 12), (12, 39, 7), (44, 42, 10), (22, 45, 8), (50, 28, 6), (6, 19, 11), (36, 17, 9)): b.r(x0, y, x0 + ln, y, 'orange_sh')
    return b
def big_key(b, x, y):   # 21x9 brass key: ring bow with a 3x3 hole, shaft, two teeth; cream glint, orange_sh underside
    b.r(x + 1, y, x + 7, y + 8, 'gold').r(x, y + 1, x + 8, y + 7, 'gold').r(x + 3, y + 3, x + 5, y + 5, 'wood').p([(x + 2, y + 1), (x + 1, y + 2)], 'cream')
    b.r(x + 9, y + 3, x + 20, y + 5, 'gold').r(x + 9, y + 5, x + 20, y + 5, 'orange_sh').r(x + 15, y + 6, x + 16, y + 8, 'gold').r(x + 19, y + 6, x + 20, y + 7, 'gold')
    b.r(x + 1, y + 8, x + 7, y + 8, 'orange_sh').p([(x + 8, y + 7), (x + 16, y + 8), (x + 20, y + 7)], 'orange_sh').r(x + 11, y + 3, x + 18, y + 3, 'cream')
    return b
def lef_hand(b, x, y):   # Lefèvre's right hand from the left edge: plum cardigan cuff, palm down, fingertips forward (to the right)
    b.r(0, y - 1, x + 5, y + 9, 'plum').r(0, y + 7, x + 5, y + 9, 'plum_sh').r(x + 4, y - 1, x + 5, y + 9, 'plum_sh')
    b.r(x + 6, y, x + 15, y + 8, 'skin').r(x + 16, y + 1, x + 18, y + 7, 'skin').r(x + 6, y + 7, x + 18, y + 8, 'skin_sh')
    b.r(x + 14, y + 3, x + 18, y + 3, 'skin_sh').r(x + 14, y + 5, x + 18, y + 5, 'skin_sh').p([(x + 9, y + 1), (x + 10, y + 1)], 'skin_sh')
    return b.r(x + 8, y - 2, x + 13, y - 1, 'skin').p([(x + 13, y - 1)], 'skin_sh')   # thumb on top
def key_slide(i):
    dx, dy = (0, 0) if i == 0 else (5, 2); b = table_close(L(IW, IH))
    b.r(46, 24, 56, 26, 'white').r(47, 24, 55, 24, 'orange').r(46, 26, 56, 26, 'silver')   # soup bowl at the back (context)
    lef_hand(b, 2 + dx, 31 + dy); big_key(b, 21 + dx, 31 + dy); return b.im
def hand_l():   # 16x13 left hand from above, fingers toward camera: navy cuff, pale pink glove, 4 split fingers (gaps open), thumb splayed sideways to the right
    h = L(16, 13).r(0, 0, 11, 1, 'navy').r(0, 2, 11, 2, 'navy_sh').r(1, 3, 11, 7, 'pink').r(2, 8, 10, 8, 'pink')
    for fx, ln in ((1, 3), (4, 4), (7, 4), (10, 3)): h.r(fx, 9, fx + 1, 8 + ln, 'pink').p([(fx, 8 + ln)], 'skin_sh')
    h.r(1, 3, 1, 7, 'skin_sh').p([(4, 8), (7, 8), (10, 8)], 'skin_sh')
    return h.r(12, 4, 13, 6, 'pink').r(14, 5, 15, 7, 'pink').p([(15, 7), (12, 6)], 'skin_sh').im
HL = hand_l(); HR = HL.transpose(Image.FLIP_LEFT_RIGHT)
def fold_dough(i):   # floured board, butter dough; .0 far half lifted high in the hands, .1 folded over (big arc), hands pressing; .2 press + flour puff
    b = table_close(L(IW, IH))
    b.r(3, 16, 56, 47, 'cream').r(3, 47, 56, 48, 'wall_sh').r(56, 16, 56, 48, 'wall_sh')
    for p in ((6, 19), (9, 44), (52, 21), (50, 43), (7, 30), (53, 35), (28, 45)): b.p([p], 'wall_sh')
    if i == 0:
        b.r(14, 31, 45, 42, 'wall').r(14, 43, 45, 43, 'wall_sh').r(46, 32, 46, 43, 'wall_sh').r(14, 44, 46, 44, 'floor').r(47, 33, 47, 44, 'floor').p([(20, 35), (33, 38), (40, 34)], 'white')
        b.r(14, 30, 45, 30, 'gold').r(15, 10, 44, 29, 'wall_sh').r(15, 10, 44, 11, 'wall').r(15, 18, 44, 18, 'gold').p([(15, 10), (44, 10)], 'cream')   # flap raised high
        b.im.alpha_composite(HL, (10, 3)); b.im.alpha_composite(HR, (34, 3))
    else:
        b.r(14, 31, 45, 43, 'wall').r(47, 33, 47, 44, 'floor').r(14, 44, 46, 44, 'floor').r(46, 32, 46, 43, 'wall_sh')
        b.r(14, 37, 45, 37, 'gold').r(14, 38, 45, 38, 'wall_sh').r(14, 39, 45, 39, 'gold').r(14, 40, 45, 40, 'wall').r(14, 41, 45, 41, 'gold').r(14, 42, 45, 43, 'wall_sh')
        b.r(14, 31, 45, 36, 'wall').r(14, 30, 45, 30, 'white')
        b.im.alpha_composite(HL, (12, 25)); b.im.alpha_composite(HR, (32, 25))
        if i == 2:
            for p in ((9, 30), (8, 33), (10, 36), (50, 30), (51, 34), (49, 37), (29, 27), (31, 25), (27, 24), (6, 28), (53, 27), (30, 39)): b.p([p], 'white')
            b.r(8, 31, 9, 32, 'white').r(50, 32, 51, 33, 'white').r(29, 23, 30, 23, 'white')
    return b.im
I41 = {'prop.insert_key_slide.0': key_slide(0), 'prop.insert_key_slide.1': key_slide(1), 'prop.insert_fold_dough.0': fold_dough(0), 'prop.insert_fold_dough.1': fold_dough(1), 'prop.insert_fold_dough.2': fold_dough(2)}
man = json.load(open(f'{D}/manifest.json'))
sh41, pos41 = pack(I41, 128); sh41.save(f'{D}/sitcom_rev41_sheet.png'); man['atlases']['sitcom_rev41'] = {'file': 'sitcom_rev41_sheet.png', 'w': sh41.width, 'h': sh41.height}
for n, im in I41.items():
    fn = n.replace('.', '_')
    man['assets'][n] = {'source': 'atlas', 'atlas': 'sitcom_rev41', 'frame': {'x': pos41[n][0], 'y': pos41[n][1], 'w': IW, 'h': IH}, 'pixelScale': 1, 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0},
                        'depth': 7, 'insert': True, 'file': f'pieces/x1/{fn}.png', 'note': 'full-frame close insert, 60x58 at 18x fills the phone scene band (y288-1344); ~3x stage detail'}
    im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((IW * 8, IH * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
    assert not {c for c in im.get_flattened_data() if c[3] != 255 or c not in allowed}, n
man['assets']['prop.insert_key_slide'] = {'type': 'sequence', 'frames': ['prop.insert_key_slide.0', 'prop.insert_key_slide.1'], 'fps': 2, 'note': 'Day 11 « Elle pousse la clé vers toi »'}
man['assets']['prop.insert_fold_dough'] = {'type': 'sequence', 'frames': ['prop.insert_fold_dough.0', 'prop.insert_fold_dough.1', 'prop.insert_fold_dough.2'], 'fps': 2, 'durationsMs': [600, 400, 500], 'note': 'D18 fold; replaces martin.fold_dough (deprecated)'}
man['assets']['martin.fold_dough']['deprecated'] = 'Rev 4.1: use prop.insert_fold_dough (close) + martin.stand with martin.overlay.gloves at the counter (medium)'
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
def insert_phone(im, name):
    sc = Image.new('RGBA', (W_ST, H_ST), C('wall')); sc.alpha_composite(im, (0, 0)); return portrait(sc, 18, (0, 0), name)
for base in ('key_slide', 'fold_dough'):
    nm = {'key_slide': 'phone_day11_key_slide_insert', 'fold_dough': 'phone_martin_fold_insert'}[base]
    fr = [insert_phone(I41[f'prop.insert_{base}.{i}'], f'{nm}_f{i}').convert('RGB') for i in ((0, 1, 2) if base == 'fold_dough' else (0, 1))]
    fr[0].save(f'{D}/composites/{nm}.gif', save_all=True, append_images=fr[1:], duration=[600, 400, 500][:len(fr)] if len(fr) == 3 else 500, loop=0)
if not os.environ.get('A411_SKIP_MIDNIGHT'):   # midnight is owned by the light worker now; set A411_SKIP_MIDNIGHT=1 to leave it alone
  # midnight kitchen, soir grade (baked night maps), cast mult 0.25 / add 0.6, pendant emitter ungraded; cam (83,56): view x83-172, clock 84-92 in, laptop 157-172 fully in
  nd = {n: K.piece(n, 'night') for n in K.PIECES}; ns = {'night': (nd, None)}; NM, NA = K.baked_maps('night', ns)
  room = K.stage('night', ns); room.alpha_composite(r4['prop.clock_midnight'], (88 - 4, 80 - 8)); pr = layer()
  prop(pr, 'handprop.soup_bowl', 111, 119); prop(pr, 'handprop.soup_bowl', 125, 119)
  cast = layer(); put(cast, 'noe.stand', 138, K.FEET); put(cast, 'lefevre.stand', 104, K.FEET)
  room = K.grade(room, NM, 1.0, NA); room.alpha_composite(K.grade(pr, NM, 1.0, NA)); room.alpha_composite(nd['pendant_on'], (K.PENDANT_AT[0] - 4, K.PENDANT_AT[1]))
  room.alpha_composite(K.grade(cast, NM, 0.25, NA, 0.6)); room.save(f'{D}/composites/day11_kitchen_midnight_x1.png'); portrait(room, 12, (83, 56), 'phone_day11_kitchen_midnight_medium')
# Martin at the counter (medium, day): stand_counter (46) with new pose martin.pose.counter_reach (right gloved hand up on the board edge); board+dough+pin on counter_top_r (x54-69); Camille stays at 84
def counter_reach():
    ch = CH4['martin']; F = ch['faces']; sl, sr, t = ch['sl'], ch['sr'], ch['top']; a = L(20, HH)
    a.r(sl, t, sl, t + 3, 'navy').r(sl, t + 4, sl, t + 5, 'pink').p([(sr, t), (sr + 1, t - 1), (sr + 2, t - 2), (sr + 2, t - 3), (sr + 3, t - 4), (sr + 3, t - 5)], 'navy').r(sr + 3, t - 7, sr + 5, t - 6, 'pink').p([(sr + 6, t - 6)], 'pink')
    im = Image.new('RGBA', (20, HH)); im.alpha_composite(comp(ch['shadow'], ch['legs'], ch['body'], ch['head'], F['neutral'][0], F['neutral'][1])); im.alpha_composite(a.im); return im
P4['martin.pose.counter_reach'] = all4['martin.pose.counter_reach'] = counter_reach()
im = all4['martin.pose.counter_reach']; assert not {c for c in im.get_flattened_data() if c[3] == 255 and c not in allowed}
sh42, pos42 = pack({'martin.pose.counter_reach': im}, 32); sh42.save(f'{D}/sitcom_rev41b_sheet.png'); man['atlases']['sitcom_rev41b'] = {'file': 'sitcom_rev41b_sheet.png', 'w': sh42.width, 'h': sh42.height}
man['assets']['martin.pose.counter_reach'] = {'source': 'atlas', 'atlas': 'sitcom_rev41b', 'frame': {'x': pos42['martin.pose.counter_reach'][0], 'y': pos42['martin.pose.counter_reach'][1], 'w': 20, 'h': HH}, 'pixelScale': 1, 'anchor': 'feet', 'anchorPoint': {'x': 8, 'y': 23},
                                             'handPoint': {'x': 17, 'y': 6}, 'file': 'pieces/x1/martin_pose_counter_reach.png', 'note': 'right hand raised to the counter-top front edge (y~119 at feet 136); gloves pink built in; use at stand_counter 46 with work on counter_top_r'}
im.save(f'{D}/pieces/x1/martin_pose_counter_reach.png'); im.resize((160, HH * 8), Image.NEAREST).save(f'{D}/pieces/x8/martin_pose_counter_reach_x8.png')
man['assets']['martin.pose.counter_reach']['deprecated'] = 'Rev 5: read as a waiter lifting a tray; use martin.stand + martin.overlay.gloves at stand_counter (46), turned toward counter_top_r'
MFLIP = True
man['assets']['martin.overlay.gloves']['note'] = 'pale pink latex gloves (Rev 4.1c, was wood); stand/idle.0/talk frames'
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
room = kitchen(); pr = layer(); pr.alpha_composite(L(16, 4).r(0, 0, 15, 0, 'cream').r(2, 1, 13, 1, 'gold').r(0, 1, 1, 2, 'cream').r(14, 1, 15, 2, 'cream').r(2, 0, 13, 0, 'wall').r(0, 2, 15, 2, 'cream').r(0, 3, 15, 3, 'wall_sh').im, (52, 115))
prop(pr, 'handprop.rolling_pin', 61, 114); prop(pr, 'handprop.butter_block', 66, 117); room.alpha_composite(pr)
cast = layer(); p4(cast, 'martin.stand', 46, K.FEET, MFLIP, ('martin.overlay.gloves',))   # Rev 5: plain stand + pink gloves at her sides (reach pose read as a waiter)
put(cast, 'camille.stand', 84, K.FEET, flip=True); room.alpha_composite(cast); room.save(f'{D}/composites/martin_counter_x1.png'); portrait(room, 12, (16, 56), 'phone_martin_counter_medium')
for f in ('phone_martin_fold_glove_close_f0.png', 'phone_martin_fold_glove_close_f1.png', 'martin_fold_f0_x1.png', 'martin_fold_f1_x1.png', 'day11_key_x1.png', 'phone_day11_key_close.png'):
    if os.path.exists(f'{D}/composites/{f}'): os.remove(f'{D}/composites/{f}')
print('rev4.1 ok', len(man['assets']))
# ---------------- Rev 5: Days 11-18 art gaps (Le Réalisateur, deduped) ----------------
def clock_insert():   # 60x58 close: wall, analog face, both hands straight up (00:00), tick marks only (no numerals)
    b = L(IW, IH).r(0, 0, IW - 1, IH - 1, 'wall').r(0, 52, IW - 1, IH - 1, 'wall_sh'); cx, cy = 30, 27
    for y in range(IH):
        for x in range(IW):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if d <= 23.5: b.r(x, y, x, y, 'dark' if d > 20.5 else ('cream' if (x - cx) + (y - cy) > 16 else 'white'))
    for dx, dy in ((0, -18), (18, 0), (0, 18), (-18, 0)): b.r(cx + dx - (dx == 0), cy + dy - (dy == 0), cx + dx + (dx == 0), cy + dy + (dy == 0), 'dark')
    for dx, dy in ((9, -16), (16, -9), (16, 9), (9, 16), (-9, 16), (-16, 9), (-16, -9), (-9, -16)): b.r(cx + dx, cy + dy, cx + dx, cy + dy, 'grey')
    b.r(cx - 1, cy - 10, cx + 1, cy, 'dark').r(cx, cy - 16, cx, cy - 11, 'dark')   # hour (thick, short) under minute (thin, long): both on 12
    return b.r(cx - 1, cy - 1, cx + 1, cy + 1, 'mouth').im
def parcel():   # 14x10 closed cardboard box, tape down the middle, blank white label on the front
    b = L(14, 10).r(0, 0, 13, 2, 'wall_sh').r(0, 3, 13, 9, 'floor').r(12, 3, 13, 9, 'floor_sh').r(0, 9, 13, 9, 'floor_sh')
    return b.r(6, 0, 7, 4, 'cream').r(2, 5, 5, 7, 'white').r(3, 6, 4, 6, 'grey').im
LABEL_RECT = {'x': 13, 'y': 25, 'w': 34, 'h': 14}
def label_insert():   # 60x58 close on the box top: cardboard, tape band, blank label (grey rules), plain red stamp square; engine draws the address in LABEL_RECT
    b = L(IW, IH).r(0, 0, IW - 1, IH - 1, 'floor').r(0, 6, IW - 1, 14, 'cream').r(0, 14, IW - 1, 14, 'wall_sh')
    for x0, y in ((4, 48), (30, 52), (44, 46), (8, 20)): b.r(x0, y, x0 + 8, y, 'floor_sh')
    b.r(11, 21, 49, 44, 'silver').r(10, 20, 48, 43, 'white').r(42, 22, 46, 27, 'mouth').r(43, 23, 45, 26, 'red_sh')
    return b.im
def teapot():   # 11x8 white teapot: knob, lid, gold band, spout right, handle loop left
    b = L(11, 8).r(5, 0, 5, 0, 'gold').r(3, 1, 7, 1, 'silver').r(2, 2, 8, 6, 'white').r(3, 7, 7, 7, 'silver').r(8, 3, 8, 6, 'silver').r(2, 4, 8, 4, 'gold')
    return b.r(0, 3, 1, 3, 'silver').r(0, 4, 0, 5, 'silver').r(1, 6, 1, 6, 'silver').r(9, 4, 9, 5, 'white').r(10, 2, 10, 3, 'white').im
def jar():   # 7x9 cagnotte: silver lid with a dark coin slot, glass (sky) with a white glint, coins as plain gold/silver discs
    b = L(7, 9).r(0, 0, 6, 1, 'silver').r(2, 0, 4, 0, 'dark').r(0, 2, 6, 8, 'sky').p([(0, 8), (6, 8)], 'grey').r(1, 3, 1, 5, 'white')
    return b.r(2, 7, 5, 7, 'gold').r(1, 6, 3, 6, 'orange_sh').r(4, 5, 5, 6, 'silver').r(2, 5, 3, 5, 'gold').im
def radiator():   # 16x13 white column radiator on short legs, grey valve bottom right
    b = L(16, 13).r(0, 0, 15, 0, 'silver').r(0, 1, 15, 9, 'white').r(0, 10, 15, 10, 'silver')
    for x in range(2, 15, 3): b.r(x, 1, x, 9, 'silver')
    return b.r(1, 11, 1, 12, 'grey').r(14, 11, 14, 12, 'grey').r(15, 9, 15, 11, 'grey').im
young = {v: Image.open(f'{SETS}/rooftop/pieces/{v}/pot_chez_nous_young.png').convert('RGBA') for v in ('day', 'evening', 'night')}
def newleaf(v):   # Rev 5.1: 18x26 (box widened right, anchor (7,25) unchanged): young + a new leaf on its own stem sticking up-right; green body, cream midrib, gold tips
    im = Image.new('RGBA', (18, 26)); im.alpha_composite(young[v]); b = L(18, 26); b.im = im
    b.p([(12, 5), (12, 4), (13, 3), (14, 3)], 'green_sh')
    b.r(15, 0, 16, 0, 'green').r(14, 1, 17, 2, 'green').r(15, 3, 16, 3, 'green')
    b.p([(15, 2), (16, 1)], 'cream'); b.p([(17, 0), (14, 1)], 'gold'); return b.im
def leaf_insert(i):   # 60x58 close: sky, old leaves (green/green_sh) left, the new leaf big on its own stem right (cream midrib, gold rim); .1 adds a white glint
    b = L(IW, IH).r(0, 0, IW - 1, IH - 1, 'sky').r(0, 30, IW - 1, IH - 1, 'wall')
    b.r(6, 44, 53, 57, 'orange').r(4, 42, 55, 45, 'orange').r(4, 45, 55, 45, 'orange_sh').r(6, 50, 53, 55, 'sky').r(26, 51, 33, 54, 'pink')
    b.r(18, 22, 20, 42, 'green_sh')
    for (x0, y0, x1, y1) in ((6, 26, 18, 32), (8, 33, 19, 37), (20, 28, 30, 34), (21, 35, 28, 39), (10, 20, 18, 25)): b.r(x0, y0, x1, y1, 'green').r(x0, y1, x1, y1, 'green_sh')
    b.p([(20 + k, 21 - k) for k in range(12)] + [(21 + k, 21 - k) for k in range(12)], 'green_sh')
    for y in range(3, 20):
        for x in range(28, 56):
            if ((x - 42) / 13) ** 2 + ((y - 11) / 7.5) ** 2 <= 1: b.p([(x, y)], 'green')
    b.p([(32 + k, 16 - k // 2) for k in range(20)], 'cream'); b.r(50, 6, 54, 7, 'gold').r(30, 15, 31, 17, 'gold')
    if i: b.r(45, 2, 45, 8, 'white').r(42, 5, 48, 5, 'white').p([(44, 4), (46, 6), (44, 6), (46, 4)], 'cream')
    return b.im
R5 = {'prop.insert_new_leaf.0': leaf_insert(0), 'prop.insert_new_leaf.1': leaf_insert(1), 'prop.insert_clock_midnight': clock_insert(), 'prop.insert_parcel_label': label_insert(), 'prop.parcel_closed': parcel(), 'handprop.teapot': teapot(), 'prop.cagnotte_jar': jar(), 'prop.radiator': radiator()}
R5L = {f'prop.pot_chez_nous_newleaf.{v}': newleaf(v) for v in ('day', 'evening', 'night')}
for n, im in {**R5, **R5L}.items(): assert not {c for c in im.get_flattened_data() if c[3] == 255 and c not in allowed}, n
sh5, pos5 = pack({**R5, **R5L}, 128); sh5.save(f'{D}/sitcom_rev5_sheet.png'); man['atlases']['sitcom_rev5'] = {'file': 'sitcom_rev5_sheet.png', 'w': sh5.width, 'h': sh5.height}
NOTE5 = {'prop.insert_clock_midnight': ('Day 11 midnight close: both hands on 12, no numerals; engine may caption « 00:00 »', {}),
         'prop.insert_parcel_label': ('Day 13 close on the parcel label: blank label (grey rules, red stamp square, no letters); engine renders « Mme Martin, Quimper » inside textRect', {'textRect': LABEL_RECT}),
         'prop.parcel_closed': ('Day 13 closed parcel for table4; proposed table4 mark table_parcel (118,119) = table centre (cup/milk off for this beat)', {'slots': {'top': {'x': 7, 'y': 0}}}),
         'handprop.teapot': ('Days 14-18 teapot (replaces the tea_green tin stand-in); table4 slot: any plate gap, e.g. (118,119)', {}),
         'prop.cagnotte_jar': ('Days 14/17 cagnotte: glass jar, coins as plain discs; kitchen shelf or table (118,119)', {}),
         'prop.radiator': ('Day 15 kitchen radiator (kitchen had none): proposed wall slot (80,129) baseline = x72-87 between counter end (70) and table4 chair (90), clear of window/shelf/clock; slots top for gloves/cat (« Sur le radiateur »), under (« Sous le radiateur »)', {'slots': {'top': {'x': 8, 'y': 0}, 'under': {'x': 8, 'y': 12}}})}
for n, im in {**R5, **R5L}.items():
    fn = n.replace('.', '_'); ins = n.startswith('prop.insert')
    a = {'source': 'atlas', 'atlas': 'sitcom_rev5', 'frame': {'x': pos5[n][0], 'y': pos5[n][1], 'w': im.width, 'h': im.height}, 'pixelScale': 1, 'file': f'pieces/x1/{fn}.png'}
    if ins: a.update(anchor='topleft', anchorPoint={'x': 0, 'y': 0}, depth=7, insert=True)
    elif n.startswith('prop.pot_chez'): a.update(anchor='feet', anchorPoint={'x': 7, 'y': 25}, depth=3, special='pot 1 Chez nous', note='Day 14 « une nouvelle feuille »: young + a new leaf on its own stem (up-right, cream midrib, gold tips); 18x26, anchor (7,25) same as young, swap in place at (70,134); pair with narrator « Une nouvelle feuille »')
    else: a.update(anchor='feet', anchorPoint={'x': im.width // 2, 'y': im.height - 1}, depth=3)
    if n in NOTE5: a['note'] = NOTE5[n][0]; a.update(NOTE5[n][1])
    man['assets'][n] = a; im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1); props.update(R5)
cs = Image.new('RGBA', (sum(i.width + 2 for i in {**R5, **R5L}.values()), 60), C('wall')); x = 0
for im in {**R5, **R5L}.values(): cs.alpha_composite(im, (x, 59 - im.height)); x += im.width + 2
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/composites/rev5_contact_x8.png')
insert_phone(R5['prop.insert_clock_midnight'], 'phone_day11_clock_insert'); insert_phone(R5['prop.insert_parcel_label'], 'phone_day13_parcel_label_insert')
room = kitchen(); pr = layer(); prop(pr, 'prop.parcel_closed', 118, 119); room.alpha_composite(pr); cast = layer(); put(cast, 'camille.stand', 100, K.FEET)
room.alpha_composite(cast); room.save(f'{D}/composites/day13_parcel_table_x1.png'); portrait(room, 18, (88, 85), 'phone_day13_parcel_close')
room = kitchen(); pr = layer(); prop(pr, 'handprop.glove_loose', 95, 125); room.alpha_composite(pr); room.save(f'{D}/composites/day18_glove_chair_x1.png'); portrait(room, 18, (78, 85), 'phone_day18_glove_chair_close')
man['assets']['prop.insert_new_leaf'] = {'type': 'sequence', 'frames': ['prop.insert_new_leaf.0', 'prop.insert_new_leaf.1'], 'fps': 2, 'note': 'Day 14 « Une nouvelle feuille » close, 2-frame glint'}; json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
fr = [insert_phone(R5[f'prop.insert_new_leaf.{i}'], f'phone_day14_newleaf_close_f{i}').convert('RGB') for i in (0, 1)]; fr[0].save(f'{D}/composites/phone_day14_newleaf_close.gif', save_all=True, append_images=fr[1:], duration=500, loop=0)
for f in ('phone_day14_newleaf_close.png', 'day14_newleaf_x1.png'):
    if os.path.exists(f'{D}/composites/{f}'): os.remove(f'{D}/composites/{f}')
room = kitchen(); pr = layer(); prop(pr, 'prop.radiator', 80, 129); prop(pr, 'handprop.teapot', 118, 119); prop(pr, 'prop.cagnotte_jar', 131, 119); room.alpha_composite(pr); room.save(f'{D}/composites/day15_radiator_x1.png'); portrait(room, 12, (50, 56), 'phone_day15_radiator_teapot_medium')
print('rev5 ok', len(man['assets']))
# ---------------- Rev 5.2: Day 11 photo « plant + tail photobomb » (replaces the green-rect placeholder) ----------------
PW, PH = 46, 51   # engine phone-overlay screen: measured 184x204 css px in the p2r2 renders = 46x51 at 4x
def photo_plant_tail():   # Rev 5.3: real rooftop background (rooftop set sky/parapet/deck) + smooth S-curve tail from the lower-right edge
    st = Image.new('RGBA', (192, 144), (0, 0, 0, 0))
    for x in range(0, 192, 64): st.alpha_composite(rd['deck'], (x, R.HORIZON))
    for x in range(0, 192, 32): st.alpha_composite(rd['parapet'], (x, R.PARAPET_TOP))
    y0 = 144 - PH; bg = st.crop((40, y0, 40 + PW, y0 + PH)); b = L(PW, PH).r(0, 0, PW - 1, PH - 1, "sky"); b.im.alpha_composite(bg)
    b.r(4, 3, 9, 6, 'white').r(3, 4, 11, 5, 'white')   # one soft cloud
    pot = young['day'].resize((28, 52), Image.NEAREST); b.im.alpha_composite(pot, (4, -2))
    import math
    def qb(t, A, B, Cc): return tuple((1 - t) ** 2 * A[i] + 2 * (1 - t) * t * B[i] + t * t * Cc[i] for i in (0, 1))
    pts = [(qb(t, (52, 47), (41, 9), (35.5, 21)), 5.2 - 3.0 * t + (0.7 * (t - 0.85) / 0.15 if t > 0.85 else 0)) for t in (k / 300 for k in range(301))]   # Rev 5.4: one broad open arc from the right edge, tip dipping toward the pot, rounded & slightly fuller
    m = np.zeros((PH, PW), bool)
    for y in range(PH):
        for x in range(PW):
            m[y, x] = any((x - cx) ** 2 + (y - cy) ** 2 <= r * r for (cx, cy), r in pts)
    for y in range(PH):
        for x in range(PW):
            if m[y, x]:
                rim = not (y + 1 < PH and m[y + 1, x])
                b.p([(x, y)], 'orange_sh' if rim else 'orange')
    return b.im
PHOTO = photo_plant_tail()
TINY = L(2, 4).r(0, 0, 1, 1, 'green').r(0, 2, 1, 3, 'orange').p([(1, 3)], 'orange_sh').im   # handprop.phone screen (x1-2, y1-4): plant over pot, tail not resolvable at 2x4
def photo_insert(v):   # 60x58 close: phone (dark body) held in a skin hand, screen = PHOTO 1:1 ungraded (lamp rule); evening/night: dimmed surround + 1px glow ring
    bg, ring, sk, sks, cuff = {'day': ('wall', 'wall', 'skin', 'skin_sh', 'plum'), 'evening': ('floor_sh', 'floor', 'skin_sh', 'red_sh', 'plum_sh'), 'night': ('navy_sh', 'navy', 'skin_sh', 'red_sh', 'plum_sh')}[v]
    b = L(IW, IH).r(0, 0, IW - 1, IH - 1, bg)
    if v != 'day': b.r(4, 0, 55, IH - 1, ring)
    b.r(5, 1, 54, 57, 'dark'); b.im.alpha_composite(PHOTO, (7, 3)); b.r(26, 55, 33, 55, 'grey')
    b.r(0, 38, 7, 57, sk).r(0, 52, 7, 57, sks).r(6, 36, 8, 47, sk).r(8, 38, 8, 46, sks).r(0, 54, 3, 57, cuff)   # left hand, thumb on the bezel (not on the photo)
    b.r(53, 40, 59, 57, sk).r(53, 40, 53, 52, sks).r(56, 54, 59, 57, cuff)
    return b.im
R52 = {'prop.photo_plant_tail.screen': PHOTO, 'prop.photo_plant_tail.tiny': TINY, **{f'prop.insert_photo_plant_tail.{v}': photo_insert(v) for v in ('day', 'evening', 'night')}}
for n, im in R52.items(): assert not {c for c in im.get_flattened_data() if c[3] != 255 or c not in allowed}, n
sh52, pos52 = pack(R52, 128); sh52.save(f'{D}/sitcom_rev52_sheet.png'); man['atlases']['sitcom_rev52'] = {'file': 'sitcom_rev52_sheet.png', 'w': sh52.width, 'h': sh52.height}
N52 = {'prop.photo_plant_tail.screen': ('Day 11 photo (plant + Croissant tail photobomb from the right edge), daylight content; 46x51 = engine phone-overlay screen (184x204 css px at 4x); self-lit: never grade', {'selfLit': True}),
       'prop.photo_plant_tail.tiny': ('2x4 screen for handprop.phone (paste at phone-local (1,1)); self-lit', {'selfLit': True, 'fitsIn': 'handprop.phone screen x1-2 y1-4'}),
       'prop.insert_photo_plant_tail.day': ('close insert, phone in hands, photo 1:1 at screenRect; surroundings day', {}),
       'prop.insert_photo_plant_tail.evening': ('as .day; surround dimmed + 1px glow ring; screen ungraded (lamp rule) - do not grade this asset', {}),
       'prop.insert_photo_plant_tail.night': ('as .day; surround navy + 1px glow ring; screen ungraded (lamp rule) - do not grade this asset', {})}
for n, im in R52.items():
    fn = n.replace('.', '_'); a = {'source': 'atlas', 'atlas': 'sitcom_rev52', 'frame': {'x': pos52[n][0], 'y': pos52[n][1], 'w': im.width, 'h': im.height}, 'pixelScale': 1, 'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'depth': 7, 'file': f'pieces/x1/{fn}.png', 'note': N52[n][0]}
    a.update(N52[n][1])
    if 'insert_' in n: a.update(insert=True, screenRect={'x': 7, 'y': 3, 'w': PW, 'h': PH})
    man['assets'][n] = a; im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
cs = Image.new('RGBA', (sum(i.width + 3 for i in R52.values()), 60), C('wall')); x = 0
for im in R52.values(): cs.alpha_composite(im, (x, 59 - im.height)); x += im.width + 3
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/composites/photo_plant_tail_contact_x8.png')
# mockups: d11_cam_queue overlay (kitchen behind, dimmed; screen at 11x centred in the scene band), n_d11_regard (stairwell medium, tiny screen in Lefèvre's hand), n_d11_souvenir (close insert, evening)
ov = portrait(kitchen(), 12, (60, 56), 'tmp_r52').convert('RGBA'); ov.alpha_composite(Image.new('RGBA', (1080, 1920), (0, 0, 0, 110)))
bz = Image.new('RGBA', (PW * 11 + 44, PH * 11 + 44), C('dark')); bz.alpha_composite(PHOTO.resize((PW * 11, PH * 11), Image.NEAREST), (22, 22)); ov.alpha_composite(bz, ((1080 - bz.width) // 2, 288 + (1056 - bz.height) // 2))
ov.convert('RGB').save(f'{D}/composites/phone_d11_cam_queue_overlay.png'); os.remove(f'{D}/composites/tmp_r52.png')
room = S.stage('day', sd); cast = layer(); put(cast, 'lefevre.stand', 78, 136)
ph = frame('handprop.phone')[0].copy() if 'handprop.phone' in FR else props['handprop.phone'].copy(); ph.alpha_composite(TINY, (1, 1)); reg = cast.crop((70, 111, 88, 125)); cast.paste((0, 0, 0, 0), (70, 111, 88, 125)); cast.alpha_composite(reg, (70, 112))   # head tilted 1px down toward the phone
cast.alpha_composite(ph, (76, 126))   # phone at chest height, face clear
room.alpha_composite(cast); room.save(f'{D}/composites/n_d11_regard_x1.png'); portrait(room, 18, (50, 85), 'phone_n_d11_regard_close'); portrait(room, 12, (44, 56), 'phone_n_d11_regard_medium')
for v in ('day', 'evening', 'night'): insert_phone(R52[f'prop.insert_photo_plant_tail.{v}'], f'phone_n_d11_souvenir_insert_{v}')
print('rev5.2 ok', len(man['assets']))

# ---------------- Rev 5.5: lefevre.pose.look_phone (n_d11_regard « elle a regardé la photo longtemps. Elle a souri. ») ----------------
def look_phone(smile, gownv=False):   # Rev 5.5: Lefèvre looks down at her phone (screen toward her); head tilted 1px down, eyes down / closed-eye smile
    ch = CH4['lefevre']; sl, sr, t = ch['sl'], ch['sr'], ch['top']; slv = 'pink' if gownv else ch['sleeve']
    hd = L(HW, HH)   # Rev 5.5b: glasses dropped in this pose so the eyes read; small face = shapes only
    if smile: hd.p([(4, 7), (5, 6), (6, 7), (9, 7), (10, 6), (11, 7)], 'dark').p([(4, 8), (11, 8)], 'pink').p([(6, 8), (7, 9), (8, 9), (9, 8)], 'skin_sh')   # happy closed-eye arcs, blush, closed smile line corners up
    else: hd.r(5, 6, 6, 6, 'skin_sh').r(9, 6, 10, 6, 'skin_sh').p([(6, 7), (9, 7)], 'dark').r(7, 9, 8, 9, 'skin_sh')   # heavy lids, pupils on the bottom row = looking down; neutral closed mouth
    face = shift(comp(ch['head'], hd.im), 0, 1)
    case, case_sh = ('orange', 'orange_sh') if gownv else ('pink', 'red_sh')
    a = L(HW, HH).p([(sl + 1, t + 1), (sl + 1, t + 2), (sr - 1, t + 1), (sr - 1, t + 2)], slv)   # forearms bent up
    a.r(6, t + 2, 9, t + 4, case).r(6, t + 4, 9, t + 4, case_sh).p([(7, t + 2), (8, t + 2)], 'sky')   # light-case phone held out below the chin, screen edge glows up at her face
    a.p([(5, t + 3), (10, t + 3), (5, t + 4), (10, t + 4)], 'skin')   # hands on the sides
    if gownv:
        rb = L(HW, HH).r(4, 11, 11, 20, 'pink').p([(6, 11), (6, 12), (7, 13), (9, 11), (9, 12), (8, 13)], 'plum').r(7, 11, 8, 12, 'cream').r(4, 15, 11, 15, 'plum')
        rb.p([(9, 16), (9, 17), (10, 17)], 'plum').p([(5, 18), (5, 19), (10, 19)], 'plum_sh').r(4, 22, 6, 22, 'cream').r(9, 22, 11, 22, 'cream')
        legs = L(HW, HH).r(5, 21, 6, 21, 'skin_sh').r(9, 21, 10, 21, 'skin_sh').im
        return comp(ch['shadow'], legs, rb.im, face, a.im)
    bd = ch['body'].copy(); bd.paste((0, 0, 0, 0), (sl, t + 2, sl + 1, HH)); bd.paste((0, 0, 0, 0), (sr, t + 2, sr + 1, HH))   # drop the hanging arms
    return comp(ch['shadow'], ch['legs'], bd, face, a.im)
LP = {f'lefevre.pose.look_phone_f{i}': look_phone(i == 1) for i in (0, 1)}
LP.update({f'lefevre.pose.look_phone_gown_f{i}': look_phone(i == 1, True) for i in (0, 1)})
GLOW = L(HW, HH).p([(6, 11), (9, 11)], 'sky').p([(5, 14), (10, 14)], 'sky').im   # faint cool spill: under the jaw + top of both hands (evening/night only)
for k in [k for k in man['assets'] if k.startswith('lefevre.pose.look_phone') and k.count('.') > 2]: del man['assets'][k]
R55 = {**LP, 'lefevre.overlay.phone_glow': GLOW}
for n, im in R55.items(): assert not {c for c in im.get_flattened_data() if c[3] == 255 and c not in allowed}, n
sh55, pos55 = pack(R55, 96); sh55.save(f'{D}/sitcom_rev55_sheet.png'); man['atlases']['sitcom_rev55'] = {'file': 'sitcom_rev55_sheet.png', 'w': sh55.width, 'h': sh55.height}
for n, im in R55.items():
    fn = n.replace('.', '_'); a = {'source': 'atlas', 'atlas': 'sitcom_rev55', 'frame': {'x': pos55[n][0], 'y': pos55[n][1], 'w': 16, 'h': 24}, 'pixelScale': 1, 'anchor': 'feet', 'anchorPoint': {'x': 8, 'y': 23}, 'file': f'pieces/x1/{fn}.png'}
    if 'overlay' in n: a.update(overlay=True, ungraded=True, onlyGrades=['evening', 'night'], fitsPoses=['lefevre.pose.look_phone_f0', 'lefevre.pose.look_phone_f1', 'lefevre.pose.look_phone_gown_f0', 'lefevre.pose.look_phone_gown_f1'], note='cool screen spill on jaw + hands; draw AFTER the cast grade, evening/night only')
    else: a.update(handPoint={'x': 7, 'y': 13}, note='phone seen from the back (screen faces her); head tilted 1px down; .0 eyes down, .1 closed-eye smile' + ('; dressing-gown variant' if 'gown' in n else ''))
    man['assets'][n] = a; im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((128, 192), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
for sq in ('look_phone', 'look_phone_gown'):
    man['assets'][f'lefevre.pose.{sq}'] = {'type': 'sequence', 'frames': [f'lefevre.pose.{sq}_f0', f'lefevre.pose.{sq}_f1'], 'fps': 1, 'durations': [1200, 0], 'loop': False, 'note': 'f0 hold 1200 ms, then f1 holds to the end of the shot (0 = hold)'}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
fr55 = []
for v in ('day', 'evening', 'night'):
    sv = sd if v == 'day' else {n: S.piece(n, v) for n in S.PIECES}
    for i in (0, 1):
        room = S.stage(v, sv); cast = layer(); p = LP[f'lefevre.pose.look_phone_f{i}']; cast.alpha_composite(SHADOW, (74, 137)); cast.alpha_composite(p, (78 - 8, 136 - 23))
        if v != 'day':
            M, _, _, A = S.lightmap(v); room = S.grade(room, M, 1.0, A); cast = S.grade(cast, M, 0.25, A, 0.6); cast.alpha_composite(GLOW, (70, 113))
        S.emitters(v, sv, room); room.alpha_composite(cast)
        nm = f'phone_n_d11_regard_medium{"" if v == "day" else "_" + v}_f{i}'; out = portrait(room, 12, (44, 56), nm)
        if v == 'day': fr55.append(out.convert('RGB').resize((360, 640), Image.NEAREST))
for v in ('day', 'night'):   # Rev 5.5b: close 18x proposal
    sv = sd if v == 'day' else {n: S.piece(n, v) for n in S.PIECES}
    for i in (0, 1):
        room = S.stage(v, sv); cast = layer(); cast.alpha_composite(SHADOW, (74, 137)); cast.alpha_composite(LP[f'lefevre.pose.look_phone_f{i}'], (70, 113))
        if v != 'day':
            M, _, _, A = S.lightmap(v); room = S.grade(room, M, 1.0, A); cast = S.grade(cast, M, 0.25, A, 0.6); cast.alpha_composite(GLOW, (70, 113))
        S.emitters(v, sv, room); room.alpha_composite(cast); portrait(room, 18, (48, 82), f'phone_n_d11_regard_close{"" if v == "day" else "_" + v}_f{i}')
fr55[0].save(f'{D}/composites/phone_n_d11_regard_medium.gif', save_all=True, append_images=[fr55[1]], duration=[1200, 2400], loop=0)
print('rev5.5 ok', len(man['assets']))
