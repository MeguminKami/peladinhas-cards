import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const server=await createServer({mode:'test',server:{port:0},plugins:[{
  name:'stale-release-fixture',enforce:'pre',configureServer(vite){
    vite.middlewares.use((request,response,next)=>{
      if(request.url!=='/sw.js')return next();
      response.setHeader('Content-Type','text/javascript');
      response.end(`self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
        self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
        self.addEventListener('fetch',event=>{if(new URL(event.request.url).pathname.startsWith('/css/'))event.respondWith(Promise.resolve(new Response('',{headers:{'Content-Type':'text/css'}})));});`);
    });
  },
}]});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route(/https:\/\//,route=>route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('.dashboard-greeting').waitFor();
  await page.evaluate(async()=>{
    await (await caches.open('another-app')).put('/keep',new Response('keep'));
    await caches.open('peladinhas:/:stale');
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  });
  await page.reload();
  await page.waitForFunction(()=>!navigator.serviceWorker.controller&&getComputedStyle(document.body).backgroundColor==='rgb(8, 11, 16)');
  assert.equal(await page.locator('.brand img').evaluate(image=>getComputedStyle(image).width),'26px');
  assert.deepEqual(await page.evaluate(()=>caches.keys()),['another-app']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const response=await fetch(new URL('css/styles.css',server.resolvedUrls.local[0]));
  assert.equal(response.headers.get('cache-control'),'no-store');
  await page.screenshot({path:'.firebase/dev-cache-fixed-390.png'});
  assert.deepEqual(errors,[]);
  console.log('Development: stale worker removed, styles restored, unrelated cache preserved.');
} finally {await browser.close();await server.close();}
