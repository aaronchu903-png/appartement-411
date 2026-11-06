"""Days 4-10 add-on pack (style B, 28-colour palette). Own code art, $0.
Imports kitchen/stairwell drawing code + canonical rig in memory; reads approved PNGs; writes ONLY inside days_04_10/."""
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

fr = lambda n: FR[n][0] if isinstance(FR[n], tuple) else FR[n]
LEG = {'N': 'navy', 'n': 'navy_sh', 'W': 'white', 'C': 'cream', 'P': 'plum', 'p': 'plum_sh', 'G': 'green', 'g': 'green_sh', 'Y': 'gold', 'R': 'mouth', 'r': 'red_sh',
       'D': 'dark', 'S': 'silver', 'A': 'grey', 'K': 'pink', 'k': 'skin_sh', 'w': 'wood', 'i': 'ink', 'O': 'orange', 'o': 'orange_sh', 'L': 'wall', 'l': 'wall_sh', 'F': 'floor', 'f': 'floor_sh', 'B': 'sky', 'E': 'skin', 'h': 'noe_hair'}
def A(rows):
    h, w = len(rows), max(len(r) for r in rows); im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == 's': im.putpixel((x, y), SHA)
            elif ch != '.': im.putpixel((x, y), C(LEG[ch]))
    return im

# ---------- keys ----------
# Lefevre's old rooftop key: dark iron, ROUND hollow bow, long shank, toothed bit hanging DOWN (flat key = gold, square bow, short, teeth on the side)
KEY_OLD = A(['.AD........',
             'A.DD.......',
             'D..DDDDDDDD',
             'DD.D....DiD',
             '.DD.....D.D'])
KEY_OLD_TABLE = A(['.AD........',
                   'A.DD.......',
                   'D..DDDDDDDD',
                   'DD.D....DiD',
                   '.DD.....D.D',
                   'sssssssssss'])
KEY_OLD_HANG = A(['.DD.', 'D..A', 'D..D', '.DD.', '.D..', '.D..', '.D..', '.D..', '.DD.', '.Di.', '.DD.'])   # hanging from a hook by the bow
# flat key (gold, sitcom key_door look) on a red ribbon
KEY_RIB_HAND = A(['.RR..', 'R..r.', 'R..r.', '.Rr..', '.YY..', 'Y.Y..', 'YYY..', '.Y...', '.YY..', '.Y...', '.YY..'])
KEY_RIB_FLOOR = A(['.RRR.......', 'R...rYYY...', '.rRRY.YYYYY', '.....YYY.Y.', 'sssssssssss'])
GLOVE = ld(f'{SD}/pieces/x1/glove_loose.png')

# ---------- socks: 4 mismatched socks heaped (navy w/ white heel+toe, plum/pink stripes, green, gold w/ red stripes) ----------
SOCKS = A(['.........WW.....',
           '.........YY.....',
           '..WW.....RR.....',
           '..PP.....YY.....',
           '..KK.....YYRYYW.',
           '..PP..NNNNNNNNW.',
           '..KKNNNNNNNNNNW.',
           '..PPPPW.GGGGGGGG',
           '.WWGGGGGGGGgGGGW',
           'ssssssssssssssss'])

# ---------- jacket on a wall hook (navy, hung by its collar loop) ----------
JACKET = A(['....ii....',
            '....w.....',
            '...NnN....',
            '..NNCNN...',
            '.NNNCnNN..',
            'NNNNCnNNN.',
            'NNnNCnNnNN',
            'NNnNCNNnNN',
            'NNnNNNNnNN',
            'NnnNYNNnnN',
            'Nn.NNNN.nN',
            'Nn.NYNN.nN',
            'Nn.NNNN.nN',
            'NN.NNNN.NN',
            '...NNNn...',
            '...nnnn...'])
# ---------- key hook board (wood strip, 3 brass hooks) ----------
def hooks(kind):
    b = A(['.iiiiiiiiiii.', 'iwwwwwwwwwwwi', 'iwwwwwwwwwwwi', '.iiiiiiiiiii.', '..Y...Y...Y..', '..YY..YY..YY.'])
    im = Image.new('RGBA', (13, 17), (0, 0, 0, 0)); im.alpha_composite(b, (0, 0))
    if kind in ('flat', 'both'): im.alpha_composite(KEY_RIB_HAND, (0, 5))
    if kind in ('old', 'both'): im.alpha_composite(KEY_OLD_HANG, (5, 5))
    return im

# ---------- basil gift pot: white ceramic + navy band (pot 1 is terracotta w/ heart); big glossy leaf pairs ----------
BASIL = A(['...G..G...',
           '..GGgGGG..',
           '.GGgGGgGG.',
           'GgGGGGGGgG',
           'GGGgGgGgGG',
           '.GGGgGGGG.',
           'GgGGGGgGGg',
           '.GGgGgGGG.',
           '..g.g.g...',
           '.WWWWWWWW.',
           '.NNNNNNNN.',
           '.WWWWWWWS.',
           '..WWWWWS..',
           '..WWWWWS..',
           'ssssssssss'])

