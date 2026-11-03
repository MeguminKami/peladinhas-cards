/**
 * Painel de diagnóstico (só com ?debug=1; ?perf=1 mostra só o desempenho).
 *  - Seed: ver, definir e renovar (sessão de teste; só entre jogadas).
 *  - Cenários forçados do motor (scenario()): nunca liquidam saldo.
 *  - Registo de eventos em tempo real, JSON do passo atual e do estado.
 *  - Passo a passo: pausa depois de cada evento e avança à mão.
 *  - Simulação rápida num Web Worker com o mesmo motor.
 *  - Desempenho: FPS, tarefas longas e latência da carteira por pedido.
 */
import { scenarioNames } from '../src/index.js';
import { narrar } from './texto.js';

const css = `
#pp-debug{position:fixed;z-index:50;top:0;right:0;width:360px;height:100vh;background:#0b0a14f2;border-left:1px solid #3d3758;color:#e8e4f5;font:12px/1.35 system-ui,sans-serif;display:flex;flex-direction:column}
#pp-debug.closed{height:auto;width:auto}
#pp-debug.closed .body{display:none}
#pp-debug header{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #3d3758}
#pp-debug header b{flex:1}
#pp-debug .body{overflow:auto;padding:6px 8px;flex:1}
#pp-debug section{border:1px solid #3d3758;border-radius:8px;padding:6px;margin-bottom:6px}
#pp-debug h4{margin:0 0 4px;font-size:11px;letter-spacing:.08em;color:#b477ff}
#pp-debug button,#pp-debug input,#pp-debug select{font:inherit;color:inherit;background:#1d1b30;border:1px solid #3d3758;border-radius:6px;padding:3px 6px}
#pp-debug button{cursor:pointer}
#pp-debug .scen{display:flex;flex-wrap:wrap;gap:4px}
#pp-debug pre{margin:0;max-height:180px;overflow:auto;font:11px/1.3 ui-monospace,Consolas,monospace;white-space:pre-wrap;background:#0006;padding:4px;border-radius:6px}
#pp-debug .log{max-height:220px}
#pp-debug .row{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0}
#pp-perf{position:fixed;z-index:51;left:6px;bottom:6px;background:#000c;color:#9f9;font:11px ui-monospace,monospace;padding:4px 6px;border-radius:6px;pointer-events:none;white-space:pre}
`;

