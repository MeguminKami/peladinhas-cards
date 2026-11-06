import { playRound, MATH_VERSION } from '../assets/games/ganza/src/engine.js';
export const GANZA_ACTIONS=['connect','start','settle'];
export async function commitment(seed) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed))),v=>v.toString(16).padStart(2,'0')).join(''); }
function fail(message){const e=Error(message);e.publicMessage=message;throw e;}
function publicRound(r){const {seed,...safe}=r;return safe;}
export async function applyLocalGanza(previous,balance,{action,payload={}}){
 if(!GANZA_ACTIONS.includes(action))fail('Pedido inválido.');
 if(!Number.isSafeInteger(balance)||balance<0)fail('Saldo inválido.');
 const session=previous?structuredClone(previous):{sessionId:crypto.randomUUID(),rounds:{},revision:0};
 let debit=0,credit=0,completed=null,round=null;
 if(action!=='connect'&&payload.sessionId!==session.sessionId)fail('A sessão mudou. Volta a abrir o jogo.');
 if(action==='start'){
  if(!Number.isSafeInteger(payload.bet)||payload.bet<100||payload.bet%100!==0)fail('Escolhe uma aposta inteira em DJC.');
  if(payload.version && payload.version!==MATH_VERSION)fail('Versão de jogada inválida.');
  const seed=Array.from(crypto.getRandomValues(new Uint32Array(8)),n=>n.toString(16).padStart(8,'0')).join('');
  const r=playRound(seed,payload);debit=r.bet;
  if(balance<debit)fail('Saldo insuficiente.');
  round={...r,id:crypto.randomUUID(),hash:await commitment(seed)};
  session.rounds[round.id]=round;session.revision++;
 }
 if(action==='settle'){
  round=session.rounds[payload.roundId];if(!round)fail('Esta placa já foi liquidada. Recupera a sessão.');
  credit=round.payment;completed=round;delete session.rounds[round.id];session.revision++;
 }
 const next=balance-debit+credit;
 if(!Number.isSafeInteger(next)||next<0||next>1e12)fail('Limite da carteira atingido.');
 return {session,balance:next,debit,credit,completed,result:{sessionId:session.sessionId,revision:session.revision,balance:next,version:MATH_VERSION,round:round?(action==='settle'?round:publicRound(round)):null,pending:Object.values(session.rounds).map(publicRound)}};
}
