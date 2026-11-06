"""411 stairwell / landing set, global style B. Original PIL code art, canonical palette only.
Reuses helpers from ../kitchen/gen_kitchen.py and the portrait framing idea of ../rooftop (imported/re-implemented, not edited).
Run: python3 gen_stairwell.py -> stairwell_<v>_sheet.png, pieces/, light/, manifest.json, stages, composites."""
import json, os, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, '..', 'kitchen'))
from gen_kitchen import L, C, steps, grade, put, COOL, COOL_T, WARM, CAP, BOT   # helpers only
W_ST, H_ST = 192, 144
HORIZON = 128; FEET = 136; BACKBASE = 131
DOORBASE = 128        # doors stand on the landing edge (threshold row = stage y128)
RAIL_Y = 92           # chair rail (wainscot top) in stage px
VARIANTS = ['day', 'evening', 'night']
TL = lambda w, h: {'x': 0, 'y': 0}
# ---------- backdrops ----------
def wall(v):  # 64x128 tiles x: cornice, cream upper wall, wood chair rail, panelled wainscot, skirting
    b = L(64, 128).r(0, 0, 63, 127, 'wall').r(0, 0, 63, 2, 'white').r(0, 3, 63, 3, 'wall_sh').r(0, 4, 63, 4, 'silver')
    for x in range(0, 64, 4): b.p(x + 1, 2, 'wall_sh')                     # dentil row
    b.r(0, RAIL_Y, 63, RAIL_Y + 1, 'wood').r(0, RAIL_Y + 2, 63, 125, 'wall_sh')
    for x0 in (3, 35):                                                   # two raised panels per tile
        b.r(x0, RAIL_Y + 5, x0 + 25, RAIL_Y + 5, 'floor').r(x0, RAIL_Y + 5, x0, 122, 'floor')
        b.r(x0, 122, x0 + 25, 122, 'cream').r(x0 + 25, RAIL_Y + 5, x0 + 25, 122, 'cream')
    return b.r(0, 124, 63, 127, 'wood').r(0, 124, 63, 124, 'noe_hair').im
def floor(v):  # 64x16 tiles x: tomettes (terracotta hex-ish tiles in offset rows), a few worn ones
    b = L(64, 16).r(0, 0, 63, 15, 'orange_sh').r(0, 0, 63, 0, 'red_sh')
    for row, y in enumerate(range(1, 16, 4)):
        b.r(0, y + 3, 63, y + 3, 'red_sh')
        for x in range((row % 2) * 4, 64, 8): b.r(x, y, x, y + 2, 'red_sh')
    for x, y in ((10, 6), (29, 2), (45, 10), (57, 6), (18, 14), (37, 14)): b.r(x, y, x + 2, y, 'orange')
    return b.im
def pipe(v):  # 3x124 vertical riser pipe with two collars (any x on the wall)
    b = L(3, 124).r(0, 0, 2, 123, 'grey').r(2, 0, 2, 123, 'silver')
    for y in (20, 70, 110): b.r(0, y, 2, y + 1, 'silver').p(0, y + 2, 'wall_sh')   # wall clips
    return b.im
# ---------- doors ----------
def door(v, opened, col, col_sh, home):  # 26x42 casing + 20x38 door leaf; home = brass plate + peephole + knocker
    b = L(26, 42).r(0, 0, 25, 41, 'wood').r(0, 0, 25, 0, 'noe_hair').r(1, 41, 24, 41, 'ink')
    if not opened:
        b.r(3, 3, 22, 40, col).r(5, 6, 20, 20, col_sh).r(5, 24, 20, 37, col_sh).r(6, 7, 19, 19, col).r(6, 25, 19, 36, col)
        b.r(19, 22, 20, 23, 'gold').p(19, 24, 'gold')                     # knob
        if home:
            b.r(9, 2, 16, 2, 'gold')                                       # brass strip on the lintel
            b.r(10, 4, 11, 4, 'pink').r(13, 4, 14, 4, 'pink').r(10, 5, 14, 5, 'pink').r(11, 6, 13, 6, 'pink').p(12, 7, 'pink')   # tiny pink heart charm (same motif as pot 1)
            b.p(12, 10, 'gold').p(13, 10, 'gold').p(12, 11, 'dark').p(13, 11, 'gold')   # peephole ring
            b.r(10, 13, 15, 15, 'gold').p(11, 14, 'orange_sh').p(13, 14, 'orange_sh').p(14, 14, 'orange_sh')   # door plate, 3 abstract dots (no digits)
        else:
            b.p(12, 10, 'dark').p(13, 10, 'dark')
    else:
        b.r(3, 3, 22, 40, 'wall').r(3, 3, 22, 4, 'wall_sh').r(3, 33, 22, 40, 'floor').r(3, 33, 22, 33, 'floor_sh')   # glimpse inside
        b.r(14, 12, 19, 20, 'wood').r(15, 13, 18, 19, 'gold') if home else b.r(14, 12, 19, 20, 'grey')            # hallway frame / mirror
        b.r(3, 3, 6, 40, col).r(6, 3, 6, 40, col_sh).p(5, 22, 'gold')     # leaf swung in (foreshortened)
    return b.im
