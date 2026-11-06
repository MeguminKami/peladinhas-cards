import test from 'node:test';
import assert from 'node:assert/strict';
import { completeFeedback, calculateGameAggregate, FEEDBACK } from '../js/utils.js';
import { validMethod, scoreText, methodControls } from '../js/rating-methods.js';
test('rating methods preserve the internal fractional score and aggregate', () => {
 const ratings=Object.fromEntries(FEEDBACK.map(([key])=>[key,2.5]));
 assert.equal(completeFeedback(ratings),true);
 const result=calculateGameAggregate([{raterId:'a',targetId:'b',submitted:true,ratings},{raterId:'b',targetId:'b',submitted:true,ratings:{...ratings,overall:3.5,goalkeeping:null}}]);
 assert.equal(result.overall,3);assert.equal(result.attack,2.5);assert.equal(result.goalkeeping,null);
 for(const invalid of [-.5,5.5,NaN,Infinity,'2.5']) assert.equal(completeFeedback({...ratings,overall:invalid}),false);
 assert.equal(scoreText('2.5','values'),'5/10');
 for(const method of ['stars','half','values','words']) {
 assert.equal(validMethod(method),true);assert.ok(!scoreText('2.5',method).includes('undefined'));
 assert.match(methodControls(method,'na','goalkeeping'),/value="na"/);
 }
 assert.equal(validMethod('invalid'),false);
});
