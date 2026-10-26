import {test,expect} from '@playwright/test';
import {createSession} from '../src/session.ts';
for(const variant of ['normal','fast','super','suspense'] as const){const speed=variant==='suspense'?'normal':variant;test(`paragem ${variant} não acelera e a geometria final coincide`,async({page})=>{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(({session,speed})=>{localStorage.setItem('slot-local-v1',JSON.stringify(session));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed,autoFs:false,reduced:false,lines:true,sound:false}));},{session:createSession('v2-fixture-45'),speed});
 await page.reload();await page.waitForLoadState('networkidle');await page.locator('#spin').click();const laneSelector=variant==='suspense'?'.reel-suspense.reel-landing':'.reel-landing[data-column="0"]';await page.locator(laneSelector).first().waitFor();
 const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 const samples=await page.locator(laneSelector).first().evaluate(async(lane,speed)=>{
  const strip=lane.querySelector<HTMLElement>('.reel-strip')!,animation=strip.getAnimations()[0];animation.pause();
  const duration=Number(animation.effect!.getTiming().duration),step=parseFloat(strip.style.getPropertyValue('--reel-step'));
  const positions:number[]=[];const ts=[0,.001,.05,.2,.5,.8,1];
  for(const t of ts){animation.currentTime=t*duration;await new Promise(requestAnimationFrame);positions.push(new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42);}
  const col=Number((lane as HTMLElement).dataset.column);
  const geometry=[...lane.querySelectorAll<HTMLElement>('.reel-final')].map((el,row)=>{const real=document.querySelector<HTMLElement>(`.cell[data-position="${row*6+col}"]`)!,clone=el.querySelector<HTMLElement>('.reel-cell')!,a=real.getBoundingClientRect(),b=clone.getBoundingClientRect(),artA=real.querySelector('.symbol-art')!.getBoundingClientRect(),artB=clone.querySelector('.symbol-art')!.getBoundingClientRect();return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height),Math.abs(artA.width-artB.width),Math.abs(artA.height-artB.height));});
  const velocities=ts.slice(1).map((t,i)=>(positions[i+1]-positions[i])/((t-ts[i])*duration));animation.play();
  return {velocities,geometry,cruise:step/{normal:145,fast:95,super:55}[speed]};
 },speed);
 for(let i=0;i<samples.velocities.length;i++){expect(samples.velocities[i]).toBeGreaterThanOrEqual(-.001);expect(samples.velocities[i]).toBeLessThanOrEqual(samples.cruise*1.01);if(i)expect(samples.velocities[i]).toBeLessThanOrEqual(samples.velocities[i-1]+.001);}
 for(const difference of samples.geometry)expect(difference).toBeLessThan(.6);
 await page.locator('#spin').click();await expect(page.locator('.reel-lane')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});}