# ---------- paper + pen ----------
PAPER_HAND = A(['WWWWWW.', 'WSSSSW.', 'WWWWWWN', 'WSSSWNn', 'WWWWNW.', 'WSSNWW.', 'WWYWWW.'])
PAPER_TABLE = A(['..WWWWWWW...', '.WSSSSSWW..N', '.WSSSWWW..N.', 'WSSSSSWW.N..', 'WWWWWWWW.Y..', 'ssssssssssss'])
# ---------- ham: clear pack (silver tray rim) with two pink slices + white fat edge; loose slice ----------
HAM_PACK = A(['.SSSSSSSSS.', 'SWWKKKWWKKS', 'SKKKRKKKKWS', 'SKKKKKKRKWS', 'SWKKKKKKWWS', '.SSSSSSSSS.', 'sssssssssss'])
HAM_SLICE = A(['.WKKK.', 'WKKRKK', 'KKKKKW', '.KK.W.'])

# ---------- cat flap (stairwell door, bottom of leaf; anchor = bottom centre) + 3-frame squeeze-in from behind ----------
FLAP = A(['YYYYYYY', 'YAAAAAY', 'YASSSAY', 'YAAAAAY', 'YYYYYYY'])
FLAP_OPEN = A(['YYYYYYY', 'YAAAAAY', 'YDDDDDY', 'YDDDDDY', 'YYYYYYY'])
def squeeze(i):   # 11x10, flap rows 0-4 at cols 2-8; cat rump seen from behind, standing on the landing below
    im = Image.new('RGBA', (11, 10), (0, 0, 0, 0)); im.alpha_composite(FLAP_OPEN if i < 2 else FLAP, (2, 0))
    if i == 0:
        cat = A(['.........O.', '.........o.', '...OOOO..O.', '..OOOOOO.O.', '..OOOoOOOO.', '..OOOoOOO..', '..OOOOOO...', '..oOOOOo...', '..o.oo.o...', '...........'])
    elif i == 1:
        cat = A(['.......O...', '.......oO..', '........O..', '...OOOO.O..', '...OOoOOO..', '...OOoOO...', '...oOOo....', '...o..o....', '...........', '...........'])
    else:
        cat = A(['...........', '...........', '...........', '.....OOo...', '.......Oo..', '...........', '...........', '...........', '...........', '...........'])
    im.alpha_composite(cat); return im
SQ = [squeeze(i) for i in range(3)]

# ---------- inserts 60x58 ----------
def insert_calendar():
    im = A(['L' * 60] * 58); d = ImageDraw.Draw(im)
    for y in range(58): im.putpixel((0, y), C('wall_sh'))
    d.rectangle((6, 6, 57, 56), fill=C('wall_sh'))                       # drop shadow
    d.rectangle((4, 4, 55, 54), fill=C('white')); d.line((55, 5, 55, 54), fill=C('cream')); d.line((5, 54, 55, 54), fill=C('cream'))
    d.rectangle((4, 4, 55, 10), fill=C('mouth')); d.line((4, 10, 55, 10), fill=C('red_sh'))
    for x in (12, 21, 38, 47): d.line((x, 2, x, 5), fill=C('dark')); im.putpixel((x, 6), C('red_sh'))
    d.point((29, 1), fill=C('dark')); d.line((28, 2, 30, 2), fill=C('grey'))   # nail
    for k in range(8): d.line((9 + 6 * k, 13, 9 + 6 * k, 33), fill=C('silver'))   # 7 x 4 empty day grid
    for k in range(5): d.line((9, 13 + 5 * k, 51, 13 + 5 * k), fill=C('silver'))
    d.rectangle((10, 14, 14, 17), fill=C('cream'))
    d.ellipse((26, 22, 34, 29), outline=C('mouth'))                         # Thursday, week 3: circled
    d.rectangle((7, 37, 52, 51), fill=C('cream')); d.line((7, 51, 52, 51), fill=C('wall_sh'))   # caption panel (engine text)
    return im
TR_CAL = {'x': 7, 'y': 38, 'w': 46, 'h': 13}
def insert_rules():
    im = A(['W' * 60] * 58); d = ImageDraw.Draw(im)
    d.line((0, 0, 59, 0), fill=C('silver')); d.line((2, 0, 2, 57), fill=C('silver')); d.rectangle((54, 20, 56, 40), fill=C('silver'))   # fridge door edge + handle
    d.rectangle((14, 9, 49, 57), fill=C('silver'))                          # shadow
    d.rectangle((11, 7, 47, 57), fill=C('cream')); d.line((47, 8, 47, 57), fill=C('wall_sh'))
    d.ellipse((25, 3, 32, 10), fill=C('mouth')); d.line((26, 9, 31, 9), fill=C('red_sh')); d.point((27, 5), fill=C('pink')); d.point((28, 5), fill=C('pink'))   # round magnet
    for k in range(6):
        y = 18 + 6 * k; d.rectangle((15, y - 1, 16, y), fill=C('ink')); d.line((19, y, 43, y), fill=C('wall_sh'))
    return im
