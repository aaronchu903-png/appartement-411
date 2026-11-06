"""L'Appartement 411 canonical sprites, style B (22 px people, cat 10 px). Original code art, $0.
Run: python3 gen_canonical.py  -> sheets, manifest.json, x30/ layers, lineup_phone.png, guide_img/."""
from PIL import Image, ImageDraw, ImageFont
import json, os
OUT = os.path.dirname(os.path.abspath(__file__))
GUIDE = os.path.join(OUT, '..', 'guide_img')
PAL = {  # role -> hex (the whole game/shorts palette)
 'skin':'#f1c7a5','skin_sh':'#c98e6b','dark':'#22303a','mouth':'#b04a3a','red_sh':'#8a3328',
 'noe_hair':'#7a4a22','orange':'#e2873a','orange_sh':'#b8642a','cream':'#f4efe6',
 'cam_hair':'#3b2a20','green':'#2f7d5b','green_sh':'#24624a','navy':'#2f4060','navy_sh':'#2c3555',
 'grey':'#9a9aa2','silver':'#c4c4cc','gold':'#d9a441','plum':'#7a4a6e','plum_sh':'#5e3656',
 'pink':'#e79aa0','white':'#ffffff','ink':'#4a3328',
 'wall':'#eddfc2','wall_sh':'#d8c39a','floor':'#b2936e','floor_sh':'#a68968','wood':'#885939'}
def C(k): h = PAL[k]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
HW, HH = 16, 24; HANCHOR = (8, 23)     # humans: feet = bottom of shoe row 22
CW, CH = 14, 12; CANCHOR = (6, 11)     # cat: feet = bottom of paw row 10

class L:
    def __init__(s, w=HW, h=HH): s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    def r(s, x0, y0, x1, y1, k):
        for x in range(x0, x1+1):
            for y in range(y0, y1+1): s.im.putpixel((x, y), C(k))
        return s
    def p(s, pts, k):
        for x, y in pts: s.im.putpixel((x, y), C(k))
        return s
def comp(*ims, size=(HW, HH)):
    o = Image.new('RGBA', size, (0, 0, 0, 0))
    for im in ims:
        if im is not None: o.alpha_composite(im)
    return o
def shift(im, dx, dy):
    o = Image.new('RGBA', im.size, (0, 0, 0, 0)); o.alpha_composite(im, (max(dx, 0), max(dy, 0)), (max(-dx, 0), max(-dy, 0))); return o

# ---------- faces (eyes at cols 6 and 9; e = top eye row; mouth row = e+3) ----------
def face_layers(e, w=HW, h=HH):
    m = e + 3; F = {}
    def mk(eyes, mouth):
        a = L(w, h); b = L(w, h)
        for (x, y, k) in eyes: a.im.putpixel((x, y), C(k))
        for (x, y, k) in mouth: b.im.putpixel((x, y), C(k))
        return a.im, b.im
    D = 'dark'
    F['neutral'] = mk([(6,e,D),(6,e+1,D),(9,e,D),(9,e+1,D)], [(7,m,'mouth'),(8,m,'mouth')])
    F['happy'] = mk([(5,e+1,D),(6,e,D),(7,e+1,D),(8,e+1,D),(9,e,D),(10,e+1,D),(5,e+2,'pink'),(10,e+2,'pink')],
                    [(6,m,'mouth'),(7,m+1,'mouth'),(8,m+1,'mouth'),(9,m,'mouth')])
    F['sad'] = mk([(6,e+1,D),(9,e+1,D),(6,e-1,'skin_sh'),(5,e,'skin_sh'),(9,e-1,'skin_sh'),(10,e,'skin_sh')],
                  [(6,m+1,'mouth'),(7,m,'mouth'),(8,m,'mouth'),(9,m+1,'mouth')])
    F['shocked'] = mk([(6,e,D),(6,e+1,D),(9,e,D),(9,e+1,D),(6,e-1,'skin_sh'),(9,e-1,'skin_sh')],
                      [(7,m,D),(8,m,D),(7,m+1,D),(8,m+1,D)])
    F['big-eyes'] = mk([(5,e,'white'),(6,e,D),(5,e+1,D),(6,e+1,D),(9,e,'white'),(10,e,D),(9,e+1,D),(10,e+1,D)],
                       [(7,m,'mouth'),(8,m,'mouth')])
    F['blink'] = mk([(5,e+1,D),(6,e+1,D),(9,e+1,D),(10,e+1,D)], [(7,m,'mouth'),(8,m,'mouth')])
    F['talk_0'] = mk([(6,e,D),(6,e+1,D),(9,e,D),(9,e+1,D)], [(7,m,D),(8,m,D)])
    F['talk_1'] = mk([(6,e,D),(6,e+1,D),(9,e,D),(9,e+1,D)], [(7,m,D),(8,m,D),(7,m+1,'mouth'),(8,m+1,'mouth')])
    F['brow_raise'] = mk([(6,e,D),(6,e+1,D),(9,e,D),(9,e+1,D),(5,e-1,'ink'),(6,e-1,'ink'),(9,e-2,'ink'),(10,e-2,'ink')], [(7,m,'mouth'),(8,m,'mouth')])
    return F

