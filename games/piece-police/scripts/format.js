// Formatação de números e tabelas para o terminal e para CSV (Excel PT: ';' e vírgula decimal).

export const pt = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
export const int = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('pt-PT') : '—');
export const pct = (v, d = 2) => (Number.isFinite(v) ? pt(v * 100, d) + ' %' : '—');
export const x = (v, d = 2) => (Number.isFinite(v) ? pt(v, d) + '×' : '—');
export const oneIn = (f) => (f > 0 ? '1 em ' + int(1 / f) : 'nunca');

const ESC = process.stdout.isTTY ? '\x1b[' : null;
export const c = {
  bold: (s) => (ESC ? `${ESC}1m${s}${ESC}0m` : s),
  dim: (s) => (ESC ? `${ESC}2m${s}${ESC}0m` : s),
  green: (s) => (ESC ? `${ESC}32m${s}${ESC}0m` : s),
  red: (s) => (ESC ? `${ESC}31m${s}${ESC}0m` : s),
  yellow: (s) => (ESC ? `${ESC}33m${s}${ESC}0m` : s),
  cyan: (s) => (ESC ? `${ESC}36m${s}${ESC}0m` : s),
};
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

/** Tabela com bordas. cols: [{ h: 'título', a: 'l'|'r' }], rows: arrays de strings. */
export function table(title, cols, rows) {
  const w = cols.map((col, i) => Math.max(strip(col.h).length, ...rows.map((r) => strip(r[i] ?? '').length)));
  const line = (l, m, r) => l + w.map((n) => '─'.repeat(n + 2)).join(m) + r;
  const cell = (s, i) => {
    const str = String(s ?? ''); const pad = w[i] - strip(str).length;
    return ' ' + (cols[i].a === 'l' ? str + ' '.repeat(pad) : ' '.repeat(pad) + str) + ' ';
  };
  const out = [];
  if (title) out.push(c.bold(title));
  out.push(line('┌', '┬', '┐'));
  out.push('│' + cols.map((col, i) => cell(c.bold(col.h), i)).join('│') + '│');
  out.push(line('├', '┼', '┤'));
  for (const r of rows) out.push('│' + r.map((s, i) => cell(s, i)).join('│') + '│');
  out.push(line('└', '┴', '┘'));
  return out.join('\n');
}

/** Linhas -> texto CSV (separador ';', números com vírgula decimal). */
export function csv(headers, rows) {
  const esc = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : '';
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}
