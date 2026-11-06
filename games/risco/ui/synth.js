export const SOUNDS = Object.freeze({ card: .14, puff: .45, milestone: .8, 'sniff-loop':1.2, crash: 2.5, 'crash-double': 2.5, instant: 1.5, cashout: 1.2, betrayed: .35, loss: .25, max: 6, ui: .07 });
// Original procedural Foley. The exported WAVs and runtime use the same synthesis.
export function synthesize(name, rate = 48000) {
  const duration = SOUNDS[name];
  if (!duration) throw Error('Som desconhecido');
  const data = new Float32Array(Math.ceil(duration * rate));
  let random = 18791, smooth = 0;
  const noise = () => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) / 2147483648 - 1; };
  for (let i=0;i<data.length;i++) {
    const t=i/rate, p=t/duration, n=noise(); smooth=smooth*.88+n*.12;
    const env=Math.min(1,t*150)*Math.pow(1-p,2);
    let v=0;
    if(name==='card')v=(n*.35+Math.sin(t*2*Math.PI*1800)*.2)*Math.exp(-t*45);
    else if(name==='ui')v=Math.sin(t*2*Math.PI*1300)*Math.exp(-t*80)*.3;
    else if(name==='puff')v=(n-smooth)*Math.sin(p*Math.PI)*.25+Math.sin(t*2*Math.PI*1700)*Math.exp(-t*20)*.12;
    else if(name==='sniff-loop')v=(n-smooth)*Math.sin(p*Math.PI)**2*(.3+.15*Math.sin(t*14)**2);
    else if(name==='crash'||name==='crash-double'||name==='instant'){
      const d=name==='instant'?.45:1.25;
      const sniff=name==='crash-double'?(Math.exp(-Math.pow((t-.3)/.16,2))+Math.exp(-Math.pow((t-.88)/.22,2))):Math.sin(Math.min(1,t/d)*Math.PI);
      const hit=t>d?Math.sin((t-d)*Math.PI*2*(70-25*Math.min(1,(t-d))))*Math.exp(-(t-d)*7):0;
      const glitch=t>d&&t<d+.3?Math.sign(Math.sin(t*1450))*Math.sin(t*293)*.12:0;
      v=(n-smooth)*sniff*.4+hit*.6+glitch;
      if(name!=='instant'){
        const cut=Math.exp(-t*36),impact=Math.sin(2*Math.PI*(48*t+2*Math.exp(-t*12)))*Math.exp(-t*4);
        const stutter=name==='crash-double'?Math.sign(Math.sin(t*41)):1;
        v=(n-smooth)*cut*.25+Math.sign(Math.sin(t*(1500-1000*p)))*Math.sin(t*299)*Math.exp(-t*12)*stutter*.15+impact*.6;
      }
      if(name==='instant')v+=Math.sin(2*Math.PI*(240*t+90*Math.exp(-t*5)))*Math.exp(-t*4)*.22;
    }else if(name==='loss')v=Math.sin(t*2*Math.PI*72)*Math.exp(-t*22)*.6;
    else if(name==='betrayed')v=Math.sin(2*Math.PI*(110*t+15*Math.sin(t*7)))*env*.25;
    else{
      const notes=name==='max'?[220,277.18,329.63,440,554.36,659.25,880]:name==='cashout'?[880,1108.73,1318.51]:[440,659.25,880];
      for(let j=0;j<notes.length;j++){const at=j*(name==='max'?.12:.075),u=t-at;if(u>=0)v+=Math.sin(u*Math.PI*2*notes[j])*Math.exp(-u*(name==='max'?1.5:5))*.17;}
      if(name==='max')v+=smooth*.3*Math.exp(-t*.9)+Math.sin(t*2*Math.PI*55)*Math.exp(-t*1.8)*.3;
    }
    data[i]=v*env;
  }
  return data;
}
