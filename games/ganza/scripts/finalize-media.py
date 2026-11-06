from pathlib import Path
from PIL import Image
import tempfile,subprocess,json,shutil
root=Path(__file__).resolve().parents[1];ff=Path(tempfile.gettempdir())/'ganza-tools/ffmpeg.exe'
def run(args):
 p=subprocess.run([str(ff),'-hide_banner','-loglevel','error','-y']+list(map(str,args)),capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
def mix(video,events,duration):
 temp=Path(tempfile.gettempdir())/('ganza-mixed-'+video.name)
 args=['-i',video,'-stream_loop','-1','-i',root/'ui/audio/music/base.ogg','-stream_loop','-1','-i',root/'ui/audio/waves-0.ogg'];filters=['[1:a]volume=0.10[base]','[2:a]volume=0.12[waves]'];labels=['[base]','[waves]']
 for i,(name,at) in enumerate(events,3):args+=['-i',root/'ui/audio'/name];label=f'e{i}';filters.append(f'[{i}:a]volume=0.7,adelay={int(at*1000)}:all=1[{label}]');labels.append('['+label+']')
 filters.append(''.join(labels)+f'amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.9[audio]')
 run(args+['-filter_complex',';'.join(filters),'-map','0:v','-map','[audio]','-c:v','copy','-c:a','aac','-b:a','160k','-t',duration,'-movflags','+faststart',temp]);shutil.copy2(temp,video)
mix(root/'promo/queda.mp4',[('throw-0.ogg',.2),('engine-0.ogg',3.1),('coins-0.ogg',3.2)],6)
mix(root/'revisao/falesia/jogo-30s.mp4',[('plop-0.ogg',3.1),('escape-0.ogg',8.1),('coins-0.ogg',8.2),('cargo-0.ogg',17)],30)
captures=sorted(Path(tempfile.gettempdir()).glob('ganza-capture-*'),key=lambda p:p.stat().st_mtime)
source=captures[-1] if captures else None
if source:
 for name in ['queda','carga']:
  directory=source/name;files=sorted(directory.glob('*.png'))
  if not files:continue
  first=Image.open(files[0]).convert('RGB')
  for j,path in enumerate(files[-6:]):
   image=Image.open(path).convert('RGB');u=(j+1)/6;u=u*u*(3-2*u);Image.blend(image,first,u).save(path)
  target=root/'promo'/('queda.gif' if name=='queda' else 'carga-completa.gif')
  run(['-framerate',12,'-i',directory/'%05d.png','-filter_complex','scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse','-loop',0,target])
image=Image.open(root/'revisao/capa-runtime.png');image.save(root/'promo/capa.webp',quality=92)
shutil.copy2(root/'promo/capa.webp',root.parents[1]/'assets/casino/covers/ganza.webp');shutil.copy2(root/'revisao/capa-runtime.png',root/'revisao/style-frame-final.png')
results={}
for name in ['queda.gif','carga-completa.gif']:
 im=Image.open(root/'promo'/name);duration=0
 for i in range(im.n_frames):im.seek(i);duration+=im.info.get('duration',0)
 results[name]={'size':im.size,'frames':im.n_frames,'durationMs':duration,'bytes':(root/'promo'/name).stat().st_size}
probe=ff.with_name('ffprobe.exe')
for path in [root/'promo/queda.mp4',root/'revisao/falesia/jogo-30s.mp4']:
 p=subprocess.run([str(probe),'-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,r_frame_rate','-of','json',str(path)],capture_output=True,text=True,check=True);results[path.name]=json.loads(p.stdout)
(root/'revisao/media-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(results),flush=True)
