"""Days 1-3 add-on pack (style B, 28-colour palette). Own code art, $0.
Imports kitchen/stairwell drawing code + canonical rig in memory; reads approved PNGs; writes ONLY inside days_01_03/."""
import os, sys, json
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); SETS = os.path.join(D, '..'); CAN = os.path.join(SETS, '..'); SD = f'{SETS}/sitcom_d11_17'
sys.path.insert(0, f'{SETS}/kitchen'); sys.path.insert(0, f'{SETS}/stairwell')
import gen_kitchen as K, gen_stairwell as S
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
src = open(f'{CAN}/gen_canonical.py').read().split('# ---------- sheets')[0]
G = {'__name__': 'canon_mem', '__file__': f'{CAN}/gen_canonical.py'}; exec(compile(src, 'gen_canonical(mem)', 'exec'), G)
FR, CHARS, shift, comp = G['frames'], G['CHARS'], G['shift'], G['comp']
CW, CH = 14, 12
ld = lambda p: Image.open(p).convert('RGBA')
SHA = C('wood')[:3] + (90,)
def shadow_row(im, x0, x1, y):
    for x in range(x0, x1 + 1): im.putpixel((x, y), SHA)

# ---------- pot 1 "Chez nous", desk scale (10 wide), 3 stages; row h-1 = contact shadow on the desk top ----------
def pot_desk(stage):   # 10x17 for every stage: plant rows 0-7, soil row 8, pot rows 9-15, shadow row 16
    b = L(10, 17); t = 8
    if stage == 'sprout': b.p([(5, 7)], 'green_sh').p([(3, 6), (4, 6), (6, 6), (7, 6)], 'green')
    if stage == 'young': b.r(5, 4, 5, 7, 'green_sh').p([(3, 6), (4, 6), (6, 5), (7, 5), (3, 4), (4, 4), (6, 3)], 'green')
    if stage == 'full':
        b.p([(5, 0), (6, 0), (2, 1), (3, 1), (6, 1), (7, 1), (3, 2), (7, 3), (8, 3), (8, 2), (1, 4), (2, 4), (2, 3), (7, 5), (8, 5), (2, 6), (3, 6)], 'green')
        b.r(5, 1, 5, 7, 'green_sh').p([(4, 3), (6, 4), (3, 4), (4, 6), (6, 5)], 'green_sh')
    b.r(1, t, 8, t, 'ink').r(0, t + 1, 9, t + 1, 'orange')
    b.r(1, t + 2, 8, t + 7, 'orange').r(1, t + 3, 8, t + 5, 'sky').r(8, t + 2, 8, t + 7, 'orange_sh').r(8, t + 3, 8, t + 5, 'navy').r(2, t + 7, 7, t + 7, 'orange_sh')
    b.p([(2, t + 3), (3, t + 3), (5, t + 3), (6, t + 3)], 'pink').r(2, t + 4, 6, t + 4, 'pink').r(3, t + 5, 5, t + 5, 'pink')
    for x in range(1, 10): b.im.putpixel((x, 16), SHA)
    return b.im
POT = {s: pot_desk(s) for s in ('sprout', 'young', 'full')}
POT_AT = (177, 118)   # baseline: pot bottom row = stage y118 (same mark as the baked prop.plant), x172-181

# ---------- cat: curled asleep around the pot (pot drawn first, cat in front) ----------
def sleep_curl(breath):
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); sh = L(CW, CH).r(0, 11, 13, 11, 'wood').im; sh.putalpha(sh.getchannel('A').point(lambda a: 90 if a else 0)); im.alpha_composite(sh)
    body = L(CW, CH).r(2, 8, 10, 10, 'orange').p([(3, 9), (5, 9), (7, 9), (9, 9)], 'orange_sh').p([(10, 8)], 'orange_sh')
    if breath: body.r(4, 7, 8, 7, 'orange')
    im.alpha_composite(body.im)
    im.alpha_composite(L(CW, CH).r(9, 10, 13, 10, 'orange').p([(13, 9), (13, 8)], 'orange').p([(13, 10), (12, 10)], 'orange_sh').im)   # tail wraps the pot base, tip up its side
    hd = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); hd.alpha_composite(G['CHd']); hd.alpha_composite(G['CFACE']['blink']); im.alpha_composite(shift(hd, 0, 3)); return im
