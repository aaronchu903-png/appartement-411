"""411 kitchen set, global style B. Original code art (PIL), canonical palette only.
Run: python3 gen_kitchen.py  -> kitchen_<variant>_sheet.png, x10 previews, manifest.json, composites."""
import json, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); CAN = os.path.normpath(os.path.join(D, '..', '..'))
PAL = json.load(open(f'{CAN}/palette.json'))
def C(k): h = PAL[k]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
class L:
    def __init__(s, w, h): s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    def r(s, x0, y0, x1, y1, k):
        for y in range(max(0, y0), min(s.im.height, y1 + 1)):
            for x in range(max(0, x0), min(s.im.width, x1 + 1)): s.im.putpixel((x, y), C(k))
        return s
    def p(s, x, y, k): return s.r(x, y, x, y, k)
HORIZON = 128   # wall bottom (top of floor) in stage coords; skirting rows 126-127
FEET = 136      # cast feet line = horizon + 8 (STYLE_GUIDE §5)
BACKBASE = 131  # base line of back-wall furniture (fridge, counter, desk, table set)

# ---------- pieces: name -> (draw(variant) -> Image, anchor, anchorPoint fn, extras) ----------
def wall(v):   # 64x128, tiles horizontally
    b = L(64, 128).r(0, 0, 63, 127, 'wall')
    for x in (15, 47): b.r(x, 0, x, 125, 'wall_sh')       # faint wallpaper seams (period 32 -> tiles at 64)
    return b.r(0, 126, 63, 127, 'wood').im
def floor(v):  # 64x16, tiles; boards like the living room
    b = L(64, 16).r(0, 0, 63, 15, 'floor')
    for x in range(2, 64, 6): b.r(x, 1, x, 15, 'floor_sh')
    return b.r(0, 0, 63, 0, 'floor_sh').im
def backsplash(v):  # 48x12 tiles behind the counter
    b = L(48, 12).r(0, 0, 47, 11, 'white')
    for x in range(0, 48, 4): b.r(x, 0, x, 11, 'silver')
    for y in (3, 7, 11): b.r(0, y, 47, y, 'silver')
    return b.im
SKY = {'day': ('sky', 'white', 'silver', 'grey', 'cream'), 'evening': ('pink', 'gold', 'grey', 'plum', 'wall_sh'),
       'night': ('navy_sh', 'white', 'navy', 'dark', 'navy')}
def window(v):  # 28x24 Paris rooftops
    sky, sun, zinc, zinc_sh, facade = SKY[v]
    b = L(28, 24).r(0, 0, 27, 23, 'wood').r(2, 2, 25, 20, sky)
    if v == 'day': b.r(4, 4, 7, 5, 'white').r(5, 3, 6, 3, 'white')            # cloud
    elif v == 'evening': b.r(4, 3, 26, 6, 'orange').r(18, 7, 21, 9, 'gold').r(2, 10, 25, 11, 'gold')  # sunset bands + sun
    else: b.p(20, 4, 'white').p(6, 6, 'white').p(11, 3, 'white').r(17, 5, 19, 7, 'cream')  # stars + moon
    # back row of buildings + zinc mansard roofs, chimney pots
    b.r(2, 12, 12, 20, facade).r(2, 11, 12, 12, zinc).r(3, 10, 11, 10, zinc_sh)
    b.r(5, 7, 6, 9, 'orange_sh').r(5, 7, 6, 7, 'red_sh').r(9, 8, 9, 9, 'orange_sh')
    b.r(14, 13, 25, 20, facade).r(14, 12, 25, 13, zinc).r(15, 11, 24, 11, zinc_sh)
    b.r(21, 8, 22, 10, 'orange_sh').r(21, 8, 22, 8, 'red_sh').r(17, 9, 17, 10, 'orange_sh')
    lit = 'gold' if v != 'day' else zinc_sh
    for x in (4, 8, 16, 20, 23): b.r(x, 15, x, 17, lit if (x % 8 == 0 or v == 'night') else zinc_sh)
    b.r(13, 2, 14, 20, 'wood').r(2, 11, 25, 11, 'wood') if False else b.r(13, 2, 14, 20, 'wood')  # mullion
    return b.r(0, 21, 27, 23, 'white').r(0, 23, 27, 23, 'silver').im   # sill
def shelf(v):  # 32x10 jars and mugs on a plank
    b = L(32, 10).r(0, 7, 31, 8, 'wood').r(3, 9, 4, 9, 'ink').r(27, 9, 28, 9, 'ink')
    b.r(1, 2, 5, 6, 'silver').r(1, 1, 5, 1, 'red_sh').r(2, 4, 4, 6, 'gold')            # jar (honey)
    b.r(7, 3, 10, 6, 'silver').r(7, 2, 10, 2, 'green').r(8, 5, 9, 6, 'cream')           # jar (sugar)
    b.r(12, 1, 15, 6, 'silver').r(12, 0, 15, 0, 'gold').r(13, 3, 14, 6, 'noe_hair')     # coffee jar
    b.r(18, 4, 20, 6, 'white').p(21, 5, 'white')                                       # mugs
    b.r(23, 4, 25, 6, 'green').p(26, 5, 'green')
    return b.r(28, 3, 30, 6, 'orange').p(31, 4, 'orange').im
