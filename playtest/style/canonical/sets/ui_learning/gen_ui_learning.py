"""ui_learning rev2 (warmth pass; rev1 geometry frozen) — learning-module UI kit painted to tech/UI_COMPONENTS.md (Le CTO 10/26).
x1 art, shown at integer x2. Style B, 28-colour palette, NO text/glyphs, NO red (R7), never graded.
Run: python3 gen_ui_learning.py   (writes pieces/x1, pieces/x8, sheet, manifest.json, mockups/)"""
import json, os, glob
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{D}/../../../..')
PAL = {k: tuple(int(v[i:i+2], 16) for i in (1, 3, 5)) for k, v in json.load(open(f'{D}/../../palette.json')).items()} \
    if isinstance(json.load(open(f'{D}/../../palette.json')), dict) else None
# ---------------------------------------------------------------- ONE swappable colour map (§1 + §10 provisional)
CM = dict(
    ink='ink', panel='cream', panel_sh='wall_sh', field='white', field_edge='wall_sh',
    primary='green', primary_sh='green_sh', secondary='wall', secondary_sh='wall_sh',
    correct='green', correct_sh='green_sh', glint='white',
    wrong='orange', wrong_sh='orange_sh',          # §10a: wrong AND near-miss = orange + recast beside it
    near='orange', near_sh='orange_sh',
    disabled='grey', disabled_sh='silver', focus='navy', active='sky',
    water='sky', water_hi='white', wood='wood', wood_sh='dark',
    gender_m='navy', gender_f='plum', gender_pl=None,  # §10a: le navy, la plum, les no colour
    underline_learned='gold', underline_other='green',  # §10a: gold = learned-word underline ONLY; green dither = other
    accent='sky', highlight='cream', newdot='green',
    record='navy', record_ring='sky',              # recording = navy + sky pulse (no red)
)
BANNED = {'mouth', 'red_sh', 'pink', 'gold'}  # gold reserved for the learned-word underline (engine)               # R7: no red / soft red anywhere in UI
assert not BANNED & (set(CM.values()) - {CM['underline_learned']})
def C(role): return PAL[CM.get(role, role)] + (255,)
OUT1, OUT8, MOCK = f'{D}/pieces/x1', f'{D}/pieces/x8', f'{D}/mockups'
for d in (OUT1, OUT8, MOCK): os.makedirs(d, exist_ok=True)
for f in glob.glob(f'{OUT1}/*.png') + glob.glob(f'{OUT8}/*.png'): os.remove(f)

