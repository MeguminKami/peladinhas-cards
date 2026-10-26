export const CONFIG = Object.freeze({ initialBalance:100000, minBet:100, maxBet:10000, quickBets:[100,500,1000,2500], steps:10, rtp:0.97 });
export const MODES = Object.freeze({easy:{name:'Fácil',p:.95,icon:'◈',place:'Avenida Fitness'},normal:{name:'Normal',p:.88,icon:'⚡',place:'Rua das Tentações'},hard:{name:'Difícil',p:.75,icon:'♨',place:'Autoestrada dos Fritos'},extreme:{name:'Extremo',p:.60,icon:'☠',place:'Inferno do Óleo'}});
export const multiplier=(mode,n)=>n ? CONFIG.rtp / MODES[mode].p ** n : 1;
export const payout=(bet,mode,n)=>n ? Math.floor(bet*multiplier(mode,n)+1e-9) : 0;
export function random(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
export function fresh(){return {version:1,balance:CONFIG.initialBalance,round:null,history:[]};}
export function validate(s){
 if(!s || s.version!==1 || !Number.isSafeInteger(s.balance)||s.balance<0 || !Array.isArray(s.history)||s.history.length>50)throw Error('Sessão local inválida.');
 const r=s.round;if(r && (!MODES[r.mode]||!Number.isInteger(r.step)||r.step<0||r.step>10||!Number.isInteger(r.bet)||r.bet<CONFIG.minBet||r.bet>CONFIG.maxBet||!['active','lost','paid','won'].includes(r.status)||typeof r.id!=='string'))throw Error('Ronda local inválida.');return s;
}
export function transition(state,action,rng=random){
 const s=structuredClone(validate(state));let r=s.round;
 if(action.type==='start'){
  if(r?.status==='active')throw Error('Já tens um treino em curso.');
  const {bet,mode}=action;if(!MODES[mode]||!Number.isInteger(bet)||bet<CONFIG.minBet||bet>CONFIG.maxBet||bet>s.balance)throw Error('Aposta fora dos limites ou saldo insuficiente.');
  s.balance-=bet;s.round={id:crypto.randomUUID(),bet,mode,step:0,status:'active',payment:0,at:new Date().toISOString()};return s;
 }
 if(!r||r.status!=='active'||action.id!==r.id)throw Error('Esta ronda já terminou ou mudou.');
 if(action.type==='step'){
  const roll=rng();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Resultado aleatório inválido.');
  if(roll>=MODES[r.mode].p)r.status='lost';else {r.step++;if(r.step===10){r.status='won';r.payment=payout(r.bet,r.mode,r.step);s.balance+=r.payment;}}
 }else if(action.type==='cashout'){
  if(r.step<1)throw Error('Completa o primeiro passo antes de levantar.');
  r.status='paid';r.payment=payout(r.bet,r.mode,r.step);s.balance+=r.payment;
 }else throw Error('Ação inválida.');
 if(r.status!=='active')s.history=[structuredClone(r),...s.history].slice(0,50);
 return s;
}
