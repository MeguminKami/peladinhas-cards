import {test,expect} from '@playwright/test';

test('volume geral está no menu, mantém preferências e cabe nos ecrãs suportados',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 const slider=page.getByLabel('Volume geral no menu principal');await slider.fill('23');
 await expect(page.locator('#main-volume-value')).toHaveText('23%');await page.reload();await page.waitForLoadState('networkidle');await expect(slider).toHaveValue('23');
 await page.locator('#settings').click();await expect(page.getByLabel('Volume geral',{exact:true})).toHaveValue('23');await page.getByLabel('Volume geral',{exact:true}).fill('46');await page.locator('#close-modal').click();await expect(slider).toHaveValue('46');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]){
  await page.setViewportSize(viewport);const bounds=await slider.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
 }
});

test('áudio produz sinal, respeita volumes e não altera sessão ou RNG',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.waitForLoadState('networkidle');
 const original=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await page.locator('#settings').click();
 await expect(page.getByLabel('Volume geral',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>{const a=await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name);return a.audioStatus().state;})).toBe('running');
 await expect.poll(()=>page.evaluate(async()=>{const a=await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name);return a.audioStatus().rms;})).toBeGreaterThan(.00001);
 await page.getByLabel('Música',{exact:true}).fill('17');
 await page.getByLabel('Efeitos',{exact:true}).fill('32');
 await page.getByLabel('Ambiente',{exact:true}).fill('12');
 await page.locator('#win-sound').uncheck();await page.waitForTimeout(900);
 const muted=await page.evaluate(async()=>{const a=await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name);return a.audioStatus();});expect(muted.settings.sound).toBe(false);expect(muted.rms).toBeLessThan(.0001);
 await page.reload();await page.waitForLoadState('networkidle');await page.locator('#settings').click();
 await expect(page.getByLabel('Música',{exact:true})).toHaveValue('17');await expect(page.locator('#win-sound')).not.toBeChecked();
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(original);
 expect(errors).toEqual([]);
});

test('cenas, efeitos e cancelamento mantêm as vozes limitadas e libertam efeitos',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');await page.locator('#rules').click();
 const result=await page.evaluate(async()=>{
  const a=await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name);a.configureAudio({sound:true});a.setAudioScene('superior');
  for(const name of ['spin','land','wild','scatter','charge','power','convert','sticky','victory','bonus','retrigger','final'])a.audioCue(name,3);
  a.reelAudio(true);a.suspenseAudio();for(let i=0;i<100;i++)a.audioCue('line',i);
  const peak=a.audioStatus();a.stopEffects();await new Promise(r=>setTimeout(r,150));const stopped=a.audioStatus();
  a.setAudioScene('summary');return {peak,stopped,scene:a.audioStatus().scene};
 });
 expect(result.peak.voices).toBeLessThanOrEqual(64);expect(result.stopped.rolling).toBe(false);expect(result.stopped.tension).toBe(false);expect(result.stopped.effectVoices).toBe(0);expect(result.scene).toBe('summary');
});

test('ocultar separador suspende áudio e retoma sem repetir rotação ou suspense',async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');await page.locator('#rules').click();
 await page.evaluate(async()=>{const a=await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name);a.reelAudio(true);a.suspenseAudio();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name)).audioStatus().state)).toBe('suspended');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name)).audioStatus().state)).toBe('running');
 const status=await page.evaluate(async()=>(await import(performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/audio.ts'))!.name)).audioStatus());expect(status.rolling).toBe(false);expect(status.tension).toBe(false);
});
