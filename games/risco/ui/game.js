import { RiscoScene } from './scene.js';
import { RiscoAudio } from './audio.js';
import { HostSession, DemoSession, hash, multiplierAt } from './session.js';
import { crashFromSeed, MATH_VERSION, payout } from '../src/engine.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),host=params.get('wallet')==='host';
const scene=new RiscoScene($('stage')),audio=new RiscoAudio();
const number=n=>n.toLocaleString('pt-PT'),multi=n=>(n/100).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
let session,data=null,polling=false,pending=null,offset=0,lastId=null,lastPhase=null,lastStatus=null,phaseStarted=performance.now(),paidAt=-10000,endedAt=0,cardBeat=0,lastMilestone=0;
let stopped=false,ready=false,renderOverride=null,inFlight=false;
const milestones=[200,500,1000,5000,10000,50000,100000];
const phrases=[['Ainda não…','Está tudo controlado.'],['Agora é que é.','Calma. CALMA.'],['ESTOU A VER SONS.','O néon sabe o meu nome.'],['A mesa está a respirar.','Não olhes para trás.'],['O LCD deixou a sala.','Já não há realidade.'],['Isto já é outra dimensão.','Alguém viu o teto?'],['EU SOU O NÉON.','A afterparty é eterna.']];
function accept(next) {
  if(data&&next.serverNow<data.serverNow)return;
  data=next;offset=next.serverNow-Date.now();
  $('balance').textContent=number(next.balance/100);document.documentElement.dataset.casinoBalance=String(next.balance);
  $('history').replaceChildren(...next.history.map(v=>{const li=document.createElement('li');li.textContent=multi(v)+'×';li.className=v<200?'low':v>=10000?'high':'';return li;}));
  const r=next.round;
  if(r?.id!==lastId){lastId=r?.id;lastPhase=null;lastStatus=null;lastMilestone=0;cardBeat=0;endedAt=0;paidAt=-10000;$('speech').textContent='Ainda não…';}
  if(r&&r.status!==lastStatus){
    if(r.cashoutCents){paidAt=performance.now();if(r.phase!=='max-win'){audio.play('cashout');setTimeout(()=>audio.play('betrayed'),350);$('speech').textContent='A sério? Já vais?';}}
    else if(r.status==='crashed')audio.play('loss');
    lastStatus=r.status;
  }
  if(r&&r.phase!==lastPhase){
    phaseStarted=performance.now();
    if(r.phase==='running')audio.play('puff');
    if(r.phase==='crashed'||r.phase==='max-win'){
      endedAt=performance.now();audio.play(r.phase==='max-win'?'max':r.crashCents===100?'instant':variant(r.id)?'crash-double':'crash');
      if(r.phase==='crashed')$('speech').textContent=r.crashCents===100?'Nem deu para alinhar.':'Só mais um risquinho…';
    }
    lastPhase=r.phase;
  }
  proof();
}
const variant=id=>Array.from(id||'').reduce((n,c)=>n+c.charCodeAt(0),0)%2;
async function request(action,payload={},id) { const next=await session.request(action,payload,id);accept(next);return next; }
async function act() {
  if(!ready||inFlight||polling&& !data)return;
  void audio.unlock();
  const r=data?.round;
  if(r?.phase==='max-win'&&performance.now()-endedAt<6000){endedAt=performance.now()-6000;return;}
  if(!pending){
    if(r&&['waiting','running'].includes(r.phase)){
      if(r.phase!=='running'||r.status!=='running')return;
      pending={action:'cashout',payload:{sessionId:data.sessionId,roundId:r.id},id:crypto.randomUUID()};
    }else{
      const bet=Number($('bet').value),target=Math.round(Number($('auto').value)*100);
      if(!Number.isSafeInteger(bet)||bet<1||bet>10000){$('message').textContent='Escolhe uma aposta inteira de 1 a 10 000 DJC.';return;}
      if($('auto-toggle').checked&&(!Number.isInteger(target)||target<101||target>999900)){$('message').textContent='A saída automática vai de 1,01× a 9 999×.';return;}
      pending={action:'start',payload:{sessionId:data.sessionId,expectedRevision:data.revision,betUnits:bet,autoCashoutCents:$('auto-toggle').checked?target:null},id:crypto.randomUUID()};
    }
  }
  const operation=pending;inFlight=true;$('action').disabled=true;
  try{await request(operation.action,operation.payload,operation.id);pending=null;}catch(error){$('message').textContent=error.message;if(error.rejected){pending=null;await request('connect').catch(()=>{});}/* Lost acknowledgement keeps the same request ID. */}finally{inFlight=false;}
}
function display(now) {
  const r=data?.round,waiting=r?.phase==='waiting',running=r?.phase==='running';
  const locked=r&&['waiting','running'].includes(r.phase);
  const elapsed=r?Math.max(0,Date.now()+offset-r.startedAt):0;
  let m=running?multiplierAt(elapsed):r?.multiplierCents||100;
  const paid=Boolean(r?.cashoutCents),sincePaid=now-paidAt;
  const phase=r?.phase||'idle',age=now-phaseStarted;
  $('scene').className='scene'+(phase==='crashed'?' crashed':phase==='max-win'?' max-win':'')+(paid&&running?' paid':'');
  $('multiplier').innerHTML=multi(m)+'<span>×</span>';
  $('phase').textContent=waiting?'A ALINHAR O PRÓXIMO RISCO':phase==='crashed'?'CRASH @':phase==='max-win'?'MAX WIN':running?'ATÉ ONDE VAIS?':'O RISCO É TEU.';
  if(!pending){
    $('message').textContent=waiting?'Começa em '+Math.max(1,Math.ceil((r.startedAt-Date.now()-offset)/1000))+' s':paid?'Saíste a '+multi(r.cashoutCents)+'× · '+number(r.payoutUnits)+' DJC':phase==='crashed'?(r.crashCents===100?'NEM DEU PARA ALINHAR':'O LCD ficou com a linha toda.'):running?'Sai antes de o LCD perder a cabeça.':'Uma linha. Uma decisão. O teu momento.';
  }
  $('countdown').style.width=waiting?Math.max(0,Math.min(100,100-(r.startedAt-Date.now()-offset)/50))+'%':'0%';
  if(waiting){const left=Math.ceil((r.startedAt-Date.now()-offset)/1000);if(left<=3&&left>0&&left!==cardBeat){audio.play('card',{rate:1+(3-left)*.12});cardBeat=left;}}
  if(running){const level=milestones.filter(v=>m>=v).length;if(level>lastMilestone){lastMilestone=level;const list=phrases[Math.min(level-1,phrases.length-1)];$('speech').textContent=list[variant(r.id+level)];audio.play('milestone',{rate:1+level*.08});}}
  audio.state(m,!running);
  const action=$('action'),cashout=running&&r.status==='running';
  action.className=cashout?'cashout':locked?'waiting':'';
  const hold=phase==='crashed'&&now-endedAt<(r.crashCents===100?1500:2500);
  action.disabled=!ready||inFlight||hold||(locked&&!cashout)||cashout&&m<101;
  $('action-label').textContent=pending?'RECUPERAR PEDIDO':cashout?'CASHOUT':locked?'À ESPERA':'APOSTAR';
  $('action-detail').textContent=cashout?number(payout(r.betUnits,m))+' DJC':locked?(paid?'A ronda continua':'A tua aposta está na mesa'):number(Number($('bet').value)||0)+' DJC · O risco é teu.';
  for(const id of ['bet','minus','plus','half','double','auto','auto-toggle'])$(id).disabled=Boolean(locked)||Boolean(pending);
  scene.frame(now,renderOverride||{time:now,multiplierCents:m,phase,phaseTime:paid&&sincePaid<1200?sincePaid:age,paid:paid&&running,variant:variant(r?.id)});
  if(!stopped)requestAnimationFrame(display);
}
function proof() {
  const r=data?.round,entries=[['Versão matemática',r?.version||MATH_VERSION],['Compromisso SHA-256',r?.commitment||'Aposta para comprometer uma seed.'],['Seed revelada',r?.seed||'Oculta até ao crash'],['Crash',r?.crashCents?multi(r.crashCents)+'×':'Oculto'],['Modo',host?'Carteira local do casino':params.has('demo')?'Demonstração forçada, sem carteira':'Créditos temporários de demonstração']];
  $('proof').replaceChildren(...entries.flatMap(([title,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;dd.textContent=value;return[dt,dd];}));
  $('check-proof').disabled=!r?.seed;
}
$('action').addEventListener('click',act);
addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat||event.target.matches('input,button,a')||document.querySelector('dialog[open]'))return;event.preventDefault();if(!$('action').disabled)void act();});
for(const[id,change]of[['minus',n=>n-10],['plus',n=>n+10],['half',n=>Math.floor(n/2)],['double',n=>n*2]])$(id).addEventListener('click',()=>{$('bet').value=Math.max(1,Math.min(10000,change(Number($('bet').value)||1)));void audio.unlock();audio.play('ui');});
$('settings-open').onclick=()=>$('settings').showModal();$('verify-open').onclick=()=>$('verification').showModal();
$('check-proof').onclick=async()=>{const r=data?.round;if(!r?.seed)return;const matches=await hash(r.seed)===r.commitment;const computed=crashFromSeed(r.seed);$('proof-result').textContent=r.demo?'Demonstração forçada. A seed verifica o compromisso, o crash foi escolhido para a apresentação.':matches&&computed===r.crashCents?'Compromisso e crash correspondem à seed.':'A verificação não corresponde.';};
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motion.matches;
function setReduced(value){reduced=value;scene.reduced=value;$('reduced').setAttribute('aria-pressed',String(value));document.body.classList.toggle('reduced',value);}
setReduced(reduced);motion.addEventListener('change',e=>setReduced(e.matches));$('reduced').onclick=()=>setReduced(!reduced);
$('mute').onclick=()=>{void audio.unlock();audio.muted=!audio.muted;audio.update();$('mute').setAttribute('aria-pressed',String(audio.muted));$('mute').textContent=audio.muted?'SOM OFF':'SOM ON';};
for(const[id,key]of[['music-volume','music'],['effects-volume','effects']])$(id).oninput=()=>{audio[key]=Number($(id).value)/100;audio.update();};
async function poll(){
  if(stopped)return;
  if(!polling&&ready&&!pending&&data?.round&&['waiting','running'].includes(data.round.phase)){
    polling=true;try{await request('poll');}catch(error){$('message').textContent=error.message;}finally{polling=false;}
  }
  setTimeout(poll,200);
}
addEventListener('pagehide',()=>{stopped=true;audio.destroy();});
try{
  session=host?new HostSession():new DemoSession();
  await Promise.all([scene.load(),audio.preload(),request('connect')]);ready=true;$('loading').classList.add('done');
  $('mode').textContent=host?'CARTEIRA DJABUCOIN':params.has('demo')?'DÉMO FORÇADA · SEM CARTEIRA':'CRÉDITOS DE DEMONSTRAÇÃO';
  requestAnimationFrame(display);void poll();
  // Only isolated presentation previews expose a scrub API, never the casino iframe.
  if(!host&&params.has('demo'))window.riscoPresentation={render(state){renderOverride=state;scene.render(state);},clear(){renderOverride=null;},get fps(){return scene.fps;},get quality(){return scene.quality;}};
}catch(error){$('loading').textContent='Não foi possível preparar a mesa. '+error.message;}