def fridge(v):  # 16x29
    b = L(16, 29).r(1, 0, 14, 27, 'white').r(13, 0, 14, 27, 'silver').r(1, 9, 14, 9, 'silver')
    b.r(3, 3, 3, 7, 'grey').r(3, 11, 3, 17, 'grey')                       # handles
    b.r(7, 13, 8, 14, 'pink').r(10, 16, 11, 17, 'gold').r(6, 3, 9, 5, 'cream')  # magnets + blank note
    return b.r(2, 28, 3, 28, 'dark').r(12, 28, 13, 28, 'dark').im
def counter(v):  # 48x18 (14 body + 4 tap)
    b = L(48, 18).r(0, 4, 47, 5, 'wood').r(0, 6, 47, 17, 'green').r(0, 17, 47, 17, 'green_sh')
    for x in (15, 31): b.r(x, 6, x, 16, 'green_sh')
    for x in (7, 23, 39): b.r(x, 8, x, 9, 'gold')                         # knobs
    b.r(18, 4, 29, 4, 'silver').r(19, 5, 28, 5, 'grey')                   # sink basin
    b.r(23, 0, 24, 0, 'silver').r(23, 0, 23, 3, 'silver').r(25, 1, 25, 1, 'grey')  # tap
    return b.r(4, 2, 6, 3, 'plum').r(41, 1, 44, 3, 'silver').r(40, 2, 40, 2, 'dark').im  # bottle? small pot + kettle
def table(v):  # 44x12 (table4: seats 2 behind + 2 end chairs; was 28x12)
    b = L(44, 12).r(0, 0, 43, 1, 'wood').r(0, 2, 43, 2, 'ink')
    return b.r(2, 3, 3, 11, 'wood').r(40, 3, 41, 11, 'wood').im
def chair(v):  # 10x16
    b = L(10, 16).r(1, 0, 2, 15, 'wood').r(1, 0, 8, 1, 'wood').r(1, 4, 6, 4, 'wood')
    return b.r(1, 9, 9, 10, 'wood').r(8, 11, 9, 15, 'wood').r(1, 11, 2, 15, 'ink').im
def desk(v):  # 32x20: desk + open laptop seen from the front; keyboard deck x6-23 y7 (cat, 14 wide, fits)
    b = L(32, 20).r(0, 8, 31, 9, 'wood').r(0, 10, 31, 10, 'ink').r(1, 11, 2, 19, 'wood').r(29, 11, 30, 19, 'wood')
    b.r(22, 11, 28, 16, 'wood').r(23, 13, 27, 13, 'gold')                  # drawer
    b.r(7, 0, 22, 6, 'grey').r(8, 1, 21, 5, 'navy' if v != 'night' else 'sky')   # screen
    return b.r(6, 7, 23, 7, 'silver').r(8, 6, 21, 6, 'dark').im             # deck + keys
def laptop_open(v):  # 14x10, screen up (for non-cat beats), separate so it can stack on desk
    b = L(14, 10).r(1, 0, 12, 7, 'grey').r(2, 1, 11, 6, 'navy' if v != 'night' else 'sky')
    return b.r(0, 8, 13, 9, 'silver').r(2, 8, 11, 8, 'dark').im
def plant(v):  # 8x11 Day 1 pot, blank label patch
    b = L(8, 11).r(1, 5, 6, 10, 'orange_sh').r(0, 5, 7, 5, 'orange').r(2, 7, 5, 8, 'cream')
    return b.r(3, 1, 4, 4, 'green').r(1, 2, 2, 3, 'green').r(5, 0, 6, 2, 'green_sh').r(2, 0, 2, 1, 'green_sh').im
def milk(v):   # 4x6
    return L(4, 6).r(0, 1, 3, 5, 'white').r(1, 0, 2, 0, 'white').r(0, 3, 3, 3, 'navy').r(3, 1, 3, 5, 'silver').im
def cup(v):    # 5x4
    return L(5, 4).r(0, 0, 3, 3, 'white').r(3, 0, 3, 3, 'silver').r(4, 1, 4, 2, 'white').r(1, 0, 2, 0, 'noe_hair').im
def plate(v):  # 6x2
    return L(6, 2).r(0, 0, 5, 0, 'white').r(1, 1, 4, 1, 'silver').im
def pendant(v, on):  # 9x30: cord from the ceiling line + shade; anchor = cord top
    b = L(9, 30).r(4, 0, 4, 23, 'dark').r(2, 24, 6, 25, 'green').r(1, 26, 7, 27, 'green').r(1, 27, 7, 27, 'green_sh')
    return (b.r(3, 28, 5, 28, 'white').r(2, 28, 2, 28, 'gold').r(6, 28, 6, 28, 'gold').r(3, 29, 5, 29, 'gold') if on else b.r(3, 28, 5, 28, 'grey')).im
