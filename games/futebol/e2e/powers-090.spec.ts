import {test,expect} from '@playwright/test';
import {spin,start} from '../src/engine.ts';
import type {Board} from '../src/board.ts';
import {createSession} from '../src/session.ts';
import {config} from '../src/config.ts';

test('novos poderes apresentam os alvos reais em desktop e mobile',async({page})=>{
 test.setTimeout(90000);
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('/');await page.evaluate(s=>localStorage.setItem('slot-local-v1',JSON.stringify(s)),createSession('powers-ui'));await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-assets','ready');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,390])for(const power of ['P1','P2','P3'] as const){
  await page.setViewportSize({width,height:844});
  const b=Array(24).fill('N1') as Board;b[7]='W';b[6]=power;let calls=0;
  const result=spin(start('superior'),20,{next:()=>++calls===3&&power==='P2'?.75:0},config,true,b);
  await page.evaluate(async result=>{
   // @ts-expect-error Vite resolves browser imports.
   const {presentSpin,powerEmblemMarkup}=await import('/web/presentation.ts');
   // @ts-expect-error Vite resolves browser imports.
   const {symbolMarkup}=await import('/web/theme.ts');
   const board=document.querySelector('#board')!;
   const draw=(snapshot:any)=>{board.innerHTML=snapshot.board.map((s:string,p:number)=>`<div class="cell ${s==='W'?'wild':s.startsWith('P')?'premium':''}" data-position="${p}" data-symbol="${s}">${symbolMarkup(s)}${snapshot.events.find((e:any)=>e.position===p)?powerEmblemMarkup(snapshot.events.find((e:any)=>e.position===p).power):''}</div>`).join('');};
   draw({board:result.detail!.initial,events:[]});
   (globalThis as any).powerDone=presentSpin(result,{speed:'normal',reduced:false,signal:new AbortController().signal,draw,message:(title:string,text:string)=>{document.querySelector('#message')!.textContent=title;document.querySelector('#submessage')!.textContent=text;}});
  },result);
  await page.waitForSelector(`.power-announcement[data-power=${power}]`,{state:'visible',timeout:15000});
  await page.screenshot({path:`test-results/powers-090-${power}-${width}.png`});
  await page.evaluate(async()=>{await (globalThis as any).powerDone;});
  expect(await page.locator('#board>.cell').evaluateAll(els=>els.map(el=>(el as HTMLElement).dataset.symbol))).toEqual(result.detail!.final);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.power-announcement')).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});
