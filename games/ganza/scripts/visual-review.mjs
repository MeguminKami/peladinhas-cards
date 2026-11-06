import {chromium} from '../../../tests/browser-sandbox.mjs';
import {serve} from './serve.js';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'games/ganza/revisao/correcao-visual'),phase=process.argv[2]||'antes';mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
try{const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 for(const[width,height]of[[1920,1080],[1366,768],[390,844],[320,740]]){await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:${server.address().port}/games/ganza/game.html`);await page.waitForFunction(()=>ganza.scene.ready&&ganza.state.sessionId);for(const risk of ['baixo','medio','alto','extremo']){if(phase==='antes')await page.selectOption('#risk',risk);else await page.locator(`[data-risk="${risk}"]`).click();await page.waitForTimeout(1100);await page.mouse.move(0,0);await page.screenshot({path:`${out}/${phase}-${width}-${risk}.png`});results.push({width,height,risk,fps:await page.evaluate(()=>ganza.state.fps)});}}
 writeFileSync(`${out}/${phase}-results.json`,JSON.stringify(results,null,2));console.log(`${phase}: 16 capturas guardadas.`);
}finally{await browser.close();server.close();}
