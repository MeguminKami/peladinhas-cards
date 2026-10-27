import {test,expect,type Page} from '@playwright/test';
import {createSession,execute,type Session} from '../src/session.ts';

async function setup(page:Page,s:Session,autoFs=false){
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(({s,autoFs})=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.removeItem('slot-bonus-entry-v1');localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs,reduced:true,lines:false,sound:false}));}, {s,autoFs});
 await page.reload();await page.waitForLoadState('networkidle');
}

test('comandos de spin usam 100 ms de intervalo sem esperar para executar',async({page})=>{
 await setup(page,createSession('space-throttle'));await page.locator('#board').click();
 const result=await page.evaluate(async()=>{
  const times:number[]=[];document.getElementById('spin')!.onclick=()=>{times.push(performance.now());};document.getElementById('board')!.focus();
  const tap=()=>{document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));document.activeElement!.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true,cancelable:true}));};
  const start=performance.now();tap();const immediate=times.length;tap();await new Promise(r=>setTimeout(r,65));tap();const blocked=times.length;await new Promise(r=>setTimeout(r,65));tap();return {immediate,blocked,times,start};
 });
 expect(result.immediate).toBe(1);expect(result.blocked).toBe(1);expect(result.times).toHaveLength(2);expect(result.times[0]-result.start).toBeLessThan(50);expect(result.times[1]-result.times[0]).toBeGreaterThanOrEqual(100);
});

test('Space inicia o spin imediatamente e repetir a tecla não acumula comandos',async({page})=>{
 await setup(page,createSession('space-base'));
 await page.locator('#board').focus();await page.keyboard.down('Space');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter),{timeout:400,intervals:[10]}).toBe(1);
 for(let i=0;i<8;i++)await page.keyboard.down('Space');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter)).toBe(1);
 await page.keyboard.up('Space');await page.waitForTimeout(150);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter)).toBe(1);
});

test('Space confirma entrada sem impor 500 ms ao próximo FS',async({page})=>{
 const saved=execute(createSession('retrigger-fixture-0'),{type:'start',mode:'normal'},'entry','date');
 await setup(page,saved,true);await expect(page.locator('#enter-bonus')).toBeVisible();await page.waitForTimeout(550);
 await page.keyboard.press('Space');await expect(page.locator('#modal')).not.toBeVisible();
 for(let i=0;i<5;i++)await page.keyboard.press('Space');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length)).toBeLessThanOrEqual(2);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].spins.length)).toBe(2);
});

test('Space na compra de bónus não salta o primeiro free spin',async({page})=>{
 await setup(page,createSession('buy-1'));
 await page.evaluate(()=>document.getElementById('buy-normal')!.click());await page.locator('#confirm-buy').click();
 for(let i=0;i<4;i++){await page.keyboard.press('Space');await page.waitForTimeout(60);}
 await expect(page.locator('#enter-bonus')).toBeVisible();await page.waitForTimeout(550);
 await page.keyboard.press('Space');await expect(page.locator('#modal')).not.toBeVisible();
 const start=Date.now();
 for(let i=0;i<4;i++){await page.keyboard.press('Space');await page.waitForTimeout(60);}
 expect(Date.now()-start).toBeLessThan(600);
 await expect(page.locator('#spin')).toHaveText('CONCLUIR');
});

test('Space revela contagem, confirma vitória e não dispara um spin ao fechar',async({page})=>{
 await setup(page,createSession('space-victory'));const original=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 const showing=page.evaluate(async()=>{const path=performance.getEntriesByType('resource').find(entry=>entry.name.includes('/web/win-celebration.ts'))!.name;const {celebrateWin}=await import(path);await celebrateWin(18000,100,{speed:'super',reduced:false,signal:new AbortController().signal,control:()=>{},cue:()=>{}});});
 await expect(page.locator('.win-celebration')).toBeVisible();await page.waitForTimeout(550);await page.keyboard.press('Space');
 await expect(page.locator('.win-celebration')).toHaveAttribute('data-phase','final');
 for(let i=0;i<5;i++)await page.keyboard.press('Space');await expect(page.locator('.win-celebration')).toBeVisible();
 await page.waitForTimeout(550);await page.keyboard.press('Space');await showing;
 await page.keyboard.press('Space');
 expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(original);
});

test('Space confirma retrigger sem usar a mesma tecla para jogar o FS seguinte',async({page})=>{
 const saved=execute(createSession('retrigger-fixture-125'),{type:'start',mode:'normal'},'retrigger','date');expect(saved.pendingRetrigger).not.toBeNull();
 await setup(page,saved);await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('slot-local-v1')!);const r=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${r.id}:${r.date}:${r.mode}`);});await page.reload();await page.waitForLoadState('networkidle');
 await expect(page.locator('#continue-retrigger')).toBeVisible();await page.waitForTimeout(550);await page.keyboard.press('Space');
 await expect(page.locator('#modal')).not.toBeVisible();await page.keyboard.press('Space');
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(after.pendingRetrigger).toBeNull();expect(after.history[0].spins).toHaveLength(saved.history[0].spins.length);expect(after.rngState).toBe(saved.rngState);
});

test('Space revela e fecha o resumo final sem lançar outra ronda por repetição',async({page})=>{
 let fixture=createSession('space-summary');
 for(let i=0;i<2000;i++){
  const s=execute(createSession('space-summary-'+i),{type:'start',mode:'normal'},'start','date');if(!s.active||s.pendingRetrigger)continue;s.active.remaining=1;
  const final=execute(s,{type:'next'},'last','date');if(!final.active&&final.history[0].spins.at(-1)!.paid<15*s.bet&&!final.history[0].spins.at(-1)!.detail!.events.length){fixture=s;break;}
 }
 expect(fixture.active).not.toBeNull();await setup(page,fixture);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('slot-local-v1')!);const r=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${r.id}:${r.date}:${r.mode}`);const prefs=JSON.parse(localStorage.getItem('slot-preferences-v1')!);prefs.reduced=false;localStorage.setItem('slot-preferences-v1',JSON.stringify(prefs));});await page.reload();await page.waitForLoadState('networkidle');
 await page.locator('#spin').click();await expect(page.locator('#modal')).toHaveAttribute('data-kind','bonus-summary',{timeout:10000});await page.waitForTimeout(550);
 await page.keyboard.press('Space');await expect(page.locator('#modal')).toHaveAttribute('data-phase','ready');
 for(let i=0;i<5;i++)await page.keyboard.press('Space');await expect(page.locator('#modal')).toBeVisible();
 const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));await page.waitForTimeout(550);await page.keyboard.press('Space');await expect(page.locator('#modal')).not.toBeVisible();
 await page.keyboard.press('Space');expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});
