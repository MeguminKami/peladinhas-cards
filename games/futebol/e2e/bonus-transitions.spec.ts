import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:false,lines:false}));},createSession('retrigger-fixture-125'));
 await page.reload();await expect(page.locator('#spin')).toBeEnabled();
});

test('compra e retrigger juntam bilhetes antes dos diálogos e sincronizam FS',async({page})=>{
 await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();
 await expect(page.locator('.bonus-transition[data-kind="entry"]')).toBeVisible({timeout:15000});
 await expect(page.locator('.bonus-transition-ticket')).toHaveCount(3);
 await expect(page.locator('#enter-bonus')).toHaveCount(0);
 await page.locator('#enter-bonus').click();
 await expect(page.locator('.bonus-transition[data-kind="retrigger"]')).toBeVisible({timeout:15000});
 await expect(page.locator('.bonus-transition-ticket')).toHaveCount(3);
 await expect(page.locator('#fs')).toHaveText('1 / 10');
 await expect(page.locator('#continue-retrigger')).toBeVisible();await expect(page.locator('#fs')).toHaveText('1 / 15');
 await page.locator('#continue-retrigger').click();await expect(page.locator('.bonus-transition')).toHaveCount(0);
 await expect(page.locator('.bonus-ticket-source')).toHaveCount(0);
});

test('fecho espera dois segundos, não aceita spins e preserva o resultado',async({page})=>{
 let s=execute(createSession('finale-fixture'),{type:'start',mode:'normal'},'start','date');
 while(s.active&&s.active.remaining>1){if(s.pendingRetrigger){const {acknowledgeRetrigger}=await import('../src/session.ts');s=acknowledgeRetrigger(s,s.pendingRetrigger);}s=execute(s,{type:'next'},'fs-'+s.revision,'date');}
 await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));const row=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${row.id}:${row.date}:${row.mode}`);},s);await page.reload();
 await page.addLocatorHandler(page.locator('.win-celebration'),async()=>{await page.locator('.win-money').click();await page.locator('.win-finish').click();});
 await page.locator('#spin').click();await expect(page.locator('.bonus-transition[data-kind="final"]')).toBeVisible({timeout:20000});
 const before=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await expect(page.locator('#summary-done')).toHaveCount(0);await page.locator('#spin').click();
 await page.waitForTimeout(1000);await expect(page.locator('.bonus-transition[data-kind="final"]')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toEqual(before);
 await expect(page.locator('#summary-done')).toBeVisible();
});

for(const width of [320,390,768,1440])test(`composição e movimento reduzido a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width<500?844:900});
 await page.evaluate(async()=>{
  const {presentBonusTransition}=await import('/web/bonus-transitions.ts');
  (window as any).transition=presentBonusTransition({kind:'final',mode:'superior',reduced:false,signal:new AbortController().signal});
 });
 await expect(page.locator('.bonus-transition')).toBeVisible();await page.waitForTimeout(700);
 await page.screenshot({path:`test-results/bonus-finale-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>(window as any).transition);
 const elapsed=await page.evaluate(async()=>{const {presentBonusTransition}=await import('/web/bonus-transitions.ts');const time=performance.now();await presentBonusTransition({kind:'final',mode:'normal',reduced:true,signal:new AbortController().signal});return performance.now()-time;});
 expect(elapsed).toBeLessThan(300);
});
