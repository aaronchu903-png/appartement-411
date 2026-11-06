"""Rebuild the rain grade from the exported PNGs (kitchen/light + stairwell/light) and diff against the in-memory render. Expect diff 0."""
import sys, os, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); sys.argv = ['x']
import importlib.util
spec = importlib.util.spec_from_file_location('g', f'{D}/gen_sitcom.py'); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
for room, Mm, Am, st in (('kitchen', g.KM, g.KA, lambda: g.K.stage('day', g.ksheets)), ('stairwell', g.SM, g.SA, lambda: g.S.stage('day', g.sd))):
    L = f'{g.SETS}/{room}/light'
    M = np.asarray(Image.open(f'{L}/rain_day_multiplier_half.png')).astype(float) * 2 / 255.0
    A = np.asarray(Image.open(f'{L}/rain_day_add_half.png')).astype(float) * 2
    a = np.asarray(g.K.grade(st(), M, 1.0, A)).astype(int); b = np.asarray(g.K.grade(st(), Mm, 1.0, Am)).astype(int)
    ref = Image.open(f'{g.D}/composites/{"kitchen" if room=="kitchen" else "stairwell"}_rain_day_x1.png')
    print(room, 'maps diff', int(np.abs(a - b).max()), 'pixels', int((np.abs(a - b).sum(-1) > 0).sum()))
