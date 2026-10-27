// Visual coordinates: 0 is the safe starting area; prizes occupy 1 through 10.
export const stagePosition=stage=>stage+1;
export const visualDestination=round=>round&&round.status!=='paid'?(round.step+(round.status==='lost'?1:0)):0;
export const TRAVEL_MS=420;
export const FIGHT_MS=300;
export function progressionPose({round,event='idle',age=Infinity,from=visualDestination(round),reduced=false}){
 const destination=visualDestination(round),lost=round?.status==='lost',won=round?.status==='won';
 const stage=lost?round.step:Math.max(0,(round?.step||0)-1);
 if(reduced||!['step','lost','won','paid'].includes(event))return {position:destination,destination,stage,phase:lost?'fight':won?'celebration':'idle',progress:1};
 if(age<TRAVEL_MS){const t=Math.max(0,age/TRAVEL_MS),ease=t*t*(3-2*t);return {position:from+(destination-from)*ease,destination,stage,phase:'travel',progress:t};}
 const progress=Math.min(1,(age-TRAVEL_MS)/FIGHT_MS);
 return {position:destination,destination,stage,phase:lost?'fight':event!=='paid'&&progress<1?'fight':won?'celebration':'idle',progress};
}
