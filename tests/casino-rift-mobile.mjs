import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from './browser-sandbox.mjs';

const origin='http://127.0.0.1:8098';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','8098'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(Error('Local server failed')));});
const browser=await chromium.launch({headless:true,channel:'msedge'});
mkdirSync('test-results/rift-mobile',{recursive:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(`${origin}/assets/games/rift/index.html?demo=1`);
  await page.locator('#game').waitFor();
  for(const width of [320,390,768]) {
    await page.setViewportSize({width,height:844});
    await page.locator('#powerBanner').evaluate(banner=>{
      banner.className='power-readable';
      banner.innerHTML='<div class="power-copy"><strong>RIFT LINK</strong><div class="power-explanation">Colunas 4 → 3 · cópia</div></div><div class="power-preview" aria-hidden="true">✦ → ✦</div>';
    });
    const geometry=await page.evaluate(()=>{
      const box=selector=>document.querySelector(selector).getBoundingClientRect();
      const banner=box('#powerBanner'),status=box('.matrix-bottom'),footer=box('footer');
      const controls=['#rules','#history','.bet-control','.auto-wrap','#spin','#speed','#buyBonus','#hunt','.master-volume'].map(selector=>({selector,rect:box(selector)}));
      const overlaps=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
        const a=controls[i],b=controls[j],horizontal=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),vertical=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
        if(horizontal>2&&vertical>2)overlaps.push(`${a.selector}/${b.selector}`);
      }
      return {overflow:document.documentElement.scrollWidth-innerWidth,banner:{top:banner.top,bottom:banner.bottom,left:banner.left,right:banner.right},statusTop:status.top,footerTop:footer.top,overlaps};
    });
    await page.screenshot({path:`test-results/rift-mobile/power-${width}.png`,fullPage:true});
    assert.ok(geometry.overflow<=1,`Rift horizontal overflow at ${width}px`);
    assert.ok(geometry.banner.left>=0&&geometry.banner.right<=width+1,`Rift banner clipped at ${width}px`);
    assert.ok(geometry.banner.bottom<=geometry.statusTop,`Rift banner covers status at ${width}px`);
    assert.ok(geometry.banner.bottom<=geometry.footerTop,`Rift banner covers controls at ${width}px`);
    assert.deepEqual(geometry.overlaps,[],`Rift controls overlap at ${width}px`);
    await page.locator('#powerBanner').evaluate(banner=>{banner.className='';banner.replaceChildren();});
  }
  await page.setViewportSize({width:390,height:844});
  if(await page.locator('#spin:not(:disabled)').count()) await page.locator('#spin').click();
  else throw Error(`Rift spin unavailable: ${errors.join('; ')} ${await page.locator('body').innerText().then(text=>text.slice(0,160))}`);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.trim()!=="O núcleo aguarda o teu comando.");
  assert.deepEqual(errors,[]);
  process.stdout.write('Rift mobile: 320/390/768 px, power notice clear of status and controls, local spin passed.\n');
} finally { await browser.close(); server.kill(); }
