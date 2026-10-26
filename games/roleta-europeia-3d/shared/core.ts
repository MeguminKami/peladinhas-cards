export const money = (n: number) => (n / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function integer(n: number) { return Number.isSafeInteger(n); }
/** xoshiro128**; state is saved, never reset at round boundaries. */
export class RNG {
  state: number[];
  constructor(state?: number[]) {
    this.state = state ? [...state] : Array.from(crypto.getRandomValues(new Uint32Array(4)));
    assert(this.state.length === 4 && this.state.every(n=>integer(n)&&n>=0&&n<=0xffffffff) && this.state.some(Boolean), 'Estado RNG inválido');
  }
  next(): number {
    const s = this.state; const rot = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;
    const result = Math.imul(rot(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rot(s[3], 11);
    this.state = s.map(x => x >>> 0); return result;
  }
  int(n: number): number {
    assert(integer(n) && n > 0 && n <= 0x100000000, 'Intervalo RNG inválido');
    const limit = Math.floor(0x100000000 / n) * n; let x: number;
    do { x = this.next(); } while (x >= limit); return x % n;
  }
  shuffle<T>(items: T[]): T[] { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}
export interface Entry { id: string; amount: number; balance: number; label: string }
export interface Book { balance: number; ledger: Entry[] }
export function post(book: Book, id: string, amount: number, label: string) {
  assert(integer(amount), 'Montante não inteiro'); const prior = book.ledger.find(x => x.id === id);
  if (prior) { assert(prior.amount === amount, 'Operação repetida com montante diferente'); return; }
  assert(book.balance + amount >= 0 && integer(book.balance + amount), 'Saldo insuficiente');
  book.balance += amount; book.ledger.push({ id, amount, balance: book.balance, label });
}
export function save(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
export function read<T>(key: string): T | null { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; }
export function clone<T>(state: T): T { return structuredClone(state); }
