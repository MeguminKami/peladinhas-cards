// Standalone preview keeps demo credits; the casino supplies its durable wallet.
export function mountCardoso(container,wallet){
 const doc=container.ownerDocument,view=doc.defaultView;
 let stylesheet=doc.querySelector('link[data-cardoso-host]');
 if(!stylesheet){stylesheet=doc.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./host.css',import.meta.url).href;stylesheet.dataset.cardosoHost='';doc.head.append(stylesheet);}
 container.classList.add('cardoso-host');
 const frame=doc.createElement('iframe');frame.title=wallet?'Cardoso Road':'Cardoso Road — demonstração';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;
 let resolve,reject,closed=false;
 const ready=new Promise((yes,no)=>{resolve=yes;reject=no;});
 const timeout=view.setTimeout(()=>reject(Error('Não foi possível preparar o jogo. Tenta abrir novamente.')),25000);
 const receive=event=>{if(event.source!==frame.contentWindow||event.origin!==view.location.origin||event.data?.type!=='cardoso-road:ready')return;view.clearTimeout(timeout);resolve();};
 frame.addEventListener('load',async()=>{if(!wallet||closed)return;try{await frame.contentWindow.connectCardosoWallet({state:()=>wallet.cardosoState(),act:(action,id)=>{if(closed)throw Error('Jogo fechado.');return wallet.cardosoAct(action,id);}});}catch(error){view.clearTimeout(timeout);reject(error);}});
 const url=new URL('./game.html',import.meta.url);if(wallet)url.searchParams.set('integrated','1');
 view.addEventListener('message',receive);frame.src=url.href;container.append(frame);
 return {ready,frame,canLeave:()=>!frame.contentWindow?.cardosoBusy,refreshBalance:async()=>{await frame.contentWindow?.refreshCardosoBalance?.();},destroy(){if(closed)return;closed=true;view.clearTimeout(timeout);view.removeEventListener('message',receive);frame.remove();container.classList.remove('cardoso-host');reject(Error('Jogo fechado.'));}};
}
