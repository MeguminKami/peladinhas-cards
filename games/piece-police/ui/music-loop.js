/** Local analysis and seamless loop preparation, independent of game logic. */
export const musicFiles = {
  base:'base.mp3', hunt:'maisscatters.mp3', afterparty:'afterparty.mp3',
  vip:'vipafterparty.mp3', police:'policeparty.mp3',
};
const bpm = {base:126,hunt:126,afterparty:128,vip:132,police:138};

export function analyzeLoop(buffer,mode) {
  const sr=buffer.sampleRate,data=buffer.getChannelData(0),hop=Math.round(sr*.02),env=[];
  for(let i=0;i<data.length;i+=hop){let sum=0;const n=Math.min(hop,data.length-i);for(let j=0;j<n;j++)sum+=data[i+j]**2;env.push(Math.sqrt(sum/n));}
  const maximum=Math.max(...env),threshold=maximum*.16;
  let first=env.findIndex(v=>v>threshold),last=env.length-1;
  while(last>first&&env[last]<threshold)last--;
  if(first<0||last-first<100)throw Error('Faixa demasiado curta ou silenciosa');
  const step=hop/sr,available=(last-first)*step,window=50;
  let best=null;
  // Match both level and the rhythmic envelope near the seam. Exclude quiet intros/outros.
  const begin=first+Math.round(.1/step),end=Math.min(first+Math.round(15/step),last-window-12);
  const tailBegin=Math.max(first+Math.round(available*.7/step),last-Math.round(20/step));
  for(let a=begin;a<=end;a+=2)for(let b=tailBegin;b+window<last;b+=2) {
    if(b<=a+100)continue;
    let difference=0,energy=0;
    for(let k=0;k<window;k++){difference+=(env[a+k]-env[b+k])**2;energy+=env[a+k]**2+env[b+k]**2;}
    if(energy/window<maximum*maximum*.12)continue;
    const score=difference/(energy+1e-9)+((a-first)+(last-b))*.00004;
    if(!best||score<best.score)best={start:a*step,end:b*step,score};
  }
  if(!best)best={start:(first+5)*step,end:(last-10)*step,score:null};
  if(best.end-best.start<2)throw Error('Sem trecho estável para loop');
  return {duration:buffer.duration,loopStart:+best.start.toFixed(4),loopEnd:+best.end.toFixed(4),
    seamSeconds:.16,method:'Trecho sem intro/outro silenciosos, junção por envelope e sobreposição de 160 ms',
    requestedBpm:bpm[mode],measuredBpm:null};
}

export function prepareLoop(context,source,spec) {
  const sr=source.sampleRate,start=Math.round(spec.loopStart*sr),end=Math.round(spec.loopEnd*sr);
  if(start<0||end<=start||end+Math.ceil(spec.seamSeconds*sr)>source.length)throw Error('Limites de loop inválidos');
  const size=end-start,seam=Math.min(Math.round(spec.seamSeconds*sr),Math.floor(size/4));
  const out=context.createBuffer(source.numberOfChannels,size,sr);
  let energy=0,peak=0;
  for(let ch=0;ch<source.numberOfChannels;ch++) {
    const input=source.getChannelData(ch),data=out.getChannelData(ch);
    data.set(input.subarray(start,end));
    // The last sample leads naturally into source[end], then blends back into the head.
    for(let i=0;i<seam;i++){
      const x=i/Math.max(1,seam-1),blend=x*x*(3-2*x);
      data[i]=input[end+i]*(1-blend)+input[start+i]*blend;
    }
    for(let i=0;i<size;i++){energy+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));}
  }
  const rms=Math.sqrt(energy/(size*source.numberOfChannels));
  // Consistent energy between modes, with headroom. These are RMS/sample peaks, not LUFS/dBTP.
  const gain=Math.min(2,.12/Math.max(.001,rms),.8/Math.max(.001,peak));
  for(let ch=0;ch<out.numberOfChannels;ch++){const data=out.getChannelData(ch);for(let i=0;i<size;i++)data[i]*=gain;}
  return {buffer:out,gain,rms:rms*gain,peak:peak*gain};
}
