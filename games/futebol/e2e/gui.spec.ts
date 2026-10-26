import {test,expect} from '@playwright/test';
import {createSession,execute} from '../src/session.ts';
import {spin,start} from '../src/engine.ts';
import {config} from '../src/config.ts';
import type {Board} from '../src/board.ts';
test.beforeEach(async({page})=>{await page.goto('/');await page.waitForLoadState('networkidle');await page.evaluate(s=>localStorage.setItem('slot-local-v1',JSON.stringify(s)),createSession('retrigger-fixture-0'));await page.reload();await expect(page.locator('#spin')).toBeVisible();await page.waitForLoadState('networkidle');});
test('spin, aposta, histórico e recarga mantêm resultado e RNG',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('.cell')).toHaveCount(24);await page.getByRole('button',{name:'Aumentar aposta'}).click();await expect(page.locator('#bet')).toHaveValue('40');
  await page.locator('#speed').selectOption('super');await page.locator('#spin').click();await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:20000});
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(first.history).toHaveLength(1);expect(first.history[0].cost).toBe(40);
  await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(first);
  await page.getByRole('button',{name:'Histórico',exact:true}).click();await page.getByRole('button',{name:'Ver ronda 1'}).click();await expect(page.getByText('Tabuleiro final',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(first);expect(errors).toEqual([]);
});
test('compra normal, bloqueio da aposta, retoma e dez FS sem cobranças novas',async({page})=>{
  test.setTimeout(60000);
  await page.getByRole('button',{name:'Definições',exact:true}).click();await page.locator('#auto-fs').uncheck();await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.locator('#speed').selectOption('super');
  await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.getByRole('button',{name:'Confirmar compra'}).click();await page.locator('#enter-bonus').click({timeout:20000});await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS',{timeout:15000});await expect(page.locator('#bet')).toBeDisabled();
  await page.reload();await expect(page.locator('#fs')).toHaveText('1 / 10');
  for(let i=0;i<9;i++){await page.locator('#spin').click();if(i<8)await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS',{timeout:15000});}
  await expect(page.getByRole('heading',{name:'APITO FINAL'})).toBeVisible({timeout:15000});await page.locator('#summary-done').click();
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(s.history[0].spins).toHaveLength(10);expect(s.history[0].cost).toBe(1800);expect(s.balance).toBe(100000-1800+s.history[0].paid);expect(s.active).toBeNull();await expect(page.locator('#bet')).toBeEnabled();
});
test('compra superior automática, mobile e atalhos não duplicam pedidos',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:390,height:844});await page.locator('#speed').selectOption('super');await page.locator('#bonus-shop').click();await page.locator('#buy-superior').click();await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').click({timeout:20000});
  await page.addLocatorHandler(page.locator('.win-celebration'),async()=>{await page.locator('.win-money').click();await page.locator('.win-finish').click();});
  await expect(page.getByRole('heading',{name:'APITO FINAL'})).toBeVisible({timeout:55000});
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(s.history).toHaveLength(1);expect(s.history[0].spins).toHaveLength(10);expect(s.history[0].cost).toBe(4400);expect(s.balance).toBe(100000-4400+s.history[0].paid);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#summary-done').click();
  await page.screenshot({path:'test-results/gui-mobile.png',fullPage:true});
});
test('velocidade e preferências não alteram resultado matemático',async({page})=>{
  const initial=await page.evaluate(()=>localStorage.getItem('slot-local-v1')!);let paid:number|undefined,rng:number|undefined;
  for(const speed of ['normal','fast','super']){await page.evaluate(s=>localStorage.setItem('slot-local-v1',s),initial);await page.reload();await page.locator('#speed').selectOption(speed);await page.locator('#spin').click();await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:20000});
    const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));if(paid===undefined){paid=s.history[0].paid;rng=s.rngState;}expect(s.history[0].paid).toBe(paid);expect(s.rngState).toBe(rng);
  }
  await page.screenshot({path:'test-results/gui-desktop.png',fullPage:true});
});
test('cliques simultâneos não criam spins duplicados',async({page})=>{
  await page.evaluate(()=>{const button=document.getElementById('spin') as HTMLButtonElement;button.click();button.click();button.click();});
  await expect(page.locator('#state')).not.toHaveText('A apresentar',{timeout:20000});
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(s.history).toHaveLength(1);expect(s.history[0].spins).toHaveLength(1);expect(s.history[0].cost).toBe(20);
});
test('sessão corrompida pode ser exportada ou reposta explicitamente',async({page})=>{
  await page.evaluate(()=>localStorage.setItem('slot-local-v1','not-json'));await page.reload();await expect(page.getByRole('heading',{name:'Definições',exact:true})).toBeVisible();await page.locator('#reset-session').click();await page.locator('#confirm-reset').click();await expect(page.locator('#balance')).toHaveText(/1\s?000,00/);await expect(page.locator('#spin')).toBeEnabled();
});
test('GUI mostra P4 aditivo e P1 multiplicativo com global final correto',async({page})=>{
  const b=Array(24).fill('S') as Board;b[0]='N1';b[1]='W';b[2]='N1';b[7]='P1';b[10]='W';b[16]='P4';b[22]='W';
  const result=spin(start('base'),20,{next:()=>0},config,true,b),s=createSession('gui-powers');
  s.counter=1;s.balance+=result.paid-20;s.history=[{id:1,date:'2026-10-24T10:00:00Z',mode:'base',bet:20,cost:20,paid:result.paid,balance:s.balance,complete:true,spins:[result],configVersion:config.version}];
  await page.evaluate(data=>localStorage.setItem('slot-local-v1',JSON.stringify(data)),s);await page.reload();await expect(page.locator('#global')).toHaveText('Global ×5');await expect(page.locator('#events')).toContainText('P4 +2');await expect(page.locator('[data-position="1"]')).toHaveAttribute('data-power','P1');await expect(page.locator('[data-position="1"] .power-emblem svg')).toHaveCount(1);await expect(page.locator('[data-position="1"] .symbol-art img')).toHaveAttribute('src',/w-personal-v3/);
  await page.getByRole('button',{name:'Regras',exact:true}).click();await expect(page.locator('#modal-content')).toContainText('P3: converte de 2 a 10');await expect(page.locator('#modal-content')).toContainText(/todas as ativações somam/i);
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.locator('#inspect').click();await expect(page.getByRole('heading',{name:'Último spin',exact:true})).toBeVisible();await expect(page.locator('#modal-content')).toContainText('P4 +2');
  await page.locator('#modal-content [data-line]').first().click();await expect(page.locator('#modal')).not.toBeVisible();await expect(page.locator('.payline-overlay')).toHaveCount(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(s);
});
test('ecrã único mantém tabuleiro e controlos dentro do viewport',async({page})=>{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:720},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,height:innerHeight,rects:['#board','#spin','#bet','#speed','#buy-normal','#buy-superior','#history','#settings','#rules','#fullscreen','#statistics'].map(selector=>{const r=document.querySelector(selector)!.getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};})}));
    expect(dimensions.scroll).toBeLessThanOrEqual(viewport.height);
    for(const r of dimensions.rects){expect(r.x,`${viewport.width}: ${r.selector} x`).toBeGreaterThanOrEqual(0);expect(r.y,`${viewport.width}: ${r.selector} y`).toBeGreaterThanOrEqual(0);expect(r.right,`${viewport.width}: ${r.selector} right`).toBeLessThanOrEqual(viewport.width);expect(r.bottom,`${viewport.width}: ${r.selector} bottom`).toBeLessThanOrEqual(viewport.height);expect(r.height).toBeGreaterThan(15);}
  }
  await page.setViewportSize({width:1280,height:720});await page.locator('#statistics').click();await expect(page.getByRole('heading',{name:'RTP e sessão local'})).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.screenshot({path:'test-results/screen-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/screen-mobile.png'});
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:'test-results/screen-landscape.png'});
});
test('dez símbolos de arte carregam com alpha e preview não cria jogadas',async({page})=>{
  await expect(page.locator('body')).toHaveAttribute('data-assets','ready');await expect(page.locator('#preview-label')).toBeVisible();await expect(page.locator('.cell .symbol-art img')).toHaveCount(24);
  const images=await page.evaluate(async()=>{const paths=[...new Set([...document.querySelectorAll<HTMLImageElement>('.cell img')].map(img=>img.src))];return Promise.all(paths.map(async src=>{const img=new Image();img.src=src;await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);return {src,width:img.naturalWidth,alpha:ctx.getImageData(0,0,1,1).data[3]};}));});
  expect(images).toHaveLength(10);for(const image of images){expect(image.width).toBeGreaterThan(500);expect(image.alpha).toBe(0);}
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(s.history).toHaveLength(0);expect(s.balance).toBe(100000);
});
test('bónus superior recuperado aplica cenário e mantém símbolos e estado',async({page})=>{
  const s=execute(createSession('art-superior'),{type:'start',mode:'superior'},'art-test','2026-10-24T12:00:00Z');
  await page.evaluate(data=>{localStorage.setItem('slot-local-v1',JSON.stringify(data));if(data.active){const row=data.history[0];localStorage.setItem('slot-bonus-entry-v1',`${row.id}:${row.date}:${row.mode}`);}localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'super',autoFs:false,reduced:false,lines:true}));},s);await page.reload();
  await expect(page.locator('.machine')).toHaveAttribute('data-mode','superior');await expect(page.locator('#mode')).toHaveText('Noite de Glória');await expect(page.locator('#fs')).toHaveText('1 / 10');
  await expect(page.locator('body')).toHaveAttribute('data-assets','ready');await page.screenshot({path:'test-results/football-superior.png'});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!))).toEqual(s);
});
test('concluir apresentação com poderes preserva resultado, RNG e pagamento único',async({page})=>{
  let initial=createSession('cancel-0'),expected=execute(initial,{type:'start',mode:'normal'},'expected','date');
  for(let i=1;!expected.history[0].spins[0].detail!.events.length&&i<100;i++){initial=createSession('cancel-'+i);expected=execute(initial,{type:'start',mode:'normal'},'expected','date');}
  expect(expected.history[0].spins[0].detail!.events.length).toBeGreaterThan(0);
  await page.evaluate(s=>{localStorage.setItem('slot-local-v1',JSON.stringify(s));localStorage.setItem('slot-preferences-v1',JSON.stringify({speed:'normal',autoFs:false,reduced:false,lines:true}));},initial);await page.reload();await page.locator('#bonus-shop').click();await page.locator('#buy-normal').click();await page.locator('#confirm-buy').click();await page.locator('#enter-bonus').click({timeout:20000});await expect(page.locator('#spin')).toHaveText('CONCLUIR');await page.locator('#spin').click();await expect(page.locator('#spin')).toHaveText('PRÓXIMO FS',{timeout:15000});
  const actual=await page.evaluate(()=>JSON.parse(localStorage.getItem('slot-local-v1')!));expect(actual.rngState).toBe(expected.rngState);expect(actual.balance).toBe(expected.balance);expect(actual.history[0].spins).toEqual(expected.history[0].spins);await expect(page.locator('#board')).not.toHaveClass(/busy/);
});
