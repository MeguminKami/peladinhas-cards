import {chromium} from '../../../tests/browser-sandbox.mjs';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.GANZA_SITE_URL||'http://127.0.0.1:8089';
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/casino');await page.locator('[data-casino-game="ganza"]').click();
 const element=page.locator('iframe[src*="/ganza/"]');await element.waitFor();const frame=await element.contentFrame();
 await frame.locator('#loading').waitFor({state:'hidden',timeout:30000});
 for(const[width,height]of[[1920,1080],[1366,768],[768,1024],[390,844],[320,740],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(800);
  const layout=await page.evaluate(()=>{const el=document.querySelector('iframe[src*="/ganza/"]'),b=el.getBoundingClientRect(),d=el.contentDocument,w=el.contentWindow;return{frame:{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom},outerOverflow:document.documentElement.scrollWidth>innerWidth+1,innerOverflow:d.documentElement.scrollWidth>w.innerWidth+1||d.documentElement.scrollHeight>w.innerHeight+1,controls:[...d.querySelectorAll('#controls button,#controls select,#bet,#drop')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,inside:r.left>=0&&r.top>=0&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1};}),fps:w.ganza.state.fps,boardFits:(()=>{const s=w.ganza.scene,g=s.layout();return g.top+(s.rows-1)*g.dy<g.boatY;})()};});
  if(layout.outerOverflow)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,15)));
  assert.equal(layout.boardFits,true,JSON.stringify({width,height,layout}));assert.equal(layout.outerOverflow,false,JSON.stringify({width,height,layout}));assert.equal(layout.innerOverflow,false,JSON.stringify({width,height,layout}));assert.ok(layout.controls.every(c=>c.inside),JSON.stringify(layout));assert.ok(layout.frame.bottom<=height+1,JSON.stringify(layout));
  await page.screenshot({path:`games/ganza/revisao/website-${width}.png`});results.push({width,height,...layout});
  if([1920,1366,390,320].includes(width))for(const risk of ['baixo','medio','alto','extremo']){await frame.locator(`[data-risk="${risk}"]`).click();await page.waitForTimeout(1400);await page.screenshot({path:`games/ganza/revisao/falesia/casino-${width}-${risk}.png`});}
 }
 await page.setViewportSize({width:390,height:844});
 await frame.locator('#drop').tap();await frame.locator('#rows').isDisabled().then(value=>assert.equal(value,true));
 await page.waitForFunction(()=>document.querySelector('iframe[src*="/ganza/"]').contentWindow.ganza.state.history.length===1);
 const proof=await frame.locator('#verify');await proof.click();await frame.locator('#checkProof').click();await frame.locator('#proofResult').filter({hasText:'conferem'}).waitFor();
 assert.deepEqual(errors,[]);writeFileSync('games/ganza/revisao/website-results.json',JSON.stringify({date:new Date().toISOString(),fixtures:true,results,roundAndProof:true,errors},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
