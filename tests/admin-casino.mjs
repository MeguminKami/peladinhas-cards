import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from './browser-sandbox.mjs';
const origin='http://127.0.0.1:8097';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','8097'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('Fixture server failed')));});
const browser=await chromium.launch({headless:true,channel:'msedge'});
mkdirSync('test-results/admin-casino',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 await page.goto(origin+'/#/admin/players');
 const button=page.locator('[data-casino-grant]').first();await button.waitFor();
 const uid=await button.getAttribute('data-casino-grant');
 const reads=()=>page.evaluate(()=>(window.__casinoCalls||[]).filter(c=>c.name==='getCasinoPlayerBalance').length);
 assert.equal(await reads(),0,'Listing players fetched wallets');
 await page.evaluate(uid=>window.__casinoPlayerBalances={[uid]:1234567},uid);
 await button.click();
 await page.locator('[data-grant-balance][aria-busy="false"]').waitFor();
 assert.equal((await page.locator('[data-grant-balance]').innerText()).replace(/\s/g,''),'12345,67');
 assert.equal(await reads(),1);
 await page.locator('#casino-grant-amount').fill('50');await page.waitForTimeout(150);
 assert.equal(await reads(),1,'Typing fetched the wallet again');
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.screenshot({path:`test-results/admin-casino/balance-${width}.png`});
 }
 await page.locator('.casino-grant button[type="submit"]').click();
 await page.locator('.casino-grant').waitFor({state:'detached'});
 assert.equal(await reads(),1,'Sending fetched the balance again');
 await button.click();await page.locator('[data-grant-balance][aria-busy="false"]').waitFor();
 assert.equal(await reads(),2,'Reopening did not fetch a fresh balance');
 assert.equal((await page.locator('[data-grant-balance]').innerText()).replace(/\s/g,''),'12395,67');
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.__casinoFail=true;});
 await button.click();await page.locator('[data-grant-balance][aria-busy="false"]').waitFor();
 assert.equal(await page.locator('[data-grant-balance]').innerText(),'Indisponível');
 assert.equal(await page.locator('#casino-grant-amount').isEnabled(),true);
 await page.waitForTimeout(150);assert.equal(await reads(),3,'Failed read retried automatically');
 assert.deepEqual(errors,[]);
 console.log('Admin moedas: zero reads on list, one per popup, none on typing/sending, fresh reopen, error and four widths.');
}finally{await browser.close();server.kill();}
