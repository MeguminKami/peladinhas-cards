// Presentation only. No seed, hidden crash point, wallet or game RNG enters here.
export function characterMotion({time=0,phase='idle',phaseTime=0,multiplierCents=100,reduced=false,variant=0}={}) {
  const running=phase==='running',crashed=phase==='crashed',legend=phase==='max-win';
  const intensity=Math.min(1,Math.log10(Math.max(1,multiplierCents/100))/4);
  const breath=reduced?0:Math.sin(time/460);
  let frame=0,next=0,mix=0;
  if(running){const at=(time/105)%8;frame=4+Math.floor(at);next=4+(Math.floor(at)+1)%8;mix=at-Math.floor(at);}
  else if(crashed){const at=Math.min(3,Math.max(0,phaseTime-100)/260);frame=12+Math.floor(at);next=Math.min(15,frame+1);mix=at-Math.floor(at);}
  else if(legend){frame=15;next=15;}
  else{const at=(time/300)%4;frame=Math.floor(at);next=(frame+1)%4;mix=at-Math.floor(at);}
  if(reduced){frame=running?4:crashed?14:legend?15:0;next=frame;mix=0;}
  const lift=crashed?Math.min(1,phaseTime/850):0;
  return {inhaling:running,frame,next,mix,
    breath:running?breath:0,
    inhaleStrength:running?(reduced?1:.68+.24*Math.sin(time/175)**2):0,
    lean:reduced?0:crashed?-Math.sin(lift*Math.PI/2)*.12:running?.065+breath*.008:0,
    headLift:reduced?0:lift*(variant%2?12:18),
    cameraZoom:reduced?1:1+(running?.018:0)+intensity*.012,
    shake:reduced?0:crashed?Math.max(0,1-phaseTime/1700)*4:running&&multiplierCents>=1000?intensity*.6:0,
    powderFlow:running&&!reduced?(time/1200)%1:0,
  };
}
