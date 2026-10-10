"""Copie les dessins de Pokepetro dans le jeu (webp, taille reduite)."""
import os
from PIL import Image
SRC = r'C:\Users\Miss_\PTT\Pfft\app\src\main\res\drawable-nodpi'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
MONSTERS = ['08','38','12','23','13','16','22','45','74','62','63','44','37',
            '118','29','84','114','113','39',
            '111','64','33','90','70','01',
            '34','26','137','109','117','129','28','127','57','60','67']
def save(im, path, maxside):
    im = im.convert('RGBA'); im.thumbnail((maxside, maxside), Image.LANCZOS)
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    im.save(path, 'WEBP', quality=88, method=6)
for m in MONSTERS:
    save(Image.open(os.path.join(SRC, f'monster_{m}.png')), os.path.join(OUT, 'monsters', f'm{m}.webp'), 192)
for n, side in [('game_lucas_soldier.webp', 320), ('game_lucas_jump.webp', 256), ('game_lucas_point.webp', 256),
                ('item_dog_walk_1.webp', 160), ('item_dog_walk_2.webp', 160), ('item_dog_walk_3.webp', 160), ('item_dog_walk_4.webp', 160),
                ('game_beans.webp', 128), ('item_spray.webp', 160)]:
    save(Image.open(os.path.join(SRC, n)), os.path.join(OUT, 'sprites', n.split('.')[0] + '.webp'), side)
# bande d'explosion de gaz (9 images de 256) -> gardee en bande, reduite
strip = Image.open(os.path.join(SRC, 'fart_boom_01.png')).convert('RGBA')
strip = strip.resize((9 * 128, 128), Image.LANCZOS)
strip.save(os.path.join(OUT, 'sprites', 'gas_boom.webp'), 'WEBP', quality=88)
print('ok')
