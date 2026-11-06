import {chromium} from '../../../tests/browser-sandbox.mjs';
import {serve} from './serve.js';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'games/ganza/revisao/falesia'),phase=process.argv[2]||'antes';mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
try{const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const[width,height]of[[1920,1080],[1366,768],[390,844],[320,740]]){await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:${server.address().port}/games/ganza/game.html`);await page.waitForFunction(()=>ganza.scene.ready&&ganza.state.sessionId);for(const risk of ['baixo','medio','alto','extremo']){await page.locator(`[data-risk="${risk}"]`).click();await page.waitForTimeout(1500);await page.mouse.move(0,0);await page.screenshot({path:`${out}/${phase}-${width}-${risk}.png`});results.push({width,height,risk,fps:await page.evaluate(()=>ganza.state.fps)});}}
 if(phase==='depois'){
  for(const rows of [8,12,16])for(const risk of ['baixo','medio','alto','extremo']){
   await page.locator(`[data-rows="${rows}"]`).click();await page.locator(`[data-risk="${risk}"]`).click();await page.waitForTimeout(1350);
   const state=await page.evaluate(()=>{const s=ganza.scene,g=s.layout();return{rows:s.rows,boats:document.querySelectorAll('.boat').length,geometry:[g.center,g.span,g.top,g.boatY],labels:[...document.querySelectorAll('.boat b')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};}),overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};});
   assert.equal(state.boats,rows+1);assert.equal(state.overflow,false);assert.ok(state.labels.every(b=>b.x>=-1&&b.right<=320+1&&b.bottom<=740));assert.ok(state.labels.every(b=>Math.abs(b.y-state.labels[0].y)<1));results.push({matrix:true,risk,...state});
  }
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await reduced.newPage();await reduced.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto(`http://127.0.0.1:${server.address().port}/games/ganza/game.html`);await p.waitForFunction(()=>ganza.scene.ready);assert.ok(await p.evaluate(()=>ganza.scene.reduced));await p.locator('[data-risk=medio]').click();await p.waitForTimeout(1400);await p.screenshot({path:`${out}/reduced-390.png`});await reduced.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/${phase}-results.json`,JSON.stringify({results,errors},null,2));console.log(`${phase}: 16 capturas guardadas, sem erros de consola.`);
}finally{await browser.close();server.close();}
