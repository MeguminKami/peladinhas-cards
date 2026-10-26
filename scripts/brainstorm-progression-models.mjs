// Local design experiment. This module is never imported by production code.
import { readFileSync, writeFileSync } from 'node:fs';
import { ATTRIBUTES, calculateOverall, normalizeOvrWeights } from '../js/utils.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const all=n=>Object.fromEntries(ATTRIBUTES.map(([key])=>[key,n]));
const ratings=n=>Object.fromEntries(['overall','attack','passing','defense','physical','attitude'].map(key=>[key,n]));
const dimensions={pace:'physical',shooting:'attack',passing:'passing',dribbling:'attack',defending:'defense',physical:'physical',goalkeeping:'goalkeeping',stamina:'attitude',vision:'passing',positioning:'defense',teamwork:'passing',composure:'attitude'};
const models={
  conservative:{speed:2.2,performanceCap:2.8,actionScale:1,lossCap:.4},
  balanced:{speed:2.6,performanceCap:3.2,actionScale:1.25,lossCap:.6},
  generous:{speed:3,performanceCap:3.6,actionScale:1.5,lossCap:.7},
  controlled:{speed:2.6,performanceCap:3.2,actionScale:1.25,lossCap:.6,eliteTaper:true,ovrCap:2.5},
};
function actionBonus(n) {
  if(!(n>0))return 0;
  if(n<=3)return .3+(n-1)*.05;
  if(n<=5)return .4+(n-3)*.2;
  return Math.min(1.5,1.15+(n-6)*.1);
}
function relativeFactor(difference,stars) {
  const anchors=[[-2,.25],[-1.5,.5],[-1,.85],[-.75,1]];
  let factor=1;
  if(difference<=-2)factor=.25;
  else for(let i=1;i<anchors.length;i++)if(difference<anchors[i][0]){
    const [a,x]=anchors[i-1],[b,y]=anchors[i];factor=x+(y-x)*(difference-a)/(b-a);break;
  }
  return stars>=3.5?Math.max(.75,factor):factor;
}
function resultFactors(a) {
  const margin=clamp(Math.abs(a.goalMargin||0),0,5);
  return a.outcome===1?{gain:.90+.02*margin,loss:.75}:
    a.outcome===0?{gain:.75,loss:1}:{gain:.65-.05*margin,loss:1.10+.08*margin};
}
function deltas(stats,a,model,options={}) {
  const result=resultFactors(a);
  const goals=actionBonus(a.goals||0)*model.actionScale;
  const assists=actionBonus(a.assists||0)*model.actionScale;
  const values=Object.fromEntries(ATTRIBUTES.map(([key])=>{
    const dimension=dimensions[key],stars=a[dimension];
    if(!Number.isFinite(stars))return [key,null];
    const relative=Number.isFinite(a.teamRatings?.[dimension])?stars-a.teamRatings[dimension]:0;
    const opponent=Number.isFinite(a.opponentRatings?.[dimension])?stars-a.opponentRatings[dimension]:0;
    // Relative superiority provides a modest capped boost; inferiority is only
    // reduced through the gradual factor, avoiding two penalties for one gap.
    const reference=1+.15*clamp(relative,0,1)+.05*clamp(opponent,0,1);
    const performance=Math.min(model.performanceCap,Math.max(0,stars-3)*model.speed*reference)*relativeFactor(relative,stars);
    // Contributions have a separate budget. Poor absolute ratings reduce them
    // continuously, but a bad team-relative score cannot erase an actual goal.
    const quality=.25+.75*clamp((stars-2)/1.5,0,1);
    const personal=(key==='shooting'?goals:key==='passing'?assists:key==='dribbling'?Math.min(.5,.25*(goals+assists)):0)*quality;
    let tier=stats[key]<75?1:stats[key]<85?.7:stats[key]<90?.4:.12;
    if(model.eliteTaper && stats[key]>=90)tier*=clamp((99-stats[key])/9,0,1);
    const gain=Math.min(5,(performance+personal)*result.gain)*tier;
    // A weak winner can lose stats. Individual contributions can compensate
    // losses in their own dimensions, without rescuing unrelated attributes.
    const loss=Math.min(model.lossCap,Math.max(0,3-stars)*.5*result.loss*(1+.1*clamp(-relative,0,1)));
    return [key,clamp(stats[key]+gain-loss,0,99)-stats[key]];
  }));
  if(model.ovrCap) {
    const normalized=normalizeOvrWeights(options.weights);
    const weights=normalized.positions[options.position||'AV'];
    const gain=ATTRIBUTES.reduce((sum,[key])=>sum+Math.max(0,values[key]||0)*weights[key]/100,0);
    if(gain>model.ovrCap)for(const[key]of ATTRIBUTES)if(values[key]>0)values[key]*=model.ovrCap/gain;
  }
  return values;
}
function shown(stats,boosts={}) {
  return Object.fromEntries(ATTRIBUTES.map(([key])=>[key,clamp(Math.round(stats[key])+(boosts[key]||0),0,99)]));
}
function apply(stats,delta) {return Object.fromEntries(ATTRIBUTES.map(([key])=>[key,stats[key]+(delta[key]||0)]));}
const vitor=JSON.parse(readFileSync('test-results/firestore-audits/vitor-game-impact.json','utf8').replace(/^\uFEFF/,''));
const boosts=Object.fromEntries(ATTRIBUTES.map(([key,name])=>[key,vitor.rows.find(r=>r.name===name).boost]));
const before=shown(vitor.exactBefore,boosts);
const result={sourceCollectedAt:vitor.collectedAt,models,assumptions:{neutralStars:3,maximumRawGain:5,tierMultipliers:[1,.7,.4,.12],gainFactors:{winBy1:.92,winBy3:.96,winBy5:1,draw:.75,lossBy1:.60,lossBy3:.50,lossBy5:.40}},vitor:{position:vitor.position,beforeOvr:calculateOverall(before,vitor.weights,vitor.position),models:{},rows:[]},contributions:[],outcomes:[],weakGames:[],curves:[]};
for(const [name,model] of Object.entries(models)) {
  const delta=deltas(vitor.exactBefore,vitor.latest,model,{weights:vitor.weights,position:vitor.position}),after=shown(apply(vitor.exactBefore,delta),boosts);
  result.vitor.models[name]={afterOvr:calculateOverall(after,vitor.weights,vitor.position),delta,after};
}
const stableDelta=deltas(vitor.stableExactBefore,vitor.latest,models.controlled,{weights:vitor.weights,position:vitor.position});
result.vitor.withoutNewCommunityVotes={
  beforeOvr:calculateOverall(shown(vitor.stableExactBefore,boosts),vitor.weights,vitor.position),
  afterOvr:calculateOverall(shown(apply(vitor.stableExactBefore,stableDelta),boosts),vitor.weights,vitor.position),
  delta:stableDelta,
};
result.vitor.rows=ATTRIBUTES.map(([key,name])=>({key,name,before:before[key],currentDelta:vitor.rows.find(r=>r.name===name).lastGameExactDelta,currentAfter:vitor.rows.find(r=>r.name===name).now,...Object.fromEntries(Object.entries(result.vitor.models).map(([model,v])=>[model,{delta:v.delta[key],after:v.after[key]}]))}));
for(const goals of [0,1,2,3,4,5,6,8,10]) {
  const a={...vitor.latest,goals};
  result.contributions.push({goals,...Object.fromEntries(Object.entries(models).map(([name,model])=>[name,deltas(vitor.exactBefore,a,model).shooting]))});
}
for(const [outcome,margin] of [[1,7],[1,1],[0,0],[-1,-1],[-1,-3],[-1,-5]]) {
  const a={...vitor.latest,outcome,goalMargin:margin};
  const delta=deltas(vitor.exactBefore,a,models.balanced),after=shown(apply(vitor.exactBefore,delta),boosts);
  const stable=deltas(vitor.stableExactBefore,a,models.controlled,{weights:vitor.weights,position:vitor.position});
  result.outcomes.push({outcome,margin,gainFactor:resultFactors(a).gain,afterOvr:calculateOverall(after,vitor.weights,vitor.position),stableBaseAfterOvr:calculateOverall(shown(apply(vitor.stableExactBefore,stable),boosts),vitor.weights,vitor.position),shooting:delta.shooting,passing:delta.passing,pace:delta.pace});
}
result.compensation=[];
for(const stars of [2,2.5,4])for(const goals of [0,6]){
  const a={...ratings(stars),teamRatings:ratings(3.5),opponentRatings:ratings(3.5),outcome:1,goalMargin:3,goals,assists:0};
  const d=deltas(all(80),a,models.controlled);
  result.compensation.push({stars,goals,shooting:d.shooting,defending:d.defending});
}
for(const stars of [2,2.5,3,3.5,4,4.5])for(const outcome of [1,-1]) {
  const a={...ratings(stars),teamRatings:ratings(3.5),opponentRatings:ratings(3.5),goals:0,assists:0,outcome,goalMargin:outcome*3};
  const delta=deltas(all(80),a,models.balanced);
  result.weakGames.push({stars,outcome,pace:delta.pace,shooting:delta.shooting});
}
for(const start of [60,75,85,90])for(const scenario of ['ordinary','good','exceptional','weak','mixed'])for(const [name,model]of Object.entries(models)) {
  let stats=all(start);
  const row={start,scenario,model:name};
  for(let i=1;i<=20;i++) {
    let stars=scenario==='ordinary'?3.2:scenario==='good'?3.8:scenario==='exceptional'?4.4:2.3;
    let goals=scenario==='exceptional'?6:scenario==='good'?2:0,assists=scenario==='exceptional'?2:scenario==='good'?1:0;
    const outcome=scenario==='mixed'?[1,-1,1,0,-1][(i-1)%5]:scenario==='weak'?-1:1;
    if(scenario==='mixed'){stars=[3.8,2.5,4,3.2,2.8][(i-1)%5];goals=[2,0,4,1,0][(i-1)%5];assists=[1,0,2,1,0][(i-1)%5];}
    const a={...ratings(stars),teamRatings:ratings(3.5),opponentRatings:ratings(3.5),goals,assists,outcome,goalMargin:outcome*3};
    stats=apply(stats,deltas(stats,a,model));
    if([1,5,10,20].includes(i))row[`after${i}`]=calculateOverall(shown(stats),undefined,'AV');
  }
  result.curves.push(row);
}
// Check design invariants over ratings, margins, contributions and tiers.
let checks=0;
const check=(condition,message)=>{if(!condition)throw Error(message);checks++;};
for(const model of Object.values(models))for(const stat of [60,80,88,93,99])for(const stars of [1,2,2.5,3,3.5,4,5])for(const goals of [0,1,3,6,10]) {
  const a={...ratings(stars),teamRatings:ratings(3.5),opponentRatings:ratings(3.5),goals,assists:0};
  const win=deltas(all(stat),{...a,outcome:1,goalMargin:3},model);
  const draw=deltas(all(stat),{...a,outcome:0,goalMargin:0},model);
  const loss=deltas(all(stat),{...a,outcome:-1,goalMargin:-3},model);
  const rout=deltas(all(stat),{...a,outcome:-1,goalMargin:-5},model);
  for(const [key]of ATTRIBUTES){
    check((win[key]||0)+1e-9>=(draw[key]||0)&&(draw[key]||0)+1e-9>=(loss[key]||0)&&(loss[key]||0)+1e-9>=(rout[key]||0),'Outcome order violated');
    if(loss[key]!==null)check(loss[key]>=-model.lossCap-1e-9&&loss[key]<=5+1e-9,'Delta cap violated');
  }
  const more=deltas(all(stat),{...a,goals:goals+1,outcome:1,goalMargin:3},model);
  check(more.shooting+1e-9>=win.shooting,'Extra goal reduced shooting');
}
result.invariantChecks=checks;
writeFileSync('test-results/firestore-audits/progression-brainstorm.json',JSON.stringify(result,null,2));
console.log('Vitor — mesma base, recompensas, posição e atributos exatos antes do jogo:');
console.table(result.vitor.rows.map(r=>({attribute:r.name,current:r.currentDelta,conservative:r.conservative.delta,balanced:r.balanced.delta,generous:r.generous.delta,controlled:r.controlled.delta})));
console.log('OVR antes:',result.vitor.beforeOvr,'OVR depois por modelo:',Object.fromEntries(Object.entries(result.vitor.models).map(([name,v])=>[name,v.afterOvr])));
console.log('Sem os dois novos votos comunitários:',result.vitor.withoutNewCommunityVotes);
console.table(result.outcomes);
console.table(result.weakGames);
console.table(result.curves.filter(r=>r.model==='controlled'));
console.log('Invariantes verificadas:',checks);
