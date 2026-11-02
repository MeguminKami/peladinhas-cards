import { DEFAULT_CONFIG, MODES, SYMBOLS, SCATTER, WILD, PPM, validateConfig, deepFreeze, entryCostMultiplier } from './config.js';
import { createRandom, randomIndex, weightedIndex } from './random.js';

const NEIGHBORS = Array.from({ length: 30 }, (_, p) => {
  const row = Math.floor(p / 6), col = p % 6;
  return [row > 0 ? p - 6 : -1, col < 5 ? p + 1 : -1, row < 4 ? p + 6 : -1, col > 0 ? p - 1 : -1].filter(p => p >= 0);
});
export const symbolOf = cell => typeof cell === 'string' ? cell : cell?.symbol;
export const wild = (multiplier = 0) => ({ symbol: WILD, multiplier });
const countScatters = board => board.filter(c => c === SCATTER).length;
const copyBoard = board => board.map(c => typeof c === 'object' && c !== null ? { ...c } : c);
const hasMultipliers = mode => mode !== 'base';

function checkMode(mode) {
  if (!MODES.includes(mode)) throw new TypeError('Unknown game mode');
}

export function validateBoard(board, mode, { allowEmpty = false } = {}) {
  checkMode(mode);
  if (!Array.isArray(board) || board.length !== 30) throw new TypeError('Board must contain 30 cells in row-major order');
  for (const cell of board) {
    if (allowEmpty && cell === null) continue;
    if (cell === SCATTER || SYMBOLS.includes(cell)) continue;
    if (cell?.symbol === WILD && Number.isSafeInteger(cell.multiplier) &&
        cell.multiplier >= (hasMultipliers(mode) ? 1 : 0) &&
        (hasMultipliers(mode) || cell.multiplier === 0)) continue;
    throw new TypeError('Invalid cell or wild multiplier for this mode');
  }
  if (countScatters(board) > (mode === 'base' ? 5 : 3)) throw new RangeError('Too many scatters');
  return board;
}

export function tierForSize(size) {
  if (!Number.isInteger(size) || size < 0 || size > 30) throw new RangeError('Invalid group size');
  return size < 5 ? -1 : size === 5 ? 0 : size < 8 ? 1 : size < 11 ? 2 : size < 14 ? 3 : size < 18 ? 4 : 5;
}

export function compactBoard(board) {
  const result = Array(30).fill(null);
  for (let col = 0; col < 6; col++) {
    let target = 24 + col;
    for (let p = 24 + col; p >= 0; p -= 6) {
      if (board[p] !== null) { result[target] = board[p]; target -= 6; }
    }
  }
  return result;
}

// Mutates only the supplied working board, never a published event/state.
export function fillBoard(board, mode, rng, config = DEFAULT_CONFIG, scatterMultiplier = 1) {
  let scatters = countScatters(board);
  const generated = [];
  for (let col = 0; col < 6; col++) {
    for (let row = 4; row >= 0; row--) {
      const p = row * 6 + col;
      if (board[p] !== null) continue;
      const chance = Math.min(PPM, Math.round((config.scatterPPM[mode][scatters] ?? 0) * scatterMultiplier));
      if (randomIndex(rng, PPM) < chance) {
        board[p] = SCATTER;
        scatters++;
        generated.push({ position: p, symbol: SCATTER, source: 'draw' });
        continue;
      }
      const i = weightedIndex(rng, config.weights);
      board[p] = SYMBOLS[i];
      generated.push({ position: p, symbol: board[p], source: 'draw' });
      const chances = [i < 5 ? config.pairPPM : config.premiumPairPPM, config.repeatPairPPM,
        ...config.extraCopyPPM[i < 5 ? 'normal' : 'premium']];
      let parent = p;
      // One bounded chain per original draw: at most five additional copies.
      for (let copy = 0; copy < chances.length; copy++) {
        const copyChance = mode === 'base' ? Math.round(chances[copy] * config.baseCopyScalePPM / PPM) : chances[copy];
        if (randomIndex(rng, PPM) >= copyChance) break;
        const free = NEIGHBORS[parent].filter(n => board[n] === null);
        if (!free.length) break;
        const target = free[randomIndex(rng, free.length)];
        board[target] = board[p];
        generated.push({ position: target, symbol: board[p], source: copy === 0 ? 'pair' : 'repeat-pair', parent });
        parent = target;
      }
    }
  }
  return generated;
}

