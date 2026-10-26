import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

test('Bonus Hunt mostra custo triplo, órbita e cor, e liquida na aposta base',async({page})=>{
 let initial=createSession('hunt-ui');
 for(let i=0;i<1000;i++){initial=createSession('hunt-ui-'+i);const next=execute(initial,{type:'start',mode:'base',bonusHunt:true},'test','date');const r=next.history[0].spins[0];if(!next.active&&r.paid<15*initial.bet&&!r.detail!.events.length)break;}
 await page.goto('/');await page.waitForLoadState('networkidle');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({bonusHunt:false,speed:'super',autoFs:false,reduced:false,sound:false,lines:false}));},initial);await page.reload();await page.waitForLoadState('networkidle');
 await expect(page.locator('#bet option:checked')).toHaveText('0,20');await page.locator('#bonus-hunt').click();await expect(page.locator('#bonus-hunt')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#bet option:checked')).toHaveText('0,60');await expect(page.locator('#bet')).toHaveValue('20');await expect(page.locator('.spin-price')).toHaveCount(0);await expect(page.locator('.machine')).toHaveClass(/hunt-active/);
 expect(await page.locator('.hunt-orbit').evaluate(el=>getComputedStyle(el).animationName)).toBe('hunt-orbit');
 await page.locator('#spin').click();await expect(page.locator('#bonus-hunt')).toBeDisabled();await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:15000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(saved.history[0].cost).toBe(60);expect(saved.history[0].bet).toBe(20);expect(saved.history[0].bonusHunt).toBe(true);expect(saved.balance).toBe(initial.balance-60+saved.history[0].paid);
 await page.reload();await page.waitForLoadState('networkidle');await expect(page.locator('#bonus-hunt')).toHaveAttribute('aria-pressed','true');await page.locator('#bonus-hunt').click();await expect(page.locator('#bet option:checked')).toHaveText('0,20');
});

test('painel mantém grupos alinhados e controlos dentro da consola em todos os formatos',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 for(const size of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);const consoleBounds=await page.locator('.console').boundingBox();
  for(const selector of ['#bet','#speed','#spin','#autospin','#bonus-shop','#bonus-hunt','#main-volume']){const rect=await page.locator(selector).boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(consoleBounds!.x);expect(rect!.x+rect!.width).toBeLessThanOrEqual(consoleBounds!.x+consoleBounds!.width+1);expect(rect!.y+rect!.height).toBeLessThanOrEqual(size.height);}
  await page.screenshot({path:`test-results/console-hunt-${size.width}.png`});
 }
});

test('carteira exterior recebe o débito real de 3× do Bonus Hunt',async({page})=>{
 await page.goto('/host-demo.html');const frame=page.frameLocator('iframe');await expect(frame.locator('body')).toHaveAttribute('data-assets','ready',{timeout:15000});
 await frame.locator('#bonus-hunt').click();await expect(frame.locator('#bet option:checked')).toHaveText('0,60');await frame.locator('#spin').click();
 await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('football-host-demo-wallet')??'{}').transactions??{}).length)).toBe(1);
 const wallet=await page.evaluate(()=>JSON.parse(localStorage.getItem('football-host-demo-wallet')!));const transaction=Object.values(wallet.transactions)[0] as {debit:number;credit:number};expect(transaction.debit).toBe(60);
 await expect.poll(()=>frame.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1:player:demo-player')!).history.length)).toBe(1);
 const saved=await frame.locator('body').evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1:player:demo-player')!));expect(saved.history[0].bonusHunt).toBe(true);expect(saved.history[0].cost).toBe(60);expect(saved.balance).toBe(wallet.balance);
});
