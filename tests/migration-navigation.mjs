import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const server=await createServer({mode:'test',server:{port:0}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try {
  const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route(/https:\/\//,route=>route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=server.resolvedUrls.local[0];
  await page.goto(base+'#/players');
  await page.locator('#player-grid').waitFor();
  assert.match(await page.title(),/Jogadores/);
  await page.reload();await page.locator('#player-grid').waitFor();
  assert.equal(new URL(page.url()).hash,'#/players');
  await page.locator('.desktop-nav a[href="#/statistics"]').click();
  await page.locator('#statistics-table').waitFor();
  await page.goBack();await page.locator('#player-grid').waitFor();
  await page.goForward();await page.locator('#statistics-table').waitFor();
  await page.evaluate(()=>{location.hash='#/not-a-page';});
  await page.getByRole('heading',{name:'Página não encontrada'}).waitFor();
  await page.locator('#main a[href="#/"]').click();await page.locator('.dashboard-greeting').waitFor();
  await page.locator('#install-app').waitFor();
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  await page.waitForFunction(()=>!document.querySelector('#install-app')&&!document.querySelector('.install-spotlight'));
  await page.locator('#logout').click();await page.locator('.auth-tabs').waitFor();
  await page.locator('input[name="username"]').fill('pedro');
  await page.locator('input[name="password"]').fill('password');
  await page.locator('#auth-form button[type="submit"],#auth-form .btn-primary').last().click();
  await page.locator('.dashboard-greeting').waitFor();
  for(const path of ['functions/index.js','.secret.local','firebase.json']) {
    const response=await fetch(new URL(`/@fs/${resolve(path).replaceAll('\\','/')}`,base));
    assert.ok([403,404].includes(response.status),`Private dev resource blocked: ${path}`);
  }
  const encoded=await fetch(new URL('/assets/%2e%2e%2ffunctions%2findex.js',base)).then(response=>response.text());
  assert.doesNotMatch(encoded,/notificationFunctions|defineSecret/,'Encoded public-asset traversal does not expose server code');
  assert.deepEqual(errors,[]);
  console.log('Navigation: direct hash, refresh, back/forward, unknown page, install completion, logout/login and dev privacy passed.');
} finally {await browser.close();await server.close();}