# ---------- arms: pose -> (left pixels, right pixels); s = shoulder col left, sleeve colour, hand rows ----------
def arm_layers(sl, sr, top, sleeve, e=6):
    """sl/sr shoulder cols, top = shoulder row. Hands are 1x2 skin."""
    t = top; A = {}
    def side(pts_sleeve, pts_hand, mirror):
        a = L()
        for x, y in pts_sleeve:
            a.im.putpixel((mirror(x), y), C(sleeve))
        for x, y in pts_hand: a.im.putpixel((mirror(x), y), C('skin'))
        return a.im
    # defined for the LEFT arm (screen left, shoulder col sl); right = mirror around canvas centre
    poses = {
     'down':  ([(sl,t),(sl,t+1),(sl,t+2),(sl,t+3)], [(sl,t+4),(sl,t+5)]),
     'wave':  ([(sl,t),(sl-1,t-1),(sl-1,t-2)], [(sl-1,t-3),(sl-1,t-4),(sl-2,t-4)]),
     'point': ([(sl,t),(sl-1,t+1)], [(sl-2,t+1),(sl-2,t)]),
     'hips':  ([(sl,t),(sl-1,t+1),(sl-1,t+2)], [(sl,t+3),(sl+1,t+3)]),
     'chest': ([(sl,t),(sl,t+1),(sl+1,t+2)], [(sl+2,t+1),(sl+3,t+1)]),
     'hold':  ([(sl,t),(sl,t+1),(sl,t+2),(sl-1,t+3)], [(sl-1,t+4),(sl-2,t+4)]),
    }
    fp = [(sl, t)]; x, y = sl, t
    while y > e + 2: x = min(x + 1, 5); y -= 1; fp.append((x, y))
    poses['facepalm'] = (fp, [(5, e+1), (6, e+1), (6, e)])   # hand over the eye on its own side
    hand = {}
    for name, (sv, hd) in poses.items():
        A[('arm_l', name)] = side(sv, hd, lambda x: x)
        A[('arm_r', name)] = side(sv, hd, lambda x: (sl + sr) - x)
        hand[('arm_l', name)] = hd[-1]; hand[('arm_r', name)] = ((sl+sr)-hd[-1][0], hd[-1][1])
    return A, hand

# ---------- characters ----------
def noe():
    H = L().r(3,2,12,3,'noe_hair').p([(4,1),(6,1),(8,1),(10,1),(5,1),(9,1)],'noe_hair')
    H.r(4,4,11,9,'skin').r(5,10,10,10,'skin').r(3,4,3,6,'noe_hair').r(12,4,12,6,'noe_hair')
    H.p([(4,4),(5,4),(8,4),(9,4),(11,4)],'noe_hair').p([(3,7),(12,7)],'skin_sh').p([(4,9),(11,9)],'skin_sh')
    B = L().r(4,11,11,15,'orange').r(6,11,9,15,'cream').p([(5,13),(10,13)],'orange_sh').p([(6,11),(9,11)],'orange')
    G = L().r(4,16,11,16,'orange_sh').r(5,17,6,21,'orange_sh').r(9,17,10,21,'orange_sh').r(4,22,6,22,'dark').r(9,22,11,22,'dark')
    scarf = L().r(5,11,10,11,'gold').p([(9,12),(9,13)],'gold').p([(10,12)],'orange_sh').im
    return dict(head=H.im, body=B.im, legs=G.im, sl=3, sr=12, top=11, sleeve='orange', e=6, extra={'scarf': scarf}, hip=16)
