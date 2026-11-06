// Final Phase 3 catalogue and integration checks. No cloud or wallet reads.
// npm.cmd run test:art              bundled Playwright Chromium
// npm.cmd run test:art -- --edge    installed Microsoft Edge (no browser download)
import assert from 'node:assert/strict';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { startServer } from '../scripts/serve.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('ui/art/manifest.json', root), 'utf8'));
const required = [
  ...Array.from({ length: 5 }, (_, i) => 'SYM-N' + (i + 1)),
  ...Array.from({ length: 5 }, (_, i) => 'SYM-P' + (i + 1)),
  ...['W', 'CW', 'DW', 'S', 'LOCK', 'N3-REVEALED'].map(id => 'SYM-' + id),
  ...Array.from({ length: 5 }, (_, i) => ['CHR-P' + (i + 1) + '-PORT', 'CHR-P' + (i + 1) + '-ALTER']).flat(),
  ...['IDLE', 'CALMER', 'JOINER', 'DANCE'].map(id => 'CHR-POL-' + id),
  ...['BASE', 'AFTER', 'VIP', 'POLICE'].flatMap(id => ['BG-' + id, 'BG-' + id + '-PORTRAIT', 'STG-FRAME-' + id]),
  ...['AFTER', 'VIP', 'POLICE', 'HUNT'].map(id => 'EMB-' + id),
  ...['NEVER_ENDING_DREAM', 'ONE_MORE_ROUND', 'SLOW_DISASTER', 'RAVE_DIMENSION', 'TOTAL_MAYHEM', 'FROZEN_REALITY', 'FREEZE_AND_FREAK', 'DREAM_GLITCH', 'ONE_MORE_RAVE', 'DOUBLE_VISION'].map(id => 'FUS-' + id),
  'LOGO', 'CHR-GROUP', 'ICON-APP', 'ICON-APP-192', 'ICON-APP-32', 'OVL-SUMMARY', 'WIN-MAX',
];
assert.equal(manifest.version, 1);
for (const id of required) assert.ok(manifest.assets.some(a => a.id === id && a.file), `Falta ${id}`);
assert.equal(new Set(manifest.assets.map(a => a.id)).size, manifest.assets.length, 'IDs repetidos');
await mkdir(new URL('test-results/', root), { recursive: true });
const { server, base } = await startServer({ port: 0, quiet: true });
let browser;
try {
  const edge = process.argv.includes('--edge');
  const executablePath = edge && process.platform === 'win32'
    ? join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe')
    : undefined;
  browser = await chromium.launch(edge ? { channel: 'msedge', executablePath } : {});
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => localStorage.setItem('peace-police-speed', JSON.stringify('ultra')));
  await page.goto(base + '/game.html?seed=art-sample');
  await page.waitForFunction(() => window.pp?.estado === 'PRONTO');
  assert.deepEqual(await page.evaluate(() => window.pp.art), {
    total: manifest.assets.length, loaded: manifest.assets.length, failures: [],
  });
  assert.equal(await page.locator('#art-loading').isVisible(), false);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('700 16px "PP Oxanium"')), 'Fonte Oxanium local carregada');
  assert.equal(await page.locator('#board .cell .name').evaluateAll(names => names.filter(name => getComputedStyle(name).display !== 'none').length), 0, 'O tabuleiro apresenta arte sem nomes sobrepostos');

  let bytes = 0;
  const runtimeFiles = new Set();
  for (const asset of manifest.assets) {
    const src = new URL(asset.file, base + '/ui/art/manifest.json');
    assert.equal(src.origin, base);
    assert.ok(src.pathname.startsWith('/ui/art/') && src.pathname.endsWith('.webp'));
    const pixels = await page.evaluate(async src => {
      const image = new Image(); image.src = src; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, visible = 0, edge = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (!alpha) transparent++;
        if (alpha > 200) visible++;
        if (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) edge = Math.max(edge, alpha);
      }
      return { width: canvas.width, height: canvas.height, transparent, visible, edge };
    }, src.href);
    assert.equal(pixels.width, asset.width, asset.id);
    assert.equal(pixels.height, asset.height, asset.id);
    if (asset.alpha) {
      assert.ok(pixels.transparent > asset.width * asset.height * .05, `${asset.id}: alpha ausente`);
      assert.ok(pixels.visible > asset.width * asset.height * .05, `${asset.id}: imagem vazia`);
      assert.equal(pixels.edge, 0, `${asset.id}: arte toca na margem`);
    }
    if (!runtimeFiles.has(asset.file)) {
      bytes += (await stat(new URL('ui/art/' + asset.file, root))).size;
      runtimeFiles.add(asset.file);
    }
    console.log(`ok arte ${asset.id}: ${pixels.width}×${pixels.height}, alpha e margem`);
  }

  // Replay real diagnostic scenarios and stop only between fully presented events.
  async function showState(name, wanted) {
    await page.reload();
    await page.waitForFunction(() => window.pp?.estado === 'PRONTO');
    await page.evaluate(name => {
      window.__artGate = 0;
      window.pp.on('gate', () => window.__artGate++);
      window.pp.setStepMode(true);
      if (!window.pp.runScenario(name)) throw Error('Cenário não arrancou');
    }, name);
    await page.waitForFunction(() => window.__artGate > 0);
    for (let count = 0; count < 100; count++) {
      const found = await page.evaluate(wanted => {
        const card = document.querySelector('.persona[data-persona="LCD"]');
        if (wanted === 'wild') return Boolean(document.querySelector('.cell.has-art[data-sym="W"] img'));
        if (wanted === 'weed') return Boolean(document.querySelector('.cell.has-art[data-sym="P1"][data-awake="true"] img'));
        const ready = wanted === 'sleep' ? document.querySelector('.cell.has-art[data-sym="P5"]')
          : card.dataset.state === 'awake' && (wanted !== 'party' || card.dataset.party === 'true');
        return Boolean(ready);
      }, wanted);
      if (found) return;
      const previous = await page.evaluate(() => window.__artGate);
      await page.evaluate(() => window.pp.advance());
      await page.waitForFunction(previous => window.__artGate > previous || !window.pp.busy || document.querySelector('#overlay').open, previous);
      if(await page.locator('#overlay').evaluate(d=>d.open)){await page.waitForTimeout(520);await page.locator('#overlay-continue').click();await page.waitForFunction(previous=>window.__artGate>previous||!window.pp.busy,previous);}
      assert.ok(await page.evaluate(() => window.pp.busy), `Não atingiu estado ${wanted}`);
    }
    throw Error(`Demasiados eventos para ${wanted}`);
  }

  for (const [layout, width, height] of [['landscape', 1280, 800], ['portrait', 390, 844], ['compact', 844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const [state, scenario] of [['sleep', 'lcd'], ['awake', 'lcd'], ['party', 'joiner']]) {
      await showState(scenario, state);
      // HUD height changes schedule ResizeObserver -> layout RAF. Measure the settled layout.
      await page.evaluate(async () => {
        let previous = '', stable = 0;
        for (let frame = 0; frame < 60; frame++) {
          await new Promise(requestAnimationFrame);
          const r = document.querySelector('.shell').getBoundingClientRect();
          const key = [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100)).join('|');
          stable = key === previous ? stable + 1 : 0; previous = key;
          if (stable >= 2) return;
        }
        throw Error('Layout não estabilizou');
      });
      const geometry = await page.evaluate(() => ({
        layout: document.body.dataset.layout,
        overflowX: document.documentElement.scrollWidth - innerWidth,
        overflowY: document.documentElement.scrollHeight - innerHeight,
        utilitiesBelowSide: document.querySelector('.top-actions').getBoundingClientRect().top >= document.querySelector('.side').getBoundingClientRect().bottom - 1,
        premiumsFillCell: [...document.querySelectorAll('.cell.has-art[data-cat=premium]')].every(cell => cell.querySelector('.sym img').getBoundingClientRect().width >= cell.getBoundingClientRect().width),
        portraitLoaded: document.querySelector('.persona[data-persona="LCD"] .persona-portrait img')?.naturalWidth > 0,
        forbiddenAnimationProperties: [...new Set(document.getAnimations().flatMap(animation =>
          animation.effect?.getKeyframes().flatMap(frame => Object.keys(frame)) ?? []))]
          .filter(key => !['opacity', 'transform', 'offset', 'computedOffset', 'easing', 'composite'].includes(key)),
        emptyBadgesVisible: [...document.querySelectorAll('.cell.has-art .mult:empty,.cell.has-art .flag:empty')]
          .some(el => getComputedStyle(el).display !== 'none'),
        activeLcdImages: [...document.querySelectorAll('.cell[data-sym="P5"][data-awake="true"] .sym img')]
          .map(img => img.src.split('/').pop()),
      }));
      await page.screenshot({ path: fileURLToPath(new URL(`test-results/art-${layout}-${state}.png`, root)) });
      assert.equal(geometry.layout, layout);
      if (layout === 'compact') assert.ok(geometry.utilitiesBelowSide, 'Utilitários no fundo da coluna esquerda');
      assert.ok(geometry.premiumsFillCell, 'Arte premium preenche a célula');
      assert.ok(geometry.overflowX <= 1 && geometry.overflowY <= 1, `${layout} ${state}: scroll ${JSON.stringify(geometry)}`);
      assert.ok(geometry.portraitLoaded, `${layout}: retrato em falta`);
      assert.deepEqual(geometry.forbiddenAnimationProperties, [], 'Só transform e opacity são animados');
      assert.equal(geometry.emptyBadgesVisible, false, 'Etiquetas vazias não criam traços sobre a arte');
      if (state === 'awake') {
        assert.ok(geometry.activeLcdImages.length, 'Cenário LCD ativo tem símbolos visíveis');
        assert.ok(geometry.activeLcdImages.every(src => src === 'chr-p5-port.webp'), 'LCD ativo usa arte psicadélica');
      }
      console.log(`ok ${layout} ${state}: retrato, sem scroll`);
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [state, scenario] of [['sleep', 'triple-chemistry'], ['weed', 'weed'], ['wild', 'alcool']]) {
    await showState(scenario, state);
    await page.screenshot({ path: fileURLToPath(new URL(`test-results/art-sample-${state}.png`, root)) });
    console.log(`ok integração no tabuleiro: ${state}`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await showState('joiner', 'party');
  assert.equal(await page.evaluate(() => document.body.dataset.reduced), 'true');

  if (process.argv.includes('--full') || process.argv.includes('--overlays')) {
    const overlaysOnly = process.argv.includes('--overlays');
    const moments = overlaysOnly ? [] : [
      ['lcd', 'persona.awaken'], ['weed', 'persona.awaken'], ['mdma', 'persona.awaken'],
      ['alcool', 'persona.awaken'], ['copium', 'persona.awaken'],
      ...['NEVER_ENDING_DREAM', 'ONE_MORE_ROUND', 'SLOW_DISASTER', 'RAVE_DIMENSION', 'TOTAL_MAYHEM',
        'FROZEN_REALITY', 'FREEZE_AND_FREAK', 'DREAM_GLITCH', 'ONE_MORE_RAVE', 'DOUBLE_VISION']
        .map(id => ['fusao:' + id, 'fusion.trigger']),
      ['surpresa', 'fusion.trigger'], ['triple-chemistry', 'corner.open'], ['total-chemistry', 'chemistry.total'],
      ['calmer', 'police.calmer.arrest'], ['joiner', 'police.joiner.party_mode'],
    ];
    const captured = [];
    for (const [layout, width, height] of [['landscape', 1280, 800], ['portrait', 390, 844], ['compact', 844, 390]]) {
      const momentPage = await browser.newPage({ viewport: { width, height } });
  await momentPage.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
      momentPage.on('pageerror', e => errors.push(e.message));
      await momentPage.addInitScript(() => localStorage.setItem('peace-police-speed', JSON.stringify('normal')));
      for (const [name, type] of moments) {
        await momentPage.goto(base + '/game.html?seed=art-moments');
        await momentPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
        await momentPage.evaluate(name => {
          window.__momentGate = 0; window.__momentNext = null;
          window.pp.on('gate', e => { window.__momentNext = e.type; window.__momentGate++; });
          window.pp.setStepMode(true); window.pp.runScenario(name);
        }, name);
        await momentPage.waitForFunction(() => window.__momentGate > 0);
        let reached = false;
        for (let event = 0; event < 180; event++) {
          if (await momentPage.evaluate(type => window.__momentNext === type, type)) { reached = true; break; }
          const previous = await momentPage.evaluate(() => window.__momentGate);
          await momentPage.evaluate(() => window.pp.advance());
          await momentPage.waitForFunction(previous => window.__momentGate > previous || !window.pp.busy || document.querySelector('#overlay').open, previous);
          if(await momentPage.locator('#overlay').evaluate(d=>d.open)){await momentPage.waitForTimeout(520);await momentPage.locator('#overlay-continue').click();await momentPage.waitForFunction(previous=>window.__momentGate>previous||!window.pp.busy,previous);}
          assert.ok(await momentPage.evaluate(() => window.pp.busy), `${name}: falta ${type}`);
        }
        assert.ok(reached, `${name}: falta ${type}`);
        await momentPage.evaluate(() => window.pp.advance());
        await momentPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await momentPage.waitForTimeout(type === 'fusion.trigger' ? 450 : 260);
        const filename = `art-moment-${layout}-${name.replaceAll(':', '-')}.png`;
        await momentPage.screenshot({ path: fileURLToPath(new URL('test-results/' + filename, root)) });
        captured.push({ layout, name, event: type, filename });
        console.log(`captura ${layout}: ${name} / ${type}`);
      }
      for (const bonus of ['afterparty', 'vip', 'police']) {
        await momentPage.goto(base + '/game.html?seed=art-bonus');
        await momentPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
        await momentPage.evaluate(name => window.pp.runScenario(name), 'bonus:' + bonus);
        await momentPage.waitForFunction(() => document.querySelector('#overlay').open);
        await momentPage.waitForTimeout(300); // Capture the fully visible panel after its entrance fade.
        const button = await momentPage.locator('#overlay-continue').boundingBox();
        assert.ok(button && button.y >= 0 && button.y + button.height <= height + 1, `${layout} ${bonus}: CONTINUAR fora do ecrã`);
        const filename = `art-moment-${layout}-intro-${bonus}.png`;
        await momentPage.screenshot({ path: fileURLToPath(new URL('test-results/' + filename, root)) });
        captured.push({ layout, name: bonus, event: 'bonus.intro', filename });
      }
      await momentPage.close();

      const overlayPage = await browser.newPage({ viewport: { width, height } });
  await overlayPage.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
      overlayPage.on('pageerror', e => errors.push(e.message));
      await overlayPage.addInitScript(() => localStorage.setItem('peace-police-speed', JSON.stringify('ultra')));
      await overlayPage.goto(base + '/game.html?seed=rt9');
      await overlayPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
      await overlayPage.evaluate(async () => {
        const { setRate } = await import('/ui/tempo.js');
        window.pp.on('overlay', e => {
          if (e.kind === 'retrigger') { window.__retriggerOpenedAt = performance.now(); setRate(40, 0); }
        });
        window.pp.runSeed('buy-afterparty', 'rt9');
      });
      const overlayDeadline = Date.now() + 120000;
      let retriggerCaptured = false, summaryCaptured = false;
      while (Date.now() < overlayDeadline) {
        const kind = await overlayPage.evaluate(() => {
          const d = document.querySelector('#overlay'); return d.open ? d.dataset.kind : null;
        });
        if (kind === 'retrigger') {
          if (!retriggerCaptured) {
            const filename = `art-moment-${layout}-retrigger.png`;
            await overlayPage.screenshot({ path: fileURLToPath(new URL('test-results/' + filename, root)) });
            captured.push({ layout, name: 'rt9', event: 'bonus.retrigger', filename }); retriggerCaptured = true;
          }
          await overlayPage.waitForFunction(() => !document.querySelector('#overlay').open, null, { timeout: 15000 });
          const elapsed = await overlayPage.evaluate(() => performance.now() - window.__retriggerOpenedAt);
          assert.ok(elapsed >= 495, 'Autoretrigger respeita o mínimo de confirmação com turbo');
        } else if (kind === 'summary') {
          await overlayPage.locator('#overlay-continue:not([hidden])').waitFor();
          assert.ok(await overlayPage.locator('.mini-cell img').count() > 0, `${layout}: resumo apresenta miniaturas de prémios`);
          const summaryButton = await overlayPage.locator('#overlay-continue').boundingBox();
          assert.ok(summaryButton && summaryButton.y >= 0 && summaryButton.y + summaryButton.height <= height + 1, `${layout}: resumo CONTINUAR fora do ecrã`);
          const filename = `art-moment-${layout}-summary.png`;
          await overlayPage.screenshot({ path: fileURLToPath(new URL('test-results/' + filename, root)) });
          captured.push({ layout, name: 'rt9', event: 'bonus.summary', filename }); summaryCaptured = true;
          assert.equal(await overlayPage.evaluate(() => document.body.dataset.scene), 'afterparty', 'Cenário do bónus mantém-se no resumo');
          break;
        } else if (kind) {
          await overlayPage.waitForTimeout(550);
          await overlayPage.locator('#overlay-continue').click();
        } else await overlayPage.waitForTimeout(50);
      }
      assert.ok(retriggerCaptured && summaryCaptured, `${layout}: retrigger e resumo reais`);

      // Synthetic presentation fixtures, explicitly diagnostic: no wallet settlement or RTP claim.
      for (const [tier, amount] of [['grande', 25000], ['enorme', 75000], ['epico', 150000], ['max', null]]) {
        await overlayPage.goto(base + '/game.html?debug=1&seed=art-tier');
        await overlayPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
        await overlayPage.evaluate(({ tier, amount }) => {
          const cap = tier === 'max', pay = amount ?? window.pp.config.maxWinMils;
          const grid = Array.from({ length: 25 }, (_, i) => window.pp.config.corners.includes(i) ? 'CW' : 'P5');
          const cells = grid.map((_, i) => i);
          const events = [
            { type: 'step.start', kind: 'base', bonusId: null, freeSpins: null },
            { type: 'grid.drop', grid, mult: {} },
            { type: 'win.cluster', symbol: 'P5', cells, size: 25, basePay: cap ? pay * 2 : pay, multiplier: 1, pay, growthFrom: 0, attrib: [[0, pay]] },
            ...(cap ? [{ type: 'cap.hit', limit: pay, cut: pay }] : []),
            { type: 'step.end', win: pay, roundWinSoFar: pay },
          ];
          window.pp.runResult({ roundId: 'fixture-visual-' + tier, mode: 'base', bet: 100,
            steps: [{ index: 0, kind: 'base', bonusId: null, events, win: pay, roundWinSoFar: pay, freeSpins: null }],
            totalWin: Math.floor(100 * pay / 1000), totalWinMils: pay, capped: cap });
        }, { tier, amount });
        await overlayPage.waitForFunction(() => document.querySelector('#overlay').open);
        await overlayPage.locator('#overlay-continue:not([hidden])').waitFor();
        const gainButton = await overlayPage.locator('#overlay-continue').boundingBox();
        assert.ok(gainButton && gainButton.y >= 0 && gainButton.y + gainButton.height <= height + 1, `${layout}: ganho CONTINUAR fora do ecrã`);
        const filename = `art-moment-${layout}-win-${tier}.png`;
        await overlayPage.screenshot({ path: fileURLToPath(new URL('test-results/' + filename, root)) });
        captured.push({ layout, name: tier, event: tier === 'max' ? 'cap.hit' : 'win.tier', synthetic: true, filename });
      }
      await overlayPage.close();
    }
    const indexPath = new URL('test-results/art-moments.json', root);
    const previous = overlaysOnly ? JSON.parse(await readFile(indexPath, 'utf8')) : [];
    const combined = [...new Map([...previous, ...captured].map(item => [item.filename, item])).values()];
    await writeFile(indexPath, JSON.stringify(combined, null, 2));
  }
  if (process.argv.includes('--perf')) {
    const perfPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await perfPage.addInitScript(() => localStorage.setItem('pp-intro-v1-hidden', '1')); /* This suite starts after the introduction. */
    const cdp = await perfPage.context().newCDPSession(perfPage);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const measurements = [];
    const cases = [
      { name: 'spin', seed: 'fase3-perf-spin', speed: 'normal' },
      { name: 'scatters-5-suspense', scenario: 'scatters-5', speed: 'normal', stopAtIntro: true },
      { name: 'cascatas-19-refills', seed: 'fase3-perf-162', speed: 'normal' },
      { name: 'ganho-grande', seed: 'fase3-perf-678', speed: 'normal' },
      { name: 'bonus-police-normal', scenario: 'bonus:police', speed: 'normal' },
    ];
    for (const item of cases) {
      await perfPage.goto(base + '/game.html?perf=1&seed=art-performance');
      await perfPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
      await perfPage.evaluate(speed => localStorage.setItem('peace-police-speed', JSON.stringify(speed)), item.speed);
      await perfPage.reload();
      await perfPage.waitForFunction(() => window.pp?.estado === 'PRONTO');
      await perfPage.evaluate(item => {
        const sample = window.__frameSample = { started: performance.now(), times: [], longTasks: [], running: true, previous: null, events: 0, layoutFits: 0 };
        window.pp.on('evento', () => sample.events++);
        document.addEventListener('game-layout', () => sample.layoutFits++);
        const observer = new PerformanceObserver(list => sample.longTasks.push(...list.getEntries().map(e => e.duration)));
        observer.observe({ type: 'longtask' }); sample.observer = observer;
        function frame(time) {
          if (!sample.running) return;
          if (sample.previous !== null) sample.times.push(time - sample.previous);
          sample.previous = time; requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        const started = item.scenario ? window.pp.runScenario(item.scenario) : window.pp.runSeed('base', item.seed);
        if (!started) throw Error('Cenário de desempenho não arrancou');
      }, item);
      const deadline = Date.now() + 180000;
      let finished = false;
      while (Date.now() < deadline) {
        const state = await perfPage.evaluate(() => ({
          ready: window.pp.estado === 'PRONTO' && !window.pp.busy,
          open: document.querySelector('#overlay').open,
          kind: document.querySelector('#overlay').dataset.kind,
        }));
        if (state.ready || (item.stopAtIntro && state.open && state.kind === 'bonus')) { finished = true; break; }
        if (state.open) {
          // Keep the same minimum confirmation delay as the real UI.
          await perfPage.waitForTimeout(550);
          await perfPage.locator('#overlay-continue').click();
        } else await perfPage.waitForTimeout(50);
      }
      assert.ok(finished, `Timeout de desempenho: ${item.name}`);
      const metrics = await perfPage.evaluate(() => {
        const sample = window.__frameSample; sample.running = false; sample.observer.disconnect();
        const elapsedFrames = sample.times.reduce((sum, time) => sum + time, 0);
        const sorted = [...sample.times].sort((a, b) => a - b);
        return {
          version: window.pp.MATH_VERSION, durationMs: Math.round(performance.now() - sample.started),
          frames: sample.times.length, fps: Number((sample.times.length * 1000 / elapsedFrames).toFixed(1)),
          p95FrameMs: Number((sorted[Math.floor(sorted.length * .95)] ?? 0).toFixed(1)),
          framesOver50ms: sample.times.filter(time => time > 50).length,
          longTasks: sample.longTasks.length, maxLongTaskMs: Math.round(Math.max(0, ...sample.longTasks)),
          events: sample.events, layoutFits: sample.layoutFits, panel: window.ppPerf?.text(),
        };
      });
      measurements.push({ ...item, cpuSlowdown: 4, viewport: '390x844', browser: browser.version(), ...metrics });
      console.log(`perf ${item.name}: ${metrics.fps} FPS, p95 ${metrics.p95FrameMs} ms, ${metrics.longTasks} tarefas longas`);
    }
    await writeFile(new URL('test-results/art-performance.json', root), JSON.stringify(measurements, null, 2));
    await perfPage.close();
  }
  assert.deepEqual(errors, [], 'Erros de browser ou recursos em falta');
  console.log(`Arte de runtime: ${runtimeFiles.size} ficheiros únicos, ${bytes} bytes. Inspecionar capturas para qualidade e cortes de texto.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
