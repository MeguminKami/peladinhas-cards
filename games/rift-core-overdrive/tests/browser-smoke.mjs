import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {chromium} from '../../../node_modules/playwright/index.mjs';
import {fresh,initial,play,purchasePrice} from '../engine.js';
import {verifyInterface} from './interface-layout.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const request=new URL(req.url,'http://local');
  if(request.pathname==='/fit.css'){res.setHeader('Content-Type','text/css');res.end(await readFile(new URL('../../../css/casino-rift-fit.css',import.meta.url)));return;}
  const path=resolve(root,'.'+decodeURIComponent(request.pathname));
  if(!path.startsWith(root+sep)&&path!==root)throw Error('Invalid path');
  const mime={'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
  let content=await readFile(path);
  if(extname(path)==='.html'&&request.searchParams.has('fit'))content=content.toString().replace('<html lang="pt">','<html lang="pt" data-casino-fit>').replace('</head>','<link rel="stylesheet" href="/fit.css"></head>');
  res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const errors=[];
try{
 if(!process.argv.includes('--layout')){
 let activation;
 for(let seed=1;seed<100;seed++){const s=fresh(seed);s.balance=10000;const r=play(s,{buy:'overdrive'});if(r.scatters===6){activation=s;break;}}
 assert.ok(activation);activation.settings.reduced=true;activation.settings.volume=0;
 for(const width of [1440,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),activation);
  await page.goto(url+'/index.html');
  await page.locator('#continue').waitFor();
  await page.waitForTimeout(550);await page.locator('#continue').click();
  await page.locator('#modalContent .amount').filter({hasText:'14 FREE SPINS'}).waitFor();
  assert.ok(await page.locator('#continue').isVisible());
  await page.screenshot({path:resolve(tmpdir(),`rift-44-${width}.png`)});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,`page overflow at ${width}`);
  await page.close();

  const rules=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
  rules.on('pageerror',e=>errors.push(e.message));
  await rules.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await rules.goto(url+'/index.html');
  await rules.locator('#board .tile').first().waitFor();
  assert.equal(await rules.locator('#modal').isVisible(),false,'opens directly on the board');
  assert.equal(await rules.locator('#menuPlay').count(),0);
  await rules.locator('#rules').click();
  assert.ok((await rules.locator('#modalContent').innerText()).includes('6 dão 14 OVERDRIVE FS'),(await rules.locator('#modalContent').innerText()).slice(-5000));
  assert.ok((await rules.locator('#modalContent').innerText()).includes('27 ways'));
  await rules.locator('#closeModal').click();
  await rules.locator('#buyBonus').click();
  assert.ok((await rules.locator('#buy-overdrive').innerText()).includes('5'));
  assert.equal(await rules.locator('#buy-overdrive').getByText(/FREE SPINS|6 SCATTERS/).count(),0);
  await rules.locator('#buy-overdrive').click();
  assert.ok((await rules.locator('#modalContent').innerText()).includes('5 SCATTERS'));
  assert.equal(await rules.locator('#modalContent').getByText(/33,33%|12–14/).count(),0);
  await rules.keyboard.press('Tab');
  assert.ok(await rules.evaluate(()=>document.activeElement?.tagName!=='BODY'));
  await rules.close();
  console.log(`Verified rules, purchase, recovered 14 FS and no page overflow at ${width}px`);

  const animated=await browser.newPage({viewport:{width,height:950},reducedMotion:'no-preference'});
  animated.on('pageerror',e=>errors.push(e.message));
  await animated.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await animated.addInitScript(state=>{state.settings.reduced=false;localStorage.setItem('rift-core-v1',JSON.stringify(state));},activation);
  await animated.goto(url+'/index.html');
  await animated.locator('#continue').waitFor();
  await animated.waitForTimeout(550);await animated.locator('#continue').click();
  await animated.locator('.scatter-gather').waitFor();
  assert.equal(await animated.locator('#modal').isVisible(),false,'bonus explanation waits for gathering');
  assert.equal(await animated.locator('.scatter-gather-flight').count(),6);
  assert.equal(await animated.locator('#buyBonus').isDisabled(),true);
  await animated.locator('.scatter-gather[data-phase="synchronize"]').waitFor();
  assert.equal(await animated.locator('.scatter-gather-flight').evaluateAll(nodes=>nodes.filter(el=>Number(getComputedStyle(el).opacity)>.9).length),6,'every Scatter stays visible before fusion');
  await animated.screenshot({path:resolve(tmpdir(),`rift-orbit-${width}.png`)});
  await animated.locator('.scatter-gather[data-phase="fuse"]').waitFor();
  await animated.waitForTimeout(250);
  await animated.screenshot({path:resolve(tmpdir(),`rift-fusion-${width}.png`)});
  await animated.locator('.scatter-gather[data-phase="reveal"]').waitFor();
  await animated.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.scatter-gather-core')).opacity)>.95);
  assert.equal(await animated.locator('.scatter-gather-core .symbol-9').count(),1,'fusion materializes the Overdrive emblem');
  await animated.screenshot({path:resolve(tmpdir(),`rift-materialized-${width}.png`)});
  assert.equal(await animated.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await animated.locator('#modalContent .amount').filter({hasText:'14 FREE SPINS'}).waitFor();
  assert.equal(await animated.locator('.scatter-gather').count(),0,'transient layer is removed');
  assert.equal(await animated.locator('.scatter-gather-source').count(),0,'original symbols are restored');
  await animated.close();
  console.log(`Verified scatter gathering before the bonus explanation at ${width}px`);
 }
 // Exercise the ordinary spin path too, rather than only recovered results.
 let natural;
 for(let seed=1;seed<20000;seed++){
  const state=fresh(seed);state.grid=initial(state);const result=play(structuredClone(state));
  if(result.intro==='rift'&&result.win<15&&result.cascades<=1){natural=state;break;}
 }
 assert.ok(natural);
 for(const buy of [null,'core']){
  const live=await browser.newPage({viewport:{width:390,height:950},reducedMotion:'no-preference'});
  live.on('pageerror',e=>errors.push(e.message));
  await live.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  const start=buy?fresh(991):natural;start.settings.volume=0;start.settings.speed=4;
  await live.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),start);
  await live.goto(url+'/index.html');await live.locator('#board .tile').first().waitFor();
  if(buy){
   await live.locator('#buyBonus').click();await live.locator('#buy-core').click();
   await live.waitForTimeout(550);await live.locator('#continue').click();
  }else await live.locator('#spin').click();
  await live.locator('.scatter-gather').waitFor({timeout:20000});
  assert.equal(await live.locator('.scatter-gather-flight').count(),buy?3:4);
  assert.equal(await live.locator('#modal').isVisible(),false);
  await live.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.scatter-gather-core')).opacity)>.8);
  await live.screenshot({path:resolve(tmpdir(),`rift-gather-center-${buy||'natural'}.png`)});
  await live.locator('#modalContent .amount').filter({hasText:buy?'8 FREE SPINS':'10 FREE SPINS'}).waitFor();
  const snapshot=await live.evaluate(async()=>{const app=await import('/app.js');return app.sessionSnapshot();});
  assert.equal(snapshot.history.length,1,'one result is settled');
  assert.equal(snapshot.pending.intro,buy||'rift');
  assert.equal(snapshot.pending.cost,buy?purchasePrice('core',1):1);
  await live.close();
  console.log(`Verified live ${buy?'purchase':'natural trigger'} gathers before its explanation`);
 }
 }
 if(!process.argv.includes('--layout')){
  let recharge;
  for(let seed=1;seed<=100&&!recharge;seed++){
   const s=fresh(seed);s.balance=100000;s.settings.volume=0;play(s,{buy:'overdrive'});
   while(s.round){s.pending=null;const r=play(s);if(r.added&&!r.end){recharge=structuredClone(s);break;}}
  }
  assert.ok(recharge,'a saved retrigger fixture exists');
  const page=await browser.newPage({viewport:{width:390,height:950},reducedMotion:'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),recharge);
  await page.goto(url+'/index.html');await page.locator('#continue').waitFor();await page.waitForTimeout(550);await page.locator('#continue').click();
  await page.locator('.scatter-gather[data-phase="synchronize"]').waitFor();
  assert.equal(await page.locator('#modal').isVisible(),false,'retrigger completes fusion before its explanation');
  await page.locator('.bonus-dialog[data-kind="retrigger"]').waitFor();
  assert.ok((await page.locator('.bonus-dialog-note').textContent()).includes(`×${recharge.pending.global}`),'retrigger explains the preserved multiplier');
  await page.screenshot({path:resolve(tmpdir(),'rift-recharge-390.png')});
  await page.evaluate(async()=>{const {countScreen}=await import('/app.js');countScreen('SYSTEM OVERLOAD',120,1,'',()=>{});});
  await page.waitForTimeout(700);
  assert.ok(await page.locator('.result-reactor').evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running')),'win screen has live reactor motion');
  await page.screenshot({path:resolve(tmpdir(),'rift-result-animated-390.png')});
  await page.locator('#countAmount').click();await page.waitForTimeout(550);
  assert.equal(await page.locator('#countLabel').textContent(),'GANHO CONFIRMADO');
  assert.ok(await page.locator('#continue').isVisible());
  await page.close();console.log('Verified animated retrigger fusion, preserved multiplier and dynamic win reactor');
 }
 await verifyInterface(browser,url,errors);
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
