"""Extract the generated identity-referenced key poses and export a 20-second review loop."""
from pathlib import Path
from PIL import Image
import shutil,tempfile,subprocess,json
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/Joao/.codex/generated_images/01a1ada9-1944-72c0-a346-45b276749006/exec-6c8c3775-fd63-45f2-b1ba-399765c10afb.png')
master=root/'art-src/weed-smoking-sheet.png';shutil.copy2(source,master)
sheet=Image.open(master).convert('RGBA');w,h=sheet.size;cw,ch=w//4,h//3
poses=[sheet.crop(((i%4)*cw,(i//4)*ch,(i%4+1)*cw,(i//4+1)*ch)) for i in range(12)]
durations=[1200,600,800,1600,600,1800,2400,2200,2000,800,2000,4000]
assert sum(durations)==20000
out=root/'revisao';out.mkdir(exist_ok=True);shutil.copy2(master,out/'weed-fumar-folha.png')
temp=Path(tempfile.mkdtemp(prefix='ganza-smoking-'));ff=Path(tempfile.gettempdir())/'ganza-tools/ffmpeg.exe'
def pose_at(t):
 elapsed=0
 for i,d in enumerate(durations):
  elapsed+=d
  if t<elapsed:return i
 return 0
for frame in range(42):
 image=Image.new('RGBA',(cw,ch),'#fff5df');image.alpha_composite(poses[pose_at((frame*500)%20000)]);image.convert('RGB').save(temp/f'{frame:03}.png')
def run(args):
 p=subprocess.run([str(ff),'-hide_banner','-loglevel','error','-y']+list(map(str,args)),capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
run(['-framerate','2','-i',temp/'%03d.png','-vf','minterpolate=fps=12:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1','-t','20','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',out/'weed-fumar-20s.mp4'])
run(['-i',out/'weed-fumar-20s.mp4','-filter_complex','fps=12,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',out/'weed-fumar-20s.gif'])
# Preserve alpha and the original hand-drawn key poses for the game renderer.
poses[0].save(out/'weed-fumar-20s.webp',save_all=True,append_images=poses[1:],duration=durations,loop=0,quality=90)
gif=Image.open(out/'weed-fumar-20s.gif');total=0
for i in range(gif.n_frames):gif.seek(i);total+=gif.info.get('duration',0)
# GIF has 10 ms resolution. Correct any encoder duration quantization to exactly 20 s.
if total!=20000:
 frames=[];times=[]
 for i in range(gif.n_frames):gif.seek(i);frames.append(gif.copy());times.append(gif.info.get('duration',80))
 times[-1]+=20000-sum(times)
 frames[0].save(out/'weed-fumar-20s.gif',save_all=True,append_images=frames[1:],duration=times,loop=0,optimize=False)
 total=sum(times)
(out/'weed-fumar-info.json').write_text(json.dumps({'source':master.name,'keyPoses':12,'durationMs':total,'fps':12,'reviewOnly':True,'interpolation':'FFmpeg motion-compensated for GIF and MP4. WebP preserves original alpha key poses.','faceReference':'Two owner-specified photographs, never copied to public game assets.'},indent=2),encoding='utf-8')
print('GIF e MP4 de 20 s, WebP com alpha e folha de poses preparados.',flush=True)
