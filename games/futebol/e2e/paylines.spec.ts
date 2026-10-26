import {test,expect} from '@playwright/test';
import {linePrizes} from '../web/line-prizes.ts';
import {createSession,execute} from '../src/session.ts';

test('todas as linhas pagas passam uma a uma sem sobreposição ou novo sorteio',async({page})=>{
 let fixture=createSession('lines'),expected=execute(fixture,{type:'start',mode:'base'},'test','date');
 for(let i=0;i<5000;i++){
  fixture=createSession('paylines-'+i);expected=execute(fixture,{type:'start',mode:'base'},'test','date');
  const result=expected.history[0].spins[0];
  if(!expected.active&&result.detail!.lines.length>=4&&!result.detail!.events.length&&result.paid<15*fixture.bet)break;
 }
 const lines=expected.history[0].spins[0].detail!.lines.map(l=>String(l.line));expect(lines.length).toBeGreaterThanOrEqual(4);
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:true,lines:true,sound:false}));},fixture);
 await page.reload();await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  const log:{ids:string[];max:number;balloons:Record<string,number>}={ids:[],max:0,balloons:{}};(window as any).lineLog=log;
  new MutationObserver(()=>{const board=document.querySelector('#board')!;const id=(board as HTMLElement).dataset.winningLine;if(id&&log.ids.at(-1)!==id)log.ids.push(id);board.querySelectorAll<HTMLElement>('.line-prize-balloon').forEach(el=>log.balloons[el.dataset.line!]=Number(el.dataset.cents));log.max=Math.max(log.max,board.querySelectorAll('.payline-overlay').length);}).observe(document.querySelector('#board')!,{childList:true,subtree:true,attributes:true,attributeFilter:['data-winning-line']});
 });
 await page.locator('#spin').click();await expect(page.locator('.cycling-paylines')).toBeVisible();await expect(page.locator('.line-prize-balloon').first()).toBeVisible();await page.screenshot({path:'test-results/line-prize-balloons.png'});await expect(page.locator('#spin')).toHaveText('SPIN',{timeout:15000});
 await expect(page.locator('.payline-overlay')).toHaveCount(0);await expect(page.locator('#board .cell.win')).toHaveCount(0);
 const log=await page.evaluate(()=>(window as any).lineLog);expect(log.ids).toEqual(lines);expect(log.max).toBe(1);expect(lines.map(id=>log.balloons[id])).toEqual(linePrizes(expected.history[0].spins[0]));await expect(page.locator('.line-prize-balloon')).toHaveCount(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(saved.rngState).toBe(expected.rngState);expect(saved.balance).toBe(expected.balance);expect(saved.history[0].spins).toHaveLength(1);
});
