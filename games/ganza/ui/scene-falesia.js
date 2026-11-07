import {Scene as Base} from './scene.js';
import {layers,color} from './falesia-layers.js';
export {color} from './falesia-layers.js';
const risks=['baixo','medio','alto','extremo'],ease=u=>u*u*(3-2*u);
export class Scene extends Base{
 constructor(...args){super(...args);this.risk='extremo';this.landings=[];this.environment=null;this.previous=null;this.transition=0;this.geometry=null;}
 resize(){super.resize();this.geometry=null;this.backgrounds=null;this.buoySprites=null;this.buoyRows=null;}
 layout(rows=this.rows){
  const {width:w,height:h}=this.surface;
  if(!this.geometry){const bounds=this.canvas.getBoundingClientRect(),scale=h/Math.max(1,bounds.height),controls=document.querySelector('#controls').getBoundingClientRect(),header=document.querySelector('header').getBoundingClientRect(),mobile=bounds.width<=650;
   const boatY=(controls.top-bounds.top)*scale-(mobile?47:48)*scale,top=(header.bottom-bounds.top+(mobile?110:34))*scale;
   const center=w*(mobile?.51:.58),actorSize=mobile?w*.46:Math.min(w*.40,h*.91),actor={x:mobile?-w*.035:-w*.025,y:mobile?top-w*.37:header.bottom*scale-30*scale,size:actorSize};
   this.geometry={w,h,mobile,center,span:w*(mobile?.90:.53),top,actor,boatY,scale,controlY:(controls.top-bounds.top)*scale};
  }
  const g=this.geometry;return {...g,step:g.span/rows,dy:Math.max(3,(g.boatY-g.top-34*g.scale)/rows)};
 }
 point(p,index){const {center,top,step,dy,boatY,mobile,scale}=this.layout(p.rows);let k=0;for(let i=0;i<index;i++)k+=p.path[i];return{x:center+(k-index/2)*step,y:index===p.rows?boatY+(mobile?16:-7)*scale:top+index*dy};}
 syncLabels(){const g=this.layout(),key=[g.w,g.h,this.rows,this.risk].join(':');if(this.labelKey===key)return;this.labelKey=key;const elements=document.querySelectorAll('.boat');for(let k=0;k<elements.length;k++){const el=elements[k];el.style.left=`${(g.center+(k-this.rows/2)*g.step)/g.w*100}%`;el.style.top=`${g.boatY/g.h*100}%`;el.style.setProperty('--hull-width',`${g.step/g.scale*.96}px`);}}
 text(text,x,y,size=30,fill='#f5d28b'){const c=this.ctx;c.save();c.font=`700 ${size}px Comic,Impact,sans-serif`;c.textAlign='center';c.lineJoin='round';c.lineWidth=Math.max(2,size*.13);c.strokeStyle='#183f4e';c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);c.restore();}
 draw(now,dt){
  const c=this.ctx,g=this.layout(),{w,h,step,dy,top,center,boatY,mobile,scale}=g,t=now/1000,level=risks.indexOf(this.risk);
  if(this.environment!==this.risk){this.previous=this.environment;this.environment=this.risk;this.transition=now;}
  c.clearRect(0,0,w,h);let fade=this.previous?Math.min(1,Math.max(0,(now-this.transition)/1250)):1;if(!this.background(this.risk)){this.transition=now;fade=0;}if(this.previous&&fade<1)this.drawEnvironment(this.previous,1,t);this.drawEnvironment(this.risk,fade,t);
  this.syncLabels();
  // Water reflections, not an opaque board. The entire coastline remains continuous.
  if(!this.reduced){c.save();c.lineWidth=1;for(let band=0;band<(this.quality?24:10);band++){const y=boatY+(band/24)*(g.controlY-boatY),x=w*(.25+(band*.137)% .7),length=12+(band%4)*15;c.strokeStyle=`rgba(201,227,221,${.13+Math.sin(t+band)*.05})`;c.beginPath();c.moveTo(x+Math.sin(t*.5+band)*5,y);c.quadraticCurveTo(x+length/2,y+Math.sin(t+band)*2,x+length,y);c.stroke();}c.restore();}
  const {size:actorSize,x:actorX,y:actorY}=g.actor;
  this.actorBounds={x:actorX,y:actorY,size:actorSize};
  // Soft contact shadow, patterned cushions and lantern spill anchor the character to the terrace.
  c.save();c.fillStyle='#183a3f66';c.beginPath();c.ellipse(actorX+actorSize*.4,actorY+actorSize*.78,actorSize*.25,actorSize*.035,0,0,7);c.fill();
  c.restore();
  this.actor(actorX,actorY,actorSize);
  if(level>0){for(let i=0;i<level+1;i++){const chain=this.result?.round.multiplier>=1000&&now-this.result.start>i*180?1.6:1,x=w*(.035+i*.035),y=h*(.15+(i%2)*.05),r=Math.min(w*.012,9)*chain;const glow=c.createRadialGradient(x,y,0,x,y,r*5);glow.addColorStop(0,`rgba(255,208,113,${this.reduced?.35:.4+Math.sin(t*2+i)*.1})`);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(x-r*5,y-r*5,r*10,r*10);}
   if(!this.reduced)for(let i=0;i<6;i++){const u=(t*.018+i/6)%1,x=i%2?w*(.975-Math.sin(u*5)*.014):w*(.015+Math.sin(u*5)*.014),y=h*(.18+u*.5);c.save();c.translate(x,y);c.rotate(Math.sin(t*.6+i));c.fillStyle=i%2?'#e4a4bd99':'#acd3ac99';c.beginPath();c.ellipse(0,0,4*scale,1.7*scale,0,0,7);c.fill();c.restore();}
  }
  // Keep gameplay objects above foreground flowers, including the outermost boat.
  this.foreground(t);
  // Bright jade glass with a dark outer rim stays readable over both sea and pastel sky.
  this.drawBuoyRows(now);
  for(let k=0;k<=this.rows;k++)this.boat(center+(k-this.rows/2)*step,boatY+(mobile?16:-7)*scale,step*.97,this.reduced?0:Math.sin(t*1.4+k)*.018,k);
  // Immediate launch feedback; no pins, destination or payment before durable acceptance.
  if(this.launch){const u=this.reduced?1:Math.min(1,Math.max(0,(now-this.launch.start)/300)),sx=actorX+actorSize*.6,sy=actorY+actorSize*.4,arc=Math.min(90*scale,Math.abs(top-sy)*.35+24*scale),x=sx+(center-sx)*ease(u),y=sy+(top-sy)*u-Math.sin(u*Math.PI)*arc,r=Math.max(4.5,Math.min(13,step*.30));this.launch.screenPosition={x,y};this.parcel(x,y,r*1.25,0,1);}
  for(const p of [...this.plates]){const progress=Math.max(0,(now-p.start-300)/(p.duration-300)),at=Math.min(p.rows-1,Math.floor(progress*p.rows)),u=Math.min(1,progress*p.rows-at),a=this.point(p,at),b=this.point(p,at+1),launch=Math.min(1,(now-p.start)/300),sx=actorX+actorSize*.6,sy=actorY+actorSize*.4,launchArc=Math.min(90*scale,Math.abs(a.y-sy)*.35+24*scale),x=launch<1?sx+(a.x-sx)*ease(launch):a.x+(b.x-a.x)*ease(u),y=launch<1?sy+(a.y-sy)*launch-Math.sin(launch*Math.PI)*launchArc:a.y+(b.y-a.y)*u-Math.sin(Math.PI*u)*dy*.35;
   p.screenPosition={x,y};
   if(launch===1&&at!==p.lastPin){p.lastPin=at;let k=0;for(let i=0;i<at;i++)k+=p.path[i];this.lights.set(`${at}:${k}`,now);this.onPin?.(x/w,at);this.burst(a.x,a.y,'#efc395',3);}
   if(progress>=1){const target=this.point(p,p.rows);this.landings.push({id:p.id,k:p.k,...target});this.landings=this.landings.slice(-100);this.plates.splice(this.plates.indexOf(p),1);this.onLand(p);continue;}
   const r=Math.max(4.5,Math.min(13,step*.30));c.save();c.fillStyle='#123c4b55';c.beginPath();c.ellipse(x,y+12*scale,r*1.2,r*.35,0,0,7);c.fill();if(!this.reduced){c.strokeStyle='#bcffd58c';c.lineWidth=r*.6;c.lineCap='round';c.beginPath();if(launch<1){for(let j=0;j<=16;j++){const v=Math.max(0,launch-.45)+Math.min(.45,launch)*j/16,px=sx+(a.x-sx)*ease(v),py=sy+(a.y-sy)*v-Math.sin(v*Math.PI)*launchArc;j?c.lineTo(px,py):c.moveTo(px,py);}}else{c.moveTo(x,y);c.quadraticCurveTo(x-8,y-10,x+Math.sin(t*3)*9,y-22);}c.stroke();}c.restore();this.parcel(x,y,r*1.25,progress*8+p.rotation,1-Math.max(0,1-u*5)*.14);
  }
  for(const p of this.particles)if(p.life>0){p.life=Math.max(0,p.life-dt*.9);p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;c.save();c.globalAlpha=p.life;c.fillStyle=p.color;c.translate(p.x,p.y);c.rotate(t+p.x);c.beginPath();c.ellipse(0,0,3,1.5,0,0,7);c.fill();c.restore();}
  const result=this.result;if(result){const age=now-result.start,m=result.round.multiplier,pos=this.point(result.round,result.round.rows);if(age>result.duration)this.result=null;else{const label=m===999900?'CARGA COMPLETA':m>=10000?'GANZÁ!':m>=1000?'ISTO É DO BOM':m>=100?'SPLASH':'PLOC';this.text(label,m>=10000?center:pos.x,m>=10000?top+(boatY-top)*.35:boatY-29*scale,Math.min(m>=10000?50:24,w*.065));if(m>=1000)this.text(`${(m/100).toLocaleString('pt-PT')}×`,center,top+(boatY-top)*.52,Math.min(32,w*.055),'#c4eecf');
    if(m>=10000&&!this.reduced){for(let i=0;i<(m===999900?7:4);i++){const x=w*(.14+i*.12),y=top+(i%3)*h*.08,r=(age%1200)/1200*45;for(let j=0;j<10;j++){const a=j*Math.PI/5;c.fillStyle=['#eeb1c9','#b7e4cf','#d1c1eb','#f3d493'][i%4];c.globalAlpha=1-(age%1200)/1200;c.beginPath();c.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,2,0,7);c.fill();}}c.globalAlpha=1;}
   }}
  if(this.gpu)this.gpu.draw(this.surface,0,false);
 }
 start(){this.last=performance.now();const tick=now=>{const ms=now-this.last;this.last=now;this.time=now;if(ms>0)this.samples.push(ms);if(this.samples.length>120)this.samples.shift();this.fps=1000*this.samples.length/this.samples.reduce((a,b)=>a+b,0);if(this.samples.length>90&&this.fps<43)this.quality=false;this.draw(now,Math.min(.05,ms/1000));this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);}
 celebrate(round){super.celebrate(round);if(!this.boatHits)this.boatHits=new Map();this.boatHits.set(round.k,{time:this.time,multiplier:round.multiplier});const label=document.querySelectorAll('.boat')[round.k];if(label&&!this.reduced){label.classList.remove('landed');void label.offsetWidth;label.classList.add('landed');}const p=this.point(round,round.rows);this.burst(p.x,p.y,round.multiplier>=10000?'#e6b5d9':'#bde9d2',round.multiplier>=10000?90:20);}
}

Object.assign(Scene.prototype,layers);
