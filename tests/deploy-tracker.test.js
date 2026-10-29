import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { snapshot, pendingUnits, makeStages, automaticAction } from '../scripts/deploy-tracker.mjs';
import { firebaseConfig } from '../js/config.js';

test('automatic workflow resumes only a compatible plan covering all pending targets', () => {
  const current = { project: 'demo', units: {
    hosting: { digest: 'h2', files: {} },
    'functions:peladinhas:a': { digest: 'a2', files: {} },
  } };
  const state = { project: 'demo', units: { hosting: { digest: 'h1', files: {} } } };
  const plan = { version: 1, project: 'demo', snapshot: current, stages: [
    { units: ['firestore:rules'], completedAt: 'previous' },
    { units: ['functions:peladinhas:a'] }, { units: ['hosting'] },
  ] };
  assert.equal(automaticAction(current, state, plan), 'resume');
  assert.equal(automaticAction(current, state), 'pending');
  assert.equal(automaticAction(current, state, { ...plan, snapshot: {} }), 'pending');
  assert.equal(automaticAction(current, state, { ...plan, stages: [{ units: ['hosting'] }] }), 'pending');
  assert.equal(automaticAction(current, state, { ...plan, stages: plan.stages.map(stage => ({ ...stage, completedAt: 'done' })) }), 'pending');
  assert.equal(automaticAction(current, { project: 'demo', units: current.units }, plan), 'status');
});

test('unknown, changed and published units remain distinct, including deletions', () => {
  const current = { project: 'demo', units: { hosting: { digest: 'new', files: { 'a.js': '2' } } } };
  assert.equal(pendingUnits(current)[0].status, 'por confirmar');
  const state = { project: 'demo', units: { hosting: { digest: 'old', files: { 'a.js': '1', 'removed.js': 'x' } } } };
  assert.deepEqual(pendingUnits(current, state)[0].changed, ['a.js', 'removed.js']);
  assert.deepEqual(pendingUnits(current, { units: current.units }), []);
  const withRemovedFunction = { units: { ...current.units,
    'functions:peladinhas:removedSweep': { digest: 'old', files: {} },
  } };
  assert.deepEqual(pendingUnits(current, withRemovedFunction), []);
  assert.ok(withRemovedFunction.units['functions:peladinhas:removedSweep']);
  assert.throws(() => pendingUnits(current, { project: 'other', units: {} }), /projeto mudou/);
});

test('selective batches preserve rules first and Hosting last', () => {
  const pending = ['hosting', 'functions:peladinhas:a', 'firestore:indexes', 'functions:peladinhas:b', 'functions:peladinhas:c'].map(only => ({ only }));
  assert.deepEqual(makeStages(pending, 2).map(stage => stage.units), [
    ['firestore:indexes'], ['functions:peladinhas:a', 'functions:peladinhas:b'], ['functions:peladinhas:c'], ['hosting'],
  ]);
  assert.deepEqual(makeStages([]), []);
  assert.throws(() => makeStages(pending, 0));
  assert.throws(() => makeStages(pending, 9));
});

test('local fingerprints follow transitive shared modules, ignore docs and include uncommitted inputs', () => {
  const base = mkdtempSync(resolve(tmpdir(), 'deploy-tracker-'));
  function write(path, content) {
    mkdirSync(dirname(resolve(base, path)), { recursive: true });
    writeFileSync(resolve(base, path), content);
  }
  try {
    write('firebase.json', JSON.stringify({ functions: [{ source: '.', codebase: 'peladinhas' }], hosting: { public: '.firebase/site' }, firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' }, storage: { rules: 'storage.rules' } }));
    write('.firebaserc', JSON.stringify({ projects: { default: firebaseConfig.projectId } }));
    write('package.json', JSON.stringify({ main: 'functions/index.js' }));
    for (const path of ['package-lock.json', 'index.html', 'offline.html', 'manifest.webmanifest', 'sw.js', 'firestore.rules', 'firestore.indexes.json', 'storage.rules']) write(path, '{}');
    write('functions/index.js', "import { shared } from '../js/shared.js'; export const { a, b } = factory(shared);");
    write('js/shared.js', "export { value as shared } from './nested.js';");
    write('js/nested.js', 'export const value = 1;');
    write('js/page.js', 'export const page = 1;');
    write('games/example/src/main.js', 'game v1');
    write('scripts/build-blackjack-server.mjs', '// generator');
    write('games/blackjack-3d/shared/core.ts', '// core');
    write('games/blackjack-3d/src/engine.ts', '// engine');
    const initial = snapshot(base);
    const state = { project: initial.project, units: initial.units };
    write('docs/README.md', 'documentation only');
    assert.deepEqual(pendingUnits(snapshot(base), state), []);
    write('js/page.js', 'export const page = 2;');
    assert.deepEqual(pendingUnits(snapshot(base), state).map(unit => unit.only), ['hosting']);
    write('js/page.js', 'export const page = 1;');
    write('js/nested.js', 'export const value = 2;');
    assert.deepEqual(pendingUnits(snapshot(base), state).map(unit => unit.only), ['functions:peladinhas:a', 'functions:peladinhas:b', 'hosting']);
    write('js/nested.js', 'export const value = 1;');
    write('games/example/src/main.js', 'game v2');
    assert.deepEqual(pendingUnits(snapshot(base), state).map(unit => unit.only), ['hosting']);
    write('games/example/node_modules/dependency/index.js', 'ignored dependency');
    const gameSnapshot = snapshot(base);
    write('games/example/node_modules/dependency/index.js', 'changed');
    assert.deepEqual(snapshot(base), gameSnapshot);
    rmSync(resolve(base, 'js/nested.js'));
    assert.throws(() => snapshot(base), /ENOENT|em falta/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('partial receipts only clear completed targets and later edits become pending again', () => {
  const current = { project: 'demo', units: {
    'functions:peladinhas:a': { digest: 'a1', files: { 'shared.js': '1' } },
    'functions:peladinhas:b': { digest: 'b1', files: { 'shared.js': '1' } },
    hosting: { digest: 'h1', files: { 'index.html': '1' } },
  } };
  const state = { project: 'demo', units: { 'functions:peladinhas:a': current.units['functions:peladinhas:a'] } };
  assert.deepEqual(pendingUnits(current, state).map(unit => unit.only), ['functions:peladinhas:b', 'hosting']);
  const changed = structuredClone(current);
  changed.units['functions:peladinhas:a'] = { digest: 'a2', files: { 'shared.js': '2' } };
  assert.equal(pendingUnits(changed, state)[0].status, 'alterado');
});
