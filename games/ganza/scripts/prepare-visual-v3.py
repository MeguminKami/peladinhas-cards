from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
root=Path(__file__).resolve().parents[1];src=root/'art-src';out=root/'ui/art/pastel';out.mkdir(parents=True,exist_ok=True)
bg=Image.open(src/'coasts-pastel-v3.png').convert('RGB');w,h=bg.size
for i,risk in enumerate(['baixo','medio','alto','extremo']):
    tile=bg.crop(((i%2)*w//2,(i//2)*h//2,(i%2+1)*w//2,(i//2+1)*h//2))
    tile.resize((1200,800),Image.Resampling.LANCZOS).save(out/f'{risk}.webp',quality=90)
actor=Image.open(src/'weed-seated-v3.png').convert('RGBA');actor.save(out/'weed-seated.png',optimize=True)
portrait=Image.open(src/'coasts-portrait-v3.png').convert('RGB')
for i,risk in enumerate(['baixo','medio','alto','extremo']):
    portrait.crop((i*portrait.width//4,0,(i+1)*portrait.width//4,portrait.height)).save(out/f'{risk}-portrait.webp',quality=91)
boats=Image.open(src/'boats-pastel-v3.png').convert('RGBA');boats.thumbnail((1024,1280));boats.save(out/'boats.png',optimize=True)
# Inspection contact sheets: native straight RGBA is premultiplied by the browser at decode/composition.
cell=actor.crop((0,0,actor.width//4,actor.height//2));zoom=cell.resize((cell.width*4,cell.height*4),Image.Resampling.NEAREST)
review=root/'revisao/correcao-visual'
for name,color in [('escuro','#102c38'),('claro','#f3e5cb')]:
    canvas=Image.new('RGBA',zoom.size,color);canvas.alpha_composite(zoom);canvas.convert('RGB').save(review/f'alpha-400-{name}.png')
manifest={'source':'built-in image_gen, three reference-based generations','actor':{'columns':4,'rows':2,'poses':8,'durationSeconds':20,'alpha':actor.getextrema()[3],'premultiply':'createImageBitmap premultiplyAlpha=premultiply; Canvas premultiplied composition'},'boats':{'rows':4},'backgrounds':4}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Quatro fundos, atlas sentado e lanchas preparados; recortes alpha a 400%.')