def doormat(v, home=True):  # home: 22x4 patterned mat (border + diamonds, no text); plain: 20x3 coir
    if not home: return L(20, 3).r(0, 0, 19, 2, 'floor').r(0, 2, 19, 2, 'floor_sh').im
    b = L(22, 4).r(0, 0, 21, 3, 'red_sh').r(1, 1, 20, 2, 'gold')
    for x in range(2, 20, 4): b.p(x, 1, 'pink').p(x + 1, 2, 'pink').p(x + 2, 1, 'red_sh').p(x + 1, 1, 'orange').p(x + 2, 2, 'orange')
    return b.im
# ---------- wall pieces ----------
def mailboxes(v, letter):  # 22x20 wall cabinet of 2x3 boxes with brass slots; letter = one envelope sticking out
    b = L(22, 20).r(0, 0, 21, 19, 'wood').r(0, 19, 21, 19, 'ink')
    for c in range(3):
        for r in range(2):
            x, y = 1 + c * 7, 1 + r * 9; b.r(x, y, x + 5, y + 7, 'green').r(x + 5, y, x + 5, y + 7, 'green_sh').r(x + 1, y + 2, x + 4, y + 2, 'gold')
    if letter: b.r(9, 10, 12, 13, 'white').r(9, 13, 12, 13, 'silver')
    return b.im
def notice_board(v):  # 20x14 cork board, blank papers + pins (no text)
    b = L(20, 14).r(0, 0, 19, 13, 'wood').r(1, 1, 18, 12, 'floor')
    b.r(2, 2, 7, 9, 'white').r(9, 3, 13, 7, 'pink').r(14, 2, 17, 10, 'cream').r(5, 9, 10, 11, 'sky')
    for x, y in ((4, 2), (11, 3), (15, 2), (7, 9)): b.p(x, y, 'red_sh')
    return b.im
def minuterie(v, on):  # 5x7 timer switch: white plate, grey edge, round push button; on = button glows
    b = L(5, 7).r(0, 0, 4, 6, 'white').r(4, 0, 4, 6, 'silver').r(0, 6, 4, 6, 'silver')
    k = 'gold' if on else 'orange_sh'; return b.r(1, 2, 3, 4, 'grey').r(2, 2, 2, 4, k).r(1, 3, 3, 3, k).im
def bulb(v, on):  # 7x96 bare bulb on a long cord (stairwell drop); anchor topleft at cord top (3,0); glass y90..95
    b = L(7, 96).r(2, 0, 4, 1, 'ink').r(3, 2, 3, 86, 'dark').r(2, 87, 4, 89, 'ink')
    if on: b.r(1, 90, 5, 93, 'gold').r(2, 90, 4, 93, 'white').r(2, 94, 4, 94, 'gold').p(3, 95, 'gold')
    else: b.r(1, 90, 5, 93, 'silver').r(2, 90, 3, 91, 'white').r(2, 94, 4, 94, 'grey').p(3, 95, 'grey')
    return b.im
def wall_lamp(v):  # 7x9 sconce: oval brass backplate on the wall, short arm, cream tulip shade (optional, not in the default layout)
    b = L(7, 9).r(0, 2, 1, 7, 'gold').r(0, 2, 0, 7, 'orange_sh').r(2, 5, 3, 5, 'gold')
    return b.r(3, 0, 6, 1, 'cream').r(4, 2, 6, 4, 'cream').r(6, 0, 6, 4, 'wall_sh').r(4, 5, 5, 6, 'gold').im
