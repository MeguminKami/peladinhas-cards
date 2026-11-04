// Testes de browser da GUI de teste (Fase 2). Playwright + Chromium.
//   npm run test:ui              (todos)
//   npm run test:ui -- tamanhos  (só os que têm «tamanhos» no nome)
// Capturas em test-results/. Sai com código 1 se algum teste falhar.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from '../scripts/serve.js';
import { config } from '../src/index.js';

// Preços das compras vêm da configuração (mudam quando a matemática é recalibrada). Aposta de 1,00 DJC = 100 cêntimos.
const custoCompra = (mode, bet = 100) => Math.round(config.modes[mode].costMils * bet / 1000);
const djc = (c) => `${new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(c / 100)} DJC`;

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));
const root = fileURLToPath(new URL('../', import.meta.url));
const shots = `${root}test-results/`;
mkdirSync(shots, { recursive: true });
const filter = process.argv[2] ?? '';

const { server, base } = await startServer({ port: 0, quiet: true });
const browser = await chromium.launch();
const consoleErrors = [];
const results = [];

async function newPage({ w = 1440, h = 900, path = '/game.html', speed = 'ultra', ctx = null } = {}) {
  const context = ctx ?? await browser.newContext({ viewport: { width: w, height: h } });
  const page = await context.newPage();
  await page.addInitScript(s => { try { localStorage.setItem('peace-police-speed', JSON.stringify(s)); } catch { } }, speed);
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${path} ${w}×${h}: ${m.text()}`); });
  page.on('pageerror', e => consoleErrors.push(`${path}: ${e.message}`));
  await page.goto(base + path);
  if (path.startsWith('/game.html')) await ready(page);
  return page;
}
const ready = (page, timeout = 15000) => page.waitForFunction(() => window.pp?.estado === 'PRONTO' && !window.pp.busy, null, { timeout });
const state = page => page.evaluate(() => ({ estado: window.pp.estado, busy: window.pp.busy, balance: window.pp.session.balance, shown: window.pp.balanceShown }));
/** Joga até ao fim, carregando em CONTINUAR em cada aviso. Devolve os avisos vistos. */
async function finish(page, { timeout = 90000 } = {}) {
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await page.evaluate(() => ({ open: document.getElementById('overlay').open, kind: document.getElementById('overlay').dataset.kind, title: document.getElementById('overlay-title').textContent, estado: window.pp.estado, busy: window.pp.busy }));
    if (s.open) { seen.push(`${s.kind}:${s.title}`); await page.waitForTimeout(520); await page.click('#overlay-continue'); await page.waitForTimeout(60); continue; }
    if (s.estado === 'PRONTO' && !s.busy) return seen;
    await page.waitForTimeout(80);
  }
  throw Error('a jogada não terminou a tempo');
}
async function test(name, fn) {
  if (filter && !name.includes(filter)) return;
  const t0 = Date.now();
  try { await fn(); results.push({ ok: true, name, ms: Date.now() - t0 }); console.log(`ok      ${name} (${Date.now() - t0} ms)`); }
  catch (error) { results.push({ ok: false, name, error }); console.log(`FALHOU  ${name}\n        ${error.message.split('\n').join('\n        ')}`); }
}
const money = cents => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100).replace(/\s/g, ' ');
const text = async (page, sel) => (await page.textContent(sel)).replace(/\s+/g, ' ').trim();
const isoWins = page => page.evaluate(() => { window.__wins = 0; if (!window.__winsOn) { window.__winsOn = true; window.pp.on('evento', e => { if (e.type === 'win.cluster') window.__wins += e.pay; }); } });

// ---------------------------------------------------------------------------
await test('arranque sem erros, estado PRONTO, aposta na barra ao lado do ganho', async () => {
  const page = await newPage();
  const s = await state(page);
  assert.equal(s.estado, 'PRONTO');
  assert.equal(s.balance, 1_000_000);
  assert.equal(await text(page, '#bet-amount'), '1,00 DJC');
  const [win, betBox] = await Promise.all(['.result-panel', '.bet-panel'].map(sel => page.$eval(sel, el => el.getBoundingClientRect().left)));
  assert.ok(betBox > win, 'APOSTA à direita do GANHO');
  assert.equal(await text(page, '#balance'), '10 000,00 DJC');
  await page.screenshot({ path: `${shots}arranque-1440x900.png` });
  await page.context().close();
});

await test('botões e janelas abrem, funcionam e fecham', async () => {
  const page = await newPage();
  // Regras: separadores gerados a partir da configuração
  await page.click('#rules-button');
  assert.ok(await page.isVisible('#rules-dialog'));
  const nTabs = (await page.$$('#rules-tabs button')).length;
  assert.ok(nTabs >= 8);
  for (let i = 1; i <= nTabs; i++) { await page.click(`#rules-tabs button:nth-child(${i})`); assert.ok((await page.textContent('#rules-body')).length > 80); }
  await page.click('#rules-tabs button:nth-child(2)');
  const p5Top = await page.evaluate(async () => { const { config } = await import('/src/index.js'); return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 }).format(config.pay[10].at(-1) / 1000); });
  assert.ok((await page.textContent('#rules-body')).includes(p5Top), 'a tabela das regras vem da configuração (P5 15+)');
  assert.match(await page.textContent('#rules-body'), /pp-v\d|Pagamentos/);
  await page.click('#rules-dialog [data-close]');
  assert.ok(!(await page.isVisible('#rules-dialog')));
  // Histórico e definições
  await page.click('#history-button'); assert.ok(await page.isVisible('#history-dialog')); await page.click('#history-dialog [data-close]');
  await page.click('#settings-button'); assert.ok(await page.isVisible('#settings-dialog'));
  await page.check('#reduced-motion'); assert.equal(await page.getAttribute('body', 'data-reduced'), 'true');
  await page.uncheck('#reduced-motion'); await page.click('#settings-dialog [data-close]');
  // Aposta − / +
  await page.click('#bet-plus'); assert.equal(await page.evaluate(() => window.pp.bet), 200);
  await page.click('#bet-minus'); await page.click('#bet-minus'); assert.equal(await page.evaluate(() => window.pp.bet), 50);
  await page.click('#bet-plus');
  // Aposta extra: custo real visível e estado inequívoco
  await page.click('#hunt-button');
  assert.equal(await page.getAttribute('#hunt-button', 'aria-checked'), 'true');
  assert.equal(await text(page, '#spin-cost'), djc(custoCompra('hunt'))); // custo da aposta extra vem da tabela
  assert.equal(await page.getAttribute('.control-deck', 'data-extra'), 'on');
  await page.click('#hunt-button');
  assert.equal(await text(page, '#spin-cost'), '1,00 DJC');
  // Compras: preços pela aposta atual e a mudar dentro da janela; confirmação
  await page.click('#buy-button');
  const price = () => text(page, '.buy-card[data-mode=buy-police] .price');
  assert.equal(await price(), djc(custoCompra('buy-police')));
  await page.click('#buy-bet-plus'); assert.equal(await price(), djc(custoCompra('buy-police', 200)));
  await page.click('#buy-bet-minus');
  await page.click('[data-buy=buy-vip]'); assert.ok(await page.isVisible('#buy-confirm'));
  await page.click('#buy-cancel'); assert.ok(!(await page.isVisible('#buy-confirm')));
  await page.click('#buy-dialog [data-close]');
  // Velocidade
  const speedLabel = () => page.textContent('#speed-label');
  const before = await speedLabel();
  await page.click('#speed-button'); assert.notEqual(await speedLabel(), before);
  await page.click('#speed-button'); await page.click('#speed-button'); assert.equal(await speedLabel(), before);
  // Som (sem som nesta fase, mas os controlos funcionam e ficam guardados)
  await page.click('#mute-button'); assert.equal(await page.getAttribute('#mute-button', 'aria-pressed'), 'true'); await page.click('#mute-button');
  // Autoplay: janela abre e cancela
  await page.click('#auto-button'); assert.ok(await page.isVisible('#auto-dialog')); await page.click('#auto-dialog [data-auto-cancel]'); assert.ok(!(await page.isVisible('#auto-dialog')));
  // Ecrã inteiro: o botão existe onde a API existe
  assert.equal(await page.isVisible('#fullscreen-button'), await page.evaluate(() => Boolean(document.fullscreenEnabled)));
  await page.context().close();
});

