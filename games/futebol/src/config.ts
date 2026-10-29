export type Mode = 'base' | 'normal' | 'superior' | 'legend';
export const symbols = ['N1','N2','N3','N4','P1','P2','P3','P4','W','S'] as const;
export type SymbolId = typeof symbols[number];
export const config = {
  version: '0.9.2', targetRtpPercent:65,
  // Static payout factors in basis points; selected before play, never adaptive.
  payoutScaleBps:{base:27200,normal:117700,superior:30000,legend:30000},
  bets: [20,40,60,80,100,150,200,300,400,500,750,1000],
  lines: '111111 444444 222222 333333 123432 432123 234321 321234 112211 443344 223322 332233 122221 433334 233332 322223 123321 432234 234432 321123 121212 434343 232323 323232 212121 343434 112233 443322 332211 223344 122334 433221 211223 344332 123444 432111 111234 444321 222333 333222'.split(' ').map(s=>[...s].map(n=>Number(n)-1)),
  // Hundredths of a total-bet multiplier.
  pays: [[3,9,30,90],[4,11,40,126],[5,14,55,180],[6,18,75,270],[10,36,150,540],[12,45,200,720],[15,63,300,1080],[20,90,500,1800]],
  weights: {base:[240,215,185,155,80,55,35,20,15],normal:[18672,16727,14393,12059,6224,4279,2723,1556,4925],superior:[240,215,185,155,80,55,35,20,55],legend:[4464,3999,3441,2883,1488,1023,651,372,1379]},
  scatterWeights: [149990,40000,9300,640,60,10],
  huntScatterWeights:[249970,120000,27900,1920,180,30], huntCostMultiplier:3,
  bonusScatterWeights:[8000,1400,500,100], retriggerFreeSpins:5,
  steal: {base:12,normal:50,superior:100,legend:100},
  sticky:18, legendSticky:25, freeSpins:10, prices:{normal:90,superior:220,legend:450}, cap:10000,
  overloadWeights:[75,23,2], overloadValues:[2,3,5], conversionMin:2,conversionMax:10,conversionWeights:[18,16,14,12,11,9,8,7,5],localCap:8,
};
export type Config = typeof config;
export function validateConfig(c:Config) {
  if(c.lines.length!==40 || new Set(c.lines.map(x=>x.join(''))).size!==40 || c.lines.some(x=>x.length!==6||x.some(r=>!Number.isInteger(r)||r<0||r>3))) throw Error('Linhas inválidas');
  for(const weights of [...Object.values(c.weights),c.scatterWeights,c.huntScatterWeights,c.bonusScatterWeights,c.overloadWeights,c.conversionWeights]) if(weights.some(w=>!Number.isSafeInteger(w)||w<0)||weights.reduce((a,b)=>a+b,0)<=0) throw Error('Pesos inválidos');
  if(c.huntScatterWeights.length!==6||c.huntCostMultiplier!==3)throw Error('Bonus Hunt inválido');
  if(c.bonusScatterWeights.length!==4||!Number.isSafeInteger(c.retriggerFreeSpins)||c.retriggerFreeSpins<1)throw Error('Retrigger inválido');
  if(c.scatterWeights.length!==6 || c.overloadWeights.length!==3 || c.overloadValues.length!==3 || Object.values(c.weights).some(w=>w.length!==9)) throw Error('Dimensões inválidas');
  if([...Object.values(c.steal),c.sticky,c.legendSticky].some(p=>p<0||p>100)) throw Error('Probabilidade inválida');
  if(c.pays.length!==8||c.pays.some(p=>p.length!==4||p.some(v=>!Number.isSafeInteger(v)||v<0)) || !Number.isSafeInteger(c.cap)||c.cap<=0 || !Number.isSafeInteger(c.freeSpins)||c.freeSpins<1) throw Error('Pagamentos/limites inválidos');
  if(Object.values(c.payoutScaleBps).some(v=>!Number.isSafeInteger(v)||v<=0))throw Error('Escalas inválidas');
  if(!Number.isInteger(c.conversionMin)||!Number.isInteger(c.conversionMax)||c.conversionMin<1||c.conversionMax<c.conversionMin||c.conversionMax>24)throw Error('Conversão inválida');
  if(c.conversionWeights.length!==c.conversionMax-c.conversionMin+1)throw Error('Pesos de conversao invalidos');
}
validateConfig(config);
