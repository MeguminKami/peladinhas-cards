import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";
import { createECDH } from "node:crypto";
import { firebaseConfig } from "../js/config.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const secretPath = resolve(root, ".secret.local"),
  configPath = resolve(root, "js/push-config.js");
const current = readFileSync(configPath, "utf8").match(
  /WEB_PUSH_PUBLIC_KEY\s*=\s*['"]([^'"]*)/,
)[1];
let privateKey = existsSync(secretPath)
  ? readFileSync(secretPath, "utf8").match(/^WEB_PUSH_PRIVATE_KEY=(.*)$/m)?.[1]
  : null;
if (!current && !privateKey) {
  const pair = webpush.generateVAPIDKeys();
  privateKey = pair.privateKey;
  const previous = existsSync(secretPath)
    ? readFileSync(secretPath, "utf8")
    : "";
  writeFileSync(
    secretPath,
    `${previous}${previous && !previous.endsWith("\n") ? "\n" : ""}WEB_PUSH_PRIVATE_KEY=${privateKey}\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    configPath,
    `// Public VAPID key. The private key is kept in Secret Manager and .secret.local.\nexport const WEB_PUSH_PUBLIC_KEY = '${pair.publicKey}';\n`,
  );
  console.log(
    "Par VAPID criado. Apenas a chave pública foi escrita no frontend.",
  );
} else if (!current || !privateKey) {
  throw Error(
    "Par de chaves incompleto. Recupera a chave privada existente; não rodes as chaves de dispositivos já subscritos.",
  );
} else console.log("Par VAPID existente preservado.");
const actualPublic = readFileSync(configPath, "utf8").match(
  /WEB_PUSH_PUBLIC_KEY\s*=\s*['"]([^'"]*)/,
)[1];
const pairCheck = createECDH("prime256v1");
pairCheck.setPrivateKey(Buffer.from(privateKey.trim(), "base64url"));
if (pairCheck.getPublicKey().toString("base64url") !== actualPublic)
  throw Error(
    "As chaves VAPID não formam um par. Recupera o par original antes de publicar.",
  );
if (process.argv.includes("--verify-cloud")) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/firebase-tools/lib/bin/firebase.js"),
      "functions:secrets:access",
      "WEB_PUSH_PRIVATE_KEY",
      "--project",
      firebaseConfig.projectId,
      "--non-interactive",
    ],
    { cwd: root, encoding: "utf8", timeout: 60000 },
  );
  // Capture the CLI output privately: never print the secret or SDK diagnostics.
  if (result.status !== 0)
    throw Error(
      "Não foi possível verificar o segredo de produção. Confirma o acesso ao Firebase.",
    );
  const cloudKey =
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^[A-Za-z0-9_-]{43}$/.test(line)) || "";
  let matches = false;
  try {
    const cloudPair = createECDH("prime256v1");
    if (/^[A-Za-z0-9_-]{43}$/.test(cloudKey)) {
      cloudPair.setPrivateKey(Buffer.from(cloudKey, "base64url"));
      matches = cloudPair.getPublicKey().toString("base64url") === actualPublic;
    }
  } catch {}
  if (!matches)
    throw Error(
      "O segredo de produção não corresponde à chave pública da app. Executa npm.cmd run setup:push:cloud e publica apenas pushDeviceAction e onNotificationPush.",
    );
  console.log(
    "O segredo de produção corresponde à chave pública da app. Não foram expostas chaves privadas.",
  );
} else if (process.argv.includes("--upload")) {
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/firebase-tools/lib/bin/firebase.js"),
      "functions:secrets:set",
      "WEB_PUSH_PRIVATE_KEY",
      "--project",
      firebaseConfig.projectId,
      "--data-file",
      "-",
      "--non-interactive",
    ],
    { cwd: root, input: privateKey.trim(), encoding: "utf8", timeout: 60000 },
  );
  // Never echo SDK debug output, which can contain the encoded private payload.
  if (result.status !== 0)
    throw Error(
      "Não foi possível configurar o segredo Firebase. Confirma firebase login e permissões de Secret Manager, e repete setup:push:cloud.",
    );
  console.log(
    "Chave privada configurada no Firebase Secret Manager. Publica pushDeviceAction e onNotificationPush para usarem esta versão do segredo.",
  );
} else
  console.log(
    'Para verificar produção: node scripts/setup-push.mjs --verify-cloud. Para corrigir: npm.cmd run setup:push:cloud e npx firebase deploy --only "functions:peladinhas:pushDeviceAction,functions:peladinhas:onNotificationPush".',
  );