def pipe_h(v):  # 68x10 tee off the riser: horizontal run just under the cornice (rows 7-8), elbow up into the ceiling at the right (x65-67)
    b = L(68, 10).r(0, 7, 67, 8, 'grey').r(0, 7, 67, 7, 'silver').r(65, 0, 67, 8, 'grey').r(67, 0, 67, 8, 'silver')
    b.r(0, 6, 2, 9, 'silver').r(64, 6, 67, 9, 'silver').r(63, 0, 67, 0, 'silver')    # tee, elbow, ceiling flange
    for x in (20, 44): b.r(x, 7, x + 1, 9, 'silver').p(x, 9, 'wall_sh')                # wall clips
    return b.im
def window(v):  # 22x30 landing window, pane carries its own sky (UNGRADED like the kitchen window)
    sky = {'day': 'sky', 'evening': 'pink', 'night': 'navy_sh'}[v]; fac = {'day': 'cream', 'evening': 'plum', 'night': 'dark'}[v]
    b = L(22, 30).r(0, 0, 21, 29, 'wood').r(2, 2, 19, 25, sky)
    if v == 'evening': b.r(2, 2, 19, 6, 'plum').r(2, 7, 19, 10, 'orange').r(2, 11, 19, 12, 'gold')
    if v == 'day': b.r(4, 5, 8, 6, 'white')
    if v == 'night': b.p(5, 4, 'white').p(16, 6, 'white')
    b.r(2, 14, 19, 25, fac).r(2, 13, 19, 13, {'day': 'grey', 'evening': 'plum_sh', 'night': 'navy'}[v])   # facade across the courtyard
    for x in (4, 8, 13, 16):
        for y in (16, 21):
            lit = (v == 'night' and (x + y) % 3 != 0) or (v == 'evening' and x == 13)
            b.r(x, y, x + 1, y + 2, 'gold' if lit else ('navy' if v == 'day' else 'plum_sh' if v == 'evening' else 'navy'))
    b.r(10, 2, 11, 25, 'wood').r(2, 13, 19, 13, 'wood') if False else b.r(10, 2, 11, 25, 'wood')
    b.r(2, 9, 19, 9, 'wood')
    return b.r(0, 26, 21, 28, 'white').r(0, 29, 21, 29, 'silver').im
def radiator(v):  # 16x14 cast-iron column radiator on feet + valve
    b = L(16, 14)
    for x in range(1, 15, 3): b.r(x, 1, x + 1, 12, 'silver').r(x + 1, 1, x + 1, 12, 'grey')
    return b.r(1, 2, 14, 2, 'grey').r(1, 11, 14, 11, 'grey').r(0, 9, 0, 11, 'gold').r(2, 13, 2, 13, 'grey').r(13, 13, 13, 13, 'grey').im
def plant(v):  # 10x18 big landing plant in a pot (green mass)
    b = L(10, 18).r(2, 12, 7, 17, 'orange').r(6, 12, 7, 17, 'orange_sh').r(1, 11, 8, 11, 'orange_sh')
    b.r(4, 3, 5, 10, 'green_sh').r(1, 2, 4, 6, 'green').r(5, 0, 8, 4, 'green').r(0, 6, 3, 9, 'green_sh').r(6, 5, 9, 9, 'green').r(3, 7, 6, 9, 'green')
    return b.p(2, 3, 'green_sh').p(7, 2, 'green_sh').im
def parcel(v):  # 9x7 delivery box (blank label)
    return L(9, 7).r(0, 0, 8, 6, 'floor').r(7, 0, 8, 6, 'floor_sh').r(4, 0, 4, 6, 'wall_sh').r(1, 3, 3, 4, 'white').im
def shoes(v):  # 9x3 pair of shoes (one red pair = 411's), side by side
    b = L(9, 3).r(0, 1, 3, 2, 'red_sh').r(0, 0, 1, 0, 'red_sh').r(5, 1, 8, 2, 'red_sh').r(5, 0, 6, 0, 'red_sh')
    return b.r(0, 2, 3, 2, 'ink').r(5, 2, 8, 2, 'ink').im
def umbrella(v):  # 5x17 furled umbrella leaning on the wall: crook handle, navy canopy, tip
    b = L(5, 17).r(0, 0, 2, 0, 'wood').p(0, 1, 'wood').r(2, 1, 2, 3, 'wood')
    return b.r(1, 4, 3, 12, 'green').r(3, 4, 3, 12, 'green_sh').r(2, 13, 2, 15, 'grey').p(2, 16, 'dark').r(1, 8, 3, 8, 'green_sh').im
