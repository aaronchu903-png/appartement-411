"""Home-screen icon: Croissant's head, the same pixels as js/art.js SPR.cat.
Original, no external art. Opaque background (the page colour). Nearest-neighbour only.
"""
from pathlib import Path
from PIL import Image

# js/art.js SPR.cat, columns 0-6, rows 0-5 (the face; the right-hand pixels are the tail).
FACE = [
    "o.....o",
    "oo...oo",
    "ooooooo",
    "okoooko",
    "ooonooo",
    ".ooooo.",
]
PAL = {
    "o": (0xE2, 0x87, 0x3A),  # cat
    "k": (0x22, 0x30, 0x3A),  # eye
    "n": (0xE7, 0x9A, 0xA0),  # nose
}
BG = (0xF6, 0xF1, 0xE7)

def grid(size, ox, oy):
    g = [["."] * size for _ in range(size)]
    for r, row in enumerate(FACE):
        for c, ch in enumerate(row):
            for dy in range(2):
                for dx in range(2):
                    g[oy + r * 2 + dy][ox + c * 2 + dx] = ch
    return g

def render(g, n):
    im = Image.new("RGB", (n, n), BG)
    px = im.load()
    G = len(g)
    # Integer scale when n is a multiple of G; otherwise nearest source cell.
    if n % G == 0:
        s = n // G
        for y in range(G):
            for x in range(G):
                col = PAL.get(g[y][x], BG)
                for dy in range(s):
                    for dx in range(s):
                        px[x * s + dx, y * s + dy] = col
    else:
        for y in range(n):
            for x in range(n):
                px[x, y] = PAL.get(g[min(G - 1, y * G // n)][min(G - 1, x * G // n)], BG)
    return im

def main():
    root = Path(__file__).resolve().parents[1]
    out = root / "icons"
    out.mkdir(exist_ok=True)
    # 20-grid (3 cells of margin) scales evenly to 180.
    render(grid(20, 3, 3), 180).save(out / "apple-touch-icon.png")
    render(grid(20, 3, 3), 192).save(out / "icon-192.png")
    render(grid(20, 3, 3), 512).save(out / "icon-512.png")
    # 16-grid scales evenly to 32, so the eyes stay square.
    render(grid(16, 1, 2), 32).save(out / "favicon-32.png")
    (root / "evidence").mkdir(exist_ok=True)
    (root / "evidence" / "icon-180.png").write_bytes((out / "apple-touch-icon.png").read_bytes())

if __name__ == "__main__":
    main()
