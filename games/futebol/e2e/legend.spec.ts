import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';
import {spin,start} from '../src/engine.ts';
import type {Board} from '../src/board.ts';
import {config} from '../src/config.ts';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:true,lines:true}));},createSession('legend-ui'));
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-assets','ready');
});
test('loja adapta a aposta e os três preços em 320, 390, 768 e desktop',async({page})=>{
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:width===320?568:844});await page.locator('#bonus-shop').click();
  await expect(page.locator('#buy-legend')).toContainText('450×');
  await page.locator('#shop-bet').selectOption('40');await expect(page.locator('#bet')).toHaveValue('40');
  await expect(page.locator('#buy-legend')).toContainText('180,00');
  await expect(page.locator('#buy-normal')).toContainText('36,00');
  await expect(page.locator('.bonus-shop-options')).not.toContainText(/sticky/i);
  const sizes=await page.locator('.bonus-shop-options>button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height};}));
  for(const size of sizes){expect(Math.abs(size.w-sizes[0].w)).toBeLessThan(1);expect(Math.abs(size.h-sizes[0].h)).toBeLessThan(1);}
  const layout=await page.evaluate(()=>{const panel=document.querySelector('#bonus-shop-panel')!;return {page:document.documentElement.scrollWidth<=innerWidth,panel:panel.scrollWidth<=panel.clientWidth};});
  expect(layout).toEqual({page:true,panel:true});
  await page.locator('#shop-bet').focus();await expect(page.locator('#shop-bet')).toBeFocused();
  await page.screenshot({path:`test-results/legend-shop-${width}.png`});
  await page.getByRole('button',{name:'Fechar compras'}).click();
 }
});
test('compra Lendas cobra 450× uma vez, entrada e retoma preservam estado',async({page})=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#bonus-shop').click();await page.locator('#buy-legend').click();
 await expect(page.locator('#modal-content')).toContainText('450×');await expect(page.locator('#modal-content')).not.toContainText(/sticky/i);await page.locator('#confirm-buy').click();
 await expect(page.locator('#enter-bonus')).toBeVisible();
 await expect(page.locator('.bonus-entry-stage')).toHaveAttribute('data-mode','legend');
 await page.screenshot({path:'test-results/legend-entry.png'});
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#enter-bonus')).toBeInViewport();
  await page.screenshot({path:`test-results/legend-entry-${width}.png`});
 }
 await page.locator('#enter-bonus').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:20000});
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));
 expect(s.history[0].cost).toBe(9000);expect(s.history[0].mode).toBe('legend');expect(s.balance).toBe(100000-9000+s.history[0].paid);
 await page.reload();await expect(page.locator('.machine')).toHaveAttribute('data-mode','legend');
 await expect(page.locator('#bet')).toBeDisabled();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(s);
 expect(errors).toEqual([]);
});
test('transição animada de Lendas pode ser interrompida sem mudar a sessão',async({page})=>{
 const before=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await page.evaluate(async()=>{
  // @ts-expect-error Vite browser module path, resolved at runtime.
  const {presentBonusTransition}=await import('/web/bonus-transitions.ts');
  const controller=new AbortController();
  const presentation=presentBonusTransition({kind:'entry',mode:'legend',reduced:false,signal:controller.signal});
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(!document.querySelector('.bonus-transition[data-mode=legend]'))throw Error('Transição ausente');
  controller.abort();await presentation;
 });
 await expect(page.locator('.bonus-transition')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(before);
});
test('prolongamento e apito final usam emblema e identidade Lendas',async({page})=>{
 test.setTimeout(45000);
 let s=execute(createSession('legend-retrigger'),{type:'start',mode:'legend'},'buy','date');
 const board=Array(24).fill('N1') as Board;board[0]=board[1]=board[2]='S';
 const result=spin(s.active!,s.bet,{next:()=>.99},config,true,board),row=s.history[0];
 row.spins.push(result);row.paid+=result.paid;s.balance+=result.paid;row.balance=s.balance;s.active=result.next;
 s.pendingRetrigger={roundId:row.id,spinIndex:1,awarded:5};
 await page.evaluate(data=>{localStorage.setItem('slot-local-v1',JSON.stringify(data));const row=data.history[0];localStorage.setItem('slot-bonus-entry-v1',`${row.id}:${row.date}:${row.mode}`);},s);await page.reload();
 await expect(page.locator('.retrigger-celebration')).toHaveAttribute('data-mode','legend');
 await page.screenshot({path:'test-results/legend-retrigger.png'});await page.locator('#continue-retrigger').click();
 // Local fixture: a final FS without a prize isolates the conclusion choreography.
 s.pendingRetrigger=null;s.active={...s.active!,remaining:1};
 await page.evaluate(data=>localStorage.setItem('slot-local-v1',JSON.stringify(data)),s);await page.reload();
 await page.addLocatorHandler(page.locator('.win-celebration'),async()=>{await page.locator('.win-money').click();await page.locator('.win-finish').click();});
 await page.locator('#spin').click();await expect(page.locator('.finale')).toHaveAttribute('data-mode','legend',{timeout:25000});
 await page.screenshot({path:'test-results/legend-summary.png'});await page.locator('#summary-done').click();
 await expect(page.locator('.machine')).toHaveAttribute('data-mode','base');
});
