import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {chromium} from './browser-sandbox.mjs';
import {createSession,execute} from '../games/futebol/src/session.ts';
import {CASINO_EDITION} from '../js/casino-economy.js';

const root=resolve('.');
const server=createServer((req,res)=>{
 if(req.url==='/football-wallet-test.html'){
  res.setHeader('Content-Type','text/html');
  res.end(`<div id="game"></div><script type="module">
   import {mountSlot} from '/assets/games/futebol/slot-host.js';
   import {createCasinoLocalWallet} from '/js/casino-local-wallet.js';
   window.wallet=createCasinoLocalWallet('football-player');await window.wallet.start();
   window.mountGame=()=>mountSlot(document.querySelector('#game'),{
    src:'/assets/games/futebol/embed.html',playerId:'football-player:${CASINO_EDITION}',
    getBalance:()=>window.wallet.balance(),
    settle:async tx=>window.wallet.settle({...tx,streamId:'football-stream-12345678'})
   });
  </script>`);return;
 }
 const path=resolve(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\//,''));
 if(relative(root,path).startsWith('..')){res.writeHead(403).end();return;}
 try{
  const data=readFileSync(path);
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try{
 for(const version of ['0.7.1','0.9.2','0.9.3','0.9.4'])for(const applied of [false,true]){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:applied?390:1440,height:900}});
  await context.route('**/js/db.js',route=>route.fulfill({contentType:'text/javascript',body:`import {casinoFixture} from '/tests/fixtures/casino.js';export const callAdmin=casinoFixture;`}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/football-wallet-test.html`);
  await page.waitForFunction(()=>!!window.mountGame);
  const before=createSession('pending-upgrade');before.balance=10000;before.configVersion=version;
  // Generate once with the current engine, then represent the saved legacy receipt.
  const next=execute({...before,configVersion:'1.0.0'},{type:'start',mode:'base'},'pending-operation-12345678','date');
  next.configVersion=version;next.history[0].configVersion=version;
  const row=next.history[0];
  const transaction={id:next.requestIds[0],debit:row.cost,credit:row.spins[0].paid,roundId:row.id,spin:1,configVersion:version,bet:row.bet,mode:row.mode,bonusHunt:false,progress:structuredClone(next),bonusComplete:false};
  const key=`slot-local-v1:player:${encodeURIComponent('football-player:'+CASINO_EDITION)}`;
  await page.evaluate(async({before,next,transaction,key,applied})=>{
   if(applied)await window.wallet.settle({...transaction,streamId:'football-stream-12345678'});
   localStorage.setItem(key,JSON.stringify(before));
   localStorage.setItem(key+':wallet-pending',JSON.stringify({before:before.revision,next,transaction}));
   localStorage.setItem(key+':preferences',JSON.stringify({speed:'super',autoFs:false,reduced:true,sound:false,lines:false}));
   window.mountGame();
  },{before,next,transaction,key,applied});
  const frame=page.frameLocator('iframe');
  await frame.locator('body[data-assets="ready"]').waitFor({timeout:25000});
  const recovered=await page.evaluate(async key=>({session:JSON.parse(localStorage.getItem(key)),pending:localStorage.getItem(key+':wallet-pending'),balance:await window.wallet.balance()}),key);
  assert.equal(recovered.pending,null);assert.equal(recovered.session.configVersion,'1.0.0');
  assert.equal(recovered.session.rngState,next.rngState);assert.equal(recovered.session.balance,next.balance);
  assert.equal(recovered.balance,next.balance);assert.equal(recovered.session.history[0].spins.length,1);
  // Replaying the same old receipt must return the same balance without a second debit.
  assert.equal(await page.evaluate(async transaction=>(await window.wallet.settle({...transaction,streamId:'football-stream-12345678'})).balance,transaction),next.balance);
  if(await frame.locator('#enter-bonus').isVisible())await frame.locator('#enter-bonus').click();
  else await frame.locator('#spin:enabled').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).revision>1+1,key);
  const continued=await page.evaluate(async key=>({session:JSON.parse(localStorage.getItem(key)),balance:await window.wallet.balance()}),key);
  assert.equal(continued.session.balance,continued.balance);
  assert.ok(continued.session.rngState!==next.rngState);
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.wallet.close());await context.close();
 }
 console.log('Slot 1.0.0: built iframe + real IndexedDB wallet; legacy pending receipts before/after settlement, no duplicate debit/RNG, next spin, desktop/mobile passed. No cloud.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