def camille():
    H = L().r(5,1,10,1,'cam_hair').r(4,2,11,2,'cam_hair').r(3,3,12,3,'cam_hair')
    H.r(4,4,11,9,'skin').r(5,10,10,10,'skin').r(3,4,3,11,'cam_hair').r(12,4,12,11,'cam_hair').r(4,4,7,4,'cam_hair').p([(4,5),(11,4)],'cam_hair')
    H.p([(4,9),(11,9)],'skin_sh')
    B = L().r(4,11,11,15,'green').p([(6,11),(7,11),(8,11),(9,11)],'green').p([(7,11),(8,11)],'skin').p([(5,14),(10,14),(4,15),(11,15)],'green_sh')
    G = L().r(4,16,11,16,'navy_sh').r(5,17,6,21,'navy_sh').r(9,17,10,21,'navy_sh').r(4,22,6,22,'dark').r(9,22,11,22,'dark')
    return dict(head=H.im, body=B.im, legs=G.im, sl=3, sr=12, top=11, sleeve='green', e=6, extra={}, hip=16)
def martin():  # 21 px (rows 2-22), rounder: coat cols 3-12
    H = L().r(5,2,10,2,'ink').r(4,3,11,3,'ink').r(3,4,12,4,'ink').r(4,5,11,10,'skin').r(5,11,10,11,'skin')
    H.r(3,5,3,10,'ink').r(12,5,12,10,'ink').r(4,5,11,5,'ink').p([(4,6),(11,6)],'ink').p([(4,3),(4,4),(5,4),(3,5)],'grey')
    H.p([(4,10),(11,10)],'skin_sh').p([(3,11),(12,11)],'ink')
    B = L().r(4,12,11,12,'navy').r(3,13,12,17,'navy').r(5,12,10,12,'mouth').p([(6,13),(6,14)],'mouth').p([(7,13)],'red_sh')
    B.p([(9,14)],'gold').p([(3,17),(12,17),(4,16),(11,16)],'navy_sh')
    G = L().r(4,18,11,18,'navy').p([(4,18),(11,18)],'navy_sh').r(5,19,6,21,'navy_sh').r(9,19,10,21,'navy_sh').r(4,22,6,22,'dark').r(9,22,11,22,'dark')
    return dict(head=H.im, body=B.im, legs=G.im, sl=2, sr=13, top=13, sleeve='navy', e=7, extra={}, hip=18)
def lefevre():  # grey bun, glasses, plum cardigan; 22 px incl. bun
    H = L().r(7,1,8,1,'silver').r(5,2,10,2,'silver').r(4,3,11,3,'silver').r(4,4,11,9,'skin').r(5,10,10,10,'skin')
    H.r(3,3,3,8,'silver').r(12,3,12,8,'silver').r(4,4,11,4,'silver').p([(7,1),(8,2),(3,8),(12,8)],'grey').p([(4,9),(11,9)],'skin_sh')
    B = L().r(4,11,11,15,'plum').r(7,11,8,13,'cream').p([(6,14),(9,14)],'plum_sh')
    G = L().r(4,16,11,19,'plum_sh').r(5,20,6,21,'skin_sh').r(9,20,10,21,'skin_sh').r(4,22,6,22,'dark').r(9,22,11,22,'dark')
    glasses = L().p([(5,6),(7,6),(8,6),(10,6),(5,7),(10,7)],'grey').im
    return dict(head=H.im, body=B.im, legs=G.im, sl=3, sr=12, top=11, sleeve='plum', e=6, extra={}, hip=16, glasses=glasses)

CHARS = {'noe': noe(), 'camille': camille(), 'martin': martin(), 'lefevre': lefevre()}

def lift_leg(legs, side, hip):
    """front-side walk: one leg half rises 1 px (set C convention: leg lift 1 px)."""
    o = legs.copy(); x0, x1 = (0, 8) if side == 'l' else (8, 16)
    part = legs.crop((x0, hip+1, x1, HH)); clear = Image.new('RGBA', part.size, (0, 0, 0, 0))
    o.paste(clear, (x0, hip+1)); o.alpha_composite(part, (x0, hip)); return o

