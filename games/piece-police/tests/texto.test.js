import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterEquation } from '../ui/texto.js';

const clean = value => value.replace(/\s/g, ' ');
test('conta visual preserva base exata quando o prémio é um número inteiro de cêntimos', () => {
  assert.equal(clean(clusterEquation({ basePay: 3400, multiplier: 4, pay: 13600 }, 100)), '3,40 × 4 = 13,60');
});
test('aposta pequena não arredonda a base antes de mostrar o multiplicador', () => {
  assert.equal(clean(clusterEquation({ basePay: 105, multiplier: 3, pay: 315 }, 10)), '0,0105 × 3 ≈ 0,03');
  assert.equal(clean(clusterEquation({ basePay: 120, multiplier: 5, pay: 600 }, 10)), '0,012 × 5 = 0,06');
});
test('conta visual identifica o corte no limite sem inventar uma igualdade', () => {
  const event = { basePay: 1000000, multiplier: 40, pay: 25000000 };
  const currency = clean(clusterEquation(event, 100));
  assert.match(currency, /× 40 → 25 ?000,00 \(limite\)$/);
  assert.ok(!currency.includes(' = '));
  const normalised = clean(clusterEquation(event, 100, { inBet: true }));
  assert.match(normalised, /→ 25 ?000× \(limite\)$/);
  assert.equal(event.pay, 25000000, 'A formatação não altera o evento');
});