DSTEPS = 4
def stairs_down(v):  # 36x34 short flight going DOWN to the left through the landing floor (arrivals from the street); own rail + newel
    W, H = 36, 34; b = L(W, H); top = 18                          # local y18 = landing floor line (stage y128)
    b.r(0, top, W - 6, H - 1, 'ink')                                 # stair void below the landing
    for i in range(DSTEPS):                                          # step i: tread at y top+4(i+1)-1, spans from the landing edge leftwards
        x1 = W - 7 - i * 7; x0 = x1 - 6; ty = top + 4 * i
        b.r(x0, ty, x1, ty, 'wood').r(x0, ty + 1, x1, ty + 3, 'wall_sh').r(x0, ty + 1, x1, ty + 1, 'noe_hair')
    b.r(W - 6, top, W - 1, H - 1, 'wall_sh').r(W - 6, top, W - 1, top, 'wood')   # landing nosing / edge block
    for x in range(1, W - 3):                                        # rail descending left, 14 px above the treads
        y = top - 14 + int((W - 4 - x) * 4 / 7); b.p(x, y, 'wood').p(x, y + 1, 'noe_hair')
        if x % 3 == 0: b.r(x, y + 2, x, min(H - 1, y + 14), 'dark')
    return b.r(W - 4, top - 16, W - 1, top, 'wood').r(W - 1, top - 16, W - 1, top, 'noe_hair').r(W - 4, top - 18, W - 1, top - 17, 'gold').im
