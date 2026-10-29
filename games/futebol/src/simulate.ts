import {createHash} from 'node:crypto';
import {config,validateConfig,type Mode,type Config} from './config.ts';
import {round} from './engine.ts';
import {SeededRandom} from './random.ts';
export const bands=['zero','(0,1]','(1,5]','(5,20]','(20,100]','(100,500]','(500,2000]','(2000,10000]'];
function bucket(x:number){if(x===0)return 0;return [1,5,20,100,500,2000,10000].findIndex(limit=>x<=limit)+1;}
class Moments {n=0;mean=0;m2=0;add(x:number){this.n++;const delta=x-this.mean;this.mean+=delta/this.n;this.m2+=delta*(x-this.mean);}sd(){return this.n>1?Math.sqrt(this.m2/(this.n-1)):null;}}
class BonusStats {
  moments=new Moments();hist=Array(8).fill(0) as number[];spins=0;
  add(paid:number,bet:number,spins:number){this.moments.add(paid/bet);this.hist[bucket(paid/bet)]++;this.spins+=spins;}
  report(){const quantiles:Record<string,string|null>={};for(const q of [0.5,0.9,0.95,0.99]){let cumulative=0;quantiles[String(q)]=null;for(let i=0;i<this.hist.length&&this.moments.n;i++){cumulative+=this.hist[i];if(cumulative>=Math.ceil(q*this.moments.n)){quantiles[String(q)]=bands[i];break;}}}return {count:this.moments.n,meanReturnX:this.moments.n?this.moments.mean:null,sdX:this.moments.sd(),meanSpins:this.moments.n?this.spins/this.moments.n:null,distribution:Object.fromEntries(bands.map((b,i)=>[b,this.hist[i]])),quantileIntervalsX:quantiles,quantileMethod:'Intervalos do histograma; não são quantis pontuais.'};}
}
export function simulate(mode:Mode,bet:number,count:number,seed:string,c:Config=config,bonusHunt=false){
  validateConfig(c);if(!Number.isSafeInteger(count)||count<1||count>Math.floor(Number.MAX_SAFE_INTEGER/(24*(c.freeSpins+1))))throw Error('Quantidade inválida');if(!c.bets.includes(bet))throw Error('Aposta inválida');
  const rng=new SeededRandom(seed),moments=new Moments(),normal=new BonusStats(),superior=new BonusStats(),legend=new BonusStats();
  let totalPaid=0n,totalCost=0n,basePaid=0n,bonusPaid=0n,totalSpins=0,hit=0,profit=0,below=0,equal=0,scatter3=0,scatter4=0,scatter5=0,caps=0,max=0;
  const histogram=Array(8).fill(0) as number[],metrics={eligible:0,wilds:0,success:0,powers:[0,0,0,0],newSticky:0,retriggers:0,extraFreeSpins:0};
  // Exact integer totals/squares allow auditing the floating point online moments.
  let squaredPaid=0n;
  for(let i=0;i<count;i++){
    const r=round(mode,bet,rng,c,false,bonusHunt),paid=BigInt(r.paid);
    totalPaid+=paid;squaredPaid+=paid*paid;totalCost+=BigInt(r.cost);basePaid+=BigInt(r.basePaid);bonusPaid+=BigInt(r.bonusPaid);totalSpins+=r.spins;
    moments.add(r.paid/r.cost);if(r.paid>0)hit++;if(r.paid>r.cost)profit++;else if(r.paid===r.cost)equal++;else if(r.paid>0)below++;
    if(r.scatterCount===3)scatter3++;if(r.scatterCount===4)scatter4++;if(r.scatterCount===5)scatter5++;if(r.cap)caps++;max=Math.max(max,r.paid/bet);histogram[bucket(r.paid/bet)]++;
    if(r.bonusMode)({normal,superior,legend}[r.bonusMode]).add(r.bonusPaid,bet,r.bonusSpins);
    for(const key of ['eligible','wilds','success','newSticky','retriggers','extraFreeSpins'] as const)metrics[key]+=r.metrics[key];r.metrics.powers.forEach((v,j)=>metrics.powers[j]+=v);
  }
  const sd=moments.sd(),margin=sd===null?null:1.96*sd/Math.sqrt(count),rtp=Number(totalPaid)/Number(totalCost)*100;
  return {bonusHunt,configVersion:c.version,configHash:createHash('sha256').update(JSON.stringify(c)).digest('hex'),seed,rng:'FNV-1a + Mulberry32',finalRngState:rng.state(),mode,betCents:bet,rounds:count,totalSpins,
    totalCostCents:totalCost.toString(),totalPaidCents:totalPaid.toString(),sumSquaredPaidCents:squaredPaid.toString(),targetRtpPercent:c.targetRtpPercent,observedRtpPercent:rtp,
    sdReturnPerCost:sd,ci95RtpPercent:margin===null?null:[(moments.mean-margin)*100,(moments.mean+margin)*100],
    contributionsPercentagePoints:{base:Number(basePaid)/Number(totalCost)*100,bonus:Number(bonusPaid)/Number(totalCost)*100},
    hitFrequency:hit/count,profitFrequency:profit/count,belowCostCount:below,equalCostCount:equal,zeroCount:histogram[0],
    scatters:{three:scatter3,four:scatter4,threeFrequency:scatter3/count,fourFrequency:scatter4/count,five:scatter5,fiveFrequency:scatter5/count},
    bonus:{normal:normal.report(),superior:superior.report(),legend:legend.report()},metrics,maxObservedX:max,capCount:caps,capFrequency:caps/count,
    distributionReference:'Total da ronda dividido pela aposta de referência; não pelo preço da compra.',distribution:Object.fromEntries(bands.map((b,i)=>[b,histogram[i]])),
    limitations:['Estimativa empírica da configuração identificada, não prova de RTP teórico.','IC95 normal aproximado calculado por ronda completa; prémios raros podem tornar a aproximação insuficiente.','Amostra não demonstra frequência da cauda nem ausência de eventos não observados.','Totais monetários e quadrados exportados como strings inteiras exatas; momentos estatísticos usam ponto flutuante.']};
}
