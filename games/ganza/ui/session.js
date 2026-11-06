import {playRound} from '../src/engine.js';
const host=new URLSearchParams(location.search).get('wallet')==='host';
const origin=new URLSearchParams(location.search).get('parentOrigin');
const pending=new Map();
if(host){if(parent===window||origin!==location.origin)throw Error('Origem da carteira inválida.');window.addEventListener('message',e=>{const d=e.data;if(e.source!==parent||e.origin!==origin||d?.channel!=='ganza:v1'||d.type!=='response')return;const p=pending.get(d.id);if(!p)return;clearTimeout(p.timer);pending.delete(d.id);d.ok?p.resolve(d.result):p.reject(Error(d.error?.message||'Falha na carteira.'));});}
export const isHost=host;
export async function request(action,payload={},id=crypto.randomUUID()){
 if(host)return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('Sem resposta da carteira. Usa Recuperar.'));},10000);pending.set(id,{resolve,reject,timer});parent.postMessage({channel:'ganza:v1',type:'request',id,action,payload},origin);});
 return navigator.locks.request('ganza-preview',async()=>{
  const s=JSON.parse(localStorage.getItem('ganza-preview-v1')||'null')||{sessionId:crypto.randomUUID(),balance:1000000,rounds:{},receipts:{}};
  const fingerprint=JSON.stringify({action,payload});const receipt=s.receipts[id];if(receipt){if(receipt.fingerprint!==fingerprint)throw Error('Pedido repetido com valores diferentes.');return receipt.result;}
  if(action!=='connect'&&payload.sessionId!==s.sessionId)throw Error('Sessão inválida.');
  let round=null;
  if(action==='start'){
   if(!Number.isSafeInteger(payload.bet)||payload.bet<100||payload.bet%100!==0)throw Error('Escolhe uma aposta inteira em DJC.');
   const seed=crypto.randomUUID()+crypto.randomUUID(),r=playRound(seed,payload);
   if(s.balance<r.bet)throw Error('Saldo insuficiente.');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed))),n=>n.toString(16).padStart(2,'0')).join('');
   round={...r,id:crypto.randomUUID(),hash};s.rounds[round.id]=round;s.balance-=r.bet;
  }
  if(action==='settle'){round=s.rounds[payload.roundId];if(!round)throw Error('Placa já liquidada.');s.balance+=round.payment;delete s.rounds[round.id];}
  const safe=r=>{const {seed,...p}=r;return p;};
  const result={sessionId:s.sessionId,balance:s.balance,round:round?(action==='settle'?round:safe(round)):null,pending:Object.values(s.rounds).map(safe)};
  s.receipts=Object.fromEntries([...Object.entries(s.receipts),[id,{fingerprint,result}]].slice(-512));localStorage.setItem('ganza-preview-v1',JSON.stringify(s));return result;
 });
}
