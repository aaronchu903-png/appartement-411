"""411 rooftop garden set, global style B. Original PIL code art, canonical palette only.
Reuses helpers from ../kitchen/gen_kitchen.py (imported, not edited).
Run: python3 gen_rooftop.py -> rooftop_<v>_sheet.png, pieces/, light/, manifest.json, stages, composites."""
import json, os, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, '..', 'kitchen'))
from gen_kitchen import L, C, steps, grade, put, COOL, COOL_T, WARM, CAP, BOT   # helpers only
import gen_kitchen; gen_kitchen.PAL.setdefault('sky', '#a9c8dc')   # STYLE_GUIDE §2 28th colour; canonical palette.json was regenerated without it on 2026-10-25 17:22
W_ST, H_ST = 192, 144
HORIZON = 128   # deck starts here
FEET = 136      # cast feet line
BACKBASE = 131  # base of back props (door, bench, pots)
PARAPET_TOP = 116  # parapet coping top row; skyline backdrop baseline
VARIANTS = ['day', 'evening', 'night']
# per-variant scenery colours (sky + skyline carry their own colours, drawn UNGRADED like the kitchen window pane)
SC = {'day':     dict(sky=['sky'] * 9 + ['white'], far='silver', fac='cream', fac_sh='wall_sh', zinc='grey', zinc_sh='silver', win='navy', chim='orange_sh', tower='grey'),
      'evening': dict(sky=['plum'] * 3 + ['pink'] * 3 + ['orange'] * 2 + ['gold'] * 2, far='plum', fac='plum_sh', fac_sh='plum_sh', zinc='plum', zinc_sh='pink', win='gold', chim='plum', tower='plum_sh'),
      'night':   dict(sky=['navy_sh'] * 5 + ['navy'] * 4 + ['plum_sh'], far='navy_sh', fac='dark', fac_sh='dark', zinc='navy', zinc_sh='navy', win='gold', chim='navy', tower='dark')}
# ---------- backdrops ----------
def sky(v):  # 192x116, tiles x (period 192); flat bands, clouds / stars + moon
    c = SC[v]; b = L(192, 116); n = len(c['sky']); h = 116 / n
    for i, k in enumerate(c['sky']): b.r(0, int(i * h), 191, int((i + 1) * h) - 1, k)
    if v == 'day':
        for x, y, w in ((14, 20, 14), (70, 30, 10), (120, 14, 18), (168, 38, 12)): b.r(x, y, x + w, y + 2, 'white').r(x + 3, y - 2, x + w - 4, y - 1, 'white')
    elif v == 'evening':
        for x, y, w in ((20, 26, 16), (110, 18, 20), (160, 40, 12)): b.r(x, y, x + w, y + 1, 'pink').r(x + 3, y + 2, x + w - 2, y + 2, 'orange')
        b.r(60, 92, 67, 96, 'gold').r(61, 91, 66, 91, 'gold')   # low sun behind the roofs
    else:
        for x, y in ((8, 10), (31, 26), (52, 6), (77, 40), (96, 16), (139, 9), (158, 30), (183, 20), (24, 50), (120, 46), (172, 56), (64, 22)): b.p(x, y, 'white')
        b.r(144, 18, 149, 23, 'cream').r(145, 17, 148, 17, 'cream').r(145, 24, 148, 24, 'cream').r(143, 19, 143, 22, 'cream').r(147, 18, 149, 21, 'navy_sh')  # crescent
    return b.im
def skyline_far(v):  # 96x80, tiles x (period 96); baseline = parapet top. distant flat blocks + generic dome
    c = SC[v]; b = L(96, 80)
    # far row: tall distant blocks + a small generic dome (tops y12..34)
    for x0, x1, t in ((0, 13, 30), (14, 25, 22), (26, 39, 34), (40, 49, 18), (50, 63, 28), (64, 77, 24), (78, 95, 32)): b.r(x0, t, x1, 79, c['far'])
    b.r(42, 14, 47, 17, c['far']).r(43, 12, 46, 13, c['far']).p(44, 10, c['far']).p(44, 11, c['far'])   # dome + lantern
    return b.im
def skyline(v):  # 96x80, tiles x (period 96); near row zinc mansards + chimney pots (drawn over tower + far row)
    c = SC[v]; b = L(96, 80)
    # near row: facades with mansard zinc roofs (tops y40..52), chimney stacks with pots
    for x0, x1, t in ((0, 21, 46), (22, 45, 40), (46, 63, 50), (64, 95, 44)):
        b.r(x0, t + 6, x1, 79, c['fac']).r(x0, t, x1, t + 5, c['zinc']).r(x0 + 1, t - 1, x1 - 1, t - 1, c['zinc_sh'])
        b.r(x1, t + 6, x1, 79, c['fac_sh'])
        for wx in range(x0 + 3, x1 - 2, 5):   # dormers / windows
            b.r(wx, t + 2, wx + 1, t + 4, c['win'] if (wx * 7 + t) % 3 else c['zinc_sh'])
            for wy in (t + 10, t + 18, t + 26):
                if wy + 3 < 80: b.r(wx, wy, wx + 1, wy + 3, c['win'] if v == 'day' or (wx * 3 + wy) % 4 == 0 else c['fac_sh'])
    for x, t in ((5, 40), (30, 34), (55, 44), (72, 38), (88, 38)):
        b.r(x, t, x + 4, t + 6, c['chim']).r(x, t - 1, x, t - 1, c['chim']).r(x + 2, t - 1, x + 2, t - 1, c['chim']).r(x + 4, t - 1, x + 4, t - 1, c['chim'])
    if v != 'day':   # night/evening: facades very dark, keep a cornice line so rows stay separate
        for x0, x1, t in ((0, 21, 46), (22, 45, 40), (46, 63, 50), (64, 95, 44)): b.r(x0, t + 6, x1, t + 6, c['zinc'])
    return b.im
