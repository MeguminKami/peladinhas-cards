import {walletBalance,WalletDeclinedError,type Wallet,type WalletOperation} from './session';

export interface HttpWalletOptions {
  game:'blackjack'|'roulette';balanceUrl:string;settleUrl:string;
  headers?:HeadersInit|(()=>HeadersInit|Promise<HeadersInit>);
  credentials?:RequestCredentials;timeoutMs?:number;fetch?:typeof globalThis.fetch;
}
/** Website authentication and storage stay on the host; no local balance fallback. */
export function createHttpWallet(options:HttpWalletOptions):Wallet {
  if(!options.balanceUrl||!options.settleUrl||!['blackjack','roulette'].includes(options.game))throw new Error('Configure o jogo e os endpoints da carteira');
  const fetcher=options.fetch||globalThis.fetch;
  const request=async(operation?:WalletOperation)=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeoutMs??12000);
    try{
      const headers=new Headers(typeof options.headers==='function'?await options.headers():options.headers);headers.set('Accept','application/json');
      if(operation){headers.set('Content-Type','application/json');headers.set('Idempotency-Key',operation.id);}
      const response=await fetcher(operation?options.settleUrl:options.balanceUrl,{method:operation?'POST':'GET',headers,credentials:options.credentials??'same-origin',cache:'no-store',signal:controller.signal,...(operation?{body:JSON.stringify({game:options.game,operation})}:{})});
      let data:any;try{data=await response.json();}catch{throw new Error('Resposta inválida do website. Recupere a mesma operação.');}
      if(!response.ok){
        const message=typeof data?.error==='string'?data.error:'O website não confirmou a operação';
        if(operation&&response.status>=400&&response.status<500&&data?.applied===false)throw new WalletDeclinedError(message,data.balance===undefined?undefined:walletBalance(data.balance));
        throw new Error(message);
      }
      return {balance:walletBalance(data?.balance)};
    }catch(e){if(controller.signal.aborted)throw new Error('Timeout do website: recuperar a mesma operação');throw e;}finally{clearTimeout(timer);}
  };
  return {getBalance:async()=>(await request()).balance,settle:operation=>request(operation)};
}
