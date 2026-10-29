import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {chromium} from '../../../node_modules/playwright/index.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://local');
  const path=url.pathname==='/fit.css'?resolve(root,'../../css/casino-rift-fit.css'):resolve(root,'.'+url.pathname);
  if(url.pathname!=='/fit.css'&&!path.startsWith(root))throw Error('Invalid path');
  let content=await readFile(path);
  if(extname(path)==='.html')content=content.toString().replace('<html lang="pt">','<html lang="pt" data-casino-fit>').replace('</head>','<link rel="stylesheet" href="/fit.css"></head>');
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try{
 for(const [width,height] of [[1564,768],[1024,640],[390,720]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await page.goto(origin+'/index.html');await page.locator('#board .tile').first().waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  if(width>=1000){
   await page.evaluate(()=>{document.querySelector('#global').textContent='\u00d7100';document.querySelector('#global').dataset.digits='3';document.querySelector('#fsPanel').hidden=false;document.querySelector('#fs').textContent='39 / 40';});
   await page.waitForTimeout(350);
   const metrics=await page.evaluate(()=>{
    const rail=document.querySelector('.left'),board=document.querySelector('.board-frame'),powers=[...document.querySelectorAll('.powers>div')];
    return {children:[...rail.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>rail.getBoundingClientRect().right+1).map(e=>[e.tagName,e.className?.baseVal??e.className,e.getBoundingClientRect().right]),width:rail.clientWidth,font:parseFloat(getComputedStyle(powers[0]).fontSize),last:powers.at(-1).getBoundingClientRect().bottom,bottom:board.getBoundingClientRect().bottom,global:parseFloat(getComputedStyle(document.querySelector('#global')).fontSize)};
   });
   assert.ok(metrics.width>=190,JSON.stringify(metrics));assert.ok(metrics.font>=13);assert.ok(metrics.global>=30);assert.deepEqual(metrics.children,[],JSON.stringify(metrics));assert.ok(metrics.last<=metrics.bottom,JSON.stringify(metrics));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(tmpdir(),`rift-rail-${width}.png`)});
  await page.close();console.log(`Rail and viewport verified at ${width}x${height}`);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}

