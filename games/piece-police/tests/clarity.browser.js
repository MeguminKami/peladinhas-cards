import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {startServer} from '../scripts/serve.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[],results=[];await mkdir('test-results',{recursive:true});
async function newPage(speed){const p=await browser.newPage({viewport:{width:1280,height:800}});
  await p.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.addInitScript(s=>{localStorage.setItem('peace-police-speed',JSON.stringify(s));localStorage.setItem('pp-movimento-reduzido','0');},speed);await p.goto(base+'/game.html?debug=1');await p.waitForFunction(()=>window.pp?.estado==='PRONTO');await p.waitForSelector('#pp-debug');await p.evaluate(()=>{const d=document.querySelector('#pp-debug');if(!d.classList.contains('closed'))d.querySelector('[data-k=toggle]').click();d.hidden=true;document.querySelector('#pp-perf').hidden=true;});return p;}
const fixtures={};
try{
  for(const kind of (process.argv.includes('--bonus-only')?['bonus']:['base','bonus']))for(const speed of ['normal','fast','ultra']){
    const p=await newPage(speed);
    assert.ok(await p.locator('#speed-button').isVisible());assert.equal(await p.evaluate(()=>window.pp.rate),{normal:1,fast:2,ultra:3.75}[speed]);
    if(!fixtures[kind])fixtures[kind]=await p.evaluate(async kind=>{const {scenario}=await import('/src/index.js');return scenario(kind==='base'?'alcool':'bonus:police');},kind);
    await p.evaluate(({result,kind,speed})=>{
      window.__partyOff=0;window.__partySeen=false;window.__partyBanners=0;window.__held=false;window.__pause=false;window.__pausedOnce=false;window.__events=0;window.__fusionModals=[];
      window.pp.on('overlay',e=>{if(e.kind==='fusion')window.__fusionModals.push(e.title);});
      const wrap=document.querySelector('#board-wrap');
      window.__observer=new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes'&&m.target===wrap&&m.attributeName==='data-party'){if(wrap.dataset.party==='true')window.__partySeen=true;else if(window.__partySeen)window.__partyOff++;}for(const n of m.addedNodes)if(n.nodeType===1&&n.classList.contains('fx-party'))window.__partyBanners++;}});
      window.__observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-party']});
      window.pp.on('gate',()=>window.__held=true);
      window.pp.on('evento',e=>{window.__events++;if(speed==='normal'&&!window.__pausedOnce&&(kind==='bonus'?e.type==='step.end':e.type==='power.drunk_walk.step')){window.__pausedOnce=true;window.__pause=true;window.pp.setStepMode(true);}});
      window.pp.runResult(result);
    },{result:fixtures[kind],kind,speed});
    const start=Date.now();let pausedMs=0;
    while(Date.now()-start<200000){
      const state=await p.evaluate(()=>({ready:window.pp.estado==='PRONTO'&&!window.pp.busy,open:document.querySelector('#overlay').open,kind:document.querySelector('#overlay').dataset.kind,fusion:document.querySelector('#overlay').dataset.fusion,pause:window.__pause&&window.__held}));
      if(state.ready)break;
      if(state.open){
        if(state.kind==='bonus'){assert.equal(await p.locator('.bonus-rules').count(),1);assert.equal(await p.locator('.bonus-rules .fusion-explanation').count(),0);}
        await p.waitForTimeout(520);await p.locator('#overlay-continue').click();await p.waitForTimeout(80);continue;
      }
      if(state.pause){
        const t=Date.now();
        if(kind==='bonus')for(const [w,h]of [[1280,800],[390,844],[844,390],[320,640]]){
          await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);
          assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1));
          assert.equal(await p.locator('.persona .st').evaluateAll(es=>es.some(e=>/DESPERTO|a dormir/.test(e.textContent))),false);
          assert.ok(await p.locator('#fusion-indicator').isVisible());
          assert.ok(await p.locator('#board .cell[data-sym=CW] .name').evaluateAll(es=>es.every(e=>e.textContent==='WILD'&&getComputedStyle(e).display!=='none')));
          await p.screenshot({path:`test-results/clarity-bonus-${w}.png`});
        }
        else{assert.ok(await p.locator('.cell[data-sym=W] .name').first().isVisible());assert.equal(await p.locator('.cell[data-sym=W] .name').first().textContent(),'WILD');await p.screenshot({path:'test-results/clarity-cup-wild.png'});}
        await p.setViewportSize({width:1280,height:800});await p.evaluate(()=>{window.__pause=false;window.pp.setStepMode(false);});pausedMs+=Date.now()-t;
      }
      await p.waitForTimeout(60);
    }
    assert.ok(await p.evaluate(()=>window.pp.estado==='PRONTO'&&!window.pp.busy),'jogada terminou');
    const out=await p.evaluate(()=>{window.__observer.disconnect();return{win:window.pp.model.roundWin,grid:window.pp.model.grid,events:window.__events,partyOff:window.__partyOff,partyBanners:window.__partyBanners,modals:window.__fusionModals,activations:Number(document.querySelector('#fusion-indicator').dataset.activations||0),colours:[document.querySelector('.shell').style.getPropertyValue('--party-a'),document.querySelector('.shell').style.getPropertyValue('--party-b')]};});
    const modalCounts={};for(const title of out.modals)modalCounts[title]=(modalCounts[title]||0)+1;
    assert.equal(out.win,fixtures[kind].totalWinMils);
    if(kind==='bonus'){assert.equal(out.partyOff,0,'Party não desliga entre spins');assert.equal(out.partyBanners,1,'Party só anunciado uma vez');for(const n of Object.values(modalCounts))assert.equal(n,1);assert.ok(out.activations>=Object.keys(modalCounts).length);}
    results.push({kind,speed,ms:Date.now()-start-pausedMs,win:out.win,events:out.events,partyBanners:out.partyBanners,partyOff:out.partyOff,modalCounts,activations:out.activations,colours:out.colours});console.log('ok',kind,speed,results.at(-1).ms);await p.close();
  }
  for(const kind of (process.argv.includes('--bonus-only')?['bonus']:['base','bonus'])){const rows=results.filter(r=>r.kind===kind);assert.ok(rows[0].ms>rows[1].ms&&rows[1].ms>rows[2].ms,'velocidades percetíveis');assert.ok(rows.every(r=>r.events===rows[0].events&&r.win===rows[0].win));}
  assert.deepEqual(errors,[]);await writeFile(process.argv.includes('--bonus-only')?'test-results/clarity-bonus-review.json':'test-results/clarity-review.json',JSON.stringify({results,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
