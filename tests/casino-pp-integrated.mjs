import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { chromium } from './browser-sandbox.mjs';
const root = resolve('.');
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server = createServer(async(req,res) => { try {
  const path = resolve(root, decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'') || 'index.html');
  if (relative(root,path).startsWith('..')) throw Error();
  res.setHeader('Content-Type',mime[extname(path)] || 'application/octet-stream'); res.end(await readFile(path));
} catch { res.writeHead(404); res.end(); } });
await new Promise(done => server.listen(0,'127.0.0.1',done));
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.route('**/js/firebase.js',route=>route.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
  for (const name of ['auth','db']) await context.route('**/js/'+name+'.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(resolve(root,'tests/fixtures/'+name+'.js'),'utf8')).replaceAll('../../js/','./')}));
  await context.addInitScript(()=>localStorage.setItem('pp-intro-v1-hidden','1'));
  const page = await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/#/casino');
  await page.waitForFunction(()=>document.querySelector('.casino-wallet-total strong')?.textContent==='100');
  const card=page.locator('.casino-game').filter({has:page.locator('[data-casino-game="piece-police"]')});
  assert.equal(await card.count(),1);
  await card.locator('img').evaluate(image=>image.decode());
  assert.deepEqual(await card.locator('img').evaluate(i=>[i.naturalWidth,i.naturalHeight]),[800,1200]);
  await page.locator('[data-casino-game="piece-police"]').click();
  const iframe=page.locator('iframe[src*="/piece-police/"]');await iframe.waitFor();
  let frame=await iframe.elementHandle().then(h=>h.contentFrame());
  await frame.waitForFunction(()=>window.pp?.estado==='PRONTO');
  assert.equal(await frame.evaluate(()=>pp.session.host),true);
  assert.equal(await frame.evaluate(()=>pp.session.balance),10000);
  assert.equal(await iframe.getAttribute('allow'),'fullscreen; autoplay');
  await mkdir(resolve(root,'artifacts/peace-police-integration'),{recursive:true});
  for(const [width,height] of [[1440,1000],[390,844]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(300);
    const geometry=await iframe.evaluate(el=>{const b=el.getBoundingClientRect(),toolbar=document.querySelector('.casino-toolbar').getBoundingClientRect();return {top:b.top>=toolbar.bottom-1,bottom:b.bottom<=innerHeight+1,page:document.documentElement.scrollWidth<=innerWidth+1};});
    assert.deepEqual(geometry,{top:true,bottom:true,page:true},JSON.stringify({width,geometry}));
    await page.screenshot({path:resolve(root,'artifacts/peace-police-integration/site-'+width+'.png')});
  }
  // Pedidos reais pelo HostSession e pela carteira do site, sem repetir testes internos do jogo.
  const spin = await frame.evaluate(async()=>{
    const s=pp.session; const before=s.balance;
    const opened=await s.request('start',{sessionId:s.sessionId,expectedRevision:s.revision,mode:'base',bet:100});
    s.apply(opened); const round=s.round; let final;
    while(s.active) { final=await s.request('step',{sessionId:s.sessionId,roundId:s.current.id,index:s.current.cursor}); s.apply(final); }
    return {before,cost:round.cost,after:s.balance,win:final.totalWin};
  });
  assert.equal(spin.after,spin.before-spin.cost+spin.win);
  const stored=await page.evaluate(async()=>{const {readCasinoLocal}=await import('/js/casino-local-store.js');const s=await readCasinoLocal('pedro');return {spent:s.spent,won:s.won,recent:s.wallet.recent.filter(x=>x.kind==='piece-police').length};});
  assert.equal(stored.spent,spin.cost);assert.equal(stored.won,spin.win);assert.equal(stored.recent,1);
  // Começa outra jogada e recarrega antes de a apresentar: o mesmo round é retomado.
  const pending=await frame.evaluate(async()=>{const s=pp.session;const r=await s.request('start',{sessionId:s.sessionId,expectedRevision:s.revision,mode:'hunt',bet:100});return {id:r.round.id,balance:r.balance};});
  await page.locator('[data-close-slot]').first().click();
  assert.equal(await iframe.count(),1,'saída bloqueada enquanto a carteira tem uma jogada');
  await page.reload();await page.locator('[data-casino-game="piece-police"]').click();
  frame=await page.locator('iframe[src*="/piece-police/"]').elementHandle().then(h=>h.contentFrame());
  await frame.waitForFunction(()=>window.pp?.session?.sessionId);
  const resumed=await page.evaluate(async()=>{const {readCasinoLocal}=await import('/js/casino-local-store.js');const s=await readCasinoLocal('pedro');return {spent:s.spent,id:s.peacePolice.round?.id};});
  assert.equal(resumed.spent,spin.cost+200,'reload sem segundo débito');
  if(resumed.id) assert.equal(resumed.id,pending.id);
  // A carteira isolada usa as mesmas fixtures, locks e IndexedDB do site.
  const checks=await page.evaluate(async()=>{
    const {createCasinoLocalWallet}=await import('/js/casino-local-wallet.js');
    const {readCasinoLocal}=await import('/js/casino-local-store.js');
    const w=createCasinoLocalWallet('pp-integration',()=>{},{tables:true});await w.start();
    const call=(a,p={},id=crypto.randomUUID())=>w.peacePoliceRequest(a,p,id);
    const connected=await call('connect');
    const bad=[];
    for(const payload of [{mode:'base',bet:123},{mode:'fake',bet:100},{mode:'buy-police',bet:100}]) {
      try{await call('start',{sessionId:connected.sessionId,expectedRevision:connected.revision,...payload});bad.push('accepted');}catch(e){bad.push(e.code);}
    }
    const id=crypto.randomUUID(),payload={sessionId:connected.sessionId,expectedRevision:connected.revision,mode:'base',bet:100,withFirstStep:true};
    const [a,b]=await Promise.all([call('start',payload,id),call('start',payload,id)]);
    let mismatch=false;try{await call('start',{...payload,bet:200},id);}catch{mismatch=true;}
    let current=a.firstStep || a;
    while(current.round){const p={sessionId:current.sessionId,roundId:current.round.id,index:current.round.cursor};const stepId=crypto.randomUUID();current=await call('step',p,stepId);const duplicate=await call('step',p,stepId);if(JSON.stringify(current)!==JSON.stringify(duplicate))throw Error('Passo repetido diferente');}
    const state=await readCasinoLocal('pp-integration');
    const beforeBonus=await call('connect');
    let bonus=await call('start',{sessionId:beforeBonus.sessionId,expectedRevision:beforeBonus.revision,mode:'buy-afterparty',bet:10});
    while(bonus.round) bonus=await call('step',{sessionId:bonus.sessionId,roundId:bonus.round.id,index:bonus.round.cursor});
    await w.checkpoint('bonus');
    const confirmed=await readCasinoLocal('pp-integration');
    const bonusAccounting={spent:confirmed.spent-state.spent,won:confirmed.won-state.won,win:bonus.totalWin,confirmed:confirmed.confirmedSpent===confirmed.spent&&confirmed.confirmedWon===confirmed.won};
    await w.close();
    return {bonusAccounting,initial:connected.balance,bad,same:JSON.stringify(a)===JSON.stringify(b),mismatch,spent:state.spent,won:state.won,balance:state.balance,recent:state.wallet.recent.filter(e=>e.kind==='piece-police').length};
  });
  assert.deepEqual(checks.bad,['INVALID_ACTION','INVALID_ACTION','INSUFFICIENT_BALANCE']);
  assert.equal(checks.same,true);assert.equal(checks.mismatch,true);assert.equal(checks.spent,100);assert.equal(checks.recent,1);
  assert.equal(checks.balance,checks.initial-checks.spent+checks.won);
  assert.equal(checks.bonusAccounting.spent,1260);
  assert.equal(checks.bonusAccounting.won,checks.bonusAccounting.win);
  assert.equal(checks.bonusAccounting.confirmed,true);
  assert.deepEqual(errors,[]);
  console.log('PEACE POLICE: catálogo e capa 800×1200, iframe desktop/telemóvel, HostSession, débito/crédito, histórico, recuperação, saída bloqueada, concorrência/idempotência e rejeição de apostas inválidas/saldo insuficiente passaram. Apenas fixtures locais.');
} finally { await browser.close(); await new Promise(done=>server.close(done)); }
