// Apenas apresenta comandos. Não publica nem altera configuração cloud.
import * as functions from "../functions/index.js";
import { firebaseConfig } from "../js/config.js";
const project = firebaseConfig.projectId;
if (!/^[a-z][a-z0-9-]+$/.test(project))
  throw Error("Projeto Firebase inválido.");
const names = Object.entries(functions)
  .filter(([, handler]) => handler?.__endpoint)
  .map(([name]) => name)
  .sort();
if (!names.length) throw Error("Não foram encontradas funções Firebase.");
console.log(
  `npx.cmd firebase deploy --project ${project} --only firestore:indexes`,
);
console.log(
  `npx.cmd firebase deploy --project ${project} --only "${names.map((name) => `functions:peladinhas:${name}`).join(",")}"`,
);
console.log(
  `npx.cmd firebase deploy --project ${project} --only "firestore:rules,storage"`,
);
console.log("npm.cmd run deploy:frontend");
