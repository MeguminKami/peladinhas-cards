/**
 * Painel de diagnostico de desempenho (desligado por omissao).
 * Ligar: abrir o jogo com ?perf=1, ou na consola do site:  localStorage.setItem('sofia-perf', '1')  e recarregar.
 * Desligar: localStorage.removeItem('sofia-perf').
 *
 * Mostra FPS, o pior frame recente, tarefas longas (> 50 ms) no fio principal e quanto a carteira do
 * casino demora a responder a cada pedido (connect / start / step). E o mesmo fio do site quando o jogo
 * corre num iframe da mesma origem: lentidao do site aparece aqui tambem.
 */
export function perfEnabled() {
  try { return new URLSearchParams(location.search).get('perf') === '1' || localStorage.getItem('sofia-perf') === '1'; }
  catch { return false; }
}

export function installPerfPanel() {
  if (!perfEnabled()) return;
  const panel = document.createElement('pre');
  panel.id = 'perf-panel';
  panel.setAttribute('aria-hidden', 'true');
  Object.assign(panel.style, { position: 'fixed', left: '6px', top: '6px', zIndex: '9999', margin: '0', padding: '6px 8px',
    font: '11px/1.35 ui-monospace,Consolas,monospace', color: '#e9ffe9', background: '#000a', borderRadius: '6px', pointerEvents: 'none', whiteSpace: 'pre' });
  document.body.append(panel);
  const frames = [], longs = [], wallet = { connect: [], start: [], step: [] };
  let last = performance.now();
  const loop = now => { frames.push([now, now - last]); last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver(list => list.getEntries().forEach(e => longs.push([performance.now(), e.duration]))).observe({ type: 'longtask', buffered: true }); } catch { }
  addEventListener('sofia-wallet-timing', event => { const { action, ms } = event.detail; (wallet[action] ||= []).push(ms); if (wallet[action].length > 30) wallet[action].shift(); });
  const stats = list => list.length ? `${Math.round(list.at(-1))} / ${Math.round(list.reduce((a, b) => a + b, 0) / list.length)} / ${Math.round(Math.max(...list))}` : '—';
  setInterval(() => {
    const now = performance.now();
    while (frames.length && now - frames[0][0] > 5000) frames.shift();
    while (longs.length && now - longs[0][0] > 10000) longs.shift();
    const second = frames.filter(([t]) => now - t <= 1000);
    const worst = frames.reduce((m, [, d]) => Math.max(m, d), 0);
    panel.textContent = [
      `FPS ${second.length}   pior frame 5s ${Math.round(worst)} ms`,
      `tarefas longas 10s: ${longs.length} (${Math.round(longs.reduce((a, [, d]) => a + d, 0))} ms)`,
      `carteira ms (último / média / máx)`,
      ` start ${stats(wallet.start)}   step ${stats(wallet.step)}`,
    ].join('\n');
    window.sofiaPerf = { fps: second.length, worstFrame: worst, longTasks: longs.length, wallet: structuredClone(wallet) };
  }, 500);
}
