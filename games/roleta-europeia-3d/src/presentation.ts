import type {Round} from './engine';
export type VisualPhase='loading'|'ready'|'locking'|'spinning'|'number'|'collecting'|'paying'|'recovering'|'blocked';
export function spinPhase(progress:number){return progress<.12?'Apostas encerradas':progress<.58?'A bola percorre a pista':progress<.8?'A bola entra nos compartimentos':'A bola acomoda-se';}
export function outcome(round:Round){
  const kind=round.net>0?'win':round.net===0?'balanced':round.gross>0?'partial':'loss';
  return {kind,title:kind==='win'?(round.lines.some(l=>l.won&&l.id.startsWith('straight:'))?'Pleno vencedor!':'Vitória!'):kind==='balanced'?'Ronda equilibrada':kind==='partial'?'Retorno parcial':'Apostas perdidas',colorLabel:round.number===0?'Zero · verde':round.color==='red'?'Vermelho':'Preto',won:round.lines.filter(l=>l.won).length};
}
export function pause(ms:number,signal:AbortSignal){return new Promise<void>(resolve=>{let timer:number;const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};signal.addEventListener('abort',done,{once:true});timer=window.setTimeout(done,ms);if(signal.aborted)done();});}
