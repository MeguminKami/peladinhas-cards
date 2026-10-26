import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chipValues,CHIP_VALUES} from '../src/chips';
test('actual chip denominations equal every stake, insurance and return',()=>{for(let amount=0;amount<200000;amount+=13){const values=chipValues(amount);assert.equal(values.reduce((a,b)=>a+b,0),amount);assert(values.every(v=>CHIP_VALUES.includes(v)));}assert.equal(chipValues(50).reduce((a,b)=>a+b,0),50);});
