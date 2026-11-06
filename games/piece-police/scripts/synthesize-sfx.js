/** Reproducible original DSP, no samples, network or external dependencies. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sounds } from '../ui/audio-catalog.js';
const root = new URL('../ui/audio/', import.meta.url);
export const sampleRate = 24000;
const tau = Math.PI * 2;
export function synthesize(id, spec, variant = 0) {
  const length=Math.ceil(spec.duration*sampleRate),data=new Float32Array(length);
  let seed=[...id].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,7919+variant);
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
  const root=146.8323839587,note=n=>root*2**(n/12);
  // Every source has its own envelope, filter and gesture. No global pitched beep.
  function render(start,duration,fn) {
    const from=Math.max(0,Math.round(start*sampleRate)),count=Math.round(duration*sampleRate);
    for(let n=0;n<count&&from+n<length;n++) {
      const t=n/sampleRate,p=n/Math.max(1,count-1);
      data[from+n]+=fn(t,p)*Math.min(1,n/24,(count-1-n)/96);
    }
  }
  function tone(start,duration,freq,end=freq,amp=.4,shape='sine',decay=3) {
    let phase=0,filtered=0;
    render(start,duration,(t,p)=>{
      phase+=tau*freq*(end/freq)**p/sampleRate;
      let x=Math.sin(phase);
      if(shape==='fm')x=Math.sin(phase+5*(1-p)*Math.sin(phase*1.47));
      if(shape==='acid') {
        x=0;for(let h=1;h<=7;h++)x+=Math.sin(phase*h)/h;
        filtered+=(.07+.55*(1-p)**3)*(x-filtered);x=Math.tanh(filtered*1.5);
      }
      if(shape==='triangle')x=2/Math.PI*Math.asin(x);
      return x*amp*Math.exp(-p*decay)*Math.min(1,(1-p)*10);
    });
  }
  function air(start,duration,amp=.35,lo=300,hi=3200,reverse=false,flutter=0) {
    let upper=0,lower=0;
    const a=1-Math.exp(-tau*hi/sampleRate),b=1-Math.exp(-tau*lo/sampleRate);
    render(start,duration,(t,p)=>{
      upper+=a*(random()-upper);lower+=b*(upper-lower);
      const envelope=reverse?(.12+.88*p*p)*Math.min(1,(1-p)*15):Math.exp(-p*3)*Math.min(1,(1-p)*8);
      return (upper-lower)*amp*envelope*(flutter?(.5+.5*Math.cos(tau*t*flutter)):1);
    });
  }
  function metal(start,duration,freq=550,amp=.4,material='glass') {
    const ratios=material==='glass'?[1,2.32,4.11,6.73]:material==='wood'?[1,1.58,2.91]:[1,1.414,2.77,4.19];
    render(start,duration,(t,p)=>{
      let sum=0;
      ratios.forEach((r,j)=>{
        if(freq*r<5700)sum+=Math.sin(tau*freq*r*t)*Math.exp(-t*(material==='wood'?55+j*20:9+j*7))/(1+j*1.3);
      });return sum*amp*Math.min(1,(1-p)*12);
    });
    air(start,.012,amp*.4,1100,4800);
  }
  function pluck(start,duration,freq=note(12),amp=.5,damping=.986) {
    const ring=new Float32Array(Math.max(4,Math.round(sampleRate/freq)));
    for(let j=0;j<ring.length;j++)ring[j]=random();
    let index=0;
    render(start,duration,(t,p)=>{
      const value=ring[index],next=(index+1)%ring.length;
      ring[index]=(value+ring[next])*.5*damping;index=next;
      return value*amp*Math.min(1,(1-p)*10);
    });
  }
  function kick(start=0,amp=.65,duration=.19) {
    tone(start,duration,145,42,amp,'sine',4);air(start,.018,amp*.35,150,1800);
  }
  function clap(start,amp=.45) {
    [0,.012,.027].forEach((offset,i)=>air(start+offset,.035+i*.013,amp/(1+i*.4),700,4100));
    tone(start,.07,190,140,amp*.2,'triangle',6);
  }
  function bubble(start,size=.1,amp=.5) {
    tone(start,size,580-size*1300,70+size*400,amp,'fm',4);
    air(start+size*.45,size*.35,amp*.3,500,1900);
  }
  function droplets(start,duration=.3,amp=.4) {
    for(let j=0;j<6;j++)bubble(start+duration*j/7,.025+.018*(j%3),amp/(1+j*.22));
    air(start,duration,amp*.4,400,1600);
  }
  function valve(start=0,duration=.5,amp=.5) {
    metal(start,.07,230,amp*.8,'chrome');air(start+.025,duration*.72,amp*1.7,470,3400,false,23);
    metal(start+duration*.76,.09,155,amp*.4,'wood');
  }
  function glitch(start=0,duration=.4,amp=.45,reverse=false) {
    const offsets=[0,.055,.083,.16,.245,.29,.35];
    offsets.forEach((offset,j)=>{
      const at=offset/.4*duration, pitch=note((reverse?[19,12,7,3,0,-12,0]:[0,19,-12,7,3,24,0])[j]);
      tone(start+at,.018+(j%3)*.016,pitch,pitch*(j%2?.7:1.3),amp/(1+j*.12),'fm',2);
      if(j%2===0)air(start+at,.012,amp*.55,1600,4300);
    });
  }
  function chord(start,duration,notes,amp=.5,shape='acid') {
    notes.forEach((n,j)=>tone(start+j*.004,duration,note(n),note(n),amp/Math.sqrt(notes.length),shape,3.5));
  }
  function breakbeat(start=0,amp=.6,spacing=.12) {
    kick(start,amp,.17);clap(start+spacing,amp*.7);
    tone(start+spacing*1.65,.07,110,60,amp*.6,'triangle',5);
    air(start+spacing*2,.055,amp*.5,2400,5100);clap(start+spacing*2.75,amp*.5);
  }
  // Explicit gestures, not a hash-to-note mapping. Fusion arrangements are composed separately.
  switch(id) {
    case 'click':metal(0,.04,180,.8,'wood');air(0,.009,.2,1400,4200);break;
    case 'bet-step':metal(0,.025,700,.5,'chrome');metal(.024,.025,220,.4,'wood');break;
    case 'dialog-open':air(0,.16,.75,450,2600,true);metal(.13,.04,300,.3,'wood');break;
    case 'dialog-close':metal(0,.045,120,.65,'wood');air(.015,.1,.6,180,1700);break;
    case 'speed':[0,.055,.083].forEach((s,i)=>air(s,.025,.6+i*.15,700,2400+i*500));break;
    case 'auto-start':[0,.07,.115,.145].forEach((s,i)=>metal(s,.035,130+i*30,.7,'wood'));air(0,.17,.4,300,1900,true);break;
    case 'auto-stop':air(0,.12,.9,200,2400);metal(.1,.035,160,.7,'wood');break;
    case 'overlay':air(0,.2,.9,700,2900,true);pluck(.025,.15,note(19),.23,.97);break;
    case 'spin-press':tone(0,.21,210,55,.6,'fm',5);air(.01,.18,.7,300,2200,true);metal(.12,.08,135,.4,'wood');break;
    case 'hunt-on':metal(0,.04,600,.4,'chrome');air(.03,.16,.7,1100,3500,true,43);pluck(.13,.1,note(19),.45);break;
    case 'hunt-off':metal(0,.04,210,.6,'wood');air(.015,.18,.6,350,1800);tone(.02,.14,350,80,.2,'triangle');break;
    case 'buy':metal(0,.22,430,.65,'chrome');metal(.15,.16,670,.45,'chrome');metal(.32,.12,170,.55,'wood');break;
    case 'column-land':metal(0,.1,105,.8,'wood');tone(0,.1,95,47,.35);air(0,.035,.35,250,1500);break;
    case 'cascade-land':[0,.027,.065,.11].forEach((s,i)=>metal(s,.09,120+i*63,.65-i*.1,'wood'));air(.015,.18,.4,500,2200);break;
    case 'cluster-clear':for(let j=0;j<10;j++)air(j*.018,.018+j*.003,.65*(1-j/12),600+j*80,3000);break;
    case 'scatter-land':metal(0,.38,note(24),.6,'glass');pluck(.025,.28,note(19),.25,.991);break;
    case 'wild-land':droplets(0,.23,.4);tone(0,.2,240,75,.45,'fm');break;
    case 'multiplier-up':tone(0,.23,root,root*2,.45,'acid',2);air(0,.17,.25,900,3300,true,55);break;
    case 'win-small':metal(0,.09,170,.7,'wood');air(.012,.1,.25,300,1200);break;
    case 'win-medium':pluck(0,.28,note(7),.6,.987);metal(.02,.08,95,.35,'wood');break;
    case 'count-tick':air(0,.022,.8,1400,3800);metal(0,.025,260,.3,'wood');break;
    case 'count-end':metal(0,.07,190,.4,'wood');pluck(.025,.3,note(12),.65,.991);break;
    case 'weed-hold':bubble(0,.18,.7);tone(0,.19,64,48,.3,'sine',2);break;
    case 'group-grow':bubble(0,.045,.35);bubble(.035,.075,.5);bubble(.085,.11,.8);break;
    case 'group-release':tone(0,.17,160,38,.7,'fm',2);air(.035,.13,.7,150,1200);break;
    case 'awaken-WEED':tone(0,.55,78,49,.6,'acid',2);[0,.12,.3,.48,.64].forEach((s,i)=>bubble(s,.06+i*.02,.45));break;
    case 'alcohol-step':metal(0,.17,670,.65,'glass');bubble(.07,.045,.35);break;
    case 'awaken-ALCOOL':metal(0,.4,480,.65,'glass');droplets(.06,.56,.6);metal(.46,.2,740,.25,'glass');break;
    case 'copium-ready':metal(0,.055,165,.65,'chrome');metal(.075,.06,340,.4,'wood');air(.035,.1,.4,900,2500);break;
    case 'copium-respin':valve(0,.5,.6);air(.35,.23,.5,250,1900,true);metal(.53,.07,220,.5,'wood');break;
    case 'awaken-COPIUM':metal(0,.14,190,.7,'chrome');air(.025,.65,1.1,500,3100,false,9);metal(.56,.2,340,.3,'chrome');break;
    case 'mdma-pull':air(0,.14,1,500,2800,true);kick(.125,.6,.07);break;
    case 'awaken-MDMA':breakbeat(0,.7,.145);kick(.44,.5,.18);clap(.61,.45);break;
    case 'lcd-transform':glitch(0,.39,.6);break;
    case 'awaken-LCD':glitch(0,.3,.7,true);air(.23,.23,.8,1200,3800,true);glitch(.42,.24,.5);break;
    case 'calmer-sweep':air(0,.19,1,100,950);tone(0,.14,120,48,.3,'triangle');break;
    case 'calmer-enter':air(0,.49,.9,140,2100,false,5);tone(0,.4,240,45,.4,'triangle',2);metal(.46,.13,90,.65,'wood');break;
    case 'joiner-land':metal(0,.4,185,.7,'chrome');kick(0,.6,.16);metal(.09,.28,425,.2,'chrome');break;
    case 'joiner-enter':breakbeat(0,.65,.13);metal(.36,.4,350,.5,'chrome');tone(.35,.35,73.416,73.416,.4,'acid');break;
    case 'party-on':clap(0,.65);chord(.015,.4,[0,3,7],.7);kick(.24,.55);chord(.4,.36,[7,10,14],.5);break;
    case 'chemistry-up':pluck(0,.5,root,.65,.995);pluck(.11,.4,note(7),.5,.993);air(0,.38,.3,550,1700,true);break;
    case 'corner-open':metal(0,.1,720,.3,'chrome');metal(.075,.11,320,.6,'chrome');[.2,.235,.29,.38,.49].forEach((s,i)=>metal(s,.15,210+i*83,.6-i*.07,'chrome'));break;
    case 'win-big':kick(0,.5);chord(0,.55,[0,3,7],.6);clap(.23,.3);chord(.46,.7,[3,7,12],.4);break;
    case 'win-huge':breakbeat(0,.6,.13);chord(.02,.3,[-12,0,7],.55);chord(.36,.4,[0,3,10],.65);chord(.78,.6,[0,7,12],.5);break;
    case 'win-epic':breakbeat(0,.65,.14);[0,.24,.48,.72,1].forEach((s,i)=>tone(s,.35,note([-12,-5,0,3,7][i]),note([-12,-5,0,3,7][i]),.6,'acid'));chord(.95,.75,[0,3,7,12],.6);break;
    case 'max-win':kick(0,.8,.35);metal(0,.7,root,.5,'chrome');air(.02,.7,.55,300,3100,true);chord(.15,1.3,[-12,0,7,12],.55,'triangle');[.65,.8,1].forEach((s,i)=>metal(s,.75,note(12+i*7),.25,'glass'));break;
    case 'bonus-after':chord(0,.45,[0,3,7],.65);clap(.2,.35);chord(.48,.55,[3,7,10],.5);for(let j=0;j<6;j++)air(j*.15,.06,.35,2200,4500);pluck(.87,.4,note(12),.4);break;
    case 'bonus-vip':tone(0,.58,73.416,73.416,.7,'acid',2);metal(.02,.6,185,.4,'chrome');chord(.36,.5,[-12,0,3],.5,'triangle');kick(.65,.5);metal(.83,.55,310,.3,'chrome');break;
    case 'bonus-police':breakbeat(0,.65,.135);breakbeat(.55,.5,.11);[0,.23,.44,.75,1.02].forEach((s,i)=>tone(s,.3,note([-12,0,7,0,12][i]),note([-12,0,7,0,12][i]),.55,'acid',2));break;
    case 'retrigger':kick(0,.5,.13);pluck(.025,.3,note(7),.5);kick(.22,.45,.12);pluck(.25,.45,note(12),.6,.994);break;
    case 'bonus-summary':metal(0,.15,120,.25,'wood');[0,.25,.5].forEach((s,i)=>pluck(s,.6,note([12,7,0][i]),.5,.994));air(.15,.8,.3,200,1200);break;
    case 'total-chemistry':bubble(0,.15,.4);metal(.12,.35,520,.35,'glass');valve(.23,.35,.3);clap(.4,.35);glitch(.5,.25,.3);chord(.66,.7,[0,3,7,12],.65);kick(.65,.5);break;
    case 'fusion-NEVER_ENDING_DREAM':
      [0,.11,.24,.5,.64].forEach((s,i)=>bubble(s,.07+i*.013,.5));air(.05,.4,.8,450,2200,false,12);air(.5,.48,.7,220,1700,true,8);break;
    case 'fusion-ONE_MORE_ROUND':
      valve(0,.26,.4);[.1,.28,.43,.57,.66].forEach((s,i)=>metal(s,.23,600-i*55,.6-i*.08,'glass'));bubble(.73,.12,.3);break;
    case 'fusion-SLOW_DISASTER':
      metal(0,.3,480,.5,'glass');[.045,.12,.27,.51,.73].forEach((s,i)=>bubble(s,.025+i*.024,.6-i*.05));air(.1,.7,.35,250,1500);break;
    case 'fusion-RAVE_DIMENSION':
      kick(0,.65);glitch(.02,.17,.4);clap(.19,.5);tone(.32,.1,73.416,73.416,.6,'acid');glitch(.42,.23,.6,true);clap(.68,.4);break;
    case 'fusion-TOTAL_MAYHEM':
      kick(0,.7);[.02,.14,.39,.48,.7].forEach((s,i)=>metal(s,.16,380+i*90,.45,'glass'));clap(.2,.6);kick(.36,.5);clap(.64,.55);droplets(.72,.15,.3);break;
    case 'fusion-FROZEN_REALITY':
      glitch(0,.16,.5,true);chord(.065,.88,[0,7,12],.4,'triangle');metal(.03,.9,note(19),.3,'glass');air(.7,.3,.3,1500,3500);break;
    case 'fusion-FREEZE_AND_FREAK':
      bubble(0,.18,.65);tone(.05,.7,55,55,.4,'fm',.7);clap(.21,.5);kick(.35,.5);clap(.53,.45);bubble(.7,.13,.45);break;
    case 'fusion-DREAM_GLITCH':
      valve(0,.34,.5);air(.15,.48,.7,700,3300,false,31);glitch(.3,.28,.5,true);glitch(.64,.26,.4);break;
    case 'fusion-ONE_MORE_RAVE':
      valve(0,.23,.55);breakbeat(.17,.65,.14);air(.46,.25,.4,700,2100,true);kick(.73,.55,.15);clap(.79,.35);break;
    case 'fusion-DOUBLE_VISION':
      [0,.065,.28,.37,.6,.68].forEach((s,i)=>metal(s,.29,note(i%2?19:12),.6-i*.065,'glass'));glitch(.16,.11,.25);glitch(.51,.15,.2,true);break;
    default:throw Error(`Sem composição sonora: ${id}`);
  }
  // Remove DC and soften the very top, preserving the different material transients.
  let peak=0,previous=0,dc=0,filtered=0;
  for(let i=0;i<length;i++) {
    const high=data[i]-previous+.997*dc;previous=data[i];dc=high;
    filtered+=.72*(high-filtered);
    data[i]=filtered*Math.min(1,i/36,(length-1-i)/144);
    peak=Math.max(peak,Math.abs(data[i]));
  }
  const level=spec.gain/(peak||1);
  for(let i=0;i<length;i++)data[i]*=level;
  return data;
}
export function wav(data) {
  const out=Buffer.alloc(44+data.length*2);
  out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);
  out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(sampleRate,24);out.writeUInt32LE(sampleRate*2,28);
  out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(data.length*2,40);
  data.forEach((v,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return out;
}
export async function generate() {
  await mkdir(new URL('sfx/',root),{recursive:true});
  const assets={};let bytes=0;
  for(const [id,spec] of Object.entries(sounds)) {
    const buffer=wav(synthesize(id,spec));bytes+=buffer.length;
    await writeFile(new URL(spec.file,root),buffer);
    assets[id]={...spec, origin:'Síntese DSP local original',license:'Criado para este projeto, sem samples de terceiros',sampleRate,channels:1,bytes:buffer.length};
  }
  await writeFile(new URL('sfx/manifest.json',root),JSON.stringify({version:2,assets},null,2)+'\n');
  console.log(`${Object.keys(assets).length} efeitos originais, ${bytes} bytes PCM WAV, 24 kHz mono.`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await generate();