await test('jogada base: saldo mostrado = sessão, ganho mostrado = soma dos eventos', async () => {
  const page = await newPage({ path: '/game.html?seed=base-1' });
  await isoWins(page);
  for (let i = 0; i < 6; i++) {
    const before = await state(page);
    await page.click('#spin');
    await finish(page);
    const after = await state(page);
    const wins = await page.evaluate(() => window.__wins);
    const winCents = Math.floor(100 * wins / 1000);
    assert.equal(after.shown, after.balance, 'saldo mostrado');
    assert.equal(after.balance, before.balance - 100 + winCents, 'saldo = antes − custo + prémio');
    assert.equal(await text(page, '#win'), `${money(winCents)} DJC`);
    await page.evaluate(() => { window.__wins = 0; });
  }
  await page.context().close();
});

await test('teclado: ESPAÇO roda, 100 ms entre comandos, repetição ignorada, CONTINUAR com 500 ms e tecla nova', async () => {
  const page = await newPage({ path: '/game.html?seed=kb', speed: 'normal' });
  const pedidos = () => page.evaluate(() => window.pp.pedidos);
  // dois toques em 40 ms: um só spin (o 2.º, se chegar, acelera: nunca cria fila)
  await page.keyboard.press('Space'); await page.waitForTimeout(40); await page.keyboard.press('Space');
  await finish(page);
  assert.equal(await pedidos(), 1);
  // tecla mantida (repetição automática): não cria spins novos enquanto a jogada decorre
  await page.keyboard.down('Space');
  for (let i = 0; i < 6; i++) await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true })));
  await page.keyboard.up('Space');
  await finish(page);
  assert.ok(await pedidos() <= 3, 'a repetição não criou uma fila de spins');
  // aviso: ESPAÇO antes de 500 ms não fecha; a tecla que estava premida não fecha; tecla nova fecha
  await page.click('#buy-button'); await page.click('[data-buy=buy-afterparty]'); await page.click('#buy-ok');
  await page.waitForFunction(() => document.getElementById('overlay').open);
  await page.keyboard.press('Space');
  assert.ok(await page.evaluate(() => document.getElementById('overlay').open), 'fechou antes de 500 ms');
  await page.waitForTimeout(550);
  const n0 = await pedidos();
  await page.keyboard.press('Space');                          // tecla nova depois de 500 ms: fecha
  assert.ok(!(await page.evaluate(() => document.getElementById('overlay').open)), 'ESPAÇO = CONTINUAR');
  // tecla premida ANTES de o aviso abrir (resumo do bónus): nem a repetição nem a mesma tecla o fecham
  await page.keyboard.down('Space');
  await page.waitForFunction(() => document.getElementById('overlay').open, null, { timeout: 90000 });
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true })));
  assert.ok(await page.evaluate(() => document.getElementById('overlay').open), 'a tecla que já estava premida não passa para o ecrã seguinte');
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  assert.ok(!(await page.evaluate(() => document.getElementById('overlay').open)), 'toque novo fecha');
  assert.equal(await pedidos(), n0, 'o ESPAÇO dos avisos nunca lançou um spin');
  await page.evaluate(() => window.pp.setBet(100));
  await finish(page);
  await page.context().close();
});

