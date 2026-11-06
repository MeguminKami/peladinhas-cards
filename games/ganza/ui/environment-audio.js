// Quiet local sound design, selected exclusively by the difficulty.
// Uses the existing ambience bus, so mute/volume/ducking keep working.
export function environmentAudio(bus,risk){
 if(!bus.ctx||!bus.available)return;
 const c=bus.ctx;
 if(!bus.environmentNodes){
  const nodes={};const add=(name,source,volume=0)=>{const gain=c.createGain();gain.gain.value=volume;source.connect(gain);gain.connect(bus.ambience);source.start();nodes[name]={source,gain};return gain;};
  if(bus.buffers.waves?.[0]){const source=c.createBufferSource();source.buffer=bus.buffers.waves[0];source.loop=true;add('waves',source);}
  // Sparse sea birds / crickets / distant bells are synthesized, not field recordings.
  const make=(name,seconds,sample)=>{const buffer=c.createBuffer(1,c.sampleRate*seconds,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=sample(i/c.sampleRate);const source=c.createBufferSource();source.buffer=buffer;source.loop=true;add(name,source);};
  make('birds',13,t=>{const u=t%6.5;return u<.65?Math.sin(2*Math.PI*(780*u+180*Math.sin(u*4)))*Math.sin(Math.PI*u/.65)**2*.15:0;});
  make('crickets',7,t=>{const u=t%1.7;return u<.3?Math.sin(t*2*Math.PI*4200)*Math.sin(Math.PI*u/.3)**2*(.5+.5*Math.sin(t*2*Math.PI*26))*.05:0;});
  make('village',17,t=>{const u=t%5.5;return u<2?Math.sin(2*Math.PI*440*u)*Math.exp(-u*3)*.035:0;});
  make('pad',12,t=>Math.sin(Math.PI*t/12)**2*(Math.sin(t*2*Math.PI*110)+Math.sin(t*2*Math.PI*165)+Math.sin(t*2*Math.PI*220))*.018);
  bus.environmentNodes=nodes;
 }
 if(bus.environmentRisk===risk)return;bus.environmentRisk=risk;
 const volumes={baixo:{waves:.25,birds:.22},medio:{waves:.16,crickets:.4,village:.15},alto:{waves:.16,crickets:.25,village:.5},extremo:{waves:.12,crickets:.12,village:.2,pad:.8}}[risk];
 for(const[name,node]of Object.entries(bus.environmentNodes))node.gain.gain.setTargetAtTime(volumes[name]||0,c.currentTime,.4);
}
