"""Mockups 390x844 (x2) + 360-wide check, from manifest pieces. Text = DejaVu Sans Bold ink (engine stand-in)."""
import json, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{D}/../../../..')
M = json.load(open(f'{D}/manifest.json'))['assets']; PAL = {k: v for k, v in json.load(open(f'{D}/../../palette.json')).items()}
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FCJK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def P(key):
    a = M[key]
    while a.get('type') == 'ref' and a.get('alias'): a = M[a['alias']]
    return Image.open(f'{D}/{a["file"]}').convert('RGBA'), a
def nine(key, w, h):
    im, a = P(key); ns = a.get('nineSlice')
    if not ns: return im
    l, t, r, b = ns['l'], ns['t'], ns['r'], ns['b']; W, H = im.size; out = Image.new('RGBA', (w, h))
    xs = [(0, l, 0, l), (l, W - r, l, w - r), (W - r, W, w - r, w)]; ys = [(0, t, 0, t), (t, H - b, t, h - b), (H - b, H, h - b, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            if sx1 > sx0 and sy1 > sy0 and dx1 > dx0 and dy1 > dy0:
                out.paste(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST), (dx0, dy0))
    return out
class S:
    def __init__(s, W):
        s.W = W; s.c = Image.new('RGBA', (W, 422), PAL_rgb('cream')); s.txt = []; s.hits = []
    def put(s, key, x, y, w=None, h=None, tap=None):
        im = nine(key, w, h) if w else P(key)[0]
        s.c.alpha_composite(im, (x, y))
        if tap: s.hits.append((tap, x, y, im.size[0], im.size[1]))
        return im.size
    def t(s, x, y, txt, size=14, col='ink', cjk=False): s.txt.append((x, y, txt, size, col, cjk))
    def render(s, name):
        for css in (390, 360):
            W = css // 2
            if W != s.W: continue
        big = s.c.resize((s.W * 2, 844), Image.NEAREST); d = ImageDraw.Draw(big)
        for x, y, txt, size, col, cjk in s.txt:
            d.text((x * 2, y * 2), txt, font=ImageFont.truetype(FCJK if cjk else FB, size), fill=PAL[col])
        css = s.W * 2; scr = Image.new('RGBA', (css, 844), PAL_rgb('cream')); scr.alpha_composite(big, ((css - big.size[0]) // 2, 0))
        scr.convert('RGB').save(f'{D}/mockups/{name}_{css}.png')
        return [(n, w, h, 'OK' if w >= 22 and h >= 22 else 'SMALL') for n, x, y, w, h in s.hits]
def PAL_rgb(n): v = PAL[n]; return tuple(int(v[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def stage(s, f='rooftop/composite_landscape_evening.png', y=22):
    im = Image.open(f'{ROOT}/style/canonical/sets/{f}').convert('RGBA').resize((192, 80), Image.NEAREST)
    s.c.alpha_composite(im.crop(((192 - s.W) // 2 if s.W < 192 else 0, 0, min(192, (192 + s.W) // 2) if s.W < 192 else 192, 80)), (max(0, (s.W - 192) // 2), y))
def topbar(s, label=None):
    s.put('ui.top_bar.idle', 0, 0, s.W, 22); s.put('ui.exit.idle', 2, 0, tap='exit')
    if label: s.t(26, 4, label, 13)
REPORT = {}
for W in (195, 180):
    css = W * 2; IW = 168; X0 = (W - IW) // 2  # §10b: panels 168 at every width
    # 1 start
    s = S(W); s.put('ui.start_choice_big.idle', X0, 250, IW, 40, tap='De zéro'); s.put('ui.start_choice_big.art', 10, 254)
    s.t(46, 260, 'De zéro', 16, 'cream'); s.put('ui.start_choice_small.idle', X0, 296, IW, 28, tap='Je connais un peu')
    s.t(X0 + 6, 302, 'Je connais un peu le français', 13); s.t(8, 190, 'Ton prénom', 14)
    s.put('ui.name_field.focus', X0, 206, IW, 24, tap='name'); s.t(X0 + 6, 211, 'Jinyi', 14)
    s.c.alpha_composite(P('ui.placement_result.facade')[0].crop((0, 0, min(172, W), 40)), ((W - min(172, W)) // 2, 60))
    REPORT[f'start_{css}'] = s.render('start')
    # 2 placement result
    s = S(W); topbar(s); s.put('ui.panel.idle', X0, 40, IW, 150) if True else s.put('ui.panel.idle', X0, 40, IW, 150)
    s.t(X0 + 8, 90, 'Tu commences ici : Jour 8', 14); s.t(X0 + 8, 112, 'Environ 30 min à 2 h', 13); s.t(X0 + 8, 128, 'pour finir l’acte 1 (estimation)', 12)
    s.t(X0 + 8, 155, 'Comment on calcule ?', 12, 'navy')
    s.put('ui.btn_primary.idle', X0, 300, IW, 28, tap='Commencer'); s.t(X0 + 8, 306, 'Commencer', 15, 'cream')
    s.put('ui.btn_secondary.idle', X0, 334, IW, 28, tap='Commencer plus tôt'); s.t(X0 + 8, 340, 'Commencer plus tôt', 14)
    REPORT[f'placement_result_{css}'] = s.render('placement_result')
    # 3 learn_word: story + toast + card
    s = S(W); topbar(s); stage(s); s.put('ui.panel.idle', X0, 108, IW, 40); s.t(X0 + 6, 114, 'Tiens, la serviette !', 14)
    s.put('ui.toast.idle', 20, 156, W - 40, 22, tap='toast'); s.put('ui.icon.leaf', 23, 159); s.t(40, 160, 'Nouveau mot : la serviette', 11)
    s.put('ui.wordbook_card.open', X0, 186, IW, 200); s.put('ui.exit.idle', W - 30, 190, tap='close card')
    s.t(X0 + 8, 194, 'la serviette', 17, 'plum'); s.put('ui.gender_pip.f', X0 + 8, 216)
    s.put('ui.btn_icon.idle', W - 54, 190, tap='? gloss'); s.put('ui.icon.help', W - 50, 193)
    s.c.alpha_composite(Image.new('RGBA', (60, 40), PAL_rgb('sky')), (X0 + 10, 236)); s.c.alpha_composite(Image.new('RGBA', (60, 10), PAL_rgb('wall_sh')), (X0 + 10, 266))
    s.c.alpha_composite(Image.open(f'{ROOT}/style/canonical/sets/rooftop/pieces/day/pot_chez_nous_full.png').convert('RGBA'), (X0 + 33, 246))
    s.put('ui.card_picture_frame.idle', X0 + 8, 234, tap='picture audio')
    for i, (f, cx) in enumerate((('rooftop/composite_landscape_evening.png', 70), ('stairwell/composite_landscape_day.png', 40))):
        th = Image.open(f'{ROOT}/style/canonical/sets/{f}').convert('RGBA').resize((192, 80), Image.NEAREST).crop((cx, 30, cx + 36, 53))
        s.c.alpha_composite(th, (X0 + 10 + i * 44, 292))
    s.put('ui.scene_thumb.newest', X0 + 8, 290, tap='thumb1'); s.put('ui.scene_thumb.idle', X0 + 52, 290, tap='thumb2')
    s.put('ui.carnet_button.idle', 4, 396, tap='carnet')
    REPORT[f'learn_word_{css}'] = s.render('learn_word')
    # 4 review
    s = S(W); topbar(s)
    mw = 5 * 16 + 4 * 3; x0 = W - mw - 4
    for i, st in enumerate(('full', 'twothird', 'third', 'empty', 'empty')): s.put(f'ui.water_meter.{st}', x0 + i * 19, 4)
    pw = 6 * 8 - 2
    for i, st in enumerate(('done_ok', 'done_recast', 'current', 'todo', 'todo', 'todo')): s.put(f'ui.pips.{st}', (W - pw) // 2 + i * 8, 26)
    s.put('ui.review_item_frame.recognition', X0, 36, IW, 100); th = Image.open(f'{ROOT}/style/canonical/sets/rooftop/composite_landscape_evening.png').convert('RGBA').resize((192, 80), Image.NEAREST).crop((70, 30, 106, 53))
    s.c.alpha_composite(th, ((W - 40) // 2 + 2, 48)); s.put('ui.scene_thumb.idle', (W - 40) // 2, 46)
    s.put('ui.btn_icon.idle', W - 32, 40, tap='? gloss'); s.put('ui.icon.help', W - 28, 43)
    s.t(X0 + 6, 102, 'Je peux prendre une ___ ?', 14)
    ys = 230
    for i, (st, lab) in enumerate((('correct', 'serviette'), ('idle', 'fourchette'), ('idle', 'chaise'), ('idle', 'Je ne sais pas'))):
        s.put(f'ui.btn_option_row.{st}', X0, ys + i * 32, IW, 28, tap=lab); s.t(X0 + 8, ys + i * 32 + 6, lab, 14)
    s.put('ui.water_hop.hop_f2', 40, 220); s.put('ui.feedback_burst.correct_f2', IW - 16, ys + 6)
    REPORT[f'garden_review_{css}'] = s.render('garden_review')
    # 5 dictation
    s = S(W); topbar(s, 'Passer'); stage(s, 'stairwell/composite_landscape_day.png')
    s.put('ui.panel.idle', X0, 110, IW, 46); s.t(X0 + 6, 116, 'Il fait un temps', 14)
    s.put('ui.dictation_gap.recast', 12, 132, 70, 20); s.t(16, 134, 'mouiller', 13)
    s.put('ui.recast_box.recast', X0, 164, IW, 34); s.t(X0 + 6, 167, 'mouiller', 12); s.t(X0 + 6, 182, 'mouillé', 12, 'orange_sh')
    s.put('ui.btn_icon.idle', W - 30, 170, tap='audio'); s.put('ui.icon.audio', W - 26, 173)
    s.put('ui.btn_icon.active', W // 2 - 26, 214, tap='replay'); s.put('ui.icon.replay', W // 2 - 22, 217)
    s.put('ui.btn_icon.idle', W // 2 + 4, 214, tap='slow'); s.put('ui.icon.slow', W // 2 + 8, 217)
    s.put('ui.btn_secondary.idle', X0, 244, 70, 28, tap='Passer'); s.t(X0 + 8, 250, 'Passer', 14)
    s.put('ui.btn_primary.idle', W - 82, 244, 76, 28, tap='Valider'); s.t(W - 74, 250, 'Valider', 14, 'cream')
    s.put('ui.accent_bar.bar', 0, 280, W, 26)
    for i in range(9): s.put('ui.accent_bar.key_idle', (W - 180) // 2 + 1 + i * 20, 282, tap=f'key{i}')
    for i, ch in enumerate('éèàçêôùî’'): s.t((W - 180) // 2 + 6 + i * 20, 285, ch, 14)
    s.c.alpha_composite(Image.new('RGBA', (W, 116), PAL_rgb('silver')), (0, 306))
    REPORT[f'listen_dictation_{css}'] = s.render('listen_dictation')
    # 6 output
    s = S(W); topbar(s, 'Passer'); stage(s)
    s.put('ui.panel.idle', X0, 108, IW, 30); s.t(X0 + 6, 114, 'Tu veux du café ?', 14)
    sw = (IW - 8) // 3
    for i, st in enumerate(('filled', 'focus', 'empty')): s.put(f'ui.chunk_slot.{st}', 6 + i * (sw + 4), 150, sw, 22)
    s.t(X0 + 6, 154, 'Oui,', 13)
    for i, (st, lab) in enumerate((('placed', 'Oui,'), ('idle', 'avec plaisir'), ('idle', 'merci'), ('pressed', 'non'))):
        cx = 6 + (i % 2) * (IW // 2 + 2); cy = 190 + (i // 2) * 28
        s.put(f'ui.chunk_chip.{st}', cx, cy, IW // 2 - 2, 22, tap=lab); s.t(cx + 6, cy + 4, lab, 13)
    s.put('ui.mic_button.recording_f2', (W - 40) // 2, 260, tap='mic')
    s.put('ui.btn_secondary.idle', X0, 310, IW // 2 - 2, 28, tap='Écouter'); s.put('ui.icon.mic', 10, 317); s.t(26, 316, 'Écouter', 13)
    s.put('ui.btn_secondary.idle', 8 + IW // 2, 310, IW // 2 - 2, 28, tap='Modèle'); s.put('ui.icon.audio', 12 + IW // 2, 317); s.t(28 + IW // 2, 316, 'Modèle', 13)
    s.put('ui.reply_note.recast', X0, 348, IW, 40); s.put('ui.reply_note.tape', W // 2 - 3, 346); s.t(X0 + 6, 356, 'Oui, avec plaisir', 13)
    s.put('ui.btn_primary.idle', W - 82, 394, 76, 28, tap='Valider'); s.t(W - 74, 400, 'Valider', 14, 'cream')
    REPORT[f'output_{css}'] = s.render('output')
bad = [(k, x) for k, v in REPORT.items() for x in v if x[3] != 'OK']
open(f'{D}/mockups/tap_targets.txt', 'w').write('\n'.join(f'{k}: {v}' for k, v in REPORT.items()) + '\nSMALL: ' + str(bad))
print('small targets:', bad)
