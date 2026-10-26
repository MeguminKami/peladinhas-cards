import {chromium} from '../../../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {payout} from '../engine.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'});await mkdir(new URL('../reports/',import.meta.url),{recursive:true});
const origin='http://127.0.0.1:5178';
async function setup(width,{reduced=true,lose=false}={}){const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:reduced?'reduce':'no-preference'});await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());await context.addInitScript(({lose})=>{Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(lose?4294967295:0);return a;}});},{lose});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+"/game.html");await page.waitForFunction(()=>document.querySelector('#play')&&!document.querySelector('#play').disabled);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!!document.querySelector('canvas').dataset.camera);return {context,page,errors};}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')));
const camera=page=>page.locator('canvas').evaluate(el=>JSON.parse(el.dataset.camera));
async function shot(page,name){await page.screenshot({path:fileURLToPath(new URL(`../reports/${name}.png`,import.meta.url)),fullPage:true});}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must not overflow');}
try{
 for(const width of [1440,768,390,320]){
  const {context,page,errors}=await setup(width);await page.waitForTimeout(350);await noOverflow(page);await shot(page,`${width}`);
  const initial=await camera(page);assert.equal(initial.visibleStages,4);assert.equal(initial.sofiaVisible,false);assert.ok(initial.playerHeight>250);
  if(width>=1100){const a=await page.locator('.console').boundingBox();assert.ok(a.height<130);}
  if(!await page.locator('.round-strip [data-panel=rules]').isVisible())await page.locator('#training-open').click();await page.getByRole('button',{name:'Regras e probabilidades'}).click();await page.locator('#panel').waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.locator('#training-open').click();await page.locator('#auto').selectOption('0');await noOverflow(page);await page.locator('#training-close').click();
  await page.locator('#play').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');assert.equal(await page.locator('#play').evaluate(el=>el.matches(':focus-visible')),true);await page.keyboard.press('Enter');assert.equal(await page.locator('#cashout').isDisabled(),true);assert.equal(await page.locator('[data-mode=hard]').isDisabled(),true);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#play').disabled);assert.ok((await page.locator('#play').getAttribute('aria-label')).includes('Avançar'));
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#markers').getAttribute('aria-valuenow')==='1');await page.waitForTimeout(60);assert.equal(await page.locator('#cashout').isEnabled(),true);
  const shifted=await camera(page),canvasWidth=(await page.locator('canvas').boundingBox()).width;assert.ok(shifted.camera>0);assert.ok(Math.abs(shifted.playerX/canvasWidth-.3)<.02);await shot(page,`${width}-step`);
  await page.locator('#cashout').click();const s=await saved(page);assert.equal(s.round.payment,payout(1000,'normal',1));assert.equal(s.history.length,1);assert.equal(s.round.status,'paid');assert.ok((await page.locator('#speech').textContent()).includes('créditos recebidos'));await shot(page,`${width}-cashout`);
  assert.deepEqual(errors,[]);await context.close();console.log(`Layout, teclado, opções, recuperação e cashout: ${width}px OK`);
 }
 for(const mode of ['easy','normal','hard','extreme']){
  const {context,page,errors}=await setup(1440,{reduced:false});await page.locator(`button[data-mode=${mode}]`).click();await page.locator('#play').click();for(let i=0;i<10;i++)await page.locator('#play').click();await page.waitForTimeout(1700);const s=await saved(page);assert.equal(s.round.status,'won');assert.equal(s.round.payment,payout(1000,mode,10));assert.equal(s.history.length,1);assert.equal(await page.locator('#panel').isVisible(),false,'celebration must remain visible');assert.equal((await camera(page)).sofiaVisible,true);await shot(page,`${mode}-victory`);await page.locator('#victory-result').click();assert.ok((await page.locator('#panel-body').textContent()).includes('100% AMOR'));await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await context.close();console.log(`10 etapas e vitória com câmara animada: ${mode} OK`);
 }
 {
  const {context,page,errors}=await setup(390,{lose:true});await page.locator('#play').click();await page.locator('#play').click();const s=await saved(page);assert.equal(s.round.status,'lost');assert.equal(s.balance,99000);assert.equal(await page.locator('#cashout').isDisabled(),true);await shot(page,'390-loss');assert.deepEqual(errors,[]);await context.close();
 }
 {
  const {context,page,errors}=await setup(390);await page.locator('#play').click();for(let i=0;i<10;i++)await page.locator('#play').click();await page.waitForTimeout(100);await noOverflow(page);await shot(page,'390-victory');assert.equal((await camera(page)).sofiaVisible,true);assert.deepEqual(errors,[]);await context.close();
 }
 {
  const {context,page,errors}=await setup(390);await page.locator('#training-open').click();await page.locator('#auto').selectOption('2');await page.locator('#training-close').click();await page.locator('#play').click();await page.locator('#play').click();await page.locator('#play').click();const s=await saved(page);assert.equal(s.round.status,'paid');assert.equal(s.round.step,2);assert.deepEqual(errors,[]);await context.close();
 }
 {
  const {context,page,errors}=await setup(768);await page.locator('#training-open').click();await page.getByRole('button',{name:'Áudio e imagem'}).click();await page.locator('#music').check();await page.locator('#effects').uncheck();await page.locator('#voices').check();await page.locator('#reduced').uncheck();await page.locator('#volume').evaluate(el=>{el.value='0.15';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(400);await page.keyboard.press('Escape');await page.locator('#play').click();await page.locator('#play').click();assert.equal(await page.locator('#cashout').isEnabled(),true);await page.locator('#cashout').click();assert.equal((await saved(page)).round.status,'paid');assert.deepEqual(errors,[]);await context.close();console.log('Controlos independentes de música, efeitos, voz e movimento OK');
 }
}finally{await browser.close();}
