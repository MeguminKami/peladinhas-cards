import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');await page.waitForLoadState('networkidle');});
test('três primeiras vitórias reagem no tabuleiro sem ecrã sobreposto',async({page})=>{
 const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 for(const [paid,name] of [[100,'Golo!'],[300,'Belo Golo!'],[500,'Golaço!']] as const){
  const showing=page.evaluate(async paid=>{const {celebrateWin}=await import('/web/win-celebration.ts');await celebrateWin(paid,100,{speed:'normal',reduced:false,signal:new AbortController().signal,control:()=>{},cue:()=>{}});},paid);
  await expect(page.locator('.compact-win')).toHaveText(name);await expect(page.locator('.win-celebration')).toHaveCount(0);await showing;await expect(page.locator('.compact-win')).toHaveCount(0);
 }
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});
test('180× conta continuamente e promove Golo de Placa, Melhor em Campo e Campeões',async({page})=>{
 const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 const showing=page.evaluate(async()=>{const {celebrateWin}=await import('/web/win-celebration.ts');const stages:number[]=[];await celebrateWin(18000,100,{speed:'normal',reduced:false,signal:new AbortController().signal,control:()=>{},cue:(tier:number)=>stages.push(tier)});return stages;});
 await expect(page.locator('.win-stage-name')).toHaveText('Golo de Placa!');
 await expect(page.locator('.win-finish')).not.toBeVisible();await expect(page.locator('.win-stage-name')).toHaveText('Melhor em Campo!',{timeout:7000});
 const during=Math.round(Number((await page.locator('.win-money').innerText()).replace(/\s/g,'').replace(',','.'))*100);expect(during).toBeGreaterThanOrEqual(4000);expect(during).toBeLessThan(18000);
 await expect(page.locator('.win-stage-name')).toHaveText('Campeões!',{timeout:5000});await page.screenshot({path:'test-results/win-champions.png'});
 await expect(page.locator('.win-celebration')).toHaveAttribute('data-phase','final',{timeout:10000});await expect(page.locator('.win-money')).toHaveText('180,00');
 await page.waitForTimeout(1800);await expect(page.locator('.win-celebration')).toBeVisible();await page.locator('.win-finish').click();expect(await showing).toEqual([3,4,5]);expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});
test('clique conclui no escalão final e segundo clique fecha sem pagar novamente',async({page})=>{
 const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 const showing=page.evaluate(async()=>{const {celebrateWin}=await import('/web/win-celebration.ts');await celebrateWin(150000,100,{speed:'normal',reduced:false,signal:new AbortController().signal,control:()=>{},cue:()=>{}});});
 await expect(page.locator('.win-finish')).not.toBeVisible();await page.locator('.win-money').click();await expect(page.locator('.win-stage-name')).toHaveText('Lenda do Futebol!');await expect(page.locator('.win-money')).toHaveText(/1\s?500,00/);await expect(page.locator('.win-finish')).toHaveText('CONTINUAR');
 await page.screenshot({path:'test-results/win-legend.png'});await page.locator('.win-finish').click();await showing;await expect(page.locator('.win-celebration')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});
test('movimento reduzido e interrupção limpam contador e efeitos',async({page})=>{
 const showing=page.evaluate(async()=>{const {celebrateWin}=await import('/web/win-celebration.ts');const controller=new AbortController();setTimeout(()=>controller.abort(),1500);await celebrateWin(1000000,100,{speed:'normal',reduced:true,signal:controller.signal,control:()=>{},cue:()=>{}});});
 await expect(page.locator('.win-celebration')).toHaveClass(/reduced/);await expect(page.locator('.win-particles')).not.toBeVisible();await showing;await expect(page.locator('.win-celebration')).toHaveCount(0);await expect(page.locator('#spin-pay')).toHaveText(/10\s?000,00/);
});