def back_noe():
    H = L().r(3,2,12,9,'noe_hair').p([(4,1),(5,1),(6,1),(8,1),(9,1),(10,1)],'noe_hair').r(6,10,9,10,'skin_sh').p([(3,7),(12,7)],'skin_sh')
    B = L().r(4,11,11,15,'orange').r(7,12,8,15,'orange_sh').p([(5,11),(10,11)],'orange_sh')
    return H.im, B.im
def back_camille():
    H = L().r(5,1,10,1,'cam_hair').r(4,2,11,2,'cam_hair').r(3,3,12,11,'cam_hair')
    B = L().r(4,11,11,15,'green').p([(4,15),(11,15),(7,14),(8,14)],'green_sh')
    return H.im, B.im
BACK = {'noe': back_noe(), 'camille': back_camille()}

frames = {}   # name -> (image, anchor, size kind)
seqs = {}; hands = {}
for name, ch in CHARS.items():
    A, hd = arm_layers(ch['sl'], ch['sr'], ch['top'], ch['sleeve'], ch['e'])
    F = face_layers(ch['e']); ch['faces'] = F; ch['arms'] = A
    shadow = L().r(3, 23, 12, 23, 'wood').im; sh = shadow.copy(); sh.putalpha(sh.getchannel('A').point(lambda a: 90 if a else 0)); ch['shadow'] = sh
    gl = ch.get('glasses')
    def full(legs=None, al='down', ar='down', face='neutral', up=0, extra=(), ch=ch, A=A, F=F, gl=gl):
        al_im = shift(A[('arm_l', al)], 0, -up); ar_im = shift(A[('arm_r', ar)], 0, -up)
        ims = [ch['shadow'], legs or ch['legs'], ch['body'], al_im, ar_im] + [ch['extra'][e] for e in extra] + [ch['head'], F[face][0], F[face][1], gl]
        if {al, ar} & {'chest', 'facepalm'}: ims = [ch['shadow'], legs or ch['legs'], ch['body']] + [ch['extra'][e] for e in extra] + [ch['head'], F[face][0], F[face][1], gl, al_im, ar_im]
        return comp(*ims)
    ch['full'] = full
    frames[f'{name}.idle.0'] = full(); frames[f'{name}.idle.1'] = full(up=1)
    frames[f'{name}.stand'] = full()
    walk = [ch['legs'], lift_leg(ch['legs'], 'l', ch['hip']), ch['legs'], lift_leg(ch['legs'], 'r', ch['hip'])]
    arms_walk = [('down','down'), ('down','down'), ('down','down'), ('down','down')]
    for i, lg in enumerate(walk):
        # arm on the side opposite the lifted leg swings up 1 px
        fr = full(legs=lg)
        if i in (1, 3):
            fr = comp(ch['shadow'], lg, ch['body'], shift(A[('arm_l','down')],0,-1 if i==3 else 0), shift(A[('arm_r','down')],0,-1 if i==1 else 0), ch['head'], F['neutral'][0], F['neutral'][1], gl)
        frames[f'{name}.walk.{i}'] = fr
    seqs[f'{name}.idle'] = ([f'{name}.idle.0', f'{name}.idle.1'], 2)
    seqs[f'{name}.walk'] = ([f'{name}.walk.{i}' for i in range(4)], 8)
    for fn, (ey, mo) in F.items(): frames[f'{name}.face.{fn}'] = comp(ey, mo)
    frames[f'{name}.base.noarms'] = comp(ch['shadow'], ch['legs'], ch['body'], ch['head'], gl)
    for (side, pose), im in A.items():
        frames[f'{name}.{side}.{pose}'] = im; hands[f'{name}.{side}.{pose}'] = hd[(side, pose)]
    for e, im in ch['extra'].items(): frames[f'{name}.overlay.{e}'] = im
    if gl is not None: frames[f'{name}.overlay.glasses'] = gl
    frames[f'{name}.shadow'] = ch['shadow']
    frames[f'{name}.pose.facepalm'] = full(ar='facepalm', face='sad')
    if name in BACK:
        bh, bb = BACK[name]
        bfull = lambda legs=None, up=0: comp(ch['shadow'], legs or ch['legs'], bb, shift(A[('arm_l','down')],0,-up), shift(A[('arm_r','down')],0,-up), bh)
        frames[f'{name}.back_stand'] = bfull(); frames[f'{name}.back_idle.0'] = bfull(); frames[f'{name}.back_idle.1'] = bfull(up=1)
        for i, lg in enumerate(walk):
            fr = bfull(legs=lg)
            if i in (1, 3): fr = comp(ch['shadow'], lg, bb, shift(A[('arm_l','down')],0,-1 if i==3 else 0), shift(A[('arm_r','down')],0,-1 if i==1 else 0), bh)
            frames[f'{name}.back_walk.{i}'] = fr
        seqs[f'{name}.back_idle'] = ([f'{name}.back_idle.0', f'{name}.back_idle.1'], 2)
        seqs[f'{name}.back_walk'] = ([f'{name}.back_walk.{i}' for i in range(4)], 8)
