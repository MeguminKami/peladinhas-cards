import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from './browser-sandbox.mjs';
const root = new URL('../', import.meta.url);
const server = createServer(async (req,res) => {
  try {
    if(req.url==='/risco-host-test.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}header{height:86px}#mount{height:calc(100dvh - 86px)}iframe{border:0;width:100%;height:100%;display:block}</style><header>Menu local de teste</header><div id="mount"></div>');return;}
    const path = new URL(req.url.split('?')[0].replace(/^\//,''), root);
    if (!path.href.startsWith(root.href)) throw Error('Invalid path');
    res.setHeader('Content-Type', ({js:'text/javascript',html:'text/html',css:'text/css',webp:'image/webp',wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg'})[path.pathname.split('.').at(-1)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(edge)?edge:null);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const output=new URL('../artifacts/risco/',import.meta.url);
await mkdir(output,{recursive:true});
const context=await browser.newContext({serviceWorkers:'block'});
const errors=[];
const page=await context.newPage();
await page.clock.install();
page.on('pageerror',error=>errors.push(error.message));
const url=`http://127.0.0.1:${server.address().port}/games/risco/game.html`;
async function open(query='demo=crash&m=3.47') {
  await page.goto(`${url}?${query}`);
  await page.locator('#loading.done').waitFor({state:'attached',timeout:20000});
  // A memory-cached Image need not emit a network response on every navigation.
  const atlas=await page.evaluate(async()=>fetch('ui/art/character.json').then(response=>response.json()));
  assert.equal(atlas.approved,true);assert.equal(atlas.atlas,'lcd-cocaine-atlas.webp');
  await page.locator('#action').waitFor();
  await page.clock.runFor(100);
}
async function advance(ms) { await page.clock.fastForward(ms); await page.clock.runFor(450); }
async function bet() { await page.locator('#action').click(); await new Promise(resolve=>setTimeout(resolve,150)); await page.clock.runFor(100); assert.equal(await page.locator('#action-label').textContent(),'À ESPERA',await page.locator('#game').innerText()); }
function balance(text) { return Number(text.replace(/\D/g,'')); }
try {
  for (const [width,height] of [[1920,994],[1366,682],[390,758],[320,654]]) {
    await page.setViewportSize({width,height});await open();
    const geometry=await page.evaluate(()=>{
      const r=document.querySelector('#action').getBoundingClientRect();
      return {overflowX:document.documentElement.scrollWidth>innerWidth,overflowY:document.documentElement.scrollHeight>innerHeight,
        visible:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
        covered:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#action')===document.querySelector('#action')};
    });
    assert.deepEqual(geometry,{overflowX:false,overflowY:false,visible:true,covered:true},`${width}×${height}`);
    await page.screenshot({path:new URL(`${width}x${height}.png`,output).pathname.replace(/^\/(\w:)/,'$1')});
    await bet();await advance(7000);
    const dialogue=await page.evaluate(()=>{
      const speech=document.querySelector('#speech'),scene=document.querySelector('#scene').getBoundingClientRect();
      speech.textContent='Isto já é outra dimensão.';
      const box=speech.getBoundingClientRect(),w=scene.width-2,h=scene.height-2,mobile=w<700||h>w*1.1;
      const characterRight=scene.left+1+(mobile?w*.025:w*.055)+Math.min(w*(mobile?.6:.44),h*(mobile?.51:.94));
      return{rightOfCharacter:box.left>=characterRight,inside:box.right<=scene.right&&box.bottom<=scene.bottom,wraps:speech.scrollWidth<=speech.clientWidth};
    });
    assert.deepEqual(dialogue,{rightOfCharacter:true,inside:true,wraps:true},'Balão à direita e frase longa legível');
    await page.screenshot({path:new URL(`${width}x${height}-running.png`,output).pathname.replace(/^\/(\w:)/,'$1')});
  }
  await page.setViewportSize({width:1366,height:682});
  await open();await bet();await advance(7000);
  assert.equal(await page.locator('#action-label').textContent(),'CASHOUT');
  await page.locator('#action').click();await page.clock.runFor(100);
  assert.ok(balance(await page.locator('#balance').textContent())>10000);
  assert.match(await page.locator('#message').textContent(),/Saíste/);
  await open();await bet();await advance(7000);
  await page.locator('body').click({position:{x:5,y:5}});await page.keyboard.press('Space');await page.clock.runFor(100);
  assert.match(await page.locator('#message').textContent(),/Saíste/);
  await open();await page.locator('#auto-toggle').check();await bet();await advance(18000);
  assert.equal(balance(await page.locator('#balance').textContent()),10100);
  assert.match(await page.locator('#message').textContent(),/2,00/);
  await open();await bet();await advance(28000);
  assert.equal(balance(await page.locator('#balance').textContent()),9900);
  assert.equal(await page.locator('#phase').textContent(),'CRASH @');
  await open('demo=instant');await bet();await advance(5500);
  assert.equal(await page.locator('#message').textContent(),'NEM DEU PARA ALINHAR');
  await open('demo=max');await bet();await advance(160000);
  assert.equal(await page.locator('#phase').textContent(),'MAX WIN');
  assert.equal(balance(await page.locator('#balance').textContent()),1009800);
  await page.emulateMedia({reducedMotion:'reduce'});await open();
  assert.equal(await page.locator('#reduced').getAttribute('aria-pressed'),'true');
  await page.locator('#reduced').click();assert.equal(await page.locator('#reduced').getAttribute('aria-pressed'),'false');
  // Real postMessage host + durable local wallet, with all cloud calls replaced.
  await context.route('**/js/db.js',route=>route.fulfill({contentType:'text/javascript',body:"import {casinoFixture} from '../tests/fixtures/casino.js';export const callAdmin=casinoFixture;"}));
  await page.goto(`http://127.0.0.1:${server.address().port}/risco-host-test.html`);
  await page.evaluate(async()=>{
    const {createCasinoLocalWallet}=await import('/js/casino-local-wallet.js');
    const {mountCasinoRisco}=await import('/js/casino-risco-host.js');
    const {readCasinoLocal}=await import('/js/casino-local-store.js');
    window.testWallet=createCasinoLocalWallet('risco-host-browser',()=>{}, {tables:true});await testWallet.start();
    window.testHost=mountCasinoRisco(document.querySelector('#mount'),testWallet);
    window.readTestWallet=()=>readCasinoLocal('risco-host-browser');await testHost.ready;
  });
  const frame=page.frames().find(frame=>frame.url().includes('/assets/games/risco/game.html'));
  await frame.locator('#loading.done').waitFor({state:'attached'});await page.clock.runFor(100);
  assert.equal(balance(await frame.locator('#balance').textContent()),100);
  await frame.locator('#bet').fill('1');await frame.locator('#auto-toggle').check();await frame.locator('#action').click();await page.clock.runFor(300);
  assert.equal(balance(await frame.locator('#balance').textContent()),99);
  assert.equal(await page.evaluate(()=>testHost.canLeave()),false);
  const before=await page.evaluate(async()=>{const s=await readTestWallet();return{seed:s.risco.round.engine.seed,crash:s.risco.round.engine.crashCents,spent:s.spent};});
  assert.equal(before.spent,100);assert.ok(!(await frame.locator('#proof').textContent()).includes(before.seed));
  await advance(200000);
  const after=await page.evaluate(async()=>{const s=await readTestWallet();return{balance:s.balance,spent:s.spent,won:s.won,movements:s.wallet.recent.filter(r=>r.kind==='risco').length,leave:testHost.canLeave()};});
  const credit=before.crash>=200?200:0;
  assert.deepEqual(after,{balance:9900+credit,spent:100,won:credit,movements:1,leave:true});
  assert.equal(Number((await frame.locator('#balance').textContent()).replace(/\s/g,'').replace(',','.')),after.balance/100);
  // Measure actual RAF cadence, without the virtual clock used for long rounds.
  const perfPage=await browser.newPage({viewport:{width:1366,height:682}});
  await perfPage.goto(url+'?demo=crash');await perfPage.locator('#loading.done').waitFor({state:'attached'});
  const cadence=await perfPage.evaluate(async()=>{const times=[];await new Promise(resolve=>{let last;const sample=now=>{if(last)times.push(now-last);last=now;if(times.length<150)requestAnimationFrame(sample);else resolve();};requestAnimationFrame(sample);});const steady=times.slice(-60).sort((a,b)=>a-b);return{medianMs:steady[30],p95Ms:steady[57],quality:window.riscoPresentation.quality};});
  await perfPage.close();
  assert.deepEqual(errors,[]);
  console.log('RISCO browser: 4 tamanhos sem overflow, clique/espaço, auto, perda, instantâneo, MAX WIN, movimento reduzido e iframe com carteira passaram. RAF local após adaptação: mediana '+cadence.medianMs.toFixed(2)+' ms / p95 '+cadence.p95Ms.toFixed(2)+' ms, qualidade '+cadence.quality+'.');
} finally { await browser.close();await new Promise(resolve=>server.close(resolve)); }
