"""Reproducible CC0 foley compositions. Requires a local FFmpeg, no cloud service."""
from pathlib import Path
import tempfile,subprocess,array,math,wave,json,sys
root=Path(__file__).resolve().parents[1];src=root/'art-src/audio';out=root/'ui/audio';out.mkdir(exist_ok=True)
ff=Path(tempfile.gettempdir())/'ganza-tools/ffmpeg.exe';sr=24000
def run(args):
 p=subprocess.run([str(ff),'-hide_banner','-loglevel','error','-y']+list(map(str,args)),capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 return p.stdout
def decode(path):
 a=array.array('f');a.frombytes(run(['-i',path,'-ac','1','-ar',sr,'-f','f32le','pipe:1']));return a
cache={}
def sound(path):
 if path not in cache:cache[path]=decode(src/path)
 return cache[path]
manifest=[]
def export(name,layers,duration,loop=False,provisional=False):
 data=array.array('f',[0.]*(int(sr*duration)))
 for path,gain,offset,rate in layers:
  a=sound(path);start=int(offset*sr)
  for i in range(min(len(data)-start,int(len(a)/rate))):data[start+i]+=a[min(len(a)-1,int(i*rate))]*gain
 # Fade boundaries, make loops continuous and remove subsonic energy during normalization.
 fade=int(sr*(.12 if loop else .015))
 for i in range(min(fade,len(data)//2)):data[i]*=i/fade;data[-i-1]*=i/fade
 raw=out/(name+'.raw');raw.parent.mkdir(exist_ok=True,parents=True);raw.write_bytes(data.tobytes())
 norm=out/(name+'.wav');run(['-f','f32le','-ar',sr,'-ac','1','-i',raw,'-af','highpass=f=35,loudnorm=I=-16:TP=-1.5:LRA=7','-ar','44100',norm])
 run(['-i',norm,'-c:a','libvorbis','-q:a','4',out/(name+'.ogg'),'-c:a','libmp3lame','-q:a','3',out/(name+'.mp3')]);raw.unlink();norm.unlink()
 manifest.append({'name':name,'sources':[str(x[0]) for x in layers],'provisional':provisional,'duration':duration,'normalization':'FFmpeg loudnorm I=-16 TP=-1.5 LRA=7'})
if '--motors-only' in sys.argv:
 old=json.loads((out/'manifest.json').read_text(encoding='utf-8'))
 for i in range(4):
  export(f'engine-{i}',[('steamboat_engine.wav',.9,0,.85+i*.08),(f'water-splash-slime-sfx/splash_{i+9:02}.ogg',.6,0,1)],2.6)
  export(f'escape-{i}',[('steamboat_engine.wav',.9,0,1.1+i*.05),('bicycle-horn-1.wav',.25,.25,.7+i*.05),(f'water-splash-slime-sfx/splash_{i+1:02}.ogg',.7,.1,1)],3.8)
 old=[m for m in old if not m['name'].startswith(('engine-','escape-'))]+manifest
 (out/'manifest.json').write_text(json.dumps(old,indent=2),encoding='utf-8')
 print('Oito efeitos refeitos com fonte CC0 de motor marítimo.',flush=True)
 raise SystemExit
for i in range(4):
 v=i+1
 export(f'wrap-{i}',[(f'MoreSounds/Plastic/Plastic_{v:02}.wav',1,0,1)],.6)
 export(f'throw-{i}',[(f'rpg-audio/Audio/cloth{v}.ogg',.8,0,1.3),(f'casino-audio/Audio/card-slide-{v}.ogg',.4,.03,1)],.45)
 export(f'pin-{i}',[(f'impact-sounds/Audio/impactWood_medium_{i:03}.ogg',.8,0,.88),(f'impact-sounds/Audio/impactSoft_medium_{i:03}.ogg',.7,0,1)],.45)
 export(f'plop-{i}',[(f'water-splash-slime-sfx/splash_{v:02}.ogg',1,0,.72)],1.0)
 export(f'splash-{i}',[(f'water-splash-slime-sfx/splash_{v+4:02}.ogg',1,0,1),(f'impact-sounds/Audio/impactSoft_heavy_{i:03}.ogg',.6,.05,1)],1.5)
 export(f'engine-{i}',[('underwater_or_space_engine_0.ogg',.8,i*.08,.8+i*.08),(f'water-splash-slime-sfx/splash_{v+8:02}.ogg',.6,0,1)],2.6,provisional=True)
 export(f'escape-{i}',[('underwater_or_space_engine_0.ogg',.7,0,1.1+i*.05),('bicycle-horn-1.wav',.3,.25,.65+i*.05),(f'water-splash-slime-sfx/splash_{v:02}.ogg',.6,.1,1)],3.8,provisional=True)
 export(f'cargo-{i}',[('applause_fireworks.mp3',.8,0,1+i*.015),('bicycle-horn-1.wav',.3,.5+i*.12,.7)],7)
 export(f'waves-{i}',[(f'wave_0{v}_cc0-18363__jasinski__alkaibeach.flac',.8,0,1),(f'rpg-audio/Audio/creak{(i%3)+1}.ogg',.1,1,1)],5,loop=True)
 export(f'ui-{i}',[(f'interface-sounds/Audio/click_{v:03}.ogg',1,0,1)],.25)
 export(f'coins-{i}',[(f'MoreSounds/Money/Money_{v:02}.wav',1,0,1)],.9)
 print('Variação',i+1,'exportada',flush=True)
# Development-only synchronized guide layers. Not a generated final soundtrack.
music=out/'music';music.mkdir(exist_ok=True)
for layer in ['base','activity','high']:
 name='music/'+layer;data=array.array('f');duration=24
 for i in range(sr*duration):
  t=i/sr;beat=t/.75;phase=beat%1
  if layer=='base':value=.12*math.sin(2*math.pi*73.4162*t)*min(1,phase*50)*math.exp(-phase*4)
  elif layer=='activity':value=.035*math.sin(2*math.pi*1174.66*t)*math.exp(-(beat*2%1)*18)
  else:value=.025*(math.sin(2*math.pi*293.6648*t)+math.sin(2*math.pi*349.228*t))*math.sin(math.pi*phase)**2
  data.append(value)
 raw=music/(layer+'.raw');raw.write_bytes(data.tobytes());run(['-f','f32le','-ar',sr,'-ac','1','-i',raw,'-af','loudnorm=I=-20:TP=-3:LRA=7','-ar','44100','-c:a','libvorbis','-q:a','4',music/(layer+'.ogg'),'-c:a','libmp3lame','-q:a','3',music/(layer+'.mp3')]);raw.unlink()
 manifest.append({'name':name,'sources':['Original simple development guide, 80 BPM D minor'],'provisional':True,'duration':24})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('44 efeitos, 3 guias provisórios e manifesto preparados.')
