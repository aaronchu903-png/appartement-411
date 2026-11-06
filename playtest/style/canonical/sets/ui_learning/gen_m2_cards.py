"""M2 card art (Days 1-3): word.<lemma>.any (60x40 = ui.card_picture_frame inner), prompt thumbs for listening /
dictation (60x40, same frame), placement scene (156x38, top of ui.placement_result panel at (8,8)).
Style B, 28-colour palette, no outlines (darker-tone edges only), no text/glyphs. Reuses approved PNGs + canonical rig.
Writes ONLY pieces/m2/*, ui_learning_m2.png and ADDS keys to manifest.json (rev2 keys untouched).
Art lives in pieces/m2 (not pieces/x1): it legitimately uses gold/pink/mouth (Croissant nose, mouths, bread),
which check_manifest.py bans for UI chrome in pieces/x1. Run AFTER gen_ui_learning.py (that one rewrites the manifest)."""
import os, json
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); SETS = os.path.join(D, '..'); CAN = os.path.join(SETS, '..')
PAL = json.load(open(f'{CAN}/palette.json')); assert len(PAL) == 28
def C(k): h = PAL[k]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
src = open(f'{CAN}/gen_canonical.py').read().split('# ---------- sheets')[0]
G = {'__name__': 'canon_mem', '__file__': f'{CAN}/gen_canonical.py'}; exec(compile(src, 'gen_canonical(mem)', 'exec'), G)
FR, comp = G['frames'], G['comp']
fr = lambda n: (FR[n][0] if isinstance(FR[n], tuple) else FR[n]).convert('RGBA')
ld = lambda p: Image.open(f'{SETS}/{p}').convert('RGBA')
LEG = {'N': 'navy', 'n': 'navy_sh', 'W': 'white', 'C': 'cream', 'P': 'plum', 'p': 'plum_sh', 'G': 'green', 'g': 'green_sh', 'Y': 'gold', 'R': 'mouth', 'r': 'red_sh',
       'D': 'dark', 'S': 'silver', 'A': 'grey', 'K': 'pink', 'k': 'skin_sh', 'w': 'wood', 'i': 'ink', 'O': 'orange', 'o': 'orange_sh', 'L': 'wall', 'l': 'wall_sh',
       'F': 'floor', 'f': 'floor_sh', 'B': 'sky', 'E': 'skin', 'h': 'noe_hair', 'H': 'cam_hair'}
def A(rows):
    h, w = len(rows), max(len(r) for r in rows); im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.': im.putpixel((x, y), C(LEG[ch]))
    return im
up = lambda im, k: im.resize((im.width * k, im.height * k), Image.NEAREST)
def hflip(im): return im.transpose(Image.FLIP_LEFT_RIGHT)
def person(n, al='down', ar='down', face='neutral'):
    return comp(fr(f'{n}.base.noarms'), fr(f'{n}.arm_l.{al}'), fr(f'{n}.arm_r.{ar}'), fr(f'{n}.face.{face}'))
def cat(face='neutral', pose='sit'):
    return comp(fr('croissant.base.noface'), fr(f'croissant.face.{face}'), size=(14, 12)) if pose == 'stand' else fr(f'croissant.{pose}')
W, H, FLOOR = 60, 40, 33
def bg(wall='wall', floor=True):
    im = Image.new('RGBA', (W, H), C(wall))
    if floor:
        for y in range(FLOOR, H):
            for x in range(W): im.putpixel((x, y), C('floor_sh' if y == FLOOR else 'floor'))
    return im
def solid(im):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if 0 < px[x, y][3] < 255: px[x, y] = C('floor_sh')   # soft rig shadow -> flat floor_sh (on palette)
    return im
