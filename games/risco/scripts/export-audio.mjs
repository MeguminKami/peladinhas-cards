import { mkdir, writeFile } from 'node:fs/promises';
import { SOUNDS, synthesize } from '../ui/synth.js';
// EBU R128 integrated loudness, 48 kHz K-weighting, 400 ms blocks / 100 ms hops.
function filter(data,b,a){const out=new Float64Array(data.length);for(let i=0;i<data.length;i++)out[i]=b[0]*data[i]+(i>0?b[1]*data[i-1]-a[1]*out[i-1]:0)+(i>1?b[2]*data[i-2]-a[2]*out[i-2]:0);return out;}
function loudness(data){
  const shelf=filter(data,[1.53512485958697,-2.69169618940638,1.19839281085285],[1,-1.69065929318241,.73248077421585]);
  const weighted=filter(shelf,[1,-2,1],[1,-1.99004745483398,.99007225036621]);
  const energies=[];const size=19200,hop=4800;
  // Very short UI sounds are zero-padded to one measurement block.
  for(let start=0;start<Math.max(hop,weighted.length-size+hop);start+=hop){let sum=0;for(let i=start;i<start+size;i++)sum+=(weighted[i]||0)**2;energies.push(sum/size);}
  const toLUFS=e=>-.691+10*Math.log10(Math.max(e,1e-20));
  const absolute=energies.filter(e=>toLUFS(e)>-70);const mean=values=>values.reduce((a,b)=>a+b,0)/Math.max(1,values.length);
  const gate=toLUFS(mean(absolute))-10;return toLUFS(mean(absolute.filter(e=>toLUFS(e)>gate)));
}
const target=new URL('../ui/audio/',import.meta.url);await mkdir(target,{recursive:true});
const report={rate:48000,targetLUFS:-16,sounds:{}};
for(const name of Object.keys(SOUNDS)){
  const data=synthesize(name);let lufs=loudness(data),gain=10**((-16-lufs)/20);
  // A gentle peak-safe limiter, then measure the actual rendered file.
  for(let i=0;i<data.length;i++)data[i]=Math.max(-.98,Math.min(.98,data[i]*gain));
  lufs=loudness(data);
  const bytes=Buffer.alloc(44+data.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(48000,24);bytes.writeUInt32LE(96000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(data.length*2,40);
  for(let i=0;i<data.length;i++)bytes.writeInt16LE(Math.round(data[i]*32767),44+i*2);
  await writeFile(new URL(name+'.wav',target),bytes);report.sounds[name]={seconds:data.length/48000,lufs:Number(lufs.toFixed(2))};
  report.sounds[name].peak=data.reduce((peak,v)=>Math.max(peak,Math.abs(v)),0);
}
await writeFile(new URL('normalization.json',target),JSON.stringify(report,null,2)+'\n');
console.log(Object.keys(SOUNDS).length+' efeitos originais exportados em WAV, medição K-weighted e gating a −16 LUFS.');