await test('toques durante o spin: 1.º acelera 3×, 2.º 8×, 3.º salta só esse spin', async () => {
  const page = await newPage({ path: '/game.html?seed=taps5', speed: 'normal' }); // 1.º free spin longo (pp-v5: a POLICE PARTY começa sem cantos)
  await page.click('#buy-button'); await page.click('[data-buy=buy-police]'); await page.click('#buy-ok');
  await page.waitForFunction(() => document.getElementById('overlay').open); await page.waitForTimeout(520); await page.click('#overlay-continue');
  await page.waitForFunction(() => window.pp.estado === 'FREE_SPINS');
  await page.waitForTimeout(200);
  // os toques contam por spin: medir logo a seguir a cada um (a rampa é de 120 ms)
  await page.click('#spin'); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => window.pp.rate) >= 2.9, 'rate ≥ 3 depois do 1.º toque');
  await page.waitForTimeout(110); await page.click('#spin'); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => window.pp.rate) >= 7.9, 'rate ≥ 8 depois do 2.º toque');
  const fsBefore = await page.evaluate(() => window.pp.model.freeSpins?.played);
  await page.waitForTimeout(150); await page.click('#spin');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.pp.estado), 'FREE_SPINS', 'o 3.º toque não salta o bónus inteiro');
  assert.ok((await page.evaluate(() => window.pp.model.freeSpins?.played)) <= fsBefore + 2);
  await finish(page);
  await page.context().close();
});