def tower(v):  # 17x66 generic lattice tower, original silhouette (distant), anchor bottom-centre
    k = SC[v]['tower']; b = L(17, 66)
    b.r(8, 0, 8, 7, k)                                       # mast
    for y in range(8, 66):
        half = int(1 + ((y - 8) / 57) ** 2.0 * 7)
        b.p(8 - half, y, k).p(8 + half, y, k)
        if (y // 2) % 2 == 0 and half > 1: b.p(8 - half + 1, y, k) if y < 50 else None
        if y in (8, 26, 44): b.r(8 - half, y, 8 + half, y, k).r(8 - half, y + 1, 8 + half, y + 1, k)
        if y < 44: b.p(8, y, k)
    for y in range(46, 66):                                  # arch between the legs
        half = int(1 + ((y - 8) / 57) ** 2.0 * 7); b.r(8 - half, y, 8 - half + 1, y, k).r(8 + half - 1, y, 8 + half, y, k)
    b.r(5, 50, 11, 51, k)
    if v == 'night': b.p(8, 0, 'gold')
    return b.im
def deck(v):  # 64x16, tiles x: zinc / tar terrace with seams and gravel
    b = L(64, 16).r(0, 0, 63, 15, 'grey').r(0, 0, 63, 0, 'silver')
    for x in range(0, 64, 16): b.r(x, 1, x, 15, 'silver')
    for x, y in ((5, 6), (22, 11), (37, 4), (50, 9), (58, 13), (12, 14), (29, 7)): b.p(x, y, 'silver')
    return b.im
def parapet(v):  # 32x12, tiles x (period 32): stone coping + rendered wall, joints; rows 116..127
    b = L(32, 12).r(0, 0, 31, 1, 'silver').r(0, 2, 31, 2, 'grey').r(0, 3, 31, 11, 'wall_sh')
    for x in (7, 23): b.r(x, 3, x, 7, 'floor')
    b.r(0, 7, 31, 7, 'floor')
    for x in (15, 31): b.r(x, 8, x, 11, 'floor')
    return b.r(0, 11, 31, 11, 'floor_sh').im
# ---------- props ----------
def roof_door(v, opened):  # 32x44 stair-head: zinc cap, rendered box, green door (10x22)
    b = L(32, 44).r(1, 4, 30, 43, 'wall').r(27, 4, 30, 43, 'wall_sh').r(0, 2, 31, 3, 'grey').r(2, 0, 29, 1, 'silver')
    b.r(1, 41, 30, 43, 'wall_sh').r(4, 8, 7, 11, 'navy').r(4, 8, 7, 8, 'grey')        # tiny vent window (blank)
    if not opened:
        b.r(10, 18, 21, 43, 'wood').r(11, 19, 20, 43, 'green').r(12, 21, 19, 29, 'green_sh').r(12, 32, 19, 41, 'green_sh').r(19, 31, 19, 32, 'gold')
    else:
        b.r(10, 18, 21, 43, 'wood').r(11, 19, 20, 43, 'dark').r(13, 36, 20, 37, 'ink').r(15, 40, 20, 41, 'ink')   # dark stair inside, two step edges
        b.r(22, 19, 25, 43, 'green').r(25, 19, 25, 43, 'green_sh').r(23, 31, 23, 32, 'gold')                     # leaf swung open (foreshortened)
    return b.im
def bench(v):  # 30x13: seat rows 5-6 (sit line y5), backrest, legs
    b = L(30, 13).r(1, 0, 28, 1, 'wood').r(1, 2, 28, 2, 'ink').r(2, 3, 3, 4, 'wood').r(26, 3, 27, 4, 'wood')
    b.r(0, 5, 29, 6, 'wood').r(0, 7, 29, 7, 'ink')
    return b.r(2, 8, 3, 12, 'wood').r(26, 8, 27, 12, 'wood').r(2, 12, 3, 12, 'ink').r(26, 12, 27, 12, 'ink').im
def pot1(v, stage):  # 12x20: terracotta, painted blue band + pink heart = pot ① « Chez nous »
    b = L(12, 20).r(0, 10, 11, 11, 'orange').r(1, 12, 10, 19, 'orange').r(9, 12, 10, 19, 'orange_sh').r(2, 19, 9, 19, 'orange_sh')
    b.r(1, 13, 10, 16, 'sky').r(9, 13, 10, 16, 'navy')
    b.p(4, 14, 'pink').p(6, 14, 'pink').r(4, 15, 6, 15, 'pink').p(5, 16, 'pink').p(5, 14, 'pink')   # heart
    b.r(1, 9, 10, 9, 'ink')   # soil
    if stage == 'sprout': b.r(5, 7, 5, 8, 'green').p(4, 6, 'green').p(6, 6, 'green')
    elif stage == 'young': b.r(5, 4, 5, 8, 'green_sh').r(3, 4, 4, 5, 'green').r(6, 2, 8, 3, 'green').r(2, 6, 3, 7, 'green_sh').r(7, 6, 8, 6, 'green')
    else:
        b.r(5, 2, 6, 8, 'green_sh').r(2, 3, 9, 6, 'green').r(1, 5, 10, 7, 'green').r(3, 1, 8, 2, 'green').r(3, 6, 4, 7, 'green_sh').r(8, 4, 9, 5, 'green_sh')
        b.p(4, 2, 'pink').p(8, 3, 'pink').p(2, 5, 'gold')   # small flowers
    return b.im
def pot_round(v, planted):  # 10x16 plain terracotta, reusable for pots ②③ (recolour band rows 11-12)
    b = L(10, 16).r(0, 7, 9, 8, 'orange_sh').r(1, 9, 8, 15, 'orange').r(7, 9, 8, 15, 'orange_sh').r(1, 11, 8, 11, 'orange_sh')
    if planted: b.r(2, 1, 7, 5, 'green').r(1, 3, 8, 5, 'green').r(4, 0, 5, 0, 'green').r(5, 2, 7, 4, 'green_sh').p(3, 2, 'gold')
    else: b.r(1, 6, 8, 6, 'ink')
    return b.im
def trough(v, planted):  # 26x10 window-box trough (sits on the parapet coping or the floor)
    b = L(26, 10).r(0, 4, 25, 4, 'green_sh').r(0, 5, 25, 9, 'green').r(0, 9, 25, 9, 'green_sh')
    for x in (8, 17): b.r(x, 5, x, 8, 'green_sh')
    if planted:
        for x, k in ((1, 'green'), (6, 'green_sh'), (11, 'green'), (16, 'green_sh'), (21, 'green')): b.r(x, 1, x + 3, 3, k).p(x + 1, 0, k)
        for x in (3, 13, 22): b.p(x, 0, 'red_sh' if x != 13 else 'gold')   # tomatoes / herb flower
    else: b.r(1, 3, 24, 3, 'ink')
    return b.im
def pot_tall(v, planted):  # 10x26 tall zinc planter + small olive tree
    b = L(10, 26).r(1, 14, 8, 25, 'silver').r(7, 14, 8, 25, 'grey').r(0, 13, 9, 13, 'grey')
    if planted: b.r(4, 6, 5, 12, 'wood').r(1, 1, 8, 6, 'green_sh').r(2, 0, 7, 4, 'green').r(0, 3, 2, 5, 'green')
    else: b.r(1, 12, 8, 12, 'ink')
    return b.im
def arrosoir(v, held):  # old zinc watering can, dented. floor: 13x9; held: 13x9 tilted forward to pour
    b = L(13, 9)
    if not held:
        b.r(3, 2, 9, 8, 'silver').r(8, 2, 9, 8, 'grey').r(3, 8, 9, 8, 'grey').r(4, 1, 8, 1, 'grey')
        b.p(5, 5, 'grey').p(6, 4, 'grey')                       # dent
        b.r(4, 0, 8, 0, 'grey').p(3, 1, 'grey').p(9, 1, 'grey')  # handle arc
        b.r(10, 4, 10, 5, 'grey').r(11, 2, 11, 3, 'grey').r(12, 1, 12, 2, 'silver')   # spout + rose
        b.r(0, 3, 2, 3, 'grey').p(0, 4, 'grey')                # side handle tip
    else:   # tilted ~30 deg, spout down-right
        b.r(2, 1, 8, 6, 'silver').r(7, 2, 8, 7, 'grey').r(3, 0, 6, 0, 'grey').p(4, 3, 'grey').p(5, 4, 'grey')
        b.r(9, 5, 9, 6, 'grey').r(10, 6, 10, 7, 'grey').r(11, 7, 12, 8, 'silver')
        b.r(0, 1, 1, 1, 'grey').p(0, 2, 'grey')
    return b.im
STRAND_W = 112
BULBS = list(range(4, STRAND_W, 12))
def sag(x): return int(round(6 * np.sin(np.pi * x / (STRAND_W - 1))))
def string_lights(v, on):  # 112x11 strand, hooked at x0 (door cap) and x111 (pole), sag 6 px; bulbs every 12
    b = L(STRAND_W, 11)
    for x in range(STRAND_W): b.p(x, sag(x), 'dark')
    for x in BULBS:
        y = sag(x) + 1; b.p(x, y, 'dark')
        if on: b.r(x - 1, y + 1, x + 1, y + 2, 'gold').p(x, y + 1, 'white').p(x, y + 3, 'gold')
        else: b.r(x - 1, y + 1, x + 1, y + 2, 'silver').p(x, y + 3, 'grey')
    return b.im
def pole(v):  # 4x46 painted iron pole on a small zinc foot (right-hand hook for the strand)
    return L(4, 46).r(1, 0, 2, 43, 'dark').r(0, 0, 3, 0, 'dark').r(0, 44, 3, 45, 'grey').im

# ======================= rev 2 (Croissant review): overrides =======================
RIM = {'day': None, 'evening': None, 'night': 'grey'}
def rim(b, x0, x1, y, k):   # faint cool rim: dithered 1-px highlight on a roofline
    for x in range(x0, x1 + 1):
        if x % 2 == 0: b.p(x, y, k)
def skyline_far(v):  # 96x80: distant blocks + dome, roof rims + chimney silhouettes
    c = SC[v]; b = L(96, 80); blocks = ((0, 13, 30), (14, 25, 22), (26, 39, 34), (40, 49, 18), (50, 63, 28), (64, 77, 24), (78, 95, 32))
    for x0, x1, t in blocks: b.r(x0, t, x1, 79, c['far'])
    b.r(42, 14, 47, 17, c['far']).r(43, 12, 46, 13, c['far']).p(44, 10, c['far']).p(44, 11, c['far'])
    for x0, x1, t in blocks: b.r(x0 + 3, t - 3, x0 + 4, t - 1, c['far']).r(x1 - 4, t - 2, x1 - 3, t - 1, c['far'])   # chimney stacks
    if RIM[v]:
        for x0, x1, t in blocks: rim(b, x0, x1, t, 'grey'); b.p(x0 + 3, t - 3, 'grey'); b.p(x1 - 3, t - 2, 'grey')
        b.p(44, 10, 'grey').r(43, 12, 46, 12, 'grey')
        for x0, x1, t in blocks:   # a few tiny lit windows far away (1x1 inside the block, framed by the block colour)
            for wx in range(x0 + 2, x1 - 1, 4):
                if (wx * 5 + t) % 7 == 0: b.p(wx, t + 6, 'gold')
    return b.im
def skyline(v):  # 96x80 near row: mansards, chimney pots, framed windows inside facades
    c = SC[v]; b = L(96, 80); rows = ((0, 21, 46), (22, 45, 40), (46, 63, 50), (64, 95, 44))
    frame_k = {'day': 'white', 'evening': 'plum', 'night': 'ink'}[v]; off = {'day': 'navy', 'evening': 'plum', 'night': 'navy_sh'}[v]
    for x0, x1, t in rows:
        b.r(x0, t + 6, x1, 79, c['fac']).r(x0, t, x1, t + 5, c['zinc']).r(x0 + 1, t - 1, x1 - 1, t - 1, c['zinc_sh']); b.r(x1, t + 6, x1, 79, c['fac_sh'])
        b.r(x0, t + 6, x1, t + 6, c['zinc_sh'] if v != 'day' else c['fac_sh'])        # cornice line
        for wx in range(x0 + 2, x1 - 3, 6):
            b.r(wx, t + 1, wx + 3, t + 4, c['zinc_sh']).r(wx + 1, t + 2, wx + 2, t + 4, c['win'] if (wx + t) % 3 == 0 else off)   # dormer
            for wy in (t + 9, t + 17, t + 25):
                if wy + 4 >= 80: continue
                lit = v == 'day' or (wx * 3 + wy) % 5 in (0, 2)
                b.r(wx, wy, wx + 3, wy + 4, frame_k).r(wx + 1, wy + 1, wx + 2, wy + 3, c['win'] if lit else off)
                if v == 'day': b.r(wx + 1, wy + 2, wx + 2, wy + 2, frame_k)          # transom bar
    for x, t in ((5, 40), (30, 34), (55, 44), (72, 38), (88, 38)):
        b.r(x, t, x + 4, t + 6, c['chim'])
        for px in (x, x + 2, x + 4): b.r(px, t - 2, px, t - 1, c['chim'] if v != 'night' else 'dark')   # chimney pots
        if v == 'night': b.r(x, t, x + 4, t + 6, 'dark')
    if RIM[v]:
        for x0, x1, t in rows: b.r(x0 + 1, t - 1, x1 - 1, t - 1, 'grey'); rim(b, x0 + 1, x1 - 1, t, 'grey')
        for x, t in ((5, 40), (30, 34), (55, 44), (72, 38), (88, 38)):
            for px in (x, x + 2, x + 4): b.p(px, t - 2, 'silver')
            b.r(x, t, x + 4, t, 'grey').r(x, t, x, t + 3, 'grey')
    return b.im
def pot1(v, stage):  # 14x26: hero pot 1 « Chez nous ». night version uses lighter paint so band + heart survive the night grade
    n = v == 'night'; terra, terra_sh = ('orange', 'orange_sh') if n else ('orange', 'orange_sh'); band, band_sh = ('sky', 'grey') if n else ('sky', 'navy')
    b = L(14, 26).r(0, 13, 13, 14, terra).r(1, 15, 12, 25, terra).r(11, 15, 12, 25, terra_sh).r(2, 25, 11, 25, terra_sh)
    b.r(1, 16, 12, 21, band).r(11, 16, 12, 21, band_sh)
    b.r(4, 17, 5, 17, 'pink').r(8, 17, 9, 17, 'pink').r(4, 18, 9, 18, 'pink').r(5, 19, 8, 19, 'pink').r(6, 20, 7, 20, 'pink').p(6, 17, 'mouth' if False else 'pink')  # heart 6x4
    b.r(5, 17, 8, 17, 'pink'); b.p(6, 17, band).p(7, 17, band)
    b.r(1, 12, 12, 12, 'ink')
    if stage == 'sprout': b.r(6, 9, 7, 11, 'green').r(4, 8, 5, 9, 'green').r(8, 8, 9, 9, 'green')
    elif stage == 'young':
        b.r(6, 4, 7, 11, 'green_sh').r(3, 5, 5, 7, 'green').r(8, 3, 11, 5, 'green').r(2, 8, 5, 9, 'green_sh').r(8, 7, 11, 8, 'green').r(5, 2, 7, 3, 'green')
    else:
        b.r(1, 2, 12, 11, 'green').r(0, 4, 13, 9, 'green').r(3, 0, 10, 1, 'green').r(2, 6, 4, 8, 'green_sh').r(9, 3, 11, 5, 'green_sh').r(6, 8, 8, 11, 'green_sh')
        for x, y in ((3, 2), (8, 1), (11, 7), (1, 5), (6, 5)): b.r(x, y, x + 1, y + 1, 'pink').p(x, y, 'white')   # flowers
    return b.im
def pot_round(v, planted):  # 12x20 terracotta; planted = geranium (recolour band row y14 for pots 2/3)
    b = L(12, 20).r(0, 9, 11, 10, 'orange_sh').r(1, 11, 10, 19, 'orange').r(9, 11, 10, 19, 'orange_sh').r(1, 14, 10, 14, 'orange_sh')
    if planted:
        b.r(1, 2, 10, 8, 'green').r(0, 4, 11, 7, 'green').r(2, 6, 4, 8, 'green_sh').r(8, 3, 10, 5, 'green_sh')
        for x, y in ((2, 0), (6, 1), (9, 0), (4, 3)): b.r(x, y, x + 2, y + 1, 'red_sh').p(x + 1, y, 'pink')
    else: b.r(1, 8, 10, 8, 'ink')
    return b.im
def trough(v, kind):  # 28x16 window-box on the coping; kind: 'empty' | 'herbs' (herbs + tomatoes) | 'flowers' (geraniums)
    b = L(28, 16).r(0, 10, 27, 10, 'green_sh').r(0, 11, 27, 15, 'green').r(0, 15, 27, 15, 'green_sh')
    for x in (9, 18): b.r(x, 11, x, 14, 'green_sh')
    if kind == 'empty': return b.r(1, 9, 26, 9, 'ink').im
    b.r(0, 3, 27, 9, 'green').r(2, 1, 9, 2, 'green').r(13, 0, 20, 2, 'green').r(22, 2, 26, 2, 'green')
    for x in range(1, 27, 4): b.r(x, 5, x + 1, 8, 'green_sh')
    if kind == 'herbs':
        b.r(15, 0, 15, 3, 'green_sh').r(18, 1, 18, 3, 'green_sh')
        for x, y in ((3, 4), (7, 6), (23, 5), (20, 7)): b.r(x, y, x + 1, y + 1, 'red_sh').p(x, y, 'orange')   # tomatoes
        b.p(14, 1, 'gold').p(17, 0, 'white').p(11, 3, 'white')   # herb flowers
    else:
        for x, y in ((2, 1), (7, 3), (13, 0), (18, 2), (23, 1), (10, 6), (21, 6)): b.r(x, y, x + 2, y + 1, 'red_sh').p(x + 1, y, 'pink')
    return b.im
def ivy(v):  # 12x10 trailing ivy hanging over the parapet face; topleft at the coping top
    b = L(12, 10)
    for x0, ln in ((1, 9), (4, 6), (7, 10), (10, 5)):
        b.r(x0, 0, x0, ln - 1, 'green_sh')
        for y in range(1, ln, 2): b.p(x0 - 1 + (y // 2) % 2 * 2, y, 'green')
    return b.r(0, 0, 11, 1, 'green').im
def pot_tall(v, planted):  # 12x32 zinc planter + olive tree
    b = L(12, 32).r(1, 18, 10, 31, 'silver').r(9, 18, 10, 31, 'grey').r(0, 17, 11, 17, 'grey')
    if planted:
        b.r(5, 8, 6, 16, 'wood').r(4, 11, 4, 12, 'wood').r(0, 2, 11, 9, 'green_sh').r(1, 0, 10, 6, 'green').r(0, 4, 3, 7, 'green').r(8, 3, 11, 6, 'green')
        for x, y in ((2, 2), (7, 1), (9, 5), (4, 6)): b.p(x, y, 'silver')   # olive-leaf glints
    else: b.r(1, 16, 10, 16, 'ink')
    return b.im
STRAND_W = 83
BULBS = list(range(4, STRAND_W - 2, 11))
def sag(x): return int(round(5 * np.sin(np.pi * x / (STRAND_W - 1))))
def string_lights(v, on):  # 83x10: catenary wire + end rings, bulbs on drop clips
    b = L(STRAND_W, 10); wire = 'grey' if on else 'dark'
    for x in range(STRAND_W): b.p(x, sag(x) + 1, wire)
    b.r(0, 0, 1, 2, 'grey').r(STRAND_W - 2, 0, STRAND_W - 1, 2, 'grey')   # anchor rings at both ends
    for x in BULBS:
        y = sag(x) + 2; b.p(x, y, wire)
        if on: b.r(x - 1, y + 1, x + 1, y + 2, 'gold').p(x, y + 1, 'white').p(x, y + 3, 'gold')
        else: b.r(x - 1, y + 1, x + 1, y + 2, 'silver').p(x, y + 3, 'grey')
    return b.im
def pole(v):  # 5x46 iron pole with a crossarm + hook eye at the top-left
    return L(5, 46).r(2, 0, 3, 43, 'dark').r(0, 0, 4, 1, 'dark').p(0, 2, 'dark').r(1, 44, 4, 45, 'grey').im
_rd = roof_door
def roof_door(v, opened):  # + iron bracket on the cap (strand anchor)
    b = L(32, 44); b.im = _rd(v, opened); return b.r(28, 0, 31, 0, 'dark').r(31, 0, 31, 3, 'dark').im
# name: (fn, anchor, anchorPoint, extras)
TL = lambda w, h: {'x': 0, 'y': 0}
PIECES = {
 'sky': (sky, 'topleft', TL, {'tile': 'x', 'tileWidth': 192, 'depth': 0, 'ungraded': True}),
 'skyline_far': (skyline_far, 'baseline', BOT, {'tile': 'x', 'tileWidth': 96, 'depth': 0, 'ungraded': True, 'note': 'draw sky -> skyline_far -> tower -> skyline'}),
 'skyline': (skyline, 'baseline', BOT, {'tile': 'x', 'tileWidth': 96, 'depth': 0, 'ungraded': True}),
 'tower': (tower, 'baseline', BOT, {'depth': 0, 'ungraded': True, 'note': 'draw between sky and skyline'}),
 'deck': (deck, 'topleft', TL, {'tile': 'x', 'tileWidth': 64, 'depth': 0}),
 'parapet': (parapet, 'baseline', BOT, {'tile': 'x', 'tileWidth': 32, 'depth': 1, 'slots': {'coping_top': {'y': 0}}}),
 'door_closed': (lambda v: roof_door(v, False), 'feet', BOT, {'depth': 2, 'slots': {'doorway': {'x': 16, 'y': 43}, 'strand_hook': {'x': 31, 'y': 2}}}),
 'door_open': (lambda v: roof_door(v, True), 'feet', BOT, {'depth': 2, 'slots': {'doorway': {'x': 16, 'y': 43}, 'strand_hook': {'x': 31, 'y': 2}}}),
 'bench': (bench, 'feet', BOT, {'depth': 2, 'sitLine': 5, 'slots': {'seat_l': {'x': 8, 'y': 5}, 'seat_r': {'x': 21, 'y': 5}, 'cat': {'x': 15, 'y': 5}}}),
 'pot1_sprout': (lambda v: pot1(v, 'sprout'), 'feet', BOT, {'depth': 3, 'special': 'pot 1 Chez nous'}),
 'pot1_young': (lambda v: pot1(v, 'young'), 'feet', BOT, {'depth': 3, 'special': 'pot 1 Chez nous'}),
 'pot1_full': (lambda v: pot1(v, 'full'), 'feet', BOT, {'depth': 3, 'special': 'pot 1 Chez nous'}),
 'potr_empty': (lambda v: pot_round(v, False), 'feet', BOT, {'depth': 3, 'recolour': 'band row y14 (orange_sh) -> any palette colour for pots 2/3'}),
 'potr_planted': (lambda v: pot_round(v, True), 'feet', BOT, {'depth': 3, 'recolour': 'band row y14'}),
 'trough_empty': (lambda v: trough(v, 'empty'), 'feet', BOT, {'depth': 3, 'recolour': 'green/green_sh -> plum/plum_sh or navy/navy_sh'}),
 'trough_planted': (lambda v: trough(v, 'herbs'), 'feet', BOT, {'depth': 3, 'note': 'herbs + tomatoes; sits on parapet coping (y117)'}),
 'trough_flowers': (lambda v: trough(v, 'flowers'), 'feet', BOT, {'depth': 3, 'note': 'geraniums'}),
 'ivy': (ivy, 'topleft', TL, {'depth': 3, 'note': 'hang from the coping top (y116) over the parapet face'}),
 'pott_empty': (lambda v: pot_tall(v, False), 'feet', BOT, {'depth': 3}),
 'pott_planted': (lambda v: pot_tall(v, True), 'feet', BOT, {'depth': 3}),
 'arrosoir_floor': (lambda v: arrosoir(v, False), 'feet', BOT, {'depth': 3}),
 'arrosoir_hand': (lambda v: arrosoir(v, True), 'baseline', BOT, {'depth': 5, 'handPoint': {'x': 4, 'y': 0}}),
 'lights_on': (lambda v: string_lights(v, True), 'topleft', TL, {'depth': 6, 'light': 'lamp string_lights', 'slots': {'hook_r': {'x': STRAND_W - 1, 'y': 0}}}),
 'lights_off': (lambda v: string_lights(v, False), 'topleft', TL, {'depth': 6, 'slots': {'hook_r': {'x': STRAND_W - 1, 'y': 0}}}),
 'pole': (pole, 'feet', BOT, {'depth': 2, 'slots': {'hook': {'x': 0, 'y': 2}}}),
}
IDS = {'sky': ('backdrop.rooftop_sky', 'sky'), 'skyline_far': ('backdrop.rooftop_skyline_far', 'skyline_far'), 'skyline': ('backdrop.rooftop_skyline', 'skyline'), 'tower': ('backdrop.rooftop_tower', 'tower'),
       'deck': ('backdrop.rooftop_floor', 'floor'), 'parapet': ('prop.parapet', 'parapet'),
       'door_closed': ('prop.roof_door_closed', 'roof_door_closed'), 'door_open': ('prop.roof_door_open', 'roof_door_open'), 'bench': ('prop.bench', 'bench'),
       'pot1_sprout': ('prop.pot_chez_nous_sprout', 'pot_chez_nous_sprout'), 'pot1_young': ('prop.pot_chez_nous_young', 'pot_chez_nous_young'), 'pot1_full': ('prop.pot_chez_nous_full', 'pot_chez_nous_full'),
       'potr_empty': ('prop.pot_round_empty', 'pot_round_empty'), 'potr_planted': ('prop.pot_round_planted', 'pot_round_planted'),
       'trough_empty': ('prop.trough_empty', 'trough_empty'), 'trough_planted': ('prop.trough_planted', 'trough_planted'), 'trough_flowers': ('prop.trough_flowers', 'trough_flowers'), 'ivy': ('prop.ivy', 'ivy'),
       'pott_empty': ('prop.pot_tall_empty', 'pot_tall_empty'), 'pott_planted': ('prop.pot_tall_planted', 'pot_tall_planted'),
       'arrosoir_floor': ('prop.arrosoir', 'arrosoir'), 'arrosoir_hand': ('handprop.arrosoir', 'arrosoir_hand'),
       'lights_on': ('prop.string_lights_on', 'string_lights_on'), 'lights_off': ('prop.string_lights_off', 'string_lights_off'), 'pole': ('prop.light_pole', 'light_pole')}
DOOR_X = 30; POLE_X = 128
STRAND_AT = (DOOR_X - 16 + 30, BACKBASE - 43)   # top-left = door bracket (x44,y88); right ring lands on the pole crossarm/hook (x126-127)
TOWER = (118, 92)
IVY = [(58, PARAPET_TOP), (112, PARAPET_TOP), (156, PARAPET_TOP), (88, PARAPET_TOP)]
LAYOUT = [('tower', *TOWER), ('door_closed', DOOR_X, BACKBASE), ('pole', POLE_X, BACKBASE),
          ('trough_planted', 66, PARAPET_TOP + 1), ('trough_flowers', 100, PARAPET_TOP + 1), ('trough_planted', 152, PARAPET_TOP + 1),
          ('pott_planted', 52, BACKBASE), ('bench', 100, BACKBASE), ('potr_planted', 140, BACKBASE), ('potr_planted', 162, BACKBASE), ('potr_empty', 178, BACKBASE),
          ('pot1_young', 70, 134), ('arrosoir_floor', 84, 135)]
def piece(n, v): return PIECES[n][0](v)
def build():
    man = {'assetRoot': '', 'atlases': {}, 'assets': {}}; sheets = {}
    for v in VARIANTS:
        ims = {n: piece(n, v) for n in PIECES}
        W = 192; x = y = rowh = 0; pos = {}
        for n, im in sorted(ims.items(), key=lambda t: (-t[1].height, t[0])):
            if x + im.width > W: x, y, rowh = 0, y + rowh + 1, 0
            pos[n] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
        H = y + rowh; sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for n, (a, b) in pos.items(): sh.alpha_composite(ims[n], (a, b))
        f = f'rooftop_{v}_sheet.png'; sh.save(f'{D}/{f}'); sheets[v] = ims
        bg = Image.new('RGBA', (W, H), (60, 60, 70, 255)); bg.alpha_composite(sh); bg.resize((W * 6, H * 6), Image.NEAREST).save(f'{D}/preview_{v}_x6.png')
        man['atlases'][f'rooftop_{v}'] = {'file': f, 'w': W, 'h': H}
        for n, im in ims.items():
            fn, anc, ap, ex = PIECES[n]
            a = {'source': 'atlas', 'atlas': f'rooftop_{v}', 'frame': {'x': pos[n][0], 'y': pos[n][1], 'w': im.width, 'h': im.height}, 'anchor': anc, 'anchorPoint': ap(im.width, im.height), 'pixelScale': 1}
            a.update(ex); a['file'] = f'pieces/{v}/{IDS[n][1]}.png'; man['assets'][f'{IDS[n][0]}.{v}'] = a
            os.makedirs(f'{D}/pieces/{v}', exist_ok=True); im.save(f'{D}/pieces/{v}/{IDS[n][1]}.png')
    man['stage'] = {'width': W_ST, 'height': H_ST, 'horizon': HORIZON, 'feetLine': FEET, 'backBase': BACKBASE, 'parapetTop': PARAPET_TOP,
        'layout': [{'piece': 'backdrop.rooftop_sky', 'x': 0, 'y': 0, 'tile': 'x'}, {'piece': 'backdrop.rooftop_skyline_far', 'x': 88, 'y': PARAPET_TOP - 1, 'tile': 'x', 'tileWidth': 96, 'note': 'offset 40 px vs near row'}, {'piece': 'backdrop.rooftop_skyline', 'x': 48, 'y': PARAPET_TOP - 1, 'tile': 'x', 'tileWidth': 96},
                   {'piece': 'backdrop.rooftop_floor', 'x': 0, 'y': HORIZON, 'tile': 'x', 'tileWidth': 64}, {'piece': 'prop.parapet', 'x': 16, 'y': HORIZON - 1, 'tile': 'x', 'tileWidth': 32}]
                  + [{'piece': IDS[n][0], 'x': x, 'y': y} for n, x, y in LAYOUT] + [{'piece': 'prop.ivy', 'x': x, 'y': y, 'anchor': 'topleft'} for x, y in IVY]
                  + [{'piece': 'prop.string_lights_off|prop.string_lights_on', 'x': STRAND_AT[0], 'y': STRAND_AT[1], 'anchor': 'topleft', 'variants': ['day/evening (off)', 'night (on)']}],
        'light': {'evening': 'light/golden.json', 'night': 'light/soir.json'},
        'ungraded': ['backdrop.rooftop_sky', 'backdrop.rooftop_skyline_far', 'backdrop.rooftop_skyline', 'backdrop.rooftop_tower', 'prop.string_lights_on (night emitter)'],
        'depthLayers': {'0': 'sky (tiled, ungraded) -> tower -> skyline (tiled, ungraded) ; deck (tiled)', '1': 'parapet (tiled)', '2': 'back props on backBase: roof door, bench, light pole',
                        '3': 'pots, troughs, floor arrosoir (on floor or parapet coping y116)', '4': 'cast + cat on feetLine, sorted by feet y', '5': 'hand props (handPoint)',
                        '6': 'string lights (topleft at door strand_hook)', '7': 'light multiply + add (graded layers only), cast reduced'}}
    json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1); return sheets
def stage(v, ims, graded_only=None):
    """graded_only: None = everything; 'back' = only ungraded scenery; 'front' = only graded layers."""
    s = Image.new('RGBA', (W_ST, H_ST), (0, 0, 0, 0))
    if graded_only != 'front':
        s.alpha_composite(ims['sky'], (0, 0))
        for x in range(0, W_ST, 96): s.alpha_composite(ims['skyline_far'], (x + 40 - 96, PARAPET_TOP - 80)); s.alpha_composite(ims['skyline_far'], (x + 40, PARAPET_TOP - 80))
        t = ims['tower']; s.alpha_composite(t, (TOWER[0] - t.width // 2, TOWER[1] - t.height + 1))
        for x in range(0, W_ST, 96): s.alpha_composite(ims['skyline'], (x, PARAPET_TOP - 80))
    if graded_only == 'back': return s
    for x in range(0, W_ST, 64): s.alpha_composite(ims['deck'], (x, HORIZON))
    for x in range(0, W_ST, 32): s.alpha_composite(ims['parapet'], (x, PARAPET_TOP))
    for x, y in IVY: s.alpha_composite(ims['ivy'], (x, y))
    for n, x, y in LAYOUT:
        if n == 'tower': continue
        im = ims[n]; a = PIECES[n][2](im.width, im.height); s.alpha_composite(im, (x - a['x'], y - a['y']))
    if v != 'night': s.alpha_composite(ims['lights_off'], STRAND_AT)
    return s
# ---------- light ----------
def bulbs_stage(): return [(STRAND_AT[0] + x, STRAND_AT[1] + sag(x) + 2) for x in BULBS]
def lightmap(v):
    yy, xx = np.indices((H_ST, W_ST)).astype(float); M = np.ones((H_ST, W_ST, 3)); A = np.zeros((H_ST, W_ST, 3)); lamps = []; extra = {}
    if v == 'night':
        M[:] = COOL_T * 1.25
        WA = np.array([255, 150, 50]) / 255.0
        def ell(cx, cy, rx, ry): return np.hypot((xx - cx) / rx, (yy - cy) / ry)
        add = np.zeros((H_ST, W_ST)); lift = np.zeros((H_ST, W_ST))
        for bx, by in bulbs_stage():
            fe = ell(bx, FEET - 1, 9, 4); add = np.maximum(add, np.where(fe <= 0.6, 56, np.where(fe <= 1, 28, 0)) * (yy >= HORIZON))   # floor pools
            pe = ell(bx, PARAPET_TOP + 2, 7, 2.5); add = np.maximum(add, (pe <= 1) * 30 * (yy >= PARAPET_TOP) * (yy < HORIZON))      # coping catch-light
            lift = np.maximum(lift, (np.abs(xx - bx) <= 7) & (yy >= by + 8) & (yy <= FEET))
        pe = ell(70, FEET - 1, 12, 4.5); add = np.maximum(add, np.where(pe <= 0.6, 59, np.where(pe <= 1, 34, 0)) * (yy >= HORIZON))   # hero pool under pot 1
        hero = np.zeros((H_ST, W_ST), bool); pa = np.asarray(pot1('night', 'full'))[..., 3] > 0   # pot-1 silhouette (full = largest stage) at its slot
        hero[134 - 25:134 + 1, 70 - 7:70 - 7 + 14] = pa
        add = np.maximum(add, hero * 28)
        A += add[..., None] * WA; M += (0.45 * lift)[..., None] * (WARM * 1.1 - M)
        M[hero] = np.maximum(M[hero], 0.85)   # pot 1 keeps its (night-lightened) paint: neutral multiply + warm add 40
        lamps.append({'id': 'pot_chez_nous_spot', 'x': 70, 'y': 134, 'shape': 'hero: pot-1 silhouette mask (full stage, top-left 63,109) multiply 0.85 + add 28; floor pool 59/34 (rev 2.1: -30%) (ellipse 12x4.5)'})
        lamps.append({'id': 'string_lights', 'bulbs': [{'x': int(a), 'y': int(b)} for a, b in bulbs_stage()],
                      'shape': 'add: no air glow; per bulb a flat floor pool 56/28 (ellipse 9x4 at feetLine-1) + coping catch-light 30; multiply lift 0.45 in a 15-px column below each bulb (props + cast)'})
        extra['scenery'] = {'note': 'sky, tower, skyline are ungraded (they carry their own night colours, lit windows); the map is ignored there'}
    elif v == 'evening':
        base = np.array([0.88, 0.78, 0.68]); corner = steps(np.abs(xx - 96), 96.0, 3, False)
        M[:] = base * (0.74 + 0.26 * corner[..., None])
        side = ((xx - 60) ** 2 / 70 ** 2 + (yy - 128) ** 2 / 14 ** 2 <= 1)   # low sun from the left (sun sits at x60 in the sky)
        M += (0.6 * side)[..., None] * (np.array([1.2, 1.02, 0.72]) - M)
        lamps.append({'id': 'low_sun', 'shape': 'flat warm ellipse on parapet + deck under the sun (x60), multiply only', 'color': [1.2, 1.02, 0.72]})
        extra['scenery'] = {'note': 'sky, tower, skyline ungraded (own sunset colours)'}
    M = np.clip(M, 0, CAP); return M, lamps, extra, np.clip(A, 0, 254)
def write_light(v, M, lamps, extra, A):
    os.makedirs(f'{D}/light', exist_ok=True)
    Image.fromarray(np.clip(M * 127.5, 0, 255).astype('uint8'), 'RGB').save(f'{D}/light/{v}_multiplier_half.png')
    j = {'multiply': {'src': f'light/{v}_multiplier_half.png', 'decode': 'x2 (= map*127.5)', 'cool': COOL.tolist(), 'cool_used': COOL_T.tolist(),
                      'deviation': 'night base hue nudged toward teal, same as kitchen soir.json', 'warm': WARM.tolist(), 'cap': CAP, 'lamps': lamps, **extra,
                      'ungraded': ['backdrop.rooftop_sky', 'backdrop.rooftop_skyline_far', 'backdrop.rooftop_skyline', 'backdrop.rooftop_tower', 'prop.string_lights_on'],
                      'cast': 'same map at strength 0.25 when <1, 0.6 when >1'}}
    if A.max() > 0:
        Image.fromarray((A / 2).astype('uint8'), 'RGB').save(f'{D}/light/{v}_add_half.png')
        j['add'] = {'src': f'light/{v}_add_half.png', 'decode': 'x2 (= value*2, 0..254 per channel)', 'blend': 'additive (linear dodge)',
                    'order': 'out = clamp(src * multiply + add); multiply first, then add', 'cast': 'add at 0.6 strength on cast pixels'}
    json.dump(j, open(f'{D}/light/{"soir" if v == "night" else "golden"}.json', 'w'), indent=1)
CAST_WIDE = [('camille.stand', 56, FEET, False), ('noe.stand', 88, FEET, False), ('croissant.sit', 100, BACKBASE - 13 + 5, False), ('martin.stand', 114, FEET, True), ('lefevre.stand', 138, FEET, True)]
CAST_MED = [('camille.stand', 56, FEET, False), ('noe.stand', 88, FEET, False), ('croissant.sit', 100, BACKBASE - 13 + 5, False), ('martin.stand', 112, FEET, True), ('lefevre.stand', 122, FEET, True)]
CAST_CLOSE = [('noe.stand', 84, FEET, False), ('croissant.sit', 100, BACKBASE - 13 + 5, False), ('camille.stand', 112, FEET, True)]
CAMERAS = {'wide': (8, (2, 12), CAST_WIDE), 'medium': (12, (40, 56), CAST_MED), 'close': (18, (60, 85), CAST_CLOSE)}
def scene(v, ims, cast):
    back = stage(v, ims, 'back'); front = stage(v, ims, 'front'); castl = Image.new('RGBA', back.size, (0, 0, 0, 0))
    for n, x, y, fl in cast: put(castl, n, x, y, fl, shadow=not n.startswith('croissant.sit'))
    if v != 'day':
        M, _, _, A = lightmap(v); front = grade(front, M, 1.0, A); castl = grade(castl, M, 0.25, A, 0.6)
    back.alpha_composite(front)
    if v == 'night': back.alpha_composite(ims['lights_on'], STRAND_AT)   # emitter ungraded
    back.alpha_composite(castl); return back
def portrait(v, ims, mode, cam):
    K, CAM, cast = CAMERAS[cam]; sc = scene(v, ims, cast); W, H = -(-1080 // K), -(-1056 // K)
    view = sc.crop((CAM[0], CAM[1], CAM[0] + W, CAM[1] + H)).resize((W * K, H * K), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), (0, 0, 0, 255)); out.alpha_composite(view, (0, 288))
    top = ims['sky'].getpixel((CAM[0] + 2, CAM[1]))   ; floorc = sc.getpixel((CAM[0] + 1, 143))   # sky continues up = bubble / caption space; floorc = sc.getpixel((CAM[0] + 1, 143))
    def dim(c, f): return tuple(int(x * f) for x in c[:3]) + (255,)
    def band(y0, y1, c, lc):
        b = Image.new('RGBA', (1080, y1 - y0), dim(c, 0.55)); px = b.load()
        for x in range(24, 1056):
            for yy in (24, 25, y1 - y0 - 26, y1 - y0 - 25):
                if (x // 16) % 2 == 0: px[x, yy] = lc
        for yy in range(24, y1 - y0 - 24):
            for x in (24, 25, 1054, 1055):
                if (yy // 16) % 2 == 0: px[x, yy] = lc
        out.alpha_composite(b, (0, y0))
    if mode == 'game':
        out.alpha_composite(Image.new('RGBA', (1080, 288), top), (0, 0)); band(1344, 1920, floorc, dim(floorc, 0.85))
    else:
        band(0, 288, top, dim(top, 0.8)); out.alpha_composite(Image.new('RGBA', (1080, 576), floorc), (0, 1344))
    return out
def composites(sheets):
    for v in VARIANTS:
        ims = sheets[v]
        if v != 'day': write_light(v, *lightmap(v))
        s = scene(v, ims, CAST_WIDE); s.save(f'{D}/stage_{v}_x1.png'); s.resize((W_ST * 6, H_ST * 6), Image.NEAREST).save(f'{D}/stage_{v}_x6.png')
        s.crop((0, 64, 192, 144)).resize((1920, 800), Image.NEAREST).save(f'{D}/composite_landscape_{v}.png')
        for cam in CAMERAS:
            for mode in ('game', 'shorts'):
                o = portrait(v, ims, cam=cam, mode=mode); o.save(f'{D}/composite_{cam}_{mode}_{v}_1080x1920.png'); o.resize((180, 320), Image.LANCZOS).save(f'{D}/composite_{cam}_{mode}_{v}_small.png')
if __name__ == '__main__':
    composites(build()); print('built', VARIANTS)