# ---------- upper-wall dressing (pb14) ----------
CORNICE_TILE = 16
def cornice(v):  # 16x6, tiles in x (period 16): flat band, bead row, cove shadow, dentils
    b = L(16, 6).r(0, 0, 15, 1, 'cream').r(0, 2, 15, 2, 'wall_sh').r(0, 3, 15, 3, 'cream')
    for x in range(1, 16, 4): b.r(x, 4, x + 1, 4, 'cream')   # dentil blocks every 4 px -> seamless at 16
    return b.r(0, 5, 15, 5, 'wall_sh').im
def upper_cabinets(v):  # 48x20: run of 3 doors over the counter, same green as the base units
    b = L(48, 20).r(0, 0, 47, 1, 'wood').r(0, 2, 47, 17, 'green').r(0, 18, 47, 18, 'green_sh').r(1, 19, 46, 19, 'green_sh')
    for x in (15, 31): b.r(x, 2, x, 17, 'green_sh')
    for x0 in (0, 16, 32): b.r(x0 + 2, 4, x0 + 13, 4, 'green_sh').r(x0 + 2, 15, x0 + 13, 15, 'green_sh')  # flat panel lines
    for x in (12, 19, 28, 35): b.r(x, 11, x, 13, 'gold')                     # handles near the door meets
    return b.im
def clock(v):  # 9x9 round wall clock, no numerals
    b = L(9, 9).r(2, 0, 6, 0, 'dark').r(1, 1, 7, 1, 'dark').r(0, 2, 8, 6, 'dark').r(1, 7, 7, 7, 'dark').r(2, 8, 6, 8, 'dark')
    b.r(2, 1, 6, 1, 'white').r(1, 2, 7, 6, 'white').r(2, 7, 6, 7, 'white')
    b.p(4, 1, 'grey').p(7, 4, 'grey').p(4, 7, 'grey').p(1, 4, 'grey')        # tick dots
    return b.r(4, 2, 4, 4, 'ink').r(5, 4, 6, 4, 'ink').im                    # hands (~ 3 o'clock-ish)
def house_rules(v):  # 8x10 pinned paper, scribble lines only
    b = L(8, 10).r(0, 1, 7, 9, 'cream').r(7, 2, 7, 9, 'wall_sh').r(1, 9, 7, 9, 'wall_sh')
    b.p(3, 0, 'red_sh').r(3, 1, 4, 1, 'red_sh')                                # pin
    for y, (a, c) in zip((3, 5, 7), ((1, 5), (1, 6), (1, 4))): b.r(a, y, c, y, 'grey')
    return b.p(2, 3, 'ink').p(4, 5, 'ink').im
def frame_photo(v):  # 10x8 framed abstract landscape (no people, no text)
    b = L(10, 8).r(0, 0, 9, 7, 'wood').r(1, 1, 8, 6, 'sky').r(1, 4, 8, 6, 'green').r(5, 3, 8, 6, 'green_sh').p(2, 2, 'gold')
    return b.im
