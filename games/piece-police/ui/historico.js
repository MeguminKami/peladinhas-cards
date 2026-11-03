/**
 * Histórico das últimas jogadas (neste browser): hora, aposta, custo, modo, prémio e versão.
 * Clicar numa jogada abre os passos e os eventos (narrados e em JSON).
 */
import { money, narrar, MODE_LABEL, xBet } from './texto.js';
import { novoModelo, aplicar } from './modelo.js';

const KEY = 'pp-historico';
const MAX = 30;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
function write(list) {
  for (let n = list.length; n > 0; n--) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, n))); return; } catch { /* quota: guarda menos */ }
  }
}

export function guardarJogada(entry) {
  const list = [entry, ...read().filter(e => e.id !== entry.id)].slice(0, MAX);
  write(list);
}

const hora = at => new Date(at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function desenharHistorico(body) {
  const list = read();
  if (!list.length) { body.innerHTML = '<p>Ainda não há jogadas.</p>'; return; }
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Hora</th><th>Modo</th><th>Aposta</th><th>Custo</th><th>Prémio</th><th>× aposta</th><th>Passos</th><th>Versão</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const e of list) {
    const tr = document.createElement('tr');
    tr.dataset.id = e.id; tr.tabIndex = 0;
    tr.innerHTML = `<td>${hora(e.at)}${e.forced ? ' · forçado' : ''}${e.resumed ? ' · retomada' : ''}</td><td>${MODE_LABEL[e.mode] ?? e.mode}</td><td>${money(e.bet)}</td><td>${money(e.cost)}</td><td>${money(e.win)}</td><td>${xBet(e.winMils ?? 0)}</td><td>${e.steps?.length ?? 0}</td><td>${e.version}</td>`;
    const open = () => detalhe(body, e);
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(); });
    tbody.append(tr);
  }
  table.append(tbody);
  body.replaceChildren(table);
}

function detalhe(body, e) {
  const back = document.createElement('button');
  back.type = 'button'; back.textContent = '← Voltar à lista'; back.className = 'top-btn';
  back.addEventListener('click', () => desenharHistorico(body));
  const head = document.createElement('p');
  head.textContent = `${hora(e.at)} · ${MODE_LABEL[e.mode] ?? e.mode} · aposta ${money(e.bet)} · custo ${money(e.cost)} · prémio ${money(e.win)} · ${e.version} · jogada ${e.id}`;
  const parts = [back, head];
  const m = novoModelo();
  for (const step of e.steps || []) {
    const h = document.createElement('h3');
    h.textContent = `Passo ${step.index + 1} · ${step.kind === 'bonus' ? `free spin ${step.freeSpins?.played}/${step.freeSpins?.total}` : 'spin base'} · ${xBet(step.win)}`;
    const pre = document.createElement('pre');
    const lines = [];
    for (const ev of step.events) {
      aplicar(m, ev);
      const t = narrar(ev, m, e.bet);
      lines.push(`${ev.type}${t ? ` — ${t}` : ''}`);
    }
    pre.textContent = lines.join('\n');
    const det = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = 'Eventos em JSON';
    const raw = document.createElement('pre'); raw.textContent = step.events.map(ev => JSON.stringify(ev)).join('\n');
    det.append(sum, raw);
    parts.push(h, pre, det);
  }
  body.replaceChildren(...parts);
  body.scrollTop = 0;
}
