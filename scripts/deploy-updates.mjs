import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseConfig } from "../js/config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function deploymentStages(manifest) {
  if (
    !manifest.functions.length ||
    new Set(manifest.functions).size !== manifest.functions.length
  )
    throw Error("Lista de Functions vazia ou repetida.");
  if (
    !Number.isInteger(manifest.batchSize) ||
    manifest.batchSize < 1 ||
    manifest.batchSize > 8
  )
    throw Error("Cada etapa deve publicar entre uma e oito Functions.");
  if (manifest.functions.some((name) => !/^[A-Za-z][A-Za-z0-9]*$/.test(name)))
    throw Error("Nome de Function inválido.");
  const stages = [{ label: "Regras Firestore", only: "firestore:rules" }];
  for (let i = 0; i < manifest.functions.length; i += manifest.batchSize) {
    const names = manifest.functions.slice(i, i + manifest.batchSize);
    stages.push({
      label: `Functions ${Math.floor(i / manifest.batchSize) + 1}: ${names.join(", ")}`,
      only: names
        .map((name) => `functions:${manifest.codebase}:${name}`)
        .join(","),
    });
  }
  stages.push({ label: "Frontend e PWA", only: "hosting" });
  return stages.map((stage, i) => ({
    ...stage,
    number: i + 1,
    args: ["deploy", "--project", manifest.project, "--only", stage.only],
  }));
}

export function sourceExports(source) {
  return [...source.matchAll(/export\s+const\s+(?:\{([^}]+)\}|(\w+))/g)]
    .flatMap((match) =>
      match[2]
        ? [match[2]]
        : match[1]
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
    )
    .sort();
}

export function fromStage(args, count) {
  const index = args.indexOf("--from-stage");
  const value = index === -1 ? 1 : Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > count)
    throw Error(`Usa --from-stage com um número entre 1 e ${count}.`);
  const allowed = new Set([
    "--plan",
    "--from-stage",
    ...(index === -1 ? [] : [args[index + 1]]),
  ]);
  if (args.some((arg) => !allowed.has(arg)))
    throw Error("Opções permitidas: --plan e --from-stage N.");
  return value;
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      `Verificação local falhou (${result.status ?? result.signal}).`,
    );
}

function main() {
  const manifest = JSON.parse(
    readFileSync(resolve(root, "scripts/deploy-updates.json"), "utf8"),
  );
  const config = JSON.parse(
    readFileSync(resolve(root, "firebase.json"), "utf8"),
  );
  if (manifest.project !== firebaseConfig.projectId)
    throw Error("O projeto do plano difere da configuração da aplicação.");
  if (!config.functions.some((entry) => entry.codebase === manifest.codebase))
    throw Error("Codebase não encontrada em firebase.json.");
  const names = sourceExports(
    readFileSync(resolve(root, "functions/index.js"), "utf8"),
  );
  if (JSON.stringify(names) !== JSON.stringify([...manifest.functions].sort()))
    throw Error(
      "As Functions exportadas mudaram. Atualiza o plano antes de publicar para não omitir consumidores.",
    );
  const stages = deploymentStages(manifest);
  const start = fromStage(process.argv.slice(2), stages.length);
  console.log(
    `Atualizações desde ${manifest.inclusiveCommit}, incluindo esse commit e o trabalho local.`,
  );
  console.log(
    `Projeto: ${manifest.project}; ${names.length} Functions em grupos de até ${manifest.batchSize}.`,
  );
  console.log(
    "Âmbito: Firestore rules, Functions identificadas e Hosting. Sem Storage ou índices.",
  );
  for (const stage of stages)
    console.log(
      `${stage.number}. ${stage.label}\n   npx.cmd firebase deploy --project ${manifest.project} --only "${stage.only}"`,
    );
  if (process.argv.includes("--plan")) {
    console.log(
      "Plano local. Nenhuma chamada cloud ou publicação foi executada.",
    );
    return;
  }
  for (const path of [
    "node_modules/firebase-tools/lib/bin/firebase.js",
    "games/futebol/node_modules/vite/bin/vite.js",
  ])
    if (!existsSync(resolve(root, path)))
      throw Error(
        `Dependência em falta: ${path}. Executa npm.cmd ci e npm.cmd ci --prefix games/futebol.`,
      );
  console.log(
    "\nA validar código, documentação, testes e build antes de publicar…",
  );
  runNode(["scripts/check.mjs"]);
  runNode(["scripts/check-docs.mjs"]);
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const tests = pkg.scripts.test.split(/\s+/);
  if (
    tests[0] !== "node" ||
    tests[1] !== "--test" ||
    tests.slice(2).some((path) => !/^tests\/[\w.-]+\.test\.js$/.test(path))
  )
    throw Error(
      "Formato de npm test mudou; atualizar a validação deste script.",
    );
  runNode(tests.slice(1));
  runNode(["scripts/build-hosting.mjs"]);
  for (const stage of stages.filter((stage) => stage.number >= start)) {
    console.log(`\n[${stage.number}/${stages.length}] ${stage.label}`);
    // Invoke the installed CLI directly: no npx installation or shell interpolation.
    // No force, billing bypass, automatic retries, or destructive function deletion.
    const result = spawnSync(
      process.execPath,
      ["node_modules/firebase-tools/lib/bin/firebase.js", ...stage.args],
      { cwd: root, stdio: "inherit" },
    );
    if (result.error || result.status !== 0) {
      console.error(
        `\nEtapa ${stage.number} não foi concluída. O plano parou; etapas seguintes não foram executadas.`,
      );
      console.error(
        `Para retomar: npm.cmd run deploy:updates -- --from-stage ${stage.number}`,
      );
      console.error(
        "Se o erro for 429, aguarda 2–3 minutos sem outros deploys antes de retomar. Confirma o resultado da etapa que falhou no terminal.",
      );
      process.exitCode = result.status || 1;
      return;
    }
  }
  console.log(
    "\nEtapas concluídas. Na administração, executa Recalcular liga para atualizar cartas abertas; semanas fechadas são preservadas.",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