CAT_SLEEP_AT = (166, 119)   # feet anchor (6,11): canvas x160-173, overlaps the pot's left 2 cols, clear of laptop x165? (laptop off on Days 1-3: desk_bare)

# ---------- cat in box (reuses sitcom box_open / box_front) ----------
def box_cat(part):   # 18x12 cat-sized open carton, flaps up; back = flaps + dark inside, front = front wall (draw after the cat)
    b = L(18, 12)
    if part == 'back':
        b.r(0, 0, 1, 1, 'wall_sh').r(1, 2, 2, 5, 'wall_sh').r(16, 0, 17, 1, 'floor').r(15, 2, 16, 5, 'floor')   # flaps (left lit, right shaded)
        b.r(2, 3, 15, 5, 'floor_sh').r(3, 4, 14, 5, 'ink')
    b.r(1, 6, 16, 11, 'wall_sh').r(14, 6, 16, 11, 'floor').r(1, 6, 16, 6, 'cream').r(8, 6, 9, 11, 'cream').p([(14, 6), (15, 6), (16, 6)], 'wall_sh')
    return b.im
BOXB, BOXF = box_cat('back'), box_cat('front')
def in_box(ears=(0, 0), tail=0):   # 18x12 layer, same registration as prop.box_cat (baseline anchor 9,11)
    a = L(18, 12)
    for x, dy in ((6, ears[0]), (10, ears[1])): o = 1 if x == 6 else -1; a.p([(x, 3 + dy), (x, 4 + dy), (x, 5 + dy), (x + o, 4 + dy), (x + o, 5 + dy)], 'orange').p([(x + o, 5 + dy)], 'pink')
    a.r(6, 5, 10, 5, 'orange')
    tl = {1: [(13, 5)], 2: [(13, 5), (13, 4), (13, 3)], 3: [(13, 5), (13, 4), (13, 3), (13, 2), (13, 1), (12, 0)]}.get(tail, [])
    a.p(tl, 'orange');
    if tail >= 2: a.p([(13, 3)], 'orange_sh')
    return a.im
def cat_bowl(ripple=False):
    b = L(7, 4).r(1, 0, 5, 0, 'sky').r(0, 1, 6, 2, 'silver').r(6, 1, 6, 2, 'grey').r(1, 2, 5, 2, 'grey')
    if ripple: b.p([(2, 0)], 'white')
    for x in range(7): b.im.putpixel((x, 3), SHA)
    return b.im
def drink(i):   # crouched: body low, tail along the floor, head dropped forward so the muzzle sits at the bowl rim (bowl drawn after)
    im = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); im.alpha_composite(G['cshadow'])
    b = L(CW, CH).r(4, 8, 11, 10, 'orange').p([(5, 9), (7, 9), (9, 9)], 'orange_sh').p([(11, 8)], 'orange_sh').p([(4, 10), (6, 10), (9, 10), (11, 10)], 'orange_sh')
    b.p([(12, 10), (13, 10), (13, 9)], 'orange').p([(12, 9)], 'orange_sh'); im.alpha_composite(b.im)
    hd = comp(G['CHd'], G['CFACE']['blink'], size=(CW, CH)); im.alpha_composite(shift(hd, -1, 4 if i != 1 else 3))
    if i == 1: im.alpha_composite(L(CW, CH).p([(3, 11)], 'pink').im)
    return im
BOWL_DX = -5   # bowl baseline centre = cat feet x - 5, same y (bowl drawn after the cat)

