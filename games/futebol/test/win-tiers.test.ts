import test from 'node:test';
import assert from 'node:assert/strict';
import {winTierIndex,winTiers,winMilestones} from '../web/win-tiers.ts';
test('ganhos usam a aposta de referência e fronteiras exatas dos escalões',()=>{
 assert.equal(winTierIndex(19,20),-1);
 for(const [i,tier] of winTiers.entries()){assert.equal(winTierIndex(tier.x*20,20),i);assert.equal(winTierIndex(tier.x*20-1,20),i-1);}
 assert.equal(winTiers[winTierIndex(300,20)].name,'Golo de Placa!');
});
test('contador atravessa marcos uma vez, sem ultrapassar nem repetir prémio final',()=>{
 assert.deepEqual(winMilestones(18000,100),[1500,4000,10000,18000]);
 assert.deepEqual(winMilestones(1500,100),[1500]);
 assert.deepEqual(winMilestones(10000,100),[1500,4000,10000]);
 assert.deepEqual(winMilestones(1000000,100),[1500,4000,10000,25000,100000,1000000]);
});
