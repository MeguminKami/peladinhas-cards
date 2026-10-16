import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {seedDocumentation} from '../scripts/documentation-fixtures.mjs';
const server=await createServer({mode:'test',server:{port:0}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try{
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});await context.route(/https:\/\//,route=>route.abort());
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.resolvedUrls.local[0]);await page.locator('.dashboard-greeting').waitFor();
 await page.evaluate(`(${seedDocumentation.toString().replaceAll('./js/',`/@fs/${resolve('.').replaceAll('\\','/')}/js/`)})()`);
 const go=async(hash,selector)=>{console.log(`Admin workflow ${hash}`);await page.evaluate(hash=>{location.hash=hash},hash);await page.locator(selector).first().waitFor()};
 await go('#/admin/weights','#ovr-settings');await page.locator('#ovr-preset option').first().waitFor({state:'attached'});
 const pace=page.locator('#ovr-settings [name="pace"]'),original=await pace.inputValue();
 await pace.fill('99');assert.equal(await page.locator('#ovr-settings button').isDisabled(),true);assert.match(await page.locator('#ovr-total').textContent(),/Ajusta para 100%/);
 await pace.fill(original);assert.equal(await page.locator('#ovr-settings button').isEnabled(),true);
 await page.locator('#ovr-position').selectOption('DEF');await page.locator('#ovr-position').selectOption('ALA');assert.equal(await pace.inputValue(),original);
 await page.locator('#ovr-preset-name').fill('Validação React');await page.locator('#save-ovr-preset').click();await page.waitForFunction(()=>window.__testState.ovrPresets.some(item=>item.name==='Validação React'));
 await page.locator('#ovr-settings button').click();await page.waitForFunction(()=>window.__adminCalls.some(item=>item.name==='saveOvrWeights'));assert.ok(await page.evaluate(()=>window.__testState.ovrWeights.positions.ALA));
 await go('#/admin/messages','#admin-message');await page.locator('#admin-message [name="title"]').fill('Teste da liga');await page.locator('#admin-message [name="body"]').fill('Mensagem de demonstração com acentos.');
 await page.evaluate(()=>window.__failAdmin='adminMessage');await page.locator('#admin-message button').click();await page.getByRole('alert').filter({hasText:'Falha de teste ao guardar.'}).waitFor();assert.equal(await page.locator('#admin-message button').isEnabled(),true);assert.equal(await page.locator('#admin-message [name="title"]').inputValue(),'Teste da liga');
 await page.evaluate(()=>window.__failAdmin=undefined);await page.locator('#admin-message button').click();await page.waitForFunction(()=>document.querySelector('#admin-message [name="title"]').value==='');
 const message=await page.evaluate(()=>window.__adminCalls.filter(item=>item.name==='adminMessage').at(-1));assert.deepEqual(message.data,{title:'Teste da liga',body:'Mensagem de demonstração com acentos.'});
 await go('#/admin/players','.admin-player-actions');assert.equal(await page.locator('[data-role="pedro"]').isDisabled(),true);
 await page.locator('[data-role="joao"]').first().click();await page.locator('#cancel').click();assert.equal(await page.evaluate(()=>window.__testState.users.find(user=>user.uid==='joao').role),'member');
 await page.locator('[data-role="joao"]').first().click();await page.locator('#confirm').click();await page.waitForFunction(()=>window.__testState.users.find(user=>user.uid==='joao').role==='admin');
 await go('#/admin/games','[data-delete="demo-next"]');await page.locator('[data-delete="demo-next"]').click();await page.locator('#cancel').click();assert.equal(await page.locator('[data-delete="demo-next"]').count(),1);
 await page.locator('[data-delete="demo-next"]').click();await page.locator('#confirm').click();await page.waitForFunction(()=>!window.__testState.games.some(game=>game.id==='demo-next'));
 await page.evaluate(()=>window.__testState.users.find(user=>user.uid==='pedro').role='member');await go('#/players','#player-grid');await page.evaluate(()=>location.hash='#/admin');await page.getByRole('heading',{name:'Acesso reservado'}).waitFor();assert.equal(await page.locator('#rebuild-league').count(),0);
 await page.evaluate(()=>window.__fail=true);await page.evaluate(()=>location.hash='#/games');await page.getByRole('heading',{name:'Não foi possível carregar'}).waitFor();await page.evaluate(()=>window.__fail=false);await page.locator('#main button').click();await page.locator('.game-list').waitFor();
 // The deliberately rejected data load is logged by the runtime, not a pageerror.
 assert.deepEqual(errors,[]);console.log('React admin: weights, presets, messages, failures, roles, delete confirmation, role guard and retry passed.');
}finally{await browser.close();await server.close();}
