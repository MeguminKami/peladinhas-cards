// Real engine scenarios; presentation and reading controls only. No cloud.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {startServer} from '../scripts/serve.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch(process.argv.includes('--edge')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
const errors=[],results=[];await mkdir('test-results',{recursive:true});
async function pageFor(w=1280,h=800){
  const p=await browser.newPage({viewport:{width:w,height:h}});
  await p.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.addInitScript(()=>localStorage.setItem('pp-movimento-reduzido','1'));
  await p.goto(base+'/game.html');await p.waitForFunction(()=>window.pp?.estado==='PRONTO');return p;
}
async function fits(p){
  assert.ok(await p.locator('#overlay').evaluate(d=>{const r=d.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&d.scrollWidth<=d.clientWidth+1;}),'dialog cabe sem corte horizontal');
  await p.locator('#overlay-continue').scrollIntoViewIfNeeded();assert.ok(await p.locator('#overlay-continue').isVisible());
}
try{
  const ids=await(await pageFor()).evaluate(()=>window.pp.config.fusions.map(f=>f.id));
  // Close the discovery page; each scenario below is isolated.
  for(const p of browser.contexts().flatMap(c=>c.pages()))await p.close();
  for(const id of ids){
    const p=await pageFor();
    await p.evaluate(id=>{window.__events=0;window.pp.on('evento',()=>window.__events++);window.pp.runScenario('fusao:'+id);},id);
    await p.waitForFunction(()=>document.querySelector('#overlay').open&&document.querySelector('#overlay').dataset.kind==='fusion',null,{timeout:30000});
    const copy=await p.locator('.fusion-explanation').textContent();assert.ok(copy.length>100&&!copy.includes('undefined'));
    assert.equal(await p.locator('.briefing-cards figure img').count(),2);
    await fits(p);
    const events=await p.evaluate(()=>window.__events);await p.waitForTimeout(750);
    assert.equal(await p.evaluate(()=>window.__events),events,'efeito aguarda leitura');assert.ok(await p.locator('#overlay').evaluate(d=>d.open));
    if(id==='FROZEN_REALITY')await p.screenshot({path:'test-results/briefing-fusion-desktop.png'});
    await p.click('#overlay-continue');await p.waitForFunction(events=>window.__events>events,events);
    results.push({fusion:id,images:2,reading:'manual; no timeout',continued:true});await p.close();console.log('ok fusion',id);
  }
  for(const [w,h,id] of [[1280,800,'vip'],[390,844,'vip'],[844,390,'vip'],[320,640,'vip'],[390,844,'afterparty'],[390,844,'police']]){
    const p=await pageFor(w,h);
    await p.evaluate(async id=>{const {scenario}=await import('/src/index.js');const result=scenario('bonus:'+id);window.__awake=result.steps[0].events[0].awake||[];window.pp.runScenario('bonus:'+id);},id);
    await p.waitForFunction(()=>document.querySelector('#overlay').open&&document.querySelector('#overlay').dataset.kind==='bonus');
    assert.deepEqual(await p.locator('.briefing-cards figure').evaluateAll(cs=>cs.map(c=>c.dataset.persona)),await p.evaluate(()=>window.__awake));
    assert.equal(await p.locator('.briefing-cards figure img').count(),await p.evaluate(()=>window.__awake.length));
    await fits(p);await p.screenshot({path:`test-results/briefing-bonus-${id}-${w}.png`});
    results.push({bonus:id,viewport:[w,h],activeImages:await p.evaluate(()=>window.__awake.length)});await p.close();
  }
  const p=await pageFor();await p.evaluate(()=>{window.__gate=0;window.pp.on('gate',()=>window.__gate++);window.pp.setStepMode(true);window.pp.runScenario('joiner');});
  await p.waitForFunction(()=>window.__gate>0);
  for(let i=0;i<80;i++){
    if(await p.locator('.cell[data-sym=DW]').count())break;
    const before=await p.evaluate(()=>window.__gate);await p.evaluate(()=>window.pp.advance());await p.waitForFunction(n=>window.__gate>n,before);
  }
  assert.ok(await p.locator('.cell[data-sym=DW]').count());
  for(const [w,h]of [[1280,800],[390,844],[844,390],[320,640]]){
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(250);
    const tile=p.locator('.cell[data-sym=DW]').first();assert.match(await tile.getAttribute('aria-label'),/Joiner/);
    assert.match(await tile.locator('.sym img').getAttribute('src'),/sym-dw-r2.webp/);assert.ok(await tile.locator('.name').isVisible());
    assert.match(await tile.locator('.name').textContent(),/JOINER/);assert.match(await tile.locator('.mult').textContent(),/×\d+/);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1));
    await p.screenshot({path:`test-results/briefing-joiner-${w}.png`});
  }
  await p.close();assert.deepEqual(errors,[]);await writeFile('test-results/briefing-review.json',JSON.stringify({results,errors},null,2));console.log('ok bonus cards, Joiner identity/WILD/multiplier, four layouts; zero errors');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
