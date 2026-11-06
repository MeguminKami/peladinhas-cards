"""Export generated key poses to transparent PNG animation assets, with explicit interpolation provenance."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
import tempfile,shutil,json,zipfile,hashlib,sys
sys.path.insert(0,str(Path(tempfile.gettempdir())/'ganza-image-tools'))
import cv2

root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else root/'art-src/weed-smoking-sheet-v2.png'
out=root/'revisao/weed-png-v2';out.mkdir(parents=True,exist_ok=True)
master=root/'art-src/weed-smoking-sheet-v2.png'
if source.resolve()!=master.resolve():shutil.copy2(source,master)
sheet=Image.open(master).convert('RGBA');assert sheet.size==(1536,1024)
keydir=out/'poses';keydir.mkdir(exist_ok=True)
poses=[]
for i in range(24):
 pose=sheet.crop(((i%6)*256,(i//6)*256,(i%6+1)*256,(i//6+1)*256))
 pose.save(keydir/f'pose-{i:02}.png');poses.append(pose)

# Shorter blink and inhalation transitions, longer smoke drift, no duplicated 20 s still.
weights=[1.1,.4,.2,.6,.4,.4,.5,.6,.4,.4,.4,.5,.5,.6,.8,.9,.9,1.,1.,.8,.7,.6,.8,1.0]
timings=np.concatenate([[0],np.cumsum(np.array(weights)/sum(weights)*20)])
arrays=[np.array(p,dtype=np.float32) for p in poses]
premult=[];greys=[]
for a in arrays:
 p=a.copy();p[:,:,:3]*=p[:,:,3:4]/255.;premult.append(p)
 matte=p[:,:,:3]+(1-p[:,:,3:4]/255.)*96
 greys.append(cv2.cvtColor(matte.astype('uint8'),cv2.COLOR_RGB2GRAY))
flow=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
flow.setFinestScale(0)
motions=[]
for i in range(24):
 j=(i+1)%24;motions.append((flow.calc(greys[i],greys[j],None),flow.calc(greys[j],greys[i],None)))
print('24 pares de movimento calculados',flush=True)
grid=np.stack(np.meshgrid(np.arange(256,dtype=np.float32),np.arange(256,dtype=np.float32)),axis=-1)
def warp(p,motion,fraction):
 coords=grid.copy()
 for _ in range(4):
  sampled=cv2.remap(motion,coords[:,:,0],coords[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
  coords=(grid-fraction*sampled).astype(np.float32)
 return cv2.remap(p,coords[:,:,0],coords[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)

framesdir=out/'frames';framesdir.mkdir(exist_ok=True)
frames=[];durations=[]
for i in range(480):
 t=i/24;k=min(23,int(np.searchsorted(timings,t,side='right')-1));j=(k+1)%24
 u=(t-timings[k])/(timings[k+1]-timings[k]);u=u*u*(3-2*u)
 a=warp(premult[k],motions[k][0],u);b=warp(premult[j],motions[k][1],1-u)
 # Occlusion confidence avoids dissolving two unmatched hands into a double hand.
 mismatch=np.mean(np.abs(a[:,:,:3]-b[:,:,:3]),axis=2)
 uncertain=np.clip((mismatch-22)/35,0,1)[:,:,None]
 mix=u*(1-uncertain)+(0 if u<.5 else 1)*uncertain
 composed=a*(1-mix)+b*mix;color=composed[:,:,:3];alpha=composed[:,:,3]
 color=np.clip(color*255/np.maximum(alpha[:,:,None],1),0,255)
 # Keep true semitransparent smoke. Only eliminate numerical noise below 2/255.
 alpha[alpha<2]=0;color[alpha==0]=0
 rgba=np.concatenate([color,alpha[:,:,None]],axis=2).astype('uint8')
 frame=Image.fromarray(rgba);frame.save(framesdir/f'weed-{i:04}.png',compress_level=6)
 frames.append(frame);durations.append(round((i+1)*1000/24)-round(i*1000/24))
assert sum(durations)==20000
frames[0].save(out/'weed-fumar-v2.png',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=0,blend=0,compress_level=6)

atlasdir=out/'atlas';atlasdir.mkdir(exist_ok=True);entries=[]
for start in range(0,480,64):
 atlas=Image.new('RGBA',(2048,2048));index=start//64
 for j,f in enumerate(frames[start:start+64]):
  x=(j%8)*256;y=(j//8)*256;atlas.paste(f,(x,y));entries.append({'frame':start+j,'atlas':f'weed-{index:02}.png','x':x,'y':y,'w':256,'h':256,'durationMs':durations[start+j]})
 atlas.save(atlasdir/f'weed-{index:02}.png')
metadata={'version':'weed-smoke-png-v2','durationMs':20000,'fps':24,'frameCount':480,'generatedKeyPoses':24,'frameSize':[256,256],'alpha':'straight RGBA, transparent background and semitransparent smoke','loop':True,'anchor':[.5,1],'interpolation':'Bidirectional OpenCV DIS flow on premultiplied RGBA, occlusion fallback. Intermediates are not 480 individually generated drawings.','frames':entries}
(atlasdir/'animation.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
# Small runtime derivative, preserving the full-resolution masters separately.
game=out/'jogo';(game/'atlas').mkdir(parents=True,exist_ok=True);(game/'frames').mkdir(exist_ok=True)
small=[f.resize((128,128),Image.Resampling.LANCZOS) for f in frames]
small[0].save(game/'weed-fumar.png',save_all=True,append_images=small[1:],duration=durations,loop=0,disposal=0,blend=0,compress_level=9)
for i,f in enumerate(small):f.save(game/'frames'/f'weed-{i:04}.png',compress_level=9)
for start in range(0,480,64):
 atlas=Image.new('RGBA',(1024,1024))
 for j,f in enumerate(small[start:start+64]):atlas.paste(f,((j%8)*128,(j//8)*128))
 atlas.save(game/'atlas'/f'weed-{start//64:02}.png',compress_level=9)
light={**metadata,'frameSize':[128,128],'frames':[{**e,'x':e['x']//2,'y':e['y']//2,'w':128,'h':128} for e in entries]}
(game/'atlas/animation.json').write_text(json.dumps(light,indent=2),encoding='utf-8')
with zipfile.ZipFile(out/'weed-png-plinko.zip','w',compression=zipfile.ZIP_STORED) as z:
 for f in sorted((game/'frames').glob('*.png')):z.write(f,'frames/'+f.name)
 for f in sorted((game/'atlas').iterdir()):z.write(f,'atlas/'+f.name)
with zipfile.ZipFile(out/'weed-png-v2.zip','w',compression=zipfile.ZIP_STORED) as z:
 for f in sorted(framesdir.glob('*.png')):z.write(f,'frames/'+f.name)
 for f in sorted(atlasdir.iterdir()):z.write(f,'atlas/'+f.name)
 z.write(out/'weed-fumar-v2.png','weed-fumar-v2.png')
 z.write(master,'weed-smoking-sheet-v2.png')

# Review multiple moments over alternating backgrounds to expose halos and cropping.
contact=Image.new('RGB',(1024,768),'#fff5df');draw=ImageDraw.Draw(contact)
for j,i in enumerate([0,40,80,120,160,200,240,280,320,360,400,479]):
 bg=Image.new('RGBA',(256,256),['#fff5df','#164e62','#e15f91'][j%3]);bg.alpha_composite(frames[i]);contact.paste(bg.convert('RGB'),((j%4)*256,(j//4)*256));draw.text(((j%4)*256+6,(j//4)*256+6),f'{i/24:.2f}s',fill='#ffffff' if j%3 else '#111111')
contact.save(out/'contacto.jpg',quality=92)

apng=Image.open(out/'weed-fumar-v2.png');assert 24<=apng.n_frames<=480
total=0
for i in range(apng.n_frames):apng.seek(i);total+=apng.info['duration'];assert apng.mode=='RGBA'
assert total==20000,total
report={'durationMs':total,'frames':480,'apngEncodedFrames':apng.n_frames,'atlasCount':8,'sourceAlphaExtrema':sheet.getchannel('A').getextrema(),'firstLastMeanAbsoluteDelta':float(np.mean(np.abs(np.array(frames[0],dtype=float)-np.array(frames[-1],dtype=float)))),'sourceSHA256':hashlib.sha256(master.read_bytes()).hexdigest(),'bytes':{str(f.relative_to(out)):f.stat().st_size for f in [out/'weed-fumar-v2.png',out/'weed-png-v2.zip',game/'weed-fumar.png',out/'weed-png-plinko.zip']}}
(out/'validacao.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