# ---------- Noé: finger to lips ----------
noe = CHARS['noe']
def finger(i):   # right forearm up in front of the chest, index finger vertical on the mouth, left arm down, brows up / eyes wide
    arm = L(16, 24).p([(12, 11), (12, 12), (12, 13)], 'orange').p([(11, 14), (11, 13), (10, 13), (10, 12)], 'orange_sh').p([(9, 12), (9, 13)], 'orange')   # sleeve: shoulder -> elbow -> diagonal up across the chest
    arm.r(7, 11, 8, 12, 'skin').p([(7, 12), (8, 12)], 'skin_sh').p([(8, 9), (8, 10)], 'skin').p([(9, 10)], 'skin_sh')   # 2x2 fist under the mouth + 1x2 index over the mouth centre
    F = noe['faces']['brow_raise' if i == 0 else 'big-eyes']
    mouth = L(16, 24).p([(7, 9)], 'mouth').im
    return comp(noe['shadow'], noe['legs'], noe['body'], noe['arms'][('arm_l', 'down')], noe['head'], F[0], mouth, arm.im)
# ---------- parcels ----------
PC = ld(f'{SD}/pieces/x1/prop_parcel_closed.png'); PS = ld(f'{SETS}/stairwell/pieces/day/parcel.png')
def parcel_floor(): im = Image.new('RGBA', (16, 11), (0, 0, 0, 0)); shadow_row(im, 0, 15, 10); im.alpha_composite(PC, (1, 0)); return im
def parcel_shadow(): im = Image.new('RGBA', (16, 1), (0, 0, 0, 0)); shadow_row(im, 0, 15, 0); return im
def parcel_pair():
    im = Image.new('RGBA', (22, 11), (0, 0, 0, 0)); shadow_row(im, 0, 21, 10); im.alpha_composite(PC, (0, 0)); im.alpha_composite(PS.resize(PS.size), (13, 3)); return im

PROPS = {'prop.pot_desk_sprout': POT['sprout'], 'prop.pot_desk_young': POT['young'], 'prop.pot_desk_full': POT['full'], 'prop.cat_bowl': cat_bowl(), 'prop.cat_bowl_ripple': cat_bowl(True), 'prop.box_cat_back': BOXB, 'prop.box_cat_front': BOXF,
         'prop.parcel_closed_floor': parcel_floor(), 'prop.parcel_shadow': parcel_shadow(), 'prop.parcel_pair': parcel_pair()}
CATF = {'croissant.sleep_curl.0': sleep_curl(0), 'croissant.sleep_curl.1': sleep_curl(1), 'croissant.in_box.idle': in_box(), 'croissant.in_box.twitch': in_box((1, 0)),
        'croissant.in_box.tail_a': in_box(tail=1), 'croissant.in_box.tail_b': in_box(tail=2), 'croissant.in_box.tail_c': in_box(tail=3),
        'croissant.drink.0': drink(0), 'croissant.drink.1': drink(1)}
NOEF = {'noe.finger_to_lips.0': finger(0), 'noe.finger_to_lips.1': finger(1)}
SEQ = {'croissant.sleep_curl.loop': (['croissant.sleep_curl.0', 'croissant.sleep_curl.1'], [1400, 1000]),
       'croissant.in_box.loop': (['croissant.in_box.idle', 'croissant.in_box.twitch'], [1800, 160]),
       'croissant.in_box.tail_pop': (['croissant.in_box.tail_a', 'croissant.in_box.tail_b', 'croissant.in_box.tail_c'], [140, 140, 900]),
       'croissant.drink.loop': (['croissant.drink.0', 'croissant.drink.1'], [260, 200]),
       'noe.finger_to_lips.loop': (['noe.finger_to_lips.0', 'noe.finger_to_lips.1'], [900, 700])}

def pack(ims, W):
    x = y = rowh = 0; pos = {}
    for n, im in sorted(ims.items(), key=lambda t: (-t[1].height, t[0])):
        if x + im.width > W: x, y, rowh = 0, y + rowh + 1, 0
        pos[n] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
    sh = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for n, (a, b) in pos.items(): sh.alpha_composite(ims[n], (a, b))
    return sh, pos
