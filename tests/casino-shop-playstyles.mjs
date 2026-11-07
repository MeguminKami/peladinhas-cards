import assert from 'node:assert/strict';
import { chromium } from './browser-sandbox.mjs';
const browser = await chromium.launch({headless:true,channel:'msedge'});
try {
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8082/assets/casino/shop/');
  await page.evaluate(async()=>{
    document.head.insertAdjacentHTML('afterbegin', '<base href="/">');
    const {card}=await import('/js/cards.js');
    const {SHOP_CARDS}=await import('/js/casino-shop-catalog.js');
    const {renderCasinoShopCard}=await import('/js/casino-shop-art.js');
    const stats={pace:99,shooting:99,passing:99,dribbling:99,defending:99,physical:99,goalkeeping:99,stamina:99};
    const player={displayName:'Jogador',name:'Jogador',ovr:99,stats,countryCode:'PT',primaryPosition:'GR'};
    document.body.innerHTML='<main id="comparison" style="display:flex;flex-wrap:wrap;gap:40px;padding:40px">'+card(player,{preview:true,theme:'gold-common'})+SHOP_CARDS.map(c=>renderCasinoShopCard(c,player)).join('')+'</main>';
  });
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    const positions=await page.locator('.football-card, .casino-shop-card').evaluateAll(cards=>cards.map(card=>{
      const parent=card.getBoundingClientRect();const icons=[...card.querySelectorAll('.card-playstyles img')].map(icon=>{const r=icon.getBoundingClientRect();return {x:(r.x-parent.x)/parent.width,y:(r.y-parent.y)/parent.height,w:r.width/parent.width,h:r.height/parent.height};});return icons;
    }));
    assert.equal(positions.length,18);assert.equal(positions[0].length,3);
    for(const icons of positions.slice(1)){
      assert.equal(icons.length,3);
      icons.forEach((icon,i)=>{for(const key of ['x','y','w','h'])assert.ok(Math.abs(icon[key]-positions[0][i][key])<0.002,`${width}: ${key}`);});
    }
  }
  await page.screenshot({path:'test-results/shop-playstyles.png',fullPage:true});
  console.log('17 cartas: posição, tamanho e coluna dos 3 playstyles iguais à carta normal em desktop e telemóvel.');
}finally{await browser.close();}

