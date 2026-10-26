import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

test('resumo conta até ao total confirmado e mede os frames durante a apresentação',async({page},testInfo)=>{
 test.setTimeout(45000);await page.setViewportSize({width:1440,height:900});
 let fixture=createSession('summary-perf');
 for(let i=0;i<1000;i++){
  const s=execute(createSession('summary-perf-'+i),{type:'start',mode:'normal'},'start','date');
  if(!s.active||s.pendingRetrigger)continue;s.active.remaining=1;
  const end=execute(s,{type:'next'},'end','date');
  if(!end.active&&end.history[0].spins.at(-1)!.paid<15*s.bet){fixture=s;break;}
 }
 expect(fixture.active).not.toBeNull();
 await page.goto('/');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',sound:false,autoFs:false,lines:false,reduced:false}));const r=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${r.id}:${r.date}:${r.mode}`);},fixture);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-assets','ready');await page.evaluate(()=>document.fonts.ready);await page.locator('#spin').click();
 await expect(page.locator('#modal')).toHaveAttribute('data-kind','bonus-summary');
 const perf=await page.evaluate(async()=>{
  const dialog=document.querySelector<HTMLElement>('#modal')!;let last=0;const samples:number[]=[],start=performance.now();
  await new Promise<void>(resolve=>{function tick(now:number){if(last&&now-start>250)samples.push(now-last);last=now;if(dialog.dataset.phase==='ready')resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  samples.sort((a,b)=>a-b);return {samples:samples.length,averageFps:Math.round(1000/(samples.reduce((a,b)=>a+b,0)/samples.length)),p95FrameMs:Math.round(samples[Math.floor(samples.length*.95)]*10)/10,over25ms:samples.filter(x=>x>25).length};
 });
 console.log('Bonus summary frame timing:',JSON.stringify(perf));await testInfo.attach('frame-timing',{body:JSON.stringify(perf),contentType:'application/json'});
 const paid=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).history[0].paid);
 await expect(page.locator('.summary-counter')).toHaveText((paid/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}));
 await expect(page.locator('#summary-done')).toBeEnabled();await page.locator('#summary-done').click();await expect(page.locator('#modal')).not.toBeVisible();
});
