import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { config, scenario, scenarioNames } from '../src/index.js';
import { sounds, eventSounds, fusionFamilies } from '../ui/audio-catalog.js';
import { soundForEvent } from '../ui/fx-audio.js';
import { synthesize, wav } from '../scripts/synthesize-sfx.js';

test('catálogo cobre os eventos, personagens, dez fusões e cenários reais',async()=>{
  const doc=await readFile(new URL('../docs/eventos.md',import.meta.url),'utf8');
  const documented=[...doc.matchAll(/^\| `([^`]+)` \|/gm)].map(m=>m[1]);
  assert.equal(documented.length,29);
  assert.deepEqual(new Set(documented),new Set(Object.keys(eventSounds)));
  for(const id of Object.values(eventSounds).filter(Boolean))assert.ok(sounds[id],id);
  assert.deepEqual(new Set(config.fusions.map(f=>f.id)),new Set(Object.keys(fusionFamilies)));
  for(const f of config.fusions)assert.ok(sounds[soundForEvent({type:'fusion.trigger',fusionId:f.id})]);
  for(const persona of ['WEED','ALCOOL','COPIUM','MDMA','LCD'])assert.ok(sounds[soundForEvent({type:'persona.awaken',persona})]);
  assert.equal(soundForEvent({type:'persona.awaken',persona:'LCD',fusion:'RAVE_DIMENSION'}),null,'não duplica despertar e fusão');
  for(const name of scenarioNames())for(const step of scenario(name).steps)for(const e of step.events){
    assert.ok(Object.hasOwn(eventSounds,e.type),e.type);const id=soundForEvent(e);if(id)assert.ok(sounds[id],`${name}: ${id}`);
  }
});
test('assets reproduzíveis, sem clipping, caudas a zero e manifesto exato',async()=>{
  const root=new URL('../ui/audio/sfx/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.deepEqual(Object.keys(manifest.assets).sort(),Object.keys(sounds).sort());
  assert.deepEqual((await readdir(root)).filter(f=>f.endsWith('.wav')).sort(),Object.keys(sounds).map(id=>`${id}.wav`).sort());
  let peak=0,total=0;
  for(const [id,spec] of Object.entries(sounds)){
    const bytes=await readFile(new URL(`${id}.wav`,root)),data=synthesize(id,spec);
    assert.deepEqual(bytes,wav(data),id+' corresponde à fonte');
    assert.equal(bytes.length,manifest.assets[id].bytes);
    assert.ok(Math.abs(data.at(-1))<.00001,id+' termina sem descontinuidade');
    const maximum=data.reduce((a,b)=>Math.max(a,Math.abs(b)),0);peak=Math.max(peak,maximum);
    assert.ok(maximum>.05&&maximum<.5,id+' nível seguro');
    assert.ok(data.slice(0,240).some(v=>Math.abs(v)>.005),id+' sem atraso inicial');
    total+=bytes.length;
  }
  console.log(`${Object.keys(sounds).length} WAV, ${total} bytes, pico máximo ${20*Math.log10(peak)} dBFS (sample peak, não dBTP/LUFS).`);
  assert.notDeepEqual(synthesize('win-big',sounds['win-big']),synthesize('win-epic',sounds['win-epic']));
});
