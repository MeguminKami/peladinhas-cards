import {chromium} from '../../../tests/browser-sandbox.mjs';
import {serve} from '../scripts/serve.js';
import {resolve} from 'node:path';import {mkdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../../..'),server=await serve(root,0),base=`http://127.0.0.1:${server.address().port}`,out=resolve(root,'games/ganza/revisao');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[],errors=[];
try{
 for(const [width,height,menu]of [[1920,1080,86],[1366,768,86],[390,844,70],[320,740,70]]){
  const context=await browser.newContext({viewport:{width,height:height-menu},serviceWorkers:'block'});await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/games/ganza/game.html`);await page.waitForFunction(()=>window.ganza?.scene.ready&&!document.querySelector('#loading:not([hidden])'));
  await page.locator('#drop').click();await page.waitForFunction(()=>window.ganza.state.air===1);assert.equal(await page.locator('#rows').isDisabled(),true);await page.waitForFunction(()=>window.ganza.state.history.length===1);await page.waitForTimeout(900);
  const layout=await page.evaluate(()=>({scrollX:document.documentElement.scrollWidth>innerWidth,scrollY:document.documentElement.scrollHeight>innerHeight,controls:[...document.querySelectorAll('#controls button,#controls select,#bet')].map(e=>({id:e.id,x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),proof:ganza.state.proof,webgl:ganza.state.webgl}));
  assert.equal(layout.scrollX,false);assert.equal(layout.scrollY,false);for(const c of layout.controls){assert.ok(c.x>=0&&c.y>=0&&c.x+c.w<=width+1&&c.y+c.h<=height-menu+1,JSON.stringify(c));}
  const landed=await page.evaluate(()=>{const s=ganza.scene,p=ganza.state.proof,hit=s.landings.find(r=>r.id===p.id),expected=s.point(p,p.rows);return hit&&hit.k===p.k&&Math.abs(hit.x-expected.x)<.01&&Math.abs(hit.y-expected.y)<.01;});assert.ok(landed,'Destino visual deve corresponder ao motor');
  await page.locator('#verify').click();await page.locator('#checkProof').click();await page.waitForFunction(()=>document.querySelector('#proofResult').textContent.includes('conferem'));await page.locator('#verifyDialog button').last().click();
  await page.screenshot({path:`${out}/jogo-${width}.png`});
  await page.evaluate(()=>{for(let i=0;i<10;i++)ganza.demo('lancha',i);});await page.waitForTimeout(1600);const perf=await page.evaluate(()=>({fps:ganza.state.fps,air:ganza.state.air,quality:ganza.state.quality}));
  await page.waitForFunction(()=>ganza.state.air===0);const allDestinations=await page.evaluate(()=>{const s=ganza.scene;return s.landings.slice(-10).every(p=>Math.abs(p.x-(s.layout().center+(p.k-8)*s.layout().step))<.01);});assert.ok(allDestinations);
  await page.evaluate(()=>ganza.demo('max'));await page.waitForFunction(()=>ganza.scene.result?.round.multiplier===10000);await page.locator('#skip').click();await page.waitForFunction(()=>!ganza.scene.result);
  results.push({width,height,menu,layout,tenPlates:perf,allDestinations,maxSkipped:true});await context.close();
 }
 const ctx=await browser.newContext({viewport:{width:1366,height:682},reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/games/ganza/game.html`);await page.waitForFunction(()=>ganza.scene.ready&&ganza.state.sessionId);
 assert.equal(await page.locator('#reduced').isChecked(),true);await page.locator('[data-rows="8"]').click();await page.locator('[data-risk="baixo"]').click();await page.locator('#auto').click();await page.fill('#stopLoss','1');await page.locator('#startAuto').click();await page.waitForFunction(()=>ganza.state.history.length>=1&&!ganza.state.auto,{},{timeout:60000});
 await page.locator('#drop').click();await page.waitForFunction(()=>ganza.state.air>0);await page.reload();await page.waitForFunction(()=>ganza.state.sessionId&&ganza.state.air>0);await page.waitForFunction(()=>ganza.state.history.length>0);results.push({reduced:true,autoplayStop:true,reloadRecovery:true});
 await ctx.close();assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-results.json`,JSON.stringify({date:new Date().toISOString(),results,errors},null,2));console.log(JSON.stringify(results.map(r=>({width:r.width,tenPlates:r.tenPlates,...r.reduced?{reduced:true,autoplayStop:true,reloadRecovery:true}:{}})),null,2));
}finally{await browser.close();server.close();}