class L:
    def __init__(s, w, h): s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); s.w, s.h = w, h
    def p(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.im.putpixel((x, y), C(c))
    def r(s, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w): s.p(i, j, c)
    def clr(s, x, y):
        if 0 <= x < s.w and 0 <= y < s.h: s.im.putpixel((x, y), (0, 0, 0, 0))
    def put(s, rows, x, y, key):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in key: s.p(x + i, y + j, key[ch])
    def paste(s, o, x, y): s.im.alpha_composite(o.im if isinstance(o, L) else o, (x, y))

def rbox(l, x, y, w, h, fill, edge=None, rad=2):
    """rounded block: edge (if any) 1 px, corners cut by `rad`."""
    l.r(x, y, w, h, edge or fill)
    if edge: l.r(x + 1, y + 1, w - 2, h - 2, fill)
    for k in range(rad):
        for (cx, cy) in ((x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)):
            dx = 1 if cx == x else -1; dy = 1 if cy == y else -1
            for i in range(rad - k): l.clr(cx + dx * i, cy + dy * k)
    if edge and rad == 2:  # re-close the edge diagonally
        for (cx, cy, dx, dy) in ((x, y, 1, 1), (x + w - 1, y, -1, 1), (x, y + h - 1, 1, -1), (x + w - 1, y + h - 1, -1, -1)):
            l.p(cx + dx, cy + dy, edge)

PIECES = {}   # key -> dict(img, meta)
def add(key, l, anchor='tl', **meta):
    im = l.im if isinstance(l, L) else l
    PIECES[key] = dict(im=im, anchor=anchor, **meta)

# ---------------------------------------------------------------- shared surfaces
def panel(w=24, h=24, fill='panel', edge='ink', sh='panel_sh', open_bottom=False, fibre='wall'):
    """rev2 paper: ink card edge (spec), 1-px fibre dither only inside the 4x4 corner cells (never in a
    stretch zone), right column + bottom row in shade = lift. All stretch rows/cols stay uniform -> seamless."""
    l = L(w, h); rbox(l, 0, 0, w, h + (3 if open_bottom else 0), fill, edge)
    l.r(w - 2, 2, 1, h - (3 if not open_bottom else 2), sh)          # right lift column
    if not open_bottom: l.r(2, h - 2, w - 3, 1, sh)
    for (x, y) in ((2, 2), (3, 3), (w - 4, 2), (2, h - 4), (w - 3, 3)):
        if not (open_bottom and y > h - 5): l.p(x, y, fibre)
    if not open_bottom: l.p(w - 3, h - 3, sh)                         # soft inner corner of the lift
    return l
def button(w=24, h=28, fill='secondary', sh='secondary_sh', state='idle', edge_tone=None, ring=None):
    """Style B button: no ink outline; darker-tone edge + 2 px bottom lip. pressed = 1 px down, lip gone."""
    l = L(w, h); e = edge_tone or sh
    if state == 'pressed':
        rbox(l, 0, 1, w, h - 1, fill, e)
    else:
        rbox(l, 0, 2, w, h - 2, sh); rbox(l, 0, 0, w, h - 2, fill, e)
        hi = 'white' if fill not in ('field', 'white', 'disabled') else ('silver' if fill == 'disabled' else 'field')
        l.r(2, 1, w - 4, 1, hi); l.r(1, 2, 1, h - 6, hi)                 # glaze: top row + left column
        l.p(2, 2, hi)                                                     # corner glint (inside 5-px corner cell)
        l.r(w - 2, 2, 1, h - 6, sh)                                       # glaze shade right column
    if ring:  # 1 px inset ring
        y0 = 2 if state == 'pressed' else 1; hh = (h - 3) if state == 'pressed' else h - 4
        for i in range(2, w - 2): l.p(i, y0, ring); l.p(i, y0 + hh - 1, ring)
        for j in range(y0, y0 + hh): l.p(1, j, ring); l.p(w - 2, j, ring)
    return l
NS_BTN = dict(l=5, t=5, r=5, b=7)

def ns(l_, t, r, b): return dict(l=l_, t=t, r=r, b=b)
def TR(role, x, y, w, h, mx): return dict(role=role, x=x, y=y, w=w, h=h, max=mx)
WX = 'w-'  # textRect widths that depend on final width are written as strings 'w-12'

# ---------------------------------------------------------------- icons 14x14
I = {}
def icon(name, rows, key):
    l = L(14, 14); l.put(rows, 0, 0, key); I[name] = l; return l
k = dict(i='ink', s='silver', w='white', g='green', G='green_sh', b='sky', n='navy', o='cream', d='wood', D='dark', c='cream', y='wall_sh', a='orange', p='plum')
icon('replay', [
 "..............",
 ".....iiii.....",
 "...ii....ii...",
 "..i........i..",
 "..i.........i.",
 ".i..........i.",
 ".i..........i.",
 ".i..........i.",
 ".i.........i..",
 "..i.......ii..",
 "..ii...iiiii..",
 "....i.....i...",
 "...........i..",
 ".............."], k)
icon('slow', [   # small turtle walking (🐢 per spec) — shell green, head/feet ink-skin tone
 "..............",
 "..............",
 "..............",
 "....GGGG......",
 "...GgGgGG.....",
 "..GgggggGG....",
 ".GgGgggGgGG.dd",
 ".GGGGGGGGGGddi",
 "..dd....dd.dd.",
 "..dd....dd....",
 "..............",
 "..............",
 "..............",
 ".............."], k)
icon('audio', [
 "..............",
 "..............",
 "......i.......",
 ".....ii...i...",
 "....iii....i..",
 ".iiiiii..i..i.",
 ".iiiiii...i.i.",
 ".iiiiii...i.i.",
 ".iiiiii..i..i.",
 "....iii....i..",
 ".....ii...i...",
 "......i.......",
 "..............",
 ".............."], k)
icon('help', [   # speech cloud with a dot (not a '?')
 "..............",
 "...cccccccc...",
 "..cccccccccc..",
 ".cccccccccccc.",
 ".ccccciicccc..",
 ".ccccciicccc..",
 ".cccccccccccc.",
 "..cccccccccc..",
 "...ccccccccc..",
 "...cc.........",
 "..c...........",
 "..............",
 "..............",
 ".............."], dict(k, c='cream', i='ink'))
# give the cloud a wall_sh rim so it reads on cream buttons
h = I['help']
for y in range(14):
    for x in range(14):
        if h.im.getpixel((x, y))[3] == 0 and any(0 <= x+dx < 14 and 0 <= y+dy < 14 and h.im.getpixel((x+dx, y+dy)) == C('cream') for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
            pass
icon('help', [
 "..............",
 "...yyyyyyyy...",
 "..ycccccccccy.",
 ".yccccccccccy.",
 ".ycccciiccccy.",
 ".ycccciiccccy.",
 ".yccccccccccy.",
 "..ycccccccccy.",
 "...ycc.yyyyy..",
 "...yc.........",
 "..yy..........",
 "..............",
 "..............",
 ".............."], k)
icon('mic', [
 "..............",
 ".....iiii.....",
 ".....isss.....",
 ".....isss.....",
 ".....isss.....",
 "...i.isss.i...",
 "...i.iiii.i...",
 "....i....i....",
 ".....iiii.....",
 ".......i......",
 ".......i......",
 ".....iiiii....",
 "..............",
 ".............."], k)
icon('close', [  # door ajar with arrow-out (no cross)
 "..............",
 "..DDDDDDD.....",
 "..DddddDD.....",
 "..DdddddD.....",
 "..DdddddD..i..",
 "..DddddoD...i.",
 "..DdddddDiiiii",
 "..DdddddD...i.",
 "..DdddddD..i..",
 "..DdddddD.....",
 "..DdddddD.....",
 "..DDDDDDD.....",
 "..............",
 ".............."], k)
icon('leaf', [
 "..............",
 "..........gg..",
 "........gggg..",
 "......gggggg..",
 ".....ggggGgg..",
 "....gggGGggg..",
 "....ggGggggg..",
 "....gGgggggg..",
 "....Gggggg....",
 "...Gggggg.....",
 "..G...........",
 ".G............",
 "..............",
 ".............."], k)
icon('drop', [
 "..............",
 "......b.......",
 "......b.......",
 ".....bbb......",
 ".....bbb......",
 "....bwbbb.....",
 "...bwbbbbb....",
 "...bwbbbbb....",
 "...bbbbbbn....",
 "....bbbbn.....",
 ".....nnn......",
 "..............",
 "..............",
 ".............."], k)
icon('book', [
 "..............",
 "..............",
 "..gggggggggg..",
 "..gGcccccccc..",
 "..gGcccccccc..",
 "..gGcccccccc..",
 "..gGgggggggg..",
 "..gGgggggggg..",
 "..gGggggoggg..",
 "..gGggggoggg..",
 "..gGgggggggg..",
 "..GGGGGGGGGG..",
 "..............",
 ".............."], k)
icon('pot', [
 "..............",
 "......g.......",
 "....gg.gg.....",
 ".....ggg......",
 "......G.......",
 "...aaaaaaaa...",
 "...dddddddd...",
 "....aaaaaa....",
 "....aaaaaa....",
 "....aaaaaa....",
 ".....aaaa.....",
 ".....dddd.....",
 "..............",
 ".............."], k)
icon('clock', [
 "..............",
 "....ssssss....",
 "...scccccss...",
 "..scccicccss..",
 "..scccicccss..",
 "..scccicccss..",
 "..scccciiiss..",
 "..sccccccccs..",
 "..sccccccccs..",
 "...sccccccs...",
 "....ssssss....",
 "..............",
 "..............",
 ".............."], k)
icon('check_leaf', [  # leaf whose midrib bends (reads as 'fine', not a tick glyph)
 "..............",
 "..........gg..",
 "........gggg..",
 "......gggggg..",
 ".....gggggwg..",
 "....ggggggwg..",
 "....gwgggwgg..",
 "....ggwgwggg..",
 "....gggwgg....",
 "...Gggggg.....",
 "..G...........",
 ".G............",
 "..............",
 ".............."], k)
# P1 self-rate icons
icon('thumb', [
 "..............",
 "......dd......",
 ".....ddd......",
 ".....dd.......",
 "...ddddddddd..",
 ".i.ddddddddd..",
 ".i.dddcccccd..",
 ".i.ddddddddd..",
 ".i.dddcccccd..",
 ".i.ddddddddd..",
 ".i..dddddddd..",
 "..............",
 "..............",
 ".............."], dict(k, d='skin', c='skin_sh'))
icon('thinking', [
 "..............",
 "....ssssss....",
 "...sssssssss..",
 "..ssisssissss.",
 "..sssssssssss.",
 "..sssssssssss.",
 "..sssiiiiisss.",
 "..sssssssssss.",
 "...sssssssss..",
 "..dds.ssssss..",
 ".ddddd........",
 "..dd..........",
 "..............",
 ".............."], dict(k, s='skin', d='skin_sh', i='ink'))
# active variants
def recolor(l, m):
    o = L(l.w, l.h); o.im = l.im.copy()
    for y in range(l.h):
        for x in range(l.w):
            px = o.im.getpixel((x, y))
            for a, b in m.items():
                if px == C(a): o.im.putpixel((x, y), C(b))
    return o
for n in ('replay', 'slow', 'audio', 'help', 'mic', 'close', 'leaf', 'drop', 'book', 'pot', 'clock', 'check_leaf'):
    add(f'ui.icon.{n}', I[n], pri='P0')
add('ui.icon.slow_active', recolor(I['slow'], {'green': 'accent', 'green_sh': 'navy'}), pri='P0')
add('ui.icon.mic_active', recolor(I['mic'], {'silver': 'sky'}), pri='P0')
add('ui.icon.thumb', I['thumb'], pri='P1'); add('ui.icon.thinking', I['thinking'], pri='P1')

# ---------------------------------------------------------------- §2 shared components
add('ui.panel.idle', panel(), nineSlice=ns(4, 4, 4, 4), pri='P0', note='content = inner rect')
for st in ('idle', 'open'):
    l = panel(open_bottom=True)
    if st == 'open': pass
    nub = L(24, 24); nub.paste(l, 0, 0); nub.r(6, 2, 12, 2, 'panel_sh')
    add(f'ui.sheet_bottom.{st}', nub if st == 'idle' else l, anchor='bc', nineSlice=ns(4, 4, 4, 0),
        textRects=[TR('title', 6, 6, 'w-12', 10, 28)], hit=dict(h=22, note='nub row'), pri='P0',
        note='nub 12x2 drawn at (6,2) on idle; stretch keeps it only if l/r insets cover it → see ui.sheet_bottom.nub')
nb = L(12, 2); nb.r(0, 0, 12, 2, 'panel_sh'); add('ui.sheet_bottom.nub', nb, anchor='tc', pri='P0', note='draw centred at top+2 after 9-slicing')
# re-make sheet idle/open without the baked nub (cleaner stretch)
for st in ('idle', 'open'):
    PIECES[f'ui.sheet_bottom.{st}']['im'] = panel(open_bottom=True).im
    PIECES[f'ui.sheet_bottom.{st}']['note'] = 'open bottom; overlay ui.sheet_bottom.nub centred at y=2 (idle: wall_sh, open: same)'

BTN_STATES = ('idle', 'pressed', 'focus', 'disabled')
def btn_variant(fill, sh, st):
    if st == 'disabled': return button(fill='disabled', sh='disabled_sh')
    return button(fill=fill, sh=sh, state='pressed' if st == 'pressed' else 'idle', ring='focus' if st == 'focus' else None)
for st in BTN_STATES:
    add(f'ui.btn_primary.{st}', btn_variant('primary', 'primary_sh', st), nineSlice=NS_BTN,
        textRects=[TR('cta', 6, 7, 'w-12', 14, 18)], hit=dict(h=28), pri='P0')
    add(f'ui.btn_secondary.{st}', btn_variant('secondary', 'secondary_sh', st), nineSlice=NS_BTN,
        textRects=[TR('cta', 6, 7, 'w-12', 14, 22)], hit=dict(h=28), pri='P0')
ROW = dict(idle=('panel', 'panel_sh', None), pressed=('panel', 'panel_sh', None), focus=('panel', 'panel_sh', None),
           correct=('panel', 'correct_sh', 'correct'), wrong=('panel', 'wrong_sh', 'wrong'), near=('panel', 'near_sh', 'near'),
           disabled=('disabled', 'disabled_sh', None))
for st, (f, s, e) in ROW.items():
    l = button(fill=f, sh=s, state='pressed' if st == 'pressed' else 'idle', ring='focus' if st == 'focus' else None, edge_tone=e)
    if e:  # 2-px state edge on left (colour-coded stripe) — reads without text, never red
        y1 = l.h - 2
        for j in range(2, y1 - 1): l.p(1, j, e); l.p(2, j, e)
    add(f'ui.btn_option_row.{st}', l, nineSlice=NS_BTN, hit=dict(h=28),
        textRects=[TR('answer', 8, 7, 'w-16', 14, 32), TR('pic_slot', 3, 3, 22, 22, 0)] + ([TR('recast_form', 8, 7, 'w-16', 14, 32)] if st in ('wrong', 'near') else []), pri='P0',
        note='wrong/near = orange stripe (§10a); engine shows the player answer struck-free + the correct form in recast_form (right half, after the answer). pic_slot: when used, engine shifts answer x to 28')
ICB = {}
for st in ('idle', 'pressed', 'focus', 'disabled', 'active'):
    if st == 'disabled': b = button(22, 22, fill='disabled', sh='disabled_sh')
    elif st == 'active': b = button(22, 22, fill='active', sh='navy')
    else: b = button(22, 22, fill='panel', sh='panel_sh', state='pressed' if st == 'pressed' else 'idle', ring='focus' if st == 'focus' else None)
    ICB[st] = b
    add(f'ui.btn_icon.{st}', b, hit=dict(w=22, h=22), iconSlot=dict(x=4, y=3 + (1 if st == 'pressed' else 0), w=14, h=14), pri='P0')
for st in ('idle', 'pressed', 'focus'):
    l = L(22, 22); l.paste(ICB[st], 0, 0); l.paste(I['close'], 4, 3 + (1 if st == 'pressed' else 0))
    add(f'ui.exit.{st}', l, hit=dict(w=22, h=22, note='+ label rect when shown'),
        textRects=[TR('exit', 24, 4, 80, 14, 22)], pri='P0', note='door-out arrow, not a cross')
PIP = dict(todo=('wall_sh', None), current=('water', 'water_hi'), done_ok=('correct', 'glint'), done_recast=('wrong', 'cream'), skipped=('silver', None))
for st, (c, hi) in PIP.items():
    l = L(6, 6); rbox(l, 0, 0, 6, 6, c, rad=1)
    if hi: l.p(1, 1, hi)
    if st == 'skipped': l.r(1, 1, 4, 4, 'cream'); l.r(2, 2, 2, 2, 'silver')
    if st == 'todo': l.r(1, 1, 4, 4, 'cream')
    add(f'ui.pips.{st}', l, anchor='tc', pri='P0', note='pip 6x6, gap 2, row = n*8-2')
def toast(fill='panel'):
    l = L(24, 18); rbox(l, 0, 0, 24, 18, fill, 'ink'); l.r(2, 16, 20, 1, 'panel_sh'); return l
for st in ('in', 'idle', 'out'):
    add(f'ui.toast.{st}', toast(), anchor='bc', nineSlice=ns(4, 4, 4, 4), iconSlot=dict(x=3, y=2, w=14, h=14),
        textRects=[TR('toast', 20, 3, 'w-24', 12, 32)], hit=dict(h=22, note='toast is 18 high → engine pads hit to 22'), pri='P0',
        note='in/out = same art; engine slides 3 frames (6 px steps)')
for st in ('in', 'idle', 'out'):
    add(f'ui.word_toast.{st}', None, alias=f'ui.toast.{st}', icon='ui.icon.leaf', anchor='bc', pri='P0')
RB = dict(idle=None, near='near', recast='wrong')
for st, e in RB.items():
    l = panel()
    if e:
        for j in range(2, 21): l.p(1, j, e); l.p(2, j, e)
    add(f'ui.recast_box.{st}', l, nineSlice=ns(4, 4, 4, 4), pri='P0',
        textRects=[TR('player', 6, 4, 'w-12', 12, 60), TR('model', 6, 18, 'w-12', 12, 60)],
        note='contains a btn_icon + icon.audio on the right; differing span highlight engine-drawn in ORANGE (§10a)')
bar = L(24, 24); rbox(bar, 0, 0, 24, 24, 'wall_sh'); bar.r(1, 1, 22, 21, 'wall'); 
add('ui.accent_bar.bar', bar, anchor='bc', nineSlice=ns(4, 4, 4, 4), pri='P0', note='9 keys x 20 = 180 wide')
for st in ('idle', 'pressed'):
    add(f'ui.accent_bar.key_{st}', button(18, 22, fill='panel', sh='panel_sh', state=st), hit=dict(w=18, h=22),
        textRects=[TR('char', 2, 5, 14, 12, 1)], pri='P0', note='key 18 wide < 22: neighbours 2 px gap → hit 20 (see gaps)')
TF = dict(idle=('field', 'field_edge', None), focus=('field', 'focus', 'focus'), near=('field', 'near', 'near'),
          correct=('field', 'correct', 'correct'), recast=('field', 'wrong', 'wrong'), disabled=('disabled', 'disabled_sh', None))
for st, (f, e, ring) in TF.items():
    l = L(24, 24); rbox(l, 0, 0, 24, 24, f, e)
    if ring:
        l.r(2, 22, 20, 1, ring)
    else: l.r(2, 22, 20, 1, 'panel' if f == 'field' else 'disabled_sh')
    add(f'ui.text_field.{st}', l, nineSlice=ns(4, 4, 4, 4), textRects=[TR('user_text', 5, 5, 'w-10', 14, 40)], hit=dict(h=24), pri='P0',
        note='edge colour = state; bottom underline row repeats it')
def burst(c1, c2, fr):
    l = L(16, 16); cx = cy = 7
    R = [2, 4, 6, 7][fr]
    for (dx, dy) in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        for t in range(max(0, R - 3), R): l.p(cx + dx * t + (dx == 0), cy + dy * t + (dy == 0), c1 if t < R - 1 else c2)
    for (dx, dy) in ((1, -1), (1, 1), (-1, 1), (-1, -1)):
        t = R - 2
        if t > 0: l.p(cx + dx * t + (dx > 0), cy + dy * t + (dy > 0), c2)
    if fr < 2: l.r(6, 6, 4, 4, c1); l.p(7, 7, c2)
    return l
for st, (a, b) in dict(correct=('correct', 'glint'), near=('near', 'highlight')).items():
    for f in range(4): add(f'ui.feedback_burst.{st}_f{f}', burst(a, b, f), anchor='c', pri='P0')
    add(f'ui.feedback_burst.{st}', None, seq=[f'ui.feedback_burst.{st}_f{f}' for f in range(4)], fps=12, pri='P0')

# ---------------------------------------------------------------- §3 learn_words + carnet
def carnet_page():
    l = panel(fibre='panel')
    l.p(2, 20, 'sky'); l.p(3, 20, 'sky'); l.p(1, 21, 'panel')          # ruled-line hint, bottom-left corner cell only
    l.p(21, 20, 'sky'); l.p(20, 20, 'sky')                           # bottom-right corner cell
    l.clr(23, 0); l.clr(22, 0); l.clr(23, 1); l.p(21, 0, 'ink'); l.p(22, 1, 'ink'); l.p(23, 2, 'ink')  # dog-ear
    l.p(21, 1, 'panel_sh'); l.p(21, 2, 'panel_sh'); l.p(22, 2, 'panel_sh')
    return l
for st in ('idle', 'open'):
    add(f'ui.wordbook_card.{st}', carnet_page(), anchor='c', nineSlice=ns(4, 4, 4, 4), target=dict(w=172, h=200), pri='P0',
        textRects=[TR('fr', 8, 8, 120, 16, 24), TR('gloss', 8, 28, 156, 12, 30)], note='close via ui.exit; picture frame at (8,48)')
add('ui.wordbook_card.locked-preview', panel(fill='wall', sh='wall_sh'), anchor='c', nineSlice=ns(4, 4, 4, 4), target=dict(w=172, h=200), pri='P0',
    note='overlay ui.wordbook_card.locked_pot centred')
lp = L(24, 28)
lp.put(["....yy..yy..............", ".....yyyy..............."], 6, 0, k)
for j in range(10, 28):
    inset = 2 if j < 12 else 4 + (j - 12) // 6
    lp.p(inset, j, 'wall_sh'); lp.p(23 - inset, j, 'wall_sh')
lp.r(2, 10, 20, 1, 'wall_sh'); lp.r(2, 12, 20, 1, 'wall_sh'); lp.r(6, 27, 12, 1, 'wall_sh'); lp.r(11, 2, 1, 8, 'wall_sh')
add('ui.wordbook_card.locked_pot', lp, anchor='c', pri='P0', note='pot outline only (wall_sh)')
for st in ('idle', 'empty'):
    l = L(64, 44); l.r(0, 0, 64, 44, 'wood'); l.r(0, 43, 64, 1, 'dark'); l.r(63, 0, 1, 44, 'dark')
    l.r(0, 0, 63, 1, 'orange'); l.r(0, 0, 1, 43, 'orange')                     # lit top/left bevel
    for i in range(3, 61, 7): l.p(i, 1, 'orange_sh'); l.p(i + 3, 42, 'orange_sh')  # grain flecks
    for j in range(4, 40, 9): l.p(1, j, 'orange_sh'); l.p(62, j + 4, 'orange_sh')
    for (cx, cy) in ((0, 0), (63, 0), (0, 43), (63, 43)): l.clr(cx, cy)
    if st == 'idle': l.r(2, 2, 60, 40, 'cream'); [l.clr(x, y) for x in range(2, 62) for y in range(2, 42)]
    else:
        l.r(2, 2, 60, 40, 'wall'); l.put(["..yy..", ".yyyy.", "yyyyyy", "yyyyyy", ".yyyy."], 29, 18, k)
    add(f'ui.card_picture_frame.{st}', l, anchorInCard=dict(x=8, y=48), hit=dict(w=64, h=44, note='tap = audio'), pri='P0',
        inner=dict(x=2, y=2, w=60, h=40))
TH = dict(idle='wood', pressed='wood', focus='focus', newest='accent')
for st, fc in TH.items():
    l = L(40, 27); y = 1 if st == 'pressed' else 0
    l.r(0, y, 40, 27 - y, fc); l.r(0, 26, 40, 1, 'dark' if st != 'pressed' else fc)
    [l.clr(x, yy) for x in range(2, 38) for yy in range(2 + y, 25 + y)]
    if st == 'newest': l.p(38, 0, 'white'); l.p(37, 1, 'white'); l.p(39, 1, 'white')
    add(f'ui.scene_thumb.{st}', l, hit=dict(w=40, h=27), inner=dict(x=2, y=2 + y, w=36, h=23), pri='P0', note='engine draws the 36x23 scene crop into inner')
for st, c in dict(m='gender_m', f='gender_f', none='silver').items():
    l = L(4, 4); l.r(0, 0, 4, 4, c); l.clr(0, 0); l.clr(3, 0); l.clr(0, 3); l.clr(3, 3)
    if st == 'none': l.r(1, 1, 2, 2, 'cream')
    add(f'ui.gender_pip.{st}', l, pri='P0', note='m/f colours provisional (§10 Q1)')
for st in ('idle', 'pressed', 'grown', 'due', 'locked'):
    l = button(32, 24, fill='panel', sh='panel_sh', state='pressed' if st == 'pressed' else 'idle')
    y0 = 6 + (1 if st == 'pressed' else 0)
    if st == 'grown': l.put(["...gg", "..ggg", ".gGg.", "Gg...", "G...."], 9, y0 + 1, k)
    if st == 'due':   l.put(["..b..", ".bbb.", "bwbbb", "bbbbn", ".nnn."], 9, y0 + 1, k)
    if st == 'locked': l.r(11, y0 + 4, 2, 2, 'silver')
    if st in ('idle', 'pressed'): l.r(10, y0 + 3, 4, 4, 'wall_sh')
    add(f'ui.wordbook_list_row.{st}', l, nineSlice=ns(24, 4, 4, 6), hit=dict(h=24),
        textRects=[TR('fr', 26, 5, 'w-48', 14, 24)], pri='P0', note='32 wide (not 24): l-inset 24 keeps the status mark un-stretched')

# ---------------------------------------------------------------- §4 review
for st in ('idle', 'pressed', 'disabled'):
    add(f'ui.review_entry.{st}', None, alias=f'ui.btn_primary.{st}', icon='ui.icon.drop', iconAt=dict(x=4, y=7),
        textRects=[TR('cta', 20, 7, 'w-26', 14, 14)], pri='P0', note='hidden-before-story = engine does not draw')
def can(level, glint=False):
    l = L(16, 14)
    l.put(["................",
           "....gggggg......",
           "...g......g.....",
           ".ssssssssssss...",
           ".sSSSSSSSSSSs..s",
           ".sSSSSSSSSSSs.s.",
           ".sSSSSSSSSSSsss.",
           ".sSSSSSSSSSSss..",
           ".sSSSSSSSSSSs...",
           ".sSSSSSSSSSSs...",
           ".sSSSSSSSSSSs...",
           ".sSSSSSSSSSSs...",
           ".ssssssssssss...",
           "................"], 0, 0, dict(g='grey', s='grey', S='cream'))
    rows = {0: 0, 1: 3, 2: 6, 3: 8}[level]
    for j in range(rows): l.r(2, 11 - j, 10, 1, 'water')
    if rows: l.r(2, 11 - rows + 1, 10, 1, 'water'); l.p(3, 12 - rows, 'water_hi')
    if glint: l.p(10, 4, 'white'); l.p(11, 5, 'white'); l.p(14, 5, 'white'); l.r(2, 4, 10, 8, 'water'); l.p(3, 5, 'water_hi'); l.p(4, 5, 'water_hi')
    return l
for st, lv in dict(empty=0, third=1, twothird=2, full=3).items():
    add(f'ui.water_meter.{st}', can(lv), file=f'can_small_{st}', anchor='tc', pri='P0', note='one can per pot; 5 cans gap 3 -> 92x14')
add('ui.water_meter.glint', can(3, True), file='can_small_glint', anchor='tc', pri='P0', note='1 frame flash on fill')
tb = L(24, 22); tb.r(0, 0, 24, 22, 'panel'); tb.r(0, 18, 24, 1, 'orange'); tb.r(0, 19, 24, 1, 'orange_sh'); tb.r(0, 20, 24, 1, 'wood'); tb.r(0, 21, 24, 1, 'dark')
# rev2: cream wall above a wooden shelf lip (light edge, grain line, dark underside) — rows uniform -> seamless
add('ui.top_bar.idle', tb, nineSlice=ns(4, 4, 4, 4), pri='P0', note='full width; holds exit + meter/pips/timer')
HOP = [["..b.", ".bb.", "bbbb", "bwbb", "bbbb", ".nn."],
       [".b..", ".bb.", "bbbb", "bwbb", "bbbb", ".nn."],
       ["....", ".bb.", "bbbb", "bwbb", "bbbb", ".nn."],
       ["....", "....", "bbbb", "bwbb", "bbbn", ".nn."],
       ["....", ".bb.", "bbbb", "bwbb", "bbbb", ".nb."],
       ["....", "..b.", ".bb.", "bwbb", "bbbb", ".nn."]]
for f, rows in enumerate(HOP):
    l = L(4, 6); l.put(rows, 0, 0, k); add(f'ui.water_hop.hop_f{f}', l, anchor='c', pri='P0')
SPL = [["...bb...", "..b..b..", "........", "..wbbw.."], ["b..bb..b", ".b....b.", "........", ".bwbbwb."], ["b......b", "........", "........", "b.bbbb.b"]]
for f, rows in enumerate(SPL):
    l = L(8, 4); l.put(rows, 0, 0, k); add(f'ui.water_hop.splash_f{f}', l, anchor='bc', pri='P0')
add('ui.water_hop.hop', None, seq=[f'ui.water_hop.hop_f{f}' for f in range(6)], fps=10, pri='P0', note='engine moves it along can→pot arc (0.6 s)')
add('ui.water_hop.splash', None, seq=[f'ui.water_hop.splash_f{f}' for f in range(3)], fps=12, pri='P0')
# pot_state: due glow (2 f) + leaf_yellow recolour of garden_parts leaves_full_* (garden_parts are off-palette; new art is on-palette)
GP = f'{ROOT}/garden/garden_parts'
pf = Image.open(f'{GP}/pot_front.png').convert('RGBA')
for f in range(2):
    l = L(24, 66); a = pf.split()[3]
    for y in range(66):
        for x in range(24):
            if a.getpixel((x, y)) == 0 and any(0 <= x+dx < 24 and 0 <= y+dy < 66 and a.getpixel((x+dx, y+dy)) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))):
                if f == 0 or (x + y) % 2 == 0: l.p(x, y, 'white' if f == 0 else 'sky')
    add(f'ui.pot_state.due_f{f}', l, anchor='bc', anchorPoint=dict(x=12, y=66), pri='P0', note='overlay around existing pot_front (2-frame glow)')
