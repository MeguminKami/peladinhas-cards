import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';

for(const mode of ['base','superior'] as const)test(`rolos arrancam do tabuleiro visível em ${mode}`,async({page})=>{
 test.setTimeout(40000);
 let session=createSession('reel-previous-'+mode);
 if(mode==='superior')session=execute(session,{type:'start',mode},'buy','date');
 await page.goto('/');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'normal',autoFs:false,reduced:false,sound:false,lines:false}));if(s.active){const r=s.history[0];localStorage.setItem('slot-bonus-entry-v1',`${r.id}:${r.date}:${r.mode}`);}},session);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-assets','ready');
 const before=await page.locator('#board>.cell').evaluateAll(cells=>cells.map(el=>({symbol:(el as HTMLElement).dataset.symbol,src:el.querySelector('img')!.getAttribute('src')})));
 await page.evaluate(()=>{
  const root=document.querySelector('#board')!;
  (window as any).reelStart=new Promise(resolve=>{const observer=new MutationObserver(()=>{const lanes=[...root.querySelectorAll<HTMLElement>('.reel-lane')];if(lanes.length!==6)return;observer.disconnect();resolve(lanes.map(lane=>({column:Number(lane.dataset.column),previous:[...lane.querySelectorAll<HTMLElement>('.reel-symbol[data-previous]')].slice(-4).map(item=>({symbol:item.dataset.symbol,src:item.querySelector('img')!.getAttribute('src')})),offset:new DOMMatrixReadOnly(getComputedStyle(lane.querySelector('.reel-strip')!).transform).m42,step:parseFloat((lane.querySelector('.reel-strip') as HTMLElement).style.getPropertyValue('--reel-step'))})));});observer.observe(root,{childList:true});});
 });
 await page.locator('#spin').click();
 const lanes=await page.evaluate(()=> (window as any).reelStart) as {column:number;previous:{symbol:string;src:string}[];offset:number;step:number}[];
 for(const lane of lanes){expect(lane.previous).toEqual([0,1,2,3].map(row=>before[row*6+lane.column]));expect(Math.abs(lane.offset+10*lane.step)).toBeLessThan(2);}
 // Skip the remaining presentation without generating another result.
 await page.locator('#spin').click();await expect(page.locator('.reel-lane')).toHaveCount(0);
});