# Martin body poses
m = CHARS['martin']; mf = m['full']
frames['martin.pose.proud'] = shift(mf(al='down', ar='chest', face='happy'), 0, 0)
sig = comp(m['shadow'], m['legs'], shift(comp(m['body'], m['arms'][('arm_l','down')], m['arms'][('arm_r','down')]), 0, 1), shift(comp(m['head'], m['faces']['sad'][0], m['faces']['sad'][1]), 0, 2))
frames['martin.pose.sigh'] = sig
frames['martin.pose.hips'] = mf(al='hips', ar='hips', face='neutral')
frames['martin.pose.wave'] = mf(ar='wave', face='happy')
frames['martin.pose.scold'] = mf(al='hips', ar='point', face='shocked')

# ---------- Croissant ----------
def cat_parts():
    T = L(CW, CH).p([(11,3),(11,4),(12,2),(11,5),(11,6),(11,7)], 'orange').p([(12,2)], 'orange_sh')
    T_up = L(CW, CH).p([(11,6),(11,5),(12,4),(12,3),(12,2),(11,1)], 'orange')
    B = L(CW, CH).r(2,7,10,9,'orange').p([(3,8),(5,8),(7,8),(9,8)],'orange_sh').p([(10,7)],'orange_sh')
    H = L(CW, CH).p([(1,1),(8,1)],'orange').r(1,2,2,2,'orange').r(7,2,8,2,'orange').p([(2,2),(7,2)],'pink')
    H.r(1,3,8,6,'orange').r(2,7,7,7,'orange').p([(4,6),(5,6)],'pink').p([(4,3),(5,3)],'orange_sh').p([(1,6),(8,6)],'orange_sh')
    feet = {k: L(CW, CH).p([(x, 10)], 'orange').im for k, x in [('fl',2),('fr',4),('bl',7),('br',9)]}
    return T.im, T_up.im, B.im, H.im, feet
CT, CTU, CB, CHd, CF = cat_parts()
def cat_face():
    D = 'dark'; F = {}
    def mk(pts): a = L(CW, CH); [a.im.putpixel((x, y), C(k)) for x, y, k in pts]; return a.im
    F['neutral'] = mk([(3,4,D),(3,5,D),(6,4,D),(6,5,D)])
    F['happy'] = mk([(2,5,D),(3,4,D),(4,5,D),(5,5,D),(6,4,D),(7,5,D)])
    F['sad'] = mk([(3,5,D),(6,5,D),(2,4,'orange_sh'),(7,4,'orange_sh'),(4,7,'orange_sh'),(5,7,'orange_sh')])
    F['shocked'] = mk([(3,4,D),(3,5,D),(6,4,D),(6,5,D),(4,7,D),(5,7,D)])
    F['big-eyes'] = mk([(2,4,'white'),(3,4,D),(2,5,D),(3,5,D),(6,4,'white'),(7,4,D),(6,5,D),(7,5,D)])
    F['blink'] = mk([(2,5,D),(3,5,D),(6,5,D),(7,5,D)])
    F['chew'] = mk([(3,4,D),(3,5,D),(6,4,D),(6,5,D),(4,7,D),(5,7,'pink')])
    F['brow_raise'] = mk([(3,4,D),(3,5,D),(6,4,D),(6,5,D),(2,3,'orange_sh'),(3,3,'orange_sh'),(6,3,'orange_sh'),(7,3,'orange_sh'),(1,0,'orange'),(8,0,'orange')])  # brows up + ear tips perk 1 px
    return F
