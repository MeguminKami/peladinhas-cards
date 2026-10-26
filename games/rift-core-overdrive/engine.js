export const NAMES=['NEON SHARD','PLASMA CELL','QUANTUM BATTERY','CYBER CIRCUIT','ENERGY BOLT','CYBER DRONE','PHANTOM HELMET','NEON PANTHER','RIFT KEY','REACTOR HEART','RIFT WILD','CORE PORTAL'];
export const BETS=[.1,.2,.4,.6,.8,1,2,3,5,10,20,50,100];
import * as legacy from './engine-legacy.js';
import * as previous from './engine-v3.js';
import * as previous4 from './engine-v4.0.js';
import * as previous41 from './engine-v4.1.js';
import * as previous42 from './engine-v4.2.js';
import * as previous414 from './engine-v4.14.js';
import * as previous413 from './engine-v4.13.js';
import * as previous412 from './engine-v4.12.js';
import * as previous411 from './engine-v4.11.js';
import * as previous410 from './engine-v4.10.js';
import * as previous49 from './engine-v4.9.js';
import * as previous48 from './engine-v4.8.js';
import * as previous47 from './engine-v4.7.js';
import * as previous46 from './engine-v4.6.js';
import * as previous45 from './engine-v4.5.js';
import * as previous44 from './engine-v4.4.js';
import * as previous43 from './engine-v4.3.js';
import {CONFIG,PAY,MATH_VERSION,purchasePrice} from './math-config.js';
export {CONFIG,PAY,MATH_VERSION,purchasePrice};
export function scatterChance(count,column=0,hunt=false){
 const p=CONFIG.scatterChance[count];
 if(count)return p;
 // Scale every positive final count, drawing each column separately.
 const factor=CONFIG.naturalScatterScale*(hunt?CONFIG.huntScatterBoost:1);
 const survival=(1-p)**column,remaining=1-factor*(1-survival);
 return factor*survival*p/remaining;
}
export function scatterDistribution(hunt=false,mode='base'){
 if(mode!=='base')return [...CONFIG.profiles[mode].scatterK];
 let d=[1,0,0,0,0,0,0];
 for(let c=0;c<6;c++){const next=Array(7).fill(0);for(let k=0;k<=c;k++){const p=scatterChance(k,c,hunt);if(!(p>=0&&p<=1))throw Error('Invalid Scatter probability');next[k]+=d[k]*(1-p);next[k+1]+=d[k]*p;}d=next;}
 return d;
}
export const spinCost=s=>money(s.bet*(s.settings.hunt?3:1));
export const money=n=>Math.round((n+Number.EPSILON)*100)/100;
export function fresh(seed=Date.now()>>>0){return {version:1,seed,rng:seed||1,draws:0,balance:1000,bet:1,grid:null,history:[],round:null,pending:null,settings:{buys:true,lang:'pt',speed:1,volume:.35,music:true,effects:true,reduced:false,currency:'CR'}};}
export function random(s){
 if(!s.prng){let v=(s.rng^s.draws)>>>0;const mix=()=>{v=(v+0x9e3779b9)>>>0;let z=v;z=Math.imul(z^(z>>>16),0x21f0aaad);z=Math.imul(z^(z>>>15),0x735a2d97);return (z^(z>>>15))>>>0;};s.prng=[mix(),mix(),mix(),mix()];if(!s.prng.some(v=>v))s.prng[0]=1;}
 const p=s.prng,result=Math.imul(((Math.imul(p[1],5)<<7)|(Math.imul(p[1],5)>>>25)),9)>>>0,t=p[1]<<9;
 p[2]^=p[0];p[3]^=p[1];p[1]^=p[2];p[0]^=p[3];p[2]^=t;p[3]=(p[3]<<11)|(p[3]>>>21);s.draws++;s.rng=result;return result/4294967296;
}
const pick=(s,a)=>a[Math.floor(random(s)*a.length)];
const weightCache=new WeakMap();
function normal(s,onlyNormal=false,column=0){const profile=CONFIG.profiles[s.profileKey||'base'];const weights=profile.reelWeights?.[column]||profile.weights;let cdf=weightCache.get(weights);if(!cdf){let acc=0;cdf=weights.map(v=>acc+=v);weightCache.set(weights,cdf);}const n=random(s)*cdf[onlyNormal?4:9];for(let i=0;i<(onlyNormal?5:10);i++)if(n<cdf[i])return i;return onlyNormal?4:9;}
function tile(s,column=0){const profile=CONFIG.profiles[s.profileKey||'base'];return {id:String(s.serial=(s.serial||0)+1),s:random(s)<(profile.wild)?10:normal(s,false,column)};}
export function initial(s,{hunt=false,mode='base'}={}){s.profileKey=mode==='base'?(hunt?'hunt':'base'):mode;const g=Array.from({length:6},(_,c)=>Array.from({length:5},()=>tile(s,c)));
 if(mode==='base'){let count=0;for(let c=0;c<6;c++)if(random(s)<scatterChance(count,c,hunt)){g[c][Math.floor(random(s)*5)].s=11;count++;}}
 else{const d=scatterDistribution(false,mode);let u=random(s),k=0;while(k<6&&u>=d[k]){u-=d[k];k++;}for(const c of choose(s,[0,1,2,3,4,5],k))g[c][Math.floor(random(s)*5)].s=11;}
 return g;}