# ---------- stairs ----------
NST, SW, SH = 12, 6, 5   # steps, step width, rise
def stairs(v):  # 78x80: flight rising to the right, closed string, oak rail on wrought-iron balusters, newel post
    W, H = 4 + NST * SW + 2, NST * SH + 20; b = L(W, H); base = H - 1
    for i in range(NST):                                   # step i: tread top row y
        x0 = 4 + i * SW; ty = base - (i + 1) * SH + 1
        b.r(x0, ty, W - 1, base, 'wall_sh')                # stair mass (string)
        b.r(x0, ty, x0 + SW - 1, ty, 'wood').r(x0, ty + 1, x0 + SW - 1, ty + 1, 'noe_hair')   # tread + nosing shadow
    for x in range(4, W):                                  # string moulding below the steps
        y = base - int((x - 4) * SH / SW) + 3
        if y <= base: b.p(x, y, 'floor')
    b.r(4, base, W - 1, base, 'wall_sh')
    for x in range(5, W - 1, 3):                           # balusters every 3 px, scroll dot at mid
        i = min((x - 4) // SW, NST - 1); ty = base - (i + 1) * SH + 1; ry = ty - 15
        b.r(x, ry + 1, x, ty - 1, 'dark')
        if (x // 3) % 2 == 0: b.p(x + 1, ry + 7, 'dark').p(x + 1, ry + 9, 'dark')
    for x in range(1, W):                                  # handrail (2 px), follows the nosings 15 px up
        y = base - int((x - 4) * SH / SW) - 18 if x >= 4 else base - 18
        b.p(x, y, 'wood').p(x, y + 1, 'noe_hair')
    b.r(0, base - 20, 3, base, 'wood').r(3, base - 20, 3, base, 'noe_hair').r(0, base - 22, 3, base - 21, 'gold')   # newel + brass cap
    return b.im
# ---------- registry ----------
PIECES = {
 'wall': (wall, 'topleft', TL, {'tile': 'x', 'tileWidth': 64, 'depth': 0}),
 'floor': (floor, 'topleft', TL, {'tile': 'x', 'tileWidth': 64, 'depth': 0}),
 'pipe': (pipe, 'baseline', BOT, {'depth': 1}),
 'door411_closed': (lambda v: door(v, False, 'navy', 'navy_sh', True), 'feet', BOT, {'depth': 2, 'special': 'apartment 411 (home). plate = 3 abstract dots, no digits', 'slots': {'doorway': {'x': 13, 'y': 41}, 'peephole': {'x': 12, 'y': 10}}}),
 'door411_open': (lambda v: door(v, True, 'navy', 'navy_sh', True), 'feet', BOT, {'depth': 2, 'slots': {'doorway': {'x': 13, 'y': 41}}}),
 'doorn_closed': (lambda v: door(v, False, 'plum', 'plum_sh', False), 'feet', BOT, {'depth': 2, 'recolour': 'plum/plum_sh -> green/green_sh or wood/ink for other neighbours', 'slots': {'doorway': {'x': 13, 'y': 41}}}),
 'doorn_open': (lambda v: door(v, True, 'plum', 'plum_sh', False), 'feet', BOT, {'depth': 2, 'slots': {'doorway': {'x': 13, 'y': 41}}}),
 'mat411': (lambda v: doormat(v, True), 'feet', BOT, {'depth': 3}),
 'matn': (lambda v: doormat(v, False), 'feet', BOT, {'depth': 3}),
 'mailboxes': (lambda v: mailboxes(v, False), 'baseline', BOT, {'depth': 1, 'slots': {'box_411': {'x': 11, 'y': 6}}}),
 'mailboxes_letter': (lambda v: mailboxes(v, True), 'baseline', BOT, {'depth': 1}),
 'notice': (notice_board, 'baseline', BOT, {'depth': 1}),
 'minut_off': (lambda v: minuterie(v, False), 'baseline', BOT, {'depth': 1, 'note': 'timer switch; pressing it = bulb on for N seconds'}),
 'minut_on': (lambda v: minuterie(v, True), 'baseline', BOT, {'depth': 1}),
 'bulb_on': (lambda v: bulb(v, True), 'topleft', lambda w, h: {'x': 3, 'y': 0}, {'depth': 1, 'light': 'lamp ceiling_bulb', 'ungraded_at_night': True, 'note': 'cord may be cropped from the top for a lower ceiling'}),
 'bulb_off': (lambda v: bulb(v, False), 'topleft', lambda w, h: {'x': 3, 'y': 0}, {'depth': 1}),
 'wall_lamp': (wall_lamp, 'baseline', BOT, {'depth': 1}),
 'pipe_h': (pipe_h, 'topleft', TL, {'depth': 1, 'note': 'rev2: tee off the riser at x4, runs right, elbows up into the cornice; runs under the cornice, out of the medium/close upper wall clutter'}),
 'shoes': (shoes, 'feet', BOT, {'depth': 3, 'note': 'rev2 home cue; recolour red_sh for other pairs'}),
 'umbrella': (umbrella, 'feet', BOT, {'depth': 2, 'note': 'rev2 home cue; leans on the wall; recolour green pair'}),
 'stairs_down': (stairs_down, 'topleft', TL, {'depth': 3, 'note': 'rev2 down-flight to the street: local y18 = landing floor line; 4 visible treads 7x4 going down-left into the void; arrivals rise from bottom-left of the piece', 'slots': {'top_step': {'x': 26, 'y': 18}, 'step_3': {'x': 5, 'y': 30}}}),
 'window': (window, 'baseline', BOT, {'depth': 1, 'ungraded': True}),
 'radiator': (radiator, 'feet', BOT, {'depth': 2}),
 'plant': (plant, 'feet', BOT, {'depth': 3}),
 'parcel': (parcel, 'feet', BOT, {'depth': 3, 'note': 'delivery beats; also usable as handprop (handPoint top centre)', 'handPoint': {'x': 4, 'y': 0}}),
 'stairs': (stairs, 'feet', lambda w, h: {'x': 2, 'y': h - 1}, {'depth': 2, 'note': f'{NST} steps of {SW}x{SH} px rising right from local x4; step i tread top y = h-1-(i+1)*{SH}+1; anchor = newel foot',
             'slots': {'step_0': {'x': 7, 'y': 79 - SH + 1}, 'step_5': {'x': 4 + 5 * SW + 3, 'y': 79 - 6 * SH + 1}, 'step_11': {'x': 4 + 11 * SW + 3, 'y': 79 - 12 * SH + 1}}}),
}
IDS = {'wall': ('backdrop.stairwell', 'backwall'), 'floor': ('backdrop.stairwell_floor', 'floor'), 'pipe': ('prop.pipe_run', 'pipe_run'),
       'door411_closed': ('prop.door_home_closed', 'door_home_closed'), 'door411_open': ('prop.door_home_open', 'door_home_open'),
       'doorn_closed': ('prop.door_neighbour_closed', 'door_neighbour_closed'), 'doorn_open': ('prop.door_neighbour_open', 'door_neighbour_open'),
       'mat411': ('prop.doormat_home', 'doormat_home'), 'matn': ('prop.doormat_plain', 'doormat_plain'),
       'mailboxes': ('prop.mailboxes', 'mailboxes'), 'mailboxes_letter': ('prop.mailboxes_letter', 'mailboxes_letter'), 'notice': ('prop.notice_board', 'notice_board'),
       'minut_off': ('prop.minuterie_off', 'minuterie_off'), 'minut_on': ('prop.minuterie_on', 'minuterie_on'),
       'bulb_on': ('prop.ceiling_bulb_on', 'ceiling_bulb_on'), 'bulb_off': ('prop.ceiling_bulb_off', 'ceiling_bulb_off'), 'wall_lamp': ('prop.wall_lamp', 'wall_lamp'),
       'window': ('prop.landing_window', 'landing_window'), 'radiator': ('prop.radiator', 'radiator'), 'plant': ('prop.plant_landing', 'plant_landing'),
       'parcel': ('prop.parcel', 'parcel'), 'stairs': ('prop.stairs', 'stairs'), 'pipe_h': ('prop.pipe_h', 'pipe_h'), 'shoes': ('prop.shoes', 'shoes'), 'umbrella': ('prop.umbrella', 'umbrella'), 'stairs_down': ('prop.stairs_down', 'stairs_down')}
BULB_AT = (104, 0)            # cord top; bulb glass y54..59
BULB_C = (104, 93)
STAIRS_X = 114
LAYOUT = [('pipe', 4, 123), ('pipe_h', 5, 2), ('doorn_closed', 22, DOORBASE + 13), ('notice', 46, 84), ('mailboxes', 46, 112), ('door411_closed', 78, DOORBASE + 13),
          ('minut_off', 95, 108), ('window', 133, 77), ('radiator', 104, 127), ('stairs', STAIRS_X, BACKBASE - 1),
          ('matn', 22, 131), ('mat411', 78, 132), ('plant', 59, 131), ('umbrella', 100, 128), ('shoes', 62, 133), ('stairs_down', 156, 110)]
# doors: anchorPoint y41 -> base row at DOORBASE+13? no: keep doors standing on the floor edge
LAYOUT = [(n, x, (DOORBASE if n.startswith('door') else y)) for n, x, y in LAYOUT]
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
        f = f'stairwell_{v}_sheet.png'; sh.save(f'{D}/{f}'); sheets[v] = ims
        bg = Image.new('RGBA', (W, H), (60, 60, 70, 255)); bg.alpha_composite(sh); bg.resize((W * 6, H * 6), Image.NEAREST).save(f'{D}/preview_{v}_x6.png')
        man['atlases'][f'stairwell_{v}'] = {'file': f, 'w': W, 'h': H}
        for n, im in ims.items():
            fn, anc, ap, ex = PIECES[n]
            a = {'source': 'atlas', 'atlas': f'stairwell_{v}', 'frame': {'x': pos[n][0], 'y': pos[n][1], 'w': im.width, 'h': im.height}, 'anchor': anc, 'anchorPoint': ap(im.width, im.height), 'pixelScale': 1}
            a.update(ex); a['file'] = f'pieces/{v}/{IDS[n][1]}.png'; man['assets'][f'{IDS[n][0]}.{v}'] = a
            os.makedirs(f'{D}/pieces/{v}', exist_ok=True); im.save(f'{D}/pieces/{v}/{IDS[n][1]}.png')
    man['stage'] = {'width': W_ST, 'height': H_ST, 'horizon': HORIZON, 'feetLine': FEET, 'backBase': BACKBASE, 'doorBase': DOORBASE, 'chairRail': RAIL_Y,
        'layout': [{'piece': 'backdrop.stairwell', 'x': 0, 'y': 0, 'tile': 'x', 'tileWidth': 64}, {'piece': 'backdrop.stairwell_floor', 'x': 0, 'y': HORIZON, 'tile': 'x', 'tileWidth': 64}]
                  + [{'piece': IDS[n][0], 'x': x, 'y': y} for n, x, y in LAYOUT]
                  + [{'piece': 'prop.ceiling_bulb_off|prop.ceiling_bulb_on', 'x': BULB_AT[0], 'y': BULB_AT[1], 'anchor': 'topleft (anchorPoint 3,0)', 'variants': ['day/evening (off)', 'night (on, ungraded)']}],
        'light': {'evening': 'light/golden.json', 'night': 'light/soir.json'},
        'ungraded': ['prop.landing_window (pane carries its own sky)', 'prop.ceiling_bulb_on (night emitter)', 'prop.minuterie_on (night)'],
        'depthLayers': {'0': 'wall + floor (tiled)', '1': 'wall pieces: pipe, notice board, mailboxes, window, wall lamp, minuterie, bulb', '2': 'doors, stairs, radiator',
                        '3': 'doormats, plant, parcel', '4': 'cast + cat on feetLine (or stair step slots), sorted by feet y', '5': 'hand props', '6': 'light multiply + add (graded layers only), cast reduced'}}
    json.dump(man, open(f'{D}/manifest.json', 'w'), indent=1); return sheets
def stage(v, ims):
    s = Image.new('RGBA', (W_ST, H_ST), (0, 0, 0, 0))
    for x in range(0, W_ST, 64): s.alpha_composite(ims['wall'], (x, 0)); s.alpha_composite(ims['floor'], (x, HORIZON))
    for n, x, y in LAYOUT:
        if n == 'window': continue
        im = ims[n]; a = PIECES[n][2](im.width, im.height); s.alpha_composite(im, (x - a['x'], y - a['y']))
    if v != 'night': s.alpha_composite(ims['bulb_off'], (BULB_AT[0] - 3, BULB_AT[1]))
    return s
def emitters(v, ims, s):   # ungraded: window pane always; bulb + minuterie glow at night
    w = ims['window']; s.alpha_composite(w, (133 - w.width // 2, 77 - w.height + 1))
    if v == 'night': s.alpha_composite(ims['bulb_on'], (BULB_AT[0] - 3, BULB_AT[1])); m = ims['minut_on']; s.alpha_composite(m, (95 - m.width // 2, 108 - m.height + 1))
WIN = (122, 48, 143, 77)
# ---------- light ----------
def lightmap(v):
    yy, xx = np.indices((H_ST, W_ST)).astype(float); M = np.ones((H_ST, W_ST, 3)); A = np.zeros((H_ST, W_ST, 3)); lamps = []; extra = {}
    def ell(cx, cy, rx, ry): return np.hypot((xx - cx) / rx, (yy - cy) / ry)
    if v == 'night':
        M[:] = COOL_T * 1.25
        WA = np.array([255, 150, 50]) / 255.0
        # rev2: soft source-centred light. multiply: 4 small dithered steps of warm lift on wall + door + cast below the bulb (never above the glass)
        below = yy >= BULB_C[1] + 3
        lift = steps(ell(BULB_C[0], 128, 40, 34), 1.0, 3, False) * below
        M += (0.42 * lift)[..., None] * (WARM * 1.1 - M)
        # add: floor pool = dithered 4-step ellipse under the bulb; gentle wall falloff (max 22) on the wall surface below the bulb; no in-air glow
        fe = ell(BULB_C[0] - 4, FEET - 1, 36, 7); fl = steps(fe, 1.0, 4, True) * 64 * (yy >= HORIZON)
        we = ell(BULB_C[0], 116, 30, 22); wl = steps(we, 1.0, 3, False) * 22 * below * (yy < HORIZON)
        A += np.maximum(fl, wl)[..., None] * WA
        lamps.append({'id': 'ceiling_bulb', 'x': BULB_C[0], 'y': BULB_C[1], 'shape': 'rev2: add = floor pool 4 dithered steps up to 64 (ellipse 36x7 centred x100 at feetLine-1) + wall falloff 3 flat ordered bands up to 22 (rev2.1: no checker dither on the wall) (ellipse 30x22 centred x104 y116), only below the bulb glass; multiply = 3 flat soft bands warm lift 0.42 (ellipse 40x34 centred x104 y128) below the bulb. No in-air glow, no rectangles.'})
        # (moon shaft tried and removed: on the teal base it read as a grey block on the stairs; the ungraded window carries the outside light)
        extra['minuterie'] = {'x': 95, 'y': 105, 'note': 'minuterie_on drawn ungraded at night (tiny orange-gold glow), timer cue for the bulb'}
    elif v == 'evening':
        base = np.array([0.86, 0.78, 0.70]); corner = steps(np.abs(xx - 96), 96.0, 3, False)
        M[:] = base * (0.72 + 0.28 * corner[..., None])
        u = xx - 133 + (yy - 78) * 0.7                      # low sun through the landing window: warm patch down-left on the stairs + landing
        patch = (np.abs(u) <= 10) & (yy > 78) & (yy <= 143)
        M += (0.8 * patch)[..., None] * (np.array([1.2, 1.02, 0.72]) - M)
        lamps.append({'id': 'sun_patch', 'shape': 'skewed window patch on stairs + landing, multiply only', 'color': [1.2, 1.02, 0.72]})
    extra['window'] = {'x': WIN[0], 'y': WIN[1], 'w': WIN[2] - WIN[0] + 1, 'h': WIN[3] - WIN[1] + 1, 'note': 'pane ungraded (own sky)'}
    M = np.clip(M, 0, CAP); return M, lamps, extra, np.clip(A, 0, 254)
def write_light(v, M, lamps, extra, A):
    os.makedirs(f'{D}/light', exist_ok=True)
    Image.fromarray(np.clip(M * 127.5, 0, 255).astype('uint8'), 'RGB').save(f'{D}/light/{v}_multiplier_half.png')
    j = {'multiply': {'src': f'light/{v}_multiplier_half.png', 'decode': 'x2 (= map*127.5)', 'cool': COOL.tolist(), 'cool_used': COOL_T.tolist(),
                      'deviation': 'night base hue nudged toward teal, same as kitchen soir.json', 'warm': WARM.tolist(), 'cap': CAP, 'lamps': lamps, **extra,
                      'ungraded': ['prop.landing_window', 'prop.ceiling_bulb_on', 'prop.minuterie_on'], 'cast': 'same map at strength 0.25 when <1, 0.6 when >1'}}
    if v == 'night' and A.max() > 0:
        Image.fromarray((A / 2).astype('uint8'), 'RGB').save(f'{D}/light/{v}_add_half.png')
        j['add'] = {'src': f'light/{v}_add_half.png', 'decode': 'x2 (= value*2, 0..254 per channel)', 'blend': 'additive (linear dodge)',
                    'order': 'out = clamp(src * multiply + add); multiply first, then add', 'cast': 'add at 0.6 strength on cast pixels'}
    json.dump(j, open(f'{D}/light/{"soir" if v == "night" else "golden"}.json', 'w'), indent=1)
CAST_WIDE = [('lefevre.stand', 22, FEET, False), ('martin.stand', 46, FEET + 1, False), ('noe.stand', 72, FEET, False), ('camille.stand', 92, FEET, True), ('croissant.stand', 120, FEET, True)]
CAST_MED = [('martin.stand', 56, FEET + 1, False), ('noe.stand', 74, FEET, False), ('croissant.stand', 90, FEET, True), ('camille.stand', 108, FEET, True)]
CAST_CLOSE = [('noe.stand', 74, FEET, False), ('croissant.stand', 89, FEET, True), ('camille.stand', 102, FEET, True)]
CAMERAS = {'wide': (8, (2, 12), CAST_WIDE), 'medium': (12, (44, 56), CAST_MED), 'close': (18, (60, 85), CAST_CLOSE)}
def scene(v, ims, cast):
    room = stage(v, ims); castl = Image.new('RGBA', room.size, (0, 0, 0, 0))
    for n, x, y, fl in cast: put(castl, n, x, y, fl)
    if v != 'day':
        M, _, _, A = lightmap(v); room = grade(room, M, 1.0, A); castl = grade(castl, M, 0.25, A, 0.6)
    emitters(v, ims, room); room.alpha_composite(castl); return room
def portrait(v, ims, mode, cam):
    K, CAM, cast = CAMERAS[cam]; sc = scene(v, ims, cast); W, H = -(-1080 // K), -(-1056 // K)
    view = sc.crop((CAM[0], CAM[1], CAM[0] + W, CAM[1] + H)).resize((W * K, H * K), Image.NEAREST).crop((0, 0, 1080, 1056))
    out = Image.new('RGBA', (1080, 1920), (0, 0, 0, 255)); out.alpha_composite(view, (0, 288))
    top = sc.getpixel((60, 30)); floorc = sc.getpixel((CAM[0] + 1, 143))
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
    if mode == 'game': out.alpha_composite(Image.new('RGBA', (1080, 288), top), (0, 0)); band(1344, 1920, floorc, dim(floorc, 0.85))
    else: band(0, 288, top, dim(top, 0.8)); out.alpha_composite(Image.new('RGBA', (1080, 576), floorc), (0, 1344))
    return out
def composites(sheets):
    for v in VARIANTS:
        ims = sheets[v]; write_light(v, *lightmap(v)) if v != 'day' else None
        s = scene(v, ims, CAST_WIDE); s.save(f'{D}/stage_{v}_x1.png'); s.resize((W_ST * 6, H_ST * 6), Image.NEAREST).save(f'{D}/stage_{v}_x6.png')
        s.crop((0, 64, 192, 144)).resize((1920, 800), Image.NEAREST).save(f'{D}/composite_landscape_{v}.png')
        for cam in CAMERAS:
            for mode in ('game', 'shorts'):
                o = portrait(v, ims, mode, cam); o.save(f'{D}/composite_{cam}_{mode}_{v}_1080x1920.png'); o.resize((180, 320), Image.LANCZOS).save(f'{D}/composite_{cam}_{mode}_{v}_small.png')
if __name__ == '__main__':
    composites(build()); print('built', VARIANTS)
