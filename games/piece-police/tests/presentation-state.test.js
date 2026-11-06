import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationState,SPEED_RATES} from '../ui/presentation-state.js';
import {fusionDescription} from '../ui/fusion-copy.js';
import {config} from '../src/index.js';
test('explicação uma vez por bónus, independente do jogo base e recuperável por snapshot',()=>{
  const s=createPresentationState();assert.equal(s.shouldExplain('FROZEN_REALITY',true),true);assert.equal(s.shouldExplain('FROZEN_REALITY',true),false);
  assert.equal(s.shouldExplain('FROZEN_REALITY',false),true);assert.equal(s.shouldExplain('FROZEN_REALITY',false),true);
  const resumed=createPresentationState(s.snapshot());assert.equal(resumed.shouldExplain('FROZEN_REALITY',true),false);assert.equal(resumed.shouldExplain('DOUBLE_VISION',true),true);
  assert.equal(createPresentationState().shouldExplain('FROZEN_REALITY',true),true);
});
test('continuidade visual Party só no POLICE PARTY; não modifica o modelo nem as taxas',()=>{
  const s=createPresentationState();const m={kind:'bonus',bonusId:'police',partyMode:false};assert.equal(s.partyActive(m),false);
  assert.equal(s.activateParty(),false);assert.equal(s.partyActive(m),true);assert.equal(s.activateParty(),true);
  assert.equal(s.partyActive({...m,bonusId:'vip'}),false);assert.equal(s.partyActive({...m,kind:'base'}),false);assert.equal(m.partyMode,false);
  assert.equal(createPresentationState(s.snapshot()).partyActive(m),true);assert.deepEqual(SPEED_RATES,{normal:1,fast:2,ultra:3.75});
});
test('dez explicações detalhadas cobrem efeito, condição e duração com limites atuais',()=>{
  for(const f of config.fusions){const text=fusionDescription(f.id,{bonus:true,detailed:true});for(const part of ['Poderes ativados','O que acontece','Quando atua','Duração'])assert.ok(text.includes(part));assert.ok(!/undefined|NaN/.test(text));for(const p of f.par)assert.ok(text.includes(p));}
  assert.ok(fusionDescription('NEVER_ENDING_DREAM').includes(String(config.fusions.find(f=>f.id==='NEVER_ENDING_DREAM').maxRespins)));
});

 test('avisos de leitura rápida mantêm um orçamento de texto curto', async () => {
 const {fusionBrief}=await import('../ui/fusion-copy.js');
 const {bonusBrief}=await import('../ui/help-copy.js');
 const words=s=>s.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;
 for(const f of config.fusions){const text=fusionBrief(f.id);assert.ok(text.length>0);assert.ok(words(text)<=45,f.id);assert.ok(!/undefined|NaN/.test(text));}
 for(const id of Object.keys(config.bonus)){const text=bonusBrief(id);assert.ok(words(text)<=60,id);assert.ok(!/undefined|NaN/.test(text));}
});
