import {chromium} from '../../../node_modules/playwright/index.mjs';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'}),origin='http://127.0.0.1:5178';
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
try{for(const width of [1440,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await context.addInitScript(()=>{localStorage.setItem('cardoso-road-demo-v1-settings',JSON.stringify({effects:false,music:false,voices:false,reduced:false}));Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(window.failNext?4294967295:0);return a;}});});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('#play')?.disabled===false);
 const frame=page.frames().find(f=>f.url().endsWith('/game.html')),inspect=async()=>{await frame.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.camera);return frame.locator('canvas').evaluate(el=>JSON.parse(el.dataset.camera));};
 let pose=await inspect();assert.equal(pose.position,0);assert.ok(Math.abs(pose.firstPrizeX-pose.playerX-pose.lane)<1e-6);
 await page.screenshot({path:fileURLToPath(new URL(`../reports/start-${width}.png`,import.meta.url)),fullPage:true});
 await frame.locator('#play').click();pose=await inspect();assert.equal(pose.position,0,'starting the round must stay in the safe area');
 await frame.locator('#play').click();await frame.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='travel');pose=await inspect();assert.ok(pose.position<1);assert.equal(pose.attacker,null);assert.equal(pose.stageEnemies[0].drawn,true,'opponent stays on the destination while Cardoso approaches');
 await frame.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='fight');pose=await inspect();assert.equal(pose.position,1);assert.equal(pose.fightStage,0);assert.ok(Math.abs(pose.playerX-pose.currentPrizeX)<1e-6);assert.equal(await frame.locator('#cashout').isEnabled(),true,'animation never blocks cashout');
 await frame.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='idle');
 await frame.evaluate(()=>window.failNext=true);await frame.locator('#play').click();await frame.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='travel');
 await frame.waitForFunction(()=>!!JSON.parse(document.querySelector('canvas').dataset.camera).attacker);pose=await inspect();assert.equal(pose.position,2);assert.equal(pose.fightStage,1);assert.equal(pose.attacker.id,'cake');assert.ok(Math.abs(pose.playerX-pose.currentPrizeX-pose.lane)<1e-6);
 await page.screenshot({path:fileURLToPath(new URL(`../reports/fight-${width}.png`,import.meta.url)),fullPage:true});
 await frame.goto(frame.url());await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('#play')?.disabled===false);pose=await inspect();assert.equal(pose.position,2);assert.equal(pose.attacker.id,'cake');
 await frame.locator('#play').click();pose=await inspect();assert.equal(pose.position,0,'new round returns directly to the safe area');assert.ok(pose.firstPrizeX>pose.playerX);
 await frame.evaluate(()=>window.failNext=false);await frame.locator('#play').click();await frame.locator('#cashout').click();assert.equal(await frame.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')).round.status),'paid');
 await frame.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.camera).phase==='fight');pose=await inspect();assert.equal(pose.position,1);assert.equal(pose.fightStage,0,'cashout keeps the already-confirmed encounter visible');
 assert.deepEqual(errors,[]);await context.close();console.log(`Partida anterior ao valor, deslocação e combate no destino: ${width}px OK`);
}}finally{await browser.close();}
