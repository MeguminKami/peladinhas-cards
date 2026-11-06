import {characterMotion} from './choreography.js';
// The renderer only knows the CURRENT multiplier and public phase, never the crash ahead.
export class RiscoScene {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.quality = 1; this.fps = 60; this.last = 0; this.samples = 0; this.slow = 0;
    this.particles = Array.from({ length: 2200 }, (_, i) => {
      const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
      return { x: hash(i + 1), y: (hash(i + 5000) - .5) * 2, r: .4 + hash(i + 8000) * 1.2, a: .25 + hash(i + 9000) * .7 };
    });
  }
  async load() {
    const load = async path => { const img = new Image();img.loading='eager';img.decoding='sync';await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Arte em falta: '+path));img.src=new URL(path,import.meta.url);});await Promise.race([img.decode(),new Promise(resolve=>setTimeout(resolve,500))]);return img; };
    const images = await Promise.all([load('art/bathroom.webp'), load('art/lcd-approved-portrait.webp')]);
    [this.background, this.portrait] = images;
    // Only load a new character atlas after its sheet has the owner's approval.
    const manifest = await fetch(new URL('art/character.json', import.meta.url)).then(r => r.json());
    this.characterSpec=manifest;
    if (manifest.approved && manifest.atlas) {
      this.atlas = await load('art/' + manifest.atlas);
      if(manifest.choreography==='inhale-until-stop-v1'&&typeof createImageBitmap==='function'){
        const cols=manifest.columns||4,rows=manifest.rows||4,sw=this.atlas.width/cols,sh=this.atlas.height/rows;
        // Decode once into small textures instead of sampling the full atlas every frame.
        this.characterFrames=await Promise.all(Array.from({length:cols*rows},(_,i)=>createImageBitmap(this.atlas,(i%cols)*sw,Math.floor(i/cols)*sh,sw,sh)));
      }
    }
  }
  render({ time = 0, multiplierCents = 100, phase = 'idle', phaseTime = 0, paid = false, variant = 0 } = {}) {
    const c = this.ctx, rect = this.canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, this.quality < 1 ? 1 : 1.5);
    if (this.canvas.width !== Math.round(w*dpr) || this.canvas.height !== Math.round(h*dpr)) { this.canvas.width=Math.round(w*dpr); this.canvas.height=Math.round(h*dpr); }
    c.setTransform(dpr,0,0,dpr,0,0);
    const reduced = this.reduced, mobile = w < 700 || h > w*1.1, m = multiplierCents / 100;
    const intensity = Math.min(4, Math.max(0, Math.log10(m)));
    const crashed = phase === 'crashed', max = phase === 'max-win';
    const motion=characterMotion({time,phase,phaseTime,multiplierCents,reduced,variant});
    const t = reduced ? 0 : time / 1000;
    const sweep = crashed ? Math.min(1, Math.max(0, (phaseTime-150)/1100)) : 0;
    const easedSweep = variant % 2 ? (sweep < .45 ? sweep*.95 : sweep < .65 ? .43 : .43 + (sweep-.65)/.35*.57) : 1-Math.pow(1-sweep,3);
    c.fillStyle='#090912'; c.fillRect(0,0,w,h);
    c.save();
    c.translate(w*.5,h*.65);c.scale(motion.cameraZoom,motion.cameraZoom);c.translate(-w*.5,-h*.65);
    if(motion.shake)c.translate(Math.sin(t*51)*motion.shake,Math.cos(t*47)*motion.shake*.5);
    if (this.background) {
      const scale=Math.max(w/this.background.width,h/this.background.height);
      const iw=this.background.width*scale,ih=this.background.height*scale;
      c.globalAlpha=.9; c.drawImage(this.background,(w-iw)/2+Math.sin(t*.22)*2,(h-ih)/2,iw,ih); c.globalAlpha=1;
    }
    const shade=c.createLinearGradient(0,0,w,0); shade.addColorStop(0,'#09061218');shade.addColorStop(.55,'#0b071b40');shade.addColorStop(1,'#0906129c');c.fillStyle=shade;c.fillRect(0,0,w,h);
    // Architectural neon pulse is slow, below the flash threshold.
    c.globalAlpha=.06+Math.sin(t*1.2)*.015; c.fillStyle='#bc3cff';c.fillRect(0,0,w,h);c.globalAlpha=1;
    if ((m >= 1000 || max) && !reduced) {
      c.save(); c.translate(w*.65,h*.45);
      for(let i=0;i<14;i++){c.strokeStyle=i%2?'#ff3b9155':'#c7ff3944';c.lineWidth=2;const r=((i*65+t*100)%900)+25;c.beginPath();c.ellipse(0,0,r,r*.6,t*.05,0,Math.PI*2);c.stroke();}c.restore();
    }
    // Table plane and neon edge stay separated from the protected HTML HUD.
    const tableY=h*(mobile?.73:.68);
    const glass=c.createLinearGradient(0,tableY,0,h);glass.addColorStop(0,'#080810bb');glass.addColorStop(1,'#120c20');
    c.fillStyle=glass;c.beginPath();c.moveTo(w*.06,tableY+h*.1);c.lineTo(w*.97,tableY-h*.06);c.lineTo(w*1.1,h);c.lineTo(0,h);c.closePath();c.fill();
    c.strokeStyle='#9e54d570';c.lineWidth=1.5;c.beginPath();c.moveTo(w*.06,tableY+h*.1);c.lineTo(w*.97,tableY-h*.06);c.stroke();
    // Character rig: breathing, anticipation, lean, recoil and bounded RGB duplicates.
    const cw=mobile?Math.min(w*.60,h*.51):Math.min(w*.44,h*.94);
    const ch=cw*1.08, cx=mobile?w*.025:w*.055, cy=mobile?h*.96-ch:h*.98-ch;
    let bob=motion.breath*1.5-motion.headLift;
    let lean=motion.lean;
    const drawChar=(offset=0,alpha=1)=>{c.save();c.globalAlpha=alpha;c.translate(cx+cw*.5+offset,cy+ch*.8+bob);c.rotate(lean);if(max&&!reduced)c.translate(0,-12-Math.sin(t*2)*8);
      if(this.atlas&&this.characterSpec?.choreography==='inhale-until-stop-v1'){
        const cols=this.characterSpec.columns||4,rows=this.characterSpec.rows||4,sw=this.atlas.width/cols,sh=this.atlas.height/rows;
        const draw=(frame,opacity)=>{c.globalAlpha=alpha*opacity;if(this.characterFrames?.[frame])c.drawImage(this.characterFrames[frame],-cw*.5,-ch*.8,cw,ch);else c.drawImage(this.atlas,(frame%cols)*sw,Math.floor(frame/cols)*sh,sw,sh,-cw*.5,-ch*.8,cw,ch);};
        // Keep a solid silhouette. Dissolving two anatomical poses creates double faces.
        draw(motion.mix>=.5?motion.next:motion.frame,1);
      }else if(this.atlas){const cols=4,rows=3;let frame=phase==='waiting'?0:paid?11:m>=1000?5:m>=100?4:m>=10?3:m>=2?2:1;if(crashed)frame=phaseTime<1300?6+Math.min(2,Math.floor(easedSweep*3)):multiplierCents===100?10:9;
        const sw=this.atlas.width/cols,sh=this.atlas.height/rows;c.drawImage(this.atlas,(frame%cols)*sw,Math.floor(frame/cols)*sh,sw,sh,-cw*.5,-ch*.8,cw,ch);
      }else if(this.portrait)c.drawImage(this.portrait,-cw*.5,-ch*.8,cw,ch);c.restore();};
    if(m>=100&&!reduced){drawChar(-5,.16);drawChar(5,.16);} drawChar();
    const cinematicAtlas=Boolean(this.atlas&&this.characterSpec?.choreography==='inhale-until-stop-v1');
    const anchor=this.characterSpec?.intakeAnchor||[.54,.8];
    const startX=cinematicAtlas?cx+cw*anchor[0]:w*(mobile?.23:.29), endMax=w*.91, startY=cinematicAtlas?cy+ch*anchor[1]:h*.87;
    const length=phase==='idle'||phase==='waiting'?.09:Math.min(1,.12+Math.log(Math.max(1,m))/Math.log(9999)*.88);
    const endX=startX+(endMax-startX)*length, endY=startY-h*.17*length;
    const linePoint=p=>({x:startX+(endX-startX)*p,y:startY+(endY-startY)*p+(m>=10&&!reduced?Math.sin(p*21+t*3)*Math.min(4,intensity):0)});
    // Ghost growth graph, same deterministic curve for every seed.
    c.save();c.strokeStyle='#c7ff3950';c.lineWidth=1.5;c.shadowColor='#c7ff39';c.shadowBlur=8;c.beginPath();for(let i=0;i<=40;i++){const p=i/40;const x=startX+(endMax-startX)*p,y=startY+13-h*.2*Math.pow(p,2);if(!i)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.restore();
    const budget=Math.floor(this.particles.length*this.quality*(reduced?.65:1));
    for(let i=0;i<budget;i++){
      const p=this.particles[i];if(p.x>length)continue;
      const along=p.x/Math.max(.001,length);
      const pos=linePoint(along),spread=(2.3+length*3)*(1-Math.pow(Math.abs(p.y),.5)*.7);
      c.globalAlpha=p.a;c.fillStyle='#ffffff';c.fillRect(pos.x,pos.y+p.y*spread,p.r,p.r*.8);
      if(m>=100&&!reduced&&i%11===0){c.fillStyle=i%2?'#ff3b91':'#65e6e4';c.fillRect(pos.x+2,pos.y+p.y*spread-2,p.r*2,1);}
    }c.globalAlpha=1;
    const tip=linePoint(cinematicAtlas?0:.12);
    // Inhale during the rise, cut suction on the FIRST public crash frame.
    if(motion.inhaling&&!cinematicAtlas){c.save();c.translate(tip.x,tip.y-2);c.rotate(-.8);c.fillStyle='#c7b4a0';c.strokeStyle='#68516b';c.lineWidth=1;c.fillRect(-6,-39,12,40);c.strokeRect(-6,-39,12,40);c.fillStyle='#3c2942';c.fillRect(-6,-27,12,4);c.restore();}
    if(!reduced){for(let i=0;i<Math.floor(75*this.quality);i++){const p=this.particles[i*17];const life=(t*.8+p.x)%1;const suction=motion.inhaling;const x=suction?tip.x+(1-life)*(25+p.x*65):endX+(p.x-.5)*35;const y=suction?tip.y-22*life+p.y*8*(1-life):endY-life*24;c.globalAlpha=(1-life)*.55;c.fillStyle=i%13===0?'#c7ff39':'#ffffff';c.fillRect(x,y,1+p.r*.4,1+p.r*.4);}c.globalAlpha=1;}
    if(paid&&!reduced&&phaseTime<1200){for(let i=0;i<36;i++){const p=this.particles[i*23],r=Math.min(1,phaseTime/1200),ease=1-Math.pow(1-r,3);c.globalAlpha=1-r;c.fillStyle='#c7ff39';c.beginPath();c.arc(endX+(w-endX)*ease+(p.x-.5)*35,endY*(1-ease)-Math.sin(r*Math.PI)*60+p.y*12,1+p.r,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
    if(max&&!reduced){for(let i=0;i<55;i++){const p=this.particles[i*13],y=((t*65+p.y*500)%(h+50)+h+50)%(h+50);c.save();c.translate(p.x*w,y);c.rotate(t+p.x*5);c.fillStyle=i%2?'#c7ff39':'#b58bff';c.fillRect(-8,-3,16,7);c.restore();}}
    if(m>=10&&!reduced){const n=Math.min(10,Math.floor(intensity*3));for(let i=0;i<n;i++){const p=this.particles[i*47];c.fillStyle=i%2?'#65e6e41a':'#ff3b911a';c.fillRect(w*p.x,((t*11+i*79)%h),w*.1,2);}}
    // Foreground dust gives depth without altering the protected HTML controls.
    if(!reduced){for(let i=0;i<Math.floor(18*this.quality);i++){const p=this.particles[1200+i*23],x=(p.x*w+t*(3+i%4))%(w+20)-10,y=(p.y*.5+.5)*h+Math.sin(t*.3+i)*6;c.globalAlpha=.05+p.a*.07;c.fillStyle=i%3?'#d7b8f5':'#9dffdf';c.beginPath();c.arc(x,y,1+p.r*2,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
    c.restore();
    if(crashed&&!reduced&&phaseTime>1450&&phaseTime<1620){c.globalAlpha=Math.sin((phaseTime-1450)/170*Math.PI)*.15;c.fillStyle='#d8b9e5';c.fillRect(0,0,w,h);c.globalAlpha=1;}
  }
  frame(now,state) {
    if(this.last){const delta=now-this.last;this.fps=this.fps*.95+(1000/Math.max(1,delta))*.05;if(delta>20)this.slow++;this.samples++;if(this.samples===60){if(this.slow>18)this.quality=Math.max(.35,this.quality-.2);this.samples=0;this.slow=0;}}
    this.last=now;this.render(state);
  }
}