CFACE = cat_face()
cshadow = L(CW, CH).r(1, 11, 11, 11, 'wood').im; cshadow.putalpha(cshadow.getchannel('A').point(lambda a: 90 if a else 0))
def cat(feet=('fl','fr','bl','br'), tail=None, face='neutral', bob=0):
    up = comp(CB, CHd, CFACE[face], size=(CW, CH))
    return comp(cshadow, tail or CT, *[CF[f] for f in feet], shift(up, 0, -bob), size=(CW, CH))
frames['croissant.idle.0'] = cat(); frames['croissant.idle.1'] = cat(tail=shift(CT, 0, 1)); frames['croissant.stand'] = cat(); frames['croissant.sit'] = cat()
frames['croissant.walk.0'] = cat(); frames['croissant.walk.1'] = cat(feet=('fr','bl')); frames['croissant.walk.2'] = cat(); frames['croissant.walk.3'] = cat(feet=('fl','br'))
frames['croissant.tail_up'] = cat(tail=CTU)
for fn, im in CFACE.items(): frames[f'croissant.face.{fn}'] = im
frames['croissant.base.noface'] = comp(cshadow, CT, *CF.values(), CB, CHd, size=(CW, CH))
seqs['croissant.idle'] = (['croissant.idle.0', 'croissant.idle.1'], 2)
seqs['croissant.walk'] = ([f'croissant.walk.{i}' for i in range(4)], 8)

# ---------- sheets + manifest (SPRITE_MANIFEST_FORMAT.md) ----------
man = {'assetRoot': '', 'atlases': {}, 'assets': {}}
for who in ['noe', 'camille', 'martin', 'lefevre', 'croissant']:
    names = [n for n in frames if n.startswith(who + '.')]
    w, h = (CW, CH) if who == 'croissant' else (HW, HH); cols = 8; rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * w, rows * h), (0, 0, 0, 0))
    man['atlases'][who] = {'file': f'{who}_sheet.png', 'w': cols * w, 'h': rows * h}
    anc = CANCHOR if who == 'croissant' else HANCHOR
    for i, n in enumerate(names):
        x, y = (i % cols) * w, (i // cols) * h; sheet.alpha_composite(frames[n], (x, y))
        a = {'source': 'atlas', 'atlas': who, 'frame': {'x': x, 'y': y, 'w': w, 'h': h}, 'anchor': 'feet', 'anchorPoint': {'x': anc[0], 'y': anc[1]}, 'pixelScale': 1}
        if n in hands: a['handPoint'] = {'x': hands[n][0], 'y': hands[n][1]}
        man['assets'][n] = a
    sheet.save(f'{OUT}/{who}_sheet.png')
for s, (fr, fps) in seqs.items(): man['assets'][s] = {'type': 'sequence', 'frames': fr, 'fps': fps}
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)
json.dump(PAL, open(f'{OUT}/palette.json', 'w'), indent=1)

# ---------- x30 layers (set C style split: head/body/legs/arm_l/arm_r/shadow/face/eyes_*, mouth_*) ----------
def up(im, k=30): return im.resize((im.width * k, im.height * k), Image.NEAREST)
for name, ch in CHARS.items():
    d = f'{OUT}/x30/{name}'; os.makedirs(f'{d}/face', exist_ok=True); os.makedirs(f'{d}/arms', exist_ok=True)
    for k in ['head', 'body', 'legs', 'shadow']: up(ch[k]).save(f'{d}/{k}.png')
    up(ch['arms'][('arm_l','down')]).save(f'{d}/arm_l.png'); up(ch['arms'][('arm_r','down')]).save(f'{d}/arm_r.png')
    for (side, pose), im in ch['arms'].items(): up(im).save(f'{d}/arms/{pose}_{side}.png')
    for fn, (ey, mo) in ch['faces'].items(): up(ey).save(f'{d}/face/eyes_{fn}.png'); up(mo).save(f'{d}/face/mouth_{fn}.png')
    for e, im in ch['extra'].items(): up(im).save(f'{d}/{e}.png')
    if ch.get('glasses') is not None: up(ch['glasses']).save(f'{d}/glasses.png')
