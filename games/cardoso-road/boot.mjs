// Install a worker scoped to this game, then let its cache handle public files.
// Unsupported/private browsers still run normally; registration never blocks play indefinitely.
async function cacheReady(){
 if(!('serviceWorker' in navigator))return;
 let timer;
 try{
  await Promise.race([(async()=>{
   const url=new URL('./sw.js',import.meta.url);
   await navigator.serviceWorker.register(url,{scope:new URL('./',import.meta.url).pathname,updateViaCache:'none'});
   if(navigator.serviceWorker.controller?.scriptURL===url.href)return;
   await new Promise(resolve=>{
    const changed=()=>{if(navigator.serviceWorker.controller?.scriptURL===url.href){navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}};
    navigator.serviceWorker.addEventListener('controllerchange',changed);changed();
    setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();},2000);
   });
  })(),new Promise(resolve=>{timer=setTimeout(resolve,2500);})]);
 }catch{}finally{clearTimeout(timer);}
}
await cacheReady();
await import('./app.mjs');
