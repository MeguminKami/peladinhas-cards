/* Public game resources only. Manifest and version are generated from file contents. */
importScripts('./cache-manifest.js');
const BASE=new URL('./',self.location.href),PREFIX='cardoso-road:'+BASE.pathname+':',CACHE=PREFIX+self.CARDOSO_CACHE.version;
const allowed=new Set(self.CARDOSO_CACHE.resources.map(path=>new URL(path,BASE).href));
const pending=new Map();
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE)));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
async function resource(url){
 const cache=await caches.open(CACHE),cached=await cache.match(url);
 if(cached)return cached;
 let request=pending.get(url);
 if(!request){
  request=(async()=>{const response=await fetch(url);if(response.status===200){try{await cache.put(url,response.clone());}catch{/* Full/quota-disabled cache must not prevent playing. */}}return response;})();
  pending.set(url,request);
 }
 try{return (await request).clone();}finally{if(pending.get(url)===request)pending.delete(url);}
}
async function ranged(response,range){
 if(response.status!==200)return response;
 const body=await response.arrayBuffer(),size=body.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):size-1;
 if(match&&!match[1]&&match[2]){start=Math.max(0,size-end);end=size-1;}
 end=Math.min(end,size-1);
 if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
 const headers=new Headers(response.headers);headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(body.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin)return;
 if(url.pathname===BASE.pathname)url.pathname+='index.html';
 // Only the public game document accepts the integrated=1 query. Never cache wallet/API data.
 if(url.search&&!(request.mode==='navigate'&&url.pathname===new URL('game.html',BASE).pathname&&url.search==='?integrated=1'))return;
 url.search='';if(!allowed.has(url.href))return;
 event.respondWith(resource(url.href).then(response=>request.headers.has('Range')?ranged(response,request.headers.get('Range')):response));
});
// Warm missing resources once after the scene is ready, with only two downloads at a time.
self.addEventListener('message',event=>{
 if(event.data?.type!=='cardoso-road:warm')return;
 event.waitUntil((async()=>{
  const queue=[...allowed];
  await Promise.all([0,1].map(async()=>{while(queue.length){const url=queue.shift();try{await resource(url);}catch{}}}));
 })());
});
