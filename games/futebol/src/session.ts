import {config,type Mode} from './config.ts';
import {spin,start,type State,type SpinResult} from './engine.ts';
import {SeededRandom} from './random.ts';

export interface HistoryRound {bonusHunt?:boolean;id:number;date:string;mode:Mode;bet:number;cost:number;paid:number;balance:number;complete:boolean;spins:SpinResult[];configVersion:string}
export interface PendingRetrigger {roundId:number;spinIndex:number;awarded:number}
export interface Session {schema:1;configVersion:string;revision:number;balance:number;bet:number;rngState:number;seed?:{value:string|null;generation:number;renewedAt:string|null};counter:number;active:State|null;pendingRetrigger:PendingRetrigger|null;history:HistoryRound[];requestIds:string[];topups:number}
export type Command={type:'start';mode:Mode;bonusHunt?:boolean}|{type:'next'};
export function createSession(seed:string):Session{return {schema:1,configVersion:config.version,revision:0,balance:100000,bet:20,rngState:new SeededRandom(seed).state(),seed:{value:seed,generation:1,renewedAt:null},counter:0,active:null,pendingRetrigger:null,history:[],requestIds:[],topups:0};}
export function restoreSession(input:Session):Session{
  if(input?.schema===1&&['0.5.0','0.5.1','0.6.0','0.7.0','0.7.1','0.8.0','0.8.1','0.8.2','0.9.0','0.9.1','0.9.2','0.9.3','0.9.4'].includes(input.configVersion)){
    const s=structuredClone(input);s.configVersion=config.version;s.revision++;
    if(s.active)s.history[0].configVersion=input.configVersion+' → '+config.version;
    validateSession(s);return s;
  }
  if(input?.schema===1&&['0.3.1','0.4.0'].includes(input.configVersion)){
    const s=structuredClone(input);s.configVersion=config.version;s.revision++;s.pendingRetrigger=null;
    if(s.active){s.active.global=s.active.global??s.history?.[0]?.spins?.at(-1)?.detail?.global??1;s.active.totalFreeSpins=s.history[0].spins.filter(r=>r.mode!=='base').length+s.active.remaining;s.history[0].configVersion=input.configVersion+' → '+config.version;}
    validateSession(s);return s;
  }
  validateSession(input);return input;
}
export function validateSession(s:Session){
  if(!s||s.schema!==1||s.configVersion!==config.version||!Number.isSafeInteger(s.balance)||s.balance<0||!config.bets.includes(s.bet)||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isSafeInteger(s.counter)||s.counter<0||!Array.isArray(s.history)||s.history.length>500||!Array.isArray(s.requestIds))throw Error('Sessão local inválida ou incompatível. Exporta os dados antes de repor a sessão.');
  SeededRandom.restore(s.rngState);
  if(s.seed&&((s.seed.value!==null&&typeof s.seed.value!=='string')||!Number.isSafeInteger(s.seed.generation)||s.seed.generation<1||(s.seed.renewedAt!==null&&typeof s.seed.renewedAt!=='string')))throw Error('Metadados da seed inválidos');
  if(s.active&&(!s.history[0]||s.history[0].complete||s.active.done))throw Error('Ronda ativa inválida');
  if(s.active&&(!Number.isSafeInteger(s.active.global)||s.active.global<1))throw Error('Multiplicador global inválido');
  if(s.active&&(!Number.isSafeInteger(s.active.totalFreeSpins)||s.active.totalFreeSpins<s.active.remaining))throw Error('Contador FS inválido');
  if(s.pendingRetrigger){const p=s.pendingRetrigger,row=s.history[0],result=row?.spins[p.spinIndex];if(!s.active||p.roundId!==row?.id||p.spinIndex!==row.spins.length-1||result?.retrigger?.awarded!==p.awarded)throw Error('Retrigger pendente inválido');}
}
export function acknowledgeRetrigger(snapshot:Session,pending:PendingRetrigger):Session{
  validateSession(snapshot);const current=snapshot.pendingRetrigger;
  if(!current||current.roundId!==pending.roundId||current.spinIndex!==pending.spinIndex)return snapshot;
  return {...snapshot,pendingRetrigger:null,revision:snapshot.revision+1};
}
// Pure transaction: caller persists returned snapshot before exposing the result.
export function execute(snapshot:Session,command:Command,requestId:string,date:string){
  validateSession(snapshot);if(!requestId)throw Error('Pedido sem identificador');
  if(snapshot.requestIds.includes(requestId))return snapshot;
  if(snapshot.pendingRetrigger)throw Error('Confirma os free spins ganhos antes de continuar');
  const s=structuredClone(snapshot),rng=SeededRandom.restore(s.rngState);
  let state:State;
  if(command.type==='start'){
    if(s.active)throw Error('Termina os free spins antes de iniciar outra ronda');
    if(!['base','normal','superior','legend'].includes(command.mode))throw Error('Modo inválido');
    if(command.bonusHunt&&command.mode!=='base')throw Error('Bonus Hunt apenas no jogo base');
    const cost=s.bet*(command.mode==='base'?(command.bonusHunt?config.huntCostMultiplier:1):config.prices[command.mode]);
    if(s.balance<cost)throw Error('Saldo fictício insuficiente');
    s.balance-=cost;s.counter++;
    s.history.unshift({...((command.bonusHunt&&command.mode==='base')?{bonusHunt:true}:{}),id:s.counter,date,mode:command.mode,bet:s.bet,cost,paid:0,balance:s.balance,complete:false,spins:[],configVersion:config.version});s.history=s.history.slice(0,500);state=start(command.mode,config,command.bonusHunt===true);
  }else{if(!s.active)throw Error('Não existem free spins pendentes');state=s.active;}
  const row=s.history[0],result=spin(state,row.bet,rng,config,true);
  s.balance+=result.paid;row.paid+=result.paid;row.balance=s.balance;row.spins.push(result);row.complete=result.next.done;
  s.active=result.next.done?null:result.next;s.rngState=rng.state();s.revision++;s.requestIds=[requestId,...s.requestIds].slice(0,32);
  if(result.retrigger)s.pendingRetrigger={roundId:row.id,spinIndex:row.spins.length-1,awarded:result.retrigger.awarded};
  return s;
}
export function setBet(snapshot:Session,bet:number){validateSession(snapshot);if(snapshot.active)throw Error('Aposta fixa durante os free spins');if(!config.bets.includes(bet))throw Error('Aposta inválida');return {...snapshot,bet,revision:snapshot.revision+1};}
export function renewSeed(snapshot:Session,value:string,date:string):Session{
  validateSession(snapshot);if(snapshot.active||snapshot.pendingRetrigger)throw Error('Termina a ronda antes de renovar a seed');
  if(!value||value===snapshot.seed?.value)throw Error('A nova seed tem de ser diferente');
  return {...snapshot,seed:{value,generation:(snapshot.seed?.generation??0)+1,renewedAt:date},rngState:new SeededRandom(value).state(),revision:snapshot.revision+1};
}
export function topUp(snapshot:Session){validateSession(snapshot);if(snapshot.active)throw Error('Termina a ronda antes de repor créditos');if(!Number.isSafeInteger(snapshot.balance+100000))throw Error('Saldo demasiado elevado');return {...snapshot,balance:snapshot.balance+100000,topups:snapshot.topups+1,revision:snapshot.revision+1};}
export function prizeClass(paid:number,bet:number,cap=false){const x=paid/bet;return cap?'Máximo da ronda':x>=100?'Prémio extraordinário':x>=50?'Prémio muito alto':x>=20?'Prémio alto':paid>0?'Pagamento':'Sem pagamento';}
