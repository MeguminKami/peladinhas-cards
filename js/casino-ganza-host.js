const CHANNEL='ganza:v1';
export function mountCasinoGanza(container,wallet){
 const page=container.closest('.casino-page');page?.classList.add('is-ganza');
 const frame=document.createElement('iframe');frame.title='GANZÁ';frame.allow='fullscreen; autoplay';
 const url=new URL('../assets/games/ganza/game.html',import.meta.url);url.searchParams.set('wallet','host');url.searchParams.set('parentOrigin',location.origin);
 let resolve,reject,destroyed=false;const ready=new Promise((a,b)=>{resolve=a;reject=b;});
 const timer=setTimeout(()=>reject(Error('Não foi possível abrir GANZÁ.')),25000);
 const handler=async e=>{
  const d=e.data;if(destroyed||e.source!==frame.contentWindow||e.origin!==url.origin||d?.channel!==CHANNEL||d.type!=='request'||typeof d.id!=='string'||!['connect','start','settle'].includes(d.action))return;
  let response;try{response={ok:true,result:await wallet.ganzaRequest(d.action,d.payload,d.id)};if(d.action==='connect'){clearTimeout(timer);resolve();}}
  catch(error){response={ok:false,error:{message:error.publicMessage||error.message}};if(d.action==='connect'){clearTimeout(timer);reject(error);}}
  if(!destroyed)frame.contentWindow?.postMessage({channel:CHANNEL,type:'response',id:d.id,...response},url.origin);
 };
 const fit=()=>{if(!destroyed)frame.style.height=`${Math.min(780,Math.max(160,Math.floor((window.visualViewport?.height||innerHeight)-frame.getBoundingClientRect().top-12)))}px`;};
 const resized=()=>requestAnimationFrame(fit),observer=new ResizeObserver(resized);
 const checkpointTimer=setInterval(()=>{if(!destroyed)void wallet.checkpoint('ganza-idle').catch(()=>{});},30000);
 window.addEventListener('message',handler);window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);
 frame.addEventListener('load',resized);frame.src=url.href;container.append(frame);observer.observe(container);resized();
 return {ready,canLeave:()=>!wallet.ganzaActive(),refreshBalance:async()=>{},destroy(){destroyed=true;clearInterval(checkpointTimer);page?.classList.remove('is-ganza');clearTimeout(timer);observer.disconnect();window.removeEventListener('resize',resized);window.visualViewport?.removeEventListener('resize',resized);window.removeEventListener('message',handler);frame.remove();reject(Error('Jogo fechado.'));}};
}
