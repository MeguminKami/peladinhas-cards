// One edition reset, bounded to the explicitly approved collection reads.
// Without --live --repair --apply this cannot mutate production.
import {auditAuth} from './firestore-audit-cache.mjs';
import {firebaseConfig} from '../js/config.js';
import {CASINO_EDITION,newCasinoWallet} from '../js/casino-economy.js';
const apply=process.argv.includes('--apply');
if(apply&&(!process.argv.includes('--live')||!process.argv.includes('--repair')))
 throw Error('Aplicar exige --live --repair --apply e autorização explícita para as leituras.');
const account=auditAuth.getGlobalDefaultAccount();
if(!account)throw Error('Sem sessão Firebase disponível.');
const token=await auditAuth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes);
const base=`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
async function request(url,body){
 const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const value=await response.json();if(!response.ok)throw Error(value.error?.message||`HTTP ${response.status}`);return value;
}
async function collection(name,fields){
 const url=new URL(`${base}/${name}`);url.searchParams.set('pageSize','500');
 for(const field of fields)url.searchParams.append('mask.fieldPaths',field);
 const result=await request(url);
 if(result.nextPageToken)throw Error(`${name} excede os 500 documentos autorizados. Nenhuma página adicional será consultada.`);
 return result.documents||[];
}
function encode(value){
 if(value===null)return {nullValue:null};
 if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
 if(typeof value==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,v])=>[key,encode(v)]))}};
 if(typeof value==='number')return {integerValue:String(value)};
 if(typeof value==='boolean')return {booleanValue:value};
 return {stringValue:value};
}
const users=await collection('users',['disabled']);
const wallets=await collection('casinoWallets',['edition','balance']);
const byId=new Map(wallets.map(doc=>[doc.name.split('/').at(-1),doc]));
const ids=new Set([...users.map(doc=>doc.name.split('/').at(-1)),...byId.keys()]);
if(ids.size>500)throw Error('A união excede 500 carteiras; é necessária autorização para verificar mais documentos. Nenhuma escrita efetuada.');
const writes=[...ids].filter(uid=>byId.get(uid)?.fields?.edition?.stringValue!==CASINO_EDITION).map(uid=>{
 const prior=byId.get(uid);
 return {update:{name:`${base.replace('https://firestore.googleapis.com/v1/','')}/casinoWallets/${uid}`,fields:encode(newCasinoWallet()).mapValue.fields},currentDocument:prior?{updateTime:prior.updateTime}:{exists:false}};
});
console.log(JSON.stringify({edition:CASINO_EDITION,users:users.length,wallets:wallets.length,targetWallets:ids.size,toReset:writes.length,alreadyCurrent:ids.size-writes.length,apply}));
if(apply){
 // A concurrent change aborts the entire commit, never rolls back a new game.
 if(writes.length)await request(`${base}:commit`,{writes});
 const verified=await collection('casinoWallets',['edition','balance']);
 const missing=[...ids].filter(uid=>!verified.some(doc=>doc.name.split('/').at(-1)===uid&&doc.fields?.edition?.stringValue===CASINO_EDITION));
 if(missing.length)throw Error(`${missing.length} carteiras sem a edição esperada.`);
 console.log(JSON.stringify({verified:ids.size,initializedWithCoins:250,exactly250Now:verified.filter(doc=>doc.fields?.edition?.stringValue===CASINO_EDITION&&Number(doc.fields?.balance?.integerValue)===25000).length,at:new Date().toISOString()}));
}
