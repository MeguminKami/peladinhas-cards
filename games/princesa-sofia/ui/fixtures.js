import { wild } from '../src/index.js';

export function previewBoard() {
  return Array.from({ length: 30 }, (_, p) => `${(p + Math.floor(p / 6)) % 3 ? 'N' : 'P'}${(p * 3 + Math.floor(p / 6)) % 5 + 1}`);
}

export function demoScenario(name) {
  const quiet = () => Array.from({ length: 30 }, (_, p) => (Math.floor(p / 6) + p % 6) % 2 ? 'P3' : 'P2');
  if (name === 'max') return { mode: 'super', board: Array.from({ length: 30 }, () => wild(100)), name: 'MAX WIN' };
  if (name === 'magic') return { mode: 'common', board: Array(30).fill('N1'), name: 'Barra e magia' };
  const board = quiet();
  if (name === 'hit') {
    for (let p = 0; p < 5; p++) board[p] = 'N1';
    return { mode: 'base', board, name: 'Cluster de 5' };
  }
  const counts = { common: 3, super: 4, secret: 5 };
  if (!counts[name]) throw Error('Cenário inválido.');
  for (let p = 0; p < counts[name]; p++) board[p] = 'S';
  return { mode: 'base', board, name: `Entrada ${name}` };
}
