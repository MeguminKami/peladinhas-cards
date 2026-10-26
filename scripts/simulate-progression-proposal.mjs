// Experimental calibration only. Not imported by the app or Cloud Functions.
import { ATTRIBUTES, calculateGameDeltas, calculateOverall } from '../js/utils.js';
import { existsSync, readFileSync } from 'node:fs';
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const all = n=>Object.fromEntries(ATTRIBUTES.map(([key])=>[key,n]));
const mapping = {pace:'physical',shooting:'attack',passing:'passing',dribbling:'attack',defending:'defense',physical:'physical',goalkeeping:'goalkeeping',stamina:'attitude',vision:'passing',positioning:'defense',teamwork:'passing',composure:'attitude'};
const ratings = n=>Object.fromEntries(['overall','attack','passing','defense','physical','attitude'].map(key=>[key,n]));
export function contributionBonus(n) {
  if (!(n>0)) return 0;
  if(n<=3) return 0.30+(n-1)*0.05;
  if(n<=5) return 0.40+(n-3)*0.20;
  return Math.min(1.5,1.15+(n-6)*0.10);
}
export function relativeFactor(difference, stars) {
  const anchors=[[-2,.25],[-1.5,.50],[-1,.85],[-.75,1]];
  let factor=1;
  if(difference<=-2) factor=.25;
  else for(let i=1;i<anchors.length;i++) {
    if(difference<anchors[i][0]) {
      const [a,x]=anchors[i-1],[b,y]=anchors[i];
      factor=x+(y-x)*(difference-a)/(b-a);break;
    }
  }
  return stars>=3.5 ? Math.max(.75,factor):factor;
}
export function proposedDeltas(stats,a) {
  const goals=contributionBonus(a.goals||0), assists=contributionBonus(a.assists||0);
  return Object.fromEntries(ATTRIBUTES.map(([key])=>{
    const stars=a[mapping[key]];
    if(!Number.isFinite(stars))return [key,null];
    const relative=Number.isFinite(a.teamRatings?.[mapping[key]])?stars-a.teamRatings[mapping[key]]:0;
    const rival=Number.isFinite(a.opponentRatings?.[mapping[key]])?stars-a.opponentRatings[mapping[key]]:0;
    const score=.85*(stars-3)+.10*clamp(relative,-1,1)+.05*clamp(rival,-1,1);
    const result=a.outcome===1?.25:a.outcome===0?.05:-.10;
    const raw=score+result;
    const absolute=clamp((stars-1.5)/1.3,0,1);
    const performance=clamp(raw*1.8,0,2.5)*relativeFactor(relative,stars)*absolute;
    const personal=(key==='shooting'?goals:key==='passing'?assists:key==='dribbling'?Math.min(.5,.25*(goals+assists)):0)*Math.max(.5,absolute);
    const tier=stats[key]<75?1:stats[key]<85?.7:stats[key]<90?.4:.12;
    const delta=raw<0 && a.outcome!==1 ? Math.max(-.25,raw):Math.min(4,performance+personal)*tier;
    return [key,clamp(stats[key]+delta,0,99)-stats[key]];
  }));
}
const baseGame={...ratings(3.9),outcome:1,goalMargin:3,teamRatings:ratings(3.8),opponentRatings:ratings(3.5),assists:1};
console.log('Proposta experimental; ganhos exatos antes do arredondamento da carta. Atual = valores iniciais do código, não política cloud.');
console.table(Array.from({length:11},(_,goals)=>({goals,bonus:contributionBonus(goals),currentShooting:calculateGameDeltas(all(80),{...baseGame,goals}).shooting,proposedShooting:proposedDeltas(all(80),{...baseGame,goals}).shooting}))); 
console.table([0,-.5,-.75,-1,-1.5,-2].map(difference=>({difference,factorAt3:relativeFactor(difference,3),factorAt3point9:relativeFactor(difference,3.9)})));
console.table([60,80,88,93].map(start=>{
  let stats=all(start),ovr=calculateOverall(stats,undefined,'AV');
  const row={start};
  for(let i=1;i<=20;i++){
    const a={...baseGame,goals:6};
    const deltas=proposedDeltas(stats,a);
    stats=Object.fromEntries(ATTRIBUTES.map(([key])=>[key,stats[key]+(deltas[key]||0)]));
    ovr=calculateOverall(Object.fromEntries(ATTRIBUTES.map(([key])=>[key,Math.round(stats[key])])),undefined,'AV');
    if([1,5,10,20].includes(i))row[`after${i}`]=ovr;
  }
  return row;
}));
const vitorPath='test-results/firestore-audits/vitor-game-impact.json';
if(existsSync(vitorPath)) {
  const vitor=JSON.parse(readFileSync(vitorPath,'utf8').replace(/^\uFEFF/,''));
  const proposed=proposedDeltas(vitor.exactBefore,vitor.latest);
  console.log('Vitor: comparação no mesmo estado de atributos anterior ao jogo; proposta ainda não calibrada.');
  console.table(ATTRIBUTES.map(([key,name])=>({name,current:vitor.rows.find(r=>r.name===name).lastGameExactDelta,proposed:proposed[key]})));
}
