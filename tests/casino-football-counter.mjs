import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from './browser-sandbox.mjs';
import {createSession,execute} from '../games/futebol/src/session.ts';
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
mkdirSync('test-results',{recursive:true});
try{
 for(const played of [0,1,4,8,9]){
  let snapshot;
  for(let seed=0;seed<100;seed++){
   let s=execute(createSession('counter-'+seed),{type:'start',mode:'superior'},'buy','2026-10-27');
   for(let i=1;i<played&&!s.pendingRetrigger;i++)s=execute(s,{type:'next'},'spin-'+i,'2026-10-27');
   if(s.active?.remaining===10-played&&s.active.totalFreeSpins===10&&!s.pendingRetrigger){snapshot=s;break;}
  }
  if(played===0)snapshot=createSession('first-spin');
  assert.ok(snapshot);
  const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:5176/')?route.continue():route.abort());
  await page.addInitScript(s=>{
   localStorage.setItem('slot-local-v1',JSON.stringify(s));
   const row=s.history[0];if(row)localStorage.setItem('slot-bonus-entry-v1',`${row.id}:${row.date}:${row.mode}`);
   localStorage.setItem('slot-preferences-v1',JSON.stringify({autoFs:false,sound:false,reduced:false,speed:'normal'}));
  },snapshot);
  await page.goto('http://127.0.0.1:5176/');
  await page.locator('#spin:enabled').waitFor();
  if(played===0){
   await page.locator('#bonus-shop').click();await page.locator('#buy-superior').click();
   await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').waitFor();
   assert.equal(await page.locator('#free-spins-panel').isVisible(),false);
  }
  const counter=()=>page.locator('#fs').innerText().then(s=>s.replace(/\s/g,''));
  assert.equal(await counter(),played===0?'':`${played}/10`);
  await page.waitForTimeout(250);
  assert.equal(await counter(),played===0?'':`${played}/10`);
  await page.evaluate(()=>{
   window.counterChanges=[];
   new MutationObserver(()=>window.counterChanges.push({value:document.querySelector('#fs').textContent.replace(/\s/g,''),reeling:document.querySelector('#board').classList.contains('reeling')})).observe(document.querySelector('#fs'),{childList:true,subtree:true});
  });
  await page.locator(played===0?'#enter-bonus':'#spin').click();
  await page.waitForFunction(n=>document.querySelector('#fs')?.textContent.replace(/\s/g,'')===`${n}/10`,played+1);
  assert.equal(await page.locator('#board').evaluate(el=>el.classList.contains('reeling')),true);
  const changes=await page.evaluate(()=>window.counterChanges);
  assert.ok(changes.some(c=>c.value===`${played+1}/10`));
  assert.ok(changes.filter(c=>c.value===`${played+1}/10`).every(c=>c.reeling),'Counter advanced before reels started');
  assert.equal(await page.locator('#fs-total').innerText(),'SPIN / TOTAL');
  await page.screenshot({path:`test-results/football-current-spin-${played+1}.png`});
  await page.close();
 }
 console.log('Contador sincronizado com início real dos rolos: spins 1, 2, 5, 9 e 10; não avança em espera. Sem cloud.');
}finally{await browser.close();}
