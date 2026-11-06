import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { startServer } from '../scripts/serve.js';
import { musicFiles } from '../ui/music-loop.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[],missing=[];
try {
  const manifest=JSON.parse(await readFile(new URL('../ui/audio/music/manifest.json',import.meta.url),'utf8'));
  for(const [mode,file] of Object.entries(musicFiles)) {
    const bytes=await readFile(new URL(`../ui/audio/music/${file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.tracks[mode].sha256,'original intacto');
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto(base+'/audio-lab.html');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.mp3')).length),0);
  await page.click('#unlock');await page.waitForFunction(()=>audioLab.diagnostics.loaded===62);
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  for(const mode of Object.keys(musicFiles)) {
    const previous=await page.evaluate(()=>audioLab.diagnostics.music.tracks.map(v=>v.mode));
    await page.selectOption('#music-mode',mode);
    if(previous.length)assert.ok(await page.evaluate(previous=>audioLab.diagnostics.music.tracks.some(v=>previous.includes(v.mode)),previous),'anterior preservada durante a carga');
    await page.waitForFunction(mode=>audioLab.diagnostics.music.tracks.some(v=>v.mode===mode&&v.fadingTo===1),mode,{timeout:30000});
    const initial=await page.evaluate(()=>audioLab.diagnostics.music);
    assert.ok(initial.tracks.length<=2);assert.equal(initial.crossfadeSeconds,2);
    if(previous.length){
      await page.waitForTimeout(300);
      const power=await page.evaluate(()=>audioLab.diagnostics.music.tracks.reduce((sum,v)=>sum+v.gain*v.gain,0));
      assert.ok(Math.abs(power-1)<.025,'potência constante durante a sobreposição');
    }
    await page.waitForFunction(mode=>audioLab.diagnostics.music.tracks.some(v=>v.mode===mode&&v.gain>.999),mode);
    assert.ok(await page.evaluate(()=>audioLab.diagnostics.music.tracks.every(v=>v.rate===1)),'sem mudança de afinação/velocidade');
    const seam=await page.evaluate(mode=>{
      const entry=audioLab.musicPlayer.live.get(mode).entry,buffer=entry.buffer;
      let worst=0,energy=0,count=0;
      for(let ch=0;ch<buffer.numberOfChannels;ch++){
        const d=buffer.getChannelData(ch);let differences=0;
        for(let i=d.length-1600;i<d.length-1;i++)differences+=(d[i+1]-d[i])**2;
        for(let repeat=0;repeat<3;repeat++)worst=Math.max(worst,Math.abs(d[0]-d.at(-1))/Math.max(.001,Math.sqrt(differences/1599)));
        for(const value of d){energy+=value*value;count++;}
      }
      return {worst,rms:Math.sqrt(energy/count),duration:buffer.duration,peak:entry.peak};
    },mode);
    assert.ok(seam.worst<8,`${mode}: junção sem salto anormal ${seam.worst}`);
    assert.ok(seam.rms>.09&&seam.rms<.13);assert.ok(seam.peak<=.80001);
    assert.ok(seam.duration>manifest.tracks[mode].duration*.75,'maior parte da música preservada');
    console.log(`OK ${mode}: loop ${seam.duration.toFixed(2)} s, RMS ${seam.rms.toFixed(3)}, pico ${seam.peak.toFixed(3)}.`);
  }
  // Interrupt and reverse an in-progress crossfade, using ready tracks.
  await page.evaluate(()=>audioLab.setMode('vip'));
  await page.waitForTimeout(450);
  const continuity=await page.evaluate(async()=>{
    const before=audioLab.diagnostics.music.tracks;
    await audioLab.setMode('police');
    const after=audioLab.diagnostics.music.tracks;
    return before.every(a=>Math.abs(a.gain-(after.find(b=>b.mode===a.mode)?.gain??0))<.025);
  });assert.ok(continuity,'inversão não salta no ganho');
  await page.waitForFunction(()=>audioLab.diagnostics.music.tracks.some(v=>v.mode==='police'&&v.gain>.999));
  await page.evaluate(async()=>{await audioLab.setMode('vip');clearTimeout(audioLab.musicPlayer.cleanupTimer);});
  await page.waitForFunction(()=>audioLab.diagnostics.music.tracks.some(v=>v.mode==='vip'&&v.gain>.999));
  await page.waitForTimeout(100);
  await page.evaluate(()=>audioLab.setMode('police'));
  await page.waitForFunction(()=>audioLab.diagnostics.music.tracks.some(v=>v.mode==='police'&&v.gain>.999));
  await page.locator('#music-volume').evaluate(input=>{input.value='20';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>Math.abs(audioLab.music.gain.value-.04)<.001);
  await page.evaluate(()=>audioLab.setVolumes({muted:true}));
  await page.waitForFunction(()=>audioLab.master.gain.value<.001);
  await page.evaluate(()=>audioLab.setVolumes({muted:false}));
  await page.waitForFunction(()=>audioLab.master.gain.value>.999);
  assert.ok(await page.evaluate(()=>Boolean(audioLab.musicPlayer)));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>audioLab.diagnostics.state==='suspended');
  const paused=await page.evaluate(()=>audioLab.context.currentTime);
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>audioLab.context.currentTime),paused);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>audioLab.diagnostics.state==='running');
  assert.equal(await page.evaluate(()=>audioLab.diagnostics.music.tracks.filter(v=>v.fadingTo===1).length),1);
  await page.click('#stop');
  await page.waitForFunction(()=>audioLab.diagnostics.music.tracks.every(v=>v.gain<.001));
  assert.deepEqual(await page.evaluate(()=>audioLab.diagnostics.music.failures),[]);
  console.log('OK inversão de crossfade, saída suave, volumes por barramento, suspensão/retoma sem duplicar música.');

  const fail=await browser.newPage();await fail.route('**/ui/audio/music/policeparty.mp3',route=>route.abort());
  await fail.goto(base+'/audio-lab.html');await fail.click('#unlock');await fail.selectOption('#music-mode','base');
  await fail.waitForFunction(()=>audioLab.diagnostics.music.tracks.some(v=>v.mode==='base'&&v.gain>.999));
  await fail.selectOption('#music-mode','police');await fail.waitForFunction(()=>audioLab.diagnostics.music.failures.includes('police'));
  assert.ok(await fail.evaluate(()=>audioLab.diagnostics.music.tracks.some(v=>v.mode==='base'&&v.gain>.999)),'falha mantém faixa atual');
  await fail.close();
  if(!process.argv.includes('--lab-only')) {
  // Game integration: extra-scatter toggle and a complete bonus, with automatic manual confirmations in the fixture.
  await page.addInitScript(()=>{localStorage.setItem('pp-intro-v1-hidden','1');localStorage.setItem('peace-police-speed','ultra');});
  await page.goto(base+'/game.html?debug=1');await page.waitForFunction(()=>window.pp?.estado==='PRONTO');
  await page.keyboard.press('Shift');await page.waitForFunction(()=>pp.audio.music?.tracks.some(v=>v.mode==='base'));
  await page.click('#hunt-button');await page.waitForFunction(()=>pp.audio.music?.tracks.some(v=>v.mode==='hunt'));
  await page.evaluate(()=>setInterval(()=>{const b=document.querySelector('#overlay[open] #overlay-continue');if(b&&!b.hidden)b.click();else if(document.querySelector('#overlay[data-counting=true]'))document.querySelector('#overlay-amount').click();},550));
  await page.evaluate(()=>pp.runScenario('bonus:afterparty'));
  await page.waitForFunction(()=>pp.audio.music?.tracks.some(v=>v.mode==='afterparty'),null,{timeout:30000});
  await page.waitForFunction(()=>!pp.busy&&pp.estado==='PRONTO',null,{timeout:180000});
  await page.waitForFunction(()=>pp.audio.music?.tracks.some(v=>v.mode==='hunt'&&v.gain>.999));
  assert.ok(await page.evaluate(()=>pp.audio.music.maxDecks<=2));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('OK jogo: base → MAIS SCATTERS → AFTERPARTY completo → MAIS SCATTERS. Sem erros JS nem 404.');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
} finally {await browser.close();server.close();}