await test('compra de cada bónus até ao resumo; saldo certo', async () => {
  const page = await newPage({ path: '/game.html?seed=compras' });
  for (const [mode, nome, cost] of [['buy-afterparty', 'AFTERPARTY'], ['buy-vip', 'VIP AFTERPARTY'], ['buy-police', 'POLICE PARTY']].map(([m, n]) => [m, n, custoCompra(m)])) {
    const before = await state(page);
    await isoWins(page);
    await page.click('#buy-button'); await page.click(`[data-buy=${mode}]`); await page.click('#buy-ok');
    const seen = await finish(page);
    assert.ok(seen.some(s => s === `bonus:${nome}`), `entrada ${nome}: ${seen}`);
    assert.ok(seen.some(s => s.startsWith('summary:')), `resumo ${nome}`);
    const after = await state(page);
    const winCents = Math.floor(100 * (await page.evaluate(() => window.__wins)) / 1000);
    assert.equal(after.balance, before.balance - cost + winCents);
    assert.equal(after.shown, after.balance);
    await page.screenshot({ path: `${shots}compra-${mode}.png` });
  }
  await page.click('#history-button');
  assert.ok((await page.$$('#history-body tr[data-id]')).length >= 3);
  await page.click('#history-body tr[data-id]');
  assert.match(await page.textContent('#history-body'), /step\.start/);
  await page.context().close();
});

await test('retrigger: +5 free spins e contador atualizado', async () => {
  const page = await newPage({ path: '/game.html?seed=rt9' }); // a 1.ª compra AFTERPARTY desta seed tem um retrigger (motor real, pp-v5)
  const totals = [];
  await page.evaluate(() => { window.__fs = []; window.pp.on('evento', e => { if (e.type === 'bonus.retrigger') window.__fs.push(e.total); }); });
  await page.click('#buy-button'); await page.click('[data-buy=buy-afterparty]'); await page.click('#buy-ok');
  const seen = await finish(page);
  totals.push(...await page.evaluate(() => window.__fs));
  assert.ok(seen.some(s => s.startsWith('info:+')), `aviso de retrigger: ${seen}`);
  assert.ok(totals[0] > 10);
  await page.context().close();
});

