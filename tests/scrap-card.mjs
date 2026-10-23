import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync} from "node:fs";
import {resolve,extname,sep} from "node:path";
import assert from "node:assert/strict";
import {chromium} from "./browser-sandbox.mjs";
const root=resolve(".");
const html=`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${["styles","cards","responsive","experience"].map(file=>`<link rel="stylesheet" href="/css/${file}.css">`).join("")}<style>body{padding:24px;margin:0}.scrap-gallery{display:flex;flex-wrap:wrap;gap:32px;align-items:start;justify-content:center}figure{margin:0;display:grid;gap:16px}figcaption{font-size:14px;color:var(--text-secondary);text-align:center}h1{font-size:24px;margin:0 0 24px}.scrap-gallery .card-lg{--card-width:min(300px,calc(100vw - 48px))}</style></head><body><h1>Sucata · até 49 OVR</h1><main class="scrap-gallery"></main></body></html>`;
const server=createServer((req,res)=>{
  if(req.url==="/"){res.setHeader("Content-Type","text/html");res.end(html);return;}
  const file=resolve(root,"."+new URL(req.url,"http://localhost").pathname);
  if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader("Content-Type",({".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".woff":"font/woff"})[extname(file)]||"application/octet-stream");res.end(readFileSync(file));
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"msedge"}:{})});
mkdirSync("test-results",{recursive:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:"block"});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const {card,bindImages}=await import("/js/cards.js"),{ATTRIBUTES}=await import("/js/utils.js");
    const base={uid:"preview",displayName:"José Ferreira",hasCard:true,primaryPosition:"MED",countryCode:"PT",selectedCardId:"base",photoURL:"/assets/default-avatar.svg",stats:Object.fromEntries(ATTRIBUTES.map(([key],i)=>[key,41+i]))};
    const cases=[{...base,ovr:49,cardType:"bronze-common"},{...base,ovr:0,displayName:"João Alexandre Gonçalves",cardType:"scrap"},{...base,ovr:50,cardType:"bronze-common"}];
    document.querySelector("main").innerHTML=cases.map((p,i)=>`<figure>${card(p,{size:"lg"})}<figcaption>${i<2?"Sucata":"Bronze comum"} · ${p.ovr} OVR</figcaption></figure>`).join("");
    bindImages();
  });
  assert.equal(await page.locator(".football-card.scrap").count(),2);
  assert.equal(await page.locator(".scrap .card-edition").count(),0);
  await page.locator(".scrap").first().focus();
  assert.equal(await page.locator(".scrap .card-frame").first().evaluate(el=>getComputedStyle(el).borderTopWidth),"3px");
  for(const theme of ["club","volt","champions","ultimate"]){
    await page.evaluate(async theme=>(await import("/js/themes.js")).applyTheme(theme),theme);
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>document.activeElement?.blur());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}/${width}: overflow`);
      const label=await page.locator(".scrap .card-rating strong").first().textContent();assert.equal(label,"49");
      await page.screenshot({path:`test-results/scrap-card-${theme}-${width}.png`,fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  if(process.argv.includes("--docs")) {
    await page.setViewportSize({width:1920,height:850});
    await page.evaluate(async()=>(await import("/js/themes.js")).applyTheme("club"));
    await page.locator(".football-card.scrap").first().screenshot({path:"docs/media/scrap-card.png",omitBackground:true});
    await page.evaluate(async()=>{
      const {card}=await import("/js/cards.js"),{ATTRIBUTES,calculateBaseCard,themeName}=await import("/js/utils.js");
      document.querySelector("main").innerHTML=[49,59,64,69,74,84,99].map(ovr=>{
        const type=calculateBaseCard(ovr);
        return `<figure>${card({uid:"base-preview",hasCard:true,displayName:"José Ferreira",ovr,cardType:type,selectedCardId:"base",primaryPosition:"MED",countryCode:"PT",stats:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,ovr]))},{size:"sm",preview:true})}<figcaption>${themeName(type)}</figcaption></figure>`;
      }).join("");
    });
    await page.locator("main").screenshot({path:"docs/media/card-rarities.png"});
  }
  console.log("Sucata: boundary previews, zero OVR, long name, keyboard and four themes/widths passed; no Firebase requests.");
} finally {await browser.close();await new Promise(done=>server.close(done));}
