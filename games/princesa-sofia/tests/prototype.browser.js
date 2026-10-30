import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/config.js';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const port = 4176, origin = `http://127.0.0.1:${port}`;
const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['scripts/serve.js', '--port', String(port)], { cwd: root, windowsHide: true, stdio: 'pipe' });
let serverError = '';
server.stderr.on('data', chunk => { serverError += chunk; });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(`Local server did not start: ${serverError}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = await chromium.launch({ headless: true, ...(existsSync(chromium.executablePath()) ? {} : existsSync(edge) ? { executablePath: edge } : {}) });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => {
    if (route.request().url().startsWith(origin)) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.goto(`${origin}/game.html`);
  await page.waitForSelector('#board .cell:nth-child(30)');
  assert.equal(await page.locator('#board .cell').count(), 30);

  await page.goto(origin);
  const widget = page.frameLocator('iframe');
  await widget.locator('#board .cell:nth-child(30)').waitFor();
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  const balanceBeforeExpand = await widget.locator('#balance').innerText();
  await widget.locator('#expand-button').click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  await widget.locator('#expand-button[aria-pressed="true"]').waitFor();
  assert.equal(await widget.locator('#balance').innerText(), balanceBeforeExpand);
  await page.screenshot({path:join(tmpdir(),'sofia-fullscreen.png')});
  for (const viewport of [{width:844,height:390},{width:390,height:844},{width:1400,height:1100}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await widget.locator('.shell').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1 && el.getBoundingClientRect().right <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1), 'Fullscreen must fit without scrollbars');
  }

  await widget.locator('#rules-button').click();
  assert.ok(await widget.locator('#rules-dialog').isVisible());
  await page.keyboard.press('Escape');
  await widget.locator('#expand-button').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await widget.locator('#expand-button[aria-pressed="false"]').waitFor();
  await page.screenshot({path:join(tmpdir(),'sofia-widget.png')});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.ok(await widget.locator('.shell').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1), 'Embedded mobile slot must fit without scrollbars');
  await page.screenshot({path:join(tmpdir(),'sofia-widget-mobile.png')});
  await page.goto(`${origin}/game.html`);
  await page.setViewportSize({width:1400,height:1100});

  const dimensions = [];
  const widths = [1600,1400,1100,1024,901,900,800,768,761,760,600,390,360,320,390,768,900,901,1024,1100,1400,1600];
  let previous = null;
  for (const width of widths) {
    await page.setViewportSize({ width, height: width > 700 ? 1100 : 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const geometry = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.cell')].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      const actions = [...document.querySelectorAll('.control-deck button')].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y:r.y, right: r.right, bottom:r.bottom, h: r.height }; });
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom }; };
      return { pageWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, cells, actions, board:rect('.board-frame'), xp:rect('.xp-panel'), wilds:rect('.magic-panel'), menu:rect('.control-deck'), left:['#rules-button','.volume-control','.money-block','.result-panel'].map(rect), right:['#bet-minus','#spin','#bet-plus','.speed-control'].map(rect), auto:rect('#auto-button'), spin:rect('#spin') };
    });
    assert.ok(geometry.scrollWidth <= width + 1, `Page overflow at ${width}`);
    assert.equal(new Set(geometry.cells.map(c => Math.round(c.x))).size, 6);
    assert.equal(new Set(geometry.cells.map(c => Math.round(c.y))).size, 5);
    assert.ok(geometry.cells.every(c => Math.abs(c.w / c.h - 1.18) < .02), `Incorrect stretched cells at ${width}`);
    assert.ok(geometry.actions.every(b => b.h >= 14), `Controls clipped or too small at ${width}`);
    for (let i=0;i<geometry.actions.length;i++) for(let j=i+1;j<geometry.actions.length;j++) {
      const a=geometry.actions[i],b=geometry.actions[j];
      // The concave autoplay surface shares the spin bounding box, but not its clickable shape.
      if ((i === 3 && j === 5)) continue;
      assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1 || Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,`Buttons overlap at ${width}`);
    }
    const centers = [...geometry.left, ...geometry.right].map(r => (r.y + r.bottom) / 2);
    assert.ok(Math.max(...centers) - Math.min(...centers) < 2, `Controls must stay aligned at ${width}`);
    const bonus = await page.locator('#buy-button').boundingBox();
    assert.ok(bonus.y >= geometry.wilds.bottom, `Bonus must sit below wilds at ${width}`);
    assert.ok(bonus.y + bonus.height <= geometry.menu.y, `Bonus must stay above the controls at ${width}`);
    assert.ok(Math.abs(bonus.y + bonus.height - geometry.board.bottom) < 2, `Bonus must sit at the bottom of the sidebar at ${width}`);
    const amounts = await page.locator('#balance, #win').evaluateAll(els => els.map(el => ({height:el.getBoundingClientRect().height, lineHeight:parseFloat(getComputedStyle(el).fontSize), nowrap:getComputedStyle(el).whiteSpace})));
    assert.ok(amounts.every(r => r.nowrap === 'nowrap' && r.height < r.lineHeight * 2), `Amounts must stay on one line at ${width}`);
    assert.ok(Math.abs(geometry.left[2].y - geometry.left[3].y) < 1, `Balance and win must align at ${width}`);
    assert.ok(await page.evaluate(() => document.body.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('.control-deck').scrollWidth <= document.querySelector('.control-deck').clientWidth + 1), `Slot must fit without scrolling at ${width}`);
    const boardWidth = geometry.board.right-geometry.board.x;
    if(previous && width<previous.width) assert.ok(boardWidth<=previous.boardWidth+1,`Board grows when viewport shrinks at ${width}`);
    if(previous && width>previous.width) assert.ok(boardWidth>=previous.boardWidth-1,`Board shrinks when viewport grows at ${width}`);
    previous={width,boardWidth};
    assert.ok(geometry.xp.bottom <= geometry.board.y + 1, 'XP must stay above the slot');
    assert.ok(geometry.wilds.right <= geometry.board.x, 'Wild indicators must stay left of the slot');
    assert.ok(geometry.menu.y >= geometry.board.bottom, 'Menu must stay below the slot');
    assert.ok(geometry.wilds.y <= geometry.board.y + geometry.cells[0].h, 'Wild indicators must stay near the top');
    if (width === 1400) {
      assert.ok(geometry.board.right - geometry.board.x >= 690, 'Desktop board should be wider');
      assert.ok(geometry.left.every((r,i,xs) => !i || r.x >= xs[i-1].right), 'Info/sound/balance/win order');
      assert.ok(geometry.right.every((r,i,xs) => !i || r.x >= xs[i-1].right), 'Bet/spin/speed order');
      assert.ok(geometry.auto.y < geometry.spin.bottom && geometry.auto.bottom <= geometry.spin.bottom + 24 && Math.abs(geometry.auto.x - geometry.spin.x) < 1, 'Autoplay must fit around the lower spin edge');
    }
    dimensions.push({ viewport: width, cell: geometry.cells[0].w, boardRows: 5, boardColumns: 6 });
    if (width === 1400 || width === 390) await page.screenshot({ path: join(tmpdir(), `sofia-prototype-${width}.png`), fullPage: true });
  }

  assert.equal(await page.locator('#buy-button small').innerText(), '4 Opções');
  const bonusShape = await page.locator('#buy-button').boundingBox();
  assert.ok(bonusShape.height > bonusShape.width, 'Bonus button must be vertical');
  assert.equal(await page.locator('.speed-control button').count(),1);
  assert.equal(await page.locator('.speed-stars > span').count(),3);
  for(const [mode,label,active] of [['fast','Rápido',2],['ultra','Ultra',3],['normal','Normal',1]]) {
    await page.locator('#speed-button').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#speed-button').getAttribute('data-speed'),mode);
    assert.equal(await page.locator('#speed-label').innerText(),label);
    assert.equal(await page.locator('.speed-stars .active').count(),active);
  }
  async function setSpeed(mode){
    for(let i=0;i<3;i++){
      if(await page.locator('#speed-button').getAttribute('data-speed')===mode)return;
      await page.locator('#speed-button').click();
    }
    assert.equal(await page.locator('#speed-button').getAttribute('data-speed'),mode);
  }

  await page.setViewportSize({ width:1400, height:1000 });
  await page.locator('#buy-button').click();
  assert.equal(await page.locator('.buy-option').count(), 4);
  await page.screenshot({path:join(tmpdir(),'sofia-bonus-popup-1400.png'),fullPage:true});
  await page.setViewportSize({width:390,height:1000});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({path:join(tmpdir(),'sofia-bonus-popup-390.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:320,height:1000});

  // Mobile native dialog containment, table-local scrolling, focus and Escape.
  await page.getByRole('button', { name: 'Regras', exact: true }).click();
  await page.waitForSelector('#rules-dialog[open]');
  assert.equal(await page.locator('#rules-content tbody tr').count(), 10);
  for (const mode of ['common','super','secret','base']) {
    await page.locator('#payout-mode').selectOption(mode);
    const table=DEFAULT_CONFIG.bonusPay100?.[mode] ?? DEFAULT_CONFIG.pay100;
    const displayed=await page.locator('#rules-content tbody td').allTextContents();
    assert.deepEqual(displayed,table.flat().map(v=>new Intl.NumberFormat('pt-PT',{maximumFractionDigits:2}).format(v/100)+'\u00d7'));
  }

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => Boolean(document.activeElement.closest('#rules-dialog'))));
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#rules-dialog').getAttribute('open'), null);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'rules-button');

  await page.locator('#auto-button').click();
  await page.locator('#auto-range').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#auto-range').getAttribute('aria-valuetext'), '10 spins');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#auto-range').getAttribute('aria-valuetext'), '100 spins');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#auto-range').getAttribute('aria-valuetext'), '200 spins');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#auto-range').getAttribute('aria-valuetext'), '500 spins');
  await page.keyboard.press('Escape');

  await page.locator('#mute-button').click();
  assert.equal(await page.locator('#volume').inputValue(), '0');
  assert.equal(await page.locator('#mute-button').getAttribute('aria-label'), 'Ativar som');
  await page.locator('#mute-button').click();
  assert.equal(await page.locator('#volume').inputValue(), '35');
  await page.locator('#buy-button').click();
  assert.deepEqual(await page.locator('.buy-option').evaluateAll(items => items.map(el => el.dataset.mode)), ['hunt','common','super','secret']);
  await page.locator('#hunt-button').click();
  assert.equal(await page.locator('#hunt-button').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#spin-cost').innerText(), /4,00/);
  await page.locator('#bet-plus').click();
  assert.match(await page.locator('#spin-cost').innerText(), /6,00/);
  await page.locator('#buy-button').click();
  await page.locator('#buy-bet-plus').click();
  assert.equal(await page.locator('#bet').inputValue(), '200');
  assert.match(await page.locator('#hunt-price').innerText(), /8,00/);
  await page.locator('#buy-bet-minus').click();
  await page.locator('#hunt-button').click();
  await page.locator('#bet').selectOption('5000', { force: true });
  await page.locator('#buy-button').click();
  assert.equal(await page.locator('[data-buy=secret]').isDisabled(), true);
  assert.equal(await page.locator('[data-buy=super]').isDisabled(), true);
  assert.equal(await page.locator('[data-buy=common]').isDisabled(), false);
  await page.keyboard.press('Escape');
  await page.locator('#bet').selectOption('20', { force: true });

  async function settle() {
    for (let i = 0; i < 1200; i++) {
      if (await page.locator('#notice-dialog').getAttribute('open') !== null) await page.locator('#notice-dialog [data-close]').click();
      if (await page.locator('#spin-label').innerText() === 'Rodar') return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error('Presentation did not finish');
  }

  await page.locator('#buy-button').click();
  assert.equal(await page.locator('[data-buy]').count(), 3);
  assert.match(await page.locator('[data-mode=common] > strong').innerText(), /16,00/);
  await page.locator('[data-buy=common]').click();
  assert.equal(await page.locator('#bet').isDisabled(), true);
  assert.equal(await page.locator('#hunt-button').isDisabled(), true);
  await setSpeed('ultra');
  assert.equal(await page.locator('#speed-label').innerText(), 'Ultra');
  await settle();
  assert.equal(await page.locator('#bet').isDisabled(), false);

  const balanceBeforeDemo = await page.locator('#balance').innerText();
  await page.locator('#rules-button').click();
  await page.locator('.demo-controls summary').click();
  await page.keyboard.press('Escape');
  await page.locator('#bet').selectOption('5000', { force: true });
  await page.locator('#rules-button').click();
  await page.locator('[data-demo=max]').click();
  await page.waitForFunction(() => document.getElementById('notice-title').textContent === 'MAX WIN' && document.getElementById('notice-dialog').open);
  assert.equal(await page.locator('#balance').innerText(), balanceBeforeDemo);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator('#notice-dialog [data-close]').click();
  await settle();
  assert.equal(await page.locator('#balance').innerText(), balanceBeforeDemo);
  assert.equal(await page.locator('#demo-label').isVisible(), true);
  const previousWin = await page.locator('#win').innerText();
  await page.locator('#bet').selectOption('100', { force: true });
  assert.equal(await page.locator('#win').innerText(), previousWin, 'Changing bet must not revalue the previous win');

  await page.locator('#rules-button').click();
  await page.locator('[data-demo=super]').click();
  await page.waitForSelector('#notice-dialog[open]');
  assert.match(await page.locator('#notice-title').innerText(), /Super/);
  await page.locator('#notice-dialog [data-close]').click();
  await settle();
  assert.equal(await page.locator('#balance').innerText(), balanceBeforeDemo);

  // Start ten paid spins, stop the queue during the first one and let it settle.
  await setSpeed('normal');
  await page.locator('#auto-button').click();
  await page.locator('#auto-range').focus(); await page.keyboard.press('Home');
  await page.locator('#auto-start').click();
  assert.equal(await page.locator('#bet').isDisabled(), true);
  await page.locator('#auto-button').click();
  await setSpeed('ultra');
  await settle();
  assert.equal(await page.locator('#auto-status').innerText(), '');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#rules-button').click();
  await page.locator('[data-demo=hit]').click(); await settle();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Space'); await settle();
  assert.equal(await page.locator('#demo-label').isVisible(), false);
  assert.equal(await page.locator('#error').isVisible(), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(JSON.stringify({ passed: true, dimensions, checks: ['responsive board', 'keyboard/focus/Escape', 'autoplay steps and stop', 'speed/volume', 'hunt/bet', 'purchase/lock/settlement', 'bonus and MAX WIN demos', 'reduced motion', 'no external requests'], screenshots: [join(tmpdir(), 'sofia-prototype-1400.png'), join(tmpdir(), 'sofia-prototype-390.png')] }, null, 2));
} finally {
  await browser?.close(); server.kill();
}
