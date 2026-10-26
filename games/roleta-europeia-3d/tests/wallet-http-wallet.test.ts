import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHttpWallet} from '../shared/http-wallet';
import {WalletDeclinedError,type WalletOperation} from '../shared/session';
const op:WalletOperation={id:'stable-operation',debit:1500,credit:36000,entries:[{id:'debit',amount:-1500,label:'Apostas'},{id:'credit',amount:36000,label:'Retorno'}]};

test('HTTP wallet delegates unnamed amounts to the authenticated website and retries unchanged',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];const wallet=createHttpWallet({game:'roulette',balanceUrl:'/site/balance',settleUrl:'/site/settle',headers:()=>({'X-CSRF-Token':'website-token'}),fetch:async(url,init)=>{calls.push({url:String(url),init:init!});return Response.json({balance:12550});}});
  assert.equal(await wallet.getBalance(),12550);assert.deepEqual(await wallet.settle(op),{balance:12550});await wallet.settle(op);
  assert.equal(calls[0].url,'/site/balance');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.credentials,'same-origin');assert.equal(new Headers(calls[1].init.headers).get('Idempotency-Key'),op.id);assert.equal(new Headers(calls[1].init.headers).get('X-CSRF-Token'),'website-token');assert.deepEqual(JSON.parse(calls[1].init.body as string),{game:'roulette',operation:op});assert.equal(calls[1].init.body,calls[2].init.body);
});

test('only an explicit not-applied client rejection can discard a pending operation',async()=>{
  const wallet=(status:number,data:unknown)=>createHttpWallet({game:'blackjack',balanceUrl:'/balance',settleUrl:'/settle',fetch:async()=>Response.json(data,{status})});
  await assert.rejects(wallet(409,{applied:false,balance:200,error:'Saldo insuficiente'}).settle(op),e=>e instanceof WalletDeclinedError&&e.balance===200);
  for(const [status,data]of [[500,{applied:false,error:'Indisponível'}],[409,{error:'Consultar estado'}],[200,{balance:-1}],[200,{balance:1.5}]] as const)await assert.rejects(wallet(status,data).settle(op),e=>e instanceof Error&&!(e instanceof WalletDeclinedError));
});

test('HTTP timeout is ambiguous and never falls back to a local balance',async()=>{
  const wallet=createHttpWallet({game:'roulette',balanceUrl:'/balance',settleUrl:'/settle',timeoutMs:5,fetch:async(_url,init)=>new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new Error('aborted'))))});
  await assert.rejects(wallet.settle(op),/mesma operação/);await assert.rejects(wallet.getBalance(),/Timeout/);
});
