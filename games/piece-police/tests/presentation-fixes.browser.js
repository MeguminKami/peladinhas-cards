// Regression fixtures for the purchased grid, Joiner face and readable banners. No wallet/cloud calls.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { startServer } from '../scripts/serve.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch(process.argv.includes('--edge')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
const errors=[];await mkdir('test-results',{recursive:true});
try {
  for(const [width,height,bonus,count,speed,reduced,rate] of [
    [1280,800,'afterparty',3,'normal',false,1], [390,844,'vip',4,'fast',false,2],
    [844,390,'police',5,'ultra',false,3.75], [320,640,'police',5,'ultra',true,3.75],
  ]) {
    if(process.argv.includes('--compact')&&width!==844)continue;
    const p=await browser.newPage({viewport:{width,height}});
    p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await p.addInitScript(()=>localStorage.setItem('pp-intro-v1-hidden','1'));
    await p.goto(base+'/game.html');await p.waitForFunction(()=>window.pp?.estado==='PRONTO');
    await p.evaluate(async()=>{
      const {visual}=await import('./ui/fx-visual.js'),clock=await import('./ui/tempo.js');
      const {loadArt,paintSymbol,artImage}=await import('./ui/art-loader.js');
      const {categoria}=await import('./ui/texto.js');const {purchaseEntry}=await import('./ui/acid-symbols.js');
      const art=await loadArt(document.querySelector('meta[name="pp-art-manifest"]').content);
      const board=document.getElementById('board'),cells=[...board.children],flash=document.getElementById('board-flash');
      delete board.dataset.welcome;
      const draw=(symbols,multipliers={})=>symbols.forEach((symbol,i)=>{
        const cell=cells[i],mult=multipliers[i];cell.className='cell';cell.dataset.sym=symbol;cell.dataset.cat=categoria(symbol);cell.dataset.awake='false';
        cell.dataset.multLevel=String(symbol==='DW'?(mult<10?1:mult<25?2:mult<50?3:4):0);
        paintSymbol(cell.querySelector('.sym'),symbol,art);
        cell.querySelector('.mult').textContent=mult?`×${mult}`:'';cell.querySelector('.name').textContent=symbol==='DW'?'JOINER':'';cell.querySelector('.flag').textContent='';
      });
      const ctx={board,cells,flash,paintSymbol:(target,symbol)=>paintSymbol(target,symbol,art),artImage:(id,cls)=>artImage(art,id,cls),
        tempo:{wait:clock.wait,animate:clock.animate,get rate(){return clock.currentRate();}},
        get scale(){return Number(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;},
        render(){},hud(){},skip:()=>false,model:pp.model,totalCornersIncrement:pp.config.chemistry.totalSomaCantos||0,speed:'normal',reduced:false};
      clock.setRate(1);globalThis.fixture={ctx,draw,visual,clock,purchaseEntry};
    });
    const balance=await p.evaluate(()=>[pp.pedidos,pp.session.balance]);
    await p.evaluate(({bonus,count})=>{
      const entry=fixture.purchaseEntry('presentation-fixes',bonus,count);fixture.draw(entry.grid);
      globalThis.entryDone=fixture.visual.buy(fixture.ctx,bonus,'presentation-fixes',count);
    },{bonus,count});
    await p.waitForFunction(()=>document.querySelectorAll('.purchase-spin [data-stopped=true]').length===5);
    const geometry=await p.evaluate(()=>{
      const panel=document.querySelector('.purchase-spin');panel.getAnimations({subtree:true}).forEach(a=>a.cancel());
      return [...panel.querySelectorAll('.purchase-final>.cell')].map(tile=>{
        const reference=document.querySelector(`#board>.cell[data-cell="${tile.dataset.cell}"]`);
        const a=tile.getBoundingClientRect(),b=reference.getBoundingClientRect();
        const sym=tile.querySelector('.sym'),ref=reference.querySelector('.sym');
        return {symbol:tile.dataset.symbol,position:[a.x-b.x,a.y-b.y],size:[a.width-b.width,a.height-b.height],
          image:sym.querySelector('img')?.src===ref.querySelector('img')?.src,
          inset:getComputedStyle(sym).inset===getComputedStyle(ref).inset,
          insetValues:[getComputedStyle(sym).inset,getComputedStyle(ref).inset],
          background:getComputedStyle(tile).backgroundImage===getComputedStyle(reference).backgroundImage};
      });
    });
    assert.equal(geometry.length,25);assert.equal(geometry.filter(t=>t.symbol==='S').length,count);
    for(const tile of geometry){
      assert.ok([...tile.position,...tile.size].every(n=>Math.abs(n)<.8),`grelha igual ${width}: ${JSON.stringify(tile)}`);
      assert.ok(tile.image&&tile.inset&&tile.background,`arte e recorte comuns: ${JSON.stringify(tile)}`);
    }
    if([1280,390].includes(width))await p.screenshot({path:`test-results/presentation-purchase-${width}.png`});
    await p.evaluate(()=>entryDone);assert.equal(await p.locator('.purchase-spin').count(),0);
    await p.evaluate(()=>{
      const grid=Array(25).fill('N1'),mult={6:9,7:10,8:25,11:50,12:100,13:1000};
      for(const i of Object.keys(mult))grid[i]='DW';for(const i of [0,4,20,24])grid[i]='X';fixture.draw(grid,mult);
    });
    const badges=await p.locator('#board .cell[data-sym=DW]').evaluateAll(cells=>cells.map(cell=>{
      const r=cell.getBoundingClientRect(),art=cell.querySelector('.sym img').getBoundingClientRect(),badge=cell.querySelector('.mult'),b=badge.getBoundingClientRect(),label=cell.querySelector('.name').getBoundingClientRect();
      return {text:badge.textContent,faceClear:b.top>=art.y+art.height*.54-.5,inside:b.x>=r.x&&b.right<=r.right&&b.bottom<=r.bottom,
        fullValue:badge.scrollWidth<=badge.clientWidth+1,separate:b.bottom<=label.top+1,
        faceBottom:art.y+art.height*.54,badgeTop:b.top,labelTop:label.top,boost:getComputedStyle(cell).getPropertyValue('--ui-boost')};
    }));
    assert.equal(badges.length,6);for(const badge of badges)assert.ok(badge.faceClear&&badge.inside&&badge.fullValue&&badge.separate,`${width}: ${JSON.stringify(badge)}`);
    if([1280,390,844].includes(width))await p.screenshot({path:`test-results/presentation-joiner-${width}.png`});
    const elapsed=await p.evaluate(async({speed,reduced,rate})=>{
      fixture.ctx.speed=speed;fixture.ctx.reduced=reduced;fixture.clock.setRate(rate);
      const start=performance.now();await fixture.visual.play({type:'chemistry.total'},fixture.ctx);return performance.now()-start;
    },{speed,reduced,rate});
    assert.ok(elapsed>=3000/rate&&elapsed<6500/rate,`tempo de leitura por velocidade ${speed}/${reduced}: ${elapsed}`);
    assert.equal(await p.locator('.fx-banner').count(),0);
    assert.deepEqual(await p.evaluate(()=>[pp.pedidos,pp.session.balance]),balance,'fixtures não fazem pedidos nem alteram a carteira');
    console.log(`OK ${width}×${height}: compra ${count} S com geometria/arte comuns, Joiner ×9–×1000 sem cobrir rosto, aviso ${speed}${reduced?' reduzido':''} ${Math.round(elapsed)} ms.`);
    if(width===1280){
      const elapsed=await p.evaluate(async()=>{
        fixture.clock.setRate(1);fixture.ctx.speed='normal';const start=performance.now();
        setTimeout(()=>{fixture.clock.setRate(3.75);fixture.ctx.speed='ultra';},450);
        await fixture.visual.play({type:'chemistry.level',to:5},fixture.ctx);return performance.now()-start;
      });assert.ok(elapsed>=900&&elapsed<2200,`Turbo acelera o aviso em curso: ${elapsed}`);
    }
    await p.close();
  }
  assert.deepEqual(errors,[]);console.log(process.argv.includes('--compact')?'OK: 3 regressões no formato compacto, sem erros JS/404.':'OK: 3 regressões, 4 formatos, 3 velocidades, movimento reduzido e mudança de velocidade durante leitura. Sem erros JS/404.');
} finally {await browser.close();server.close();}
