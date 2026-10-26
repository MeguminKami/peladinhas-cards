import { RNG, assert, integer, clone, post, type Book } from '../shared/core';
export const VERSION = 'EU-37-NO-PARTAGE-1';
export const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
export const color = (n: number) => n === 0 ? 'green' : RED.includes(n) ? 'red' : 'black';
export interface Bet { id: string; kind: string; label: string; numbers: number[]; multiplier: number }
export type Plan = Record<string, number>;
export const MIN = 20, STEP = 10, MAX_BET = 100000, MAX_TOTAL = 500000;
export const LIMITS_VERSION = 'EU-STAKES-10-2';
export function catalog(): Bet[] {
  const out: Bet[] = [];
  const add = (kind: string, label: string, numbers: number[]) => { numbers.sort((a,b) => a-b); const id = `${kind}:${numbers.join('-')}`; out.push({ id, kind, label, numbers, multiplier: 36 / numbers.length }); };
  for (let n = 0; n <= 36; n++) add('straight', `${n}`, [n]);
  for (let n = 1; n <= 36; n++) { if (n % 3 !== 0) add('split', `Cavalo ${n}/${n+1}`, [n,n+1]); if (n <= 33) add('split', `Cavalo ${n}/${n+3}`, [n,n+3]); }
  for (let n = 1; n <= 3; n++) add('split', `Cavalo 0/${n}`, [0,n]);
  add('street', 'Trio 0/1/2', [0,1,2]); add('street', 'Trio 0/2/3', [0,2,3]); add('corner', 'Primeiros quatro', [0,1,2,3]);
  for (let n = 1; n <= 34; n += 3) { add('street', `Rua ${n}–${n+2}`, [n,n+1,n+2]); if (n < 34) { add('six', `Seisena ${n}–${n+5}`, [n,n+1,n+2,n+3,n+4,n+5]); for (let c = 0; c < 2; c++) add('corner', `Quadro ${n+c}/${n+c+1}/${n+c+3}/${n+c+4}`, [n+c,n+c+1,n+c+3,n+c+4]); } }
  for (let i = 0; i < 3; i++) { add('dozen', `${i+1}.ª dúzia`, Array.from({length:12},(_,j)=>i*12+j+1)); add('column', `${i+1}.ª coluna`, Array.from({length:12},(_,j)=>j*3+i+1)); }
  add('outside','Vermelho',RED.slice()); add('outside','Preto',Array.from({length:36},(_,i)=>i+1).filter(n=>!RED.includes(n)));
  add('outside','Par',Array.from({length:18},(_,i)=>(i+1)*2)); add('outside','Ímpar',Array.from({length:18},(_,i)=>i*2+1));
  add('outside','1–18',Array.from({length:18},(_,i)=>i+1)); add('outside','19–36',Array.from({length:18},(_,i)=>i+19)); return out;
}
export const BETS = catalog(); export const BY_ID = Object.fromEntries(BETS.map(b=>[b.id,b]));
export const cost = (p: Plan) => Object.values(p).reduce((a,b)=>a+b,0);
export function validate(plan: Plan, balance: number) {
  assert(Object.keys(plan).length > 0, 'Coloque pelo menos uma aposta');
  for (const [id,n] of Object.entries(plan)) assert(BY_ID[id] && integer(n) && n >= MIN && n <= MAX_BET && n % STEP === 0, 'Aposta inválida: mínimo 0,20, passo 0,10 e máximo 1 000,00 por aposta');
  assert(cost(plan) <= MAX_TOTAL, 'Exposição máxima: 5 000,00'); assert(cost(plan) <= balance, 'Saldo insuficiente');
}
export function settle(plan: Plan, number: number) {
  assert(integer(number) && number >= 0 && number <= 36,'Número inválido'); validate(plan, Number.MAX_SAFE_INTEGER);
  const lines = Object.entries(plan).map(([id,stake])=>({id,stake,won:BY_ID[id].numbers.includes(number),gross:BY_ID[id].numbers.includes(number)?stake*BY_ID[id].multiplier:0}));
  const gross=lines.reduce((a,b)=>a+b.gross,0); return {number,color:color(number),cost:cost(plan),gross,net:gross-cost(plan),lines};
}
export interface Round extends ReturnType<typeof settle> { id: number; plan: Plan; phase: 'spinning' | 'result'; rotor: number }
export interface Session extends Book { version: string; rng: number[]; counter: number; round: Round | null; history: Round[]; last: Plan; rotor: number }
export function fresh(rng=new RNG()):Session { return {version:VERSION,balance:100000,ledger:[],rng:[...rng.state],counter:0,round:null,history:[],last:{},rotor:0}; }
export function spin(input:Session,plan:Plan):Session {
  const s=clone(input); assert(s.version===VERSION,'Versão incompatível'); assert(!s.round,'Confirme primeiro o resultado'); validate(plan,s.balance);
  const rng=new RNG(s.rng),number=rng.int(37); s.rng=[...rng.state]; s.counter++;
  const result=settle(plan,number); s.round={...result,id:s.counter,plan:clone(plan),phase:'spinning',rotor:s.rotor+Math.PI*2*2.4};
  post(s,`${s.counter}:debit`,-result.cost,'Apostas'); post(s,`${s.counter}:credit`,result.gross,'Retorno'); s.last=clone(plan); return s;
}
export function reveal(input:Session,rotor:number):Session { const s=clone(input); assert(s.round,'Sem ronda'); s.rotor=rotor; s.round.rotor=rotor; s.round.phase='result'; return s; }
export function acknowledge(input:Session):Session { const s=clone(input); assert(s.round?.phase==='result','Aguarde o resultado'); s.history.unshift(s.round); s.history=s.history.slice(0,100); s.round=null; return s; }
export function neighbours(n:number,count:number) { assert(ORDER.includes(n)&&integer(count)&&count>=0&&count<=4,'Vizinhos inválidos'); const at=ORDER.indexOf(n); return Array.from({length:count*2+1},(_,i)=>ORDER[(at+i-count+37)%37]); }
export const TAU=Math.PI*2;
export const pocketAngle=(n:number)=>{assert(ORDER.includes(n),'Bolso inválido');return ORDER.indexOf(n)*TAU/37;};
export const worldAngle=(n:number,rotor:number)=>pocketAngle(n)+rotor;
export const numberAt=(angle:number,rotor:number)=>ORDER[((Math.round((angle-rotor)/TAU*37)%37)+37)%37];