# name: (fn, anchor, anchorPoint(w,h), extras(w,h))
BOT = lambda w, h: {'x': w // 2, 'y': h - 1}
PIECES = {
 'wall': (wall, 'topleft', lambda w, h: {'x': 0, 'y': 0}, {'tile': 'x', 'depth': 0}),
 'floor': (floor, 'topleft', lambda w, h: {'x': 0, 'y': 0}, {'tile': 'x', 'depth': 0}),
 'backsplash': (backsplash, 'baseline', BOT, {'depth': 1}),
 'window': (window, 'baseline', BOT, {'depth': 1}),
 'shelf': (shelf, 'baseline', BOT, {'depth': 1}),
 'fridge': (fridge, 'feet', BOT, {'depth': 2}),
 'counter': (counter, 'feet', BOT, {'depth': 2}),
 'desk': (desk, 'feet', BOT, {'depth': 2, 'slots': {'cat': {'x': 15, 'y': 6}, 'plant': {'x': 27, 'y': 7}}}),
 'laptop': (laptop_open, 'baseline', BOT, {'depth': 3}),
 'plant': (plant, 'baseline', BOT, {'depth': 3}),
 'table': (table, 'feet', BOT, {'depth': 2, 'sitLine': 2, 'slots': {'top': {'x': 22, 'y': 0}, 'back_l': {'x': 15, 'y': 2}, 'back_r': {'x': 29, 'y': 2}}, 'sitNote': 'sitLine = seat line of behind-table sitters (pose.sit_table); draw table AFTER them'}),
 'chair': (chair, 'feet', BOT, {'depth': 2, 'mirror': 'flip x for the facing chair', 'sitLine': 9, 'slots': {'seat': {'x': 7, 'y': 9}}}),
 'pendant_on': (lambda v: pendant(v, True), 'topleft', lambda w, h: {'x': 4, 'y': 0}, {'depth': 1, 'light': 'lamp table_pendant'}),
 'pendant_off': (lambda v: pendant(v, False), 'topleft', lambda w, h: {'x': 4, 'y': 0}, {'depth': 1}),
 'cornice': (cornice, 'baseline', BOT, {'depth': 1, 'tile': 'x', 'tileWidth': CORNICE_TILE}),
 'upper_cabinets': (upper_cabinets, 'baseline', BOT, {'depth': 1}),
 'clock': (clock, 'baseline', BOT, {'depth': 1}),
 'house_rules': (house_rules, 'baseline', BOT, {'depth': 1}),
 'frame': (frame_photo, 'baseline', BOT, {'depth': 1}),
 'milk': (milk, 'baseline', BOT, {'depth': 5, 'handPoint': {'x': 1, 'y': 3}}),
 'cup': (cup, 'baseline', BOT, {'depth': 5, 'handPoint': {'x': 4, 'y': 1}}),
 'plate': (plate, 'baseline', BOT, {'depth': 5, 'handPoint': {'x': 0, 'y': 0}}),
}
# engine ids (Le CTO SLOTS_pb3_NOTES: backdrop.kitchen, prop.window, prop.shelf, prop.fridge, prop.counter_sink, prop.table, prop.chairs) + extras in the same scheme
IDS = {'wall': ('backdrop.kitchen', 'backwall'), 'floor': ('backdrop.kitchen_floor', 'floor'), 'backsplash': ('prop.backsplash', 'backsplash'),
       'window': ('prop.window', 'window'), 'shelf': ('prop.shelf', 'shelf'), 'fridge': ('prop.fridge', 'fridge'), 'counter': ('prop.counter_sink', 'counter_sink'),
       'desk': ('prop.desk', 'desk'), 'laptop': ('prop.laptop', 'laptop'), 'plant': ('prop.plant', 'plant'), 'table': ('prop.table', 'table'),
       'chair': ('prop.chairs', 'chairs'), 'pendant_on': ('prop.pendant_on', 'pendant_on'), 'pendant_off': ('prop.pendant_off', 'pendant_off'),
       'milk': ('handprop.milk', 'milk'), 'cup': ('handprop.cup', 'cup'), 'plate': ('handprop.plate', 'plate'),
       'cornice': ('prop.cornice', 'cornice'), 'upper_cabinets': ('prop.upper_cabinets', 'upper_cabinets'), 'clock': ('prop.clock', 'clock'),
       'house_rules': ('prop.house_rules', 'house_rules'), 'frame': ('prop.frame', 'frame')}
# where pieces sit on the reference stage (anchor position, stage coords). wall/floor are tiled.
LAYOUT = [('backsplash', 46, 116), ('window', 46, 103), ('shelf', 90, 100), ('fridge', 12, BACKBASE), ('counter', 46, BACKBASE),
          ('chair', 98, BACKBASE), ('table', 118, BACKBASE), ('chair_m', 138, BACKBASE), ('cup', 112, 119), ('plate', 122, 119),
          ('milk', 117, 119), ('desk', 166, BACKBASE), ('plant', 177, 118),
          ('upper_cabinets', 46, 77), ('clock', 88, 80), ('frame', 104, 84), ('house_rules', 136, 96)]
CORNICE_Y = 5   # cornice baseline (bottom row) in stage px; tiled from x0 every CORNICE_TILE
PENDANT_AT = (118, 66)   # cord top; shade bottom y95. Not placed in the day stage (day kept as approved).
VARIANTS = ['day', 'evening', 'night']
# Sheets are NOT colour-graded (soir rule: "night filter in code, never baked"). Per-variant sheets differ only in content:
# window view, laptop screen glow (night), pendant on/off. Grading = light/<variant>.json multiply maps below.
def piece(name, v): return PIECES[name][0](v)

def build():
    man = {'assetRoot': '', 'atlases': {}, 'assets': {}}; sheets = {}
    for v in VARIANTS:
        ims = {n: piece(n, v) for n in PIECES}
        W = 128; x = y = rowh = 0; pos = {}
        for n, im in sorted(ims.items(), key=lambda t: -t[1].height):
            if x + im.width > W: x, y, rowh = 0, y + rowh + 1, 0
            pos[n] = (x, y); x += im.width + 1; rowh = max(rowh, im.height)
        H = y + rowh; sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for n, (px_, py_) in pos.items(): sh.alpha_composite(ims[n], (px_, py_))
        f = f'kitchen_{v}_sheet.png'; sh.save(f'{D}/{f}'); sheets[v] = (ims, sh)
        bg = Image.new('RGBA', (W, H), (60, 60, 70, 255)); bg.alpha_composite(sh)   # dark backing so white pieces show
        bg.resize((W * 10, H * 10), Image.NEAREST).save(f'{D}/preview_{v}_x10.png')
        man['atlases'][f'kitchen_{v}'] = {'file': f, 'w': W, 'h': H}
        for n, im in ims.items():
            fn, anc, ap, ex = PIECES[n]; a = {'source': 'atlas', 'atlas': f'kitchen_{v}', 'frame': {'x': pos[n][0], 'y': pos[n][1], 'w': im.width, 'h': im.height},
                 'anchor': anc, 'anchorPoint': ap(im.width, im.height), 'pixelScale': 1}
            a.update(ex); a['file'] = f'pieces/{v}/{IDS[n][1]}.png'; man['assets'][f'{IDS[n][0]}.{v}'] = a
            os.makedirs(f'{D}/pieces/{v}', exist_ok=True); im.save(f'{D}/pieces/{v}/{IDS[n][1]}.png')
    man['stage'] = {'horizon': HORIZON, 'feetLine': FEET, 'backBase': BACKBASE, 'width': 192, 'height': 144,
                    'layout': [{'piece': IDS[n.replace('_m', '')][0], 'x': x, 'y': y, **({'mirror': True} if n.endswith('_m') else {})} for n, x, y in LAYOUT]
                              + [{'piece': 'prop.cornice', 'x': CORNICE_TILE // 2, 'y': CORNICE_Y, 'tile': 'x', 'tileWidth': CORNICE_TILE}]
                              + [{'piece': 'prop.pendant_off|prop.pendant_on', 'x': PENDANT_AT[0], 'y': PENDANT_AT[1], 'variants': ['evening (off)', 'night (on)']}],
                    'light': {'evening': 'light/golden.json', 'night': 'light/soir.json'},
                    'depthLayers': {'0': 'wall, floor (tiled)', '1': 'wall-mounted: cornice, upper cabinets, clock, frame, house rules, backsplash, window, shelf, pendant', '2': 'back furniture on backBase: fridge, counter, desk, table, chairs',
                                    '3': 'items on furniture: laptop, plant', '4': 'cast + cat (feetLine), sorted by feet y', '5': 'hand props (handPoint) / table props',
                                    '6': 'front-of-cast furniture if a shot needs it', '7': 'light multiply (evening/night), cast at reduced strength'}}
    json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1)
    return sheets

def stage(v, sheets):
    ims = sheets[v][0]; s = Image.new('RGBA', (192, 144), (0, 0, 0, 0))
    for x in range(0, 192, 64): s.alpha_composite(ims['wall'], (x, 0)); s.alpha_composite(ims['floor'], (x, HORIZON))
    for x in range(0, 192, CORNICE_TILE): s.alpha_composite(ims['cornice'], (x, CORNICE_Y - 5))
    for n, x, y in LAYOUT:
        im = ims[n.replace('_m', '')]
        if n.endswith('_m'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        a = PIECES[n.replace('_m', '')][2](im.width, im.height); s.alpha_composite(im, (x - a['x'], y - a['y']))
    if v != 'day': s.alpha_composite(ims['pendant_on' if v == 'night' else 'pendant_off'], (PENDANT_AT[0] - 4, PENDANT_AT[1]))
    return s

# ---------- light (PR #8 'light' block style: multiply map, stepped flat bands, never baked) ----------
import numpy as np
COOL = np.array([0.26, 0.29, 0.45]); WARM = np.array([0.95, 0.70, 0.36]); CAP = 1.2
WIN = (32, 79, 59, 100)   # window pane box in stage coords (kept ungraded: it carries its own sky)
def steps(d, r, n=3, dither=True):
    """flat stepped level in {0,1/n..1} by distance d / radius r, 1-px checker dither on each band edge."""
    t = np.clip(1 - d / r, 0, 1) * n; lv = np.floor(t); fr = t - lv
    yy, xx = np.indices(d.shape); dith = ((xx + yy) % 2 == 0) & (fr > 0.75) & dither
    return np.minimum(lv + dith, n) / n
COOL_T = np.array([0.24, 0.31, 0.43])   # rule cool [0.26,0.29,0.45] nudged toward teal (same luminance ~0.30)
def lightmap(v, fill=True):
    yy, xx = np.indices((144, 192)).astype(float); M = np.ones((144, 192, 3)); A = np.zeros((144, 192, 3)); lamps = []; extra = {}
    if v == 'night':
        M[:] = COOL_T * 1.25   # base: rule cool shifted slightly toward teal (documented deviation), lifted 25% for phone readability
        def pool(cx, cy, rx, ry, col, s, lid, mask=None):
            L = steps(np.hypot((xx - cx) / rx, (yy - cy) / ry), 1.0) * s
            if mask is not None: L = L * mask
            lamps.append({'id': lid, 'x': cx, 'y': cy, 'r': rx, 's': s})
            return L[..., None] * (np.array(col) - M)
        def ell(cx, cy, rx, ry): return np.hypot((xx - cx) / rx, (yy - cy) / ry)
        sparse = ((xx + 2 * yy) % 4 == 0)
        def ell(cx, cy, rx, ry): return np.hypot((xx - cx) / rx, (yy - cy) / ry)
        sparse = ((xx + 2 * yy) % 4 == 0); sparse2 = ((xx * 3 + yy * 5) % 7 == 0)
        # multiply part: only lift the cool cast back toward neutral on furniture/cast at the table (wall pixels excluded in scene())
        P = 0.55 * fill * ((xx >= 90) & (xx <= 146) & (yy >= 110) & (yy <= 137))
        M += P[..., None] * (WARM * 1.1 - M)
        # ADDITIVE warm glow (0..255 per channel), flat steps: air almost nothing, tabletop brightest, floor pool 2 steps
        WA = np.array([255, 150, 50]) / 255.0
        air = 0 * yy   # no in-air glow (flat step read as a grey tent at 18x)
        top = (ell(118, 117, 25, 2.6) <= 1) * 90
        fe = ell(118, 135, 36, 5); flo = np.where(fe <= 0.6, 60, np.where(fe <= 1, 32, 0)) * (yy >= 129)
        A += np.maximum.reduce([air, top, flo])[..., None] * WA
        lamps.append({'id': 'table_pendant', 'x': 118, 'y': 95, 'shape': 'add: no air glow, tabletop 90, floor 60/32 flat (no dither); multiply lift 0.55 on table cluster', 's': 1.0})
        # under-shelf: faint wash just under the plank, no air pool; counter strip glows on backsplash + counter top
        # under-shelf strip removed: on the teal base it read as a grey ledge line, not light
        cs = ((yy >= 116) & (yy <= 118) & (xx >= 23) & (xx <= 69)) * 60 + ((yy >= 113) & (yy <= 115) & (xx >= 25) & (xx <= 67)) * 18
        A += cs[..., None] * WA
        lamps.append({'id': 'under_counter_strip', 'x': 46, 'y': 117, 'shape': 'add 40 on backsplash/counter top, 16 step above'})
        sh = xx - (yy - 100) * 0.35                                                       # slanted shaft from the window
        mo = np.where((sh >= 39) & (sh <= 53), 0.32, np.where((sh >= 34) & (sh <= 58), 0.18, 0)) * (yy > 100)
        M += mo[..., None] * (np.array([0.70, 0.80, 0.92]) - M)                             # pale, cool, low contrast, 2 steps
        M += pool(165, 114, 12, 8, [0.55, 0.75, 1.0], 0.8, 'laptop_glow')
        extra['window'] = {'x': WIN[0], 'y': WIN[1], 'w': WIN[2] - WIN[0] + 1, 'h': WIN[3] - WIN[1] + 1, 'color': [150, 170, 230], 'mix': 0.55, 'note': 'moonlight shaft slanting down-right onto counter/floor'}
    elif v == 'evening':
        base = np.array([0.86, 0.78, 0.70])
        corner = steps(np.abs(xx - 96) / 1.0, 96.0, 3, False)        # 1 at centre, stepped darker to the sides
        M[:] = base * (0.72 + 0.28 * corner[..., None])
        # low sun through the window: long skewed warm patch on the wall to the right + a long band on the floor
        u = xx - 52 - (yy - 79) * -0.9                          # skew
        wallp = (u >= 30) & (u <= 70) & (yy >= 84) & (yy <= 125)
        floorp = (yy >= 129) & (xx >= 64) & (xx <= 150)
        P = steps(np.abs(xx - 110) / 1.0, 60.0, 2, False)
        patch = np.where(wallp, 1.0, np.where(floorp, 0.6, 0))
        M += patch[..., None] * (np.array([1.2, 1.02, 0.72]) - M)
        lamps.append({'id': 'sun_patch', 'shape': 'skewed window patch on the wall + floor band', 'color': [1.2, 1.02, 0.72]})
        extra['window'] = {'x': WIN[0], 'y': WIN[1], 'w': WIN[2] - WIN[0] + 1, 'h': WIN[3] - WIN[1] + 1, 'color': [255, 190, 110], 'mix': 0.5}
    if v != 'day':
        extra['upper_wall'] = {'pieces': ['prop.cornice', 'prop.upper_cabinets', 'prop.clock', 'prop.frame', 'prop.house_rules'], 'rect': {'x': 0, 'y': 0, 'w': 192, 'h': 100},
            'note': 'covered by the base map: night = cool base only (no pendant add, no table lift; y<110), evening = warm base + side bands'}
    M[WIN[1]:WIN[3] + 1, WIN[0]:WIN[2] + 1] = 1.0
    if v == 'night': M[112:119, 157:173] = np.maximum(M[112:119, 157:173], 1.0)   # lamp shade + laptop screen emit
    M = np.clip(M, 0, CAP); A[WIN[1]:WIN[3] + 1, WIN[0]:WIN[2] + 1] = 0
    return M, lamps, extra, np.clip(A, 0, 254)
def grade(im, M, strength=1.0, A=None, astr=1.0):
    a = np.asarray(im).astype(float); f = M if strength == 1 else np.where(M < 1, 1 + (M - 1) * strength * 1.0, 1 + (M - 1) * 0.6)
    a[..., :3] = a[..., :3] * f                                   # engine: multiply first ...
    if A is not None: a[..., :3] += A * astr * (a[..., 3:4] > 0)   # ... then add
    a[..., :3] = np.clip(a[..., :3], 0, 255); return Image.fromarray(a.astype('uint8'), 'RGBA')
def write_light(v, M, lamps, extra, A=None):
    os.makedirs(f'{D}/light', exist_ok=True)
    Image.fromarray(np.clip(M * 127.5, 0, 255).astype('uint8'), 'RGB').save(f'{D}/light/{v}_multiplier_half.png')
    j = {'multiply': {'src': f'light/{v}_multiplier_half.png', 'decode': 'x2 (= map*127.5)', 'cool': COOL.tolist(), 'cool_used': COOL_T.tolist(), 'deviation': 'night base hue nudged toward teal (blue-green) per art review; luminance unchanged', 'warm': WARM.tolist(), 'cap': CAP,
                      'lamps': lamps, **extra, 'cast': 'draw cast with the same map at strength 0.25 when <1 (light cool tint), 0.6 when >1 (warm fill/rim)'}}
    if A is not None and A.max() > 0:
        Image.fromarray((A / 2).astype('uint8'), 'RGB').save(f'{D}/light/{v}_add_half.png')
        j['add'] = {'src': f'light/{v}_add_half.png', 'decode': 'x2 (= value*2, 0..254 per channel)', 'blend': 'additive (linear dodge)',
                    'order': 'out = clamp(src * multiply + add); multiply first, then add', 'cast': 'add at 0.6 strength on cast pixels'}
    json.dump(j, open(f'{D}/light/{"soir" if v == "night" else "golden"}.json', 'w'), indent=1)

# ---- cast from the canonical character manifest ----
CM = json.load(open(f'{CAN}/manifest.json'))
def frame(name):
    a = CM['assets'][name]; at = Image.open(f"{CAN}/{CM['atlases'][a['atlas']]['file']}").convert('RGBA'); f = a['frame']
    return at.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])), a['anchorPoint']
