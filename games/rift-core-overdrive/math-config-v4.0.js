// Every eligible cell is an independent weighted draw. Identical probabilities
// in every row/reel; premium rarity is explicit. No target positions or quotas.
export const MATH_VERSION='rift-4.0';
const weights=[16,15,14,13,12,10,7.5,5.5,4,3];
export const CONFIG={
 target:.96,precision:[.959,.961],rng:'xoshiro128**',sampling:'independent-symbol-weights',
 payDenominator:10000,payScale:1,payBase:[.05,.0505,.051,.052],payFactors:[1,1.1,1.2,1.3,1.4,1.8,2.4,3.4,5,8],
 prices:{core:161,overdrive:1575},
 payOverrides:{"5":[0.075,0.117,0.2925,0.78],"6":[0.078,0.182,0.4875,1.3],"7":[0.1105,0.2925,0.78,2.275],"8":[0.1625,0.4875,1.3,3.9],"9":[0.26,0.78,2.275,7.8]},
 scatterK:[.771675,.15,.06,.018,.0003,.000022,.000003],
 profiles:{
 base:{weights:[...weights],wild:.006,powers:[.0005,.003,.0045,.003],pulse:.01},
 hunt:{weights:[...weights],wild:.035,powers:[.0005,.003,.0045,.003],pulse:.05},
 core:{weights:[...weights],wild:.008,powers:[.002,.01,.02,.015],pulse:.08,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 overdrive:{weights:[...weights],wild:.01,powers:[.004,.018,.025,.02],pulse:.1,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]}
 }};
export const PAY=CONFIG.payFactors.map((f,i)=>[0,0,0,...(CONFIG.payOverrides?.[i]||CONFIG.payBase.map(v=>Math.round(v*f*CONFIG.payDenominator)/CONFIG.payDenominator))]);
export const purchasePrice=(mode,bet)=>Math.round(CONFIG.prices[mode]*Math.round(bet*100))/100;
