import {test,expect} from '@playwright/test';

test('vista reduzida dá prioridade ao tabuleiro e compras abrem sem jogar',async({page})=>{
 await page.setViewportSize({width:1126,height:704});await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-assets','ready');
 const board=await page.locator('#board').boundingBox();expect(board!.height).toBeGreaterThan(420);
 const before=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await expect(page.locator('#buy-normal')).not.toBeVisible();await page.locator('#bonus-shop').click();await expect(page.locator('#bonus-shop-panel')).toBeVisible();
 await expect(page.locator('#buy-normal')).toContainText('18,00');await expect(page.locator('#buy-superior')).toContainText('44,00');
 await page.locator('#buy-normal').click();await expect(page.locator('#bonus-shop-panel')).not.toBeVisible();await expect(page.locator('#confirm-buy')).toBeVisible();
 await page.locator('#cancel-buy').click();expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(before);
});

test('controlos principais ficam dentro do ecrã nos formatos compacto e mobile',async({page})=>{
 await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-assets','ready');
 for(const size of [{width:1126,height:704},{width:900,height:563},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  for(const id of ['board','bonus-shop','bet','speed','spin','autospin','bonus-hunt','main-volume']){const r=await page.locator('#'+id).boundingBox();expect(r!.width).toBeGreaterThan(0);expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(size.width+1);expect(r!.y+r!.height).toBeLessThanOrEqual(size.height+1);}
  await page.locator('#bonus-shop').click();await expect(page.locator('#buy-superior')).toBeInViewport();await page.keyboard.press('Escape');
  await page.screenshot({path:`test-results/compact-board-${size.width}.png`});
 }
});
