import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer } from '../scripts/serve.js';
import { sounds } from '../ui/audio-catalog.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch(process.argv.includes('--edge')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
const errors=[],missing=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto(base+'/audio-lab.html');
  assert.equal(await page.evaluate(()=>audioLab.diagnostics.state),'locked');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.wav')).length),0,'nenhum áudio antes do gesto');
  await page.click('#unlock');
  await page.waitForFunction(count=>audioLab.diagnostics.loaded===count,Object.keys(sounds).length);
  await page.click('.sound button');
  assert.ok((await page.evaluate(()=>audioLab.diagnostics.played))>0);
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'laboratório sem overflow');
  }
  await page.fill('#filter','copium');assert.equal(await page.locator('.sound:visible').count(),3);
  await page.fill('#filter','');
  const limits=await page.evaluate(async()=>{
    audioLab.stop();
    const before=audioLab.played;audioLab.setVolumes({muted:true});audioLab.play('click');
    const muted=audioLab.played===before;audioLab.setVolumes({muted:false});
    for(const id of Object.keys((await import('./ui/audio-catalog.js')).sounds))audioLab.play(id,{interval:0});
    const peak=audioLab.peakVoices;audioLab.stop();
    audioLab.last.clear();const n=audioLab.played;audioLab.play('click');audioLab.play('click');
    return {muted,peak,limited:audioLab.played===n+1};
  });
  assert.ok(limits.muted&&limits.limited);assert.ok(limits.peak<=6);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>audioLab.diagnostics.state==='suspended');
  assert.equal(await page.evaluate(()=>audioLab.diagnostics.voices),0);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>audioLab.diagnostics.state==='running');
  await page.click('#sequence');await page.click('#stop');
  assert.equal(await page.evaluate(()=>audioLab.diagnostics.voices),0);
  await page.click('#personas');
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('awaken-ALCOOL'));
  await page.click('#stop');
  assert.equal(await page.evaluate(()=>audioLab.diagnostics.voices),0);
  await page.click('#fusions');
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('fusion-NEVER_ENDING_DREAM'));
  await page.click('#stop');
  console.log('OK laboratório: desbloqueio, 62 descodificações, limites, mute, background/retoma, filtro, paragem e desktop/móvel.');

  if(!process.argv.includes('--lab-only')) {
  await page.addInitScript(()=>localStorage.setItem('pp-intro-v1-hidden','1'));
  await page.goto(base+'/game.html?debug=1');await page.waitForFunction(()=>window.pp?.estado==='PRONTO');
  await page.keyboard.press('Shift');
  await page.waitForFunction(count=>pp.audio.loaded===count,Object.keys(sounds).length);
  await page.evaluate(async()=>{
    const {audio}=await import('./ui/fx-audio.js');window.landingChecks=[];
    const land=audio.land.bind(audio);
    audio.land=(grid,indices,ctx,options)=>{
      landingChecks.push(indices.every(i=>!ctx.cells[i].getAnimations().some(a=>a.playState==='running')));
      return land(grid,indices,ctx,options);
    };
    setInterval(()=>{const b=document.querySelector('#overlay[open] #overlay-continue');if(b&&!b.hidden)b.click();else if(document.querySelector('#overlay[data-counting=true]'))document.querySelector('#overlay-amount').click();},550);
  });
  for(const speed of ['normal','ultra']) {
    for(let i=0;i<3&&await page.locator('#speed-button').getAttribute('data-speed')!==speed;i++)await page.click('#speed-button');
    assert.equal(await page.locator('#speed-button').getAttribute('data-speed'),speed);
    const before=await page.evaluate(()=>pp.audio.played);
    await page.evaluate(()=>pp.runScenario('bonus:afterparty'));
    await page.waitForFunction(()=>pp.busy);
    await page.waitForFunction(()=>!pp.busy&&pp.estado==='PRONTO',null,{timeout:240000});
    assert.ok(await page.evaluate(before=>pp.audio.played>before,before));
    assert.ok(await page.evaluate(()=>pp.audio.peakVoices<=6));
    console.log(`OK bónus AFTERPARTY completo: ${speed}.`);
  }
  assert.ok(await page.evaluate(()=>landingChecks.length>0&&landingChecks.every(Boolean)),'pousos após a animação, sem relógio paralelo');
  assert.deepEqual(await page.evaluate(()=>pp.audio.failures),[]);
  }
  assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
  const failed=await browser.newPage();
  await failed.route('**/ui/audio/sfx/click.wav',route=>route.abort());
  await failed.goto(base+'/audio-lab.html');await failed.click('#unlock');
  await failed.waitForFunction(()=>audioLab.diagnostics.failures.includes('click'));
  await failed.waitForFunction(count=>audioLab.diagnostics.loaded===count,Object.keys(sounds).length-1);
  await failed.locator('.sound button').filter({hasText:'copium-respin'}).click();
  assert.ok(await failed.evaluate(()=>audioLab.diagnostics.played>0),'um ficheiro ausente não impede os restantes');
  console.log('OK ausência de um ficheiro isolada, sem bloquear o áudio restante. Sem erros JS nem 404 no percurso normal.');
} finally {await browser.close();server.close();}
