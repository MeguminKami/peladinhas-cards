import { type Book } from './core';
export interface WalletOperation { id: string; debit: number; credit: number; entries: {id:string;amount:number;label:string}[] }
export interface Wallet { getBalance(): Promise<number>; settle(operation: WalletOperation): Promise<{balance:number}> }
export const BALANCE_SCALE=100;
export interface MountOptions { playerId?: string; wallet?: Wallet; mode?:'standalone'|'integrated' }
/** Only use when the host guarantees that the operation was not applied. */
export class WalletDeclinedError extends Error {readonly applied=false;readonly code='ATELIER_WALLET_DECLINED';constructor(message:string,readonly balance?:number){super(message);this.name='WalletDeclinedError';}}
/** SDKs are independently bundled, so their error constructors have distinct identities. */
export function isWalletDeclinedError(value:unknown):value is WalletDeclinedError {return value instanceof Error&&value.name==='WalletDeclinedError'&&(value as WalletDeclinedError).code==='ATELIER_WALLET_DECLINED'&&(value as WalletDeclinedError).applied===false;}
export function walletBalance(value:unknown):number {if(!Number.isSafeInteger(value)||(value as number)<0)throw new Error('Saldo inválido recebido do website');return value as number;}
export function validateMountOptions(options:MountOptions){
  if(options.mode==='integrated'&&!options.wallet)throw new Error('O modo integrado exige a carteira do website');
  if(options.wallet){if(options.mode==='standalone')throw new Error('Uma carteira externa exige o modo integrado');if(!options.playerId?.trim())throw new Error('O website deve fornecer o identificador estável do jogador');if(typeof options.wallet.getBalance!=='function'||typeof options.wallet.settle!=='function')throw new Error('Carteira do website inválida');}
}
interface Envelope<T> { state: T; sessionId?:string; pending?: {candidate:T;operation:WalletOperation} }
/** Persist an immutable operation before invoking the host. Ambiguous failures stay blocked. */
export class SessionStore<T extends Book> {
  envelope: Envelope<T>; busy=false;
  private stamp:string|null;
  constructor(readonly key:string,initial:()=>T,readonly wallet?:Wallet){this.stamp=localStorage.getItem(key);this.envelope=this.stamp?JSON.parse(this.stamp):{state:initial()};this.envelope.sessionId||=crypto.randomUUID();if(wallet&&!this.stamp)this.envelope.state.balance=0;}
  get state(){return this.envelope.state;}
  get pending(){return !!this.envelope.pending;}
  async initialize(){if(this.pending)await this.retry();else{if(this.wallet)this.envelope.state.balance=walletBalance(await this.wallet.getBalance());this.persist();}}
  persist(){if(localStorage.getItem(this.key)!==this.stamp)throw new Error('Sessão alterada noutra aba. Recarregue para recuperar o estado confirmado.');const next=JSON.stringify(this.envelope);localStorage.setItem(this.key,next);this.stamp=next;}
  async commit(candidate:T){
    if(this.busy||this.pending)throw new Error('Operação pendente: recuperar antes de continuar');
    const ids=new Set(this.state.ledger.map(x=>x.id));const entries=candidate.ledger.filter(x=>!ids.has(x.id)).map(({id,amount,label})=>({id,amount,label}));
    if(!this.wallet||!entries.length){const old=this.envelope;this.envelope={state:candidate,sessionId:old.sessionId};try{this.persist();}catch(e){this.envelope=old;throw e;}return;}
    const operation:WalletOperation={id:`${this.key}:${this.envelope.sessionId}:${crypto.randomUUID()}:${entries.map(x=>x.id).join('|')}`,debit:-entries.filter(x=>x.amount<0).reduce((a,b)=>a+b.amount,0),credit:entries.filter(x=>x.amount>0).reduce((a,b)=>a+b.amount,0),entries};
    this.envelope.pending={candidate,operation};this.persist();await this.retry();
  }
  async retry(){
    if(!this.envelope.pending||!this.wallet)return;if(this.busy)throw new Error('Recuperação já em curso');this.busy=true;
    const pending=this.envelope.pending;
    try{
      this.persist();const receipt=await this.wallet.settle(structuredClone(pending.operation));pending.candidate.balance=walletBalance(receipt.balance);
      const previous=this.envelope;this.envelope={state:pending.candidate,sessionId:previous.sessionId};try{this.persist();}catch(e){this.envelope=previous;throw e;}
    }catch(e){
      if(isWalletDeclinedError(e)){const previous=this.envelope;const state=structuredClone(previous.state);if(e.balance!==undefined)state.balance=walletBalance(e.balance);this.envelope={state,sessionId:previous.sessionId};try{this.persist();}catch(persistError){this.envelope=previous;throw persistError;}}
      throw e;
    }finally{this.busy=false;}
  }
}
