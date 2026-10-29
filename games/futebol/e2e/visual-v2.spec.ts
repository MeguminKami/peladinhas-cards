import {test,expect,type Page} from '@playwright/test';
import {createSession} from '../src/session.ts';
async function setup(page:Page,seed:string){
  await page.goto('/');await page.waitForLoadState('networkidle');
  await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'normal',autoFs:false,reduced:false,lines:true}));},createSession(seed));
  await page.reload();await page.waitForLoadState('networkidle');
}
test('seis faixas rodam e suspense abranda a coluna sem novo sorteio',async({page})=>{
  await setup(page,'v2-fixture-45');await page.locator('#spin').click();
  await expect(page.locator('.reel-lane')).toHaveCount(6);
  const before=await page.locator('.reel-strip').first().evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(100);
  expect(await page.locator('.reel-strip').first().evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await expect(page.locator('.reel-suspense')).toBeVisible({timeout:5000});
  expect(await page.locator('.reel-suspense .reel-strip').evaluate(el=>{const a=el.getAnimations()[0];return a.playbackRate<1||Number(a.effect!.getTiming().duration)>=900;})).toBe(true);
  await page.screenshot({path:'test-results/v2-suspense.png'});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));
  await page.locator('#spin').click();await expect(page.locator('.reel-lane')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(saved);
});
test('compra apresenta três scatters e guarda apenas o primeiro FS',async({page})=>{
  await setup(page,'v2-intro');await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();
  await expect(page.locator('.machine')).toHaveAttribute('data-presentation','purchase-activation');
  await expect(page.locator('.reel-lane')).toHaveCount(0,{timeout:10000});
  await expect(page.locator('#board .cell[data-symbol="S"]')).toHaveCount(3);
  await page.screenshot({path:'test-results/v2-bonus-intro.png'});
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));
  expect(s.history[0].cost).toBe(1800);expect(s.history[0].spins).toHaveLength(1);
  await page.locator('#enter-bonus').click({timeout:20000});await page.locator('#spin').click();await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS');
});
test('wild fixo tem aquisição animada e dourado persistente',async({page})=>{
  await setup(page,'retrigger-fixture-13');await page.locator('#bonus-shop').click();await page.locator('#buy-superior').click();await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').click({timeout:20000});
  await expect(page.locator('.sticky-acquired-v2')).toBeVisible({timeout:20000});
  await page.screenshot({path:'test-results/v2-sticky-acquisition.png'});
  await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS');
  await expect(page.locator('[data-position="2"]')).toHaveClass(/sticky/);
  await expect(page.locator('[data-position="2"] .symbol-art img')).toHaveAttribute('src',/w-personal-v3/);
  expect(await page.locator('[data-position="2"]').getAttribute('title')).toBeNull();
  await page.reload();await expect(page.locator('[data-position="2"]')).toHaveClass(/sticky/);
});
test('roubo tem energia visível, emblemas e multiplicador à esquerda',async({page})=>{
  await setup(page,'retrigger-fixture-0');await page.locator('#bonus-shop').click();await page.locator('#buy-superior').click();await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').click({timeout:20000});
  await expect(page.locator('.v2-energy').first()).toBeVisible({timeout:20000});
  await expect(page.locator('.power-announcement')).toBeVisible();
  await expect(page.locator('.power-announcement strong')).toHaveText(/Passe Curto|Glória do Bairro/);
  await expect(page.locator('.power-announcement .power-player')).toBeVisible();
  await page.screenshot({path:'test-results/v2-power-transfer.png'});
  await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS',{timeout:15000});
  await expect(page.locator('#board .power-P1 .power-emblem svg')).toHaveCount(1);
  await expect(page.locator('#board .power-P4 .power-emblem svg')).toHaveCount(1);
  await expect(page.locator('#board .power-emblem .power-emblem')).toHaveCount(0);
  expect((await page.locator('#board .power-P1 .power-emblem svg').boundingBox())!.width).toBeGreaterThan(10);
  const hud=await page.locator('#global').boundingBox(),board=await page.locator('#board').boundingBox();expect(hud!.x).toBeLessThan(board!.x);
  await page.screenshot({path:'test-results/v2-powers-final.png'});
});
test('regras ilustradas ordenam raridade e mudam valores sem mudar a sessão',async({page})=>{
  await setup(page,'v2-rules');const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
  await page.getByRole('button',{name:'Regras',exact:true}).click();
  await expect(page.locator('.rules-paytable tbody img')).toHaveCount(8);
  const chances=await page.locator('[data-chance]').evaluateAll(els=>els.map(el=>Number((el as HTMLElement).dataset.chance)));
  expect(chances).toEqual([...chances].sort((a,b)=>b-a));
  await expect(page.locator('[data-pay-symbol]').first()).toHaveAttribute('data-pay-symbol','N1');
  await expect(page.locator('[data-pay-symbol]').last()).toHaveAttribute('data-pay-symbol','P4');
  await page.locator('[data-rules-mode="normal"]').click();await expect(page.locator('[data-pay-symbol="N1"]')).toContainText('0,3531');
  expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
  await page.screenshot({path:'test-results/v2-rules.png'});
});
