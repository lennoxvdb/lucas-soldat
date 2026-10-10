"""Découpe les planches Gemini (fond blanc) en dessins transparents pour le jeu.

Chaque dessin est trouvé tout seul (les petits nuages, étoiles et fumées restent avec leur dessin).
Les dessins d'une même planche gardent la même échelle, pour que Lucas ne change pas de taille
d'une pose à l'autre. Un fichier JSON donne la taille et le point des pieds de chaque dessin.

Usage : python tools/cut_planches.py planches/lucas.jpg assets/lucas lucas  [--max 360]
Les dessins sont numérotés de gauche à droite, ligne par ligne : lucas_1.webp, lucas_2.webp, ...
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

GRID = 4      # on cherche les dessins sur une image 4 fois plus petite (plus rapide)
GAP = 1       # cases d'écart (x4 pixels) pour relier les morceaux d'un même dessin
ATTACH = 16   # distance max (en cases) pour rattacher un petit morceau (étoile, fumée) à son dessin


def background(rgb):
    """Le blanc du fond, atteint depuis les bords (le blanc à l'intérieur des dessins reste)."""
    light = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    white = (light > 232) & (spread < 26)
    h, w = white.shape
    seen = np.zeros_like(white)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return seen


def label_grid(fg):
    h, w = fg.shape
    gh, gw = (h + GRID - 1) // GRID, (w + GRID - 1) // GRID
    small = np.zeros((gh, gw), dtype=bool)
    ys, xs = np.nonzero(fg)
    small[ys // GRID, xs // GRID] = True
    # on grossit un peu pour relier les morceaux proches
    img = Image.fromarray((small * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * GAP + 1))
    grown = np.asarray(img) > 0
    lab = np.zeros((gh, gw), dtype=np.int32)
    n = 0
    sizes = {}
    for sy, sx in zip(*np.nonzero(grown)):
        if lab[sy, sx]:
            continue
        n += 1
        lab[sy, sx] = n
        q = deque([(sy, sx)]); cnt = 0
        while q:
            y, x = q.popleft(); cnt += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < gh and 0 <= nx < gw and grown[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        sizes[n] = cnt
    return lab, sizes


def main():
    sheet, out_dir, name = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    maxside = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 360
    out_dir.mkdir(parents=True, exist_ok=True)
    im = Image.open(sheet).convert('RGB')
    rgb = np.asarray(im).astype(int)
    fg = ~background(rgb)
    lab, sizes = label_grid(fg)
    big = max(sizes.values())
    keep = [k for k, s in sizes.items() if s > big * 0.08]
    # les petits morceaux (étoiles, nuages, fumées) vont avec le gros dessin le plus proche
    boxes = {}
    for k in sizes:
        ys, xs = np.nonzero(lab == k)
        boxes[k] = (xs.min(), ys.min(), xs.max(), ys.max())
    def dist(a, b):
        dx = max(0, max(a[0], b[0]) - min(a[2], b[2]))
        dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
        return (dx * dx + dy * dy) ** 0.5
    for k in sizes:
        if k in keep or sizes[k] < 4:
            continue
        best = min(keep, key=lambda b: dist(boxes[k], boxes[b]))
        if dist(boxes[k], boxes[best]) <= ATTACH:
            lab[lab == k] = best
    full = lab[np.arange(fg.shape[0])[:, None] // GRID, np.arange(fg.shape[1])[None, :] // GRID]
    items = []
    for k in keep:
        m = fg & (full == k)
        ys, xs = np.nonzero(m)
        items.append({'k': k, 'mask': m, 'box': (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)})
    # ordre de lecture : par ligne (selon le milieu vertical) puis de gauche à droite
    items.sort(key=lambda it: (it['box'][1] + it['box'][3]) / 2)
    rows, cur = [], []
    for it in items:
        cy = (it['box'][1] + it['box'][3]) / 2
        if cur and cy - (cur[-1]['box'][1] + cur[-1]['box'][3]) / 2 > 120:
            rows.append(cur); cur = []
        cur.append(it)
    rows.append(cur)
    ordered = [it for r in rows for it in sorted(r, key=lambda it: it['box'][0])]
    # même échelle pour toute la planche
    tallest = max(max(it['box'][2] - it['box'][0], it['box'][3] - it['box'][1]) for it in ordered)
    scale = min(1.0, maxside / tallest)
    src = np.asarray(im.convert('RGBA')).copy()
    meta = {}
    for i, it in enumerate(ordered, 1):
        x0, y0, x1, y1 = it['box']
        crop = src[y0:y1, x0:x1].copy()
        alpha = Image.fromarray((it['mask'][y0:y1, x0:x1] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
        crop[..., 3] = np.asarray(alpha)
        piece = Image.fromarray(crop)
        w, h = round(piece.width * scale), round(piece.height * scale)
        piece = piece.resize((w, h), Image.LANCZOS)
        # point des pieds : milieu des pixels du bas du dessin
        m = it['mask'][y0:y1, x0:x1]
        band = m[int(m.shape[0] * 0.9):]
        bx = np.nonzero(band)[1]
        ax = float(bx.mean() / m.shape[1]) if len(bx) else 0.5
        fn = f'{name}_{i}.webp'
        piece.save(out_dir / fn, 'WEBP', quality=90, method=6)
        meta[f'{name}_{i}'] = {'w': w, 'h': h, 'ax': round(ax, 3)}
        print(fn, w, h, round(ax, 2))
    (out_dir / f'{name}.json').write_text(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main()
