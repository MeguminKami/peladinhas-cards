import { createRound, resolveRound, publicRound, multiplierAt } from '../src/engine.js';
const hash = async seed => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed))), b=>b.toString(16).padStart(2,'0')).join('');
export { hash };
export class HostSession {
  constructor() {
    const params=new URLSearchParams(location.search);this.origin=params.get('parentOrigin');this.pending=new Map();
    if(this.origin!==location.origin||parent===window)throw Error('Abre este jogo no casino.');
    this.handler=event=>{const d=event.data;if(event.source!==parent||event.origin!==this.origin||d?.channel!=='risco:v1'||d.type!=='response')return;const p=this.pending.get(d.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(d.id);d.ok?p.resolve(d.result):p.reject(Object.assign(Error(d.error?.message||'Operação recusada.'),{rejected:d.error?.code!=='SITE_TIMEOUT'}));};
    addEventListener('message',this.handler);
  }
  request(action,payload={},id=crypto.randomUUID()) {
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Sem confirmação. Volta a tentar para recuperar.'));},10000);this.pending.set(id,{resolve,reject,timer});parent.postMessage({channel:'risco:v1',type:'request',id,action,payload},this.origin);});
  }
}
// Isolated previews use temporary play credits. Demo overrides never enter HostSession.
export class DemoSession {
  constructor(){this.balance=1000000;this.sessionId=crypto.randomUUID();this.revision=0;this.item=null;this.history=[];this.receipts=new Map();this.params=new URLSearchParams(location.search);}
  async request(action,payload={},id=crypto.randomUUID()) {
    if(this.receipts.has(id))return structuredClone(this.receipts.get(id));
    const now=Date.now();let r=this.item;
    if(r&&now>=r.startedAt){
      const old=r.engine.status;r.engine=resolveRound(r.engine,{elapsedMs:now-r.startedAt,cashout:action==='cashout'});
      if(old==='running'&&r.engine.status!=='running'){this.balance+=r.engine.payoutUnits*100;this.revision++;}
      if(publicRound(r.engine,now-r.startedAt).phase!=='running'&&!r.recorded){this.history=[r.engine.crashCents,...this.history].slice(0,20);r.recorded=true;}
    }
    if(action==='start'){
      if(r&&!r.recorded)throw Error('Espera pelo fim da ronda.');
      if(!Number.isSafeInteger(payload.betUnits)||payload.betUnits<1||payload.betUnits>10000||payload.betUnits*100>this.balance)throw Error('Aposta ou saldo inválido.');
      const seed=crypto.randomUUID()+crypto.randomUUID(),engine=createRound({seed,betUnits:payload.betUnits,autoCashoutCents:payload.autoCashoutCents??null});
      const demo=this.params.get('demo');
      if(demo==='instant')engine.crashCents=100;
      if(demo==='max')engine.crashCents=999900;
      if(demo==='crash')engine.crashCents=Math.max(100,Math.min(999900,Math.round((Number(this.params.get('m'))||3.47)*100)));
      this.balance-=payload.betUnits*100;this.revision++;
      this.item=r={id:crypto.randomUUID(),engine,commitment:await hash(seed),startedAt:now+5000,recorded:false};
    }
    const waiting=r&&now<r.startedAt;
    const view=r?(waiting?{status:'running',phase:'waiting',betUnits:r.engine.betUnits,multiplierCents:100,payoutUnits:0,cashoutCents:null,version:r.engine.version}:publicRound(r.engine,now-r.startedAt)):null;
    const result={balance:this.balance,sessionId:this.sessionId,revision:this.revision,serverNow:now,history:this.history,round:r?{...view,id:r.id,startedAt:r.startedAt,commitment:r.commitment,demo:Boolean(this.params.get('demo'))}:null};
    if(['start','cashout'].includes(action))this.receipts.set(id,structuredClone(result));
    return result;
  }
}
export { multiplierAt };
