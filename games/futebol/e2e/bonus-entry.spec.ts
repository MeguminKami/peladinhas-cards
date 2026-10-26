import {test,expect,type Page} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';
async function setup(page:Page){await page.goto('/');await page.waitForLoadState('networkidle');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.removeItem('slot-bonus-entry-v1');localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:false,lines:true,sound:false}));},createSession('retrigger-fixture-0'));await page.reload();await page.waitForLoadState('networkidle');}
test('entrada normal aguarda CONTINUAR, resiste a Escape, dez segundos e reload',async({page})=>{
 test.setTimeout(45000);await setup(page);await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();
 await expect(page.locator('#modal')).toHaveAttribute('data-kind','bonus-entry',{timeout:15000});await expect(page.locator('.bonus-entry-stage p')).toContainText('mais frequência');
 const confirmed=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await page.keyboard.press('Escape');await page.waitForTimeout(10500);await expect(page.locator('#enter-bonus')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(confirmed);
 await page.reload();await expect(page.locator('#enter-bonus')).toBeVisible();await page.screenshot({path:'test-results/bonus-entry-normal.png'});await page.locator('#enter-bonus').click();await expect(page.locator('#modal')).not.toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(confirmed);
 await page.reload();await expect(page.locator('#enter-bonus')).toHaveCount(0);
});
test('entrada superior explica poderes e Wilds fixos, com layout horizontal',async({page})=>{
 await page.setViewportSize({width:844,height:390});await setup(page);await page.locator('#bonus-shop').click();await page.locator('#buy-superior').click();await page.locator('#confirm-buy').click();await expect(page.locator('#enter-bonus')).toBeVisible({timeout:15000});
 await expect(page.locator('.bonus-entry-stage h3')).toHaveText('Noite de Glória');await expect(page.locator('.bonus-entry-stage p')).toContainText('roubam sempre');await expect(page.locator('.bonus-entry-stage p')).toContainText('ficar fixos');
 for(const selector of ['.bonus-entry-stage h3','.bonus-entry-stage p','#enter-bonus']){const bounds=await page.locator(selector).boundingBox();expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(390);}await page.screenshot({path:'test-results/bonus-entry-superior.png'});await page.locator('#enter-bonus').click();
});
test('bónus natural apresenta o mesmo ecrã de entrada no telemóvel',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 let session=createSession('natural-0');for(let i=0;i<5000;i++){session=execute(createSession('natural-'+i),{type:'start',mode:'base'},'base','date');if(session.active)break;}
 expect(session.active).not.toBeNull();await page.evaluate(s=>localStorage.setItem('slot-local-v1',JSON.stringify(s)),session);await page.reload();await expect(page.locator('#enter-bonus')).toBeVisible();await page.screenshot({path:'test-results/bonus-entry-mobile.png'});expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length)).toBe(1);
 await page.locator('#enter-bonus').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length)).toBe(1);
});
