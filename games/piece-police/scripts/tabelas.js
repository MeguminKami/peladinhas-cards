#!/usr/bin/env node
// ============================================================================
// Mostra TODAS as tabelas em vigor (já validadas pelo motor) e exporta-as em CSV.
//   npm run tabelas            imprime no terminal
//   npm run tabelas -- --csv   também grava relatorios/tabelas/<versão>/*.csv
// As tabelas editáveis estão em tabelas/*.js (um ficheiro por tema).
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, MATH_VERSION, CONFIG_HASH } from '../src/config.js';
import { pt, int, pct, x, c, table, csv } from './format.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = config.tables;
const out = {};
const show = (name, title, cols, rows) => { console.log(table(title, cols, rows) + '\n'); out[name] = { h: cols.map((k) => k.h), rows }; };

console.log('\n' + c.bold(`PEACE POLICE: THE AFTERPARTY — TABELAS (versão ${MATH_VERSION} · config ${CONFIG_HASH})`) + '\n');

const ids = ['N1', 'N2', 'N3', 'N4', 'N5', 'P1', 'P2', 'P3', 'P4', 'P5', 'S'];
const names = Object.fromEntries(T.SIMBOLOS.map((s) => [s.id, s.nome]));
show('simbolos', 'Símbolos', [{ h: 'ID', a: 'l' }, { h: 'Nome', a: 'l' }, { h: 'Categoria', a: 'l' }, { h: 'Personagem', a: 'l' }],
  T.SIMBOLOS.map((s) => [s.id, s.nome, s.cat, s.personagem || '']));

const sets = Object.keys(T.PESOS);
show('pesos', 'Pesos por conjunto (relativos) e probabilidade por posição', [{ h: 'Símbolo', a: 'l' }, ...sets.flatMap((s) => [{ h: s }, { h: '%' }])],
  ids.map((id) => [id, ...sets.flatMap((s) => [int(T.PESOS[s][id]), pct(config.weights[s].prob[id], 1)])]));
show('empilhamento', 'Empilhamento (% de copiar o vizinho)', [{ h: 'Conjunto', a: 'l' }, { h: 'baixo ↓' }, { h: 'baixo →' }, { h: 'premium ↓' }, { h: 'premium →' }],
  sets.map((s) => { const e = T.EMPILHAMENTO[s]; return [s, pt(e.baixo.vertical, 1), pt(e.baixo.horizontal, 1), pt(e.premium.vertical, 1), pt(e.premium.horizontal, 1)]; }));

const sizes = []; for (let n = config.clusterMin; n <= config.payMaxSize; n++) sizes.push(n === config.payMaxSize ? n + '+' : String(n));
show('pagamentos', 'Tabela de pagamentos (× aposta)', [{ h: 'Símbolo', a: 'l' }, ...sizes.map((s) => ({ h: s }))],
  Object.entries(T.PAGAMENTOS).map(([id, row]) => [`${id} ${names[id].split(' —')[0]}`, ...row.map((v) => pt(v, 2))]));

const flat = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, prefix + k + '.') : [[prefix + k, Array.isArray(v) ? JSON.stringify(v) : String(v)]]));
show('poderes', 'Poderes, Chemistry e cantos', [{ h: 'Parâmetro', a: 'l' }, { h: 'Valor', a: 'l' }],
  [...flat(T.PODERES, 'PODERES.'), ...flat(T.CHEMISTRY, 'CHEMISTRY.'), ...flat(T.CANTOS, 'CANTOS.')]);
show('fusoes', 'Fusões (rank 1 = mais forte)', [{ h: 'Rank' }, { h: 'Fusão', a: 'l' }, { h: 'Par', a: 'l' }, { h: 'Parâmetros', a: 'l' }],
  [...T.FUSOES].sort((a, b) => a.rank - b.rank).map((f) => [String(f.rank), f.id, f.par.join(' + '), Object.entries(f).filter(([k]) => !['rank', 'id', 'par'].includes(k)).map(([k, v]) => `${k}=${v}`).join(', ')]));

const pm = Object.keys(T.PEACE_POLICE.probAparecer);
show('peace_police', 'Peace Police (% por despertar / % Joiner quando aparece)', [{ h: 'Modo', a: 'l' }, { h: 'Aparecer' }, { h: 'Joiner' }, { h: 'Calmer' }],
  pm.map((m) => [m, pct(T.PEACE_POLICE.probAparecer[m] / 100, 1), pct(T.PEACE_POLICE.probJoiner[m] / 100, 0), pct(1 - T.PEACE_POLICE.probJoiner[m] / 100, 0)]));
const dwTot = Object.values(T.PEACE_POLICE.distintivo).reduce((a, b) => a + b, 0);
show('distintivo', 'Distintivo (multiplicador)', [{ h: 'Mult.', a: 'l' }, { h: 'Peso' }, { h: '%' }],
  Object.entries(T.PEACE_POLICE.distintivo).map(([m, w]) => ['×' + m, int(w), pct(w / dwTot, 1)]));

const bids = Object.keys(T.BONUS);
const bkeys = Object.keys(T.BONUS[bids[0]]).filter((k) => k !== 'nome');
show('bonus', 'Bónus', [{ h: 'Parâmetro', a: 'l' }, ...bids.map((b) => ({ h: T.BONUS[b].nome }))], [
  ['Scatters para ativar', ...bids.map((b) => Object.entries(T.ATIVACAO).find(([, v]) => v === b)?.[0] || '—')],
  ...bkeys.map((k) => [k, ...bids.map((b) => String(T.BONUS[b][k]))]),
]);
show('retrigger', 'Retrigger', [{ h: 'Parâmetro', a: 'l' }, { h: 'Valor' }], Object.entries(T.RETRIGGER).map(([k, v]) => [k, String(v)]));

show('modos', 'Modos, custos e limites', [{ h: 'Modo', a: 'l' }, { h: 'Nome', a: 'l' }, { h: 'Custo (× aposta)' }, { h: 'Usa', a: 'l' }],
  Object.entries(T.MODOS).map(([id, m]) => [id, m.nome, x(m.custo, 2), m.pesos ? 'pesos ' + m.pesos : 'bónus ' + m.bonus]));
show('jogo', 'Regras gerais', [{ h: 'Parâmetro', a: 'l' }, { h: 'Valor', a: 'l' }], [...flat(T.JOGO), ...flat(T.ALVO, 'ALVO.')]);

if (process.argv.includes('--csv')) {
  const dir = path.join(ROOT, 'relatorios', 'tabelas', MATH_VERSION);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, t] of Object.entries(out)) fs.writeFileSync(path.join(dir, name + '.csv'), csv(t.h, t.rows));
  console.log(c.dim(`CSV gravados em ${path.relative(ROOT, dir)}${path.sep}`));
}
