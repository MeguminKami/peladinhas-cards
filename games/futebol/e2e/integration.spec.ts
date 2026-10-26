import {test,expect} from '@playwright/test';

test('website controla saldo, slot compacta expande e seed continua entre sessões',async({page})=>{
 test.setTimeout(45000);await page.goto('/host-demo.html');
 const frame=page.frameLocator('iframe');await expect(frame.locator('body')).toHaveAttribute('data-assets','ready',{timeout:20000});
 const initial=await frame.locator('body').evaluate(()=>{const key='slot-local-v1:player:demo-player';localStorage.setItem(key+':preferences',JSON.stringify({speed:'super',autoFs:false,reduced:true,sound:false,lines:false}));return JSON.parse(localStorage.getItem(key)!);});
 expect(initial.balance).toBe(100000);expect(initial.seed.value).toBeTruthy();
 await frame.locator('body').evaluate(()=>location.reload());await expect(frame.locator('body')).toHaveAttribute('data-assets','ready');
 await frame.locator('#fullscreen').click();await expect(frame.locator('body')).toHaveAttribute('data-expanded','true');
 const expanded=await page.locator('#slot-container').boundingBox();expect(expanded!.x).toBe(0);
 await frame.locator('#fullscreen').click();await expect(frame.locator('body')).toHaveAttribute('data-expanded','false');
 await page.locator('#host-topup').click();await expect(frame.locator('#balance')).toHaveText(/2.?000,00/);
 await frame.locator('#spin').click();await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('football-host-demo-wallet')!).transactions).length)).toBe(1);
 const saved=await frame.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1:player:demo-player')!));
 expect(saved.history).toHaveLength(1);expect(saved.seed.value).toBe(initial.seed.value);expect(saved.rngState).not.toBe(initial.rngState);
 const wallet=await page.evaluate(()=>JSON.parse(localStorage.getItem('football-host-demo-wallet')!));expect(saved.balance).toBe(wallet.balance);
 await page.reload();await expect(frame.locator('body')).toHaveAttribute('data-assets','ready');
 expect(await frame.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1:player:demo-player')!).rngState)).toBe(saved.rngState);
 await frame.locator('#settings').click();await expect(frame.locator('#topup')).not.toBeVisible();await expect(frame.locator('#reset-session')).not.toBeVisible();
});

test('pedido liquidado sem resposta recupera após reload sem nova cobrança ou sorteio',async({page})=>{
 await page.route('**/wallet-fixture.html',route=>route.fulfill({contentType:'text/html',body:`<div id="game"></div><script type="module">
 import {mountSlot} from '/web/host-sdk.ts';
 const key='recover-wallet';const read=()=>JSON.parse(localStorage.getItem(key)||'{"balance":100000,"tx":{}}');
 mountSlot(document.querySelector('#game'),{src:'/embed.html',playerId:'recover',getBalance:async()=>read().balance,settle:async tx=>{const w=read();if(w.tx[tx.id])return {balance:w.balance};w.balance+=tx.credit-tx.debit;w.tx[tx.id]=true;localStorage.setItem(key,JSON.stringify(w));throw Error('Resposta perdida depois de liquidar');}});
 </script>`}));
 await page.goto('/wallet-fixture.html');const frame=page.frameLocator('iframe');await expect(frame.locator('body')).toHaveAttribute('data-assets','ready',{timeout:20000});
 await frame.locator('#spin').click();await expect(frame.locator('#spin')).toBeDisabled();
 await expect.poll(()=>frame.locator('body').evaluate(()=>!!localStorage.getItem('slot-local-v1:player:recover:wallet-pending'))).toBe(true);
 const pending=await frame.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1:player:recover:wallet-pending')!));
 const wallet=await page.evaluate(()=>localStorage.getItem('recover-wallet'));
 await page.reload();await expect(frame.locator('body')).toHaveAttribute('data-assets','ready',{timeout:20000});
 const recovered=await frame.locator('body').evaluate(()=>({s:JSON.parse(localStorage.getItem('slot-local-v1:player:recover')!),pending:localStorage.getItem('slot-local-v1:player:recover:wallet-pending')}));
 expect(recovered.pending).toBeNull();expect(recovered.s.rngState).toBe(pending.next.rngState);expect(recovered.s.history[0].spins).toHaveLength(1);expect(await page.evaluate(()=>localStorage.getItem('recover-wallet'))).toBe(wallet);
});

test('renovar seed é explícito e preserva saldo e histórico',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));
 await page.locator('#settings').click();await page.locator('#renew-seed').click();
 await expect(page.locator('#current-seed')).not.toHaveText(before.seed.value);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(after.balance).toBe(before.balance);expect(after.history).toEqual(before.history);expect(after.seed.generation).toBe(before.seed.generation+1);
 await page.reload();await page.waitForLoadState('networkidle');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).seed.value)).toBe(after.seed.value);
});
