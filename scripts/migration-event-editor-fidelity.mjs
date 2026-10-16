import {createServer as createHTTPServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {seedDocumentation} from './documentation-fixtures.mjs';
const root=resolve('.'),reference=process.argv.includes('--reference');
const output=resolve('artifacts/migration',process.argv[2]||'resume-event-editor-verified');
if(existsSync(resolve(output,'report.json')))throw Error('Choose a new output directory to preserve existing captures.');
mkdirSync(output,{recursive:true});
let server,url;
if(reference){
 server=createHTTPServer((req,res)=>{
  const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const file=resolve(['index.html','js','css'].includes(relative.split('/')[0])?'artifacts/migration/reference-source':root,relative);
  if(!file.startsWith(root)||!existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff'})[extname(file)]||'text/plain');
  res.end(readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
}else{const {createServer}=await import('vite');server=await createServer({mode:'test',server:{port:0}});await server.listen();url=server.resolvedUrls.local[0];}
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const ctx=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
await ctx.route('**/js/firebase.js',r=>r.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
for(const name of ['db','auth'])await ctx.route(`**/js/${name}.js`,r=>r.fulfill({contentType:'text/javascript',body:readFileSync(`tests/fixtures/${name}.js`,'utf8').replaceAll('../../js/','./')}));
await ctx.route(/https:\/\//,r=>r.abort());
const page=await ctx.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
async function capture(name,width,selector='#event-editor'){
 if(selector==='#event-editor')await page.evaluate(()=>document.activeElement?.blur());
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);
 const filename=`${name}-${width}.png`,path=resolve(output,filename);
 // Component comparison: global fixed chrome is covered by the route matrix.
 await page.locator(selector).screenshot({path,animations:'disabled',style:'#header,.bottom-nav{visibility:hidden!important;}'});
 const before=resolve('artifacts/migration',process.argv.find(a=>a.startsWith('--compare='))?.slice(10)||'resume-event-editor-reference',filename);
 let comparison;
 if(!reference&&existsSync(before))comparison=await page.evaluate(async sources=>{
  const images=await Promise.all(sources.map(src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src})));
  if(images[0].width!==images[1].width||images[0].height!==images[1].height)return {sizeMismatch:true,before:[images[0].width,images[0].height],after:[images[1].width,images[1].height]};
  const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;const c=canvas.getContext('2d');
  c.drawImage(images[0],0,0);const a=c.getImageData(0,0,canvas.width,canvas.height).data;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(images[1],0,0);const b=c.getImageData(0,0,canvas.width,canvas.height).data;
  let changed=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>35)changed++;
  return {changedPercent:100*changed/(canvas.width*canvas.height)};
 },[before,path].map(p=>'data:image/png;base64,'+readFileSync(p).toString('base64')));
 results.push({name,width,comparison,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,fields:[...document.querySelectorAll('#event-builder-form input,#event-builder-form select,#event-builder-form textarea')].map(f=>({name:f.name,value:f.value,visible:!!f.getClientRects().length}))}))});
}
try{
 await page.goto(url);await page.locator('.dashboard-greeting').waitFor();
 await page.evaluate(`(${seedDocumentation.toString().replaceAll('./js/',reference?'/js/':`/@fs/${root.replaceAll('\\','/')}/js/`)})()`);
 await page.evaluate(()=>{window.__testState.cardThemes=[{id:'test-studio',name:'Edição da Liga',baseTheme:'toty',colors:{primary:'#7c3aed',secondary:'#ec4899'},design:{}}];location.hash='#/admin/events';});
 await page.locator('#new-event').waitFor();
 for(const kind of ['event','mission','vote'])for(const width of [1440,320]){
  await page.setViewportSize({width,height:1000});
  await page.locator(kind==='mission'?'#new-mission':'#new-event').click();
  await page.locator('[name=title]').fill('Taça Peladinhas de Outubro');
  await page.locator('textarea[name=description]').fill('Os melhores desempenhos da nossa liga.');
  for(let step=0;step<5;step++){
   await page.locator(`[data-editor-step="${step}"]`).click();
   if(step===1&&kind!=='vote'){if(kind==='event')await page.locator('[data-selection-method=objective]').click();await page.locator('[data-objective-family=stars]').click();}
   if(step===2){await page.locator('[name=startsAt]').fill('2026-10-16T12:00');await page.locator('[name=endsAt]').fill('2026-10-23T12:00');}
   if(step===3){await page.locator('[data-reward-mode=both]').first().click();await page.locator('[name=specialId]').first().selectOption('saved:test-studio');await page.locator('[name=boost-pace]').first().fill('2');}
   await capture(`${kind}-step-${step}`,width);
  }
  await page.locator('#event-preview').click();await page.locator('.event-preview').waitFor();await capture(`${kind}-preview`,width,'.modal');await page.keyboard.press('Escape');
  await page.locator('#close-editor').click();
 }
}finally{writeFileSync(resolve(output,'report.json'),JSON.stringify({reference,errors,results},null,2));await browser.close();if(reference)await new Promise(r=>server.close(r));else await server.close();}
console.log(JSON.stringify({reference,captures:results.length,errors,comparisons:results.map(r=>({name:r.name,width:r.width,comparison:r.comparison}))},null,2));