for d in ('pieces/x1', 'pieces/x8', 'composites', 'gif'): os.makedirs(f'{D}/{d}', exist_ok=True)
man = {'assetRoot': '', 'atlases': {}, 'assets': {}, 'note': 'Days 1-3 pack. Props graded in code with room light (cast 0.25 mul / 0.6 add). See DAYS_01_03_NOTES.md'}
ANC = {}
for n, im in PROPS.items():
    w, h = im.size; ay = 0 if n == 'prop.parcel_shadow' else (h - 1 if 'box_cat' in n else h - 2); ANC[n] = (w // 2, ay)
for n in CATF: ANC[n] = (9, 11) if 'in_box' in n else (6, 11)
for n in NOEF: ANC[n] = (8, 23)
EXTRA = {'prop.pot_desk_sprout': {'slots': {'kitchen_desk': {'x': 177, 'y': 118}}, 'replaces': 'kitchen prop.plant (baked at 177,118) = pot 1 Chez nous', 'stage': 'Day 1 start'},
         'prop.pot_desk_young': {'slots': {'kitchen_desk': {'x': 177, 'y': 118}}, 'stage': 'Days 4-5'},
         'prop.pot_desk_full': {'slots': {'kitchen_desk': {'x': 177, 'y': 118}}, 'stage': 'Days 6-7'},
         'prop.cat_bowl': {'slots': {'kitchen_floor': {'x': 40, 'y': 136}}, 'catPoint': {'dx': 5, 'note': 'croissant.drink feet = bowl x + 5, same y'}},
         'prop.parcel_closed_floor': {'slots': {'kitchen_floor': {'x': 60, 'y': 136}, 'doormat_home': {'x': 78, 'y': 132}}, 'note': 'parcel_closed + baked contact shadow row'},
         'prop.parcel_shadow': {'note': 'drop under any parcel_closed: shadow x = parcel x - 8, y = parcel feet y + 1'},
         'prop.parcel_pair': {'slots': {'doormat_home': {'x': 78, 'y': 132}, 'kitchen_floor': {'x': 60, 'y': 136}}},
         'croissant.sleep_curl.0': {'slots': {'kitchen_desk': {'x': 166, 'y': 119}}, 'requires': 'prop.pot_desk_* at 177,118 drawn BEFORE the cat; prop.desk_bare'},
         'croissant.in_box.idle': {'note': 'layer between prop.box_cat_back and prop.box_cat_front, same anchor point; see NOTES.md'}}
for grp, ims, W in (('days_props', PROPS, 64), ('days_cat', CATF, 64), ('days_noe', NOEF, 34)):
    sh, pos = pack(ims, W); sh.save(f'{D}/{grp}_sheet.png'); man['atlases'][grp] = {'file': f'{grp}_sheet.png', 'w': sh.width, 'h': sh.height}
    for n, im in ims.items():
        fn = n.replace('.', '_'); im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
        a = {'source': 'atlas', 'atlas': grp, 'frame': {'x': pos[n][0], 'y': pos[n][1], 'w': im.width, 'h': im.height}, 'anchor': 'baseline' if grp == 'days_props' else 'feet',
             'anchorPoint': {'x': ANC[n][0], 'y': ANC[n][1]}, 'pixelScale': 1, 'depth': 3 if grp == 'days_props' else 4, 'file': f'pieces/x1/{fn}.png'}
        a.update(EXTRA.get(n, {}))
        if n.startswith('prop.pot_desk_'):
            for v in ('day', 'evening', 'night'): man['assets'][f'{n}.{v}'] = dict(a, variant=v, note='same pixels per variant; graded in code with room light (rooftop pot convention)')
            continue
        if grp == 'days_props': n = n + '.any'
        man['assets'][n] = a
for s, (fr, du) in SEQ.items(): man['assets'][s] = {'type': 'sequence', 'frames': fr, 'fps': round(1000 * len(du) / sum(du), 2), 'durations': du}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)

