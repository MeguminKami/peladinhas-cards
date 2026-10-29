import {config,type Mode,type Config} from './config.ts';
import {generate,validateBoard,type Board} from './board.ts';
import {resolve} from './powers.ts';
import {evaluate} from './evaluate.ts';
import {settle} from './settlement.ts';
import type {Random} from './random.ts';
export interface State {bonusHunt?:boolean;mode:Mode;remaining:number;sticky:number[];accumulated:number;global:number;totalFreeSpins:number;done:boolean}
export function spin(state:State,bet:number,rng:Random,c:Config=config,details=true,manual?:Board){
  if(state.done)throw Error('Ronda terminada');
  if(!c.bets.includes(bet))throw Error('Aposta inválida');
  const initial=manual?[...manual]:generate(state.mode,state.sticky,rng,c,state.bonusHunt===true);validateBoard(initial);
  const globalBefore=state.global??1;
  if(!Number.isSafeInteger(globalBefore)||globalBefore<1)throw Error('Multiplicador global inválido');
  const scatters=initial.flatMap((s,i)=>s==='S'?[i]:[]),powers=resolve(initial,state.mode,rng,c,globalBefore);
  const lines=evaluate(powers.board,powers.amplified,powers.global,c,details);
  const payment=settle(lines.hundredths,bet,c.cap*bet-state.accumulated,c.payoutScaleBps[state.mode]);
  const newSticky:number[]=[];
  if(state.mode==='superior'||state.mode==='legend')for(let p=0;p<24;p++)if(initial[p]==='W'&&!state.sticky.includes(p)&&rng.next()*100<(state.mode==='legend'?c.legendSticky:c.sticky))newSticky.push(p);
  const accumulated=state.accumulated+payment.paid;
  const retrigger=state.mode!=='base'&&scatters.length>=3&&accumulated<c.cap*bet?{awarded:c.retriggerFreeSpins,scatters:scatters.length}:null;
  const totalFreeSpins=(state.totalFreeSpins??(state.mode==='base'?0:c.freeSpins))+(retrigger?.awarded??0);
  let next:State;
  if(accumulated>=c.cap*bet)next={mode:state.mode,remaining:0,sticky:[],accumulated,global:powers.global,totalFreeSpins,done:true};
  else if(state.mode==='base'){
    const mode:Mode=scatters.length===3?'normal':scatters.length===4?'superior':scatters.length>=5?'legend':'base';
    next={mode,remaining:mode==='base'?0:c.freeSpins,sticky:[],accumulated,global:powers.global,totalFreeSpins:mode==='base'?0:c.freeSpins,done:mode==='base'};
  }else{const remaining=state.remaining-1+(retrigger?.awarded??0);next={mode:state.mode,remaining,sticky:remaining?[...state.sticky,...newSticky]:[],accumulated,global:powers.global,totalFreeSpins,done:remaining===0};}
  const metrics={eligible:powers.steals.filter(s=>s.eligible.length>0).length,wilds:powers.steals.length,success:powers.steals.filter(s=>s.success).length,powers:[0,0,0,0],newSticky:newSticky.length,retriggers:retrigger?1:0,extraFreeSpins:retrigger?.awarded??0};
  for(const e of powers.events)metrics.powers[Number(e.power[1])-1]++;
  return {bonusHunt:state.mode==='base'&&state.bonusHunt===true,mode:state.mode,bet,scatters,retrigger, ...payment,next,metrics,
    detail:details?{initial,final:powers.board,wilds:powers.steals.map(s=>s.position),stickyBefore:state.sticky,newSticky,steals:powers.steals,events:powers.events,lines:lines.wins,globalBefore,global:powers.global,hundredths:lines.hundredths,payoutScaleBps:c.payoutScaleBps[state.mode]}:undefined};
}
export type SpinResult=ReturnType<typeof spin>;
export function start(mode:Mode,c:Config=config,bonusHunt=false):State{if(bonusHunt&&mode!=='base')throw Error('Bonus Hunt apenas no jogo base');return {...(bonusHunt?{bonusHunt:true}:{}),mode,remaining:mode==='base'?0:c.freeSpins,sticky:[],accumulated:0,global:1,totalFreeSpins:mode==='base'?0:c.freeSpins,done:false};}
export function round(mode:Mode,bet:number,rng:Random,c:Config=config,details=true,bonusHunt=false){
  let state=start(mode,c,bonusHunt),basePaid=0,bonusPaid=0,bonusMode:Mode|undefined=mode==='base'?undefined:mode,spins=0,bonusSpins=0;
  const records:SpinResult[]=[],metrics={eligible:0,wilds:0,success:0,powers:[0,0,0,0],newSticky:0,retriggers:0,extraFreeSpins:0};let scatterCount=0;
  do{const result=spin(state,bet,rng,c,details);spins++;
    if(state.mode==='base'){basePaid+=result.paid;scatterCount=result.scatters.length;if(result.next.mode!=='base')bonusMode=result.next.mode;}
    else{bonusPaid+=result.paid;bonusSpins++;}
    for(const key of ['eligible','wilds','success','newSticky','retriggers','extraFreeSpins'] as const)metrics[key]+=result.metrics[key];
    result.metrics.powers.forEach((v,i)=>metrics.powers[i]+=v);
    if(details)records.push(result);state=result.next;
  }while(!state.done);
  return {bonusHunt,mode,bet,cost:bet*(mode==='base'?(bonusHunt?c.huntCostMultiplier:1):c.prices[mode]),paid:state.accumulated,basePaid,bonusPaid,bonusMode,bonusSpins,spins,scatterCount,metrics,cap:state.accumulated===c.cap*bet,records};
}