add('ui.pot_state.due', None, seq=['ui.pot_state.due_f0', 'ui.pot_state.due_f1'], fps=2, pri='P0')
for n in range(1, 5):
    src = Image.open(f'{GP}/leaves_full_{n}.png').convert('RGBA'); l = L(24, 66)
    m = {PAL['green_sh']: 'orange_sh', PAL['green']: 'orange', PAL['cream']: 'wall',  # on-palette garden_parts (10/26)
         (47, 110, 54): 'orange_sh', (79, 154, 74): 'orange', (127, 174, 90): 'wall'}  # legacy off-palette
    for y in range(66):
        for x in range(24):
            p = src.getpixel((x, y))
            if p[3]: l.p(x, y, m.get(p[:3], 'orange'))
    add(f'ui.pot_state.leaf_yellow_{n}', l, anchor='bc', anchorPoint=dict(x=12, y=66), pri='P0', note=f'swap for leaves_full_{n} for 1 s on a lapse')
for st in ('watered', 'grown', 'dormant'):
    add(f'ui.pot_state.{st}', None, existing='garden/garden_parts (pot_back/front + stem/leaves_*)', pri='P0')
for st, e in dict(recognition=None, recall=None, recast='wrong').items():
    l = panel()
    if st == 'recall': l.r(3, 20, 18, 1, 'wall_sh')  # ruled answer line hint
    if e:
        for j in range(2, 21): l.p(1, j, e); l.p(2, j, e)
    add(f'ui.review_item_frame.{st}', l, anchor='tc', nineSlice=ns(4, 4, 4, 4), target=dict(w=172, h=100), pri='P0',
        textRects=[TR('line', 6, 64, 160, 28, 70)], note='picture/thumb area y 4..60 engine-placed; « ? » btn_icon inside top-right')
