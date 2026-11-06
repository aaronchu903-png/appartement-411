"""P0 props for the D1-3 playtest (style B, 28-colour palette, own code art, $0). Writes ONLY inside days_01_03/.
Merges into manifest.json -> run after gen_days.py (gen_days.py calls this at its end).
Contact rule: hard 1 px on-palette row, no alpha. Table top = wood -> baked ink #4a3328. Wall items: none."""
import os, sys, json
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); SETS = os.path.join(D, '..'); CAN = os.path.join(SETS, '..'); SD = f'{SETS}/sitcom_d11_17'
sys.path.insert(0, f'{SETS}/kitchen'); import gen_kitchen as K
PAL = json.load(open(f'{CAN}/palette.json')); assert len(PAL) == 28
def C(k): h = PAL[k]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def L(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def R(im, x0, y0, x1, y1, k):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): im.putpixel((x, y), C(k))
def P(im, pts, k):
    for p in pts: im.putpixel(p, C(k))

def calendar():   # 12x13, topleft anchor (5,0)
    im = L(12, 13)
    R(im, 11, 2, 11, 12, 'wall_sh'); R(im, 1, 12, 11, 12, 'wall_sh')          # drop shadow
    R(im, 0, 1, 10, 2, 'mouth'); R(im, 0, 3, 10, 3, 'red_sh')               # header
    R(im, 0, 4, 10, 11, 'white')
    for y in (5, 7, 9):
        for x in (1, 3, 5, 7, 9): im.putpixel((x, y), C('silver'))
    for x in range(6, 9):
        for y in range(6, 9):
            if (x, y) != (7, 7): im.putpixel((x, y), C('mouth'))              # ring around Saturday cell (7,7)
    R(im, 3, 0, 3, 1, 'dark'); R(im, 7, 0, 7, 1, 'dark')                      # binder rings
    return im
def toast_plate():   # 12x6, baseline (6,4)
    im = L(12, 6)
    R(im, 3, 0, 8, 0, 'gold'); R(im, 2, 1, 9, 2, 'gold'); R(im, 2, 3, 9, 3, 'orange_sh'); P(im, [(9, 1), (9, 2), (8, 0)], 'orange_sh')
    P(im, [(4, 1), (7, 1)], 'cream')                                          # scores
    R(im, 0, 3, 1, 3, 'silver'); R(im, 10, 3, 11, 3, 'silver'); R(im, 1, 4, 10, 4, 'white'); P(im, [(0, 4), (11, 4)], 'silver')
    R(im, 2, 5, 9, 5, 'ink')                                                   # contact
    R(im, 1, 4, 1, 4, 'silver'); R(im, 10, 4, 10, 4, 'silver')
    return im
def jam_jar():   # 6x9, baseline (3,7)
    im = L(6, 9)
    R(im, 1, 0, 4, 0, 'gold'); R(im, 0, 1, 5, 1, 'gold'); P(im, [(5, 1), (4, 0)], 'orange_sh')   # lid
    R(im, 0, 2, 5, 2, 'silver')                                                # glass rim
    R(im, 0, 3, 5, 7, 'mouth'); R(im, 5, 3, 5, 7, 'red_sh'); R(im, 0, 7, 5, 7, 'red_sh')
    P(im, [(1, 3), (1, 4)], 'white')                                           # glint
    R(im, 0, 5, 4, 6, 'cream'); P(im, [(1, 5)], 'white')                       # blank label
    R(im, 0, 8, 5, 8, 'ink')                                                   # contact
    return im
def parcel_table():   # 14x11, baseline (7,9)
    pc = Image.open(f'{SD}/pieces/x1/prop_parcel_closed.png').convert('RGBA'); assert pc.size == (14, 10)
    im = L(14, 11); im.alpha_composite(pc); R(im, 0, 10, 13, 10, 'ink'); return im

PROPS = {'prop.wall_calendar': (calendar(), (0, 0), 'topleft', (5, 0)), 'prop.parcel_closed_table': (parcel_table(), (13, 0), 'baseline', (7, 9)),
         'prop.jam_jar': (jam_jar(), (28, 0), 'baseline', (3, 7)), 'prop.toast_plate': (toast_plate(), (35, 0), 'baseline', (6, 4))}
OK = set(C(k) for k in PAL)
for n, (im, *_) in PROPS.items():
    for px in im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata(): assert px[3] in (0, 255) and (px[3] == 0 or px in OK), (n, px)
sh = L(48, 13)
for n, (im, xy, *_) in PROPS.items(): sh.alpha_composite(im, xy)
sh.save(f'{D}/days_props2_sheet.png')
for d in ('pieces/x1', 'pieces/x8', 'composites'): os.makedirs(f'{D}/{d}', exist_ok=True)
INK = 'baked:ink #4a3328 (last row; table top is wood #885939 -> LUT ink)'
EXTRA = {
 'prop.wall_calendar': {'contact': 'none (wall item)', 'depth': 1, 'slots': {'kitchen_wall_calendar': {'x': 126, 'y': 74}},
    'beat': 'd1 hook h (night) + insert_calendar', 'note': 'occupies x121-132 y74-86; moved +6 from Rev3.1 mark (120,74) because the night pendant cord x118 y66-95 crosses it; same pixels per variant, graded in code with room light'},
 'prop.toast_plate': {'contact': INK, 'slots': {'kitchen_table_top': {'x': 118, 'y': 119}}, 'beat': 'd2 a2_pain', 'registry': 'alias of handprop.toast_plate',
    'requires': 'hide table cup/milk/plate (x112-123) for the beat'},
 'prop.jam_jar': {'contact': INK, 'slots': {'kitchen_table_top': {'x': 118, 'y': 119}, 'kitchen_table_jam': {'x': 112, 'y': 119}}, 'beat': 'd3 hp, d3 hook h',
    'registry': 'alias of handprop.jam_jar', 'requires': 'hide table cup/milk/plate; use kitchen_table_jam when the card is also on table_top'},
 'prop.parcel_closed_table': {'contact': INK, 'slots': {'table_parcel': {'x': 118, 'y': 119}}, 'beat': 'd3 a2 (sur la table), d3 hp',
    'note': 'sitcom prop.parcel_closed (14x10) + ink contact row; parcel_closed_floor is NOT reused on the table'}}
