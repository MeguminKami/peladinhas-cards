export const NAMES=['NEON SHARD','PLASMA CELL','QUANTUM BATTERY','CYBER CIRCUIT','ENERGY BOLT','CYBER DRONE','PHANTOM HELMET','NEON PANTHER','RIFT KEY','REACTOR HEART','RIFT WILD','CORE PORTAL'];
export const BETS=[.1,.2,.4,.6,.8,1,2,3,5,10,20,50,100];
export const PAY=Array.from({length:10},(_,i)=>[0,0,0,...[.012,.035,.09,.24].map(v=>+(v*(1+i*.5)*(i>4?1.65:1)).toFixed(4))]);
export const CONFIG={weights:[20,19,18,17,16,9,7,5,3,2],wild:.012,scatter:.045,powers:{base:[.004,.012,.018,.012],core:[.012,.025,.035,.025],overdrive:[.035,.035,.045,.04]},pulse:.35};
export const MATH_VERSION='rift-2.0';
export function scatterDistribution(hunt=false){const p=CONFIG.scatter,coeff=[1,6,15,20,15,6,1],d=coeff.map((v,k)=>v*p**k*(1-p)**(6-k));if(hunt){for(let k=1;k<=6;k++)d[k]*=1.5;d[0]=1-d.slice(1).reduce((a,b)=>a+b,0);if(d[0]<0||d.some(v=>v<0||v>1))throw Error('Invalid Hunt distribution');}return d;}
export const spinCost=s=>money(s.bet*(s.settings.hunt?3:1));
export const money=n=>Math.round((n+Number.EPSILON)*100)/100;
export function fresh(seed=Date.now()>>>0){return {version:1,seed,rng:seed||1,draws:0,balance:1000,bet:1,grid:null,history:[],round:null,pending:null,settings:{lang:'pt',speed:1,volume:.35,music:true,effects:true,reduced:false,buys:false,currency:'CR'}};}
export function random(s){let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;s.draws++;return s.rng/4294967296;}
const pick=(s,a)=>a[Math.floor(random(s)*a.length)];
function normal(s){let n=random(s)*CONFIG.weights.reduce((a,b)=>a+b,0);for(let i=0;i<10;i++){n-=CONFIG.weights[i];if(n<0)return i;}return 9;}
function tile(s,allowWild=true){return {id:`${s.seed}-${s.draws}-${s.serial=(s.serial||0)+1}`,s:allowWild&&random(s)<CONFIG.wild?10:normal(s)};}
export function initial(s,{hunt=false,legacy=false}={}){if(legacy)return Array.from({length:6},()=>{const col=Array.from({length:5},()=>tile(s));if(random(s)<CONFIG.scatter)col[Math.floor(random(s)*5)].s=11;return col;});const g=Array.from({length:6},()=>Array.from({length:5},()=>tile(s)));const d=scatterDistribution(hunt);let u=random(s),k=0;while(k<6&&u>=d[k]){u-=d[k];k++;}for(const c of choose(s,[0,1,2,3,4,5],k))g[c][Math.floor(random(s)*5)].s=11;return g;}
const clone=x=>structuredClone(x);
// All-wild paths are assigned once to the most valuable valid interpretation.
export function evaluate(grid){const wins=[];const removed=new Set();const candidates=[];for(let symbol=0;symbol<10;symbol++){let counts=[],wilds=[],positions=[],hasNatural=false;for(let c=0;c<6;c++){const rows=[];let wc=0;for(let r=0;r<5;r++){const t=grid[c][r].s;if(t===symbol||t===10){rows.push(r);if(t===10)wc++;else hasNatural=true;}}if(!rows.length)break;counts.push(rows.length);wilds.push(wc);positions.push(...rows.map(r=>c*5+r));}if(counts.length<3)continue;const ways=counts.reduce((a,b)=>a*b,1),allWild=wilds.reduce((a,b)=>a*b,1);candidates.push({symbol,length:counts.length,ways,allWild,positions,value:PAY[symbol][counts.length],hasNatural});}
// Ambiguous paths can end at different lengths. Group by the exact wildcard
// prefix length, then give each path its highest payment, extending if possible.
let wildLength=0,wildWays=1;for(const col of grid){const n=col.filter(t=>t.s===10).length;if(!n)break;wildLength++;wildWays*=n;}
let best=null;if(wildLength>=3&&!candidates.some(w=>w.length>wildLength)){for(const w of candidates){const value=PAY[w.symbol][wildLength];if(!best||value>best.value)best={symbol:w.symbol,value};}}
for(const w of candidates){const ways=w.ways-w.allWild,assigned=!!(best&&w.symbol===best.symbol);let amount=ways*w.value;if(assigned)amount+=wildWays*best.value;if(amount>0){const naturalCols=Array.from({length:w.length},(_,c)=>grid[c].some(t=>t.s===w.symbol));const positions=w.positions.filter(p=>grid[Math.floor(p/5)][p%5].s!==10||assigned||naturalCols.some((v,c)=>v&&c!==Math.floor(p/5)));wins.push({...w,positions,columns:Array.from({length:w.length},(_,i)=>i+1),ways:ways+(assigned?wildWays:0),amount});for(const p of positions)removed.add(p);}}
return {wins,positions:[...removed],amount:wins.reduce((a,w)=>a+w.amount,0)};}
export function collapse(s,grid,positions){const gone=new Set(positions),g=grid.map(col=>col.slice());for(let c=0;c<6;c++){let start=0;for(let end=0;end<=5;end++){if(end<5&&grid[c][end].s!==11)continue;const survivors=[];for(let r=start;r<end;r++)if(!gone.has(c*5+r))survivors.push(grid[c][r]);const missing=end-start-survivors.length;const next=[...Array.from({length:missing},()=>tile(s)),...survivors];for(let r=start;r<end;r++)g[c][r]=next[r-start];start=end+1;}}return g;}
function targets(g,predicate){return g.flatMap((col,c)=>col.flatMap((t,r)=>predicate(t.s)?[{c,r}]:[]));}
function choose(s,a,n){const pool=[...a],out=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(random(s)*pool.length),1)[0]);return out;}
function transform(s,g,kind,count,capture=true){const before=capture?clone(g):null;let list=[],source=null,dest=10;
if(kind==='MEGA WILD DROP'){const cols=[0,1,2,3,4,5].filter(c=>g[c].some(t=>t.s!==10&&t.s!==11));if(cols.length){const c=pick(s,cols);list=targets(g,t=>t!==11&&t!==10).filter(p=>p.c===c);}}
else if(kind==='NEON STORM'){const types=[...new Set(targets(g,t=>t<5).map(p=>g[p.c][p.r].s))];if(types.length){const type=pick(s,types);dest=5+Math.floor(random(s)*5);list=targets(g,t=>t===type);}}
else if(kind==='RIFT LINK'){const sources=targets(g,t=>t>=5&&t<=10).filter(p=>targets(g,t=>t!==11&&t!==10).some(q=>q.c!==p.c&&g[q.c][q.r].s!==g[p.c][p.r].s));if(sources.length){source=pick(s,sources);dest=g[source.c][source.r].s;list=choose(s,targets(g,t=>t!==11&&t!==10&&t!==dest).filter(p=>p.c!==source.c),1);}}
else{const eligible=targets(g,t=>t<5);if(eligible.length<(kind==='REACTOR PULSE'?2:kind==='CORE EVOLUTION'?3:1))return null;list=choose(s,eligible,count);if(kind==='CORE EVOLUTION')dest=5+Math.floor(random(s)*5);}
if(!list.length)return null;for(const p of list)g[p.c][p.r].s=dest;return {type:'power',name:kind,before,grid:capture?clone(g):null,targets:list,source,dest};}
export function play(s,{buy=null,capture=true}={}){if(s.pending)throw Error('Pending presentation');if(buy&&!['core','overdrive'].includes(buy))throw Error('Invalid purchase');let round=s.round;const fs=!!round;if(fs&&buy)throw Error('Round in progress');const hunt=!fs&&!buy&&!!s.settings.hunt;const bet=fs?round.bet:s.bet;const cost=fs?0:money(bet*(buy==='core'?80:buy==='overdrive'?350:hunt?3:1));if(hunt)scatterDistribution(true);if(cost>s.balance)throw Error('Insufficient credits');if(buy&&!s.settings.buys)throw Error('Purchases disabled');if(!fs)round={id:`${s.seed}-${s.draws}`,mathVersion:MATH_VERSION,bet,total:0,mode:'base',played:0,awarded:0,global:1,thresholds:[],nextWilds:0,evolution:false};s.balance=money(s.balance-cost);
const mathVersion=round.mathVersion||'rift-1.0',mode=round.mode,startGlobal=round.global,events=[];let grid=initial(s,{hunt,legacy:mathVersion==='rift-1.0'});if(buy){const cols=choose(s,[0,1,2,3,4,5],buy==='core'?4:5+Math.floor(random(s)*2));for(let c=0;c<6;c++)for(let r=0;r<5;r++)if(grid[c][r].s===11)grid[c][r].s=normal(s);for(const c of cols)grid[c][Math.floor(random(s)*5)].s=11;}
// Ensure the explicit preparatory rule has a real normal target, even in the
// rare initial outcome containing only premiums, Wilds and portals.
if(mode==='overdrive'&&!grid.flat().some(t=>t.s<5)){const p=pick(s,targets(grid,t=>t!==11));grid[p.c][p.r].s=normal(s)%5;}
const start=capture?clone(grid):null,scatters=grid.flat().filter(t=>t.s===11).length;let added=0,spinWin=0,cascade=0,capped=false;
if(fs){round.played++;if(scatters>=3){added=Math.min(mode==='core'?4:6,40-round.awarded);round.awarded+=added;}}
if(capture)events.push({type:'initial',grid:clone(grid),scatters});
function power(name,count){const e=transform(s,grid,name,count,capture);if(e&&capture)events.push(e);}
if(mode==='overdrive'){power('CORE IMPULSE',1+round.nextWilds);round.nextWilds=0;}
function powers(pulse=false){const p=CONFIG.powers[mode];for(const [i,name] of ['MEGA WILD DROP','NEON STORM','WILD SURGE','RIFT LINK'].entries()){if(i===2&&round.evolution){const e=transform(s,grid,'CORE EVOLUTION',3,capture);if(e){if(capture)events.push(e);round.evolution=false;round.evolved=true;}}if(i===3&&pulse&&random(s)<CONFIG.pulse)power('REACTOR PULSE',2+Math.floor(random(s)*3));if(random(s)<p[i])power(name,1+Math.floor(random(s)*3));}}
if(!buy)powers();
while(!buy){const result=evaluate(grid);if(!result.amount)break;cascade++;const cm=Math.min(10,cascade),gm=round.global;const raw=money(result.amount*bet*cm*gm),win=money(Math.min(raw,25000*bet-round.total));round.total=money(round.total+win);spinWin=money(spinWin+win);s.balance=money(s.balance+win);if(mode!=='base'){round.global=Math.min(mode==='core'?25:100,gm+(mode==='core'?1:2));if(mode==='core'&&round.global>=10&&!round.evolved)round.evolution=true;if(mode==='overdrive')for(const t of [25,50])if(round.global>t&&!round.thresholds.includes(t)){round.thresholds.push(t);round.nextWilds+=2;}}
if(capture)events.push({type:'win',grid:clone(grid),...result,win,raw,cm,gm,nextGlobal:round.global,total:spinWin});
if(round.total>=25000*bet){capped=true;added=0;break;}const before=capture?clone(grid):null;grid=collapse(s,grid,result.positions);if(capture)events.push({type:'fall',before,grid:clone(grid)});powers(cascade%3===0);
// A genuine cap terminates long rounds; no arbitrary cascade truncation.
}
let intro=null,end=false;if(capped)end=true;else if(!fs&&(buy||scatters>=4)){intro=buy||(scatters===4?'core':'overdrive');round.mode=intro;round.awarded=intro==='core'?8:12;round.global=intro==='core'?1:5;}else if(fs&&round.played>=round.awarded)end=true;
const record={id:`${round.id}-${round.played}-${s.draws}`,mathVersion,mode,bet,cost,hunt,start,startGlobal,events,win:spinWin,roundTotal:round.total,scatters,added,played:round.played,awarded:round.awarded,global:round.global,intro,end,capped,buy};s.grid=grid;s.round=(intro||fs)&&!end?round:null;if(capture){s.history.unshift(record);s.history=s.history.slice(0,40);s.pending=record;}return record;}
