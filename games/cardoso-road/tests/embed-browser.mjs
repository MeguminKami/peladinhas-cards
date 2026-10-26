import {chromium} from '../../../node_modules/playwright/index.mjs';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'}),origin='http://127.0.0.1:5178';
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
try{
 for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[320,740],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(0);return a;}}));
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('#play')?.disabled===false);
  const frame=page.frames().find(f=>f.url().endsWith('/game.html'));assert.ok(frame);
  assert.equal(await page.locator('body header,body nav').count(),0,'preview contains no website chrome');
  assert.equal(await frame.locator('.brand').count(),0,'game contains no duplicated website branding');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
  const metrics=await frame.evaluate(()=>{const g=document.querySelector('.game'),b=document.querySelector('#play').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:g.scrollHeight,client:g.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth,goBottom:b.bottom};});
  assert.equal(metrics.overflow,false);if(height>430)assert.ok(metrics.scroll<=metrics.client+1,JSON.stringify(metrics));
  await page.screenshot({path:fileURLToPath(new URL(`../reports/frame-${width}x${height}-initial.png`,import.meta.url)),fullPage:true});
  await frame.locator('#training-open').click();await frame.locator('#auto').selectOption('0');await frame.locator('#training-close').click();
  await frame.locator('#play').click();await frame.locator('#play').click();assert.equal(await frame.locator('#cashout').isEnabled(),true);await frame.locator('#cashout').click();assert.ok((await frame.locator('#speech').textContent()).includes('recebidos'));
  if(height>430)assert.ok((await frame.locator('#play').boundingBox()).height>=44);
  await page.screenshot({path:fileURLToPath(new URL(`../reports/frame-${width}x${height}.png`,import.meta.url)),fullPage:true});
  // Resize the actual host, without changing the outer browser window.
  if(width===1440){await page.locator('#preview').evaluate(el=>el.style.width='640px');await page.locator('iframe').evaluate(el=>el.style.height='540px');await page.waitForTimeout(100);assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('../reports/frame-640x540.png',import.meta.url)),fullPage:true});}
  if(width===390){await frame.locator('#play').click();for(let step=0;step<10;step++)await frame.locator('#play').click();await page.screenshot({path:fileURLToPath(new URL('../reports/frame-390-victory.png',import.meta.url)),fullPage:true});assert.equal(await frame.locator('#victory-result').isVisible(),true);}
  assert.deepEqual(errors,[]);await context.close();console.log(`Preview sem website, quadro e ações: ${width}×${height} OK`);
 }
}finally{await browser.close();}
