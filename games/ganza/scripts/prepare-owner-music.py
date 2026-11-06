from pathlib import Path
import array,math,json,subprocess,tempfile,shutil
root=Path(__file__).resolve().parents[1];music=root/'ui/audio/music';originals=root/'art-src/music-owner';originals.mkdir(parents=True,exist_ok=True)
ff=Path(tempfile.gettempdir())/'ganza-tools/ffmpeg.exe';probe=ff.with_name('ffprobe.exe')
def run(args):
    result=subprocess.run([str(ff),'-hide_banner','-nostdin','-y']+list(map(str,args)),capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
    return result
def inspect(path):
    duration=float(json.loads(subprocess.check_output([str(probe),'-v','error','-show_entries','format=duration','-of','json',str(path)]))['format']['duration'])
    raw=run(['-v','error','-i',path,'-ac','1','-ar','12000','-f','s16le','pipe:1']).stdout;samples=array.array('h',raw);db=[]
    for i in range(0,len(samples)-240,240):
        block=samples[i:i+240];db.append(20*math.log10(max(1,math.sqrt(sum(n*n for n in block)/240))/32768))
    onset=next((i*.02 for i in range(len(db)-5) if min(db[i:i+5])>-40),0)
    end=next((min(duration,(i+1)*.02+.12) for i in range(len(db)-1,-1,-1) if db[i]>-45),duration)
    return duration,db,max(0,onset-.04),end
def encode(source,name,start,end,loop):
    duration=end-start;filter=f'atrim=start={start:.4f}:end={end:.4f},asetpts=PTS-STARTPTS'
    if loop:
        fade=.35;body=duration-fade
        filter+=f',asplit=3[a][b][c];[a]atrim=start={fade}:end={body},asetpts=PTS-STARTPTS[body];[b]atrim=start={body},asetpts=PTS-STARTPTS[tail];[c]atrim=end={fade},asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d={fade}:c1=qsin:c2=qsin[join];[body][join]concat=n=2:v=0:a=1'
    else:filter+=f',afade=t=in:d=0.025,afade=t=out:st={max(0,duration-.25):.4f}:d=0.25'
    filter+=',loudnorm=I=-18:TP=-2:LRA=9,aresample=44100[out]'
    for ext,args in [('ogg',['-c:a','libvorbis','-q:a','5']),('mp3',['-c:a','libmp3lame','-b:a','160k'])]:run(['-v','error','-i',source,'-filter_complex',filter,'-map','[out]','-ac','2',*args,music/f'{name}.{ext}'])
    return float(json.loads(subprocess.check_output([str(probe),'-v','error','-show_entries','format=duration','-of','json',str(music/f'{name}.ogg')]))['format']['duration'])
report=[]
for source_name,name,kind in [('atividade.opus','activity','cue'),('premio_alto.opus','high','cue'),('vinheta_ganza.opus','stinger-max','stinger'),('vinheta_carga_completa.opus','stinger-carga','stinger')]:
    source=music/source_name;shutil.copy2(source,originals/source.name);duration,db,onset,end=inspect(source)
    if kind=='cue':
        # Pick the nearby audible attack in the requested energetic section.
        candidates=range(int(9.5/.02),min(len(db)-1,int(10.5/.02)));attack=max(candidates,key=lambda i:db[i]-sum(db[max(0,i-5):i])/max(1,min(i,5)));start=max(onset,attack*.02-.03)
    else:start=onset
    output=encode(source,name,start,end,kind=='cue');report.append({'source':source_name,'output':name,'sourceDuration':duration,'detectedOnset':onset,'cutStart':round(start,3),'cutEnd':round(end,3),'duration':output,'loopCrossfadeSeconds':.35 if kind=='cue' else 0})
config={'mode':'cues','provisional':True,'basePending':True,'layers':['base','activity','high'],'stingers':['stinger-max','stinger-carga'],'crossfadeSeconds':1.2,'highSeconds':24,'tracks':report}
(music/'config.json').write_text(json.dumps(config,indent=2),encoding='utf-8');(root/'revisao/music-owner-cuts.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
