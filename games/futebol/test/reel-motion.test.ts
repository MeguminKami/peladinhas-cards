import test from 'node:test';
import assert from 'node:assert/strict';
import {landingPlan} from '../web/reel-motion.ts';
test('paragem conserva a velocidade inicial e desacelera sem acelerar para acertar',()=>{
 for(const cycle of [55,95,145])for(const suspense of [false,true])for(let k=0;k<100;k++){
  const step=90,phase=-(k/100)*5*step,p=landingPlan(phase,step,cycle,100,100,suspense),order=suspense?3:2;
  assert.ok(Math.abs(order*p.distance/p.duration-step/cycle)<1e-8);
  let previous=step/cycle;
  for(let i=1;i<=100;i++){const velocity=order*p.distance/p.duration*Math.pow(1-i/100,order-1);assert.ok(velocity<=previous+1e-9);assert.ok(velocity>=0);previous=velocity;}
  assert.equal(previous,0);
 }
});
test('rebasing mantém os símbolos visíveis na mesma posição e finais acabam ordenados',()=>{
 let previousEnd=0;
 for(let col=0;col<6;col++){
  const phase=-33-col*66,step=80,now=col*105,p=landingPlan(phase,step,145,now,previousEnd+105,false);
  const oldVisibleY=phase+p.trim*step,newVisibleY=p.start+(4+p.padding)*step;
  assert.ok(Math.abs(oldVisibleY-newVisibleY)<1e-8);assert.ok(now+p.duration>=previousEnd+105-1e-8);previousEnd=now+p.duration;
 }
});
