// Every eligible cell is an independent weighted draw. Identical probabilities
// in every row/reel; premium rarity is explicit. No target positions or quotas.
export const MATH_VERSION='rift-4.4';
const weights=[16,15,14,13,12,10,7.5,5.5,4,3];
export const CONFIG={
 growth:{cascadeEvery:2,core:{every:3,step:1},rift:{every:3,step:1},overdrive:{every:3,step:1}},
 target:.96,precision:[.959,.961],rng:'xoshiro128**',sampling:'independent-symbol-weights',
 payDenominator:10000,payScale:1,payBase:[.05,.0505,.051,.052],payFactors:[1,1.1,1.2,1.3,1.4,1.8,2.4,3.4,5,8],
 prices:{core:79,rift:240,overdrive:804},
 bonuses:{core:{name:'CORE AWAKENING',spins:8,startGlobal:1,maxGlobal:25,retrigger:4,art:8},rift:{name:'RIFT ASCENSION',spins:10,startGlobal:3,maxGlobal:50,retrigger:5,art:7},overdrive:{name:'CRITICAL OVERDRIVE',spins:12,startGlobal:5,maxGlobal:100,retrigger:6,art:9}},
 payOverrides:{"5":[0.075,0.117,0.2925,0.78],"6":[0.078,0.182,0.4875,1.3],"7":[0.1105,0.2925,0.78,2.275],"8":[0.1625,0.4875,1.3,3.9],"9":[0.26,0.78,2.275,7.8]},
 // Chance in the next column, indexed by Scatters already on the board.
 // Percentages have at most two decimal places; no preselected bonus/count.
 scatterChance:[.0011,.8516,.8516,.8516,.8516,.8641],
 huntScatterBoost:1.5,
 bonusScatters:{core:3,rift:4,overdrive:5},
 extraOverdriveSpins:2,
 purchaseSixScatterChance:.3333,
 profiles:{
 base:{weights:[...weights],wild:.006,powers:[.0017,.013,.019,.013],pulse:.04},
 hunt:{weights:[...weights],wild:.0362,powers:[.0022,.018,.024,.018],pulse:.12},
 core:{weights:[...weights],wild:.008,powers:[.006,.03,.05,.04],pulse:.2,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 rift:{weights:[...weights],wild:.009,powers:[.008,.04,.06,.05],pulse:.25,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 overdrive:{weights:[...weights],wild:.01,powers:[.01,.05,.07,.06],pulse:.3,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]}
 }};
export const PAY=CONFIG.payFactors.map((f,i)=>[0,0,0,...(CONFIG.payOverrides?.[i]||CONFIG.payBase.map(v=>Math.round(v*f*CONFIG.payDenominator)/CONFIG.payDenominator))]);
export const purchasePrice=(mode,bet)=>Math.round(CONFIG.prices[mode]*Math.round(bet*100))/100;
