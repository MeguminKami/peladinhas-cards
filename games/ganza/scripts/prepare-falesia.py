"""Pack ImageGen production masters; preserve generated alpha, no chroma key."""
from pathlib import Path
from PIL import Image
import shutil
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/Joao/.codex/generated_images/01a1b08c-0cab-7901-a261-f1696ed2ae09')
masters=root/'art-src/falesia'; out=root/'ui/art/falesia'
masters.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
files={'cliff':'exec-f29f968f-7cef-4194-af0a-c55ddd0a72ab.png','environments':'exec-df133fb1-0e84-4f31-a687-9e189bb52526.png','actor':'exec-398fce3c-063d-40e2-a771-b8a7c578455e.png','objects-alpha':'exec-b1aed934-867d-4e19-96bc-fedaff6c405c.png','decor':'exec-cecb2faf-b054-47b9-bf11-86cf491dad4f.png','portraits':'exec-ffac3271-3fe8-4e89-a31b-03225e22351e.png'}
for name,file in files.items():
 if not (masters/f'{name}.png').exists():shutil.copy2(source/file,masters/f'{name}.png')
def save(im,name,size=None):
 if size:im.thumbnail(size,Image.Resampling.LANCZOS)
 im.save(out/f'{name}.webp',quality=90,method=6)
def cell(im,x,y,cols,rows):return im.crop((round(im.width*x/cols),round(im.height*y/rows),round(im.width*(x+1)/cols),round(im.height*(y+1)/rows)))
def trim(im):
 # Ignore near-invisible generation padding when finding the sprite bounds.
 alpha=im.getchannel('A');return im.crop(alpha.point(lambda a:255 if a>32 else 0).getbbox())
save(trim(Image.open(masters/'cliff.png').convert('RGBA')),'cliff',(1600,1000))
bg=Image.open(masters/'environments.png')
portrait=Image.open(masters/'portraits.png')
for i,risk in enumerate(['baixo','medio','alto','extremo']):
 save(cell(bg,i%2,i//2,2,2),risk,(1400,900))
 save(cell(portrait,i,0,4,1),risk+'-portrait',(700,1400))
for master,names in [('objects-alpha',['buoy','boat','parcel']),('decor',['pergola','ledge','flowers'])]:
 im=Image.open(masters/f'{master}.png').convert('RGBA')
 for i,name in enumerate(names):save(trim(cell(im,i,0,3,1)),name,(900,900))
im=Image.open(masters/'actor.png').convert('RGBA')
# Independently trim and anchor each pose in equal cells; no interpolated faces.
atlas=Image.new('RGBA',(1536,1024))
for i in range(8):
 pose=trim(cell(im,i%4,i//4,4,2));pose.thumbnail((364,490),Image.Resampling.LANCZOS)
 atlas.alpha_composite(pose,((i%4)*384+(384-pose.width)//2,(i//4)*512+512-pose.height))
atlas.save(out/'actor.png',optimize=True)
print('FalÃ©sia: masters preserved and 16 runtime assets packed.')

# Owner correction: brown parcels; preserve the edited atlas cell positions.
if (masters/"actor-brown.png").exists():
 im=Image.open(masters/"actor-brown.png").convert("RGBA").resize((1536,1024),Image.Resampling.LANCZOS);im.save(out/"actor.png",optimize=True)
for name in ["parcel","ledge"]:
 path=masters/(name+"-brown.png")
 if path.exists():save(trim(Image.open(path).convert("RGBA")),name,(900,900))

# Latest Falésia composition masters take precedence over the historical generation.
if (masters/'cliff-coast-v2.png').exists():save(Image.open(masters/'cliff-coast-v2.png'),'cliff',(1600,1100))
if (masters/'actor-clean-v2.png').exists():Image.open(masters/'actor-clean-v2.png').save(out/'actor.png',optimize=True)
