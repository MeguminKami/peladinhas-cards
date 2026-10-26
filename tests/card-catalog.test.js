import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCardCatalog, catalogRequirements } from '../js/card-catalog-model.js';
import { CARD_CRITERIA } from '../js/card-catalog-rules.js';
import { CARD_CRITERIA as serverCriteria } from '../functions/card-unlock-rules.js';

test('catalog criteria match current server conditions', () => assert.deepEqual(CARD_CRITERIA, serverCriteria));
test('catalog keeps expired awards, deduplicates holders and ignores revoked, pending and future rewards', () => {
  const award = { id:'mvp', earnedAt:'2025-01-01', expiresAt:'2025-01-08' };
  const league = { users:[{uid:'a',displayName:'Ana'}], players:[{uid:'a',hasCard:true,ovr:78,earnedCards:[award]}], catalogSources:{collections:[{uid:'a',awards:[award]}]}, eventRewards:[
    {uid:'a',reward:{specialId:'mvp'},createdAt:'2025-02-01'},
    {uid:'b',reward:{specialId:'mvp'},createdAt:'2025-01-01',revokedAt:'2025-01-02'},
    {uid:'c',reward:{specialId:'mvp'},createdAt:'2025-01-01',pending:true},
    {uid:'d',reward:{specialId:'mvp'},createdAt:'2099-01-01'},
  ]};
  const catalog=buildCardCatalog(league,Date.parse('2026-10-23'));
  const mvp=catalog.entries.find(e=>e.id==='mvp');
  assert.equal(mvp.seen,true);assert.equal(mvp.holders.length,1);assert.equal(mvp.holders[0].date,Date.parse('2025-01-01'));
  assert.equal(catalog.entries.find(e=>e.id==='bronze-common').seen,false);
  assert.equal(catalog.entries.find(e=>e.id==='gold-common').seen,true);
  assert.equal(catalog.entries.length,new Set(catalog.entries.map(e=>e.id)).size);
});
test('weekly and previous snapshots prove base appearances without inventing dates',()=>{
  const c=buildCardCatalog({catalogSources:{weeklyCards:[{uid:'a',baseCard:'silver-rare',specials:[{id:'in-form'}]}],previousCards:{a:{baseCard:'bronze-rare'}}}});
  for(const id of ['silver-rare','bronze-rare','in-form']){const e=c.entries.find(e=>e.id===id);assert.equal(e.seen,true);assert.equal(e.holders[0].date,null);}
});
test('empty catalog and exact base ranges',()=>{
  assert.equal(buildCardCatalog({}).seen,0);
  assert.equal(catalogRequirements('silver-common').summary,'65–69 OVR');
  assert.match(catalogRequirements('mvp').rules.join(' '),/Empates contam/);
});
test('expired custom event editions retain template and criteria and deduplicate owners',()=>{
  const template={name:'Edição da comunidade',baseTheme:'gold-rare'};
  const catalog=buildCardCatalog({users:[{uid:'a',displayName:'Ana'}],eventRewards:[
    {uid:'a',createdAt:'2025-01-01',expiresAt:'2025-01-02',reward:{specialId:'saved:one',cardTheme:template,criterion:'Marcar 3 golos.',cardDuration:'weekly'}},
    {uid:'a',createdAt:'2025-02-01',expiresAt:'2025-02-02',reward:{specialId:'saved:one',cardTheme:template,criterion:'Marcar 3 golos.',cardDuration:'weekly'}},
  ]});
  const custom=catalog.entries.find(e=>e.id==='saved:one');
  assert.equal(custom.name,template.name);assert.equal(custom.holders.length,1);
  assert.deepEqual(custom.record.cardTheme,template);assert.deepEqual(custom.requirements.rules,['Marcar 3 golos.']);assert.match(custom.requirements.note,/7 dias/);
});