def put(s, name, x, y, flip=False, shadow=True):
    im, ap = frame(name)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT); ap = {'x': im.width - 1 - ap['x'], 'y': ap['y']}
    if shadow: s.alpha_composite(Image.new('RGBA', (9, 1), C('wood')[:3] + (90,)), (x - 4, y + 1))
    s.alpha_composite(im, (x - ap['x'], y - ap['y']))
CAST_WIDE = [('camille.stand', 30, FEET, False), ('noe.stand', 58, FEET, False), ('martin.stand', 84, FEET, False), ('lefevre.stand', 120, FEET, False),
             ('croissant.sit', 165, BACKBASE - 19 + 6, False)]   # cat on the desk keyboard slot
CAST_PHONE = [('camille.stand', 24, FEET, False), ('noe.stand', 50, FEET, False), ('martin.stand', 76, FEET, True), ('croissant.stand', 98, FEET, True),
              ('lefevre.stand', 112, FEET, True)]
def scene(v, sheets, cast):
    room = stage(v, sheets); L = lightmap(v) if v != 'day' else None; M = L[0] if L else None; A = L[3] if L else None
    castl = Image.new('RGBA', room.size, (0, 0, 0, 0))
    for n, x, y, fl in cast: put(castl, n, x, y, fl, shadow=not n.startswith('croissant.sit'))
    if v == 'night':   # warm fill only on furniture/cast, never on bare wall pixels
        a = np.asarray(room)[..., :3]; wc = {tuple(c) for c in np.asarray(stage('night', sheets))[100:106, 140:150, :3].reshape(-1, 3)}
        wall = np.array([[tuple(p) in wc for p in row] for row in a]) & (np.indices((144, 192))[0] < 129)
        M = np.where(wall[..., None], lightmap(v, False)[0], M)
    if M is not None: room = grade(room, M, 1.0, A); castl = grade(castl, M, 0.25, A, 0.6)
    if v == 'night': room.alpha_composite(sheets[v][0]['pendant_on'], (PENDANT_AT[0] - 4, PENDANT_AT[1]))   # emitter drawn ungraded
    room.alpha_composite(castl); return room