def put(c, im, x, y): c.alpha_composite(solid(im), (x, y)); return c
def on_floor(c, im, cx, base=FLOOR + 2): return put(c, im, cx - im.width // 2, base - im.height)
def shade(c, x0, x1, y, k='floor_sh'):
    for x in range(x0, x1 + 1): c.putpixel((x, y), C(k))
BUBK = 'cream'
def bubble(w, h, inner=None):
    """white rounded bubble, 1px ink border (UI bubble rule), tail bottom-left; optional picture inside."""
    b = Image.new('RGBA', (w, h + 3), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner: continue
            edge = x in (0, w - 1) or y in (0, h - 1) or ((x in (1, w - 2)) and (y in (1, h - 2)))
            b.putpixel((x, y), C('ink' if (x in (0, w - 1) or y in (0, h - 1)) else BUBK))
    for x, y in ((2, h - 1), (3, h - 1), (2, h), (3, h), (2, h + 1), (1, h + 2)): b.putpixel((x, y), C(BUBK))
    for x, y in ((1, h), (1, h + 1), (4, h), (3, h + 1), (2, h + 2), (0, h + 2)): b.putpixel((x, y), C('ink'))
    if inner is not None: b.alpha_composite(inner, ((w - inner.width) // 2, (h - inner.height) // 2))
    return b

# ---------- reused approved pieces ----------
DOOR_OPEN = ld('stairwell/pieces/day/door_home_open.png'); DOOR = ld('stairwell/pieces/day/door_home_closed.png')
PLANT = ld('kitchen/pieces/day/plant.png'); MILK = ld('kitchen/pieces/day/milk.png'); TEAPOT = ld('sitcom_d11_17/pieces/x1/handprop_teapot.png')
PARCEL = ld('stairwell/pieces/day/parcel.png'); BOWL = ld('days_01_03/pieces/x1/prop_cat_bowl.png'); CHAIR = ld('kitchen/pieces/day/chairs.png')
BOX_CAT_B = ld('days_01_03/pieces/x1/prop_box_cat_back.png'); BOX_CAT_F = ld('days_01_03/pieces/x1/prop_box_cat_front.png')
COUNTER = ld('kitchen/pieces/day/counter_sink.png'); CAB = ld('kitchen/pieces/day/upper_cabinets.png'); FRIDGE = ld('kitchen/pieces/day/fridge.png')
PAPER_PEN = ld('days_04_10/pieces/x1/handprop_paper_pen_any.png'); AUDIO = ld('ui_learning/pieces/x1/icon_audio.png')
KEY = ld('sitcom_d11_17/pieces/x1/key_door.png'); WINDOW = ld('kitchen/pieces/day/window.png')
# premier_jour carton (list_appart icon_02) grid, reused verbatim for une boîte (dedupe)
CARTON = A(['...WWWWWWWWWWWWWW', '..FFFFFFFllFFFFWf', '.FFFFFFFllFFFFWff', 'WWWWWWWWWWWWWWfff', 'FFFFFFFllFFFFFfff', 'FFFFFFFllFFFFFfff',
            'FFFFFFFllFFFFFfff', 'FFFFFFFFFFFFFfff.', 'FFFFFFFFFFFFFff..', 'FFiiiFFFFFFFFff..', 'FFFFFFFFFFFFFf...', 'fffffffffffff....'])
# ---------- new small props ----------
PASTRY = A(['...YYY...', '.oYYoYYo.', 'oYYoYoYYo', 'oo.....oo', 'o.......o'])
HAND = A(['E....', 'EE...', '.EEE.', '.EEEk', '..kk.', '.PPP.', '.PPPp', '.PPPp'])
BOXF = Image.new('RGBA', (18, 12), (0, 0, 0, 0)); BOXF.alpha_composite(BOX_CAT_B); BOXF.alpha_composite(BOX_CAT_F)
def _droopy():
    d = PLANT.copy(); px = d.load(); out = Image.new('RGBA', d.size, (0, 0, 0, 0))
    for y in range(d.height):
        for x in range(d.width):
            p = px[x, y]
            if p[3] and p[:3] in (C('green')[:3], C('green_sh')[:3]):   # leaves sag 2px and dry out
                ny = min(y + 2, d.height - 1); out.putpixel((x, ny), C('floor' if (x + y) % 3 else 'floor_sh'))
            elif p[3] and out.getpixel((x, y))[3] == 0: out.putpixel((x, y), p)
    return out
DROOPY = _droopy()
PARCEL_PAIR = ld('days_01_03/pieces/x1/prop_parcel_pair.png')
ENVELOPE = ld('sitcom_d11_17/pieces/x1/envelope.png')   # Mme Martin's letter (handprop.envelope)
HAND_COINS = A(['...YY..YY.......', '..YYYoYYYo......', '..oYYooYoo......', 'EEEEEEEEEEEPPPPP', 'kEEEEEEEEEEPPPPP', '.kkkkkkkkEEPPPPP', '........kkpppppp'])
COFFEE = A(['.WWWWWWW...', '.WDDDDDW...', '.WWWWWWWWW.', '.WWWWWWW..W', '.WWWWWWW..W', '.WWWWWWWWW.', '..WWWWW....', 'SSSSSSSSSSS', '.SSSSSSSSS.'])
STEAM = A(['.S.S', 'S.S.', '.S.S', 'S.S.'])
TEACUP = A(['WWWWWWW..', 'WYYYYYW..', 'WWWWWWWWW', '.WWWWW..W', '.WWWWWWW.', 'SSSSSSS..'])
GLASS = A(['S......S', 'S......S', 'SBBBBBBS', 'SBWBBBBS', 'SBWBBBBS', 'SBBBBBBS', 'SBBBBBBS', 'SBBBBBBS', '.SSSSSS.'])
CARAFE = A(['..SS..', '..SS..', '.S..S.', 'S....S', 'SBBBBS', 'SBWBBS', 'SBWBBS', 'SBBBBS', 'SBBBBS', '.SSSS.'])
MILKGLASS = A(['S.....S', 'SWWWWWS', 'SWWWWWS', 'SWWWWWS', 'SWWWWWS', 'SWWWWWS', '.SSSSS.'])
BAGUETTE = A(['....YYYYYYYYYYYYYYYYY....', '..YYYCYYYYCYYYYCYYYYCYY..', '.oYYYYCYYYYCYYYYCYYYYCYo.', 'oooYYYYYYYYYYYYYYYYYYYooo', '.ooooooooooooooooooooooo.', '..ooooooooooooooooooooo..'])
LOAF = A(['...YYYYY...', '.YYYCYYCYY.', 'YYYYYCYYCYY', 'oYYYYYYYYYo', 'ooooooooooo', '.ooooooooo.'])
KIBBLE = A(['...o...', '.w.o.w.', 'o.w.o.w', '.o.w.o.'])
TABLE = A(['wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii'] + ['.wi.............................wi.'] * 13)
COIN = A(['.YY.', 'YYYo', 'YYYo', '.oo.'])
FRIDGE_OPEN = A(['SSSSSSSSSSSSSSWS', 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS', 'SAAAAAAAAAAAASWS', 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS',
                 'SWWWWWWWWWWWWSWS', 'SAAAAAAAAAAAASWS', 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS', 'SAAAAAAAAAAAASWS', 'SWWWWWWWWWWWWSWS',
                 'SWWWWWWWWWWWWSWS', 'SWWWWWWWWWWWWSWS', 'SSSSSSSSSSSSSSWS', 'SSSSSSSSSSSSSSWS', 'SAAAAAAAAAAAASWS', 'SSSSSSSSSSSSSSWS', 'SSSSSSSSSSSSSSWS',
                 'SSSSSSSSSSSSSSWS', 'SSSSSSSSSSSSSSWS', 'S.............S.'])
CAL = A(['..A....A..', 'pppppppppp'] + ['WWWWWWWWWW', 'WlWlWlWlWl' if False else 'WWWWWWWWWW'] * 0 + [
    'WAWAWAWAWW', 'WWWWWWWWWW', 'WAWAWAWYYW', 'WWWWWWWYYW', 'WAWAWAWAWW', 'WWWWWWWWWW', 'WAWAWAWAWW', 'WWWWWWWWWW'])
def calendar(sat=True):
    cw, ch, cols, rows = 3, 3, 7, 4; w = cols * (cw + 1) + 1; h = 4 + rows * (ch + 1) + 1
    im = Image.new('RGBA', (w, h), C('white'))
    for x in range(w):
        for y in range(3): im.putpixel((x, y), C('plum' if y < 2 else 'plum_sh'))
    for x in (5, w - 6): im.putpixel((x, 0), C('grey'))
    for r in range(rows):
        for c in range(cols):
            k = 'gold' if (sat and c == 5 and r == 1) else ('green' if c >= 5 else 'silver')
            for dx in range(cw):
                for dy in range(ch): im.putpixel((1 + c * (cw + 1) + dx, 4 + r * (ch + 1) + dy), C(k))
    return im
def head(n, face='neutral', al='down', ar='down'):
    return person(n, al, ar, face).crop((3, 0, 13, 11))

ART = {}
def word(lemma, fn): ART[f'word.{lemma}.any'] = fn
# --- greetings / function words (situational) ---
def _bonjour():
    c = bg(); put(c, DOOR_OPEN.crop((0, 4, 26, 42)), 26, -3)
    on_floor(c, person('camille', 'down', 'down', 'happy'), 40)   # Camille in the doorway
    on_floor(c, hflip(person('noe', 'wave', 'down', 'happy')), 16)
    return c
word('bonjour', _bonjour)
def _je_m_appelle():
    c = bg(); on_floor(c, person('noe', 'chest', 'down', 'talk_0'), 14)
    put(c, bubble(22, 15, head('noe', 'happy')), 22, 2); return c
word('je_m_appelle', _je_m_appelle)
def _c_est():   # Camille presents the plant with an open palm
    c = bg(); on_floor(c, person('camille', 'down', 'hold', 'happy'), 16)
    on_floor(c, up(PLANT, 2), 38); return c
word('c_est', _c_est)
def _il_faut():   # tilted watering can pouring over a droopy, dry plant
    c = bg(); dry = up(DROOPY, 2); on_floor(c, dry, 22)
    can = up(hflip(ld('rooftop/pieces/day/arrosoir.png')), 2); put(c, can, 28, 1)
    for x, y in ((27, 11), (24, 13), (28, 15), (25, 17), (22, 15)): c.putpixel((x, y), C('sky')); c.putpixel((x, y + 1), C('sky'))
    return c
word('il_faut', _il_faut)
def _il_y_a():   # echoes the D3 doorstep parcels: prop_parcel_pair, with a soft glint
    c = bg(); pp = PARCEL_PAIR; k = 2 if pp.width * 2 <= 56 and pp.height * 2 <= 32 else 1; im = up(pp, k)
    on_floor(c, im, 30, FLOOR + 2); x1, y1 = 30 + im.width // 2 + 2, FLOOR + 2 - im.height - 2
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): c.putpixel((x1 + dx, y1 + dy), C('white'))
    return c
word('il_y_a', _il_y_a)
def _il_n_y_a_pas_de():   # empty bowl, cat staring at it, sad
    c = bg(); bo = BOWL.copy()
    for x in range(bo.width):
        for y in range(bo.height):
            if bo.getpixel((x, y))[:3] == C('sky')[:3]: bo.putpixel((x, y), C('grey'))
    on_floor(c, up(bo, 3), 40, FLOOR + 3); on_floor(c, up(hflip(cat('sad', 'stand')), 2), 18, FLOOR + 3); return c
word('il_n_y_a_pas_de', _il_n_y_a_pas_de)
def _c_est_combien():   # hero = big blank price tag on a string from a plain bag (cropped at the edge); hand offers coins
    c = bg()
    for y in range(10, FLOOR + 1):   # plain green bag corner, cropped at the left edge
        for x in range(0, 9): c.putpixel((x, y), C('green_sh' if x == 8 or y == FLOOR else ('green' if y > 12 else 'green_sh')))
    for x in range(0, 9, 2): c.putpixel((x, 10), C('white'))   # crimped top
    for (x, y) in ((9, 12), (10, 11), (11, 10), (12, 9), (13, 8)): c.putpixel((x, y), C('ink'))   # string
    for y in range(3, 22):
        for x in range(14, 46):
            if (x, y) in ((14, 3), (45, 3), (14, 21), (45, 21)): continue
            c.putpixel((x, y), C('orange_sh' if y == 21 or x == 45 else 'gold'))
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)): c.putpixel((16 + dx, 7 + dy), C('wall'))   # tag hole (tag blank)
    put(c, up(HAND_COINS, 2), 60 - 32, 24); return c
word('c_est_combien', _c_est_combien)
def _tu_veux():   # Noe offers a croissant toward the viewer
    c = bg(); n = up(person('noe', 'hold', 'hold', 'happy'), 2).crop((0, 0, 32, 40)); put(c, n, 14, 0)
    put(c, up(PASTRY, 2), 21, 25); return c
word('tu_veux', _tu_veux)
def _je_voudrais():   # a hand points at a croissant in a bakery window
    c = bg()
    for y in range(3, 33):
        for x in range(4, 56):
            edge = x in (4, 5, 54, 55) or y in (3, 4, 31, 32)
            c.putpixel((x, y), C('wood' if edge else ('white' if (x - y) % 23 in (0, 1) and y < 20 else 'sky')))
    for x in range(6, 54): c.putpixel((x, 24), C('wood')); c.putpixel((x, 25), C('orange_sh'))
    put(c, up(PASTRY, 2), 10, 14); put(c, up(LOAF, 1), 34, 18); put(c, PASTRY, 45, 19)
    put(c, up(HAND, 3), 22, 16); return c
word('je_voudrais', _je_voudrais)
# --- concrete nouns ---
def _l_appartement():
    c = bg(); put(c, WINDOW, 3, 4); on_floor(c, DOOR.crop((0, 4, 26, 42)), 47, FLOOR + 1)
    t = TABLE.crop((8, 0, 27, 9)); on_floor(c, t, 24, FLOOR + 1); on_floor(c, PLANT, 24, FLOOR + 1 - 9)
    on_floor(c, cat('neutral'), 9); return c
word('l_appartement', _l_appartement)
def _la_plante():
    c = bg(); on_floor(c, up(PLANT, 3), 30, FLOOR + 3); return c
word('la_plante', _la_plante)
def _le_chat():
    c = bg(); on_floor(c, up(cat('happy'), 2), 30, FLOOR + 2); return c
word('le_chat', _le_chat)
def _la_proprietaire():
    c = bg(); on_floor(c, DOOR.crop((0, 4, 26, 42)), 22, FLOOR + 1)
    put(c, bubble(26, 16, up(KEY, 2) if KEY.width * 2 <= 22 else KEY), 32, 2); return c
word('la_proprietaire', _la_proprietaire)
def _samedi():   # echoes prop.insert_calendar: red header, one week of cells, 6th cell circled in red
    c = bg(floor=False)
    for y in range(8, 32):
        for x in range(4, 57): c.putpixel((x, y), C('cream' if y == 31 or x == 56 else 'white'))
    for y in range(8, 15):
        for x in range(4, 56): c.putpixel((x, y), C('red_sh' if y == 14 else 'mouth'))
    for x in (14, 45):
        for y in range(5, 10): c.putpixel((x, y), C('dark'))
    for i in range(7):
        x0 = 7 + i * 7
        for y in range(19, 26):
            for x in range(x0, x0 + 5): c.putpixel((x, y), C('silver'))
    x0 = 7 + 5 * 7
    for x in range(x0 - 1, x0 + 6): c.putpixel((x, 17), C('mouth')); c.putpixel((x, 27), C('mouth'))
    for y in range(18, 27): c.putpixel((x0 - 2, y), C('mouth')); c.putpixel((x0 + 6, y), C('mouth'))
    return c
word('samedi', _samedi)
def _le_cafe():
    c = bg(); on_floor(c, up(COFFEE, 3), 30, FLOOR + 3); put(c, up(STEAM, 2), 30, 0); return c
word('le_cafe', _le_cafe)
def _le_the():
    c = bg(); on_floor(c, up(TEAPOT, 3), 22, FLOOR + 3); on_floor(c, up(TEACUP, 2), 48, FLOOR + 3); return c
word('le_the', _le_the)
def _l_eau():
    c = bg(); on_floor(c, up(CARAFE, 3), 20, FLOOR + 3); on_floor(c, up(GLASS, 3), 42, FLOOR + 3); return c
word('l_eau', _l_eau)
def _le_lait():
    c = bg(); on_floor(c, up(MILK, 5), 22, FLOOR + 3); on_floor(c, up(MILKGLASS, 3), 42, FLOOR + 3); return c
word('le_lait', _le_lait)
def _le_pain():
    c = bg(); on_floor(c, up(BAGUETTE, 2), 30, FLOOR + 1); on_floor(c, up(LOAF, 2), 30, FLOOR - 13); return c
word('le_pain', _le_pain)
def _les_croquettes():
    c = bg(); b = BOWL.copy(); b.alpha_composite(KIBBLE, (0, 0)) if False else None
    bo = BOWL.copy()
    for x in range(bo.width):
        for y in range(bo.height):
            if bo.getpixel((x, y))[:3] == C('sky')[:3]: bo.putpixel((x, y), C('orange_sh' if (x + y) % 2 else 'wood'))
    bw = Image.new('RGBA', (7, 7), (0, 0, 0, 0)); bw.alpha_composite(KIBBLE, (0, 0)); bw.alpha_composite(bo, (0, 3))
    on_floor(c, up(bw, 3), 44, FLOOR + 3); on_floor(c, up(cat('happy'), 2), 17, FLOOR + 3)
    for x, k in ((31, 'orange_sh'), (34, 'wood'), (55, 'orange_sh')): c.putpixel((x, FLOOR + 3), C(k)); c.putpixel((x + 1, FLOOR + 3), C(k))
    return c
word('les_croquettes', _les_croquettes)
def _le_colis():
    c = bg(); on_floor(c, up(PARCEL, 4), 30, FLOOR + 3); return c
word('le_colis', _le_colis)
def _une_boite():
    c = bg(); on_floor(c, up(CARTON, 2), 30, FLOOR + 3); return c
word('une_boite', _une_boite)
def _la_cuisine():
    c = bg(); put(c, CAB.crop((0, 0, 48, 14)), 0, 0); on_floor(c, COUNTER, 24, FLOOR + 1)
    on_floor(c, FRIDGE.crop((0, 0, 16, 29)), 52, FLOOR + 1); return c
word('la_cuisine', _la_cuisine)
def _la_table():
    c = bg(); on_floor(c, TABLE, 30, FLOOR + 1); put(c, up(COFFEE.crop((0, 0, 11, 7)), 1), 16, 12)
    put(c, up(LOAF, 1), 33, 13); return c
word('la_table', _la_table)
def _sur():   # same table + box in all three; the cat moves
    c = bg(); on_floor(c, TABLE, 24, FLOOR + 1); on_floor(c, BOXF, 51, FLOOR + 1); on_floor(c, cat('happy', 'stand'), 24, 19); return c
word('sur', _sur)
def _sous():
    c = bg(); on_floor(c, TABLE, 24, FLOOR + 1); on_floor(c, BOXF, 51, FLOOR + 1); on_floor(c, cat('big-eyes', 'stand'), 24, FLOOR + 1); return c
word('sous', _sous)
def _dans():
    c = bg(); on_floor(c, TABLE, 24, FLOOR + 1); on_floor(c, BOX_CAT_B, 51, FLOOR + 1)
    on_floor(c, cat('happy', 'stand').crop((0, 0, 14, 8)), 51, FLOOR - 7); on_floor(c, BOX_CAT_F, 51, FLOOR + 1); return c
word('dans', _dans)
def _derriere():   # cat hiding behind a big box: ears+eyes over the top, tail out the side
    c = bg(); k = up(cat('big-eyes', 'stand'), 2); put(c, k, 18, FLOOR + 3 - k.height - 11)
    for y in range(FLOOR - 4, FLOOR + 1): c.putpixel((48, y), C('orange')); c.putpixel((49, y), C('orange_sh'))
    on_floor(c, up(CARTON, 2), 32, FLOOR + 3); return c
word('derriere', _derriere)
# --- prompt thumbs ---
def _listen():
    c = bg(); on_floor(c, person('camille', 'down', 'chest', 'talk_0'), 14)
    put(c, AUDIO, 24, 4); on_floor(c, hflip(person('noe', 'down', 'down', 'neutral')), 46); return c
ART['prompt.listen.any'] = _listen
def _dictation():
    c = bg(); put(c, up(PAPER_PEN, 4), 4, 6); put(c, AUDIO, 40, 6)
    on_floor(c, hflip(person('noe', 'down', 'down', 'neutral')), 48); return c
ART['prompt.dictation.any'] = _dictation
def _placement():
    st = Image.open(f'{SETS}/stairwell/composite_landscape_day.png').convert('RGBA').resize((192, 80), Image.NEAREST)
    st = st.crop((36, 40, 192, 78)); px = st.load(); pv = [C(k) for k in PAL]; n = 0
    for y in range(st.height):
        for x in range(st.width):
            p = px[x, y]
            if p not in pv: n += 1; px[x, y] = min(pv, key=lambda q: sum((a - b) ** 2 for a, b in zip(p[:3], q[:3])))
    print('placement: snapped', n, 'non-palette px (composite shadows) to nearest palette colour')
    return st
ART['prompt.placement.any'] = _placement
if __name__ == '__main__':
    import sys
    out = {k: f() for k, f in ART.items()}
    if 'preview' in sys.argv:
        ks = list(out); cols = 6; sheet = Image.new('RGBA', (cols * 64, ((len(ks) + cols - 1) // cols) * 44), C('cream'))
        for i, k in enumerate(ks):
            im = out[k]; sheet.alpha_composite(im.crop((0, 0, min(60, im.width), min(40, im.height))), ((i % cols) * 64 + 2, (i // cols) * 44 + 2))
        up(sheet, 4).save(sys.argv[-1]); up(out['prompt.placement.any'], 4).save(sys.argv[-1].replace('.png', '_pl.png')); sys.exit()
    pal = {C(k) for k in PAL}
    for k, im in out.items():
        assert all(p in pal for p in im.get_flattened_data()), f'{k}: off-palette/partial alpha'
    os.makedirs(f'{D}/pieces/m2', exist_ok=True)
    # atlas: 60x40 cells, 4 per row (1px gap), placement strip below
    keys = [k for k in out if k != 'prompt.placement.any']; cols = 8; rows = (len(keys) + cols - 1) // cols
    AW = cols * 61; AH = rows * 41 + 39; atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
    m = json.load(open(f'{D}/manifest.json')); assets = m['assets']
    rev2 = {k for k in assets if not (k.startswith('word.') or k.startswith('prompt.'))}
    m['atlases']['ui_learning_m2'] = {'file': 'ui_learning_m2.png', 'w': AW, 'h': AH}
    def entry(k, x, y, im, slot, note):
        f = 'pieces/m2/' + k.replace('.', '_') + '.png'; im.save(f'{D}/{f}'); atlas.alpha_composite(im, (x, y))
        assets[k] = {'source': 'atlas', 'atlas': 'ui_learning_m2', 'frame': {'x': x, 'y': y, 'w': im.width, 'h': im.height}, 'anchor': 'tl',
                     'anchorPoint': {'x': 0, 'y': 0}, 'pixelScale': 1, 'displayScale': 2, 'depth': 19, 'file': f, 'slot': slot, 'pri': 'P0', 'note': note}
    for i, k in enumerate(keys):
        slot = {'component': 'ui.card_picture_frame', 'rect': 'inner', 'x': 2, 'y': 2, 'w': 60, 'h': 40}
        note = 'learn_words card picture (draw under ui.card_picture_frame.idle)' if k.startswith('word.') else (
               'listening prompt card picture (same 64x44 frame)' if 'listen' in k else 'dictation prompt card picture (same 64x44 frame)')
        entry(k, (i % cols) * 61, (i // cols) * 41, out[k], slot, note)
    entry('prompt.placement.any', 0, rows * 41, out['prompt.placement.any'],
          {'component': 'ui.placement_result', 'x': 8, 'y': 8, 'w': 156, 'h': 38}, 'placement_result top card: stairwell welcome (fills the blank box above the day text at y48); 168-wide panel: draw at (6,8)')
    atlas.save(f'{D}/ui_learning_m2.png'); assert rev2 <= set(assets)
    json.dump(m, open(f'{D}/manifest.json', 'w'), ensure_ascii=False, indent=1)
    sheet = Image.new('RGBA', (AW + 2, AH + 2), C('cream')); sheet.alpha_composite(atlas, (1, 1)); up(sheet, 4).save(f'{D}/ui_learning_m2_sheet_x4.png')
    print(len(out), 'assets written;', len(assets), 'in manifest')
