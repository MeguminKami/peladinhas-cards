import { RNG, assert, integer, post, clone, type Book } from '../shared/core';
export const RULES = { version: 'BJ-4D-S17-DAS-1', decks: 4, seats: 5, min: 20, max: 100000, maxHands: 4 } as const;
export interface Card { id: string; rank: number; suit: number }
export interface Hand { id: string; cards: Card[]; stake: number; initial: number; extra: number; split: boolean; splitAces: boolean; done: boolean; result?: string; gross: number }
export interface Seat { number: number; initial: number; insurance: number; insured: boolean | null; insuranceGross: number; hands: Hand[] }
export interface Event { type: string; seat?: number; hand?: string; card?: Card; hidden?: boolean; amount?: number }
export interface Round { id: number; revision: number; phase: 'insurance' | 'play' | 'summary'; shoe: Card[]; index: number; dealer: Card[]; seats: Seat[]; active: string | null; reveal: boolean; events: Event[]; cost: number; gross: number }
export interface Session extends Book { version: string; rng: number[]; counter: number; round: Round | null; history: Round[] }
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'insure' | 'decline' | 'declineAll';
export interface Command { round: number; revision: number; hand?: string; seat?: number; action: Action }
export function deck(): Card[] { return Array.from({ length: 208 }, (_, i) => ({ id: `${Math.floor(i / 52)}-${Math.floor(i / 13) % 4}-${i % 13 + 1}`, rank: i % 13 + 1, suit: Math.floor(i / 13) % 4 })); }
export const value = (c: Card) => Math.min(c.rank, 10);
export function total(cards: Card[]) { let n = cards.reduce((a, c) => a + (c.rank === 1 ? 11 : value(c)), 0); let aces = cards.filter(c => c.rank === 1).length; while (n > 21 && aces > 0) { n -= 10; aces--; } return { value: n, soft: aces > 0 }; }
export const natural = (h: Hand) => !h.split && h.cards.length === 2 && total(h.cards).value === 21;
export function fresh(rng = new RNG()): Session { return { version: RULES.version, balance: 100000, ledger: [], rng: [...rng.state], counter: 0, round: null, history: [] }; }
function draw(r: Round, hand: Hand | null, seat?: number, hidden = false) {
  assert(r.index < r.shoe.length, 'Baralho esgotado; operação revertida e estado preservado'); const card = r.shoe[r.index++];
  if (hand) hand.cards.push(card); else r.dealer.push(card);
  r.events.push(hidden ? { type: 'card', hidden: true } : { type: 'card', ...(seat === undefined ? {} : {seat}), ...(hand ? {hand:hand.id} : {}), card });
}
function debit(s: Session, amount: number, tag: string) { const r = s.round!; post(s, `${r.id}:${tag}`, -amount, tag); r.cost += amount; r.events.push({ type: 'debit', amount }); }
function finish(s: Session) {
  const r = s.round!; r.reveal = true; r.events.push({ type: 'reveal', card: r.dealer[1] });
  const needsDealer = r.seats.some(p => p.hands.some(h => !natural(h) && total(h.cards).value <= 21));
  const dealerBJ = r.dealer.length === 2 && total(r.dealer).value === 21;
  if (needsDealer && !dealerBJ) while (total(r.dealer).value < 17) draw(r, null);
  const d = total(r.dealer).value;
  for (const p of r.seats) {
    p.insuranceGross = dealerBJ ? p.insurance * 3 : 0;
    for (const h of p.hands) {
      const t = total(h.cards).value;
      if (t > 21) { h.result = 'Rebentou'; h.gross = 0; }
      else if (dealerBJ) { h.result = natural(h) ? 'Empate' : 'Derrota'; h.gross = natural(h) ? h.stake : 0; }
      else if (natural(h)) { h.result = 'Blackjack'; h.gross = h.stake * 5 / 2; }
      else if (d > 21 || t > d) { h.result = 'Vitória'; h.gross = h.stake * 2; }
      else if (t === d) { h.result = 'Empate'; h.gross = h.stake; }
      else { h.result = 'Derrota'; h.gross = 0; }
      h.done = true;
    }
  }
  r.gross = r.seats.reduce((sum, p) => sum + p.insuranceGross + p.hands.reduce((a, h) => a + h.gross, 0), 0);
  post(s, `${r.id}:return`, r.gross, 'Retorno da ronda'); r.events.push({ type: 'settlement', amount: r.gross }); r.phase = 'summary'; r.active = null;
}
function advance(s: Session) {
  const r = s.round!;
  for (const p of r.seats) for (const h of p.hands) if (natural(h) || total(h.cards).value >= 21) h.done = true;
  const next = r.seats.flatMap(p => p.hands).find(h => !h.done);
  if (next) { r.phase = 'play'; r.active = next.id; } else finish(s);
}
function peek(s: Session) {
  const r = s.round!; r.events.push({ type: 'peek' });
  if (total(r.dealer).value === 21) finish(s); else advance(s);
}
export function start(input: Session, bets: number[], forcedShoe?: Card[]): Session {
  const s = clone(input); assert(s.version === RULES.version, 'Versão incompatível');
  assert(!s.round, 'Confirme primeiro o resumo da ronda'); assert(bets.length === 5, 'São necessários cinco lugares');
  assert(bets.some(Boolean), 'Coloque uma aposta');
  for (const bet of bets) assert(integer(bet) && (bet === 0 || (bet >= RULES.min && bet <= RULES.max && bet % 2 === 0)), 'Aposta inválida: mínimo 0,20, máximo 1 000,00 e múltiplos de 0,02');
  assert(bets.reduce((a, b) => a + b, 0) <= s.balance, 'Saldo insuficiente');
  const rng = new RNG(s.rng); const shoe = forcedShoe ? [...forcedShoe] : rng.shuffle(deck());
  // Full physical shoe is mandatory before any debit. Safe maximum consumption is <208:
  // each live hand is <=21 before its final draw, and 4 decks bound low-card supply.
  assert(shoe.length === 208 && new Set(shoe.map(c => c.id)).size === 208, 'São necessárias 208 cartas físicas únicas');
  const valid = new Set(deck().map(c => `${c.id}:${c.rank}:${c.suit}`));
  assert(shoe.every(c => valid.has(`${c.id}:${c.rank}:${c.suit}`)), 'Carta física inválida');
  s.rng = [...rng.state]; s.counter++;
  const r: Round = { id: s.counter, revision: 0, phase: 'play', shoe, index: 0, dealer: [], seats: [], active: null, reveal: false, events: [], cost: 0, gross: 0 }; s.round = r;
  bets.forEach((b, i) => { if (b) r.seats.push({ number: i + 1, initial: b, insurance: 0, insured: null, insuranceGross: 0, hands: [{ id: `${r.id}:${i + 1}:1`, cards: [], stake: b, initial: b, extra: 0, split: false, splitAces: false, done: false, gross: 0 }] }); });
  debit(s, bets.reduce((a, b) => a + b, 0), 'initial');
  for (const p of r.seats) draw(r, p.hands[0], p.number); draw(r, null);
  for (const p of r.seats) draw(r, p.hands[0], p.number); draw(r, null, undefined, true);
  if (r.dealer[0].rank === 1) { r.phase = 'insurance'; r.active = null; }
  else if (value(r.dealer[0]) === 10) peek(s); else advance(s);
  return s;
}
export function available(s: Session): Record<'hit' | 'stand' | 'double' | 'split', string> {
  const r = s.round, p = r?.seats.find(x => x.hands.some(h => h.id === r.active)), h = p?.hands.find(h => h.id === r?.active);
  if (!r || r.phase !== 'play' || !p || !h) return { hit: 'Aguarde a sua vez', stand: 'Aguarde a sua vez', double: 'Aguarde a sua vez', split: 'Aguarde a sua vez' };
  return { hit: '', stand: '', double: h.cards.length !== 2 ? 'Apenas com duas cartas' : h.splitAces ? 'Áses divididos terminam automaticamente' : s.balance < h.stake ? 'Saldo insuficiente' : '', split: h.cards.length !== 2 || value(h.cards[0]) !== value(h.cards[1]) ? 'Exige duas cartas do mesmo valor' : h.splitAces ? 'Sem resplit de áses' : p.hands.length >= 4 ? 'Máximo de quatro mãos por lugar' : s.balance < h.stake ? 'Saldo insuficiente' : '' };
}
export function act(input: Session, cmd: Command): Session {
  const s = clone(input), r = s.round; assert(r && cmd.round === r.id && cmd.revision === r.revision, 'Comando atrasado ou duplicado');
  if (r.phase === 'insurance') {
    assert(['insure', 'decline', 'declineAll'].includes(cmd.action), 'Decida o seguro primeiro');
    const seats = cmd.action === 'declineAll' ? r.seats.filter(p => p.insured === null) : r.seats.filter(p => p.number === cmd.seat && p.insured === null);
    assert(seats.length > 0, 'Seguro já decidido');
    for (const p of seats) { p.insured = cmd.action === 'insure'; if (p.insured) { debit(s, p.initial / 2, `insurance:${p.number}`); p.insurance = p.initial / 2; } }
    if (r.seats.every(p => p.insured !== null)) peek(s);
  } else {
    assert(r.phase === 'play' && cmd.hand === r.active, 'Mão inativa');
    assert(['hit', 'stand', 'double', 'split'].includes(cmd.action), 'Ação inválida');
    const action = cmd.action as 'hit' | 'stand' | 'double' | 'split'; assert(!available(s)[action], available(s)[action]);
    const p = r.seats.find(p => p.hands.some(h => h.id === r.active))!, h = p.hands.find(h => h.id === r.active)!;
    if (action === 'stand') h.done = true;
    if (action === 'hit') draw(r, h, p.number);
    if (action === 'double') { debit(s, h.stake, `double:${h.id}`); h.extra += h.stake; h.stake *= 2; draw(r, h, p.number); h.done = true; }
    if (action === 'split') {
      debit(s, h.stake, `split:${r.revision}`); const second = h.cards.pop()!; const aces = h.cards[0].rank === 1;
      const other: Hand = { id: `${r.id}:${p.number}:${p.hands.length + 1}`, cards: [second], stake: h.stake, initial: 0, extra: h.stake, split: true, splitAces: aces, done: aces, gross: 0 };
      h.split = true; h.splitAces = aces; h.done = aces; p.hands.splice(p.hands.indexOf(h) + 1, 0, other);
      draw(r, h, p.number); draw(r, other, p.number);
    }
    advance(s);
  }
  r.revision++; return s;
}
export function acknowledge(input: Session) { const s = clone(input); assert(s.round?.phase === 'summary', 'A ronda ainda não terminou'); s.history.unshift(s.round); s.history = s.history.slice(0, 50); s.round = null; return s; }
/** Public projection deliberately omits hole card, shoe, and RNG until revealed. */
export function publicRound(s: Session) { if (!s.round) return null; const { shoe: _shoe, ...r } = clone(s.round); return { ...r, dealer: r.dealer.map((c, i) => i === 1 && !r.reveal ? null : c) }; }
