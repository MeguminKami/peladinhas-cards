import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {artAssets} from '../ui/symbols.js';
const port=4179,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve.js','--port',String(port)],{windowsHide:true,stdio:'pipe'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,30));}
 // Arte publicada em WebP (muito mais leve que os PNG originais, que ficam em ui/art como fonte).
 for(const asset of artAssets){const buffer=readFileSync(new URL('../'+asset,import.meta.url));assert.equal(buffer.toString('ascii',0,4)+buffer.toString('ascii',8,12),'RIFFWEBP',`${asset} must be WebP`);if(!asset.endsWith('scene.webp'))assert.ok(buffer.toString('ascii',12,16)==='VP8L'||(buffer.toString('ascii',12,16)==='VP8X'&&(buffer[20]&0x10)),`${asset} must include alpha`);}
 const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 browser=await chromium.launch({headless:true,...(existsSync(chromium.executablePath())?{}:{executablePath:edge})});
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.route('**/*',route=>{assert.ok(route.request().url().startsWith(origin),'Only local assets');return route.continue();});
 async function ready(){await page.goto(origin+'/game.html?fixtures=1');await page.waitForFunction(()=>!document.querySelector('#spin').disabled);}
 for(const size of [{width:1440,height:740},{width:1024,height:600},{width:390,height:568},{width:640,height:240}]){
  await page.setViewportSize(size);await page.goto(origin);
  const game=page.frameLocator('iframe');await game.locator('#spin:not(:disabled)').waitFor();
  const hostBounds=await page.locator('iframe').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),height:innerHeight,width:innerWidth,scrollHeight:document.documentElement.scrollHeight}));
  assert.ok(hostBounds.rect.bottom<=hostBounds.height+1&&hostBounds.rect.right<=hostBounds.width+1&&hostBounds.scrollHeight<=hostBounds.height+1,`Host sizes iframe to visible viewport: ${JSON.stringify(hostBounds)}`);
  assert.ok(await game.locator('.control-deck').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1;}),'All controls remain in visible iframe');
 }
 for(const size of [{width:1400,height:900},{width:390,height:844},{width:320,height:568},{width:640,height:240},{width:844,height:390}]){
  await page.setViewportSize(size);await ready();
  assert.ok(await page.locator('.symbol-art').evaluateAll(els=>els.every(el=>el.complete&&el.naturalWidth>0)));
  if(size.width===1400||size.width===390)await page.screenshot({path:join(tmpdir(),`sofia-colors-${size.width}.png`)});
  for(const id of ['rules','buy']){
   await page.locator(`#${id}-button`).click();
   await page.waitForFunction(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert.ok(await page.locator(`#${id}-dialog`).evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1;}),`${id} menu fits ${size.width}x${size.height}`);
   if(id==='rules')for(const tab of ['wilds','bonus','pay','play']){await page.locator(`[data-rule=${tab}]`).click();await page.waitForFunction(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await page.locator('#rules-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1;}));}
   await page.keyboard.press('Escape');
  }
 }
 for(const mode of ['common','super','secret']){
  await page.setViewportSize({width:390,height:844});await ready();
  await page.locator('#speed-button').click();await page.locator('#speed-button').click();
  await page.evaluate(name=>{void window.sofiaFixture(name);},mode);
  await page.waitForSelector('#notice-dialog[open]');
  await page.waitForFunction(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:join(tmpdir(),`sofia-bonus-${mode}-art.png`)});
  assert.equal(await page.locator('#notice-dialog').getAttribute('data-mode'),mode);
  assert.ok(await page.evaluate(()=>{const rect=id=>document.getElementById(id).getBoundingClientRect();return document.querySelector('.magic-panel').getBoundingClientRect().bottom<=rect('bonus-panel').top+1&&rect('bonus-panel').bottom<=rect('buy-button').top+1&&rect('buy-button').bottom<=document.querySelector('.control-deck').getBoundingClientRect().top+1;}),'Bonus sidebar indicators and actions must not overlap');
  const bounds=await page.locator('#notice-dialog').evaluate(el=>({notice:el.getBoundingClientRect().toJSON(),board:document.querySelector('.board-frame').getBoundingClientRect().toJSON(),background:getComputedStyle(el).backgroundColor}));
  assert.ok(bounds.background==='rgba(0, 0, 0, 0)'&&bounds.notice.left>=bounds.board.left-1&&bounds.notice.right<=bounds.board.right+1&&bounds.notice.top>=bounds.board.top-1&&bounds.notice.bottom<=bounds.board.bottom+1,`PNG presentation stays over board: ${JSON.stringify(bounds)}`);
  await page.screenshot({path:join(tmpdir(),`sofia-bonus-${mode}-art.png`)});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await ready();
 assert.equal(await page.locator('#xp-fill').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);
 console.log('PASS: all PNG assets and alpha, menus and five rule tabs without scroll at five sizes, all three natural bonus PNG presentations, reduced motion, local requests only.');
}finally{await browser?.close();server.kill();}
