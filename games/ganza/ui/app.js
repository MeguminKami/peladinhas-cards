import {toUnits,formatDjc} from './money.js';
import {TABLES,choose,playRound} from '../src/engine.js';
import {request,isHost} from './session.js';
import {Scene,color} from './scene-falesia.js';
import {AudioBus} from './audio.js';
import {environmentAudio} from './environment-audio.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),localOrigin=['localhost','127.0.0.1'].includes(location.hostname);
// Demonstrations are only available in standalone loopback previews.
const demo=!isHost&&localOrigin&&params.has('demo');
let sessionId,balance=0,busy=false,settling=0,failed=false,proof=null,history=[],auto=null;
const commitments=new Map();
const audio=new AudioBus();
const scene=new Scene($('scene'),land,(x,row)=>audio.play('pin',x,row));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');$('reduced').checked=reduced.matches;scene.reduced=reduced.matches;
reduced.addEventListener('change',e=>{scene.reduced=e.matches;$('reduced').checked=e.matches;});
const format=formatDjc;
function setBalance(n){balance=n;document.documentElement.dataset.casinoBalance=String(n);}
function status(text,error=false){if(failed&&!error)return;$('status').textContent=text;$('status').classList.toggle('is-alert',error);}
function config(){return {rows:Number($('rows').value),risk:$('risk').value,bet:toUnits($('bet').value)};}
function controls(){const active=scene.plates.length>0||settling>0||busy||!!auto;for(const id of ['rows','risk'])$(id).disabled=active;for(const button of document.querySelectorAll('button[data-rows],button[data-risk]')){button.disabled=active;const key=button.dataset.rows?'rows':'risk';button.setAttribute('aria-pressed',String(button.dataset[key]===$(key).value));}$('drop').disabled=busy||failed||!!auto||demo;$('air').textContent=`${scene.plates.length} NO AR`;$('airCount').textContent=String(scene.plates.length);$('auto').textContent=auto?`PARAR · ${auto.remaining}`:'↻ AUTO';}
function boats(){const t=TABLES.find(t=>t.rows===Number($('rows').value)&&t.risk===$('risk').value);scene.rows=t.rows;scene.maxMultiplier=Math.max(...t.values);scene.risk=t.risk;scene.geometry=null;scene.labelKey=null;document.body.dataset.environment=t.risk;$('boats').replaceChildren(...t.values.map((m,k)=>{const b=document.createElement('button');b.className='boat';b.dataset.multiplier=String(m);b.style.setProperty('--boat',color(m));const probability=(choose(t.rows,k)/2**t.rows*100).toLocaleString('pt-PT',{maximumFractionDigits:5}),exact=(m/100).toLocaleString('pt-PT',{maximumFractionDigits:2}),compact=m>=10000?String(Math.round(m/100)):(m/100).toLocaleString('pt-PT',{maximumFractionDigits:2});b.innerHTML=`<b>${compact}×</b>`;b.setAttribute('aria-label',`Lancha ${k+1}, ${exact} vezes, probabilidade ${probability}%`);b.onclick=()=>{$('oddsDialog').showModal();};return b;}));$('oddsBody').replaceChildren(...t.values.map((m,k)=>{const row=document.createElement('tr');for(const value of [k+1,`${(m/100).toLocaleString('pt-PT',{maximumFractionDigits:2})}×`,`${(choose(t.rows,k)/2**t.rows*100).toLocaleString('pt-PT',{maximumFractionDigits:5})}%`]){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}return row;}));controls();}
function showProof(r){if(!r.seed&&r.hash){commitments.set(r.id,r.hash);if(commitments.size>100)commitments.delete(commitments.keys().next().value);}if(r.seed&&commitments.has(r.id))r={...r,hash:commitments.get(r.id)};proof=r;$('proof').textContent=JSON.stringify(r,null,2);$('proofResult').textContent='';}
async function drop(fromAuto=false){
 if(auto&&!fromAuto)return;
 if(busy||failed||demo)return;
 if(!Number.isSafeInteger(config().bet)||config().bet<100||config().bet%100!==0||config().bet>1000000){status('Escolhe uma aposta inteira entre 1 e 10 000 DJC.',true);auto=null;return;}
 busy=true;controls();
 try{await audio.unlock();}catch{}
 try{const r=await request('start',{sessionId,...config()});setBalance(r.balance);showProof({hash:r.round.hash,id:r.round.id,version:r.round.version});scene.add(r.round);audio.play('wrap',.2);setTimeout(()=>audio.play('throw',.3),240);status('Compromisso publicado. A bola está a cair.');}
 catch(e){failed=true;auto=null;status(e.message+' Abre Definições e Recuperar carteira.',true);}
 finally{busy=false;controls();}
}
async function land(p){
 if(p.demo){scene.celebrate(p);audio.result(p.multiplier,p.k/p.rows);controls();return;}
 settling++;controls();
 try{
  const r=await request('settle',{sessionId,roundId:p.id},`${p.id}-settle`);setBalance(r.balance);showProof(r.round);history.unshift(r.round);history=history.slice(0,20);
  $('history').replaceChildren(...history.map(r=>{const li=document.createElement('li');li.style.setProperty('--boat',color(r.multiplier));li.textContent=`${(r.multiplier/100).toLocaleString('pt-PT')}×`;li.title=`${format(r.payment)} DJC`;li.setAttribute('aria-label',`${r===history[0]?'\u00daltima jogada, ':''}${li.textContent}, ${li.title}`);return li;}));
  $('history').scrollLeft=0;
  scene.celebrate(r.round);audio.result(r.round.multiplier,r.round.k/r.round.rows);status(`${format(r.round.payment)} DJC · ${(r.round.multiplier/100).toLocaleString('pt-PT')}×`);
  if(auto){auto.remaining--;const net=balance-auto.start;if(auto.remaining<=0||net>=auto.win||net<=-auto.loss||balance<config().bet){auto=null;}else {const run=auto;setTimeout(()=>{if(auto===run)void drop(true);},Math.max(800,scene.result?.duration||800));}}
 }catch(e){failed=true;auto=null;status(e.message+' Recupera a carteira para concluir.',true);}finally{settling--;controls();}
}
async function recover(){
 busy=true;controls();try{const r=await request('connect');sessionId=r.sessionId;setBalance(r.balance);scene.plates=[];auto=null;failed=false;
  if(r.pending?.length){$('rows').value=String(r.pending[0].rows);$('risk').value=r.pending[0].risk;boats();for(const p of r.pending){commitments.set(p.id,p.hash);scene.add(p);}status('A retomar as bolas guardadas.');}
  else status(isHost?'Carteira do casino pronta.':'Créditos de teste guardados neste navegador.');failed=false;
 }catch(e){failed=true;status(e.message,true);}finally{busy=false;controls();}
}
for(const id of ['rows','risk'])$(id).onchange=()=>{boats();};
for(const button of document.querySelectorAll('button[data-rows],button[data-risk]'))button.onclick=()=>{const id=button.dataset.rows?'rows':'risk';if($(id).disabled||$(id).value===button.dataset[id])return;$(id).value=button.dataset[id];$(id).dispatchEvent(new Event('change'));audio.play('ui');};
for(const [id,fn] of [['half',n=>Math.floor(n/200)*100],['minus',n=>n-100],['plus',n=>n+100],['double',n=>n*2]])$(id).onclick=()=>{$('bet').value=(Math.max(100,Math.min(1000000,fn(toUnits($('bet').value)||100)))/100).toFixed(2);audio.play('ui');};
$('drop').onclick=()=>void drop();
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!document.querySelector('dialog[open]')&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();void drop();}});
for(const [button,dialog] of [['settings','settingsDialog'],['verify','verifyDialog']])$(button).onclick=()=>$(dialog).showModal();
$('auto').onclick=()=>{if(auto){auto=null;controls();}else if(!busy&&!failed&&!scene.plates.length&&!demo)$('autoDialog').showModal();};
$('startAuto').onclick=()=>{const win=toUnits($('stopWin').value),loss=toUnits($('stopLoss').value);if(![win,loss].every(n=>Number.isSafeInteger(n)&&n>0))return;auto={remaining:Number($('autoCount').value),win,loss,start:balance};$('autoDialog').close();void drop(true);};
$('reduced').onchange=()=>scene.reduced=$('reduced').checked;
$('mute').onchange=()=>{audio.muted=$('mute').checked;audio.update();};
for(const [id,key]of [['musicVolume','music'],['sfxVolume','sfx'],['ambienceVolume','ambience']])$(id).oninput=()=>{audio.volumes[key]=Number($(id).value);audio.update();};
$('recover').onclick=()=>{void recover();$('settingsDialog').close();};
$('skip').onclick=()=>scene.skip();
$('checkProof').onclick=async()=>{if(!proof?.seed){$('proofResult').textContent='A seed só é revelada depois da queda.';return;}const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proof.seed))),n=>n.toString(16).padStart(2,'0')).join('');const r=playRound(proof.seed,proof);$('proofResult').textContent=hash===proof.hash&&r.k===proof.k&&r.payment===proof.payment&&JSON.stringify(r.path)===JSON.stringify(proof.path)?'Seed, percurso e pagamento conferem.':'A verificação falhou.';};
function demoRound(mode,k){const rows=16,t=TABLES.find(t=>t.rows===16&&t.risk==='extremo'),target=Math.max(0,Math.min(16,Number.isInteger(k)?k:mode==='lancha'?2:0)),path=[...Array(target).fill(1),...Array(rows-target).fill(0)];
 // Explicit presentation fixture, never passed to a wallet or engine settlement.
 return {id:crypto.randomUUID(),rows,risk:'extremo',path,k:target,bet:0,payment:0,multiplier:mode==='carga'?999900:mode==='max'?10000:t.values[target]};}
