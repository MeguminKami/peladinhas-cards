import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin='http://127.0.0.1:4181';
const server=spawn(process.execPath,['scripts/serve.js','--port','4181'],{windowsHide:true,stdio:'pipe'});
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,30));}
 const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 browser=await chromium.launch({headless:true,...(existsSync(chromium.executablePath())?{}:{executablePath:edge})});
 const page=await browser.newPage({viewport:{width:1200,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/game.html?fixtures=1');await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
 assert.equal(await page.evaluate(()=>document.fonts.check('16px "Sofia Storybook"')),true);
 await page.evaluate(()=>{void window.sofiaFixture('multi');});
 await page.waitForSelector('#board .hit[data-symbol=N1]');
 assert.equal(await page.locator('#board .hit:not([data-symbol=N1])').count(),0);
 const amount=page.locator('.group-prize');await amount.waitFor();assert.match(await amount.innerText(),/^\d+[,.]\d{2}$/);
 assert.equal(await page.locator('#event-ribbon[data-kind=xp]:visible').count(),0);
 assert.ok(await amount.getAttribute('data-tier'));
 await page.screenshot({path:join(tmpdir(),'sofia-single-hit.png')});
 await page.evaluate(()=>{globalThis.firstHitNode=document.querySelector('#board .hit[data-symbol=N1]');});
 await page.waitForSelector('#board .hit[data-symbol=N2]');
 assert.ok(await page.evaluate(()=>globalThis.firstHitNode===document.querySelector('#board [data-symbol=N1]')),'Second hit preserves first hit DOM identity');
 assert.equal(await page.locator('#board .hit-presented[data-symbol=N1]').count(),5,'First hit keeps its settled highlight during second hit');
 assert.equal(await page.locator('#board .hit:not([data-symbol=N2])').count(),0);
 assert.equal(await page.locator('#board [data-symbol=N1]').count(),5,'First hit remains until all groups have been presented');
 assert.equal(await page.locator('#board [data-symbol=N2]').count(),5);
 await page.waitForSelector('.xp-dust',{state:'attached'});
 assert.equal(await page.locator('.xp-dust').count(),30,'All ten winners disintegrate together with three particles each');
 await page.screenshot({path:join(tmpdir(),'sofia-xp-dissolve.png')});
 await page.waitForFunction(()=>!document.querySelector('.xp-dust'));
 await page.locator('#spin').click();
 await page.waitForFunction(()=>document.querySelector('#spin-label').textContent==='Rodar');
 await page.locator('#buy-button').click();await page.locator('[data-buy=common]').click();
 await page.waitForSelector('.purchase-scatters');
 assert.equal(await page.locator('.purchase-flower').count(),3);
 assert.equal(await page.locator('#board .scatter').count(),0,'Purchase animation does not fabricate an engine trigger board');
 await page.waitForTimeout(600);
 await page.screenshot({path:join(tmpdir(),'sofia-purchase-scatters.png')});
 await page.waitForSelector('#notice-dialog[open]');
 assert.equal(await page.locator('#notice-kicker').innerText(),'12 SPINS GR\u00c1TIS');
 assert.equal(await page.locator('#notice-dialog [data-close]').innerText(),'Clica para continuar');
 assert.equal(await page.locator('.purchase-scatters').count(),0);
 const intro=await page.locator('#notice-dialog').evaluate(el=>{const art=el.querySelector('.notice-emblem').getBoundingClientRect(),r=el.getBoundingClientRect();return {border:getComputedStyle(el).borderTopWidth,inside:art.top>=r.top&&art.bottom<=r.bottom&&art.left>=r.left&&art.right<=r.right};});assert.equal(intro.border,'0px');assert.ok(intro.inside,'Bonus artwork fits without cropping');
 await page.screenshot({path:join(tmpdir(),'sofia-purchase-intro.png')});
 const variants=await page.evaluate(async()=>{
   const {purchaseScatters}=await import('./ui/motion.js');const {symbolAssets}=await import('./ui/symbols.js');
   const board=document.getElementById('board'),before=board.innerHTML,counts=[];
   for(const mode of ['common','super','secret']){const animation=purchaseScatters(board,mode,symbolAssets.S,{duration:50});counts.push(document.querySelectorAll('.purchase-flower').length);await animation;}
   return {counts,unchanged:before===board.innerHTML};
 });
 assert.deepEqual(variants,{counts:[3,4,5],unchanged:true});
 await page.goto(origin+'/game.html?fixtures=1');await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
 await page.evaluate(()=>{void window.sofiaFixture('magic');});
 await page.waitForSelector('#magic-upgrade:not([hidden])');
 assert.equal(await page.locator('#magic-upgrade .magic-wild-preview img').count(),1);
 const centred=await page.locator('#magic-upgrade').evaluate(el=>{const r=el.getBoundingClientRect(),b=document.querySelector('.board-frame').getBoundingClientRect();return Math.abs(r.y+r.height/2-b.y-b.height/2)<2&&Math.abs(r.x+r.width/2-b.x-b.width/2)<2;});assert.ok(centred,'Magic vignette is centred on board');
 assert.equal(await page.locator('.wild-dust,.wild-fairy,#board .placed').count(),0,'Explanation finishes before any wild placement');
 const explanationBoard=await page.locator('#board').innerHTML();await page.waitForTimeout(200);
 assert.equal(await page.locator('#board').innerHTML(),explanationBoard,'Board remains unchanged during explanation');
 await page.waitForSelector('.wild-fairy');
 assert.equal(await page.locator('#magic-upgrade').isVisible(),false,'Wild arrival starts after explanation closes');
 const visibleWilds=await page.locator('#board .cell.wild').evaluateAll(els=>els.filter(el=>getComputedStyle(el).visibility!=='hidden').length);
 assert.equal(visibleWilds,1,'Wilds arrive individually');
 assert.ok(await page.locator('#board .wild-identity').count()>0);
 await page.waitForTimeout(150);
 await page.screenshot({path:join(tmpdir(),'sofia-fairy-wild.png')});
 await page.goto(origin+'/game.html?fixtures=1');await page.waitForFunction(()=>!document.querySelector('#spin').disabled);
 await page.locator('#speed-button').click();await page.locator('#speed-button').click();
 
 await page.evaluate(()=>{
   const toast=document.getElementById('magic-upgrade');
   globalThis.magicTiming=[];
   new MutationObserver(()=>{
     if(!toast.hidden)globalThis.magicTiming.push({start:performance.now(),entrance:parseFloat(getComputedStyle(toast).animationDuration)*1000});
     else if(globalThis.magicTiming.length)globalThis.magicTiming.at(-1).elapsed=performance.now()-globalThis.magicTiming.at(-1).start;
   }).observe(toast,{attributes:true,attributeFilter:['hidden']});
 });
 await page.evaluate(()=>{void window.sofiaFixture('magic');});
 await page.waitForFunction(()=>globalThis.magicTiming.some(t=>t.elapsed));
 const ultraTiming=await page.evaluate(()=>globalThis.magicTiming.find(t=>t.elapsed));
 assert.ok(ultraTiming.entrance<=80,'Ultra entrance follows spin speed');
 assert.ok(ultraTiming.elapsed>=600&&ultraTiming.elapsed<1200,'Ultra explanation remains readable and follows its speed');
 assert.deepEqual(errors,[]);
 console.log('PASS: numeric-only hit receipts, sequential highlights with joint removal, no XP ribbon, local themed font, simulated purchase scatters isolated from engine, opaque intro backing.');
}finally{await browser?.close();server.kill();}
