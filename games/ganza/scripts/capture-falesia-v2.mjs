import {chromium} from '../../../tests/browser-sandbox.mjs';
import {serve} from './serve.js';import {resolve,join} from 'node:path';import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../../..'),out=join(root,'games/ganza'),ffmpeg=join(tmpdir(),'ganza-tools/ffmpeg.exe');
const server=await serve(root,0),browser=await chromium.launch({headless:true,channel:'msedge'}),temp=mkdtempSync(join(tmpdir(),'ganza-capture-'));
try{
 const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/games/ganza/game.html`);await page.waitForFunction(()=>ganza.scene.ready&&ganza.state.sessionId);await page.locator('[data-risk=medio]').click();await page.locator('#drop').click();await page.waitForFunction(()=>ganza.state.history.length===1&&ganza.state.settling===0);await page.waitForTimeout(1000);await page.evaluate(async()=>{await ganza.scene.backgroundLoading;ganza.scene.stop();});
 const fps=12;
 async function frames(name,seconds,mode){const dir=join(temp,name);mkdirSync(dir);await page.evaluate(mode=>{const s=ganza.scene;s.plates=[];s.result=null;s.boatHits=new Map();s.landings=[];s.time=0;s.actorPose=0;s.actorPrevious=0;s.actorChange=-1000;s.environment=null;s.previous=null;s.transition=0;s.throwAt=-10000;s.lights.clear();s.particles.forEach(p=>p.life=0);if(mode==='queda'){ganza.demo('lancha',2);s.plates[0].start=0;}else if(mode==='carga'){ganza.demo('carga');s.plates[0].start=0;}},mode);
  for(let frame=0;frame<seconds*fps;frame++){
   await page.evaluate(({frame,fps,mode})=>{const s=ganza.scene,now=frame*1000/fps;s.time=now;
    if(mode==='moments'){
     if(frame===0||frame===fps*5){ganza.demo(frame===0?'lancha':'max',frame===0?8:2);s.plates.at(-1).start=now;}
     if(frame===fps*7||frame===fps*10||frame===fps*13||frame===fps*16){const select=document.querySelector('#risk');select.value=frame===fps*7?'baixo':frame===fps*10?'medio':frame===fps*13?'alto':'extremo';select.dispatchEvent(new Event('change'));}
     if(frame===fps*17){const r={rows:16,path:Array(16).fill(0),k:0,multiplier:999900,bet:0,payment:0};s.celebrate(r);}
    }
    s.draw(now,1/fps);document.querySelector('#skip').hidden=!(s.result&&s.result.round.multiplier>=10000);
   },{frame,fps,mode});
   await page.screenshot({type:'jpeg',quality:94,path:join(dir,`${String(frame).padStart(5,'0')}.jpg`)});
  }
  return dir;
 }
 const encode=(args)=>{const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8'});if(r.status)throw Error(r.stderr);};
 const fall=await frames('queda',6,'queda');encode(['-framerate',String(fps),'-i',join(fall,'%05d.jpg'),'-vf','scale=1280:720','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(out,'promo/queda.mp4')]);
 encode(['-framerate',String(fps),'-i',join(fall,'%05d.jpg'),'-filter_complex','scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse','-loop','0',join(out,'promo/queda.gif')]);
 const cargo=await frames('carga',11,'carga');encode(['-framerate',String(fps),'-i',join(cargo,'%05d.jpg'),'-filter_complex','scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse','-loop','0',join(out,'promo/carga-completa.gif')]);
 const moments=await frames('moments',20,'moments');encode(['-framerate',String(fps),'-i',join(moments,'%05d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(out,'revisao/falesia-v2/jogo-20s.mp4')]);
 // Export the seated pose from the real renderer, with deterministic animation state.
 await page.evaluate(()=>{const s=ganza.scene;document.querySelector('[data-risk=medio]').click();s.result=null;s.plates=[];s.boatHits=new Map();s.time=0;s.actorPose=0;s.actorPrevious=0;s.actorChange=-1000;s.environment=null;s.previous=null;s.draw(0,0);});await page.screenshot({path:join(out,'revisao/capa-runtime.png')});
 console.log('Queda MP4, dois GIFs e vídeo de revisão exportados. Frames temporários:',temp);
}finally{await browser.close();server.close();}
