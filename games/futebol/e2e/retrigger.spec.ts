import {test,expect,type Page} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';
async function setup(page:Page,pending=false){
 await page.goto('/');await page.waitForLoadState('networkidle');
 const initial=createSession('retrigger-fixture-125');
 const session=pending?execute(initial,{type:'start',mode:'normal'},'saved','date'):initial;
 await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));if(s.active){const row=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${row.id}:${row.date}:${row.mode}`);}localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:false,lines:true}));},session);
 await page.reload();await page.waitForLoadState('networkidle');return session;
}
test('retrigger real apresenta +5 FS, contador sob global e clique único',async({page})=>{
 await setup(page);await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').click({timeout:20000});
 await expect(page.getByRole('heading',{name:'Prolongamento!'})).toBeVisible({timeout:15000});
 await expect(page.locator('.retrigger-award')).toHaveText('+5');await expect(page.locator('#fs')).toHaveText('1 / 15');await expect(page.locator('#fs-total')).toHaveText('SPIN / TOTAL');
 const position=await page.evaluate(()=>{const global=document.querySelector('#global')!.getBoundingClientRect(),fs=document.querySelector('#free-spins-panel')!.getBoundingClientRect();return {globalBottom:global.bottom,fsTop:fs.top};});expect(position.fsTop).toBeGreaterThanOrEqual(position.globalBottom);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(saved.history[0].spins).toHaveLength(1);expect(saved.pendingRetrigger.awarded).toBe(5);
 await page.screenshot({path:'test-results/retrigger-celebration.png'});
 await page.locator('#continue-retrigger').evaluate((el:HTMLElement)=>{el.click();el.click();});await expect(page.locator('#modal')).not.toBeVisible();
 const ack=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(ack.pendingRetrigger).toBeNull();expect(ack.active.remaining).toBe(14);expect(ack.balance).toBe(saved.balance);expect(ack.rngState).toBe(saved.rngState);
 await page.locator('#spin').click();await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].cost)).toBe(1800);
});
test('retrigger recuperado espera dez segundos, anima e continua sem duplicar FS',async({page})=>{
 const saved=await setup(page,true);await expect(page.getByRole('heading',{name:'Prolongamento!'})).toBeVisible();
 const animation=await page.locator('.retrigger-award').evaluate(el=>getComputedStyle(el).animationName);expect(animation).toBe('retrigger-number');
 await page.keyboard.press('Escape');await expect(page.locator('#modal')).toBeVisible();
 await page.waitForTimeout(1000);await expect(page.locator('#modal')).toBeVisible();
 await expect(page.locator('#modal')).not.toBeVisible({timeout:11000});
 const actual=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(actual.pendingRetrigger).toBeNull();expect(actual.active.remaining).toBe(14);expect(actual.history[0].spins).toEqual(saved.history[0].spins);expect(actual.balance).toBe(saved.balance);expect(actual.rngState).toBe(saved.rngState);
 await page.reload();await expect(page.locator('#modal')).not.toBeVisible();await expect(page.locator('#fs')).toHaveText('1 / 15');
});
test('FS automáticos aguardam o festejo e retomam depois do clique',async({page})=>{
 await setup(page,true);await page.evaluate(()=>localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:true,reduced:false,lines:true})));await page.reload();
 await expect(page.locator('#continue-retrigger')).toBeVisible();await page.waitForTimeout(400);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length)).toBe(1);
 await page.locator('#continue-retrigger').click();
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length),{timeout:10000}).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].cost)).toBe(1800);
});
