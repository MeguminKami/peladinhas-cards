from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
root=Path(__file__).resolve().parents[1];out=root/'revisao/correcao-visual';study=Image.open(root/'revisao/lofi-progressao-4-volatilidades.png').convert('RGB')
for width,height in [(1920,1080),(1366,768),(390,844),(320,740)]:
    tilew=640 if width>650 else 320;tileh=420 if width>650 else 740
    for i,risk in enumerate(['baixo','medio','alto','extremo']):
        source=study.crop(((i%2)*study.width//2,(i//2)*study.height//2,(i%2+1)*study.width//2,(i//2+1)*study.height//2))
        images=[source,Image.open(out/f'antes-{width}-{risk}.png'),Image.open(out/f'depois-{width}-{risk}.png')]
        canvas=Image.new('RGB',(tilew*3,tileh+48),'#112d3d');d=ImageDraw.Draw(canvas)
        for j,(image,title) in enumerate(zip(images,['ESTUDO APROVADO','ANTES','DEPOIS'])):
            fitted=ImageOps.contain(image,(tilew-12,tileh-12));canvas.paste(fitted,(j*tilew+(tilew-fitted.width)//2,40+(tileh-fitted.height)//2));d.text((j*tilew+12,14),f'{title} | {risk} | {width} x {height}',fill='#efd7a9')
        canvas.save(out/f'comparacao-{width}-{risk}.jpg',quality=90)
print('16 comparacoes lado a lado guardadas.')
