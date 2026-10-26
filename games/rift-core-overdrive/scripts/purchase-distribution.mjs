import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,play,CONFIG,MATH_VERSION} from '../engine.js';
const n=Number(process.argv[2]||1000),bet=Number(process.argv[3]||.1),seed=Number(process.argv[4]||811026);
if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(seed)||!Number.isFinite(bet)||bet<=0)throw Error('Use rounds bet seed');
const betCents=Math.round(bet*100),results=[];
for(const [index,mode] of ['core','rift','overdrive'].entries()){
 const state=fresh(seed+index);state.bet=bet;const winsCents=[],bins={};let fs=0,retriggers=0,caps=0;
 for(let i=0;i<n;i++){
  state.balance=1e10;const entry=play(state,{buy:mode,capture:false});let cents=Math.round(entry.win*100),last=entry;
  while(state.round){last=play(state,{capture:false});cents+=Math.round(last.win*100);fs++;if(last.added>0)retriggers++;}
  if(last.capped)caps++;winsCents.push(cents);const bin=Math.floor(cents/(100*betCents));bins[bin]=(bins[bin]||0)+1;
 }
 const sum=winsCents.reduce((a,b)=>a+b,0),min=Math.min(...winsCents),max=Math.max(...winsCents);
 const r={mode,rounds:n,seed:seed+index,bet,price:CONFIG.prices[mode],meanX:sum/n/betCents,minX:min/betCents,maxX:max/betCents,meanWin:sum/n/100,minWin:min/100,maxWin:max/100,rtp:sum/(n*CONFIG.prices[mode]*betCents),fs,retriggers,caps,bins,winsCents};results.push(r);
 console.log(JSON.stringify({...r,winsCents:undefined}));
}
const hash=f=>createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex');
const report={date:new Date().toISOString(),version:MATH_VERSION,roundsPerBonus:n,bet,binWidthX:100,seed,configuration:CONFIG,configurationHash:hash('math-config.js'),engineHash:hash('engine.js'),note:'Gross total payouts per complete purchased round, in multiples of base bet, not purchase price. Includes all free spins, retriggers and round cap. Seeds fixed before simulation. Local only; no cloud.',results};
const dir=new URL('../../reports/',import.meta.url);mkdirSync(dir,{recursive:true});const prefix=`rift-purchases-${n}-2026-10-26-${MATH_VERSION}`;
writeFileSync(new URL(prefix+'.json',dir),JSON.stringify(report,null,2)+'\n');
const fmt=x=>x.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
const lines=[`# Rift: ${n} compras completas de cada bónus`, '',`Simulação local de ${report.date.slice(0,10)}, versão ${MATH_VERSION}, aposta-base ${fmt(bet)}. Prémios brutos em × da aposta-base; não são lucro líquido nem × do preço da compra. Inclui todos os FS, retriggers e cap. Seeds ${results.map(r=>r.seed).join('/')}.`, '', '| Bónus | Preço | Média | Mínimo | Máximo | RTP da amostra |','|---|---:|---:|---:|---:|---:|'];
for(const r of results)lines.push(`| ${r.mode} | ${r.price}× | ${fmt(r.meanX)}× | ${fmt(r.minX)}× | ${fmt(r.maxX)}× | ${fmt(100*r.rtp)}% |`);
lines.push('','## Distribuição em intervalos de 100×','','Limite inferior incluído e superior excluído. Contagens sobre '+n+' compras por bónus.','', '| Intervalo da win | Core | Rift | Overdrive |','|---|---:|---:|---:|');
const last=Math.max(...results.map(r=>Math.floor(r.maxX/100)));
for(let b=0;b<=last;b++)lines.push(`| ${b*100}–<${(b+1)*100}× | ${results.map(r=>r.bins[b]||0).join(' | ')} |`);
lines.push('',`[Dados completos e prémios de cada ronda](./${prefix}.json).`,'','Estes 1000 resultados mostram a dispersão de prémios, não certificam o RTP. A simulação não modifica os parâmetros do jogo.','', 'Reproduzir, na raiz do projeto:','', '```sh',`node games/rift-core-overdrive/scripts/purchase-distribution.mjs ${n} ${bet} ${seed}`,'```','');
writeFileSync(new URL(prefix+'.md',dir),lines.join('\n'));

