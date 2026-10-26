import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,play,MATH_VERSION,scatterDistribution,CONFIG} from '../engine.js';

const rounds=Number(process.argv[2]||10000);
if(!Number.isInteger(rounds)||rounds<2)throw Error('Use at least 2 complete rounds');
const results=[];
const scenarios=(process.argv[3]||'base,hunt,core,rift,overdrive').split(',');
if(scenarios.some(mode=>!['base','hunt','core','rift','overdrive'].includes(mode)))throw Error('Invalid scenario');
const bet=Number(process.argv[5]||1);
for(const [index,scenario] of scenarios.entries()){
 const seed=Number(process.argv[6]||20261026)+index,s=fresh(seed);s.bet=bet;s.settings.hunt=scenario==='hunt';
 let sum=0,squares=0,cost=0,freeSpins=0;const entries={},bonusReturns={};
 for(let i=0;i<rounds;i++){
  s.balance=1e9;
  let r=play(s,{buy:['core','rift','overdrive'].includes(scenario)?scenario:null,capture:false});
  const debit=r.cost;let win=r.win;const key=r.intro?`${r.intro}-${r.scatters}`:null,entryWin=r.win;if(key)entries[key]=(entries[key]||0)+1;
  while(s.round){r=play(s,{capture:false});win+=r.win;freeSpins++;}
  if(key){const g=bonusReturns[key]||={n:0,sum:0,squares:0};const x=(win-entryWin)/bet;g.n++;g.sum+=x;g.squares+=x*x;}const ratio=win/debit;sum+=ratio;squares+=ratio*ratio;cost+=debit;
 }
 const rtp=sum/rounds,se=Math.sqrt(Math.max(0,(squares-sum*sum/rounds)/(rounds-1))/rounds);
 results.push({scenario,seed,bet,rounds,rtp,ci95:[rtp-1.96*se,rtp+1.96*se],cost,freeSpins,entries,bonusReturns});
}
const hash=file=>createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
const report={date:new Date().toISOString(),version:MATH_VERSION,kind:'local-complete-round-sample',
 configurationHash:hash('math-config.js'),engineHash:hash('engine.js'),
 note:'Diagnostic sample only; does not establish 96% RTP. No cloud reads.',
 scatterChance:CONFIG.scatterChance,distribution:scatterDistribution(),results};
writeFileSync(new URL(process.argv[4]||'../round-crosscheck.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const r of results)console.log(`${r.scenario}: ${(100*r.rtp).toFixed(2)}%, CI95 ${r.ci95.map(v=>(100*v).toFixed(2)).join('–')}%, ${r.freeSpins} FS`);