# ---------- composites ----------
ks = {v: ({n: K.piece(n, v) for n in K.PIECES}, None) for v in ('day', 'evening', 'night')}
ss = {v: ({n: S.piece(n, v) for n in S.PIECES}, None) for v in ('day', 'evening', 'night')}
DESKB = ld(f'{SD}/pieces/x1/desk_bare.png'); EMPTY = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
LY = lambda: Image.new('RGBA', (192, 144), (0, 0, 0, 0))
def base(im, s, x, y, ax, ay): s.alpha_composite(im, (x - ax, y - ay))
def kroom(v):
    d = dict(ks[v][0]); d['desk'] = DESKB; d['plant'] = Image.new('RGBA', (8, 11), (0, 0, 0, 0)); return K.stage(v, {v: (d, None)})
def kscene(v, props_fn, cast_fn):
    room = kroom(v); M, A = K.baked_maps(v, ks); pr = LY(); props_fn(pr); cast = LY(); cast_fn(cast)
    room = K.grade(room, M, 1.0, A); room.alpha_composite(K.grade(pr, M, 1.0, A))
    if v == 'night': room.alpha_composite(ks[v][0]['pendant_on'], (K.PENDANT_AT[0] - 4, K.PENDANT_AT[1]))
    room.alpha_composite(K.grade(cast, M, 0.25, A, 0.6)); return room
def sscene(v, props_fn, cast_fn):
    room = S.stage(v, ss[v][0]); M, _, _, A = S.lightmap(v); pr = LY(); props_fn(pr); cast = LY(); cast_fn(cast)
    out = S.grade(room, M, 1.0, A); out.alpha_composite(S.grade(pr, M, 1.0, A)); S.emitters(v, ss[v][0], out); out.alpha_composite(S.grade(cast, M, 0.25, A, 0.6)); return out