for st in ('idle', 'pressed', 'correct', 'recast', 'disabled'):
    add(f'ui.review_option_row.{st}', None, alias=f'ui.btn_option_row.{"wrong" if st == "recast" else st}', pri='P0')
re_ = panel(172, 120)
for i in range(5):
    x = 14 + i * 31; y = 46
    re_.r(x, y + 16, 18, 2, 'wood'); re_.r(x + 2, y + 18, 14, 10, 'orange'); re_.r(x + 2, y + 18, 14, 1, 'orange_sh'); re_.r(x + 4, y + 28, 10, 2, 'orange_sh')
    re_.r(x + 8, y + 6, 2, 10, 'green_sh'); re_.put(["gg....gg", "ggg..ggg", ".gggggg.", "..gGGg.."], x + 5, y + 4, k)
    re_.put(["b", "b", "n"], x + 15, y + 1, k)  # fresh drop on each
re_.r(10, 78, 152, 1, 'wall_sh')
add('ui.review_end.idle', re_, anchor='c', textRects=[TR('msg', 8, 8, 156, 24, 60)], pri='P0',
    note='baked 172x120: watered-pots strip y 46..76; buttons (Fini primary / Encore 5 ? secondary) engine-placed at y 84..112')

# ---------------------------------------------------------------- §5 listen
for st in ('idle', 'pressed', 'playing', 'slow-active'):
    add(f'ui.listen_controls.{st}', None, compose=['ui.btn_icon.' + ('active' if st in ('playing', 'slow-active') else st),
        'ui.icon.replay', 'ui.icon.' + ('slow_active' if st == 'slow-active' else 'slow')], anchor='bc', pri='P0',
        note='row: replay | slow | (audio), each 22x22, gap 4')
