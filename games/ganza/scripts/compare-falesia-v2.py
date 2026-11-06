from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
p=Path('games/ganza/revisao/falesia-v2');a=Image.open('games/ganza/revisao/referencia/falesia-aprovada.webp');b=Image.open(p/'depois-1920-medio.png');c=Image.new('RGB',(1920,600),'#173744');d=ImageDraw.Draw(c)
for i,(im,label) in enumerate([(a,'REFERENCIA APROVADA'),(b,'JOGO MEDIA 1920 x 1080')]):
 im=ImageOps.contain(im,(950,550));c.paste(im,(i*960+(960-im.width)//2,35));d.text((i*960+12,12),label,fill='#ffe0ae')
c.save(p/'comparacao-media.png');Image.open(p/'maqueta-1920-medio.png').save(p/'maqueta-media.png')

for width in [1920,1366,390,320]:
 tilew,tileh=(640,380) if width>650 else (320,860)
 canvas=Image.new('RGB',(tilew*2,tileh*2),'#173744');draw=ImageDraw.Draw(canvas)
 for i,risk in enumerate(['baixo','medio','alto','extremo']):
  im=Image.open(p/f'depois-{width}-{risk}.png').convert('RGB');im=ImageOps.contain(im,(tilew-8,tileh-28));x=(i%2)*tilew;y=(i//2)*tileh
  canvas.paste(im,(x+(tilew-im.width)//2,y+24));draw.text((x+8,y+6),risk.upper(),fill='#ffe0ae')
 canvas.save(p/f'quatro-ambientes-{width}.jpg',quality=92)
