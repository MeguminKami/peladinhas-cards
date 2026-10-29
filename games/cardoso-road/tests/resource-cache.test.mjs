import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function setup({version='one',stores=new Map(),resources=['game.html','assets/audio/test.mp3'],network=async()=>new Response('0123456789')}={}){
 const events={},requests=[],base='https://example.test/games/cardoso-road/';
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {match:async url=>entries.get(String(url))?.clone(),put:async(url,response)=>entries.set(String(url),response.clone())};}};
 const self={location:{href:base+'sw.js'},clients:{claim:async()=>{}},addEventListener:(type,fn)=>events[type]=fn};
 const context={URL,Headers,Response,caches,self,importScripts:()=>self.CARDOSO_CACHE={version,resources},fetch:async url=>{requests.push(url);return network(url);}};
 vm.runInNewContext(worker,context);
 const request=async(path,{method='GET',mode='cors',range}={})=>{let response;events.fetch({request:{url:new URL(path,base).href,method,mode,headers:new Headers(range?{Range:range}:{})},respondWith:p=>response=p});return response?await response:null;};
 const lifecycle=async type=>{let pending;events[type]({waitUntil:p=>pending=p});await pending;};
 const message=type=>{let pending;events.message({data:{type},waitUntil:p=>pending=p});return pending;};
 return {request,lifecycle,requests,stores,message};
}
test('concurrent requests share a download and cached audio supports byte ranges',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),s=setup({network:async()=>{await gate;return new Response('0123456789');}});
 const a=s.request('assets/audio/test.mp3'),b=s.request('assets/audio/test.mp3');release();assert.equal(await (await a).text(),'0123456789');assert.equal(await (await b).text(),'0123456789');assert.equal(s.requests.length,1);
 const range=await s.request('assets/audio/test.mp3',{range:'bytes=2-5'});assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 2-5/10');assert.equal(await range.text(),'2345');
 assert.equal(await (await s.request('assets/audio/test.mp3',{range:'bytes=-3'})).text(),'789');assert.equal((await s.request('assets/audio/test.mp3',{range:'bytes=99-'})).status,416);assert.equal(s.requests.length,1);
});
test('only listed public files are cached; integrated document shares its public shell',async()=>{
 const s=setup();assert.equal(await s.request('wallet.json'),null);assert.equal(await s.request('game.html?token=private',{mode:'navigate'}),null);assert.equal(await s.request('game.html',{method:'POST'}),null);
 await s.request('game.html?integrated=1',{mode:'navigate'});await s.request('game.html',{mode:'navigate'});assert.equal(s.requests.length,1);
});
test('a new activated release removes only this games older caches',async()=>{
 const first=setup();await first.request('game.html');first.stores.set('peladinhas:other',new Map());
 const next=setup({version:'two',stores:first.stores});await next.lifecycle('install');await next.lifecycle('activate');assert.deepEqual([...next.stores.keys()].sort(),['cardoso-road:/games/cardoso-road/:two','peladinhas:other']);await next.request('game.html');assert.equal(next.requests.length,1);
});
test('failed downloads are not cached and a later request can recover',async()=>{
 let online=false;const s=setup({network:async()=>new Response(online?'ok':'missing',{status:online?200:404})});assert.equal((await s.request('game.html')).status,404);online=true;assert.equal(await (await s.request('game.html')).text(),'ok');await s.request('game.html');assert.equal(s.requests.length,2);
});

test('optional warming pauses before starting more downloads and resumes from cache',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),s=setup({resources:['a','b','c','d','e','f'],network:async()=>{await gate;return new Response('ok');}});
 const first=s.message('cardoso-road:warm');await new Promise(resolve=>setImmediate(resolve));assert.equal(s.requests.length,2);
 s.message('cardoso-road:pause-warm');release();await first;assert.equal(s.requests.length,2);
 await s.message('cardoso-road:warm');assert.equal(s.requests.length,6);
});
