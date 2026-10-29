import {createSession,execute,restoreSession,type Session,type Command} from '../src/session.ts';

const params=new URLSearchParams(location.search);
export const externalWallet=location.pathname.endsWith('/embed.html')||params.get('wallet')==='external';
const player=params.get('player')??'';
export const sessionKey=externalWallet?'slot-local-v1:player:'+encodeURIComponent(player):'slot-local-v1';
const pendingKey=sessionKey+':wallet-pending',channel='football-slot:v1';
let sequence=0;
const instance=crypto.randomUUID();
export function parentOrigin(){const value=params.get('origin');if(!value)throw Error('Falta a origem do website principal');const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.origin!==value)throw Error('Origem do website inválida');return value;}
function rpc(method:string,payload:unknown={}):Promise<{balance:number}>{
 if(window.parent===window)return Promise.reject(Error('Esta versão deve ser aberta pelo website principal'));
 if(!player)return Promise.reject(Error('Falta o identificador do utilizador'));
 const origin=parentOrigin(),id=instance+':'+sequence++;
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
  const receive=(event:MessageEvent)=>{
   if(event.source!==parent||event.origin!==origin||event.data?.channel!==channel||event.data?.kind!=='response'||event.data.id!==id)return;
   cleanup();if(!event.data.ok){const error=new Error(event.data.error??'Pedido ao saldo rejeitado');Object.assign(error,{definitive:event.data.definitive===true});reject(error);return;}
   const value=event.data.value;if(method!=='expand'&&(!Number.isSafeInteger(value?.balance)||value.balance<0)){reject(Error('Saldo externo inválido'));return;}resolve(value);
  };
  const timer=setTimeout(()=>{cleanup();reject(Error('Sem resposta do website. Recarrega para recuperar o mesmo pedido, sem voltar a sortear.'));},15000);
  window.addEventListener('message',receive);parent.postMessage({channel,kind:'request',id,method,player,payload},origin);
 });
}
interface Pending {before:number;next:Session;transaction:{id:string;debit:number;credit:number;roundId:number;spin:number;configVersion:string;bet:number;mode:'base'|'normal'|'superior'|'legend';bonusHunt:boolean;progress?:Session;bonusComplete?:boolean}}
function pending():Pending|null{const raw=localStorage.getItem(pendingKey);if(!raw)return null;const p=JSON.parse(raw) as Pending;const prior=p.next.revision;p.next=restoreSession(p.next);p.before+=p.next.revision-prior;if(!Number.isSafeInteger(p.before)||typeof p.transaction?.id!=='string'||!p.transaction.id)throw Error('Pedido de saldo pendente inválido');return p;}
export function hasPendingWallet(){return externalWallet&&localStorage.getItem(pendingKey)!==null;}
function applyBalance(next:Session,balance:number,settled=true){next.balance=balance;if(settled&&next.history[0])next.history[0].balance=balance;return next;}
export async function prepareWallet(snapshot:Session){
 if(!externalWallet)return snapshot;
 const p=pending();
 if(p){
  if(snapshot.revision===p.next.revision){localStorage.removeItem(pendingKey);return applyBalance(snapshot,(await rpc('balance')).balance,false);}
  if(snapshot.revision!==p.before)throw Error('Conflito no pedido pendente. Exporta a sessão antes de continuar.');
  try{const result=await rpc('settle',p.transaction);return applyBalance(p.next,result.balance);}
  catch(error){if((error as {definitive?:boolean}).definitive){localStorage.removeItem(pendingKey);return applyBalance(snapshot,(await rpc('balance')).balance,false);}throw error;}
 }
 return applyBalance(snapshot,(await rpc('balance')).balance,false);
}
export async function executeWallet(snapshot:Session,command:Command){
 if(!externalWallet)return execute(snapshot,command,crypto.randomUUID(),new Date().toISOString());
 if(pending())throw Error('Existe um pedido pendente. Recarrega para recuperar a jogada.');
 const balance=(await rpc('balance')).balance,request=crypto.randomUUID();
 const next=execute({...snapshot,balance},command,request,new Date().toISOString()),row=next.history[0],result=row.spins.at(-1)!;
 const transaction={id:request,debit:command.type==='start'?row.cost:0,credit:result.paid,roundId:row.id,spin:row.spins.length,configVersion:next.configVersion,bet:row.bet,mode:row.mode,bonusHunt:row.bonusHunt===true,progress:next,bonusComplete:row.complete&&(row.mode!=='base'||row.spins.length>1)};
 localStorage.setItem(pendingKey,JSON.stringify({before:snapshot.revision,next,transaction} satisfies Pending));
 try{return applyBalance(next,(await rpc('settle',transaction)).balance);}
 catch(error){if((error as {definitive?:boolean}).definitive)localStorage.removeItem(pendingKey);throw error;}
}
export function walletCommitted(snapshot:Session){if(!externalWallet)return;const p=pending();if(p&&snapshot.revision===p.next.revision&&snapshot.requestIds.includes(p.transaction.id))localStorage.removeItem(pendingKey);}
export function newBrowserSession(){const session=createSession(crypto.randomUUID());if(externalWallet)session.balance=0;return session;}
export async function expandEmbedded(){await rpc('expand');}
