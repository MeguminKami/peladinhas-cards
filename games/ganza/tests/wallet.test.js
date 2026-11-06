import {test} from 'node:test';import assert from 'node:assert/strict';
import {applyLocalGanza,commitment} from '../../../js/casino-ganza-local.js';
import {playRound} from '../src/engine.js';
test('mais de dez bolas, débito, recuperação, compromisso e pagamento',async()=>{
 let r=await applyLocalGanza(null,10000,{action:'connect'}),s=r.session,b=r.balance;const request={sessionId:s.sessionId,rows:16,risk:'alto',bet:100};
 for(let i=0;i<25;i++){r=await applyLocalGanza(s,b,{action:'start',payload:request});s=r.session;b=r.balance;assert.equal(r.debit,100);assert.equal(r.credit,0);assert.equal(r.result.round.seed,undefined);}
 assert.equal(b,7500);
 const recovered=await applyLocalGanza(JSON.parse(JSON.stringify(s)),b,{action:'connect'});assert.equal(recovered.result.pending.length,25);assert.equal(recovered.result.pending[0].seed,undefined);
 const id=recovered.result.pending[0].id,expected=s.rounds[id];r=await applyLocalGanza(s,b,{action:'settle',payload:{sessionId:s.sessionId,roundId:id}});
 assert.equal(r.balance,b+expected.payment);assert.equal(r.result.round.hash,await commitment(r.result.round.seed));assert.deepEqual(playRound(r.result.round.seed,expected).path,expected.path);
 await assert.rejects(()=>applyLocalGanza(r.session,r.balance,{action:'settle',payload:{sessionId:s.sessionId,roundId:id}}));
});
test('rejeita saldo, aposta, sessão e pedidos inválidos sem mutação',async()=>{
 const {session}=await applyLocalGanza(null,10,{action:'connect'}),before=structuredClone(session);
 for(const payload of [{sessionId:session.sessionId,bet:11},{sessionId:'errada',bet:1},{sessionId:session.sessionId,bet:1.1},{sessionId:session.sessionId,bet:137},{sessionId:session.sessionId,bet:1,rows:9}])await assert.rejects(()=>applyLocalGanza(session,10,{action:'start',payload}));
 assert.deepEqual(session,before);await assert.rejects(()=>applyLocalGanza(session,-1,{action:'connect'}));
});
