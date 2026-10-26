import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RNG} from '../shared/core';
import {BETS,BY_ID,settle,spin,fresh,reveal,acknowledge,type Plan} from '../src/engine';

// Independent payout table: gross includes the returned winning stake.
const grossMultipliers:Record<string,number>={straight:36,split:18,street:12,corner:9,six:6,dozen:3,column:3,outside:2};
function expected(plan:Plan,n:number){return Object.entries(plan).reduce((sum,[id,stake])=>sum+(BY_ID[id].numbers.includes(n)?stake*grossMultipliers[BY_ID[id].kind]:0),0);}
function check(plan:Plan,n:number){const r=settle(plan,n),cost=Object.values(plan).reduce((a,b)=>a+b,0),gross=expected(plan,n);assert.equal(r.cost,cost);assert.equal(r.gross,gross);assert.equal(r.net,gross-cost);assert.equal(r.lines.length,Object.keys(plan).length);for(const line of r.lines)assert.equal(line.gross,BY_ID[line.id].numbers.includes(n)?plan[line.id]*grossMultipliers[BY_ID[line.id].kind]:0);return r;}

test('single numbers, all 666 pairs, triples and full-table plans: 27417 exact settlements',()=>{
  let cases=0;const stakes=[20,50,100,500,5000,50000];
  const checkAll=(plan:Plan)=>{let sum=0;for(let n=0;n<37;n++){sum+=check(plan,n).gross;cases++;}assert.equal(sum,36*Object.values(plan).reduce((a,b)=>a+b,0));};
  for(let a=0;a<37;a++)checkAll({['straight:'+a]:stakes[a%stakes.length]});
  for(let a=0;a<37;a++)for(let b=a+1;b<37;b++)checkAll({['straight:'+a]:stakes[a%stakes.length],['straight:'+b]:stakes[b%stakes.length]});
  for(let a=0;a<37;a++)checkAll({['straight:'+a]:50,['straight:'+((a+1)%37)]:100,['straight:'+((a+2)%37)]:500});
  checkAll(Object.fromEntries(Array.from({length:37},(_,n)=>['straight:'+n,50])));
  assert.equal(cases,27417);
  const all=check(Object.fromEntries(Array.from({length:37},(_,n)=>['straight:'+n,50])),0);assert.equal(all.cost,1850);assert.equal(all.gross,1800);assert.equal(all.net,-50);
});

test('all 157 bet types with overlapping plenos pay independently across 5809 mixed settlements',()=>{
  for(const [i,b]of BETS.entries()){
    const plan:Plan={[b.id]:50,['straight:'+((i*7)%37)]:100,['straight:'+((i*11+1)%37)]:500};
    for(let n=0;n<37;n++)check(plan,n);
  }
  assert.equal(check({'straight:17':5000,'straight:20':5000,'straight:21':5000},17).gross,180000);
});

test('wallet debits every placed stake once and credits only actual winners, including zero',()=>{
  const plans:Plan[]=[{'straight:17':5000},{'straight:17':5000,'straight:20':5000,'straight:21':5000},Object.fromEntries(BETS.filter(b=>b.kind==='outside').map(b=>[b.id,100])),{'straight:0':50,'split:0-1':100,'corner:0-1-2-3':500}];
  for(const plan of plans)for(const target of [0,1,17,36]){
    let seed:number[]|undefined;for(let i=1;i<10000;i++){const candidate=[1,i,3,4];if(new RNG(candidate).int(37)===target){seed=candidate;break;}}assert(seed);
    const before=fresh(new RNG(seed)),s=spin(before,plan),r=check(plan,target);assert.equal(s.round!.number,target);assert.equal(s.balance,before.balance-r.cost+r.gross);assert.equal(s.ledger.filter(l=>l.amount<0).length,1);assert.equal(s.ledger.filter(l=>l.amount>0).length,r.gross?1:0);
    const restored=JSON.parse(JSON.stringify(s)),done=acknowledge(reveal(restored,0));assert.equal(done.balance,s.balance);assert.deepEqual(done.ledger,s.ledger);assert.equal(done.history.length,1);assert.throws(()=>acknowledge(done));
  }
});
