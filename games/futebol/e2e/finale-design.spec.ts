import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

test('final temática mantém total e botão visíveis em desktop, móvel e horizontal',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 const row=execute(createSession('finale-design'),{type:'start',mode:'superior'},'test','date').history[0];
 await page.evaluate(async row=>{const {bonusSummaryMarkup}=await import('/web/bonus-summary.ts');const dialog=document.querySelector<HTMLDialogElement>('#modal')!;dialog.dataset.kind='bonus-summary';dialog.dataset.phase='ready';document.querySelector('#modal-content')!.innerHTML=bonusSummaryMarkup(row);dialog.showModal();},row);
 for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(1100);
  await expect(page.locator('.finale-medallion svg')).toBeVisible();await expect(page.locator('.finale-heading h3')).toHaveText('APITO FINAL');
  for(const selector of ['.large-pay','#summary-done']){const bounds=await page.locator(selector).boundingBox();expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);}
  await page.screenshot({path:`test-results/finale-${viewport.width}.png`});
 }
});
