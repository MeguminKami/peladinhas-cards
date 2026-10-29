import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { sourceExports } from './deploy-updates.mjs';
import { firebaseConfig } from '../js/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const ignored = new Set(['node_modules', 'dist', '.git', '.firebase']);

function filesAt(base, path, result = []) {
  const full = resolve(base, path);
  if (!existsSync(full)) return result;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const next = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) throw Error(`Link simbólico não suportado: ${next}`);
    if (entry.isDirectory()) filesAt(base, next, result);
    else result.push(next);
  }
  return result;
}

function fingerprint(base, paths, config) {
  const files = Object.fromEntries([...new Set(paths)].sort().map(path => {
    if (!existsSync(resolve(base, path))) throw Error(`Ficheiro necessário em falta: ${path}`);
    return [path, hash(readFileSync(resolve(base, path)))];
  }));
  files['@config'] = hash(JSON.stringify(config));
  return { digest: hash(JSON.stringify(files)), files };
}

export function snapshot(base = root) {
  const config = json(resolve(base, 'firebase.json'));
  const pkg = json(resolve(base, 'package.json'));
  const project = firebaseConfig.projectId;
  if (!Object.values(json(resolve(base, '.firebaserc')).projects).includes(project))
    throw Error('Projeto da aplicação não está nos aliases Firebase.');
  const codebases = config.functions;
  if (codebases.length !== 1 || codebases[0].source !== '.' || pkg.main !== 'functions/index.js')
    throw Error('Estrutura das Functions mudou; rever o tracker antes de publicar.');
  if (config.hosting.public !== '.firebase/site') throw Error('Destino Hosting mudou; rever tracker.');
  const names = sourceExports(readFileSync(resolve(base, pkg.main), 'utf8'));
  if (!names.length || names.some(name => !/^[A-Za-z][A-Za-z0-9]*$/.test(name)))
    throw Error('Exports das Functions não reconhecidos.');
  // Deliberately conservative: modules share factories, callbacks and runtime policy.
  // Include every server/browser module rather than guessing function-level consumers.
  const shared = filesAt(base, 'functions');
  const visited = new Set(shared);
  for (let i = 0; i < shared.length; i++) {
    const path = shared[i];
    if (!/\.m?js$/.test(path)) continue;
    const source = readFileSync(resolve(base, path), 'utf8');
    if (/\bimport\s*\(\s*[^'"\s]/.test(source)) throw Error(`Import dinâmico não analisável: ${path}`);
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)) {
      const dependency = relative(base, resolve(base, dirname(path), match[1])).replaceAll('\\', '/');
      if (dependency.startsWith('../')) throw Error('Dependência fora do projeto.');
      if (!visited.has(dependency)) { visited.add(dependency); shared.push(dependency); }
    }
  }
  const dependencies = ['package.json', 'package-lock.json'];
  const backend = fingerprint(base, [...shared, ...dependencies,
    'scripts/build-blackjack-server.mjs', 'games/blackjack-3d/shared/core.ts', 'games/blackjack-3d/src/engine.ts',
  ], codebases);
  const hosting = fingerprint(base, [
    'index.html', 'offline.html', 'manifest.webmanifest', 'sw.js',
    ...filesAt(base, 'js'), ...filesAt(base, 'css'), ...filesAt(base, 'assets'),
    ...filesAt(base, 'games'), ...filesAt(base, 'scripts'), ...dependencies,
  ], config.hosting);
  const units = {
    'firestore:rules': fingerprint(base, [config.firestore.rules], { rules: config.firestore.rules }),
    'firestore:indexes': fingerprint(base, [config.firestore.indexes], { indexes: config.firestore.indexes }),
    storage: fingerprint(base, [config.storage.rules], config.storage),
    ...Object.fromEntries(names.map(name => [`functions:${codebases[0].codebase}:${name}`, backend])),
    hosting,
  };
  return { project, units };
}

export function pendingUnits(current, state = { units: {} }) {
  if (state.project && state.project !== current.project) throw Error('O projeto mudou; não reutilizar este registo.');
  return Object.entries(current.units).flatMap(([only, unit]) => {
    const previous = state.units[only];
    if (previous?.digest === unit.digest) return [];
    const paths = new Set([...Object.keys(previous?.files || {}), ...Object.keys(unit.files)]);
    return [{ only, status: previous ? 'alterado' : 'por confirmar',
      changed: [...paths].filter(path => previous?.files[path] !== unit.files[path]) }];
  });
}

export function makeStages(pending, batchSize = 4) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 8) throw Error('Lote deve ter entre 1 e 8 funções.');
  const functions = pending.filter(unit => unit.only.startsWith('functions:')).map(unit => unit.only);
  const stages = pending.filter(unit => !unit.only.startsWith('functions:') && unit.only !== 'hosting').map(unit => ({ units: [unit.only] }));
  for (let i = 0; i < functions.length; i += batchSize) stages.push({ units: functions.slice(i, i + batchSize) });
  if (pending.some(unit => unit.only === 'hosting')) stages.push({ units: ['hosting'] });
  return stages;
}