function groupResult(board, mode, config, i, positions, special = false) {
  const size = positions.length, tier = tierForSize(size);
  const regularSize = positions.filter(p => SYMBOLS.includes(board[p])).length;
  // XP keeps its fixed 11?14 / 15?17 bands independently of payments.
  const xpTier = regularSize === 14 ? 3 : tierForSize(regularSize);
  let multiplier = 1n;
  if (hasMultipliers(mode)) {
    const sum = positions.reduce((n, p) => n + (symbolOf(board[p]) === WILD ? BigInt(board[p].multiplier) : 0n), 0n);
    if (sum > 0n) multiplier = sum;
  }
  // The actual amount credited is capped by the round, not by this descriptor.
  // Decimal strings keep uncapped values exact and events JSON-serializable.
  const rawPay100 = BigInt(config.pay100[i][tier]) * multiplier;
  return {
    symbol: SYMBOLS[i], positions, size, tier, special,
    multiplier: multiplier.toString(), rawPay100: rawPay100.toString(),
    xp100: xpTier < 0 ? 0 : config.xpPerCluster100[i < 5 ? 'normal' : 'premium'][xpTier],
  };
}

export function evaluateBoard(board, mode, config = DEFAULT_CONFIG) {
  validateBoard(board, mode);
  if (board.every(c => c === SCATTER || symbolOf(c) === WILD)) {
    const positions = board.flatMap((c, p) => symbolOf(c) === WILD ? [p] : []);
    return [groupResult(board, mode, config, 9, positions, true)];
  }
  const hits = [];
  for (let i = 0; i < SYMBOLS.length; i++) {
    const seen = new Set();
    for (let start = 0; start < 30; start++) {
      if (board[start] !== SYMBOLS[i] || seen.has(start)) continue;
      const positions = [start];
      seen.add(start);
      for (let j = 0; j < positions.length; j++) {
        for (const neighbor of NEIGHBORS[positions[j]]) {
          if (!seen.has(neighbor) && (board[neighbor] === SYMBOLS[i] || symbolOf(board[neighbor]) === WILD)) {
            seen.add(neighbor);
            positions.push(neighbor);
          }
        }
      }
      if (positions.length >= 5) hits.push(groupResult(board, mode, config, i, positions));
    }
  }
  return hits;
}

export function magicParameters(mode, level, rng, config = DEFAULT_CONFIG, previous) {
  checkMode(mode);
  if (!Number.isSafeInteger(level) || level < 1 || level >= Number.MAX_SAFE_INTEGER) throw new RangeError('Invalid magic level');
  if (mode === 'base') return { requested: weightedIndex(rng, config.baseWildWeights) + 1, multiplier: 0 };
  const rule = config.magic[mode];
  if (level === 1) return { requested: rule.startWilds, multiplier: rule.startMultiplier };
  if (!previous || !Number.isSafeInteger(previous.requested) || previous.requested < 1 || previous.requested > rule.wildCap || !Number.isSafeInteger(previous.multiplier) || previous.multiplier < 1) throw new TypeError('Magic requires its previous progression');
  const draw = weights => {
    const guaranteed = weights.findIndex(w => w === PPM);
    return guaranteed >= 0 ? guaranteed + 1 : weightedIndex(rng, weights) + 1;
  };
  const wildDraws = previous.requested < rule.wildCap ? Array.from({length:rule.rewardRolls},()=>draw(rule.wildGainWeights)) : [];
  const multiplierDraws = Array.from({length:rule.rewardRolls},()=>rule.multiplierGainCycle
    ? rule.multiplierGainCycle[(level - 2) % rule.multiplierGainCycle.length]
    : draw(rule.multiplierGainWeights));
  const wildGain = Math.min(rule.wildCap - previous.requested, Math.max(0,...wildDraws));
  const multiplierGain = Math.max(...multiplierDraws);
  const requested = previous.requested + wildGain;
  const multiplier = previous.multiplier + multiplierGain;
  if (!Number.isSafeInteger(multiplier)) throw new RangeError('Magic multiplier exceeds safe range');
  return { requested, multiplier, reward: {wildDraws, multiplierDraws, wildGain, multiplierGain} };
}