await test('limite atingido: aviso GANHO MÁXIMO (fixture sintética: o motor não chega lá nas amostras)', async () => {
  const page = await newPage({ path: '/game.html?debug=1' });
  await page.evaluate(() => {
    const grid = Array.from({ length: 25 }, (_, i) => [0, 4, 20, 24].includes(i) ? 'CW' : 'P5');
    const cells = grid.map((_, i) => i);
    const ev = [
      { type: 'step.start', kind: 'base', bonusId: null, freeSpins: null },
      { type: 'grid.drop', grid, mult: { 0: 10, 4: 10, 20: 10, 24: 10 } },
      { type: 'win.cluster', symbol: 'P5', cells, size: 25, basePay: 85000, multiplier: 40, pay: 10000000, growthFrom: 0, attrib: [[0, 10000000]] },
      { type: 'cap.hit', limit: 10000000, cut: 2400000 },
      { type: 'step.end', win: 10000000, roundWinSoFar: 10000000 },
    ];
    window.pp.runResult({ roundId: 'fixture-limite', mode: 'base', bet: 100, steps: [{ index: 0, kind: 'base', bonusId: null, events: ev, win: 10000000, roundWinSoFar: 10000000, freeSpins: null }], totalWin: 1000000, totalWinMils: 10000000, capped: true });
  });
  const seen = await finish(page);
  assert.ok(seen.some(s => s === 'max:GANHO MÁXIMO'), seen.join(' | '));
  assert.equal(await page.evaluate(() => window.pp.session.balance), 1_000_000, 'a fixture não mexe no saldo');
  await page.context().close();
});

await test('cenários forçados: todos correm até ao fim sem mexer no saldo', async () => {
  const page = await newPage({ path: '/game.html?debug=1' });
  const names = await page.evaluate(async () => (await import('/src/index.js')).scenarioNames());
  for (const name of names) {
    assert.ok(await page.evaluate(n => window.pp.runScenario(n), name), name);
    await finish(page);
  }
  assert.equal(await page.evaluate(() => window.pp.session.balance), 1_000_000);
  await page.screenshot({ path: `${shots}diagnostico.png` });
  await page.context().close();
});

await test('reload a meio de um bónus: retoma no passo certo, sem débito duplicado', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = await newPage({ ctx, path: '/game.html?seed=reload', speed: 'normal' });
  await page.click('#buy-button'); await page.click('[data-buy=buy-vip]'); await page.click('#buy-ok');
  await page.waitForFunction(() => document.getElementById('overlay').open); await page.waitForTimeout(520); await page.click('#overlay-continue');
  await page.waitForFunction(() => window.pp.session.round?.cursor >= 3, null, { timeout: 60000 });
  const mid = await page.evaluate(() => ({ balance: window.pp.session.balance, cursor: window.pp.session.round.cursor, id: window.pp.session.round.id }));
  assert.equal(mid.balance, 1_000_000 - custoCompra('buy-vip'));
  await page.reload();
  await page.waitForFunction(() => window.pp && window.pp.busy);
  const resumed = await page.evaluate(() => ({ balance: window.pp.session.balance, round: window.pp.session.round }));
  assert.equal(resumed.balance, mid.balance, 'sem novo débito');
  assert.equal(resumed.round.id, mid.id);
  assert.ok(resumed.round.cursor >= mid.cursor, 'retoma no passo confirmado');
  await page.evaluate(() => { window.__wins = 0; window.pp.on('jogada', i => { window.__info = i; }); });
  await page.evaluate(() => window.pp.layout.fit());
  const seen = await finish(page);
  assert.ok(seen.some(s => s.startsWith('bonus:')), 'aviso de retoma do bónus');
  const info = await page.evaluate(() => window.__info);
  const end = await state(page);
  assert.equal(end.balance, 1_000_000 - custoCompra('buy-vip') + info.win);
  await ctx.close();
});

