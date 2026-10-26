import {mountSlot} from './host-sdk.ts';
// Demonstration only. A production host should implement these operations on its service.
const key='football-host-demo-wallet',balance=document.querySelector('#host-balance')!;
interface Wallet {balance:number;transactions:Record<string,{debit:number;credit:number;balance:number}>}
function read():Wallet{return JSON.parse(localStorage.getItem(key)??'{"balance":100000,"transactions":{}}');}
function display(){balance.textContent=(read().balance/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});}
display();
const slot=mountSlot(document.querySelector<HTMLElement>('#slot-container')!,{
 src:new URL('./embed.html',document.baseURI).href,playerId:'demo-player',
 getBalance:async()=>read().balance,
 settle:async tx=>navigator.locks.request(key,()=>{
  const wallet=read(),previous=wallet.transactions[tx.id];
  if(previous){if(previous.debit!==tx.debit||previous.credit!==tx.credit)throw Error('Identificador repetido com valores diferentes');return {balance:wallet.balance};}
  if(wallet.balance<tx.debit){const error=new Error('Saldo insuficiente no website');Object.assign(error,{definitive:true});throw error;}
  wallet.balance+=tx.credit-tx.debit;wallet.transactions[tx.id]={debit:tx.debit,credit:tx.credit,balance:wallet.balance};localStorage.setItem(key,JSON.stringify(wallet));display();return {balance:wallet.balance};
 }),
});
document.querySelector<HTMLButtonElement>('#host-topup')!.onclick=()=>void navigator.locks.request(key,async()=>{const wallet=read();wallet.balance+=100000;localStorage.setItem(key,JSON.stringify(wallet));display();await slot.refreshBalance();});
window.addEventListener('storage',event=>{if(event.key===key)display();});
