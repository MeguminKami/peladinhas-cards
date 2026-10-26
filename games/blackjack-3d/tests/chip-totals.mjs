import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '../../../node_modules/playwright/index.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!path.startsWith(root+sep))throw Error('path');
 if(req.url==='/test.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><style>body{margin:0}#app{min-height:100vh}</style></head><body><div id="app"></div></body></html>');return;}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
try{
 for(const [game,bundle] of [['blackjack-3d','blackjack'],['roleta-europeia-3d','roleta']]){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());await page.goto(origin+'/test.html');
 await page.evaluate(async({game,bundle})=>{const link=document.createElement('link');link.rel='stylesheet';link.href=`/${game}/dist/sdk/${bundle}.css`;document.head.append(link);await new Promise(r=>link.onload=r);const {mount}=await import(`/${game}/dist/sdk/${bundle}.js`);window.table=mount(document.getElementById('app'),{playerId:'chip-total-regression'});await window.table.ready;await document.fonts.ready;},{game,bundle});
 await mkdir(resolve(root,game,'test-results'),{recursive:true});
 const blackjack=game==='blackjack-3d';if(blackjack)await page.locator('[data-seat-join="2"]').click();
 const zone=blackjack?'[data-seat-bet="2"]':'[data-bet-id="straight:1"]';
 const verify=async(amount,label)=>{await page.waitForTimeout(450);const tokens=await page.evaluate(()=>window.table.getChipState());assert.equal(tokens.length,1);assert.equal(blackjack?tokens[0].amount:tokens[0].value,amount);assert.equal(tokens[0].label,label);if(blackjack)assert.deepEqual(tokens[0].displayValues,[amount]);};
 await page.locator('[data-chip="2500"]').click();for(let i=0;i<3;i++)await page.locator(zone).click();await verify(7500,'75');
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:width<500?844:1000});await page.waitForTimeout(300);await page.screenshot({path:resolve(root,game,'test-results',`chip-total-${width}.png`)});}
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-chip="50"]').click();await page.locator(zone).click();await verify(7550,'75,50');
 await page.locator('[data-chip="20"]').click();await page.locator(zone).click();await verify(7570,'75,70');
 await page.locator('[data-action="undo"]').click();await verify(7550,'75,50');
 await page.locator('[data-action="clear"]').click();assert.deepEqual(await page.evaluate(()=>window.table.getChipState()),[]);
 assert.deepEqual(errors,[]);await page.close();console.log(`${game}: exact totals 75 / 75,50 / 75,70, undo, clear and four viewport captures passed`);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
