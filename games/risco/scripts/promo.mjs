import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from '../../../tests/browser-sandbox.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const previewCharacter=process.argv.includes('--preview-character');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(relative(root,path).startsWith('..'))throw Error();res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})});
try{
  const page=await browser.newPage({viewport:{width:720,height:580},deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:${server.address().port}/game.html?demo=crash`);
  await page.waitForSelector('#loading.done',{state:'attached'});
  await page.evaluate(async({previewCharacter})=>{
    const {RiscoScene}=await import('./ui/scene.js');
    window.promoCanvas=document.createElement('canvas');promoCanvas.style.cssText='position:fixed;inset:0;width:720px;height:580px;z-index:100;background:#090912';document.body.append(promoCanvas);
    window.promoScene=new RiscoScene(promoCanvas);await promoScene.load();
    if(previewCharacter){
      const atlas=new Image();await new Promise((resolve,reject)=>{atlas.onload=resolve;atlas.onerror=reject;atlas.src='art-src/lcd-cocaine-atlas-preview.webp';});
      promoScene.atlas=atlas;promoScene.characterFrames=null;promoScene.characterSpec={choreography:'inhale-until-stop-v1',columns:4,rows:4,intakeAnchor:[.54,.8]};
    }
    window.drawPromo=(kind,ms)=>{
      const max=kind==='max',crashed=!max&&ms>=4000,m=max?999900:ms<4000?Math.floor(100*Math.exp(ms/4000*Math.log(3.47))):347;
      promoScene.render({time:ms,multiplierCents:m,phase:max?'max-win':crashed?'crashed':'running',phaseTime:max?ms:crashed?ms-4000:ms,variant:0});
      const c=promoScene.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.font='800 44px Oxanium';c.fillStyle='#c7ff39';c.fillText('RISCO',32,57);c.font='11px Oxanium';c.fillStyle='#c8b4dd';c.fillText('LCD / THE GLITCH',34,77);
      c.textAlign='center';c.font='800 64px Oxanium';c.fillStyle=max?'#ffdc82':crashed?'#ff658e':'#e8e1f3';c.fillText(max?'9 999×':(m/100).toFixed(2).replace('.',',')+'×',490,175);c.font='13px Oxanium';c.fillText(max?'MAX WIN':crashed?'CRASH':'O RISCO É TEU.',490,205);c.font='10px Oxanium';c.fillStyle='#b2a0c8';c.fillText('PELADINHAS · CRÉDITOS FICTÍCIOS',360,554);c.restore();
    };
  },{previewCharacter});
  const promo=resolve(root,previewCharacter?'art-src/character-preview':'promo'),frames=resolve(root,previewCharacter?'art-src/character-preview/frames':'art-src/promo-frames');await mkdir(promo,{recursive:true});await mkdir(frames,{recursive:true});
  const coverOnly=process.argv.includes('--cover-only');
  for(const kind of coverOnly?[]:previewCharacter?['crash']:['crash','max']){
    const count=kind==='crash'?84:72;
    const dir=resolve(frames,kind);await mkdir(dir,{recursive:true});
    for(let frame=0;frame<count;frame++){await page.evaluate(({kind,ms})=>drawPromo(kind,ms),{kind,ms:frame*1000/12});await page.locator('body > canvas').screenshot({path:resolve(dir,String(frame).padStart(3,'0')+'.png')});}
    const python=spawnSync('python',['-c',`from PIL import Image\nfrom pathlib import Path\nimport sys\na=[Image.open(p).convert('RGB').quantize(colors=128,method=2) for p in sorted(Path(sys.argv[1]).glob('*.png'))]\na[0].save(sys.argv[2],save_all=True,append_images=a[1:],duration=83,loop=0,optimize=False)`,dir,resolve(promo,kind==='max'?'max-win.gif':'crash.gif')],{encoding:'utf8'});if(python.status)throw Error(python.stderr);
  }
  const recording=coverOnly?null:await page.evaluate(async()=>{
    const type=['video/mp4;codecs=avc1.42001E','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
    if(!type)return null;
    const stream=promoCanvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2500000}),chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();const start=performance.now();
    await new Promise(resolve=>{const step=()=>{const elapsed=performance.now()-start;drawPromo('crash',Math.min(elapsed,6999));if(elapsed<7000)requestAnimationFrame(step);else resolve();};step();});
    recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const bytes=new Uint8Array(await new Blob(chunks,{type}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);return btoa(binary);
  });
  if(recording)await writeFile(resolve(promo,'crash.mp4'),Buffer.from(recording,'base64'));
  else if(!coverOnly)console.warn('MP4 indisponível neste browser, GIF exportado.');
  if(previewCharacter){console.log('Pré-visualização privada em art-src/character-preview, sem integrar ou publicar a nova personagem.');}
  else{
  await page.setViewportSize({width:720,height:1080});
  await page.evaluate(()=>{
    promoCanvas.style.height='1080px';promoScene.render({time:3100,multiplierCents:347,phase:'running'});
    const c=promoScene.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.textAlign='center';c.fillStyle='#c7ff39';c.font='800 116px Oxanium';c.fillText('RISCO',360,150);c.fillStyle='#cfb8e3';c.font='17px Oxanium';c.fillText('LCD / THE GLITCH',360,190);c.fillStyle='#e9e2f4';c.font='800 100px Oxanium';c.fillText('3,47×',360,376);c.font='16px Oxanium';c.fillStyle='#c7ff39';c.fillText('UMA LINHA. UMA DECISÃO.',360,418);c.font='12px Oxanium';c.fillStyle='#c0a8d3';c.fillText('PELADINHAS · CRÉDITOS FICTÍCIOS',360,1040);c.restore();
  });
  await page.locator('body > canvas').screenshot({path:resolve(root,'art-src/capa.png')});
  const convert=spawnSync('python',['-c','from PIL import Image;import sys;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=90,method=6)',resolve(root,'art-src/capa.png'),resolve(promo,'capa.webp')],{encoding:'utf8'});if(convert.status)throw Error(convert.stderr);
  console.log(coverOnly?'Capa 720×1080 exportada a partir de RiscoScene.':'Promo exportada a partir de RiscoScene: crash.gif, max-win.gif, capa.webp'+(recording?', crash.mp4':''));
  }
}finally{await browser.close();await new Promise(done=>server.close(done));}
