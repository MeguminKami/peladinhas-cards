import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fresh,play,purchasePrice} from '../engine.js';

export async function verifyInterface(browser,url,errors){
 const checkSheet=async(page,name)=>{
  const size=await page.locator('#modalContent').evaluate(el=>{
   const r=el.getBoundingClientRect();return {scroll:el.scrollHeight>el.clientHeight+1,horizontal:el.scrollWidth>el.clientWidth+1,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};
  });
  await page.locator('#modalContent #continue,#modalContent .close').first().scrollIntoViewIfNeeded();
  assert.equal(size.horizontal,false,`${name}: horizontal overflow ${JSON.stringify(size)}`);
  assert.ok(size.top>=4&&size.bottom<=size.height-4&&size.left>=4&&size.right<=size.width-4,`${name}: outside viewport ${JSON.stringify(size)}`);
 };
 for(const [width,height] of [[1440,900],[1024,640],[768,720],[390,720],[320,640],[844,390],[320,480]]){
  const shortPortrait=width<=750&&height<560;
  const page=await browser.newPage({viewport:{width,height:shortPortrait?640:height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  const state=fresh(1444);state.balance=12345678.90;state.bet=.2;
  await page.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),state);
  await page.goto(url+'/index.html?fit');await page.locator('#board .tile').first().waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  assert.equal(await page.locator('#modal').isVisible(),false);
  const positions=()=>page.locator('footer').evaluate(el=>[...el.children].map(child=>{const r=child.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  assert.equal(await page.locator('#bonusGain').isHidden(),true,'base game has no bonus readout');
  if(width===390||width===1440)await page.screenshot({path:resolve(tmpdir(),`rift-base-${width}.png`)});
  const before=await positions();
  for(const expected of [2,3,1]){
   await page.locator('#speed').click();assert.equal(await page.locator('#speed i.on').count(),expected);
   const after=await positions();assert.deepEqual(after,before,'speed does not displace adjacent controls');
  }
  const alignment=await page.evaluate(()=>['.balance','.winnings'].map(selector=>{
   const e=document.querySelector(selector),label=e.querySelector('label').getBoundingClientRect(),value=e.querySelector('strong').getBoundingClientRect();
   return {label:label.top,value:value.top};
  }));
  assert.ok(Math.abs(alignment[0].label-alignment[1].label)<1);
  assert.ok(Math.abs(alignment[0].value-alignment[1].value)<1);
  await page.locator('#buyBonus').click();
  if(shortPortrait){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(requestAnimationFrame));}
  await checkSheet(page,'catalog');
  assert.equal(await page.locator('.bonus-offer').count(),3);
  assert.deepEqual(await page.locator('.bonus-offer-count b').allTextContents(),['3','4','5']);
  if(width===390||width===1440)await page.screenshot({path:resolve(tmpdir(),`rift-shop-${width}.png`)});
  await page.locator('#buy-overdrive').click();await checkSheet(page,'purchase');
  assert.ok((await page.locator('.bonus-dialog-price').innerText()).includes(new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(purchasePrice('overdrive',.2))));
  if(width===390||width===1440)await page.screenshot({path:resolve(tmpdir(),`rift-confirm-${width}.png`)});
  for(const mode of ['core','rift','overdrive']){
   await page.evaluate(async mode=>{
    const {bonusSheet}=await import('/interface.js');
    document.querySelector('#modalContent').innerHTML=bonusSheet({intro:mode,awarded:mode==='overdrive'?14:mode==='rift'?10:8},true);
    document.querySelector('#modal').dataset.mode=mode;
   },mode);
   await checkSheet(page,mode+' intro');
  }
  if(width===390||width===1440)await page.screenshot({path:resolve(tmpdir(),`rift-intro-${width}.png`)});
  await page.evaluate(async()=>{const {countScreen}=await import('/app.js');countScreen('CRITICAL OVERDRIVE',2500000,100,'14 FREE SPINS JOGADOS',()=>{});});
  await page.locator('#continue').waitFor({state:'visible'});
  await checkSheet(page,'bonus summary');
  if(width===390||width===1440)await page.screenshot({path:resolve(tmpdir(),`rift-result-${width}.png`)});
  await page.evaluate(()=>document.querySelector('#modal').hidden=true);
  if(width===390||width===1440||width===844){
   await page.evaluate(async()=>{
    const app=await import('/app.js'),before=app.sessionSnapshot().grid,grid=structuredClone(before);
    const targets=before[0].flatMap((t,r)=>t.s!==11?[{c:0,r}]:[]);for(const p of targets)grid[p.c][p.r].s=10;
    window.testPower=app.renderer.power({name:'MEGA WILD DROP',before,grid,targets,dest:10});
   });
   await page.locator('#powerBanner.power-readable').waitFor();
   const bounds=await page.locator('#powerBanner').evaluate(el=>{const r=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,pLeft:parent.left,pRight:parent.right};});
   assert.ok(bounds.width<=431&&bounds.height<=90&&bounds.left>=bounds.pLeft&&bounds.right<=bounds.pRight,JSON.stringify(bounds));
   if(width===390)await page.screenshot({path:resolve(tmpdir(),'rift-power-390.png')});
   await page.evaluate(()=>window.testPower);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();console.log(`Verified fitted UI, fixed speed width and accessible bonus sheets at ${width}x${height}`);
  if(width===390||width===1440){
   const bonus=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   bonus.on('pageerror',e=>errors.push(e.message));
   await bonus.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
   const saved=fresh(2468);play(saved,{buy:'overdrive'});saved.pending=null;saved.round.total=12345.67;saved.round.global=100;saved.balance=67890.12;
   await bonus.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),saved);
   await bonus.goto(url+'/index.html?fit');await bonus.locator('#continue').waitFor();
   assert.equal(await bonus.locator('#bonusWinLabel').innerText(),'GANHO DO BÓNUS');
   assert.equal((await bonus.locator('#bonusWin').innerText()).replace(/\s/g,' '),'12 345,67');
   assert.equal(await bonus.locator('#global').innerText(),'×100');
   await bonus.evaluate(async()=>{document.querySelector('#modal').hidden=true;await document.fonts.ready;});
   for(const value of ['10 / 10','10 / 14','40 / 40']){
    const counter=await bonus.locator('#fs').evaluate((el,value)=>{
     el.textContent=value;const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();
     return {lines:range.getClientRects().length,left:text.left,right:text.right,boxLeft:box.left,boxRight:box.right};
    },value);
    assert.equal(counter.lines,1,`FS ${value} stays on one line at ${width}px`);
    assert.ok(counter.left>=counter.boxLeft-1&&counter.right<=counter.boxRight+1,`FS ${value} fits at ${width}px`);
   }
   const bounds=await bonus.locator('#global').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return {number:right(range.getBoundingClientRect()),art:el.parentElement.querySelector('.core-art').getBoundingClientRect().left};function right(r){return r.right;}});
   assert.ok(bounds.number<=bounds.art,'multiplier does not overlap its illustration');
   await bonus.screenshot({path:resolve(tmpdir(),`rift-hud-${width}.png`)});
   await bonus.close();
  }
 }
 // A saved normal spin must never switch on the two-row bonus layout,
 // including the initial HUD update before recovery supplies a record.
 const normalState=fresh(54);normalState.settings.volume=0;play(normalState);
 const normal=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await normal.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 await normal.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),normalState);
 await normal.goto(url+'/index.html?fit');await normal.locator('#continue').waitFor();
 assert.equal(await normal.locator('#bonusGain').isHidden(),true,'pending base spin stays compact');
 await normal.waitForTimeout(550);await normal.locator('#continue').click();
 await normal.waitForTimeout(700);
 assert.equal(await normal.locator('#bonusGain').isHidden(),true,'completed base spin stays compact');
 await normal.locator('#speed').click();
 assert.equal(await normal.locator('#bonusGain').isHidden(),true,'HUD refresh stays compact');
 await normal.close();

 // A purchased/natural trigger is still a BASE presentation even though the future round exists.
 for(const width of [390,1024,1440]){
  const s=fresh(2441);s.bet=.1;s.balance=10000;play(s,{buy:'core'});s.settings.reduced=true;s.settings.volume=0;
  assert.equal(s.pending.mode,'base');assert.equal(s.round.mode,'core');
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),s);
  await page.goto(url+'/index.html?fit');await page.locator('#continue').waitFor();
  assert.equal(await page.locator('#bonusGain').isHidden(),true,'future bonus cannot expand the pending base HUD');
  await page.evaluate(()=>document.querySelector('#modal').hidden=true);
  assert.equal(await page.locator('footer').evaluate(el=>getComputedStyle(el).flexWrap),'nowrap');
  await page.locator('footer').screenshot({path:resolve(tmpdir(),`rift-normal-bar-${width}.png`)});
  await page.close();
 }
 const summaryState=fresh(313);summaryState.settings.reduced=true;summaryState.settings.volume=0;summaryState.bet=.1;
 play(summaryState,{buy:'overdrive'});
 while(summaryState.round){summaryState.pending=null;play(summaryState);}
 summaryState.pending.stage='summary';
 const format=n=>new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 const held=Math.round((summaryState.balance-summaryState.pending.roundTotal)*100)/100;
 const page=await browser.newPage({viewport:{width:390,height:720},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
 await page.addInitScript(state=>localStorage.setItem('rift-core-v1',JSON.stringify(state)),summaryState);
 await page.goto(url+'/index.html?fit');await page.locator('#continue').waitFor();
 await page.waitForTimeout(550);await page.locator('#continue').click();
 await page.locator('#continue').waitFor({state:'visible'});await page.waitForTimeout(550);
 assert.equal(await page.locator('#balance').textContent(),format(held),'bonus winnings stay out of the displayed balance until Continue');
 assert.equal(await page.locator('#bonusWin').textContent(),format(summaryState.pending.roundTotal));
 await page.locator('#continue').click();
 assert.equal(await page.locator('#balance').textContent(),format(summaryState.balance),'Continue releases the already settled winnings');
 assert.equal(await page.locator('#bonusGain').isHidden(),true);
 await page.close();console.log('Verified held bonus balance and release after final Continue');
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:800},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.goto(url+'/index.html?fit');await page.locator('#board .tile').first().waitFor();
  const message=await page.evaluate(async()=>{
   const {createRenderer}=await import('/renderer.js');const {evaluate,allocateWinCents}=await import('/engine.js');
   const grid=Array.from({length:6},(_,c)=>Array.from({length:5},(_,r)=>({id:`fixture-${c}-${r}`,s:c<3&&r<3?0:11})));
   let text='';const renderer=createRenderer({board:document.querySelector('#board'),settings:()=>({reduced:true,speed:4}),sound:()=>{},mode:()=> 'core',status:(line,value)=>{document.querySelector('#status').textContent=line;document.querySelector('#payExplanation').textContent=value;text=line+' '+value;}});
   renderer.draw(grid);const result=evaluate(grid);
   await renderer.presentWin({grid,...result,wins:allocateWinCents(result.wins,327),bet:.1,cm:1,gm:11},n=>n.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}),()=>{});
   return text;
  });
  assert.equal(await page.locator('.cascade').isVisible(),false,'new rounds hide the removed cascade multiplier');assert.ok(message.includes('27 WAYS'));assert.ok(message.includes('3,27'));assert.ok(!message.includes('CASCADE'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(tmpdir(),`rift-ways-27-${width}.png`)});
  await page.close();
 }
 console.log('Verified displayed 27-way x11 payment and no cascade multiplier at 320/390/768/1440');

}

