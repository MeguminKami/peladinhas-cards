from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1];out=root/'revisao/falesia'
reference=Image.open(root/'revisao/referencia/falesia-aprovada.webp').convert('RGB')
for width,height in [(1920,1080),(1366,768),(390,844),(320,740)]:
 images=[reference,Image.open(out/f'depois-{width}-medio.png').convert('RGB')]
 tilew=960 if width>650 else 480;tileh=560 if width>650 else 850
 canvas=Image.new('RGB',(tilew*2,tileh+42),'#152f3b');d=ImageDraw.Draw(canvas)
 for i,(im,label) in enumerate(zip(images,['REFERENCIA APROVADA','JOGO - MEDIA'])):
  fitted=ImageOps.contain(im,(tilew-16,tileh-16));canvas.paste(fitted,(i*tilew+(tilew-fitted.width)//2,42+(tileh-fitted.height)//2));d.text((i*tilew+16,14),label,fill='#ffe0ae')
 canvas.save(out/f'comparacao-media-{width}.jpg',quality=92)
contact=Image.new('RGB',(1280,768),'#152f3b');d=ImageDraw.Draw(contact)
for i,risk in enumerate(['baixo','medio','alto','extremo']):
 im=Image.open(out/f'depois-1920-{risk}.png').convert('RGB');im.thumbnail((640,360));x=i%2*640;y=i//2*384;contact.paste(im,(x,y+24));d.text((x+12,y+5),risk.upper(),fill='#ffe0ae')
contact.save(out/'quatro-ambientes.jpg',quality=92)
actor=Image.open(root/'ui/art/falesia/actor.png').convert('RGBA').crop((0,0,384,512))
for color,name in [('#11232c','escuro'),('#f4dfbd','claro')]:
 bg=Image.new('RGBA',actor.size,color);bg.alpha_composite(actor);bg.resize((1536,2048)).convert('RGB').save(out/f'alpha-400-{name}.png')
print('Comparacoes, quatro ambientes e alpha ampliado exportados.')
