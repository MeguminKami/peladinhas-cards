import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { startServer } from '../scripts/serve.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const { server, base } = await startServer({ port: 0, quiet: true });
const browser = await chromium.launch(process.argv.includes('--edge') ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {});
const errors=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
  await p.goto(base+'/game.html');
  await p.waitForSelector('#intro-dialog[open]');
  assert.equal(await p.evaluate(()=>window.pp.pedidos),0);
  const names=['WEED','ALCOOL','COPIUM','MDMA','LCD','PEACE POLICE'];
  await mkdir('test-results',{recursive:true});
  for (let i=0;i<names.length;i++) {
    const name=names[i];
    await p.waitForFunction(name=>document.querySelector('#intro-name')?.textContent===name,name);
    assert.equal(await p.locator('.intro-next').isVisible(),false,'ação oculta ao entrar');
    assert.equal(await p.locator('.intro-how dl > div').count(),4);
    assert.equal(await p.locator('.intro-how').isVisible(),true);
    assert.equal(await p.locator('#intro-dialog details').count(),0);
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('#intro-dialog').evaluate(d=>d.open),true);
    await p.waitForTimeout(1000);
    assert.equal(await p.locator('.intro-next').isVisible(),false,'ainda não passaram 1,5 segundos');
    await p.locator('.intro-next').waitFor({state:'visible'});
    if(i===0) await p.screenshot({path:'test-results/intro-desktop.png'});
    for(const [width,height] of [[1280,800],[390,844],[320,640],[844,390]]) {
      await p.setViewportSize({width,height});
      await p.locator('.intro-next').scrollIntoViewIfNeeded();
      assert.ok(await p.locator('#intro-dialog').evaluate(d=>{const r=d.getBoundingClientRect();return d.scrollWidth<=d.clientWidth+1&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;}),name+' cabe');
    }
    if(i===0) {
      await p.setViewportSize({width:390,height:844});
      await p.screenshot({path:'test-results/intro-mobile.png'});
      assert.match(await p.locator('.intro-how').innerText(),/PARTY MODE/);
      await p.locator('.intro-next').scrollIntoViewIfNeeded();
    }
    if(i===names.length-1) {
      assert.equal(await p.locator('.intro-next').innerText(),'JOGAR');
      assert.equal(await p.evaluate(()=>localStorage.getItem('pp-intro-v1-hidden')),null);
      for(const width of [1280,390,320]) {
        await p.setViewportSize({width,height:844});
        const boxes=await p.locator('.intro-preference,.intro-next').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {y:r.y,height:r.height,width:r.width};}));
        assert.ok(Math.abs(boxes[0].y-boxes[1].y)<1,'ações lado a lado');
        assert.ok(Math.abs(boxes[0].height-boxes[1].height)<1,'ações com mesma altura');
      }
      await p.screenshot({path:'test-results/intro-police-mobile.png'});
      await p.check('#intro-hide');
    }
    await p.locator('.intro-next').focus();
    await p.keyboard.press('Enter');
  }
  await p.waitForFunction(()=>window.pp.estado==='PRONTO');
  assert.equal(await p.locator('#board[data-welcome=true]').count(),1);
  assert.equal(await p.locator('#board .cell[data-cat=premium]').count(),21);
  assert.equal(await p.locator('#board .cell[data-sym=P5]').count(),16);
  assert.equal(await p.locator('#police-text').innerText(),'DE OLHO NA FESTA');
  assert.equal(await p.evaluate(()=>window.pp.pedidos),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('pp-intro-v1-hidden')),'1');
  await p.reload();await p.waitForFunction(()=>window.pp.estado==='PRONTO');
  assert.equal(await p.locator('#intro-dialog').count(),0,'preferência evita repetição');
  await p.setViewportSize({width:1280,height:800});
  await p.screenshot({path:'test-results/welcome-heart.png'});
  await p.evaluate(()=>window.pp.runScenario('lcd'));
  await p.waitForFunction(()=>!document.querySelector('#board').hasAttribute('data-welcome'));
  await p.evaluate(()=>localStorage.removeItem('pp-intro-v1-hidden'));
  await p.reload();await p.waitForSelector('#intro-dialog[open]');
  assert.equal(await p.locator('#intro-name').innerText(),'WEED','sem preferência volta a aparecer');
  assert.deepEqual(errors,[]);
  console.log('OK: 6 cenas, proteção 1,5 s, Escape, teclado, 4 formatos, explicação visível, coração inicial, preferência e reabertura.');
} finally {await browser.close();server.close();}
