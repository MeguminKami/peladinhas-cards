// Every eligible cell is an independent draw from fixed per-reel weights.
// No target outcomes, quotas, retries or player-dependent adjustments.
export const MATH_VERSION='rift-4.15';
const weights=[16,15,14,13,12,10,7.5,5.5,4,3];
const reels=bias=>Array.from({length:6},(_,c)=>weights.map((w,i)=>w*(i===c?bias:1)));
const reelWeights=reels(10);
export const CONFIG={
 growth:{cascadeMultiplier:false,core:{every:3,step:1},rift:{every:3,step:1},overdrive:{every:3,step:1}},
 target:.96,precision:[.94,.98],rng:'xoshiro128**',sampling:'independent-symbol-weights',
 payDenominator:100000,payScale:1.1,payBase:[.1,.125,.15,.2],payFactors:[1,1.1,1.2,1.3,1.4,1.8,2.5,3.5,5,7],
 prices:{core:80,rift:220,overdrive:450},
 bonuses:{core:{name:'CORE AWAKENING',spins:8,startGlobal:1,maxGlobal:25,retrigger:4,art:8},rift:{name:'RIFT ASCENSION',spins:10,startGlobal:3,maxGlobal:50,retrigger:5,art:7},overdrive:{name:'CRITICAL OVERDRIVE',spins:12,startGlobal:5,maxGlobal:100,retrigger:6,art:9}},
 payOverrides:{},
 // Chance in the next column, indexed by Scatters already on the board.
 // Percentages have at most two decimal places; no preselected bonus/count.
 scatterChance:[.0011,.8516,.8516,.8516,.8516,.8643],
 huntScatterBoost:3,
 naturalScatterScale:1/2.47,
 bonusScatters:{core:3,rift:4,overdrive:5},
 extraOverdriveSpins:2,
 purchaseSixScatterChance:.3333,
 profiles:{
 base:{weights:[...weights],reelWeights:reels(4.06),wild:.001,powers:[0,0,0,0],pulse:0},
 hunt:{weights:[...weights],reelWeights:reels(4.24),wild:.0416,powers:[0,0,0,0],pulse:0},
 core:{weights:[...weights],reelWeights:reels(2.8),wild:.015,powers:[.015,.08,.12,.10],pulse:.35,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 rift:{weights:[...weights],reelWeights:reels(3.415),wild:.02,powers:[.02,.10,.14,.12],pulse:.45,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]},
 overdrive:{weights:[...weights],reelWeights:reels(5.88),wild:.02,powers:[.025,.12,.16,.14],pulse:.6,scatterK:[.8,.13,.05,.019,.0009,.00009,.00001]}
 }};
export const PAY=CONFIG.payFactors.map((f,i)=>[0,0,0,...(CONFIG.payOverrides?.[i]||CONFIG.payBase.map(v=>v*f)).map(v=>Math.round(v*CONFIG.payScale*CONFIG.payDenominator)/CONFIG.payDenominator)]);
export const purchasePrice=(mode,bet)=>Math.round(CONFIG.prices[mode]*Math.round(bet*100))/100;





