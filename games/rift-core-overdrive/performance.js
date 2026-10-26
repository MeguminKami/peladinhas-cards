export const frameStats={};
let active=null,last=0,policy='auto',samples=[],bad=0,good=0;
export function setRenderPolicy(value){policy=['auto','full','economy'].includes(value)?value:'auto';if(policy!=='auto')document.documentElement.dataset.renderQuality=policy;}
document.addEventListener('visibilitychange',()=>{last=0;});
function loop(time){
 if(!document.hidden&&last){const dt=time-last;if(active)active.frames.push(dt);samples.push(dt);
  if(samples.length>=90){const mean=samples.reduce((a,b)=>a+b,0)/samples.length,slow=samples.filter(t=>t>33.4).length/samples.length;samples=[];if(mean>23||slow>.15){bad++;good=0;}else{good++;bad=0;}if(policy==='auto'){if(bad>=2)document.documentElement.dataset.renderQuality='economy';else if(good>=6)document.documentElement.dataset.renderQuality='full';}}
 }
 last=document.hidden?0:time;requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
export function beginMeasure(name){active={name,frames:[]};last=0;}
export function endMeasure(){if(!active)return;const {name,frames}=active;active=null;if(!frames.length)return;const sorted=[...frames].sort((a,b)=>a-b),sum=frames.reduce((a,b)=>a+b,0);frameStats[name]={frames:frames.length,meanFPS:1000*frames.length/sum,p95FrameMs:sorted[Math.floor(sorted.length*.95)],worstFrameMs:sorted.at(-1),framesOver33ms:frames.filter(v=>v>33.4).length};}
