import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

test('FS entram após confirmação e permanecem até sair do resumo final',async({page})=>{
 test.setTimeout(45000);
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,sound:false,reduced:true,lines:true})));
 await page.reload();await page.waitForLoadState('networkidle');
 await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();
 await expect(page.locator('#enter-bonus')).toBeVisible({timeout:20000});
 await expect(page.locator('#free-spins-panel')).not.toBeVisible();
 await expect(page.locator('.machine')).toHaveAttribute('data-mode','base');
 await page.locator('#enter-bonus').click();await expect(page.locator('#free-spins-panel')).toBeVisible();
 // Recover a real round immediately before its final, winning free spin.
 let fixture=createSession('last-fs');
 for(let i=0;i<1000;i++){
  const candidate=execute(createSession('pipeline-'+i),{type:'start',mode:'normal'},'start','date');
  if(!candidate.active||candidate.pendingRetrigger)continue;
  candidate.active.remaining=1;
  const result=execute(candidate,{type:'next'},'final','date');
  if(!result.active&&result.history[0].spins.at(-1)!.paid>=15*candidate.bet){fixture=candidate;break;}
 }
 expect(fixture.active).not.toBeNull();
 await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));const r=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${r.id}:${r.date}:${r.mode}`);},fixture);
 await page.reload();await page.waitForLoadState('networkidle');await page.locator('#spin').click();
 await expect(page.locator('.win-celebration')).toBeVisible({timeout:15000});
 await expect(page.locator('#free-spins-panel')).not.toHaveAttribute('hidden','');
 expect(await page.locator('#fs').textContent()).toBe('10 / 10');
 await expect(page.locator('.machine')).toHaveAttribute('data-mode','normal');
 await page.locator('.win-money').click();await page.locator('.win-finish').click();
 await expect(page.locator('#modal')).toHaveAttribute('data-kind','bonus-summary');await expect(page.locator('#modal')).toHaveAttribute('data-phase','arriving');
 await expect(page.locator('#summary-done')).not.toBeVisible();await expect(page.locator('#modal')).toHaveAttribute('data-phase','ready');
 await expect(page.locator('#summary-done')).toBeVisible();
 await expect(page.locator('#free-spins-panel')).not.toHaveAttribute('hidden','');
 await page.locator('#summary-done').click();await expect(page.locator('#free-spins-panel')).not.toBeVisible();
 await expect(page.locator('.machine')).toHaveAttribute('data-mode','base');
});
