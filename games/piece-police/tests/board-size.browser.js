// Local HUD transitions only, no wallet or cloud requests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { startServer } from '../scripts/serve.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const { server, base } = await startServer({ port:0, quiet:true });
const browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  await mkdir('test-results',{recursive:true});
  for (const [width,height] of [[1280,800],[390,844],[320,640],[844,390]]) {
    const page = await browser.newPage({viewport:{width,height}});
    await page.addInitScript(()=>localStorage.setItem('pp-intro-v1-hidden','1'));
    await page.goto(base+'/game.html');
    await page.waitForFunction(()=>window.pp?.estado==='PRONTO');
    await page.evaluate(()=>document.fonts.ready);
    let baseline;
    for (const mode of ['base','afterparty','vip','police','base']) {
      await page.evaluate(mode=>{
        const bonus=mode!=='base';
        document.body.dataset.inBonus=String(bonus);
        document.body.dataset.scene=mode;
        document.getElementById('bonus-panel').hidden=!bonus;
        const label=document.getElementById('mode-label');
        label.hidden=!bonus;label.dataset.mode=mode;
        label.textContent=bonus?`${mode==='police'?'POLICE PARTY':mode==='vip'?'VIP AFTERPARTY':'AFTERPARTY'} · 10/10`:'';
        document.getElementById('event-log').innerHTML=Array(20).fill('<li class="log-item"><span class="txt">WEED + ALCOOL · fusão ativa</span></li>').join('');
        const fusion=document.getElementById('fusion-indicator');
        fusion.hidden=!bonus;fusion.querySelector('b').textContent='SLOW MOTION';
        fusion.querySelector('small').textContent='WEED + ALCOOL';
        pp.layout.fit();
      },mode);
      await page.waitForTimeout(250);
      const geometry=await page.evaluate(()=>{
        const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
        return {board:rect('board'),cell:rect('board').width,layout:pp.layout.layout,
          shell:document.querySelector('.shell').getBoundingClientRect().toJSON(),
          log:rect('bonus-panel'),side:document.querySelector('.side').getBoundingClientRect().toJSON()};
      });
      baseline??=geometry;
      assert.equal(geometry.layout,baseline.layout);
      for(const key of ['x','y','width','height'])assert.ok(Math.abs(geometry.board[key]-baseline.board[key])<1,`${width}/${mode}/${key}: ${JSON.stringify(geometry.board)} vs ${JSON.stringify(baseline.board)}`);
      assert.ok(geometry.board.x>=0&&geometry.board.y>=0&&geometry.board.x+geometry.board.width<=width+1&&geometry.board.y+geometry.board.height<=height+1,'board inside viewport');
      if(mode==='police'){
        assert.ok(geometry.log.y+geometry.log.height<=geometry.board.y+1||geometry.log.x+geometry.log.width<=geometry.board.x+1,'log does not overlap board');
        await page.screenshot({path:`test-results/board-size-${width}.png`});
      }
    }
    console.log(`OK ${width}x${height}: identical board through base, all bonuses, fusion and return.`);
    await page.close();
  }
} finally {await browser.close();server.close();}
