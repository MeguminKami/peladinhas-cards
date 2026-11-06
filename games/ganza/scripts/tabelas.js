import {TABLES,exact,MATH_VERSION} from '../src/engine.js';
console.log(MATH_VERSION);
for(const t of TABLES) console.log(`${t.rows} / ${t.risk}: ${t.values.join(' | ')} — RTP ${exact(t).toFixed(6)} %`);
