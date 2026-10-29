import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import assert from 'node:assert/strict';
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
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
mkdirSync('test-results',{recursive:true});
try{
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:process.argv.includes('--motion')?'no-preference':'reduce'});
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 // boot.mjs imports the app after iframe load; the host must wait for wallet-ready.
 await context.route('**/assets/games/cardoso-road/app.mjs',async route=>{await new Promise(done=>setTimeout(done,750));await route.continue();});
 await context.addInitScript(()=>{Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(window.loseNext?4294967295:0);return a;}});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/wallet-test.html');
 const victoryAudio=await page.evaluate(async()=>{
  const audio=new AudioContext();
  try{return await Promise.all(['unlearnthematrix','maluco'].map(async name=>{
   const response=await fetch(`/assets/games/cardoso-road/assets/audio/${name}.ogg`);
   if(!response.ok)throw Error(`Falta áudio: ${name}`);
   const decoded=await audio.decodeAudioData(await response.arrayBuffer());
   return {name,duration:decoded.duration};
  }));}finally{await audio.close();}
 });
 assert.ok(victoryAudio.every(clip=>clip.duration>0));
 const accounting=await page.evaluate(async()=>{
  const {createCasinoLocalWallet}=await import('/js/casino-local-wallet.js');
  let wallet=createCasinoLocalWallet('cardoso-unit');await wallet.start();
  const startId=crypto.randomUUID(),start={type:'start',bet:1000,mode:'normal'};
  const first=await wallet.cardosoAct(start,startId);
  const repeated=await wallet.cardosoAct(start,startId);
  let altered=false;try{await wallet.cardosoAct({...start,bet:2000},startId);}catch{altered=true;}
  await wallet.cardosoAct({type:'step',id:first.round.id},crypto.randomUUID());
  const cashId=crypto.randomUUID(),cash={type:'cashout',id:first.round.id};
  const paid=await wallet.cardosoAct(cash,cashId);
  const paidAgain=await wallet.cardosoAct(cash,cashId);
  await wallet.close();wallet=createCasinoLocalWallet('cardoso-unit');await wallet.start();
  const recovered=await wallet.cardosoAct(cash,cashId);await wallet.close();
  sessionStorage.clear();return {first,repeated,altered,paid,paidAgain,recovered};
 });
 assert.deepEqual(accounting.first,accounting.repeated);assert.ok(accounting.altered);
 assert.deepEqual(accounting.paid,accounting.paidAgain);assert.deepEqual(accounting.paid,accounting.recovered);
 await page.goto(origin+'/#/casino');
 await page.locator('.casino-game img').first().waitFor();
 await page.locator('.casino-game img').evaluateAll(async images=>{if(images.length!==5)throw Error('Faltam capas');await Promise.all(images.map(async image=>{await image.decode();if(!image.naturalWidth)throw Error('Capa indispon?vel.');}));});
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`test-results/cardoso-catalog-${width}.png`,fullPage:true});
 }
 await page.locator('[data-casino-game="cardoso-road"]').click();
 let frame=page.frameLocator('.cardoso-host iframe');
 await frame.locator('.demo').filter({hasText:'DJABUCOIN'}).waitFor({state:'attached'});
 assert.equal(await frame.locator('.game > header').isVisible(),false);
 assert.equal(await frame.locator('#auto,#quick,#speech,.footer-auto,.footer-quick').count(),0);
 await frame.locator('#play:enabled').waitFor();
 assert.equal(await frame.locator('#balance').innerText(),'100,00');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.cardoso-host iframe').contentDocument.querySelector('#world').dataset.camera||'null')?.resting===true);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`test-results/cardoso-casino-${width}.png`,fullPage:true});
  await frame.locator('footer [data-panel="help"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/cardoso-footer-${width}.png`,fullPage:true});
  await page.keyboard.press('Tab');
  await frame.locator('#music-toggle').focus();
  assert.ok(await frame.locator('#music-toggle').evaluate(el=>el.matches(':focus-visible')));
  await frame.locator('#play').scrollIntoViewIfNeeded();
 }
 if(process.argv.includes('--startup')){
  await page.reload();await page.locator('[data-casino-game="cardoso-road"]').click();
  frame=page.frameLocator('.cardoso-host iframe');await frame.locator('.demo').filter({hasText:'DJABUCOIN'}).waitFor({state:'attached'});await frame.locator('#play:enabled').waitFor();
  assert.equal(await frame.locator('#balance').innerText(),'100,00');
  await page.getByRole('button',{name:'Fechar jogo',exact:true}).click();
  await page.locator('[data-casino-game="cardoso-road"]').waitFor({state:'visible'});
 }else{
 await frame.locator('#play').click();await page.waitForFunction(()=>document.querySelector('.cardoso-host iframe').contentDocument.querySelector('#balance').textContent==='90,00');
 await frame.locator('#markers').evaluate(markers=>{
  window.cooldownProbe=new Promise(resolve=>{
   const observer=new MutationObserver(()=>{
    if(markers.getAttribute('aria-valuenow')!=='1')return;
    observer.disconnect();const button=document.querySelector('#play'),disabled=button.disabled;
    button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));
    setTimeout(()=>resolve({disabled,step:markers.getAttribute('aria-valuenow')}),100);
   });
   observer.observe(markers,{attributes:true,attributeFilter:['aria-valuenow']});
  });
 });
 await frame.locator('#play').press('Space');
 const cooldown=await page.evaluate(()=>document.querySelector('.cardoso-host iframe').contentWindow.cooldownProbe);
 assert.equal(cooldown.disabled,true);
 assert.equal(cooldown.step,'1','Rapid click/Space advanced during cooldown');
 await frame.locator('#play:enabled').waitFor();
 await page.waitForTimeout(850);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
  await frame.locator('#world').screenshot({path:`test-results/cardoso-active-${width}.png`});
 }

 await page.reload();await page.locator('[data-casino-game="cardoso-road"]').click();
 frame=page.frameLocator('.cardoso-host iframe');await frame.locator('#cashout:enabled').waitFor();
 assert.equal(await frame.locator('#markers').getAttribute('aria-valuenow'),'1');
 await frame.locator('#cashout').click();assert.equal(await frame.locator('#balance').innerText(),'101,02');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.cardoso-host iframe').contentDocument.querySelector('#world').dataset.camera||'null')?.resting===true);
 // The same durable request cannot pay twice, even after the game reopens.
 const replay=await page.evaluate(async()=>{
  const {createCasinoLocalWallet}=await import('/js/casino-local-wallet.js');
  const {readCasinoLocal}=await import('/js/casino-local-store.js');
  const state=await readCasinoLocal('pedro');
  return {balance:state.balance,won:state.won,history:state.cardoso.history.length,receipt:!!state.cardosoReceipt};
 });
 assert.equal(replay.balance,10102);assert.equal(replay.won,1102);assert.equal(replay.history,1);assert.ok(replay.receipt);
 await frame.locator('#play').click();
 await page.evaluate(()=>window.loseNext=true);
 await frame.locator('#play').click();assert.equal(await frame.locator('#balance').innerText(),'91,02');
 assert.equal(await frame.locator('#cashout').isDisabled(),true);
 await page.waitForFunction(()=>{
  const doc=document.querySelector('.cardoso-host iframe').contentDocument,camera=JSON.parse(doc.querySelector('#world').dataset.camera||'null');
  return camera?.resting&&camera.position===0&&camera.camera===0&&doc.querySelector('#markers').getAttribute('aria-valuenow')==='0';
 });
 await frame.locator('#world').screenshot({path:'test-results/cardoso-after-loss.png'});
 await page.reload();await page.locator('[data-casino-game="cardoso-road"]').click();
 frame=page.frameLocator('.cardoso-host iframe');await frame.locator('#play:enabled').waitFor();
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.cardoso-host iframe').contentDocument.querySelector('#world').dataset.camera||'null')?.resting===true);
 await page.waitForFunction(()=>document.querySelector('.cardoso-host iframe').contentDocument.querySelector('#balance').textContent==='91,02');

 await page.getByRole('button',{name:'Fechar jogo',exact:true}).click();
 await page.locator('[data-casino-game="cardoso-road"]').waitFor({state:'visible'});
 assert.match(await page.locator('.casino-balance strong').innerText(),/91,02/);
 }
 assert.deepEqual(errors,[]);
 console.log(process.argv.includes('--startup')?'Cardoso: arranque atrasado, carteira ligada, reabertura, 4 larguras e zero acessos cloud OK':'Cardoso integrado: carteira partilhada, retoma após reload, cashout único, derrota, 4 larguras e zero acessos cloud OK');
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