export function applyMagic(board, mode, level, rng, config = DEFAULT_CONFIG, previous) {
  const parameters = magicParameters(mode, level, rng, config, previous);
  // Surviving wilds retain their original multipliers; progression applies only to new wilds.
  const eligible = board.flatMap((c, p) => SYMBOLS.includes(c) ? [p] : []);
  const positions = [];
  const available = Math.max(0, Math.min(config.maxWilds, config.magic?.[mode]?.wildCap ?? config.maxWilds) - board.filter(c => symbolOf(c) === WILD).length);
  for (let j = 0; j < Math.min(parameters.requested, available) && eligible.length; j++) {
    const index = randomIndex(rng, eligible.length);
    const [p] = eligible.splice(index, 1);
    board[p] = wild(parameters.multiplier);
    positions.push(p);
  }
  return { ...parameters, positions, placed: positions.length };
}

export function bonusForScatters(scatters) {
  return ({ 3: 'common', 4: 'super', 5: 'secret' })[scatters] ?? null;
}
export const extraSpinsForScatters = scatters => scatters === 2 ? 2 : scatters === 3 ? 4 : 0;

export class ExecutionLimitError extends Error {
  constructor(message) { super(message); this.name = 'ExecutionLimitError'; }
}

export function createEngine({ config = DEFAULT_CONFIG, seed = 1, rng = createRandom(seed), maxCascades = 100000, maxSpins = 100000 } = {}) {
  const rules = deepFreeze(structuredClone(validateConfig(config)));
  if (!Number.isSafeInteger(maxCascades) || maxCascades < 1 || !Number.isSafeInteger(maxSpins) || maxSpins < 1) throw new RangeError('Invalid execution limits');
  const current = new WeakSet();

  function start({ mode = 'base', betUnits = 100 } = {}) {
    const price = entryCostMultiplier(mode, rules);
    if (!Number.isSafeInteger(betUnits) || betUnits < 1) throw new RangeError('Bet must be a positive integer of credit units');
    if (!Number.isSafeInteger(betUnits * Math.max(price, rules.maxWin100 / 100))) throw new RangeError('Bet exceeds safe credit range');
    const state = deepFreeze({
      configVersion: rules.version, entryMode: mode, mode: mode === 'hunt' ? 'base' : mode, betUnits, costUnits: betUnits * price,
      complete: false, maxWin: false, paid100: 0,
      paidByMode100: { base: 0, common: 0, super: 0, secret: 0 },
      xp100: 0, magicLevel: 0, magicProgress: { requested: 0, multiplier: 1 }, remainingSpins: mode === 'base' || mode === 'hunt' ? 1 : rules.bonusSpins,
      spins: 0, hitSpins: 0, baseHitSpins: 0, bonusSpinsPlayed: 0, cascades: 0, magicActivations: 0, retriggers: 0, retriggersByScatters: { 2: 0, 3: 0 }, addedSpins: 0,
      bonusType: mode === 'base' || mode === 'hunt' ? null : mode,
      maxMagicLevel: 0, maxMagicWilds: 0,
    });
    current.add(state);
    return state;
  }

  // One step resolves a complete spin. Optional initialBoard is a local fixture,
  // never an input to accept from an untrusted client in a future server adapter.
  function step(state, { trace = true, initialBoard } = {}) {
    if (!current.has(state) || state.complete) throw new Error('State is completed, stale, or belongs to another engine');
    if (state.spins >= maxSpins) throw new ExecutionLimitError('Spin limit reached; round is incomplete');
    if (initialBoard) validateBoard(initialBoard, state.mode);
    // A failing RNG or execution limit invalidates this local step; it must not
    // be replayed with an already-advanced random stream or partially settled.
    current.delete(state);
    const next = structuredClone(state), events = [];
    const emit = (type, data = {}) => { if (trace) events.push({ type, ...structuredClone(data) }); };
    const mode = next.mode;
    const scatterMultiplier = next.entryMode === 'hunt' && mode === 'base' ? rules.bonusHunt.scatterMultiplier : 1;
    let board = initialBoard ? copyBoard(validateBoard(initialBoard, mode)) : Array(30).fill(null);
    const generated = fillBoard(board, mode, rng, rules, scatterMultiplier);
    next.remainingSpins--;
    next.spins++;
    if (mode !== 'base') next.bonusSpinsPlayed++;
    emit('spin-start', { spin: next.spins, mode, scatterMultiplier, board, generated, xp100: next.xp100, magicLevel: next.magicLevel, magicProgress: next.magicProgress, remainingSpins: next.remainingSpins });

    let cascade = 0;
    while (true) {
      const hits = evaluateBoard(board, mode, rules);
      if (!hits.length) break;
      if (cascade >= maxCascades) throw new ExecutionLimitError('Cascade limit reached; round is incomplete');
      if (!cascade) { next.hitSpins++; if (mode === 'base') next.baseHitSpins++; }
      cascade++;
      next.cascades++;
      const raw = hits.reduce((sum, hit) => sum + BigInt(hit.rawPay100), 0n);
      const room = BigInt(rules.maxWin100 - next.paid100);
      const credited100 = Number(raw < room ? raw : room);
      next.paid100 += credited100;
      next.paidByMode100[mode] += credited100;
      emit('hits', { cascade, hits, credited100, totalPaid100: next.paid100 });
      if (next.paid100 === rules.maxWin100) {
        next.maxWin = next.complete = true;
        next.remainingSpins = next.xp100 = 0;
        emit('max-win', { label: 'MAX WIN', totalPaid100: next.paid100 });
        break;
      }
      const xpGained100 = hits.reduce((sum, hit) => sum + hit.xp100, 0);
      next.xp100 += xpGained100;
      emit('xp-gained', { xpGained100, xp100: next.xp100, threshold100: rules.xpThreshold100[mode] });
      const removed = [...new Set(hits.flatMap(hit => hit.positions))];
      for (const p of removed) board[p] = null;
      board = compactBoard(board);
      const replacements = fillBoard(board, mode, rng, rules, scatterMultiplier);
      emit('refill', { removed, board, generated: replacements });
      if (next.xp100 >= rules.xpThreshold100[mode]) {
        const discarded100 = next.xp100 - rules.xpThreshold100[mode];
        next.xp100 = 0;
        next.magicLevel++;
        next.maxMagicLevel = Math.max(next.maxMagicLevel, next.magicLevel);
        next.magicActivations++;
        const magic = applyMagic(board, mode, next.magicLevel, rng, rules, next.magicProgress);
        next.maxMagicWilds = Math.max(next.maxMagicWilds, magic.requested);
        next.magicProgress = { requested: magic.requested, multiplier: magic.multiplier };
        emit('magic', { ...magic, level: next.magicLevel, xp100: 0, discarded100, board, remainingSpins: next.remainingSpins });
      }
    }

    if (!next.maxWin) {
      const scatters = countScatters(board);
      emit('spin-end', { board, scatters, xp100: next.xp100 });
      if (mode === 'base') {
        const bonus = bonusForScatters(scatters);
        next.xp100 = next.magicLevel = 0;
        next.magicProgress = { requested: 0, multiplier: 1 };
        if (bonus) {
          next.mode = next.bonusType = bonus;
          next.remainingSpins = rules.bonusSpins;
          emit('bonus-start', { mode: bonus, spins: rules.bonusSpins, xp100: 0, magicLevel: 0 });
        } else next.complete = true;
      } else {
        const added = extraSpinsForScatters(scatters);
        if (added) {
          next.retriggers++;
          next.retriggersByScatters[scatters]++;
          next.addedSpins += added;
          next.remainingSpins += added;
          emit('retrigger', { scatters, added, remainingSpins: next.remainingSpins });
        }
        if (!next.remainingSpins) { next.complete = true; next.xp100 = 0; }
      }
    }
    if (next.complete) emit('round-end', settlement(next));
    deepFreeze(next);
    current.add(next);
    return { state: next, events };
  }

  function settlement(state) {
    const creditedUnits = Number(BigInt(state.betUnits) * BigInt(state.paid100) / 100n);
    return { costUnits: state.costUnits, creditedUnits, netUnits: creditedUnits - state.costUnits, paid100: state.paid100, maxWin: state.maxWin };
  }

  function play(options = {}) {
    let state = start(options);
    const events = [];
    while (!state.complete) {
      const outcome = step(state, { trace: options.trace ?? false });
      state = outcome.state;
      for (const event of outcome.events) events.push(event);
    }
    return { state, events, settlement: settlement(state) };
  }

  return Object.freeze({ config: rules, start, step, play });
}
