import { createEngine, entryCostMultiplier } from '../src/index.js';

export const AUTO_SPIN_COUNTS = Object.freeze([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500]);
export const BET_UNITS = Object.freeze([20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 1000, 2000, 5000]);
export const SPEEDS = Object.freeze({ normal: 1, fast: .32, ultra: .035 });

export function autoCount(index) {
  if (!Number.isInteger(index) || index < 0 || index >= AUTO_SPIN_COUNTS.length) throw new RangeError('Invalid autoplay selection');
  return AUTO_SPIN_COUNTS[index];
}

export class TestSession {
  constructor({ seed = 1, balanceUnits = 1000000, engine = createEngine({ seed }) } = {}) {
    if (!Number.isSafeInteger(balanceUnits) || balanceUnits < 0) throw new RangeError('Invalid test balance');
    this.engine = engine;
    this.balanceUnits = balanceUnits;
    this.state = null;
    this.roundBalance = balanceUnits;
  }

  get active() { return Boolean(this.state && !this.state.complete); }

  cost(mode, betUnits) { return entryCostMultiplier(mode, this.engine.config) * betUnits; }

  start(mode, betUnits) {
    if (this.active) throw Error('Já existe uma jogada em curso.');
    const state = this.engine.start({ mode, betUnits });
    if (this.balanceUnits < state.costUnits) throw Error('Saldo de teste insuficiente para esta jogada.');
    this.roundBalance = this.balanceUnits;
    this.balanceUnits -= state.costUnits;
    this.state = state;
    return state;
  }

  advance(options = {}) {
    if (!this.active) throw Error('Não existe uma jogada em curso.');
    try {
      const result = this.engine.step(this.state, options);
      this.state = result.state;
      if (this.state.complete) {
        const settlement = result.events.find(event => event.type === 'round-end');
        if (!settlement) throw Error('A liquidação da jogada não foi recebida.');
        this.balanceUnits += settlement.creditedUnits;
      }
      return result;
    } catch (error) {
      // Local test transaction only. Never retain an incomplete paid result.
      this.balanceUnits = this.roundBalance;
      this.state = null;
      throw error;
    }
  }
}
