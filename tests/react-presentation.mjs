import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Local fixtures only: no Firebase credentials, external requests or real writes.
const server=await createServer({mode:'test',server:{port:0}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const captures='test-results/react-presentation';
mkdirSync(captures,{recursive:true});
const errors=[];
async function context(guest=false){
 const ctx=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.route(/https:\/\//,route=>route.abort());
 if(guest)await ctx.addInitScript(()=>window.__guest=true);
 const page=await ctx.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.message));
 return {ctx,page};
}
async function capture(page,name,width){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${width}: page overflow`);
 assert.equal(await page.locator('parsererror').count(),0,`${name}: malformed SVG`);
 await page.screenshot({path:`${captures}/${name}-${width}.png`,fullPage:true});
}
try{
 for(const width of [1440,768,390,320]){
  const {ctx,page}=await context(true);
  await page.setViewportSize({width,height:1000});
  await page.goto(server.resolvedUrls.local[0]);await page.locator('#auth-form').waitFor();
  await capture(page,'auth',width);
  await page.locator('[data-mode=register]').click();
  await page.locator('[name=username]').fill('novo_jogador');
  await page.locator('[name=password]').fill('password123');
  await page.locator('[name=confirmPassword]').fill('different123');
  await page.locator('#auth-form button').last().click();
  assert.match(await page.locator('#auth-error').textContent(),/coincidem/);
  await page.locator('[name=confirmPassword]').fill('password123');
  await page.locator('#auth-form button').last().click();
  await page.locator('[name=displayName]').fill('João da Conceição Peladinhas');
  await page.locator('[name=countryCode]').selectOption('PT');
  await page.locator('[name=birthDate]').fill('1994-04-16');
  await page.locator('[name=heightCm]').fill('184');
  await page.locator('[name=weightKg]').fill('79.5');
  await page.locator('[name=preferredFoot]').selectOption('both');
  await page.locator('[name=primaryPosition]').selectOption('ALA');
  await page.locator('[name=secondaryPositions][value=MED]').check();
  await capture(page,'register-profile',width);
  await page.locator('#auth-form button').last().click();
  await page.locator('#avatar-preview').waitFor();
  await capture(page,'register-photo',width);
  await page.locator('#auth-form button').last().click();
  await capture(page,'register-confirm',width);
  await page.locator('#auth-form button').last().click();
  await page.waitForFunction(()=>window.__testState.users.some(user=>user.uid==='new-user'));
  const profile=await page.evaluate(()=>window.__testState.users.find(user=>user.uid==='new-user'));
  assert.equal(profile.heightCm,184);assert.equal(profile.weightKg,79.5);
  assert.equal(profile.countryCode,'PT');assert.equal(profile.preferredFoot,'both');
  assert.deepEqual(profile.secondaryPositions,['MED']);
  await page.waitForFunction(()=>location.hash==='#/missions/self');
  await ctx.close();
 }
 const {ctx,page}=await context();
 await page.goto(server.resolvedUrls.local[0]);await page.locator('.dashboard-greeting').waitFor();
 await page.evaluate(()=>location.hash='#/profile/edit');await page.locator('#profile-form').waitFor();
 await page.locator('[name=displayName]').fill('Pedro Silva React');
 await page.locator('[name=birthDate]').fill('1990-01-01');
 await page.locator('[name=heightCm]').fill('181');
 await page.locator('[name=preferredFoot]').selectOption('right');
 await page.locator('#profile-form button[type=submit], #profile-form .actions button').first().click();
 await page.waitForFunction(()=>window.__testState.users.find(user=>user.uid==='pedro').displayName==='Pedro Silva React');
 await page.waitForFunction(()=>location.hash==='#/profile');
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>location.hash='#/admin/events');await page.locator('#new-event').waitFor();
  await page.locator('#new-event').click();await page.locator('#event-builder-form').waitFor();
  await page.locator('#editor-next').click();
  assert.match(await page.locator('#event-builder-form').textContent(),/título ao desafio/);
  await page.locator('[name=title]').fill('Taça Peladinhas de Outubro');
  for(let step=0;step<5;step++){
   await page.locator(`[data-editor-step="${step}"]`).click();
   await capture(page,`event-editor-${step}`,width);
  }
  await page.locator('#close-editor').click();
  await page.locator('#new-mission').click();
  await page.locator('[name=title]').fill(`Missão React ${width}`);
  await page.locator('[data-editor-step="1"]').click();
  await page.locator('[data-objective-family=stars]').click();
  await capture(page,'mission-stars',width);
  await page.locator('[data-editor-step="3"]').click();
  await page.locator('[name=boost-pace]').fill('2');
  await page.locator('[data-editor-step="4"]').click();
  await page.locator('[name=submitAction][value=draft]').click();
  await page.waitForFunction(title=>(window.__adminCalls||[]).some(call=>call.name==='eventAction'&&call.data.title===title),`Missão React ${width}`);
  const saved=await page.evaluate(()=>(window.__adminCalls||[]).filter(call=>call.name==='eventAction').at(-1).data);
  assert.equal(saved.kind,'mission');assert.equal(saved.objective.metric,'ratingGames');
  assert.equal(saved.scope,'individual');assert.equal(saved.positions[0].boosts.pace,2);
  assert.equal(saved.openNow,false);
  await page.locator('#event-editor').waitFor({state:'detached'});
 }
 await page.evaluate(()=>location.hash='#/admin/player/joao/edit');
 await page.locator('#profile-form').waitFor();
 assert.equal(await page.locator('.admin-area-nav').count(),1);
 assert.equal(await page.locator('.admin-mobile-select select').inputValue(),'#/admin/players');
 await capture(page,'admin-profile',320);
 // Import the same optimized React modules as Vite, avoiding a second runtime.
 const cardCode=(await server.transformRequest('/src/presentation/cards.tsx')).code;
 const mainCode=(await server.transformRequest('/src/main.tsx')).code;
 const reactURL=cardCode.match(/from\s+["']([^"']*react\.js[^"']*)["']/)?.[1];
 const rootURL=mainCode.match(/from\s+["']([^"']*react-dom_client\.js[^"']*)["']/)?.[1];
 assert.ok(reactURL);assert.ok(rootURL);
 await page.setViewportSize({width:1440,height:1100});
 await page.evaluate(async({reactURL,rootURL})=>{
  const reactModule=await import(reactURL),rootModule=await import(rootURL),R=reactModule.default||reactModule,createRoot=rootModule.createRoot||rootModule.default.createRoot,{Card}=await import('/src/presentation/cards.tsx');
  document.querySelector('#root').style.display='none';
  const host=document.createElement('div');host.id='samples';
  host.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px;padding:32px;align-items:start';
  document.body.append(host);
  const player={uid:'sample',displayName:'MIGUEL SILVA',countryCode:'PT',primaryPosition:'ALA',ovr:94,hasCard:true,stats:{pace:96,shooting:94,passing:92,dribbling:96,defending:88,physical:93,goalkeeping:60,stamina:95},cardType:'gold-rare'};
  createRoot(host).render(R.createElement(R.Fragment,null,...['gold-rare','in-form','toty','tots','perfect-five','icon','legend-form','custom'].map(theme=>R.createElement('div',{key:theme},R.createElement('p',null,theme),R.createElement(Card,{player:{...player,specials:theme==='custom'?[{id:'custom',cardTheme:{baseTheme:'toty',colors:{primary:'#7c3aed',secondary:'#ec4899'},design:{decoration:'stars',watermark:'ball',shape:'hexagon',effect:'foil',background:'aurora'}}}]:[]},preview:true,theme,size:'md'})))));
 },{reactURL,rootURL});
 await page.locator('#samples .football-card').last().waitFor();
 assert.equal(await page.locator('#samples .football-card').count(),8);
 assert.ok(await page.locator('#samples .special-motif > *').count()>0);
 assert.ok(await page.locator('#samples .studio-decoration > *').count()>0);
 assert.ok(await page.locator('#samples .studio-watermark > *').count()>0);
 await capture(page,'card-variants',1440);
 await ctx.close();
 assert.deepEqual(errors,[]);
 console.log('React presentation: registration, profile persistence, event steps and mission payload passed at 1440/768/390/320 px.');
}finally{await browser.close();await server.close();}
