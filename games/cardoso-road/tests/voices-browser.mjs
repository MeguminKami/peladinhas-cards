import {chromium} from '../../../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {VOICE_CLIPS} from '../voices.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'}),origin='http://127.0.0.1:5178';
async function setup({fallback=false,delay=0}={}){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 await context.route('**/*',async route=>{const url=route.request().url();if(!url.startsWith(origin+'/'))return route.abort();if(url.endsWith('.ogg')){if(delay)await new Promise(r=>setTimeout(r,delay));if(fallback)return route.fulfill({status:200,contentType:'audio/ogg',body:'unsupported-ogg'});}return route.continue();});
 await context.addInitScript(()=>{
  localStorage.setItem('cardoso-road-demo-v1-settings',JSON.stringify({effects:false,music:false,voices:true,volume:.3}));
  Object.defineProperty(crypto,'getRandomValues',{value:a=>{a.fill(window.failNext?4294967295:0);return a;}});
  window.voiceEvents=[];document.addEventListener('cardoso:voice',e=>window.voiceEvents.push(e.detail));
 });
 page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('#play')?.disabled===false);
 return {context,page,frame:page.frames().find(f=>f.url().endsWith('/game.html')),errors};
}
const waitVoice=(frame,clip)=>frame.waitForFunction(clip=>window.voiceEvents.some(e=>e.status==='playing'&&e.clip===clip),clip);
try{
 for(const fallback of [false,true]){
  const {context,frame,errors}=await setup({fallback});assert.equal(await frame.evaluate(()=>window.voiceEvents.length),0,'no automatic voices before a gesture');
  await frame.locator('#play').click();await waitVoice(frame,'uma_chupadela_de_cada_vez');
  for(const clip of ['mais_um_pre','proteina_pura','e_so_gains','isso_nao_tem_oleo','zero_oleo']){await frame.locator('#play').click();await waitVoice(frame,clip);}
  await frame.locator('#cashout').click();await waitVoice(frame,'grito_de_cashout');await frame.locator('#play').click();await frame.evaluate(()=>window.failNext=true);await frame.locator('#play').click();await waitVoice(frame,'fui_frito');
  const events=await frame.evaluate(()=>window.voiceEvents.filter(e=>e.status==='playing'));assert.deepEqual([...new Set(events.map(e=>e.clip))].sort(),Object.keys(VOICE_CLIPS).sort());assert.ok(events.every(e=>e.format===(fallback?'wav':'ogg')));
  await frame.locator('#training-open').click();await frame.getByRole('button',{name:'Áudio e imagem'}).click();await frame.locator('#voices').uncheck();await frame.locator('#close').click();const before=events.length;await frame.locator('#play').click();await frame.waitForTimeout(150);assert.equal(await frame.evaluate(()=>window.voiceEvents.filter(e=>e.status==='playing').length),before);
  assert.deepEqual(errors,[]);await context.close();console.log(`Oito gravações no quadro mobile, substituição e mute: ${fallback?'WAV fallback':'OGG'} OK`);
 }
 {
  const {context,frame,errors}=await setup({delay:900});await frame.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await frame.locator('#play').click();await frame.locator('#play').click();await frame.locator('#cashout').click();
  const round=await frame.evaluate(()=>JSON.parse(localStorage.getItem('cardoso-road-demo-v1')).round);assert.equal(round.status,'paid');await waitVoice(frame,'grito_de_cashout');const playing=await frame.evaluate(()=>window.voiceEvents.filter(e=>e.status==='playing').map(e=>e.clip));assert.deepEqual(playing,['grito_de_cashout']);assert.deepEqual(errors,[]);await context.close();console.log('Downloads lentos não bloqueiam passos/cashout nem reproduzem falas antigas OK');
 }
}finally{await browser.close();}
