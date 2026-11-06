import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseEntry } from '../ui/acid-symbols.js';

test('entrada comprada: quantidade exata, cantos fechados, variedade e repetibilidade sem RNG do motor', () => {
  for (const [bonus,count] of [['afterparty',3],['vip',4],['police',5]]) {
    const patterns=new Set();
    for(let i=0;i<100;i++){
      const entry=purchaseEntry('round-'+i,bonus,count);
      assert.deepEqual(entry,purchaseEntry('round-'+i,bonus,count));
      assert.equal(entry.grid.filter(s=>s==='S').length,count);
      assert.equal(new Set(entry.scatterCells).size,count);
      for(const c of [0,4,20,24])assert.equal(entry.grid[c],'X');
      for(const c of entry.scatterCells)assert.equal(entry.grid[c],'S');
      assert.ok(entry.stops.every((ms,col)=>!col||ms>entry.stops[col-1]));
      patterns.add([...entry.scatterCells].sort((a,b)=>a-b).join(','));
    }
    assert.ok(patterns.size>90,'posições variadas entre compras');
  }
  for(const n of [0,2,6,NaN,3.5])assert.throws(()=>purchaseEntry('r','police',n));
});