def portrait(sc, Kx, cam, name):
    W, H = -(-1080 // Kx), -(-1056 // Kx)
    view = sc.crop((cam[0], cam[1], cam[0] + W, cam[1] + H)).resize((W * Kx, H * Kx), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), sc.getpixel((cam[0] + W // 2, max(cam[1] - 4, 2)))); out.alpha_composite(view, (0, 288))
    fc = sc.getpixel((cam[0] + 1, 143)); out.alpha_composite(Image.new('RGBA', (1080, 576), tuple(int(c * 0.55) for c in fc[:3]) + (255,)), (0, 1344))
    out.convert('RGB').save(f'{D}/composites/{name}.png'); return out
def pp(s, n, x, y): im = PROPS[n]; base(im, s, x, y, *ANC[n])
SH9 = Image.new('RGBA', (9, 1), SHA)
def person(s, im, x, y): s.alpha_composite(im, (x - 8, y - 23))
def boxcat(s, f, x, y):
    for im in (BOXB, CATF[f], BOXF): s.alpha_composite(im, (x - 9, y - 11))
shots = {}
for v in ('day', 'evening', 'night'):
    shots[f'd1_desk_plant_sleep_{v}'] = (kscene(v, lambda p: pp(p, 'prop.pot_desk_sprout', *POT_AT), lambda c: base(CATF['croissant.sleep_curl.0'], c, *CAT_SLEEP_AT, 6, 11)), 18, (132, 90))
shots['d1_desk_plant_medium_day'] = (kscene('day', lambda p: pp(p, 'prop.pot_desk_sprout', *POT_AT), lambda c: (base(CATF['croissant.sleep_curl.0'], c, *CAT_SLEEP_AT, 6, 11), person(c, NOEF['noe.finger_to_lips.1'], 140, K.FEET))), 12, (102, 70))
shots['d2_in_box_day'] = (kscene('day', lambda p: None, lambda c: boxcat(c, 'croissant.in_box.tail_c', 60, K.FEET)), 18, (30, 90))
shots['d2_drink_day'] = (kscene('day', lambda p: None, lambda c: (base(CATF['croissant.drink.1'], c, 45, K.FEET, 6, 11), pp(c, 'prop.cat_bowl_ripple', 40, K.FEET))), 18, (15, 90))
shots['d1_chut_medium_day'] = (kscene('day', lambda p: pp(p, 'prop.pot_desk_sprout', *POT_AT), lambda c: (base(CATF['croissant.sleep_curl.0'], c, *CAT_SLEEP_AT, 6, 11), person(c, NOEF['noe.finger_to_lips.0'], 150, K.FEET))), 12, (102, 70))
shots['d3_parcel_pair_stairwell_day'] = (sscene('day', lambda p: pp(p, 'prop.parcel_pair', 78, 132), lambda c: None), 12, (30, 70))
shots['d3_parcel_kitchen_floor_day'] = (kscene('day', lambda p: pp(p, 'prop.parcel_closed_floor', 60, K.FEET), lambda c: None), 12, (20, 70))
for n, (sc, Kx, cam) in shots.items(): sc.save(f'{D}/composites/{n}_x1.png'); portrait(sc, Kx, cam, f'phone_{n}')
# stage-swap strip (3 stages, day)
for st in ('sprout', 'young', 'full'):
    sc = kscene('day', lambda p, st=st: pp(p, f'prop.pot_desk_{st}', *POT_AT), lambda c: None); portrait(sc, 18, (132, 90), f'phone_pot_desk_{st}_day')
# GIFs (8x, wall bg)
for s, (fr, du) in SEQ.items():
    ims = []
    for f in fr:
        im = (CATF.get(f) or NOEF.get(f)).copy(); bg = Image.new('RGBA', (22, 26), C('wall'))
        if 'in_box' in f: boxl = Image.new('RGBA', (18, 12), (0, 0, 0, 0)); boxcat(boxl, f, 9, 11); im = boxl
        if 'drink' in f: im = im.copy(); pp(im, 'prop.cat_bowl_ripple' if f.endswith('1') else 'prop.cat_bowl', 1, 11)
        if 'sleep' in f: l = Image.new('RGBA', (18, 18), (0, 0, 0, 0)); pp(l, 'prop.pot_desk_sprout', 11, 16); l.alpha_composite(im, (0, 5)); im = l
        bg.alpha_composite(im, ((22 - im.width) // 2, 26 - im.height - 1)); ims.append(bg.resize((176, 208), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
    ims[0].save(f'{D}/gif/{s}.gif', save_all=True, append_images=ims[1:], duration=du, loop=0, disposal=2)
# contact sheet 8x
rows = [[POT['sprout'], POT['young'], POT['full'], PROPS['prop.cat_bowl'], PROPS['prop.cat_bowl_ripple'], PROPS['prop.parcel_closed_floor'], PROPS['prop.parcel_pair']],
        [CATF['croissant.sleep_curl.0'], CATF['croissant.sleep_curl.1'], CATF['croissant.drink.0'], CATF['croissant.drink.1'], NOEF['noe.finger_to_lips.0'], NOEF['noe.finger_to_lips.1']],
        [BOXB] + [Image.alpha_composite(Image.alpha_composite(BOXB, CATF[f]), BOXF) for f in ('croissant.in_box.idle', 'croissant.in_box.twitch', 'croissant.in_box.tail_a', 'croissant.in_box.tail_b', 'croissant.in_box.tail_c')]]
cs = Image.new('RGBA', (150, 3 * 26), (0, 0, 0, 0))
for r, row in enumerate(rows):
    x = 2
    for im in row: cs.alpha_composite(im, (x, r * 26 + 25 - im.height)); x += im.width + 3
bg = Image.new('RGBA', cs.size, C('wall')); bg.alpha_composite(cs); bg.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/contact_sheet_x8.png')
print('ok', len(man['assets']))

# P0 props (days_props2) are merged into manifest.json by gen_days_p0.py
import runpy; runpy.run_path(f'{D}/gen_days_p0.py')