await test('autoplay: só spins pagos contam, pausa nos avisos e para depois da jogada atual', async () => {
  const page = await newPage({ path: '/game.html?seed=bt7' }); // a 1.ª jogada base desta seed entra no bónus (pp-v6)
  const pedidos = () => page.evaluate(() => window.pp.pedidos);
  await page.click('#auto-button');
  await page.evaluate(() => { const r = document.getElementById('auto-range'); r.value = '0'; r.dispatchEvent(new Event('input')); });
  await page.click('#auto-start');
  await page.waitForFunction(() => document.getElementById('overlay').open, null, { timeout: 20000 });
  const remaining = await page.evaluate(() => window.pp.auto.remaining);
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => document.getElementById('overlay').open), 'o autoplay espera pela confirmação');
  assert.equal(await page.evaluate(() => window.pp.auto.remaining), remaining);
  assert.equal(await page.textContent('#auto-button'), 'Parar auto');
  // termina o bónus e deixa correr; depois para a meio
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (await page.evaluate(() => document.getElementById('overlay').open)) { await page.waitForTimeout(520); await page.click('#overlay-continue'); continue; }
    if ((await pedidos()) >= 4) break;
    await page.waitForTimeout(80);
  }
  await page.click('#spin'); // com o autoplay ligado, o spin = parar
  await page.waitForFunction(() => !window.pp.auto.running, null, { timeout: 30000 });
  await finish(page);
  const n = await pedidos();
  assert.ok(n >= 4 && n <= 6, `parou depois da jogada atual (${n} jogadas pagas)`);
  // o lote conta só spins pagos: 10 pedidos para 10 spins mesmo com free spins pelo meio
  await page.click('#auto-button');
  await page.evaluate(() => { const r = document.getElementById('auto-range'); r.value = '0'; r.dispatchEvent(new Event('input')); });
  await page.click('#auto-start');
  const t1 = Date.now();
  while (Date.now() - t1 < 120000) {
    if (await page.evaluate(() => document.getElementById('overlay').open)) { await page.waitForTimeout(520); await page.click('#overlay-continue'); continue; }
    if (await page.evaluate(() => !window.pp.auto.running && !window.pp.busy)) break;
    await page.waitForTimeout(80);
  }
  assert.equal((await pedidos()) - n, 10);
  await page.context().close();
});