man = json.load(open(f'{D}/manifest.json')); man['atlases']['days_props2'] = {'file': 'days_props2_sheet.png', 'w': 48, 'h': 13}
for n, (im, (x, y), anc, ap) in PROPS.items():
    fn = n.replace('.', '_'); im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
    a = {'source': 'atlas', 'atlas': 'days_props2', 'frame': {'x': x, 'y': y, 'w': im.width, 'h': im.height}, 'anchor': anc, 'anchorPoint': {'x': ap[0], 'y': ap[1]},
         'pixelScale': 1, 'depth': 5, 'file': f'pieces/x1/{fn}.png'}; a.update(EXTRA[n])
    if n == 'prop.wall_calendar':
        for v in ('day', 'evening', 'night'): man['assets'][f'{n}.{v}'] = dict(a, variant=v)
    else: man['assets'][n + '.any'] = a
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)

# ---------- composites (phone 390x844, scene band y128-591; screen = ((x-vx)k, 128+(y-vy)k)) ----------
ks = {v: ({n: K.piece(n, v) for n in K.PIECES}, None) for v in ('day', 'evening', 'night')}
DESKB = Image.open(f'{SD}/pieces/x1/desk_bare.png').convert('RGBA'); E = L(1, 1)
def scene(v, places, hide=()):
    d = dict(ks[v][0]); d['desk'] = DESKB; d['plant'] = L(8, 11)
    for h in hide: d[h] = E
    room = K.stage(v, {v: (d, None)}); M, A = K.baked_maps(v, ks); pr = L(192, 144)
    for n, x, y in places: im, _, _, ap = PROPS[n]; pr.alpha_composite(im, (x - ap[0], y - ap[1]))
    room = K.grade(room, M, 1.0, A); room.alpha_composite(K.grade(pr, M, 1.0, A))
    if v == 'night': room.alpha_composite(ks[v][0]['pendant_on'], (K.PENDANT_AT[0] - 4, K.PENDANT_AT[1]))
    return room
def phone(sc, vx, vy, k, name):
    W, H = -(-390 // k), 464 // k
    view = sc.crop((vx, vy, vx + W, vy + H)).resize((W * k, H * k), Image.NEAREST).crop((0, 0, 390, 464))
    out = Image.new('RGBA', (390, 844), (243, 240, 235, 255))
    out.paste(Image.new('RGBA', (390, 464), sc.getpixel((vx + 1, 143))), (0, 128)); out.alpha_composite(view, (0, 128))
    out.convert('RGB').save(f'{D}/composites/{name}.png')
def x4(sc, box, name): sc.crop(box).resize(((box[2] - box[0]) * 4, (box[3] - box[1]) * 4), Image.NEAREST).convert('RGB').save(f'{D}/composites/{name}.png')
TB = ('cup', 'milk', 'plate')
for v in ('day', 'evening', 'night'):
    s = scene(v, [('prop.wall_calendar', 126, 74)]); phone(s, 100, 72, 8, f'p0_props_d1_h_calendar_{v}_k8'); x4(s, (100, 60, 150, 100), f'p0_props_d1_h_calendar_{v}_x4')
    if v == 'night': phone(s, 76, 50, 4, 'p0_props_d1_h_calendar_night_k4_worstcase')
s = scene('day', [('prop.toast_plate', 118, 119)], TB); phone(s, 100, 92, 8, 'p0_props_d2_pain_toast_plate_k8'); x4(s, (96, 104, 146, 126), 'p0_props_d2_pain_toast_plate_x4')
s = scene('day', [('prop.jam_jar', 118, 119)], TB); phone(s, 100, 92, 8, 'p0_props_d3_hp_jam_jar_day_k8'); x4(s, (96, 104, 146, 126), 'p0_props_d3_hp_jam_jar_day_x4')
s = scene('night', [('prop.jam_jar', 118, 119)], TB); phone(s, 100, 92, 8, 'p0_props_d3_h_jam_jar_night_k8'); x4(s, (96, 104, 146, 126), 'p0_props_d3_h_jam_jar_night_x4')
s = scene('day', [('prop.parcel_closed_table', 118, 119)], TB); phone(s, 100, 92, 8, 'p0_props_d3_a2_parcel_table_k8'); x4(s, (96, 100, 146, 126), 'p0_props_d3_a2_parcel_table_x4')
s = scene('day', [('prop.jam_jar', 106, 119)], ('plate',)); x4(s, (96, 104, 146, 126), 'p0_props_jam_vs_cup_milk_day_x4')
cs = Image.new('RGBA', (76, 16), C('wall')); x = 2
for n in ('prop.wall_calendar', 'prop.toast_plate', 'prop.jam_jar', 'prop.parcel_closed_table'):
    im = PROPS[n][0]; cs.alpha_composite(im, (x, 14 - im.height)); x += im.width + 4
old = Image.open(f'{D}/pieces/x1/prop_parcel_closed_floor.png').convert('RGBA'); cs.alpha_composite(old, (x, 14 - old.height))
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/contact_sheet_p0_x8.png')
print('p0 ok', {n: v[1] for n, v in PROPS.items()}, sh.size)