async function boot(){
 try{await Promise.all([scene.load(),document.fonts.ready]);boats();scene.start();$('loading').hidden=true;
  if(demo){$('demoLabel').hidden=false;sessionId='demo';const mode=params.get('demo');const r=demoRound(mode,params.has('k')?Number(params.get('k')):undefined);scene.add(r,true);if(mode==='chuva')for(let i=1;i<10;i++)scene.add(demoRound('lancha',i),true);controls();}
  else await recover();
 }catch(e){$('loading').textContent='Não foi possível carregar. '+e.message;}
}
setInterval(()=>{controls();$('skip').hidden=!(scene.result&&scene.result.round.multiplier>=10000);audio.intensity(scene.plates.length,!!auto);environmentAudio(audio,scene.risk);},100);
window.addEventListener('pagehide',()=>{scene.stop();audio.close();});
// Read-only diagnostics, and local-only fixture injection for reproducible presentation captures.
window.ganza={scene,audio,get state(){return {balance,sessionId,air:scene.plates.length,busy,settling,auto,failed,history,proof,fps:scene.fps,quality:scene.quality,webgl:!!scene.gpu};}};
if(localOrigin&&!isHost)window.ganza.demo=(mode,k)=>{const r=demoRound(mode,k);scene.add(r,true);return r;};
void boot();

for(const button of document.querySelectorAll("[data-auto-count]"))button.onclick=()=>{$("autoCount").value=button.dataset.autoCount;for(const tile of document.querySelectorAll("[data-auto-count]"))tile.setAttribute("aria-pressed",String(tile===button));audio.play("ui");};
