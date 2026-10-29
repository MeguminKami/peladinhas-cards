import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import assert from 'node:assert/strict';
import {createSession,execute} from '../games/futebol/src/session.ts';
import {chromium} from './browser-sandbox.mjs';
const root=resolve('.');
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html',file=resolve(root,path);
 if(relative(root,file).startsWith('..')){res.writeHead(404).end();return;}
 let body;
 if(path==='wallet-test.html')body='<!doctype html><title>Carteira</title>';
 else if(path==='js/config.js')body='export const runtimeMode="fixtures";export const firebaseConfig={};';
 else if(path==='js/firebase.js')body='export const configured=true;';
 else if(['js/auth.js','js/db.js'].includes(path))body=readFileSync(resolve(root,'tests/fixtures',path.slice(3)),'utf8').replaceAll('../../js/','./');
 else if(existsSync(file))body=readFileSync(file);
 else{res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ogg':'audio/ogg','.wav':'audio/wav','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(body);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge',...(existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})}:{})});

try {
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await page.goto(origin+'/wallet-test.html');
 // The mirror rejects malformed values and detaches from replaced games.
 const mirror=await page.evaluate(async()=>{
  const {observeCasinoPresentedBalance}=await import('/js/casino-presented-balance.js');
  const box=document.createElement('div');document.body.append(box);const seen=[];
  const stop=observeCasinoPresentedBalance(box,value=>seen.push(value));
  const frame=document.createElement('iframe');await new Promise(r=>{frame.onload=r;box.append(frame);});
  const html=frame.contentDocument.documentElement;
  for(const value of ['1000','NaN','-1','1.5','','1200']){html.dataset.casinoBalance=value;await new Promise(r=>setTimeout(r,0));}
  frame.remove();await new Promise(r=>setTimeout(r,0));html.dataset.casinoBalance='9000';await new Promise(r=>setTimeout(r,0));stop();return seen;
 });
 assert.deepEqual(mirror,[1000,1200]);
 for(const bonus of [false,true]){
  let snapshot;
  for(let seed=0;seed<1000;seed++){const s=createSession('balance-'+seed);let n=execute(s,{type:'start',mode:bonus?'normal':'base'},'probe');if(bonus){while(n.active&&!n.pendingRetrigger)n=execute(n,{type:'next'},'next-'+n.revision);if(!n.active&&n.history[0].paid>0&&n.history[0].spins.every(spin=>spin.paid<=s.bet*10)){snapshot=s;break;}}else if(!n.active&&n.history[0].paid>0){snapshot=s;break;}}
  assert.ok(snapshot);
  const expected=execute(snapshot,{type:'start',mode:bonus?'normal':'base'},'expected');
  await page.goto(origin+'/wallet-test.html');
  await page.evaluate(async({snapshot,bonus})=>{
   localStorage.clear();
   const key='slot-local-v1:player:balance-test';localStorage.setItem(key,JSON.stringify(snapshot));
   localStorage.setItem(key+':preferences',JSON.stringify({speed:'super',autoFs:true,reduced:true,sound:false,lines:false}));
   const {mountSlot}=await import('/assets/games/futebol/slot-host.js');
   const {observeCasinoPresentedBalance}=await import('/js/casino-presented-balance.js');
   document.body.innerHTML='<output id="outer"></output><div id="game"></div>';
   window.realBalance=snapshot.balance;window.samples=[];
   observeCasinoPresentedBalance(document.querySelector('#game'),value=>{document.querySelector('#outer').textContent=String(value);window.samples.push(value);});
   window.game=mountSlot(document.querySelector('#game'),{src:location.origin+'/assets/games/futebol/embed.html',playerId:'balance-test',getBalance:async()=>window.realBalance,settle:async op=>{window.realBalance+=op.credit-op.debit;return {balance:window.realBalance};}});
  },{snapshot,bonus});
  const frame=page.frameLocator('#game iframe');
  await frame.locator('body[data-assets="ready"]').waitFor({timeout:45000});
  await frame.locator('body').evaluate(()=>{
   window.balanceSamples=[];
   new MutationObserver(()=>{const key='slot-local-v1:player:balance-test',s=JSON.parse(localStorage.getItem(key));window.balanceSamples.push({shown:Number(document.documentElement.dataset.casinoBalance),busy:document.querySelector('.machine').classList.contains('is-busy'),active:!!s.active,paid:s.history[0]?.paid||0,balance:s.balance,summary:document.querySelector('#modal').dataset.kind,phase:document.querySelector('#modal').dataset.phase});}).observe(document.documentElement,{attributes:true,attributeFilter:['data-casino-balance']});
  });
  if(bonus){await frame.locator('#bonus-shop').click();await frame.locator('#buy-normal').click();await frame.locator('#confirm-buy').click();await frame.locator('#enter-bonus').click();
   await frame.locator('#modal[data-kind="bonus-summary"][data-phase="ready"]').waitFor({timeout:45000});
  }else{await frame.locator('#spin').click();await frame.locator('.machine:not(.is-busy)').waitFor({timeout:45000});}
  const result=await frame.locator('body').evaluate(()=>({samples:window.balanceSamples,state:JSON.parse(localStorage.getItem('slot-local-v1:player:balance-test')),shown:Number(document.documentElement.dataset.casinoBalance)}));
  const held=snapshot.balance-expected.history[0].cost;
  assert.ok(result.samples.some(s=>s.paid>0&&(s.busy||s.active||s.summary==='bonus-summary')&&s.shown===held),'paid result remains hidden during presentation');
  for(const sample of result.samples){if(sample.paid>0&&(sample.busy||sample.active))assert.equal(sample.shown,held,'no early credit during spin or bonus');if(sample.summary==='bonus-summary'&&sample.phase!=='ready')assert.equal(sample.shown,held,'no early credit during final count');}
  assert.equal(result.shown,result.state.balance);
  await page.waitForFunction(value=>Number(document.querySelector('#outer').textContent)===value,result.state.balance);
 }
 // A large Rift win stays hidden even after reels stop, until the final result is accepted.
 await page.goto(origin+'/wallet-test.html');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const rift=await page.evaluate(async()=>{
  const {fresh,initial,play}=await import('/assets/games/rift/engine.js');let snapshot,result;
  for(let seed=1;seed<2000;seed++){const candidate=fresh(seed);candidate.grid=initial(candidate);const next=structuredClone(candidate),record=play(next);if(record.win/record.bet>=15&&!record.intro&&!record.end){snapshot=candidate;result=next;break;}}
  if(!snapshot)throw Error('Missing deterministic Rift win');snapshot.settings={...snapshot.settings,reduced:false,speed:4,music:false,effects:false,muted:true};localStorage.setItem('rift-core-v1',JSON.stringify(snapshot));
  document.body.innerHTML='<div id="game"></div>';const {observeCasinoPresentedBalance}=await import('/js/casino-presented-balance.js');window.samples=[];observeCasinoPresentedBalance(document.querySelector('#game'),value=>window.samples.push(value));
  const frame=document.createElement('iframe');frame.src='/assets/games/rift/index.html?demo=1';document.querySelector('#game').append(frame);
  return {before:Math.round(snapshot.balance*100),held:Math.round((snapshot.balance-result.pending.cost)*100),final:Math.round(result.balance*100)};
 });
 const riftFrame=page.frameLocator('#game iframe');await riftFrame.locator('html[data-casino-balance]').waitFor();await riftFrame.locator('#spin').click();await riftFrame.locator('#modalContent[data-complete="true"]').waitFor({timeout:30000});
 assert.ok(await page.evaluate(({before,held})=>window.samples.every(n=>n===before||n===held),rift),'Rift never publishes an early credit');
 assert.equal(await riftFrame.locator('html').getAttribute('data-casino-balance'),String(rift.held),'Rift holds large win through final counter');
 await riftFrame.locator('#continue').evaluate(async button=>{await new Promise(r=>setTimeout(r,550));button.click();});
 await page.waitForFunction(value=>window.samples.at(-1)===value,rift.final);
 await page.goto(origin+'/wallet-test.html');
 const cardoso=await page.evaluate(async()=>{
  const {fresh,transition}=await import('/assets/games/cardoso-road/engine.mjs');let state=transition(fresh(),{type:'start',bet:100,mode:'normal'});for(let i=0;i<9;i++)state=transition(state,{type:'step',id:state.round.id},()=>0);const held=state.balance;
  const {observeCasinoPresentedBalance}=await import('/js/casino-presented-balance.js');const {mountCardoso}=await import('/assets/games/cardoso-road/mount.mjs');document.body.innerHTML='<div id="game"></div>';window.samples=[];observeCasinoPresentedBalance(document.querySelector('#game'),value=>window.samples.push(value));
  await mountCardoso(document.querySelector('#game'),{cardosoState:()=>state,cardosoAct:async action=>(state=transition(state,action,()=>0))}).ready;return {held};
 });
 const cardosoFrame=page.frameLocator('#game iframe');await cardosoFrame.locator('body').evaluate(()=>{window.sequence=[];new MutationObserver(()=>window.sequence.push({balance:Number(document.documentElement.dataset.casinoBalance),busy:window.cardosoBusy})).observe(document.documentElement,{attributes:true,attributeFilter:['data-casino-balance']});});
 await cardosoFrame.locator('#play').click();await page.waitForFunction(held=>window.samples.at(-1)>held,cardoso.held);
 assert.ok(await cardosoFrame.locator('body').evaluate((_,held)=>window.sequence.some(s=>s.busy&&s.balance===held)&&window.sequence.every(s=>!s.busy||s.balance===held),cardoso.held),'Cardoso retains payment through final approach');
 assert.deepEqual(errors,[]);
 console.log('Saldo visual: validação, troca de iframe, spin vencedor, bónus completo, grande vitória Rift e final Cardoso passaram.');
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
