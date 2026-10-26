import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {fresh,initial,play,BETS,MATH_VERSION} from './server-engine.mjs';
const fail=(code,message)=>{const error=Error(message);error.code=code;error.publicMessage=message;throw error;};
const clientState=state=>{const result=structuredClone(state);for(const key of ['prng','rng','seed','draws','serial'])delete result[key];return result;};
/** transact(playerId, operationId, fingerprint, callback) must atomically persist
 * account.balanceCents, account.rift and the idempotent callback result. */
export function createRiftService({transact}){
 if(typeof transact!=='function')throw Error('An authenticated, atomic transaction store is required');
 return async function handle(playerId,{id,action,payload={}}){
  if(!playerId)fail('UNAUTHENTICATED','Sessão inválida.');
  if(typeof id!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(id)||!['connect','play'].includes(action))fail('INVALID_REQUEST','Pedido inválido.');
  const fingerprint=createHash('sha256').update(JSON.stringify({action,payload})).digest('hex');
  return transact(playerId,id,fingerprint,account=>{
   if(!Number.isSafeInteger(account.balanceCents)||account.balanceCents<0||account.balanceCents>1000000000000)fail('INVALID_BALANCE','Saldo inválido.');
   if(!account.rift){const state=fresh(randomBytes(4).readUInt32LE());state.balance=account.balanceCents/100;state.grid=initial(state);account.rift={revision:0,state};}
   const session=account.rift;session.sessionId||=randomUUID();if(session.state.round&&session.state.round.mathVersion!==MATH_VERSION)fail('VERSION_MISMATCH','Conclui a ronda com a versão original do jogo.');
   if(action==='play'){
    if(payload.sessionId!==session.sessionId)fail('SESSION_MISMATCH','A conta ou sessão mudou. Volta a ligar o jogo ao site.');
    if(payload.expectedRevision!==session.revision)fail('STALE_REVISION','A sessão mudou. A sincronizar o saldo.');
    if(!BETS.includes(payload.bet)||typeof payload.hunt!=='boolean'||!(payload.buy===null||['core','rift','overdrive'].includes(payload.buy)))fail('INVALID_ACTION','Aposta ou bónus inválido.');
    const state=structuredClone(session.state);
    if(state.pending){if(payload.previousRecordId!==state.pending.id)fail('PENDING_PRESENTATION','Existe uma jogada por apresentar.');state.pending=null;}
    if(state.round&&(payload.buy||payload.bet!==state.round.bet))fail('ROUND_IN_PROGRESS','Conclui primeiro o bónus atual.');
    state.balance=account.balanceCents/100;if(!state.round){state.bet=payload.bet;state.settings.hunt=payload.hunt;}
    let record;try{record=play(state,{buy:payload.buy});}catch(error){if(error.message==='Insufficient credits')fail('INSUFFICIENT_BALANCE','Saldo insuficiente.');throw error;}
    record.id=randomUUID();if(state.round&&!record.played)state.round.id=randomUUID();
    account.balanceCents=Math.round(state.balance*100);session.state=state;session.revision++;
   }
   const state=clientState(session.state);state.balance=account.balanceCents/100;
   return {sessionId:session.sessionId,revision:session.revision,state};
  });
 };
}
