"""M2 card mockups (390 + 360) with the gen_m2_cards art filled in. Reuses mock_ui_learning.py helpers (S, P, nine, topbar, stage)
without re-running its screens. Writes mockups/m2_*.png only."""
import os, json
D = os.path.dirname(os.path.abspath(__file__))
exec(open(f'{D}/mock_ui_learning.py').read().split('REPORT = {}')[0])
from PIL import Image
WORDS = [('word.bonjour.any', 'bonjour', None), ('word.je_m_appelle.any', 'je m’appelle', None), ('word.c_est.any', 'c’est', None),
 ('word.l_appartement.any', 'l’appartement', 'm'), ('word.la_plante.any', 'la plante', 'f'), ('word.le_chat.any', 'le chat', 'm'), ('word.la_proprietaire.any', 'la propriétaire', 'f'),
 ('word.samedi.any', 'samedi', None), ('word.il_faut.any', 'il faut', None), ('word.tu_veux.any', 'tu veux', None), ('word.je_voudrais.any', 'je voudrais', None),
 ('word.le_cafe.any', 'le café', 'm'), ('word.le_the.any', 'le thé', 'm'), ('word.l_eau.any', 'l’eau', 'f'), ('word.le_lait.any', 'le lait', 'm'), ('word.le_pain.any', 'le pain', 'm'),
 ('word.il_n_y_a_pas_de.any', 'il n’y a pas de', None), ('word.c_est_combien.any', 'c’est combien ?', None), ('word.les_croquettes.any', 'les croquettes', 'f'),
 ('word.il_y_a.any', 'il y a', None), ('word.sur.any', 'sur', None), ('word.sous.any', 'sous', None), ('word.dans.any', 'dans', None),
 ('word.derriere.any', 'derrière', None), ('word.la_table.any', 'la table', 'f'), ('word.la_cuisine.any', 'la cuisine', 'f'), ('word.le_colis.any', 'le colis', 'm'), ('word.une_boite.any', 'une boîte', 'f')]
GCOL = {'m': 'navy', 'f': 'plum', None: 'ink'}
def card(s, X0, y, key, label, g, W):
    s.put('ui.wordbook_card.open', X0, y, 168, 120); s.put('ui.exit.idle', W - 30, y + 4)
    s.t(X0 + 8, y + 8, label, 17, GCOL[g]); s.put(f'ui.gender_pip.{g or "none"}', X0 + 8, y + 30)
    s.put(key, X0 + 10, y + 50); s.put('ui.card_picture_frame.idle', X0 + 8, y + 48, tap='picture audio')
out = []
for W in (195, 180):
    css = W * 2; IW = 168; X0 = (W - IW) // 2
    # placement result
    s = S(W); topbar(s); s.put('ui.panel.idle', X0, 40, IW, 150); s.put('prompt.placement.any', X0 + 6, 48)
    s.t(X0 + 8, 90, 'Tu commences ici : Jour 8', 14); s.t(X0 + 8, 112, 'Environ 30 min à 2 h', 13); s.t(X0 + 8, 128, 'pour finir l’acte 1 (estimation)', 12)
    s.t(X0 + 8, 155, 'Comment on calcule ?', 12, 'navy')
    s.put('ui.btn_primary.idle', X0, 300, IW, 28); s.t(X0 + 8, 306, 'Commencer', 15, 'cream')
    s.put('ui.btn_secondary.idle', X0, 334, IW, 28); s.t(X0 + 8, 340, 'Commencer plus tôt', 14); s.render('m2_placement_result'); out.append(f'm2_placement_result_{css}')
    # learn_words (Day 1 first card)
    s = S(W); topbar(s); stage(s, 'stairwell/composite_landscape_day.png'); s.put('ui.panel.idle', X0, 108, IW, 40); s.t(X0 + 6, 114, 'Bonjour ! Bienvenue !', 14)
    s.put('ui.toast.idle', 20, 156, W - 40, 22); s.put('ui.icon.leaf', 23, 159); s.t(40, 160, 'Nouveau mot : bonjour', 11)
    card(s, X0, 186, 'word.bonjour.any', 'bonjour', None, W); s.render('m2_learn_words'); out.append(f'm2_learn_words_{css}')
    # listening (D3)
    s = S(W); topbar(s, 'Passer'); s.put('ui.panel.idle', X0, 30, IW, 96); s.put('prompt.listen.any', X0 + 10, 40); s.put('ui.card_picture_frame.idle', X0 + 8, 38)
    s.t(X0 + 78, 44, 'Où est', 14); s.t(X0 + 78, 60, 'le colis ?', 14)
    s.put('ui.btn_icon.active', W // 2 - 26, 92); s.put('ui.icon.replay', W // 2 - 22, 95); s.put('ui.btn_icon.idle', W // 2 + 4, 92); s.put('ui.icon.slow', W // 2 + 8, 95)
    for i, (st, lab) in enumerate((('idle', 'sur la table'), ('idle', 'sous la table'), ('correct', 'derrière la chaise'))):
        s.put(f'ui.btn_option_row.{st}', X0, 250 + i * 32, IW, 28); s.t(X0 + 8, 256 + i * 32, lab, 14)
    s.render('m2_listening'); out.append(f'm2_listening_{css}')
    # dictation (D1)
    s = S(W); topbar(s, 'Passer'); s.put('ui.panel.idle', X0, 30, IW, 96); s.put('prompt.dictation.any', X0 + 10, 40); s.put('ui.card_picture_frame.idle', X0 + 8, 38)
    s.put('ui.dictation_gap.focus', X0 + 76, 42, 70, 20); s.t(X0 + 76, 66, ', je viens', 13); s.t(X0 + 76, 80, 'chez vous.', 13)
    s.put('ui.btn_icon.active', W // 2 - 26, 92); s.put('ui.icon.replay', W // 2 - 22, 95); s.put('ui.btn_icon.idle', W // 2 + 4, 92); s.put('ui.icon.slow', W // 2 + 8, 95)
    s.put('ui.btn_secondary.idle', X0, 244, 70, 28); s.t(X0 + 8, 250, 'Passer', 14); s.put('ui.btn_primary.idle', W - 82, 244, 76, 28); s.t(W - 74, 250, 'Valider', 14, 'cream')
    s.put('ui.accent_bar.bar', 0, 280, W, 26)
    for i in range(9): s.put('ui.accent_bar.key_idle', (W - 180) // 2 + 1 + i * 20, 282)
    for i, ch in enumerate('éèàçêôùî’'): s.t((W - 180) // 2 + 6 + i * 20, 285, ch, 14)
    s.render('m2_dictation'); out.append(f'm2_dictation_{css}')
    # all 30 word cards, 3 screens of 3 cards each would be long: render 10 pages of 3
    for pg in range(10):
        s = S(W)
        for j, (k, lab, g) in enumerate(WORDS[pg * 3: pg * 3 + 3]): card(s, X0, 8 + j * 138, k, lab, g, W)
        s.render(f'm2_cards_p{pg + 1:02d}'); out.append(f'm2_cards_p{pg + 1:02d}_{css}')
print('\n'.join(f'mockups/{o}.png' for o in out))
