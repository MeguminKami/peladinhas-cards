import test from 'node:test';
import assert from 'node:assert/strict';
import {autoSpinCounts,autoSpinCount} from '../web/autospin.ts';
test('seletor automático usa os passos pedidos sem valores intermédios',()=>{
 assert.deepEqual(autoSpinCounts,[10,20,30,40,50,60,70,80,90,100,200,300,400,500]);
 for(let i=0;i<autoSpinCounts.length;i++)assert.equal(autoSpinCount(i),autoSpinCounts[i]);
 assert.equal(autoSpinCount(-1),10);assert.equal(autoSpinCount(20),500);
});
