import {chromium} from '../../../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {VILLAINS} from '../enemies.mjs';
const origin='http://127.0.0.1:5178';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto(origin+'/art-gallery.html');
  await page.waitForFunction(()=>document.images.length===22&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.villain').count(),18);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===1440){for(const tier of [1,2,3])await page.locator(`#tier-${tier}`).screenshot({path:`reports/villains-tier-${tier}.png`});await page.locator('.backgrounds').screenshot({path:'reports/backgrounds-v2.png'});}
  await page.goto(origin+'/game.html');
  await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  for(const mode of ['easy','normal','hard','extreme']){
   if(width<=620)await page.locator('#training-open').click();
   await page.locator(`[data-mode=${mode}]`).click();
   if(width<=620)await page.locator('#training-close').click();
   await page.waitForFunction(mode=>{const b=JSON.parse(document.querySelector('canvas').dataset.camera||'{}').background;return b?.source.endsWith(`/gym-${mode}-v2.webp`)&&b.naturalWidth>0;},mode);
   const b=await page.locator('canvas').evaluate(el=>JSON.parse(el.dataset.camera).background);
   assert.equal(b.naturalWidth/b.naturalHeight,3);
   assert.ok(Math.abs(b.width/b.naturalWidth-b.height/b.naturalHeight)<1e-12,'single scale preserves image proportions');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`reports/art-${mode}-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await context.close();console.log(`22 assets, galeria e fundos sem deformacao: ${width}px OK`);
 }
 assert.equal(VILLAINS.length,18);
}finally{await browser.close();}