for st in ('idle', 'focus', 'correct', 'near', 'recast'):
    add(f'ui.dictation_gap.{st}', None, alias=f'ui.text_field.{st}', textRects=[TR('gap', 5, 5, 'w-10', 14, 24)], pri='P0')
# ---------------------------------------------------------------- §6 output
for st, e in dict(idle=None, focus='focus', match='correct', recast='wrong').items():
    l = L(24, 24); l.r(0, 1, 24, 23, 'panel'); l.r(0, 23, 24, 1, 'panel_sh'); l.r(23, 1, 1, 23, 'panel_sh')
    l.r(0, 1, 24, 1, 'wall'); l.p(1, 2, 'wall'); l.p(2, 1, 'panel'); l.p(21, 1, 'panel')  # rev2: uniform top fibre row, dither in corners only
    if e:
        for j in range(3, 22): l.p(0, j, e); l.p(1, j, e)
    add(f'ui.reply_note.{st}', l, nineSlice=ns(4, 4, 4, 4), textRects=[TR('reply', 6, 6, 'w-12', 'h-12', 80)], pri='P0',
        note='paper, no ink edge; overlay ui.reply_note.tape centred on top edge')
tp = L(6, 3); tp.r(0, 0, 6, 3, 'wood'); tp.r(0, 2, 6, 1, 'orange_sh'); tp.p(0, 0, 'orange_sh'); tp.p(5, 2, 'dark')
add('ui.reply_note.tape', tp, anchor='tc', pri='P0')
CH = dict(idle=('panel', 'panel_sh', 'idle'), pressed=('panel', 'panel_sh', 'pressed'), placed=('wall', 'wall_sh', 'idle'), disabled=('disabled', 'disabled_sh', 'idle'))
for st, (f, s, ss) in CH.items():
    add(f'ui.chunk_chip.{st}', button(16, 22, fill=f, sh=s, state=ss), nineSlice=ns(4, 4, 4, 6), hit=dict(h=22),
        textRects=[TR('chunk', 4, 5, 'w-8', 12, 16)], pri='P0')