export function installDebug(pp, { full = true } = {}) {
  // CSP: sem estilos inline -> folha de estilos criada por código (CSSOM é permitido)
  const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const perf = installPerf(pp);
  if (!full) return;
  const root = document.createElement('aside');
  root.id = 'pp-debug';
  root.innerHTML = `<header><b>DIAGNÓSTICO</b><button data-k="toggle" type="button">esconder</button></header><div class="body">
    <section><h4>SEED</h4><div class="row">Atual: <code data-k="seed"></code></div>
      <div class="row"><input data-k="seed-in" placeholder="nova seed" size="14"><button data-k="seed-set" type="button">Definir</button><button data-k="seed-new" type="button">Renovar</button></div></section>
    <section><h4>CENÁRIOS FORÇADOS (não mexem no saldo)</h4><div class="scen" data-k="scen"></div></section>
    <section><h4>PROCURAR E JOGAR (jogada real do motor a partir de uma seed)</h4>
      <div class="row"><select data-k="find"><option value="retrigger">retrigger</option><option value="grande">ganho grande (≥ 20×)</option><option value="sem-premio">sem prémio</option><option value="limite">limite atingido</option><option value="bonus">entrada no bónus</option><option value="calmer">Calmer</option><option value="joiner">Joiner</option><option value="total-chemistry">Total Chemistry</option></select>
      <select data-k="find-mode"><option>base</option><option>hunt</option><option>buy-afterparty</option><option>buy-vip</option><option>buy-police</option></select>
      <input data-k="find-max" type="number" value="20000" min="100" step="1000" size="6"><button data-k="find-go" type="button">Procurar</button></div><pre data-k="find-out">—</pre></section>
    <section><h4>PASSO A PASSO</h4><div class="row"><label><input type="checkbox" data-k="stepmode"> pausar após cada evento</label><button data-k="advance" type="button">Avançar ▶</button></div><div class="row" data-k="pending"></div></section>
    <section><h4>ESTADO</h4><div class="row">Máquina: <b data-k="estado"></b></div><pre data-k="state"></pre></section>
    <section><h4>REGISTO DE EVENTOS</h4><div class="row"><button data-k="clear" type="button">Limpar</button></div><pre class="log" data-k="log"></pre></section>
    <section><h4>PASSO ATUAL (JSON)</h4><pre data-k="step"></pre></section>
    <section><h4>SIMULAÇÃO RÁPIDA (Web Worker, mesmo motor)</h4>
      <div class="row"><input data-k="n" type="number" value="20000" min="100" step="1000" size="7"><select data-k="mode"><option>base</option><option>hunt</option><option>buy-afterparty</option><option>buy-vip</option><option>buy-police</option></select><button data-k="sim" type="button">Correr</button></div><pre data-k="simout">—</pre></section>
    <section><h4>DESEMPENHO</h4><pre data-k="perf"></pre></section>
  </div>`;
  document.body.append(root);
  const q = k => root.querySelector(`[data-k="${k}"]`);
  // o jogo encolhe para o painel não tapar nada (e volta a crescer quando o painel se esconde)
  const reserve = () => { document.documentElement.dataset.reserveRight = root.classList.contains('closed') ? '0' : String(root.offsetWidth); pp.layout.schedule(); };
  q('toggle').addEventListener('click', () => { root.classList.toggle('closed'); q('toggle').textContent = root.classList.contains('closed') ? 'mostrar' : 'esconder'; reserve(); });
  if (innerWidth < 900) root.classList.add('closed'), q('toggle').textContent = 'mostrar';
  reserve();
  const showSeed = () => { q('seed').textContent = pp.session.host ? '(carteira do site)' : pp.session.seed; };
  showSeed();
  q('seed-set').addEventListener('click', () => { const v = q('seed-in').value.trim(); if (v && pp.renewSeed(v) != null) { showSeed(); log(`seed definida: ${v}`); } });
  q('seed-new').addEventListener('click', () => { if (pp.renewSeed() != null) { showSeed(); log(`seed renovada: ${pp.session.seed}`); } });
  for (const name of scenarioNames()) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.scenario = name;
    b.addEventListener('click', () => { if (!pp.runScenario(name)) log(`(${name}: só entre jogadas)`); });
    q('scen').append(b);
  }
  q('stepmode').addEventListener('change', ev => pp.setStepMode(ev.target.checked));
  q('advance').addEventListener('click', () => pp.advance());
  const lines = [];
  const log = text => { lines.push(text); if (lines.length > 400) lines.shift(); q('log').textContent = lines.join('\n'); q('log').scrollTop = q('log').scrollHeight; };
  q('clear').addEventListener('click', () => { lines.length = 0; q('log').textContent = ''; });
  pp.on('log', log);
  pp.on('estado', s => { q('estado').textContent = s; });
  q('estado').textContent = pp.estado;
  pp.on('step', step => { q('step').textContent = JSON.stringify({ ...step, events: `${step.events.length} eventos` }, null, 1); log(`— passo ${step.index + 1} (${step.kind}${step.bonusId ? ' ' + step.bonusId : ''}) —`); });
  pp.on('evento', e => {
    const m = pp.model;
    log(`${e.type}${narrar(e, m, pp.bet) ? ' · ' + narrar(e, m, pp.bet) : ''}`);
    q('state').textContent = JSON.stringify({ awake: m.awake, fused: m.fused, level: m.level, partyMode: m.partyMode, police: m.police, freeSpins: m.freeSpins, stepWin: m.stepWin, roundWin: m.roundWin, mult: m.mult, groups: m.groups.map(g => ({ symbol: g.symbol, kind: g.kind, cells: [...g.cells] })) }, null, 1);
  });
  pp.on('gate', e => { q('pending').textContent = `à espera: ${e.type}`; });
  pp.on('jogada', info => log(`== jogada ${info.id} · ${info.mode} · prémio ${info.win} cênt. (${info.winMils} mils) ==`));
  q('sim').addEventListener('click', () => {
    const n = Math.max(100, Math.min(2_000_000, Number(q('n').value) || 20000)), mode = q('mode').value;
    const worker = new Worker(new URL('./sim-worker.js', import.meta.url), { type: 'module' });
    const seed = `browser-${Date.now()}`;
    q('simout').textContent = `a correr ${n} × ${mode}…`;
    worker.onmessage = ({ data }) => {
      if (data.progress != null && !data.done) { q('simout').textContent = `a correr ${n} × ${mode}… ${Math.round(data.progress * 100)} %`; return; }
      if (data.done) {
        q('simout').textContent = `${data.version} · ${data.mode} · ${data.n} jogadas · seed ${data.seed}\nRTP ${data.rtp.toFixed(2)} % (amostra pequena: só confirma o motor)\nCom prémio ${data.hitRate.toFixed(1)} %\nBónus ${data.bonus}${data.bonusEvery ? ` (1 em ${Math.round(data.bonusEvery)})` : ''}\nMáximo ${data.maxX.toFixed(2)}× · limite atingido ${data.capped}\n${data.ms} ms`;
        worker.terminate();
      }
    };
    worker.onerror = e => { q('simout').textContent = `erro: ${e.message}`; worker.terminate(); };
    worker.postMessage({ n, mode, seed });
  });
  q('find-go').addEventListener('click', () => {
    const find = q('find').value, mode = q('find-mode').value, max = Math.max(100, Math.min(500000, Number(q('find-max').value) || 20000));
    const worker = new Worker(new URL('./sim-worker.js', import.meta.url), { type: 'module' });
    q('find-out').textContent = `a procurar ${find} em ${mode}…`;
    worker.onmessage = ({ data }) => {
      if (!data.done) { q('find-out').textContent = `a procurar ${find} em ${mode}… ${Math.round(data.progress * 100)} %`; return; }
      worker.terminate();
      if (!data.found) { q('find-out').textContent = `Não encontrado em ${data.tries} jogadas de ${mode}.`; return; }
      q('find-out').textContent = `Encontrado: seed «${data.seed}» (${data.tries} tentativas, ${data.x}×). A jogar…`;
      if (!pp.runSeed(mode, data.seed)) q('find-out').textContent += ' (espera pelo fim da jogada atual)';
    };
    worker.postMessage({ find, mode, max });
  });
  setInterval(() => { q('perf').textContent = perf.text(); }, 500);
}

function installPerf(pp) {
  let frames = 0, fps = 0, last = performance.now(), longTasks = 0, longMs = 0;
  const loop = t => { frames++; if (t - last >= 1000) { fps = Math.round(frames * 1000 / (t - last)); frames = 0; last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) { longTasks++; longMs = Math.max(longMs, Math.round(e.duration)); } }).observe({ type: 'longtask', buffered: true }); } catch { }
  const box = document.createElement('div'); box.id = 'pp-perf'; document.body.append(box);
  const api = {
    text() {
      const t = pp.session.timings || [];
      const lat = t.slice(-6).map(x => `${x.action} ${x.ms} ms`).join(' · ');
      return `FPS ${fps} · tarefas longas ${longTasks} (máx. ${longMs} ms)\ncarteira: ${pp.session.host ? (lat || '—') : 'local (sem latência)'}`;
    },
  };
  setInterval(() => { box.textContent = api.text(); }, 500);
  window.ppPerf = api;
  return api;
}
