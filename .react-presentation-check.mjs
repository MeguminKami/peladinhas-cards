import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext({serviceWorkers:'block'});
await context.route('**/js/firebase.js',r=>r.fulfill({contentType:'text/javascript',body:'export const configured=true;'}));
await context.route('**/js/db.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/fixtures/db.js','utf8').replaceAll('../../js/','./')}));
await context.route('**/js/auth.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/fixtures/auth.js','utf8')}));
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('test-results/react-presentation',{recursive:true});
for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});for(const [hash,title] of [['#/','home'],['#/statistics','statistics'],['#/profile','profile'],['#/profile/edit','edit']]){await page.goto('http://127.0.0.1:5173/'+hash);await page.waitForTimeout(1200);const detail=await page.evaluate(()=>({title:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,parserErrors:document.querySelectorAll('parsererror').length}));console.log(width,title,JSON.stringify(detail));await page.screenshot({path:`test-results/react-presentation/${title}-${width}.png`,fullPage:true});}}
console.log('ERRORS',JSON.stringify(errors));await browser.close();
