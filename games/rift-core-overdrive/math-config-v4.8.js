// Every eligible cell is an independent draw from fixed per-reel weights.
// No target outcomes, quotas, retries or player-dependent adjustments.
export const MATH_VERSION='rift-4.8';
const weights=[16,15,14,13,12,10,7.5,5.5,4,3];
const reels=bias=>Array.from({length:6},(_,c)=>weights.map((w,i)=>w*(i===c?bias:1)));
const reelWeights=reels(10);
export const CONFIG={
 growth:{cascadeEvery:2,core:{every:3,step:1},rift:{every:3,step:1},overdrive:{every:3,step:1}},
 target:.96,precision:[.94,.98],rng:'xoshiro128**',sampling:'independent-symbol-weights',
 payDenominator:10000,payScale:1,payBase:[.05,.15,.5,2],payFactors:[1,1.1,1.2,1.3,1.4,2,3,4.5,7,10],
 prices:{core:15.6,rift:59.1,overdrive:907.5},
 bonuses:{core:{name:'CORE AWAKENING',spins:8,startGlobal:1,maxGlobal:25,retrigger:4,art:8},rift:{name:'RIFT ASCENSION',spins:10,startGlobal:3,maxGlobal:50,retrigger:5,art:7},overdrive:{name:'CRITICAL OVERDRIVE',spins:12,startGlobal:5,maxGlobal:100,retrigger:6,art:9}},
 payOverrides:{},
 // Chance in the next column, indexed by Scatters already on the board.
 // Percentages have at most two decimal places; no preselected bonus/count.
 scatterChance:[.0011,.8516,.8516,.8516,.8516,.8643],
 huntScatterBoost:1.5,
 bonusScatters:{core:3,rift:4,overdrive:5},
 extraOverdriveSpins:2,
 purchaseSixScatterChance:.3333,
 profiles:{
 base:{weights:[...weights],reelWeights:reels(7.59),wild:.001,powers:[.001,.006,.009,.006],pulse:.04},
 hunt:{weights:[...weights],reelWeights,wild:.0329,powers:[.0022,.018,.024,.018],pulse:.12},
 core:{weights:[...weights],reelWeights,wild:.008,powers:[.006,.03,.05,.04],pulse:.2,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 rift:{weights:[...weights],reelWeights,wild:.009,powers:[.008,.04,.06,.05],pulse:.25,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 overdrive:{weights:[...weights],reelWeights,wild:.01,powers:[.02,.10,.14,.12],pulse:.6,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]}
 }};
export const PAY=CONFIG.payFactors.map((f,i)=>[0,0,0,...(CONFIG.payOverrides?.[i]||CONFIG.payBase.map(v=>v*f)).map(v=>Math.round(v*CONFIG.payScale*CONFIG.payDenominator)/CONFIG.payDenominator)]);
export const purchasePrice=(mode,bet)=>Math.round(CONFIG.prices[mode]*Math.round(bet*100))/100;
