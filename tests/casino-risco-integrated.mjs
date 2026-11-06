import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {chromium} from './browser-sandbox.mjs';
import {crashFromSeed} from '../games/risco/src/engine.js';
const root=resolve('.'),output=resolve(root,'artifacts/risco');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html');if(relative(root,path).startsWith('..'))throw Error();res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{})});
await mkdir(output,{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1920,height:1080},serviceWorkers:'block'});
  await context.route('**/js/firebase.js',route=>route.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
  for(const name of ['auth','db'])await context.route(`**/js/${name}.js`,async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(resolve(root,`tests/fixtures/${name}.js`),'utf8')).replaceAll('../../js/','./')}));
  // Fix only the eight-word seed used by RISCO. All data is a disposable local fixture.
  let word=1;while(crashFromSeed(word.toString(16).padStart(8,'0').repeat(8))<300||crashFromSeed(word.toString(16).padStart(8,'0').repeat(8))>500)word++;
  await context.addInitScript(word=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>array instanceof Uint32Array&&array.length===8?array.fill(word):original(array);},word);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/#/casino');
  await page.waitForFunction(()=>document.querySelector('.casino-wallet-total strong')?.textContent==='100');
  const card=page.locator('.casino-game').filter({has:page.locator('[data-casino-game="risco"]')});
  assert.equal(await card.count(),1);
  assert.equal(await card.locator('img').evaluate(image=>image.complete&&image.naturalWidth>0),true);
  await page.screenshot({path:resolve(output,'casino-catalog.png')});
  async function open(){await page.locator('[data-casino-game="risco"]').click();const element=page.locator('iframe[src*="/risco/"]');await element.waitFor();const frame=await element.elementHandle().then(h=>h.contentFrame());await frame.locator('#loading.done').waitFor({state:'attached',timeout:20000});await page.clock.runFor(200);return frame;}
  let frame=await open();
  assert.equal(await frame.evaluate(()=>new URL(location.href).searchParams.get('wallet')),'host');
  async function geometry(label){
    await page.clock.runFor(200);
    const result=await page.evaluate(()=>{const iframe=document.querySelector('iframe[src*="/risco/"]'),box=iframe.getBoundingClientRect(),toolbar=document.querySelector('.casino-toolbar').getBoundingClientRect(),doc=iframe.contentDocument,button=doc.querySelector('#action').getBoundingClientRect();return{frameBelowMenu:box.top>=toolbar.bottom-1,frameInside:box.bottom<=innerHeight+1&&box.left>=0&&box.right<=innerWidth+1,buttonInside:button.bottom<=iframe.clientHeight&&button.top>=0,childOverflow:doc.documentElement.scrollWidth>iframe.clientWidth||doc.documentElement.scrollHeight>iframe.clientHeight,pageOverflow:document.documentElement.scrollWidth>innerWidth+1};});
    assert.deepEqual(result,{frameBelowMenu:true,frameInside:true,buttonInside:true,childOverflow:false,pageOverflow:false},label+' '+JSON.stringify(result));
  }
  for(const[width,height]of[[1920,1080],[1366,768],[768,1024],[390,844],[320,740]]){
    await page.setViewportSize({width,height});await geometry(`${width}×${height}`);await page.screenshot({path:resolve(output,`casino-integrated-${width}.png`)});
  }
  await frame.locator('#bet').fill('10');await frame.locator('#auto-toggle').check();await frame.locator('#action').click();await page.clock.runFor(350);
  assert.equal(await frame.locator('#balance').innerText(),'90');
  assert.equal(await page.locator('.casino-wallet-total strong').innerText(),'90');
  const state=()=>page.evaluate(async()=>{const{readCasinoLocal}=await import('/js/casino-local-store.js');const s=await readCasinoLocal('pedro');return{spent:s.spent,won:s.won,balance:s.balance,roundId:s.risco.round.id,recorded:s.wallet.recent.filter(e=>e.kind==='risco').length};});
  const started=await state();assert.equal(started.spent,1000);
  await page.locator('[data-close-slot]').first().click();await page.clock.runFor(200);assert.equal(await page.locator('iframe[src*="/risco/"]').count(),1);await geometry('aviso de ronda pendente');
  await page.clock.fastForward(7000);await page.clock.runFor(300);
  await page.reload();await page.locator('[data-casino-game="risco"]').waitFor();frame=await open();
  assert.equal((await state()).roundId,started.roundId,'Reload retoma a aposta original');
  await page.clock.fastForward(30000);await page.clock.runFor(600);
  await page.waitForFunction(()=>document.querySelector('.casino-wallet-total strong')?.textContent==='110');
  const settled=await state();assert.equal(settled.spent,1000);assert.equal(settled.won,2000);assert.equal(settled.balance,11000);assert.equal(settled.recorded,1);
  assert.equal(await frame.locator('#balance').innerText(),'110');
  await page.screenshot({path:resolve(output,'casino-wallet-settled.png')});
  await page.locator('[data-close-slot]').first().click();await page.clock.runFor(200);await page.locator('#casino-games').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('RISCO integrado: catálogo real, thumbnail, 5 tamanhos, área sob o menu, débito/prémio e saldo do cabeçalho, bloqueio de saída, recuperação após reload e movimento único passaram. Apenas fixtures locais.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
