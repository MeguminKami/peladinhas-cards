// Scoped owner revision: real purchases, no cloud; installed Edge with --edge.
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { startServer } from '../scripts/serve.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch(process.argv.includes('--edge')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
const errors=[],results=[];await mkdir('test-results',{recursive:true});
const ready=p=>p.waitForFunction(()=>window.pp?.estado==='PRONTO'&&!window.pp.busy,null,{timeout:180000});
async function pageFor(width=1280,height=800,reduced=true){
  const p=await browser.newPage({viewport:{width,height}});
  await p.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});
  p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await p.addInitScript(reduced=>{localStorage.setItem('peace-police-speed','"normal"');localStorage.setItem('pp-movimento-reduzido',reduced?'1':'0');},reduced);
  await p.goto(base+'/game.html?seed=acidwave-review');await ready(p);await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.evaluate(()=>document.fonts.check('400 24px "PP Rubik Glitch"')),true,'fonte expressiva local carregada');return p;
}
async function finish(p){
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){
    if(await p.evaluate(()=>window.pp.estado==='PRONTO'&&!window.pp.busy))return;
    if(await p.locator('#overlay').evaluate(d=>d.open)){
      await p.waitForTimeout(520);await p.locator('#overlay-continue').click();
    }
    await p.waitForTimeout(80);
  }throw Error('A jogada não terminou.');
}
try{
  for(const [w,h] of [[1280,800],[390,844],[844,390],[320,640]]){
    const p=await pageFor(w,h);
    assert.equal(await p.locator('.acid-lock').count(),4);
    assert.equal(await p.locator('#speed-button').isVisible(),true);
    assert.deepEqual(await p.evaluate(()=>[window.pp.rate,window.pp.turbo,window.pp.TURBO_ALLOWED,window.pp.HOLD_TO_SPIN]),[1,false,true,false]);
    await p.click('#buy-button');await p.click('[data-buy=buy-police]');
    await p.waitForFunction(()=>document.querySelector('#buy-confirm').open);
    await p.waitForTimeout(210);
    assert.deepEqual(await p.locator('dialog[open]').evaluateAll(ds=>ds.map(d=>d.id)),['buy-confirm']);
    assert.equal(await p.locator('#buy-dialog').evaluate(d=>d.open),false);
    assert.equal(await p.locator('#buy-confirm').evaluate(d=>d.open),true);
    const bounds=await p.locator('#buy-confirm').evaluate(d=>{const r=d.getBoundingClientRect();return [r.left,r.top,r.right<=innerWidth+1,r.bottom<=innerHeight+1,d.scrollWidth<=d.clientWidth+1];});
    assert.ok(bounds[0]>=0&&bounds[1]>=0&&bounds.slice(2).every(Boolean),`confirmação cabe em ${w}×${h}: ${bounds}`);
    await p.screenshot({path:`test-results/acidwave-confirm-${w}.png`});
    const before=await p.evaluate(()=>[window.pp.pedidos,window.pp.session.balance]);
    await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#buy-dialog').open);
    assert.deepEqual(await p.evaluate(()=>[window.pp.pedidos,window.pp.session.balance]),before);
    await p.click('#buy-dialog [data-close]');
    await p.reload();await ready(p);assert.equal(await p.evaluate(()=>window.pp.rate),1);
    results.push({layout:[w,h],confirmation:'ok',cancel:'no debit',speed:'normal after reload'});console.log('ok layout',w,h);await p.close();
  }
  for(const [id,count] of [['afterparty',3],['vip',4],['police',5]]){
    const p=await pageFor(1280,800,id!=='police');
    await p.evaluate(()=>{
      window.__wins=0;window.__entry=null;window.__frames=[];let last=performance.now();
      window.pp.on('evento',e=>{if(e.type==='win.cluster')window.__wins+=e.pay;});
      window.__observer=new MutationObserver(()=>{const spin=document.querySelector('.purchase-spin');if(spin&&spin.querySelectorAll('[data-stopped=true]').length===5)window.__entry=[...spin.querySelectorAll('.purchase-final>span')].map(el=>({symbol:el.dataset.symbol,cell:Number(el.dataset.cell)}));});
      window.__observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
      function frame(t){if(document.querySelector('.purchase-spin'))window.__frames.push(t-last);last=t;window.__raf=requestAnimationFrame(frame);}window.__raf=requestAnimationFrame(frame);
    });
    const before=await p.evaluate(()=>({balance:window.pp.session.balance,requests:window.pp.pedidos,heap:performance.memory?.usedJSHeapSize,nodes:document.querySelectorAll('*').length}));
    await p.click('#buy-button');await p.click(`[data-buy=buy-${id}]`);
    await p.waitForFunction(()=>document.querySelector('#buy-confirm').open);
    const cost=await p.evaluate(id=>window.pp.session.cost('buy-'+id,window.pp.bet),id);
    // Synchronous duplicate dispatch must still issue exactly one paid request.
    await p.evaluate(()=>{document.querySelector('#buy-ok').click();document.querySelector('#buy-ok').click();});
    if(id==='police'){
      await p.waitForFunction(()=>document.querySelectorAll('.purchase-spin [data-stopped=true]').length===5);
      await p.waitForTimeout(240);
      await p.screenshot({path:'test-results/acidwave-purchase-spin.png'});
    }
    await p.waitForFunction(()=>document.querySelector('#overlay').open,null,{timeout:15000});
    const entry=await p.evaluate(()=>window.__entry);assert.ok(entry,'entrada completa observada');
    assert.equal(entry.filter(c=>c.symbol==='S').length,count);
    assert.ok(entry.filter(c=>c.symbol==='S').every(c=>![0,4,20,24].includes(c.cell)));
    assert.deepEqual(await p.locator('dialog[open]').evaluateAll(ds=>ds.map(d=>d.id)),['overlay']);
    assert.equal(await p.evaluate(()=>window.pp.pedidos),before.requests+1);
    await p.evaluate(()=>{const c=document.querySelector('#reduced-motion');c.checked=true;c.dispatchEvent(new Event('change'));});
    await finish(p);
    const final=await p.evaluate(()=>{cancelAnimationFrame(window.__raf);window.__observer.disconnect();return{balance:window.pp.session.balance,shown:window.pp.balanceShown,wins:window.__wins,frames:window.__frames,heap:performance.memory?.usedJSHeapSize,nodes:document.querySelectorAll('*').length,rate:window.pp.rate,transitions:window.pp.transicoes};});
    assert.equal(final.balance,before.balance-cost+Math.floor(final.wins/10));assert.equal(final.shown,final.balance);assert.equal(final.rate,1);
    assert.equal(await p.locator('.purchase-spin,.fx-unlock').count(),0);
    results.push({bonus:id,scatters:count,paidRequests:1,wallet:'exact',reducedEntry:id!=='police',presentationFrames:final.frames.length,entryFps:1000/(final.frames.reduce((a,b)=>a+b,0)/final.frames.length),heapBefore:before.heap,heapAfter:final.heap,nodesBefore:before.nodes,nodesAfter:final.nodes});console.log('ok purchase',id);
    await p.close();
  }
  const p=await pageFor(1280,800,false);
  await p.evaluate(()=>window.pp.runScenario('triple-chemistry'));
  const unlockDeadline=Date.now()+90000;
  while(!await p.locator('.fx-unlock .acid-key').count()){
    if(Date.now()>unlockDeadline)throw Error('Desbloqueio não chegou.');
    if(await p.locator('#overlay').evaluate(d=>d.open)){await p.waitForTimeout(520);await p.locator('#overlay-continue').click();}
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(700);await p.screenshot({path:'test-results/acidwave-unlock.png'});
  for(let i=0;i<3;i++){await p.evaluate(()=>window.pp.spin());await p.waitForTimeout(120);}
  assert.equal(await p.evaluate(()=>window.pp.rate),1);
  await p.evaluate(()=>{const c=document.querySelector('#reduced-motion');c.checked=true;c.dispatchEvent(new Event('change'));});
  await finish(p);
  await p.screenshot({path:'test-results/acidwave-premium.png'});
  assert.equal(await p.locator('.fx-unlock,.acid-key').count(),0);
  assert.equal(await p.evaluate(()=>window.pp.pedidos),1,'cenário não acumulou novos spins');
  results.push({unlock:'key / rotation / shackle / split chains / cleanup',repeatedPresses:'normal; no queue'});await p.close();
  await writeFile('test-results/acidwave-review.json',JSON.stringify({browser:browser.version(),viewport:[1280,800],cpuThrottle:1,results,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
