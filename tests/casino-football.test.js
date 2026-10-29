import test from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../games/futebol/src/config.ts';
import {createSession,execute,setBet,acknowledgeRetrigger} from '../games/futebol/src/session.ts';
import {SLOT_RULES,newCasinoWallet,settleCasinoSlot,validateSlotTransaction} from '../js/casino-economy.js';
import {SLOT_TRANSACTION_VERSIONS} from '../js/casino-slot-contract.js';

test('slot 1.0.0 and wallet share version, bets and cap; queued receipts remain valid',()=>{
 assert.equal(config.version,'1.0.0');assert.equal(SLOT_RULES.version,config.version);
 assert.deepEqual(SLOT_RULES.bets,config.bets);assert.equal(SLOT_RULES.cap,config.cap);
 const tx={id:'operation-1234567890',streamId:'stream-123456789012',debit:20,credit:0,roundId:1,spin:1,bet:20,mode:'base',bonusHunt:false};
 for(const configVersion of SLOT_TRANSACTION_VERSIONS)assert.doesNotThrow(()=>validateSlotTransaction({...tx,configVersion}));
 for(const configVersion of ['0.7.2','0.9.5','2.0.0'])assert.throws(()=>validateSlotTransaction({...tx,configVersion}));
});

for(const bet of config.bets)for(const mode of ['base','hunt','normal','superior','legend'])test(`generated ${mode} round at bet ${bet} settles every spin in the wallet`,()=>{
 let session=setBet(createSession(`wallet-${mode}-${bet}`),bet);
 let wallet={...newCasinoWallet(),balance:10000000},round;
 session.balance=wallet.balance;
 const start={type:'start',mode:mode==='hunt'?'base':mode,bonusHunt:mode==='hunt'};
 let spins=0;
 do{
  if(session.pendingRetrigger)session=acknowledgeRetrigger(session,session.pendingRetrigger);
  const before=structuredClone(session),id=`operation-${mode}-${bet}-${++spins}`;
  session=execute(session,spins===1?start:{type:'next'},id,'date');
  const row=session.history[0],spin=row.spins.at(-1);
  const result=settleCasinoSlot(wallet,{id,streamId:'stream-123456789012',configVersion:session.configVersion,bet:row.bet,mode:row.mode,bonusHunt:row.bonusHunt===true,debit:spins===1?row.cost:0,credit:spin.paid,roundId:row.id,spin:row.spins.length},round);
  wallet=result.wallet;round=result.round;
  assert.equal(wallet.balance,session.balance);assert.equal(round.paid,row.paid);
  assert.equal(before.requestIds.includes(id),false);
  assert.ok(spins<1000,'round must finish');
 }while(session.active);
 assert.equal(session.history[0].complete,true);
 assert.ok(round.paid<=bet*config.cap);
});
