import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {seedDocumentation} from './documentation-fixtures.mjs';
const root=resolve('.'), mode=process.argv[2]||'baseline', output=resolve('artifacts/migration',mode), reference=mode==='baseline'||process.argv.includes('--reference');
if(reference&&existsSync(resolve(output,'report.json')))throw new Error('Reference capture already exists; choose a new output name to preserve it.');
mkdirSync(output,{recursive:true});
if(existsSync(resolve(output,'report.json')))cpSync(resolve(output,'report.json'),resolve(output,`report-previous-${Date.now()}.json`));
const snapshot=resolve('artifacts/migration/reference-source');
if(reference&&!existsSync(snapshot)){
 mkdirSync(snapshot,{recursive:true});
 for(const name of ['index.html','js','css']) cpSync(resolve(root,name),resolve(snapshot,name),{recursive:true});
}
const server=createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const relative=pathname==='/'?'index.html':pathname.slice(1);
 const file=resolve(reference&&['index.html','js','css'].includes(relative.split('/')[0])?snapshot:root,relative);
 if(!file.startsWith(root)||!existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff'})[extname(file)]||'text/plain');
 try{res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}
});
let vite;
if(reference)await new Promise(r=>server.listen(0,'127.0.0.1',r));
else {const {createServer}=await import('vite');vite=await createServer({mode:'test',server:{port:0}});await vite.listen();}
const baseURL=reference?`http://127.0.0.1:${server.address().port}`:vite.resolvedUrls.local[0];
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/js/firebase.js',r=>r.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
for(const module of ['db','auth'])await context.route(`**/js/${module}.js`,r=>r.fulfill({contentType:'text/javascript',body:readFileSync(`tests/fixtures/${module}.js`,'utf8').replaceAll('../../js/utils.js','./utils.js')}));
await context.route(/https:\/\//,r=>r.abort());
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(12000);
const routes=[['ranking','#/ranking','.ranking-list'],['tickets','#/tickets','#ticket-filter'],['admin-support','#/admin/support','#ticket-filter'],['admin-events','#/admin/events','#new-event'],['admin-catalog','#/admin/card-types','.card-types-toolbar'],['admin-audit','#/admin/ovr/pedro','#ovr-weights'],['profile-editor','#/profile/edit','#profile-form'],['home','#/','.dashboard-greeting'],['players','#/players','#player-grid'],['profile','#/profile','.player-hero'],['games','#/games','.game-list'],['game-setup','#/game/demo-next','.team-balance-panel'],['game-result','#/game/demo-game-0','.score-panel'],['feedback','#/game/demo-game-0/feedback','.feedback-workspace'],['missions','#/missions','.missions-workspace'],['events','#/events','#public-event-list'],['admin','#/admin','.admin-overview'],['cards','#/admin/cards','.lab-preview'],['statistics','#/statistics','#statistics-sort'],['support','#/tickets/demo-support','.ticket-message'],['notifications','#/notifications','.notification-view-tabs'],['admin-players','#/admin/players','.admin-player-actions'],['admin-games','#/admin/games','.game-list'],['admin-weights','#/admin/weights','#ovr-settings'],['admin-messages','#/admin/messages','#admin-message'],['admin-maintenance','#/admin/maintenance','#rebuild-league'],['admin-ratings','#/admin/ratings','.ratings-browser']];
try{
 await page.goto(baseURL);
 await page.locator('.dashboard-greeting').waitFor();
 if(reference)await page.evaluate(seedDocumentation);
 else await page.evaluate(`(${seedDocumentation.toString().replaceAll('./js/',`/@fs/${root.replaceAll('\\','/')}/js/`)})()`);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:960});
  for(const [name,hash,selector]of routes){
   if(process.argv[3] && !process.argv[3].split(',').includes(name) && !(process.argv[3]==='admin-detail'&&name.startsWith('admin-'))) continue;
   await page.evaluate(hash=>{location.hash=hash},hash);
   try{
    await page.locator(selector).first().waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);
    for(const theme of ['club','volt','champions','ultimate']){
     if(name==='home')await page.locator('[data-podium-mode="ovr"]').click();
     await page.evaluate(async ({theme,module})=>{(await import(module)).applyTheme(theme);scrollTo(0,0)},{theme,module:reference?'/js/themes.js':`/@fs/${root.replaceAll('\\','/')}/js/themes.js`});
     await page.mouse.move(0,0);
     const filename=`${name}-${width}-${theme}.png`;
     await page.screenshot({path:resolve(output,filename),animations:'disabled'});
     let comparison;
     const comparisonSource=process.argv.find(value=>value.startsWith('--compare='))?.slice(10)||'baseline';
     const before=resolve('artifacts/migration',comparisonSource,filename);
     if(mode!=='baseline'&&existsSync(before))comparison=await page.evaluate(async sources=>{
      const images=await Promise.all(sources.map(source=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=source})));
      const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;const context=canvas.getContext('2d');
      context.drawImage(images[0],0,0);const a=context.getImageData(0,0,canvas.width,canvas.height).data;
      context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(images[1],0,0);const b=context.getImageData(0,0,canvas.width,canvas.height).data;
      let changed=0;for(let index=0;index<a.length;index+=4)if(Math.max(Math.abs(a[index]-b[index]),Math.abs(a[index+1]-b[index+1]),Math.abs(a[index+2]-b[index+2]))>35)changed++;
      return {changedPixels:changed,totalPixels:canvas.width*canvas.height,changedPercent:Number((changed/(canvas.width*canvas.height)*100).toFixed(2))};
     },[before,resolve(output,filename)].map(file=>'data:image/png;base64,'+readFileSync(file).toString('base64')));
     results.push({name,hash,width,theme,filename,comparison,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth}))});
    }
   }catch(error){results.push({name,hash,width,error:error.message});console.log(`${mode} ${name} ${width}: ${error.message.split('\n')[0]}`);}
   writeFileSync(resolve(output,'progress.json'),JSON.stringify({mode,errors,results},null,2));
  }
 }
 if(!process.argv[3] || process.argv[3]==='states')for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:960});
  await page.evaluate(async module=>{(await import(module)).applyTheme('club');location.hash='#/'},reference?'/js/themes.js':`/@fs/${root.replaceAll('\\','/')}/js/themes.js`);
  await page.locator('.install-spotlight').waitFor();
  await page.locator('.install-spotlight').screenshot({path:resolve(output,`installation-${width}-club.png`),animations:'disabled'});
  await page.locator('[data-install-platform="ios"]').click();
  await page.locator('.modal').screenshot({path:resolve(output,`installation-modal-${width}-club.png`),animations:'disabled'});
  await page.keyboard.press('Escape');
  await page.locator('#theme-picker').click();
  await page.locator('.modal').screenshot({path:resolve(output,`themes-modal-${width}-club.png`),animations:'disabled'});
  await page.keyboard.press('Escape');
  if(width<801){await page.locator('#mobile-more').click();await page.screenshot({path:resolve(output,`mobile-menu-${width}-club.png`),animations:'disabled'});await page.keyboard.press('Escape');}
 }
 const guest=await context.newPage();await guest.addInitScript(()=>window.__guest=true);
 await guest.goto(baseURL);await guest.locator('.auth-tabs').waitFor();await guest.evaluate(async module=>{(await import(module)).applyTheme('club')},reference?'/js/themes.js':`/@fs/${root.replaceAll('\\','/')}/js/themes.js`);
 for(const width of [1440,768,390,320]){await guest.setViewportSize({width,height:960});await guest.screenshot({path:resolve(output,`auth-${width}-club.png`),animations:'disabled'});}
 if(process.argv[3]==='register-profile'){
  await guest.locator('[data-mode=register]').click();
  await guest.locator('[name=username]').fill('novo_jogador');
  await guest.locator('[name=password]').fill('password123');
  await guest.locator('[name=confirmPassword]').fill('password123');
  await guest.locator('#auth-form button').last().click();
  await guest.locator('[name=displayName]').waitFor();
  for(const width of [1440,768,390,320]){
   await guest.setViewportSize({width,height:1000});
   await guest.screenshot({path:resolve(output,`register-profile-${width}-club.png`),fullPage:true,animations:'disabled'});
  }
 }
}finally{writeFileSync(resolve(output,'report.json'),JSON.stringify({mode,errors,results},null,2));await browser.close();if(vite)await vite.close();else await new Promise(r=>server.close(r));}
console.log(JSON.stringify({mode,captures:results.filter(r=>r.filename).length,failures:results.filter(r=>r.error),errors},null,2));