d = f'{OUT}/x30/croissant'; os.makedirs(f'{d}/face', exist_ok=True)
for k, im in {'head': CHd, 'body': CB, 'tail': CT, 'tail_up': CTU, 'shadow': cshadow, 'legs': comp(*CF.values(), size=(CW, CH))}.items(): up(im).save(f'{d}/{k}.png')
for fn, im in CFACE.items(): up(im).save(f'{d}/face/eyes_{fn}.png')

for name in BACK:
    os.makedirs(f'{OUT}/back/x1', exist_ok=True); os.makedirs(f'{OUT}/back/x30', exist_ok=True)
    for n in [k for k in frames if k.startswith(name + '.back_')]:
        frames[n].save(f'{OUT}/back/x1/{n}.png'); up(frames[n]).save(f'{OUT}/back/x30/{n}.png')

# ---------- backdrop + lineup ----------
BW, BHt, FLOOR = 80, 170, 128   # native; horizon row 128; feet line row 136
def backdrop():
    b = L(BW, BHt).r(0, 0, BW-1, FLOOR-1, 'wall').r(0, FLOOR, BW-1, BHt-1, 'floor')
    for x in range(2, BW, 6): b.r(x, FLOOR+1, x, BHt-1, 'floor_sh')
    b.r(0, FLOOR-2, BW-1, FLOOR-1, 'wood')
    b.r(8, 92, 27, 116, 'wood').r(10, 94, 25, 114, 'white').r(17, 94, 18, 114, 'wood').r(10, 103, 25, 104, 'wood')  # window
    b.r(10, 94, 16, 102, 'wall_sh')
    b.r(50, 100, 62, 109, 'wood').r(51, 101, 61, 108, 'wall_sh').r(53, 103, 59, 106, 'green')  # frame
    b.r(44, 116, 70, 117, 'wood').r(46, 112, 48, 115, 'orange_sh').r(64, 113, 67, 115, 'plum')  # shelf
    return b.im
BG = backdrop()
FEET = 136
def stage(order):
    s = BG.copy()
    for who, ax in order:
        im = frames[f'{who}.idle.0'] if who != 'croissant' else frames['croissant.idle.0']
        anc = CANCHOR if who == 'croissant' else HANCHOR
        s.alpha_composite(im, (ax - anc[0], FEET - anc[1]))
    return s
ORDER = [('noe', 8), ('camille', 21), ('martin', 35), ('croissant', 50), ('lefevre', 66)]
# expressions for the lineup
frames_bak = dict(frames)
st = stage(ORDER)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def bubble(img, text, tip, scale, above=10):
    d = ImageDraw.Draw(img); scale = 22; f = ImageFont.truetype(FONT, 56)
    tw = d.textlength(text, font=f); pad = int(scale * 1.2); bw, bh = tw + 2 * pad, 56 + 2 * pad
    x0 = max(10, min(img.width - bw - 10, tip[0] - bw / 2)); y0 = tip[1] - above * scale / 3 - bh
    ow = 6
    d.polygon([(tip[0] - scale, y0 + bh - 2), (tip[0] + scale, y0 + bh - 2), (tip[0], tip[1])], fill=PAL['white'], outline=PAL['ink'], width=ow)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=int(scale * 1.2), fill=PAL['white'], outline=PAL['ink'], width=ow)
    d.polygon([(tip[0] - scale + ow, y0 + bh - ow), (tip[0] + scale - ow, y0 + bh - ow), (tip[0], tip[1] - ow * 2)], fill=PAL['white'])
    d.text((x0 + pad, y0 + pad - 6), text, font=f, fill=PAL['ink'])
