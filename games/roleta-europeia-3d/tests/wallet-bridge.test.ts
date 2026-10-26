import {test} from 'node:test';
import assert from 'node:assert/strict';
import {iframeWallet} from '../shared/bridge';
import {WalletDeclinedError} from '../shared/session';

test('iframe wallet accepts only its exact host origin/source and preserves explicit rejections',async()=>{
  const listeners=new Set<(event:any)=>void>(),sent:any[]=[];
  const host={postMessage(message:any,origin:string){sent.push({message,origin});}};
  (globalThis as any).window={addEventListener(_name:string,fn:any){listeners.add(fn);},removeEventListener(_name:string,fn:any){listeners.delete(fn);},setTimeout};
  const send=(data:any,origin='https://main.example',source:any=host)=>listeners.forEach(fn=>fn({origin,source,data}));
  const wallet=iframeWallet('https://main.example',host as unknown as Window);
  try{
    let done=false;const balance=wallet.getBalance().then(value=>{done=true;return value;});const request=sent[0].message;assert.equal(sent[0].origin,'https://main.example');
    send({...request,ok:true,balance:999999},'https://other.example');send({...request,ok:true,balance:999999},'https://main.example',{});await Promise.resolve();assert.equal(done,false);
    send({...request,ok:true,balance:12550});assert.equal(await balance,12550);
    const rejected=wallet.settle({id:'operation',debit:20,credit:0,entries:[{id:'debit',amount:-20,label:'Aposta'}]});send({...sent[1].message,ok:false,applied:false,balance:0,error:'Saldo insuficiente'});await assert.rejects(rejected,e=>e instanceof WalletDeclinedError&&e.balance===0);
  }finally{wallet.destroy();assert.equal(listeners.size,0);}
});
