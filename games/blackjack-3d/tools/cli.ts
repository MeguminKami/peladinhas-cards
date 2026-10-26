import {RNG} from '../shared/core';
import {fresh,start,act,publicRound,type Action} from '../src/engine';
const [seed='1,2,3,4',actions='']=process.argv.slice(2);
let s=start(fresh(new RNG(seed.split(',').map(Number))),[100,0,0,0,0]);
for(const action of actions.split(',').filter(Boolean) as Action[]){const r=s.round!;s=act(s,{round:r.id,revision:r.revision,hand:r.active||undefined,seat:r.seats.find(p=>p.insured===null)?.number,action});}
console.log(JSON.stringify({state:s,public:publicRound(s)},null,2));