await test('HostSession (carteira simulada): latência, resposta perdida repete com o mesmo id, rejeição recupera', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => consoleErrors.push(`carteira: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`carteira: ${m.text()}`); });
  await page.addInitScript(() => { try { localStorage.removeItem('pp-carteira-simulada'); localStorage.setItem('peace-police-speed', JSON.stringify('ultra')); } catch { } });
  await page.goto(`${base}/carteira.html?latency=150&timeout=1200`);
  const game = () => page.frames().find(f => f.url().includes('game.html'));
  await page.waitForFunction(() => document.getElementById('game').contentWindow?.pp?.estado === 'PRONTO', null, { timeout: 15000 });
  const g = game();
  // resposta perdida ao start: o jogo repete com o MESMO id e a carteira devolve o recibo (débito único)
  await page.evaluate(() => window.carteira.dropNext());
  await g.click('#spin');
  await g.waitForFunction(() => window.pp.estado === 'PRONTO' && !window.pp.busy, null, { timeout: 30000 });
  const log = await page.textContent('#cw-log');
  assert.match(log, /perdida/); assert.match(log, /repetido: devolvo o recibo/);
  const st = await page.evaluate(() => window.carteira.state);
  const last = await g.evaluate(() => JSON.parse(localStorage.getItem('pp-historico'))[0]);
  assert.equal(st.balance, 1_000_000 - last.cost + last.win, 'um só débito e o crédito certo');
  assert.equal(await g.evaluate(() => window.pp.balanceShown), st.balance);
  // rejeição definitiva: aviso de erro, recuperação e volta a PRONTO
  await page.evaluate(() => window.carteira.rejectNext());
  await g.click('#spin');
  await g.waitForFunction(() => document.getElementById('overlay').open && document.getElementById('overlay').dataset.kind === 'error', null, { timeout: 10000 });
  await page.waitForTimeout(520); await g.click('#overlay-continue');
  await g.waitForFunction(() => window.pp.estado === 'PRONTO', null, { timeout: 10000 });
  assert.equal((await page.evaluate(() => window.carteira.state)).balance, st.balance, 'a rejeição não mexeu no saldo');
  // recarregar o jogo a meio de uma compra: retoma sem novo débito
  await g.evaluate(() => localStorage.setItem('peace-police-speed', JSON.stringify('normal')));
  await g.click('#buy-button'); await g.click('[data-buy=buy-afterparty]'); await g.click('#buy-ok');
  await page.waitForFunction(() => (window.carteira.state.wallet?.round?.cursor ?? 0) >= 2, null, { timeout: 30000 });
  const mid = await page.evaluate(() => window.carteira.state);
  await page.evaluate(() => window.carteira.reload());
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.getElementById('game').contentWindow?.pp?.busy, null, { timeout: 15000 });
  const g2 = game();
  await g2.evaluate(() => localStorage.setItem('peace-police-speed', JSON.stringify('ultra')));
  await finish(g2);
  const end = await page.evaluate(() => window.carteira.state);
  const info = await g2.evaluate(() => JSON.parse(localStorage.getItem('pp-historico'))[0]);
  assert.equal(end.balance, mid.balance + info.win, 'retomada sem segundo débito');
  await page.screenshot({ path: `${shots}carteira-simulada.png` });
  await ctx.close();
});

await test('tamanhos: sem scroll, barra inteira à vista (jogo inteiro e dentro do site)', async () => {
  const sizes = [[1920, 1080], [1440, 900], [1366, 768, 86], [1280, 720], [390, 844], [844, 390], [360, 640], [820, 1180], [1180, 820], [320, 640]];
  for (const [w, h, menu = 0] of sizes) {
    for (const where of ['jogo', 'site']) {
      if (where === 'jogo' && menu) continue;
      const vh = where === 'jogo' ? h : h;
      const page = await newPage({ w, h: vh, path: where === 'jogo' ? '/game.html' : '/site.html' });
      const frame = where === 'jogo' ? page.mainFrame() : await (await page.waitForSelector('iframe')).contentFrame();
      if (where === 'site') await frame.waitForFunction(() => window.pp?.estado === 'PRONTO');
      await frame.evaluate(() => window.pp.runScenario('bonus:police'));
      await frame.waitForFunction(() => document.getElementById('overlay').open, null, { timeout: 10000 });
      await page.waitForTimeout(520); await frame.click('#overlay-continue');
      await page.waitForTimeout(900);
      const m = await frame.evaluate(() => {
        const d = document.documentElement, deck = document.querySelector('.control-deck').getBoundingClientRect(), board = document.getElementById('board').getBoundingClientRect();
        return { sh: d.scrollHeight, ch: d.clientHeight, sw: d.scrollWidth, cw: d.clientWidth, deckBottom: deck.bottom, deckRight: deck.right, boardBottom: board.bottom, layout: d.dataset.layout, scale: Number(getComputedStyle(d).getPropertyValue('--game-scale')) };
      });
      const outer = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      const label = `${where} ${w}×${h} (${m.layout} ${m.scale.toFixed(2)})`;
      assert.ok(m.sh <= m.ch && m.sw <= m.cw, `${label}: scroll no jogo ${m.sw}×${m.sh} > ${m.cw}×${m.ch}`);
      assert.ok(outer.sh <= outer.ch && outer.sw <= outer.cw, `${label}: scroll na página`);
      assert.ok(m.deckBottom <= m.ch + 1 && m.deckRight <= m.cw + 1, `${label}: barra fora do ecrã`);
      await page.screenshot({ path: `${shots}tamanho-${where}-${w}x${h}.png` });
      console.log(`        ${label}`);
      await page.context().close();
    }
  }
});

await test('nenhum erro na consola', async () => { assert.deepEqual(consoleErrors, []); });

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length} ok, ${failed.length} falharam · capturas em test-results/`);
process.exit(failed.length ? 1 : 0);
