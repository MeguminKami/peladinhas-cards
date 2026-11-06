import { AudioBus } from '../ui/audio-bus.js';
import { sounds, noteRate, soundDescriptions } from '../ui/audio-catalog.js';
const bus=new AudioBus({music:true,mode:null}),$=id=>document.getElementById(id);
let generation=0;
const volume=()=>bus.setVolumes({sfx:(Number($('volume').value)/100)**2,music:(Number($('music-volume').value)/100)**2,muted:false});volume();
for(const [id,spec] of Object.entries(sounds)) {
  const row=document.createElement('article');row.className='sound';row.dataset.id=id;
  const button=document.createElement('button');button.textContent=id;button.disabled=true;
  button.addEventListener('click',()=>{generation++;bus.stop();bus.play(id,{interval:0});$('status').textContent='A ouvir: '+soundDescriptions[id];});
  const detail=document.createElement('p');detail.textContent=`${soundDescriptions[id]} · ${Math.round(spec.duration*1000)} ms`;
  row.append(button,detail);$('sounds').append(row);
}
$('volume').addEventListener('input',volume);
$('music-volume').addEventListener('input',volume);
$('music-mode').addEventListener('change',async()=>{
  const mode=$('music-mode').value||null;
  $('status').textContent=mode?'A preparar a transição…':'A sair da música…';
  await bus.setMode(mode);
  if((mode||'')===$('music-mode').value)$('status').textContent=bus.diagnostics.music.failures.includes(mode)?'A faixa não carregou. A música anterior foi preservada.':mode?'Transição suave de 2 segundos.':'Música a terminar suavemente.';
});
$('filter').addEventListener('input',()=>{for(const row of document.querySelectorAll('.sound'))row.hidden=!row.dataset.id.toLowerCase().includes($('filter').value.toLowerCase());});
$('unlock').addEventListener('click',async()=>{
  await bus.unlock();
  for(const button of document.querySelectorAll('.sound button'))button.disabled=false;
  for(const id of ['sequence','personas','fusions'])$(id).disabled=false;
  $('music-mode').disabled=false;
  $('status').textContent=`${bus.diagnostics.loaded} efeitos da paleta refeita carregados. ${bus.diagnostics.failures.length} falhas.`;
});
$('stop').addEventListener('click',()=>{generation++;bus.stop();bus.setMode(null);$('music-mode').value='';$('status').textContent='Efeitos parados. Música a terminar suavemente.';});
document.addEventListener('visibilitychange',()=>{generation++;});
$('sequence').addEventListener('click',async()=>{
  const token=++generation;bus.stop();
  const sequence=[['spin-press',160],['column-land',220],['column-land',220],['scatter-land',400],['column-land',220],['column-land',240],['win-small',350],['cluster-clear',220],['cascade-land',420],['awaken-WEED',650],['weed-hold',400],['group-grow',350],['group-release',300],['win-medium',600],['count-end',500]];
  let col=0;
  for(const [id,ms] of sequence){if(token!==generation)break;bus.play(id,{interval:0,rate:id==='column-land'?noteRate(col++):1});$('status').textContent='Sequência demonstrativa: '+id;await new Promise(r=>setTimeout(r,ms));}
});
async function compare(ids) {
  const token=++generation;bus.stop();
  for(const id of ids) {
    if(token!==generation)return;
    bus.stop();bus.play(id,{interval:0});$('status').textContent=`${id}: ${soundDescriptions[id]}`;
    await new Promise(r=>setTimeout(r,sounds[id].duration*1000+350));
  }
  if(token===generation)$('status').textContent='Comparação terminada.';
}
$('personas').addEventListener('click',()=>compare(['awaken-WEED','awaken-ALCOOL','awaken-COPIUM','awaken-MDMA','awaken-LCD']));
$('fusions').addEventListener('click',()=>compare(Object.keys(sounds).filter(id=>id.startsWith('fusion-'))));
// Local diagnostics used by the browser regression, no game or wallet connection.
globalThis.audioLab=bus;
