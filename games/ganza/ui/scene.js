import {compositor} from './webgl.js';
import {color} from './falesia-layers.js';
// Shared animation lifecycle; game outcomes arrive already decided by the engine.
export class Scene{
 constructor(canvas,onLand,onPin){
  this.canvas=canvas;this.onLand=onLand;this.onPin=onPin;this.plates=[];this.particles=Array.from({length:180},()=>({life:0}));this.lights=new Map();this.rows=16;this.time=0;this.result=null;this.reduced=false;this.quality=true;this.fps=60;this.samples=[];this.ready=false;
  this.gpu=compositor(canvas);this.surface=this.gpu?document.createElement('canvas'):canvas;this.ctx=this.surface.getContext('2d');this.images={};this.resize();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);
 }
 resize(){const r=this.canvas.getBoundingClientRect(),ratio=Math.min(1.5,devicePixelRatio,1200/Math.max(1,r.width));this.canvas.width=Math.max(1,Math.round(r.width*ratio));this.canvas.height=Math.max(1,Math.round(r.height*ratio));this.surface.width=this.canvas.width;this.surface.height=this.canvas.height;}
 add(round,demo=false){const p={...round,demo,start:performance.now(),duration:round.rows===8?2100:round.rows===12?2600:3100,lastPin:-1,rotation:Math.random()*2};this.plates.push(p);this.throwAt=this.time;return p;}
 burst(x,y,c,count=16){if(this.reduced)return;let n=0;for(const p of this.particles)if(!p.life){Object.assign(p,{x,y,vx:(Math.random()-.5)*130,vy:-Math.random()*180,life:1,color:c});if(++n>=Math.min(count,this.quality?count:6))break;}}
 celebrate(round){const m=round.multiplier;this.result={round,start:this.time,duration:m===999900?7000:m>=10000?4000:m>=1000?2000:m>=100?1200:800};const pos=this.point(round,round.rows);this.burst(pos.x,this.surface.height*.83,color(m),m>=10000?100:25);}
 skip(){this.result=null;}
 stop(){cancelAnimationFrame(this.raf);}
}
