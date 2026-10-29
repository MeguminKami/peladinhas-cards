import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as EU from '../src/engine';
import {chatColor,settleRoulettePlan,validateRoulettePlan} from '../../../functions/roulette-table.js';

test('server accepts the exact client catalogue and matches every European payout',()=>{
  assert.equal(EU.BETS.length,157);
  for(const bet of EU.BETS){
    for(let number=0;number<=36;number++){
      const local=EU.settle({[bet.id]:20},number);
      const server=settleRoulettePlan({[bet.id]:20},number);
      assert.equal(server.number,local.number,bet.id);
      assert.equal(server.color,local.color,bet.id);
      assert.equal(server.cost,local.cost,bet.id);
      assert.equal(server.gross,local.gross,`${bet.id} · ${number}`);
      assert.equal(server.net,local.net,`${bet.id} · ${number}`);
      assert.deepEqual(server.lines,local.lines,`${bet.id} · ${number}`);
    }
  }
});

test('server validates stake limits and assigns distinct random active-player colors',()=>{
  assert.throws(()=>validateRoulettePlan({}));
  assert.throws(()=>validateRoulettePlan({'straight:99':20}));
  assert.throws(()=>validateRoulettePlan({'straight:1':21}));
  assert.throws(()=>validateRoulettePlan({'straight:1':500010}));
  const players:{uid:string;color:string}[]=[];
  for(let i=0;i<12;i++){
    const uid=`player-${i}`,color=chatColor(players,uid);
    assert(!players.some(player=>player.color===color));
    players.push({uid,color});
  }
});
