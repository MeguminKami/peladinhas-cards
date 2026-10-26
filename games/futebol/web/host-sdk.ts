import type {Session} from '../src/session.ts';
export interface WalletTransaction {id:string;debit:number;credit:number;roundId:number;spin:number;configVersion:string;bet:number;mode:'base'|'normal'|'superior';bonusHunt:boolean;progress?:Session;bonusComplete?:boolean}
export interface MountSlotOptions {src:string;playerId:string;getBalance:()=>Promise<number>;settle:(transaction:WalletTransaction)=>Promise<{balance:number}>}

/** Mount an isolated game. The host owns the fictional-credit wallet. */
export function mountSlot(container:HTMLElement,options:MountSlotOptions){
 const channel='football-slot:v1',url=new URL(options.src,location.href),frame=document.createElement('iframe');
 if(!options.playerId)throw Error('playerId obrigatório');
 url.searchParams.set('player',options.playerId);url.searchParams.set('origin',location.origin);url.searchParams.set('wallet','external');
 frame.title='Futebol de Bairro — Noite de Glória';frame.allow='fullscreen; autoplay';frame.allowFullscreen=true;frame.src=url.href;
 Object.assign(container.style,{position:'relative',width:'100%',aspectRatio:'16 / 10',minHeight:'360px',background:'#06182a',borderRadius:'12px',overflow:'hidden'});
 Object.assign(frame.style,{width:'100%',height:'100%',border:'0',display:'block'});
 let expanded=false,previousOverflow='',previousStyle='',queue=Promise.resolve();
 async function bounded<T>(operation:Promise<T>):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('A carteira não respondeu a tempo')),12000);})]);}finally{clearTimeout(timer);}}
 function expand(value:boolean){
  if(value===expanded)return;expanded=value;
  if(value){previousOverflow=document.body.style.overflow;previousStyle=container.style.cssText;Object.assign(container.style,{position:'fixed',inset:'0',width:'100vw',height:'100dvh',minHeight:'0',aspectRatio:'auto',zIndex:'2147483000',borderRadius:'0'});document.body.style.overflow='hidden';}
  else{container.style.cssText=previousStyle;document.body.style.overflow=previousOverflow;}
  frame.contentWindow?.postMessage({channel,kind:'expanded',expanded},url.origin);
 }
 async function handle(event:MessageEvent){
  const data=event.data;
  if(event.source!==frame.contentWindow||event.origin!==url.origin||data?.channel!==channel||data.kind!=='request'||data.player!==options.playerId||typeof data.id!=='string')return;
  let response:object;
  try{
   let value:unknown;
   if(data.method==='balance')value={balance:await bounded(options.getBalance())};
   else if(data.method==='settle'){
    const tx=data.payload as WalletTransaction;
    if(!tx||typeof tx.id!=='string'||!tx.id||!Number.isSafeInteger(tx.debit)||tx.debit<0||!Number.isSafeInteger(tx.credit)||tx.credit<0)throw Error('Transação inválida');
    value=await bounded(options.settle(tx));
   }else if(data.method==='expand'){expand(!expanded);value={};}
   else throw Error('Método desconhecido');
   response={ok:true,value};
  }catch(error){response={ok:false,error:error instanceof Error?error.message:String(error),definitive:(error as {definitive?:boolean}).definitive===true};}
  frame.contentWindow?.postMessage({channel,kind:'response',id:data.id,...response},url.origin);
 }
 const receive=(event:MessageEvent)=>{queue=queue.then(()=>handle(event)).catch(()=>{});};
 const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&expanded)expand(false);};
 window.addEventListener('message',receive);document.addEventListener('keydown',escape);container.append(frame);
 return {iframe:frame,expand:()=>expand(true),collapse:()=>expand(false),refreshBalance:async()=>{const balance=await options.getBalance();frame.contentWindow?.postMessage({channel,kind:'balance',balance,player:options.playerId},url.origin);},destroy:()=>{expand(false);window.removeEventListener('message',receive);document.removeEventListener('keydown',escape);frame.remove();}};
}
