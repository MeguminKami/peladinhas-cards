from PIL import Image
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[1]
gen=Path('C:/Users/Joao/.codex/generated_images/01a1ada9-1944-72c0-a346-45b276749006')
for d in ['art-src','ui/art','revisao','promo','docs','ui/audio']: (root/d).mkdir(parents=True,exist_ok=True)
files={'weed-sheet':'exec-202fe760-3999-4756-b884-ad289032d79a.png','style-frame':'exec-2a6b4222-7cfe-4ae9-9657-374620fae6f3.png','background':'exec-03c0b9f5-dedd-4e00-93da-c1d5fc9e04e2.png'}
for name,file in files.items():
 shutil.copy2(gen/file,root/'art-src'/f'{name}.png')
 if name!='background': shutil.copy2(gen/file,root/'revisao'/f'{name}.png')
 else: Image.open(gen/file).save(root/'ui/art/background.webp',quality=88)
sheet=Image.open(gen/files['weed-sheet']).convert('RGBA')
# Model sheet is 1536×1024. Crop rectangles are rig source regions, no generated face reconstruction.
def part(name,box):
 im=sheet.crop(box)
 # Remove only paper connected to crop edges. Preserve white eyes and costume highlights.
 from collections import deque
 pix=im.load();w,h=im.size;q=deque([(x,0) for x in range(w)]+[(x,h-1) for x in range(w)]+[(0,y) for y in range(h)]+[(w-1,y) for y in range(h)])
 seen=set()
 while q:
  x,y=q.popleft()
  if (x,y) in seen or x<0 or y<0 or x>=w or y>=h:continue
  seen.add((x,y));r,g,b,a=pix[x,y]
  if min(r,g,b)<220:continue
  pix[x,y]=(r,g,b,0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 im.save(root/'ui/art'/f'{name}.webp',quality=92)
part('weed-seated',(613,0,1029,668))
for i in range(6):part(f'face-{i}',(i*256,678,min(1536,(i+1)*256),1024))
part('hand',(1080,5,1300,287))
part('thumb',(1290,280,1507,420))
Image.open(gen/files['style-frame']).resize((1280,720)).save(root/'promo/capa.webp',quality=90)
cover=root.parents[1]/'assets/casino/covers/ganza.webp'
shutil.copy2(root/'promo/capa.webp',cover)
print('Arte guardada, derivados WebP e folha de revisão preparados.')