for st, c in dict(empty='wall_sh', filled='wall_sh', focus='focus').items():
    l = L(16, 22)
    if st == 'filled': l.r(0, 0, 16, 22, 'wall'); 
    for i in range(16):
        if i % 3 != 2 or st == 'filled': l.p(i, 0, c); l.p(i, 21, c)
    for j in range(22):
        if j % 3 != 2 or st == 'filled': l.p(0, j, c); l.p(15, j, c)
    add(f'ui.chunk_slot.{st}', l, nineSlice=ns(4, 4, 4, 4), hit=dict(h=22), pri='P0', note='dashed 2-on/1-off; tile the edge, do not stretch the dash')
def mic_btn(fill, sh, st='idle', ring=None, ringw=0):
    l = L(40, 40); y = 1 if st == 'pressed' else 0
    for j in range(40):
        for i in range(40):
            d = ((i - 19.5) ** 2 + (j - 19.5) ** 2) ** .5
            if ring and 18.5 - ringw < d <= 19.6: l.p(i, j, ring)
    for j in range(36):
        for i in range(36):
            d = ((i - 17.5) ** 2 + (j - 17.5) ** 2) ** .5
            if d <= 17.6 and st != 'pressed': l.p(i + 2, j + 3, sh)
    for j in range(36):
        for i in range(36):
            d = ((i - 17.5) ** 2 + (j - 17.5) ** 2) ** .5
            if d <= 17.6: l.p(i + 2, j + 1 + y, fill)
    big = I['mic'].im.resize((28, 28), Image.NEAREST)
    m = L(28, 28); m.im = big; m = recolor(m, {'ink': 'cream', 'silver': 'sky' if fill == 'record' else 'cream'})
    l.paste(m, 6, 6 + y); return l
