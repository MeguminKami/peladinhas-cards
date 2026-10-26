const CHANNEL='rift-core:v1';
export function createSiteWallet(win=window){
 const query=new URLSearchParams(win.location.search);
 const hosted=query.get('wallet')==='host'||(win.parent!==win&&query.get('demo')!=='1');
 if(!hosted)return {hosted:false};
 const raw=query.get('parentOrigin');let origin;
 try{const url=new URL(raw);if(!['https:','http:'].includes(url.protocol)||url.origin!==raw)throw Error();origin=url.origin;}catch{throw Error('Configuração em falta: parentOrigin deve indicar a origem exata do site.');}
 if(win.parent===win)throw Error('A carteira do site requer abertura no iframe do site principal.');
 const pending=new Map(),storageKey='rift-site-pending:'+origin;
 let revision=null,sessionId=null,lastRecordId=null,operation;
 try{operation=JSON.parse(win.sessionStorage.getItem(storageKey)||'null');}catch{}
 win.addEventListener('message',event=>{
  const data=event.data;if(event.source!==win.parent||event.origin!==origin||data?.channel!==CHANNEL||data.type!=='response')return;
  const p=pending.get(data.id);if(!p)return;pending.delete(data.id);win.clearTimeout(p.timer);
  if(data.ok)p.resolve(data.result);else{const error=Error(data.error?.message||'Operação recusada pelo site.');error.code=data.error?.code||'SITE_REJECTED';p.reject(error);}
 });
 function request(action,payload={},id=win.crypto.randomUUID()){
  return new Promise((resolve,reject)=>{const timer=win.setTimeout(()=>{pending.delete(id);const error=Error('O site ainda não confirmou a operação. Tenta novamente para consultar a mesma operação.');error.code='SITE_TIMEOUT';reject(error);},20000);pending.set(id,{resolve,reject,timer});win.parent.postMessage({channel:CHANNEL,type:'request',id,action,payload},origin);});
 }
 function accept(result){if(typeof result?.sessionId!=='string'||!result.sessionId||!Number.isSafeInteger(result?.revision)||result.revision<0||!result.state||!Number.isFinite(result.state.balance)||result.state.balance<0)throw Error('Resposta de carteira inválida.');sessionId=result.sessionId;revision=result.revision;lastRecordId=result.state.pending?.id||null;return result.state;}
 function clearOperation(){operation=null;try{win.sessionStorage.removeItem(storageKey);}catch{}}
 async function sendOperation(){try{const result=await request('play',operation.payload,operation.id);const state=accept(result);clearOperation();return state;}catch(error){if(error.code&&error.code!=='SITE_TIMEOUT')clearOperation();throw error;}}
 return {hosted:true,
  async connect(){if(operation){try{await sendOperation();}catch(error){if(error.code==='SITE_TIMEOUT')throw error;}}return accept(await request('connect'));},
  async play({bet,hunt,buy}){if(!operation){operation={id:win.crypto.randomUUID(),payload:{sessionId,expectedRevision:revision,previousRecordId:lastRecordId,bet,hunt:!!hunt,buy:buy||null}};try{win.sessionStorage.setItem(storageKey,JSON.stringify(operation));}catch{}}
   try{return await sendOperation();}catch(error){if(['STALE_REVISION','PENDING_PRESENTATION','SESSION_MISMATCH'].includes(error.code)){const state=accept(await request('connect'));if(state.pending)return state;}throw error;}
  }
 };
}
