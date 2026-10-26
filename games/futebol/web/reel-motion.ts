/** Match the current loop velocity, then decelerate without any catch-up burst. */
export function landingPlan(phase:number,step:number,cycle:number,now:number,notBefore:number,suspense:boolean,reduced=false){
  const cells=Math.max(0,-phase/step),trim=Math.floor(cells),fraction=cells-trim;
  const order=suspense?3:2;
  const padding=reduced?0:Math.max(0,Math.ceil((notBefore-now-order*(4+fraction)*cycle)/(order*cycle)));
  const distance=(4+fraction+padding)*step;
  const duration=reduced?Math.max(100,notBefore-now):order*(4+fraction+padding)*cycle;
  return {trim,padding,distance,duration,start:-distance,easing:reduced?'linear':suspense?'cubic-bezier(.333333333,1,.666666667,1)':'cubic-bezier(.333333333,.666666667,.666666667,1)'};
}
