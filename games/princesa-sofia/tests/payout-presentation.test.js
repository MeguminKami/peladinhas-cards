import test from 'node:test';
import assert from 'node:assert/strict';
import { hitCredits, prizeTier, prizeStyle } from '../ui/payout-presentation.js';

test('displayed group receipts sum to the actual cumulative rounded credit',()=>{
  const hits=[{rawPay100:26},{rawPay100:26},{rawPay100:26}];
  const receipts=hitCredits(hits,78,26,20);
  assert.deepEqual(receipts.map(r=>r.receivedUnits),[5,5,5]);
  assert.equal(receipts.reduce((sum,r)=>sum+r.receivedUnits,0),Math.floor(104*20/100)-Math.floor(26*20/100));
  assert.deepEqual(hitCredits([{rawPay100:3},{rawPay100:3}],6,3,20).map(r=>r.receivedUnits),[1,0]);
});
test('MAX WIN display never presents the unpaid part of groups',()=>{
  const hits=[{rawPay100:80},{rawPay100:100},{rawPay100:200}];
  assert.deepEqual(hitCredits(hits,105,999895,100),[
    {amount100:80,receivedUnits:80},{amount100:25,receivedUnits:25},{amount100:0,receivedUnits:0},
  ]);
});
test('prize scale names base pay × multiplier steps up to 200×',()=>{
  assert.equal(prizeTier(0.5),'small');
  assert.equal(prizeTier(1),'medium');
  assert.equal(prizeTier(4.99),'medium');
  assert.equal(prizeTier(5),'large');
  assert.equal(prizeTier(19.99),'large');
  assert.equal(prizeTier(20),'epic');
  assert.equal(prizeTier(50),'mega');
  assert.equal(prizeTier(100),'huge');
  assert.equal(prizeTier(200),'colossal');
  assert.equal(prizeTier(10000),'colossal');
});
test('past 200× the number keeps growing and the colour keeps shifting',()=>{
  assert.equal(prizeStyle(200),null);
  const at201=prizeStyle(201),at400=prizeStyle(400),at800=prizeStyle(800),at10000=prizeStyle(10000);
  assert.ok(parseFloat(at201.fontSize)>68);
  assert.ok(parseFloat(at400.fontSize)>parseFloat(at201.fontSize));
  assert.ok(parseFloat(at800.fontSize)>parseFloat(at400.fontSize));
  assert.notEqual(at400.color,at800.color);
  assert.ok(parseFloat(at10000.fontSize)<=96,'size stays inside the board');
  assert.notEqual(at800.color,at10000.color,'colour never stops shifting');
});
