import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Reuse the established browser/worker mock rather than duplicate its contract.
const reference=readFileSync('tests/push-ui.mjs','utf8');
const begin=reference.indexOf('await page.evaluate(async () => {')+'await page.evaluate(async () => {'.length;
const end=reference.indexOf('window.__push = await import',begin);
assert.ok(begin>0&&end>begin,'Established push fixture is available');
const server=await createServer({mode:'test',server:{port:0}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try {
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route(/https:\/\//,route=>route.abort());
  await context.addInitScript(`(() => {${reference.slice(begin,end)}})()`);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]+'#/notifications');
  await page.locator('[data-push-enable]').waitFor();
  await page.locator('[data-push-enable]').click();
  await page.locator('[data-push-test]').waitFor();
  assert.deepEqual(await page.evaluate(()=>window.__permissionCalls),[true],'Permission is requested in the user gesture');
  assert.equal(await page.evaluate(()=>window.__subscriptions),1);
  await page.locator('[data-push-test]').click();
  await page.waitForFunction(()=>window.__adminCalls.some(call=>call.name==='pushDeviceAction'&&call.data.action==='test'));
  await page.locator('[data-push-retry]').click();
  await page.waitForFunction(()=>window.__adminCalls.some(call=>call.name==='pushDeviceAction'&&call.data.action==='sync'));
  await page.locator('[data-push-disable]').click();
  await page.locator('[data-push-enable]').waitFor();
  assert.equal(await page.evaluate(()=>window.__unsubscribes),1);
  await page.evaluate(()=>window.__setPermission('denied'));
  await page.getByRole('button',{name:'Ver como permitir'}).click();
  await page.getByRole('dialog',{name:'Permitir notificações'}).waitFor();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
  console.log('React push: permission gesture, activation, device test, reconnect, unsubscribe and denied guidance passed.');
} finally {await browser.close();await server.close();}
