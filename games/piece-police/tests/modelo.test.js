// O modelo da interface (ui/modelo.js) aplica os eventos por ordem. Este teste confirma, em muitas
// jogadas de todos os modos, que o que o ecrã mostraria bate SEMPRE certo com as grelhas completas
// que o motor envia (grid.refill, respin) e com as células de cada prémio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, playRound, scenario, scenarioNames } from '../src/index.js';
import { novoModelo, aplicar } from '../ui/modelo.js';

const WILDS = new Set(['W', 'CW', 'DW']);

function verificar(round, label) {
  const m = novoModelo();
  for (const step of round.steps) {
    for (const e of step.events) {
      if (e.type === 'grid.refill' || e.type === 'power.one_more_chance.respin') {
        // antes de aplicar: as células que não são novas já tinham de estar certas no modelo
        if (e.type === 'grid.refill') {
          const fresh = new Set(e.newCells);
          // a gravidade move símbolos; comparamos só o multiconjunto por coluna das células não-novas
          for (let col = 0; col < 5; col++) {
            const before = [], after = [];
            for (let r = 0; r < 5; r++) { const i = col * 5 + r; if (m.grid[i] && m.grid[i] !== 'X') before.push(m.grid[i]); if (!fresh.has(i) && e.grid[i] !== 'X' && e.grid[i] !== '') after.push(e.grid[i]); }
            assert.deepEqual(before.sort(), after.sort(), `${label}: coluna ${col} antes do refill`);
          }
        }
      }
      if (e.type === 'win.cluster') {
        for (const c of e.cells) assert.ok(m.grid[c] === e.symbol || WILDS.has(m.grid[c]), `${label}: célula ${c} = ${m.grid[c]}, prémio ${e.symbol}`);
        let mult = 0;
        for (const c of e.cells) if (m.grid[c] === 'CW' || m.grid[c] === 'DW') mult += m.mult[c];
        assert.equal(Math.max(1, mult), e.multiplier, `${label}: multiplicador do prémio`);
      }
      aplicar(m, e);
      if (e.grid) assert.deepEqual(m.grid, e.grid, `${label}: ${e.type}`);
    }
    assert.equal(m.stepWin, step.win, `${label}: soma dos prémios do passo`);
  }
  assert.equal(m.roundWin, round.totalWinMils, `${label}: total da jogada`);
}

test('o modelo da interface acompanha o motor em todos os modos', () => {
  for (const mode of ['base', 'hunt', 'buy-afterparty', 'buy-vip', 'buy-police']) {
    const st = newState(`modelo-${mode}`);
    const n = mode.startsWith('buy') ? 300 : 3000;
    for (let i = 0; i < n; i++) {
      const r = playRound(st.rng, { bet: 100, mode });
      st.rng = r.rngAfter;
      verificar(r, `${mode}#${i}`);
    }
  }
});

test('o modelo da interface acompanha todos os cenários de diagnóstico', () => {
  for (const name of scenarioNames()) verificar(scenario(name), name);
});
