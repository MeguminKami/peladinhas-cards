import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from './browser-sandbox.mjs';

const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','8196','--casino-credits','100000'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`Server stopped: ${code}`)));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1366,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8196/#/casino');
  await page.locator('[data-casino-game="ganza"]').click();
  await page.locator('iframe[src*="/ganza/"]').waitFor();
  const frame=await(await page.locator('iframe[src*="/ganza/"]').elementHandle()).contentFrame();
  await frame.locator('#loading').waitFor({state:'hidden'});
  await frame.waitForFunction(()=>ganza.scene.buoyRows?.rows.length===16);
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await frame.evaluate(()=>{
   window.launchProfile={clicks:[],added:[],draws:[],character:[],pins:0,originalPoses:ganza.scene.actorFrames};
   const wrap=(key,record)=>{const fn=ganza.scene[key];ganza.scene[key]=function(...args){const t=performance.now(),value=fn.apply(this,args);record(performance.now()-t);return value;};};
   wrap('draw',ms=>launchProfile.draws.push(ms));wrap('actor',ms=>launchProfile.character.push(ms));wrap('drawBuoy',()=>launchProfile.pins++);
   document.querySelector('#drop').addEventListener('click',()=>launchProfile.clicks.push(performance.now()),{capture:true});
   const add=ganza.scene.add;ganza.scene.add=function(...args){launchProfile.added.push(performance.now());return add.apply(this,args);};
  });
  const requests=[];page.on('request',r=>requests.push(r.url()));
  for(let n=0;n<3;n++){await frame.locator('#drop').click();await frame.waitForFunction(()=>!ganza.state.busy);await page.waitForTimeout(1000);}
  await frame.waitForFunction(()=>ganza.state.history.length===3&&ganza.state.settling===0);
  const metrics=await frame.evaluate(()=>{
   const p=launchProfile,percentile=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length*.95)];
   return {launchMs:p.added.map((t,i)=>Math.round(t-p.clicks[i])),drawP95:percentile(p.draws),characterP95:percentile(p.character),pins:p.pins,frames:p.draws.length,samePoses:p.originalPoses===ganza.scene.actorFrames,poses:ganza.scene.actorFrames.length,proof:ganza.state.proof,landings:ganza.scene.landings};
  });
  assert.equal(metrics.samePoses,true,'Throwing must reuse prepared poses');assert.equal(metrics.poses,8);
  assert.ok(metrics.pins<metrics.frames*136/2,'Stationary rows must not repaint every buoy each frame');
  const landing=metrics.landings.find(r=>r.id===metrics.proof.id);assert.equal(landing.k,metrics.proof.k);
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  // A slow wallet must not hold the first visible launch frame. It must still
  // prevent a fabricated path or settlement before acceptance.
  await frame.evaluate(()=>{
   const send=parent.postMessage.bind(parent);
   window.restoreLaunchSend=()=>{parent.postMessage=send;};
   parent.postMessage=(message,...args)=>{if(message?.action==='start')setTimeout(()=>send(message,...args),1200);else send(message,...args);};
   ganza.scene.result=null;
  });
  if(width===320)await frame.evaluate(()=>{ganza.scene.reduced=true;});
  await frame.locator('#drop').click();
  await frame.waitForFunction(()=>!!ganza.scene.launch?.screenPosition);
  const pending=await frame.evaluate(()=>({busy:ganza.state.busy,air:ganza.state.air,history:ganza.state.history.length,age:performance.now()-ganza.scene.launch.start}));
  assert.equal(pending.busy,true);assert.equal(pending.air,0);assert.equal(pending.history,3);assert.ok(pending.age<1000,'Launch must render before the delayed wallet response');
  const pendingShot=join(tmpdir(),`ganza-launch-pending-${width}.png`);await page.screenshot({path:pendingShot});
  await frame.waitForFunction(()=>ganza.state.history.length===4&&ganza.state.settling===0);
  await frame.evaluate(()=>restoreLaunchSend());
  // A rejected start must clear the visual without making a round or payment.
  await frame.evaluate(()=>{
   const send=parent.postMessage.bind(parent);
   window.restoreLaunchSend=()=>{parent.postMessage=send;};
   parent.postMessage=(message,...args)=>{if(message?.action==='start')setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{source:parent,origin:location.origin,data:{channel:'ganza:v1',type:'response',id:message.id,ok:false,error:{message:'Falha de teste'}}})),400);else send(message,...args);};
  });
  const beforeReject=await frame.evaluate(()=>ganza.state.balance);
  await frame.locator('#drop').click();await frame.waitForFunction(()=>ganza.state.failed);
  assert.deepEqual(await frame.evaluate(()=>({launch:ganza.scene.launch,air:ganza.state.air,balance:ganza.state.balance,history:ganza.state.history.length})),{launch:null,air:0,balance:beforeReject,history:4});
  await frame.evaluate(()=>restoreLaunchSend());
  const screenshot=join(tmpdir(),`ganza-launch-${width}.png`);await page.screenshot({path:screenshot});
  console.log(JSON.stringify({width,launchMs:metrics.launchMs,pendingFrameMs:Math.round(pending.age),pendingShot,drawP95:Math.round(metrics.drawP95*10)/10,characterP95:Math.round(metrics.characterP95*10)/10,buoysPainted:metrics.pins,frames:metrics.frames,screenshot}));
  await context.close();
 }
}finally{await browser?.close();server.kill();}