export function automaticAction(current, state, plan) {
  const pending = pendingUnits(current, state);
  if (!pending.length) return 'status';
  const remaining = plan?.stages?.filter(stage => !stage.completedAt);
  const covered = new Set(remaining?.flatMap(stage => stage.units));
  if (plan?.version === 1 && plan.project === current.project && remaining?.length &&
      JSON.stringify(plan.snapshot) === JSON.stringify(current) &&
      pending.every(unit => covered.has(unit.only))) return 'resume';
  return 'pending';
}

function save(path, data) {
  writeFileSync(`${path}.tmp`, JSON.stringify(data, null, 2) + '\n');
  renameSync(`${path}.tmp`, path);
}

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Comando falhou (${result.status ?? result.signal}). Consulta a saída acima.`);
}

function main() {
  let [command = 'status', ...args] = process.argv.slice(2);
  if (!['status', 'plan', 'pending', 'resume', 'auto'].includes(command)) throw Error('Usa status, plan, pending, resume ou auto.');
  const auto = command === 'auto';
  let only, initialize = false, preview = false, batchSize = 4;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--initialize') initialize = true;
    else if (args[i] === '--preview' && auto) preview = true;
    else if (args[i] === '--only' && args[i + 1]) only = args[++i].split(',');
    else if (args[i] === '--batch-size' && args[i + 1]) batchSize = Number(args[++i]);
    else throw Error(`Opção inválida: ${args[i]}`);
  }
  if (command === 'resume' && args.length) throw Error('Resume usa o plano guardado, sem opções.');
  const dir = resolve(root, '.deploy');
  const statePath = resolve(dir, 'state.json');
  const planPath = resolve(dir, 'plan.json');
  const current = snapshot();
  const state = existsSync(statePath) ? json(statePath) : { version: 1, project: current.project, units: {}, history: [] };
  if (state.version !== 1 || !state.units) throw Error('Registo incompatível.');
  let pending = pendingUnits(current, state);
  const removed = Object.keys(state.units).filter(key => !current.units[key]);
  if (removed.length) console.warn(`Aviso: alvos do histórico já não existem no código e ficam fora deste deploy; os recibos são preservados. A remoção na cloud exige revisão manual: ${removed.join(', ')}`);
  if (only) {
    for (const target of only) if (target !== 'functions' && !current.units[target]) throw Error(`Alvo desconhecido: ${target}`);
    pending = pending.filter(unit => only.includes(unit.only) || (only.includes('functions') && unit.only.startsWith('functions:')));
  }
  console.log(`Projeto: ${current.project}. Registo local; não confirma alterações feitas fora deste fluxo.`);
  console.log('Functions: deteção conservadora; mudanças no servidor ou nos módulos que importa marcam todas as funções.');
  for (const unit of pending) console.log(`${unit.status}: ${unit.only}\n  ${unit.changed.slice(0, 5).join(', ')}${unit.changed.length > 5 ? ` (+${unit.changed.length - 5})` : ''}`);
  if (auto) {
    if (only) throw Error('O modo automático usa todas as pendências; usa pending para selecionar alvos.');
    const savedPlan = existsSync(planPath) ? json(planPath) : undefined;
    command = automaticAction(current, state, savedPlan);
    console.log(command === 'resume' ? 'Automático: retomar o plano compatível.' :
      command === 'pending' ? 'Automático: preparar e publicar as pendências atuais.' : 'Automático: nada para publicar.');
    if (preview) {
      const stages = command === 'resume' ? savedPlan.stages.filter(stage => !stage.completedAt) : makeStages(pending, batchSize);
      stages.forEach((stage, i) => console.log(`${i + 1}. ${stage.units.join(',')}`));
      if (pending.some(unit => unit.status === 'por confirmar') && command === 'pending' && !initialize)
        console.log('Publicação bloqueada por alvos sem histórico. Para os publicar: .\\deploy.ps1 -Inicializar');
      console.log('Simulação local. Nenhuma publicação ou chamada cloud executada.');
      return;
    }
    if (command === 'pending' && !initialize && pending.some(unit => unit.status === 'por confirmar'))
      throw Error('Há alvos sem histórico. Para os publicar e iniciar o registo, executa .\\deploy.ps1 -Inicializar.');
  }
  if (command === 'status') {
    if (!pending.length) console.log('Sem pendências no âmbito selecionado.');
    return;
  }
  let plan = { version: 1, project: current.project, createdAt: new Date().toISOString(),
    snapshot: current, stages: makeStages(pending, batchSize), validated: false };
  if (command === 'plan') {
    plan.stages.forEach((stage, i) => console.log(`${i + 1}. npx.cmd firebase deploy --project ${plan.project} --only "${stage.units.join(',')}"`));
    console.log('Pré-visualização local. Nenhuma publicação executada; pending guarda o plano ao iniciar.');
    return;
  }
  mkdirSync(dir, { recursive: true });
  const lockPath = resolve(dir, 'running.lock');
  let lock;
  try { lock = openSync(lockPath, 'wx'); }
  catch { throw Error('Outro deploy pode estar a correr. Ver DEPLOY.md antes de remover .deploy/running.lock.'); }
  try {
    writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    if (command === 'resume') {
      if (!existsSync(planPath)) throw Error('Não existe plano para retomar.');
      plan = json(planPath);
      if (plan.version !== 1 || JSON.stringify(plan.snapshot) !== JSON.stringify(current))
        throw Error('O código ou configuração mudou. Executa deploy:plan e depois deploy:pending para criar um plano novo.');
    } else {
      if (!plan.stages.length) { console.log('Sem pendências no âmbito selecionado.'); return; }
      if (!initialize && pending.some(unit => unit.status === 'por confirmar'))
        throw Error('Há alvos sem histórico. Revê deploy:plan e usa --initialize para os publicar e iniciar o registo.');
      save(planPath, plan);
    }
    if (!plan.validated) {
      run(['scripts/check.mjs']);
      run(['scripts/check-docs.mjs']);
      run(['--test', 'tests/deploy-tracker.test.js']);
      if (plan.stages.some(stage => stage.units.some(unit => unit.startsWith('functions:'))))
        run(['scripts/build-blackjack-server.mjs', '--check']);
      const tests = json(resolve(root, 'package.json')).scripts.test.split(/\s+/);
      if (tests[0] !== 'node' || tests[1] !== '--test' || tests.slice(2).some(path => !/^tests\/[\w.-]+\.test\.js$/.test(path)))
        throw Error('Formato dos testes mudou; rever tracker.');
      run(tests.slice(1));
      plan.validated = true;
      save(planPath, plan);
    }
    for (const [i, stage] of plan.stages.entries()) {
      if (stage.completedAt) continue;
      if (JSON.stringify(snapshot()) !== JSON.stringify(plan.snapshot))
        throw Error('Fontes mudaram desde a validação. Prepara um plano novo com deploy:pending.');
      // Hosting builds generated assets. Capture its source inventory afterwards;
      // never prebuild here (Firebase's existing predeploy does it exactly once).
      console.log(`[${i + 1}/${plan.stages.length}] ${stage.units.join(',')}`);
      stage.startedAt = new Date().toISOString();
      save(planPath, plan);
      try {
        run(['node_modules/firebase-tools/lib/bin/firebase.js', 'deploy', '--project', plan.project, '--only', stage.units.join(',')]);
      } catch (error) {
        stage.error = error.message;
        save(planPath, plan);
        throw Error(`${error.message}\nEtapa não confirmada; pode ter publicado parcialmente. Retoma com npm.cmd run deploy:resume. Não há retries automáticos.`);
      }
      const after = snapshot();
      for (const target of stage.units) {
        // Changes while CLI was running cannot be certified as the deployed source.
        if (target !== 'hosting' && after.units[target]?.digest !== current.units[target]?.digest)
          throw Error('Código mudou durante o deploy. Não foi marcado como publicado; prepara um plano novo.');
        if (target === 'hosting') {
          const beforeFiles = current.units.hosting.files;
          const afterFiles = after.units.hosting.files;
          const changedSources = new Set([...Object.keys(beforeFiles), ...Object.keys(afterFiles)]);
          if ([...changedSources].some(path => !path.startsWith('assets/games/') && beforeFiles[path] !== afterFiles[path]))
            throw Error('Fontes mudaram durante o deploy de Hosting; prepara um plano novo.');
        }
        state.units[target] = { ...after.units[target], publishedAt: new Date().toISOString() };
      }
      stage.completedAt = new Date().toISOString();
      delete stage.error;
      state.history.push({ at: stage.completedAt, project: plan.project, units: stage.units });
      save(statePath, state);
      plan.snapshot = after;
      save(planPath, plan);
    }
    console.log('Plano concluído. Confirma os fluxos afetados na aplicação; ver DEPLOY.md.');
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
