import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from './browser-sandbox.mjs';
const origin='http://127.0.0.1:8096';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','8096'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('Fixture server failed')));});
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
const card=(id,rank)=>({id,rank,suit:0});
const cards=[card('a',8),card('b',3)],dealer=[card('c',6),card('d',10)];
const round={id:100,revision:1,phase:'play',shoe:[],index:4,dealer,seats:[{number:1,initial:100,insurance:0,insured:false,insuranceGross:0,hands:[{id:'hand-1',cards,stake:100,initial:100,extra:0,split:false,splitAces:false,done:false,gross:0}]}],active:'hand-1',reveal:false,events:[{type:'card',seat:1,hand:'hand-1',card:cards[0]},{type:'card',card:dealer[0]},{type:'card',seat:1,hand:'hand-1',card:cards[1]},{type:'card',card:dealer[1],hidden:true}],cost:100,gross:0};
const base={table:{id:'local-table',revision:1,deadline:Date.now()+60000,players:[{uid:'test',name:'Jogador local',seat:1,bet:0,activeUntil:Date.now()+120000,leaving:false}],round:null},uid:'test',balance:20000,now:Date.now(),pending:false};
mkdirSync('test-results/blackjack',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const open=async(reduced)=>{
  await page.goto(origin+'/assets/games/blackjack/embed.html');
  await page.waitForFunction(()=>window.mountBlackjackMultiplayer);
  await page.evaluate(({base,reduced})=>{
   localStorage.setItem('atelier:blackjack:audio',JSON.stringify({master:0,effects:0,music:0,muted:true,reduced}));
   window.handledAnimations=[];
   const animate=Element.prototype.animate;
   Element.prototype.animate=function(...args){const a=animate.apply(this,args);if(this.classList.contains('card'))window.handledAnimations.push(a);return a;};
   window.game=window.mountBlackjackMultiplayer({subscribe(fn){window.pushView=fn;fn(base);return()=>{};},command:async()=>{}});
   window.setCasinoFit(true);
  },{base,reduced});
 };
 const emit=async(r,pending=false)=>page.evaluate(({base,r,pending})=>window.pushView({...base,now:Date.now(),pending,table:{...base.table,revision:Date.now(),round:r}}),{base,r,pending});
 const layout=()=>page.evaluate(()=>Object.fromEntries(['.stage','.table-floor','.control-bar','.viewed .avatar'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.top,r.height,r.bottom]];})));
 await open(true);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
  await emit(null);await page.locator('[data-action="bet"]').waitFor();
  const before=await layout();
  await page.evaluate(()=>{window.oldChip=document.querySelector('[data-chip]');window.oldSeat=document.querySelector('[data-action="focus-1"]');});
  await emit(null);
  assert.ok(await page.evaluate(()=>oldChip===document.querySelector('[data-chip]')&&oldSeat===document.querySelector('[data-action="focus-1"]')),'Metadata replaced existing controls');
  await emit(round);await page.locator('[data-action="hit"]').waitFor();
  assert.deepEqual(await layout(),before,`Deal changed layout at ${width}`);
  await page.evaluate(()=>window.oldCard=document.querySelector('.hand .card'));
  await emit(round,true);await page.getByText('A confirmar a tua jogada').waitFor();
  assert.equal(await page.locator('[data-action="retry"]').count(),0);
  assert.deepEqual(await layout(),before,`Pending changed layout at ${width}`);
  await emit(round);await page.locator('[data-action="hit"]').waitFor();
  assert.ok(await page.evaluate(()=>oldCard===document.querySelector('.hand .card')),'Metadata discarded a card');
  const waiting={...round,active:null};
  await emit(waiting);await page.waitForTimeout(50);
  assert.deepEqual(await layout(),before,`Waiting changed layout at ${width}`);
  const summary=structuredClone(round);summary.phase='summary';summary.active=null;summary.reveal=true;summary.seats[0].hands[0].done=true;summary.seats[0].hands[0].gross=200;summary.seats[0].hands[0].result='win';
  await emit(summary);await page.locator('.hand-result').waitFor();
  assert.deepEqual(await layout(),before,`Summary changed layout at ${width}`);
  assert.ok(await page.evaluate(()=>document.querySelector('.control-bar').getBoundingClientRect().bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`test-results/blackjack/live-stable-${width}.png`});
 }
 // Real motion: metadata arriving mid-deal cannot replace animated cards or cancel flights.
 await page.setViewportSize({width:1440,height:900});await open(false);
 await emit(round);
 await page.waitForFunction(()=>handledAnimations.length>=1);
 await page.evaluate(()=>window.flyingCard=document.querySelector('.hand .card'));
 await emit(round);await emit(round);
 await page.locator('[data-action="hit"]').waitFor();
 assert.ok(await page.evaluate(()=>flyingCard===document.querySelector('.hand .card')));
 assert.equal(await page.evaluate(()=>handledAnimations.length),4,'Metadata replayed the deal');
 assert.ok(await page.evaluate(()=>handledAnimations.every(a=>a.playState==='finished')),'A flight was cancelled');
 // The actual website's centering must include the chip controls at laptop height.
 await page.goto(origin+'/#/casino');
 await page.locator('[data-casino-game="blackjack"]').click();
 const frame=page.frameLocator('iframe[title="Blackjack · Mesa partilhada"]');
 await frame.locator('[data-people]').waitFor();
 for(const viewport of [{width:1440,height:720},{width:768,height:900},{width:390,height:844},{width:320,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(100);
  await page.locator('[data-center-game]').click();await page.waitForTimeout(200);
  assert.ok(await frame.locator('.control-bar').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1),'Chip controls outside iframe');
  assert.ok(await page.locator('iframe').evaluate(el=>{
   const bottom=document.querySelector('.bottom-nav'),reserve=bottom&&getComputedStyle(bottom).display!=='none'?bottom.getBoundingClientRect().height:0;
   return el.getBoundingClientRect().bottom<=innerHeight-reserve+1;
  }),'Centered game exceeds viewport');
  await page.screenshot({path:`test-results/blackjack/centered-${viewport.width}x${viewport.height}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log('Online local: stable geometry through five states at four widths, persistent nodes, four uninterrupted flights under metadata updates.');
}finally{await browser.close();server.kill();}
