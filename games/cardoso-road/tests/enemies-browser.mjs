import {chromium} from '../../../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {stageVillain,VILLAINS} from '../enemies.mjs';
const origin='http://127.0.0.1:5178',browser=await chromium.launch({headless:true,channel:'msedge'});
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
try{
 for(let step=0;step<10;step++){
  const width=step%2?390:1440,reduced=step%2===0,mode=['easy','normal','hard','extreme'][step%4];
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[],failedAssets=[];
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)failedAssets.push(r.url());});
  await page.addInitScript(({step,mode})=>{
   if(!localStorage.getItem('cardoso-road-demo-v1'))localStorage.setItem('cardoso-road-demo-v1',JSON.stringify({version:1,balance:99000,round:{id:`fixture-${step}`,bet:1000,mode,step,status:'active',payment:0,at:'2026-10-26T12:00:00Z'},history:[]}));
   Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(4294967295);return a;}});
  },{step,mode});
  await page.goto(origin+"/game.html");await page.waitForFunction(()=>!document.querySelector('#play')?.disabled);await page.waitForTimeout(900);
  const inspect=()=>page.locator('canvas').evaluate(el=>JSON.parse(el.dataset.camera));const before=await inspect(),expected=VILLAINS[stageVillain(step)];
  assert.equal(before.stageEnemies[step].id,expected.id);assert.equal(before.stageEnemies[step].drawn,true);
  await page.locator('#play').click();await page.waitForFunction(()=>!!JSON.parse(document.querySelector('canvas').dataset.camera).attacker);await page.waitForTimeout(reduced?30:650);
  let after=await inspect();assert.equal(after.attacker.id,expected.id);assert.equal(after.attacker.stage,step);assert.equal(after.stageEnemies[step].drawn,false,'failed stage must not leave a duplicate villain behind');
  assert.equal(await page.locator('#speech').textContent(),expected.line);assert.equal(await page.locator('#cashout').isDisabled(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')));let state=await snapshot();assert.equal(state.balance,99000);assert.equal(state.history.length,1);
  await page.screenshot({path:fileURLToPath(new URL(`../reports/enemy-${step}-${width}.png`,import.meta.url)),fullPage:true});
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#play')?.disabled);await page.waitForFunction(()=>!!JSON.parse(document.querySelector('canvas').dataset.camera).attacker);after=await inspect();assert.equal(after.attacker.id,expected.id);assert.equal(after.stageEnemies[step].drawn,false);assert.equal(await page.locator('#speech').textContent(),expected.line);state=await snapshot();assert.equal(state.history.length,1);
  assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);await context.close();console.log(`Etapa ${step+1}: ${expected.id}, derrota e recuperação ${width}px OK`);
 }
}finally{await browser.close();}
