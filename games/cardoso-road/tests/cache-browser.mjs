import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '../../../node_modules/playwright/index.mjs';
import {cacheManifest} from '../tools/cache-manifest.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),manifest=await cacheManifest(),inventory=JSON.parse(manifest.slice('self.CARDOSO_CACHE='.length,-2)).resources,requests=[];
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://local');requests.push(url.pathname);try{
 if(url.pathname==='/cache-manifest.js'){res.setHeader('Content-Type','text/javascript');res.end(manifest);return;}
 const path=resolve(root,'.'+url.pathname);if(!(path+sep).startsWith(root))throw Error();
 const body=await readFile(url.pathname==='/'?resolve(root,'index.html'):path);
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CARDOSO_BROWSER?{executablePath:process.env.CARDOSO_BROWSER}:{channel:'msedge'})});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:2}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{
  localStorage.setItem('cardoso-road-demo-v1-settings',JSON.stringify({effects:false,music:false,voices:false,reduced:false}));
  Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(window.failNext?4294967295:0);return a;}});
 });
 await page.goto(origin+'/game.html');await page.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.camera&&!document.querySelector('#play').disabled);
 const deadline=Date.now()+60000;let complete=false;
 while(Date.now()<deadline){complete=await page.evaluate(async paths=>{const keys=await caches.keys(),name=keys.find(k=>k.startsWith('cardoso-road:'));if(!name)return false;const cache=await caches.open(name);return (await Promise.all(paths.map(path=>cache.match(new URL(path,location.href))))).every(Boolean);},inventory);if(complete)break;await page.waitForTimeout(200);}
 assert.equal(complete,true,'all public resources must finish warming');
 const backgroundMatches=await page.evaluate(async()=>{
  await new Promise(requestAnimationFrame);const canvas=document.querySelector('canvas'),view=canvas.getBoundingClientRect(),layout=JSON.parse(canvas.dataset.camera).background,image=new Image();image.src=layout.source;await image.decode();
  const expected=document.createElement('canvas');expected.width=canvas.width;expected.height=canvas.height;const ctx=expected.getContext('2d');ctx.scale(canvas.width/view.width,canvas.height/view.height);ctx.drawImage(image,layout.x,layout.y,layout.width,layout.height);
  const fog=ctx.createLinearGradient(0,0,0,view.height);fog.addColorStop(0,'#17154610');fog.addColorStop(.65,'#17133300');fog.addColorStop(1,'#0b123bd9');ctx.fillStyle=fog;ctx.fillRect(0,0,view.width,view.height);
  const x=Math.floor(canvas.width*.05),y=Math.floor(canvas.height*.05),actual=canvas.getContext('2d').getImageData(x,y,1,1).data,target=ctx.getImageData(x,y,1,1).data;return [...target].every((n,i)=>Math.abs(actual[i]-n)<=2);
 });assert.equal(backgroundMatches,true,'cached course must include the loaded background');
 const counts=()=>Object.fromEntries(inventory.map(path=>[path,requests.filter(p=>p==='/'+path).length]));
 const before=counts();await page.reload();await page.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.camera&&!document.querySelector('#play').disabled);const after=counts();
 for(const path of inventory.filter(p=>p!=='sw.js'))assert.equal(after[path],before[path],'reopening must reuse '+path);
 const range=await page.evaluate(async()=>{const r=await fetch('assets/audio/easy_medium_hard.mp3',{headers:{Range:'bytes=100-199'}});return {status:r.status,bytes:[...new Uint8Array(await r.arrayBuffer())],range:r.headers.get('Content-Range')};});
 const music=await readFile(new URL('../assets/audio/easy_medium_hard.mp3',import.meta.url));assert.equal(range.status,206);assert.deepEqual(range.bytes,[...music.subarray(100,200)]);assert.equal(range.range,'bytes 100-199/'+music.length);
 const invalid=await page.evaluate(async()=>(await fetch('assets/audio/extreme.mp3',{headers:{Range:'bytes=999999999-'}})).status);assert.equal(invalid,416);
 await page.evaluate(async()=>{await fetch('private-wallet.json').catch(()=>{});});assert.equal(await page.evaluate(async()=>{const name=(await caches.keys()).find(k=>k.startsWith('cardoso-road:'));return !!await (await caches.open(name)).match(new URL('private-wallet.json',location.href));}),false);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.camera&&!document.querySelector('#play').disabled);
 await page.locator('#play').click();await page.locator('#play').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='fight');assert.equal(await page.locator('#cashout').isEnabled(),true);await page.locator('#cashout').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')).round.status),'paid');
 await page.locator('#play').click();await page.evaluate(()=>window.failNext=true);await page.locator('#play').click();await page.waitForFunction(()=>!!JSON.parse(document.querySelector('canvas').dataset.camera).attacker);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')).round.status),'lost');await page.waitForTimeout(1300);
 await page.evaluate(()=>window.failNext=false);await page.locator('#play').click();for(let i=0;i<10;i++)await page.locator('#play').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).sofiaVisible);
 const result=await page.evaluate(async()=>{const times=[];for(let i=0;i<120;i++)times.push(await new Promise(requestAnimationFrame));const gaps=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b);return {p95:gaps[Math.floor(gaps.length*.95)],over25ms:gaps.filter(x=>x>25).length,overflow:document.documentElement.scrollWidth>innerWidth};});assert.equal(result.overflow,false);assert.deepEqual(errors,[]);console.log(JSON.stringify({width,cached:inventory.length,...result}));
 await context.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
