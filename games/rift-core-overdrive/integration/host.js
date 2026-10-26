const CHANNEL='rift-core:v1';
/** request(action, payload, operationId) must call the authenticated site backend. */
export function mountRift({iframe,gameUrl,request,onBalance=()=>{},onError=console.error}){
 if(!iframe||typeof request!=='function')throw Error('iframe and backend request callback are required');
 const url=new URL(gameUrl,window.location.href);if(!['https:','http:'].includes(url.protocol))throw Error('Invalid game URL');
 url.searchParams.set('wallet','host');url.searchParams.set('parentOrigin',window.location.origin);
 let destroyed=false;
 const handler=async event=>{
  const data=event.data;if(destroyed||event.source!==iframe.contentWindow||event.origin!==url.origin||data?.channel!==CHANNEL||data.type!=='request')return;
  if(typeof data.id!=='string'||data.id.length>100||!['connect','play'].includes(data.action))return;
  let response;
  try{const result=await request(data.action,data.payload,data.id);try{onBalance(result.state.balance);}catch(error){onError(error);}response={ok:true,result};}
  catch(error){onError(error);response={ok:false,error:{code:error.code||'SITE_REJECTED',message:error.publicMessage||'Não foi possível confirmar a operação no site.'}};}
  if(!destroyed)iframe.contentWindow.postMessage({channel:CHANNEL,type:'response',id:data.id,...response},url.origin);
 };
 window.addEventListener('message',handler);iframe.allow='fullscreen; autoplay';iframe.src=url.href;
 return ()=>{destroyed=true;window.removeEventListener('message',handler);};
}