TR_RULES = {'x': 18, 'y': 13, 'w': 27, 'h': 36}
def insert_key_old():
    im = A(['L' * 60] * 9 + ['l' * 60] + ['w' * 60] * 48); d = ImageDraw.Draw(im)
    for x0, y in ((3, 16), (30, 24), (8, 41), (40, 49), (22, 54), (46, 13)): d.line((x0, y, x0 + 8, y), fill=C('ink'))
    d.line((0, 10, 59, 10), fill=C('ink'))
    # shadow
    sh = Image.new('RGBA', (60, 58), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    sd.ellipse((7, 21, 23, 37), outline=C('ink'), width=3); sd.rectangle((23, 29, 53, 31), fill=C('ink')); sd.rectangle((44, 31, 53, 40), fill=C('ink'))
    im.alpha_composite(sh)
    # bow: ornate round ring with quatrefoil hole
    d.ellipse((5, 19, 21, 35), fill=C('dark')); d.ellipse((7, 21, 19, 33), fill=C('grey')); d.ellipse((8, 22, 18, 32), fill=C('dark'))
    for cx, cy in ((13, 24), (13, 30), (10, 27), (16, 27)): d.ellipse((cx - 1, cy - 1, cx + 1, cy + 1), fill=C('wood'))
    d.point((13, 27), fill=C('wood'))
    d.arc((5, 19, 21, 35), 200, 280, fill=C('silver'))
    # collar + long shank
    d.rectangle((21, 25, 24, 30), fill=C('dark')); d.line((21, 25, 24, 25), fill=C('grey'))
    d.rectangle((24, 26, 52, 28), fill=C('dark')); d.line((25, 26, 50, 26), fill=C('grey'))
    d.rectangle((50, 25, 52, 29), fill=C('dark'))
    # toothed bit hanging down
    d.rectangle((42, 29, 51, 38), fill=C('dark')); d.line((42, 29, 42, 38), fill=C('grey'))
    for x, y0 in ((44, 33), (48, 35)): d.rectangle((x, y0, x + 1, 38), fill=C('wood'))
    d.rectangle((46, 36, 46, 38), fill=C('wood'))
    # string + blank tag
    d.line((8, 32, 5, 40), fill=C('cream')); d.line((5, 40, 6, 44), fill=C('cream'))
    d.polygon([(2, 44), (10, 43), (11, 53), (3, 54)], fill=C('wall_sh')); d.line((3, 54, 11, 53), fill=C('floor_sh')); d.point((6, 45), fill=C('ink'))
    return im
TR_KEY = {'x': 10, 'y': 44, 'w': 40, 'h': 10}
from PIL import ImageDraw

# ================= Days 1-3 addendum inserts (priority) =================
VAR = ('day', 'evening', 'night'); SURR = {'day': 'wall', 'evening': 'wall_sh', 'night': 'navy'}
def insert_card():   # opened folded card on the kitchen table: cream card, top flap folded back (shade), heart stamp, blank text area
    im = A(['w' * 60] * 58); d = ImageDraw.Draw(im)
    for x0, y in ((2, 6), (36, 4), (10, 55), (44, 53)): d.line((x0, y, x0 + 9, y), fill=C('ink'))
    d.rectangle((7, 12, 56, 52), fill=C('ink'))                       # shadow
    d.rectangle((5, 8, 54, 15), fill=C('wall_sh')); d.line((5, 15, 54, 15), fill=C('floor'))   # flap folded back (kraft inside)
    d.rectangle((5, 16, 54, 50), fill=C('cream')); d.line((54, 16, 54, 50), fill=C('wall')); d.line((5, 50, 54, 50), fill=C('wall'))
    d.polygon([(27, 21), (29, 21), (30, 22), (31, 21), (33, 21), (34, 22), (34, 24), (30, 28), (26, 24), (26, 22)], fill=C('mouth'))   # heart stamp
    d.point((28, 22), fill=C('pink'))
    d.line((9, 47, 50, 47), fill=C('wall_sh'))
    return im
TR_CARD = {'x': 8, 'y': 31, 'w': 44, 'h': 14}
def hands_frame(v, im):   # phone-insert convention: surround + hands at the sides, purple sleeves
    d = ImageDraw.Draw(im)
    d.rectangle((0, 36, 5, 57), fill=C('skin')); d.line((5, 36, 5, 57), fill=C('skin_sh')); d.rectangle((0, 50, 3, 57), fill=C('plum'))
    d.rectangle((54, 38, 59, 57), fill=C('skin')); d.line((54, 38, 54, 57), fill=C('skin_sh')); d.rectangle((56, 51, 59, 57), fill=C('plum'))
def insert_phone(v):
    im = A([LEG_INV[SURR[v]] * 60] * 58); d = ImageDraw.Draw(im)
    if v == 'night': d.rectangle((3, 0, 56, 57), outline=C('navy_sh'))
    d.rectangle((4, 0, 55, 57), fill=C('dark'))                      # phone body
    for y in range(3, 53):                                            # wallpaper: sky -> navy
        d.line((7, y, 52, y), fill=C('sky') if y < 30 else C('navy') if y > 42 else C('silver'))
    d.rectangle((7, 31, 52, 42), fill=C('sky')); d.ellipse((30, 33, 60, 60), fill=C('navy_sh')); d.ellipse((2, 38, 30, 62), fill=C('navy'))
    d.rectangle((7, 53, 52, 57), fill=C('dark')); d.line((26, 55, 33, 55), fill=C('grey'))
    d.rectangle((24, 1, 35, 1), fill=C('navy_sh'))                   # speaker slot
    d.rectangle((10, 15, 50, 30), fill=C('navy_sh'))                  # bubble shadow
    d.rectangle((9, 14, 49, 29), fill=C('white')); d.point((9, 14), fill=C('sky')); d.point((49, 14), fill=C('sky')); d.point((9, 29), fill=C('sky')); d.point((49, 29), fill=C('sky'))
    d.rectangle((11, 17, 17, 23), fill=C('gold')); d.line((11, 23, 17, 23), fill=C('orange_sh')); d.line((14, 17, 14, 20), fill=C('wood'))   # app blob: parcel
    hands_frame(v, im); return im
TR_PHONE = {'x': 19, 'y': 16, 'w': 29, 'h': 12}
def insert_laptop(v):
    im = A([LEG_INV[SURR[v]] * 60] * 58); d = ImageDraw.Draw(im)
    d.rectangle((1, 1, 58, 50), fill=C('dark')); d.rectangle((0, 51, 59, 57), fill=C('silver')); d.line((0, 51, 59, 51), fill=C('grey')); d.rectangle((24, 53, 35, 54), fill=C('grey'))
    d.rectangle((4, 4, 55, 48), fill=C('white')); d.rectangle((4, 4, 55, 7), fill=C('navy')); d.rectangle((6, 5, 9, 6), fill=C('orange'))   # page header bar + logo blob
    d.rectangle((7, 11, 28, 39), fill=C('silver')); d.rectangle((8, 12, 27, 38), fill=C('cream'))   # image slot (overlay goes here)
    d.rectangle((31, 41, 52, 45), fill=C('gold')); d.line((31, 45, 52, 45), fill=C('orange_sh'))   # buy button (blank)
    d.line((31, 23, 52, 23), fill=C('silver'))
    return im
SLOT_LAPTOP = {'x': 8, 'y': 12, 'w': 20, 'h': 27}
TR_LAP_NAME = {'x': 31, 'y': 11, 'w': 22, 'h': 11}; TR_LAP_PRICE = {'x': 31, 'y': 25, 'w': 22, 'h': 13}
IMG_FOOD = A([r.replace('d', 'D') for r in ['....................', '....................', '....SASASASASASA....', '....AAAAAAAAAAAA....', '...NNNNNNNNNNNNNN...', '...NNNNNNNNNNNNNn...', '...NNNO.NNNN.ONNn...',
              '...NNNOONNNNOONNn...', '...NNNOOOOOOOONNn...', '...NNNOOOOOOOONNn...', '...NNNOdOOOOdONNn...', '...NNNOOOOOOOONNn...', '...NNNOOOKKOOONNn...', '...NNNNOOOOOONNNn...',
              '...NNNNNNNNNNNNNn...', '...NNNNNNNNNNNNNn...', '...NNNYYYYYYNNNNn...', '...NNYYYYYYYYYNNn...', '...NNNYYYYYYNNNNn...', '...NNNNNNNNNNNNNn...', '...NNNNNNNNNNNNNn...',
              '...NNNNNNNNNNNNNn...', '...NNNNNNNNNNNNNn...', '...nnnnnnnnnnnnnn...', '....................', '....................', '....................']])
IMG_TREE = A(['....................', '..PPPPPPP...........', '..ppppppp...........', '....lL..............', '....lL..............', '....lL...PPPPPPPP...', '....lL...pppppppp...', '....lL.......lL.....',
              '....lL.......lL.....', '..PPPPPPPPP..lL.....', '..ppppppppp..lL.....', '....lL.......lL.....', '....lL.......lL.....', '....lL.......lL.....', '....lL...PPPPPPPPP..',
              '....lL...PPPPPPPPP..', '....lL...ppppppppp..', '....lL.......lL.....', '....lL.......lL.....', '....lL.......lL.....', '....lL.......lL.....', '....lL.......lL.....',
              '.PPPPPPPPPPPPPPPPPP.', '.PPPPPPPPPPPPPPPPPP.', '.pppppppppppppppppp.', '....................', '....................'])
LEG_INV = {v: k for k, v in LEG.items()}

# ================= output =================
def pack(ims, W):
    x = y = rowh = 0; pos = {}
    for n, im in sorted(ims.items(), key=lambda t: (-t[1].height, t[0])):
        if x + im.width > W: x, y, rowh = 0, y + rowh + 1, 0
        pos[n] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
    sh = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for n, (a, b) in pos.items(): sh.alpha_composite(ims[n], (a, b))
    return sh, pos

for d in ('pieces/x1', 'pieces/x8', 'composites', 'gif'): os.makedirs(f'{D}/{d}', exist_ok=True)
ARR = {v: ld(f'{SETS}/rooftop/pieces/{v}/arrosoir.png') for v in VAR}
INS = {'prop.insert_card': (insert_card(), TR_CARD, 'D1-3 jam parcel: mother card, heart stamp; engine text e.g. « Bisous, Maman »'),
       'prop.insert_calendar': (insert_calendar(), TR_CAL, 'D1 « Samedi : Madame Martin. » / D10 « Jeudi : Madame Lefèvre »; Thursday-column cell circled, empty grid'),
       'prop.insert_rules_list': (insert_rules(), TR_RULES, 'D9 house rules sheet on the fridge, red magnet; 6 bullets + empty lines; engine text over the lines'),
       'prop.insert_key_old': (insert_key_old(), TR_KEY, 'D8/D9 Lefèvre rooftop key: dark iron, round quatrefoil bow, long shank, toothed bit, string + blank tag')}
INSV = {'prop.insert_phone_notif': (insert_phone, {'textRect': TR_PHONE}, 'one notification bubble (parcel-app blob); « Livraison demain : 1 colis »'),
        'prop.insert_laptop_price': (insert_laptop, {'textRect': TR_LAP_PRICE, 'nameRect': TR_LAP_NAME, 'imageSlot': SLOT_LAPTOP}, 'product tile; overlay prop.laptop_img_* at imageSlot; price in textRect (« 12 € »), optional name in nameRect')}
PROPS = {'handprop.key_old': (KEY_OLD, (1, 1), {'handPoint': {'x': 1, 'y': 1}, 'note': 'held by the bow'}),
         'prop.key_old_table': (KEY_OLD_TABLE, (5, 4), {'slots': {'kitchen_table_top': {'x': 118, 'y': 119}}}),
         'handprop.key_ribbon': (KEY_RIB_HAND, (2, 10), {'handPoint': {'x': 1, 'y': 0}, 'note': 'flat gold key dangling from a red ribbon (mouth/red_sh)'}),
         'prop.key_ribbon_floor': (KEY_RIB_FLOOR, (5, 3), {'slots': {'kitchen_floor': {'x': 96, 'y': 136}, 'kitchen_table_top': {'x': 112, 'y': 119}}}),
         'prop.sock_pile': (SOCKS, (8, 8), {'slots': {'kitchen_floor': {'x': 60, 'y': 136}}, 'note': 'D5 cat stash: 4 mismatched socks'}),
         'prop.jacket_hook': (JACKET, (4, 0), {'anchorKind': 'nail', 'slots': {'kitchen_wall_door': {'x': 186, 'y': 82}}, 'note': 'x182-191 y82-97, clear of laptop (y112) and key hooks'}),
         'prop.key_hooks_empty': (hooks('empty'), (6, 0), {'slots': {'kitchen_wall_door': {'x': 172, 'y': 90}}, 'note': 'x166-178 y90-106 (keys hang to y106; laptop top y112)'}),
         'prop.key_hooks_flat': (hooks('flat'), (6, 0), {'slots': {'kitchen_wall_door': {'x': 172, 'y': 90}}}),
         'prop.key_hooks_old': (hooks('old'), (6, 0), {'slots': {'kitchen_wall_door': {'x': 172, 'y': 90}}}),
         'prop.key_hooks_both': (hooks('both'), (6, 0), {'slots': {'kitchen_wall_door': {'x': 172, 'y': 90}}}),
         'prop.basil_pot': (BASIL, (5, 13), {'handPoint': {'x': 5, 'y': 10}, 'slots': {'kitchen_desk': {'x': 177, 'y': 118}, 'kitchen_counter_top_r': {'x': 60, 'y': 117}}, 'note': 'D8 gift; desk slot = pot 1 footprint (use instead of pot_desk_*, desk_bare / plant blanked)'}),
         'handprop.paper_pen': (PAPER_HAND, (3, 6), {'handPoint': {'x': 0, 'y': 6}}),
         'prop.paper_pen_table': (PAPER_TABLE, (6, 4), {'slots': {'kitchen_table_top': {'x': 106, 'y': 119}}}),
         'prop.ham_pack': (HAM_PACK, (5, 5), {'slots': {'kitchen_table_top': {'x': 130, 'y': 119}, 'kitchen_counter_top_r': {'x': 60, 'y': 117}}}),
         'handprop.ham_slice': (HAM_SLICE, (3, 3), {'handPoint': {'x': 1, 'y': 0}, 'note': 'in hand or in the cat mouth'}),
         'prop.cat_flap': (FLAP, (3, 4), {'slots': {'door_home': {'x': 78, 'y': 127}, 'door_neighbour': {'x': 22, 'y': 127}}, 'note': 'brass-framed flap on the bottom of the door leaf (leaf bottom row 127)'}),
         'prop.cat_flap_open': (FLAP_OPEN, (3, 4), {'slots': {'door_home': {'x': 78, 'y': 127}, 'door_neighbour': {'x': 22, 'y': 127}}}),
         'prop.laptop_img_catfood': (IMG_FOOD, (0, 0), {'note': 'overlay at insert_laptop_price imageSlot (8,12), topleft'}),
         'prop.laptop_img_cattree': (IMG_TREE, (0, 0), {'note': 'overlay at insert_laptop_price imageSlot (8,12), topleft'})}
CATF = {f'croissant.flap_in.{i}': SQ[i] for i in range(3)}
SEQ = {'croissant.flap_in': (list(CATF), [280, 280, 420])}
man = {'assetRoot': '', 'atlases': {}, 'assets': {}, 'note': 'Days 4-10 pack + Days 1-3 insert addendum. Props graded with room light; insert_phone/laptop screens self-lit (do not grade). See NOTES.md'}
def put(n, im, grp, a):
    fn = n.replace('.', '_'); im.save(f'{D}/pieces/x1/{fn}.png'); im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(f'{D}/pieces/x8/{fn}_x8.png')
    man['assets'][n] = dict({'source': 'atlas', 'atlas': grp, 'pixelScale': 1, 'file': f'pieces/x1/{fn}.png'}, **a)
SHEETS = {'days410_inserts': {}, 'days410_props': {}, 'days410_cat': {}}
for n, (im, tr, note) in INS.items(): SHEETS['days410_inserts'][n + '.any'] = (im, {'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'depth': 7, 'insert': True, 'textRect': tr, 'note': note})
for n, (fn, extra, note) in INSV.items():
    for v in VAR: SHEETS['days410_inserts'][f'{n}.{v}'] = (fn(v), dict({'anchor': 'topleft', 'anchorPoint': {'x': 0, 'y': 0}, 'depth': 7, 'insert': True, 'variant': v, 'note': note + '; surround per variant, screen self-lit, do not grade'}, **extra))
for n, (im, an, ex) in PROPS.items(): SHEETS['days410_props'][n + '.any'] = (im, dict({'anchor': 'topleft' if an == (0, 0) or 'hooks' in n or 'jacket' in n else 'baseline', 'anchorPoint': {'x': an[0], 'y': an[1]}, 'depth': 5 if n.startswith('handprop') else 3}, **ex))
for n, im in CATF.items(): SHEETS['days410_cat'][n] = (im, {'anchor': 'baseline', 'anchorPoint': {'x': 5, 'y': 9}, 'depth': 4, 'slots': {'door_home': {'x': 78, 'y': 132}, 'door_neighbour': {'x': 22, 'y': 132}}, 'note': 'includes the flap; draw instead of prop.cat_flap while playing; end on prop.cat_flap'})
for grp, d in SHEETS.items():
    ims = {k: v[0] for k, v in d.items()}; sh, pos = pack(ims, 190 if grp == 'days410_inserts' else 64); sh.save(f'{D}/{grp}_sheet.png'); man['atlases'][grp] = {'file': f'{grp}_sheet.png', 'w': sh.width, 'h': sh.height}
    for k, (im, a) in d.items(): put(k, im, grp, dict(a, frame={'x': pos[k][0], 'y': pos[k][1], 'w': im.width, 'h': im.height}))
for s, (frs, du) in SEQ.items(): man['assets'][s] = {'type': 'sequence', 'frames': frs, 'fps': round(1000 * len(du) / sum(du), 2), 'durations': du}
man['reused'] = {'Martin glove': 'handprop.glove_loose.any (sitcom_d11_17) + registry prop glove_on_chair', 'arrosoir (kitchen)': 'rooftop prop.arrosoir.<v> / handprop.arrosoir.<v>; kitchen slots kitchen_desk (157,118) laptop-off only, kitchen_floor (186,136)',
                 'flat key (no ribbon)': 'handprop.key_door.any / prop.key_floor.any', 'newspaper': 'handprop.newspaper_folded/open.any', 'wall calendar (in scene)': 'prop.wall_calendar.any', 'house rules (in scene)': 'kitchen prop.house_rules.<v>'}
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)

# ---------- mockups ----------
ks = {v: ({n: K.piece(n, v) for n in K.PIECES}, None) for v in VAR}
ss = {v: ({n: S.piece(n, v) for n in S.PIECES}, None) for v in VAR}
DESKB = ld(f'{SD}/pieces/x1/desk_bare.png'); LY = lambda: Image.new('RGBA', (192, 144), (0, 0, 0, 0))
def base(im, s, x, y, ax, ay): s.alpha_composite(im, (x - ax, y - ay))
def kroom(v):
    d = dict(ks[v][0]); d['desk'] = DESKB; d['plant'] = Image.new('RGBA', (8, 11), (0, 0, 0, 0)); return K.stage(v, {v: (d, None)})
def kscene(v, props_fn, cast_fn=lambda c: None):
    room = kroom(v); M, A_ = K.baked_maps(v, ks); pr = LY(); props_fn(pr); cast = LY(); cast_fn(cast)
    room = K.grade(room, M, 1.0, A_); room.alpha_composite(K.grade(pr, M, 1.0, A_))
    if v == 'night': room.alpha_composite(ks[v][0]['pendant_on'], (K.PENDANT_AT[0] - 4, K.PENDANT_AT[1]))
    room.alpha_composite(K.grade(cast, M, 0.25, A_, 0.6)); return room
def sscene(v, props_fn, cast_fn=lambda c: None):
    room = S.stage(v, ss[v][0]); M, _, _, A_ = S.lightmap(v); pr = LY(); props_fn(pr); cast = LY(); cast_fn(cast)
    out = S.grade(room, M, 1.0, A_); out.alpha_composite(S.grade(pr, M, 1.0, A_)); S.emitters(v, ss[v][0], out); out.alpha_composite(S.grade(cast, M, 0.25, A_, 0.6)); return out
def portrait(sc, Kx, cam, name):
    W, H = -(-1080 // Kx), -(-1056 // Kx)
    view = sc.crop((cam[0], cam[1], cam[0] + W, cam[1] + H)).resize((W * Kx, H * Kx), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), sc.getpixel((cam[0] + W // 2, max(cam[1] - 4, 2)))); out.alpha_composite(view, (0, 288))
    fc = sc.getpixel((cam[0] + 1, 143)); out.alpha_composite(Image.new('RGBA', (1080, 576), tuple(int(c * 0.55) for c in fc[:3]) + (255,)), (0, 1344))
    out.convert('RGB').save(f'{D}/composites/{name}.png'); return out
from PIL import ImageFont
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)   # 2.2 stage px x 18
FIT = {}
def ins_phone(im, rects, name):   # insert at 18x fills the scene band; sample text drawn in the rect(s) to prove the 24-char fit (mockup only)
    big = im.resize((1080, 1044), Image.NEAREST); d = ImageDraw.Draw(big)
    for r, txt in rects:
        x, y, w, h = [r[k] * 18 for k in 'xywh']; tw = d.textlength(txt, font=FONT); FIT[f'{name}: {txt}'] = (round(tw), w)
        d.text((x + w / 2, y + h / 2), txt, font=FONT, fill=C('ink'), anchor='mm')
    out = Image.new('RGBA', (1080, 1920), C('dark')); out.alpha_composite(big, (0, 288)); out.convert('RGB').save(f'{D}/composites/{name}.png')
P = lambda n: PROPS[n]
def pp(s, n, x, y): im, an, _ = PROPS[n]; base(im, s, x, y, *an)
ins_phone(INS['prop.insert_card'][0], [(TR_CARD, 'Bisous, Maman')], 'phone_insert_card')
ins_phone(INS['prop.insert_calendar'][0], [(TR_CAL, 'Samedi : Madame Martin.')], 'phone_insert_calendar_d1')
ins_phone(INS['prop.insert_calendar'][0], [(TR_CAL, 'Jeudi : Madame Lefèvre')], 'phone_insert_calendar_d10')
ins_phone(INS['prop.insert_rules_list'][0], [(TR_RULES, '')], 'phone_insert_rules_list')
ins_phone(INS['prop.insert_key_old'][0], [], 'phone_insert_key_old')
for v in VAR: ins_phone(insert_phone(v), [(TR_PHONE, 'Livraison demain : 1 colis')], f'phone_insert_phone_notif_{v}')
for img, price, nm, v in ((IMG_FOOD, '12 €', 'Croquettes', 'day'), (IMG_TREE, '39 €', 'Arbre à chat', 'night')):
    l = insert_laptop(v); l.alpha_composite(img, (8, 12)); ins_phone(l, [(TR_LAP_PRICE, price), (TR_LAP_NAME, nm)], f'phone_insert_laptop_price_{"catfood" if img is IMG_FOOD else "cattree"}_{v}')
cat = fr('croissant.sit'); noe = fr('noe.stand')
def tbl(p): pp(p, 'prop.key_old_table', 118, 119); pp(p, 'prop.key_ribbon_floor', 106, 119); pp(p, 'prop.ham_pack', 132, 119)
shots = {'d8_keys_old_vs_flat_table_day': (kscene('day', tbl), 18, (92, 82)),
         'd5_sock_pile_day': (kscene('day', lambda p: pp(p, 'prop.sock_pile', 60, K.FEET), lambda c: base(cat, c, 74, K.FEET, 6, 11)), 18, (30, 90)),
         'd5_jacket_hooks_day': (kscene('day', lambda p: (pp(p, 'prop.jacket_hook', 186, 82), pp(p, 'prop.key_hooks_both', 172, 90))), 12, (102, 60)),
         'd8_hooks_jacket_evening': (kscene('evening', lambda p: (pp(p, 'prop.jacket_hook', 186, 82), pp(p, 'prop.key_hooks_flat', 172, 90))), 18, (132, 70)),
         'd8_basil_desk_day': (kscene('day', lambda p: pp(p, 'prop.basil_pot', 177, 118)), 18, (132, 90)),
         'd8_basil_desk_night': (kscene('night', lambda p: pp(p, 'prop.basil_pot', 177, 118)), 18, (132, 90)),
         'd7_arrosoir_desk_floor_day': (kscene('day', lambda p: (base(ARR['day'], p, 157, 118, 6, 8), base(ARR['day'], p, 186, K.FEET, 6, 8), pp(p, 'prop.basil_pot', 177, 118))), 18, (132, 90)),
         'd9_paper_ham_table_evening': (kscene('evening', lambda p: (pp(p, 'prop.paper_pen_table', 106, 119), pp(p, 'prop.ham_pack', 130, 119))), 18, (88, 82)),
         'd6_cat_flap_stairwell_day': (sscene('day', lambda p: pp(p, 'prop.cat_flap', 78, 127), lambda c: base(cat, c, 92, 133, 6, 11)), 18, (48, 85)),
         'd6_cat_flap_in1_night': (sscene('night', lambda p: None, lambda c: base(SQ[1], c, 78, 132, 5, 9)), 18, (48, 85))}
for n, (sc, Kx, cam) in shots.items(): sc.save(f'{D}/composites/{n}_x1.png'); portrait(sc, Kx, cam, f'phone_{n}')
# held props: Noe holding key_ribbon / paper / basil (wide-ish close on Noe)
def held(c, n):
    base(noe, c, 80, K.FEET, 8, 23); im, an, ex = PROPS[n]; hp = ex['handPoint']; base(im, c, 80 + 5, K.FEET - 11, hp['x'], hp['y'])
for n in ('handprop.key_ribbon', 'handprop.key_old', 'handprop.paper_pen', 'handprop.ham_slice', 'handprop.basil_pot' if False else 'prop.basil_pot'):
    if n == 'prop.basil_pot': PROPS[n][2].setdefault('handPoint', {'x': 5, 'y': 10})
    sc = kscene('day', lambda p: None, lambda c, n=n: held(c, n)); portrait(sc, 18, (52, 90), f'phone_held_{n.split(".")[1]}_day')
# GIF
ims = []
for f in CATF:
    bg = Image.new('RGBA', (20, 16), C('navy')); bg.alpha_composite(CATF[f], (4, 4)); ims.append(bg.resize((160, 128), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
bg = Image.new('RGBA', (20, 16), C('navy')); bg.alpha_composite(FLAP, (6, 4)); ims.append(bg.resize((160, 128), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
ims[0].save(f'{D}/gif/croissant.flap_in.gif', save_all=True, append_images=ims[1:], duration=[280, 280, 420, 900], loop=0, disposal=2)
# contact sheet 8x
rowi = [INS[k][0] for k in INS] + [insert_phone('day'), insert_laptop('day')]
rowp = [p[0] for p in PROPS.values()] + SQ
cs = Image.new('RGBA', (6 * 63 + 4, 62 + 22), C('wall'))
for i, im in enumerate(rowi): cs.alpha_composite(im, (2 + i * 63, 2))
x = 2
for im in rowp:
    if x + im.width > cs.width: break
    cs.alpha_composite(im, (x, 82 - im.height)); x += im.width + 2
cs.resize((cs.width * 8, cs.height * 8), Image.NEAREST).save(f'{D}/contact_sheet_x8.png')
print('ok', len(man['assets'])); [print(k, v) for k, v in FIT.items()]
