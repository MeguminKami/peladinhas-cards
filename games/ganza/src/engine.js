import { TABLES, MATH_VERSION } from '../tabelas/index.js';
import { TABLES as LEGACY_TABLES } from '../tabelas/v1.js';
export { TABLES, MATH_VERSION };
export function choose(n,k) { let c=1; for(let i=1;i<=k;i++) c=c*(n-i+1)/i; return c; }
export function exact(table) { return table.values.reduce((s,v,k)=>s+choose(table.rows,k)*v,0)/(2**table.rows); }
export function random(seed) {
  if(typeof seed!=='string'||!seed.length||seed.length>256) throw Error('Seed inválida');
  let x=2166136261;
  for(const c of seed) { x^=c.charCodeAt(0); x=Math.imul(x,16777619); }
  return ()=>{ x=(x+0x6D2B79F5)|0; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return (t^(t>>>14))>>>0; };
}
export function playRound(seed,{rows=16,risk='extremo',bet=100,version=MATH_VERSION}={}) {
  if(![MATH_VERSION,'ganza-v1'].includes(version))throw Error('Versão desconhecida');
  const table=(version==='ganza-v1'?LEGACY_TABLES:TABLES).find(t=>t.rows===rows&&t.risk===risk);
  if(!table||!Number.isSafeInteger(bet)||bet<1||bet>1000000) throw Error('Pedido inválido');
  const rng=random(seed), path=Array.from({length:rows},()=>rng()>>>31);
  const k=path.reduce((a,b)=>a+b,0), multiplier=table.values[k];
  return {version,seed,rows,risk,bet,path,k,multiplier,payment:Math.floor(bet*multiplier/100)};
}