add('ui.mic_button.idle', mic_btn('primary', 'primary_sh'), anchor='bc', hit=dict(w=40, h=40), pri='P0')
add('ui.mic_button.pressed', mic_btn('primary', 'primary_sh', 'pressed'), anchor='bc', hit=dict(w=40, h=40), pri='P0')
for f in range(3):
    add(f'ui.mic_button.recording_f{f}', mic_btn('record', 'navy_sh', ring='record_ring', ringw=[0, 1, 2][f] if f else 0.01), anchor='bc', hit=dict(w=40, h=40), pri='P0')
add('ui.mic_button.recording', None, seq=[f'ui.mic_button.recording_f{f}' for f in range(3)], fps=4, pri='P0', note='navy + sky pulse ring (no red)')
add('ui.mic_button.disabled', mic_btn('disabled', 'disabled_sh'), anchor='bc', pri='P0', note='spec: no mic → hidden + tap-choice fallback')
for st in ('idle', 'pressed', 'playing'):
    for who, ic in (('mine', 'ui.icon.mic'), ('model', 'ui.icon.audio')):
        add(f'ui.record_compare.{who}_{st}', None, alias=f'ui.btn_secondary.{"pressed" if st == "pressed" else "idle"}',
            icon=ic, iconAt=dict(x=4, y=7), playingTint='ui.btn_icon.active' if st == 'playing' else None,
            textRects=[TR('cta', 20, 7, 'w-26', 14, 10)], pri='P0')
# ---------------------------------------------------------------- §7 start path
for st in ('idle', 'pressed', 'focus'):
    add(f'ui.start_choice_big.{st}', None, alias=f'ui.btn_primary.{st}', target=dict(w=172, h=40), art='ui.start_choice_big.art', artAt=dict(x=4, y=4),
        textRects=[TR('cta', 40, 8, 124, 24, 18)], hit=dict(h=40), pri='P0')
art = L(32, 32)
art.r(0, 0, 32, 32, 'wall'); art.r(0, 28, 32, 4, 'floor'); art.r(0, 28, 32, 1, 'floor_sh')
art.r(15, 4, 14, 24, 'wood'); art.r(16, 5, 12, 23, 'navy'); art.r(17, 6, 10, 10, 'navy_sh'); art.r(17, 17, 10, 10, 'navy_sh'); art.p(18, 17, 'cream'); art.r(13, 3, 18, 1, 'wall_sh')
# Noé silhouette (hair, face, coat) beside the door
art.r(6, 8, 6, 3, 'noe_hair'); art.r(6, 11, 6, 5, 'skin'); art.r(6, 11, 6, 1, 'noe_hair'); art.p(7, 13, 'dark'); art.p(10, 13, 'dark')
art.r(5, 16, 8, 8, 'orange'); art.r(5, 16, 8, 1, 'orange_sh'); art.r(6, 24, 2, 4, 'navy'); art.r(10, 24, 2, 4, 'navy'); art.r(12, 18, 3, 2, 'skin')
art.r(2, 20, 3, 6, 'wood'); art.r(2, 20, 3, 1, 'dark')  # suitcase
add('ui.start_choice_big.art', art, pri='P0', note='32x32 art slot: Noé arriving at the door of 411')
for st in ('idle', 'pressed', 'focus'):
    add(f'ui.start_choice_small.{st}', None, alias=f'ui.btn_secondary.{st}', target=dict(w=172, h=28), textRects=[TR('cta', 8, 7, 156, 14, 32)], pri='P0')
for st in ('idle', 'focus', 'disabled'):
    add(f'ui.name_field.{st}', None, alias=f'ui.text_field.{st}', target=dict(w=172, h=24), textRects=[TR('name', 5, 5, 162, 14, 20)], pri='P0')
tt = L(60, 6); rbox(tt, 0, 0, 60, 6, 'wall_sh', rad=1); tt.r(1, 1, 58, 4, 'cream')
add('ui.placement_timer.track', tt, anchor='tr', pri='P0', textRects=[TR('time', 64, 0, 40, 14, 14)], note='+ ui.icon.clock left of track; fill drawn inside (1,1,58,4), cropped by engine')
for st, c in dict(running='water', low='wrong', done='correct').items():
    f_ = L(58, 4); f_.r(0, 0, 58, 4, c); f_.r(0, 0, 58, 1, 'white' if st != 'low' else 'cream')
    add(f'ui.placement_timer.{st}', f_, file=f'placement_timer_fill_{st}', pri='P0', note='fill strip; engine crops width to time left')
pr = panel(172, 150)
fa = L(172, 40)
fa.r(0, 0, 172, 40, 'wall'); fa.r(0, 0, 172, 3, 'grey'); fa.r(0, 37, 172, 3, 'floor_sh')
for i in range(8):
    x = 6 + i * 21
    if i == 4: continue
    for row in (6, 21):
        fa.r(x, row, 10, 12, 'sky'); fa.r(x, row, 10, 1, 'wall_sh'); fa.r(x + 4, row, 2, 12, 'wall'); fa.r(x - 1, row + 12, 12, 2, 'dark')
fa.r(88, 12, 16, 25, 'cream'); fa.r(90, 14, 12, 23, 'wood'); fa.r(91, 15, 4, 10, 'orange_sh'); fa.r(97, 15, 4, 10, 'orange_sh'); fa.p(96, 27, 'cream')
fa.p(86, 20, 'white'); fa.p(106, 18, 'white'); fa.p(87, 31, 'white')
pr.paste(fa.im.crop((1, 0, 171, 40)), 1, 1)
pr.r(1, 1, 170, 1, 'grey')
add('ui.placement_result.idle', pr, anchor='c', pri='P0', textRects=[TR('day', 8, 48, 156, 18, 32), TR('eta', 8, 70, 156, 40, 160), TR('link', 8, 114, 156, 12, 24)],
    note='façade strip baked at top (door framed in cream); buttons below the panel, engine-placed')
add('ui.placement_result.facade', fa, pri='P0')

# ---------------------------------------------------------------- P1
for st, (f, s, ss) in dict(idle=('panel', 'panel_sh', 'idle'), pressed=('panel', 'panel_sh', 'pressed'), used=('wall', 'wall_sh', 'pressed'), disabled=('disabled', 'disabled_sh', 'idle')).items():
    add(f'ui.letter_tile.{st}', button(16, 22, fill=f, sh=s, state=ss), hit=dict(w=16, h=22), textRects=[TR('letter', 2, 4, 12, 14, 1)], pri='P1')