# Portrait frame split (game standard): top 15% (288) wall/bubble, middle 55% (1056) scene, bottom 30% (576) dialogue/choice UI.
CAST_MED = [('camille.stand', 56, FEET, False), ('noe.stand', 69, FEET, False), ('croissant.stand', 84, FEET, True), ('martin.stand', 101, FEET, False),
            ('lefevre.stand', 126, FEET, True)]   # counter pair, cat on the floor, table pair
CAMERAS = {   # name: (scale, camera top-left in stage px, cast)
 'wide': (8, (2, 12), CAST_PHONE),          # 135x132 px: fridge..table/chairs, establishing only
 'medium': (12, (46, 56), CAST_MED),        # 90x88 px: sink end of counter + shelf + table/chairs; default dialogue
 'close': (18, (92, 85), CAST_MED),   # 60x59 px: table cluster
}
def portrait(v, sheets, mode, cam='wide'):
    K, CAM, cast = CAMERAS[cam]
    sc = scene(v, sheets, cast); W, H = -(-1080 // K), -(-1056 // K)
    view = sc.crop((CAM[0], CAM[1], CAM[0] + W, CAM[1] + H)).resize((W * K, H * K), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), (0, 0, 0, 255)); out.alpha_composite(view, (0, 288))
    wall = sc.getpixel((150, 40)); floorc = sc.getpixel((CAM[0] + 1, 143))   # fixed bare-wall pixel (upper-wall pieces must not tint the band); floorc = sc.getpixel((CAM[0] + 1, 143))
    def dim(c, f): return tuple(int(x * f) for x in c[:3]) + (255,)
    def band(y0, y1, c, label_c):
        b = Image.new('RGBA', (1080, y1 - y0), dim(c, 0.55)); px = b.load()
        for x in range(24, 1056):   # faint dashed placeholder outline, inset 24 px
            for yy in (24, 25, y1 - y0 - 26, y1 - y0 - 25):
                if (x // 16) % 2 == 0: px[x, yy] = label_c
        for yy in range(24, y1 - y0 - 24):
            for x in (24, 25, 1054, 1055):
                if (yy // 16) % 2 == 0: px[x, yy] = label_c
        out.alpha_composite(b, (0, y0))
    if mode == 'game':
        out.alpha_composite(Image.new('RGBA', (1080, 288), wall), (0, 0))   # wall continues up = bubble space
        band(1344, 1920, floorc, dim(floorc, 0.85))                         # dialogue/choice UI placeholder (dimmed floor)
    else:   # shorts: top band = captions placeholder, scene, then floor continues (platform UI overlaps the bottom)
        band(0, 288, wall, dim(wall, 0.8))
        out.alpha_composite(Image.new('RGBA', (1080, 576), floorc), (0, 1344))   # plain floor (platform UI zone)
    return out
def composites(sheets):
    for v in VARIANTS:
        if v != 'day': M, lamps, extra, A = lightmap(v); write_light(v, M, lamps, extra, A)
        s = scene(v, sheets, CAST_WIDE); s.save(f'{D}/stage_{v}_x1.png')
        s.crop((0, 64, 192, 144)).resize((1920, 800), Image.NEAREST).save(f'{D}/composite_landscape_{v}.png')
        for cam in ('wide', 'medium', 'close'):
            for mode in ('game', 'shorts'):
                o = portrait(v, sheets, mode, cam); o.save(f'{D}/composite_{cam}_{mode}_{v}_1080x1920.png'); o.resize((180, 320), Image.LANCZOS).save(f'{D}/composite_{cam}_{mode}_{v}_small.png')
# ---- table4: family meal, 4 seated (see SLOTS_table4_NOTES.md) ----
SEAT4 = [('sit_table_34', 100, 125, False), ('sit_table', 111, 122, False), ('sit_table', 125, 122, False), ('sit_table_34', 136, 125, True)]
def put_seat(s, name, x, y, flip=False):
    im, _ = frame(name); sp = CM['assets'][name]['seatPoint']; sx = sp['x']
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT); sx = im.width - 1 - sx
    s.alpha_composite(im, (x - sx, y - sp['y']))
def scene_table4(v, sheets, who=('noe', 'martin', 'lefevre', 'camille')):
    room = stage(v, sheets); L = lightmap(v) if v != 'day' else None; M = L[0] if L else None; A = L[3] if L else None
    if v == 'night':
        a = np.asarray(room)[..., :3]; wc = {tuple(c) for c in np.asarray(stage('night', sheets))[100:106, 140:150, :3].reshape(-1, 3)}
        wall = np.array([[tuple(p) in wc for p in row] for row in a]) & (np.indices((144, 192))[0] < 129)
        M = np.where(wall[..., None], lightmap(v, False)[0], M)
    ims = sheets[v][0]; tb = ims['table']; tl = (118 - tb.width // 2, BACKBASE - tb.height + 1)
    props = Image.new('RGBA', room.size, (0, 0, 0, 0))
    for x in (105, 111, 125, 131): props.alpha_composite(ims['plate'], (x - 3, 118))
    props.alpha_composite(ims['cup'], (116 - 2, 116)); props.alpha_composite(ims['milk'], (120 - 2, 114))
    behind = Image.new('RGBA', room.size, (0, 0, 0, 0)); front = Image.new('RGBA', room.size, (0, 0, 0, 0))
    for (pose, x, y, fl), w in zip(SEAT4, who): put_seat(behind if pose == 'sit_table' else front, f'{w}.pose.{pose}', x, y, fl)
    tbl = Image.new('RGBA', room.size, (0, 0, 0, 0)); tbl.alpha_composite(tb, tl)
    if M is not None:
        room = grade(room, M, 1.0, A); tbl = grade(tbl, M, 1.0, A); props = grade(props, M, 1.0, A)
        behind = grade(behind, M, 0.25, A, 0.6); front = grade(front, M, 0.25, A, 0.6)
    if v == 'night': room.alpha_composite(ims['pendant_on'], (PENDANT_AT[0] - 4, PENDANT_AT[1]))
    for layer in (behind, tbl, front, props): room.alpha_composite(layer)
    return room
def table4(sheets):
    for v in ('day', 'night'):
        K, CAM = 12, (54, 56); sc = scene_table4(v, sheets); W, H = -(-1080 // K), -(-1056 // K)
        view = sc.crop((CAM[0], CAM[1], CAM[0] + W, CAM[1] + H)).resize((W * K, H * K), Image.NEAREST).crop((0, 0, 1080, 1056))
        out = Image.new('RGBA', (1080, 1920), (0, 0, 0, 255)); out.alpha_composite(Image.new('RGBA', (1080, 288), sc.getpixel((150, 40))), (0, 0))
        out.alpha_composite(view, (0, 288)); fc = sc.getpixel((CAM[0] + 1, 143))
        out.alpha_composite(Image.new('RGBA', (1080, 576), tuple(int(c * 0.55) for c in fc[:3]) + (255,)), (0, 1344))
        out.save(f'{D}/composite_medium_game_{v}_table4_1080x1920.png'); out.resize((180, 320), Image.LANCZOS).save(f'{D}/composite_medium_game_{v}_table4_small.png')
        sc.save(f'{D}/stage_{v}_table4_x1.png')
if __name__ == '__main__':
    sh = build(); composites(sh); table4(sh); print('built', VARIANTS)