PW, PH = 1080, 2340
def phone(k, cx, label, bub):
    vw, vh = PW // k + 1, PH // k + 1
    top = max(0, FEET + 18 - vh)
    crop = st.crop((cx - vw // 2, top, cx - vw // 2 + vw, top + vh)).resize((vw * k, vh * k), Image.NEAREST).crop((0, 0, PW, PH)).convert('RGB')
    tipx = (bub[0] - (cx - vw // 2)) * k; tipy = (bub[1] - top) * k
    bubble(crop, 'Bonjour, les enfants !', (int(tipx), int(tipy)), k)
    fr = Image.new('RGB', (PW + 80, PH + 160), '#1e1e24'); fr.paste(crop, (40, 80))
    d = ImageDraw.Draw(fr); d.rounded_rectangle([PW//2-100+40, 30, PW//2+100+40, 55], 12, fill='#333')
    d.text((60, PH + 95), label, font=ImageFont.truetype(FONT, 34), fill='#eee')
    return fr
mid = phone(36, 42, 'MEDIUM  36 px / game px @1080 (13 css px on 390)', (35, FEET - 22))
wide = phone(14, 40, 'WIDE  14 px / game px @1080 (~5 css px on 390)', (35, FEET - 22))
lu = Image.new('RGB', (mid.width * 2 + 60, mid.height), '#f4efe6'); lu.paste(mid, (0, 0)); lu.paste(wide, (mid.width + 60, 0))
lu.save(f'{OUT}/lineup_phone.png'); lu.resize((lu.width // 4, lu.height // 4), Image.LANCZOS).save(f'{OUT}/lineup_phone_small.png')
st.save(f'{OUT}/lineup_native.png')

# ---------- contact sheet x8 for review ----------
def contact(who, k=8):
    sh = Image.open(f'{OUT}/{who}_sheet.png'); bg = Image.new('RGBA', sh.size, C('wall')); bg.alpha_composite(sh)
    return bg.resize((sh.width * k, sh.height * k), Image.NEAREST)
for who in ['noe', 'camille', 'martin', 'lefevre', 'croissant']: contact(who).save(f'{OUT}/review_{who}_x8.png')

# ---------- guide images ----------
os.makedirs(GUIDE, exist_ok=True)
def pane(im, k=10, bg='wall'):
    b = Image.new('RGBA', im.size, C(bg)); b.alpha_composite(im); return b.resize((im.width * k, im.height * k), Image.NEAREST)
cam = frames['camille.idle.0']
pane(cam).save(f'{GUIDE}/do_flat_no_outline.png')
ol = Image.new('RGBA', cam.size, (0,0,0,0)); a = cam.getchannel('A')
for x in range(HW):
    for y in range(HH):
        if not a.getpixel((x, y)) and any(0 <= x+dx < HW and 0 <= y+dy < HH and a.getpixel((x+dx, y+dy)) > 200 for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))): ol.putpixel((x, y), C('dark'))
ol.alpha_composite(cam); pane(ol).save(f'{GUIDE}/dont_outline.png')
b = Image.new('RGBA', cam.size, C('wall')); b.alpha_composite(cam); b.resize((HW*10, HH*10), Image.BILINEAR).save(f'{GUIDE}/dont_smooth_scale.png')
row = Image.new('RGBA', (HW * 6, HH), (0,0,0,0))
for i, fn in enumerate(['neutral','happy','sad','shocked','big-eyes','blink']): row.alpha_composite(frames[f'camille.base.noarms'], (i*HW, 0)); row.alpha_composite(frames[f'camille.face.{fn}'], (i*HW, 0))
pane(row, 8).save(f'{GUIDE}/faces_camille.png')
cr = Image.new('RGBA', (CW * 7, CH), (0,0,0,0))
for i, fn in enumerate(CFACE): cr.alpha_composite(frames['croissant.base.noface'], (i*CW, 0)); cr.alpha_composite(CFACE[fn], (i*CW, 0))
pane(cr, 10).save(f'{GUIDE}/faces_croissant.png')
ar = Image.new('RGBA', (HW * 6, HH), (0,0,0,0))
for i, p in enumerate(['down','wave','point','hips','chest','hold']): ar.alpha_composite(m['full'](al=p if p!='chest' else 'down', ar=p), (i*HW, 0))
pane(ar, 8).save(f'{GUIDE}/arms_martin.png')
fl = Image.new('RGBA', (HW*2+4, HH), C('wall'));
pane(stage(ORDER).crop((0, FEET-30, 80, FEET+6)), 6).save(f'{GUIDE}/do_floor_line.png')
fs = BG.copy(); fs.alpha_composite(frames['camille.idle.0'], (10, FEET-23-3)); fs.alpha_composite(frames['noe.idle.0'], (28, FEET-23+2))
pane(fs.crop((0, FEET-30, 50, FEET+6)), 6).save(f'{GUIDE}/dont_floating.png')
print('frames', len(frames), 'assets', len(man['assets']))