WAVE = [[2, 4, 6, 4, 2, 3, 5, 3], [3, 6, 4, 2, 4, 6, 3, 2], [4, 3, 2, 5, 6, 3, 2, 4], [6, 2, 3, 4, 3, 2, 6, 3]]
for f, hs in enumerate(WAVE):
    l = L(32, 10)
    for i, hh in enumerate(hs): l.r(1 + i * 4, 5 - hh // 2 * 1 - (hh % 2), 2, hh + 1, 'navy' if f >= 0 else 'sky')
    add(f'ui.listen_wave.playing_f{f}', l, anchor='c', pri='P1')
l = L(32, 10); [l.r(1 + i * 4, 4, 2, 2, 'silver') for i in range(8)]; add('ui.listen_wave.idle', l, anchor='c', pri='P1')
add('ui.listen_wave.playing', None, seq=[f'ui.listen_wave.playing_f{f}' for f in range(4)], fps=8, pri='P1')
for st in ('idle', 'focus', 'correct', 'near', 'recast'):
    add(f'ui.dictation_line.{st}', None, alias=f'ui.text_field.{st}', textRects=[TR('line', 5, 5, 'w-10', 14, 48)], pri='P1')
for who in ('yes', 'unsure'):
    for st in ('idle', 'pressed', 'chosen'):
        b = ICB['active' if st == 'chosen' else st]; l = L(22, 22); l.paste(b, 0, 0); l.paste(I['thumb' if who == 'yes' else 'thinking'], 4, 3 + (st == 'pressed'))
        add(f'ui.self_rate.{who}_{st}', l, anchor='bc', hit=dict(w=22, h=22), pri='P1')
eb = L(156, 10); eb.r(0, 3, 156, 4, 'wall_sh'); eb.r(0, 4, 156, 2, 'cream')
add('ui.eta_range_bar.track', eb, pri='P1', note='range blocks placed by engine')
for st, c in dict(near='green', far='sky').items():
    b = L(12, 10); rbox(b, 0, 0, 12, 10, c, rad=1); b.r(1, 1, 10, 1, 'white')
    add(f'ui.eta_range_bar.block_{st}', b, nineSlice=ns(3, 3, 3, 3), pri='P1', note='30 min (near) / 2 h (far) range block; labels engine-drawn under')
def carnet(st, wig=0, dot=False):
    base = ICB['pressed' if st == 'pressed' else 'idle']; l = L(22, 22); l.paste(base, 0, 0)
    ic = I['book'] if st != 'dimmed' else recolor(I['book'], {'green': 'grey', 'green_sh': 'silver', 'cream': 'wall'})
    l.paste(ic, 4 + wig, 3 + (st == 'pressed'))
    if dot: l.r(17, 1, 4, 4, 'newdot'); l.p(18, 2, 'white')
    return l
for st in ('idle', 'pressed', 'dimmed'): add(f'ui.carnet_button.{st}', carnet(st), anchor='bl', hit=dict(w=22, h=22), pri='P0')
add('ui.carnet_button.new-dot', carnet('idle', dot=True), anchor='bl', hit=dict(w=22, h=22), pri='P1')
for f, w in enumerate((-1, 1, 0)): add(f'ui.carnet_button.wiggle_f{f}', carnet('idle', w), anchor='bl', pri='P1')
add('ui.carnet_button.wiggle', None, seq=[f'ui.carnet_button.wiggle_f{f}' for f in range(3)], fps=10, pri='P1')

# ---------------------------------------------------------------- write pieces, atlas, manifest
real = [k_ for k_, v in PIECES.items() if v['im'] is not None]
def fname(key):
    v = PIECES[key]
    if v.get('file'): return v['file']
    return key[3:].replace('.', '_').replace('-', '_')
order = sorted(real, key=lambda k_: (-PIECES[k_]['im'].size[1], k_))
AW = 512; x = y = rowh = 0; pos = {}
for k_ in order:
    w, h = PIECES[k_]['im'].size
    if x + w > AW: x = 0; y += rowh + 1; rowh = 0
    pos[k_] = (x, y); x += w + 1; rowh = max(rowh, h)
AH = y + rowh
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for k_ in order: atlas.paste(PIECES[k_]['im'], pos[k_])
atlas.save(f'{D}/ui_learning_rev2.png')
ANC = dict(tl=(0, 0), tc=(.5, 0), tr=(1, 0), c=(.5, .5), bc=(.5, 1), bl=(0, 1))
assets = {}
for k_, v in PIECES.items():
    meta = {kk: vv for kk, vv in v.items() if kk not in ('im', 'anchor', 'file', 'seq', 'fps')}
    if v.get('seq'):
        assets[k_] = dict(type='sequence', frames=v['seq'], fps=v['fps'], **meta); continue
    if v['im'] is None:
        assets[k_] = dict(type='ref', anchor=v['anchor'], **meta); continue
    w, h = v['im'].size; ax, ay = ANC[v['anchor']]
    ap = meta.pop('anchorPoint', dict(x=round(ax * w), y=round(ay * h)))
    fn = fname(k_); v['im'].save(f'{OUT1}/{fn}.png'); v['im'].resize((w * 8, h * 8), Image.NEAREST).save(f'{OUT8}/{fn}_x8.png')
    assets[k_] = dict(source='atlas', atlas='ui_learning_rev2', frame=dict(x=pos[k_][0], y=pos[k_][1], w=w, h=h),
                      anchor=v['anchor'], anchorPoint=ap, pixelScale=1, displayScale=2, depth=20, file=f'pieces/x1/{fn}.png', **meta)
# §10b-2: textColor = palette ROLE NAME (not hex) on every asset that has textRects; cream on btn_primary, ink elsewhere.
for k_, a_ in assets.items():
    if a_.get('textRects'): a_['textColor'] = 'cream' if k_.startswith('ui.btn_primary.') else 'ink'
man = dict(set='ui_learning', rev=2, spec='tech/UI_COMPONENTS.md (2026-10-26)', assetRoot='.', grading='never (self-lit UI)',
           colorMap=CM, anchorCodes={k_: dict(x=a, y=b) for k_, (a, b) in ANC.items()},
           atlases=dict(ui_learning_rev2=dict(file='ui_learning_rev2.png', w=AW, h=AH)), assets=assets)
json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1, ensure_ascii=False)
# contact sheet x4 on cream
sh = Image.new('RGBA', (AW * 4, AH * 4), PAL['wall'] + (255,)); sh.alpha_composite(atlas.resize((AW * 4, AH * 4), Image.NEAREST))
sh.save(f'{D}/ui_learning_rev2_sheet.png')
print(len(assets), 'assets,', len(real), 'pieces, atlas', AW, AH)