const clone=x=>structuredClone(x);
// Count paths and their position union. The details switch only skips report
// allocation; the exact same paths, amounts and removals drive GUI and simulation.
export function evaluate(grid,details=true){
 const counts=new Int8Array(60),masks=new Int32Array(60),wc=new Int8Array(6),wm=new Int32Array(6);
 for(let c=0;c<6;c++)for(let r=0;r<5;r++){const symbol=grid[c][r].s,bit=1<<(c*5+r);if(symbol===10){wc[c]++;wm[c]|=bit;}else if(symbol<10){const i=symbol*6+c;counts[i]++;masks[i]|=bit;}}
 let wildLength=0,wildWays=1;for(let c=0;c<6&&wc[c];c++){wildLength++;wildWays*=wc[c];}
 const candidates=[];let extension=false;
 for(let symbol=0;symbol<10;symbol++){let length=0,ways=1,allWild=1,naturalColumns=0,onlyNatural=-1;for(let c=0;c<6;c++){const n=counts[symbol*6+c]+wc[c];if(!n)break;length++;ways*=n;allWild*=wc[c];if(counts[symbol*6+c]){naturalColumns++;onlyNatural=c;}}if(length<3)continue;if(length>wildLength)extension=true;candidates.push({symbol,length,ways,allWild,naturalColumns,onlyNatural});}
 let best=-1,bestValue=-1;if(wildLength>=3&&!extension)for(const w of candidates){if(w.length!==wildLength)continue;const v=PAY[w.symbol][wildLength];if(v>bestValue){best=w.symbol;bestValue=v;}}
 let amount=0,payUnits=0,union=0;const wins=[];
 for(const w of candidates){const assigned=w.symbol===best,ways=w.ways-w.allWild+(assigned?wildWays:0);if(!ways)continue;const value=PAY[w.symbol][w.length],award=ways*value;payUnits+=ways*Math.round(value*CONFIG.payDenominator);amount=payUnits/CONFIG.payDenominator;let mask=0;for(let c=0;c<w.length;c++){mask|=masks[w.symbol*6+c];if(assigned||w.naturalColumns>1||(w.naturalColumns===1&&w.onlyNatural!==c))mask|=wm[c];}union|=mask;if(details){const positions=[];for(let p=0;p<30;p++)if(mask&(1<<p))positions.push(p);wins.push({...w,ways,value,payUnits:ways*Math.round(value*CONFIG.payDenominator),amount:award,positions,columns:Array.from({length:w.length},(_,i)=>i+1)});}}
 const positions=[];for(let p=0;p<30;p++)if(union&(1<<p))positions.push(p);return {amount,payUnits,positions,wins};
}
export function collapse(s,grid,positions){const gone=new Set(positions),g=grid.map(col=>col.slice());for(let c=0;c<6;c++){let start=0;for(let end=0;end<=5;end++){if(end<5&&grid[c][end].s!==11)continue;const survivors=[];for(let r=start;r<end;r++)if(!gone.has(c*5+r))survivors.push(grid[c][r]);const missing=end-start-survivors.length;const next=[...Array.from({length:missing},()=>tile(s,c)),...survivors];for(let r=start;r<end;r++)g[c][r]=next[r-start];start=end+1;}}return g;}
function targets(g,predicate){return g.flatMap((col,c)=>col.flatMap((t,r)=>predicate(t.s)?[{c,r}]:[]));}
function choose(s,a,n){const pool=[...a],out=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);return out;}
function transform(s,g,kind,count,capture=true){const before=capture?clone(g):null;let list=[],source=null,dest=10;
if(kind==='MEGA WILD DROP'){const cols=[0,1,2,3,4,5].filter(c=>g[c].some(t=>t.s!==10&&t.s!==11));if(cols.length){const c=pick(s,cols);list=targets(g,t=>t!==11&&t!==10).filter(p=>p.c===c);}}
else if(kind==='NEON STORM'){const types=[...new Set(targets(g,t=>t<5).map(p=>g[p.c][p.r].s))];if(types.length){const type=pick(s,types);dest=5+Math.floor(random(s)*5);list=targets(g,t=>t===type);}}
else if(kind==='RIFT LINK'){const sources=targets(g,t=>t>=5&&t<=10).filter(p=>targets(g,t=>t!==11).some(q=>q.c!==p.c&&g[q.c][q.r].s!==g[p.c][p.r].s));if(sources.length){source=pick(s,sources);dest=g[source.c][source.r].s;list=choose(s,targets(g,t=>t!==11&&t!==dest).filter(p=>p.c!==source.c),1);}}
else{const eligible=targets(g,t=>t<5);if(eligible.length<(kind==='REACTOR PULSE'?2:kind==='CORE EVOLUTION'?3:1))return null;list=choose(s,eligible,count);if(kind==='CORE EVOLUTION')dest=5+Math.floor(random(s)*5);}
if(!list.length)return null;for(const p of list)g[p.c][p.r].s=dest;return {type:'power',name:kind,before,grid:capture?clone(g):null,targets:list,source,dest};}
export function play(s,{buy=null,capture=true}={}){if(s.round&&s.round.mathVersion!==MATH_VERSION){return (s.round.mathVersion==='rift-4.14'?previous414:s.round.mathVersion==='rift-4.13'?previous413:s.round.mathVersion==='rift-4.12'?previous412:s.round.mathVersion==='rift-4.11'?previous411:s.round.mathVersion==='rift-4.10'?previous410:s.round.mathVersion==='rift-4.9'?previous49:s.round.mathVersion==='rift-4.8'?previous48:s.round.mathVersion==='rift-4.7'?previous47:s.round.mathVersion==='rift-4.6'?previous46:s.round.mathVersion==='rift-4.5'?previous45:s.round.mathVersion==='rift-4.4'?previous44:s.round.mathVersion==='rift-4.3'?previous43:s.round.mathVersion==='rift-4.2'?previous42:s.round.mathVersion==='rift-4.1'?previous41:s.round.mathVersion==='rift-4.0'?previous4:s.round.mathVersion==='rift-3.0'?previous:legacy).play(s,{buy,capture});}if(s.pending)throw Error('Pending presentation');if(buy&&!['core','rift','overdrive'].includes(buy))throw Error('Invalid purchase');let round=s.round;const fs=!!round;if(fs&&buy)throw Error('Round in progress');const hunt=!fs&&!buy&&!!s.settings.hunt;const bet=fs?round.bet:s.bet;if(!BETS.includes(bet))throw Error('Invalid bet');const cost=fs?0:buy?purchasePrice(buy,bet):money(bet*(hunt?3:1));if(hunt)scatterDistribution(true);if(cost>s.balance)throw Error('Insufficient credits');if(!fs)round={id:`${s.seed}-${s.draws}`,mathVersion:MATH_VERSION,bet,total:0,mode:'base',played:0,awarded:0,global:1,thresholds:[],nextWilds:0,evolution:false};s.balance=money(s.balance-cost);
const mathVersion=round.mathVersion||'rift-1.0',mode=round.mode,startGlobal=round.global,events=[],profileKey=fs?mode:hunt?'hunt':'base';s.profileKey=profileKey;const profile=CONFIG.profiles[profileKey];let grid=initial(s,{hunt,mode:fs?mode:'base'});if(buy){const cols=choose(s,[0,1,2,3,4,5],buy==='overdrive'?5+(random(s)<CONFIG.purchaseSixScatterChance?1:0):CONFIG.bonusScatters[buy]);for(let c=0;c<6;c++)for(let r=0;r<5;r++)if(grid[c][r].s===11)grid[c][r].s=normal(s);for(const c of cols)grid[c][Math.floor(random(s)*5)].s=11;}
// Ensure the explicit preparatory rule has a real normal target, even in the
// rare initial outcome containing only premiums, Wilds and portals.
if(mode==='overdrive'&&!grid.flat().some(t=>t.s<5)){const p=pick(s,targets(grid,t=>t!==11));grid[p.c][p.r].s=normal(s,true);}
const start=capture?clone(grid):null,scatters=grid.flat().filter(t=>t.s===11).length;let added=0,spinWin=0,cascade=0,capped=false;const stats={powers:{},retrigger:0,removed:0};
if(fs){round.played++;if(scatters>=3){added=Math.min(CONFIG.bonuses[mode].retrigger,40-round.awarded);round.awarded+=added;}}
if(capture)events.push({type:'initial',grid:clone(grid),scatters});
function power(name,count){const e=transform(s,grid,name,count,capture);if(e){stats.powers[name]=(stats.powers[name]||0)+1;if(capture)events.push(e);}}
if(mode==='overdrive'){power('CORE IMPULSE',1+round.nextWilds);round.nextWilds=0;}
function powers(pulse=false){const p=profile.powers;for(const [i,name] of ['MEGA WILD DROP','NEON STORM','WILD SURGE','RIFT LINK'].entries()){if(i===2&&round.evolution){const e=transform(s,grid,'CORE EVOLUTION',3,capture);if(e){stats.powers['CORE EVOLUTION']=(stats.powers['CORE EVOLUTION']||0)+1;if(capture)events.push(e);round.evolution=false;round.evolved=true;}}if(i===3&&pulse&&random(s)<profile.pulse)power('REACTOR PULSE',2+Math.floor(random(s)*3));if(random(s)<p[i])power(name,1+Math.floor(random(s)*3));}}
if(!buy)powers();
while(!buy){const result=evaluate(grid,capture);if(!result.amount)break;cascade++;stats.removed+=result.positions.length;const cm=1,gm=round.global;const betCents=Math.round(bet*100),rawCents=Math.round(result.payUnits*betCents*cm*gm/CONFIG.payDenominator),remainingCents=25000*betCents-Math.round(round.total*100),winCents=Math.min(rawCents,remainingCents),raw=rawCents/100,win=winCents/100;round.total=money(round.total+win);spinWin=money(spinWin+win);s.balance=money(s.balance+win);if(mode!=='base'){round.growthWins=(round.growthWins||0)+1;round.global=Math.min(CONFIG.bonuses[mode].maxGlobal,gm+(round.growthWins%CONFIG.growth[mode].every===0?CONFIG.growth[mode].step:0));if(mode==='core'&&round.global>=10&&!round.evolved)round.evolution=true;if(mode==='overdrive')for(const t of [25,50])if(round.global>t&&!round.thresholds.includes(t)){round.thresholds.push(t);round.nextWilds+=2;}}
if(capture)events.push({type:'win',grid:clone(grid),...result,wins:allocateWinCents(result.wins,winCents),win,raw,cm,gm,nextGlobal:round.global,total:spinWin});
if(round.total>=25000*bet){capped=true;added=0;break;}const before=capture?clone(grid):null;grid=collapse(s,grid,result.positions);if(capture)events.push({type:'fall',before,grid:clone(grid)});powers(cascade%3===0);
// A genuine cap terminates long rounds; no arbitrary cascade truncation.
}
let intro=null,end=false;if(capped)end=true;else if(!fs&&(buy||scatters>=CONFIG.bonusScatters.core)){intro=buy||(scatters===3?'core':scatters===4?'rift':'overdrive');round.mode=intro;round.awarded=CONFIG.bonuses[intro].spins+(intro==='overdrive'?Math.max(0,scatters-CONFIG.bonusScatters.overdrive)*CONFIG.extraOverdriveSpins:0);round.global=CONFIG.bonuses[intro].startGlobal;}else if(fs&&round.played>=round.awarded)end=true;
stats.retrigger=added>0?1:0;const record={stats,cascades:cascade,profileKey,id:`${round.id}-${round.played}-${s.draws}`,mathVersion,mode,bet,cost,hunt,start,startGlobal,events,win:spinWin,roundTotal:round.total,scatters,added,played:round.played,awarded:round.awarded,global:round.global,intro,end,capped,buy};s.grid=grid;s.round=(intro||fs)&&!end?round:null;if(capture){s.history.unshift(record);s.history=s.history.slice(0,40);s.pending=record;}return record;}

export function symbolProbabilities(mode='base',column=null){const p=CONFIG.profiles[mode],reels=column===null?(p.reelWeights||[p.weights]):[p.reelWeights?.[column]||p.weights];const probabilities=Array(11).fill(0);for(const weights of reels){const total=weights.reduce((a,b)=>a+b,0);weights.forEach((w,i)=>probabilities[i]+=(1-p.wild)*w/total/reels.length);}probabilities[10]=p.wild;return probabilities;}

// Present simultaneous groups as shares of the amount actually credited.
// This never changes the total award; it avoids displaying two rounded cents
// when their combined fractional contributions credit only one cent.
export function allocateWinCents(wins,cents){
 const total=wins.reduce((sum,w)=>sum+BigInt(w.payUnits),0n);if(!total)return wins;
 const shares=wins.map((w,index)=>{const n=BigInt(w.payUnits)*BigInt(cents);return {index,cents:Number(n/total),remainder:n%total};});
 let remaining=cents-shares.reduce((sum,s)=>sum+s.cents,0);
 for(const s of [...shares].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(remaining--<=0)break;s.cents++;}
 return wins.map((w,i)=>({...w,paidCents:shares[i].cents,paid:shares[i].cents/100}));
}


