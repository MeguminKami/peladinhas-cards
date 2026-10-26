import {test,expect,type Page} from '@playwright/test';
import {createSession,execute,type Session} from '../src/session.ts';
import {autoSpinCounts} from '../web/autospin.ts';

function fixture(){
 for(let i=0;i<2000;i++){
  const initial=createSession('auto-fixture-'+i);let final=initial,valid=true;
  for(let k=0;k<10;k++){final=execute(final,{type:'start',mode:'base'},'spin-'+k,'date');const r=final.history[0].spins[0];if(final.active||r.paid>=15*initial.bet||r.detail!.events.length){valid=false;break;}}
  if(valid)return {initial,final};
 }throw Error('Fixture não encontrada');
}
async function setup(page:Page,session:Session){await page.goto('/');await page.waitForLoadState('networkidle');await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:true,lines:false,sound:false}));},session);await page.reload();await page.waitForLoadState('networkidle');}

test('widget junto ao botão tem todos os passos e cabe em mobile e horizontal',async({page})=>{
 await setup(page,fixture().initial);
 for(const size of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.locator('#autospin').click();await expect(page.locator('#autospin-panel')).toBeVisible();
  for(const [i,count] of autoSpinCounts.entries()){await page.locator('#autospin-range').fill(String(i));await expect(page.locator('#autospin-selected')).toHaveText(String(count));}
  const bounds=await page.locator('#autospin-panel').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(size.width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
  await page.screenshot({path:`test-results/autospin-${size.width}.png`});await page.locator('#autospin-close').click();
 }
});

test('dez spins automáticos equivalem a dez comandos manuais e terminam sozinhos',async({page})=>{
 test.setTimeout(45000);const {initial,final}=fixture();await setup(page,initial);await page.locator('#autospin').click();await page.locator('#autospin-range').fill('0');await page.locator('#autospin-start').click();
 await expect(page.locator('#bet')).toBeDisabled();await expect(page.locator('#speed')).toHaveValue('super');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter),{timeout:35000}).toBe(10);
 await expect(page.locator('#autospin')).not.toHaveClass(/running/,{timeout:10000});await expect(page.locator('#bet')).toBeEnabled();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(saved.rngState).toBe(final.rngState);expect(saved.balance).toBe(final.balance);expect(saved.history).toHaveLength(10);
 await page.waitForTimeout(500);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter)).toBe(10);
});

test('parar não interrompe nem repete a jogada já confirmada e reload não reinicia o plano',async({page})=>{
 await setup(page,fixture().initial);await page.locator('#autospin').click();await page.locator('#autospin-range').fill('13');await page.locator('#autospin-start').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!).counter)).toBeGreaterThan(0);
 await page.locator('#autospin').click();const saved=await page.evaluate(()=>localStorage.getItem('slot-local-v1'));
 await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:15000});await page.waitForTimeout(600);expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
 await page.reload();await page.waitForLoadState('networkidle');await expect(page.locator('#autospin')).not.toHaveClass(/running/);expect(await page.evaluate(()=>localStorage.getItem('slot-local-v1'))).toBe(saved);
});

test('saldo insuficiente termina o plano sem cobrar ou gerar um spin adicional',async({page})=>{
 let initial=createSession('auto-empty');
 for(let i=0;i<2000;i++){initial=createSession('auto-empty-'+i);const next=execute(initial,{type:'start',mode:'base'},'check','date');if(!next.active&&!next.history[0].paid&&!next.history[0].spins[0].detail!.events.length)break;}
 initial.balance=initial.bet;await setup(page,initial);await page.locator('#autospin').click();await page.locator('#autospin-start').click();
 await expect(page.locator('#autospin')).not.toHaveClass(/running/,{timeout:10000});await expect(page.locator('#balance')).toHaveText('0,00');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(saved.counter).toBe(1);expect(saved.balance).toBe(0);expect(saved.history).toHaveLength(1);
});
